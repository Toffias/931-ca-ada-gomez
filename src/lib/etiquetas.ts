// Etiquetas que dependen del idioma para datos que el admin puede dejar sin nombre (niveles, vistas).
// Sirve en servidor y cliente: recibe los textos del idioma activo.

import type { Textos } from '@/textos'

import type { VistaFachada } from './escenas'
import type { EmbedMapa } from './google-maps'
import type { Nivel } from './tipos'

export const nombreNivel = (t: Textos, n: Pick<Nivel, 'piso' | 'nombre'>) => n.nombre || t.niveles.nombre(n.piso)

/** para la barra de pisos: "9", "PB"; un nivel especial con nombre propio muestra sus primeras letras */
export const cortoNivel = (t: Textos, n: Pick<Nivel, 'piso' | 'nombre' | 'tipo'>) =>
  n.tipo === 'especial' && n.piso !== 0 && n.nombre ? n.nombre.slice(0, 3) : t.niveles.corto(n.piso)

/** chip de una vista de mapa: la búsqueda lleva el nombre del admin; mapa y Street View, el del idioma */
export const etiquetaMapa = (t: Textos, e: EmbedMapa) =>
  e.nombre || t.ubicacion.mapas[e.vista as keyof Textos['ubicacion']['mapas']] || e.vista

export const etiquetaVista = (t: Textos, etiqueta: string | null | undefined, i: number) => etiqueta || t.giro.vista(i + 1)

export function etiquetaFachada(t: Textos, v: VistaFachada, corta = false) {
  if (v.orientacion) {
    const o = t.orientaciones[v.orientacion]
    if (v.torreNombre) return `${v.torreNombre} · ${o}`
    return corta ? o : t.fachada.fachada(o)
  }
  const nombre = v.etiqueta || t.giro.vista(v.n ?? 1)
  return v.torreNombre && !corta ? `${v.torreNombre} · ${nombre}` : nombre
}
