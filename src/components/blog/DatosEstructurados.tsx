// JSON-LD en la página (src/lib/datos-estructurados.ts). Se escapa "<" para que un texto del admin no cierre el <script>.
export function DatosEstructurados({ datos }: { datos: object }) {
  return <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(datos).replace(/</g, '\\u003c') }} />
}
