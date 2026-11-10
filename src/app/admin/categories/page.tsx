'use client';

import React, { useState, useEffect } from 'react';
import { supabase } from '@/utils/supabase/client';
import { revalidateCatalog } from '@/app/admin/actions';
import AdminDialog from '@/components/admin/AdminDialog';

export default function AdminCategoriesPage() {
  const [categories, setCategories] = useState<any[]>([]);
  const [products, setProducts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  /* Fase 33: el orden se guarda con un boton explicito. */
  const [orderDirty, setOrderDirty] = useState(false);
  const [savingOrder, setSavingOrder] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  /* Fase 17: modal de resultado, cerrable por el usuario. */
  const [resultDialog, setResultDialog] = useState<{
    variant: 'success' | 'error';
    title: string;
    body: string;
  } | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');

  // Fase 7: confirmación propia en lugar de `confirm()` del navegador.
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [categoryToDelete, setCategoryToDelete] = useState<any | null>(null);

  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [productSearch, setProductSearch] = useState('');

  const [formData, setFormData] = useState({ name: '', featured_product_id: '' });

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

  /* Fase 11: el efecto va DESPUÉS de las funciones que usa. Antes se declaraba
     arriba y las llamaba antes de su definición, lo que el linter marcaba como
     "Cannot access variable before it is declared". */
  useEffect(() => {
    fetchCategories();
    fetchProducts();
    // Se ejecuta una sola vez al montar; las funciones son estables en este uso.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /* Fase 33 — guardar el orden de las categorías.
     BUG CORREGIDO: se hacía `upsert([{ id, name, order_index }])`. Un upsert
     con campos omitidos los pone a NULL, así que al reordenar se BORRABAN
     `icon` y `featured_product_id` de todas las categorías.
     Ahora se envía el objeto completo de cada categoría, y solo los campos que
     existen en la tabla. Además se separa el estado optimista del guardado:

       onReorder  -> solo actualiza la vista (arrastre fluido)
       saveOrder  -> escribe en la base con un botón explícito

     Esto también resuelve el «no puedo organizar correctamente»: antes cada
     movimiento del arrastre disparaba una escritura y, si fallaba una, el
     orden quedaba a medias. */
  const handleReorder = (newOrder: any[]) => {
    if (searchTerm.trim()) return; // No reordenar mientras se busca.
    setCategories(newOrder);
    setOrderDirty(true);
  };

  /**
   * Fase 33 — mueve una categoría una posición arriba (-1) o abajo (+1).
   * Sustituye al arrastre: funciona igual con dedo y con ratón, sin
   * conflictos con el scroll de la página.
   */
  const moveCategory = (index: number, direction: -1 | 1) => {
    if (searchTerm.trim()) return; // No se puede reordenar filtrando.

    const target = index + direction;
    if (target < 0 || target >= categories.length) return;

    const next = [...categories];
    [next[index], next[target]] = [next[target], next[index]];
    handleReorder(next);
  };

  const saveOrder = async () => {
    setSavingOrder(true);
    setFormError(null);

    const updates = categories.map((cat, index) => ({
      id: cat.id,
      name: cat.name,
      order_index: index,
      // Se conservan explícitamente para que el upsert no los anule.
      icon: cat.icon ?? null,
      featured_product_id: cat.featured_product_id ?? null,
    }));

    const { error } = await supabase.from('categories').upsert(updates);

    if (error) {
      console.error('Error al reordenar categorías:', error);
      setFormError('No se pudo guardar el orden. Vuelve a intentarlo.');
      setSavingOrder(false);
      return;
    }

    // El orden se ve en la portada pública: hay que revalidarla.
    await revalidateCatalog();
    setOrderDirty(false);
    setSavingOrder(false);
    setResultDialog({
      variant: 'success',
      title: 'Orden guardado',
      body: 'El catálogo público ya muestra las categorías en este orden.',
    });
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
        setResultDialog({ variant: 'error', title: 'No se pudo actualizar', body: 'Revisa tu conexión e inténtalo de nuevo.' });
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
        setResultDialog({ variant: 'error', title: 'No se pudo crear', body: 'Revisa tu conexión e inténtalo de nuevo.' });
        setSaving(false);
        return;
      }
      setCategories([...categories, data[0]]);
    }

    // Fase 7 (1.5): reflejar el cambio en el catálogo público al instante.
    await revalidateCatalog();

    /* Fase 17: se informa con un modal cerrable en lugar de un mensaje efímero. */
    setResultDialog({
      variant: 'success',
      title: editingId ? 'Categoría actualizada' : 'Categoría creada',
      body: 'Los cambios ya se ven en el catálogo público.',
    });

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
      setResultDialog({
        variant: 'error',
        title: 'No se pudo eliminar',
        body: 'Puede que la categoría tenga productos asociados o que no tengas permisos.',
      });
      return;
    }

    await revalidateCatalog();

    setResultDialog({
      variant: 'success',
      title: 'Categoría eliminada',
      body: 'Los productos de esa categoría siguen existiendo, pero ya no la tienen asignada.',
    });
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

      <div className="grid grid-cols-1 items-start gap-6 md:grid-cols-3">

        {/* Editor del formulario (Fase 33).
            ANTES: `sticky top-[80px]`. El header del panel mide 56px en móvil y
            64px en escritorio, así que ese `top-[80px]` no coincidía: la tarjeta
            se despegaba, dejaba una franja muerta y el contenedor con
            `overflow-hidden` de al lado la tapaba al hacer scroll.
            AHORA: en escritorio es sticky con el offset correcto (se pega justo
            bajo el header) y en móvil es estático, para que el scroll sea
            natural y nada se monte encima. */}
        <div className="w-full rounded-3xl border border-black/5 bg-white p-5 shadow-[0_2px_12px_rgba(0,0,0,0.03)] md:col-span-1 md:sticky md:top-[72px] md:p-6 lg:top-[80px]">
          <h3 className="mb-5 text-lg font-semibold text-[#1a1a1a]">
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

        {/* Categories List (Fase 33).
            Se quita `overflow-hidden` del contenedor: era lo que ocultaba los
            desplegables y el contenido que sobresalía al hacer scroll, y hacía
            que el recuadro de «Nueva categoría» quedara tapado. Cada zona
            maneja su propio scroll donde de verdad hace falta. */}
        <div className="w-full md:col-span-2 rounded-3xl border border-black/5 bg-white shadow-[0_2px_12px_rgba(0,0,0,0.03)]">
          <div className="flex flex-col justify-between gap-3 border-b border-[#ece9e2] bg-[#fcfcfb] p-4 md:flex-row md:items-center md:p-5">
            <span className="min-w-0 flex-1 truncate text-[11px] font-semibold uppercase tracking-wider text-[#6b6b6b]">
              {searchTerm.trim()
                ? 'Resultados de búsqueda'
                : `Tus categorías · ${categories.length}`}
            </span>

            <div className="flex items-center gap-2">
              {/* Guardar el orden: solo aparece si hay cambios pendientes. */}
              {orderDirty && !searchTerm.trim() && (
                <button
                  onClick={saveOrder}
                  disabled={savingOrder}
                  className="flex shrink-0 items-center gap-1.5 rounded-xl bg-[#1a1a1a] px-3.5 py-2 text-[12px] font-semibold text-white transition-colors hover:bg-[#333] active:scale-95 disabled:opacity-50"
                >
                  <span className="material-symbols-outlined text-[15px]">save</span>
                  {savingOrder ? 'Guardando…' : 'Guardar orden'}
                </button>
              )}

              <div className="relative w-full md:w-56 md:shrink-0">
                <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-[18px] text-[#aaa]">search</span>
                <input
                  type="text"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="Buscar categoría..."
                  className="w-full rounded-xl border border-[#ece9e2] bg-white py-2 pl-10 pr-4 text-sm text-[#1a1a1a] shadow-sm outline-none transition-all focus:border-black/10"
                />
              </div>
            </div>
          </div>

          {loading ? (
            <div aria-hidden="true">
              {Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="flex items-center gap-4 p-4 border-b border-[#ece9e2] last:border-none">
                  <div className="h-5 w-5 rounded skeleton-shimmer shrink-0" />
                  <div className="flex-1">
                    <div className="h-3.5 w-2/5 rounded skeleton-shimmer mb-2" />
                    <div className="h-2.5 w-1/4 rounded skeleton-shimmer" />
                  </div>
                  <div className="h-8 w-8 rounded-full skeleton-shimmer" />
                </div>
              ))}
            </div>
          ) : categories.length === 0 ? (
            <div className="p-10 text-center text-[#888]">No hay categorías. Crea una.</div>
          ) : (
            /* Fase 33: se sustituye el arrastre por botones subir/bajar.
               El arrastre en listas largas y en móvil era poco fiable (el dedo
               desplazaba la página en vez de la fila) y el dueño no podía
               organizar las categorías.
               Los botones funcionan igual de bien con dedo y con ratón y el
               resultado se guarda con «Guardar orden». */
            <div className="flex flex-col">
              {(searchTerm.trim()
                ? categories.filter((c) => c.name.toLowerCase().includes(searchTerm.toLowerCase()))
                : categories
              ).map((cat, idx, arr) => {
                const prod = products.find((p) => p.id === cat.featured_product_id);
                const puedeSubir = idx > 0 && !searchTerm.trim();
                const puedeBajar = idx < arr.length - 1 && !searchTerm.trim();

                return (
                  <div
                    key={cat.id}
                    className="flex items-center justify-between gap-2 border-b border-[#ece9e2] bg-white p-3 transition-colors last:border-none hover:bg-[#fcfcfb] md:p-4"
                  >
                    <div className="flex min-w-0 items-center gap-3">
                      {/* Orden + botones subir/bajar */}
                      {!searchTerm.trim() ? (
                        <div className="flex shrink-0 flex-col items-center gap-0.5">
                          <button
                            onClick={() => moveCategory(idx, -1)}
                            disabled={!puedeSubir}
                            aria-label={`Subir ${cat.name}`}
                            className="flex size-6 items-center justify-center rounded text-[#bbb] transition-colors hover:bg-[#f4f2f0] hover:text-[#1a1a1a] disabled:opacity-25 disabled:hover:bg-transparent"
                          >
                            <span className="material-symbols-outlined text-[16px]">arrow_upward</span>
                          </button>
                          <span className="text-[10px] font-bold tabular-nums text-[#ccc]">{idx + 1}</span>
                          <button
                            onClick={() => moveCategory(idx, 1)}
                            disabled={!puedeBajar}
                            aria-label={`Bajar ${cat.name}`}
                            className="flex size-6 items-center justify-center rounded text-[#bbb] transition-colors hover:bg-[#f4f2f0] hover:text-[#1a1a1a] disabled:opacity-25 disabled:hover:bg-transparent"
                          >
                            <span className="material-symbols-outlined text-[16px]">arrow_downward</span>
                          </button>
                        </div>
                      ) : (
                        <div className="w-6 shrink-0" />
                      )}

                      {/* Imagen destacada */}
                      <div className="flex size-10 shrink-0 items-center justify-center overflow-hidden rounded-lg border border-black/5 bg-[#e8e8e4] md:size-11">
                        {prod?.image_url ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img src={prod.image_url} alt={cat.name} className="size-full object-cover" />
                        ) : (
                          <span className="material-symbols-outlined text-[16px] text-[#aaa]">image</span>
                        )}
                      </div>

                      <div className="min-w-0">
                        <p className="truncate text-[13px] font-semibold text-[#1a1a1a] md:text-sm">
                          {cat.name}
                        </p>
                        <p className="truncate text-[11px] text-[#6b6b6b]">
                          {prod ? prod.name : 'Sin producto destacado'}
                        </p>
                      </div>
                    </div>

                    <div className="flex shrink-0 items-center gap-1">
                      <button
                        onClick={() => startEdit(cat)}
                        aria-label={`Editar ${cat.name}`}
                        className="flex size-9 items-center justify-center rounded-full text-[#777] transition-colors hover:bg-[#f4f2f0] hover:text-[#1a1a1a]"
                      >
                        <span className="material-symbols-outlined text-[18px]" style={{ fontVariationSettings: "'wght' 300" }}>
                          edit
                        </span>
                      </button>
                      <button
                        onClick={() => deleteCategory(cat.id)}
                        aria-label={`Eliminar ${cat.name}`}
                        className="flex size-9 items-center justify-center rounded-full text-[#c62828] transition-colors hover:bg-[#fdf3f3]"
                      >
                        <span className="material-symbols-outlined text-[18px]" style={{ fontVariationSettings: "'wght' 300" }}>
                          delete
                        </span>
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>

          )}
        </div>

      </div>

      {/* Fase 17: modal de confirmación unificado (cerrable con ✕ y Escape). */}
      <AdminDialog
        open={deleteModalOpen && !!categoryToDelete}
        variant="confirm"
        title="¿Eliminar categoría?"
        confirmLabel="Eliminar"
        cancelLabel="Cancelar"
        onConfirm={executeDeleteCategory}
        onCancel={() => {
          setDeleteModalOpen(false);
          setCategoryToDelete(null);
        }}
      >
        Se eliminará <strong>{categoryToDelete?.name}</strong>. Los productos no se
        borran, pero quedarán sin esa categoría.
      </AdminDialog>

      {/* Fase 17: modal de resultado de las operaciones. */}
      <AdminDialog
        open={!!resultDialog}
        variant={resultDialog?.variant ?? 'success'}
        title={resultDialog?.title ?? ''}
        confirmLabel="Entendido"
        onConfirm={() => setResultDialog(null)}
        onCancel={() => setResultDialog(null)}
      >
        {resultDialog?.body}
      </AdminDialog>

    </main>
  );
}
