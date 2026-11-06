'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'motion/react';
import { supabase } from '@/utils/supabase/client';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      alert('Error: ' + error.message);
      setLoading(false);
    } else {
      // Volver a la ruta que pidió autenticación (p.ej. /admin/products) si existe.
      const next = new URLSearchParams(window.location.search).get('next');
      router.replace(next && next.startsWith('/admin') ? next : '/admin');
      router.refresh();
    }
  };
  
  return (
    <div className="min-h-screen bg-[#f8f8f6] font-sans antialiased text-[#1a1a1a] flex flex-col items-center justify-center p-6 relative overflow-hidden">
      
      {/* Centered Login Form */}
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
          <h1 className="text-[22px] font-semibold tracking-tight text-[#1a1a1a]">
            Mundo Medics
          </h1>
        </div>

        <div className="mb-8 text-center">
          <h2 className="text-[22px] md:text-[24px] font-semibold tracking-tight text-[#1a1a1a] mb-1">
            Bienvenido de nuevo
          </h2>
          <p className="text-sm font-normal text-[#888]">
            Ingresa a tu portal profesional.
          </p>
        </div>

        <form className="space-y-5" onSubmit={handleLogin}>
          {/* Email */}
          <div>
            <label className="block text-xs font-semibold uppercase tracking-widest text-[#aaa] mb-2" htmlFor="email">
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
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full pl-[44px] pr-4 py-3.5 bg-white border border-[#e0e0e0] rounded-2xl text-sm text-[#1a1a1a] placeholder:text-[#ccc] outline-none focus:border-[#1a1a1a] focus:ring-1 focus:ring-[#1a1a1a] transition-all shadow-[0_2px_10px_rgba(0,0,0,0.02)]"
                placeholder="admin@mundomedics.com"
                required
              />
            </div>
          </div>

          {/* Password */}
          <div>
            <div className="flex justify-between items-center mb-2">
              <label className="block text-xs font-semibold uppercase tracking-widest text-[#aaa]" htmlFor="password">
                Contraseña
              </label>
              <a href="#" className="text-xs font-medium text-[#888] hover:text-[#1a1a1a] underline underline-offset-2 transition-colors">
                ¿Olvidaste tu contraseña?
              </a>
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
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full pl-[44px] pr-4 py-3.5 bg-white border border-[#e0e0e0] rounded-2xl text-sm text-[#1a1a1a] placeholder:text-[#ccc] outline-none focus:border-[#1a1a1a] focus:ring-1 focus:ring-[#1a1a1a] transition-all shadow-[0_2px_10px_rgba(0,0,0,0.02)]"
                placeholder="••••••••"
                required
              />
            </div>
          </div>

          {/* Remember me */}
          <div className="flex items-center pt-1 pb-2">
            <input
              id="remember-me"
              type="checkbox"
              className="h-4 w-4 rounded border-[#d0d0d0] text-[#1a1a1a] focus:ring-[#1a1a1a] cursor-pointer"
            />
            <label htmlFor="remember-me" className="ml-2 text-sm text-[#888] cursor-pointer">
              Mantener sesión iniciada
            </label>
          </div>

          {/* Submit */}
          <motion.button
            disabled={loading}
            whileTap={{ scale: 0.98 }}
            className={`w-full flex items-center justify-center gap-2 mt-2 py-4 rounded-2xl text-sm font-semibold transition-colors shadow-[0_4px_20px_rgba(0,0,0,0.08)] ${loading ? 'bg-[#555] text-white/70' : 'bg-[#1a1a1a] text-white hover:bg-[#333]'}`}
            type="submit"
          >
            {loading ? 'Iniciando sesión...' : 'Iniciar sesión'}
            {!loading && (
              <span className="material-symbols-outlined text-[18px]" style={{ fontVariationSettings: "'wght' 300" }}>login</span>
            )}
          </motion.button>
        </form>
      </motion.div>
    </div>
  );
}
