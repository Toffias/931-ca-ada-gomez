// Lee del JSON de un .glb la caja (en coordenadas de mundo) de cada objeto con nombre.
// Alcanza con el min/max del accessor POSITION, que glTF exige aun con Draco: no hace falta decodificar mallas.

import { esquinas, IDENTIDAD, type Mat4, multiplicar, desdeTRS, transformar, type Vec3 } from './geometria'

type NodoGLTF = {
  name?: string
  mesh?: number
  children?: number[]
  matrix?: Mat4
  translation?: Vec3
  rotation?: [number, number, number, number]
  scale?: Vec3
  extras?: Record<string, unknown>
}

export type JSONGLTF = {
  scene?: number
  scenes?: { nodes?: number[] }[]
  nodes?: NodoGLTF[]
  meshes?: { primitives: { attributes: { POSITION?: number } }[] }[]
  accessors?: { min?: number[]; max?: number[] }[]
}

export type ObjetoModelo = {
  nombre: string
  extras: Record<string, unknown>
  /** 8 esquinas de la caja local llevadas a mundo (glTF: Y arriba, -Z = norte de Blender) */
  esquinas: Vec3[]
  min: Vec3
  max: Vec3
}

export function leerJSONGLTF(buf: Uint8Array): JSONGLTF {
  const vista = new DataView(buf.buffer, buf.byteOffset, buf.byteLength)
  if (vista.getUint32(0, true) !== 0x46546c67) throw new Error('No es un archivo .glb')
  const largo = vista.getUint32(12, true)
  return JSON.parse(new TextDecoder().decode(buf.subarray(20, 20 + largo)))
}

function cajaMalla(json: JSONGLTF, malla: number): { min: Vec3; max: Vec3 } | null {
  const prims = json.meshes?.[malla]?.primitives ?? []
  const min: Vec3 = [Infinity, Infinity, Infinity]
  const max: Vec3 = [-Infinity, -Infinity, -Infinity]
  let alguno = false
  for (const p of prims) {
    const a = p.attributes.POSITION != null ? json.accessors?.[p.attributes.POSITION] : undefined
    if (!a?.min || !a.max) continue
    alguno = true
    for (let i = 0; i < 3; i++) {
      min[i] = Math.min(min[i], a.min[i])
      max[i] = Math.max(max[i], a.max[i])
    }
  }
  return alguno ? { min, max } : null
}

export function objetosDelModelo(json: JSONGLTF): ObjetoModelo[] {
  const nodos = json.nodes ?? []
  const raices = json.scenes?.[json.scene ?? 0]?.nodes ?? nodos.map((_, i) => i)
  const out: ObjetoModelo[] = []

  const visitar = (i: number, padre: Mat4) => {
    const n = nodos[i]
    if (!n) return
    const local = n.matrix ?? desdeTRS(n.translation, n.rotation, n.scale)
    const mundo = multiplicar(padre, local)
    if (n.mesh != null && n.name) {
      const caja = cajaMalla(json, n.mesh)
      if (caja) {
        const es = esquinas(caja.min, caja.max).map((p) => transformar(mundo, p))
        const min: Vec3 = [0, 1, 2].map((k) => Math.min(...es.map((e) => e[k]))) as Vec3
        const max: Vec3 = [0, 1, 2].map((k) => Math.max(...es.map((e) => e[k]))) as Vec3
        out.push({ nombre: n.name, extras: n.extras ?? {}, esquinas: es, min, max })
      }
    }
    for (const h of n.children ?? []) visitar(h, mundo)
  }
  for (const r of raices) visitar(r, IDENTIDAD)
  return out
}

/** código de unidad: extras.unidad o, si falta, el nombre Unidad_5B → 5B (misma convención que el visor) */
export function codigoUnidad(o: ObjetoModelo): string | null {
  if (typeof o.extras.unidad === 'string') return o.extras.unidad
  const m = /^Unidad_(.+?)(\.\d+)?$/.exec(o.nombre)
  return m ? m[1] : null
}

export function pisoDe(o: ObjetoModelo): number | null {
  if (typeof o.extras.piso === 'number') return o.extras.piso
  const m = /^Piso_(-?\d+)/.exec(o.nombre)
  return m ? Number(m[1]) : null
}
