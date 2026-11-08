'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { ReorderGroup, ReorderItem } from '@/components/admin/Reorder';
import { supabase } from '@/utils/supabase/client';
import { revalidateCatalog } from '@/app/admin/actions';
import AdminDialog from '@/components/admin/AdminDialog';

const MAX_FEATURED = 10;

/**
 * Fase 18 — Selección múltiple en Destacados.
 *
 * ANTES: había que pulsar una fila para «seleccionarla» y después pulsar un
 * botón «Destacar Producto». Dos pasos poco evidentes: la fila parecía no
 * responder al primer clic y hacían falta varios clics para notar el cambio.
 *
 * AHORA: pulsar una fila la marca/desmarca directamente (una sola acción) y se
 * pueden marcar varios productos seguidos. El botón «Guardar cambios» aplica
 * todo de una vez. La cuenta de seleccionados y el límite se ven en todo momento.
 */
export default function AdminFeaturedPage() {
  const [products, setProducts] = useState<any[]>([]);
  const [featuredProducts, setFeaturedProducts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [search, setSearch] = useState('');

  /* Fase 17: modal de resultado, cerrable por el usuario. */
  const [dialog, setDialog] = useState<{
    variant: 'success' | 'error' | 'warning';
    title: string;
    body: string;
  } | null>(null);

  const fetchData = async () => {
    setLoading(true);
    const { data } = await supabase
      .from('products')
      .select('id, name, category, image_url, is_featured, order_index')
      .order('created_at', { ascending: false });

    if (data) {
      setProducts(data);
      const featured = data
        .filter((p) => p.is_featured)
        .sort((a, b) => (a.order_index || 0) - (b.order_index || 0));
      setFeaturedProducts(featured);
    }
    setLoading(false);
  };

  /* Fase 11: el efecto va después de `fetchData`. */
  useEffect(() => {
    fetchData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const featuredIds = useMemo(
    () => new Set(featuredProducts.map((p) => p.id)),
    [featuredProducts]
  );

  /**
   * Marca/desmarca un producto destacado. Una sola acción: si ya está, se
   * quita; si no, se añade. Respeta el límite máximo.
   */
  const toggleProduct = (product: any) => {
    if (!product) return;

    if (featuredIds.has(product.id)) {
      setFeaturedProducts(featuredProducts.filter((p) => p.id !== product.id));
      return;
    }

    if (featuredProducts.length >= MAX_FEATURED) {
      setDialog({
        variant: 'warning',
        title: 'Límite alcanzado',
        body: `Puedes destacar hasta ${MAX_FEATURED} productos. Quita alguno antes de añadir otro.`,
      });
      return;
    }

    setFeaturedProducts([...featuredProducts, { ...product, is_featured: true }]);
  };

  const handleSave = async () => {
    setSaving(true);

    // 1. Quitar el destacado a todos.
    const { error: clearError } = await supabase
      .from('products')
      .update({ is_featured: false })
      .neq('id', '00000000-0000-0000-0000-000000000000');

    if (clearError) {
      console.error('Error al limpiar destacados:', clearError);
      setDialog({ variant: 'error', title: 'No se pudo guardar', body: 'Revisa tu conexión e inténtalo de nuevo.' });
      setSaving(false);
      return;
    }

    // 2. Marcar los seleccionados en su orden.
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

    await revalidateCatalog();
    await fetchData();

    setSaving(false);
    setDialog({
      variant: 'success',
      title: 'Destacados guardados',
      body:
        featuredProducts.length === 0
          ? 'No hay productos destacados ahora mismo.'
          : `${featuredProducts.length} producto${featuredProducts.length === 1 ? '' : 's'} destacado${featuredProducts.length === 1 ? '' : 's'}. Se verán primero en el catálogo.`,
    });
  };

  /* Lista filtrada por búsqueda, con los destacados arriba. */
  const visibleProducts = useMemo(() => {
    const q = search.trim().toLowerCase();
    const list = q
      ? products.filter(
          (p) =>
            p.name?.toLowerCase().includes(q) || p.category?.toLowerCase().includes(q)
        )
      : products;
    // Los ya destacados primero, para verlos de un vistazo.
    return [...list].sort((a, b) => {
      const fa = featuredIds.has(a.id) ? 0 : 1;
      const fb = featuredIds.has(b.id) ? 0 : 1;
      return fa - fb;
    });
  }, [products, search, featuredIds]);

  return (
    <main className="flex-1 p-4 md:p-8 w-full max-w-6xl self-start flex flex-col gap-6 pb-[100px] md:pb-8">
      {/* Cabecera */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-5">
        <div>
          <h1 className="text-[26px] md:text-[30px] font-semibold tracking-tight text-[#1a1a1a] mb-1">
            Productos Destacados
          </h1>
          <p className="text-sm text-[#888]">
            Toca los productos que quieras destacar. Se mostrarán primero en el catálogo.
          </p>
        </div>
        <div className="flex gap-3 w-full md:w-auto">
          <button
            onClick={handleSave}
            disabled={saving || loading}
            className="flex-1 md:flex-none bg-[#1a1a1a] text-white font-semibold text-sm px-6 py-3.5 rounded-2xl flex items-center justify-center gap-2 hover:bg-[#333] transition-colors shadow-[0_4px_16px_rgba(0,0,0,0.08)] active:scale-95 disabled:opacity-50"
          >
            <span className="material-symbols-outlined text-[18px]" style={{ fontVariationSettings: "'wght' 300" }}>
              save
            </span>
            {saving ? 'Guardando...' : 'Guardar cambios'}
          </button>
        </div>
      </div>

      {/* Contador y buscador */}
      <div className="flex flex-col md:flex-row gap-3 md:items-center md:justify-between">
        <div className="flex items-center gap-2">
          <span
            className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-semibold ${
              featuredProducts.length >= MAX_FEATURED
                ? 'bg-[#fff8e1] text-[#8a5a00]'
                : 'bg-[#eef7ee] text-[#2e7d32]'
            }`}
          >
            <span className="material-symbols-outlined text-[15px]">star</span>
            {featuredProducts.length} de {MAX_FEATURED} destacados
          </span>
          {featuredProducts.length > 0 && (
            <button
              onClick={() => setFeaturedProducts([])}
              className="text-xs font-medium text-[#888] underline underline-offset-2 hover:text-[#1a1a1a]"
            >
              Quitar todos
            </button>
          )}
        </div>

        <div className="relative md:w-64">
          <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-[16px] text-[#aaa]">
            search
          </span>
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar producto..."
            className="w-full rounded-xl border border-[#ece9e2] bg-white py-2.5 pl-9 pr-3 text-sm outline-none focus:border-[#1a1a1a]"
          />
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-start">
        {/* Lista para seleccionar */}
        <div className="bg-white rounded-3xl p-5 border border-black/5 shadow-[0_2px_12px_rgba(0,0,0,0.03)]">
          <h2 className="mb-4 font-semibold text-[#1a1a1a]">Catálogo</h2>

          <div className="max-h-[60vh] overflow-y-auto pr-1 no-scrollbar">
            {loading ? (
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
            ) : visibleProducts.length === 0 ? (
              <p className="py-10 text-center text-sm text-[#888]">
                {search.trim() ? 'Ningún producto coincide con la búsqueda.' : 'No hay productos.'}
              </p>
            ) : (
              <div className="flex flex-col gap-2">
                {visibleProducts.map((product) => {
                  const isFeatured = featuredIds.has(product.id);
                  return (
                    <button
                      key={product.id}
                      type="button"
                      onClick={() => toggleProduct(product)}
                      aria-pressed={isFeatured}
                      className={`flex w-full items-center justify-between rounded-xl border p-3 text-left transition-colors active:scale-[0.99] ${
                        isFeatured
                          ? 'border-[#1a1a1a] bg-[#f4f2f0]'
                          : 'border-transparent hover:bg-[#f8f8f6]'
                      }`}
                    >
                      <div className="flex min-w-0 items-center gap-3">
                        <div className="flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-lg border border-black/5 bg-white">
                          {product.image_url ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img src={product.image_url} alt={product.name} className="h-full w-full object-cover" />
                          ) : (
                            <span className="material-symbols-outlined text-[16px] text-[#aaa]">image</span>
                          )}
                        </div>
                        <div className="min-w-0">
                          <span className="block truncate text-sm font-semibold leading-none text-[#1a1a1a]">
                            {product.name}
                          </span>
                          <span className="mt-1 block truncate text-[10px] uppercase tracking-wider text-[#aaa]">
                            {product.category || 'General'}
                          </span>
                        </div>
                      </div>

                      {/* Marca de seleccionado */}
                      <span
                        className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full transition-colors ${
                          isFeatured
                            ? 'bg-[#1a1a1a] text-white'
                            : 'border-2 border-[#ece9e2] text-transparent'
                        }`}
                      >
                        <span className="material-symbols-outlined text-[14px]" style={{ fontVariationSettings: "'wght' 600" }}>
                          check
                        </span>
                      </span>
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Seleccionados, en su orden */}
        <div className="bg-white rounded-3xl p-5 border border-black/5 shadow-[0_2px_12px_rgba(0,0,0,0.03)]">
          <h2 className="mb-1 font-semibold text-[#1a1a1a]">Destacados</h2>
          <p className="mb-4 text-xs text-[#888]">Arrastra para cambiar el orden en que aparecen.</p>

          {featuredProducts.length === 0 ? (
            <p className="py-10 text-center text-sm text-[#888]">
              Aún no has destacado ningún producto.
            </p>
          ) : (
            <ReorderGroup values={featuredProducts} onReorder={setFeaturedProducts} className="flex flex-col gap-2">
              {featuredProducts.map((product, index) => (
                <ReorderItem
                  key={product.id}
                  value={product}
                  className="flex items-center justify-between gap-3 rounded-2xl border border-black/5 bg-[#fcfcfb] p-3"
                >
                  <div className="flex min-w-0 items-center gap-3">
                    <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-[#1a1a1a] text-[11px] font-bold text-white">
                      {index + 1}
                    </span>
                    <div className="flex h-9 w-9 shrink-0 items-center justify-center overflow-hidden rounded-lg bg-white">
                      {product.image_url ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={product.image_url} alt={product.name} className="h-full w-full object-cover" />
                      ) : (
                        <span className="material-symbols-outlined text-[14px] text-[#aaa]">image</span>
                      )}
                    </div>
                    <span className="truncate text-sm font-medium text-[#1a1a1a]">{product.name}</span>
                  </div>

                  <button
                    type="button"
                    onClick={() => toggleProduct(product)}
                    aria-label={`Quitar ${product.name} de destacados`}
                    className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-[#aaa] transition-colors hover:bg-[#f4f2f0] hover:text-[#c62828] active:scale-90"
                  >
                    <span className="material-symbols-outlined text-[17px]">close</span>
                  </button>
                </ReorderItem>
              ))}
            </ReorderGroup>
          )}
        </div>
      </div>

      {/* Fase 17: modal de resultado, cerrable. */}
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
