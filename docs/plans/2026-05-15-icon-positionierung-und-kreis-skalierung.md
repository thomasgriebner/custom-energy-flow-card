# Icon-Positionierung und Kreis-Skalierung — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use `superpowers:subagent-driven-development` (recommended) or `superpowers:executing-plans` to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Status:** v7 (ready for execution — 5 Iterationen Plan-Review abgeschlossen, 3 User-Decisions geklärt: feat-Scope+Patch behalten, Consumer-Label-Wander ignoriert, Task 4.2 nur DevTools-Option; 23 Tasks `high` / 4 `medium` / 0 `low` Konfidenz)
**Datum:** 2026-05-15
**Verlinkte Spec:** [`docs/specs/2026-05-15-icon-positionierung-und-kreis-skalierung.md`](../specs/2026-05-15-icon-positionierung-und-kreis-skalierung.md) (v4)

**Goal:** Vier Render-Issues aus 0.12.0-Live-Beobachtung beheben (Icon-Wert-Spacing, Consumer-Icon-Größe, Kreis-Radien für 4–5-stellige Werte, Battery-Default-Icon) — Patch-Release `0.12.1`.

**Architecture:** Ausschließlich `render/`-Layer-Edits (`icon.ts`, `layout.ts`, `battery-ring.ts`, `node-renderer.ts`) plus Top-Level-Version (`const.ts`, `package.json`). Keine neuen Module, keine neuen Layer, keine Engine-/Config-/Editor-Edits. Layer-Boundaries via ESLint `no-restricted-paths` automatisch erzwungen (ADR-0009).

**Tech Stack:** TypeScript ^5.4 strict (`noUncheckedIndexedAccess`, `experimentalDecorators`), Lit ^3.2, Rollup ^4.13, Vitest ^1.4 (node + happy-dom), ESLint ^8.57, pnpm ≥ 9. Bundle ≤ 60 kB minified, `card.ts` ≤ 200 LOC.

**Verbindliche Lese-Quellen (vor Start):**

- **Spec:** [`docs/specs/2026-05-15-icon-positionierung-und-kreis-skalierung.md`](../specs/2026-05-15-icon-positionierung-und-kreis-skalierung.md) — **Single-Source aller Constraints, Werte, Begründungen**
- `CLAUDE.md` — Projekt-Schnellreferenz, Regeln 1–10, Workflow
- `docs/conventions.md` — Code-Stil, Anti-Patterns §11, Doku-Pflicht §12, Dependencies §13, Commit-Format §8
- `docs/architecture.md` — Layer-Architektur, Datenfluss
- ADRs aus Spec §0.1: ADR-0002, 0003, 0004, 0009, 0010, 0012, 0017, 0020

**Konzepte (verbindlich, siehe Spec für Details):**

- **Datenfluss-Pipeline** (Spec §0.3): `computeLayout` → `renderCard` → `renderNode` (mit `nodeIcon` + `renderBatteryRing`). Nur diese Render-Funktionen sind betroffen, Engine-Output (`FlowResult`) bleibt unverändert.
- **Lit-Lifecycle** (CLAUDE.md 5): Berechnung in `willUpdate`, NIEMALS in `render`. Diese Spec ändert keine Lifecycle-Hooks.
- **Code-Reuse-Tabelle** (Spec §3.6): 10 bestehende Helper — VERBINDLICH wiederverwenden statt neu zu bauen. Insbesondere `serialize()` in `battery-ring.test.ts:5-13` für neuen Ring-Test.
- **Anti-Patterns** (Spec §3.6): 8 verbotene Muster — aktiv vermeiden. Wichtigstes: WHAT-Kommentare in Production-Code (Spec-Doku-Kommentare `// alt: …` NICHT übernehmen).

**Standing Requirement für jeden Task** (Disziplin-Block, gilt durchgehend):

> 🛑 Jede Code-Zeile, die in dieser Plan-Datei als TypeScript/JS-Block steht, ist als Vorschlag zu verstehen, der **`docs/conventions.md`** und **alle in Spec §0.1 referenzierten ADRs** einhalten muss. Vor dem `git commit` jedes Tasks: **`pnpm check` läuft grün durch** (`lint + typecheck + test`). Lint erzwingt automatisch:
>
> - Layer-Boundaries (ADR-0009)
> - Imports-Reihenfolge (`import/order`, conventions §4)
> - `no-console` außer info/warn/error (conventions §7)
> - `no-explicit-any` ohne expliziten Disable
> - `no-non-null-assertion` außer in Tests
>
> Entwickler-Disziplin erzwungen manuell:
>
> - Pure Functions in `engine/` (ADR-0004) — nicht berührt
> - Keine god-class in `card.ts` (≤ 200 LOC) — nicht berührt
> - Single-Source `util/`-Aufrufe (ADR-0010) — speziell `NODE_R_MEDIUM`-Export
> - Funktionale Iteration (`.map`/`.filter`/`.reduce`, conventions §1.6)
> - Conventional-Commit-Format mit Scopes aus conventions §8 (`render`, `util`, `docs`, …)
> - Keine WHAT-Kommentare; Spec-Doku-Kommentare wie `// alt: …` NICHT übernehmen (conventions §2)
> - **TDD-First** für TDD-pflichtige Layer (engine/config/util — diese Spec berührt nur render/, daher kein hartes TDD-Mandat, aber Tests-rot-vor-Implementation wird trotzdem eingehalten für Disziplin)

