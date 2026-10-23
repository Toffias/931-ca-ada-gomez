import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'

import { VisorCliente } from '@/components/visor/VisorCliente'
import { aConfigVisor, aUnidadVisor, obtenerEdificio, obtenerTorres, obtenerUnidades, obtenerUnidadesDeTorre } from '@/lib/datos'
import { rutasServidor, textosServidor } from '@/lib/idioma-servidor'
import { exigirSeccion, seccionesVisibles } from '@/lib/navegacion'

// Modo 3D (spec D): el visor Three.js de la plantilla, como una sección más.
export const revalidate = 60

type Props = { params: Promise<{ torre: string }>; searchParams: Promise<{ piso?: string }> }

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const [e, t] = await Promise.all([obtenerEdificio((await params).torre), textosServidor()])
  return e ? { title: t.meta.enTresD(e.nombre), description: e.bajada ?? undefined } : {}
}

export default async function PaginaTresD({ params, searchParams }: Props) {
  await exigirSeccion('modo3d')
  const [{ torre: slug }, { piso }] = await Promise.all([params, searchParams])
  const edificio = await obtenerEdificio(slug)
  if (!edificio) notFound()

  const [docs, fichas, torres, visibles, rutas, t] = await Promise.all([
    obtenerUnidades(edificio.id),
    obtenerUnidadesDeTorre(slug),
    obtenerTorres(),
    seccionesVisibles(),
    rutasServidor(),
    textosServidor(),
  ])
  const pisoInicial = piso != null && Number.isInteger(Number(piso)) ? Number(piso) : null

  return (
    <div className="pantalla pantalla-3d">
      <VisorCliente
        config={aConfigVisor(edificio)}
        unidades={docs.map(aUnidadVisor)}
        fichas={fichas}
        torre={slug}
        pisoInicial={pisoInicial}
        conTour={visibles.recorridos}
      />
      {torres.length > 1 && (
        <nav className="chips selector-torres" aria-label={t.planta.torres}>
          {torres.map((x) => (
            <Link key={x.slug} href={rutas.tresD(x.slug)} className={`chip${x.slug === slug ? ' activo' : ''}`}>
              {x.nombre}
            </Link>
          ))}
        </nav>
      )}
    </div>
  )
}
