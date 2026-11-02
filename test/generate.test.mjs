import test from 'node:test';
import assert from 'node:assert/strict';
import { placeholderSvg, tokens } from '../scripts/generate.mjs';

test('placeholder is an 840px wide svg in brand lime', () => {
  const svg = placeholderSvg();
  assert.match(svg, /^<svg [^>]*width="840"/);
  assert.ok(svg.includes(tokens.lime));
  assert.ok(svg.trimEnd().endsWith('</svg>'));
});
