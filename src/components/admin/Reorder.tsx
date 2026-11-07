'use client';

import React, { useCallback, useEffect, useRef, useState } from 'react';

/**
 * Reemplazo de `<Reorder>` de framer-motion (Fase 10).
 *
 * Permite reordenar una lista arrastrando, con Pointer Events nativos y sin
 * dependencias. Mantiene la misma forma de uso que el original:
 *
 *   <ReorderGroup values={items} onReorder={setItems} className="flex flex-col">
 *     {items.map(item => (
 *       <ReorderItem key={item.id} value={item}>...contenido...</ReorderItem>
 *     ))}
 *   </ReorderGroup>
 *
 * El índice de cada fila se deduce de `values` (por referencia de `value`), así
 * que la página no tiene que pasarlo a mano y no se desincroniza al reordenar.
 */

type DragState = {
  pointerId: number;
  fromIndex: number;
  itemHeight: number;
  /** Última posición Y del puntero. */
  lastY: number;
};

const ReorderContext = React.createContext<{
  values: unknown[];
  startDrag: (value: unknown, e: React.PointerEvent, height: number) => void;
  draggingValue: unknown;
}>({ values: [], startDrag: () => {}, draggingValue: undefined });

interface ReorderGroupProps<T> {
  values: T[];
  onReorder: (values: T[]) => void;
  className?: string;
  axis?: 'y' | 'x';
  children: React.ReactNode;
}

export function ReorderGroup<T>({
  values,
  onReorder,
  className = '',
  children,
}: ReorderGroupProps<T>) {
  const [drag, setDrag] = useState<DragState | null>(null);
  const [draggingValue, setDraggingValue] = useState<unknown>(undefined);
  const containerRef = useRef<HTMLDivElement>(null);
  const valuesRef = useRef(values);

  /* El ref se sincroniza en un efecto (no durante el render, que React prohíbe
     y provocaría lecturas inconsistentes si el render se interrumpe). */
  useEffect(() => {
    valuesRef.current = values;
  }, [values]);

  /** Índice de destino según la posición del puntero. */
  const computeTarget = useCallback((clientY: number) => {
    const el = containerRef.current;
    if (!el) return 0;
    const rect = el.getBoundingClientRect();
    const relativeY = clientY - rect.top;
    const index = Math.floor(relativeY / (drag?.itemHeight || 60));
    return Math.max(0, Math.min(valuesRef.current.length - 1, index));
  }, [drag?.itemHeight]);

  const onPointerMove = useCallback(
    (e: PointerEvent) => {
      if (!drag || e.pointerId !== drag.pointerId) return;

      const target = computeTarget(e.clientY);
      const current = valuesRef.current;
      const from = current.findIndex((v) => v === draggingValue);
      if (from === -1 || target === from) return;

      // Reordena en vivo, igual que hacía framer-motion.
      const next = [...current];
      const [moved] = next.splice(from, 1);
      next.splice(target, 0, moved);
      onReorder(next);
    },
    [drag, computeTarget, draggingValue, onReorder]
  );

  const onPointerUp = useCallback(() => {
    setDrag(null);
    setDraggingValue(undefined);
  }, []);

  useEffect(() => {
    if (!drag) return;
    window.addEventListener('pointermove', onPointerMove);
    window.addEventListener('pointerup', onPointerUp);
    window.addEventListener('pointercancel', onPointerUp);
    return () => {
      window.removeEventListener('pointermove', onPointerMove);
      window.removeEventListener('pointerup', onPointerUp);
      window.removeEventListener('pointercancel', onPointerUp);
    };
  }, [drag, onPointerMove, onPointerUp]);

  const startDrag = useCallback(
    (value: unknown, e: React.PointerEvent, height: number) => {
      setDraggingValue(value);
      setDrag({
        pointerId: e.pointerId,
        fromIndex: valuesRef.current.indexOf(value as never),
        itemHeight: height,
        lastY: e.clientY,
      });
    },
    []
  );

  return (
    <div ref={containerRef} className={className} aria-busy={drag ? true : undefined}>
      <ReorderContext.Provider value={{ values: values as unknown[], startDrag, draggingValue }}>
        {children}
      </ReorderContext.Provider>
    </div>
  );
}

interface ReorderItemProps {
  value: unknown;
  className?: string;
  children: React.ReactNode;
}

/** Fila reordenable: añade el manejador de arrastre y el resaltado. */
export function ReorderItem({ value, className = '', children }: ReorderItemProps) {
  const { startDrag, draggingValue } = React.useContext(ReorderContext);
  const ref = useRef<HTMLDivElement>(null);
  const isDragging = draggingValue === value;

  const onPointerDown = (e: React.PointerEvent) => {
    if (e.button !== 0) return;
    // No iniciar arrastre al pulsar un control interactivo.
    const target = e.target as HTMLElement;
    if (target.closest('button, a, input, select, textarea, [role="button"]')) return;

    const height = ref.current?.getBoundingClientRect().height ?? 60;
    startDrag(value, e, height);
  };

  return (
    <div
      ref={ref}
      className={`${className} ${isDragging ? 'opacity-70 ring-2 ring-[#1a1a1a]/25 rounded-2xl' : ''}`}
      onPointerDown={onPointerDown}
      style={{ touchAction: 'pan-y' }}
    >
      {children}
    </div>
  );
}
