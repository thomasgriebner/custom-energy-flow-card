# Architecture Overview

> **Lebendiges Dokument.** Bei jeder größeren Architektur-Änderung
> hier mit-pflegen _und_ einen ADR unter [`adr/`](./adr/) anlegen.
>
> Vollständige Spezifikation: [`specs/2026-05-10-custom-energy-flow-card-design.md`](./specs/2026-05-10-custom-energy-flow-card-design.md).

## 1. Was wir bauen

Eine Lovelace-Custom-Card für Home Assistant, die den Live-Energiefluss eines
Mehr-Quellen-Haushalts visualisiert (N PV-Anlagen, N Akkus, N Verbraucher, 1
Netz, 1 Haus). Aufgebaut als TypeScript + Lit 3 Single-File-Bundle, verteilt
via HACS.

## 2. Layer-Architektur

Sieben Schichten mit klaren Aufgaben und **lint-erzwungenen** Import-Grenzen
(siehe [ADR-0002](./adr/0002-layered-modular-architecture.md),
[ADR-0009](./adr/0009-eslint-enforced-layer-boundaries.md)):

```
┌──────────────────────────────────────────────────────────────┐
│  card.ts  (Orchestrator, ≤ 200 LOC)                          │
│  • komponiert alle Layer, kennt HA-Lifecycle                 │
└──────────┬─────────────┬──────────────┬─────────────┬────────┘
           │             │              │             │
           ▼             ▼              ▼             ▼
  ┌────────────┐ ┌──────────────┐ ┌──────────┐ ┌──────────┐
  │  config/   │ │   engine/    │ │ render/  │ │   ha/    │
  │            │ │              │ │          │ │          │
  │ Validation │ │ Energie-     │ │ SVG +    │ │ HA-event │
  │ + Mapping  │ │ Bilanz       │ │ Animation│ │ Helper   │
  │ HA→State   │ │ (pure)       │ │ (Lit)    │ │          │
  └─────┬──────┘ └──────┬───────┘ └────┬─────┘ └────┬─────┘
        │               │              │             │
        └───────┬───────┴──────────────┴─────────────┘
                ▼                              │
       ┌────────────────┐                      │
       │     util/      │                      │
       │ format-power   │                      │
       │ resolve-color  │  ◀──────────────────┘
       │ read-sensor    │
       │ svg-path       │
       │ memo           │
       └────────────────┘
                ▲
                │
       ┌────────────────┐
       │     i18n/      │
       │   de.ts + en.ts│  (alle User-Strings DE + EN;
       │   index.ts     │   resolveT(lang) Factory + langFromHass(hass))
       └────────────────┘

       ┌────────────────┐
       │   editor.ts    │  (eigener LitElement, parallele Schicht zu card.ts)
       └────────────────┘
```

| Layer           | Aufgabe                                                                       | Darf importieren                        | Darf NICHT                     |
| --------------- | ----------------------------------------------------------------------------- | --------------------------------------- | ------------------------------ |
| **`util/`**     | Wiederverwendbare Helfer (Formatierung, Sensor-Lesen, SVG-Pfade, Memoization) | nur eigene Files                        | alles andere                   |
| **`i18n/`**     | Anwender-Strings                                                              | nur eigene Files                        | alles andere                   |
| **`engine/`**   | Pure Energie-Bilanz-Berechnung                                                | `engine/types.ts`, `util/memo`          | Lit, HA, Renderer, Config, DOM |
| **`config/`**   | Schema-Validation, `buildSystemState`, `derive-display-consumers`             | `util/*`, `engine/types`, `i18n/*`      | Lit, Renderer, Engine-Logik    |
| **`render/`**   | SVG-Rendering, CSS-Animation, `battery-ring`, Icon-Rendering (`icon.ts`)      | `util/*`, `engine/types`, `i18n/*`, Lit | HA, Engine-Logik               |
| **`ha/`**       | HA-Event-Helfer, HA-Type-Skelett                                              | Lit, externe HA-Typen                   | Engine, Renderer, Config-Logik |
| **`card.ts`**   | LitElement-Orchestrator                                                       | alles                                   | –                              |
| **`editor.ts`** | Lovelace-Editor-LitElement                                                    | `config/*`, `ha/*`, `util/*`, `i18n/*`  | Engine, Renderer               |

**Konkrete Modulaufteilung im Repo:** siehe Spec §2.2.

## 3. Datenfluss

```
HA hass.states  ─→  card.ts liest Sensor-Werte (via util/read-sensor)
                ↓
          buildSystemState(config, hass)        ← config/system-state.ts
                ↓
          EnergyEngine.compute(SystemState)     ← engine/energy-engine.ts
                ↓                                 (pure function)
          computeLayout(config, displayConsumers) ← render/layout.ts
                ↓                                 (memoized)
          renderCard(layout, FlowResult, ctx)   ← render/flow-renderer.ts
                ↓                                 (delegiert renderNode → render/node-renderer.ts;
                ↓                                  RenderContext-Typ in render/context.ts)
          SVG mit CSS-Animation (offset-path)
```

