'use client';

import React, { useState, useEffect } from 'react';
import { ReorderGroup, ReorderItem } from '@/components/admin/Reorder';
import { supabase } from '@/utils/supabase/client';
import { revalidateCatalog } from '@/app/admin/actions';
import AdminDialog from '@/components/admin/AdminDialog';

export default function AdminFeaturedPage() {
  const [products, setProducts] = useState<any[]>([]);
  const [featuredProducts, setFeaturedProducts] = useState<any[]>([]);
  const [selectedProduct, setSelectedProduct] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  /* Fase 17: un único modal de resultado, cerrable por el usuario.
     Antes eran dos banners que desaparecían solos con setTimeout. */
  const [dialog, setDialog] = useState<{
    variant: 'success' | 'error' | 'warning';
    title: string;
    body: string;
  } | null>(null);
  const MAX_FEATURED = 10;

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

  /* Fase 11: el efecto va después de `fetchData` para no referenciarla antes de
     su declaración (error que marcaba el linter). */
  useEffect(() => {
    fetchData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const toggleFeatured = (product: any) => {
    if (!product) return;
    const isCurrentlyFeatured = featuredProducts.some(p => p.id === product.id);
    
    if (isCurrentlyFeatured) {
      setFeaturedProducts(featuredProducts.filter(p => p.id !== product.id));
    } else {
      if (featuredProducts.length >= MAX_FEATURED) {
        // Fase 17: aviso en modal cerrable.
        setDialog({
          variant: 'warning',
          title: 'Límite alcanzado',
          body: `Puedes destacar hasta ${MAX_FEATURED} productos. Quita uno antes de añadir otro.`,
        });
        return;
      }
      setFeaturedProducts([...featuredProducts, { ...product, is_featured: true }]);
    }
    setSelectedProduct(null); // Clear selection after action
  };

  const handleSave = async () => {
    setSaving(true);


    // First, set all products to not featured
    const { error: clearError } = await supabase
      .from('products')
      .update({ is_featured: false })
      .neq('id', '00000000-0000-0000-0000-000000000000'); // Hack to update all rows

    if (clearError) {
      console.error('Error al limpiar destacados:', clearError);
      setDialog({ variant: 'error', title: 'No se pudo guardar', body: 'Revisa tu conexión e inténtalo de nuevo.' });
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
      setDialog({ variant: 'error', title: 'Guardado incompleto', body: 'Algunos destacados no se guardaron. Vuelve a intentarlo.' });
      setSaving(false);
      return;
    }

    // Fase 7 (1.5): los destacados se ven en la portada publica.
    await revalidateCatalog();

    setSaving(false);
    // Fase 17: modal de éxito cerrable.
    setDialog({
      variant: 'success',
      title: 'Destacados guardados',
      body: 'El orden y la selección ya se ven en la portada.',
    });
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
              <ReorderGroup values={featuredProducts} onReorder={setFeaturedProducts} className="flex flex-col gap-2">
                      {featuredProducts.map((cat) => (
                    <ReorderItem 
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
                    </ReorderItem>
                  ))}
                  </ReorderGroup>
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
              /* Fase 13: filas de esqueleto en vez de "Cargando catálogo...". */
              <div className="flex flex-col gap-2" aria-hidden="true">
                {Array.from({ length: 6 }).map((_, i) => (
                  <div key={i} className="flex items-center gap-3 p-3 rounded-2xl">
                    <div className="h-12 w-12 rounded-xl skeleton-shimmer shrink-0" />
                    <div className="flex-1">
                      <div className="h-3.5 w-2/3 rounded skeleton-shimmer mb-2" />
                      <div className="h-2.5 w-1/3 rounded skeleton-shimmer" />
                    </div>
                  </div>
                ))}
              </div>
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

      {/* Fase 17: modal de resultado, cerrable con ✕, Escape o el botón. */}
      <AdminDialog
        open={!!dialog}
        variant={dialog?.variant === 'warning' ? 'warning' : (dialog?.variant ?? 'success')}
        title={dialog?.title ?? ''}
        confirmLabel="Entendido"
        onConfirm={() => setDialog(null)}
        onCancel={() => setDialog(null)}
      >
        {dialog?.body}
      </AdminDialog>
    </main>
  );
}
