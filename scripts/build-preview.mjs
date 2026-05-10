import { build } from 'rollup';
import typescript from '@rollup/plugin-typescript';
import resolve from '@rollup/plugin-node-resolve';
import { writeFileSync, copyFileSync, mkdirSync } from 'node:fs';

const previewSrc = `
import { scenarios, buildMockHass } from '../../examples/preview-mocks';

const card = document.getElementById('card');
const list = document.getElementById('scenarios');

function activate(idx) {
  const sc = scenarios[idx];
  card.setConfig(sc.config);
  card.hass = buildMockHass(sc);
  for (const btn of list.children) btn.classList.remove('active');
  list.children[idx].classList.add('active');
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

const bundle = await build({
  input: 'dist/preview/_preview-entry.ts',
  plugins: [
    resolve(),
    typescript({
      tsconfig: './tsconfig.json',
      include: ['dist/preview/**/*.ts', 'examples/**/*.ts', 'src/**/*.ts'],
      compilerOptions: { rootDir: '.', outDir: 'dist/preview' },
    }),
  ],
});
await bundle.write({ file: 'dist/preview/preview.mjs', format: 'es', sourcemap: true });
await bundle.close();

copyFileSync('examples/preview.html', 'dist/preview/preview.html');
console.log('Preview built: dist/preview/preview.html');
