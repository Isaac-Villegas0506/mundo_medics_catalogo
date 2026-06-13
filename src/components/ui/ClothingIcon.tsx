/**
 * Maps clothing category names (from Supabase) to Flaticon Uicons classes.
 * Uses the "bold rounded" style (fi-br-*) which is modern, clean and easy to read.
 * Falls back to `fi-br-clothes-hanger` if no mapping is found.
 *
 * Icon reference: https://cdn.jsdelivr.net/npm/@flaticon/flaticon-uicons@3.3.0/
 */
const CLOTHING_ICON_MAP: Record<string, string> = {
  // Spanish variations
  'Polos': 'fi-br-t-shirt',
  'Polo': 'fi-br-t-shirt',
  'Camisas': 'fi-br-shirt',
  'Camisa': 'fi-br-shirt',
  'Camisetas': 'fi-br-t-shirt',
  'Pantalones': 'fi-br-pants',
  'Pantalón': 'fi-br-pants',
  'Casacas': 'fi-br-vest-patches',
  'Casaca': 'fi-br-vest-patches',
  'Chaquetas': 'fi-br-vest-patches',
  'Chaqueta': 'fi-br-vest-patches',
  'Zapatillas': 'fi-br-boot',
  'Zapatos': 'fi-br-boot',
  'Calzado': 'fi-br-boot',
  'Batas': 'fi-br-clothes-hanger',
  'Bata': 'fi-br-clothes-hanger',
  'Accesorios': 'fi-br-vest',
  'Uniforme': 'fi-br-vest',
  'Uniformes': 'fi-br-vest',
  // English fallbacks
  'T-Shirt': 'fi-br-t-shirt',
  'Shirt': 'fi-br-shirt',
  'Pants': 'fi-br-pants',
  'Jacket': 'fi-br-vest-patches',
  'Shoes': 'fi-br-boot',
  'Sneakers': 'fi-br-boot',
};

const FALLBACK_ICON = 'fi-br-clothes-hanger';

/**
 * Returns the appropriate Flaticon Uicons CSS class for a clothing category name.
 * If the name isn't in the map, falls back to the default hanger icon.
 */
export function getClothingIconClass(categoryName: string): string {
  return CLOTHING_ICON_MAP[categoryName] ?? FALLBACK_ICON;
}

/**
 * Renders a Flaticon Uicons clothing icon <i> element.
 * Usage: <ClothingIcon name="Polos" className="text-2xl" />
 */
export interface ClothingIconProps {
  name: string;
  icon?: string;
  className?: string;
  style?: React.CSSProperties;
}

export function ClothingIcon({ name, icon, className = 'text-3xl', style }: ClothingIconProps) {
  // If the database has a Flaticon class saved, use it. Otherwise fallback to name mapping.
  const iconClass = (icon && icon.startsWith('fi-')) ? icon : getClothingIconClass(name);
  return <i className={`${iconClass} ${className}`} style={style} aria-hidden="true" />;
}
