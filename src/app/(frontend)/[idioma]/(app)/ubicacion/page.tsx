import { redirect } from 'next/navigation'

import { rutasServidor } from '@/lib/idioma-servidor'

export default async function Ubicacion() {
  redirect((await rutasServidor()).ubicacion('info'))
}
