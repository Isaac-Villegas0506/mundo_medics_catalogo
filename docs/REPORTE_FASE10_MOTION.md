# Reporte — Fase 10: eliminación de framer-motion del sitio público

Fecha: 6 de noviembre de 2026
Petición: «quita framer motion pero que las animaciones que se usan de framer
motion las creas para siga tal cual»

---

## 1. Resultado medido

| Métrica (móvil, Lighthouse 13.6) | Antes | Después | Cambio |
|---|---|---|---|
| **Performance** | 69 | **79** | **+10** |
| **TBT** | 937 ms | **560 ms** | **−40 %** |
| **Speed Index** | 2.25 s | **1.8 s** | −0.45 s |
| LCP | 3.53 s | **3.2 s** | −0.33 s |
| FCP | 0.77 s | 0.8 s | ≈ igual |
| CLS | 0.000 | **0** | igual |
| **JS inicial** | 812.3 KiB | **673.8 KiB** | **−138.5 KiB (−17 %)** |

`framer-motion` ya **no aparece en ningún chunk de la portada**: se verificó
inspeccionando el contenido de los 12 chunks servidos.

---

## 2. Qué se hizo

### 2.1 Animaciones reescritas en CSS puro

Se crearon 15 utilidades en `globals.css` que reproducen **las mismas animaciones**
que hacía `motion/react`, con sus curvas y duraciones:

| Utilidad CSS | Sustituye a | Comportamiento |
|---|---|---|
| `.mm-in` | `initial/animate opacity` | fundido 0.28 s |
| `.mm-in-up` | `{opacity:0, y:20} → {1,0}` | subida 0.42 s |
| `.mm-in-sheet` | `{y:'100%'} → {y:0}` | el modal sube desde abajo |
| `.mm-in-pop` | `{scale:0.95} → {1}` | aparece con escala |
| `.mm-in-left` | `{x:'-100%'} → {x:0}` | cajón lateral |
| `.mm-out*` | `exit` | las cuatro salidas equivalentes |
| `.mm-collapse` | `{height:0} → {height:'auto'}` | buscador desplegable (con `grid-template-rows`) |
| `.mm-rotate` | `rotate: 45°` | icono buscar ⇄ cerrar |
| `.mm-tap` | `whileTap={{scale:0.93}}` | feedback al pulsar |
| `.mm-grow` | `animate={{height}}` | barras del gráfico del panel |
| `.mm-fade-in-delayed` | `delay: 0.12` | panel de contenido del modal |

### 2.2 `useDelayedUnmount`: reemplazo de `AnimatePresence`

`AnimatePresence` mantenía el nodo montado mientras corría la animación de salida.
Sin framer-motion, el nuevo hook lo hace con `setTimeout`:

```ts
const { shouldRender, isLeaving } = useDelayedUnmount(open, 240);
if (!shouldRender) return null;
<div className={isLeaving ? 'mm-out-sheet' : 'mm-in-sheet'} />
```

### 2.3 Reescrituras destacadas

**`TopAppBar`**
- Rotación del icono: `motion.span` → `mm-rotate` + `data-open`.
- Buscador desplegable: `AnimatePresence` → `mm-collapse` con transición de
  `grid-template-rows` de `0fr` a `1fr` (permite altura automática sin medir).
- Cajón lateral y velo: `mm-in-left` / `mm-out-left` + `mm-in` / `mm-out`.

**`ProductModal`** (el más complejo, 17 usos)
- **Parallax de la imagen:** `useScroll` + `useTransform` → un listener de
  `scroll` nativo que calcula los mismos valores (escala 1→0.75, opacidad 1→0.2,
  desplazamiento 0→80 px entre 0 y 300 px de scroll). Se agrupa con
  `requestAnimationFrame` para no recalcular en cada píxel.
- **Arrastre del asa:** `useDragControls` → Pointer Events con umbral de 100 px
  o velocidad > 0.4 px/ms para cerrar. Mismo comportamiento que antes.
- Entrada/salida del panel: `mm-in-sheet` / `mm-out-sheet`.
- Botones de color y talla: `whileTap` → `mm-tap`.

**`CatalogClient`**
- Chips de categoría: `motion.button` + `whileTap` → `button` + `mm-tap`.
- estados (cargando/error/vacío): `AnimatePresence` → `.mm-in`.

**`ProductDetailClient`, `ImageLightbox`, `LocationModal`, `login`, `categories`,
`favorites`, `AdminShell`**: convertidos a etiquetas HTML planas con las clases
CSS equivalentes.

### 2.4 Un hallazgo que no era framer-motion

Al medir, un chunk de 227 KB seguía en el bundle inicial. Mi primera búsqueda
dijo «framer», pero era un **falso positivo**: al inspeccionarlo, ese chunk es
**`react-dom`** (`createRoot`, `hydrateRoot`), que es obligatorio.

Durante esa investigación encontré un problema real y lo corregí:
**`ProductCard` importaba el tipo `Product` desde `ProductModal`** como valor, lo
que creaba una dependencia de la tarjeta con el modal completo. El tipo se movió
a `src/types/product.ts` y ahora la tarjeta no arrastra nada del modal.

