# custom-energy-flow-card — Design

**Status:** Spec v2 (post-review), ready for implementation planning
**Datum:** 2026-05-10
**Autor:** Brainstorming-Session mit @griebner

## 0. Projekt-Kontext

**Greenfield-Projekt.** Das Repo enthält zum Zeitpunkt dieses Specs nur:

- `.gitignore` (mit `.superpowers/`, `node_modules/`, `dist/`, `*.log`, `.DS_Store`)
- `docs/superpowers/specs/2026-05-10-custom-energy-flow-card-design.md` (dieses Dokument)
- Brainstorming-Session-Artefakte unter `.superpowers/` (gitignored)

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
- YAML-Config **plus** grafischer Editor in Lovelace
- HACS-installierbar

### 1.4 Out of Scope (v1.0)

- Energie-Tagesstatistiken / Historien (HA hat dafür eigene Karten)
- Phasen-aufgelöste Anzeige (L1/L2/L3)
- Dynamische Stromtarif-Anzeige
- Tooltip-Detail-Werte beim Hover (`more-info`-Dialog reicht)
- Internationalisierung (deutsche Default-Strings, mit `name`-Override pro
  Knoten in der Config)

## 2. Architektur

### 2.1 Tech-Stack & Versionen

| Tool | Version | Begründung |
|---|---|---|
| **Node.js** | ≥ 20.x LTS | aktuelle LTS, deckt Vitest 1.x und Rollup 4.x |
| **Package-Manager** | **pnpm** ≥ 9.x | kleiner `node_modules`, deterministisch, schnell |
| **TypeScript** | `^5.4.0` | strict mode, satisfies-Operator, const type params |
| **Lit** | `^3.2.0` | reaktive LitElement, native ES decorators support |
| **Rollup** | `^4.13.0` | Bundle-Standard für HA-Custom-Cards |
| **@rollup/plugin-typescript** | `^11.1.0` | TS-Compile im Build |
| **@rollup/plugin-node-resolve** | `^15.2.0` | ESM-Modul-Auflösung |
| **rollup-plugin-terser** | `^7.0.2` | Minification für Produktion |
| **Vitest** | `^1.4.0` | schnelle Unit-Tests, Vite-Ökosystem |
| **@vitest/coverage-v8** | `^1.4.0` | Coverage-Report (Engine ≥ 90 %) |
| **eslint** | `^8.57.0` | Linting + Import-Boundary-Check |
| **eslint-plugin-import** | `^2.29.0` | für `import/no-restricted-paths` |
| **prettier** | `^3.2.0` | Formatter, ohne ESLint-Integration |

**Decorator-Variante:** TypeScript `experimentalDecorators: true` mit
`useDefineForClassFields: false`. Begründung: Konsistenz mit dem HA-Custom-Card-
Ökosystem (alle bestehenden Referenz-Cards nutzen experimental decorators).
Migration auf TC39-Standard-Decorators ist v2-Thema, nicht v1.0.

**Kein Runtime-Dependency außer Lit.** Bundle-Größenobergrenze: 60 kB minified.

### 2.2 Modulaufteilung

```
src/
├── index.ts                 # window.customCards.push, Card-Registrierung
├── card.ts                  # LitElement, HA-Lifecycle (THIN: ≤ 200 LOC)
├── editor.ts                # LitElement-Editor (siehe §6)
├── const.ts                 # Card-Name, Version, Defaults
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
└── ha/
    ├── ha-globals.d.ts      # TS-Deklarationen für ha-form, ha-entity-picker (siehe §6.3)
    ├── ha-helpers.ts        # fireEvent('hass-more-info'), state-Lookup
    └── ha-types.ts          # HomeAssistant, HassEntity (Re-Export aus types-Package)

examples/
├── preview.html             # Standalone-Sandbox (siehe §7.3)
├── preview-mocks.ts         # Mock-hass + Mock-FlowResult-Generatoren
└── 2-pv-2-batt.yaml         # Beispiel-Config

scripts/
└── build-preview.mjs        # bundelt examples/preview.html mit dist/
```

**Verbindliche Modulgrößen:**
- `card.ts` ≤ 200 LOC (delegiert; kein direktes SVG/CSS)
- `editor.ts` ≤ 400 LOC (kann mehr werden, da Form-Logik explizit ist)
- `energy-engine.ts` ≤ 300 LOC (pure functions)
- Andere Dateien: kein hartes Limit, aber sobald > 250 LOC → splitten

### 2.3 Datenfluss

```
HA hass.states  ─→  card.ts liest Sensor-Werte
                ↓
          buildSystemState(config, hass)  →  SystemState
                ↓
          EnergyEngine.compute(SystemState)  →  FlowResult
                ↓
          Layout.compute(config, viewBox)  →  LayoutResult
                ↓
          FlowRenderer.render(FlowResult, LayoutResult, theme)  →  SVG
```

`buildSystemState` ist die **einzige** Stelle, an der HA-Sensor-Strings auf
typisierte Engine-Werte gemappt werden. Die Pairing-Konvertierung
`config.battery[].charged_by` → `SystemState.battery[].pairedPvId` passiert
hier (siehe §2.5 für die Naming-Mapping-Regel).

### 2.4 Schicht-Abgrenzungen (Hard-Constraint, lint-enforced)

| Modul | darf importieren aus | darf NICHT importieren aus |
|---|---|---|
| `engine/*` | (nur eigene Files + `engine/types.ts`) | `lit`, `ha/*`, `render/*`, `config/*`, DOM |
| `render/*` | (nur eigene Files + Lit) | `ha/*`, `engine/*` (außer Typen aus `engine/types.ts`) |
| `config/*` | (nur eigene Files) | `lit`, `render/*`, `engine/*` (außer Typen) |
| `ha/*` | Lit, externe HA-Typen | `engine/*`, `render/*`, `config/*` (außer Typen) |
| `card.ts` | alle Schichten | — (Komposition erlaubt) |
| `editor.ts` | `config/*`, `ha/*`, Lit | `engine/*`, `render/*` |

