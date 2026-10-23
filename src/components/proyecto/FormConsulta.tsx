'use client'

import { useActionState, useEffect, useRef, useState } from 'react'

import { enviarConsulta } from '@/app/(frontend)/acciones'
import { linkWhatsApp } from '@/lib/formato'
import type { PedidoConsulta } from '@/lib/store-proyecto'

import { useIdioma, useTextos } from '../ui/ProveedorIdioma'

type Props = {
  pedido: PedidoConsulta
  privacidad?: string | null
  whatsapp?: string | null
  motivos?: string[]
  onListo?: () => void
}

type Contacto = { nombre: string; email: string; telefono: string }

// Un solo formulario para Consultar precio (spec I), la ficha y Contacto (spec Q): cambia el origen del lead.
export function FormConsulta(props: Props) {
  // "otra consulta" vuelve a montar el formulario (useActionState no se resetea) pero se acuerda de quién escribió
  const [vuelta, setVuelta] = useState(0)
  const [contacto, setContacto] = useState<Contacto | null>(null)
  return (
    <Formulario
      key={vuelta}
      {...props}
      contacto={contacto}
      onEnviar={setContacto}
      onOtra={() => setVuelta((v) => v + 1)}
      animarEntrada={vuelta > 0}
    />
  )
}

function Formulario({
  pedido,
  privacidad,
  whatsapp,
  motivos = [],
  onListo,
  contacto,
  onEnviar,
  onOtra,
  animarEntrada,
}: Props & {
  contacto: Contacto | null
  onEnviar: (c: Contacto) => void
  onOtra: () => void
  animarEntrada: boolean
}) {
  const idioma = useIdioma()
  const textos = useTextos()
  const t = textos.consulta
  const [estado, accion, enviando] = useActionState(enviarConsulta, null)
  const [verPolitica, setVerPolitica] = useState(false)
  const [pagina, setPagina] = useState('')
  const titulo = useRef<HTMLHeadingElement>(null)
  useEffect(() => setPagina(window.location.pathname), [])
  // al terminar, el foco va al mensaje para que los lectores de pantalla lo anuncien
  useEffect(() => {
    if (estado?.ok) titulo.current?.focus({ preventScroll: true })
  }, [estado])

  const u = pedido.unidad
  const mensajeInicial = u
    ? pedido.origen === 'precio'
      ? t.mensajePrecio(u.codigo)
      : t.mensajeInfo(u.codigo)
    : ''

  if (estado?.ok) {
    const nombre = contacto?.nombre.split(/\s+/)[0]
    return (
      <div className="consulta-ok" role="status">
        <svg className="consulta-ok-icono" viewBox="0 0 52 52" aria-hidden>
          <circle cx="26" cy="26" r="24" />
          <path d="M15 27l7 7 15-15" />
        </svg>
        <h3 ref={titulo} tabIndex={-1}>
          {nombre ? t.enviadoTituloNombre(nombre) : t.enviadoTitulo}
        </h3>
        <p>{contacto?.email ? t.enviadoTexto(contacto.email) : estado.mensaje}</p>
        <div className="consulta-ok-acciones">
          <button type="button" className="boton" onClick={onOtra}>
            {t.otraConsulta}
          </button>
          {onListo && (
            <button type="button" className="boton primario" onClick={onListo}>
              {textos.comun.cerrar}
            </button>
          )}
        </div>
      </div>
    )
  }

  return (
    <form
      action={accion}
      className={`form-consulta${enviando ? ' enviando' : ''}${animarEntrada ? ' entra' : ''}`}
      aria-busy={enviando}
      onSubmit={(e) => {
        const f = new FormData(e.currentTarget)
        const v = (k: string) => String(f.get(k) ?? '').trim()
        onEnviar({ nombre: v('nombre'), email: v('email'), telefono: v('telefono') })
      }}
    >
      <input type="hidden" name="origen" value={pedido.origen} />
      <input type="hidden" name="pagina" value={pagina} />
      <input type="hidden" name="idioma" value={idioma} />
      {u && <input type="hidden" name="unidad" value={String(u.id)} />}
      {u && <input type="hidden" name="edificio" value={String(u.torreId)} />}
      <input type="text" name="sitio_web" tabIndex={-1} autoComplete="off" className="trampa" aria-hidden />

      {/* mientras se envía, los campos quedan bloqueados (un fieldset deshabilitado no manda sus valores, por eso readOnly) */}
      <div className="campos-2">
        <label>
          {t.nombre}
          <input name="nombre" required autoComplete="name" defaultValue={contacto?.nombre} readOnly={enviando} />
        </label>
        <label>
          {t.telefono}
          <input name="telefono" type="tel" autoComplete="tel" defaultValue={contacto?.telefono} readOnly={enviando} />
        </label>
      </div>
      <label>
        {t.email}
        <input name="email" type="email" required autoComplete="email" defaultValue={contacto?.email} readOnly={enviando} />
      </label>
      {!u && motivos.length > 0 && (
        <label>
          {t.motivo}
          <select name="motivo" defaultValue="">
            <option value="" disabled>
              {t.elegi}
            </option>
            {motivos.map((m) => (
              <option key={m}>{m}</option>
            ))}
          </select>
        </label>
      )}
      <label>
        {t.mensaje}
        <textarea name="mensaje" rows={3} defaultValue={mensajeInicial} readOnly={enviando} />
      </label>
      <label className="check">
        <input type="checkbox" name="privacidad" required />
        <span>
          {t.acepto}{' '}
          <button type="button" className="link" onClick={() => setVerPolitica((v) => !v)}>
            {t.politica}
          </button>
        </span>
      </label>
      {verPolitica && <p className="politica">{privacidad || t.politicaDefecto}</p>}
      {estado && !estado.ok && (
        <p className="error" role="alert">
          {estado.mensaje}
        </p>
      )}
      <button type="submit" className="boton primario boton-enviar" disabled={enviando}>
        {enviando && <span className="spinner" aria-hidden />}
        <span>{enviando ? t.enviando : t.enviar}</span>
      </button>
      {whatsapp && (
        <a
          className="link-whatsapp"
          href={linkWhatsApp(whatsapp, mensajeInicial || t.mensajeProyecto)}
          target="_blank"
          rel="noreferrer"
        >
          {t.whatsapp}
        </a>
      )}
    </form>
  )
}
