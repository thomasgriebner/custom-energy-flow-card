// Builds a self-contained ESM bundle of Lit (svg/render/html) for the
// Phase 0 spike (`examples/preview-spike-haicon.html`).
//
// The spike must run in a real browser with only a static HTTP server,
// without an import map or CDN, so we pre-bundle Lit once and commit the
// output next to the HTML. Re-run this script if the Lit dependency is
// bumped.
//
//   node scripts/build-spike-haicon-bundle.mjs

import { rollup } from 'rollup';
import resolve from '@rollup/plugin-node-resolve';
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname } from 'node:path';

const ENTRY = 'scripts/.spike-haicon-entry.mjs';
const OUT = 'examples/preview-spike-haicon.bundle.mjs';

mkdirSync(dirname(ENTRY), { recursive: true });
writeFileSync(ENTRY, `export { svg, render, html } from 'lit';\n`);

const bundle = await rollup({
  input: ENTRY,
  plugins: [resolve()],
});
await bundle.write({ file: OUT, format: 'es' });
await bundle.close();

console.log(`Wrote ${OUT}`);
