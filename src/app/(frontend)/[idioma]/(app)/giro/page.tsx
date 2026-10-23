import { redirect } from 'next/navigation'

import { rutasServidor } from '@/lib/idioma-servidor'

export default async function Giro() {
  redirect((await rutasServidor()).giro(0))
}
