interface ImageKitAuthResponse {
  token: string;
  expire: number;
  signature: string;
  publicKey: string;
  urlEndpoint: string;
}

/**
 * Fase 11 — Subida de imágenes a ImageKit (reemplaza a Cloudinary).
 *
 * 1. Pide la firma a /api/imagekit/auth (verifica sesión y rol, y firma con la
 *    clave privada, que nunca sale del servidor).
 * 2. Publica el archivo directamente a ImageKit con esa firma.
 * 3. Devuelve la URL pública lista para guardar en la base.
 */
export async function uploadToImageKit(file: File): Promise<string> {
  const authRes = await fetch('/api/imagekit/auth', { method: 'POST' });
  if (!authRes.ok) {
    const body = await authRes.json().catch(() => null);
    throw new Error(body?.error || 'No autorizado para subir imágenes');
  }
  const auth: ImageKitAuthResponse = await authRes.json();

  const form = new FormData();
  form.append('file', file);
  form.append('fileName', `${Date.now()}-${file.name.replace(/[^\w.-]/g, '_')}`);
  form.append('publicKey', auth.publicKey);
  form.append('signature', auth.signature);
  form.append('expire', String(auth.expire));
  form.append('token', auth.token);
  form.append('folder', '/mundo-medics');

  const upRes = await fetch('https://upload.imagekit.io/api/v1/files/upload', {
    method: 'POST',
    body: form,
  });

  const data = await upRes.json();

  if (!upRes.ok || !data?.url) {
    const raw: string = data?.message || data?.error?.message || 'Error al subir la imagen';

    /* Diagnóstico útil: los errores de firma suelen deberse a la configuración
       o al reloj, no a que la imagen esté mal. */
    if (/signature|token|expire/i.test(raw)) {
      throw new Error(
        'ImageKit rechazó la firma de subida. Revisa que las claves en .env.local coincidan con el panel de ImageKit y que el reloj del equipo esté en hora.'
      );
    }
    throw new Error(raw);
  }

  return data.url as string;
}
