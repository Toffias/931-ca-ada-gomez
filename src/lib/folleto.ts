import 'server-only'

import fs from 'fs/promises'
import { jsPDF } from 'jspdf'
import path from 'path'
import QRCode from 'qrcode'
import sharp from 'sharp'

import { textosDe } from '@/textos'

import { cifrasDelProyecto } from './cifras'
import { imagen, obtenerAmenities, obtenerProyecto, obtenerSitio, obtenerTorres, obtenerUnidadesDeTorre } from './datos'
import { vistasGiro } from './escenas'
import { etiquetaVista } from './etiquetas'
import type { Idioma } from './idiomas'
import { seccionesVisibles } from './navegacion'
import type { Imagen } from './tipos'

// Folleto promocional en PDF (A4 apaisado), armado con el mismo contenido y orden que El proyecto: portada, texto del
// proyecto y cifras, el edificio desde varias vistas, cada torre, amenities, ubicación y cierre con contacto y QR.
// Sin los efectos de scroll; cada bloque se omite si no tiene contenido, igual que en la pantalla.

const W = 297
const H = 210
const M = 18
/** resolución de las fotos embebidas (px por mm ≈ 170 dpi): nítido en pantalla y aceptable impreso */
const PX_MM = 6.7

type RGB = [number, number, number]

const hex = (h: string): RGB => {
  const s = h.replace('#', '')
  const n = parseInt(s.length === 3 ? s.replace(/./g, '$&$&') : s.slice(0, 6), 16)
  return Number.isNaN(n) ? [0, 0, 0] : [(n >> 16) & 255, (n >> 8) & 255, n & 255]
}
const mezclar = (a: RGB, b: RGB, t: number): RGB => a.map((v, i) => Math.round(v + (b[i] - v) * t)) as RGB
const BLANCO: RGB = [255, 255, 255]
const NEGRO: RGB = [0, 0, 0]
/** texto encima de fotos: fijo en los dos temas, como --texto-imagen */
const SOBRE_FOTO: RGB = hex('#f4f6f9')

/** espejo de los tokens de estilos.css para cada tema */
function paleta(tema: 'oscuro' | 'claro', fondoHex: string, acentoHex: string) {
  const fondo = hex(fondoHex)
  const acento = hex(acentoHex)
  return tema === 'claro'
    ? { fondo, superficie: mezclar(fondo, BLANCO, 0.85), linea: mezclar(fondo, NEGRO, 0.12), texto: hex('#1b1f27'), texto2: hex('#3d444f'), muted: hex('#69717d'), acento: mezclar(acento, NEGRO, 0.38) }
    : { fondo, superficie: mezclar(fondo, BLANCO, 0.04), linea: mezclar(fondo, BLANCO, 0.12), texto: hex('#eef1f5'), texto2: hex('#cfd5de'), muted: hex('#9aa4b2'), acento }
}

/** las fuentes estándar del PDF sólo tienen Latin-1: se cambian comillas tipográficas y guiones largos */
const limpio = (s: string) =>
  s
    .replace(/[‘’‚′]/g, "'")
    .replace(/[“”„″]/g, '"')
    .replace(/[–—]/g, '-')
    .replace(/…/g, '...')
    .replace(/[^\n\t\x20-\xFF]/g, '')

/** lee un archivo de Media: del disco (media/) o, con storage externo, por HTTP */
async function leer(url: string, origen: string): Promise<Buffer | null> {
  const nombre = decodeURIComponent(url.split('?')[0].split('/').pop() ?? '')
  if (nombre) {
    try {
      return await fs.readFile(path.resolve(process.cwd(), 'media', nombre))
    } catch {
      /* no está en disco */
    }
  }
  try {
    const r = await fetch(new URL(url, origen))
    return r.ok ? Buffer.from(await r.arrayBuffer()) : null
  } catch {
    return null
  }
}

const VELO = (w: number, h: number) =>
  Buffer.from(
    `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}"><defs><linearGradient id="g" x1="0" y1="0" x2="0" y2="1">` +
      `<stop offset="0" stop-color="#080a0e" stop-opacity=".45"/><stop offset=".5" stop-color="#080a0e" stop-opacity=".35"/>` +
      `<stop offset="1" stop-color="#080a0e" stop-opacity=".85"/></linearGradient></defs><rect width="100%" height="100%" fill="url(#g)"/></svg>`,
  )

