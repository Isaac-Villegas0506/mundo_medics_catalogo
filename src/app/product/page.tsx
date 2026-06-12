'use client';

import React, { useEffect, useState, Suspense } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { supabase } from '@/utils/supabase/client';
import { motion, AnimatePresence } from 'motion/react';

// Reuse the Product type or define it here
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

function ProductDetailContent() {
  const searchParams = useSearchParams();
  const id = searchParams.get('id');
  const [product, setProduct] = useState<Product | null>(null);
  const [loading, setLoading] = useState(true);

  // Interactive states
  const [selectedSize, setSelectedSize] = useState<string | null>(null);
  const [selectedColorIndex, setSelectedColorIndex] = useState<number>(0);
  const [isFavorite, setIsFavorite] = useState(false);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);

  useEffect(() => {
    async function fetchProduct() {
      if (!id) {
        setLoading(false);
        return;
      }
      const { data, error } = await supabase
        .from('products')
        .select('*')
        .eq('id', id)
        .single();
      
      if (!error && data) {
        setProduct(data as Product);
        setSelectedSize(data.sizes?.[0] || null);
      }
      setLoading(false);
    }
    fetchProduct();
  }, [id]);

  // Combine main image and gallery
  const allImages = React.useMemo(() => {
    if (!product) return [];
    const images = [];
    if (product.image_url) images.push(product.image_url);
    if (product.gallery && Array.isArray(product.gallery)) {
      images.push(...product.gallery.filter(img => img !== product.image_url));
    }
    return images;
  }, [product?.image_url, product?.gallery]);

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
    if (!product) return;
    try {
      const savedFavs = JSON.parse(localStorage.getItem('favorites') || '[]');
      if (savedFavs.includes(product.id)) {
        setIsFavorite(true);
      }
    } catch (e) {}
  }, [product]);

  const toggleFavorite = () => {
    if (!product) return;
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

  if (loading) {
    return (
      <div className="min-h-[100dvh] flex items-center justify-center bg-[#f8f8f6]">
        <div className="w-8 h-8 border-4 border-[#1a1a1a]/20 border-t-[#1a1a1a] rounded-full animate-spin" />
      </div>
    );
  }

  if (!product) {
    return (
      <div className="min-h-[100dvh] flex flex-col items-center justify-center bg-[#f8f8f6] px-5 text-center">
        <h1 className="text-2xl font-bold text-[#1a1a1a] mb-2">Producto no encontrado</h1>
        <p className="text-[#888] mb-6">El producto que buscas ya no existe o fue ocultado.</p>
        <Link href="/" className="px-6 py-3 bg-[#1a1a1a] text-white rounded-xl font-semibold">Volver al catálogo</Link>
      </div>
    );
  }

  const whatsappNumber = process.env.NEXT_PUBLIC_WHATSAPP_NUMBER || '1234567890';
  const whatsappUrl = `https://wa.me/${whatsappNumber}?text=Hola,%20quisiera%20consultar%20sobre%20el%20producto:%20${encodeURIComponent(product.name)}%20en%20color%20${encodeURIComponent(product.color_name)}`;

  return (
    <div className="min-h-[100dvh] bg-white flex flex-col md:flex-row relative">

      {/* Mobile Header */}
      <header className="absolute top-0 w-full z-10 flex items-center justify-between p-4 bg-gradient-to-b from-black/20 to-transparent md:hidden">
        <Link
          href="/"
          className="w-10 h-10 flex items-center justify-center rounded-full bg-white/25 backdrop-blur-md text-white active:scale-90 transition-transform"
        >
          <span className="material-symbols-outlined text-[22px]" style={{ fontVariationSettings: "'wght' 300" }}>arrow_back</span>
        </Link>
      </header>

      {/* Desktop Back */}
      <Link
        href="/"
        className="hidden md:flex fixed top-6 left-6 z-20 w-11 h-11 items-center justify-center rounded-full bg-white/70 backdrop-blur-md text-[#1a1a1a] hover:bg-white transition-colors shadow-sm border border-black/5"
      >
        <span className="material-symbols-outlined text-[22px]" style={{ fontVariationSettings: "'wght' 300" }}>arrow_back</span>
      </Link>

      {/* Left: Image — full height on desktop, fixed */}
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
      <div className="w-full md:w-1/2 md:ml-[50%] flex flex-col min-h-[100dvh] bg-white relative z-10 pt-5 md:pt-16 px-5 md:px-12 pb-32">
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.1 }}
          className="w-full max-w-[480px] mx-auto md:mx-0 flex-1"
        >

          {/* Title + Favorite */}
          <div className="flex items-start justify-between mb-3 gap-4">
            <h1 className="text-[26px] md:text-[36px] font-semibold tracking-tight text-[#1a1a1a] leading-tight">
              {product.name}
            </h1>
            <motion.button 
              whileTap={{ scale: 0.82 }}
              onClick={toggleFavorite}
              className="flex-shrink-0 w-10 h-10 mt-0.5 flex items-center justify-center bg-[#f4f2f0] hover:bg-[#eceae6] rounded-full text-[#555] hover:text-[#e57373] transition-colors"
            >
              <span 
                className={`material-symbols-outlined text-[20px] ${isFavorite ? 'text-[#e57373]' : ''}`} 
                style={{ fontVariationSettings: isFavorite ? "'FILL' 1, 'wght' 300" : "'FILL' 0, 'wght' 300" }}
              >
                favorite
              </span>
            </motion.button>
          </div>

          {/* Description */}
          <p className="text-[#888] text-sm md:text-base leading-relaxed mb-8 font-normal">
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
                <a href="#" className="text-xs text-[#888] hover:text-[#1a1a1a] underline underline-offset-2 font-medium transition-colors">Guía de tallas</a>
              </div>
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
            <span className="material-symbols-outlined text-[20px]" style={{ fontVariationSettings: "'wght' 300" }}>chat</span>
            {product.action_text || 'Consultar por WhatsApp'}
          </a>
        </footer>
      </div>
    </div>
  );
}

export default function ProductDetailPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center bg-[#f8f8f6]">
        <div className="w-8 h-8 border-4 border-[#1a1a1a] border-t-transparent rounded-full animate-spin" />
      </div>
    }>
      <ProductDetailContent />
    </Suspense>
  );
}
