'use client';

import React, { useState, useEffect } from 'react';
import { supabase } from '@/utils/supabase/client';
import { validateImageFile } from '@/utils/imageUpload';
import { sanitizeMapEmbedUrl } from '@/utils/mapUrl';
import { uploadToCloudinary } from '@/utils/cloudinary';

export default function AdminSettingsPage() {
  const [settings, setSettings] = useState({
    whatsapp_number: '',
    instagram_url: '',
    tiktok_url: '',
    facebook_url: '',
    show_instagram: 'true',
    show_tiktok: 'true',
    show_facebook: 'true',
    map_iframe_url: '',
    map_photo_url: '',
    map_directions_url: '',
  });
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [saveMessage, setSaveMessage] = useState('');

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase.from('settings').select('*');
      if (!error && data) {
        const loadedSettings = { ...settings };
        data.forEach(item => {
          if (item.key in loadedSettings) {
            loadedSettings[item.key as keyof typeof settings] = item.value;
          }
        });
        setSettings(loadedSettings);
      }
    } catch (e) {
      console.log('Settings table might not exist yet.');
    }
    setIsLoading(false);
  };

  const handleChange = (key: string, value: string) => {
    let finalValue = value;

    // Si el usuario pega el HTML del iframe, extraemos y validamos solo el enlace.
    if (key === 'map_iframe_url') {
      finalValue = sanitizeMapEmbedUrl(value);
    }

    setSettings(prev => ({ ...prev, [key]: finalValue }));
  };

  const handleSave = async () => {
    setIsSaving(true);
    setSaveMessage('');
    
    try {
      const updates = Object.entries(settings).map(([key, value]) => ({ key, value }));
      const { error } = await supabase.from('settings').upsert(updates, { onConflict: 'key' });
        
      if (error) throw error;
      setSaveMessage('Configuración guardada exitosamente.');
      
      // Dispatch an event so the client app can update dynamically
      window.dispatchEvent(new Event('settingsUpdated'));
      
      setTimeout(() => setSaveMessage(''), 3000);
    } catch (e) {
      setSaveMessage('Error al guardar. Asegúrate de haber creado la tabla settings.');
    }
    
    setIsSaving(false);
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const validationError = validateImageFile(file);
    if (validationError) {
      alert(validationError);
      e.target.value = '';
      return;
    }

    setIsUploading(true);
    try {
      const secureUrl = await uploadToCloudinary(file);
      handleChange('map_photo_url', secureUrl);
    } catch (e) {
      console.error(e);
      alert('Error al subir la imagen. Intenta de nuevo.');
    } finally {
      setIsUploading(false);
      e.target.value = '';
    }
  };

  return (
    <main className="flex-1 p-4 md:p-8 w-full max-w-4xl mx-auto flex flex-col gap-6 pb-[100px] md:pb-8">
      
      {/* Header Sticky */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-5 bg-white/50 backdrop-blur-md p-4 md:px-6 md:py-4 rounded-3xl sticky top-[80px] z-30 shadow-sm border border-black/5">
        <div>
          <h2 className="text-[20px] font-semibold tracking-tight text-[#1a1a1a]">
            Ajustes Generales
          </h2>
          <p className="text-[11px] text-[#aaa] uppercase tracking-wider mt-1">
            Información, redes y mapa
          </p>
        </div>
        <div className="flex gap-3">
          <button
            onClick={handleSave}
            disabled={isSaving}
            className="bg-[#1a1a1a] text-white font-semibold text-sm px-6 py-2.5 rounded-xl hover:bg-[#333] transition-colors shadow-md disabled:opacity-50"
          >
            {isSaving ? 'Guardando...' : 'Guardar Cambios'}
          </button>
        </div>
      </div>
      
      {saveMessage && (
        <div className="bg-[#e8f1ff] border border-[#1f4ed8]/20 text-[#1f4ed8] p-3 rounded-xl text-sm font-medium">
          {saveMessage}
        </div>
      )}

      {isLoading ? (
        <div className="p-10 text-center">Cargando configuración...</div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-start">
          {/* Contacto */}
          <div className="w-full bg-white rounded-3xl p-6 shadow-[0_2px_12px_rgba(0,0,0,0.03)] border border-black/5 flex flex-col gap-4">
            <h3 className="font-semibold text-lg text-[#1a1a1a] mb-2">Contacto General</h3>
            <div>
              <label className="block text-[11px] font-semibold text-[#aaa] uppercase tracking-wider mb-2">Número de WhatsApp</label>
              <input
                type="text"
                value={settings.whatsapp_number}
                onChange={e => handleChange('whatsapp_number', e.target.value)}
                className="w-full bg-[#f8f8f6] border border-transparent focus:border-black/10 outline-none rounded-xl px-4 py-3 text-sm text-[#1a1a1a] transition-all focus:bg-white"
                placeholder="Ej. +51987654321"
              />
            </div>
          </div>

          {/* Redes Sociales */}
          <div className="w-full bg-white rounded-3xl p-6 shadow-[0_2px_12px_rgba(0,0,0,0.03)] border border-black/5 flex flex-col gap-4">
            <h3 className="font-semibold text-lg text-[#1a1a1a] mb-2">Redes Sociales</h3>
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="text-[11px] font-semibold text-[#aaa] uppercase tracking-wider">Instagram</label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <span className="text-xs font-medium text-[#555]">Mostrar</span>
                  <input 
                    type="checkbox" 
                    checked={settings.show_instagram !== 'false'} 
                    onChange={e => handleChange('show_instagram', e.target.checked ? 'true' : 'false')}
                    className="w-4 h-4 text-[#1a1a1a] rounded focus:ring-[#1a1a1a] border-gray-300"
                  />
                </label>
              </div>
              <input
                type="text"
                value={settings.instagram_url}
                onChange={e => handleChange('instagram_url', e.target.value)}
                className="w-full bg-[#f8f8f6] border border-transparent focus:border-black/10 outline-none rounded-xl px-4 py-3 text-sm text-[#1a1a1a] transition-all focus:bg-white"
                placeholder="https://instagram.com/tu_usuario"
              />
            </div>
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="text-[11px] font-semibold text-[#aaa] uppercase tracking-wider">TikTok</label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <span className="text-xs font-medium text-[#555]">Mostrar</span>
                  <input 
                    type="checkbox" 
                    checked={settings.show_tiktok !== 'false'} 
                    onChange={e => handleChange('show_tiktok', e.target.checked ? 'true' : 'false')}
                    className="w-4 h-4 text-[#1a1a1a] rounded focus:ring-[#1a1a1a] border-gray-300"
                  />
                </label>
              </div>
              <input
                type="text"
                value={settings.tiktok_url}
                onChange={e => handleChange('tiktok_url', e.target.value)}
                className="w-full bg-[#f8f8f6] border border-transparent focus:border-black/10 outline-none rounded-xl px-4 py-3 text-sm text-[#1a1a1a] transition-all focus:bg-white"
                placeholder="https://tiktok.com/@tu_usuario"
              />
            </div>
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="text-[11px] font-semibold text-[#aaa] uppercase tracking-wider">Facebook</label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <span className="text-xs font-medium text-[#555]">Mostrar</span>
                  <input 
                    type="checkbox" 
                    checked={settings.show_facebook !== 'false'} 
                    onChange={e => handleChange('show_facebook', e.target.checked ? 'true' : 'false')}
                    className="w-4 h-4 text-[#1a1a1a] rounded focus:ring-[#1a1a1a] border-gray-300"
                  />
                </label>
              </div>
              <input
                type="text"
                value={settings.facebook_url}
                onChange={e => handleChange('facebook_url', e.target.value)}
                className="w-full bg-[#f8f8f6] border border-transparent focus:border-black/10 outline-none rounded-xl px-4 py-3 text-sm text-[#1a1a1a] transition-all focus:bg-white"
                placeholder="https://facebook.com/tu_pagina"
              />
            </div>
          </div>

          {/* Ubicación y Mapa */}
          <div className="w-full md:col-span-2 bg-white rounded-3xl p-6 shadow-[0_2px_12px_rgba(0,0,0,0.03)] border border-black/5 flex flex-col gap-4">
            <h3 className="font-semibold text-lg text-[#1a1a1a] mb-2">Ubicación y Mapa</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-[11px] font-semibold text-[#aaa] uppercase tracking-wider mb-2">URL del Iframe (Google Maps Embed)</label>
                <textarea
                  rows={3}
                  value={settings.map_iframe_url}
                  onChange={e => handleChange('map_iframe_url', e.target.value)}
                  className="w-full bg-[#f8f8f6] border border-transparent focus:border-black/10 outline-none rounded-xl px-4 py-3 text-sm text-[#1a1a1a] transition-all focus:bg-white resize-none"
                  placeholder='Copia aquí solo el enlace (src="https://...") del iframe'
                />
              </div>
              <div className="flex flex-col gap-4">
                <div>
                  <div className="flex justify-between items-center mb-2">
                    <label className="block text-[11px] font-semibold text-[#aaa] uppercase tracking-wider">URL de la Foto del Local</label>
                    <label className={`cursor-pointer text-[10px] font-semibold bg-[#f4f2f0] hover:bg-[#eceae6] px-2 py-1 rounded transition-colors flex items-center gap-1 ${isUploading ? 'text-[#aaa]' : 'text-[#1a1a1a]'}`}>
                      {isUploading ? 'Subiendo...' : (
                        <>
                          <span className="material-symbols-outlined text-[12px]">upload</span>
                          Subir Foto
                        </>
                      )}
                      <input type="file" accept="image/*" className="hidden" onChange={handleImageUpload} disabled={isUploading} />
                    </label>
                  </div>
                  <input
                    type="text"
                    value={settings.map_photo_url}
                    onChange={e => handleChange('map_photo_url', e.target.value)}
                    className="w-full bg-[#f8f8f6] border border-transparent focus:border-black/10 outline-none rounded-xl px-4 py-3 text-sm text-[#1a1a1a] transition-all focus:bg-white"
                    placeholder="Enlace a una imagen (Ej. Unsplash o tu bucket)"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-semibold text-[#aaa] uppercase tracking-wider mb-2">Enlace de "Ver Ruta" (Google Maps Compartir)</label>
                  <input
                    type="text"
                    value={settings.map_directions_url}
                    onChange={e => handleChange('map_directions_url', e.target.value)}
                    className="w-full bg-[#f8f8f6] border border-transparent focus:border-black/10 outline-none rounded-xl px-4 py-3 text-sm text-[#1a1a1a] transition-all focus:bg-white"
                    placeholder="https://maps.app.goo.gl/..."
                  />
                </div>
              </div>
            </div>
          </div>

        </div>
      )}
    </main>
  );
}
