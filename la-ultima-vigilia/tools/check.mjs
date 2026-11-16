/* Sintaxis de todos los módulos, sin introducir un compilador en el juego. */
import { readdirSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
const root = new URL('../', import.meta.url);
const files = [...readdirSync(root).filter(f => /\.(js|mjs)$/.test(f)),
  ...readdirSync(new URL('tools/', root)).filter(f => f.endsWith('.mjs')).map(f => 'tools/' + f),
  ...readdirSync(new URL('tools/edicion/', root)).filter(f => /\.(js|mjs)$/.test(f)).map(f => 'tools/edicion/' + f)];
for (const file of files) {
  const result = spawnSync(process.execPath, ['--check', new URL(file, root).pathname], {stdio: 'inherit'});
  if (result.status !== 0) process.exit(result.status || 1);
}
console.log(`✓ Sintaxis: ${files.length} archivos`);
