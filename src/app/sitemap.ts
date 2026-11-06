import type { MetadataRoute } from 'next';
import { createPublicClient } from '@/utils/supabase/publicServer';

/**
 * Fase 8 (12.2): sitemap dinámico.
 *
 * Incluye las rutas públicas fijas y una entrada por producto publicado.
 * NO incluye /admin (es privada) ni /login.
 *
 * El catálogo no muestra precios, así que el sitemap no declara ninguno.
 */
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const base = (process.env.NEXT_PUBLIC_SITE_URL || 'https://mundo-medics-catalogo.vercel.app').replace(/\/+$/, '');

  const staticRoutes: MetadataRoute.Sitemap = [
    {
      url: `${base}/`,
      lastModified: new Date(),
      changeFrequency: 'daily',
      priority: 1,
    },
    {
      url: `${base}/categories`,
      lastModified: new Date(),
      changeFrequency: 'weekly',
      priority: 0.8,
    },
  ];

  try {
    const supabase = createPublicClient();
    const { data } = await supabase
      .from('products')
      .select('id, created_at')
      .order('created_at', { ascending: false })
      .limit(1000);

    const productRoutes: MetadataRoute.Sitemap = (data || []).map((p) => ({
      url: `${base}/product?id=${p.id}`,
      lastModified: p.created_at ? new Date(p.created_at) : new Date(),
      changeFrequency: 'weekly' as const,
      priority: 0.6,
    }));

    return [...staticRoutes, ...productRoutes];
  } catch {
    // Si Supabase falla, el sitemap sigue siendo válido con las rutas fijas.
    return staticRoutes;
  }
}
