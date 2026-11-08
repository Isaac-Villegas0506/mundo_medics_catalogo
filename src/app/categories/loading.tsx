import { SkeletonTopBar, SkeletonBottomNav } from '@/components/ui/Skeletons';

/**
 * Fase 13: esqueleto de /categories (reutiliza las piezas comunes).
 */
export default function Loading() {
  return (
    <div className="bg-[#f8f8f6] dark:bg-zinc-950 min-h-screen pb-nav">
      <SkeletonTopBar />

      <main className="pt-6 px-5 max-w-[1200px] mx-auto pb-8">
        {/* Título "Colecciones" */}
        <div className="h-7 w-40 rounded-lg skeleton-shimmer mb-6" />

        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 md:gap-6">
          {Array.from({ length: 6 }).map((_, i) => (
            <div
              key={i}
              className="aspect-[3/4] md:aspect-[4/5] bg-[#e8e8e4] dark:bg-zinc-800 rounded-[24px] skeleton-shimmer"
            />
          ))}
        </div>
      </main>

      <SkeletonBottomNav />
    </div>
  );
}
