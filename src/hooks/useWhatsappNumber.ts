'use client';

import * as React from 'react';
import { getStoreSettings, invalidateSettingsCache } from '@/utils/settingsCache';

/**
 * Número de WhatsApp de la tienda, leído de la configuración pública.
 * No hay número falso de respaldo: si no hay número configurado se devuelve
 * cadena vacía y la UI debe deshabilitar el CTA en lugar de abrir un chat a un
 * número equivocado (hallazgo S5).
 *
 * Usa la caché compartida de ajustes (5 min) para no repetir la consulta en
 * cada tarjeta/modal que monta este hook (Fase 4, 8.6).
 */
export function useWhatsappNumber(): string {
  const [number, setNumber] = React.useState('');

  React.useEffect(() => {
    let active = true;

    const load = async (force = false) => {
      const settings = await getStoreSettings(force);
      if (active) setNumber(settings.whatsapp_number || '');
    };

    load();

    const handleUpdate = () => {
      // El panel acaba de guardar: invalida y vuelve a leer.
      invalidateSettingsCache();
      load(true);
    };
    window.addEventListener('settingsUpdated', handleUpdate);
    return () => {
      active = false;
      window.removeEventListener('settingsUpdated', handleUpdate);
    };
  }, []);

  return number;
}
