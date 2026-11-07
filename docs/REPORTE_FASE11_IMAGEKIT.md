# Reporte — Fase 11: Migración a ImageKit, framer-motion fuera del panel y corrección de errores

Fecha: 7 de noviembre de 2026

---

## 1. Los tres problemas que reportaste

### 1.1 `Stale request` al subir imágenes — **no era un bug del código**

Cloudinary rechazaba cada subida con:

> `Stale request - reported time is 2026-11-06 23:15:13 +0000 which is more than 1 hour ago`

**Causa raíz medida:** el reloj del equipo está **21 h 46 min atrasado**.

| | Hora (UTC) |
|---|---|
| Tu PC | `2026-11-06 23:17` |
| Hora real (cabecera `Date` de Cloudinary, Google y Supabase) | `2026-11-07 21:03` |

Cloudinary firma con un `timestamp` y lo rechaza si difiere más de una hora de su
reloj. El equipo está configurado con **«Origen: Local CMOS Clock» y «sin
sincronizar»** (`w32tm /query /status`).

**No se pudo corregir desde aquí:** `w32tm /resync` devuelve *Acceso denegado
(0x80070005)* porque requiere administrador.

> **Acción tuya (una vez, en PowerShell como administrador):**
> ```powershell
> w32tm /config /manualpeerlist:"time.windows.com,0x9" /syncfromflags:manual /reliable:yes /update
> w32tm /resync /force
> ```
> O en Windows: **Configuración → Hora e idioma → Fecha y hora → Sincronizar ahora**.
>
> **Mientras el reloj siga atrasado, la subida de imágenes fallará** — con
> Cloudinary y también con ImageKit, porque ambos validan la hora.

Además se mejoró el mensaje de error: ahora dice qué hacer en lugar de mostrar
`Stale request` en crudo.

### 1.2 Vercel Analytics daba 404 en local

`/_vercel/insights/script.js` sólo existe en Vercel. Montarlo siempre generaba:

> `Refused to execute script ... MIME type ('text/html') is not executable`

**Corregido:** `<Analytics />` ahora se monta sólo si `process.env.VERCEL === '1'`.
En local ya no hay error en consola.

### 1.3 Errores del panel de administración

Se corrigieron los que **rompían comportamiento** (no sólo estilo):

| Error | Archivo | Corrección |
|---|---|---|
| Llamar funciones antes de declararlas (`Cannot access variable before it is declared`) | `admin/categories`, `admin/featured`, `admin/products`, `admin/products/[id]`, `admin/settings` | El `useEffect` se movió **después** de las funciones que invoca |
| `loadError` usado sin declarar | `admin/products` | Estado declarado + estado de error con **botón Reintentar** |
| `setState` síncrono en efecto | `admin/products`, `admin/settings`, `admin/categories` | La carga inicial ya no reactiva el spinner (arranca en `true`) |
| `<a href="/">` en vez de `Link` | `admin/layout` | Cambiado a `next/link` (navegación interna) |
| Comillas sin escapar en JSX | `admin/settings`, `admin/products/[id]` | Sustituidas por «» |
| Texto decía «Supabase Storage» | `admin/products/[id]` | Actualizado a ImageKit |
| Refs actualizadas durante el render | `components/admin/Reorder` | Movido a `useEffect` |

**Errores restantes: 29**, todos de `@typescript-eslint/no-explicit-any` y
avisos de estilo de React (`setState` en efecto). Son **preexistentes**, no rompen
funcionalidad y tipar todo el panel es un trabajo aparte.

---

## 2. Migración de Cloudinary a ImageKit

### 2.1 Qué se creó

| Archivo | Función |
|---|---|
| `src/utils/imagekit.ts` | Firma HMAC-SHA1 (`createImageKitAuth`) y helper de URLs optimizadas |
| `src/app/api/imagekit/auth/route.ts` | Endpoint que entrega la firma; **401 sin sesión, 403 sin rol de admin** |
| `src/utils/imageUploadClient.ts` | Subida directa navegador → ImageKit |

### 2.2 Qué se eliminó

- `src/utils/cloudinary.ts`
- `src/app/api/cloudinary/sign/route.ts` (verificado: **404**)

### 2.3 Cómo funciona ahora

