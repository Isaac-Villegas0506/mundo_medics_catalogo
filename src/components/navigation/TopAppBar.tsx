'use client';

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

export default function TopAppBar() {
  const [isSearchVisible, setIsSearchVisible] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const pathname = usePathname();

  // Close sidebar on route change
  useEffect(() => {
    setIsSidebarOpen(false);
  }, [pathname]);

  // Prevent background scroll when sidebar is open
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

  const navLinks = [
    { name: 'Inicio', href: '/', icon: 'home' },
    { name: 'Categorías', href: '/categories', icon: 'category' },
    { name: 'Favoritos', href: '/favorites', icon: 'favorite' },
  ];

  return (
    <>
      <header className="sticky top-0 w-full z-40 bg-[#f8f8f6]/90 backdrop-blur-xl border-b border-black/5">
        <div className="flex items-center justify-between px-4 h-14 max-w-[1200px] mx-auto relative">
          {/* Left Area (Menu on Desktop, Logo on Mobile) */}
          <div className="w-14 flex items-center justify-start">
            {/* Hamburger Menu (Desktop only) */}
            <button 
              onClick={() => setIsSidebarOpen(true)}
              className="hidden md:flex items-center justify-start cursor-pointer active:scale-95 transition-transform text-[#1a1a1a] hover:opacity-70"
            >
              <span className="material-symbols-outlined text-[26px]" style={{ fontVariationSettings: "'wght' 300" }}>menu</span>
            </button>

            {/* Logo (Mobile only) */}
            <Link href="/" className="md:hidden flex items-center justify-start cursor-pointer active:scale-95 transition-transform">
              <img src="/logomundomedics.png" alt="Mundo Medics Logo" className="h-11 object-contain" />
            </Link>
          </div>

          {/* Brand (Center) */}
          <span className="text-[17px] font-semibold tracking-[-0.01em] text-[#1a1a1a] select-none absolute left-1/2 -translate-x-1/2">
            Mundo Medics
          </span>

          {/* Search Toggle (Right) */}
          <div className="w-10 flex items-center justify-end">
            <button
              className={`w-10 h-10 flex items-center justify-center rounded-full transition-all active:scale-95 ${isSearchVisible ? 'bg-black/8' : 'hover:bg-black/5'}`}
              onClick={() => setIsSearchVisible(v => !v)}
            >
              <motion.span
                animate={{ rotate: isSearchVisible ? 45 : 0 }}
                transition={{ type: 'spring', stiffness: 400, damping: 28 }}
                className="material-symbols-outlined text-[24px] text-[#1a1a1a] block"
                style={{ fontVariationSettings: "'wght' 300" }}
              >
                {isSearchVisible ? 'close' : 'search'}
              </motion.span>
            </button>
          </div>
        </div>

        {/* Animated Search Bar */}
        <AnimatePresence>
          {isSearchVisible && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ type: 'spring', stiffness: 380, damping: 32 }}
              className="overflow-hidden"
            >
              <div className="px-4 pb-3 max-w-[1200px] mx-auto">
                <div className="flex items-center bg-white border border-black/8 rounded-2xl px-4 h-11 gap-2 shadow-[0_2px_12px_rgba(0,0,0,0.04)]">
                  <span className="material-symbols-outlined text-[18px] text-[#999]" style={{ fontVariationSettings: "'wght' 300" }}>search</span>
                  <input
                    autoFocus
                    className="flex-1 bg-transparent text-sm text-[#1a1a1a] placeholder:text-[#aaa] outline-none font-normal"
                    placeholder="Buscar productos…"
                    type="text"
                  />
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </header>

      {/* Sidebar Overlay */}
      <AnimatePresence>
        {isSidebarOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm"
            onClick={() => setIsSidebarOpen(false)}
          />
        )}
      </AnimatePresence>

      {/* Sidebar Drawer */}
      <AnimatePresence>
        {isSidebarOpen && (
          <motion.div
            initial={{ x: '-100%' }}
            animate={{ x: 0 }}
            exit={{ x: '-100%' }}
            transition={{ type: 'spring', stiffness: 400, damping: 35 }}
            className="fixed inset-y-0 left-0 z-50 w-[280px] sm:w-[320px] bg-[#f8f8f6] shadow-2xl flex flex-col"
          >
            {/* Sidebar Header */}
            <div className="h-14 flex items-center justify-between px-6 border-b border-black/5 bg-white shrink-0">
              <span className="font-semibold text-[#1a1a1a] text-lg tracking-tight">Menú</span>
              <button 
                onClick={() => setIsSidebarOpen(false)}
                className="w-8 h-8 flex items-center justify-center rounded-full bg-[#f2f2f0] text-[#555] hover:bg-[#e8e8e4] hover:text-[#1a1a1a] transition-colors"
              >
                <span className="material-symbols-outlined text-[20px]">close</span>
              </button>
            </div>

            {/* Sidebar Links */}
            <div className="flex-1 overflow-y-auto py-6 px-4 flex flex-col gap-2">
              {navLinks.map((link) => {
                const isActive = pathname === link.href;
                return (
                  <Link 
                    key={link.href} 
                    href={link.href}
                    className={`flex items-center gap-4 px-4 py-3.5 rounded-2xl transition-all ${
                      isActive 
                        ? 'bg-[#1a1a1a] text-white shadow-md' 
                        : 'text-[#555] hover:bg-white hover:text-[#1a1a1a] hover:shadow-sm'
                    }`}
                  >
                    <span 
                      className={`material-symbols-outlined text-[22px] ${isActive ? 'text-white' : 'text-[#888]'}`}
                      style={{ fontVariationSettings: isActive ? "'FILL' 1, 'wght' 300" : "'wght' 300" }}
                    >
                      {link.icon}
                    </span>
                    <span className={`font-medium ${isActive ? 'text-white' : 'text-[#1a1a1a]'}`}>
                      {link.name}
                    </span>
                  </Link>
                );
              })}
            </div>

            {/* Sidebar Footer */}
            <div className="p-6 border-t border-black/5 bg-white shrink-0">
              <div className="flex items-center gap-3">
                <img src="/logomundomedics.png" alt="Mundo Medics Logo" className="h-8 object-contain" />
                <div className="flex flex-col">
                  <span className="text-[13px] font-semibold text-[#1a1a1a] leading-tight">Mundo Medics</span>
                  <span className="text-[11px] text-[#888]">Catálogo Digital</span>
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
