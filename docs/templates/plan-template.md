# Plan-Template

> **Vor Nutzung:** Diese Vorlage füllen, **`docs/templates/plan-review-checklist.md` durcharbeiten** (mit Sub-Agent-Iterations-Loop), dann committen als `docs/plans/YYYY-MM-DD-<topic>.md`.
>
> **Goldstandard-Beispiel im Repo:** `docs/plans/2026-05-12-aspect-ratio-redesign.md` (1 Iteration nötig). Vergleich: `docs/plans/2026-05-10-v1-implementation-plan.md` brauchte 7 Iterationen — Lehren daraus sind in diese Vorlage eingebaut.
>
> **Erinnerung:** Pläne scheitern an mehr Punkten als Specs. Bekannte Pattern aus v1.0-Iterationen: Spec-Plan-Drift (Plan weiß manchmal mehr als Spec), Layer-Boundary-Updates (ESLint zones erweitern legitim), Framework-Quirks (Lit-css-Tag, hasChanged-this-Binding, svg+foreignObject-namespace), Build-Pipeline-Details (tsconfig, smoke-test-Anpassung), TDD-Order (Tests vor Code).

---

# [Topic] Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use `superpowers:subagent-driven-development` (recommended) or `superpowers:executing-plans` to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** [1 Satz aus Spec §0 Zusammenfassung]

**Architecture:** [2–3 Sätze aus Spec §0.2 Architektur-Kontext — welche Layer berührt, welche unangetastet, Layer-Boundary-Erzwingung via ESLint]

**Tech Stack:** TypeScript [Version] strict, Lit [Version], Rollup, Vitest, ESLint, pnpm. [Plus relevante Test-Env (happy-dom für DOM-Tests)]. Bundle ≤ [N] kB, `card.ts` ≤ [N] LOC.

**Verbindliche Lese-Quellen (vor Start):**

- Spec: `docs/specs/YYYY-MM-DD-<topic>.md` — **Single-Source aller Constraints, Werte, Begründungen**
- `CLAUDE.md` — Projekt-Schnellreferenz, Regeln 1-10, Workflow
- `docs/conventions.md` — Code-Stil, Naming, Commit-Konventionen (Anti-Patterns §11, Doku-Pflicht §12, Dependencies §13)
- `docs/architecture.md` — Layer-Architektur, Datenfluss
- ADRs aus Spec §0.1 referenziert

**Konzepte (verbindlich, siehe Spec für Details):**

