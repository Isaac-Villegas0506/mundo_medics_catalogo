import { SkeletonTopBar, SkeletonBottomNav, SkeletonProductGrid } from '@/components/ui/Skeletons';

/**
 * Fase 13: esqueleto de /favorites.
 *
 * La página es Client Component (los favoritos viven en localStorage), así que
 * este esqueleto cubre el instante entre la navegación y el primer render.
 */
export default function Loading() {
  return (
    <div className="bg-[#f8f8f6] dark:bg-zinc-950 min-h-screen pb-nav">
      <SkeletonTopBar />

      <main className="pt-6 px-5 max-w-[1200px] mx-auto pb-8">
        {/* Título "Guardados" */}
        <div className="h-7 w-36 rounded-lg skeleton-shimmer mb-6" />

        <SkeletonProductGrid count={4} />
      </main>

      <SkeletonBottomNav />
    </div>
  );
}
