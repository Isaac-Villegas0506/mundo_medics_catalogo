# Reporte — Fase 1 (Seguridad) · Mundo Medics Catálogo

Fecha: 6 de noviembre de 2026 · Rama: `fase-1-seguridad` (6 commits por delante de `main`)

## Resumen

Cerrados los hallazgos de seguridad críticos y altos de la sección 2.1 del plan
(S1, S2, S3, S5, S6, S7). **S4** queda documentado con pasos que requieren acceso
al panel de Supabase y que debe ejecutar el dueño (no es automatizable desde código).

## Qué se hizo

| Hallazgo | Estado | Cambio |
|----------|--------|--------|
| **S1** 🔴 Sin protección de ruta | ✅ Corregido | `src/proxy.ts` redirige `/admin/*` → `/login?next=…`; `src/app/admin/layout.tsx` re-verifica la sesión en el servidor. |
| **S2** 🔴 RLS abierto | ✅ Migración lista | `supabase/migrations/002_rls_seguridad.sql`: escritura solo para `authenticated` en products, categories, settings y storage. |
| **S3** 🟠 Sesión solo en navegador | ✅ Corregido | `@supabase/ssr` con cookies: `src/utils/supabase/client.ts` y `server.ts`. |
| **S4** 🟠 Registro público | ⚠ Acción del dueño | Documentado en `docs/SEGURIDAD.md` (desactivar "Allow new users to sign up"). |
| **S5** 🟠 Número de WhatsApp falso | ✅ Corregido | Se eliminó `1234567890`; el número sale solo de `settings` (hook `useWhatsappNumber`). Sin número, el CTA queda deshabilitado. |
| **S6** 🟡 Subidas y URL del mapa sin validar | ✅ Corregido | `src/utils/imageUpload.ts` (tipo/tamaño) y `src/utils/mapUrl.ts` (solo https de Google Maps). |
| **S7** 🟡 Cabeceras de seguridad | ✅ Corregido | `next.config.ts`: nosniff, frame-options, referrer-policy, HSTS, permissions-policy. |

## Verificación

- `npx tsc --noEmit` → **sin errores** (exit 0).
- `npm run build` → **éxito**. Se confirma `ƒ Proxy (Middleware)` y las rutas `/admin/*` como dinámicas (protegidas en servidor).
- Prueba con servidor de producción:
  - `/admin` → **307** a `/login?next=%2Fadmin`
  - `/admin/products` → **307** a `/login?next=%2Fadmin%2Fproducts`
  - `/login` (sin sesión) → **200**
  - `/` → **200**

## Acciones pendientes del dueño (no automatizables)

1. **Desactivar el registro público** en Supabase Auth (pasos en `docs/SEGURIDAD.md`).
2. **Aplicar `supabase/migrations/002_rls_seguridad.sql`** primero en desarrollo, con respaldo previo.
3. Verificar que la escritura esté cerrada (query de prueba incluida en el documento).

## Notas y desviaciones

- **El plan maestro está truncado** (solo llega a la sección 3): faltan la sección 4
  (librerías permitidas), la sección 5 (fases/tareas/criterios) y los anexos A–D.
  Se trabajó con el diagnóstico 2.1 y criterios propios, como acordó el dueño.
- **Lint:** persisten **50 errores pre-existentes** (29 `no-explicit-any`, 9 variables
  usadas antes de declararse, 7 entidades sin escapar, 4 `setState` en effect, 1
  `no-html-link-for-pages`) y 50 warnings. Son deuda técnica (T1) y de otras fases;
  **esta fase no introdujo errores nuevos**.
- **CSP estricta** (con nonces) queda pendiente: hoy los estilos inline `style={{…}}`
  se romperían. Recomendada como fase aparte (ver `docs/SEGURIDAD.md`).
- La **Fase 0 sigue a medio terminar** (los `Untitled-1/2.txt` siguen versionados y
  los 8 SQL sueltos de la raíz siguen ahí); no se tocó para no mezclar fases.

## Decisiones registradas

- `DEC-11`: instalar `@supabase/ssr`.
- `DEC-12`: RLS de escritura solo para `authenticated`.
