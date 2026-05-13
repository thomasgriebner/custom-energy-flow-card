# custom-energy-flow-card — Design

**Status:** Spec v4 (post-implementation-plan-review), ready for execution
**Datum:** 2026-05-11 (v0.9.1: §3.2 erweitert um Split-Battery-Sensoren, ADR-0015)
**Autor:** Brainstorming-Session mit @griebner

**Patch v3 → v4:** §5.7 Animation-Update-Strategie präzisiert (Lit reactive
re-render statt direktem `style.setProperty` für v1.0; `setProperty` als
optionale v1.x-Optimierung). §2.5 Notiz: `ColorRole` lebt in
`util/resolve-color.ts` (nicht in `config/types.ts`), weil `util/*` nicht
aus `config/*` importieren darf — Layer-Boundary über Spec-Idiomatik.

## 0. Projekt-Kontext

**Greenfield-Projekt.** Das Repo enthält zum Zeitpunkt dieses Specs nur:

- `.gitignore` (mit `.superpowers/`, `node_modules/`, `dist/`, `*.log`, `.DS_Store`)
- `docs/specs/2026-05-10-custom-energy-flow-card-design.md` (dieses Dokument)
- `docs/architecture.md` (high-level Architektur-Überblick, lebendiges Dokument)
- `docs/adr/` (Architecture Decision Records, ADR-0001 bis ADR-0010, dazu Template + README)
- `docs/conventions.md` (Code-/Doc-Konventionen für die tägliche Arbeit)
- `CLAUDE.md` (Projekt-Schnellreferenz für Claude Code: Tech-Stack, Doku-Struktur)
- Brainstorming-Session-Artefakte unter `.superpowers/` (gitignored)

**Begleit-Dokumente:** `architecture.md` ist die kompakte Sicht auf die
Architektur für Entwickler-Onboarding; ADRs halten _einzelne_ Entscheidungen
mit Kontext und Alternativen-Analyse fest. Bei jeder neuen Architektur-
Entscheidung im Verlauf der Implementation ist zwingend ein neuer ADR
anzulegen (Schema: `docs/adr/00XX-kurz-titel.md`, Template:
`docs/adr/0000-template.md`) und in `architecture.md §4` plus
`docs/adr/README.md` Index zu verlinken.

Es gibt **keinen Bestandscode**, keine Migrations- oder Backwards-Compat-Anforderungen.
Alle Tooling-Konventionen (Lint, Formatter, Build, Test) werden frisch entschieden
und sind im Rahmen dieses Specs verbindlich.

Der Anwender hat **keine HA-Test-Instanz**; die Card wird erst in seinem
produktiven HA installiert, wenn v1.0 vollständig ist. Daraus folgt: Engine
unit-getestet ≥ 90 % Coverage; Renderer/Editor visuell verifiziert in einer
mitgelieferten Sandbox; HA-Integrationsschicht nach HA-Konventionen,
Code-Review gegen `power-flow-card-plus` als Referenz.

## 1. Zielsetzung & Scope

### 1.1 Was die Card ist

