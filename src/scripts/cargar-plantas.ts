/**
 * Carga en Payload los renders de plantas por piso que genera scripts/blender/renders_plantas.py
 * (docs/renders-plantas.md): sube cada imagen y su máscara SVG a Media y completa Edificio → Plantas → Niveles.
 *
 *   pnpm cargar:plantas <carpeta con plantas.json> <slug de la torre> [solo-mascaras] [incluir-especiales] [borrar-anteriores]
 *
 * Se puede correr de nuevo después de re-renderizar: reemplaza el render y la máscara de cada piso, sin tocar
 * nombre, tipo ni puntos de interés de los niveles que ya existían. Los archivos anteriores quedan en Media
 * salvo con borrar-anteriores. Los pisos sin unidades (planta baja, amenities) se saltean salvo con
 * incluir-especiales: sus puntos de interés están en % de la imagen y hay que reubicarlos sobre el render.
 * El `fondo` de plantas.json decide el campo: 'blanco' → Render cenital (blanco), si no → Render cenital (realista);
 * el otro render del nivel no se toca. Los dos comparten la máscara: tienen que salir de la misma cámara.
 * Con solo-mascaras sube sólo los SVG (después de `renders_plantas.py --solo-mascaras`) y deja los renders.
 * Las opciones van como palabras sueltas: `payload run` sólo pasa argumentos posicionales (no `--banderas`).
 */
import config from '@payload-config'
import fs from 'fs'
import path from 'path'
import { getPayload } from 'payload'

type Manifest = {
  ancho: number
  alto: number
  /** 'blanco' (sólo el edificio) va a cenitalBlanco; 'realista' o sin dato, a cenital */
  fondo?: 'realista' | 'blanco'
  pisos: { piso: number; imagen: string; mascara: string; unidades: string[] }[]
}

const idDe = (v: unknown): number | string | null =>
  v && typeof v === 'object' && 'id' in v ? (v as { id: number | string }).id : ((v as number | string | null) ?? null)

async function main() {
  const OPCIONES = ['solo-mascaras', 'incluir-especiales', 'borrar-anteriores']
  const args = process.argv.slice(2)
  const opcion = (o: string) => args.includes(o)
  const [carpeta, slug] = args.filter((a) => !OPCIONES.includes(a))
  if (!carpeta || !slug) throw new Error('Uso: pnpm cargar:plantas <carpeta con plantas.json> <slug de la torre>')
  const manifest: Manifest = JSON.parse(fs.readFileSync(path.join(carpeta, 'plantas.json'), 'utf8'))

  const payload = await getPayload({ config })
  const log = (m: string) => payload.logger.info(`[plantas] ${m}`)
  const { docs } = await payload.find({ collection: 'edificios', where: { slug: { equals: slug } }, limit: 1, depth: 0 })
  const edificio = docs[0]
  if (!edificio) throw new Error(`No existe la torre "${slug}"`)

  // aviso temprano: una unidad de la máscara sin su par en Payload no se puede pintar ni abrir
  const unidades = await payload.find({
    collection: 'unidades',
    where: { edificio: { equals: edificio.id } },
    limit: 1000,
    depth: 0,
  })
  const codigos = new Set(unidades.docs.map((u) => u.codigo.toUpperCase()))

  const campo = manifest.fondo === 'blanco' ? 'cenitalBlanco' : 'cenital'
  log(`fondo ${manifest.fondo ?? 'realista'} → ${campo}`)
  const niveles = [...(edificio.niveles ?? [])]
  const reemplazados: (number | string)[] = []
  for (const p of manifest.pisos) {
    // un nivel especial (PB, amenities) suele tener puntos de interés ubicados sobre otra imagen: sólo a pedido
    if (!p.unidades.length && !opcion('incluir-especiales')) {
      log(`piso ${p.piso}: sin unidades, se saltea (incluir-especiales para cargarlo)`)
      continue
    }
    const faltan = p.unidades.filter((c) => !codigos.has(c.toUpperCase()))
    if (faltan.length) log(`piso ${p.piso}: sin unidad en Payload para ${faltan.join(', ')}`)

    const subir = (archivo: string, alt: string) =>
      payload.create({ collection: 'media', data: { alt }, filePath: path.join(carpeta, archivo) })
    const i = niveles.findIndex((n) => n.piso === p.piso)
    if (opcion('solo-mascaras') && !(i >= 0 && (niveles[i].cenital || niveles[i].cenitalBlanco))) {
      log(`piso ${p.piso}: no tiene render cargado, se saltea (solo-mascaras)`)
      continue
    }
    const cenital = opcion('solo-mascaras') ? null : await subir(p.imagen, `Planta del piso ${p.piso}`)
    const mascara = await subir(p.mascara, `Máscara de unidades del piso ${p.piso}`)

    if (i >= 0) {
      const anteriores = cenital ? [niveles[i][campo], niveles[i].mascara] : [niveles[i].mascara]
      for (const viejo of anteriores.map(idDe)) if (viejo) reemplazados.push(viejo)
      niveles[i] = { ...niveles[i], ...(cenital ? { [campo]: cenital.id } : {}), mascara: mascara.id }
    } else if (cenital) {
      niveles.push({ piso: p.piso, tipo: p.unidades.length ? 'unidades' : 'especial', [campo]: cenital.id, mascara: mascara.id })
    }
    log(`piso ${p.piso}: ${p.unidades.length} unidad(es)`)
  }

  niveles.sort((a, b) => a.piso - b.piso)
  await payload.update({ collection: 'edificios', id: edificio.id, data: { niveles } })
  if (opcion('borrar-anteriores')) {
    for (const id of reemplazados) await payload.delete({ collection: 'media', id }).catch(() => null)
  } else if (reemplazados.length) {
    log(`${reemplazados.length} archivo(s) anteriores quedan en Media (borrar-anteriores para borrarlos)`)
  }
  log(`Listo: ${manifest.pisos.length} piso(s) procesados en ${edificio.nombre} (${manifest.ancho}×${manifest.alto})`)
  process.exit(0)
}

// top-level await: `payload run` termina el proceso apenas se importa el archivo
try {
  await main()
} catch (err) {
  console.error(err)
  process.exit(1)
}
