import { createBrowserClient } from '@supabase/ssr';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

// Cliente del navegador. La sesión (acceso/refresh token) se guarda en cookies
// para que el servidor también pueda saber quién está autenticado.
export const supabase = createBrowserClient(supabaseUrl, supabaseAnonKey, {
  isSingleton: true,
});
