'use client';

import React, { useCallback, useState, useEffect } from 'react';
import { AnimatePresence } from 'motion/react';
import dynamic from 'next/dynamic';
import type { Product } from '@/types/product';
import TopAppBar from '@/components/navigation/TopAppBar';
import BottomNav from '@/components/navigation/BottomNav';
import ProductCard from '@/components/ui/ProductCard';

const ProductModal = dynamic(() => import('@/components/modals/ProductModal'), {
  ssr: false,
});

export default function FavoritesPage() {
  const [favorites, setFavorites] = useState<string[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);

  const fetchFavoriteProducts = useCallback(async (favIds: string[]) => {
    if (favIds.length === 0) {
      setProducts([]);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    const { supabase } = await import('@/utils/supabase/client');
    const { data, error } = await supabase
      .from('products')
      .select('*')
      .in('id', favIds)
      .order('created_at', { ascending: false });

    if (!error && data) {
      setProducts(data as Product[]);
    }
    setIsLoading(false);
  }, []);

  useEffect(() => {
    const loadFavs = () => {
      try {
        const favs = JSON.parse(localStorage.getItem('favorites') || '[]');
        setFavorites(favs);
        fetchFavoriteProducts(favs);
      } catch {
        setIsLoading(false);
      }
    };
    loadFavs();
    
    window.addEventListener('favoritesUpdated', loadFavs);
    return () => window.removeEventListener('favoritesUpdated', loadFavs);
  }, [fetchFavoriteProducts]);

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
  };

  const displayProducts = products.filter(p => favorites.includes(p.id));

  return (
    <div className="bg-[#f8f8f6] text-[#1a1a1a] pb-[80px] min-h-screen font-sans antialiased">
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
