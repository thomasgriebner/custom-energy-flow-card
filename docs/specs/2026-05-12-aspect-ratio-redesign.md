# Subspec — ViewBox-Aspect 16:9 + Entfernung getGridOptions

**Status:** v1 (proposed, ready for plan)
**Datum:** 2026-05-12
**Autor:** Brainstorming-Session mit @griebner
**Verlinkte Hauptspec:** [`2026-05-10-custom-energy-flow-card-design.md`](./2026-05-10-custom-energy-flow-card-design.md)
**Verlinkte Subspec:** [`2026-05-11-consumer-grouping-and-layout.md`](./2026-05-11-consumer-grouping-and-layout.md) (§6.1 und §6.2 werden durch diese Spec abgelöst)
**Berührte ADRs:** 0017 (Update Geometrie-Werte), 0018 (Supersede), 0019 (Neu)

## 0. Zusammenfassung

Zwei verkettete Änderungen, die das Erscheinungsbild der Card im HA-Dashboard verbessern:

1. **ViewBox-Aspect 820:540 (≈1.52:1) → 960:540 (16:9, 1.78:1)** — die Card nutzt den horizontalen Platz im HA-Grid effektiv aus statt mit Letterbox aufzufallen. Höhe bleibt gleich, Breite +17 %.
2. **Entfernung `getGridOptions()` und `getCardSize()`** — die in [ADR-0018](../adr/0018-ha-dashboard-layout-api.md) deklarierten Slider-Bounds (`max_columns: 12`, `max_rows: 8`) deckeln den HA-Layout-Slider künstlich. Ohne diese Methoden nutzt HA seinen nativen Layout-Mechanismus, der die natürliche Maximalbreite der Section/Dashboard-Konfiguration respektiert.

Die Arc-Geometrie aus [ADR-0017](../adr/0017-adaptive-svg-layout.md) bleibt strukturell erhalten — nur Maßzahlen werden auf den neuen viewBox skaliert. Der Bogen wird ausladender (R 275 → 350) und nutzt den neuen Platz.

### 0.1 Treiber

- User-Beobachtung (2026-05-12): Mit den `getGridOptions`-Limits kann die Card-Breite nur bis Slider-Wert 12 gezogen werden — das war vorher unbeschränkt. Die Card wirkt im Dashboard zu klein.
- ViewBox 820:540 (Aspect ≈1.52:1) erzeugt in typischen HA-Slots (12×8 = 2.36:1) sichtbaren Letterbox links/rechts von 300+ px.
- 16:9 ist ein in HA verbreiteter Aspect und fits 12×9 / 12×10 Slots sehr gut.

### 0.2 Harte Constraints für den Planer

| Constraint                                               | Quelle                | Konsequenz                                                            |
| -------------------------------------------------------- | --------------------- | --------------------------------------------------------------------- |
| Arc muss N=8 ohne Knoten-Überlappung tragen              | ADR-0017              | Bei R=350, α=42°, step=12°: center-dist 73 px, gap 25 px ✓            |
| Arc muss N=8 ohne viewBox-Überschreitung                 | ADR-0017              | Top-Edge y=12 (vs 0), Bottom-Edge y=528 (vs 540) ✓                    |
| Engine = pure functions, kein hass, kein DOM, kein State | ADR-0004, CLAUDE.md 1 | Engine bleibt unangetastet — kein Engine-Code-Edit erlaubt            |
| Single-Source `util/` für geteilte Konstanten + Helfer   | ADR-0010, CLAUDE.md 2 | `VIEWBOX` bleibt in `const.ts` als einzige Quelle, keine Doppelung    |
| `card.ts` ≤ 200 LOC                                      | CLAUDE.md 3           | Streichung `getGridOptions/getCardSize` _reduziert_ LOC — kein Risiko |
| Keine `any` ohne Begründungs-Kommentar                   | CLAUDE.md 4           | Bei Code-Anpassung beachten; TypeScript-strict bleibt                 |
| Berechnung in `willUpdate`, niemals `render`             | CLAUDE.md 5           | Lifecycle bleibt unverändert — kein Edit an `willUpdate/render`-Logik |
| Custom `hasChanged`/`shouldUpdate` für `hass`            | ADR-0011, CLAUDE.md 6 | Unangetastet                                                          |
| Crash-Resilient: try/catch + Fallback-UI                 | CLAUDE.md 7           | Konstanten-Update kann nicht crashen — kein neuer Error-Path          |
| Strings aus `i18n/de.ts`                                 | CLAUDE.md 8           | Keine neuen User-facing-Strings — Constraint nicht aktiv berührt      |
| TDD für Engine/Util/Config, ≥ 90% Coverage               | CLAUDE.md 9           | Für Layout-Konstanten: Test-Update vor Code-Update (siehe §3.0)       |
| HA-Custom-Elements (`ha-form`, ...) NICHT importieren    | CLAUDE.md 10          | Nicht berührt                                                         |
| Layer-Boundaries via ESLint `no-restricted-paths`        | ADR-0009              | Keine neuen Layer-Cross-Imports einführen                             |
| Pre-Release-Smoke-Test grün                              | ADR-0012              | MUSS mit neuer Geometrie bestanden werden                             |
| Bundle-Budget ≤ 60 kB minified                           | CLAUDE.md Tech-Stack  | Streichung von Methoden _reduziert_ Bundle — kein Risiko              |

**Weitere verbindliche Lese-Quellen für den Planer:**

- `CLAUDE.md` (Projekt-Schnellreferenz, Workflow-Regeln, Anti-Patterns)
- `docs/conventions.md` (Code-Stil, Naming, Commit-Konventionen)
- `docs/architecture.md` (lebendige Architektur-Übersicht, Module-Map §2)
- Alle in obiger Tabelle referenzierten ADRs

### 0.3 Architektur-Kontext für den Planer

Diese Änderung berührt AUSSCHLIESSLICH folgende Layer:

| Layer     | Datei                  | Art der Änderung                                           |
| --------- | ---------------------- | ---------------------------------------------------------- |
| `util/`   | `src/const.ts`         | Konstanten-Update (`VIEWBOX.width`, `CARD_VERSION`)        |
| `render/` | `src/render/layout.ts` | Konstanten-Update + `sourceClusterXs`-Hardcodes + Comments |
| `card/`   | `src/card.ts`          | Subtraktiv: Methoden-Streichung                            |

**NICHT zu berührende Layer** (Verstoß bricht CI via ESLint `no-restricted-paths`):

- `engine/` — pure Energiebilanz, kein DOM, kein hass
- `config/` — Schema-Validation, `deriveDisplayConsumers` (ADR-0016)
- `ha/` — HA-Event-Helfer, Type-Skelett
- `i18n/` — keine neuen Strings nötig
- `editor.ts` — Lovelace-GUI-Editor (separater LitElement)

**Single-Source-Regeln (ADR-0010, CLAUDE.md 2):**

