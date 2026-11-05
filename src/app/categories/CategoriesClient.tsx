'use client';

import React from 'react';
import Image from 'next/image';
import { m as motion } from 'motion/react';
import { useRouter } from 'next/navigation';
import type { CategoryCardData } from '@/types/product';
import TopAppBar from '@/components/navigation/TopAppBar';
import BottomNav from '@/components/navigation/BottomNav';
import { ClothingIcon } from '@/components/ui/ClothingIcon';

interface CategoriesClientProps {
  initialCategories: CategoryCardData[];
  whatsappNumber?: string;
}

export default function CategoriesClient({ initialCategories, whatsappNumber }: CategoriesClientProps) {
  const router = useRouter();

  return (
    <div className="bg-[#f8f8f6] text-[#1a1a1a] pb-[80px] min-h-screen font-sans antialiased">
      <TopAppBar />

      <main className="pt-6 px-5 max-w-[1200px] mx-auto pb-8">
        <h1 className="text-[26px] font-semibold tracking-tight mb-6 text-[#1a1a1a]">Colecciones</h1>

        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 md:gap-6">
          {initialCategories.length === 0 ? (
            <div className="col-span-2 md:col-span-3 lg:col-span-4 text-center py-20 text-[#888]">
              No hay categor&iacute;as disponibles.
            </div>
          ) : (
            initialCategories.map((cat, i) => (
              <motion.button
                key={cat.id}
                initial={i < 10 ? { opacity: 0, y: 12 } : false}
                animate={i < 10 ? { opacity: 1, y: 0 } : undefined}
                transition={{ delay: Math.min(i, 8) * 0.025, duration: 0.22, ease: 'easeOut' }}
                whileTap={{ scale: 0.96 }}
                onClick={() => router.push(`/?category=${encodeURIComponent(cat.name)}`)}
                className="relative w-full aspect-[3/4] md:aspect-[4/5] rounded-[24px] overflow-hidden group border border-black/5 shadow-[0_4px_16px_rgba(0,0,0,0.02)]"
              >
                {cat.image_url ? (
                  <Image
                    src={cat.image_url}
                    alt={cat.name}
                    fill
                    sizes="(max-width: 768px) 50vw, (max-width: 1200px) 33vw, 25vw"
                    className="object-cover transition-transform duration-700 group-hover:scale-105 bg-white"
                  />
                ) : (
                  <div className="absolute inset-0 bg-[#e8e8e4] flex items-center justify-center transition-transform duration-700 group-hover:scale-105">
                    <ClothingIcon name={cat.name} icon={cat.icon || undefined} className="text-[#bbb] text-[50px]" />
                  </div>
                )}

                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent opacity-80 group-hover:opacity-90 transition-opacity" />

                <div className="absolute bottom-0 left-0 right-0 p-5 flex flex-col items-start text-left z-10">
                  <span className="font-semibold text-[18px] tracking-tight text-white drop-shadow-sm">{cat.name}</span>
                  <span className="text-[11px] font-medium text-white/80 mt-1 flex items-center gap-1 opacity-0 translate-y-2 group-hover:opacity-100 group-hover:translate-y-0 transition-all duration-300">
                    Explorar <span className="material-symbols-outlined text-[14px]">arrow_forward</span>
                  </span>
                </div>
              </motion.button>
            ))
          )}
        </div>
      </main>

      <BottomNav whatsappNumber={whatsappNumber} />
    </div>
  );
}
