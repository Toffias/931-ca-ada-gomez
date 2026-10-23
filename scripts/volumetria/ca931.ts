/**
 * Volumetría provisoria de Cañada de Gómez 931, armada con cajas a partir de los planos del cliente
 * (docs/referencias/). Sirve para que la web tenga pisos, unidades y esquemas mientras no esté el modelo de
 * Blender (Fase B de docs/plan-renders-931.md); después se reemplaza el .glb y no cambia nada más.
 *
 *   pnpm tsx scripts/volumetria/ca931.ts   → src/seed/assets/ca931/volumetria.glb
 *
 * Coordenadas glTF en metros (Y arriba, -Z = norte de Blender). Supuestos a confirmar: el frente mira al sur,
 * PB de 3,20 m y pisos de 2,90 m.
 */
import fs from 'fs'
import path from 'path'

type V3 = [number, number, number]
type Caja = { min: V3; max: V3; material: string }

// medidas del plano
const ANCHO = 8.66 // frente (8,36 entre ejes + muros)
const FONDO = 15.7 // edificado
const PATIO = 4.0
const BALCON = 1.4
const ALTO_PB = 3.2
const ALTO_PISO = 2.9
const PISOS = 4
const X0 = -ANCHO / 2
const X1 = ANCHO / 2
const MADERA = 0.35 // media franja de listones del centro de la fachada

const MATERIALES: Record<string, { color: [number, number, number, number]; rugosidad?: number; metal?: number }> = {
  WEB_Revoque_Gris: { color: [0.36, 0.35, 0.33, 1] },
  WEB_Revoque_Crema: { color: [0.8, 0.74, 0.62, 1] },
  WEB_Madera_Listones: { color: [0.46, 0.3, 0.17, 1], rugosidad: 0.7 },
  WEB_Piedra_Negra: { color: [0.05, 0.05, 0.05, 1], rugosidad: 0.6 },
  WEB_Metal_Negro: { color: [0.02, 0.02, 0.02, 1], rugosidad: 0.4, metal: 0.6 },
  WEB_Vidrio: { color: [0.04, 0.05, 0.06, 1], rugosidad: 0.1 },
  WEB_Vidrio_Baranda: { color: [0.55, 0.65, 0.7, 0.3], rugosidad: 0.05 },
  WEB_Fachada_Vecinos: { color: [0.82, 0.77, 0.68, 1] },
  WEB_Techo_Vecinos: { color: [0.12, 0.13, 0.13, 1] },
  WEB_Patio: { color: [0.32, 0.4, 0.22, 1] },
  WEB_Vereda: { color: [0.6, 0.59, 0.56, 1] },
  WEB_Calzada: { color: [0.16, 0.16, 0.16, 1] },
}

const caja = (material: string, x: [number, number], y: [number, number], z: [number, number]): Caja => ({
  min: [x[0], y[0], z[0]],
  max: [x[1], y[1], z[1]],
  material,
})

type Objeto = { nombre: string; cajas: Caja[]; extras?: Record<string, unknown> }
const objetos: Objeto[] = []

// Planta baja: listones negros delante de los dormitorios, columna de piedra con el 931, acceso y panel de madera
objetos.push({
  nombre: 'Piso_00',
  extras: { tipo: 'piso', piso: 0 },
  cajas: [
    caja('WEB_Revoque_Crema', [X0, X1], [0, ALTO_PB], [-FONDO, -0.6]),
    caja('WEB_Vidrio', [X0 + 0.3, -0.7], [0.4, ALTO_PB - 0.3], [-0.6, -0.5]),
    caja('WEB_Metal_Negro', [X0 + 0.2, -0.7], [0.1, ALTO_PB - 0.2], [-0.5, -0.4]),
    caja('WEB_Piedra_Negra', [-0.7, 0.2], [0, ALTO_PB], [-0.6, 0]),
    caja('WEB_Madera_Listones', [1.9, X1 - 0.2], [0, ALTO_PB], [-0.6, -0.45]),
    caja('WEB_Revoque_Gris', [X0, X1], [ALTO_PB - 0.25, ALTO_PB], [-0.6, 0]),
  ],
})

