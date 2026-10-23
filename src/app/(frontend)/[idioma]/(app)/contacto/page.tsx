import { FormConsulta } from '@/components/proyecto/FormConsulta'
import { Icono } from '@/components/ui/Icono'
import { obtenerProyecto, obtenerTorres } from '@/lib/datos'
import { linkWhatsApp } from '@/lib/formato'
import { textosServidor } from '@/lib/idioma-servidor'

export const revalidate = 60

export async function generateMetadata() {
  return { title: (await textosServidor()).contacto.kicker }
}

// Contacto (spec Q): canales directos y el mismo formulario que "Consultar precio", con origen "contacto".
export default async function PaginaContacto() {
  const [p, torres, t] = await Promise.all([obtenerProyecto(), obtenerTorres(), textosServidor()])
  const c = p.contacto
  const foto = torres[0]?.portada
  return (
    <div className="pantalla pantalla-contacto">
      {foto && <img className="contacto-foto" src={foto.grande} alt={foto.alt} />}
      <section className="contacto-panel">
        <span className="kicker">{t.contacto.kicker}</span>
        <h1>{t.contacto.titulo}</h1>
        <div className="contacto-canales">
          {c.whatsapp && (
            <a href={linkWhatsApp(c.whatsapp, t.comun.whatsappProyecto(p.nombre))} target="_blank" rel="noreferrer">
              <Icono nombre="whatsapp" /> <span>WhatsApp<small>{t.contacto.whatsapp}</small></span>
            </a>
          )}
          {c.telefono && (
            <a href={`tel:${c.telefono.replace(/[^\d+]/g, '')}`}>
              <Icono nombre="telefono" /> <span>{c.telefono}<small>{c.horario ?? t.contacto.llamanos}</small></span>
            </a>
          )}
          {c.email && (
            <a href={`mailto:${c.email}`}>
              <Icono nombre="contacto" /> <span>{c.email}<small>{t.contacto.escribinos}</small></span>
            </a>
          )}
          {c.direccion && (
            <div>
              <Icono nombre="ubicacion" /> <span>{c.direccion}<small>{c.horario}</small></span>
            </div>
          )}
        </div>
        <FormConsulta pedido={{ origen: 'contacto' }} privacidad={p.privacidad} motivos={c.motivos} />
        {p.desarrolladora.nombre && (
          <p className="contacto-credito">
            {t.contacto.desarrolla}{' '}
            {p.desarrolladora.web ? (
              <a href={p.desarrolladora.web} target="_blank" rel="noreferrer">
                {p.desarrolladora.nombre}
              </a>
            ) : (
              p.desarrolladora.nombre
            )}
          </p>
        )}
      </section>
    </div>
  )
}
