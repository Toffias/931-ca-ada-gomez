import { notFound, redirect } from 'next/navigation'

import { PantallaFachada } from '@/components/proyecto/PantallaFachada'
import { obtenerTorres, obtenerUnidadesDeTorre } from '@/lib/datos'
import { escenaFachada, vistasFachada } from '@/lib/escenas'
import { rutasServidor, textosServidor } from '@/lib/idioma-servidor'
import { exigirSeccion, seccionesVisibles } from '@/lib/navegacion'

export const revalidate = 60

export async function generateMetadata() {
  return { title: (await textosServidor()).menu.disponibilidad }
}

export default async function PaginaDisponibilidad({ params }: { params: Promise<{ vista: string }> }) {
  await exigirSeccion('disponibilidad')
  const { vista } = await params
  const [vistas, datos, torres, visibles] = await Promise.all([vistasFachada(), escenaFachada(vista), obtenerTorres(), seccionesVisibles()])
  if (!datos) {
    // una vista que ya no existe (p. ej. la fachada del esquema, después de cargar los renders): a la primera
    if (vistas.length) redirect((await rutasServidor()).disponibilidad(vistas[0].clave))
    notFound()
  }

  // una vista con render puede mostrar varias torres: se cargan las unidades de todas las que aparecen
  const slugs = datos.torre ? [datos.torre] : torres.map((t) => t.slug)
  const unidades = (await Promise.all(slugs.map(obtenerUnidadesDeTorre))).flat()

  return (
    <PantallaFachada
      escena={datos.escena}
      vistas={vistas}
      actual={vista}
      unidades={unidades}
      conTour={visibles.recorridos}
      dormitoriosPosibles={[...new Set(unidades.map((u) => u.dormitorios ?? 0))]}
    />
  )
}
