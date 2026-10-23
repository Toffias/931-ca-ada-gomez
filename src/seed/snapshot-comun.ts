import path from 'path'
import type { CollectionSlug, Field } from 'payload'

export const DIR_SNAPSHOT = path.resolve(process.cwd(), 'snapshot')

// Orden de carga: primero lo que otros referencian. Si hay ciclos (edificio ↔ amenity) el import resuelve
// en una segunda pasada.
export const COLECCIONES_SNAPSHOT = [
  'media',
  'recorridos',
  'edificios',
  'amenities',
  'tipologias',
  'unidades',
  'avances-de-obra',
  'autores',
  'articulos',
] as const satisfies CollectionSlug[]

// Los ids cambian al crear en otra base: tabla[coleccion][idViejo] = idNuevo
export type TablaIds = Record<string, Map<string | number, string | number>>

type Dato = Record<string, unknown>

/**
 * Copia `data` cambiando cada relación/upload al id nuevo. Lo que todavía no existe queda en null y se
 * marca `pendiente` para volver a pasarlo cuando esté todo creado.
 */
export function reasignarIds(fields: Field[], data: Dato, tabla: TablaIds, estado = { pendiente: false }) {
  const salida: Dato = { ...data }

  const nuevoId = (relationTo: string, viejo: unknown) => {
    if (viejo === null || viejo === undefined) return viejo
    const id = tabla[relationTo]?.get(viejo as string | number)
    if (id === undefined) estado.pendiente = true
    return id ?? null
  }
  const relacion = (relationTo: string | string[], valor: unknown): unknown => {
    if (Array.isArray(relationTo)) {
      const v = valor as { relationTo: string; value: unknown } | null
      if (!v) return v
      const value = nuevoId(v.relationTo, v.value)
      return value === null ? null : { relationTo: v.relationTo, value }
    }
    return nuevoId(relationTo, valor)
  }

  for (const f of fields) {
    if (f.type === 'row' || f.type === 'collapsible' || (f.type === 'group' && !('name' in f && f.name))) {
      Object.assign(salida, reasignarIds(f.fields, salida, tabla, estado))
      continue
    }
    if (f.type === 'tabs') {
      for (const tab of f.tabs) {
        if ('name' in tab && tab.name) {
          const v = salida[tab.name]
          if (v && typeof v === 'object') salida[tab.name] = reasignarIds(tab.fields, v as Dato, tabla, estado)
        } else Object.assign(salida, reasignarIds(tab.fields, salida, tabla, estado))
      }
      continue
    }
    if (!('name' in f) || !f.name || !(f.name in salida)) continue
    const v = salida[f.name]
    if (f.type === 'group' && v && typeof v === 'object') {
      salida[f.name] = reasignarIds(f.fields, v as Dato, tabla, estado)
    } else if (f.type === 'array' && Array.isArray(v)) {
      salida[f.name] = v.map((fila: Dato) => reasignarIds(f.fields, fila, tabla, estado))
    } else if (f.type === 'blocks' && Array.isArray(v)) {
      salida[f.name] = v.map((b: Dato) => {
        const bloque = f.blocks.find((x) => x.slug === b.blockType)
        return bloque ? reasignarIds(bloque.fields, b, tabla, estado) : b
      })
    } else if (f.type === 'richText' && v && typeof v === 'object') {
      salida[f.name] = reasignarEnTexto(v, (relationTo, viejo) => nuevoId(relationTo, viejo))
    } else if (f.type === 'relationship' || f.type === 'upload') {
      salida[f.name] = Array.isArray(v)
        ? v.map((x) => relacion(f.relationTo, x)).filter((x) => x !== null)
        : relacion(f.relationTo, v)
    }
  }
  return salida
}

/** dentro de un texto enriquecido (Lexical): imágenes, relaciones y links internos también apuntan a ids */
function reasignarEnTexto(nodo: unknown, nuevoId: (relationTo: string, viejo: unknown) => unknown): unknown {
  if (Array.isArray(nodo)) return nodo.map((n) => reasignarEnTexto(n, nuevoId))
  if (!nodo || typeof nodo !== 'object') return nodo
  const n = { ...(nodo as Dato) }
  if ((n.type === 'upload' || n.type === 'relationship') && typeof n.relationTo === 'string') n.value = nuevoId(n.relationTo, n.value)
  const doc = (n.fields as Dato | undefined)?.doc as { relationTo?: string; value?: unknown } | undefined
  if (doc?.relationTo) n.fields = { ...(n.fields as Dato), doc: { ...doc, value: nuevoId(doc.relationTo, doc.value) } }
  for (const k of ['root', 'children']) if (k in n) n[k] = reasignarEnTexto(n[k], nuevoId)
  return n
}
