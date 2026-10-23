// Idioma de la página que se está armando, para Server Components y utilidades del servidor.
// Sale del segmento app/(frontend)/[idioma] vía next/root-params, así no hay que pasarlo de página en página.
// No sirve en Server Actions ni Route Handlers (ahí se manda el idioma explícito y, si hay que leer contenido del
// admin en ese idioma, se envuelve con enIdioma) ni en global-not-found (lee la cabecera que pone el proxy).

import { AsyncLocalStorage } from 'node:async_hooks'
import { idioma as idiomaDeRuta } from 'next/root-params'

import { textosDe } from '@/textos'

import { esIdioma, IDIOMA_DEFECTO, type Idioma } from './idiomas'
import { rutasDe } from './rutas'

const idiomaForzado = new AsyncLocalStorage<Idioma>()

/** corre fn con ese idioma como actual: p. ej. el folleto (Route Handler) lee datos.ts en el idioma pedido */
export const enIdioma = <T,>(idioma: Idioma, fn: () => T): T => idiomaForzado.run(idioma, fn)

export async function idiomaActual(): Promise<Idioma> {
  const forzado = idiomaForzado.getStore()
  if (forzado) return forzado
  try {
    const v: unknown = await idiomaDeRuta()
    if (esIdioma(v)) return v
  } catch {
    /* fuera del árbol de [idioma] */
  }
  return IDIOMA_DEFECTO
}

export const textosServidor = async () => textosDe(await idiomaActual())
export const rutasServidor = async () => rutasDe(await idiomaActual())
