/**
 * Fase 22 — Lista de consulta (varios productos en un solo mensaje de WhatsApp).
 *
 * El cliente va guardando productos y al final envía UNA consulta con todos,
 * en vez de abrir WhatsApp producto por producto.
 *
 * Se guarda en localStorage (como los favoritos) porque el catálogo es público y
 * no requiere cuenta. El evento `inquiryUpdated` mantiene sincronizadas todas
 * las vistas de la misma pestaña.
 */

export const INQUIRY_KEY = 'inquiry_list';
export const INQUIRY_EVENT = 'inquiryUpdated';

/** Un producto dentro de la lista de consulta. */
export interface InquiryItem {
  id: string;
  name: string;
  color_name?: string;
  size?: string;
  image_url?: string | null;
}

/** Lee la lista tolerando datos corruptos o ausentes. */
export function getInquiryList(): InquiryItem[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(INQUIRY_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    // Se descartan entradas sin id o sin nombre: no se pueden consultar.
    return parsed.filter(
      (x): x is InquiryItem =>
        x && typeof x.id === 'string' && typeof x.name === 'string'
    );
  } catch {
    return [];
  }
}

/** Guarda la lista y avisa a las demás vistas. */
export function saveInquiryList(items: InquiryItem[]) {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(INQUIRY_KEY, JSON.stringify(items));
    window.dispatchEvent(new Event(INQUIRY_EVENT));
  } catch {
    // localStorage lleno o bloqueado: la lista simplemente no persiste.
  }
}

/** Añade (o actualiza) un producto. Devuelve `true` si ya estaba. */
export function addToInquiry(item: InquiryItem): boolean {
  const list = getInquiryList();
  const exists = list.some((x) => x.id === item.id);

  // Si ya estaba, se actualiza color/talla por si los cambió.
  const next = exists
    ? list.map((x) => (x.id === item.id ? { ...x, ...item } : x))
    : [...list, item];

  saveInquiryList(next);
  return exists;
}

export function removeFromInquiry(id: string) {
  saveInquiryList(getInquiryList().filter((x) => x.id !== id));
}

export function clearInquiry() {
  saveInquiryList([]);
}

/**
 * Construye el mensaje de WhatsApp con todos los productos de la lista.
 *
 * Se numera cada producto y se incluyen color y talla cuando existen, para que
 * el dueño pueda responder sin preguntar de nuevo.
 */
export function buildInquiryMessage(items: InquiryItem[]): string {
  if (items.length === 0) return 'Hola, tengo una consulta desde la tienda.';

  const lineas = items.map((item, i) => {
    const detalles: string[] = [];
    if (item.color_name) detalles.push(`Color: ${item.color_name}`);
    if (item.size) detalles.push(`Talla: ${item.size}`);
    const sufijo = detalles.length > 0 ? ` (${detalles.join(' · ')})` : '';
    return `${i + 1}. ${item.name}${sufijo}`;
  });

  return [
    '¡Hola! Quisiera consultar por estos productos:',
    '',
    ...lineas,
    '',
    `Son ${items.length} producto${items.length === 1 ? '' : 's'}. ¿Me confirmas disponibilidad y precio?`,
  ].join('\n');
}
