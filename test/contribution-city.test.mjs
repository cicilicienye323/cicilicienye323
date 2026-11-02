// Work item: contribution-city (no Plane)
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import * as gen from '../scripts/generate.mjs';

const fn = (name) => {
  assert.equal(typeof gen[name], 'function', `scripts/generate.mjs must export ${name}()`);
  return gen[name];
};

// Sample calendar: 2 weeks, tie of 40 on Aug 15 and Aug 22, totalContributions from GitHub.
const day = (date, contributionCount) => ({ date, contributionCount });
const CAL = {
  totalContributions: 870,
  weeks: [
    { contributionDays: [day('2026-08-09', 0), day('2026-08-10', 3), day('2026-08-11', 0), day('2026-08-12', 0), day('2026-08-13', 1), day('2026-08-14', 0), day('2026-08-15', 40)] },
    { contributionDays: [day('2026-08-16', 0), day('2026-08-17', 0), day('2026-08-18', 0), day('2026-08-19', 5), day('2026-08-20', 0), day('2026-08-21', 0), day('2026-08-22', 40)] },
  ],
};

// AC-1
test('AC-1 calendar query covers the last year without from/to', () => {
  assert.equal(typeof gen.CALENDAR_QUERY, 'string', 'scripts/generate.mjs must export CALENDAR_QUERY');
  assert.match(gen.CALENDAR_QUERY, /viewer\s*\{\s*contributionsCollection\s*\{\s*contributionCalendar/);
  assert.match(gen.CALENDAR_QUERY, /totalContributions/);
  assert.match(gen.CALENDAR_QUERY, /contributionDays\s*\{\s*date\s+contributionCount/);
  assert.doesNotMatch(gen.CALENDAR_QUERY, /\bfrom:|\bto:/);
});

// AC-2
test('AC-2 stats: GitHub total, active days, busiest day with latest date on ties', () => {
  assert.deepEqual(fn('cityStats')(CAL), { total: 870, active: 5, busiest: { date: '2026-08-22', count: 40 } });
});

// AC-3
test('AC-3 city.svg is 840 wide with labels, one block per day and three KPIs', () => {
  const svg = fn('citySvg')(CAL);
  assert.match(svg, /^<svg [^>]*width="840"/);
  assert.ok(svg.includes('CONTRIBUTION MAP · LAST 365 DAYS'));
  assert.ok(svg.includes('THE CITY I BUILT THIS YEAR'));
  assert.ok(svg.includes('>870<') && svg.includes('>5<') && svg.includes('>Aug 22<'));
  assert.ok(svg.includes('BUSIEST DAY · 40'));
  const city = svg.slice(svg.indexOf('<g class="city"'), svg.indexOf('</g>', svg.indexOf('<g class="city"')));
  assert.equal((city.match(/fill="#232930"/g) ?? []).length, 9, 'one base per empty day');
  assert.equal((city.match(/<polygon /g) ?? []).length, 9 + 5 * 3, 'three faces per active day');
});

// AC-4
test('AC-4 city.svg embeds three fonts, no external URL, max 100 KB for 371 busy days', () => {
  const full = { totalContributions: 9999, weeks: Array.from({ length: 53 }, (_, w) => ({
    contributionDays: Array.from({ length: 7 }, (_, d) => day(`2026-01-01`, 1 + ((w * 7 + d) % 50))),
  })) };
  const svg = fn('citySvg')(full);
  for (const family of ['Anton', 'JetBrains Mono', 'Chakra Petch']) {
    assert.match(svg, new RegExp(`font-family:\\s*'${family}'[^}]*src:\\s*url\\(data:font/woff;base64,`), `${family} not embedded`);
  }
  const urls = svg.match(/https?:\/\/[^\s"')]+/g) ?? [];
  assert.deepEqual(urls.filter(u => !u.startsWith('http://www.w3.org/')), []);
  assert.ok(Buffer.byteLength(svg) <= 100 * 1024, `size ${Buffer.byteLength(svg)} bytes`);
});

// AC-5
test('AC-5 fetchCalendar rejects on HTTP error and on GraphQL errors', async () => {
  const fetchCalendar = fn('fetchCalendar');
  await assert.rejects(fetchCalendar('t', async () => new Response('no', { status: 502 })), /502/);
  await assert.rejects(fetchCalendar('t', async () => Response.json({ errors: [{ message: 'Bad credentials' }] })), /Bad credentials/);
});

// AC-6
test('AC-6 README shows city.svg between the cta and languages, full width, not linked', async () => {
  const md = await readFile(new URL('../README.md', import.meta.url), 'utf8');
  const img = md.match(/<img src="\.\/assets\/city\.svg"[^>]*>/)?.[0];
  assert.ok(img, 'city img missing');
  const at = md.indexOf(img);
  assert.ok(md.indexOf('cta.svg') < at && at < md.indexOf('languages.svg'), 'city must sit between cta and languages');
  assert.match(img, /width="100%"/);
  assert.match(img, /alt="Contribution city"/);
  assert.ok(!/<a [^>]*>\s*<img src="\.\/assets\/city\.svg"/.test(md), 'city must not be linked');
});

// Security finding (05-TESTING): totalContributions must be a number in the svg
test('AC-3 a non-numeric total from the API never reaches the svg as markup', () => {
  const svg = fn('citySvg')({ ...CAL, totalContributions: '<x>' });
  assert.ok(!svg.includes('<x>'), 'raw total reached the svg');
  assert.ok(svg.includes('>0<'), 'non-numeric total shows as 0');
});