Diese Regeln werden via `eslint-plugin-import/no-restricted-paths` durchgesetzt
(siehe §11.4). Verstöße brechen den CI-Build.

### 2.5 TypeScript-Typen-Skelett

Die folgenden Interfaces sind **verbindlich** als API-Vertrag zwischen den Schichten.
Konkrete Implementierung kann Felder ergänzen, aber nicht entfernen oder umbenennen.

```typescript
// === src/config/types.ts ===
export interface Config {
  type: 'custom:custom-energy-flow-card';
  title?: string;
  solar: SolarConfig[];
  battery: BatteryConfig[];
  grid: GridConfig;
  home?: HomeConfig;
  consumers: ConsumerConfig[];
  display?: DisplayConfig;
}

export interface SolarConfig {
  id: string;          // unique within solar[]
  name?: string;
  power: string;       // sensor entity_id (W, ≥ 0)
  icon?: string;       // 'mdi:…'
}

export interface BatteryConfig {
  id: string;          // unique within battery[]
  name?: string;
  soc: string;         // sensor entity_id (%, 0–100)
  power: string;       // sensor entity_id (W, signed: + laden, − entladen)
  power_invert?: boolean;
  charged_by: string;  // muss eine SolarConfig.id sein
  icon?: string;
}

export type GridConfig =
  | { power: string; power_invert?: boolean }
  | { import: string; export: string };

export interface HomeConfig {
  name?: string;
  power?: string;      // optional Override; sonst per Bilanz berechnet
  icon?: string;
}

export interface ConsumerConfig {
  name: string;
  power: string;       // sensor entity_id (W, ≥ 0)
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

export type ColorRole =
  | 'solar' | 'battery' | 'grid_import' | 'grid_export' | 'home' | 'consumer';

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
  powerW: number;        // ≥ 0 (gecclamped wenn Sensor negativ)
}

export interface BatteryState {
  id: string;
  pairedPvId: string;    // == SolarConfig.id (mapping aus charged_by)
  powerW: number;        // signed: + laden, − entladen
  socPct: number;        // 0..100
}

export interface GridState {
  powerW: number;        // signed: + Bezug, − Einspeisung
}

export interface ConsumerState {
  id: string;            // generated, e.g., index-based
  powerW: number;        // ≥ 0
}

export interface FlowResult {
  homeW: number;
  flows: {
    pvToHome: PerSourceFlow[];      // pro PV
    pvToBattery: PerSourceFlow[];   // pro PV (zur gepairten Battery)
    pvToGrid: PerSourceFlow[];      // pro PV
    batteryToHome: PerSourceFlow[]; // pro Battery
    batteryToGrid: PerSourceFlow[]; // pro Battery
    gridToHome: number;
    homeToConsumer: PerSourceFlow[]; // pro Consumer
  };
  homeAttribution: HomeAttribution;
  pairingDeficit: { batteryId: string; deficitW: number }[];
  warnings: EngineWarning[];
}

export interface PerSourceFlow {
  sourceId: string;     // SolarConfig.id, BatteryConfig.id, oder Consumer-Index
  powerW: number;       // ≥ 0
}

export interface HomeAttribution {
  // Σ shares = 1.0 wenn homeW > 0; alle 0 sonst
  shares: { sourceKind: 'pv' | 'battery' | 'grid'; sourceId?: string; share: number }[];
}

export interface EngineWarning {
  code: 'NEGATIVE_PV' | 'PAIRING_DEFICIT' | 'BALANCE_DRIFT' | 'EXPORT_INCONSISTENT';
  detail: string;
  magnitudeW?: number;
}
```

**Naming-Mapping** (Config ↔ State, in `buildSystemState`):

