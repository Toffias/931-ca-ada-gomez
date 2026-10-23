'use client'

import { useEffect } from 'react'

import { useProyecto } from '@/lib/store-proyecto'
import type { Disponibilidad } from '@/lib/tipos'

const CADA_MS = 60_000

/** carga la disponibilidad que vino con la página y la refresca cada minuto y al volver a la pestaña */
export function SincronizarDisponibilidad({ inicial }: { inicial: Disponibilidad }) {
  const set = useProyecto((s) => s.set)

  useEffect(() => {
    set({ disponibilidad: inicial })
  }, [inicial, set])

  useEffect(() => {
    let vivo = true
    const refrescar = async () => {
      if (document.visibilityState !== 'visible') return
      try {
        const r = await fetch('/api/disponibilidad', { cache: 'no-store' })
        if (r.ok && vivo) set({ disponibilidad: await r.json() })
      } catch {
        /* sin red: queda la última conocida */
      }
    }
    const id = setInterval(refrescar, CADA_MS)
    document.addEventListener('visibilitychange', refrescar)
    return () => {
      vivo = false
      clearInterval(id)
      document.removeEventListener('visibilitychange', refrescar)
    }
  }, [set])

  return null
}
