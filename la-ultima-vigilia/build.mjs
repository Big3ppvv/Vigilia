/*
 * Genera la-ultima-vigilia.html: el juego entero en un solo archivo que se abre
 * con doble clic, sin servidor. No necesita dependencias.
 *
 *   node build.mjs
 */
import { readFileSync, writeFileSync } from 'node:fs';

const dir = new URL('.', import.meta.url);
const read = file => readFileSync(new URL(file, dir), 'utf8');

// Orden de dependencias: cada módulo solo importa de los anteriores.
const MODULES = ['sprites.js', 'story.js', 'art.js', 'audio.js', 'game.js', 'app.js'];

let bundle = '';
for (const file of MODULES) {
  const id = '__' + file.replace(/\W/g, '_');
  let src = read(file);
  src = src.replace(/^import\s*\{([^}]+)\}\s*from\s*'\.\/([\w-]+)\.js';[ \t]*$/gm,
    (_, names, mod) => `const {${names}} = __${mod}_js;`);
  if (/^\s*import\s/m.test(src)) throw new Error(`${file}: hay un import que este script no sabe resolver`);
  const exported = [];
  src = src.replace(/^export\s+(const|let|function|class)\s+([A-Za-z_$][\w$]*)/gm, (_, kind, name) => {
    exported.push(name);
    return `${kind} ${name}`;
  });
  if (/^export\s/m.test(src)) throw new Error(`${file}: hay un export que este script no sabe resolver`);
  bundle += `/* ---- ${file} ---- */\nconst ${id} = (() => {\n${src}\nreturn {${exported.join(', ')}};\n})();\n`;
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

writeFileSync(new URL('la-ultima-vigilia.html', dir), html);
console.log(`la-ultima-vigilia.html · ${(html.length / 1024).toFixed(0)} KB`);
