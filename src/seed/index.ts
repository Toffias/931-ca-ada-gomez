/**
 * Carga el proyecto Cañada de Gómez 931 (Male Group S.A.): usuario admin, datos del proyecto, el edificio con la
 * modelo de Blender (scripts/blender/modelar_ca931.py), los renders del cliente, 3 tipologías con su recorrido 360
 * (si está en seed/assets/ca931/recorridos/) y las 9 unidades leídas del propio .glb.
 * Material de origen en docs/referencias/ y plan en docs/plan-renders-931.md.
 *
 *   pnpm seed         → sólo crea lo que falta
 *   pnpm seed:fresh   → borra edificios, unidades, consultas y archivos y vuelve a cargar
 *
 * Los assets de la Torre Cityh (demo de la plantilla) siguen en seed/assets/ para el test de esquemas.
 */
import config from '@payload-config'
import fs from 'fs'
import path from 'path'
import { getPayload } from 'payload'
import { fileURLToPath } from 'url'

import { leerUnidadesDelGLB } from '../lib/glb'

const dirname = path.dirname(fileURLToPath(import.meta.url))
const asset = (f: string) => path.resolve(dirname, 'assets', 'ca931', f)

const NOMBRE = 'Cañada de Gómez 931'
const SLUG = 'canada-de-gomez-931'

// Disclaimer tal cual viene en los planos del cliente
const LEGAL =
  'Los planos e imágenes exhibidos corresponden a etapa de anteproyecto, las medidas, materiales y terminaciones podrán ser modificados durante el desarrollo y hasta la aprobación del plano conforme a obra.'

const DATOS_EDIFICIO = {
  nombre: NOMBRE,
  slug: SLUG,
  estadoObra: 'preventa' as const,
  direccion: 'Cañada de Gómez 931',
  bajada: 'Planta baja y 4 pisos entre medianeras: 9 departamentos de 2, 3 y 4 ambientes, con balcón al frente o patio propio.',
  caracteristicas: ['9 unidades', 'Balcones al frente', 'Patio propio en planta baja', 'Ascensor', 'Portería'],
  config3D: {
    escala: 1, // el modelo está en metros
    // sol del sudoeste, de frente a la izquierda como en las fotos del cliente (el frente mira al sur, +Z del visor)
    solElevacion: 40,
    solAzimut: -125,
    ventanasNoche: { material: 'WEB_Vidrio', alturaPrimerPiso: 3.3, alturaPiso: 2.75, anchoVentana: 1.5, encendidas: 70 },
    vistas: [
      { camara: 'Cam_Principal', etiqueta: 'Frente', alturaObjetivo: 8 },
      { camara: 'Cam_Derecha', etiqueta: 'Frente derecha', alturaObjetivo: 8 },
      { camara: 'Cam_Aerea', etiqueta: 'Aérea' },
      { camara: 'Cam_Acceso', etiqueta: 'Acceso', alturaObjetivo: 1.8 },
    ],
  },
}