Ein Lovelace-Custom-Card-Plugin für Home Assistant (`custom-energy-flow-card`),
das den Live-Energiefluss eines Mehr-Quellen-Haushalts visualisiert. Konzeptionell
inspiriert von [`power-flow-card-plus`](https://github.com/flixlix/power-flow-card-plus),
aber neu gebaut, um beliebig viele Solaranlagen, Speicher und Großverbraucher
zu unterstützen — was die Vorlage nicht kann.

### 1.2 Konkrete Motivation

Das Zielsystem des Anwenders besteht aus:

- Balkonkraftwerk **mit eigenem Speicher**
- Dach-PV-Anlage **mit eigenem Speicher**
- 2–3 großen Einzelverbrauchern (z. B. Wärmepumpe, Wallbox, Herd)
- Netzanschluss mit Bezugs-/Einspeisesensorik

`power-flow-card-plus` unterstützt nur eine PV und einen Akku; das ist nicht
ausreichend.

### 1.3 In Scope (v1.0)

- Generisch konfigurierbar: **N PV-Anlagen, N Akkus** (jeder Akku 1:1 mit einer
  PV gepairt — siehe §3.2 für die genaue Kardinalitäts-Regel), **N Großverbraucher**,
  **1 Netz**, **1 Haus**
- Festes Layout: **Solar oben · Netz links · Akkus unten · Verbraucher rechts ·
  Haus mittig**
- Alle Knoten als **Kreise** mit Icon + Wert innen, **Bezeichner außerhalb** auf
  der jeweils flussfreien Seite
- **Animierte Punktströme** entlang aller aktiven Pfade; Punktanzahl und
  Geschwindigkeit skalieren mit der Leistung
- **Inaktive Pfade werden ausgeblendet** (Threshold-konfigurierbar)
- **Anteils-Ring** (Doughnut) um den Haus-Kreis: zeigt live, woher der
  Hausverbrauch stammt
- Werte in **Watt** mit Tausendertrennung
- Netz signiert: **`+W = Bezug` · `−W = Einspeisung`** (Farbe wechselt mit Vorzeichen)
- Akkus: **SoC %** + Lade-/Entladeleistung mit Vorzeichen
- HA-Theme-aware (Light/Dark folgt automatisch)
- Klick auf Knoten → HA-Standard-`more-info`-Dialog
- Tastatur-navigierbar (Tab → Knoten, Enter/Space → more-info)
- YAML-Config **plus** grafischer Editor in Lovelace
- HACS-installierbar
- Crash-Resilient gegen fehlende Sensoren, sensor-unit-bewusst (W / kW / mW)
- Diagnose-Indikator bei Engine-Warnings

### 1.4 Out of Scope (v1.0)

- Energie-Tagesstatistiken / Historien (HA hat dafür eigene Karten)
- Phasen-aufgelöste Anzeige (L1/L2/L3)
- Dynamische Stromtarif-Anzeige
- Tooltip-Detail-Werte beim Hover (`more-info`-Dialog reicht)
- Internationalisierung (deutsche Default-Strings, mit `name`-Override pro
  Knoten in der Config; alle Strings sind aber bereits zentral in `i18n/de.ts`
  abgelegt — siehe §2.7 — sodass v1.x-i18n trivial wird)

## 2. Architektur

### 2.1 Tech-Stack & Versionen

| Tool                                 | Version        | Begründung                                         |
| ------------------------------------ | -------------- | -------------------------------------------------- |
| **Node.js**                          | ≥ 20.x LTS     | aktuelle LTS, deckt Vitest 1.x und Rollup 4.x      |
| **Package-Manager**                  | **pnpm** ≥ 9.x | kleiner `node_modules`, deterministisch, schnell   |
| **TypeScript**                       | `^5.4.0`       | strict mode, satisfies-Operator, const type params |
| **Lit**                              | `^3.2.0`       | reaktive LitElement, native ES decorators support  |
| **Rollup**                           | `^4.13.0`      | Bundle-Standard für HA-Custom-Cards                |
| **@rollup/plugin-typescript**        | `^11.1.0`      | TS-Compile im Build                                |
| **@rollup/plugin-node-resolve**      | `^15.2.0`      | ESM-Modul-Auflösung                                |
| **rollup-plugin-terser**             | `^7.0.2`       | Minification für Produktion                        |
| **rollup-plugin-visualizer**         | `^5.12.0`      | Bundle-Analyse (optional, dev)                     |
| **Vitest**                           | `^1.4.0`       | schnelle Unit-Tests, Vite-Ökosystem                |
| **happy-dom**                        | `^14.0.0`      | DOM-Environment für Editor-Tests                   |
| **@vitest/coverage-v8**              | `^1.4.0`       | Coverage-Report (Engine ≥ 90 %)                    |
| **eslint**                           | `^8.57.0`      | Linting + Import-Boundary-Check                    |
| **eslint-plugin-import**             | `^2.29.0`      | für `import/no-restricted-paths`                   |
| **@typescript-eslint/parser**        | `^7.4.0`       | TS-Parsing für ESLint                              |
| **@typescript-eslint/eslint-plugin** | `^7.4.0`       | TS-Regeln                                          |
| **prettier**                         | `^3.2.0`       | Formatter                                          |
| **husky**                            | `^9.0.0`       | Git-Hooks (pre-commit)                             |
| **lint-staged**                      | `^15.2.0`      | Lint nur auf staged files                          |

**Decorator-Variante:** TypeScript `experimentalDecorators: true` mit
`useDefineForClassFields: false`. Begründung: Konsistenz mit dem HA-Custom-Card-
Ökosystem (alle bestehenden Referenz-Cards nutzen experimental decorators).
Migration auf TC39-Standard-Decorators ist v2-Thema, nicht v1.0.

**Kein Runtime-Dependency außer Lit.** Bundle-Größenobergrenze: 60 kB minified.

### 2.2 Modulaufteilung

```
src/
├── index.ts                 # window.customCards.push, console banner, Card-Registrierung
├── card.ts                  # LitElement, HA-Lifecycle (THIN: ≤ 200 LOC)
├── editor.ts                # LitElement-Editor (siehe §6)
├── const.ts                 # Card-Name, Version, Defaults, customCards-Metadata
│
├── config/
│   ├── types.ts             # Config-Interface (siehe §2.5)
│   ├── schema.ts            # Validierungs-Schema + buildSystemState()
│   └── schema.test.ts
│
├── engine/
│   ├── types.ts             # SystemState, FlowResult (siehe §2.5)
│   ├── flow-graph.ts        # Topologie-Definitionen
│   ├── energy-engine.ts     # Pure functions, HA-frei (siehe §4)
│   └── energy-engine.test.ts
│
├── render/
│   ├── layout.ts            # Knoten-Positionen aus Config
│   ├── flow-renderer.ts     # SVG-Knoten + Pfade
│   ├── flow-animation.ts    # CSS-Animation (siehe §5.5)
│   ├── home-ring.ts         # Anteils-Doughnut
│   ├── theme.ts             # CSS-Variablen + Farb-Defaults
│   └── layout.test.ts
│
├── util/                    # Shared Utilities (siehe §2.7) — einziger Ort dieser Funktionen
│   ├── format-power.ts      # formatPowerW(value, opts)
│   ├── format-power.test.ts
│   ├── resolve-color.ts     # resolveColor(role, configOverrides)
│   ├── read-sensor.ts       # readSensorW(hass, entityId, opts) mit Unit-Konvertierung
│   ├── read-sensor.test.ts
│   ├── svg-path.ts          # bezierPath(from, to, control)
│   └── memo.ts              # memoize(fn, keyFn) für Layout/Engine-Caching
│
├── i18n/
│   └── de.ts                # alle Anwender-Strings (für v1.x-i18n vorbereitet)
│
└── ha/
    ├── ha-globals.d.ts      # TS-Deklarationen für ha-form, ha-entity-picker (siehe §6.4.2)
    ├── ha-helpers.ts        # fireEvent('hass-more-info'), state-Lookup
    └── ha-types.ts          # HomeAssistant, HassEntity (lokale subset-Typen)

examples/
├── preview.html             # Standalone-Sandbox (siehe §7.3)
├── preview-mocks.ts         # Mock-hass + Mock-FlowResult-Generatoren
└── 2-pv-2-batt.yaml         # Beispiel-Config

scripts/
├── build-preview.mjs        # bundelt examples/preview.html mit dist/
└── analyze-bundle.mjs       # rollup-plugin-visualizer Wrapper

.github/
└── workflows/
    ├── ci.yml               # PR/push → pnpm check
    └── release.yml          # Tag v* → build + upload zum GH-Release

.husky/
└── pre-commit               # ruft lint-staged
```

**Verbindliche Modulgrößen:**

- `card.ts` ≤ 200 LOC (delegiert; kein direktes SVG/CSS)
- `editor.ts` ≤ 400 LOC (kann mehr werden, da Form-Logik explizit ist)
- `energy-engine.ts` ≤ 300 LOC (pure functions)
- Andere Dateien: kein hartes Limit, aber sobald > 250 LOC → splitten

### 2.3 Datenfluss

```
HA hass.states  ─→  card.ts liest Sensor-Werte (via util/read-sensor.ts)
                ↓
          buildSystemState(config, hass)  →  SystemState
                ↓
          EnergyEngine.compute(SystemState)  →  FlowResult
                ↓
          Layout.compute(config, viewBox)  →  LayoutResult  [memoized]
                ↓
          FlowRenderer.render(FlowResult, LayoutResult, theme)  →  SVG
```

`buildSystemState` ist die **einzige** Stelle, an der HA-Sensor-Strings auf
typisierte Engine-Werte gemappt werden. Die Pairing-Konvertierung
`config.battery[].charged_by` → `SystemState.battery[].pairedPvId` und die
Unit-Konvertierung (W/kW/mW → W) passieren hier. Sensor-Lesen erfolgt zentral
über `util/read-sensor.ts` (siehe §2.7).

### 2.4 Schicht-Abgrenzungen (Hard-Constraint, lint-enforced)

| Modul       | darf importieren aus                                              | darf NICHT importieren aus                       |
| ----------- | ----------------------------------------------------------------- | ------------------------------------------------ |
| `engine/*`  | (nur eigene Files + `engine/types.ts` + `util/memo`)              | `lit`, `ha/*`, `render/*`, `config/*`, DOM       |
| `render/*`  | (eigene + Lit + `util/*` + `engine/types.ts` + `i18n/*`)          | `ha/*`, `engine/*`-Logik                         |
| `config/*`  | (eigene + `util/*` + `engine/types.ts` + `i18n/*`)                | `lit`, `render/*`, `engine/*`-Logik              |
| `util/*`    | (nur eigene + Lit-frei für `format-power`/`resolve-color`/`memo`) | `ha/*`, `render/*`, `engine/*`, `config/*`       |
| `i18n/*`    | (nichts)                                                          | alles andere                                     |
| `ha/*`      | Lit, externe HA-Typen                                             | `engine/*`, `render/*`, `config/*` (außer Typen) |
| `card.ts`   | alle Schichten                                                    | — (Komposition erlaubt)                          |
| `editor.ts` | `config/*`, `ha/*`, `util/*`, `i18n/*`, Lit                       | `engine/*`, `render/*`                           |

Diese Regeln werden via `eslint-plugin-import/no-restricted-paths` durchgesetzt
(siehe §11.4). Verstöße brechen den CI-Build.

### 2.5 TypeScript-Typen-Skelett

Die folgenden Interfaces sind **verbindlich** als API-Vertrag zwischen den Schichten.
Konkrete Implementierung kann Felder ergänzen, aber nicht entfernen oder umbenennen.

```typescript
// === src/config/types.ts ===
export interface Config {
  type: 'custom:custom-energy-flow-card';
  version?: 1; // reserviert für v2-Migrationen; default 1
  title?: string;
  solar: SolarConfig[];
  battery: BatteryConfig[];
  grid: GridConfig;
  home?: HomeConfig;
  consumers: ConsumerConfig[];
  display?: DisplayConfig;
}

export interface SolarConfig {
  id: string; // unique within solar[]
  name?: string;
  power: string; // sensor entity_id (W, kW, mW — wird von read-sensor konvertiert)
  icon?: string; // 'mdi:…'
}

export interface BatteryConfig {
  id: string; // unique within battery[]
  name?: string;
  soc: string; // sensor entity_id (%, 0–100)
  power: string; // sensor entity_id (signed: + laden, − entladen)
  power_invert?: boolean;
  charged_by: string; // muss eine SolarConfig.id sein
  icon?: string;
}

export type GridConfig =
  | { power: string; power_invert?: boolean }
  | { import: string; export: string };

export interface HomeConfig {
  name?: string;
  power?: string; // optional Override-Entity; sonst per Bilanz
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
}

export interface AnimationConfig {
  base_duration_s?: number;
  reference_power_w?: number;
  min_duration_s?: number;
  max_dots_per_path?: number;
}

export type ColorRole = 'solar' | 'battery' | 'grid_import' | 'grid_export' | 'home' | 'consumer';

// === src/engine/types.ts ===
export interface SystemState {
  pv: PvState[];
  battery: BatteryState[];
  grid: GridState;
  consumer: ConsumerState[];
  home: { powerOverrideW?: number };
}

export interface PvState {
  id: string;
  powerW: number; // ≥ 0 (gecclamped wenn Sensor negativ)
}

export interface BatteryState {
  id: string;
  pairedPvId: string; // == SolarConfig.id (mapping aus charged_by)
  powerW: number; // signed: + laden, − entladen
  socPct: number; // 0..100
}

export interface GridState {
  powerW: number; // signed: + Bezug, − Einspeisung
}

export interface ConsumerState {
  id: string;
  powerW: number;
}

export interface FlowResult {
  homeW: number;
  flows: {
    pvToHome: PerSourceFlow[];
    pvToBattery: PerSourceFlow[];
    pvToGrid: PerSourceFlow[];
    batteryToHome: PerSourceFlow[];
    batteryToGrid: PerSourceFlow[];
    gridToHome: number;
    homeToConsumer: PerSourceFlow[];
  };
  homeAttribution: HomeAttribution;
  pairingDeficit: { batteryId: string; deficitW: number }[];
  warnings: EngineWarning[];
}

export interface PerSourceFlow {
  sourceId: string;
  powerW: number;
}

export interface HomeAttribution {
  shares: { sourceKind: 'pv' | 'battery' | 'grid'; sourceId?: string; share: number }[];
}

export interface EngineWarning {
  code:
    | 'NEGATIVE_PV'
    | 'PAIRING_DEFICIT'
    | 'BALANCE_DRIFT'
    | 'EXPORT_INCONSISTENT'
    | 'SENSOR_UNAVAILABLE'
    | 'UNIT_UNKNOWN';
  detail: string;
  magnitudeW?: number;
  entityId?: string;
}
```

**Naming-Mapping** (Config ↔ State, in `buildSystemState`):

| Config (snake_case, YAML-friendly)         | State (camelCase, TS-idiomatisch)                           |
| ------------------------------------------ | ----------------------------------------------------------- |
| `battery[].charged_by`                     | `battery[].pairedPvId`                                      |
| `battery[].power_invert`                   | (intern angewandt; State enthält finale signierte `powerW`) |
| `grid.power` / `grid.import`+`grid.export` | `grid.powerW` (immer normalisiert auf signed)               |
| `home.power`                               | `home.powerOverrideW` (Sensor-Wert in W)                    |

### 2.6 Tool-Konfigurationen (Templates)

**`tsconfig.json`:**

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
    "rootDir": "src"
  },
  "include": ["src/**/*"],
  "exclude": ["**/*.test.ts"]
}
```

**`rollup.config.mjs`:**

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
    isAnalyze && visualizer({ filename: 'dist/bundle-stats.html' }),
  ].filter(Boolean),
};
```

**`vitest.config.ts`** (zwei Environments — node für Engine/Config/Util, happy-dom für Editor/Render-DOM):

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

**`.husky/pre-commit`:**

```bash
#!/usr/bin/env sh
. "$(dirname -- "$0")/_/husky.sh"
pnpm lint-staged
```

**`.lintstagedrc.json`:**

```json
{
  "*.ts": ["pnpm prettier --write", "pnpm eslint --fix"],
  "*.{json,md,yaml,yml}": ["pnpm prettier --write"]
}
```

**`.eslintrc.cjs`** — siehe §11.4 für die Boundary-Regeln.

### 2.7 Shared Utilities (Pflicht-Single-Source)

Logik, die mehrfach gebraucht wird, lebt **ausschließlich** in `src/util/*`.
Alle anderen Module rufen diese Helfer auf — keine Duplikate.

#### 2.7.1 `util/format-power.ts`

```typescript
export interface FormatOpts {
  format?: 'standard' | 'grouped'; // grouped = Tausender-Trennzeichen (1 900 W)
  signed?: boolean; // explizites + bei positiven Werten (für Netz)
  locale?: string; // default: navigator.language
}

export function formatPowerW(value: number, opts?: FormatOpts): string;
```

Verwendet von: Renderer (Knoten-Werte), Editor-Preview, Sandbox.

Tests: positive/negative/zero, Tausendertrennung, signiert vs unsigniert,
verschiedene Locales (de-DE, en-US).

#### 2.7.2 `util/resolve-color.ts`

```typescript
export function resolveColor(
  role: ColorRole,
  configOverrides?: Partial<Record<ColorRole, string>>,
): string;
```

