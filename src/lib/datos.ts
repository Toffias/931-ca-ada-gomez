import 'server-only'

import config from '@payload-config'
import { getPayload } from 'payload'
import { cache } from 'react'

import type { ConfigVisor, UnidadVisor } from '@/components/visor/tipos'
import type {
  Amenity,
  Articulo as ArticuloDoc,
  Autor as AutorDoc,
  AvanceDeObra,
  Edificio,
  Media,
  Recorrido,
  Tipologia as TipologiaDoc,
  Unidad as UnidadDoc,
} from '@/payload-types'

import { idiomaActual } from './idioma-servidor'
import { indiceDe, minutosDeLectura } from './lexical'
import type { Articulo, Disponibilidad, Imagen, Nivel, Proyecto, RecorridoRef, Seccion, Tipologia, Torre, Unidad } from './tipos'

const esDoc = <T extends object>(m: unknown): m is T => !!m && typeof m === 'object'
const urlDe = (m: unknown) => (esDoc<Media>(m) && 'url' in m ? (m.url ?? null) : null)

export function imagen(m: unknown, epigrafe?: string | null): Imagen | null {
  if (!esDoc<Media>(m) || !m.url) return null
  return {
    url: m.url,
    chica: m.sizes?.tarjeta?.url ?? m.url,
    grande: m.sizes?.grande?.url ?? m.url,
    alt: m.alt ?? '',
    ancho: m.width,
    alto: m.height,
    epigrafe: epigrafe ?? null,
  }
}

const imagenes = (lista?: { imagen?: unknown; epigrafe?: string | null }[] | null): Imagen[] =>
  (lista ?? []).map((g) => imagen(g.imagen, g.epigrafe)).filter((i): i is Imagen => !!i)

const recorridoRef = (r: unknown): RecorridoRef | null =>
  esDoc<Recorrido>(r) && r.slug ? { slug: r.slug, nombre: r.nombre ?? r.slug } : null

export const obtenerPayload = cache(async () => getPayload({ config }))

// El contenido del admin se lee en el idioma de la página; lo que no está traducido llega en el de defecto
// (fallback, ver src/lib/localizacion.ts).

export const obtenerSitio = cache(async () => {
  const payload = await obtenerPayload()
  return payload.findGlobal({ slug: 'sitio', depth: 1, locale: await idiomaActual() })
})

export const obtenerEdificios = cache(async () => {
  const payload = await obtenerPayload()
  const res = await payload.find({ collection: 'edificios', depth: 1, limit: 50, sort: ['orden', 'nombre'], locale: await idiomaActual() })
  return res.docs
})

export const obtenerEdificio = cache(async (slug: string) => {
  const payload = await obtenerPayload()
  const res = await payload.find({ collection: 'edificios', where: { slug: { equals: slug } }, depth: 1, limit: 1, locale: await idiomaActual() })
  return res.docs[0] ?? null
})

export const obtenerUnidades = cache(async (edificioId: number | string) => {
  const payload = await obtenerPayload()
  const res = await payload.find({
    collection: 'unidades',
    where: { edificio: { equals: edificioId } },
    depth: 2,
    limit: 1000,
    sort: 'codigo',
    locale: await idiomaActual(),
  })
  return res.docs
})

const obtenerTodasLasUnidades = cache(async () => {
  const payload = await obtenerPayload()
  const res = await payload.find({ collection: 'unidades', depth: 0, limit: 5000, sort: 'codigo', locale: await idiomaActual() })
  return res.docs
})

// ---------- proyecto ----------

const SECCIONES: Seccion[] = ['disponibilidad', 'amenities', 'recorridos', 'galeria', 'video', 'obra', 'ubicacion', 'modo3d', 'blog']

