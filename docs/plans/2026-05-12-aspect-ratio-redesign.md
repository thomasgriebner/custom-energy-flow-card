# Aspect-Ratio Redesign Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use `superpowers:subagent-driven-development` (recommended) or `superpowers:executing-plans` to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** ViewBox-Aspect 820×540 (1.52:1) → 960×540 (16:9) und Streichung `getGridOptions`/`getCardSize` aus `card.ts`. Card nutzt HA-Dashboard-Breite effektiv, HA-Layout-Slider hat keine künstliche Obergrenze mehr.

**Architecture:** Subtraktive + numerische Änderung an drei Layern (`util/const.ts`, `render/layout.ts`, `card/card.ts`). Engine, Config, HA-Helpers, i18n und Editor werden NICHT angefasst (ESLint `no-restricted-paths` bricht CI bei Verstoß). Layout-Geometrie bleibt strukturell wie ADR-0017 (Quellen-Cluster + Consumer-Arc) — nur Maßzahlen skalieren auf neuen viewBox.

**Tech Stack:** TypeScript 5.4 strict, Lit 3, Vitest, ESLint, Rollup. Test-Framework Vitest mit happy-dom. pnpm als Package-Manager.

**Verbindliche Lese-Quellen (vor Start):**

- `docs/specs/2026-05-12-aspect-ratio-redesign.md` — die Spec für diese Implementation (Single-Source aller Constraints, Werte, Begründungen)
- `CLAUDE.md` — Projekt-Schnellreferenz, Regeln 1-10, Workflow
- `docs/conventions.md` — Code-Stil, Commit-Konventionen
- `docs/architecture.md` — Layer-Architektur, Datenfluss
- ADR-0017 (aktueller Arc-Layout-Stand), ADR-0009 (Layer-Boundaries), ADR-0010 (Single-Source)

**Konzepte (verbindlich, siehe Spec für Details):**

- **Datenfluss-Pipeline** (Spec §0.4): `engine/` kennt keine Geometrie, `render/layout.ts` kennt keine Power-Werte, `flow-renderer.ts` führt beides zusammen
- **Lit-Lifecycle** (Spec §0.5): Side-Effects in `willUpdate`, niemals in `render`
- **Engine-Warnings statt Throws** (Spec §0.7): bei Daten-Inkonsistenz `EngineWarning` produzieren, niemals `throw`
- **Code-Reuse-Tabelle** (Spec §2.5): 17 vorhandene Helper — VERBINDLICH wiederverwenden statt neu zu bauen

**Elements NICHT anfassen** (semantisch korrekt, robust gegen Geometrie-Change — Spec §0.6):

| Element                                              | Wo                                                     | Warum                                                    |
| ---------------------------------------------------- | ------------------------------------------------------ | -------------------------------------------------------- |
| `TAB_ORDER`                                          | `src/render/flow-renderer.ts:13`                       | Semantisch (Knoten-Typ), nicht räumlich                  |
| `aria-label` auf Nodes/Edges                         | `node-renderer.ts:75`, `flow-renderer.ts:37`           | Accessibility-Semantik                                   |
| `prefers-reduced-motion`-CSS                         | `src/render/flow-animation.ts:84-90`                   | Respektiert OS-Setting                                   |
| `MIN_CONTAINER_WIDTH_PX = 280`                       | `src/const.ts:21`                                      | Container-bezogen, nicht viewBox                         |
| `_containerW = 720` Initial-Wert                     | `src/card.ts:38`                                       | Vor-ResizeObserver-Default, ≤1 Frame                     |
| `data-power`-Attribut auf Edges                      | `flow-renderer.ts:128,144`                             | Inspektions-Hook (DevTools/Smoke)                        |
| Lit-Lifecycle (`shouldUpdate`/`willUpdate`/`render`) | `src/card.ts:114-193`                                  | Bestehend korrekt, NICHT umschreiben                     |
| `memoLayout` (historisch entfernt)                   | wurde aus `card.ts` entfernt (Subspec 2026-05-11 §6.3) | Bewusste Architektur-Entscheidung, NICHT reintroducieren |

---

## File Structure

### Modified

| Datei                                                   | Verantwortlichkeit                                                                          | Phase |
| ------------------------------------------------------- | ------------------------------------------------------------------------------------------- | ----- |
| `src/const.ts`                                          | `VIEWBOX.width`, `CARD_VERSION`                                                             | 1     |
| `src/render/layout.ts`                                  | Geometrie-Konstanten, `sourceClusterXs`, `computeEdges` (Magic 270→MIDDLE_Y), Code-Comments | 1     |
| `src/render/layout.test.ts`                             | Test-Erwartungen für neue Konstanten                                                        | 1     |
| `src/card.ts`                                           | Streichung `getGridOptions` + `getCardSize`                                                 | 2     |
| `hacs.json`                                             | Prüfen, ggf. Version synchron                                                               | 1     |
| `docs/adr/0017-adaptive-svg-layout.md`                  | Werte aktualisieren + Drift fixen (25°→42°, 7°→14°, 820→960 etc.)                           | 3     |
| `docs/adr/0018-ha-dashboard-layout-api.md`              | Status `superseded by ADR-0019`                                                             | 3     |
| `docs/adr/README.md`                                    | ADR-Index erweitern                                                                         | 3     |
| `docs/specs/2026-05-11-consumer-grouping-and-layout.md` | §6.1/§6.2 als superseded markieren                                                          | 3     |
| `docs/architecture.md`                                  | Stale Signatur Line 80 fixen, §4 ADR-Tabelle erweitern                                      | 3     |
| `README.md`                                             | Changelog-Eintrag 0.11.0                                                                    | 3     |
| `docs/screenshots/individual-consumers.png`             | Neu erzeugen via `pnpm preview`                                                             | 4     |
| `docs/screenshots/by-area-grouping.png`                 | Neu erzeugen via `pnpm preview`                                                             | 4     |

