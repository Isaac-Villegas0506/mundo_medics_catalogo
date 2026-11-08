import { Skeleton } from '@/components/ui/Skeletons';

/** Fase 13: esqueleto de los ajustes del panel. */
export default function Loading() {
  return (
    <main className="flex-1 p-4 md:p-8 w-full max-w-7xl mx-auto flex flex-col gap-6 pb-[100px] md:pb-8">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4">
        <div>
          <Skeleton className="h-8 w-52 rounded-lg mb-3" />
          <Skeleton className="h-4 w-72 rounded" />
        </div>
        <Skeleton className="h-11 w-40 rounded-xl" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="bg-white rounded-3xl p-6 border border-black/5">
            <Skeleton className="h-5 w-36 rounded mb-5" />
            <Skeleton className="h-11 w-full rounded-xl mb-3" />
            <Skeleton className="h-11 w-full rounded-xl mb-3" />
            <Skeleton className="h-11 w-full rounded-xl" />
          </div>
        ))}
      </div>
    </main>
  );
}
