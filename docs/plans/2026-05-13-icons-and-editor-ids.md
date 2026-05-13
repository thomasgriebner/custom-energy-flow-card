# MDI-Icon-Rendering & Editor-ID-Cleanup Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use `superpowers:subagent-driven-development` (recommended) or `superpowers:executing-plans` to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Editor-ID-Textfeld entfernen + User-/Area-konfigurierte `mdi:*`-Icons tatsächlich rendern (via `<ha-icon>` in `<foreignObject>`), inkl. Diagnostics-Marker. Icon-Logik wandert in `src/render/icon.ts` als Single-Source.

**Architecture:** Reine `render/`- + Editor-Zone-Änderung. Engine, Config, RenderContext, card.ts, card-styles.ts unangetastet. Layer-Boundary via ESLint `no-restricted-paths`. Strategie-Wechsel von Hauptspec §5.3 (inline mdi-paths) zu ha-icon dokumentiert in ADR-0020.

**Tech Stack:** TypeScript 5.4 strict, Lit 3.2, Rollup 4, Vitest 1.4 + happy-dom, ESLint 8, pnpm 9. Neuer DevDep `@mdi/js` (Sandbox/Test-Stub only). Bundle ≤ 60 kB, `card.ts` ≤ 200 LOC.

**Verbindliche Lese-Quellen (vor Start):**

- Spec: [`docs/specs/2026-05-13-icons-and-editor-ids.md`](../specs/2026-05-13-icons-and-editor-ids.md) v10 — **Single-Source aller Constraints, Werte, Begründungen**
- [`CLAUDE.md`](../../CLAUDE.md) — Projekt-Schnellreferenz, Regeln 1-10
- [`docs/conventions.md`](../conventions.md) — Code-Stil (§1.2 as-Casts, §1.6 funktionale Iteration, §2 Comments, §11 Anti-Patterns, §12 Doku-Pflicht, §13 Dependencies)
- [`docs/architecture.md`](../architecture.md) — Layer-Tabelle §2, ADR-Tabelle §4
- ADRs: 0002 (Layered), 0003 (No Runtime Deps), 0004 (Pure Engine), 0008 (Manual List Editor), 0009 (ESLint Layer Boundaries), 0010 (Shared Util), 0012 (Smoke Test), 0016 (HA Area Grouping)

**Konzepte (verbindlich, siehe Spec für Details):**

- **Datenfluss-Pipeline** (Spec §0.3): Engine kennt keine Icons; `derive-display-consumers.ts:83` ist alleinige Quelle für `DisplayConsumer.icon`; `configEntryForNode` bleibt private in `node-renderer.ts`; `icon.ts` ist alleinige Quelle für Icon-SVG-Templates; Theme-Farbe via `currentColor`
- **Lit-Lifecycle**: keine Änderung an `card.ts` `willUpdate`/`render`/`firstUpdated`/`shouldUpdate`
- **Engine-Warnings statt Throws** (conventions §6.1): Engine wirft niemals; nicht relevant hier (Engine unangetastet)
- **Code-Reuse-Tabelle** (Spec §3.9): 15 vorhandene Helper — VERBINDLICH wiederverwenden statt neu zu bauen
- **Anti-Patterns** (Spec §3.9): 10 verbotene Muster aktiv vermeiden

**Standing Requirement für jeden Task:**

> 🛑 Jede Code-Zeile, die in dieser Plan-Datei als TypeScript/JS-Block steht, ist als Vorschlag zu verstehen, der **`docs/conventions.md`** und **alle in Spec §0.1 referenzierten ADRs** einhalten muss. Vor dem `git commit` jedes Tasks: **`pnpm check` läuft grün durch** (`lint + typecheck + test`). Lint erzwingt automatisch:
>
> - Layer-Boundaries (ADR-0009, `import/no-restricted-paths`)
> - Imports-Reihenfolge (`import/order`, conventions §4)
> - `no-console` außer info/warn/error (conventions §7)
> - `no-explicit-any` ohne expliziten Disable
> - `no-non-null-assertion` außer in Tests
> - `no-restricted-imports` für `@mdi/js` ab Phase 1 (`src/` nicht erlaubt)
>
> Entwickler-Disziplin erzwungen manuell:
>
> - Pure Functions in `engine/` (ADR-0004) — Engine wird NICHT angefasst
> - Keine god-class in `card.ts` (≤ 200 LOC) — wird NICHT angefasst
> - Single-Source `util/`-Aufrufe (ADR-0010) — `DEFAULT_MDI_ICONS`/`NODE_ICON_BOX`/`iconNameToCamelCase` jeweils nur an einer Stelle
> - Funktionale Iteration (`.map`/`.filter`/`.reduce`, conventions §1.6)
> - Conventional-Commit-Format (conventions §8)
> - Keine WHAT-Kommentare; Strings aus `i18n/de.ts` (conventions §2, §11.5)
> - **TDD-First** für `iconNameToCamelCase` (util-artig), `nodeIcon`/`diagnosticsIcon` (icon.ts), `editor-list-sections`-Bereinigung: Test rot, dann Code, dann grün

