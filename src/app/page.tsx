'use client';

import React, { useState, useEffect, Suspense } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { useSearchParams } from 'next/navigation';
import ProductModal, { Product } from '@/components/modals/ProductModal';
import LocationModal from '@/components/modals/LocationModal';
import { supabase } from '@/utils/supabase/client';
import TopAppBar from '@/components/navigation/TopAppBar';
import BottomNav from '@/components/navigation/BottomNav';
import ProductCard from '@/components/ui/ProductCard';

// Module-level cache to preserve data and scroll position across navigations
let globalProductsCache: Product[] | null = null;
let globalCategoriesCache: { id: string, name: string }[] | null = null;
let globalSettingsCache: Record<string, string> | null = null;

export default function CatalogPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-[#f8f8f6] flex items-center justify-center text-[#777] text-sm">Cargando catálogo…</div>}>
      <CatalogContent />
    </Suspense>
  );
}

function CatalogContent() {
  const searchParams = useSearchParams();
  const categoryParam = searchParams.get('category');

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isLocationModalOpen, setIsLocationModalOpen] = useState(false);
  const [activeCategory, setActiveCategory] = useState(categoryParam || 'Todos');
  const [categories, setCategories] = useState<{ id: string, name: string }[]>(globalCategoriesCache || []);
  const [isLoading, setIsLoading] = useState(!globalProductsCache);
  const [searchQuery, setSearchQuery] = useState('');

  const [products, setProducts] = useState<Product[]>(globalProductsCache || []);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [favorites, setFavorites] = useState<string[]>([]);
  const [settings, setSettings] = useState<Record<string, string>>(globalSettingsCache || {});
  const [isSettingsLoaded, setIsSettingsLoaded] = useState(!!globalSettingsCache);

  useEffect(() => {
    const loadFavs = () => {
      try {
        setFavorites(JSON.parse(localStorage.getItem('favorites') || '[]'));
      } catch (e) { }
    };
    loadFavs();
    window.addEventListener('favoritesUpdated', loadFavs);
    return () => window.removeEventListener('favoritesUpdated', loadFavs);
  }, []);

  const toggleFavorite = (e: React.MouseEvent, productId: string) => {
    e.stopPropagation();
    let newFavs = [];
    if (favorites.includes(productId)) {
      newFavs = favorites.filter(id => id !== productId);
    } else {
      newFavs = [...favorites, productId];
    }
    setFavorites(newFavs);
    localStorage.setItem('favorites', JSON.stringify(newFavs));
    window.dispatchEvent(new Event('favoritesUpdated'));
  };

  useEffect(() => {
    async function fetchData() {
      if (!globalProductsCache) {
        setIsLoading(true);
      }

      // R1: las tres consultas van en paralelo en lugar de una detrás de otra.
      const [catResult, prodResult, settingsResult] = await Promise.all([
        supabase
          .from('categories')
          .select('id, name')
          .order('order_index', { ascending: true }),
        supabase
          .from('products')
          .select('*')
          .order('created_at', { ascending: false }),
        supabase.from('settings').select('*'),
      ]);

      if (catResult.data) {
        setCategories(catResult.data);
        globalCategoriesCache = catResult.data;
      }

      if (!prodResult.error && prodResult.data) {
        setProducts(prodResult.data as Product[]);
        globalProductsCache = prodResult.data as Product[];
      } else {
        console.error('Error fetching products:', prodResult.error);
      }

      if (settingsResult.data) {
        const settingsMap = settingsResult.data.reduce((acc, curr: any) => ({ ...acc, [curr.key]: curr.value }), {});
        setSettings(settingsMap as Record<string, string>);
        globalSettingsCache = settingsMap as Record<string, string>;
      }
      setIsSettingsLoaded(true);
      setIsLoading(false);
    }

    fetchData();
  }, []);

  const openProductModal = (product: Product) => {
    setSelectedProduct(product);
    setIsModalOpen(true);
  };

  // Filtro combinado: categoría + búsqueda por nombre
  const filteredProducts = products
    .filter(p => activeCategory === 'Todos' || p.category === activeCategory)
    .filter(p => {
      if (!searchQuery.trim()) return true;
      const q = searchQuery.toLowerCase();
      return (
        p.name.toLowerCase().includes(q) ||
        (p.category && p.category.toLowerCase().includes(q)) ||
        (p.color_name && p.color_name.toLowerCase().includes(q))
      );
    });

  return (
    <div className="bg-[#f8f8f6] dark:bg-zinc-950 text-[#1a1a1a] dark:text-zinc-100 pb-[80px] min-h-screen font-sans antialiased">
      <TopAppBar onSearch={setSearchQuery} />

      <main className="pt-5 px-4 max-w-[1200px] mx-auto">

        {/* Social & Location Badges */}
        <section className="mb-5 flex justify-center gap-2.5 overflow-x-auto no-scrollbar pb-1">
          <button
            onClick={() => setIsLocationModalOpen(true)}
            className="flex items-center gap-1.5 px-3.5 py-1.5 bg-[#e8f1ff] dark:bg-[#1f4ed8]/20 border border-[#1f4ed8]/10 dark:border-transparent rounded-full shadow-sm text-sm font-semibold text-[#1f4ed8] dark:text-[#60a5fa] hover:bg-[#dbeafe] dark:hover:bg-[#1f4ed8]/30 transition-colors shrink-0"
          >
            <span className="material-symbols-outlined text-[16px]">location_on</span>
            Dirección
          </button>

          {isSettingsLoaded && settings.show_instagram !== 'false' && (
            <a href={settings.instagram_url || "https://instagram.com"} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1.5 px-3.5 py-1.5 bg-white dark:bg-zinc-800 border border-black/10 dark:border-white/10 rounded-full shadow-sm text-sm font-medium text-[#e1306c] dark:text-[#f472b6] hover:bg-[#f8f8f6] dark:hover:bg-zinc-700 transition-colors shrink-0">
              <svg className="w-4 h-4 fill-current" viewBox="0 0 24 24"><path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.052.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98C8.333 23.986 8.741 24 12 24c3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 100 12.324 6.162 6.162 0 000-12.324zM12 16a4 4 0 110-8 4 4 0 010 8zm6.406-11.845a1.44 1.44 0 100 2.881 1.44 1.44 0 000-2.881z" /></svg>
              Instagram
            </a>
          )}

          {isSettingsLoaded && settings.show_tiktok !== 'false' && (
            <a href={settings.tiktok_url || "https://tiktok.com"} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1.5 px-3.5 py-1.5 bg-white dark:bg-zinc-800 border border-black/10 dark:border-white/10 rounded-full shadow-sm text-sm font-medium text-black dark:text-zinc-100 hover:bg-[#f8f8f6] dark:hover:bg-zinc-700 transition-colors shrink-0">
              <svg className="w-4 h-4 fill-current" viewBox="0 0 24 24"><path d="M12.525.02c1.31-.02 2.61-.01 3.91-.02.08 1.53.63 3.09 1.75 4.17 1.12 1.11 2.7 1.62 4.24 1.79v4.03c-1.44-.05-2.89-.35-4.2-.97-.57-.26-1.1-.59-1.62-.93-.01 2.92.01 5.84-.02 8.75-.08 1.4-.54 2.79-1.35 3.94-1.31 1.92-3.58 3.17-5.91 3.21-1.43.08-2.86-.31-4.08-1.03-2.02-1.19-3.44-3.37-3.65-5.71-.02-.5-.03-1-.01-1.49.18-1.9 1.12-3.72 2.58-4.96 1.66-1.44 3.98-2.13 6.15-1.72.02 1.48-.04 2.96-.04 4.44-.99-.32-2.15-.23-3.02.37-.63.41-1.11 1.04-1.36 1.75-.21.51-.15 1.07-.14 1.61.24 1.64 1.82 3.02 3.5 2.87 1.12-.01 2.19-.66 2.77-1.61.19-.33.4-.67.41-1.06.1-1.79.06-3.57.07-5.36.01-4.03-.01-8.05.02-12.07z" /></svg>
              TikTok
            </a>
          )}

          {isSettingsLoaded && settings.show_facebook !== 'false' && (
            <a href={settings.facebook_url || "https://facebook.com"} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1.5 px-3.5 py-1.5 bg-white dark:bg-zinc-800 border border-black/10 dark:border-white/10 rounded-full shadow-sm text-sm font-medium text-[#1877f2] dark:text-[#60a5fa] hover:bg-[#f8f8f6] dark:hover:bg-zinc-700 transition-colors shrink-0">
              <svg className="w-4 h-4 fill-current" viewBox="0 0 24 24"><path d="M9 8h-3v4h3v12h5v-12h3.642l.358-4h-4v-1.667c0-.955.192-1.333 1.115-1.333h2.885v-5h-3.808c-3.596 0-5.192 1.583-5.192 4.615v3.385z" /></svg>
              Facebook
            </a>
          )}
        </section>

        {/* Category Chips */}
        <section className="mb-6 -mx-4 px-4 overflow-x-auto no-scrollbar">
          <div className="flex gap-2 w-max pb-1">
            <motion.button
              whileTap={{ scale: 0.93 }}
              onClick={() => setActiveCategory('Todos')}
              className={`px-4 py-1.5 rounded-full text-sm font-medium transition-colors duration-200 whitespace-nowrap
                ${activeCategory === 'Todos'
                  ? 'bg-[#1a1a1a] dark:bg-white text-white dark:text-zinc-900'
                  : 'bg-white dark:bg-zinc-800 border border-black/[0.10] dark:border-white/10 text-[#444] dark:text-zinc-300 hover:bg-[#f0f0ee] dark:hover:bg-zinc-700'
                }`}
            >
              Todos
            </motion.button>
            {categories.map(cat => {
              const active = cat.name === activeCategory;
              return (
                <motion.button
                  key={cat.id}
                  whileTap={{ scale: 0.93 }}
                  onClick={() => setActiveCategory(cat.name)}
                  className={`px-4 py-1.5 rounded-full text-sm font-medium transition-colors duration-200 whitespace-nowrap
                    ${active
                      ? 'bg-[#1a1a1a] dark:bg-white text-white dark:text-zinc-900'
                      : 'bg-white dark:bg-zinc-800 border border-black/[0.10] dark:border-white/10 text-[#444] dark:text-zinc-300 hover:bg-[#f0f0ee] dark:hover:bg-zinc-700'
                    }`}
                >
                  {cat.name}
                </motion.button>
              );
            })}
          </div>
        </section>

        {/* Search result label */}
        {searchQuery.trim().length > 0 && !isLoading && (
          <p className="text-sm text-[#777] mb-4">
            {filteredProducts.length === 0
              ? `Sin resultados para "${searchQuery}"`
              : `${filteredProducts.length} resultado${filteredProducts.length !== 1 ? 's' : ''} para "${searchQuery}"`}
          </p>
        )}

        {/* Product Grid */}
        <section className="relative">
          <AnimatePresence mode="wait">
            {isLoading ? (
              <motion.div
                key="loading"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.2 }}
                className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 md:gap-5"
              >
                {Array.from({ length: 6 }).map((_, i) => (
                  <article key={`sk-${i}`} className="flex flex-col">
                    <div className="w-full aspect-[3/4] bg-[#e8e8e4] dark:bg-zinc-800 rounded-[18px] mb-3 skeleton-shimmer" />
                    <div className="h-4 w-3/4 bg-[#e8e8e4] dark:bg-zinc-800 rounded-md skeleton-shimmer mb-2" />
                    <div className="h-3 w-1/2 bg-[#e8e8e4] dark:bg-zinc-800 rounded-md skeleton-shimmer mb-3" />
                    <div className="h-7 w-20 bg-[#e8e8e4] dark:bg-zinc-800 rounded-lg skeleton-shimmer" />
                  </article>
                ))}
              </motion.div>
            ) : filteredProducts.length === 0 ? (
              <motion.div
                key="empty"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.2 }}
                className="col-span-full text-center py-20 text-[#999] dark:text-zinc-500 w-full"
              >
                <span className="material-symbols-outlined text-[40px] mb-3 block text-[#ddd] dark:text-zinc-700">search_off</span>
                <p className="text-sm">No hay productos en esta categoría.</p>
              </motion.div>
            ) : (
              <motion.div
                key={activeCategory}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.3 }}
                className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 md:gap-5"
              >
                {filteredProducts.map((product, i) => (
                  <ProductCard
                    key={product.id}
                    product={product}
                    index={i}
                    isFavorite={favorites.includes(product.id)}
                    onToggleFavorite={toggleFavorite}
                    onClick={openProductModal}
                  />
                ))}
              </motion.div>
            )}
          </AnimatePresence>
        </section>
      </main>

      <BottomNav />

      <ProductModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        product={selectedProduct}
      />

      <LocationModal
        isOpen={isLocationModalOpen}
        onClose={() => setIsLocationModalOpen(false)}
        settings={settings}
      />
    </div>
  );
}
