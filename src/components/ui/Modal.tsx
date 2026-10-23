'use client'

import { useEffect, useRef } from 'react'

import { Icono } from './Icono'
import { useTextos } from './ProveedorIdioma'

type Props = {
  abierto: boolean
  onCerrar: () => void
  titulo: string
  children: React.ReactNode
  angosto?: boolean
}

/** <dialog> nativo: trae foco atrapado, Escape y fondo */
export function Modal({ abierto, onCerrar, titulo, children, angosto }: Props) {
  const ref = useRef<HTMLDialogElement>(null)
  const t = useTextos()

  useEffect(() => {
    const d = ref.current
    if (!d) return
    if (abierto && !d.open) d.showModal()
    if (!abierto && d.open) d.close()
  }, [abierto])

  return (
    <dialog
      ref={ref}
      className={`modal${angosto ? ' angosto' : ''}`}
      onClose={onCerrar}
      onClick={(e) => e.target === ref.current && onCerrar()}
      aria-label={titulo}
    >
      {abierto && (
        <div className="modal-caja">
          <div className="modal-cabecera">
            <h2>{titulo}</h2>
            <button className="boton-icono" aria-label={t.comun.cerrar} onClick={onCerrar}>
              <Icono nombre="cerrar" />
            </button>
          </div>
          {children}
        </div>
      )}
    </dialog>
  )
}
