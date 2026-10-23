import type { Viewport } from 'next'
import React from 'react'
import { Cormorant_Garamond, Inter, Manrope } from 'next/font/google'

import { ProveedorIdioma } from '@/components/ui/ProveedorIdioma'
import { ScriptTema } from '@/components/ui/ScriptTema'
import { obtenerProyecto } from '@/lib/datos'
import type { Idioma } from '@/lib/idiomas'

// Las tres tipografías que se pueden elegir en el admin (Proyecto → Marca). next/font las sirve desde el propio sitio.
const inter = Inter({ subsets: ['latin'], variable: '--fuente-inter', display: 'swap' })
const manrope = Manrope({ subsets: ['latin'], variable: '--fuente-manrope', display: 'swap' })
const cormorant = Cormorant_Garamond({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700'],
  variable: '--fuente-cormorant',
  display: 'swap',
})

/** color de la barra del navegador según el tema */
export async function viewportDelSitio(): Promise<Viewport> {
  const p = await obtenerProyecto()
  const themeColor =
    p.tema === 'sistema'
      ? [
          { media: '(prefers-color-scheme: light)', color: p.fondoClaro },
          { media: '(prefers-color-scheme: dark)', color: p.fondo },
        ]
      : p.tema === 'claro'
        ? p.fondoClaro
        : p.fondo
  return { themeColor, width: 'device-width', initialScale: 1, viewportFit: 'cover' }
}

// <html> del sitio con idioma, marca, tipografía y tema del admin. Lo comparten el layout y global-not-found.tsx,
// que no pasa por ningún layout.
export async function Documento({ idioma, children }: { idioma: Idioma; children: React.ReactNode }) {
  const p = await obtenerProyecto()
  const estilo = {
    '--acento': p.acento,
    '--fondo-oscuro': p.fondo,
    '--fondo-claro': p.fondoClaro,
    '--fuente': `var(--fuente-${p.tipografia}), ui-sans-serif, system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif`,
  } as React.CSSProperties
  // data-tema sale del servidor con el default del admin (sin JS, "automático" queda oscuro);
  // ScriptTema lo corrige antes de pintar con la elección del visitante o la del dispositivo.
  return (
    <html
      lang={idioma}
      className={`${inter.variable} ${manrope.variable} ${cormorant.variable}`}
      style={estilo}
      data-tema={p.tema === 'claro' ? 'claro' : 'oscuro'}
      data-tema-defecto={p.tema}
      suppressHydrationWarning
    >
      <head>
        <ScriptTema />
      </head>
      <body>
        <ProveedorIdioma idioma={idioma}>{children}</ProveedorIdioma>
      </body>
    </html>
  )
}
