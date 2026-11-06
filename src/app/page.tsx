import { Suspense } from 'react';
import type { Metadata } from 'next';
import CatalogClient from './CatalogClient';
import { createPublicClient, CARD_FIELDS, PAGE_SIZE } from '@/utils/supabase/publicServer';
import type { Product } from '@/components/modals/ProductModal';

export const metadata: Metadata = {
  title: 'Mundo Medics | Catálogo Digital de Indumentaria Médica',
  description:
    'Explora el catálogo de indumentaria médica de Mundo Medics: casacas, chaquetas, buzos y más. Consulta disponibilidad por WhatsApp.',
  alternates: { canonical: '/' },
};

// Fase 5 (9.2): la portada se regenera cada 60 s. Es contenido público y
// cambia poco, así que servimos HTML ya renderizado y revalidamos por tiempo.
export const revalidate = 60;

async function getInitialData(category?: string) {
  const supabase = createPublicClient();

  let productsQuery = supabase
    .from('products')
    .select(CARD_FIELDS, { count: 'exact' })
    .order('created_at', { ascending: false });

  if (category && category !== 'Todos') {
    productsQuery = productsQuery.eq('category', category);
  }

  // Las tres consultas van en paralelo (R1 de la Fase 3).
  const [catResult, settingsResult, prodResult] = await Promise.all([
    supabase.from('categories').select('id, name').order('order_index', { ascending: true }),
    supabase.from('settings').select('key, value'),
    productsQuery.range(0, PAGE_SIZE - 1),
  ]);

  const settings = (settingsResult.data || []).reduce<Record<string, string>>(
    (acc, curr: { key: string; value: string }) => ({ ...acc, [curr.key]: curr.value }),
    {}
  );

  return {
    categories: (catResult.data || []) as { id: string; name: string }[],
    settings,
    products: (prodResult.data || []) as unknown as Product[],
    totalCount: prodResult.count ?? 0,
    activeCategory: category && category !== 'Todos' ? category : 'Todos',
  };
}

export default async function CatalogPage({
  searchParams,
}: {
  searchParams: Promise<{ category?: string }>;
}) {
  const { category } = await searchParams;

  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-[#f8f8f6] flex items-center justify-center text-[#777] text-sm">
          Cargando catálogo…
        </div>
      }
    >
      <CatalogContent category={category} />
    </Suspense>
  );
}

async function CatalogContent({ category }: { category?: string }) {
  const initial = await getInitialData(category);
  return <CatalogClient initial={initial} />;
}
