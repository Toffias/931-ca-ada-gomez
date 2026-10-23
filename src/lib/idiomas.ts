// Idiomas del sitio público. El idioma por defecto va sin prefijo (/giro/0) y el resto con el suyo (/en/giro/0);
// src/proxy.ts reescribe las URLs sin prefijo a /<defecto>/… para que todo viva bajo app/(frontend)/[idioma].
// Para sacar el inglés en un proyecto, dejá sólo 'es' en IDIOMAS; para sumar uno, agregalo acá y en src/textos.
// Son también los idiomas del contenido del admin (src/lib/localizacion.ts): cambiarlos pide una migración.

export const IDIOMAS = ['es', 'en'] as const
export type Idioma = (typeof IDIOMAS)[number]
export const IDIOMA_DEFECTO: Idioma = 'es'

/** para Intl (precios, fechas, medidas) */
export const LOCALE: Record<Idioma, string> = { es: 'es-AR', en: 'en-US' }

/** cookie con la elección del visitante (la escribe el proxy al entrar por /<idioma>/…) */
export const COOKIE_IDIOMA = 'idioma'
/** el proxy le pasa el idioma a global-not-found, que no recibe params */
export const CABECERA_IDIOMA = 'x-idioma'

export const esIdioma = (v: unknown): v is Idioma => typeof v === 'string' && (IDIOMAS as readonly string[]).includes(v)

/** antepone el prefijo del idioma a una ruta del sitio ("/giro/0" → "/en/giro/0"); el de defecto queda igual */
export function conIdioma(ruta: string, idioma: Idioma) {
  if (idioma === IDIOMA_DEFECTO) return ruta
  return ruta === '/' ? `/${idioma}` : `/${idioma}${ruta}`
}

/** separa el idioma de una URL del navegador: "/en/giro/0" → { idioma: 'en', ruta: '/giro/0' } */
export function quitarIdioma(pathname: string): { idioma: Idioma; ruta: string } {
  const primero = pathname.split('/')[1]
  if (!esIdioma(primero)) return { idioma: IDIOMA_DEFECTO, ruta: pathname || '/' }
  return { idioma: primero, ruta: pathname.slice(primero.length + 1) || '/' }
}

/** el primero de IDIOMAS que acepte el navegador (Accept-Language), o null */
export function idiomaDelNavegador(acepta: string | null): Idioma | null {
  if (!acepta) return null
  const pedidos = acepta
    .split(',')
    .map((parte) => {
      const [codigo, ...params] = parte.trim().split(';')
      const q = params.find((p) => p.trim().startsWith('q='))
      return { codigo: codigo.toLowerCase().split('-')[0], q: q ? Number(q.trim().slice(2)) || 0 : 1 }
    })
    .filter((p) => p.q > 0)
    .sort((a, b) => b.q - a.q)
  return pedidos.map((p) => p.codigo).find(esIdioma) ?? null
}
