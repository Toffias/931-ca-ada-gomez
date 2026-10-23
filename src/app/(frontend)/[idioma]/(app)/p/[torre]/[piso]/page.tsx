import type { Metadata } from 'next'
import { notFound } from 'next/navigation'

import { PantallaPlanta } from '@/components/proyecto/PantallaPlanta'
import { obtenerAmenities, obtenerTorre, obtenerTorres, obtenerUnidadesDeTorre } from '@/lib/datos'
import { escenaNivel } from '@/lib/escenas'
import { nombreNivel } from '@/lib/etiquetas'
import { textosServidor } from '@/lib/idioma-servidor'
import { seccionesVisibles } from '@/lib/navegacion'

export const revalidate = 60

type Props = { params: Promise<{ torre: string; piso: string }>; searchParams: Promise<{ u?: string }> }

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { torre: slug, piso } = await params
  const [torre, t] = await Promise.all([obtenerTorre(slug), textosServidor()])
  const nivel = torre?.niveles.find((n) => n.piso === Number(piso))
  return torre && nivel ? { title: `${nombreNivel(t, nivel)} · ${torre.nombre}` } : {}
}

export default async function PaginaPlanta({ params, searchParams }: Props) {
  const [{ torre: slug, piso: pisoTexto }, { u }] = await Promise.all([params, searchParams])
  const piso = Number(pisoTexto)
  const torre = await obtenerTorre(slug)
  const nivel = torre?.niveles.find((n) => n.piso === piso)
  if (!torre || !nivel || !Number.isInteger(piso)) notFound()

  const [torres, todas, { escena, pois }, amenities, visibles] = await Promise.all([
    obtenerTorres(),
    obtenerUnidadesDeTorre(slug),
    escenaNivel(slug, piso),
    obtenerAmenities(),
    seccionesVisibles(),
  ])
  const unidades = todas.filter((x) => x.piso === piso)

  return (
    <PantallaPlanta
      torre={{ slug: torre.slug, nombre: torre.nombre }}
      torres={torres.map((t) => ({ slug: t.slug, nombre: t.nombre }))}
      nivel={nivel}
      niveles={torre.niveles}
      unidades={unidades}
      escena={escena}
      pois={pois}
      amenities={Object.fromEntries(visibles.amenities ? amenities.map((a) => [a.slug, a.nombre]) : [])}
      resaltar={u}
      conTour={visibles.recorridos}
      dormitoriosPosibles={[...new Set(todas.map((x) => x.dormitorios ?? 0))]}
    />
  )
}
