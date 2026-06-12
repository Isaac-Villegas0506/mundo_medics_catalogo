'use client';

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import ProductModal, { Product } from '@/components/modals/ProductModal';
import { supabase } from '@/utils/supabase/client';

const CATEGORIES = ['Todos', 'Batas', 'Quirúrgicos', 'Psicología', 'Accesorios'];

export default function CatalogPage() {
  const [isSearchVisible, setIsSearchVisible] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [activeCategory, setActiveCategory] = useState('Todos');
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
    async function fetchProducts() {
      setIsLoading(true);
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
    
    fetchProducts();
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
      {/* Top App Bar */}
      <header className="sticky top-0 w-full z-50 bg-[#f8f8f6]/90 backdrop-blur-xl border-b border-black/5">
        <div className="flex items-center justify-between px-4 h-14 max-w-[1200px] mx-auto">
          {/* Menu */}
          <button className="w-10 h-10 flex items-center justify-center rounded-full hover:bg-black/5 transition-colors active:scale-95">
            <span className="material-symbols-outlined text-[24px] text-[#1a1a1a]" style={{ fontVariationSettings: "'wght' 300" }}>menu</span>
          </button>

          {/* Brand — plain black, no gradient */}
          <span className="text-[17px] font-semibold tracking-[-0.01em] text-[#1a1a1a] select-none">
            Mundo Medics
          </span>

          {/* Search Toggle */}
          <button
            className={`w-10 h-10 flex items-center justify-center rounded-full transition-all active:scale-95 ${isSearchVisible ? 'bg-black/8' : 'hover:bg-black/5'}`}
            onClick={() => setIsSearchVisible(v => !v)}
          >
            <motion.span
              animate={{ rotate: isSearchVisible ? 45 : 0 }}
              transition={{ type: 'spring', stiffness: 400, damping: 28 }}
              className="material-symbols-outlined text-[24px] text-[#1a1a1a] block"
              style={{ fontVariationSettings: "'wght' 300" }}
            >
              {isSearchVisible ? 'close' : 'search'}
            </motion.span>
          </button>
        </div>

        {/* Animated Search Bar */}
        <AnimatePresence>
          {isSearchVisible && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ type: 'spring', stiffness: 380, damping: 32 }}
              className="overflow-hidden"
            >
              <div className="px-4 pb-3 max-w-[1200px] mx-auto">
                <div className="flex items-center bg-white border border-black/8 rounded-2xl px-4 h-11 gap-2 shadow-[0_2px_12px_rgba(0,0,0,0.04)]">
                  <span className="material-symbols-outlined text-[18px] text-[#999]" style={{ fontVariationSettings: "'wght' 300" }}>search</span>
                  <input
                    autoFocus
                    className="flex-1 bg-transparent text-sm text-[#1a1a1a] placeholder:text-[#aaa] outline-none font-normal"
                    placeholder="Buscar productos…"
                    type="text"
                  />
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </header>

      <main className="pt-5 px-4 max-w-[1200px] mx-auto">
        {/* Category Chips */}
        <section className="mb-6 -mx-4 px-4 overflow-x-auto no-scrollbar">
          <div className="flex gap-2 w-max pb-1">
            {CATEGORIES.map(cat => {
              const active = cat === activeCategory;
              return (
                <motion.button
                  key={cat}
                  whileTap={{ scale: 0.93 }}
                  onClick={() => setActiveCategory(cat)}
                  className={`px-4 py-1.5 rounded-full text-sm font-medium transition-colors duration-200 whitespace-nowrap
                    ${active
                      ? 'bg-[#1a1a1a] text-white'
                      : 'bg-white border border-black/10 text-[#555] hover:bg-[#f0f0ee]'
                    }`}
                >
                  {cat}
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
                <motion.article
                  key={product.id}
                  initial={{ opacity: 0, y: 22 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ type: 'spring', stiffness: 320, damping: 30, delay: i * 0.07 }}
                  whileTap={{ scale: 0.97 }}
                  className="flex flex-col cursor-pointer group"
                  onClick={() => openProductModal(product)}
                >
                  {/* Image Card */}
                  <div className="relative w-full aspect-[3/4] bg-[#eeecea] rounded-[20px] overflow-hidden mb-3 transition-shadow duration-400 group-hover:shadow-[0_12px_32px_rgba(0,0,0,0.10)]">
                    {product.image_url ? (
                      <motion.img
                        alt={product.name}
                        className="object-cover w-full h-full"
                        src={product.image_url}
                        initial={{ scale: 1.04, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        transition={{ duration: 0.5, ease: [0.25, 0.46, 0.45, 0.94] }}
                        whileHover={{ scale: 1.04 }}
                      />
                    ) : (
                      <div className="absolute inset-0 flex items-center justify-center">
                        <span className="text-[#bbb] text-xs font-light">Próximamente</span>
                      </div>
                    )}

                    {/* Favorite button */}
                    <motion.button
                      whileTap={{ scale: 0.85 }}
                      onClick={(e) => toggleFavorite(e, product.id)}
                      className="absolute top-2.5 right-2.5 z-10 w-8 h-8 flex items-center justify-center bg-white/80 backdrop-blur-md rounded-full text-[#aaa] hover:text-[#e57373] transition-colors shadow-sm"
                    >
                      <span 
                        className={`material-symbols-outlined text-[18px] ${favorites.includes(product.id) ? 'text-[#e57373]' : ''}`} 
                        style={{ fontVariationSettings: favorites.includes(product.id) ? "'FILL' 1, 'wght' 300" : "'FILL' 0, 'wght' 300" }}
                      >
                        favorite
                      </span>
                    </motion.button>
                  </div>

                  {/* Text */}
                  <h3 className="font-semibold text-sm text-[#1a1a1a] truncate leading-snug">
                    {product.name}
                  </h3>
                  <p className="text-xs text-[#888] mt-0.5 font-normal">
                    {product.color_name}
                  </p>

                  {/* CTA chip */}
                  <span className="mt-3 w-fit flex items-center gap-1 px-3 py-1.5 bg-white border border-black/10 rounded-xl text-[11px] font-semibold text-[#1a1a1a] group-hover:bg-[#f0efed] transition-colors duration-200">
                    {product.action_text || 'Ver detalles'}
                    <motion.span
                      className="material-symbols-outlined text-[13px]"
                      style={{ fontVariationSettings: "'wght' 400" }}
                      animate={{ x: 0 }}
                      whileHover={{ x: 2 }}
                    >
                      arrow_forward
                    </motion.span>
                  </span>
                </motion.article>
              ))
            )}
          </AnimatePresence>
        </section>
      </main>

      {/* Bottom Nav */}
      <nav className="fixed bottom-0 w-full z-40 pb-safe bg-white/90 backdrop-blur-xl border-t border-black/5 md:hidden">
        <div className="flex justify-around items-center h-16 px-2">
          {[
            { icon: 'home', label: 'Inicio', active: true },
            { icon: 'grid_view', label: 'Categorías', active: false },
            { icon: 'favorite', label: 'Guardados', active: false },
            { icon: 'chat_bubble', label: 'Consultas', active: false, badge: true },
          ].map(item => (
            <motion.button
              key={item.label}
              whileTap={{ scale: 0.88 }}
              className={`relative flex flex-col items-center justify-center w-16 h-full transition-colors ${item.active ? 'text-[#1a1a1a]' : 'text-[#bbb]'}`}
            >
              {item.active && (
                <motion.div
                  layoutId="nav-indicator"
                  className="absolute -top-[1px] w-5 h-[2px] bg-[#1a1a1a] rounded-b-full"
                />
              )}
              {item.badge && (
                <span className="absolute top-2.5 right-2.5 w-1.5 h-1.5 bg-red-400 rounded-full" />
              )}
              <span
                className="material-symbols-outlined text-[23px]"
                style={{ fontVariationSettings: item.active ? "'FILL' 1, 'wght' 300" : "'wght' 300" }}
              >
                {item.icon}
              </span>
              <span className="text-[10px] mt-0.5 font-medium">{item.label}</span>
            </motion.button>
          ))}
        </div>
      </nav>

      {/* Product Preview Modal */}
      <ProductModal 
        isOpen={isModalOpen} 
        onClose={() => setIsModalOpen(false)} 
        product={selectedProduct} 
      />
    </div>
  );
}
