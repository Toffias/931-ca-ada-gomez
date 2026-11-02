import config from '@payload-config'
import { getPayload } from 'payload'

import { BajaObra } from '@/components/proyecto/SuscripcionObra'
import { textosServidor } from '@/lib/idioma-servidor'
import { buscarPorToken } from '@/lib/suscripcion-obra'

export async function generateMetadata() {
  return { title: (await textosServidor()).suscripcion.bajaTitulo, robots: { index: false } }
}

// Destino del link "Darme de baja" de los mails del avance de obra. Funciona aunque la sección Obra esté apagada.
export default async function PaginaBaja({ searchParams }: { searchParams: Promise<{ t?: string }> }) {
  const { t: token = '' } = await searchParams
  const s = await buscarPorToken(await getPayload({ config }), token)
  return (
    <div className="pantalla pantalla-baja">
      <BajaObra token={token} email={s?.email ?? null} activo={!!s?.activo} />
    </div>
  )
}
