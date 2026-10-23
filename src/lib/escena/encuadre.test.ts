import { describe, expect, it } from 'vitest'

import { encuadreCubrir } from './encuadre'
import type { FormaEscena } from './tipos'

// render 1280×720 con la planta en el centro, como los de renders_plantas.py
const forma = (clave: string, x1: number, y1: number, x2: number, y2: number): FormaEscena => ({
  clave,
  tipo: 'unidad',
  puntos: [[x1, y1], [x2, y1], [x2, y2], [x1, y2]],
  centro: [(x1 + x2) / 2, (y1 + y2) / 2],
})
const escena = { ancho: 1280, alto: 720, formas: [forma('5A', 640, 150, 880, 350), forma('5C', 400, 350, 640, 570)] }
const sinMargen = { arriba: 0, derecha: 0, abajo: 0, izquierda: 0 }

describe('encuadre cubrir-formas', () => {
  it('en escritorio cubre la pantalla sin salirse de la imagen', () => {
    const { vista, escala } = encuadreCubrir(escena, 1600, 900, sinMargen)
    expect(escala).toBeCloseTo(1600 / 1280)
    expect(vista[0]).toBeGreaterThanOrEqual(0)
    expect(vista[1]).toBeGreaterThanOrEqual(0)
    expect(vista[0] + vista[2]).toBeLessThanOrEqual(1280 + 1e-6)
    expect(vista[1] + vista[3]).toBeLessThanOrEqual(720 + 1e-6)
  })

  it('en un celular vertical se aleja lo justo para que entren todas las unidades', () => {
    const m = { arriba: 160, derecha: 12, abajo: 140, izquierda: 12 }
    const { vista, escala } = encuadreCubrir(escena, 375, 812, m)
    expect(escala).toBeLessThan(812 / 720) // menos que "cubrir": si no, se cortan las unidades
    // las formas quedan dentro del lugar libre de la interfaz
    const aPantalla = (x: number, y: number) => [(x - vista[0]) * escala, (y - vista[1]) * escala]
    const [izq, arr] = aPantalla(400, 150)
    const [der, aba] = aPantalla(880, 570)
    expect(izq).toBeGreaterThanOrEqual(m.izquierda - 1)
    expect(der).toBeLessThanOrEqual(375 - m.derecha + 1)
    expect(arr).toBeGreaterThanOrEqual(m.arriba - 1)
    expect(aba).toBeLessThanOrEqual(812 - m.abajo + 1)
  })
})
