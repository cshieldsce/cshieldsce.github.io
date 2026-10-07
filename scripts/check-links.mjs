// check-links.mjs: Fail when a built page links to a path that does not exist.
import { readdir, readFile, stat } from 'node:fs/promises';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

async function htmlFiles(dir) {
  const out = [];
  for (const e of await readdir(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) out.push(...(await htmlFiles(p)));
    else if (e.name.endsWith('.html')) out.push(p);
  }
  return out;
}

const isFile = (p) => stat(p).then((s) => s.isFile(), () => false);

export async function findBroken(dist) {
  const broken = [];
  for (const file of await htmlFiles(dist)) {
    const html = await readFile(file, 'utf8');
    for (const m of html.matchAll(/(?:href|src)="([^"#?]+)(?:[#?][^"]*)?"/g)) {
      const raw = m[1];
      if (/^([a-z][a-z0-9+.-]*:|\/\/)/i.test(raw)) continue;
      const target = decodeURIComponent(raw);
      const base = target.startsWith('/') ? path.join(dist, target) : path.join(path.dirname(file), target);
      const ok = (await isFile(base)) || (await isFile(path.join(base, 'index.html')));
      if (!ok) broken.push({ from: path.relative(dist, file), to: target });
    }
  }
  return broken;
}

if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  const broken = await findBroken('dist');
  for (const b of broken) console.log(`FAILED: ${b.from} -> ${b.to}`);
  if (broken.length === 0) console.log('PASSED: internal links');
  process.exit(broken.length === 0 ? 0 : 1);
}
