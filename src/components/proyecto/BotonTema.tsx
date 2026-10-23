'use client'

import { useEffect, useState } from 'react'

import { aplicarTema, temaActual, temaGuardado, type TemaActivo } from '@/lib/tema'

import { Icono } from '../ui/Icono'
import { useTextos } from '../ui/ProveedorIdioma'

// Alterna claro / oscuro. El ícono lo elige el CSS según <html data-tema>, así no depende de hidratar.
export function BotonTema({ defecto }: { defecto: 'claro' | 'oscuro' | 'sistema' }) {
  const [tema, setTema] = useState<TemaActivo | null>(null)
  const t = useTextos().marco

  useEffect(() => {
    setTema(temaActual())
    aplicarTema(temaActual())
    // "automático" sigue al dispositivo mientras el visitante no haya elegido uno
    if (defecto !== 'sistema' || temaGuardado()) return
    const mq = matchMedia('(prefers-color-scheme: light)')
    const cambio = () => {
      if (temaGuardado()) return
      const t = mq.matches ? 'claro' : 'oscuro'
      aplicarTema(t)
      setTema(t)
    }
    mq.addEventListener('change', cambio)
    return () => mq.removeEventListener('change', cambio)
  }, [defecto])

  const alternar = () => {
    const t = temaActual() === 'claro' ? 'oscuro' : 'claro'
    aplicarTema(t, true)
    setTema(t)
  }

  const etiqueta = tema === 'claro' ? t.temaOscuro : t.temaClaro
  return (
    <button className="boton-icono boton-tema" aria-label={etiqueta} title={etiqueta} onClick={alternar}>
      <Icono nombre="sol" className="icono-sol" />
      <Icono nombre="luna" className="icono-luna" />
    </button>
  )
}
