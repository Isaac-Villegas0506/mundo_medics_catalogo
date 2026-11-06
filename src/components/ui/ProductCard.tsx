'use client';

import React from 'react';
import Image from 'next/image';
import type { Product } from '@/types/product';
import ProductBadges from '@/components/ui/ProductBadges';

interface ProductCardProps {
  product: Product;
  index: number;
  isFavorite: boolean;
  onToggleFavorite: (e: React.MouseEvent, productId: string) => void;
  onClick: (product: Product) => void;
}

export default function ProductCard({ product, index, isFavorite, onToggleFavorite, onClick }: ProductCardProps) {
  return (
    <article
      className="flex flex-col cursor-pointer group h-full transition-transform duration-200 ease-out active:scale-[0.98]"
      onClick={() => onClick(product)}
    >
      {/* Image Card */}
      <div className="relative w-full aspect-[3/4] bg-white dark:bg-zinc-800 rounded-[18px] overflow-hidden mb-3 border border-black/[0.07] dark:border-white/[0.07] shadow-[0_2px_10px_rgba(0,0,0,0.06)] dark:shadow-[0_2px_10px_rgba(0,0,0,0.3)] transition-shadow duration-300 group-hover:shadow-[0_8px_28px_rgba(0,0,0,0.11)] dark:group-hover:shadow-[0_8px_28px_rgba(0,0,0,0.4)]">
        {product.image_url ? (
          <Image
            alt={product.name}
            /* Fase 6 (LCP): la primera tarjeta NO lleva `img-reveal`.
               Esa clase arranca en opacity:0 y anima 400 ms, y el navegador
               no cuenta el LCP hasta que el elemento es visible. Era el motivo
               principal del "element render delay" de 1.6 s en Lighthouse. */
            className={index === 0 ? 'object-contain' : 'object-contain img-reveal'}
            src={product.image_url}
            fill
            sizes="(max-width: 768px) 50vw, (max-width: 1200px) 33vw, 25vw"
            /* Next.js 16 deprecó `priority` en favor de `preload` +
               `fetchPriority` (ver docs de next/image). Con `priority` el
               <link rel=preload> salía SIN fetchpriority, así que el LCP
               competía con el resto de peticiones. */
            preload={index === 0}
            fetchPriority={index === 0 ? 'high' : 'auto'}
            loading={index === 0 ? 'eager' : 'lazy'}
          />
        ) : (
          <div className="absolute inset-0 bg-[#eeecea] dark:bg-zinc-700 flex items-center justify-center">
            <span className="text-[#c0c0bb] dark:text-zinc-500 text-xs font-light">Próximamente</span>
          </div>
        )}

        {/* Hover overlay sutil (CSS puro: antes era un motion.div por tarjeta) */}
        <div className="absolute inset-0 bg-black/[0.04] dark:bg-white/[0.04] pointer-events-none opacity-0 transition-opacity duration-200 group-hover:opacity-100" />

        {/* Badges on the image */}
        <ProductBadges
          tags={product.tags}
          isFeatured={product.is_featured}
          size="sm"
        />

        {/* Favorite button */}
        <button
          onClick={(e) => onToggleFavorite(e, product.id)}
          aria-label={isFavorite ? 'Quitar de guardados' : 'Guardar producto'}
          aria-pressed={isFavorite}
          className="absolute top-2.5 right-2.5 z-10 w-10 h-10 flex items-center justify-center bg-white/90 dark:bg-zinc-800/90 rounded-full transition-transform duration-150 shadow-sm hover:bg-white dark:hover:bg-zinc-700 active:scale-90"
        >
          <span
            className={`material-symbols-outlined text-[18px] transition-colors ${isFavorite ? 'text-[#e57373]' : 'text-[#999] dark:text-zinc-400'}`}
            style={{ fontVariationSettings: isFavorite ? "'FILL' 1, 'wght' 300" : "'FILL' 0, 'wght' 300" }}
          >
            favorite
          </span>
        </button>
      </div>

      {/* Text Content */}
      <div className="flex flex-col flex-1 px-0.5">
        <h3 className="font-semibold text-sm text-[#1a1a1a] dark:text-zinc-100 line-clamp-2 leading-snug tracking-[-0.01em]">
          {product.name}
        </h3>

        {/* Colors */}
        {product.color_hex_codes && product.color_hex_codes.length > 0 ? (
          <div className="flex items-center gap-1 mt-2">
            {product.color_hex_codes.slice(0, 4).map((hex, idx) => (
              <div
                key={idx}
                className="w-3.5 h-3.5 rounded-full border border-black/[0.12] dark:border-white/[0.12] shadow-sm flex-shrink-0"
                style={{ backgroundColor: hex }}
              />
            ))}
            {product.color_hex_codes.length > 4 && (
              <span className="text-[9px] text-[#777] dark:text-zinc-400 font-medium ml-0.5">+{product.color_hex_codes.length - 4}</span>
            )}
            {product.color_name && (
              <span className="text-[10px] text-[#777] dark:text-zinc-400 font-normal ml-1 truncate">{product.color_name}</span>
            )}
          </div>
        ) : product.color_name ? (
          <p className="text-[10px] text-[#777] dark:text-zinc-400 mt-1 font-normal truncate">{product.color_name}</p>
        ) : null}

        {/* Sizes */}
        {product.sizes && product.sizes.length > 0 && (
          <div className="flex items-center gap-1 mt-2 flex-wrap">
            {product.sizes.slice(0, 4).map((size, idx) => (
              <span key={idx} className="text-[10px] font-medium px-2 py-0.5 bg-[#f2f1ef] dark:bg-zinc-800 text-[#555] dark:text-zinc-300 rounded-[5px] border border-black/[0.06] dark:border-white/[0.06]">
                {size}
              </span>
            ))}
            {product.sizes.length > 4 && (
              <span className="text-[9px] font-medium text-[#777] dark:text-zinc-400">+{product.sizes.length - 4}</span>
            )}
          </div>
        )}
      </div>
    </article>
  );
}
