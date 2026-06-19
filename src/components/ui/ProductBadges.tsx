'use client';

import React from 'react';

/**
 * Mapa de estilos para cada etiqueta / badge.
 * Se mantienen colores suaves y consistentes con el diseño general de la web.
 */
export const TAG_STYLES: Record<string, { bg: string; text: string; border: string }> = {
  Nuevo: {
    bg: 'bg-[#e8f1ff]',
    text: 'text-[#1f4ed8]',
    border: 'border-[#1f4ed8]/15',
  },
  Oferta: {
    bg: 'bg-[#ffe8ea]',
    text: 'text-[#c62828]',
    border: 'border-[#c62828]/15',
  },
  Destacado: {
    bg: 'bg-[#fff5d9]',
    text: 'text-[#a0650a]',
    border: 'border-[#a0650a]/15',
  },
  Tendencia: {
    bg: 'bg-[#f1e8ff]',
    text: 'text-[#6b3fa0]',
    border: 'border-[#6b3fa0]/15',
  },
  Varón: {
    bg: 'bg-[#e0f2fe]',
    text: 'text-[#0284c7]',
    border: 'border-[#0284c7]/15',
  },
  Mujer: {
    bg: 'bg-[#fce7f3]',
    text: 'text-[#db2777]',
    border: 'border-[#db2777]/15',
  },
  Unisex: {
    bg: 'bg-[#f3f4f6]',
    text: 'text-[#4b5563]',
    border: 'border-[#4b5563]/15',
  },
};

const DEFAULT_STYLE = {
  bg: 'bg-[#f4f2f0]',
  text: 'text-[#555]',
  border: 'border-black/5',
};

export function getTagStyle(tag: string) {
  return TAG_STYLES[tag] || DEFAULT_STYLE;
}

interface ProductBadgesProps {
  tags?: string[];
  isFeatured?: boolean;
  size?: 'sm' | 'md';
  max?: number;
}

/**
 * Conjunto de badges que se muestran sobre la imagen del producto.
 * Estilo de "chip" pequeño, semitransparente y con backdrop-blur para integrarse con la imagen.
 */
export default function ProductBadges({ tags, isFeatured, size = 'sm', max = 3 }: ProductBadgesProps) {
  const visibleTags: string[] = [];

  if (isFeatured) {
    visibleTags.push('Destacado');
  }
  if (tags && tags.length > 0) {
    for (const t of tags) {
      if (t === 'Destacado' && isFeatured) continue;
      visibleTags.push(t);
      if (visibleTags.length >= max) break;
    }
  }

  if (visibleTags.length === 0) return null;

  const sizeClasses = size === 'sm'
    ? 'text-[9px] px-2 py-0.5'
    : 'text-[10px] px-2.5 py-1';

  return (
    <div className="absolute top-2.5 left-2.5 flex flex-col gap-1 items-start z-10 pointer-events-none">
      {visibleTags.map((tag, idx) => {
        const style = getTagStyle(tag);
        return (
          <span
            key={`${tag}-${idx}`}
            className={`${style.bg} ${style.text} ${style.border} border backdrop-blur-md ${sizeClasses} rounded-md font-bold tracking-widest uppercase shadow-sm`}
          >
            {tag}
          </span>
        );
      })}
    </div>
  );
}

/**
 * Tarjeta de personalización que se muestra cuando el producto tiene opciones
 * de personalización (por ejemplo "Bordado personalizado").
 * Diseño coherente con el resto de la web: fondo blanco, borde sutil e ícono
 * en un contenedor oscuro tipo los botones principales.
 */
interface CustomizationLabelProps {
  options?: string[];
  variant?: 'modal' | 'full';
}

export function CustomizationLabel({ options, variant = 'full' }: CustomizationLabelProps) {
  if (!options || options.length === 0) return null;

  const EMBROIDERY = 'Bordado personalizado';
  if (!options.includes(EMBROIDERY)) return null;

  if (variant === 'modal') {
    return (
      <div className="inline-flex items-center gap-2 py-2 px-3.5 bg-[#f8f6f2] rounded-xl border border-[#ece9e2]">
        <h4 className="text-[13px] md:text-sm font-medium text-[#1a1a1a] leading-tight">
          Bordado personalizado disponible
        </h4>
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-[#ece9e2] bg-[#f8f6f2] p-4 md:p-5">
      <h4 className="text-sm md:text-[15px] font-semibold text-[#1a1a1a] mb-1 leading-tight">
        Bordado personalizado disponible
      </h4>
      <p className="text-xs md:text-[13px] text-[#555] leading-relaxed font-normal">
        Personalizado con logos de universidades, clínicas, hospitales y empresas
      </p>
    </div>
  );
}
