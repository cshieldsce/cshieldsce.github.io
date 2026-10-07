import { describe, it, expect } from 'vitest';
import { mkdtemp, mkdir, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { scanText, checkSizes, loadPrivateTerms } from '../scripts/check-content.mjs';

const rules = (t: string, f = 'src/content/projects/x.mdx', allowed: string[] = [], extra: RegExp[] = []) =>
  scanText(t, f, allowed, extra).map((i) => i.rule);

describe('scanText generic rules', () => {
  it('passes clean prose', () => {
    expect(rules('I routed the board in KiCad: two layers.')).toEqual([]);
  });
  it('flags school framing', () => expect(rules('my coursework')).toContain('school framing'));
  it('flags em and en dashes', () => {
    expect(rules('a — b')).toContain('em or en dash');
    expect(rules('1–2')).toContain('em or en dash');
  });
  it('flags leftover placeholder text', () => {
    expect(rules('summary: <from the doc>')).toContain('unfinished placeholder');
    expect(rules('alt: <describe the photo>')).toContain('unfinished placeholder');
  });
  it('flags the template headings', () => {
    expect(rules("## What's not there\n")).toContain('template heading');
    expect(rules('## What it is\n')).toContain('template heading');
    expect(rules('## Not done yet\n')).toContain('template heading');
    expect(rules("## Things I didn't do\n")).toContain('template heading');
    expect(rules("## Things it doesn't do\n")).toContain('template heading');
    expect(rules('text about what it is mid-sentence')).toEqual([]);
  });
  it('flags credentials', () => expect(rules('ghp_' + 'a'.repeat(30))).toContain('credential'));
});

describe('synced upstream text', () => {
  const f = 'src/content/synced/s/a.md';
  it('skips the dash and heading rules', () => {
    expect(rules('a – b', f)).toEqual([]);
    expect(rules("## What's not there\n", f)).toEqual([]);
    expect(rules('a – b', 'public/synced/s/a.svg')).toEqual([]);
  });
  it('still applies school framing and private terms', () => {
    expect(rules('homework', f)).toContain('school framing');
    expect(rules('Jane Doe', f, [], [/Jane Doe/i])).toContain('private term');
  });
});

describe('private terms', () => {
  it('flags injected private terms', () => {
    expect(rules('written with Jane Doe', undefined, [], [/Jane Doe/i])).toContain('private term');
    expect(rules('nothing here', undefined, [], [/Jane Doe/i])).toEqual([]);
  });
  it('loads terms from a local file and from the environment', async () => {
    const root = await mkdtemp(path.join(tmpdir(), 'terms-'));
    await mkdir(path.join(root, 'scripts'));
    await writeFile(path.join(root, 'scripts/banned.local.json'), JSON.stringify(['Jane Doe', 'A\\d{4}X']));
    const fromFile = await loadPrivateTerms(root, {});
    expect(fromFile.some((r: RegExp) => r.test('jane doe'))).toBe(true);
    expect(fromFile.some((r: RegExp) => r.test('A1234X'))).toBe(true);
    const empty = await mkdtemp(path.join(tmpdir(), 'terms-'));
    const fromEnv = await loadPrivateTerms(empty, { BANNED_TERMS: JSON.stringify(['Zed Zed']) });
    expect(fromEnv.some((r: RegExp) => r.test('zed zed'))).toBe(true);
    expect(await loadPrivateTerms(empty, {})).toEqual([]);
  });
});

describe('physical claims', () => {
  it('flags positive claims, including variants', () => {
    for (const t of ['The chip was taped out.', 'The tape-out slipped.', 'We sent it to fab.', 'It flew in May.', 'I fabbed three boards.', 'It was manufactured in March.', 'I submitted it to the shuttle.']) {
      expect(rules(t)).toContain('unreviewed claim');
    }
  });
  it('lets honest negations through', () => {
    for (const t of ['I have not submitted it for fabrication.', 'It has never been fabricated.', "It hasn't been taped out.", 'No silicon: nothing was submitted to a shuttle.']) {
      expect(rules(t)).toEqual([]);
    }
  });
  it('does not flag Tiny Tapeout by name', () => {
    expect(rules('the Tiny Tapeout flow')).toEqual([]);
  });
  it('allows a positive claim in an allowlisted file', () => {
    expect(rules('PCBWay fabricated it.', 'src/content/projects/a.mdx', ['src/content/projects/a.mdx'])).toEqual([]);
  });
});

describe('checkSizes', () => {
  it('flags oversize assets and videos', async () => {
    const root = await mkdtemp(path.join(tmpdir(), 'lint-'));
    await mkdir(path.join(root, 'src/assets'), { recursive: true });
    await mkdir(path.join(root, 'public/video'), { recursive: true });
    await writeFile(path.join(root, 'src/assets/big.png'), Buffer.alloc(3 * 1024 * 1024 + 1));
    await writeFile(path.join(root, 'public/video/big.mp4'), Buffer.alloc(8 * 1024 * 1024 + 1));
    await writeFile(path.join(root, 'src/assets/ok.png'), Buffer.alloc(1024));
    const out = (await checkSizes(root)).map((i) => path.basename(i.file));
    expect(out.sort()).toEqual(['big.mp4', 'big.png']);
  });
  it('returns nothing when the directories are missing', async () => {
    const root = await mkdtemp(path.join(tmpdir(), 'lint-'));
    expect(await checkSizes(root)).toEqual([]);
  });
});
