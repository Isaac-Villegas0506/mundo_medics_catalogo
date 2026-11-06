# Seguridad — Fase 1 (Mundo Medics Catálogo)

Este documento acompaña los cambios de la Fase 1 y describe las acciones que
requieren acceso al panel de Supabase (no se pueden automatizar desde el código).

## 1. Pasos obligatorios en Supabase (los hace el dueño)

### 1.1 Desactivar el registro público de cuentas (hallazgo S4)

Si el registro público está activo, cualquier persona puede crear una cuenta y
quedar «autenticada», con lo que las políticas de escritura (`authenticated`)
seguirían siendo alcanzables.

1. Entra a **Supabase Dashboard → tu proyecto → Authentication → Providers → Email**.
2. En **Sign up**, desactiva **"Allow new users to sign up"**.
3. Guarda. Confirma que solo el administrador tenga cuenta:
   **Authentication → Users**. Si hay cuentas que no reconoces, elimínalas.

### 1.2 Aplicar las migraciones (002 RLS + 003 índices)

1. Haz un **respaldo** de la base (Dashboard → Database → Backups, o `pg_dump`).
2. Prueba primero en el proyecto de **desarrollo**.
3. Ejecuta el script consolidado `supabase/RUN_ME_SQL.sql` en **SQL Editor**.
   Incluye la migración 002 (RLS) y la 003 (índices de Fase 4). Es idempotente
   (usa `IF EXISTS` / `IF NOT EXISTS`), así que se puede correr 2 veces sin error.
4. Verifica que no haya errores de sintaxis ni políticas duplicadas.
5. Corre la sección 7 (VERIFICACIÓN) del mismo script y revisa las salidas.

### 1.3 Verificar que la escritura quedó cerrada

Estado verificado el **6 de noviembre de 2026** contra el proyecto
`whsonrlkbmnudwmxpfii` con la llave anónima pública:

| Operación (anon) | Resultado |
|---|---|
| `SELECT` products / categories / settings | ✅ OK (lectura pública) |
| `INSERT` en products | ✅ Bloqueado (código 42501) |
| `UPDATE` sobre una fila real | ✅ Bloqueado (0 filas afectadas) |
| `DELETE` sobre una fila real | ✅ Bloqueado (0 filas afectadas) |

Para repetir la comprobación manualmente, desde la consola del navegador de la
tienda pública (sin sesión):

```js
const { error } = await supabase
  .from('products')
  .insert({ name: 'test', color_name: 'test' });
// Debe devolver error de RLS (código 42501), no insertar.
```

⚠️ Un `UPDATE`/`DELETE` sobre un **id inexistente** no devuelve error aunque RLS
lo bloquee (afecta 0 filas). Para probar de verdad hay que usar una fila real.

Si inserta, las políticas no se aplicaron correctamente.

## 2. Cambios hechos en el código (resumen)

| Hallazgo | Cambio |
|----------|--------|
| S1 | `src/proxy.ts` protege `/admin/*` (redirige a `/login`); `src/app/admin/layout.tsx` re-verifica la sesión en el servidor. |
| S2 | Migración `002_rls_seguridad.sql`: escritura solo para `authenticated` en products, categories, settings y storage. |
| S3 | Clientes Supabase con cookies (`@supabase/ssr`): `src/utils/supabase/client.ts` y `server.ts`. |
| S5 | Se eliminó el número falso de respaldo `1234567890`. El número sale solo de la tabla `settings`; sin número, el botón de WhatsApp queda deshabilitado. |
| S6 | Validación de subidas (tipo/tamaño) en `src/utils/imageUpload.ts`; URL del mapa saneada en `src/utils/mapUrl.ts`. |
| S7 | Cabeceras de seguridad en `next.config.ts`. |

## 3. Pendiente (recomendado, no bloquea esta fase)

- **Content-Security-Policy (CSP) estricta con nonces.** Hoy la app usa muchos
  estilos inline (`style={{...}}`), por lo que una CSP estricta rompería la UI.
  Requiere nonces en `proxy.ts` y mover estilos; se recomienda como fase aparte.
- **Lista explícita de administradores** (tabla `admin_users` + `is_admin()`):
  refuerza S4 si el dueño no quiere depender solo de desactivar el registro.

## 4. Secretos (regla 5 del plan maestro)

- `SUPABASE_SERVICE_ROLE_KEY` y `CLOUDINARY_API_SECRET` **jamás** llevan prefijo
  `NEXT_PUBLIC_` y **nunca** van en el código ni en commits.
- Solo se documentan los **nombres** de variables en `.env.example`.
