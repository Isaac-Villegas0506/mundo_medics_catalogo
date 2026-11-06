# Reporte general — Optimización y evolución de Mundo Medics Catálogo

Fecha: 6 de noviembre de 2026
Rama de trabajo: `fase-6-diseno` (las fases anteriores están en sus propias ramas)
Plan ejecutado: `Plan_Maestro_Mundo_Medics_Optimizacion.md`

---

## 1. Resumen ejecutivo

Se ejecutaron las **fases 0 a 6** del plan maestro, más una auditoría completa y una
ronda de optimización guiada por Lighthouse. Ninguna fase alteró la identidad visual
del catálogo ni eliminó funcionalidad existente.

Los cuatro logros de mayor impacto:

| Logro | Antes | Después |
|---|---|---|
| Recursos externos en la ruta crítica | ≈2.5 MB (Flaticon + Google Fonts) | **0 B** |
| Bundle JS inicial de la portada | 1082 KiB | **827 KiB** (−24 %) |
| Imagen de la guía de tallas | 1.31 MB (SVG) | **60 KB** (WebP, −95 %) |
| Escritura en la base de datos | abierta a cualquiera | **solo autenticados** |

Además: el catálogo pasó de descargar *todos* los productos a pagina de 16 en 16,
la portada se renderiza en el servidor, y se corrigieron varios bugs reales
(imágenes tapadas por la barra inferior, iconos rotos, LCP de 10.9 s).

---

## 2. Estado por fase

| Fase | Nombre | Estado |
|---|---|---|
| 0 | Preparación, inventario y línea base | ✅ Completada |
| 1 | Seguridad (RLS, sesión, cabeceras) | ✅ Completada y verificada en la base |
| 2 | Cloudinary (subida firmada) | ✅ Completada |
| 3 | Velocidad | ✅ Completada |
| 4 | Supabase: consultas, paginación y datos | ✅ Completada y aplicada |
| 5 | Next.js y arquitectura de renderizado | ✅ Completada |
| 6 | Diseño visual y fluidez | ✅ Completada |
| 7 | Funcionamiento de todas las secciones | ⏳ Pendiente |
| 8 | Seguridad, SEO y calidad | ⏳ Pendiente |
| 9 | Pruebas de rendimiento y publicación | ⏳ Pendiente |
| 10 | Mejoras futuras | ⏳ Pendiente |

---

## 3. Detalle por fase

### Fase 0 — Preparación

- `docs/DECISIONES.md` con las decisiones del dueño (DEC-1 a DEC-12).
- Esquema SQL consolidado en `supabase/migrations/001_esquema_consolidado.sql`.
- `.env.example` con **sólo los nombres** de las variables.
- Eliminados `Untitled-1.txt` y `Untitled-2.txt` del panel y 8 archivos SQL sueltos.

### Fase 1 — Seguridad

| Cambio | Archivo |
|---|---|
| Protección de `/admin` con redirección a login | `src/proxy.ts` (nuevo; Next 16 renombró `middleware` a `proxy`) |
| Guardia de sesión re-verificada en el servidor | `src/app/admin/layout.tsx` |
| Shell del panel con logout | `src/components/admin/AdminShell.tsx` (nuevo) |
| Clientes con cookies (`@supabase/ssr`) | `src/utils/supabase/client.ts` + `server.ts` |
| RLS: escritura sólo `authenticated` | `supabase/migrations/002_rls_seguridad.sql` |
| Sin número de WhatsApp falso | `src/hooks/useWhatsappNumber.ts` |
| Validación de subidas y URL del mapa | `src/utils/imageUpload.ts`, `src/utils/mapUrl.ts` |
| Cabeceras de seguridad | `next.config.ts` |

**Verificado contra la base real** (proyecto `whsonrlkbmnudwmxpfii`):

| Operación con la llave anónima | Resultado |
|---|---|
| `SELECT` products / categories / settings | ✅ Permitido (lectura pública) |
| `INSERT` en products | ✅ Bloqueado (42501) |
| `UPDATE` sobre fila real | ✅ Bloqueado (0 filas) |
| `DELETE` sobre fila real | ✅ Bloqueado (0 filas) |

> **Nota técnica:** `CREATE POLICY IF NOT EXISTS` **no existe en PostgreSQL**
> (error 42601). Las políticas se crean precedidas de `DROP POLICY IF EXISTS`.

### Fase 2 — Cloudinary

- Subida directa firmada: el servidor genera una firma SHA1 y el navegador sube
  a Cloudinary (la imagen no pasa por el servidor propio).
- `src/app/api/cloudinary/sign/route.ts` devuelve **401 sin sesión**.
- El secreto vive sólo en `.env.local` (gitignorado).

