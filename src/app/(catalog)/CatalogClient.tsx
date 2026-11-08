'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import dynamic from 'next/dynamic';
import type { Product } from '@/types/product';
import { getStoreSettings } from '@/utils/settingsCache';
import TopAppBar from '@/components/navigation/TopAppBar';
import BottomNav from '@/components/navigation/BottomNav';
import ProductCard from '@/components/ui/ProductCard';
import { CARD_FIELDS, PAGE_SIZE } from '@/utils/catalogConstants';
import { sanitizeSearchTerm } from '@/utils/searchTerm';

/**
 * Fase 9 (rendimiento): los modales se cargan BAJO DEMANDA.
 *
 * ProductModal tiene 17 usos de motion y su propio carrusel; LocationModal otros
 * 3. Antes viajaban en el bundle inicial de la portada aunque solo se abren al
 * pulsar una tarjeta o «Dirección». Con `dynamic` se descargan al abrirse.
 *
 * Medido con Lighthouse móvil: el chunk de framer-motion + react-dom era el
 * responsable de ~944 ms de Total Blocking Time.
 */
const ProductModal = dynamic(() => import('@/components/modals/ProductModal'), {
  ssr: false,
});

const LocationModal = dynamic(() => import('@/components/modals/LocationModal'), {
  ssr: false,
});

export interface CatalogInitialData {
  categories: { id: string; name: string }[];
  settings: Record<string, string>;
  products: Product[];
  totalCount: number;
  activeCategory: string;
}

/**
 * Fase 5 (9.1/9.2): esta parte es cliente porque necesita estado (búsqueda,
 * filtro, favoritos, modales). El CONTENIDO inicial llega ya renderizado del
 * servidor, así que no hay pantalla vacía ni esqueleto en la primera visita.
 */
