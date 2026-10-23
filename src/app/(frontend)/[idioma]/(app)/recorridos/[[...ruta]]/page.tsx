import { notFound } from 'next/navigation'

import { PantallaRecorridos } from '@/components/proyecto/PantallaRecorridos'
import { obtenerRecorridos } from '@/lib/datos'
import { textosServidor } from '@/lib/idioma-servidor'
import { exigirSeccion } from '@/lib/navegacion'

export const revalidate = 60

export async function generateMetadata() {
  return { title: (await textosServidor()).menu.recorridos }
}

// Recorridos 360 (spec L): /recorridos/<slug>/<punto>
export default async function PaginaRecorridos({ params }: { params: Promise<{ ruta?: string[] }> }) {
  await exigirSeccion('recorridos')
  const { ruta = [] } = await params
  const recorridos = await obtenerRecorridos()
  const actual = ruta[0] ? recorridos.find((r) => r.slug === ruta[0]) : recorridos[0]
  if (!actual || ruta.length > 2 || (ruta[1] && !actual.puntos.some((p) => p.clave === ruta[1]))) notFound()
  return <PantallaRecorridos recorridos={recorridos} actual={actual} punto={ruta[1]} />
}
