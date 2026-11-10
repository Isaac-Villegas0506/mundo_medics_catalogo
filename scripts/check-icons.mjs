#!/usr/bin/env node
/**
 * Verifica que la fuente de iconos tenga TODOS los que usa el código.
 *
 * Se ejecuta antes del build (`prebuild`). Si falta alguno, FALLA con un
 * mensaje claro y la orden exacta para arreglarlo.
 *
 * Por qué existe: `.material-symbols-outlined` funciona por ligaduras. Si el
 * glifo no está en la fuente, el navegador muestra el nombre en texto
 * («arrow_downward») en lugar de la figura. Ese fallo ya ocurrió tres veces y
 * sólo se detectaba abriendo la página.
 *
 * Uso:
 *   node scripts/check-icons.mjs         verifica
 *   node scripts/check-icons.mjs --fix   regenera la fuente automáticamente
 */

import fs from 'node:fs';
import path from 'node:path';
import { collectIcons, readLock, writeLock, LOCK_FILE, FONT_FILE } from './icons.mjs';

const ROOT = process.cwd();
const FIX = process.argv.includes('--fix');

const icons = collectIcons(ROOT);

if (icons.size === 0) {
  console.log('⚠ No se detectó ningún icono en src/. ¿Se movió el código?');
  process.exit(0);
}

const lock = readLock(ROOT);

/* ── 1. ¿Existe la fuente? ─────────────────────────────────────────────── */
const fontPath = path.join(ROOT, FONT_FILE);
if (!fs.existsSync(fontPath)) {
  console.error(`\n✖ No existe la fuente de iconos: ${FONT_FILE}`);
  console.error('  Ejecuta:  npm run icons\n');
  process.exit(1);
}

/* ── 2. ¿Existe el lock? ───────────────────────────────────────────────── */
if (!lock) {
  console.error(`\n✖ No existe ${LOCK_FILE}, así que no se sabe qué iconos tiene la fuente.`);
  console.error('  Ejecuta:  npm run icons\n');
  process.exit(1);
}

const enFuente = new Set(lock.icons);
const usados = [...icons.keys()].sort();

/* ── 3. Comparar ───────────────────────────────────────────────────────── */
const faltan = usados.filter((i) => !enFuente.has(i));
const sobran = lock.icons.filter((i) => !icons.has(i));

if (faltan.length === 0 && sobran.length === 0) {
  console.log(`✓ Iconos: ${usados.length} usados, todos presentes en la fuente.`);
  process.exit(0);
}

if (faltan.length > 0) {
  console.error(`\n✖ FALTAN ${faltan.length} icono(s) en la fuente.`);
  console.error('  Se verían como TEXTO en la página, no como figuras:\n');
  for (const name of faltan) {
    const where = icons.get(name);
    console.error(`    • ${name}   (${where.file}:${where.line})`);
  }
} else {
  console.log('✓ No falta ningún icono en la fuente.');
}

if (sobran.length > 0) {
  console.log(`\nℹ La fuente tiene ${sobran.length} icono(s) que ya no se usan:`);
  console.log(`  ${sobran.join(', ')}`);
  console.log('  (No es un error, solo ocupa unos bytes de más.)');
}

if (faltan.length > 0 && FIX) {
  console.log('\n→ Regenerando la fuente automáticamente...');
  const { regenerateFont } = await import('./sync-icons.mjs');
  await regenerateFont(usados);
  writeLock(new Map(usados.map((i) => [i, null])), ROOT);
  console.log('✓ Fuente regenerada. Vuelve a ejecutar el build.');
  process.exit(0);
}

if (faltan.length > 0) {
  console.error('\n  Para arreglarlo, ejecuta:\n');
  console.error('     npm run icons\n');
  console.error('  (regenera la fuente con los iconos que usa el código)\n');
  process.exit(1);
}

process.exit(0);
