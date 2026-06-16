'use client';

import React from 'react';
import { motion } from 'motion/react';
import { Product } from '@/components/modals/ProductModal';
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
    <motion.article
      initial={{ opacity: 0, y: 22 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ type: 'spring', stiffness: 320, damping: 30, delay: index * 0.07 }}
      whileTap={{ scale: 0.97 }}
      className="flex flex-col cursor-pointer group h-full"
      onClick={() => onClick(product)}
    >
      {/* Image Card */}
      <div className="relative w-full aspect-[3/4] bg-[#eeecea] rounded-[20px] overflow-hidden mb-3 border border-black/10 transition-shadow duration-400 group-hover:shadow-[0_12px_32px_rgba(0,0,0,0.10)]">
        {product.image_url ? (
          <motion.img
            alt={product.name}
            className="object-cover w-full h-full"
            src={product.image_url}
            initial={{ scale: 1.04, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ duration: 0.5, ease: [0.25, 0.46, 0.45, 0.94] }}
            whileHover={{ scale: 1.04 }}
          />
        ) : (
          <div className="absolute inset-0 flex items-center justify-center">
            <span className="text-[#bbb] text-xs font-light">Próximamente</span>
          </div>
        )}

        {/* Badges on the image */}
        <ProductBadges
          tags={product.tags}
          isFeatured={product.is_featured}
          size="sm"
        />

        {/* Favorite button */}
        <motion.button
          whileTap={{ scale: 0.85 }}
          onClick={(e) => onToggleFavorite(e, product.id)}
          className="absolute top-2.5 right-2.5 z-10 w-8 h-8 flex items-center justify-center bg-white/80 backdrop-blur-md rounded-full text-[#aaa] hover:text-[#e57373] transition-colors shadow-sm"
        >
          <span 
            className={`material-symbols-outlined text-[18px] ${isFavorite ? 'text-[#e57373]' : ''}`} 
            style={{ fontVariationSettings: isFavorite ? "'FILL' 1, 'wght' 300" : "'FILL' 0, 'wght' 300" }}
          >
            favorite
          </span>
        </motion.button>
      </div>

      {/* Text Content */}
      <div className="flex flex-col flex-1">
        <h3 className="font-semibold text-sm text-[#1a1a1a] line-clamp-2 leading-snug">
          {product.name}
        </h3>

        {/* Colors */}
        {product.color_hex_codes && product.color_hex_codes.length > 0 ? (
          <div className="flex items-center gap-1 mt-2">
            {product.color_hex_codes.slice(0, 4).map((hex, idx) => (
              <div 
                key={idx} 
                className="w-3.5 h-3.5 rounded-full border border-black/10 shadow-sm" 
                style={{ backgroundColor: hex }} 
              />
            ))}
            {product.color_hex_codes.length > 4 && (
              <span className="text-[9px] text-[#888] font-medium ml-0.5">+{product.color_hex_codes.length - 4}</span>
            )}
            {product.color_name && (
              <span className="text-[10px] text-[#888] font-normal ml-1 truncate">{product.color_name}</span>
            )}
          </div>
        ) : product.color_name ? (
          <p className="text-[10px] text-[#888] mt-1 font-normal truncate">{product.color_name}</p>
        ) : null}

        {/* Sizes */}
        {product.sizes && product.sizes.length > 0 && (
          <div className="flex items-center gap-1.5 mt-2 flex-wrap">
            {product.sizes.slice(0, 4).map((size, idx) => (
              <span key={idx} className="text-[10px] font-medium px-2 py-0.5 bg-[#f4f2f0] text-[#555] rounded-[6px] border border-black/5">
                {size}
              </span>
            ))}
            {product.sizes.length > 4 && (
              <span className="text-[9px] font-medium text-[#888]">+{product.sizes.length - 4}</span>
            )}
          </div>
        )}

      </div>
    </motion.article>
  );
}
