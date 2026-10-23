// Lectura mínima del JSON de un .glb para obtener los "extras" de cada nodo sin cargar Three.js.
// Sirve para el seed y para herramientas de importación (p. ej. crear unidades a partir del modelo).

export type ExtrasUnidad = {
  tipo: 'unidad'
  unidad: string
  piso: number
  m2?: number
  dormitorios?: number
  orientacion?: string
  estado?: string
  precio_usd?: number
}

export function leerJSONdelGLB(buf: Buffer): { nodes?: { name?: string; extras?: Record<string, unknown> }[] } {
  if (buf.readUInt32LE(0) !== 0x46546c67) throw new Error('No es un archivo .glb')
  const largo = buf.readUInt32LE(12)
  return JSON.parse(buf.subarray(20, 20 + largo).toString('utf8'))
}

export function leerUnidadesDelGLB(buf: Buffer): ExtrasUnidad[] {
  const json = leerJSONdelGLB(buf)
  return (json.nodes ?? [])
    .map((n) => n.extras as ExtrasUnidad | undefined)
    .filter((e): e is ExtrasUnidad => e?.tipo === 'unidad' && typeof e.unidad === 'string')
    .sort((a, b) => a.piso - b.piso || a.unidad.localeCompare(b.unidad))
}
