import { createClient } from '@supabase/supabase-js';

/**
 * Cliente de Supabase para el SERVIDOR, de solo lectura pública.
 *
 * Fase 5 (9.1): la portada y el detalle se renderizan en el servidor, así que
 * el HTML llega con contenido real en lugar de un esqueleto vacío.
 *
 * Diferencias con `src/utils/supabase/server.ts`:
 *   - NO usa cookies: estas consultas son de datos públicos (products,
 *     categories, settings) y no dependen de la sesión.
 *   - Al no leer cookies, la ruta puede cachearse en el CDN.
 *
 * Nunca uses este cliente para escribir ni para leer datos privados: para eso
 * está el cliente con cookies + RLS por usuario.
 */
export function createPublicClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!url || !key) {
    throw new Error(
      'Faltan NEXT_PUBLIC_SUPABASE_URL o NEXT_PUBLIC_SUPABASE_ANON_KEY en el entorno.'
    );
  }

  return createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}
