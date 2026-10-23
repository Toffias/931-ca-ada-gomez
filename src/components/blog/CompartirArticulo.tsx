'use client'

import { useState } from 'react'

import { Icono, type NombreIcono } from '../ui/Icono'
import { useTextos } from '../ui/ProveedorIdioma'

// Botones para compartir la nota: redes con su URL de "compartir" y copiar el enlace.
export function CompartirArticulo({ url, titulo }: { url: string; titulo: string }) {
  const t = useTextos().blog
  const [copiado, setCopiado] = useState(false)
  const u = encodeURIComponent(url)
  const redes: { nombre: string; icono: NombreIcono; href: string }[] = [
    { nombre: 'WhatsApp', icono: 'whatsapp', href: `https://wa.me/?text=${encodeURIComponent(`${titulo} ${url}`)}` },
    { nombre: 'LinkedIn', icono: 'linkedin', href: `https://www.linkedin.com/sharing/share-offsite/?url=${u}` },
    { nombre: 'X', icono: 'equis', href: `https://x.com/intent/post?url=${u}&text=${encodeURIComponent(titulo)}` },
    { nombre: 'Facebook', icono: 'facebook', href: `https://www.facebook.com/sharer/sharer.php?u=${u}` },
  ]

  const copiar = async () => {
    try {
      await navigator.clipboard.writeText(url)
      setCopiado(true)
      setTimeout(() => setCopiado(false), 2000)
    } catch {
      /* sin permiso de portapapeles: no pasa nada */
    }
  }

  return (
    <div className="compartir-articulo">
      <p className="lateral-titulo">{t.compartir}</p>
      <div>
        {redes.map((r) => (
          <a key={r.nombre} className="boton-icono" href={r.href} target="_blank" rel="noreferrer" aria-label={t.compartirEn(r.nombre)} title={r.nombre}>
            <Icono nombre={r.icono} tamano={18} />
          </a>
        ))}
        <button className="boton-icono" onClick={copiar} aria-label={t.copiarEnlace} title={copiado ? t.enlaceCopiado : t.copiarEnlace}>
          <Icono nombre={copiado ? 'listo' : 'copiar'} tamano={18} />
        </button>
        <span className="compartir-aviso" role="status">
          {copiado ? t.enlaceCopiado : ''}
        </span>
      </div>
    </div>
  )
}