Liefert eine CSS-Farbe (Hex oder CSS-var-Referenz). Default-Tabelle aus §5.6,
überschreibbar via `display.colors` aus der Config.

Verwendet von: Renderer, Sandbox.

#### 2.7.3 `util/read-sensor.ts`

Der zentrale Sensor-Reader mit Unit-Konvertierung und Robustheit gegen
fehlende/unbekannte States.

```typescript
export interface SensorReadOpts {
  invertSign?: boolean;
  treatUnavailableAsZero?: boolean; // default: true
  expectedUnit?: 'W' | '%'; // bei % keine Konvertierung
}

export interface SensorReadResult {
  value: number; // immer in W (für expectedUnit='W') oder %
  warning?: EngineWarning;
}

export function readSensorW(
  hass: HomeAssistant,
  entityId: string,
  opts?: SensorReadOpts,
): SensorReadResult;
```

Logik:

1. `hass.states[entityId]` lookup. Fehlt → `value=0`, `warning(SENSOR_UNAVAILABLE)`.
2. State `'unavailable'` / `'unknown'` / `''` → `value=0`, `warning(SENSOR_UNAVAILABLE)`.
3. Numeric parse via `Number()`. NaN → `value=0`, `warning(SENSOR_UNAVAILABLE)`.
4. Unit aus `attributes.unit_of_measurement`. Konvertierung:

| Unit                   | Faktor zu W                                              |
| ---------------------- | -------------------------------------------------------- |
| `W`, `Watt`, `watt`    | 1                                                        |
| `kW`, `kilowatt`       | 1000                                                     |
| `mW`, `milliwatt`      | 0.001                                                    |
| `VA`                   | 1 (qualitativ akzeptabel; warning falls strikt benötigt) |
| (leer, kein attribute) | 1 (annehmen W)                                           |
| anderer Wert           | 1 + `warning(UNIT_UNKNOWN)`                              |

5. Sign-Invertierung wenn `opts.invertSign === true`.

Verwendet von: `config/schema.ts.buildSystemState`, Editor-Live-Preview.

Tests: alle Edge-Cases der Logik.

#### 2.7.4 `util/svg-path.ts`

```typescript
export interface Point {
  x: number;
  y: number;
}

export function bezierPath(from: Point, to: Point, control: Point): string;
export function straightPath(from: Point, to: Point): string;
```

Liefert d-Attribut-Strings (`'M x y Q cx cy x y'`). Reine Geometrie.

Verwendet von: `render/layout.ts`.

#### 2.7.5 `util/memo.ts`

```typescript
export function memoize<Args extends unknown[], R>(
  fn: (...args: Args) => R,
  keyFn: (...args: Args) => string,
): (...args: Args) => R;
```

Einfache String-Key-basierte Memoization. Cache hält letzte ~10 Einträge
(LRU). Verwendet von:

- Layout-Compute (Key: Config-Hash + viewBox)
- Engine-Compute (Key: SystemState-Hash) — nur wenn Profiling Hotspot zeigt;
  default: nicht memoizen, da Compute < 1 ms.

## 3. Konfigurations-Schema (YAML)

### 3.1 Beispiel-Config

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
    power: sensor.akku_dach_power # signiert: + laden, − entladen
    power_invert: false
    charged_by: dach # muss eine solar[].id sein

  - id: balkon
    name: Balkon-Speicher
    soc: sensor.akku_balkon_soc
    power: sensor.akku_balkon_power
    charged_by: balkon

grid:
  power: sensor.grid_power # signiert: + Bezug, − Einspeisung
  power_invert: false
  # Alternativ:
  # import: sensor.grid_import
  # export: sensor.grid_export

home:
  name: Hausverbrauch
  # power: sensor.home_total_power    # optional Override-Entity; sonst per Bilanz

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
  number_format: grouped # standard | grouped
  show_inactive_paths: false
  animation:
    base_duration_s: 2.5
    reference_power_w: 1000
    min_duration_s: 0.6
    max_dots_per_path: 4
```

### 3.2 Schema-Regeln (Validierung in `config/schema.ts`)

**Schema-Version:**

- `version` ist optional, default `1`. Kein anderer Wert in v1.0 erlaubt — sonst
  validation-error mit Hinweis auf zukünftige Versionen.

**ID-Namespacing:**

- `solar[].id` müssen _innerhalb von_ `solar` eindeutig sein
- `battery[].id` müssen _innerhalb von_ `battery` eindeutig sein
- IDs _zwischen_ Listen dürfen kollidieren (z. B. `solar.id="dach"` und
  `battery.id="dach"` sind beide erlaubt)

**Pairing-Kardinalität: strikt 1:1.**

- Jede `BatteryConfig.charged_by` muss auf eine existierende `SolarConfig.id` zeigen
- Eine PV darf höchstens einer Battery gepairt sein (kein 1:N)
- Eine PV ohne gepairten Akku ist erlaubt
- Ein Akku ohne `charged_by` ist nicht erlaubt

**Grid:**

- `grid.power` (signiert) **xor** `grid.import`+`grid.export` (zwei separate Sensoren)
- `grid` ist immer Pflicht

**Akku-Power-Sensor (ADR-0015, seit v0.9.1):**

- `battery[].power` (signiert: + laden, − entladen; optional `power_invert`)
  **xor** `battery[].charge_power`+`battery[].discharge_power` (zwei separate
  Sensoren, beide ≥ 0)
- Exklusivität wird im Validator erzwungen — weder beides noch keines
- Bei split: `buildSystemState` aggregiert intern zu `signedPowerW =
read(charge_power) − read(discharge_power)`. Engine sieht weiterhin nur
  einen signierten `powerW`-Wert.

**Mindest-Konfiguration:**

- Mindestens eine der drei Listen `solar` / `battery` / `consumers` muss
  nicht-leer sein

**Sensor-Referenzen:**

- Format `domain.object_id` syntaktisch geprüft im Editor-Validator
- Existenz im `hass.states` zur Laufzeit über `util/read-sensor.ts`:
  fehlt → `value=0` + `warning(SENSOR_UNAVAILABLE)`; Card zeigt `—`, crasht nicht
- Im Editor: yellow inline warning wenn Entity in `hass.states` nicht existiert
  (kein Save-Block, da hass.states schon mal kurz unvollständig sein kann)

**Sensor-Unit:**

- Alle Power-Sensoren werden über `util/read-sensor.ts` gelesen, der die in
  §2.7.3 dokumentierten Unit-Konvertierungen anwendet
- Card-interne Berechnung läuft immer in W; Anzeige in W
- Unbekannte Units → `warning(UNIT_UNKNOWN)`, Wert wird unverändert genutzt
  (Annahme: bereits in W)

**Default-Icons:**

| Knoten      | MDI-Icon                 |
| ----------- | ------------------------ |
| PV          | `mdi:solar-power`        |
| Akku        | `mdi:battery`            |
| Netz        | `mdi:transmission-tower` |
| Haus        | `mdi:home`               |
| Verbraucher | `mdi:power-plug`         |

**`power_invert` für PV:** Nicht in v1.0. PV-Sensoren liefern in der Praxis ≥ 0;
Sensor-Glitches mit negativem Wert werden auf 0 geclampt + `warning(NEGATIVE_PV)`.

### 3.3 Editor-UX

Akkordeon mit klappbaren Sektionen. Die Listen-Sektionen (Solar, Akkus,
Verbraucher) sind **kein** ha-form-Schema — siehe §6.4.1 für die Begründung
und §6.4 für die volle Editor-Spezifikation.

1. **Allgemein** — `title`, `display.show_inactive_paths`, `display.number_format`
2. **Solar** — Liste mit „+ PV hinzufügen", Drag-to-reorder, Löschen
3. **Akkus** — Liste mit „+ Akku hinzufügen", inkl. Pairing-Dropdown
4. **Netz** — Toggle „1 signierter Sensor / 2 Sensoren"
5. **Verbraucher** — Liste mit „+ Verbraucher hinzufügen"
6. **Anzeige** (advanced, default zugeklappt) — `display.animation.*`, optional
   `display.colors`

## 4. Energiebilanz-Algorithmus

Die Engine bekommt einen `SystemState` und liefert ein `FlowResult` mit allen
Pfadleistungen + Hausverbrauch. **Pure functions, keine Klassen, kein Lit, kein HA.**

### 4.1 Eingabe / Ausgabe

Verbindliche Schnittstelle: siehe `SystemState` und `FlowResult` in §2.5.

### 4.2 Schritt 1 — Decomposition

```
charge[j]    = max(0,  battery[j].powerW)
discharge[j] = max(0, -battery[j].powerW)
import       = max(0,  grid.powerW)
export       = max(0, -grid.powerW)
```

### 4.3 Schritt 2 — Hausverbrauch

```
P_home_calculated = Σ pv[i].powerW
                  + Σ discharge[j]
                  + import
                  − Σ charge[j]
                  − export

P_home = home.powerOverrideW ?? max(0, P_home_calculated)
```

Wenn `P_home_calculated < 0`: warning `BALANCE_DRIFT`, P_home auf 0 geclampt.

### 4.4 Schritt 3 — Pairing: PV → Akku

```
für jede Battery j mit charge[j] > 0:
  i = pairedPvId(j)
  P_pv→batt[i] = min(pv[i].powerW, charge[j])
  P_pv_remaining[i] = pv[i].powerW − P_pv→batt[i]

  pairing_deficit_j = charge[j] − P_pv→batt[i]
  falls pairing_deficit_j > 0.5:
    pairingDeficit.push({ batteryId: j, deficitW: pairing_deficit_j })
    flows.gridToBattery.push({ sourceId: j, powerW: pairing_deficit_j })  // sichtbarer Pfad
    warning(PAIRING_DEFICIT, batteryId = j, magnitudeW = pairing_deficit_j)

für PVs ohne gepairte Battery:
  P_pv_remaining[i] = pv[i].powerW
```

`flows.gridToBattery[]` wird in §5.2 als sichtbarer Pfad gerendert, sodass
auch Akku-Ladung aus dem Netz transparent bleibt.

### 4.5 Schritt 4 — Quellen → Haus (Priorität: PV → Akku → Netz)

```
total_pv_to_home   = min(P_home, Σ P_pv_remaining[i])
remaining_demand   = P_home − total_pv_to_home

