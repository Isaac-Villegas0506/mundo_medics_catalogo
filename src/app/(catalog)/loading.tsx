import {
  SkeletonTopBar,
  SkeletonBottomNav,
  SkeletonChips,
  SkeletonProductGrid,
} from '@/components/ui/Skeletons';

/**
 * Fase 13: esqueleto de la portada (también al cambiar de categoría).
 *
 * Vive dentro del grupo `(catalog)` a propósito: así sólo afecta a `/` y NO
 * envuelve a `/product` en Suspense. Un `loading.tsx` en la raíz de `app/`
 * hacía que `/product` respondiera 200 en vez de 404 (descubierto en Fase 7).
 */
export default function Loading() {
  return (
    <div className="bg-[#f8f8f6] dark:bg-zinc-950 min-h-screen pb-nav">
      <SkeletonTopBar />

      <main className="pt-5 px-4 max-w-[1200px] mx-auto">
        {/* Chips de categoría */}
        <div className="mb-6">
          <SkeletonChips count={5} />
        </div>

        {/* Grilla de productos */}
        <SkeletonProductGrid count={8} />
      </main>

      <SkeletonBottomNav />
    </div>
  );
}
