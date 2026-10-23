import { ReproductorVideo } from '@/components/proyecto/ReproductorVideo'
import { obtenerProyecto, obtenerSitio, obtenerTorres } from '@/lib/datos'
import { textosServidor } from '@/lib/idioma-servidor'
import { exigirSeccion } from '@/lib/navegacion'

export const revalidate = 60

export async function generateMetadata() {
  return { title: (await textosServidor()).menu.video }
}

// Video institucional (spec N).
export default async function PaginaVideo() {
  await exigirSeccion('video')
  const [sitio, proyecto, torres, t] = await Promise.all([obtenerSitio(), obtenerProyecto(), obtenerTorres(), textosServidor()])
  return (
    <div className="pantalla pantalla-video">
      <ReproductorVideo url={sitio.video!} poster={torres[0]?.portada?.grande} titulo={t.video.de(proyecto.nombre)} />
    </div>
  )
}