type Foto = { datos: Uint8Array; formato: 'JPEG' | 'PNG'; ancho: number; alto: number }

/** foto recortada para llenar la caja (como object-fit: cover), en JPEG */
async function fotoCaja(url: string, origen: string, wMm: number, hMm: number, velo = false): Promise<Foto | null> {
  const buf = await leer(url, origen)
  if (!buf) return null
  const w = Math.min(2200, Math.round(wMm * PX_MM))
  const h = Math.round((w * hMm) / wMm)
  try {
    let img = sharp(buf).rotate().resize(w, h, { fit: 'cover', position: 'attention' })
    if (velo) img = img.composite([{ input: VELO(w, h) }])
    const datos = await img.flatten({ background: '#000' }).jpeg({ quality: 80, mozjpeg: true }).toBuffer()
    return { datos, formato: 'JPEG', ancho: w, alto: h }
  } catch {
    return null
  }
}

/** logo con su transparencia (PNG), para calzarlo en una caja sin deformarlo */
async function logo(url: string, origen: string): Promise<Foto | null> {
  const buf = await leer(url, origen)
  if (!buf) return null
  try {
    const { data, info } = await sharp(buf, { density: 300 }).resize({ height: 360, withoutEnlargement: false }).png().toBuffer({ resolveWithObject: true })
    return { datos: data, formato: 'PNG', ancho: info.width, alto: info.height }
  } catch {
    return null
  }
}

