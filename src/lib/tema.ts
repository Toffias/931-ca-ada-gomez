// Tema claro / oscuro. El admin elige con cuál abre el sitio (Proyecto → Marca → Tema por defecto);
// cada visitante lo puede cambiar y su elección queda guardada en su navegador.
// El tema vive en <html data-tema="claro|oscuro">; los colores de cada uno están en estilos.css.

export type TemaActivo = 'claro' | 'oscuro'

export const CLAVE_TEMA = 'tema'

/**
 * Corre en el <head> antes de pintar, para que no se vea un destello del otro tema.
 * Prioridad: lo que eligió el visitante → el default del admin → (si es "sistema") el del dispositivo.
 */
export const SCRIPT_TEMA = `(function(){var d=document.documentElement,t=null;try{t=localStorage.getItem('${CLAVE_TEMA}')}catch(e){}
if(t!=='claro'&&t!=='oscuro'){t=d.getAttribute('data-tema-defecto');if(t!=='claro'&&t!=='oscuro')t=matchMedia('(prefers-color-scheme: light)').matches?'claro':'oscuro'}
d.setAttribute('data-tema',t)})()`

/** misma prioridad que SCRIPT_TEMA, para reaplicarlo desde React */
export function temaInicial(): TemaActivo {
  const defecto = document.documentElement.getAttribute('data-tema-defecto')
  if (defecto === 'claro' || defecto === 'oscuro') return temaGuardado() ?? defecto
  return temaGuardado() ?? (matchMedia('(prefers-color-scheme: light)').matches ? 'claro' : 'oscuro')
}

export const temaActual = (): TemaActivo =>
  document.documentElement.getAttribute('data-tema') === 'claro' ? 'claro' : 'oscuro'

export function temaGuardado(): TemaActivo | null {
  try {
    const t = localStorage.getItem(CLAVE_TEMA)
    return t === 'claro' || t === 'oscuro' ? t : null
  } catch {
    return null
  }
}

/** aplica el tema y actualiza el color de la barra del navegador en el celular */
export function aplicarTema(tema: TemaActivo, guardar = false) {
  const html = document.documentElement
  html.setAttribute('data-tema', tema)
  if (guardar) {
    try {
      localStorage.setItem(CLAVE_TEMA, tema)
    } catch {}
  }
  const fondo = getComputedStyle(html).getPropertyValue('--fondo').trim()
  if (fondo) document.querySelectorAll('meta[name="theme-color"]').forEach((m) => m.setAttribute('content', fondo))
}
