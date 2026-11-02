// Work item: language-stack (no Plane)
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import * as gen from '../scripts/generate.mjs';

const fn = (name) => {
  assert.equal(typeof gen[name], 'function', `scripts/generate.mjs must export ${name}()`);
  return gen[name];
};

// Sample data, not real numbers.
const NODES = [
  { languages: { edges: [{ size: 420000, node: { name: 'TypeScript', color: '#3178c6' } }, { size: 18000, node: { name: 'CSS', color: '#663399' } }] } },
  { languages: { edges: [{ size: 180000, node: { name: 'TypeScript', color: '#3178c6' } }, { size: 12000, node: { name: 'CSS', color: '#663399' } }, { size: 6000, node: { name: 'HTML', color: '#e34c26' } }] } },
  { languages: { edges: [{ size: 38000, node: { name: 'HTML', color: '#e34c26' } }, { size: 22000, node: { name: 'CSS', color: '#663399' } }] } },
  { languages: { edges: [{ size: 96000, node: { name: 'Python', color: '#3572A5' } }] } },
  { languages: { edges: [{ size: 40000, node: { name: 'Python', color: '#3572A5' } }] } },
  { languages: { edges: [{ size: 210000, node: { name: 'Go', color: '#00ADD8' } }, { size: 150000, node: { name: 'TypeScript', color: '#3178c6' } }] } },
  { languages: { edges: [{ size: 130000, node: { name: 'TypeScript', color: '#3178c6' } }, { size: 1500, node: { name: 'Dockerfile', color: null } }] } },
];

// AC-1
test('AC-1 query asks only owner repos without forks, private and archived included', () => {
  assert.equal(typeof gen.REPO_QUERY, 'string', 'scripts/generate.mjs must export REPO_QUERY');
  assert.match(gen.REPO_QUERY, /ownerAffiliations:\s*OWNER/);
  assert.match(gen.REPO_QUERY, /isFork:\s*false/);
  assert.doesNotMatch(gen.REPO_QUERY, /privacy:|isArchived/);
  const totals = fn('languageTotals')(NODES);
  assert.equal(totals.TypeScript.bytes, 880000);
  assert.equal(totals.Dockerfile.bytes, 1500);
});

// AC-2
test('AC-2 percents are top 5 plus Other, one decimal, largest first', () => {
  const rows = fn('languagePercents')(fn('languageTotals')(NODES));
  assert.deepEqual(rows.map(r => [r.name, r.pct]), [
    ['TypeScript', 66.5], ['Go', 15.9], ['Python', 10.3], ['CSS', 3.9], ['HTML', 3.3], ['Other', 0.1],
  ]);
  const few = fn('languagePercents')({ Go: { bytes: 3, color: null }, Python: { bytes: 1, color: null } });
  assert.deepEqual(few.map(r => r.name), ['Go', 'Python'], 'no Other row with 5 or fewer languages');
});

// AC-3
test('AC-3 languages.svg is 840 wide with title, scan line and one row per language', () => {
  const rows = [{ name: 'TypeScript', color: '#3178c6', pct: 66.5 }, { name: 'Other', color: null, pct: 0.1 }];
  const svg = fn('languagesSvg')(rows);
  assert.match(svg, /^<svg [^>]*width="840"/);
  assert.ok(svg.includes('LANGUAGE STACK'));
  assert.ok(svg.includes('&gt; stack.scan_'));
  assert.ok(svg.includes('>TypeScript<') && svg.includes('>66.5%<'));
  assert.ok(svg.includes('>Other<') && svg.includes('>0.1%<'));
  assert.ok(svg.includes('width="372.4"'), 'TypeScript bar must be 560 * 66.5%');
  assert.ok(svg.includes('#7D858F'), 'missing color falls back to muted');
});