| Config (snake_case, YAML-friendly) | State (camelCase, TS-idiomatisch) |
|---|---|
| `battery[].charged_by` | `battery[].pairedPvId` |
| `battery[].power_invert` | (intern angewandt; State enthält finale signierte `powerW`) |
| `grid.power` / `grid.import`+`grid.export` | `grid.powerW` (immer normalisiert auf signed) |
| `home.power` | `home.powerOverrideW` (Sensor-Wert in W) |

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
    process.env.NODE_ENV === 'production' && terser(),
  ].filter(Boolean),
};
```

**`vitest.config.ts`:**

```typescript
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    coverage: {
      provider: 'v8',
      include: ['src/engine/**', 'src/config/**'],
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

**`.eslintrc.cjs`** — siehe §11.4 für die Boundary-Regeln.

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
    soc:   sensor.akku_dach_soc
    power: sensor.akku_dach_power     # signiert: + laden, − entladen
    power_invert: false               # falls Sensor umgekehrt liefert
    charged_by: dach                  # Pairing → muss eine solar[].id sein

  - id: balkon
    name: Balkon-Speicher
    soc:   sensor.akku_balkon_soc
    power: sensor.akku_balkon_power
    charged_by: balkon

grid:
  power: sensor.grid_power            # signiert: + Bezug, − Einspeisung
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
  number_format: grouped              # standard | grouped (1 900 W)
  show_inactive_paths: false
  animation:
    base_duration_s: 2.5
    reference_power_w: 1000
    min_duration_s: 0.6
    max_dots_per_path: 4
```

### 3.2 Schema-Regeln (Validierung in `config/schema.ts`)

**ID-Namespacing:**
- `solar[].id` müssen *innerhalb von* `solar` eindeutig sein
- `battery[].id` müssen *innerhalb von* `battery` eindeutig sein
- IDs *zwischen* Listen dürfen kollidieren (z. B. `solar.id="dach"` und
  `battery.id="dach"` sind beide erlaubt — verschiedene Namespaces)

**Pairing-Kardinalität: strikt 1:1.**
- Jede `BatteryConfig.charged_by` muss auf eine existierende `SolarConfig.id` zeigen
- Eine PV darf **höchstens einer** Battery gepairt sein (kein 1:N). Validierung
  prüft, dass jede `solar[].id` nur in höchstens einem `battery[].charged_by` vorkommt
- Eine PV ohne gepairten Akku ist erlaubt (PV ohne Speicher) — ihr Output geht
  direkt zu Haus/Netz
- Ein Akku ohne `charged_by` ist nicht erlaubt (würde sonst niemals laden)

**Grid:**
- `grid.power` (signiert) **xor** `grid.import`+`grid.export` (zwei separate Sensoren)
- `grid` ist immer Pflicht (jedes deutsche Haushalts-System hat einen Netzanschluss)

**Mindest-Konfiguration:**
- Mindestens **eine** der drei Listen `solar` / `battery` / `consumers` muss
  nicht-leer sein (sonst gibt es nichts zu visualisieren außer Netz↔Haus)

**Sensor-Verfügbarkeit:**
- Validierung prüft im Editor, ob alle referenzierten `entity_id`s in `hass.states`
  existieren (yellow warning, kein Save-Block)
- Zur Laufzeit: nicht existente Entity → `power_w = 0` + Warning in
  `FlowResult.warnings`; Anzeige `—`; Card stürzt nicht ab

**Default-Icons:**

| Knoten | MDI-Icon |
|---|---|
| PV | `mdi:solar-power` |
| Akku | `mdi:battery` |
| Netz | `mdi:transmission-tower` |
| Haus | `mdi:home` |
| Verbraucher | `mdi:power-plug` |

**`power_invert` für PV:** Nicht in v1.0. PV-Sensoren liefern in der Praxis
≥ 0; Sensor-Glitches mit negativem Wert werden auf 0 geclampt + Warning.
Falls ein realer Anwendungsfall auftaucht, kommt das Feature in v1.x.

### 3.3 Editor-UX

Akkordeon mit klappbaren Sektionen. Die Listen-Sektionen (Solar, Akkus,
Verbraucher) sind **kein** ha-form-Schema (das nicht zuverlässig Listen mit
„+Add"-UI unterstützt), sondern **manuell mit Lit** gerenderte Listen, die
pro Eintrag intern ein ha-form-Subset für die primitiven Felder verwenden.
Siehe §6.

1. **Allgemein** — `title`, `display.show_inactive_paths`, `display.number_format`
2. **Solar** — Liste mit „+ PV hinzufügen". Pro Eintrag: `id`, `name`,
   `power`-Sensor, `icon`
3. **Akkus** — Liste mit „+ Akku hinzufügen". Pro Eintrag: `id`, `name`,
   `soc`-Sensor, `power`-Sensor, `power_invert`, **`charged_by`** (Dropdown
   der existierenden Solar-IDs)
4. **Netz** — Toggle „1 signierter Sensor / 2 Sensoren", entsprechende Felder
5. **Verbraucher** — Liste mit „+ Verbraucher hinzufügen". Pro Eintrag: `name`,
   `power`-Sensor, `icon`-Picker
6. **Anzeige** (advanced, default zugeklappt) — `display.animation.*` mit
   Slidern, optional `display.colors`

Live-Validierung:
- Pairing-Dropdown rot, wenn das gewählte Solar gelöscht wurde
- Inline-Fehler bei `entity_id` nicht in `hass.states`
- „Speichern" deaktiviert, solange invalid

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

Wenn `P_home_calculated < 0`: Bilanz inkonsistent → Warning
`BALANCE_DRIFT` mit `magnitudeW = |P_home_calculated|`. `P_home` wird auf 0 geclampt.

### 4.4 Schritt 3 — Pairing: PV → Akku

```
für jede Battery j mit charge[j] > 0:
  i = pairedPvId(j)
  P_pv→batt[i] = min(pv[i].powerW, charge[j])
  P_pv_remaining[i] = pv[i].powerW − P_pv→batt[i]

  pairing_deficit_j = charge[j] − P_pv→batt[i]
  falls pairing_deficit_j > 0:
    warning(PAIRING_DEFICIT, batteryId = j, magnitudeW = pairing_deficit_j)

für PVs ohne gepairte Battery:
  P_pv_remaining[i] = pv[i].powerW
```

Pairing-Defizit wird im FlowResult als `pairingDeficit[]` ausgewiesen, aber
**nicht als separater Grid→Battery-Pfad visualisiert** (v1.0-Limitation, siehe §9).

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

Der Netz-Sensor (gemessenes `import`/`export`) ist „ground truth". Sensor-Latenz
und Wechselrichter-Verluste verursachen kleine Bilanzfehler — die Engine
reconciliert wie folgt:

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
  // Bilanz sagt nichts ist übrig, Sensor sagt es wird eingespeist.
  // Inkonsistenz: alle P_*→grid bleiben bei 0
  warning(EXPORT_INCONSISTENT, detail = 'untracked_export', magnitudeW = export)

Fall 3 — calc_export > 0 und export == 0:
  // Bilanz sagt wir speisen ein, Sensor sagt nicht.
  alle P_pv→grid[i] = 0
  alle P_batt→grid[j] = 0
  warning(EXPORT_INCONSISTENT, detail = 'phantom_export', magnitudeW = calc_export)

Fall 4 — calc_export == 0 und export == 0:
  // konsistent, nichts zu tun
```

**B) Netzbezug:**

