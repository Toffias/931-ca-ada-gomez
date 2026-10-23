// Íconos de trazo (24×24, heredan el color del texto). Se agregan acá a medida que hagan falta.

const TRAZOS = {
  menu: 'M4 7h16M4 12h16M4 17h16',
  cerrar: 'M6 6l12 12M18 6L6 18',
  atras: 'M15 5l-7 7 7 7',
  izquierda: 'M15 5l-7 7 7 7',
  derecha: 'M9 5l7 7-7 7',
  arriba: 'M5 15l7-7 7 7',
  abajo: 'M5 9l7 7 7-7',
  mas: 'M12 5v14M5 12h14',
  menos: 'M5 12h14',
  qr: 'M4 4h6v6H4zM14 4h6v6h-6zM4 14h6v6H4zM14 14h2v2h-2zM18 14h2v2h-2zM14 18h2v2h-2zM18 18h2v2h-2zM16 16h2v2h-2z',
  pantalla: 'M4 9V4h5M20 9V4h-5M4 15v5h5M20 15v5h-5',
  salirPantalla: 'M9 4v5H4M15 4v5h5M9 20v-5H4M15 20v-5h5',
  restablecer: 'M4 12a8 8 0 1 0 2.3-5.7M4 4v4h4',
  edificio: 'M5 21V4h9v17M14 9h5v12M8 8h2M8 12h2M8 16h2M17 13h0M17 17h0M3 21h18',
  planta: 'M4 4h16v16H4zM4 12h7M11 4v16M15 12h5',
  fachada: 'M6 21V3h12v18M9 7h2M13 7h2M9 11h2M13 11h2M9 15h2M13 15h2M3 21h18',
  cubo: 'M12 3l8 4.5v9L12 21l-8-4.5v-9zM12 12l8-4.5M12 12v9M12 12L4 7.5',
  estrella: 'M12 4l2.4 5 5.6.8-4 3.9.9 5.5L12 16.6 7.1 19.2 8 13.7 4 9.8l5.6-.8z',
  tour: 'M12 4a8 8 0 1 0 0 16 8 8 0 1 0 0-16zM4 12h16M12 4c2.5 2.5 2.5 13.5 0 16M12 4c-2.5 2.5-2.5 13.5 0 16',
  galeria: 'M4 5h16v14H4zM4 16l5-5 4 4 3-3 4 4M15 9h0',
  video: 'M4 6h12v12H4zM16 10l4-2.5v9L16 14',
  obra: 'M4 20h16M6 20V10l6-5 6 5v10M10 20v-5h4v5',
  ubicacion: 'M12 21s-7-6.2-7-11.5A7 7 0 0 1 19 9.5C19 14.8 12 21 12 21zM12 12a2.5 2.5 0 1 0 0-5 2.5 2.5 0 1 0 0 5z',
  contacto: 'M4 6h16v12H4zM4 7l8 6 8-6',
  blog: 'M5 4h11l3 3v13H5zM8 9h8M8 13h8M8 17h5',
  listo: 'M5 12.5l4.5 4.5L19 7',
  chispa: 'M12 3l1.8 5.2L19 10l-5.2 1.8L12 17l-1.8-5.2L5 10l5.2-1.8zM19 16l.7 1.8 1.8.7-1.8.7L19 21l-.7-1.8-1.8-.7 1.8-.7z',
  linkedin: 'M4 9h3v11H4zM5.5 4.2a1.5 1.5 0 1 0 0 3 1.5 1.5 0 1 0 0-3zM10 9h3v1.7c.6-1 1.8-1.9 3.4-1.9 2.6 0 3.6 1.7 3.6 4.4V20h-3v-6.2c0-1.4-.5-2.3-1.8-2.3s-2.2 1-2.2 2.4V20h-3z',
  equis: 'M4 4l6.6 8.7L4.2 20h1.9l5.4-6.1L16 20h4l-6.9-9.1L19.1 4h-1.9l-4.9 5.6L8 4z',
  facebook: 'M15 4h-2a4 4 0 0 0-4 4v3H7v3h2v7h3v-7h3l.5-3H12V8a1 1 0 0 1 1-1h2z',
  telefono: 'M6 3h3l2 5-2.5 1.5a11 11 0 0 0 6 6L16 13l5 2v3a2 2 0 0 1-2 2A16 16 0 0 1 4 5a2 2 0 0 1 2-2z',
  whatsapp: 'M4 20l1.3-4A8 8 0 1 1 8 18.7zM9 8.5c0 3.5 3 6.5 6.5 6.5l1-1.5-2-1-1 1a4 4 0 0 1-2.5-2.5l1-1-1-2z',
  compartir: 'M16 6l-4-3-4 3M12 3v12M6 11H5v9h14v-9h-1',
  descarga: 'M12 4v11M7 10l5 5 5-5M5 20h14',
  info: 'M12 8h0M11 12h1v5h1M12 3a9 9 0 1 0 0 18 9 9 0 1 0 0-18z',
  copiar: 'M9 9h11v11H9zM5 15V4h11',
  dormitorio: 'M3 18v-8h18v8M3 14h18M6 10V7h5v3',
  bano: 'M4 12h16v2a5 5 0 0 1-5 5H9a5 5 0 0 1-5-5zM6 12V5a2 2 0 0 1 4 0',
  superficie: 'M4 4h16v16H4zM4 9h3M4 14h3M9 4v3M14 4v3',
  norte: 'M12 3l4 9h-8zM12 12v9',
  sol: 'M12 8a4 4 0 1 0 0 8 4 4 0 1 0 0-8zM12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4',
  luna: 'M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9z',
} as const

export type NombreIcono = keyof typeof TRAZOS

export function Icono({ nombre, tamano = 20, className }: { nombre: NombreIcono; tamano?: number; className?: string }) {
  return (
    <svg
      width={tamano}
      height={tamano}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.7}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
      className={className}
    >
      <path d={TRAZOS[nombre]} />
    </svg>
  )
}
