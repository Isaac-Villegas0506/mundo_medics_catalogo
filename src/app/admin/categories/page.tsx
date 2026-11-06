'use client';

import React, { useState, useEffect } from 'react';
import { motion, Reorder, AnimatePresence } from 'motion/react';
import { supabase } from '@/utils/supabase/client';
import { revalidateCatalog } from '@/app/admin/actions';

export default function AdminCategoriesPage() {
  const [categories, setCategories] = useState<any[]>([]);
  const [products, setProducts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');

  // Fase 7: confirmación propia en lugar de `confirm()` del navegador.
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [categoryToDelete, setCategoryToDelete] = useState<any | null>(null);

  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [productSearch, setProductSearch] = useState('');

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
    if (searchTerm.trim()) return; // Prevenir reordenamiento durante la búsqueda
    setCategories(newOrder);
    const updates = newOrder.map((cat, index) => ({
      id: cat.id,
      name: cat.name,
      order_index: index,
    }));
    const { error } = await supabase.from('categories').upsert(updates);
    if (error) {
      console.error('Error al reordenar categorías:', error);
      setFormError('No se pudo guardar el orden. Vuelve a intentarlo.');
      return;
    }
    // Fase 7 (1.5): el orden de las categorías se ve en la portada pública.
    await revalidateCatalog();
  };

  const handleSave = async () => {
    if (!formData.name.trim()) {
      setFormError('El nombre es obligatorio.');
      return;
    }
    setFormError(null);
    setSaving(true);

    const payload: any = { name: formData.name.trim() };
    if (formData.featured_product_id) payload.featured_product_id = formData.featured_product_id;
    else payload.featured_product_id = null; // Clear if empty

    if (editingId) {
      const { error } = await supabase.from('categories').update(payload).eq('id', editingId);
      if (error) {
        console.error('Error al actualizar categoría:', error);
        setFormError('No se pudo actualizar la categoría.');
        setSaving(false);
        return;
      }
      setCategories(categories.map(c => c.id === editingId ? { ...c, ...payload } : c));
      setEditingId(null);
    } else {
      payload.order_index = categories.length;
      const { data, error } = await supabase.from('categories').insert([payload]).select();
      if (error || !data?.[0]) {
        console.error('Error al crear categoría:', error);
        setFormError('No se pudo crear la categoría.');
        setSaving(false);
        return;
      }
      setCategories([...categories, data[0]]);
    }

    // Fase 7 (1.5): reflejar el cambio en el catálogo público al instante.
    await revalidateCatalog();

    setFormData({ name: '', featured_product_id: '' });
    setProductSearch('');
    setSaving(false);
  };

  const startEdit = (cat: any) => {
    setEditingId(cat.id);
    setFormData({ name: cat.name, featured_product_id: cat.featured_product_id || '' });
  };

  const cancelEdit = () => {
    setEditingId(null);
    setFormData({ name: '', featured_product_id: '' });
    setProductSearch('');
  };

  const deleteCategory = async (id: string) => {
    // Fase 7: se usa el modal de confirmación propio en lugar de `confirm()`.
    const target = categories.find((c) => c.id === id);
    setCategoryToDelete(target ?? { id });
    setDeleteModalOpen(true);
  };

  const executeDeleteCategory = async () => {
    if (!categoryToDelete) return;
    const id = categoryToDelete.id;
    const previous = categories;
    setCategories(categories.filter(c => c.id !== id));
    setDeleteModalOpen(false);
    setCategoryToDelete(null);

    const { error } = await supabase.from('categories').delete().eq('id', id);
    if (error) {
      console.error('Error al eliminar categoría:', error);
      // Revertir: no se puede mostrar éxito si la operación falló.
      setCategories(previous);
      setFormError('No se pudo eliminar la categoría. Puede tener productos asociados.');
      return;
    }

    await revalidateCatalog();
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
                
                <div className="flex-1 min-w-0 relative">
                  <div 
                    onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                    className="w-full bg-[#f8f8f6] border border-transparent hover:border-black/10 rounded-xl px-4 py-3 text-sm text-[#1a1a1a] transition-all truncate cursor-pointer flex justify-between items-center"
                  >
                    <span className="truncate">{selectedProduct ? selectedProduct.name : '-- Sin portada --'}</span>
                    <span className="material-symbols-outlined text-[18px] text-[#aaa] shrink-0">expand_more</span>
                  </div>

                  {isDropdownOpen && (
                    <>
                      <div className="fixed inset-0 z-40" onClick={() => setIsDropdownOpen(false)} />
                      <div className="absolute top-full left-0 right-0 mt-2 bg-white rounded-xl shadow-xl border border-black/5 z-50 overflow-hidden flex flex-col">
                        <div className="p-2 border-b border-black/5 relative">
                          <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-[16px] text-[#aaa]">search</span>
                          <input
                            type="text"
                            value={productSearch}
                            onChange={e => setProductSearch(e.target.value)}
                            placeholder="Buscar..."
                            className="w-full bg-[#f4f2f0] border-none outline-none rounded-lg pl-9 pr-3 py-2 text-sm focus:bg-[#eceae6] transition-colors"
                            autoFocus
                          />
                        </div>
                        <div className="max-h-48 overflow-y-auto no-scrollbar">
                          <div 
                            onClick={() => {
                              setFormData({ ...formData, featured_product_id: '' });
                              setIsDropdownOpen(false);
                              setProductSearch('');
                            }}
                            className="px-4 py-2.5 text-sm text-[#555] hover:bg-[#f8f8f6] cursor-pointer transition-colors"
                          >
                            -- Sin portada --
                          </div>
                          {products.filter(p => p.name.toLowerCase().includes(productSearch.toLowerCase())).map(p => (
                            <div 
                              key={p.id}
                              onClick={() => {
                                setFormData({ ...formData, featured_product_id: p.id });
                                setIsDropdownOpen(false);
                                setProductSearch('');
                              }}
                              className="px-4 py-2.5 text-sm text-[#1a1a1a] hover:bg-[#f8f8f6] cursor-pointer transition-colors truncate"
                            >
                              {p.name}
                            </div>
                          ))}
                          {products.filter(p => p.name.toLowerCase().includes(productSearch.toLowerCase())).length === 0 && (
                            <div className="px-4 py-4 text-xs text-center text-[#aaa]">No se encontraron resultados</div>
                          )}
                        </div>
                      </div>
                    </>
                  )}
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
                disabled={!formData.name.trim() || saving}
                className="flex-1 bg-[#1a1a1a] text-white font-semibold text-sm px-4 py-3 rounded-xl hover:bg-[#333] transition-colors disabled:opacity-50"
              >
                {saving ? 'Guardando…' : editingId ? 'Actualizar' : 'Crear'}
              </button>
            </div>

            {/* Fase 7 (1.10): el error se muestra, no se silencia. */}
            {formError && (
              <p role="alert" className="mt-3 flex items-start gap-2 rounded-xl bg-[#fdf3f3] px-3 py-2 text-xs text-[#a33]">
                <span className="material-symbols-outlined text-[16px] shrink-0">error</span>
                <span>{formError}</span>
              </p>
            )}
          </div>
        </div>

        {/* Categories List */}
        <div className="w-full md:col-span-2 bg-white rounded-3xl shadow-[0_2px_12px_rgba(0,0,0,0.03)] border border-black/5 overflow-hidden">
          <div className="p-4 md:p-5 border-b border-[#ece9e2] bg-[#fcfcfb] flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
            <span className="text-[11px] font-semibold text-[#aaa] uppercase tracking-wider min-w-0 truncate flex-1">
              {searchTerm.trim() ? 'Resultados de búsqueda' : 'Tus Categorías (Arrastra para ordenar)'}
            </span>
            <div className="relative w-full md:w-64 flex-shrink-0">
              <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-[18px] text-[#aaa]">search</span>
              <input 
                type="text" 
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
                placeholder="Buscar categoría..." 
                className="w-full bg-white border border-[#ece9e2] focus:border-black/10 outline-none rounded-xl pl-10 pr-4 py-2 text-sm text-[#1a1a1a] transition-all shadow-sm"
              />
            </div>
          </div>

          {loading ? (
            <div className="p-10 text-center text-[#888]">Cargando...</div>
          ) : categories.length === 0 ? (
            <div className="p-10 text-center text-[#888]">No hay categorías. Crea una.</div>
          ) : (
            <Reorder.Group axis="y" values={searchTerm.trim() ? categories.filter(c => c.name.toLowerCase().includes(searchTerm.toLowerCase())) : categories} onReorder={handleReorder} className="flex flex-col">
              <AnimatePresence>
                {(searchTerm.trim() ? categories.filter(c => c.name.toLowerCase().includes(searchTerm.toLowerCase())) : categories).map((cat) => (
                  <Reorder.Item
                    key={cat.id}
                    value={cat}
                    dragListener={!searchTerm.trim()}
                    className={`group flex items-center justify-between p-4 border-b border-[#ece9e2] last:border-none bg-white hover:bg-[#fcfcfb] transition-colors ${!searchTerm.trim() ? 'cursor-grab active:cursor-grabbing' : ''}`}
                  >
                    <div className="flex items-center gap-4">
                      {!searchTerm.trim() ? (
                        <div className="flex items-center justify-center w-6 text-[#ccc] group-hover:text-[#888] transition-colors cursor-grab">
                          <span className="material-symbols-outlined text-[20px]">drag_indicator</span>
                        </div>
                      ) : (
                        <div className="w-6" />
                      )}
                      
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

      {/* Fase 7: modal de confirmación propio (antes era `confirm()`). */}
      <AnimatePresence>
        {deleteModalOpen && categoryToDelete && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
            onClick={() => setDeleteModalOpen(false)}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="w-full max-w-[380px] rounded-3xl bg-white p-6 text-center shadow-2xl"
              onClick={(e) => e.stopPropagation()}
            >
              <span className="material-symbols-outlined mb-3 block text-[36px] text-[#e57373]">delete</span>
              <h3 className="mb-2 text-lg font-semibold text-[#1a1a1a]">¿Eliminar categoría?</h3>
              <p className="mb-6 text-sm text-[#777]">
                Se eliminará <strong>{categoryToDelete.name}</strong>. Los productos no se borran, pero
                quedarán sin esa categoría.
              </p>
              <div className="flex gap-3">
                <button
                  onClick={() => { setDeleteModalOpen(false); setCategoryToDelete(null); }}
                  className="flex-1 rounded-2xl bg-[#f2f2f0] py-3 text-sm font-semibold text-[#1a1a1a] hover:bg-[#e8e8e4]"
                >
                  Cancelar
                </button>
                <button
                  onClick={executeDeleteCategory}
                  className="flex-1 rounded-2xl bg-[#c62828] py-3 text-sm font-semibold text-white hover:bg-[#a01f1f]"
                >
                  Eliminar
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </main>
  );
}
