import { supabase } from '@/utils/supabase/client';

export type StoreSettings = Record<string, string>;

const TTL_MS = 5 * 60 * 1000; // 5 minutos

// Caché explícita y documentada de la configuración pública (whatsapp, redes,
// mapa). Es la única excepción permitida a "no usar variables de módulo como
// caché": son datos públicos, de solo lectura y cambian muy poco (plan, 8.6).
let cached: { data: StoreSettings; at: number } | null = null;
let inFlight: Promise<StoreSettings> | null = null;

/** Invalida la caché. Se llama al guardar Ajustes en el panel. */
export function invalidateSettingsCache() {
  cached = null;
  inFlight = null;
}

/**
 * Devuelve la configuración de la tienda. Reutiliza el resultado durante 5 min
 * y deduplica llamadas simultáneas para no repetir la consulta.
 */
export async function getStoreSettings(force = false): Promise<StoreSettings> {
  const now = Date.now();

  if (!force && cached && now - cached.at < TTL_MS) {
    return cached.data;
  }
  if (!force && inFlight) {
    return inFlight;
  }

  inFlight = (async () => {
    const { data, error } = await supabase.from('settings').select('*');
    if (error || !data) {
      // Si falla, devolvemos lo último bueno que tengamos (o vacío).
      return cached?.data ?? {};
    }
    const map = data.reduce<StoreSettings>(
      (acc, curr: { key: string; value: string }) => ({ ...acc, [curr.key]: curr.value }),
      {}
    );
    cached = { data: map, at: Date.now() };
    return map;
  })();

  try {
    return await inFlight;
  } finally {
    inFlight = null;
  }
}
