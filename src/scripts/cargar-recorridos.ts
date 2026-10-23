/**
 * Carga en Payload un recorrido 360 que genera scripts/blender/renders_recorrido.py (docs/renders-recorrido.md):
 * sube las panorámicas y el plano a Media y completa Recorridos 360 → Puntos. Opcionalmente lo asigna a tipologías.
 *
 *   pnpm cargar:recorridos <carpeta con recorrido.json> [<slug de la torre> <tipologías A1,A2>] [solo-datos] [borrar-anteriores]
 *
 * El recorrido se busca por slug (el nombre del recorrido en Blender) y se crea si no existe. Un punto se reconoce
 * por su clave: si ya existe se le reemplazan panorámica, rumbo, posición y enlaces, y se le deja el título que tenga
 * en el admin; si no, se agrega. Quedan en el orden de recorrido.json (el primero es donde arranca) y después los que
 * no están en él, como estaban.
 * Con solo-datos no se suben imágenes (sólo rumbo, posición y enlaces). Los archivos reemplazados quedan en Media
 * salvo con borrar-anteriores.
 * Las opciones van como palabras sueltas: `payload run` sólo pasa argumentos posicionales (no `--banderas`).
 */
import config from '@payload-config'
import fs from 'fs'
import path from 'path'
import { getPayload } from 'payload'

import type { Recorrido } from '../payload-types'

type Manifest = {
  recorrido: string
  nombre: string
  unidad: string
  plano: string | null
  ancho: number
  alto: number
  puntos: { clave: string; titulo: string; rumbo: number; panorama: string; x: number; y: number; enlaces: string[] }[]
}

type Punto = NonNullable<Recorrido['puntos']>[number]

const idDe = (v: unknown): number | null =>
  v && typeof v === 'object' && 'id' in v ? (v as { id: number }).id : ((v as number | null) ?? null)

async function main() {
  const OPCIONES = ['solo-datos', 'borrar-anteriores']
  const args = process.argv.slice(2)
  const opcion = (o: string) => args.includes(o)
  const [carpeta, slugTorre, codigos] = args.filter((a) => !OPCIONES.includes(a))
  if (!carpeta) throw new Error('Uso: pnpm cargar:recorridos <carpeta con recorrido.json> [<slug de la torre> <tipologías A1,A2>]')
  if (slugTorre && !codigos) throw new Error('Con la torre van también las tipologías: <slug de la torre> A1,A2')
  const manifest: Manifest = JSON.parse(fs.readFileSync(path.join(carpeta, 'recorrido.json'), 'utf8'))

  const payload = await getPayload({ config })
  const log = (m: string) => payload.logger.info(`[recorridos] ${m}`)
  const subir = (archivo: string, alt: string) =>
    payload.create({ collection: 'media', data: { alt }, filePath: path.join(carpeta, archivo) })
  const existe = (archivo: string) => fs.existsSync(path.join(carpeta, archivo))

  const { docs } = await payload.find({ collection: 'recorridos', where: { slug: { equals: manifest.recorrido } }, limit: 1, depth: 0 })
  const previo = docs[0]
  const anteriores: Punto[] = [...(previo?.puntos ?? [])]
  const puntos: Punto[] = []
  const reemplazados: number[] = []

  for (const p of manifest.puntos) {
    const i = anteriores.findIndex((x) => x.clave === p.clave)
    const geometria = { rumbo: p.rumbo, x: p.x, y: p.y, enlaces: p.enlaces }
    const subirPanorama = !opcion('solo-datos') && existe(p.panorama)
    if (i < 0 && !subirPanorama) {
      log(`${p.clave}: no está cargado y no hay panorámica (${p.panorama}), se saltea`)
      continue
    }
    const panorama = subirPanorama ? await subir(p.panorama, `${manifest.nombre} · ${p.titulo} (360°)`) : null
    if (i >= 0) {
      const [anterior] = anteriores.splice(i, 1)
      const viejo = idDe(anterior.panorama)
      if (panorama && viejo) reemplazados.push(viejo)
      puntos.push({ ...anterior, ...geometria, ...(panorama ? { panorama: panorama.id } : {}) })
    } else if (panorama) {
      puntos.push({ clave: p.clave, titulo: p.titulo, panorama: panorama.id, ...geometria })
    }
    log(`${p.clave}: rumbo ${p.rumbo}° → ${p.enlaces.join(', ') || '—'}${panorama ? '' : ' (sin panorámica nueva)'}`)
  }

  puntos.push(...anteriores)

  let plano = idDe(previo?.plano)
  if (manifest.plano && !opcion('solo-datos') && existe(manifest.plano)) {
    if (plano) reemplazados.push(plano)
    plano = (await subir(manifest.plano, `Plano del recorrido · ${manifest.nombre}`)).id
  }

  const datos = { puntos, plano: plano ?? undefined }
  const recorrido: Recorrido = previo
    ? await payload.update({ collection: 'recorridos', id: previo.id, data: datos })
    : await payload.create({ collection: 'recorridos', data: { nombre: manifest.nombre, slug: manifest.recorrido, tipo: 'propio', ...datos } })
  log(`${previo ? 'Actualizado' : 'Creado'} "${recorrido.nombre}" (${recorrido.slug}): ${puntos.length} punto(s)`)

  if (slugTorre) {
    const torres = await payload.find({ collection: 'edificios', where: { slug: { equals: slugTorre } }, limit: 1, depth: 0 })
    const torre = torres.docs[0]
    if (!torre) throw new Error(`No existe la torre "${slugTorre}"`)
    for (const codigo of codigos.split(',').map((c) => c.trim()).filter(Boolean)) {
      const { docs: tipologias } = await payload.find({
        collection: 'tipologias',
        where: { and: [{ edificio: { equals: torre.id } }, { codigo: { equals: codigo } }] },
        limit: 1,
        depth: 0,
      })
      const t = tipologias[0]
      if (!t) {
        log(`tipología ${codigo}: no existe en ${torre.nombre}`)
        continue
      }
      const antes = idDe(t.recorrido)
      await payload.update({ collection: 'tipologias', id: t.id, data: { recorrido: recorrido.id } })
      log(`tipología ${codigo}: recorrido asignado${antes && antes !== recorrido.id ? ' (reemplaza al que tenía)' : ''}`)
    }
  }

  if (opcion('borrar-anteriores')) {
    for (const id of reemplazados) await payload.delete({ collection: 'media', id }).catch(() => null)
  } else if (reemplazados.length) {
    log(`${reemplazados.length} archivo(s) anteriores quedan en Media (borrar-anteriores para borrarlos)`)
  }
  process.exit(0)
}

// top-level await: `payload run` termina el proceso apenas se importa el archivo
try {
  await main()
} catch (err) {
  console.error(err)
  process.exit(1)
}
