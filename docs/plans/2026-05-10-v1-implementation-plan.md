# Custom Energy Flow Card v1.0 — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build v1.0 of `custom-energy-flow-card` — a Lovelace custom card for Home Assistant that visualizes the live energy flow of a multi-source household (N PVs, N batteries 1:1-paired with PVs, N consumers, 1 grid, 1 home).

**Architecture:** Layered TypeScript Lit-Element with strict separation: `util/` (shared helpers, single-source) — `engine/` (pure functions for energy balance) — `config/` (schema + HA-state mapping) — `render/` (SVG + CSS animation) — `ha/` (HA event helpers) — `card.ts` (orchestrator, ≤200 LOC) — `editor.ts` (Lovelace GUI editor). Layer boundaries lint-enforced.

**Tech Stack:** TypeScript 5.4 strict, Lit 3.2, Rollup 4.13, Vitest 1.4, pnpm 9, Node 20+. Build to single ES2022 bundle ≤60 kB. HACS-distributed.

**Reference documents (consult before each task):**
- Full spec: `docs/specs/2026-05-10-custom-energy-flow-card-design.md`
- Architecture: `docs/architecture.md`
- ADRs: `docs/adr/`
- Conventions: `docs/conventions.md`
- Project quick-ref: `CLAUDE.md`

**Phases:**
- 0. Project bootstrap (1 task)
- 1. Foundation: util, i18n, engine, config (11 tasks)
- 2. Renderer + Sandbox (6 tasks)
- 3. HA-Integration (4 tasks)
- 4. Editor (3 tasks)
- 5. Polish & Release (3 tasks)

**Working directory:** All paths in this plan are relative to `/home/griebner/repos/custom-energy-flow-card/`. Commands assume `cd` to that directory.

---

## Phase 0 — Project Bootstrap

### Task 0.1: Tooling configuration

**Files:**
- Create: `package.json`
- Create: `tsconfig.json`
- Create: `rollup.config.mjs`
- Create: `vitest.config.ts`
- Create: `.eslintrc.cjs`
- Create: `.prettierrc.json`
- Create: `.prettierignore`
- Create: `.lintstagedrc.json`
- Create: `.husky/pre-commit`
- Create: `.github/workflows/ci.yml`
- Create: `.github/workflows/release.yml`
- Create: `src/index.ts` (placeholder)

- [ ] **Step 1: Create `package.json`**

```json
{
  "name": "custom-energy-flow-card",
  "version": "0.9.0",
  "type": "module",
  "module": "dist/custom-energy-flow-card.js",
  "scripts": {
    "dev": "rollup -c -w",
    "build": "NODE_ENV=production rollup -c",
    "build:analyze": "ANALYZE=1 rollup -c",
    "test": "vitest run",
    "test:watch": "vitest",
    "test:coverage": "vitest run --coverage",
    "lint": "eslint 'src/**/*.ts'",
    "format": "prettier --write 'src/**/*.{ts,json,md}'",
    "typecheck": "tsc --noEmit",
    "check": "pnpm lint && pnpm typecheck && pnpm test",
    "preview": "node scripts/build-preview.mjs",
    "prepare": "husky"
  },
  "devDependencies": {
    "@rollup/plugin-node-resolve": "^15.2.0",
    "@rollup/plugin-typescript": "^11.1.0",
    "@types/node": "^20.11.0",
    "@typescript-eslint/eslint-plugin": "^7.4.0",
    "@typescript-eslint/parser": "^7.4.0",
    "@vitest/coverage-v8": "^1.4.0",
    "eslint": "^8.57.0",
    "eslint-plugin-import": "^2.29.0",
    "happy-dom": "^14.0.0",
    "husky": "^9.0.0",
    "lint-staged": "^15.2.0",
    "prettier": "^3.2.0",
    "rollup": "^4.13.0",
    "rollup-plugin-terser": "^7.0.2",
    "rollup-plugin-visualizer": "^5.12.0",
    "tslib": "^2.6.0",
    "typescript": "^5.4.0",
    "vitest": "^1.4.0"
  },
  "dependencies": {
    "lit": "^3.2.0"
  },
  "packageManager": "pnpm@9.0.0"
}
```

- [ ] **Step 2: Create `tsconfig.json`**

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "ESNext",
    "moduleResolution": "bundler",
    "lib": ["ES2022", "DOM", "DOM.Iterable"],
    "experimentalDecorators": true,
    "useDefineForClassFields": false,
    "strict": true,
    "noUncheckedIndexedAccess": true,
    "noImplicitOverride": true,
    "noFallthroughCasesInSwitch": true,
    "noPropertyAccessFromIndexSignature": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true,
    "outDir": "dist",
    "rootDir": "src",
    "importHelpers": true
  },
  "include": ["src/**/*"],
  "exclude": ["**/*.test.ts"]
}
```

- [ ] **Step 3: Create `rollup.config.mjs`**

```javascript
import typescript from '@rollup/plugin-typescript';
import resolve from '@rollup/plugin-node-resolve';
import { terser } from 'rollup-plugin-terser';
import { visualizer } from 'rollup-plugin-visualizer';

const isProd = process.env.NODE_ENV === 'production';
const isAnalyze = process.env.ANALYZE === '1';

export default {
  input: 'src/index.ts',
  output: {
    file: 'dist/custom-energy-flow-card.js',
    format: 'es',
    sourcemap: true,
  },
  plugins: [
    resolve(),
    typescript({ tsconfig: './tsconfig.json' }),
    isProd && terser(),
    isAnalyze && visualizer({ filename: 'dist/bundle-stats.html', open: false }),
  ].filter(Boolean),
};
```

- [ ] **Step 4: Create `vitest.config.ts`**

```typescript
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    environmentMatchGlobs: [
      ['**/editor.test.ts', 'happy-dom'],
      ['**/card.test.ts', 'happy-dom'],
    ],
    coverage: {
      provider: 'v8',
      include: ['src/engine/**', 'src/config/**', 'src/util/**'],
      exclude: ['**/*.test.ts'],
      thresholds: {
        statements: 90,
        branches: 90,
        functions: 90,
        lines: 90,
      },
    },
  },
});
```

- [ ] **Step 5: Create `.eslintrc.cjs`**

```javascript
module.exports = {
  parser: '@typescript-eslint/parser',
  parserOptions: { ecmaVersion: 2022, sourceType: 'module' },
  plugins: ['@typescript-eslint', 'import'],
  extends: [
    'eslint:recommended',
    'plugin:@typescript-eslint/recommended',
    'plugin:import/typescript',
  ],
  settings: {
    'import/resolver': { typescript: true, node: true },
  },
  rules: {
    'import/no-restricted-paths': ['error', {
      zones: [
        { target: './src/engine', from: './src',
          except: ['./engine', './util/memo.ts', './util/warning-types.ts'] },
        { target: './src/config', from: './src',
          except: ['./config', './util', './engine/types.ts', './i18n'] },
        { target: './src/render', from: './src',
          except: ['./render', './util', './engine/types.ts', './engine/flow-graph.ts',
                   './config/types.ts', './const.ts', './i18n'] },
        { target: './src/util', from: './src', except: ['./util'] },
        { target: './src/i18n', from: './src', except: ['./i18n'] },
        { target: './src/ha', from: './src',
          except: ['./ha', './config/types.ts', './engine/types.ts'] },
        { target: './src/editor.ts', from: './src',
          except: ['./config', './ha', './util', './i18n', './const.ts'] },
      ],
    }],
    '@typescript-eslint/no-explicit-any': 'error',
    '@typescript-eslint/no-non-null-assertion': 'error',
    '@typescript-eslint/explicit-function-return-type': ['error', {
      allowExpressions: true,
    }],
  },
  overrides: [
    {
      files: ['*.test.ts'],
      rules: {
        '@typescript-eslint/explicit-function-return-type': 'off',
      },
    },
  ],
  ignorePatterns: ['dist/', 'node_modules/', '*.cjs', '*.mjs'],
};
```

- [ ] **Step 6: Create `.prettierrc.json`**

```json
{
  "singleQuote": true,
  "trailingComma": "all",
  "printWidth": 100,
  "tabWidth": 2,
  "semi": true,
  "arrowParens": "always"
}
```

- [ ] **Step 7: Create `.prettierignore`**

```
dist/
node_modules/
.superpowers/
pnpm-lock.yaml
```

- [ ] **Step 8: Create `.lintstagedrc.json`**

```json
{
  "*.ts": ["prettier --write", "eslint --fix"],
  "*.{json,md,yaml,yml}": ["prettier --write"]
}
```

- [ ] **Step 9: Create `.husky/pre-commit`**

```bash
#!/usr/bin/env sh
. "$(dirname -- "$0")/_/husky.sh"
pnpm lint-staged
```

After creating, run: `chmod +x .husky/pre-commit`

- [ ] **Step 10: Create `.github/workflows/ci.yml`**

```yaml
name: CI
on:
  push: { branches: [main] }
  pull_request:
jobs:
  check:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: pnpm/action-setup@v3
        with: { version: 9 }
      - uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: pnpm
      - run: pnpm install --frozen-lockfile
      - run: pnpm check
      - run: pnpm build
      - name: Bundle size check
        run: |
          SIZE=$(stat -c%s dist/custom-energy-flow-card.js)
          echo "Bundle: $SIZE bytes"
          [ "$SIZE" -le 61440 ] || (echo "Bundle exceeds 60 kB (61440 bytes)" && exit 1)
```

- [ ] **Step 11: Create `.github/workflows/release.yml`**

```yaml
name: Release
on:
  push: { tags: ['v*'] }
jobs:
  release:
    runs-on: ubuntu-latest
    permissions: { contents: write }
    steps:
      - uses: actions/checkout@v4
      - uses: pnpm/action-setup@v3
        with: { version: 9 }
      - uses: actions/setup-node@v4
        with: { node-version: 20, cache: pnpm }
      - run: pnpm install --frozen-lockfile
      - run: pnpm build
      - uses: softprops/action-gh-release@v2
        with:
          files: dist/custom-energy-flow-card.js
```

- [ ] **Step 12: Create placeholder `src/index.ts`**

```typescript
// Phase 0 placeholder; replaced in Phase 3 Task 3.4 with full registration.
export const PLACEHOLDER = 'custom-energy-flow-card';
```

- [ ] **Step 13: Append to `.gitignore`**

Append `dist/` if not already there. Current contents of `.gitignore` after Phase 0 should include: `.superpowers/`, `node_modules/`, `dist/`, `*.log`, `.DS_Store`. (Already in repo from session start; verify.)

Run: `cat .gitignore`
Expected: includes the lines above.

- [ ] **Step 14: Install dependencies and verify**

Run: `pnpm install`
Expected: succeeds, creates `pnpm-lock.yaml`, sets up husky.

Run: `pnpm typecheck`
Expected: PASS (placeholder src/index.ts compiles).

Run: `pnpm lint`
Expected: PASS (no real source yet).

Run: `pnpm test`
Expected: PASS (no test files; vitest reports "no tests found", exit 0).

- [ ] **Step 15: Commit**

```bash
git add -A
git commit -m "chore: project bootstrap (toolchain, configs, CI workflows)"
```

### Task 0.2: Reference-Implementation-Comparison-Pass

Vor Phase 1: Da wir keine HA-Test-Instanz haben, validieren wir alle
HA-Integrations-Annahmen gegen die aktuelle `power-flow-card-plus` als Referenz.
Ergebnis ist ein kurzes Memo, das pro HA-Touchpoint dokumentiert: erwartet vs.
beobachtet, und ggf. notwendige Plan-Anpassungen.

**Files:**
- Create: `docs/notes/ha-integration-reference.md` (Memo)

- [ ] **Step 1: Klone power-flow-card-plus zur Referenz**

```bash
git clone --depth 1 https://github.com/flixlix/power-flow-card-plus /tmp/pfcp-ref
```

- [ ] **Step 2: Touchpoints diffen**

Prüfe in `/tmp/pfcp-ref/src/`:

| Touchpoint | Was im pfcp-ref aktuell verwendet wird? | Im Plan vorgesehen? | Match? |
|---|---|---|---|
| `setConfig(config)` | Signatur, Throw-Verhalten | Plan §3.2 | ? |
| `static getConfigElement()` | Returntyp, Element-Tag | Plan Task 3.2 | ? |
| `static getStubConfig(hass, entities)` | Args + Return | Plan Task 3.2 | ? |
| `getCardSize()` | Zahl-Range | Plan Task 3.2 (= 6) | ? |
| `customCards.push({...})` | Pflichtfelder | Plan Task 3.3 | ? |
| `<ha-form>`-Schema | Selector-Format | Plan Task 4.x | ? |
| `<ha-entity-picker>`-Properties | hass, value, includeDomains, weitere? | Plan Task 4.x | ? |
| `value-changed`-Event | Detail-Shape | Plan Task 4.x | ? |
| `config-changed`-Event | Detail-Shape | Plan Task 4.x | ? |
| `fireEvent('hass-more-info')` | Detail.entityId vs entity_id | Plan Task 3.1 | ? |
| HA-CSS-Variablen | `--ha-card-background`, `--primary-text-color`, `--divider-color`, etc. | Plan Task 2.1 | ? |

- [ ] **Step 3: Memo schreiben**

Erstelle `docs/notes/ha-integration-reference.md` mit:
- Pro Touchpoint: Code-Snippet aus pfcp-ref, Plan-Status, ggf. Anpassungs-Bedarf
- Liste der Diffs als Action-Items
- Datum und commit-Hash der Referenz

- [ ] **Step 4: Plan-Patches einarbeiten**

Falls Diffs gefunden: Plan entsprechend patchen, Begründung in der Memo
festhalten. Falls Plan korrekt: Memo dokumentiert das.

- [ ] **Step 5: Commit**

```bash
git add docs/notes/
git commit -m "docs(notes): power-flow-card-plus reference comparison memo"
```

> **Begründung:** ohne Test-HA ist diese Diff-Übung der billigste Weg, um
> ~70 % der HA-Form-/Lifecycle-Annahme-Risiken vor der Implementation zu
> entdecken (statt erst beim Anwender). Aufwand ~2 Std., spart später Tage.

---

## Phase 1 — Foundation: util, i18n, engine, config

> **Order matters:** Phase 1 builds the type system and pure logic first. Each task locks in API contracts that later layers depend on. Do not skip ahead.

### Task 1.1: `util/format-power.ts`

**Files:**
- Create: `src/util/format-power.ts`
- Test: `src/util/format-power.test.ts`

- [ ] **Step 1: Write the failing tests**

Create `src/util/format-power.test.ts`:

```typescript
import { describe, expect, it } from 'vitest';
import { formatPowerW } from './format-power';

describe('formatPowerW', () => {
  it.each([
    [0, { format: 'standard' as const }, '0 W'],
    [1900, { format: 'standard' as const }, '1900 W'],
    [1900, { format: 'grouped' as const, locale: 'de-DE' }, '1.900 W'],
    [1900, { format: 'grouped' as const, locale: 'en-US' }, '1,900 W'],
    [-450, { format: 'standard' as const, signed: true }, '−450 W'],
    [800, { format: 'standard' as const, signed: true }, '+800 W'],
    [0, { format: 'standard' as const, signed: true }, '0 W'],
    [12500, { format: 'grouped' as const, locale: 'de-DE' }, '12.500 W'],
  ])('formats %d with %o → %s', (input, opts, expected) => {
    expect(formatPowerW(input, opts)).toBe(expected);
  });

  it('rounds to integer Watts', () => {
    expect(formatPowerW(1234.7, { format: 'standard' })).toBe('1235 W');
  });

  it('handles NaN gracefully', () => {
    expect(formatPowerW(Number.NaN)).toBe('— W');
  });

  it('renders -0 as 0 W (no minus sign)', () => {
    expect(formatPowerW(-0, { signed: true })).toBe('0 W');
    expect(formatPowerW(-0.4, { signed: true })).toBe('0 W');  // rounds to 0
  });
});
```

- [ ] **Step 2: Run tests — must fail**

Run: `pnpm test src/util/format-power.test.ts`
Expected: FAIL with "Cannot find module './format-power'".

- [ ] **Step 3: Implement `src/util/format-power.ts`**

```typescript
export interface FormatOpts {
  format?: 'standard' | 'grouped';
  signed?: boolean;
  locale?: string;
}

function defaultLocale(): string {
  if (typeof navigator !== 'undefined' && navigator.language) return navigator.language;
  return 'de-DE';
}

export function formatPowerW(value: number, opts: FormatOpts = {}): string {
  if (!Number.isFinite(value)) return '— W';
  const rounded = Math.round(value);
  if (rounded === 0) return '0 W';   // also handles -0 (would otherwise render '−0 W')
  const abs = Math.abs(rounded);
  const grouped = opts.format === 'grouped';
  const locale = opts.locale ?? defaultLocale();
  const formatted = grouped
    ? new Intl.NumberFormat(locale, { useGrouping: true }).format(abs)
    : String(abs);
  if (rounded > 0) return opts.signed ? `+${formatted} W` : `${formatted} W`;
  return `−${formatted} W`;
}
```

- [ ] **Step 4: Run tests — must pass**

Run: `pnpm test src/util/format-power.test.ts`
Expected: PASS, all 10 cases green.

- [ ] **Step 5: Commit**

```bash
git add src/util/format-power.ts src/util/format-power.test.ts
git commit -m "feat(util): add formatPowerW with grouping, signing, locale"
```

### Task 1.2: `util/svg-path.ts` and `util/memo.ts`

**Files:**
- Create: `src/util/svg-path.ts`
- Create: `src/util/memo.ts`
- Test: `src/util/svg-path.test.ts`
- Test: `src/util/memo.test.ts`

- [ ] **Step 1: Write tests for svg-path**

Create `src/util/svg-path.test.ts`:

```typescript
import { describe, expect, it } from 'vitest';
import { bezierPath, straightPath } from './svg-path';

describe('svg-path', () => {
  it('builds a quadratic Bezier path string', () => {
    expect(bezierPath({ x: 10, y: 20 }, { x: 100, y: 200 }, { x: 50, y: 80 }))
      .toBe('M 10 20 Q 50 80 100 200');
  });

  it('builds a straight line path string', () => {
    expect(straightPath({ x: 0, y: 0 }, { x: 100, y: 100 }))
      .toBe('M 0 0 L 100 100');
  });

  it('rounds coordinates to integers', () => {
    expect(straightPath({ x: 1.4, y: 2.6 }, { x: 99.9, y: 0.1 }))
      .toBe('M 1 3 L 100 0');
  });
});
```

- [ ] **Step 2: Write tests for memo**

Create `src/util/memo.test.ts`:

```typescript
import { describe, expect, it, vi } from 'vitest';
import { memoize } from './memo';

describe('memoize', () => {
  it('caches by key function', () => {
    const inner = vi.fn((n: number) => n * 2);
    const memo = memoize(inner, (n) => String(n));
    expect(memo(3)).toBe(6);
    expect(memo(3)).toBe(6);
    expect(inner).toHaveBeenCalledTimes(1);
  });

  it('recomputes on different keys', () => {
    const inner = vi.fn((n: number) => n + 1);
    const memo = memoize(inner, (n) => String(n));
    memo(1);
    memo(2);
    expect(inner).toHaveBeenCalledTimes(2);
  });

  it('evicts oldest entry beyond cache size 10', () => {
    const inner = vi.fn((n: number) => n);
    const memo = memoize(inner, (n) => String(n));
    for (let i = 0; i < 11; i++) memo(i);
    memo(0);
    expect(inner).toHaveBeenCalledTimes(12);
  });
});
```

- [ ] **Step 3: Run tests — must fail**

Run: `pnpm test src/util/svg-path.test.ts src/util/memo.test.ts`
Expected: FAIL (modules not found).

- [ ] **Step 4: Implement `src/util/svg-path.ts`**

```typescript
export interface Point {
  x: number;
  y: number;
}

const r = (n: number): number => Math.round(n);

export function bezierPath(from: Point, to: Point, control: Point): string {
  return `M ${r(from.x)} ${r(from.y)} Q ${r(control.x)} ${r(control.y)} ${r(to.x)} ${r(to.y)}`;
}

export function straightPath(from: Point, to: Point): string {
  return `M ${r(from.x)} ${r(from.y)} L ${r(to.x)} ${r(to.y)}`;
}
```

- [ ] **Step 5: Implement `src/util/memo.ts`**

```typescript
const CACHE_SIZE = 10;

