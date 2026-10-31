// Una "escena" es lo que dibuja VisorEscena: un fondo (render o esquema) y formas clickeables encima,
// todo en el mismo sistema de coordenadas (viewBox). Sale del manifest de Blender o, si todavía no hay
// renders, de un esquema generado desde el modelo 3D.

import type { Punto } from '../esquemas/geometria'

export type TipoForma = 'unidad' | 'torre' | 'poi'

export type FormaEscena = {
  /** código de unidad, slug de torre o clave de POI: la misma clave que en Payload y en Blender */
  clave: string
  tipo: TipoForma
  /** torre de la unidad, cuando la escena muestra más de una */
  torre?: string
  /** polígono (esquemas) o path SVG (máscaras de Blender) */
  puntos?: Punto[]
  d?: string
  /** dónde va la etiqueta */
  centro: Punto
  etiqueta?: string
}

export type EsquemaDibujo = {
  /** contornos de losa / silueta, detrás de las formas */
  contornos: Punto[][]
  /** líneas finas (entrepisos en fachada) */
  lineas?: [Punto, Punto][]
  /** línea de suelo (fachada) */
  suelo?: number
  /** rotación de la flecha de norte en grados (planta) */
  norte?: number
  /** barra de escala: cuántos px del viewBox son `metros` */
  escala?: { px: number; metros: number }
  titulo?: string
}

export type ImagenEscena = { url: string; alt?: string }

/** manzana dibujada detrás de un render de planta transparente (ver components/escena/Manzana) */
export type EntornoEscena = {
  /** caja del edificio en el render, en unidades del viewBox: [x0, y0, x1, y1]; y1 es la línea municipal */
  huella: [number, number, number, number]
  /** nombre de la calle del frente */
  calle?: string | null
}

export type Escena = {
  ancho: number
  alto: number
  /** render pre-generado; si falta se dibuja `esquema` */
  fondo?: ImagenEscena | null
  esquema?: EsquemaDibujo | null
  entorno?: EntornoEscena | null
  formas: FormaEscena[]
}
