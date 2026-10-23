// Embeds de Google Maps. Mapa y Street View van sin API key: el admin pega el iframe de "Compartir → Insertar un
// mapa" (o sólo su src) y se acepta únicamente www.google.com/maps/embed para no meter iframes arbitrarios.
// Las búsquedas de cercanías ("supermercado cerca de…") usan la Maps Embed API y necesitan
// NEXT_PUBLIC_GOOGLE_MAPS_EMBED_KEY; sin key (o sin dirección) no aparecen.

import { textosDe } from '../textos'

import { IDIOMA_DEFECTO, type Idioma } from './idiomas'
import { slugify } from './slugify'

const ORIGEN = 'https://www.google.com'
const RUTA = '/maps/embed'

/** src del iframe si el valor es un embed válido de Google Maps; null si no */
export function urlEmbedGoogle(valor: string | null | undefined): string | null {
  if (!valor) return null
  const texto = valor.trim()
  const src = texto.startsWith('<') ? texto.match(/\ssrc=["']([^"']+)["']/i)?.[1] : texto
  if (!src) return null
  try {
    const url = new URL(src.replace(/&amp;/g, '&'))
    if (url.origin !== ORIGEN || url.pathname !== RUTA || !url.searchParams.get('pb')) return null
    return url.toString()
  } catch {
    return null
  }
}

/** clave de la vista en la URL: 'mapa', 'streetview' o 'cerca-<búsqueda>' (ej. 'cerca-supermercados') */
export type VistaMapa = string
/** nombre: el que puso el admin a la búsqueda; mapa y Street View se rotulan con los textos del idioma */
export type EmbedMapa = { vista: VistaMapa; url: string; nombre?: string }

type DatosUbicacion = {
  direccion?: string | null
  mapaGoogle?: string | null
  streetView?: string | null
  busquedasCercanas?: { nombre?: string | null; busqueda?: string | null }[] | null
}

/** las vistas de mapa disponibles, en el orden de los chips (las vacías o inválidas no aparecen) */
export function embedsUbicacion(u: DatosUbicacion | null | undefined, idioma: Idioma = IDIOMA_DEFECTO): EmbedMapa[] {
  const embeds: EmbedMapa[] = []
  const mapa = urlEmbedGoogle(u?.mapaGoogle)
  const streetView = urlEmbedGoogle(u?.streetView)
  if (mapa) embeds.push({ vista: 'mapa', url: mapa })
  if (streetView) embeds.push({ vista: 'streetview', url: streetView })

  const key = process.env.NEXT_PUBLIC_GOOGLE_MAPS_EMBED_KEY
  const direccion = u?.direccion?.trim()
  if (!key || !direccion) return embeds
  for (const b of u?.busquedasCercanas ?? []) {
    const nombre = b.nombre?.trim()
    if (!nombre) continue
    // la clave va en la URL: sale de la búsqueda (no se traduce) para que cambiar de idioma no la rompa
    const vista = `cerca-${slugify(b.busqueda?.trim() || nombre)}`
    if (vista === 'cerca-' || embeds.some((e) => e.vista === vista)) continue
    const q = textosDe(idioma).ubicacion.cercaDe(b.busqueda?.trim() || nombre, direccion)
    const url = `${ORIGEN}/maps/embed/v1/search?${new URLSearchParams({ key, q, language: idioma })}`
    embeds.push({ vista, url, nombre })
  }
  return embeds
}

/** validación del campo en el admin */
export function validarEmbedGoogle(valor: string | null | undefined): true | string {
  if (!valor?.trim() || urlEmbedGoogle(valor)) return true
  return 'Pegá el código de Google Maps → Compartir → Insertar un mapa (empieza con <iframe src="https://www.google.com/maps/embed?…).'
}
