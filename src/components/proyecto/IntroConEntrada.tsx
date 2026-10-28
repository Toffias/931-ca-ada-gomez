'use client'

import { useRouter } from 'next/navigation'
import { createContext, useContext, useEffect, useRef, useState, type ComponentProps, type MouseEvent, type ReactNode } from 'react'

import { EnlaceProfundo } from '@/components/ui/EnlaceProfundo'
import { useTextos } from '@/components/ui/ProveedorIdioma'
import { centroDe, transicionar } from '@/lib/transiciones'

/** si el video no arranca en este tiempo (red lenta), se entra con la transición de siempre */
const ESPERA_MS = 1500
/** se sale un poco antes del final: el zoom de la transición sigue el avance de la cámara */
const ANTICIPO_S = 0.45
/** se reproduce una vez por sesión; las siguientes veces "Entrar" va directo */
const CLAVE_VISTO = 'intro-entrada-vista'

const Contexto = createContext<((e: MouseEvent<HTMLAnchorElement>) => void) | null>(null)

const visto = () => {
  try {
    return sessionStorage.getItem(CLAVE_VISTO) === '1'
  } catch {
    return false
  }
}

// Intro con video de entrada: al tocar "Entrar" se congela el zoom lento del fondo, el video (que arranca en el
// mismo cuadro que el póster) aparece encima con la misma escala y avanza hasta el hall; al terminar se pasa a la
// pantalla siguiente con la transición "entrar". Se puede saltear con el botón, un clic o Escape.
export function IntroConEntrada({ video, href, children }: { video: string | null; href: string; children: ReactNode }) {
  const router = useRouter()
  const tx = useTextos()
  const raiz = useRef<HTMLDivElement>(null)
  const ref = useRef<HTMLVideoElement>(null)
  const salio = useRef(false)
  const [fase, setFase] = useState<'quieta' | 'entrando' | 'reproduciendo'>('quieta')
  // con ahorro de datos no se baja el video
  const [usar, setUsar] = useState(false)
  useEffect(() => {
    const conexion = (navigator as Navigator & { connection?: { saveData?: boolean } }).connection
    setUsar(!!video && !conexion?.saveData && !visto())
  }, [video])

  const ir = (origen?: { x: number; y: number }) => {
    if (salio.current) return
    salio.current = true
    try {
      sessionStorage.setItem(CLAVE_VISTO, '1')
    } catch {}
    transicionar(() => router.push(href), 'entrar', origen)
  }

  const entrar = (e: MouseEvent<HTMLAnchorElement>) => {
    const v = ref.current
    if (!usar || !v || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return
    e.preventDefault()
    router.prefetch(href)
    const origen = centroDe(e.currentTarget)

    // el video toma la escala que tenga el fondo en ese momento, así el primer cuadro calza
    const fondo = raiz.current?.querySelector<HTMLElement>('.ken-burns')
    if (fondo) {
      fondo.style.animationPlayState = 'paused'
      const estilo = getComputedStyle(fondo)
      v.style.transform = estilo.transform === 'none' ? '' : estilo.transform
      v.style.transformOrigin = estilo.transformOrigin
    }
    setFase('entrando')

    const rescate = window.setTimeout(() => ir(origen), ESPERA_MS)
    v.addEventListener('playing', () => {
      clearTimeout(rescate)
      setFase('reproduciendo')
    }, { once: true })
    v.currentTime = 0
    v.play().catch(() => {
      clearTimeout(rescate)
      ir(origen)
    })
  }

  // cerca del final (o si el visitante saltea) se va a la pantalla siguiente
  useEffect(() => {
    const v = ref.current
    if (fase !== 'reproduciendo' || !v) return
    const revisar = () => {
      if (v.duration && v.duration - v.currentTime <= ANTICIPO_S) ir()
    }
    const saltar = (e: KeyboardEvent) => {
      if (e.key === 'Escape' || e.key === 'Enter' || e.key === ' ') ir()
    }
    v.addEventListener('timeupdate', revisar)
    v.addEventListener('ended', revisar)
    window.addEventListener('keydown', saltar)
    return () => {
      v.removeEventListener('timeupdate', revisar)
      v.removeEventListener('ended', revisar)
      window.removeEventListener('keydown', saltar)
    }
  })

  return (
    <div
      ref={raiz}
      className={`pantalla intro${fase !== 'quieta' ? ' entrando' : ''}`}
      onClick={fase === 'reproduciendo' ? () => ir() : undefined}
    >
      <Contexto.Provider value={entrar}>{children}</Contexto.Provider>
      {usar && video && (
        <video
          ref={ref}
          className={`intro-fondo intro-entrada${fase === 'reproduciendo' ? ' visible' : ''}`}
          src={video}
          muted
          playsInline
          preload="auto"
          aria-hidden
        />
      )}
      {fase === 'reproduciendo' && (
        <button type="button" className="intro-saltar" onClick={() => ir()}>
          {tx.intro.saltar}
        </button>
      )}
    </div>
  )
}

/** "Entrar" de la Intro: si hay video de entrada lo reproduce antes de navegar */
export function BotonEntrar(props: ComponentProps<typeof EnlaceProfundo>) {
  const entrar = useContext(Contexto)
  return (
    <EnlaceProfundo
      {...props}
      onClick={(e) => {
        props.onClick?.(e)
        entrar?.(e)
      }}
    />
  )
}
