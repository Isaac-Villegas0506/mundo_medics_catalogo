import type { MetadataRoute } from 'next';

/**
 * Fase 8 (12.2): robots.txt.
 *
 * - El panel de administración y el login quedan fuera de los buscadores.
 * - Las búsquedas internas (`?q=`) no se indexan para evitar contenido duplicado.
 * - Se declara el sitemap.
 */
export default function robots(): MetadataRoute.Robots {
  const base = (process.env.NEXT_PUBLIC_SITE_URL || 'https://mundo-medics-catalogo.vercel.app').replace(/\/+$/, '');

  return {
    rules: [
      {
        userAgent: '*',
        allow: '/',
        disallow: ['/admin', '/admin/', '/login', '/api/'],
      },
    ],
    sitemap: `${base}/sitemap.xml`,
    host: base,
  };
}
