# Reporte — Fase 7 corregida (Plan de Continuidad v2.0)

Fecha: 6 de noviembre de 2026
Rama: `fase-7-funcionamiento`
Base: `fase-6-diseno`

---

## Estado de la fase

**Completada en código y verificada con pruebas automáticas.**
**Pendiente de verificación manual por el dueño** (ver sección 7).

---

## 0. Diagnóstico previo: estado real del repositorio

Según la regla 0.1 del Plan de Continuidad, lo primero fue determinar el escenario.

**Resultado: ESCENARIO B.**

| Comprobación | Hallazgo |
|---|---|
| Rama actual | `fase-7-funcionamiento` |
| `main` local | `eac07b2` ("chore: set light mode as default theme") |
| `origin/main` | `eac07b2` — **idéntico** |
| Commits por delante de `main` | **22** |
| Archivos de diferencia | 81 (+3.869 / −1.109) |

> **Hallazgo crítico:** `main` **no contiene ninguna** de las fases 0 a 7. La
> producción de Vercel sigue desplegando el código anterior a todo el trabajo.
> Toda la optimización está en ramas encadenadas sin fusionar.

No existe un PR #9 accesible desde este entorno; no hay `gh` ni credenciales de
GitHub. La integración debe hacerla el dueño (ver sección 8).

---

## 1. Diagnóstico: problemas encontrados

| # | Tarea del plan | Estado encontrado |
|---|---|---|
| 1.1 | Botones amontonados en modales | **Confirmado.** El pie de acciones del modal mide 80 px + zona segura, pero el área desplazable sólo reservaba `pb-[80px]` fijo → el último dato quedaba tapado en iPhone. |
| 1.2 | No se conserva la posición al volver | **Confirmado.** El botón "regresar" era `<Link href="/">`: siempre iba a la portada sin `?category=` y reiniciaba el scroll. |
| 1.3 | Recargas completas al navegar | **Confirmado.** `window.location.href` en los productos relacionados del modal, y el BottomNav usaba `router.push` en lugar de `Link`. |
| 1.4 | Sin gestos en la galería | **Confirmado.** Sólo botones. |
| 1.5 | Invalidación de caché incompleta | **Confirmado y ampliado.** Sólo se revalidaba al cambiar estado/borrar producto. Faltaban: categorías (crear/editar/borrar/reordenar), destacados y ajustes. |
| 1.6 | El color seleccionado no se envía | **Confirmado.** `selectedColorIndex` cambiaba el resaltado, pero el nombre mostrado y el mensaje de WhatsApp usaban siempre `product.color_name`. |
| 1.7 | "Mantener sesión" no funciona | **Confirmado.** Guardaba `mm-session-only` en `sessionStorage`, que no afecta a las cookies de `@supabase/ssr`. |
| 1.8 | Enlaces y número de WhatsApp | **Confirmado.** `NEXT_PUBLIC_WHATSAPP_NUMBER=51999999999` en `.env.example` **y en `.env.local`**, sin usarse en el código. Sin normalización del número. |
| 1.9 | `select('*')` en consultas públicas | **Confirmado.** `settingsCache` traía todas las columnas. |
| 1.10 | Estados de carga y estabilidad | **Confirmado.** Había `alert()` nativos y el panel de categorías no comprobaba errores de escritura. |

---

## 2. Archivos modificados

### Nuevos

| Archivo | Contenido |
|---|---|
| `src/hooks/useBackToCatalog.ts` | Vuelta al catálogo con `router.back()` (restaura scroll) y respaldo a `/`. |
| `src/hooks/useSwipeGallery.ts` | Gestos táctiles con Pointer Events nativos, sin librerías. |
| `src/utils/productColor.ts` | Color seleccionado con nombre legible; sin inventar relaciones imagen-color. |
| `src/utils/whatsapp.ts` | Normalización del número y construcción segura de la URL. |

### Modificados

