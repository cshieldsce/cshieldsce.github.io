import { describe, it, expect } from 'vitest';
import { mkdtemp, mkdir, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { findBroken } from '../scripts/check-links.mjs';

describe('findBroken', () => {
  it('reports links and images with no target and ignores good ones', async () => {
    const dist = await mkdtemp(path.join(tmpdir(), 'links-'));
    await mkdir(path.join(dist, 'about'));
    await writeFile(path.join(dist, 'about/index.html'), '<p>ok</p>');
    await writeFile(path.join(dist, 'a.png'), 'x');
    await writeFile(
      path.join(dist, 'index.html'),
      '<a href="/about/">a</a><a href="/missing/">m</a><img src="/a.png"><img src="/gone.png"><a href="//cdn.example/x">c</a><a href="/about/#top">h</a>',
    );
    const out = await findBroken(dist);
    expect(out.map((b) => b.to).sort()).toEqual(['/gone.png', '/missing/']);
  });
});

describe('findBroken, stricter', () => {
  it('resolves relative links against the page directory', async () => {
    const dist = await mkdtemp(path.join(tmpdir(), 'links-'));
    await mkdir(path.join(dist, 'p/q'), { recursive: true });
    await writeFile(path.join(dist, 'p/q/index.html'), '<a href="../ok.png">a</a><a href="gone.png">b</a><img src="sibling.png">');
    await writeFile(path.join(dist, 'p/ok.png'), 'x');
    await writeFile(path.join(dist, 'p/q/sibling.png'), 'x');
    const out = await findBroken(dist);
    expect(out.map((b) => b.to)).toEqual(['gone.png']);
  });
  it('does not accept a bare directory with no index.html', async () => {
    const dist = await mkdtemp(path.join(tmpdir(), 'links-'));
    await mkdir(path.join(dist, 'assets/pics'), { recursive: true });
    await writeFile(path.join(dist, 'index.html'), '<a href="/assets/pics/">x</a><a href="/assets/pics">y</a>');
    const out = await findBroken(dist);
    expect(out.map((b) => b.to).sort()).toEqual(['/assets/pics', '/assets/pics/']);
  });
});