// Tipologías del anteproyecto (opción 2). Superficies del plano; el patio de la PB no es balcón, va en la descripción.
const TIPOLOGIAS = {
  PB: {
    nombre: '4 ambientes con patio',
    dormitorios: 3,
    banos: 2,
    ambientes: 4,
    superficieInterna: 90.5,
    superficieTotal: 121.8,
    extras: [] as ('balcon' | 'lavadero')[],
    descripcion:
      'Planta baja de 4 ambientes con patio propio de 31,30 m² al contrafrente. Living comedor y cocina con desayunador abiertos al patio, tres dormitorios y dos baños. 90,50 m² cubiertos.',
    planta2d: ['planta-pb-2d.png', 'Plano de la unidad de planta baja'],
  },
  A: {
    nombre: '3 ambientes con balcón',
    dormitorios: 2,
    banos: 2,
    ambientes: 3,
    superficieInterna: 69.5,
    superficieBalcon: 6.8,
    superficieTotal: 76.3,
    extras: ['balcon'] as ('balcon' | 'lavadero')[],
    descripcion:
      'Departamento de 3 ambientes al frente, con balcón de baranda de vidrio. Living comedor y cocina con desayunador hacia el balcón, dos dormitorios al contrafrente y dos baños.',
    planta2d: ['planta-3amb-2d.png', 'Plano del 3 ambientes (pisos 1 a 4)'],
  },
  B: {
    nombre: '2 ambientes con balcón',
    dormitorios: 1,
    banos: 1,
    ambientes: 2,
    superficieInterna: 49,
    superficieBalcon: 4.9,
    superficieTotal: 53.9,
    extras: ['balcon'] as ('balcon' | 'lavadero')[],
    descripcion:
      'Departamento de 2 ambientes al frente, con balcón. Living comedor con cocina integrada, dormitorio al contrafrente y baño.',
    planta2d: ['planta-2amb-2d.png', 'Plano del 2 ambientes (pisos 1 a 4)'],
  },
}
const tipologiaDe = (codigo: string): keyof typeof TIPOLOGIAS => (codigo === 'PB' ? 'PB' : codigo.endsWith('A') ? 'A' : 'B')

// Recorridos 360 por tipología (scripts/blender/recorrido_ca931.py → renders_recorrido.py): cada carpeta de
// assets/ca931/recorridos/ trae las panorámicas, el plano y su recorrido.json. Sin carpeta, la tipología queda sin tour.
const RECORRIDOS: Record<string, keyof typeof TIPOLOGIAS> = { '3-ambientes': 'A', '2-ambientes': 'B', 'planta-baja': 'PB' }

type ManifestRecorrido = {
  nombre: string
  plano: string | null
  puntos: { clave: string; titulo: string; rumbo: number; panorama: string; x: number; y: number; enlaces: string[] }[]
}

const ESTADO: Record<string, 'disponible' | 'reservada' | 'vendida'> = {
  Disponible: 'disponible',
  Reservada: 'reservada',
  Vendida: 'vendida',
}

