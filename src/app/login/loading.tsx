import { Skeleton } from '@/components/ui/Skeletons';

/** Fase 13: esqueleto del login (misma tarjeta, sin salto visual). */
export default function Loading() {
  return (
    <div className="min-h-screen bg-[#f8f8f6] flex flex-col items-center justify-center p-6">
      <div className="w-full max-w-[400px] bg-white rounded-[28px] p-8 md:p-10 shadow-[0_8px_30px_rgba(0,0,0,0.04)] border border-black/5">
        {/* Logo y marca */}
        <div className="flex flex-col items-center mb-6">
          <Skeleton className="h-12 w-12 rounded-2xl mb-3" />
          <Skeleton className="h-5 w-36 rounded" />
        </div>

        {/* Títulos */}
        <div className="flex flex-col items-center mb-8 gap-2">
          <Skeleton className="h-6 w-48 rounded" />
          <Skeleton className="h-4 w-56 rounded" />
        </div>

        {/* Campos */}
        <div className="space-y-5">
          <div>
            <Skeleton className="h-3 w-32 rounded mb-2" />
            <Skeleton className="h-[52px] w-full rounded-2xl" />
          </div>
          <div>
            <Skeleton className="h-3 w-24 rounded mb-2" />
            <Skeleton className="h-[52px] w-full rounded-2xl" />
          </div>
          <Skeleton className="h-[56px] w-full rounded-2xl mt-2" />
        </div>
      </div>
    </div>
  );
}
