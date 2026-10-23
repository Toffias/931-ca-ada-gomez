'use client'

import { OrbitControls } from '@react-three/drei'
import { useFrame, useThree } from '@react-three/fiber'
import { type ComponentRef, useEffect, useRef } from 'react'
import * as THREE from 'three'

import type { ModeloPreparado } from './prepararModelo'
import { useVisor } from './store'
import type { VistaVisor } from './tipos'

type Animacion = {
  t0: number
  dur: number
  p0: THREE.Vector3
  p1: THREE.Vector3
  q0: THREE.Vector3
  q1: THREE.Vector3
  f0: number
  f1: number
}

const suave = (x: number) => (x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2)

export function ControlCamara({ modelo, vistas }: { modelo: ModeloPreparado; vistas: VistaVisor[] }) {
  const controles = useRef<ComponentRef<typeof OrbitControls>>(null)
  const camera = useThree((s) => s.camera) as THREE.PerspectiveCamera
  const anim = useRef<Animacion | null>(null)
  const vista = useVisor((s) => s.vista)
  const piso = useVisor((s) => s.pisoSeleccionado)
  const irAVista = useVisor((s) => s.irAVista)

  const centro = modelo.caja.getCenter(new THREE.Vector3())
  const alto = modelo.caja.max.y - modelo.caja.min.y

  const animar = (p1: THREE.Vector3, q1: THREE.Vector3, f1: number, dur = 1400) => {
    const c = controles.current
    if (!c) return
    anim.current = {
      t0: performance.now(),
      dur,
      p0: camera.position.clone(),
      p1,
      q0: c.target.clone(),
      q1,
      f0: camera.fov,
      f1,
    }
  }

  // Vista pedida desde la UI (o la primera al cargar)
  useEffect(() => {
    const nombre = vista?.camara ?? vistas[0]?.camara ?? modelo.camaras[0]?.nombre
    const cam = modelo.camaras.find((c) => c.nombre === nombre)
    if (!cam) return
    const def = vistas.find((v) => v.camara === nombre)
    // punto de la línea de visión más cercano al centro del edificio
    const t = Math.max(8, centro.clone().sub(cam.posicion).dot(cam.direccion))
    const objetivo = cam.posicion.clone().addScaledVector(cam.direccion, t)
    if (def?.alturaObjetivo) objetivo.y = def.alturaObjetivo
    // en pantallas verticales (celular) se abre el lente para que entre el edificio
    const fov = THREE.MathUtils.clamp(cam.fov * 1.1 * (camera.aspect < 1 ? 1.35 : 1), 30, 85)
    if (!vista) {
      camera.position.copy(cam.posicion)
      controles.current?.target.copy(objetivo)
      camera.fov = fov
      camera.updateProjectionMatrix()
      return
    }
    animar(cam.posicion.clone(), objetivo, fov)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [vista, modelo])

  // Al elegir un piso, mirar a su altura
  useEffect(() => {
    if (piso === null) return
    const u = [...modelo.unidades.values()].find((m) => m.userData?.piso === piso)
    const y = u ? new THREE.Box3().setFromObject(u).getCenter(new THREE.Vector3()).y : centro.y
    animar(camera.position.clone().setY(Math.max(camera.position.y, y + 6)), new THREE.Vector3(centro.x, y, centro.z), camera.fov, 900)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [piso])

  // Si no hay vista inicial en el store, dejar registrada la primera
  useEffect(() => {
    if (!useVisor.getState().vista && vistas[0]) irAVista(vistas[0].camara)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useFrame(() => {
    const a = anim.current
    const c = controles.current
    if (!a || !c) return
    const k = Math.min(1, (performance.now() - a.t0) / a.dur)
    const e = suave(k)
    camera.position.lerpVectors(a.p0, a.p1, e)
    c.target.lerpVectors(a.q0, a.q1, e)
    camera.fov = THREE.MathUtils.lerp(a.f0, a.f1, e)
    camera.updateProjectionMatrix()
    if (k >= 1) anim.current = null
  })

  return (
    <OrbitControls
      ref={controles}
      makeDefault
      enableDamping
      dampingFactor={0.08}
      minDistance={Math.max(4, alto * 0.2)}
      maxDistance={alto * 7}
      maxPolarAngle={THREE.MathUtils.degToRad(125)}
      onStart={() => (anim.current = null)}
      onChange={() => {
        const c = controles.current
        if (!c) return
        const lim = alto * 2.6
        c.target.x = THREE.MathUtils.clamp(c.target.x, centro.x - lim, centro.x + lim)
        c.target.z = THREE.MathUtils.clamp(c.target.z, centro.z - lim, centro.z + lim)
        c.target.y = THREE.MathUtils.clamp(c.target.y, 0, alto * 1.5)
        if (camera.position.y < 1.2) camera.position.y = 1.2
      }}
    />
  )
}