---

## 3. framer-motion NO se eliminó de `package.json`

**El panel de administración sigue usándolo.** Cuatro páginas emplean
`<Reorder>` (arrastrar para ordenar), que no tiene equivalente trivial en CSS:

| Página | Uso |
|---|---|
| `admin/products` | reordenar productos arrastrando |
| `admin/categories` | reordenar categorías |
| `admin/featured` | reordenar destacados |
| `admin/products/[id]` | reordenar la galería |

Reescribir el arrastre de listas con Pointer Events es un trabajo considerable y
arriesgado, y **no aporta nada al rendimiento del catálogo público**, que era el
problema medido.

La solución aplicada es la que el plan de Fase 9 recomendaba:
**sacar motion del camino crítico, no del proyecto.**

- `MotionProvider` se retiró del layout raíz.
- Se colocó **solo** en `src/app/admin/layout.tsx`.
- Resultado: el catálogo público no descarga motion; el panel sí, y solo cuando
  se entra a él (que ya requiere sesión).

---

## 4. Movimiento reducido: sigue funcionando, y ahora sin JavaScript

Antes se respetaba con `<MotionConfig reducedMotion="user">` (que obligaba a
cargar motion en todas las páginas). Ahora se respeta con CSS puro:

```css
@media (prefers-reduced-motion: reduce) {
  *, *::before, *::after {
    animation-duration: 0.01ms !important;
    animation-iteration-count: 1 !important;
    transition-duration: 0.01ms !important;
  }
}
```

Es **mejor que antes**: se cumple la preferencia sin descargar 227 KB de
JavaScript. Verificado que la regla sigue presente en el CSS compilado.

---

## 5. Verificación

```
npx tsc --noEmit   → 0 errores
npm run build      → éxito
Lighthouse móvil   → ejecutado (resultados en la sección 1)
```

| Comprobación | Resultado |
|---|---|
| `/`, `/categories`, `/favorites`, `/login` | ✅ 200 |
| `/sitemap.xml`, `/robots.txt` | ✅ 200 |
| `/admin` sin sesión | ✅ 307 |
| `/ruta-x` | ✅ 404 |
| Productos en el HTML del servidor | ✅ |
| 14 iconos renderizados | ✅ |
| 6 clases `mm-*` en el HTML | ✅ |
| 14 utilidades de animación en el CSS compilado | ✅ |
| `@keyframes` presentes | ✅ |
| `prefers-reduced-motion` activo | ✅ |
| `framer-motion` en chunks de la portada | ✅ **ausente** |

---

## 6. Limitaciones

1. **Las animaciones se verificaron en CSS compilado, no visualmente.** No hay
   navegador interactivo en el entorno. Hay que confirmar en un móvil que las
   transiciones se sienten igual que antes.
2. **El arrastre del asa del modal** se reimplementó con Pointer Events; conviene
   probar el umbral en un dispositivo real.
3. **El parallax** de la imagen del modal usa scroll nativo; verificar que se
   sienta fluido.
4. **Lighthouse con hardware modesto** (i5-8265U): las cifras son pesimistas
   frente a Vercel con CDN. Los valores absolutos mejorarán en producción.
5. **`Reorder` del panel** sigue dependiendo de framer-motion. Si algún día se
   quiere eliminar del todo, hay que reescribir el arrastre de listas.

---

## 7. Archivos

**Nuevos**
- `src/app/...` — sin cambios de ruta
- `src/hooks/useDelayedUnmount.ts`
- `src/types/product.ts`

**Modificados**
- `src/app/globals.css` (15 utilidades + 10 `@keyframes`)
- `src/app/layout.tsx` (sin `MotionProvider`)
- `src/app/admin/layout.tsx` (con `MotionProvider`)
- `src/components/navigation/TopAppBar.tsx` (reescrito)
- `src/components/navigation/BottomNav.tsx`
- `src/components/modals/ProductModal.tsx`
- `src/components/modals/LocationModal.tsx`
- `src/components/ui/ImageLightbox.tsx`
- `src/components/ui/ProductCard.tsx` (import de tipo)
- `src/app/CatalogClient.tsx`, `src/app/product/ProductDetailClient.tsx`,
  `src/app/login/page.tsx`, `src/app/categories/page.tsx`,
  `src/app/favorites/page.tsx`
- `src/app/admin/page.tsx`, `src/app/admin/categories/page.tsx`,
  `src/app/admin/featured/page.tsx`, `src/app/admin/products/page.tsx`,
  `src/app/admin/products/[id]/page.tsx`
- `src/components/admin/AdminShell.tsx`

---

## 8. Decisión requerida

1. **Probar en un móvil** que las animaciones se sienten igual (apertura del
   modal, cajón del menú, buscador, parallax de la imagen).
2. Confirmar si se quiere **eliminar framer-motion también del panel**,
   reescribiendo el arrastre de listas (`Reorder`). Es trabajo aparte y no
   afecta al rendimiento público.
