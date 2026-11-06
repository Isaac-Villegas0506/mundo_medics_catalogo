import { NextResponse } from 'next/server';
import { createHash } from 'crypto';
import { createClient } from '@/utils/supabase/server';

/**
 * Firma los parámetros de una subida directa a Cloudinary.
 *
 * Solo usuarios autenticados (admin) pueden pedir la firma. El secreto
 * CLOUDINARY_API_SECRET vive únicamente aquí, en el servidor, y nunca se envía
 * al navegador (regla 5 del plan maestro).
 */
export async function POST() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
  }

  const apiKey = process.env.CLOUDINARY_API_KEY;
  const apiSecret = process.env.CLOUDINARY_API_SECRET;
  const cloudName = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME;

  if (!apiKey || !apiSecret || !cloudName) {
    return NextResponse.json(
      { error: 'Cloudinary no está configurado' },
      { status: 500 }
    );
  }

  const timestamp = Math.round(Date.now() / 1000);
  const folder = 'mundo-medics';

  // La firma cubre los parámetros que el cliente reenviará a Cloudinary
  // (en orden alfabético), excluyendo file, api_key y signature.
  const toSign = `folder=${folder}&timestamp=${timestamp}`;
  const signature = createHash('sha1')
    .update(`${toSign}${apiSecret}`)
    .digest('hex');

  return NextResponse.json({
    timestamp,
    signature,
    api_key: apiKey,
    cloud_name: cloudName,
    folder,
  });
}
