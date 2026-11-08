import { Skeleton } from '@/components/ui/Skeletons';

/**
 * Fase 13: esqueleto del inicio del panel.
 * Tres tarjetas de métricas + gráfico + panel lateral, igual que el real.
 */
export default function Loading() {
  return (
    <main className="flex-1 p-4 md:p-8 w-full max-w-7xl mx-auto flex flex-col gap-8 pb-[100px] md:pb-8">
      {/* Cabecera */}
      <div>
        <Skeleton className="h-8 md:h-10 w-64 rounded-lg mb-3" />
        <Skeleton className="h-4 w-80 rounded" />
      </div>

      {/* Métricas */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        {Array.from({ length: 3 }).map((_, i) => (
          <div
            key={i}
            className="bg-white rounded-3xl p-6 shadow-[0_2px_12px_rgba(0,0,0,0.03)] border border-black/5"
          >
            <Skeleton className="h-3 w-24 rounded mb-4" />
            <Skeleton className="h-9 w-16 rounded-lg" />
          </div>
        ))}
      </div>

      {/* Gráfico + panel */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        <div className="bg-white rounded-3xl p-6 border border-black/5 lg:col-span-1">
          <Skeleton className="h-5 w-48 rounded mb-6" />
          <div className="flex items-end gap-2 h-[180px]">
            {[70, 45, 90, 60, 35].map((h, i) => (
              <Skeleton key={i} className="flex-1 rounded-t-lg" style={{ height: `${h}%` }} />
            ))}
          </div>
        </div>

        <div className="bg-white rounded-3xl p-6 border border-black/5 lg:col-span-2">
          <Skeleton className="h-5 w-40 rounded mb-6" />
          <div className="flex flex-col gap-3">
            {Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="h-14 w-full rounded-2xl" />
            ))}
          </div>
        </div>
      </div>
    </main>
  );
}