export const obtenerProyecto = cache(async (): Promise<Proyecto> => {
  const s = await obtenerSitio()
  const secciones = Object.fromEntries(SECCIONES.map((k) => [k, s.secciones?.[k] ?? k !== 'obra'])) as Record<Seccion, boolean>
  return {
    nombre: s.nombre,
    eslogan: s.eslogan,
    logo: imagen(s.logo),
    favicon: imagen(s.favicon),
    acento: s.colorAcento || '#e8b56a',
    fondo: s.colorFondo || '#0e1116',
    fondoClaro: s.colorFondoClaro || '#f3f1ed',
    tema: s.tema ?? 'oscuro',
    tipografia: s.tipografia ?? 'inter',
    desarrolladora: { nombre: s.desarrolladora?.nombre, web: s.desarrolladora?.web, logo: imagen(s.desarrolladora?.logo) },
    secciones,
    contacto: {
      telefono: s.contacto?.telefono,
      whatsapp: s.contacto?.whatsapp,
      email: s.contacto?.email,
      direccion: s.contacto?.direccion,
      horario: s.contacto?.horario,
      motivos: s.contacto?.motivos ?? [],
    },
    descripcion: s.descripcion,
    legal: s.legal,
    privacidad: s.privacidad,
    brochure: urlDe(s.brochure),
  }
})

// ---------- torres y niveles ----------


function nivelesDe(e: Edificio, unidades: { piso: number; estado: string; edificio: unknown }[]): Nivel[] {
  const propias = unidades.filter((u) => (esDoc<Edificio>(u.edificio) ? u.edificio.id : u.edificio) === e.id)
  const config = new Map((e.niveles ?? []).map((n) => [n.piso, n]))
  const pisos = new Set([...propias.map((u) => u.piso), ...config.keys()])
  return [...pisos]
    .sort((a, b) => b - a)
    .map((piso) => {
      const us = propias.filter((u) => u.piso === piso)
      const c = config.get(piso)
      return {
        piso,
        nombre: c?.nombre || null,
        tipo: c?.tipo === 'especial' || (!us.length && c) ? 'especial' : 'unidades',
        total: us.length,
        disponibles: us.filter((u) => u.estado === 'disponible').length,
      }
    })
}

function aTorre(e: Edificio, unidades: { piso: number; estado: string; edificio: unknown }[]): Torre {
  return {
    id: e.id,
    slug: e.slug ?? String(e.id),
    nombre: e.nombre,
    direccion: e.direccion,
    estadoObra: e.estadoObra,
    entrega: e.entrega,
    bajada: e.bajada,
    caracteristicas: (e.caracteristicas ?? []).map((c) => c.texto).filter((t): t is string => !!t),
    portada: imagen(e.portada),
    galeria: imagenes(e.galeria),
    niveles: nivelesDe(e, unidades),
  }
}

export const obtenerTorres = cache(async (): Promise<Torre[]> => {
  const [edificios, unidades] = await Promise.all([obtenerEdificios(), obtenerTodasLasUnidades()])
  return edificios.map((e) => aTorre(e, unidades))
})

export const obtenerTorre = cache(async (slug: string) => (await obtenerTorres()).find((t) => t.slug === slug) ?? null)

// ---------- unidades ----------

/** los datos de la unidad pisan a los de su tipología; los que faltan se heredan */
export function aUnidad(u: UnidadDoc, torre: string): Unidad {
  const t = esDoc<TipologiaDoc>(u.tipologia) ? u.tipologia : null
  const edificioId = esDoc<Edificio>(u.edificio) ? u.edificio.id : u.edificio
  return {
    id: u.id,
    codigo: u.codigo,
    torre,
    torreId: edificioId,
    piso: u.piso,
    estado: u.estado,
    tipologia: t ? { codigo: t.codigo, nombre: t.nombre } : null,
    dormitorios: u.dormitorios ?? t?.dormitorios,
    banos: u.banos ?? t?.banos,
    ambientes: u.ambientes ?? t?.ambientes,
    superficieInterna: u.superficieCubierta ?? t?.superficieInterna,
    superficieBalcon: u.superficieBalcon ?? t?.superficieBalcon,
    superficieTotal: u.superficieTotal ?? t?.superficieTotal,
    orientacion: u.orientacion,
    precio: u.mostrarPrecio ? u.precio : null, // no mandar precios ocultos al navegador
    moneda: u.moneda,
    extras: t?.extras ?? [],
    recorrido: recorridoRef(t?.recorrido),
  }
}

