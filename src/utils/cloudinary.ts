interface CloudinarySignResponse {
  timestamp: number;
  signature: string;
  api_key: string;
  cloud_name: string;
  folder: string;
}

/**
 * Sube una imagen a Cloudinary mediante subida directa firmada.
 *
 * 1. Pide la firma a /api/cloudinary/sign (que verifica que el usuario esté
 *    autenticado y firma con CLOUDINARY_API_SECRET, que nunca sale del servidor).
 * 2. Publica el archivo directamente a Cloudinary con la firma.
 * 3. Devuelve la URL segura (secure_url) lista para guardar en la base.
 */
export async function uploadToCloudinary(file: File): Promise<string> {
  const signRes = await fetch('/api/cloudinary/sign', { method: 'POST' });
  if (!signRes.ok) {
    const body = await signRes.json().catch(() => null);
    throw new Error(body?.error || 'No autorizado para subir imágenes');
  }
  const sign: CloudinarySignResponse = await signRes.json();

  const form = new FormData();
  form.append('file', file);
  form.append('timestamp', String(sign.timestamp));
  form.append('folder', sign.folder);
  form.append('api_key', sign.api_key);
  form.append('signature', sign.signature);

  const upRes = await fetch(
    `https://api.cloudinary.com/v1_1/${sign.cloud_name}/image/upload`,
    { method: 'POST', body: form }
  );
  const data = await upRes.json();

  if (!upRes.ok || !data?.secure_url) {
    throw new Error(data?.error?.message || 'Error al subir la imagen');
  }
  return data.secure_url as string;
}
