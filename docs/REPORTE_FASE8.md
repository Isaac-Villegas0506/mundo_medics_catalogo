# Reporte — Fase 8 (Seguridad, SEO y accesibilidad)

Fecha: 6 de noviembre de 2026
Rama base: `main` (ya contiene las fases 0–7)
Rama de trabajo: `fase-8-seguridad-seo`

Basado en la sección 12 del Plan Maestro y en las secciones 3 y 4 del
Plan de Continuidad v2.0.

---

## Resumen

| Área | Estado |
|---|---|
| Autorización administrativa por rol | ⚠️ **Requiere ejecutar la migración 004** |
| Protección de rutas en servidor | ✅ Verificada |
| Endpoints y Server Actions | ✅ Protegidos (401 / comprobación de rol) |
| Secretos en el cliente | ✅ Ninguno |
| Sitemap y robots | ✅ Nuevos |
| Metadatos y canonical | ✅ Añadidos |
| Precios en datos públicos | ✅ Cero |
| Accesibilidad de botones | ✅ Auditada |

---

## 1. El hueco de seguridad real: autenticado ≠ administrador

### Diagnóstico

Antes de esta fase, **cualquier usuario autenticado era administrador**:

- Las políticas RLS daban escritura al rol `authenticated`.
- El panel solo comprobaba que hubiera sesión (`supabase.auth.getUser()`).
- **No existía ninguna tabla de roles**: verificado contra la base real,
  las únicas tablas eran `categories`, `products` y `settings`.

En la práctica hoy solo hay una cuenta (`admin@mundomedics.com`), pero si el
registro público se reactivara por error, cualquiera podría crear una cuenta
y administrar el catálogo.

### Solución

Nueva migración **`supabase/migrations/004_admin_roles.sql`**:

| Elemento | Función |
|---|---|
| Tabla `admin_users` | Lista explícita de quién puede administrar. RLS: ningún acceso público. |
| Función `is_admin()` | `SECURITY DEFINER`; consulta la lista para `auth.uid()`. |
| Políticas de escritura | Pasan de `TO authenticated` a `public.is_admin()`, en products, categories, settings y storage. |

Y en el código:

- `src/app/admin/layout.tsx`: comprueba `admin_users` en el servidor. Si el
  usuario no está en la lista, muestra una página de "sin permiso" (no lo
  redirige a `/login`, que provocaría un bucle porque su sesión sí es válida).
- `src/app/admin/actions.ts`: la Server Action `revalidateCatalog()` exige
  además ser administrador, no solo tener sesión.

> ⚠️ **ACCIÓN REQUERIDA:** la migración **no se ha ejecutado**. Mientras no se
> ejecute, el sistema sigue como antes (cualquier autenticado puede escribir)
> y el panel avisa por consola. Hasta que se aplique, la protección por rol
> **no está activa en la base**.

---

## 2. Verificaciones de seguridad ejecutadas

| Comprobación | Método | Resultado |
|---|---|---|
| `/admin` sin sesión | Petición HTTP | ✅ 307 → `/login?next=…` |
| `/api/cloudinary/sign` sin sesión | `POST` | ✅ **401** |
| Secretos en chunks del cliente | Búsqueda de `CLOUDINARY_API_SECRET`, `SERVICE_ROLE`, `sbp_`, `api_secret` en todos los JS servidos | ✅ **Ninguno** |
| `NEXT_PUBLIC_*` con valores sensibles | Revisión de `.env.example` | ✅ Solo URL, anon key (pública por diseño) y cloud name |
| Server Action `revalidateCatalog` | Lectura del código | ✅ Exige sesión **y** rol |
| Escritura anónima en la base | Prueba real con la llave pública (Fase 1) | ✅ Bloqueada (42501) |

### Nota sobre RLS

Las políticas actuales (migración 002) están aplicadas y verificadas:
lectura pública, escritura solo `authenticated`. La migración 004 las endurece
a `is_admin()`. **No se ejecutó** para no tocar producción sin respaldo ni
aprobación explícita, tal como exige el plan.

---

## 3. SEO (12.2)

### Archivos nuevos

| Archivo | Contenido |
|---|---|
| `src/app/sitemap.ts` | Sitemap dinámico: portada, `/categories` y una entrada por producto real. Excluye `/admin` y `/login`. |
| `src/app/robots.ts` | `Allow: /` con `Disallow` de `/admin`, `/login` y `/api/`. Declara el sitemap. |

Verificado en ejecución:

```
GET /sitemap.xml  → 200, incluye los productos reales (ids de la base)
GET /robots.txt   → 200, con Disallow correcto y Sitemap declarado
```

### Metadatos por producto

- `canonical` añadido a cada ficha, para que `?ref=wa2` y otros parámetros no
  generen URLs duplicadas en los buscadores.
- Descripción con respaldo legible cuando el producto no tiene una.
- Producto inexistente: `robots: noindex, nofollow`.
- Panel de administración: `noindex, nofollow, nocache`.

### Sin precios ni datos inventados

| Comprobación | Resultado |
|---|---|
| Menciones de `price` en el código | **0** |
| Menciones de `S/` en el código | **0** |
| Precios en sitemap / metadatos / JSON-LD | **Ninguno** |
| Disponibilidad, reseñas o valoraciones inventadas | **Ninguna** |

No se añadió JSON-LD de producto con precios ni `aggregateRating`: no hay datos
reales que los respalden y el plan lo prohíbe expresamente.

---

## 4. Accesibilidad (12.3)

