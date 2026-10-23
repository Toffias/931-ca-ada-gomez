import type { Textos } from '@/textos'

import type { Torre, Unidad } from './tipos'

export type Cifra = { valor: number | string; etiqueta: string }

/** "En números" de El proyecto (y del folleto PDF): sólo las cifras que tienen dato */
export function cifrasDelProyecto(torres: Torre[], unidades: Unidad[], tx: Textos['proyecto']): Cifra[] {
  const niveles = torres.flatMap((x) => x.niveles)
  const dorms = unidades.map((u) => u.dormitorios).filter((d): d is number => !!d)
  const entrega = torres[0]?.entrega
  const cifras: Cifra[] = [
    { valor: niveles.filter((n) => n.tipo === 'unidades').length, etiqueta: tx.pisos },
    { valor: niveles.reduce((s, n) => s + n.total, 0), etiqueta: tx.unidades },
    { valor: niveles.reduce((s, n) => s + n.disponibles, 0), etiqueta: tx.disponibles },
    ...(dorms.length ? [{ valor: tx.rango(Math.min(...dorms), Math.max(...dorms)), etiqueta: tx.dormitorios }] : []),
    ...(entrega ? [{ valor: entrega, etiqueta: tx.entrega }] : []),
  ]
  return cifras.filter((c) => c.valor !== 0)
}
