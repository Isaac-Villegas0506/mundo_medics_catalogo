'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { supabase } from '@/utils/supabase/client';
import ProductBadges, { CustomizationLabel } from '@/components/ui/ProductBadges';
import { useWhatsappNumber } from '@/hooks/useWhatsappNumber';
import { useBackToCatalog } from '@/hooks/useBackToCatalog';
import { getSelectedColor } from '@/utils/productColor';
import { useSwipeGallery } from '@/hooks/useSwipeGallery';
import { buildWhatsappUrl } from '@/utils/whatsapp';
import { addToInquiry, getInquiryList, removeFromInquiry } from '@/utils/inquiryList';
import ImageLightbox from '@/components/ui/ImageLightbox';

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
  tags?: string[];
  is_featured?: boolean;
  customization_options?: string[];
  is_set?: boolean;
  included_products?: string[];
}

interface ProductDetailClientProps {
  product: Product;
}

export default function ProductDetailClient({ product }: ProductDetailClientProps) {
  const goBack = useBackToCatalog();
  const [selectedSize, setSelectedSize] = useState<string | null>(product.sizes?.[0] || null);
  const [selectedColorIndex, setSelectedColorIndex] = useState<number>(0);
  /* Fase 7 (1.6): el color que se muestra y se envía por WhatsApp. */
  const selectedColor = getSelectedColor(product.color_hex_codes, product.color_name, selectedColorIndex);
  const [isFavorite, setIsFavorite] = useState(false);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [showSizeGuide, setShowSizeGuide] = useState(false);
  const [isSizeGuideModalOpen, setIsSizeGuideModalOpen] = useState(false);
  /* Fase 8: visor a pantalla completa con zoom. */
  const [isLightboxOpen, setIsLightboxOpen] = useState(false);
  const whatsappNumber = useWhatsappNumber();
  const [includedProductsData, setIncludedProductsData] = useState<any[]>([]);

  /* Fase 31 — «Añadir a mi lista de consulta» también en la página de detalles.
     Mismo comportamiento que en el modal: es un interruptor (si ya está, lo
     quita). Se guarda con el color y la talla elegidos. */
  const [inInquiry, setInInquiry] = useState(false);

  useEffect(() => {
    setInInquiry(getInquiryList().some((x) => x.id === product.id));
  }, [product.id]);

  const toggleInquiry = () => {
    if (inInquiry) {
      removeFromInquiry(product.id);
      setInInquiry(false);
      return;
    }
    addToInquiry({
      id: product.id,
      name: product.name,
      color_name: selectedColor?.label || product.color_name,
      size: selectedSize || undefined,
      image_url: product.image_url,
    });
    setInInquiry(true);
  };

  // Fetch included products if it's a set
  useEffect(() => {
    if (product.is_set && product.included_products && product.included_products.length > 0) {
      const fetchIncluded = async () => {
        const { data } = await supabase
          .from('products')
          .select('id, name, color_name, image_url')
          .in('id', product.included_products || []);

        if (data) {
          // Sort them in the exact order they were added
          const sorted = [...data].sort((a, b) =>
            (product.included_products?.indexOf(a.id) || 0) - (product.included_products?.indexOf(b.id) || 0)
          );
          setIncludedProductsData(sorted);
        }
      };
      fetchIncluded();
    }
  }, [product]);

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
        newFavs = savedFavs.filter((i: string) => i !== product.id);
      } else {
        newFavs = [...savedFavs, product.id];
      }
      localStorage.setItem('favorites', JSON.stringify(newFavs));
      setIsFavorite(!isFavorite);
      window.dispatchEvent(new Event('favoritesUpdated'));
    } catch (e) { }
  };

  // Build WhatsApp message — send product page URL so WhatsApp shows OG preview
  const buildWhatsappMessage = () => {
    // Use env var so it always points to the real domain, never localhost
    const siteUrl = (process.env.NEXT_PUBLIC_SITE_URL || '').replace(/\/+$/, '');
    let msg = `Hola, estoy interesado en el ${product.is_set ? 'set completo' : 'producto'}: *${product.name}*`;
    if (!product.is_set) {
      if (selectedSize) {
        msg += `\n• Talla: ${selectedSize}`;
      }
      /* Fase 7 (1.6): antes se enviaba siempre `product.color_name`, ignorando
         el color que el cliente había seleccionado. Ahora va el seleccionado. */
      if (selectedColor) {
        msg += `\n• Color: ${selectedColor.label}`;
      }
    }
    // Link to the product page with ?ref=wa2 so WhatsApp always scrapes fresh OG tags
    msg += `\n\n👉 Ver producto: ${siteUrl}/product?id=${product.id}&ref=wa2`;
    return msg;
  };

  /* Fase 7 (1.8): normaliza el número (quita +, espacios, guiones, "00") y
     devuelve '' si no es válido, para deshabilitar el botón en ese caso. */
  const whatsappUrl = buildWhatsappUrl(whatsappNumber, buildWhatsappMessage());

  return (
    <div className="min-h-[100dvh] bg-white flex flex-col md:flex-row relative">

      {/* Mobile Header */}
      <header className="absolute top-0 w-full z-40 flex items-center justify-between p-4 bg-gradient-to-b from-black/20 to-transparent md:hidden">
        <button
          onClick={goBack}
          aria-label="Volver al catálogo"
          className="w-11 h-11 flex items-center justify-center bg-white/80 rounded-full text-[#1a1a1a] shadow-sm active:scale-95 transition-all"
        >
          <span className="material-symbols-outlined text-[20px]" style={{ fontVariationSettings: "'wght' 300" }}>arrow_back</span>
        </button>
        <button
          onClick={toggleFavorite}
          aria-label={isFavorite ? 'Quitar de guardados' : 'Guardar producto'}
          aria-pressed={isFavorite}
          className="w-11 h-11 flex items-center justify-center bg-white/80 rounded-full text-[#1a1a1a] shadow-sm active:scale-95 transition-all"
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
      <button
        onClick={goBack}
        aria-label="Volver al catálogo"
        className="hidden md:flex fixed top-6 left-6 z-20 w-11 h-11 items-center justify-center rounded-full bg-white/80 text-[#1a1a1a] hover:bg-white transition-colors shadow-sm border border-black/5"
      >
        <span className="material-symbols-outlined text-[22px]" style={{ fontVariationSettings: "'wght' 300" }}>arrow_back</span>
      </button>

      {/* Left: Image */}
      <div
        className="w-full md:w-1/2 md:fixed md:top-0 md:bottom-0 md:left-0 bg-[#eeecea] relative aspect-[4/5] md:aspect-auto md:h-[100dvh] flex items-center justify-center touch-pan-y"
        {...swipeHandlers}
      >
        {allImages.length > 0 ? (
          /* Fase 6 (10.3): imagen principal con next/image (optimizada y con
             `priority` porque es el LCP de esta vista). Antes era un <img>
             que descargaba el archivo original completo.
             Fase 8: al pulsar, se abre el visor con zoom. */
          <button
            type="button"
            onClick={() => setIsLightboxOpen(true)}
            aria-label="Ver imagen ampliada"
            className="absolute inset-0 cursor-zoom-in"
          >
            <Image
              key={allImages[currentImageIndex]}
              alt={product.name}
              className="object-contain pointer-events-none"
              src={allImages[currentImageIndex]}
              fill
              sizes="(max-width: 768px) 100vw, 50vw"
              preload
              fetchPriority="high"
              loading="eager"
            />
            {/* Lupa: en móvil baja debajo del header (que ocupa arriba-derecha
                con el botón de favorito) y a la izquierda de los puntos; en
                escritorio arriba-derecha, donde no hay nada más.
                Antes estaba en bottom-6, chocando con los puntos del carrusel. */}
            <span className="absolute right-4 top-20 z-10 flex h-10 w-10 items-center justify-center rounded-full bg-white/85 text-[#1a1a1a] shadow-sm md:right-6 md:top-6">
              <span className="material-symbols-outlined text-[20px]">zoom_in</span>
            </span>
          </button>
        ) : (
          <span className="text-[#bbb] font-light">Próximamente</span>
        )}

        {/* Badges on the image (desplazados para no quedar debajo del botón de regresar) */}
        <ProductBadges
          tags={product.tags}
          isFeatured={product.is_featured}
          size="md"
          className="top-16 left-2.5 md:top-20"
        />

        {/* Carousel arrows (los gestos táctiles del contenedor siguen activos) */}
        {allImages.length > 1 && (
          <>
            <div className="absolute inset-y-0 left-3 flex items-center">
              <button
                onClick={goPrevImage}
                aria-label="Imagen anterior"
                className="w-11 h-11 rounded-full bg-white/85 flex items-center justify-center text-[#1a1a1a] hover:bg-white active:scale-90 transition-all shadow-sm"
              >
                <span className="material-symbols-outlined text-[18px]" style={{ fontVariationSettings: "'wght' 300" }}>chevron_left</span>
              </button>
            </div>
            <div className="absolute inset-y-0 right-3 flex items-center">
              <button
                onClick={goNextImage}
                aria-label="Imagen siguiente"
                className="w-11 h-11 rounded-full bg-white/85 flex items-center justify-center text-[#1a1a1a] hover:bg-white active:scale-90 transition-all shadow-sm"
              >
                <span className="material-symbols-outlined text-[18px]" style={{ fontVariationSettings: "'wght' 300" }}>chevron_right</span>
              </button>
            </div>
            <div className="absolute bottom-6 left-0 right-0 flex flex-col items-center gap-2 z-10 pointer-events-none">
              <div className="flex justify-center gap-1.5">
                {allImages.map((_, idx) => (
                  <div
                    key={idx}
                    className={`w-1.5 h-1.5 rounded-full transition-colors ${idx === currentImageIndex ? 'bg-[#1a1a1a]' : 'bg-black/20'}`}
                  />
                ))}
              </div>
              {/* Pista de que se puede deslizar (Fase 7, 1.4). Sólo en táctil. */}
              <span className="md:hidden text-[10px] text-[#666] bg-white/70 rounded-full px-2 py-0.5">
                Desliza para ver más
              </span>
            </div>
          </>
        )}
      </div>

      {/* Right: Content — scrollable (Fase 32).
          Reserva exactamente lo que mide el footer: botón 52px + pt-4 (16px) +
          pb-safe-add (16px + zona segura) ≈ 84px + zona segura. Antes usaba
          `pb-nav` (80px de la barra de navegación, que esta página no tiene),
          así que sobraba espacio y el CTA quedaba «muy abajo». */}
      <div className="w-full md:w-1/2 md:ml-[50%] flex flex-col bg-white relative z-10 pt-5 md:pt-16 px-5 md:px-12 pb-[calc(84px+env(safe-area-inset-bottom))] md:pb-32">
        <div className="mm-in-up w-full max-w-[480px] mx-auto md:mx-0">

          {/* Title */}
          <div className="flex justify-between items-start">
            <h1 className="text-[28px] md:text-3xl font-semibold tracking-tight leading-none">
              {product.name}
            </h1>
          </div>

          {/* Description */}
          <p className="text-[#666] text-sm md:text-base leading-relaxed mb-6 mt-3 font-normal">
            {product.description || 'Sin descripción disponible.'}
          </p>

          {/* Customization banner (e.g. Bordado personalizado disponible) */}
          {product.customization_options && product.customization_options.length > 0 && (
            <div className="mb-7">
              <CustomizationLabel options={product.customization_options} />
            </div>
          )}

          {/* Included Products List */}
          {product.is_set && (
            <div className="mb-7">
              <h3 className="text-[15px] font-semibold text-[#1a1a1a] mb-4">
                Incluye {product.included_products?.length || 0} productos
              </h3>
              <div className="flex flex-col gap-3">
                {includedProductsData.map((item) => (
                  <div key={item.id} className="flex items-center justify-between p-3 md:p-4 bg-white border border-[#ece9e2] rounded-2xl shadow-sm hover:shadow-md transition-shadow group gap-3">
                    <div className="flex items-center gap-3 md:gap-4 flex-1 min-w-0">
                      <div className="relative w-16 h-16 md:w-20 md:h-20 rounded-xl bg-[#f8f8f6] overflow-hidden flex-shrink-0">
                        {item.image_url ? (
                          <Image src={item.image_url} alt={item.name} fill sizes="80px" className="object-cover" />
                        ) : (
                          <span className="material-symbols-outlined text-[20px] text-[#aaa] w-full h-full flex items-center justify-center">image</span>
                        )}
                      </div>
                      <div className="flex flex-col flex-1 min-w-0 pr-1">
                        <span className="font-semibold text-[#1a1a1a] text-sm md:text-base leading-tight truncate">{item.name}</span>
                        {item.color_name && <span className="text-xs text-[#888] mt-1 truncate">{item.color_name}</span>}
                      </div>
                    </div>
                    <Link
                      href={`/product?id=${item.id}`}
                      className="px-4 py-2.5 bg-[#1a1a1a] text-white rounded-xl text-xs font-semibold hover:bg-[#333] transition-colors active:scale-95 flex-shrink-0"
                    >
                      Ver producto
                    </Link>
                  </div>
                ))}
                {product.included_products?.length && includedProductsData.length === 0 ? (
                  <p className="text-sm text-[#888] italic">Cargando productos incluidos...</p>
                ) : null}
              </div>
            </div>
          )}

          {/* Color */}
          {product.color_hex_codes && product.color_hex_codes.length > 0 && (
            <div className="mb-7">
              <span className="text-[11px] font-semibold text-[#aaa] uppercase tracking-widest block mb-3">
                {/* Fase 7 (1.6): muestra el color realmente seleccionado, no
                    siempre `product.color_name`. */}
                Color: <span className="font-normal normal-case text-[#888] tracking-normal">{selectedColor?.label}</span>
              </span>
              <div className="flex gap-3">
                {product.color_hex_codes.map((hex, i) => (
                  <button
                    key={i}
                    onClick={() => setSelectedColorIndex(i)}
                    aria-label={`Color ${hex.toUpperCase()}`}
                    aria-pressed={i === selectedColorIndex}
                    className={`w-11 h-11 rounded-full transition-all hover:scale-110 border border-[#e0e0e0] ${i === selectedColorIndex ? 'ring-2 ring-[#1a1a1a]/15 ring-offset-2 border-none' : ''
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
                  onClick={() => setIsSizeGuideModalOpen(true)}
                  className="text-xs text-[#888] hover:text-[#1a1a1a] underline underline-offset-2 font-medium transition-colors"
                >
                  Guía de tallas
                </button>
              </div>

              <div className="flex gap-2.5 flex-wrap">
                {product.sizes.map((s) => (
                  <button
                    key={s}
                    onClick={() => setSelectedSize(s)}
                    className={`min-w-[44px] px-3 py-2.5 md:py-3 rounded-xl text-sm font-semibold transition-all active:scale-95 ${s === selectedSize
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

        </div>

        {/* CTA footer (Fase 32).
            `p-4 pb-safe` tenía un conflicto: `.pb-safe` define
            `padding-bottom: env(safe-area-inset-bottom)`, que en Android/PC es
            0, y ANULABA el padding de `p-4`. El botón quedaba pegado al borde.
            Ahora usa `px-4 pt-4 pb-safe-add` (16px + zona segura), así hay
            separación real en todos los dispositivos. */}
        <footer className="fixed bottom-0 left-0 w-full bg-white/90 backdrop-blur-xl border-t border-black/5 px-4 pt-4 pb-safe-add z-20 md:relative md:w-auto md:bg-transparent md:backdrop-blur-none md:border-none md:p-0 md:pt-2 md:mt-auto max-w-[480px] md:mx-0">
          <div className="flex items-center gap-2">
            {/* Consultar por WhatsApp */}
            {whatsappUrl ? (
              <a
                href={whatsappUrl}
                target="_blank"
                rel="noreferrer"
                className="flex flex-1 min-w-0 items-center justify-center bg-[#25D366] text-white py-3.5 md:py-4 rounded-2xl font-semibold text-base hover:bg-[#1ebe5d] transition-all active:scale-[0.98] gap-2.5 shadow-[0_4px_20px_rgba(37,211,102,0.35)]"
              >
                <svg className="w-5 h-5 fill-current flex-shrink-0" viewBox="0 0 16 16" xmlns="http://www.w3.org/2000/svg">
                  <path d="M13.601 2.326A7.85 7.85 0 0 0 7.994 0C3.627 0 .068 3.558.064 7.926c0 1.399.366 2.76 1.057 3.965L0 16l4.204-1.102a7.9 7.9 0 0 0 3.79.965h.004c4.368 0 7.926-3.558 7.93-7.93A7.9 7.9 0 0 0 13.6 2.326zM7.994 14.521a6.6 6.6 0 0 1-3.356-.92l-.24-.144-2.494.654.666-2.433-.156-.251a6.56 6.56 0 0 1-1.007-3.505c0-3.626 2.957-6.584 6.591-6.584a6.56 6.56 0 0 1 4.66 1.931 6.56 6.56 0 0 1 1.928 4.66c-.004 3.639-2.961 6.592-6.592 6.592m3.615-4.934c-.197-.099-1.17-.578-1.353-.646-.182-.065-.315-.099-.445.099-.133.197-.513.646-.627.775-.114.133-.232.148-.43.05-.197-.1-.836-.308-1.592-.985-.59-.525-.985-1.175-1.103-1.372-.114-.198-.011-.304.088-.403.087-.088.197-.232.296-.346.1-.114.133-.198.198-.33.065-.134.034-.248-.015-.347-.05-.099-.445-1.076-.612-1.47-.16-.389-.323-.335-.445-.34-.114-.007-.247-.007-.38-.007a.73.73 0 0 0-.529.247c-.182.198-.691.677-.691 1.654s.71 1.916.81 2.049c.098.133 1.394 2.132 3.383 2.992.47.205.84.326 1.129.418.475.152.904.129 1.246.08.38-.058 1.171-.48 1.338-.943.164-.464.164-.86.114-.943-.049-.084-.182-.133-.38-.232" />
                </svg>
                <span className="truncate">{product.action_text || 'Consultar'}</span>
              </a>
            ) : (
              <span className="flex flex-1 min-w-0 items-center justify-center bg-[#e0e0e0] text-[#6b6b6b] py-3.5 md:py-4 rounded-2xl font-semibold text-base cursor-not-allowed truncate">
                {product.action_text || 'Consultar'}
              </span>
            )}

            {/* Añadir a la lista de consulta.
                Mismo interruptor que en el modal: verde con check si ya está. */}
            <button
              type="button"
              onClick={toggleInquiry}
              aria-label={inInquiry ? 'Quitar de mi lista de consulta' : 'Añadir a mi lista de consulta'}
              aria-pressed={inInquiry}
              title={inInquiry ? 'Ya está en tu lista' : 'Añadir a mi lista'}
              className={`flex size-[52px] shrink-0 items-center justify-center rounded-2xl transition-colors active:scale-95 ${inInquiry
                  ? 'bg-[#eef7ee] text-[#2e7d32]'
                  : 'bg-[#f2f2f0] text-[#1a1a1a] hover:bg-[#e8e8e4]'
                }`}
            >
              <span
                className="material-symbols-outlined text-[22px]"
                style={{ fontVariationSettings: inInquiry ? "'FILL' 1" : "'FILL' 0, 'wght' 300" }}
              >
                {inInquiry ? 'check_circle' : 'playlist_add'}
              </span>
            </button>
          </div>
        </footer>
      </div>

      {/* Size Guide Modal (Lightbox) — Fase 10: animación con CSS. */}
      {isSizeGuideModalOpen && (
        <div
          className="mm-in fixed inset-0 z-[100] bg-black/90 backdrop-blur-sm flex flex-col items-center justify-center p-4"
          onClick={() => setIsSizeGuideModalOpen(false)}
        >
          <div className="relative flex flex-col items-end max-w-full max-h-[90vh]">
            <button
              className="mb-3 w-10 h-10 flex items-center justify-center bg-white/10 hover:bg-white/20 rounded-full text-white transition-colors active:scale-90"
              onClick={() => setIsSizeGuideModalOpen(false)}
            >
              <span className="material-symbols-outlined text-[24px]">close</span>
            </button>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/medidas1.webp"
              srcSet="/medidas1.webp 1200w, /medidas1@2x.webp 1800w"
              sizes="(max-width: 768px) 100vw, 720px"
              alt="Guía de tallas completa de Mundo Medics"
              width={1200}
              height={737}
              loading="lazy"
              decoding="async"
              className="mm-in-pop max-w-full max-h-[calc(90vh-52px)] object-contain rounded-2xl bg-white p-2"
              onClick={(e) => e.stopPropagation()}
            />
          </div>
        </div>
      )}

      {/* Visor a pantalla completa con zoom (Fase 8) */}
      <ImageLightbox
        isOpen={isLightboxOpen}
        images={allImages}
        index={currentImageIndex}
        alt={product.name}
        onClose={() => setIsLightboxOpen(false)}
        onIndexChange={setCurrentImageIndex}
      />
    </div>
  );
}