- `VIEWBOX` ist ausschließlich in `src/const.ts` definiert. Tests dürfen die Werte importieren, NICHT re-deklarieren.
- `MIDDLE_Y` ist in `src/render/layout.ts:35` definiert — Magic-Number `270` in `computeEdges` (Line 161) MUSS durch Konstante ersetzt werden (siehe §2.1).

**Code-Style (`docs/conventions.md`):**

- Strict TypeScript (kein `any` ohne Begründungskommentar)
- ESLint + Prettier auf jeder Datei (pre-commit-hook)
- Commit-Message-Style siehe `git log` (Conventional Commits: `feat:`, `fix:`, `refactor:`, `docs:`, `chore:`)

### 0.4 Konzept-Modell: Datenfluss-Pipeline

Wichtig damit der Planer versteht, _welcher_ Schritt durch diese Spec berührt wird (nur der letzte! Layout-Geometrie):

```
HA hass.states ─┐
                ├─► buildSystemState(config, hass) ─► SystemState ─► engine.compute() ─► FlowResult
config         ─┘                                                         (pure)            │
                                                                                            │
displayConsumers ─────────────────────────────► computeLayout(config, dc) ─► LayoutResult ──┤
                                                  (← betroffen)                             │
                                                                                            ▼
                                                                              renderCard(layout, flow, ctx)
                                                                                  (Lit-Templates → SVG)
```

**Pflicht-Wissen:**

- `engine/` kennt nur Power-Werte (SystemState) und produziert nur Power-Werte (FlowResult). **Kennt keine Geometrie.**
- `render/layout.ts` kennt nur die Knoten-Topologie (`config` + `displayConsumers`) und produziert nur Positionen + Pfade. **Kennt keine Power-Werte.**
- `flow-renderer.ts` ist der **erste und einzige Punkt**, an dem Layout (Geometrie) und FlowResult (Power) zusammenkommen.
- Diese Trennung muss der Planer respektieren — keine Power-Werte in `layout.ts`, keine Geometrie in `engine/`.

### 0.5 Lit-Lifecycle (`card.ts`)

```
setConfig(yaml)     ─► validateConfig ─► this._config = ... (sync)
hass = newHass      ─► shouldUpdate(prev, new)
                         ├─ false: skip (kein relevanter Sensor-Change) ✓ Performance-Optimierung
                         └─ true: ↓
                       willUpdate(): buildCardState → engine.compute → computeLayout
                                     Side-effects: this._flowResult = ..., this._layout = ...
                                     Bei Crash: try/catch + Fallback-UI (CLAUDE.md 7)
                       render(): produces TemplateResult (PURE — keine this._x = ...)
```

**Pflicht-Wissen:**

- `shouldUpdate` (ADR-0011) statt `@property hasChanged`, weil hasChanged keinen `this`-Zugriff hat → kann `this._config` nicht lesen → könnte nicht entscheiden welche Sensoren relevant sind
- `willUpdate` ist der einzige Punkt für Berechnung-Side-Effects (CLAUDE.md 5)
- `render` ist PURE — Berechnung dort produziert Inkonsistenzen mit Lit's Render-Lifecycle
- Bei dieser Spec werden `shouldUpdate`/`willUpdate`/`render` NICHT angefasst — nur `getGridOptions`/`getCardSize` gestrichen

### 0.6 Don't-Touch-Liste (semantisch korrekt, robust gegen Geometrie-Änderung)

| Element                                       | Wo                                           | Warum nicht anfassen                                                                 |
| --------------------------------------------- | -------------------------------------------- | ------------------------------------------------------------------------------------ |
| `TAB_ORDER = [pv,grid,battery,consumer,home]` | `flow-renderer.ts:13`                        | Reihenfolge ist semantisch (Knoten-Typ), nicht räumlich — robust gegen Layout-Change |
| `aria-label` auf Nodes/Edges                  | `node-renderer.ts:75`, `flow-renderer.ts:37` | Accessibility, semantisch                                                            |
| `prefers-reduced-motion`-CSS                  | `flow-animation.ts:84-90`                    | Respektiert User-OS-Setting automatisch                                              |
| `MIN_CONTAINER_WIDTH_PX = 280`                | `src/const.ts:21`                            | Narrow-Banner-Schwelle, container-bezogen (nicht viewBox)                            |
| `_containerW = 720` Initial-Wert              | `src/card.ts:38`                             | Vor-ResizeObserver-Default; korrigiert sich in ≤1 Frame                              |
| `data-power="${power}"` auf Edges             | `flow-renderer.ts:128,144`                   | Externe Inspektions-Hook (DevTools/Smoke-Test); Geometrie-Change verändert nur Werte |
| `memoLayout` (historisch)                     | wurde in `card.ts` entfernt                  | Bewusste Entscheidung (Subspec 2026-05-11 §6.3) — NICHT reintroducieren              |
| `shouldUpdate`/`willUpdate`/`render`          | `src/card.ts:114-193`                        | Lifecycle-Logik unverändert                                                          |
| Engine, Config-Schema, i18n, Editor           | alle entsprechenden Dateien                  | siehe §0.3                                                                           |

### 0.7 Engine-Warnings statt Throws (Konvention)

Wenn der Planer beim Refactoring auf eine Daten-Inkonsistenz stößt (fehlender Sensor, NaN, etc.): **niemals throwen**. Stattdessen eine `EngineWarning` produzieren (Typ in `src/util/warning-types.ts`). Erscheint automatisch im Diagnose-Icon — kein Extra-Renderer-Code nötig. Bei dieser Spec wird es nicht aktiv getriggert, aber wenn ein Edge-Case auftaucht, ist das die Konvention.

## 1. Geometrie-Werte

### 1.1 ViewBox

| Konstante        | Heute | Neu | Datei                           |
| ---------------- | ----- | --- | ------------------------------- |
| `VIEWBOX.width`  | 820   | 960 | `src/const.ts:20`               |
| `VIEWBOX.height` | 540   | 540 | `src/const.ts:20` (unverändert) |

**Aspect-Ratio:** 1.78:1 (16:9). Verifizierter HA-Slot-Fit:

| HA-Slot | px (88×56 grid) | Aspect-px | Letterbox bei 960×540 |
| ------- | --------------- | --------- | --------------------- |
| 12×9    | 1056×504        | 2.10      | minimal (~16 px L/R)  |
| 12×10   | 1056×560        | 1.89      | optimal               |
| 12×8    | 1056×448        | 2.36      | ~60 px L/R Letterbox  |
| 12×7    | 1056×392        | 2.69      | ~120 px L/R Letterbox |

Bei `preserveAspectRatio="xMidYMid meet"` (`flow-renderer.ts:34`, unverändert) skaliert SVG proportional. Der User wählt selbst per HA-Layout-Editor die Höhe, die zur Card-Aspect passt.

### 1.2 Layout-Konstanten

