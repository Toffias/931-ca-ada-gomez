'use client'

import Link from 'next/link'
import { usePathname, useSearchParams } from 'next/navigation'
import { Suspense, useEffect, useLayoutEffect, useState } from 'react'

import { linkWhatsApp } from '@/lib/formato'
import { quitarIdioma } from '@/lib/idiomas'
import type { ItemMenu } from '@/lib/navegacion'
import { useProyecto } from '@/lib/store-proyecto'
import { llegar } from '@/lib/transiciones'
import type { Disponibilidad, Proyecto } from '@/lib/tipos'

import { EnlaceProfundo } from '../ui/EnlaceProfundo'
import { Icono } from '../ui/Icono'
import { useRutas, useTextos } from '../ui/ProveedorIdioma'
import { BotonTema } from './BotonTema'
import { ConsultaModal } from './ConsultaModal'
import { ModalQR } from './ModalQR'
import { SelectorIdioma } from './SelectorIdioma'
import { SincronizarDisponibilidad } from './SincronizarDisponibilidad'

type Props = {
  proyecto: Pick<Proyecto, 'nombre' | 'logo' | 'contacto' | 'legal' | 'privacidad' | 'desarrolladora' | 'tema'>
  menu: ItemMenu[]
  disponibilidad: Disponibilidad
  children: React.ReactNode
}

// Navegación global (spec B): menú lateral, tema, QR de la pantalla, pantalla completa y zoom.
// Vive en el layout, así no se remonta al pasar de una pantalla a otra.
export function Marco({ proyecto, menu, disponibilidad, children }: Props) {
  const pathname = usePathname()
  const rutas = useRutas()
  const t = useTextos()
  const { menuAbierto, set } = useProyecto()
  const [pantallaCompleta, setPantallaCompleta] = useState(false)

  // el menú se cierra al navegar y con Escape
  useEffect(() => set({ menuAbierto: false, hover: null }), [pathname, set])
  useEffect(() => {
    const tecla = (e: KeyboardEvent) => e.key === 'Escape' && set({ menuAbierto: false, qrAbierto: false })
    const fs = () => setPantallaCompleta(!!document.fullscreenElement)
    window.addEventListener('keydown', tecla)
    document.addEventListener('fullscreenchange', fs)
    return () => {
      window.removeEventListener('keydown', tecla)
      document.removeEventListener('fullscreenchange', fs)
    }
  }, [set])

  const alternarPantalla = () => {
    if (document.fullscreenElement) document.exitFullscreen()
    else document.documentElement.requestFullscreen?.().catch(() => {})
  }

  // se compara la sección sin el prefijo del idioma ("/en/p/torre/3" → "/p")
  const seccion = (url: string) => '/' + (quitarIdioma(url.split('?')[0]).ruta.split('/')[1] ?? '')
  const activo = (href: string) => seccion(href) === seccion(pathname)

  const c = proyecto.contacto
  return (
    <div className="marco">
      <SincronizarDisponibilidad inicial={disponibilidad} />

      <header className="barra-superior">
        <div className="grupo">
          <button className="boton-icono" aria-label={t.marco.abrirMenu} aria-expanded={menuAbierto} onClick={() => set({ menuAbierto: true })}>
            <Icono nombre="menu" />
          </button>
        </div>
        <div className="grupo">
          <SelectorIdioma />
          <BotonTema defecto={proyecto.tema} />
          <button className="boton-icono" aria-label={t.marco.qr} title={t.marco.qrCorto} onClick={() => set({ qrAbierto: true })}>
            <Icono nombre="qr" />
          </button>
          <button
            className="boton-icono solo-escritorio"
            aria-label={pantallaCompleta ? t.comun.salirPantallaCompleta : t.comun.pantallaCompleta}
            title={t.comun.pantallaCompleta}
            onClick={alternarPantalla}
          >
            <Icono nombre={pantallaCompleta ? 'salirPantalla' : 'pantalla'} />
          </button>
        </div>
      </header>

      <div className={`menu-fondo${menuAbierto ? ' abierto' : ''}`} onClick={() => set({ menuAbierto: false })} aria-hidden />
      <nav className={`menu-lateral${menuAbierto ? ' abierto' : ''}`} aria-label={t.marco.menuPrincipal} aria-hidden={!menuAbierto} inert={!menuAbierto}>
        <div className="menu-cabecera">
          <button className="boton-icono" aria-label={t.marco.cerrarMenu} onClick={() => set({ menuAbierto: false })}>
            <Icono nombre="cerrar" />
          </button>
          <EnlaceProfundo href={rutas.intro()} tipo="salir" className="marca-proyecto menu-logo">
            {proyecto.logo ? <img src={proyecto.logo.url} alt={proyecto.nombre} /> : proyecto.nombre}
          </EnlaceProfundo>
        </div>
        <ul>
          {menu.map((item) => (
            <li key={item.etiqueta}>
              <Link href={item.href} className={`menu-item${activo(item.href) ? ' activo' : ''}`}>
                <Icono nombre={item.icono} />
                {item.etiqueta}
              </Link>
              {item.hijos && (
                <ul className="menu-hijos">
                  {item.hijos.map((h) => (
                    <li key={h.href}>
                      <Link href={h.href} className={pathname === h.href.split('?')[0] ? 'activo' : ''}>
                        {h.etiqueta}
                      </Link>
                    </li>
                  ))}
                </ul>
              )}
            </li>
          ))}
        </ul>
        <div className="menu-pie">
          <div className="menu-contacto">
            {c.whatsapp && (
              <a href={linkWhatsApp(c.whatsapp, t.comun.whatsappProyecto(proyecto.nombre))} target="_blank" rel="noreferrer" aria-label="WhatsApp">
                <Icono nombre="whatsapp" />
              </a>
            )}
            {c.telefono && (
              <a href={`tel:${c.telefono.replace(/[^\d+]/g, '')}`} aria-label={t.marco.telefono}>
                <Icono nombre="telefono" />
              </a>
            )}
            {c.email && (
              <a href={`mailto:${c.email}`} aria-label="Email">
                <Icono nombre="contacto" />
              </a>
            )}
          </div>
          {proyecto.desarrolladora.nombre && <small>{t.comun.desarrolloDe(proyecto.desarrolladora.nombre)}</small>}
        </div>
      </nav>

      <main className="contenido">{children}</main>

      {/* useSearchParams: sin este límite toda la página dejaría de ser estática */}
      <Suspense>
        <ModalQR nombre={proyecto.nombre} />
        <AvisoLlegada />
      </Suspense>
      <ConsultaModal privacidad={proyecto.privacidad} whatsapp={c.whatsapp} motivos={c.motivos} />
    </div>
  )
}

// cuando cambia la URL, la pantalla nueva ya está montada: termina la transición de profundidad (lib/transiciones)
function AvisoLlegada() {
  const pathname = usePathname()
  const busqueda = useSearchParams()
  useLayoutEffect(() => llegar(), [pathname, busqueda])
  return null
}