```
P_grid_to_home = import   // Sensor ist authoritativ

Sanity-Check:
  total_to_home = total_pv_to_home + total_batt_to_home + P_grid_to_home
  drift = total_to_home − P_home
  falls |drift| > max(1 W, P_home * 0.05):
    warning(BALANCE_DRIFT, magnitudeW = |drift|)
```

Inkonsistenzen werden als Warnings im `FlowResult` zurückgegeben — keine harte
Fehlerbehandlung, der Renderer zeigt einfach die reconciled Werte. Warnings
sind Diagnose-Material für späteres Debugging und für eine optionale „Health"-
Anzeige im Editor.

### 4.9 Schritt 8 — Haus → Verbraucher

```
P_home→consumer[k] = consumer[k].powerW   // direkt aus Sensor

// "Sonstige" implizit: P_home − Σ consumer[k].powerW
// Falls > 0: nicht zugeordneter Hausverbrauch (steckt schon im Anteils-Ring)
// Falls < 0: Verbraucher-Sensoren sagen mehr als die Bilanz
//   → Sensor-Drift, warning(BALANCE_DRIFT)
```

### 4.10 Anteils-Ring (Doughnut)

```
falls P_home > 0:
  share_pv[i]   = P_pv→home[i]   / P_home
  share_batt[j] = P_batt→home[j] / P_home
  share_grid    = P_grid_to_home / P_home
  // Σ aller shares ≈ 1.0 (kann durch Reconcile leicht abweichen
  //  — Renderer normiert finale shares auf Σ = 1 vor dem Zeichnen)
sonst:
  alle shares = 0
```

### 4.11 Engine-Edge-Cases (Test-Tabelle, Pflicht-Tests)

| # | Szenario | Erwartung |
|---|---|---|
| 1 | Alle Werte 0 | Alle Flows 0; P_home 0; ring leer; keine warnings |
| 2 | Sonniger Tag, Akkus laden, Überschuss ins Netz | PV→Akku, PV→Haus, PV→Netz aktiv; Akku→… inaktiv |
| 3 | Abend, Akkus speisen Haus + Netz | Akku→Haus, Akku→Netz aktiv; PV inaktiv |
| 4 | Nacht, Netzbezug | Nur Netz→Haus, Haus→Verbraucher |
| 5 | Pairing-Defizit (Akku lädt 500 W, PV 200 W) | `pairingDeficit[j]=300`, warning(PAIRING_DEFICIT, 300) |
| 6 | `home.powerOverrideW` gesetzt | P_home = override, Bilanz übersprungen |
| 7 | Negative PV-Werte (Sensor-Glitch) | Auf 0 geclampt, warning(NEGATIVE_PV) |
| 8 | Reconcile Fall 1 (calc_export ≠ export, Drift > 5 %) | Skalierung greift, warning(EXPORT_INCONSISTENT) |
| 9 | Reconcile Fall 2 (untracked_export) | Alle export-Flows 0, warning |
| 10 | Reconcile Fall 3 (phantom_export) | Alle export-Flows 0, warning |
| 11 | Keine PV in Config | PV-Sektion leer, alle PV-Flows 0 |
| 12 | Keine Akkus in Config | Akku-Sektion leer, alle Akku-Flows 0 |
| 13 | PV ohne gepairten Akku | P_pv_remaining = volle PV-Leistung |
| 14 | `Σ Verbraucher > P_home` | Verbraucher-Werte direkt; warning(BALANCE_DRIFT) |
| 15 | P_home_calculated < 0 (extreme Inkonsistenz) | P_home = 0, warning(BALANCE_DRIFT) |
| 16 | 5 PV + 5 Akkus (Stress-Test) | Performance < 1 ms; alle Flows korrekt summiert |

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

SVG-Viewport responsiv: `viewBox="0 0 720 540"` als Basis,
`preserveAspectRatio="xMidYMid meet"`. Card skaliert in jeder Lovelace-Spalte.

### 5.2 Pfad-Routing

Pro Konfiguration berechnete Pfade, generalisiert:

| Quelle → Ziel | Routing |
|---|---|
| Solar i → Akku paired_batt(i) | Vertikale Bahn (Bogen) |
| Solar i → Haus | Bogen Richtung Mitte |
| Solar i → Netz | Bogen über die linke Seite (ggf. quer bei rechter PV) |
| Akku j → Haus | Bogen nach oben Richtung Mitte |
| Akku j → Netz | Bogen unter dem Haus durch nach links |
| Netz → Haus | Gerade horizontal |
| Haus → Verbraucher k | Gerade horizontal nach rechts |

SVG quadratic-Bezier-Kurven (`<path d="M … Q … …">`). Pfade werden bei Layout-
Berechnung erzeugt und gecacht; Re-Generierung nur bei Config-Änderung oder
Container-Resize.

### 5.3 Knoten-Rendering

Jeder Knoten = SVG-`<g>`:

```html
<g transform="translate(x y)" class="node node--solar">
  <text class="node-name" y="-58">Solar Dach</text>
  <circle r="42" fill="var(--ha-card-background)"
          stroke="var(--c-solar)" stroke-width="2.5"/>
  <text class="node-icon" y="-4">☀️</text>
  <text class="node-value" y="16">2 000</text>
  <text class="node-unit" y="28">W</text>
</g>
```

Bezeichner-Position pro Zone:

| Zone | Label-Position |
|---|---|
| Solar (oben) | oberhalb des Kreises |
| Akku (unten) | unterhalb des Kreises |
| Netz (links) | oberhalb des Kreises |
| Verbraucher (rechts) | oberhalb des Kreises |
| Haus (mittig) | unterhalb des Anteils-Rings |

