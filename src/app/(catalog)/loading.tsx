/**
 * Fase 12 — Esqueleto de la portada durante la navegación.
 *
 * Vive dentro del grupo `(catalog)` a propósito: así sólo afecta a `/` y NO
 * envuelve a `/product` en Suspense. En la Fase 7 se descubrió que un
 * `loading.tsx` en la raíz de `app/` forzaba streaming en todas las rutas y
 * hacía que `/product` respondiera 200 en vez de 404.
 *
 * Mientras el servidor resuelve las consultas al cambiar de categoría, el
 * usuario ve esta estructura en lugar de una pantalla en blanco.
 */
export default function Loading() {
  return (
    <div className="bg-[#f8f8f6] dark:bg-zinc-950 min-h-screen pb-nav">
      {/* Barra superior */}
      <div className="sticky top-0 h-14 bg-[#f8f8f6]/95 dark:bg-zinc-950/95 border-b border-black/[0.06] dark:border-white/10" />

      <main className="pt-5 px-4 max-w-[1200px] mx-auto">
        {/* Chips de categoría */}
        <div className="flex gap-2 mb-6 overflow-hidden">
          {Array.from({ length: 5 }).map((_, i) => (
            <div
              key={i}
              className="h-8 w-24 shrink-0 rounded-full bg-[#e8e8e4] dark:bg-zinc-800 skeleton-shimmer"
            />
          ))}
        </div>

        {/* Grilla de productos */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 md:gap-5">
          {Array.from({ length: 8 }).map((_, i) => (
            <article key={i} className="flex flex-col">
              <div className="w-full aspect-[3/4] bg-[#e8e8e4] dark:bg-zinc-800 rounded-[18px] mb-3 skeleton-shimmer" />
              <div className="h-4 w-3/4 bg-[#e8e8e4] dark:bg-zinc-800 rounded-md skeleton-shimmer mb-2" />
              <div className="h-3 w-1/2 bg-[#e8e8e4] dark:bg-zinc-800 rounded-md skeleton-shimmer" />
            </article>
          ))}
        </div>
      </main>
    </div>
  );
}
