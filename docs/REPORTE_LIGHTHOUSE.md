# Reporte — Optimización a partir del informe Lighthouse

Fecha: 6 de noviembre de 2026. Complementa `REPORTE_FASE6.md`.

## Advertencia previa sobre la medición

El informe se hizo contra **`http://localhost:3000` en modo desarrollo**
(`npm run dev`). En ese modo Next.js:

- No minifica el JavaScript (`Minify JavaScript: est savings of 346 KiB`).
- Incluye React DevTools (`next-devtools`, 212.9 KiB — **el chunk más grande**).
- Activa HMR, source maps y comprobaciones extra.

Por eso las cifras de ese informe **no representan producción**. Los valores
de producción reales, medidos después de los cambios de este documento, son:

| | Modo dev (informe) | Producción (medido) |
|---|---|---|
| JS transferido | ~905 KiB + overhead | **827 KiB** |
| Chunks | más de 12 | 11 |
| CSS | 13.8 KiB sin minificar | **66.8 KiB minificado** (todo el sitio) |

También aparecían 281 ms y 96 KiB de una **extensión de Chrome** (Urban VPN
Proxy); eso no es parte de la aplicación.

## Hallazgos reales y qué se hizo

### 1. LCP de 10.9 s — causa raíz encontrada y corregida

El informe apuntaba `img.object-contain.img-reveal` y un
«element render delay» de **1.610 ms**. La causa era doble:

1. **La grilla arrancaba con `opacity: 0`** (`motion.div initial`), y el
   navegador no registra el LCP hasta que el elemento es visible.
2. **La propia imagen tenía `img-reveal`**, otra animación desde `opacity: 0`
   de 400 ms.

Correcciones:

- `CatalogClient.tsx`: la grilla ya no tiene `initial={{ opacity: 0 }}`.
- `ProductCard.tsx`: la primera tarjeta no lleva `img-reveal`.

Además, `priority` **está deprecado en Next.js 16**. El preload se emitía
**sin `fetchpriority`** (por eso Lighthouse decía «fetchpriority=high should be
applied»). Se sustituyó por la API actual:

```tsx
preload={index === 0}
fetchPriority={index === 0 ? 'high' : 'auto'}
loading={index === 0 ? 'eager' : 'lazy'}
```

Verificado en producción: el `<link rel="preload">` ahora **sí** lleva
`fetchPriority="high"`, y el `<img>` del LCP ya no tiene `img-reveal`.

### 2. Logo de 117.8 KiB mostrado a 45×44 px

Era una imagen de **503×496 px** servida para un hueco de 44×44.

**Redimensionado a 132×130 px** (3× para pantallas de alta densidad):

> **120.609 B → 12.177 B (−90 %)**

También se le quitaron `priority` (competía con el LCP real) y se le pusieron
`width`/`height` explícitos (Lighthouse: «Image elements do not have explicit
width and height»).

### 3. Supabase (auth + realtime) en el bundle inicial de la portada

El chunk más pesado era el cliente de Supabase. En producción se confirmó que
`GoTrueClient` viajaba en el bundle inicial de la **portada pública**, aunque en
la primera visita los datos llegan renderizados del servidor y no se necesita.

Se pasaron a **import dinámico**:

- `src/app/CatalogClient.tsx` — el cliente solo se descarga al filtrar, buscar,
  pedir más o abrir el modal.
- `src/utils/settingsCache.ts` — igual.

> **1082 KiB → 827 KiB (−255 KiB, −24 %)**
> y `supabase-auth` ya **no** está en el bundle inicial de la portada.

### 4. Fuente de iconos descubierta tarde

Lighthouse: «Font display, est savings 340 ms» sobre
`material-symbols-subset.woff2`.

Se añadió `<link rel="preload" as="font" type="font/woff2" crossOrigin>` en el
layout. **`font-display: block` se mantiene a propósito**: con `swap` se vería el
texto de la ligadura («menu», «search») mientras carga, que es mucho peor.

### 5. Formato SVG de un producto (968 KiB)

`Corazón doble corte` guarda su imagen como **SVG de 968 KiB** en Supabase
Storage. Next.js no procesa SVG en `next/image` (devuelve 400), así que se sirve
el original completo.

**No se tocó el archivo** porque es contenido del dueño. Recomendación: exportar
ese producto a **WebP**, con lo que bajaría de 968 KiB a decenas de KiB.

## Cambios de archivos

| Archivo | Cambio |
|---|---|
| `src/app/CatalogClient.tsx` | sin `initial opacity:0` en la grilla; Supabase por import dinámico |
| `src/components/ui/ProductCard.tsx` | LCP sin `img-reveal`; `preload`+`fetchPriority` en vez de `priority` |
| `src/app/product/ProductDetailClient.tsx` | `preload`+`fetchPriority` en la imagen principal |
| `src/components/navigation/TopAppBar.tsx` | logo 44×44, sin `priority` |
| `src/app/layout.tsx` | `<link rel="preload">` de la fuente de iconos |
| `src/utils/settingsCache.ts` | Supabase por import dinámico |
| `public/logomundomedics.png` | 503×496 → 132×130 (120 KB → 12 KB) |

## Verificación en producción (`npm run start`)

```
npx tsc --noEmit   → 0 errores
npm run build      → éxito
```

| Comprobación | Resultado |
|---|---|
| `/`, `/categories`, `/favorites`, `/login` | ✅ 200 |
| `/admin` | ✅ 307 → login |
| Productos y categorías en el HTML del servidor | ✅ |
| 12 iconos renderizados | ✅ |
| Preload del LCP con `fetchPriority="high"` | ✅ |
| `<img>` del LCP sin `img-reveal` | ✅ |
| `supabase-auth` en bundle inicial de portada | ✅ ausente |
| Fuente de iconos | ✅ 35.2 KiB, 200 |
| Logo | ✅ 12.177 B |

## Pendientes / recomendaciones

1. **Repetir Lighthouse contra producción**, no contra `npm run dev`. Idealmente
   contra el despliegue de Vercel, que además añade compresión Brotli y CDN.
2. **Convertir `avlxwklg6re_...svg` (968 KiB) a WebP.** Es la mayor imagen del
   sitio con diferencia.
3. **`medidas1.svg` pesa 1.3 MB** (guía de tallas). Sigue pendiente de decisión.
4. **Cache TTL de Supabase Storage = 1 h.** Con imágenes fijas convendría mucho
   más (1 año) usando `?v=` para invalidar. Se configura en el dashboard.
5. El `Legacy JavaScript` (8 KiB de polyfills) y el `Reduce unused JavaScript`
   restante son en su mayoría código de framework; no procede tocarlos a mano.