**Elements NICHT anfassen** (aus Spec §0.4 Don't-Touch-Liste, plus Spec §0.0 Verbots-Liste):

| Element                                                                                                                                                                                                                                                        | Wo                                           | Warum                                                                    |
| -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------- | ------------------------------------------------------------------------ |
| `configEntryForNode`                                                                                                                                                                                                                                           | `node-renderer.ts:211-219` (private)         | Bleibt private — RenderContext-Bezug, gehört nicht in `icon.ts`          |
| Battery-Section `value-changed`-Handler                                                                                                                                                                                                                        | `editor-list-sections.ts:148-160`            | Merge-Pattern bereits vorhanden, nur Solar braucht Anpassung             |
| Pairing `<select>`, `<label>`, error-Span                                                                                                                                                                                                                      | `editor-list-sections.ts:162-181`            | Nur die `<option>`-Map ändert sich (Fallback `${s.id}`)                  |
| `nodeName`, `nodeValueText`, `labelYOffset`                                                                                                                                                                                                                    | `node-renderer.ts:221-236, 176-209, 158-170` | Eigene Logik, nicht Icon-relevant                                        |
| `.node-icon { fill }` CSS-Regel                                                                                                                                                                                                                                | `card-styles.ts:69-73`                       | Bleibt für Emoji-Pass-Through-Pfad nötig                                 |
| `ha-icon`-Type-Decl                                                                                                                                                                                                                                            | `ha-globals.d.ts:16`                         | `{ icon: string }` reicht                                                |
| `RenderContext`-Typ                                                                                                                                                                                                                                            | `render/context.ts`                          | Kein neues Feld nötig — `DisplayConsumer.icon` fließt schon mit          |
| `derive-display-consumers.ts:83` Icon-Resolver                                                                                                                                                                                                                 | `config/derive-display-consumers.ts:83`      | Logik (`icon = areaEntry.icon`) bereits korrekt                          |
| `<g>`-Attribute (außer `style`)                                                                                                                                                                                                                                | `node-renderer.ts:68-83`                     | `class`, `part`, `role`, `tabindex`, `aria-label`, Event-Handler bleiben |
| Diagnostics `<circle>`-Badge                                                                                                                                                                                                                                   | `flow-renderer.ts:82-83`                     | Bleibt; nur `<text>!</text>` wird ersetzt                                |
| `examples/preview.html`                                                                                                                                                                                                                                        | `examples/preview.html`                      | Lädt nur fertige `.js`; Stub-Wire-up in `scripts/build-preview.mjs`      |
| `vitest.config.ts:coverage.include`                                                                                                                                                                                                                            | `vitest.config.ts`                           | NICHT auf `render/**` erweitern (Spec §6.6)                              |
| `src/engine/*`, `src/config/schema.ts`, `card.ts`, `src/render/{context,layout,theme,edge-color,battery-ring,home-ring,flow-animation}.ts`, `src/util/*`, `src/i18n/de.ts`, `src/ha/*`, `src/editor.ts`, `src/index.ts`, `src/const.ts`, `src/card-helpers.ts` | div.                                         | Spec §0.2 NICHT-berührte Bereiche                                        |

**Phases:**

- Phase 0 — Vorab-Gates (Spike + ADR-Draft): **2 tasks, Commit 1**
- Phase 1 — Foundation (DevDep + Stub + Test-Setup): **3 tasks, Commit 2**
- Phase 2 — Icon-Modul (`src/render/icon.ts`, TDD-First): **2 tasks, Commit 3**
- Phase 3 — Renderer-Migration (node + flow): **2 tasks, Commit 4**
- Phase 4 — Editor-Cleanup (TDD-First): **2 tasks, Commit 5**
- Phase 5 — Sandbox + Demo-Szenarien: **2 tasks, Commit 6**
- Phase 6 — Final-Verification (check + smoke + build:analyze + manuell): **4 tasks, kein Commit (Verifikation)**
- Phase 7 — Doku-Updates: **5 tasks, Commit 7**
- Phase 8 — README + Screenshots: **2 tasks, Commit 8**

Total: **9 Phasen, ~22 Tasks, 8 Commits**.

---

## File Structure (decomposed before tasks)

### Modified

| Datei                                                     | Verantwortlichkeit                                                                     | Phase |
| --------------------------------------------------------- | -------------------------------------------------------------------------------------- | ----- |
| `.eslintrc.cjs`                                           | Neue Regel `no-restricted-imports` für `@mdi/js`                                       | 1     |
| `package.json`                                            | Neuer DevDep `@mdi/js`                                                                 | 1     |
| `vitest.config.ts`                                        | `setupFiles` neu, `environmentMatchGlobs` `editor.test.ts` → `editor*.test.ts`         | 1     |
| `src/render/node-renderer.ts`                             | `nodeIconChar`/`DEFAULT_ICONS`/`iconY` löschen; `<g style="color:…">`; `nodeIcon`-Call | 3     |
| `src/render/flow-renderer.ts`                             | Diagnostics-Migration: `<text>!</text>` → `diagnosticsIcon()`; `<g style>`; `part`     | 3     |
| `src/editor-list-sections.ts`                             | `id`-Feld aus Solar/Battery-Schemata; Solar-Handler Merge-Pattern; Pairing-Fallback    | 4     |
| `scripts/build-preview.mjs`                               | `previewSrc`-Template um `registerHaIconStub()`-Import erweitern                       | 5     |
| `examples/preview-mocks.ts`                               | Mind. 2 neue Demo-Szenarien (Custom-Icon + Area-Icon)                                  | 5     |
| `docs/specs/2026-05-10-custom-energy-flow-card-design.md` | §3.2/§5.3/§7/§9/§5.13 aktualisieren                                                    | 7     |
| `docs/architecture.md`                                    | §2 Layer-Tabelle (`render/` „Icon-Rendering"), §4 ADR-0020-Eintrag                     | 7     |
| `docs/adr/0016-ha-area-grouping.md`                       | 1-Zeilen-Cross-Reference auf ADR-0020                                                  | 7     |
| `docs/adr/0020-ha-icon-via-foreignobject.md`              | Status `draft` → `accepted` nach Phase 3 grün                                          | 7     |
| `docs/adr/README.md`                                      | ADR-Index um 0020 erweitern                                                            | 0/7   |
| `README.md`                                               | Changelog-Eintrag, Hinweis auf MDI-Icon-Rendering + Editor-Feldreihenfolge             | 8     |

### Created

| Datei                                        | Verantwortlichkeit                                                        | Phase |
| -------------------------------------------- | ------------------------------------------------------------------------- | ----- |
| `docs/adr/0020-ha-icon-via-foreignobject.md` | ADR-Stub aus Spec §8, Status `draft`                                      | 0     |
| `examples/lib/` (Verzeichnis)                | NEU — existiert nicht im Repo                                             | 1     |
| `examples/lib/ha-icon-stub.ts`               | `iconNameToCamelCase`, `HaIconStub`, `registerHaIconStub()`               | 1     |
| `examples/lib/ha-icon-stub.test.ts`          | `iconNameToCamelCase`-Unit-Tests (Node-Env)                               | 1     |
| `examples/lib/ha-icon-stub.dom.test.ts`      | Stub-DOM-Tests (`@vitest-environment happy-dom`)                          | 1     |
| `tests/` + `tests/setup/` (Verzeichnisse)    | NEU — existieren nicht im Repo                                            | 1     |
| `tests/setup/ha-icon.ts`                     | Globaler `registerHaIconStub()`-Aufruf für alle Vitest-Tests              | 1     |
| `src/render/icon.ts`                         | `DEFAULT_MDI_ICONS`, `NODE_ICON_BOX`, `nodeIcon`, `diagnosticsIcon`       | 2     |
| `src/render/icon.test.ts`                    | `nodeIcon`/`diagnosticsIcon`-Tests (Node-Env, SVGTemplateResult-Struktur) | 2     |
| `src/editor-list-sections.test.ts`           | Editor-Tests (Schema-ohne-`id`, Merge-Pattern, Pairing-Fallback)          | 4     |

### NICHT anfassen (Spec §0.2 NICHT-berührte Bereiche)

- `src/engine/*` — pure Energiebilanz (ADR-0004)
- `src/config/schema.ts`, `src/config/derive-display-consumers.ts`, `src/config/system-state.ts` — Validierung/Resolver unverändert
- `src/config/types.ts` — `SolarConfig.icon`, `DisplayConsumer.icon` etc. existieren bereits
- `src/util/*` — keine neuen Util-Helper (icon-Logik ist render-spezifisch)
- `src/i18n/de.ts` — keine neuen User-Strings
- `src/ha/ha-globals.d.ts` — `ha-icon`-Type-Decl reicht
- `src/ha/ha-helpers.ts`, `src/ha/ha-types.ts` — keine Änderung
- `src/card.ts` — Lifecycle (`willUpdate`, `render`, `firstUpdated`, `shouldUpdate`) unangetastet
- `src/card-helpers.ts`, `src/card-styles.ts` — Card-Helpers und CSS-Regeln bleiben (CSS .node-icon für Emoji-Pass-Through)
- `src/render/{context,layout,theme,edge-color,battery-ring,home-ring,flow-animation}.ts` — separate Module unangetastet
- `src/editor.ts` — Outer Editor (nur `editor-list-sections.ts` ändert sich)
- `src/index.ts`, `src/const.ts` — keine Änderung
- `examples/preview.html` — lädt nur fertige `.js` (Stub-Wire-up in build-preview.mjs)

### Build-Pipeline-Files (oft übersehen)

| Datei                       | Art der Änderung                                                                                        | Phase |
| --------------------------- | ------------------------------------------------------------------------------------------------------- | ----- |
| `.eslintrc.cjs`             | NEU: `no-restricted-imports`-Rule, additive zur `rules:`-Sektion                                        | 1     |
| `vitest.config.ts`          | NEU `setupFiles`-Feld; `environmentMatchGlobs`-Glob: `editor.test.ts` → `editor*.test.ts` (additive)    | 1     |
| `tsconfig.json`             | KEINE Änderung — `examples/**` schon ausgeschlossen, Tests excluded                                     | —     |
| `tsconfig.preview.json`     | KEINE Änderung — `examples/**/*` schon im `include`                                                     | —     |
| `package.json`              | `pnpm add -D @mdi/js` — Commit-Body MUSS Begründung enthalten (conventions §13)                         | 1     |
| `scripts/build-preview.mjs` | `previewSrc`-Template (Zeile 8 ff.): zwei neue Zeilen als allererste Zeilen einfügen                    | 5     |
| `scripts/smoke-test.mjs`    | KEINE Änderung initial (Plan-Task 6.2 verifiziert grün; falls fail: Stub-Registrierung als Hotfix-Task) | 6     |

---

## Phase 0 — Vorab-Gates (Commit 1)

**Commit-Vorlage:**

```
chore(spike,adr): verify Lit-svg namespace + add ADR-0020 draft for ha-icon strategy

Spec 2026-05-13 §10.1 Lit-Namespace-Risiko ist „hoch" eingeschätzt. Spike
verifiziert minimal-Beispiel <foreignObject><ha-icon> Namespace-Verhalten
in Sandbox. ADR-0020 als Draft angelegt — Promote auf accepted erst nach
Renderer-Migration grün (Plan-Phase 3).

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
```

> **Standing-Reminder Phase 0:** Vorab-Gates dürfen die Codebase NICHT permanent verändern (außer ADR-Doku). Spike-Code ist temporär — entweder verworfen oder als Test-File erhalten als Regression-Schutz.

### Task 0.1: Spike — Lit-Namespace-Verifikation (~30 min)

**Files:**

- Create: `examples/preview-spike-haicon.html` (oder ähnliche temporäre Sandbox-Datei)

- [ ] **Step 1: Spike-HTML aufbauen**

Erstelle eine minimale Sandbox-HTML, die ein `<foreignObject>` mit `<ha-icon>` via Lit's `svg`-Template rendert.

```html
<!DOCTYPE html>
<html>
  <head>
    <meta charset="UTF-8" />
    <title>Spike — Lit svg + foreignObject + ha-icon namespace</title>
  </head>
  <body>
    <div id="host"></div>
    <script type="module">
      import { svg, render, html } from 'lit';

      // Minimaler ha-icon-Stub für den Spike (ohne MDI-Paths):
      class HaIconStub extends HTMLElement {
        connectedCallback() {
          this.innerHTML = `<span data-test="stub-active">ICON</span>`;
          console.log('[spike] HaIconStub connectedCallback fired, host=', this);
        }
      }
      customElements.define('ha-icon', HaIconStub);

      // Minimal-Lit-Template: <svg><g><circle><foreignObject><ha-icon>
      const template = html`
        <svg viewBox="0 0 100 100" style="width:200px;height:200px;border:1px solid #ccc">
          ${svg`
          <g transform="translate(50 50)" style="color: red;">
            <circle r="30" fill="none" stroke="currentColor" stroke-width="2"></circle>
            <foreignObject x="-12" y="-12" width="24" height="24">
              <ha-icon icon="mdi:battery" style="display:block; color: inherit;"></ha-icon>
            </foreignObject>
          </g>
        `}
        </svg>
      `;
      render(template, document.getElementById('host'));

      // Verifikations-Assertions:
      setTimeout(() => {
        const haIcon = document.querySelector('ha-icon');
        console.assert(haIcon, 'ha-icon element should exist');
        console.assert(
          haIcon instanceof HTMLElement,
          'ha-icon must be HTMLElement (HTML-namespaced)',
        );
        console.assert(
          !(haIcon instanceof SVGElement),
          'ha-icon must NOT be SVGElement (SVG-namespaced)',
        );
        console.assert(
          haIcon.querySelector('[data-test="stub-active"]'),
          'connectedCallback should have run',
        );
        console.log('[spike] All assertions passed ✓');
      }, 100);
    </script>
  </body>
</html>
```

- [ ] **Step 2: Spike im Browser öffnen**

```bash
# Mit Python-HTTP-Server oder ähnlich:
cd /home/griebner/repos/custom-energy-flow-card
python3 -m http.server 8765 &
# Dann öffnen: http://localhost:8765/examples/preview-spike-haicon.html
```

Erwartet: roter Kreis mit „ICON"-Text in der Mitte. Browser-Console zeigt:

```
[spike] HaIconStub connectedCallback fired, host= <ha-icon icon="mdi:battery">
[spike] All assertions passed ✓
```

- [ ] **Step 3: STOP-Condition prüfen**
  - **Falls alle Assertions grün:** Lit-`svg`-Template + `<foreignObject>` + HTML-Custom-Element funktioniert nativ. Spec §10.1 Workaround NICHT nötig. Weiter mit Task 0.2.
  - **Falls Assertions rot** (`ha-icon instanceof SVGElement === true` oder `connectedCallback` feuert nicht):
    1. **STOP** — Spec-Annahme war falsch.
    2. `unsafeSVG`-Workaround testen (Spec §10.1 Option 1): `import { unsafeSVG } from 'lit/directives/unsafe-svg.js'`, foreignObject-Inhalt als String generieren, mit `${unsafeSVG(htmlString)}` einbinden.
    3. Falls auch das fehlschlägt: Spec §10.1 Option 2/3 prüfen, mit User klären.
    4. Spec §10.1 + ADR-0020 entsprechend dem realen Verhalten anpassen, BEVOR Phase 1 startet.

- [ ] **Step 4: Spike-Ergebnis dokumentieren**

  Sicherer Pfad — Spike erhalten als Regression-Schutz: lasse `examples/preview-spike-haicon.html` im Repo (wird in Phase 6 manuell verifiziert). Falls Workaround nötig war: Code im Spike entsprechend anpassen, damit er das funktionierende Verhalten zeigt.

- [ ] **Step 5: KEIN Commit jetzt (Spike-Stand wird mit Task 0.2 gemeinsam committed)**

---

### Task 0.2: ADR-0020 als Draft anlegen

**Files:**

- Create: `docs/adr/0020-ha-icon-via-foreignobject.md`
- Modify: `docs/adr/README.md`

- [ ] **Step 1: ADR-0020 anlegen — Template aus `docs/adr/0000-template.md` kopieren**

```bash
cp docs/adr/0000-template.md docs/adr/0020-ha-icon-via-foreignobject.md
```

- [ ] **Step 2: Inhalt aus Spec §8 ADR-Stub übernehmen**

Editiere `docs/adr/0020-ha-icon-via-foreignobject.md`:

```markdown
# ADR-0020: `<ha-icon>` via `<foreignObject>` statt inline `mdi-paths.ts`

- **Status:** draft (promote zu `accepted` nach Plan-Phase 3 — Renderer-Migration grün)
- **Datum:** 2026-05-13
- **Entscheider:** @griebner

## Kontext und Problem

Hauptspec [`2026-05-10-…-design.md`](../specs/2026-05-10-custom-energy-flow-card-design.md) §5.3 plant eine Inline-`<path>`-Map (`mdi-paths.ts`) für die ~5 Default-Icons. Mit der Subspec [`2026-05-11-consumer-grouping-and-layout.md`](../specs/2026-05-11-consumer-grouping-and-layout.md) (Verbraucher-Gruppierung) kommen Area-Icons hinzu, die **zur Compile-Zeit nicht bekannt** sind — eine statische Map kann sie nicht abdecken.

## Entscheidungs-Treiber

- User-konfigurierbare Icons aus dem Editor (Solar/Battery/Consumer) sollen tatsächlich gerendert werden — heute werden alle `mdi:*`-Werte verworfen
- Area-Icons aus `hass.areas[*].icon` (dynamische User-HA-Konfig) müssen ebenfalls funktionieren
- Bundle-Budget ≤ 60 kB (Hauptspec §2.1) bleibt einzuhalten
- Wartungsaufwand soll niedrig sein

## Geprüfte Optionen

- **A — `<ha-icon>` via `<foreignObject>`** (HA-globales Custom Element, deckt alle dynamischen Icons ab)
- **B — Inline-Path-Map `mdi-paths.ts`** (Hauptspec-Plan, Wartungslast + funktioniert nur für bekannte Set)
- **C — Hybrid** (Defaults inline, dynamische via ha-icon — zwei Code-Pfade)

## Entscheidung

**Gewählt: Option A.** Begründung: dynamische User-/Area-Icons + null Wartungslast wiegen mehr als die 1–2 kB Bundle-Ersparnis. `<ha-icon>` ist HA-globales Custom Element (siehe Hauptspec §6.4.2), in jeder HA-Instanz garantiert verfügbar.

### Positive Konsequenzen

- Beliebige `mdi:*`-Icons funktionieren ohne Wartung
- Area-Icons (Subspec 2026-05-11) werden automatisch gerendert
- Card-Mod-Hook via `<foreignObject part="node-icon">` möglich

### Negative Konsequenzen

- Sandbox + Vitest brauchen einen `ha-icon`-Stub via `@mdi/js` (DevDep) — kein Prod-Impact
- `<foreignObject>` + Lit-`svg`-Template + HTML-Namespace ist nicht trivial — Spike (Plan-Phase 0 Task 0.1) verifiziert, dass es nativ funktioniert; falls nicht, `unsafeSVG`-Workaround
- Visuelle Diff: Icons werden farbig (Knoten-Farbe via `currentColor`) statt monochrom (heutige `--primary-text-color`)

## Pros und Cons der Optionen

### Option A — `<ha-icon>` via `<foreignObject>` (gewählt)

- ✅ Dynamische Icons (User + Area) ohne Wartung
- ✅ Null Bundle-Impact in Prod (`@mdi/js` ist DevDep, nur Stub)
- ✅ Card-Mod-Hook via `part`-Attribut
- ❌ Lit-Namespace-Quirk (siehe Spike, Mitigation via `unsafeSVG`)
- ❌ Stub-Komplexität für Sandbox/Tests

### Option B — Inline `mdi-paths.ts`

- ✅ Volle Kontrolle, kein DevDep
- ✅ Kein Lit-Namespace-Risiko
- ❌ Wartungslast: jedes neue Default-Icon braucht Code-Edit
- ❌ Funktioniert NICHT für User-/Area-Icons (Compile-Zeit-Map)
- ❌ Bricht Subspec 2026-05-11 Area-Icon-Rendering

### Option C — Hybrid

- ✅ Bekannte Set lokal, dynamisch via ha-icon
- ❌ Zwei Code-Pfade, mehr Komplexität
- ❌ Reibung bei „Default + User-Override"-Cases

## Verlinkte Spec-Sektionen / Referenzen

- Subspec [`docs/specs/2026-05-13-icons-and-editor-ids.md`](../specs/2026-05-13-icons-and-editor-ids.md) §8 + §10.1
- [ADR-0016](./0016-ha-area-grouping.md) (Area-Icon-Quelle)
- [ADR-0010](./0010-shared-util-module.md) (Single-Source-Prinzip)
- [ADR-0003](./0003-typescript-lit-rollup.md) (Keine Runtime-Deps außer Lit — `@mdi/js` ist DevDep, kein Verstoß)
```

- [ ] **Step 3: ADR-Index `docs/adr/README.md` erweitern**

Neue Zeile am Ende der Tabelle:

```markdown
| [0020](./0020-ha-icon-via-foreignobject.md) | `<ha-icon>` via `<foreignObject>` statt inline `mdi-paths.ts` | draft |
```

- [ ] **Step 4: Verifikation — `pnpm check` grün**

```bash
pnpm check
```

Erwartet: grün (keine Code-Änderungen, nur Doku).

- [ ] **Step 5: Commit Phase 0**

```bash
git add docs/adr/0020-ha-icon-via-foreignobject.md docs/adr/README.md examples/preview-spike-haicon.html
git commit -m "$(cat <<'EOF'
chore(spike,adr): verify Lit-svg namespace + add ADR-0020 draft for ha-icon strategy

Spec 2026-05-13 §10.1 Lit-Namespace-Risiko ist "hoch" eingeschätzt. Spike
verifiziert minimal-Beispiel <foreignObject><ha-icon> Namespace-Verhalten
in Sandbox. ADR-0020 als Draft angelegt — Promote auf accepted erst nach
Renderer-Migration grün (Plan-Phase 3).

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Phase 1 — Foundation: DevDep + Stub + Test-Setup (Commit 2)

**Commit-Vorlage:**

```
feat(sandbox,tests): add @mdi/js devdep + ha-icon stub + vitest setupFiles

Sandbox + Vitest brauchen ha-icon-Implementierung (HA-globales Custom Element
in Prod). Stub liegt in examples/lib/ (außerhalb src/), nutzt @mdi/js für
Path-Lookup. ESLint no-restricted-imports verhindert src/-Import. tests/setup/
ha-icon.ts wird via setupFiles in jedem Test-Env geladen, no-op in Node-Env
durch customElements-Guard.

Used by examples/lib/ha-icon-stub.ts to render real MDI icons in sandbox and
Vitest tests. Not bundled into production (ESLint no-restricted-imports blocks
src/ imports; see ADR-0020).

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
```

> **Standing-Reminder Phase 1:** ADR-0003 (Keine Runtime-Deps außer Lit) wird respektiert — `@mdi/js` ist DevDep, ESLint-Restriction als Sicherheitsnetz. Stub-Code außerhalb `src/` → eigene Regeln (siehe Spec §3.5 `console.warn`-Prefix-Begründung).

### Task 1.1: `@mdi/js` DevDep + ESLint `no-restricted-imports`

**Files:**

- Modify: `package.json`
- Modify: `.eslintrc.cjs`

- [ ] **Step 1: `@mdi/js` als DevDep installieren**

```bash
pnpm add -D @mdi/js
```

- [ ] **Step 2: `package.json` verifizieren**

Erwartet: `@mdi/js` ist in `devDependencies` mit `^x.y.z`-Pinning (pnpm-Default — matched conventions §13 „Major-Pin, Minor/Patch frei").

- [ ] **Step 3: `.eslintrc.cjs` erweitern — neue Regel + Overrides für Sandbox/Test-Code**

Wichtig (Sub-Agent-Pass-1-Finding): `.lintstagedrc.json` lintet ALLE staged `*.ts`-Files via pre-commit-Hook (auch außerhalb `src/`). `.eslintrc.cjs:61 ignorePatterns` umfasst heute nur `['dist/', 'node_modules/', '*.cjs', '*.mjs']` — `examples/` NICHT. Die neue globale `no-restricted-imports`-Regel würde sonst beim Stub-`@mdi/js`-Import (in `examples/lib/ha-icon-stub.ts`) knallen.

**Zwei Änderungen — beide additiv:**

3.1) Neuer Regel-Eintrag in `rules:`-Sektion:

```js
// in .eslintrc.cjs, rules-Sektion: NEUER Eintrag neben den bestehenden Regeln:
'no-restricted-imports': ['error', {
  patterns: [
    {
      group: ['@mdi/js', '@mdi/js/*'],
      message: 'Nur in examples/lib/ + tests/setup/ erlaubt; @mdi/js würde sonst ins Prod-Bundle.'
    },
  ],
}],
```

3.2) Neuer `overrides`-Eintrag im `overrides`-Array (deaktiviert nur die `no-restricted-imports`-Regel für Sandbox/Test-Stub-Code):

```js
// in .eslintrc.cjs, overrides-Array: NEUER Eintrag neben den bestehenden overrides
// (Test-Files-Override + scripts-Override existieren bereits):
{
  files: ['examples/lib/**/*.ts', 'tests/setup/**/*.ts'],
  rules: {
    'no-restricted-imports': 'off',
  },
},
```

Bestehende Regel-Einträge (`import/no-restricted-paths`, `@typescript-eslint/no-explicit-any`, `@typescript-eslint/no-non-null-assertion`, `@typescript-eslint/explicit-function-return-type`, `no-console`, `import/order`) und bestehende `overrides` (`*.test.ts`, `scripts/**`) bleiben unverändert.

- [ ] **Step 4: ESLint laufen lassen — KEINE Regression**

```bash
pnpm lint
```

Erwartet: grün. Bestehende `src/`-Files importieren nicht `@mdi/js` → Regel greift (noch) nirgends.

- [ ] **Step 5: KEIN Commit jetzt (gemeinsam mit Task 1.2 + 1.3 in Phase-1-Commit)**

---

### Task 1.2: `examples/lib/` + ha-icon-Stub mit TDD-First

**Files:**

- Create: `examples/lib/` (Verzeichnis)
- Create: `examples/lib/ha-icon-stub.ts`
- Create: `examples/lib/ha-icon-stub.test.ts` (Test-First)
- Create: `examples/lib/ha-icon-stub.dom.test.ts` (DOM-Test, happy-dom)

- [ ] **Step 1: `examples/lib/`-Verzeichnis anlegen** (verifiziert: existiert heute nicht)

```bash
mkdir -p examples/lib
```

- [ ] **Step 2: `examples/lib/ha-icon-stub.test.ts` schreiben — TDD-Rot**

```ts
// examples/lib/ha-icon-stub.test.ts
import { describe, expect, it } from 'vitest';
import { iconNameToCamelCase } from './ha-icon-stub';

describe('iconNameToCamelCase', () => {
  it.each([
    ['mdi:battery', 'mdiBattery'],
    ['mdi:alert-circle-outline', 'mdiAlertCircleOutline'],
    ['mdi:', 'mdi'],
    ['battery', 'mdiBattery'],
    ['', 'mdi'],
    ['mdi:double--dash', 'mdiDoubleDash'],
  ])('iconNameToCamelCase(%s) → %s', (input, expected) => {
    expect(iconNameToCamelCase(input)).toBe(expected);
  });
});
```

- [ ] **Step 3: Tests ausführen — MUSS rot sein**

```bash
pnpm test examples/lib/ha-icon-stub.test.ts
```

Erwartet: **rot** mit „Cannot find module './ha-icon-stub'" oder ähnlich. Wenn Test grün bleibt: STOP — Test-Bypass-Verdacht.

- [ ] **Step 4: `examples/lib/ha-icon-stub.ts` implementieren — minimal**

```ts
// examples/lib/ha-icon-stub.ts
import * as mdiAll from '@mdi/js';

export function iconNameToCamelCase(name: string): string {
  const slug = name.startsWith('mdi:') ? name.slice(4) : name;
  if (!slug) return 'mdi';
  return (
    'mdi' +
    slug
      .split('-')
      .filter((p) => p.length > 0)
      .map((p) => {
        const first = p[0] ?? '';
        return first.toUpperCase() + p.slice(1);
      })
      .join('')
  );
}

function pathFor(name: string): string | undefined {
  const key = iconNameToCamelCase(name);
  return (mdiAll as Record<string, string | undefined>)[key];
}

class HaIconStub extends HTMLElement {
  static observedAttributes = ['icon'];

  connectedCallback(): void {
    this.update();
  }

  attributeChangedCallback(): void {
    this.update();
  }

  private update(): void {
    const name = this.getAttribute('icon') ?? '';
    const path = pathFor(name);
    this.innerHTML = path
      ? `<svg viewBox="0 0 24 24" style="width:100%;height:100%"><path d="${path}" fill="currentColor"/></svg>`
      : `<svg viewBox="0 0 24 24" style="width:100%;height:100%"><rect x="2" y="2" width="20" height="20" fill="none" stroke="currentColor" stroke-width="1"/></svg>`;
    if (!path && name) console.warn(`[ha-icon-stub] unknown icon: ${name}`);
    // Prefix bewusst NICHT [custom-energy-flow-card] (conventions §7):
    // Stub liegt außerhalb src/, ist Sandbox/Test-Komponente. Eigener Prefix
    // signalisiert beim Debug, dass die Warnung vom Stub kommt (nicht von
    // der Card selbst). Erleichtert Triage bei Screenshot-Issues.
  }
}

export function registerHaIconStub(): void {
  if (typeof customElements === 'undefined') return;
  if (!customElements.get('ha-icon')) {
    customElements.define('ha-icon', HaIconStub);
  }
}
```

- [ ] **Step 5: Tests grün — `iconNameToCamelCase`-Suite**

```bash
pnpm test examples/lib/ha-icon-stub.test.ts
```

Erwartet: **6 Tests grün**.

- [ ] **Step 6: DOM-Test schreiben — `examples/lib/ha-icon-stub.dom.test.ts`**

```ts
// @vitest-environment happy-dom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { registerHaIconStub } from './ha-icon-stub';

let warnSpy: ReturnType<typeof vi.spyOn>;

beforeEach(() => {
  warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
});

afterEach(() => {
  warnSpy.mockRestore();
});

describe('HaIconStub (DOM)', () => {
  it('renders <svg><path> with d-attribute for known icon', () => {
    registerHaIconStub();
    const el = document.createElement('ha-icon');
    el.setAttribute('icon', 'mdi:battery');
    document.body.appendChild(el);
    expect(el.innerHTML).toContain('<svg');
    expect(el.innerHTML).toMatch(/<path d="[^"]+"/);
  });

  it('renders placeholder rectangle and warns for unknown icon', () => {
    registerHaIconStub();
    const el = document.createElement('ha-icon');
    el.setAttribute('icon', 'mdi:does-not-exist-foo-bar');
    document.body.appendChild(el);
    expect(el.innerHTML).toContain('<rect');
    expect(warnSpy).toHaveBeenCalledWith(
      expect.stringContaining('unknown icon: mdi:does-not-exist-foo-bar'),
    );
  });
});
```

- [ ] **Step 7: DOM-Tests ausführen — MUSS grün sein**

```bash
pnpm test examples/lib/ha-icon-stub.dom.test.ts
```

Erwartet: **2 Tests grün**.

- [ ] **Step 8: Lint + Typecheck**

```bash
pnpm lint
pnpm typecheck
```

Erwartet: grün. Hinweise zur Tool-Coverage:

- **`pnpm lint`** (Script: `eslint 'src/**/*.ts'`) lintet nur `src/` — `examples/lib/` wird NICHT abgedeckt
- **Pre-commit-Hook** (`.lintstagedrc.json: "*.ts": ["eslint --fix"]`) lintet ALLE staged `*.ts`-Files, AUCH `examples/lib/`. Hier greift der `overrides`-Block aus Task 1.1 Step 3.2, der `no-restricted-imports` für `examples/lib/**` deaktiviert
- **`pnpm typecheck`** (`tsc --noEmit`) nutzt `tsconfig.json`, das `**/*.test.ts` excludet — Test-Files werden via Vitest+esbuild zur Laufzeit type-checked, nicht via tsc

- [ ] **Step 9: KEIN Commit jetzt (gemeinsam mit Task 1.3)**

---

### Task 1.3: `tests/setup/ha-icon.ts` + `vitest.config.ts` erweitern

**Files:**

- Create: `tests/` (Top-Level-Verzeichnis)
- Create: `tests/setup/` (Verzeichnis)
- Create: `tests/setup/ha-icon.ts`
- Modify: `vitest.config.ts`

- [ ] **Step 1: `tests/setup/`-Verzeichnis anlegen** (verifiziert: `tests/` existiert heute nicht im Repo)

```bash
mkdir -p tests/setup
```

- [ ] **Step 2: `tests/setup/ha-icon.ts` anlegen**

```ts
// tests/setup/ha-icon.ts
import { registerHaIconStub } from '../../examples/lib/ha-icon-stub';
registerHaIconStub();
```

- [ ] **Step 3: `vitest.config.ts` additive erweitern**

Aktueller Stand:

```ts
test: {
  globals: true,
  environment: 'node',
  environmentMatchGlobs: [
    ['**/editor.test.ts', 'happy-dom'],
    ['**/card.test.ts', 'happy-dom'],
  ],
  coverage: { /* unverändert */ },
}
```

Neu (zwei Änderungen):

```ts
test: {
  globals: true,                                          // bestehend
  environment: 'node',                                    // bestehend
  setupFiles: ['./tests/setup/ha-icon.ts'],               // NEU
  environmentMatchGlobs: [
    ['**/editor*.test.ts', 'happy-dom'],                  // ERWEITERT: editor.test.ts → editor*.test.ts (matcht editor-list-sections.test.ts ab Phase 4)
    ['**/card.test.ts', 'happy-dom'],                     // bestehend
    // ha-icon-stub.dom.test.ts nutzt file-level `// @vitest-environment happy-dom`
  ],
  coverage: { /* unverändert — NICHT auf render/** erweitern, siehe Spec §6.6 */ },
}
```

**Hinweis zum Status der heutigen `environmentMatchGlobs`:** `src/editor.test.ts` existiert aktuell NICHT im Repo. Der heutige Glob `'**/editor.test.ts'` matcht also nichts und ist toter Code. Die Erweiterung auf `'**/editor*.test.ts'` wird erst aktiv, sobald `src/editor-list-sections.test.ts` (Phase 4) angelegt wird.

- [ ] **Step 4: `pnpm check` grün — Foundation komplett**

```bash
pnpm check
```

Erwartet: lint + typecheck + test alle grün. Die neuen Tests aus Task 1.2 laufen jetzt mit `setupFiles` (Stub-Registrierung in jedem Test-Env aktiv — Node-Env: no-op durch Guard; happy-dom: registriert).

- [ ] **Step 5: Commit Phase 1**

```bash
git add package.json pnpm-lock.yaml .eslintrc.cjs examples/lib/ tests/setup/ vitest.config.ts
git commit -m "$(cat <<'EOF'
feat(sandbox,tests): add @mdi/js devdep + ha-icon stub + vitest setupFiles