for (let p = 1; p <= PISOS; p++) {
  const y0 = ALTO_PB + (p - 1) * ALTO_PISO
  const y1 = y0 + ALTO_PISO
  objetos.push({
    nombre: `Piso_0${p}`,
    extras: { tipo: 'piso', piso: p },
    cajas: [
      caja('WEB_Revoque_Gris', [X0, X1], [y0, y1], [-FONDO, -0.4]),
      caja('WEB_Vidrio', [X0 + 0.25, X1 - 0.25], [y0 + 0.1, y1 - 0.35], [-0.4, -0.3]),
      // izquierda (3 ambientes): losa gris en voladizo y baranda de vidrio
      caja('WEB_Revoque_Gris', [X0, -MADERA], [y0, y0 + 0.3], [-0.4, BALCON]),
      caja('WEB_Vidrio_Baranda', [X0 + 0.05, -MADERA], [y0 + 0.3, y0 + 1.3], [BALCON - 0.06, BALCON]),
      // derecha (2 ambientes): antepecho macizo crema
      caja('WEB_Revoque_Crema', [MADERA, X1], [y0, y0 + 1.1], [-0.4, BALCON]),
      // franja de listones de madera
      caja('WEB_Madera_Listones', [-MADERA, MADERA], [y0, y1], [-0.4, 0.15]),
    ],
  })
}

const ALTO_TOTAL = ALTO_PB + PISOS * ALTO_PISO
objetos.push({
  nombre: 'Techo_Remate',
  // entre medianeras: los laterales no van como fachadas en Disponibilidad
  extras: { tipo: 'techo', medianeras: 'este,oeste' },
  cajas: [caja('WEB_Revoque_Gris', [X0, X1], [ALTO_TOTAL, ALTO_TOTAL + 0.8], [-FONDO, BALCON + 0.1])],
})

// Unidades: cajas invisibles para hover y estado. PB ocupa la planta entera (el plano la envuelve alrededor del hall)
const unidad = (codigo: string, piso: number, x: [number, number], y: [number, number], z: [number, number], extras: Record<string, unknown>) =>
  objetos.push({
    nombre: `Unidad_${codigo}`,
    extras: { tipo: 'unidad', unidad: codigo, piso, estado: 'Disponible', ...extras },
    cajas: [caja('WEB_Vidrio', x, y, z)],
  })
unidad('PB', 0, [X0 + 0.15, X1 - 0.15], [0.05, ALTO_PB - 0.05], [-FONDO + 0.15, -0.45], { m2: 121.8, dormitorios: 3, orientacion: 'Contrafrente' })
for (let p = 1; p <= PISOS; p++) {
  const y: [number, number] = [ALTO_PB + (p - 1) * ALTO_PISO + 0.05, ALTO_PB + p * ALTO_PISO - 0.05]
  unidad(`${p}A`, p, [X0 + 0.15, -0.05], y, [-FONDO + 0.15, BALCON - 0.05], { m2: 76.3, dormitorios: 2, orientacion: 'Frente' })
  unidad(`${p}B`, p, [0.05, X1 - 0.15], y, [-FONDO + 0.15, BALCON - 0.05], { m2: 53.9, dormitorios: 1, orientacion: 'Frente' })
}

// Entorno: vecinos bajos como en los renders, patio, vereda y calzada
objetos.push(
  {
    nombre: 'Vecinos_Izquierda',
    cajas: [
      caja('WEB_Fachada_Vecinos', [X0 - 10, X0], [0, 6.2], [-18, -1]),
      caja('WEB_Techo_Vecinos', [X0 - 10, X0], [6.2, 6.5], [-18, -0.4]),
    ],
  },
  {
    nombre: 'Vecinos_Derecha',
    cajas: [
      caja('WEB_Fachada_Vecinos', [X1, X1 + 9], [0, 7.4], [-17, -0.8]),
      caja('WEB_Techo_Vecinos', [X1 + 3, X1 + 9], [7.4, 8.6], [-17, -2]),
    ],
  },
  { nombre: 'Vecinos_Fondo', cajas: [caja('WEB_Fachada_Vecinos', [X0 - 10, X1 + 9], [0, 6], [-32, -FONDO - PATIO])] },
  { nombre: 'Parque_Patio', cajas: [caja('WEB_Patio', [X0, X1], [0, 0.04], [-FONDO - PATIO, -FONDO])] },
  { nombre: 'Veredas', cajas: [caja('WEB_Vereda', [X0 - 20, X1 + 20], [0, 0.15], [0, 3.2])] },
  { nombre: 'Calzada', cajas: [caja('WEB_Calzada', [X0 - 20, X1 + 20], [-0.05, 0], [3.2, 12])] },
)

