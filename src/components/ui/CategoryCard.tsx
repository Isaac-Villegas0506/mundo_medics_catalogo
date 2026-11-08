'use client';

import React, { useState, useEffect, useTransition } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { ClothingIcon } from '@/components/ui/ClothingIcon';

interface CategoryCardProps {
  category: {
    id: string;
    name: string;
    image_url: string | null;
  };
  /** Posición: las dos primeras imágenes se precargan (son el LCP). */
  index: number;
}

/**
 * Fase 12 — Tarjeta de categoría con feedback inmediato.
 *
 * Problema reportado: al pulsar una categoría «parece que no sucede nada»
 * porque la navegación tarda y la tarjeta no cambiaba de estado.
 *
 * Solución: el `onClick` marca la tarjeta como «cargando» AL INSTANTE (con
 * `useTransition` para que React no bloquee), así el usuario ve un indicador
 * en el mismo frame en que toca. La navegación se hace con `router.push`
 * (interna, sin recargar) y `Link` queda como respaldo accesible para
 * teclado y clic central.
 */
export default function CategoryCard({ category, index }: CategoryCardProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  /* Se guarda qué tarjeta se pulsó para no mostrar el indicador en todas. */
  const [loadingId, setLoadingId] = useState<string | null>(null);

  const isLoading = loadingId === category.id || (isPending && loadingId === category.id);

  const handleClick = (e: React.MouseEvent) => {
    // Clic con modificador (abrir en pestaña nueva) → dejar que el navegador actúe.
    if (e.metaKey || e.ctrlKey || e.shiftKey || e.button !== 0) return;

    e.preventDefault();
    // Feedback inmediato: se pinta antes de que empiece la navegación.
    setLoadingId(category.id);

    const href = `/?category=${encodeURIComponent(category.name)}`;
    startTransition(() => {
      router.push(href);
    });
  };

  /* Si la navegación falla o el usuario vuelve atrás, se limpia el estado. */
  useEffect(() => {
    if (!isPending && loadingId) {
      const t = setTimeout(() => setLoadingId(null), 2000);
      return () => clearTimeout(t);
    }
  }, [isPending, loadingId]);

  return (
    <Link
      href={`/?category=${encodeURIComponent(category.name)}`}
      prefetch
      onClick={handleClick}
      aria-busy={isLoading}
      className="relative w-full aspect-[3/4] md:aspect-[4/5] rounded-[24px] overflow-hidden group border border-black/5 shadow-[0_4px_16px_rgba(0,0,0,0.02)] transition-transform duration-200 active:scale-[0.97]"
    >
      {category.image_url ? (
        <Image
          src={category.image_url}
          alt={category.name}
          fill
          sizes="(max-width: 768px) 50vw, (max-width: 1200px) 33vw, 25vw"
          priority={index < 2}
          className="object-cover transition-transform duration-700 group-hover:scale-105 bg-white"
        />
      ) : (
        <div className="absolute inset-0 bg-[#e8e8e4] flex items-center justify-center transition-transform duration-700 group-hover:scale-105">
          <ClothingIcon name={category.name} className="w-[50px] h-[50px] text-[#bbb]" />
        </div>
      )}

      {/* Gradient Overlay */}
      <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent opacity-80 group-hover:opacity-90 transition-opacity" />

      {/* Category Name */}
      <div className="absolute bottom-0 left-0 right-0 p-5 flex flex-col items-start text-left z-10">
        <span className="font-semibold text-[18px] tracking-tight text-white drop-shadow-sm">
          {category.name}
        </span>
        <span className="text-[11px] font-medium text-white/80 mt-1 flex items-center gap-1 opacity-0 translate-y-2 group-hover:opacity-100 group-hover:translate-y-0 transition-all duration-300">
          Explorar <span className="material-symbols-outlined text-[14px]">arrow_forward</span>
        </span>
      </div>

      {/* Indicador de carga: cubre la tarjeta en cuanto se pulsa. */}
      {isLoading && (
        <div
          className="absolute inset-0 z-20 flex flex-col items-center justify-center gap-2 bg-black/45 backdrop-blur-[1px]"
          role="status"
          aria-live="polite"
        >
          <span
            className="h-7 w-7 rounded-full border-2 border-white/40 border-t-white animate-spin"
            aria-hidden="true"
          />
          <span className="text-[11px] font-medium text-white/90">Abriendo…</span>
        </div>
      )}
    </Link>
  );
}