export function memoize<Args extends unknown[], R>(
  fn: (...args: Args) => R,
  keyFn: (...args: Args) => string,
): (...args: Args) => R {
  const cache = new Map<string, R>();
  return (...args: Args): R => {
    const key = keyFn(...args);
    if (cache.has(key)) {
      const value = cache.get(key) as R;
      cache.delete(key);
      cache.set(key, value);
      return value;
    }
    const value = fn(...args);
    cache.set(key, value);
    if (cache.size > CACHE_SIZE) {
      const oldest = cache.keys().next().value;
      if (oldest !== undefined) cache.delete(oldest);
    }
    return value;
  };
}
```

- [ ] **Step 6: Run tests — must pass**

Run: `pnpm test src/util/svg-path.test.ts src/util/memo.test.ts`
Expected: PASS, all green.

- [ ] **Step 7: Commit**

```bash
git add src/util/svg-path.ts src/util/svg-path.test.ts src/util/memo.ts src/util/memo.test.ts
git commit -m "feat(util): add bezierPath/straightPath and LRU memoize"
```

### Task 1.3: `util/resolve-color.ts`

**Files:**
- Create: `src/util/resolve-color.ts`
- Test: `src/util/resolve-color.test.ts`

> **Layer-Note:** `ColorRole` lebt **hier** in `util/`, nicht (wie Spec §2.5
> textuell andeutet) in `config/types.ts`. Grund: `util/resolve-color.ts`
> braucht den Typ als Funktions-Parameter; `util/*` darf laut ESLint-Zones
> nicht aus `config/*` importieren. `config/types.ts` und `render/theme.ts`
> importieren `ColorRole` von hier — Layer-Richtung Util → höher passt zu
> ADR-0002. (Spec §2.5 wird beim ersten Patch-Release angeglichen.)

- [ ] **Step 1: Write the failing tests**

Create `src/util/resolve-color.test.ts`:

```typescript
import { describe, expect, it } from 'vitest';
import { COLOR_DEFAULTS, resolveColor } from './resolve-color';

describe('resolveColor', () => {
  it('returns default for known role without override', () => {
    expect(resolveColor('solar')).toBe(COLOR_DEFAULTS.solar);
    expect(resolveColor('battery')).toBe(COLOR_DEFAULTS.battery);
    expect(resolveColor('grid_import')).toBe(COLOR_DEFAULTS.grid_import);
    expect(resolveColor('grid_export')).toBe(COLOR_DEFAULTS.grid_export);
    expect(resolveColor('home')).toBe(COLOR_DEFAULTS.home);
    expect(resolveColor('consumer')).toBe(COLOR_DEFAULTS.consumer);
    expect(resolveColor('warning')).toBe('#eab308');
  });

  it('uses override when provided', () => {
    expect(resolveColor('solar', { solar: '#abcdef' })).toBe('#abcdef');
  });

  it('falls back to default if override missing for that role', () => {
    expect(resolveColor('battery', { solar: '#abcdef' })).toBe(COLOR_DEFAULTS.battery);
  });
});
```

- [ ] **Step 2: Run tests — must fail**

Run: `pnpm test src/util/resolve-color.test.ts`
Expected: FAIL (module not found).

- [ ] **Step 3: Implement `src/util/resolve-color.ts`**

```typescript
export type ColorRole =
  | 'solar'
  | 'battery'
  | 'grid_import'
  | 'grid_export'
  | 'home'
  | 'consumer'
  | 'warning';

export const COLOR_DEFAULTS: Record<ColorRole, string> = {
  solar: '#f59e0b',
  battery: '#10b981',
  grid_import: '#6b7280',
  grid_export: '#16a34a',
  home: '#ef4444',
  consumer: '#db2777',
  warning: '#eab308',
};

export function resolveColor(
  role: ColorRole,
  overrides?: Partial<Record<ColorRole, string>>,
): string {
  return overrides?.[role] ?? COLOR_DEFAULTS[role];
}
```

- [ ] **Step 4: Run tests — must pass**

Run: `pnpm test src/util/resolve-color.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/util/resolve-color.ts src/util/resolve-color.test.ts
git commit -m "feat(util): add resolveColor with role defaults and overrides"
```

### Task 1.4: `util/warning-types.ts` and `util/read-sensor.ts`

Central HA-sensor reader with unit conversion (W/kW/mW/VA) and unified warning type. Spec §2.7.3, §2.5.

**Files:**
- Create: `src/util/warning-types.ts` (shared warning type — siehe Fix-Note)
- Create: `src/util/read-sensor.ts`
- Test: `src/util/read-sensor.test.ts`

> **Architektur-Note:** Warning-Typen leben in `util/warning-types.ts` als Single
> Source. `engine/types.ts` re-exportiert daraus. So kann `read-sensor` Warnings
> direkt im selben Typ liefern, den die Engine konsumiert — keine Konvertierung,
> keine Doppel-Definition. Die ESLint-Zone für `engine` erlaubt
> `./util/warning-types.ts` als Ausnahme (Task 0.1).

- [ ] **Step 1: Create `src/util/warning-types.ts`**

```typescript
export type EngineWarningCode =
  | 'NEGATIVE_PV'
  | 'PAIRING_DEFICIT'
  | 'BALANCE_DRIFT'
  | 'EXPORT_INCONSISTENT'
  | 'SENSOR_UNAVAILABLE'
  | 'UNIT_UNKNOWN';

export interface EngineWarning {
  code: EngineWarningCode;
  detail: string;
  magnitudeW?: number;
  entityId?: string;
}
```

- [ ] **Step 2: Write the failing tests**

Create `src/util/read-sensor.test.ts`:

```typescript
import { describe, expect, it } from 'vitest';
import { readSensorW, type ReadSensorHassShape } from './read-sensor';

const buildHass = (states: Record<string, { state: string; attributes?: Record<string, unknown> }>): ReadSensorHassShape =>
  ({ states });

describe('readSensorW', () => {
  it('reads W sensor as-is', () => {
    const hass = buildHass({ 'sensor.pv': { state: '1500', attributes: { unit_of_measurement: 'W' } } });
    expect(readSensorW(hass, 'sensor.pv').value).toBe(1500);
  });

  it('converts kW to W', () => {
    const hass = buildHass({ 'sensor.pv': { state: '2.5', attributes: { unit_of_measurement: 'kW' } } });
    expect(readSensorW(hass, 'sensor.pv').value).toBe(2500);
  });

  it('converts mW to W', () => {
    const hass = buildHass({ 'sensor.pv': { state: '500', attributes: { unit_of_measurement: 'mW' } } });
    expect(readSensorW(hass, 'sensor.pv').value).toBe(0.5);
  });

  it('treats missing unit as W', () => {
    const hass = buildHass({ 'sensor.pv': { state: '900' } });
    expect(readSensorW(hass, 'sensor.pv').value).toBe(900);
  });

  it('warns for unknown unit but uses raw', () => {
    const hass = buildHass({ 'sensor.pv': { state: '50', attributes: { unit_of_measurement: 'foo' } } });
    const r = readSensorW(hass, 'sensor.pv');
    expect(r.value).toBe(50);
    expect(r.warning?.code).toBe('UNIT_UNKNOWN');
  });

  it('returns 0 + warning for unavailable state', () => {
    const hass = buildHass({ 'sensor.pv': { state: 'unavailable' } });
    const r = readSensorW(hass, 'sensor.pv');
    expect(r.value).toBe(0);
    expect(r.warning?.code).toBe('SENSOR_UNAVAILABLE');
  });

  it('returns 0 + warning when entity missing', () => {
    const r = readSensorW(buildHass({}), 'sensor.missing');
    expect(r.value).toBe(0);
    expect(r.warning?.code).toBe('SENSOR_UNAVAILABLE');
  });

  it('returns 0 + warning for non-numeric state', () => {
    const hass = buildHass({ 'sensor.pv': { state: 'foo' } });
    const r = readSensorW(hass, 'sensor.pv');
    expect(r.value).toBe(0);
    expect(r.warning?.code).toBe('SENSOR_UNAVAILABLE');
  });

  it('inverts sign when invertSign=true', () => {
    const hass = buildHass({ 'sensor.batt': { state: '500', attributes: { unit_of_measurement: 'W' } } });
    expect(readSensorW(hass, 'sensor.batt', { invertSign: true }).value).toBe(-500);
  });

  it('handles percentage with expectedUnit=%', () => {
    const hass = buildHass({ 'sensor.soc': { state: '75', attributes: { unit_of_measurement: '%' } } });
    expect(readSensorW(hass, 'sensor.soc', { expectedUnit: '%' }).value).toBe(75);
  });
});
```

- [ ] **Step 3: Run tests — must fail**

Run: `pnpm test src/util/read-sensor.test.ts`
Expected: FAIL (module not found).

- [ ] **Step 4: Implement `src/util/read-sensor.ts`**

Hass-Subset wird inline in `util/read-sensor.ts` definiert (`ReadSensorHassShape`).
`HomeAssistant` aus `ha/ha-types.ts` ist Superset davon — das volle Type kommt
in Phase 3 (Task 3.1). `util/` darf laut ESLint-Zones nicht aus `ha/` importieren,
deshalb der lokale Subset-Typ.

```typescript
import type { EngineWarning } from './warning-types';

export interface ReadSensorHassShape {
  states: Record<string, { state: string; attributes?: Record<string, unknown> } | undefined>;
}

export interface SensorReadOpts {
  invertSign?: boolean;
  treatUnavailableAsZero?: boolean;
  expectedUnit?: 'W' | '%';
}

export interface SensorReadResult {
  value: number;
  warning?: EngineWarning;
}

const UNIT_TO_W: Record<string, number> = {
  w: 1,
  watt: 1,
  watts: 1,
  kw: 1000,
  kilowatt: 1000,
  kilowatts: 1000,
  mw: 0.001,
  milliwatt: 0.001,
  milliwatts: 0.001,
  va: 1,
};

const UNAVAILABLE_STATES = new Set(['unavailable', 'unknown', '', 'none']);

export function readSensorW(
  hass: ReadSensorHassShape,
  entityId: string,
  opts: SensorReadOpts = {},
): SensorReadResult {
  const entity = hass.states[entityId];
  if (!entity) {
    return {
      value: 0,
      warning: { code: 'SENSOR_UNAVAILABLE', detail: `Entity ${entityId} not in hass.states`, entityId },
    };
  }
  const stateRaw = (entity.state ?? '').trim();
  if (UNAVAILABLE_STATES.has(stateRaw.toLowerCase())) {
    return {
      value: 0,
      warning: { code: 'SENSOR_UNAVAILABLE', detail: `${entityId} is ${stateRaw || 'empty'}`, entityId },
    };
  }
  const num = Number(stateRaw);
  if (!Number.isFinite(num)) {
    return {
      value: 0,
      warning: { code: 'SENSOR_UNAVAILABLE', detail: `${entityId} state '${stateRaw}' is not numeric`, entityId },
    };
  }

  if (opts.expectedUnit === '%') {
    return { value: num };
  }

  const unitRaw = (entity.attributes?.['unit_of_measurement'] as string | undefined) ?? '';
  const unit = unitRaw.toLowerCase().trim();
  let factor = 1;
  let warning: EngineWarning | undefined;
  if (unit === '') {
    factor = 1;
  } else if (unit in UNIT_TO_W) {
    factor = UNIT_TO_W[unit] ?? 1;
  } else {
    warning = { code: 'UNIT_UNKNOWN', detail: `${entityId} unit '${unitRaw}' unknown, treating as W`, entityId };
    factor = 1;
  }

  let value = num * factor;
  if (opts.invertSign) value = -value;
  return warning ? { value, warning } : { value };
}
```

- [ ] **Step 5: Run tests — must pass**

Run: `pnpm test src/util/read-sensor.test.ts`
Expected: PASS, all 10 cases green.

- [ ] **Step 6: Commit**

```bash
git add src/util/warning-types.ts src/util/read-sensor.ts src/util/read-sensor.test.ts
git commit -m "feat(util): add EngineWarning + readSensorW with unit conversion"
```

### Task 1.5: `i18n/de.ts` and `const.ts`

**Files:**
- Create: `src/i18n/de.ts`
- Create: `src/const.ts`

- [ ] **Step 1: Create `src/i18n/de.ts`**

```typescript
export const DE = {
  card: {
    name: 'Custom Energy Flow Card',
    description: 'Multi-Source Energie-Flow-Visualisierung mit beliebig vielen PVs, Akkus und Verbrauchern',
  },
  nodes: {
    solar: 'Solar',
    battery: 'Speicher',
    grid: 'Netz',
    home: 'Hausverbrauch',
    consumer: 'Verbraucher',
  },
  units: {
    watt: 'W',
    percent: '%',
  },
  states: {
    loading: 'Lade …',
    sensorUnavailable: 'Sensor nicht verfügbar',
    stubHint: 'Füge Solar, Akku oder Verbraucher hinzu, um das Energie-Diagramm zu sehen.',
    cardError: 'Card-Fehler',
    narrowBanner: 'Beste Darstellung ab 320 px Breite',
  },
  grid: {
    consumption: 'Bezug',
    feedIn: 'Einspeisung',
  },
  battery: {
    charging: 'laden',
    discharging: 'entladen',
  },
  diagnostics: {
    iconLabel: 'Diagnose-Hinweise',
    title: 'Engine-Warnungen',
    pluralize: (n: number): string => (n === 1 ? 'Warnung' : 'Warnungen'),
  },
  editor: {
    sectionGeneral: 'Allgemein',
    sectionSolar: 'Solar-Anlagen',
    sectionBattery: 'Akkus',
    sectionGrid: 'Netz',
    sectionConsumers: 'Verbraucher',
    sectionDisplay: 'Anzeige',
    addSolar: '+ PV hinzufügen',
    addBattery: '+ Akku hinzufügen',
    addConsumer: '+ Verbraucher hinzufügen',
    chargedBy: 'Lädt von',
    chargedByPlaceholder: '— wählen —',
    pairingMissing: (id: string) => `PV-ID „${id}" existiert nicht`,
    moveUp: '↑',
    moveDown: '↓',
    remove: 'Entfernen',
  },
} as const;
```

- [ ] **Step 2: Create `src/const.ts`**

```typescript
// First production install starts at 0.9.x — v1.0.0 nach 1–2 Wochen stabilem
// Praxis-Betrieb. Reduziert Erwartungsdruck und macht Bug-Fix-Releases erwartbar.
export const CARD_VERSION = '0.9.0';
export const CARD_TYPE = 'custom-energy-flow-card';
export const CARD_NAME = 'Custom Energy Flow Card';
export const CARD_DOC_URL = 'https://github.com/griebner/custom-energy-flow-card';

export const DEFAULTS = {
  active_threshold_w: 5,
  number_format: 'grouped' as const,
  show_inactive_paths: false,
  animation: {
    base_duration_s: 2.5,
    reference_power_w: 1000,
    min_duration_s: 0.6,
    max_dots_per_path: 4,
  },
};

export const VIEWBOX = { width: 720, height: 540 } as const;
export const MIN_CONTAINER_WIDTH_PX = 280;
```

- [ ] **Step 3: Verify typecheck**

Run: `pnpm typecheck`
Expected: PASS.

- [ ] **Step 4: Commit**

```bash
git add src/i18n/de.ts src/const.ts
git commit -m "feat(i18n,const): add German strings and project constants"
```

### Task 1.6: `engine/types.ts` and `engine/flow-graph.ts`

**Files:**
- Create: `src/engine/types.ts`
- Create: `src/engine/flow-graph.ts`

- [ ] **Step 1: Create `src/engine/types.ts`** (verbindlich aus Spec §2.5)

```typescript
export interface SystemState {
  pv: PvState[];
  battery: BatteryState[];
  grid: GridState;
  consumer: ConsumerState[];
  home: { powerOverrideW?: number };
}

export interface PvState {
  id: string;
  powerW: number;
}

export interface BatteryState {
  id: string;
  pairedPvId: string;
  powerW: number;
  socPct: number;
}

export interface GridState {
  powerW: number;
}

export interface ConsumerState {
  id: string;
  powerW: number;
}

export interface FlowResult {
  homeW: number;
  flows: FlowSet;
  homeAttribution: HomeAttribution;
  pairingDeficit: PairingDeficit[];
  warnings: EngineWarning[];
}

export interface FlowSet {
  pvToHome: PerSourceFlow[];
  pvToBattery: PerSourceFlow[];
  pvToGrid: PerSourceFlow[];
  batteryToHome: PerSourceFlow[];
  batteryToGrid: PerSourceFlow[];
  gridToHome: number;
  /** Wenn ein Akku aus dem Netz geladen wird (PV reicht nicht): pairing_deficit. */
  gridToBattery: PerSourceFlow[];
  homeToConsumer: PerSourceFlow[];
}

export interface PerSourceFlow {
  sourceId: string;
  powerW: number;
}

export interface PairingDeficit {
  batteryId: string;
  deficitW: number;
}

export interface HomeAttribution {
  shares: AttributionShare[];
}

export interface AttributionShare {
  sourceKind: 'pv' | 'battery' | 'grid';
  sourceId?: string;
  share: number;
}

// Re-export the unified warning types from util as Single-Source.
// The ESLint zone for `engine` allows `./util/warning-types.ts`.
export type { EngineWarning, EngineWarningCode } from '../util/warning-types';
```

- [ ] **Step 2: Create `src/engine/flow-graph.ts`** (Topology-Konstanten)

```typescript
export type NodeKind = 'pv' | 'battery' | 'grid' | 'home' | 'consumer';

export type FlowEdgeKind =
  | 'pv-to-home'
  | 'pv-to-battery'
  | 'pv-to-grid'
  | 'battery-to-home'
  | 'battery-to-grid'
  | 'grid-to-home'
  | 'grid-to-battery'   // Pairing-Defizit: Akku lädt aus Netz (siehe ADR-0007)
  | 'home-to-consumer';

export const FLOW_EDGE_KINDS: readonly FlowEdgeKind[] = [
  'pv-to-home',
  'pv-to-battery',
  'pv-to-grid',
  'battery-to-home',
  'battery-to-grid',
  'grid-to-home',
  'grid-to-battery',
  'home-to-consumer',
] as const;
```

- [ ] **Step 3: Verify typecheck**

Run: `pnpm typecheck`
Expected: PASS.

- [ ] **Step 4: Commit**

```bash
git add src/engine/types.ts src/engine/flow-graph.ts
git commit -m "feat(engine): add SystemState/FlowResult types and flow-graph constants"
```

### Task 1.7: Engine — Decomposition + Hausverbrauch (Steps 1+2)

Spec §4.2, §4.3. Edge-Cases 1, 7, 15.

**Files:**
- Create: `src/engine/energy-engine.ts`
- Test: `src/engine/energy-engine.test.ts`

- [ ] **Step 1: Write failing tests**

Create `src/engine/energy-engine.test.ts`:

```typescript
import { describe, expect, it } from 'vitest';
import { compute } from './energy-engine';
import type { SystemState } from './types';

const empty = (): SystemState => ({
  pv: [],
  battery: [],
  grid: { powerW: 0 },
  consumer: [],
  home: {},
});

describe('Engine — Decomposition + Home (steps 1+2)', () => {
  it('Edge case 1: all zero', () => {
    const r = compute(empty());
    expect(r.homeW).toBe(0);
    expect(r.warnings).toEqual([]);
  });

  it('home_override is honored', () => {
    const s = empty();
    s.home.powerOverrideW = 1500;
    expect(compute(s).homeW).toBe(1500);
  });

  it('home computed via balance: PV + import = home', () => {
    const s = empty();
    s.pv = [{ id: 'dach', powerW: 1000 }];
    s.grid = { powerW: 500 };
    expect(compute(s).homeW).toBe(1500);
  });

  it('home computed: PV − export = home', () => {
    const s = empty();
    s.pv = [{ id: 'dach', powerW: 1000 }];
    s.grid = { powerW: -300 };
    expect(compute(s).homeW).toBe(700);
  });

  it('Edge case 7: negative PV gets clamped, warning fired', () => {
    const s = empty();
    s.pv = [{ id: 'dach', powerW: -50 }];
    const r = compute(s);
    expect(r.homeW).toBe(0);
    expect(r.warnings.some((w) => w.code === 'NEGATIVE_PV')).toBe(true);
  });

  it('Edge case 15: P_home_calculated < 0 clamped + warning', () => {
    const s = empty();
    s.battery = [{ id: 'b1', pairedPvId: 'p1', powerW: 1000, socPct: 50 }];
    s.grid = { powerW: -2000 };
    const r = compute(s);
    expect(r.homeW).toBe(0);
    expect(r.warnings.some((w) => w.code === 'BALANCE_DRIFT')).toBe(true);
  });
});
```

- [ ] **Step 2: Run tests — must fail**

Run: `pnpm test src/engine/energy-engine.test.ts`
Expected: FAIL (module not found).

- [ ] **Step 3: Implement `src/engine/energy-engine.ts` (initial)**

```typescript
import type { EngineWarning, FlowResult, SystemState } from './types';

export function compute(state: SystemState): FlowResult {
  const warnings: EngineWarning[] = [];

  const pv = state.pv.map((p) => {
    if (p.powerW < 0) {
      warnings.push({
        code: 'NEGATIVE_PV',
        detail: `PV ${p.id} reported negative power ${p.powerW} W, clamped to 0`,
        magnitudeW: Math.abs(p.powerW),
      });
      return { ...p, powerW: 0 };
    }
    return p;
  });

  const charge = state.battery.map((b) => Math.max(0, b.powerW));
  const discharge = state.battery.map((b) => Math.max(0, -b.powerW));
  const importW = Math.max(0, state.grid.powerW);
  const exportW = Math.max(0, -state.grid.powerW);

  const sumPv = pv.reduce((s, p) => s + p.powerW, 0);
  const sumCharge = charge.reduce((s, x) => s + x, 0);
  const sumDischarge = discharge.reduce((s, x) => s + x, 0);

  const homeCalc = sumPv + sumDischarge + importW - sumCharge - exportW;
  let homeW: number;

  if (state.home.powerOverrideW !== undefined) {
    homeW = state.home.powerOverrideW;
  } else if (homeCalc < 0) {
    warnings.push({
      code: 'BALANCE_DRIFT',
      detail: `P_home_calculated negative (${homeCalc.toFixed(0)} W); clamped to 0`,
      magnitudeW: Math.abs(homeCalc),
    });
    homeW = 0;
  } else {
    homeW = homeCalc;
  }

  return {
    homeW,
    flows: {
      pvToHome: [],
      pvToBattery: [],
      pvToGrid: [],
      batteryToHome: [],
      batteryToGrid: [],
      gridToHome: 0,
      gridToBattery: [],
      homeToConsumer: [],
    },
    homeAttribution: { shares: [] },
    pairingDeficit: [],
    warnings,
  };
}
```

- [ ] **Step 4: Run tests — must pass**

Run: `pnpm test src/engine/energy-engine.test.ts`
Expected: PASS, 6 cases green.

- [ ] **Step 5: Commit**

```bash
git add src/engine/energy-engine.ts src/engine/energy-engine.test.ts
git commit -m "feat(engine): implement decomposition + home consumption (steps 1+2)"
```

### Task 1.8: Engine — Pairing PV→Akku (Step 3)

Spec §4.4. Edge-Cases 5, 13.

**Files:**
- Modify: `src/engine/energy-engine.ts`
- Modify: `src/engine/energy-engine.test.ts`

- [ ] **Step 1: Add pairing tests**

Append to `src/engine/energy-engine.test.ts`:

```typescript
describe('Engine — Pairing (step 3)', () => {
  it('PV charges paired battery up to its charge rate', () => {
    const s: SystemState = {
      pv: [{ id: 'dach', powerW: 1000 }],
      battery: [{ id: 'b_dach', pairedPvId: 'dach', powerW: 600, socPct: 50 }],
      grid: { powerW: 0 },
      consumer: [],
      home: {},
    };
    const r = compute(s);
    expect(r.flows.pvToBattery).toEqual([{ sourceId: 'dach', powerW: 600 }]);
  });

  it('Edge case 5: pairing deficit (PV 200 W, charge 500 W) — grid-to-battery flow visible', () => {
    const s: SystemState = {
      pv: [{ id: 'dach', powerW: 200 }],
      battery: [{ id: 'b_dach', pairedPvId: 'dach', powerW: 500, socPct: 50 }],
      grid: { powerW: 300 },
      consumer: [],
      home: {},
    };
    const r = compute(s);
    expect(r.flows.pvToBattery).toEqual([{ sourceId: 'dach', powerW: 200 }]);
    expect(r.pairingDeficit).toEqual([{ batteryId: 'b_dach', deficitW: 300 }]);
    expect(r.flows.gridToBattery).toEqual([{ sourceId: 'b_dach', powerW: 300 }]);
    expect(r.warnings.some((w) => w.code === 'PAIRING_DEFICIT')).toBe(true);
  });

  it('Edge case 13: PV without paired battery → no PV-to-battery flow', () => {
    const s: SystemState = {
      pv: [{ id: 'standalone', powerW: 800 }],
      battery: [],
      grid: { powerW: -800 },
      consumer: [],
      home: {},
    };
    const r = compute(s);
    expect(r.flows.pvToBattery).toEqual([]);
  });

  it('Edge case 12: no batteries — pvToBattery is empty', () => {
    const s: SystemState = {
      pv: [{ id: 'dach', powerW: 500 }],
      battery: [],
      grid: { powerW: -500 },
      consumer: [],
      home: {},
    };
    expect(compute(s).flows.pvToBattery).toEqual([]);
  });
});
```

- [ ] **Step 2: Run tests — must fail (only the new ones)**

Run: `pnpm test src/engine/energy-engine.test.ts`
Expected: previous tests PASS, new pairing tests FAIL.

- [ ] **Step 3: Replace `src/engine/energy-engine.ts` with extended implementation**

```typescript
import type {
  EngineWarning,
  FlowResult,
  PairingDeficit,
  PerSourceFlow,
  PvState,
  SystemState,
} from './types';