Sandbox + Vitest brauchen ha-icon-Implementierung (HA-globales Custom
Element in Prod, im Stub als Sandbox-Komponente). Stub liegt in
examples/lib/ (außerhalb src/), nutzt @mdi/js für Path-Lookup. ESLint
no-restricted-imports verhindert src/-Import (Bundle-Schutz).

tests/setup/ha-icon.ts wird via setupFiles in jedem Test-Env geladen,
no-op in Node-Env durch customElements-Guard. environmentMatchGlobs
erweitert von editor.test.ts → editor*.test.ts (matcht ab Phase 4
neue editor-list-sections.test.ts).

Used by examples/lib/ha-icon-stub.ts for sandbox + Vitest icon
rendering. Not bundled into production (ESLint no-restricted-imports
blocks src/ imports; see ADR-0020).

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Phase 2 — Icon-Modul `src/render/icon.ts` (Commit 3)

**Commit-Vorlage:**

```
feat(render): add icon.ts single-source for default icons + nodeIcon/diagnosticsIcon

Spec 2026-05-13 §3.2: Neues Modul src/render/icon.ts ist Single-Source
für DEFAULT_MDI_ICONS, NODE_ICON_BOX, nodeIcon, diagnosticsIcon — wird
in Phase 3 von node-renderer.ts + flow-renderer.ts benutzt (ADR-0010).
Theme-agnostisch (Farbe via currentColor), nur Icon-Geometrie, kein
RenderContext-Bezug.

Tests prüfen Lit-SVGTemplateResult-Struktur (Node-Env, kein DOM nötig).

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
```

