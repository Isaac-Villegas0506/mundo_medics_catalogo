# CHANGELOG DE OPTIMIZACIÓN — Mundo Medics Catálogo

Archivo vivo. Se actualiza al finalizar cada fase. Última actualización: 6 de noviembre de 2026.

> Reporte consolidado de todo el trabajo: [`RESUMEN_GENERAL.md`](RESUMEN_GENERAL.md)

## Estado actual

| Fase | Nombre | Estado | Rama |
|---|---|---|---|
| 0 | Preparación, inventario y línea base | ✅ Completada | `fase-0-preparacion` |
| 1 | Seguridad | ✅ Completada — migraciones aplicadas y verificadas | `fase-1-seguridad` |
| 2 | Cloudinary | ✅ Completada | `fase-2-cloudinary` |
| 3 | Velocidad | ✅ Completada | `fase-3-velocidad` |
| 4 | Supabase: consultas, paginación y datos | ✅ Completada | `fase-4-supabase` |
| 5 | Next.js y arquitectura de renderizado | ✅ Completada | `fase-5-renderizado` |
| 6 | Diseño visual y fluidez | ✅ Completada | `fase-6-diseno` |
| — | Optimización Lighthouse (LCP, logo, bundle, WebP) | ✅ Completada | `fase-6-diseno` |
| 7 | Funcionamiento completo de todas las secciones | ⏳ Pendiente | |
| 8 | Seguridad, SEO y calidad | ⏳ Pendiente | |
| 9 | Pruebas de rendimiento y publicación | ⏳ Pendiente | |
| 10 | Mejoras futuras y decisiones opcionales | ⏳ Pendiente | |

## Resumen de cambios por fase

### Fase 0 — Preparación
- `docs/DECISIONES.md` con DEC-1 a DEC-12.
- Esquema consolidado en `supabase/migrations/001_esquema_consolidado.sql`.
- `.env.example` con sólo los nombres de las variables.
- Eliminados `Untitled-1/2.txt` y 8 SQL sueltos de la raíz.

### Fase 1 — Seguridad (S1–S7)
- `src/proxy.ts` (nuevo): Next 16 renombró `middleware` a `proxy`; protege `/admin/*` y redirige `/login` cuando ya hay sesión.
- `src/app/admin/layout.tsx`: guardia de sesión re-verificada en el servidor.
- `src/components/admin/AdminShell.tsx` (nuevo): shell del panel con logout.
- `src/utils/supabase/client.ts` + `server.ts`: clientes con cookies (`@supabase/ssr`).
- `supabase/migrations/002_rls_seguridad.sql`: escritura sólo `authenticated`; bucket 5 MB limitado a jpeg/png/webp/avif.
- `src/hooks/useWhatsappNumber.ts` (nuevo): sin número falso de respaldo.
- `src/utils/imageUpload.ts`, `src/utils/mapUrl.ts` (nuevos): validación de subidas y URL del mapa.
- `next.config.ts`: cabeceras de seguridad.

### Fase 2 — Cloudinary
- `src/utils/cloudinary.ts` + `src/app/api/cloudinary/sign/route.ts`: subida firmada (SHA1 sobre folder+timestamp). Devuelve 401 sin sesión.
- `next.config.ts`: `res.cloudinary.com` en `images.remotePatterns`.
- `.env.example` con las variables de Cloudinary.

### Fase 3 — Velocidad (R1/R2/R4/R13)
- Las tres consultas de la portada en paralelo (`Promise.all`).
- `src/components/navigation/TopAppBar.tsx`: debounce de 250 ms.
- `src/app/layout.tsx`: `viewport` independiente de `metadata`.
- `src/app/globals.css`: utilidades `.pb-safe` / `.pt-safe`.
- `src/components/ui/ProductBadges.tsx`: `className` opcional; el botón de regresar ya no tapa la etiqueta de sexo.

### Fase 4 — Supabase: consultas, paginación y datos
- Portada: sólo campos de tarjeta y paginación de 16 con «Ver más».
- Filtro de categoría y búsqueda resueltos en Supabase (antes en el navegador).
- Estados de carga, sin resultados y error con reintentar.
- `/categories` ya no descarga todo el catálogo.
- `src/utils/settingsCache.ts` (nuevo): caché de 5 min + deduplicación, invalidada al guardar Ajustes.
- `supabase/migrations/003_indices_rendimiento.sql`: índices en `category` y `created_at`.

