// Geometría 2D/3D mínima para dibujar esquemas a partir del modelo. Sin dependencias (ni Three.js).

export type Punto = [number, number]
export type Vec3 = [number, number, number]
/** matriz 4×4 en orden columna (como glTF) */
export type Mat4 = number[]

export const IDENTIDAD: Mat4 = [1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1]

export function multiplicar(a: Mat4, b: Mat4): Mat4 {
  const r = new Array(16).fill(0)
  for (let c = 0; c < 4; c++)
    for (let f = 0; f < 4; f++) {
      let s = 0
      for (let k = 0; k < 4; k++) s += a[k * 4 + f] * b[c * 4 + k]
      r[c * 4 + f] = s
    }
  return r
}

/** matriz desde traslación, rotación (cuaternión x,y,z,w) y escala de un nodo glTF */
export function desdeTRS(t: Vec3 = [0, 0, 0], q: [number, number, number, number] = [0, 0, 0, 1], s: Vec3 = [1, 1, 1]): Mat4 {
  const [x, y, z, w] = q
  const [sx, sy, sz] = s
  const x2 = x + x, y2 = y + y, z2 = z + z
  const xx = x * x2, xy = x * y2, xz = x * z2, yy = y * y2, yz = y * z2, zz = z * z2
  const wx = w * x2, wy = w * y2, wz = w * z2
  return [
    (1 - (yy + zz)) * sx, (xy + wz) * sx, (xz - wy) * sx, 0,
    (xy - wz) * sy, (1 - (xx + zz)) * sy, (yz + wx) * sy, 0,
    (xz + wy) * sz, (yz - wx) * sz, (1 - (xx + yy)) * sz, 0,
    t[0], t[1], t[2], 1,
  ]
}

export function transformar(m: Mat4, p: Vec3): Vec3 {
  const [x, y, z] = p
  return [
    m[0] * x + m[4] * y + m[8] * z + m[12],
    m[1] * x + m[5] * y + m[9] * z + m[13],
    m[2] * x + m[6] * y + m[10] * z + m[14],
  ]
}

/** las 8 esquinas de una caja min/max */
export function esquinas(min: Vec3, max: Vec3): Vec3[] {
  const r: Vec3[] = []
  for (const x of [min[0], max[0]]) for (const y of [min[1], max[1]]) for (const z of [min[2], max[2]]) r.push([x, y, z])
  return r
}

/** casco convexo (monotone chain), en sentido antihorario */
export function cascoConvexo(puntos: Punto[]): Punto[] {
  const p = [...new Map(puntos.map((q) => [`${q[0].toFixed(5)},${q[1].toFixed(5)}`, q])).values()].sort(
    (a, b) => a[0] - b[0] || a[1] - b[1],
  )
  if (p.length < 3) return p
  const cruz = (o: Punto, a: Punto, b: Punto) => (a[0] - o[0]) * (b[1] - o[1]) - (a[1] - o[1]) * (b[0] - o[0])
  const abajo: Punto[] = []
  for (const q of p) {
    while (abajo.length >= 2 && cruz(abajo[abajo.length - 2], abajo[abajo.length - 1], q) <= 0) abajo.pop()
    abajo.push(q)
  }
  const arriba: Punto[] = []
  for (let i = p.length - 1; i >= 0; i--) {
    const q = p[i]
    while (arriba.length >= 2 && cruz(arriba[arriba.length - 2], arriba[arriba.length - 1], q) <= 0) arriba.pop()
    arriba.push(q)
  }
  return [...abajo.slice(0, -1), ...arriba.slice(0, -1)]
}

export function area(poligono: Punto[]): number {
  let s = 0
  for (let i = 0; i < poligono.length; i++) {
    const [x1, y1] = poligono[i]
    const [x2, y2] = poligono[(i + 1) % poligono.length]
    s += x1 * y2 - x2 * y1
  }
  return s / 2
}

/** centroide del área (cae en el medio visual de la unidad); si el área es nula, promedio de vértices */
export function centroide(poligono: Punto[]): Punto {
  const a = area(poligono)
  if (Math.abs(a) < 1e-9) {
    const n = poligono.length || 1
    return [poligono.reduce((s, p) => s + p[0], 0) / n, poligono.reduce((s, p) => s + p[1], 0) / n]
  }
  let cx = 0
  let cy = 0
  for (let i = 0; i < poligono.length; i++) {
    const [x1, y1] = poligono[i]
    const [x2, y2] = poligono[(i + 1) % poligono.length]
    const f = x1 * y2 - x2 * y1
    cx += (x1 + x2) * f
    cy += (y1 + y2) * f
  }
  return [cx / (6 * a), cy / (6 * a)]
}

export type Caja2D = { minX: number; minY: number; maxX: number; maxY: number }

export function caja2D(puntos: Punto[]): Caja2D {
  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity
  for (const [x, y] of puntos) {
    if (x < minX) minX = x
    if (y < minY) minY = y
    if (x > maxX) maxX = x
    if (y > maxY) maxY = y
  }
  return { minX, minY, maxX, maxY }
}

/** achica un polígono convexo hacia su centroide (para dejar "muros" entre unidades) */
export function contraer(poligono: Punto[], cuanto: number): Punto[] {
  const [cx, cy] = centroide(poligono)
  return poligono.map(([x, y]) => {
    const dx = x - cx
    const dy = y - cy
    const d = Math.hypot(dx, dy) || 1
    const k = Math.max(0, (d - cuanto) / d)
    return [cx + dx * k, cy + dy * k]
  })
}

export const aPuntosSVG = (p: Punto[]) => p.map(([x, y]) => `${redondear(x)},${redondear(y)}`).join(' ')
export const redondear = (n: number) => Math.round(n * 10) / 10