### Created

| Datei                                          | Verantwortlichkeit             | Phase |
| ---------------------------------------------- | ------------------------------ | ----- |
| `docs/adr/0019-aspect-16-9-no-grid-options.md` | Neuer ADR (Stub aus Spec §4.3) | 3     |

### NICHT anfassen

- `src/engine/*` — pure Energie-Bilanz
- `src/config/*` — Schema-Validation
- `src/ha/*` — HA-Helpers
- `src/i18n/*` — Strings unverändert
- `src/editor.ts`, `src/editor-list-sections.ts` — separater LitElement
- `src/render/flow-renderer.ts` — automatisch korrekt durch `layout.width`-Variable
- `src/render/node-renderer.ts`, `home-ring.ts`, `battery-ring.ts`, `flow-animation.ts`, `edge-color.ts`, `theme.ts`, `context.ts` — keine viewBox-Abhängigkeit
- `src/card-helpers.ts`, `src/card-styles.ts` — Skeleton ist CSS-Grid, ohne viewBox-Bezug
- `src/util/*` (außer `const.ts`) — keine Änderung

---

## Phase 1 — Layout-Konstanten + Tests (Commit 1)

**Commit-Vorlage:**

```
refactor(layout): viewBox 820×540 → 960×540 + adjust constants and tests

Subspec 2026-05-12: Aspect-Ratio von 1.52:1 auf 16:9 (1.78:1) — Card nutzt
HA-Dashboard-Breite besser. Arc-Radius 275 → 350 (komfortablerer Knoten-Gap),
Source-Cluster [130,440] → [200,560], HOME_X 380 → 480. Magic-Number 270 in
computeEdges durch MIDDLE_Y ersetzt (ADR-0010). CARD_VERSION 0.10.0 → 0.11.0
(Breaking Visual Change).

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
```

### Task 1.1: Test-Erwartungen aktualisieren (TDD-Rot)

**Files:**

- Modify: `src/render/layout.test.ts`

- [ ] **Step 1: ViewBox-Test (Line 22-26) und Test-Name aktualisieren**

```ts
// Test-Name + Erwartungswert:
it('returns 960×540 viewBox', () => {
  // war: 820×540
  const layout = computeLayout(baseConfig(), []);
  expect(layout.width).toBe(960); // war: 820
  expect(layout.height).toBe(540);
});
```

- [ ] **Step 2: Home-Position-Test (Line 28-32) und Test-Name aktualisieren**

```ts
it('places home at (480, 270)', () => {
  // war: (380, 270)
  const layout = computeLayout(baseConfig(), []);
  const home = layout.nodes.find((n) => n.kind === 'home');
  expect(home).toMatchObject({ x: 480, y: 270, r: 50 }); // x: 380 → 480
});
```

- [ ] **Step 3: `sourceClusterXs`-Test-Cases (Line 42-49) aktualisieren**

```ts
[1, [280]],                              // war: [180]
[2, [250, 560]],                         // war: [180, 440]
[3, [200, 380, 560]],                    // war: [130, 290, 440]
[4, [200, 320, 440, 560]],               // war: [130, 230, 330, 440]
[5, [200, 290, 380, 470, 560]],          // war: [130, 207.5, 285, 362.5, 440]
[6, [200, 272, 344, 416, 488, 560]],     // war: [130, 192, 254, 316, 378, 440]
```

- [ ] **Step 4: N=1-Consumer-Position (Line 83) aktualisieren**

```ts
expect(consumers[0]).toMatchObject({ x: 480 + 350, y: 270 }); // war: 380 + 275
```

- [ ] **Step 5: PV/Akku-Collision-Check (Line 98) aktualisieren**

```ts
for (const cx of [250, 560]) {            // war: [180, 440]
  for (const cy of [80, 460]) {
    // ... unverändert
```

- [ ] **Step 6: N=7-α=42°-Cap-Test (Line 113) aktualisieren**

```ts
const dy = 350 * Math.sin(alphaRad); // war: 275
```

- [ ] **Step 7: Neuen Consumer-zu-Consumer-Gap-Test hinzufügen (Spec §3.2)**

Pre-existing Coverage-Lücke schließen: bestehende Tests prüfen Consumer-vs-PV/Akku-Kollision, aber NICHT Consumer-vs-Consumer. Im `describe('computeLayout — consumer arc', ...)`-Block einfügen (nach Line 117, vor `})`-Closing des describe):

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

**TDD-Hinweis:** Dieser Test ist mit altem UND neuem Code grün (Gap heute 9.5 px > 4, neu 25 px > 4). Defensive Coverage, nicht klassischer Rot-Test.

- [ ] **Step 8: Tests ausführen — MUSS rot sein (außer dem neuen Gap-Test)**

```bash
pnpm test src/render/layout.test.ts
```

Erwartet: viewBox-Test, Home-Test, sourceClusterXs-Cases, N=1-Consumer, N=7-Cap, PV/Akku-Collision sind **rot**. Der NEUE Consumer-Gap-Test (Step 7) ist **grün** (defensive Coverage). Wenn ein Test grün bleibt, der eigentlich rot sein sollte: Sanity-Check fehlgeschlagen — der Test prüft die Konstante NICHT echt. **STOP**, melden, nicht weiter.

- [ ] **Step 9: KEIN Commit jetzt (Rot-State)**