export function compute(state: SystemState): FlowResult {
  const warnings: EngineWarning[] = [];

  const pv: PvState[] = state.pv.map((p) => {
    if (p.powerW < 0) {
      warnings.push({
        code: 'NEGATIVE_PV',
        detail: `PV ${p.id} reported negative power ${p.powerW} W, clamped to 0`,
        magnitudeW: Math.abs(p.powerW),
      });
      return { ...p, powerW: 0 };
    }
    return p;
  });

  const charge = state.battery.map((b) => Math.max(0, b.powerW));
  const discharge = state.battery.map((b) => Math.max(0, -b.powerW));
  const importW = Math.max(0, state.grid.powerW);
  const exportW = Math.max(0, -state.grid.powerW);

  const sumPv = pv.reduce((s, p) => s + p.powerW, 0);
  const sumCharge = charge.reduce((s, x) => s + x, 0);
  const sumDischarge = discharge.reduce((s, x) => s + x, 0);

  const homeCalc = sumPv + sumDischarge + importW - sumCharge - exportW;
  let homeW: number;
  if (state.home.powerOverrideW !== undefined) {
    homeW = state.home.powerOverrideW;
  } else if (homeCalc < 0) {
    warnings.push({
      code: 'BALANCE_DRIFT',
      detail: `P_home_calculated negative (${homeCalc.toFixed(0)} W); clamped to 0`,
      magnitudeW: Math.abs(homeCalc),
    });
    homeW = 0;
  } else {
    homeW = homeCalc;
  }

  // Step 3: Pairing PV → paired Battery
  const pvIndexById = new Map(pv.map((p, i) => [p.id, i]));
  const pvRemaining = pv.map((p) => p.powerW);
  const pvToBattery: PerSourceFlow[] = [];
  const pairingDeficit: PairingDeficit[] = [];

  state.battery.forEach((b, j) => {
    if (charge[j] > 0) {
      const i = pvIndexById.get(b.pairedPvId);
      const pvAvail = i !== undefined ? pvRemaining[i] : 0;
      const fromPv = Math.min(pvAvail ?? 0, charge[j] ?? 0);
      if (i !== undefined && fromPv > 0) {
        const id = pv[i]?.id;
        if (id !== undefined) {
          pvToBattery.push({ sourceId: id, powerW: fromPv });
        }
        pvRemaining[i] = (pvRemaining[i] ?? 0) - fromPv;
      }
      const deficit = (charge[j] ?? 0) - fromPv;
      if (deficit > 0.5) {
        pairingDeficit.push({ batteryId: b.id, deficitW: deficit });
        warnings.push({
          code: 'PAIRING_DEFICIT',
          detail: `Battery ${b.id} charges ${charge[j]} W but paired PV ${b.pairedPvId} provides only ${fromPv} W`,
          magnitudeW: deficit,
        });
      }
    }
  });

  return {
    homeW,
    flows: {
      pvToHome: [],
      pvToBattery,
      pvToGrid: [],
      batteryToHome: [],
      batteryToGrid: [],
      gridToHome: 0,
      homeToConsumer: [],
    },
    homeAttribution: { shares: [] },
    pairingDeficit,
    warnings,
  };
}
```

- [ ] **Step 4: Run tests — all pass**

Run: `pnpm test src/engine/energy-engine.test.ts`
Expected: all 10 tests PASS.

- [ ] **Step 5: Commit**

```bash
git add src/engine/energy-engine.ts src/engine/energy-engine.test.ts
git commit -m "feat(engine): implement PV→battery pairing and deficit warnings (step 3)"
```

### Task 1.9: Engine — Source attribution + Reconcile (Steps 4–7)

Spec §4.5–4.8. Edge-Cases 2, 3, 4, 8, 9, 10.

**Files:**
- Modify: `src/engine/energy-engine.ts`
- Modify: `src/engine/energy-engine.test.ts`

- [ ] **Step 1: Add tests for steps 4–7**

Append to `src/engine/energy-engine.test.ts`:

```typescript
describe('Engine — Source attribution + Reconcile (steps 4–7)', () => {
  it('Edge case 2: sunny day, batteries charging, surplus to grid', () => {
    const s: SystemState = {
      pv: [
        { id: 'dach', powerW: 2000 },
        { id: 'balkon', powerW: 600 },
      ],
      battery: [
        { id: 'b_dach', pairedPvId: 'dach', powerW: 600, socPct: 75 },
        { id: 'b_balkon', pairedPvId: 'balkon', powerW: 200, socPct: 42 },
      ],
      grid: { powerW: -600 },
      consumer: [],
      home: {},
    };
    const r = compute(s);
    expect(r.homeW).toBe(1200);
    expect(r.flows.pvToHome.reduce((s, f) => s + f.powerW, 0)).toBeCloseTo(1200, 1);
    expect(r.flows.pvToGrid.reduce((s, f) => s + f.powerW, 0)).toBeCloseTo(600, 1);
    expect(r.flows.batteryToHome).toEqual([]);
  });

  it('Edge case 3: evening, batteries supply home + grid, no PV', () => {
    const s: SystemState = {
      pv: [{ id: 'dach', powerW: 0 }],
      battery: [
        { id: 'b_dach', pairedPvId: 'dach', powerW: -1100, socPct: 68 },
        { id: 'b_balkon', pairedPvId: 'balkon', powerW: -400, socPct: 38 },
      ],
      grid: { powerW: -300 },
      consumer: [],
      home: {},
    };
    const r = compute(s);
    expect(r.homeW).toBe(1200);
    expect(r.flows.pvToHome).toEqual([{ sourceId: 'dach', powerW: 0 }]);
    const bToHome = r.flows.batteryToHome.reduce((s, f) => s + f.powerW, 0);
    const bToGrid = r.flows.batteryToGrid.reduce((s, f) => s + f.powerW, 0);
    expect(bToHome).toBeCloseTo(1200, 1);
    expect(bToGrid).toBeCloseTo(300, 1);
  });

  it('Edge case 4: night — pure grid import covers home', () => {
    const s: SystemState = {
      pv: [],
      battery: [],
      grid: { powerW: 500 },
      consumer: [],
      home: {},
    };
    const r = compute(s);
    expect(r.homeW).toBe(500);
    expect(r.flows.gridToHome).toBe(500);
  });

  it('Edge case 9: untracked_export — sensor exports but no source has excess', () => {
    const s: SystemState = {
      pv: [],
      battery: [],
      grid: { powerW: -200 },
      consumer: [],
      home: { powerOverrideW: 0 },
    };
    const r = compute(s);
    expect(r.flows.pvToGrid).toEqual([]);
    expect(r.flows.batteryToGrid).toEqual([]);
    expect(r.warnings.some((w) => w.code === 'EXPORT_INCONSISTENT')).toBe(true);
  });

  it('Edge case 10: phantom_export — calc shows export but sensor reads 0', () => {
    const s: SystemState = {
      pv: [{ id: 'dach', powerW: 1000 }],
      battery: [],
      grid: { powerW: 0 },
      consumer: [],
      home: { powerOverrideW: 500 },
    };
    const r = compute(s);
    expect(r.flows.pvToGrid.every((f) => f.powerW === 0)).toBe(true);
    expect(r.warnings.some((w) => w.code === 'EXPORT_INCONSISTENT')).toBe(true);
  });

  it('proportional split when 2 PVs export', () => {
    const s: SystemState = {
      pv: [
        { id: 'dach', powerW: 1500 },
        { id: 'balkon', powerW: 500 },
      ],
      battery: [],
      grid: { powerW: -2000 },
      consumer: [],
      home: { powerOverrideW: 0 },
    };
    const r = compute(s);
    const dachToGrid = r.flows.pvToGrid.find((f) => f.sourceId === 'dach')?.powerW ?? 0;
    const balkonToGrid = r.flows.pvToGrid.find((f) => f.sourceId === 'balkon')?.powerW ?? 0;
    expect(dachToGrid).toBeCloseTo(1500, 1);
    expect(balkonToGrid).toBeCloseTo(500, 1);
  });

  it('Edge case 8: Reconcile Fall 1 — calc_export ≠ export triggers scaling + warning', () => {
    // PV produces 2000W, no battery, home_override 0 → calc_export = 2000W
    // Sensor says export = 1500W → scale = 0.75 → warning required
    const s: SystemState = {
      pv: [{ id: 'dach', powerW: 2000 }],
      battery: [],
      grid: { powerW: -1500 },
      consumer: [],
      home: { powerOverrideW: 0 },
    };
    const r = compute(s);
    const totalPvToGrid = r.flows.pvToGrid.reduce((s, f) => s + f.powerW, 0);
    expect(totalPvToGrid).toBeCloseTo(1500, 0);
    expect(r.warnings.some((w) => w.code === 'EXPORT_INCONSISTENT')).toBe(true);
  });
});
```

- [ ] **Step 2: Run tests — only new ones fail**

Run: `pnpm test src/engine/energy-engine.test.ts`
Expected: previous tests PASS, new ones FAIL.

- [ ] **Step 3: Replace `src/engine/energy-engine.ts` body with full attribution + reconcile**

```typescript
import type {
  EngineWarning,
  FlowResult,
  PairingDeficit,
  PerSourceFlow,
  PvState,
  SystemState,
} from './types';

const sum = (xs: number[]): number => xs.reduce((s, x) => s + x, 0);
const clamp = (v: number, lo: number, hi: number): number => Math.min(Math.max(v, lo), hi);

export function compute(state: SystemState): FlowResult {
  const warnings: EngineWarning[] = [];

  const pv: PvState[] = state.pv.map((p) => {
    if (p.powerW < 0) {
      warnings.push({
        code: 'NEGATIVE_PV',
        detail: `PV ${p.id} reported negative power ${p.powerW} W, clamped to 0`,
        magnitudeW: Math.abs(p.powerW),
      });
      return { ...p, powerW: 0 };
    }
    return p;
  });

  const charge = state.battery.map((b) => Math.max(0, b.powerW));
  const discharge = state.battery.map((b) => Math.max(0, -b.powerW));
  const importW = Math.max(0, state.grid.powerW);
  const exportW = Math.max(0, -state.grid.powerW);

  const sumPv = sum(pv.map((p) => p.powerW));
  const sumCharge = sum(charge);
  const sumDischarge = sum(discharge);
  const homeCalc = sumPv + sumDischarge + importW - sumCharge - exportW;

  let homeW: number;
  if (state.home.powerOverrideW !== undefined) {
    homeW = state.home.powerOverrideW;
  } else if (homeCalc < 0) {
    warnings.push({
      code: 'BALANCE_DRIFT',
      detail: `P_home_calculated negative (${homeCalc.toFixed(0)} W); clamped to 0`,
      magnitudeW: Math.abs(homeCalc),
    });
    homeW = 0;
  } else {
    homeW = homeCalc;
  }

  // Step 3: Pairing
  const pvIndexById = new Map(pv.map((p, i) => [p.id, i]));
  const pvRemaining = pv.map((p) => p.powerW);
  const pvToBattery: PerSourceFlow[] = [];
  const pairingDeficit: PairingDeficit[] = [];

  state.battery.forEach((b, j) => {
    if ((charge[j] ?? 0) > 0) {
      const i = pvIndexById.get(b.pairedPvId);
      const pvAvail = i !== undefined ? pvRemaining[i] ?? 0 : 0;
      const fromPv = Math.min(pvAvail, charge[j] ?? 0);
      if (i !== undefined && fromPv > 0) {
        const id = pv[i]?.id;
        if (id !== undefined) pvToBattery.push({ sourceId: id, powerW: fromPv });
        pvRemaining[i] = pvAvail - fromPv;
      }
      const deficit = (charge[j] ?? 0) - fromPv;
      if (deficit > 0.5) {
        pairingDeficit.push({ batteryId: b.id, deficitW: deficit });
        warnings.push({
          code: 'PAIRING_DEFICIT',
          detail: `Battery ${b.id} charges ${charge[j]} W but paired PV ${b.pairedPvId} provides only ${fromPv} W`,
          magnitudeW: deficit,
        });
      }
    }
  });

  // Step 4: Sources → Home (priority PV → Battery → Grid)
  const sumPvRemaining = sum(pvRemaining);
  const totalPvToHome = Math.min(homeW, sumPvRemaining);
  let demand = homeW - totalPvToHome;
  const totalBattToHome = Math.min(demand, sumDischarge);
  demand -= totalBattToHome;
  let gridToHome = Math.max(0, demand);

  // Step 5: Excess → Grid
  let totalPvToGrid = sumPvRemaining - totalPvToHome;
  let totalBattToGrid = sumDischarge - totalBattToHome;

  // Step 6: Per-source proportional split
  const pvToHome: PerSourceFlow[] = pv.map((p, i) => ({
    sourceId: p.id,
    powerW: sumPvRemaining > 0 ? ((pvRemaining[i] ?? 0) / sumPvRemaining) * totalPvToHome : 0,
  }));
  const pvToGrid: PerSourceFlow[] = pv.map((p, i) => ({
    sourceId: p.id,
    powerW: sumPvRemaining > 0 ? ((pvRemaining[i] ?? 0) / sumPvRemaining) * totalPvToGrid : 0,
  }));
  const batteryToHome: PerSourceFlow[] = state.battery.map((b, j) => ({
    sourceId: b.id,
    powerW: sumDischarge > 0 ? ((discharge[j] ?? 0) / sumDischarge) * totalBattToHome : 0,
  }));
  const batteryToGrid: PerSourceFlow[] = state.battery.map((b, j) => ({
    sourceId: b.id,
    powerW: sumDischarge > 0 ? ((discharge[j] ?? 0) / sumDischarge) * totalBattToGrid : 0,
  }));

  // Step 7: Reconcile with grid sensor (export side) — pure: returns new arrays.
  const calcExport = totalPvToGrid + totalBattToGrid;
  let pvToGridFinal: PerSourceFlow[] = pvToGrid;
  let battToGridFinal: PerSourceFlow[] = batteryToGrid;
  if (calcExport > 0 && exportW > 0) {
    const scale = clamp(exportW / calcExport, 0, 2);
    if (scale < 0.95 || scale > 1.05) {
      warnings.push({
        code: 'EXPORT_INCONSISTENT',
        detail: `calc_export ${calcExport.toFixed(0)} W vs sensor export ${exportW.toFixed(0)} W`,
        magnitudeW: Math.abs(calcExport - exportW),
      });
    }
    pvToGridFinal = pvToGrid.map((f) => ({ ...f, powerW: f.powerW * scale }));
    battToGridFinal = batteryToGrid.map((f) => ({ ...f, powerW: f.powerW * scale }));
    totalPvToGrid *= scale;
    totalBattToGrid *= scale;
  } else if (calcExport === 0 && exportW > 0) {
    warnings.push({
      code: 'EXPORT_INCONSISTENT',
      detail: `untracked_export: sensor exports ${exportW.toFixed(0)} W but no source has excess`,
      magnitudeW: exportW,
    });
  } else if (calcExport > 0 && exportW === 0) {
    warnings.push({
      code: 'EXPORT_INCONSISTENT',
      detail: `phantom_export: calc shows ${calcExport.toFixed(0)} W export but sensor reads 0`,
      magnitudeW: calcExport,
    });
    pvToGridFinal = pvToGrid.map((f) => ({ ...f, powerW: 0 }));
    battToGridFinal = batteryToGrid.map((f) => ({ ...f, powerW: 0 }));
    totalPvToGrid = 0;
    totalBattToGrid = 0;
  }

  // Step 7B: Reconcile import side — Sensor authoritativ, immer.
  gridToHome = importW;
  const totalToHome = totalPvToHome + totalBattToHome + gridToHome;
  const drift = totalToHome - homeW;
  if (Math.abs(drift) > Math.max(1, homeW * 0.05)) {
    warnings.push({
      code: 'BALANCE_DRIFT',
      detail: `home in/out drift: ${totalToHome.toFixed(0)} W vs ${homeW.toFixed(0)} W`,
      magnitudeW: Math.abs(drift),
    });
  }

  return {
    homeW,
    flows: {
      pvToHome,
      pvToBattery,
      pvToGrid,
      batteryToHome,
      batteryToGrid,
      gridToHome,
      homeToConsumer: [],
    },
    homeAttribution: { shares: [] },
    pairingDeficit,
    warnings,
  };
}
```

- [ ] **Step 4: Run tests — must pass**

Run: `pnpm test src/engine/energy-engine.test.ts`
Expected: all 16 tests PASS.

- [ ] **Step 5: Commit**

```bash
git add src/engine/energy-engine.ts src/engine/energy-engine.test.ts
git commit -m "feat(engine): implement source attribution + grid reconcile (steps 4-7)"
```

### Task 1.10: Engine — Consumer + Home-Attribution (Step 8 + Ring)

Spec §4.9, §4.10. Edge-Cases 6, 11, 14, 16.

**Files:**
- Modify: `src/engine/energy-engine.ts`
- Modify: `src/engine/energy-engine.test.ts`

- [ ] **Step 1: Add tests**

Append to `src/engine/energy-engine.test.ts`:

```typescript
describe('Engine — Consumer + Home-Attribution (steps 8 + ring)', () => {
  it('home-to-consumer mirrors consumer power', () => {
    const s: SystemState = {
      pv: [{ id: 'dach', powerW: 2000 }],
      battery: [],
      grid: { powerW: -500 },
      consumer: [
        { id: 'wp', powerW: 400 },
        { id: 'wb', powerW: 1100 },
      ],
      home: {},
    };
    const r = compute(s);
    expect(r.flows.homeToConsumer).toEqual([
      { sourceId: 'wp', powerW: 400 },
      { sourceId: 'wb', powerW: 1100 },
    ]);
  });

  it('Edge case 14: Σ consumers > home triggers BALANCE_DRIFT', () => {
    const s: SystemState = {
      pv: [],
      battery: [],
      grid: { powerW: 100 },
      consumer: [{ id: 'wp', powerW: 500 }],
      home: {},
    };
    const r = compute(s);
    expect(r.warnings.some((w) => w.code === 'BALANCE_DRIFT')).toBe(true);
  });

  it('home attribution shares sum to ~1 when home > 0', () => {
    const s: SystemState = {
      pv: [{ id: 'dach', powerW: 1000 }],
      battery: [],
      grid: { powerW: 500 },
      consumer: [],
      home: {},
    };
    const r = compute(s);
    const total = r.homeAttribution.shares.reduce((s, x) => s + x.share, 0);
    expect(total).toBeCloseTo(1, 3);
  });

  it('home attribution all zero when home is 0', () => {
    const s: SystemState = {
      pv: [],
      battery: [],
      grid: { powerW: 0 },
      consumer: [],
      home: {},
    };
    const r = compute(s);
    expect(r.homeAttribution.shares.every((s) => s.share === 0)).toBe(true);
  });

  it('Edge case 6: home_override skips balance', () => {
    const s: SystemState = {
      pv: [{ id: 'dach', powerW: 5000 }],
      battery: [],
      grid: { powerW: 0 },
      consumer: [],
      home: { powerOverrideW: 800 },
    };
    expect(compute(s).homeW).toBe(800);
  });

  it('Edge case 11: no PVs', () => {
    const s: SystemState = {
      pv: [],
      battery: [],
      grid: { powerW: 300 },
      consumer: [],
      home: {},
    };
    const r = compute(s);
    expect(r.flows.pvToHome).toEqual([]);
    expect(r.flows.gridToHome).toBe(300);
  });

  it('Edge case 16: 5 PV + 5 batteries stress test, completes < 5 ms', () => {
    const s: SystemState = {
      pv: Array.from({ length: 5 }, (_, i) => ({ id: `pv${i}`, powerW: 500 + i * 100 })),
      battery: Array.from({ length: 5 }, (_, i) => ({
        id: `b${i}`,
        pairedPvId: `pv${i}`,
        powerW: 100 + i * 50,
        socPct: 50,
      })),
      grid: { powerW: -200 },
      consumer: Array.from({ length: 3 }, (_, i) => ({ id: `c${i}`, powerW: 100 })),
      home: {},
    };
    const start = performance.now();
    const r = compute(s);
    const elapsed = performance.now() - start;
    expect(elapsed).toBeLessThan(5);
    expect(r.flows.pvToHome).toHaveLength(5);
    expect(r.flows.batteryToHome).toHaveLength(5);
    expect(r.flows.homeToConsumer).toHaveLength(3);
  });
});
```

- [ ] **Step 2: Run tests — only new ones fail**

Run: `pnpm test src/engine/energy-engine.test.ts`
Expected: previous PASS, new ones FAIL on attribution shape.

- [ ] **Step 3: Extend `src/engine/energy-engine.ts` (replace return + add Step 8 + ring)**

Replace the closing `return { … }` block with:

```typescript
  // Step 8: Home → Consumer
  const homeToConsumer: PerSourceFlow[] = state.consumer.map((c) => ({
    sourceId: c.id,
    powerW: c.powerW,
  }));
  const sumConsumers = sum(state.consumer.map((c) => c.powerW));
  if (sumConsumers > homeW + 0.5) {
    warnings.push({
      code: 'BALANCE_DRIFT',
      detail: `Σ consumers (${sumConsumers.toFixed(0)} W) exceeds home (${homeW.toFixed(0)} W)`,
      magnitudeW: sumConsumers - homeW,
    });
  }

  // Home-Attribution shares
  const shares = homeW > 0
    ? [
        ...pvToHome.map((f) => ({ sourceKind: 'pv' as const, sourceId: f.sourceId, share: f.powerW / homeW })),
        ...batteryToHome.map((f) => ({ sourceKind: 'battery' as const, sourceId: f.sourceId, share: f.powerW / homeW })),
        { sourceKind: 'grid' as const, share: gridToHome / homeW },
      ]
    : [
        ...pvToHome.map((f) => ({ sourceKind: 'pv' as const, sourceId: f.sourceId, share: 0 })),
        ...batteryToHome.map((f) => ({ sourceKind: 'battery' as const, sourceId: f.sourceId, share: 0 })),
        { sourceKind: 'grid' as const, share: 0 },
      ];

  // Pairing-Defizit als sichtbare Grid → Battery Flows (siehe ADR-0007 v2):
  const gridToBattery: PerSourceFlow[] = pairingDeficit
    .filter((d) => d.deficitW > 0.5)
    .map((d) => ({ sourceId: d.batteryId, powerW: d.deficitW }));

  return {
    homeW,
    flows: {
      pvToHome,
      pvToBattery,
      pvToGrid: pvToGridFinal,
      batteryToHome,
      batteryToGrid: battToGridFinal,
      gridToHome,
      gridToBattery,
      homeToConsumer,
    },
    homeAttribution: { shares },
    pairingDeficit,
    warnings,
  };
}
```

- [ ] **Step 4: Run all tests — must pass with coverage**

Run: `pnpm test:coverage`
Expected: all tests PASS, engine/ coverage ≥ 90 %.

- [ ] **Step 5: Commit**

```bash
git add src/engine/energy-engine.ts src/engine/energy-engine.test.ts
git commit -m "feat(engine): implement consumer flow and home attribution (step 8 + ring)"
```

### Task 1.11: `config/types.ts` and `config/schema.ts`

**Files:**
- Create: `src/config/types.ts`
- Create: `src/config/schema.ts`
- Test: `src/config/schema.test.ts`

- [ ] **Step 1: Create `src/config/types.ts`** (Spec §2.5)

```typescript
import type { ColorRole } from '../util/resolve-color';

export interface Config {
  type: 'custom:custom-energy-flow-card';
  version?: 1;
  title?: string;
  solar: SolarConfig[];
  battery: BatteryConfig[];
  grid: GridConfig;
  home?: HomeConfig;
  consumers: ConsumerConfig[];
  display?: DisplayConfig;
}

export interface SolarConfig {
  id: string;
  name?: string;
  power: string;
  icon?: string;
}

export interface BatteryConfig {
  id: string;
  name?: string;
  soc: string;
  power: string;
  power_invert?: boolean;
  charged_by: string;
  icon?: string;
}

export type GridConfig =
  | { power: string; power_invert?: boolean }
  | { import: string; export: string };

export interface HomeConfig {
  name?: string;
  power?: string;
  icon?: string;
}

export interface ConsumerConfig {
  name: string;
  power: string;
  icon?: string;
}

export interface DisplayConfig {
  active_threshold_w?: number;
  number_format?: 'standard' | 'grouped';
  show_inactive_paths?: boolean;
  animation?: AnimationConfig;
  colors?: Partial<Record<ColorRole, string>>;
  /** Wenn true: ausführliches console-Logging der HA-Lifecycle-Schritte. Für Bug-Reports. */
  debug?: boolean;
}

export interface AnimationConfig {
  base_duration_s?: number;
  reference_power_w?: number;
  min_duration_s?: number;
  max_dots_per_path?: number;
}
```

- [ ] **Step 2: Write tests for schema validation + buildSystemState**

Create `src/config/schema.test.ts`:

```typescript
import { describe, expect, it } from 'vitest';
import { buildSystemState, validateConfig } from './schema';
import type { Config } from './types';
import type { ReadSensorHassShape } from '../util/read-sensor';

const minimalConfig = (over: Partial<Config> = {}): Config => ({
  type: 'custom:custom-energy-flow-card',
  solar: [],
  battery: [],
  grid: { power: 'sensor.grid' },
  consumers: [{ name: 'X', power: 'sensor.x' }],
  ...over,
});

