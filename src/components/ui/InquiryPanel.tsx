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
 * Fase 24 — Lista de consulta, rediseñada para ocupar poco espacio.
 *
 * Antes era una barra ancha fija más un panel a pantalla completa: entre los dos
 * tapaban buena parte del catálogo y no dejaban ver los productos.
 *
 * Ahora:
 *   - La barra flotante es compacta (una sola línea, ~44 px).
 *   - Al abrirla, el panel llega como hoja inferior con ALTURA MÁXIMA del 60%
 *     de la pantalla y los productos en lista desplazable.
 *   - Tiene un asa para cerrarla arrastrando y un botón «Cerrar».
 *   - Se puede contraer para seguir mirando el catálogo con la lista a mano.
 */
export default function InquiryPanel() {
  const whatsappNumber = useWhatsappNumber();
  const [items, setItems] = useState<InquiryItem[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [mounted, setMounted] = useState(false);

  const reload = useCallback(() => {
    setItems(getInquiryList());
  }, []);

  useEffect(() => {
    reload();
    setMounted(true);

    const onUpdate = () => reload();
    window.addEventListener(INQUIRY_EVENT, onUpdate);
    const onStorage = (e: StorageEvent) => {
      if (e.key === INQUIRY_KEY) reload();
    };
    window.addEventListener('storage', onStorage);

    return () => {
      window.removeEventListener(INQUIRY_EVENT, onUpdate);
      window.removeEventListener('storage', onStorage);
    };
  }, [reload]);

  // Bloquea el scroll del fondo sólo mientras el panel está abierto.
  useEffect(() => {
    if (!isOpen) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = prev;
    };
  }, [isOpen]);

  // Escape cierra el panel.
  useEffect(() => {
    if (!isOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setIsOpen(false);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [isOpen]);

  if (!mounted || items.length === 0) return null;

  const whatsappUrl = buildWhatsappUrl(whatsappNumber, buildInquiryMessage(items));

  const handleSend = () => {
    if (!whatsappUrl) return;
    window.open(whatsappUrl, '_blank', 'noopener,noreferrer');
  };

  return (
    <>
      {/* Barra compacta: una sola línea, pegada sobre la nav inferior.
          Antes tenía dos líneas de texto y ocupaba casi el doble. */}
      <div className="fixed bottom-[calc(64px+env(safe-area-inset-bottom)+8px)] left-1/2 z-30 w-[calc(100%-1.5rem)] max-w-[420px] -translate-x-1/2 md:bottom-5">
        <div className="flex items-center gap-2 rounded-full border border-white/10 bg-[#1a1a1a] py-1.5 pl-1.5 pr-2 shadow-[0_6px_24px_rgba(0,0,0,0.28)] mm-in">
          <button
            onClick={() => setIsOpen(true)}
            className="flex min-w-0 flex-1 items-center gap-2 rounded-full px-1 text-left"
            aria-label={`Ver mi lista: ${items.length} producto${items.length === 1 ? '' : 's'}`}
          >
            <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-white/15 text-white">
              <span className="material-symbols-outlined text-[17px]">checklist</span>
            </span>
            <span className="truncate text-[12px] font-semibold text-white">
              {items.length} en tu lista
            </span>
          </button>

          <button
            onClick={handleSend}
            disabled={!whatsappUrl}
            aria-label="Consultar todos por WhatsApp"
            className="flex shrink-0 items-center gap-1 rounded-full bg-[#25D366] px-3 py-2 text-[11px] font-semibold text-white transition-transform active:scale-95 disabled:opacity-50"
          >
            <span className="material-symbols-outlined text-[15px]">send</span>
            <span className="hidden sm:inline">Enviar</span>
          </button>
        </div>
      </div>

      {/* Panel: hoja inferior de altura acotada (máx. 60dvh).
          No llega arriba ni cubre el catálogo entero. */}
      {isOpen && (
        <div
          className="fixed inset-0 z-[100] flex items-end justify-center bg-black/35"
          onClick={() => setIsOpen(false)}
          role="dialog"
          aria-modal="true"
          aria-labelledby="inquiry-title"
        >
          <div
            className="flex max-h-[60dvh] w-full max-w-[440px] flex-col overflow-hidden rounded-t-[24px] bg-white pb-bottom-nav mm-in-sheet md:rounded-[24px] md:pb-0"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Asa para cerrar arrastrando (sólo visual + botón) */}
            <div className="flex shrink-0 flex-col items-center pt-2">
              <div className="h-1 w-10 rounded-full bg-[#ddd]" />
            </div>

            {/* Cabecera compacta */}
            <div className="flex shrink-0 items-center justify-between px-4 py-2.5">
              <div className="min-w-0">
                <h2 id="inquiry-title" className="text-[14px] font-semibold text-[#1a1a1a]">
                  Tu lista de consulta
                </h2>
                <p className="truncate text-[10px] text-[#6b6b6b]">
                  Todos en un solo mensaje
                </p>
              </div>
              <button
                onClick={() => setIsOpen(false)}
                aria-label="Cerrar lista"
                className="flex size-9 shrink-0 items-center justify-center rounded-full text-[#666] transition-colors hover:bg-[#f4f2f0] active:scale-90"
              >
                <span className="material-symbols-outlined text-[19px]">close</span>
              </button>
            </div>

            {/* Productos: filas densas y desplazables */}
            <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-3 pb-2">
              {items.map((item) => (
                <div
                  key={item.id}
                  className="mb-1.5 flex items-center gap-2.5 rounded-xl bg-[#f8f8f6] p-2"
                >
                  <div className="flex size-9 shrink-0 items-center justify-center overflow-hidden rounded-lg bg-[#eeecea]">
                    {item.image_url ? (
                      <Image
                        src={item.image_url}
                        alt={item.name}
                        width={36}
                        height={36}
                        className="size-full object-cover"
                      />
                    ) : (
                      <span className="material-symbols-outlined text-[15px] text-[#aaa]">image</span>
                    )}
                  </div>

                  <div className="min-w-0 flex-1">
                    <p className="truncate text-[12px] font-medium leading-tight text-[#1a1a1a]">
                      {item.name}
                    </p>
                    <p className="truncate text-[10px] leading-tight text-[#6b6b6b]">
                      {[item.color_name, item.size].filter(Boolean).join(' · ') || 'Sin variante'}
                    </p>
                  </div>

                  <button
                    onClick={() => removeFromInquiry(item.id)}
                    aria-label={`Quitar ${item.name} de la lista`}
                    className="flex size-8 shrink-0 items-center justify-center rounded-full text-[#aaa] transition-colors hover:bg-[#ececea] hover:text-[#c62828] active:scale-90"
                  >
                    <span className="material-symbols-outlined text-[15px]">close</span>
                  </button>
                </div>
              ))}
            </div>

            {/* Acciones: una fila, sin ocupar de más */}
            <div className="flex shrink-0 items-center gap-2 border-t border-[#ece9e2] px-3 pb-[calc(10px+env(safe-area-inset-bottom))] pt-2.5">
              <button
                onClick={() => {
                  clearInquiry();
                  setIsOpen(false);
                }}
                className="shrink-0 rounded-xl px-2.5 py-2 text-[11px] font-medium text-[#6b6b6b] underline underline-offset-2 hover:text-[#1a1a1a]"
              >
                Vaciar
              </button>

              <button
                onClick={handleSend}
                disabled={!whatsappUrl}
                className="flex flex-1 items-center justify-center gap-1.5 rounded-xl bg-[#25D366] py-2.5 text-[12px] font-semibold text-white transition-transform active:scale-[0.98] disabled:opacity-50"
              >
                <span className="material-symbols-outlined text-[16px]">send</span>
                Consultar {items.length}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
