'use client';

import React, { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { supabase } from '@/utils/supabase/client';
import { revalidateCatalog } from '@/app/admin/actions';
import AdminDialog from '@/components/admin/AdminDialog';
import { logActivity } from '@/utils/activityLog';

/**
 * Fase 33 — Administración de productos.
 *
 * Cambios principales:
 *  - SE ELIMINÓ EL ARRASTRE. Ya no hay `ReorderGroup`, ni iconos de arrastre, ni
 *    textos que inviten a arrastrar. El orden se decide en «Destacados».
 *  - En móvil: TARJETAS con foto grande, nombre, categoría, estado y acciones
 *    agrupadas y fáciles de pulsar (antes era una tabla comprimida).
 *  - En escritorio: tabla clara y cómoda.
 *  - Buscador y filtro por estado, porque con muchos productos era imposible
 *    encontrar nada.
 */

interface ProductRow {
  id: string;
  name: string;
  internal_code: string | null;
  category: string | null;
  status: string | null;
  image_url: string | null;
  tags: string[] | null;
  sizes: string[] | null;
  color_name: string | null;
}

const STATUS_META: Record<string, { bg: string; text: string; dot: string }> = {
  Disponible: { bg: 'bg-[#eef7ee]', text: 'text-[#2e7d32]', dot: 'bg-[#2e7d32]' },
  Oculto: { bg: 'bg-[#f4f2f0]', text: 'text-[#6b6b6b]', dot: 'bg-[#9e9e9e]' },
  Agotado: { bg: 'bg-[#fdf3f3]', text: 'text-[#c62828]', dot: 'bg-[#c62828]' },
  Próximamente: { bg: 'bg-[#fff8e1]', text: 'text-[#8a5a00]', dot: 'bg-[#f57f17]' },
};

export default function AdminProductsPage() {
  const [products, setProducts] = useState<ProductRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('Todos');

  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [productToDelete, setProductToDelete] = useState<ProductRow | null>(null);
  const [dialog, setDialog] = useState<{
    variant: 'success' | 'error';
    title: string;
    body: string;
  } | null>(null);

  const fetchProducts = async (showSpinner = true) => {
    if (showSpinner) setLoading(true);

    const { data, error } = await supabase
      .from('products')
      .select('id, name, internal_code, category, status, image_url, tags, sizes, color_name')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error cargando productos:', error);
      setLoadError(true);
    } else if (data) {
      setProducts(data as ProductRow[]);
      setLoadError(false);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchProducts(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /* Filtro aplicado: búsqueda por nombre/código/categoría + estado. */
  const visible = useMemo(() => {
    const q = search.trim().toLowerCase();
    return products.filter((p) => {
      const matchesStatus = statusFilter === 'Todos' || (p.status || 'Disponible') === statusFilter;
      if (!matchesStatus) return false;
      if (!q) return true;
      return (
        p.name?.toLowerCase().includes(q) ||
        p.internal_code?.toLowerCase().includes(q) ||
        p.category?.toLowerCase().includes(q)
      );
    });
  }, [products, search, statusFilter]);

  const counts = useMemo(() => {
    const activos = products.filter((p) => (p.status || 'Disponible') === 'Disponible').length;
    return { total: products.length, activos, inactivos: products.length - activos };
  }, [products]);

  const toggleStatus = async (p: ProductRow) => {
    const current = p.status || 'Disponible';
    const next = current === 'Disponible' ? 'Oculto' : 'Disponible';

    // Optimista + reversión si falla.
    const previous = products;
    setProducts(products.map((x) => (x.id === p.id ? { ...x, status: next } : x)));

    const { error } = await supabase.from('products').update({ status: next }).eq('id', p.id);

    if (error) {
      console.error('Error al cambiar el estado:', error);
      setProducts(previous);
      setDialog({
        variant: 'error',
        title: 'No se pudo cambiar el estado',
        body: 'Revisa tu conexión e inténtalo de nuevo.',
      });
      return;
    }

    logActivity({
      action: 'status',
      entity: 'product',
      entityName: p.name,
      detail: next,
    });

    await revalidateCatalog();
  };

  const executeDelete = async () => {
    if (!productToDelete) return;

    const target = productToDelete;
    const previous = products;
    setProducts(products.filter((p) => p.id !== target.id));
    setDeleteModalOpen(false);
    setProductToDelete(null);

    const { error } = await supabase.from('products').delete().eq('id', target.id);

    if (error) {
      console.error('Error al eliminar el producto:', error);
      setProducts(previous);
      setDialog({
        variant: 'error',
        title: 'No se pudo eliminar',
        body: 'El producto sigue en el catálogo. Revisa tu conexión e inténtalo de nuevo.',
      });
      return;
    }

    logActivity({ action: 'delete', entity: 'product', entityName: target.name });
    await revalidateCatalog();

    setDialog({
      variant: 'success',
      title: 'Producto eliminado',
      body: `«${target.name}» ya no aparece en el catálogo.`,
    });
  };

  return (
    <main className="mx-auto flex w-full max-w-7xl flex-1 flex-col gap-5 p-4 pb-[100px] md:gap-6 md:p-8 md:pb-8">
      {/* Cabecera */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div className="min-w-0">
          <h2 className="text-[24px] font-semibold leading-tight tracking-tight text-[#1a1a1a] md:text-[30px]">
            Productos
          </h2>
          <p className="mt-1 text-[13px] text-[#6b6b6b] md:text-sm">
            {counts.total} en total · <span className="text-[#2e7d32]">{counts.activos} activos</span>
            {counts.inactivos > 0 && (
              <> · <span className="text-[#8a5a00]">{counts.inactivos} ocultos</span></>
            )}
          </p>
        </div>

        <Link
          href="/admin/products/new"
          className="flex items-center justify-center gap-2 rounded-xl bg-[#1a1a1a] px-5 py-3 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-[#333] active:scale-95"
        >
          <span className="material-symbols-outlined text-[18px]" style={{ fontVariationSettings: "'wght' 300" }}>
            add
          </span>
          Nuevo producto
        </Link>
      </div>

      {/* Buscador y filtros */}
      <div className="flex flex-col gap-2.5 sm:flex-row sm:items-center">
        <div className="relative flex-1">
          <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-[18px] text-[#aaa]">
            search
          </span>
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar por nombre, código o categoría…"
            className="w-full rounded-xl border border-[#ece9e2] bg-white py-2.5 pl-10 pr-3 text-sm text-[#1a1a1a] outline-none transition-colors focus:border-[#1a1a1a]"
          />
        </div>

        <div className="flex gap-1.5 overflow-x-auto pb-1 no-scrollbar">
          {['Todos', 'Disponible', 'Oculto'].map((s) => {
            const active = statusFilter === s;
            return (
              <button
                key={s}
                onClick={() => setStatusFilter(s)}
                aria-pressed={active}
                className={`shrink-0 rounded-full px-3.5 py-2 text-[12px] font-semibold transition-colors ${
                  active ? 'bg-[#1a1a1a] text-white' : 'bg-white text-[#555] hover:bg-[#f4f2f0]'
                }`}
              >
                {s}
              </button>
            );
          })}
        </div>
      </div>

      {/* Estado de carga */}
      {loading ? (
        <div aria-hidden="true" className="flex flex-col gap-2.5">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="flex items-center gap-3 rounded-2xl bg-white p-3">
              <div className="size-14 shrink-0 rounded-xl skeleton-shimmer" />
              <div className="flex-1">
                <div className="mb-2 h-3.5 w-2/3 rounded skeleton-shimmer" />
                <div className="h-2.5 w-1/3 rounded skeleton-shimmer" />
              </div>
            </div>
          ))}
        </div>
      ) : loadError ? (
        <div className="flex flex-col items-center rounded-2xl border border-black/5 bg-white py-14 text-center">
          <span className="material-symbols-outlined mb-2 text-[32px] text-[#ddd]">wifi_off</span>
          <p className="mb-3 text-sm font-medium text-[#555]">No pudimos cargar los productos.</p>
          <button
            onClick={() => { setLoadError(false); fetchProducts(); }}
            className="rounded-xl bg-[#1a1a1a] px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-[#333]"
          >
            Reintentar
          </button>
        </div>
      ) : visible.length === 0 ? (
        <div className="flex flex-col items-center rounded-2xl border border-black/5 bg-white py-14 text-center">
          <span className="material-symbols-outlined mb-2 text-[32px] text-[#ddd]">inventory_2</span>
          <p className="mb-1 text-sm font-medium text-[#555]">
            {products.length === 0 ? 'Aún no hay productos' : 'Ningún producto coincide'}
          </p>
          <p className="mb-4 max-w-[260px] text-[12px] leading-relaxed text-[#999]">
            {products.length === 0
              ? 'Crea el primero para que aparezca en el catálogo.'
              : 'Prueba con otra búsqueda o cambia el filtro de estado.'}
          </p>
          {products.length === 0 && (
            <Link
              href="/admin/products/new"
              className="rounded-xl bg-[#1a1a1a] px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-[#333]"
            >
              Crear producto
            </Link>
          )}
        </div>
      ) : (
        <>
          {/* ── MÓVIL: tarjetas ─────────────────────────────────────────── */}
          <div className="flex flex-col gap-2.5 md:hidden">
            {visible.map((p) => {
              const meta = STATUS_META[p.status || 'Disponible'] || STATUS_META.Disponible;
              const activo = (p.status || 'Disponible') === 'Disponible';

              return (
                <article
                  key={p.id}
                  className="overflow-hidden rounded-2xl border border-black/5 bg-white"
                >
                  <div className="flex gap-3 p-3">
                    {/* Foto */}
                    <Link
                      href={`/admin/products/${p.id}`}
                      className="relative size-20 shrink-0 overflow-hidden rounded-xl bg-[#f4f2f0]"
                    >
                      {p.image_url ? (
                        <Image
                          src={p.image_url}
                          alt={p.name}
                          fill
                          sizes="80px"
                          className="object-cover"
                        />
                      ) : (
                        <span className="flex size-full items-center justify-center">
                          <span className="material-symbols-outlined text-[20px] text-[#ccc]">image</span>
                        </span>
                      )}
                    </Link>

                    {/* Datos */}
                    <div className="min-w-0 flex-1">
                      <Link href={`/admin/products/${p.id}`} className="block">
                        <h3 className="line-clamp-2 text-[14px] font-semibold leading-snug text-[#1a1a1a]">
                          {p.name}
                        </h3>
                      </Link>

                      <p className="mt-0.5 truncate text-[11px] text-[#6b6b6b]">
                        {p.category || 'Sin categoría'}
                        {p.color_name ? ` · ${p.color_name}` : ''}
                      </p>

                      <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
                        <span
                          className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold ${meta.bg} ${meta.text}`}
                        >
                          <span className={`size-1.5 rounded-full ${meta.dot}`} />
                          {p.status || 'Disponible'}
                        </span>
                        {p.sizes && p.sizes.length > 0 && (
                          <span className="rounded-full bg-[#f4f2f0] px-2 py-0.5 text-[10px] font-medium text-[#6b6b6b]">
                            {p.sizes.length} tallas
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Acciones: botones grandes, uno por fila si hace falta */}
                  <div className="flex items-stretch gap-1.5 border-t border-[#f0eeeb] bg-[#fcfcfb] p-2">
                    <Link
                      href={`/admin/products/${p.id}`}
                      className="flex flex-1 items-center justify-center gap-1.5 rounded-lg bg-white py-2.5 text-[12px] font-semibold text-[#1a1a1a] ring-1 ring-[#ece9e2] active:scale-[0.98]"
                    >
                      <span className="material-symbols-outlined text-[16px]">edit</span>
                      Editar
                    </Link>

                    <Link
                      href={`/product?id=${p.id}`}
                      target="_blank"
                      aria-label={`Ver ${p.name} en la tienda`}
                      className="flex items-center justify-center gap-1.5 rounded-lg bg-white px-3 py-2.5 text-[12px] font-semibold text-[#555] ring-1 ring-[#ece9e2] active:scale-[0.98]"
                    >
                      <span className="material-symbols-outlined text-[16px]">visibility</span>
                    </Link>

                    <button
                      onClick={() => toggleStatus(p)}
                      aria-label={activo ? `Ocultar ${p.name}` : `Publicar ${p.name}`}
                      aria-pressed={!activo}
                      className={`flex items-center justify-center rounded-lg px-3 py-2.5 ring-1 active:scale-[0.98] ${
                        activo
                          ? 'bg-white text-[#8a5a00] ring-[#f0e0b8]'
                          : 'bg-white text-[#2e7d32] ring-[#d6e9d6]'
                      }`}
                    >
                      <span className="material-symbols-outlined text-[16px]">
                        {activo ? 'visibility_off' : 'visibility'}
                      </span>
                    </button>

                    <button
                      onClick={() => { setProductToDelete(p); setDeleteModalOpen(true); }}
                      aria-label={`Eliminar ${p.name}`}
                      className="flex items-center justify-center rounded-lg bg-white px-3 py-2.5 text-[#c62828] ring-1 ring-[#f2d6d6] active:scale-[0.98]"
                    >
                      <span className="material-symbols-outlined text-[16px]">delete</span>
                    </button>
                  </div>
                </article>
              );
            })}
          </div>

          {/* ── ESCRITORIO: tabla ───────────────────────────────────────── */}
          <div className="hidden overflow-hidden rounded-2xl border border-black/5 bg-white md:block">
            {/* Cabecera */}
            <div className="grid grid-cols-[3fr_1.4fr_1fr_1fr_auto] items-center gap-4 border-b border-[#ece9e2] bg-[#fcfcfb] px-5 py-3">
              <span className="text-[10px] font-bold uppercase tracking-widest text-[#999]">Producto</span>
              <span className="text-[10px] font-bold uppercase tracking-widest text-[#999]">Categoría</span>
              <span className="text-[10px] font-bold uppercase tracking-widest text-[#999]">Estado</span>
              <span className="text-[10px] font-bold uppercase tracking-widest text-[#999]">Tallas</span>
              <span className="w-[150px] text-right text-[10px] font-bold uppercase tracking-widest text-[#999]">
                Acciones
              </span>
            </div>

            {visible.map((p) => {
              const meta = STATUS_META[p.status || 'Disponible'] || STATUS_META.Disponible;
              const activo = (p.status || 'Disponible') === 'Disponible';

              return (
                <div
                  key={p.id}
                  className="grid grid-cols-[3fr_1.4fr_1fr_1fr_auto] items-center gap-4 border-b border-[#f2f0ed] px-5 py-3 last:border-none hover:bg-[#fcfcfb]"
                >
                  <div className="flex min-w-0 items-center gap-3">
                    <div className="relative size-11 shrink-0 overflow-hidden rounded-lg bg-[#f4f2f0]">
                      {p.image_url ? (
                        <Image src={p.image_url} alt={p.name} fill sizes="44px" className="object-cover" />
                      ) : (
                        <span className="flex size-full items-center justify-center">
                          <span className="material-symbols-outlined text-[16px] text-[#ccc]">image</span>
                        </span>
                      )}
                    </div>
                    <div className="min-w-0">
                      <p className="truncate text-[13px] font-semibold text-[#1a1a1a]">{p.name}</p>
                      <p className="truncate text-[11px] text-[#999]">
                        {p.internal_code || 'Sin código'}
                      </p>
                    </div>
                  </div>

                  <span className="truncate text-[12px] text-[#555]">{p.category || '—'}</span>

                  <span
                    className={`inline-flex w-fit items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold ${meta.bg} ${meta.text}`}
                  >
                    <span className={`size-1.5 rounded-full ${meta.dot}`} />
                    {p.status || 'Disponible'}
                  </span>

                  <span className="text-[12px] text-[#555]">
                    {p.sizes?.length ? p.sizes.join(' · ') : '—'}
                  </span>

                  <div className="flex w-[150px] items-center justify-end gap-1">
                    <Link
                      href={`/product?id=${p.id}`}
                      target="_blank"
                      aria-label={`Ver ${p.name} en la tienda`}
                      title="Ver en la tienda"
                      className="flex size-8 items-center justify-center rounded-lg text-[#777] transition-colors hover:bg-[#f4f2f0] hover:text-[#1a1a1a]"
                    >
                      <span className="material-symbols-outlined text-[17px]">visibility</span>
                    </Link>
                    <button
                      onClick={() => toggleStatus(p)}
                      aria-label={activo ? `Ocultar ${p.name}` : `Publicar ${p.name}`}
                      title={activo ? 'Ocultar' : 'Publicar'}
                      className="flex size-8 items-center justify-center rounded-lg text-[#777] transition-colors hover:bg-[#f4f2f0] hover:text-[#1a1a1a]"
                    >
                      <span className="material-symbols-outlined text-[17px]">
                        {activo ? 'visibility_off' : 'visibility'}
                      </span>
                    </button>
                    <Link
                      href={`/admin/products/${p.id}`}
                      aria-label={`Editar ${p.name}`}
                      title="Editar"
                      className="flex size-8 items-center justify-center rounded-lg text-[#777] transition-colors hover:bg-[#f4f2f0] hover:text-[#1a1a1a]"
                    >
                      <span className="material-symbols-outlined text-[17px]">edit</span>
                    </Link>
                    <button
                      onClick={() => { setProductToDelete(p); setDeleteModalOpen(true); }}
                      aria-label={`Eliminar ${p.name}`}
                      title="Eliminar"
                      className="flex size-8 items-center justify-center rounded-lg text-[#c62828] transition-colors hover:bg-[#fdf3f3]"
                    >
                      <span className="material-symbols-outlined text-[17px]">delete</span>
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </>
      )}

      {/* Confirmación de borrado */}
      <AdminDialog
        open={deleteModalOpen && !!productToDelete}
        variant="confirm"
        title="Confirmar eliminación"
        confirmLabel="Eliminar"
        cancelLabel="Cancelar"
        onConfirm={executeDelete}
        onCancel={() => { setDeleteModalOpen(false); setProductToDelete(null); }}
      >
        ¿Seguro que quieres eliminar <strong>{productToDelete?.name}</strong>? Esta acción no se
        puede deshacer.
      </AdminDialog>

      {/* Resultado */}
      <AdminDialog
        open={!!dialog}
        variant={dialog?.variant ?? 'success'}
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
