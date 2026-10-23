import * as THREE from 'three'

import { OBJETO_FAROLES, PREFIJOS_OCLUYENTES, PREFIJOS_SIN_SOMBRA, PREFIJO_CAMARA, REGLAS_EMISION, TEXTURAS, TIPO } from './convenciones'
import { aplicarTextura } from './texturas'
import type { ConfigVisor } from './tipos'

export type CamaraModelo = { nombre: string; posicion: THREE.Vector3; direccion: THREE.Vector3; fov: number }

export type ModeloPreparado = {
  raiz: THREE.Object3D
  unidades: Map<string, THREE.Mesh> // código → volumen invisible
  pisos: Map<number, THREE.Object3D>
  techo: THREE.Object3D | null
  camaras: CamaraModelo[]
  faroles: THREE.Vector3[]
  caja: THREE.Box3 // caja del edificio principal (a partir de las unidades)
  uNoche: { value: number }
  /** 0 = día, 1 = noche; los valores intermedios mezclan la emisión */
  aplicarModo: (noche: number) => void
}

const empiezaCon = (nombre: string, prefijos: string[]) => prefijos.some((p) => nombre.startsWith(p))

/**
 * Recorre el glTF una sola vez y deja todo listo para el visor:
 * escala a metros, sombras, unidades invisibles, materiales propios por piso,
 * ventanas nocturnas procedurales y reglas de emisión día/noche.
 */
export function prepararModelo(escena: THREE.Object3D, config: ConfigVisor): ModeloPreparado {
  const raiz = escena
  raiz.scale.setScalar(config.escala || 1)
  raiz.updateMatrixWorld(true)

  const unidades = new Map<string, THREE.Mesh>()
  const pisos = new Map<number, THREE.Object3D>()
  let techo: THREE.Object3D | null = null
  const camaras: CamaraModelo[] = []
  const materiales = new Set<THREE.MeshStandardMaterial>()
  const uNoche = { value: 0 }

  raiz.traverse((obj) => {
    const d = obj.userData || {}
    if (d.tipo === TIPO.piso) pisos.set(Number(d.piso), obj)
    if (d.tipo === TIPO.techo) techo = obj

    if ((obj as THREE.PerspectiveCamera).isPerspectiveCamera && obj.name.startsWith(PREFIJO_CAMARA)) {
      const cam = obj as THREE.PerspectiveCamera
      camaras.push({
        nombre: cam.name,
        posicion: cam.getWorldPosition(new THREE.Vector3()),
        direccion: cam.getWorldDirection(new THREE.Vector3()),
        fov: cam.fov,
      })
    }

    if (!(obj as THREE.Mesh).isMesh) return
    const mesh = obj as THREE.Mesh

    if (d.tipo === TIPO.unidad) {
      mesh.material = new THREE.MeshBasicMaterial({
        color: '#ffffff',
        transparent: true,
        opacity: 0,
        depthWrite: false,
        side: THREE.DoubleSide,
      })
      mesh.renderOrder = 10
      mesh.userData.codigo = String(d.unidad)
      unidades.set(String(d.unidad), mesh)
      return
    }

    const nombre = mesh.name
    const padre = mesh.parent?.name ?? ''
    mesh.castShadow = !empiezaCon(nombre, PREFIJOS_SIN_SOMBRA) && !empiezaCon(padre, PREFIJOS_SIN_SOMBRA)
    mesh.receiveShadow = true
    if (empiezaCon(nombre, PREFIJOS_OCLUYENTES) || empiezaCon(padre, PREFIJOS_OCLUYENTES)) mesh.userData.ocluyente = true
    materiales.add(mesh.material as THREE.MeshStandardMaterial)
  })

  // Materiales propios en cada piso y el techo, para poder volverlos translúcidos por separado.
  const grupos = [...pisos.values(), techo].filter(Boolean) as THREE.Object3D[]
  for (const g of grupos) {
    g.traverse((o) => {
      const m = o as THREE.Mesh
      if (!m.isMesh) return
      const mat = (m.material as THREE.MeshStandardMaterial).clone()
      // clone() copia userData pero no onBeforeCompile: si el material ya tenía la textura triplanar (el glTF
      // viene cacheado y esto corre de nuevo al volver a entrar o en el doble render de desarrollo), la marca
      // quedaría puesta sin el shader y aplicarTextura lo salteaba: la fachada de los pisos salía lisa.
      delete mat.userData.triplanar
      mat.userData.opacidadBase = mat.opacity
      mat.userData.transparenteBase = mat.transparent
      if (mat.name === config.ventanasNoche.material) parchearVentanas(mat, config, uNoche)
      m.material = mat
      materiales.add(mat)
    })
  }

  // Caja del edificio principal: la unión de sus unidades
  const caja = new THREE.Box3()
  unidades.forEach((u) => caja.expandByObject(u))
  if (caja.isEmpty()) caja.setFromObject(raiz)

  // Faroles: posiciones guardadas en extras (coordenadas de Blender, Z arriba)
  const faroles: THREE.Vector3[] = []
  const luces = raiz.getObjectByName(OBJETO_FAROLES)?.userData?.luces as number[] | undefined
  if (Array.isArray(luces)) {
    for (let i = 0; i + 2 < luces.length; i += 3) {
      faroles.push(new THREE.Vector3(luces[i], luces[i + 2], -luces[i + 1]).multiplyScalar(config.escala || 1))
    }
  }

  // Guardar la emisión original de cada material para poder escalarla
  materiales.forEach((m) => {
    if (m.userData.emisionBase === undefined) m.userData.emisionBase = m.emissiveIntensity ?? 1
    const regla = REGLAS_EMISION.find((r) => r.patron.test(m.name))
    if (regla?.transparente !== undefined) Object.assign(m, { transparent: true, opacity: regla.transparente, depthWrite: false })
    if (regla?.color && m.emissive && m.emissive.getHex() === 0) m.emissive = new THREE.Color(regla.color)
  })

  // Texturas realistas (revoque, hormigón, piedra, veredas…) + desgaste en la base y bajo las losas
  if (config.texturas !== false) {
    const desgaste = {
      suelo: 0,
      alturaSuciedad: 1.6,
      alturaPrimerPiso: config.ventanasNoche.alturaPrimerPiso,
      alturaPiso: config.ventanasNoche.alturaPiso,
      intensidad: 1,
    }
    materiales.forEach((m) => {
      if (!m.isMeshStandardMaterial || m.name === config.ventanasNoche.material) return
      const regla = TEXTURAS.find((r) => r.patron.test(m.name))
      if (regla) aplicarTextura(m, regla, desgaste)
    })
  }

  // las reglas se buscan una vez: aplicarModo corre en cada cuadro mientras se mueve la barrita
  const conRegla = [...materiales].flatMap((m) => {
    const regla = REGLAS_EMISION.find((r) => r.patron.test(m.name))
    return regla ? [{ m, regla }] : []
  })
  const aplicarModo = (noche: number) => {
    uNoche.value = noche
    for (const { m, regla } of conRegla)
      m.emissiveIntensity = THREE.MathUtils.lerp(regla.dia, regla.noche, noche) * (m.userData.emisionBase ?? 1)
  }
  aplicarModo(0)

  return { raiz, unidades, pisos, techo, camaras, faroles, caja, uNoche, aplicarModo }
}

