import { NextResponse } from 'next/server'

import { obtenerDisponibilidad } from '@/lib/datos'

// Estado y precio de cada unidad, chico y aparte del resto para poder refrescarlo seguido
// (lo lee src/components/proyecto/SincronizarDisponibilidad.tsx). Mañana lo puede escribir un CRM.
export const dynamic = 'force-dynamic'

export async function GET() {
  const datos = await obtenerDisponibilidad()
  return NextResponse.json(datos, {
    headers: { 'Cache-Control': 'public, s-maxage=30, stale-while-revalidate=120' },
  })
}