// AC-4
test('AC-4 languages.svg embeds Anton, JetBrains Mono and Chakra Petch, no external URL, max 60 KB', () => {
  const svg = fn('languagesSvg')([{ name: 'TypeScript', color: '#3178c6', pct: 100 }]);
  for (const family of ['Anton', 'JetBrains Mono', 'Chakra Petch']) {
    assert.match(svg, new RegExp(`font-family:\\s*'${family}'[^}]*src:\\s*url\\(data:font/woff;base64,`), `${family} not embedded`);
  }
  const urls = svg.match(/https?:\/\/[^\s"')]+/g) ?? [];
  assert.deepEqual(urls.filter(u => !u.startsWith('http://www.w3.org/')), []);
  assert.ok(Buffer.byteLength(svg) <= 60 * 1024, `size ${Buffer.byteLength(svg)} bytes`);
});

// AC-5
test('AC-5 script exits non-zero without PROFILE_PAT and leaves languages.svg untouched', async () => {
  const file = new URL('../assets/languages.svg', import.meta.url);
  const before = await readFile(file, 'utf8').catch(() => null);
  const env = { ...process.env, PROFILE_PAT: '' };
  const run = spawnSync(process.execPath, [fileURLToPath(new URL('../scripts/generate.mjs', import.meta.url))], { env, encoding: 'utf8' });
  assert.notEqual(run.status, 0, 'must exit non-zero');
  assert.match(run.stderr, /PROFILE_PAT/);
  const after = await readFile(file, 'utf8').catch(() => null);
  assert.equal(after, before, 'languages.svg changed');
});

test('AC-5 fetchLanguages rejects on HTTP error and on GraphQL errors', async () => {
  const fetchLanguages = fn('fetchLanguages');
  const http401 = async () => new Response('nope', { status: 401 });
  await assert.rejects(fetchLanguages('t', http401), /401/);
  const gqlErr = async () => Response.json({ errors: [{ message: 'Resource not accessible' }] });
  await assert.rejects(fetchLanguages('t', gqlErr), /Resource not accessible/);
});

// AC-6
test('AC-6 bars grow once and cursor blinks, both still for reduced motion', () => {
  const svg = fn('languagesSvg')([{ name: 'Go', color: '#00ADD8', pct: 100 }]);
  assert.match(svg, /@keyframes grow\s*\{\s*from\s*\{\s*transform:\s*scaleX\(0\)/);
  assert.match(svg, /\.bar\s*\{[^}]*animation:\s*grow [^;}]*both/);
  assert.match(svg, /\.cursor\s*\{[^}]*animation:\s*blink 1s steps\(1\) infinite/);
  assert.match(svg, /@media \(prefers-reduced-motion: reduce\)\s*\{[^}]*\.bar[^}]*\.cursor[^}]*animation:\s*none|@media \(prefers-reduced-motion: reduce\)\s*\{[^}]*\.cursor[^}]*\.bar[^}]*animation:\s*none/);
});

// AC-7
test('AC-7 README shows languages.svg above the cta, full width, not linked', async () => {
  const md = await readFile(new URL('../README.md', import.meta.url), 'utf8');
  const img = md.match(/<img src="\.\/assets\/languages\.svg"[^>]*>/)?.[0];
  assert.ok(img, 'languages img missing');
  assert.ok(md.indexOf(img) < md.indexOf('cta.svg'), 'languages must come before the cta at the bottom');
  assert.match(img, /width="100%"/);
  assert.match(img, /alt="Language stack"/);
  assert.ok(!/<a [^>]*>\s*<img src="\.\/assets\/languages\.svg"/.test(md), 'languages must not be linked');
});

// Security finding (05-TESTING): color from the API must be a hex color
test('AC-3 color that is not a hex value falls back to muted', () => {
  const svg = fn('languagesSvg')([{ name: 'Evil', color: '#fff" onload="x', pct: 50 }]);
  assert.ok(!svg.includes('onload'), 'color must not reach the svg');
  assert.ok(svg.includes('fill="#7D858F"'));
});

// AC-9
test('AC-9 repos named in the IGNORED_REPOS env are left out of the totals', () => {
  assert.match(gen.REPO_QUERY ?? '', /nodes\s*\{\s*name\b/, 'query must ask repo name');
  assert.deepEqual(fn('parseIgnored')(' practice-a, practice-b ,'), ['practice-a', 'practice-b']);
  assert.deepEqual(fn('parseIgnored')(undefined), []);
  const totals = fn('languageTotals')([
    { name: 'practice-a', languages: { edges: [{ size: 1500000, node: { name: 'HTML', color: '#e34c26' } }] } },
    { name: 'repo-b', languages: { edges: [{ size: 100, node: { name: 'TypeScript', color: '#3178c6' } }] } },
  ], ['practice-a']);
  assert.deepEqual(Object.keys(totals), ['TypeScript']);
});