| Archivo | Cambio |
|---|---|
| `src/app/admin/actions.ts` | Centraliza la invalidación: portada, producto, categorías y favoritos. |
| `src/app/admin/categories/page.tsx` | Revalidación + modal de confirmación propio + control de errores + estados `saving`/`formError`. |
| `src/app/admin/featured/page.tsx` | Revalidación + sin `alert()` + mensajes visibles + control de errores. |
| `src/app/admin/products/[id]/page.tsx` | `alert()` → aviso en la interfaz. |
| `src/app/admin/settings/page.tsx` | Revalidación del catálogo + errores de imagen sin `alert()`. |
| `src/app/login/page.tsx` | Casilla de sesión retirada; se explica el comportamiento real. |
| `src/app/product/ProductDetailClient.tsx` | Botón volver, gestos, color seleccionado, WhatsApp normalizado. |
| `src/components/modals/ProductModal.tsx` | Pie de acciones con espacio correcto, `router.push`, gestos, color, WhatsApp. |
| `src/components/navigation/BottomNav.tsx` | `Link` en lugar de `router.push`; WhatsApp como `<a>` real; estado deshabilitado sin número. |
| `src/app/globals.css` | Nueva utilidad `.pb-modal-actions`. |
| `src/utils/settingsCache.ts` | `select('key, value')` en vez de `select('*')`. |
| `.env.example` | Retirada la variable de WhatsApp con número de ejemplo. |

---

## 3. Solución aplicada, por tarea

### 1.1 Botones y espaciado en modales
Nueva utilidad `.pb-modal-actions` = `80px + env(safe-area-inset-bottom) + 16px`
(104 px en escritorio). Sustituye el `pb-[80px]` fijo del área desplazable, así
el último dato del producto ya no queda debajo de los botones.

### 1.2 Conservar la posición
`useBackToCatalog()`: si hay historial (`history.length > 1`) usa `router.back()`,
que deja al navegador restaurar la posición y conserva `?category=`. Si no lo hay
(enlace abierto desde WhatsApp), cae a `/`. El botón pasó de `<Link>` a `<button>`.

> No se implementó un guardado manual de píxeles: con la altura del contenido
> cambiando (paginación, imágenes), ese enfoque es frágil. El historial del
> navegador es más fiable, como pide el plan.

### 1.3 Navegación interna
- `window.location.href` → `router.push` en los relacionados del modal.
- `BottomNav` pasó de `router.push` a `Link`: navegación interna y soporte de
  clic central / "abrir en pestaña nueva".
- WhatsApp sigue siendo `<a target="_blank">` real.

### 1.4 Galería táctil
`useSwipeGallery` con Pointer Events: sirve para dedo, lápiz y ratón.
- Umbral de 50 px para cambiar de imagen (un toque no cambia nada).
- Decisión de eje una sola vez: si el gesto es vertical, **no** se intercepta,
  así el scroll de la página sigue funcionando.
- `touch-pan-y` en el contenedor para no bloquear el desplazamiento vertical.
- Añadida pista "Desliza para ver más" sólo en móvil.
- **Sin dependencias nuevas.**

### 1.5 Invalidación centralizada
`revalidateCatalog()` ahora invalida `/`, `/product`, `/categories` y
`/favorites`, y se llama tras **cada** operación: crear/editar/borrar categoría,
reordenar categorías, guardar destacados, cambiar estado de producto, borrar
producto y guardar ajustes. Sigue protegida por sesión.

Además se corrigió que el panel mostrara éxito aunque la escritura fallara:
ahora comprueba `error` y revierte el estado local.

### 1.6 Selector de colores
`getSelectedColor()` devuelve el color realmente elegido:
- Con un solo color usa `color_name` si existe.
- Con varios usa el hex en mayúsculas, porque `color_name` no distingue cuál es cuál.
- El nombre mostrado y el mensaje de WhatsApp usan ese valor.
- Botones de color a 44 px con `aria-label` y `aria-pressed`.

