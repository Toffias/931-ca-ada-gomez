'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useActionState, useEffect, useRef, useState } from 'react'

import { bajaObra, suscribirseObra } from '@/app/(frontend)/acciones'
import { quitarIdioma } from '@/lib/idiomas'
import { useProyecto } from '@/lib/store-proyecto'
import type { Imagen } from '@/lib/tipos'

import { Icono } from '../ui/Icono'
import { Modal } from '../ui/Modal'
import { useIdioma, useRutas, useTextos } from '../ui/ProveedorIdioma'

/** localStorage: ya se le ofreció (o ya se suscribió); el modal automático sale una sola vez por navegador */
const CLAVE = 'suscripcion-obra-ofrecida'
/** respiro mínimo después de que termina la pantalla de carga para que la entrada del modal se sienta limpia */
const ESPERA_TRAS_CARGA_MS = 120
/** si en ese momento hay otro modal o el menú abierto, se vuelve a probar después */
const REINTENTO_MS = 2500

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

export type PropsModalSuscripcion = {
  nombre: string
  eslogan?: string | null
  privacidad?: string | null
  automatico: boolean
  imagen?: Imagen | null
  ultimoAvance?: { titulo: string; fecha: string } | null
}

/**
 * Modal global "Seguí la obra": lo abre `BotonSuscripcionObra` (pantalla Obra) o apenas termina la carga inicial,
 * la primera vez que alguien entra al sitio (sin esperar a que terminen descargas en segundo plano).
 */
export function ModalSuscripcionObra({ nombre, eslogan, privacidad, automatico, imagen, ultimoAvance }: PropsModalSuscripcion) {
  const abierto = useProyecto((s) => s.suscripcionAbierta)
  const cargaLista = useProyecto((s) => s.cargaLista)
  const set = useProyecto((s) => s.set)
  const textos = useTextos()
  const t = textos.suscripcion
  const pathname = usePathname()
  const enBaja = quitarIdioma(pathname).ruta === '/baja'

  useEffect(() => {
    if (!imagen?.chica || !automatico || enBaja || ofrecida()) return
    const pre = new Image()
    pre.src = imagen.chica
  }, [imagen?.chica, automatico, enBaja])

  useEffect(() => {
    if (!automatico || enBaja || !cargaLista || ofrecida()) return
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
    timer = setTimeout(intentar, ESPERA_TRAS_CARGA_MS)
    return () => clearTimeout(timer)
  }, [automatico, enBaja, cargaLista, set])

  const cerrar = () => set({ suscripcionAbierta: false })
  const subtituloVisual = ultimoAvance?.titulo || eslogan || null

  return (
    <Modal
      abierto={abierto}
      onCerrar={cerrar}
      titulo={t.titulo}
      clase={`modal-suscripcion${imagen ? ' con-imagen' : ''}`}
      sinCabecera
    >
      <div className="modal-caja suscripcion-caja">
        {imagen && (
          <div className="suscripcion-visual">
            <img src={imagen.chica} alt={imagen.alt || nombre} />
            <div className="suscripcion-visual-velo" aria-hidden />
            <span className="suscripcion-visual-badge">
              <span className="suscripcion-pulso" aria-hidden />
              {textos.obra.kicker}
            </span>
            <div className="suscripcion-visual-pie">
              <strong>{nombre}</strong>
              {subtituloVisual && <span>{subtituloVisual}</span>}
            </div>
          </div>
        )}
        <div className="suscripcion-cuerpo">
          <div className="modal-cabecera suscripcion-cabecera">
            <div className="modal-titulo-con-icono">
              <span className="modal-icono" aria-hidden>
                <Icono nombre="campana" tamano={19} />
              </span>
              <h2>{t.titulo}</h2>
            </div>
            <button type="button" className="boton-icono chico suscripcion-cerrar" aria-label={textos.comun.cerrar} onClick={cerrar}>
              <Icono nombre="cerrar" tamano={18} />
            </button>
          </div>
          {abierto && <FormSuscripcion privacidad={privacidad} onListo={cerrar} />}
        </div>
      </div>
    </Modal>
  )
}

export function BotonSuscripcionObra() {
  const set = useProyecto((s) => s.set)
  const t = useTextos().suscripcion
  return (
    <button type="button" className="boton obra-suscripcion" onClick={() => set({ suscripcionAbierta: true })}>
      <Icono nombre="campana" />
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
      <ul className="suscripcion-beneficios">
        {t.beneficios.map((item) => (
          <li key={item}>
            <Icono nombre="listo" tamano={14} />
            <span>{item}</span>
          </li>
        ))}
      </ul>
      <input type="hidden" name="idioma" value={idioma} />
      <input type="text" name="sitio_web" tabIndex={-1} autoComplete="off" className="trampa" aria-hidden />
      <label>
        {t.email}
        <input
          name="email"
          type="email"
          required
          autoComplete="email"
          placeholder={t.emailPlaceholder}
          defaultValue={email}
          readOnly={enviando}
        />
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
