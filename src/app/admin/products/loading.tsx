import { Skeleton, SkeletonAdminList } from '@/components/ui/Skeletons';

/** Fase 13: esqueleto de la lista de productos del panel. */
export default function Loading() {
  return (
    <main className="flex-1 p-4 md:p-8 w-full max-w-7xl mx-auto flex flex-col gap-6 pb-[100px] md:pb-8">
      {/* Cabecera con botón */}
      <div className="flex justify-between items-end gap-4">
        <div>
          <Skeleton className="h-8 w-56 rounded-lg mb-3" />
          <Skeleton className="h-4 w-72 rounded" />
        </div>
        <Skeleton className="h-11 w-36 rounded-xl" />
      </div>

      {/* Tabla */}
      <div className="bg-white rounded-3xl border border-black/5 overflow-hidden">
        <div className="p-4 md:p-5 border-b border-[#ece9e2] bg-[#fcfcfb] flex justify-between items-center gap-4">
          <Skeleton className="h-3 w-40 rounded" />
          <Skeleton className="h-9 w-60 rounded-xl" />
        </div>
        <SkeletonAdminList count={6} />
      </div>
    </main>
  );
}
