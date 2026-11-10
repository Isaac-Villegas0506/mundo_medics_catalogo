/**
 * Extractor de iconos Material Symbols usado por `check-icons` y `sync-icons`.
 *
 * El problema que resuelve: la clase `.material-symbols-outlined` funciona por
 * LIGADURAS. El texto «arrow_downward» se convierte en figura solo si ese glifo
 * existe en la fuente. Si falta, el navegador muestra el nombre tal cual y el
 * icono aparece como texto.
 *
 * Como la fuente se genera a partir de una lista, hay que garantizar que esa
 * lista coincida con lo que el código usa. Este módulo extrae los iconos con
 * las cuatro formas en que aparecen en el proyecto:
 *
 *   1. Texto dentro del span:      >arrow_downward<
 *   2. Ternario dentro del span:   >{x ? 'check_circle' : 'playlist_add'}<
 *   3. Propiedad en un array:      icon: 'dashboard'
 *   4. Atributo:                   icon="dashboard"
 *
 * Cualquier otro string del código NO se considera icono, para no pedir a la
 * fuente decenas de glifos que no se usan.
 */

import fs from 'node:fs';
import path from 'node:path';

/** Archivos que se analizan. */
function walk(dir, out = []) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      // Se omiten carpetas que no contienen UI.
      if (['node_modules', '.next', '.git', 'public'].includes(entry.name)) continue;
      walk(full, out);
    } else if (/\.(tsx|ts|jsx|js)$/.test(entry.name)) {
      out.push(full);
    }
  }
  return out;
}

/** Un nombre de icono: minúsculas, dígitos y guiones bajos. */
const ICON_RE = "([a-z][a-z0-9_]*)";

/**
 * Extrae los iconos de un archivo.
 * Devuelve un Map nombre -> número de línea de la primera aparición.
 */
function extractFromSource(source) {
  const found = new Map();

  const add = (name, index) => {
    if (!name || name.length > 42) return;
    if (!found.has(name)) {
      found.set(name, source.slice(0, index).split('\n').length);
    }
  };

  /* ── Patrón 1 y 2: contenido del span de iconos ──────────────────────────
     Se busca `material-symbols-outlined`, se avanza hasta el `>` que cierra la
     etiqueta de apertura y se toma:
       - el identificador suelto si es texto (>{'name'}< o >name<),
       - todos los strings entrecomillados si es una expresión { … }.
     Se limita a 240 caracteres después del `>` para no capturar el resto del
     componente. */
  const spanRe = /material-symbols-outlined[\s\S]{0,320}?>/g;
  let m;
  while ((m = spanRe.exec(source)) !== null) {
    const start = m.index + m[0].length;
    const tail = source.slice(start, start + 240);

    // Caso A: el contenido empieza con un ternario o expresión.
    const exprMatch = /^\s*\{([\s\S]{0,200}?)\}/.exec(tail);
    if (exprMatch) {
      const expr = exprMatch[1];
      // Sólo se aceptan strings que parezcan iconos y estén en un ternario o
      // como valor único.
      for (const s of expr.matchAll(new RegExp(`'${ICON_RE}'|"${ICON_RE}"`, 'g'))) {
        add(s[1] || s[2], start);
      }
      continue;
    }

    // Caso B: texto suelto `>`name<`.
    const textMatch = new RegExp(`^\\s*${ICON_RE}\\s*<`).exec(tail);
    if (textMatch) add(textMatch[1], start);
  }

  /* ── Patrón 3: `icon: 'nombre'` ─────────────────────────────────────────
     Se usa en los arrays de navegación. */
  for (const s of source.matchAll(new RegExp(`icon\\s*:\\s*'${ICON_RE}'`, 'g'))) {
    add(s[1], s.index);
  }
  for (const s of source.matchAll(new RegExp(`icon\\s*:\\s*"${ICON_RE}"`, 'g'))) {
    add(s[1], s.index);
  }

  /* ── Patrón 4: `icon="nombre"` ─────────────────────────────────────────── */
  for (const s of source.matchAll(new RegExp(`icon\\s*=\\s*"${ICON_RE}"`, 'g'))) {
    add(s[1], s.index);
  }

  return found;
}

/**
 * Recorre `src/` y devuelve todos los iconos usados.
 * @returns {Map<string, {file: string, line: number}>}
 */
export function collectIcons(rootDir = process.cwd()) {
  const srcDir = path.join(rootDir, 'src');
  const icons = new Map();

  for (const file of walk(srcDir)) {
    const source = fs.readFileSync(file, 'utf8');
    const rel = path.relative(rootDir, file).replace(/\\/g, '/');

    for (const [name, line] of extractFromSource(source)) {
      if (!icons.has(name)) icons.set(name, { file: rel, line });
    }
  }

  return icons;
}

/** Ruta del archivo que guarda la lista con la que se generó la fuente. */
export const LOCK_FILE = 'scripts/icons.lock.json';
export const FONT_FILE = 'public/fonts/material-symbols-subset.woff2';

/** Lee el lock. Si no existe, devuelve null. */
export function readLock(rootDir = process.cwd()) {
  const p = path.join(rootDir, LOCK_FILE);
  if (!fs.existsSync(p)) return null;
  try {
    return JSON.parse(fs.readFileSync(p, 'utf8'));
  } catch {
    return null;
  }
}

/** Escribe el lock. */
export function writeLock(icons, rootDir = process.cwd()) {
  const p = path.join(rootDir, LOCK_FILE);
  fs.mkdirSync(path.dirname(p), { recursive: true });
  const list = [...icons.keys()].sort();
  fs.writeFileSync(p, JSON.stringify({ icons: list }, null, 2) + '\n');
  return list;
}
