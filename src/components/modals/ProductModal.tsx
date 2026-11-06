'use client';

import React, { useEffect, useRef } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence, useScroll, useTransform, useDragControls } from 'motion/react';
import ProductBadges, { CustomizationLabel } from '@/components/ui/ProductBadges';
import ProductCard from '@/components/ui/ProductCard';
import { useWhatsappNumber } from '@/hooks/useWhatsappNumber';
import { CARD_FIELDS } from '@/utils/catalogConstants';
import { getSelectedColor } from '@/utils/productColor';
import { useSwipeGallery } from '@/hooks/useSwipeGallery';
import { buildWhatsappUrl } from '@/utils/whatsapp';

export interface Product {
  id: string;
  name: string;
  color_name: string;
  color_hex_codes: string[];
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

interface ProductModalProps {
  isOpen: boolean;
  onClose: () => void;
  product: Product | null;
}

export default function ProductModal({ isOpen, onClose, product }: ProductModalProps) {
  return (
    <AnimatePresence>
      {isOpen && product && <ModalContent onClose={onClose} product={product} />}
    </AnimatePresence>
  );
}

function ModalContent({ onClose, product }: { onClose: () => void, product: Product }) {
  const router = useRouter();
  const whatsappNumber = useWhatsappNumber();
  const [includedProductsData, setIncludedProductsData] = React.useState<any[]>([]);
  const [relatedProductsData, setRelatedProductsData] = React.useState<Product[]>([]);

  useEffect(() => {
    // Fetch included products if it's a set
    if (product.is_set && product.included_products && product.included_products.length > 0) {
      const fetchIncluded = async () => {
        const { supabase } = await import('@/utils/supabase/client');
        const { data } = await supabase
          .from('products')
          .select('id, name, color_name, image_url')
          .in('id', product.included_products || []);

        if (data) {
          const sorted = [...data].sort((a, b) =>
            (product.included_products?.indexOf(a.id) || 0) - (product.included_products?.indexOf(b.id) || 0)
          );
          setIncludedProductsData(sorted);
        }
      };
      fetchIncluded();
    }

    // Fetch related products (solo los campos de tarjeta, Fase 4 8.2)
    const fetchRelated = async () => {
      if (!product.category) return;
      const { supabase } = await import('@/utils/supabase/client');
      const { data } = await supabase
        .from('products')
        .select(CARD_FIELDS)
        .eq('category', product.category)
        .neq('id', product.id)
        .limit(4);
      if (data) setRelatedProductsData(data as Product[]);
    };
    fetchRelated();
  }, [product]);

  // Prevent background scrolling when modal is open
  useEffect(() => {
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, []);

  const scrollRef = useRef<HTMLDivElement>(null);
  const { scrollY } = useScroll({ container: scrollRef });

  // Parallax and shrink effect for mobile image
  const imageScale = useTransform(scrollY, [0, 300], [1, 0.75]);
  const imageOpacity = useTransform(scrollY, [0, 300], [1, 0.2]);
  const imageY = useTransform(scrollY, [0, 300], [0, 80]);

  // Drag controls for the mobile handle
  const dragControls = useDragControls();

  const handleDragEnd = (event: any, info: any) => {
    if (info.offset.y > 100 || info.velocity.y > 400) {
      onClose();
    }
  };

  // Interactive states
  const [selectedSize, setSelectedSize] = React.useState<string | null>(product.sizes?.[0] || null);
  const [selectedColorIndex, setSelectedColorIndex] = React.useState<number>(0);
  /* Fase 7 (1.6): el color que se muestra y se envía por WhatsApp. */
  const selectedColor = getSelectedColor(product.color_hex_codes, product.color_name, selectedColorIndex);
  const [isFavorite, setIsFavorite] = React.useState(false);
  const [currentImageIndex, setCurrentImageIndex] = React.useState(0);
  const [showSizeGuide, setShowSizeGuide] = React.useState(false);
  const [isSizeGuideModalOpen, setIsSizeGuideModalOpen] = React.useState(false);

  // Combine main image and gallery
  const allImages = React.useMemo(() => {
    const images = [];
    if (product.image_url) images.push(product.image_url);
    if (product.gallery && Array.isArray(product.gallery)) {
      images.push(...product.gallery.filter(img => img !== product.image_url));
    }
    return images;
  }, [product.image_url, product.gallery]);

  /* Fase 7 (1.4): deslizar el dedo para cambiar de imagen (sin librerías). */
  const goNextImage = React.useCallback(
    () => setCurrentImageIndex((prev) => (prev === allImages.length - 1 ? 0 : prev + 1)),
    [allImages.length]
  );
  const goPrevImage = React.useCallback(
    () => setCurrentImageIndex((prev) => (prev === 0 ? allImages.length - 1 : prev - 1)),
    [allImages.length]
  );
  const swipeHandlers = useSwipeGallery(goNextImage, goPrevImage, allImages.length > 1);

  const buildWhatsappMessage = () => {
    // Use env var so it always points to the real domain, never localhost
    const siteUrl = (process.env.NEXT_PUBLIC_SITE_URL || '').replace(/\/+$/, '');
    let msg = `Hola, estoy interesado en el ${product.is_set ? 'set completo' : 'producto'}: *${product.name}*`;
    if (!product.is_set) {
      if (selectedSize) {
        msg += `\n\u2022 Talla: ${selectedSize}`;
      }
      /* Fase 7 (1.6): antes se enviaba siempre `product.color_name`, ignorando
         el color que el cliente había seleccionado. Ahora va el seleccionado. */
      if (selectedColor) {
        msg += `\n\u2022 Color: ${selectedColor.label}`;
      }
    }
    // Link to the product page with ?ref=wa so WhatsApp always scrapes fresh OG tags
    msg += `\n\n\uD83D\uDC49 Ver producto: ${siteUrl}/product?id=${product.id}&ref=wa2`;
    return msg;
  };

  /* Fase 7 (1.8): número normalizado; '' si no es válido (botón deshabilitado). */
  const whatsappUrl = buildWhatsappUrl(whatsappNumber, buildWhatsappMessage());

  // Load favorites from local storage
  useEffect(() => {
    try {
      const savedFavs = JSON.parse(localStorage.getItem('favorites') || '[]');
      if (savedFavs.includes(product.id)) {
        setIsFavorite(true);
      }
    } catch (e) { }
  }, [product.id]);

  const toggleFavorite = () => {
    try {
      const savedFavs = JSON.parse(localStorage.getItem('favorites') || '[]');
      let newFavs;
      if (isFavorite) {
        newFavs = savedFavs.filter((id: string) => id !== product.id);
      } else {
        newFavs = [...savedFavs, product.id];
      }
      localStorage.setItem('favorites', JSON.stringify(newFavs));
      setIsFavorite(!isFavorite);
      window.dispatchEvent(new Event('favoritesUpdated'));
    } catch (e) { }
  };

  return (
    <>
      {/* Backdrop */}
      <motion.div
        key="backdrop"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.22 }}
        className="fixed inset-0 z-[60] bg-black/40 backdrop-blur-[2px]"
        onClick={onClose}
      />

      {/* Modal Container */}
      <motion.div
        key="modal"
        drag="y"
        dragControls={dragControls}
        dragListener={false}
        dragConstraints={{ top: 0, bottom: 0 }}
        dragElastic={{ top: 0, bottom: 1 }}
        onDragEnd={handleDragEnd}
        className="fixed bottom-0 md:bottom-auto md:top-1/2 left-0 right-0 md:left-1/2 z-[70]
          bg-[#eeecea] dark:bg-zinc-900 md:bg-white md:dark:bg-zinc-900 rounded-t-[28px] md:rounded-[28px]
          max-h-[92svh] md:max-h-[82vh] h-[92svh] md:h-[82vh]
          w-full md:w-[840px]
          md:-translate-x-1/2 md:-translate-y-1/2
          shadow-[0_-6px_40px_rgba(0,0,0,0.08)] dark:shadow-[0_-6px_40px_rgba(0,0,0,0.4)] md:shadow-[0_20px_60px_rgba(0,0,0,0.12)] md:dark:shadow-[0_20px_60px_rgba(0,0,0,0.5)]
          flex flex-col md:flex-row overflow-hidden"
        initial={{ y: '100%', opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        exit={{ y: '100%', opacity: 0 }}
        transition={{ type: 'spring', stiffness: 280, damping: 28 }}
      >
        {/* Drag Handle Area (Mobile only) */}
        <div
          className="absolute top-0 left-1/2 -translate-x-1/2 w-32 h-12 z-50 flex justify-center pt-3 md:hidden cursor-grab active:cursor-grabbing"
          onPointerDown={(e) => dragControls.start(e)}
          style={{ touchAction: 'none' }}
        >
          <div className="w-10 h-1.5 bg-[#ccc]/80 shadow-sm rounded-full" />
        </div>

        {/* Desktop Close Button */}
        <motion.button
          whileTap={{ scale: 0.88 }}
          onClick={onClose}
          className="hidden md:flex absolute top-4 right-4 z-50 w-11 h-11 items-center justify-center bg-[#f2f2f0] hover:bg-[#e8e8e4] rounded-full text-[#555] transition-colors"
        >
          <span className="material-symbols-outlined text-[20px]" style={{ fontVariationSettings: "'wght' 300" }}>close</span>
        </motion.button>

        {/* Scrollable Container */}
        <div
          ref={scrollRef}
          className="w-full h-full overflow-y-auto md:overflow-hidden no-scrollbar flex flex-col md:flex-row pb-modal-actions md:pb-0"
        >
          {/* Left: Image */}
          <div className="w-full md:w-[45%] aspect-[4/5] md:aspect-auto md:h-full relative flex-shrink-0 md:px-5 md:py-5 md:pr-2.5 z-0">
            <div
              className="sticky top-0 w-full h-full bg-[#eeecea] md:rounded-[20px] overflow-hidden flex items-center justify-center relative touch-pan-y"
              {...swipeHandlers}
            >
              {allImages.length > 0 ? (
                <>
                  <motion.div
                    style={{ scale: imageScale, opacity: imageOpacity, y: imageY }}
                    className="relative w-full h-full p-4 md:p-8"
                  >
                    <Image
                      alt={`${product.name} - Imagen ${currentImageIndex + 1}`}
                      className="object-contain transition-all duration-500 img-reveal"
                      src={allImages[currentImageIndex]}
                      fill
                      sizes="(max-width: 768px) 100vw, 50vw"
                    />
                  </motion.div>

                  {/* Carousel Controls */}
                  {allImages.length > 1 && (
                    <>
                      <div className="absolute inset-y-0 left-0 flex items-center">
                        <button
                          onClick={goPrevImage}
                          className="w-11 h-11 ml-2 rounded-full bg-white/50 backdrop-blur-sm flex items-center justify-center text-[#1a1a1a] hover:bg-white transition-colors"
                        >
                          <span className="material-symbols-outlined text-[20px]">chevron_left</span>
                        </button>
                      </div>
                      <div className="absolute inset-y-0 right-0 flex items-center">
                        <button
                          onClick={goNextImage}
                          className="w-11 h-11 mr-2 rounded-full bg-white/50 backdrop-blur-sm flex items-center justify-center text-[#1a1a1a] hover:bg-white transition-colors"
                        >
                          <span className="material-symbols-outlined text-[20px]">chevron_right</span>
                        </button>
                      </div>
                      <div className="absolute bottom-4 left-0 right-0 flex justify-center gap-1.5 z-10">
                        {allImages.map((_, idx) => (
                          <div
                            key={idx}
                            className={`w-1.5 h-1.5 rounded-full transition-colors ${idx === currentImageIndex ? 'bg-[#1a1a1a]' : 'bg-white/60'}`}
                          />
                        ))}
                      </div>
                    </>
                  )}
                </>
              ) : (
                <span className="text-[#bbb] text-sm font-light">Próximamente</span>
              )}

              {/* Badges on the image */}
              <ProductBadges
                tags={product.tags}
                isFeatured={product.is_featured}
                size="md"
              />

              {/* Action Buttons Container */}
              <div className="absolute top-4 right-4 md:top-3 md:right-3 flex gap-2 z-50">
                <button
                  onPointerDown={(e) => e.stopPropagation()}
                  onClick={onClose}
                  className="w-9 h-9 flex md:hidden items-center justify-center bg-white/70 backdrop-blur-md rounded-full text-[#555] hover:bg-white active:scale-90 transition-all shadow-sm"
                >
                  <span className="material-symbols-outlined text-[20px]" style={{ fontVariationSettings: "'wght' 300" }}>close</span>
                </button>

                <button
                  onPointerDown={(e) => e.stopPropagation()}
                  onClick={toggleFavorite}
                  className="w-9 h-9 flex items-center justify-center bg-white/70 backdrop-blur-md rounded-full text-[#555] hover:text-[#e57373] hover:bg-white active:scale-90 transition-all shadow-sm"
                >
                  <span
                    className={`material-symbols-outlined text-[20px] ${isFavorite ? 'text-[#e57373]' : ''}`}
                    style={{ fontVariationSettings: isFavorite ? "'FILL' 1, 'wght' 300" : "'FILL' 0, 'wght' 300" }}
                  >
                    favorite
                  </span>
                </button>
              </div>
            </div>
          </div>

          {/* Right: Content */}
          <motion.div
            className="w-full md:w-[55%] flex flex-col bg-white dark:bg-zinc-900 relative z-10 
              rounded-t-[28px] md:rounded-none mt-[-28px] md:mt-0 
              pt-7 md:pt-8 px-5 md:px-6 flex-shrink-0 
              md:overflow-y-auto md:flex-1 no-scrollbar min-h-0"
            initial={{ opacity: 0, x: 12 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.12, duration: 0.3 }}
          >
            <div className="pb-8 md:pb-24">
              <h2 className="text-[22px] md:text-3xl font-semibold text-[#1a1a1a] dark:text-zinc-100 tracking-tight mb-2 md:mb-3 md:pr-10 leading-snug">
                {product.name}
              </h2>
              <p className="text-[#666] dark:text-zinc-400 text-sm font-normal leading-relaxed mb-5">
                {product.description || 'Sin descripción disponible.'}
              </p>

              {/* Customization banner (e.g. Bordado personalizado disponible) */}
              {product.customization_options && product.customization_options.length > 0 && (
                <div className="mb-5">
                  <CustomizationLabel options={product.customization_options} variant="modal" />
                </div>
              )}

              {/* Color selector */}
              {product.color_hex_codes && product.color_hex_codes.length > 0 && (
                <div className="mb-5">
                  <span className="text-[11px] font-semibold text-[#aaa] dark:text-zinc-500 uppercase tracking-widest block mb-2.5">
                    {/* Fase 7 (1.6): el nombre corresponde al color elegido. */}
                    Color: <span className="font-normal normal-case text-[#888] dark:text-zinc-400 tracking-normal ml-1">{selectedColor?.label}</span>
                  </span>
                  <div className="flex gap-2.5">
                    {product.color_hex_codes.map((hex, i) => (
                      <motion.button
                        key={i}
                        whileTap={{ scale: 0.88 }}
                        onClick={() => setSelectedColorIndex(i)}
                        aria-label={`Color ${hex.toUpperCase()}`}
                        aria-pressed={i === selectedColorIndex}
                        className={`w-11 h-11 rounded-full border transition-all ${i === selectedColorIndex ? 'border-[#1a1a1a] dark:border-white ring-2 ring-[#1a1a1a]/20 dark:ring-white/20 ring-offset-1 dark:ring-offset-zinc-900' : 'border-[#e0e0e0] dark:border-zinc-700 hover:border-[#999] dark:hover:border-zinc-500'
                          }`}
                        style={{ background: hex }}
                      />
                    ))}
                  </div>
                </div>
              )}

              {/* Size selector */}
              {product.sizes && product.sizes.length > 0 && (
                <div className="mb-5">
                  <div className="flex justify-between items-center mb-2.5">
                    <span className="text-[11px] font-semibold text-[#aaa] dark:text-zinc-500 uppercase tracking-widest block">Talla</span>
                    <button
                      onClick={() => setIsSizeGuideModalOpen(true)}
                      className="text-xs text-[#888] dark:text-zinc-400 hover:text-[#1a1a1a] dark:hover:text-zinc-100 underline underline-offset-2 font-medium transition-colors"
                    >
                      Guía de tallas
                    </button>
                  </div>

                  <div className="flex gap-2">
                    {product.sizes.map((s) => (
                      <motion.button
                        key={s}
                        whileTap={{ scale: 0.9 }}
                        onClick={() => setSelectedSize(s)}
                        className={`w-11 h-10 rounded-xl text-sm font-semibold transition-all ${s === selectedSize
                            ? 'bg-[#1a1a1a] dark:bg-white text-white dark:text-zinc-900'
                            : 'bg-[#f2f2f0] dark:bg-zinc-800 text-[#555] dark:text-zinc-300 hover:bg-[#e8e8e4] dark:hover:bg-zinc-700'
                          }`}
                      >
                        {s}
                      </motion.button>
                    ))}
                  </div>
                </div>
              )}

              {/* Included Products List */}
              {product.is_set && (
                <div className="mb-5">
                  <h3 className="text-[15px] font-semibold text-[#1a1a1a] dark:text-zinc-100 mb-4">
                    Incluye {product.included_products?.length || 0} productos
                  </h3>
                  <div className="flex flex-col gap-3">
                    {includedProductsData.map((item) => (
                      <div key={item.id} className="flex items-center justify-between p-3 md:p-4 bg-white dark:bg-zinc-800 border border-[#ece9e2] dark:border-zinc-700 rounded-2xl shadow-sm hover:shadow-md transition-shadow group gap-3">
                        <div className="flex items-center gap-3 md:gap-4 flex-1 min-w-0">
                          <div className="relative w-16 h-16 md:w-20 md:h-20 rounded-xl bg-[#f8f8f6] dark:bg-zinc-700 overflow-hidden flex-shrink-0">
                            {item.image_url ? (
                              <Image src={item.image_url} alt={item.name} fill className="object-cover img-reveal" sizes="80px" />
                            ) : (
                              <span className="material-symbols-outlined text-[20px] text-[#aaa] w-full h-full flex items-center justify-center">image</span>
                            )}
                          </div>
                          <div className="flex flex-col flex-1 min-w-0 pr-1">
                            <span className="font-semibold text-[#1a1a1a] dark:text-zinc-100 text-sm md:text-base leading-tight truncate">{item.name}</span>
                            {item.color_name && <span className="text-xs text-[#888] dark:text-zinc-400 mt-1 truncate">{item.color_name}</span>}
                          </div>
                        </div>
                        <Link
                          href={`/product?id=${item.id}`}
                          onClick={onClose}
                          className="px-4 py-2.5 bg-[#1a1a1a] dark:bg-white text-white dark:text-zinc-900 rounded-xl text-xs font-semibold hover:bg-[#333] dark:hover:bg-zinc-200 transition-colors active:scale-95 flex-shrink-0"
                        >
                          Ver
                        </Link>
                      </div>
                    ))}
                    {product.included_products?.length && includedProductsData.length === 0 ? (
                      <p className="text-sm text-[#888] dark:text-zinc-500 italic">Cargando productos incluidos...</p>
                    ) : null}
                  </div>
                </div>
              )}


              {/* Extra info */}
              {(product.material || product.care_instructions) && (
                <div className="pt-4 border-t border-[#f0f0ee] dark:border-zinc-800">
                  {product.material && (
                    <p className="text-xs text-[#aaa] dark:text-zinc-500 font-normal mb-1">
                      Material: {product.material}
                    </p>
                  )}
                  {product.care_instructions && (
                    <p className="text-xs text-[#aaa] dark:text-zinc-500 font-normal">
                      Cuidado: {product.care_instructions}
                    </p>
                  )}
                </div>
              )}

              {/* Related Products */}
              {relatedProductsData.length > 0 && (
                <div className="pt-8 mt-6 border-t border-[#f0f0ee] dark:border-zinc-800">
                  <h3 className="text-[16px] font-semibold text-[#1a1a1a] dark:text-zinc-100 mb-4">
                    También podría interesarte
                  </h3>
                  <div className="grid grid-cols-2 gap-3 md:gap-4">
                    {relatedProductsData.map((relatedProduct, idx) => (
                      <div key={relatedProduct.id} className="h-full">
                        <ProductCard
                          product={relatedProduct}
                          index={idx}
                          isFavorite={false} // We don't have full state sync here, keep simple or add logic if needed
                          onToggleFavorite={() => {}} 
                          onClick={() => {
                            /* Fase 7 (1.3): antes esto era `window.location.href`,
                               que recarga TODO el documento y pierde la posición
                               del usuario. `router.push` hace navegación interna. */
                            router.push(`/product?id=${relatedProduct.id}`);
                          }}
                        />
                      </div>
                    ))}
                  </div>
                </div>
              )}

            </div>
          </motion.div>
        </div>

        {/* Sticky footer */}
        <div className="absolute bottom-0 left-0 right-0 md:left-auto md:w-[55%] px-5 md:px-6 py-4 pb-safe md:pb-6 border-t border-[#f0f0ee] dark:border-zinc-800 bg-white dark:bg-zinc-900 flex gap-3 z-50 rounded-br-[28px]">
          <Link
            href={`/product?id=${product.id}`}
            className="flex-1 flex items-center justify-center h-12 bg-[#f2f2f0] dark:bg-zinc-800 text-[#1a1a1a] dark:text-zinc-100 rounded-2xl text-sm font-semibold hover:bg-[#e8e8e4] dark:hover:bg-zinc-700 transition-colors active:scale-[0.97]"
          >
            Ver detalles completos
          </Link>
          {whatsappUrl ? (
            <a
              href={whatsappUrl}
              target="_blank"
              rel="noreferrer"
              className="flex-1 flex items-center justify-center h-12 bg-[#25D366] text-white rounded-2xl text-sm font-semibold hover:bg-[#1ebe5d] transition-colors active:scale-[0.97] gap-2"
            >
              <svg className="w-4 h-4 fill-current flex-shrink-0" viewBox="0 0 16 16" xmlns="http://www.w3.org/2000/svg">
                <path d="M13.601 2.326A7.85 7.85 0 0 0 7.994 0C3.627 0 .068 3.558.064 7.926c0 1.399.366 2.76 1.057 3.965L0 16l4.204-1.102a7.9 7.9 0 0 0 3.79.965h.004c4.368 0 7.926-3.558 7.93-7.93A7.9 7.9 0 0 0 13.6 2.326zM7.994 14.521a6.6 6.6 0 0 1-3.356-.92l-.24-.144-2.494.654.666-2.433-.156-.251a6.56 6.56 0 0 1-1.007-3.505c0-3.626 2.957-6.584 6.591-6.584a6.56 6.56 0 0 1 4.66 1.931 6.56 6.56 0 0 1 1.928 4.66c-.004 3.639-2.961 6.592-6.592 6.592m3.615-4.934c-.197-.099-1.17-.578-1.353-.646-.182-.065-.315-.099-.445.099-.133.197-.513.646-.627.775-.114.133-.232.148-.43.05-.197-.1-.836-.308-1.592-.985-.59-.525-.985-1.175-1.103-1.372-.114-.198-.011-.304.088-.403.087-.088.197-.232.296-.346.1-.114.133-.198.198-.33.065-.134.034-.248-.015-.347-.05-.099-.445-1.076-.612-1.47-.16-.389-.323-.335-.445-.34-.114-.007-.247-.007-.38-.007a.73.73 0 0 0-.529.247c-.182.198-.691.677-.691 1.654s.71 1.916.81 2.049c.098.133 1.394 2.132 3.383 2.992.47.205.84.326 1.129.418.475.152.904.129 1.246.08.38-.058 1.171-.48 1.338-.943.164-.464.164-.86.114-.943-.049-.084-.182-.133-.38-.232" />
              </svg>
              Consultar
            </a>
          ) : (
            <span className="flex-1 flex items-center justify-center h-12 bg-[#e0e0e0] text-[#999] rounded-2xl text-sm font-semibold cursor-not-allowed">
              Consultar
            </span>
          )}
        </div>
      </motion.div>

      {/* Size Guide Modal (Lightbox) */}
      <AnimatePresence>
        {isSizeGuideModalOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] bg-black/90 backdrop-blur-sm flex flex-col items-center justify-center p-4"
            onClick={() => setIsSizeGuideModalOpen(false)}
          >
            <div className="relative flex flex-col items-end max-w-full max-h-[90vh]">
              <motion.button
                className="mb-3 w-10 h-10 flex items-center justify-center bg-white/10 hover:bg-white/20 rounded-full text-white transition-colors"
                onClick={() => setIsSizeGuideModalOpen(false)}
              >
                <span className="material-symbols-outlined text-[24px]">close</span>
              </motion.button>
              <motion.img
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.9, opacity: 0 }}
                transition={{ type: 'spring', damping: 25, stiffness: 300 }}
                src="/medidas1.webp"
                srcSet="/medidas1.webp 1200w, /medidas1@2x.webp 1800w"
                sizes="(max-width: 768px) 100vw, 720px"
                alt="Guía de tallas completa de Mundo Medics"
                width={1200}
                height={737}
                loading="lazy"
                decoding="async"
                className="max-w-full max-h-[calc(90vh-52px)] object-contain rounded-2xl bg-white p-2"
                onClick={(e) => e.stopPropagation()}
              />
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
