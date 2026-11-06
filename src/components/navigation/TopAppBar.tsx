'use client';

import React, { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { usePathname } from 'next/navigation';
import { useTheme } from 'next-themes';
import { useDelayedUnmount } from '@/hooks/useDelayedUnmount';

interface TopAppBarProps {
  onSearch?: (query: string) => void;
}

/**
 * Fase 10: sin framer-motion. Las animaciones son CSS puro
 * (`.mm-in-*` / `.mm-out-*` en globals.css) con las mismas curvas y duraciones
 * que tenía `motion/react`: rotación del icono, despliegue del buscador, velo y
 * cajón lateral. `useDelayedUnmount` sustituye a `<AnimatePresence>`.
 */
export default function TopAppBar({ onSearch }: TopAppBarProps) {
  const [isSearchVisible, setIsSearchVisible] = useState(false);
  const [searchValue, setSearchValue] = useState('');
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const pathname = usePathname();
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  const searchDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const sidebar = useDelayedUnmount(isSidebarOpen, 240);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    setIsSidebarOpen(false);
  }, [pathname]);

  useEffect(() => {
    if (isSidebarOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [isSidebarOpen]);

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setSearchValue(val);
    // R2: debounce para no filtrar (y re-renderizar la grilla) en cada tecla.
    if (searchDebounceRef.current) clearTimeout(searchDebounceRef.current);
    searchDebounceRef.current = setTimeout(() => onSearch?.(val), 250);
  };

  const handleSearchClose = () => {
    if (searchDebounceRef.current) clearTimeout(searchDebounceRef.current);
    setIsSearchVisible(false);
    setSearchValue('');
    onSearch?.('');
  };

  const navLinks = [
    { name: 'Inicio', href: '/', icon: 'home' },
    { name: 'Categorías', href: '/categories', icon: 'category' },
    { name: 'Favoritos', href: '/favorites', icon: 'favorite' },
  ];

  return (
    <>
      <header className="sticky top-0 w-full z-40 bg-[#f8f8f6]/95 dark:bg-zinc-950/95 md:backdrop-blur-xl border-b border-black/[0.06] dark:border-white/10">
        <div className="flex items-center justify-between px-4 h-14 max-w-[1200px] mx-auto relative">
          {/* Left Area */}
          <div className="w-14 flex items-center justify-start">
            {/* Hamburger (Desktop only) */}
            <button
              onClick={() => setIsSidebarOpen(true)}
              className="hidden md:flex items-center justify-center w-9 h-9 rounded-full cursor-pointer transition-all hover:bg-black/[0.05] active:scale-95 text-[#1a1a1a]"
            >
              <span className="material-symbols-outlined text-[24px]" style={{ fontVariationSettings: "'wght' 300" }}>menu</span>
            </button>

            {/* Logo (Mobile only) */}
            <Link href="/" className="md:hidden flex items-center justify-start cursor-pointer active:scale-95 transition-transform">
              <Image src="/logomundomedics.png" alt="Mundo Medics Logo" width={44} height={44} sizes="44px" className="h-11 w-auto object-contain" />
            </Link>
          </div>

          {/* Brand (Center) */}
          <span className="text-[17px] font-semibold tracking-[-0.02em] text-[#1a1a1a] dark:text-zinc-100 select-none absolute left-1/2 -translate-x-1/2">
            Mundo Medics
          </span>

          {/* Search Toggle (Right) */}
          <div className="w-[84px] flex items-center justify-end gap-1">
            <button
              className={`w-10 h-10 flex items-center justify-center rounded-full transition-all active:scale-95 ${isSearchVisible ? 'bg-black/[0.07] dark:bg-white/[0.07]' : 'hover:bg-black/[0.05] dark:hover:bg-white/[0.05]'}`}
              onClick={() => {
                if (isSearchVisible) {
                  handleSearchClose();
                } else {
                  setIsSearchVisible(true);
                }
              }}
            >
              <span
                data-open={isSearchVisible}
                className="mm-rotate material-symbols-outlined text-[22px] text-[#1a1a1a] dark:text-zinc-100 block"
                style={{ fontVariationSettings: "'wght' 300" }}
              >
                {isSearchVisible ? 'close' : 'search'}
              </span>
            </button>
          </div>
        </div>

        {/* Search Bar — se despliega con transición de grid (altura automática) */}
        <div className="mm-collapse" data-open={isSearchVisible}>
          <div>
            <div className="px-4 pb-3 max-w-[1200px] mx-auto">
              <div className="flex items-center bg-white dark:bg-zinc-800 border border-black/[0.09] dark:border-white/10 rounded-2xl px-4 h-11 gap-2 shadow-[0_2px_14px_rgba(0,0,0,0.05)] dark:shadow-none">
                <span className="material-symbols-outlined text-[17px] text-[#999] dark:text-zinc-400 flex-shrink-0" style={{ fontVariationSettings: "'wght' 300" }}>search</span>
                <input
                  autoFocus={isSearchVisible}
                  value={searchValue}
                  onChange={handleSearchChange}
                  className="flex-1 bg-transparent text-sm text-[#1a1a1a] dark:text-zinc-100 placeholder:text-[#bbb] dark:placeholder:text-zinc-500 outline-none font-normal"
                  placeholder="Buscar productos…"
                  type="text"
                  tabIndex={isSearchVisible ? 0 : -1}
                />
                {searchValue.length > 0 && (
                  <button
                    onClick={() => { if (searchDebounceRef.current) clearTimeout(searchDebounceRef.current); setSearchValue(''); onSearch?.(''); }}
                    className="flex-shrink-0 w-5 h-5 flex items-center justify-center rounded-full bg-[#e0e0e0] dark:bg-zinc-600 hover:bg-[#d0d0d0] dark:hover:bg-zinc-500 transition-colors"
                  >
                    <span className="material-symbols-outlined text-[13px] text-[#555] dark:text-zinc-200">close</span>
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Sidebar Overlay */}
      {sidebar.shouldRender && (
        <div
          className={`fixed inset-0 z-50 bg-black/40 backdrop-blur-sm ${sidebar.isLeaving ? 'mm-out' : 'mm-in'}`}
          onClick={() => setIsSidebarOpen(false)}
        />
      )}

      {/* Sidebar Drawer */}
      {sidebar.shouldRender && (
        <div
          className={`fixed inset-y-0 left-0 z-50 w-[280px] sm:w-[320px] bg-[#f8f8f6] dark:bg-zinc-900 shadow-2xl flex flex-col ${sidebar.isLeaving ? 'mm-out-left' : 'mm-in-left'}`}
        >
          {/* Sidebar Header */}
          <div className="h-14 flex items-center justify-between px-6 border-b border-black/[0.06] dark:border-zinc-800 bg-white dark:bg-zinc-950 shrink-0">
            <span className="font-semibold text-[#1a1a1a] dark:text-zinc-100 text-[17px] tracking-tight">Menú</span>
            <button
              onClick={() => setIsSidebarOpen(false)}
              className="w-11 h-11 flex items-center justify-center rounded-full bg-[#f2f2f0] dark:bg-zinc-800 text-[#555] dark:text-zinc-400 hover:bg-[#e8e8e4] dark:hover:bg-zinc-700 hover:text-[#1a1a1a] dark:hover:text-zinc-100 transition-colors"
            >
              <span className="material-symbols-outlined text-[19px]">close</span>
            </button>
          </div>

          {/* Sidebar Links */}
          <div className="flex-1 overflow-y-auto py-5 px-4 flex flex-col gap-1.5">
            {navLinks.map((link) => {
              const isActive = pathname === link.href;
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  className={`flex items-center gap-4 px-4 py-3.5 rounded-2xl transition-all ${isActive
                    ? 'bg-[#1a1a1a] dark:bg-white text-white dark:text-zinc-900 shadow-sm'
                    : 'text-[#444] dark:text-zinc-400 hover:bg-white dark:hover:bg-zinc-800 hover:text-[#1a1a1a] dark:hover:text-zinc-100 hover:shadow-sm'
                    }`}
                >
                  <span
                    className={`material-symbols-outlined text-[21px] ${isActive ? 'text-white dark:text-zinc-900' : 'text-[#777] dark:text-zinc-500'}`}
                    style={{ fontVariationSettings: isActive ? "'FILL' 1, 'wght' 300" : "'wght' 300" }}
                  >
                    {link.icon}
                  </span>
                  <span className={`font-medium text-[15px] ${isActive ? 'text-white dark:text-zinc-900' : 'text-[#1a1a1a] dark:text-zinc-300'}`}>
                    {link.name}
                  </span>
                </Link>
              );
            })}
          </div>

          {/* Sidebar Footer */}
          <div className="p-5 border-t border-black/[0.06] dark:border-zinc-800 bg-white dark:bg-zinc-950 shrink-0">
            <div className="flex items-center gap-3">
              <Image src="/logomundomedics.png" alt="Mundo Medics Logo" width={96} height={32} className="h-8 w-auto object-contain" />
              <div className="flex flex-col">
                <span className="text-[13px] font-semibold text-[#1a1a1a] dark:text-zinc-100 leading-tight">Mundo Medics</span>
                <span className="text-[11px] text-[#777] dark:text-zinc-500">Catálogo Digital</span>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
