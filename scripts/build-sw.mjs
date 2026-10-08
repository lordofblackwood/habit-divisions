import { createHash } from 'node:crypto';
import { readdir, readFile, writeFile } from 'node:fs/promises';
import { dirname, join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = dirname(dirname(fileURLToPath(import.meta.url)));
const output = join(root, 'dist');
const template = await readFile(join(root, 'public', 'sw.js'), 'utf8');

async function listFiles(directory) {
  const entries = await readdir(directory, { withFileTypes: true });
  const nested = await Promise.all(entries.map((entry) => {
    const path = join(directory, entry.name);
    return entry.isDirectory() ? listFiles(path) : path;
  }));
  return nested.flat();
}

const paths = (await listFiles(output))
  .map((path) => relative(output, path).split('\\').join('/'))
  .filter((path) => path !== 'sw.js' && !path.endsWith('.map') && !path.startsWith('.'))
  .sort();

if (!paths.includes('index.html')) throw new Error('Build index.html before generating the service worker.');

const hash = createHash('sha256').update(template);
for (const path of paths) {
  hash.update(path);
  hash.update(await readFile(join(output, path)));
}
const buildId = hash.digest('hex').slice(0, 16);
const worker = template
  .replace('__BUILD_ID__', buildId)
  .replace(/\/\* PRECACHE_START \*\/[\s\S]*?\/\* PRECACHE_END \*\//, JSON.stringify(paths, null, 2));

await writeFile(join(output, 'sw.js'), worker);
console.log(`Offline cache ready: ${paths.length} files (${buildId}).`);
