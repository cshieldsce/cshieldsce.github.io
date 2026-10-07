import { describe, it, expect } from 'vitest';
import { mkdtemp, readFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { transformMarkdown, syncSeries } from '../scripts/sync-series.mjs';

const ctx = (over = {}) => ({
  dir: 'docs',
  series: 's',
  repo: 'o/r',
  ref: 'main',
  slugByPath: new Map([['docs/other.md', 'other']]),
  asset: (p: string) => `/synced/s/${p.replaceAll('/', '-')}`,
  ...over,
});

describe('transformMarkdown', () => {
  it('drops frontmatter and the first H1', () => {
    expect(transformMarkdown('---\na: 1\n---\n# Title\n\nBody', ctx())).toBe('Body');
  });
  it('rewrites links to other synced docs', () => {
    expect(transformMarkdown('see [x](other.md#sec)', ctx())).toContain('[x](/projects/s/other/#sec)');
  });
  it('rewrites other relative links to the repo on GitHub', () => {
    expect(transformMarkdown('[c](../src/a.v)', ctx())).toContain('[c](https://github.com/o/r/blob/main/src/a.v)');
  });
  it('rewrites images through the asset hook', () => {
    expect(transformMarkdown('![a](img/p.png)', ctx())).toContain('![a](/synced/s/docs-img-p.png)');
  });
  it('leaves absolute links and anchors alone', () => {
    const md = '[a](https://x.y) [b](#top) [c](mailto:a@b.c)';
    expect(transformMarkdown(md, ctx())).toBe(md);
  });
  it('does not touch links inside code fences', () => {
    const md = '```\n[a](b.md)\n```';
    expect(transformMarkdown(md, ctx())).toBe(md);
  });
  it('rejects links that escape the repo', () => {
    expect(() => transformMarkdown('[a](../../x.md)', ctx())).toThrow(/escapes/);
  });
});

describe('syncSeries', () => {
  const cfg = {
    slug: 's',
    repo: 'o/r',
    ref: 'main',
    docs: [{ path: 'docs/a.md', slug: 'a', title: 'A "quoted"', order: 10, summary: 'Sum' }],
    assets: [],
  };
  const ok = (body: string) => ({
    ok: true,
    status: 200,
    text: async () => body,
    arrayBuffer: async () => new TextEncoder().encode(body).buffer,
  });

  it('writes an article with frontmatter and downloads referenced images', async () => {
    const root = await mkdtemp(path.join(tmpdir(), 'sync-'));
    const calls: string[] = [];
    const fetchFn = async (url: string) => {
      calls.push(url);
      return ok(url.endsWith('.png') ? 'PNGDATA' : '# T\n\n![i](p.png)\n');
    };
    await syncSeries(cfg, { fetchFn: fetchFn as any, outRoot: root });
    const md = await readFile(path.join(root, 'src/content/synced/s/a.md'), 'utf8');
    expect(md).toContain('series: "s"');
    expect(md).toContain('title: "A \\"quoted\\""');
    expect(md).toContain('![i](/synced/s/docs-p.png)');
    expect(await readFile(path.join(root, 'public/synced/s/docs-p.png'), 'utf8')).toBe('PNGDATA');
    expect(calls[0]).toBe('https://raw.githubusercontent.com/o/r/main/docs/a.md');
  });

  it('fails loudly with the path when an upstream doc is gone', async () => {
    const root = await mkdtemp(path.join(tmpdir(), 'sync-'));
    const fetchFn = async () => ({ ok: false, status: 404 });
    await expect(syncSeries(cfg, { fetchFn: fetchFn as any, outRoot: root })).rejects.toThrow(/o\/r:docs\/a\.md.*404/);
  });
});

import { transformLiquid, parseResults } from '../scripts/sync-series.mjs';

const lctx = (over = {}) => ({
  series: 's',
  results: { lut: '1972', riscof_rv32i_pass: '482', riscof_rv32i_total: '482', riscof_golden_model: 'Spike', lut_pct: '3.71%', fpga_target: 'Zynq', riscof_regression_pass: '12', riscof_regression_total: '12' },
  permalinks: new Map([['/architecture/', 'architecture'], ['/architecture/stages/', 'stages']]),
  asset: (p: string) => `/synced/s/${p.replaceAll('/', '-')}`,
  docsRoot: 'docs',
  ...over,
});

describe('parseResults', () => {
  it('reads quoted and bare values and drops comments', () => {
    const yml = 'title: x\nresults:\n  lut: 1972\n  fpga: "Zynq (PYNQ)"\n  wns: "TBD"   # note\nother: 1\n';
    expect(parseResults(yml)).toEqual({ lut: '1972', fpga: 'Zynq (PYNQ)', wns: 'TBD' });
  });
});

describe('transformLiquid', () => {
  it('fills site.results values, with downcase', () => {
    expect(transformLiquid('{{ site.results.lut }} LUTs vs {{ site.results.riscof_golden_model | downcase }}', lctx())).toBe('1972 LUTs vs spike');
  });
  it('maps relative_url permalinks to series pages, keeping the fragment', () => {
    expect(transformLiquid("[a]({{ '/architecture/stages/' | relative_url }}#fetch)", lctx())).toBe('[a](/projects/s/stages/#fetch)');
  });
  it('maps the site root to the series landing page', () => {
    expect(transformLiquid("[a]({{ '/' | relative_url }})", lctx())).toBe('[a](/projects/s/)');
  });
  it('maps image paths through the asset hook', () => {
    expect(transformLiquid(`<img src="{{ '/images/a.png' | relative_url }}">`, lctx())).toBe('<img src="/synced/s/docs-images-a.png">');
  });
  it('replaces the results-strip include with a table', () => {
    const out = transformLiquid('{% include results-strip.html %}', lctx());
    expect(out).toContain('| RISCOF RV32I | 482 of 482 against Spike |');
    expect(out).toContain('| LUTs | 1972 (3.71% of Zynq) |');
  });
  it('turns heading anchors into ids and ends the HTML block', () => {
    expect(transformLiquid('## The `datapath` {#overview}', lctx())).toBe('<h2 id="overview">The <code>datapath</code></h2>\n');
  });
  it('fails on an unknown results key', () => {
    expect(() => transformLiquid('{{ site.results.nope }}', lctx())).toThrow(/site\.results\.nope/);
  });
  it('fails on an unmapped permalink', () => {
    expect(() => transformLiquid("[a]({{ '/ghost/' | relative_url }})", lctx())).toThrow(/\/ghost\//);
  });
});

describe('transformMarkdown absolute paths', () => {
  it('leaves site-absolute links alone', () => {
    const md = '[a](/projects/s/x/#f) ![i](/synced/s/a.png)';
    expect(transformMarkdown(md, ctx())).toBe(md);
  });
});

describe('transformLiquid external permalinks', () => {
  it('sends unsynced permalinks to the original site when configured', () => {
    const external = new Map([['/architecture/hazards/', 'https://example.test/hazards/']]);
    expect(transformLiquid("[h]({{ '/architecture/hazards/' | relative_url }}#x)", lctx({ external }))).toBe('[h](https://example.test/hazards/#x)');
  });
});

describe('transformMarkdown html images', () => {
  it('rewrites relative img src through the asset hook', () => {
    const out = transformMarkdown('<img src="results/p.png" alt="a" width="480">', ctx({ dir: 'asic' }));
    expect(out).toBe('<img src="/synced/s/asic-results-p.png" alt="a" width="480">');
  });
  it('leaves site-absolute img src alone and drops remote ones', () => {
    const md = '<img src="https://x.y/a.png"> <img src="/synced/s/a.png">';
    expect(transformMarkdown(md, ctx())).toBe('<img src="/synced/s/a.png">');
  });
});

import { assertClean } from '../scripts/sync-series.mjs';

describe('transformMarkdown remote images', () => {
  it('replaces a remote markdown image with its alt text', () => {
    expect(transformMarkdown('![CI badge](https://x.test/b.svg)', ctx())).toBe('CI badge');
  });
  it('keeps a linked badge as a plain link', () => {
    expect(transformMarkdown('[![CI](https://x.test/b.svg)](https://x.test/run)', ctx())).toBe('[CI](https://x.test/run)');
  });
  it('drops remote html images and the empty links around them', () => {
    expect(transformMarkdown('a <a href="https://x.test/run"><img src="https://x.test/b.svg" alt="CI"></a> b', ctx())).toBe('a  b');
  });
});

describe('transformMarkdown link forms', () => {
  it('rewrites links that carry a title', () => {
    expect(transformMarkdown('[x](other.md "Other doc")', ctx())).toBe('[x](/projects/s/other/ "Other doc")');
  });
  it('leaves tilde fences alone', () => {
    const md = '~~~\n[a](b.md)\n~~~';
    expect(transformMarkdown(md, ctx())).toBe(md);
  });
});

describe('assertClean', () => {
  const where = 'o/r:docs/a.md';
  it('passes finished text', () => {
    expect(() => assertClean('[a](/x/) [b](https://x.y) [c](#t) <img src="/synced/a.png"> <a href="mailto:a@b.c">m</a>', where)).not.toThrow();
  });
  it('fails on relative links, images and reference definitions, naming the doc', () => {
    expect(() => assertClean('[a](rel.md)', where)).toThrow(/o\/r:docs\/a\.md.*rel\.md/);
    expect(() => assertClean('<a href="rel.html">a</a>', where)).toThrow(/rel\.html/);
    expect(() => assertClean('<img src="p.png">', where)).toThrow(/p\.png/);
    expect(() => assertClean('[a][ref]\n\n[ref]: rel.md', where)).toThrow(/rel\.md/);
  });
  it('fails on leftover Liquid and MkDocs syntax', () => {
    expect(() => assertClean("{{ site.x }}", where)).toThrow(/Liquid/);
    expect(() => assertClean('{% include x %}', where)).toThrow(/Liquid/);
    expect(() => assertClean('!!! note\n    text', where)).toThrow(/MkDocs/);
  });
  it('ignores code fences', () => {
    expect(() => assertClean('```\n[a](rel.md) {{ x }}\n```', where)).not.toThrow();
    expect(() => assertClean('~~~\n!!! note\n~~~', where)).not.toThrow();
  });
});
