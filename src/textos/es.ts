// Textos fijos del sitio en castellano (rioplatense). Es la referencia: en.ts tiene que tener exactamente las
// mismas claves (el tipo Textos lo exige). Lo que carga el admin (nombres, descripciones, amenities) no va acá.

import type { EstadoUnidad } from '@/components/visor/tipos'
import type { Orientacion } from '@/lib/esquemas/fachada'
import type { PestanaFicha } from '@/lib/rutas'

export const es = {
  idioma: {
    /** nombre del idioma en su propio idioma, para el selector */
    nombre: 'Español',
    corto: 'ES',
    ver: 'Ver en español',
  },

  comun: {
    cerrar: 'Cerrar',
    volver: 'Volver',
    anterior: 'Anterior',
    siguiente: 'Siguiente',
    ingresar: 'Ingresar',
    entrar: 'Entrar',
    galeria: 'Galería',
    tour360: 'Tour 360',
    modo3d: 'Modo 3D',
    verPlantas: 'Ver plantas',
    pantallaCompleta: 'Pantalla completa',
    salirPantallaCompleta: 'Salir de pantalla completa',
    cargando: 'Cargando…',
    unidad: (codigo: string) => `Unidad ${codigo}`,
    piso: (piso: number) => `Piso ${piso}`,
    tipologia: (codigo: string) => `Tipología ${codigo}`,
    /** "3 dorm." en tooltips y filtros */
    dormCorto: (n: number) => `${n} dorm.`,
    disponibles: (n: number) => `${n} disponibles`,
    unidadesDisponibles: (n: number) => `${n} ${n === 1 ? 'unidad disponible' : 'unidades disponibles'}`,
    desarrolloDe: (nombre: string) => `Un desarrollo de ${nombre}`,
    whatsappProyecto: (nombre: string) => `Hola, quiero información sobre ${nombre}.`,
  },

  estados: {
    disponible: 'Disponible',
    reservada: 'Reservada',
    vendida: 'Vendida',
  } satisfies Record<EstadoUnidad, string>,

  /** "Esta unidad está vendida." */
  estadoEnFrase: {
    disponible: 'disponible',
    reservada: 'reservada',
    vendida: 'vendida',
  } satisfies Record<EstadoUnidad, string>,

  extras: {
    balcon: 'Balcón',
    terraza: 'Terraza',
    lavadero: 'Lavadero',
    cochera: 'Cochera',
    baulera: 'Baulera',
    dependencia: 'Dependencia',
  } as Record<string, string>,

  orientaciones: {
    norte: 'Norte',
    este: 'Este',
    sur: 'Sur',
    oeste: 'Oeste',
  } satisfies Record<Orientacion, string>,

  estadoObra: {
    preventa: 'Preventa',
    construccion: 'En construcción',
    terminado: 'Terminado',
  } as Record<string, string>,

  niveles: {
    nombre: (piso: number) => (piso === 0 ? 'Planta baja' : piso < 0 ? `Subsuelo ${-piso}` : `Piso ${piso}`),
    /** para la barra de pisos */
    corto: (piso: number) => (piso === 0 ? 'PB' : piso < 0 ? `S${-piso}` : String(piso)),
    pisos: 'Pisos',
    arriba: 'Piso de arriba',
    abajo: 'Piso de abajo',
    disponiblesDe: (nombre: string, libres: number, total: number) => `${nombre} · ${libres} de ${total} disponibles`,
  },

  menu: {
    proyecto: 'El proyecto',
    plantas: 'Plantas',
    disponibilidad: 'Disponibilidad',
    modo3d: 'Modo 3D',
    amenities: 'Amenities',
    recorridos: 'Recorridos 360',
    galeria: 'Galería',
    video: 'Video',
    obra: 'Avance de obra',
    ubicacion: 'Ubicación',
    blog: 'Blog',
    contacto: 'Contacto',
  },

  marco: {
    abrirMenu: 'Abrir menú',
    cerrarMenu: 'Cerrar menú',
    menuPrincipal: 'Menú principal',
    qr: 'Código QR de esta pantalla',
    qrCorto: 'QR de esta pantalla',
    temaOscuro: 'Pasar a tema oscuro',
    temaClaro: 'Pasar a tema claro',
    telefono: 'Teléfono',
  },

  qr: {
    titulo: 'Escaneá para ver esta pantalla',
    alt: (url: string) => `Código QR de ${url}`,
    copiar: 'Copiar link',
    pdf: 'Descargar PDF',
    generando: 'Generando…',
    error: 'No se pudo generar el PDF. Probá de nuevo.',
  },

  /** folleto PDF del proyecto (lib/folleto): los títulos de cada bloque son los de El proyecto */
  folleto: {
    archivo: (nombre: string) => `${nombre} - Folleto.pdf`,
    escanear: 'Escaneá para recorrerlo online',
    contacto: 'Contacto',
    telefono: 'Teléfono',
    whatsapp: 'WhatsApp',
    email: 'Email',
    showroom: 'Showroom',
    horario: 'Horario',
    web: 'Web',
  },

  consulta: {
    consultanos: 'Consultanos',
    consultarPrecio: 'Consultar precio',
    consultar: 'Consultar',
    titulo: (accion: string, codigo: string) => `${accion} · Unidad ${codigo}`,
    mensajePrecio: (codigo: string) => `Hola, quiero saber el precio y las formas de pago de la unidad ${codigo}.`,
    mensajeInfo: (codigo: string) => `Hola, quiero más información sobre la unidad ${codigo}.`,
    mensajeProyecto: 'Hola, quiero información del proyecto.',
    nombre: 'Nombre',
    telefono: 'Teléfono',
    email: 'Email',
    motivo: 'Motivo',
    elegi: 'Elegí una opción',
    mensaje: 'Mensaje',
    acepto: 'Acepto la',
    politica: 'política de privacidad',
    politicaDefecto: 'Tus datos se usan sólo para responder esta consulta.',
    enviando: 'Enviando…',
    enviar: 'Enviar consulta',
    whatsapp: 'O escribinos por WhatsApp',
    enviadoTitulo: '¡Consulta enviada!',
    enviadoTituloNombre: (nombre: string) => `¡Gracias, ${nombre}!`,
    enviadoTexto: (email: string) => `Recibimos tu consulta. Te vamos a responder a ${email} a la brevedad.`,
    otraConsulta: 'Enviar otra consulta',
    // respuestas del servidor (src/app/(frontend)/acciones.ts)
    gracias: '¡Gracias! Te vamos a contactar pronto.',
    faltaNombre: 'Contanos tu nombre.',
    emailInvalido: 'Revisá el email.',
    faltaPrivacidad: 'Para enviar la consulta tenés que aceptar la política de privacidad.',
    error: 'No pudimos enviar la consulta. Probá de nuevo en unos minutos.',
  },

  filtros: {
    todos: 'Todos',
    masDe: (n: number) => `${n}+`,
    dormitorios: 'Dormitorios',
    soloDisponibles: 'Sólo disponibles',
    colorear: 'Colorear edificio',
    mostrar: 'Mostrar pisos y filtros',
    ocultar: 'Ocultar pisos y filtros',
  },

  escena: {
    plano: 'Plano',
    zoom: 'Zoom',
    acercar: 'Acercar',
    alejar: 'Alejar',
    restablecer: 'Restablecer zoom',
    /** etiqueta accesible de una unidad sobre el plano */
    unidadEstado: (codigo: string, estado: string) => `Unidad ${codigo}, ${estado}`,
  },

  galeria: {
    vacia: 'Las imágenes van a estar disponibles pronto.',
    region: 'Galería de imágenes',
    carrusel: 'carrusel',
    imagen: 'imagen',
    posicion: (i: number, total: number) => `${i} de ${total}`,
    miniaturas: 'Miniaturas',
    verImagen: (i: number) => `Ver imagen ${i}`,
    secciones: 'Secciones',
  },

  giro: {
    vista: (n: number) => `Vista ${n}`,
    vistas: 'Vistas',
    sinImagenes: 'Todavía no hay imágenes del proyecto.',
    izquierda: 'Girar a la izquierda',
    derecha: 'Girar a la derecha',
  },

  planta: {
    sinPlano: 'Todavía no hay plano de este nivel.',
    torres: 'Torres',
    libres: (libres: number, total: number) => `${libres} de ${total} unidades disponibles`,
    tocaPunto: 'Tocá un punto para ver más',
    /** listado para lectores de pantalla */
    itemLista: (codigo: string, superficie: number | null | undefined, estado: string) =>
      `Unidad ${codigo}${superficie ? ` · ${superficie} m²` : ''} · ${estado}`,
    verPlanta: 'Ver planta →',
    librePiso: (n: number) => `${n} disp.`,
    pisosYUnidades: 'Pisos y unidades',
  },

  fachada: {
    kicker: 'Disponibilidad',
    fachada: (orientacion: string) => `Fachada ${orientacion}`,
    esquema: 'Esquema ilustrativo · tocá una unidad para ver su ficha',
    render: 'Tocá una unidad para ver su ficha',
    ver: (vista: string) => `Ver ${vista}`,
    fachadas: 'Fachadas',
  },

  unidad: {
    superficie: 'Superficie',
    total: 'Total',
    interna: 'Interna',
    balcon: 'Balcón',
    ambientes: 'Ambientes',
    dormitorios: 'Dormitorios',
    banos: 'Baños',
    orientacion: 'Orientación',
    noDisponiblePopup: (estado: string) => `Esta unidad está ${estado}. Consultanos por unidades similares.`,
    noDisponibleFicha: (estado: string) => `Esta unidad está ${estado}. Te podemos mostrar unidades similares.`,
  },

  ficha: {
    modos: {
      galeria: 'Galería',
      planta: 'Planta',
      vistas: 'Vistas',
      tour: 'Recorrido',
      video: 'Video',
      ubicacion: 'Ubicación',
    } satisfies Record<PestanaFicha, string>,
    compartir: 'Compartir',
    copiado: 'Link copiado',
    tituloCompartir: (codigo: string, proyecto: string) => `Unidad ${codigo} · ${proyecto}`,
    verUnidad: 'Ver la unidad',
    modo: 'Modo',
    verBrochure: 'Ver brochure',
    brochureGeneral: 'Brochure general',
    disclaimer: 'Disclaimer',
    solicitarInfo: 'Solicitar información',
    whatsapp: (codigo: string, proyecto: string) => `Hola, quiero información sobre la unidad ${codigo} de ${proyecto}.`,
    mostrarDatos: 'Mostrar datos de la unidad',
    ocultarDatos: 'Ocultar datos de la unidad',
    unidadAnterior: (codigo: string) => `Unidad anterior: ${codigo}`,
    unidadSiguiente: (codigo: string) => `Unidad siguiente: ${codigo}`,
    ubicacionEnPlanta: 'Ubicación en planta',
    plantaDe: (codigo: string) => `Planta de la tipología ${codigo}`,
    tipoPlanta: 'Tipo de planta',
    planta2d: 'Planta 2D',
    planta3d: 'Planta 3D',
    esquemaIlustrativo: 'esquema ilustrativo, la planta 3D va a estar disponible próximamente',
    recorridoProximamente: 'Vas a poder recorrer la unidad girando y avanzando como en Street View.',
    recorrido360: 'Recorrido 360',
    videoDe: (codigo: string) => `Video de la tipología ${codigo}`,
    vistaDelMapa: 'Vista del mapa',
    epigrafeVista: (orientacion: string, desde: number, hasta: number) => `Vista ${orientacion} · pisos ${desde}–${hasta}`,
    proximamente: 'Disponible próximamente',
  },

  ubicacion: {
    kicker: 'Ubicación',
    barrio: 'El barrio',
    ilustrado: 'Mapa ilustrado',
    vista: 'Vista',
    cerca: 'Cerca',
    mapas: { mapa: 'Mapa', streetview: 'Street View' },
    iframe: (vista: string, proyecto: string) => `${vista} de ${proyecto}`,
    /** búsqueda en Google Maps de las "Búsquedas de cercanías" */
    cercaDe: (que: string, direccion: string) => `${que} cerca de ${direccion}`,
  },

  proyecto: {
    bajar: 'Deslizá para descubrir',
    guia: 'Scroll',
    kickerManifiesto: 'El proyecto',
    kickerGiro: 'El edificio',
    tituloGiro: 'Miralo desde todos los ángulos',
    girar: 'Girar en 360°',
    kickerCifras: 'En números',
    pisos: 'Pisos',
    unidades: 'Unidades',
    disponibles: 'Disponibles',
    dormitorios: 'Dormitorios',
    /** "1 a 3" */
    rango: (desde: number, hasta: number) => (desde === hasta ? String(desde) : `${desde} a ${hasta}`),
    entrega: 'Entrega',
    kickerAmenities: 'Amenities',
    tituloAmenities: 'Espacios para disfrutar todos los días',
    verAmenities: 'Ver todos los amenities',
    kickerUbicacion: 'Ubicación',
    verUbicacion: 'Ver en el mapa',
    tituloCierre: 'Encontrá tu lugar',
    textoCierre: 'Recorré las plantas, elegí tu unidad y consultanos sin compromiso.',
  },

  amenities: {
    kicker: 'Amenities',
    titulo: 'Pensado para vivirlo',
    cantidad: (n: number) => `${n} ${n === 1 ? 'espacio' : 'espacios'} para compartir`,
    indice: 'Amenities',
    numero: (i: number, total: number) => `${String(i).padStart(2, '0')} / ${String(total).padStart(2, '0')}`,
    tituloCierre: '¿Querés conocerlos en persona?',
    textoCierre: 'Coordiná una visita al showroom o pedinos más información.',
  },

  contacto: {
    kicker: 'Contacto',
    titulo: 'Hablemos de tu próximo hogar',
    whatsapp: 'Respuesta rápida',
    llamanos: 'Llamanos',
    escribinos: 'Escribinos',
    desarrolla: 'Desarrolla',
  },

  blog: {
    kicker: 'Blog',
    titulo: (proyecto: string) => `Novedades de ${proyecto}`,
    bajada: 'Notas sobre el proyecto, el barrio y cómo comprar tu unidad.',
    leer: 'Leer nota',
    volver: 'Todas las notas',
    por: (autor: string) => `Por ${autor}`,
    preguntas: 'Preguntas frecuentes',
    otras: 'Notas relacionadas',
    migas: 'Estás en',
    indice: 'Contenido',
    escritoPor: 'Escrito por',
    compartir: 'Compartir',
    copiarEnlace: 'Copiar enlace',
    enlaceCopiado: 'Enlace copiado',
    compartirEn: (red: string) => `Compartir en ${red}`,
    resumirCon: 'Resumir con',
    pedidoResumen: (url: string, proyecto: string) =>
      `Resumí los puntos clave de esta nota de ${proyecto} y citá la fuente: ${url}`,
    minutos: (n: number) => `${n} min de lectura`,
    tituloCierre: '¿Te quedó alguna duda?',
    textoCierre: 'Escribinos y te respondemos a la brevedad.',
  },

  obra: {
    kicker: 'Avance de obra',
    entregas: 'Entregas',
  },

  recorridos: {
    kicker: 'Recorrido 360',
    sinPanoramas: 'Este recorrido todavía no tiene panoramas.',
    recorridos: 'Recorridos',
    ambientes: 'Ambientes del recorrido',
    // botones del visor de panoramas (Photo Sphere Viewer)
    visor: {
      zoom: 'Zoom',
      zoomOut: 'Alejar',
      zoomIn: 'Acercar',
      moveUp: 'Arriba',
      moveDown: 'Abajo',
      moveLeft: 'Izquierda',
      moveRight: 'Derecha',
      fullscreen: 'Pantalla completa',
      loadError: 'No se pudo cargar el panorama',
    },
  },

  video: {
    sinSoporte: 'Tu navegador no puede reproducir este video.',
    de: (nombre: string) => `Video de ${nombre}`,
  },

  intro: {
    entrega: (fecha: string) => `Entrega ${fecha}`,
    saltar: 'Saltar',
  },

  visor3d: {
    cargando: (nombre: string) => `Cargando ${nombre} en 3D…`,
    hora: 'Hora del día',
    dia: 'Día',
    atardecer: 'Atardecer',
    noche: 'Noche',
    vistas: 'Vistas',
  },

  noEncontrada: {
    titulo: 'Página no encontrada',
    error: 'Error 404',
    mensaje: 'No encontramos esta página',
    detalle: 'Puede que el link esté mal escrito o que la página ya no exista.',
    inicio: 'Volver al inicio',
  },

  meta: {
    enTresD: (nombre: string) => `${nombre} en 3D`,
    unidad: (codigo: string, torre: string) => `Unidad ${codigo} · ${torre}`,
    dormitorios: (n: number) => `${n} dormitorio${n === 1 ? '' : 's'}`,
    orientacion: (o: string) => `orientación ${o}`,
  },
}

export type Textos = typeof es
