# Reporte — Fase 2 (imágenes / Cloudinary) · Mundo Medics Catálogo

Fecha: 6 de noviembre de 2026 · Rama: `fase-2-cloudinary` (parte de `fase-1-seguridad`)

## Resumen

Las subidas de imágenes del panel de administración ahora van a **Cloudinary**
(CDN + optimización) en lugar de Supabase Storage. La subida es **directa y
firmada**: el navegador publica el archivo a Cloudinary, pero la firma la genera
el servidor usando `CLOUDINARY_API_SECRET`, que **nunca sale del servidor**.

## Qué se hizo

| Pieza | Detalle |
|-------|---------|
| `src/app/api/cloudinary/sign/route.ts` | Firma los parámetros de subida (SHA1 + secret). Solo responde a **usuarios autenticados** (401 sin sesión). |
| `src/utils/cloudinary.ts` | `uploadToCloudinary(file)`: pide la firma y publica el archivo directo a Cloudinary; devuelve `secure_url`. |
| Editor de productos | Sube las fotos a Cloudinary (antes `supabase.storage`). |
| Ajustes (mapa) | Sube la foto del mapa a Cloudinary. |
| `next.config.ts` | Agrega `res.cloudinary.com` a `images.remotePatterns`. |
| `.env.local` | Credenciales (gitignored, no se versionan). |
| `.env.example` | Nombres de variables con valores de ejemplo (sin secretos reales). |

## Seguridad

- `CLOUDINARY_API_SECRET` y `CLOUDINARY_API_KEY` **no** llevan prefijo `NEXT_PUBLIC_`
  y solo se leen en el servidor (regla 5 del plan).
- La ruta de firma exige sesión de Supabase (la misma protección de `/admin`).
- El navegador recibe `api_key`, `timestamp`, `signature` y `folder`, pero **nunca
  el secret**.

## Verificación

- `npx tsc --noEmit` → sin errores.
- `npm run build` → éxito (ruta `/api/cloudinary/sign` registrada).
- `POST /api/cloudinary/sign` sin sesión → **401** (protección funcionando).

## Cómo probar

1. Entra a http://localhost:3000/login e inicia sesión.
2. Ve a **Admin → Productos → editar/añadir producto** y sube una imagen.
3. La imagen debe subir y quedar con una URL `https://res.cloudinary.com/dfomo8owm/...`.
4. En **Ajustes**, la foto del mapa también sube a Cloudinary.

## Pendiente (siguientes fases)

- **Migrar imágenes existentes** (Supabase Storage y `lh3.googleusercontent.com`)
  a Cloudinary: requiere acceso a la base (service role) y un script de migración.
- **Optimización de entrega** (loader de Cloudinary con `f_auto/q_auto/w_`, y
  convertir `<img>` → `next/image` en logo, categorías, miniaturas y mapa): encaja
  en la **Fase 3 (velocidad)**, junto con los hallazgos R4/R5.

## Nota

Las ramas quedaron separadas por fase: `fase-1-seguridad` (Fase 1) y
`fase-2-cloudinary` (Fase 1 + Fase 2, que depende de la autenticación de la 1).
