'use client';

import React, { useEffect, useRef } from 'react';
import Link from 'next/link';
import { motion, AnimatePresence, useScroll, useTransform, useDragControls } from 'motion/react';

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
  const [whatsappNumber, setWhatsappNumber] = React.useState(process.env.NEXT_PUBLIC_WHATSAPP_NUMBER || '1234567890');

  useEffect(() => {
    const fetchSettings = async () => {
      try {
        const { supabase } = await import('@/utils/supabase/client');
        const { data } = await supabase.from('settings').select('value').eq('key', 'whatsapp_number').single();
        if (data?.value) setWhatsappNumber(data.value);
      } catch (e) {}
    };
    fetchSettings();

    const handleUpdate = () => fetchSettings();
    window.addEventListener('settingsUpdated', handleUpdate);
    return () => window.removeEventListener('settingsUpdated', handleUpdate);
  }, []);

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

  const buildWhatsappMessage = () => {
    // Use env var so it always points to the real domain, never localhost
    const siteUrl = (process.env.NEXT_PUBLIC_SITE_URL || '').replace(/\/+$/, '');
    let msg = `Hola, estoy interesado en el producto: *${product.name}*`;
    if (selectedSize) {
      msg += `\n\u2022 Talla: ${selectedSize}`;
    }
    if (product.color_name) {
      msg += `\n\u2022 Color: ${product.color_name}`;
    }
    // Link to the product page with ?ref=wa so WhatsApp always scrapes fresh OG tags
    msg += `\n\n\uD83D\uDC49 Ver producto: ${siteUrl}/product?id=${product.id}&ref=wa`;
    return encodeURIComponent(msg);
  };

  const whatsappUrl = `https://wa.me/${whatsappNumber}?text=${buildWhatsappMessage()}`;

  // Auto-slide effect
  useEffect(() => {
    if (allImages.length <= 1) return;
    const interval = setInterval(() => {
      setCurrentImageIndex(prev => (prev === allImages.length - 1 ? 0 : prev + 1));
    }, 4000);
    return () => clearInterval(interval);
  }, [allImages.length]);

  // Load favorites from local storage
  useEffect(() => {
    try {
      const savedFavs = JSON.parse(localStorage.getItem('favorites') || '[]');
      if (savedFavs.includes(product.id)) {
        setIsFavorite(true);
      }
    } catch (e) {}
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
    } catch (e) {}
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
          bg-[#eeecea] md:bg-white rounded-t-[28px] md:rounded-[28px]
          max-h-[92svh] md:max-h-[82vh] h-[92svh] md:h-auto
          w-full md:w-[840px]
          md:-translate-x-1/2 md:-translate-y-1/2
          shadow-[0_-6px_40px_rgba(0,0,0,0.08)] md:shadow-[0_20px_60px_rgba(0,0,0,0.12)]
          flex flex-col md:flex-row overflow-hidden"
        initial={{ y: '100%', opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        exit={{ y: '100%', opacity: 0 }}
        transition={{ type: 'spring', stiffness: 350, damping: 35 }}
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
          className="hidden md:flex absolute top-4 right-4 z-50 w-9 h-9 items-center justify-center bg-[#f2f2f0] hover:bg-[#e8e8e4] rounded-full text-[#555] transition-colors"
        >
          <span className="material-symbols-outlined text-[20px]" style={{ fontVariationSettings: "'wght' 300" }}>close</span>
        </motion.button>

        {/* Scrollable Container */}
        <div
          ref={scrollRef}
          className="w-full h-full overflow-y-auto md:overflow-hidden no-scrollbar flex flex-col md:flex-row pb-[80px] md:pb-0"
        >
          {/* Left: Image */}
          <div className="w-full md:w-[45%] aspect-[4/5] md:aspect-auto md:h-full relative flex-shrink-0 md:px-5 md:py-5 md:pr-2.5 z-0">
            <div className="sticky top-0 w-full h-full bg-[#eeecea] md:rounded-[20px] overflow-hidden flex items-center justify-center relative">
              {allImages.length > 0 ? (
                <>
                  <motion.img
                    style={{ scale: imageScale, opacity: imageOpacity, y: imageY }}
                    alt={`${product.name} - Imagen ${currentImageIndex + 1}`}
                    className="object-contain w-full h-full transition-all duration-500"
                    src={allImages[currentImageIndex]}
                  />
                  
                  {/* Carousel Controls */}
                  {allImages.length > 1 && (
                    <>
                      <div className="absolute inset-y-0 left-0 flex items-center">
                        <button 
                          onClick={() => setCurrentImageIndex(prev => prev === 0 ? allImages.length - 1 : prev - 1)}
                          className="w-8 h-8 ml-2 rounded-full bg-white/50 backdrop-blur-sm flex items-center justify-center text-[#1a1a1a] hover:bg-white transition-colors"
                        >
                          <span className="material-symbols-outlined text-[20px]">chevron_left</span>
                        </button>
                      </div>
                      <div className="absolute inset-y-0 right-0 flex items-center">
                        <button 
                          onClick={() => setCurrentImageIndex(prev => prev === allImages.length - 1 ? 0 : prev + 1)}
                          className="w-8 h-8 mr-2 rounded-full bg-white/50 backdrop-blur-sm flex items-center justify-center text-[#1a1a1a] hover:bg-white transition-colors"
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
            className="w-full md:w-[55%] flex flex-col bg-white relative z-10 
              rounded-t-[28px] md:rounded-none mt-[-28px] md:mt-0 
              pt-7 md:pt-8 px-5 md:px-6 flex-shrink-0 
              md:overflow-y-auto md:flex-1 no-scrollbar min-h-0"
            initial={{ opacity: 0, x: 12 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.12, duration: 0.3 }}
          >
            <div className="pb-8 md:pb-24">
              <h2 className="text-[22px] md:text-3xl font-semibold text-[#1a1a1a] tracking-tight mb-2 md:mb-3 md:pr-10 leading-snug">
                {product.name}
              </h2>
              <p className="text-[#888] text-sm font-normal leading-relaxed mb-5">
                {product.description || 'Sin descripción disponible.'}
              </p>

              {/* Color selector */}
              {product.color_hex_codes && product.color_hex_codes.length > 0 && (
                <div className="mb-5">
                  <span className="text-[11px] font-semibold text-[#aaa] uppercase tracking-widest block mb-2.5">
                    Color: <span className="font-normal normal-case text-[#888] tracking-normal ml-1">{product.color_name}</span>
                  </span>
                  <div className="flex gap-2.5">
                    {product.color_hex_codes.map((hex, i) => (
                      <motion.button
                        key={i}
                        whileTap={{ scale: 0.88 }}
                        onClick={() => setSelectedColorIndex(i)}
                        className={`w-8 h-8 rounded-full border transition-all ${
                          i === selectedColorIndex ? 'border-[#1a1a1a] ring-2 ring-[#1a1a1a]/20 ring-offset-1' : 'border-[#e0e0e0] hover:border-[#999]'
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
                    <span className="text-[11px] font-semibold text-[#aaa] uppercase tracking-widest block">Talla</span>
                    <button 
                      onClick={() => setShowSizeGuide(!showSizeGuide)}
                      className="text-xs text-[#888] hover:text-[#1a1a1a] underline underline-offset-2 font-medium transition-colors"
                    >
                      {showSizeGuide ? 'Ocultar guía' : 'Guía de tallas'}
                    </button>
                  </div>
                  
                  <AnimatePresence>
                    {showSizeGuide && (
                      <motion.div 
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        className="overflow-hidden mb-4"
                      >
                        <img 
                          src="/medidas1.svg" 
                          alt="Guía de Tallas" 
                          className="w-full h-auto rounded-xl border border-black/5 cursor-pointer hover:opacity-90 transition-opacity" 
                          onClick={() => setIsSizeGuideModalOpen(true)}
                        />
                      </motion.div>
                    )}
                  </AnimatePresence>

                  <div className="flex gap-2">
                    {product.sizes.map((s) => (
                      <motion.button
                        key={s}
                        whileTap={{ scale: 0.9 }}
                        onClick={() => setSelectedSize(s)}
                        className={`w-11 h-10 rounded-xl text-sm font-semibold transition-all ${
                          s === selectedSize
                            ? 'bg-[#1a1a1a] text-white'
                            : 'bg-[#f2f2f0] text-[#555] hover:bg-[#e8e8e4]'
                        }`}
                      >
                        {s}
                      </motion.button>
                    ))}
                  </div>
                </div>
              )}

              {/* Extra info */}
              {(product.material || product.care_instructions) && (
                <div className="pt-4 border-t border-[#f0f0ee]">
                  {product.material && (
                    <p className="text-xs text-[#aaa] font-normal mb-1">
                      Material: {product.material}
                    </p>
                  )}
                  {product.care_instructions && (
                    <p className="text-xs text-[#aaa] font-normal">
                      Cuidado: {product.care_instructions}
                    </p>
                  )}
                </div>
              )}
            </div>
          </motion.div>
        </div>

        {/* Sticky footer */}
        <div className="absolute bottom-0 left-0 right-0 md:left-auto md:w-[55%] px-5 md:px-6 py-4 pb-safe md:pb-6 border-t border-[#f0f0ee] bg-white flex gap-3 z-50 rounded-br-[28px]">
          <Link
            href={`/product?id=${product.id}`}
            className="flex-1 flex items-center justify-center h-12 bg-[#f2f2f0] text-[#1a1a1a] rounded-2xl text-sm font-semibold hover:bg-[#e8e8e4] transition-colors active:scale-[0.97]"
          >
            Ver detalles completos
          </Link>
          <a
            href={whatsappUrl}
            target="_blank"
            rel="noreferrer"
            className="flex-1 flex items-center justify-center h-12 bg-[#1a1a1a] text-white rounded-2xl text-sm font-semibold hover:bg-[#333] transition-colors active:scale-[0.97] gap-2"
          >
            <svg className="w-4 h-4 fill-current flex-shrink-0" viewBox="0 0 16 16" xmlns="http://www.w3.org/2000/svg">
              <path d="M13.601 2.326A7.85 7.85 0 0 0 7.994 0C3.627 0 .068 3.558.064 7.926c0 1.399.366 2.76 1.057 3.965L0 16l4.204-1.102a7.9 7.9 0 0 0 3.79.965h.004c4.368 0 7.926-3.558 7.93-7.93A7.9 7.9 0 0 0 13.6 2.326zM7.994 14.521a6.6 6.6 0 0 1-3.356-.92l-.24-.144-2.494.654.666-2.433-.156-.251a6.56 6.56 0 0 1-1.007-3.505c0-3.626 2.957-6.584 6.591-6.584a6.56 6.56 0 0 1 4.66 1.931 6.56 6.56 0 0 1 1.928 4.66c-.004 3.639-2.961 6.592-6.592 6.592m3.615-4.934c-.197-.099-1.17-.578-1.353-.646-.182-.065-.315-.099-.445.099-.133.197-.513.646-.627.775-.114.133-.232.148-.43.05-.197-.1-.836-.308-1.592-.985-.59-.525-.985-1.175-1.103-1.372-.114-.198-.011-.304.088-.403.087-.088.197-.232.296-.346.1-.114.133-.198.198-.33.065-.134.034-.248-.015-.347-.05-.099-.445-1.076-.612-1.47-.16-.389-.323-.335-.445-.34-.114-.007-.247-.007-.38-.007a.73.73 0 0 0-.529.247c-.182.198-.691.677-.691 1.654s.71 1.916.81 2.049c.098.133 1.394 2.132 3.383 2.992.47.205.84.326 1.129.418.475.152.904.129 1.246.08.38-.058 1.171-.48 1.338-.943.164-.464.164-.86.114-.943-.049-.084-.182-.133-.38-.232" />
            </svg>
            Consultar
          </a>
        </div>
      </motion.div>

      {/* Size Guide Modal (Lightbox) */}
      <AnimatePresence>
        {isSizeGuideModalOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] bg-black/90 backdrop-blur-sm flex items-center justify-center p-4"
            onClick={() => setIsSizeGuideModalOpen(false)}
          >
            <motion.button
              className="absolute top-4 right-4 md:top-6 md:right-6 w-10 h-10 flex items-center justify-center bg-white/10 hover:bg-white/20 rounded-full text-white transition-colors"
              onClick={() => setIsSizeGuideModalOpen(false)}
            >
              <span className="material-symbols-outlined text-[24px]">close</span>
            </motion.button>
            <motion.img
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              transition={{ type: 'spring', damping: 25, stiffness: 300 }}
              src="/medidas1.svg"
              alt="Guía de Tallas Completa"
              className="max-w-full max-h-[90vh] object-contain rounded-2xl bg-white p-2"
              onClick={(e) => e.stopPropagation()}
            />
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
