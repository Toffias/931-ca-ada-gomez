import { notFound } from 'next/navigation'

import { PantallaGaleria } from '@/components/proyecto/PantallaGaleria'
import { imagen, obtenerSitio } from '@/lib/datos'
import { rutasServidor, textosServidor } from '@/lib/idioma-servidor'
import { exigirSeccion } from '@/lib/navegacion'
import type { Imagen } from '@/lib/tipos'

export const revalidate = 60

export async function generateMetadata() {
  return { title: (await textosServidor()).menu.galeria }
}

// Galería general (spec M): sólo las fotos de Proyecto → Galería y video → Galería general, en ese orden. No suma
// portadas ni galerías de las torres, amenities ni el barrio: el admin elige desde un único lugar qué se ve acá.
export default async function PaginaGaleria({ params }: { params: Promise<{ n?: string[] }> }) {
  await exigirSeccion('galeria')
  const { n: resto = [] } = await params
  const [sitio, rutas, t] = await Promise.all([obtenerSitio(), rutasServidor(), textosServidor()])
  const imagenes = (sitio.galeria ?? []).map((g) => imagen(g.imagen, g.epigrafe)).filter((i): i is Imagen => !!i)

  const n = Number(resto[0] ?? 1)
  if (resto.length > 1 || !Number.isInteger(n) || n < 1 || n > Math.max(1, imagenes.length)) notFound()
  return <PantallaGaleria titulo={t.menu.galeria} imagenes={imagenes} inicial={n - 1} base={rutas.galeria()} />
}
