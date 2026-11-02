// Writes the profile SVGs into assets/.
import { mkdir, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';

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

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const out = new URL('../assets/', import.meta.url);
  await mkdir(out, { recursive: true });
  await writeFile(new URL('header.svg', out), headerSvg());
  console.log('wrote assets/header.svg');
}
