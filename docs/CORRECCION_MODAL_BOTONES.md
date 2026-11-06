# Corrección — Posicionamiento de los botones del modal de producto

Fecha: 6 de noviembre de 2026

---

## Problema reportado

Los botones «Ver detalles completos» y «Consultar» quedaban **pegados al borde
inferior** del modal, parcialmente cortados, y la distribución vertical no era
correcta.

---

## Causa raíz encontrada

No era un problema de márgenes ni del Flexbox del modal (ese ya estaba bien).
Eran **dos defectos concretos**:

### 1. `pb-safe` pisaba el relleno del pie

El pie tenía esta combinación:

```
py-4  pb-safe  md:pb-6
```

`.pb-safe` está definido en `src/app/globals.css` como:

```css
.pb-safe { padding-bottom: env(safe-area-inset-bottom); }
```

Esa regla se declara **más tarde** en el CSS compilado que las utilidades de
Tailwind, así que **gana la batalla de especificidad** y sustituye todo el
`padding-bottom`.

| Regla | Posición en el CSS compilado |
|---|---|
| `.py-4` | 39 862 |
| `.md:pb-6` | 75 399 |
| **`.pb-safe`** | **86 862** ← gana |

Consecuencia: el `padding-bottom` real quedaba en
`env(safe-area-inset-bottom)`, que vale **0 px en escritorio y en la mayoría de
Android**. El pie se quedaba sin relleno inferior y los botones tocaban el borde.

> Lo confirmé midiendo las posiciones de las reglas dentro del CSS servido, no
> por suposición.

### 2. Texto largo sin `min-w-0`

En móviles estrechos, «Ver detalles completos» no tenía permiso para encogerse
(`min-w-0`), así que el texto podía desbordar su mitad del pie.

---

## Corrección aplicada

### `.pb-safe` → `.pb-modal-footer` (utilidad nueva y aditiva)

```css
.pb-modal-footer {
  padding-bottom: calc(16px + env(safe-area-inset-bottom));
}

@media (min-width: 768px) {
  .pb-modal-footer {
    padding-bottom: 24px;
  }
}
```

La diferencia clave: **suma** el relleno base más la zona segura, en lugar de
reemplazarlo. Así hay separación real respecto al borde en todos los
dispositivos, y en iPhone se respeta además el home indicator.

Aplicado al pie como `pt-4 pb-modal-footer` (se eliminó `py-4 pb-safe md:pb-6`).

### Distribución del pie

| Antes | Ahora |
|---|---|
| `px-5 md:px-6 py-4 pb-safe md:pb-6` | `px-4 md:px-6 pt-4 pb-modal-footer` |
| Botones sin `min-w-0` | `flex-1 min-w-0` + `text-center leading-tight` |
| Texto `text-sm` fijo | `text-[13px] md:text-sm` |
| `gap-3` | `gap-2.5 md:gap-3` (más holgura en móvil estrecho) |

### Altura del modal

Se sustituyó `svh`/`vh` por `dvh`, más fiable con las barras del navegador móvil:

```
max-h-[calc(100dvh-24px)] md:max-h-[calc(100dvh-96px)]
h-[92dvh] md:h-[82dvh]
```

Esto garantiza que el modal **nunca** supere el alto visible de la pantalla, que
es la condición para que el pie no quede fuera del área visible.

### Lo que NO se tocó

Respetando las restricciones del encargo:

- No se rediseñó el modal.
- Colores, tipografías, bordes, sombras e iconos: **sin cambios**.
- Funcionalidad de ambos botones: **sin cambios** (mismos `href`, mismo
  comportamiento).
- Carrusel de imágenes, selector de tallas y selector de colores: **intactos**.
- Ningún otro componente modificado.

---

## Verificación

### Cálculo del espacio en seis tamaños de pantalla

Modelo: alto del modal = `min(alto×0.92, alto−24)` en móvil y
`min(alto×0.82, alto−96)` en escritorio; pie = `pt-4 + h-12 + pb + borde`.

| Escenario | Alto pantalla | Modal | Pie | Contenido | Botones |
|---|---|---|---|---|---|
| Móvil pequeño (iPhone SE) | 568 | 523 | 81 | 442 | ✅ caben (texto en 2 líneas) |
| Móvil estándar (Android) | 844 | 776 | 81 | 695 | ✅ caben |
| iPhone con home indicator | 844 | 776 | 115 | 661 | ✅ caben (safe-area sumada) |
| Tablet | 1180 | 968 | 89 | 879 | ✅ caben |
| Escritorio | 900 | 738 | 89 | 649 | ✅ caben |
| Escritorio bajo (1366×768) | 768 | 630 | 89 | 541 | ✅ caben |

**En todos los escenarios el pie cabe dentro del modal.** El `padding-bottom` en
escritorio pasa de **0 px** (el bug) a **24 px**.

### Ancho del texto en móvil pequeño

Con 320 px de ancho: cada botón dispone de ~139 px. «Ver detalles completos» no
cabe en una línea a 13 px, pero ahora `min-w-0` + `text-center` + `leading-tight`
lo reparte en dos líneas centradas **dentro** del botón de 48 px de alto, sin
recortarse ni desbordar.

### Comprobaciones ejecutadas

```
npx tsc --noEmit   → 0 errores
npm run build      → éxito
```

| Comprobación | Resultado |
|---|---|
| `.pb-modal-footer` presente en el CSS compilado | ✅ |
| Su `@media (min-width: 768px)` presente | ✅ |
| `pb-safe` eliminado del pie | ✅ (0 apariciones en el archivo) |
| `pb-modal-footer` en el chunk servido | ✅ |
| Un solo pie en el modal (sin duplicados) | ✅ |
| Un solo «Ver detalles completos» | ✅ |
| `min-w-0` en ambos botones | ✅ |
| `calc(100dvh` en el alto del modal | ✅ |

---

## Limitación honesta

**No hay navegador con renderizado real en este entorno** (ni Playwright ni
Puppeteer), así que no pude tomar capturas ni medir píxeles en pantalla. La
verificación es de:

- CSS compilado y su orden de especificidad (la causa raíz del bug).
- Cálculo de alturas con los valores reales del código.
- HTML y chunks servidos.

**Queda pendiente la comprobación visual** en tu móvil y en escritorio, que es
justamente el criterio de aceptación que pediste. Abre `http://localhost:3000`,
pulsa un producto y revisa que el pie tiene aire abajo.

---

## Cómo comprobarlo en 20 segundos

1. Abre `http://localhost:3000` (ya está corriendo).
2. Pulsa cualquier producto.
3. Mira el pie: debe haber **separación visible** entre los botones y el borde.
4. En Chrome, abre DevTools → modo dispositivo → elige «iPhone SE».
5. Repite: los botones deben verse completos, con el texto en dos líneas si hace
   falta.
