const ALLOWED_MAP_HOSTS = [
  'www.google.com',
  'google.com',
  'maps.google.com',
  'www.google.com.pe',
];

/**
 * Devuelve una URL de mapa embebido segura, o cadena vacía si no es válida.
 *
 * Acepta:
 *  - Un enlace `src="https://www.google.com/maps/embed?..."`
 *  - El HTML completo de un `<iframe>` (extrae el src).
 *
 * Rechaza cualquier protocolo que no sea https y cualquier dominio que no sea
 * Google Maps (evita que se inyecte `javascript:` u otra URL en el iframe,
 * hallazgo S6).
 */
export function sanitizeMapEmbedUrl(raw: string): string {
  if (!raw) return '';

  let url = raw.trim();

  if (url.includes('<iframe')) {
    const match = url.match(/src=["']([^"']+)["']/);
    if (!match) return '';
    url = match[1];
  }

  url = url
    .replace(/&amp;/g, '&')
    .replace(/&#39;/g, "'")
    .replace(/&quot;/g, '"')
    .trim();

  try {
    const parsed = new URL(url);
    if (parsed.protocol !== 'https:') return '';
    const host = parsed.hostname.toLowerCase();
    if (!ALLOWED_MAP_HOSTS.some((h) => host === h || host.endsWith('.' + h))) {
      return '';
    }
    if (!parsed.pathname.startsWith('/maps/embed')) return '';
    return parsed.toString();
  } catch {
    return '';
  }
}
