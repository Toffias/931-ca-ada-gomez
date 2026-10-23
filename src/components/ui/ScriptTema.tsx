'use client'

import { useLayoutEffect, useSyncExternalStore } from 'react'

import { aplicarTema, SCRIPT_TEMA, temaInicial } from '@/lib/tema'

const suscribir = () => () => {}

// Script anti-destello del tema. Va en el HTML del servidor y se hidrata tal cual; si Next vuelve a montar el
// <html> en el navegador (pasa en los 404), no se vuelve a crear (no correría y React avisa) y en su lugar se
// reaplica el tema, que el remontado deja en el default del servidor.
export function ScriptTema() {
  const enServidorOHidratando = useSyncExternalStore(suscribir, () => false, () => true)

  useLayoutEffect(() => {
    if (document.documentElement.getAttribute('data-tema') !== temaInicial()) aplicarTema(temaInicial())
  }, [])

  return enServidorOHidratando ? <script dangerouslySetInnerHTML={{ __html: SCRIPT_TEMA }} /> : null
}
