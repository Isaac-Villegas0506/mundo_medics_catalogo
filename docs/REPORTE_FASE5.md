# Reporte — Fase 5 (Next.js y arquitectura de renderizado)

Basado en la sección 9 del *Plan Maestro de Optimización*. Fecha: 6 de noviembre de 2026.

## 1. Qué se encontró

El hallazgo mayor no estaba en el JavaScript, sino en **recursos externos bloqueantes**:

| Recurso externo | Tamaño | Para qué se usaba |
|---|---|---|
| Flaticon Uicons `all.css` (jsDelivr) | **1.182.197 B** | 7 iconos de categoría |
| Flaticon `uicons-bold-rounded.woff2` | **351.668 B** | los mismos 7 iconos |
| Flaticon otras 3 familias (regular/solid/thin) | ~1.08 MB | **ninguna**, se descargaban igual |
| Google Fonts `Material Symbols Outlined` | 688 B CSS + **1.140.260 B** fuente | 37 iconos |

Es decir: **≈ 2.5 MB de recursos externos** (y dos dominios de terceros en la ruta
crítica) para pintar 44 iconos. Además, ambos `<link>` estaban en `<head>` sin
`preconnect`, bloqueando el primer render.

Otras observaciones:

- `src/app/page.tsx` era **100% cliente**: el HTML inicial no traía ni un producto,
  así que el usuario veía un esqueleto hasta que terminaban 3 consultas + la
  hidratación. El contenido estaba disponible en el servidor desde el principio.
- `ClothingIcon` dependía de clases CSS `fi-br-*` externas.

## 2. Qué se modificó

### 9.4 Fuentes e iconos (la mayor ganancia)

**Material Symbols → subconjunto local.**
Se generó un `.woff2` con **solo los 37 iconos realmente usados** mediante el
parámetro `icon_names` de Google Fonts, y se sirve desde `/public/fonts/`.
La regla `@font-face` + `.material-symbols-outlined` ahora vive en `globals.css`.

> 1.140.260 B → **36.056 B** (−97 %)

⚠️ Si añades un icono nuevo, hay que regenerar el subconjunto. Comando exacto:

```
https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:opsz,wght,FILL,GRAD@20..48,100..700,0..1,-50..200&icon_names=<lista separada por comas>&display=swap
```

Busca el `url(...woff2)` en la respuesta y guárdalo como
`public/fonts/material-symbols-subset.woff2`. **Si el icono no está en el
subconjunto, se verá el nombre en texto en lugar del glifo.**

**Flaticon → SVG locales.** `ClothingIcon.tsx` ya no usa clases `fi-br-*`:
dibuja 7 trazos SVG propios (camiseta, camisa, pantalón, chaleco, chaleco con
parches, bota, percha). Se eliminó el `<link>` al CDN.

> 1.182.197 B de CSS + 351.668 B de fuente + ~1.08 MB de familias no usadas → **0 B**
> (los SVG van dentro del bundle, unos pocos cientos de bytes)

### 9.1 Componentes de servidor y cliente

La portada se dividió en dos:

| Archivo | Tipo | Responsabilidad |
|---|---|---|
| `src/app/page.tsx` | **Servidor** | Consulta categorías, ajustes y primera página de productos en paralelo; renderiza HTML con contenido. |
| `src/app/CatalogClient.tsx` | **Cliente** | Búsqueda, chips de categoría, favoritos (localStorage), modales, «Ver más». |
| `src/utils/supabase/publicServer.ts` | **Servidor** | Cliente Supabase sin cookies (solo datos públicos, cacheable). |

El cliente recibe los datos como `initial` y **no repite la primera consulta**
(guardia `isFirstRun`), evitando el doble fetch que hacía antes.

### 9.2 Carga inicial

- `export const revalidate = 60` en la portada: HTML cacheado en el CDN 60 s y
  revalidado en segundo plano. Es contenido público y cambia poco.
- Nuevo `src/app/loading.tsx`: esqueleto real mientras se genera la página.
- El `<Suspense>` de la página mantiene su fallback.

### 9.3 Código y dependencias

Auditoría sin hallazgos que justifiquen tocar dependencias:

- `motion/react` ya se usa ampliamente (tarjetas, nav, modales); no hay forma de
  quitarlo sin cambiar la identidad visual, que el plan prohíbe alterar aquí.
