import { describe, it, expect } from 'vitest';
import { featured, allTags, commonTags, matchesTag, parseTagHash, hashAfterFilter, gridOrder, articlesFor } from '../src/lib/projects';
import { STATUSES, STATUS_LABEL } from '../src/lib/status';

const p = (id: string, data: Record<string, unknown> = {}) => ({
  id,
  data: { title: id, tags: ['a'], year: 2026, ...data },
});

describe('status', () => {
  it('has a label for every status', () => {
    for (const s of STATUSES) expect(STATUS_LABEL[s]).toBeTruthy();
  });
});

describe('featured', () => {
  it('keeps featured items in ascending order', () => {
    const out = featured([p('c', { featured: 3 }), p('x'), p('a', { featured: 1 })] as any);
    expect(out.map((i: any) => i.id)).toEqual(['a', 'c']);
  });
});

describe('allTags', () => {
  it('returns unique sorted tags', () => {
    expect(allTags([p('1', { tags: ['b', 'a'] }), p('2', { tags: ['a', 'c'] })] as any)).toEqual(['a', 'b', 'c']);
  });
});

describe('matchesTag', () => {
  it('matches everything when no tag is active', () => expect(matchesTag(['a'], null)).toBe(true));
  it('matches only cards with the tag', () => {
    expect(matchesTag(['a', 'b'], 'b')).toBe(true);
    expect(matchesTag(['a'], 'b')).toBe(false);
  });
});

describe('parseTagHash', () => {
  const known = ['PCB', 'CAN bus'];
  it('reads a known tag', () => expect(parseTagHash('#tag=PCB', known)).toBe('PCB'));
  it('decodes encoded tags', () => expect(parseTagHash('#tag=CAN%20bus', known)).toBe('CAN bus'));
  it('ignores unknown tags', () => expect(parseTagHash('#tag=nope', known)).toBeNull());
  it('ignores empty and unrelated hashes', () => {
    expect(parseTagHash('', known)).toBeNull();
    expect(parseTagHash('#projects', known)).toBeNull();
    expect(parseTagHash('#tag=', known)).toBeNull();
  });
  it('does not throw on malformed encoding', () => expect(parseTagHash('#tag=%E0%A4%A', known)).toBeNull());
});

describe('gridOrder', () => {
  it('sorts newest year first then by title', () => {
    const out = gridOrder([p('b', { year: 2025, title: 'b' }), p('a', { year: 2026, title: 'z' }), p('c', { year: 2026, title: 'c' })] as any);
    expect(out.map((i: any) => i.id)).toEqual(['c', 'a', 'b']);
  });
});

describe('articlesFor', () => {
  const a = (id: string, series: string, order: number, title: string) => ({ id, data: { series, order, title } });
  it('filters by series and orders by order then title', () => {
    const out = articlesFor('s', [a('1', 's', 20, 'b'), a('2', 'x', 1, 'q'), a('3', 's', 10, 'z'), a('4', 's', 20, 'a')]);
    expect(out.map((i) => i.id)).toEqual(['3', '4', '1']);
  });
  it('returns an empty list for a series with no articles', () => {
    expect(articlesFor('none', [a('1', 's', 1, 'a')])).toEqual([]);
  });
});

describe('hashAfterFilter', () => {
  it('writes the tag hash when a tag is active', () => {
    expect(hashAfterFilter('', 'PCB')).toBe('#tag=PCB');
    expect(hashAfterFilter('#tag=FPGA', 'CAN bus')).toBe('#tag=CAN%20bus');
  });
  it('clears a tag hash when the filter is reset', () => {
    expect(hashAfterFilter('#tag=PCB', null)).toBe('');
  });
  it('leaves any other hash alone, so #projects still scrolls', () => {
    expect(hashAfterFilter('#projects', null)).toBeNull();
    expect(hashAfterFilter('', null)).toBeNull();
  });
});

describe('commonTags', () => {
  it('keeps only tags shared by at least two projects, sorted', () => {
    const items = [p('1', { tags: ['b', 'a', 'solo1'] }), p('2', { tags: ['a', 'b'] }), p('3', { tags: ['b', 'solo2'] })];
    expect(commonTags(items as any)).toEqual(['a', 'b']);
  });
  it('respects a custom minimum', () => {
    const items = [p('1', { tags: ['a', 'b'] }), p('2', { tags: ['a'] }), p('3', { tags: ['a'] })];
    expect(commonTags(items as any, 3)).toEqual(['a']);
  });
  it('returns nothing when no tag repeats', () => {
    expect(commonTags([p('1', { tags: ['a'] }), p('2', { tags: ['b'] })] as any)).toEqual([]);
  });
});
