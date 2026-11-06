'use client';

import React from 'react';
import { motion } from 'motion/react';
import { usePathname, useRouter } from 'next/navigation';
import { useWhatsappNumber } from '@/hooks/useWhatsappNumber';

export default function BottomNav() {
  const pathname = usePathname();
  const router = useRouter();
  const whatsappNumber = useWhatsappNumber();

  const whatsappUrl = whatsappNumber
    ? `https://wa.me/${whatsappNumber}?text=Hola,%20tengo%20una%20consulta%20desde%20la%20tienda.`
    : '';

  const tabs = [
    { icon: 'home', label: 'Inicio', path: '/' },
    { icon: 'grid_view', label: 'Categorías', path: '/categories' },
    { icon: 'favorite', label: 'Guardados', path: '/favorites' },
    { icon: 'chat_bubble', label: 'Consultas', path: whatsappUrl, badge: false, isExternal: true },
  ];

  return (
    <nav className="fixed bottom-0 w-full z-40 pb-safe bg-white/90 backdrop-blur-xl border-t border-black/5 md:hidden">
      <div className="flex justify-around items-center h-16 px-2">
        {tabs.map(item => {
          // Si el item es /, solo es activo si pathname es exactamente /
          const active = item.path === '/' ? pathname === '/' : pathname.startsWith(item.path);

          return (
            <motion.button
              key={item.label}
              whileTap={{ scale: 0.88 }}
              onClick={() => {
                if (item.isExternal) {
                  if (!item.path) return; // Sin número configurado: no abrir WhatsApp.
                  window.open(item.path, '_blank', 'noopener,noreferrer');
                } else {
                  router.push(item.path);
                }
              }}
              className={`relative flex flex-col items-center justify-center w-16 h-full transition-colors ${active ? 'text-[#1a1a1a]' : 'text-[#bbb]'}`}
            >
              {active && (
                <motion.div
                  layoutId="nav-indicator"
                  className="absolute -top-[1px] w-5 h-[2px] bg-[#1a1a1a] rounded-b-full"
                />
              )}
              {item.badge && (
                <span className="absolute top-2.5 right-2.5 w-1.5 h-1.5 bg-[#e57373] rounded-full" />
              )}
              <span
                className="material-symbols-outlined text-[23px]"
                style={{ fontVariationSettings: active ? "'FILL' 1, 'wght' 300" : "'wght' 300" }}
              >
                {item.icon}
              </span>
              <span className="text-[10px] mt-0.5 font-medium">{item.label}</span>
            </motion.button>
          );
        })}
      </div>
    </nav>
  );
}
