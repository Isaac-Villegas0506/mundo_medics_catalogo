'use client';

import React, { useState, useEffect } from 'react';
import { supabase } from '@/utils/supabase/client';
import Link from 'next/link';

export default function AdminPage() {
  const [products, setProducts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Derived real data
  const totalCategories = [...new Set(products.map(p => p.category))].filter(Boolean).length;
  const totalColorVariants = products.reduce((acc, p) => acc + (p.color_hex_codes?.length || 0), 0);
  
  // Chart data
  const categoryCounts = products.reduce((acc, p) => {
    const cat = p.category || 'Otros';
    acc[cat] = (acc[cat] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);
  const chartData = Object.entries(categoryCounts).map(([cat, count]) => ({ cat, count }));
  const maxCount = Math.max(...chartData.map(d => d.count as number), 1);

  useEffect(() => {
    async function fetchDashboardData() {
      const { data, error } = await supabase
        .from('products')
        .select('*')
        .order('created_at', { ascending: false });
        
      if (data) {
        setProducts(data);
      }
      setLoading(false);
    }
    fetchDashboardData();
  }, []);

  return (
    <main className="flex-1 p-4 md:p-8 w-full max-w-7xl mx-auto flex flex-col gap-8 pb-[100px] md:pb-8">
      
      {/* Welcome & Actions */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-5">
        <div>
          <h2 className="text-[28px] md:text-[34px] font-semibold tracking-tight text-[#1a1a1a] leading-tight">
            Resumen de la tienda
          </h2>
          <p className="text-[#888] text-sm font-normal mt-1">
            Métricas clave y rendimiento del catálogo de Mundo Medics.
          </p>
        </div>
        <div className="flex gap-3 w-full md:w-auto">
          <Link href="/admin/products" className="flex-1 md:flex-none bg-[#1a1a1a] text-white font-semibold text-sm px-6 py-3.5 rounded-2xl flex items-center justify-center gap-2 hover:bg-[#333] transition-colors shadow-[0_4px_16px_rgba(0,0,0,0.08)] active:scale-95">
            <span className="material-symbols-outlined text-[18px]" style={{ fontVariationSettings: "'wght' 300" }}>add</span>
            Añadir Producto
          </Link>
          <button className="flex-1 md:flex-none bg-white border border-[#e0e0e0] text-[#1a1a1a] font-semibold text-sm px-6 py-3.5 rounded-2xl flex items-center justify-center gap-2 hover:bg-[#f8f8f6] transition-colors shadow-sm active:scale-95">
            Configurar
          </button>
        </div>
      </div>

      {/* Metrics Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        {[
          { title: 'Productos Activos', value: loading ? '...' : products.length.toString(), change: 'Total', icon: 'inventory_2', trend: 'up' },
          { title: 'Categorías', value: loading ? '...' : totalCategories.toString(), change: 'Registradas', icon: 'category', trend: 'up' },
          { title: 'Variantes (Colores)', value: loading ? '...' : totalColorVariants.toString(), change: 'Disponibles', icon: 'palette', trend: 'up' },
        ].map((metric, i) => (
          <div 
            key={i}
            className="bg-white rounded-3xl p-6 shadow-[0_2px_12px_rgba(0,0,0,0.03)] border border-black/5 flex flex-col justify-between"
          >
            <div className="flex justify-between items-start mb-6">
              <div className="w-12 h-12 bg-[#f4f2f0] rounded-2xl flex items-center justify-center text-[#1a1a1a]">
                <span className="material-symbols-outlined text-[24px]" style={{ fontVariationSettings: "'wght' 300" }}>
                  {metric.icon}
                </span>
              </div>
              <span className="text-[11px] font-semibold px-2.5 py-1 rounded-full bg-[#f4f2f0] text-[#555]">
                {metric.change}
              </span>
            </div>
            <div>
              <p className="text-xs font-semibold uppercase tracking-widest text-[#aaa] mb-1">
                {metric.title}
              </p>
              <h3 className="text-[36px] font-semibold tracking-tight text-[#1a1a1a] leading-none">
                {metric.value}
              </h3>
            </div>
          </div>
        ))}
      </div>

      {/* Secondary Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        
        {/* Chart Placeholder (Left) */}
        <div
          className="bg-white rounded-3xl p-6 shadow-[0_2px_12px_rgba(0,0,0,0.03)] border border-black/5 lg:col-span-1 flex flex-col"
        >
          <h3 className="font-semibold text-lg text-[#1a1a1a] mb-6">Productos por Categoría</h3>
          <div className="flex-1 flex items-end justify-between gap-2 h-[180px] pt-4">
            {!loading && chartData.length > 0 ? chartData.map((d: any, i) => {
              const h = (d.count / maxCount) * 100;
              return (
                <div key={i} className="flex-1 bg-[#f4f2f0] rounded-t-lg relative group overflow-hidden flex flex-col justify-end" title={`${d.cat}: ${d.count}`}>
                  {/* Fase 10: la barra crece de 0 a su altura con CSS
                      (`.mm-grow`), con el mismo retardo escalonado de antes. */}
                  <div
                    className="mm-grow w-full bg-[#1a1a1a] rounded-t-lg group-hover:bg-[#555] transition-colors cursor-pointer relative"
                    style={{
                      ['--mm-target-height' as string]: `${h}%`,
                      height: `${h}%`,
                      animationDelay: `${0.4 + i * 0.05}s`,
                    }}
                  >
                     <span className="absolute -top-6 left-1/2 -translate-x-1/2 text-xs font-bold text-[#1a1a1a] opacity-0 group-hover:opacity-100">{d.count}</span>
                  </div>
                </div>
              );
            }) : (
              <div className="w-full text-center text-[#aaa] text-sm pb-10">Cargando...</div>
            )}
          </div>
          <div className="flex justify-between mt-4 text-[11px] font-medium text-[#aaa] uppercase tracking-wider overflow-hidden">
            {!loading && chartData.map((d: any, i) => (
              <span key={i} className="truncate px-1 text-center flex-1">{d.cat}</span>
            ))}
          </div>
        </div>

        {/* Top Products (Right) */}
        <div
          className="bg-white rounded-3xl p-6 shadow-[0_2px_12px_rgba(0,0,0,0.03)] border border-black/5 lg:col-span-2"
        >
          <div className="flex justify-between items-center mb-6">
            <h3 className="font-semibold text-lg text-[#1a1a1a]">Productos Destacados</h3>
            <Link href="/admin/products" className="text-sm font-semibold text-[#888] hover:text-[#1a1a1a] transition-colors">
              Ver todos
            </Link>
          </div>
          
          <div className="flex flex-col gap-3">
            {loading ? (
              <div className="text-center py-10 text-[#888]">Cargando productos...</div>
            ) : products.filter(p => p.is_featured).length === 0 ? (
              <div className="text-center py-10 text-[#888]">No hay productos destacados.</div>
            ) : (
              products.filter(p => p.is_featured).slice(0, 5).map((item, i) => (
                <div 
                  key={item.id}
                  className="flex items-center gap-4 p-3 rounded-2xl hover:bg-[#f8f8f6] transition-colors cursor-pointer border border-transparent hover:border-black/5"
                >
                  <div className="w-14 h-14 bg-[#eeecea] rounded-xl overflow-hidden flex-shrink-0 flex items-center justify-center">
                    {item.image_url ? (
                      <img src={item.image_url} alt={item.name} className="w-full h-full object-cover" />
                    ) : (
                      <span className="material-symbols-outlined text-[#aaa]">inventory_2</span>
                    )}
                  </div>
                  <div className="flex-1">
                    <h4 className="font-semibold text-sm text-[#1a1a1a]">{item.name}</h4>
                    <p className="text-xs text-[#888] mt-0.5">{item.category || 'General'}</p>
                  </div>
                  <div className="text-right">
                    <span className="block text-sm font-semibold text-[#1a1a1a]">{item.sizes?.length || 0}</span>
                    <span className="text-[10px] font-medium text-[#aaa] uppercase tracking-wider">Tallas</span>
                  </div>
                  <div className="pl-2 flex gap-1">
                    <button className="w-8 h-8 flex items-center justify-center rounded-full text-[#aaa] hover:text-[#1a1a1a] hover:bg-white shadow-sm transition-colors">
                      <span className="material-symbols-outlined text-[18px]" style={{ fontVariationSettings: "'wght' 300" }}>edit</span>
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

      </div>
    </main>
  );
}
