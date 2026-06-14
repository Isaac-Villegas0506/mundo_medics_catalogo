'use client';

import React, { useState, useEffect, Suspense } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { useSearchParams } from 'next/navigation';
import ProductModal, { Product } from '@/components/modals/ProductModal';
import { supabase } from '@/utils/supabase/client';
import TopAppBar from '@/components/navigation/TopAppBar';
import BottomNav from '@/components/navigation/BottomNav';
import ProductCard from '@/components/ui/ProductCard';

export default function CatalogPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-[#f8f8f6] flex items-center justify-center">Cargando catálogo...</div>}>
      <CatalogContent />
    </Suspense>
  );
}

function CatalogContent() {
  const searchParams = useSearchParams();
  const categoryParam = searchParams.get('category');

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [activeCategory, setActiveCategory] = useState(categoryParam || 'Todos');
  const [categories, setCategories] = useState<{ id: string, name: string }[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  
  const [products, setProducts] = useState<Product[]>([]);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [favorites, setFavorites] = useState<string[]>([]);

  useEffect(() => {
    const loadFavs = () => {
      try {
        setFavorites(JSON.parse(localStorage.getItem('favorites') || '[]'));
      } catch (e) {}
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
      setIsLoading(true);
      
      // Fetch categories
      const { data: catData } = await supabase
        .from('categories')
        .select('id, name')
        .order('order_index', { ascending: true });
        
      if (catData) {
        setCategories(catData);
      }
      
      // Fetch products
      const { data, error } = await supabase
        .from('products')
        .select('*')
        .order('created_at', { ascending: false });
        
      if (!error && data) {
        setProducts(data as Product[]);
      } else {
        console.error('Error fetching products:', error);
      }
      setIsLoading(false);
    }
    
    fetchData();
  }, []);

  const openProductModal = (product: Product) => {
    setSelectedProduct(product);
    setIsModalOpen(true);
  };

  const filteredProducts = activeCategory === 'Todos' 
    ? products 
    : products.filter(p => p.category === activeCategory);

  return (
    <div className="bg-[#f8f8f6] text-[#1a1a1a] pb-[80px] min-h-screen font-sans antialiased">
      <TopAppBar />

      <main className="pt-5 px-4 max-w-[1200px] mx-auto">
        {/* Category Chips */}
        <section className="mb-6 -mx-4 px-4 overflow-x-auto no-scrollbar">
          <div className="flex gap-2 w-max pb-1">
            {['Todos', ...categories.map(cat => cat.name)].map((catName) => {
              const active = catName === activeCategory;
              return (
                <motion.button
                  key={catName}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => setActiveCategory(catName)}
                  className={`relative px-4 py-1.5 rounded-full text-sm font-medium transition-colors duration-300 whitespace-nowrap outline-none
                    ${active ? 'text-white' : 'bg-white border border-black/10 text-[#555] hover:bg-[#f0f0ee]'}
                  `}
                  style={{ border: active ? '1px solid transparent' : undefined }}
                >
                  {active && (
                    <motion.div
                      layoutId="activeCategoryBg"
                      className="absolute inset-0 bg-[#1a1a1a] rounded-full"
                      initial={false}
                      transition={{ type: "spring", stiffness: 400, damping: 30 }}
                      style={{ zIndex: 0 }}
                    />
                  )}
                  <span className="relative z-10">{catName}</span>
                </motion.button>
              );
            })}
          </div>
        </section>

        {/* Product Grid */}
        <section className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 md:gap-6">
          <AnimatePresence mode="wait">
            {isLoading ? (
              /* Skeleton shimmer */
              Array.from({ length: 6 }).map((_, i) => (
                <motion.article
                  key={`sk-${i}`}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="flex flex-col"
                >
                  <div className="w-full aspect-[3/4] bg-[#e8e8e4] rounded-[20px] mb-3 skeleton-shimmer" />
                  <div className="h-4 w-3/4 bg-[#e8e8e4] rounded-md skeleton-shimmer mb-2" />
                  <div className="h-3 w-1/2 bg-[#e8e8e4] rounded-md skeleton-shimmer mb-3" />
                  <div className="h-8 w-24 bg-[#e8e8e4] rounded-xl skeleton-shimmer" />
                </motion.article>
              ))
            ) : filteredProducts.length === 0 ? (
              <div className="col-span-2 md:col-span-3 lg:col-span-4 text-center py-20 text-[#888]">
                No hay productos en esta categoría.
              </div>
            ) : (
              filteredProducts.map((product, i) => (
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

      {/* Product Preview Modal */}
      <ProductModal 
        isOpen={isModalOpen} 
        onClose={() => setIsModalOpen(false)} 
        product={selectedProduct} 
      />
    </div>
  );
}
