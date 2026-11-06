# Reporte — Fase 6 (Diseño visual y fluidez)

Basado en la sección 10 del *Plan Maestro de Optimización*. Fecha: 6 de noviembre de 2026.

> **Nota de alcance.** El plan dice en 10.1: «No rediseñar toda la interfaz sin
> presentar primero una propuesta visual». Por eso esta fase **no cambia la
> identidad**: mismos colores, misma tipografía, misma disposición. Solo se
> corrigieron problemas de accesibilidad, rendimiento de animación y adaptación.
> No se reescribió ninguna pantalla.

## 1. Qué se encontró

### 10.4 — `prefers-reduced-motion` no existía

Ni una sola regla en todo el proyecto. Y hay **~75 usos de `motion.*`** en 12
archivos. Cualquier persona con la reducción de movimiento activada (mareo,
sensibilidad vestibular, epilepsia) recibía todas las animaciones de todos modos.

### 10.2 — Las tarjetas animaban una por una

Cada tarjeta tenía su propio `motion.article` con `initial/animate` y un
`delay: Math.min(index, 8) * 0.05`. Con 16 tarjetas por página son 16 springs
simultáneos compitiendo por el hilo principal al cargar. Además cada tarjeta
montaba un `motion.div` extra solo para el oscurecido del hover.

### 10.5 — `backdrop-blur` en elementos repetidos

Los badges de producto usaban `backdrop-blur-md`. Con hasta 3 badges por tarjeta
y 16 tarjetas por página: **hasta 48 desenfoques de fondo simultáneos**, uno de
los efectos más caros en GPU móvil.

### 10.6 — Dos bugs reales de adaptación

1. **La barra inferior tapaba contenido.** El contenedor usaba `pb-[80px]` fijo,
   pero la nav mide `64px` **más** `env(safe-area-inset-bottom)`. En un iPhone con
   home indicator (~34 px) el hueco real necesario es ~114 px: **el final de la
   página quedaba oculto**.
2. **El modal de admin desbordaba en móviles de 320 px.** Tenía `w-[90%]` +
   `min-w-[320px]`: en una pantalla de 320 px el modal medía 320 px *más* el
   padding, provocando scroll horizontal.

### 10.3 — Imágenes sin optimizar

La galería del detalle usaba `<img>` con el archivo original completo (es el
**LCP** de esa vista). Las tarjetas de categoría y el logo, también `<img>`.

## 2. Qué se modificó

### 10.4 Animaciones

- Nuevo `src/components/MotionProvider.tsx` con `<MotionConfig reducedMotion="user">`
  montado en el layout raíz. Con un solo proveedor se cubren los ~75 usos de
  `motion.*`, en vez de añadir `useReducedMotion()` en cada componente (y
  olvidarlo al añadir UI nueva).
- Reglas CSS en `globals.css` para la parte no-motion: se neutralizan
  animaciones/transiciones, se conserva el estado final visible, y el
  `skeleton-shimmer` pasa a un fondo estático (sin parpadeo infinito).
- **Tarjetas**: se eliminó el `motion.article` y el `motion.div` del overlay.
  El hover y el `active:scale` ahora son CSS puro (`transition-opacity`,
  `active:scale-[0.98]`). Resultado: la grilla ya no arranca 16 springs a la vez.

### 10.5 Efectos

| Elemento | Antes | Ahora |
|---|---|---|
| Badges de producto | `backdrop-blur-md` | sin blur (fondo ya semitransparente) |
| Barra inferior | `bg-white/90 backdrop-blur-xl` | `bg-white/95`, sin blur |
| Barra superior | `backdrop-blur-xl` | blur **solo en escritorio** (`md:`) |
| Flechas de galería | `backdrop-blur-md` | sin blur |

### 10.6 Adaptación

- Nuevo `.pb-nav` = `calc(64px + env(safe-area-inset-bottom) + 16px)`.
  Aplicado a portada, categorías, favoritos, `loading.tsx` y al detalle.
- Áreas táctiles: los botones de 32 px subieron a 44 px (mínimo recomendado) —
  cerrar modales, flechas de galería, y el botón de favorito de la tarjeta.
  El de favorito además pasó a 40 px con `aria-label` y `aria-pressed`.
- Modal de admin: se quitó `min-w-[320px]`.

### 10.3 Imágenes

