'use client'

import { useEffect, useState } from 'react'

import { useProyecto } from '@/lib/store-proyecto'
import type { Imagen } from '@/lib/tipos'

import { useTextos } from '../ui/ProveedorIdioma'

/** duración mínima para que la barra y la entrada se lean suaves sin parpadeo */
const MIN_MS = 650
/** tope máximo: lo pesado (video de entrada, precargas del giro) sigue bajando en segundo plano */
const MAX_MS = 1800
/** pausa breve al llegar al 100 % antes de levantar la cortina */
const PAUSA_CIEN_MS = 130
/** duración de la transición de abajo hacia arriba (tiene que coincidir con sitio.css) */
const SALIDA_MS = 820

/** a nivel módulo: sale en cada carga fresca de la web, pero no al cambiar de idioma dentro de la app */
let cargaMostrada = false

type Props = {
  nombre: string
  logo?: Imagen | null
  eslogan?: string | null
  desarrolladora?: string | null
}

/**
 * Pantalla de carga inicial: aparece desde el primer frame del HTML mientras cargan las fuentes y la imagen
 * principal, y al terminar se levanta como una cortina de abajo hacia arriba descubriendo el sitio.
 */
export function PantallaCarga({ nombre, logo, eslogan, desarrolladora }: Props) {
  const set = useProyecto((s) => s.set)
  const t = useTextos()
  const [fase, setFase] = useState<'cargando' | 'saliendo' | 'oculta'>(() => (cargaMostrada ? 'oculta' : 'cargando'))
  const [progreso, setProgreso] = useState(0)

  useEffect(() => {
    if (cargaMostrada || window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      cargaMostrada = true
      setFase('oculta')
      set({ cargaLista: true })
      return
    }

    let cancelado = false
    let listo = false
    let cerrando = false
    const inicio = performance.now()
    const timers: ReturnType<typeof setTimeout>[] = []
    let raf = 0

    // espera sólo lo visible del primer cuadro (fuentes + imagen principal); videos y precargas siguen en segundo plano
    const imagenPrincipal = () => {
      const img = document.querySelector<HTMLImageElement>('.intro-imagen, .lp-hero img, .escena img')
      if (!img || (img.complete && img.naturalWidth > 0)) return Promise.resolve()
      return new Promise<void>((resolve) => {
        const fin = () => resolve()
        img.addEventListener('load', fin, { once: true })
        img.addEventListener('error', fin, { once: true })
      })
    }

    const fuentes = document.fonts?.ready.catch(() => {}) ?? Promise.resolve()
    const esperarListo = Promise.all([fuentes, imagenPrincipal()])
    const tope = new Promise<void>((resolve) => {
      timers.push(setTimeout(resolve, MAX_MS))
    })

    Promise.race([esperarListo, tope]).then(() => {
      listo = true
    })

    const concluir = () => {
      if (cancelado || cerrando) return
      cerrando = true
      setProgreso(100)
      timers.push(
        setTimeout(() => {
          if (cancelado) return
          setFase('saliendo')
          timers.push(
            setTimeout(() => {
              if (cancelado) return
              cargaMostrada = true
              setFase('oculta')
              set({ cargaLista: true })
            }, SALIDA_MS),
          )
        }, PAUSA_CIEN_MS),
      )
    }

    const animar = (ahora: number) => {
      if (cancelado || cerrando) return
      const transcurrido = ahora - inicio
      // avanza suave hacia ~88 % mientras carga; al estar listo y cumplir el mínimo, cierra a 100 %
      const curva = 1 - Math.exp(-transcurrido / 420)
      const valor = Math.min(88, Math.round(curva * 92))
      setProgreso((anterior) => (valor > anterior ? valor : anterior))

      if (listo && transcurrido >= MIN_MS) {
        concluir()
        return
      }
      raf = requestAnimationFrame(animar)
    }

    raf = requestAnimationFrame(animar)

    return () => {
      cancelado = true
      cancelAnimationFrame(raf)
      timers.forEach(clearTimeout)
    }
  }, [set])

  if (fase === 'oculta') return null

  return (
    <div
      className={`pantalla-carga${fase === 'saliendo' ? ' saliendo' : ''}`}
      role="status"
      aria-live="polite"
      aria-label={t.comun.cargando}
      aria-hidden={fase === 'saliendo'}
    >
      <div className="pantalla-carga-luz" aria-hidden />
      <div className="pantalla-carga-centro">
        {desarrolladora && <span className="pantalla-carga-kicker">{desarrolladora}</span>}
        <div className="pantalla-carga-marca">
          {logo ? <img src={logo.url} alt={nombre} /> : <strong>{nombre}</strong>}
        </div>
        {eslogan && <p className="pantalla-carga-eslogan">{eslogan}</p>}
        <div className="pantalla-carga-progreso" aria-hidden>
          <div className="pantalla-carga-pista">
            <span className="pantalla-carga-barra" style={{ transform: `scaleX(${Math.max(0.04, progreso / 100)})` }} />
          </div>
          <span className="pantalla-carga-porcentaje">{String(progreso).padStart(2, '0')}%</span>
        </div>
      </div>
    </div>
  )
}