> **Standing-Reminder Phase 2:** Architektur-Prinzipien aus Spec §3.2 sind verbindlich — `icon.ts` ist theme-agnostisch, kennt keinen `RenderContext`, enthält NUR Icon-Geometrie (keine `valueY`/`labelOffset`-Werte). TDD-First: Test rot, dann Code, dann grün.

### Task 2.1: `src/render/icon.test.ts` schreiben — TDD-Rot

**Files:**

- Create: `src/render/icon.test.ts`

- [ ] **Step 1: Test-File schreiben**

```ts
// src/render/icon.test.ts
import { describe, expect, it } from 'vitest';
import { nodeIcon, diagnosticsIcon } from './icon';

function flatten(result: ReturnType<typeof nodeIcon>): string {
  return String.raw({ raw: result.strings }, ...result.values);
}

describe('nodeIcon', () => {
  it('renders ha-icon for default-icon when no config-icon set (pv)', () => {
    const flat = flatten(nodeIcon('pv', undefined));
    expect(flat).toContain('<ha-icon');
    expect(flat).toContain('icon="mdi:solar-power"');
    expect(flat).toContain('<foreignObject');
    expect(flat).toContain('part="node-icon"');
  });

  it.each([
    ['battery', 'mdi:battery'],
    ['grid', 'mdi:transmission-tower'],
    ['home', 'mdi:home'],
    ['consumer', 'mdi:power-plug'],
  ] as const)('renders default icon for kind %s → %s', (kind, expectedIcon) => {
    const flat = flatten(nodeIcon(kind, undefined));
    expect(flat).toContain(`icon="${expectedIcon}"`);
  });

  it('renders ha-icon with user-set mdi:* icon', () => {
    const flat = flatten(nodeIcon('consumer', 'mdi:heat-pump'));
    expect(flat).toContain('icon="mdi:heat-pump"');
    expect(flat).toContain('<foreignObject');
  });

  it('falls through to <text> for emoji icon (non-mdi prefix)', () => {
    const flat = flatten(nodeIcon('pv', '☀'));
    expect(flat).toContain('<text');
    expect(flat).toContain('☀');
    expect(flat).not.toContain('<foreignObject');
    expect(flat).not.toContain('<ha-icon');
  });

  it('foreignObject for home has size 32, consumer 18, default 24', () => {
    const flatHome = flatten(nodeIcon('home', undefined));
    expect(flatHome).toMatch(/width="32"/);
    expect(flatHome).toMatch(/height="32"/);

    const flatConsumer = flatten(nodeIcon('consumer', undefined));
    expect(flatConsumer).toMatch(/width="18"/);

    const flatPv = flatten(nodeIcon('pv', undefined));
    expect(flatPv).toMatch(/width="24"/);
  });
});

describe('diagnosticsIcon', () => {
  it('uses mdi:alert-circle-outline', () => {
    const flat = flatten(diagnosticsIcon());
    expect(flat).toContain('icon="mdi:alert-circle-outline"');
    expect(flat).toContain('<foreignObject');
    expect(flat).toContain('part="node-icon"');
  });

  it('foreignObject has size 18 (badge fit)', () => {
    const flat = flatten(diagnosticsIcon());
    expect(flat).toMatch(/width="18"/);
    expect(flat).toMatch(/height="18"/);
  });
});
```

- [ ] **Step 2: Tests ausführen — MUSS rot sein**

```bash
pnpm test src/render/icon.test.ts
```

Erwartet: **rot** mit „Cannot find module './icon'". Wenn grün: STOP — Test-Bypass-Verdacht.

- [ ] **Step 3: KEIN Commit jetzt (Rot-State)**

---

### Task 2.2: `src/render/icon.ts` implementieren — TDD-Grün

**Files:**

- Create: `src/render/icon.ts`

- [ ] **Step 1: Modul anlegen — Code aus Spec §3.2**

```ts
// src/render/icon.ts
import { svg, type SVGTemplateResult } from 'lit';
import type { LayoutNode } from './layout';

export const DEFAULT_MDI_ICONS: Record<LayoutNode['kind'], string> = {
  pv: 'mdi:solar-power',
  battery: 'mdi:battery',
  grid: 'mdi:transmission-tower',
  home: 'mdi:home',
  consumer: 'mdi:power-plug',
};

interface IconBox {
  size: number;
  centerY: number;
  emojiFontSize: number;
  emojiY: number;
}

const NODE_ICON_BOX: Record<LayoutNode['kind'], IconBox> = {
  pv: { size: 24, centerY: -4, emojiFontSize: 22, emojiY: -4 },
  battery: { size: 24, centerY: -4, emojiFontSize: 22, emojiY: -4 },
  grid: { size: 24, centerY: -4, emojiFontSize: 22, emojiY: -4 },
  home: { size: 32, centerY: -10, emojiFontSize: 28, emojiY: -10 },
  consumer: { size: 18, centerY: 6, emojiFontSize: 18, emojiY: 6 },
};

const DIAGNOSTICS_ICON_BOX: IconBox = {
  size: 18,
  centerY: 0,
  emojiFontSize: 13,
  emojiY: 4,
};

const DIAGNOSTICS_ICON_NAME = 'mdi:alert-circle-outline';

export function nodeIcon(
  kind: LayoutNode['kind'],
  configuredIcon: string | undefined,
): SVGTemplateResult {
  const box = NODE_ICON_BOX[kind];
  if (configuredIcon && !configuredIcon.startsWith('mdi:')) {
    return renderEmojiText(configuredIcon, box);
  }
  const iconName = configuredIcon ?? DEFAULT_MDI_ICONS[kind];
  return renderIconForeignObject(iconName, box);
}

export function diagnosticsIcon(): SVGTemplateResult {
  return renderIconForeignObject(DIAGNOSTICS_ICON_NAME, DIAGNOSTICS_ICON_BOX);
}

function renderEmojiText(text: string, box: IconBox): SVGTemplateResult {
  return svg`<text
    class="node-icon"
    text-anchor="middle"
    y="${box.emojiY}"
    font-size="${box.emojiFontSize}"
  >${text}</text>`;
}

function renderIconForeignObject(name: string, box: IconBox): SVGTemplateResult {
  const half = box.size / 2;
  return svg`
    <foreignObject
      x="${-half}"
      y="${box.centerY - half}"
      width="${box.size}"
      height="${box.size}"
      class="node-icon-fo"
      part="node-icon"
    >
      <ha-icon
        icon="${name}"
        style="display:block; width:100%; height:100%; --mdc-icon-size: ${box.size}px; color: inherit;"
      ></ha-icon>
    </foreignObject>
  `;
}
```

- [ ] **Step 2: Tests grün**

```bash
pnpm test src/render/icon.test.ts
```

Erwartet: **alle 10 Tests grün**.

- [ ] **Step 3: Lint + Typecheck**

```bash
pnpm lint src/render/icon.ts
pnpm typecheck
```

Erwartet: grün. Layer-Boundary-Check: `icon.ts` importiert nur `lit` (extern) und `./layout` (type-only, same Layer). ✓

- [ ] **Step 4: `pnpm check` komplett**

```bash
pnpm check
```

Erwartet: lint + typecheck + alle Tests grün.

- [ ] **Step 5: Commit Phase 2**

```bash
git add src/render/icon.ts src/render/icon.test.ts
git commit -m "$(cat <<'EOF'
feat(render): add icon.ts single-source for default icons + nodeIcon/diagnosticsIcon

Spec 2026-05-13 §3.2: Neues Modul src/render/icon.ts ist Single-Source
für DEFAULT_MDI_ICONS, NODE_ICON_BOX, nodeIcon, diagnosticsIcon — wird
in Phase 3 von node-renderer.ts + flow-renderer.ts benutzt (ADR-0010).
Theme-agnostisch (Farbe via currentColor), nur Icon-Geometrie, kein
RenderContext-Bezug.

Tests prüfen Lit-SVGTemplateResult-Struktur (Node-Env, kein DOM nötig).

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Phase 3 — Renderer-Migration (Commit 4)

**Commit-Vorlage:**

```
refactor(render): migrate node-renderer + flow-renderer to use icon.ts

Spec 2026-05-13 §3.3 + §3.4: nodeIconChar/DEFAULT_ICONS/iconY aus
node-renderer.ts gelöscht; <g> bekommt style="color: ${color}" damit
ha-icon via currentColor die Knoten-Farbe erbt. flow-renderer.ts
Diagnostics-Marker: <text>!</text> → diagnosticsIcon(), <g> bekommt
style="cursor: help; color: ${fill}" + part="diagnostics diagnostics-icon".

