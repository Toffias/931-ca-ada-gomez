/**
 * Carga en Payload las tomas de disponibilidad que genera scripts/blender/renders_fachadas.py
 * (docs/renders-fachadas.md): sube cada render y su máscara SVG a Media y completa
 * Edificio → Disponibilidad → Vistas, en el orden de fachadas.json.
 *
 *   pnpm cargar:fachadas <carpeta con fachadas.json> <slug de la torre> [solo-mascaras] [borrar-anteriores]
 *
 * Una vista se reconoce por su etiqueta: si ya existe, se le reemplazan render y máscara (con solo-mascaras,
 * sólo la máscara); si no, se agrega. Las vistas que no están en fachadas.json quedan como estaban. Los archivos
 * anteriores quedan en Media salvo con borrar-anteriores.
 * Las opciones van como palabras sueltas: `payload run` sólo pasa argumentos posicionales (no `--banderas`).
 */
import config from '@payload-config'
import fs from 'fs'
import path from 'path'
import { getPayload } from 'payload'

type Manifest = {
  ancho: number
  alto: number
  vistas: { camara: string; etiqueta: string; imagen: string; mascara: string; unidades: string[] }[]
}

const idDe = (v: unknown): number | string | null =>
  v && typeof v === 'object' && 'id' in v ? (v as { id: number | string }).id : ((v as number | string | null) ?? null)

async function main() {
  const OPCIONES = ['solo-mascaras', 'borrar-anteriores']
  const args = process.argv.slice(2)
  const opcion = (o: string) => args.includes(o)
  const [carpeta, slug] = args.filter((a) => !OPCIONES.includes(a))
  if (!carpeta || !slug) throw new Error('Uso: pnpm cargar:fachadas <carpeta con fachadas.json> <slug de la torre>')
  const manifest: Manifest = JSON.parse(fs.readFileSync(path.join(carpeta, 'fachadas.json'), 'utf8'))

  const payload = await getPayload({ config })
  const log = (m: string) => payload.logger.info(`[fachadas] ${m}`)
  const { docs } = await payload.find({ collection: 'edificios', where: { slug: { equals: slug } }, limit: 1, depth: 0 })
  const edificio = docs[0]
  if (!edificio) throw new Error(`No existe la torre "${slug}"`)

  const unidades = await payload.find({ collection: 'unidades', where: { edificio: { equals: edificio.id } }, limit: 1000, depth: 0 })
  const codigos = new Set(unidades.docs.map((u) => u.codigo.toUpperCase()))

  const vistas = [...(edificio.vistasDisponibilidad ?? [])]
  const reemplazados: (number | string)[] = []
  const subir = (archivo: string, alt: string) =>
    payload.create({ collection: 'media', data: { alt }, filePath: path.join(carpeta, archivo) })

  for (const v of manifest.vistas) {
    const faltan = v.unidades.filter((c) => !codigos.has(c.toUpperCase()))
    if (faltan.length) log(`${v.etiqueta}: sin unidad en Payload para ${faltan.join(', ')}`)
    const i = vistas.findIndex((x) => x.etiqueta === v.etiqueta)
    if (opcion('solo-mascaras') && i < 0) {
      log(`${v.etiqueta}: no está cargada, se saltea (solo-mascaras)`)
      continue
    }
    const render = opcion('solo-mascaras') ? null : await subir(v.imagen, `${edificio.nombre} · vista ${v.etiqueta}`)
    const mascara = await subir(v.mascara, `Máscara de unidades · vista ${v.etiqueta}`)
    if (i >= 0) {
      for (const viejo of (render ? [vistas[i].imagen, vistas[i].mascara] : [vistas[i].mascara]).map(idDe))
        if (viejo) reemplazados.push(viejo)
      vistas[i] = { ...vistas[i], ...(render ? { imagen: render.id } : {}), mascara: mascara.id }
    } else if (render) {
      vistas.push({ etiqueta: v.etiqueta, imagen: render.id, mascara: mascara.id })
    }
    log(`${v.etiqueta}: ${v.unidades.length} unidad(es)`)
  }

  await payload.update({ collection: 'edificios', id: edificio.id, data: { vistasDisponibilidad: vistas } })
  if (opcion('borrar-anteriores')) {
    for (const id of reemplazados) await payload.delete({ collection: 'media', id }).catch(() => null)
  } else if (reemplazados.length) {
    log(`${reemplazados.length} archivo(s) anteriores quedan en Media (borrar-anteriores para borrarlos)`)
  }
  log(`Listo: ${manifest.vistas.length} vista(s) en ${edificio.nombre} (${manifest.ancho}×${manifest.alto})`)
  process.exit(0)
}

// top-level await: `payload run` termina el proceso apenas se importa el archivo
try {
  await main()
} catch (err) {
  console.error(err)
  process.exit(1)
}
