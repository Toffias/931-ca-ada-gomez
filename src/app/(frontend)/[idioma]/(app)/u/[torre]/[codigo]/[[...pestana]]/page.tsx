import type { Metadata } from 'next'
import { notFound } from 'next/navigation'

import { PantallaFicha } from '@/components/proyecto/PantallaFicha'
import {
  obtenerEdificio,
  obtenerProyecto,
  obtenerRecorridos,
  obtenerSitio,
  obtenerTorre,
  obtenerUnidad,
  obtenerUnidadesDeTorre,
  vistaDeUnidad,
} from '@/lib/datos'
import { recortarUnidad } from '@/lib/escena/recorte'
import { escenaNivel } from '@/lib/escenas'
import { embedsUbicacion } from '@/lib/google-maps'
import { idiomaActual, textosServidor } from '@/lib/idioma-servidor'
import { seccionesVisibles } from '@/lib/navegacion'
import { TIPOS_PLANTA, type PestanaFicha, type TipoPlanta } from '@/lib/rutas'

export const revalidate = 60

type Props = { params: Promise<{ torre: string; codigo: string; pestana?: string[] }> }

// Galería, Planta, Recorrido y Video están siempre (sin material muestran "Disponible próximamente");
// Vistas sólo si hay imagen para la orientación y altura de la unidad; Ubicación sólo si hay alguna vista de mapa.
const PESTANAS: PestanaFicha[] = ['galeria', 'planta', 'vistas', 'tour', 'video', 'ubicacion']

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { torre, codigo } = await params
  const [datos, t, tx] = await Promise.all([obtenerUnidad(torre, decodeURIComponent(codigo)), obtenerTorre(torre), textosServidor()])
  if (!datos || !t) return {}
  const u = datos.unidad
  const partes = [
    u.superficieTotal && `${u.superficieTotal} m²`,
    u.dormitorios != null && tx.meta.dormitorios(u.dormitorios),
    u.orientacion && tx.meta.orientacion(u.orientacion),
  ].filter(Boolean)
  const foto = datos.tipologia?.foto ?? t.portada
  return {
    title: tx.meta.unidad(u.codigo, t.nombre),
    description: `${tx.comun.piso(u.piso)}${partes.length ? ` · ${partes.join(' · ')}` : ''}.`,
    openGraph: foto ? { images: [{ url: foto.grande, alt: foto.alt }] } : undefined,
  }
}

export default async function PaginaUnidad({ params }: Props) {
  const { torre: slug, codigo: codigoUrl, pestana: resto = [] } = await params
  const codigo = decodeURIComponent(codigoUrl)
  const [datos, torre, edificio, proyecto, visibles, todas, sitio, tx, idioma] = await Promise.all([
    obtenerUnidad(slug, codigo),
    obtenerTorre(slug),
    obtenerEdificio(slug),
    obtenerProyecto(),
    seccionesVisibles(),
    obtenerUnidadesDeTorre(slug),
    obtenerSitio(),
    textosServidor(),
    idiomaActual(),
  ])
  if (!datos || !torre || !edificio) notFound()
  const { unidad, tipologia, planoUrl } = datos

  const vista = vistaDeUnidad(edificio, unidad, tx.ficha.epigrafeVista)
  const recorrido = visibles.recorridos ? (tipologia?.recorrido ?? unidad.recorrido) : null
  const mapas = visibles.ubicacion ? embedsUbicacion(sitio.ubicacion, idioma) : []
  const pestanas = PESTANAS.filter((x) => (x !== 'vistas' || vista) && (x !== 'ubicacion' || mapas.length))
  // sin modo en la URL se abre la galería si tiene fotos; si no, la planta
  const pestana = (resto[0] ?? (tipologia?.galeria.length ? 'galeria' : 'planta')) as PestanaFicha
  if (!pestanas.includes(pestana) || resto.length > 2) notFound()
  // en Ubicación el segundo tramo es la vista del mapa; en Planta, '2d' o '3d'; en el resto, el número de foto
  const mapa = pestana === 'ubicacion' ? mapas.find((m) => m.vista === (resto[1] ?? mapas[0].vista)) : undefined
  const tipoPlanta = pestana === 'planta' ? resto[1] : undefined
  const n = pestana === 'ubicacion' || pestana === 'planta' ? 1 : Number(resto[1] ?? 1)
  if ((pestana === 'ubicacion' && !mapa) || (tipoPlanta && !TIPOS_PLANTA.includes(tipoPlanta as TipoPlanta)) || !Number.isInteger(n) || n < 1)
    notFound()

  const [{ escena }, recorridos] = await Promise.all([escenaNivel(slug, unidad.piso), pestana === 'tour' ? obtenerRecorridos() : []])
  const tour = recorrido ? (recorridos.find((r) => r.slug === recorrido.slug) ?? null) : null
  // la huella sólo tiene sentido sobre el esquema (con un render cenital la escena no trae puntos)
  const huella = escena && !escena.fondo ? recortarUnidad(escena, unidad.codigo) : null

  const orden = [...todas].sort((a, b) => a.piso - b.piso || a.codigo.localeCompare(b.codigo))
  const i = orden.findIndex((x) => x.codigo === unidad.codigo)

  return (
    <PantallaFicha
      unidad={unidad}
      tipologia={tipologia}
      torreNombre={torre.nombre}
      pestana={pestana}
      n={n}
      tipoPlanta={tipoPlanta as TipoPlanta | undefined}
      pestanas={pestanas}
      huella={huella}
      planoPiso={escena}
      vista={vista}
      recorrido={recorrido}
      tour={tour}
      planoUrl={planoUrl}
      mapas={mapas}
      mapa={mapa?.vista}
      anterior={orden[i - 1]?.codigo}
      siguiente={orden[i + 1]?.codigo}
      proyecto={{ nombre: proyecto.nombre, contacto: proyecto.contacto, legal: proyecto.legal, brochure: proyecto.brochure }}
    />
  )
}