/** Ventanas encendidas al azar de noche: hash por celda (piso × ventana) según la posición en el mundo. */
function parchearVentanas(mat: THREE.MeshStandardMaterial, config: ConfigVisor, uNoche: { value: number }) {
  const v = config.ventanasNoche
  mat.roughness = 0.06
  mat.metalness = 0
  mat.envMapIntensity = 1
  mat.color.set('#0b0f13')
  mat.onBeforeCompile = (shader) => {
    Object.assign(shader.uniforms, {
      uNoche,
      uZ0: { value: v.alturaPrimerPiso },
      uFH: { value: v.alturaPiso },
      uWW: { value: v.anchoVentana },
      uUmbral: { value: 1 - v.encendidas / 100 },
    })
    shader.vertexShader = shader.vertexShader
      .replace('#include <common>', '#include <common>\nvarying vec3 vWPos;')
      .replace('#include <project_vertex>', '#include <project_vertex>\nvWPos = (modelMatrix * vec4(transformed, 1.0)).xyz;')
    shader.fragmentShader = shader.fragmentShader
      .replace('#include <common>', '#include <common>\nvarying vec3 vWPos;\nuniform float uNoche, uZ0, uFH, uWW, uUmbral;')
      .replace(
        '#include <emissivemap_fragment>',
        `#include <emissivemap_fragment>
        float fz = floor((vWPos.y - uZ0) / uFH);
        float fu = floor((vWPos.x - vWPos.z) / uWW);
        float hsh = fract(sin(dot(vec2(fu, fz), vec2(12.9898, 78.233))) * 43758.5453);
        vec3 calido = mix(vec3(1.0, 0.60, 0.30), vec3(1.0, 0.84, 0.62), fract(hsh * 7.13));
        totalEmissiveRadiance += calido * step(uUmbral, hsh) * uNoche * 0.9;`,
      )
  }
  mat.customProgramCacheKey = () => 'ventanas-noche'
  mat.needsUpdate = true
}
