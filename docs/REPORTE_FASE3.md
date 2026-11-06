# Reporte — Fase 3 (velocidad en celular) · Mundo Medics Catálogo

Fecha: 6 de noviembre de 2026 · Rama: `fase-3-velocidad`

## Resumen

Primera tanda de mejoras de rendimiento móvil, enfocada en la portada (la vista
más visitada) y en el primer pintado (LCP).

## Qué se hizo

| Hallazgo | Cambio |
|----------|--------|
| **R1** 🔴 3 consultas seguidas | `page.tsx` ahora lanza categorías, productos y ajustes en **paralelo** (`Promise.all`) en lugar de una tras otra. |
| **R2** 🔴 animación con retraso acumulado + re-montaje al buscar | Retardo de animación de tarjetas limitado a `Math.min(index, 8) * 0.05` (máx. 0.4 s); la grilla ya **no** se re-monta al escribir (se quitó `searchQuery` de la `key`); búsqueda con **debounce de 250 ms** en `TopAppBar`. |
| **R4** 🟠 imagen LCP perezosa | `priority` en la primera imagen de producto (la que marca el LCP). |
| **R13** 🟡 notch/barra de gestos | `viewport-fit=cover` (export `viewport` en `layout.tsx`) y utilidades `.pb-safe`/`.pt-safe` definidas en `globals.css`. |

## Verificación

- `npx tsc --noEmit` → sin errores.
- `npm run build` → éxito.
- Dev server en http://localhost:3000 recargó los cambios sin reiniciar.

## Pendiente (mismas o siguientes fases)

- **R3** 🟠 Fuentes/íconos externos que bloquean el pintado (Material Symbols y
  Flaticon desde CDN). La migración a `lucide-react` (DEC-5) es su propia tarea.
- **R4** (resto): logo `logomundomedics.png` (120 KB a 44 px) y otras `<img>` a
  `next/image`.
- **R5** 🟠 Guía de tallas `medidas1.svg` de 1,3 MB (optimizar/exportar).
- **R6** 🟠 `backdrop-blur` repetido (favoritos, cabecera, barra inferior).
- **R7** 🟠 Lista con `select('*')` sin paginar (requiere que el modal cargue el
  producto completo por separado).
- **R8** 🟠 `ProductModal`: hasta 3 consultas + parallax.
- **R10** 🟠 `/categories` descarga todos los productos para la portada.
- **R11** 🟠 Página de producto con `?id=` (sin URL amigable ni caché CDN).
- **R12** 🟡 `motion` completo + `next-themes` sin botón de modo oscuro.
- **R14/R15** 🟡 Región del proyecto Supabase/Vercel y pausa del plan gratuito.

## Nota

Ramas por fase: `fase-0-preparacion` → `fase-1-seguridad` → `fase-2-cloudinary`
→ `fase-3-velocidad`. `main` no se toca; los despliegues de Vercel salen de ahí.