Bewusste visuelle Änderung: Icons werden jetzt farbig (Knoten-Farbe via
currentColor) statt monochrom (heutige --primary-text-color). Emoji-
Pass-Through bleibt erhalten und nutzt weiter .node-icon CSS-Regel.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
```

> **Standing-Reminder Phase 3:** Hier wird die visuelle Diff produziert. `configEntryForNode` bleibt private in `node-renderer.ts` — nicht versuchen nach `icon.ts` zu ziehen. `card-styles.ts:69-73` `.node-icon { fill }` BLEIBT für Emoji-Pass-Through. Diagnostics-`<circle>`-Badge BLEIBT.

### Task 3.1: `src/render/node-renderer.ts` migrieren

**Files:**

- Modify: `src/render/node-renderer.ts`

- [ ] **Step 1: Neuen Import hinzufügen**

In `src/render/node-renderer.ts` (Imports-Block, alphabetisch passend ein):

```ts
import { nodeIcon } from './icon';
```

- [ ] **Step 2: `DEFAULT_ICONS`-Konstante (Zeilen 13-19) löschen**

Entferne den kompletten Block:

```ts
// LÖSCHEN (Zeilen 13-19):
const DEFAULT_ICONS: Record<LayoutNode['kind'], string> = {
  pv: '☀',
  battery: '🔋',
  grid: '⚡',
  home: '🏠',
  consumer: '🔌',
};
```

- [ ] **Step 3: Lokale `iconY`-Variable (Zeile 62) löschen**

```ts
// LÖSCHEN (Zeile 62):
const iconY = node.kind === 'home' ? -10 : -4;
```

Hinweis: `valueY` (Zeile 63) BLEIBT — wird für `<text class="node-value">` (Zeile 107) gebraucht.

- [ ] **Step 4: `<g>`-Wrapper bekommt `style="color: ${color};"`**

Suche den `<g>`-Block (Zeile 68-83). Aktueller Stand:

```ts
return svg`
  <g
    transform="translate(${node.x} ${node.y})"
    class="node node--${node.kind} ${unavailable ? 'node--unavailable' : ''}"
    part="node node-${node.kind}"
    role="button"
    tabindex="0"
    aria-label="${ariaLabel}"
    @click=${() => ctx.onNodeClick?.(node.id)}
    @keydown=${(e: KeyboardEvent) => { ... }}
  >
```

Neu:

```ts
return svg`
  <g
    transform="translate(${node.x} ${node.y})"
    class="node node--${node.kind} ${unavailable ? 'node--unavailable' : ''}"
    part="node node-${node.kind}"
    style="color: ${color};"
    role="button"
    tabindex="0"
    aria-label="${ariaLabel}"
    @click=${() => ctx.onNodeClick?.(node.id)}
    @keydown=${(e: KeyboardEvent) => { ... }}
  >
```

Nur der `style="color: ${color};"`-Attribut ist neu. `color` ist bereits in Zeile 42 berechnet: `const color = colorFor(nodeColorRole(node.kind), ctx.theme);`.

- [ ] **Step 5: Icon-Element migrieren (Zeilen 93-95)**

Aktuell:

```ts
<text class="node-icon" text-anchor="middle" y="${isConsumer ? 6 : iconY}" font-size="${node.kind === 'home' ? 28 : isConsumer ? 18 : 22}">
  ${nodeIconChar(node, ctx)}
</text>
```

Neu (3 Zeilen → 1 Zeile):

```ts
${nodeIcon(node.kind, configEntryForNode(node, ctx)?.icon)}
```

Sizing/Positionierung liegt jetzt in `icon.ts:NODE_ICON_BOX`, nicht mehr inline.

- [ ] **Step 6: `nodeIconChar`-Funktion (Zeilen 238-246) löschen**

Entferne den kompletten Funktions-Body:

```ts
// LÖSCHEN (Zeilen 238-246):
export function nodeIconChar(node: LayoutNode, ctx: RenderContext): string {
  // For v1.0 we use Emoji defaults (Spec §9 acceptable fallback). User-configured
  // mdi:* icon names are stored in config but not rendered as SVG paths in v1.0;
  // this is an explicit deferral to v1.x — see Spec §9.
  const entry = configEntryForNode(node, ctx);
  if (entry?.icon && !entry.icon.startsWith('mdi:')) return entry.icon;
  return DEFAULT_ICONS[node.kind];
}
```

- [ ] **Step 7: Tests laufen lassen — bestehende Tests müssen weiter grün sein**

```bash
pnpm test src/render/
```

Erwartet: alle bestehenden Render-Tests (layout, battery-ring etc.) grün. `node-renderer.test.ts` existiert heute nicht; falls in Zukunft hinzugefügt: Test-Erwartungen aktualisieren.

- [ ] **Step 8: Lint + Typecheck**

```bash
pnpm lint
pnpm typecheck
```

Erwartet: grün. **LOC-Check** (Spec §11 Erfolgs-Kriterium):

```bash
wc -l src/render/node-renderer.ts
```

Erwartet: deutlich **unter 246** (vorher 246; gelöscht: `DEFAULT_ICONS` 7 Zeilen, `iconY` 1, `nodeIconChar` 9 → ~17 Zeilen weniger, also ~229).

- [ ] **Step 9: KEIN Commit jetzt (gemeinsam mit Task 3.2)**

---

### Task 3.2: `src/render/flow-renderer.ts` Diagnostics-Migration

**Files:**

- Modify: `src/render/flow-renderer.ts`

- [ ] **Step 1: Neuen Import hinzufügen**

```ts
import { diagnosticsIcon } from './icon';
```

- [ ] **Step 2: `renderDiagnostics` `<g>`-Block anpassen (Zeile 60-87)**

Suche das `<g>`-Element. Drei Änderungen:

1. `part="diagnostics"` → `part="diagnostics diagnostics-icon"`
2. `style="cursor: help;"` → `style="cursor: help; color: ${fill};"`
3. `<text>!</text>` (Zeile 84) → `${diagnosticsIcon()}`

Konkret — der finale Block sieht so aus:

```ts
return svg`
  <g
    transform="translate(${layout.width - 30} 30)"
    part="diagnostics diagnostics-icon"
    role="button"
    tabindex="0"
    aria-label="${label}"
    style="cursor: help; color: ${fill};"
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
    ${diagnosticsIcon()}
    <title>${count} ${DE.diagnostics.title}:\n${summary}</title>
  </g>
`;
```

**Die zwei `<circle>`-Elemente (Badge-Hintergrund + Outline) bleiben unverändert!** Nur das ehemalige `<text text-anchor="middle" y="4" ...>!</text>` (Zeile 84) wird durch `${diagnosticsIcon()}` ersetzt.

- [ ] **Step 3: Tests laufen lassen**

```bash
pnpm test src/render/
```

Erwartet: grün.

- [ ] **Step 4: `pnpm check` komplett**

```bash
pnpm check
```

Erwartet: lint + typecheck + alle Tests grün.

- [ ] **Step 5: Commit Phase 3**

```bash
git add src/render/node-renderer.ts src/render/flow-renderer.ts
git commit -m "$(cat <<'EOF'
refactor(render): migrate node-renderer + flow-renderer to use icon.ts

Spec 2026-05-13 §3.3 + §3.4: nodeIconChar/DEFAULT_ICONS/iconY aus
node-renderer.ts gelöscht; <g> bekommt style="color: ${color}" damit
ha-icon via currentColor die Knoten-Farbe erbt. flow-renderer.ts
Diagnostics-Marker: <text>!</text> → diagnosticsIcon(), <g> bekommt
style="cursor: help; color: ${fill}" + part="diagnostics diagnostics-icon".

Bewusste visuelle Änderung: Icons werden jetzt farbig (Knoten-Farbe via
currentColor) statt monochrom (heutige --primary-text-color via
.node-icon CSS). Emoji-Pass-Through bleibt erhalten und nutzt weiter
.node-icon CSS-Regel. Diagnostics-<circle>-Badge bleibt unverändert.

node-renderer.ts: 246 LOC → ~229 LOC (Auslagerung in icon.ts).

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Phase 4 — Editor-Cleanup (Commit 5)

**Commit-Vorlage:**

```
refactor(editor): remove id-field from solar/battery schemas + add merge-pattern

Spec 2026-05-13 §3.1: id-Feld aus Solar- und Battery-itemSchema entfernt
(Editor zeigt es nicht mehr; bleibt im data-Objekt für ha-form damit es
beim value-changed nicht verloren geht). Solar-Handler bekommt Merge-
Pattern analog Battery-Handler (editor-list-sections.ts:148-160 unverändert).
Pairing-Dropdown-Fallback auf ${DE.nodes.solar} ${s.id} → "Solar pv1"
konsistent mit nodeName-Output in der Card.

Bewusste UX-Änderung: Editor-Feldreihenfolge ändert sich von
id,name,power,icon → name,power,icon (besser, name first). Im Changelog
dokumentiert.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
```

> **Standing-Reminder Phase 4:** Battery-Handler in `editor-list-sections.ts:148-160` wird NICHT angefasst (hat das Merge-Pattern schon). icon-Feld im Schema BLEIBT vorhanden — wird mit dieser Phase nur funktional (vorher tot). Pairing-Wrapper (`<select>`, `<label>`, error-Span) BLEIBT, nur die `<option>`-Map ändert sich.

### Task 4.1: `src/editor-list-sections.test.ts` schreiben — TDD-Rot

**Files:**

- Create: `src/editor-list-sections.test.ts` (Happy-DOM-Env via `'**/editor*.test.ts'`-Glob)

- [ ] **Step 1: Test-File schreiben**

```ts
// src/editor-list-sections.test.ts
import { describe, expect, it } from 'vitest';
import { renderSolarSection, renderBatterySection } from './editor-list-sections';

// Helper: extrahiere das Schema-Array aus dem Lit-Template via Render in document
function extractFormSchema(templateResult: ReturnType<typeof renderSolarSection>): unknown {
  // Lit's TemplateResult hat `.values` — das schema-Property liegt darin
  const values = (templateResult as { values: unknown[] }).values;
  // Suche das schema-Array (Array von Objekten mit `name`-Property)
  for (const v of values) {
    if (Array.isArray(v) && v.length > 0 && typeof v[0] === 'object' && v[0] && 'name' in v[0]) {
      return v;
    }
  }
  return null;
}

describe('renderSolarSection schema', () => {
  it('does NOT include id field in itemSchema', () => {
    const noopHandlers = {
      onItemChange: () => {},
      onAdd: () => {},
      onRemove: () => {},
      onMove: () => {},
    };
    const result = renderSolarSection([{ id: 'pv1', power: 'sensor.x' }], undefined, noopHandlers);
    // Render und prüfe: das Schema-Array enthält kein { name: 'id' }
    // Strukturell genug: SVGTemplateResult-Strings flattenen
    const flat = JSON.stringify(result);
    // id darf nirgends als Schema-Feld stehen (Schema-Feld = name:'id')
    expect(flat).not.toMatch(/"name":\s*"id"/);
    // Andere Felder bleiben
    expect(flat).toMatch(/"name":\s*"name"/);
    expect(flat).toMatch(/"name":\s*"power"/);
    expect(flat).toMatch(/"name":\s*"icon"/);
  });
});

describe('renderBatterySection schema', () => {
  it('does NOT include id field in itemSchema (signed mode)', () => {
    const noopHandlers = {
      onItemChange: () => {},
      onPairChange: () => {},
      onModeChange: () => {},
      onAdd: () => {},
      onRemove: () => {},
      onMove: () => {},
    };
    const result = renderBatterySection(
      [{ id: 'b1', soc: 'sensor.soc', power: 'sensor.p', charged_by: 'pv1' }],
      [{ id: 'pv1', power: 'sensor.x' }],
      undefined,
      noopHandlers,
    );
    const flat = JSON.stringify(result);
    expect(flat).not.toMatch(/"name":\s*"id"/);
    expect(flat).toMatch(/"name":\s*"soc"/);
    expect(flat).toMatch(/"name":\s*"power"/);
  });
});

describe('renderBatterySection pairing fallback', () => {
  it('renders "Solar pv1" as fallback when solar item has no name', () => {
    const noopHandlers = {
      onItemChange: () => {},
      onPairChange: () => {},
      onModeChange: () => {},
      onAdd: () => {},
      onRemove: () => {},
      onMove: () => {},
    };
    const result = renderBatterySection(
      [{ id: 'b1', soc: 'sensor.soc', power: 'sensor.p', charged_by: 'pv1' }],
      [
        { id: 'pv1', power: 'sensor.x' }, // KEIN name
        { id: 'pv2', power: 'sensor.y', name: 'Dach' },
      ],
      undefined,
      noopHandlers,
    );
    const flat = JSON.stringify(result);
    // Fallback für pv1 ist "Solar pv1" (nicht "pv1", nicht "Solar 1")
    expect(flat).toContain('Solar pv1');
    // Für pv2 mit name "Dach": "Dach" (Name nicht überschrieben)
    expect(flat).toContain('Dach');
  });
});
```

- [ ] **Step 2: Tests ausführen — MUSS rot sein**

```bash
pnpm test src/editor-list-sections.test.ts
```

Erwartet:

