'use client';

import * as React from 'react';

/** Distancia mínima (px) para considerar que fue un deslizamiento y no un toque. */
const SWIPE_THRESHOLD = 50;
/** Si el movimiento vertical domina, se deja pasar el scroll de la página. */
const VERTICAL_TOLERANCE = 30;

/**
 * Fase 7 (1.4): deslizar con el dedo para cambiar de imagen.
 *
 * Se implementa con Pointer Events nativos, sin instalar ninguna librería:
 *   - Un solo conjunto de manejadores sirve para dedo, lápiz y ratón.
 *   - Sólo se captura el gesto cuando el movimiento es claramente HORIZONTAL;
 *     si el usuario está desplazando la página en vertical, no se intercepta
 *     (por eso se compara contra VERTICAL_TOLERANCE).
 *   - Un toque sin desplazamiento no cambia de imagen.
 *
 * Devuelve los manejadores a repartir en el contenedor de la galería.
 */
export function useSwipeGallery(
  onNext: () => void,
  onPrev: () => void,
  enabled = true
) {
  const start = React.useRef<{ x: number; y: number; pointerId: number } | null>(null);
  const axis = React.useRef<'none' | 'horizontal' | 'vertical'>('none');

  const onPointerDown = React.useCallback(
    (e: React.PointerEvent) => {
      if (!enabled) return;
      // Sólo botón principal (evita el clic derecho en ratón).
      if (e.button !== 0) return;
      start.current = { x: e.clientX, y: e.clientY, pointerId: e.pointerId };
      axis.current = 'none';
    },
    [enabled]
  );

  const onPointerMove = React.useCallback((e: React.PointerEvent) => {
    if (!start.current || start.current.pointerId !== e.pointerId) return;

    const dx = e.clientX - start.current.x;
    const dy = e.clientY - start.current.y;

    // Se decide el eje una sola vez, en cuanto hay movimiento suficiente.
    if (axis.current === 'none') {
      if (Math.abs(dx) > 10 || Math.abs(dy) > 10) {
        axis.current = Math.abs(dx) > Math.abs(dy) ? 'horizontal' : 'vertical';
      }
    }

    // Si el gesto es horizontal, se marca para que el navegador no haga scroll
    // lateral mientras se desliza sobre la imagen.
    if (axis.current === 'horizontal' && e.cancelable) {
      e.preventDefault();
    }
  }, []);

  const finish = React.useCallback(
    (e: React.PointerEvent) => {
      if (!start.current || start.current.pointerId !== e.pointerId) return;

      const dx = e.clientX - start.current.x;
      const dy = e.clientY - start.current.y;
      const wasHorizontal = axis.current === 'horizontal';

      start.current = null;
      axis.current = 'none';

      if (!wasHorizontal) return;
      // Si el gesto fue más vertical que horizontal, no se cambia de imagen.
      if (Math.abs(dy) > VERTICAL_TOLERANCE) return;

      if (dx <= -SWIPE_THRESHOLD) onNext();      // deslizar a la izquierda
      else if (dx >= SWIPE_THRESHOLD) onPrev();  // deslizar a la derecha
    },
    [onNext, onPrev]
  );

  return {
    onPointerDown,
    onPointerMove,
    onPointerUp: finish,
    onPointerCancel: finish,
    // Evita el menú contextual / selección al arrastrar sobre la imagen.
    onDragStart: (e: React.DragEvent) => e.preventDefault(),
  };
}
