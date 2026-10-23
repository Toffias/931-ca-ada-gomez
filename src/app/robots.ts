import type { MetadataRoute } from 'next'

// Todo el sitio abierto a buscadores y a los rastreadores de IA (GPTBot, ClaudeBot, PerplexityBot…): la idea es que
// el proyecto aparezca y se cite. Sólo quedan afuera el admin y las APIs.
export default function robots(): MetadataRoute.Robots {
  const base = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'
  return {
    rules: [{ userAgent: '*', allow: '/', disallow: ['/admin', '/api/'] }],
    sitemap: new URL('/sitemap.xml', base).toString(),
    host: base,
  }
}
