import type { Payload } from 'payload'

import type { AvanceDeObra, Media, SuscriptorObra } from '@/payload-types'
import { textosDe } from '@/textos'

import { esIdioma, IDIOMA_DEFECTO, LOCALE, type Idioma } from './idiomas'
import { rutasDe } from './rutas'

// Suscripción por mail al avance de obra: alta desde el modal de la web, aviso de cada avance nuevo cargado en el
// admin (hook en AvancesDeObra) y baja con el token que lleva cada mail.

const COLECCION = 'suscriptores-obra'
/** Resend admite 2 envíos por segundo en el plan común: los avisos salen de a uno con esta pausa */
const PAUSA_MS = 600

const escapar = (s: string) =>
  s.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]!)

const absoluta = (payload: Payload, url: string) => (url.startsWith('/') ? `${payload.config.serverURL}${url}` : url)
const idiomaDe = (s: Pick<SuscriptorObra, 'idioma'>): Idioma => (esIdioma(s.idioma) ? s.idioma : IDIOMA_DEFECTO)

/** Da de alta (o reactiva) un email. Devuelve a quién hay que mandarle la bienvenida: a nadie si ya estaba suscripto. */
export async function suscribir(payload: Payload, email: string, idioma: Idioma) {
  const { docs } = await payload.find({
    collection: COLECCION,
    where: { email: { equals: email.toLowerCase() } },
    limit: 1,
    depth: 0,
    overrideAccess: true,
  })
  const previo = docs[0]
  if (previo?.activo) return null
  return previo
    ? payload.update({ collection: COLECCION, id: previo.id, data: { activo: true, idioma }, overrideAccess: true })
    : payload.create({ collection: COLECCION, data: { email, idioma, activo: true }, overrideAccess: true })
}

export async function buscarPorToken(payload: Payload, token: string) {
  if (!token) return null
  const { docs } = await payload.find({
    collection: COLECCION,
    where: { token: { equals: token } },
    limit: 1,
    depth: 0,
    overrideAccess: true,
  })
  return docs[0] ?? null
}

/** false si el token no existe; dar de baja dos veces no es un error */
export async function darDeBaja(payload: Payload, token: string) {
  const s = await buscarPorToken(payload, token)
  if (!s) return false
  if (s.activo) await payload.update({ collection: COLECCION, id: s.id, data: { activo: false }, overrideAccess: true })
  return true
}

/** mail de bienvenida apenas se suscribe: confirma que el email llega y ya trae el link de baja */
export async function mandarBienvenida(payload: Payload, s: SuscriptorObra) {
  const idioma = idiomaDe(s)
  const t = textosDe(idioma).suscripcion.mail
  const proyecto = await nombreProyecto(payload)
  await enviar(payload, s, {
    asunto: t.asuntoBienvenida(proyecto),
    titulo: proyecto,
    parrafos: [t.bienvenida(proyecto)],
    boton: { href: absoluta(payload, rutasDe(idioma).intro()), texto: t.verSitio },
  })
}

