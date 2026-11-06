# Reporte — Fase 9 (Rendimiento, estabilidad y dispositivos económicos)

Fecha: 6 de noviembre de 2026

> **Este informe contiene mediciones reales.** Se ejecutó Lighthouse 13.6 con
> Chrome headless sobre el build de producción (`npm run build && npm run start`),
> no sobre el servidor de desarrollo. Nada aquí es estimado.

---

## 1. Cómo se midió

| Aspecto | Valor |
|---|---|
| Herramienta | Lighthouse **13.6.0** (instalado localmente) |
| Navegador | Chrome headless real (`chrome.exe`) |
| Servidor | `npm run start` (build de producción) |
| URL | `http://localhost:3000/` |
| Emulación | Móvil por defecto de Lighthouse (CPU ×4, red lenta) y escritorio |
| Repeticiones | 3 corridas; se reporta la **mediana** para evitar ruido |

> **Nota sobre el hardware:** el equipo es un Intel i5-8265U a 1.6 GHz. Lighthouse
> móvil emula 4× de ralentización sobre esa base, así que las cifras son
> pesimistas frente a un servidor real con CDN (Vercel) y frente a un móvil
> moderno. Aun así **las cifras son las medidas**, sin maquillar.

---

## 2. Resultados medidos

### Escritorio

| Métrica | Valor | Objetivo | Estado |
|---|---|---|---|
| **Performance** | **100** | — | ✅ |
| FCP | 0.2 s | — | ✅ |
| **LCP** | **0.8 s** | ≤ 2.5 s | ✅ |
| **TBT** | **0 ms** | — | ✅ |
| CLS | 0 | ≤ 0.1 | ✅ |
| Speed Index | 0.6 s | — | ✅ |
| Accessibility | 96 | — | ✅ |
| Best Practices | 100 | — | ✅ |
| SEO | 92 | — | ⚠️ |

### Móvil (mediana de 3 corridas)

| Métrica | Valor | Objetivo | Estado |
|---|---|---|---|
| **Performance** | **69** | — | ⚠️ |
| FCP | 0.77 s | — | ✅ |
| **LCP** | **3.53 s** | ≤ 2.5 s | ❌ |
| **TBT** | **937 ms** | — | ❌ |
| CLS | **0.000** | ≤ 0.1 | ✅ |
| Speed Index | 2.25 s | — | ✅ |

Corridas individuales: `perf=69 (LCP 3.53s, TBT 993ms)`, `perf=66 (4.05s, 937ms)`,
`perf=72 (3.44s, 786ms)`.

---

## 3. Qué se mejoró en esta fase

### 3.1 Modales cargados bajo demanda

`ProductModal` (17 usos de motion) y `LocationModal` viajaban en el bundle
inicial de la portada aunque **solo se abren al pulsar**. Ahora usan
`next/dynamic` con `ssr: false`.

| Métrica | Antes | Después |
|---|---|---|
| TBT móvil | 950 ms | **610 ms** en la medición puntual intermedia |
| Performance móvil | 69 | 75 (en esa misma corrida) |

> La mediana de las 3 corridas posteriores fue 69. El ruido entre corridas es
> alto (±4 puntos), así que la mejora del TBT **no es concluyente** con este
> hardware. Lo honesto es decir que el cambio reduce el JS inicial
> (812 KiB frente a 827 KiB, **−14.7 KiB**) y que el TBT medido oscila.

### 3.2 Vercel Web Analytics activado

- Instalado `@vercel/analytics` (única dependencia nueva, justificada por el
  punto 4.5 del plan).
- `<Analytics />` montado en el layout raíz.
- No requiere configuración extra: Vercel lo activa y sirve en producción.
- No usa cookies de seguimiento ni recoge datos personales.

### 3.3 Diagnóstico del LCP móvil: no era un bug

La auditoría `lcp-discovery-insight` marcaba tres fallos. Verificado el HTML
servido, **el atributo sí estaba**:

