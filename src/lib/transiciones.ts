// Transiciones de profundidad entre pantallas: "entrar" hace zoom hacia el punto tocado (vamos más adentro del
// edificio) y "salir" aleja la cámara. Se anima `.contenido` en dos fases, coordinadas con atributos en <html>:
//   saliendo → la pantalla actual se agranda y se desvanece mientras se precarga la siguiente
//   llegando → al cambiar la URL (ver useLlegada en Marco), la nueva pantalla aparece desde el fondo
// "izquierda"/"derecha" es un cambio lateral (girar alrededor del edificio en Disponibilidad): sólo se mueve el
// lienzo, como si la cámara orbitara, y el resto de la interfaz queda quieta.
// No usa la View Transitions API a propósito: esa congela la pantalla hasta que la ruta nueva termina de cargar.

export type TipoTransicion = 'entrar' | 'salir' | 'izquierda' | 'derecha'

/** lo que tarda la fase "saliendo"; tiene que coincidir con la animación de sitio.css */
const SALIDA_MS = 380
/** la aparición más larga de sitio.css (acercar-llega) */
const LLEGADA_MS = 550
/** si la navegación no llega (misma URL, error), se deja la pantalla como estaba */
const RESCATE_MS = 4000

let rescate = 0

const sinMovimiento = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches

export function transicionar(navegar: () => void, tipo: TipoTransicion, origen?: { x: number; y: number }) {
  const raiz = document.documentElement
  if (sinMovimiento() || raiz.dataset.fase) return navegar()

  const x = origen?.x ?? window.innerWidth / 2
  const y = origen?.y ?? window.innerHeight / 2
  raiz.style.setProperty('--origen-transicion', `${x}px ${y}px`)
  raiz.dataset.transicion = tipo
  raiz.dataset.fase = 'saliendo'

  window.setTimeout(navegar, SALIDA_MS)
  clearTimeout(rescate)
  rescate = window.setTimeout(terminar, RESCATE_MS)
}

/** la URL ya cambió: arranca la aparición de la pantalla nueva */
export function llegar() {
  const raiz = document.documentElement
  if (raiz.dataset.fase !== 'saliendo') return
  raiz.dataset.fase = 'llegando'
  clearTimeout(rescate)
  // por tiempo y no con animationend, que no siempre llega (pestaña en segundo plano, animación cortada)
  rescate = window.setTimeout(terminar, LLEGADA_MS)
}

function terminar() {
  const raiz = document.documentElement
  delete raiz.dataset.transicion
  delete raiz.dataset.fase
  raiz.style.removeProperty('--origen-transicion')
}

/** centro de un elemento, como origen del zoom */
export const centroDe = (el: Element) => {
  const r = el.getBoundingClientRect()
  return { x: r.left + r.width / 2, y: r.top + r.height / 2 }
}
