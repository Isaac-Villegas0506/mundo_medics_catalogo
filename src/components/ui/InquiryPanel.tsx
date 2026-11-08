'use client';

import React, { useState, useEffect, useCallback } from 'react';
import Image from 'next/image';
import { useWhatsappNumber } from '@/hooks/useWhatsappNumber';
import { buildWhatsappUrl } from '@/utils/whatsapp';
import {
  InquiryItem,
  getInquiryList,
  removeFromInquiry,
  clearInquiry,
  buildInquiryMessage,
  INQUIRY_EVENT,
  INQUIRY_KEY,
} from '@/utils/inquiryList';

/**
 * Fase 22 — Panel flotante de la «lista de consulta».
 *
 * Aparece sólo cuando el cliente ha guardado algún producto. Muestra cuántos
 * lleva y permite enviarlos TODOS en un único mensaje de WhatsApp, además de
 * quitarlos uno a uno.
 */
export default function InquiryPanel() {
  const whatsappNumber = useWhatsappNumber();
  const [items, setItems] = useState<InquiryItem[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  /* Evita el parpadeo en el primer render: hasta leer localStorage no sabemos
     si hay elementos, así que no se pinta nada. */
  const [mounted, setMounted] = useState(false);

  const reload = useCallback(() => {
    setItems(getInquiryList());
  }, []);

  useEffect(() => {
    reload();
    setMounted(true);

    const onUpdate = () => reload();
    window.addEventListener(INQUIRY_EVENT, onUpdate);
    // Sincroniza entre pestañas abiertas.
    const onStorage = (e: StorageEvent) => {
      if (e.key === INQUIRY_KEY) reload();
    };
    window.addEventListener('storage', onStorage);

    return () => {
      window.removeEventListener(INQUIRY_EVENT, onUpdate);
      window.removeEventListener('storage', onStorage);
    };
  }, [reload]);

  // Bloquea el scroll del fondo cuando el panel está abierto.
  useEffect(() => {
    if (!isOpen) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = prev;
    };
  }, [isOpen]);

  if (!mounted || items.length === 0) return null;

  const whatsappUrl = buildWhatsappUrl(whatsappNumber, buildInquiryMessage(items));

  const handleSend = () => {
    if (!whatsappUrl) return;
    window.open(whatsappUrl, '_blank', 'noopener,noreferrer');
  };

  return (
    <>
      {/* Barra flotante.
          Fase 23: se coloca ENCIMA de la barra de navegación (BottomNav mide
          64px) y no la tapa. En escritorio va al pie de la ventana. */}
      <div className="fixed bottom-[calc(64px+env(safe-area-inset-bottom)+12px)] left-1/2 z-30 w-[calc(100%-2rem)] max-w-[520px] -translate-x-1/2 md:bottom-6">
        <div className="flex items-center gap-3 rounded-2xl border border-black/5 bg-[#1a1a1a] px-3 py-2.5 shadow-[0_8px_30px_rgba(0,0,0,0.25)] mm-in">
          <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-white/15 text-white">
            <span className="material-symbols-outlined text-[18px]">checklist</span>
          </span>

          <button
            onClick={() => setIsOpen(true)}
            className="min-w-0 flex-1 text-left"
            aria-label="Ver mi lista de consulta"
          >
            <span className="block text-[12px] font-semibold leading-tight text-white">
              {items.length} producto{items.length === 1 ? '' : 's'} en tu lista
            </span>
            <span className="block truncate text-[10px] text-white/60">
              Toca para ver o enviar
            </span>
          </button>

          <button
            onClick={handleSend}
            disabled={!whatsappUrl}
            aria-label="Consultar todos por WhatsApp"
            className="flex shrink-0 items-center gap-1 rounded-xl bg-[#25D366] px-2.5 py-2 text-[11px] font-semibold text-white transition-transform active:scale-95 disabled:opacity-50"
          >
            <span className="material-symbols-outlined text-[16px]">send</span>
            <span className="hidden sm:inline">Enviar</span>
          </button>
        </div>
      </div>

      {/* Panel desplegable.
          Fase 23: en móvil se ancla sobre la barra de navegación (no encima de
          ella) y su altura máxima descuenta la nav + zona segura, para que el
          botón de enviar quede siempre accesible. */}
      {isOpen && (
        <div
          className="fixed inset-0 z-[100] flex items-end justify-center bg-black/40 md:items-center"
          onClick={() => setIsOpen(false)}
          role="dialog"
          aria-modal="true"
          aria-labelledby="inquiry-title"
        >
          <div
            className="flex max-h-[calc(85dvh-64px-env(safe-area-inset-bottom))] w-full max-w-[520px] flex-col overflow-hidden rounded-t-[28px] mb-bottom-nav bg-white md:mb-0 md:rounded-[28px] mm-in-sheet"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Cabecera */}
            <div className="flex shrink-0 items-center justify-between border-b border-[#ece9e2] px-5 py-4">
              <div>
                <h2 id="inquiry-title" className="text-[15px] font-semibold text-[#1a1a1a]">
                  Mi lista de consulta
                </h2>
                <p className="text-[11px] text-[#6b6b6b]">
                  Se enviarán todos en un solo mensaje
                </p>
              </div>
              <button
                onClick={() => setIsOpen(false)}
                aria-label="Cerrar"
                className="flex h-11 w-11 items-center justify-center rounded-full text-[#666] transition-colors hover:bg-[#f4f2f0] active:scale-90"
              >
                <span className="material-symbols-outlined text-[21px]">close</span>
              </button>
            </div>

            {/* Lista */}
            <div className="flex-1 overflow-y-auto px-4 py-3">
              {items.map((item) => (
                <div
                  key={item.id}
                  className="mb-2 flex items-center gap-3 rounded-2xl border border-[#ece9e2] p-2.5"
                >
                  <div className="flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-[#f4f2f0]">
                    {item.image_url ? (
                      <Image
                        src={item.image_url}
                        alt={item.name}
                        width={48}
                        height={48}
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      <span className="material-symbols-outlined text-[17px] text-[#aaa]">image</span>
                    )}
                  </div>

                  <div className="min-w-0 flex-1">
                    <p className="truncate text-[13px] font-medium text-[#1a1a1a]">{item.name}</p>
                    <p className="truncate text-[11px] text-[#6b6b6b]">
                      {[item.color_name, item.size].filter(Boolean).join(' · ') || 'Sin variante'}
                    </p>
                  </div>

                  <button
                    onClick={() => removeFromInquiry(item.id)}
                    aria-label={`Quitar ${item.name} de la lista`}
                    className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-[#aaa] transition-colors hover:bg-[#f4f2f0] hover:text-[#c62828] active:scale-90"
                  >
                    <span className="material-symbols-outlined text-[17px]">close</span>
                  </button>
                </div>
              ))}
            </div>

            {/* Acciones */}
            <div className="shrink-0 border-t border-[#ece9e2] px-4 py-3 pb-[calc(12px+env(safe-area-inset-bottom))]">
              <button
                onClick={handleSend}
                disabled={!whatsappUrl}
                className="flex w-full items-center justify-center gap-2 rounded-2xl bg-[#25D366] py-3.5 text-[14px] font-semibold text-white transition-transform active:scale-[0.98] disabled:opacity-50"
              >
                <span className="material-symbols-outlined text-[19px]">send</span>
                Consultar {items.length} por WhatsApp
              </button>

              <button
                onClick={() => {
                  clearInquiry();
                  setIsOpen(false);
                }}
                className="mt-2 w-full py-2 text-[12px] font-medium text-[#6b6b6b] underline underline-offset-2 hover:text-[#1a1a1a]"
              >
                Vaciar la lista
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
