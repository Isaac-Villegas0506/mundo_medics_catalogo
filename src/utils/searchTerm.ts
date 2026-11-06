/**
 * Sanea el texto de búsqueda antes de mandarlo a PostgREST.
 *
 * El filtro `.or('name.ilike.%<q>%,category.ilike.%<q>%')` se construye como una
 * cadena, así que estos caracteres rompen la consulta o cambian su significado:
 *
 *   ,  → separa condiciones del `.or()`
 *   ( ) → agrupan condiciones
 *   %  → comodín de LIKE (un "%" suelto devuelve todo)
 *   *  → comodín alternativo de PostgREST
 *   .  → separa operador y valor (`ilike.`, `eq.`…)
 *   :  → separa valor y modificador
 *
 * Fase 7 (11.3): sin esto, buscar "50%" o "a,b" devolvía error 400 o resultados
 * incorrectos en lugar de "sin resultados".
 */
export function sanitizeSearchTerm(raw: string): string {
  return raw
    .trim()
    // Colapsa espacios múltiples: "  a   b  " → "a b"
    .replace(/\s+/g, ' ')
    // Quita los caracteres con significado en la sintaxis de PostgREST/LIKE.
    .replace(/[,()%*.:\\'"]/g, '')
    .trim();
}
