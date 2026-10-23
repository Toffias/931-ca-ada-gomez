'use client'

import { useVisor } from '../visor/store'
import type { VistaVisor } from '../visor/tipos'
import { Icono } from './Icono'
import { useTextos } from './ProveedorIdioma'

export function BarraVistas({ vistas }: { vistas: VistaVisor[] }) {
  const { vista, hora, cargado, camarasDelModelo, irAVista, set } = useVisor()
  const t = useTextos().visor3d
  // si el CMS no define vistas, se ofrecen todas las cámaras del modelo
  const lista: VistaVisor[] = vistas.length
    ? vistas.filter((v) => camarasDelModelo.includes(v.camara) || !cargado)
    : camarasDelModelo.map((c) => ({ camara: c, etiqueta: c.replace(/^Cam_/, '') }))
  const actual = vista?.camara ?? lista[0]?.camara

  return (
    <nav className="barra-vistas" aria-label={t.vistas}>
      <div className="grupo">
        {lista.map((v) => (
          <button key={v.camara} className={actual === v.camara ? 'activo' : ''} onClick={() => irAVista(v.camara)}>
            {v.etiqueta}
          </button>
        ))}
      </div>
      {/* día → atardecer → noche; los extremos llevan de un toque a pleno día o plena noche (la escena lo anima) */}
      <div className="grupo barra-hora">
        <button className="boton-hora" aria-label={t.dia} title={t.dia} onClick={() => set({ hora: 0 })}>
          <Icono nombre="sol" tamano={18} />
        </button>
        <input
          type="range"
          min={0}
          max={1}
          step={0.01}
          value={hora}
          aria-label={t.hora}
          aria-valuetext={hora < 0.3 ? t.dia : hora < 0.7 ? t.atardecer : t.noche}
          onChange={(e) => set({ hora: Number(e.target.value) })}
        />
        <button className="boton-hora" aria-label={t.noche} title={t.noche} onClick={() => set({ hora: 1 })}>
          <Icono nombre="luna" tamano={18} />
        </button>
      </div>
    </nav>
  )
}