---

### Task 1.2: Layout-Konstanten + Magic-Number + Comments aktualisieren

**Files:**

- Modify: `src/const.ts`
- Modify: `src/render/layout.ts`
- Modify: `hacs.json` (nur Check)

- [ ] **Step 1: `src/const.ts` — `CARD_VERSION` + `VIEWBOX.width`**

```ts
// Line 3
export const CARD_VERSION = '0.11.0'; // war: '0.10.0'

// Line 20
export const VIEWBOX = { width: 960, height: 540 } as const; // width: 820 → 960
```

- [ ] **Step 2: `src/render/layout.ts` — Geometrie-Konstanten (Line 36-40)**

```ts
const GRID_X = 60; // unverändert
const HOME_X = 480; // war: 380
const SOURCE_X_MIN = 200; // war: 130
const SOURCE_X_MAX = 560; // war: 440
const CONSUMER_ARC_R = 350; // war: 275
```

- [ ] **Step 3: `src/render/layout.ts` — Comment-Blöcke (Line 41-49)**

Ersetze den existierenden Comment-Block vor `CONSUMER_ARC_MAX_DEG` und `CONSUMER_ARC_STEP_DEG`:

```ts
// 42° cap: limited by viewBox-top margin (top consumer y = 36 → 12 px to
// viewBox top y=0). PV/Akku collision is NOT the constraint — they sit at
// x≈250/560 while consumers are at x≈740+, horizontally far apart.
const CONSUMER_ARC_MAX_DEG = 42;
// 14° step keeps adjacent center-to-center gap at 85 px (= 2·R·sin(7°)),
// well above the 48 px consumer diameter, for N=2..7. At N=8 the cap kicks
// in and gap shrinks to 73 px — still 25 px margin to diameter.
const CONSUMER_ARC_STEP_DEG = 14;
```

- [ ] **Step 4: `src/render/layout.ts` — `sourceClusterXs` (Line 95-103)**

```ts
function sourceClusterXs(n: number): number[] {
  if (n <= 0) return [];
  if (n === 1) return [280]; // war: [180]
  if (n === 2) return [250, 560]; // war: [180, 440]
  if (n === 3) return [200, 380, 560]; // war: [130, 290, 440]
  if (n === 4) return [200, 320, 440, 560]; // war: [130, 230, 330, 440]
  const span = SOURCE_X_MAX - SOURCE_X_MIN;
  return Array.from({ length: n }, (_, i) => SOURCE_X_MIN + (i * span) / (n - 1));
}
```

- [ ] **Step 5: `src/render/layout.ts:161` — Magic-Number `270` → `MIDDLE_Y` (Single-Source, ADR-0010)**

Aktuell:

```ts
d: bezierPath(pvNode, battNode, { x: pvNode.x - 60, y: 270 }),
```

Neu:

```ts
d: bezierPath(pvNode, battNode, { x: pvNode.x - 60, y: MIDDLE_Y }),
```

- [ ] **Step 6: `hacs.json` prüfen**

```bash
cat hacs.json
```

Erwartet: keine `"version"`-Angabe (siehe aktueller Inhalt). Falls vorhanden → auf `0.11.0` setzen.

- [ ] **Step 7: Tests ausführen — MUSS grün sein**

```bash
pnpm test src/render/layout.test.ts
```

Erwartet: alle Test-Cases grün.

- [ ] **Step 8: Vollständige CI-Gate-Verifikation**

```bash
pnpm check
```

Erwartet: TypeScript + ESLint + Vitest alle grün.

- [ ] **Step 9: Coverage-Check (Spec §3.3 Schritt 4, CLAUDE.md Regel 9)**

```bash
pnpm test:coverage
```

Erwartet: Coverage ≥ 90 % für `src/render/layout.ts`. Da nur Konstanten geändert + ein Test ergänzt wurde, Coverage gleich oder besser als vorher.

---

### Task 1.3: Commit Phase 1

- [ ] **Step 1: Staging prüfen**

```bash
git status
git diff --stat src/const.ts src/render/layout.ts src/render/layout.test.ts
```

Erwartet: 3 Dateien modifiziert. Nichts unerwartetes.

- [ ] **Step 2: Stage + Commit**

```bash
git add src/const.ts src/render/layout.ts src/render/layout.test.ts
git commit -m "$(cat <<'EOF'
refactor(layout): viewBox 820×540 → 960×540 + adjust constants and tests

Subspec 2026-05-12: Aspect-Ratio von 1.52:1 auf 16:9 (1.78:1) — Card nutzt
HA-Dashboard-Breite besser. Arc-Radius 275 → 350 (komfortablerer Knoten-Gap),
Source-Cluster [130,440] → [200,560], HOME_X 380 → 480. Magic-Number 270 in
computeEdges durch MIDDLE_Y ersetzt (ADR-0010). CARD_VERSION 0.10.0 → 0.11.0
(Breaking Visual Change).

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

- [ ] **Step 3: Commit-Erfolg verifizieren**

```bash
git log -1 --stat
git status
```

Erwartet: Commit angelegt, working tree clean (relative zu den committeten Dateien).

---

## Phase 2 — `card.ts` API-Streichung (Commit 2)

**Commit-Vorlage:**

```
refactor(card): drop getGridOptions/getCardSize for native HA Sections layout