> **NB (2026-05-15):** Die in dieser Tabelle als „unverändert" markierten
> `NODE_R_*`-Werte (PV/Batt 34, Consumer 24, Grid 32) wurden in Subspec
> 2026-05-15 angepasst (auf 42/28/40). Siehe
> [`docs/specs/2026-05-15-icon-positionierung-und-kreis-skalierung.md`](./2026-05-15-icon-positionierung-und-kreis-skalierung.md) §3.2.

| Konstante                       | Heute       | Neu         | Datei                                   |
| ------------------------------- | ----------- | ----------- | --------------------------------------- |
| `HOME_X`                        | 380         | 480         | `src/render/layout.ts:37`               |
| `GRID_X`                        | 60          | 60          | `src/render/layout.ts:36` (unverändert) |
| `SOURCE_X_MIN`                  | 130         | 200         | `src/render/layout.ts:38`               |
| `SOURCE_X_MAX`                  | 440         | 560         | `src/render/layout.ts:39`               |
| `CONSUMER_ARC_R`                | 275         | 350         | `src/render/layout.ts:40`               |
| `CONSUMER_ARC_MAX_DEG`          | 42          | 42          | `src/render/layout.ts:45` (unverändert) |
| `CONSUMER_ARC_STEP_DEG`         | 14          | 14          | `src/render/layout.ts:49` (unverändert) |
| `TOP_Y`/`MIDDLE_Y`/`BOTTOM_Y`   | 80/270/460  | 80/270/460  | (unverändert)                           |
| `NODE_R_*` (alle Knoten-Radien) | unverändert | unverändert | `src/render/layout.ts:29-32`            |

### 1.3 Hardcoded `sourceClusterXs`-Positionen

Funktion `sourceClusterXs(n)` in `src/render/layout.ts:97-103`. Alle hardcoded Positionen werden so verschoben, dass sie um das neue `HOME_X=480` flankieren (statt um das alte 380):

| n   | Heute                                            | Neu                    |
| --- | ------------------------------------------------ | ---------------------- |
| 1   | `[180]`                                          | `[280]`                |
| 2   | `[180, 440]`                                     | `[250, 560]`           |
| 3   | `[130, 290, 440]`                                | `[200, 380, 560]`      |
| 4   | `[130, 230, 330, 440]`                           | `[200, 320, 440, 560]` |
| ≥5  | `SOURCE_X_MIN..SOURCE_X_MAX` linear interpoliert | dito (Konstanten neu)  |

**Begründung der Verschiebung:**

- Die "rechteste" Source-Position rückt auf 560 (war 440) — bleibt damit weiter rechts vom neuen Home (480) als zuvor (alt: 440 = 60 px rechts von 380 = Home). Konsistente Flanken-Geometrie.
- Die "linkeste" Position rückt von 130 auf 200 — gibt mehr Luft zwischen Grid (60) und linker Source.

### 1.4 Verifizierte Constraints bei neuen Werten

**N=8 Verbraucher-Arc:**

- α_max = min(42°, (N-1)·14°/2) = min(42°, 49°) = 42° (Cap aktiv wie heute)
- Step real = 84°/(8-1) = 12°
- Center-Distanz = 2·R·sin(6°) = 2·350·0.1045 = 73 px
- Consumer-Durchmesser = 48 px → **Gap = 25 px** (heute 9.5 px — _deutlich komfortabler_)

**Vertikale Begrenzung Verbraucher:**

- Top-Verbraucher y = 270 - 350·sin(42°) = 270 - 234 = 36
- Top-Edge = 36 - 24 = 12 → 12 px Margin zu viewBox-Top (heute 62 px — _enger, aber sicher_)
- Bottom symmetrisch: 540 - 528 = 12 px

**Horizontale Begrenzung Verbraucher:**

- Verbraucher max x bei α=0: 480 + 350 = 830
- Verbraucher Edge = 830 + 24 = 854
- Right-Margin = 960 - 854 = **106 px** (Platz für Diagnose-Icon top-right bei `translate(width-30, 30)`)

**Margin-Balance:**

- Links: Grid-Edge bei x = 60-32 = 28 px Margin
- Rechts: 106 px Margin (vor: 28/141 — neu deutlich balancierter)

## 2. Code-Änderungen

### 2.1 Datei-Übersicht

| Datei                                                   | Art   | Änderung                                                                                                 |
| ------------------------------------------------------- | ----- | -------------------------------------------------------------------------------------------------------- |
| `src/const.ts:3`                                        | edit  | `CARD_VERSION: '0.10.0' → '0.11.0'` (Minor-Bump, Breaking Visual Change — siehe §5.3)                    |
| `src/const.ts:20`                                       | edit  | `VIEWBOX.width: 820 → 960`                                                                               |
| `src/render/layout.ts:36-49`                            | edit  | Konstanten `HOME_X`, `SOURCE_X_MIN/MAX`, `CONSUMER_ARC_R` neu setzen                                     |
| `src/render/layout.ts:41-44`                            | edit  | Comment-Block zum 42°-Cap an neue Geometrie anpassen (Top-Edge 12 px statt 62 px, PV-Position-Werte)     |
| `src/render/layout.ts:46-48`                            | edit  | Comment-Block zum Step-Gap an neue Werte (Gap 25 px statt 9.5 px für N=8 bei R=350)                      |
| `src/render/layout.ts:97-103`                           | edit  | `sourceClusterXs` hardcoded Positionen für n=1..4 verschieben (siehe §1.3-Tabelle)                       |
| `src/render/layout.ts:150,182,202`                      | edit  | Magic-Number `80` (Bezier-y-Offset für PV/Battery↔Grid) — visuell verifizieren, ggf. anpassen            |
| `src/render/layout.ts:161`                              | edit  | **Magic-Number `y: 270`** durch `y: MIDDLE_Y` ersetzen (Single-Source, ADR-0010)                         |
| `src/render/layout.ts:175`                              | edit  | `midpoint(battNode, homeNode, -30)` y-Offset `-30` visuell verifizieren bei neuen Source-Positionen      |
| `src/render/layout.test.ts:22-26`                       | edit  | Erwartung `viewBox.width: 820 → 960`                                                                     |
| `src/render/layout.test.ts:28-32`                       | edit  | Erwartung `home.x: 380 → 480`                                                                            |
| `src/render/layout.test.ts:42-49`                       | edit  | Test-Cases für `sourceClusterXs(n)` mit neuen erwarteten Positionen (siehe §3.1)                         |
| `src/render/layout.test.ts:78-117`                      | edit  | Arc-Tests: `R=275 → 350`, viewBox-Bound-Check bleibt strukturell gleich                                  |
| `src/card.ts:71-91`                                     | edit  | **Komplette Streichung** `getGridOptions()` und `getCardSize()` (siehe §2.2)                             |
| `src/render/flow-renderer.ts:62`                        | check | `translate(${layout.width - 30} 30)` — automatisch korrekt durch `layout.width`-Variable, keine Änderung |
| `docs/adr/0017-adaptive-svg-layout.md`                  | edit  | viewBox/Home/Arc-Werte in §"Entscheidung" aktualisieren + alte Drift (25°→42°, 7°→14°) korrigieren       |
| `docs/adr/0018-ha-dashboard-layout-api.md`              | edit  | Status: `accepted → superseded by ADR-0019` + einleitender Hinweis-Block (siehe §4.2)                    |
| `docs/adr/0019-aspect-16-9-no-grid-options.md`          | new   | Neuer ADR (Stub in §4.3 — Planer übernimmt Stub 1:1)                                                     |
| `docs/adr/README.md`                                    | edit  | ADR-Index um 0019 erweitern, 0018 als superseded markieren                                               |
| `docs/specs/2026-05-11-consumer-grouping-and-layout.md` | edit  | §6.1 und §6.2 mit "superseded by ADR-0019"-Hinweis-Block (siehe §4.4)                                    |
| `docs/architecture.md:80`                               | edit  | Stale Signatur fixen: `Layout.compute(config, viewBox)` → `computeLayout(config, displayConsumers)`      |
| `docs/architecture.md`                                  | edit  | §4 ADR-Tabelle: 0018 als superseded, 0019 neu + Hinweis "Geometrie-Single-Source: VIEWBOX in const.ts"   |
| `README.md`                                             | edit  | Changelog-Eintrag für 0.11.0 (Before/After-Hinweis, HACS-Cache-Hinweis) — siehe §5.3                     |
| `docs/screenshots/individual-consumers.png`             | regen | Neu erzeugen via `pnpm preview` + Browser-Screenshot (siehe §3.3 Schritt 8)                              |
| `docs/screenshots/by-area-grouping.png`                 | regen | Neu erzeugen via `pnpm preview` + Browser-Screenshot (mit `consumer_grouping: by_area`)                  |
| `hacs.json`                                             | check | Falls Versionsangabe hardcoded → mit `CARD_VERSION` synchronisieren                                      |
| `examples/2-pv-2-batt.yaml`                             | check | Strukturell unverändert; nur visuelle Renderung anders                                                   |
| `examples/preview.html`                                 | check | Keine viewBox-Werte hardcoded — Sandbox rendert automatisch mit neuer Geometrie                          |
| `CLAUDE.md`                                             | check | Keine ViewBox-Werte hardcoded → keine Änderung erwartet                                                  |
| `src/card-helpers.ts`, `src/card-styles.ts`             | check | Skeleton-CSS und Card-Styles haben keine viewBox-Abhängigkeit                                            |