**Elements NICHT anfassen** (aus Spec §0.4 Don't-Touch-Liste — 1:1 reproduziert):

| Element                                                   | Wo                                                          | Warum nicht anfassen                                                              |
| --------------------------------------------------------- | ----------------------------------------------------------- | --------------------------------------------------------------------------------- |
| `DEFAULT_MDI_ICONS` für pv/grid/home/consumer             | `src/render/icon.ts:5-11`                                   | Nur `battery` ist Issue D; andere Defaults bleiben (User hat nur Battery genannt) |
| `DIAGNOSTICS_ICON_BOX`                                    | `src/render/icon.ts:28-33`                                  | Diagnostics-Icon-Geometrie unabhängig vom Knoten-Layout                           |
| `NODE_R_LARGE = 50`                                       | `src/render/layout.ts:29`                                   | Home als Anker behält Größe — visuelle Hierarchie soll erhalten bleiben           |
| `TOP_Y = 80`, `MIDDLE_Y = 270`, `BOTTOM_Y = 460`          | `src/render/layout.ts:33-35`                                | Vertikal-Layout unverändert; nur Radien wachsen                                   |
| `HOME_X`, `GRID_X`, `SOURCE_X_MIN/MAX`                    | `src/render/layout.ts:36-39`                                | X-Geometrie bleibt; nur Y/Radius betroffen                                        |
| `CONSUMER_ARC_R = 350`                                    | `src/render/layout.ts:40`                                   | Arc-Radius bleibt                                                                 |
| `CONSUMER_ARC_MAX_DEG = 42`, `CONSUMER_ARC_STEP_DEG = 14` | `src/render/layout.ts:44, 48`                               | Spec §3.2 verifiziert: Gap bleibt ≥ 15 px Margin auch mit r=28                    |
| `home-ring.RING_RADIUS = 60`                              | `src/render/home-ring.ts:5`                                 | Home-Ring unverändert (Home wächst nicht)                                         |
| `STROKE_WIDTH = 6` (Battery-Ring)                         | `src/render/battery-ring.ts:4`                              | Strichbreite unverändert; nur Radius wandert                                      |
| `STROKE_WIDTH = 2.5` (Knoten-Kreis)                       | `src/render/node-renderer.ts:83`                            | Strichbreite unverändert                                                          |
| Stroke-Dash `4 4` für unavailable                         | `src/render/node-renderer.ts:53`                            | Unavailable-Indikator unverändert                                                 |
| `TAB_ORDER`                                               | `src/render/flow-renderer.ts:13`                            | Reihenfolge ist semantisch (Knoten-Typ), nicht räumlich                           |
| `aria-label` auf Nodes                                    | `src/render/node-renderer.ts:68`                            | A11y, semantisch                                                                  |
| `VIEWBOX = { width: 960, height: 540 }`                   | `src/const.ts:20`                                           | 16:9-Layout bleibt (Subspec 2026-05-12)                                           |
| `MIN_CONTAINER_WIDTH_PX = 280`                            | `src/const.ts:21`                                           | Narrow-Banner-Schwelle, container-bezogen                                         |
| `shouldUpdate`/`willUpdate`/`render`                      | `src/card.ts`                                               | Lifecycle-Logik unverändert (ADR-0011, CLAUDE.md 5–6)                             |
| Engine, Config-Schema, i18n, Editor                       | `src/engine/`, `src/config/`, `src/i18n/`, `src/editor*.ts` | siehe Spec §0.2 NICHT-berührte Layer                                              |

**Phases:**

- Phase 1. Pre-Edit-Gate — Sandbox-Status-quo verifizieren (1 Task, no commit)
- Phase 2. Tests TDD-rot — alle Test-Anpassungen + Export-Vorbereitung (5 Tasks, Commit 1: `test(render):`)
- Phase 3. Implementation atomar — icon.ts + layout.ts + battery-ring.ts + node-renderer.ts (5 Tasks, Commit 2: `feat(render):`)
- Phase 4. Visual + Release-Prep — Sandbox-Verifikation, Bundle, Version-Bump, Smoke, Screenshots (8 Tasks, Commit 3a + 3b)
- Phase 5. Doku-Updates — ADR-0017, Hauptspec, Subspec-2013, README-Changelog (6 Tasks, Commit 4: `docs(adr,specs,readme):`)

**Total:** 25 Tasks, 4 Commits + 1 No-Commit-Vorab-Gate, 5 Phasen.

---

## File Structure

### Modified

| Datei                                                     | Verantwortlichkeit                                                                                                                           | Phase                  |
| --------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------- |
| `src/render/icon.ts`                                      | `DEFAULT_MDI_ICONS.battery` + `NODE_ICON_BOX` (5 Knoten-Kinder)                                                                              | 3                      |
| `src/render/layout.ts`                                    | `NODE_R_MEDIUM` (Export + Wert 42) + `NODE_R_CONSUMER = 28` + `NODE_R_GRID = 40` + Comment-Blöcke 41-43, 45-47                               | 2 (Export) + 3 (Werte) |
| `src/render/battery-ring.ts`                              | `RING_RADIUS 42 → 50` (Kollisions-Auflösung)                                                                                                 | 3                      |
| `src/render/node-renderer.ts`                             | `valueY = 20` (von kind-spezifisch auf einheitlich); Font 13 → 14 für Non-Home Value                                                         | 3                      |
| `src/render/icon.test.ts`                                 | Battery-Default-Assert `mdi:home-battery`; Consumer-Size `width="24"`; neuer Spacing-Test                                                    | 2                      |
| `src/render/layout.test.ts`                               | Grid-Radius-Assert `r: 40`; Magic-Number-Modernisierung mit `NODE_R_MEDIUM`-Import; Kommentar `r=32` → `r=NODE_R_MEDIUM`; neuer N=8-Gap-Test | 2                      |
| `src/render/battery-ring.test.ts`                         | Dasharray-Regex `/131\.\d+ 131\.\d+/` → `/157\.\d+ 157\.\d+/`; Kommentar Line 19; neuer Ring-Radius-Test mit `serialize()`                   | 2                      |
| `src/const.ts`                                            | `CARD_VERSION: '0.12.0' → '0.12.1'`                                                                                                          | 4                      |
| `package.json`                                            | `"version": "0.12.0" → "0.12.1"` (Sync mit `const.ts`)                                                                                       | 4                      |
| `docs/adr/0017-adaptive-svg-layout.md`                    | Consumer-Radius-Update + Gap-Margin-Werte (25→17 px bei N=8 mit r=28)                                                                        | 5                      |
| `docs/specs/2026-05-10-custom-energy-flow-card-design.md` | Zeile 730 Default-Icon-Tabelle `mdi:battery → mdi:home-battery`                                                                              | 5                      |
| `docs/specs/2026-05-12-aspect-ratio-redesign.md`          | Cross-Reference-Hinweis vor §1.2 NODE_R-Tabelle (Werte sind nicht mehr „unverändert")                                                        | 5                      |
| `docs/specs/2026-05-13-icons-and-editor-ids.md`           | Hinweis-Blöcke vor Zeile 217 + Zeile 312 (Cross-Reference)                                                                                   | 5                      |
| `README.md`                                               | Changelog-Eintrag 0.12.1                                                                                                                     | 5                      |
| `docs/screenshots/individual-consumers.png`               | Regen (kanonisches User-facing-Bild, README:11)                                                                                              | 4                      |
| `docs/screenshots/by-area-grouping.png`                   | Regen (kanonisches User-facing-Bild, README:20)                                                                                              | 4                      |

### Created

Keine neuen Files in dieser Spec.

### NICHT anfassen (Spec §0.2 NICHT-berührte Layer)

- `src/engine/*` — pure Energiebilanz (ADR-0004); kennt keine Geometrie
- `src/config/*` — Schema-Validation, `deriveDisplayConsumers` (ADR-0016); kein neues Feld
- `src/ha/*` — HA-Event-Helfer, Type-Skelett; nicht betroffen
- `src/i18n/*` — keine neuen User-facing-Strings
- `src/editor.ts` + `src/editor-list-sections.ts` — kein neues Editor-Feld
- `src/card.ts` — Lifecycle unverändert; bleibt ≤ 200 LOC
- `src/card-helpers.ts` + `src/card-styles.ts` — CSS-Vars und Skeleton-Layout unangetastet
- `src/render/home-ring.ts` — Home-Ring (r=60) bleibt unberührt
- `src/render/flow-renderer.ts` — Diagnostics-Icon-Geometrie unangetastet
- `src/render/edge-color.ts`, `src/render/flow-animation.ts` — Edges/Animation unverändert
- `src/render/context.ts`, `src/render/theme.ts` — Context-Typ und Theme-Resolution unverändert
- `examples/preview.html` — keine hardcoded Radien
- `scripts/smoke-test.mjs` — prüft nur viewBox-Interpolation, unbetroffen
- `hacs.json` — kein Version-Field (HACS liest aus git-Tags)

### Build-Pipeline-Files

| Datei                                     | Art der Änderung                                                                                   | Phase |
| ----------------------------------------- | -------------------------------------------------------------------------------------------------- | ----- |
| `.eslintrc.cjs`                           | **Kein Edit** — keine neuen Zonen, keine neuen Rules                                               | —     |
| `vitest.config.ts`                        | **Kein Edit** — `coverage.include` unverändert (render/ explizit nicht im Threshold per Spec §6.5) | —     |
| `tsconfig.json` / `tsconfig.preview.json` | **Kein Edit** — keine neuen Files außerhalb `src/`                                                 | —     |
| `package.json`                            | Edit — nur Version-Bump (kein neuer DevDep)                                                        | 4     |
| `scripts/build-preview.mjs`               | **Kein Edit** — Sandbox rendert automatisch mit neuen Werten                                       | —     |
| `scripts/smoke-test.mjs`                  | **Kein Edit** — prüft nur viewBox-Interpolation                                                    | —     |

---

## Phase 1 — Pre-Edit-Gate (no commit)

**Begründung:** Vor mehreren atomaren Code-Edits muss die Baseline grün sein, damit Test-Failures in Phase 2 eindeutig den neuen Erwartungen zuzuordnen sind (nicht alten Bugs).

### Task 1.1: Sandbox-Status-quo verifizieren

**Files:** keine Edits.

- [ ] **Step 1: `pnpm check` grün ausführen**

  ```bash
  pnpm check
  ```

  Erwartet: `lint + typecheck + test` alle grün. Bei Failure: STOP und Baseline reparieren — diese Spec wird nicht ausgeführt, solange Status quo rot ist.

- [ ] **Step 2: Sandbox laden**

  ```bash
  pnpm preview
  ```

  Browser öffnet (oder URL manuell aufrufen). Default-Szenario wird gerendert.

- [ ] **Step 3: Battery-Ring visuell prüfen**

  Akku-Knoten zeigt grünen SOC-Ring außerhalb des Batterie-Kreises (heute: Ring r=42 außen-vor-Kreis-r=34).

  **Bei Failure (kein Ring sichtbar):** STOP-Aktion:
  - (a) Prüfen ob ein anderes Szenario in `preview-mocks.ts` einen aktiven `soc`-Sensor hat → dieses laden und Status-quo dort verifizieren.
  - (b) Falls KEIN Szenario `soc` aktiviert: Skip visuelle Status-quo-Verifikation und vertraue auf `battery-ring.test.ts`-Tests (sind ja vor Phase 2 grün). Notiz im Implementer-Log: „Battery-Ring nur unit-test-verifiziert, kein visueller Baseline-Vergleich".
  - **NICHT** Phase 2 starten ohne `pnpm check` grün (Step 1 bleibt zwingend).

- [ ] **Step 4: Optionalen Status-quo-Screenshot ablegen**

  Lokal speichern für späteren Vergleich. **NICHT** in `docs/screenshots/` und **NICHT** committen.

- [ ] **Step 5: KEIN Commit (Pre-Edit-Gate ist nur Verifikation)**

---

## Phase 2 — Tests TDD-rot (Commit 1)

**Commit-Vorlage:**

```
test(render): assert new icon-box + node-radii + battery-ring radius

Tests-rot-Phase für Subspec 2026-05-15 — Icon-Positionierung + Kreis-Skalierung.
Tests assertieren die Soll-Werte aus Spec §3 (NODE_R_MEDIUM=42, NODE_R_GRID=40,
NODE_R_CONSUMER=28, RING_RADIUS=50, NODE_ICON_BOX neu).

Nach diesem Commit ist `pnpm test` ROT — die Production-Code-Updates in Phase 3
machen sie wieder grün (atomarer feat-Commit wegen Battery-Ring-Kollision).

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
```

**Hinweis zur TDD-Disziplin:** Nach Phase 2 ist `pnpm test` rot. Das ist gewollt. **Zwischen Phase 2 und Ende Phase 3 KEIN `pnpm check`-Gate** — der atomare feat-Commit in Phase 3 löst die Rot-Phase auf.

### Task 2.1: layout.ts — `NODE_R_MEDIUM` exportieren (Vorbereitung für Test-Import)

**Files:**

- Modify: `src/render/layout.ts:30`

**Begründung:** Spec §3.2 erzwingt Export-Pflicht, damit `layout.test.ts` die Konstante als Single-Source importieren kann statt Magic-Number `32`/`42`. Dieser Edit ist **semantisch neutral** — kein Verhalten ändert sich, nur die API-Surface von `layout.ts` wächst um einen Export. Tests in Task 2.2/2.3 können dann den Import nutzen.

- [ ] **Step 1: Export hinzufügen**

  ```ts
  // src/render/layout.ts:30
  // alt:
  const NODE_R_MEDIUM = 34;

  // neu:
  export const NODE_R_MEDIUM = 34;
  //  ^^^^^^
  ```

  WICHTIG: Wert bleibt **34** in diesem Task. Die Wert-Änderung auf 42 erfolgt in Phase 3 Task 3.2.

- [ ] **Step 2: Sanity-Check — `pnpm test` weiter grün**

  ```bash
  pnpm test
  ```

  Erwartet: ALLE bestehenden Tests bleiben grün (Export ändert kein Verhalten). Bei Failure: STOP, bedeutet ein Linter/Import-Konflikt.

### Task 2.2: `icon.test.ts` — Battery-Default + Consumer-Size + Spacing-Test

**Files:**

- Modify: `src/render/icon.test.ts:18-26, :42-52`
- Neu: zusätzlicher `it.each`-Block am Ende von `describe('nodeIcon', ...)`

- [ ] **Step 1: Battery-Default-Assert aktualisieren**

  ```ts
  // src/render/icon.test.ts:18-26
  // alt:
  it.each([
    ['battery', 'mdi:battery'],
    ['grid', 'mdi:transmission-tower'],
    ['home', 'mdi:home'],
    ['consumer', 'mdi:power-plug'],
  ] as const)('renders default icon for kind %s → %s', (kind, expectedIcon) => {
    const flat = flatten(nodeIcon(kind, undefined));
    expect(flat).toContain(`icon="${expectedIcon}"`);
  });

  // neu:
  it.each([
    ['battery', 'mdi:home-battery'],
    ['grid', 'mdi:transmission-tower'],
    ['home', 'mdi:home'],
    ['consumer', 'mdi:power-plug'],
  ] as const)('renders default icon for kind %s → %s', (kind, expectedIcon) => {
    const flat = flatten(nodeIcon(kind, undefined));
    expect(flat).toContain(`icon="${expectedIcon}"`);
  });
  ```

- [ ] **Step 2: Consumer-Size-Assert aktualisieren**

  ```ts
  // src/render/icon.test.ts:42-52
  // Test-Name + Consumer-Assert anpassen:

  // alt:
  it('foreignObject for home has size 32, consumer 18, default 24', () => {
    const flatHome = flatten(nodeIcon('home', undefined));
    expect(flatHome).toMatch(/width="32"/);
    expect(flatHome).toMatch(/height="32"/);

    const flatConsumer = flatten(nodeIcon('consumer', undefined));
    expect(flatConsumer).toMatch(/width="18"/);

    const flatPv = flatten(nodeIcon('pv', undefined));
    expect(flatPv).toMatch(/width="24"/);
  });

  // neu:
  it('foreignObject for home has size 32, consumer 24, default 24', () => {
    const flatHome = flatten(nodeIcon('home', undefined));
    expect(flatHome).toMatch(/width="32"/);
    expect(flatHome).toMatch(/height="32"/);

    const flatConsumer = flatten(nodeIcon('consumer', undefined));
    expect(flatConsumer).toMatch(/width="24"/);

    const flatPv = flatten(nodeIcon('pv', undefined));
    expect(flatPv).toMatch(/width="24"/);
  });
  ```

- [ ] **Step 3: Migration-Test (Spec §9.1 — User-Choice-Respekt)**

  Spec §9.1 verspricht: „User mit explizit gesetztem `icon: mdi:battery` behalten ihr leeres Outline." Verifizieren mit einem expliziten Test, damit die Resolution-Logik durch künftige Default-Änderungen nicht versehentlich überschrieben wird:

  ```ts
  it('respects user-set icon: mdi:battery (no override by new default)', () => {
    const flat = flatten(nodeIcon('battery', 'mdi:battery'));
    expect(flat).toContain('icon="mdi:battery"');
    expect(flat).not.toContain('mdi:home-battery');
  });
  ```

- [ ] **Step 4: Neuen Spacing-Test hinzufügen**

  Füge am Ende von `describe('nodeIcon', ...)` (vor dem schließenden `});` der ersten Describe) ein:

  ```ts
  // Consumer NICHT enthalten: Consumer-Layout zeigt Name+Wert RECHTS vom Kreis
  // (consumerLabelX = node.r + 8), nicht UNTER dem Icon. Daher entfällt der
  // Icon-Bottom-↔-Value-Top-Spacing-Check für Consumer.
  it.each([
    ['pv', 24, -12, 20, 14],
    ['battery', 24, -12, 20, 14],
    ['grid', 24, -12, 20, 14],
    ['home', 32, -16, 20, 15],
  ] as const)(
    'spacing icon-bottom ↔ value-top ≥ 8 px (%s)',
    (_, size, centerY, valueY, fontSize) => {
      const iconBottom = centerY + size / 2;
      const capHeight = fontSize * 0.7;
      const textTop = valueY - capHeight;
      const spacing = textTop - iconBottom;
      expect(spacing).toBeGreaterThanOrEqual(8);
    },
  );
  ```

- [ ] **Step 5: Tests ausführen — MUSS rot sein**

  ```bash
  pnpm test src/render/icon.test.ts
  ```

  Erwartet:
  - `renders default icon for kind battery → mdi:home-battery` — **FAIL** (heute: `mdi:battery`)
  - `foreignObject for home has size 32, consumer 24, default 24` — **FAIL** (heute: `width="18"` für Consumer)
  - `spacing icon-bottom ↔ value-top ≥ 8 px (pv|battery|grid|home)` — **FAIL** (heute Werte: PV centerY=-4, valueY=16, Font 13 → spacing < 0)
  - `respects user-set icon: mdi:battery (no override by new default)` — **PASS sofort** (Resolution-Logik schon implementiert; Test dokumentiert Verhalten)

  Sanity-Check: Wenn ein Test grün bleibt, der eigentlich rot sein sollte — **STOP**, Test-Bypass-Verdacht. **Ausnahme:** der Migration-Test ist schon grün (das ist gewollt — er fixiert das User-Choice-Verhalten als Regression-Schutz).

### Task 2.3: `layout.test.ts` — Grid-Radius + N=8-Gap + Magic-Number-Modernisierung

**Files:**

- Modify: `src/render/layout.test.ts:2, :37, :96-101, :118-127`
- Neu: zusätzlicher Test in `describe('computeLayout — consumer arc', ...)`

- [ ] **Step 1: Import erweitern**

  ```ts
  // src/render/layout.test.ts:2
  // alt:
  import { computeLayout } from './layout';

  // neu:
  import { computeLayout, NODE_R_MEDIUM } from './layout';
  ```

- [ ] **Step 2: Grid-Radius-Erwartung aktualisieren**

  ```ts
  // src/render/layout.test.ts:37
  // alt:
  expect(grid).toMatchObject({ x: 60, y: 270, r: 32 });

  // neu:
  expect(grid).toMatchObject({ x: 60, y: 270, r: 40 });
  ```

- [ ] **Step 3: Magic-Number `32` → `NODE_R_MEDIUM` + Kommentar-Update**

  ```ts
  // src/render/layout.test.ts:96-101
  // alt:
  for (const c of consumers) {
    // ViewBox bounds: consumer (r=24) must stay fully visible
    expect(c.y - c.r).toBeGreaterThanOrEqual(0);
    expect(c.y + c.r).toBeLessThanOrEqual(540);
    // No physical circle overlap with PV (x=250/560, y=80, r=32)
    // or Akku (x=250/560, y=460, r=32) — consumers are far right (x>740).
    for (const cx of [250, 560]) {
      for (const cy of [80, 460]) {
        const d = Math.hypot(c.x - cx, c.y - cy);
        expect(d).toBeGreaterThan(c.r + 32 + 4); // 4px breathing
      }
    }
  }

  // neu:
  for (const c of consumers) {
    // ViewBox bounds: consumer (r=NODE_R_CONSUMER) must stay fully visible
    expect(c.y - c.r).toBeGreaterThanOrEqual(0);
    expect(c.y + c.r).toBeLessThanOrEqual(540);
    // No physical circle overlap with PV (x=250/560, y=80, r=NODE_R_MEDIUM)
    // or Akku (x=250/560, y=460, r=NODE_R_MEDIUM) — consumers are far right (x>740).
    for (const cx of [250, 560]) {
      for (const cy of [80, 460]) {
        const d = Math.hypot(c.x - cx, c.y - cy);
        expect(d).toBeGreaterThan(c.r + NODE_R_MEDIUM + 4); // 4px breathing
      }
    }
  }
  ```

- [ ] **Step 4: Neuen N=8-Gap-Test hinzufügen**

  Füge am Ende von `describe('computeLayout — consumer arc', ...)` (vor dem schließenden `});` ) ein:

  ```ts
  it('N=8: adjacent consumer gap ≥ 15 px clearance (post-r=28 update)', () => {
    const layout = computeLayout(baseConfig(), mkDisplayConsumers(8));
    const consumers = layout.nodes.filter((n) => n.kind === 'consumer');
    expect(consumers).toHaveLength(8);
    // noUncheckedIndexedAccess: explizite Non-Null-Assertion erlaubt in *.test.ts
    // (.eslintrc.cjs:55-60 override). toHaveLength garantiert die Existenz semantisch.
    const c0 = consumers[0]!;
    const c1 = consumers[1]!;
    const adjGap = Math.hypot(c0.x - c1.x, c0.y - c1.y) - 2 * c0.r;
    expect(adjGap).toBeGreaterThanOrEqual(15);
  });
  ```

- [ ] **Step 5: Tests ausführen — MUSS rot sein**

  ```bash
  pnpm test src/render/layout.test.ts
  ```

  Erwartet:
  - `places grid at (60, 270)` — **FAIL** (heute: `r: 32`, erwartet `r: 40`)
  - `N=%d: consumers stay within viewBox + clear of PV/Akku circles` — **FAIL** (NODE_R_MEDIUM=34 statt 42 → Distanz-Check schlägt fehl, weil bei r=34 + breathing=4 keine 15 px Gap-Erwartung)

  Hinweis: Der neue N=8-Gap-Test kann grün sein, wenn die heutigen Werte (r=24, Diameter 48) zufällig die Bedingung ≥ 15 erfüllen. Spec §3.2 rechnet: bei r=28, Diameter 56, Gap 17 px. Bei r=24, Diameter 48, Gap = 73 - 48 = 25 px → 25 ≥ 15 ✓. Test kann **grün bleiben** mit heutigen Werten — das ist OK, weil der Test die NEUE Bedingung definiert (post-r=28 ≥ 15 px). Sanity-Check entfällt für diesen Test.

  Bei Failure anderer Tests: Sanity-Check OK.

### Task 2.4: `battery-ring.test.ts` — dasharray-Regex + neuer Ring-Radius-Test

**Files:**

- Modify: `src/render/battery-ring.test.ts:19-20`
- Neu: zusätzlicher Test am Ende von `describe('renderBatteryRing', ...)`

- [ ] **Step 1: dasharray-Kommentar + Regex aktualisieren**

  ```ts
  // src/render/battery-ring.test.ts:19-20
  // alt:
  // For 50%: dasharray = (2π·42 · 0.5) ≈ 131.95 131.95
  expect(out).toMatch(/131\.\d+ 131\.\d+/);

  // neu:
  // For 50%: dasharray = (2π·50 · 0.5) ≈ 157.08 157.08
  expect(out).toMatch(/157\.\d+ 157\.\d+/);
  ```

- [ ] **Step 2: Neuen Ring-Radius-Test hinzufügen**

  Füge am Ende von `describe('renderBatteryRing', ...)` (vor dem schließenden `});` ) ein. **WICHTIG:** Nutzt den bestehenden `serialize()`-Helper aus `battery-ring.test.ts:5-13`, nicht inline-`String.raw`:

  ```ts
  it('SOC-ring radius=50 sits outside battery circle (NODE_R_MEDIUM=42)', () => {
    const out = serialize(renderBatteryRing(50, '#10b981'));
    expect(out).toMatch(/r="50"/);
  });
  ```

  **Hinweis:** Farbe `#10b981` ist konsistent mit allen anderen Tests in diesem File (`battery-ring.test.ts:17, 24, 29, 35, 40`). Test-Name nennt beide Werte explizit, damit kein Verwechsel mit altem `RING_RADIUS=42` entsteht.

- [ ] **Step 3: Tests ausführen — MUSS rot sein**

  ```bash
  pnpm test src/render/battery-ring.test.ts
  ```

  Erwartet:
  - `renders background ring + filled segment for 50 %` — **FAIL** (heute: dasharray `131.95`, erwartet `/157\.\d+/`)
  - `ring radius is outside battery circle r=42 (no overlap)` — **FAIL** (heute: `r="42"`, erwartet `r="50"`)

  Sanity-Check: Wenn ein Test grün bleibt, der rot sein sollte — STOP.

### Task 2.5: Sanity-Check + Commit

- [ ] **Step 1: Vollen Test-Lauf ausführen — Erwartung ROT**

  ```bash
  pnpm test
  ```

  Erwartet: Mehrere Tests rot in `icon.test.ts`, `layout.test.ts`, `battery-ring.test.ts`. Die anderen Test-Files (`engine`, `config`, `util`, `editor`) bleiben grün.

- [ ] **Step 2: `pnpm lint` grün**

  ```bash
  pnpm lint
  ```

  Erwartet: GRÜN. Tests dürfen keine Lint-Fehler haben (Imports, Naming, etc.).

- [ ] **Step 3: `pnpm typecheck` grün**

  ```bash
  pnpm typecheck
  ```

  Erwartet: GRÜN. Test-Files sind via `tsconfig.json:22 exclude` ausgeschlossen — keine Type-Errors aus Tests, aber `tsc` validiert `src/render/layout.ts` (mit dem neuen Export).

- [ ] **Step 4: Stage + Commit**

  ```bash
  git add src/render/icon.test.ts src/render/layout.test.ts src/render/battery-ring.test.ts src/render/layout.ts
  git commit -m "$(cat <<'EOF'
  test(render): assert new icon-box + node-radii + battery-ring radius

  Tests-rot-Phase für Subspec 2026-05-15 — Icon-Positionierung + Kreis-Skalierung.
  Tests assertieren die Soll-Werte aus Spec §3 (NODE_R_MEDIUM=42, NODE_R_GRID=40,
  NODE_R_CONSUMER=28, RING_RADIUS=50, NODE_ICON_BOX neu).

  Nach diesem Commit ist pnpm test ROT — die Production-Code-Updates in Phase 3
  machen sie wieder grün (atomarer feat-Commit wegen Battery-Ring-Kollision).

  Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
  EOF
  )"
  ```

- [ ] **Step 5: `git log -1` verifizieren**

  ```bash
  git log -1 --stat
  ```

  Erwartet: Genau 4 Files modifiziert, Commit-Message-Format korrekt.

---

## Phase 3 — Implementation atomar (Commit 2)

**Commit-Vorlage:**

```
feat(render): enlarge node circles, reposition icons, fix battery-ring overlap

Subspec 2026-05-15 — Icon-Positionierung und Kreis-Skalierung.

Implementiert die vier Render-Issues aus 0.12.0-Live-Beobachtung:
- A) Icon-Wert-Spacing (Home/PV/Batt/Grid): 1–3 px → 9–10 px Luft
- B) Consumer-Icon: 18 → 24 px (Layout-Struktur „Text außen" bleibt)
- C) Kreis-Radien: PV/Batt 34→42, Grid 32→40, Consumer 24→28
- D) Battery-Default-Icon: mdi:battery → mdi:home-battery

Atomar wegen Battery-Ring-Kollision: bei NODE_R_MEDIUM=42 würde RING_RADIUS=42
unsichtbar werden. Ring wandert auf r=50 mit demselben Commit.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
```

### Task 3.1: `icon.ts` — Battery-Default + NODE_ICON_BOX (Issue B + D)

**Files:**

- Modify: `src/render/icon.ts:5-11, :20-26`

- [ ] **Step 1: MDI-Pre-Check (Spec §10 Risiko)**

  **Vorbedingung:** `@mdi/js` ist devDep (`package.json:22` `"@mdi/js": "^7.4.47"`) — wird via `pnpm install` installiert, NICHT als Runtime-Dep (`.eslintrc.cjs:45-52` verhindert Prod-Import).

  ```bash
  pnpm list @mdi/js
  node -e "import('@mdi/js').then(m => console.log('mdiHomeBattery available:', !!m.mdiHomeBattery))"
  ```

  Erwartet:
  - `@mdi/js ^7.4.47` (oder höher) installiert
  - `mdiHomeBattery available: true`

  Bei Failure: **STOP**. `mdi:home-battery` ist nicht im aktuellen `@mdi/js`-Bundle. Workaround: `pnpm add -D @mdi/js@^7.4.47` oder Default-Wahl revidieren.

- [ ] **Step 2: `DEFAULT_MDI_ICONS.battery` ändern**

  ```ts
  // src/render/icon.ts:5-11
  // alt:
  export const DEFAULT_MDI_ICONS: Record<LayoutNode['kind'], string> = {
    pv: 'mdi:solar-power',
    battery: 'mdi:battery',
    grid: 'mdi:transmission-tower',
    home: 'mdi:home',
    consumer: 'mdi:power-plug',
  };

  // neu:
  export const DEFAULT_MDI_ICONS: Record<LayoutNode['kind'], string> = {
    pv: 'mdi:solar-power',
    battery: 'mdi:home-battery',
    grid: 'mdi:transmission-tower',
    home: 'mdi:home',
    consumer: 'mdi:power-plug',
  };
  ```

- [ ] **Step 3: `NODE_ICON_BOX` ändern (alle 5 Knoten-Kinder)**

  ```ts
  // src/render/icon.ts:20-26
  // alt:
  const NODE_ICON_BOX: Record<LayoutNode['kind'], IconBox> = {
    pv: { size: 24, centerY: -4, emojiFontSize: 22, emojiY: -4 },
    battery: { size: 24, centerY: -4, emojiFontSize: 22, emojiY: -4 },
    grid: { size: 24, centerY: -4, emojiFontSize: 22, emojiY: -4 },
    home: { size: 32, centerY: -10, emojiFontSize: 28, emojiY: -10 },
    consumer: { size: 18, centerY: 6, emojiFontSize: 18, emojiY: 6 },
  };

  // neu:
  const NODE_ICON_BOX: Record<LayoutNode['kind'], IconBox> = {
    pv: { size: 24, centerY: -12, emojiFontSize: 22, emojiY: -12 },
    battery: { size: 24, centerY: -12, emojiFontSize: 22, emojiY: -12 },
    grid: { size: 24, centerY: -12, emojiFontSize: 22, emojiY: -12 },
    home: { size: 32, centerY: -16, emojiFontSize: 28, emojiY: -16 },
    consumer: { size: 24, centerY: 0, emojiFontSize: 22, emojiY: 0 },
  };
  ```

  **WICHTIG:** Keine `// alt: …`-Kommentare in den Production-Code übernehmen (Anti-Pattern aus Spec §3.6 + conventions §2).

- [ ] **Step 4: Tests ausführen — `icon.test.ts` GRÜN**

  ```bash
  pnpm test src/render/icon.test.ts
  ```

  Erwartet: Alle vorher roten Tests grün:
  - `renders default icon for kind battery → mdi:home-battery` ✓
  - `foreignObject for home has size 32, consumer 24, default 24` ✓
  - `spacing icon-bottom ↔ value-top ≥ 8 px (pv|battery|grid|home)` ✓

### Task 3.2: `layout.ts` — Radien + Comment-Blöcke (Issue C)

**Files:**

- Modify: `src/render/layout.ts:30-32, :41-43, :45-47`

- [ ] **Step 1: Radien-Werte aktualisieren (Export bleibt)**

  **Hinweis:** Snippet-Range `:29-32` umfasst 4 Zeilen — `NODE_R_LARGE` (Zeile 29) ist nur **Kontext**, NICHT zu ändern. Edit-Zeilen sind 30 (Wert 34→42), 31 (Wert 24→28), 32 (Wert 32→40).

  ```ts
  // src/render/layout.ts:29-32
  // alt:
  const NODE_R_LARGE = 50; // <- Kontext, unverändert
  export const NODE_R_MEDIUM = 34; // <- ändern auf 42 (Export wurde in Task 2.1 hinzugefügt)
  const NODE_R_CONSUMER = 24; // <- ändern auf 28
  const NODE_R_GRID = 32; // <- ändern auf 40

  // neu:
  const NODE_R_LARGE = 50;
  export const NODE_R_MEDIUM = 42;
  const NODE_R_CONSUMER = 28;
  const NODE_R_GRID = 40;
  ```

- [ ] **Step 2: Comment-Block 1 aktualisieren (`layout.ts:41-43`)**

  ```ts
  // src/render/layout.ts:41-43
  // alt:
  // 42° cap: limited by viewBox-top margin (top consumer y = 36 → 12 px to
  // viewBox top y=0). PV/Akku collision is NOT the constraint — they sit at
  // x≈250/560 while consumers are at x≈740+, horizontally far apart.

  // neu:
  // 42° cap: limited by viewBox-top margin (top consumer y = 36 → 8 px to
  // viewBox top y=0 at r=28). PV/Akku collision is NOT the constraint — they
  // sit at x≈250/560 while consumers are at x≈740+, horizontally far apart.
  ```

- [ ] **Step 3: Comment-Block 2 aktualisieren (`layout.ts:45-47`)**

  ```ts
  // src/render/layout.ts:45-47
  // alt:
  // 14° step keeps adjacent center-to-center gap at 85 px (= 2·R·sin(7°)),
  // well above the 48 px consumer diameter, for N=2..7. At N=8 the cap kicks
  // in and gap shrinks to 73 px — still 25 px margin to diameter.

  // neu:
  // 14° step keeps adjacent center-to-center gap at 85 px (= 2·R·sin(7°)),
  // well above the 56 px consumer diameter, for N=2..7. At N=8 the cap kicks
  // in and gap shrinks to 73 px — still 17 px margin to diameter.
  ```

- [ ] **Step 4: Tests ausführen — `layout.test.ts` GRÜN**

  ```bash
  pnpm test src/render/layout.test.ts
  ```

  Erwartet: Alle vorher roten Tests grün:
  - `places grid at (60, 270)` mit `r: 40` ✓
  - Consumer-Arc-Tests mit `c.r + NODE_R_MEDIUM + 4` ✓
  - `N=8: adjacent consumer gap ≥ 15 px clearance` ✓ (17 px tatsächlich)

### Task 3.3: `battery-ring.ts` — RING_RADIUS (atomar mit Task 3.2)

**WICHTIG (Spec §10.1, hohes Risiko):** Dieser Task MUSS im gleichen Commit wie Task 3.2 sein. Wenn `NODE_R_MEDIUM = 42` (Task 3.2) ohne `RING_RADIUS = 50` (Task 3.3) committed wird, ist der SOC-Ring unsichtbar — Regression. Beide Edits stehen im selben Working-Tree-State bis zum Commit-Punkt in Task 3.5.

**Hinweis Namens-Kollision (Spec §10):** Die Konstante `RING_RADIUS` existiert auch in `src/render/home-ring.ts:5` (Wert 60). Edit **NUR in `src/render/battery-ring.ts`**, nicht über globalen Sed/grep -l. Test-File `home-ring.test.ts` muss weiter grün sein.

**Files:**

- Modify: `src/render/battery-ring.ts:3`

- [ ] **Step 1: RING_RADIUS ändern**

  ```ts
  // src/render/battery-ring.ts:3
  // alt:
  const RING_RADIUS = 42;

  // neu:
  const RING_RADIUS = 50;
  ```

  `STROKE_WIDTH = 6` (Line 4) bleibt unverändert.

- [ ] **Step 2: Tests ausführen — `battery-ring.test.ts` GRÜN**

  ```bash
  pnpm test src/render/battery-ring.test.ts
  ```

  Erwartet:
  - `renders background ring + filled segment for 50 %` mit `/157\.\d+/` ✓
  - `ring radius is outside battery circle r=42 (no overlap)` mit `r="50"` ✓

- [ ] **Step 3: `home-ring.test.ts` weiter grün — Sanity-Check für Namens-Kollision**

  ```bash
  pnpm test src/render/home-ring.test.ts
  ```

  Erwartet: GRÜN. `home-ring.ts:RING_RADIUS = 60` ist unangetastet.

  **Bei Failure:** STOP. Das bedeutet, dass `home-ring.ts:5 RING_RADIUS` versehentlich auf `50` geändert wurde (Namens-Kollision aus §10). **Sofort-Aktion:** `git diff src/render/home-ring.ts` prüfen, falls Wert geändert: zurücksetzen auf `60` (`git checkout src/render/home-ring.ts`). Dann nur `src/render/battery-ring.ts:3` editieren.

### Task 3.4: `node-renderer.ts` — valueY + Font (Issue A)

**Files:**

- Modify: `src/render/node-renderer.ts:55, :98`

- [ ] **Step 1: `valueY` vereinheitlichen**

  ```ts
  // src/render/node-renderer.ts:55
  // alt:
  const valueY = node.kind === 'home' ? 14 : 16;

  // neu:
  const valueY = 20;
  ```

- [ ] **Step 2: Font-Size für Non-Home Value anpassen**

  ```ts
  // src/render/node-renderer.ts:98
  // alt:
  <text class="node-value" text-anchor="middle" y="${valueY}" font-weight="700" font-size="${node.kind === 'home' ? 15 : 13}">

  // neu:
  <text class="node-value" text-anchor="middle" y="${valueY}" font-weight="700" font-size="${node.kind === 'home' ? 15 : 14}">
  ```

  Home-Font bleibt 15, Non-Home wird 13→14.

- [ ] **Step 3: Vollen Test-Lauf — alles GRÜN**

  ```bash
  pnpm test
  ```

  Erwartet: ALLE Tests grün (engine, config, util, render, editor — alle).

### Task 3.5: Verifikation + Commit (atomar P3+P4+P5+P6)

- [ ] **Step 1: `pnpm check` grün**

  ```bash
  pnpm check
  ```

  Erwartet: `lint + typecheck + test` alle grün.

- [ ] **Step 2: Stage + Commit**

  ```bash
  git add src/render/icon.ts src/render/layout.ts src/render/battery-ring.ts src/render/node-renderer.ts
  git commit -m "$(cat <<'EOF'
  feat(render): enlarge node circles, reposition icons, fix battery-ring overlap

  Subspec 2026-05-15 — Icon-Positionierung und Kreis-Skalierung.

  Implementiert die vier Render-Issues aus 0.12.0-Live-Beobachtung:
  - A) Icon-Wert-Spacing (Home/PV/Batt/Grid): 1-3 px -> 9-10 px Luft
  - B) Consumer-Icon: 18 -> 24 px (Layout-Struktur 'Text aussen' bleibt)
  - C) Kreis-Radien: PV/Batt 34->42, Grid 32->40, Consumer 24->28
  - D) Battery-Default-Icon: mdi:battery -> mdi:home-battery

  Atomar wegen Battery-Ring-Kollision: bei NODE_R_MEDIUM=42 wuerde RING_RADIUS=42
  unsichtbar werden. Ring wandert auf r=50 mit demselben Commit.

  Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
  EOF
  )"
  ```

- [ ] **Step 3: `git log -1 --stat` verifizieren**

  Erwartet: Genau 4 Files modifiziert (`icon.ts`, `layout.ts`, `battery-ring.ts`, `node-renderer.ts`).

---

## Phase 4 — Visual Verifikation + Release-Prep (Commits 3a + 3b)

**Commit-Vorlage 3a:**

```
chore(build): bump version to 0.12.1

Patch-Release fuer Subspec 2026-05-15 (Icon-Positionierung + Kreis-Skalierung).
const.ts und package.json synchron.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
```

**Commit-Vorlage 3b:**

```
docs: regenerate screenshots for 0.12.1 visual update

Neue Render-Optik nach Subspec 2026-05-15:
- individual-consumers.png (Default-Config)
- by-area-grouping.png (consumer_grouping: by_area)

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
```

### Task 4.1: Sandbox-Verifikation Issue A + B + D

**Files:** keine Edits.

- [ ] **Step 1: Sandbox starten**

  ```bash
  pnpm preview
  ```

- [ ] **Step 2: Issue A verifizieren (Spacing — alle 4 Knoten mit innerem Wert)**

  Zwischen Icon und Wert-Text ist sichtbar ≥ 8 px Abstand. **Explizit pro Knoten-Typ prüfen** (Werte verschieben sich unterschiedlich stark):
  - **Home (Anker, r=50):** Wert `327 W` (oder ähnlich) sitzt jetzt 6 px tiefer als vorher (`valueY: 14 → 20`). Home-Wert war früher sehr nah am Icon — neuer Abstand soll deutlich sichtbar sein.
  - **PV/Batterie (r=42):** Wert mit Tausenderpunkt (z. B. `1.010 W`) hat ~10 px Luft zwischen Icon-Bottom und Text-Top.
  - **Grid (r=40):** Wert mit Vorzeichen (z. B. `-3.743 W`) füllt Kreis fast vollständig, aber kollidiert nicht mehr mit Icon.

  Vergleich mit Status-quo-Screenshot aus Task 1.1 Step 4 (falls aufgenommen).

- [ ] **Step 3: Issue B verifizieren (Consumer-Icon)**

  Consumer-Icons sind deutlich größer (24 px Diameter im Kreis-r=28) als vorher (18 px im r=24). Name+Wert rechts unverändert.

- [ ] **Step 4: Issue D verifizieren (Battery-Default)**

  Akku-Knoten ohne explizit konfiguriertes `icon:`-Property zeigt `mdi:home-battery` (Akku-mit-Haus-Silhouette).

- [ ] **Step 5: Battery-Ring außerhalb Kreis sichtbar**

  **Vorbedingung:** Default-Szenario hat einen aktiven `soc`-Sensor. Aus Task 1.1 Step 3 bekannt:
  - Falls Default-Szenario `soc` aktiviert: Akku-Knoten zeigt den SOC-Ring sichtbar **außerhalb** des Batterie-Kreises (r=50 außen, r=42 innen).
  - Falls Default-Szenario keinen `soc` aktiviert (Task 1.1 Step 3 hatte Workaround/Skip): **Step 5 entfällt visuell** — stattdessen verlässt sich der Test auf `battery-ring.test.ts` (Task 2.4), der den Ring-Radius geometrisch verifiziert hat. Note in Implementer-Log: „Visual ring verification deferred to unit test."

  Bei Failure (Ring überlappt Batt-Label oder ist nicht sichtbar): **STOP**, Spec §10.1 Fallback prüfen (RING_RADIUS auf 48 zurückstellen, Phase 3 + 4 erneut).

- [ ] **Step 6: Edge-Geometrie visuell sauber (Spec §9.1 Punkt 5)**

  Spec §9.1: „Edges ziehen sich automatisch an die neuen Kreis-Radien an." Sanity-Check in der Sandbox:
  - Alle Edges (PV→Home, PV→Grid, Batt→Home, Batt→Grid, Grid→Home, Home→Consumer, Grid→Batt) starten am Kreis-Rand, nicht im Kreis-Inneren (Z-Order: Kreis-Fill überdeckt Edge-Innen-Teil — visuell intakt).
  - Animations-Dots laufen entlang der Edges weiter (kein Drift durch Radius-Update).
  - Keine sichtbaren Edge-Endpunkte „in der Luft" zwischen Knoten.

  Bei Failure: **STOP**, `src/render/layout.ts:121-219` (`computeEdges`) prüfen — `bezierPath`/`straightPath` arbeitet mit Knoten-Zentren, Kreis-Fill überdeckt das Inner-Segment. Wenn das visuell bricht, ist ein anderes Problem (z. B. SVG-z-Order geändert) — kein Plan-Bug.

### Task 4.2: Sandbox-Verifikation Issue C (5-stellige Werte) — DevTools-Override

**Files:** keine Edits.

**Verfahren:** DevTools Live-Anpassung — kein Scenario-Edit nötig.

- [ ] **Step 1: Browser-Console-Override**

  ```js
  const card = document.querySelector('custom-energy-flow-card');
  card.hass.states['sensor.grid_power'].state = '-12345';
  card.hass.states['sensor.pv1_power'].state = '12345';
  card.hass.states['sensor.batt1_power'].state = '9999';
  card.hass = { ...card.hass }; // triggert Re-Render
  ```

  **Hinweis zu Sensor-Namen:** Falls die Default-Mock-Sensoren anders heißen, vorher `Object.keys(card.hass.states).filter(k => k.includes('power'))` in Console laufen lassen und die echten Sensor-IDs einsetzen.

- [ ] **Step Verify: Issue C-Erwartung**

  Text `-12.345 W` (9 Zeichen) passt im r=40-Grid-Kreis ohne Überlauf. Ebenso `12.345 W` im r=42-PV-Kreis und `+9.999 W` im r=42-Batt-Kreis.

  **Falls Text rechts/links über Kreis-Rand reicht:** STOP-Aktion in dieser Reihenfolge:
  - (1) Prüfen welcher Knoten betroffen: Grid (Diameter 80) hat am wenigsten Platz. Bei Grid-Überlauf Font reduzieren auf `13` statt `14` (Plan §3.3 Task 3.4 Step 2 anpassen, neuer Plan-Version).
  - (2) Bei PV/Batt-Überlauf (r=42, Diameter 84): nur bei Werten > 99.999 W realistisch — User-Spec sagt das ist out-of-scope (Spec §5: außerhalb HA-Power-Sensor-Range).
  - (3) Falls weiterer Anpassungsbedarf entsteht: Spec §3.2 muss revidiert werden (Radien weiter erhöhen) — NICHT Plan-internal-Fix.

### Task 4.3: Bundle ≤ 60 kB

**Files:** keine Edits.

- [ ] **Step 1: Production-Build**

  ```bash
  pnpm build
  ```

  Erwartet: Erfolgreicher Build, `dist/custom-energy-flow-card.js` erzeugt.

- [ ] **Step 2: Bundle-Größe prüfen**

  ```bash
  ls -la dist/custom-energy-flow-card.js
  ```

  Erwartet: Größe < 60 KB (Spec §11). Bei Überschreitung: **STOP**. Mögliche Maßnahme: Whitespace-Trim wie in Commit `6cdbabd` (`perf(render): trim template whitespace`).

- [ ] **Step 3: Bundle-Analyse (verbotene Imports?)**

  ```bash
  pnpm build:analyze
  ```

  Erwartet: `@mdi/js` ist NICHT im Bundle (devDep, nicht prod). Nur `lit` als Runtime-Dep.

### Task 4.4: Version-Bump (Spec P9)

**Files:**

- Modify: `src/const.ts:3`
- Modify: `package.json:3`

- [ ] **Step 1: `src/const.ts` Version bumpen**

  ```ts
  // src/const.ts:3
  // alt:
  export const CARD_VERSION = '0.12.0';

  // neu:
  export const CARD_VERSION = '0.12.1';
  ```

- [ ] **Step 2: `package.json` Version syncen**

  ```json
  // package.json:3
  // alt:
  "version": "0.12.0",

  // neu:
  "version": "0.12.1",
  ```

- [ ] **Step 3: `hacs.json` prüfen**

  ```bash
  grep -E "version|0\.12" hacs.json
  ```

  Erwartet: leere Ausgabe (kein hardcoded Version-Field in `hacs.json` — HACS liest aus git-Tags). Falls Output: **STOP** und prüfen.

- [ ] **Step 4: Stage + Commit 3a**

  ```bash
  git add src/const.ts package.json
  git commit -m "$(cat <<'EOF'
  chore(build): bump version to 0.12.1

  Patch-Release fuer Subspec 2026-05-15 (Icon-Positionierung + Kreis-Skalierung).
  const.ts und package.json synchron.

  Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
  EOF
  )"
  ```

### Task 4.5: Pre-Release-Smoke-Test (ADR-0012)

**Files:** keine Edits.

- [ ] **Step 1: Smoke-Test ausführen**

  ```bash
  pnpm smoke
  ```

  Erwartet: GRÜN. `scripts/smoke-test.mjs` rendert die Card mit Stub-Hass und prüft viewBox-Interpolation + Custom-Element-Registrierung.

- [ ] **Step 2: Bei Failure — Diagnose-Pfad**

  **STOP**. Konkrete Analyse-Reihenfolge:
  - (a) Output des Smoke-Test-Failures lesen. Welcher Assert bricht?
  - (b) Falls viewBox-Assert bricht: `src/const.ts` prüfen — `VIEWBOX = { width: 960, height: 540 }` sollte unverändert sein. Falls geändert: Edit reverten.
  - (c) Falls Custom-Element-Registrierung bricht: `dist/custom-energy-flow-card.js` neu bauen (`pnpm build`) und Smoke nochmal.
  - (d) Falls Render-Pfad-Failure (Lit-Template-Error): einer der Phase-3-Edits hat einen Syntax-Fehler. `pnpm typecheck` zeigt die Quelle.
  - (e) Falls keiner der obigen: externer Bug — User informieren, Plan pausieren.

### Task 4.6: Screenshots regenerieren

**Files:**

- Modify (regen): `docs/screenshots/individual-consumers.png`
- Modify (regen): `docs/screenshots/by-area-grouping.png`

- [ ] **Step 1: Browser-Window konfigurieren**

  Browser auf **1920×1080** Viewport stellen (Standard-Desktop-Größe, konsistent mit alten Screenshots aus Repo-History). Optional: Chrome DevTools → „Toggle device toolbar" → Custom 1920×1080. Hintergrund: HA-Light-Theme (`#ffffff` Card-Background).

- [ ] **Step 2: Sandbox-Default-Scenario laden**

  ```bash
  pnpm preview
  ```

  Lade Default-Konfiguration (`individual-consumers`-Szenario aus `preview-mocks.ts`).

- [ ] **Step 3: Screenshot der Card-DOM-Node (nicht Viewport)**

  Browser-DevTools → Inspect `<custom-energy-flow-card>` → Rechtsklick → „Capture node screenshot". Alternativ: OS-Screenshot mit Crop auf die Card-Bounding-Box. Speichern als `docs/screenshots/individual-consumers.png`, überschreibe das alte File.

- [ ] **Step 4: `by-area-grouping`-Szenario laden**

  Switch zu Szenario mit `consumer_grouping: by_area` in der Sandbox.

- [ ] **Step 5: Browser-Screenshot machen (by-area)**

  Analog Step 3 (Card-DOM-Node-Screenshot), speichern als `docs/screenshots/by-area-grouping.png`.

- [ ] **Step 6: Stage + Commit 3b**

  ```bash
  git add docs/screenshots/individual-consumers.png docs/screenshots/by-area-grouping.png
  git commit -m "$(cat <<'EOF'
  docs: regenerate screenshots for 0.12.1 visual update

  Neue Render-Optik nach Subspec 2026-05-15:
  - individual-consumers.png (Default-Config)
  - by-area-grouping.png (consumer_grouping: by_area)

  Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
  EOF
  )"
  ```

### Task 4.7: `examples/preview.html` Sanity-Check

**Files:** keine Edits erwartet.

- [ ] **Step 1: Verifizieren dass keine Edits nötig waren**

  ```bash
  grep -E "NODE_R|r=" examples/preview.html
  ```

  Erwartet: leere Ausgabe. Sandbox rendert automatisch mit neuen Werten — Spec §0.2 hat das verifiziert.

- [ ] **Step 2: Falls Output (unerwartet)**

  **STOP**. Spec §0.2 prüfen, falls hardcoded Radien-Werte gefunden werden, Spec-Update statt Plan-Workaround.

### Task 4.8: Phase-4-Verifikation

- [ ] **Step 1: `pnpm check` grün**

  ```bash
  pnpm check
  ```

- [ ] **Step 2: `git log` zeigt 2 neue Commits (3a + 3b)**

  ```bash
  git log --oneline -3
  ```

  Erwartet:
  - `docs: regenerate screenshots for 0.12.1 visual update`
  - `chore(build): bump version to 0.12.1`
  - `feat(render): enlarge node circles, reposition icons, fix battery-ring overlap`

---

## Phase 5 — Doku-Updates (Commit 4)

**Commit-Vorlage:**

```
docs(adr,specs,readme): cross-reference icon-positioning subspec + ADR-0017 update

Doku-Pflicht aus Subspec 2026-05-15 §7:
- ADR-0017: Consumer-Radius 24->28, Gap-Margin 25->17 px bei N=8
- Hauptspec 2026-05-10: Default-Icon-Tabelle mdi:battery -> mdi:home-battery
- Subspec 2026-05-13: Cross-Reference-Hinweise vor Zeile 217 + 312
- README: Changelog 0.12.1

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
```

### Task 5.1: ADR-0017 — Werte-Update

**Files:**

- Modify: `docs/adr/0017-adaptive-svg-layout.md`

- [ ] **Step 1: ADR-0017 öffnen und §"Entscheidung"/„Konsequenzen" lokalisieren**

  ```bash
  grep -n "Gap\|Consumer.*Radius\|r=\|NODE_R" docs/adr/0017-adaptive-svg-layout.md
  ```

  Notiere die grep-Treffer (Zeilennummern + Inhalt). Branch in Step 2 hängt davon ab.

- [ ] **Step 2a (falls grep-Treffer für „Gap" oder „25 px" liefert): bestehende Werte ersetzen**

  In der gefundenen Zeile: Wert „25 px bei R=350 und N=8" → „17 px bei R=350 und N=8 mit r=28". Falls dabei Consumer-Radius `r=24` erwähnt wird: auf `r=28` umstellen.

- [ ] **Step 2b (falls grep aus Step 1 leer ist oder kein expliziter Consumer-Radius im ADR): Hinweis-Block einfügen**

  Füge am Ende von §"Konsequenzen" (oder einer geeigneten Stelle) folgenden Block ein:

  ```markdown
  > **Update 2026-05-15 (Subspec 2026-05-15 icon-positionierung):** Consumer-Radius
  > erhöht von 24 auf 28 (für stärkere Icon-Präsenz). Daraus folgt: Adjacent-Gap-
  > Margin bei N=8 schrumpft von 25 px auf 17 px — bleibt über dem 15-px-Mindestmaß.
  ```

- [ ] **Step 3: Save**

### Task 5.2: Hauptspec 2026-05-10 — Default-Icon-Tabelle

**Files:**

- Modify: `docs/specs/2026-05-10-custom-energy-flow-card-design.md:730`

- [ ] **Step 1: Default-Icon-Tabelle aktualisieren**

  ```markdown
  // alt (Zeile 730):
  | Akku | `mdi:battery` |

  // neu:
  | Akku | `mdi:home-battery` |
  ```

- [ ] **Step 2: Hinweis-Block ergänzen (verbindlich, nicht optional)**

  Direkt vor der Default-Icon-Tabelle (Zeile 730) folgenden Block einfügen — gibt dem Reader Kontext, dass der Wert aus einer Subspec stammt:

  ```markdown
  > **NB (2026-05-15):** Default-Icon für Akku wurde in Subspec 2026-05-15 von
  > `mdi:battery` auf `mdi:home-battery` aktualisiert.
  ```

  Falls in der Spec-Datei direkt vor Zeile 730 bereits ein Einleitungs-Absatz steht, den Hinweis-Block direkt vor diesem Absatz platzieren.

### Task 5.3: Subspec-Cross-References — 2026-05-12 + 2026-05-13

**Files:**

- Modify: `docs/specs/2026-05-12-aspect-ratio-redesign.md`
- Modify: `docs/specs/2026-05-13-icons-and-editor-ids.md`

#### 5.3.a — Subspec 2026-05-12 (Aspect-Ratio-Redesign) Cross-Reference

Spec §7 (Doku-Pflicht): „§1.2-Tabelle (NODE*R*\* alle Knoten-Radien unverändert): Hinweis-Block dass die ursprünglich ‚unveränderten' Werte in dieser Spec geändert werden."

- [ ] **Step 1: §1.2 Layout-Konstanten-Tabelle lokalisieren**

  ```bash
  grep -n "NODE_R\|§ 1\.2\|Layout-Konstanten" docs/specs/2026-05-12-aspect-ratio-redesign.md | head -5
  ```

  Erwartet: Tabelle mit `NODE_R_*`-Zeile, die heute „unverändert" steht.

- [ ] **Step 2: Hinweis-Block vor (oder direkt nach) der NODE_R-Tabellenzeile einfügen**

  ```markdown
  > **NB (2026-05-15):** Die in dieser Tabelle als „unverändert" markierten
  > `NODE_R_*`-Werte (PV/Batt 34, Consumer 24, Grid 32) wurden in Subspec
  > 2026-05-15 angepasst (auf 42/28/40). Siehe
  > [`docs/specs/2026-05-15-icon-positionierung-und-kreis-skalierung.md`](./2026-05-15-icon-positionierung-und-kreis-skalierung.md) §3.2.
  ```

  Die Tabellenzelle selbst NICHT ändern — Subspec 2026-05-12 dokumentiert den Stand zur Zeit ihrer Erstellung. Hinweis-Block macht den Cross-Reference explizit.

#### 5.3.b — Subspec 2026-05-13 (Icons + Editor-IDs) Cross-References

- [ ] **Step 1: Hinweis vor Zeile 217 (Default-Icons-Liste) ergänzen**

  Suche die Zeile mit `Default-Icons pro Knoten-Kind aus Hauptspec §3.2 werden zur Quelle der Wahrheit`. Direkt davor einen Hinweis-Block einfügen:

  ```markdown
  > **NB (2026-05-15):** `mdi:battery` wurde in Subspec 2026-05-15 auf
  > `mdi:home-battery` aktualisiert. Siehe [`docs/specs/2026-05-15-icon-positionierung-und-kreis-skalierung.md`](./2026-05-15-icon-positionierung-und-kreis-skalierung.md).
  ```

- [ ] **Step 2: Hinweis im DEFAULT_MDI_ICONS-Code-Block (Zeile 312) ergänzen**

  Suche den Code-Block mit:

  ```ts
  export const DEFAULT_MDI_ICONS: Record<LayoutNode['kind'], string> = {
    pv: 'mdi:solar-power',
    battery: 'mdi:battery',
    ...
  ```

  Füge **am Anfang** des Code-Blocks (über der ersten Zeile) einen Kommentar ein:

  ```ts
  // NB: `battery`-Default + NODE_ICON_BOX-Werte aktualisiert in
  // docs/specs/2026-05-15-icon-positionierung-und-kreis-skalierung.md
  export const DEFAULT_MDI_ICONS: Record<LayoutNode['kind'], string> = {
    pv: 'mdi:solar-power',
    battery: 'mdi:battery',
    ...
  ```

  **WICHTIG:** Werte im Code-Block NICHT ändern (Subspec 2026-05-13 dokumentiert den Stand zur Zeit ihrer Erstellung). Der Hinweis-Block macht den Verweis explizit.

### Task 5.4: README — Changelog 0.12.1

**Files:**

- Modify: `README.md`

- [ ] **Step 1: Changelog-Sektion lokalisieren**

  ```bash
  grep -n "^## Changelog\|^### 0\.12" README.md
  ```

- [ ] **Step 2: Neuen 0.12.1-Block einfügen**

  Über dem 0.12.0-Block (Reverse-Chronologie):

  ```markdown
  ### 0.12.1 — 2026-05-15

  Visuelles Polish-Release. Behebt vier Render-Issues aus dem Live-Betrieb:

  - **Icon-Positionierung in den Knoten-Kreisen vergrößert** (~10 px Spacing zwischen Icon und Wert)
  - **PV/Batterie/Grid-Kreise vergrößert** für 4-5-stellige Werte (z. B. `-12.345 W`)
  - **Consumer-Icon vergrößert** (18 → 24 px)
  - **Battery-Ring** sitzt jetzt außerhalb des Batterie-Kreises
  - **Default-Icon für Batterie:** `mdi:battery` → `mdi:home-battery`

  Keine Config-Migration nötig. Bestehende User-Configs mit eigenem `icon:`-Property
  bleiben unverändert.
  ```

### Task 5.5: Final-Verifikation (Spec §11 Erfolgs-Kriterien)

- [ ] **Step 1: `pnpm check` grün**

  ```bash
  pnpm check
  ```

- [ ] **Step 2: LOC-Regression-Check (Spec §11)**

  ```bash
  wc -l src/render/icon.ts src/render/layout.ts src/render/battery-ring.ts src/render/node-renderer.ts
  ```

  Erwartet: Alle Files bleiben unter den conventions §3 Limits (250 LOC für `render/`). `node-renderer.ts` lag bei 246 LOC vor dieser Spec — sollte um ≤ 1 LOC gewachsen sein (oder gleich geblieben, weil nur Werte-Edits).

- [ ] **Step 3: Unverändert-Check (Spec §11)**

  ```bash
  git diff main -- src/engine src/config src/ha src/i18n src/editor.ts src/editor-list-sections.ts src/card.ts src/card-helpers.ts src/card-styles.ts
  ```

  Erwartet: **leere Ausgabe**. Spec §0.0 Verbots-Liste verbietet diese Layer.

- [ ] **Step 4: Single-Source-Check (Spec §11)**

  ```bash
  grep -rn "32" src/render/ | grep -v "tsx\|^Binary" | grep -E "= 32|= 32;|r: 32|r=32"
  ```

  Erwartet: leere Ausgabe (oder nur historische Strings ohne Bezug zu PV/Akku-Radius).

- [ ] **Step 5: Bundle ≤ 60 kB**

  ```bash
  pnpm build && ls -la dist/custom-energy-flow-card.js
  ```

- [ ] **Step 6: Pre-Release-Smoke-Test (ADR-0012)**

  ```bash
  pnpm smoke
  ```

- [ ] **Step 7: ADR-0020 No-Op-Bestätigung (Spec §7)**

  Spec §7 sagt: „ADR-0020 (`docs/adr/0020-ha-icon-via-foreignobject.md`): Cross-Reference: Icon-Box-Werte werden in dieser Subspec überarbeitet. **Kein Edit am ADR-Inhalt selbst.**"

  ```bash
  git diff main -- docs/adr/0020-ha-icon-via-foreignobject.md
  ```

  Erwartet: **leere Ausgabe**. ADR-0020 bleibt unverändert.

  **Bei Output:** STOP-Aktion: ADR-0020 wurde versehentlich editiert (vermutlich Tool-Vermischung mit ADR-0017 in Task 5.1). Sofort-Aktion: `git checkout docs/adr/0020-ha-icon-via-foreignobject.md` — Datei auf main-Stand zurücksetzen. Dann Phase 5 fortsetzen ab Task 5.5.

### Task 5.6: Commit + Final

- [ ] **Step 1: Stage + Commit 4**

  ```bash
  git add docs/adr/0017-adaptive-svg-layout.md \
          docs/specs/2026-05-10-custom-energy-flow-card-design.md \
          docs/specs/2026-05-12-aspect-ratio-redesign.md \
          docs/specs/2026-05-13-icons-and-editor-ids.md \
          README.md
  git commit -m "$(cat <<'EOF'
  docs(adr,specs,readme): cross-reference icon-positioning subspec + ADR-0017 update

  Doku-Pflicht aus Subspec 2026-05-15 §7:
  - ADR-0017: Consumer-Radius 24->28, Gap-Margin 25->17 px bei N=8
  - Hauptspec 2026-05-10: Default-Icon-Tabelle mdi:battery -> mdi:home-battery
  - Subspec 2026-05-12: Cross-Reference-Hinweis vor NODE_R-Tabelle §1.2
  - Subspec 2026-05-13: Cross-Reference-Hinweise vor Zeile 217 + 312
  - README: Changelog 0.12.1

  Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
  EOF
  )"
  ```

- [ ] **Step 2: `git log --oneline -5` finale Verifikation**

  ```bash
  git log --oneline -5
  ```

  Erwartet (chronologisch absteigend):
  - `docs(adr,specs,readme): cross-reference icon-positioning subspec + ADR-0017 update`
  - `docs: regenerate screenshots for 0.12.1 visual update`
  - `chore(build): bump version to 0.12.1`
  - `feat(render): enlarge node circles, reposition icons, fix battery-ring overlap`
  - `test(render): assert new icon-box + node-radii + battery-ring radius`

- [ ] **Step 3: `pnpm check` ein letztes Mal grün**

  ```bash
  pnpm check
  ```

---

## Self-Review-Checkliste (vor Plan-Abschluss — Hauptagent durchgeht)

- [ ] **Spec-Coverage:** Jede Spec-Sektion hat einen Task — explizites Mapping in File Structure und Task-Header
  - Spec §3.1 → Task 3.1
  - Spec §3.2 → Task 2.1 (Export) + Task 3.2 (Werte)
  - Spec §3.3 → Task 3.4
  - Spec §3.4 → Task 3.3
  - Spec §3.5 → Task 4.4
  - Spec §6.1 → Task 2.2
  - Spec §6.2 → Task 2.3
  - Spec §6.3 → Task 2.4
  - Spec §6.4 → Task 4.1 + 4.2
  - Spec §7 → Phase 5 (Task 5.1 ADR-0017 + 5.2 Hauptspec + 5.3.a Subspec-2012 + 5.3.b Subspec-2013 + 5.4 README + 5.5 Step 7 ADR-0020-Confirm)
  - Spec §10 → Pre-Check in Task 3.1 (MDI), Sanity in Task 3.3 (Namens-Kollision), Sandbox in Task 4.1 (Ring-Fallback)
  - Spec §11 → Task 5.5
  - Spec §12 P1–P10 → Phase 1 (P1) + Phase 2 (P2) + Phase 3 (P3–P6) + Phase 4 (P7–P9) + Phase 5 (P10)
- [ ] **Spec-Plan-Alignment:** Plan widerspricht der Spec nirgends; bei Plan-Wert ≠ Spec-Wert → Spec wäre zu aktualisieren (aktuell keine bekannten Drifts)
- [ ] **Keine Placeholders** (TBD/TODO/Similar-to)
- [ ] **Type-Consistency:** `NODE_R_MEDIUM`, `RING_RADIUS`, `mdi:home-battery`, `valueY`, `centerY` in allen Tasks identisch genannt
- [ ] **Commit-Granularität:** 4 Commits + 1 No-Commit (Pre-Edit-Gate), Phasen-Reihenfolge stabil
- [ ] **Verifikations-Pipeline:** pro Phase `pnpm check`/`pnpm test`-Gates
- [ ] **Don't-Touch-Liste respektiert:** Tabelle in Plan-Header reproduziert Spec §0.4
- [ ] **Code-Reuse-Tabelle:** Task 2.4 nutzt explizit `serialize()`-Helper aus `battery-ring.test.ts:5-13`
- [ ] **Anti-Patterns vermieden:** Task 3.1 + 3.3 warnen explizit vor `// alt: …`-Kommentar-Übernahme; Task 3.3 warnt vor globalem Sed wegen `RING_RADIUS`-Namens-Kollision
- [ ] **Standing-Reminder pro Phase:** im Header
- [ ] **TDD-Order:** Phase 2 rot vor Phase 3 grün (atomarer feat-Commit am Ende von Phase 3)
- [ ] **STOP-Conditions:** Task 1.1 (Baseline rot), Task 3.1 Step 1 (MDI nicht verfügbar), Task 3.3 Step 3 (home-ring brechen), Task 4.1 Step 5 (Ring-Fallback), Task 4.3 Step 2 (Bundle > 60 kB), Task 4.5 Step 2 (Smoke-Test rot), Task 4.7 Step 2 (preview.html hat unerwartete Radien)
- [ ] **Framework-Quirks abgedeckt:** `noUncheckedIndexedAccess` in Task 2.3 Step 4 (mit `!`-Erklärung), kein Lit-CSS-Tag-Issue (keine CSS-Edits), kein `shouldUpdate`-Issue (kein Lifecycle-Edit)
- [ ] **Build-Pipeline explizit:** keine Edits nötig — in File Structure explizit dokumentiert (`tsconfig`, `.eslintrc.cjs`, `vitest.config.ts` alle „Kein Edit")
- [ ] **Doku-Pflicht (conventions §12):** ADR-0017 (Task 5.1), Hauptspec (Task 5.2), Subspec-2013 (Task 5.3), README-Changelog (Task 5.4) — alle 4 Pflicht-Updates

---

## Out of Scope (nicht Teil dieses Plans)

Aus Spec §9.2 + Plan-Entscheidungen:

- **kW-Format-Switch:** `format-power.ts` zeigt weiterhin W mit Tausenderpunkt. Bei `> 9999 W` keine automatische Umstellung auf `kW`. → eigene Subspec falls gewünscht, v1.x-Kandidat.
- **Default-Icon-Review für andere Knoten** (Solar/Grid/Home/Consumer): nur Battery wurde vom User gemeldet. → ggf. künftige Spec mit Visual-Companion-Review.
- **Dynamisches Kreis-Resizing pro Wert-Länge** (Brainstorming-Variante C): bewusst abgelehnt.
- **Consumer-Layout uniform machen** (Brainstorming-Variante B): bewusst abgelehnt.
- **Editor-Banner „Du nutzt noch alten Default":** Nicht nötig.
- **Coverage-Include für `src/render/**`:\*\* Out-of-Scope dieser Spec (§6.5).
- **`examples/preview-mocks.ts` permanenten edge-case-Scenario einbauen:** Aus Plan-Scope entfernt (User-Entscheidung 2026-05-15) — Issue-C-Verifikation läuft via DevTools-Override (Task 4.2). Kandidat für separate spätere Spec falls Reproduzierbarkeit als Visual-Regression-Schutz gewünscht wird.

---

## Notizen für den Implementierer

- **TDD-Order in Phase 2/3:** Nach Phase 2 (Commit `test(render):`) ist `pnpm test` ROT. Das ist gewollt. Erst nach Phase 3 (Commit `feat(render):`) ist `pnpm test` wieder GRÜN. **Zwischen Phase 2 und Phase 3 KEIN `pnpm check`-Gate.** Wenn ein Test in Phase 2 grün bleibt, der eigentlich rot sein sollte → Test-Bypass-Verdacht → STOP, User klären.
- **Battery-Ring-Kollision (Spec §10.1, hohes Risiko):** Task 3.2 (NODE_R_MEDIUM=42) und Task 3.3 (RING_RADIUS=50) MÜSSEN im gleichen Commit (Phase 3 Task 3.5). Bei Mehrfach-Commit-Versuch zwischen 3.2 und 3.3 ist der SOC-Ring temporär unsichtbar — Regression.
- **RING_RADIUS-Namens-Kollision:** `home-ring.ts:5` und `battery-ring.ts:3` haben beide eine Konstante `RING_RADIUS`. Task 3.3 ist file-spezifisch — KEIN `grep -l RING_RADIUS | xargs sed`. Task 3.3 Step 3 verifiziert `home-ring.test.ts` weiter grün.
- **Spec-Plan-Drift:** Wenn beim Implementieren ein Spec-Detail X falsch wirkt → Spec-Update als zusätzlicher Plan-Task einbauen, **nicht** ohne Spec-Update fortfahren.
- **MDI-Verfügbarkeit (Task 3.1 Step 1):** `mdi:home-battery` ist seit `@mdi/js@^7.0` standard. `package.json:22` hat `^7.4.47` — sollte verfügbar sein. Falls nicht: STOP und mit User klären (Workaround = anderes Default-Icon).
- **Ring-Fallback bei visuellem Konflikt (Spec §10.1):** Falls Battery-Ring im Sandbox optisch das Batt-Label überlappt (Task 4.1 Step 5), RING_RADIUS auf 48 zurückstellen und neu testen. Spec hat konkretes Trigger-Kriterium definiert.
- **Screenshots Konsistenz:** Task 4.6 — Größe/Crop/Hintergrund passend zu alten Screenshots halten, damit der README-Visual-Eindruck konsistent bleibt. Browser-Auflösung 1920×1080 oder DevTools-Device-Emulator.
- **Sandbox-Werte für Issue C (Task 4.2):** DevTools-Live-Override ist verbindlich (User-Entscheidung 2026-05-15). Sensor-Namen aus `Object.keys(card.hass.states)` zur Laufzeit ermitteln, falls Default-Mocks andere IDs verwenden als angenommen.
- **Conventional-Commit-Scopes:** Erlaubt aus conventions §8: `engine, render, config, editor, util, ha, card, i18n, docs, build, ci`. Kommaseparierte Scopes (z.B. `docs(adr,specs,readme):`) sind im Repo-git-log üblich und akzeptiert. **NICHT** verwenden: `release` (nicht in Liste). Für Version-Bumps an `src/const.ts` (top-level, nicht `src/util/`) ist `chore(build):` der korrekte Scope — `util` wäre falsch, weil die Datei nicht im `util/`-Layer liegt.
- **Edge-Cases (Spec §5) — kein expliziter Test-Task, aber Sandbox-Checkliste:** Falls beim Sandbox-Run (Task 4.1) Zeit ist, zusätzlich verifizieren: (a) User-Config mit `icon: '🔋'` (Emoji-Fallback) zeigt Emoji statt MDI-Icon — verifiziert dass `emojiFontSize`/`emojiY`-Werte synchron mit `size`/`centerY` sind; (b) NaN-Sensor zeigt `'— W'`; (c) 0-W-Sensor zeigt `'0 W'`. Bei Abweichung: STOP, Spec §5 prüfen. Spec fordert dafür keinen automatisierten Test.
