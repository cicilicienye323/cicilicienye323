// Writes the profile SVGs into assets/.
import { readFileSync } from 'node:fs';
import { mkdir, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';

// Subset fonts, all OFL (see fonts/OFL-*.txt). Chakra Petch and Anton hold only
// the glyphs of fixed labels: rebuild them when a label gets a new character.
// JetBrains Mono holds all printable ASCII because language names change.
const face = (family, file, weight) => {
  const b64 = readFileSync(new URL(`../fonts/${file}`, import.meta.url)).toString('base64');
  return `@font-face { font-family: '${family}'; font-weight: ${weight}; src: url(data:font/woff;base64,${b64}) format('woff'); }`;
};
const chakra = face('Chakra Petch', 'ChakraPetch-Bold-subset.woff', 700);
const fontFace = `<style>${chakra}</style>`;
const languagesFontFace = `<style>${chakra} ${face('Anton', 'Anton-subset.woff', 400)} ${face('JetBrains Mono', 'JetBrainsMono-Regular-subset.woff', 400)}</style>`;

export const tokens = {
  surface: '#181B1F',
  surface2: '#1D2228',
  lime: '#C6FF00',
  magenta: '#FF2E88',
  cyan: '#19E3FF',
  muted: '#7D858F',
  line: '#2a3037',
};

const RING_TEXT = 'READY · TO · WORK · ACROSS · THE · DESIGN · &amp; · CODE · VERSE ·';
const FONT = "font-family=\"'Chakra Petch', sans-serif\" font-weight=\"700\"";

// Halftone shard with a magenta/cyan misprint edge.
function shard(x, y, deg, pts) {
  return `<g transform="translate(${x} ${y}) rotate(${deg})">
    <polygon points="${pts}" fill="${tokens.magenta}" opacity=".8" transform="translate(-2 0)"/>
    <polygon points="${pts}" fill="${tokens.cyan}" opacity=".8" transform="translate(2 0)"/>
    <polygon points="${pts}" fill="${tokens.surface}"/>
    <polygon points="${pts}" fill="url(#dots)"/>
  </g>`;
}

export function headerSvg() {
  const w = 840, h = 300, cx = 420, cy = 150, cut = 14;
  const frame = `${cut},0 ${w},0 ${w},${h - cut} ${w - cut},${h} 0,${h} 0,${cut}`;
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}" role="img" aria-label="Status active">
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${tokens.surface}"/><stop offset="1" stop-color="${tokens.surface2}"/></linearGradient>
    <pattern id="grid" width="28" height="28" patternUnits="userSpaceOnUse"><path d="M28 0H0V28" fill="none" stroke="#fff" stroke-opacity=".04"/></pattern>
    <pattern id="dots" width="6" height="6" patternUnits="userSpaceOnUse"><circle cx="3" cy="3" r="1.2" fill="${tokens.lime}"/></pattern>
    <path id="circ" d="M${cx},${cy} m-96,0 a96,96 0 1,1 192,0 a96,96 0 1,1 -192,0"/>
  </defs>
  ${fontFace}
  <style>
    .spin { transform-origin: ${cx}px ${cy}px; animation: spin 30s linear infinite; }
    @keyframes spin { to { transform: rotate(360deg); } }
    @media (prefers-reduced-motion: reduce) { .spin { animation: none; } }
  </style>
  <polygon points="${frame}" fill="url(#bg)"/>
  <polygon points="${frame}" fill="url(#grid)"/>
  ${shard(40, 30, 12, '0,0 46,6 38,38 4,30')}
  ${shard(770, 236, -20, '0,0 30,4 26,24 2,20')}
  <g class="spin">
    <circle cx="${cx}" cy="${cy}" r="112" fill="none" stroke="${tokens.lime}" stroke-dasharray="2 7" opacity=".7"/>
    <text ${FONT} font-size="11" letter-spacing="3.2" fill="${tokens.muted}"><textPath href="#circ">${RING_TEXT}</textPath></text>
  </g>
  <circle cx="${cx}" cy="${cy}" r="80" fill="none" stroke="${tokens.line}"/>
  <circle cx="${cx}" cy="${cy}" r="80" fill="none" stroke="${tokens.lime}" stroke-width="3" stroke-dasharray="120 383" transform="rotate(-90 ${cx} ${cy})"/>
  <path d="M${cx} 112 448 122v24c0 18-12 28-28 34-16-6-28-16-28-34V122z" fill="${tokens.lime}"/>
  <polyline points="402,156 413,146 421,151 436,134" fill="none" stroke="#000" stroke-width="4"/>
  <text x="${cx}" y="202" text-anchor="middle" ${FONT} font-size="10" letter-spacing="2" fill="${tokens.lime}">STATUS ACTIVE</text>
</svg>
`;
}

export function ctaSvg() {
  const w = 280, h = 64, cut = 10;
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}" role="img" aria-label="View portfolio">
  ${fontFace}
  <polygon points="${cut},0 ${w},0 ${w},${h - cut} ${w - cut},${h} 0,${h} 0,${cut}" fill="${tokens.lime}"/>
  <text x="${w / 2}" y="38" text-anchor="middle" ${FONT} font-size="15" letter-spacing="3.3" fill="#000">VIEW PORTFOLIO ›</text>
</svg>
`;
}

