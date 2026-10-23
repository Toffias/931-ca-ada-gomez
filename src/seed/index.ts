/**
 * Carga datos de ejemplo: usuario admin, datos del proyecto, la Torre Cityh con su modelo 3D,
 * renders, tipologías, niveles especiales, amenities, avances de obra, una nota del blog y las 36 unidades leídas
 * del propio .glb (extras exportados desde Blender).
 *
 *   pnpm seed         → sólo crea lo que falta
 *   pnpm seed:fresh   → borra edificios, unidades, consultas y archivos y vuelve a cargar
 *
 * Para un proyecto nuevo, copiá este archivo y cambiá DATOS_EDIFICIO y los assets.
 */
import config from '@payload-config'
import fs from 'fs'
import path from 'path'
import { getPayload } from 'payload'
import { fileURLToPath } from 'url'

import { leerUnidadesDelGLB } from '../lib/glb'
import { ARTICULOS, AUTOR } from './articulos'
import { AVANCES } from './avances-obra'

const dirname = path.dirname(fileURLToPath(import.meta.url))
const asset = (f: string) => path.resolve(dirname, 'assets', f)

const DATOS_EDIFICIO = {
  nombre: 'Torre Cityh',
  estadoObra: 'preventa' as const,
  entrega: 'Diciembre 2027',
  direccion: 'Av. Ejemplo 1234, Buenos Aires',
  bajada: '9 pisos de departamentos de 1 y 2 dormitorios sobre una esquina arbolada, con locales en planta baja.',
  caracteristicas: ['Locales comerciales en planta baja', 'Cocheras', 'Terraza con parrillas', 'Seguridad 24 h'],
  config3D: {
    escala: 8, // el modelo de ejemplo está en "unidades Blender" de ~8 m
    solElevacion: 27,
    solAzimut: -14,
    ventanasNoche: { material: 'WEB_Vidrio', alturaPrimerPiso: 5.176, alturaPiso: 2.618, anchoVentana: 1.76, encendidas: 58 },
    vistas: [
      { camara: 'Cam_Principal', etiqueta: 'Principal', alturaObjetivo: 13 },
      { camara: 'Cam_Peatonal', etiqueta: 'Peatonal' },
      { camara: 'Cam_Aerea', etiqueta: 'Aérea' },
      { camara: 'Cam_Acceso', etiqueta: 'Acceso' },
    ],
  },
}

const ESTADO: Record<string, 'disponible' | 'reservada' | 'vendida'> = {
  Disponible: 'disponible',
  Reservado: 'reservada',
  Reservada: 'reservada',
  Vendido: 'vendida',
  Vendida: 'vendida',
}

const UBICACION = {
  barrio: 'Barrio Ejemplo',
  direccion: 'Av. Ejemplo 1234, Buenos Aires',
  texto:
    'A dos cuadras del parque y con el subte a cinco minutos caminando. Una zona tranquila, con comercios de cercanía y colegios.',
  cercanias: [
    { nombre: 'Parque Central', categoria: 'Espacios verdes', tiempo: '2 min caminando', x: 30, y: 40 },
    { nombre: 'Estación de subte', categoria: 'Transporte', tiempo: '5 min caminando', x: 70, y: 25 },
    { nombre: 'Colegio San Martín', categoria: 'Educación', tiempo: '6 min caminando', x: 62, y: 70 },
    { nombre: 'Supermercado', categoria: 'Comercios', tiempo: '3 min caminando', x: 40, y: 72 },
  ],
}

