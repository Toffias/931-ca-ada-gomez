'use client'

import { useEffect, useRef } from 'react'

import { useProyecto } from '@/lib/store-proyecto'

type Props = { className?: string; children: React.ReactNode }

// Contenedor con scroll de las landings (El proyecto, Amenities). Sin librerías: en cada frame de scroll escribe en
// cada `[data-progreso]` una variable `--p` de 0 a 1 y el CSS hace el resto (parallax, fundidos, zoom):
// - "fijo": sección alta con un hijo sticky; 0 cuando su borde de arriba toca el de la pantalla, 1 cuando el de abajo.
// - "vista": 0 cuando asoma por abajo, 1 cuando sale por arriba.
// - "salida": 0 arriba de todo, 1 cuando terminó de salir por arriba (el hero).
// Un "fijo" con `data-horizontal` alarga su alto para que su `[data-pista]` recorra todo su ancho en `--dx`.
// Los `[data-revelar]` reciben `.visible` una sola vez, al entrar en pantalla.
export function Desplazamiento({ className, children }: Props) {
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const raiz = ref.current
    if (!raiz) return
    raiz.classList.add('con-js')
    const elementos = [...raiz.querySelectorAll<HTMLElement>('[data-progreso]')]
    const horizontales = elementos.filter((el) => el.hasAttribute('data-horizontal'))
    let frame = 0

    const medir = () => {
      frame = 0
      const alto = raiz.clientHeight
      const origen = raiz.getBoundingClientRect().top
      // avance de toda la página, para la guía de scroll
      raiz.style.setProperty('--avance', (raiz.scrollTop / Math.max(1, raiz.scrollHeight - alto)).toFixed(4))
      for (const el of elementos) {
        const r = el.getBoundingClientRect()
        const arriba = r.top - origen
        if (arriba > alto * 1.5 || r.bottom - origen < -alto * 0.5) continue // lejos: no hace falta tocarlo
        const modo = el.dataset.progreso
        const p =
          modo === 'fijo' ? -arriba / Math.max(1, r.height - alto) : modo === 'salida' ? -arriba / Math.max(1, r.height) : (alto - arriba) / (alto + r.height)
        el.style.setProperty('--p', Math.min(1, Math.max(0, p)).toFixed(4))
      }
    }
    const pedir = () => {
      if (!frame) frame = requestAnimationFrame(medir)
    }

    // las pistas horizontales definen el alto de su sección: tanto scroll vertical como ancho les sobra
    const ajustar = () => {
      for (const el of horizontales) {
        const pista = el.querySelector<HTMLElement>('[data-pista]')
        const sobra = pista ? Math.max(0, pista.scrollWidth - raiz.clientWidth) : 0
        el.style.height = `${raiz.clientHeight + sobra}px`
        el.style.setProperty('--dx', `${-sobra}px`)
      }
      medir()
    }

    const revelar = new IntersectionObserver(
      (entradas) => {
        for (const e of entradas)
          if (e.isIntersecting) {
            e.target.classList.add('visible')
            revelar.unobserve(e.target)
          }
      },
      { root: raiz, rootMargin: '0px 0px -10% 0px' },
    )
    raiz.querySelectorAll('[data-revelar]').forEach((el) => revelar.observe(el))

    const tamano = new ResizeObserver(ajustar)
    tamano.observe(raiz)
    raiz.addEventListener('scroll', pedir, { passive: true })
    ajustar()
    return () => {
      cancelAnimationFrame(frame)
      revelar.disconnect()
      tamano.disconnect()
      raiz.removeEventListener('scroll', pedir)
    }
  }, [])

  return (
    <div ref={ref} className={`pantalla landing ${className ?? ''}`}>
      {children}
    </div>
  )
}

/** botón que abre el modal de consulta del marco */
export function BotonConsulta({ children, className = 'boton' }: { children: React.ReactNode; className?: string }) {
  const set = useProyecto((s) => s.set)
  return (
    <button className={className} onClick={() => set({ consulta: { origen: 'contacto' } })}>
      {children}
    </button>
  )
}

/** número que cuenta desde 0 la primera vez que entra en pantalla; lo que no es número se muestra tal cual */
export function Cifra({ valor }: { valor: number | string }) {
  const ref = useRef<HTMLSpanElement>(null)
  useEffect(() => {
    const el = ref.current
    if (!el || typeof valor !== 'number' || matchMedia('(prefers-reduced-motion: reduce)').matches) return
    let frame = 0
    el.textContent = '0'
    const io = new IntersectionObserver(([e]) => {
      if (!e.isIntersecting) return
      io.disconnect()
      const inicio = performance.now()
      const paso = (ahora: number) => {
        const k = Math.min(1, (ahora - inicio) / 1400)
        el.textContent = String(Math.round(valor * (1 - (1 - k) ** 3)))
        if (k < 1) frame = requestAnimationFrame(paso)
      }
      frame = requestAnimationFrame(paso)
    })
    io.observe(el)
    return () => {
      io.disconnect()
      cancelAnimationFrame(frame)
    }
  }, [valor])
  return <span ref={ref}>{valor}</span>
}

/** texto que se va encendiendo palabra por palabra con el `--p` de la sección que lo contiene */
export function TextoEncendido({ texto, className }: { texto: string; className?: string }) {
  const palabras = texto.split(/\s+/).filter(Boolean)
  return (
    <p className={`texto-encendido ${className ?? ''}`} style={{ '--n': palabras.length } as React.CSSProperties}>
      {palabras.map((w, i) => (
        <span key={i} style={{ '--i': i } as React.CSSProperties}>
          {w}{' '}
        </span>
      ))}
    </p>
  )
}