```html
<img alt="Conjunto San Martin" fetchPriority="high" loading="eager" ... />
```

Mi primera comprobación falló porque buscaba `fetchpriority` en minúsculas y
React lo emite en camelCase. El LCP está correctamente priorizado y
descubrible; sus 3.5 s en móvil se deben al **coste de ejecución**, no a un
fallo de descubrimiento.

---

## 4. El problema real: `framer-motion` en el bundle inicial

### Evidencia medida

| Auditoría | Hallazgo |
|---|---|
| `bootup-time` | **1200 ms** en un único chunk (`2z89payh4ix2o.js`, 227 KB) |
| `mainthread-work-breakdown` | Script Evaluation: **1688 ms** |
| `long-tasks` | Ese mismo chunk + `Unattributable` (963 ms) |

Ese chunk contiene el runtime de animaciones. La portada monta:

| Componente | Usos de motion | Se abre al cargar |
|---|---|---|
| `CatalogClient` | 12 | Sí |
| `TopAppBar` | 7 | Sí |
| `BottomNav` | 1 | Sí |
| `MotionProvider` | 1 | Sí |
| `ProductCard` | 0 (ya es CSS) | Sí |

**Causa:** `MotionProvider` (`<MotionConfig reducedMotion="user">`) es necesario
para respetar `prefers-reduced-motion` (Fase 6), pero obliga a cargar el runtime
completo de motion en la primera visita.

### Por qué NO se resolvió en esta fase

Quitarlo exige reescribir a CSS puro los ~20 usos de `motion.*` de la portada
(TopAppBar, BottomNav, CatalogClient). Eso es:

- Un cambio de **comportamiento visual**, que el plan prohíbe sin propuesta.
- Alto riesgo de romper animaciones que hoy funcionan.
- No solicitado en el encargo de esta fase.

**Propuesta concreta medida para la Fase 10:**

1. Sustituir las animaciones de `TopAppBar` y `BottomNav` por transiciones CSS
   (son las más simples: rotación de icono, altura del buscador, sidebar).
2. Mantener `motion` **solo** en `ProductModal` y `LocationModal`, que ya se
   cargan bajo demanda.
3. Quitar `MotionProvider` del layout raíz y moverlo dentro de esos modales,
   donde sí se necesita.
4. **Impacto estimado:** el chunk de 227 KB y sus ~1200 ms de bootup saldrían
   del camino crítico. Es la única vía realista para llevar el TBT móvil por
   debajo de 200 ms.

> No presento esto como hecho porque no está implementado. Es una propuesta con
> su justificación de medición.

---

## 5. Objetivos frente a la realidad

| Métrica | Objetivo | Escritorio | Móvil | Cumple |
|---|---|---|---|---|
| LCP | ≤ 2.5 s | 0.8 s | 3.53 s | Escritorio sí, móvil no |
| INP | ≤ 200 ms | — | — | **No medido** (ver abajo) |
| CLS | ≤ 0.1 | 0 | 0.000 | ✅ ambos |

### Sobre INP

**No se midió INP.** Lighthouse de laboratorio no lo calcula (requiere
interacción real del usuario). El TBT es su mejor aproximación de laboratorio.
Los datos de campo de INP solo estarán disponibles en Vercel Speed Insights /
CrUX tras acumular tráfico real. **No se declara que el sitio cumple INP.**

### Sobre Core Web Vitals de campo

El plan lo advierte y lo respeto: **una prueba de laboratorio no son datos de
campo**. No hay tráfico suficiente para afirmar nada sobre el percentil 75 de
usuarios reales.

---

## 6. Comparación con la línea base