async function main() {
  const fresh = process.argv.includes('fresh')
  const payload = await getPayload({ config })
  const log = (m: string) => payload.logger.info(`[seed] ${m}`)

  if (fresh) {
    for (const collection of [
      'consultas',
      'unidades',
      'tipologias',
      'avances-de-obra',
      'articulos',
      'autores',
      'amenities',
      'recorridos',
      'edificios',
      'media',
    ] as const) {
      await payload.delete({ collection, where: { id: { exists: true } }, overrideAccess: true })
    }
    log('Datos anteriores borrados')
  }

  // Admin
  const email = process.env.SEED_ADMIN_EMAIL || 'admin@example.com'
  const password = process.env.SEED_ADMIN_PASSWORD || 'cambiar123'
  const users = await payload.find({ collection: 'users', where: { email: { equals: email } }, limit: 1 })
  if (!users.docs.length) {
    await payload.create({ collection: 'users', data: { email, password, nombre: 'Admin' } })
    log(`Usuario admin creado: ${email}`)
  }

  const existente = await payload.find({ collection: 'edificios', where: { slug: { equals: SLUG } }, limit: 1 })
  if (existente.docs.length) {
    log(`${NOMBRE} ya existe; usá "pnpm seed:fresh" para recargarlo.`)
    process.exit(0)
  }

  const subir = (archivo: string, alt: string) =>
    payload.create({ collection: 'media', data: { alt }, filePath: asset(archivo) })

  // Renders del cliente (docs/referencias/), pasados a webp
  const modelo = await subir('edificio.glb', `Modelo 3D de ${NOMBRE}`)
  const izquierda = await subir('fachada-izquierda.webp', `Fachada de ${NOMBRE} de día`)
  const derecha = await subir('fachada-derecha.webp', `Fachada de ${NOMBRE} desde la vereda de enfrente`)
  const atardecer = await subir('atardecer.webp', `Fachada de ${NOMBRE} al atardecer, con las luces encendidas`)
  const acceso = await subir('acceso.webp', 'Acceso peatonal con la columna de piedra y el número 931')
  const inicio = await subir('inicio.webp', `Fachada de ${NOMBRE} desde la calle arbolada, de día`)
  const favicon = await subir('favicon.svg', 'Monograma de Male Group S.A.')
  const galeria = [
    { imagen: izquierda.id, epigrafe: 'Fachada' },
    { imagen: derecha.id, epigrafe: 'Desde la vereda de enfrente' },
    { imagen: atardecer.id, epigrafe: 'Al atardecer' },
    { imagen: acceso.id, epigrafe: 'Acceso' },
    // renders de Cycles desde las mismas cámaras (scripts/blender/renders_ca931.py), con los interiores amueblados
    ...(await Promise.all(
      [
        ['frente-dia', 'Render de día'],
        ['frente-derecha-dia', 'Render de día desde la derecha'],
        ['frente-atardecer', 'Render al atardecer'],
      ].map(async ([archivo, epigrafe]) => ({
        imagen: (await subir(`renders/${archivo}.webp`, `${NOMBRE} · ${epigrafe.toLowerCase()}`)).id,
        epigrafe,
      })),
    )),
  ]
  // Disponibilidad sobre las fotos del cliente ampliadas (más cielo, vereda y vecinos, assets/ca931/disponibilidad/):
  // máscaras calculadas en Blender con las cámaras calzadas (Render_Fachada_* de scripts/blender/modelar_ca931.py)
  // y llevadas a la foto ampliada con una homografía sobre el edificio
  const vistasDisponibilidad = []
  for (const [etiqueta, archivo] of [
    ['Frente', 'frente'],
    ['Frente derecha', 'frente-derecha'],
  ]) {
    vistasDisponibilidad.push({
      etiqueta,
      imagen: (await subir(`disponibilidad/${archivo}.webp`, `Fachada de ${NOMBRE} · ${etiqueta.toLowerCase()}`)).id,
      mascara: (await subir(`disponibilidad/mascara-${archivo}.svg`, `Máscara de unidades · ${etiqueta}`)).id,
    })
  }
  // Plantas por piso: renders fotorrealistas con el edificio cortado y su máscara (renders_plantas.py con fondo
  // blanco, docs/plan-renders-931.md Fase C); misma cámara para todos los pisos
  const niveles = []
  for (let piso = 0; piso <= 4; piso++) {
    const n = String(piso).padStart(2, '0')
    const nombre = piso === 0 ? 'Planta baja' : `Piso ${piso}`
    niveles.push({
      piso,
      ...(piso === 0 ? { nombre } : {}),
      tipo: 'unidades' as const,
      cenitalBlanco: (await subir(`plantas/piso-${n}.webp`, `${NOMBRE} · ${nombre} vista desde arriba`)).id,
      mascara: (await subir(`plantas/piso-${n}.svg`, `Máscara de unidades · ${nombre}`)).id,
    })
  }
  const recorridos = new Map<keyof typeof TIPOLOGIAS, number>()
  for (const [slug, tipologia] of Object.entries(RECORRIDOS)) {
    const carpeta = `recorridos/${slug}`
    if (!fs.existsSync(asset(`${carpeta}/recorrido.json`))) continue
    const m: ManifestRecorrido = JSON.parse(fs.readFileSync(asset(`${carpeta}/recorrido.json`), 'utf8'))
    const puntos = []
    for (const p of m.puntos) {
      const panorama = await subir(`${carpeta}/${p.panorama}`, `${m.nombre} · ${p.titulo} (360°)`)
      puntos.push({ clave: p.clave, titulo: p.titulo, rumbo: p.rumbo, x: p.x, y: p.y, enlaces: p.enlaces, panorama: panorama.id })
    }
    const plano = m.plano ? (await subir(`${carpeta}/${m.plano}`, `Plano del recorrido · ${m.nombre}`)).id : undefined
    const doc = await payload.create({ collection: 'recorridos', data: { nombre: m.nombre, slug, tipo: 'propio', plano, puntos } })
    recorridos.set(tipologia, doc.id)
  }
  log('Archivos subidos')

  // Proyecto. Contacto, ubicación y logo quedan vacíos hasta que los pase el cliente.
  await payload.updateGlobal({
    slug: 'sitio',
    data: {
      nombre: NOMBRE,
      eslogan: '9 departamentos con balcón al frente o patio propio',
      colorAcento: '#c49a6c', // madera de los listones de la fachada
      colorFondo: '#111214',
      tipografia: 'inter',
      tema: 'oscuro',
      favicon: favicon.id,
      desarrolladora: { nombre: 'Male Group S.A.' },
      secciones: {
        disponibilidad: true,
        amenities: false,
        recorridos: recorridos.size > 0,
        galeria: true,
        video: false,
        obra: false,
        ubicacion: false,
        modo3d: true,
        blog: false,
      },
      contacto: {
        motivos: ['Quiero comprar', 'Quiero invertir', 'Soy inmobiliaria', 'Otro'],
      },
      descripcion:
        'Edificio entre medianeras de planta baja y 4 pisos. Por piso, un 3 ambientes y un 2 ambientes al frente, con balcón; en planta baja, un 4 ambientes con patio propio. Fachada de revoque gris y crema con una franja vertical de listones de madera.',
      legal: LEGAL,
      intro: { poster: inicio.id, nubes: false },
      giro: [
        { etiqueta: 'Frente', imagen: izquierda.id },
        { etiqueta: 'Frente derecha', imagen: derecha.id },
      ],
      galeria,
      ubicacion: { direccion: 'Cañada de Gómez 931', cercanias: [] },
    },
  })

  const edificio = await payload.create({
    collection: 'edificios',
    data: {
      ...DATOS_EDIFICIO,
      caracteristicas: DATOS_EDIFICIO.caracteristicas.map((texto) => ({ texto })),
      modelo3D: modelo.id,
      portada: izquierda.id,
      galeria,
      vistasDisponibilidad,
      fondoPlantas: 'blanco',
      niveles,
    },
  })

  const tipologias = new Map<string, number>()
  for (const [codigo, t] of Object.entries(TIPOLOGIAS)) {
    const [archivo, alt] = t.planta2d
    const { planta2d: _, ...datos } = t
    const doc = await payload.create({
      collection: 'tipologias',
      data: {
        ...datos,
        codigo,
        edificio: edificio.id,
        foto: izquierda.id,
        planta2d: (await subir(archivo, alt)).id,
        galeria,
        recorrido: recorridos.get(codigo as keyof typeof TIPOLOGIAS),
      },
    })
    tipologias.set(codigo, doc.id)
  }
  log(`${tipologias.size} tipologías creadas`)

  // Unidades: salen del .glb (Unidad_* de Blender); el código es el mismo que en el modelo
  const unidades = leerUnidadesDelGLB(fs.readFileSync(asset('edificio.glb')))
  for (const u of unidades) {
    const t = TIPOLOGIAS[tipologiaDe(u.unidad)]
    await payload.create({
      collection: 'unidades',
      data: {
        codigo: u.unidad,
        edificio: edificio.id,
        piso: u.piso,
        estado: ESTADO[u.estado ?? ''] ?? 'disponible',
        tipologia: tipologias.get(tipologiaDe(u.unidad)),
        orientacion: u.orientacion,
        superficieCubierta: t.superficieInterna,
        superficieBalcon: 'superficieBalcon' in t ? t.superficieBalcon : undefined,
        superficieTotal: t.superficieTotal,
        moneda: 'USD',
        mostrarPrecio: false, // sin lista de precios todavía
      },
    })
  }
  log(`${unidades.length} unidades creadas`)
  log('Listo. Admin en /admin, sitio en /')
  process.exit(0)
}

// top-level await: `payload run` termina el proceso apenas se importa el archivo
try {
  await main()
} catch (err) {
  console.error(err)
  process.exit(1)
}