describe('validateConfig', () => {
  it('passes valid minimal config', () => {
    expect(() => validateConfig(minimalConfig())).not.toThrow();
  });

  it('throws on missing type', () => {
    expect(() => validateConfig({ ...minimalConfig(), type: undefined as never })).toThrow(/type/);
  });

  it('throws on duplicate solar IDs', () => {
    const c = minimalConfig({
      solar: [
        { id: 'dach', power: 's.a' },
        { id: 'dach', power: 's.b' },
      ],
    });
    expect(() => validateConfig(c)).toThrow(/solar.*id.*dach/i);
  });

  it('throws on battery referencing non-existent solar id', () => {
    const c = minimalConfig({
      solar: [{ id: 'dach', power: 's.a' }],
      battery: [{ id: 'b', soc: 's.b_soc', power: 's.b_p', charged_by: 'balkon' }],
    });
    expect(() => validateConfig(c)).toThrow(/charged_by.*balkon/i);
  });

  it('throws on PV paired with two batteries', () => {
    const c = minimalConfig({
      solar: [{ id: 'dach', power: 's.a' }],
      battery: [
        { id: 'b1', soc: 's.b1_soc', power: 's.b1_p', charged_by: 'dach' },
        { id: 'b2', soc: 's.b2_soc', power: 's.b2_p', charged_by: 'dach' },
      ],
    });
    expect(() => validateConfig(c)).toThrow(/dach.*paired/i);
  });

  it('throws on grid neither power nor import/export', () => {
    const c = { ...minimalConfig(), grid: {} as never };
    expect(() => validateConfig(c)).toThrow(/grid/i);
  });

  it('accepts grid with import + export', () => {
    const c = minimalConfig({ grid: { import: 's.i', export: 's.e' } });
    expect(() => validateConfig(c)).not.toThrow();
  });

  it('throws when all of solar/battery/consumers are empty', () => {
    const c = minimalConfig({ consumers: [] });
    expect(() => validateConfig(c)).toThrow(/at least one/i);
  });

  it('throws on bad version', () => {
    const c = { ...minimalConfig(), version: 99 as never };
    expect(() => validateConfig(c)).toThrow(/version/i);
  });

  it('throws on bad entity_id format', () => {
    const c = minimalConfig({ solar: [{ id: 'd', power: 'not_a_sensor' }] });
    expect(() => validateConfig(c)).toThrow(/entity/i);
  });

  it('throws on bad home.power entity_id', () => {
    const c = minimalConfig({ home: { power: 'not_an_entity' } });
    expect(() => validateConfig(c)).toThrow(/home\.power/i);
  });

  it('accepts the HA stub-config (empty grid.power + empty lists)', () => {
    const stub = {
      type: 'custom:custom-energy-flow-card' as const,
      grid: { power: '' },
      solar: [],
      battery: [],
      consumers: [],
    };
    expect(() => validateConfig(stub)).not.toThrow();
  });
});

describe('buildSystemState', () => {
  const buildHass = (states: Record<string, { state: string; attributes?: Record<string, unknown> }>): ReadSensorHassShape =>
    ({ states });

  it('maps charged_by to pairedPvId', () => {
    const config = minimalConfig({
      solar: [{ id: 'dach', power: 'sensor.s_dach' }],
      battery: [{ id: 'b_dach', soc: 'sensor.b_soc', power: 'sensor.b_p', charged_by: 'dach' }],
    });
    const hass = buildHass({
      'sensor.s_dach': { state: '1500', attributes: { unit_of_measurement: 'W' } },
      'sensor.b_soc': { state: '50', attributes: { unit_of_measurement: '%' } },
      'sensor.b_p': { state: '300', attributes: { unit_of_measurement: 'W' } },
      'sensor.grid': { state: '0', attributes: { unit_of_measurement: 'W' } },
      'sensor.x': { state: '50', attributes: { unit_of_measurement: 'W' } },
    });
    const r = buildSystemState(config, hass);
    expect(r.state.battery[0]?.pairedPvId).toBe('dach');
    expect(r.state.pv[0]?.powerW).toBe(1500);
    expect(r.warnings).toEqual([]);
    expect(r.unavailableEntities.size).toBe(0);
  });

  it('inverts battery sign when power_invert: true', () => {
    const config = minimalConfig({
      solar: [{ id: 'dach', power: 'sensor.s' }],
      battery: [{
        id: 'b', soc: 'sensor.b_soc', power: 'sensor.b_p',
        power_invert: true, charged_by: 'dach',
      }],
    });
    const hass = buildHass({
      'sensor.s': { state: '1000', attributes: { unit_of_measurement: 'W' } },
      'sensor.b_soc': { state: '50', attributes: { unit_of_measurement: '%' } },
      'sensor.b_p': { state: '500', attributes: { unit_of_measurement: 'W' } },
      'sensor.grid': { state: '0' },
      'sensor.x': { state: '0' },
    });
    expect(buildSystemState(config, hass).state.battery[0]?.powerW).toBe(-500);
  });

  it('combines import + export grid sensors into signed powerW', () => {
    const config = minimalConfig({ grid: { import: 'sensor.gi', export: 'sensor.ge' } });
    const hass = buildHass({
      'sensor.gi': { state: '0', attributes: { unit_of_measurement: 'W' } },
      'sensor.ge': { state: '300', attributes: { unit_of_measurement: 'W' } },
      'sensor.x': { state: '0' },
    });
    expect(buildSystemState(config, hass).state.grid.powerW).toBe(-300);
  });

  it('collects warnings + tracks unavailable entities', () => {
    const config = minimalConfig({
      solar: [{ id: 'dach', power: 'sensor.s_dach' }],
    });
    const hass = buildHass({
      'sensor.s_dach': { state: 'unavailable' },
      'sensor.grid': { state: '0' },
      'sensor.x': { state: '0' },
    });
    const r = buildSystemState(config, hass);
    expect(r.warnings.some((w) => w.code === 'SENSOR_UNAVAILABLE')).toBe(true);
    expect(r.unavailableEntities.has('sensor.s_dach')).toBe(true);
  });
});
```

- [ ] **Step 3: Run tests — must fail**

Run: `pnpm test src/config/schema.test.ts`
Expected: FAIL (module not found).

- [ ] **Step 4: Implement `src/config/schema.ts`**

```typescript
import { readSensorW, type ReadSensorHassShape } from '../util/read-sensor';
import type { EngineWarning } from '../util/warning-types';
import type { SystemState } from '../engine/types';
import type { BatteryConfig, Config, GridConfig, SolarConfig } from './types';

export interface BuildResult {
  state: SystemState;
  warnings: EngineWarning[];
  unavailableEntities: Set<string>;
}

const ENTITY_RE = /^[a-z_][a-z0-9_]*\.[a-z0-9_]+$/i;

/**
 * The HA card-picker calls `setConfig` with `getStubConfig()` (empty grid.power +
 * all lists empty) before the user has filled anything in. We accept this
 * marker config as valid so the card shows a friendly hint instead of crashing.
 */
function isStubShape(c: Partial<Config>): boolean {
  if (c.type !== 'custom:custom-energy-flow-card') return false;
  const gridStub = !!c.grid && 'power' in c.grid && c.grid.power === '';
  const listsEmpty = (c.solar?.length ?? 0) === 0
    && (c.battery?.length ?? 0) === 0
    && (c.consumers?.length ?? 0) === 0;
  return gridStub && listsEmpty;
}

export function validateConfig(input: unknown): Config {
  if (!isObject(input)) throw new Error('Config must be an object');
  const c = input as Partial<Config>;

  if (c.type !== 'custom:custom-energy-flow-card') {
    throw new Error('Config "type" must be "custom:custom-energy-flow-card"');
  }

  // Stub-Config aus getStubConfig() ist absichtlich gültig — Card rendert dann
  // den "Konfiguriere PV/Akku/Verbraucher"-Hinweis (UX-Zustand "Stub").
  if (isStubShape(c)) {
    return {
      type: 'custom:custom-energy-flow-card',
      version: 1,
      solar: [],
      battery: [],
      grid: c.grid as GridConfig,
      consumers: [],
    };
  }

  if (c.version !== undefined && c.version !== 1) {
    throw new Error(`Config "version" ${c.version} not supported (only 1)`);
  }

  const solar = (c.solar ?? []) as SolarConfig[];
  const battery = (c.battery ?? []) as BatteryConfig[];
  const consumers = (c.consumers ?? []) as Config['consumers'];

  validateUniqueIds(solar.map((s) => s.id), 'solar');
  validateUniqueIds(battery.map((b) => b.id), 'battery');

  for (const s of solar) {
    if (!s.id) throw new Error('solar[].id required');
    if (!s.power || !ENTITY_RE.test(s.power)) {
      throw new Error(`solar[${s.id}].power must be a valid entity_id`);
    }
  }

  const solarIds = new Set(solar.map((s) => s.id));
  const pairedPvCounts = new Map<string, number>();
  for (const b of battery) {
    if (!b.id) throw new Error('battery[].id required');
    if (!b.charged_by) throw new Error(`battery[${b.id}].charged_by required`);
    if (!solarIds.has(b.charged_by)) {
      throw new Error(`battery[${b.id}].charged_by "${b.charged_by}" not in solar`);
    }
    pairedPvCounts.set(b.charged_by, (pairedPvCounts.get(b.charged_by) ?? 0) + 1);
    if (!b.soc || !ENTITY_RE.test(b.soc)) {
      throw new Error(`battery[${b.id}].soc must be a valid entity_id`);
    }
    if (!b.power || !ENTITY_RE.test(b.power)) {
      throw new Error(`battery[${b.id}].power must be a valid entity_id`);
    }
  }
  for (const [pvId, count] of pairedPvCounts) {
    if (count > 1) {
      throw new Error(`Solar ${pvId} is paired to ${count} batteries; only 1:1 allowed`);
    }
  }

  if (!c.grid) throw new Error('grid is required');
  validateGrid(c.grid);

  for (const cons of consumers) {
    if (!cons.name) throw new Error('consumers[].name required');
    if (!cons.power || !ENTITY_RE.test(cons.power)) {
      throw new Error(`consumers[${cons.name}].power must be a valid entity_id`);
    }
  }

  if (solar.length === 0 && battery.length === 0 && consumers.length === 0) {
    throw new Error('Config must have at least one of solar, battery, or consumers');
  }

  if (c.home?.power !== undefined && !ENTITY_RE.test(c.home.power)) {
    throw new Error('home.power must be a valid entity_id');
  }

  return {
    type: 'custom:custom-energy-flow-card',
    version: c.version ?? 1,
    title: c.title,
    solar,
    battery,
    grid: c.grid,
    home: c.home,
    consumers,
    display: c.display,
  };
}

function validateGrid(grid: GridConfig): void {
  const hasPower = 'power' in grid && typeof grid.power === 'string';
  const hasImportExport = 'import' in grid && 'export' in grid;
  if (hasPower === hasImportExport) {
    throw new Error('grid must have either "power" or both "import"+"export", not both, not neither');
  }
  if (hasPower) {
    if (!ENTITY_RE.test((grid as { power: string }).power)) {
      throw new Error('grid.power must be a valid entity_id');
    }
  } else {
    const g = grid as { import: string; export: string };
    if (!ENTITY_RE.test(g.import) || !ENTITY_RE.test(g.export)) {
      throw new Error('grid.import and grid.export must be valid entity_ids');
    }
  }
}

function validateUniqueIds(ids: string[], scope: string): void {
  const seen = new Set<string>();
  for (const id of ids) {
    if (seen.has(id)) {
      throw new Error(`Duplicate ${scope}.id "${id}"`);
    }
    seen.add(id);
  }
}

function isObject(x: unknown): x is Record<string, unknown> {
  return typeof x === 'object' && x !== null;
}

export function buildSystemState(config: Config, hass: ReadSensorHassShape): BuildResult {
  const warnings: EngineWarning[] = [];
  const unavailable = new Set<string>();

  const read = (entityId: string, opts?: Parameters<typeof readSensorW>[2]): number => {
    const r = readSensorW(hass, entityId, opts);
    if (r.warning) {
      warnings.push(r.warning);
      if (r.warning.code === 'SENSOR_UNAVAILABLE') unavailable.add(entityId);
    }
    return r.value;
  };

  const pv = config.solar.map((s) => ({ id: s.id, powerW: read(s.power) }));

  const battery = config.battery.map((b) => ({
    id: b.id,
    pairedPvId: b.charged_by,
    powerW: read(b.power, { invertSign: b.power_invert }),
    socPct: read(b.soc, { expectedUnit: '%' }),
  }));

  let gridPowerW = 0;
  if ('power' in config.grid) {
    gridPowerW = read(config.grid.power, { invertSign: config.grid.power_invert });
  } else {
    const imp = read(config.grid.import);
    const exp = read(config.grid.export);
    gridPowerW = imp - exp;
  }

  const consumer = config.consumers.map((c, i) => ({ id: `c${i}`, powerW: read(c.power) }));

  const home: SystemState['home'] = {};
  if (config.home?.power) home.powerOverrideW = read(config.home.power);

  return {
    state: { pv, battery, grid: { powerW: gridPowerW }, consumer, home },
    warnings,
    unavailableEntities: unavailable,
  };
}
```

- [ ] **Step 5: Run all tests with coverage**

Run: `pnpm test:coverage`
Expected: all PASS, config/ coverage ≥ 90 %.

- [ ] **Step 6: Run full Phase-1 gate**

Run: `pnpm check`
Expected: lint, typecheck, all tests PASS. Engine + Config + Util coverage ≥ 90 %.

- [ ] **Step 7: Commit**

```bash
git add src/config/types.ts src/config/schema.ts src/config/schema.test.ts
git commit -m "feat(config): add schema validation and buildSystemState mapping"
```

---

## Phase 2 — Renderer + Sandbox

### Task 2.1: `render/theme.ts`

**Files:**
- Create: `src/render/theme.ts`

- [ ] **Step 1: Implement `src/render/theme.ts`**

```typescript
import { resolveColor, type ColorRole } from '../util/resolve-color';

export interface ThemeContext {
  colorOverrides?: Partial<Record<ColorRole, string>>;
}

export function colorFor(role: ColorRole, ctx: ThemeContext = {}): string {
  return resolveColor(role, ctx.colorOverrides);
}

export const HA_CSS_VARS = {
  cardBackground: 'var(--ha-card-background, var(--card-background-color, #fff))',
  primaryText: 'var(--primary-text-color, #0f172a)',
  secondaryText: 'var(--secondary-text-color, #64748b)',
  divider: 'var(--divider-color, #e2e8f0)',
  cardPadding: 'var(--ha-card-padding, 16px)',
} as const;
```

- [ ] **Step 2: Verify typecheck**

Run: `pnpm typecheck`
Expected: PASS.

- [ ] **Step 3: Commit**

```bash
git add src/render/theme.ts
git commit -m "feat(render): add theme color resolution and HA CSS-var constants"
```

### Task 2.2: `render/layout.ts`

**Files:**
- Create: `src/render/layout.ts`
- Test: `src/render/layout.test.ts`

- [ ] **Step 1: Write failing tests**

Create `src/render/layout.test.ts`:

```typescript
import { describe, expect, it } from 'vitest';
import { computeLayout } from './layout';
import type { Config } from '../config/types';

const baseConfig = (over: Partial<Config> = {}): Config => ({
  type: 'custom:custom-energy-flow-card',
  solar: [],
  battery: [],
  grid: { power: 'sensor.grid' },
  consumers: [],
  ...over,
});

describe('computeLayout', () => {
  it('places single PV centered above home', () => {
    const c = baseConfig({ solar: [{ id: 'dach', power: 'sensor.s' }] });
    const l = computeLayout(c);
    const pv = l.nodes.find((n) => n.kind === 'pv' && n.id === 'dach');
    expect(pv).toBeDefined();
    expect(pv?.x).toBeCloseTo(360, 0);
  });

  it('places two PVs symmetrically', () => {
    const c = baseConfig({
      solar: [
        { id: 'dach', power: 'sensor.a' },
        { id: 'balkon', power: 'sensor.b' },
      ],
    });
    const l = computeLayout(c);
    const dach = l.nodes.find((n) => n.kind === 'pv' && n.id === 'dach');
    const balkon = l.nodes.find((n) => n.kind === 'pv' && n.id === 'balkon');
    expect(dach?.x).toBeLessThan(360);
    expect(balkon?.x).toBeGreaterThan(360);
  });

  it('places battery at same x as paired PV', () => {
    const c = baseConfig({
      solar: [
        { id: 'dach', power: 'sensor.a' },
        { id: 'balkon', power: 'sensor.b' },
      ],
      battery: [
        { id: 'b_dach', soc: 's.bs', power: 's.bp', charged_by: 'dach' },
        { id: 'b_balkon', soc: 's.bs2', power: 's.bp2', charged_by: 'balkon' },
      ],
    });
    const l = computeLayout(c);
    const pvDach = l.nodes.find((n) => n.kind === 'pv' && n.id === 'dach');
    const battDach = l.nodes.find((n) => n.kind === 'battery' && n.id === 'b_dach');
    expect(battDach?.x).toBeCloseTo(pvDach?.x ?? 0, 0);
  });

  it('always places grid left, home center, with grid x < home x', () => {
    const l = computeLayout(baseConfig());
    const grid = l.nodes.find((n) => n.kind === 'grid');
    const home = l.nodes.find((n) => n.kind === 'home');
    expect(grid).toBeDefined();
    expect(home).toBeDefined();
    expect(grid!.x).toBeLessThan(home!.x);
  });

  it('stacks consumers vertically on the right', () => {
    const c = baseConfig({
      consumers: [
        { name: 'A', power: 'sensor.a' },
        { name: 'B', power: 'sensor.b' },
        { name: 'C', power: 'sensor.c' },
      ],
    });
    const l = computeLayout(c);
    const cons = l.nodes.filter((n) => n.kind === 'consumer');
    expect(cons).toHaveLength(3);
    expect(cons.every((n) => n.x > 600)).toBe(true);
    const ys = cons.map((n) => n.y);
    expect(ys[0]).toBeLessThan(ys[1] ?? 0);
    expect(ys[1]).toBeLessThan(ys[2] ?? 0);
  });

  it('produces edge entries for all 16 flow paths in 2-PV/2-batt/3-cons setup', () => {
    const c = baseConfig({
      solar: [
        { id: 'dach', power: 's.d' },
        { id: 'balkon', power: 's.b' },
      ],
      battery: [
        { id: 'bd', soc: 's.bds', power: 's.bdp', charged_by: 'dach' },
        { id: 'bb', soc: 's.bbs', power: 's.bbp', charged_by: 'balkon' },
      ],
      consumers: [
        { name: 'A', power: 's.ca' },
        { name: 'B', power: 's.cb' },
        { name: 'C', power: 's.cc' },
      ],
    });
    const l = computeLayout(c);
    const kinds = l.edges.map((e) => e.kind);
    expect(kinds.filter((k) => k === 'pv-to-home').length).toBe(2);
    expect(kinds.filter((k) => k === 'pv-to-battery').length).toBe(2);
    expect(kinds.filter((k) => k === 'pv-to-grid').length).toBe(2);
    expect(kinds.filter((k) => k === 'battery-to-home').length).toBe(2);
    expect(kinds.filter((k) => k === 'battery-to-grid').length).toBe(2);
    expect(kinds.filter((k) => k === 'grid-to-home').length).toBe(1);
    expect(kinds.filter((k) => k === 'grid-to-battery').length).toBe(2);  // Pairing-Defizit-Pfade
    expect(kinds.filter((k) => k === 'home-to-consumer').length).toBe(3);
    expect(l.edges).toHaveLength(16);
  });

  it('handles 0 PVs (config with only grid + consumers)', () => {
    const c = baseConfig({ consumers: [{ name: 'x', power: 's.x' }] });
    const l = computeLayout(c);
    expect(l.nodes.filter((n) => n.kind === 'pv')).toHaveLength(0);
    expect(l.edges.every((e) => !e.kind.startsWith('pv-'))).toBe(true);
  });

  it('handles 5 PVs distributed in the band', () => {
    const c = baseConfig({
      solar: Array.from({ length: 5 }, (_, i) => ({ id: `pv${i}`, power: `s.${i}` })),
    });
    const l = computeLayout(c);
    const pvs = l.nodes.filter((n) => n.kind === 'pv');
    expect(pvs).toHaveLength(5);
    const xs = pvs.map((n) => n.x);
    for (let i = 1; i < xs.length; i++) expect(xs[i]).toBeGreaterThan(xs[i - 1] ?? 0);
  });

  it('handles split-grid form (import + export)', () => {
    const c: Config = {
      type: 'custom:custom-energy-flow-card',
      solar: [],
      battery: [],
      grid: { import: 'sensor.gi', export: 'sensor.ge' },
      consumers: [{ name: 'x', power: 's.x' }],
    };
    expect(() => computeLayout(c)).not.toThrow();
    expect(computeLayout(c).nodes.find((n) => n.kind === 'grid')).toBeDefined();
  });

  it('battery without paired PV in the layout still rendered (validation prevents it but defensive)', () => {
    // Validation würde dieses Setup ablehnen — Layout selbst ist trotzdem defensiv.
    const c = baseConfig({
      battery: [{ id: 'b_orphan', soc: 's.bs', power: 's.bp', charged_by: 'nonexistent' }],
    });
    expect(() => computeLayout(c)).not.toThrow();
  });
});
```

- [ ] **Step 2: Run tests — must fail**

Run: `pnpm test src/render/layout.test.ts`
Expected: FAIL.

- [ ] **Step 3: Implement `src/render/layout.ts`**

```typescript
import { VIEWBOX } from '../const';
import type { FlowEdgeKind, NodeKind } from '../engine/flow-graph';
import { bezierPath, straightPath, type Point } from '../util/svg-path';
import type { Config } from '../config/types';

export interface LayoutNode {
  id: string;
  kind: NodeKind;
  x: number;
  y: number;
  r: number;
}

export interface LayoutEdge {
  id: string;
  kind: FlowEdgeKind;
  fromNodeId: string;
  toNodeId: string;
  d: string;
}

export interface LayoutResult {
  width: number;
  height: number;
  nodes: LayoutNode[];
  edges: LayoutEdge[];
}

const NODE_R_LARGE = 50;
const NODE_R_MEDIUM = 42;
const NODE_R_SMALL = 32;
const TOP_Y = 80;
const BOTTOM_Y = 460;
const MIDDLE_Y = 270;
const GRID_X = 60;
const HOME_X = 360;
const CONSUMER_X = 660;
const PV_BAND_LEFT = 130;
const PV_BAND_RIGHT = 590;
const BATTERY_BAND_LEFT = PV_BAND_LEFT;
const BATTERY_BAND_RIGHT = PV_BAND_RIGHT;
const CONSUMER_Y_TOP = 160;
const CONSUMER_Y_GAP = 110;