- Solar-Schema-Test: **rot** (Schema enthält heute `{ name: 'id' }`)
- Battery-Schema-Test: **rot** (dito)
- Pairing-Fallback-Test: **rot** (heute zeigt der Code `${s.name ?? s.id}` = `"pv1"`, nicht `"Solar pv1"`)

Wenn ein Test grün bleibt: STOP — Test-Bypass-Verdacht.

- [ ] **Step 3: KEIN Commit jetzt (Rot-State)**

---

### Task 4.2: `src/editor-list-sections.ts` bereinigen

**Files:**

- Modify: `src/editor-list-sections.ts`

- [ ] **Step 1: Solar-Schema (`renderSolarSection`, Zeile 35) — `id`-Feld entfernen**

Aktuell (Zeile 35):

```ts
const itemSchema = [
  { name: 'id', selector: { text: {} }, required: true },
  { name: 'name', selector: { text: {} } },
  // ...
];
```

Neu (im finalen Code KEINE Kommentare — der Plan-Snippet-Kommentar oben in der Code-Block-Vorschau ist Spec-Doku für den Implementierer, nicht im Code, conventions §2):

```ts
const itemSchema = [
  { name: 'name', selector: { text: {} } },
  // ...
];
```

(`id`-Feld absichtlich nicht im Schema. Begründung dokumentiert in Spec §3.1 und im Commit-Body — Code selbst bleibt ohne WHAT-Kommentar.)

- [ ] **Step 2: Battery-Schema (Zeilen 104 + 125) — `id`-Feld in beiden Mode-Schemas entfernen**

Suche beide `itemSchema`-Definitionen für split-mode (Zeile 104) und signed-mode (Zeile 125). Entferne in beiden den ersten Eintrag `{ name: 'id', selector: { text: {} }, required: true },`.

- [ ] **Step 3: Solar-Handler auf Merge-Pattern umstellen (Zeile 54)**

Aktuell (Zeile 54):

```ts
@value-changed=${(e: CustomEvent) => h.onItemChange(i, e.detail.value as SolarConfig)}
```

Neu (analog Battery-Section Zeilen 148-160):

```ts
@value-changed=${(e: CustomEvent) => {
  const v = e.detail.value as Partial<SolarConfig>;
  h.onItemChange(i, { ...item, ...v } as SolarConfig);
}}
```

**Wichtig:** Battery-Section-Handler in Zeilen 148-160 wird NICHT angefasst — er hat das Merge-Pattern bereits.

- [ ] **Step 4: Pairing-Dropdown-Fallback (Zeile 174) anpassen**

Aktuell:

```ts
${solar.map(
  (s) => html`
    <option value=${s.id} ?selected=${item.charged_by === s.id}>
      ${s.name ?? s.id}
    </option>
  `,
)}
```

Neu:

```ts
${solar.map(
  (s) => html`
    <option value=${s.id} ?selected=${item.charged_by === s.id}>
      ${s.name ?? `${DE.nodes.solar} ${s.id}`}
    </option>
  `,
)}
```

(Nur die Fallback-Zeile ändert sich. Wrapper-Struktur `<select>`, `<label>`, Error-Span unverändert.)

`DE.nodes.solar` ist bereits importiert (`import { DE } from './i18n/de';` — verifizieren, dass `DE` schon importiert ist).

- [ ] **Step 5: Tests grün**

```bash
pnpm test src/editor-list-sections.test.ts
```

Erwartet: **alle 3 Tests grün**.

- [ ] **Step 6: `pnpm check` komplett**

```bash
pnpm check
```

Erwartet: lint + typecheck + alle Tests grün.

- [ ] **Step 7: Commit Phase 4**

```bash
git add src/editor-list-sections.ts src/editor-list-sections.test.ts
git commit -m "$(cat <<'EOF'
refactor(editor): remove id-field from solar/battery schemas + add merge-pattern

Spec 2026-05-13 §3.1: id-Feld aus Solar- und Battery-itemSchema entfernt
(Editor zeigt es nicht mehr; bleibt im data-Objekt für ha-form damit es
beim value-changed nicht verloren geht — Solar-Handler bekommt Merge-
Pattern analog Battery, dessen Handler unverändert bleibt).

Pairing-Dropdown-Fallback auf ${DE.nodes.solar} ${s.id} → "Solar pv1"
konsistent mit nodeName-Output in node-renderer.ts:226. User sieht im
Editor-Dropdown identischen Text wie auf der Card.

Bewusste UX-Änderung: Editor-Feldreihenfolge ändert sich von
id,name,power,icon → name,power,icon (besser, name first). Im README-
Changelog (Phase 8) dokumentiert.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Phase 5 — Sandbox-Wire-up + Demo-Szenarien (Commit 6)

**Commit-Vorlage:**

```
feat(preview): wire ha-icon-stub into build-preview + add icon demo scenarios

Spec 2026-05-13 §3.5: scripts/build-preview.mjs previewSrc-Template um
registerHaIconStub()-Import erweitert (allererste Zeilen, vor scenarios-
Import). Sandbox rendert ha-icon jetzt mit echten MDI-Paths aus @mdi/js.

examples/preview-mocks.ts: zwei neue Szenarien für visuelle Verifikation:
- Custom-Icon-Demo (consumer.icon: 'mdi:heat-pump')
- Area-Icon-Demo (hass.areas['wohnzimmer'].icon: 'mdi:sofa' mit by_area-grouping)

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
```

> **Standing-Reminder Phase 5:** `examples/preview.html` wird NICHT geändert — sie lädt nur die fertigen `.js`-Files. Der Stub wird als TypeScript-Quelle in den Preview-Bundle gerollt via `scripts/build-preview.mjs`.

### Task 5.1: `scripts/build-preview.mjs` erweitern

**Files:**

- Modify: `scripts/build-preview.mjs`

- [ ] **Step 1: `previewSrc`-Template-String erweitern (Zeile 8)**

Aktueller Stand `scripts/build-preview.mjs:8`:

```js
const previewSrc = `
import { scenarios, buildMockHass } from '../../examples/preview-mocks';

const card = document.getElementById('card') as HTMLElement & {
  setConfig: (c: unknown) => void;
  hass: unknown;
};
// ...
`;
```

Neu — zwei neue Zeilen als ALLERERSTE Zeilen (vor allen bestehenden Imports):

```js
const previewSrc = `
import { registerHaIconStub } from '../../examples/lib/ha-icon-stub';
registerHaIconStub();
import { scenarios, buildMockHass } from '../../examples/preview-mocks';

const card = document.getElementById('card') as HTMLElement & {
  setConfig: (c: unknown) => void;
  hass: unknown;
};
// ...
`;
```

(Die bestehende erste Zeile `import { scenarios, ... }` bleibt unverändert, nur die zwei neuen Zeilen davor.)

- [ ] **Step 2: Verifikation — Preview-Build läuft**

```bash
pnpm build
node scripts/build-preview.mjs --no-serve
```

Erwartet: `Preview built: dist/preview/preview.html` ohne Fehler. Generierte `dist/preview/_preview-entry.ts` enthält den neuen Import.

```bash
head -5 dist/preview/_preview-entry.ts
```

Erwartet: erste drei Zeilen sind die Stub-Imports.

- [ ] **Step 3: KEIN Commit jetzt (gemeinsam mit Task 5.2)**

---

### Task 5.2: `examples/preview-mocks.ts` — Demo-Szenarien hinzufügen

**Files:**

- Modify: `examples/preview-mocks.ts`

- [ ] **Step 1: Custom-Icon-Demo-Szenario hinzufügen**

Im `scenarios: MockScenario[]`-Array ein neues Szenario hinzufügen (am Ende vor dem schließenden `]`):

```ts
{
  name: 'Icon-Demo · Custom mdi:heat-pump auf Verbraucher',
  emoji: '🎨',
  config: {
    ...baseConfig(),
    consumers: [
      { name: 'Wärmepumpe', power: 'sensor.heatpump', icon: 'mdi:heat-pump' },
      { name: 'Wallbox', power: 'sensor.wallbox', icon: 'mdi:ev-station' },
      { name: 'Herd', power: 'sensor.stove', icon: 'mdi:stove' },
    ],
  },
  hassStates: {
    'sensor.s_dach': { state: '2400', attributes: wAttrs },
    'sensor.s_balkon': { state: '600', attributes: wAttrs },
    'sensor.b_dach_soc': { state: '65', attributes: pctAttrs },
    'sensor.b_dach_power': { state: '300', attributes: wAttrs },
    'sensor.b_balkon_soc': { state: '40', attributes: pctAttrs },
    'sensor.b_balkon_power': { state: '100', attributes: wAttrs },
    'sensor.grid_power': { state: '-800', attributes: wAttrs },
    'sensor.heatpump': { state: '600', attributes: wAttrs },
    'sensor.wallbox': { state: '0', attributes: wAttrs },
    'sensor.stove': { state: '200', attributes: wAttrs },
  },
},
```

- [ ] **Step 2: Area-Icon-Demo-Szenario hinzufügen**

Direkt danach noch ein Szenario mit `consumer_grouping: 'by_area'` und HA-Area-Registry-Mock:

```ts
{
  name: 'Icon-Demo · Area-Icons via by_area-Grouping',
  emoji: '🏠',
  config: {
    ...baseConfig(),
    consumers: [
      { name: 'Wärmepumpe', power: 'sensor.heatpump' },
      { name: 'Wallbox', power: 'sensor.wallbox' },
      { name: 'Herd', power: 'sensor.stove' },
    ],
    display: {
      ...baseConfig().display,
      consumer_grouping: 'by_area',
    },
  },
  hassStates: {
    'sensor.s_dach': { state: '1800', attributes: wAttrs },
    'sensor.s_balkon': { state: '400', attributes: wAttrs },
    'sensor.b_dach_soc': { state: '55', attributes: pctAttrs },
    'sensor.b_dach_power': { state: '0', attributes: wAttrs },
    'sensor.b_balkon_soc': { state: '40', attributes: pctAttrs },
    'sensor.b_balkon_power': { state: '0', attributes: wAttrs },
    'sensor.grid_power': { state: '0', attributes: wAttrs },
    'sensor.heatpump': { state: '500', attributes: wAttrs },
    'sensor.wallbox': { state: '0', attributes: wAttrs },
    'sensor.stove': { state: '200', attributes: wAttrs },
  },
  entities: {
    'sensor.heatpump': { area_id: 'keller' },
    'sensor.wallbox': { area_id: 'garage' },
    'sensor.stove': { area_id: 'kueche' },
  },
  areas: {
    keller: { area_id: 'keller', name: 'Keller', icon: 'mdi:home-floor-b' },
    garage: { area_id: 'garage', name: 'Garage', icon: 'mdi:garage' },
    kueche: { area_id: 'kueche', name: 'Küche', icon: 'mdi:stove' },
  },
},
```

- [ ] **Step 3: Verifikation — Sandbox baut + Szenarien laden**

```bash
node scripts/build-preview.mjs --no-serve
```

Erwartet: erfolgreicher Build. (Manuelle Sandbox-Verifikation kommt in Phase 6 Task 6.4.)

- [ ] **Step 4: Lint + Typecheck**

```bash
pnpm lint
pnpm typecheck
```

Erwartet: grün.

- [ ] **Step 5: Commit Phase 5**

```bash
git add scripts/build-preview.mjs examples/preview-mocks.ts
git commit -m "$(cat <<'EOF'
feat(preview): wire ha-icon-stub into build-preview + add icon demo scenarios

Spec 2026-05-13 §3.5 + Plan-Phase 5: scripts/build-preview.mjs
previewSrc-Template um registerHaIconStub()-Import erweitert (allererste
Zeilen, vor scenarios-Import). Sandbox rendert ha-icon jetzt mit echten
MDI-Paths aus @mdi/js.

examples/preview-mocks.ts: zwei neue Szenarien für visuelle Verifikation
- Icon-Demo · Custom mdi:heat-pump (consumer.icon-Feld funktioniert)
- Icon-Demo · Area-Icons via by_area-Grouping (mdi:home-floor-b,
  mdi:garage, mdi:stove als Area-Icons aus hass.areas-Registry)

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Phase 6 — Final-Verification (kein Commit — Verifikation)

> **Standing-Reminder Phase 6:** Diese Phase produziert **keine Code-Änderung**, sondern verifiziert dass alle Erfolgs-Kriterien aus Spec §11 erfüllt sind. Bei Fail: zurück zur entsprechenden Phase.

### Task 6.1: `pnpm check` grün — komplettes CI-Gate

- [ ] **Step 1: pnpm check ausführen**

```bash
pnpm check
```

Erwartet: lint + typecheck + alle Tests grün.

