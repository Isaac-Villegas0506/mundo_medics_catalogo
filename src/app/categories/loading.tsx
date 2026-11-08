/**
 * Fase 12: esqueleto instantáneo de /categories.
 *
 * Al ser un Server Component, Next muestra este esqueleto mientras el servidor
 * resuelve las consultas. El usuario ve estructura desde el primer instante en
 * lugar de una pantalla vacía.
 */
export default function Loading() {
  return (
    <div className="bg-[#f8f8f6] dark:bg-zinc-950 min-h-screen pb-nav">
      {/* Barra superior */}
      <div className="sticky top-0 h-14 bg-[#f8f8f6]/95 dark:bg-zinc-950/95 border-b border-black/[0.06] dark:border-white/10" />

      <main className="pt-6 px-5 max-w-[1200px] mx-auto pb-8">
        <div className="h-7 w-40 bg-[#e8e8e4] dark:bg-zinc-800 rounded-lg skeleton-shimmer mb-6" />

        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 md:gap-6">
          {Array.from({ length: 6 }).map((_, i) => (
            <div
              key={i}
              className="aspect-[3/4] md:aspect-[4/5] bg-[#e8e8e4] dark:bg-zinc-800 rounded-[24px] skeleton-shimmer"
            />
          ))}
        </div>
      </main>
    </div>
  );
}
