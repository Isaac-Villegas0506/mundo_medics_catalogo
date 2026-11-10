#!/usr/bin/env node
/**
 * Regenera `public/fonts/material-symbols-subset.woff2` con EXACTAMENTE los
 * iconos que usa el código, y actualiza el lock.
 *
 * Uso:
 *   npm run icons          regenera con los iconos detectados
 *   npm run icons:check    solo verifica (lo hace el prebuild)
 *
 * Cómo funciona:
 *   1. Extrae los iconos de src/ (ver scripts/icons.mjs).
 *   2. Pide a Google Fonts el CSS del subconjunto con `icon_names=...`.
 *   3. Descarga el woff2 de ese CSS y lo guarda en public/fonts/.
 *   4. Escribe scripts/icons.lock.json con la lista para que el verificador
 *      sepa qué contiene la fuente.
 *
 * Requiere conexión a internet. Si falla, la fuente anterior queda intacta:
 * se descarga a un archivo temporal y solo se reemplaza al final.
 */

import fs from 'node:fs';
import path from 'node:path';
import { collectIcons, writeLock, FONT_FILE } from './icons.mjs';

const ROOT = process.cwd();

const UA =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 ' +
  '(KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36';

/**
 * Descarga la fuente con los iconos indicados.
 * @param {string[]} iconNames
 */
export async function regenerateFont(iconNames) {
  const nombres = [...new Set(iconNames)].sort();

  if (nombres.length === 0) {
    throw new Error('La lista de iconos está vacía: no se generaría ninguna fuente.');
  }

  const cssUrl =
    'https://fonts.googleapis.com/css2' +
    '?family=Material+Symbols+Outlined:opsz,wght,FILL,GRAD@20..48,100..700,0..1,-50..200' +
    `&icon_names=${nombres.join(',')}` +
    '&display=block';

  console.log(`  Pidiendo ${nombres.length} iconos a Google Fonts…`);

  const cssRes = await fetch(cssUrl, { headers: { 'User-Agent': UA } });
  if (!cssRes.ok) {
    throw new Error(`Google Fonts respondió ${cssRes.status} al pedir el CSS.`);
  }

  const css = await cssRes.text();
  const fontUrlMatch = /url\((https:\/\/[^)]+)\)/.exec(css);
  if (!fontUrlMatch) {
    throw new Error(
      'El CSS de Google Fonts no contiene ninguna URL de fuente. ' +
        'Puede que algún nombre de icono no exista.'
    );
  }

  const fontRes = await fetch(fontUrlMatch[1]);
  if (!fontRes.ok) {
    throw new Error(`No se pudo descargar el woff2 (${fontRes.status}).`);
  }

  const buffer = Buffer.from(await fontRes.arrayBuffer());
  if (buffer.length < 1000) {
    throw new Error(`El woff2 descargado es sospechosamente pequeño (${buffer.length} B).`);
  }

  // Se escribe primero en un temporal y se renombra: si algo falla a mitad,
  // la fuente anterior sigue válida.
  const destino = path.join(ROOT, FONT_FILE);
  fs.mkdirSync(path.dirname(destino), { recursive: true });
  const temporal = `${destino}.tmp`;

  fs.writeFileSync(temporal, buffer);
  fs.renameSync(temporal, destino);

  return { bytes: buffer.length, count: nombres.length };
}

/* ── Ejecución directa ─────────────────────────────────────────────────── */
/* En Windows `import.meta.url` es `file:///C:/...`, así que se compara con
   `fileURLToPath` en vez de manipular la cadena a mano (que fallaba en silencio
   y hacía que el script no ejecutara nada). */
import { fileURLToPath } from 'node:url';

const scriptPath = fileURLToPath(import.meta.url);
const esEjecucionDirecta =
  process.argv[1] && path.resolve(process.argv[1]) === path.resolve(scriptPath);

if (esEjecucionDirecta) {
  const icons = collectIcons(ROOT);
  const nombres = [...icons.keys()].sort();

  console.log(`\nIconos detectados en el código: ${nombres.length}\n`);

  try {
    const { bytes, count } = await regenerateFont(nombres);
    writeLock(icons, ROOT);

    console.log(`\n✓ Fuente regenerada: ${(bytes / 1024).toFixed(1)} KiB con ${count} iconos`);
    console.log(`✓ Lock actualizado: scripts/icons.lock.json`);
    console.log('\n  Iconos:');
    console.log(`  ${nombres.join(', ')}\n`);
  } catch (err) {
    console.error(`\n✖ No se pudo regenerar la fuente: ${err.message}`);
    console.error('  La fuente anterior NO se modificó.\n');
    process.exit(1);
  }
}
