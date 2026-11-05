'use client';

import React, { useState, useEffect } from 'react';
import { m as motion, Reorder, AnimatePresence } from 'motion/react';
import { supabase } from '@/utils/supabase/client';
import Link from 'next/link';

export default function AdminProductsPage() {
  const [products, setProducts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Modal states
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [productToDelete, setProductToDelete] = useState<any>(null);
  const [deleteCountdown, setDeleteCountdown] = useState(3);

  useEffect(() => {
    fetchProducts();
  }, []);

  const fetchProducts = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('products')
      .select('*')
      .order('order_index', { ascending: true })
      .order('created_at', { ascending: false });

    if (data) {
      setProducts(data);
    }
    setLoading(false);
  };

  const handleReorder = async (newOrder: any[]) => {
    setProducts(newOrder);
    
    // Optimistic UI update, then save to db
    const updates = newOrder.map((product, index) => ({
      id: product.id,
      order_index: index,
    }));

    // Perform mass update
    const { error } = await supabase
      .from('products')
      .upsert(updates);

    if (error) {
      console.error('Error updating order:', error);
    }
  };

  useEffect(() => {
    let timer: any;
    if (deleteModalOpen && deleteCountdown > 0) {
      timer = setTimeout(() => setDeleteCountdown(deleteCountdown - 1), 1000);
    }
    return () => clearTimeout(timer);
  }, [deleteModalOpen, deleteCountdown]);

  const toggleStatus = async (id: string, currentStatus: string) => {
    const newStatus = currentStatus === 'Disponible' ? 'Oculto' : 'Disponible';
    setProducts(products.map(p => p.id === id ? { ...p, status: newStatus } : p));
    await supabase.from('products').update({ status: newStatus }).eq('id', id);
  };

  const confirmDeleteProduct = (product: any) => {
    setProductToDelete(product);
    setDeleteCountdown(3);
    setDeleteModalOpen(true);
  };

  const executeDelete = async () => {
    if (!productToDelete) return;
    setProducts(products.filter(p => p.id !== productToDelete.id));
    await supabase.from('products').delete().eq('id', productToDelete.id);
    setDeleteModalOpen(false);
    setProductToDelete(null);
  };

  const statusColors: any = {
    'Disponible': 'bg-[#e8f5e9] text-[#2e7d32]',
    'Agotado': 'bg-[#ffebee] text-[#c62828]',
    'Próximamente': 'bg-[#fff8e1] text-[#f57f17]',
    'Oculto': 'bg-[#f4f2f0] text-[#888]',
  };

  return (
    <main className="flex-1 p-4 md:p-8 w-full max-w-7xl self-start flex flex-col gap-6 pb-[100px] md:pb-8">
      
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-5">
        <div>
          <h2 className="text-[28px] md:text-[34px] font-semibold tracking-tight text-[#1a1a1a] leading-tight">
            Gestión de Productos
          </h2>
          <p className="text-[#888] text-sm font-normal mt-1">
            Visualiza, organiza y administra el catálogo completo.
          </p>
        </div>
        <div className="flex gap-3 w-full md:w-auto">
          <Link href="/admin/products/new" className="flex-1 md:flex-none bg-[#1a1a1a] text-white font-semibold text-sm px-6 py-3.5 rounded-2xl flex items-center justify-center gap-2 hover:bg-[#333] transition-colors shadow-[0_4px_16px_rgba(0,0,0,0.08)] active:scale-95">
            <span className="material-symbols-outlined text-[18px]" style={{ fontVariationSettings: "'wght' 300" }}>add</span>
            Crear Producto
          </Link>
        </div>
      </div>

      {/* Filters/Search (Placeholder) */}
      <div className="bg-white p-2 rounded-2xl shadow-[0_2px_12px_rgba(0,0,0,0.03)] border border-black/5 flex items-center gap-3">
        <span className="material-symbols-outlined text-[#aaa] pl-3" style={{ fontVariationSettings: "'wght' 300" }}>search</span>
        <input 
          type="text" 
          placeholder="Buscar productos..." 
          className="flex-1 bg-transparent border-none outline-none text-sm text-[#1a1a1a] py-2 placeholder:text-[#bbb]"
        />
        <button className="px-4 py-2 text-sm font-semibold text-[#555] bg-[#f4f2f0] rounded-xl hover:bg-[#eceae6] transition-colors">
          Filtros
        </button>
      </div>

      {/* Products List (Drag and Drop) */}
      <div className="bg-white rounded-3xl shadow-[0_2px_12px_rgba(0,0,0,0.03)] border border-black/5 overflow-hidden">
        
        {/* Table Header */}
        <div className="hidden md:grid grid-cols-[auto_3fr_1.5fr_1fr_1.5fr_1fr] gap-4 p-5 border-b border-[#ece9e2] bg-[#fcfcfb] text-[11px] font-semibold text-[#aaa] uppercase tracking-wider">
          <div className="w-8"></div>
          <div>Producto</div>
          <div>Categoría</div>
          <div>Estado</div>
          <div>Etiquetas</div>
          <div className="text-right">Acciones</div>
        </div>

        {/* Table Body (Reorderable) */}
        {loading ? (
          <div className="p-10 text-center text-[#888]">Cargando productos...</div>
        ) : products.length === 0 ? (
          <div className="p-10 text-center flex flex-col items-center">
            <div className="w-16 h-16 bg-[#f4f2f0] rounded-full flex items-center justify-center mb-4">
              <span className="material-symbols-outlined text-[#aaa] text-[32px]" style={{ fontVariationSettings: "'wght' 300" }}>inventory_2</span>
            </div>
            <p className="text-[#555] font-medium">No hay productos en tu catálogo.</p>
            <Link href="/admin/products/new" className="text-[#1a1a1a] text-sm font-semibold mt-2 hover:underline">Crear tu primer producto</Link>
          </div>
        ) : (
          <Reorder.Group axis="y" values={products} onReorder={handleReorder} className="flex flex-col">
            <AnimatePresence>
              {products.map((product) => (
                <Reorder.Item 
                  key={product.id} 
                  value={product}
                  className="group grid grid-cols-1 md:grid-cols-[auto_3fr_1.5fr_1fr_1.5fr_1fr] gap-4 p-4 md:p-5 items-center border-b border-[#ece9e2] last:border-none bg-white hover:bg-[#fcfcfb] transition-colors cursor-grab active:cursor-grabbing"
                >
                  {/* Drag handle */}
                  <div className="hidden md:flex items-center justify-center w-8 text-[#ccc] group-hover:text-[#888] transition-colors">
                    <span className="material-symbols-outlined text-[20px]">drag_indicator</span>
                  </div>

                  {/* Product Info */}
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-xl overflow-hidden bg-[#f4f2f0] border border-black/5 flex-shrink-0 flex items-center justify-center">
                      {product.image_url ? (
                        <img src={product.image_url} alt={product.name} className="w-full h-full object-cover" />
                      ) : (
                        <span className="material-symbols-outlined text-[#aaa]">image</span>
                      )}
                    </div>
                    <div>
                      <h4 className="font-semibold text-sm text-[#1a1a1a]">{product.name}</h4>
                      <div className="flex gap-2 items-center mt-0.5">
                        <span className="text-[11px] text-[#aaa] uppercase tracking-wider">{product.internal_code || 'SIN SKU'}</span>
                        <span className="text-[10px] text-[#ccc]">•</span>
                        <span className="text-[11px] text-[#888]">{new Date(product.created_at).toLocaleDateString()}</span>
                      </div>
                    </div>
                  </div>

                  {/* Category */}
                  <div className="hidden md:block">
                    <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg bg-[#f4f2f0] text-xs font-medium text-[#555]">
                      {product.category || 'Sin categoría'}
                    </span>
                  </div>

                  {/* Status */}
                  <div>
                    <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-[11px] font-semibold ${statusColors[product.status || 'Disponible'] || statusColors['Disponible']}`}>
                      {product.status || 'Disponible'}
                    </span>
                  </div>

                  {/* Tags */}
                  <div className="hidden md:flex gap-1 flex-wrap">
                    {product.tags && product.tags.length > 0 ? (
                      product.tags.slice(0, 2).map((tag: string, idx: number) => (
                        <span key={idx} className="px-2 py-0.5 border border-[#e0e0e0] rounded-md text-[10px] font-medium text-[#555] bg-white">
                          {tag}
                        </span>
                      ))
                    ) : (
                      <span className="text-xs text-[#bbb] italic">Sin etiquetas</span>
                    )}
                    {product.tags && product.tags.length > 2 && (
                      <span className="px-1.5 py-0.5 rounded-md text-[10px] font-medium text-[#aaa] bg-[#f4f2f0]">
                        +{product.tags.length - 2}
                      </span>
                    )}
                  </div>

                  {/* Actions */}
                  <div className="flex items-center md:justify-end gap-1 mt-4 md:mt-0">
                    <Link href={`/admin/products/${product.id}`} className="w-8 h-8 flex items-center justify-center rounded-full text-[#aaa] hover:text-[#1a1a1a] hover:bg-[#f4f2f0] transition-all">
                      <span className="material-symbols-outlined text-[18px]" style={{ fontVariationSettings: "'wght' 300" }}>edit</span>
                    </Link>
                    <button onClick={() => toggleStatus(product.id, product.status || 'Disponible')} className="w-8 h-8 flex items-center justify-center rounded-full text-[#aaa] hover:text-[#1a1a1a] hover:bg-[#f4f2f0] transition-all" title="Ocultar/Mostrar">
                      <span className="material-symbols-outlined text-[18px]" style={{ fontVariationSettings: "'wght' 300" }}>
                        {(product.status === 'Oculto' || product.status === 'Agotado') ? 'visibility_off' : 'visibility'}
                      </span>
                    </button>
                    <button onClick={() => confirmDeleteProduct(product)} className="w-8 h-8 flex items-center justify-center rounded-full text-[#aaa] hover:text-[#e57373] hover:bg-red-50 transition-all" title="Eliminar">
                      <span className="material-symbols-outlined text-[18px]" style={{ fontVariationSettings: "'wght' 300" }}>delete</span>
                    </button>
                  </div>

                </Reorder.Item>
              ))}
            </AnimatePresence>
          </Reorder.Group>
        )}
      </div>

      {/* Delete Confirmation Modal */}
      <AnimatePresence>
        {deleteModalOpen && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4"
          >
            <motion.div 
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white rounded-[28px] p-6 md:p-8 shadow-2xl w-[90%] min-w-[320px] max-w-[400px] border border-white/20 mx-auto flex flex-col items-center text-center"
            >
              <h3 className="text-xl font-semibold text-[#1a1a1a] mb-2 tracking-tight">Confirmar Eliminación</h3>
              <p className="text-sm text-[#888] leading-relaxed mb-6">
                ¿Estás seguro de que deseas eliminar <strong>{productToDelete?.name}</strong>? Esta acción no se puede deshacer y el producto desaparecerá del catálogo para siempre.
              </p>
              <div className="flex gap-3">
                <button 
                  onClick={() => setDeleteModalOpen(false)}
                  className="flex-1 bg-[#f4f2f0] text-[#555] font-semibold text-sm px-4 py-3.5 rounded-xl hover:bg-[#eceae6] transition-colors"
                >
                  Cancelar
                </button>
                <button 
                  onClick={executeDelete}
                  disabled={deleteCountdown > 0}
                  className="flex-1 bg-[#e57373] text-white font-semibold text-sm px-4 py-3.5 rounded-xl hover:bg-red-500 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  {deleteCountdown > 0 ? `Espera (${deleteCountdown})` : 'Eliminar'}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

    </main>
  );
}