### 2.2 `card.ts` Streichung (Detail)

Aus `src/card.ts` werden **vollständig** entfernt:

```ts
// Lines 71-87
getGridOptions(): {...} {
  return { columns: 6, rows: 5, min_columns: 4, max_columns: 12, min_rows: 4, max_rows: 8 };
}

// Lines 89-91
getCardSize(): number {
  return Math.ceil((this.getGridOptions().rows * 56) / 50);
}
```

**Begründung:** Die Anwesenheit dieser Methoden schaltet HA-Sections-View in den Slider-Modus mit den deklarierten min/max-Werten. Ohne sie nutzt HA seinen nativen Auto-Layout-Mechanismus (typischerweise T-Shirt-Größen oder freies Resize bis Section-Maxgröße), was der User vor Commit `fa4dd4a` hatte.

Für Legacy-Masonry-View ohne `getCardSize` fällt HA auf einen Default zurück (typisch `4`). Das ist akzeptabel — Masonry ist nicht mehr Default seit HA 2024.3 und User in Masonry können nach wie vor manuell skalieren.

### 2.3 Layer-Boundary-Check

- `src/const.ts` → `util/`-Layer (keine Imports nötig).
- `src/render/layout.ts` → `render/`-Layer, importiert `const`, `util/svg-path`, `config/types` (unverändert).
- `src/card.ts` → `card/`-Layer. Streichung von zwei Methoden ist subtraktiv, keine neuen Imports.

Kein ESLint-Layer-Verstoß zu erwarten. Trotzdem MUSS `pnpm lint` Teil der Verifikations-Pipeline sein (siehe §3.3).

### 2.4 Code-Quality-Pflichten + Commit-Granularität

**Pflichten für jeden Edit:**

1. **Keine neuen Cross-Layer-Imports** (ADR-0009 — ESLint bricht CI sonst)
2. **Keine `any` ohne Begründungs-Kommentar** (CLAUDE.md 4)
3. **Magic-Numbers ersetzen**: konkret `layout.ts:161` → `y: 270` durch `y: MIDDLE_Y` (Single-Source, ADR-0010). Andere `y: pvNode.y + 80` / `y: battNode.y - 80` Werte sind visuelle Tuning-Offsets — wenn der Planer eine bessere Form findet (z.B. Konstante `BEZIER_VERTICAL_OFFSET = 80`), gerne.
4. **Comments synchron halten**: `layout.ts:41-49` Comment-Blöcke nennen konkrete Zahlen (`86 → 62 px Margin`, `48 px Durchmesser`, `9.5 px Margin`). Diese MÜSSEN bei Konstanten-Update mitgepflegt werden — sonst entsteht dieselbe Drift wie heute bei ADR-0017 (`25°/7°` im ADR vs `42°/14°` im Code).
5. **ADR-Drift bei der Gelegenheit beseitigen**: ADR-0017 nennt `Radius 275`, `Winkel ±α=min(25°, (N-1)·7°/2)`, `ViewBox 820×540`, `x ∈ [130, 440]` — alle Werte aktualisieren (siehe §4.1).
6. **Keine spekulativen Refactorings** (system-prompt): nur die in §2.1 gelisteten Dateien anfassen.
7. **Lit-Lifecycle unangetastet** (CLAUDE.md 5): `willUpdate` / `render` / `shouldUpdate` werden nicht geändert.
8. **Vorhandene Helper aus `util/` und `layout.ts` wiederverwenden** — siehe §2.5 Code-Reuse-Tabelle. Keine Inline-SVG-Pfad-Strings, keine Duplizierung von `midpoint`/`bezierPath`/`straightPath`.
9. **Engine-Warnings statt Throws** (Konvention §0.7): bei Daten-Inkonsistenz `EngineWarning` produzieren, niemals `throw`.
10. **Don't-Touch-Liste respektieren** (§0.6): `TAB_ORDER`, ARIA-Labels, `prefers-reduced-motion`, `_containerW=720`-Default, `data-power`-Attribut, `memoLayout`-Historie nicht anfassen.

**Commit-Granularität — empfohlen 3 Commits:**

