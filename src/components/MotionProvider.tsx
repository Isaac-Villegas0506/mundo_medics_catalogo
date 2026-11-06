'use client';

import * as React from 'react';
import { MotionConfig } from 'motion/react';

/**
 * Fase 6 (10.4): hace que TODAS las animaciones de `motion/react` respeten
 * `prefers-reduced-motion` sin tocar cada componente.
 *
 * `reducedMotion="user"` hace que Motion consulte la preferencia del sistema:
 * cuando está activa, las animaciones de transformación/opacidad se resuelven
 * al instante en lugar de reproducirse.
 *
 * Se eligió esto en lugar de usar `useReducedMotion()` en cada componente
 * porque hay ~75 usos de `motion.*` repartidos en 12 archivos; un único
 * proveedor cubre todos y evita que se olvide uno al añadir UI nueva.
 */
export function MotionProvider({ children }: { children: React.ReactNode }) {
  return <MotionConfig reducedMotion="user">{children}</MotionConfig>;
}
