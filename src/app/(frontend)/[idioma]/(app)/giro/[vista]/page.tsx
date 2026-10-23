import { notFound } from 'next/navigation'
import { preload } from 'react-dom'

import { PantallaGiro } from '@/components/proyecto/PantallaGiro'
import { obtenerTorres } from '@/lib/datos'
import { vistasGiro } from '@/lib/escenas'
import { rutasServidor, textosServidor } from '@/lib/idioma-servidor'
import { pisoInicial, seccionesVisibles } from '@/lib/navegacion'

export const revalidate = 60

export async function generateMetadata() {
  return { title: (await textosServidor()).menu.proyecto }
}

export default async function PaginaGiro({ params }: { params: Promise<{ vista: string }> }) {
  const vista = Number((await params).vista)
  const [vistas, torres, visibles, rutas] = await Promise.all([vistasGiro(), obtenerTorres(), seccionesVisibles(), rutasServidor()])
  if (!Number.isInteger(vista) || vista < 0 || (vistas.length && vista >= vistas.length)) notFound()

  // el resto de los puntos de vista se piden ya, así girar no espera la descarga
  for (const v of vistas) preload(v.imagen.grande, { as: 'image' })

  return (
    <PantallaGiro
      vistas={vistas}
      inicial={vista}
      torres={torres.map((t) => ({
        slug: t.slug,
        nombre: t.nombre,
        plantas: rutas.planta(t.slug, pisoInicial(t)),
        disponibles: t.niveles.reduce((s, n) => s + n.disponibles, 0),
      }))}
      enlaces={{
        tresD: visibles.modo3d && torres[0] ? rutas.tresD(torres[0].slug) : null,
        galeria: visibles.galeria ? rutas.galeria() : null,
        plantas: torres[0] ? rutas.planta(torres[0].slug, pisoInicial(torres[0])) : rutas.contacto(),
      }}
    />
  )
}
