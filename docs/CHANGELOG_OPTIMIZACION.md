# CHANGELOG DE OPTIMIZACIÓN — Mundo Medics Catálogo

Archivo vivo. Se actualiza al finalizar cada fase. Última actualización: 6 de noviembre de 2026.

## Estado actual

| Fase | Nombre | Estado | Rama |
|---|---|---|---|
| 0 | Preparación, inventario y línea base | En curso (ver pendientes abajo) | `fase-0-preparacion` |
| 1 | Seguridad | ✅ En `main` — migraciones aplicadas y verificadas | `fase-1-seguridad` |
| 2 | Cloudinary | ✅ En `main` | `fase-2-cloudinary` |
| 3 | Velocidad | ✅ En `main` | `fase-3-velocidad` |
| 4 | Supabase: consultas, paginación y datos | ✅ En `main` (PR abierto) | `fase-4-supabase` |
| 5 | Next.js y arquitectura de renderizado | ✅ Completada | `fase-5-renderizado` |
| 6 | Diseño visual y fluidez | — | |
| 7 | Funcionamiento completo de todas las secciones | — | |
| 8 | Seguridad, SEO y calidad | — | |
| 9 | Pruebas de rendimiento y publicación | — | |
| 10 | Mejoras futuras y decisiones optionales | — | |

## Resumen de cambios por fase

### Fase 1 — Seguridad (S1–S7)
- `src/proxy.ts` (nuevo): renombra el middleware de Next.js 16; redirige `/admin/*` → `/login?next=…` sin usuario y `/login` → `/admin` con usuario.
- `src/app/admin/layout.tsx`: guardia de servidor async (re-verifica la sessión).
- `src/components/admin/AdminShell.tsx` (nuevo): shell del panel con logout.
- `src/utils/supabase/client.ts`: `createBrowserClient` con `isSingleton: true`.
- `src/utils/supabase/server.ts` (nuevo): cliente del lado del servidor con `setAll` en try/catch.
- `supabase/migrations/002_rls_seguridad.sql`: escritura solo `authenticated` en products, categories, settings y storage; bucket 5 MB solo jpeg/png/webp/avif.
- `src/hooks/useWhatsappNumber.ts` (nuevo): sin número falso de respaldo.
- `src/utils/imageUpload.ts`, `src/utils/mapUrl.ts` (nuevos): validación de subidas y URL del mapa.
- `next.config.ts`: cabeceras de seguridad.
- **Migraciones aplicadas y verificadas** el 6/11/2026: RLS de escritura cerrada
  (INSERT/UPDATE/DELETE anónimos bloqueados) e índices de Fase 4 creados.
- **Pendiente del dueño:** desactivar el registro público en Supabase Auth.

### Fase 2 — Cloudinary
- `src/utils/cloudinary.ts` + `src/app/api/cloudinary/sign/route.ts`: subida firmada (SHA1 sobre folder+timestamp+secret).
- `next.config.ts`: `res.cloudinary.com` en `images.remotePatterns`.
- `.env.example` con las variables de Cloudinary.

### Fase 3 — Velocidad (R1/R2/R4/R13)
- `src/app/page.tsx`: `Promise.all` de las 3 consultas; `key` estable en la grid.
- `src/components/navigation/TopAppBar.tsx`: debounce 250 ms.
- `src/components/ui/ProductCard.tsx`: delay de animación acotado y `priority` en la primera tarjeta.
- `src/app/layout.tsx`: `viewport` independiente de `metadata`.
- `src/app/globals.css`: utilidades `.pb-safe` / `.pt-safe`.
- `src/components/ui/ProductBadges.tsx`: `className` opcional; el botón de regresar ya no tapa la etiqueta de sexo.

### Fase 4 — Supabase: consultas, paginación y datos
- `src/app/page.tsx`: solo campos de tarjeta (`CARD_FIELDS`); paginación de 16 con «Ver más»; filtros y búsqueda en servidor; estados de carga/error/vacío.
- `src/app/categories/page.tsx`: ya no descarga todo el catálogo (solo fotos de portada).
- `src/app/favorites/page.tsx` y `src/components/modals/ProductModal.tsx`: campos de tarjeta; ficha completa bajo demanda.
- `src/utils/settingsCache.ts` (nuevo): caché 5 min + deduplicación de ajustes públicos; invalidación al guardar.
- `src/hooks/useWhatsappNumber.ts`: usa la caché compartida.
- `supabase/migrations/003_indices_rendimiento.sql` (nuevo): índices en `products(category)` y `products(created_at)`.

### Fase 5 — Next.js y arquitectura de renderizado
- `src/app/page.tsx`: ahora es componente de **servidor**; consulta en paralelo y entrega HTML con productos. `revalidate = 60`.
- `src/app/CatalogClient.tsx` (nuevo): toda la interacción (búsqueda, chips, favoritos, modales, «Ver más»). No repite la primera consulta.
- `src/utils/supabase/publicServer.ts` (nuevo): cliente Supabase sin cookies para datos públicos.
- `src/app/loading.tsx` (nuevo): esqueleto de carga real.
- **Iconos:** Material Symbols pasó de 1.14 MB a un subconjunto local de 36 KB (`public/fonts/material-symbols-subset.woff2`); Flaticon (1.18 MB de CSS + 351 KB de fuente + ~1.08 MB de familias no usadas) se reemplazó por 7 SVG locales en `ClothingIcon.tsx`.
- `src/app/layout.tsx`: eliminados los dos `<link>` externos.
- Resultado medido: ≈2.5 MB → ≈36 KB de recursos externos; 0 dominios de terceros en la ruta crítica.

## Pendientes de Fase 0
- `src/app/admin/products/[id]/Untitled-1.txt`, `Untitled-2.txt` aún en el árbol.
- 8 archivos SQL sueltos en la raíz del proyecto aún rastreados.
- `docs/CHANGELOG_OPTIMIZACION.md` (este archivo).

## Decisiones registradas
Ver `docs/DECISIONES.md` (DEC-1 a DEC-12).