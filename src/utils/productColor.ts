/**
 * Fase 7 (1.6): utilidades para el selector de color.
 *
 * LIMITACIÓN CONOCIDA DEL ESQUEMA (verificada contra la base real el 6/11/2026):
 *   - `products.color_hex_codes` es una lista plana de códigos (`text[]`).
 *   - `products.color_name` es un único texto y está vacío en todos los
 *     productos actuales.
 *   - `products.gallery` es una lista de imágenes SIN relación con los colores.
 *
 * Por eso NO es posible saber qué imagen corresponde a cada color sin cambiar
 * el esquema. Estas funciones no inventan esa relación: sólo permiten mostrar y
 * enviar el color realmente seleccionado.
 *
 * Estructura propuesta para soportarlo en el futuro (requiere migración y
 * aprobación del dueño): una tabla `product_variants (product_id, color_name,
 * color_hex, image_url)` o un `jsonb` `variants` en `products`.
 */

/** Color seleccionable, con el nombre que se le puede mostrar al cliente. */
export interface SelectedColor {
  hex: string;
  /** Nombre legible: el real si existe, o el propio hex. */
  label: string;
}

/**
 * Devuelve el color seleccionado a partir del índice.
 * Si el producto no tiene códigos, devuelve `null`.
 * Nunca lanza por un índice fuera de rango.
 */
export function getSelectedColor(
  hexCodes: string[] | null | undefined,
  colorName: string | null | undefined,
  index: number
): SelectedColor | null {
  if (!hexCodes || hexCodes.length === 0) return null;

  const safeIndex = Number.isInteger(index) && index >= 0 && index < hexCodes.length ? index : 0;
  const hex = hexCodes[safeIndex];
  if (!hex) return null;

  // Con un solo color sí se puede usar el nombre real del producto.
  // Con varios, `color_name` no distingue cuál es cuál, así que se usa el hex.
  const useName = hexCodes.length === 1 && colorName && colorName.trim().length > 0;

  return {
    hex,
    label: useName ? colorName.trim() : hex.toUpperCase(),
  };
}