// Cámaras parecidas a las tomas del cliente (calce fino en la Fase B)
const camaras: { nombre: string; desde: V3; hacia: V3; fov: number }[] = [
  { nombre: 'Cam_Principal', desde: [-9, 1.7, 15], hacia: [0.5, 8, -2], fov: 50 },
  { nombre: 'Cam_Derecha', desde: [9, 1.7, 15], hacia: [-0.5, 8, -2], fov: 50 },
  { nombre: 'Cam_Aerea', desde: [-18, 26, 26], hacia: [0, 6, -7], fov: 40 },
]

/** cuaternión que hace mirar a la cámara (que mira hacia -Z local) desde `desde` hacia `hacia`, con Y arriba */
function mirar(desde: V3, hacia: V3): [number, number, number, number] {
  const norm = (v: V3): V3 => {
    const l = Math.hypot(...v)
    return [v[0] / l, v[1] / l, v[2] / l]
  }
  const cruz = (a: V3, b: V3): V3 => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]]
  const z = norm([desde[0] - hacia[0], desde[1] - hacia[1], desde[2] - hacia[2]])
  const x = norm(cruz([0, 1, 0], z))
  const y = cruz(z, x)
  const [m00, m01, m02, m10, m11, m12, m20, m21, m22] = [x[0], y[0], z[0], x[1], y[1], z[1], x[2], y[2], z[2]]
  const t = m00 + m11 + m22
  if (t > 0) {
    const s = Math.sqrt(t + 1) * 2
    return [(m21 - m12) / s, (m02 - m20) / s, (m10 - m01) / s, s / 4]
  }
  if (m00 > m11 && m00 > m22) {
    const s = Math.sqrt(1 + m00 - m11 - m22) * 2
    return [s / 4, (m01 + m10) / s, (m02 + m20) / s, (m21 - m12) / s]
  }
  if (m11 > m22) {
    const s = Math.sqrt(1 + m11 - m00 - m22) * 2
    return [(m01 + m10) / s, s / 4, (m12 + m21) / s, (m02 - m20) / s]
  }
  const s = Math.sqrt(1 + m22 - m00 - m11) * 2
  return [(m02 + m20) / s, (m12 + m21) / s, s / 4, (m10 - m01) / s]
}

// --- escritura del .glb: una malla por objeto, una primitiva por caja (24 vértices con normales por cara) ---

const binarios: Buffer[] = []
let largoBin = 0
const bufferViews: Record<string, number>[] = []
const accessors: Record<string, unknown>[] = []

function agregar(datos: Buffer, target: number, accessor: Record<string, unknown>): number {
  const relleno = (4 - (largoBin % 4)) % 4
  if (relleno) binarios.push(Buffer.alloc(relleno)), (largoBin += relleno)
  bufferViews.push({ buffer: 0, byteOffset: largoBin, byteLength: datos.length, target })
  binarios.push(datos)
  largoBin += datos.length
  accessors.push({ bufferView: bufferViews.length - 1, ...accessor })
  return accessors.length - 1
}

const CARAS: { n: V3; v: V3[] }[] = [
  { n: [1, 0, 0], v: [[1, 0, 1], [1, 0, 0], [1, 1, 0], [1, 1, 1]] },
  { n: [-1, 0, 0], v: [[0, 0, 0], [0, 0, 1], [0, 1, 1], [0, 1, 0]] },
  { n: [0, 1, 0], v: [[0, 1, 1], [1, 1, 1], [1, 1, 0], [0, 1, 0]] },
  { n: [0, -1, 0], v: [[0, 0, 0], [1, 0, 0], [1, 0, 1], [0, 0, 1]] },
  { n: [0, 0, 1], v: [[0, 0, 1], [1, 0, 1], [1, 1, 1], [0, 1, 1]] },
  { n: [0, 0, -1], v: [[1, 0, 0], [0, 0, 0], [0, 1, 0], [1, 1, 0]] },
]

