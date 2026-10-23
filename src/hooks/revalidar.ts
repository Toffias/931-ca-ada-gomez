import type { CollectionAfterChangeHook, CollectionAfterDeleteHook, GlobalAfterChangeHook } from 'payload'

// Cuando alguien cambia algo en el admin (p. ej. una unidad pasa a "vendida"), se regeneran las páginas.
// Fuera de Next (seed, scripts) revalidatePath no está disponible y simplemente se ignora.
async function revalidarTodo() {
  try {
    const { revalidatePath } = await import('next/cache')
    revalidatePath('/', 'layout')
  } catch {
    /* no estamos dentro de Next.js */
  }
}

export const revalidarDespuesDeCambio: CollectionAfterChangeHook = async ({ doc }) => {
  await revalidarTodo()
  return doc
}
export const revalidarDespuesDeBorrar: CollectionAfterDeleteHook = async ({ doc }) => {
  await revalidarTodo()
  return doc
}
export const revalidarGlobal: GlobalAfterChangeHook = async ({ doc }) => {
  await revalidarTodo()
  return doc
}
