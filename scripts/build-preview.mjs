import { rollup } from 'rollup';
import typescript from '@rollup/plugin-typescript';
import resolve from '@rollup/plugin-node-resolve';
import { writeFileSync, copyFileSync, mkdirSync, readFileSync, statSync } from 'node:fs';
import { createServer } from 'node:http';
import { extname, join, normalize, resolve as resolvePath } from 'node:path';

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
  plugins: [resolve(), typescript({ tsconfig: './tsconfig.preview.json' })],
});
await bundle.write({ file: 'dist/preview/preview.mjs', format: 'es', sourcemap: true });
await bundle.close();

copyFileSync('examples/preview.html', 'dist/preview/preview.html');
console.log('Preview built: dist/preview/preview.html');

const noServe = process.argv.includes('--no-serve');
if (noServe) {
  process.exit(0);
}

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.mjs': 'application/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.map': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.ico': 'image/x-icon',
};

const ROOT = resolvePath('dist');
const PORT = Number(process.env.PORT ?? 5173);

const server = createServer((req, res) => {
  const urlPath = decodeURIComponent((req.url ?? '/').split('?')[0]);
  let filePath = normalize(join(ROOT, urlPath));
  if (!filePath.startsWith(ROOT)) {
    res.writeHead(403);
    res.end('Forbidden');
    return;
  }
  try {
    const stat = statSync(filePath);
    if (stat.isDirectory()) {
      filePath = join(filePath, 'preview.html');
    }
    const ext = extname(filePath);
    const type = MIME[ext] ?? 'application/octet-stream';
    res.writeHead(200, { 'Content-Type': type, 'Cache-Control': 'no-store' });
    res.end(readFileSync(filePath));
  } catch {
    res.writeHead(404, { 'Content-Type': 'text/plain' });
    res.end('Not found');
  }
});

server.listen(PORT, '127.0.0.1', () => {
  const url = `http://127.0.0.1:${PORT}/preview/preview.html`;
  console.log(`Sandbox running at ${url}`);
  console.log('Press Ctrl-C to stop.');
});
