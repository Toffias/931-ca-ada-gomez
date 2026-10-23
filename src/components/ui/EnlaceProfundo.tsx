'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import type { ComponentProps } from 'react'

import { centroDe, transicionar, type TipoTransicion } from '@/lib/transiciones'

type Props = ComponentProps<typeof Link> & { href: string; tipo?: TipoTransicion }

// Link que navega con transición de profundidad, haciendo zoom hacia el propio enlace.
// Ctrl/Cmd+clic y clic del medio siguen abriendo en otra pestaña como cualquier link.
export function EnlaceProfundo({ href, tipo = 'entrar', onClick, onPointerEnter, replace, scroll, ...resto }: Props) {
  const router = useRouter()
  return (
    <Link
      {...resto}
      href={href}
      // se adelanta la carga apenas el puntero se acerca: la pantalla nueva tiene que estar lista al terminar el zoom
      onPointerEnter={(e) => {
        onPointerEnter?.(e)
        router.prefetch(href)
      }}
      replace={replace}
      scroll={scroll}
      onClick={(e) => {
        onClick?.(e)
        if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return
        if (href === location.pathname + location.search) return // misma pantalla: no hay a dónde entrar
        e.preventDefault()
        router.prefetch(href)
        transicionar(() => (replace ? router.replace(href, { scroll }) : router.push(href, { scroll })), tipo, centroDe(e.currentTarget))
      }}
    />
  )
}
