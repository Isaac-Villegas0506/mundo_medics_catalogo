export const MAX_IMAGE_SIZE = 5 * 1024 * 1024; // 5 MB
export const ALLOWED_IMAGE_TYPES = [
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/avif',
];

/**
 * Valida una imagen antes de subirla. Devuelve un mensaje de error legible
 * o `null` si el archivo es válido (hallazgo S6).
 */
export function validateImageFile(file: File): string | null {
  if (!ALLOWED_IMAGE_TYPES.includes(file.type)) {
    return `Formato no permitido (${file.type || 'desconocido'}). Usa JPG, PNG, WebP o AVIF.`;
  }
  if (file.size > MAX_IMAGE_SIZE) {
    return `La imagen supera el límite de 5 MB (${(file.size / 1024 / 1024).toFixed(1)} MB).`;
  }
  return null;
}
