// check-content.mjs: Fail the build when site content breaks the privacy and honesty rules.
// Personal terms (IDs, logins, names, course codes) are NOT in this file: they live in the untracked
// scripts/banned.local.json or the BANNED_TERMS environment variable, so the public repo never holds them.
import { readdir, readFile, stat } from 'node:fs/promises';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

export const BANNED = [
  [/\b(coursework|homework|class project|school project)\b/i, 'school framing'],
  [/\b(gh[pousr]_[A-Za-z0-9]{20,}|AKIA[0-9A-Z]{16})\b/, 'credential'],
  [/[–—]/, 'em or en dash'],
  [/<from the doc>|<describe /, 'unfinished placeholder'],
  [/^#{1,6} (What['’]s (not )?there|What it is|Not done yet|Things (I|it) (didn['’]t|doesn['’]t) do)\s*$/m, 'template heading'],
];

// Wording that claims something physical happened. A sentence that contains one needs a person's
// review (the allowlist) unless it is a negation, which can only understate.
export const CLAIM =
  /\btaped[ -]?out\b|(?<!Tiny )\btape[ -]?out\b(?!-\w)|\bfabbed\b|\bfabricated\b|\bmanufactured\b|\bflew\b|\bflown\b|\bsent (it |them )?to (a )?fab\b|\bordered (the|my|a) (boards?|pcbs?)\b|\bsubmitted (it |them |this |that )?(to|for)\b/i;
const NEGATION = /\b(not|never|no|without|neither|nor)\b|n['’]t\b/i;

const TEXT_EXT = new Set(['.md', '.mdx', '.astro', '.html', '.txt', '.svg', '.json', '.ts']);
const SCAN_DIRS = ['src/content', 'src/pages', 'src/components', 'public'];
const isSynced = (file) => file.startsWith('src/content/synced/') || file.startsWith('public/synced/');

function hasPositiveClaim(text) {
  return text
    .split(/(?<=[.!?])\s+|\n+/)
    .some((sentence) => CLAIM.test(sentence) && !NEGATION.test(sentence));
}

export function scanText(text, file, allowedClaims = [], privateTerms = []) {
  const issues = [];
  const synced = isSynced(file);
  for (const [re, rule] of BANNED) {
    if (synced && (rule === 'em or en dash' || rule === 'template heading')) continue;
    if (re.test(text)) issues.push({ file, rule });
  }
  for (const re of privateTerms) if (re.test(text)) issues.push({ file, rule: 'private term' });
  if (hasPositiveClaim(text) && !allowedClaims.includes(file)) issues.push({ file, rule: 'unreviewed claim' });
  return issues;
}

export async function loadPrivateTerms(root, env = process.env) {
  let list = [];
  try {
    list = JSON.parse(await readFile(path.join(root, 'scripts/banned.local.json'), 'utf8'));
  } catch {
    if (env.BANNED_TERMS) list = JSON.parse(env.BANNED_TERMS);
  }
  return list.map((source) => new RegExp(source, 'i'));
}

async function walk(dir) {
  let entries;
  try {
    entries = await readdir(dir, { withFileTypes: true });
  } catch {
    return [];
  }
  const out = [];
  for (const e of entries) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) out.push(...(await walk(p)));
    else out.push(p);
  }
  return out;
}

export async function checkSizes(root) {
  const issues = [];
  const limits = [
    [path.join(root, 'src/assets'), 3 * 1024 * 1024],
    [path.join(root, 'public/video'), 8 * 1024 * 1024],
  ];
  for (const [dir, max] of limits) {
    for (const f of await walk(dir)) {
      if ((await stat(f)).size > max) issues.push({ file: f, rule: `file over ${max / 1024 / 1024} MB` });
    }
  }
  return issues;
}

export async function run(root = '.') {
  const allowed = JSON.parse(await readFile(path.join(root, 'scripts/claims-allowlist.json'), 'utf8'));
  const terms = await loadPrivateTerms(root);
  if (terms.length === 0) console.log('WARNING: no private terms loaded (scripts/banned.local.json or BANNED_TERMS)');
  const issues = [];
  for (const d of SCAN_DIRS) {
    for (const f of await walk(path.join(root, d))) {
      if (!TEXT_EXT.has(path.extname(f))) continue;
      const rel = path.relative(root, f).split(path.sep).join('/');
      issues.push(...scanText(await readFile(f, 'utf8'), rel, allowed, terms));
    }
  }
  issues.push(...(await checkSizes(root)));
  for (const i of issues) console.log(`FAILED: ${i.file}: ${i.rule}`);
  if (issues.length === 0) console.log('PASSED: content lint');
  return issues.length === 0 ? 0 : 1;
}

if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  process.exit(await run());
}
