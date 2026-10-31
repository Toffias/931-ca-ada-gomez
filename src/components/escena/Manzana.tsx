import type { EntornoEscena, FormaEscena } from '@/lib/escena/tipos'

// Lotes vecinos como [desde, hasta, fondo], en anchos del edificio desde su medianera izquierda y su línea municipal.
// No son los reales: es un plano de implantación estilizado alrededor de la caja del edificio en el render.
const LOTES: [number, number, number][] = [
  [-0.68, 0, 1.83],
  [-1.21, -0.68, 2.17],
  [-6, -1.21, 1.73],
  [1, 1.57, 1.98],
  [1.57, 2.1, 2.24],
  [2.1, 7, 1.66],
]
// lotes del otro lado de la manzana, detrás del edificio: [desde, hasta, dónde empiezan]
const FONDOS: [number, number, number][] = [
  [-0.46, 0.36, 2.17],
  [0.36, 1.28, 2.27],
]
const ARBOLES = [-1.02, -0.27, 1.3, 2.05]
const VEREDA = 0.17
const CALZADA = 0.63

/** forma invisible para el encuadre: el frente con la vereda y el nombre de la calle tienen que quedar a la vista */
export function formaCalle({ huella: [x0, , x1, y1] }: EntornoEscena): FormaEscena {
  const abajo = y1 + (VEREDA + CALZADA * 0.6) * (x1 - x0)
  return { clave: 'calle', tipo: 'unidad', puntos: [[x0, y1], [x1, abajo]], centro: [(x0 + x1) / 2, abajo] }
}

// Manzana detrás de un render de planta transparente (pantalla Plantas): lotes vecinos, vereda con árboles y calle.
export function Manzana({ entorno }: { entorno: EntornoEscena }) {
  const [x0, , x1, y1] = entorno.huella
  const w = x1 - x0
  const x = (d: number) => x0 + d * w
  // hacia el contrafrente (arriba en el render) es positivo
  const y = (d: number) => y1 - d * w
  const lejos = 8
  return (
    <g className="manzana" aria-hidden>
      <defs>
        <pattern id="manzana-rayas" width={w * 0.05} height={w * 0.05} patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
          <line x1={0} y1={0} x2={0} y2={w * 0.05} className="manzana-rayado" />
        </pattern>
      </defs>
      <rect x={x(-lejos)} y={y(lejos)} width={w * lejos * 2} height={w * lejos} fill="url(#manzana-rayas)" />
      {LOTES.map(([a, b, f]) => (
        <rect key={`l${a}`} className="manzana-lote" x={x(a)} y={y(f)} width={(b - a) * w} height={f * w} />
      ))}
      {FONDOS.map(([a, b, f]) => (
        <rect key={`f${a}`} className="manzana-lote" x={x(a)} y={y(lejos)} width={(b - a) * w} height={(lejos - f) * w} />
      ))}
      <rect className="manzana-vereda" x={x(-lejos)} y={y1} width={w * lejos * 2} height={VEREDA * w} />
      <line className="manzana-cordon" x1={x(-lejos)} x2={x(lejos)} y1={y(-VEREDA)} y2={y(-VEREDA)} />
      <line className="manzana-eje" x1={x(-lejos)} x2={x(lejos)} y1={y(-VEREDA - CALZADA / 2)} y2={y(-VEREDA - CALZADA / 2)} strokeDasharray={`${w * 0.11} ${w * 0.08}`} />
      {ARBOLES.map((a) => (
        <circle key={a} className="manzana-arbol" cx={x(a)} cy={y(-VEREDA / 2)} r={w * 0.063} />
      ))}
      {entorno.calle && (
        <text className="manzana-calle" x={x(0.5)} y={y(-VEREDA - CALZADA * 0.32)} fontSize={w * 0.082} letterSpacing={w * 0.025} textAnchor="middle" dominantBaseline="central">
          {entorno.calle.toUpperCase()}
        </text>
      )}
    </g>
  )
}
