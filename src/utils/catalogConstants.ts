/**
 * Constantes compartidas del catálogo.
 *
 * Viven aquí (y no en `publicServer.ts`) para que un Client Component pueda
 * importarlas sin arrastrar el cliente de Supabase del servidor al bundle del
 * navegador.
 */

/** Columnas que pinta una tarjeta de producto. */
export const CARD_FIELDS =
  'id, name, category, image_url, color_name, color_hex_codes, sizes, tags, is_featured, is_set';

/** Tamaño de página del catálogo. */
export const PAGE_SIZE = 16;
