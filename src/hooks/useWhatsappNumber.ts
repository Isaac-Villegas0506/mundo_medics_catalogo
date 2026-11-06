'use client';

import * as React from 'react';

/**
 * Número de WhatsApp de la tienda, leído únicamente de la tabla `settings`
 * (el dueño lo edita en el panel). No hay número falso de respaldo: si no hay
 * número configurado se devuelve cadena vacía y la UI debe deshabilitar el CTA
 * en lugar de abrir un chat a un número equivocado (hallazgo S5).
 */
export function useWhatsappNumber(): string {
  const [number, setNumber] = React.useState('');

  React.useEffect(() => {
    let active = true;

    const fetchSettings = async () => {
      try {
        const { supabase } = await import('@/utils/supabase/client');
        const { data } = await supabase
          .from('settings')
          .select('value')
          .eq('key', 'whatsapp_number')
          .single();
        if (active && data?.value) setNumber(data.value);
      } catch {
        // Sin número configurado: se mantiene '' y el CTA queda deshabilitado.
      }
    };

    fetchSettings();

    const handleUpdate = () => fetchSettings();
    window.addEventListener('settingsUpdated', handleUpdate);
    return () => {
      active = false;
      window.removeEventListener('settingsUpdated', handleUpdate);
    };
  }, []);

  return number;
}