- **Datenfluss-Pipeline** (Spec §0.3): [welcher Pipeline-Schritt wird geändert]
- **Lit-Lifecycle** (Spec §0.X, falls relevant): Side-Effects in `willUpdate`, niemals in `render`
- **Engine-Warnings statt Throws** (conventions §6.1): bei Daten-Inkonsistenz `EngineWarning` produzieren, niemals `throw`
- **Code-Reuse-Tabelle** (Spec §3.X): [N] vorhandene Helper — VERBINDLICH wiederverwenden statt neu zu bauen
- **Anti-Patterns** (Spec §3.X): [N] verbotene Muster — aktiv vermeiden

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
> - Pure Functions in `engine/` (ADR-0004)
> - Keine god-class in `card.ts` (≤ 200 LOC)
> - Single-Source `util/`-Aufrufe (ADR-0010)
> - Funktionale Iteration (`.map`/`.filter`/`.reduce` über `forEach + push`, conventions §1.6)
> - Conventional-Commit-Format (conventions §8)
> - Keine WHAT-Kommentare; Strings aus `i18n/de.ts` (conventions §2, §11.5)
> - **TDD-First** für `engine/`/`config/`/`util/`: Test rot, dann Code, dann grün
>
> **KPI-Snapshot-Pflicht (siehe `CLAUDE.md` „Code-Review — Workflow"):**
>
> - Vor erstem Task: `pnpm kpi:snapshot --label pre-<plan-id> --phase pre`
> - Nach letztem Task: `pnpm kpi:snapshot --label post-<plan-id> --phase post`
> - Code-Review-Workflow läuft danach VOR `finishing-a-development-branch`

**Elements NICHT anfassen** (aus Spec §0.4 Don't-Touch-Liste — 1:1 hier reproduzieren oder explizit referenzieren):

| Element    | Wo            | Warum             |
| ---------- | ------------- | ----------------- |
| [aus Spec] | `[file:line]` | [Spec-Begründung] |

**Phases:**

- Phase 0. **KPI-Pre-Snapshot + Playwright-Capture** (verbindlich, vor erstem Task)
- Phase 0. [Vorab-Gates: Spike, ADR-Anlage] ([N] tasks)
- Phase 1. [Foundation] ([N] tasks)
- Phase 2. [...] ([N] tasks)
- Phase 3. [Doku + Verifikation] ([N] tasks)
- Phase N+1. **KPI-Post-Snapshot + Code-Review-Workflow** (verbindlich, nach letztem Task)

(Phase-Numbering ist Beispiel — der konkrete Plan setzt eigene Nummern. Pre/Post-Snapshot-Schritte sind Pflicht für jeden Plan, der Code ändert; bei reinen Doku-Plänen optional.)

---

## File Structure (decomposed before tasks)

### Modified

| Datei              | Verantwortlichkeit  | Phase |
| ------------------ | ------------------- | ----- |
| `src/[layer]/x.ts` | [konkrete Änderung] | N     |

### Created

| Datei              | Verantwortlichkeit     | Phase |
| ------------------ | ---------------------- | ----- |
| `src/[layer]/y.ts` | [neues Modul, Aufgabe] | N     |

### NICHT anfassen (Spec §0.2 NICHT-berührte Layer)

- `src/engine/*` — [Begründung]
- `src/config/[file]` — [Begründung]
- (...)

### Build-Pipeline-Files (wichtig — oft übersehen)

| Datei                         | Art der Änderung                               | Phase |
| ----------------------------- | ---------------------------------------------- | ----- |
| `.eslintrc.cjs`               | [additive Regel? Layer-Zone erweitern?]        | N     |
| `vitest.config.ts`            | [setupFiles, environmentMatchGlobs erweitern?] | N     |
| `tsconfig.json` / `…preview…` | [include erweitern? Test-Files abdecken?]      | N     |
| `package.json`                | [neue DevDep mit Commit-Begründung?]           | N     |
| `scripts/build-preview.mjs`   | [konkrete Code-Stelle ändern?]                 | N     |
| `scripts/smoke-test.mjs`      | [Stub-Registrierung nötig?]                    | N     |

---

## Phase 0 — Vorab-Gates (falls Spec §10 hohe Risiken hat)

### Task 0.1: Spike (~30 min)

**Files:**

- Create: `[spike-file].html` (oder ähnlich, temporär in der Sandbox)

- [ ] **Step 1: Minimal-Reproduktion des Risikos aufbauen**

  ```ts
  // Konkreter Code, der das Risiko isoliert reproduziert
  ```

- [ ] **Step 2: Verifikations-Code im Spike**

  ```ts
  console.assert(/* konkrete Bedingung aus Spec §10.X */);
  ```

- [ ] **Step 3: STOP-Condition**

  Falls Verifikation fehlschlägt → Workaround aus Spec §10.X anwenden, ADR-0XXX entsprechend anpassen, dann hier weitermachen.

### Task 0.2: ADR-0XXX als Draft anlegen

[Pro Spec §8 ADR-Stub]

---

## Phase 1 — [Phasentitel] (Commit 1)

**Commit-Vorlage:**

```
<type>(<scope>): kurzer Titel im Imperativ

Body mit Begründung — was und WARUM.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
```

### Task 1.1: [TDD-Test-First wo möglich]

**Files:**

- Modify: `src/[layer]/x.test.ts`
- (oder Create: `src/[layer]/x.test.ts`)

- [ ] **Step 1: [konkrete Test-Erwartung schreiben]**

  ```ts
  it('test name', () => {
    expect(...).toBe(...);
  });
  ```

- [ ] **Step 2: [weitere Test-Cases]**

- [ ] **Step 3: Tests ausführen — MUSS rot sein**

  ```bash
  pnpm test src/[layer]/x.test.ts
  ```

  Erwartet: alle neuen Tests sind **rot**. Sanity-Check: wenn ein Test grün bleibt, der eigentlich rot sein sollte — Test-Bypass-Verdacht. **STOP**, melden, nicht weiter.

- [ ] **Step 4: KEIN Commit jetzt (Rot-State)**

### Task 1.2: [Code-Implementation]

**Files:**

- Modify: `src/[layer]/x.ts`

- [ ] **Step 1: [Konkreter Code-Change mit alt/neu-Diff]**

  ```ts
  // alt
  const foo = ...;

  // neu
  const foo = ...;
  ```

- [ ] **Step N: Tests grün**

  ```bash
  pnpm test src/[layer]/x.test.ts
  ```

### Task 1.N: Verifikation + Commit

- [ ] `pnpm check` (typecheck + lint + test) grün
- [ ] `git add [files]`
- [ ] `git commit` mit Commit-Vorlage aus Phase-Header

---

## Phase 2 — [Phasentitel] (Commit 2)

[Analog]

---

## Phase N — Doku-Updates + Verifikation (Commit N)

### Task N.1: Hauptspec aktualisieren

- [ ] §X.Y in `docs/specs/[hauptspec].md` anpassen ([konkreter Diff])

### Task N.2: architecture.md §2 + §4

- [ ] [Layer-Tabelle erweitern wenn nötig]
- [ ] [ADR-Tabelle: neuen ADR eintragen]

### Task N.3: ADR-Index

- [ ] `docs/adr/README.md` um neuen ADR erweitern

### Task N.4: Bestehende ADRs (Cross-Reference)

- [ ] [ADR-XXXX] um 1-Zeilen-Cross-Reference erweitern

### Task N.5: README + Changelog

- [ ] Changelog-Eintrag für [Version]
- [ ] Optional: Screenshots regenerieren (Plan-Schritt mit `pnpm preview`)

### Task N.6: Final-Verifikation

- [ ] `pnpm check` grün
- [ ] `pnpm build` produziert Bundle ≤ `BUNDLE_BUDGET_BYTES` aus `scripts/kpi.mjs:29` (aktuell `60 * 1024 = 61440` B = 60 KiB; **NICHT** dezimal 60.000) — Lesson 2026-05-15: „60 kB" in Plan-Texten kann zu Misinterpretation 60.000 vs 61.440 führen. Immer auf `scripts/kpi.mjs`-Konstante verweisen.
- [ ] `pnpm build:analyze` zeigt keine verbotenen Dependencies in `dist/`
- [ ] `pnpm smoke` grün
- [ ] LOC-Regression-Check: `wc -l src/[file]` < [vorher]
- [ ] Unverändert-Check: `git diff` zeigt keine Änderungen an Spec §0.0 verbotenen Files

### Task N.7: Final-Commit

```
<type>(scope): Conventional-Commit

Plan abgeschlossen. Alle [N] Tasks aus [M] Phasen umgesetzt.
Bundle: [X] kB. LOC: [Y].

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
```

---

## Self-Review-Checkliste (vor Plan-Abschluss — Hauptagent durchgeht)

- [ ] **Spec-Coverage:** jede Spec-Sektion hat einen Task (§1 → Task X.Y, §3.X → Task Z.W, …) — explizites Mapping
- [ ] **Spec-Plan-Alignment:** Plan widerspricht der Spec nirgends; falls Plan etwas richtiger weiß als Spec → Spec wird mit angepasst (nicht Plan zurückziehen)
- [ ] **Keine Placeholders** (`TBD`/`TODO`/`Similar-to`)
- [ ] **Type-Consistency:** alle TS-Referenzen sind konsistent (z. B. Funktions-Namen, Modul-Pfade identisch genannt)
- [ ] **Commit-Granularität:** entspricht Spec §X (1 Phase = 1 Commit, oder explizit anders)
- [ ] **Verifikations-Pipeline** pro Phase: typecheck → lint → test → coverage → check → build → preview → smoke
- [ ] **Don't-Touch-Liste** (Spec §0.4) respektiert: kein Task ändert eines der Elemente
- [ ] **Code-Reuse-Tabelle** (Spec §3.X) wird genutzt: konkrete Helper-Aufrufe statt eigener Implementation
- [ ] **Anti-Patterns** (Spec §3.X) aktiv vermieden: konkrete Beispiele in Tasks markiert ("nicht hardcoded …")
- [ ] **Standing-Reminder pro Phase:** Conventions/ADRs nochmal erwähnt (verhindert Drift bei langem Plan)
- [ ] **TDD-Order:** Tests vor Code wo TDD-Pflicht (engine/config/util)
- [ ] **STOP-Conditions:** jeder kritische Task hat eine STOP-Bedingung („wenn Test grün bleibt obwohl rot erwartet"). Lesson 2026-05-15: STOP-Aktionen, die einen Spec-Wert verändern (z. B. „Bei Grid-Überlauf Font reduzieren auf 13 statt 14"), sind ein legitimer **Plan-internal-Fix-Pfad**. Der entstehende Spec-Code-Drift MUSS als Lessons-Learned-Eintrag dokumentiert werden (Spec/Plan-Dokumente werden NICHT retroaktiv gepatcht).
- [ ] **Framework-Quirks** abgedeckt (siehe Plan-Review-Checkliste Phase J): Lit-css-Tag, shouldUpdate vs hasChanged, foreignObject-Namespace, customElements-Guard, noUncheckedIndexedAccess
- [ ] **Build-Pipeline** explizit: tsconfig/.eslintrc/vitest.config-Edits konkret, mit Zeile + Diff
- [ ] **Doku-Pflicht (conventions §12):** ADR + ADR-Index + architecture.md §4 (Pflicht bei neuem ADR); README bei User-facing Verhalten

---

## Out of Scope (nicht Teil dieses Plans)

[Aus Spec §9.2 + Plan-Granularität-Entscheidungen]

- [Item 1 mit Begründung warum nicht jetzt]
- [Item 2]

---

## Notizen für den Implementierer

- **TDD-Order in Task X.Y:** Erst Tests anpassen → rot. Wenn ein Test grün bleibt, der eigentlich rot sein sollte → Test-Bypass-Verdacht → STOP und mit User klären.
- **Spec-Plan-Drift:** Wenn beim Implementieren Spec-Detail X falsch wirkt, Spec-Update als Plan-Schritt einbauen, nicht ohne Spec-Update fortfahren.
- **Layer-Boundary-Erweiterung:** Wenn ein Task einen neuen Cross-Layer-Import braucht — ESLint zones in `.eslintrc.cjs` explizit erweitern, nicht heimlich umgehen. Eintrag begründen.
- **Framework-Quirks:** Bei Lit-CSS-Tag `unsafeCSS` für raw strings; bei `@property hasChanged` → stattdessen `shouldUpdate` (this-Binding); bei svg+foreignObject → Namespace-Check; bei Tests in Node-Env → `customElements`-Guard.
- **Screenshots:** Pflicht-Schritt, nicht optional. README zeigt sonst veraltete Optik.
- **Smoke-Tests:** Manuell wenn keine HA-Test-Instance verfügbar — dokumentieren und vor Production-Release nachholen.
