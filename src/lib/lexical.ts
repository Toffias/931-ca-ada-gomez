// Utilidades sobre el JSON de Lexical (texto enriquecido del admin): índice de subtítulos y tiempo de lectura.
// El índice y el cuerpo usan el mismo generador de ids, así cada entrada salta a su subtítulo.

import { slugify } from './slugify'

type Nodo = { type?: string; tag?: string; text?: string; children?: Nodo[] }

export type EntradaIndice = { id: string; texto: string; nivel: 2 | 3 }

export const textoDeNodo = (n: Nodo): string => (n.text ?? '') + (n.children ?? []).map(textoDeNodo).join('')

/** ids únicos en orden de aparición: dos "Precios" quedan "precios" y "precios-2" */
export function generadorIds() {
  const usados = new Map<string, number>()
  return (texto: string) => {
    const base = slugify(texto) || 'seccion'
    const n = (usados.get(base) ?? 0) + 1
    usados.set(base, n)
    return n === 1 ? base : `${base}-${n}`
  }
}

const hijos = (contenido: unknown): Nodo[] =>
  contenido && typeof contenido === 'object' && 'root' in contenido ? (((contenido as { root: Nodo }).root.children ?? []) as Nodo[]) : []

/** sólo h2 y h3 llevan id (y entran al índice) */
export const conId = (tag?: string) => tag === 'h2' || tag === 'h3'

/** subtítulos h2 y h3 del cuerpo, para el índice lateral */
export function indiceDe(contenido: unknown): EntradaIndice[] {
  const id = generadorIds()
  return hijos(contenido)
    .filter((n) => n.type === 'heading' && conId(n.tag))
    .map((n) => ({ id: id(textoDeNodo(n)), texto: textoDeNodo(n).trim(), nivel: n.tag === 'h2' ? (2 as const) : (3 as const) }))
    .filter((e) => e.texto)
}

/** minutos de lectura (a 200 palabras por minuto), contando también los textos sueltos que se pasen */
export function minutosDeLectura(contenido: unknown, ...extra: (string | null | undefined)[]) {
  const texto = [...hijos(contenido).map(textoDeNodo), ...extra].join(' ')
  const palabras = texto.split(/\s+/).filter(Boolean).length
  return Math.max(1, Math.round(palabras / 200))
}
