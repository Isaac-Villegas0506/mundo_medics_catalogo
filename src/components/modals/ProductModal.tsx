'use client';

import React, { useEffect, useRef } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import ProductBadges, { CustomizationLabel } from '@/components/ui/ProductBadges';
import ProductCard from '@/components/ui/ProductCard';
import { useWhatsappNumber } from '@/hooks/useWhatsappNumber';
import { CARD_FIELDS } from '@/utils/catalogConstants';
import { getSelectedColor } from '@/utils/productColor';
import { useSwipeGallery } from '@/hooks/useSwipeGallery';
import { buildWhatsappUrl } from '@/utils/whatsapp';
import { addToInquiry, getInquiryList } from '@/utils/inquiryList';
import ImageLightbox from '@/components/ui/ImageLightbox';
import { useDelayedUnmount } from '@/hooks/useDelayedUnmount';

// Fase 10: el tipo vive en @/types/product para que las tarjetas no arrastren
// este módulo (y framer-motion) al bundle inicial. Se re-exporta por compatibilidad.
export type { Product } from '@/types/product';
import type { Product } from '@/types/product';

interface ProductModalProps {
  isOpen: boolean;
  onClose: () => void;
  product: Product | null;
  /** Fase 13: la ficha completa aún se está cargando. */
  isLoadingDetail?: boolean;
}

export default function ProductModal({ isOpen, onClose, product, isLoadingDetail = false }: ProductModalProps) {
  /* Fase 10: `<AnimatePresence>` reemplazado por `useDelayedUnmount`.
     `closing` indica que debe reproducirse la animación de salida. */
  const { shouldRender, isLeaving } = useDelayedUnmount(!!isOpen && !!product, 280);

  if (!shouldRender || !product) return null;

  return <ModalContent onClose={onClose} product={product} closing={isLeaving} isLoadingDetail={isLoadingDetail} />;
}

