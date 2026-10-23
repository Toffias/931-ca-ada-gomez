import type { EmailAdapter } from 'payload'

// Cuando no hay RESEND_API_KEY: en vez de mandar el mail, lo imprime en la consola del server
// (con los links sueltos, para poder abrir el de "restablecer contraseña").
export const emailConsola: EmailAdapter = ({ payload }) => ({
  name: 'consola',
  defaultFromAddress: 'no-responder@localhost',
  defaultFromName: 'Plantilla edificio 3D',
  sendEmail: async (mensaje) => {
    const html = typeof mensaje.html === 'string' ? mensaje.html : ''
    const links = [...html.matchAll(/href="([^"]+)"/g)].map((m) => m[1])
    payload.logger.info(
      [
        `[email] Para: ${String(mensaje.to)} · Asunto: ${mensaje.subject ?? ''}`,
        ...links.map((l) => `[email] Link: ${l}`),
        typeof mensaje.text === 'string' ? mensaje.text : '',
      ]
        .filter(Boolean)
        .join('\n'),
    )
    return { ok: true }
  },
})