total_batt_to_home = min(remaining_demand, Σ discharge[j])
remaining_demand   −= total_batt_to_home

P_grid_to_home_calc = max(0, remaining_demand)
```

### 4.6 Schritt 5 — Excess → Netzeinspeisung (vorläufig)

```
total_pv_to_grid   = Σ P_pv_remaining[i] − total_pv_to_home
total_batt_to_grid = Σ discharge[j]      − total_batt_to_home
```

### 4.7 Schritt 6 — Per-Quelle proportional aufteilen

```
falls Σ P_pv_remaining > 0:
  P_pv→home[i] = P_pv_remaining[i] / Σ P_pv_remaining * total_pv_to_home
  P_pv→grid[i] = P_pv_remaining[i] / Σ P_pv_remaining * total_pv_to_grid
sonst alle = 0

falls Σ discharge > 0:
  P_batt→home[j] = discharge[j] / Σ discharge * total_batt_to_home
  P_batt→grid[j] = discharge[j] / Σ discharge * total_batt_to_grid
sonst alle = 0
```

### 4.8 Schritt 7 — Reconcile mit Netz-Sensor

**A) Einspeisung:**

```
calc_export = total_pv_to_grid + total_batt_to_grid

Fall 1 — calc_export > 0 und export > 0:
  scale = clamp(export / calc_export, 0, 2)
  P_pv→grid[i]   *= scale
  P_batt→grid[j] *= scale
  falls scale < 0.95 oder scale > 1.05:
    warning(EXPORT_INCONSISTENT, magnitudeW = |calc_export − export|)

Fall 2 — calc_export == 0 und export > 0:
  alle P_*→grid bleiben 0
  warning(EXPORT_INCONSISTENT, detail = 'untracked_export', magnitudeW = export)

Fall 3 — calc_export > 0 und export == 0:
  alle P_*→grid auf 0
  warning(EXPORT_INCONSISTENT, detail = 'phantom_export', magnitudeW = calc_export)

Fall 4 — calc_export == 0 und export == 0: nichts zu tun.
```

**B) Netzbezug:**

```
P_grid_to_home = import   // Sensor authoritativ

Sanity-Check:
  total_to_home = total_pv_to_home + total_batt_to_home + P_grid_to_home
  drift = total_to_home − P_home
  falls |drift| > max(1 W, P_home * 0.05):
    warning(BALANCE_DRIFT, magnitudeW = |drift|)
```

### 4.9 Schritt 8 — Haus → Verbraucher

```
P_home→consumer[k] = consumer[k].powerW

// "Sonstige" implizit: P_home − Σ consumer[k].powerW
// Falls < 0: warning(BALANCE_DRIFT)
```

### 4.10 Anteils-Ring (Doughnut)

```
falls P_home > 0:
  share_pv[i]   = P_pv→home[i]   / P_home
  share_batt[j] = P_batt→home[j] / P_home
  share_grid    = P_grid_to_home / P_home
sonst:
  alle shares = 0

// Renderer normiert finale shares auf Σ = 1 vor dem Zeichnen
// (kompensiert minimale Reconcile-Drift)
```

### 4.11 Engine-Edge-Cases (Pflicht-Tests)

| #   | Szenario                                       | Erwartung                                              |
| --- | ---------------------------------------------- | ------------------------------------------------------ |
| 1   | Alle Werte 0                                   | Alle Flows 0; P_home 0; ring leer; keine warnings      |
| 2   | Sonniger Tag, Akkus laden, Überschuss ins Netz | PV→Akku/Haus/Netz aktiv; Akku→… inaktiv                |
| 3   | Abend, Akkus speisen Haus + Netz               | Akku→Haus/Netz aktiv; PV inaktiv                       |
| 4   | Nacht, Netzbezug                               | Nur Netz→Haus, Haus→Verbraucher                        |
| 5   | Pairing-Defizit (Akku lädt 500 W, PV 200 W)    | `pairingDeficit[j]=300`, warning(PAIRING_DEFICIT, 300) |
| 6   | `home.powerOverrideW` gesetzt                  | P_home = override, Bilanz übersprungen                 |
| 7   | Negative PV-Werte                              | Auf 0 geclampt, warning(NEGATIVE_PV)                   |
| 8   | Reconcile Fall 1                               | Skalierung greift, ggf. warning(EXPORT_INCONSISTENT)   |
| 9   | Reconcile Fall 2 (untracked_export)            | Alle export-Flows 0, warning                           |
| 10  | Reconcile Fall 3 (phantom_export)              | Alle export-Flows 0, warning                           |
| 11  | Keine PV in Config                             | PV-Sektion leer, alle PV-Flows 0                       |
| 12  | Keine Akkus in Config                          | Akku-Sektion leer, alle Akku-Flows 0                   |
| 13  | PV ohne gepairten Akku                         | P_pv_remaining = volle PV-Leistung                     |
| 14  | `Σ Verbraucher > P_home`                       | warning(BALANCE_DRIFT)                                 |
| 15  | P_home_calculated < 0                          | P_home = 0, warning(BALANCE_DRIFT)                     |
| 16  | 5 PV + 5 Akkus (Stress-Test)                   | Performance < 1 ms; alle Flows korrekt                 |

## 5. Rendering & Animation

### 5.1 Layout-Engine

Logisches Grid mit fixen Zonen:

```
                 [Solar oben]
[Netz links]    [    Haus    ]    [Verbraucher rechts]
                 [Speicher unten]
```

- **Solar oben:** N PV-Kreise horizontal verteilt, zentriert über dem Haus
- **Speicher unten:** M Akku-Kreise horizontal verteilt, **gleiche x-Achse wie
  ihre gepairte PV** (visuelle Pairing-Ankerung)
- **Verbraucher rechts:** vertikal gestapelt
- **Netz links** und **Haus mittig** auf fester Position

SVG-Viewport responsiv: `viewBox="0 0 720 540"`,
`preserveAspectRatio="xMidYMid meet"`. Card skaliert in jeder Lovelace-Spalte
und in jeder Container-Breite — vom Phone bis zum 4K-Dashboard. Keine
spezielle Mobile-Branchen-Logik nötig (SVG skaliert linear).

**Layout-Cache:** `Layout.compute(config, viewBox)` ist via `util/memo` mit
einem Hash über Config + viewBox-Dimensionen memoisiert. Re-Compute nur bei
Config-Änderung oder Container-Resize (siehe §5.7).

**Mindestbreite:** Container < 280 px → Card rendert, aber zeigt zusätzlich
ein dezentes „Beste Darstellung ab 320 px"-Hinweis-Banner. Kein Layout-Switch
auf Mobile — wir akzeptieren kleinere Knoten-Texte.

### 5.2 Pfad-Routing

| Quelle → Ziel                                    | Routing                                                                                   |
| ------------------------------------------------ | ----------------------------------------------------------------------------------------- |
| Solar i → Akku paired_batt(i)                    | Vertikale Bahn (Bogen)                                                                    |
| Solar i → Haus                                   | Bogen Richtung Mitte                                                                      |
| Solar i → Netz                                   | Bogen über die linke Seite                                                                |
| Akku j → Haus                                    | Bogen nach oben Richtung Mitte                                                            |
| Akku j → Netz                                    | Bogen unter dem Haus durch nach links                                                     |
| Netz → Haus                                      | Gerade horizontal                                                                         |
| **Netz → Akku j** (Pairing-Defizit, ADR-0007 v2) | Bogen unter dem Haus durch nach unten zur Battery — gespiegeltes Routing zu Akku j → Netz |
| Haus → Verbraucher k                             | Gerade horizontal nach rechts                                                             |

SVG quadratic-Bezier-Kurven über `util/svg-path.ts.bezierPath()`. Pfade werden
bei Layout-Berechnung erzeugt und gecacht.

### 5.3 Knoten-Rendering & Accessibility

Jeder Knoten = SVG-`<g>` mit a11y-Attributen:

```html
<g
  transform="translate(x y)"
  class="node node--solar"
  part="node node-solar"
  role="button"
  tabindex="0"
  aria-label="Solar Dach: 2000 Watt"
  @click="${this._onNodeClick(entityId)}"
  @keydown="${this._onNodeKeydown(entityId)}"
>
  <text class="node-name" y="-58">Solar Dach</text>
  <circle r="42" fill="var(--ha-card-background)" stroke="var(--c-solar)" stroke-width="2.5" />
  <text class="node-icon" y="-4">☀️</text>
  <text class="node-value" y="16">2 000</text>
  <text class="node-unit" y="28">W</text>
</g>
```

**Bezeichner-Position pro Zone:**

| Zone                 | Label-Position              |
| -------------------- | --------------------------- |
| Solar (oben)         | oberhalb des Kreises        |
| Akku (unten)         | unterhalb des Kreises       |
| Netz (links)         | oberhalb des Kreises        |
| Verbraucher (rechts) | oberhalb des Kreises        |
| Haus (mittig)        | unterhalb des Anteils-Rings |

**Tab-Order:** Solar links→rechts, Netz, Akku links→rechts, Verbraucher
oben→unten, Haus.

**Keyboard:** Enter / Space → `more-info`-Dialog (gleicher Code-Pfad wie
Click).

**aria-label** baut sich aus Name + formatiertem Wert + Einheit zusammen
(siehe `i18n/de.ts`-Strings, §2.2).

**Hover-Feedback:** `cursor: pointer` + `stroke-width` von 2.5 auf 3.5 bei
`:hover` und `:focus-visible`. Subtil, keine Layout-Verschiebung.

**Icon-Rendering:** für v1.x **MDI-Icons via `<ha-icon>` in `<foreignObject>`**
(HA-globales Custom Element, deckt User-konfigurierte und Area-Icons dynamisch
ab). Implementation in `src/render/icon.ts` als Single-Source. Strategie-Wahl
und Begründung siehe [ADR-0020](../adr/0020-ha-icon-via-foreignobject.md).
Inline-`<path>`-Map (`mdi-paths.ts`) wurde verworfen — Begründung in ADR-0020.

**Color-Blindness:** die 6 Akzentfarben sind so gewählt, dass auch bei
Deuteranopia/Protanopia genug Kontrast bleibt. Validierung beim Renderer-Review:
Stichprobe mit Chrome DevTools → Rendering → Emulate Vision Deficiencies.

### 5.4 Anteils-Ring (Haus)

Konzentrische `<circle>` mit `stroke-dasharray`. Pro Quelle ein Segment,
`stroke-dashoffset` summiert sich. Update nur bei `FlowResult`-Änderung.
Renderer normiert die Summe der `share`-Werte auf 1.0 (kompensiert
Reconcile-Drift).

### 5.5 Flow-Animation (CSS-basiert mit `offset-path`)

Pro Pfad mit Leistung > `display.active_threshold_w` werden Punkte als
`<circle>`-Elemente gerendert, deren Bewegung durch CSS `offset-path` /
`offset-distance` definiert ist. Bewusste Wahl gegen SVG `<animateMotion>`,
weil dort `dur` ein XML-Attribut ist und nicht via CSS-Variablen aktualisiert
werden kann (siehe §5.7).

```html
<g
  class="flow flow--pv-to-home"
  style="
  --path: path('M 170 110 Q 220 200 340 240');
  --dur: 2s;
  --flow-color: #f59e0b;