| Commit-Reihenfolge                                                                  | Begründung                                                                                 |
| ----------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------ |
| 1. `refactor(layout): viewBox 820×540 → 960×540 + adjust constants and tests`       | Code + Tests in einer Einheit — Tests müssen mit den Konstanten zusammen passen, sonst rot |
| 2. `refactor(card): drop getGridOptions/getCardSize for native HA Sections layout`  | HA-API-Streichung isoliert — leicht zu reviewen und ggf. einzeln zu reverten               |
| 3. `docs(adr,spec): supersede ADR-0018 with ADR-0019, update ADR-0017 + subspec §6` | Reine Doku-Synchronisation                                                                 |

Optional 4. Commit: `chore(release): bump to 0.11.0` falls separat gewünscht; sonst in Commit 1 mit verpacken.

`pnpm check` MUSS zwischen den Commits jeweils grün sein.

### 2.5 Code-Reuse-Tabelle (verbindlich für Planer)

Vorhandene Helper, die der Planer **wiederverwenden MUSS** statt neu zu schreiben (CLAUDE.md 2 + ADR-0010):

| Helper / Konstante                  | Wann verwenden                                                                  | Datei                           |
| ----------------------------------- | ------------------------------------------------------------------------------- | ------------------------------- |
| `bezierPath(start, end, control)`   | Jede gebogene Edge                                                              | `src/util/svg-path.ts`          |
| `straightPath(a, b)`                | Jede gerade Edge                                                                | `src/util/svg-path.ts`          |
| `midpoint(a, b, yOffset)`           | Bezier-Kontrollpunkt zwischen 2 Punkten                                         | `src/render/layout.ts:243`      |
| `VIEWBOX`                           | Jede Layout-Berechnung — KEIN Hardcode 960/540 außerhalb von `const.ts`         | `src/const.ts:20`               |
| `MIDDLE_Y`, `TOP_Y`, `BOTTOM_Y`     | Jede y-Koord-Berechnung in `layout.ts` und seinen Tests                         | `src/render/layout.ts:33-35`    |
| `HOME_X`, `GRID_X`, `SOURCE_X_*`    | Jede x-Koord-Berechnung — KEIN Hardcode der konkreten Pixel-Werte               | `src/render/layout.ts:36-39`    |
| `CONSUMER_ARC_R/MAX_DEG/STEP_DEG`   | Jede Arc-Berechnung                                                             | `src/render/layout.ts:40,45,49` |
| `NODE_R_LARGE/MEDIUM/CONSUMER/GRID` | Jede Knoten-Radius-Verwendung                                                   | `src/render/layout.ts:29-32`    |
| `colorFor(role, theme)`             | Jede Farbe — niemals hardcoded Hex/RGB im Renderer                              | `src/render/theme.ts`           |
| `edgeColorRole(edgeKind)`           | Edge → Color-Role Mapping                                                       | `src/render/edge-color.ts`      |
| `formatPowerW(w, grouped)`          | Jede Power-Anzeige in der UI                                                    | `src/util/format-power.ts`      |
| `resolveColor(...)`                 | CSS-Variable → konkreter Farbwert                                               | `src/util/resolve-color.ts`     |
| `readSensor(hass, entity)`          | Jede Sensor-Lese-Operation                                                      | `src/util/read-sensor.ts`       |
| `memoize(fn, keyFn)`                | Falls Memoization gebraucht (nicht für Layout — siehe §0.6 memoLayout-Historie) | `src/util/memo.ts`              |
| `EngineWarning`                     | Daten-Inkonsistenz signalisieren (statt throwen)                                | `src/util/warning-types.ts`     |
| `DE.*` Strings                      | Alle User-facing Texte — niemals hardcoded Deutsch im Renderer/Editor           | `src/i18n/de.ts`                |
| `fireMoreInfo(el, entity)`          | HA-Event "more-info-Dialog öffnen"                                              | `src/ha/ha-helpers.ts`          |
| `fireConfigChanged(el, config)`     | HA-Event "Editor-Config geändert"                                               | `src/ha/ha-helpers.ts`          |

**Anti-Patterns, die der Planer aktiv vermeiden muss:**

1. Inline-SVG-Pfade als String (`d="M 100 100 C ..."`) statt `bezierPath`/`straightPath`
2. Geometrie-Konstanten in Tests dupliziert — Tests sollen entweder importieren ODER explizit das Verhalten testen
3. Eigene `midpoint`-Helper, weil `midpoint` als `private` im File empfunden wird (Lösung: aus `layout.ts` exportieren wenn extern gebraucht — nicht in dieser Spec aber gut zu wissen)
4. Hardcoded Pixel-Werte in Renderer-Code statt Layout-Konstanten zu konsumieren
5. Hardcoded Hex-Farben statt `colorFor()`
6. Hardcoded deutsche Strings statt `DE.*`

## 3. Tests

### 3.0 TDD-Reihenfolge (Layout-Tests)

Für Konstanten-Updates gilt eine schwache TDD-Form (CLAUDE.md 9 für Util/Engine; Layout ist Grenzfall):

1. **Erst Tests anpassen** auf neue Erwartungswerte (siehe §3.1) — `pnpm test` läuft jetzt rot
2. **Sanity-Check**: rote Tests bestätigen, dass die Erwartungswerte die Konstanten WIRKLICH testen (sonst würde der Test mit alten Code-Werten grün bleiben — Beweis, dass der Test sinnvoll ist)
3. **Code anpassen** (Konstanten in `const.ts` und `layout.ts`) — Tests werden grün
4. **Verifikation**: `pnpm test`, dann `pnpm check` (komplette CI-Gate)

Diese Reihenfolge schützt vor stillem Test-Bypass (Test referenziert Konstante statt Literal und übersteht jede Änderung — wertloser Test).

### 3.1 Bestehende Tests aktualisieren

`src/render/layout.test.ts` enthält 12 Test-Cases mit hardcoded Erwartungswerten. Alle relevanten Werte werden auf das neue Koordinatensystem aktualisiert:

```ts
// Line 24-25 (viewBox)
expect(layout.width).toBe(960); // war 820
expect(layout.height).toBe(540); // unverändert

// Line 31 (Home)
expect(home).toMatchObject({ x: 480, y: 270, r: 50 }); // x: 380 → 480

// Line 42-49 (sourceClusterXs erwartete Werte)
([1, [280]], // war [180]
  [2, [250, 560]], // war [180, 440]
  [3, [200, 380, 560]], // war [130, 290, 440]
  [4, [200, 320, 440, 560]], // war [130, 230, 330, 440]
  [5, [200, 290, 380, 470, 560]], // war [130, 207.5, 285, 362.5, 440]
  [6, [200, 272, 344, 416, 488, 560]], // war [130, 192, 254, 316, 378, 440]
  // Line 83 (N=1 consumer position)
  expect(consumers[0]).toMatchObject({ x: 480 + 350, y: 270 })); // war 380+275

// Line 95 (viewBox-Bound-Check)
expect(c.y + c.r).toBeLessThanOrEqual(540); // unverändert (height gleich)

// Line 98-103 (PV/Akku-Collision-Check)
for (const cx of [250, 560]) {
  // war [180, 440]
  for (const cy of [80, 460]) {
    /* unverändert */
  }
}

// Line 113-115 (N=7 α=42°-Cap)
const dy = 350 * Math.sin(alphaRad); // war 275
```

