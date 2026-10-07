// sync-series.mjs: Pull series articles from public repos into src/content/synced.
import { readFile, writeFile, mkdir, rm } from 'node:fs/promises';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

const rawUrl = (repo, ref, p) => `https://raw.githubusercontent.com/${repo}/${ref}/${p}`;

export function transformMarkdown(md, ctx) {
  const body = md.replace(/^---\n[\s\S]*?\n---\n/, '');
  const parts = body.split(/(```[\s\S]*?```|~~~[\s\S]*?~~~)/g);
  const out = parts.map((part, i) => {
    if (i % 2 === 1) return part;
    part = part.replace(/<img\b[^>]*?\bsrc="https?:[^"]*"[^>]*>/g, '').replace(/<a\b[^>]*>\s*<\/a>/g, '');
    part = part.replace(/(<img\b[^>]*?\bsrc=")([^"]+)(")/g, (m, pre, src, post) => {
      if (/^\//.test(src)) return m;
      const resolved = path.posix.normalize(path.posix.join(ctx.dir, src));
      if (resolved.startsWith('..')) throw new Error(`sync: image "${src}" escapes the repo (${ctx.repo})`);
      return `${pre}${ctx.asset(resolved)}${post}`;
    });
    part = part.replace(/!\[([^\]]*)\]\(https?:[^)\s]*\)/g, '$1');
    return part.replace(/(!?)\[([^\]]*)\]\(([^)\s]+)(\s+"[^"]*")?\)/g, (m, bang, text, target, title = '') => {
      if (/^(https?:|mailto:|#|\/)/.test(target)) return m;
      const [file, frag = ''] = target.split('#');
      const resolved = path.posix.normalize(path.posix.join(ctx.dir, file));
      if (resolved.startsWith('..')) throw new Error(`sync: link "${target}" escapes the repo (${ctx.repo})`);
      const hash = frag ? `#${frag}` : '';
      if (bang) return `![${text}](${ctx.asset(resolved)}${title})`;
      if (ctx.slugByPath.has(resolved)) return `[${text}](/projects/${ctx.series}/${ctx.slugByPath.get(resolved)}/${hash}${title})`;
      return `[${text}](https://github.com/${ctx.repo}/blob/${ctx.ref}/${resolved}${hash}${title})`;
    });
  });
  return out.join('').replace(/^\s*# .*\n+/, '').trim();
}

