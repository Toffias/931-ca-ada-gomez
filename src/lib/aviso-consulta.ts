import type { Payload } from 'payload'

import type { Consulta } from '@/payload-types'

const ORIGEN: Record<string, string> = { precio: 'Consultar precio', ficha: 'Ficha de unidad', contacto: 'Contacto' }

const escapar = (s: string) =>
  s.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]!)

/**
 * Manda por mail cada consulta nueva a los destinatarios del admin (Proyecto → Contacto).
 * Es interno, para el equipo de ventas: va en castellano como el admin. Si falla, la consulta ya quedó guardada.
 */
export async function avisarConsulta(payload: Payload, consulta: Consulta) {
  const sitio = await payload.findGlobal({ slug: 'sitio', depth: 0 })
  const destinatarios = (sitio.contacto?.avisosConsultas ?? []).map((e) => e.trim()).filter(Boolean)
  if (!destinatarios.length && sitio.contacto?.email) destinatarios.push(sitio.contacto.email)
  if (!destinatarios.length) return

  const [unidad, edificio] = await Promise.all([
    consulta.unidad
      ? payload.findByID({ collection: 'unidades', id: idDe(consulta.unidad), depth: 0 }).catch(() => null)
      : null,
    consulta.edificio
      ? payload.findByID({ collection: 'edificios', id: idDe(consulta.edificio), depth: 0 }).catch(() => null)
      : null,
  ])

  const filas: [string, string | null | undefined][] = [
    ['Nombre', consulta.nombre],
    ['Email', consulta.email],
    ['Teléfono', consulta.telefono],
    ['Origen', ORIGEN[consulta.origen ?? ''] ?? consulta.origen],
    ['Motivo', consulta.motivo],
    ['Torre', edificio?.nombre],
    ['Unidad', unidad?.codigo],
    ['Idioma', consulta.idioma],
    ['Página', consulta.pagina],
  ]
  const presentes = filas.filter((f): f is [string, string] => Boolean(f[1]))
  const enAdmin = `${payload.config.serverURL}/admin/collections/consultas/${consulta.id}`
  const asunto = `Nueva consulta${unidad?.codigo ? ` · Unidad ${unidad.codigo}` : ''} · ${consulta.nombre}`

  await payload.sendEmail({
    to: destinatarios,
    // "Responder" en el cliente de mail le contesta directo a quien consultó
    replyTo: consulta.email,
    subject: `${asunto} — ${sitio.nombre}`,
    text: [
      ...presentes.map(([k, v]) => `${k}: ${v}`),
      consulta.mensaje ? `\n${consulta.mensaje}` : '',
      `\nVer en el admin: ${enAdmin}`,
    ].join('\n'),
    html: `
      <table style="font:14px/1.5 sans-serif;border-collapse:collapse">
        ${presentes
          .map(
            ([k, v]) =>
              `<tr><td style="padding:2px 12px 2px 0;color:#666">${k}</td><td>${escapar(v)}</td></tr>`,
          )
          .join('')}
      </table>
      ${consulta.mensaje ? `<p style="font:14px/1.5 sans-serif;white-space:pre-wrap">${escapar(consulta.mensaje)}</p>` : ''}
      <p style="font:14px/1.5 sans-serif"><a href="${enAdmin}">Ver en el admin</a></p>`,
  })
}

const idDe = (v: number | string | { id: number | string }) => (typeof v === 'object' ? v.id : v)