"
>
  <path class="flow-line animated" d="M 170 110 Q 220 200 340 240" />
  <circle class="flow-dot" style="animation-delay: 0s" />
  <circle class="flow-dot" style="animation-delay: 0.66s" />
  <circle class="flow-dot" style="animation-delay: 1.33s" />
</g>
```

```css
.flow-dot {
  offset-path: var(--path);
  offset-distance: 0%;
  animation: flow-dot-move var(--dur) linear infinite;
  fill: var(--flow-color);
}
@keyframes flow-dot-move {
  to {
    offset-distance: 100%;
  }
}

.flow-line.animated {
  stroke-dasharray: 4 6;
  animation: flow-line-stream var(--dur) linear infinite;
}
@keyframes flow-line-stream {
  to {
    stroke-dashoffset: -40;
  }
}
```

**Mapping Leistung → Animations-Parameter:**

```
duration_s = base_duration_s × (reference_power_w / power_w)
   clamped to [min_duration_s, base_duration_s × 4]

dot_count = ceil(power_w / reference_power_w × 2)
   clamped to [1, max_dots_per_path]
```

**Inaktive Pfade** (≤ Threshold) — `display:none` auf dem Wrapper-`<g>` (entfernt
auch die Punkte aus dem Render-Tree, keine CPU-Last).

### 5.6 Theme-Mapping

HA-CSS-Variablen für neutrale Farben:

| Element          | Variable                                                         |
| ---------------- | ---------------------------------------------------------------- |
| Card-Hintergrund | `var(--ha-card-background, var(--card-background-color, white))` |
| Text primär      | `var(--primary-text-color)`                                      |
| Text sekundär    | `var(--secondary-text-color)`                                    |
| Border / Divider | `var(--divider-color)`                                           |
| Card-Padding     | `var(--ha-card-padding, 16px)`                                   |

Semantische Akzentfarben aus `util/resolve-color.ts`:

| Bedeutung       | Farbe                   |
| --------------- | ----------------------- |
| Solar           | `#f59e0b` (gelb-orange) |
| Akku → Haus     | `#10b981` (grün)        |
| Netzbezug (+)   | `#6b7280` (grau)        |
| Einspeisung (−) | `#16a34a` (sattes grün) |
| Haus            | `#ef4444` (rot)         |
| Verbraucher     | `#db2777` (pink)        |

Über `display.colors` in der Config überschreibbar.

### 5.7 Update-Strategie & Lit-Lifecycle

**Lit-Lifecycle-Verteilung** ist nicht-verhandelbar:

| Lifecycle                       | Zweck                            | Erlaubt                                                     |
| ------------------------------- | -------------------------------- | ----------------------------------------------------------- |
| `setConfig(config)`             | HA-Lifecycle, Config-Validierung | Validierung, Throw bei Invalid, `this.config` setzen        |
| `firstUpdated()`                | einmalige Setup-Logik            | ResizeObserver registrieren, initiales Layout-Compute       |
| `willUpdate(changedProperties)` | reactive Recompute               | `buildSystemState`, `EnergyEngine.compute`, FlowResult-Diff |
| `render()`                      | Lit-Template ausgeben            | **NUR** `html`…`` — keine Berechnung, kein Side-Effect      |
| `disconnectedCallback()`        | Aufräumen                        | ResizeObserver disconnect, Listener entfernen               |

**`hass`-Property mit Custom-Update-Filter via `shouldUpdate`:**

```typescript
@property({ attribute: false }) hass?: HomeAssistant;

protected override shouldUpdate(changed: PropertyValues): boolean {
  if (changed.size === 1 && changed.has('hass') && this._config) {
    const prev = changed.get('hass') as HomeAssistant | undefined;
    if (!hassRelevantSensorsChanged(prev, this.hass, this._config)) return false;
  }
  return true;
}
```

`hassRelevantSensorsChanged` vergleicht ausschließlich die in `this._config`
referenzierten Sensor-IDs auf Wert-Änderung. Ohne diesen Filter würde
Lit auf jedes globale `hass`-Update reagieren — Performance-Killer.

> **Warum nicht `@property({ hasChanged })`?** Lit's `hasChanged`-Callback
> wird ohne `this`-Bindung aufgerufen — es kann nicht `this._config` lesen,
> um zu entscheiden, welche Sensoren relevant sind. `shouldUpdate` läuft
> dagegen auf der Element-Instanz und hat vollen Zugriff.

**Memoization-Strategie:**

| Compute                                  | Cache-Key                       | Invalidiert bei                 |
| ---------------------------------------- | ------------------------------- | ------------------------------- |
| Layout (Knoten-Positionen, Pfad-Strings) | `hash(config) + viewBox-Größe`  | Config-Change, Container-Resize |
| Engine (FlowResult)                      | nicht memoized (Compute < 1 ms) | jedes hass-relevant-Update      |
| Resolved Colors                          | Config-Hash                     | Config-Change                   |

**Re-Render-Pfade:**

`willUpdate` rebuildet `FlowResult`; `render()` gibt das Lit-Template aus.
Lit's reactive Diff patcht nur die geänderten Attribute (insbesondere
`style="--dur: …"`-Strings auf `<g class="flow-dots">`). Dank ADR-0005
(`offset-path` als CSS-Property statt SVG-XML-Attribut) sind Animations-
Parameter überhaupt erst per CSS-Variable steuerbar.

**Verbindlich für v1.0:**

- Lit-Template ist die einzige Render-Quelle.
- `--dur`, `--flow-color`, `--dot-count` werden via Template-Interpolation
  aus dem CSS-Variable-Wert in `style="..."` geschrieben.
- Topologie-Änderungen (Pfad aktiv/inaktiv) → Lit-Template re-rendert
  betroffene `<g>` neu.

**Optionale v1.x-Optimierung (nicht für v1.0):**
Direktes `el.style.setProperty('--dur', …)` außerhalb von Lit's Render-Cycle
würde den Lit-Diff für `style`-Attribute komplett umgehen. Die Einsparung
liegt bei ~14 Pfaden im Mikrosekundenbereich pro `hass`-Update — das
rechtfertigt nicht den zusätzlichen Code (Lit `@queryAll`, eigener
`updated()`-Loop, manuelle Synchronisation außerhalb der Reactivity).
Falls bei vielen Pfaden (≥ 50) oder hoher Update-Frequenz (≥ 10/s) Profiling
einen Hotspot zeigt, kann diese Optimierung nachgereicht werden.

**ResizeObserver:**

```typescript
firstUpdated() {
  this._resizeObs = new ResizeObserver(() => {
    this._invalidateLayoutCache();
    this.requestUpdate();
  });
  this._resizeObs.observe(this);
}
disconnectedCallback() {
  super.disconnectedCallback();
  this._resizeObs?.disconnect();
}
```

### 5.8 Reduced Motion

`@media (prefers-reduced-motion: reduce)` schaltet `animation-duration` der
Punkte auf `0s` (Punkte erscheinen statisch am Pfad-Anfang) und reduziert die
Linien-Streaming-Animation auf eine subtile Pulsation (Opacity 0.6 → 1).

### 5.9 UX-Zustände

| Zustand                        | Trigger                                                       | Anzeige                                                                                                                         |
| ------------------------------ | ------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------- |
| **Loading**                    | `this.hass === undefined` (initial mount)                     | Skeleton: leerer Knoten-Layout, dezent gepulste Kreise, Mittel-Text „Lade …"                                                    |
| **Stub-Config**                | `this.config` ist `getStubConfig()`-Ergebnis (Editor-Preview) | Card rendert nur Netz↔Haus + freundlicher Hinweis: „Füge Solar, Akku oder Verbraucher hinzu, um das Energie-Diagramm zu sehen." |
| **Sensor unavailable**         | einzelne Sensoren liefern `unavailable`/`unknown`             | betroffener Knoten zeigt Wert `—`, Stroke gestrichelt, aria-label „Sensor nicht verfügbar"; Card insgesamt funktioniert weiter  |
| **Config invalid (YAML-Mode)** | `setConfig` wirft                                             | HA Lovelace zeigt sein Standard-Error-Banner (kein Card-eigener Render — wir werfen einfach mit lesbarer Message)               |
| **Engine-Warnings vorhanden**  | `FlowResult.warnings.length > 0`                              | siehe §5.12 (Diagnostik-UX)                                                                                                     |
| **Fully empty**                | sonniger Mitternacht-Edge-Case (alle Werte 0)                 | normale Card mit allen Knoten bei 0 W; alle Pfade `display:none`                                                                |
| **Hover**                      | Mouse-Over auf Knoten                                         | `cursor:pointer`, Stroke 2.5 → 3.5                                                                                              |
| **Focus**                      | Keyboard-Fokus auf Knoten                                     | `:focus-visible` mit dezentem Outer-Ring                                                                                        |

**Initial-Mount-Animation:** Card fadet von `opacity: 0` auf `1` über 200 ms ein.
Animation läuft 1×, dann reine reactive Updates.

### 5.10 Crash-Resilienz

Die Card darf **nie** den HA-Dashboard-Render brechen. Implementierungs-Pattern:

**`willUpdate` mit Try-Catch:**