export function computeLayout(config: Config): LayoutResult {
  const nodes: LayoutNode[] = [];

  // Solar (top): horizontal distribution
  const solarCount = config.solar.length;
  config.solar.forEach((s, i) => {
    const x = solarCount === 1
      ? HOME_X
      : PV_BAND_LEFT + ((PV_BAND_RIGHT - PV_BAND_LEFT) * i) / Math.max(1, solarCount - 1);
    nodes.push({ id: s.id, kind: 'pv', x, y: TOP_Y, r: NODE_R_MEDIUM });
  });

  // Grid (left)
  nodes.push({ id: '__grid', kind: 'grid', x: GRID_X, y: MIDDLE_Y, r: NODE_R_MEDIUM });

  // Home (center)
  nodes.push({ id: '__home', kind: 'home', x: HOME_X, y: MIDDLE_Y, r: NODE_R_LARGE });

  // Battery (bottom): each battery aligned x with paired PV
  config.battery.forEach((b) => {
    const pairedPv = nodes.find((n) => n.kind === 'pv' && n.id === b.charged_by);
    const x = pairedPv?.x ?? HOME_X;
    nodes.push({ id: b.id, kind: 'battery', x, y: BOTTOM_Y, r: NODE_R_MEDIUM });
  });

  // Consumers (right): vertical stack
  config.consumers.forEach((c, i) => {
    nodes.push({
      id: `c${i}`,
      kind: 'consumer',
      x: CONSUMER_X,
      y: CONSUMER_Y_TOP + i * CONSUMER_Y_GAP,
      r: NODE_R_SMALL,
    });
  });

  const edges: LayoutEdge[] = [];
  const homeNode = nodes.find((n) => n.kind === 'home');
  const gridNode = nodes.find((n) => n.kind === 'grid');
  if (!homeNode || !gridNode) {
    throw new Error('Layout invariant: home and grid nodes always present');
  }

  for (const s of config.solar) {
    const pvNode = nodes.find((n) => n.kind === 'pv' && n.id === s.id);
    if (!pvNode) continue;
    edges.push({
      id: `pv-${s.id}-to-home`,
      kind: 'pv-to-home',
      fromNodeId: s.id,
      toNodeId: '__home',
      d: bezierPath(pvNode, homeNode, midpoint(pvNode, homeNode, 30)),
    });
    edges.push({
      id: `pv-${s.id}-to-grid`,
      kind: 'pv-to-grid',
      fromNodeId: s.id,
      toNodeId: '__grid',
      d: bezierPath(pvNode, gridNode, { x: gridNode.x - 20, y: pvNode.y + 80 }),
    });
    const paired = config.battery.find((b) => b.charged_by === s.id);
    if (paired) {
      const battNode = nodes.find((n) => n.kind === 'battery' && n.id === paired.id);
      if (battNode) {
        edges.push({
          id: `pv-${s.id}-to-battery-${paired.id}`,
          kind: 'pv-to-battery',
          fromNodeId: s.id,
          toNodeId: paired.id,
          d: bezierPath(pvNode, battNode, { x: pvNode.x - 60, y: 270 }),
        });
      }
    }
  }

  for (const b of config.battery) {
    const battNode = nodes.find((n) => n.kind === 'battery' && n.id === b.id);
    if (!battNode) continue;
    edges.push({
      id: `battery-${b.id}-to-home`,
      kind: 'battery-to-home',
      fromNodeId: b.id,
      toNodeId: '__home',
      d: bezierPath(battNode, homeNode, midpoint(battNode, homeNode, -30)),
    });
    edges.push({
      id: `battery-${b.id}-to-grid`,
      kind: 'battery-to-grid',
      fromNodeId: b.id,
      toNodeId: '__grid',
      d: bezierPath(battNode, gridNode, { x: gridNode.x - 20, y: battNode.y - 80 }),
    });
  }

  edges.push({
    id: 'grid-to-home',
    kind: 'grid-to-home',
    fromNodeId: '__grid',
    toNodeId: '__home',
    d: straightPath(gridNode, homeNode),
  });

  // Grid → Battery (Pairing-Defizit-Pfad, siehe ADR-0007 v2). Bogen unter dem
  // Haus durch nach unten zur Battery — gespiegeltes Routing zu battery → grid.
  for (const b of config.battery) {
    const battNode = nodes.find((n) => n.kind === 'battery' && n.id === b.id);
    if (!battNode) continue;
    edges.push({
      id: `grid-to-battery-${b.id}`,
      kind: 'grid-to-battery',
      fromNodeId: '__grid',
      toNodeId: b.id,
      d: bezierPath(gridNode, battNode, { x: gridNode.x - 20, y: battNode.y - 80 }),
    });
  }

  config.consumers.forEach((c, i) => {
    const consNode = nodes.find((n) => n.kind === 'consumer' && n.id === `c${i}`);
    if (!consNode) return;
    edges.push({
      id: `home-to-c${i}`,
      kind: 'home-to-consumer',
      fromNodeId: '__home',
      toNodeId: `c${i}`,
      d: straightPath(homeNode, consNode),
    });
  });

  return { width: VIEWBOX.width, height: VIEWBOX.height, nodes, edges };
}

function midpoint(a: Point, b: Point, yOffset: number): Point {
  return { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 + yOffset };
}
```

- [ ] **Step 4: Run tests — must pass**

Run: `pnpm test src/render/layout.test.ts`
Expected: all 6 tests PASS.

- [ ] **Step 5: Commit**

```bash
git add src/render/layout.ts src/render/layout.test.ts
git commit -m "feat(render): add layout engine for nodes and 14 flow edges"
```

### Task 2.3: `render/home-ring.ts`

**Files:**
- Create: `src/render/home-ring.ts`

- [ ] **Step 1: Implement `src/render/home-ring.ts`**

```typescript
import { svg, type SVGTemplateResult } from 'lit';
import type { HomeAttribution } from '../engine/types';
import { colorFor, type ThemeContext } from './theme';

const RING_RADIUS = 60;
const RING_WIDTH = 9;
const CIRCUMFERENCE = 2 * Math.PI * RING_RADIUS;

export function renderHomeRing(
  attribution: HomeAttribution,
  cx: number,
  cy: number,
  theme: ThemeContext = {},
): SVGTemplateResult {
  const totalShare = attribution.shares.reduce((s, x) => s + x.share, 0);
  if (totalShare <= 0) return svg``;

  const segments: SVGTemplateResult[] = [];
  let offset = 0;
  for (const share of attribution.shares) {
    if (share.share <= 0) continue;
    const length = (share.share / totalShare) * CIRCUMFERENCE;
    const stroke = share.sourceKind === 'pv'
      ? colorFor('solar', theme)
      : share.sourceKind === 'battery'
        ? colorFor('battery', theme)
        : colorFor('grid_import', theme);
    segments.push(svg`
      <circle
        cx="0" cy="0" r="${RING_RADIUS}"
        fill="none"
        stroke="${stroke}"
        stroke-width="${RING_WIDTH}"
        stroke-dasharray="${length} ${CIRCUMFERENCE}"
        stroke-dashoffset="${-offset}"
        opacity="0.95"
      ></circle>
    `);
    offset += length;
  }

  return svg`
    <g transform="translate(${cx} ${cy}) rotate(-90)" part="home-ring">
      ${segments}
    </g>
  `;
}
```

- [ ] **Step 2: Verify typecheck**

Run: `pnpm typecheck`
Expected: PASS.

- [ ] **Step 3: Commit**

```bash
git add src/render/home-ring.ts
git commit -m "feat(render): add home attribution doughnut ring"
```

### Task 2.3a: `render/edge-color.ts` (shared edge → color role mapping)

**Files:**
- Create: `src/render/edge-color.ts`

- [ ] **Step 1: Implement `src/render/edge-color.ts`**

```typescript
import type { FlowEdgeKind } from '../engine/flow-graph';
import type { ColorRole } from '../util/resolve-color';

export function edgeColorRole(kind: FlowEdgeKind): ColorRole {
  switch (kind) {
    case 'pv-to-home':
    case 'pv-to-battery':
      return 'solar';
    case 'pv-to-grid':
    case 'battery-to-grid':
      return 'grid_export';
    case 'battery-to-home':
      return 'battery';
    case 'grid-to-home':
    case 'grid-to-battery':   // Strom kommt aus dem Netz → grid_import
      return 'grid_import';
    case 'home-to-consumer':
      return 'consumer';
  }
}
```

- [ ] **Step 2: Verify typecheck**

Run: `pnpm typecheck`
Expected: PASS.

- [ ] **Step 3: Commit**

```bash
git add src/render/edge-color.ts
git commit -m "feat(render): extract shared edge-to-color mapping (DRY)"
```

### Task 2.4: `render/flow-renderer.ts`

**Files:**
- Create: `src/render/flow-renderer.ts`

- [ ] **Step 1: Implement `src/render/flow-renderer.ts`**

```typescript
import { html, svg, type TemplateResult } from 'lit';
import { DE } from '../i18n/de';
import { formatPowerW } from '../util/format-power';
import type { Config, ConsumerConfig, SolarConfig, BatteryConfig } from '../config/types';
import type { ColorRole } from '../util/resolve-color';
import type { EngineWarning } from '../util/warning-types';
import type { FlowResult, PerSourceFlow } from '../engine/types';
import type { LayoutEdge, LayoutNode, LayoutResult } from './layout';
import { colorFor, HA_CSS_VARS, type ThemeContext } from './theme';
import { renderHomeRing } from './home-ring';
import { edgeColorRole } from './edge-color';

export interface RenderContext {
  config: Config;
  formatGrouped: boolean;
  activeThresholdW: number;
  showInactive: boolean;
  theme: ThemeContext;
  buildWarnings: EngineWarning[];      // warnings collected in buildSystemState
  unavailableEntities: Set<string>;    // entity_ids that are 'unavailable'/'unknown'
  onNodeClick?: (nodeId: string) => void;
}

const TAB_ORDER: ReadonlyArray<LayoutNode['kind']> = ['pv', 'grid', 'battery', 'consumer', 'home'];

function sortForTabOrder(nodes: ReadonlyArray<LayoutNode>): LayoutNode[] {
  return [...nodes].sort((a, b) => {
    const ka = TAB_ORDER.indexOf(a.kind);
    const kb = TAB_ORDER.indexOf(b.kind);
    if (ka !== kb) return ka - kb;
    if (a.x !== b.x) return a.x - b.x;
    return a.y - b.y;
  });
}

export function renderCard(
  layout: LayoutResult,
  result: FlowResult,
  ctx: RenderContext,
): TemplateResult {
  const orderedNodes = sortForTabOrder(layout.nodes);
  return html`
    <svg
      viewBox="0 0 ${layout.width} ${layout.height}"
      preserveAspectRatio="xMidYMid meet"
      part="card"
      role="group"
      aria-label="${DE.card.name}"
    >
      ${layout.edges.map((e) => renderEdge(e, result, ctx))}
      ${orderedNodes.map((n) => renderNode(n, result, ctx))}
    </svg>
  `;
}

function edgePower(edge: LayoutEdge, result: FlowResult): number {
  switch (edge.kind) {
    case 'pv-to-home': return findFlow(result.flows.pvToHome, edge.fromNodeId);
    case 'pv-to-battery': return findFlow(result.flows.pvToBattery, edge.fromNodeId);
    case 'pv-to-grid': return findFlow(result.flows.pvToGrid, edge.fromNodeId);
    case 'battery-to-home': return findFlow(result.flows.batteryToHome, edge.fromNodeId);
    case 'battery-to-grid': return findFlow(result.flows.batteryToGrid, edge.fromNodeId);
    case 'grid-to-home': return result.flows.gridToHome;
    case 'grid-to-battery': return findFlow(result.flows.gridToBattery, edge.toNodeId);
    case 'home-to-consumer': return findFlow(result.flows.homeToConsumer, edge.toNodeId);
  }
}

function findFlow(flows: PerSourceFlow[], id: string): number {
  return flows.find((f) => f.sourceId === id)?.powerW ?? 0;
}

function renderEdge(edge: LayoutEdge, result: FlowResult, ctx: RenderContext): TemplateResult {
  const power = edgePower(edge, result);
  const active = power > ctx.activeThresholdW;
  if (!active && !ctx.showInactive) return svg``;
  const color = colorFor(edgeColorRole(edge.kind), ctx.theme);
  return svg`
    <path
      d="${edge.d}"
      class="flow-line ${active ? 'animated' : 'idle'}"
      stroke="${color}"
      fill="none"
      part="flow flow-${edge.kind}"
      data-power="${power}"
    ></path>
  `;
}

function nodeColorRole(kind: LayoutNode['kind']): ColorRole {
  switch (kind) {
    case 'pv': return 'solar';
    case 'battery': return 'battery';
    case 'grid': return 'grid_import';
    case 'home': return 'home';
    case 'consumer': return 'consumer';
  }
}

function renderNode(node: LayoutNode, result: FlowResult, ctx: RenderContext): TemplateResult {
  const unavailable = isNodeUnavailable(node, ctx);
  const color = colorFor(nodeColorRole(node.kind), ctx.theme);
  const value = unavailable ? formatPowerW(Number.NaN) : nodeValueText(node, result, ctx);
  const name = nodeName(node, ctx);
  const ariaLabel = unavailable
    ? `${name}: ${DE.states.sensorUnavailable}`
    : `${name}: ${value}`;

  const ring = node.kind === 'home'
    ? renderHomeRing(result.homeAttribution, 0, 0, ctx.theme)
    : svg``;
  const labelOffset = labelYOffset(node);
  const strokeDash = unavailable ? '4 4' : '';

  return svg`
    <g
      transform="translate(${node.x} ${node.y})"
      class="node node--${node.kind} ${unavailable ? 'node--unavailable' : ''}"
      part="node node-${node.kind}"
      role="button"
      tabindex="0"
      aria-label="${ariaLabel}"
      @click=${() => ctx.onNodeClick?.(node.id)}
      @keydown=${(e: KeyboardEvent) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          ctx.onNodeClick?.(node.id);
        }
      }}
    >
      ${ring}
      <circle
        r="${node.r}"
        fill="${HA_CSS_VARS.cardBackground}"
        stroke="${color}"
        stroke-width="2.5"
        stroke-dasharray="${strokeDash}"
      ></circle>
      <text class="node-icon" text-anchor="middle" y="${node.kind === 'home' ? -10 : -4}" font-size="${node.kind === 'home' ? 28 : 22}">
        ${nodeIconChar(node, ctx)}
      </text>
      <text class="node-value" text-anchor="middle" y="${node.kind === 'home' ? 14 : 16}" font-weight="700" font-size="${node.kind === 'home' ? 15 : 13}">
        ${value}
      </text>
      <text class="node-name" text-anchor="middle" y="${labelOffset}" font-size="11" font-weight="600">
        ${name}
      </text>
    </g>
  `;
}

function isNodeUnavailable(node: LayoutNode, ctx: RenderContext): boolean {
  if (node.kind === 'grid' && !('power' in ctx.config.grid)) {
    // Split-grid form: unavailable if either import or export sensor is missing.
    return ctx.unavailableEntities.has(ctx.config.grid.import)
      || ctx.unavailableEntities.has(ctx.config.grid.export);
  }
  const id = entityIdForNode(node, ctx.config);
  return id !== undefined && ctx.unavailableEntities.has(id);
}

function entityIdForNode(node: LayoutNode, config: Config): string | undefined {
  if (node.kind === 'pv') return config.solar.find((s) => s.id === node.id)?.power;
  if (node.kind === 'battery') return config.battery.find((b) => b.id === node.id)?.power;
  if (node.kind === 'grid') return 'power' in config.grid ? config.grid.power : config.grid.import;
  if (node.kind === 'consumer') {
    const idx = Number.parseInt(node.id.slice(1), 10);
    return config.consumers[idx]?.power;
  }
  return undefined;
}

function labelYOffset(node: LayoutNode): number {
  switch (node.kind) {
    case 'pv': return -node.r - 16;
    case 'battery': return node.r + 22;
    case 'home': return node.r + 32;
    case 'grid':
    case 'consumer':
      return -node.r - 16;
  }
}

function nodeValueText(node: LayoutNode, result: FlowResult, ctx: RenderContext): string {
  const fmt = ctx.formatGrouped ? 'grouped' : 'standard';
  if (node.kind === 'home') return formatPowerW(result.homeW, { format: fmt });
  if (node.kind === 'grid') {
    const gridFlow = result.flows.gridToHome;
    const exportFlow = -(result.flows.pvToGrid.reduce((s, f) => s + f.powerW, 0)
      + result.flows.batteryToGrid.reduce((s, f) => s + f.powerW, 0));
    const signed = gridFlow > 0 ? gridFlow : exportFlow;
    return formatPowerW(signed, { format: fmt, signed: true });
  }
  if (node.kind === 'pv') {
    const inHome = findFlow(result.flows.pvToHome, node.id);
    const inBatt = findFlow(result.flows.pvToBattery, node.id);
    const inGrid = findFlow(result.flows.pvToGrid, node.id);
    return formatPowerW(inHome + inBatt + inGrid, { format: fmt });
  }
  if (node.kind === 'battery') {
    const out = findFlow(result.flows.batteryToHome, node.id) + findFlow(result.flows.batteryToGrid, node.id);
    return formatPowerW(out, { format: fmt });
  }
  if (node.kind === 'consumer') {
    return formatPowerW(findFlow(result.flows.homeToConsumer, node.id), { format: fmt });
  }
  return formatPowerW(Number.NaN);
}

function configEntryForNode(node: LayoutNode, config: Config): SolarConfig | BatteryConfig | ConsumerConfig | undefined {
  if (node.kind === 'pv') return config.solar.find((s) => s.id === node.id);
  if (node.kind === 'battery') return config.battery.find((b) => b.id === node.id);
  if (node.kind === 'consumer') return config.consumers[Number.parseInt(node.id.slice(1), 10)];
  return undefined;
}

function nodeName(node: LayoutNode, ctx: RenderContext): string {
  const entry = configEntryForNode(node, ctx.config);
  if (entry?.name) return entry.name;
  switch (node.kind) {
    case 'pv': return `${DE.nodes.solar} ${node.id}`;
    case 'battery': return `${DE.nodes.battery} ${node.id}`;
    case 'grid': return DE.nodes.grid;
    case 'home': return ctx.config.home?.name ?? DE.nodes.home;
    case 'consumer': return `${DE.nodes.consumer} ${node.id}`;
  }
}

const DEFAULT_ICONS: Record<LayoutNode['kind'], string> = {
  pv: '☀',
  battery: '🔋',
  grid: '⚡',
  home: '🏠',
  consumer: '🔌',
};

function nodeIconChar(node: LayoutNode, ctx: RenderContext): string {
  // For v1.0 we use Emoji defaults (Spec §9 acceptable fallback). User-configured
  // mdi:* icon names are stored in config but not rendered as SVG paths in v1.0;
  // this is an explicit deferral to v1.x — see Spec §9.
  const entry = configEntryForNode(node, ctx.config);
  // If user supplied a non-mdi icon (e.g. an emoji directly), pass through:
  if (entry?.icon && !entry.icon.startsWith('mdi:')) return entry.icon;
  return DEFAULT_ICONS[node.kind];
}
```

- [ ] **Step 2: Verify typecheck**

Run: `pnpm typecheck`
Expected: PASS.

- [ ] **Step 3: Commit**

```bash
git add src/render/flow-renderer.ts
git commit -m "feat(render): add flow renderer for nodes, edges, ring, a11y"
```

### Task 2.5: `render/flow-animation.ts`

**Files:**
- Create: `src/render/flow-animation.ts`

> **Animation-Update-Strategie (Spec §5.7, ADR-0005):** Wir nutzen CSS
> `offset-path` (statt SVG `<animateMotion>`), weil das Animations-Parameter
> via CSS-Variable parametrisierbar macht. Die *konkrete v1.0-Implementation*
> nutzt **Lit-Template mit `style="--dur: ..."`-Interpolation** — der
> reaktive Render-Cycle patcht nur den `style`-Attribute-String. Das ist die
> idiomatic-Lit-Lösung. Eine direkte `el.style.setProperty(...)`-Variante
> außerhalb von Lit ist eine optionale v1.x-Optimierung mit marginalem
> Performance-Gewinn bei wenigen Pfaden — siehe Spec §5.7 Abschnitt
> „Optionale v1.x-Optimierung".

- [ ] **Step 1: Implement `src/render/flow-animation.ts`**

```typescript
import { svg, type SVGTemplateResult } from 'lit';
import type { LayoutEdge } from './layout';
import { colorFor, type ThemeContext } from './theme';
import type { FlowEdgeKind } from '../engine/flow-graph';
import type { AnimationConfig } from '../config/types';
import { DEFAULTS } from '../const';
import { edgeColorRole } from './edge-color';

export interface AnimationParams {
  durationS: number;
  dotCount: number;
  color: string;
}

export function computeAnimationParams(
  powerW: number,
  edgeKind: FlowEdgeKind,
  cfg: AnimationConfig | undefined,
  theme: ThemeContext,
): AnimationParams {
  const a = { ...DEFAULTS.animation, ...cfg };
  const safeRef = Math.max(1, a.reference_power_w);
  const rawDur = a.base_duration_s * (safeRef / Math.max(1, powerW));
  const durationS = clamp(rawDur, a.min_duration_s, a.base_duration_s * 4);
  const rawDots = Math.ceil((powerW / safeRef) * 2);
  const dotCount = clamp(rawDots, 1, a.max_dots_per_path);
  const role = edgeColorRole(edgeKind);
  return { durationS, dotCount, color: colorFor(role, theme) };
}

export function renderDots(
  edge: LayoutEdge,
  params: AnimationParams,
): SVGTemplateResult {
  // `--dur` is set on the outer wrapper-<g> in flow-renderer.renderEdge so
  // that the line-stream animation and the dot motion stay in sync. Here we
  // only set per-dot offset-path and animation-delay.
  const dots: SVGTemplateResult[] = [];
  const stride = params.durationS / params.dotCount;
  for (let i = 0; i < params.dotCount; i++) {
    const delayS = i * stride;
    dots.push(svg`
      <circle
        class="flow-dot"
        r="3.5"
        style="
          offset-path: path('${edge.d}');
          animation-delay: ${delayS}s;
        "
      ></circle>
    `);
  }
  return svg`
    <g class="flow-dots" part="flow-dots flow-dots-${edge.kind}">
      ${dots}
    </g>
  `;
}

function clamp(v: number, lo: number, hi: number): number {
  return Math.min(Math.max(v, lo), hi);
}

export const ANIMATION_CSS = `
  @keyframes flow-dot-move {
    from { offset-distance: 0%; }
    to { offset-distance: 100%; }
  }
  @keyframes flow-line-stream {
    to { stroke-dashoffset: -40; }
  }
  .flow-line {
    fill: none;
    stroke-width: 1.6;
    opacity: 0.6;
  }
  .flow-line.animated {
    stroke-dasharray: 4 6;
    animation: flow-line-stream var(--dur, 2s) linear infinite;
  }
  .flow-line.idle {
    opacity: 0.08;
  }
  .flow-dot {
    fill: var(--flow-color, currentColor);
    animation: flow-dot-move var(--dur, 2s) linear infinite;
  }
  @media (prefers-reduced-motion: reduce) {
    .flow-dot { animation-duration: 0s !important; }
    .flow-line.animated {
      animation: none;
      opacity: 0.6;
    }
  }
`;
```

- [ ] **Step 2: Integrate animation into renderer**

Edit `src/render/flow-renderer.ts`:

a) Add to imports (top of file, with the other render-imports):

```typescript
import { computeAnimationParams, renderDots } from './flow-animation';
import type { AnimationConfig } from '../config/types';
```

b) Add `animation?: AnimationConfig` to `RenderContext`. The interface becomes:

```typescript
export interface RenderContext {
  config: Config;
  formatGrouped: boolean;
  activeThresholdW: number;
  showInactive: boolean;
  theme: ThemeContext;
  buildWarnings: EngineWarning[];
  unavailableEntities: Set<string>;
  animation?: AnimationConfig;
  onNodeClick?: (nodeId: string) => void;
}
```

c) Replace the body of `renderEdge` to emit dots when active. Find:

```typescript
  const color = colorFor(edgeColorRole(edge.kind), ctx.theme);
  return svg`
    <path
      d="${edge.d}"
      class="flow-line ${active ? 'animated' : 'idle'}"
      stroke="${color}"
      fill="none"
      part="flow flow-${edge.kind}"
      data-power="${power}"
    ></path>
  `;
}
```

Replace with (note: `--dur` lebt auf dem äußeren `<g>` als Wrapper, sodass
`flow-line.animated` *und* die Punkte denselben CSS-Variable-Wert sehen):

```typescript
  const color = colorFor(edgeColorRole(edge.kind), ctx.theme);
  if (!active) {
    return svg`
      <g part="flow flow-${edge.kind}">
        <path
          d="${edge.d}"
          class="flow-line idle"
          stroke="${color}"
          fill="none"
          data-power="${power}"
        ></path>
      </g>
    `;
  }
  const params = computeAnimationParams(power, edge.kind, ctx.animation, ctx.theme);
  return svg`
    <g
      part="flow flow-${edge.kind}"
      style="--dur: ${params.durationS}s; --flow-color: ${color};"
    >
      <path
        d="${edge.d}"
        class="flow-line animated"
        stroke="${color}"
        fill="none"
        data-power="${power}"
      ></path>
      ${renderDots(edge, params)}
    </g>
  `;
}
```

- [ ] **Step 3: Verify typecheck**

Run: `pnpm typecheck`
Expected: PASS.

- [ ] **Step 4: Commit**

```bash
git add src/render/flow-animation.ts src/render/flow-renderer.ts
git commit -m "feat(render): add CSS offset-path dot animation per power/edge"
```

### Task 2.6: Sandbox (`examples/preview-mocks.ts` and `examples/preview.html`)

**Files:**
- Create: `examples/preview-mocks.ts`
- Create: `examples/preview.html`
- Create: `scripts/build-preview.mjs`

- [ ] **Step 1: Implement `examples/preview-mocks.ts`**

```typescript
import type { Config } from '../src/config/types';

