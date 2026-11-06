'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'motion/react';
import { supabase } from '@/utils/supabase/client';

type Mode = 'login' | 'reset';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [resetSent, setResetSent] = useState(false);
  const [mode, setMode] = useState<Mode>('login');
  const router = useRouter();

  /** Mensajes de Supabase Auth traducidos a algo que el dueño entienda. */
  const translateError = (message: string) => {
    const m = message.toLowerCase();
    if (m.includes('invalid login credentials')) return 'Correo o contraseña incorrectos.';
    if (m.includes('email not confirmed')) return 'La cuenta aún no está confirmada.';
    if (m.includes('too many requests') || m.includes('rate limit'))
      return 'Demasiados intentos. Espera unos minutos e inténtalo de nuevo.';
    if (m.includes('network') || m.includes('fetch'))
      return 'No hay conexión. Revisa tu internet e inténtalo de nuevo.';
    return message;
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    const { error: authError } = await supabase.auth.signInWithPassword({ email, password });

    if (authError) {
      setError(translateError(authError.message));
      setLoading(false);
      return;
    }

    // Volver a la ruta que pidió autenticación (p.ej. /admin/products) si existe.
    const next = new URLSearchParams(window.location.search).get('next');
    router.replace(next && next.startsWith('/admin') ? next : '/admin');
    router.refresh();
  };

  const handleReset = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    const redirectTo =
      typeof window !== 'undefined'
        ? `${window.location.origin}/login`
        : undefined;

    const { error: resetError } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo,
    });

    setLoading(false);

    if (resetError) {
      setError(translateError(resetError.message));
      return;
    }
    // Por seguridad Supabase no revela si el correo existe: mismo mensaje siempre.
    setResetSent(true);
  };

  const switchMode = (next: Mode) => {
    setMode(next);
    setError(null);
    setResetSent(false);
  };

  return (
    <div className="min-h-screen bg-[#f8f8f6] font-sans antialiased text-[#1a1a1a] flex flex-col items-center justify-center p-6 relative overflow-hidden">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.1 }}
        className="w-full max-w-[400px] bg-white rounded-[28px] p-8 md:p-10 shadow-[0_8px_30px_rgba(0,0,0,0.04)] border border-black/5 relative z-10"
      >
        {/* Brand Header Inside Card */}
        <div className="flex flex-col items-center w-full mb-6">
          <div className="w-12 h-12 bg-[#1a1a1a] rounded-2xl flex items-center justify-center shadow-md mb-3 transform rotate-3">
            <span className="material-symbols-outlined text-white text-[24px]" style={{ fontVariationSettings: "'wght' 300" }}>
              medical_services
            </span>
          </div>
          <h1 className="text-[22px] font-semibold tracking-tight text-[#1a1a1a]">Mundo Medics</h1>
        </div>

        <div className="mb-8 text-center">
          <h2 className="text-[22px] md:text-[24px] font-semibold tracking-tight text-[#1a1a1a] mb-1">
            {mode === 'login' ? 'Bienvenido de nuevo' : 'Recuperar contraseña'}
          </h2>
          <p className="text-sm font-normal text-[#888]">
            {mode === 'login'
              ? 'Ingresa a tu portal profesional.'
              : 'Te enviaremos un enlace para restablecerla.'}
          </p>
        </div>

        {/* Error visible y accesible (antes era un alert()) */}
        {error && (
          <div
            role="alert"
            className="mb-5 flex items-start gap-2 rounded-2xl border border-[#f0c0c0] bg-[#fdf3f3] px-4 py-3 text-sm text-[#a33]"
          >
            <span className="material-symbols-outlined text-[18px] shrink-0">error</span>
            <span>{error}</span>
          </div>
        )}

        {resetSent ? (
          <div className="text-center">
            <div className="mx-auto mb-4 w-12 h-12 rounded-full bg-[#eef7ee] flex items-center justify-center">
              <span className="material-symbols-outlined text-[#2e7d32] text-[24px]">mark_email_read</span>
            </div>
            <p className="text-sm text-[#555] mb-6">
              Si <strong className="font-semibold">{email}</strong> corresponde a una cuenta,
              recibirás un correo con el enlace para restablecer tu contraseña.
            </p>
            <button
              type="button"
              onClick={() => switchMode('login')}
              className="w-full py-4 rounded-2xl text-sm font-semibold bg-[#1a1a1a] text-white hover:bg-[#333] transition-colors"
            >
              Volver a iniciar sesión
            </button>
          </div>
        ) : (
          <form className="space-y-5" onSubmit={mode === 'login' ? handleLogin : handleReset}>
            {/* Email */}
            <div>
              <label
                className="block text-xs font-semibold uppercase tracking-widest text-[#aaa] mb-2"
                htmlFor="email"
              >
                Correo electrónico
              </label>
              <div className="relative flex items-center">
                <span
                  className="material-symbols-outlined absolute left-4 text-[#aaa] text-[20px] pointer-events-none"
                  style={{ fontVariationSettings: "'wght' 300" }}
                >
                  mail
                </span>
                <input
                  id="email"
                  type="email"
                  autoComplete="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full pl-[44px] pr-4 py-3.5 bg-white border border-[#e0e0e0] rounded-2xl text-sm text-[#1a1a1a] placeholder:text-[#ccc] outline-none focus:border-[#1a1a1a] focus:ring-1 focus:ring-[#1a1a1a] transition-all shadow-[0_2px_10px_rgba(0,0,0,0.02)]"
                  placeholder="tu@correo.com"
                  required
                />
              </div>
            </div>

            {/* Password (solo en modo login) */}
            {mode === 'login' && (
              <div>
                <div className="flex justify-between items-center mb-2">
                  <label
                    className="block text-xs font-semibold uppercase tracking-widest text-[#aaa]"
                    htmlFor="password"
                  >
                    Contraseña
                  </label>
                  <button
                    type="button"
                    onClick={() => switchMode('reset')}
                    className="text-xs font-medium text-[#888] hover:text-[#1a1a1a] underline underline-offset-2 transition-colors"
                  >
                    ¿Olvidaste tu contraseña?
                  </button>
                </div>
                <div className="relative flex items-center">
                  <span
                    className="material-symbols-outlined absolute left-4 text-[#aaa] text-[20px] pointer-events-none"
                    style={{ fontVariationSettings: "'wght' 300" }}
                  >
                    lock
                  </span>
                  <input
                    id="password"
                    type="password"
                    autoComplete="current-password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full pl-[44px] pr-4 py-3.5 bg-white border border-[#e0e0e0] rounded-2xl text-sm text-[#1a1a1a] placeholder:text-[#ccc] outline-none focus:border-[#1a1a1a] focus:ring-1 focus:ring-[#1a1a1a] transition-all shadow-[0_2px_10px_rgba(0,0,0,0.02)]"
                    placeholder="••••••••"
                    required
                  />
                </div>
              </div>
            )}

            {/* Fase 7 (1.7): se retiró la casilla "Mantener sesión iniciada".
                Con `@supabase/ssr` la sesión vive en cookies gestionadas por la
                librería y no se puede prometer una duración distinta sin romper
                la autenticación. El plan indica retirarla antes que mostrar una
                opción que no cumple lo que anuncia. */}
            <p className="text-xs text-[#aaa] leading-relaxed pt-1">
              Tu sesión se mantiene mientras no cierres sesión.
            </p>

            {/* Submit */}
            <motion.button
              disabled={loading}
              whileTap={{ scale: 0.98 }}
              className={`w-full flex items-center justify-center gap-2 mt-2 py-4 rounded-2xl text-sm font-semibold transition-colors shadow-[0_4px_20px_rgba(0,0,0,0.08)] ${loading ? 'bg-[#555] text-white/70 cursor-wait' : 'bg-[#1a1a1a] text-white hover:bg-[#333]'}`}
              type="submit"
            >
              {loading
                ? mode === 'login' ? 'Iniciando sesión…' : 'Enviando…'
                : mode === 'login' ? 'Iniciar sesión' : 'Enviar enlace'}
              {!loading && (
                <span className="material-symbols-outlined text-[18px]" style={{ fontVariationSettings: "'wght' 300" }}>
                  {mode === 'login' ? 'login' : 'send'}
                </span>
              )}
            </motion.button>

            {mode === 'reset' && (
              <button
                type="button"
                onClick={() => switchMode('login')}
                className="w-full text-center text-sm text-[#888] hover:text-[#1a1a1a] transition-colors"
              >
                Volver a iniciar sesión
              </button>
            )}
          </form>
        )}
      </motion.div>
    </div>
  );
}
