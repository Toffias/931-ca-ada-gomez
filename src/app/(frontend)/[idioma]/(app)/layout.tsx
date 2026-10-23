import { Marco } from '@/components/proyecto/Marco'
import { obtenerDisponibilidad, obtenerProyecto } from '@/lib/datos'
import { armarMenu } from '@/lib/navegacion'

// Todas las pantallas salvo la Intro comparten este marco (menú, QR, consulta), que no se remonta al navegar.
export default async function LayoutApp({ children }: { children: React.ReactNode }) {
  const [proyecto, menu, disponibilidad] = await Promise.all([obtenerProyecto(), armarMenu(), obtenerDisponibilidad()])
  return (
    <Marco proyecto={proyecto} menu={menu} disponibilidad={disponibilidad}>
      {children}
    </Marco>
  )
}
