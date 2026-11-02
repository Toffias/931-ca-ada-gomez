import config from '@payload-config'
import { type NextRequest, NextResponse } from 'next/server'
import { getPayload } from 'payload'

import { darDeBaja } from '@/lib/suscripcion-obra'

// Baja en un clic (RFC 8058): el cliente de mail hace POST a la dirección del encabezado List-Unsubscribe.
// La baja con un GET no existe a propósito: los antivirus de correo abren los links y darían de baja a cualquiera.
export async function POST(req: NextRequest) {
  const ok = await darDeBaja(await getPayload({ config }), req.nextUrl.searchParams.get('t') ?? '')
  return new NextResponse(null, { status: ok ? 200 : 404 })
}