### Fase 3 — Velocidad

- Las tres consultas de la portada van en paralelo (`Promise.all`).
- Debounce de 250 ms en el buscador.
- `viewport` independiente de `metadata`; utilidades `.pb-safe` / `.pt-safe`.
- Corregido el botón de regresar que tapaba la etiqueta de sexo.

### Fase 4 — Supabase: consultas, paginación y datos

| Antes | Después |
|---|---|
| `select('*')` de **todos** los productos | 10 campos de tarjeta, 16 por página |
| Filtro y búsqueda en el navegador | resueltos en Supabase |
| `/categories` descargaba todo el catálogo | sólo las fotos de portada |
| Ajustes consultados en cada visita | caché 5 min + deduplicación |
| Sin índices propios | `products(category)` y `products(created_at)` |

- Estados implementados: carga (skeletons), sin resultados, **error con reintentar**.
- Migración `003_indices_rendimiento.sql` **aplicada y verificada**.
- **Redis/Upstash: NO se instaló.** No hay mediciones que lo justifiquen.

### Fase 5 — Next.js y arquitectura de renderizado

**El hallazgo mayor de todo el proyecto.** La app cargaba recursos externos
bloqueantes:

| Recurso | Tamaño | Para qué |
|---|---|---|
| Flaticon `all.css` | 1.182.197 B | 7 iconos |
| Flaticon fuente `bold-rounded` | 351.668 B | los mismos 7 |
| Flaticon otras 3 familias | ~1.08 MB | **ninguna** |
| Google Material Symbols | 688 B + 1.140.260 B | 37 iconos |

Solución: subconjunto local de Material Symbols (36 KB) y 7 SVG propios para las
categorías. **Resultado: 0 dominios de terceros en la ruta crítica.**

También: la portada pasó de 100 % cliente (HTML vacío) a **Server Component** con
los productos ya renderizados, y `revalidate = 60`.

> ⚠️ **Bug corregido:** el `@font-face` dentro de `@layer base` es descartado por
> Tailwind v4, y los iconos se veían como texto. Debe ir **fuera** del layer,
> mientras que la clase `.material-symbols-outlined` debe ir **dentro** (si está
> fuera, pisa utilidades como `text-[16px]`).

### Fase 6 — Diseño visual y fluidez

- `prefers-reduced-motion` **no existía**: ahora se respeta vía `MotionProvider`
  (cubre los ~75 usos de `motion.*`) y reglas CSS.
- Las tarjetas ya no animan una por una (eran 16 springs simultáneos).
- Eliminados hasta 48 `backdrop-blur` simultáneos en los badges.
- **Bug corregido:** la barra inferior tapaba el final de la página en iOS
  (`pb-[80px]` fijo no contaba `env(safe-area-inset-bottom)`).
- **Bug corregido:** el modal de admin desbordaba en pantallas de 320 px.
- Áreas táctiles de 32 px → 44 px.
- Imágenes públicas migradas a `next/image`.

### Optimización posterior (informe Lighthouse)

> El informe se hizo contra `localhost` **en modo desarrollo**, donde Next no
> minifica e incluye React DevTools. Las cifras de producción reales son distintas.

| Problema | Corrección | Resultado |
|---|---|---|
| LCP 10.9 s | la grilla arrancaba con `opacity: 0` y la imagen tenía `img-reveal` | LCP visible de inmediato |
| Preload sin `fetchpriority` | `priority` está **deprecado en Next 16** → `preload` + `fetchPriority` | preload con `fetchPriority="high"` |
| Logo 117.8 KiB para 44×44 | 503×496 → 132×130 | **120.609 → 12.177 B (−90 %)** |
| Supabase en bundle inicial | import dinámico | **1082 → 827 KiB (−24 %)** |
| Fuente de iconos tardía | `<link rel="preload">` | −340 ms estimados |
| `medidas1.svg` 1.31 MB | convertido a WebP | **1.31 MB → 60 KB (−95 %)** |

---

## 4. Limpieza del repositorio

Se eliminó todo lo que no se usaba:

| Archivo | Motivo | Peso |
|---|---|---|
| `supabase_schema*.sql` (6 archivos) | consolidados en `migrations/001` | — |
| `migration_categories.sql`, `schema_update_sets.sql` | consolidados | — |
| `supabase_schema_v3.sql` | ⚠️ **reabría RLS al público** | — |
| `Untitled-1.txt`, `Untitled-2.txt` | copias de un skill de Vercel | — |
| `public/{file,globe,next,vercel,window}.svg` | plantilla de Next.js | 3.3 KB |
| `public/medidas.svg` | duplicado sin uso | 830 KB |
| `public/medidas1.svg` | reemplazado por WebP | 1.31 MB |
| `medidas1.svg` (raíz) | duplicado sin uso | 1.31 MB |
| `logomundomedics.png` (raíz) | duplicado viejo de 120 KB | 120 KB |

