'use client';

import React, { useState, useEffect, useMemo } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { supabase } from '@/utils/supabase/client';
import { ACTION_LABEL, ENTITY_LABEL } from '@/utils/activityLog';

/**
 * Fase 33 — Dashboard del administrador.
 *
 * Sustituye los indicadores anteriores (que solo derivaban de `products`) por
 * estadísticas reales:
 *   - Visitas de la web (tabla `page_views`, últimos 30 días)
 *   - Productos activos / inactivos / total
 *   - Categorías
 *   - Productos más vistos (`product_views`)
 *   - Actividad reciente (`admin_activity`)
 *
 * IMPORTANTE: si una métrica no tiene datos, se dice explícitamente
 * («Aún no hay datos»). No se inventa ningún número.
 */

interface Stats {
  visitsTotal: number;
  visitsToday: number;
  visitsDaily: { day: string; visits: number }[];
  totalProducts: number;
  activeProducts: number;
  inactiveProducts: number;
  totalCategories: number;
  featuredCount: number;
  topProducts: { id: string; name: string; image_url: string | null; category: string | null; views: number }[];
  activity: { id: number; action: string; entity: string; entity_name: string | null; detail: string | null; created_at: string }[];
  /** true si la tabla de métricas no existe o falló. */
  metricsUnavailable: boolean;
}

const EMPTY: Stats = {
  visitsTotal: 0,
  visitsToday: 0,
  visitsDaily: [],
  totalProducts: 0,
  activeProducts: 0,
  inactiveProducts: 0,
  totalCategories: 0,
  featuredCount: 0,
  topProducts: [],
  activity: [],
  metricsUnavailable: false,
};

/** Fecha relativa corta: «hace 3 min», «hace 2 h», «ayer». */
function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const min = Math.floor(diff / 60000);
  if (min < 1) return 'ahora mismo';
  if (min < 60) return `hace ${min} min`;
  const h = Math.floor(min / 60);
  if (h < 24) return `hace ${h} h`;
  const d = Math.floor(h / 24);
  if (d === 1) return 'ayer';
  if (d < 30) return `hace ${d} días`;
  return new Date(iso).toLocaleDateString('es-PE', { day: 'numeric', month: 'short' });
}

