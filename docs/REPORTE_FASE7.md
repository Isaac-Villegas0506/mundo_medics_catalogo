# Reporte — Fase 7 (Funcionamiento completo de todas las secciones)

Basado en la sección 11 del *Plan Maestro de Optimización*. Fecha: 6 de noviembre de 2026.

> **Alcance.** El plan pide comprobar que cada apartado **funciona**, no sólo que se
> ve bien. No se cambió la lógica comercial del panel (11.7 lo prohíbe sin
> aprobación): sólo se corrigieron fallos de funcionamiento.

## 1. Fallos encontrados y corregidos

### 11.5 — Producto inexistente devolvía 200 en vez de 404

`/product`, `/product?id=` y `/product?id=<uuid-inexistente>` respondían **200** con
un mensaje de "no encontrado". Los buscadores indexaban esas URLs como válidas.

Corregido con `notFound()` + nuevo `src/app/not-found.tsx` con la identidad del
sitio.

**Hallazgo adicional durante la corrección:** el `src/app/loading.tsx` que creé en
la Fase 5 envolvía **todas** las rutas en Suspense, lo que fuerza streaming y hace
que Next responda 200 aunque haya `notFound()`. Se eliminó (la portada ya tiene su
propio `Suspense`) y el 404 pasó a ser real.

> Documentado por Next: *"If you need a 404 status… ensure the resource exists before
> the response body is streamed"*. En modo streaming el status es 200 y se inyecta
> `<meta name="robots" content="noindex">`.

### 11.7 — El catálogo público no se enteraba de los cambios del panel

Al crear, editar, borrar u ocultar un producto, la portada podía tardar **hasta
60 s** en reflejarlo (`revalidate = 60` de la Fase 5). No había ninguna invalidación.

Corregido con una **Server Action** (`src/app/admin/actions.ts`) que llama a
`revalidatePath('/', 'page')`, `/categories` y `/product`. Se ejecuta tras
cambiar el estado o borrar un producto, y **está protegida por sesión**: sin
usuario autenticado no revalida nada.

### 11.2 — La URL no reflejaba el filtro de categoría

Al pulsar un chip, el estado cambiaba pero la URL seguía en `/`. No se podía
compartir un filtro ni usar el botón «atrás».

Corregido con `changeCategory()`, que actualiza `?category=` con
`router.replace(..., { scroll: false })` para no saltar al inicio de la página.

### 11.3 — Búsqueda vulnerable a caracteres de PostgREST

El filtro se construía como cadena (`.or('name.ilike.%<q>%,...')`). Buscar
`50%`, `a,b` o `a(b)` rompía la consulta o alteraba su significado.

Corregido con `src/utils/searchTerm.ts` → `sanitizeSearchTerm()`: recorta,
colapsa espacios múltiples y quita `, ( ) % * . : \ ' "`. **12 pruebas unitarias,
12 pasan.**

También se acotó el `?category=` de la URL en el servidor (recorte y límite de
80 caracteres).

### 11.4 — Favoritos: datos corruptos y productos fantasma

- Con `localStorage` corrupto (JSON inválido o un objeto en vez de un array) la
  página quedaba en blanco para siempre. Ahora se descarta y se limpia.
- Los productos borrados del catálogo dejaban su id huérfano, inflando el
  contador. Ahora se descartan y se reescribe `localStorage`.
- No había estado de error ni botón de reintentar. **Añadidos.**

### 11.8 — Enlace muerto y errores sin mostrar

- **`¿Olvidaste tu contraseña?` era `href="#"`**: no hacía nada. Ahora abre un modo
  de recuperación que llama a `supabase.auth.resetPasswordForEmail()` con
  confirmación y mensaje neutro (no revela si el correo existe).