Spec §2.2: getGridOptions und getCardSize entfernen, damit HA Sections-View
seinen nativen Auto-Layout-Mechanismus nutzt statt unsere Slider-Bounds
(max_columns: 12, max_rows: 8). User kann jetzt frei skalieren bis zur
echten Section-Maxgröße. ADR-0018 wird superseded durch ADR-0019.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
```

### Task 2.1: Methoden aus `card.ts` entfernen

**Files:**

- Modify: `src/card.ts`

- [ ] **Step 1: `getGridOptions` (Lines 71-87) komplett entfernen**

Aktuell:

```ts
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
```

Aktion: gesamten Block ersatzlos löschen.

- [ ] **Step 2: `getCardSize` (Lines 89-91) komplett entfernen**

Aktuell:

```ts
  getCardSize(): number {
    return Math.ceil((this.getGridOptions().rows * 56) / 50);
  }
```

Aktion: gesamten Block ersatzlos löschen.

- [ ] **Step 3: TypeScript-Check**

```bash
pnpm typecheck
```

Erwartet: grün. Keine Referenz auf `getGridOptions` oder `getCardSize` anderswo im Code.

- [ ] **Step 4: Tests + Lint**

```bash
pnpm check
```

Erwartet: alles grün.

- [ ] **Step 5: LOC-Sanity-Check (CLAUDE.md Regel 3 — ≤ 200 LOC)**

```bash
LOC=$(wc -l < src/card.ts) && [ "$LOC" -le 200 ] && echo "OK: $LOC ≤ 200 LOC" || (echo "FAIL: $LOC > 200 LOC" && exit 1)
```

Erwartet: `OK: <N> ≤ 200 LOC`. Vor Streichung 201 LOC, nach Streichung von ~20 LOC ⇒ ~181 LOC.

---

### Task 2.2: Commit Phase 2

- [ ] **Step 1: Stage + Commit**

```bash
git add src/card.ts
git commit -m "$(cat <<'EOF'
refactor(card): drop getGridOptions/getCardSize for native HA Sections layout

Spec §2.2: getGridOptions und getCardSize entfernen, damit HA Sections-View
seinen nativen Auto-Layout-Mechanismus nutzt statt unsere Slider-Bounds
(max_columns: 12, max_rows: 8). User kann jetzt frei skalieren bis zur
echten Section-Maxgröße. ADR-0018 wird superseded durch ADR-0019.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

- [ ] **Step 2: Verifikation**

```bash
git log -2 --oneline
pnpm check
```

Erwartet: 2 neue Commits, CI-Gate grün.

---

## Phase 3 — Dokumentations-Updates (Commit 3)

**Commit-Vorlage:**

```
docs(adr,spec): supersede ADR-0018 with ADR-0019, update ADR-0017 + subspec §6

Subspec 2026-05-12 §4: Neuer ADR-0019 dokumentiert ViewBox 16:9 +
getGridOptions-Streichung. ADR-0018 → superseded. ADR-0017 Werte auf neue
Geometrie + alte Drift (25°/7° → 42°/14°) korrigiert. Subspec 2026-05-11
§6.1/§6.2 als superseded markiert. architecture.md §3 Signatur-Drift fix,
§4 ADR-Tabelle erweitert. README mit 0.11.0-Changelog.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
```

### Task 3.1: ADR-0019 neu anlegen

**Files:**

- Create: `docs/adr/0019-aspect-16-9-no-grid-options.md`

- [ ] **Step 1: Datei aus Stub anlegen**

Inhalt 1:1 aus `docs/specs/2026-05-12-aspect-ratio-redesign.md` §4.3 übernehmen. Das ist der vollständige Markdown-Block ab `# ADR-0019: ViewBox-Aspect 16:9 + Entfernung HA-Dashboard-Layout-API` bis vor das schließende Code-Fence.

```bash
# Plan-Workflow: copy-paste aus Spec §4.3, keine Anpassung nötig
```

- [ ] **Step 2: Verifikation**

```bash
head -10 docs/adr/0019-aspect-16-9-no-grid-options.md
```

Erwartet: Datei beginnt mit `# ADR-0019: ViewBox-Aspect 16:9 + Entfernung HA-Dashboard-Layout-API`.

---

### Task 3.2: ADR-0018 als superseded markieren

**Files:**

- Modify: `docs/adr/0018-ha-dashboard-layout-api.md`

- [ ] **Step 1: Status-Header austauschen**

Aktuell (Line ~3):

```
- **Status:** accepted
```

Neu:

```
- **Status:** superseded by [ADR-0019](./0019-aspect-16-9-no-grid-options.md) (2026-05-12)
```

- [ ] **Step 2: Hinweis-Block direkt nach Headern einfügen**

Vor `## Kontext und Problem` einfügen:

```markdown
> **Superseded:** Diese Entscheidung wurde am 2026-05-12 nach User-Feedback durch
> [ADR-0019](./0019-aspect-16-9-no-grid-options.md) abgelöst. Die deklarierten
> Slider-Bounds (`max_columns: 12, max_rows: 8`) erwiesen sich in der Praxis
> als künstliche Einschränkung gegenüber HAs nativem Auto-Layout.
```

---

### Task 3.3: ADR-0017 Werte + Drift korrigieren

**Files:**

- Modify: `docs/adr/0017-adaptive-svg-layout.md`

- [ ] **Step 1: §"Entscheidung" Zeile 26 aktualisieren**

Aktuell:

```
**Gewählt: Option A.** Bogen mit Radius 275 um Home (380, 270), Winkel ±α=`min(25°, (N-1)·7°/2)`, fixer ViewBox 820×540. Quellen (PV/Akku) clustern in der linken 2/3-Fläche (x ∈ [130, 440]).
```

Neu:

