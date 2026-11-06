# Mundo Medics — Catálogo Digital

Catálogo web de indumentaria médica. Los productos se consultan por WhatsApp;
**el catálogo no muestra precios** (decisión DEC-2).

Producción: https://mundo-medics-catalogo.vercel.app

## Stack

| Pieza | Versión |
|---|---|
| Next.js (App Router, Turbopack) | 16.2.9 |
| React | 19.2.4 |
| Tailwind CSS | 4 |
| Supabase (`@supabase/ssr`) | 0.12.x |
| Cloudinary (subida firmada) | — |
| Animaciones | `motion` 12 |
| Despliegue | Vercel |

## Cómo ejecutarlo

```bash
npm install
cp .env.example .env.local   # rellena los valores reales
npm run dev                  # http://localhost:3000
```

```bash
npm run build   # build de producción
npm run start   # servir el build
npx tsc --noEmit
npx eslint .
```

## Variables de entorno

Ver `.env.example`. Reglas:

- Las que empiezan por `NEXT_PUBLIC_` llegan al navegador.
- `CLOUDINARY_API_SECRET` y `SUPABASE_SERVICE_ROLE_KEY` **nunca** llevan
  `NEXT_PUBLIC_` ni se commitean.

## Estructura

```
src/
  app/            rutas (App Router)
    page.tsx      portada — Server Component, datos en paralelo
    CatalogClient.tsx  interacción del catálogo (cliente)
    product/      detalle de producto (servidor + cliente)
    admin/        panel protegido (requiere sesión)
    api/          rutas de servidor (Cloudinary, OG image)
  components/     UI reutilizable
  utils/          Supabase, Cloudinary, caché, validaciones
  proxy.ts        refresco de sesión y protección de /admin (Next 16)
supabase/
  migrations/     migraciones SQL numeradas
docs/             decisiones, reportes por fase y changelog
public/           assets estáticos
```

## Seguridad

- La lectura de datos es pública; **la escritura sólo para usuarios autenticados**
  (RLS `authenticated`).
- `/admin/*` está protegido en `src/proxy.ts` y se re-verifica en el servidor.
- El registro público de Supabase Auth debe estar **desactivado**.
- Detalles y pasos manuales en [`docs/SEGURIDAD.md`](docs/SEGURIDAD.md).

## Documentación

| Archivo | Contenido |
|---|---|
| [`docs/DECISIONES.md`](docs/DECISIONES.md) | Decisiones del dueño (DEC-1 a DEC-12) |
| [`docs/CHANGELOG_OPTIMIZACION.md`](docs/CHANGELOG_OPTIMIZACION.md) | Estado y resumen de cada fase |
| [`docs/RESUMEN_GENERAL.md`](docs/RESUMEN_GENERAL.md) | Reporte consolidado de todas las fases |
| [`docs/SEGURIDAD.md`](docs/SEGURIDAD.md) | RLS, verificación y pasos en Supabase |
| `docs/REPORTE_FASE*.md` | Reporte detallado por fase |
| [`docs/REPORTE_LIGHTHOUSE.md`](docs/REPORTE_LIGHTHOUSE.md) | Análisis de rendimiento |

## Notas de mantenimiento

- **Iconos**: se usa un subconjunto local de Material Symbols
  (`public/fonts/material-symbols-subset.woff2`). Si añades un icono nuevo hay que
  regenerar el subconjunto; el comando está en
  [`docs/REPORTE_FASE5.md`](docs/REPORTE_FASE5.md).
- **Migraciones**: `supabase/migrations/` está numerado. `001` es sólo
  documentación histórica (contiene las políticas RLS antiguas); **no ejecutar**.
