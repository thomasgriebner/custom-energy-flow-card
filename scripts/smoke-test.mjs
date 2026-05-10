import { Window } from 'happy-dom';
import { readFileSync } from 'node:fs';

const window = new Window();
const { document } = window;

// Minimal globals so the bundle loads.
// Lit references CSSStyleSheet/ShadowRoot/Node on globalThis during eval.
globalThis.window = window;
globalThis.document = document;
globalThis.HTMLElement = window.HTMLElement;
globalThis.customElements = window.customElements;
globalThis.CSSStyleSheet = window.CSSStyleSheet;
globalThis.ShadowRoot = window.ShadowRoot;
globalThis.Element = window.Element;
globalThis.Node = window.Node;
globalThis.Document = window.Document;
globalThis.Event = window.Event;
globalThis.CustomEvent = window.CustomEvent;

// happy-dom doesn't ship ResizeObserver; card.ts attaches one in firstUpdated.
// A no-op stub is sufficient for the smoke test — we just need render to succeed.
globalThis.ResizeObserver = class {
  observe() {}
  unobserve() {}
  disconnect() {}
};

// Stub <ha-card> as a transparent wrapper element
window.customElements.define('ha-card', class extends window.HTMLElement {});

const bundle = readFileSync('dist/custom-energy-flow-card.js', 'utf8');
// Node's ESM loader doesn't support blob: URLs, so we use a base64 data: URL
// to dynamically import the built bundle (see Task 5.5 gotchas).
const dataUrl = `data:application/javascript;base64,${Buffer.from(bundle, 'utf8').toString('base64')}`;
await import(dataUrl);

const TYPE = 'custom-energy-flow-card';
const ctor = window.customElements.get(TYPE);
if (!ctor) throw new Error(`smoke-test: ${TYPE} not registered`);
console.log(`✓ ${TYPE} registered`);

const editor = window.customElements.get(`${TYPE}-editor`);
if (!editor) throw new Error(`smoke-test: ${TYPE}-editor not registered`);
console.log(`✓ ${TYPE}-editor registered`);

if (!Array.isArray(window.customCards) || window.customCards.length === 0) {
  throw new Error('smoke-test: window.customCards entry missing');
}
console.log(`✓ customCards entry pushed (${window.customCards[0].type})`);

const card = document.createElement(TYPE);
document.body.appendChild(card);

// Stub-Config darf nicht throwen
const stub = ctor.getStubConfig();
card.setConfig(stub);
console.log('✓ setConfig(stub) accepted');

// Echte Config
card.setConfig({
  type: 'custom:custom-energy-flow-card',
  solar: [{ id: 'dach', power: 'sensor.s_dach' }],
  battery: [],
  grid: { power: 'sensor.grid' },
  consumers: [{ name: 'WP', power: 'sensor.wp' }],
});
console.log('✓ setConfig(realistic) accepted');

// hass setzen → render via Lit-Lifecycle
card.hass = {
  states: {
    'sensor.s_dach': { state: '1500', attributes: { unit_of_measurement: 'W' } },
    'sensor.grid': { state: '0', attributes: { unit_of_measurement: 'W' } },
    'sensor.wp': { state: '300', attributes: { unit_of_measurement: 'W' } },
  },
};
await new Promise((r) => setTimeout(r, 50)); // give Lit a tick to flush updates

const sr = card.shadowRoot;
if (!sr) throw new Error('smoke-test: shadowRoot missing after first render');
const svg = sr.querySelector('svg');
if (!svg) throw new Error('smoke-test: SVG not rendered');
console.log('✓ shadow DOM rendered with SVG');

// Verify the SVG was built from a computed layout (viewBox interpolated from
// LayoutResult.width × LayoutResult.height proves render → layout → engine
// chain ran end-to-end and Lit successfully bound template attributes).
// Note: happy-dom v14 doesn't preserve Lit's nested svg`...` template *child*
// elements (e.g. <circle>, <path>) inside an outer html`...<svg>...` template,
// so we assert on the SVG attributes that Lit *did* interpolate. The full
// child tree is still verified in the browser preview sandbox.
const viewBox = svg.getAttribute('viewBox');
if (!viewBox || !/^0 0 \d+ \d+$/.test(viewBox)) {
  throw new Error(`smoke-test: SVG viewBox not interpolated (got "${viewBox}")`);
}
console.log(`✓ SVG viewBox interpolated from layout (${viewBox})`);

console.log('\nALL SMOKE TESTS PASSED');
