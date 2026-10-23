// Tipos serializables que el servidor (Payload) le pasa al visor 3D.

export type EstadoUnidad = 'disponible' | 'reservada' | 'vendida'

export type UnidadVisor = {
  id: number | string
  codigo: string
  piso: number
  estado: EstadoUnidad
  tipologia?: string | null
  dormitorios?: number | null
  banos?: number | null
  superficieCubierta?: number | null
  superficieTotal?: number | null
  orientacion?: string | null
  precio?: number | null
  moneda?: 'USD' | 'ARS' | null
  mostrarPrecio?: boolean | null
  planoUrl?: string | null
}

export type VistaVisor = { camara: string; etiqueta: string; alturaObjetivo?: number | null }

export type ConfigVisor = {
  edificioId: number | string
  nombre: string
  modeloUrl: string
  portadaUrl?: string | null
  escala: number
  /** texturas triplanares de revoque, piedra, veredas, etc. (convenciones.ts → TEXTURAS) */
  texturas: boolean
  solElevacion: number
  solAzimut: number
  ventanasNoche: {
    material: string
    alturaPrimerPiso: number
    alturaPiso: number
    anchoVentana: number
    encendidas: number
  }
  vistas: VistaVisor[]
}

export const COLOR_ESTADO: Record<EstadoUnidad, string> = {
  disponible: '#3fbf7f',
  reservada: '#e6a23c',
  vendida: '#e25555',
}