- [ ] **Step 2: Bei Fail — Phase je nach Modul:**
  - Lint-Fehler in `src/render/icon.ts` → zurück zu Phase 2
  - Lint-Fehler in `src/render/node-renderer.ts` oder `flow-renderer.ts` → zurück zu Phase 3
  - Test-Fail in `editor-list-sections.test.ts` → zurück zu Phase 4
  - ESLint `no-restricted-imports` triggert für `@mdi/js` in `src/` → BUG, gehört nicht da hin

---

### Task 6.2: `pnpm smoke` verifizieren — Bundle lädt in happy-dom

- [ ] **Step 1: Build + Smoke**

```bash
pnpm build
pnpm smoke
```

Erwartet: alle Smoke-Assertions grün:

```
✓ custom-energy-flow-card registered
✓ custom-energy-flow-card-editor registered
✓ customCards entry pushed (custom:custom-energy-flow-card)
✓ setConfig(stub) accepted
✓ setConfig(realistic) accepted
```

- [ ] **Step 2: Bei Fail — Wahrscheinliche Ursache: `<ha-icon>` im Bundle wird gerendert**

happy-dom in `scripts/smoke-test.mjs` registriert nur `ha-card`, nicht `ha-icon`. Falls Render-Pfad an `ha-icon` scheitert:

```js
// In scripts/smoke-test.mjs nach `window.customElements.define('ha-card', ...)` ergänzen:
window.customElements.define('ha-icon', class extends window.HTMLElement {});
```

(Diese Anpassung ist Hotfix-Task; vorzugsweise NICHT nötig, weil happy-dom unbekannte Elemente toleriert. Verifizieren.)

---

### Task 6.3: `pnpm build:analyze` — Bundle ≤ 60 kB, kein `@mdi/js`

- [ ] **Step 1: Analyze-Build**

```bash
pnpm build:analyze
```

Erwartet: öffnet (oder generiert) Visualizer-Report. Verifiziere visuell:

- `dist/custom-energy-flow-card.js` ≤ 60 kB minified
- **Kein** `@mdi/js`-Eintrag im Bundle (ESLint-Restriction hat das verhindert)

- [ ] **Step 2: Bundle-Größe konkret messen**

```bash
ls -lh dist/custom-energy-flow-card.js
```

Erwartet: ≤ 60 kB. Bei Überschreitung: erste Verdächtige: `@mdi/js` durchgerutscht (sollte aber blocked sein).

---

### Task 6.4: Sandbox + manuelle Verifikation

- [ ] **Step 1: Preview-Server starten**

```bash
pnpm preview
```

Öffne `http://localhost:<port>/preview.html` im Browser.

- [ ] **Step 2: Alle Default-Szenarien durchklicken**

Erwartet:

- Alle Default-Knoten zeigen MDI-Icons (Solar-power, Battery, Transmission-tower, Home, Power-plug) statt Emojis
- Icons sind **farbig** (Knoten-Stroke-Farbe via `currentColor`) — bewusste visuelle Diff (Spec §3.3)
- Diagnostics-Icon (gelber Badge top-right) bei Engine-Warnings: zeigt `mdi:alert-circle-outline` statt `!`
- Pairing-Defizit-Szenario: Diagnostics-Icon erscheint korrekt

- [ ] **Step 3: Neue Icon-Demo-Szenarien (aus Phase 5) verifizieren**

- **Icon-Demo · Custom mdi:heat-pump:** Wärmepumpe-Verbraucher zeigt Heat-Pump-Icon, Wallbox EV-Station, Herd Stove
- **Icon-Demo · Area-Icons via by_area-Grouping:** drei Gruppen-Knoten mit Area-Icons (Keller, Garage, Küche) statt Default-Power-Plug

- [ ] **Step 4: Spike-Sandbox (aus Phase 0) re-verifizieren als Regression-Schutz**

Öffne `http://localhost:<port>/preview-spike-haicon.html` (wurde in Phase 0 angelegt).

Erwartet: alle Spike-Assertions weiter grün (Browser-Console sauber).

- [ ] **Step 5: Bei Visual-Issues (z. B. Icon zu klein/groß)** — `NODE_ICON_BOX`-Werte in `src/render/icon.ts` justieren (Datenänderung in Phase 2-Code, neuer Commit nötig).

---

## Phase 7 — Doku-Updates (Commit 7)

**Commit-Vorlage:**

```
docs(specs,adr,architecture): finalize ADR-0020 + sync main spec + cross-references

Plan-Phase 7: ADR-0020 von draft → accepted (Renderer-Migration grün
nach Phase 3, Sandbox-Verifikation grün nach Phase 6). Hauptspec
§3.2/§5.3/§7/§9/§5.13 auf ha-icon-Strategie aktualisiert. architecture.md
§2 Layer-Tabelle render/-Aufgabenbeschreibung um "Icon-Rendering"
erweitert, §4 ADR-Tabelle um 0020. ADR-0016 1-Zeilen-Cross-Reference
auf ADR-0020 (Area-Icon-Rendering).

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
```

> **Standing-Reminder Phase 7:** conventions §12 Doku-Pflicht für neuen ADR: ADR-File + ADR-Index + architecture.md §4 — alle drei in dieser Phase abdecken.

### Task 7.1: Hauptspec aktualisieren

**Files:**

- Modify: `docs/specs/2026-05-10-custom-energy-flow-card-design.md`

- [ ] **Step 1: §3.2 Default-Icons-Tabelle bestätigen** (Werte unverändert, Tabelle wird jetzt tatsächlich Quelle der Wahrheit — kein Edit nötig, aber als Stand verifizieren)

- [ ] **Step 2: §5.3 Icon-Rendering — Plan inline-`<path>`-Map verwerfen**

Suche Abschnitt §5.3 "Icon-Rendering" (Zeile ~1011). Ersetze:

Aktuell:

```
**Icon-Rendering:** für v1.0 **MDI-Icons als inline SVG-`<path>`**, ausgeliefert
via `mdi-paths.ts`-Map mit den ~10 verwendeten Icon-Paths. Falls in einer
Frühphase Boilerplate stört, ist Emoji-Fallback akzeptabel (siehe §9).
```

Neu:

```
**Icon-Rendering:** für v1.x **MDI-Icons via `<ha-icon>` in `<foreignObject>`**
(HA-globales Custom Element, deckt User-konfigurierte und Area-Icons dynamisch
ab). Implementation in `src/render/icon.ts` als Single-Source. Strategie-Wahl
und Begründung siehe [ADR-0020](../adr/0020-ha-icon-via-foreignobject.md).
Inline-`<path>`-Map (`mdi-paths.ts`) wurde verworfen — Begründung in ADR-0020.
```

- [ ] **Step 3: §7 Diagnostics-Icon aktualisieren**

Suche das `mdi:alert-circle-outline`-Erwähnung (Zeile ~1284). Stelle sicher, dass dort steht: "Diagnose-Icon: `mdi:alert-circle-outline` (Subspec 2026-05-13 implementiert)" oder ähnlich klare Markierung als „umgesetzt".

- [ ] **Step 4: §9 "Offene Punkte" — MDI-Icon-Rendering-Eintrag entfernen**

Zeile ~1750. Entferne:

```
- **MDI-Icon-Rendering.** Plan: inline `<path>`-Map in `mdi-paths.ts`. Falls in
  der Implementation Pflegeaufwand zu hoch wird, Emoji-Fallback akzeptabel.
```

(Punkt wurde durch Subspec 2026-05-13 + ADR-0020 gelöst.)

- [ ] **Step 5: §5.13 Card-Mod-Hooks um `::part(node-icon)` erweitern**

Falls §5.13 existiert (Card-Mod-Hooks-Sektion): neuen Bullet-Point hinzufügen:

```
- `::part(node-icon)` — Icon-Element (foreignObject mit ha-icon). Card-Mod-User
  können Icon-Farbe via `color:`-CSS oder Icon-Style überschreiben.
```

Falls §5.13 noch nicht existiert: ergänzen wo Card-Mod thematisch passt (z. B. nach §5.12).

---

### Task 7.2: `docs/architecture.md` — §2 Layer-Tabelle + §4 ADR-Tabelle

**Files:**

- Modify: `docs/architecture.md`

- [ ] **Step 1: §2 Layer-Tabelle — `render/`-Aufgaben erweitern**

Suche die Layer-Tabelle (Zeile ~58-67). Aktuell:

