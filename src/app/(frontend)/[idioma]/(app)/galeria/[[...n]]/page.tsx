import { notFound } from 'next/navigation'

import { PantallaGaleria } from '@/components/proyecto/PantallaGaleria'
import { imagen, obtenerAmenities, obtenerSitio, obtenerTorres } from '@/lib/datos'
import { rutasServidor, textosServidor } from '@/lib/idioma-servidor'
import { exigirSeccion, seccionesVisibles } from '@/lib/navegacion'
import type { Imagen } from '@/lib/tipos'

export const revalidate = 60

export async function generateMetadata() {
  return { title: (await textosServidor()).menu.galeria }
}

// Galería general (spec M): la del proyecto, portada y galería de cada torre y, después, lo que ya se usa en otras
// secciones (fotos de amenities y del barrio), para tener todas las imágenes en un solo lugar.
export default async function PaginaGaleria({ params }: { params: Promise<{ n?: string[] }> }) {
  await exigirSeccion('galeria')
  const { n: resto = [] } = await params
  const [sitio, torres, amenities, visibles, rutas, t] = await Promise.all([
    obtenerSitio(),
    obtenerTorres(),
    obtenerAmenities(),
    seccionesVisibles(),
    rutasServidor(),
    textosServidor(),
  ])
  const propias = (sitio.galeria ?? []).map((g) => imagen(g.imagen, g.epigrafe)).filter((i): i is Imagen => !!i)
  const deTorres = torres.flatMap((t) => [...(t.portada ? [{ ...t.portada, epigrafe: t.nombre }] : []), ...t.galeria])
  // sólo de las secciones que se ven: si amenities está apagada, sus fotos tampoco aparecen acá
  const deAmenities = visibles.amenities
    ? amenities.flatMap((a) => a.imagenes.map((i) => ({ ...i, epigrafe: i.epigrafe ? `${a.nombre} · ${i.epigrafe}` : a.nombre })))
    : []
  const barrio = visibles.ubicacion ? imagen(sitio.ubicacion?.foto, t.menu.ubicacion) : null
  const vistas = new Set<string>()
  const imagenes = [...propias, ...deTorres, ...deAmenities, ...(barrio ? [barrio] : [])].filter(
    (i) => !vistas.has(i.url) && vistas.add(i.url),
  )

  const n = Number(resto[0] ?? 1)
  if (resto.length > 1 || !Number.isInteger(n) || n < 1 || n > Math.max(1, imagenes.length)) notFound()
  return <PantallaGaleria titulo={t.menu.galeria} imagenes={imagenes} inicial={n - 1} base={rutas.galeria()} />
}
