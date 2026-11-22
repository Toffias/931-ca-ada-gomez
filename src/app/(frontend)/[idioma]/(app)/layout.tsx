import { Marco } from '@/components/proyecto/Marco'
import { imagen, obtenerAvancesDeObra, obtenerDisponibilidad, obtenerProyecto, obtenerSitio, obtenerTorres } from '@/lib/datos'
import { armarMenu } from '@/lib/navegacion'

// Todas las pantallas comparten este marco (menú, QR, consulta, carga inicial), que no se remonta al navegar.
export default async function LayoutApp({ children }: { children: React.ReactNode }) {
  const [proyecto, menu, disponibilidad, sitio, torres, avances] = await Promise.all([
    obtenerProyecto(),
    armarMenu(),
    obtenerDisponibilidad(),
    obtenerSitio(),
    obtenerTorres(),
    obtenerAvancesDeObra(),
  ])
  const avance = avances[0] ?? null
  const imagenObra =
    avance?.fotos[0] ??
    imagen(sitio.intro?.poster) ??
    torres[0]?.portada ??
    imagen(sitio.galeria?.[0]?.imagen) ??
    null
  const ultimoAvance = avance ? { titulo: avance.titulo, fecha: avance.fecha } : null
  return (
    <Marco
      proyecto={proyecto}
      menu={menu}
      disponibilidad={disponibilidad}
      suscripcionObra={proyecto.secciones.obra}
      imagenObra={imagenObra}
      ultimoAvance={ultimoAvance}
    >
      {children}
    </Marco>
  )
}
