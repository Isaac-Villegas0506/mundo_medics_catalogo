'use client';

import { useEffect, useState } from 'react';

/**
 * Reemplazo ligero de `AnimatePresence` (Fase 10).
 *
 * `AnimatePresence` mantenía el nodo montado mientras corría la animación de
 * salida. Sin framer-motion, este hook hace lo mismo con CSS:
 *
 *   1. Cuando `open` pasa a false, marca `isLeaving`.
 *   2. El componente aplica la clase de salida (`.mm-out-*`).
 *   3. Al terminar `ms`, el nodo se desmonta de verdad.
 *
 * Devuelve `shouldRender` (montar o no) e `isLeaving` (qué clase usar).
 *
 * Ejemplo:
 *   const { shouldRender, isLeaving } = useDelayedUnmount(open, 240);
 *   if (!shouldRender) return null;
 *   <div className={isLeaving ? 'mm-out-sheet' : 'mm-in-sheet'} />
 */
export function useDelayedUnmount(open: boolean, durationMs = 220) {
  const [shouldRender, setShouldRender] = useState(open);
  const [isLeaving, setIsLeaving] = useState(false);

  useEffect(() => {
    if (open) {
      // Al abrir se monta inmediatamente y se cancela cualquier salida.
      setShouldRender(true);
      setIsLeaving(false);
      return;
    }

    // Al cerrar: si nunca estuvo montado, no hay nada que animar.
    if (!shouldRender) return;

    setIsLeaving(true);
    const timer = setTimeout(() => {
      setShouldRender(false);
      setIsLeaving(false);
    }, durationMs);

    return () => clearTimeout(timer);
    // `shouldRender` se omite a propósito: sólo interesa reaccionar a `open`.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, durationMs]);

  return { shouldRender, isLeaving };
}
