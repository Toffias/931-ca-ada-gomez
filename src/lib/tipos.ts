// Tipos serializables que el servidor le pasa a las páginas y componentes del sitio público.
// Se arman en src/lib/datos.ts a partir de los documentos de Payload: acá no hay nada de Payload.

import type { EstadoUnidad } from '@/components/visor/tipos'

export type { EstadoUnidad }

export type Imagen = {
  url: string
  /** 800 px */
  chica: string
  /** 1920 px */
  grande: string
  alt: string
  ancho?: number | null
  alto?: number | null
  epigrafe?: string | null
}

export type Tema = 'oscuro' | 'claro' | 'sistema'

export type Seccion = 'disponibilidad' | 'amenities' | 'recorridos' | 'galeria' | 'video' | 'obra' | 'ubicacion' | 'modo3d' | 'blog'

export type Proyecto = {
  nombre: string
  eslogan?: string | null
  logo: Imagen | null
  /** ícono de la pestaña; sin él, el del navegador */
  favicon: Imagen | null
  acento: string
  /** fondo de cada tema */
  fondo: string
  fondoClaro: string
  /** tema con el que abre el sitio; el visitante lo puede cambiar */
  tema: Tema
  tipografia: 'inter' | 'manrope' | 'cormorant'
  desarrolladora: { nombre?: string | null; web?: string | null; logo: Imagen | null }
  secciones: Record<Seccion, boolean>
  contacto: {
    telefono?: string | null
    whatsapp?: string | null
    email?: string | null
    direccion?: string | null
    horario?: string | null
    motivos: string[]
  }
  descripcion?: string | null
  legal?: string | null
  privacidad?: string | null
  brochure?: string | null
}

/** artículo del blog; `contenido` es el JSON de Lexical tal cual (se dibuja con RichText en el servidor) */
export type Autor = {
  nombre: string
  cargo?: string | null
  bio?: string | null
  foto: Imagen | null
  /** LinkedIn, web… (sameAs en los datos estructurados) */
  perfiles: string[]
}

export type Articulo = {
  id: number | string
  slug: string
  titulo: string
  categoria?: string | null
  resumen?: string | null
  fecha: string
  actualizado: string
  autor: Autor | null
  portada: Imagen | null
  contenido?: unknown
  /** subtítulos h2/h3 del cuerpo, para el índice */
  indice: { id: string; texto: string; nivel: 2 | 3 }[]
  minutos: number
  preguntas: { pregunta: string; respuesta: string }[]
  seo: { titulo?: string | null; descripcion?: string | null }
}

export type Nivel = {
  piso: number
  /** el que se cargó en el admin; si no hay, se arma según el idioma ("Piso 9", "Floor 9"): ver lib/etiquetas */
  nombre: string | null
  tipo: 'unidades' | 'especial'
  total: number
  disponibles: number
}

export type Torre = {
  id: number | string
  slug: string
  nombre: string
  direccion?: string | null
  estadoObra?: string | null
  entrega?: string | null
  bajada?: string | null
  caracteristicas: string[]
  portada: Imagen | null
  galeria: Imagen[]
  niveles: Nivel[]
}

export type RecorridoRef = { slug: string; nombre: string }

export type Tipologia = {
  id: number | string
  codigo: string
  nombre?: string | null
  descripcion?: string | null
  foto: Imagen | null
  planta: Imagen | null
  planta2d: Imagen | null
  galeria: Imagen[]
  brochure?: string | null
  /** YouTube / Vimeo / MP4 / HLS */
  video?: string | null
  recorrido: RecorridoRef | null
}

export type Unidad = {
  id: number | string
  codigo: string
  torre: string
  torreId: number | string
  piso: number
  estado: EstadoUnidad
  tipologia: { codigo: string; nombre?: string | null } | null
  dormitorios?: number | null
  banos?: number | null
  ambientes?: number | null
  superficieInterna?: number | null
  superficieBalcon?: number | null
  superficieTotal?: number | null
  orientacion?: string | null
  /** null si no se muestra: los precios ocultos no llegan al navegador */
  precio?: number | null
  moneda?: 'USD' | 'ARS' | null
  extras: string[]
  recorrido: RecorridoRef | null
}

/** estado y precio por unidad, separado para poder refrescarlo sin recargar todo: { torre: { codigo: … } } */
export type Disponibilidad = Record<string, Record<string, { estado: EstadoUnidad; precio?: number | null }>>

export type PuntoDeInteres = {
  clave: string
  etiqueta: string
  x: number
  y: number
  amenity?: string | null
  recorrido?: string | null
}