export function aTipologia(t: TipologiaDoc): Tipologia {
  return {
    id: t.id,
    codigo: t.codigo,
    nombre: t.nombre,
    descripcion: t.descripcion,
    foto: imagen(t.foto),
    planta: imagen(t.planta),
    planta2d: imagen(t.planta2d),
    galeria: imagenes(t.galeria),
    brochure: urlDe(t.brochure),
    video: t.video,
    recorrido: recorridoRef(t.recorrido),
  }
}

export const obtenerUnidadesDeTorre = cache(async (slug: string): Promise<Unidad[]> => {
  const e = await obtenerEdificio(slug)
  if (!e) return []
  return (await obtenerUnidades(e.id)).map((u) => aUnidad(u, slug))
})

export const obtenerUnidad = cache(async (slug: string, codigo: string) => {
  const e = await obtenerEdificio(slug)
  if (!e) return null
  const docs = await obtenerUnidades(e.id)
  const doc = docs.find((u) => u.codigo.toUpperCase() === codigo.toUpperCase())
  if (!doc) return null
  const t = esDoc<TipologiaDoc>(doc.tipologia) ? doc.tipologia : null
  return { unidad: aUnidad(doc, slug), tipologia: t ? aTipologia(t) : null, planoUrl: urlDe(doc.plano) }
})

/** imagen de "Vistas" de la ficha: orientación × franja de pisos (el epígrafe se arma en el idioma de la página) */
export function vistaDeUnidad(e: Edificio, u: Unidad, epigrafe: (orientacion: string, desde: number, hasta: number) => string): Imagen | null {
  const o = (u.orientacion ?? '').toLowerCase()
  const v = (e.vistasUnidad ?? []).find(
    (x) => o.startsWith(x.orientacion.toLowerCase()) && u.piso >= x.desde && u.piso <= x.hasta,
  )
  return v ? imagen(v.imagen, epigrafe(v.orientacion, v.desde, v.hasta)) : null
}

export const obtenerDisponibilidad = cache(async (): Promise<Disponibilidad> => {
  const [edificios, unidades] = await Promise.all([obtenerEdificios(), obtenerTodasLasUnidades()])
  const slugDe = new Map(edificios.map((e) => [e.id, e.slug ?? String(e.id)]))
  const r: Disponibilidad = {}
  for (const u of unidades) {
    const torre = slugDe.get(esDoc<Edificio>(u.edificio) ? u.edificio.id : (u.edificio as number))
    if (!torre) continue
    ;(r[torre] ??= {})[u.codigo] = { estado: u.estado, precio: u.mostrarPrecio ? u.precio : null }
  }
  return r
})

// ---------- contenido ----------

export const obtenerAmenities = cache(async () => {
  const payload = await obtenerPayload()
  const res = await payload.find({ collection: 'amenities', depth: 1, limit: 100, sort: 'orden', locale: await idiomaActual() })
  return res.docs.map((a: Amenity) => ({
    slug: a.slug ?? String(a.id),
    nombre: a.nombre ?? a.slug ?? '',
    descripcion: a.descripcion,
    imagenes: imagenes(a.imagenes),
    recorrido: recorridoRef(a.recorrido),
  }))
})

export const obtenerRecorridos = cache(async () => {
  const payload = await obtenerPayload()
  const res = await payload.find({ collection: 'recorridos', depth: 1, limit: 100, sort: 'orden', locale: await idiomaActual() })
  return res.docs.map((r: Recorrido) => ({
    slug: r.slug ?? String(r.id),
    nombre: r.nombre ?? r.slug ?? '',
    tipo: r.tipo ?? 'propio',
    url: r.url,
    plano: imagen(r.plano),
    puntos: (r.puntos ?? [])
      .map((p) => ({
        clave: p.clave,
        titulo: p.titulo ?? p.clave,
        rumbo: p.rumbo ?? 0,
        panorama: urlDe(p.panorama),
        x: p.x,
        y: p.y,
        enlaces: p.enlaces ?? [],
      }))
      .filter((p) => p.panorama),
  }))
})

