'use client';

import React, { useState, useEffect } from 'react';
import { supabase } from '@/utils/supabase/client';

export default function AdminSettingsPage() {
  const [whatsappNumber, setWhatsappNumber] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [saveMessage, setSaveMessage] = useState('');

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    setIsLoading(true);
    // Since we are adding it dynamically, we handle if the table doesn't exist perfectly yet
    try {
      const { data, error } = await supabase
        .from('settings')
        .select('value')
        .eq('key', 'whatsapp_number')
        .maybeSingle();
      
      if (!error && data) {
        setWhatsappNumber(data.value);
      }
    } catch (e) {
      console.log('Settings table might not exist yet.');
    }
    setIsLoading(false);
  };

  const handleSave = async () => {
    setIsSaving(true);
    setSaveMessage('');
    
    try {
      const { error } = await supabase
        .from('settings')
        .upsert({ key: 'whatsapp_number', value: whatsappNumber }, { onConflict: 'key' });
        
      if (error) throw error;
      setSaveMessage('Configuración guardada exitosamente.');
      
      // Dispatch an event so the client app can update the WhatsApp link dynamically if open in another tab
      window.dispatchEvent(new Event('settingsUpdated'));
      
      setTimeout(() => setSaveMessage(''), 3000);
    } catch (e) {
      setSaveMessage('Error al guardar. Asegúrate de haber ejecutado el script SQL.');
    }
    
    setIsSaving(false);
  };

  return (
    <main className="flex-1 p-4 md:p-8 w-full max-w-3xl self-start flex flex-col gap-6 pb-[100px] md:pb-8">
      <div>
        <h2 className="text-[28px] md:text-[34px] font-semibold tracking-tight text-[#1a1a1a] leading-tight">
          Ajustes
        </h2>
        <p className="text-[#888] text-sm font-normal mt-1">
          Configura información general de la tienda.
        </p>
      </div>

      <div className="w-full bg-white rounded-3xl p-6 shadow-[0_2px_12px_rgba(0,0,0,0.03)] border border-black/5">
        <h3 className="font-semibold text-lg text-[#1a1a1a] mb-5">
          Contacto
        </h3>

        {isLoading ? (
          <div className="text-sm text-[#888]">Cargando configuración...</div>
        ) : (
          <div className="flex flex-col gap-4 w-full md:w-2/3 lg:w-1/2">
            <div className="w-full">
              <label className="block text-[11px] font-semibold text-[#aaa] uppercase tracking-wider mb-2">
                Número de WhatsApp
              </label>
              <input
                type="text"
                value={whatsappNumber}
                onChange={e => setWhatsappNumber(e.target.value)}
                className="w-full bg-[#f8f8f6] border border-transparent focus:border-black/10 outline-none rounded-xl px-4 py-3 text-sm text-[#1a1a1a] transition-all focus:bg-white"
                placeholder="Ej. +51987654321"
              />
              <p className="text-[10px] text-[#888] mt-1">
                Incluye el código de país (ej. +51 para Perú). Este número se usará en el botón de consultas.
              </p>
            </div>

            <div className="mt-2">
              <button
                onClick={handleSave}
                disabled={isSaving || !whatsappNumber.trim()}
                className="bg-[#1a1a1a] text-white font-semibold text-sm px-6 py-3 rounded-xl hover:bg-[#333] transition-colors disabled:opacity-50"
              >
                {isSaving ? 'Guardando...' : 'Guardar Cambios'}
              </button>
              {saveMessage && (
                <p className="text-sm font-medium mt-3 text-[#1a1a1a]">{saveMessage}</p>
              )}
            </div>
          </div>
        )}
      </div>
    </main>
  );
}
