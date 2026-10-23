import * as THREE from 'three'

// Hora del día del visor: 0 = día, 0,5 = atardecer, 1 = noche. La barrita escribe el objetivo en el store y la
// escena lo sigue con un suavizado, leyendo `hora` en cada cuadro (sin re-renderizar React). Todo lo que depende de
// la hora son intensidades y colores: las luces y los materiales no cambian, así que no se recompila ningún shader.

export type ParametrosHora = {
  /** elevación del sol que se ve en el cielo, en grados (baja del valor del edificio al horizonte y más abajo) */
  elevacion: number
  turbidez: number
  rayleigh: number
  mie: number
  sol: number
  colorSol: THREE.Color
  hemi: number
  colorHemi: THREE.Color
  niebla: THREE.Color
  exposicion: number
  entorno: 'dia' | 'atardecer' | 'noche'
  intensidadEntorno: number
  /** opacidad del domo nocturno, que tapa el cielo */
  domo: number
  /** 0–1: ventanas encendidas, emisivos y faroles */
  luces: number
  bloom: number
  colorNubes: THREE.Color
  opacidadNubes: number
}

const c = (hex: string) => new THREE.Color(hex)
const COLORES = {
  sol: [c('#fff0dc'), c('#ffb888'), c('#ffb888')],
  hemi: [c('#bcd3ff'), c('#c9c0cc'), c('#5d73b3')],
  niebla: [c('#b9c7d8'), c('#cdb9b0'), c('#1a2442')],
  nubes: [c('#ffffff'), c('#d9a896'), c('#56627f')],
}

const { lerp, smoothstep } = THREE.MathUtils
/** interpola entre el valor de día, el de atardecer y el de noche */
const tres = (h: number, dia: number, atardecer: number, noche: number) =>
  h < 0.5 ? lerp(dia, atardecer, h * 2) : lerp(atardecer, noche, (h - 0.5) * 2)
const tresColor = (out: THREE.Color, h: number, [dia, atardecer, noche]: THREE.Color[]) =>
  h < 0.5 ? out.lerpColors(dia, atardecer, h * 2) : out.lerpColors(atardecer, noche, (h - 0.5) * 2)

export const hora = {
  actual: 0,
  p: {
    colorSol: new THREE.Color(),
    colorHemi: new THREE.Color(),
    niebla: new THREE.Color(),
    colorNubes: new THREE.Color(),
  } as ParametrosHora,
}

/** Calcula los parámetros de la hora `h` en `out` (sin crear objetos: corre en cada cuadro). */
export function calcularHora(h: number, elevacionDia: number, out: ParametrosHora = hora.p) {
  out.elevacion = tres(h, elevacionDia, 6, -12)
  out.turbidez = tres(h, 3.5, 5, 5)
  out.rayleigh = tres(h, 1.4, 1.8, 1.8)
  out.mie = tres(h, 0.004, 0.006, 0.006)
  // el sol se apaga antes de que el cielo quede negro, así la luz no llega de abajo del horizonte
  out.sol = lerp(4.2, 2.1, smoothstep(h, 0, 0.5)) * (1 - smoothstep(h, 0.5, 0.78))
  tresColor(out.colorSol, h, COLORES.sol)
  out.hemi = tres(h, 0.25, 0.22, 0.15)
  tresColor(out.colorHemi, h, COLORES.hemi)
  tresColor(out.niebla, h, COLORES.niebla)
  out.exposicion = tres(h, 0.62, 0.68, 1.1)
  out.entorno = h < 0.3 ? 'dia' : h < 0.72 ? 'atardecer' : 'noche'
  out.intensidadEntorno = tres(h, 0.35, 0.28, 0.6)
  out.domo = smoothstep(h, 0.6, 0.95)
  out.luces = smoothstep(h, 0.42, 0.85)
  out.bloom = 0.32 * smoothstep(h, 0.55, 0.9)
  tresColor(out.colorNubes, h, COLORES.nubes)
  out.opacidadNubes = tres(h, 1, 0.95, 0.18)
  return out
}

/** Dirección del sol. Los ángulos están en convención Blender (azimut desde +X, antihorario visto desde arriba). */
export function direccionSol(elev: number, az: number, out = new THREE.Vector3()) {
  const e = THREE.MathUtils.degToRad(elev)
  const a = THREE.MathUtils.degToRad(az)
  return out.set(Math.cos(e) * Math.cos(a), Math.sin(e), -Math.cos(e) * Math.sin(a)).normalize()
}

// valores de día desde el arranque, para quien los lea antes del primer cuadro
calcularHora(0, 45)
