'use server';

import { revalidatePath } from 'next/cache';
import { createClient } from '@/utils/supabase/server';

/**
 * Fase 7 (11.7): invalida la caché del catálogo público tras un cambio en el
 * panel. Sin esto, con `revalidate = 60` en la portada, un producto nuevo o
 * borrado tardaba hasta un minuto en reflejarse.
 *
 * Se protege con la sesión del usuario: si no hay sesión, no hace nada.
 * `revalidatePath` sólo tiene efecto en el servidor, por eso es una Server Action.
 */
export async function revalidateCatalog() {
  const supabase = await createClient();
  const { data } = await supabase.auth.getUser();

  if (!data.user) {
    // Sin sesión no se revalida (evita que un anónimo fuerce invalidaciones).
    return { ok: false as const };
  }

  revalidatePath('/', 'page');
  revalidatePath('/categories');
  revalidatePath('/product');

  return { ok: true as const };
}
