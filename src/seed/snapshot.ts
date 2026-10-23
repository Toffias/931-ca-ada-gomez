/**
 * Carga `snapshot/` (armado con `pnpm exportar:snapshot`) en la base de DATABASE_URL, para dejar un servidor
 * igual al entorno donde se exportó. Los ids cambian: las relaciones se reasignan solas.
 *
 *   pnpm seed:snapshot         → sólo si no hay contenido (no pisa nada)
 *   pnpm seed:snapshot fresh   → borra el contenido (no los usuarios) y carga el snapshot
 *
 * El admin se crea desde SEED_ADMIN_EMAIL / SEED_ADMIN_PASSWORD si no existe.
 */
import config from '@payload-config'
import fs from 'fs'
import path from 'path'
import { getPayload } from 'payload'
import type { CollectionSlug } from 'payload'

import { esIdioma } from '../lib/idiomas'
import { COLECCIONES_SNAPSHOT, DIR_SNAPSHOT, reasignarIds, type TablaIds } from './snapshot-comun'

type Doc = Record<string, unknown> & { id: string | number }
type Tamaño = { filename?: string | null; filesize?: number | null } | null

// campos que arma Payload solo (al subir el archivo o al crear)
const DERIVADOS = ['id', 'createdAt', 'updatedAt', 'sizes', 'url', 'thumbnailURL', 'filename', 'mimeType', 'filesize', 'width', 'height']
const limpiar = (doc: Doc) => Object.fromEntries(Object.entries(doc).filter(([k]) => !DERIVADOS.includes(k)))

const payload = await getPayload({ config })
const fresh = process.argv.includes('fresh')
const { colecciones, sitio, traducciones } = JSON.parse(fs.readFileSync(path.join(DIR_SNAPSHOT, 'datos.json'), 'utf8')) as {
  colecciones: Record<string, Doc[]>
  sitio: Doc
  /** snapshots viejos no la traen */
  traducciones?: Record<string, { colecciones: Record<string, Doc[]>; sitio: Doc }>
}

const hayContenido = (await payload.count({ collection: 'edificios', overrideAccess: true })).totalDocs > 0
if (hayContenido && !fresh) {
  console.log('La base ya tiene contenido; usá "pnpm seed:snapshot fresh" para reemplazarlo.')
  process.exit(0)
}
if (fresh) {
  for (const slug of ['consultas', ...[...COLECCIONES_SNAPSHOT].reverse()] as CollectionSlug[]) {
    await payload.delete({ collection: slug, where: { id: { exists: true } }, overrideAccess: true })
  }
}

const email = process.env.SEED_ADMIN_EMAIL
const password = process.env.SEED_ADMIN_PASSWORD
if (email && password) {
  const { totalDocs } = await payload.count({ collection: 'users', where: { email: { equals: email } } })
  if (!totalDocs) await payload.create({ collection: 'users', data: { email, password, nombre: 'Admin' } })
}

const tabla: TablaIds = Object.fromEntries(COLECCIONES_SNAPSHOT.map((s) => [s, new Map()]))
const pendientes: { slug: CollectionSlug; viejo: Doc }[] = []
const dirMedia = path.resolve(process.cwd(), payload.collections.media.config.upload.staticDir || 'media')
const camposDe =(slug: CollectionSlug) => payload.collections[slug].config.fields

for (const slug of COLECCIONES_SNAPSHOT) {
  for (const viejo of colecciones[slug] ?? []) {
    const estado = { pendiente: false }
    const data = reasignarIds(camposDe(slug), limpiar(viejo), tabla, estado)
    const filePath = slug === 'media' ? path.join(DIR_SNAPSHOT, 'media', String(viejo.filename)) : undefined
    const nuevo = await payload.create({ collection: slug, data: data as never, filePath, overrideAccess: true })
    tabla[slug].set(viejo.id, nuevo.id)
    // Payload re-codifica las imágenes al subirlas: se pisan con los archivos exportados para que queden iguales
    if (filePath && 'filename' in nuevo && nuevo.filename) {
      fs.copyFileSync(filePath, path.join(dirMedia, nuevo.filename))
      const sizes: Record<string, { filesize?: number | null }> = {}
      for (const [nombre, t] of Object.entries((viejo.sizes ?? {}) as Record<string, Tamaño>)) {
        const destino = nuevo.sizes?.[nombre as keyof typeof nuevo.sizes]?.filename
        const origen = t?.filename && path.join(DIR_SNAPSHOT, 'media', t.filename)
        if (!destino || !origen || !fs.existsSync(origen)) continue
        fs.copyFileSync(origen, path.join(dirMedia, destino))
        sizes[nombre] = { filesize: t.filesize }
      }
      await payload.db.updateOne({ collection: 'media', id: nuevo.id, data: { filesize: viejo.filesize, sizes } })
    }
    if (estado.pendiente) pendientes.push({ slug, viejo })
  }
  console.log(`${slug}: ${colecciones[slug]?.length ?? 0}`)
}

// segunda pasada: relaciones a documentos que se crearon después (ciclos)
for (const { slug, viejo } of pendientes) {
  const estado = { pendiente: false }
  const data = reasignarIds(camposDe(slug), limpiar(viejo), tabla, estado)
  if (estado.pendiente) console.warn(`${slug} ${viejo.id}: apunta a algo que no está en el snapshot`)
  await payload.update({ collection: slug, id: tabla[slug].get(viejo.id)!, data: data as never, overrideAccess: true })
}

const camposSitio = payload.globals.config.find((g) => g.slug === 'sitio')!.fields
await payload.updateGlobal({ slug: 'sitio', data: reasignarIds(camposSitio, limpiar(sitio), tabla) as never, overrideAccess: true })

// los otros idiomas, encima de lo ya creado (las filas de los arrays conservan su id, así cada traducción cae en su fila)
for (const [idioma, t] of Object.entries(traducciones ?? {})) {
  if (!esIdioma(idioma)) continue
  for (const slug of COLECCIONES_SNAPSHOT) {
    for (const viejo of t.colecciones[slug] ?? []) {
      const id = tabla[slug].get(viejo.id)
      if (id === undefined) continue
      const data = reasignarIds(camposDe(slug), limpiar(viejo), tabla)
      await payload.update({ collection: slug, id, locale: idioma, data: data as never, overrideAccess: true })
    }
  }
  await payload.updateGlobal({
    slug: 'sitio',
    locale: idioma,
    data: reasignarIds(camposSitio, limpiar(t.sitio), tabla) as never,
    overrideAccess: true,
  })
  console.log(`traducción ${idioma} cargada`)
}

console.log('Snapshot cargado.')
process.exit(0)