```typescript
willUpdate(changed: PropertyValues): void {
  super.willUpdate(changed);
  try {
    if (changed.has('hass') || changed.has('config')) {
      this._systemState = buildSystemState(this.config, this.hass);
      this._flowResult = EnergyEngine.compute(this._systemState);
      this._renderError = undefined;
    }
  } catch (err) {
    this._renderError = err instanceof Error ? err.message : String(err);
    console.error('[custom-energy-flow-card] willUpdate error:', err);
    // letzten gültigen FlowResult behalten — degraded operation
  }
}
```

**`render` mit Fallback:**

```typescript
render() {
  if (this._renderError) {
    return html`<ha-card><div class="error-banner">
      Card-Fehler: ${this._renderError}
    </div></ha-card>`;
  }
  if (!this.hass) return html`<ha-card>${this._renderLoading()}</ha-card>`;
  if (!this._flowResult) return html`<ha-card>${this._renderLoading()}</ha-card>`;
  return html`<ha-card>${this._renderCard()}</ha-card>`;
}
```

**Keine ungefangenen Errors in der Engine:** Engine-Code wirft nicht bei
„Daten-Inkonsistenz" — er gibt `warnings` im FlowResult zurück. Werfen ist
nur bei Programmierfehlern erlaubt (z. B. ungültiger Pairing-Index).

**`setConfig` darf werfen** — HA fängt das ab und zeigt sein Standard-Error
im Editor.

### 5.11 Accessibility (a11y)

| Aspekt                  | Umsetzung                                                                                                                                                |
| ----------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Semantik**            | Knoten als `role="button"` mit `tabindex="0"`                                                                                                            |
| **aria-label**          | `<Knoten-Name>: <formatierter Wert> <Einheit>`, z. B. „Solar Dach: 2 000 Watt"                                                                           |
| **Tastatur-Navigation** | Tab durch alle Knoten in fester Reihenfolge (siehe §5.3); Enter/Space öffnet `more-info`                                                                 |
| **Reduced Motion**      | siehe §5.8                                                                                                                                               |
| **Color-Blindness**     | Akzentfarben sind nicht der einzige Bedeutungsträger — jeder Pfad hat zusätzlich Strich-Stil + Punktbewegungs-Richtung                                   |
| **Kontrast**            | Texte auf `var(--primary-text-color)`/`var(--secondary-text-color)`, automatisch theme-konform; Akzentfarben primär für Pfade, nicht für Text-Lesbarkeit |
| **Loading-State**       | Skeleton mit `aria-busy="true"`                                                                                                                          |
| **Error-State**         | Error-Banner mit `role="alert"`                                                                                                                          |

Verifikation in Phase 2: Card mit Tastatur durchsteppen, jeder Knoten
fokussierbar; Chrome DevTools → Rendering → Color-Vision-Deficiency-Emulation
für Stichproben.

### 5.12 Diagnostik-UX (Engine-Warnings)

`FlowResult.warnings` werden visuell zugänglich gemacht:

- Wenn `warnings.length > 0`: kleines `mdi:alert-circle-outline`-Icon in der
  rechten oberen Card-Ecke, Farbe `#eab308` (warning amber)
- Icon hat `tabindex="0"` und öffnet bei Klick/Enter ein leichtes
  Dropdown-Panel mit Liste der Warnings (Code, detail, magnitudeW)
- Dropdown nutzt Lit, nicht HA-Standard — bleibt im Card-Scope, keine
  Modal-Konflikte
- Jeder Warning-Eintrag wird zusätzlich `console.warn`-geloggt (für DevTools-User)
- Wenn kein Warning: Icon nicht gerendert (kein leerer Slot)

Im Editor (§6.4): bei vorhandenen Warnings dezenter Banner unter der
Form-Sektion mit derselben Liste.

### 5.13 Card-Mod-Kompatibilität

[`card-mod`](https://github.com/thomasloven/lovelace-card-mod) ist ein
verbreitetes HA-Tool zum Card-Styling. Da wir Lit Shadow-DOM nutzen, kann
card-mod nicht trivial mit `style:` durchstylen.

**Lösung:** zentrale Elemente bekommen `part`-Attribute, sodass card-mod via
`::part()` zugreifen kann:

| Element          | `part`-Wert                                                                 |
| ---------------- | --------------------------------------------------------------------------- |
| Card-Wrapper     | `card`                                                                      |
| Knoten allgemein | `node`                                                                      |
| Knoten-Typ       | `node-solar` / `node-battery` / `node-grid` / `node-home` / `node-consumer` |
| Knoten-Icon      | `node-icon` (foreignObject mit `<ha-icon>`, siehe ADR-0020)                 |
| Pfad allgemein   | `flow`                                                                      |
| Pfad-Typ         | `flow-pv-to-home` etc.                                                      |
| Anteils-Ring     | `home-ring`                                                                 |

Card-Mod-User können Icon-Farbe via `::part(node-icon) { color: … }` oder
Icon-spezifische CSS-Custom-Properties überschreiben.

README dokumentiert diese als „Erweiterte Anpassung". Volle Theming-Integration
(z. B. dynamische Farb-Themes) ist v2-Thema.

## 6. Card-Lifecycle & Editor

### 6.1 Card-Registrierung

`src/index.ts` enthält die einzige Top-Level-Side-Effect-Datei:

```typescript
import { CARD_VERSION, CARD_TYPE, CARD_NAME } from './const';
import { CustomEnergyFlowCard } from './card';
import { CustomEnergyFlowCardEditor } from './editor';

customElements.define(CARD_TYPE, CustomEnergyFlowCard);
customElements.define(`${CARD_TYPE}-editor`, CustomEnergyFlowCardEditor);

console.info(
  `%c CUSTOM-ENERGY-FLOW-CARD %c ${CARD_VERSION} `,
  'color: white; background: #f59e0b; padding: 2px 6px; border-radius: 3px;',
  'color: #f59e0b; background: transparent; padding: 2px 6px;',
);

(window as unknown as { customCards?: unknown[] }).customCards =
  (window as unknown as { customCards?: unknown[] }).customCards ?? [];
(window as unknown as { customCards: unknown[] }).customCards.push({
  type: CARD_TYPE,
  name: CARD_NAME,
  description:
    'Multi-Source Energie-Flow-Visualisierung mit beliebig vielen PVs, Akkus und Verbrauchern',
  preview: true,
  documentationURL: 'https://github.com/<owner>/custom-energy-flow-card',
});
```

`const.ts`:

```typescript
export const CARD_VERSION = '1.0.0';
export const CARD_TYPE = 'custom-energy-flow-card';
export const CARD_NAME = 'Custom Energy Flow Card';
```

### 6.2 HA-Card-Lifecycle (verbindlich)

Die `CustomEnergyFlowCard`-LitElement-Klasse implementiert folgende
HA-Konventions-Methoden:

```typescript
class CustomEnergyFlowCard extends LitElement {
  // HA-Lifecycle: vom Frontend bei Config-Änderung gerufen
  setConfig(config: unknown): void {
    const validated = validateConfig(config); // wirft bei invalid
    this.config = validated;
  }

  // Static: Editor-Element für Lovelace
  static getConfigElement(): HTMLElement {
    return document.createElement(`${CARD_TYPE}-editor`);
  }

  // Static: Default-Config beim Hinzufügen via UI
  static getStubConfig(_hass: HomeAssistant, _entities: string[]): Partial<Config> {
    return {
      type: 'custom:custom-energy-flow-card',
      grid: { power: '' },
      solar: [],
      battery: [],
      consumers: [],
    };
  }

  // HA-Layout-Hint: 1 = klein, 4+ = groß. Diese Card ist groß.
  getCardSize(): number {
    return 6;
  }
}
```

**Stub-Config-Behavior:** Wenn `setConfig` mit der Stub-Config gerufen wird
(leere Listen, leerer Grid-Sensor), validiert die Card erfolgreich und
rendert den UX-Zustand „Stub-Config" aus §5.9 — keine Crashes, freundlicher
Hinweis-Text.

### 6.3 Editor — Übersicht

Editor-Element ist ein eigenes `LitElement` in `src/editor.ts`. Architektur-
Prinzip: **nur** Form-Logik, keine Engine-/Renderer-Imports (siehe §2.4).

### 6.4 Editor — Form-Struktur

#### 6.4.1 Listen-UI manuell mit Lit

`<ha-form>` unterstützt Listen mit „+Add"-UI nicht zuverlässig. Daher wird
die Listen-Logik (Solar/Akkus/Verbraucher mit add/remove/reorder) **manuell
mit Lit** implementiert; pro Listen-Eintrag wird intern ein `<ha-form>` mit
einem Schema für die primitiven Felder gerendert.

```typescript
// Beispiel: Solar-Eintrag-Schema (wiederverwendet pro Listenelement)
const solarItemSchema: HaFormSchema[] = [
  { name: 'id', selector: { text: {} }, required: true },
  { name: 'name', selector: { text: {} } },
  { name: 'power', selector: { entity: { domain: 'sensor' } }, required: true },
  { name: 'icon', selector: { icon: {} } },
];
```

Listen-UI:

```html
<div class="list-section">
  <h3>Solar-Anlagen</h3>
  ${this.config.solar.map((item, i) => html`
  <div class="list-item" part="editor-list-item">
    <ha-form
      .data="${item}"
      .schema="${solarItemSchema}"
      .hass="${this.hass}"
      @value-changed="${this._onSolarChanged(i)}"
    ></ha-form>
    <button @click="${this._onRemoveSolar(i)}">Entfernen</button>
    <button @click="${this._onMoveUp(i)}" ?disabled="${i" ="" ="" ="0}">↑</button>
    <button
      @click="${this._onMoveDown(i)}"
      ?disabled="${i"
      =""
      =""
      ="this.config.solar.length"
      -
      1}
    >
      ↓
    </button>
  </div>
  `)}
  <button @click="${this._onAddSolar}">+ PV hinzufügen</button>
</div>
```

#### 6.4.2 HA-Globale Custom Elements (kein Import!)

`<ha-form>`, `<ha-entity-picker>`, `<ha-icon>` sind **HA-eigene Custom
Elements**, die im HA-Runtime registriert sind. Sie werden **nicht** als
npm-Paket geliefert.

Konsequenzen:

- **Niemals** `import 'ha-form'` o. ä.
- In Lit-Templates direkt verwenden: `html`<ha-form .data=${…}></ha-form>`html`
- TS-Deklaration für diese Globals in `src/ha/ha-globals.d.ts`:

```typescript
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
  }
}
export {};
```

Die Editor-Implementation listet die _real verwendeten_ Properties dieser
Elemente — keine vollständige HA-Typdefinition.

#### 6.4.3 Pairing-Dropdown

Beim Akku-Editor enthält `charged_by` ein eigenes Lit-`<select>`:

```html
<label
  >Lädt von:
  <select .value="${battery.charged_by}" @change="${this._onChargedByChange(j)}">
    <option value="" disabled>— wählen —</option>
    ${this.config.solar.map(s => html`
    <option value="${s.id}">${s.name ?? s.id}</option>
    `)}
  </select>
</label>
${this._isPairingInvalid(battery) ? html`
<span class="error">PV-ID „${battery.charged_by}" existiert nicht</span>
` : ''}
```

#### 6.4.4 Validierung

Vor `config-changed`-Event-Dispatch:

- Schema-Check via `config/schema.ts` (gleiche Validierung wie zur Card-Laufzeit)
- Pairing-Integrität (jede `charged_by` zeigt auf existierendes Solar)
- Pairing-Eindeutigkeit (jede `solar.id` höchstens einmal als `charged_by`)
- Mindestens eine nicht-leere Liste oder konfigurierter Verbraucher
- Alle `entity_id`s syntaktisch valide (Format `domain.object_id`)
- (yellow warning, kein Save-Block) Sensor in `hass.states` existiert

Bei Fehler: `config-changed` wird **nicht** gefeuert; Inline-Fehler unter dem
betroffenen Feld; Save-Button visuell disabled.

## 7. Build, Tests, Distribution

### 7.1 Package & Build

```json
{
  "name": "custom-energy-flow-card",
  "version": "1.0.0",
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
    "format": "prettier --write 'src/**/*.ts'",
    "typecheck": "tsc --noEmit",
    "check": "pnpm lint && pnpm typecheck && pnpm test",
    "preview": "node scripts/build-preview.mjs && open dist/preview/preview.html",
    "prepare": "husky"
  }
}
```

`pnpm check` ist der CI-Gate.

### 7.2 Test-Strategie

| Schicht                                               | Tool                                                    | Anspruch                                        |
| ----------------------------------------------------- | ------------------------------------------------------- | ----------------------------------------------- |
| `engine/*`                                            | Vitest, tabellengetrieben                               | ≥ 90 % Coverage, alle 16 Edge-Cases aus 4.11    |
| `config/*`                                            | Vitest                                                  | ≥ 90 % Coverage, alle Validierungs-Regeln       |
| `util/*`                                              | Vitest                                                  | ≥ 90 % Coverage, alle Format-/Sensor-Edge-Cases |
| `render/layout`                                       | Vitest (snapshot oder strukturell)                      | Knoten-Positionen für 1, 2, 3, 5 PV-Anzahlen    |
| `render/flow-renderer`, `home-ring`, `flow-animation` | Manuell via Sandbox                                     | 8 Mock-Szenarien (siehe 7.3)                    |
| `editor.ts`                                           | Vitest (happy-dom env) für Form-Logik + Sandbox manuell | Add/remove/reorder, Pairing-Validierung         |
| `card.ts`, `ha/*`                                     | Code-Review nach HA-Konventionen                        | Orientierung an power-flow-card-plus            |

Coverage-Threshold von 90 % gilt für `engine/`, `config/`, `util/` (Pflicht via
`vitest.config.ts`). `render/`, `card.ts`, `editor.ts` werden über
Sandbox-Sichtprüfung verifiziert.

### 7.3 Standalone-Sandbox (`examples/preview.html`)

Statische HTML, die das gebaute Bundle (`dist/custom-energy-flow-card.js`) und
ein Mock-Wiring (`examples/preview-mocks.ts`) lädt. Buttons schalten zwischen
Szenarien.

**Mock-Datenstruktur:**

```typescript
export interface MockScenario {
  name: string;
  emoji: string;
  config: Config;
  hassStates: Record<string, { state: string; attributes?: Record<string, unknown> }>;
}

export const scenarios: MockScenario[] = [
  /* siehe Liste unten */
];

export function buildMockHass(scenario: MockScenario): HomeAssistant {
  return {
    states: scenario.hassStates,
    locale: { language: 'de' },
    themes: { darkMode: false },
    callService: () => Promise.resolve(),
    callApi: () => Promise.resolve(),
  } as unknown as HomeAssistant;
}
```

**Szenarien:**

1. ☀️ Sonniger Tag · beide Akkus laden · Überschuss → Netz
2. 🌙 Abend · beide Akkus speisen Haus + Netz
3. 🌃 Nacht · Reiner Netzbezug
4. ⚡ Pairing-Defizit
5. 🔌 Großverbraucher aktiv (Wallbox an)
6. 🛑 Alle Werte 0
7. ⚠️ Inkonsistente Sensor-Werte (Reconcile EXPORT_INCONSISTENT)
8. 🔢 5 PV-Anlagen + 5 Akkus (Layout-Stress-Test)
9. 🚫 Sensor unavailable (eine PV liefert `unavailable`)
10. 📐 Stub-Config (leere Listen, nur Netz)

### 7.4 HACS-Distribution

```json
// hacs.json
{
  "name": "Custom Energy Flow Card",
  "render_readme": true,
  "filename": "custom-energy-flow-card.js"
}
```

**HA-Mindestversion:** **HA 2024.4.0**.

### 7.5 README-Inhalt

- Screenshots aus der Sandbox (Light + Dark)
- Installation via HACS (3 Schritte)
- YAML-Beispiel (1-PV-Setup minimal, 2-PV-2-Akku-Setup wie in 3.1)
- Schema-Referenz (alle Felder mit Defaults)
- FAQ: Pairing-Regel, Sensor-Vorzeichen, Reconcile-Verhalten
- Card-Mod-Anpassung mit `::part()`-Liste (siehe §5.13)
- Link zum Sandbox-Preview (GitHub Pages, optional)

### 7.6 GitHub Actions CI/CD

**`.github/workflows/ci.yml`:**

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
      - name: Bundle size
        run: |
          SIZE=$(stat -c%s dist/custom-energy-flow-card.js)
          echo "Bundle: $SIZE bytes"
          [ "$SIZE" -lt 65536 ] || (echo "Bundle exceeds 60 kB" && exit 1)
```

**`.github/workflows/release.yml`:**

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

## 8. Entwicklungs-Phasen (intern)

Da v1.0 als ersten Test eingespielt wird, sind das **interne Etappen**.
Abhängigkeiten zwischen Phasen sind explizit:

### Phase 1 — Foundation: Util + Config + Engine

**Output:** `util/`, `config/`, `engine/`, `i18n/`, alle Tests grün, Coverage ≥ 90 %
**Abhängigkeiten:** keine
**Verifikation:** `pnpm test:coverage` zeigt grünen Lauf
**Reihenfolge intern:**

1. `util/format-power.ts` + Test
2. `util/resolve-color.ts`
3. `util/svg-path.ts`
4. `util/memo.ts`
5. `util/read-sensor.ts` + Test (alle Sensor-Edge-Cases)
6. `i18n/de.ts`
7. `engine/types.ts`, `engine/flow-graph.ts`
8. `engine/energy-engine.ts` (TDD: Edge-Case 1 → 16)
9. `config/types.ts`, `config/schema.ts` (inkl. `buildSystemState`) + Test

### Phase 2 — Renderer + Sandbox

**Output:** `render/`, `examples/preview.html`, `examples/preview-mocks.ts`
**Abhängigkeiten:** Phase 1 (Typen + Util)
**Verifikation:** Sandbox lädt direkt mit Mock-FlowResult (Engine wird hier nicht
aufgerufen), optisches OK in 10 Szenarien (inkl. neuer Sensor-Unavailable + Stub-Config-Szenarien)

### Phase 3 — HA-Integration

**Output:** `card.ts`, `ha/`, `index.ts`, `const.ts`
**Abhängigkeiten:** Phase 1 + 2
**Verifikation:**

- Sandbox umstellen auf vollen Card-Pfad (Mock-`hass` → `buildSystemState` → Engine → Renderer)
- Crash-Resilienz testen: Mock-Sensoren auf `unavailable` setzen, Card rendert weiter
- Tastatur-Navigation testen (Tab durch alle Knoten)
- a11y-Audit mit axe DevTools (≥ AA)
- Code-Review gegen power-flow-card-plus
- `pnpm typecheck` grün

### Phase 4 — Editor

**Output:** `editor.ts`, Editor in der Sandbox testbar
**Abhängigkeiten:** Phase 3
**Verifikation:** Editor in Sandbox: alle Listen-Operationen, Pairing-Validierung,
Save-Flow, Sensor-Existenz-Check.

### Phase 5 — Polish & Release

**Output:** `hacs.json`, `README.md`, GitHub-Workflows, husky-Setup,
`examples/2-pv-2-batt.yaml`, GitHub-Release-Asset
**Abhängigkeiten:** Phase 1–4
**Verifikation:** Release-Build, Bundle ≤ 60 kB, Anwender installiert v1.0,
qualitative Akzeptanz über mindestens 3 Tage.

## 9. Offene Punkte / Annahmen

- **Battery-Sensor-Sonderfälle.** v1.0 unterstützt signierten Power-Sensor +
  optionalen `power_invert`. Zwei separate `charge_w`/`discharge_w`-Sensoren
  → v1.x-Kandidat.
- **Verbraucher- und PV-Anzahl > 5/4** könnten optisch überquellen.
  README-Empfehlung max. 5.
- **Browser-Kompatibilität.** Mindestziele: Chrome 100+, Firefox 100+, Safari 15+,
  Edge 100+. CSS `offset-path` ist seit Safari 14, Chrome 64, Firefox 72 verfügbar.
- **Locale für Tausendertrennung.** Default: `Intl.NumberFormat(navigator.language)`,
  Override per `display.number_format = grouped`.
- **SVG-`<g tabindex="0">` Fokussierbarkeit.** Chrome/Edge: ja. Firefox: ja
  ab v51 (CSS-`outline`-Rendering uneinheitlich). Safari: ja ab v15.4. Wir
  testen die Tab-Navigation in der Sandbox primär mit Chromium-basierten
  Browsern. Falls Anwender-Browser-Probleme auftreten: alternative Lösung
  via `<foreignObject><button>` als v1.x-Kandidat.
- **Sensor-Wert in `attributes` statt `state`.** v1.0 liest immer `state`. Wenn
  ein Anwender unbedingt einen Attribute-Wert braucht, muss er einen Template-Sensor
  in HA bauen. v1.x-Kandidat: `power: sensor.foo:attributes.power`-Syntax.
- **Mobile/Schmaler Container (< 280 px).** v1.0 rendert mit Banner-Hinweis,
  kein Layout-Switch. Akzeptabel, weil HA-Dashboard auf Phone selten genutzt wird
  für Energiefluss-Cards.
- **Card-Mod-Vollkompatibilität.** v1.0 stellt `::part()`-Hooks bereit (siehe
  §5.13); volle dynamische Themability ist v2.

## 10. Erfolgs-Kriterien

### 10.1 Funktionale Akzeptanz (vom Anwender getestet)

- [ ] Anwender installiert die Card per HACS in seinem produktiven HA
- [ ] Beide PV-Anlagen, beide Speicher und drei Verbraucher werden korrekt angezeigt
- [ ] Energieflüsse stimmen zu jeder Tageszeit qualitativ mit der Realität überein
      (mind. 5 Stichproben über 3 Tage)
- [ ] Anteils-Ring zeigt sinnvolle Verteilung
- [ ] Klick auf Knoten öffnet `more-info`
- [ ] Tab-Navigation funktioniert über alle Knoten
- [ ] Editor in Lovelace funktioniert für initialen Setup
- [ ] Card crasht nicht bei kurzfristig fehlenden Sensoren
- [ ] Bei Engine-Warnings ist das Diagnose-Icon sichtbar

### 10.2 Technische Qualität (vor Release messbar)

- [ ] **Bundle-Größe** ≤ 60 kB (`dist/custom-energy-flow-card.js`, minified)
- [ ] **Coverage** für `engine/`, `config/`, `util/` ≥ 90 % statements/branches/functions/lines
- [ ] **Engine-Performance:** `EnergyEngine.compute()` < 1 ms im Median (Standard-Config),
      < 5 ms bei 5+5-Stress-Test
- [ ] **Render-Performance:** Renderer < 16 ms pro `hass`-Update;
      CSS-Animationen tangieren JS-Thread nicht
- [ ] `pnpm check` grün
- [ ] CI-Workflow grün auf PR
- [ ] Keine `any`-Typen ohne `// eslint-disable-line` mit Begründung
- [ ] Keine ESLint-Warnings im Release-Build