```
navegador ──POST /api/imagekit/auth──► servidor (verifica sesión + rol)
         ◄── token, expire, signature ──
navegador ──POST upload.imagekit.io/api/v1/files/upload──► ImageKit
         ◄── url ──
```

La clave privada **nunca sale del servidor**. La firma caduca a los 10 minutos.

### 2.4 Configuración

`.env.local` actualizado con tus credenciales:

```
NEXT_PUBLIC_IMAGEKIT_URL_ENDPOINT=https://ik.imagekit.io/vy0hnlrix
NEXT_PUBLIC_IMAGEKIT_PUBLIC_KEY=public_BjbWw+BEV40Ri5M0/wxCNPpKqnU=
IMAGEKIT_PRIVATE_KEY=(privada, no se muestra)
```

`.env.example` documenta las tres variables (sin valores reales).

`next.config.ts`: añadido `ik.imagekit.io` a `remotePatterns`. Se **conservó**
`res.cloudinary.com` para que las imágenes antiguas sigan cargando.

### 2.5 Verificación

| Comprobación | Resultado |
|---|---|
| `POST /api/imagekit/auth` sin sesión | ✅ **401** |
| `POST /api/cloudinary/sign` | ✅ **404** (eliminado) |
| `tsc --noEmit` | ✅ 0 errores |
| `npm run build` | ✅ éxito, `/api/imagekit/auth` compilado |

> **No se probó una subida real** porque (a) requiere sesión de administrador y
> (b) fallaría por el reloj desincronizado. Una vez sincrones la hora, prueba
> subir una imagen desde el panel.

---

## 3. framer-motion eliminado también del panel

Antes quedaba en 4 páginas por `<Reorder>` (arrastrar para ordenar).

### Componente nuevo: `src/components/admin/Reorder.tsx`

Reimplementa `Reorder.Group` y `Reorder.Item` con **Pointer Events nativos**:

- API equivalente, así que las páginas apenas cambiaron.
- Detecta el índice de destino por la posición del puntero.
- Reordena en vivo mientras se arrastra (`onReorder` continuo).
- **No inicia el arrastre** al pulsar botones, enlaces o inputs.
- Resalta la fila que se está moviendo.

Se usó en: `admin/products`, `admin/categories`, `admin/featured` y la galería
de `admin/products/[id]`.

### Resultado

`src/components/MotionProvider.tsx` **eliminado**. Ya **no existe ningún
`import ... from 'motion/react'` en todo el proyecto**.

> `framer-motion` sigue en `package.json` porque Next lo necesita para compilar,
> pero **ya no se incluye en ningún bundle**. Se puede quitar con
> `npm uninstall framer-motion` cuando confirmes que el arrastre funciona.

---

## 4. Verificación general

```
npx tsc --noEmit   → 0 errores
npm run build      → éxito
```

| Ruta | Resultado |
|---|---|
| `/`, `/categories`, `/login` | ✅ 200 |
| `/api/imagekit/auth` (POST sin sesión) | ✅ 401 |
| `/api/cloudinary/sign` | ✅ 404 |
| `/admin` sin sesión | ✅ 307 |

---

## 5. Pendientes y advertencias

1. **Sincronizar el reloj del equipo** (sección 1.1). Sin eso, ninguna subida de
   imágenes funcionará. Es el bloqueo principal.
2. **Ejecutar `004_admin_roles.sql`** en Supabase. El log lo sigue avisando; el
   panel no se bloquea, pero la autorización por rol no está activa.
3. **Probar una subida real** a ImageKit tras sincronizar la hora.
4. **Probar el arrastre** de listas en el panel (productos, categorías,
   destacados y galería) con el componente nuevo.
5. Las imágenes que ya están en Cloudinary **siguen funcionando**; sólo las
   nuevas van a ImageKit.
6. `framer-motion` puede quitarse de `package.json` cuando confirmes el punto 4.

---

## 6. Decisión requerida

1. Sincronizar la hora del equipo (comando en 1.1) y confirmar que la subida
   funciona.
2. ¿Quito `framer-motion` de `package.json` una vez valides el arrastre?
3. ¿Migro también las imágenes antiguas de Cloudinary a ImageKit, o las dejo
   donde están?
