import 'server-only'

import fs from 'fs/promises'
import path from 'path'
import { cache } from 'react'

import type { Edificio, Media } from '@/payload-types'

import { imagen, obtenerEdificio, obtenerEdificios, obtenerSitio } from './datos'
import { leerMascara } from './escena/mascara'
import type { Escena, FormaEscena } from './escena/tipos'
import { carasConUnidades, esquemaFachada, type Orientacion } from './esquemas/fachada'
import { leerJSONGLTF, objetosDelModelo, type ObjetoModelo } from './esquemas/modelo'
import { esquemaPlanta } from './esquemas/planta'
import { slugify } from './slugify'
import type { Imagen, PuntoDeInteres } from './tipos'

// Arma lo que muestra VisorEscena en cada pantalla. Orden de preferencia para cada vista:
// 1) render + máscara SVG subidos al admin (lo que va a producir el pipeline de Blender);
// 2) esquema generado desde el modelo 3D (.glb) de la torre.
// Acá no hay textos fijos: cuando el admin no puso etiqueta, la pantalla arma una según el idioma (lib/etiquetas).

const esMedia = (m: unknown): m is Media => !!m && typeof m === 'object' && 'filename' in m

/** lee un archivo de Media del disco (dev / servidor propio) o, si no está, por HTTP (storage externo) */
async function leerMedia(m: Media): Promise<Buffer | null> {
  if (m.filename) {
    try {
      return await fs.readFile(path.resolve(process.cwd(), 'media', m.filename))
    } catch {
      /* no está en disco */
    }
  }
  if (!m.url) return null
  const base = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'
  try {
    const r = await fetch(new URL(m.url, base))
    return r.ok ? Buffer.from(await r.arrayBuffer()) : null
  } catch {
    return null
  }
}

// el .glb sólo cambia al re-exportar: se cachea en memoria por archivo + fecha
const cacheModelos = new Map<string, Promise<ObjetoModelo[] | null>>()
function objetosDe(e: Edificio): Promise<ObjetoModelo[] | null> {
  const m = e.modelo3D
  if (!esMedia(m)) return Promise.resolve(null)
  const clave = `${m.filename}@${m.updatedAt}`
  if (!cacheModelos.has(clave)) {
    cacheModelos.set(
      clave,
      leerMedia(m).then((buf) => {
        if (!buf) return null
        try {
          return objetosDelModelo(leerJSONGLTF(buf))
        } catch (err) {
          console.error('[escenas] no se pudo leer el modelo', m.filename, err)
          return null
        }
      }),
    )
  }
  return cacheModelos.get(clave)!
}

const mascaraDe = cache(async (m: unknown) => {
  if (!esMedia(m)) return null
  const buf = await leerMedia(m)
  return buf ? leerMascara(buf.toString('utf8')) : null
})

const escalaDe = (e: Edificio) => e.config3D?.escala ?? 1

// ---------- plantas ----------

export type EscenaNivel = { escena: Escena | null; pois: PuntoDeInteres[] }

export const escenaNivel = cache(async (slug: string, piso: number): Promise<EscenaNivel> => {
  const e = await obtenerEdificio(slug)
  if (!e) return { escena: null, pois: [] }
  const nivel = (e.niveles ?? []).find((n) => n.piso === piso)
  const pois: PuntoDeInteres[] = (nivel?.pois ?? []).map((p, i) => ({
    clave: p.id ?? String(i),
    etiqueta: p.etiqueta ?? '',
    x: p.x,
    y: p.y,
    amenity: typeof p.amenity === 'object' ? p.amenity?.slug : null,
    recorrido: typeof p.recorrido === 'object' ? p.recorrido?.slug : null,
  }))

  // dos renders por nivel (realista y blanco, misma cámara y máscara): el admin elige cuál va
  const [elegido, otro] = e.fondoPlantas === 'blanco' ? [nivel?.cenitalBlanco, nivel?.cenital] : [nivel?.cenital, nivel?.cenitalBlanco]
  const cenital = imagen(elegido) ?? imagen(otro)
  const mascara = await mascaraDe(nivel?.mascara)
  // un render sin máscara sólo sirve si el nivel no tiene unidades (los POI van en %)
  if (cenital && (mascara || nivel?.tipo === 'especial')) {
    return {
      escena: {
        ancho: mascara?.ancho ?? cenital.ancho ?? 1000,
        alto: mascara?.alto ?? cenital.alto ?? 1000,
        fondo: { url: cenital.grande, alt: cenital.alt },
        formas: mascara?.formas.filter((f) => f.tipo === 'unidad') ?? [],
      },
      pois,
    }
  }

  const objetos = await objetosDe(e)
  return { escena: objetos ? esquemaPlanta(objetos, piso, escalaDe(e)) : null, pois }
})

// ---------- disponibilidad en fachada ----------

export type VistaFachada = {
  clave: string
  /** la del admin (vistas del Giro con máscara) */
  etiqueta?: string | null
  /** número de vista del Giro, para "Vista 2" si no tiene etiqueta */
  n?: number
  /** fachada esquemática: cara de la torre y, si hay varias torres, su nombre */
  orientacion?: Orientacion
  torreNombre?: string
  torre?: string
  /** posición en Edificio → Disponibilidad → Vistas (render de Blender + máscara) */
  render?: number
}

const conUnidades = async (m: unknown) => !!(await mascaraDe(m))?.formas.some((f) => f.tipo === 'unidad')

