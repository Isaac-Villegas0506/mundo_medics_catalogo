'use client';

import { supabase } from '@/utils/supabase/client';

export type ActivityAction = 'create' | 'update' | 'delete' | 'status' | 'reorder';
export type ActivityEntity = 'product' | 'category' | 'settings' | 'featured';

interface LogActivityInput {
  action: ActivityAction;
  entity: ActivityEntity;
  /** Nombre legible de lo afectado (producto, categoría, etc.). */
  entityName?: string | null;
  /** Detalle corto opcional. */
  detail?: string | null;
}

/**
 * Fase 33 — Registra una acción del administrador para «Actividad reciente».
 *
 * Es «fire and forget»: si falla (red, RLS) NO debe romper la operación que el
 * usuario estaba haciendo. Por eso nunca lanza y no se espera en el flujo
 * principal del guardado.
 */
export function logActivity({ action, entity, entityName, detail }: LogActivityInput) {
  void supabase
    .from('admin_activity')
    .insert({
      action,
      entity,
      entity_name: entityName ? String(entityName).slice(0, 200) : null,
      detail: detail ? String(detail).slice(0, 300) : null,
    })
    .then(
      () => {},
      () => {}
    );
}

/** Texto legible para cada tipo de acción, usado en el dashboard. */
export const ACTION_LABEL: Record<string, string> = {
  create: 'creó',
  update: 'editó',
  delete: 'eliminó',
  status: 'cambió el estado de',
  reorder: 'reordenó',
};

export const ENTITY_LABEL: Record<string, string> = {
  product: 'producto',
  category: 'categoría',
  settings: 'ajustes',
  featured: 'destacados',
};
