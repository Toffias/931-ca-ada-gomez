// Todas las URLs del sitio en un solo lugar: cada pantalla tiene la suya, así se comparte por link o QR.
// Cada ruta lleva el prefijo del idioma: en componentes cliente se piden con useRutas() y en el servidor con
// rutasServidor() (src/lib/idioma-servidor.ts).

import { conIdioma, type Idioma } from './idiomas'

export type PestanaFicha = 'galeria' | 'planta' | 'vistas' | 'tour' | 'video' | 'ubicacion'
/** segundo tramo de la pestaña Planta de la ficha */
export const TIPOS_PLANTA = ['2d', '3d'] as const
export type TipoPlanta = (typeof TIPOS_PLANTA)[number]

const base = {
  intro: () => '/',
  proyecto: () => '/proyecto',
  giro: (vista = 0) => `/giro/${vista}`,
  tresD: (torre: string, piso?: number | null) => `/3d/${torre}${piso != null ? `?piso=${piso}` : ''}`,
  planta: (torre: string, piso: number, unidad?: string | null) =>
    `/p/${torre}/${piso}${unidad ? `?u=${encodeURIComponent(unidad)}` : ''}`,
  // n: foto de la galería (1, 2…), en Planta '2d' | '3d' o, en Ubicación, la vista del mapa ('mapa', 'streetview', 'cerca-…')
  unidad: (torre: string, codigo: string, pestana?: PestanaFicha, n?: number | string) =>
    `/u/${torre}/${encodeURIComponent(codigo)}${pestana ? `/${pestana}${n ? `/${n}` : ''}` : ''}`,
  disponibilidad: (vista: string) => `/disponibilidad/${vista}`,
  amenities: (slug?: string | null) => `/amenities${slug ? `/${slug}` : ''}`,
  recorridos: (slug?: string, punto?: string) => `/recorridos${slug ? `/${slug}${punto ? `/${punto}` : ''}` : ''}`,
  galeria: (n?: number) => `/galeria${n ? `/${n}` : ''}`,
  video: () => '/video',
  obra: () => '/obra',
  // modo: 'info', 'ilustrado' o una vista de mapa ('mapa', 'streetview', 'cerca-supermercados'…)
  ubicacion: (modo: string = 'info') => `/ubicacion/${modo}`,
  contacto: () => '/contacto',
  blog: (slug?: string | null) => `/blog${slug ? `/${slug}` : ''}`,
}

export type Rutas = typeof base

const cache = new Map<Idioma, Rutas>()

/** las rutas de `base` con el prefijo del idioma ("/en/giro/0"; el idioma por defecto va sin prefijo) */
export function rutasDe(idioma: Idioma): Rutas {
  let r = cache.get(idioma)
  if (!r) {
    r = Object.fromEntries(
      Object.entries(base).map(([k, f]) => [k, (...args: never[]) => conIdioma((f as (...a: never[]) => string)(...args), idioma)]),
    ) as Rutas
    cache.set(idioma, r)
  }
  return r
}
