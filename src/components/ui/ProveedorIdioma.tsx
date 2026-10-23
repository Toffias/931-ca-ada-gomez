'use client'

import { createContext, useContext } from 'react'

import { IDIOMA_DEFECTO, type Idioma } from '@/lib/idiomas'
import { rutasDe } from '@/lib/rutas'
import { textosDe } from '@/textos'

const ContextoIdioma = createContext<Idioma>(IDIOMA_DEFECTO)

// Lo monta Documento con el idioma de la URL; los componentes cliente lo leen con los hooks de abajo.
export function ProveedorIdioma({ idioma, children }: { idioma: Idioma; children: React.ReactNode }) {
  return <ContextoIdioma.Provider value={idioma}>{children}</ContextoIdioma.Provider>
}

export const useIdioma = () => useContext(ContextoIdioma)
export const useTextos = () => textosDe(useIdioma())
export const useRutas = () => rutasDe(useIdioma())
