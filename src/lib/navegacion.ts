import 'server-only'

import { notFound } from 'next/navigation'
import { cache } from 'react'

import type { NombreIcono } from '@/components/ui/Icono'

import { obtenerAmenities, obtenerArticulos, obtenerAvancesDeObra, obtenerProyecto, obtenerRecorridos, obtenerSitio, obtenerTorres } from './datos'
import { vistasFachada } from './escenas'
import { embedsUbicacion } from './google-maps'
import { rutasServidor, textosServidor } from './idioma-servidor'
import type { Seccion, Torre } from './tipos'

export type ItemMenu = { href: string; etiqueta: string; icono: NombreIcono; hijos?: { href: string; etiqueta: string }[] }

/** piso con el que se abre "Plantas": el más alto con unidades (niveles viene de arriba hacia abajo) */
export const pisoInicial = (t: Torre) =>
  t.niveles.find((n) => n.tipo === 'unidades')?.piso ?? t.niveles[0]?.piso ?? 0

/** una sección se ve si está prendida en el admin y además tiene contenido */
export const seccionesVisibles = cache(async (): Promise<Record<Seccion, boolean>> => {
  const [proyecto, sitio, torres, amenities, recorridos, avances, fachadas, articulos] = await Promise.all([
    obtenerProyecto(),
    obtenerSitio(),
    obtenerTorres(),
    obtenerAmenities(),
    obtenerRecorridos(),
    obtenerAvancesDeObra(),
    vistasFachada(),
    obtenerArticulos(),
  ])
  const s = proyecto.secciones
  return {
    disponibilidad: s.disponibilidad && fachadas.length > 0,
    amenities: s.amenities && amenities.length > 0,
    recorridos: s.recorridos && recorridos.length > 0,
    galeria: s.galeria && ((sitio.galeria?.length ?? 0) > 0 || torres.some((t) => t.galeria.length || t.portada)),
    video: s.video && !!sitio.video,
    obra: s.obra && avances.length > 0,
    ubicacion: s.ubicacion && !!(sitio.ubicacion?.texto || sitio.ubicacion?.cercanias?.length || sitio.ubicacion?.mapaIlustrado || embedsUbicacion(sitio.ubicacion).length),
    modo3d: s.modo3d && torres.length > 0,
    blog: s.blog && articulos.length > 0,
  }
})

/** en cada página de sección: 404 si está apagada */
export async function exigirSeccion(s: Seccion) {
  if (!(await seccionesVisibles())[s]) notFound()
}

export const armarMenu = cache(async (): Promise<ItemMenu[]> => {
  const [torres, visibles, fachadas, rutas, t] = await Promise.all([
    obtenerTorres(),
    seccionesVisibles(),
    vistasFachada(),
    rutasServidor(),
    textosServidor(),
  ])
  const m = t.menu
  const varias = torres.length > 1
  const items: ItemMenu[] = [{ href: rutas.proyecto(), etiqueta: m.proyecto, icono: 'edificio' }]

  if (torres.length)
    items.push({
      href: rutas.planta(torres[0].slug, pisoInicial(torres[0])),
      etiqueta: m.plantas,
      icono: 'planta',
      hijos: varias ? torres.map((x) => ({ href: rutas.planta(x.slug, pisoInicial(x)), etiqueta: x.nombre })) : undefined,
    })
  if (visibles.disponibilidad)
    items.push({ href: rutas.disponibilidad(fachadas[0].clave), etiqueta: m.disponibilidad, icono: 'fachada' })
  if (visibles.modo3d)
    items.push({
      href: rutas.tresD(torres[0].slug),
      etiqueta: m.modo3d,
      icono: 'cubo',
      hijos: varias ? torres.map((x) => ({ href: rutas.tresD(x.slug), etiqueta: x.nombre })) : undefined,
    })
  if (visibles.amenities) items.push({ href: rutas.amenities(), etiqueta: m.amenities, icono: 'estrella' })
  // los recorridos 360 no van en el menú: se entra desde la unidad (popover y ficha de planta)
  if (visibles.galeria) items.push({ href: rutas.galeria(), etiqueta: m.galeria, icono: 'galeria' })
  if (visibles.video) items.push({ href: rutas.video(), etiqueta: m.video, icono: 'video' })
  if (visibles.obra) items.push({ href: rutas.obra(), etiqueta: m.obra, icono: 'obra' })
  if (visibles.ubicacion) items.push({ href: rutas.ubicacion(), etiqueta: m.ubicacion, icono: 'ubicacion' })
  if (visibles.blog) items.push({ href: rutas.blog(), etiqueta: m.blog, icono: 'blog' })
  items.push({ href: rutas.contacto(), etiqueta: m.contacto, icono: 'contacto' })
  return items
})
