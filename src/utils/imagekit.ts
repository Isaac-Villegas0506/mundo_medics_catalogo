import crypto from 'node:crypto';

/**
 * Fase 11 — Migración de Cloudinary a ImageKit.
 *
 * ImageKit usa autenticación por firma para las subidas directas desde el
 * navegador. La firma es un HMAC-SHA1 sobre `token + expire` con la clave
 * privada, que NUNCA sale del servidor.
 *
 * Variables necesarias (sin prefijo NEXT_PUBLIC_ las privadas):
 *   NEXT_PUBLIC_IMAGEKIT_URL_ENDPOINT   https://ik.imagekit.io/<id>
 *   NEXT_PUBLIC_IMAGEKIT_PUBLIC_KEY     public_...
 *   IMAGEKIT_PRIVATE_KEY                private_...   (secreta)
 */

/** Minutos de validez de una firma de subida. */
const EXPIRE_SECONDS = 10 * 60;

export interface ImageKitAuth {
  token: string;
  expire: number;
  signature: string;
  publicKey: string;
  urlEndpoint: string;
}

/**
 * Genera los parámetros de autenticación que el navegador necesita para subir
 * un archivo directamente a ImageKit. La clave privada no se incluye nunca.
 */
export function createImageKitAuth(): ImageKitAuth {
  const publicKey = process.env.NEXT_PUBLIC_IMAGEKIT_PUBLIC_KEY;
  const privateKey = process.env.IMAGEKIT_PRIVATE_KEY;
  const urlEndpoint = process.env.NEXT_PUBLIC_IMAGEKIT_URL_ENDPOINT;

  if (!publicKey || !privateKey || !urlEndpoint) {
    throw new Error(
      'Faltan las variables de ImageKit (NEXT_PUBLIC_IMAGEKIT_URL_ENDPOINT, NEXT_PUBLIC_IMAGEKIT_PUBLIC_KEY, IMAGEKIT_PRIVATE_KEY).'
    );
  }

  const token = crypto.randomUUID();
  const expire = Math.floor(Date.now() / 1000) + EXPIRE_SECONDS;

  // Firma: HMAC-SHA1 de "token + expire" con la clave privada.
  const signature = crypto
    .createHmac('sha1', privateKey)
    .update(token + expire)
    .digest('hex');

  return { token, expire, signature, publicKey, urlEndpoint };
}

/**
 * Construye una URL de ImageKit con transformaciones de entrega.
 *
 * Se usa para servir las imágenes ya optimizadas (formato automático y ancho
 * concreto), en lugar de entregar el archivo original completo.
 *
 * Ejemplo:
 *   imageKitUrl('https://ik.imagekit.io/vy0hnlrix/productos/a.jpg', { width: 640 })
 *   → .../tr:w-640,f-auto,q-80/productos/a.jpg
 */
export function imageKitUrl(
  originalUrl: string,
  opts: { width?: number; quality?: number } = {}
): string {
  if (!originalUrl) return originalUrl;

  // Sólo se transforman URLs de ImageKit; las externas se devuelven intactas.
  if (!originalUrl.includes('ik.imagekit.io')) return originalUrl;

  const { width, quality = 80 } = opts;
  const parts = ['f-auto', `q-${quality}`];
  if (width) parts.unshift(`w-${width}`);

  // Si ya trae transformaciones, se respetan.
  if (/\/tr:[^/]+\//.test(originalUrl)) return originalUrl;

  return originalUrl.replace('ik.imagekit.io/', `ik.imagekit.io/tr:${parts.join(',')}/`);
}
