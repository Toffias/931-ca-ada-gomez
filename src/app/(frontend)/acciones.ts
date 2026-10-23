'use server'

import config from '@payload-config'
import { after } from 'next/server'
import { getPayload } from 'payload'

import { avisarConsulta } from '@/lib/aviso-consulta'
import { esIdioma, IDIOMA_DEFECTO } from '@/lib/idiomas'
import { textosDe } from '@/textos'

export type ResultadoConsulta = { ok: boolean; mensaje: string }

const ORIGENES = ['precio', 'ficha', 'contacto'] as const
type Origen = (typeof ORIGENES)[number]

/** Guarda una consulta (consultar precio, ficha o contacto). Se ve en el admin → Ventas → Consultas. */
export async function enviarConsulta(_prev: ResultadoConsulta | null, form: FormData): Promise<ResultadoConsulta> {
  // las Server Actions no ven el segmento [idioma]: el formulario lo manda en un campo oculto
  const idiomaForm = form.get('idioma')
  const idioma = esIdioma(idiomaForm) ? idiomaForm : IDIOMA_DEFECTO
  const t = textosDe(idioma).consulta

  // campo trampa para bots: los humanos no lo ven
  if (form.get('sitio_web')) return { ok: true, mensaje: t.gracias }

  const texto = (k: string, max = 2000) => String(form.get(k) ?? '').trim().slice(0, max)
  const nombre = texto('nombre', 120)
  const email = texto('email', 200)
  const telefono = texto('telefono', 60)
  const mensaje = texto('mensaje')
  const motivo = texto('motivo', 120)
  const pagina = texto('pagina', 500)
  const origenForm = texto('origen') as Origen
  const origen: Origen = ORIGENES.includes(origenForm) ? origenForm : 'ficha'
  const unidad = form.get('unidad')
  const edificio = form.get('edificio')
  const aceptaPrivacidad = form.get('privacidad') === 'on'

  if (nombre.length < 2) return { ok: false, mensaje: t.faltaNombre }
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) return { ok: false, mensaje: t.emailInvalido }
  if (!aceptaPrivacidad) return { ok: false, mensaje: t.faltaPrivacidad }

  try {
    const payload = await getPayload({ config })
    const consulta = await payload.create({
      collection: 'consultas',
      overrideAccess: true,
      data: {
        nombre,
        email,
        telefono: telefono || undefined,
        mensaje: mensaje || undefined,
        motivo: motivo || undefined,
        pagina: pagina || undefined,
        origen,
        idioma,
        aceptaPrivacidad,
        unidad: unidad ? Number(unidad) || String(unidad) : undefined,
        edificio: edificio ? Number(edificio) || String(edificio) : undefined,
      } as never,
    })
    // el mail sale después de responder: el visitante no espera a Resend y, si falla, la consulta ya está guardada
    after(() => avisarConsulta(payload, consulta).catch((err) => console.error('[consulta] aviso por mail', err)))
    return { ok: true, mensaje: t.gracias }
  } catch (err) {
    console.error('[consulta]', err)
    return { ok: false, mensaje: t.error }
  }
}
