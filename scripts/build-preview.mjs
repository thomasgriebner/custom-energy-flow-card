import { rollup } from 'rollup';
import typescript from '@rollup/plugin-typescript';
import resolve from '@rollup/plugin-node-resolve';
import { writeFileSync, copyFileSync, mkdirSync } from 'node:fs';

const previewSrc = `
import { scenarios, buildMockHass } from '../../examples/preview-mocks';

const card = document.getElementById('card') as HTMLElement & {
  setConfig: (c: unknown) => void;
  hass: unknown;
};
const list = document.getElementById('scenarios') as HTMLElement;

function activate(idx: number): void {
  const sc = scenarios[idx];
  if (!sc) return;
  card.setConfig(sc.config);
  card.hass = buildMockHass(sc);
  for (const btn of Array.from(list.children)) btn.classList.remove('active');
  list.children[idx]?.classList.add('active');
}

scenarios.forEach((sc, idx) => {
  const btn = document.createElement('button');
  btn.textContent = sc.emoji + ' ' + sc.name;
  btn.addEventListener('click', () => activate(idx));
  list.appendChild(btn);
});
activate(0);
`;

mkdirSync('dist/preview', { recursive: true });
writeFileSync('dist/preview/_preview-entry.ts', previewSrc);

const bundle = await rollup({
  input: 'dist/preview/_preview-entry.ts',
  plugins: [
    resolve(),
    typescript({ tsconfig: './tsconfig.preview.json' }),
  ],
});
await bundle.write({ file: 'dist/preview/preview.mjs', format: 'es', sourcemap: true });
await bundle.close();

copyFileSync('examples/preview.html', 'dist/preview/preview.html');
console.log('Preview built: dist/preview/preview.html');