/** Avisa un avance nuevo a todos los suscriptores activos, a cada uno en su idioma. */
export async function avisarAvance(payload: Payload, id: number | string) {
  const { docs: suscriptores } = await payload.find({
    collection: COLECCION,
    where: { activo: { equals: true } },
    pagination: false,
    depth: 0,
    overrideAccess: true,
  })
  if (!suscriptores.length) return

  const proyecto = await nombreProyecto(payload)
  const avances = new Map<Idioma, AvanceDeObra>()
  const avanceEn = async (idioma: Idioma) => {
    if (!avances.has(idioma))
      avances.set(idioma, await payload.findByID({ collection: 'avances-de-obra', id, depth: 1, locale: idioma, overrideAccess: true }))
    return avances.get(idioma)!
  }

  let enviados = 0
  for (const s of suscriptores) {
    const idioma = idiomaDe(s)
    const t = textosDe(idioma).suscripcion.mail
    const fecha = new Intl.DateTimeFormat(LOCALE[idioma], { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC' })
    try {
      const a = await avanceEn(idioma)
      const foto = a.fotos?.[0]?.imagen as Media | number | undefined
      const urlFoto = typeof foto === 'object' && foto ? (foto.sizes?.grande?.url ?? foto.url) : null
      await enviar(payload, s, {
        asunto: t.asuntoAvance(a.titulo ?? '', proyecto),
        titulo: a.titulo ?? proyecto,
        subtitulo: `${proyecto} · ${fecha.format(new Date(a.fecha))}`,
        imagen: urlFoto ? absoluta(payload, urlFoto) : null,
        parrafos: [a.texto || t.introAvance(proyecto)],
        boton: { href: absoluta(payload, rutasDe(idioma).obra()), texto: t.verAvance },
      })
      enviados++
    } catch (err) {
      // uno que falla (casilla inválida, límite de Resend) no corta a los demás
      payload.logger.error({ err }, `[suscripción obra] no se pudo avisar a ${s.email}`)
    }
    await new Promise((r) => setTimeout(r, PAUSA_MS))
  }
  payload.logger.info(`[suscripción obra] avance ${id} avisado a ${enviados}/${suscriptores.length} suscriptores`)
}

async function nombreProyecto(payload: Payload) {
  const sitio = await payload.findGlobal({ slug: 'sitio', depth: 0 })
  return sitio.nombre
}

type Contenido = {
  asunto: string
  titulo: string
  subtitulo?: string
  imagen?: string | null
  parrafos: string[]
  boton: { href: string; texto: string }
}

// HTML de mail: tablas y estilos en línea, con colores fijos (los clientes de mail no ven los tokens del sitio)
async function enviar(payload: Payload, s: SuscriptorObra, c: Contenido) {
  const idioma = idiomaDe(s)
  const t = textosDe(idioma).suscripcion.mail
  const token = encodeURIComponent(s.token ?? '')
  const baja = absoluta(payload, rutasDe(idioma).bajaObra(s.token ?? ''))
  // baja en un clic desde el propio cliente de mail (Gmail y Yahoo se lo piden a quien manda en cantidad)
  const bajaDirecta = absoluta(payload, `/api/suscripcion/baja?t=${token}`)
  const fuente = 'font-family:-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif'

  await payload.sendEmail({
    to: s.email,
    subject: c.asunto,
    headers: { 'List-Unsubscribe': `<${bajaDirecta}>`, 'List-Unsubscribe-Post': 'List-Unsubscribe=One-Click' },
    text: [c.titulo, c.subtitulo ?? '', '', ...c.parrafos, '', `${c.boton.texto}: ${c.boton.href}`, '', '—', t.motivo, `${t.baja}: ${baja}`].join('\n'),
    html: `
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f2f2f0;padding:24px 0">
  <tr><td align="center">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;background:#ffffff;border-radius:12px;overflow:hidden;${fuente};color:#1d1d1f">
      ${c.imagen ? `<tr><td><img src="${escapar(c.imagen)}" alt="" width="560" style="display:block;width:100%;height:auto"></td></tr>` : ''}
      <tr><td style="padding:24px 28px 8px">
        ${c.subtitulo ? `<p style="margin:0 0 6px;font-size:12px;letter-spacing:.6px;text-transform:uppercase;color:#7a7a7a">${escapar(c.subtitulo)}</p>` : ''}
        <h1 style="margin:0 0 12px;font-size:22px;line-height:1.25">${escapar(c.titulo)}</h1>
        ${c.parrafos.map((p) => `<p style="margin:0 0 12px;font-size:15px;line-height:1.55;white-space:pre-wrap">${escapar(p)}</p>`).join('')}
      </td></tr>
      <tr><td style="padding:8px 28px 28px">
        <a href="${escapar(c.boton.href)}" style="display:inline-block;background:#1d1d1f;color:#ffffff;text-decoration:none;padding:12px 20px;border-radius:999px;font-size:14px;font-weight:600">${escapar(c.boton.texto)}</a>
      </td></tr>
    </table>
    <p style="max-width:560px;margin:16px auto 0;padding:0 16px;${fuente};font-size:12px;line-height:1.5;color:#7a7a7a;text-align:center">
      ${escapar(t.motivo)}<br><a href="${escapar(baja)}" style="color:#7a7a7a">${escapar(t.baja)}</a>
    </p>
  </td></tr>
</table>`,
  })
}