```
**Gewählt: Option A.** Bogen mit Radius 350 um Home (480, 270), Winkel ±α=`min(42°, (N-1)·14°/2)`, fixer ViewBox 960×540 (Aspect 16:9, [ADR-0019](./0019-aspect-16-9-no-grid-options.md)). Quellen (PV/Akku) clustern in der linken 2/3-Fläche (x ∈ [200, 560]).
```

- [ ] **Step 2: §"Positive Konsequenzen" — α-Cap-Zeile aktualisieren**

Konkretes Replace in `docs/adr/0017-adaptive-svg-layout.md` (Bullet-Punkt unter "Positive Konsequenzen"):

```diff
- α-Cap bei 25° verhindert PV/Akku-Kollision bis N=8
+ α-Cap bei 42° / Step 14° verhindert PV/Akku-Kollision UND Consumer-Überlappung bis N=8 (Gap 25 px bei R=350)
```

**Datum-Header bleibt unverändert** (ADR-0017 hat schon `Datum: 2026-05-12` — selber Tag, kein Update nötig).

---

### Task 3.4: ADR-Index erweitern

**Files:**

- Modify: `docs/adr/README.md`

- [ ] **Step 1: 0018-Status auf `superseded` setzen**

Aktuelle Zeile:

```
| [0018](./0018-ha-dashboard-layout-api.md)                | HA-Dashboard-Layout-API immer aktiv                        | accepted |
```

Neu:

```
| [0018](./0018-ha-dashboard-layout-api.md)                | HA-Dashboard-Layout-API immer aktiv                        | superseded by [0019](./0019-aspect-16-9-no-grid-options.md) |
```

- [ ] **Step 2: 0019-Zeile direkt darunter ergänzen**

```
| [0019](./0019-aspect-16-9-no-grid-options.md)            | ViewBox-Aspect 16:9 + Entfernung HA-Dashboard-Layout-API   | accepted |
```

---

### Task 3.5: Subspec 2026-05-11 §6.1/§6.2 als superseded markieren

**Files:**

- Modify: `docs/specs/2026-05-11-consumer-grouping-and-layout.md`

- [ ] **Step 1: Hinweis-Block am Anfang von §6.1 einfügen**

Direkt unter der `### 6.1 \`getGridOptions()\` (\`card.ts\`)`-Überschrift:

```markdown
> **Update 2026-05-12:** Diese Sektion ist superseded durch
> [Subspec 2026-05-12 + ADR-0019](./2026-05-12-aspect-ratio-redesign.md).
> `getGridOptions` und `getCardSize` werden ersatzlos gestrichen.
```

- [ ] **Step 2: Identischen Hinweis-Block am Anfang von §6.2 einfügen**

Direkt unter `### 6.2 \`getCardSize()\` an Grid ankoppeln`:

```markdown
> **Update 2026-05-12:** Diese Sektion ist superseded durch
> [Subspec 2026-05-12 + ADR-0019](./2026-05-12-aspect-ratio-redesign.md).
> `getGridOptions` und `getCardSize` werden ersatzlos gestrichen.
```

---

### Task 3.6: architecture.md aktualisieren

**Files:**

- Modify: `docs/architecture.md`

- [ ] **Step 1: Stale Signatur Line 80 fixen**

Aktuell:

```
          Layout.compute(config, viewBox)       ← render/layout.ts
```

Neu:

```
          computeLayout(config, displayConsumers) ← render/layout.ts
```

- [ ] **Step 2: §4 ADR-Tabelle 0018 auf superseded**

Suche nach Zeile mit `[0018]` in der ADR-Tabelle und passe Status-Spalte an:

```
| [0018](./adr/0018-ha-dashboard-layout-api.md)                | HA-Dashboard-Layout-API (`getGridOptions`) immer aktiv   | superseded — Slider-Bounds erwiesen sich als künstliche Einschränkung        |
```

- [ ] **Step 3: §4 ADR-Tabelle Zeile für 0019 hinzufügen (direkt unter 0018)**

```
| [0019](./adr/0019-aspect-16-9-no-grid-options.md)            | ViewBox-Aspect 16:9 + Entfernung HA-Dashboard-Layout-API | Card nutzt HA-Dashboard-Breite ohne Letterbox, Slider ohne künstliches Cap   |
```

---

### Task 3.7: README.md Changelog

**Files:**

- Modify: `README.md`

- [ ] **Step 1: Changelog-Sektion finden oder anlegen**

```bash
grep -n "Changelog\|## 0\.\|## [0-9]" README.md
```

Wenn kein Changelog existiert: Neue Sektion `## Changelog` am Dateiende vor evtl. Lizenz-Sektion einfügen.

- [ ] **Step 2: 0.11.0-Eintrag einfügen**

```markdown
## Changelog

### 0.11.0 — 2026-05-12

#### Visueller Update (Breaking Visual Change)

- **ViewBox-Aspect 16:9 (statt ~1.52:1)**: Die Card nutzt jetzt die Dashboard-Breite besser. Funktionalität und Daten unverändert — Sensoren, Edges, Animation, Theme sind identisch zu 0.10.x.
- **HA-Layout-API entfernt**: Die Card deklariert keine `getGridOptions` mehr → HA's Layout-Editor erlaubt freie Skalierung ohne künstliche Slider-Obergrenze.

#### Was zu tun ist nach Update

1. Browser-Cache leeren (Strg+Shift+R / Cmd+Shift+R), falls die alte Optik noch erscheint
2. Falls der Default-Slot nach Update zu klein wirkt: HA-Dashboard → "Card bearbeiten" → "Layout" → Größe manuell anpassen
3. Optimaler HA-Sections-Slot: 12×9 oder 12×10
```

---

### Task 3.8: Commit Phase 3

- [ ] **Step 1: Staging prüfen**

