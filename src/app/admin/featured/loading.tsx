import { Skeleton } from '@/components/ui/Skeletons';

/** Fase 13: esqueleto de los productos destacados del panel. */
export default function Loading() {
  return (
    <main className="flex-1 p-4 md:p-8 w-full max-w-6xl self-start flex flex-col gap-6 pb-[100px] md:pb-8">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-5">
        <div>
          <Skeleton className="h-8 w-64 rounded-lg mb-3" />
          <Skeleton className="h-4 w-80 rounded" />
        </div>
        <Skeleton className="h-11 w-40 rounded-2xl" />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        {Array.from({ length: 2 }).map((_, col) => (
          <div key={col} className="bg-white rounded-3xl p-5 border border-black/5">
            <Skeleton className="h-5 w-40 rounded mb-4" />
            <div className="flex flex-col gap-2">
              {Array.from({ length: 4 }).map((_, i) => (
                <Skeleton key={i} className="h-[68px] w-full rounded-2xl" />
              ))}
            </div>
          </div>
        ))}
      </div>
    </main>
  );
}
