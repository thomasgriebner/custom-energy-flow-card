# Consumer-Grouping & Adaptive Card-Layout — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Verbraucher werden über HA-Area zu 5–7 Gruppen aggregiert, das Layout rückt Quellen nach innen und fächert Verbraucher als Bogen rechts, die Card deklariert ihre Größe via `getGridOptions()` an HA Sections-View, und der Akku-SoC wird als Ring statt Text-Label dargestellt.

**Architecture:** Drei verkettete Änderungen mit einer Single-Source-of-Truth (`deriveDisplayConsumers`) als pure Funktion in `config/`. Engine bleibt unverändert pure. Layer-Boundaries via ESLint erzwungen. SVG-Geometrie in `render/layout.ts`, Animation/SoC-Ring in eigenen `render/`-Modulen. Editor erweitert die General-Section. Tests TDD-first für `config/`, `util/`, strukturell für `render/`.

**Tech Stack:** TypeScript 5.4 strict + Lit 3.2 + Rollup 4 + Vitest 1.4 + happy-dom + ESLint 8 + pnpm 9. Bundle ≤ 60 kB, `card.ts` ≤ 200 LOC. Volle Spec: `docs/specs/2026-05-11-consumer-grouping-and-layout.md`.

**Reference Spec sections (READ FIRST):**

- §0.1 — Harte Constraints (LOC, Bundle, Layer, TDD)
- §7.2 — Helper, die wiederverwendet werden müssen
- §7.3 — Konzepte (ADR-Querverweise)
- §10 — Implementierungs-Reihenfolge (Quelle dieses Plans)

---

## File Structure (decomposed before tasks)

**New files:**

- `src/config/derive-display-consumers.ts` — Pure function, sole producer of `DisplayConsumer[]`.
- `src/config/derive-display-consumers.test.ts` — Coverage matrix from Spec §9.
- `src/render/battery-ring.ts` — `renderBatteryRing(socPct, color)`.
- `src/render/battery-ring.test.ts` — Strukturelle Tests.
- `src/card-helpers.test.ts` — Tests für `hassRelevantSensorsChanged` + `resolveEntityId`.
- `examples/with-grouping.yaml` — Doku-Beispiel.
- `docs/adr/0016-ha-area-grouping.md`
- `docs/adr/0017-adaptive-svg-layout.md`
- `docs/adr/0018-ha-dashboard-layout-api.md`

**Modified files:**

- `src/config/types.ts` — `DisplayConsumer` interface, `DisplayConfig.consumer_grouping`.
- `src/config/schema.ts` — `BuildResult.unavailableGroups`, `validateDisplay`-Erweiterung, `buildSystemState` ruft `deriveDisplayConsumers`.
- `src/config/schema.test.ts` — Validation + end-to-end mit Mock-Registry.
- `src/engine/types.ts` — (unverändert; `ConsumerState` passt bereits)
- `src/util/warning-types.ts` — Codes `REGISTRY_UNAVAILABLE`, `AREA_NOT_FOUND`.
- `src/ha/ha-types.ts` — Optional `entities`/`devices`/`areas`.
- `src/render/layout.ts` — Quellen-Cluster-Tabelle, Consumer-Arc, neue Signatur.
- `src/render/layout.test.ts` — **Rewrite** für neue Geometrie.
- `src/render/flow-renderer.ts` — `RenderContext` erweitert, ID-Lookup via Map, Battery-Ring-Aufruf.
- `src/render/edge-color.ts` — (unverändert; existierender Mapper passt)
- `src/const.ts` — `VIEWBOX = { width: 760, height: 540 }`.
- `src/card.ts` — `memoLayout` entfernen, neue States, `getGridOptions`/`getCardSize` dynamisch.
- `src/card-helpers.ts` — `hassRelevantSensorsChanged` erweitert, `resolveEntityId` ID-aware, neuer Helper `buildCardState`.
- `src/card-styles.ts` — `.node-soc` entfernen.
- `src/editor.ts` — `consumer_grouping`-Item in `_renderGeneralSection`.
- `src/i18n/de.ts` — Neue Strings.
- `README.md` — Option-Doku, Changelog-Abschnitt.
- `docs/architecture.md` — Modulkarte.
- `CLAUDE.md` — Doku-Karte.
- `docs/adr/README.md` — Index.

---

## Task 1: Card-LOC-Vorab-Auslagerung in `card-helpers.ts`

**Why first:** Spec §10 Schritt 0 — `card.ts` ist heute 199 LOC. Mit den neuen Features droht ein Überlaufen des 200-LOC-Limits (CLAUDE.md Regel 3). Wir lagern den gesamten `willUpdate`-Try-Block in eine pure `buildCardState`-Funktion aus, bevor wir Code hinzufügen.

**Files:**

- Modify: `src/card-helpers.ts` (add `buildCardState`)
- Modify: `src/card.ts` (use new helper in `willUpdate`)

- [ ] **Step 1.1: Read current state of files**

Run: `wc -l src/card.ts src/card-helpers.ts`
Expected: `card.ts ~199, card-helpers.ts ~58`

- [ ] **Step 1.2: Add `buildCardState` helper signature + types**

Add to `src/card-helpers.ts` (after existing imports, before existing functions):

```typescript
import type { BuildResult } from './config/schema';
import { buildSystemState } from './config/schema';
import { compute } from './engine/energy-engine';
import type { FlowResult } from './engine/types';
import type { EngineWarning } from './util/warning-types';

export interface CardState {
  build: BuildResult;
  flow: FlowResult;
}

export function buildCardState(config: Config, hass: HomeAssistant): CardState {
  const build = buildSystemState(config, hass);
  const engineResult = compute(build.state);
  return {
    build,
    flow: {
      ...engineResult,
      warnings: [...build.warnings, ...engineResult.warnings],
    },
  };
}
```

- [ ] **Step 1.3: Refactor `card.ts:willUpdate` to use `buildCardState`**

Replace the entire try-block body in `src/card.ts` `willUpdate` (currently lines ~115–141) with:

```typescript
try {
  const { build, flow } = buildCardState(this._config, this.hass);
  this._buildWarnings = build.warnings;
  this._unavailable = build.unavailableEntities;
  this._batterySoc = build.batterySoc;
  this._flowResult = flow;
  this._renderError = undefined;
  if (this._config.display?.debug) {
    console.info('[CEFC] willUpdate', {
      homeW: flow.homeW,
      warnings: flow.warnings.length,
      unavailable: build.unavailableEntities.size,
    });
  }
} catch (err) {
  this._renderError = err instanceof Error ? err.message : String(err);
  console.error('[custom-energy-flow-card] willUpdate error:', err);
}
```

