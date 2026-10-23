'use client'

import { useGLTF } from '@react-three/drei'
import { useFrame, type ThreeEvent } from '@react-three/fiber'
import { useEffect, useMemo } from 'react'
import * as THREE from 'three'

import { hora } from './hora'
import { prepararModelo, type ModeloPreparado } from './prepararModelo'
import { useVisor } from './store'
import { COLOR_ESTADO, type ConfigVisor, type UnidadVisor } from './tipos'

type Props = {
  config: ConfigVisor
  unidades: UnidadVisor[]
  onListo: (m: ModeloPreparado) => void
}

export function Modelo({ config, unidades, onListo }: Props) {
  const { scene } = useGLTF(config.modeloUrl, '/draco/')
  const modelo = useMemo(() => prepararModelo(scene, config), [scene, config])
  const porCodigo = useMemo(() => new Map(unidades.map((u) => [u.codigo.toUpperCase(), u])), [unidades])

  const verDisponibilidad = useVisor((s) => s.verDisponibilidad)
  const soloDisponibles = useVisor((s) => s.soloDisponibles)
  const dormitorios = useVisor((s) => s.dormitorios)
  const pisoSeleccionado = useVisor((s) => s.pisoSeleccionado)
  const unidadHover = useVisor((s) => s.unidadHover)
  const unidadSeleccionada = useVisor((s) => s.unidadSeleccionada)
  const set = useVisor((s) => s.set)

  useEffect(() => {
    onListo(modelo)
    set({ cargado: true, camarasDelModelo: modelo.camaras.map((c) => c.nombre) })
  }, [modelo, onListo, set])

  // Día → noche según la barrita (se lee en cada cuadro, sin re-render); sólo se tocan valores si cambió
  const ultimaLuz = useMemo(() => ({ valor: -1 }), [modelo])

  // Pisos superiores translúcidos cuando se elige un piso
  useEffect(() => {
    const fantasma = (obj: THREE.Object3D | null, on: boolean) =>
      obj?.traverse((o) => {
        const m = o as THREE.Mesh
        if (!m.isMesh) return
        const mat = m.material as THREE.MeshStandardMaterial
        mat.transparent = on ? true : mat.userData.transparenteBase
        mat.opacity = on ? 0.1 : mat.userData.opacidadBase
        mat.depthWrite = !on
        m.castShadow = !on
        m.userData.fantasma = on
        mat.needsUpdate = true
      })
    modelo.pisos.forEach((obj, n) => fantasma(obj, pisoSeleccionado !== null && n > pisoSeleccionado))
    fantasma(modelo.techo, pisoSeleccionado !== null)
  }, [modelo, pisoSeleccionado])

  // Pintar unidades según estado, filtros, hover y selección
  useEffect(() => {
    modelo.unidades.forEach((mesh, codigo) => {
      const u = porCodigo.get(codigo.toUpperCase())
      const mat = mesh.material as THREE.MeshBasicMaterial
      const pisoOculto = pisoSeleccionado !== null && (u?.piso ?? 0) > pisoSeleccionado
      mesh.visible = Boolean(u) && !pisoOculto
      if (!u) return
      const pasaFiltro =
        (!soloDisponibles || u.estado === 'disponible') &&
        (dormitorios === null || (dormitorios === 3 ? (u.dormitorios ?? 0) >= 3 : u.dormitorios === dormitorios))
      const hayFiltro = soloDisponibles || dormitorios !== null

      let op = 0
      if (verDisponibilidad || hayFiltro) op = pasaFiltro ? 0.3 : 0
      if (pisoSeleccionado !== null && u.piso === pisoSeleccionado) op = pasaFiltro ? 0.4 : 0.08
      if (codigo === unidadHover) op = 0.55
      if (codigo === unidadSeleccionada) op = 0.68
      mat.color.set(COLOR_ESTADO[u.estado])
      mat.opacity = op
    })
  }, [modelo, porCodigo, verDisponibilidad, soloDisponibles, dormitorios, pisoSeleccionado, unidadHover, unidadSeleccionada])

  // Primer objeto visible bajo el puntero: si es una unidad con datos, la devuelve
  const unidadDelEvento = (e: ThreeEvent<PointerEvent | MouseEvent>) => {
    const hit = e.intersections.find((i) => i.object.visible && !i.object.userData.fantasma)
    const codigo = hit?.object.userData.codigo as string | undefined
    return codigo && porCodigo.has(codigo.toUpperCase()) ? codigo : null
  }

  // Luces nocturnas: faroles (extras del modelo) y bañadores de fachada alrededor del edificio. Están siempre
  // montadas y de día quedan en 0: sumar o sacar luces obliga a recompilar todos los shaders (el tirón del botón).
  const lucesNoche = useMemo(() => {
    const luces: THREE.SpotLight[] = []
    for (const p of modelo.faroles) {
      const l = new THREE.SpotLight('#ffc27a', 60, 30, 1, 0.6, 1.6)
      l.position.copy(p)
      l.target.position.set(p.x, 0, p.z)
      luces.push(l)
    }
    const { min, max } = modelo.caja
    const c = modelo.caja.getCenter(new THREE.Vector3())
    const alto = max.y - min.y
    const base = min.y + 0.5
    const lados: [THREE.Vector3, THREE.Vector3][] = [
      [new THREE.Vector3(max.x + 5, base, c.z), new THREE.Vector3(max.x, base + alto * 0.8, c.z)],
      [new THREE.Vector3(min.x - 5, base, c.z), new THREE.Vector3(min.x, base + alto * 0.8, c.z)],
      [new THREE.Vector3(c.x, base, max.z + 5), new THREE.Vector3(c.x, base + alto * 0.8, max.z)],
      [new THREE.Vector3(c.x, base, min.z - 5), new THREE.Vector3(c.x, base + alto * 0.8, min.z)],
    ]
    // los bañadores pegan de abajo en los cielorrasos de los balcones y los queman: ese modelo los apaga
    for (const [pos, obj] of modelo.banadores ? lados : []) {
      const l = new THREE.SpotLight('#ffd29a', 110, alto * 2.2, 0.5, 0.8, 1.2)
      l.position.copy(pos)
      l.target.position.copy(obj)
      luces.push(l)
    }
    luces.forEach((l) => (l.userData.intensidadBase = l.intensity))
    return luces
  }, [modelo])

  useFrame(() => {
    const n = hora.p.luces
    if (n === ultimaLuz.valor) return
    ultimaLuz.valor = n
    modelo.aplicarModo(n)
    for (const l of lucesNoche) {
      l.intensity = l.userData.intensidadBase * n
    }
  })

  return (
    <>
      <primitive
        object={modelo.raiz}
        onPointerMove={(e: ThreeEvent<PointerEvent>) => {
          e.stopPropagation()
          const codigo = unidadDelEvento(e)
          if (codigo !== useVisor.getState().unidadHover) set({ unidadHover: codigo })
        }}
        onPointerOut={() => set({ unidadHover: null })}
        onClick={(e: ThreeEvent<MouseEvent>) => {
          e.stopPropagation()
          if (e.delta > 5) return // fue un arrastre de la cámara
          set({ unidadSeleccionada: unidadDelEvento(e) })
        }}
      />
      {lucesNoche.map((luz, i) => (
        <group key={i}>
          <primitive object={luz} />
          <primitive object={luz.target} />
        </group>
      ))}
    </>
  )
}
