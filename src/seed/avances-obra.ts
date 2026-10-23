// Etapas de una obra típica de hormigón armado entre medianeras, con entrega en diciembre de 2027
export const AVANCES: { titulo: string; fecha: string; texto: string; fotos: [archivo: string, epigrafe: string][] }[] = [
  {
    titulo: 'Demolición y limpieza del terreno',
    fecha: '2025-06-12',
    texto:
      'Terminamos la demolición de la construcción existente y el retiro de escombros. Relevamos las medianeras y dejamos el terreno listo para el movimiento de suelos.',
    fotos: [['01-demolicion.jpg', 'El terreno despejado entre medianeras']],
  },
  {
    titulo: 'Excavación y movimiento de suelos',
    fecha: '2025-08-20',
    texto: 'Arrancó la excavación para los subsuelos de cocheras. Se retiraron más de 3.000 m³ de tierra.',
    fotos: [
      ['02-excavacion-1.jpg', 'Movimiento de suelos'],
      ['02-excavacion-2.jpg', 'Excavadora en el fondo de la excavación'],
    ],
  },
  {
    titulo: 'Submuración y fundaciones',
    fecha: '2025-10-15',
    texto: 'Completamos los submuros perimetrales que sostienen las medianeras y empezamos las bases de hormigón armado.',
    fotos: [['03-submuracion.jpg', 'Submuros de contención terminados']],
  },
  {
    titulo: 'Arranque de columnas',
    fecha: '2025-12-10',
    texto: 'Con la platea de fundación hormigonada, arrancan las columnas y los tabiques del núcleo de ascensores.',
    fotos: [['04-columnas.jpg', 'Armaduras de las columnas sobre la platea']],
  },
  {
    titulo: 'Estructura: planta baja y piso 1',
    fecha: '2026-02-18',
    texto: 'Hormigonamos la losa sobre planta baja. La grúa torre ya está en funcionamiento y el obrador, a pleno.',
    fotos: [
      ['05-estructura-1.jpg', 'Estructura de los primeros niveles con la grúa torre'],
      ['05-estructura-2.jpg', 'Acopio de encofrados y puntales'],
    ],
  },
  {
    titulo: 'Estructura: piso 6',
    fecha: '2026-05-08',
    texto: 'La estructura llegó al sexto piso. Avanzamos a un ritmo de una losa cada tres semanas.',
    fotos: [
      ['06-estructura-1.jpg', 'La estructura en altura, con redes de seguridad'],
      ['06-estructura-2.jpg', 'Grúa torre'],
    ],
  },
  {
    titulo: 'Última losa: terraza',
    fecha: '2026-07-14',
    texto: 'Hormigonamos la losa de la terraza y terminamos la estructura. Quedan las armaduras de espera para la sala de máquinas.',
    fotos: [['07-ultima-losa.jpg', 'Losa de la terraza con las armaduras de espera']],
  },
  {
    titulo: 'Mampostería y herrería',
    fecha: '2026-08-25',
    texto: 'Avanza la mampostería de ladrillo en los pisos 1 a 7 y empezaron los trabajos de herrería de balcones y barandas.',
    fotos: [
      ['08-mamposteria.jpg', 'Muros de ladrillo'],
      ['08-herreria.jpg', 'Soldadura de herrería'],
    ],
  },
  {
    titulo: 'Cerramientos de fachada',
    fecha: '2026-09-22',
    texto: 'Comenzó la colocación de carpinterías y los trabajos en altura sobre el frente. Próximo paso: instalaciones y revoques interiores.',
    fotos: [['09-fachada.jpg', 'Trabajos en altura sobre la fachada']],
  },
]