export const obtenerAvancesDeObra = cache(async () => {
  const payload = await obtenerPayload()
  const res = await payload.find({ collection: 'avances-de-obra', depth: 1, limit: 200, sort: '-fecha', locale: await idiomaActual() })
  return res.docs.map((a: AvanceDeObra) => ({
    id: a.id,
    titulo: a.titulo ?? '',
    fecha: a.fecha,
    texto: a.texto,
    fotos: imagenes(a.fotos),
  }))
})

// sólo lo publicado: los borradores quedan en el admin
const aArticulo = (a: ArticuloDoc): Articulo => {
  const autor = esDoc<AutorDoc>(a.autor) ? a.autor : null
  const preguntas = (a.preguntas ?? [])
    .filter((p) => p.pregunta && p.respuesta)
    .map((p) => ({ pregunta: p.pregunta!, respuesta: p.respuesta! }))
  return {
    id: a.id,
    slug: a.slug ?? String(a.id),
    titulo: a.titulo ?? '',
    categoria: a.categoria,
    resumen: a.resumen,
    fecha: a.fecha,
    actualizado: a.updatedAt,
    autor: autor
      ? {
          nombre: autor.nombre,
          cargo: autor.cargo,
          bio: autor.bio,
          foto: imagen(autor.foto),
          perfiles: (autor.perfiles ?? []).map((p) => p.url).filter(Boolean),
        }
      : null,
    portada: imagen(a.portada),
    contenido: a.contenido,
    indice: indiceDe(a.contenido),
    minutos: minutosDeLectura(a.contenido, a.resumen, ...preguntas.flatMap((p) => [p.pregunta, p.respuesta])),
    preguntas,
    seo: { titulo: a.seo?.titulo, descripcion: a.seo?.descripcion },
  }
}

export const obtenerArticulos = cache(async (): Promise<Articulo[]> => {
  const payload = await obtenerPayload()
  const res = await payload.find({
    collection: 'articulos',
    where: { _status: { equals: 'published' } },
    depth: 2, // autor y su foto
    limit: 500,
    sort: '-fecha',
    locale: await idiomaActual(),
  })
  return res.docs.map(aArticulo)
})

export const obtenerArticulo = cache(async (slug: string) => (await obtenerArticulos()).find((a) => a.slug === slug) ?? null)

// ---------- visor 3D ----------

/** Convierte los documentos de Payload en props serializables para el visor. */
export function aConfigVisor(e: Edificio): ConfigVisor {
  const c = e.config3D ?? {}
  const v = c.ventanasNoche ?? {}
  return {
    edificioId: e.id,
    nombre: e.nombre,
    modeloUrl: urlDe(e.modelo3D) ?? '',
    portadaUrl: urlDe(e.portada),
    escala: c.escala ?? 1,
    texturas: c.texturasRealistas ?? true,
    solElevacion: c.solElevacion ?? 30,
    solAzimut: c.solAzimut ?? -20,
    ventanasNoche: {
      material: v.material ?? 'WEB_Vidrio',
      alturaPrimerPiso: v.alturaPrimerPiso ?? 3,
      alturaPiso: v.alturaPiso ?? 3,
      anchoVentana: v.anchoVentana ?? 1.5,
      encendidas: v.encendidas ?? 58,
    },
    vistas: (c.vistas ?? []).map((x) => ({ camara: x.camara, etiqueta: x.etiqueta || x.camara, alturaObjetivo: x.alturaObjetivo ?? null })),
  }
}

export function aUnidadVisor(u: UnidadDoc): UnidadVisor {
  const p = aUnidad(u, '')
  return {
    id: u.id,
    codigo: u.codigo,
    piso: u.piso,
    estado: u.estado,
    tipologia: p.tipologia ? (p.tipologia.nombre ?? p.tipologia.codigo) : null,
    dormitorios: p.dormitorios,
    banos: p.banos,
    superficieCubierta: p.superficieInterna,
    superficieTotal: p.superficieTotal,
    orientacion: u.orientacion,
    precio: p.precio,
    moneda: u.moneda,
    mostrarPrecio: u.mostrarPrecio,
    planoUrl: urlDe(u.plano),
  }
}