export default function CatalogClient({ initial }: { initial: CatalogInitialData }) {
  const router = useRouter();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isLocationModalOpen, setIsLocationModalOpen] = useState(false);
  const [activeCategory, setActiveCategory] = useState(initial.activeCategory);
  const [categories] = useState<{ id: string; name: string }[]>(initial.categories);
  const [searchQuery, setSearchQuery] = useState('');

  const [products, setProducts] = useState<Product[]>(initial.products);
  const [totalCount, setTotalCount] = useState(initial.totalCount);
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [loadError, setLoadError] = useState(false);
  const [reloadKey, setReloadKey] = useState(0);

  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  /* Fase 13: mientras se carga la ficha completa, el modal muestra esqueletos
     en los bloques que aún no tienen datos, en vez de "Sin descripción" y luego
     cambiar de golpe. */
  const [isLoadingDetail, setIsLoadingDetail] = useState(false);
  const [favorites, setFavorites] = useState<string[]>([]);
  const [settings, setSettings] = useState<Record<string, string>>(initial.settings);

  /**
   * Fase 7 (11.2): el filtro de categoría queda reflejado en la URL para que se
   * pueda compartir y para que el botón «atrás» del navegador funcione.
   * `scroll: false` evita que la página salte arriba al cambiar de chip.
   */
  const changeCategory = (name: string) => {
    setActiveCategory(name);
    const params = new URLSearchParams(window.location.search);
    if (name === 'Todos') {
      params.delete('category');
    } else {
      params.set('category', name);
    }
    const qs = params.toString();
    router.replace(qs ? `/?${qs}` : '/', { scroll: false });
  };

  // Los favoritos viven en localStorage, así que solo existen en el cliente.
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

  // Refresca los ajustes públicos si el panel los cambia.
  useEffect(() => {
    const onSettingsUpdated = async () => {
      const fresh = await getStoreSettings(true);
      setSettings(fresh);
    };
    window.addEventListener('settingsUpdated', onSettingsUpdated);
    return () => window.removeEventListener('settingsUpdated', onSettingsUpdated);
  }, []);

  /**
   * Fase 6 (rendimiento): el cliente de Supabase se importa de forma dinámica.
   *
   * En la primera visita la portada NO necesita Supabase en el navegador: los
   * datos llegan renderizados del servidor. Importarlo arriba arrastraba
   * auth + realtime (~260 KB sin comprimir) al bundle inicial de una página
   * pública. Solo se descarga cuando el usuario filtra, busca o pide más.
   */
  const fetchProductsPage = useCallback(
    async (from: number) => {
      const { supabase } = await import('@/utils/supabase/client');
      let query = supabase
        .from('products')
        .select(CARD_FIELDS, { count: 'exact' })
        .order('created_at', { ascending: false });

      if (activeCategory !== 'Todos') {
        query = query.eq('category', activeCategory);
      }
      const q = sanitizeSearchTerm(searchQuery);
      if (q) {
        query = query.or(`name.ilike.%${q}%,category.ilike.%${q}%`);
      }
      return query.range(from, from + PAGE_SIZE - 1);
    },
    [activeCategory, searchQuery]
  );

  // Primera página. Se salta la carga inicial: esos datos ya vienen del servidor.
  const isFirstRun = React.useRef(true);
  useEffect(() => {
    if (isFirstRun.current) {
      isFirstRun.current = false;
      return;
    }
    let cancelled = false;
    (async () => {
      setIsLoading(true);
      setLoadError(false);
      
      const { data, count, error } = await fetchProductsPage(0);
      if (cancelled) return;
      if (error) {
        console.error('Error fetching products:', error);
        setLoadError(true);
      } else if (data) {
        setProducts(data as Product[]);
        if (typeof count === 'number') setTotalCount(count);
      }
      setIsLoading(false);
    })();
    return () => { cancelled = true; };
  }, [fetchProductsPage, reloadKey]);

  const hasMore = products.length < totalCount;

  const loadMore = async () => {
    setIsLoadingMore(true);
    const from = products.length;
    
    const { data, error } = await fetchProductsPage(from);
    if (!error && data) {
      setProducts(prev => [...prev, ...(data as Product[])]);
    } else if (error) {
      console.error('Error loading more products:', error);
    }
    setIsLoadingMore(false);
  };

  const openProductModal = (product: Product) => {
    setSelectedProduct(product);
    setIsModalOpen(true);
    setIsLoadingDetail(true);
    // La tarjeta trae solo los campos básicos; cargamos la ficha completa en paralelo.
    (async () => {
      try {
        const { supabase } = await import('@/utils/supabase/client');
        const { data } = await supabase.from('products').select('*').eq('id', product.id).single();
        if (data) setSelectedProduct(data as Product);
      } catch {
        /* Si falla, el modal se queda con los datos básicos de la tarjeta. */
      } finally {
        setIsLoadingDetail(false);
      }
    })();
  };

  return (
    <div className="bg-[#f8f8f6] dark:bg-zinc-950 text-[#1a1a1a] dark:text-zinc-100 pb-nav min-h-screen font-sans antialiased">
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

          {settings.show_instagram !== 'false' && (
            <a href={settings.instagram_url || 'https://instagram.com'} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1.5 px-3.5 py-1.5 bg-white dark:bg-zinc-800 border border-black/10 dark:border-white/10 rounded-full shadow-sm text-sm font-medium text-[#e1306c] dark:text-[#f472b6] hover:bg-[#f8f8f6] dark:hover:bg-zinc-700 transition-colors shrink-0">
              <svg className="w-4 h-4 fill-current" viewBox="0 0 24 24"><path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.052.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98C8.333 23.986 8.741 24 12 24c3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 100 12.324 6.162 6.162 0 000-12.324zM12 16a4 4 0 110-8 4 4 0 010 8zm6.406-11.845a1.44 1.44 0 100 2.881 1.44 1.44 0 000-2.881z" /></svg>
              Instagram
            </a>
          )}

          {settings.show_tiktok !== 'false' && (
            <a href={settings.tiktok_url || 'https://tiktok.com'} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1.5 px-3.5 py-1.5 bg-white dark:bg-zinc-800 border border-black/10 dark:border-white/10 rounded-full shadow-sm text-sm font-medium text-black dark:text-zinc-100 hover:bg-[#f8f8f6] dark:hover:bg-zinc-700 transition-colors shrink-0">
              <svg className="w-4 h-4 fill-current" viewBox="0 0 24 24"><path d="M12.525.02c1.31-.02 2.61-.01 3.91-.02.08 1.53.63 3.09 1.75 4.17 1.12 1.11 2.7 1.62 4.24 1.79v4.03c-1.44-.05-2.89-.35-4.2-.97-.57-.26-1.1-.59-1.62-.93-.01 2.92.01 5.84-.02 8.75-.08 1.4-.54 2.79-1.35 3.94-1.31 1.92-3.58 3.17-5.91 3.21-1.43.08-2.86-.31-4.08-1.03-2.02-1.19-3.44-3.37-3.65-5.71-.02-.5-.03-1-.01-1.49.18-1.9 1.12-3.72 2.58-4.96 1.66-1.44 3.98-2.13 6.15-1.72.02 1.48-.04 2.96-.04 4.44-.99-.32-2.15-.23-3.02.37-.63.41-1.11 1.04-1.36 1.75-.21.51-.15 1.07-.14 1.61.24 1.64 1.82 3.02 3.5 2.87 1.12-.01 2.19-.66 2.77-1.61.19-.33.4-.67.41-1.06.1-1.79.06-3.57.07-5.36.01-4.03-.01-8.05.02-12.07z" /></svg>
              TikTok
            </a>
          )}

          {settings.show_facebook !== 'false' && (
            <a href={settings.facebook_url || 'https://facebook.com'} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1.5 px-3.5 py-1.5 bg-white dark:bg-zinc-800 border border-black/10 dark:border-white/10 rounded-full shadow-sm text-sm font-medium text-[#1877f2] dark:text-[#60a5fa] hover:bg-[#f8f8f6] dark:hover:bg-zinc-700 transition-colors shrink-0">
              <svg className="w-4 h-4 fill-current" viewBox="0 0 24 24"><path d="M9 8h-3v4h3v12h5v-12h3.642l.358-4h-4v-1.667c0-.955.192-1.333 1.115-1.333h2.885v-5h-3.808c-3.596 0-5.192 1.583-5.192 4.615v3.385z" /></svg>
              Facebook
            </a>
          )}
        </section>

        {/* Category Chips */}
        <section className="mb-6 -mx-4 px-4 overflow-x-auto no-scrollbar">
          <div className="flex gap-2 w-max pb-1">
            <button
              onClick={() => changeCategory('Todos')}
              className={`px-4 py-1.5 rounded-full text-sm font-medium transition-colors duration-200 whitespace-nowrap
                ${activeCategory === 'Todos'
                  ? 'bg-[#1a1a1a] dark:bg-white text-white dark:text-zinc-900'
                  : 'bg-white dark:bg-zinc-800 border border-black/[0.10] dark:border-white/10 text-[#444] dark:text-zinc-300 hover:bg-[#f0f0ee] dark:hover:bg-zinc-700'
                }`}
            >
              Todos
            </button>
            {categories.map(cat => {
              const active = cat.name === activeCategory;
              return (
                <button
                  key={cat.id}
                  onClick={() => changeCategory(cat.name)}
                  className={`mm-tap px-4 py-1.5 rounded-full text-sm font-medium transition-colors duration-200 whitespace-nowrap
                    ${active
                      ? 'bg-[#1a1a1a] dark:bg-white text-white dark:text-zinc-900'
                      : 'bg-white dark:bg-zinc-800 border border-black/[0.10] dark:border-white/10 text-[#444] dark:text-zinc-300 hover:bg-[#f0f0ee] dark:hover:bg-zinc-700'
                    }`}
                >
                  {cat.name}
                </button>
              );
            })}
          </div>
        </section>

        {/* Search result label */}
        {searchQuery.trim().length > 0 && !isLoading && (
          <p className="text-sm text-[#777] mb-4">
            {totalCount === 0
              ? `Sin resultados para "${searchQuery}"`
              : `${totalCount} resultado${totalCount !== 1 ? 's' : ''} para "${searchQuery}"`}
          </p>
        )}

        {/* Product Grid
            Fase 10: sin framer-motion. Cada estado entra con `.mm-in` (fade de
            0.28 s, igual que antes). No hay animación de salida entre estados
            porque el contenido se sustituye en el mismo instante: el resultado
            visual es el mismo y se evita el coste de retener nodos. */}
        <section className="relative">
          {isLoading ? (
            <div className="mm-in grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 md:gap-5">
              {Array.from({ length: 6 }).map((_, i) => (
                <article key={`sk-${i}`} className="flex flex-col">
                  <div className="w-full aspect-[3/4] bg-[#e8e8e4] dark:bg-zinc-800 rounded-[18px] mb-3 skeleton-shimmer" />
                  <div className="h-4 w-3/4 bg-[#e8e8e4] dark:bg-zinc-800 rounded-md skeleton-shimmer mb-2" />
                  <div className="h-3 w-1/2 bg-[#e8e8e4] dark:bg-zinc-800 rounded-md skeleton-shimmer mb-3" />
                  <div className="h-7 w-20 bg-[#e8e8e4] dark:bg-zinc-800 rounded-lg skeleton-shimmer" />
                </article>
              ))}
            </div>
          ) : loadError ? (
            <div className="mm-in col-span-full text-center py-20 text-[#999] dark:text-zinc-500 w-full">
              <span className="material-symbols-outlined text-[40px] mb-3 block text-[#ddd] dark:text-zinc-700">wifi_off</span>
              <p className="text-sm mb-4">No pudimos cargar los productos.</p>
              <button
                onClick={() => setReloadKey(k => k + 1)}
                className="px-5 py-2.5 bg-[#1a1a1a] dark:bg-white text-white dark:text-zinc-900 rounded-xl text-sm font-semibold"
              >
                Reintentar
              </button>
            </div>
          ) : products.length === 0 ? (
            <div className="mm-in col-span-full text-center py-20 text-[#999] dark:text-zinc-500 w-full">
              <span className="material-symbols-outlined text-[40px] mb-3 block text-[#ddd] dark:text-zinc-700">search_off</span>
              <p className="text-sm">No se encontraron productos.</p>
            </div>
          ) : (
            /* Fase 6 (LCP): sin animación de entrada. La grilla arrancaba
               invisible y el navegador no registraba el LCP hasta terminar el
               fundido. Aquí se mantiene visible desde el primer frame. */
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 md:gap-5">
              {products.map((product, i) => (
                <ProductCard
                  key={product.id}
                  product={product}
                  index={i}
                  isFavorite={favorites.includes(product.id)}
                  onToggleFavorite={toggleFavorite}
                  onClick={openProductModal}
                />
              ))}
            </div>
          )}

          {/* Cargar más */}
          {hasMore && !isLoading && (
            <div className="flex justify-center mt-8 pb-2">
              <button
                onClick={loadMore}
                disabled={isLoadingMore}
                className="px-6 py-3 bg-[#1a1a1a] dark:bg-white text-white dark:text-zinc-900 rounded-2xl text-sm font-semibold disabled:opacity-60 hover:bg-[#333] dark:hover:bg-zinc-200 transition-colors active:scale-[0.98]"
              >
                {isLoadingMore ? 'Cargando…' : 'Ver más productos'}
              </button>
            </div>
          )}
        </section>
      </main>

      <BottomNav />

      <ProductModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        product={selectedProduct}
        isLoadingDetail={isLoadingDetail}
      />

      <LocationModal
        isOpen={isLocationModalOpen}
        onClose={() => setIsLocationModalOpen(false)}
        settings={settings}
      />
    </div>
  );
}
