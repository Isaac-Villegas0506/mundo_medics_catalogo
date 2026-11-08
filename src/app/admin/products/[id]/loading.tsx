import { Skeleton } from '@/components/ui/Skeletons';

/** Fase 13: esqueleto del formulario de producto (nuevo o edición). */
export default function Loading() {
  return (
    <main className="flex-1 p-4 md:p-8 w-full max-w-7xl mx-auto flex flex-col gap-6 pb-[100px] md:pb-8">
      {/* Cabecera */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <Skeleton className="h-6 w-48 rounded-lg mb-2" />
          <Skeleton className="h-3 w-20 rounded" />
        </div>
        <div className="flex gap-3">
          <Skeleton className="h-10 w-24 rounded-xl" />
          <Skeleton className="h-10 w-36 rounded-xl" />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Columna de datos */}
        <div className="md:col-span-2 flex flex-col gap-6">
          <div className="bg-white rounded-[24px] p-6 border border-black/5">
            <Skeleton className="h-5 w-32 rounded mb-5" />
            <Skeleton className="h-11 w-full rounded-xl mb-4" />
            <Skeleton className="h-11 w-full rounded-xl mb-4" />
            <Skeleton className="h-24 w-full rounded-xl" />
          </div>

          <div className="bg-white rounded-[24px] p-6 border border-black/5">
            <Skeleton className="h-5 w-40 rounded mb-5" />
            <div className="flex gap-3 flex-wrap">
              {Array.from({ length: 4 }).map((_, i) => (
                <Skeleton key={i} className="h-11 w-11 rounded-full" />
              ))}
            </div>
          </div>
        </div>

        {/* Columna lateral */}
        <div className="flex flex-col gap-6">
          <div className="bg-white rounded-[24px] p-6 border border-black/5">
            <Skeleton className="h-5 w-28 rounded mb-4" />
            <Skeleton className="h-11 w-full rounded-xl mb-3" />
            <Skeleton className="h-11 w-full rounded-xl" />
          </div>
          <div className="bg-white rounded-[24px] p-6 border border-black/5">
            <Skeleton className="h-5 w-24 rounded mb-4" />
            <div className="grid grid-cols-3 gap-2">
              {Array.from({ length: 6 }).map((_, i) => (
                <Skeleton key={i} className="aspect-square rounded-xl" />
              ))}
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