Lit-Lifecycle:

- `setConfig()` → Validation (wirft bei invalid)
- `firstUpdated()` → ResizeObserver, einmalige Setup
- `willUpdate()` → Engine-Compute, FlowResult-Diff (try/catch für Crash-Resilienz)
- `render()` → nur Lit-Templates, keine Berechnung
- `disconnectedCallback()` → ResizeObserver disconnect

Siehe [ADR-0004](./adr/0004-pure-functions-engine.md),
[ADR-0005](./adr/0005-css-offset-path-animation.md) für Begründungen.

## 4. Zentrale Architektur-Entscheidungen

| ADR                                                          | Entscheidung                                                  | Kurz-Begründung                                                              |
| ------------------------------------------------------------ | ------------------------------------------------------------- | ---------------------------------------------------------------------------- |
| [0001](./adr/0001-greenfield-not-fork.md)                    | Greenfield neu bauen, nicht power-flow-card-plus forken       | Multi-Source-Fähigkeit braucht andere Architektur als Single-Source-Vorlage  |
| [0002](./adr/0002-layered-modular-architecture.md)           | 7 Layer mit klaren Aufgaben                                   | Testbar, wartbar, refactoring-sicher                                         |
| [0003](./adr/0003-typescript-lit-rollup.md)                  | TypeScript + Lit 3 + Rollup                                   | Konsistent mit HA-Card-Ökosystem, schlankes Bundle                           |
| [0004](./adr/0004-pure-functions-engine.md)                  | Engine = pure functions, keine Klassen                        | Tabellen-getriebene Tests, kein verstecktes State                            |
| [0005](./adr/0005-css-offset-path-animation.md)              | CSS `offset-path` statt SVG `<animateMotion>`                 | CSS-Variable updateable, Performance                                         |
| [0006](./adr/0006-strict-1-to-1-pv-battery-pairing.md)       | Akku ↔ PV strikt 1:1                                          | Spiegelt physische Realität der Hybrid-Wechselrichter                        |
| [0007](./adr/0007-energy-balance-with-reconcile.md)          | Bilanz + Netz-Sensor-Reconcile                                | Kompensiert Sensor-Latenz, Netz-Sensor als ground truth                      |
| [0008](./adr/0008-manual-list-editor.md)                     | Listen im Editor manuell mit Lit                              | `ha-form` unterstützt Listen-Editing nicht zuverlässig                       |
| [0009](./adr/0009-eslint-enforced-layer-boundaries.md)       | ESLint `no-restricted-paths` als CI-Gate                      | Layer-Boundaries dokumentieren _und_ erzwingen                               |
| [0010](./adr/0010-shared-util-module.md)                     | Single-Source-Util-Modul                                      | Format-/Sensor-/Color-Logik niemals doppelt                                  |
| [0011](./adr/0011-shouldupdate-over-property-haschanged.md)  | `shouldUpdate` statt `@property hasChanged`                   | Lit's hasChanged-Callback hat kein `this`-Binding                            |
| [0012](./adr/0012-headless-smoke-test-pre-release-gate.md)   | Headless Smoke-Test als Pre-Release-Gate                      | Class-Load-Crashes vor Live-Install fangen, da kein HA-Test-Environment      |
| [0013](./adr/0013-v0-9-0-first-release-strategy.md)          | v0.9.0 first, v1.0.0 nach Stabilisierung                      | Realistische Erwartungen + semver-konforme Bug-Fix-Releases                  |
| [0014](./adr/0014-stub-config-validates-as-valid.md)         | HA-Stub-Config gilt als valide                                | Card-Picker funktioniert beim ersten Add, eine Validation für Card+Editor    |
| [0015](./adr/0015-split-charge-discharge-battery-sensors.md) | Akku akzeptiert zwei getrennte charge/discharge Sensoren      | Reale Wechselrichter liefern oft getrennte Sensoren statt einem signierten   |
| [0016](./adr/0016-ha-area-grouping.md)                       | HA-Area-basierte Verbraucher-Gruppierung                      | Aggregiert 10–20 Smart-Plug-Sensoren auf lesbare 5–7 Knoten ohne YAML-Pflege |
| [0017](./adr/0017-adaptive-svg-layout.md)                    | Quellen-Cluster + Consumer-Arc Layout                         | Skaliert bis N=8 Verbraucher ohne ViewBox-Überschreitung (16:9, Arc-Bogen)   |
| [0018](./adr/0018-ha-dashboard-layout-api.md)                | HA-Dashboard-Layout-API (`getGridOptions`) immer aktiv        | superseded — Slider-Bounds erwiesen sich als künstliche Einschränkung        |
| [0019](./adr/0019-aspect-16-9-no-grid-options.md)            | ViewBox-Aspect 16:9 + Entfernung HA-Dashboard-Layout-API      | Card nutzt HA-Dashboard-Breite ohne Letterbox, Slider ohne künstliches Cap   |
| [0020](./adr/0020-ha-icon-via-foreignobject.md)              | `<ha-icon>` via `<foreignObject>` statt inline `mdi-paths.ts` | Dynamische User-/Area-Icons + null Wartungslast (Subspec 2026-05-13)         |
| [0021](./adr/0021-code-review-workflow-pre-release-gate.md)  | Code-Review-Workflow als Pre-Release-Quality-Gate             | 6 Brillen + KPI-Skript + Lessons-Pipeline (Subspec 2026-05-15)               |
| [0022](./adr/0022-bundle-budget-60-to-64-kib.md)             | Bundle-Budget 60 KiB → 64 KiB                                 | superseded by ADR-0024                                                       |
| [0023](./adr/0023-i18n-via-hass-locale.md)                   | i18n via HA-Locale (DE/EN) mit resolveT-Factory               | Auto-Sprachwechsel über `hass.locale.language`, kein Modul-Singleton         |
| [0024](./adr/0024-bundle-budget-64-to-80-kib.md)             | Bundle-Budget 64 KiB → 80 KiB                                 | i18n-Headroom für 4–5 weitere Sprachen (FR/ES/IT/…) ohne Re-Bump             |