### 3.2 Neuer Test — Consumer-zu-Consumer-Gap

Ein neuer Test schließt eine pre-existing Coverage-Lücke. Bestehende Suite prüft `consumer-vs-PV/Akku`-Kollision, aber NICHT `consumer-vs-consumer`-Überlappung. Bei R=275/α=42°/N=8 war das Edge-Gap 9.5 px (knapp). Bei neuer Geometrie 25 px. Test schützt zukünftige Regression, wenn jemand R reduziert.

Datei: `src/render/layout.test.ts` (im `describe('computeLayout — consumer arc', ...)`-Block):

```ts
it.each([2, 4, 6, 8])('N=%d: consumers stay clear of each other (min gap 4 px)', (n) => {
  const layout = computeLayout(baseConfig(), mkDisplayConsumers(n));
  const consumers = layout.nodes.filter((c) => c.kind === 'consumer');
  for (let i = 0; i < consumers.length; i++) {
    for (let j = i + 1; j < consumers.length; j++) {
      const d = Math.hypot(consumers[i].x - consumers[j].x, consumers[i].y - consumers[j].y);
      expect(d).toBeGreaterThan(consumers[i].r * 2 + 4); // 4 px breathing
    }
  }
});
```

**Threshold-Begründung:** Center-Distanz > 2·r + 4 = 52 px ⇒ Edge-Gap ≥ 4 px. Mit altem R=275 ist Center-Distanz 57.5 px → Test grün (Gap 9.5 px). Mit neuem R=350 ist Center-Distanz 73 px → Test grün (Gap 25 px). Bei R<250 fällt der Test → catched Regression früh.

**TDD-Hinweis:** Da der Test mit altem UND neuem Code grün ist, ist es kein klassischer TDD-Rot-Test, sondern eine **defensive Coverage-Erweiterung**. Wird in Task 1.1 zusammen mit den anderen Test-Edits hinzugefügt.

Die bestehende Test-Suite deckt weiter:

- ViewBox-Bounds (consumer.y±r ∈ [0, 540])
- Consumer-vs-PV/Akku-Kollision (jetzt zusätzlich Consumer-vs-Consumer durch neuen Test)
- α=42°-Cap-Verhalten

ab — alle bleiben gültig im neuen Koordinatensystem.

### 3.3 Verifikations-Pipeline (Reihenfolge verbindlich)

| Schritt | Befehl                  | Erwartung                                                                                                                                |
| ------- | ----------------------- | ---------------------------------------------------------------------------------------------------------------------------------------- |
| 1       | `pnpm typecheck`        | TypeScript-strict grün, keine neuen `any`                                                                                                |
| 2       | `pnpm lint`             | ESLint grün, Layer-Boundaries (ADR-0009) eingehalten, keine Restricted-Path-Verletzungen                                                 |
| 3       | `pnpm test`             | Vitest grün, alle `layout.test.ts`-Cases auf neue Werte aktualisiert (siehe §3.1)                                                        |
| 4       | `pnpm test:coverage`    | Coverage ≥ 90% (CLAUDE.md 9) für `render/layout.ts` (Aktualisierung von Konstanten verändert Coverage nicht)                             |
| 5       | `pnpm check`            | Komplettes CI-Gate (typecheck + lint + test) — MUSS grün vor jedem Commit                                                                |
| 6       | `pnpm build`            | Production-Bundle erzeugen, Größe ≤ 60 kB minified (Bundle-Budget)                                                                       |
| 7       | `pnpm build:analyze`    | Visualizer-Report kontrollieren — Streichung von `getGridOptions/getCardSize` muss messbar Bundle reduzieren                             |
| 8       | `pnpm preview`          | Sandbox `examples/preview.html` öffnen, visuelle Verifikation: Bogen N=1, N=4, N=8, Diagnostik-Icon-Position                             |
| 9       | Screenshots regen       | `docs/screenshots/individual-consumers.png` + `by-area-grouping.png` via Browser-Screenshot in `pnpm preview` neu erstellen (siehe §2.1) |
| 10      | Pre-Release-Smoke-Test  | ADR-0012 Headless-Test mit neuer Geometrie grün                                                                                          |
| 11      | HA-Dashboard-Smoke-Test | siehe unten                                                                                                                              |

**HA-Dashboard-Smoke-Test (manuell, mit echtem HA-Instance):**

1. Card in **12×8 Sections-Slot** ziehen → ~60 px Letterbox L/R (akzeptabel)
2. Card in **12×9 Slot** → minimal Letterbox (~16 px L/R)
3. Card in **12×10 Slot** → optimaler Fit, kein sichtbarer Letterbox
4. **HA-Layout-Slider**: Slider muss freie Skalierung erlauben (kein hartes Cap bei 12 columns / 8 rows)
5. **Diagnostik-Icon**: bei einer Test-Config mit unavailable Sensoren (≥1 Warning) prüfen, dass das Icon bei (930, 30) sichtbar ist und nicht mit Consumer-Edge überlappt (Consumer-max-x bei N=8 ≈ 854, also 76 px Abstand zum Icon-Center)
6. **N=1, N=4, N=8 Verbraucher-Varianten** durchspielen — Bogen visuell prüfen (keine Knoten-Überlappung, keine viewBox-Überschreitung)
7. **Animation läuft**: Dots fließen auf neuen Bezier-Pfaden ohne Stocken

## 4. Dokumentation

### 4.1 ADR-0017 Update

Konkrete Werte im ADR-0017-Text:

| Stelle                                                | Heute                                | Neu                                                             |
| ----------------------------------------------------- | ------------------------------------ | --------------------------------------------------------------- |
| §"Entscheidung", "Radius 275 um Home (380, 270)"      | so                                   | "Radius 350 um Home (480, 270)"                                 |
| §"Entscheidung", "fixer ViewBox 820×540"              | so                                   | "fixer ViewBox 960×540 (Aspect 16:9, ADR-0019)"                 |
| §"Entscheidung", "Quellen... x ∈ [130, 440]"          | so                                   | "x ∈ [200, 560]"                                                |
| §"α-Cap bei 25° verhindert PV/Akku-Kollision bis N=8" | (älterer Wert, aktueller Code = 42°) | "α-Cap bei 42° / Step 14° für N=8 ohne Überlappung (Gap 25 px)" |

(Falls der ADR-Text alte Werte nennt, die seit dem Initial-Commit nicht mehr stimmen, im Zuge des Updates auch korrigieren.)

### 4.2 ADR-0018 Supersede

`docs/adr/0018-ha-dashboard-layout-api.md` Status-Header:

