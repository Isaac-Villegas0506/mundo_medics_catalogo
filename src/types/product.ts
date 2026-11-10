/**
 * Fase 10: el tipo `Product` vivía en `components/modals/ProductModal.tsx`.
 * `ProductCard` lo importaba desde ahí, lo que creaba una dependencia real
 * entre la tarjeta y el modal: cualquier página que mostrara tarjetas
 * arrastraba todo el modal y, con él, framer-motion (~227 KB).
 *
 * Al moverlo a un archivo de tipos, la dependencia desaparece del bundle.
 * `ProductModal` lo re-exporta para no romper los imports existentes.
 */
export interface Product {
  id: string;
  name: string;
  color_name: string;
  color_hex_codes: string[];
  /**
   * Fase 19: mapa color (hex) -> URL de imagen.
   * Permite que al elegir un color en el modal se muestre la foto de ese color.
   */
  color_images?: Record<string, string>;
  /**
   * Fase 33: variantes completas de color, con nombre propio.
   * Es la fuente principal para la tienda; `color_hex_codes` y `color_images`
   * se mantienen por compatibilidad.
   */
  color_variants?: { hex: string; name: string; image?: string }[];
  image_url: string | null;
  gallery?: string[];
  action_text: string;
  description: string;
  care_instructions: string | null;
  material: string | null;
  category: string;
  sizes: string[];
  tags?: string[];
  is_featured?: boolean;
  customization_options?: string[];
  is_set?: boolean;
  included_products?: string[];
}
