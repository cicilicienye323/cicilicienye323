// Work item: static-cards (no Plane)
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import * as gen from '../scripts/generate.mjs';

const RING_TEXT = 'READY · TO · WORK · ACROSS · THE · DESIGN · &amp; · CODE · VERSE';

function render(name) {
  assert.equal(typeof gen[name], 'function', `scripts/generate.mjs must export ${name}()`);
  return gen[name]();
}

// AC-1
test('AC-1 header.svg is 840x300 with ring text, lime shield and STATUS ACTIVE', () => {
  const svg = render('headerSvg');
  assert.match(svg, /^<svg [^>]*width="840"[^>]*height="300"/);
  assert.ok(svg.includes(RING_TEXT), 'ring text missing');
  assert.ok(svg.includes('STATUS ACTIVE'), 'badge label missing');
  assert.ok(svg.includes('#C6FF00'), 'lime missing');
});

// AC-2
test('AC-2 ring rotates via CSS keyframes and stops for reduced motion', () => {
  const svg = render('headerSvg');
  assert.match(svg, /@keyframes \w+\s*\{\s*to\s*\{\s*transform:\s*rotate\(360deg\)/);
  assert.match(svg, /animation:\s*\w+ 30s linear infinite/);
  assert.match(svg, /@media \(prefers-reduced-motion: reduce\)\s*\{[^}]*animation:\s*none/);
});

// AC-3
test('AC-3 cta.svg is a 280x64 button reading VIEW PORTFOLIO ›', () => {
  const svg = render('ctaSvg');
  assert.match(svg, /^<svg [^>]*width="280"[^>]*height="64"/);
  assert.ok(svg.includes('VIEW PORTFOLIO ›'), 'button label missing');
  assert.ok(svg.includes('#C6FF00'), 'lime missing');
});

// AC-4
for (const name of ['headerSvg', 'ctaSvg']) {
  test(`AC-4 ${name} embeds Chakra Petch as base64 woff, no external URL, max 30 KB`, () => {
    const svg = render(name);
    assert.match(svg, /@font-face\s*\{[^}]*font-family:\s*'Chakra Petch'[^}]*src:\s*url\(data:font\/woff;base64,[A-Za-z0-9+/=]+\)/);
    const urls = svg.match(/https?:\/\/[^\s"')]+/g) ?? [];
    assert.deepEqual(urls.filter(u => !u.startsWith('http://www.w3.org/')), []);
    assert.ok(Buffer.byteLength(svg) <= 30 * 1024, `size ${Buffer.byteLength(svg)} bytes`);
  });
}

// AC-5
test('AC-5 README shows header without link, then cta linked to # at fixed 280 width', async () => {
  const md = await readFile(new URL('../README.md', import.meta.url), 'utf8');
  const header = md.match(/<img src="\.\/assets\/header\.svg"[^>]*>/)?.[0];
  const cta = md.match(/<a href="#">\s*<img src="\.\/assets\/cta\.svg"[^>]*>\s*<\/a>/)?.[0];
  assert.ok(header, 'header img missing');
  assert.ok(cta, 'cta img wrapped in <a href="#"> missing');
  assert.ok(md.indexOf(header) < md.indexOf(cta), 'header must come before cta');
  assert.ok(!/<a [^>]*>\s*<img src="\.\/assets\/header\.svg"/.test(md), 'header must not be linked');
  assert.match(header, /alt="Status active"/);
  assert.match(header, /width="100%"/);
  assert.match(cta, /alt="View portfolio"/);
  assert.match(cta, /width="280"/);
});
