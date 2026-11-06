'use client';

import React, { useState, useEffect } from 'react';
import { AnimatePresence } from 'motion/react';
import ProductModal, { Product } from '@/components/modals/ProductModal';
import { supabase } from '@/utils/supabase/client';
import TopAppBar from '@/components/navigation/TopAppBar';
import BottomNav from '@/components/navigation/BottomNav';
import ProductCard from '@/components/ui/ProductCard';
import { CARD_FIELDS } from '@/utils/catalogConstants';

export default function FavoritesPage() {
  const [favorites, setFavorites] = useState<string[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);

  useEffect(() => {
    const loadFavs = () => {
      /* Fase 7 (11.4): si localStorage tiene basura (JSON inválido, un objeto en
         vez de un array, ids que no son strings), se descarta y se limpia en
         lugar de dejar la página en blanco para siempre. */
      let favs: string[] = [];
      try {
        const raw = localStorage.getItem('favorites');
        const parsed = raw ? JSON.parse(raw) : [];
        if (Array.isArray(parsed)) {
          favs = parsed.filter((id): id is string => typeof id === 'string');
          if (favs.length !== parsed.length) {
            localStorage.setItem('favorites', JSON.stringify(favs));
          }
        } else {
          localStorage.removeItem('favorites');
        }
      } catch {
        localStorage.removeItem('favorites');
      }
      setFavorites(favs);
      fetchFavoriteProducts(favs);
    };
    loadFavs();

    window.addEventListener('favoritesUpdated', loadFavs);
    return () => window.removeEventListener('favoritesUpdated', loadFavs);
  }, []);

  const fetchFavoriteProducts = async (favIds: string[]) => {
    if (favIds.length === 0) {
      setProducts([]);
      setLoadError(false);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setLoadError(false);
    // Solo los campos que muestra la tarjeta (Fase 4, 8.2).
    const { data, error } = await supabase
      .from('products')
      .select(CARD_FIELDS)
      .in('id', favIds)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error cargando favoritos:', error);
      setLoadError(true);
      setIsLoading(false);
      return;
    }

    /* Los productos borrados del catálogo dejan su id huérfano en localStorage.
       Se descartan para que no queden "fantasmas" ni un contador inflado. */
    const found = (data || []) as Product[];
    const foundIds = new Set(found.map((p) => p.id));
    if (foundIds.size !== favIds.length) {
      const cleaned = favIds.filter((id) => foundIds.has(id));
      setFavorites(cleaned);
      try {
        localStorage.setItem('favorites', JSON.stringify(cleaned));
      } catch {
        /* sin almacenamiento: se ignora */
      }
    }

    setProducts(found);
    setIsLoading(false);
  };

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
    
    // We intentionally do not call `fetchFavoriteProducts` here because 
    // we want to rely on the local `favorites` array to visually filter 
    // the list without making another network request.
  };

  const openProductModal = (product: Product) => {
    setSelectedProduct(product);
    setIsModalOpen(true);
    // La tarjeta trae campos básicos; se carga la ficha completa en el modal.
    (async () => {
      const { data } = await supabase.from('products').select('*').eq('id', product.id).single();
      if (data) setSelectedProduct(data as Product);
    })();
  };

  const displayProducts = products.filter(p => favorites.includes(p.id));

  return (
    <div className="bg-[#f8f8f6] text-[#1a1a1a] pb-nav min-h-screen font-sans antialiased">
      <TopAppBar />
      
      <main className="pt-6 px-5 max-w-[1200px] mx-auto pb-8">
        <h1 className="text-[26px] font-semibold tracking-tight mb-6 text-[#1a1a1a]">Guardados</h1>

        <section className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 md:gap-6">
          <AnimatePresence mode="popLayout">
            {isLoading ? (
              Array.from({ length: 4 }).map((_, i) => (
                <article key={`sk-${i}`} className="flex flex-col">
                  <div className="w-full aspect-[3/4] bg-[#e8e8e4] dark:bg-zinc-800 rounded-[20px] mb-3 skeleton-shimmer" />
                  <div className="h-4 w-3/4 bg-[#e8e8e4] dark:bg-zinc-800 rounded-md skeleton-shimmer mb-2" />
                  <div className="h-3 w-1/2 bg-[#e8e8e4] dark:bg-zinc-800 rounded-md skeleton-shimmer mb-3" />
                  <div className="h-8 w-24 bg-[#e8e8e4] dark:bg-zinc-800 rounded-xl skeleton-shimmer" />
                </article>
              ))
            ) : loadError ? (
              <div className="col-span-2 md:col-span-3 lg:col-span-4 text-center py-20 text-[#888]">
                <span className="material-symbols-outlined text-[40px] mb-3 block text-[#ddd] dark:text-zinc-700">
                  wifi_off
                </span>
                <p className="text-sm mb-4">No pudimos cargar tus guardados.</p>
                <button
                  onClick={() => fetchFavoriteProducts(favorites)}
                  className="px-5 py-2.5 bg-[#1a1a1a] text-white rounded-xl text-sm font-semibold"
                >
                  Reintentar
                </button>
              </div>
            ) : displayProducts.length === 0 ? (
              <div className="col-span-2 md:col-span-3 lg:col-span-4 text-center py-20 text-[#888]">
                Aún no has guardado ningún producto.
              </div>
            ) : (
              displayProducts.map((product, i) => (
                <ProductCard 
                  key={product.id}
                  product={product}
                  index={i}
                  isFavorite={favorites.includes(product.id)}
                  onToggleFavorite={toggleFavorite}
                  onClick={openProductModal}
                />
              ))
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
    </div>
  );
}