Icon-Rendering: für v1.0 **MDI-Icons als inline SVG-`<path>`**, ausgeliefert via
einer kleinen `mdi-paths.ts`-Map mit den ~10 verwendeten Icon-Paths. Falls in
einer Frühphase Boilerplate stört, ist Emoji-Fallback Akzeptabel — siehe §9.

### 5.4 Anteils-Ring (Haus)

Konzentrische `<circle>` mit `stroke-dasharray`. Pro Quelle ein Segment,
`stroke-dashoffset` summiert sich. Update nur bei `FlowResult`-Änderung.

### 5.5 Flow-Animation (CSS-basiert mit `offset-path`)

Pro Pfad mit Leistung > `display.active_threshold_w` werden Punkte als
`<circle>`-Elemente gerendert, deren Bewegung durch CSS `offset-path` /
`offset-distance` definiert ist. **Bewusste Wahl gegen SVG `<animateMotion>`:**
dort sind `dur` und `keyTimes` XML-Attribute und können nicht via CSS-Variablen
zur Laufzeit aktualisiert werden, was die Performance-Optimierung in §5.7
unmöglich machen würde.

Beispiel-Markup:

```html
<g class="flow flow--pv-to-home" style="
  --path: path('M 170 110 Q 220 200 340 240');
  --dur: 2s;
  --dot-count: 3;
">
  <path class="flow-line" d="M 170 110 Q 220 200 340 240"/>
  <circle class="flow-dot" style="animation-delay: 0s"/>
  <circle class="flow-dot" style="animation-delay: 0.66s"/>
  <circle class="flow-dot" style="animation-delay: 1.33s"/>
</g>
```

Begleitendes CSS:

```css
.flow-dot {
  offset-path: var(--path);
  offset-distance: 0%;
  animation: flow-dot-move var(--dur) linear infinite;
  fill: var(--flow-color);
}
@keyframes flow-dot-move {
  to { offset-distance: 100%; }
}
.flow-line.animated {
  stroke-dasharray: 4 6;
  animation: flow-line-stream var(--dur) linear infinite;
}
@keyframes flow-line-stream {
  to { stroke-dashoffset: -40; }
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

| Element | Variable |
|---|---|
| Card-Hintergrund | `var(--ha-card-background, var(--card-background-color, white))` |
| Text primär | `var(--primary-text-color)` |
| Text sekundär | `var(--secondary-text-color)` |
| Border / Divider | `var(--divider-color)` |
| Card-Padding | `var(--ha-card-padding, 16px)` |

Semantische Akzentfarben **nicht** an HA-Theme gekoppelt (Bedeutung muss in
Light/Dark gleich bleiben). Defaults:

| Bedeutung | Farbe |
|---|---|
| Solar | `#f59e0b` (gelb-orange) |
| Akku → Haus | `#10b981` (grün) |
| Netzbezug (+) | `#6b7280` (grau) |
| Einspeisung (−) | `#16a34a` (sattes grün) |
| Haus | `#ef4444` (rot) |
| Verbraucher | `#db2777` (pink) |

Über `display.colors` in der Config überschreibbar.

### 5.7 Update-Strategie

- Card abonniert HA-`hass`-Updates (Lit `@property` mit eigenem `hasChanged`-
  Vergleich, der nur die referenzierten Sensor-IDs vergleicht — nicht das
  ganze `hass.states`-Objekt)
- Bei jedem `hass`-Update: `buildSystemState` → `EnergyEngine.compute` →
  Diff gegen vorigen `FlowResult`
- **Re-Render-Pfade:**
  - Topologie unverändert (gleiche aktive/inaktive Pfade) → CSS-Custom-Properties
    `--dur` und `--dot-count` werden via `style.setProperty` aktualisiert.
    **Kein DOM-Rebuild.** Funktioniert dank der `offset-path`-Wahl in §5.5.
  - Topologie geändert (Pfad wird aktiv/inaktiv, Dot-Count ändert sich) →
    Lit re-rendert die betroffenen `<g class="flow">`-Wrapper neu (lit-html
    template caching greift, nur das nötige DOM wird angefasst)
- Animationen laufen CSS-basiert weiter ohne JS-Tick

### 5.8 Reduced Motion

`@media (prefers-reduced-motion: reduce)` schaltet `animation-duration` der
Punkte auf `0s` (Punkte erscheinen statisch am Pfad-Anfang) und reduziert die
Linien-Streaming-Animation auf eine subtile Pulsation (Opacity 0.6 → 1).

## 6. Editor (GUI)

### 6.1 Registrierung

```typescript
// in card.ts
static getConfigElement(): HTMLElement {
  return document.createElement('custom-energy-flow-card-editor');
}
static getStubConfig(): Partial<Config> {
  return {
    type: 'custom:custom-energy-flow-card',
    grid: { power: '' },
    solar: [],
    battery: [],
    consumers: [],
  };
}
```

Editor-Element ist ein eigenes `LitElement` in `src/editor.ts`, registriert via
`customElements.define('custom-energy-flow-card-editor', Editor)` im
`src/index.ts`.

### 6.2 Form-Struktur

