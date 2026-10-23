'use client'

import { usePathname, useSearchParams } from 'next/navigation'
import QRCode from 'qrcode'
import { useEffect, useState } from 'react'

import { useProyecto } from '@/lib/store-proyecto'

import { Icono } from '../ui/Icono'
import { Modal } from '../ui/Modal'
import { useIdioma, useTextos } from '../ui/ProveedorIdioma'

// QR de la pantalla actual, para pasar del tótem o la pantalla del showroom al celular.
// "Descargar PDF" baja el folleto del proyecto (lo arma /api/folleto, con el QR de esta pantalla en el cierre).
export function ModalQR({ nombre }: { nombre: string }) {
  const abierto = useProyecto((s) => s.qrAbierto)
  const set = useProyecto((s) => s.set)
  const textos = useTextos()
  const t = textos.qr
  const idioma = useIdioma()
  const pathname = usePathname()
  const params = useSearchParams()
  const [qr, setQr] = useState<string | null>(null)
  const [url, setUrl] = useState('')
  const [pdf, setPdf] = useState<'listo' | 'generando' | 'error'>('listo')

  useEffect(() => {
    if (!abierto) return
    const actual = window.location.href
    setUrl(actual)
    QRCode.toDataURL(actual, { width: 720, margin: 1, errorCorrectionLevel: 'M' }).then(setQr, () => setQr(null))
  }, [abierto, pathname, params])

  const descargarPDF = async () => {
    setPdf('generando')
    try {
      const r = await fetch(`/api/folleto?${new URLSearchParams({ idioma, url })}`)
      if (!r.ok) throw new Error(String(r.status))
      const enlace = document.createElement('a')
      enlace.href = URL.createObjectURL(await r.blob())
      enlace.download = textos.folleto.archivo(nombre)
      enlace.click()
      setTimeout(() => URL.revokeObjectURL(enlace.href), 10_000)
      setPdf('listo')
    } catch {
      setPdf('error')
    }
  }

  return (
    <Modal abierto={abierto} onCerrar={() => set({ qrAbierto: false })} titulo={t.titulo} angosto>
      <div className="qr">
        {qr ? <img src={qr} alt={t.alt(url)} width={260} height={260} /> : <div className="qr-vacio" />}
        <p className="qr-url">{url}</p>
        <div className="acciones">
          <button className="boton" onClick={() => navigator.clipboard?.writeText(url)}>
            <Icono nombre="copiar" tamano={16} /> {t.copiar}
          </button>
          <button className="boton primario" onClick={descargarPDF} disabled={!url || pdf === 'generando'}>
            <Icono nombre="descarga" tamano={16} /> {pdf === 'generando' ? t.generando : t.pdf}
          </button>
        </div>
        {pdf === 'error' && (
          <p className="qr-error" role="alert">
            {t.error}
          </p>
        )}
      </div>
    </Modal>
  )
}