// Descripciones de amenities: un párrafo por string (se guardan separados por una línea en blanco)
const AMENITIES = Object.fromEntries(
  Object.entries({
    hall: [
      'La llegada a casa empieza en un hall de doble altura, con un jardín vertical que sube junto a la escalera y deja entrar la luz de la calle durante todo el día.',
      'Recepción con seguridad las 24 horas, sala de espera para visitas y deliveries, buzones y ascensores con acceso controlado. Materiales nobles (piedra, madera y vidrio) pensados para durar y envejecer bien.',
    ],
    piscina: [
      'En el último piso, una piscina climatizada con borde infinito mira de frente a la ciudad. Se usa todo el año: en verano como solárium y en invierno para nadar con el agua templada.',
      'Alrededor, un deck con reposeras, duchas y vestuarios, y canteros con especies nativas que dan sombra y privacidad. De noche, la iluminación bajo el agua convierte la terraza en otro lugar.',
    ],
    gimnasio: [
      'Un gimnasio equipado con cintas, bicicletas, elípticos y una estación de musculación completa, a pasos de tu departamento y sin cuota aparte.',
      'Ventanales de piso a techo, piso de caucho y aire acondicionado para entrenar cómodo a cualquier hora, con espacio libre para funcional, estiramiento o yoga.',
    ],
    parrillas: [
      'La terraza reúne quinchos con parrilla bajo pérgola, cada uno con mesada, bacha y mesa para doce personas: el asado del domingo o el cumpleaños, sin mover muebles en casa.',
      'Entre los quinchos, mesas al aire libre y livings de exterior con vista abierta al parque. Se reservan por turnos y quedan listos para el siguiente.',
    ],
    sum: [
      'Un salón de usos múltiples para festejos, reuniones de consorcio o una tarde de películas, con cocina equipada, vajilla y sonido.',
      'Al lado, un coworking silencioso con wifi de alta velocidad, puestos de trabajo, sala de reuniones y cabinas para videollamadas: la oficina, sin salir del edificio.',
    ],
    locales: [
      'La planta baja se abre a las dos avenidas con locales comerciales de frente vidriado, pensados para cafés, almacenes de cercanía y servicios del barrio.',
      'Tienen acceso independiente del residencial, así la esquina gana movimiento sin restarles tranquilidad a los vecinos.',
    ],
  }).map(([clave, parrafos]) => [clave, parrafos.join('\n\n')]),
) as Record<'hall' | 'piscina' | 'gimnasio' | 'parrillas' | 'sum' | 'locales', string>

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

  // Proyecto (la foto del barrio se sube una sola vez: con `fresh` se borró junto con el resto de media)
  const sitioActual = await payload.findGlobal({ slug: 'sitio', depth: 0 })
  const fotoBarrio =
    (!fresh && sitioActual.ubicacion?.foto) ||
    (await payload.create({ collection: 'media', data: { alt: 'Calle arbolada del barrio (imagen ilustrativa)' }, filePath: asset('ubicacion/barrio.jpg') })).id
  await payload.updateGlobal({
    slug: 'sitio',
    data: {
      nombre: 'Torre Cityh',
      eslogan: 'Viví la esquina más verde del barrio',
      colorAcento: '#e8b56a',
      colorFondo: '#0e1116',
      tipografia: 'inter',
      desarrolladora: { nombre: 'Desarrollos Ejemplo S.A.', web: 'https://ejemplo.com' },
      secciones: {
        disponibilidad: true,
        amenities: true,
        recorridos: false,
        galeria: true,
        video: false,
        obra: true,
        ubicacion: true,
        modo3d: true,
        blog: true,
      },
      contacto: {
        telefono: '+54 11 5555-0000',
        whatsapp: '5491155550000',
        email: 'ventas@ejemplo.com',
        direccion: 'Showroom: Av. Ejemplo 1200',
        horario: 'Lunes a viernes de 10 a 18 h · Sábados de 10 a 13 h',
        motivos: ['Quiero comprar', 'Quiero invertir', 'Soy inmobiliaria', 'Otro'],
      },
      descripcion:
        'Una torre de 9 pisos sobre una esquina arbolada, con departamentos de 1 y 2 dormitorios, locales en planta baja y terraza con parrillas.',
      legal: 'Imágenes ilustrativas, no contractuales. Precios y disponibilidad sujetos a cambios sin previo aviso.',
      privacidad:
        'Los datos que nos dejás se usan sólo para responder tu consulta y enviarte información del proyecto. No se comparten con terceros. Podés pedir que los borremos escribiendo a ventas@ejemplo.com.',
      ubicacion: { ...UBICACION, foto: fotoBarrio },
    },
  })

  // Edificio
  const existente = await payload.find({ collection: 'edificios', where: { slug: { equals: 'torre-cityh' } }, limit: 1 })
  if (existente.docs.length) {
    log('La Torre Cityh ya existe; usá "pnpm seed:fresh" para recargarla.')
    process.exit(0)
  }

  const subir = (archivo: string, alt: string) =>
    payload.create({ collection: 'media', data: { alt }, filePath: asset(archivo) })

  const modelo = await subir('torre-cityh.glb', 'Modelo 3D Torre Cityh')
  const portada = await subir('portada.webp', 'Torre Cityh de día desde la esquina')
  const galeria = await Promise.all([
    subir('aerea-dia.webp', 'Vista aérea de la manzana'),
    subir('noche.webp', 'La torre de noche desde la vereda'),
  ])
  log('Archivos subidos')

  // Amenities: fotos de stock CC0 (seed/assets/amenities/CREDITOS.md) para que la demo no muestre la fachada
  // como si fuera el interior; en un proyecto real van los renders de CAM_AMEN_* de Blender.
  const amenity = (nombre: string, orden: number, descripcion: string, imagenes: { imagen: number; epigrafe: string }[]) =>
    payload.create({ collection: 'amenities', data: { nombre, orden, descripcion, imagenes } })
  const foto = async (archivo: string, epigrafe: string) => ({
    imagen: (await subir(`amenities/${archivo}`, `${epigrafe} (imagen ilustrativa)`)).id,
    epigrafe,
  })
  const hall = await amenity('Hall de acceso', 1, AMENITIES.hall, [
    await foto('hall-1.jpg', 'Doble altura con jardín vertical'),
    await foto('hall-2.jpg', 'Sala de espera'),
  ])
  const piscina = await amenity('Piscina en la terraza', 2, AMENITIES.piscina, [
    await foto('piscina-1.jpg', 'Solárium'),
    await foto('piscina-2.jpg', 'La piscina de noche'),
  ])
  await amenity('Gimnasio', 3, AMENITIES.gimnasio, [
    await foto('gimnasio-1.jpg', 'Sala de musculación'),
    await foto('gimnasio-2.jpg', 'Cardio'),
  ])
  const terraza = await amenity('Terraza con parrillas', 4, AMENITIES.parrillas, [
    await foto('parrillas-2.jpg', 'Quincho con pérgola'),
    await foto('parrillas-1.jpg', 'Parrillas'),
    await foto('parrillas-3.jpg', 'Mesas al aire libre'),
  ])
  await amenity('SUM y coworking', 5, AMENITIES.sum, [
    await foto('sum-1.jpg', 'Salón'),
    await foto('sum-2.jpg', 'Coworking'),
  ])
  const locales = await amenity('Locales comerciales', 6, AMENITIES.locales, [
    await foto('locales-1.jpg', 'Frente vidriado sobre la vereda'),
    await foto('locales-2.jpg', 'Mesas en la vereda'),
  ])

  const edificio = await payload.create({
    collection: 'edificios',
    data: {
      ...DATOS_EDIFICIO,
      caracteristicas: DATOS_EDIFICIO.caracteristicas.map((texto) => ({ texto })),
      modelo3D: modelo.id,
      portada: portada.id,
      galeria: galeria.map((g, i) => ({ imagen: g.id, epigrafe: ['Vista aérea', 'De noche'][i] })),
      niveles: [
        {
          piso: 0,
          nombre: 'Planta baja',
          tipo: 'especial',
          pois: [
            { etiqueta: 'Hall de acceso', x: 62, y: 62, amenity: hall.id },
            { etiqueta: 'Locales', x: 32, y: 36, amenity: locales.id },
          ],
        },
        {
          piso: 10,
          nombre: 'Terraza',
          tipo: 'especial',
          pois: [
            { etiqueta: 'Parrillas', x: 40, y: 45, amenity: terraza.id },
            { etiqueta: 'Piscina', x: 64, y: 58, amenity: piscina.id },
          ],
        },
      ],
    },
  })

  // Avances de obra de ejemplo: fotos de stock CC0 de otras obras (seed/assets/obra/CREDITOS.md), una etapa
  // típica por entrega; en un proyecto real el cliente carga las fotos de su obra desde el admin.
  for (const a of AVANCES) {
    await payload.create({
      collection: 'avances-de-obra',
      data: {
        titulo: a.titulo,
        fecha: a.fecha,
        texto: a.texto,
        edificio: edificio.id,
        fotos: await Promise.all(
          a.fotos.map(async ([archivo, epigrafe]) => ({
            imagen: (await subir(`obra/${archivo}`, `${epigrafe} (imagen ilustrativa)`)).id,
            epigrafe,
          })),
        ),
      },
    })
  }
  log(`${AVANCES.length} avances de obra creados`)

  // Blog: una autora y una nota de ejemplo, publicada
  const autora = await payload.create({ collection: 'autores', data: AUTOR })
  for (const a of ARTICULOS) {
    await payload.create({ collection: 'articulos', data: { ...a, autor: autora.id, portada: portada.id, _status: 'published' } })
  }
  log(`${ARTICULOS.length} artículo(s) del blog creados`)

  // Unidades: salen del .glb (Blender → propiedades personalizadas → glTF extras).
  // Las tipologías se agrupan por posición en la planta (A–D) y dormitorios: A2, C1…
  const unidades = leerUnidadesDelGLB(fs.readFileSync(asset('torre-cityh.glb')))
  const codigoTipologia = (u: (typeof unidades)[number]) => `${u.unidad.slice(-1)}${u.dormitorios ?? 1}`
  const tipologias = new Map<string, number>()
  // plantas 2D y 3D de referencia por posición (seed/assets/plantas): las comparten A1 y A2, B1 y B2…
  const plantas = new Map<string, { d2: number; d3: number }>()
  for (const letra of ['A', 'B', 'C', 'D']) {
    const base = `plantas/unidad-${letra.toLowerCase()}`
    const [d2, d3] = await Promise.all([
      subir(`${base}-2d.png`, `Plano de la unidad ${letra}`),
      subir(`${base}-3d.webp`, `Planta 3D amoblada de la unidad ${letra}`),
    ])
    plantas.set(letra, { d2: d2.id, d3: d3.id })
  }
  for (const u of unidades) {
    const codigo = codigoTipologia(u)
    if (tipologias.has(codigo)) continue
    const grupo = unidades.filter((x) => codigoTipologia(x) === codigo)
    const m2 = Math.round(grupo.reduce((s, x) => s + (x.m2 ?? 0), 0) / grupo.length)
    const dorm = u.dormitorios ?? 1
    const t = await payload.create({
      collection: 'tipologias',
      data: {
        codigo,
        nombre: `${dorm + 1} ambientes`,
        edificio: edificio.id,
        dormitorios: dorm,
        banos: dorm >= 2 ? 2 : 1,
        ambientes: dorm + 1,
        superficieInterna: Math.round(m2 * 0.88),
        superficieBalcon: Math.round(m2 * 0.12),
        superficieTotal: m2,
        extras: dorm >= 2 ? ['balcon', 'lavadero', 'cochera'] : ['balcon', 'lavadero'],
        descripcion: `Departamento de ${dorm} dormitorio${dorm > 1 ? 's' : ''} con balcón, orientación ${(u.orientacion ?? '').toLowerCase()}.`,
        foto: portada.id,
        planta: plantas.get(codigo[0])?.d3,
        planta2d: plantas.get(codigo[0])?.d2,
        // en un proyecto real: los renders interiores de la tipología
        galeria: [portada, ...galeria].map((g) => ({ imagen: g.id, epigrafe: g.alt })),
        // en un proyecto real: el video de la tipología (YouTube / Vimeo / MP4)
        video: 'https://www.youtube.com/watch?v=smoQhqNm9Iw',
      },
    })
    tipologias.set(codigo, t.id)
  }
  log(`${tipologias.size} tipologías creadas`)

  for (const u of unidades) {
    await payload.create({
      collection: 'unidades',
      data: {
        codigo: u.unidad,
        edificio: edificio.id,
        piso: u.piso,
        estado: ESTADO[u.estado ?? ''] ?? 'disponible',
        tipologia: tipologias.get(codigoTipologia(u)),
        dormitorios: u.dormitorios,
        orientacion: u.orientacion,
        superficieTotal: u.m2,
        precio: u.precio_usd,
        moneda: 'USD',
        mostrarPrecio: true,
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
