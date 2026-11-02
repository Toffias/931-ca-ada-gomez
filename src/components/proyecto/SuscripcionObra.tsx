'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useActionState, useEffect, useRef, useState } from 'react'

import { bajaObra, suscribirseObra } from '@/app/(frontend)/acciones'
import { quitarIdioma } from '@/lib/idiomas'
import { useProyecto } from '@/lib/store-proyecto'

import { Icono } from '../ui/Icono'
import { Modal } from '../ui/Modal'
import { useIdioma, useRutas, useTextos } from '../ui/ProveedorIdioma'

/** localStorage: ya se le ofreció (o ya se suscribió); el modal automático sale una sola vez por navegador */
const CLAVE = 'suscripcion-obra-ofrecida'
/** espera desde que entra al sitio, para no tapar la primera pantalla mientras carga */
const ESPERA_MS = 8000
/** si en ese momento hay otro modal o el menú abierto, se vuelve a probar después */
const REINTENTO_MS = 4000

const ofrecida = () => {
  try {
    return localStorage.getItem(CLAVE) === '1'
  } catch {
    return true // sin storage no se puede recordar: mejor no insistir en cada visita
  }
}
const marcarOfrecida = () => {
  try {
    localStorage.setItem(CLAVE, '1')
  } catch {
    /* modo privado */
  }
}

/**
 * Modal global "Seguí la obra": lo abre `BotonSuscripcionObra` (pantalla Obra) o solo, la primera vez que alguien
 * entra al sitio. `automatico` es la sección Obra prendida en el admin.
 */
export function ModalSuscripcionObra({ privacidad, automatico }: { privacidad?: string | null; automatico: boolean }) {
  const abierto = useProyecto((s) => s.suscripcionAbierta)
  const set = useProyecto((s) => s.set)
  const t = useTextos().suscripcion
  const pathname = usePathname()
  const enBaja = quitarIdioma(pathname).ruta === '/baja'

  useEffect(() => {
    if (!automatico || enBaja || ofrecida()) return
    let timer: ReturnType<typeof setTimeout>
    const intentar = () => {
      const s = useProyecto.getState()
      if (s.consulta || s.qrAbierto || s.menuAbierto || s.suscripcionAbierta || document.querySelector('dialog[open]')) {
        timer = setTimeout(intentar, REINTENTO_MS)
        return
      }
      marcarOfrecida()
      set({ suscripcionAbierta: true })
    }
    timer = setTimeout(intentar, ESPERA_MS)
    return () => clearTimeout(timer)
  }, [automatico, enBaja, set])

  const cerrar = () => set({ suscripcionAbierta: false })
  return (
    <Modal abierto={abierto} onCerrar={cerrar} titulo={t.titulo} angosto>
      {abierto && <FormSuscripcion privacidad={privacidad} onListo={cerrar} />}
    </Modal>
  )
}

export function BotonSuscripcionObra() {
  const set = useProyecto((s) => s.set)
  const t = useTextos().suscripcion
  return (
    <button type="button" className="boton obra-suscripcion" onClick={() => set({ suscripcionAbierta: true })}>
      <Icono nombre="contacto" />
      {t.boton}
    </button>
  )
}

function FormSuscripcion({ privacidad, onListo }: { privacidad?: string | null; onListo: () => void }) {
  const idioma = useIdioma()
  const textos = useTextos()
  const t = textos.suscripcion
  const [estado, accion, enviando] = useActionState(suscribirseObra, null)
  const [email, setEmail] = useState('')
  const [verPolitica, setVerPolitica] = useState(false)
  const titulo = useRef<HTMLHeadingElement>(null)
  useEffect(() => {
    if (!estado?.ok) return
    marcarOfrecida()
    titulo.current?.focus({ preventScroll: true })
  }, [estado])

  if (estado?.ok)
    return (
      <div className="consulta-ok" role="status">
        <svg className="consulta-ok-icono" viewBox="0 0 52 52" aria-hidden>
          <circle cx="26" cy="26" r="24" />
          <path d="M15 27l7 7 15-15" />
        </svg>
        <h3 ref={titulo} tabIndex={-1}>
          {t.listoTitulo}
        </h3>
        <p>{t.listoTexto(email)}</p>
        <div className="consulta-ok-acciones">
          <button type="button" className="boton primario" onClick={onListo}>
            {textos.comun.cerrar}
          </button>
        </div>
      </div>
    )

  return (
    <form
      action={accion}
      className={`form-consulta form-suscripcion${enviando ? ' enviando' : ''}`}
      aria-busy={enviando}
      onSubmit={(e) => setEmail(String(new FormData(e.currentTarget).get('email') ?? '').trim())}
    >
      <p className="suscripcion-texto">{t.texto}</p>
      <input type="hidden" name="idioma" value={idioma} />
      <input type="text" name="sitio_web" tabIndex={-1} autoComplete="off" className="trampa" aria-hidden />
      <label>
        {t.email}
        <input name="email" type="email" required autoComplete="email" defaultValue={email} readOnly={enviando} />
      </label>
      <p className="suscripcion-aviso">
        {t.aviso}{' '}
        <button type="button" className="link" onClick={() => setVerPolitica((v) => !v)}>
          {textos.consulta.politica}
        </button>
      </p>
      {verPolitica && <p className="politica">{privacidad || textos.consulta.politicaDefecto}</p>}
      {estado && !estado.ok && (
        <p className="error" role="alert">
          {estado.mensaje}
        </p>
      )}
      <div className="suscripcion-acciones">
        <button type="button" className="boton" onClick={onListo}>
          {t.ahoraNo}
        </button>
        <button type="submit" className="boton primario boton-enviar" disabled={enviando}>
          {enviando && <span className="spinner" aria-hidden />}
          <span>{enviando ? t.enviando : t.enviar}</span>
        </button>
      </div>
    </form>
  )
}

/** página del link "Darme de baja": confirma con un clic (ver bajaObra en acciones.ts) */
export function BajaObra({ token, email, activo }: { token: string; email: string | null; activo: boolean }) {
  const idioma = useIdioma()
  const rutas = useRutas()
  const textos = useTextos()
  const t = textos.suscripcion
  const [estado, accion, enviando] = useActionState(bajaObra, null)

  const cuerpo = estado?.ok ? (
    <>
      <h1>{t.bajaListaTitulo}</h1>
      <p>{t.bajaListaTexto}</p>
    </>
  ) : !email ? (
    <p>{t.bajaInvalida}</p>
  ) : !activo ? (
    <p>{t.bajaYaEstaba}</p>
  ) : (
    <form action={accion} className="form-consulta">
      <p>{t.bajaTexto(email)}</p>
      <input type="hidden" name="token" value={token} />
      <input type="hidden" name="idioma" value={idioma} />
      {estado && !estado.ok && (
        <p className="error" role="alert">
          {estado.mensaje}
        </p>
      )}
      <button type="submit" className="boton primario boton-enviar" disabled={enviando}>
        {enviando && <span className="spinner" aria-hidden />}
        <span>{t.bajaConfirmar}</span>
      </button>
    </form>
  )

  return (
    <section className="baja-caja" aria-live="polite">
      <span className="kicker">{t.bajaTitulo}</span>
      {cuerpo}
      <Link href={rutas.intro()} className="link">
        {textos.comun.volver}
      </Link>
    </section>
  )
}
