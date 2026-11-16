/*
 * Genera la-ultima-vigilia.html: el juego entero en un solo archivo que se abre
 * con doble clic, sin servidor. No necesita dependencias.
 *
 *   node build.mjs
 */
import { readFileSync, writeFileSync } from 'node:fs';

const dir = new URL('.', import.meta.url);
const read = file => readFileSync(new URL(file, dir), 'utf8');
const IMPORT = /^import\s*\{([^}]+)\}\s*from\s*'\.\/([\w-]+)\.js';[ \t]*$/gm;
const EXPORT = /^export\s+(const|let|function|class)\s+([A-Za-z_$][\w$]*)/gm;
const idOf = file => '__' + file.replace(/\W/g, '_');

// Los módulos se descubren a partir de app.js: cada uno va detrás de los que importa.
const order = [], state = new Map();
function visit(file, trail = []) {
  if (state.get(file) === 'done') return;
  if (state.get(file) === 'open') throw new Error(`Importación circular: ${[...trail, file].join(' → ')}`);
  state.set(file, 'open');
  for (const match of read(file).matchAll(IMPORT)) visit(`${match[2]}.js`, [...trail, file]);
  state.set(file, 'done');
  order.push(file);
}
visit('app.js');

const exportsOf = new Map();
let bundle = '';
for (const file of order) {
  let src = read(file);
  src = src.replace(IMPORT, (_, names, mod) => {
    const known = exportsOf.get(`${mod}.js`);
    for (const name of names.split(',').map(n => n.trim()).filter(Boolean)) {
      if (!/^[A-Za-z_$][\w$]*$/.test(name)) throw new Error(`${file}: este script no entiende «${name}» (sin alias ni saltos raros)`);
      if (!known.includes(name)) throw new Error(`${file}: ${mod}.js no exporta «${name}»`);
    }
    return `const {${names}} = ${idOf(`${mod}.js`)};`;
  });
  if (/^\s*import\s/m.test(src)) throw new Error(`${file}: hay un import que este script no sabe resolver`);
  const exported = [];
  src = src.replace(EXPORT, (_, kind, name) => {
    exported.push(name);
    return `${kind} ${name}`;
  });
  if (/^export\s/m.test(src)) throw new Error(`${file}: hay un export que este script no sabe resolver`);
  exportsOf.set(file, exported);
  bundle += `/* ---- ${file} ---- */\nconst ${idOf(file)} = (() => {\n${src}\nreturn {${exported.join(', ')}};\n})();\n`;
}
if (bundle.includes('</script')) throw new Error('El código contiene </script y rompería el HTML');

const icon = 'data:image/svg+xml;base64,' + Buffer.from(read('icon.svg')).toString('base64');
let html = read('index.html');
const swap = (from, to) => {
  if (!html.includes(from)) throw new Error(`No encuentro en index.html: ${from}`);
  html = html.split(from).join(to);
};
swap('<link rel="icon" href="icon.svg" type="image/svg+xml">', `<link rel="icon" href="${icon}" type="image/svg+xml">`);
swap('<link rel="stylesheet" href="style.css">', `<style>\n${read('style.css')}</style>`);
swap('<script type="module" src="app.js"></script>', `<script type="module">\n${bundle}</script>`);

const destination = new URL('la-ultima-vigilia.html', dir);
if (process.argv.includes('--check')) {
  if (readFileSync(destination, 'utf8') !== html) {
    console.error('El HTML autónomo está desactualizado. Ejecuta npm run build.');
    process.exit(1);
  }
} else writeFileSync(destination, html);
console.log(`la-ultima-vigilia.html · ${order.length} módulos · ${(html.length / 1024).toFixed(0)} KB`);
