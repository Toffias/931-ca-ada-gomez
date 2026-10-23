import { NoEncontrada } from '@/components/proyecto/NoEncontrada'
import { idiomaActual, textosServidor } from '@/lib/idioma-servidor'

export async function generateMetadata() {
  return { title: (await textosServidor()).noEncontrada.titulo }
}

export default async function NoEncontradaApp() {
  return <NoEncontrada idioma={await idiomaActual()} />
}
