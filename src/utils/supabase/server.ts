import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

/**
 * Crea un cliente Supabase para componentes de servidor y Route Handlers.
 * Lee las cookies de la petición actual (getAll). En Server Components no se
 * pueden escribir cookies, por eso `setAll` ignora la escritura: el refresco
 * de sesión lo hace `src/proxy.ts` (que sí puede escribir en la respuesta).
 */
export async function createClient() {
  const cookieStore = await cookies();

  return createServerClient(supabaseUrl, supabaseAnonKey, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        try {
          cookiesToSet.forEach(({ name, value, options }) =>
            cookieStore.set(name, value, options)
          );
        } catch {
          // Llamado desde un Server Component: no se puede escribir cookies aquí.
          // El refresco lo maneja proxy.ts.
        }
      },
    },
  });
}
