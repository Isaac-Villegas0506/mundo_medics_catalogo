import { Suspense } from 'react';
import CatalogClient from './CatalogClient';
import { getCatalogData } from '@/lib/catalog-data';

export const revalidate = 60;

export default async function CatalogPage() {
  const data = await getCatalogData();

  return (
    <Suspense fallback={<div className="min-h-screen bg-[#f8f8f6] flex items-center justify-center text-[#777] text-sm">Cargando cat&aacute;logo...</div>}>
      <CatalogClient
        initialProducts={data.products}
        initialCategories={data.categories}
        initialSettings={data.settings}
      />
    </Suspense>
  );
}
