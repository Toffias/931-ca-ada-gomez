'use client'

import dynamic from 'next/dynamic'

import type { VisorProps } from './Visor'

// El visor sólo corre en el navegador (WebGL). Se carga aparte para no sumar Three.js al resto del sitio.
const Visor = dynamic(() => import('./Visor'), {
  ssr: false,
  loading: () => <div className="visor visor-placeholder" />,
})

export function VisorCliente(props: VisorProps) {
  return <Visor {...props} />
}
