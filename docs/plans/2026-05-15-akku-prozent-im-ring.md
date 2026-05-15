# Akku-Prozent-im-Ring Implementation Plan

**Status:** v4 (post-subagent-5-pro-task-konfidenz, ready for user)

> **For agentic workers:** REQUIRED SUB-SKILL: Use `superpowers:subagent-driven-development` (recommended) or `superpowers:executing-plans` to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** SoC-Ring-Stroke `6 → 14` und neuer SVG-`<text>` für den gerundeten SoC-Wert „X %" tangential im farbigen Stroke (oben-links, rotate −45°, font 9, weight 400, weiß) — plus `formatSocPct`-Helper als Single-Source für SVG-Text + aria-Label.

**Architecture:** Reine Render-Layer-Änderung an `src/render/battery-ring.ts` (Stroke, `<text>`, Konstanten, neuer Export) und `src/render/node-renderer.ts:47` (aria-Label). Engine, Config, HA-Helpers, i18n (read-only), Editor und `card.ts` werden NICHT angefasst (ESLint `no-restricted-paths` bricht CI bei Verstoß). Layer-Zone für `src/render/` erlaubt den nötigen `./i18n`-Import bereits.

**Tech Stack:** TypeScript 5.4 strict (`noUncheckedIndexedAccess: true`), Lit 3.2, Rollup 4, Vitest 1.4, ESLint 8.57, pnpm 9. Test-Framework Vitest mit Node-Env (battery-ring.test.ts braucht kein DOM, der serialize-Helper liest Lit-`TemplateResult.strings/values` direkt). Bundle ≤ `BUNDLE_BUDGET_BYTES` aus `scripts/kpi.mjs` (60 KiB = 61440 B), `card.ts` ≤ 200 LOC (nicht angefasst).

**Verbindliche Lese-Quellen (vor Start):**

- Spec: `docs/specs/2026-05-15-akku-prozent-im-ring.md` — **Single-Source aller Constraints, Werte, Begründungen**
- `CLAUDE.md` — Projekt-Schnellreferenz, Regeln 1–10, Workflow
- `docs/conventions.md` — Code-Stil, Naming, Commit-Konventionen (§11 Anti-Patterns, §12 Doku-Pflicht)
- `docs/architecture.md` — Layer-Architektur (§2 Layer-Tabelle)
- ADR-0004 (Engine pure — hier nicht aktiv berührt, aber Pflicht-Constraint), ADR-0009 (Layer-Boundaries), ADR-0010 (Single-Source-Util), ADR-0012 (Smoke-Test-Gate), ADR-0021 (Code-Review-Workflow)

**Konzepte (verbindlich, siehe Spec für Details):**

- **Datenfluss-Pipeline** (Spec §0.3): `batterySoc: ReadonlyMap<string, number>` kommt aus `config/system-state.ts:81-85` über `RenderContext` (`render/context.ts:14`) in `renderNode` (`node-renderer.ts:40`) — diese Spec ändert nur die letzte Render-Stufe.
- **Lit-Lifecycle:** unverändert (kein Eingriff in `card.ts` `shouldUpdate/willUpdate/render`).
- **Engine-Warnings statt Throws** (conventions §6.1): irrelevant — Engine nicht angefasst.
- **Code-Reuse-Tabelle** (Spec §3.3): `formatPowerW` (`util/format-power.ts:14`) ist Stil-Vorbild (Math.round + Leerzeichen + Einheit); `DE.units.percent` (`i18n/de.ts:18`) ist Single-Source für `%`. `flow-renderer.ts:57` (`Math.round` für Warning-Magnitude) ist **explizit aus dem Scope ausgeschlossen**.
- **Anti-Patterns** (Spec §0.0 Verbote + §3.3): Inline-Format-Duplikate, SVG-String-Konkatenation, Sub-Template `${label}` ohne Helper-Rekursivität, Theme-aware Fill, zweite `RING_RADIUS`-Definition.

**Standing Requirement für jeden Task** (Disziplin-Block, gilt durchgehend):

