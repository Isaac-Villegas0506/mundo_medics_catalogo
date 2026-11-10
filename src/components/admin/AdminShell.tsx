'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { usePathname, useRouter } from 'next/navigation';
import { supabase } from '@/utils/supabase/client';
import AdminDialog from '@/components/admin/AdminDialog';

const navLinks = [
  { icon: 'dashboard', label: 'Dashboard', href: '/admin' },
  { icon: 'inventory_2', label: 'Productos', href: '/admin/products' },
  { icon: 'category', label: 'Categorías', href: '/admin/categories' },
  { icon: 'star', label: 'Destacados', href: '/admin/featured' },
  { icon: 'settings', label: 'Ajustes', href: '/admin/settings' },
];

/** Título del header según la ruta. */
const TITLES: Record<string, string> = {
  '/admin': 'Panel de Control',
  '/admin/products': 'Productos',
  '/admin/categories': 'Categorías',
  '/admin/featured': 'Destacados',
  '/admin/settings': 'Ajustes',
};

/**
 * Fase 33 — Shell del panel.
 *
 * Cambios:
 *  - Se eliminó la campanita de notificaciones: no hacía nada.
 *  - En su lugar: «Ver tienda» (catálogo público) y «Cerrar sesión», ambos
 *    funcionales y con icono.
 *  - El header es más bajo en móvil y no se solapa con el contenido.
 *  - Se añade la barra inferior con el estado activo correcto.
 */
