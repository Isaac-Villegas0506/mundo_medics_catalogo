import { Skeleton, SkeletonAdminList } from '@/components/ui/Skeletons';

/** Fase 13: esqueleto de la gestión de categorías del panel. */
export default function Loading() {
  return (
    <main className="flex-1 p-4 md:p-8 w-full max-w-7xl mx-auto flex flex-col gap-6 pb-[100px] md:pb-8">
      <div>
        <Skeleton className="h-8 w-60 rounded-lg mb-3" />
        <Skeleton className="h-4 w-72 rounded" />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Formulario */}
        <div className="bg-white rounded-3xl p-6 border border-black/5">
          <Skeleton className="h-5 w-32 rounded mb-5" />
          <Skeleton className="h-11 w-full rounded-xl mb-4" />
          <Skeleton className="h-11 w-full rounded-xl mb-4" />
          <Skeleton className="h-11 w-full rounded-xl" />
        </div>

        {/* Lista */}
        <div className="md:col-span-2 bg-white rounded-3xl border border-black/5 overflow-hidden">
          <div className="p-4 md:p-5 border-b border-[#ece9e2] bg-[#fcfcfb]">
            <Skeleton className="h-3 w-36 rounded" />
          </div>
          <SkeletonAdminList count={5} />
        </div>
      </div>
    </main>
  );
}
