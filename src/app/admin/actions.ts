'use server';

import { revalidatePath } from 'next/cache';
import { createClient } from '@/utils/supabase/server';

/**
 * Fase 7 (1.5): invalidación centralizada del catálogo público.
 *
 * Antes sólo se llamaba al cambiar el estado o borrar un producto. Faltaban:
 * crear/editar/borrar categorías, reordenar destacados y guardar ajustes.
 * Cualquier operación administrativa que afecte a lo público debe pasar por aquí.
 *
 * Se protege con la sesión del usuario: sin sesión no revalida nada, para que un
 * anónimo no pueda forzar invalidaciones de caché.
 *
 * `revalidatePath` sólo funciona en el servidor, por eso es una Server Action.
 */
export async function revalidateCatalog() {
  const supabase = await createClient();
  const { data } = await supabase.auth.getUser();

  if (!data.user) {
    return { ok: false as const, reason: 'no-session' };
  }

  // Portada: productos, categorías y ajustes (número de WhatsApp, redes…).
  revalidatePath('/', 'page');
  // Detalle: ficha, "productos incluidos" y relacionados.
  revalidatePath('/product');
  // Listados que también leen de la base.
  revalidatePath('/categories');
  revalidatePath('/favorites');

  return { ok: true as const };
}
