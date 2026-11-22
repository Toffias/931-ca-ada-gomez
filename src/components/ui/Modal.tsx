'use client'

import { useEffect, useRef } from 'react'

import { Icono, type NombreIcono } from './Icono'
import { useTextos } from './ProveedorIdioma'

type Props = {
  abierto: boolean
  onCerrar: () => void
  titulo: string
  icono?: NombreIcono
  children: React.ReactNode
  angosto?: boolean
  clase?: string
  sinCabecera?: boolean
}

/** <dialog> nativo: trae foco atrapado, Escape y fondo */
export function Modal({ abierto, onCerrar, titulo, icono, children, angosto, clase, sinCabecera }: Props) {
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
      className={`modal${angosto ? ' angosto' : ''}${clase ? ` ${clase}` : ''}`}
      onClose={onCerrar}
      onClick={(e) => e.target === ref.current && onCerrar()}
      aria-label={titulo}
    >
      {abierto &&
        (sinCabecera ? (
          children
        ) : (
          <div className="modal-caja">
            <div className="modal-cabecera">
              {icono ? (
                <div className="modal-titulo-con-icono">
                  <span className="modal-icono" aria-hidden>
                    <Icono nombre={icono} tamano={18} />
                  </span>
                  <h2>{titulo}</h2>
                </div>
              ) : (
                <h2>{titulo}</h2>
              )}
              <button className="boton-icono" aria-label={t.comun.cerrar} onClick={onCerrar}>
                <Icono nombre="cerrar" />
              </button>
            </div>
            {children}
          </div>
        ))}
    </dialog>
  )
}