| Punto | Estado |
|---|---|
| Botones de sólo icono con `aria-label` | ✅ Auditoría automática: **0 hallazgos** |
| Foco visible | ✅ Anillos `focus:` en formularios |
| Cierre con `Escape` | ✅ En el nuevo visor de imagen |
| Navegación por teclado en el visor | ✅ Flechas ← → y Escape |
| `prefers-reduced-motion` | ✅ Respetado (Fase 6) |
| Áreas táctiles | ✅ ≥44 px en acciones principales |
| Textos alternativos | ✅ Todas las imágenes |
| Etiquetas de formulario | ✅ `label htmlFor` en login y panel |

---

## 5. Cambios de la petición del dueño (esta sesión)

Aparte del plan, se atendieron tres peticiones concretas:

### 5.1 Botones que se perdían al final del modal — causa raíz encontrada

El pie con "Ver detalles completos" y "Consultar" era **`absolute bottom-0`**:
flotaba **encima** del contenido en lugar de ocupar su propio espacio. Por eso
tapaba el final de la ficha y quedaba pegado al borde.

Se reestructuró el modal a un **flexbox real**:

```
motion.div  (flex flex-col)
├── div  (flex-1 min-h-0 overflow-y-auto)   ← contenido desplazable
└── div  (shrink-0)                          ← pie de acciones, siempre visible
```

El pie ahora es un hermano real: nunca se superpone y siempre queda visible.
Se eliminó el relleno artificial `pb-modal-actions` que ya no hace falta.

### 5.2 Ver la foto a pantalla completa

Nuevo componente **`src/components/ui/ImageLightbox.tsx`**, conectado tanto al
modal de producto como a la página de detalle. Al pulsar la imagen se abre a
pantalla completa con fondo negro.

### 5.3 Zoom sobre la foto

Dentro del visor:

| Gesto | Acción |
|---|---|
| Un toque / clic | Acerca en ese punto (y otro lo deshace) |
| Doble toque / doble clic | Alterna entre 1× y 2.5× |
| Pellizcar con dos dedos | Zoom continuo (1× a 4×) |
| Rueda del ratón | Zoom progresivo |
| Arrastrar con zoom | Desplaza la imagen (con límites) |
| Deslizar sin zoom | Cambia de foto |
| Escape / botón ✕ | Cierra |

Implementado **con Pointer Events nativos, sin ninguna librería nueva**. El
desplazamiento está acotado para que la imagen no se pierda fuera de pantalla,
y se reinicia el zoom al cambiar de foto.

---

## 6. Pruebas ejecutadas

```
npx tsc --noEmit   → 0 errores
npm run build      → éxito (sitemap.xml y robots.txt generados)
```

| Ruta | Esperado | Obtenido |
|---|---|---|
| `/` | 200 | ✅ 200 |
| `/categories` | 200 | ✅ 200 |
| `/favorites` | 200 | ✅ 200 |
| `/login` | 200 | ✅ 200 |
| `/sitemap.xml` | 200 | ✅ 200 |
| `/robots.txt` | 200 | ✅ 200 |
| `/admin` | 307 | ✅ 307 |
| `/ruta-x` | 404 | ✅ 404 |
| `/product` | 404 | ✅ 404 |
| `/api/cloudinary/sign` (POST) | 401 | ✅ 401 |

| Comprobación de interfaz | Resultado |
|---|---|
| Botón "Ver imagen ampliada" en ficha | ✅ presente |
| Icono `zoom_in` en el subconjunto de iconos | ✅ regenerado (43 iconos) |
| `canonical` en ficha de producto | ✅ presente |
| Secretos en JS del cliente | ✅ ninguno |

---

## 7. Limitaciones y pendientes

1. **La migración 004 NO está ejecutada.** Es el punto más importante: sin ella,
   la autorización por rol no existe en la base. Requiere respaldo previo y que
   el correo del dueño esté en `admin_users`.
2. **Sin navegador real**: el zoom, el pellizco y los gestos están probados a
   nivel de código y tipos, **no con dedos en una pantalla**. Hay que probarlo en
   un móvil.
3. **No se probó el panel con sesión**: no hay credenciales en el entorno.
4. Las pruebas con lector de pantalla no se realizaron.

---

## 8. Pruebas que debe hacer el dueño

| # | Prueba |
|---|---|
| 1 | Ejecutar `supabase/migrations/004_admin_roles.sql` (con respaldo) y confirmar que sigue entrando al panel |
| 2 | Abrir un producto y comprobar que los botones ya no tapan el contenido |
| 3 | Pulsar la foto y ver el visor a pantalla completa |
| 4 | En el móvil: doble toque para zoom y pellizcar |
| 5 | Deslizar sin zoom para cambiar de foto dentro del visor |
| 6 | Cambiar el número de WhatsApp en Ajustes y ver que se refleja |
| 7 | Revisar `/sitemap.xml` y `/robots.txt` en producción |

---

## 9. GitHub y Vercel

| Aspecto | Estado |
|---|---|
| `main` | Actualizado con las fases 0–7 (`971acfa`) |
| Rama de esta fase | `fase-8-seguridad-seo` |
| Vercel | Debe redesplegar `main`; **verificar en el panel de Vercel** |
| Commit desplegado | Pendiente de confirmar tras el push |

---

## 10. Decisión requerida

1. **Ejecutar la migración 004** (autorización por rol). Es la única forma de
   cerrar el hueco de "autenticado = administrador".
2. Confirmar que el correo en `admin_users` es el correcto.
3. Probar el zoom en un móvil real.
