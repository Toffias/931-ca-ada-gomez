import { type NextRequest, NextResponse } from 'next/server'

import { CABECERA_IDIOMA, COOKIE_IDIOMA, esIdioma, IDIOMA_DEFECTO, type Idioma, idiomaDelNavegador } from '@/lib/idiomas'

// Idioma del sitio público (ver src/lib/idiomas.ts):
// - /en/…: se sirve tal cual y queda guardado en la cookie (así entra el selector de idioma).
// - /es/… (el de defecto con prefijo): redirige a la URL sin prefijo, guardando la elección.
// - sin prefijo: si el visitante eligió otro idioma (cookie) o, la primera vez, su navegador lo prefiere, redirige
//   a /<idioma>/…; si no, se reescribe por dentro a /es/… para caer en app/(frontend)/[idioma].
export function proxy(req: NextRequest) {
  const { pathname } = req.nextUrl
  const primero = pathname.split('/')[1]
  const cookie = req.cookies.get(COOKIE_IDIOMA)?.value

  if (esIdioma(primero)) {
    if (primero === IDIOMA_DEFECTO) {
      const url = req.nextUrl.clone()
      url.pathname = pathname.slice(primero.length + 1) || '/'
      return guardar(NextResponse.redirect(url), primero, cookie)
    }
    return guardar(seguir(req, primero), primero, cookie)
  }

  const elegido = esIdioma(cookie) ? cookie : idiomaDelNavegador(req.headers.get('accept-language'))
  if (elegido && elegido !== IDIOMA_DEFECTO) {
    const url = req.nextUrl.clone()
    url.pathname = `/${elegido}${pathname === '/' ? '' : pathname}`
    return guardar(NextResponse.redirect(url), elegido, cookie)
  }

  const url = req.nextUrl.clone()
  url.pathname = `/${IDIOMA_DEFECTO}${pathname === '/' ? '' : pathname}`
  return seguir(req, IDIOMA_DEFECTO, url)
}

/** sigue a la página (reescribiendo si hace falta) con el idioma en una cabecera para global-not-found */
function seguir(req: NextRequest, idioma: Idioma, reescribirA?: URL) {
  const headers = new Headers(req.headers)
  headers.set(CABECERA_IDIOMA, idioma)
  return reescribirA ? NextResponse.rewrite(reescribirA, { request: { headers } }) : NextResponse.next({ request: { headers } })
}

function guardar(res: NextResponse, idioma: Idioma, actual?: string) {
  if (actual !== idioma) res.cookies.set(COOKIE_IDIOMA, idioma, { path: '/', maxAge: 60 * 60 * 24 * 365, sameSite: 'lax' })
  return res
}

export const config = {
  // todo menos el admin, las APIs, los archivos de Next y cualquier archivo con extensión (sitemap.xml, imágenes…)
  matcher: ['/((?!admin|api|_next|.*\\..*).*)'],
}