- Galería del detalle: `<img>` → `next/image` con `fill`, `sizes` y `priority`.
- Miniaturas de "productos incluidos": `next/image` con `sizes="80px"`.
- Tarjetas de categoría: `next/image` con `sizes`.
- Logo (120 KB): `next/image` con `priority` en la barra superior.
- `next.config.ts`: se añadió `images.unsplash.com` a `remotePatterns` (la foto
  por defecto del modal de ubicación la necesita; sin esto fallaba).

## 3. Por qué

El plan pide expresamente (10.4) respetar `prefers-reduced-motion`, reducir
animaciones repetidas por tarjeta y priorizar `transform`/`opacity`; y (10.5)
reducir `backdrop-blur` en elementos repetidos, «especialmente en móviles».
Los dos bugs de 10.6 son fallos reales de usabilidad, no cosmética.

## 4. Pruebas ejecutadas

```
npx tsc --noEmit   → sin errores
npm run build      → éxito
npx eslint .       → 47 errores / 40 warnings
                     (línea base antes de las fases: 50/50 → mejoró)
```

| Comprobación | Resultado |
|---|---|
| `/`, `/categories`, `/favorites`, `/login`, `/product?id=…` | ✅ 200 |
| `@media (prefers-reduced-motion: reduce)` en el CSS compilado | ✅ |
| `.pb-nav` en el CSS compilado | ✅ |
| Galería del detalle sirve `/_next/image` | ✅ |
| `/categories` sirve `/_next/image` | ✅ |
| Imagen de Unsplash pasa por el optimizador | ✅ 200, `image/jpeg`, 31 KB |
| `<img>` restantes en rutas públicas | Solo el `<img>` interno de `api/og` (correcto) |

## 5. Antes y después

| | Antes | Después |
|---|---|---|
| `prefers-reduced-motion` | ignorado por completo | respetado (CSS + Motion) |
| Animaciones al cargar la grilla | 16 springs + 16 divs animados | 0 (CSS) |
| Desenfoques simultáneos en badges | hasta 48 | 0 |
| Blur en barras fijas | siempre | solo escritorio |
| Contenido tapado por la nav en iOS | sí | no |
| Scroll horizontal en móvil de 320 px | sí (modal admin) | no |
| Botones táctiles < 44 px | ~10 | 0 en rutas públicas |
| Imágenes en rutas públicas con `<img>` | 6 | 0 (salvo `api/og`) |

## 6. Riesgos o pendientes

- **No se pudo verificar visualmente en navegador real**: en este entorno no hay
  Playwright ni Puppeteer. Las comprobaciones son de CSS compilado, HTML servido
  y tipos, no de píxeles. Queda pendiente que el dueño revise en su móvil.
- **Los SVG de categoría** siguen siendo una interpretación propia (decisión
  abierta de la Fase 5).
- **`medidas1.svg` pesa 1.3 MB** y se sirve en el modal y en el detalle. Es una
  guía de tallas rasterizada como SVG. Convertirla a WebP/AVIF ahorraría ~1.2 MB;
  no se hizo aquí porque cambia un recurso de marca y requiere aprobación.
- **El logo PNG pesa 120 KB.** Se sirve ya optimizado por `next/image`, pero
  exportarlo como SVG o WebP lo reduciría mucho más.
- Las animaciones de `ProductModal` (17 usos) se mantuvieron: son de apertura de
  un modal (no repetidas) y ayudan a entender la transición.

## 7. Archivos

`src/components/MotionProvider.tsx` (nuevo), `src/app/globals.css`,
`src/app/layout.tsx`, `src/components/ui/ProductCard.tsx`,
`src/components/ui/ProductBadges.tsx`, `src/components/navigation/TopAppBar.tsx`,
`src/components/navigation/BottomNav.tsx`, `src/components/modals/ProductModal.tsx`,
`src/components/modals/LocationModal.tsx`, `src/app/CatalogClient.tsx`,
`src/app/categories/page.tsx`, `src/app/favorites/page.tsx`,
`src/app/loading.tsx`, `src/app/product/ProductDetailClient.tsx`,
`src/app/admin/products/page.tsx`, `next.config.ts`.

## 8. Decisión requerida

1. ¿Convertimos `medidas1.svg` (1.3 MB) a WebP/AVIF? Es la ganancia de peso más
   grande que queda, pero es un recurso de marca.
2. ¿Exportamos el logo como SVG o WebP? (hoy 120 KB PNG)
3. Confirma en tu móvil que la barra inferior ya no tapa el final de la página.
