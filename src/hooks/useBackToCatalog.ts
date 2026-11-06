'use client';

import { useRouter } from 'next/navigation';
import { useCallback } from 'react';

/**
 * Fase 7 (1.2): volver al catálogo conservando la posición y los filtros.
 *
 * Problema anterior: el botón "regresar" era `<Link href="/">`, así que
 * *siempre* llevaba a la portada sin `?category=`, y el navegador reiniciaba el
 * scroll al principio. El visitante perdía el punto donde estaba.
 *
 * Solución: si hay historial interno, se usa `router.back()`, que deja que el
 * navegador restaure el scroll (comportamiento estándar). Si no lo hay (por
 * ejemplo, alguien abrió el enlace de un producto directamente desde WhatsApp),
 * se navega a la portada.
 */
export function useBackToCatalog() {
  const router = useRouter();

  return useCallback(() => {
    // `history.length > 1` indica que hay una entrada previa en esta pestaña.
    // No es perfecto (podría ser de otro sitio), pero es el indicador estándar
    // sin acceso a la Navigation API.
    if (typeof window !== 'undefined' && window.history.length > 1) {
      router.back();
      return;
    }
    router.push('/');
  }, [router]);
}