- Se comprobó que **ningún chunk de la portada contiene código de admin**
  (verificado buscando `cloudinary/sign`, `featured_product_id`, etc.).
- No hay dependencias duplicadas ni analizadores instalados.

## 3. Por qué

El plan pide (9.4) "no cargar una biblioteca completa por usar tres iconos" y
(9.2) "el servidor debe preparar el contenido principal". Eso es exactamente lo
que se hizo, sin tocar la identidad visual ni instalar nada nuevo.

## 4. Pruebas ejecutadas

```
npx tsc --noEmit   → sin errores
npm run build      → éxito
```

Verificaciones sobre el servidor de desarrollo (`http://localhost:3000`):

| Comprobación | Resultado |
|---|---|
| `/` responde 200 | ✅ |
| HTML inicial contiene «Conjunto San Martin» y «Chaqueta Doble Corte» | ✅ (antes no) |
| `fonts.googleapis.com`, `fonts.gstatic.com`, `flaticon`, `cdn.jsdelivr` en `/` | ✅ ausentes |
| Hojas de estilo externas en `/` | ✅ solo 1 CSS propio |
| `/product?id=<uuid>` trae el nombre del producto en el HTML | ✅ |
| `/categories`, `/favorites`, `/login` → 200 ; `/admin` → 307 a login | ✅ |
| Código de admin en chunks de la portada | ✅ ausente |

Tamaños medidos con un build de producción del commit anterior vs. el actual
(mismo `node_modules`):

| | Antes | Después |
|---|---|---|
| JS propio (estático) | 1.438.576 B | 1.439.305 B |
| CSS propio (estático) | 65.863 B | 66.425 B |
| **Recursos externos de iconos** | **≈2.504.000 B** | **≈36.000 B** |

La diferencia de JS es de +729 B (el SVG de categorías y el arreglo de datos
iniciales). La ganancia está en los ~2.47 MB de terceros eliminados de la ruta
crítica.

## 5. Antes y después

| | Antes | Después |
|---|---|---|
| Dominios externos en la ruta crítica | 2 (fonts.googleapis, cdn.jsdelivr) | 0 |
| Peso de iconos/fuentes | ≈2.5 MB | ≈36 KB |
| HTML inicial de la portada | esqueleto vacío | productos reales |
| Consultas al cargar la portada | 3 en el navegador, tras hidratar | 3 en el servidor, antes del HTML |
| Duplicado de la 1.ª consulta | sí (servidor no existía) | no (guardia `isFirstRun`) |
| Caché de la portada | ninguna | `revalidate = 60` |

## 6. Riesgos o pendientes

- **Icono nuevo ⇒ regenerar el subconjunto.** Si se olvida, el icono se ve como
  texto. Está documentado arriba y en el comentario de `globals.css`.
- Los SVG de categoría son una interpretación propia; si el dueño prefiere los
  iconos exactos de Flaticon, habría que licenciar los archivos y servirlos en
  local (nunca volver a enlazar el CDN completo).
- `revalidate = 60` implica que un producto recién publicado puede tardar hasta
  60 s en aparecer en la portada. Para invalidación inmediata haría falta una
  Server Action con `revalidatePath('/')` (Fase 7).
- `/categories` y `/favorites` siguen siendo componentes cliente; tienen poco
  volumen y mucha interacción, se abordan en la Fase 7.
- No se midió con Lighthouse (no hay navegador instrumentado aquí); las cifras
  son de bytes reales descargados, no estimaciones.

## 7. Archivos

- `src/app/page.tsx` (reescrito como componente de servidor)
- `src/app/CatalogClient.tsx` (nuevo)
- `src/app/loading.tsx` (nuevo)
- `src/utils/supabase/publicServer.ts` (nuevo)
- `src/components/ui/ClothingIcon.tsx` (SVG local)
- `src/app/globals.css` (`@font-face` local)
- `src/app/layout.tsx` (sin `<link>` externos)
- `src/app/categories/page.tsx` (uso del SVG)
- `public/fonts/material-symbols-subset.woff2` (nuevo, 36 KB)

## 8. Decisión requerida

Ninguna bloqueante. Confirmar:

1. ¿Aceptas los iconos SVG propios para categorías, o prefieres que se
   licencien los de Flaticon y se sirvan en local?
2. ¿Te parece bien `revalidate = 60` para la portada, o lo quieres más corto
   (p. ej. 10 s) por la frecuencia con la que publicas productos?