// Owner repos only; forks dropped by GitHub, private and archived included.
export const REPO_QUERY = `query($cursor: String) {
  viewer {
    repositories(first: 100, after: $cursor, ownerAffiliations: OWNER, isFork: false) {
      pageInfo { hasNextPage endCursor }
      nodes { languages(first: 20) { edges { size node { name color } } } }
    }
  }
}`;

export function languageTotals(nodes) {
  const totals = {};
  for (const { languages } of nodes) {
    for (const { size, node } of languages.edges) {
      totals[node.name] ??= { bytes: 0, color: node.color };
      totals[node.name].bytes += size;
    }
  }
  return totals;
}

// Top 5 by bytes plus an "Other" row for the rest, one decimal.
export function languagePercents(totals) {
  const sorted = Object.entries(totals).sort((a, b) => b[1].bytes - a[1].bytes);
  const sum = sorted.reduce((n, [, t]) => n + t.bytes, 0);
  const pct = (bytes) => Math.round(bytes * 1000 / sum) / 10;
  const rows = sorted.slice(0, 5).map(([name, t]) => ({ name, color: t.color, pct: pct(t.bytes) }));
  const rest = sorted.slice(5).reduce((n, [, t]) => n + t.bytes, 0);
  if (rest > 0) rows.push({ name: 'Other', color: null, pct: pct(rest) });
  return rows;
}

const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

