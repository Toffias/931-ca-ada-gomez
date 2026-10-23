import { type NextRequest, NextResponse } from 'next/server'

import { obtenerProyecto } from '@/lib/datos'
import { armarFolleto } from '@/lib/folleto'
import { enIdioma } from '@/lib/idioma-servidor'
import { esIdioma, IDIOMA_DEFECTO } from '@/lib/idiomas'
import { textosDe } from '@/textos'

// Folleto promocional en PDF (lo pide el botón "Descargar PDF" del QR). Los Route Handlers no ven el idioma:
// llega en ?idioma=. ?url= es la pantalla desde la que se pidió y va en el QR del cierre; sólo se acepta del propio sitio.
export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
  const q = req.nextUrl.searchParams
  const pedido = q.get('idioma')
  const idioma = esIdioma(pedido) ? pedido : IDIOMA_DEFECTO
  const origen = process.env.NEXT_PUBLIC_SITE_URL || req.nextUrl.origin
  const propios = new Set([req.nextUrl.origin, new URL(origen).origin])
  let url = new URL('/', origen).href
  try {
    const u = new URL(q.get('url') ?? '')
    if (propios.has(u.origin)) url = u.href
  } catch {
    /* sin url o mal formada: el QR lleva al inicio */
  }

  try {
    // el contenido del admin también va en el idioma pedido
    const pdf = await enIdioma(idioma, () => armarFolleto({ idioma, url, origen }))
    const nombre = textosDe(idioma).folleto.archivo((await obtenerProyecto()).nombre)
    return new NextResponse(pdf, {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="folleto.pdf"; filename*=UTF-8''${encodeURIComponent(nombre)}`,
        'Cache-Control': 'private, no-store',
      },
    })
  } catch (err) {
    console.error('[folleto] no se pudo armar el PDF', err)
    return NextResponse.json({ error: 'folleto' }, { status: 500 })
  }
}
