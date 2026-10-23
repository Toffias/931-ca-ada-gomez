import { PantallaObra } from '@/components/proyecto/PantallaObra'
import { obtenerAvancesDeObra } from '@/lib/datos'
import { textosServidor } from '@/lib/idioma-servidor'
import { exigirSeccion } from '@/lib/navegacion'

export const revalidate = 60

export async function generateMetadata() {
  return { title: (await textosServidor()).menu.obra }
}

export default async function PaginaObra() {
  await exigirSeccion('obra')
  const avances = await obtenerAvancesDeObra()
  return <PantallaObra avances={avances} />
}
