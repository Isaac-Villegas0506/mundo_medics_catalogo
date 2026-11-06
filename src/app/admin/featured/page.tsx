'use client';

import React, { useState, useEffect } from 'react';
import { Reorder, AnimatePresence } from 'motion/react';
import { supabase } from '@/utils/supabase/client';
import { revalidateCatalog } from '@/app/admin/actions';

export default function AdminFeaturedPage() {
  const [products, setProducts] = useState<any[]>([]);
  const [featuredProducts, setFeaturedProducts] = useState<any[]>([]);
  const [selectedProduct, setSelectedProduct] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [saveMessage, setSaveMessage] = useState<string | null>(null);
  const MAX_FEATURED = 10;

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    const { data } = await supabase.from('products').select('*').order('created_at', { ascending: false });
    if (data) {
      setProducts(data);
      const featured = data.filter(p => p.is_featured).sort((a, b) => (a.order_index || 0) - (b.order_index || 0));
      setFeaturedProducts(featured);
    }
    setLoading(false);
  };

  const toggleFeatured = (product: any) => {
    if (!product) return;
    const isCurrentlyFeatured = featuredProducts.some(p => p.id === product.id);
    
    if (isCurrentlyFeatured) {
      setFeaturedProducts(featuredProducts.filter(p => p.id !== product.id));
    } else {
      if (featuredProducts.length >= MAX_FEATURED) {
        // Fase 7 (1.10): aviso en la interfaz, sin alert() bloqueante.
        setSaveError(`Has alcanzado el límite de ${MAX_FEATURED} productos destacados.`);
        setTimeout(() => setSaveError(null), 4000);
        return;
      }
      setFeaturedProducts([...featuredProducts, { ...product, is_featured: true }]);
    }
    setSelectedProduct(null); // Clear selection after action
  };

  const handleSave = async () => {
    setSaving(true);
    setSaveError(null);

    // First, set all products to not featured
    const { error: clearError } = await supabase
      .from('products')
      .update({ is_featured: false })
      .neq('id', '00000000-0000-0000-0000-000000000000'); // Hack to update all rows

    if (clearError) {
      console.error('Error al limpiar destacados:', clearError);
      setSaveError('No se pudieron guardar los destacados.');
      setSaving(false);
      return;
    }

    // Then set the selected ones to featured and update their order
    const results = await Promise.all(
      featuredProducts.map((p, index) =>
        supabase.from('products').update({ is_featured: true, order_index: index }).eq('id', p.id)
      )
    );

    const failed = results.find((r) => r.error);
    if (failed?.error) {
      console.error('Error al guardar destacados:', failed.error);
      setSaveError('Algunos destacados no se guardaron. Revisa la lista.');
      setSaving(false);
      return;
    }

    // Fase 7 (1.5): los destacados se ven en la portada publica.
    await revalidateCatalog();

    setSaving(false);
    setSaveMessage('Destacados guardados correctamente.');
    setTimeout(() => setSaveMessage(null), 3000);
  };

  return (
    <main className="flex-1 p-4 md:p-8 w-full max-w-6xl self-start flex flex-col gap-6 pb-[100px] md:pb-8">
      
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-5">
        <div>
          <h2 className="text-[28px] md:text-[34px] font-semibold tracking-tight text-[#1a1a1a] leading-tight">
            Productos Destacados
          </h2>
          <p className="text-[#888] text-sm font-normal mt-1">
            Configura los productos estrella que aparecerán en la pantalla principal.
          </p>
        </div>
        <div className="flex gap-3 w-full md:w-auto">
          <button 
            onClick={handleSave}
            disabled={saving}
            className="flex-1 md:flex-none bg-[#1a1a1a] text-white font-semibold text-sm px-6 py-3.5 rounded-2xl flex items-center justify-center gap-2 hover:bg-[#333] transition-colors shadow-[0_4px_16px_rgba(0,0,0,0.08)] active:scale-95 disabled:opacity-50"
          >
            <span className="material-symbols-outlined text-[18px]" style={{ fontVariationSettings: "'wght' 300" }}>save</span>
            {saving ? 'Guardando...' : 'Guardar Cambios'}
          </button>
        </div>
      </div>

      {/* Fase 7 (1.10): mensajes de resultado visibles, sin usar alert(). */}
      {saveError && (
        <p role="alert" className="flex items-start gap-2 rounded-2xl bg-[#fdf3f3] px-4 py-3 text-sm text-[#a33]">
          <span className="material-symbols-outlined text-[18px] shrink-0">error</span>
          <span>{saveError}</span>
        </p>
      )}
      {saveMessage && (
        <p role="status" className="flex items-start gap-2 rounded-2xl bg-[#eef7ee] px-4 py-3 text-sm text-[#2e7d32]">
          <span className="material-symbols-outlined text-[18px] shrink-0">check</span>
          <span>{saveMessage}</span>
        </p>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-start">
        
        {/* Left: Reorder and Manage Featured */}
        <div className="bg-white rounded-3xl p-6 shadow-[0_2px_12px_rgba(0,0,0,0.03)] border border-black/5 flex flex-col">
          <div className="flex justify-between items-center mb-6">
            <h3 className="font-semibold text-lg text-[#1a1a1a]">Lista de Destacados</h3>
            <div className="bg-[#f4f2f0] px-3 py-1 rounded-full text-xs font-semibold text-[#555]">
              {featuredProducts.length} / {MAX_FEATURED}
            </div>
          </div>

          <p className="text-xs text-[#888] mb-4">Arrastra los productos para cambiar el orden de aparición.</p>

          <div className="flex-1 overflow-y-auto pr-2 no-scrollbar" style={{ maxHeight: '60vh' }}>
            {featuredProducts.length === 0 ? (
              <div className="p-8 text-center border-2 border-dashed border-[#ece9e2] rounded-2xl">
                <span className="material-symbols-outlined text-[#ccc] text-[32px] mb-2" style={{ fontVariationSettings: "'wght' 300" }}>star</span>
                <p className="text-sm font-medium text-[#888]">No hay productos destacados. Selecciona algunos del catálogo.</p>
              </div>
            ) : (
              <Reorder.Group axis="y" values={featuredProducts} onReorder={setFeaturedProducts} className="flex flex-col gap-2">
                <AnimatePresence>
                  {featuredProducts.map((cat) => (
                    <Reorder.Item 
                      key={cat.id} 
                      value={cat}
                      className="group flex items-center justify-between p-3 border border-[#ece9e2] rounded-xl bg-white hover:border-[#ccc] transition-colors cursor-grab active:cursor-grabbing shadow-sm"
                    >
                      <div className="flex items-center gap-3">
                        <div className="flex items-center justify-center w-6 text-[#ccc] group-hover:text-[#888] transition-colors">
                          <span className="material-symbols-outlined text-[20px]">drag_indicator</span>
                        </div>
                        <div className="w-10 h-10 rounded-lg bg-[#f4f2f0] overflow-hidden flex items-center justify-center">
                          {cat.image_url ? (
                            <img src={cat.image_url} alt={cat.name} className="w-full h-full object-cover" />
                          ) : (
                            <span className="material-symbols-outlined text-[16px] text-[#aaa]">image</span>
                          )}
                        </div>
                        <div>
                          <span className="font-semibold text-sm text-[#1a1a1a] block leading-none mb-1">{cat.name}</span>
                          <span className="text-[10px] text-[#aaa] uppercase tracking-wider">{cat.category || 'General'}</span>
                        </div>
                      </div>
                      
                      <button onClick={() => toggleFeatured(cat)} className="w-8 h-8 flex items-center justify-center rounded-full text-[#aaa] hover:text-[#e57373] hover:bg-red-50 transition-all">
                        <span className="material-symbols-outlined text-[18px]" style={{ fontVariationSettings: "'wght' 300" }}>close</span>
                      </button>
                    </Reorder.Item>
                  ))}
                </AnimatePresence>
              </Reorder.Group>
            )}
          </div>
        </div>

        {/* Right: Select from Catalog */}
        <div className="bg-white rounded-3xl p-6 shadow-[0_2px_12px_rgba(0,0,0,0.03)] border border-black/5 flex flex-col">
          <h3 className="font-semibold text-lg text-[#1a1a1a] mb-6">Catálogo Disponible</h3>
          
          <div className="relative mb-4">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 material-symbols-outlined text-[#aaa] text-[18px]">search</span>
            <input 
              type="text" 
              placeholder="Buscar producto para destacar..." 
              className="w-full bg-[#f8f8f6] border border-transparent outline-none rounded-xl pl-10 pr-4 py-2.5 text-sm text-[#1a1a1a] transition-all focus:bg-white focus:border-black/10"
            />
          </div>

          <div className="flex-1 overflow-y-auto pr-2 no-scrollbar" style={{ maxHeight: '60vh' }}>
            {loading ? (
              <div className="text-center p-10 text-[#888]">Cargando catálogo...</div>
            ) : (
              <div className="flex flex-col gap-2">
                {products.map(product => {
                  const isFeatured = featuredProducts.some(p => p.id === product.id);
                  const isSelected = selectedProduct?.id === product.id;
                  
                  return (
                    <div 
                      key={product.id} 
                      className={`flex items-center justify-between p-3 border rounded-xl transition-colors cursor-pointer ${isSelected ? 'border-[#1a1a1a] bg-[#f4f2f0]' : 'border-transparent hover:bg-[#f8f8f6]'}`} 
                      onClick={() => setSelectedProduct(product)}
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-lg bg-white overflow-hidden flex items-center justify-center border border-black/5">
                          {product.image_url ? (
                            <img src={product.image_url} alt={product.name} className="w-full h-full object-cover" />
                          ) : (
                            <span className="material-symbols-outlined text-[16px] text-[#aaa]">image</span>
                          )}
                        </div>
                        <div>
                          <span className="font-semibold text-sm text-[#1a1a1a] block leading-none mb-1">{product.name}</span>
                          <span className="text-[10px] text-[#aaa] uppercase tracking-wider">{product.category || 'General'}</span>
                        </div>
                      </div>
                      
                      <div className={`w-6 h-6 rounded-full flex items-center justify-center transition-colors ${isFeatured ? 'bg-[#1a1a1a] text-white' : 'bg-transparent border-2 border-[#ece9e2] text-transparent'}`}>
                        <span className="material-symbols-outlined text-[14px]" style={{ fontVariationSettings: "'wght' 600" }}>check</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
          
          <div className="mt-4 border-t border-[#ece9e2] pt-4">
            <button 
              onClick={() => toggleFeatured(selectedProduct)}
              disabled={!selectedProduct || featuredProducts.some(p => p.id === selectedProduct.id)}
              className="w-full bg-[#1a1a1a] text-white font-semibold text-sm px-4 py-3.5 rounded-xl hover:bg-[#333] transition-colors shadow-md disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              <span className="material-symbols-outlined text-[18px]" style={{ fontVariationSettings: "'wght' 300" }}>star</span>
              {selectedProduct ? (featuredProducts.some(p => p.id === selectedProduct.id) ? 'Ya está destacado' : 'Destacar Producto') : 'Selecciona un producto'}
            </button>
          </div>
        </div>

      </div>

      {/* Preview Section */}
      <div className="mt-8 bg-[#f8f8f6] rounded-[32px] p-8 border border-black/5 shadow-inner hidden md:block">
        <div className="flex items-center gap-2 mb-6">
          <span className="material-symbols-outlined text-[#aaa] text-[20px]">visibility</span>
          <h3 className="font-semibold text-[#555] text-sm">Vista previa (Home)</h3>
        </div>
        
        <div className="flex gap-4 overflow-x-auto pb-4 no-scrollbar">
          {featuredProducts.length === 0 ? (
            <div className="text-[#aaa] text-sm italic">La sección de destacados está vacía.</div>
          ) : (
            featuredProducts.map(product => (
              <div key={product.id} className="w-48 flex-shrink-0 bg-white rounded-2xl overflow-hidden shadow-sm border border-black/5">
                <div className="h-48 bg-[#eeecea] flex items-center justify-center">
                  {product.image_url ? (
                    <img src={product.image_url} alt={product.name} className="w-full h-full object-cover" />
                  ) : (
                    <span className="material-symbols-outlined text-[#ccc]">image</span>
                  )}
                </div>
                <div className="p-3">
                  <span className="text-[9px] font-semibold text-[#aaa] uppercase tracking-widest block mb-1">{product.category}</span>
                  <h4 className="font-semibold text-xs text-[#1a1a1a] leading-tight truncate">{product.name}</h4>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </main>
  );
}