- El login usaba **`alert()`** para los errores: ahora son mensajes inline con
  `role="alert"`, traducidos a español ("Correo o contraseña incorrectos", "Demasiados
  intentos", "No hay conexión"…).
- El checkbox **"Mantener sesión iniciada"** no hacía nada: ahora se guarda la
  preferencia.
- `11.2` Categorías no tenían estado de error. **Añadido con reintentar.**

## 2. Matriz de rutas (verificada en producción)

| Ruta | Esperado | Obtenido |
|---|---|---|
| `/` | 200 | ✅ 200 |
| `/?category=Casacas` | 200 | ✅ 200 |
| `/categories` | 200 | ✅ 200 |
| `/favorites` | 200 | ✅ 200 |
| `/login` | 200 | ✅ 200 |
| `/admin` | 307 → login | ✅ 307 |
| `/admin/products` | 307 → login | ✅ 307 |
| `/admin/settings` | 307 → login | ✅ 307 |
| `/ruta-inexistente` | 404 | ✅ 404 |
| `/product` | 404 | ✅ 404 |
| `/product?id=<inexistente>` | 404 | ✅ 404 |
| `/product?id=<real>` | 200 | ✅ 200 |

## 3. Verificaciones funcionales

| Comprobación | Resultado |
|---|---|
| Productos en el HTML del servidor | ✅ |
| Categorías en el HTML del servidor | ✅ |
| Filtro `?category=Casacas` sólo muestra esa categoría | ✅ |
| Enlaces `href="#"` en todo `src/` | ✅ **0** |
| Iconos renderizados (13 en portada) | ✅ |
| 404 usa el diseño propio del sitio | ✅ |
| Pruebas de `sanitizeSearchTerm` | ✅ 12/12 |

## 4. Estado por sección del plan

| Sección | Estado |
|---|---|
| 11.1 Inicio | ✅ Carga, filtros, búsqueda, favoritos, modales y enlaces sociales |
| 11.2 Categorías | ✅ Corregido: URL refleja el filtro, estado de error añadido |
| 11.3 Buscador | ✅ Corregido: saneado de caracteres especiales |
| 11.4 Favoritos | ✅ Corregido: corrupción, fantasmas, error y reintentar |
| 11.5 Detalle | ✅ Corregido: 404 real, not-found propio |
| 11.6 Navegación | ✅ Sin cambios necesarios (ver limitación abajo) |
| 11.7 Panel admin | ✅ Corregido: revalidación del catálogo tras cambios |
| 11.8 Errores y estados | ✅ Corregido: enlace muerto, alert(), checkbox inerte |

## 5. Limitaciones de esta verificación

- **No hay navegador headless** en el entorno (ni Playwright ni Puppeteer), así
  que las pruebas son de **HTML servido, CSS compilado, tipos y consultas reales**,
  no de interacción con ratón/teclado. Las pruebas de 11.6 (foco, teclado, cierre
  de modales con Esc) **quedan pendientes de revisión manual**.
- **El panel admin no se pudo probar con sesión iniciada** (no hay credenciales).
  Se verificó que las rutas redirigen y que las Server Actions compilan y están
  protegidas, pero crear/editar/borrar con la interfaz debe probarlo el dueño.
- No se probó en dispositivos físicos (móvil pequeño, tablet, alta densidad).

## 6. Archivos modificados

`src/app/login/page.tsx` (reescrito), `src/app/product/page.tsx`,
`src/app/not-found.tsx` (nuevo), `src/app/loading.tsx` (eliminado),
`src/app/page.tsx`, `src/app/CatalogClient.tsx`, `src/app/categories/page.tsx`,
`src/app/favorites/page.tsx`, `src/app/admin/actions.ts` (nuevo),
`src/app/admin/products/page.tsx`, `src/utils/searchTerm.ts` (nuevo),
`public/fonts/material-symbols-subset.woff2` (regenerado con 42 iconos).

## 7. Pendiente de prueba manual (por el dueño)

1. Entrar al panel y **crear, editar y borrar un producto**, comprobando que la
   portada se actualiza **al instante**.
2. **Cambiar el número de WhatsApp** en Ajustes y verificar que los botones lo
   reflejan.
3. Probar el **recuperar contraseña** con el correo real.
4. Revisar en el móvil: navegación inferior, cierre de modales y scroll.
5. Comprobar con teclado: `Tab` por la portada y `Esc` para cerrar modales.
