type WithTags = { data: { tags: string[] } };

export function featured<T extends { data: { featured?: number } }>(items: T[]): T[] {
  return items
    .filter((i) => i.data.featured !== undefined)
    .sort((a, b) => a.data.featured! - b.data.featured!);
}

export function allTags(items: WithTags[]): string[] {
  return [...new Set(items.flatMap((i) => i.data.tags))].sort((a, b) => a.localeCompare(b));
}

export function matchesTag(tags: string[], active: string | null): boolean {
  return active === null || tags.includes(active);
}

export function parseTagHash(hash: string, known: string[]): string | null {
  if (!hash.startsWith('#tag=')) return null;
  let tag: string;
  try {
    tag = decodeURIComponent(hash.slice('#tag='.length));
  } catch {
    return null;
  }
  return known.includes(tag) ? tag : null;
}

export function gridOrder<T extends { data: { year: number; title: string } }>(items: T[]): T[] {
  return [...items].sort((a, b) => b.data.year - a.data.year || a.data.title.localeCompare(b.data.title));
}

export function articlesFor<T extends { data: { series: string; order: number; title: string } }>(
  series: string,
  all: T[],
): T[] {
  return all
    .filter((a) => a.data.series === series)
    .sort((a, b) => a.data.order - b.data.order || a.data.title.localeCompare(b.data.title));
}

// What to put in location.hash after applying a filter: a string to write, or null to leave it alone.
export function hashAfterFilter(currentHash: string, tag: string | null): string | null {
  if (tag) return `#tag=${encodeURIComponent(tag)}`;
  return currentHash.startsWith('#tag=') ? '' : null;
}

// Tags worth a filter button: used by at least `min` projects.
export function commonTags(items: WithTags[], min = 2): string[] {
  const counts = new Map<string, number>();
  for (const i of items) for (const t of new Set(i.data.tags)) counts.set(t, (counts.get(t) ?? 0) + 1);
  return [...counts].filter(([, n]) => n >= min).map(([t]) => t).sort((a, b) => a.localeCompare(b));
}