### 10.3 Code-Qualität (Stichproben in Code-Review)

- [ ] `card.ts` ≤ 200 LOC und delegiert vollständig
- [ ] `engine/energy-engine.ts` enthält ausschließlich `export function …`,
      keine Klassen mit State
- [ ] Schicht-Boundaries (siehe §2.4) lint-frei
- [ ] Keine doppelte Implementierung der 5 Util-Funktionen aus §2.7 außerhalb von `util/`

## 11. Code-Qualitäts-Standards (verbindlich)

Diese Standards sind **nicht-verhandelbar**. Verstöße brechen den CI-Build oder
werden im Code-Review zurückgewiesen.

### 11.1 Reine Funktionen für die Engine

`src/engine/*` enthält **ausschließlich pure functions**:

- Keine Klassen mit Instanz-State
- Kein Lesen aus globalem State (kein `Date.now()`, kein `Math.random()`,
  kein `localStorage`, kein DOM-Zugriff)
- Identische Eingaben → identische Ausgaben, immer
- Keine Mutation der Eingaben — nur neue Objekte zurückgeben

### 11.2 TypeScript-Strict + nichts darunter

- `strict: true`, `noUncheckedIndexedAccess: true`, `noImplicitOverride: true`,
  `noFallthroughCasesInSwitch: true`, `noPropertyAccessFromIndexSignature: true`
- **Kein `any`** ohne `// eslint-disable-next-line @typescript-eslint/no-explicit-any`
  _plus_ einzeiliger Kommentar mit Begründung
- **Kein `unknown`** ohne explizite Type-Narrowing-Schritte
- **Kein `as` cast** ohne Kommentar (außer `as const`)
- **Keine non-null assertion `!`** ohne Kommentar (Engine: niemals; sonst nur an HA-Boundary)

### 11.3 Test-Driven für die Engine

Reihenfolge in Phase 1:

1. `engine/types.ts` schreiben
2. **Tests** für Edge-Case 1 schreiben
3. Engine-Code so weit implementieren, dass Edge-Case 1 grün ist
4. Edge-Case 2, …
5. Bis alle 16 grün sind
6. Coverage prüfen, nachbessern

### 11.4 Schicht-Boundaries lint-enforced

`.eslintrc.cjs`:

```javascript
module.exports = {
  parser: '@typescript-eslint/parser',
  plugins: ['@typescript-eslint', 'import'],
  extends: [
    'eslint:recommended',
    'plugin:@typescript-eslint/recommended',
    'plugin:import/typescript',
  ],
  rules: {
    'import/no-restricted-paths': [
      'error',
      {
        zones: [
          { target: './src/engine', from: './src', except: ['./engine', './util/memo.ts'] },
          {
            target: './src/config',
            from: './src',
            except: ['./config', './util', './engine/types.ts', './i18n'],
          },
          {
            target: './src/render',
            from: './src',
            except: ['./render', './util', './engine/types.ts', './i18n'],
          },
          { target: './src/util', from: './src', except: ['./util'] },
          { target: './src/i18n', from: './src', except: ['./i18n'] },
          {
            target: './src/ha',
            from: './src',
            except: ['./ha', './config/types.ts', './engine/types.ts'],
          },
        ],
      },
    ],
    '@typescript-eslint/no-explicit-any': 'error',
    '@typescript-eslint/no-non-null-assertion': 'error',
    '@typescript-eslint/explicit-function-return-type': [
      'error',
      {
        allowExpressions: true,
      },
    ],
  },
};
```

### 11.5 Anti-Patterns (nicht erlaubt)

- ❌ **God-Class in card.ts.** ≤ 200 LOC, delegiert vollständig.
- ❌ **SVG-String-Konkatenation.** Lit-`html`-Templates, keine
  `'<circle r="' + r + '">'`-Konstruktionen.
- ❌ **Externe DOM-Libs.** Kein jQuery, kein D3, kein anime.js.
- ❌ **Eigenes State-Management.** Kein Redux/MobX/Zustand. Lit-`@property`
  und pure compute-Funktionen reichen.
- ❌ **Side-Effects in der Engine.** Kein `console.log` außer hinter
  `if (process.env.NODE_ENV !== 'production')`-Guard.
- ❌ **Doppelte Implementierung der Util-Funktionen.** Wenn du `formatPowerW`
  oder `readSensorW`-Logik außerhalb von `util/` schreibst, ist das ein Bug.
- ❌ **Berechnung in `render()`.** Gehört in `willUpdate()`.
- ❌ **Lit's default `hasChanged` für `hass`.** Ohne Custom-`hasChanged` re-rendert
  die Card auf jedes globale State-Update.
- ❌ **Try-Catch-Schluck.** Errors müssen via `console.error` mit Card-Name-Prefix
  geloggt werden, nicht stillschweigend gefressen.
- ❌ **Strings hardcoded in Templates.** Anwender-Strings kommen aus `i18n/de.ts`.
  (Ausnahme: dynamische Werte wie `formatPowerW(value)` selbst.)
- ❌ **Kommentare die WAS sagen.** Code soll selbsterklärend sein. Nur WARUM-Kommentare.
- ❌ **Kein TODO-Kommentar bleibt im Release.** Entweder fixed oder als Spec-Punkt verschoben.

### 11.6 Datei-Layout

- Eine Datei = ein klar abgegrenztes Konzept
- Test-File neben der zu testenden Datei (`foo.ts` + `foo.test.ts`)
- Keine `index.ts`-Re-Exports innerhalb von Modulen (außer `src/index.ts` für
  Card-Registrierung).

### 11.7 Pull-Request-Disziplin

- Jede Phase aus §8 wird als eigener Commit/Branch abgeschlossen
- Commit-Message folgt Conventional Commits: `feat(engine): …`, `test(util): …`
- Phase-Übergang nur, wenn `pnpm check` grün
- Keine "WIP"-Commits im Hauptzweig
- Pre-Commit-Hook (siehe §11.8) blockiert formatting-/lint-fehler-Commits

### 11.8 Pre-Commit-Hook (husky + lint-staged)

`prepare`-Script in package.json registriert husky beim ersten `pnpm install`.
`.husky/pre-commit` ruft `pnpm lint-staged`. lint-staged führt Prettier +
ESLint nur auf staged Files aus → schneller Hook (~2 s typisch).

Erlaubt Bypass nur in Notfällen mit `--no-verify` und Begründung im
Commit-Body. Niemals auf main.

## 12. Glossar

| Begriff             | Bedeutung                                                                 |
| ------------------- | ------------------------------------------------------------------------- |
| **Pairing**         | 1:1-Zuordnung einer Battery zu einer PV (`charged_by`)                    |
| **Pairing-Defizit** | charge[j] − P_pv→batt[i] > 0; PV reicht nicht zum Akku-Laden              |
| **Reconcile**       | Anpassung der berechneten Per-Source-Flüsse an Netz-Sensor-Realität       |
| **Anteils-Ring**    | Doughnut um Haus-Knoten, zeigt Quellen-Verteilung                         |
| **Active flow**     | Pfad mit `power > display.active_threshold_w`                             |
| **Greenfield**      | Frisches Repo ohne Bestandscode                                           |
| **Stub-Config**     | Default-Config aus `getStubConfig()`, beim Card-Hinzufügen via UI         |
| **HA-Globals**      | von HA bereitgestellte Custom Elements (`ha-form`, …), nicht importierbar |
| **`::part()`**      | CSS-Mechanismus für Shadow-DOM-Styling (z. B. via card-mod)               |
| **a11y**            | Accessibility-Konformität (WAI-ARIA, Tastatur, Screenreader)              |
| **CVD**             | Color-Vision-Deficiency / Farbenblindheit                                 |
