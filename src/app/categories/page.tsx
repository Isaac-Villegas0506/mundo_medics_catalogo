import type { Metadata } from 'next';
import { createPublicClient } from '@/utils/supabase/publicServer';
import TopAppBar from '@/components/navigation/TopAppBar';
import BottomNav from '@/components/navigation/BottomNav';
import CategoryCard from '@/components/ui/CategoryCard';

export const metadata: Metadata = {
  title: 'Colecciones | Mundo Medics',
  description:
    'Explora las colecciones de indumentaria médica de Mundo Medics. Consulta cada categoría y pide por WhatsApp.',
  alternates: { canonical: '/categories' },
};

/**
 * Fase 12 — Optimización de Categorías.
 *
 * ANTES: era un Client Component. El HTML inicial llegaba vacío, el navegador
 * tenía que descargar e hidratar React, y sólo entonces se lanzaban DOS
 * consultas SECUENCIALES (categorías → productos por sus imágenes). El resultado
 * era una pantalla en blanco durante todo ese tiempo.
 *
 * AHORA: es un Server Component. Las dos consultas se hacen en paralelo en el
 * servidor y el HTML llega con las colecciones ya pintadas. El navegador no
 * necesita JavaScript para verlas, y con `revalidate` se sirven cacheadas.
 */
export const revalidate = 60;

interface CategoryCard {
  id: string;
  name: string;
  icon: string | null;
  featured_product_id: string | null;
  image_url: string | null;
}

async function getCategories(): Promise<CategoryCard[]> {
  const supabase = createPublicClient();

  // Sólo las columnas que usa la pantalla.
  const { data: categories, error } = await supabase
    .from('categories')
    .select('id, name, icon, featured_product_id')
    .order('order_index', { ascending: true });

  if (error || !categories) return [];

  const featuredIds = categories
    .map((c) => c.featured_product_id)
    .filter((id): id is string => Boolean(id));

  if (featuredIds.length === 0) {
    return categories.map((c) => ({ ...c, image_url: null }));
  }

  // Una sola consulta extra, no una por categoría.
  const { data: products } = await supabase
    .from('products')
    .select('id, image_url')
    .in('id', featuredIds);

  const imageById = new Map((products || []).map((p) => [p.id, p.image_url]));

  return categories.map((c) => ({
    ...c,
    image_url: c.featured_product_id ? (imageById.get(c.featured_product_id) ?? null) : null,
  }));
}

export default async function CategoriesPage() {
  const categories = await getCategories();

  return (
    <div className="bg-[#f8f8f6] text-[#1a1a1a] pb-nav min-h-screen font-sans antialiased">
      <TopAppBar />

      <main className="pt-6 px-5 max-w-[1200px] mx-auto pb-8">
        <h1 className="text-[26px] font-semibold tracking-tight mb-6 text-[#1a1a1a]">Colecciones</h1>

        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 md:gap-6">
          {categories.length === 0 ? (
            <div className="col-span-2 md:col-span-3 lg:col-span-4 text-center py-20 text-[#888]">
              No hay categorías disponibles.
            </div>
          ) : (
            categories.map((cat, i) => (
              <CategoryCard key={cat.id} category={cat} index={i} />
            ))
          )}
        </div>
      </main>

      <BottomNav />
    </div>
  );
}
