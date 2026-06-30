'use client';

import React, { useState } from 'react';
import { m as motion } from 'motion/react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { supabase } from '@/utils/supabase/client';

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push('/login');
  };

  const navLinks = [
    { icon: 'dashboard', label: 'Dashboard', href: '/admin' },
    { icon: 'inventory_2', label: 'Productos', href: '/admin/products' },
    { icon: 'category', label: 'Categorías', href: '/admin/categories' },
    { icon: 'star', label: 'Destacados', href: '/admin/featured' },
    { icon: 'settings', label: 'Ajustes', href: '/admin/settings' },
  ];

  return (
    <div className="flex flex-col md:flex-row min-h-screen bg-[#f8f8f6] font-sans antialiased text-[#1a1a1a]">
      {/* Sidebar (Desktop) */}
      <nav className="bg-white h-screen w-[280px] fixed left-0 top-0 hidden md:flex flex-col border-r border-[#ece9e2] shadow-[4px_0_24px_rgba(0,0,0,0.02)] z-50">
        <div className="flex flex-col gap-6 py-8 h-full">
          {/* Header */}
          <div className="px-6 mb-4 flex items-center gap-3">
            <img src="/logomundomedics.png" alt="Mundo Medics Logo" className="h-10 object-contain" />
          </div>

          {/* Navigation Links */}
          <div className="flex-1 flex flex-col gap-2 px-3">
            {navLinks.map((item, i) => {
              const active = pathname === item.href;
              return (
                <Link
                  key={i}
                  href={item.href}
                  className={`flex items-center gap-3 px-4 py-3.5 rounded-xl text-sm font-medium transition-all ${active
                      ? 'bg-[#1a1a1a] text-white shadow-sm'
                      : 'text-[#555] hover:bg-[#f2f2f0] hover:text-[#1a1a1a]'
                    }`}
                >
                  <span className="material-symbols-outlined text-[20px]" style={{ fontVariationSettings: active ? "'FILL' 1, 'wght' 300" : "'wght' 300" }}>
                    {item.icon}
                  </span>
                  {item.label}
                </Link>
              );
            })}
          </div>

          {/* Footer Action */}
          <div className="px-5 mt-auto">
            <button
              onClick={handleLogout}
              className="w-full flex items-center gap-3 px-4 py-3.5 rounded-xl text-sm font-medium text-[#e57373] hover:bg-red-50 transition-colors"
            >
              <span className="material-symbols-outlined text-[20px]" style={{ fontVariationSettings: "'wght' 300" }}>logout</span>
              Cerrar sesión
            </button>
          </div>
        </div>
      </nav>

      {/* Main Content Area */}
      <div className="flex-1 md:ml-[280px] flex flex-col w-full min-w-0 relative">
        {/* Top Header */}
        <header className="bg-white/80 backdrop-blur-xl sticky top-0 z-40 border-b border-[#ece9e2]">
          <div className="flex justify-between items-center px-4 md:px-8 h-16 w-full mx-auto">
            <div className="flex items-center gap-4">
              <h1 className="font-semibold text-[20px] tracking-tight text-[#1a1a1a]">Panel de Control</h1>
            </div>
            <div className="flex items-center gap-3">
              <button className="w-10 h-10 flex items-center justify-center rounded-full bg-[#f4f2f0] text-[#555] hover:bg-[#eceae6] transition-colors active:scale-95">
                <span className="material-symbols-outlined text-[20px]" style={{ fontVariationSettings: "'wght' 300" }}>notifications</span>
              </button>
            </div>
          </div>
        </header>

        {children}
      </div>

      {/* Mobile Bottom Nav */}
      <nav className="md:hidden fixed bottom-0 w-full z-50 bg-white/90 backdrop-blur-xl border-t border-[#ece9e2] pb-safe">
        <div className="flex justify-around items-center h-16 px-2">
          {navLinks.map(item => {
            const active = pathname === item.href;
            return (
              <Link
                key={item.label}
                href={item.href}
                className={`relative flex flex-col items-center justify-center w-16 h-full transition-colors ${active ? 'text-[#1a1a1a]' : 'text-[#bbb]'}`}
              >
                {active && (
                  <motion.div
                    layoutId="admin-nav-indicator"
                    className="absolute -top-[1px] w-5 h-[2px] bg-[#1a1a1a] rounded-b-full"
                  />
                )}
                <span
                  className="material-symbols-outlined text-[23px]"
                  style={{ fontVariationSettings: active ? "'FILL' 1, 'wght' 300" : "'wght' 300" }}
                >
                  {item.icon}
                </span>
                <span className="text-[10px] mt-0.5 font-medium">{item.label}</span>
              </Link>
            );
          })}
        </div>
      </nav>
    </div>
  );
}