| Indicador | Línea base | Ahora | Cómo se obtuvo |
|---|---|---|---|
| JS inicial (comprimido) | 827 KiB | **812.3 KiB** | Medido con `Accept-Encoding` sobre los chunks servidos |
| CLS escritorio | — | **0** | Lighthouse |
| CLS móvil | — | **0.000** | Lighthouse |
| LCP escritorio | — | **0.8 s** | Lighthouse |
| LCP móvil | — | **3.53 s** | Mediana de 3 corridas |
| TBT móvil | — | **937 ms** | Mediana de 3 corridas |
| Recargas completas al navegar | Sí (`window.location.href`) | **No** | Corregido en Fase 7 |
| Consultas duplicadas | Sí | **No** (primera página del servidor) | Corregido en Fase 5 |

> La línea base de Lighthouse **no existe**: la Fase 0 nunca ejecutó una medición
> real. No invento una cifra de partida. Lo que sí está medido es la línea base
> de peso (827 KiB) y las métricas actuales.

---

## 7. Archivos modificados

| Archivo | Cambio |
|---|---|
| `src/app/CatalogClient.tsx` | `ProductModal` y `LocationModal` con `next/dynamic` |
| `src/app/layout.tsx` | `<Analytics />` de Vercel |
| `package.json` | `@vercel/analytics` añadido |

Archivos de medición (temporales, no rastreados): `lh-desktop.json`,
`lh-mobile.json`, `lh-run1..3.json`, `lh-summary.json`, `measure.cjs`.

---

## 8. Pruebas ejecutadas

```
npx tsc --noEmit   → 0 errores
npm run build      → éxito
npx lighthouse …   → 4 ejecuciones (1 escritorio + 3 móvil) sobre producción
```

| Comprobación | Resultado |
|---|---|
| Rutas `/`, `/categories`, `/favorites`, `/login` | ✅ 200 |
| `/sitemap.xml`, `/robots.txt` | ✅ 200 |
| `/admin` sin sesión | ✅ 307 |
| Modales siguen abriendo (import dinámico) | ✅ compilado y servido |
| Analytics montado | ✅ compila sin errores |

---

## 9. Limitaciones

1. **Hardware modesto**: i5-8265U a 1.6 GHz. Las cifras móviles son pesimistas
   frente a Vercel con CDN.
2. **Varianza alta** entre corridas (±4 puntos de performance, ±180 ms de TBT):
   la mediana es más fiable que una corrida suelta.
3. **INP no medido** (requiere interacción real).
4. **Sin datos de campo**: no hay suficiente tráfico para CrUX.
5. **No se midió PageSpeed Insights** (requiere URL pública con tráfico; el
   proyecto desplegado no refleja aún estos cambios).
6. **No hay navegador interactivo** para probar gestos o foco: Lighthouse sí se
   ejecutó, pero no sustituye una prueba manual.

---

## 10. Publicación gradual (13.4)

| Paso | Estado |
|---|---|
| 1. Aprobar PR | ⏳ Pendiente del dueño (todo está en `main`) |
| 2. Desplegar Preview | ⏳ Vercel redespliega `main` automáticamente |
| 3. Probar rutas críticas | ✅ En local |
| 4. Probar WhatsApp | ⚠️ Requiere número real en producción |
| 5. Probar Analytics | ⏳ Solo funciona en Vercel, no en local |
| 6. Probar panel | ⚠️ Requiere credenciales |
| 7. Revisar logs | ⏳ |
| 8. Publicar | ⏳ |
| 9. Vigilar errores | ⏳ |
| 10. Rollback listo | ✅ `main` en `1598750`, anterior `8c61e36` |

### Rollback

```bash
# Volver al commit anterior a esta fase
git revert --no-commit HEAD
git commit -m "revert: Fase 9"
git push origin main
```

O en Vercel: Deployments → elegir el despliegue anterior → **Promote to Production**.

---

## 11. Decisión requerida

1. **¿Apruebas la propuesta de eliminar `framer-motion` del camino crítico?**
   (sección 4). Es la única vía medida para bajar el TBT móvil de 937 ms.
2. **Repetir Lighthouse contra la URL de Vercel** una vez desplegado: con CDN y
   compresión Brotli las cifras serán mejores y son las que cuentan.
3. **Activar Vercel Speed Insights** si quieres datos de campo reales de INP.
