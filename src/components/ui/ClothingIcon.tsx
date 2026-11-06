/**
 * Iconos de categoría de ropa, en SVG local.
 *
 * Fase 5 (9.4): antes esta pantalla cargaba Flaticon Uicons desde un CDN
 * (1.18 MB de CSS + 351 KB de la familia "bold-rounded") para pintar como
 * mucho 7 iconos. Ahora son trazos SVG propios, sin peticiones externas.
 *
 * Si necesitas un icono nuevo, añádelo a ICON_PATHS con un trazo simple de
 * 24×24. No vuelvas a enlazar la hoja de estilos remota.
 */
import * as React from 'react';

/** Trazos 24×24, stroke-based, para mantener un estilo uniforme y ligero. */
const ICON_PATHS: Record<string, React.ReactNode> = {
  't-shirt': (
    <>
      <path d="M8 3 4 6l1.5 4L8 9v12h8V9l2.5 1L20 6l-4-3-2 2h-4L8 3Z" />
    </>
  ),
  shirt: (
    <>
      <path d="M9 3 6 5 4 9l2.5 1.5V21h11V10.5L20 9l-2-4-3-2-1.5 2h-3L9 3Z" />
      <path d="M9 3l1.5 3h3L15 3" />
    </>
  ),
  pants: (
    <>
      <path d="M7 3h10l1 18h-4l-2-9-2 9H6L7 3Z" />
      <path d="M7 7h10" />
    </>
  ),
  vest: (
    <>
      <path d="M9 3h6l3 4-2 14H8L6 7l3-4Z" />
      <path d="M12 3v18" />
    </>
  ),
  'vest-patches': (
    <>
      <path d="M8 3h8l3 5-2 13H7L5 8l3-5Z" />
      <path d="M12 3v18" />
      <path d="M9.5 10h1.5M13 10h1.5" />
    </>
  ),
  boot: (
    <>
      <path d="M8 3v8l-2 3v7h12v-4c0-2-1.5-2.5-3-3l-4-1V3H8Z" />
      <path d="M6 17h12" />
    </>
  ),
  'clothes-hanger': (
    <>
      <path d="M12 7a2.5 2.5 0 1 1 2.5-2.5" />
      <path d="M12 7v2L3 15v3h18v-3l-9-6Z" />
    </>
  ),
};

const NAME_TO_ICON: Record<string, string> = {
  // Español
  Polos: 't-shirt',
  Polo: 't-shirt',
  Camisas: 'shirt',
  Camisa: 'shirt',
  Camisetas: 't-shirt',
  Pantalones: 'pants',
  'Pantalón': 'pants',
  Casacas: 'vest-patches',
  Casaca: 'vest-patches',
  Chaquetas: 'vest-patches',
  Chaqueta: 'vest-patches',
  Zapatillas: 'boot',
  Zapatos: 'boot',
  Calzado: 'boot',
  Batas: 'clothes-hanger',
  Bata: 'clothes-hanger',
  Accesorios: 'vest',
  Uniforme: 'vest',
  Uniformes: 'vest',
  // Inglés
  'T-Shirt': 't-shirt',
  Shirt: 'shirt',
  Pants: 'pants',
  Jacket: 'vest-patches',
  Shoes: 'boot',
  Sneakers: 'boot',
};

const FALLBACK_ICON = 'clothes-hanger';

/** Nombre de icono local para una categoría (o el de reserva). */
export function getClothingIconName(categoryName: string): string {
  return NAME_TO_ICON[categoryName] ?? FALLBACK_ICON;
}

export interface ClothingIconProps {
  name: string;
  /** Valor heredado de la BD (antes clases `fi-*`). Se ignora: usamos SVG local. */
  icon?: string;
  className?: string;
  style?: React.CSSProperties;
}

export function ClothingIcon({ name, className = 'text-3xl', style }: ClothingIconProps) {
  const iconName = getClothingIconName(name);
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.5}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      style={style}
      aria-hidden="true"
      focusable="false"
    >
      {ICON_PATHS[iconName]}
    </svg>
  );
}