**`public/` final: 212 KB** (antes ~3.7 MB).

También se corrigió `migrations/001`:
- El esquema de `settings` decía que `key` era la PK; realmente la PK es `id uuid`
  y `key` es `UNIQUE`.
- Se marcó el archivo como **documentación no ejecutable**, porque contiene las
  políticas RLS abiertas originales.

---

## 5. Verificación final

```
npx tsc --noEmit   → 0 errores
npm run build      → éxito
npx eslint .       → 47 errores / 40 warnings
                     (línea base inicial: 50 errores / 50 warnings)
```

| Comprobación | Resultado |
|---|---|
| `/`, `/categories`, `/favorites`, `/login` | ✅ 200 |
| `/admin`, `/admin/products` | ✅ 307 → login |
| Productos y categorías en el HTML del servidor | ✅ |
| Iconos renderizados (fuente local 35 KB) | ✅ |
| `supabase-auth` en bundle inicial de la portada | ✅ ausente |
| Preload del LCP con `fetchPriority="high"` | ✅ |
| Guía de tallas en WebP | ✅ 200, `image/webp` |
| `/medidas1.svg` | ✅ 404 (eliminado) |
| Datos en Supabase | ✅ 5 productos, 3 categorías, 10 ajustes, sin filas de prueba |

---

## 6. Pendientes y decisiones abiertas

### Requieren acción del dueño

1. **Desactivar el registro público** en Supabase Auth
   (Authentication → Providers → Email). Es lo único que falta de la Fase 1: si
   alguien se registra, queda como `authenticated` y puede escribir.
2. **Rotar el `CLOUDINARY_API_SECRET`**, que se compartió por chat.
3. **Revocar el access token `sbp_…`** de Supabase cuando ya no se necesite.
4. **Convertir a WebP** la imagen del producto `Corazón doble corte`
   (`avlxwklg6re_…svg`, 968 KB) desde el panel de admin. Es la imagen más pesada
   que queda en el sitio.
5. **Ajustar el cache TTL** de Supabase Storage (hoy 1 h; convendría 1 año para
   imágenes fijas).
6. **Asignar categoría** a 4 de los 5 productos: sólo «Corazón doble corte» tiene
   categoría, así que al filtrar casi no aparece nada.
7. **Repetir Lighthouse contra producción/Vercel**, no contra `npm run dev`.

### Pendientes técnicos

- **Dependencias externas que siguen con licencia de terceros:** ninguna. Los SVG
  de categoría son propios.
- **`revalidate = 60`**: un producto nuevo puede tardar hasta 60 s en aparecer en
  la portada. Se puede bajar o invalidar con Server Actions (Fase 7).
- **`/categories` y `/favorites`** siguen siendo componentes cliente; se abordan
  en la Fase 7.
- **No se verificó visualmente en navegador real** (sin Playwright/Puppeteer en el
  entorno). Las comprobaciones son de CSS compilado y HTML servido, no de píxeles.

---

## 7. Ramas y trabajo pendiente de fusión

| Rama | Contenido |
|---|---|
| `fase-0-preparacion` | Decisiones y esquema consolidado |
| `fase-1-seguridad` | RLS, sesión, cabeceras |
| `fase-2-cloudinary` | Subida firmada + fix de UI |
| `fase-3-velocidad` | Paralelización, debounce, viewport |
| `fase-4-supabase` | Paginación, columnas, caché, índices |
| `fase-5-renderizado` | Portada en servidor, iconos locales, auditoría y limpieza |
| `fase-6-diseno` | Accesibilidad, animaciones, adaptación, LCP, WebP |

`main` **nunca recibe push directo**: Vercel despliega producción desde ahí, y cada
fase se integra mediante Pull Request.

---

## 8. Documentos del proyecto

| Archivo | Contenido |
|---|---|
| `docs/DECISIONES.md` | DEC-1 a DEC-12 |
| `docs/CHANGELOG_OPTIMIZACION.md` | Estado y resumen por fase |
| `docs/SEGURIDAD.md` | RLS, verificación, pasos manuales |
| `docs/RESUMEN_GENERAL.md` | Este documento |
| `docs/REPORTE_FASE1..6.md` | Reporte detallado por fase |
| `docs/REPORTE_LIGHTHOUSE.md` | Análisis de rendimiento |