> **Limitación del esquema, documentada y no inventada:** verificado contra la
> base real, `color_name` está **vacío en los 5 productos**,
> `color_hex_codes` es una lista plana **sin nombres** y `gallery` **no tiene
> relación con los colores**. No es posible saber qué imagen corresponde a cada
> color. Estructura propuesta (requiere migración y aprobación): tabla
> `product_variants (product_id, color_name, color_hex, image_url)` o un `jsonb`
> `variants` en `products`.

### 1.7 Sesión
La casilla **se retiró**. Con `@supabase/ssr` la sesión vive en cookies
gestionadas por la librería; no se puede prometer otra duración sin romper la
autenticación. El plan autoriza explícitamente retirarla antes que mostrar una
opción que no cumple. En su lugar aparece: "Tu sesión se mantiene mientras no
cierres sesión."

### 1.8 WhatsApp
- Nuevo `normalizeWhatsappNumber()`: quita `+`, espacios, guiones y el prefijo
  `00`; añade `51` a un móvil peruano de 9 dígitos; rechaza longitudes imposibles.
- `buildWhatsappUrl()` devuelve `''` si el número no es válido, para deshabilitar
  el botón en lugar de abrir un chat equivocado.
- Mensaje codificado con `encodeURIComponent` e identificando producto, talla y
  color seleccionado.
- **Eliminada `NEXT_PUBLIC_WHATSAPP_NUMBER`** de `.env.example` y `.env.local`:
  no se usaba en el código y contenía un número de ejemplo. El número real se
  configura desde Ajustes y vive en la tabla `settings`.
- Número real verificado en la base: `+51972991420` → normaliza a `51972991420`.

### 1.9 Consultas públicas
`settingsCache` pasó a `select('key, value')`. Los tres `select('*')` restantes
son fichas de producto, que sí necesitan todos los campos.

### 1.10 Estados
- **0 `alert()` / `confirm()` nativos** en todo `src/`.
- Errores visibles con `role="alert"`, descartables en el formulario de producto.
- Confirmación de borrado de categoría con modal propio.
- Errores de escritura ya no muestran éxito.

---

## 4. Pruebas ejecutadas

```
npx tsc --noEmit   → 0 errores
npm run build      → éxito
npx eslint .       → 47 errores / 37 warnings
                     (línea base original: 50/50)
```

### Matriz de rutas (servidor de producción, `npm run start`)

| Ruta | Esperado | Obtenido |
|---|---|---|
| `/` | 200 | ✅ 200 |
| `/?category=Casacas` | 200 | ✅ 200 |
| `/categories` | 200 | ✅ 200 |
| `/favorites` | 200 | ✅ 200 |
| `/login` | 200 | ✅ 200 |
| `/admin` | 307 | ✅ 307 |
| `/ruta-inexistente` | 404 | ✅ 404 |
| `/product` | 404 | ✅ 404 |
| `/product?id=<inexistente>` | 404 | ✅ 404 |
| `/product?id=<real>` | 200 | ✅ 200 |

### Pruebas unitarias

| Módulo | Casos | Resultado |
|---|---|---|
| `sanitizeSearchTerm` | 12 | **12/12** |
| `normalizeWhatsappNumber` + `buildWhatsappUrl` | 13 | **13/13** |

Casos de WhatsApp cubiertos: `+51 987 654 321`, `51-987-654-321`,
`0051987654321`, `987654321` (local), vacío, `null`, demasiado corto,
demasiado largo, y URL con mensaje codificado.

### Verificación en HTML servido

| Comprobación | Resultado |
|---|---|
| 1.2 Botón "Volver" con `aria-label` (no `Link href="/"`) | ✅ |
| 1.3 Enlaces internos `Link` en BottomNav (`/`, `/categories`, `/favorites`) | ✅ |
| 1.4 "Desliza para ver más" en producto con 4 imágenes | ✅ |
| 1.4 Flechas con `aria-label` | ✅ |
| 1.6 Color mostrado como hex del seleccionado | ✅ |
| 1.7 Casilla `remember-me` ausente + texto informativo presente | ✅ |
| 1.8 `href="#"` en login | ✅ **0** |
| `alert()` nativos en `src/` | ✅ **0** |

---

## 5. Evidencias