export default function AdminShell({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const [confirmLogout, setConfirmLogout] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);

  const title = TITLES[pathname] ?? (pathname.startsWith('/admin/products') ? 'Productos' : 'Panel');

  const handleLogout = async () => {
    setLoggingOut(true);
    await supabase.auth.signOut();
    router.push('/login');
    router.refresh();
  };

  return (
    <div className="flex min-h-screen flex-col bg-[#f8f8f6] font-sans antialiased text-[#1a1a1a] md:flex-row">
      {/* ── Barra lateral (escritorio) ─────────────────────────────────── */}
      <nav className="fixed left-0 top-0 z-50 hidden h-screen w-[260px] flex-col border-r border-[#ece9e2] bg-white shadow-[4px_0_24px_rgba(0,0,0,0.02)] md:flex">
        <div className="px-5 py-7">
          <Link href="/admin" className="flex items-center gap-2.5">
            <Image
              src="/logomundomedics.png"
              alt="Mundo Medics"
              width={110}
              height={40}
              className="h-9 w-auto object-contain"
            />
          </Link>
        </div>

        <div className="flex flex-1 flex-col gap-1.5 px-3">
          {navLinks.map((item) => {
            const active = pathname === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                aria-current={active ? 'page' : undefined}
                className={`flex items-center gap-3 rounded-xl px-3.5 py-3 text-sm font-medium transition-colors ${
                  active
                    ? 'bg-[#1a1a1a] text-white'
                    : 'text-[#555] hover:bg-[#f4f2f0] hover:text-[#1a1a1a]'
                }`}
              >
                <span
                  className="material-symbols-outlined text-[20px]"
                  style={{ fontVariationSettings: active ? "'FILL' 1, 'wght' 300" : "'wght' 300" }}
                >
                  {item.icon}
                </span>
                {item.label}
              </Link>
            );
          })}
        </div>

        {/* Acciones del pie */}
        <div className="flex flex-col gap-1 px-3 pb-5">
          <Link
            href="/"
            target="_blank"
            className="flex items-center gap-3 rounded-xl px-3.5 py-3 text-sm font-medium text-[#555] transition-colors hover:bg-[#f4f2f0] hover:text-[#1a1a1a]"
          >
            <span className="material-symbols-outlined text-[20px]" style={{ fontVariationSettings: "'wght' 300" }}>
              storefront
            </span>
            Ver tienda
          </Link>
          <button
            onClick={() => setConfirmLogout(true)}
            className="flex items-center gap-3 rounded-xl px-3.5 py-3 text-left text-sm font-medium text-[#c62828] transition-colors hover:bg-[#fdf3f3]"
          >
            <span className="material-symbols-outlined text-[20px]" style={{ fontVariationSettings: "'wght' 300" }}>
              logout
            </span>
            Cerrar sesión
          </button>
        </div>
      </nav>

      {/* ── Contenido ─────────────────────────────────────────────────── */}
      <div className="relative flex w-full min-w-0 flex-1 flex-col md:ml-[260px]">
        {/* Header. En móvil es más bajo (h-14) para no robar espacio. */}
        <header className="sticky top-0 z-40 border-b border-[#ece9e2] bg-white/90 backdrop-blur-xl">
          <div className="mx-auto flex h-14 w-full items-center justify-between gap-2 px-3 md:h-16 md:px-8">
            <div className="flex min-w-0 items-center gap-2">
              {/* Logo sólo en móvil (en escritorio está en la barra lateral) */}
              <Link href="/admin" className="flex shrink-0 items-center md:hidden">
                <Image
                  src="/logomundomedics.png"
                  alt="Mundo Medics"
                  width={72}
                  height={28}
                  className="h-7 w-auto object-contain"
                />
              </Link>
              <h1 className="truncate text-[15px] font-semibold tracking-tight text-[#1a1a1a] md:text-[20px]">
                {title}
              </h1>
            </div>

            {/* Acciones: mismas en móvil y escritorio */}
            <div className="flex shrink-0 items-center gap-1.5">
              <Link
                href="/"
                target="_blank"
                aria-label="Ver la tienda como cliente"
                title="Ver tienda"
                className="flex size-10 items-center justify-center rounded-full bg-[#f4f2f0] text-[#555] transition-colors hover:bg-[#eceae6] hover:text-[#1a1a1a] active:scale-95"
              >
                <span className="material-symbols-outlined text-[20px]" style={{ fontVariationSettings: "'wght' 300" }}>
                  storefront
                </span>
              </Link>

              <button
                onClick={() => setConfirmLogout(true)}
                aria-label="Cerrar sesión"
                title="Cerrar sesión"
                className="flex size-10 items-center justify-center rounded-full bg-[#f4f2f0] text-[#555] transition-colors hover:bg-[#fdf3f3] hover:text-[#c62828] active:scale-95"
              >
                <span className="material-symbols-outlined text-[20px]" style={{ fontVariationSettings: "'wght' 300" }}>
                  logout
                </span>
              </button>
            </div>
          </div>
        </header>

        {children}
      </div>

      {/* ── Barra inferior (móvil) ────────────────────────────────────── */}
      <nav className="fixed bottom-0 left-0 right-0 z-50 border-t border-[#ece9e2] bg-white/95 backdrop-blur-xl pb-safe md:hidden">
        <div className="flex h-16 items-center justify-around px-1">
          {navLinks.map((item) => {
            const active = pathname === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                aria-current={active ? 'page' : undefined}
                className={`relative flex h-full w-16 flex-col items-center justify-center transition-colors ${
                  active ? 'text-[#1a1a1a]' : 'text-[#b5b5b5]'
                }`}
              >
                {active && <span className="absolute -top-px h-0.5 w-5 rounded-b-full bg-[#1a1a1a]" />}
                <span
                  className="material-symbols-outlined text-[22px]"
                  style={{ fontVariationSettings: active ? "'FILL' 1, 'wght' 300" : "'wght' 300" }}
                >
                  {item.icon}
                </span>
                <span className="mt-0.5 text-[10px] font-medium">{item.label}</span>
              </Link>
            );
          })}
        </div>
      </nav>

      {/* Confirmación de cierre de sesión */}
      <AdminDialog
        open={confirmLogout}
        variant="confirm"
        title="¿Cerrar sesión?"
        confirmLabel={loggingOut ? 'Cerrando…' : 'Cerrar sesión'}
        confirmDisabled={loggingOut}
        cancelLabel="Cancelar"
        onConfirm={handleLogout}
        onCancel={() => setConfirmLogout(false)}
      >
        Tendrás que volver a introducir tus credenciales para entrar al panel.
      </AdminDialog>
    </div>
  );
}