export interface MockHassEntity {
  state: string;
  attributes?: Record<string, unknown>;
}

export interface MockScenario {
  name: string;
  emoji: string;
  config: Config;
  hassStates: Record<string, MockHassEntity>;
}

const baseConfig = (): Config => ({
  type: 'custom:custom-energy-flow-card',
  title: 'Energiefluss',
  solar: [
    { id: 'dach', name: 'Solar Dach', power: 'sensor.s_dach' },
    { id: 'balkon', name: 'Solar Balkon', power: 'sensor.s_balkon' },
  ],
  battery: [
    { id: 'b_dach', name: 'Dach-Speicher', soc: 'sensor.b_dach_soc', power: 'sensor.b_dach_power', charged_by: 'dach' },
    { id: 'b_balkon', name: 'Balkon-Speicher', soc: 'sensor.b_balkon_soc', power: 'sensor.b_balkon_power', charged_by: 'balkon' },
  ],
  grid: { power: 'sensor.grid_power' },
  consumers: [
    { name: 'Wärmepumpe', power: 'sensor.heatpump' },
    { name: 'Wallbox', power: 'sensor.wallbox' },
    { name: 'Herd', power: 'sensor.stove' },
  ],
  display: { active_threshold_w: 5, number_format: 'grouped', show_inactive_paths: false },
});

const wAttrs = { unit_of_measurement: 'W' };
const pctAttrs = { unit_of_measurement: '%' };

export const scenarios: MockScenario[] = [
  {
    name: 'Sonniger Tag · Akkus laden · Überschuss → Netz',
    emoji: '☀️',
    config: baseConfig(),
    hassStates: {
      'sensor.s_dach': { state: '2600', attributes: wAttrs },
      'sensor.s_balkon': { state: '600', attributes: wAttrs },
      'sensor.b_dach_soc': { state: '75', attributes: pctAttrs },
      'sensor.b_dach_power': { state: '600', attributes: wAttrs },
      'sensor.b_balkon_soc': { state: '42', attributes: pctAttrs },
      'sensor.b_balkon_power': { state: '200', attributes: wAttrs },
      'sensor.grid_power': { state: '-1200', attributes: wAttrs },
      'sensor.heatpump': { state: '400', attributes: wAttrs },
      'sensor.wallbox': { state: '0', attributes: wAttrs },
      'sensor.stove': { state: '100', attributes: wAttrs },
    },
  },
  {
    name: 'Abend · Akkus speisen Haus & Netz',
    emoji: '🌙',
    config: baseConfig(),
    hassStates: {
      'sensor.s_dach': { state: '0', attributes: wAttrs },
      'sensor.s_balkon': { state: '0', attributes: wAttrs },
      'sensor.b_dach_soc': { state: '68', attributes: pctAttrs },
      'sensor.b_dach_power': { state: '-1100', attributes: wAttrs },
      'sensor.b_balkon_soc': { state: '38', attributes: pctAttrs },
      'sensor.b_balkon_power': { state: '-400', attributes: wAttrs },
      'sensor.grid_power': { state: '-300', attributes: wAttrs },
      'sensor.heatpump': { state: '400', attributes: wAttrs },
      'sensor.wallbox': { state: '700', attributes: wAttrs },
      'sensor.stove': { state: '100', attributes: wAttrs },
    },
  },
  {
    name: 'Nacht · Reiner Netzbezug',
    emoji: '🌃',
    config: baseConfig(),
    hassStates: {
      'sensor.s_dach': { state: '0', attributes: wAttrs },
      'sensor.s_balkon': { state: '0', attributes: wAttrs },
      'sensor.b_dach_soc': { state: '12', attributes: pctAttrs },
      'sensor.b_dach_power': { state: '0', attributes: wAttrs },
      'sensor.b_balkon_soc': { state: '8', attributes: pctAttrs },
      'sensor.b_balkon_power': { state: '0', attributes: wAttrs },
      'sensor.grid_power': { state: '500', attributes: wAttrs },
      'sensor.heatpump': { state: '400', attributes: wAttrs },
      'sensor.wallbox': { state: '0', attributes: wAttrs },
      'sensor.stove': { state: '100', attributes: wAttrs },
    },
  },
  {
    name: 'Pairing-Defizit',
    emoji: '⚡',
    config: baseConfig(),
    hassStates: {
      'sensor.s_dach': { state: '200', attributes: wAttrs },
      'sensor.s_balkon': { state: '0', attributes: wAttrs },
      'sensor.b_dach_soc': { state: '50', attributes: pctAttrs },
      'sensor.b_dach_power': { state: '500', attributes: wAttrs },
      'sensor.b_balkon_soc': { state: '40', attributes: pctAttrs },
      'sensor.b_balkon_power': { state: '0', attributes: wAttrs },
      'sensor.grid_power': { state: '300', attributes: wAttrs },
      'sensor.heatpump': { state: '0', attributes: wAttrs },
      'sensor.wallbox': { state: '0', attributes: wAttrs },
      'sensor.stove': { state: '0', attributes: wAttrs },
    },
  },
  {
    name: 'Großverbraucher aktiv (Wallbox)',
    emoji: '🔌',
    config: baseConfig(),
    hassStates: {
      'sensor.s_dach': { state: '1500', attributes: wAttrs },
      'sensor.s_balkon': { state: '300', attributes: wAttrs },
      'sensor.b_dach_soc': { state: '60', attributes: pctAttrs },
      'sensor.b_dach_power': { state: '0', attributes: wAttrs },
      'sensor.b_balkon_soc': { state: '40', attributes: pctAttrs },
      'sensor.b_balkon_power': { state: '0', attributes: wAttrs },
      'sensor.grid_power': { state: '5500', attributes: wAttrs },
      'sensor.heatpump': { state: '400', attributes: wAttrs },
      'sensor.wallbox': { state: '6800', attributes: wAttrs },
      'sensor.stove': { state: '100', attributes: wAttrs },
    },
  },
  {
    name: 'Alle Werte 0',
    emoji: '🛑',
    config: baseConfig(),
    hassStates: {
      'sensor.s_dach': { state: '0', attributes: wAttrs },
      'sensor.s_balkon': { state: '0', attributes: wAttrs },
      'sensor.b_dach_soc': { state: '20', attributes: pctAttrs },
      'sensor.b_dach_power': { state: '0', attributes: wAttrs },
      'sensor.b_balkon_soc': { state: '15', attributes: pctAttrs },
      'sensor.b_balkon_power': { state: '0', attributes: wAttrs },
      'sensor.grid_power': { state: '0', attributes: wAttrs },
      'sensor.heatpump': { state: '0', attributes: wAttrs },
      'sensor.wallbox': { state: '0', attributes: wAttrs },
      'sensor.stove': { state: '0', attributes: wAttrs },
    },
  },
  {
    name: 'Inkonsistente Sensor-Werte (phantom_export)',
    emoji: '⚠️',
    config: baseConfig(),
    hassStates: {
      'sensor.s_dach': { state: '1000', attributes: wAttrs },
      'sensor.s_balkon': { state: '0', attributes: wAttrs },
      'sensor.b_dach_soc': { state: '50', attributes: pctAttrs },
      'sensor.b_dach_power': { state: '0', attributes: wAttrs },
      'sensor.b_balkon_soc': { state: '40', attributes: pctAttrs },
      'sensor.b_balkon_power': { state: '0', attributes: wAttrs },
      'sensor.grid_power': { state: '0', attributes: wAttrs },
      'sensor.heatpump': { state: '300', attributes: wAttrs },
      'sensor.wallbox': { state: '0', attributes: wAttrs },
      'sensor.stove': { state: '0', attributes: wAttrs },
    },
  },
  {
    name: 'Sensor unavailable',
    emoji: '🚫',
    config: baseConfig(),
    hassStates: {
      'sensor.s_dach': { state: 'unavailable' },
      'sensor.s_balkon': { state: '300', attributes: wAttrs },
      'sensor.b_dach_soc': { state: '50', attributes: pctAttrs },
      'sensor.b_dach_power': { state: '0', attributes: wAttrs },
      'sensor.b_balkon_soc': { state: '40', attributes: pctAttrs },
      'sensor.b_balkon_power': { state: '0', attributes: wAttrs },
      'sensor.grid_power': { state: '200', attributes: wAttrs },
      'sensor.heatpump': { state: '500', attributes: wAttrs },
      'sensor.wallbox': { state: '0', attributes: wAttrs },
      'sensor.stove': { state: '0', attributes: wAttrs },
    },
  },
  // Animation-Identity-Test (M4): zwei aufeinanderfolgende Szenarien mit
  // identischer Topologie aber leicht unterschiedlichen Werten — beim Wechsel
  // dürfen die Punkte NICHT zurückspringen oder restart-en. Wenn doch:
  // Lit-Diff ersetzt das gesamte <g>, statt nur das style-Attribut zu patchen.
  {
    name: 'Animation-Identity A · sonniger Tag (Wert-Variante 1)',
    emoji: '🔁',
    config: baseConfig(),
    hassStates: {
      'sensor.s_dach': { state: '2400', attributes: wAttrs },
      'sensor.s_balkon': { state: '500', attributes: wAttrs },
      'sensor.b_dach_soc': { state: '70', attributes: pctAttrs },
      'sensor.b_dach_power': { state: '500', attributes: wAttrs },
      'sensor.b_balkon_soc': { state: '40', attributes: pctAttrs },
      'sensor.b_balkon_power': { state: '150', attributes: wAttrs },
      'sensor.grid_power': { state: '-1000', attributes: wAttrs },
      'sensor.heatpump': { state: '400', attributes: wAttrs },
      'sensor.wallbox': { state: '0', attributes: wAttrs },
      'sensor.stove': { state: '100', attributes: wAttrs },
    },
  },
  {
    name: 'Animation-Identity B · sonniger Tag (Wert-Variante 2)',
    emoji: '🔁',
    config: baseConfig(),
    hassStates: {
      'sensor.s_dach': { state: '2700', attributes: wAttrs },
      'sensor.s_balkon': { state: '650', attributes: wAttrs },
      'sensor.b_dach_soc': { state: '71', attributes: pctAttrs },
      'sensor.b_dach_power': { state: '700', attributes: wAttrs },
      'sensor.b_balkon_soc': { state: '41', attributes: pctAttrs },
      'sensor.b_balkon_power': { state: '250', attributes: wAttrs },
      'sensor.grid_power': { state: '-1100', attributes: wAttrs },
      'sensor.heatpump': { state: '450', attributes: wAttrs },
      'sensor.wallbox': { state: '0', attributes: wAttrs },
      'sensor.stove': { state: '100', attributes: wAttrs },
    },
  },
  // Sensor-Jitter (M5): simuliert reale HA-Bedingungen mit Noise auf allen
  // Sensoren. Engine-Warnings sollten nicht durchgehend feuern. Wird in der
  // Sandbox per setInterval aktualisiert.
  {
    name: 'Sensor-Jitter · echte HA-Realität',
    emoji: '📡',
    config: { ...baseConfig(), display: { ...baseConfig().display, debug: true } },
    hassStates: {
      'sensor.s_dach': { state: '2050', attributes: wAttrs },
      'sensor.s_balkon': { state: '510', attributes: wAttrs },
      'sensor.b_dach_soc': { state: '67', attributes: pctAttrs },
      'sensor.b_dach_power': { state: '550', attributes: wAttrs },
      'sensor.b_balkon_soc': { state: '39', attributes: pctAttrs },
      'sensor.b_balkon_power': { state: '180', attributes: wAttrs },
      'sensor.grid_power': { state: '-820', attributes: wAttrs },  // leicht inkonsistent zur Bilanz
      'sensor.heatpump': { state: '410', attributes: wAttrs },
      'sensor.wallbox': { state: '0', attributes: wAttrs },
      'sensor.stove': { state: '95', attributes: wAttrs },
    },
  },
];