```
- **Status:** superseded by ADR-0019 (2026-05-12)
```

ADR-0018 wurde am 2026-05-12 (initial accepted) am selben Tag durch ADR-0019 abgelöst — Hinweis dazu im Body (siehe nächster Block).

Plus einleitender Hinweis-Block:

```
> **Superseded:** Diese Entscheidung wurde am 2026-05-12 nach User-Feedback durch
> ADR-0019 abgelöst. Die deklarierten Slider-Bounds (`max_columns: 12, max_rows: 8`)
> erwiesen sich in der Praxis als künstliche Einschränkung gegenüber HAs nativem
> Auto-Layout. Siehe ADR-0019 für die finale Entscheidung.
```

### 4.3 ADR-0019 Neu — Stub für den Planer

Neuer ADR `docs/adr/0019-aspect-16-9-no-grid-options.md`. **Stub unten 1:1 übernehmen** und in den ADR-Index (`docs/adr/README.md`) eintragen.

```markdown
# ADR-0019: ViewBox-Aspect 16:9 + Entfernung HA-Dashboard-Layout-API

- **Status:** accepted
- **Datum:** 2026-05-12
- **Entscheider:** @griebner
- **Supersedes:** ADR-0018

## Kontext und Problem

Nach Inbetriebnahme von [ADR-0018](./0018-ha-dashboard-layout-api.md) (`getGridOptions` mit `max_columns: 12`, `max_rows: 8`) berichtete der User am 2026-05-12, dass die Card im HA-Dashboard zu klein wirkt — der HA-Layout-Slider lässt sich nur bis 12 Spalten / 8 Reihen ziehen, vorher (ohne `getGridOptions`) war freie Skalierung möglich. Zusätzlich erzeugt der bisherige ViewBox-Aspect 820:540 (~1.52:1) in typischen HA-Sections-Slots (12×8 = 2.36:1) deutlichen Letterbox-Streifen links/rechts.

## Entscheidungs-Treiber

- Card soll den horizontalen Platz im HA-Grid sinnvoll nutzen, nicht künstlich beschneiden
- HA-Slider darf nicht durch unsere Methoden gedeckelt sein — User soll die Card so groß ziehen können, wie die Section es erlaubt
- Arc-Geometrie (ADR-0017) soll für N=8 weiterhin sicher passen — keine Layout-Revolution
- Konsistenz zwischen HA Sections-View und Masonry-View durch Default-Verhalten von HA selbst

## Geprüfte Optionen

- **A — Aspect 16:9 (960×540) + `getGridOptions/getCardSize` ersatzlos entfernen** (gewählt)
- **B — `getGridOptions` mit großzügigeren Bounds (z.B. `max_columns: 24, max_rows: 14`)**
- **C — Status quo beibehalten** (820×540 + bestehende Slider-Bounds)

## Entscheidung

**Gewählt: Option A.** ViewBox auf `960×540` (Aspect 16:9, 1.78:1). `HOME_X` 380 → 480, `CONSUMER_ARC_R` 275 → 350, Source-Cluster-Range 130-440 → 200-560. Vollständige Streichung von `getGridOptions()` und `getCardSize()` aus `card.ts`, damit HA seinen nativen Auto-Layout-Mechanismus nutzt.

### Positive Konsequenzen

- HA-Layout-Slider ohne künstliches Cap — User kann die Card frei skalieren bis Section-Maxgröße
- 16:9-Aspect fits HA-Sections-Slots 12×9 und 12×10 sehr gut (minimal/optimal Letterbox)
- Arc bleibt strukturell wie ADR-0017 — nur größerer Radius (komfortablere Knoten-Abstände: Gap 25 px statt 9.5 px bei N=8)
- Bundle-Reduktion durch Streichung von zwei Methoden

### Negative Konsequenzen

- **Breaking Visual Change**: Bestehende Configs sehen anders aus (Bogen ausladender, Knoten weiter rechts). Datenmapping bleibt 1:1.
- HA-Sections-View ohne `getGridOptions` wählt vermutlich einen kleineren Default-Slot als die bisherigen 6×5 — User-Resize einmalig nötig nach Update.
- Bei sehr schmalen Containern (`< 280 px`) greift weiterhin der bestehende Narrow-Banner, sonst Anpassung nicht nötig.

## Pros und Cons der Optionen

### Option A — Aspect 16:9 + Methoden-Streichung (gewählt)

- ✅ Adressiert beide Beschwerden des Users in einem Schritt
- ✅ Vertraueter Aspect (Video-Standard)
- ✅ Cleaner Code (subtraktiv)
- ❌ Breaking Visual Change

### Option B — Großzügigere Bounds in `getGridOptions`

- ✅ Minimaler Eingriff
- ❌ Beim User vorher War es OHNE `getGridOptions` — wir wären weiterhin in einem anderen Modus als das ursprüngliche Verhalten
- ❌ Behebt nicht den Letterbox-Effekt

### Option C — Status quo

- ✅ Kein Risiko
- ❌ Beschwerde bleibt unaddressiert

## Verlinkte Spec-Sektionen / Referenzen

- Subspec [`docs/specs/2026-05-12-aspect-ratio-redesign.md`](../specs/2026-05-12-aspect-ratio-redesign.md)
- [ADR-0017](./0017-adaptive-svg-layout.md) (Arc-Geometrie bleibt — Maßzahlen aktualisiert)
- [ADR-0018](./0018-ha-dashboard-layout-api.md) (superseded)
- [HA Frontend: Custom Card Layout](https://developers.home-assistant.io/docs/frontend/custom-ui/custom-card/)
```

### 4.4 Subspec 2026-05-11 §6.1 / §6.2

Beide Sektionen mit einleitendem Hinweis-Block versehen:

```
> **Update 2026-05-12:** Diese Sektion ist superseded durch
> [Subspec 2026-05-12 + ADR-0019](./2026-05-12-aspect-ratio-redesign.md).
> `getGridOptions` und `getCardSize` werden ersatzlos gestrichen.
```

### 4.5 `docs/architecture.md` Updates

Zwei Stellen anfassen:

1. **§3 Datenfluss-Diagramm (`architecture.md:80`)**: Stale Signatur fixen:

   ```diff
   - Layout.compute(config, viewBox)       ← render/layout.ts
   + computeLayout(config, displayConsumers) ← render/layout.ts
   ```

2. **§4 ADR-Tabelle**: 0018 als `superseded`, 0019 hinzufügen.

3. **Optional neuer Hinweis in §2 (Layer-Architektur)** — kann der Planer entscheiden, ob nötig:

   ```
   **Geometrie-Single-Source:** `VIEWBOX` (Card-Außenmaß) in `src/const.ts`. Layout-
   Konstanten (`HOME_X`, `MIDDLE_Y`, `CONSUMER_ARC_R`, etc.) in `src/render/layout.ts`.
   Tests dürfen Werte importieren, NICHT re-deklarieren (ADR-0010).
   ```