export default function AdminPage() {
  const [stats, setStats] = useState<Stats>(EMPTY);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      // ── Productos (siempre disponibles) ────────────────────────────────
      const { data: products } = await supabase
        .from('products')
        .select('id, name, image_url, category, status, is_featured');

      const list = products || [];
      const active = list.filter((p) => p.status === 'Disponible').length;

      // ── Categorías ─────────────────────────────────────────────────────
      const { data: cats } = await supabase.from('categories').select('id');

      // ── Métricas (pueden no existir si la migración no se aplicó) ──────
      let metricsUnavailable = false;
      let visitsDaily: { day: string; visits: number }[] = [];
      let visitsTotal = 0;
      let visitsToday = 0;
      let topProducts: Stats['topProducts'] = [];
      let activity: Stats['activity'] = [];

      const [dailyRes, rankingRes, activityRes] = await Promise.all([
        supabase.from('page_views_daily').select('day, visits'),
        supabase.from('product_views_ranking').select('id, name, image_url, category, views').limit(5),
        supabase
          .from('admin_activity')
          .select('id, action, entity, entity_name, detail, created_at')
          .order('created_at', { ascending: false })
          .limit(6),
      ]);

      if (dailyRes.error || rankingRes.error || activityRes.error) {
        metricsUnavailable = true;
      } else {
        visitsDaily = (dailyRes.data || []) as { day: string; visits: number }[];
        visitsTotal = visitsDaily.reduce((a, d) => a + (d.visits || 0), 0);

        // "Hoy" comparando la fecha local.
        const today = new Date().toISOString().slice(0, 10);
        visitsToday = visitsDaily.find((d) => String(d.day).slice(0, 10) === today)?.visits || 0;

        topProducts = ((rankingRes.data || []) as Stats['topProducts']).filter((p) => (p.views || 0) > 0);
        activity = (activityRes.data || []) as Stats['activity'];
      }

      setStats({
        visitsTotal,
        visitsToday,
        visitsDaily,
        totalProducts: list.length,
        activeProducts: active,
        inactiveProducts: list.length - active,
        totalCategories: (cats || []).length,
        featuredCount: list.filter((p) => p.is_featured).length,
        topProducts,
        activity,
        metricsUnavailable,
      });
      setLoading(false);
    }

    load();
  }, []);

  /* Datos del gráfico: se rellenan los días sin visitas con 0 para que la
     gráfica no tenga huecos. Se muestran los últimos 14 días. */
  const chart = useMemo(() => {
    if (stats.visitsDaily.length === 0) return [];
    const byDay = new Map(stats.visitsDaily.map((d) => [String(d.day).slice(0, 10), d.visits]));
    const out: { label: string; visits: number }[] = [];
    for (let i = 13; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const key = d.toISOString().slice(0, 10);
      out.push({
        label: d.toLocaleDateString('es-PE', { day: '2-digit', month: 'short' }),
        visits: byDay.get(key) || 0,
      });
    }
    return out;
  }, [stats.visitsDaily]);

  const maxVisits = Math.max(...chart.map((c) => c.visits), 1);

  if (loading) {
    return (
      <main className="flex-1 p-4 md:p-8 w-full max-w-7xl mx-auto flex flex-col gap-6 pb-[100px] md:pb-8">
        <div className="h-8 w-64 rounded-lg skeleton-shimmer" />
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-5">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-28 rounded-2xl skeleton-shimmer" />
          ))}
        </div>
        <div className="h-64 rounded-3xl skeleton-shimmer" />
      </main>
    );
  }

  const activoPct = stats.totalProducts > 0
    ? Math.round((stats.activeProducts / stats.totalProducts) * 100)
    : 0;

  return (
    <main className="flex-1 p-4 md:p-8 w-full max-w-7xl mx-auto flex flex-col gap-5 md:gap-7 pb-[100px] md:pb-8">
      {/* Cabecera */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div className="min-w-0">
          <h2 className="text-[24px] md:text-[30px] font-semibold tracking-tight text-[#1a1a1a] leading-tight">
            Resumen de la tienda
          </h2>
          <p className="text-[#6b6b6b] text-[13px] md:text-sm mt-1">
            Estadísticas reales del catálogo de Mundo Medics.
          </p>
        </div>
        <div className="flex gap-2.5">
          <Link
            href="/admin/products/new"
            className="flex-1 sm:flex-none bg-[#1a1a1a] text-white font-semibold text-sm px-5 py-3 rounded-xl flex items-center justify-center gap-2 hover:bg-[#333] transition-colors active:scale-95"
          >
            <span className="material-symbols-outlined text-[18px]" style={{ fontVariationSettings: "'wght' 300" }}>add</span>
            Nuevo producto
          </Link>
          <Link
            href="/"
            target="_blank"
            className="flex-1 sm:flex-none bg-white border border-[#e5e2dc] text-[#1a1a1a] font-semibold text-sm px-5 py-3 rounded-xl flex items-center justify-center gap-2 hover:bg-[#f8f8f6] transition-colors active:scale-95"
          >
            <span className="material-symbols-outlined text-[18px]" style={{ fontVariationSettings: "'wght' 300" }}>storefront</span>
            Ver tienda
          </Link>
        </div>
      </div>

      {/* Aviso si faltan métricas */}
      {stats.metricsUnavailable && (
        <div className="flex items-start gap-3 rounded-2xl border border-[#f0d9a8] bg-[#fff8e1] p-3.5">
          <span className="material-symbols-outlined text-[18px] text-[#8a5a00] shrink-0">info</span>
          <div className="min-w-0 text-[12px] leading-relaxed text-[#7a5200]">
            <strong className="font-semibold">Las métricas de visitas no están disponibles.</strong>{' '}
            Falta aplicar la migración <code className="rounded bg-[#f5ead0] px-1">006_metrics.sql</code>.
            Las cifras de productos y categorías sí son reales.
          </div>
        </div>
      )}

      {/* Tarjetas de métricas — 2 columnas en móvil, 4 en escritorio */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-5">
        <StatCard
          icon="visibility"
          label="Visitas (30 días)"
          value={stats.visitsTotal}
          hint={stats.visitsToday > 0 ? `${stats.visitsToday} hoy` : 'Sin visitas hoy'}
          muted={stats.metricsUnavailable}
        />
        <StatCard
          icon="inventory_2"
          label="Productos activos"
          value={stats.activeProducts}
          hint={`${activoPct}% del total`}
          accent="green"
        />
        <StatCard
          icon="visibility_off"
          label="Productos inactivos"
          value={stats.inactiveProducts}
          hint={stats.inactiveProducts === 0 ? 'Todos publicados' : 'Ocultos en la tienda'}
          accent={stats.inactiveProducts > 0 ? 'amber' : undefined}
        />
        <StatCard
          icon="category"
          label="Categorías"
          value={stats.totalCategories}
          hint={`${stats.featuredCount} destacados`}
        />
      </div>

      {/* Gráfico de visitas + estado del catálogo */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 md:gap-5">
        {/* Gráfico */}
        <section className="lg:col-span-2 rounded-3xl border border-black/5 bg-white p-4 md:p-6">
          <div className="mb-4 flex items-start justify-between gap-3">
            <div>
              <h3 className="text-[15px] font-semibold text-[#1a1a1a]">Visitas · últimos 14 días</h3>
              <p className="text-[11px] text-[#6b6b6b] mt-0.5">
                {stats.metricsUnavailable
                  ? 'Requiere aplicar la migración de métricas'
                  : stats.visitsTotal === 0
                  ? 'Aún no hay datos: las visitas empezarán a contarse desde ahora'
                  : `${stats.visitsTotal} visitas en 30 días`}
              </p>
            </div>
            <span className="shrink-0 rounded-full bg-[#f4f2f0] px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wider text-[#6b6b6b]">
              Real
            </span>
          </div>

          {chart.length === 0 || stats.visitsTotal === 0 ? (
            <EmptyBlock
              icon="bar_chart"
              title="Sin visitas registradas"
              text="Cuando alguien entre a la tienda, las visitas aparecerán aquí."
            />
          ) : (
            <>
              <div className="flex h-[150px] md:h-[180px] items-end gap-1 md:gap-1.5">
                {chart.map((c, i) => (
                  <div key={i} className="group flex flex-1 flex-col items-center justify-end h-full">
                    <span className="mb-1 text-[9px] font-semibold text-[#6b6b6b] opacity-0 transition-opacity group-hover:opacity-100">
                      {c.visits}
                    </span>
                    <div
                      className="w-full rounded-t-md bg-[#1a1a1a] transition-colors group-hover:bg-[#4a4a4a]"
                      style={{ height: `${Math.max((c.visits / maxVisits) * 100, c.visits > 0 ? 4 : 1)}%` }}
                    />
                  </div>
                ))}
              </div>
              <div className="mt-2 flex justify-between text-[9px] text-[#aaa]">
                <span>{chart[0]?.label}</span>
                <span>{chart[chart.length - 1]?.label}</span>
              </div>
            </>
          )}
        </section>

        {/* Estado del catálogo */}
        <section className="rounded-3xl border border-black/5 bg-white p-4 md:p-6">
          <h3 className="mb-4 text-[15px] font-semibold text-[#1a1a1a]">Estado del catálogo</h3>

          <div className="flex flex-col gap-3">
            <ProgressRow label="Publicados" value={stats.activeProducts} total={stats.totalProducts} color="#2e7d32" />
            <ProgressRow label="Ocultos" value={stats.inactiveProducts} total={stats.totalProducts} color="#f57f17" />
          </div>

          <div className="mt-5 border-t border-[#ece9e2] pt-4">
            <div className="flex items-baseline justify-between">
              <span className="text-[12px] text-[#6b6b6b]">Total de productos</span>
              <span className="text-[20px] font-semibold tabular-nums text-[#1a1a1a]">{stats.totalProducts}</span>
            </div>
          </div>

          <Link
            href="/admin/products"
            className="mt-4 flex items-center justify-center gap-1.5 rounded-xl bg-[#f4f2f0] py-2.5 text-[12px] font-semibold text-[#1a1a1a] transition-colors hover:bg-[#eceae6]"
          >
            Administrar productos
            <span className="material-symbols-outlined text-[15px]">arrow_forward</span>
          </Link>
        </section>
      </div>

      {/* Productos más vistos + actividad reciente */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 md:gap-5">
        <section className="rounded-3xl border border-black/5 bg-white p-4 md:p-6">
          <div className="mb-4 flex items-center justify-between">
            <h3 className="text-[15px] font-semibold text-[#1a1a1a]">Productos más vistos</h3>
            <span className="material-symbols-outlined text-[18px] text-[#bbb]">trending_up</span>
          </div>

          {stats.topProducts.length === 0 ? (
            <EmptyBlock
              icon="visibility"
              title="Sin vistas todavía"
              text={stats.metricsUnavailable
                ? 'Falta aplicar la migración de métricas.'
                : 'Cuando los clientes abran una ficha, verás aquí el ranking.'}
              compact
            />
          ) : (
            <ol className="flex flex-col gap-2">
              {stats.topProducts.map((p, i) => (
                <li key={p.id}>
                  <Link
                    href={`/admin/products/${p.id}`}
                    className="flex items-center gap-3 rounded-xl p-2 transition-colors hover:bg-[#f8f8f6]"
                  >
                    <span className="w-4 shrink-0 text-center text-[12px] font-bold tabular-nums text-[#bbb]">
                      {i + 1}
                    </span>
                    <div className="flex size-10 shrink-0 items-center justify-center overflow-hidden rounded-lg bg-[#f4f2f0]">
                      {p.image_url ? (
                        <Image src={p.image_url} alt={p.name} width={40} height={40} className="size-full object-cover" />
                      ) : (
                        <span className="material-symbols-outlined text-[16px] text-[#bbb]">image</span>
                      )}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-[13px] font-medium text-[#1a1a1a]">{p.name}</p>
                      <p className="truncate text-[11px] text-[#6b6b6b]">{p.category || 'General'}</p>
                    </div>
                    <span className="shrink-0 rounded-full bg-[#f4f2f0] px-2 py-0.5 text-[11px] font-semibold tabular-nums text-[#555]">
                      {p.views}
                    </span>
                  </Link>
                </li>
              ))}
            </ol>
          )}
        </section>

        <section className="rounded-3xl border border-black/5 bg-white p-4 md:p-6">
          <div className="mb-4 flex items-center justify-between">
            <h3 className="text-[15px] font-semibold text-[#1a1a1a]">Actividad reciente</h3>
            <span className="material-symbols-outlined text-[18px] text-[#bbb]">history</span>
          </div>

          {stats.activity.length === 0 ? (
            <EmptyBlock
              icon="history"
              title="Sin actividad"
              text="Las acciones que hagas en el panel aparecerán aquí."
              compact
            />
          ) : (
            <ul className="flex flex-col gap-1">
              {stats.activity.map((a) => (
                <li key={a.id} className="flex items-start gap-2.5 rounded-xl px-2 py-2">
                  <span className="mt-1.5 size-1.5 shrink-0 rounded-full bg-[#1a1a1a]" />
                  <div className="min-w-0 flex-1">
                    <p className="text-[12px] leading-snug text-[#1a1a1a]">
                      <span className="font-semibold">{ACTION_LABEL[a.action] || a.action}</span>{' '}
                      {ENTITY_LABEL[a.entity] || a.entity}
                      {a.entity_name ? <span className="text-[#6b6b6b]"> · {a.entity_name}</span> : null}
                    </p>
                    <p className="text-[10px] text-[#aaa]">{timeAgo(a.created_at)}</p>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </main>
  );
}

/* ── Piezas ────────────────────────────────────────────────────────────── */

function StatCard({
  icon,
  label,
  value,
  hint,
  accent,
  muted,
}: {
  icon: string;
  label: string;
  value: number;
  hint?: string;
  accent?: 'green' | 'amber';
  muted?: boolean;
}) {
  const accentBg =
    accent === 'green' ? 'bg-[#eef7ee] text-[#2e7d32]'
    : accent === 'amber' ? 'bg-[#fff8e1] text-[#8a5a00]'
    : 'bg-[#f4f2f0] text-[#555]';

  return (
    <div className="rounded-2xl border border-black/5 bg-white p-3.5 md:p-5">
      <div className="mb-2.5 flex items-center justify-between">
        <span className={`flex size-8 items-center justify-center rounded-lg ${accentBg}`}>
          <span className="material-symbols-outlined text-[17px]" style={{ fontVariationSettings: "'wght' 300" }}>
            {icon}
          </span>
        </span>
      </div>
      <p className="text-[22px] md:text-[28px] font-semibold leading-none tabular-nums text-[#1a1a1a]">
        {muted ? '—' : value}
      </p>
      <p className="mt-1.5 text-[11px] md:text-[12px] font-medium text-[#1a1a1a]">{label}</p>
      {hint && <p className="mt-0.5 text-[10px] md:text-[11px] text-[#6b6b6b]">{hint}</p>}
    </div>
  );
}

function ProgressRow({ label, value, total, color }: { label: string; value: number; total: number; color: string }) {
  const pct = total > 0 ? Math.round((value / total) * 100) : 0;
  return (
    <div>
      <div className="mb-1 flex items-baseline justify-between">
        <span className="text-[12px] text-[#555]">{label}</span>
        <span className="text-[12px] font-semibold tabular-nums text-[#1a1a1a]">
          {value} <span className="font-normal text-[#aaa]">({pct}%)</span>
        </span>
      </div>
      <div className="h-1.5 w-full overflow-hidden rounded-full bg-[#f0eeeb]">
        <div className="h-full rounded-full transition-[width] duration-500" style={{ width: `${pct}%`, background: color }} />
      </div>
    </div>
  );
}

function EmptyBlock({
  icon,
  title,
  text,
  compact,
}: {
  icon: string;
  title: string;
  text: string;
  compact?: boolean;
}) {
  return (
    <div className={`flex flex-col items-center justify-center text-center ${compact ? 'py-8' : 'py-12'}`}>
      <span className="material-symbols-outlined mb-2 text-[28px] text-[#ddd]">{icon}</span>
      <p className="text-[12px] font-medium text-[#6b6b6b]">{title}</p>
      <p className="mt-0.5 max-w-[240px] text-[11px] leading-relaxed text-[#aaa]">{text}</p>
    </div>
  );
}
