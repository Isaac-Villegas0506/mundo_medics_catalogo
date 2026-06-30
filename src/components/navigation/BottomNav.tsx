'use client';

import React from 'react';
import { m as motion } from 'motion/react';
import { usePathname, useRouter } from 'next/navigation';

interface BottomNavProps {
  whatsappNumber?: string;
}

export default function BottomNav({ whatsappNumber: initialWhatsappNumber }: BottomNavProps) {
  const pathname = usePathname();
  const router = useRouter();
  const [whatsappNumber, setWhatsappNumber] = React.useState(initialWhatsappNumber || process.env.NEXT_PUBLIC_WHATSAPP_NUMBER || '1234567890');

  const [isVisible, setIsVisible] = React.useState(true);
  const lastScrollY = React.useRef(0);
  const timeoutRef = React.useRef<NodeJS.Timeout | null>(null);

  React.useEffect(() => {
    if (initialWhatsappNumber) return;

    const fetchSettings = async () => {
      try {
        const { supabase } = await import('@/utils/supabase/client');
        const { data } = await supabase.from('settings').select('value').eq('key', 'whatsapp_number').single();
        if (data?.value) setWhatsappNumber(data.value);
      } catch { }
    };
    fetchSettings();

    const handleUpdate = () => fetchSettings();
    window.addEventListener('settingsUpdated', handleUpdate);
    return () => window.removeEventListener('settingsUpdated', handleUpdate);
  }, [initialWhatsappNumber]);

  React.useEffect(() => {
    if (typeof window === 'undefined') return;

    let ticking = false;

    const handleScroll = () => {
      if (!ticking) {
        window.requestAnimationFrame(() => {
          const currentScrollY = window.scrollY;
          
          if (currentScrollY > lastScrollY.current && currentScrollY > 50) {
            setIsVisible(prev => prev ? false : prev);
          } else if (currentScrollY < lastScrollY.current) {
            setIsVisible(prev => !prev ? true : prev);
          }
          
          lastScrollY.current = currentScrollY;

          if (timeoutRef.current) clearTimeout(timeoutRef.current);
          
          if (currentScrollY > 50) {
            timeoutRef.current = setTimeout(() => {
              setIsVisible(prev => prev ? false : prev);
            }, 3000);
          } else {
            setIsVisible(prev => !prev ? true : prev);
          }
          
          ticking = false;
        });
        ticking = true;
      }
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    
    return () => {
      window.removeEventListener('scroll', handleScroll);
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, []);

  const whatsappUrl = `https://wa.me/${whatsappNumber}?text=Hola,%20tengo%20una%20consulta%20desde%20la%20tienda.`;

  const tabs = [
    { icon: 'home', label: 'Inicio', path: '/' },
    { icon: 'grid_view', label: 'Categorías', path: '/categories' },
    { icon: 'favorite', label: 'Guardados', path: '/favorites' },
    { icon: 'chat_bubble', label: 'Consultas', path: whatsappUrl, badge: false, isExternal: true },
  ];

  return (
    <nav 
      className={`fixed bottom-0 w-full z-40 pb-safe bg-white/90 backdrop-blur-xl border-t border-black/5 md:hidden transition-transform duration-300 ease-[cubic-bezier(0.25,1,0.5,1)] ${isVisible ? 'translate-y-0' : 'translate-y-full'}`}
    >
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
