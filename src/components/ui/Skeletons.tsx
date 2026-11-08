import * as React from 'react';

/**
 * Fase 13 — Esqueletos de carga reutilizables.
 *
 * Todas las pantallas comparten la misma animación (`skeleton-shimmer`, definida
 * en globals.css) y ya respeta `prefers-reduced-motion`. Aquí se centralizan las
 * piezas para no repetir el mismo markup en cada `loading.tsx`.
 */

/** Bloque base. `className` controla tamaño y forma. */
export function Skeleton({
  className = '',
  style,
}: {
  className?: string;
  style?: React.CSSProperties;
}) {
  return <div className={`skeleton-shimmer ${className}`} style={style} aria-hidden="true" />;
}

/* ── Piezas de la estructura pública ──────────────────────────────────────── */

/** Barra superior de la tienda. */
export function SkeletonTopBar() {
  return (
    <div className="sticky top-0 z-10 h-14 bg-[#f8f8f6]/95 dark:bg-zinc-950/95 border-b border-black/[0.06] dark:border-white/10">
      <div className="flex h-full items-center justify-between px-4 max-w-[1200px] mx-auto">
        <Skeleton className="h-9 w-9 rounded-full" />
        <Skeleton className="h-4 w-28 rounded-md" />
        <Skeleton className="h-9 w-9 rounded-full" />
      </div>
    </div>
  );
}

/** Barra inferior de navegación (móvil). */
export function SkeletonBottomNav() {
  return (
    <div className="fixed bottom-0 left-0 right-0 z-10 h-16 md:hidden bg-white/95 dark:bg-zinc-950/95 border-t border-black/5">
      <div className="flex h-full items-center justify-around px-2">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="flex flex-col items-center gap-1.5">
            <Skeleton className="h-6 w-6 rounded-md" />
            <Skeleton className="h-2 w-10 rounded" />
          </div>
        ))}
      </div>
    </div>
  );
}

/** Tarjeta de producto (imagen 3:4 + nombre + color + tallas). */
export function SkeletonProductCard() {
  return (
    <article className="flex flex-col">
      <Skeleton className="w-full aspect-[3/4] rounded-[18px] mb-3" />
      <Skeleton className="h-4 w-3/4 rounded-md mb-2" />
      <Skeleton className="h-3 w-1/2 rounded-md mb-2" />
      <div className="flex gap-1.5">
        <Skeleton className="h-4 w-10 rounded" />
        <Skeleton className="h-4 w-10 rounded" />
      </div>
    </article>
  );
}

/** Grilla de tarjetas de producto. */
export function SkeletonProductGrid({ count = 8 }: { count?: number }) {
  return (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 md:gap-5">
      {Array.from({ length: count }).map((_, i) => (
        <SkeletonProductCard key={i} />
      ))}
    </div>
  );
}

/** Chips de categoría. */
export function SkeletonChips({ count = 5 }: { count?: number }) {
  return (
    <div className="flex gap-2 overflow-hidden">
      {Array.from({ length: count }).map((_, i) => (
        <Skeleton key={i} className="h-8 w-24 shrink-0 rounded-full" />
      ))}
    </div>
  );
}

/* ── Piezas del panel de administración ───────────────────────────────────── */

/** Fila de la tabla de productos del panel. */
export function SkeletonAdminRow() {
  return (
    <div className="grid grid-cols-1 md:grid-cols-[auto_3fr_1.5fr_1fr_1.5fr_1fr] gap-4 p-4 md:p-5 items-center border-b border-[#ece9e2] last:border-none">
      <Skeleton className="hidden md:block h-5 w-5 rounded" />
      <div className="flex items-center gap-4">
        <Skeleton className="h-12 w-12 rounded-xl shrink-0" />
        <div className="flex-1">
          <Skeleton className="h-3.5 w-2/3 rounded mb-2" />
          <Skeleton className="h-2.5 w-1/3 rounded" />
        </div>
      </div>
      <Skeleton className="hidden md:block h-6 w-20 rounded-lg" />
      <Skeleton className="hidden md:block h-4 w-16 rounded" />
      <Skeleton className="hidden md:block h-6 w-24 rounded-lg" />
      <div className="hidden md:flex gap-2 justify-end">
        <Skeleton className="h-8 w-8 rounded-full" />
        <Skeleton className="h-8 w-8 rounded-full" />
        <Skeleton className="h-8 w-8 rounded-full" />
      </div>
    </div>
  );
}

/** Lista de filas del panel. */
export function SkeletonAdminList({ count = 6 }: { count?: number }) {
  return (
    <div className="flex flex-col">
      {Array.from({ length: count }).map((_, i) => (
        <SkeletonAdminRow key={i} />
      ))}
    </div>
  );
}

/** Tarjeta genérica del panel (para el inicio del dashboard). */
export function SkeletonAdminCard({ className = '' }: { className?: string }) {
  return <Skeleton className={`rounded-3xl ${className}`} />;
}

/* ── Piezas del detalle de producto ───────────────────────────────────────── */

/** Detalle: imagen grande a la izquierda y ficha a la derecha. */
export function SkeletonProductDetail() {
  return (
    <div className="min-h-[100dvh] bg-white flex flex-col md:flex-row">
      {/* Imagen */}
      <div className="w-full md:w-1/2 md:fixed md:top-0 md:bottom-0 md:left-0 relative aspect-[4/5] md:aspect-auto md:h-[100dvh]">
        <Skeleton className="absolute inset-0 rounded-none" />
      </div>

      {/* Ficha */}
      <div className="w-full md:w-1/2 md:ml-[50%] flex flex-col bg-white pt-5 md:pt-16 px-5 md:px-12 pb-nav md:pb-32">
        <div className="w-full max-w-[480px] mx-auto md:mx-0">
          <Skeleton className="h-8 w-3/4 rounded-lg mb-3" />
          <Skeleton className="h-4 w-full rounded mb-2" />
          <Skeleton className="h-4 w-5/6 rounded mb-6" />

          <Skeleton className="h-3 w-16 rounded mb-3" />
          <div className="flex gap-2.5 mb-6">
            <Skeleton className="h-11 w-11 rounded-full" />
            <Skeleton className="h-11 w-11 rounded-full" />
          </div>

          <Skeleton className="h-3 w-14 rounded mb-3" />
          <div className="flex gap-2 mb-8">
            <Skeleton className="h-10 w-11 rounded-xl" />
            <Skeleton className="h-10 w-11 rounded-xl" />
            <Skeleton className="h-10 w-11 rounded-xl" />
          </div>

          <Skeleton className="h-14 w-full rounded-2xl" />
        </div>
      </div>
    </div>
  );
}
