import { notFound, redirect } from 'next/navigation'

import { vistasFachada } from '@/lib/escenas'
import { rutasServidor } from '@/lib/idioma-servidor'

export default async function Disponibilidad() {
  const [primera] = await vistasFachada()
  if (!primera) notFound()
  redirect((await rutasServidor()).disponibilidad(primera.clave))
}