## 5. Migration und Breaking Changes

### 5.1 Was bestehende User sehen

- **Card wirkt visuell anders**: breiter, mit ausladenderem Bogen. Datenmapping bleibt 1:1, alle Sensoren und Edges identisch.
- **HA-Layout-Editor**: Slider haben keine künstliche Obergrenze mehr — User können die Card so groß ziehen, wie die Section es zulässt.
- **HA-Sections-Default-Slot**: HA wählt einen anderen Default (vermutlich kleiner als unsere bisherigen 6×5) — User-Resize einmalig nötig nach Update.
- **Lovelace-GUI-Editor**: zeigt eine Live-Vorschau der Card. Diese ändert sich automatisch mit (kein separater Editor-Code-Change nötig).

### 5.2 Was _nicht_ bricht

- Configs (`type`, `solar`, `battery`, `consumers`, `display`) bleiben strukturell und semantisch unverändert
- HA-Entity-Mapping (kein Sensor-Rename)
- Engine-Output (Flow-Werte, Warnings)
- Animation-Logic
- Consumer-Grouping (ADR-0016)
- i18n-Strings

### 5.3 Release-Strategie

- Breaking Visual Change → Minor-Bump `0.10.0 → 0.11.0` (`src/const.ts:3`)
- `hacs.json`: Falls Versionsangabe hardcoded, synchronisieren

**README-Changelog-Eintrag-Vorlage:**

```markdown
## 0.11.0 — 2026-05-12

### Visueller Update (Breaking Visual Change)

- **ViewBox-Aspect 16:9 (statt ~1.52:1)**: Die Card nutzt jetzt die Dashboard-Breite besser. Funktionalität und Daten unverändert — Sensoren, Edges, Animation, Theme sind identisch zu 0.10.x.
- **HA-Layout-API entfernt**: Die Card deklariert keine `getGridOptions` mehr → HA's Layout-Editor erlaubt freie Skalierung ohne künstliche Slider-Obergrenze.

### Was zu tun ist nach Update

1. **Browser-Cache leeren** (Strg+Shift+R / Cmd+Shift+R), falls die alte Optik noch erscheint
2. Falls der Default-Slot nach Update zu klein wirkt: HA-Dashboard → "Card bearbeiten" → "Layout" → Größe manuell anpassen
3. Optimaler HA-Sections-Slot: 12×9 oder 12×10

### Vorher / Nachher

[Optional: Side-by-side Screenshots in einer kleinen Tabelle, falls verfügbar]
```

**HACS-Release-Notes** verwenden denselben Text. HACS rendert Markdown.

### 5.4 Operationelle Aspekte

**Rollback:** Reine Konstanten-/Methoden-Änderung. Rollback = `git revert` der drei Commits (siehe §2.4). Configs der User bleiben kompatibel — kein Daten-Rollback nötig.

**Pre-Release-Gate (ADR-0012):** Headless-Smoke-Test MUSS mit neuer Geometrie grün sein. Falls der Smoke-Test viewBox-Werte hardcoded prüft, diese mit anpassen. Das `data-power`-Attribut auf Edges (`flow-renderer.ts:128,144`) ist ein bekannter Inspektions-Hook — Werte ändern sich nicht durch Geometrie-Change, Attribut bleibt.

**Performance:** ViewBox-Aspect-Change hat keine Performance-Implikationen — gleiche Anzahl Knoten/Edges, gleicher Render-Aufwand, gleicher Animation-Algorithmus. Streichung von `getGridOptions/getCardSize` reduziert Bundle-Größe minimal (< 0.5 kB).

**Animation-Subtilität (UX):** Die Edge-Pfade werden in der neuen Geometrie länger:

- Grid → Home: 320 → 420 px (+31%)
- Home → Consumer (Arc): R 275 → 350 (+27%)
- PV/Battery → Home: kaum verändert (Sources flankieren neue Home-Position)

Die Animation-Dauer ist **power-basiert, nicht path-length-basiert** (`flow-animation.ts:23`: `durationS = base_duration_s * (reference_power_w / powerW)`). Damit bewegen sich die Dots bei gleicher Power proportional langsamer über den Schirm. Visueller Effekt: Card wirkt etwas "ruhiger/träger".

**Empfehlung:** Akzeptieren als Default. Falls in der Praxis störend, kann `DEFAULTS.animation.base_duration_s` von 2.5 auf ~2.0 gesenkt werden (in `src/const.ts:13` — wäre minimaler Single-Liner-Patch, separate Anpassung). Path-length-basierte Duration (struktureller Eingriff) ist **explizit out of scope** dieser Spec.

**Visuelle Regression:** Aktuell kein automatisierter Screenshot-Test im Repo (Playwright als Fallback in `.playwright-mcp/` markiert in Memory). Visuelle Verifikation erfolgt manuell über `pnpm preview` + HA-Smoke-Test (siehe §3.3) plus Screenshot-Regen für README (`docs/screenshots/*.png`).

**Backward Compatibility — HA < 2024.3 (Masonry-View):** Ohne `getCardSize` fällt HA auf einen internen Default zurück (typisch `4`). Das ist akzeptabel — Masonry-View ist seit HA 2024.3 nicht mehr Default, betroffene User können manuell skalieren. Falls dieser Fallback in der Praxis zu klein wirkt, kann ein Single-Liner `getCardSize() { return 6; }` als statischer Fallback wieder eingeführt werden (separater Patch-Release 0.11.1, nicht Teil dieses Scopes).

**Initial-Frame-Flash:** `card.ts:38` hat `_containerW = 720` als Default vor ResizeObserver-Update. Bei neuer Aspect 16:9 ist die anfängliche Höhe ~404 px (statt 474 px). Das ist ein ≤1-Frame-Flash bei Card-Mount, **vernachlässigbar** — ResizeObserver korrigiert beim ersten `firstUpdated`. Kein Code-Change.

## 6. Out of Scope

- Adaptive viewBox (Aspect je nach Verbraucher-Count) — wurde in ADR-0018 schon abgelehnt; bleibt abgelehnt
- Bigger Node-Radien — Aspect-Change selbst reicht; Größen-Tuning ist separate Frage
- Re-Design des Quellen-Layouts (z.B. Sources rechts statt links) — out of scope
- Responsive Behavior auf schmalen Containern (`< 280 px`) — bestehender `narrow-banner` reicht
- HA-Layout-Hint-Methoden anderer Art (z.B. `getLayoutOptions()` für ältere HA-Versionen)

## 7. Offene Fragen

Keine. Alle Geometrie-Werte und Migration-Entscheidungen sind im Brainstorming geklärt.

## 8. Nächster Schritt

Implementations-Plan in `docs/plans/2026-05-12-aspect-ratio-redesign.md` mit Checkbox-Liste, abgearbeitet via `superpowers:executing-plans` oder `subagent-driven-development`.
