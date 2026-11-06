'use client';

import React, { useCallback, useEffect, useRef, useState } from 'react';
import Image from 'next/image';
import { motion, AnimatePresence } from 'motion/react';

interface ImageLightboxProps {
  isOpen: boolean;
  images: string[];
  index: number;
  alt: string;
  onClose: () => void;
  onIndexChange: (index: number) => void;
}

const MIN_SCALE = 1;
const MAX_SCALE = 4;

/**
 * Visor de imagen a pantalla completa con zoom (Fase 8 / petición del dueño).
 *
 * Se implementa con Pointer Events nativos, sin librerías de gestos:
 *   - Un toque/clic sobre la foto hace zoom en ese punto (y otro lo deshace).
 *   - Rueda del ratón: zoom progresivo.
 *   - Dos dedos: pellizcar para acercar/alejar.
 *   - Con zoom activo, arrastrar desplaza la imagen.
 *   - Sin zoom, deslizar cambia de foto (no interfiere con el arrastre).
 *   - Escape cierra.
 *
 * El desplazamiento se limita para que la imagen no se pierda fuera de pantalla.
 */
export default function ImageLightbox({
  isOpen,
  images,
  index,
  alt,
  onClose,
  onIndexChange,
}: ImageLightboxProps) {
  const [scale, setScale] = useState(1);
  const [offset, setOffset] = useState({ x: 0, y: 0 });

  const containerRef = useRef<HTMLDivElement>(null);
  const pointers = useRef(new Map<number, { x: number; y: number }>());
  const lastPinchDist = useRef(0);
  const panStart = useRef<{ x: number; y: number; ox: number; oy: number } | null>(null);
  const swipeStart = useRef<{ x: number; y: number } | null>(null);
  const lastTapAt = useRef(0);

  const hasMany = images.length > 1;
  const isZoomed = scale > 1.01;

  /* Al cambiar de imagen o al cerrar, se reinicia el zoom. */
  useEffect(() => {
    setScale(1);
    setOffset({ x: 0, y: 0 });
  }, [index, isOpen]);

  /* Bloquea el scroll del documento mientras el visor está abierto. */
  useEffect(() => {
    if (!isOpen) return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = previous;
    };
  }, [isOpen]);

  /* Escape cierra; flechas cambian de imagen. */
  useEffect(() => {
    if (!isOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
      if (e.key === 'ArrowRight' && hasMany) onIndexChange((index + 1) % images.length);
      if (e.key === 'ArrowLeft' && hasMany) onIndexChange((index - 1 + images.length) % images.length);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [isOpen, hasMany, index, images.length, onClose, onIndexChange]);

  /** Limita el desplazamiento para que la imagen no salga de la pantalla. */
  const clampOffset = useCallback(
    (x: number, y: number, nextScale: number) => {
      const el = containerRef.current;
      if (!el) return { x, y };
      // Margen disponible: cuánto se ha "agrandado" la imagen.
      const maxX = (el.clientWidth * (nextScale - 1)) / 2;
      const maxY = (el.clientHeight * (nextScale - 1)) / 2;
      return {
        x: Math.max(-maxX, Math.min(maxX, x)),
        y: Math.max(-maxY, Math.min(maxY, y)),
      };
    },
    []
  );

  /** Zoom centrado en un punto concreto de la pantalla. */
  const zoomAtPoint = useCallback(
    (clientX: number, clientY: number, targetScale: number) => {
      const el = containerRef.current;
      if (!el) return;
      const rect = el.getBoundingClientRect();
      const cx = rect.left + rect.width / 2;
      const cy = rect.top + rect.height / 2;
      const dx = clientX - cx;
      const dy = clientY - cy;

      if (targetScale <= 1) {
        setScale(1);
        setOffset({ x: 0, y: 0 });
        return;
      }

      // Al acercar, se desplaza para mantener bajo el dedo el punto tocado.
      const next = clampOffset(-dx * (targetScale - 1), -dy * (targetScale - 1), targetScale);
      setScale(targetScale);
      setOffset(next);
    },
    [clampOffset]
  );

  const onPointerDown = (e: React.PointerEvent) => {
    pointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
    (e.target as HTMLElement).setPointerCapture?.(e.pointerId);

    if (pointers.current.size === 2) {
      // Empieza el pellizco.
      const [a, b] = Array.from(pointers.current.values());
      lastPinchDist.current = Math.hypot(a.x - b.x, a.y - b.y);
      panStart.current = null;
      swipeStart.current = null;
    } else if (pointers.current.size === 1) {
      swipeStart.current = { x: e.clientX, y: e.clientY };
      if (isZoomed) {
        panStart.current = { x: e.clientX, y: e.clientY, ox: offset.x, oy: offset.y };
      }
    }
  };

  const onPointerMove = (e: React.PointerEvent) => {
    if (!pointers.current.has(e.pointerId)) return;
    pointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY });

    // Pellizco con dos dedos.
    if (pointers.current.size === 2) {
      const [a, b] = Array.from(pointers.current.values());
      const dist = Math.hypot(a.x - b.x, a.y - b.y);
      if (lastPinchDist.current > 0) {
        const ratio = dist / lastPinchDist.current;
        const nextScale = Math.max(MIN_SCALE, Math.min(MAX_SCALE, scale * ratio));
        if (nextScale <= 1.01) {
          setScale(1);
          setOffset({ x: 0, y: 0 });
        } else {
          const mid = { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 };
          zoomAtPoint(mid.x, mid.y, nextScale);
        }
      }
      lastPinchDist.current = dist;
      return;
    }

    // Arrastre con zoom activo.
    if (panStart.current && isZoomed) {
      const dx = e.clientX - panStart.current.x;
      const dy = e.clientY - panStart.current.y;
      const next = clampOffset(panStart.current.ox + dx, panStart.current.oy + dy, scale);
      setOffset(next);
    }
  };

  const onPointerUp = (e: React.PointerEvent) => {
    pointers.current.delete(e.pointerId);

    if (pointers.current.size < 2) lastPinchDist.current = 0;

    // Fin de arrastre.
    if (panStart.current) {
      panStart.current = null;
      return;
    }

    // Toque simple (no pellizco, no arrastre): alterna zoom / cambia de imagen.
    if (swipeStart.current) {
      const dx = e.clientX - swipeStart.current.x;
      const dy = e.clientY - swipeStart.current.y;
      const moved = Math.hypot(dx, dy);
      swipeStart.current = null;

      if (moved < 12) {
        // Doble toque para zoom
        const now = Date.now();
        if (now - lastTapAt.current < 300) {
          lastTapAt.current = 0;
          zoomAtPoint(e.clientX, e.clientY, isZoomed ? 1 : 2.5);
          return;
        }
        lastTapAt.current = now;
        return;
      }

      // Sin zoom: deslizar cambia de imagen.
      if (!isZoomed && Math.abs(dx) > 60 && Math.abs(dx) > Math.abs(dy) && hasMany) {
        if (dx < 0) onIndexChange((index + 1) % images.length);
        else onIndexChange((index - 1 + images.length) % images.length);
      }
    }
  };

  /* Rueda del ratón: zoom. Se registra manualmente para poder cancelar el scroll. */
  useEffect(() => {
    const el = containerRef.current;
    if (!el || !isOpen) return;

    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      const delta = e.deltaY > 0 ? -0.25 : 0.25;
      const target = Math.max(MIN_SCALE, Math.min(MAX_SCALE, scale + delta));
      zoomAtPoint(e.clientX, e.clientY, target);
    };

    el.addEventListener('wheel', onWheel, { passive: false });
    return () => el.removeEventListener('wheel', onWheel);
  }, [isOpen, scale, zoomAtPoint]);

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.18 }}
          className="fixed inset-0 z-[200] bg-black/95 flex items-center justify-center"
          role="dialog"
          aria-modal="true"
          aria-label={`Vista ampliada de ${alt}`}
          onClick={onClose}
        >
          {/* Controles superiores */}
          <div
            className="absolute top-0 left-0 right-0 z-20 flex items-center justify-between p-4 pt-safe"
            onClick={(e) => e.stopPropagation()}
          >
            <span className="rounded-full bg-white/15 px-3 py-1 text-xs font-medium text-white">
              {isZoomed ? `${scale.toFixed(1)}×` : 'Toca o pellizca para acercar'}
            </span>
            <button
              onClick={onClose}
              aria-label="Cerrar vista ampliada"
              className="flex h-11 w-11 items-center justify-center rounded-full bg-white/15 text-white transition-colors hover:bg-white/25 active:scale-90"
            >
              <span className="material-symbols-outlined text-[22px]">close</span>
            </button>
          </div>

          {/* Lienzo con la imagen */}
          <div
            ref={containerRef}
            className="relative h-full w-full touch-none select-none overflow-hidden"
            onClick={(e) => e.stopPropagation()}
            onPointerDown={onPointerDown}
            onPointerMove={onPointerMove}
            onPointerUp={onPointerUp}
            onPointerCancel={onPointerUp}
            onDoubleClick={(e) => {
              e.preventDefault();
              zoomAtPoint(e.clientX, e.clientY, isZoomed ? 1 : 2.5);
            }}
            style={{ cursor: isZoomed ? 'grab' : 'zoom-in' }}
          >
            <div
              className="absolute inset-0 flex items-center justify-center"
              style={{
                transform: `translate(${offset.x}px, ${offset.y}px) scale(${scale})`,
                transition: panStart.current ? 'none' : 'transform 0.18s ease-out',
                willChange: 'transform',
              }}
            >
              <Image
                src={images[index]}
                alt={alt}
                fill
                sizes="100vw"
                className="object-contain pointer-events-none"
                draggable={false}
                priority
              />
            </div>
          </div>

          {/* Navegación entre imágenes (sólo sin zoom y si hay varias) */}
          {hasMany && !isZoomed && (
            <>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onIndexChange((index - 1 + images.length) % images.length);
                }}
                aria-label="Imagen anterior"
                className="absolute left-3 top-1/2 z-20 flex h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full bg-white/15 text-white hover:bg-white/25 active:scale-90"
              >
                <span className="material-symbols-outlined text-[22px]">chevron_left</span>
              </button>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onIndexChange((index + 1) % images.length);
                }}
                aria-label="Imagen siguiente"
                className="absolute right-3 top-1/2 z-20 flex h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full bg-white/15 text-white hover:bg-white/25 active:scale-90"
              >
                <span className="material-symbols-outlined text-[22px]">chevron_right</span>
              </button>

              <div
                className="absolute bottom-6 left-0 right-0 z-20 flex justify-center gap-1.5 pb-safe"
                onClick={(e) => e.stopPropagation()}
              >
                {images.map((_, i) => (
                  <button
                    key={i}
                    onClick={() => onIndexChange(i)}
                    aria-label={`Imagen ${i + 1}`}
                    className={`h-1.5 rounded-full transition-all ${i === index ? 'w-5 bg-white' : 'w-1.5 bg-white/40'}`}
                  />
                ))}
              </div>
            </>
          )}
        </motion.div>
      )}
    </AnimatePresence>
  );
}
