// Nota de ejemplo del blog (proyecto ficticio). Muestra la estructura que mejor citan buscadores y motores de IA:
// respuesta directa en el resumen, subtítulos que son preguntas, datos concretos y preguntas frecuentes al final.

type Bloque = ['p' | 'h2' | 'h3', string]

/** arma el JSON de Lexical (el editor de texto del admin) a partir de párrafos y subtítulos */
export function textoLexical(bloques: Bloque[]) {
  const texto = (t: string) => ({ type: 'text', text: t, format: 0, detail: 0, mode: 'normal', style: '', version: 1 })
  const base = { format: '' as const, indent: 0, version: 1, direction: 'ltr' as const }
  return {
    root: {
      type: 'root',
      ...base,
      children: bloques.map(([tipo, t]) =>
        tipo === 'p'
          ? { type: 'paragraph', ...base, textFormat: 0, textStyle: '', children: [texto(t)] }
          : { type: 'heading', tag: tipo, ...base, children: [texto(t)] },
      ),
    },
  }
}

export const AUTOR = {
  nombre: 'Laura Méndez',
  cargo: 'Gerente comercial de Desarrollos Ejemplo',
  bio: 'Hace más de 12 años que acompaña a familias e inversores en la compra de departamentos en pozo en Buenos Aires. (Persona ficticia de la demo.)',
  perfiles: [{ url: 'https://www.linkedin.com/company/ejemplo' }],
}

export const ARTICULOS = [
  {
    titulo: 'Cómo comprar un departamento en pozo: lo que conviene saber',
    fecha: '2026-09-15',
    categoria: 'Guías de compra',
    resumen:
      'Comprar en pozo permite entrar con un precio más bajo y pagar en cuotas durante la obra. Lo importante es revisar quién desarrolla, cómo se ajustan las cuotas y qué dice el boleto sobre la fecha de entrega.',
    contenido: textoLexical([
      ['h2', '¿Qué significa comprar en pozo?'],
      [
        'p',
        'Es comprar una unidad antes de que el edificio esté terminado. En Torre Cityh la preventa arranca con un anticipo y el saldo se paga en cuotas mensuales hasta la entrega, prevista para diciembre de 2027.',
      ],
      ['h2', '¿Cuánto se ahorra frente a un departamento terminado?'],
      [
        'p',
        'Depende del mercado, pero la diferencia entre el precio de preventa y el de una unidad a estrenar suele ser la principal razón para invertir en esta etapa. En el sitio podés ver la disponibilidad y el precio de cada unidad actualizados.',
      ],
      ['h2', 'Qué revisar antes de firmar'],
      ['h3', 'La desarrolladora'],
      ['p', 'Mirá sus obras anteriores y si las entregó en fecha. Pedí visitar el showroom y la obra.'],
      ['h3', 'El ajuste de las cuotas'],
      ['p', 'Preguntá con qué índice se actualizan (por ejemplo, el de la Cámara Argentina de la Construcción) y cada cuánto.'],
      ['h3', 'El boleto de compraventa'],
      ['p', 'Tiene que indicar la unidad exacta, la superficie, la fecha de entrega estimada y qué pasa si hay demoras.'],
    ]),
    preguntas: [
      {
        pregunta: '¿Se puede comprar en pesos?',
        respuesta: 'El anticipo y las cuotas se pueden acordar en pesos o en dólares. Consultanos por las opciones vigentes.',
      },
      {
        pregunta: '¿Cuándo se entrega Torre Cityh?',
        respuesta: 'La entrega está prevista para diciembre de 2027. El avance de la obra se publica en la sección Avance de obra.',
      },
    ],
  },
]
