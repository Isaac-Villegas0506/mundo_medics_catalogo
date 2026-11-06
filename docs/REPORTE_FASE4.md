# Reporte — Fase 4 (Supabase: consultas, paginación y datos)

Basado en la sección 8 del *Plan Maestro de Optimización*. Fecha: 6 de noviembre de 2026.

## 1. Qué se encontró

Auditoría de consultas (8.1) en las rutas públicas:

| Archivo | Tabla | Problema |
|---|---|---|
| `src/app/page.tsx` | products | `select('*')` sin límite: descargaba **todo el catálogo** con descripciones, galerías, material y cuidados solo para pintar tarjetas. |
| `src/app/page.tsx` | settings | Se pedía en cada visita (3 consultas seguidas, ya paralelizadas en Fase 3). |
| `src/app/categories/page.tsx` | products | `select('id, image_url')` de **todos** los productos solo para la foto de portada de cada categoría. |
| `src/app/favorites/page.tsx` | products | `select('*')` para tarjetas. |
| `src/components/modals/ProductModal.tsx` | products | Relacionados con `select('*')`. |
| `src/hooks/useWhatsappNumber.ts` | settings | Consulta propia; se repetía en cada tarjeta/modal montada. |
| `src/app/product/page.tsx` | products | `select('*')` — **correcto**, esta vista usa la ficha completa. |

## 2. Qué se modificó

1. **8.2 Columnas específicas.** Nuevo conjunto `CARD_FIELDS` con solo lo que pinta una tarjeta:
   `id, name, category, image_url, color_name, color_hex_codes, sizes, tags, is_featured, is_set`.
2. **8.3 Paginación.** La portada carga **16 productos** y ofrece «Ver más productos».
   - Sin duplicados (se usa `range(from, from+15)` sobre el total ya cargado).
   - Orden estable (`created_at desc`), contador exacto con `count: 'exact'`.
   - Estados: carga (skeletons), sin resultados, **error con botón Reintentar**.
3. **8.4 Búsqueda y filtros en servidor.** Categoría (`eq category`) y búsqueda
   (`or name.ilike / category.ilike`) se resuelven en Supabase, no filtrando en memoria.
   Debounce de 250 ms (Fase 3) y cancelación de respuestas antiguas (`cancelled`).
4. **8.2 Detalle bajo demanda.** La tarjeta ya no trae la ficha completa; al abrir el
   modal se pide `select('*')` de ese único producto (en paralelo, sin bloquear).
5. **8.6 Caché.** Nuevo `src/utils/settingsCache.ts`: caché de 5 min + deduplicación de
   llamadas simultáneas para la configuración pública. Se **invalida** al guardar Ajustes.
6. **8.5 Índices.** Migración `supabase/migrations/003_indices_rendimiento.sql` con
   índices en `category` y `created_at` (los dos filtros/órdenes reales).

## 3. Por qué

Reducir bytes descargados y consultas repetidas sin perder funcionalidad. Antes la
portada bajaba el catálogo completo; ahora baja 16 registros con 10 campos.

## 4. Pruebas ejecutadas

```
npx tsc --noEmit   → sin errores
npm run build      → éxito
```

Consulta real contra el proyecto Supabase (llave pública, sin cambios de datos):

```
PAGE1  error=none  count=5  rows=5
CAT    error=none  count=0  rows=0        (categoría 'Batas' no existe hoy)
SEARCH error=none  count=1  rows=1        ("conjunto" → Conjunto San Martin)
DETAIL error=none  name=Conjunto San Martin
```

## 5. Antes y después

| | Antes | Después |
|---|---|---|
| Campos por producto en portada | todos (~20, con textos largos) | 10 |
| Productos por petición | todos | 16 |
| Filtro de categoría | en el navegador | en Supabase |
| Búsqueda | en el navegador | en Supabase (nombre + categoría) |
| Consulta de ajustes | en cada visita | caché 5 min + deduplicada |
| `/categories` | todos los productos | solo los de portada |

## 6. Riesgos o pendientes

- **Migración 003 pendiente de aplicar** en Supabase (el dueño debe ejecutarla).
- La búsqueda con `ILIKE '%texto%'` no usa índice btree; con el volumen actual es
  irrelevante. Si el catálogo crece, evaluar `pg_trgm` (documentado en 8.5).
- **Redis/Upstash (8.7): NO se instaló.** No hay mediciones que lo justifiquen; primero
  se aplicaron consultas selectivas, paginación, índices y caché nativa.
- Caché de servidor (`unstable_cache`/`revalidate`) no aplica aún: la portada es un
  componente cliente. Encaja en la **Fase 5** (arquitectura de renderizado).

## 7. Archivos

`src/app/page.tsx`, `src/app/categories/page.tsx`, `src/app/favorites/page.tsx`,
`src/components/modals/ProductModal.tsx`, `src/hooks/useWhatsappNumber.ts`,
`src/utils/settingsCache.ts` (nuevo), `src/app/admin/settings/page.tsx`,
`supabase/migrations/003_indices_rendimiento.sql` (nuevo).

## 8. Decisión requerida

Aplicar la migración `003_indices_rendimiento.sql` en Supabase (es reversible:
`DROP INDEX idx_products_category; DROP INDEX idx_products_created_at;`).