### Fase 5 — Next.js y arquitectura de renderizado
- `src/app/page.tsx`: ahora es **Server Component**; consulta en paralelo y entrega HTML con productos. `revalidate = 60`.
- `src/app/CatalogClient.tsx` (nuevo): toda la interacción; no repite la primera consulta.
- `src/utils/supabase/publicServer.ts` (nuevo): cliente sin cookies para datos públicos.
- `src/app/loading.tsx` (nuevo): esqueleto de carga real.
- **Iconos:** Material Symbols pasó de 1.14 MB a un subconjunto local de 36 KB; Flaticon (1.18 MB de CSS + 351 KB de fuente + ~1.08 MB de familias no usadas) se reemplazó por 7 SVG propios.
- `src/app/layout.tsx`: eliminados los dos `<link>` externos.
- Resultado: ≈2.5 MB → ≈36 KB de recursos externos; 0 dominios de terceros en la ruta crítica.

> ⚠️ `@font-face` debe ir **fuera** de `@layer` (Tailwind v4 lo descarta dentro) y
> `.material-symbols-outlined` **dentro** (fuera pisaría las utilidades de tamaño).

### Fase 6 — Diseño visual y fluidez
- `src/components/MotionProvider.tsx` (nuevo): `<MotionConfig reducedMotion="user">`; cubre los ~75 usos de `motion.*`.
- `src/app/globals.css`: reglas `@media (prefers-reduced-motion: reduce)` y utilidad `.pb-nav` (64px + safe-area).
- `ProductCard.tsx`: sin `motion.article` ni overlay animado; hover/active en CSS puro. Favorito a 40 px con `aria-label`/`aria-pressed`.
- `ProductBadges.tsx`: eliminado `backdrop-blur-md` (hasta 48 desenfoques simultáneos).
- `BottomNav.tsx` y `TopAppBar.tsx`: blur quitado en móvil.
- **Bug corregido:** la barra inferior tapaba el final de la página en iOS.
- **Bug corregido:** el modal de admin desbordaba en pantallas de 320 px.
- Áreas táctiles de 32 px → 44 px.
- Imágenes públicas migradas a `next/image`.

### Optimización Lighthouse
- **LCP 10.9 s:** la grilla arrancaba con `opacity: 0` y la imagen tenía `img-reveal`; el navegador no registra el LCP hasta que el elemento es visible. Ambas animaciones eliminadas del primer render.
- **`priority` está deprecado en Next 16:** el preload salía sin `fetchpriority`. Sustituido por `preload` + `fetchPriority` + `loading="eager"`.
- **Logo:** 503×496 px y 117.8 KiB para 44×44 → redimensionado a 132×130 (120.609 → 12.177 B, −90 %).
- **Supabase fuera del bundle inicial:** import dinámico en `CatalogClient` y `settingsCache` (1082 → 827 KiB, −24 %).
- **Fuente de iconos:** `<link rel="preload">` en el layout.
- **`medidas1.svg` → WebP:** 1.31 MB → 60 KB (−95 %), con versión `@2x` de 105 KB.

## Limpieza aplicada

| Archivo | Motivo |
|---|---|
| `supabase_schema.sql`, `_v2`, `_v3`, `_v4`, `_settings`, `_storage` | Consolidados en `migrations/001`. El `_v3` además reabría RLS al público. |
| `migration_categories.sql`, `schema_update_sets.sql` | Consolidados en `migrations/001`. |
| `src/app/admin/products/[id]/Untitled-{1,2}.txt` | Copias idénticas de un skill de Vercel. |
| `public/{file,globe,next,vercel,window}.svg` | Plantilla de Next.js, sin uso. |
| `public/medidas.svg` | 830 KB duplicados. |
| `public/medidas1.svg` y `medidas1.svg` (raíz) | Reemplazados por WebP. |
| `logomundomedics.png` (raíz) | Duplicado viejo de 120 KB. |

`public/` pasó de ~3.7 MB a **212 KB**.

También se corrigió en `migrations/001` el esquema de `settings`: la PK es
`id uuid` y `key` es `UNIQUE` (antes decía que `key` era la PK). El archivo quedó
marcado como **documentación no ejecutable**.

## Decisiones registradas

Ver `docs/DECISIONES.md` (DEC-1 a DEC-12).