- Salida de `tsc`, `build` y `eslint` (arriba).
- Salidas de los scripts de pruebas unitarias (12/12 y 13/13).
- Matriz de rutas ejecutada contra `http://localhost:3000` en modo producción.
- Consulta a la base real para verificar el esquema de colores y el número de
  WhatsApp.

---

## 6. Problemas restantes / limitaciones

1. **No hay navegador headless** en el entorno (ni Playwright ni Puppeteer).
   Las pruebas son de **HTML servido, tipos, build y lógica unitaria**, no de
   interacción real: foco, teclado, `Esc` y gestos táctiles **no se probaron en
   un navegador**.
2. **No hay credenciales del panel**: no se pudo probar con sesión iniciada el
   flujo de crear/editar/borrar producto ni el de categorías.
3. **Relación color-imagen**: no existe en el esquema. Documentada con propuesta.
4. **`1.3` y el estado del catálogo**: al usar `Link`, Next puede servir la
   portada desde caché del cliente. Con `revalidateCatalog()` la invalidación es
   correcta, pero conviene confirmarlo en producción.
5. **`main` sigue sin los cambios** (ver sección 8).

---

## 7. Pruebas que debe hacer el dueño

| # | Prueba | Cómo |
|---|---|---|
| 1 | Scroll conservado | Portada → bajar → abrir producto → botón volver. Debe quedar en el mismo punto. |
| 2 | Scroll desde categoría | Categorías → categoría → producto → volver. Debe conservar `?category=`. |
| 3 | Navegación fluida | Alternar Inicio/Categorías/Guardados sin que la página parpadee. |
| 4 | Gestos de galería | Abrir producto con varias fotos y deslizar el dedo. |
| 5 | Botones del modal | Abrir un producto desde la portada y comprobar que los botones no tapan el contenido. |
| 6 | Color en WhatsApp | Cambiar color y pulsar consultar: el mensaje debe llevar el color elegido. |
| 7 | Actualización inmediata | Crear un producto de prueba, ver la portada, borrarlo. |
| 8 | Categorías | Crear, editar y borrar una categoría de prueba. |
| 9 | Ajustes | Cambiar el número de WhatsApp y comprobar los botones. |
| 10 | Teclado | Recorrer la portada con `Tab` y cerrar modales con `Esc`. |

---

## 8. GitHub

| Aspecto | Estado |
|---|---|
| Rama | `fase-7-funcionamiento` |
| Commits nuevos | Pendiente de commitear al cierre de este informe |
| Pull Request | No creado (sin acceso a GitHub desde el entorno) |
| `main` | **Sin los cambios**: 22 commits por detrás de la rama |
| Ramas pendientes de fusión | `fase-0` a `fase-7` (7 ramas) |

**Orden de fusión recomendado:** como las ramas están encadenadas
(`fase-0` → `fase-1` → … → `fase-7`), basta con fusionar `fase-7-funcionamiento`
en `main`, o abrir un PR por rama en ese orden si se quiere revisar por fases.

---

## 9. Vercel

| Aspecto | Estado |
|---|---|
| Rama de producción | `main` |
| Commit desplegado | `eac07b2` (código **anterior** a todas las fases) |
| URL | https://mundo-medics-catalogo.vercel.app |
| Verificación | **No realizada**: la producción no tiene estos cambios todavía |

Mientras no se fusione en `main`, la web pública **no** incluye ninguna de las
mejoras de las fases 1 a 7.

---

## 10. Decisión requerida

1. **Aprobar la fusión de `fase-7-funcionamiento` en `main`** (o de las 7 ramas
   en orden). Sin esto, nada de lo hecho llega a producción.
2. **Confirmar el retiro de la casilla "Mantener sesión iniciada"** (tarea 1.7).
3. **Aprobar la estructura `product_variants`** si se quiere relacionar color e
   imagen (tarea 1.6). Requiere migración.
4. **Rotar el `CLOUDINARY_API_SECRET`** y **desactivar el registro público** en
   Supabase Auth (pendientes de fases anteriores).