export async function armarFolleto({ idioma, url, origen }: { idioma: Idioma; url: string; origen: string }): Promise<ArrayBuffer> {
  const t = textosDe(idioma)
  const tx = t.proyecto
  const [proyecto, sitio, torres, vistas, amenities, visibles] = await Promise.all([
    obtenerProyecto(),
    obtenerSitio(),
    obtenerTorres(),
    vistasGiro(),
    obtenerAmenities(),
    seccionesVisibles(),
  ])
  const unidades = (await Promise.all(torres.map((x) => obtenerUnidadesDeTorre(x.slug)))).flat()
  const t0 = torres[0]
  const c = paleta(proyecto.tema === 'claro' ? 'claro' : 'oscuro', proyecto.tema === 'claro' ? proyecto.fondoClaro : proyecto.fondo, proyecto.acento)
  // Cormorant es la opción serif del admin: en el PDF los títulos van en Times; las otras, en Helvetica
  const titulos = proyecto.tipografia === 'cormorant' ? (['times', 'normal'] as const) : (['helvetica', 'bold'] as const)

  const pdf = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4', compress: true })
  pdf.setProperties({ title: proyecto.nombre, subject: proyecto.eslogan ?? '', creator: proyecto.desarrolladora.nombre ?? proyecto.nombre })
  pdf.setLineHeightFactor(1.35)

  // ---------- utilidades de dibujo ----------
  const pt = (n: number) => n * 0.3528 // pt → mm
  const color = (rgb: RGB) => pdf.setTextColor(...rgb)
  const fuente = (tamano: number, estilo: 'normal' | 'bold' | 'titulo' = 'normal') => {
    if (estilo === 'titulo') pdf.setFont(titulos[0], titulos[1])
    else pdf.setFont('helvetica', estilo)
    pdf.setFontSize(tamano)
  }
  const alto = (lineas: number, tamano: number) => lineas * pt(tamano) * 1.35
  const texto = (s: string | string[], x: number, y: number, opts: { align?: 'left' | 'center' | 'right'; charSpace?: number } = {}) =>
    pdf.text(Array.isArray(s) ? s.map(limpio) : limpio(s), x, y, { baseline: 'top', ...opts })
  /** el tamaño más grande (entre max y min) con el que el texto entra en la caja; si ni el mínimo alcanza, se corta */
  const ajustar = (s: string, ancho: number, altoMax: number, max: number, min: number, estilo: 'normal' | 'bold' | 'titulo' = 'normal') => {
    for (let tam = max; tam >= min; tam -= 0.5) {
      fuente(tam, estilo)
      const lineas: string[] = pdf.splitTextToSize(limpio(s), ancho)
      if (alto(lineas.length, tam) <= altoMax || tam - 0.5 < min) {
        const entran = Math.max(1, Math.floor(altoMax / (pt(tam) * 1.35)))
        return { tam, lineas: lineas.length > entran ? [...lineas.slice(0, entran - 1), `${lineas[entran - 1].replace(/\s*\S*$/, '')}...`] : lineas }
      }
    }
    return { tam: min, lineas: [] as string[] }
  }
  const kicker = (s: string, x: number, y: number, rgb = c.acento, align: 'left' | 'center' = 'left') => {
    fuente(8, 'bold')
    color(rgb)
    // charSpace corre el centro: se compensa a mano
    const ancho = pdf.getTextWidth(limpio(s.toUpperCase())) + 0.7 * s.length
    texto(s.toUpperCase(), align === 'center' ? x - ancho / 2 : x, y, { charSpace: 0.7 })
    return y + 7
  }
  const titulo = (s: string, x: number, y: number, ancho: number, tamano = 28, align: 'left' | 'center' = 'left') => {
    fuente(tamano, 'titulo')
    color(c.texto)
    const lineas: string[] = pdf.splitTextToSize(limpio(s), ancho)
    texto(lineas, x, y, { align })
    return y + alto(lineas.length, tamano) + 4
  }
  const poner = (f: Foto | null, x: number, y: number, w: number, h: number) => {
    if (f) pdf.addImage(f.datos, f.formato, x, y, w, h, undefined, 'FAST')
    else {
      pdf.setFillColor(...c.superficie)
      pdf.rect(x, y, w, h, 'F')
    }
  }
  const dominio = (() => {
    try {
      return new URL(origen).host
    } catch {
      return ''
    }
  })()
  let paginas = 0
  const pagina = () => {
    if (paginas++) pdf.addPage()
    pdf.setFillColor(...c.fondo)
    pdf.rect(0, 0, W, H, 'F')
  }
  const pie = () => {
    fuente(7)
    color(c.muted)
    texto(proyecto.nombre, M, H - 10)
    texto(`${dominio}   ${String(paginas).padStart(2, '0')}`, W - M, H - 10, { align: 'right' })
  }

  // ---------- portada ----------
  const fondo = imagen(sitio.intro?.poster) ?? t0?.portada ?? vistas[0]?.imagen ?? null
  const [fotoPortada, logoProyecto, logoDesarrolladora] = await Promise.all([
    fondo ? fotoCaja(fondo.grande, origen, W, H, true) : null,
    proyecto.logo ? logo(proyecto.logo.url, origen) : null,
    proyecto.desarrolladora.logo ? logo(proyecto.desarrolladora.logo.url, origen) : null,
  ])
  pagina()
  if (fotoPortada) poner(fotoPortada, 0, 0, W, H)
  const sobre = fotoPortada ? SOBRE_FOTO : c.texto
  let y = 72
  if (t0?.estadoObra) {
    const estado = (t.estadoObra[t0.estadoObra] ?? t0.estadoObra) + (t0.entrega ? ` · ${t.intro.entrega(t0.entrega)}` : '')
    y = kicker(estado, W / 2, y, fotoPortada ? SOBRE_FOTO : c.acento, 'center') + 4
  }
  if (logoProyecto) {
    const escala = Math.min(130 / logoProyecto.ancho, 36 / logoProyecto.alto)
    const lw = logoProyecto.ancho * escala
    const lh = logoProyecto.alto * escala
    poner(logoProyecto, (W - lw) / 2, y, lw, lh)
    y += lh + 8
  } else {
    fuente(40, 'titulo')
    color(sobre)
    const lineas: string[] = pdf.splitTextToSize(limpio(proyecto.nombre), W - 4 * M)
    texto(lineas, W / 2, y, { align: 'center' })
    y += alto(lineas.length, 40) + 6
  }
  if (proyecto.eslogan) {
    fuente(14)
    color(sobre)
    texto(pdf.splitTextToSize(limpio(proyecto.eslogan), W - 6 * M), W / 2, y, { align: 'center' })
  }
  if (logoDesarrolladora) {
    const escala = Math.min(40 / logoDesarrolladora.ancho, 11 / logoDesarrolladora.alto)
    poner(logoDesarrolladora, (W - logoDesarrolladora.ancho * escala) / 2, H - 14 - logoDesarrolladora.alto * escala, logoDesarrolladora.ancho * escala, logoDesarrolladora.alto * escala)
  } else if (proyecto.desarrolladora.nombre) {
    fuente(8.5)
    color(sobre)
    texto(t.comun.desarrolloDe(proyecto.desarrolladora.nombre), W / 2, H - 18, { align: 'center' })
  }

  // ---------- el proyecto + en números ----------
  const manifiesto = proyecto.descripcion || t0?.bajada
  const cifras = cifrasDelProyecto(torres, unidades, tx).slice(0, 5)
  if (manifiesto || cifras.length) {
    pagina()
    const altoCifras = cifras.length ? 42 : 0
    y = M + 8
    if (manifiesto) {
      // el texto va centrado en el alto que deja libre la franja de cifras, con su título pegado arriba
      const espacio = H - y - M - altoCifras - 16
      const { tam, lineas } = ajustar(manifiesto, W - 2 * M - 30, espacio, 26, 11, 'titulo')
      y += Math.max(0, (espacio - alto(lineas.length, tam) - 9) / 2)
      y = kicker(tx.kickerManifiesto, M, y) + 2
      fuente(tam, 'titulo')
      color(c.texto)
      texto(lineas, M, y)
    }
    if (cifras.length) {
      const y0 = H - M - altoCifras
      pdf.setDrawColor(...c.linea)
      pdf.setLineWidth(0.3)
      pdf.line(M, y0, W - M, y0)
      kicker(tx.kickerCifras, M, y0 + 6)
      const ancho = (W - 2 * M) / cifras.length
      cifras.forEach((cf, i) => {
        const x = M + i * ancho
        const valor = String(cf.valor)
        const { tam } = ajustar(valor, ancho - 6, 14, 30, 12, 'titulo')
        fuente(tam, 'titulo')
        color(c.acento)
        texto(valor, x, y0 + 16)
        fuente(7.5, 'bold')
        color(c.muted)
        texto(cf.etiqueta.toUpperCase(), x, y0 + 33, { charSpace: 0.4 })
      })
    }
    pie()
  }

  // ---------- el edificio (vistas del giro) ----------
  if (vistas.length) {
    // hasta cuatro vistas repartidas en la vuelta
    const n = Math.min(4, vistas.length)
    const elegidas = Array.from({ length: n }, (_, i) => ({ v: vistas[Math.floor((i * vistas.length) / n)], i: Math.floor((i * vistas.length) / n) }))
    pagina()
    y = kicker(tx.kickerGiro, M, M + 4)
    y = titulo(tx.tituloGiro, M, y, W - 2 * M, 24) + 2
    // las fotos llenan el resto de la página (recortadas como cover): con tres, una grande y dos a la derecha
    const hueco = 6
    const rotulo = 8
    const ancho = W - 2 * M
    const disponible = H - y - M - 6
    const celdas: [number, number, number, number][] =
      n === 1
        ? [[0, 0, ancho, disponible - rotulo]]
        : n === 2
          ? [0, 1].map((k) => [k * ((ancho + hueco) / 2), 0, (ancho - hueco) / 2, disponible - rotulo])
          : n === 3
            ? [
                [0, 0, ancho * 0.62, disponible - rotulo],
                [ancho * 0.62 + hueco, 0, ancho * 0.38 - hueco, (disponible - hueco) / 2 - rotulo],
                [ancho * 0.62 + hueco, (disponible + hueco) / 2, ancho * 0.38 - hueco, (disponible - hueco) / 2 - rotulo],
              ]
            : [0, 1, 2, 3].map((k) => [
                (k % 2) * ((ancho + hueco) / 2),
                Math.floor(k / 2) * ((disponible + hueco) / 2),
                (ancho - hueco) / 2,
                (disponible - hueco) / 2 - rotulo,
              ])
    const fotos = await Promise.all(elegidas.map(({ v }, k) => fotoCaja(v.imagen.grande, origen, celdas[k][2], celdas[k][3])))
    elegidas.forEach(({ v, i }, k) => {
      const [cx, cy, cw, ch] = celdas[k]
      poner(fotos[k], M + cx, y + cy, cw, ch)
      fuente(8)
      color(c.muted)
      texto(etiquetaVista(t, v.etiqueta, i), M + cx, y + cy + ch + 2.5)
    })
    pie()
  }

  // ---------- torres ----------
  for (const [i, x] of torres.entries()) {
    const foto = x.portada ?? x.galeria[0]
    const segunda = x.galeria.find((g) => g.url !== foto?.url)
    pagina()
    const colFoto = (W - 2 * M) * 0.52
    const xFoto = i % 2 ? W - M - colFoto : M
    const xTexto = i % 2 ? M : M + colFoto + 14
    const anchoTexto = W - 2 * M - colFoto - 14
    const altoFotos = H - 2 * M - 6
    const altoPrimera = segunda ? altoFotos * 0.64 : altoFotos
    const [f1, f2] = await Promise.all([
      foto ? fotoCaja(foto.grande, origen, colFoto, altoPrimera) : null,
      segunda ? fotoCaja(segunda.grande, origen, colFoto, altoFotos - altoPrimera - 4) : null,
    ])
    if (foto) poner(f1, xFoto, M, colFoto, altoPrimera)
    if (segunda) poner(f2, xFoto, M + altoPrimera + 4, colFoto, altoFotos - altoPrimera - 4)
    y = M + 10
    if (x.direccion) y = kicker(x.direccion, xTexto, y)
    y = titulo(x.nombre, xTexto, y, anchoTexto, 28) + 2
    if (x.bajada && x.bajada !== manifiesto) {
      const reservado = x.caracteristicas.length ? Math.min(x.caracteristicas.length, 8) * 7 + 6 : 0
      const { tam, lineas } = ajustar(x.bajada, anchoTexto, H - y - M - 10 - reservado, 11, 8.5)
      fuente(tam)
      color(c.texto2)
      texto(lineas, xTexto, y)
      y += alto(lineas.length, tam) + 6
    }
    for (const car of x.caracteristicas.slice(0, 8)) {
      if (y > H - M - 12) break
      pdf.setFillColor(...c.acento)
      pdf.rect(xTexto, y + 1.3, 1.6, 1.6, 'F')
      fuente(10)
      color(c.texto)
      const lineas: string[] = pdf.splitTextToSize(limpio(car), anchoTexto - 6)
      texto(lineas.slice(0, 2), xTexto + 5, y)
      y += alto(Math.min(2, lineas.length), 10) + 2.5
    }
    pie()
  }

  // ---------- amenities: tarjetas de a seis por página ----------
  if (visibles.amenities && amenities.length) {
    const columnas = 3
    const hueco = 8
    const cw = (W - 2 * M - hueco * (columnas - 1)) / columnas
    const ih = cw * 0.58
    for (let desde = 0; desde < amenities.length; desde += 6) {
      const tanda = amenities.slice(desde, desde + 6)
      pagina()
      y = kicker(tx.kickerAmenities, M, M + 4)
      y = titulo(tx.tituloAmenities, M, y, W - 2 * M, 22)
      const fotos = await Promise.all(tanda.map((a) => (a.imagenes[0] ? fotoCaja(a.imagenes[0].chica, origen, cw, ih) : null)))
      const altoTarjeta = (H - y - M - 6 - hueco) / 2
      tanda.forEach((a, k) => {
        const x = M + (k % columnas) * (cw + hueco)
        const yy = y + Math.floor(k / columnas) * (altoTarjeta + hueco)
        const altoFoto = Math.min(ih, altoTarjeta - 22)
        poner(fotos[k], x, yy, cw, altoFoto)
        fuente(11, 'bold')
        color(c.texto)
        texto(pdf.splitTextToSize(limpio(a.nombre), cw)[0], x, yy + altoFoto + 3)
        if (a.descripcion) {
          const { tam, lineas } = ajustar(a.descripcion.split(/\n\s*\n/)[0], cw, altoTarjeta - altoFoto - 10, 8.5, 8.5)
          fuente(tam)
          color(c.muted)
          texto(lineas, x, yy + altoFoto + 9)
        }
      })
      pie()
    }
  }

  // ---------- ubicación ----------
  const u = sitio.ubicacion
  if (visibles.ubicacion && (u?.barrio || u?.direccion || u?.texto)) {
    const fotoUbicacion = imagen(u?.foto) ?? imagen(u?.mapaIlustrado) ?? t0?.galeria[0] ?? null
    pagina()
    const colFoto = (W - 2 * M) * 0.52
    const conFoto = fotoUbicacion ? await fotoCaja(fotoUbicacion.grande, origen, colFoto, H - 2 * M - 6) : null
    if (conFoto) poner(conFoto, M, M, colFoto, H - 2 * M - 6)
    const xTexto = conFoto ? M + colFoto + 14 : M
    const anchoTexto = conFoto ? W - 2 * M - colFoto - 14 : W - 2 * M
    y = kicker(tx.kickerUbicacion, xTexto, M + 10)
    y = titulo(u.barrio || u.direccion || '', xTexto, y, anchoTexto, 28)
    if (u.barrio && u.direccion) {
      fuente(10.5, 'bold')
      color(c.texto2)
      texto(u.direccion, xTexto, y)
      y += 9
    }
    if (u.texto) {
      const { tam, lineas } = ajustar(u.texto, anchoTexto, H - y - M - 10, 11, 8)
      fuente(tam)
      color(c.texto2)
      texto(lineas, xTexto, y)
    }
    pie()
  }

  // ---------- cierre: contacto, QR y legales ----------
  pagina()
  const ladoQR = 56
  const xQR = W - M - ladoQR
  const anchoIzq = xQR - M - 16
  y = kicker(t.folleto.contacto, M, M + 10)
  y = titulo(tx.tituloCierre, M, y, anchoIzq, 30)
  fuente(12)
  color(c.texto2)
  const cierre: string[] = pdf.splitTextToSize(limpio(tx.textoCierre), anchoIzq)
  texto(cierre, M, y)
  y += alto(cierre.length, 12) + 10
  const k = proyecto.contacto
  const datos = [
    [t.folleto.telefono, k.telefono],
    [t.folleto.whatsapp, k.whatsapp && (/^\d+$/.test(k.whatsapp) ? `+${k.whatsapp}` : k.whatsapp)],
    [t.folleto.email, k.email],
    [t.folleto.showroom, k.direccion],
    [t.folleto.horario, k.horario],
    [t.folleto.web, dominio],
  ].filter((d): d is [string, string] => !!d[1])
  const colDato = anchoIzq / 2
  datos.forEach(([etiqueta, valor], i) => {
    const x = M + (i % 2) * colDato
    const yy = y + Math.floor(i / 2) * 15
    fuente(7, 'bold')
    color(c.muted)
    texto(etiqueta.toUpperCase(), x, yy, { charSpace: 0.4 })
    fuente(10.5)
    color(c.texto)
    texto(pdf.splitTextToSize(limpio(valor), colDato - 6)[0], x, yy + 4.5)
  })
  // el QR va sobre blanco en los dos temas: invertido no lo leen todas las cámaras
  const qr = await QRCode.toDataURL(url, { width: 800, margin: 1, errorCorrectionLevel: 'M' })
  const yQR = M + 16
  pdf.setFillColor(255, 255, 255)
  pdf.roundedRect(xQR, yQR, ladoQR, ladoQR, 3, 3, 'F')
  pdf.addImage(qr, 'PNG', xQR + 3, yQR + 3, ladoQR - 6, ladoQR - 6)
  fuente(8.5)
  color(c.texto2)
  texto(pdf.splitTextToSize(limpio(t.folleto.escanear), ladoQR), xQR + ladoQR / 2, yQR + ladoQR + 4, { align: 'center' })

  const yLegal = H - M - 16
  if (logoDesarrolladora) {
    const escala = Math.min(40 / logoDesarrolladora.ancho, 12 / logoDesarrolladora.alto)
    poner(logoDesarrolladora, M, yLegal - 18, logoDesarrolladora.ancho * escala, logoDesarrolladora.alto * escala)
  } else if (proyecto.desarrolladora.nombre) {
    fuente(9, 'bold')
    color(c.texto2)
    texto(t.comun.desarrolloDe(proyecto.desarrolladora.nombre), M, yLegal - 12)
  }
  if (proyecto.legal) {
    pdf.setDrawColor(...c.linea)
    pdf.setLineWidth(0.3)
    pdf.line(M, yLegal - 3, W - M, yLegal - 3)
    const { tam, lineas } = ajustar(proyecto.legal, W - 2 * M, 12, 6.5, 5)
    fuente(tam)
    color(c.muted)
    texto(lineas, M, yLegal)
  }
  pie()

  return pdf.output('arraybuffer')
}