/**
 * vistas de fachada: las del Giro con máscara de unidades (muestran todas las torres juntas); si no hay, por torre
 * sus tomas de Disponibilidad (renders_fachadas.py) o, sin tomas, un esquema por cara con unidades
 */
export const vistasFachada = cache(async (): Promise<VistaFachada[]> => {
  const sitio = await obtenerSitio()
  const conMascara: VistaFachada[] = []
  for (const [i, v] of (sitio.giro ?? []).entries()) {
    const m = await mascaraDe(v.mascara)
    if (m?.formas.some((f) => f.tipo === 'unidad')) conMascara.push({ clave: String(i), etiqueta: v.etiqueta, n: i + 1 })
  }
  if (conMascara.length) return conMascara

  const edificios = await obtenerEdificios()
  const r: VistaFachada[] = []
  for (const e of edificios) {
    const torreNombre = edificios.length > 1 ? e.nombre : undefined
    const tomas: VistaFachada[] = []
    for (const [i, v] of (e.vistasDisponibilidad ?? []).entries()) {
      if (!imagen(v.imagen) || !(await conUnidades(v.mascara))) continue
      // la clave va en la URL: /disponibilidad/torre-cityh-noreste
      const propia = `${e.slug}-${slugify(v.etiqueta ?? '') || i + 1}`
      const clave = tomas.some((t) => t.clave === propia) ? `${propia}-${i + 1}` : propia
      tomas.push({ clave, etiqueta: v.etiqueta, n: i + 1, torreNombre, torre: e.slug ?? undefined, render: i })
    }
    if (tomas.length) {
      r.push(...tomas)
      continue
    }
    const objetos = await objetosDe(e)
    if (!objetos) continue
    for (const o of carasConUnidades(objetos))
      r.push({
        clave: `${e.slug}-${o}`,
        orientacion: o,
        torreNombre,
        torre: e.slug ?? undefined,
      })
  }
  return r
})

export const escenaFachada = cache(async (clave: string): Promise<{ escena: Escena; torre?: string } | null> => {
  const vista = (await vistasFachada()).find((v) => v.clave === clave)
  if (!vista) return null

  if (!vista.torre) {
    const sitio = await obtenerSitio()
    const v = sitio.giro?.[Number(clave)]
    const img = imagen(v?.imagen)
    const m = await mascaraDe(v?.mascara)
    if (!img || !m) return null
    return { escena: { ancho: m.ancho, alto: m.alto, fondo: { url: img.grande, alt: img.alt }, formas: m.formas } }
  }

  const e = await obtenerEdificio(vista.torre)
  if (e && vista.render != null) {
    const v = e.vistasDisponibilidad?.[vista.render]
    const img = imagen(v?.imagen)
    const m = await mascaraDe(v?.mascara)
    if (!img || !m) return null
    const formas = m.formas.filter((f) => f.tipo === 'unidad').map((f) => ({ ...f, torre: vista.torre }))
    return { escena: { ancho: m.ancho, alto: m.alto, fondo: { url: img.grande, alt: img.alt }, formas }, torre: vista.torre }
  }
  const objetos = e ? await objetosDe(e) : null
  if (!e || !objetos) return null
  const orientacion = clave.slice(vista.torre.length + 1) as Orientacion
  const escena = esquemaFachada(objetos, orientacion, escalaDe(e))
  return { escena: { ...escena, formas: escena.formas.map((f) => ({ ...f, torre: vista.torre })) }, torre: vista.torre }
})

// ---------- giro 360 ----------

export type VistaGiro = {
  /** la del admin o el epígrafe; si no hay, "Vista N" según el idioma */
  etiqueta?: string | null
  imagen: Imagen
  /** siluetas de torres (y unidades, si la máscara las trae) en el viewBox del render */
  escena: Escena
  videoSiguiente?: string | null
  videoAnterior?: string | null
}

const urlVideo = (m: unknown) => (esMedia(m) ? m.url : null)

export const vistasGiro = cache(async (): Promise<VistaGiro[]> => {
  const sitio = await obtenerSitio()
  const propias = await Promise.all(
    (sitio.giro ?? []).map(async (v, i): Promise<VistaGiro | null> => {
      const img = imagen(v.imagen)
      if (!img) return null
      const m = await mascaraDe(v.mascara)
      const formas: FormaEscena[] = m?.formas.filter((f) => f.tipo === 'torre') ?? []
      return {
        etiqueta: v.etiqueta,
        imagen: img,
        escena: { ancho: m?.ancho ?? img.ancho ?? 1920, alto: m?.alto ?? img.alto ?? 1080, fondo: { url: img.grande, alt: img.alt }, formas },
        videoSiguiente: urlVideo(v.videoSiguiente),
        videoAnterior: urlVideo(v.videoAnterior),
      }
    }),
  )
  const r = propias.filter((v): v is VistaGiro => !!v)
  if (r.length) return r

  // sin renders del giro todavía: portada y galería de cada torre, sin máscaras ni transiciones
  const edificios = await obtenerEdificios()
  return edificios
    .flatMap((e) => [imagen(e.portada, e.nombre), ...(e.galeria ?? []).map((g) => imagen(g.imagen, g.epigrafe))])
    .filter((i): i is Imagen => !!i)
    .slice(0, 4)
    .map((img, i) => ({
      etiqueta: img.epigrafe,
      imagen: img,
      escena: { ancho: img.ancho ?? 1920, alto: img.alto ?? 1080, fondo: { url: img.grande, alt: img.alt }, formas: [] },
    }))
})
