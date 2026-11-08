'use client';

import React, { useEffect, useRef } from 'react';
import { useDelayedUnmount } from '@/hooks/useDelayedUnmount';

type Variant = 'success' | 'error' | 'warning' | 'confirm';

interface AdminDialogProps {
  open: boolean;
  variant?: Variant;
  title: string;
  /** Texto o contenido del cuerpo. */
  children?: React.ReactNode;
  /** Texto del botón principal. */
  confirmLabel?: string;
  /** Texto del botón secundario. Si se omite, no se muestra. */
  cancelLabel?: string;
  onConfirm: () => void;
  onCancel?: () => void;
  /** Deshabilita el botón principal (p. ej. cuenta atrás de borrado). */
  confirmDisabled?: boolean;
}

const VARIANT_STYLE: Record<Variant, { icon: string; ring: string; iconColor: string }> = {
  success: { icon: 'check_circle', ring: 'bg-[#eef7ee]', iconColor: 'text-[#2e7d32]' },
  error: { icon: 'error', ring: 'bg-[#fdf3f3]', iconColor: 'text-[#c62828]' },
  warning: { icon: 'warning', ring: 'bg-[#fff8e1]', iconColor: 'text-[#f57f17]' },
  confirm: { icon: 'delete', ring: 'bg-[#fdf3f3]', iconColor: 'text-[#c62828]' },
};

/**
 * Fase 17 — Modal de avisos del panel.
 *
 * Sustituye a `alert()` y `confirm()` del navegador, que:
 *   - bloquean la pestaña,
 *   - no se pueden personalizar ni cerrar con un botón propio,
 *   - en algunos móviles se muestran como un diálogo del sistema que corta el flujo.
 *
 * Este modal:
 *   - se cierra con el botón ✕, con «Cancelar» y con Escape,
 *   - no bloquea la página,
 *   - mantiene el foco dentro (foco inicial en el botón principal).
 */
export default function AdminDialog({
  open,
  variant = 'success',
  title,
  children,
  confirmLabel = 'Entendido',
  cancelLabel,
  onConfirm,
  onCancel,
  confirmDisabled = false,
}: AdminDialogProps) {
  const { shouldRender, isLeaving } = useDelayedUnmount(open, 180);
  const confirmRef = useRef<HTMLButtonElement>(null);
  const style = VARIANT_STYLE[variant];

  /* Escape cierra; el foco va al botón principal al abrir. */
  useEffect(() => {
    if (!open) return;

    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') (onCancel ?? onConfirm)();
      if (e.key === 'Enter' && !confirmDisabled) onConfirm();
    };

    window.addEventListener('keydown', onKey);
    // Pequeño retardo para que el nodo exista antes de enfocar.
    const t = setTimeout(() => confirmRef.current?.focus(), 50);

    return () => {
      window.removeEventListener('keydown', onKey);
      clearTimeout(t);
    };
  }, [open, onCancel, onConfirm, confirmDisabled]);

  if (!shouldRender) return null;

  const handleClose = () => (onCancel ?? onConfirm)();

  return (
    <div
      className={`fixed inset-0 z-[120] flex items-center justify-center bg-black/40 p-4 ${isLeaving ? 'mm-out' : 'mm-in'}`}
      onClick={handleClose}
      role="dialog"
      aria-modal="true"
      aria-labelledby="admin-dialog-title"
    >
      <div
        className={`w-full max-w-[400px] rounded-3xl bg-white p-6 shadow-2xl ${isLeaving ? 'mm-out-pop' : 'mm-in-pop'}`}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Botón de cierre propio */}
        <div className="mb-2 flex justify-end">
          <button
            onClick={handleClose}
            aria-label="Cerrar aviso"
            className="-mr-2 -mt-2 flex h-11 w-11 items-center justify-center rounded-full text-[#888] transition-colors hover:bg-[#f4f2f0] hover:text-[#1a1a1a] active:scale-90"
          >
            <span className="material-symbols-outlined text-[20px]">close</span>
          </button>
        </div>

        <div className="flex flex-col items-center text-center">
          <div className={`mb-4 flex h-14 w-14 items-center justify-center rounded-full ${style.ring}`}>
            <span className={`material-symbols-outlined text-[30px] ${style.iconColor}`} aria-hidden="true">
              {style.icon}
            </span>
          </div>

          <h3 id="admin-dialog-title" className="mb-2 text-lg font-semibold text-[#1a1a1a]">
            {title}
          </h3>

          {children && (
            <div className="mb-6 text-sm leading-relaxed text-[#777]">{children}</div>
          )}

          {!children && <div className="mb-6" />}

          <div className="flex w-full gap-3">
            {cancelLabel && (
              <button
                onClick={handleClose}
                className="flex-1 rounded-2xl bg-[#f2f2f0] py-3 text-sm font-semibold text-[#1a1a1a] transition-colors hover:bg-[#e8e8e4] active:scale-[0.98]"
              >
                {cancelLabel}
              </button>
            )}
            <button
              ref={confirmRef}
              onClick={onConfirm}
              disabled={confirmDisabled}
              className={`flex-1 rounded-2xl py-3 text-sm font-semibold text-white transition-colors active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50 ${
                variant === 'success' ? 'bg-[#1a1a1a] hover:bg-[#333]' : 'bg-[#c62828] hover:bg-[#a01f1f]'
              }`}
            >
              {confirmLabel}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