function ModalContent({
  onClose,
  product,
  closing,
  isLoadingDetail,
}: {
  onClose: () => void;
  product: Product;
  closing: boolean;
  /** Fase 13: la ficha completa aún se está cargando. */
  isLoadingDetail: boolean;
}) {
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

  /* Fase 10: el parallax de la imagen (antes useScroll + useTransform de
     framer-motion) se calcula con el evento scroll nativo. Mismos valores:
     entre 0 y 300 px de desplazamiento la imagen pasa de escala 1 → 0.75,
     opacidad 1 → 0.2 y se desplaza 0 → 80 px. */
  const [parallax, setParallax] = React.useState({ scale: 1, opacity: 1, y: 0 });

  React.useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;

    let frame = 0;
    const onScroll = () => {
      // Se agrupa en un frame para no recalcular en cada píxel.
      if (frame) return;
      frame = requestAnimationFrame(() => {
        frame = 0;
        const t = Math.min(el.scrollTop / 300, 1); // 0 → 1
        setParallax({
          scale: 1 - t * 0.25,
          opacity: 1 - t * 0.8,
          y: t * 80,
        });
      });
    };

    el.addEventListener('scroll', onScroll, { passive: true });
    return () => {
      el.removeEventListener('scroll', onScroll);
      if (frame) cancelAnimationFrame(frame);
    };
  }, []);

  /* Fase 10/11/14: arrastre del panel desde el asa móvil, con Pointer Events.

     Correcciones aplicadas:
       - Fase 11: `dragY` se leía del closure en `onDragEnd`; ahora la distancia
         vive en el ref, que siempre tiene el valor real.
       - Fase 11: al soltar sin cerrar había un salto seco; `settling` activa la
         transición para que vuelva deslizándose.
       - Fase 14: la animación `.mm-in-sheet` usaba `both`, que retenía
         `transform` indefinidamente y ANULABA este arrastre. Ahora usa
         `backwards` (ver globals.css). Esa era la causa de que el gesto
         "no hiciera nada".
       - Fase 14: se escucha en `window` en vez de depender de
         `setPointerCapture`, que podía fallar y dejar el gesto a medias. */
  const [dragY, setDragY] = React.useState(0);
  const [settling, setSettling] = React.useState(false);
  const dragState = useRef<{ startY: number; startAt: number; lastDy: number } | null>(null);

  const onDragStart = (e: React.PointerEvent) => {
    // Sólo botón/dedo principal.
    if (e.button !== 0) return;
    dragState.current = { startY: e.clientY, startAt: Date.now(), lastDy: 0 };
    setSettling(false);
  };

  /* El movimiento se escucha en window: así el gesto no se corta si el dedo
     sale del asa o del propio panel. */
  React.useEffect(() => {
    const onMove = (e: PointerEvent) => {
      if (!dragState.current) return;
      const dy = Math.max(0, e.clientY - dragState.current.startY);
      dragState.current.lastDy = dy;
      setDragY(dy);
    };

    const onUp = () => {
      const state = dragState.current;
      if (!state) return;
      dragState.current = null;

      const elapsed = Math.max(Date.now() - state.startAt, 1);
      const distance = state.lastDy;
      const velocity = distance / elapsed; // px/ms

      // Umbral más permisivo que antes (era 100 px): en pantallas pequeñas
      // 80 px ya es un gesto claro.
      if (distance > 80 || velocity > 0.35) {
        /* Fase 15: se CONSERVA `dragY` (no se resetea). La animación de salida
           arranca desde `var(--mm-drag-y)`, es decir desde donde está el panel.
           Antes empezaba en 0 y el modal saltaba de vuelta arriba, mostrándose
           entero otra vez durante un instante: ese era el parpadeo reportado. */
        setSettling(false);
        onClose();
        return;
      }

      // No llegó al umbral: vuelve a su sitio deslizándose.
      setSettling(true);
      setDragY(0);
    };

    window.addEventListener('pointermove', onMove, { passive: true });
    window.addEventListener('pointerup', onUp);
    window.addEventListener('pointercancel', onUp);

    return () => {
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerup', onUp);
      window.removeEventListener('pointercancel', onUp);
    };
  }, [onClose]);

  /* Seguridad: si el modal se reutiliza para otro producto, el desplazamiento
     vuelve a cero. */
  React.useEffect(() => {
    setDragY(0);
    setSettling(false);
  }, [product.id]);

  // Interactive states
  const [selectedSize, setSelectedSize] = React.useState<string | null>(product.sizes?.[0] || null);
  const [selectedColorIndex, setSelectedColorIndex] = React.useState<number>(0);
  /* Fase 7 (1.6): el color que se muestra y se envía por WhatsApp. */
  const selectedColor = getSelectedColor(product.color_hex_codes, product.color_name, selectedColorIndex);
  const [isFavorite, setIsFavorite] = React.useState(false);
  const [currentImageIndex, setCurrentImageIndex] = React.useState(0);
  const [showSizeGuide, setShowSizeGuide] = React.useState(false);
  const [isSizeGuideModalOpen, setIsSizeGuideModalOpen] = React.useState(false);
  /* Fase 8: visor a pantalla completa con zoom. */
  const [isLightboxOpen, setIsLightboxOpen] = React.useState(false);

  // Combine main image and gallery
  const allImages = React.useMemo(() => {
    const images = [];
    if (product.image_url) images.push(product.image_url);
    if (product.gallery && Array.isArray(product.gallery)) {
      images.push(...product.gallery.filter(img => img !== product.image_url));
    }
    return images;
  }, [product.image_url, product.gallery]);

  /* Fase 19: imagen del color seleccionado.
     Si el producto tiene una foto para ese color, se muestra DELANTE de la
     galería, así al tocar un color la foto cambia al instante sin salir del
     carrusel ni perder las demás imágenes. */
  const colorImages = (product.color_images || {}) as Record<string, string>;
  const selectedHex = product.color_hex_codes?.[selectedColorIndex];
  const selectedColorImage = selectedHex ? colorImages[selectedHex] : undefined;

  const galleryWithColor = React.useMemo(() => {
    if (!selectedColorImage) return allImages;
    // Se evita duplicar si la foto del color ya estaba en la galería.
    const rest = allImages.filter((img) => img !== selectedColorImage);
    return [selectedColorImage, ...rest];
  }, [selectedColorImage, allImages]);

  /* Al cambiar de color, si ese color tiene foto propia, el carrusel salta a
     ella (posición 0). Si no tiene, se mantiene la imagen actual. */
  React.useEffect(() => {
    if (selectedColorImage) setCurrentImageIndex(0);
  }, [selectedColorImage, selectedColorIndex]);

  /* Fase 7 (1.4): deslizar el dedo para cambiar de imagen (sin librerías). */
  const goNextImage = React.useCallback(
    () => setCurrentImageIndex((prev) => (prev === galleryWithColor.length - 1 ? 0 : prev + 1)),
    [galleryWithColor.length]
  );
  const goPrevImage = React.useCallback(
    () => setCurrentImageIndex((prev) => (prev === 0 ? galleryWithColor.length - 1 : prev - 1)),
    [galleryWithColor.length]
  );
  const swipeHandlers = useSwipeGallery(goNextImage, goPrevImage, galleryWithColor.length > 1);

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

  /* Fase 22 — añadir a la lista de consulta (varios productos en un mensaje).
     Se guarda junto al color y la talla elegidos para no tener que preguntar. */
  const [inInquiry, setInInquiry] = React.useState(false);
  const [inquiryToast, setInquiryToast] = React.useState(false);

  React.useEffect(() => {
    setInInquiry(getInquiryList().some((x) => x.id === product.id));
  }, [product.id]);

  const addToInquiryList = () => {
    const existed = addToInquiry({
      id: product.id,
      name: product.name,
      color_name: selectedColor?.label || product.color_name,
      size: selectedSize || undefined,
      image_url: product.image_url,
    });
    setInInquiry(true);
    setInquiryToast(true);
    // El aviso desaparece solo; el botón queda marcado mientras esté en la lista.
    window.setTimeout(() => setInquiryToast(false), 2200);
    return existed;
  };

  return (
    <>
      {/* Backdrop */}
      <div
        className={`fixed inset-0 z-[60] bg-black/40 backdrop-blur-[2px] ${closing ? 'mm-out' : 'mm-in'}`}
        onClick={onClose}
      />

      {/* Modal Container
          Fase 10: la entrada/salida la hace CSS (mm-in-sheet / mm-out-sheet,
          antes el spring de framer-motion). El arrastre del asa se gestiona con
          Pointer Events y se refleja en `translateY(dragY)` con transición CSS. */}
      <div
        className={`fixed bottom-0 md:bottom-auto md:top-1/2 left-0 right-0 md:left-1/2 z-[70]
          bg-[#eeecea] dark:bg-zinc-900 md:bg-white md:dark:bg-zinc-900 rounded-t-[28px] md:rounded-[28px]
          max-h-[calc(100dvh-24px)] md:max-h-[calc(100dvh-96px)]
          h-[92dvh] md:h-[82dvh]
          w-full md:w-[840px]
          md:-translate-x-1/2 md:-translate-y-1/2
          shadow-[0_-6px_40px_rgba(0,0,0,0.08)] dark:shadow-[0_-6px_40px_rgba(0,0,0,0.4)] md:shadow-[0_20px_60px_rgba(0,0,0,0.12)] md:dark:shadow-[0_20px_60px_rgba(0,0,0,0.5)]
          flex flex-col overflow-hidden mm-draggable ${closing ? 'mm-out-sheet' : 'mm-in-sheet'}`}
        style={{
          /* El arrastre se aplica con la variable CSS `--mm-drag-y`, no con
             `transform` directo: así no se pisa el centrado de escritorio
             (`md:-translate-x-1/2 md:-translate-y-1/2`) y el panel sigue
             centrado aunque se arrastre.

             Mientras se arrastra no hay transición (sigue al dedo); al soltar
             sin cerrar, `settling` la activa para que vuelva deslizándose. */
          ['--mm-drag-y' as string]: `${dragY}px`,
          transition: settling ? 'transform 0.28s cubic-bezier(0.22, 1, 0.36, 1)' : 'none',
        }}
      >
        {/* Zona de arrastre (sólo móvil).
            ⚠️ BUG CORREGIDO (Fase 22): antes esta franja medía `h-14` (56 px),
            ocupaba todo el ancho y tenía `z-50`. Los botones de cerrar y
            favorito están en `top-4` (16 px) con el mismo `z-50`, y como esta
            franja va DESPUÉS en el DOM, se pintaba encima y se comía los
            toques. Por eso "no funcionaban" en el móvil.
            Ahora: menos alto (36 px, suficiente para el gesto), sólo el ancho
            de la barrita central, y por DEBAJO de los botones (z-40). */}
        <div
          className="absolute top-0 left-1/2 -translate-x-1/2 w-40 h-9 z-40 flex justify-center pt-3 md:hidden cursor-grab active:cursor-grabbing select-none"
          onPointerDown={onDragStart}
          role="button"
          tabIndex={-1}
          aria-label="Desliza hacia abajo para cerrar"
          style={{ touchAction: 'none' }}
        >
          <div className="w-10 h-1.5 bg-[#ccc]/80 shadow-sm rounded-full" />
        </div>

        {/* Desktop Close Button */}
        <button
          onClick={onClose}
          className="hidden md:flex absolute top-4 right-4 z-50 w-11 h-11 items-center justify-center bg-[#f2f2f0] hover:bg-[#e8e8e4] rounded-full text-[#555] transition-colors active:scale-90"
        >
          <span className="material-symbols-outlined text-[20px]" style={{ fontVariationSettings: "'wght' 300" }}>close</span>
        </button>

        {/* Scrollable Container — ocupa el espacio que deja el pie de acciones.
            Fase 7: antes el pie era `absolute` y flotaba sobre el contenido;
            por eso los botones tapaban el final de la ficha. Ahora el pie es un
            hermano real en el flujo flex y este bloque se encoge con `flex-1`. */}
        <div
          ref={scrollRef}
          className="w-full flex-1 min-h-0 overflow-y-auto md:overflow-hidden no-scrollbar flex flex-col md:flex-row"
        >
          {/* Left: Image */}
          <div className="w-full md:w-[45%] aspect-[4/5] md:aspect-auto md:h-full relative flex-shrink-0 md:px-5 md:py-5 md:pr-2.5 z-0">
            <div
              className="sticky top-0 w-full h-full bg-[#eeecea] md:rounded-[20px] overflow-hidden flex items-center justify-center relative touch-pan-y"
              {...swipeHandlers}
            >
              {galleryWithColor.length > 0 ? (
                <>
                  {/* Fase 10: el parallax ahora lo calcula el handler de scroll
                      nativo (estado `parallax`) en lugar de useTransform. */}
                  <button
                    type="button"
                    style={{
                      transform: `scale(${parallax.scale}) translateY(${parallax.y}px)`,
                      opacity: parallax.opacity,
                    }}
                    className="relative w-full h-full p-4 md:p-8 cursor-zoom-in"
                    onClick={() => setIsLightboxOpen(true)}
                    aria-label="Ver imagen ampliada"
                  >
                    <Image
                      alt={`${product.name} - Imagen ${currentImageIndex + 1}`}
                      className="object-contain transition-all duration-500 img-reveal pointer-events-none"
                      src={galleryWithColor[currentImageIndex]}
                      fill
                      sizes="(max-width: 768px) 100vw, 50vw"
                    />
                    {/* Indicador de que la foto se puede ampliar.
                        Posición elegida midiendo la zona de imagen del modal:
                        - Arriba-derecha: ocupado por cerrar y favorito (z-50).
                        - Abajo-derecha en móvil: tapado por el panel de contenido,
                          que se superpone 28px (mt-[-28px]).
                        - Abajo-centro: ocupado por los puntos del carrusel.
                        Queda abajo-IZQUIERDA, libre, por encima del solapamiento
                        (bottom-8 = 32px > 28px) en móvil. */}
                    <span className="absolute bottom-8 left-4 z-20 flex h-9 w-9 items-center justify-center rounded-full bg-white/85 text-[#1a1a1a] shadow-sm md:bottom-8 md:left-8">
                      <span className="material-symbols-outlined text-[18px]">zoom_in</span>
                    </span>
                  </button>

                  {/* Carousel Controls */}
                  {galleryWithColor.length > 1 && (
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
                      {/* Puntos del carrusel. En móvil van más arriba (bottom-10)
                          para no quedar bajo el panel de contenido, que se
                          superpone 28px sobre la imagen. */}
                      <div className="absolute bottom-10 left-0 right-0 z-10 flex justify-center gap-1.5 md:bottom-4">
                        {galleryWithColor.map((_, idx) => (
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

              {/* Action Buttons Container
                  Fase 22: z-[60] para quedar por encima de la franja de
                  arrastre (z-40) y tamaño táctil de 44 px, el mínimo
                  recomendado para el dedo. */}
              <div className="absolute top-3 right-3 md:top-3 md:right-3 flex gap-2 z-[60]">
                <button
                  type="button"
                  onPointerDown={(e) => e.stopPropagation()}
                  onClick={onClose}
                  aria-label="Cerrar"
                  className="w-11 h-11 flex md:hidden items-center justify-center bg-white/80 backdrop-blur-md rounded-full text-[#555] hover:bg-white active:scale-90 transition-all shadow-sm"
                >
                  <span className="material-symbols-outlined text-[22px]" style={{ fontVariationSettings: "'wght' 300" }}>close</span>
                </button>

                <button
                  type="button"
                  onPointerDown={(e) => e.stopPropagation()}
                  onClick={toggleFavorite}
                  aria-label={isFavorite ? 'Quitar de favoritos' : 'Guardar en favoritos'}
                  aria-pressed={isFavorite}
                  className="w-11 h-11 flex items-center justify-center bg-white/80 backdrop-blur-md rounded-full text-[#555] hover:text-[#e57373] hover:bg-white active:scale-90 transition-all shadow-sm"
                >
                  <span
                    className={`material-symbols-outlined text-[22px] ${isFavorite ? 'text-[#e57373]' : ''}`}
                    style={{ fontVariationSettings: isFavorite ? "'FILL' 1, 'wght' 300" : "'FILL' 0, 'wght' 300" }}

                  >
                    favorite
                  </span>
                </button>
              </div>
            </div>
          </div>

          {/* Right: Content */}
          <div
            className="w-full md:w-[55%] flex flex-col bg-white dark:bg-zinc-900 relative z-10 
              rounded-t-[28px] md:rounded-none mt-[-28px] md:mt-0 
              pt-7 md:pt-8 px-5 md:px-6 flex-shrink-0 
              md:overflow-y-auto md:flex-1 no-scrollbar min-h-0 mm-fade-in-delayed"
          >
            <div className="pb-6 md:pb-8">
              <h2 className="text-[22px] md:text-3xl font-semibold text-[#1a1a1a] dark:text-zinc-100 tracking-tight mb-2 md:mb-3 md:pr-10 leading-snug">
                {product.name}
              </h2>
              {/* Fase 13: mientras llega la ficha completa se muestra un
                  esqueleto, no el texto "Sin descripción" que luego cambiaría. */}
              {isLoadingDetail && !product.description ? (
                <div className="mb-5 space-y-2" aria-hidden="true">
                  <div className="skeleton-shimmer h-3.5 w-full rounded" />
                  <div className="skeleton-shimmer h-3.5 w-11/12 rounded" />
                  <div className="skeleton-shimmer h-3.5 w-2/3 rounded" />
                </div>
              ) : (
                <p className="text-[#666] dark:text-zinc-400 text-sm font-normal leading-relaxed mb-5">
                  {product.description || 'Sin descripción disponible.'}
                </p>
              )}

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
                    {product.color_hex_codes.map((hex, i) => {
                      /* Fase 19: se marca con un punto qué colores tienen foto
                         propia, para que el cliente sepa que al tocarlos la
                         imagen cambia. */
                      const hasOwnImage = Boolean(colorImages[hex]);
                      const isActive = i === selectedColorIndex;

                      return (
                        <button
                          key={i}
                          onClick={() => setSelectedColorIndex(i)}
                          aria-label={
                            hasOwnImage
                              ? `Color ${hex.toUpperCase()} (con foto propia)`
                              : `Color ${hex.toUpperCase()}`
                          }
                          aria-pressed={isActive}
                          className={`mm-tap relative w-11 h-11 rounded-full border transition-all ${isActive ? 'border-[#1a1a1a] dark:border-white ring-2 ring-[#1a1a1a]/20 dark:ring-white/20 ring-offset-1 dark:ring-offset-zinc-900' : 'border-[#e0e0e0] dark:border-zinc-700 hover:border-[#999] dark:hover:border-zinc-500'
                            }`}
                          style={{ background: hex }}
                        >
                          {hasOwnImage && (
                            <span
                              className="absolute bottom-0.5 right-0.5 flex h-3 w-3 items-center justify-center rounded-full bg-white shadow-sm"
                              aria-hidden="true"
                            >
                              <span className="material-symbols-outlined text-[9px] text-[#1a1a1a]">image</span>
                            </span>
                          )}
                        </button>
                      );
                    })}
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
                      <button
                        key={s}
                        onClick={() => setSelectedSize(s)}
                        className={`mm-tap w-11 h-10 rounded-xl text-sm font-semibold transition-all ${s === selectedSize
                            ? 'bg-[#1a1a1a] dark:bg-white text-white dark:text-zinc-900'
                            : 'bg-[#f2f2f0] dark:bg-zinc-800 text-[#555] dark:text-zinc-300 hover:bg-[#e8e8e4] dark:hover:bg-zinc-700'
                          }`}
                      >
                        {s}
                      </button>
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
          </div>
        </div>

        {/* Fase 22: añadir a la lista de consulta.
            Va encima del pie, a todo el ancho, porque es la acción nueva:
            permite juntar varios productos y preguntar por todos de una vez. */}
        <div className="shrink-0 w-full md:w-[55%] md:ml-auto px-4 md:px-6 pb-2 bg-white dark:bg-zinc-900 z-20">
          <button
            type="button"
            onClick={addToInquiryList}
            className={`flex w-full items-center justify-center gap-2 h-11 rounded-2xl text-[13px] font-semibold transition-colors active:scale-[0.98] ${
              inInquiry
                ? 'bg-[#eef7ee] text-[#2e7d32] dark:bg-zinc-800 dark:text-[#7bc47f]'
                : 'bg-[#f2f2f0] text-[#1a1a1a] dark:bg-zinc-800 dark:text-zinc-100 hover:bg-[#e8e8e4] dark:hover:bg-zinc-700'
            }`}
          >
            <span className="material-symbols-outlined text-[18px]" style={{ fontVariationSettings: inInquiry ? "'FILL' 1" : "'FILL' 0, 'wght' 300" }}>
              {inInquiry ? 'check_circle' : 'add_shopping_cart'}
            </span>
            {inInquiry ? 'Añadido a tu lista' : 'Añadir a mi lista de consulta'}
          </button>
        </div>

        {/* Pie de acciones — hermano real del área desplazable (no flotante).
            `shrink-0` impide que se comprima cuando el contenido es largo. */}
        <div className="shrink-0 w-full md:w-[55%] md:ml-auto px-4 md:px-6 pt-1 pb-modal-footer border-t border-[#f0f0ee] dark:border-zinc-800 bg-white dark:bg-zinc-900 flex gap-2.5 md:gap-3 z-20">
          <Link
            href={`/product?id=${product.id}`}
            /* `min-w-0` + `text-center` evitan que el texto largo desborde en
               móviles estrechos: se reparte en dos líneas en lugar de cortarse. */
            className="flex-1 min-w-0 flex items-center justify-center h-12 px-2 text-center leading-tight bg-[#f2f2f0] dark:bg-zinc-800 text-[#1a1a1a] dark:text-zinc-100 rounded-2xl text-[13px] md:text-sm font-semibold hover:bg-[#e8e8e4] dark:hover:bg-zinc-700 transition-colors active:scale-[0.97]"
          >
            Ver detalles completos
          </Link>
          {whatsappUrl ? (
            <a
              href={whatsappUrl}
              target="_blank"
              rel="noreferrer"
              className="flex-1 min-w-0 flex items-center justify-center h-12 px-2 bg-[#25D366] text-white rounded-2xl text-[13px] md:text-sm font-semibold hover:bg-[#1ebe5d] transition-colors active:scale-[0.97] gap-2"
            >
              <svg className="w-4 h-4 fill-current flex-shrink-0" viewBox="0 0 16 16" xmlns="http://www.w3.org/2000/svg">
                <path d="M13.601 2.326A7.85 7.85 0 0 0 7.994 0C3.627 0 .068 3.558.064 7.926c0 1.399.366 2.76 1.057 3.965L0 16l4.204-1.102a7.9 7.9 0 0 0 3.79.965h.004c4.368 0 7.926-3.558 7.93-7.93A7.9 7.9 0 0 0 13.6 2.326zM7.994 14.521a6.6 6.6 0 0 1-3.356-.92l-.24-.144-2.494.654.666-2.433-.156-.251a6.56 6.56 0 0 1-1.007-3.505c0-3.626 2.957-6.584 6.591-6.584a6.56 6.56 0 0 1 4.66 1.931 6.56 6.56 0 0 1 1.928 4.66c-.004 3.639-2.961 6.592-6.592 6.592m3.615-4.934c-.197-.099-1.17-.578-1.353-.646-.182-.065-.315-.099-.445.099-.133.197-.513.646-.627.775-.114.133-.232.148-.43.05-.197-.1-.836-.308-1.592-.985-.59-.525-.985-1.175-1.103-1.372-.114-.198-.011-.304.088-.403.087-.088.197-.232.296-.346.1-.114.133-.198.198-.33.065-.134.034-.248-.015-.347-.05-.099-.445-1.076-.612-1.47-.16-.389-.323-.335-.445-.34-.114-.007-.247-.007-.38-.007a.73.73 0 0 0-.529.247c-.182.198-.691.677-.691 1.654s.71 1.916.81 2.049c.098.133 1.394 2.132 3.383 2.992.47.205.84.326 1.129.418.475.152.904.129 1.246.08.38-.058 1.171-.48 1.338-.943.164-.464.164-.86.114-.943-.049-.084-.182-.133-.38-.232" />
              </svg>
              <span className="truncate">Consultar</span>
            </a>
          ) : (
            <span className="flex-1 min-w-0 flex items-center justify-center h-12 px-2 bg-[#e0e0e0] text-[#999] rounded-2xl text-[13px] md:text-sm font-semibold cursor-not-allowed">
              Consultar
            </span>
          )}
        </div>
      </div>

      {/* Visor a pantalla completa con zoom (Fase 8) */}
      <ImageLightbox
        isOpen={isLightboxOpen}
        images={galleryWithColor}
        index={currentImageIndex}
        alt={product.name}
        onClose={() => setIsLightboxOpen(false)}
        onIndexChange={setCurrentImageIndex}
      />

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
    </>
  );
}