```bash
git status
git diff --stat docs/
```

Erwartet: 6 Dateien modifiziert + 1 Datei neu (`docs/adr/0019-...md`).

- [ ] **Step 2: Stage + Commit**

```bash
git add docs/adr/0017-adaptive-svg-layout.md \
        docs/adr/0018-ha-dashboard-layout-api.md \
        docs/adr/0019-aspect-16-9-no-grid-options.md \
        docs/adr/README.md \
        docs/specs/2026-05-11-consumer-grouping-and-layout.md \
        docs/architecture.md \
        README.md
git commit -m "$(cat <<'EOF'
docs(adr,spec): supersede ADR-0018 with ADR-0019, update ADR-0017 + subspec §6

Subspec 2026-05-12 §4: Neuer ADR-0019 dokumentiert ViewBox 16:9 +
getGridOptions-Streichung. ADR-0018 → superseded. ADR-0017 Werte auf neue
Geometrie + alte Drift (25°/7° → 42°/14°) korrigiert. Subspec 2026-05-11
§6.1/§6.2 als superseded markiert. architecture.md §3 Signatur-Drift fix,
§4 ADR-Tabelle erweitert. README mit 0.11.0-Changelog.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

- [ ] **Step 3: Verifikation**

```bash
git log -3 --oneline
pnpm check
```

Erwartet: 3 neue Commits, CI-Gate grün.

---

## Phase 4 — Build + Visual-Verifikation (Commit 4 — Screenshots)

**Anmerkung:** Phase 4 hat einen 4. Commit (Screenshots) — diese Anzahl ist nicht in Spec §2.4 gelistet. Plan-Erweiterung wegen Binary-Artefakte: gehören in eigenen Commit, damit Code-PR-Diffs nicht durch PNG-Hex-Diffs verrauscht werden.

**Commit-Vorlage (für Screenshots):**

```
docs(readme): regenerate screenshots for 0.11.0 aspect-ratio change

