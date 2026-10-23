import type { Metadata } from 'next'
import { headers } from 'next/headers'

import { Documento, viewportDelSitio } from '@/components/Documento'
import { NoEncontrada } from '@/components/proyecto/NoEncontrada'
import { obtenerProyecto } from '@/lib/datos'
import { CABECERA_IDIOMA, esIdioma, IDIOMA_DEFECTO } from '@/lib/idiomas'
import { textosDe } from '@/textos'

import './(frontend)/estilos.css'
import './(frontend)/sitio.css'

// 404 de las URLs que no coinciden con ninguna ruta. Hay dos root layouts (sitio y admin), así que sin este
// archivo Next responde con su HTML de error y arma la página recién en el navegador (sin tema ni título).
// Necesita experimental.globalNotFound en next.config.ts. No recibe params: el idioma lo pasa src/proxy.ts.

async function idiomaPedido() {
  const v = (await headers()).get(CABECERA_IDIOMA)
  return esIdioma(v) ? v : IDIOMA_DEFECTO
}

export async function generateMetadata(): Promise<Metadata> {
  const [p, idioma] = await Promise.all([obtenerProyecto(), idiomaPedido()])
  return { title: `${textosDe(idioma).noEncontrada.titulo} · ${p.nombre}` }
}

export const generateViewport = viewportDelSitio

export default async function GlobalNotFound() {
  const idioma = await idiomaPedido()
  return (
    <Documento idioma={idioma}>
      <NoEncontrada idioma={idioma} />
    </Documento>
  )
}
