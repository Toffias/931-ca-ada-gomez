import type { Autor } from '@/lib/tipos'

const iniciales = (nombre: string) =>
  nombre
    .split(/\s+/)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase())
    .join('')

/** foto del autor o, si no hay, sus iniciales */
export function FotoAutor({ autor, tamano }: { autor: Autor; tamano: number }) {
  const estilo = { width: tamano, height: tamano, fontSize: tamano * 0.38 }
  return autor.foto ? (
    <img className="foto-autor" src={autor.foto.chica} alt="" width={tamano} height={tamano} style={estilo} />
  ) : (
    <span className="foto-autor" style={estilo} aria-hidden>
      {iniciales(autor.nombre)}
    </span>
  )
}

// Quién firma la nota: compacta en el lateral, completa (con perfiles) al final del artículo.
export function TarjetaAutor({ autor, titulo, completa }: { autor: Autor; titulo: string; completa?: boolean }) {
  return (
    <section className={`tarjeta-autor${completa ? ' completa' : ''}`}>
      <p className="lateral-titulo">{titulo}</p>
      <div className="tarjeta-autor-caja">
        <div className="tarjeta-autor-nombre">
          <FotoAutor autor={autor} tamano={completa ? 64 : 44} />
          <div>
            <p>{autor.nombre}</p>
            {autor.cargo && <p className="muted">{autor.cargo}</p>}
          </div>
        </div>
        {autor.bio && <p className="tarjeta-autor-bio">{autor.bio}</p>}
        {completa && autor.perfiles.length > 0 && (
          <ul className="tarjeta-autor-perfiles">
            {autor.perfiles.map((url) => (
              <li key={url}>
                <a href={url} target="_blank" rel="noreferrer me">
                  {url.replace(/^https?:\/\/(www\.)?/, '').replace(/\/$/, '')}
                </a>
              </li>
            ))}
          </ul>
        )}
      </div>
    </section>
  )
}
