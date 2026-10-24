import type { ReglaTextura } from './texturas'

// Convenciones entre el modelo de Blender y el visor.
// Si un proyecto nuevo usa otros nombres, alcanza con ajustar este archivo.

/** Extras (propiedades personalizadas de Blender) que identifican cada tipo de objeto. */
export const TIPO = {
  unidad: 'unidad', // extras: { tipo: 'unidad', unidad: '5B', piso: 5 }
  piso: 'piso', //     extras: { tipo: 'piso', piso: 5 }
  techo: 'techo', //   extras: { tipo: 'techo' }
} as const

/** Objetos cuyo nombre empieza así tapan el mouse (evitan seleccionar una unidad detrás de un vecino). */
export const PREFIJOS_OCLUYENTES = ['Vecinos', 'Arboles', 'Entorno']

/** Objetos que no proyectan sombra (suelo). */
export const PREFIJOS_SIN_SOMBRA = ['Calzada', 'Veredas', 'Demarcacion', 'Cordones', 'Parque', 'Suelo']

/** Prefijo de las cámaras exportadas que se ofrecen como vistas. */
export const PREFIJO_CAMARA = 'Cam_'

/** Objeto con extras.luces = [x,y,z, x,y,z, …] (coordenadas Blender) donde van luces de farol de noche. */
export const OBJETO_FAROLES = 'Faroles'

/**
 * Intensidad emisiva de materiales según el modo. Se evalúa en orden; la primera regla que coincide gana.
 * `dia` / `noche` multiplican el emissive del material exportado; `color` le asigna uno si el material no tenía;
 * `transparente` fija la opacidad (vidrios de locales).
 */
export const REGLAS_EMISION: { patron: RegExp; dia: number; noche: number; color?: string; transparente?: number }[] = [
  { patron: /Vidrio_Local/i, dia: 0, noche: 0.5, color: '#ffcc8a', transparente: 0.38 },
  { patron: /Luz_Interior/i, dia: 0, noche: 0 },
  { patron: /Marquesina/i, dia: 1, noche: 5 },
  { patron: /Farol/i, dia: 0, noche: 6 },
  // cielorrasos de balcones: en tiempo real los spots no alumbran lo que tienen alrededor; de noche brillan tenue
  // y cálido, como bañados por sus spots
  { patron: /Cielorraso/i, dia: 0, noche: 0.22, color: '#ffb36b' },
  { patron: /Fachada_Vecinos/i, dia: 0, noche: 0.55 }, // fachadas con textura emisiva de ventanas
]

/**
 * Texturas realistas por material (proyección triplanar, no requieren UVs). La primera regla que coincide gana.
 * `escala` = metros por tile, tomado de la ficha de cada asset de Poly Haven (fotos CC0 en /public/texturas,
 * se bajan y convierten con scripts/texturas/importar_polyhaven.py). Las fotos traen un relieve suave, por eso
 * `normal` va por encima de 1 en revoque y hormigón: si no, a la distancia de las vistas las paredes se ven lisas.
 * Respaldo procedural en /public/texturas-procedurales (scripts/texturas/generar.py).
 */
export const TEXTURAS: ReglaTextura[] = [
  // revoque: painted_plaster_wall (2 m); color calibrado a neutro, el tinte da el tono final
  { patron: /Fachada_Vecinos/i, carpeta: '/texturas/revoque', escala: 2, normal: 1.2, modo: 'detalle', desgaste: true },
  { patron: /Fachada_Crema/i, carpeta: '/texturas/revoque', escala: 2, normal: 2, tinte: '#fff8ea', desgaste: true, girar: true },
  { patron: /Fachada/i, carpeta: '/texturas/revoque', escala: 2, normal: 2, tinte: '#ebe6dd', desgaste: true },
  // revoques de color: el tinte lleva el promedio neutro de la foto al tono de cada uno
  { patron: /Revoque_Gris/i, carpeta: '/texturas/revoque', escala: 2, normal: 2.2, tinte: '#cdc6bc', desgaste: true, girar: true },
  { patron: /Revoque_Muro/i, carpeta: '/texturas/revoque', escala: 2, normal: 2, tinte: '#ddd6cc', desgaste: true, girar: true },
  { patron: /Revoque_Claro/i, carpeta: '/texturas/revoque', escala: 2, normal: 1.6, tinte: '#e6e1d8', desgaste: true, girar: true },
  // madera: oak_veneer_02 (1 m), para listones y revestimientos
  { patron: /Madera/i, carpeta: '/texturas/madera', escala: 1, normal: 1, tinte: '#e0a774', girar: true },
  // hormigón: concrete_wall_008 (2,71 m)
  { patron: /Losa|Cornisa/i, carpeta: '/texturas/hormigon', escala: 2.71, normal: 2, desgaste: true },
  // piedra: granite_tile (2,3 m)
  { patron: /Piedra_Negra/i, carpeta: '/texturas/piedra', escala: 1.2, normal: 1.5, tinte: '#3b3b3b' },
  { patron: /Piedra/i, carpeta: '/texturas/piedra', escala: 2.3, normal: 1.5, desgaste: true },
  { patron: /Techo_Vecinos/i, carpeta: '/texturas/hormigon', escala: 2.71, normal: 1, tinte: '#6b6a66' },
  // vereda: large_square_pattern_01 (3 m)
  { patron: /Vereda/i, carpeta: '/texturas/baldosa', escala: 3, normal: 1.2 },
  // asfalto: asphalt_02 (3 m); el tinte lo baja un poco para que no se vea lavado de día
  { patron: /Asfalto|Calzada/i, carpeta: '/texturas/asfalto', escala: 3, normal: 1, tinte: '#d0d0d0' },
  { patron: /Cordon/i, carpeta: '/texturas/hormigon', escala: 2.71, normal: 1.5 },
]