```
| **`render/`**   | SVG-Rendering, CSS-Animation, `battery-ring`                                  | `util/*`, `engine/types`, `i18n/*`, Lit | HA, Engine-Logik               |
```

Neu:

```
| **`render/`**   | SVG-Rendering, CSS-Animation, `battery-ring`, Icon-Rendering (`icon.ts`)      | `util/*`, `engine/types`, `i18n/*`, Lit | HA, Engine-Logik               |
```

- [ ] **Step 2: §4 ADR-Tabelle — Zeile für ADR-0020 einfügen**

Suche die ADR-Tabelle (endet heute mit ADR-0019, Zeile ~121). Füge nach 0019 eine neue Zeile hinzu:

```markdown
| [0020](./adr/0020-ha-icon-via-foreignobject.md) | `<ha-icon>` via `<foreignObject>` statt inline `mdi-paths.ts` | Dynamische User-/Area-Icons + null Wartungslast (Subspec 2026-05-13) |
```

---

### Task 7.3: `docs/adr/README.md` — Status von 0020 auf accepted

**Files:**

- Modify: `docs/adr/README.md`

- [ ] **Step 1: Status-Update**

Suche die ADR-0020-Zeile (in Phase 0 Task 0.2 mit `draft` angelegt). Ändere `draft` → `accepted`.

---

### Task 7.4: `docs/adr/0016-ha-area-grouping.md` — Cross-Reference

**Files:**

- Modify: `docs/adr/0016-ha-area-grouping.md`

- [ ] **Step 1: 1-Zeilen-Cross-Reference im "Verlinkte Spec-Sektionen / Referenzen"-Abschnitt einfügen**

Falls dieser Abschnitt existiert: neuer Bullet-Point:

```
- [ADR-0020](./0020-ha-icon-via-foreignobject.md) — Area-Icon-Rendering via ha-icon (implementiert v1.x)
```

Falls noch kein Referenz-Abschnitt: nach der Entscheidungs-Sektion einen kurzen "Siehe auch:"-Block einfügen.

---

### Task 7.5: ADR-0020 von `draft` → `accepted` promoten

**Files:**

- Modify: `docs/adr/0020-ha-icon-via-foreignobject.md`

- [ ] **Step 1: Status-Update im ADR-Header**

```
- **Status:** accepted (Renderer-Migration grün nach Plan-Phase 3, Sandbox-Verifikation grün nach Plan-Phase 6)
```

(Vorher: `draft (promote zu accepted nach …)`.)

- [ ] **Step 2: Verifikation**

```bash
pnpm check
```

Erwartet: grün (reine Doku-Änderung, kein Code-Impact).

- [ ] **Step 3: Commit Phase 7**

```bash
git add docs/specs/2026-05-10-custom-energy-flow-card-design.md docs/architecture.md docs/adr/README.md docs/adr/0016-ha-area-grouping.md docs/adr/0020-ha-icon-via-foreignobject.md
git commit -m "$(cat <<'EOF'
docs(specs,adr,architecture): finalize ADR-0020 + sync main spec + cross-references

Plan-Phase 7: ADR-0020 von draft → accepted (Renderer-Migration grün
nach Phase 3, Sandbox-Verifikation grün nach Phase 6). Hauptspec
§3.2/§5.3/§7/§9/§5.13 auf ha-icon-Strategie aktualisiert. architecture.md
§2 Layer-Tabelle render/-Aufgabenbeschreibung um "Icon-Rendering"
erweitert, §4 ADR-Tabelle um 0020. ADR-0016 1-Zeilen-Cross-Reference
auf ADR-0020 (Area-Icon-Rendering).

Conventions §12 Doku-Pflicht erfüllt: ADR-File + ADR-Index +
architecture.md §4 alle drei aktualisiert.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Phase 8 — README + Screenshots (Commit 8)

**Commit-Vorlage:**

```
docs(readme): add changelog for MDI icon rendering + regenerate screenshots

Plan-Phase 8: README Changelog dokumentiert MDI-Icon-Rendering (Editor +
Card), Area-Icon-Rendering im by_area-Mode, Editor-Feldreihenfolge-
Änderung (name first statt id), visuelle Diff (Icons farbig). Screenshots
in docs/screenshots/ regeneriert — zeigen jetzt echte MDI-Icons statt
Emoji-Defaults.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
```

> **Standing-Reminder Phase 8:** README-Update ist Pflicht bei User-facing-Verhalten (conventions §12). Screenshots sind Pflicht, nicht optional — README zeigt sonst veraltete Optik.

### Task 8.1: `README.md` Changelog-Eintrag

**Files:**

- Modify: `README.md`

- [ ] **Step 1: Neuen Changelog-Eintrag oben in der Changelog-Sektion**

```markdown
## [v1.x — Datum einsetzen] — MDI-Icon-Rendering + Editor-ID-Cleanup

### Neu

- **MDI-Icons werden ab v1.x gerendert.** Konfigurierte `icon: mdi:*`-Werte
  in Solar/Battery/Verbraucher zeigen jetzt das gewählte Icon (vorher nur
  Default-Emojis). Area-Icons aus HA werden im `consumer_grouping: 'by_area'`-
  Mode automatisch verwendet.
- **Diagnose-Icon** (gelber Badge top-right bei Engine-Warnings) zeigt jetzt
  `mdi:alert-circle-outline` statt `!`.

### Geändert

- **Editor-Feldreihenfolge:** `id` ist nicht mehr editierbar (wird auto-
  generiert). Solar- und Battery-Einträge zeigen jetzt zuerst `Name`, dann
  Sensor-Felder, dann `Icon`. Für User mit Muskelgedächtnis merklich, aber
  besser (Name first).
- **Pairing-Dropdown** (welche PV lädt diesen Akku?) zeigt `Solar pv1` statt
  `pv1` bei unbenannten PV-Anlagen — konsistent mit der Card-Anzeige.
- **Visuelle Diff:** Knoten-Icons werden jetzt in der Knoten-Farbe gerendert
  (Solar-Gelb, Battery-Grün usw.) statt monochrom. Optionaler card-mod-Hook
  via `::part(node-icon)`.

### Intern

- Neuer ADR-0020 dokumentiert die Strategie-Wahl (ha-icon via foreignObject
  statt inline mdi-paths).
```

- [ ] **Step 2: KEIN Commit jetzt (gemeinsam mit Task 8.2)**

---

### Task 8.2: Screenshots regenerieren

**Files:**

- Modify: `docs/screenshots/individual-consumers.png`
- Modify: `docs/screenshots/by-area-grouping.png`

- [ ] **Step 1: Preview starten**

```bash
pnpm preview
```

Browser öffnen (`localhost:<port>/preview.html`).

- [ ] **Step 2: `individual-consumers.png` regenerieren**

Wähle das passende Szenario („Sonniger Tag · Akkus laden · Überschuss → Netz" oder ähnliches Default-Szenario). Browser-Screenshot vom `.preview-host`-Bereich aufnehmen. Speichere als `docs/screenshots/individual-consumers.png`.

- [ ] **Step 3: `by-area-grouping.png` regenerieren**

Wähle das „Icon-Demo · Area-Icons via by_area-Grouping"-Szenario aus Phase 5. Screenshot aufnehmen. Speichere als `docs/screenshots/by-area-grouping.png`.

- [ ] **Step 4: Optional `bug1.png` / `bug2.png` aufräumen (falls vorhanden)**

`docs/screenshots/bug1.png` und `bug2.png` waren zu Plan-Zeit ungetrackt im Working-Tree (`git status` Pre-Plan). Prüfen ob sie noch da sind und ob sie zur Doku gehören. Falls weder gehört noch in der README referenziert → `git rm` oder Working-Tree-Bereinigung. Falls schon weg: Step überspringen.

- [ ] **Step 5: Commit Phase 8 (Final-Commit)**

```bash
git add README.md docs/screenshots/individual-consumers.png docs/screenshots/by-area-grouping.png
git commit -m "$(cat <<'EOF'
docs(readme): add changelog for MDI icon rendering + regenerate screenshots

Plan-Phase 8: README Changelog dokumentiert MDI-Icon-Rendering (Editor +
Card), Area-Icon-Rendering im by_area-Mode, Editor-Feldreihenfolge-
Änderung (name first statt id), visuelle Diff (Icons farbig statt
monochrom). Screenshots in docs/screenshots/ regeneriert — zeigen jetzt
echte MDI-Icons statt Emoji-Defaults.

Implementation abgeschlossen — alle 19 Spec-Plan-Schritte aus
docs/specs/2026-05-13-icons-and-editor-ids.md v10 umgesetzt.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Self-Review-Checkliste (vor Plan-Abschluss — Hauptagent durchgeht)

- [ ] **Spec-Coverage** (Mapping):
  - Spec §0.0 14 Verbote → respektiert durch File-Structure-„NICHT anfassen" + Elements-NICHT-anfassen-Tabelle im Plan-Header
  - Spec §3.1 Editor-ID-Cleanup → Phase 4 (Task 4.1+4.2)
  - Spec §3.2 Icon-Modul → Phase 2 (Task 2.1+2.2)
  - Spec §3.3 node-renderer Migration → Phase 3 (Task 3.1)
  - Spec §3.4 flow-renderer Migration → Phase 3 (Task 3.2)
  - Spec §3.5 ha-icon-Stub → Phase 1 (Task 1.2)
  - Spec §3.6 Test-Setup → Phase 1 (Task 1.3)
  - Spec §3.7 ESLint Restriction → Phase 1 (Task 1.1)
  - Spec §3.8 Layer-Boundaries → impliziert durch File Structure
  - Spec §3.9 Code-Reuse-Tabelle → in Plan-Code-Snippets referenziert
  - Spec §6.1-6.5 Tests → TDD-First-Pattern in Phase 1 (1.2), 2 (2.1), 4 (4.1)
  - Spec §6.6 Coverage → vitest.config NICHT auf render/\*\* erweitert (Phase 1 Task 1.3)
  - Spec §7 Doku-Updates → Phase 7 (Task 7.1-7.5)
  - Spec §8 ADR-0020 → Phase 0 (Task 0.2 Draft) + Phase 7 (Task 7.5 Promote)
  - Spec §9.1 UX-Verhalten → README-Changelog (Phase 8 Task 8.1)
  - Spec §10 Risiken → Phase 0 Spike (Task 0.1) + Workaround-STOP-Condition
  - Spec §10.1 Lit-Namespace → Spike-Code in Task 0.1
  - Spec §11 Erfolgs-Kriterien → Phase 6 (Task 6.1-6.4)
  - Spec §12 19 Plan-Schritte → konsolidiert auf ~22 Plan-Tasks in 9 Phasen
- [ ] **Keine Placeholders** (`TBD`/`TODO`/„Similar to") — keiner im Plan
- [ ] **Type-Consistency:** `nodeIcon`, `diagnosticsIcon`, `iconNameToCamelCase`, `registerHaIconStub`, `HaIconStub`, `DEFAULT_MDI_ICONS`, `NODE_ICON_BOX`, `DIAGNOSTICS_ICON_BOX`, `DIAGNOSTICS_ICON_NAME` — alle konsistent über alle Tasks
- [ ] **Commit-Granularität:** 8 Commits = 8 Phasen (Phase 6 Verifikation ohne Commit). Eine Commit-Vorlage pro Phase.
- [ ] **Verifikations-Pipeline pro Phase:** `pnpm test` für TDD-Phasen 1/2/4; `pnpm check` vor jedem Commit; `pnpm build`/`build:analyze`/`smoke` in Phase 6; manuelle Sandbox in Phase 6.4.
- [ ] **Don't-Touch-Liste respektiert:** Elements-NICHT-anfassen-Tabelle im Header listet alle 13+ Files/Module aus Spec §0.4 + §0.2.
- [ ] **Code-Reuse-Tabelle genutzt:** `configEntryForNode` bleibt private (Task 3.1 Schritt 5), `colorFor`/`nodeColorRole` weiter genutzt (Task 3.1 Schritt 4), `DE.nodes.solar` (Task 4.2 Schritt 4), `validateConfig`/`fireConfigChanged` unverändert.
- [ ] **Anti-Patterns vermieden:** Kein inline-`<ha-icon>` außerhalb `icon.ts`, keine duplizierten Konstanten, kein `iconNameToCamelCase` in `src/`, keine hardcoded `mdi:*`-Strings im Renderer.
- [ ] **Standing-Reminder pro Phase:** Jede Phase-Sektion hat einen Standing-Reminder-Block.
- [ ] **TDD-Order:** Phase 1.2 (`iconNameToCamelCase`), 2.1→2.2 (`nodeIcon`), 4.1→4.2 (Editor) — alle Test-First mit Rot-Sanity-Check.
- [ ] **STOP-Conditions:** Task 0.1 (Spike-Fail), Task 1.2 Step 3 (Test grün der rot sein soll), Task 2.1 Step 2, Task 4.1 Step 2.
- [ ] **Framework-Quirks abgedeckt:**
  - Lit-css-Tag mit `unsafeCSS`: nicht relevant (kein neuer CSS-Block)
  - `shouldUpdate` vs `@property hasChanged`: nicht angefasst (card.ts unverändert)
  - `<foreignObject>` + Lit-`svg` + HTML-Namespace: Spike (Task 0.1) verifiziert
  - `noUncheckedIndexedAccess`: Task 1.2 Stub-Code mit `p[0] ?? ''`
  - `customElements`-Guard: Task 1.2 Step 4 (`typeof customElements === 'undefined'`)
- [ ] **Build-Pipeline explizit:** `.eslintrc.cjs` (Task 1.1), `vitest.config.ts` (Task 1.3), `scripts/build-preview.mjs` (Task 5.1) — alle mit konkretem Diff + additiver Markierung.
- [ ] **Doku-Pflicht (conventions §12):** ADR-0020 (Phase 0 + Phase 7), ADR-Index (Phase 0 + Phase 7.3), architecture.md §4 (Phase 7.2), ADR-0016 Cross-Ref (Phase 7.4), README (Phase 8.1).

---

## Out of Scope (nicht Teil dieses Plans)

- **Editor-Banner für `by_area`-Mode** ("In diesem Mode wird das Area-Icon verwendet") — Spec §9.2, v1.x-Kandidat.
- **`computeLabel` für Icon-Feld** ("Icon" statt "icon") — Spec §9.2 (Non-Goal: keine i18n-Erweiterung).
- **`nodeName`-Refactor auf Index-basierten Fallback** — User-Decision in Spec v10 war Option B (Editor zeigt `Solar pv1`, kein nodeName-Eingriff).
- **`@mdi/js` curated subset** statt namespace-import — Dev-Build-Optimization, v1.x falls dev-build > 10s.
- **Card-Mod tiefere Hooks** (z. B. ha-icon-Shadow-DOM erreichbar machen) — Spec §9.2, akzeptiert weil `currentColor` durchschlägt.
- **Adaptive Icon-Größen je Container-Width** — Out-of-Scope, NODE_ICON_BOX fest.

---

## Notizen für den Implementierer

- **Spike (Phase 0 Task 0.1) ist kritisch.** Wenn Lit's `svg`-Template mit `<foreignObject>` + HTML-`<ha-icon>` nicht funktioniert, ist die gesamte Spec auf Workaround `unsafeSVG` aus Spec §10.1 anzupassen — BEVOR Phase 1 startet. Nicht "ich probiere mal und debug später".
- **TDD-Sanity-Check in Tasks 1.2 / 2.1 / 4.1:** Wenn ein Test grün bleibt, der eigentlich rot sein sollte (z. B. weil `iconNameToCamelCase` zufällig immer den richtigen Wert liefert), Test-Bypass-Verdacht. STOP und mit User klären, nicht einfach weiter.
- **Visuelle Diff in Phase 3** (Icons farbig statt monochrom) ist bewusst und im Changelog dokumentiert. Wenn Sandbox-User irritiert wirken: das ist die Antwort.
- **`configEntryForNode` darf nicht in `icon.ts` wandern.** Sub-Agent-Findings dazu kamen in der Spec-Review oft hoch — die Logik braucht `RenderContext`, gehört in `node-renderer.ts` (siehe Spec §3.2 Architektur-Prinzipien).
- **Pairing-Fallback "Solar pv1":** Wenn das nach User-Feedback hässlich wirkt, ist das eine v1.x-Folge-Subspec (nodeName aufs Index-Pattern umstellen). Im Scope dieser Spec bewusst Option B (kein nodeName-Eingriff) gewählt.
- **Screenshots (Phase 8 Task 8.2) sind Pflicht.** README zeigt sonst veraltete Optik mit Emoji-Defaults.
- **ADR-0020 Status `draft` → `accepted`** ist ein bewusst geteilter Schritt. Draft wird in Phase 0 angelegt (bevor Spike läuft, falls Workaround nötig wird). Accepted erst in Phase 7, NACHDEM Renderer-Migration + Sandbox-Verifikation grün sind.
- **Phase 6 ist kein Commit-Phase.** Wenn dort etwas rot ist, zurück zur entsprechenden Phase, nicht "ich fixe das im Final-Commit".
- **`pnpm preview` braucht einen Browser** — wenn kein Browser-Zugriff in der Implementations-Session: manuelle Verifikation (Phase 6 Task 6.4) muss explizit verschoben werden mit Dokumentation, wann sie nachgeholt wird.
