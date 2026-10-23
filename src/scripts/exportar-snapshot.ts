/**
 * Guarda una foto del contenido actual (lo cargado en el admin + los scripts de renders) en `snapshot/`:
 * `datos.json` con todos los documentos y el global (en el idioma por defecto, más `traducciones` con lo cargado en
 * los otros), y `media/` con los archivos originales.
 * `pnpm seed:snapshot` la vuelve a cargar en otra base (ej. Postgres de producción).
 *
 *   pnpm exportar:snapshot
 *
 * No exporta usuarios (el admin sale de SEED_ADMIN_* en el destino) ni consultas (son leads de prueba).
 */
import config from '@payload-config'
import fs from 'fs'
import path from 'path'
import { getPayload } from 'payload'

import { IDIOMA_DEFECTO, IDIOMAS } from '../lib/idiomas'
import { COLECCIONES_SNAPSHOT, DIR_SNAPSHOT } from '../seed/snapshot-comun'

const payload = await getPayload({ config })
const dirMedia = path.join(DIR_SNAPSHOT, 'media')
fs.rmSync(DIR_SNAPSHOT, { recursive: true, force: true })
fs.mkdirSync(dirMedia, { recursive: true })

const colecciones: Record<string, unknown[]> = {}
for (const slug of COLECCIONES_SNAPSHOT) {
  const { docs } = await payload.find({ collection: slug, depth: 0, pagination: false, sort: 'id', overrideAccess: true })
  colecciones[slug] = docs
  console.log(`${slug}: ${docs.length}`)
}

// el original y sus tamaños (tarjeta, grande): Payload los re-codificaría distinto al subirlos
const origen = path.resolve(process.cwd(), payload.collections.media.config.upload.staticDir || 'media')
let bytes = 0
for (const m of colecciones.media as { filename?: string; sizes?: Record<string, { filename?: string | null }> }[]) {
  if (!m.filename) continue
  const archivo = path.join(origen, m.filename)
  if (!fs.existsSync(archivo)) throw new Error(`Falta el archivo ${archivo}`)
  const tamaños = Object.values(m.sizes ?? {}).map((t) => t?.filename).filter((f): f is string => !!f)
  for (const f of [m.filename, ...tamaños]) {
    if (!fs.existsSync(path.join(origen, f))) continue
    fs.copyFileSync(path.join(origen, f), path.join(dirMedia, f))
    bytes += fs.statSync(path.join(origen, f)).size
  }
}

const sitio = await payload.findGlobal({ slug: 'sitio', depth: 0, overrideAccess: true })

// lo cargado en los otros idiomas, sin fallback (lo que no se tradujo queda vacío)
const traducciones: Record<string, { colecciones: Record<string, unknown[]>; sitio: unknown }> = {}
for (const idioma of IDIOMAS.filter((i) => i !== IDIOMA_DEFECTO)) {
  const deIdioma: Record<string, unknown[]> = {}
  for (const slug of COLECCIONES_SNAPSHOT) {
    const opciones = { depth: 0, pagination: false, sort: 'id', overrideAccess: true, locale: idioma, fallbackLocale: false } as const
    deIdioma[slug] = (await payload.find({ collection: slug, ...opciones })).docs
  }
  const sitioIdioma = await payload.findGlobal({ slug: 'sitio', depth: 0, overrideAccess: true, locale: idioma, fallbackLocale: false })
  traducciones[idioma] = { colecciones: deIdioma, sitio: sitioIdioma }
}

fs.writeFileSync(
  path.join(DIR_SNAPSHOT, 'datos.json'),
  JSON.stringify({ exportado: new Date().toISOString(), colecciones, sitio, traducciones }, null, 1),
)
console.log(`Snapshot en ${DIR_SNAPSHOT} (${(bytes / 1e6).toFixed(1)} MB de archivos)`)
process.exit(0)
