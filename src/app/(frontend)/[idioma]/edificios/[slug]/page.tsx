import { permanentRedirect } from 'next/navigation'

import { rutasServidor } from '@/lib/idioma-servidor'

// URL anterior del visor 3D: se mantiene para no romper links compartidos.
export default async function PaginaEdificio({ params }: { params: Promise<{ slug: string }> }) {
  permanentRedirect((await rutasServidor()).tresD((await params).slug))
}
