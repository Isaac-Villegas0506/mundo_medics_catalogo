'use client';

import React from 'react';
import { motion } from 'motion/react';
import { usePathname } from 'next/navigation';
import Link from 'next/link';
import { useWhatsappNumber } from '@/hooks/useWhatsappNumber';
import { buildWhatsappUrl } from '@/utils/whatsapp';

export default function BottomNav() {
  const pathname = usePathname();
  const whatsappNumber = useWhatsappNumber();

  // Fase 7 (1.8): número normalizado; '' si no es válido.
  const whatsappUrl = buildWhatsappUrl(
    whatsappNumber,
    'Hola, tengo una consulta desde la tienda.'
  );

  const tabs = [
    { icon: 'home', label: 'Inicio', path: '/' },
    { icon: 'grid_view', label: 'Categorías', path: '/categories' },
    { icon: 'favorite', label: 'Guardados', path: '/favorites' },
    { icon: 'chat_bubble', label: 'Consultas', path: whatsappUrl, badge: false, isExternal: true },
  ];

  return (
    <nav className="fixed bottom-0 w-full z-40 pb-safe bg-white/95 border-t border-black/5 md:hidden">
      <div className="flex justify-around items-center h-16 px-2">
        {tabs.map(item => {
          // Si el item es /, solo es activo si pathname es exactamente /
          const active = item.path === '/' ? pathname === '/' : pathname.startsWith(item.path);

          /* Fase 7 (1.3): se usa `Link` de Next en lugar de `router.push` para
             que la navegación sea interna (sin recargar el documento) y para que
             el enlace funcione también con clic central / "abrir en pestaña". */
          const sharedClass = `relative flex flex-col items-center justify-center w-16 h-full transition-colors ${active ? 'text-[#1a1a1a]' : 'text-[#bbb]'}`;
          const inner = (
            <>
              {active && (
                <motion.div
                  layoutId="nav-indicator"
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
            </>
          );

          // WhatsApp: enlace externo real (abre en otra pestaña).
          if (item.isExternal) {
            if (!item.path) {
              // Sin número configurado: se muestra deshabilitado, no un enlace roto.
              return (
                <span
                  key={item.label}
                  aria-disabled="true"
                  title="WhatsApp no configurado"
                  className="relative flex flex-col items-center justify-center w-16 h-full text-[#ddd] cursor-not-allowed"
                >
                  <span className="material-symbols-outlined text-[23px]" style={{ fontVariationSettings: "'wght' 300" }}>
                    {item.icon}
                  </span>
                  <span className="text-[10px] mt-0.5 font-medium">{item.label}</span>
                </span>
              );
            }
            return (
              <a
                key={item.label}
                href={item.path}
                target="_blank"
                rel="noopener noreferrer"
                className={sharedClass}
              >
                {inner}
              </a>
            );
          }

          return (
            <Link key={item.label} href={item.path} className={sharedClass}>
              {inner}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
