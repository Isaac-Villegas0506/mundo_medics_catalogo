'use client';

import React, { useState, useEffect } from 'react';
import { motion, Reorder, AnimatePresence } from 'motion/react';
import { supabase } from '@/utils/supabase/client';

export default function AdminCategoriesPage() {
  const [categories, setCategories] = useState<any[]>([]);
  const [products, setProducts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState<string | null>(null);

  const [formData, setFormData] = useState({ name: '', featured_product_id: '' });

  useEffect(() => {
    fetchCategories();
    fetchProducts();
  }, []);

  const fetchProducts = async () => {
    const { data } = await supabase.from('products').select('id, name, image_url');
    if (data) setProducts(data);
  };

  const fetchCategories = async () => {
    setLoading(true);
    const { data } = await supabase.from('categories').select('*').order('order_index', { ascending: true });
    if (data) setCategories(data);
    setLoading(false);
  };

  const handleReorder = async (newOrder: any[]) => {
    setCategories(newOrder);
    const updates = newOrder.map((cat, index) => ({
      id: cat.id,
      name: cat.name,
      order_index: index,
    }));
    await supabase.from('categories').upsert(updates);
  };

  const handleSave = async () => {
    if (!formData.name.trim()) return;

    const payload: any = { name: formData.name };
    if (formData.featured_product_id) payload.featured_product_id = formData.featured_product_id;
    else payload.featured_product_id = null; // Clear if empty

    if (editingId) {
      await supabase.from('categories').update(payload).eq('id', editingId);
      setCategories(categories.map(c => c.id === editingId ? { ...c, ...payload } : c));
      setEditingId(null);
    } else {
      payload.order_index = categories.length;
      const { data } = await supabase.from('categories').insert([payload]).select();
      if (data && data[0]) {
        setCategories([...categories, data[0]]);
      }
    }
    setFormData({ name: '', featured_product_id: '' });
  };

  const startEdit = (cat: any) => {
    setEditingId(cat.id);
    setFormData({ name: cat.name, featured_product_id: cat.featured_product_id || '' });
  };

  const cancelEdit = () => {
    setEditingId(null);
    setFormData({ name: '', featured_product_id: '' });
  };

  const deleteCategory = async (id: string) => {
    if (!confirm('¿Seguro que deseas eliminar esta categoría?')) return;
    setCategories(categories.filter(c => c.id !== id));
    await supabase.from('categories').delete().eq('id', id);
  };

  // Determine which product is currently selected in the form
  const selectedProduct = products.find(p => p.id === formData.featured_product_id);

  return (
    <main className="flex-1 p-4 md:p-8 w-full max-w-5xl self-start flex flex-col gap-6 pb-[100px] md:pb-8">

      {/* Header */}
      <div>
        <h2 className="text-[28px] md:text-[34px] font-semibold tracking-tight text-[#1a1a1a] leading-tight">
          Categorías
        </h2>
        <p className="text-[#888] text-sm font-normal mt-1">
          Organiza cómo se agrupan tus productos en el catálogo.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-8 items-start">

        {/* Editor Form */}
        <div className="w-full md:col-span-1 bg-white rounded-3xl p-6 shadow-[0_2px_12px_rgba(0,0,0,0.03)] border border-black/5 sticky top-[80px]">
          <h3 className="font-semibold text-lg text-[#1a1a1a] mb-5">
            {editingId ? 'Editar Categoría' : 'Nueva Categoría'}
          </h3>

          <div className="flex flex-col gap-4 w-full">
            <div className="w-full">
              <label className="block text-[11px] font-semibold text-[#aaa] uppercase tracking-wider mb-2">Nombre</label>
              <input
                type="text"
                value={formData.name}
                onChange={e => setFormData({ ...formData, name: e.target.value })}
                className="w-full bg-[#f8f8f6] border border-transparent focus:border-black/10 outline-none rounded-xl px-4 py-3 text-sm text-[#1a1a1a] transition-all focus:bg-white"
                placeholder="Ej. Accesorios"
              />
            </div>

            <div className="w-full">
              <label className="block text-[11px] font-semibold text-[#aaa] uppercase tracking-wider mb-2">Producto Portada</label>
              
              <div className="flex gap-3 items-center mb-2 w-full">
                <div className="w-12 h-16 rounded-xl bg-[#e8e8e4] border border-black/5 flex items-center justify-center overflow-hidden flex-shrink-0">
                  {selectedProduct?.image_url ? (
                    <img src={selectedProduct.image_url} alt="Vista previa" className="w-full h-full object-cover" />
                  ) : (
                    <span className="material-symbols-outlined text-[20px] text-[#aaa]">image</span>
                  )}
                </div>
                
                <div className="flex-1 min-w-0">
                  <select
                    value={formData.featured_product_id}
                    onChange={e => setFormData({ ...formData, featured_product_id: e.target.value })}
                    className="w-full bg-[#f8f8f6] border border-transparent focus:border-black/10 outline-none rounded-xl px-4 py-3 text-sm text-[#1a1a1a] transition-all focus:bg-white truncate"
                  >
                    <option value="">-- Sin portada --</option>
                    {products.map(p => (
                      <option key={p.id} value={p.id}>{p.name}</option>
                    ))}
                  </select>
                </div>
              </div>
              <p className="text-[10px] text-[#888] mt-1">
                La imagen principal de este producto será la portada de la categoría en la tienda.
              </p>
            </div>

            <div className="flex gap-2 mt-4">
              {editingId && (
                <button
                  onClick={cancelEdit}
                  className="flex-1 bg-[#f4f2f0] text-[#555] font-semibold text-sm px-4 py-3 rounded-xl hover:bg-[#eceae6] transition-colors"
                >
                  Cancelar
                </button>
              )}
              <button
                onClick={handleSave}
                disabled={!formData.name.trim()}
                className="flex-1 bg-[#1a1a1a] text-white font-semibold text-sm px-4 py-3 rounded-xl hover:bg-[#333] transition-colors disabled:opacity-50"
              >
                {editingId ? 'Actualizar' : 'Crear'}
              </button>
            </div>
          </div>
        </div>

        {/* Categories List */}
        <div className="w-full md:col-span-2 bg-white rounded-3xl shadow-[0_2px_12px_rgba(0,0,0,0.03)] border border-black/5 overflow-hidden">
          <div className="p-5 border-b border-[#ece9e2] bg-[#fcfcfb]">
            <span className="text-[11px] font-semibold text-[#aaa] uppercase tracking-wider">Tus Categorías (Arrastra para ordenar)</span>
          </div>

          {loading ? (
            <div className="p-10 text-center text-[#888]">Cargando...</div>
          ) : categories.length === 0 ? (
            <div className="p-10 text-center text-[#888]">No hay categorías. Crea una.</div>
          ) : (
            <Reorder.Group axis="y" values={categories} onReorder={handleReorder} className="flex flex-col">
              <AnimatePresence>
                {categories.map((cat) => (
                  <Reorder.Item
                    key={cat.id}
                    value={cat}
                    className="group flex items-center justify-between p-4 border-b border-[#ece9e2] last:border-none bg-white hover:bg-[#fcfcfb] transition-colors cursor-grab active:cursor-grabbing"
                  >
                    <div className="flex items-center gap-4">
                      <div className="flex items-center justify-center w-6 text-[#ccc] group-hover:text-[#888] transition-colors cursor-grab">
                        <span className="material-symbols-outlined text-[20px]">drag_indicator</span>
                      </div>
                      
                      {(() => {
                        const prod = products.find(p => p.id === cat.featured_product_id);
                        return (
                          <div className="w-10 h-12 rounded-lg bg-[#e8e8e4] overflow-hidden flex items-center justify-center border border-black/5">
                            {prod?.image_url ? (
                              <img src={prod.image_url} alt={cat.name} className="w-full h-full object-cover" />
                            ) : (
                              <span className="material-symbols-outlined text-[16px] text-[#aaa]">image</span>
                            )}
                          </div>
                        );
                      })()}
                      
                      <span className="font-semibold text-sm text-[#1a1a1a]">{cat.name}</span>
                    </div>

                    <div className="flex items-center gap-1 opacity-100 md:opacity-0 group-hover:opacity-100 transition-opacity pr-2">
                      <button onClick={() => startEdit(cat)} className="w-8 h-8 flex items-center justify-center rounded-full text-[#aaa] hover:text-[#1a1a1a] hover:bg-white shadow-sm transition-all">
                        <span className="material-symbols-outlined text-[18px]" style={{ fontVariationSettings: "'wght' 300" }}>edit</span>
                      </button>
                      <button onClick={() => deleteCategory(cat.id)} className="w-8 h-8 flex items-center justify-center rounded-full text-[#aaa] hover:text-[#e57373] hover:bg-white shadow-sm transition-all">
                        <span className="material-symbols-outlined text-[18px]" style={{ fontVariationSettings: "'wght' 300" }}>delete</span>
                      </button>
                    </div>
                  </Reorder.Item>
                ))}
              </AnimatePresence>
            </Reorder.Group>
          )}
        </div>

      </div>
    </main>
  );
}
