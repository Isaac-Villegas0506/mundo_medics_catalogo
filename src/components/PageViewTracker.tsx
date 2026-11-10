'use client';

import { useEffect } from 'react';
import { usePathname } from 'next/navigation';
import { supabase } from '@/utils/supabase/client';

/**
 * Fase 33 — Registro de visitas a la tienda pública.
 *
 * Llama a la función `log_page_view` (SECURITY DEFINER) para que un visitante
 * anónimo pueda registrar la visita SIN permiso de lectura ni escritura sobre
 * la tabla. Guarda solo la ruta y la fecha: ni IP, ni user-agent, ni cookies.
 *
 * Se evita contar dos veces la misma ruta en la misma sesión
 * (`sessionStorage`), para que el número de "visitas" sea realista y no cuente
 * cada re-render.
 */
export default function PageViewTracker() {
  const pathname = usePathname();

  useEffect(() => {
    if (!pathname) return;

    // No se registran las rutas del panel ni las de API.
    if (pathname.startsWith('/admin') || pathname.startsWith('/api')) return;

    const key = `pv:${pathname}`;
    try {
      if (sessionStorage.getItem(key)) return;
      sessionStorage.setItem(key, '1');
    } catch {
      // Sin sessionStorage se registra igualmente: mejor contar de más que nada.
    }

    // `void` porque no hay nada que hacer con el resultado; si falla el registro
    // (red, RLS) no debe afectar a la experiencia del visitante.
    void supabase.rpc('log_page_view', { p_path: pathname }).then(
      () => {},
      () => {}
    );
  }, [pathname]);

  return null;
}
