/**
 * Fase 7 (1.8): normalización del número de WhatsApp.
 *
 * En la base el número puede haberse escrito de cualquier forma:
 *   "+51 987 654 321", "51-987-654-321", "0051987654321", "987654321"…
 * y `wa.me` sólo acepta dígitos, sin "+", sin ceros iniciales de marcación
 * internacional y sin separadores.
 *
 * Regla: quedarse con los dígitos, quitar el prefijo internacional "00",
 * y si el resultado parece un número peruano de 9 dígitos, anteponer "51".
 */
export function normalizeWhatsappNumber(raw: string | null | undefined): string {
  if (!raw) return '';

  let digits = raw.replace(/\D/g, '');

  // "0051..." → "51..."
  if (digits.startsWith('00')) digits = digits.slice(2);

  // Número local peruano: 9 dígitos empezando por 9 → anteponer 51.
  if (digits.length === 9 && digits.startsWith('9')) {
    digits = `51${digits}`;
  }

  // Un número internacional razonable tiene entre 10 y 15 dígitos.
  if (digits.length < 10 || digits.length > 15) {
    return '';
  }

  return digits;
}

/**
 * Construye la URL de WhatsApp. Devuelve '' si no hay número válido, para que
 * la interfaz deshabilite el botón en lugar de abrir un chat a un número
 * equivocado.
 */
export function buildWhatsappUrl(rawNumber: string | null | undefined, message: string): string {
  const number = normalizeWhatsappNumber(rawNumber);
  if (!number) return '';
  return `https://wa.me/${number}?text=${encodeURIComponent(message)}`;
}
