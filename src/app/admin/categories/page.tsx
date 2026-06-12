'use client';

import React, { useState, useEffect } from 'react';
import { motion, Reorder, AnimatePresence } from 'motion/react';
import { supabase } from '@/utils/supabase/client';

export default function AdminCategoriesPage() {
  const [categories, setCategories] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState<string | null>(null);

  const [formData, setFormData] = useState({ name: '', icon: 'category' });

  useEffect(() => {
    fetchCategories();
  }, []);

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

    if (editingId) {
      await supabase.from('categories').update(formData).eq('id', editingId);
      setCategories(categories.map(c => c.id === editingId ? { ...c, ...formData } : c));
      setEditingId(null);
    } else {
      const payload = { ...formData, order_index: categories.length };
      const { data } = await supabase.from('categories').insert([payload]).select();
      if (data && data[0]) {
        setCategories([...categories, data[0]]);
      }
    }
    setFormData({ name: '', icon: 'category' });
  };

  const startEdit = (cat: any) => {
    setEditingId(cat.id);
    setFormData({ name: cat.name, icon: cat.icon || 'category' });
  };

  const cancelEdit = () => {
    setEditingId(null);
    setFormData({ name: '', icon: 'category' });
  };

  const deleteCategory = async (id: string) => {
    if (!confirm('¿Seguro que deseas eliminar esta categoría?')) return;
    setCategories(categories.filter(c => c.id !== id));
    await supabase.from('categories').delete().eq('id', id);
  };

  const commonIcons = ['apparel', 'checkroom', 'straight', 'laundry', 'footprint', 'stethoscope', 'medical_services', 'category', 'stars', 'inventory_2'];

  return (
    <main className="flex-1 p-4 md:p-8 w-full max-w-5xl mx-auto flex flex-col gap-6 pb-[100px] md:pb-8">

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
        <div className="md:col-span-1 bg-white rounded-3xl p-6 shadow-[0_2px_12px_rgba(0,0,0,0.03)] border border-black/5 sticky top-[80px]">
          <h3 className="font-semibold text-lg text-[#1a1a1a] mb-5">
            {editingId ? 'Editar Categoría' : 'Nueva Categoría'}
          </h3>

          <div className="flex flex-col gap-4">
            <div>
              <label className="block text-[11px] font-semibold text-[#aaa] uppercase tracking-wider mb-2">Nombre</label>
              <input
                type="text"
                value={formData.name}
                onChange={e => setFormData({ ...formData, name: e.target.value })}
                className="w-full bg-[#f8f8f6] border border-transparent focus:border-black/10 outline-none rounded-xl px-4 py-3 text-sm text-[#1a1a1a] transition-all focus:bg-white"
                placeholder="Ej. Accesorios"
              />
            </div>

            <div>
              <label className="block text-[11px] font-semibold text-[#aaa] uppercase tracking-wider mb-2">Icono (Material Symbol)</label>
              <div className="flex gap-2 items-center mb-3">
                <div className="w-10 h-10 rounded-xl bg-[#1a1a1a] text-white flex items-center justify-center flex-shrink-0">
                  <span className="material-symbols-outlined text-[20px]" style={{ fontVariationSettings: "'wght' 300" }}>{formData.icon}</span>
                </div>
                <input
                  type="text"
                  value={formData.icon}
                  onChange={e => setFormData({ ...formData, icon: e.target.value })}
                  className="w-full bg-[#f8f8f6] border border-transparent focus:border-black/10 outline-none rounded-xl px-4 py-3 text-sm text-[#1a1a1a] transition-all focus:bg-white font-mono"
                  placeholder="category"
                />
              </div>
              <p className="text-[10px] text-[#888] mt-1 mb-2">
                <a href="https://fonts.google.com/icons" target="_blank" rel="noreferrer" className="underline hover:text-[#1a1a1a]">Buscar iconos aquí</a>
              </p>
              <div className="flex flex-wrap gap-2 mt-2">
                {commonIcons.map(icon => (
                  <button
                    key={icon}
                    onClick={() => setFormData({ ...formData, icon })}
                    className={`w-8 h-8 rounded-lg flex items-center justify-center transition-colors border ${formData.icon === icon ? 'bg-[#1a1a1a] text-white border-[#1a1a1a]' : 'bg-[#f4f2f0] text-[#555] border-transparent hover:border-[#ccc]'}`}
                    title={icon}
                  >
                    <span className="material-symbols-outlined text-[18px]" style={{ fontVariationSettings: "'wght' 300" }}>{icon}</span>
                  </button>
                ))}
              </div>
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
        <div className="md:col-span-2 bg-white rounded-3xl shadow-[0_2px_12px_rgba(0,0,0,0.03)] border border-black/5 overflow-hidden">
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
                      <div className="w-10 h-10 rounded-xl bg-[#f4f2f0] flex items-center justify-center text-[#1a1a1a]">
                        <span className="material-symbols-outlined text-[20px]" style={{ fontVariationSettings: "'wght' 300" }}>{cat.icon || 'category'}</span>
                      </div>
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