## 5. Konventionen kurz

- **TypeScript strict** + `noUncheckedIndexedAccess`. Kein `any` ohne
  Begründung. Spec §11.2.
- **Pure Functions** für `engine/`. Keine Klassen mit State. Spec §11.1.
- **Test-Driven** für Engine. Edge-Cases zuerst. Spec §11.3.
- **Schicht-Imports** lint-enforced. Spec §11.4.
- **Anti-Patterns** (god-class, SVG-Strings, eigene State-Lib, …). Spec §11.5.
- **Pre-Commit-Hook** mit lint-staged. Spec §11.8.
- **Bundle ≤ `BUNDLE_BUDGET_BYTES`** (`scripts/kpi.mjs:29`, aktuell 80 KiB seit ADR-0024; war 64 KiB ADR-0022, 60 KiB ADR-0013).

## 6. Wie wir erweitern

### Neuer Knoten-Typ (z. B. „EV-Ladestation als eigene Quelle")

1. ADR anlegen (`adr/00XX-…md`), das die Topologie-Erweiterung begründet
2. `config/types.ts` und `engine/types.ts` um neuen State erweitern
3. `engine/energy-engine.ts` um neue Pfade ergänzen + Tests
4. `render/layout.ts` um Position erweitern
5. Editor-Sektion in `editor.ts`
6. Sandbox-Szenarien in `examples/preview-mocks.ts` ergänzen
7. README + dieses Dokument aktualisieren

### Neuer Util-Helfer

- nur in `util/`, nie inline im Renderer/Card/Editor
- mit Test-File neben der Implementation
- siehe [ADR-0010](./adr/0010-shared-util-module.md)

### Tech-Stack-Änderung (z. B. Tool-Upgrade)

- ADR mit Status `proposed`
- Implementation in eigenem Branch
- ADR-Status auf `accepted` nach Code-Review

## 7. Was wir bewusst nicht tun

- **Kein Server-State.** Card ist rein client-side, liest aus `hass.states`
- **Kein eigener State-Manager.** Lit-`@property` reicht
- **Keine externen DOM-Libs.** Lit + native Browser-APIs reichen
- **Kein i18n-Framework.** Strings in `i18n/de.ts`, manuelle Übersetzung in v1.x
- **Kein Dark-Theme manuell.** HA-CSS-Variablen folgen automatisch
- **Keine Energie-Statistik.** HA hat eigene Energy-Cards dafür

## 8. Referenz-Dokumente

- **Vollständige Spec:** [`specs/2026-05-10-custom-energy-flow-card-design.md`](./specs/2026-05-10-custom-energy-flow-card-design.md)
- **ADRs:** [`adr/`](./adr/) (Index in [`adr/README.md`](./adr/README.md))
- **Code-/Workflow-Konventionen:** [`conventions.md`](./conventions.md)
- **Projekt-Schnellreferenz** (Tech-Stack, Doku-Karte): [`../CLAUDE.md`](../CLAUDE.md)
- **Code-Qualitäts-Standards:** Spec §11
- **Erfolgs-Kriterien:** Spec §10
