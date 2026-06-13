'use client';

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import Link from 'next/link';

export default function TopAppBar() {
  const [isSearchVisible, setIsSearchVisible] = useState(false);

  return (
    <header className="sticky top-0 w-full z-50 bg-[#f8f8f6]/90 backdrop-blur-xl border-b border-black/5">
      <div className="flex items-center justify-between px-4 h-14 max-w-[1200px] mx-auto relative">
        {/* Logo (Left) */}
        <Link href="/" className="w-14 flex items-center justify-start cursor-pointer active:scale-95 transition-transform">
          <img src="/logomundomedics.png" alt="Mundo Medics Logo" className="h-11 object-contain" />
        </Link>

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
  );
}