**ha-form** wird verwendet für **primitive Felder** innerhalb einzelner
Liste-Einträge (Texte, Zahlen, Booleans, Entity-Picker). Für die Listen
selbst (Solar/Akkus/Verbraucher mit „+ Hinzufügen", Drag-to-reorder, Löschen)
wird **manuelles Lit-UI** geschrieben — ha-form unterstützt Listen nur
eingeschränkt.

Pro Liste-Eintrag wird ein `<ha-form>` mit folgendem Schema gerendert:

```typescript
// Beispiel: Solar-Eintrag
const solarSchema = [
  { name: 'id', selector: { text: {} }, required: true },
  { name: 'name', selector: { text: {} } },
  { name: 'power', selector: { entity: { domain: 'sensor' } }, required: true },
  { name: 'icon', selector: { icon: {} } },
];
```

Für Animations-Slider (`display.animation.*`):

```typescript
{ name: 'base_duration_s', selector: { number: { min: 0.5, max: 5, step: 0.1, mode: 'slider' } } }
```

### 6.3 HA-Globale Custom Elements (kein Import!)

`<ha-form>`, `<ha-entity-picker>`, `<ha-icon>` sind **HA-eigene Custom
Elements**, die im HA-Runtime registriert sind. Sie werden **nicht** als
npm-Paket geliefert.

Konsequenzen:
- **Niemals** `import 'ha-form'` oder ähnlich. Solche Imports schlagen fehl.
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

Die Editor-Implementation listet die *real verwendeten* Properties dieser
Elemente — keine vollständige HA-Typdefinition (wir versuchen nicht, HA's
internes API neu zu deklarieren).

### 6.4 Pairing-Dropdown

Beim Akku-Editor enthält `charged_by` ein eigenes Lit-`<select>` (nicht über
ha-form, da die Optionen dynamisch aus dem Solar-Array stammen):

```html
<select .value=${battery.charged_by} @change=${this._onChargedByChange(j)}>
  ${this.config.solar.map(s => html`<option value=${s.id}>${s.name ?? s.id}</option>`)}
</select>
```

Wird ein Solar gelöscht, dessen ID noch in einer Battery steht: rote
Inline-Fehlermeldung + „Speichern" deaktiviert.

### 6.5 Validierung

Vor `config-changed`-Event-Dispatch:

- Schema-Check via `config/schema.ts` (gleiche Validierung wie zur Card-Laufzeit)
- Pairing-Integrität (jede `charged_by` zeigt auf existierendes Solar)
- Pairing-Eindeutigkeit (jede `solar.id` höchstens einmal als `charged_by`)
- Mindestens eine nicht-leere Liste oder konfigurierte Verbraucher
- Alle `entity_id`s syntaktisch valide (Format `domain.object_id`)

Bei Fehler: `config-changed` wird **nicht** gefeuert; Inline-Fehler unter dem
betroffenen Feld.

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
    "test": "vitest run",
    "test:watch": "vitest",
    "test:coverage": "vitest run --coverage",
    "lint": "eslint 'src/**/*.ts'",
    "typecheck": "tsc --noEmit",
    "check": "pnpm lint && pnpm typecheck && pnpm test"
  }
}
```

`pnpm check` ist der CI-Gate: alle drei müssen grün, sonst kein Release-Build.

### 7.2 Test-Strategie

| Schicht | Tool | Anspruch |
|---|---|---|
| `engine/*` | Vitest, tabellengetrieben | ≥ 90 % Coverage, alle 16 Edge-Cases aus 4.11 |
| `config/*` | Vitest | ≥ 90 % Coverage, alle Validierungs-Regeln aus 3.2 |
| `render/layout` | Vitest (snapshot oder strukturell) | Knoten-Positionen für 1, 2, 3, 5 PV-Anzahlen |
| `render/flow-renderer`, `home-ring`, `flow-animation` | Manuell via Sandbox | 8 Mock-Szenarien (siehe 7.3) |
| `editor.ts` | Manuell via Sandbox | Form-Logik mit Mock-`hass` |
| `card.ts`, `ha/*` | Code-Review nach HA-Konventionen | Orientierung an power-flow-card-plus |

Coverage-Threshold von 90 % gilt für `engine/` und `config/` (Pflicht via
`vitest.config.ts`). `render/layout` hat keinen Threshold (Snapshot-Tests
sind nicht meaningful coverage). `render/flow-renderer` etc. werden bewusst
**nicht** unit-getestet (DOM-Snapshots zu spröde, animation untestbar) —
Verifikation läuft über die Sandbox.

### 7.3 Standalone-Sandbox (`examples/preview.html`)

Statische HTML, die das gebaute Bundle (`dist/custom-energy-flow-card.js`) und
ein Mock-Wiring (`examples/preview-mocks.ts`) lädt. Buttons schalten zwischen
8 vordefinierten Szenarien. **Wird nicht im HACS-Bundle ausgeliefert**, ist
nur im Repo zur Entwicklung + Verifikation.

**Mock-Datenstruktur:**

```typescript
// examples/preview-mocks.ts
export interface MockScenario {
  name: string;
  emoji: string;
  config: Config;        // wie in der HA-YAML
  hassStates: Record<string, { state: string; attributes?: Record<string, unknown> }>;
}

export const scenarios: MockScenario[] = [
  // siehe Liste unten
];

// Minimaler Mock-hass für die Card:
export function buildMockHass(scenario: MockScenario): HomeAssistant {
  return {
    states: scenario.hassStates,
    locale: { language: 'de' },
    themes: { darkMode: false },
    callService: () => Promise.resolve(),
    callApi: () => Promise.resolve(),
    // … nur die Felder, die die Card real anfasst
  } as unknown as HomeAssistant;
}
```

**Szenarien:**

1. ☀️ Sonniger Tag · beide Akkus laden · Überschuss → Netz
2. 🌙 Abend · beide Akkus speisen Haus + Netz
3. 🌃 Nacht · Reiner Netzbezug
4. ⚡ Pairing-Defizit (Akku lädt, PV zu schwach)
5. 🔌 Großverbraucher aktiv (Wallbox an)
6. 🛑 Alle Werte 0 (ruhender Zustand)
7. ⚠️ Inkonsistente Sensor-Werte (Reconcile EXPORT_INCONSISTENT)
8. 🔢 5 PV-Anlagen + 5 Akkus (Layout-Stress-Test)

`scripts/build-preview.mjs` baut das Bundle und kopiert nach `dist/preview/`,
sodass die Sandbox auch nach `pnpm build` direkt aus `dist/` lauffähig ist.

### 7.4 HACS-Distribution

```json
// hacs.json
{
  "name": "Custom Energy Flow Card",
  "render_readme": true,
  "filename": "custom-energy-flow-card.js"
}
```

GitHub-Release mit `dist/custom-energy-flow-card.js` als Asset.
Standard-HACS-Workflow.

**HA-Mindestversion:** **HA 2024.4.0**. Begründung: ha-form-Selectoren in der
hier verwendeten Form (`number.mode='slider'`, `entity.domain`, `icon`) sind
seit dieser Version stabil.

### 7.5 README-Inhalt

- Screenshots aus der Sandbox (Light + Dark)
- Installation via HACS (3 Schritte)
- YAML-Beispiel (1-PV-Setup minimal, 2-PV-2-Akku-Setup wie in 3.1)
- Schema-Referenz (alle Felder mit Defaults)
- FAQ: Pairing-Regel, Sensor-Vorzeichen, Reconcile-Verhalten
- Link zum Sandbox-Preview (GitHub Pages, optional)

## 8. Entwicklungs-Phasen (intern)

Da v1.0 als ersten Test eingespielt wird, sind das **interne Etappen**.
Abhängigkeiten zwischen Phasen sind explizit:

### Phase 1 — Engine + Config-Validierung
**Output:** `engine/`, `config/`, alle Tests grün, Coverage ≥ 90 %
**Abhängigkeiten:** keine
**Verifikation:** `pnpm test:coverage` zeigt grünen Lauf

### Phase 2 — Renderer + Layout
**Output:** `render/`, `examples/preview.html`, `examples/preview-mocks.ts`
**Abhängigkeiten:** Phase 1 (verwendet `engine/types.ts` für FlowResult-Typ)
**Verifikation:** Sandbox lädt mit Mock-FlowResult (Engine wird hier nicht aufgerufen,
Sandbox füttert direkt FlowResult — *Phase 2 testet Renderer isoliert*).
Optisches OK in 8 Szenarien.

### Phase 3 — HA-Integration
**Output:** `card.ts`, `ha/`, `index.ts`, `const.ts`
**Abhängigkeiten:** Phase 1 + 2 (komponiert beide)
**Verifikation:** Sandbox umstellen auf vollen Card-Pfad (Mock-`hass` →
`buildSystemState` → `EnergyEngine` → `Renderer`). Code-Review gegen
HA-Konventionen (power-flow-card-plus als Referenz). `pnpm typecheck` grün.

### Phase 4 — Editor
**Output:** `editor.ts`, Editor in der Sandbox testbar
**Abhängigkeiten:** Phase 3 (`card.ts.getConfigElement()` registriert den Editor)
**Verifikation:** Editor in Sandbox: alle Listen-Operationen (add/remove/reorder),
Pairing-Validierung, Save-Flow.

### Phase 5 — Polish & Release
**Output:** `hacs.json`, `README.md`, `examples/2-pv-2-batt.yaml`, GitHub-Release-Asset
**Abhängigkeiten:** Phase 1–4 alle abgeschlossen
**Verifikation:** Release-Build erzeugt, Bundle-Größe < 60 kB, Anwender installiert
v1.0 in produktivem HA, qualitative Akzeptanz über mindestens 3 Tage.

## 9. Offene Punkte / Annahmen

Werden in der Plan-Phase oder bei Implementierung konkretisiert:

- **Battery-Sensor-Sonderfälle.** `power_invert` deckt einfache Vorzeichen-
  Umkehrungen ab. Spezielle Hersteller mit zwei separaten Sensoren
  (`charge_w` + `discharge_w` ungesigned) werden nicht in v1.0 unterstützt;
  v1.x-Kandidat.
- **Verbraucher-Anzahl > 5** könnten vertikal überquellen. Layout sieht
  Scrolling/Skalierung nicht vor; README-Empfehlung max. 5.
- **PV-Anzahl > 4** dito.
- **MDI-Icon-Rendering.** Plan: inline `<path>` aus `mdi-paths.ts`. Falls in der
  Implementierung der Pflegeaufwand zu hoch ist, fällt v1.0 auf Emoji-Defaults
  zurück (technisch akzeptabel; visuell weniger HA-nativ).
- **Browser-Kompatibilität.** Mindestziele: Chrome 100+, Firefox 100+, Safari
  15+, Edge 100+ (Stand: alle aktuellen HA-unterstützten Browser). CSS
  `offset-path` ist seit Safari 14, Chrome 64, Firefox 72 verfügbar.
- **Locale für Tausendertrennung.** Default: `Intl.NumberFormat(navigator.language)`,
  d. h. „1 900" auf de-DE, „1,900" auf en-US. Card-Override per
  `display.number_format = grouped` erzwingt explizit Schmal-Trennzeichen.

## 10. Erfolgs-Kriterien

### 10.1 Funktionale Akzeptanz (vom Anwender getestet)

- [ ] Anwender installiert die Card per HACS in seinem produktiven HA
- [ ] Beide PV-Anlagen, beide Speicher und drei Verbraucher werden korrekt
      angezeigt
- [ ] Energieflüsse stimmen zu jeder Tageszeit qualitativ mit der Realität
      überein (mind. 5 Stichproben über 3 Tage)
- [ ] Anteils-Ring zeigt sinnvolle Verteilung
- [ ] Klick auf Knoten öffnet `more-info`
- [ ] Editor in Lovelace funktioniert für initialen Setup
- [ ] Card crasht nicht bei kurzfristig fehlenden Sensoren

### 10.2 Technische Qualität (vor Release messbar)

- [ ] **Bundle-Größe** ≤ 60 kB (`dist/custom-energy-flow-card.js`, minified)
- [ ] **Engine-Coverage** ≥ 90 % statements/branches/functions/lines
- [ ] **Config-Coverage** ≥ 90 % (gleiche Schwelle)
- [ ] **Engine-Performance:** `EnergyEngine.compute()` < 1 ms im Median für
      Standard-Config (2 PV, 2 Akku, 3 Verbraucher); < 5 ms für 5+5-Stress-Test
- [ ] **Render-Performance:** zusätzlich zu engine, Renderer < 16 ms pro
      `hass`-Update (visuelle Frame-Rate); CSS-Animationen tangieren JS-Thread
      nicht
- [ ] `pnpm check` (lint + typecheck + test) grün
- [ ] Keine `any`-Typen ohne `// eslint-disable-line` mit Begründungs-Kommentar
- [ ] Keine ESLint-Warnings im finalen Release-Build

### 10.3 Code-Qualität (Stichproben in Code-Review)

- [ ] `card.ts` ≤ 200 LOC und delegiert vollständig
- [ ] `engine/energy-engine.ts` enthält ausschließlich `export function …`,
      keine Klassen mit State
- [ ] Schicht-Boundaries (siehe §2.4) lint-frei (kein verbotener Import)

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

Begründung: macht Tests trivial reproduzierbar und Refactoring sicher.

### 11.2 TypeScript-Strict + nichts darunter

- `tsconfig.json` mit `strict: true`, `noUncheckedIndexedAccess: true`,
  `noImplicitOverride: true`, `noFallthroughCasesInSwitch: true`,
  `noPropertyAccessFromIndexSignature: true`
- **Kein `any`** ohne `// eslint-disable-next-line @typescript-eslint/no-explicit-any`
  *plus* einzeiligen Kommentar mit Begründung
- **Kein `unknown`** ohne explizite Type-Narrowing-Schritte
- **Kein `as` cast** ohne Kommentar (außer bei `as const`)
- **Keine non-null assertion** `!` ohne Kommentar (Engine: niemals; sonst nur an HA-Boundary)

### 11.3 Test-Driven für die Engine

Reihenfolge in Phase 1:
1. `engine/types.ts` schreiben
2. **Tests** in `engine/energy-engine.test.ts` für Edge-Case 1 schreiben
3. Engine-Code so weit implementieren, dass Edge-Case 1 grün ist
4. Edge-Case 2 hinzufügen, Engine erweitern, …
5. Bis alle 16 Edge-Cases grün sind
6. Coverage prüfen, nachbessern wo < 90 %

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
    'import/no-restricted-paths': ['error', {
      zones: [
        { target: './src/engine', from: './src', except: ['./engine'] },
        { target: './src/config', from: './src', except: ['./config'] },
        { target: './src/render', from: './src',
          except: ['./render', './engine/types.ts'] },
        { target: './src/ha', from: './src',
          except: ['./ha', './config/types.ts', './engine/types.ts'] },
      ],
    }],
    '@typescript-eslint/no-explicit-any': 'error',
    '@typescript-eslint/no-non-null-assertion': 'error',
    '@typescript-eslint/explicit-function-return-type': ['error', {
      allowExpressions: true,
    }],
  },
};
```

### 11.5 Anti-Patterns (nicht erlaubt)

- ❌ **God-Class in card.ts.** Card.ts delegiert; sie baut keine SVG-Strings,
  parst keine Sensoren direkt, enthält keine Mathematik. ≤ 200 LOC.
- ❌ **SVG-String-Konkatenation.** Renderer arbeitet mit Lit-`html`-Templates,
  keine `'<circle r="' + r + '">'`-Konstruktionen.
- ❌ **Externe DOM-Libs.** Kein jQuery, kein D3, kein anime.js — Lit + native CSS reicht.
- ❌ **Eigenes State-Management.** Keine Redux/MobX/Zustand. Lit-`@property` und
  pure compute-Funktionen reichen.
- ❌ **Side-Effects in der Engine.** Kein `console.log` außer hinter
  `if (process.env.NODE_ENV !== 'production')`-Guard.
- ❌ **Kommentare die WAS sagen.** Code soll selbsterklärend sein. Nur
  WARUM-Kommentare bei nicht-offensichtlichen Entscheidungen (Workarounds,
  Performance-Tricks, Sensor-Quirks).
- ❌ **Kein TODO-Kommentar bleibt im Release.** Entweder fixed oder als
  Issue/Spec-Punkt verschoben.

### 11.6 Datei-Layout

- Eine Datei = ein klar abgegrenztes Konzept
- Test-File neben der zu testenden Datei (`foo.ts` + `foo.test.ts`)
- Keine `index.ts`-Re-Exports innerhalb von Modulen (außer `src/index.ts` für
  die Card-Registrierung). Imports zeigen direkt auf die Quelle.

### 11.7 Pull-Request-Disziplin (intern)

Auch ohne externe Reviewer:
- Jede Phase aus §8 wird als eigener Commit (oder Branch) abgeschlossen
- Commit-Message folgt Conventional Commits: `feat(engine): …`, `test(config): …`
- Phase-Übergang nur, wenn `pnpm check` grün
- Keine "WIP"-Commits im Hauptzweig

## 12. Glossar

| Begriff | Bedeutung |
|---|---|
| **Pairing** | 1:1-Zuordnung einer Battery zu einer PV (`charged_by`) |
| **Pairing-Defizit** | charge[j] − P_pv→batt[i] > 0; PV reicht nicht zum Akku-Laden |
| **Reconcile** | Anpassung der berechneten Per-Source-Flüsse an Netz-Sensor-Realität |
| **Anteils-Ring** | Doughnut um Haus-Knoten, zeigt Quellen-Verteilung |
| **Active flow** | Pfad mit `power > display.active_threshold_w` |
| **Greenfield** | Frisches Repo ohne Bestandscode |