const nombresMateriales = Object.keys(MATERIALES)
function primitiva(c: Caja) {
  const pos: number[] = []
  const nor: number[] = []
  const idx: number[] = []
  CARAS.forEach((cara, i) => {
    for (const v of cara.v) {
      pos.push(...v.map((t, k) => (t ? c.max[k] : c.min[k])))
      nor.push(...cara.n)
    }
    idx.push(i * 4, i * 4 + 1, i * 4 + 2, i * 4, i * 4 + 2, i * 4 + 3)
  })
  const POSITION = agregar(Buffer.from(new Float32Array(pos).buffer), 34962, {
    componentType: 5126, count: 24, type: 'VEC3', min: c.min, max: c.max,
  })
  const NORMAL = agregar(Buffer.from(new Float32Array(nor).buffer), 34962, { componentType: 5126, count: 24, type: 'VEC3' })
  const indices = agregar(Buffer.from(new Uint16Array(idx).buffer), 34963, { componentType: 5123, count: 36, type: 'SCALAR' })
  return { attributes: { POSITION, NORMAL }, indices, material: nombresMateriales.indexOf(c.material) }
}

const meshes = objetos.map((o) => ({ name: o.nombre, primitives: o.cajas.map(primitiva) }))
const nodes: Record<string, unknown>[] = [
  ...objetos.map((o, i) => ({ name: o.nombre, mesh: i, ...(o.extras ? { extras: o.extras } : {}) })),
  ...camaras.map((c, i) => ({ name: c.nombre, camera: i, translation: c.desde, rotation: mirar(c.desde, c.hacia) })),
]
const json = {
  asset: { version: '2.0', generator: 'scripts/volumetria/ca931.ts' },
  scene: 0,
  scenes: [{ name: 'Ca931', nodes: nodes.map((_, i) => i) }],
  nodes,
  meshes,
  cameras: camaras.map((c) => ({
    type: 'perspective',
    perspective: { yfov: (c.fov * Math.PI) / 180, znear: 0.1, zfar: 500, aspectRatio: 16 / 9 },
  })),
  materials: nombresMateriales.map((name) => {
    const m = MATERIALES[name]
    return {
      name,
      pbrMetallicRoughness: { baseColorFactor: m.color, metallicFactor: m.metal ?? 0, roughnessFactor: m.rugosidad ?? 0.85 },
      ...(m.color[3] < 1 ? { alphaMode: 'BLEND', doubleSided: true } : {}),
    }
  }),
  buffers: [{ byteLength: 0 }],
  bufferViews,
  accessors,
}

const bin = Buffer.concat(binarios)
const binRelleno = Buffer.concat([bin, Buffer.alloc((4 - (bin.length % 4)) % 4)])
json.buffers[0].byteLength = binRelleno.length
const texto = Buffer.from(JSON.stringify(json))
const jsonRelleno = Buffer.concat([texto, Buffer.alloc((4 - (texto.length % 4)) % 4, 0x20)])
const cabecera = Buffer.alloc(12)
cabecera.writeUInt32LE(0x46546c67, 0)
cabecera.writeUInt32LE(2, 4)
cabecera.writeUInt32LE(12 + 8 + jsonRelleno.length + 8 + binRelleno.length, 8)
const trozo = (tipo: number, datos: Buffer) => {
  const h = Buffer.alloc(8)
  h.writeUInt32LE(datos.length, 0)
  h.writeUInt32LE(tipo, 4)
  return Buffer.concat([h, datos])
}
const salida = path.resolve(import.meta.dirname, '../../src/seed/assets/ca931/volumetria.glb')
fs.writeFileSync(salida, Buffer.concat([cabecera, trozo(0x4e4f534a, jsonRelleno), trozo(0x004e4942, binRelleno)]))
console.log(`${salida}: ${objetos.length} objetos, ${camaras.length} cámaras, ${(largoBin / 1024).toFixed(0)} KB`)