> 🛑 Jede Code-Zeile, die in dieser Plan-Datei als TypeScript/JS-Block steht, ist als Vorschlag zu verstehen, der **`docs/conventions.md`** und **alle in Spec §0.1 referenzierten ADRs** einhalten muss. Vor dem `git commit` jedes Tasks: **`pnpm check` läuft grün durch** (`lint + typecheck + test`). Lint erzwingt automatisch:
>
> - Layer-Boundaries (ADR-0009) — `src/render/battery-ring.ts` darf `./i18n` importieren, KEINE neuen Cross-Layer-Imports
> - Imports-Reihenfolge (`import/order`, conventions §4) — alphabetisch innerhalb der Gruppen, `external` vor `internal`
> - `no-console` außer info/warn/error (conventions §7)
> - `no-explicit-any` ohne expliziten Disable — `formatSocPct(socPct: number): string` strikt typisiert
> - `no-non-null-assertion` außer in Tests
>
> Entwickler-Disziplin erzwungen manuell:
>
> - Single-Source `formatSocPct` — kein Inline-`Math.round(...)%`-Duplikat irgendwo
> - Funktionale Iteration (`.map`/`.filter`/`.reduce` — irrelevant hier, keine Listen)
> - Conventional-Commit-Format (conventions §8): scope `render` für Code, `docs` für Doku, `chore` für KPI-Snapshots
> - Keine WHAT-Kommentare; Strings aus `i18n/de.ts` (conventions §2, §11.5)
> - **TDD-First** für `util/`-artigen Helper `formatSocPct`: Test rot, dann Code, dann grün. Render-Tests können test-mit-code parallel laufen (Spec §6.1).
>
> **KPI-Snapshot-Pflicht (siehe `CLAUDE.md` „Code-Review — Workflow"):**
>
> - Vor erstem Task: `pnpm kpi:snapshot --label pre-akku-prozent-im-ring --phase pre`
> - Nach letztem Task: `pnpm kpi:snapshot --label post-akku-prozent-im-ring --phase post`
> - Code-Review-Workflow läuft danach VOR `finishing-a-development-branch` (Pässe 1+2+3+6 bei Plan-Komplexität „mittel" — siehe §12 Plan-Schritt 12 in der Spec).

**Elements NICHT anfassen** (aus Spec §0.4 Don't-Touch-Liste — 1:1 reproduziert):

| Element                                                   | Wo                                     | Warum                                                                                      |
| --------------------------------------------------------- | -------------------------------------- | ------------------------------------------------------------------------------------------ |
| `RING_RADIUS = 50`                                        | `battery-ring.ts:3`                    | Radius bleibt gleich; nur Stroke wächst.                                                   |
| `transform="rotate(-90)"` auf Ring-Gruppe                 | `battery-ring.ts:12,26,40`             | Damit gefülltes Segment bei SoC > 0 oben startet und im Uhrzeigersinn wächst.              |
| Drei-Fall-Logik (`≤ 0.5`, `≥ 99.5`, dazwischen)           | `battery-ring.ts:10-58`                | Sonderfälle bleiben semantisch gleich. Nur `STROKE_WIDTH`-Wert wird angepasst.             |
| `showRing`-Guard                                          | `node-renderer.ts:41`                  | Bei fehlendem SoC-Sensor: kein Ring, kein Text (unverändert).                              |
| `NODE_R_MEDIUM = 42` (Akku-Kreis-Radius)                  | `render/layout.ts:30`                  | Akku-Kreis-Geometrie unverändert.                                                          |
| `labelYOffset(battery) = node.r + 22 = 64`                | `node-renderer.ts:153-154`             | Name-Y-Offset bleibt — 7 px Reserve zum neuen Ring-Außenrand visuell akzeptabel.           |
| `valueY = 20` (Watt-Text-Y im Kreis-Inneren)              | `node-renderer.ts:55`                  | Watt-Text-Position unverändert.                                                            |
| `nodeIcon(...)`-Aufruf + Icon-Box-Konstanten in `icon.ts` | `node-renderer.ts:86`, `icon.ts:20-26` | Icon-Position unverändert.                                                                 |
| `stroke-linecap="round"` auf gefülltem Ring               | `battery-ring.ts:54`                   | Optisch sauberer Rand des SoC-Segments — unverändert.                                      |
| `opacity="0.18"` auf Hintergrund-Ring                     | `battery-ring.ts:18, 46`               | Niedrig-SoC-Edge-Case akzeptiert (L1) — keine Opazitäts-Erhöhung.                          |
| `flow-renderer.ts:57` (`~${Math.round(...)} W`)           | `flow-renderer.ts:57`                  | Warning-Magnitude, anderer Use-Case (Watt mit Tilde). NICHT durch `formatSocPct` ersetzen. |

**Phases:**

- Phase 0. **KPI-Pre-Snapshot + Playwright-Capture** (verbindlich, vor erstem Code-Task) — 1 Task
- Phase 1. **Test-Helper-Vorabfix:** `serialize`-Rekursivität in `battery-ring.test.ts` — 1 Task (Test-Datei-Edit ohne neuen Assertion)
- Phase 2. **`formatSocPct` + `renderBatteryRing`-Erweiterung** (TDD) — 4 Tasks
- Phase 3. **aria-Label-Angleichung in `node-renderer.ts`** — 1 Task
- Phase 4. **Sandbox/Preview-Verifikation + Smoke + Bundle** — 1 Task
- Phase 5. **Doku-Cross-Reference + Post-Snapshot + Code-Review-Trigger** — 2 Tasks

Gesamtumfang: 10 Tasks in 6 Phasen.

---

## File Structure (decomposed before tasks)

### Modified

| Datei                                                               | Verantwortlichkeit                                                                                                                                                           | Phase |
| ------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----- |
| `src/render/battery-ring.test.ts`                                   | Phase 1: `serialize`-Rekursivität. Phase 2: neue Tests (Stroke, Text, `formatSocPct`, `part`-Hooks).                                                                         | 1 + 2 |
| `src/render/battery-ring.ts`                                        | Phase 2: `STROKE_WIDTH 6→14`, neue Konstanten, neuer `<text>`, Strukturwechsel (`<text>` außerhalb `rotate(-90)`-Gruppe), Export `formatSocPct` mit `Number.isFinite`-Guard. | 2     |
| `src/render/node-renderer.ts`                                       | Phase 3: Zeile 47 aria-Label-Format auf `formatSocPct(socPct as number)`. Import um `formatSocPct` erweitern.                                                                | 3     |
| `docs/specs/2026-05-15-icon-positionierung-und-kreis-skalierung.md` | Phase 5: Cross-Reference-Block, dass Stroke 6 → 14 in der neuen Subspec abgelöst wird.                                                                                       | 5     |

### Created

Keine neuen Files. Kein neuer ADR.

### NICHT anfassen (Spec §0.2 NICHT-berührte Layer)

- `src/engine/*` — pure Energiebilanz, kein DOM, kein hass
- `src/config/*` — `batterySoc`-Map kommt bereits aus `system-state.ts:81-85`
- `src/ha/*` — HA-Event-Helfer, Type-Skelett
- `src/i18n/de.ts` — read-only (`DE.units.percent` existiert)
- `src/util/*` — kein neuer Helper-File; `formatSocPct` lebt im Render-Layer
- `src/editor.ts`, `src/editor-list-sections.ts` — Editor-GUI; keine neue Option
- `src/card.ts` — Lit-Lifecycle unverändert
- `src/render/layout.ts`, `home-ring.ts`, `icon.ts`, `flow-renderer.ts`, `flow-animation.ts`, `edge-color.ts`, `theme.ts`, `context.ts` — nicht relevant für diese Änderung
- `src/card-helpers.ts`, `src/card-styles.ts` — keine `::part(battery-ring)`-Selektoren vorhanden (Spec §3.1 Verifikation)

### Build-Pipeline-Files (wichtig — oft übersehen)

| Datei                         | Art der Änderung                                                                                        | Phase |
| ----------------------------- | ------------------------------------------------------------------------------------------------------- | ----- |
| `.eslintrc.cjs`               | **Keine** Änderung — `./i18n`-Import ist in Render-Zone bereits erlaubt                                 | —     |
| `vitest.config.ts`            | **Keine** Änderung — `coverage.include` umfasst `render/` nicht (bewusst); Render-Tests laufen trotzdem | —     |
| `tsconfig.json` / `…preview…` | **Keine** Änderung — `src/**/*` ist abgedeckt, `*.test.ts` per `exclude` korrekt rausgenommen           | —     |
| `package.json`                | **Keine** Änderung — keine neuen Deps                                                                   | —     |
| `scripts/build-preview.mjs`   | **Keine** Änderung                                                                                      | —     |
| `scripts/smoke-test.mjs`      | **Keine** Änderung — Smoke läuft unverändert nach Phase 4                                               | 4     |

---

## Phase 0 — Pre-Snapshot (Commit 0)

**Commit-Vorlage:**

```
chore(metrics): pre-snapshot for 2026-05-15-akku-prozent-im-ring

Implementation-Workflow Phase 0: KPI-Baseline + Playwright-Capture vor
Code-Tasks. Ermöglicht Pre/Post-Delta im Code-Review-Pass 3.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
```

### Task 0.1: KPI-Pre-Snapshot + Playwright-Capture

**Files:**

- Append: `metrics/kpi-history.json` (via `pnpm kpi:snapshot`)
- Write: `metrics/playwright/akku-prozent-im-ring-pre.json`

- [ ] **Step 1: Voraussetzungen herstellen**

  ```bash
  pnpm check        # lint + typecheck + test grün
  pnpm build        # dist/-Bundle aktuell für Playwright
  pnpm test:coverage # coverage-summary.json für KPI-Skript
  ```

  Erwartet: alle drei grün. Wenn rot → STOP, vorher fixen.

- [ ] **Step 2: KPI-Snapshot**

  ```bash
  pnpm kpi:snapshot --label pre-akku-prozent-im-ring --phase pre
  ```

  Output: Eintrag in `metrics/kpi-history.json` mit Baseline (files, loc, coverage_pct, bundle_size).

- [ ] **Step 3: Playwright-Capture-Stufe-1 (Trap-Pattern)**

  ```bash
  pnpm preview > /tmp/preview.log 2>&1 &
  PREVIEW_PID=$!
  trap "kill $PREVIEW_PID 2>/dev/null" EXIT INT TERM
  # MCP-Tools: browser_navigate http://localhost:PORT → browser_wait_for "ha-card" →
  # browser_console_messages → browser_snapshot → browser_evaluate
  # Hauptagent schreibt Artefakt EXPLIZIT nach metrics/playwright/akku-prozent-im-ring-pre.json
  # (NICHT auf MCP-Default-Pfad .playwright-mcp/ verlassen — gitignored)
  kill $PREVIEW_PID
  ```

  **Wichtig:** `PREVIEW_PID=$!` MUSS direkt nach dem `&` in derselben Shell stehen, NICHT in Command-Substitution `$(... & echo $!)` — letzteres läuft in einer Subshell und gibt eine Subshell-PID, die nicht der `pnpm preview`-Prozess ist.

  Bundle-Hash + Build-Timestamp im `_meta.card_bundle_built`-Feld des Artefakts mitloggen (Lesson 2026-05-15: Playwright lädt `dist/`-Bundle — wenn veraltet, capturet Pre-Snapshot ältere Render-Version).

- [ ] **Step 4: Commit**

  ```bash
  git add metrics/kpi-history.json metrics/playwright/akku-prozent-im-ring-pre.json
  git commit -m "<Commit-Vorlage aus Phase-Header>"
  ```

---

## Phase 1 — Test-Helper-Vorabfix (Commit 1)

**Commit-Vorlage:**

```
test(render): make battery-ring serialize-helper recursive

Spec 2026-05-15-akku-prozent-im-ring §6.1: serialize liest Lit-Template-
.values und macht String(v) — bei nested svg`...`-Sub-Templates kommt
"[object Object]" raus, was die folgenden <text>-Asserts in Phase 2
false-grün macht. Vorab rekursiv erweitern.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
```

### Task 1.1: `serialize`-Helper rekursiv

**Files:**

- Modify: `src/render/battery-ring.test.ts:5-13`

- [ ] **Step 1: Bestehenden Helper in `battery-ring.test.ts:5-13` ersetzen**

  ```typescript
  // alt (battery-ring.test.ts:5-13)
  function serialize(template: ReturnType<typeof renderBatteryRing>): string {
    const t = template as unknown as { strings: readonly string[]; values: readonly unknown[] };
    const parts: string[] = [];
    t.strings.forEach((s, i) => {
      parts.push(s);
      if (i < t.values.length) parts.push(String(t.values[i]));
    });
    return parts.join('');
  }

  // neu
  function serialize(template: ReturnType<typeof renderBatteryRing>): string {
    const t = template as unknown as { strings: readonly string[]; values: readonly unknown[] };
    const parts: string[] = [];
    t.strings.forEach((s, i) => {
      parts.push(s);
      if (i < t.values.length) {
        const v = t.values[i];
        if (v && typeof v === 'object' && 'strings' in v && 'values' in v) {
          parts.push(serialize(v as ReturnType<typeof renderBatteryRing>));
        } else {
          parts.push(String(v));
        }
      }
    });
    return parts.join('');
  }
  ```

- [ ] **Step 2: Sanity-Check — bestehende 6 Tests bleiben grün**

  ```bash
  pnpm test src/render/battery-ring.test.ts
  ```

  Erwartet: alle 6 bestehenden Tests (`renders background ring + filled segment for 50 %`, ..., `SOC-ring radius=50 sits outside battery circle`) bleiben grün. Wenn ein Test plötzlich rot wird: serialize-Helper-Bug, STOP und prüfen.

- [ ] **Step 3: `pnpm check` grün**

  ```bash
  pnpm check
  ```

- [ ] **Step 4: Commit**

  ```bash
  git add src/render/battery-ring.test.ts
  git commit -m "<Commit-Vorlage aus Phase-Header>"
  ```

---

## Phase 2 — `formatSocPct` + Battery-Ring-Erweiterung (Commit 2)

**Commit-Vorlage:**

```
feat(render): show SoC % inside widened battery ring

Spec 2026-05-15-akku-prozent-im-ring: STROKE_WIDTH 6 → 14, neuer
SVG-<text> "X %" tangential im Stroke (10:30-Uhr, rotate -45°, font 9,
weight 400, weiß). Neuer formatSocPct(socPct) Export aus battery-ring.ts
mit Number.isFinite-Guard (NaN/Infinity → "0 %"). Strukturwechsel:
<text> sitzt im äußeren <g part="battery-ring">-Wrapper, NICHT in der
mit rotate(-90) gedrehten inneren Ring-Gruppe. Neuer Theming-Hook
part="battery-ring-label".

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
```

### Task 2.1: Tests für `formatSocPct` (TDD-Rot)

**Files:**

- Modify: `src/render/battery-ring.test.ts`

- [ ] **Step 1: Import erweitern**

  ```typescript
  // alt
  import { renderBatteryRing } from './battery-ring';

  // neu
  import { formatSocPct, renderBatteryRing } from './battery-ring';
  ```

  (Import ist alphabetisch — `import/order` erfüllt.)

- [ ] **Step 2: `describe('formatSocPct', …)`-Block am Datei-Ende einfügen**

  ```typescript
  describe('formatSocPct', () => {
    it.each([
      [0, '0 %'],
      [0.4, '0 %'],
      [49.5, '50 %'],
      [73, '73 %'],
      [99.4, '99 %'],
      [99.6, '100 %'],
      [150, '100 %'],
      [-10, '0 %'],
      [Number.NaN, '0 %'],
      [Number.POSITIVE_INFINITY, '0 %'],
      [Number.NEGATIVE_INFINITY, '0 %'],
    ])('formatSocPct(%d) === "%s"', (input, expected) => {
      expect(formatSocPct(input)).toBe(expected);
    });

    it('nutzt DE.units.percent als Einheit', async () => {
      const { DE } = await import('../i18n/de');
      expect(formatSocPct(50)).toContain(DE.units.percent);
    });
  });
  ```

- [ ] **Step 3: Tests ausführen — MUSS rot sein**

  ```bash
  pnpm test src/render/battery-ring.test.ts
  ```

  Erwartet: alle 12 neuen `formatSocPct`-Asserts sind **rot** (Import-Error: `formatSocPct` existiert nicht). Wenn grün → Test-Bypass-Verdacht, STOP.

- [ ] **Step 4: KEIN Commit jetzt (Rot-State)**

### Task 2.2: `formatSocPct` implementieren (TDD-Grün)

**Files:**

- Modify: `src/render/battery-ring.ts`

- [ ] **Step 1: Import + Funktion oben in die Datei**

  ```typescript
  // alt (battery-ring.ts:1)
  import { svg, type SVGTemplateResult } from 'lit';

  // neu — Reihenfolge nach `import/order` (external `lit` vor internal/parent `../i18n/de`)
  // `.eslintrc.cjs:40-44`: groups: ['builtin', 'external', 'internal', 'parent', 'sibling', 'index', 'type'],
  // 'newlines-between': 'never', alphabetize: { order: 'asc' }
  import { svg, type SVGTemplateResult } from 'lit';
  import { DE } from '../i18n/de';
  ```

- [ ] **Step 2: `formatSocPct`-Export ergänzen (zwischen Konstanten und `renderBatteryRing`)**

  ```typescript
  /**
   * Formatiert einen SoC-Prozentwert als deutsche Typographie: gerundet, mit Leerzeichen.
   * NaN/Infinity → '0 %' (defensiv; im Normalpfad nicht erreichbar, weil
   * system-state.ts:85 nur finite Werte in batterySoc.set ablegt).
   */
  export function formatSocPct(socPct: number): string {
    if (!Number.isFinite(socPct)) return `0 ${DE.units.percent}`;
    const clamped = Math.min(100, Math.max(0, socPct));
    return `${Math.round(clamped)} ${DE.units.percent}`;
  }
  ```

- [ ] **Step 3: Tests ausführen — MUSS grün sein**

  ```bash
  pnpm test src/render/battery-ring.test.ts
  ```

  Erwartet: alle 12 `formatSocPct`-Tests + 1 i18n-Test grün. Bestehende 6 Render-Tests bleiben grün.

- [ ] **Step 4: KEIN Commit jetzt — Task 2.3 + 2.4 folgen in selbem Phase-Commit**

### Task 2.3: Tests für Stroke-14 + `<text>`-Element (TDD-Rot)

**Files:**

- Modify: `src/render/battery-ring.test.ts`

- [ ] **Step 1: Stroke-14-Erwartung + Drei-Branches in `it.each` (ersetzt bestehende einzelne Tests)**

  Bestehende Tests in `battery-ring.test.ts:16-48` decken jeweils einen Branch ab (50 %, ≥ 99.5, ≤ 0.5, > 100, < 0, r=50). Spec §6.1 verlangt: bestehende Tests bleiben semantisch, werden aber zu `it.each`-Tabelle umorganisiert + Stroke-Width-Assertion ergänzt. Neuer Block am Datei-Ende, alter Block bleibt für die r=50-Geometrie-Assertion:

  ```typescript
  describe('renderBatteryRing — Stroke und Branches', () => {
    it('rendert Ring-Stroke mit Breite 14', () => {
      const out = serialize(renderBatteryRing(50, '#10b981'));
      expect(out).toContain('stroke-width="14"');
      expect(out).not.toContain('stroke-width="6"');
    });

    it.each([
      // [socPct, expect-dasharray, expect-solid-no-dasharray]
      { soc: 0, branch: 'background-only', hasDasharray: false },
      { soc: 0.4, branch: 'background-only', hasDasharray: false },
      { soc: 50, branch: 'background+filled', hasDasharray: true },
      { soc: 73, branch: 'background+filled', hasDasharray: true },
      { soc: 99.4, branch: 'background+filled', hasDasharray: true },
      { soc: 99.6, branch: 'solid-only', hasDasharray: false },
      { soc: 100, branch: 'solid-only', hasDasharray: false },
      { soc: 150, branch: 'solid-only (clamp)', hasDasharray: false },
      { soc: -10, branch: 'background-only (clamp)', hasDasharray: false },
    ])('SoC=$soc → $branch', ({ soc, hasDasharray }) => {
      const out = serialize(renderBatteryRing(soc, '#10b981'));
      if (hasDasharray) {
        expect(out).toContain('stroke-dasharray');
      } else {
        expect(out).not.toContain('stroke-dasharray=');
      }
    });

    // Geometrie-Anker: 50 % → dasharray-Magnitude (CIRCUMFERENCE/2 ≈ 157.08 für r=50).
    // Bewahrt die Tiefe des bisherigen `it('renders background ring + filled segment for 50 %')`-Tests (battery-ring.test.ts:16-21).
    it('SoC=50 → dasharray-Magnitude ≈ 157.08 157.08 (CIRCUMFERENCE/2 für r=50)', () => {
      const out = serialize(renderBatteryRing(50, '#10b981'));
      expect(out).toMatch(/157\.\d+ 157\.\d+/);
    });
  });
  ```

  **Bestehende Tests `it('renders background ring + filled segment for 50 %')`, `it('renders solid stroke (no dasharray) when socPct ≥ 99.5')`, `it('renders only background ring when socPct ≤ 0.5')`, `it('clamps socPct above 100')`, `it('clamps socPct below 0')` in `battery-ring.test.ts:16-44`** durch die `it.each`-Tabelle oben ersetzen (Test-Duplikation vermeiden). Der `it('SOC-ring radius=50 sits outside battery circle (NODE_R_MEDIUM=42)')`-Test (Line 45-48) **bleibt unverändert** — das ist ein Geometrie-Anker, kein Branch-Test.

- [ ] **Step 2: `describe('renderBatteryRing — %-Text-Element', …)`-Block hinzufügen**

  ```typescript
  describe('renderBatteryRing — %-Text-Element', () => {
    it.each([
      { soc: 0, label: '0 %' },
      { soc: 0.4, label: '0 %' },
      { soc: 5, label: '5 %' },
      { soc: 50, label: '50 %' },
      { soc: 73, label: '73 %' },
      { soc: 99.6, label: '100 %' },
      { soc: 100, label: '100 %' },
      { soc: 150, label: '100 %' },
      { soc: -10, label: '0 %' },
    ])('rendert Text "$label" für SoC=$soc', ({ soc, label }) => {
      const out = serialize(renderBatteryRing(soc, '#10b981'));
      expect(out).toContain(`>${label}</text>`);
    });

    it('positioniert Text bei (-35, -35) mit rotate(-45 -35 -35)', () => {
      const out = serialize(renderBatteryRing(50, '#10b981'));
      expect(out).toMatch(/x="-35"\s+y="-35"/);
      expect(out).toContain('transform="rotate(-45 -35 -35)"');
    });

    it('Text-Element ist NICHT in der mit rotate(-90) gedrehten Gruppe', () => {
      const out = serialize(renderBatteryRing(50, '#10b981'));
      const innerOpenIdx = out.indexOf('<g transform="rotate(-90)">');
      expect(innerOpenIdx).toBeGreaterThan(-1);
      const innerCloseIdx = out.indexOf('</g>', innerOpenIdx);
      expect(innerCloseIdx).toBeGreaterThan(innerOpenIdx);
      const innerSlice = out.slice(innerOpenIdx, innerCloseIdx);
      expect(innerSlice).not.toContain('<text');
      expect(out.slice(innerCloseIdx)).toContain('<text');
    });

    it('Text hat font-size=9, font-weight=400, fill=#ffffff', () => {
      const out = serialize(renderBatteryRing(50, '#10b981'));
      expect(out).toContain('font-size="9"');
      expect(out).toContain('font-weight="400"');
      expect(out).toContain('fill="#ffffff"');
    });

    it('Text hat dominant-baseline=middle und text-anchor=middle', () => {
      const out = serialize(renderBatteryRing(50, '#10b981'));
      expect(out).toContain('text-anchor="middle"');
      expect(out).toContain('dominant-baseline="middle"');
    });

    it('Text exposiert part="battery-ring-label" als Theming-Hook', () => {
      const out = serialize(renderBatteryRing(50, '#10b981'));
      expect(out).toContain('part="battery-ring-label"');
    });

    it('äußerer Wrapper behält part="battery-ring" (API-Kompatibilität)', () => {
      const out = serialize(renderBatteryRing(50, '#10b981'));
      expect(out).toContain('part="battery-ring"');
    });
  });
  ```

- [ ] **Step 3: Tests ausführen — MUSS rot sein**

  ```bash
  pnpm test src/render/battery-ring.test.ts
  ```

  Erwartet: alle neuen Render-Tests rot (Stroke=14, `<text>`-Element, Position, Rotation, `part`-Hooks). `formatSocPct`-Tests bleiben grün.

- [ ] **Step 4: KEIN Commit jetzt (Rot-State)**

### Task 2.4: `renderBatteryRing` umbauen (TDD-Grün)

**Files:**

- Modify: `src/render/battery-ring.ts`

- [ ] **Step 1: Konstanten anpassen (`battery-ring.ts:4`)**

  ```typescript
  // alt
  const STROKE_WIDTH = 6;

  // neu
  const STROKE_WIDTH = 14;

  // Position auf Ring-Mittellinie (r=50) bei θ=135° (10:30-Uhr-Stellung, gemessen
  // gegen den Uhrzeigersinn von der 3-Uhr-Achse, Standard-Trig):
  //   x = RING_RADIUS · cos(135°) = -35.355
  //   y = RING_RADIUS · sin(135°) =  35.355   // SVG y-Achse zeigt nach unten —
  //                                           // optisch „oben" ist also y negativ
  // Wir verschieben das Vorzeichen ins Resultat: (LABEL_X, LABEL_Y) = (-35, -35)
  // erscheint visuell oben-links.
  const LABEL_X = -35;
  const LABEL_Y = -35;
  const LABEL_ROTATE_DEG = -45; // Text-Baseline parallel zur Ring-Tangente, im Uhrzeigersinn
  const LABEL_FONT_SIZE = 9;
  const LABEL_FONT_WEIGHT = 400;
  const LABEL_FILL = '#ffffff'; // weiß auf gesättigtem Stroke; Light-Mode-Verifikation siehe Spec §6.2
  ```

- [ ] **Step 2: `renderBatteryRing` umbauen — Strukturwechsel + `<text>`-Block**

  ```typescript
  // alt (battery-ring.ts:7-58)
  export function renderBatteryRing(socPct: number, color: string): SVGTemplateResult {
    const clamped = Math.min(100, Math.max(0, socPct));

    if (clamped <= 0.5) {
      return svg`
        <g transform="rotate(-90)" part="battery-ring">
          <circle cx="0" cy="0" r="${RING_RADIUS}" fill="none" stroke="${color}"
                  stroke-width="${STROKE_WIDTH}" opacity="0.18"></circle>
        </g>
      `;
    }
    // ... (zwei weitere Branches)
  }

  // neu — Strukturwechsel: äußerer Wrapper trägt part="battery-ring", innere
  // rotate(-90)-Gruppe ohne part, <text> als Geschwister-Element am Ende.
  export function renderBatteryRing(socPct: number, color: string): SVGTemplateResult {
    const clamped = Math.min(100, Math.max(0, socPct));
    const label = svg`
      <text x="${LABEL_X}" y="${LABEL_Y}"
            text-anchor="middle" dominant-baseline="middle"
            font-size="${LABEL_FONT_SIZE}" font-weight="${LABEL_FONT_WEIGHT}" fill="${LABEL_FILL}"
            transform="rotate(${LABEL_ROTATE_DEG} ${LABEL_X} ${LABEL_Y})"
            part="battery-ring-label">${formatSocPct(clamped)}</text>
    `;

    if (clamped <= 0.5) {
      return svg`
        <g part="battery-ring">
          <g transform="rotate(-90)">
            <circle cx="0" cy="0" r="${RING_RADIUS}" fill="none" stroke="${color}"
                    stroke-width="${STROKE_WIDTH}" opacity="0.18"></circle>
          </g>
          ${label}
        </g>
      `;
    }

    if (clamped >= 99.5) {
      return svg`
        <g part="battery-ring">
          <g transform="rotate(-90)">
            <circle cx="0" cy="0" r="${RING_RADIUS}" fill="none" stroke="${color}"
                    stroke-width="${STROKE_WIDTH}"></circle>
          </g>
          ${label}
        </g>
      `;
    }

    const filled = (CIRCUMFERENCE * clamped) / 100;
    const rest = CIRCUMFERENCE - filled;
    return svg`
      <g part="battery-ring">
        <g transform="rotate(-90)">
          <circle cx="0" cy="0" r="${RING_RADIUS}" fill="none" stroke="${color}"
                  stroke-width="${STROKE_WIDTH}" opacity="0.18"></circle>
          <circle cx="0" cy="0" r="${RING_RADIUS}" fill="none" stroke="${color}"
                  stroke-width="${STROKE_WIDTH}"
                  stroke-dasharray="${filled} ${rest}" stroke-linecap="round"></circle>
        </g>
        ${label}
      </g>
    `;
  }
  ```

- [ ] **Step 3: Tests grün**

  ```bash
  pnpm test src/render/battery-ring.test.ts
  ```

  Erwartet: alle bestehenden + neuen Tests grün. Auch der `'SOC-ring radius=50 sits outside battery circle (NODE_R_MEDIUM=42)'`-Test (Line 45–48) bleibt grün — `r="50"` ist unverändert.

- [ ] **Step 4: `pnpm check` grün**

  ```bash
  pnpm check
  ```

  Lint prüft `import/order` (`lit` vor `../i18n/de` alphabetisch innerhalb Internal-Group — beide Gruppen separat, externe vor internen, daher `lit` zuerst, dann `../i18n/de` ohne Newline dazwischen laut `.eslintrc.cjs:42` `'newlines-between': 'never'`).

- [ ] **Step 5: LOC-Regression-Check**

  ```bash
  wc -l src/render/battery-ring.ts
  ```

  Erwartet: < 100 (heute 58, neu erwartet ~80–90, Spec §11).

- [ ] **Step 6: Commit (Phase-2-Abschluss)**

  ```bash
  git add src/render/battery-ring.ts src/render/battery-ring.test.ts
  git commit -m "<Commit-Vorlage aus Phase-Header>"
  ```

---

## Phase 3 — Aria-Label-Angleichung (Commit 3)

**Commit-Vorlage:**

```
fix(render): align battery aria-label percent format

Spec 2026-05-15-akku-prozent-im-ring §3.2: aria-Label nutzt jetzt
formatSocPct(socPct) statt Inline-Math.round — Format "X %" mit
Leerzeichen, konsistent zum neuen SVG-Text und zum Watt-Format
"X.Y kW". Single-Source via formatSocPct (ADR-0010).

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
```

### Task 3.1: aria-Label-Format in `node-renderer.ts`

**Files:**

- Modify: `src/render/node-renderer.ts:4` (Import-Erweiterung)
- Modify: `src/render/node-renderer.ts:47` (aria-Label-Format)

- [ ] **Step 1: Import erweitern**

  ```typescript
  // alt (node-renderer.ts:4)
  import { renderBatteryRing } from './battery-ring';

  // neu (alphabetisch innerhalb Members)
  import { formatSocPct, renderBatteryRing } from './battery-ring';
  ```

- [ ] **Step 2: aria-Label-Format in Zeile 47 anpassen**

  ```typescript
  // alt (node-renderer.ts:44-48)
  const ariaLabel = unavailable
    ? `${name}: ${DE.states.sensorUnavailable}`
    : showRing
      ? `${name}: ${value}, ${Math.round(socPct as number)}%`
      : `${name}: ${value}`;

  // neu
  const ariaLabel = unavailable
    ? `${name}: ${DE.states.sensorUnavailable}`
    : showRing
      ? `${name}: ${value}, ${formatSocPct(socPct as number)}`
      : `${name}: ${value}`;
  ```

- [ ] **Step 3: `pnpm check` grün**

  ```bash
  pnpm check
  ```

  Heutiger `node-renderer` hat keinen eigenen Test (`grep -L "node-renderer.test" src/render/` zeigt nichts — bestätigt). Wenn ein Render-Folge-Test breaks: zuerst per `pnpm test 2>&1 | grep -i fail` identifizieren, dann Test-Erwartung anpassen (z.B. wenn `flow-renderer.test.ts` aria-Label-Strings prüft).

- [ ] **Step 4: STOP-Condition**

  Wenn ein Test rot wird, der aria-Label-Strings asserted, dort die Erwartung auf das neue Format anpassen (`"X%"` → `"X %"`). Keine Änderung am Helper.

- [ ] **Step 5: Commit**

  ```bash
  git add src/render/node-renderer.ts
  git commit -m "<Commit-Vorlage aus Phase-Header>"
  ```

---

## Phase 4 — Sandbox-Verifikation + Smoke + Bundle (Commit 4)

**Commit-Vorlage:**

```
chore(build): preview + smoke + bundle-budget for akku-prozent-im-ring

Implementation-Workflow §6.2: 6-stufige Preview-Verifikation
durchlaufen, dist-Bundle gebaut, Smoke-Test grün.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
```

(Scope `build` aus conventions §8 — `verify` ist nicht in der erlaubten Scope-Liste.)

### Task 4.1: Preview + Smoke + Bundle-Check

**Files:**

- Keine Code-Files. Nur Build + Verifikation.

- [ ] **Step 1: `pnpm build`**

  ```bash
  pnpm build
  ```

  Erwartet: `dist/custom-energy-flow-card.js` aktualisiert, Größe ≤ `BUNDLE_BUDGET_BYTES` aus `scripts/kpi.mjs:29` (61440 B = 60 KiB; **NICHT** dezimal 60.000). Per `wc -c dist/custom-energy-flow-card.js` prüfen oder `pnpm kpi:report`.

- [ ] **Step 2: Preview-Verifikation §6.2 alle 6 Schritte**

  ```bash
  pnpm preview
  ```

  Manuell im Browser prüfen (Spec §6.2):
  1. Sandbox geöffnet, Card geladen — `examples/preview.html` rendert die `<custom-energy-flow-card>` mit Scenario-Buttons aus `examples/preview-mocks.ts`.
  2. Akku-Node: Stroke sichtbar dicker (14 vs. 6)? %-Wert oben-links lesbar? Rotation tangential?
  3. **SoC-Edge-Cases durchklicken:** `examples/preview-mocks.ts` enthält bereits Scenarios mit SoC-Werten 5/8/12/15/20/38/40/42/50/60/68/70/73/75 (grep `sensor.b_dach_soc`). Pro Scenario-Button SoC im Card-Render prüfen. Für 100 % nicht vorhanden — entweder temporär einen `'sensor.b_dach_soc': { state: '100' }` in `preview-mocks.ts` einfügen (NICHT committen, vor Phase 4 Step 5 zurücksetzen!) oder via Browser-DevTools-Konsole `card.hass = { ...card.hass, states: { ...card.hass.states, 'sensor.b_dach_soc': { state: '100', ...card.hass.states['sensor.b_dach_soc'] } } }`. „100 %" passt visuell in den Ring?
  4. Light-Mode-Check (optional, falls Theme-Toggle verfügbar): weißer Text auf grünem Stroke noch lesbar?
  5. DevTools-Inspector: `aria-label` des Battery-Node-`<g>` zeigt `"Speicher: −X.X kW, NN %"` (Leerzeichen)?
  6. Screenshot oder Notiz für Code-Review-Pass 5 (UX + Funktional via Playwright).

- [ ] **Step 3: STOP-Conditions**
  - Wenn Name-Label sichtbar mit Ring kollidiert: `labelYOffset(battery)` in `node-renderer.ts:154` von `node.r + 22` auf `node.r + 26` anheben + Spec §0.0 Verbot 12 entsprechend in Lessons-Learned dokumentieren.
  - Wenn „100 %" optisch nicht passt (5 Zeichen): font-size auf 8 reduzieren oder Position um ein paar Pixel zur 11-Uhr-Stelle ziehen — Diskussion mit User vor Anpassung.
  - Wenn Light-Mode-Kontrast schlecht: NICHT inline fixen, sondern in Risiken §10 als „medium" markieren und Follow-up-Spec für theme-aware Fill planen (Out-of-Scope dieser Spec).

- [ ] **Step 4: Smoke-Test**

  ```bash
  pnpm smoke
  ```

  Erwartet: grün (ADR-0012 Pre-Release-Gate — Card lädt + rendert ohne Class-Load-Crash).

- [ ] **Step 5: Unverändert-Check (Spec §0.0 Verbote)**

  ```bash
  git diff --stat HEAD~3..HEAD
  ```

  Erwartet: nur `battery-ring.ts`, `battery-ring.test.ts`, `node-renderer.ts`, `metrics/*` geändert. Keine Änderung an `engine/`, `config/`, `editor*`, `card.ts`, `layout.ts`, `home-ring.ts`, `icon.ts`, `flow-renderer.ts`, `i18n/de.ts`, `.eslintrc.cjs`, `vitest.config.ts`, `tsconfig.json`, `package.json`.

- [ ] **Step 6: Phase-4-Verifikations-Commit (Rollback-Anker)**

  Spec §11 Erfolgs-Kriterium: „Preview-Verifikation §6.2 dokumentiert (Screenshot oder Notiz im Commit-Body)". Diese Phase bekommt einen eigenen Commit als Rollback-Anker zwischen Phase 3 und Phase 5 — auch wenn nur Metadaten/Notizen geändert werden.

  Empty-Commit mit Notiz im Body (sofern keine Screenshots regeneriert wurden):

  ```bash
  git commit --allow-empty -m "$(cat <<'EOF'
  chore(build): preview + smoke + bundle-budget for akku-prozent-im-ring

  Implementation-Workflow §6.2 — 6-stufige Preview-Verifikation:
  - Stroke sichtbar dicker (14 vs 6) ✓
  - Rotation tangential (rotate(-45)) ✓
  - SoC-Cases 5/50/73/100 via examples/preview-mocks.ts Scenarios ✓
  - Light-Mode-Kontrast: ok / problematisch (→ Follow-up-Spec)
  - aria-Label "Speicher: ... , NN %" mit Leerzeichen ✓
  - pnpm smoke grün ✓
  - Bundle ≤ 60 KiB (pnpm kpi:report)

  Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
  EOF
  )"
  ```

  Falls Screenshots regeneriert wurden: `git add docs/screenshots/` vor dem `git commit` (dann nicht `--allow-empty`).

  **Rollback-Pfad bei Fehler:** Wenn Phase 4 nach diesem Commit problematisch wird, `git reset --hard HEAD~1` setzt zurück auf den Phase-3-Stand (aria-Label gefixt, neuer Render schon drin, nur die Verifikations-Notiz weg).

---

## Phase 5 — Doku + Post-Snapshot + Code-Review-Trigger (Commit 5–6)

**Commit-Vorlage 5 (Doku):**

```
docs(specs): cross-reference akku-prozent-im-ring in icon-positionierung subspec

Spec 2026-05-15-akku-prozent-im-ring §7: die Stroke-6-Dokumentation in
2026-05-15-icon-positionierung-und-kreis-skalierung.md wird durch
diese Subspec teilweise abgelöst (Stroke 6 → 14).

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
```

**Commit-Vorlage 6 (Post-Snapshot):**

```
chore(metrics): post-snapshot for 2026-05-15-akku-prozent-im-ring

Implementation-Workflow Phase 5: KPI-Delta + Playwright-Post-Capture
für Code-Review-Pass 3 (Wartbarkeits-KPIs).

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
```

### Task 5.1: Cross-Reference in icon-positionierung-Subspec

**Files:**

- Modify: `docs/specs/2026-05-15-icon-positionierung-und-kreis-skalierung.md`

- [ ] **Step 1: Cross-Reference-Block einfügen**

  Suche in `docs/specs/2026-05-15-icon-positionierung-und-kreis-skalierung.md` den Abschnitt, der `STROKE_WIDTH = 6` für den Battery-Ring dokumentiert (vermutlich §3.X Battery-Ring-Geometrie oder im File-Diff). Direkt darüber oder darunter:

  ```markdown
  > **Update 2026-05-15:** Die hier dokumentierte Stroke-Breite 6 px wird durch [`2026-05-15-akku-prozent-im-ring.md`](./2026-05-15-akku-prozent-im-ring.md) auf 14 px erhöht, um den SoC-%-Wert im Stroke unterbringen zu können. Die übrige Geometrie (Ring r=50, Akku-Kreis r=42, Drei-Fall-Logik) bleibt erhalten.
  ```

  Falls die genaue Stelle nicht auffindbar: am Ende der Datei als „Update 2026-05-15"-Footnote ergänzen.

- [ ] **Step 2: `pnpm check` (Format-Check über lint-staged via husky pre-commit-Hook)**

  ```bash
  pnpm check
  ```

- [ ] **Step 3: Commit**

  ```bash
  git add docs/specs/2026-05-15-icon-positionierung-und-kreis-skalierung.md
  git commit -m "<Commit-Vorlage 5 aus Phase-Header>"
  ```

### Task 5.2: Post-Snapshot + Code-Review-Trigger

**Files:**

- Append: `metrics/kpi-history.json`
- Write: `metrics/playwright/akku-prozent-im-ring-post.json`

- [ ] **Step 1: Voraussetzungen herstellen**

  ```bash
  pnpm check && pnpm build && pnpm test:coverage
  ```

- [ ] **Step 2: KPI-Snapshot**

  ```bash
  pnpm kpi:snapshot --label post-akku-prozent-im-ring --phase post
  ```

- [ ] **Step 3: Playwright-Capture-Stufe-1 (analog Phase 0)**

  Trap-Pattern wie in Phase 0 Task 0.1 Step 3 (zwei Zeilen `pnpm preview … &` + `PREVIEW_PID=$!`, NICHT Command-Substitution). Output nach `metrics/playwright/akku-prozent-im-ring-post.json`. Bundle-Hash + Build-Timestamp in `_meta.card_bundle_built`.

- [ ] **Step 4: Commit**

  ```bash
  git add metrics/kpi-history.json metrics/playwright/akku-prozent-im-ring-post.json
  git commit -m "<Commit-Vorlage 6 aus Phase-Header>"
  ```

- [ ] **Step 5: Code-Review-Workflow starten**

  Per `CLAUDE.md` „Code-Review — Workflow" Phase 4: Plan-Komplexität **mittel** (10 Tasks, 5–15-Bereich) → Pässe **1 + 2 + 3 + 6** sequentiell:
  1. Pass 1 (Spec/Plan ↔ Code-Coverage)
  2. Pass 2 (Architektur + ADRs + Conventions)
  3. Pass 3 (Wartbarkeits-KPIs via `pnpm kpi:report`)
  4. Pass 6 (Release-Readiness + Restrisiko)

  Pro Pass: Sub-Agent dispatchen, Findings als Tasks, Trust-but-Verify, `AUTO-FIX` umsetzen, `USER-DECISION` sammeln. STOP-Kriterien analog Spec-Workflow.

- [ ] **Step 6: Nach Code-Review-Abschluss: `finishing-a-development-branch`-Skill**

  Strukturierte Release-Optionen (Merge / Tag / PR / HACS-Bump). User-Consent vor jedem Schritt. README-Changelog-Entry beim HACS-Bump committen.

  **Changelog-Entry-Vorschlag** (mit explizitem Hinweis auf Public-`part`-API-Strukturwechsel, falls externe Card-Mod-User betroffen sein könnten):

  ```markdown
  ## v0.13.0

  - Akku-Knoten zeigt den Füllstand zusätzlich als Prozentwert (z.B. „73 %") im verbreiterten Ring (Spec [`2026-05-15-akku-prozent-im-ring`](docs/specs/2026-05-15-akku-prozent-im-ring.md)).
  - **Internal structural change:** `::part(battery-ring)` zielt jetzt auf den äußeren `<g>`-Wrapper (vorher: innere rotate-Gruppe). Custom-CSS-Selektoren, die direkt auf `circle`-Children des Parts zielen, können angepasst werden müssen. Neuer Theming-Hook: `::part(battery-ring-label)` für das %-Text-Element.
  ```

  Begründung: `grep ::part(battery-ring)` ergab 0 Treffer im eigenen Repo (Spec §3.1 API-Kompatibilitäts-Check), externe Card-Mod-User mit eigenen Snippets sind dadurch aber nicht erfasst — transparente Erwähnung im Changelog ist gewissenhaft.

---

## Self-Review-Checkliste (vor Plan-Abschluss — Hauptagent durchgeht)

- [ ] **Spec-Coverage:** Spec §0.0 (Verbote 1–13) → Plan File-Structure NICHT-anfassen-Tabelle. §0.4 Don't-Touch → Plan Standing-Requirement-Block. §3.1 → Phase 2 Tasks 2.3/2.4. §3.2 → Phase 3 Task 3.1. §6.1 → Phase 1 Task 1.1 (Helper) + Phase 2 Tasks 2.1/2.3 (inkl. `it.each`-Refactor der bestehenden Branch-Tests). §6.2 → Phase 4 Task 4.1. §7 → Phase 5 Task 5.1. §12 Spec-Plan-Schritte 1–13 → in 6 Plan-Phasen verteilt (10 Tasks gesamt — feinere Granularität).

- [ ] **Spec §11 Erfolgs-Kriterien-Mapping (1:1):**

  | Spec §11 Akzeptanz                                                              | Plan-Stelle                                                |
  | ------------------------------------------------------------------------------- | ---------------------------------------------------------- |
  | „Akku-Node zeigt im Ring den SoC als gerundete %-Zahl"                          | Phase 2 Task 2.4 (Render) + Phase 4 Task 4.1 Step 2        |
  | „Ring-Stroke optisch verbreitert (Stroke 14 vs 6)"                              | Phase 2 Task 2.4 Step 1 + Test 2.3 Step 1                  |
  | „Text sitzt oben-links, tangential rotiert, font 9, weight 400, weiß"           | Phase 2 Task 2.3 (Test) + 2.4 Step 2 (Code)                |
  | „aria-Label `X %` mit Leerzeichen"                                              | Phase 3 Task 3.1                                           |
  | „`pnpm test` grün" / „`pnpm check` grün"                                        | Standing-Requirement + jedes Phase-Ende                    |
  | „`pnpm smoke` grün"                                                             | Phase 4 Task 4.1 Step 4                                    |
  | „`pnpm build` Bundle ≤ 60 KiB"                                                  | Phase 4 Task 4.1 Step 1                                    |
  | „`wc -l src/render/battery-ring.ts` < 100"                                      | Phase 2 Task 2.4 Step 5                                    |
  | „`git diff` zeigt KEINE Änderungen an Files außerhalb von §0.2-Tabelle"         | Phase 4 Task 4.1 Step 5                                    |
  | „Preview-Verifikation §6.2 dokumentiert (Screenshot oder Notiz im Commit-Body)" | Phase 4 Task 4.1 Step 6 (Notiz im Phase-5-Doku-Commit)     |
  | „Cross-Reference-Block in icon-positionierung-Subspec ergänzt"                  | Phase 5 Task 5.1                                           |
  | „README-Changelog-Entry — erst beim HACS-Bump"                                  | Phase 5 Task 5.2 Step 6 (`finishing-a-development-branch`) |
  | „Pre/Post-KPI-Snapshot"                                                         | Phase 0 Task 0.1 + Phase 5 Task 5.2                        |

- [ ] **Spec-Plan-Alignment:** Plan widerspricht der Spec nirgends. Falls beim Implementieren ein Plan-Detail richtiger ist als Spec → Spec mit anpassen (nicht Plan zurückziehen), Lessons-Learned-Eintrag in `docs/lessons-learned.md` (Spec/Plan-Dokumente werden NICHT retroaktiv gepatcht — siehe CLAUDE.md Code-Review-Workflow Anti-Pattern).
- [ ] **Keine Placeholders** (`TBD`/`TODO`/`Similar-to`) — geprüft.
- [ ] **Type-Consistency:** alle TS-Referenzen konsistent (Funktions-Namen, Modul-Pfade identisch genannt).
- [ ] **Commit-Granularität:** 1 Phase = 1 Commit (Phase 5 hat 2 Commits, weil Doku ≠ Snapshot — bewusst getrennt).
- [ ] **Verifikations-Pipeline** pro Phase: `pnpm check` (typecheck + lint + test) am Phase-Ende, `pnpm build` + `pnpm smoke` in Phase 4.
- [ ] **Don't-Touch-Liste** (Spec §0.4) respektiert: kein Task ändert eines der Elemente.
- [ ] **Code-Reuse-Tabelle** (Spec §3.3) genutzt: `formatSocPct` wird zentral verwendet, `DE.units.percent` als i18n-Quelle, `formatPowerW` als Stil-Vorbild (kein direkter Reuse).
- [ ] **Anti-Patterns** (Spec §0.0 Verbote + §3.3) aktiv vermieden: `flow-renderer.ts:57` explizit in Don't-Touch-Liste, `<text>`-Struktur außerhalb `rotate(-90)`-Gruppe geprüft, Inline-Format-Duplikate vermieden.
- [ ] **Standing-Reminder pro Phase:** Conventions/ADRs im Standing-Requirement-Block am Plan-Anfang — gilt durchgehend.
- [ ] **TDD-Order:** Task 2.1 (Test rot) → Task 2.2 (Code grün) → Task 2.3 (Test rot) → Task 2.4 (Code grün). Phase 1 ist Vorab-Refactor ohne TDD-Pflicht (Test-Helper, bestehende Tests bleiben grün).
- [ ] **STOP-Conditions:** Phase 2 Task 2.1 Step 3 (rot erwartet, Bypass-Verdacht). Phase 4 Task 4.1 Step 3 (Name-Kollision, „100 %"-Overflow, Light-Mode-Kontrast). Phase 3 Task 3.1 Step 4 (aria-Label-Test-Drift).
- [ ] **Framework-Quirks:** Lit-Sub-Template-Serialisierung (Phase 1 Vorabfix), SVG-Namespace (alles via `svg`-Tag-Function, kein HTML-Mix), Lit-Lifecycle unverändert.
- [ ] **Build-Pipeline:** Keine Änderungen an `.eslintrc.cjs`, `vitest.config.ts`, `tsconfig.json`, `package.json`, `scripts/*` — explizit in File-Structure-Tabelle dokumentiert.
- [ ] **Doku-Pflicht (conventions §12):** Kein neuer ADR. Cross-Reference in icon-positionierung-Subspec (Phase 5 Task 5.1). README-Changelog kommt mit HACS-Bump (Phase 5 Task 5.2 Step 6).

---

## Out of Scope (nicht Teil dieses Plans)

Aus Spec §9.2:

- **Konfigurierbarkeit der %-Anzeige (an/aus, Position, Schriftgröße)** — YAGNI, v1.x-Kandidat.
- **Theme-aware Text-Farbe (Light-Mode-Anpassung)** — v1.x, falls Preview-Verifikation Probleme zeigt.
- **SoC-Anzeige beim Home-Node** — Out-of-Scope.
- **Tooltip beim Hover über Akku** mit Detail-Info — v1.x.
- **Dynamische Text-Position bei niedrigem SoC** (Variante L3) — explizit verworfen.
- **Hintergrund-Ring-Opacity-Anhebung** (Variante L2) — explizit verworfen.
- **Animierte Übergänge** beim SoC-Wechsel — v1.x.
- **Neuer ADR** — nicht nötig (reines Visual-Polish).
- **README-Changelog-Entry** — wird mit HACS-Bump in `finishing-a-development-branch` committed, nicht in diesem Plan.

---

## Notizen für den Implementierer

- **TDD-Order in Phase 2:** Erst Tests anpassen → rot. Wenn ein Test grün bleibt, der eigentlich rot sein sollte → Test-Bypass-Verdacht → STOP und mit User klären.
- **Spec-Plan-Drift:** Wenn beim Implementieren Spec-Detail X falsch wirkt, Lessons-Learned-Eintrag in `docs/lessons-learned.md` (Spec/Plan-Dokumente NICHT retroaktiv patchen).
- **Layer-Boundary-Erweiterung:** Plan braucht keine `.eslintrc.cjs`-Erweiterung. `./i18n`-Import ist in der Render-Zone bereits erlaubt (`.eslintrc.cjs:20-22`).
- **Framework-Quirks:**
  - Lit-Sub-Template-Serialisierung: `const label = svg\`...\``: serialize-Helper rekursiv (Phase 1).
  - SVG-Namespace: alle `<text>`/`<g>` via `svg`-Tag-Function (kein HTML-Mix).
  - Lit-Lifecycle: unverändert.
- **Sandbox/Preview:** Pflicht in Phase 4 (Spec §6.2). Screenshots optional, aber Notiz für Code-Review-Pass 5 nötig.
- **Smoke-Test:** `pnpm smoke` automatisch nach `pnpm build`. Manuell wenn HA-Test-Instance verfügbar (optional).
- **Bundle-Budget:** `61440 B = 60 KiB` aus `scripts/kpi.mjs:29` — NICHT dezimal 60.000. Geschätzter Mehraufwand 15–25 LOC + 1 i18n-Import = < 0.5 kB minified.
- **Code-Review-Pässe:** Plan-Komplexität **mittel** (10 Tasks, 5–15-Bereich) → Pässe 1 + 2 + 3 + 6 (Spec/Plan-Coverage, Architektur+ADR+Conventions, Wartbarkeits-KPIs, Release-Readiness). Sequentiell, nicht parallel.