Spec 2026-05-12 §3.3: individual-consumers.png und by-area-grouping.png
neu erzeugt via pnpm preview, da viewBox-Aspect 16:9 (statt 1.52:1) das
visuelle Erscheinungsbild der Card geändert hat.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
```

### Task 4.0: Verify "check"-Dateien aus Spec §2.1 unverändert

**Files (read-only verify — diese Dateien sollten NICHT modifiziert worden sein):**

- `examples/preview.html`
- `examples/2-pv-2-batt.yaml`
- `src/card-helpers.ts`
- `src/card-styles.ts`
- `src/render/flow-renderer.ts`
- `src/render/node-renderer.ts`, `home-ring.ts`, `battery-ring.ts`, `flow-animation.ts`, `edge-color.ts`, `theme.ts`, `context.ts`
- `src/engine/*`, `src/config/*`, `src/ha/*`, `src/i18n/*`
- `src/editor.ts`, `src/editor-list-sections.ts`
- `CLAUDE.md`

- [ ] **Step 1: Diff gegen letzten Commit prüfen**

```bash
git diff HEAD~3 HEAD -- src/engine/ src/config/ src/ha/ src/i18n/ src/editor.ts src/editor-list-sections.ts src/card-helpers.ts src/card-styles.ts src/render/flow-renderer.ts src/render/node-renderer.ts src/render/home-ring.ts src/render/battery-ring.ts src/render/flow-animation.ts src/render/edge-color.ts src/render/theme.ts src/render/context.ts examples/ CLAUDE.md
```

Erwartet: leer (keine Änderungen). Falls Output → versehentlich angefasst → in dieser Spec out of scope → reverten oder begründen.

- [ ] **Step 2: Inhalts-Check (keine hardcoded viewBox-Werte außerhalb const.ts)**

```bash
grep -rn "820\|960" src/ --include="*.ts" | grep -v const.ts | grep -v "test\.ts" | grep -v "// " || echo "OK: no hardcoded viewBox-width outside const.ts"
```

Erwartet: `OK: no hardcoded viewBox-width outside const.ts` (oder leere Ausgabe). Falls Hits → Magic-Number-Verstoß (ADR-0010) → klären.

### Task 4.1: Production-Build + Bundle-Size

- [ ] **Step 1: Build**

```bash
pnpm build
```

Erwartet: erfolgreich, Bundle in `dist/`.

- [ ] **Step 2: Bundle-Size prüfen**

```bash
ls -lh dist/*.js
```

Erwartet: Größe ≤ 60 kB minified (CLAUDE.md Bundle-Budget). Erwarte sogar leichte Reduktion durch Streichung von `getGridOptions/getCardSize` (~0.5 kB).

- [ ] **Step 3: Bundle-Analyzer (Optional, bei Bedarf)**

```bash
pnpm build:analyze
```

Erwartet: visualizer-Report in `dist/stats.html`. Manuell prüfen, dass keine unerwarteten Imports im Bundle landen.

---

### Task 4.2: Sandbox-Preview + Visuelle Bezier-Verifikation

**Files (read-only Check):**

- `src/render/layout.ts:150,175,182,202` (Bezier-y-Offsets `80` und `-30`)

- [ ] **Step 1: Preview starten**

```bash
pnpm preview
```

Erwartet: Browser öffnet `examples/preview.html`. Card rendert in 960×540 viewBox.

- [ ] **Step 2: Visuelle Checkliste durchgehen**

| Check                                                    | Erwartet                                                           |
| -------------------------------------------------------- | ------------------------------------------------------------------ |
| Knoten-Positionen (PV oben, Home mitte, Akku unten)      | Home bei x≈480, Sources flankiert links/rechts                     |
| Verbraucher-Arc voll sichtbar (alle 8 Knoten im viewBox) | Top-Verbraucher y≈36, Bottom y≈504                                 |
| Knoten-Überlappung                                       | Keine sichtbare Überlappung, auch nicht zwischen N=8 Verbrauchern  |
| Diagnostik-Icon (bei unavailable Sensoren)               | Sichtbar bei (930, 30), keine Überlappung mit Consumer-Edge        |
| Bezier-Edges (Source → Home)                             | Bogen wirkt natürlich, kein "Knick"                                |
| Bezier-Edges (Source → Grid)                             | Bogen elegant, kein "kreuzendes" Verhalten mit anderen Edges       |
| PV → Battery (paired)                                    | Vertikaler Bogen sauber, kein Magic-Number-Artefakt durch MIDDLE_Y |
| Animation läuft fließend                                 | Dots bewegen sich gleichmäßig                                      |
| Theme Light + Dark                                       | Beide Modi visuell sauber                                          |

- [ ] **Step 3: Bezier-Offset-Visuelle-Verifikation**

Die Bezier-Kontrollpunkt-Offsets in `src/render/layout.ts` wurden NICHT angepasst:

- `Line 150`: `{ x: gridNode.x - 20, y: pvNode.y + 80 }` (PV → Grid)
- `Line 175`: `midpoint(battNode, homeNode, -30)` (Battery → Home)
- `Line 182`: `{ x: gridNode.x - 20, y: battNode.y - 80 }` (Battery → Grid)
- `Line 202`: `{ x: gridNode.x - 20, y: battNode.y - 80 }` (Grid → Battery)

Bei neuer Source-Position-Range (x∈[200,560] statt [130,440]) und neuem HOME_X=480 (statt 380) können diese Offsets visuell "unrund" wirken. Beobachte die Edges genau:

- Falls Edges visuell harmonisch wirken → keine Änderung nötig
- Falls Edges "knicken" oder unschön biegen → in einer Folge-Iteration tunen (separater Patch, nicht Teil dieses Plans)

Dokumentiere Beobachtungen ggf. in einem Issue oder Commit-Body.

---

### Task 4.3: Screenshots regenerieren

**Files:**

- Regen: `docs/screenshots/individual-consumers.png`
- Regen: `docs/screenshots/by-area-grouping.png`

- [ ] **Step 1: Beispiel-Config für individual-consumers laden**

In `pnpm preview` die Standard-Beispiel-Config laden (siehe `examples/2-pv-2-batt.yaml`), die 2 PV + 2 Akkus + 3 Verbraucher zeigt.

- [ ] **Step 2: Screenshot erstellen**

Browser-Screenshot (z.B. via Browser-DevTools, Playwright, oder OS-Screenshot) der Card-Region. Speichern unter:

```
docs/screenshots/individual-consumers.png
```

Auflösung: empfohlen ≥ 1200 px breit für scharfe Retina-Darstellung im README.

- [ ] **Step 3: by-area-grouping Config laden**

Config mit `display.consumer_grouping: by_area` und ≥6 Verbraucher-Sensoren in 3+ Areas, sodass die Card 3 Gruppen-Knoten zeigt.

- [ ] **Step 4: Screenshot erstellen**

```
docs/screenshots/by-area-grouping.png
```

- [ ] **Step 5: Bilder prüfen**

```bash
ls -la docs/screenshots/individual-consumers.png docs/screenshots/by-area-grouping.png
```

Erwartet: Beide Dateien existieren, sind PNG, neuer als der letzte Commit.

- [ ] **Step 6: Commit Phase 4**

```bash
git add docs/screenshots/individual-consumers.png docs/screenshots/by-area-grouping.png
git commit -m "$(cat <<'EOF'
docs(readme): regenerate screenshots for 0.11.0 aspect-ratio change

Spec 2026-05-12 §3.3: individual-consumers.png und by-area-grouping.png
neu erzeugt via pnpm preview, da viewBox-Aspect 16:9 (statt 1.52:1) das
visuelle Erscheinungsbild der Card geändert hat.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

- [ ] **Step 7: README-Bild-Rendering verifizieren**

Markdown-Renderer oder Browser-Vorschau von README.md öffnen, prüfen dass die neuen Screenshots korrekt erscheinen.

---

## Phase 5 — Smoke-Tests (manuell, kein Code-Change)

Diese Phase hat **keinen Commit** — nur Verifikation. Bei Misserfolg: Rollback (siehe Spec §5.4) und Issue erstellen.

### Task 5.1: Pre-Release-Smoke-Test (ADR-0012)

- [ ] **Step 1: Headless-Smoke-Test laufen lassen**

Pfad siehe ADR-0012 + `scripts/`-Verzeichnis. Konkretes Skript je nach Projekt-Setup.

Erwartet: Test grün, Class-Load funktioniert, keine Crashes beim Initial-Render.

- [ ] **Step 2: Falls Test viewBox-Werte hardcoded prüft**

Anpassen auf `width: 960, height: 540` und neu laufen lassen. Dies ist Bug-Fix-Patch im Smoke-Test, NICHT Out-of-Scope.

---

### Task 5.2: HA-Dashboard-Smoke-Test (manuell, Live-Instance)

**Voraussetzung:** Gebauter `custom-energy-flow-card.js` aus `dist/` in HA-Test-Instance deployen (z.B. via lokales `www/`-Verzeichnis oder HACS-Dev-Mode).

- [ ] **Step 1: Card in 12×8 HA-Sections-Slot ziehen**

Erwartet: ~60 px Letterbox L/R (akzeptabel).

- [ ] **Step 2: Card in 12×9 Slot ziehen**

Erwartet: minimaler Letterbox (~16 px L/R).

- [ ] **Step 3: Card in 12×10 Slot ziehen**

Erwartet: optimaler Fit, kein sichtbarer Letterbox.

- [ ] **Step 4: HA-Layout-Slider testen**

Slider in HA-Layout-Editor öffnen. Erwartet: **kein hartes Cap bei 12 columns / 8 rows**. User kann auf jede Größe ziehen, die die Section/Dashboard-Config zulässt.

- [ ] **Step 5: Diagnostik-Icon-Test**

Test-Config mit 1+ unavailable Sensor laden. Erwartet: Warning-Icon sichtbar bei (930, 30) in den viewBox-Koordinaten, keine Überlappung mit Consumer-Edges.

- [ ] **Step 6: Knoten-Anzahl-Varianten durchspielen**

- N=1 Verbraucher: Single-Verbraucher rechts vom Home (x=480+350=830, y=270)
- N=4 Verbraucher: Sauberer Bogen
- N=8 Verbraucher: Bogen voll ausgeschöpft, keine Überlappung, alle in viewBox

- [ ] **Step 7: Animation-Test (UX-Subtilität)**

Bei aktiven Energieflüssen: Dots laufen fließend. Bei gleicher Power wirkt die Bewegung leicht "ruhiger" als in 0.10.x (siehe Spec §5.4 Animation-Subtilität). **Falls als störend empfunden**: separater Patch `DEFAULTS.animation.base_duration_s` 2.5 → 2.0 (out of scope dieses Plans).

- [ ] **Step 8: prefers-reduced-motion-Test**

OS-Setting "Animationen reduzieren" aktivieren. Erwartet: Card-Animation deaktiviert, statische Edges sichtbar.

- [ ] **Step 9: Dark-Mode-Test**

HA-Theme auf Dark schalten. Erwartet: Card-Farben angepasst, Text lesbar, keine Verschiebungen.

- [ ] **Step 10: Klick-Verhalten**

Klick auf Knoten → HA `more-info`-Dialog öffnet sich für den richtigen Sensor.

- [ ] **Step 11: Editor-GUI-Live-Preview (Spec §5.1)**

Im HA-Lovelace-Editor "Card bearbeiten" öffnen. Die Live-Preview zeigt automatisch die neue Geometrie — kein separater Editor-Code-Change nötig (Editor rendert dieselbe `<custom-energy-flow-card>`-Komponente). Erwartet: Preview entspricht der gerenderten Card im Dashboard.

---

## Self-Review-Checkliste (vor Plan-Abschluss)

- [ ] Spec-Coverage: jede Sektion der Spec hat einen Task (§1 Geometrie → Task 1.2, §2.1 File-Table → Tasks 1.1-2.1+3.1-3.7, §2.4 Code-Quality → in jedem Task, §3 Tests → Task 1.1+1.3, §4 Doku → Tasks 3.1-3.6, §5 Migration → Tasks 4.3+5.2)
- [ ] Keine Placeholders (TBD/TODO/Similar-to)
- [ ] Type-Consistency: alle TS-Referenzen sind konsistent (`getGridOptions`/`getCardSize` werden überall identisch genannt)
- [ ] Commit-Granularität entspricht Spec §2.4 (Phase 1 = Commit 1, Phase 2 = Commit 2, Phase 3 = Commit 3, Phase 4 = Commit 4 für Screenshots)
- [ ] Verifikations-Pipeline (Spec §3.3) ist abgebildet: typecheck → lint → test → coverage → check → build → preview → smoke
- [ ] Don't-Touch-Liste (Spec §0.6) wird respektiert: `TAB_ORDER`, ARIA, `prefers-reduced-motion`, `_containerW=720`, `data-power`, `memoLayout`, Lifecycle nicht angefasst
- [ ] Code-Reuse-Tabelle (Spec §2.5) wird genutzt: `MIDDLE_Y` ersetzt Magic-Number `270`, `bezierPath`/`straightPath` weiter genutzt

---

## Out of Scope (nicht Teil dieses Plans)

- Anpassung von `flow-animation.ts` für path-length-basierte Duration (siehe Spec §5.4)
- Tuning der Bezier-Kontrollpunkt-Offsets `80`/`-30` (siehe Task 4.2 — separater Patch falls visuell nötig)
- Wiedereinführung `getCardSize()` als statischer Fallback für HA < 2024.3 (siehe Spec §5.4 — separater 0.11.1-Patch falls nötig)
- Adaptive viewBox (Spec §6)
- Größere Node-Radien (Spec §6)

---

## Notizen für den Implementierer

- **TDD-Order in Task 1.1**: Erst Tests anpassen → rot. Wenn ein Test trotzdem grün bleibt (z.B. weil er nur strukturell prüft, nicht den konkreten Wert), ist der Test-Bypass-Verdacht da. STOP und mit User klären, nicht einfach weiter.
- **Magic-Number-Fix in Task 1.2 Step 5** ist kein "optionales Refactoring", sondern Bestandteil der ADR-0010-Compliance — überspringen heißt CI bricht oder Code-Review fragt nach.
- **ADR-0017-Drift in Task 3.3** muss mit beseitigt werden. Wer das überspringt produziert die nächste Drift in 3 Monaten — gleicher Bug wie heute.
- **Screenshots (Task 4.3)** sind Pflicht, nicht Optional. README zeigt sonst veraltete Optik.
- **Phase 5 Smoke-Tests** sind manuell und brauchen eine HA-Test-Instance — wenn nicht verfügbar, dokumentieren und vor Production-Release nachholen.