const FINISHED_TARGET = /^(\/|https?:|#|mailto:|data:)/;

// After the transforms, nothing relative or template-shaped may remain: it would publish a broken page.
export function assertClean(md, where) {
  const text = md.replace(/```[\s\S]*?```|~~~[\s\S]*?~~~/g, '');
  const targets = [
    ...[...text.matchAll(/\]\(\s*([^)\s]+)/g)].map((m) => m[1]),
    ...[...text.matchAll(/\b(?:href|src)="([^"]+)"/g)].map((m) => m[1]),
    ...[...text.matchAll(/^\s*\[[^\]]+\]:\s*(\S+)/gm)].map((m) => m[1]),
  ];
  for (const t of targets) {
    if (!FINISHED_TARGET.test(t)) throw new Error(`sync: ${where} still has a relative target "${t}"`);
  }
  if (/\{\{|\{%/.test(text)) throw new Error(`sync: ${where} still has Liquid syntax`);
  if (/^(!!! |\?\?\? |=== ")/m.test(text)) throw new Error(`sync: ${where} still has MkDocs syntax`);
}

export function parseResults(yml) {
  const out = {};
  let inResults = false;
  for (const line of yml.split('\n')) {
    if (/^results:\s*$/.test(line)) {
      inResults = true;
      continue;
    }
    if (!inResults) continue;
    if (/^\S/.test(line)) break;
    const m = line.match(/^\s+(\w+):\s*(.*?)\s*$/);
    if (!m) continue;
    let value = m[2].replace(/\s+#.*$/, '');
    value = value.replace(/^"(.*)"$/, '$1');
    out[m[1]] = value;
  }
  return out;
}

const escapeInline = (text) => text.replace(/`([^`]+)`/g, '<code>$1</code>');

export function transformLiquid(md, ctx) {
  const result = (key) => {
    if (!(key in ctx.results)) throw new Error(`sync: site.results.${key} is not in the config`);
    return ctx.results[key];
  };
  let out = md.replace(/\{%\s*include results-strip\.html\s*%\}/g, () =>
    [
      '| Result | Value |',
      '|---|---|',
      `| RISCOF RV32I | ${result('riscof_rv32i_pass')} of ${result('riscof_rv32i_total')} against ${result('riscof_golden_model')} |`,
      `| LUTs | ${result('lut')} (${result('lut_pct')} of ${result('fpga_target')}) |`,
      `| Regression suite | ${result('riscof_regression_pass')} of ${result('riscof_regression_total')} |`,
    ].join('\n'),
  );
  out = out.replace(/\{\{\s*site\.results\.(\w+)(\s*\|\s*downcase)?\s*\}\}/g, (m, key, down) => {
    const value = result(key);
    return down ? value.toLowerCase() : value;
  });
  out = out.replace(/\{\{\s*'([^']+)'\s*\|\s*relative_url\s*\}\}/g, (m, p) => {
    if (p.startsWith('/images/')) return ctx.asset(`${ctx.docsRoot}${p}`);
    if (p === '/') return `/projects/${ctx.series}/`;
    if (ctx.external?.has(p)) return ctx.external.get(p);
    if (ctx.permalinks.has(p)) return `/projects/${ctx.series}/${ctx.permalinks.get(p)}/`;
    throw new Error(`sync: no synced page for permalink ${p}`);
  });
  out = out.replace(/^(#{1,6}) (.*?) \{#([\w-]+)\}\s*$/gm, (m, hashes, text, id) => `<h${hashes.length} id="${id}">${escapeInline(text)}</h${hashes.length}>\n`);
  return out;
}

export async function syncSeries(cfg, { fetchFn = fetch, outRoot = '.' } = {}) {
  const slugByPath = new Map(cfg.docs.map((d) => [d.path, d.slug]));
  const permalinks = new Map(cfg.docs.filter((d) => d.permalink).map((d) => [d.permalink, d.slug]));
  const external = new Map(Object.entries(cfg.liquid?.external ?? {}));
  let results = {};
  if (cfg.liquid) {
    const res = await fetchFn(rawUrl(cfg.repo, cfg.ref, cfg.liquid.config));
    if (!res.ok) throw new Error(`sync: ${cfg.repo}:${cfg.liquid.config} returned ${res.status}`);
    results = parseResults(await res.text());
  }
  const articleDir = path.join(outRoot, 'src/content/synced', cfg.slug);
  const assetDir = path.join(outRoot, 'public/synced', cfg.slug);
  await rm(articleDir, { recursive: true, force: true });
  await rm(assetDir, { recursive: true, force: true });
  await mkdir(articleDir, { recursive: true });
  await mkdir(assetDir, { recursive: true });

  const assets = new Map();
  const assetUrl = (resolved) => {
    const name = resolved.replaceAll('/', '-');
    assets.set(resolved, name);
    return `/synced/${cfg.slug}/${name}`;
  };
  for (const a of cfg.assets ?? []) assetUrl(a);

  for (const doc of cfg.docs) {
    const res = await fetchFn(rawUrl(cfg.repo, cfg.ref, doc.path));
    if (!res.ok) throw new Error(`sync: ${cfg.repo}:${doc.path} returned ${res.status}`);
    let text = await res.text();
    if (cfg.liquid) {
      text = transformLiquid(text, { series: cfg.slug, results, permalinks, asset: assetUrl, docsRoot: cfg.liquid.root, external });
    }
    const body = transformMarkdown(text, {
      dir: path.posix.dirname(doc.path),
      series: cfg.slug,
      repo: cfg.repo,
      ref: cfg.ref,
      slugByPath,
      asset: assetUrl,
    });
    assertClean(body, `${cfg.repo}:${doc.path}`);
    const front = [
      '---',
      `series: ${JSON.stringify(cfg.slug)}`,
      `order: ${doc.order}`,
      `title: ${JSON.stringify(doc.title)}`,
      `summary: ${JSON.stringify(doc.summary)}`,
      '---',
      '',
    ].join('\n');
    await writeFile(path.join(articleDir, `${doc.slug}.md`), `${front}${body}\n`);
  }

  for (const [resolved, name] of assets) {
    const res = await fetchFn(rawUrl(cfg.repo, cfg.ref, resolved));
    if (!res.ok) throw new Error(`sync: ${cfg.repo}:${resolved} returned ${res.status}`);
    await writeFile(path.join(assetDir, name), Buffer.from(await res.arrayBuffer()));
  }
}

if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  const cfg = JSON.parse(await readFile('sync.config.json', 'utf8'));
  for (const s of cfg.series) {
    await syncSeries(s);
    console.log(`[*] synced ${s.slug}: ${s.docs.length} docs`);
  }
}
