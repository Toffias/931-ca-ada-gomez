'use client'

import { useProyecto } from '@/lib/store-proyecto'

import { Modal } from '../ui/Modal'
import { useTextos } from '../ui/ProveedorIdioma'
import { FormConsulta } from './FormConsulta'

/** modal global: cualquier botón "Consultar precio" lo abre con `useProyecto.set({ consulta: {...} })` */
export function ConsultaModal(props: { privacidad?: string | null; whatsapp?: string | null; motivos?: string[] }) {
  const pedido = useProyecto((s) => s.consulta)
  const set = useProyecto((s) => s.set)
  const t = useTextos().consulta
  const cerrar = () => set({ consulta: null })
  const titulo = pedido?.unidad
    ? t.titulo(pedido.origen === 'precio' ? t.consultarPrecio : t.consultar, pedido.unidad.codigo)
    : t.consultanos

  return (
    <Modal abierto={!!pedido} onCerrar={cerrar} titulo={titulo}>
      {pedido && <FormConsulta key={`${pedido.origen}-${pedido.unidad?.id ?? ''}`} pedido={pedido} onListo={cerrar} {...props} />}
    </Modal>
  )
}
