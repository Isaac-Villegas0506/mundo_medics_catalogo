import { NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';
import { createImageKitAuth } from '@/utils/imagekit';

/**
 * Fase 11: firma para subir imágenes directamente a ImageKit.
 *
 * Igual que con Cloudinary, la subida va del navegador a ImageKit sin pasar por
 * el servidor. Aquí sólo se entrega la firma, y sólo a usuarios con sesión y
 * rol de administrador.
 */
export async function POST() {
  // 1. Sesión válida
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: 'No autenticado' }, { status: 401 });
  }

  // 2. Rol de administrador (si la tabla existe; si no, se permite para no
  //    bloquear el panel mientras se aplica la migración 004).
  const { data: adminRow, error: adminError } = await supabase
    .from('admin_users')
    .select('user_id')
    .eq('user_id', user.id)
    .maybeSingle();

  if (!adminError && !adminRow) {
    return NextResponse.json({ error: 'Sin permiso de administración' }, { status: 403 });
  }

  // 3. Firma
  try {
    const auth = createImageKitAuth();
    return NextResponse.json(auth);
  } catch (e) {
    console.error('[imagekit] no se pudo firmar:', e);
    return NextResponse.json(
      { error: 'La subida de imágenes no está configurada en el servidor.' },
      { status: 500 }
    );
  }
}