export function languagesSvg(rows) {
  const w = 840, top = 118, rh = 34, h = top + rows.length * rh + 26, cut = 14;
  const frame = `${cut},0 ${w},0 ${w},${h - cut} ${w - cut},${h} 0,${h} 0,${cut}`;
  const mono = `font-family="'JetBrains Mono', monospace"`;
  const body = rows.map(({ name, color, pct }, i) => {
    const y = top + i * rh, c = /^#[0-9a-fA-F]{3,8}$/.test(color ?? '') ? color : tokens.muted, bw = Math.round(560 * pct / 10) / 10;
    return `<circle cx="36" cy="${y + 9}" r="4" fill="${c}"/>
  <text x="52" y="${y + 14}" ${mono} font-size="14" fill="#E9ECEF">${esc(name)}</text>
  <rect x="180" y="${y}" width="560" height="18" fill="#0b0d0f" stroke="#000" stroke-width="2"/>
  <g class="bar"><rect x="181" y="${y + 1}" width="${bw}" height="16" fill="${c}"/><rect x="181" y="${y + 1}" width="${bw}" height="16" fill="url(#ht)"/></g>
  <text x="808" y="${y + 14}" text-anchor="end" ${mono} font-size="14" fill="${tokens.lime}">${pct.toFixed(1)}%</text>`;
  }).join('\n  ');
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}" role="img" aria-label="Language stack">
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${tokens.surface}"/><stop offset="1" stop-color="${tokens.surface2}"/></linearGradient>
    <pattern id="grid" width="28" height="28" patternUnits="userSpaceOnUse"><path d="M28 0H0V28" fill="none" stroke="#fff" stroke-opacity=".04"/></pattern>
    <pattern id="ht" width="5" height="5" patternUnits="userSpaceOnUse"><circle cx="2.5" cy="2.5" r="1.2" fill="#000" fill-opacity=".35"/></pattern>
  </defs>
  ${languagesFontFace}
  <style>
    .bar { transform-box: fill-box; transform-origin: left; animation: grow 1.4s cubic-bezier(.2,.8,.2,1) both; }
    @keyframes grow { from { transform: scaleX(0); } }
    .cursor { animation: blink 1s steps(1) infinite; }
    @keyframes blink { 50% { opacity: 0; } }
    @media (prefers-reduced-motion: reduce) { .bar, .cursor { animation: none; } }
  </style>
  <polygon points="${frame}" fill="url(#bg)"/>
  <polygon points="${frame}" fill="url(#grid)"/>
  <text x="30" y="40" ${FONT} font-size="11" letter-spacing="2.4" fill="${tokens.muted}">SMALL EXPERIMENTS, BIG STACK</text>
  <g transform="translate(30 78) skewX(-8)" font-family="'Anton', Impact, sans-serif" font-size="34">
    <text x="-2" fill="${tokens.magenta}" opacity=".8">LANGUAGE STACK</text><text x="2" fill="${tokens.cyan}" opacity=".8">LANGUAGE STACK</text><text fill="#E9ECEF">LANGUAGE STACK</text>
  </g>
  <text x="30" y="102" ${mono} font-size="13" fill="${tokens.lime}">&gt; stack.scan_<tspan class="cursor">█</tspan></text>
  ${body}
</svg>
`;
}

// All repo pages from GitHub GraphQL. Throws on HTTP or GraphQL errors so the
// workflow fails and the last committed languages.svg stays.
export async function fetchLanguages(token, fetchImpl = fetch) {
  const nodes = [];
  let cursor = null;
  do {
    const res = await fetchImpl('https://api.github.com/graphql', {
      method: 'POST',
      headers: { Authorization: `bearer ${token}`, 'User-Agent': 'cicilicienye323-profile', 'Content-Type': 'application/json' },
      body: JSON.stringify({ query: REPO_QUERY, variables: { cursor } }),
    });
    if (!res.ok) throw new Error(`GitHub API HTTP ${res.status}`);
    const json = await res.json();
    if (json.errors?.length) throw new Error(`GitHub API: ${json.errors[0].message}`);
    const page = json.data.viewer.repositories;
    nodes.push(...page.nodes);
    cursor = page.pageInfo.hasNextPage ? page.pageInfo.endCursor : null;
  } while (cursor);
  return nodes;
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const out = new URL('../assets/', import.meta.url);
  await mkdir(out, { recursive: true });
  for (const [file, svg] of [['header.svg', headerSvg()], ['cta.svg', ctaSvg()]]) {
    await writeFile(new URL(file, out), svg);
    console.log(`wrote assets/${file}`);
  }
  try {
    const token = process.env.PROFILE_PAT;
    if (!token) throw new Error('PROFILE_PAT is not set');
    const rows = languagePercents(languageTotals(await fetchLanguages(token)));
    await writeFile(new URL('languages.svg', out), languagesSvg(rows));
    console.log('wrote assets/languages.svg');
  } catch (err) {
    console.error(`languages.svg not updated: ${err.message}`);
    process.exit(1);
  }
}