Remove now-unused imports from `card.ts`: `buildSystemState` (it's used via helper), `compute` (same), `FlowResult` keeps as type.

- [ ] **Step 1.4: Update `card-helpers.ts` imports**

Move `import type { Config }` and `import type { HomeAssistant }` to top if not already, ensure all new types compile.

- [ ] **Step 1.5: Add minimal smoke test for `buildCardState`**

Create or extend `src/card-helpers.test.ts`. If file doesn't exist yet:

```typescript
import { describe, expect, it } from 'vitest';
import { buildCardState } from './card-helpers';
import type { Config } from './config/types';
import type { HomeAssistant } from './ha/ha-types';

describe('buildCardState', () => {
  it('returns build + flow with merged warnings', () => {
    const config: Config = {
      type: 'custom:custom-energy-flow-card',
      solar: [{ id: 'pv', power: 'sensor.pv' }],
      battery: [],
      grid: { power: 'sensor.grid' },
      consumers: [{ name: 'TV', power: 'sensor.tv' }],
    };
    const hass: HomeAssistant = {
      states: {
        'sensor.pv': { state: '1000', attributes: { unit_of_measurement: 'W' } },
        'sensor.grid': { state: '0', attributes: {} },
        'sensor.tv': { state: '50', attributes: { unit_of_measurement: 'W' } },
      },
    };
    const result = buildCardState(config, hass);
    expect(result.build.state.pv[0]?.powerW).toBe(1000);
    expect(result.flow.homeW).toBeGreaterThan(0);
    expect(result.flow.warnings).toEqual(expect.arrayContaining(result.build.warnings));
  });
});
```

(Note: This file will be expanded in Task 13.7 with more cases.)

- [ ] **Step 1.6: Verify LOC budget**

Run: `wc -l src/card.ts`
Expected: `≤ 190` (target leaves headroom for ~10 LOC additions in later tasks).

- [ ] **Step 1.7: Run check**

Run: `pnpm check`
Expected: PASS — all 108 tests green + 1 new buildCardState test (= 109 total), lint clean, typecheck clean.

- [ ] **Step 1.8: Commit**

```bash
git add src/card.ts src/card-helpers.ts src/card-helpers.test.ts
git commit -m "$(cat <<'EOF'
refactor(card): extract willUpdate body into buildCardState helper

Pre-emptive auslagerung um Headroom für die Consumer-Grouping +
Layout-Integration zu schaffen (Spec §10 Schritt 0).

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Task 2: Add Warning Codes

**Files:**

- Modify: `src/util/warning-types.ts`

- [ ] **Step 2.1: Add new codes**

Edit `src/util/warning-types.ts`:

```typescript
export type EngineWarningCode =
  | 'NEGATIVE_PV'
  | 'PAIRING_DEFICIT'
  | 'BALANCE_DRIFT'
  | 'EXPORT_INCONSISTENT'
  | 'SENSOR_UNAVAILABLE'
  | 'UNIT_UNKNOWN'
  | 'REGISTRY_UNAVAILABLE'
  | 'AREA_NOT_FOUND';
```

- [ ] **Step 2.2: Run typecheck**

Run: `pnpm typecheck`
Expected: PASS.

- [ ] **Step 2.3: Commit**

```bash
git add src/util/warning-types.ts
git commit -m "feat(util): add REGISTRY_UNAVAILABLE + AREA_NOT_FOUND warning codes"
```

---

## Task 3: HA-Type Extensions

**Files:**

- Modify: `src/ha/ha-types.ts`

- [ ] **Step 3.1: Extend HomeAssistant interface**

Replace `src/ha/ha-types.ts`:

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
  entities?: Record<string, { area_id?: string | null; device_id?: string | null }>;
  devices?: Record<string, { area_id?: string | null }>;
  areas?: Record<string, { area_id: string; name: string; icon?: string }>;
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

Note `string | null` because HA's API uses both `null` and missing keys for "no area". §4.2 Schritt 2 normalisiert beides via `?? undefined`.

- [ ] **Step 3.2: Run typecheck**

Run: `pnpm typecheck`
Expected: PASS.

- [ ] **Step 3.3: Commit**

```bash
git add src/ha/ha-types.ts
git commit -m "feat(ha): type entities/devices/areas registries as optional"
```

---

## Task 4: i18n Strings

**Files:**

- Modify: `src/i18n/de.ts`

- [ ] **Step 4.1: Add new strings**

Edit `src/i18n/de.ts` — add to the appropriate sections:

```typescript
// In DE.nodes section, after `consumer: 'Verbraucher'`:
unassignedGroup: 'Sonstige',

// In DE.editor section, after the last existing entry:
consumerGroupingLabel: 'Verbraucher-Gruppierung',
consumerGroupingNone: 'Keine',
consumerGroupingByArea: 'Nach HA-Area',
```

- [ ] **Step 4.2: Run typecheck**

Run: `pnpm typecheck`
Expected: PASS.

- [ ] **Step 4.3: Commit**

```bash
git add src/i18n/de.ts
git commit -m "feat(i18n): add strings for consumer grouping (label, options, fallback name)"
```

---

## Task 5: DisplayConsumer Type + Config Schema Extension

**Files:**

- Modify: `src/config/types.ts`
- Modify: `src/config/schema.ts`
- Modify: `src/config/schema.test.ts`

- [ ] **Step 5.1: Add `DisplayConsumer` type**

Edit `src/config/types.ts` — add at the end:

```typescript
export interface DisplayConsumer {
  /** Stabile ID. 'none'-Mode: 'c0','c1'… | 'by_area': 'g_<areaId>' bzw. 'g_unassigned'. */
  id: string;
  /** Anzeige-Name (von Area oder vom einzelnen consumer). */
  name: string;
  /** Optional, Auflösung siehe deriveDisplayConsumers Algorithmus Schritt 5. */
  icon?: string;
  /** Entity-IDs, deren powerW in diese Gruppe summiert wird. NIE leer. */
  members: string[];
  /** Falls aus Area aufgelöst; undefined im 'none'-Mode oder bei __unassigned. */
  areaId?: string;
}
```

Extend `DisplayConfig`:

```typescript
export interface DisplayConfig {
  active_threshold_w?: number;
  number_format?: 'standard' | 'grouped';
  show_inactive_paths?: boolean;
  animation?: AnimationConfig;
  colors?: Partial<Record<ColorRole, string>>;
  consumer_grouping?: 'none' | 'by_area';
  debug?: boolean;
}
```

- [ ] **Step 5.2: Write failing schema validation test**

Edit `src/config/schema.test.ts` — add a new `describe` block at the bottom:

```typescript
describe('validateConfig consumer_grouping', () => {
  it('accepts consumer_grouping: none', () => {
    const c = minimalConfig({ display: { consumer_grouping: 'none' } });
    expect(() => validateConfig(c)).not.toThrow();
  });

  it('accepts consumer_grouping: by_area', () => {
    const c = minimalConfig({ display: { consumer_grouping: 'by_area' } });
    expect(() => validateConfig(c)).not.toThrow();
  });

  it('throws on invalid consumer_grouping value', () => {
    const c = minimalConfig({ display: { consumer_grouping: 'invalid' as unknown as 'none' } });
    expect(() => validateConfig(c)).toThrow(/consumer_grouping/);
  });
});
```

- [ ] **Step 5.3: Run failing test**

Run: `pnpm test src/config/schema.test.ts`
Expected: 3 new tests FAIL (no validation for consumer_grouping yet).

- [ ] **Step 5.4: Add validation in `schema.ts`**

In `src/config/schema.ts`, find the `validateDisplay` function (or where display options are validated) and add:

```typescript
if (display.consumer_grouping !== undefined) {
  if (display.consumer_grouping !== 'none' && display.consumer_grouping !== 'by_area') {
    throw new Error(
      `display.consumer_grouping must be 'none' or 'by_area', got '${display.consumer_grouping}'`,
    );
  }
}
```

- [ ] **Step 5.5: Run test, expect pass**

Run: `pnpm test src/config/schema.test.ts`
Expected: All schema tests PASS (37 → 40).

- [ ] **Step 5.6: Commit**

```bash
git add src/config/types.ts src/config/schema.ts src/config/schema.test.ts
git commit -m "feat(config): add DisplayConsumer type + consumer_grouping schema validation"
```

---

## Task 6: `deriveDisplayConsumers` — TDD

**Files:**

- Create: `src/config/derive-display-consumers.ts`
- Create: `src/config/derive-display-consumers.test.ts`

- [ ] **Step 6.1: Write test file with full coverage matrix (failing)**

Create `src/config/derive-display-consumers.test.ts`:

```typescript
import { describe, expect, it } from 'vitest';
import { deriveDisplayConsumers } from './derive-display-consumers';
import type { Config } from './types';
import type { HomeAssistant } from '../ha/ha-types';

const baseConfig = (consumers: Array<{ power: string; name?: string }>): Config => ({
  type: 'custom:custom-energy-flow-card',
  solar: [],
  battery: [],
  grid: { power: 'sensor.grid' },
  consumers,
});

const emptyHass: HomeAssistant = { states: {} };

describe('deriveDisplayConsumers — none mode (default)', () => {
  it('returns 1:1 mapping in user order with c0, c1, … ids', () => {
    const config = baseConfig([{ power: 'sensor.a', name: 'A' }, { power: 'sensor.b' }]);
    const { consumers, warnings } = deriveDisplayConsumers(config, emptyHass);
    expect(consumers).toHaveLength(2);
    expect(consumers[0]).toMatchObject({ id: 'c0', name: 'A', members: ['sensor.a'] });
    expect(consumers[1]).toMatchObject({ id: 'c1', members: ['sensor.b'] });
    expect(consumers[1]?.name).toMatch(/Verbraucher/);
    expect(warnings).toEqual([]);
  });

  it('uses default name when consumer.name is missing', () => {
    const config = baseConfig([{ power: 'sensor.x' }]);
    const { consumers } = deriveDisplayConsumers(config, emptyHass);
    expect(consumers[0]?.name).toBe('Verbraucher 1');
  });
});

describe('deriveDisplayConsumers — by_area mode', () => {
  it('groups 3 sensors of same area into 1 group', () => {
    const config: Config = {
      ...baseConfig([
        { power: 'sensor.herd' },
        { power: 'sensor.spueler' },
        { power: 'sensor.mikrowelle' },
      ]),
      display: { consumer_grouping: 'by_area' },
    };
    const hass: HomeAssistant = {
      states: {},
      entities: {
        'sensor.herd': { area_id: 'kueche' },
        'sensor.spueler': { area_id: 'kueche' },
        'sensor.mikrowelle': { area_id: 'kueche' },
      },
      areas: { kueche: { area_id: 'kueche', name: 'Küche' } },
    };
    const { consumers, warnings } = deriveDisplayConsumers(config, hass);
    expect(consumers).toHaveLength(1);
    expect(consumers[0]).toMatchObject({
      id: 'g_kueche',
      name: 'Küche',
      areaId: 'kueche',
      members: ['sensor.herd', 'sensor.spueler', 'sensor.mikrowelle'],
    });
    expect(warnings).toEqual([]);
  });

  it('splits sensors into separate groups sorted alphabetically by name', () => {
    const config: Config = {
      ...baseConfig([{ power: 'sensor.pc' }, { power: 'sensor.herd' }, { power: 'sensor.tv' }]),
      display: { consumer_grouping: 'by_area' },
    };
    const hass: HomeAssistant = {
      states: {},
      entities: {
        'sensor.pc': { area_id: 'buero' },
        'sensor.herd': { area_id: 'kueche' },
        'sensor.tv': { area_id: 'wohnzimmer' },
      },
      areas: {
        buero: { area_id: 'buero', name: 'Büro' },
        kueche: { area_id: 'kueche', name: 'Küche' },
        wohnzimmer: { area_id: 'wohnzimmer', name: 'Wohnzimmer' },
      },
    };
    const { consumers } = deriveDisplayConsumers(config, hass);
    expect(consumers.map((c) => c.name)).toEqual(['Büro', 'Küche', 'Wohnzimmer']);
  });

  it('falls back to device.area_id when entity.area_id is missing', () => {
    const config: Config = {
      ...baseConfig([{ power: 'sensor.x' }]),
      display: { consumer_grouping: 'by_area' },
    };
    const hass: HomeAssistant = {
      states: {},
      entities: { 'sensor.x': { device_id: 'dev1' } },
      devices: { dev1: { area_id: 'garage' } },
      areas: { garage: { area_id: 'garage', name: 'Garage' } },
    };
    const { consumers } = deriveDisplayConsumers(config, hass);
    expect(consumers[0]).toMatchObject({ id: 'g_garage', name: 'Garage' });
  });

  it('puts sensors without any area into g_unassigned at the end', () => {
    const config: Config = {
      ...baseConfig([{ power: 'sensor.lost' }, { power: 'sensor.tv' }]),
      display: { consumer_grouping: 'by_area' },
    };
    const hass: HomeAssistant = {
      states: {},
      entities: { 'sensor.tv': { area_id: 'wz' } },
      areas: { wz: { area_id: 'wz', name: 'Wohnzimmer' } },
    };
    const { consumers } = deriveDisplayConsumers(config, hass);
    expect(consumers.map((c) => c.id)).toEqual(['g_wz', 'g_unassigned']);
    expect(consumers[1]?.name).toBe('Sonstige');
  });

  it('emits AREA_NOT_FOUND when area_id has no areas entry', () => {
    const config: Config = {
      ...baseConfig([{ power: 'sensor.x' }]),
      display: { consumer_grouping: 'by_area' },
    };
    const hass: HomeAssistant = {
      states: {},
      entities: { 'sensor.x': { area_id: 'ghost' } },
      areas: {},
    };
    const { consumers, warnings } = deriveDisplayConsumers(config, hass);
    expect(consumers[0]).toMatchObject({ id: 'g_ghost', name: 'ghost' });
    expect(warnings.some((w) => w.code === 'AREA_NOT_FOUND')).toBe(true);
  });

  it('falls back to none-mode + REGISTRY_UNAVAILABLE when hass.entities is missing', () => {
    const config: Config = {
      ...baseConfig([{ power: 'sensor.x' }]),
      display: { consumer_grouping: 'by_area' },
    };
    const { consumers, warnings } = deriveDisplayConsumers(config, emptyHass);
    expect(consumers[0]?.id).toBe('c0');
    expect(warnings.some((w) => w.code === 'REGISTRY_UNAVAILABLE')).toBe(true);
  });

  it('uses id as tiebreaker for areas with identical display names', () => {
    const config: Config = {
      ...baseConfig([{ power: 'sensor.a' }, { power: 'sensor.b' }]),
      display: { consumer_grouping: 'by_area' },
    };
    const hass: HomeAssistant = {
      states: {},
      entities: {
        'sensor.a': { area_id: 'beta' },
        'sensor.b': { area_id: 'alpha' },
      },
      areas: {
        alpha: { area_id: 'alpha', name: 'Doppelt' },
        beta: { area_id: 'beta', name: 'Doppelt' },
      },
    };
    const { consumers } = deriveDisplayConsumers(config, hass);
    expect(consumers.map((c) => c.areaId)).toEqual(['alpha', 'beta']);
  });

  it('treats area_id: null exactly like undefined', () => {
    const config: Config = {
      ...baseConfig([{ power: 'sensor.n' }]),
      display: { consumer_grouping: 'by_area' },
    };
    const hass: HomeAssistant = {
      states: {},
      entities: { 'sensor.n': { area_id: null, device_id: null } },
    };
    const { consumers } = deriveDisplayConsumers(config, hass);
    expect(consumers[0]?.id).toBe('g_unassigned');
  });
});
```

- [ ] **Step 6.2: Run the test file, expect all failures**

Run: `pnpm test src/config/derive-display-consumers.test.ts`
Expected: 11 tests FAIL ("Cannot find module 'derive-display-consumers'").

- [ ] **Step 6.3: Create implementation**

Create `src/config/derive-display-consumers.ts`:

```typescript
import { DE } from '../i18n/de';
import type { EngineWarning } from '../util/warning-types';
import type { HomeAssistant } from '../ha/ha-types';
import type { Config, DisplayConsumer } from './types';

const collator = new Intl.Collator('de', { sensitivity: 'base' });

export function deriveDisplayConsumers(
  config: Config,
  hass: HomeAssistant,
): { consumers: DisplayConsumer[]; warnings: EngineWarning[] } {
  const warnings: EngineWarning[] = [];
  const grouping = config.display?.consumer_grouping ?? 'none';

  if (grouping !== 'by_area' || !hass.entities) {
    if (grouping === 'by_area' && !hass.entities) {
      warnings.push({
        code: 'REGISTRY_UNAVAILABLE',
        detail: 'hass.entities missing; falling back to none-mode',
      });
    }
    return { consumers: mapNoneMode(config), warnings };
  }

  return groupByArea(config, hass, warnings);
}

function mapNoneMode(config: Config): DisplayConsumer[] {
  return config.consumers.map((c, i) => ({
    id: `c${i}`,
    name: c.name ?? `${DE.nodes.consumer} ${i + 1}`,
    icon: c.icon,
    members: [c.power],
    areaId: undefined,
  }));
}

function groupByArea(
  config: Config,
  hass: HomeAssistant,
  warnings: EngineWarning[],
): { consumers: DisplayConsumer[]; warnings: EngineWarning[] } {
  const byArea = new Map<string, string[]>();

  for (const c of config.consumers) {
    const areaId = resolveAreaId(c.power, hass);
    const key = areaId ?? '__unassigned';
    const list = byArea.get(key) ?? [];
    list.push(c.power);
    byArea.set(key, list);
  }

  const seenMissingArea = new Set<string>();
  const groups: DisplayConsumer[] = [];

  for (const [key, members] of byArea) {
    if (key === '__unassigned') {
      groups.push({
        id: 'g_unassigned',
        name: DE.nodes.unassignedGroup,
        members,
        areaId: undefined,
      });
      continue;
    }
    const areaEntry = hass.areas?.[key];
    let name: string;
    if (areaEntry) {
      name = areaEntry.name;
    } else {
      name = key;
      if (!seenMissingArea.has(key)) {
        warnings.push({
          code: 'AREA_NOT_FOUND',
          detail: `hass.areas['${key}'] missing — falling back to area_id as name`,
        });
        seenMissingArea.add(key);
      }
    }
    groups.push({
      id: `g_${key}`,
      name,
      icon: areaEntry?.icon,
      members,
      areaId: key,
    });
  }

  groups.sort((a, b) => {
    if (a.id === 'g_unassigned') return 1;
    if (b.id === 'g_unassigned') return -1;
    const byName = collator.compare(a.name, b.name);
    return byName !== 0 ? byName : collator.compare(a.id, b.id);
  });

  return { consumers: groups, warnings };
}

function resolveAreaId(entityId: string, hass: HomeAssistant): string | undefined {
  const entity = hass.entities?.[entityId];
  if (!entity) return undefined;
  if (entity.area_id) return entity.area_id;
  if (entity.device_id) {
    const device = hass.devices?.[entity.device_id];
    if (device?.area_id) return device.area_id;
  }
  return undefined;
}
```

- [ ] **Step 6.4: Run tests, expect pass**

Run: `pnpm test src/config/derive-display-consumers.test.ts`
Expected: 11 tests PASS.

- [ ] **Step 6.5: Run full check**

Run: `pnpm check`
Expected: PASS (lint clean — note we import `DE` from i18n into config, which is allowed by ESLint zone for config).

- [ ] **Step 6.6: Commit**

```bash
git add src/config/derive-display-consumers.ts src/config/derive-display-consumers.test.ts src/config/types.ts
git commit -m "feat(config): add deriveDisplayConsumers pure function (TDD, 11 test cases)"
```

---

## Task 7: `buildSystemState` Integration

**Files:**

- Modify: `src/config/schema.ts`
- Modify: `src/config/schema.test.ts`

- [ ] **Step 7.1: Extend `BuildResult` + change buildSystemState signature**

In `src/config/schema.ts`, find `BuildResult` interface (~line 13) and extend:

```typescript
export interface BuildResult {
  state: SystemState;
  warnings: EngineWarning[];
  unavailableEntities: Set<string>;
  /** Pro-Akku SoC (%); fehlt, wenn der zugehörige soc-Sensor unavailable ist. */
  batterySoc: Map<string, number>;
  /** Display-Consumers (resolved by deriveDisplayConsumers). */
  displayConsumers: DisplayConsumer[];
  /** Group-IDs deren ALLE members unavailable sind. */
  unavailableGroups: Set<string>;
}
```

Add imports at the top of `schema.ts`:

```typescript
import type { DisplayConsumer } from './types';
import { deriveDisplayConsumers } from './derive-display-consumers';
import type { HomeAssistant } from '../ha/ha-types';
```

**Change the `buildSystemState` signature** from `ReadSensorHassShape` to `HomeAssistant` (HomeAssistant satisfies the existing `states` access pattern AND gives us `entities`/`devices`/`areas`):

```typescript
export function buildSystemState(config: Config, hass: HomeAssistant): BuildResult {
```

Existing tests stay valid because `{ states: {...} }` is still a valid HomeAssistant (other fields optional).

- [ ] **Step 7.2: Write failing test for unavailableGroups**

Add to `src/config/schema.test.ts` in the `describe('buildSystemState', …)` block:

```typescript
it('exposes displayConsumers + unavailableGroups (none mode)', () => {
  const config = minimalConfig({
    consumers: [{ name: 'TV', power: 'sensor.tv' }],
  });
  const hass = buildHass({
    'sensor.tv': { state: '100', attributes: { unit_of_measurement: 'W' } },
    'sensor.grid': { state: '0' },
    'sensor.x': { state: '0' },
  });
  const r = buildSystemState(config, hass);
  expect(r.displayConsumers).toHaveLength(1);
  expect(r.displayConsumers[0]).toMatchObject({ id: 'c0', members: ['sensor.tv'] });
  expect(r.unavailableGroups.size).toBe(0);
});

it('marks group as unavailable when ALL members are unavailable', () => {
  const config = minimalConfig({
    consumers: [{ power: 'sensor.a' }, { power: 'sensor.b' }],
    display: { consumer_grouping: 'by_area' },
  });
  const hass: HomeAssistant = {
    states: {
      'sensor.a': { state: 'unavailable', attributes: {} },
      'sensor.b': { state: 'unavailable', attributes: {} },
      'sensor.grid': { state: '0', attributes: {} },
      'sensor.x': { state: '0', attributes: {} },
    },
    entities: {
      'sensor.a': { area_id: 'kueche' },
      'sensor.b': { area_id: 'kueche' },
    },
    areas: { kueche: { area_id: 'kueche', name: 'Küche' } },
  };
  const r = buildSystemState(config, hass);
  expect(r.displayConsumers[0]?.id).toBe('g_kueche');
  expect(r.unavailableGroups.has('g_kueche')).toBe(true);
});

it('keeps group available if at least one member is available', () => {
  const config = minimalConfig({
    consumers: [{ power: 'sensor.a' }, { power: 'sensor.b' }],
    display: { consumer_grouping: 'by_area' },
  });
  const hass: HomeAssistant = {
    states: {
      'sensor.a': { state: 'unavailable', attributes: {} },
      'sensor.b': { state: '50', attributes: { unit_of_measurement: 'W' } },
      'sensor.grid': { state: '0', attributes: {} },
      'sensor.x': { state: '0', attributes: {} },
    },
    entities: {
      'sensor.a': { area_id: 'kueche' },
      'sensor.b': { area_id: 'kueche' },
    },
    areas: { kueche: { area_id: 'kueche', name: 'Küche' } },
  };
  const r = buildSystemState(config, hass);
  expect(r.unavailableGroups.has('g_kueche')).toBe(false);
  expect(r.state.consumer[0]?.powerW).toBe(50);
});
```

- [ ] **Step 7.3: Run test, expect failures**

Run: `pnpm test src/config/schema.test.ts`
Expected: 3 new tests FAIL.

- [ ] **Step 7.4: Modify `buildSystemState` to use deriveDisplayConsumers**

In `src/config/schema.ts`, replace the consumer mapping. Find:

```typescript
const consumer = config.consumers.map((c, i) => ({ id: `c${i}`, powerW: read(c.power) }));
```

Replace with (no cast needed — signature now `HomeAssistant`):

```typescript
const derived = deriveDisplayConsumers(config, hass);
warnings.push(...derived.warnings);

const consumer = derived.consumers.map((g) => {
  const powerW = g.members.reduce((sum, m) => sum + read(m), 0);
  return { id: g.id, powerW };
});

const unavailableGroups = new Set<string>();
for (const g of derived.consumers) {
  if (g.members.every((m) => unavailable.has(m))) {
    unavailableGroups.add(g.id);
  }
}
```

Then update the `return` block:

```typescript
return {
  state: { pv, battery, grid: { powerW: gridPowerW }, consumer, home },
  warnings,
  unavailableEntities: unavailable,
  batterySoc,
  displayConsumers: derived.consumers,
  unavailableGroups,
};
```

Import HomeAssistant type at top:

```typescript
import type { HomeAssistant } from '../ha/ha-types';
```

- [ ] **Step 7.5: Run all tests**

Run: `pnpm test`
Expected: All tests PASS (108 + new + existing all green).

- [ ] **Step 7.6: Commit**

```bash
git add src/config/schema.ts src/config/schema.test.ts
git commit -m "feat(config): integrate deriveDisplayConsumers into buildSystemState

BuildResult bekommt displayConsumers + unavailableGroups.
buildSystemState summiert powerW pro Gruppe statt pro Einzelsensor.
Engine bleibt unverändert (ADR-0004)."
```

---

## Task 8: ViewBox Constant Update

**Files:**

- Modify: `src/const.ts`

- [ ] **Step 8.1: Update VIEWBOX**

Edit `src/const.ts`:

```typescript
export const VIEWBOX = { width: 760, height: 540 } as const;
```

- [ ] **Step 8.2: Run tests (expect layout test failures — they will be fixed in Task 10)**

Run: `pnpm test`
Expected: layout.test.ts tests FAIL (10 tests assert old 720×540). That's expected. Other tests PASS.

- [ ] **Step 8.3: NO commit yet** — wait for layout refactor in Tasks 9–10.

---

## Task 9: Layout Refactor — Sources Cluster + Consumer Arc

**Files:**

- Modify: `src/render/layout.ts`

This is the biggest geometric change. Carefully follow Spec §5.1 and §5.2.

- [ ] **Step 9.1: Update layout.ts signature + constants**

In `src/render/layout.ts`, replace the top constants and function signature:

```typescript
import { VIEWBOX } from '../const';
import { bezierPath, straightPath, type Point } from '../util/svg-path';
import type { Config, DisplayConsumer } from '../config/types';
import type { FlowEdgeKind, NodeKind } from '../engine/flow-graph';

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
const NODE_R_MEDIUM = 34;
const NODE_R_CONSUMER = 24;
const NODE_R_GRID = 32;
const TOP_Y = 80;
const BOTTOM_Y = 460;
const MIDDLE_Y = 270;
const GRID_X = 60;
const HOME_X = 380;
const SOURCE_X_MIN = 130;
const SOURCE_X_MAX = 440;
const CONSUMER_ARC_R = 275;
const CONSUMER_ARC_MAX_DEG = 25;
const CONSUMER_ARC_STEP_DEG = 7;

export function computeLayout(
  config: Config,
  displayConsumers: ReadonlyArray<DisplayConsumer>,
): LayoutResult {
  const nodes: LayoutNode[] = [];

  // Solar (top): clustered x-positions
  const solarCount = config.solar.length;
  const solarXs = sourceClusterXs(solarCount);
  config.solar.forEach((s, i) => {
    nodes.push({ id: s.id, kind: 'pv', x: solarXs[i] ?? HOME_X, y: TOP_Y, r: NODE_R_MEDIUM });
  });

  // Grid (left)
  nodes.push({ id: '__grid', kind: 'grid', x: GRID_X, y: MIDDLE_Y, r: NODE_R_GRID });

  // Home (center)
  nodes.push({ id: '__home', kind: 'home', x: HOME_X, y: MIDDLE_Y, r: NODE_R_LARGE });

  // Battery (bottom): x follows paired PV
  config.battery.forEach((b) => {
    const pairedPv = nodes.find((n) => n.kind === 'pv' && n.id === b.charged_by);
    const x = pairedPv?.x ?? HOME_X;
    nodes.push({ id: b.id, kind: 'battery', x, y: BOTTOM_Y, r: NODE_R_MEDIUM });
  });

  // Consumers (right): arc around home — compute positions ONCE, reuse for edges (ADR-0010)
  const consumerPositions = consumerArcPositions(displayConsumers.length);
  displayConsumers.forEach((c, i) => {
    const pos = consumerPositions[i];
    if (!pos) return;
    nodes.push({ id: c.id, kind: 'consumer', x: pos.x, y: pos.y, r: NODE_R_CONSUMER });
  });

  const edges = computeEdges(config, displayConsumers, nodes, consumerPositions);

  return { width: VIEWBOX.width, height: VIEWBOX.height, nodes, edges };
}

function sourceClusterXs(n: number): number[] {
  if (n <= 0) return [];
  if (n === 1) return [180];
  if (n === 2) return [180, 440];
  if (n === 3) return [130, 290, 440];
  if (n === 4) return [130, 230, 330, 440];
  // 5+ : evenly spaced between SOURCE_X_MIN and SOURCE_X_MAX
  const span = SOURCE_X_MAX - SOURCE_X_MIN;
  return Array.from({ length: n }, (_, i) => SOURCE_X_MIN + (i * span) / (n - 1));
}

function consumerArcPositions(n: number): Array<{ x: number; y: number; θ: number }> {
  if (n === 0) return [];
  if (n === 1) {
    return [{ x: HOME_X + CONSUMER_ARC_R, y: MIDDLE_Y, θ: 0 }];
  }
  const alphaDeg = Math.min(CONSUMER_ARC_MAX_DEG, ((n - 1) * CONSUMER_ARC_STEP_DEG) / 2);
  const alphaRad = (alphaDeg * Math.PI) / 180;
  return Array.from({ length: n }, (_, i) => {
    // Position i: from -alpha (top) to +alpha (bottom) — top consumer first for tab-order
    const θ = -alphaRad + (i * 2 * alphaRad) / (n - 1);
    return {
      x: HOME_X + CONSUMER_ARC_R * Math.cos(θ),
      y: MIDDLE_Y + CONSUMER_ARC_R * Math.sin(θ),
      θ,
    };
  });
}
```

- [ ] **Step 9.2: Implement `computeEdges` with new consumer-edge geometry**

Add at the bottom of `src/render/layout.ts`:

```typescript
function computeEdges(
  config: Config,
  displayConsumers: ReadonlyArray<DisplayConsumer>,
  nodes: LayoutNode[],
  consumerPositions: ReadonlyArray<{ x: number; y: number; θ: number }>,
): LayoutEdge[] {
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

  // Home → Consumer with arc-aware bezier (Spec §5.2 formula).
  // Reuses positions array from computeLayout — no recomputation (ADR-0010).
  displayConsumers.forEach((c, i) => {
    const pos = consumerPositions[i];
    if (!pos) return;
    edges.push({
      id: `home-to-${c.id}`,
      kind: 'home-to-consumer',
      fromNodeId: '__home',
      toNodeId: c.id,
      d: consumerEdgePath(pos.θ, pos.x, pos.y),
    });
  });

  return edges;
}

function consumerEdgePath(θ: number, cx: number, cy: number): string {
  if (Math.abs(θ) < 1e-6 && Math.abs(cy - MIDDLE_Y) < 1e-6) {
    // N=1 special case: straight line
    return straightPath({ x: HOME_X, y: MIDDLE_Y }, { x: cx, y: cy });
  }
  const HOME_EDGE_R = NODE_R_LARGE + 2;
  const CONS_EDGE_R = NODE_R_CONSUMER + 2;
  const start: Point = {
    x: HOME_X + HOME_EDGE_R * Math.cos(θ),
    y: MIDDLE_Y + HOME_EDGE_R * Math.sin(θ),
  };
  const end: Point = {
    x: cx - CONS_EDGE_R * Math.cos(θ),
    y: cy - CONS_EDGE_R * Math.sin(θ),
  };
  const control: Point = {
    x: start.x + 0.55 * (end.x - start.x) - 18 * Math.cos(θ),
    y: start.y + 0.55 * (end.y - start.y) - 18 * Math.sin(θ),
  };
  return bezierPath(start, end, control);
}

function midpoint(a: Point, b: Point, yOffset: number): Point {
  return { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 + yOffset };
}
```

Delete the OLD `midpoint` declaration at the bottom (it gets re-added above) and the OLD edge-building loop (now inside `computeEdges`).

- [ ] **Step 9.3: Run typecheck**

Run: `pnpm typecheck`
Expected: PASS. (Layout tests will fail until Task 10 rewrites them.)

- [ ] **Step 9.4: NO commit yet** — Task 10 must rewrite tests first.

---

## Task 10: Layout Test Rewrite

**Files:**

- Modify (rewrite): `src/render/layout.test.ts`

- [ ] **Step 10.1: Replace `src/render/layout.test.ts` content**

```typescript
import { describe, expect, it } from 'vitest';
import { computeLayout } from './layout';
import type { Config, DisplayConsumer } from '../config/types';

const baseConfig = (over: Partial<Config> = {}): Config => ({
  type: 'custom:custom-energy-flow-card',
  solar: [],
  battery: [],
  grid: { power: 'sensor.grid' },
  consumers: [],
  ...over,
});

const mkDisplayConsumers = (n: number): DisplayConsumer[] =>
  Array.from({ length: n }, (_, i) => ({
    id: `c${i}`,
    name: `C${i}`,
    members: [`sensor.c${i}`],
  }));

describe('computeLayout — viewBox + grid', () => {
  it('returns 760×540 viewBox', () => {
    const layout = computeLayout(baseConfig(), []);
    expect(layout.width).toBe(760);
    expect(layout.height).toBe(540);
  });

  it('places home at (380, 270)', () => {
    const layout = computeLayout(baseConfig(), []);
    const home = layout.nodes.find((n) => n.kind === 'home');
    expect(home).toMatchObject({ x: 380, y: 270, r: 50 });
  });

  it('places grid at (60, 270)', () => {
    const layout = computeLayout(baseConfig(), []);
    const grid = layout.nodes.find((n) => n.kind === 'grid');
    expect(grid).toMatchObject({ x: 60, y: 270, r: 32 });
  });
});

describe('computeLayout — sources cluster (PV x-positions)', () => {
  it.each([
    [1, [180]],
    [2, [180, 440]],
    [3, [130, 290, 440]],
    [4, [130, 230, 330, 440]],
    [5, [130, 207.5, 285, 362.5, 440]],
    [6, [130, 192, 254, 316, 378, 440]],
  ] as const)('PV count %d → x-positions %o', (count, expected) => {
    const config = baseConfig({
      solar: Array.from({ length: count }, (_, i) => ({ id: `pv${i}`, power: `sensor.pv${i}` })),
    });
    const layout = computeLayout(config, []);
    const pvXs = layout.nodes.filter((n) => n.kind === 'pv').map((n) => n.x);
    expected.forEach((x, i) => {
      expect(pvXs[i]).toBeCloseTo(x, 0);
    });
  });
});

describe('computeLayout — battery x follows paired PV (ADR-0006)', () => {
  it('battery aligns to paired PV x', () => {
    const config = baseConfig({
      solar: [
        { id: 'pv1', power: 'sensor.pv1' },
        { id: 'pv2', power: 'sensor.pv2' },
      ],
      battery: [{ id: 'b1', soc: 'sensor.b1soc', power: 'sensor.b1', charged_by: 'pv2' }],
    });
    const layout = computeLayout(config, []);
    const pv2 = layout.nodes.find((n) => n.kind === 'pv' && n.id === 'pv2');
    const b1 = layout.nodes.find((n) => n.kind === 'battery' && n.id === 'b1');
    expect(b1?.x).toBe(pv2?.x);
    expect(b1?.y).toBe(460);
  });
});

describe('computeLayout — consumer arc', () => {
  it('N=1: single consumer right of home, no arc', () => {
    const layout = computeLayout(baseConfig(), mkDisplayConsumers(1));
    const consumers = layout.nodes.filter((n) => n.kind === 'consumer');
    expect(consumers).toHaveLength(1);
    expect(consumers[0]).toMatchObject({ x: 380 + 275, y: 270 });
  });

  it.each([2, 3, 4, 6, 7, 8])(
    'N=%d: all consumer y-positions are inside [80+32, 460-32] bounds',
    (n) => {
      const layout = computeLayout(baseConfig(), mkDisplayConsumers(n));
      const consumers = layout.nodes.filter((n) => n.kind === 'consumer');
      expect(consumers).toHaveLength(n);
      for (const c of consumers) {
        // PV at y=80 with r=32 → consumer top must be ≥ 112 + 24 (consumer r) = 136
        // Battery at y=460 with r=32 → consumer bottom must be ≤ 428 - 24 = 404
        expect(c.y).toBeGreaterThan(130);
        expect(c.y).toBeLessThan(410);
      }
    },
  );

  it('N=8 hits the α=25° cap (no overlap)', () => {
    const layout = computeLayout(baseConfig(), mkDisplayConsumers(8));
    const consumers = layout.nodes.filter((n) => n.kind === 'consumer');
    // α=25° → outermost y = 270 ± 275·sin(25°) ≈ 270 ± 116
    expect(consumers[0]?.y).toBeCloseTo(270 - 116.2, 0);
    expect(consumers[7]?.y).toBeCloseTo(270 + 116.2, 0);
  });
});

describe('computeLayout — edges', () => {
  it('builds correct edge count for full config', () => {
    const config = baseConfig({
      solar: [{ id: 'pv1', power: 'sensor.pv1' }],
      battery: [{ id: 'b1', soc: 'sensor.b1soc', power: 'sensor.b1', charged_by: 'pv1' }],
    });
    const consumers = mkDisplayConsumers(3);
    const layout = computeLayout(config, consumers);
    // Expected edges: pv-to-home, pv-to-grid, pv-to-battery, battery-to-home,
    // battery-to-grid, grid-to-home, grid-to-battery, 3× home-to-consumer = 10
    expect(layout.edges).toHaveLength(10);
  });

  it('home-to-consumer edge id matches consumer id', () => {
    const consumers = [{ id: 'g_kueche', name: 'Küche', members: ['sensor.a'] }];
    const layout = computeLayout(baseConfig(), consumers);
    expect(layout.edges.find((e) => e.kind === 'home-to-consumer')?.id).toBe('home-to-g_kueche');
  });
});
```

- [ ] **Step 10.2: Run tests, expect pass**

Run: `pnpm test src/render/layout.test.ts`
Expected: All tests PASS.

- [ ] **Step 10.3: Run full check**

Run: `pnpm check`
Expected: PASS.

- [ ] **Step 10.4: Commit layout + viewbox + tests together**

```bash
git add src/const.ts src/render/layout.ts src/render/layout.test.ts
git commit -m "feat(render): rewrite layout — viewBox 760×540, sources cluster, consumer arc

Spec §5.1, §5.2: PVs/Akkus clustern x ∈ [130, 440], Verbraucher fächern
±α (Cap 25°) im Radius 275 um Home. Layout-Test komplett neu.

Layer-Boundary unverändert (config/types-Import bleibt allow-listed)."
```

---

## Task 11: `renderBatteryRing`

**Files:**

- Create: `src/render/battery-ring.ts`
- Create: `src/render/battery-ring.test.ts`

- [ ] **Step 11.1: Write failing test**

Create `src/render/battery-ring.test.ts`:

```typescript
import { describe, expect, it } from 'vitest';
import { renderBatteryRing } from './battery-ring';

// Lit's SVGTemplateResult exposes strings + values arrays via its `_$litType$` shape.
// For pure structural tests we serialize the values into a string.
function serialize(template: ReturnType<typeof renderBatteryRing>): string {
  const t = template as unknown as { strings: readonly string[]; values: readonly unknown[] };
  const parts: string[] = [];
  t.strings.forEach((s, i) => {
    parts.push(s);
    if (i < t.values.length) parts.push(String(t.values[i]));
  });
  return parts.join('');
}

describe('renderBatteryRing', () => {
  it('renders background ring + filled segment for 50 %', () => {
    const out = serialize(renderBatteryRing(50, '#10b981'));
    expect(out).toContain('stroke-dasharray');
    // For 50%: dasharray = (264*0.5) (264*0.5) ≈ 131.95 131.95
    expect(out).toMatch(/131\.\d+ 131\.\d+/);
  });

  it('renders solid stroke (no dasharray) when socPct ≥ 99.5', () => {
    const out99 = serialize(renderBatteryRing(99.7, '#10b981'));
    expect(out99).not.toContain('stroke-dasharray=');
  });

  it('renders only background ring when socPct ≤ 0.5', () => {
    const out = serialize(renderBatteryRing(0.3, '#10b981'));
    // Background present, no filled-circle dasharray
    const matches = out.match(/stroke-dasharray/g);
    expect(matches).toBeNull();
  });

  it('clamps socPct above 100', () => {
    const out = serialize(renderBatteryRing(150, '#10b981'));
    expect(out).not.toContain('stroke-dasharray=');
  });

  it('clamps socPct below 0', () => {
    const out = serialize(renderBatteryRing(-10, '#10b981'));
    const matches = out.match(/stroke-dasharray/g);
    expect(matches).toBeNull();
  });
});
```

- [ ] **Step 11.2: Run test, expect failure**

Run: `pnpm test src/render/battery-ring.test.ts`
Expected: 5 tests FAIL ("Cannot find module").

- [ ] **Step 11.3: Implement `renderBatteryRing`**

Create `src/render/battery-ring.ts`:

```typescript
import { svg, type SVGTemplateResult } from 'lit';

const RING_RADIUS = 42;
const STROKE_WIDTH = 6;
const CIRCUMFERENCE = 2 * Math.PI * RING_RADIUS;

export function renderBatteryRing(socPct: number, color: string): SVGTemplateResult {
  const clamped = Math.min(100, Math.max(0, socPct));

  if (clamped <= 0.5) {
    return svg`
      <g transform="rotate(-90)" part="battery-ring">
        <circle
          cx="0" cy="0" r="${RING_RADIUS}"
          fill="none"
          stroke="${color}"
          stroke-width="${STROKE_WIDTH}"
          opacity="0.18"
        ></circle>
      </g>
    `;
  }

  if (clamped >= 99.5) {
    return svg`
      <g transform="rotate(-90)" part="battery-ring">
        <circle
          cx="0" cy="0" r="${RING_RADIUS}"
          fill="none"
          stroke="${color}"
          stroke-width="${STROKE_WIDTH}"
        ></circle>
      </g>
    `;
  }

  const filled = (CIRCUMFERENCE * clamped) / 100;
  const rest = CIRCUMFERENCE - filled;
  return svg`
    <g transform="rotate(-90)" part="battery-ring">
      <circle
        cx="0" cy="0" r="${RING_RADIUS}"
        fill="none"
        stroke="${color}"
        stroke-width="${STROKE_WIDTH}"
        opacity="0.18"
      ></circle>
      <circle
        cx="0" cy="0" r="${RING_RADIUS}"
        fill="none"
        stroke="${color}"
        stroke-width="${STROKE_WIDTH}"
        stroke-dasharray="${filled} ${rest}"
        stroke-linecap="round"
      ></circle>
    </g>
  `;
}
```

- [ ] **Step 11.4: Run tests, expect pass**

Run: `pnpm test src/render/battery-ring.test.ts`
Expected: 5 tests PASS.

- [ ] **Step 11.5: Playwright-Smoke (visual verification)**

Build preview + open in headless browser; take screenshot at 5 SoC values (0, 25, 50, 99.7, 100). Compare to v3-Mockup (`.superpowers/brainstorm/91844-1778525308/content/layout-arc-v3-batteryring.html`).

```
1. pnpm preview (or pnpm build:preview)
2. Playwright: navigate to preview URL
3. For socPct in [0, 25, 50, 99.7, 100]:
   - Inject test config with one battery, this SoC
   - Wait for SVG to render
   - browser_take_screenshot of the battery node
   - Assert: at 0 → no dasharray attr present; at 100 → no dasharray attr; mid → dasharray with two numbers
4. browser_close
```

If any visual mismatch (e.g., ring goes wrong direction, opacity wrong): STOP, fix renderBatteryRing implementation, re-test before commit.

- [ ] **Step 11.6: Commit**

```bash
git add src/render/battery-ring.ts src/render/battery-ring.test.ts
git commit -m "feat(render): add renderBatteryRing — SoC visualisation with 0.5/99.5 thresholds"
```

---

## Task 12: `flow-renderer.ts` Integration — ID Lookup + Battery Ring

**Files:**

- Modify: `src/render/flow-renderer.ts`
- Modify: `src/card-styles.ts`

- [ ] **Step 12.1: Extend `RenderContext` and refactor lookups**

In `src/render/flow-renderer.ts`, replace the `RenderContext` interface:

```typescript
import { renderBatteryRing } from './battery-ring';
import type { DisplayConsumer } from '../config/types';
// ... existing imports stay

export interface RenderContext {
  config: Config;
  formatGrouped: boolean;
  activeThresholdW: number;
  showInactive: boolean;
  theme: ThemeContext;
  buildWarnings: EngineWarning[];
  unavailableEntities: Set<string>;
  batterySoc: ReadonlyMap<string, number>;
  displayConsumers: ReadonlyMap<string, DisplayConsumer>;
  unavailableGroups: ReadonlySet<string>;
  animation?: AnimationConfig;
  onNodeClick?: (nodeId: string) => void;
}
```

- [ ] **Step 12.2: Replace ID-based lookups with Map-based**

Find `configEntryForNode`, `entityIdForNode`, and `isNodeUnavailable` (the consumer branch). Replace:

```typescript
function configEntryForNode(
  node: LayoutNode,
  ctx: RenderContext,
): SolarConfig | BatteryConfig | DisplayConsumer | undefined {
  if (node.kind === 'pv') return ctx.config.solar.find((s) => s.id === node.id);
  if (node.kind === 'battery') return ctx.config.battery.find((b) => b.id === node.id);
  if (node.kind === 'consumer') return ctx.displayConsumers.get(node.id);
  return undefined;
}

function entityIdForNode(node: LayoutNode, ctx: RenderContext): string | undefined {
  if (node.kind === 'pv') return ctx.config.solar.find((s) => s.id === node.id)?.power;
  if (node.kind === 'battery') {
    const b = ctx.config.battery.find((x) => x.id === node.id);
    if (!b) return undefined;
    return 'power' in b ? b.power : b.charge_power;
  }
  if (node.kind === 'grid') {
    return 'power' in ctx.config.grid ? ctx.config.grid.power : ctx.config.grid.import;
  }
  if (node.kind === 'consumer') {
    return ctx.displayConsumers.get(node.id)?.members[0];
  }
  return undefined;
}
```

In `isNodeUnavailable`, update the consumer branch:

```typescript
if (node.kind === 'consumer') {
  return ctx.unavailableGroups.has(node.id);
}
```

Update `nodeName`:

```typescript
function nodeName(node: LayoutNode, ctx: RenderContext): string {
  if (node.kind === 'consumer') {
    return ctx.displayConsumers.get(node.id)?.name ?? `${DE.nodes.consumer} ?`;
  }
  if (node.kind === 'pv') {
    const s = ctx.config.solar.find((x) => x.id === node.id);
    return s?.name ?? `${DE.nodes.solar} ${node.id}`;
  }
  if (node.kind === 'battery') {
    const b = ctx.config.battery.find((x) => x.id === node.id);
    return b?.name ?? `${DE.nodes.battery} ${node.id}`;
  }
  if (node.kind === 'grid') return DE.nodes.grid;
  if (node.kind === 'home') return ctx.config.home?.name ?? DE.nodes.home;
  return '';
}
```

- [ ] **Step 12.3: Update `nodeValueText` consumer branch**

Find the `nodeValueText` function, replace the consumer branch:

```typescript
if (node.kind === 'consumer') {
  return formatPowerW(findFlow(result.flows.homeToConsumer, node.id), { format: fmt });
}
```

(Engine already uses the group id as `homeToConsumer.sourceId` — no change needed.)

- [ ] **Step 12.4: Add battery-ring render call in `renderNode`**

In `renderNode`, find the battery block and modify. The current battery rendering shows `<text class="node-soc">`. Replace that block with:

```typescript
const isBattery = node.kind === 'battery';
const socPct = isBattery ? ctx.batterySoc.get(node.id) : undefined;
const showRing = !unavailable && socPct !== undefined && Number.isFinite(socPct);
const batteryRing = showRing
  ? renderBatteryRing(socPct as number, color)
  : svg``;

// In the return SVG (after ring/home ring section):
${batteryRing}
```

Remove the existing `<text class="node-soc">…</text>` element entirely from `renderNode`. Also remove the `socText` and `showSoc` text-version calculation (replaced by `showRing`).

Update aria-label calculation:

```typescript
const ariaLabel = unavailable
  ? `${name}: ${DE.states.sensorUnavailable}`
  : showRing
    ? `${name}: ${value}, ${Math.round(socPct as number)}%`
    : `${name}: ${value}`;
```

Reset the `iconY`/`valueY` to original positions (the SoC was bumping these up — no longer needed):

```typescript
const iconY = node.kind === 'home' ? -10 : -4;
const valueY = node.kind === 'home' ? 14 : 16;
```

- [ ] **Step 12.5: Remove `.node-soc` from `card-styles.ts`**

Edit `src/card-styles.ts`, remove this rule:

```css
.node-soc {
  fill: var(--secondary-text-color, #64748b);
}
```

Keep `.node-icon, .node-value, .node-name { fill: var(--primary-text-color, …); }` — those stay (dark-mode fix from earlier session).

- [ ] **Step 12.6: Run typecheck**

Run: `pnpm typecheck`
Expected: PASS — there will be type errors in `card.ts` because it still passes old context shape. Task 13 fixes that.

If typecheck fails on card.ts, note the errors; they will be fixed in next task.

- [ ] **Step 12.7: NO commit yet** — needs Task 13's card.ts update to compile fully. Bundle-Zwischen-Check folgt in Task 13.10.

---

## Task 13: `card.ts` — RenderContext + memoLayout Removal + Re-Render Filter

**Files:**

- Modify: `src/card.ts`
- Modify: `src/card-helpers.ts`
- Create: `src/card-helpers.test.ts`

- [ ] **Step 13.1: Remove `memoLayout` from card.ts**

In `src/card.ts`, **delete** these lines (top of file):

```typescript
const memoLayout = memoize(
  (config: Config) => computeLayout(config),
  (config: Config) =>
    JSON.stringify({
      s: config.solar.map((s) => s.id),
      b: config.battery.map((b) => ({ i: b.id, p: b.charged_by })),
      c: config.consumers.length,
    }),
);
```

Remove the `import { memoize } from './util/memo';` import if it's no longer used.

In `setConfig`, **delete** the line:

```typescript
if (!isStubConfig(validated)) {
  this._layout = memoLayout(validated);
}
```

Replace with just keeping the validation:

```typescript
// _layout is set in willUpdate once hass is available
```

- [ ] **Step 13.2: Add `_displayConsumers` and `_unavailableGroups` state**

In `src/card.ts`, after the existing `@state` declarations:

```typescript
@state() private _displayConsumers: ReadonlyMap<string, DisplayConsumer> = new Map();
@state() private _unavailableGroups: Set<string> = new Set();
```

Import `DisplayConsumer`:

```typescript
import type { DisplayConsumer } from './config/types';
```

- [ ] **Step 13.3: Update `willUpdate` to compute layout + propagate display state**

In `src/card.ts`, find the `try` block that uses `buildCardState`. Update:

```typescript
try {
  const { build, flow } = buildCardState(this._config, this.hass);
  this._buildWarnings = build.warnings;
  this._unavailable = build.unavailableEntities;
  this._batterySoc = build.batterySoc;
  this._displayConsumers = new Map(build.displayConsumers.map((c) => [c.id, c]));
  this._unavailableGroups = build.unavailableGroups;
  this._layout = computeLayout(this._config, build.displayConsumers);
  this._flowResult = flow;
  this._renderError = undefined;
  if (this._config.display?.debug) {
    console.info('[CEFC] willUpdate', {
      homeW: flow.homeW,
      consumers: build.displayConsumers.length,
      unavailableGroups: this._unavailableGroups.size,
    });
  }
} catch (err) {
  this._renderError = err instanceof Error ? err.message : String(err);
  console.error('[custom-energy-flow-card] willUpdate error:', err);
}
```

- [ ] **Step 13.4: Update render() RenderContext to include new fields**

In `src/card.ts` `render()`, find the `renderCard(...)` call and update the ctx object:

```typescript
${renderCard(this._layout, this._flowResult, {
  config: this._config,
  formatGrouped: (display.number_format ?? DEFAULTS.number_format) === 'grouped',
  activeThresholdW: display.active_threshold_w ?? DEFAULTS.active_threshold_w,
  showInactive: display.show_inactive_paths ?? DEFAULTS.show_inactive_paths,
  theme: { colorOverrides: display.colors },
  animation: display.animation,
  buildWarnings: this._buildWarnings,
  unavailableEntities: this._unavailable,
  batterySoc: this._batterySoc,
  displayConsumers: this._displayConsumers,
  unavailableGroups: this._unavailableGroups,
  onNodeClick: (id) => {
    const entity = resolveEntityId(this._config, id, this._displayConsumers);
    if (entity) fireMoreInfo(this, entity);
  },
})}
```

- [ ] **Step 13.5: Extend `hassRelevantSensorsChanged` in card-helpers.ts**

Replace the function:

```typescript
export function hassRelevantSensorsChanged(
  prev: HomeAssistant | undefined,
  next: HomeAssistant | undefined,
  config: Config | undefined,
): boolean {
  if (!prev || !next || !config) return true;
  if (config.display?.consumer_grouping === 'by_area') {
    if (prev.entities !== next.entities) return true;
    if (prev.devices !== next.devices) return true;
    if (prev.areas !== next.areas) return true;
  }
  for (const id of relevantSensorIds(config)) {
    const a = prev.states[id]?.state;
    const b = next.states[id]?.state;
    if (a !== b) return true;
  }
  return false;
}
```

- [ ] **Step 13.6: Update `resolveEntityId` to be group-id-aware**

Replace `resolveEntityId` in `src/card-helpers.ts`:

```typescript
export function resolveEntityId(
  config: Config | undefined,
  nodeId: string,
  displayConsumers?: ReadonlyMap<string, DisplayConsumer>,
): string | undefined {
  if (!config) return undefined;
  const solar = config.solar.find((s) => s.id === nodeId);
  if (solar) return solar.power;
  const battery = config.battery.find((b) => b.id === nodeId);
  if (battery) return 'power' in battery ? battery.power : battery.charge_power;
  if (nodeId === '__grid') return 'power' in config.grid ? config.grid.power : config.grid.import;
  if (nodeId === '__home') return config.home?.power;
  // Consumer node IDs: c0/c1 (none-mode) OR g_<area>/g_unassigned (by_area)
  if (displayConsumers) {
    return displayConsumers.get(nodeId)?.members[0];
  }
  // Legacy path: c0/c1 → config.consumers[idx]
  if (nodeId.startsWith('c') && !nodeId.startsWith('g_')) {
    const idx = Number.parseInt(nodeId.slice(1), 10);
    return config.consumers[idx]?.power;
  }
  return undefined;
}
```

Add the import:

```typescript
import type { DisplayConsumer } from './config/types';
```

- [ ] **Step 13.7: Extend `card-helpers.test.ts`**

Append to the existing `src/card-helpers.test.ts` (created in Task 1.5 with the `buildCardState`-smoke). Keep existing imports + tests, add these new imports and describe blocks:

```typescript
import { hassRelevantSensorsChanged, resolveEntityId } from './card-helpers';
import type { Config, DisplayConsumer } from './config/types';

const baseConfig = (over: Partial<Config> = {}): Config => ({
  type: 'custom:custom-energy-flow-card',
  solar: [{ id: 'pv1', power: 'sensor.pv' }],
  battery: [],
  grid: { power: 'sensor.grid' },
  consumers: [{ name: 'TV', power: 'sensor.tv' }],
  ...over,
});

describe('hassRelevantSensorsChanged', () => {
  it('returns true when prev is undefined', () => {
    expect(hassRelevantSensorsChanged(undefined, { states: {} }, baseConfig())).toBe(true);
  });

  it('returns true when a sensor state changed', () => {
    const prev: HomeAssistant = { states: { 'sensor.pv': { state: '100', attributes: {} } } };
    const next: HomeAssistant = { states: { 'sensor.pv': { state: '200', attributes: {} } } };
    expect(hassRelevantSensorsChanged(prev, next, baseConfig())).toBe(true);
  });

  it('returns false when nothing relevant changed', () => {
    const hass: HomeAssistant = { states: { 'sensor.pv': { state: '100', attributes: {} } } };
    expect(hassRelevantSensorsChanged(hass, hass, baseConfig())).toBe(false);
  });

  it('returns true in by_area mode when entities ref changed', () => {
    const config = baseConfig({ display: { consumer_grouping: 'by_area' } });
    const prev: HomeAssistant = { states: {}, entities: {} };
    const next: HomeAssistant = { states: {}, entities: {} }; // different reference
    expect(hassRelevantSensorsChanged(prev, next, config)).toBe(true);
  });

  it('ignores entities ref change in none mode', () => {
    const prev: HomeAssistant = { states: {}, entities: {} };
    const next: HomeAssistant = { states: {}, entities: {} };
    expect(hassRelevantSensorsChanged(prev, next, baseConfig())).toBe(false);
  });
});

describe('resolveEntityId', () => {
  const dc: ReadonlyMap<string, DisplayConsumer> = new Map([
    ['c0', { id: 'c0', name: 'TV', members: ['sensor.tv'] }],
    [
      'g_kueche',
      {
        id: 'g_kueche',
        name: 'Küche',
        members: ['sensor.herd', 'sensor.spueler'],
        areaId: 'kueche',
      },
    ],
  ]);

  it('resolves solar id to power sensor', () => {
    expect(resolveEntityId(baseConfig(), 'pv1', dc)).toBe('sensor.pv');
  });

  it('resolves c0 to first consumer power', () => {
    expect(resolveEntityId(baseConfig(), 'c0', dc)).toBe('sensor.tv');
  });

  it('resolves group id to first member', () => {
    expect(resolveEntityId(baseConfig(), 'g_kueche', dc)).toBe('sensor.herd');
  });

  it('resolves __grid to grid sensor', () => {
    expect(resolveEntityId(baseConfig(), '__grid', dc)).toBe('sensor.grid');
  });

  it('returns undefined for unknown id', () => {
    expect(resolveEntityId(baseConfig(), 'g_nonsense', dc)).toBeUndefined();
  });
});
```

- [ ] **Step 13.8: Run all tests**

Run: `pnpm test`
Expected: All tests PASS.

- [ ] **Step 13.9: Run typecheck + lint**

Run: `pnpm check`
Expected: PASS.

- [ ] **Step 13.10: Verify card.ts LOC budget**

Run: `wc -l src/card.ts`
Expected: ≤ 200.

- [ ] **Step 13.11: Bundle-Zwischen-Check (Early Warning Gate)**

```bash
pnpm build && wc -c dist/custom-energy-flow-card.js
```

Expected: ≤ 61440 bytes (= 60 kB). **If above:**

- `pnpm build:analyze` zeigt die größten Beitragenden (rollup-plugin-visualizer).
- Wahrscheinlichster Kandidat: SVG-Template-Strings — Lit's Template-Caching sollte greifen.
- Mitigation-Reihenfolge (kleinste Wirkung zuerst):
  1. Redundante SVG-Attribute kürzen (z. B. `part`-Names).
  2. Inline-i18n in Hot-Paths (statt `DE.*`-Lookup).
  3. `Intl.Collator` durch einfaches `localeCompare` ersetzen (geringe Wirkung, aber simpler).
- **Über 62 kB nach Mitigation:** STOP. Tasks 14+ pausieren, Issue eröffnen.

- [ ] **Step 13.12: Playwright-Vollintegration (visual + interactive)**

Vor dem Commit: vollständiger Browser-Check der integrierten Card.

```
1. Build preview, open in Playwright
2. Mit 2-PV / 2-Akku / 6-Verbraucher-Config (passend zu v3-Mockup):
   - browser_snapshot — Vergleich gegen v3-Mockup
   - browser_take_screenshot (light mode)
3. Dark Mode:
   - emulateMedia({colorScheme:'dark'})
   - browser_take_screenshot — Texte müssen lesbar bleiben (white-on-dark)
4. Reduced Motion:
   - emulateMedia({reducedMotion:'reduce'})
   - browser_evaluate: animationen müssen stoppen (offset-distance fix oder animation:none)
5. Tab-Navigation:
   - browser_press_key 'Tab' 6x → focus durchläuft PV, Grid, Battery, Consumer, Home
   - Assertion: aktiver Knoten hat focus-visible outline
6. Click auf Consumer-Knoten:
   - browser_evaluate: hook into hass-more-info-Event
   - browser_click auf Consumer
   - Assert Event fired mit dem ersten member-entityId
7. browser_console_messages — keine errors
8. browser_close
```

Bei jeglicher Abweichung: STOP, fix, re-test.

- [ ] **Step 13.13: Commit Tasks 12 + 13 together**

```bash
git add src/render/flow-renderer.ts src/card-styles.ts src/card.ts src/card-helpers.ts src/card-helpers.test.ts
git commit -m "feat(card,render): integrate displayConsumers + battery ring

- RenderContext erweitert um displayConsumers-Map + unavailableGroups
- flow-renderer nutzt Map-Lookup statt slice(1)+parseInt für IDs
- renderBatteryRing ersetzt <text class='node-soc'>
- memoLayout entfernt, layout in willUpdate berechnet
- hassRelevantSensorsChanged respektiert Registry-Refs im by_area-Mode
- resolveEntityId ist group-id-aware
- Card-helper-Tests neu (hassRelevant + resolveEntityId)
- Playwright-Verifikation: light + dark + reduced-motion + tab-nav + click"
```

---

## Task 14: `getGridOptions` + Dynamic `getCardSize`

**Files:**

- Modify: `src/card.ts`

- [ ] **Step 14.1: Add `getGridOptions` method**

In `src/card.ts`, replace the existing `getCardSize()`:

```typescript
getGridOptions(): {
  columns: number;
  rows: number;
  min_columns: number;
  max_columns: number;
  min_rows: number;
  max_rows: number;
} {
  return {
    columns: 6,
    rows: 5,
    min_columns: 4,
    max_columns: 12,
    min_rows: 4,
    max_rows: 8,
  };
}

getCardSize(): number {
  return Math.ceil((this.getGridOptions().rows * 56) / 50);
}
```

- [ ] **Step 14.2: Verify LOC**

Run: `wc -l src/card.ts`
Expected: ≤ 200.

- [ ] **Step 14.3: Run check**

Run: `pnpm check`
Expected: PASS.

- [ ] **Step 14.4: Commit**

```bash
git add src/card.ts
git commit -m "feat(card): add getGridOptions for HA Sections-View + dynamic getCardSize"
```

---

## Task 15: Editor Toggle

**Files:**

- Modify: `src/editor.ts`

- [ ] **Step 15.1: Add `consumer_grouping` to General Section**

In `src/editor.ts`, find `_renderGeneralSection` (~line 130). Update the `data` object:

```typescript
const data = {
  title: c.title ?? '',
  number_format: c.display?.number_format ?? 'grouped',
  show_inactive_paths: c.display?.show_inactive_paths ?? false,
  consumer_grouping: c.display?.consumer_grouping ?? 'none',
};
```

Update the `schema` array — add after the existing items:

```typescript
const schema = [
  { name: 'title', selector: { text: {} } },
  {
    name: 'number_format',
    selector: { select: { options: ['standard', 'grouped'] } },
  },
  { name: 'show_inactive_paths', selector: { boolean: {} } },
  {
    name: 'consumer_grouping',
    selector: {
      select: {
        mode: 'dropdown',
        options: [
          { value: 'none', label: DE.editor.consumerGroupingNone },
          { value: 'by_area', label: DE.editor.consumerGroupingByArea },
        ],
      },
    },
  },
];
```

Add `.computeLabel` callback to the `<ha-form>`:

```typescript
return html`
  <div class="section">
    <h3>${DE.editor.sectionGeneral}</h3>
    <ha-form
      .data=${data}
      .schema=${schema}
      .hass=${this.hass}
      .computeLabel=${(s: { name: string }): string =>
        s.name === 'consumer_grouping' ? DE.editor.consumerGroupingLabel : s.name}
      @value-changed=${(e: CustomEvent) => this._onGeneralChange(e.detail.value)}
    ></ha-form>
  </div>
`;
```

- [ ] **Step 15.2: Update `_onGeneralChange`**

Replace the function body's display object:

```typescript
private _onGeneralChange(value: Record<string, unknown>): void {
  if (!this._config) return;
  const newGrouping = value['consumer_grouping'];
  const newConfig: Config = {
    ...this._config,
    title: typeof value['title'] === 'string' ? value['title'] : undefined,
    display: {
      ...this._config.display,
      number_format: value['number_format'] as 'standard' | 'grouped',
      show_inactive_paths: Boolean(value['show_inactive_paths']),
      consumer_grouping: newGrouping === 'by_area' ? 'by_area' : undefined,
    },
  };
  this._emitChange(newConfig);
}
```

- [ ] **Step 15.3: Run check**

Run: `pnpm check`
Expected: PASS.

- [ ] **Step 15.4: Playwright-Editor-Test**

Editor in der Sandbox verifizieren:

```
1. Build preview, open in Playwright
2. Inject card config without consumer_grouping
3. Open editor (custom-energy-flow-card-editor mit setConfig)
4. browser_snapshot — ha-form rendert die 4 Felder
5. browser_click auf Dropdown 'Verbraucher-Gruppierung'
6. Assert dropdown options: 'Keine', 'Nach HA-Area'
7. browser_select_option 'by_area'
8. browser_evaluate — hook config-changed event
9. Assert: emittierte config hat display.consumer_grouping === 'by_area'
10. Wechsel zurück auf 'Keine' → display.consumer_grouping should be undefined (nicht 'none'!)
11. browser_close
```

Bei ha-form-Verhalten anders als erwartet (z. B. Dropdown öffnet nicht, Optionen leer): STOP, ha-form Selector-Shape recherchieren, Schema anpassen.

- [ ] **Step 15.5: Commit**

```bash
git add src/editor.ts
git commit -m "feat(editor): expose consumer_grouping toggle in General section

Playwright-verifiziert: dropdown öffnet, Optionen lokalisiert,
'by_area'-Auswahl emittiert korrekte config, 'none' wird zu undefined gemappt."
```

---

## Task 16: Beispiel-YAML + README + Architecture + CLAUDE.md

**Files:**

- Create: `examples/with-grouping.yaml`
- Modify: `README.md`
- Modify: `docs/architecture.md`
- Modify: `CLAUDE.md`

- [ ] **Step 16.1: Create example YAML**

Create `examples/with-grouping.yaml`:

```yaml
# Beispiel: Verbraucher werden automatisch nach HA-Area gruppiert.
# Voraussetzung: in HA Areas definiert + Sensoren bzw. Geräte zugewiesen.

type: custom:custom-energy-flow-card

solar:
  - id: dach
    name: PV Dach
    power: sensor.pv_dach_power
  - id: garage
    name: PV Garage
    power: sensor.pv_garage_power

battery:
  - id: b1
    name: Akku 1
    power: sensor.batt1_power
    soc: sensor.batt1_soc
    charged_by: dach

grid:
  import: sensor.netz_bezug
  export: sensor.netz_einspeisung

# Diese 5 Sensoren werden automatisch nach Area gruppiert.
# Beispielresultat: 2–3 Gruppen-Knoten statt 5 Einzel-Sensoren.
consumers:
  - power: sensor.herd_power
  - power: sensor.geschirrspueler_power
  - power: sensor.tv_power
  - power: sensor.pc_power
  - power: sensor.monitor_power

display:
  consumer_grouping: by_area
```

- [ ] **Step 16.2: README updates**

Append to `README.md` (Configuration section):

```markdown
### `display.consumer_grouping`

Optional. Default `none`.

- `none` — jeder Sensor aus `consumers[]` wird als eigener Knoten gezeigt.
- `by_area` — die Card resolvt für jeden Sensor die zugewiesene Area (aus
  HA's Entity-/Device-Registry) und merged Sensoren mit gleicher Area zu
  einer Verbraucher-Gruppe. Vorschau-Beispiel: `examples/with-grouping.yaml`.

**Hinweise zur Visualisierung:**

- Bestens optimiert für 1–6 PV-Anlagen und 1–8 sichtbare Verbraucher
  (Einzel-Sensoren oder Area-Gruppen).
- Bei > 8 Verbrauchern wird der Bogen visuell dicht — funktional bleibt
  alles erhalten, aber die Lesbarkeit leidet.
```

Append a new `## Changelog` section at the END of README.md:

```markdown
## Changelog

### Unreleased — v0.10.0

**Breaking visual change.** Existierende Configs funktionieren unverändert,
aber die Optik der Card ist neu:

- ViewBox 720×540 → **760×540** (etwas breiter wegen Verbraucher-Labels rechts).
- PVs und Akkus clustern jetzt in der linken 2/3-Fläche statt voll-breit verteilt.
- Verbraucher rechts angeordnet als Bogen statt vertikale Spalte (Skaliert 1–8).
- Akku-Ladestand als **Ring** statt Text-Label (analog zum Home-Attribution-Ring).
- Card deklariert ihre bevorzugte Größe an HA Sections-View via `getGridOptions()`.

**Neu:**

- `display.consumer_grouping: by_area` — automatische Verbraucher-Gruppierung
  nach HA-Area.

Falls du das alte Aussehen brauchst: Issue eröffnen — `display.layout: 'classic'`
ist ein v1.x-Kandidat.
```

- [ ] **Step 16.3: Update `docs/architecture.md`**

In the Module-Karte section (§2), add to the `config/` block:

- `derive-display-consumers.ts` — pure Funktion, gruppiert Verbraucher nach HA-Area

In the `render/` block, add:

- `battery-ring.ts` — SoC-Ring um den Akku-Knoten

- [ ] **Step 16.4: Update `CLAUDE.md`**

Add entry to the Doku-Karte table:

```markdown
| Subspec: Verbraucher-Gruppierung & Adaptives Layout | `docs/specs/2026-05-11-consumer-grouping-and-layout.md` |
```

- [ ] **Step 16.5: Commit**

```bash
git add examples/with-grouping.yaml README.md docs/architecture.md CLAUDE.md
git commit -m "docs: document consumer_grouping option + changelog + example yaml"
```

---

## Task 17: ADRs

**Files:**

- Create: `docs/adr/0016-ha-area-grouping.md`
- Create: `docs/adr/0017-adaptive-svg-layout.md`
- Create: `docs/adr/0018-ha-dashboard-layout-api.md`
- Modify: `docs/adr/README.md`

- [ ] **Step 17.1: ADR-0016**

Create `docs/adr/0016-ha-area-grouping.md` (template from `0000-template.md`):

```markdown
# ADR-0016: HA-Area-basierte Verbraucher-Gruppierung

- **Status:** accepted
- **Datum:** 2026-05-11
- **Entscheider:** @griebner

## Kontext und Problem

Ein typischer Haushalt hat 10–20 Smart-Plug-Sensoren, die als Einzelknoten in
der Card unleserlich werden. Wie aggregieren wir sie sinnvoll, ohne dass der
User pro Gruppe Code schreiben muss?

## Entscheidungs-Treiber

- Kein zusätzlicher YAML-Aufwand für User
- HA-konform (Areas sind die etablierte HA-Gruppierungseinheit)
- Engine bleibt pure (ADR-0004)
- Single-Source-of-Truth für "wie viele Verbraucher sehen wir gerade"

## Geprüfte Optionen

- **A — Card-seitig: hass.entities/devices/areas auflösen, gruppieren**
- **B — HA-seitig: Template-Sensoren pro Raum, Card konsumiert je einen**
- **C — Explizite YAML-Listen pro Gruppe**

## Entscheidung

**Gewählt: Option A.** Card resolvt `area_id` über `hass.entities` (Fallback
`hass.devices`). Neue pure Funktion `deriveDisplayConsumers(config, hass)`
in `config/` ist Single-Source-of-Truth — `buildSystemState`,
`computeLayout` und `RenderContext` ziehen daraus.

### Positive Konsequenzen

- Zero-Config: User listet wie heute einzelne Sensoren, Gruppierung passiert
  automatisch.
- HA bleibt Master der Area-Struktur — Card folgt.
- Engine kennt keine Gruppen-Semantik.

### Negative Konsequenzen

- Card hängt am HA-Registry-Lifecycle. Wenn `hass.entities` fehlt (alte HA,
  früher Lifecycle): Fallback auf `'none'`-Mode + `REGISTRY_UNAVAILABLE`-Warning.
- Spec-Update nötig, wenn HA-Registry-Shape sich ändert.

## Verlinkte Spec-Sektionen / Referenzen

- Subspec `docs/specs/2026-05-11-consumer-grouping-and-layout.md §4.2`
- ADR-0004 (Pure Engine)
- ADR-0010 (Shared Util)
```

- [ ] **Step 17.2: ADR-0017**

Create `docs/adr/0017-adaptive-svg-layout.md`:

```markdown
# ADR-0017: Quellen-Cluster + Consumer-Arc-Layout

- **Status:** accepted
- **Datum:** 2026-05-11
- **Entscheider:** @griebner

## Kontext und Problem

Das ursprüngliche Layout (Quellen voll-breit verteilt, Verbraucher als
vertikale Spalte rechts) bricht ab 5 Verbrauchern aus der ViewBox-Höhe.
Bei Gruppierung erwarten wir 5–7 sichtbare Knoten, also genau die kritische
Zone.

## Entscheidungs-Treiber

- Skaliert sauber für 1–8 sichtbare Verbraucher
- Bewahrt die radiale Schaltbild-Sprache (Kreise + Bezier + animierte Dots)
- Eine Animation pro Verbraucher (nicht via Sammelschiene/Trunk)
- Fixe ViewBox für vorhersagbare HA-Sections-View-Integration

## Geprüfte Optionen

- **A — Bogen (Arc):** Verbraucher fächern in ±α-Bogen rechts um Home
- **B — Sammelschiene:** Trunk + senkrechte Bus-Bar mit Tap-Verbrauchern
- **C — Spalte+ adaptiv:** bestehende Spalte mit dynamischem Gap, 2 Spalten ab N=7

## Entscheidung

**Gewählt: Option A.** Bogen mit Radius 275, Winkel ±α=`min(25°, (N-1)·7°/2)`,
fixer ViewBox 760×540. Quellen (PV/Akku) clustern in linker 2/3-Fläche
(x ∈ [130, 440]), Home bei (380, 270).

### Positive Konsequenzen

- Pro Verbraucher eigene animierte Bezier-Kurve (Schaltbild-DNA bleibt).
- α-Cap bei 25° garantiert keine PV/Akku-Kollision bis N=8.
- Adaptive ViewBox-Höhe nicht nötig (vereinfacht getGridOptions).

### Negative Konsequenzen

- Existierende Configs sehen anders aus (Breaking Visual Change — siehe
  Spec §12 für Migrations-Kommunikation).
- Bei N>8 wird der Bogen visuell dicht. Doku-Hinweis im README.

### Style-Konsistenz

Battery-Ring (neu) und Home-Ring (bestehend) teilen Geometrie-Prinzip
(`rotate(-90)`, `stroke-dasharray`), unterscheiden sich in `stroke-linecap`
(Home: square, Battery: round) — bewusste Abweichung für SoC-typische
runde Anmutung.

## Verlinkte Spec-Sektionen / Referenzen

- Subspec §5.1, §5.2, §5.3
- ADR-0006 (1:1 PV-Battery Pairing — bleibt)
- ADR-0010 (Shared Util)
```

- [ ] **Step 17.3: ADR-0018**

Create `docs/adr/0018-ha-dashboard-layout-api.md`:

```markdown
# ADR-0018: HA-Dashboard-Layout-API immer aktiv

- **Status:** accepted
- **Datum:** 2026-05-11
- **Entscheider:** @griebner

## Kontext und Problem

HA Sections-View (Default seit 2024.3) erwartet von Cards eine `getGridOptions()`-
Methode, die bevorzugte Spalten/Reihen deklariert. Ohne sie nimmt HA einen
generischen Default, der bei unserer 760×540-Geometrie unschön wirkt
(Leerraum / Über-Komprimierung).

## Entscheidungs-Treiber

- Sauberer Default in HA Sections-View ohne User-Resize-Aufwand
- Rückwärtskompatibel mit Legacy-Masonry-View (`getCardSize`)
- Kein User-Opt-out nötig (verbessert das Default-Verhalten)

## Geprüfte Optionen

- **A — Statische `getGridOptions` mit sensiblen Defaults + min/max-Bounds**
- **B — Adaptiv basierend auf Display-Consumer-Count**
- **C — `getCardSize` bleibt statisch hardcoded `6`**

## Entscheidung

**Gewählt: Option A.** `getGridOptions()` deklariert 6 cols × 5 rows mit
`min_columns: 4, max_columns: 12, min_rows: 4, max_rows: 8`. `getCardSize`
leitet sich daraus dynamisch ab (`Math.ceil(rows × 56 / 50)`).

### Positive Konsequenzen

- User bekommt einen sinnvollen Slot ohne manuelles Resizing.
- Min/Max-Bounds erlauben dem User trotzdem Anpassung (z. B. größer ziehen).
- `getCardSize` ist konsistent zu `getGridOptions` — keine Drift zwischen
  Masonry- und Sections-View.

### Negative Konsequenzen

- Bei HA-Versionen ohne `getGridOptions`-Support (< 2024.3) wird die Methode
  ignoriert — Fallback auf `getCardSize` greift. Funktioniert ohne Crash.

## Verlinkte Spec-Sektionen / Referenzen

- Subspec §6.1, §6.2
- [HA Frontend: Card Layout](https://developers.home-assistant.io/docs/frontend/custom-ui/custom-card/#getgridoptions)
```

- [ ] **Step 17.4: Update ADR README index**

Edit `docs/adr/README.md` and add entries for ADR-0016, 0017, 0018 to the index table.

- [ ] **Step 17.5: Commit ADRs**

```bash
git add docs/adr/0016-ha-area-grouping.md docs/adr/0017-adaptive-svg-layout.md docs/adr/0018-ha-dashboard-layout-api.md docs/adr/README.md
git commit -m "docs(adr): add 0016 grouping + 0017 layout + 0018 dashboard API"
```

---

## Task 18: End-to-End Verification

**Files:** (read-only verification)

- [ ] **Step 18.1: Run full check**

Run: `pnpm check`
Expected: PASS — all tests green, lint clean, typecheck clean.

- [ ] **Step 18.2: Build production bundle**

Run: `pnpm build`
Expected: Success.

- [ ] **Step 18.3: Verify bundle size ≤ 60 kB**

Run: `wc -c dist/custom-energy-flow-card.js`
Expected: ≤ 61440 bytes. If above: investigate and reduce (minification, code-paths).

- [ ] **Step 18.4: Verify card.ts LOC ≤ 200**

Run: `wc -l src/card.ts`
Expected: ≤ 200.

- [ ] **Step 18.5: Run smoke test**

Run: `pnpm smoke`
Expected: PASS.

- [ ] **Step 18.6: Playwright-E2E-Verifikation (umfassend)**

Vollständiger automatisierter Browser-Test der finalen Build:

```
1. pnpm preview
2. Playwright: open preview URL

A. Geometrie-Matrix
   For N in [1, 4, 7, 8]:
     - Inject config with N display-consumers
     - browser_take_screenshot
     - Assert SVG width=760, height=540
     - Assert consumer-nodes count = N
     - Assert no overlap: consumer-bbox vs PV-bbox vs Battery-bbox

B. SoC-Ring-Matrix
   For socPct in [0, 5, 50, 95, 99.5, 100, unavailable]:
     - Inject config with one battery
     - browser_take_screenshot of battery node
     - Visual diff against v3-mockup screenshots
     - Assert: unavailable → dashed border + no ring; 100% → solid stroke; 0% → only background

C. Theme + Motion
   - Light mode screenshot
   - Dark mode screenshot — assert text-fill computes to a light color (rgb component > 128)
   - reduced-motion screenshot — assert flow-dot animation-duration === 0s

D. Interaktion
   - browser_press_key 'Tab' through all nodes — assert tab-order PV → Grid → Battery → Consumer → Home
   - browser_click on each node type — assert hass-more-info or area-page event fired
   - Editor: open, toggle consumer_grouping, assert YAML output

E. Konsole-Hygiene
   - browser_console_messages → expect no errors, no warnings (except the deliberate engine warnings)

F. Bundle + Performance
   - browser_evaluate: performance.mark for first willUpdate → render
   - Assert: < 50 ms initial render in headless

3. browser_close
```

Manuelle Verifikation (nicht via Playwright möglich, nur Notiz):

- HA Sections-View belegt 6 cols × 5 rows ohne Leerraum — nur im echten HA testbar.

- [ ] **Step 18.7: ESLint layer-boundary check explicit**

Run: `pnpm lint -- --rule 'import/no-restricted-paths: error'`
Expected: zero violations.

- [ ] **Step 18.8: Final commit (if any cleanup needed)**

If everything is green, no additional commit. Otherwise fix and commit.

- [ ] **Step 18.9: Bump version + tag**

Edit `src/const.ts`:

```typescript
export const CARD_VERSION = '0.10.0';
```

Edit `package.json`:

```json
"version": "0.10.0"
```

Commit:

```bash
git add src/const.ts package.json
git commit -m "chore(release): bump to 0.10.0 — consumer grouping + adaptive layout"
```

---

## Self-Review Checklist (run BEFORE handoff)

After completing all tasks:

- [ ] All 18 tasks have green commits
- [ ] No `TODO` / `FIXME` / `XXX` in changed code
- [ ] `pnpm check` passes locally
- [ ] `wc -c dist/custom-energy-flow-card.js` ≤ 61440
- [ ] `wc -l src/card.ts` ≤ 200
- [ ] All new test files have ≥ 90% coverage for new code
- [ ] All 3 ADRs are linked from `docs/adr/README.md`
- [ ] `README.md` Changelog reflects the changes
- [ ] `examples/with-grouping.yaml` parses successfully through `validateConfig`

If anything fails: do NOT push to main. Fix in additional commits, re-verify.
