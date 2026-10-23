import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import React from 'react'

import { Documento, viewportDelSitio } from '@/components/Documento'
import { obtenerProyecto } from '@/lib/datos'
import { esIdioma, IDIOMAS } from '@/lib/idiomas'

import '../estilos.css'
import '../sitio.css'
import '../landing.css'
import '../blog.css'

type Props = { children: React.ReactNode; params: Promise<{ idioma: string }> }

// Cada idioma es un árbol aparte (/es/… llega reescrito desde las URLs sin prefijo, ver src/proxy.ts).
export function generateStaticParams() {
  return IDIOMAS.map((idioma) => ({ idioma }))
}

export async function generateMetadata(): Promise<Metadata> {
  const p = await obtenerProyecto()
  return {
    title: { default: p.nombre, template: `%s · ${p.nombre}` },
    description: p.eslogan ?? p.descripcion ?? undefined,
    metadataBase: process.env.NEXT_PUBLIC_SITE_URL ? new URL(process.env.NEXT_PUBLIC_SITE_URL) : undefined,
    icons: p.favicon ? { icon: p.favicon.url, apple: p.favicon.url } : undefined,
  }
}

export const generateViewport = viewportDelSitio

export default async function Layout({ children, params }: Props) {
  const { idioma } = await params
  if (!esIdioma(idioma)) notFound()
  return <Documento idioma={idioma}>{children}</Documento>
}