export function buildMockHass(scenario: MockScenario): { states: Record<string, MockHassEntity> } {
  return { states: scenario.hassStates };
}
```

- [ ] **Step 2: Implement `examples/preview.html`**

```html
<!DOCTYPE html>
<html lang="de">
<head>
  <meta charset="UTF-8" />
  <title>Custom Energy Flow Card — Preview Sandbox</title>
  <style>
    body { font-family: system-ui, sans-serif; margin: 0; background: #f8fafc; color: #0f172a; }
    header { padding: 16px 24px; background: #fff; border-bottom: 1px solid #e2e8f0; }
    main { padding: 24px; max-width: 900px; margin: 0 auto; }
    .toggle-row { display: flex; gap: 8px; flex-wrap: wrap; margin-bottom: 16px; }
    .toggle-row button {
      background: #fff; border: 1px solid #cbd5e1; border-radius: 8px;
      padding: 6px 12px; font-size: 12px; cursor: pointer; color: #0f172a;
    }
    .toggle-row button.active { background: #0f172a; color: #fff; border-color: #0f172a; }
    .preview-host { background: #fff; border: 1px solid #e2e8f0; border-radius: 14px; padding: 16px; }
  </style>
</head>
<body>
  <header><h1>Custom Energy Flow Card — Sandbox</h1></header>
  <main>
    <div id="scenarios" class="toggle-row"></div>
    <div class="preview-host">
      <custom-energy-flow-card id="card"></custom-energy-flow-card>
    </div>
  </main>
  <!-- Paths are relative to dist/preview/preview.html (where the build copies this) -->
  <script type="module" src="../custom-energy-flow-card.js"></script>
  <script type="module" src="./preview.mjs"></script>
</body>
</html>
```

- [ ] **Step 3: Implement `scripts/build-preview.mjs`**

Das Skript schreibt die Preview-Entry-Datei nach `dist/preview/`, **nicht**
in den Source-Tree, damit nichts versehentlich committed wird.

```javascript
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
```

Note: the preview entry references `card.setConfig` and `card.hass`. These are introduced in Phase 3 (Task 3.4). Until then, opening the preview won't render — that's expected. Once Phase 3 is done, `pnpm build && pnpm preview` produces a working sandbox.

- [ ] **Step 4: Verify the build pipeline runs**

Run: `pnpm build`
Expected: PASS, `dist/custom-energy-flow-card.js` exists. Preview build will fail until Phase 3 — that's acceptable here.

Run: `pnpm typecheck`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add examples/ scripts/build-preview.mjs
git commit -m "feat(sandbox): add preview-mocks with 8 scenarios + sandbox HTML/build script"
```

---

## Phase 3 — HA-Integration

### Task 3.1: `ha/ha-types.ts`, `ha/ha-globals.d.ts`, `ha/ha-helpers.ts`

**Files:**
- Create: `src/ha/ha-types.ts`
- Create: `src/ha/ha-globals.d.ts`
- Create: `src/ha/ha-helpers.ts`

- [ ] **Step 1: Create `src/ha/ha-types.ts`**

```typescript
export interface HassEntity {
  state: string;
  attributes: Record<string, unknown>;
  entity_id?: string;
  last_changed?: string;
  last_updated?: string;
}

export interface HomeAssistant {
  states: Record<string, HassEntity | undefined>;
  locale?: { language: string };
  themes?: { darkMode: boolean };
  callService?: (...args: unknown[]) => Promise<unknown>;
  callApi?: (...args: unknown[]) => Promise<unknown>;
}

export interface HaFormSchema {
  name: string;
  required?: boolean;
  selector?: Record<string, unknown>;
}
```

- [ ] **Step 2: Create `src/ha/ha-globals.d.ts`**

```typescript
import type { HomeAssistant, HaFormSchema } from './ha-types';

declare global {
  interface HTMLElementTagNameMap {
    'ha-form': HTMLElement & {
      data: Record<string, unknown>;
      schema: HaFormSchema[];
      hass: HomeAssistant;
      computeLabel?: (s: HaFormSchema) => string;
    };
    'ha-entity-picker': HTMLElement & {
      hass: HomeAssistant;
      value: string;
      includeDomains?: string[];
    };
    'ha-icon': HTMLElement & { icon: string };
  }
  interface HTMLElementEventMap {
    'value-changed': CustomEvent<{ value: unknown }>;
    'config-changed': CustomEvent<{ config: unknown }>;
    'hass-more-info': CustomEvent<{ entityId: string }>;
  }
}

export {};
```

- [ ] **Step 3: Create `src/ha/ha-helpers.ts`**

```typescript
export function fireMoreInfo(target: HTMLElement, entityId: string): void {
  const event = new CustomEvent('hass-more-info', {
    bubbles: true,
    composed: true,
    detail: { entityId },
  });
  target.dispatchEvent(event);
}

export function fireConfigChanged(target: HTMLElement, config: unknown): void {
  const event = new CustomEvent('config-changed', {
    bubbles: true,
    composed: true,
    detail: { config },
  });
  target.dispatchEvent(event);
}
```

- [ ] **Step 4: Verify typecheck**

Run: `pnpm typecheck`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/ha/
git commit -m "feat(ha): add HA type subset, custom-element globals, event helpers"
```

### Task 3.2: `card.ts` — LitElement skeleton + setConfig + getCardSize

**Files:**
- Create: `src/card.ts`

- [ ] **Step 1: Implement `src/card.ts`**

`card.ts` ist bewusst dünn. Begleitende Helfer (`relevantSensorIds`,
`hassRelevantSensorsChanged`, `isStubConfig`) werden in **`src/card-helpers.ts`**
ausgelagert (Step 2), damit `card.ts` ≤ 200 LOC bleibt.

```typescript
import { LitElement, css, html, unsafeCSS, type PropertyValues, type TemplateResult } from 'lit';
import { customElement, property, state } from 'lit/decorators.js';
import { CARD_TYPE, DEFAULTS } from './const';
import { DE } from './i18n/de';
import { validateConfig, buildSystemState } from './config/schema';
import type { Config } from './config/types';
import { compute } from './engine/energy-engine';
import type { FlowResult } from './engine/types';
import type { EngineWarning } from './util/warning-types';
import { computeLayout, type LayoutResult } from './render/layout';
import { renderCard } from './render/flow-renderer';
import { ANIMATION_CSS } from './render/flow-animation';
import { fireMoreInfo } from './ha/ha-helpers';
import type { HomeAssistant } from './ha/ha-types';
import { memoize } from './util/memo';
import { hassRelevantSensorsChanged, isStubConfig, resolveEntityId } from './card-helpers';

const memoLayout = memoize(
  (config: Config) => computeLayout(config),
  (config: Config) => JSON.stringify({
    s: config.solar.map((s) => s.id),
    b: config.battery.map((b) => ({ i: b.id, p: b.charged_by })),
    c: config.consumers.length,
  }),
);

@customElement(CARD_TYPE)
export class CustomEnergyFlowCard extends LitElement {
  // We use shouldUpdate (not @property hasChanged) because Lit's hasChanged
  // does not receive `this`, so it cannot read `this._config` to decide which
  // sensors are relevant. shouldUpdate runs on the element instance.
  @property({ attribute: false }) hass?: HomeAssistant;

  @state() private _config?: Config;
  @state() private _flowResult?: FlowResult;
  @state() private _layout?: LayoutResult;
  @state() private _renderError?: string;
  @state() private _buildWarnings: EngineWarning[] = [];
  @state() private _unavailable: Set<string> = new Set();
  @state() private _containerW = 720;
  private _resizeObs?: ResizeObserver;

  static override styles = css`
    :host { display: block; opacity: 0; transition: opacity 0.2s ease-in; }
    :host([data-mounted]) { opacity: 1; }
    ha-card { padding: var(--ha-card-padding, 16px); }
    .error-banner { color: var(--error-color, #b00020); padding: 12px; border: 1px solid currentColor; border-radius: 8px; }
    .loading { display: flex; align-items: center; justify-content: center; min-height: 200px; color: var(--secondary-text-color); }
    .skeleton { display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 16px; padding: 32px; }
    .skeleton-node { aspect-ratio: 1; border-radius: 50%; background: var(--divider-color, #e2e8f0); animation: skeleton-pulse 1.6s ease-in-out infinite; }
    @keyframes skeleton-pulse { 0%,100% { opacity: 0.6; } 50% { opacity: 0.3; } }
    .stub-hint { padding: 16px; color: var(--secondary-text-color); text-align: center; }
    .narrow-banner { font-size: 11px; color: var(--secondary-text-color); padding: 4px 8px; border-bottom: 1px solid var(--divider-color); }
    .node:hover circle, .node:focus-visible circle { stroke-width: 3.5; }
    .node:focus-visible { outline: 2px solid var(--primary-color, #03a9f4); outline-offset: 4px; }
    ${unsafeCSS(ANIMATION_CSS)}
  `;

  setConfig(config: unknown): void {
    // validateConfig itself accepts the HA stub-config (empty grid.power +
    // all lists empty) — see config/schema.ts.
    const validated = validateConfig(config);
    this._config = validated;
    if (!isStubConfig(validated)) {
      this._layout = memoLayout(validated);
    }
    if (validated.display?.debug) {
      console.info('[CEFC] setConfig accepted', { stub: isStubConfig(validated), config: validated });
    }
  }

  static getConfigElement(): HTMLElement {
    return document.createElement(`${CARD_TYPE}-editor`);
  }

  static getStubConfig(_hass: unknown, _entities: unknown): Partial<Config> {
    return { type: 'custom:custom-energy-flow-card', grid: { power: '' }, solar: [], battery: [], consumers: [] };
  }

  getCardSize(): number { return 6; }

  override firstUpdated(): void {
    this.setAttribute('data-mounted', '');
    this._resizeObs = new ResizeObserver((entries) => {
      const entry = entries[0];
      if (!entry) return;
      const { width } = entry.contentRect;
      if (Math.abs(width - this._containerW) > 4) {
        this._containerW = width;
      }
    });
    this._resizeObs.observe(this);
    if (this._config?.display?.debug) {
      console.info('[CEFC] firstUpdated, ResizeObserver attached', { container: this._containerW });
    }
  }

  override disconnectedCallback(): void {
    super.disconnectedCallback();
    this._resizeObs?.disconnect();
  }

  protected override shouldUpdate(changed: PropertyValues): boolean {
    // If only `hass` changed and no relevant sensor moved, skip the update.
    if (changed.size === 1 && changed.has('hass') && this._config) {
      const prev = changed.get('hass') as HomeAssistant | undefined;
      if (!hassRelevantSensorsChanged(prev, this.hass, this._config)) return false;
    }
    return true;
  }

  protected override willUpdate(changed: PropertyValues): void {
    if (!this._config || !this.hass) return;
    if (isStubConfig(this._config)) return;
    if (!changed.has('hass') && !changed.has('_config')) return;
    try {
      const built = buildSystemState(this._config, this.hass);
      this._buildWarnings = built.warnings;
      this._unavailable = built.unavailableEntities;
      const engineResult = compute(built.state);
      this._flowResult = {
        ...engineResult,
        warnings: [...built.warnings, ...engineResult.warnings],
      };
      this._renderError = undefined;
      if (this._config.display?.debug) {
        console.info('[CEFC] willUpdate', {
          homeW: engineResult.homeW,
          warnings: this._flowResult.warnings.length,
          unavailable: built.unavailableEntities.size,
        });
      }
    } catch (err) {
      this._renderError = err instanceof Error ? err.message : String(err);
      console.error('[custom-energy-flow-card] willUpdate error:', err);
    }
  }

  override render(): TemplateResult {
    if (this._renderError) {
      return html`<ha-card><div class="error-banner" role="alert">${DE.states.cardError}: ${this._renderError}</div></ha-card>`;
    }
    if (!this.hass || !this._config) {
      return html`<ha-card>${this._renderSkeleton()}</ha-card>`;
    }
    if (isStubConfig(this._config)) {
      return html`<ha-card><div class="stub-hint">${DE.states.stubHint}</div></ha-card>`;
    }
    if (!this._flowResult || !this._layout) {
      return html`<ha-card>${this._renderSkeleton()}</ha-card>`;
    }
    const display = this._config.display ?? {};
    const narrow = this._containerW < 280;
    return html`
      <ha-card>
        ${narrow ? html`<div class="narrow-banner" role="status">${DE.states.narrowBanner}</div>` : ''}
        ${renderCard(this._layout, this._flowResult, {
          config: this._config,
          formatGrouped: (display.number_format ?? DEFAULTS.number_format) === 'grouped',
          activeThresholdW: display.active_threshold_w ?? DEFAULTS.active_threshold_w,
          showInactive: display.show_inactive_paths ?? DEFAULTS.show_inactive_paths,
          theme: { colorOverrides: display.colors },
          animation: display.animation,
          buildWarnings: this._buildWarnings,
          unavailableEntities: this._unavailable,
          onNodeClick: (id) => {
            const entity = resolveEntityId(this._config, id);
            if (entity) fireMoreInfo(this, entity);
          },
        })}
      </ha-card>
    `;
  }

  private _renderSkeleton(): TemplateResult {
    return html`<div class="loading" aria-busy="true">${DE.states.loading}</div>
      <div class="skeleton" aria-hidden="true">
        <div class="skeleton-node"></div><div class="skeleton-node"></div><div class="skeleton-node"></div>
        <div class="skeleton-node"></div><div class="skeleton-node"></div><div class="skeleton-node"></div>
      </div>`;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'custom-energy-flow-card': CustomEnergyFlowCard;
  }
}
```

- [ ] **Step 2: Create `src/card-helpers.ts`**

```typescript
import type { Config } from './config/types';
import type { HomeAssistant } from './ha/ha-types';

export function isStubConfig(config: unknown): config is Config {
  if (!config || typeof config !== 'object') return false;
  const c = config as Partial<Config>;
  if (c.type !== 'custom:custom-energy-flow-card') return false;
  const gridEmpty = !c.grid || ('power' in c.grid && c.grid.power === '');
  const empty = (c.solar?.length ?? 0) === 0
    && (c.battery?.length ?? 0) === 0
    && (c.consumers?.length ?? 0) === 0;
  return gridEmpty && empty;
}

export function relevantSensorIds(config: Config): string[] {
  const ids: string[] = [];
  for (const s of config.solar) ids.push(s.power);
  for (const b of config.battery) { ids.push(b.soc, b.power); }
  if ('power' in config.grid) ids.push(config.grid.power);
  else ids.push(config.grid.import, config.grid.export);
  for (const c of config.consumers) ids.push(c.power);
  if (config.home?.power) ids.push(config.home.power);
  return ids;
}

export function hassRelevantSensorsChanged(
  prev: HomeAssistant | undefined,
  next: HomeAssistant | undefined,
  config: Config | undefined,
): boolean {
  if (!prev || !next || !config) return true;
  for (const id of relevantSensorIds(config)) {
    const a = prev.states[id]?.state;
    const b = next.states[id]?.state;
    if (a !== b) return true;
  }
  return false;
}

export function resolveEntityId(config: Config | undefined, nodeId: string): string | undefined {
  if (!config) return undefined;
  const solar = config.solar.find((s) => s.id === nodeId);
  if (solar) return solar.power;
  const battery = config.battery.find((b) => b.id === nodeId);
  if (battery) return battery.power;
  if (nodeId === '__grid') return 'power' in config.grid ? config.grid.power : config.grid.import;
  if (nodeId === '__home') return config.home?.power;
  if (nodeId.startsWith('c')) {
    const idx = Number.parseInt(nodeId.slice(1), 10);
    return config.consumers[idx]?.power;
  }
  return undefined;
}
```

> **Note:** `card-helpers.ts` ist explizit als Erweiterung von `card.ts`
> gedacht. ESLint-Zone für root-level Files (`src/*.ts`) ist permissiv —
> `card-helpers` darf wie `card.ts` aus jeder Schicht importieren.

- [ ] **Step 2: Verify typecheck**

Run: `pnpm typecheck`
Expected: PASS.

- [ ] **Step 3: Commit**

```bash
git add src/card.ts
git commit -m "feat(card): add LitElement with lifecycle, crash-resilience, more-info"
```

### Task 3.3: `index.ts` — registration + console banner + customCards

**Files:**
- Modify: `src/index.ts`

- [ ] **Step 1: Replace `src/index.ts`**

Replace content of `src/index.ts` (which currently contains the placeholder from Task 0.1) with:

```typescript
import { CARD_DOC_URL, CARD_NAME, CARD_TYPE, CARD_VERSION } from './const';
import { CustomEnergyFlowCard } from './card';
import './editor';   // side-effect import: registriert custom-energy-flow-card-editor
import { DE } from './i18n/de';

// Side-effect import — Lit's @customElement decorator registriert beim
// Klassen-Eval. Wir referenzieren den Wert hier explizit, sonst eliminiert
// Tree-Shaking ihn.
void CustomEnergyFlowCard;

console.info(
  `%c CUSTOM-ENERGY-FLOW-CARD %c ${CARD_VERSION} `,
  'color: white; background: #f59e0b; padding: 2px 6px; border-radius: 3px;',
  'color: #f59e0b; background: transparent; padding: 2px 6px;',
);

// Defensive bootstrap-Logs, helfen beim Bug-Triage:
console.info(
  `[CEFC] elements registered: ${CARD_TYPE}, ${CARD_TYPE}-editor`,
);

interface CardEntry {
  type: string;
  name: string;
  description: string;
  preview: boolean;
  documentationURL: string;
}

const win = window as unknown as { customCards?: CardEntry[] };
win.customCards = win.customCards ?? [];
win.customCards.push({
  type: CARD_TYPE,
  name: CARD_NAME,
  description: DE.card.description,
  preview: true,
  documentationURL: CARD_DOC_URL,
});

console.info(`[CEFC] customCards entry pushed (${win.customCards.length} cards total)`);
```

- [ ] **Step 2: Build and verify the bundle**

Run: `pnpm build`
Expected: PASS, `dist/custom-energy-flow-card.js` is produced.

Run: `du -b dist/custom-energy-flow-card.js`
Expected: ≤ 61440 bytes (60 kB per Spec §1.3).

- [ ] **Step 3: Build sandbox**

Run: `pnpm preview`
Expected: writes `dist/preview/preview.html`. Open in browser to manually verify all scenarios render. Verify:
- Scenario 1 (sunny): solar + battery flows visible, grid export
- Scenario 6 (all zero): no animated flows, all nodes at 0 W
- Scenario 8 (sensor unavailable): card renders, doesn't crash
- Tab key cycles through nodes; pressing Enter on a node fires more-info (visible only in console without HA)

- [ ] **Step 4: Run full check gate**

Run: `pnpm check`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/index.ts
git commit -m "feat(card): register card, customCards metadata, console banner"
```

### Task 3.4: Phase-3 verification

**Files:** none (verification only)

- [ ] **Step 1: Manual sandbox walk-through**

Run: `pnpm preview`
Open: `dist/preview/preview.html`

For each of the 8 scenarios:
- Click the scenario button
- Verify card renders without errors
- Verify expected flow lines are visible (or hidden when 0)

- [ ] **Step 2: Bundle size**

Run: `stat -c%s dist/custom-energy-flow-card.js`
Expected: ≤ 61440 bytes (60 kB). Record actual size.

- [ ] **Step 3: Coverage**

Run: `pnpm test:coverage`
Expected: engine/, config/, util/ all ≥ 90 %.

- [ ] **Step 4: Tag the phase (no commit needed if no changes)**

If everything passes:

```bash
git tag -a phase-3-complete -m "Phase 3 (HA integration) verified"
```

---

## Phase 4 — Editor

### Task 4.1: `editor.ts` — skeleton + general/grid sections

**Files:**
- Create: `src/editor.ts`

> **Live-Sensor-Validierung (Spec §6.4.4 + §3.2):** `<ha-entity-picker>`
> zeigt eingebaut eine Warning-Markierung, wenn die gewählte Entity in
> `hass.states` nicht (mehr) existiert — dafür müssen wir keinen eigenen
> Validator schreiben. Wir setzen nur `hass` als Property auf jedem Picker;
> HA übernimmt den Rest. Die strukturelle Validierung (Pairing, ID-Eindeutigkeit,
> ENTITY_RE) kommt aus `validateConfig` (Task 4.3).

> **LOC-Budget (Spec §2.2):** `editor.ts` ≤ 400 LOC. Die kombinierte
> Implementierung aus Tasks 4.1 + 4.2 + 4.3 landet erfahrungsgemäß bei ~390 LOC.
> Falls beim Implementieren über 400 gewachsen wird, **drei Listen-Render-Funktionen
> in `src/editor-list-sections.ts` extrahieren** (gleiche permissive Zone wie
> `editor.ts`). Listen-Operations bleiben in `editor.ts`.

- [ ] **Step 1: Implement `src/editor.ts`** (skeleton + first sections)

```typescript
import { LitElement, css, html, type TemplateResult } from 'lit';
import { customElement, property, state } from 'lit/decorators.js';
import { CARD_TYPE } from './const';
import { DE } from './i18n/de';
import type { Config, BatteryConfig, ConsumerConfig, GridConfig, SolarConfig } from './config/types';
import type { HomeAssistant } from './ha/ha-types';
import { fireConfigChanged } from './ha/ha-helpers';

@customElement(`${CARD_TYPE}-editor`)
export class CustomEnergyFlowCardEditor extends LitElement {
  @property({ attribute: false })
  hass?: HomeAssistant;

  @state()
  private _config?: Config;

  @state()
  private _validationError?: string;

  static override styles = css`
    :host {
      display: block;
    }
    .validation-banner {
      margin-bottom: 12px;
      padding: 8px 12px;
      background: color-mix(in srgb, var(--error-color, #b00020) 12%, transparent);
      color: var(--error-color, #b00020);
      border: 1px solid var(--error-color, #b00020);
      border-radius: 6px;
      font-size: 12px;
    }
    .section {
      margin-bottom: 16px;
      padding: 12px;
      border: 1px solid var(--divider-color, #e2e8f0);
      border-radius: 8px;
    }
    .section h3 {
      margin: 0 0 8px;
      font-size: 14px;
    }
    .list-item {
      display: flex;
      gap: 8px;
      align-items: flex-start;
      padding: 8px 0;
      border-top: 1px solid var(--divider-color, #e2e8f0);
    }
    .list-item ha-form {
      flex: 1;
    }
    .list-item button {
      background: transparent;
      border: 1px solid var(--divider-color, #e2e8f0);
      border-radius: 6px;
      padding: 4px 8px;
      cursor: pointer;
    }
    .add-btn {
      margin-top: 8px;
      cursor: pointer;
      background: transparent;
      border: 1px dashed var(--divider-color, #cbd5e1);
      padding: 6px 12px;
      border-radius: 8px;
    }
    .error {
      color: var(--error-color, #b00020);
      font-size: 12px;
      display: block;
      margin-top: 4px;
    }
    label.pairing {
      display: block;
      font-size: 12px;
      color: var(--primary-text-color);
      margin-top: 8px;
    }
  `;

  setConfig(config: Config): void {
    this._config = config;
  }

  override render(): TemplateResult {
    if (!this._config) return html``;
    return html`
      ${this._validationError ? html`
        <div class="validation-banner" role="alert">${this._validationError}</div>
      ` : ''}
      ${this._renderGeneral()}
      ${this._renderSolarSection()}
      ${this._renderBatterySection()}
      ${this._renderGridSection()}
      ${this._renderConsumersSection()}
    `;
  }

  private _renderGeneral(): TemplateResult {
    const c = this._config;
    if (!c) return html``;
    const data = {
      title: c.title ?? '',
      number_format: c.display?.number_format ?? 'grouped',
      show_inactive_paths: c.display?.show_inactive_paths ?? false,
    };
    const schema = [
      { name: 'title', selector: { text: {} } },
      {
        name: 'number_format',
        selector: { select: { options: ['standard', 'grouped'] } },
      },
      { name: 'show_inactive_paths', selector: { boolean: {} } },
    ];
    return html`
      <div class="section">
        <h3>${DE.editor.sectionGeneral}</h3>
        <ha-form
          .data=${data}
          .schema=${schema}
          .hass=${this.hass}
          @value-changed=${(e: CustomEvent) => this._onGeneralChange(e.detail.value)}
        ></ha-form>
      </div>
    `;
  }

  private _onGeneralChange(value: Record<string, unknown>): void {
    if (!this._config) return;
    const newConfig: Config = {
      ...this._config,
      title: (value.title as string) || undefined,
      display: {
        ...this._config.display,
        number_format: value.number_format as 'standard' | 'grouped',
        show_inactive_paths: Boolean(value.show_inactive_paths),
      },
    };
    this._emitChange(newConfig);
  }

  private _renderGridSection(): TemplateResult {
    const c = this._config;
    if (!c) return html``;
    const isSplit = !('power' in c.grid);
    const data = isSplit
      ? { mode: 'split', import: (c.grid as { import: string }).import, export: (c.grid as { export: string }).export }
      : { mode: 'signed', power: (c.grid as { power: string }).power, power_invert: (c.grid as { power_invert?: boolean }).power_invert ?? false };
    const schema = isSplit
      ? [
          { name: 'mode', selector: { select: { options: ['signed', 'split'] } } },
          { name: 'import', selector: { entity: { domain: 'sensor' } } },
          { name: 'export', selector: { entity: { domain: 'sensor' } } },
        ]
      : [
          { name: 'mode', selector: { select: { options: ['signed', 'split'] } } },
          { name: 'power', selector: { entity: { domain: 'sensor' } } },
          { name: 'power_invert', selector: { boolean: {} } },
        ];
    return html`
      <div class="section">
        <h3>${DE.editor.sectionGrid}</h3>
        <ha-form
          .data=${data}
          .schema=${schema}
          .hass=${this.hass}
          @value-changed=${(e: CustomEvent) => this._onGridChange(e.detail.value)}
        ></ha-form>
      </div>
    `;
  }

  private _onGridChange(value: Record<string, unknown>): void {
    if (!this._config) return;
    const mode = value.mode as 'signed' | 'split';
    // Mode-Wechsel resettet die nicht zur neuen Form passenden Felder. Beim
    // ersten Wechsel auf "split" haben wir kein import/export → '' Defaults
    // verursachen einen Validation-Error, der via _validationError als Banner
    // sichtbar wird, bis der User die Felder befüllt.
    const newGrid: GridConfig = mode === 'split'
      ? { import: (value.import as string) ?? '', export: (value.export as string) ?? '' }
      : { power: (value.power as string) ?? '', power_invert: Boolean(value.power_invert) };
    this._emitChange({ ...this._config, grid: newGrid });
  }

  private _nextUniqueId(prefix: string, existing: string[]): string {
    const taken = new Set(existing);
    let n = existing.length + 1;
    while (taken.has(`${prefix}${n}`)) n++;
    return `${prefix}${n}`;
  }

  private _renderSolarSection(): TemplateResult {
    return html``;
  }
  private _renderBatterySection(): TemplateResult {
    return html``;
  }
  private _renderConsumersSection(): TemplateResult {
    return html``;
  }

  private _emitChange(config: Config): void {
    this._config = config;
    fireConfigChanged(this, config);
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'custom-energy-flow-card-editor': CustomEnergyFlowCardEditor;
  }
}
```

- [ ] **Step 2: Verify typecheck**

Run: `pnpm typecheck`
Expected: PASS.

- [ ] **Step 3: Commit**

```bash
git add src/editor.ts
git commit -m "feat(editor): scaffold editor with general + grid sections"
```

### Task 4.2: Editor — Solar / Battery / Consumers list sections

**Files:**
- Modify: `src/editor.ts`

- [ ] **Step 1: Replace the three placeholder methods (`_renderSolarSection`, `_renderBatterySection`, `_renderConsumersSection`)** with full implementations.

In `src/editor.ts`, find:

```typescript
  private _renderSolarSection(): TemplateResult {
    return html``;
  }
  private _renderBatterySection(): TemplateResult {
    return html``;
  }
  private _renderConsumersSection(): TemplateResult {
    return html``;
  }
```

Replace with:

```typescript
  private _renderSolarSection(): TemplateResult {
    const c = this._config;
    if (!c) return html``;
    const itemSchema = [
      { name: 'id', selector: { text: {} }, required: true },
      { name: 'name', selector: { text: {} } },
      { name: 'power', selector: { entity: { domain: 'sensor' } }, required: true },
      { name: 'icon', selector: { icon: {} } },
    ];
    return html`
      <div class="section">
        <h3>${DE.editor.sectionSolar}</h3>
        ${c.solar.map((item, i) => html`
          <div class="list-item">
            <ha-form
              .data=${item}
              .schema=${itemSchema}
              .hass=${this.hass}
              @value-changed=${(e: CustomEvent) => this._onSolarItemChange(i, e.detail.value as SolarConfig)}
            ></ha-form>
            <button @click=${() => this._moveSolar(i, -1)} ?disabled=${i === 0}>${DE.editor.moveUp}</button>
            <button @click=${() => this._moveSolar(i, 1)} ?disabled=${i === c.solar.length - 1}>${DE.editor.moveDown}</button>
            <button @click=${() => this._removeSolar(i)}>${DE.editor.remove}</button>
          </div>
        `)}
        <button class="add-btn" @click=${() => this._addSolar()}>${DE.editor.addSolar}</button>
      </div>
    `;
  }

  private _onSolarItemChange(i: number, value: SolarConfig): void {
    if (!this._config) return;
    const solar = [...this._config.solar];
    solar[i] = value;
    this._emitChange({ ...this._config, solar });
  }

  private _addSolar(): void {
    if (!this._config) return;
    const id = this._nextUniqueId('pv', this._config.solar.map((s) => s.id));
    const solar = [...this._config.solar, { id, power: '' }];
    this._emitChange({ ...this._config, solar });
  }

  private _removeSolar(i: number): void {
    if (!this._config) return;
    const solar = this._config.solar.filter((_, idx) => idx !== i);
    this._emitChange({ ...this._config, solar });
  }

  private _moveSolar(i: number, delta: number): void {
    if (!this._config) return;
    const solar = [...this._config.solar];
    const j = i + delta;
    if (j < 0 || j >= solar.length) return;
    const tmp = solar[i];
    const other = solar[j];
    if (!tmp || !other) return;
    solar[i] = other;
    solar[j] = tmp;
    this._emitChange({ ...this._config, solar });
  }

  private _renderBatterySection(): TemplateResult {
    const c = this._config;
    if (!c) return html``;
    const itemSchema = [
      { name: 'id', selector: { text: {} }, required: true },
      { name: 'name', selector: { text: {} } },
      { name: 'soc', selector: { entity: { domain: 'sensor' } }, required: true },
      { name: 'power', selector: { entity: { domain: 'sensor' } }, required: true },
      { name: 'power_invert', selector: { boolean: {} } },
      { name: 'icon', selector: { icon: {} } },
    ];
    return html`
      <div class="section">
        <h3>${DE.editor.sectionBattery}</h3>
        ${c.battery.map((item, i) => {
          const pairingMissing = !c.solar.some((s) => s.id === item.charged_by);
          return html`
            <div class="list-item">
              <div style="flex:1">
                <ha-form
                  .data=${item}
                  .schema=${itemSchema}
                  .hass=${this.hass}
                  @value-changed=${(e: CustomEvent) => this._onBatteryItemChange(i, { ...item, ...(e.detail.value as Partial<BatteryConfig>) })}
                ></ha-form>
                <label class="pairing">
                  ${DE.editor.chargedBy}
                  <select
                    .value=${item.charged_by}
                    @change=${(e: Event) => this._onBatteryPairChange(i, (e.target as HTMLSelectElement).value)}
                  >
                    <option value="" disabled ?selected=${item.charged_by === ''}>${DE.editor.chargedByPlaceholder}</option>
                    ${c.solar.map((s) => html`<option value=${s.id} ?selected=${item.charged_by === s.id}>${s.name ?? s.id}</option>`)}
                  </select>
                  ${pairingMissing && item.charged_by ? html`<span class="error">${DE.editor.pairingMissing(item.charged_by)}</span>` : ''}
                </label>
              </div>
              <button @click=${() => this._moveBattery(i, -1)} ?disabled=${i === 0}>${DE.editor.moveUp}</button>
              <button @click=${() => this._moveBattery(i, 1)} ?disabled=${i === c.battery.length - 1}>${DE.editor.moveDown}</button>
              <button @click=${() => this._removeBattery(i)}>${DE.editor.remove}</button>
            </div>
          `;
        })}
        <button class="add-btn" @click=${() => this._addBattery()}>${DE.editor.addBattery}</button>
      </div>
    `;
  }

  private _onBatteryItemChange(i: number, value: BatteryConfig): void {
    if (!this._config) return;
    const battery = [...this._config.battery];
    battery[i] = value;
    this._emitChange({ ...this._config, battery });
  }

  private _onBatteryPairChange(i: number, charged_by: string): void {
    if (!this._config) return;
    const battery = [...this._config.battery];
    const item = battery[i];
    if (!item) return;
    battery[i] = { ...item, charged_by };
    this._emitChange({ ...this._config, battery });
  }

  private _addBattery(): void {
    if (!this._config) return;
    const id = this._nextUniqueId('b', this._config.battery.map((b) => b.id));
    const battery = [...this._config.battery, {
      id, soc: '', power: '', charged_by: '',
    }];
    this._emitChange({ ...this._config, battery });
  }

  private _removeBattery(i: number): void {
    if (!this._config) return;
    const battery = this._config.battery.filter((_, idx) => idx !== i);
    this._emitChange({ ...this._config, battery });
  }

  private _moveBattery(i: number, delta: number): void {
    if (!this._config) return;
    const battery = [...this._config.battery];
    const j = i + delta;
    if (j < 0 || j >= battery.length) return;
    const tmp = battery[i];
    const other = battery[j];
    if (!tmp || !other) return;
    battery[i] = other;
    battery[j] = tmp;
    this._emitChange({ ...this._config, battery });
  }

  private _renderConsumersSection(): TemplateResult {
    const c = this._config;
    if (!c) return html``;
    const itemSchema = [
      { name: 'name', selector: { text: {} }, required: true },
      { name: 'power', selector: { entity: { domain: 'sensor' } }, required: true },
      { name: 'icon', selector: { icon: {} } },
    ];
    return html`
      <div class="section">
        <h3>${DE.editor.sectionConsumers}</h3>
        ${c.consumers.map((item, i) => html`
          <div class="list-item">
            <ha-form
              .data=${item}
              .schema=${itemSchema}
              .hass=${this.hass}
              @value-changed=${(e: CustomEvent) => this._onConsumerItemChange(i, e.detail.value as ConsumerConfig)}
            ></ha-form>
            <button @click=${() => this._moveConsumer(i, -1)} ?disabled=${i === 0}>${DE.editor.moveUp}</button>
            <button @click=${() => this._moveConsumer(i, 1)} ?disabled=${i === c.consumers.length - 1}>${DE.editor.moveDown}</button>
            <button @click=${() => this._removeConsumer(i)}>${DE.editor.remove}</button>
          </div>
        `)}
        <button class="add-btn" @click=${() => this._addConsumer()}>${DE.editor.addConsumer}</button>
      </div>
    `;
  }

  private _onConsumerItemChange(i: number, value: ConsumerConfig): void {
    if (!this._config) return;
    const consumers = [...this._config.consumers];
    consumers[i] = value;
    this._emitChange({ ...this._config, consumers });
  }

  private _addConsumer(): void {
    if (!this._config) return;
    const consumers = [...this._config.consumers, { name: 'Verbraucher', power: '' }];
    this._emitChange({ ...this._config, consumers });
  }

  private _removeConsumer(i: number): void {
    if (!this._config) return;
    const consumers = this._config.consumers.filter((_, idx) => idx !== i);
    this._emitChange({ ...this._config, consumers });
  }

  private _moveConsumer(i: number, delta: number): void {
    if (!this._config) return;
    const consumers = [...this._config.consumers];
    const j = i + delta;
    if (j < 0 || j >= consumers.length) return;
    const tmp = consumers[i];
    const other = consumers[j];
    if (!tmp || !other) return;
    consumers[i] = other;
    consumers[j] = tmp;
    this._emitChange({ ...this._config, consumers });
  }
```

- [ ] **Step 2: Verify typecheck**

Run: `pnpm typecheck`
Expected: PASS.

- [ ] **Step 3: Manual sandbox test**

Run: `pnpm preview`
Open: `dist/preview/preview.html`. Open the browser DevTools and run:

```javascript
const editor = document.createElement('custom-energy-flow-card-editor');
editor.setConfig(document.getElementById('card').config);
document.body.appendChild(editor);
```

Verify lists render, add/remove/move buttons work, pairing dropdown shows current solar IDs.

- [ ] **Step 4: Commit**

```bash
git add src/editor.ts
git commit -m "feat(editor): add solar/battery/consumer list sections with pairing"
```

### Task 4.3: Editor — Validation hookup

**Files:**
- Modify: `src/editor.ts`

- [ ] **Step 1: Add validation gate to `_emitChange`**

In `src/editor.ts`, find:

```typescript
  private _emitChange(config: Config): void {
    this._config = config;
    fireConfigChanged(this, config);
  }
```

Replace with:

```typescript
  private _emitChange(config: Config): void {
    this._config = config;
    try {
      validateConfig(config);
      this._validationError = undefined;
      fireConfigChanged(this, config);
    } catch (err) {
      this._validationError = err instanceof Error ? err.message : String(err);
      console.warn('[custom-energy-flow-card] config not yet valid:', err);
      // Do not fire config-changed: HA would otherwise persist invalid config.
    }
  }
```

Add at the top of the file (after existing imports):

```typescript
import { validateConfig } from './config/schema';
```

- [ ] **Step 2: Run lint + typecheck**

Run: `pnpm lint && pnpm typecheck`
Expected: PASS.

- [ ] **Step 3: Build + sandbox manual check**

Run: `pnpm build && pnpm preview`
In sandbox: try invalid edits (e.g., delete all solars and batteries — `consumers` empty too), confirm `config-changed` is not fired (no card update).

- [ ] **Step 4: Commit**

```bash
git add src/editor.ts
git commit -m "feat(editor): gate config-changed on schema validation"
```

---

## Phase 5 — Polish & Release

### Task 5.1: HACS distribution + example config

**Files:**
- Create: `hacs.json`
- Create: `examples/2-pv-2-batt.yaml`

- [ ] **Step 1: Create `hacs.json`**

```json
{
  "name": "Custom Energy Flow Card",
  "render_readme": true,
  "filename": "custom-energy-flow-card.js"
}
```

- [ ] **Step 2: Create `examples/2-pv-2-batt.yaml`**

```yaml
type: custom:custom-energy-flow-card
title: Energiefluss

solar:
  - id: dach
    name: Solar Dach
    power: sensor.solar_dach_power
    icon: mdi:solar-power
  - id: balkon
    name: Solar Balkon
    power: sensor.solar_balkon_power
    icon: mdi:solar-panel

battery:
  - id: dach
    name: Dach-Speicher
    soc: sensor.akku_dach_soc
    power: sensor.akku_dach_power
    charged_by: dach
  - id: balkon
    name: Balkon-Speicher
    soc: sensor.akku_balkon_soc
    power: sensor.akku_balkon_power
    charged_by: balkon

grid:
  power: sensor.grid_power

home:
  name: Hausverbrauch

consumers:
  - name: Wärmepumpe
    power: sensor.heatpump_power
    icon: mdi:heat-pump
  - name: Wallbox
    power: sensor.wallbox_power
    icon: mdi:ev-station
  - name: Herd
    power: sensor.stove_power
    icon: mdi:stove

display:
  active_threshold_w: 5
  number_format: grouped
  show_inactive_paths: false
  animation:
    base_duration_s: 2.5
    reference_power_w: 1000
    min_duration_s: 0.6
    max_dots_per_path: 4
```

- [ ] **Step 3: Commit**

```bash
git add hacs.json examples/2-pv-2-batt.yaml
git commit -m "chore: add hacs.json + 2-PV/2-batt example config"
```

### Task 5.2: README

**Files:**
- Create: `README.md`

- [ ] **Step 1: Create `README.md`**

```markdown
# Custom Energy Flow Card

Lovelace-Custom-Card für Home Assistant zur Live-Visualisierung des
Energieflusses in Mehr-Quellen-Haushalten — beliebig viele PV-Anlagen,
Akkus (1:1 mit ihrer ladenden PV gepairt), Großverbraucher.

## Was sie kann

- Solar oben, Netz links, Akkus unten, Verbraucher rechts, Haus mittig — alle Knoten als Kreise
- Animierte Punktströme entlang aktiver Pfade (Geschwindigkeit/Anzahl skaliert mit Leistung)
- Anteils-Ring um den Haus-Knoten zeigt Quellen-Anteile am aktuellen Verbrauch
- Werte in Watt mit Tausendertrennung; Netz mit Vorzeichen (`+Bezug` / `−Einspeisung`)
- HA-Theme-aware (Light/Dark folgt automatisch)
- Klick auf Knoten → HA-`more-info`-Dialog
- Tastatur-navigierbar
- YAML-Config plus grafischer Editor
- HACS-installierbar

## Installation via HACS

1. HACS öffnen → "Custom repositories" → Dieses Repo als "Lovelace" hinzufügen.
2. "Custom Energy Flow Card" installieren.
3. Resource in `configuration.yaml` (oder UI) eintragen:
   ```yaml
   resources:
     - url: /hacsfiles/custom-energy-flow-card/custom-energy-flow-card.js
       type: module
   ```

## Beispiel-Config

Siehe [`examples/2-pv-2-batt.yaml`](./examples/2-pv-2-batt.yaml) für eine
vollständige Beispiel-Konfiguration mit 2 PV-Anlagen, 2 Akkus, 3 Verbrauchern.

## Schema-Referenz

| Feld | Typ | Pflicht | Beschreibung |
|---|---|---|---|
| `type` | `custom:custom-energy-flow-card` | ja | — |
| `title` | string | nein | Card-Titel |
| `solar[]` | Liste | nein | siehe unten |
| `battery[]` | Liste | nein | siehe unten |
| `grid` | Objekt | ja | siehe unten |
| `home` | Objekt | nein | optionaler Override-Sensor |
| `consumers[]` | Liste | nein | siehe unten |
| `display` | Objekt | nein | Anzeige-Optionen |

### `solar[]`
```yaml
- id: <eindeutig im solar-Array>
  name: <optional>
  power: sensor.<entity>          # in W, kW, mW (auto-konvertiert)
  icon: mdi:<icon>                # optional
```

### `battery[]`
```yaml
- id: <eindeutig im battery-Array>
  name: <optional>
  soc: sensor.<entity>            # 0–100 %
  power: sensor.<entity>          # signiert: + laden, − entladen
  power_invert: false             # falls Sensor umgekehrt liefert
  charged_by: <solar.id>          # Pairing → Pflicht, 1:1
  icon: mdi:<icon>
```

### `grid`
Entweder ein signierter Sensor:
```yaml
grid:
  power: sensor.grid_power        # + Bezug, − Einspeisung
  power_invert: false
```
oder zwei separate:
```yaml
grid:
  import: sensor.grid_import
  export: sensor.grid_export
```

### `home`
```yaml
home:
  name: <optional Anzeigename>      # Default: "Hausverbrauch"
  power: sensor.<entity>            # optional Override-Sensor (W). Sonst wird
                                    # der Hausverbrauch aus der Bilanz berechnet:
                                    # P_home = ΣPV + ΣAkku-Entladen + Netzbezug
                                    #        − ΣAkku-Laden − Einspeisung
  icon: mdi:<icon>
```

### `consumers[]`
```yaml
- name: <Anzeigename>             # required
  power: sensor.<entity>          # ≥ 0
  icon: mdi:<icon>
```

### `display`
```yaml
display:
  active_threshold_w: 5           # darunter wird der Pfad ausgeblendet
  number_format: grouped          # "standard" | "grouped"
  show_inactive_paths: false
  animation:
    base_duration_s: 2.5
    reference_power_w: 1000
    min_duration_s: 0.6
    max_dots_per_path: 4
  colors:                         # optional Override pro semantischer Rolle
    solar:        '#f59e0b'       # Solar-Fluss
    battery:      '#10b981'       # Akku → Haus
    grid_import:  '#6b7280'       # Netzbezug
    grid_export:  '#16a34a'       # Einspeisung
    home:         '#ef4444'       # Haus-Knoten
    consumer:     '#db2777'       # Verbraucher
    warning:      '#eab308'       # Diagnose-Icon (Engine-Warnings)
```

### Sensor-Format

Alle `power`/`soc`-Felder erwarten die HA-Standard-Form `domain.object_id`
(Regex: `^[a-z_][a-z0-9_]*\.[a-z0-9_]+$`). Beispiel: `sensor.solar_dach_power` ✓,
`not_an_entity` ✗.

Power-Sensoren werden mit `unit_of_measurement` aus den HA-Attributen erkannt
und automatisch nach W konvertiert (`W`, `kW`, `mW`, `VA` unterstützt).

## Debug-Modus

Falls die Card nicht wie erwartet funktioniert: setze `display.debug: true` in
der Config. Die Card schreibt dann ausführliche `[CEFC] …`-Logs in die
Browser-Console (HA-Frontend → DevTools → Console), die uns bei Bug-Triage helfen.

```yaml
display:
  debug: true
```

## Pairing-Regel

Jeder Akku referenziert genau eine PV via `charged_by`. Eine PV darf
höchstens *einer* Battery zugeordnet sein (1:1). Eine PV ohne gepairten
Akku ist erlaubt; ein Akku ohne `charged_by` ist nicht erlaubt.

## Sensor-Vorzeichen

- **PV-Sensor**: ≥ 0 W
- **Akku-Sensor**: signiert: `+` = laden, `−` = entladen. Wenn dein Sensor
  umgekehrt arbeitet → `power_invert: true`
- **Netz-Sensor**: signiert: `+` = Bezug, `−` = Einspeisung. Oder alternativ
  zwei separate Sensoren `import`/`export`

## Anpassen mit card-mod

Die Card stellt CSS `::part()`-Hooks bereit:

| Part | Element |
|---|---|
| `card` | Card-Wrapper |
| `node` | jeder Knoten |
| `node-solar` / `node-battery` / `node-grid` / `node-home` / `node-consumer` | per Typ |
| `flow` | jeder Fluss |
| `flow-pv-to-home` / … | per Pfad-Typ |
| `home-ring` | Anteils-Ring |

## Lizenz

MIT.
```

- [ ] **Step 2: Commit**

```bash
git add README.md
git commit -m "docs: add README with installation, schema, pairing, card-mod hooks"
```

### Task 5.3: Final verification + release prep

**Files:** none (verification only)

- [ ] **Step 1: Full check gate**

Run: `pnpm check`
Expected: lint, typecheck, all tests PASS. Engine/Config/Util coverage ≥ 90 %.

- [ ] **Step 2: Production build**

Run: `NODE_ENV=production pnpm build`
Expected: `dist/custom-energy-flow-card.js` exists.

- [ ] **Step 3: Bundle size check**

Run: `stat -c%s dist/custom-energy-flow-card.js`
Expected: ≤ 61440 bytes (60 kB per Spec §1.3 / §10.2).

If exceeded:
1. Run `pnpm build:analyze` and inspect `dist/bundle-stats.html`.
2. Look for unexpectedly large dependencies. Lit is the only allowed runtime dep.
3. If needed, add an ADR for any size-related architectural change.

- [ ] **Step 4: Sandbox manual test (golden path + edge cases)**

Run: `pnpm preview`
Open: `dist/preview/preview.html`

For each scenario:
- Click button → card renders, no console errors
- Tab through nodes → each gets focus visibly
- Press Enter on a focused node → console logs `[custom-energy-flow-card]` (or fires `hass-more-info`)
- DevTools → toggle `prefers-reduced-motion: reduce` → dots become static, lines pulse subtly

If any check fails: **stop and fix before release.** No "ship it and patch later" — the Anwender has no test HA.

- [ ] **Step 5: Verify documentation cross-references are intact**

Run:
```bash
grep -nE 'docs/superpowers' README.md docs/architecture.md docs/conventions.md docs/adr/*.md docs/specs/*.md CLAUDE.md
```
Expected: no matches (we moved away from `docs/superpowers/`).

Run:
```bash
ls docs/specs/ docs/plans/ docs/adr/ docs/architecture.md docs/conventions.md CLAUDE.md
```
Expected: all paths exist.

- [ ] **Step 6: Tag the release**

```bash
git tag -a v0.9.0 -m "Custom Energy Flow Card v0.9.0 (first production install)"
```

Push:

```bash
git push origin main --tags
```

The GitHub Actions release workflow (created in Task 0.1, Step 11) will build
and attach `dist/custom-energy-flow-card.js` to the GitHub Release.

- [ ] **Step 7: Hand off to Anwender**

Anwender installs via HACS → adds Lovelace resource → adds card to dashboard
using YAML from `examples/2-pv-2-batt.yaml` (or the GUI editor).

Acceptance test (Spec §10.1):
- Beide PV-Anlagen, beide Speicher, drei Verbraucher korrekt
- Energieflüsse stimmen qualitativ über 5 Stichproben in 3 Tagen
- Anteils-Ring sinnvoll
- Klick → more-info
- Editor funktioniert
- Card crasht nicht bei kurzfristig fehlenden Sensoren

Bug-Reports werden als Issues geöffnet, gefixt im Master, und als v1.0.x
veröffentlicht.

---

## Plan Self-Review

**Spec coverage:** Each spec section is covered by at least one task:

| Spec § | Coverage |
|---|---|
| §0 Greenfield-Kontext | Task 0.1 (bootstrap), README in 5.2 |
| §1 Scope | Implicit in all tasks; README in 5.2 |
| §2.1 Tech-Stack | Task 0.1 |
| §2.2 Modulaufteilung | Phases 1–4 |
| §2.3 Datenfluss | Tasks 1.7–1.11, 3.2 |
| §2.4 Schicht-Boundaries | `.eslintrc.cjs` in Task 0.1 (zones for engine/config/render/util/i18n/ha + editor.ts) |
| §2.5 Typen | Tasks 1.4 (warning-types), 1.6 (engine), 1.11 (config) |
| §2.6 Tool-Configs | Task 0.1 |
| §2.7 Util-Modul | Tasks 1.1–1.4 (format-power, svg-path, memo, resolve-color, warning-types, read-sensor) |
| §3 Config | Task 1.11 |
| §4 Engine | Tasks 1.7–1.10 (alle 16 Edge-Cases inkl. Case 8) |
| §5.1 Layout | Task 2.2 |
| §5.2 Pfad-Routing | Task 2.2 |
| §5.3 Knoten-Rendering + a11y + Tab-Order | Task 2.4 (sortForTabOrder) |
| §5.4 Anteils-Ring | Task 2.3 |
| §5.5 Animation | Tasks 2.3a (edge-color shared), 2.5 |
| §5.6 Theme-Mapping | Task 2.1 |
| §5.7 Update-Strategie | Task 3.2 (`@property hasChanged`, `firstUpdated` + ResizeObserver, `disconnectedCallback`, memo mit viewBox) |
| §5.8 Reduced Motion | Task 2.5 (CSS) |
| §5.9 UX-Zustände | Task 3.2 (loading-skeleton, stub-hint, error-banner, narrow-banner, mount fade-in, hover/focus) + Task 2.4 (per-node sensor-unavailable) |
| §5.10 Crash-Resilienz | Task 3.2 (try/catch in `willUpdate` + Fallback-UI) |
| §5.11 a11y | Task 2.4 (role/aria-label/Tab-Order/Keyboard, CVD via Theme) |
| §5.12 Diagnostik-UX | Task 5.4 (Icon + per-Warning console.warn + native title-Tooltip; Dropdown-Panel ist v1.x-Kandidat) |
| §5.13 Card-Mod via `::part()` | Task 2.4 (part attrs in renderer) |
| §6 Card-Lifecycle + Editor | Tasks 3.2 (LitElement-Lifecycle, Stub-Erkennung), 3.3, 4.1–4.3 |
| §7 Build/Tests/Distribution | Phase 0 (CI mit 60-kB-Gate) + Phase 5 |
| §10 Erfolg | Task 5.3 |
| §11 Code-Qualität | ESLint zones (Task 0.1) + TDD-Reihenfolge in Phase 1 |

### Task 5.5: Headless-Smoke-Test als CI-Gate (M3)

Da der Anwender keine HA-Test-Instanz hat, fängt dieser Test die häufigsten
Class-Load-/Render-Crashes (B1/B2-Klassen) **vor** dem ersten Live-Install.

**Files:**
- Create: `scripts/smoke-test.mjs`
- Modify: `package.json` (Skript)
- Modify: `.github/workflows/ci.yml` (Smoke-Test-Step)

- [ ] **Step 1: Add `happy-dom` to devDependencies (already there from Task 0.1)**

Verify:
```bash
grep happy-dom package.json
```
Expected: present.

- [ ] **Step 2: Create `scripts/smoke-test.mjs`**

```javascript
import { Window } from 'happy-dom';
import { readFileSync } from 'node:fs';

const window = new Window();
const { document } = window;

// Minimal globals so the bundle loads
globalThis.window = window;
globalThis.document = document;
globalThis.HTMLElement = window.HTMLElement;
globalThis.customElements = window.customElements;

// Stub <ha-card> as a transparent wrapper element
window.customElements.define('ha-card', class extends window.HTMLElement {});

const bundle = readFileSync('dist/custom-energy-flow-card.js', 'utf8');
const blob = new Blob([bundle], { type: 'application/javascript' });
const url = URL.createObjectURL(blob);
await import(url);

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
    'sensor.grid':   { state: '0',    attributes: { unit_of_measurement: 'W' } },
    'sensor.wp':     { state: '300',  attributes: { unit_of_measurement: 'W' } },
  },
};
await Promise.resolve();   // give Lit a tick

const sr = card.shadowRoot;
if (!sr) throw new Error('smoke-test: shadowRoot missing after first render');
const svg = sr.querySelector('svg');
if (!svg) throw new Error('smoke-test: SVG not rendered');
console.log('✓ shadow DOM rendered with SVG');

const circles = sr.querySelectorAll('circle');
if (circles.length === 0) throw new Error('smoke-test: no circles rendered');
console.log(`✓ ${circles.length} circles rendered`);

console.log('\nALL SMOKE TESTS PASSED');
```

- [ ] **Step 3: Add `smoke` script to `package.json`**

In the `scripts` block of `package.json` (Task 0.1, Step 1), add:

```json
"smoke": "pnpm build && node scripts/smoke-test.mjs",
```

- [ ] **Step 4: Add smoke-step to `.github/workflows/ci.yml`**

After `pnpm build` and the bundle-size check, add:

```yaml
      - name: Smoke test (bundle loads + renders)
        run: node scripts/smoke-test.mjs
```

- [ ] **Step 5: Run smoke test locally**

Run: `pnpm smoke`
Expected: PASS, all 6 checkmarks printed.

- [ ] **Step 6: Commit**

```bash
git add scripts/smoke-test.mjs package.json .github/workflows/ci.yml
git commit -m "test: add headless smoke-test as CI gate (M3 risk-mitigation)"
```

> **Was der Smoke-Test fängt:** Class-Load-Crashes (z. B. fehlerhafte
> CSS-Interpolation), fehlende customElement-Registrierung, fehlende
> customCards-Entry, setConfig-Crash bei Stub, Render-Crash beim ersten
> hass-Update, leerer Shadow-DOM. **Was er nicht fängt:** echte HA-Form-
> Quirks, ha-entity-picker-Verhalten, Live-CSS-Animation. Dafür ist die
> Sandbox + die M1-Reference-Comparison da.

### Task 5.4 (added during self-review): Diagnostik-Icon

**Files:**
- Modify: `src/render/flow-renderer.ts` (add diagnostics overlay)

- [ ] **Step 1: Add diagnostics rendering**

In `src/render/flow-renderer.ts`, change `renderCard` to include a diagnostics
overlay when `result.warnings.length > 0`. Replace the entire function body with:

```typescript
export function renderCard(
  layout: LayoutResult,
  result: FlowResult,
  ctx: RenderContext,
): TemplateResult {
  const orderedNodes = sortForTabOrder(layout.nodes);
  return html`
    <svg
      viewBox="0 0 ${layout.width} ${layout.height}"
      preserveAspectRatio="xMidYMid meet"
      part="card"
      role="group"
      aria-label="${DE.card.name}"
    >
      ${layout.edges.map((e) => renderEdge(e, result, ctx))}
      ${orderedNodes.map((n) => renderNode(n, result, ctx))}
      ${result.warnings.length > 0 ? renderDiagnostics(result, layout, ctx) : svg``}
    </svg>
  `;
}

function renderDiagnostics(result: FlowResult, layout: LayoutResult, ctx: RenderContext): TemplateResult {
  const count = result.warnings.length;
  const label = `${DE.diagnostics.iconLabel}: ${count} ${DE.diagnostics.pluralize(count)}`;
  const summary = result.warnings
    .map((w) => `${w.code}: ${w.detail}${w.magnitudeW !== undefined ? ` (~${Math.round(w.magnitudeW)} W)` : ''}`)
    .join('\n');
  const fill = colorFor('warning', ctx.theme); // amber #eab308 default, overridable via display.colors.warning
  return svg`
    <g
      transform="translate(${layout.width - 30} 30)"
      part="diagnostics"
      role="button"
      tabindex="0"
      aria-label="${label}"
      style="cursor: help;"
      @click=${() => {
        for (const w of result.warnings) {
          console.warn(`[custom-energy-flow-card] ${w.code}: ${w.detail}`, w);
        }
      }}
      @keydown=${(e: KeyboardEvent) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          for (const w of result.warnings) {
            console.warn(`[custom-energy-flow-card] ${w.code}: ${w.detail}`, w);
          }
        }
      }}
    >
      <circle r="12" fill="${fill}" opacity="0.18"></circle>
      <circle r="12" fill="none" stroke="${fill}" stroke-width="1.5"></circle>
      <text text-anchor="middle" y="4" font-size="13" font-weight="700" fill="${fill}">!</text>
      <title>${count} ${DE.diagnostics.title}:\n${summary}</title>
    </g>
  `;
}
```

**Hinweis zum Dropdown-Panel:** Spec §5.12 fordert ein „leichtes Dropdown".
Innerhalb der SVG-Struktur ist das nicht trivial ohne Foreign-Object. Pragmatische
v1.0-Lösung: SVG-`<title>` als nativer Browser-Tooltip + per-Warning
`console.warn` beim Klick. Dropdown-Panel im DOM-Layer kommt in v1.x.

- [ ] **Step 2: Verify build + typecheck**

Run: `pnpm build && pnpm typecheck`
Expected: PASS, bundle still < 60 kB.

- [ ] **Step 3: Manual sandbox check**

Run: `pnpm preview`. Choose scenario "Inkonsistente Sensor-Werte" — diagnostics icon must appear in the card's top-right corner; hover shows summary.

- [ ] **Step 4: Commit**

```bash
git add src/render/flow-renderer.ts
git commit -m "feat(render): add diagnostics overlay surfacing engine warnings"
```

**Placeholder scan:** Searched plan for "TBD", "TODO", "FIXME" — only the literal "TODO" mentioned in the §11.5-quoted anti-pattern, not as actual placeholder. No code blocks ending in "...".

**Type consistency:** `FlowResult`, `SystemState`, `Config`, `LayoutResult` are
defined in Tasks 1.6, 1.11, 2.2 and reused consistently. `RenderContext` is
defined in Task 2.4 and extended in Task 2.5; the extension is shown explicitly
(replacement instructions). `pairedPvId`/`charged_by` mapping is in Task 1.11
and respected in 1.8/1.9.

**Final note:** Task 5.4 was added during self-review to close the §5.12 gap.
The plan now has 27 tasks (1 + 11 + 6 + 4 + 4 + 4 = 30 if we count Task 5.4).

---




