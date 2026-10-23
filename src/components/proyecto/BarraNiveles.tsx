'use client'

import Link from 'next/link'

import { cortoNivel, nombreNivel } from '@/lib/etiquetas'
import type { Nivel } from '@/lib/tipos'

import { Icono } from '../ui/Icono'
import { useRutas, useTextos } from '../ui/ProveedorIdioma'

/** barra vertical de pisos (horizontal en celular): cada nivel es un link a su planta */
export function BarraNiveles({ torre, niveles, actual }: { torre: string; niveles: Nivel[]; actual: number }) {
  const rutas = useRutas()
  const t = useTextos()
  const i = niveles.findIndex((n) => n.piso === actual)
  const arriba = niveles[i - 1]
  const abajo = niveles[i + 1]
  return (
    <nav className="barra-niveles" aria-label={t.niveles.pisos}>
      {arriba ? (
        <Link className="boton-icono chico" href={rutas.planta(torre, arriba.piso)} aria-label={t.niveles.arriba}>
          <Icono nombre="arriba" tamano={16} />
        </Link>
      ) : (
        <span className="boton-icono chico deshabilitado" aria-hidden>
          <Icono nombre="arriba" tamano={16} />
        </span>
      )}
      <ol>
        {niveles.map((n) => (
          <li key={n.piso}>
            <Link
              href={rutas.planta(torre, n.piso)}
              className={`nivel${n.piso === actual ? ' activo' : ''}${n.tipo === 'especial' ? ' especial' : ''}`}
              aria-current={n.piso === actual ? 'page' : undefined}
              title={n.tipo === 'unidades' ? t.niveles.disponiblesDe(nombreNivel(t, n), n.disponibles, n.total) : nombreNivel(t, n)}
            >
              <span>{cortoNivel(t, n)}</span>
              {n.tipo === 'unidades' && <i className={n.disponibles ? 'hay' : 'no-hay'} aria-hidden />}
            </Link>
          </li>
        ))}
      </ol>
      {abajo ? (
        <Link className="boton-icono chico" href={rutas.planta(torre, abajo.piso)} aria-label={t.niveles.abajo}>
          <Icono nombre="abajo" tamano={16} />
        </Link>
      ) : (
        <span className="boton-icono chico deshabilitado" aria-hidden>
          <Icono nombre="abajo" tamano={16} />
        </span>
      )}
    </nav>
  )
}
