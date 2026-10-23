import fs from 'fs'
import path from 'path'
import { describe, expect, it } from 'vitest'

import { esquemaFachada, carasConUnidades } from './fachada'
import { area, cascoConvexo, centroide } from './geometria'
import { leerJSONGLTF, objetosDelModelo } from './modelo'
import { esquemaPlanta, pisosDelModelo } from './planta'

const glb = fs.readFileSync(path.resolve(__dirname, '../../seed/assets/torre-cityh.glb'))
const objetos = objetosDelModelo(leerJSONGLTF(glb))

describe('geometría', () => {
  it('casco convexo de un cuadrado con un punto interior', () => {
    const h = cascoConvexo([[0, 0], [2, 0], [2, 2], [0, 2], [1, 1]])
    expect(h).toHaveLength(4)
    expect(Math.abs(area(h))).toBeCloseTo(4)
    expect(centroide(h)).toEqual([1, 1])
  })
})

describe('esquemas desde el modelo de ejemplo', () => {
  it('encuentra los 9 pisos con unidades', () => {
    expect(pisosDelModelo(objetos)).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9])
  })

  it('planta del piso 5: 4 unidades que no se pisan, norte arriba', () => {
    const e = esquemaPlanta(objetos, 5, 8)
    expect(e.formas.map((f) => f.clave)).toEqual(['5A', '5B', '5C', '5D'])
    const [a, b] = e.formas
    // 5A está al noreste (z < 0 en glTF) y 5B al sureste: 5A arriba de 5B en pantalla
    expect(a.centro[1]).toBeLessThan(b.centro[1])
    for (const f of e.formas) {
      expect(f.centro[0]).toBeGreaterThan(0)
      expect(f.centro[0]).toBeLessThan(e.ancho)
      expect(f.centro[1]).toBeLessThan(e.alto)
    }
    expect(e.esquema?.contornos[0].length).toBeGreaterThanOrEqual(4)
  })

  it('fachada norte: dos unidades por piso, las de arriba más arriba en pantalla', () => {
    expect(carasConUnidades(objetos)).toEqual(['norte', 'este', 'sur', 'oeste'])
    const e = esquemaFachada(objetos, 'norte', 8)
    expect(e.formas).toHaveLength(18)
    const f9 = e.formas.find((f) => f.clave === '9A')!
    const f1 = e.formas.find((f) => f.clave === '1A')!
    expect(f9.centro[1]).toBeLessThan(f1.centro[1])
    expect(e.formas.every((f) => /[AD]$/.test(f.clave))).toBe(true)
  })
})

describe('máscaras SVG de Blender', async () => {
  const { leerMascara } = await import('../escena/mascara')
  it('lee paths, polygons y rects con su clave', () => {
    const m = leerMascara(`<svg viewBox="0 0 3840 2160">
      <path data-unidad="5B" data-torre="torre-a" d="M10 10 L30 10 L30 30 L10 30 Z"/>
      <polygon data-torre="torre-b" points="0,0 10,0 10,10 0,10"/>
      <rect data-poi="piscina" x="100" y="50" width="20" height="10"/>
      <path d="M0 0"/>
    </svg>`)!
    expect([m.ancho, m.alto]).toEqual([3840, 2160])
    expect(m.formas.map((f) => [f.tipo, f.clave, f.torre])).toEqual([
      ['unidad', '5B', 'torre-a'],
      ['torre', 'torre-b', undefined],
      ['poi', 'piscina', undefined],
    ])
    expect(m.formas[2].centro).toEqual([110, 55])
  })
})

describe('recorte de una unidad', async () => {
  const { recortarUnidad } = await import('../escena/recorte')
  it('centra la unidad y calcula sus medidas en metros', () => {
    const r = recortarUnidad(esquemaPlanta(objetos, 5, 8), '5b')!
    expect(r.formas).toHaveLength(1)
    const [frente, fondo] = r.medidas!
    // cada unidad del ejemplo mide ~1,025 × 0,952 unidades Blender × 8 m (menos el muro)
    expect(frente).toBeGreaterThan(7)
    expect(frente).toBeLessThan(8.3)
    expect(fondo).toBeGreaterThan(6.5)
    expect(fondo).toBeLessThan(7.7)
  })
})
