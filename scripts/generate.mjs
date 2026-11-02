// Writes the profile SVGs into assets/.
// Bootstrap state: one placeholder card, no GitHub data yet.
import { mkdir, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';

export const tokens = {
  bg: '#0F1113',
  surface: '#181B1F',
  lime: '#C6FF00',
  muted: '#7D858F',
};

export function placeholderSvg() {
  const w = 840, h = 200, cut = 14;
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}">
  <polygon points="${cut},0 ${w},0 ${w},${h - cut} ${w - cut},${h} 0,${h} 0,${cut}" fill="${tokens.surface}"/>
  <circle cx="${w / 2}" cy="${h / 2}" r="60" fill="none" stroke="${tokens.lime}" stroke-width="3"/>
  <text x="${w / 2}" y="${h / 2 + 5}" text-anchor="middle" font-family="monospace" font-size="14" fill="${tokens.muted}">SIENVERSE</text>
</svg>
`;
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const out = new URL('../assets/', import.meta.url);
  await mkdir(out, { recursive: true });
  await writeFile(new URL('header.svg', out), placeholderSvg());
  console.log('wrote assets/header.svg');
}
