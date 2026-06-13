'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { supabase } from '@/utils/supabase/client';
import { motion, AnimatePresence } from 'motion/react';

interface Product {
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

interface ProductDetailClientProps {
  product: Product;
}

export default function ProductDetailClient({ product }: ProductDetailClientProps) {
  const [selectedSize, setSelectedSize] = useState<string | null>(product.sizes?.[0] || null);
  const [selectedColorIndex, setSelectedColorIndex] = useState<number>(0);
  const [isFavorite, setIsFavorite] = useState(false);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [showSizeGuide, setShowSizeGuide] = useState(false);
  const [isSizeGuideModalOpen, setIsSizeGuideModalOpen] = useState(false);
  const [whatsappNumber, setWhatsappNumber] = useState(process.env.NEXT_PUBLIC_WHATSAPP_NUMBER || '1234567890');

  // Fetch WhatsApp number from settings
  useEffect(() => {
    const fetchSettings = async () => {
      try {
        const { data } = await supabase.from('settings').select('value').eq('key', 'whatsapp_number').maybeSingle();
        if (data?.value) setWhatsappNumber(data.value);
      } catch (e) {}
    };
    fetchSettings();

    const handleUpdate = () => fetchSettings();
    window.addEventListener('settingsUpdated', handleUpdate);
    return () => window.removeEventListener('settingsUpdated', handleUpdate);
  }, []);

  // Combine main image and gallery
  const allImages = React.useMemo(() => {
    const images = [];
    if (product.image_url) images.push(product.image_url);
    if (product.gallery && Array.isArray(product.gallery)) {
      images.push(...product.gallery.filter(img => img !== product.image_url));
    }
    return images;
  }, [product.image_url, product.gallery]);

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
        newFavs = savedFavs.filter((i: string) => i !== product.id);
      } else {
        newFavs = [...savedFavs, product.id];
      }
      localStorage.setItem('favorites', JSON.stringify(newFavs));
      setIsFavorite(!isFavorite);
      window.dispatchEvent(new Event('favoritesUpdated'));
    } catch (e) {}
  };

  // Build WhatsApp message — send product page URL so WhatsApp shows OG preview
  const buildWhatsappMessage = () => {
    // Use env var so it always points to the real domain, never localhost
    const siteUrl = (process.env.NEXT_PUBLIC_SITE_URL || '').replace(/\/+$/, '');
    let msg = `Hola, estoy interesado en el producto: *${product.name}*`;
    if (selectedSize) {
      msg += `\n• Talla: ${selectedSize}`;
    }
    if (product.color_name) {
      msg += `\n• Color: ${product.color_name}`;
    }
    // Link to the product page with ?ref=wa so WhatsApp always scrapes fresh OG tags
    msg += `\n\n👉 Ver producto: ${siteUrl}/product?id=${product.id}&ref=wa`;
    return encodeURIComponent(msg);
  };

  const whatsappUrl = `https://wa.me/${whatsappNumber}?text=${buildWhatsappMessage()}`;

  return (
    <div className="min-h-[100dvh] bg-white flex flex-col md:flex-row relative">

      {/* Mobile Header */}
      <header className="absolute top-0 w-full z-40 flex items-center justify-between p-4 bg-gradient-to-b from-black/20 to-transparent md:hidden">
        <Link
          href="/"
          className="w-10 h-10 flex items-center justify-center bg-white/70 backdrop-blur-md rounded-full text-[#1a1a1a] shadow-sm active:scale-95 transition-all"
        >
          <span className="material-symbols-outlined text-[20px]" style={{ fontVariationSettings: "'wght' 300" }}>arrow_back</span>
        </Link>
        <button
          onClick={toggleFavorite}
          className="w-10 h-10 flex items-center justify-center bg-white/70 backdrop-blur-md rounded-full text-[#1a1a1a] shadow-sm active:scale-95 transition-all"
        >
          <span
            className={`material-symbols-outlined text-[20px] ${isFavorite ? 'text-[#e57373]' : ''}`}
            style={{ fontVariationSettings: isFavorite ? "'FILL' 1, 'wght' 300" : "'FILL' 0, 'wght' 300" }}
          >
            favorite
          </span>
        </button>
      </header>

      {/* Desktop Back */}
      <Link
        href="/"
        className="hidden md:flex fixed top-6 left-6 z-20 w-11 h-11 items-center justify-center rounded-full bg-white/70 backdrop-blur-md text-[#1a1a1a] hover:bg-white transition-colors shadow-sm border border-black/5"
      >
        <span className="material-symbols-outlined text-[22px]" style={{ fontVariationSettings: "'wght' 300" }}>arrow_back</span>
      </Link>

      {/* Left: Image */}
      <div className="w-full md:w-1/2 md:fixed md:top-0 md:bottom-0 md:left-0 bg-[#eeecea] relative aspect-[4/5] md:aspect-auto md:h-[100dvh] flex items-center justify-center">
        {allImages.length > 0 ? (
          <motion.img
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.5, ease: "easeOut" }}
            alt={product.name}
            className="w-full h-full object-contain transition-all duration-500"
            src={allImages[currentImageIndex]}
          />
        ) : (
          <span className="text-[#bbb] font-light">Próximamente</span>
        )}

        {/* Carousel arrows */}
        {allImages.length > 1 && (
          <>
            <div className="absolute inset-y-0 left-3 flex items-center">
              <button
                onClick={() => setCurrentImageIndex(prev => prev === 0 ? allImages.length - 1 : prev - 1)}
                className="w-8 h-8 rounded-full bg-white/70 backdrop-blur-md flex items-center justify-center text-[#1a1a1a] hover:bg-white active:scale-90 transition-all shadow-sm"
              >
                <span className="material-symbols-outlined text-[18px]" style={{ fontVariationSettings: "'wght' 300" }}>chevron_left</span>
              </button>
            </div>
            <div className="absolute inset-y-0 right-3 flex items-center">
              <button
                onClick={() => setCurrentImageIndex(prev => prev === allImages.length - 1 ? 0 : prev + 1)}
                className="w-8 h-8 rounded-full bg-white/70 backdrop-blur-md flex items-center justify-center text-[#1a1a1a] hover:bg-white active:scale-90 transition-all shadow-sm"
              >
                <span className="material-symbols-outlined text-[18px]" style={{ fontVariationSettings: "'wght' 300" }}>chevron_right</span>
              </button>
            </div>
            <div className="absolute bottom-6 left-0 right-0 flex justify-center gap-1.5 z-10">
              {allImages.map((_, idx) => (
                <div
                  key={idx}
                  className={`w-1.5 h-1.5 rounded-full transition-colors ${idx === currentImageIndex ? 'bg-[#1a1a1a]' : 'bg-black/20'}`}
                />
              ))}
            </div>
          </>
        )}
      </div>

      {/* Right: Content — scrollable */}
      <div className="w-full md:w-1/2 md:ml-[50%] flex flex-col bg-white relative z-10 pt-5 md:pt-16 px-5 md:px-12 pb-24 md:pb-32">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.1 }}
          className="w-full max-w-[480px] mx-auto md:mx-0"
        >

          {/* Title */}
          <div className="flex justify-between items-start">
            <h1 className="text-[28px] md:text-3xl font-semibold tracking-tight leading-none">
              {product.name}
            </h1>
          </div>

          {/* Description */}
          <p className="text-[#888] text-sm md:text-base leading-relaxed mb-8 mt-3 font-normal">
            {product.description || 'Sin descripción disponible.'}
          </p>

          {/* Color */}
          {product.color_hex_codes && product.color_hex_codes.length > 0 && (
            <div className="mb-7">
              <span className="text-[11px] font-semibold text-[#aaa] uppercase tracking-widest block mb-3">
                Color: <span className="font-normal normal-case text-[#888] tracking-normal">{product.color_name}</span>
              </span>
              <div className="flex gap-3">
                {product.color_hex_codes.map((hex, i) => (
                  <button
                    key={i}
                    onClick={() => setSelectedColorIndex(i)}
                    className={`w-9 h-9 md:w-11 md:h-11 rounded-full transition-all hover:scale-110 border border-[#e0e0e0] ${
                      i === selectedColorIndex ? 'ring-2 ring-[#1a1a1a]/15 ring-offset-2 border-none' : ''
                    }`}
                    style={{ background: hex }}
                  />
                ))}
              </div>
            </div>
          )}

          {/* Size */}
          {product.sizes && product.sizes.length > 0 && (
            <div className="mb-7">
              <div className="flex justify-between items-center mb-3">
                <span className="text-[11px] font-semibold text-[#aaa] uppercase tracking-widest">Talla</span>
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
                    className="overflow-hidden mb-5"
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

              <div className="flex gap-2.5 flex-wrap">
                {product.sizes.map((s) => (
                  <button
                    key={s}
                    onClick={() => setSelectedSize(s)}
                    className={`min-w-[44px] px-3 py-2.5 md:py-3 rounded-xl text-sm font-semibold transition-all active:scale-95 ${
                      s === selectedSize
                        ? 'bg-[#1a1a1a] text-white shadow-sm'
                        : 'bg-[#f4f2f0] text-[#555] hover:bg-[#eceae6]'
                    }`}
                  >
                    {s}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Care info */}
          {product.care_instructions && (
            <div className="bg-[#f8f6f2] rounded-2xl p-4 md:p-5 flex items-start gap-3 border border-[#ece9e2] mb-6">
              <span className="material-symbols-outlined text-[#bbb] mt-0.5" style={{ fontVariationSettings: "'wght' 300" }}>laundry</span>
              <div>
                <h4 className="text-sm font-semibold text-[#1a1a1a] mb-1">Cuidados de la prenda</h4>
                <p className="text-xs text-[#999] leading-relaxed">
                  {product.care_instructions}
                </p>
              </div>
            </div>
          )}
        </motion.div>

        {/* CTA footer */}
        <footer className="fixed bottom-0 left-0 w-full bg-white/90 backdrop-blur-xl border-t border-black/5 p-4 pb-safe z-20 md:relative md:w-auto md:bg-transparent md:backdrop-blur-none md:border-none md:p-0 md:pt-2 md:mt-auto max-w-[480px] md:mx-0">
          <a
            href={whatsappUrl}
            target="_blank"
            rel="noreferrer"
            className="flex items-center justify-center w-full bg-[#1a1a1a] text-white py-3.5 md:py-4 rounded-2xl font-semibold text-base hover:bg-[#333] transition-all active:scale-[0.98] gap-2.5 shadow-[0_4px_20px_rgba(0,0,0,0.12)]"
          >
            <svg className="w-5 h-5 fill-current flex-shrink-0" viewBox="0 0 16 16" xmlns="http://www.w3.org/2000/svg">
              <path d="M13.601 2.326A7.85 7.85 0 0 0 7.994 0C3.627 0 .068 3.558.064 7.926c0 1.399.366 2.76 1.057 3.965L0 16l4.204-1.102a7.9 7.9 0 0 0 3.79.965h.004c4.368 0 7.926-3.558 7.93-7.93A7.9 7.9 0 0 0 13.6 2.326zM7.994 14.521a6.6 6.6 0 0 1-3.356-.92l-.24-.144-2.494.654.666-2.433-.156-.251a6.56 6.56 0 0 1-1.007-3.505c0-3.626 2.957-6.584 6.591-6.584a6.56 6.56 0 0 1 4.66 1.931 6.56 6.56 0 0 1 1.928 4.66c-.004 3.639-2.961 6.592-6.592 6.592m3.615-4.934c-.197-.099-1.17-.578-1.353-.646-.182-.065-.315-.099-.445.099-.133.197-.513.646-.627.775-.114.133-.232.148-.43.05-.197-.1-.836-.308-1.592-.985-.59-.525-.985-1.175-1.103-1.372-.114-.198-.011-.304.088-.403.087-.088.197-.232.296-.346.1-.114.133-.198.198-.33.065-.134.034-.248-.015-.347-.05-.099-.445-1.076-.612-1.47-.16-.389-.323-.335-.445-.34-.114-.007-.247-.007-.38-.007a.73.73 0 0 0-.529.247c-.182.198-.691.677-.691 1.654s.71 1.916.81 2.049c.098.133 1.394 2.132 3.383 2.992.47.205.84.326 1.129.418.475.152.904.129 1.246.08.38-.058 1.171-.48 1.338-.943.164-.464.164-.86.114-.943-.049-.084-.182-.133-.38-.232" />
            </svg>
            {product.action_text || 'Consultar por WhatsApp'}
          </a>
        </footer>
      </div>

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
    </div>
  );
}
