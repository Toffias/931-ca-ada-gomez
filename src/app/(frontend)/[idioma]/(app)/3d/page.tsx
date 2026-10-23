import { notFound, redirect } from 'next/navigation'

import { obtenerTorres } from '@/lib/datos'
import { rutasServidor } from '@/lib/idioma-servidor'

export default async function TresD() {
  const [primera] = await obtenerTorres()
  if (!primera) notFound()
  redirect((await rutasServidor()).tresD(primera.slug))
}
