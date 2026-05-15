# Code-Review-Workflow Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use `superpowers:subagent-driven-development` (recommended) or `superpowers:executing-plans` to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Etabliere einen verbindlichen Post-Implementation-Code-Review-Workflow mit 6-Brillen-Sub-Agent-Pässen, Wartbarkeits-KPI-Skript (TS-Compiler-API), Pre/Post-Snapshots, Playwright-Two-Stage-Funktional-Verifikation, ADR-Check und Lessons-Learned-Hot-Pot — analog zu existierendem Spec-/Plan-Review-Workflow.

**Architecture:** Diese Implementation berührt **keinen** `src/`-Code. Sie legt an: `scripts/kpi.mjs` (KPI-Skript ~300–400 LOC, ESM mit TS-Compiler-API), `metrics/` (git-tracked Tracked-Dirs für History + Playwright-Artefakte), `docs/templates/code-review-checklist.md`, `docs/lessons-learned.md`, `docs/adr/0021-...md`. Sie editiert additiv: `CLAUDE.md`, `docs/adr/README.md`, `docs/architecture.md`, `docs/adr/0012-...md` (Cross-Ref), `docs/templates/plan-template.md`, `package.json` (Skripte + engines.node), `vitest.config.ts` (1-Liner Coverage-Reporter — USER-DECISION resolved). Layer-Boundaries via ESLint sind unbetroffen (kein `src/`-Edit).

**Tech Stack:** TypeScript 5.4 (als DevDep für TS-Compiler-API, kein neuer Dep), Node ≥ 20 LTS, ES Modules (.mjs), `node:fs`/`node:path`/`node:child_process` builtins, Vitest (für coverage-summary.json), Rollup (für Bundle-Bytes), pnpm 9. **Keine** neuen Runtime-Deps (ADR-0003). **Keine** neuen DevDeps. Skript-LOC-Limit 400 (Spec dokumentiert als Ausnahme zu conv §3 Default 250).

**Verbindliche Lese-Quellen (vor Start):**

- Spec: [`docs/specs/2026-05-15-code-review-workflow.md`](../specs/2026-05-15-code-review-workflow.md) — **Single-Source aller Constraints, Werte, Algorithmen, JSON-Schema, Threshold-Limits**
- `CLAUDE.md` — Projekt-Schnellreferenz, Regeln 1-10, Workflow für Spec/Plan/Implementation
- `docs/conventions.md` — Code-Stil §1, Comments-Policy §2, Datei-Größen §3, Imports §4, Tests §5, Logging §7, Commits §8, Anti-Patterns §11, Doku-Pflicht §12, Dependencies §13, Sprache §15
- `docs/architecture.md` — Layer-Tabelle §2, ADR-Tabelle §4
- ADRs aus Spec §0.1: ADR-0003 (No Runtime Deps), ADR-0010 (Single-Source-Util), ADR-0012 (Smoke-Test-Gate)
- Existierender Stil-Vorlagen für `.mjs`-Skripte: `scripts/smoke-test.mjs`, `scripts/build-preview.mjs`

**Konzepte (verbindlich, siehe Spec für Details):**

- **6-Brillen-Workflow** (Spec §3.7): Spec/Plan↔Code-Coverage → Architektur+ADRs+Conv → Wartbarkeits-KPIs → Test-Tiefe+TDD → UX+Funktional (Playwright) → Release-Readiness. Sequentiell, jeder Pass eine andere Brille.
- **5 Finding-Kategorien** (Spec §3.7 + §C.2 Brainstorming): `[AUTO-FIX]` inline / `[FIX-PLAN]` mini-Sub-Plan / `[USER-DECISION]` gebündelt / `[VERIFY-NEEDED]` Hauptagent prüft / `[LESSON-LEARNED]` appendet zu `docs/lessons-learned.md`.
- **Spec/Plan-Dokumente bleiben unangetastet** (Kern-Prinzip — Spec §0.0 #4 + §2.1). Lessons-Datei ist der einzige Sammelpunkt für Code-Review-Erkenntnisse; User entscheidet Promotion in conv.md / neue ADRs / Plan-Templates.
- **KPI-Lifecycle**: Pre-Snapshot direkt vor erstem Implementation-Task, Post-Snapshot direkt nach letztem. Delta = direkter Effekt einer Implementation.
- **Playwright-Two-Stage**: Hauptagent capturt Artefakte via MCP (Sub-Agents haben keinen MCP-Zugriff), Sub-Agent analysiert die Artefakt-JSON.
- **Code-Reuse-Tabelle** (Spec §3.6): `typescript` als TS-Compiler-API ist Tool-Use existierender DevDep — kein Bundle-Touch, keine ADR-Pflicht.
- **Anti-Patterns** aus Spec §3.6: keine Inline-Threshold-Werte im Sub-Agent-Prompt, keine Duplikate von LAYER_LOC_LIMITS, kein `ts.createProgram` pro-Datei (Performance), keine Hardcoded-Layer-Strings verstreut, Sub-Agent-Prompts dürfen NICHT 1:1 aus plan-review-checklist kopiert werden — sie müssen Code-Review-spezifisch formuliert sein.

**Standing Requirement für jeden Task** (Disziplin-Block, gilt durchgehend):

> 🛑 Jede Code-Zeile, die in dieser Plan-Datei als TypeScript/JS-Block steht, ist als Vorschlag zu verstehen, der **`docs/conventions.md`** und **alle in Spec §0.1 referenzierten ADRs** einhalten muss. Vor dem `git commit` jedes Tasks: **`pnpm check` läuft grün durch** (`lint + typecheck + test`). Diese Spec ändert keinen `src/`-Code, daher sind ESLint-Layer-Verstöße quasi-impossible, aber:
>
> - Conventional-Commit-Format zwingend (conv §8) — Scopes: `scripts`, `docs`, `chore`, `feat`, `test`
> - Spec-/Plan-Files unter `docs/specs/` und `docs/plans/` werden **NICHT** angefasst (Kern-Prinzip)
> - Keine WHAT-Kommentare; Lessons-Einträge auf Deutsch (conv §15)
> - Skript-Output prettier-stabil (`JSON.stringify(arr, null, 2) + '\n'`, UTF-8) — `.lintstagedrc.json` formatiert `*.json` mit prettier, sonst diff-Schleife
> - `metrics/`-Dir + Inhalte git-tracked; `.gitignore` darf sie nicht greifen

**Elements NICHT anfassen** (aus Spec §0.0 Verbots-Liste + §0.4 Don't-Touch):

| Element                                                                                   | Wo                                      | Warum                                                                                  |
| ----------------------------------------------------------------------------------------- | --------------------------------------- | -------------------------------------------------------------------------------------- |
| Gesamter `src/`-Tree                                                                      | `src/**`                                | Spec ändert keinen Source-Code; KPI-Skript LIEST nur                                   |
| `scripts/smoke-test.mjs`                                                                  | `scripts/smoke-test.mjs`                | ADR-0012-Gate unverändert; weiter ein eigener Pipeline-Schritt                         |
| `scripts/build-preview.mjs`                                                               | `scripts/build-preview.mjs`             | Sandbox-Server unverändert                                                             |
| `scripts/build-spike-haicon-bundle.mjs`                                                   | `scripts/build-spike-haicon-bundle.mjs` | Spike-Helper aus Subspec 2026-05-13; KPI-Skript darf ihn NICHT als Source einlesen     |
| `tsconfig.json`, `tsconfig.preview.json`                                                  | Root                                    | TS-Configs unverändert (KPI-Skript setzt eigene CompilerOptions in `ts.createProgram`) |
| `rollup.config.*`                                                                         | Root                                    | Build-Konfig unverändert                                                               |
| `.eslintrc.cjs`                                                                           | Root                                    | ESLint-Rules unverändert; KPI-Skript bleibt außerhalb lint-glob                        |
| `.husky/pre-commit`, `.lintstagedrc.json`                                                 | Root / `.husky/`                        | Pre-Commit-Hook unverändert                                                            |
| Bestehende Specs `docs/specs/*.md`                                                        | Verzeichnis                             | Spec-Files sind historisches Protokoll, retroaktiv ändern = Revisionismus              |
| Bestehende Pläne `docs/plans/*.md`                                                        | Verzeichnis                             | Pläne sind historisches Protokoll                                                      |
| Bestehende ADRs (außer 0012 Cross-Ref + Index)                                            | `docs/adr/*.md`                         | ADRs werden nicht retroaktiv geändert                                                  |
| `docs/templates/spec-template.md`, `spec-review-checklist.md`, `plan-review-checklist.md` | `docs/templates/`                       | Existierende Templates bleiben; nur `plan-template.md` wird erweitert                  |
| `examples/**`                                                                             | `examples/`                             | Sandbox-Files unverändert; Playwright-Pass 5 nutzt sie read-only                       |
| `README.md`                                                                               | Root                                    | Workflow ist Developer-Doku, kein User-facing-Change                                   |

**Phases:**

- Phase 0. ADR-0021 + ADR-Index + architecture.md §4 + Commit (4 tasks)
- Phase 1. Tracked-Dirs (`metrics/`, `metrics/playwright/`) + `.gitignore` verify + Commit (3 tasks)
- Phase 2. `scripts/kpi.mjs` inkrementell + `package.json` + `vitest.config.ts` + Commit (8 tasks)
- Phase 3. `docs/templates/code-review-checklist.md` + `docs/lessons-learned.md` + Commit (3 tasks)
- Phase 4. Cross-Reference in `docs/adr/0012-...md` + Commit (2 tasks)
- Phase 5. `CLAUDE.md` Workflow-Sektion + Doku-Karte + Implementation-Workflow-Erweiterung + `plan-template.md` + Commit (6 tasks)
- Phase 6. End-to-End-Verifikation + Initial-Baseline-Snapshot + Final-Commit (6 tasks)

**Total: 32 Tasks in 7 Phasen.**

**Erwartete Anzahl Commits:** 7 (einer pro Phase: 0, 1, 2, 3, 4, 5, 6).

---

## File Structure

### Created

| Datei                                                    | Verantwortlichkeit                                                                           | Phase |
| -------------------------------------------------------- | -------------------------------------------------------------------------------------------- | ----- |
| `docs/adr/0021-code-review-workflow-pre-release-gate.md` | Neuer ADR (Stub aus Spec §8 1:1)                                                             | 0     |
| `metrics/.gitkeep`                                       | Verzeichnis-Marker (git-tracked)                                                             | 1     |
| `metrics/kpi-history.json`                               | Initial `[]` (append-only KPI-Snapshot-Array)                                                | 1     |
| `metrics/playwright/.gitkeep`                            | Verzeichnis-Marker                                                                           | 1     |
| `scripts/kpi.mjs`                                        | KPI-Snapshot-CLI: ESM-Skript mit TS-Compiler-API für AST-Walks, History-Append, Delta-Report | 2     |
| `docs/templates/code-review-checklist.md`                | Self-Review-Phasen A–H + Phase Z mit 6 Sub-Agent-Pass-Prompts                                | 3     |
| `docs/lessons-learned.md`                                | Append-only Hot-Pot mit Header + Curation-Workflow + PROMOTED-Tag-Spec                       | 3     |

### Modified

| Datei                                                   | Verantwortlichkeit                                                                                                         | Phase |
| ------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------- | ----- |
| `docs/adr/README.md`                                    | ADR-0021 in Index                                                                                                          | 0     |
| `docs/architecture.md`                                  | §4 ADR-Tabelle erweitern                                                                                                   | 0     |
| `package.json`                                          | Scripts `kpi`, `kpi:snapshot`, `kpi:report` additiv + `engines: { node: ">=20" }`                                          | 2     |
| `vitest.config.ts`                                      | **Additive 1-Liner**: `coverage.reporter: ['text', 'json-summary']` (USER-DECISION resolved)                               | 2     |
| `docs/adr/0012-headless-smoke-test-pre-release-gate.md` | 1-Zeilen-Cross-Reference in `## Verlinkte Spec-Sektionen / Referenzen`-Block am Ende                                       | 4     |
| `CLAUDE.md`                                             | Neue Sektion "Code-Review — Workflow (verbindlich)" + Doku-Karte + Wo-dokumentiere-ich + Implementation-Workflow erweitert | 5     |
| `docs/templates/plan-template.md`                       | Standing-Requirement-Block + Phases-Block-Beispiel um Pre/Post-Snapshot erweitern                                          | 5     |
| `.gitignore`                                            | Verifizieren: `metrics/` darf NICHT ignored sein                                                                           | 1     |

### NICHT anfassen (siehe Standing Requirement)

Gesamter `src/`-Tree, bestehende Skripte außer Anlage von `kpi.mjs`, bestehende Specs/Pläne, bestehende ADRs außer 0012-Cross-Ref + Index-Update, Templates außer plan-template.md.

### Build-Pipeline-Files (Übersicht — was passiert mit ihnen)

| Datei                         | Art der Änderung                                                                                | Phase |
| ----------------------------- | ----------------------------------------------------------------------------------------------- | ----- |
| `.eslintrc.cjs`               | **Unverändert.** `*.mjs` ist via `ignorePatterns` ausgenommen (.eslintrc.cjs:75)                | —     |
| `vitest.config.ts`            | **Additive 1-Liner**: `coverage.reporter: ['text', 'json-summary']` für `coverage-summary.json` | 2     |
| `tsconfig.json` / `…preview…` | **Unverändert.** KPI-Skript setzt eigene CompilerOptions in `ts.createProgram`                  | —     |
| `package.json`                | Scripts + `engines.node` additiv                                                                | 2     |
| `scripts/build-preview.mjs`   | **Unverändert.** Wird vom Workflow read-only aufgerufen (`pnpm preview` Background-Server)      | —     |
| `scripts/smoke-test.mjs`      | **Unverändert.** ADR-0012-Gate-Skript ohne Anpassung                                            | —     |

---

## Phase 0 — ADR-0021 + ADR-Index + architecture.md (Commit 1)

**Commit-Vorlage:**

```
docs(adr): add ADR-0021 code-review-workflow-pre-release-gate + index

Subspec 2026-05-15: Etabliert verbindlichen Post-Implementation-Code-Review-Workflow
mit 6-Brillen-Sub-Agent-Pässen, KPI-Skript, Lessons-Pipeline. Erweitert ADR-0012
(Smoke-Test) um zweite, tiefere Pre-Release-Stufe. Konsistent mit Spec/Plan-Review-
Pattern aus CLAUDE.md.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
```

**Standing-Reminder:** ADR vor Code (conv §12). Bei neuem ADR sind drei Pflicht-Updates: ADR-Datei + ADR-Index (`docs/adr/README.md`) + architecture.md §4. Conv §15 Sprache: Deutsch. ISO-Datum 2026-05-15.

### Task 0.1: ADR-0021 anlegen

**Files:**

- Create: `docs/adr/0021-code-review-workflow-pre-release-gate.md`

- [ ] **Step 1: Datei anlegen mit ADR-Stub-Inhalt aus Spec §8 (1:1)**

  Inhalt 1:1 aus Spec §8 übernehmen. Header beginnt mit `# ADR-0021: Code-Review-Workflow als Pre-Release-Quality-Gate`. Ohne YAML-Frontmatter (analog ADR-0019). Status `accepted`, Datum `2026-05-15`, Entscheider `@griebner`, Erweitert: ADR-0012.

  Sektionen: `## Kontext und Problem`, `## Entscheidungs-Treiber`, `## Geprüfte Optionen` (A/B/C/D mit Begründungen), `## Entscheidung` (gewählt + Begründung + Positive/Negative Konsequenzen), `## Pros und Cons der Optionen` (pro Option), `## Verlinkte Spec-Sektionen / Referenzen`.

  Vollständiger Inhalt siehe Spec §8.

- [ ] **Step 2: Verifizieren — Datei existiert und beginnt mit ADR-Header**

  ```bash
  head -10 docs/adr/0021-code-review-workflow-pre-release-gate.md
  ```

  Erwartet: erste Zeile `# ADR-0021: Code-Review-Workflow als Pre-Release-Quality-Gate`, dann Bullet-Liste mit Status/Datum/Entscheider/Erweitert.

### Task 0.2: ADR-Index updaten

**Files:**

- Modify: `docs/adr/README.md`

- [ ] **Step 1: Aktuellen Inhalt lesen, Position für 0021 finden**

  ```bash
  tail -10 docs/adr/README.md
  ```

  Erwartet: letzte Zeile ist Eintrag für ADR-0020. ADR-0021 wird darunter ergänzt.

- [ ] **Step 2: Zeile für 0021 ans Ende der 3-Spalten-Tabelle hinzufügen**

  Echte ADR-Index-Struktur (verifiziert via `tail docs/adr/README.md`): Markdown-Tabelle mit 3 Spalten `| Nr | Titel | Status |`. Neue Zeile **direkt nach** der 0020-Zeile anfügen:

  ```diff
   | [0020](./0020-ha-icon-via-foreignobject.md)              | `<ha-icon>` via `<foreignObject>` statt inline `mdi-paths.ts` | accepted                                                    |
  +| [0021](./0021-code-review-workflow-pre-release-gate.md)  | Code-Review-Workflow als Pre-Release-Quality-Gate (erweitert ADR-0012) | accepted                                                    |
  ```

  Spalten-Alignment des bestehenden Stils respektieren — die genaue Padding-Länge aus den existierenden Zeilen ablesen und übernehmen.

- [ ] **Step 3: Verifizieren**

  ```bash
  grep "0021" docs/adr/README.md
  ```

  Erwartet: exakt 1 Zeile mit `[0021]`-Link.

### Task 0.3: `docs/architecture.md` §4 ADR-Tabelle erweitern

**Files:**

- Modify: `docs/architecture.md`

- [ ] **Step 1: §4 ADR-Tabelle lokalisieren**

  ```bash
  grep -n "0020" docs/architecture.md
  ```

  Erwartet: 1 Zeile mit ADR-0020 in der Tabelle. Direkt darunter wird 0021 ergänzt.

- [ ] **Step 2: Zeile für 0021 hinzufügen**

  Diff-Beispiel:

  ```diff
   | [0020](./adr/0020-ha-icon-via-foreignobject.md)              | `<ha-icon>` via `<foreignObject>` statt inline `mdi-paths.ts` | Dynamische User-/Area-Icons + null Wartungslast (Subspec 2026-05-13)         |
  +| [0021](./adr/0021-code-review-workflow-pre-release-gate.md)  | Code-Review-Workflow als Pre-Release-Quality-Gate            | 6 Brillen + KPI-Skript + Lessons-Pipeline (Subspec 2026-05-15)              |
  ```

  Spalten-Alignment des bestehenden Tabellen-Stils respektieren.

- [ ] **Step 3: Verifizieren**

  ```bash
  grep -c "0021" docs/architecture.md
  ```

  Erwartet: `1`.

### Task 0.4: Phase-0-Commit

- [ ] `pnpm check` grün (lint + typecheck + test) — sollte unverändert grün laufen, da kein Code geändert wurde
- [ ] `git add docs/adr/0021-... docs/adr/README.md docs/architecture.md`
- [ ] `git commit` mit Commit-Vorlage aus Phase-Header

---

## Phase 1 — Tracked-Dirs + `.gitignore`-Verify (Commit 2)

**Commit-Vorlage:**

```
chore(metrics): scaffold metrics/ dir with kpi-history placeholder

Tracked-Dirs für KPI-Snapshot-History und Playwright-Capture-Artefakte.
metrics/kpi-history.json initial [], wird beim ersten kpi:snapshot gefüllt.
.gitignore enthält keine metrics-greifenden Patterns (verifiziert).

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
```

**Standing-Reminder:** `metrics/` MUSS git-tracked sein (sonst History nicht in PRs sichtbar). `.gitignore` darf weder `metrics/` noch ein generisches `*.json` o.ä. enthalten, das greift.

### Task 1.1: Verzeichnisse anlegen + Initial-Files

**Files:**

- Create: `metrics/.gitkeep` (leer)
- Create: `metrics/kpi-history.json` (Inhalt `[]\n`)
- Create: `metrics/playwright/.gitkeep` (leer)

- [ ] **Step 1: Verzeichnisse anlegen**

  ```bash
  mkdir -p metrics/playwright
  touch metrics/.gitkeep
  touch metrics/playwright/.gitkeep
  ```

- [ ] **Step 2: Initial-History-File anlegen (valides JSON `[]`)**

  ```bash
  echo '[]' > metrics/kpi-history.json
  ```

- [ ] **Step 3: JSON-Validität verifizieren**

  ```bash
  node -e "JSON.parse(require('fs').readFileSync('metrics/kpi-history.json','utf8'))"
  echo "exit=$?"
  ```

  Erwartet: kein Output, `exit=0`.

- [ ] **Step 4: Existenz-Check**

  ```bash
  ls -la metrics/ metrics/playwright/
  ```

  Erwartet: drei Files (`metrics/.gitkeep`, `metrics/kpi-history.json`, `metrics/playwright/.gitkeep`).

### Task 1.2: `.gitignore` verifizieren

**Files:**

- Modify: `.gitignore` (nur falls Patterns gegen `metrics/` greifen)

- [ ] **Step 1: Aktuellen Inhalt lesen**

  ```bash
  cat .gitignore
  ```

  Erwartet: 10 Zeilen, enthält `.superpowers/`, `node_modules/`, `dist/`, `coverage/`, `*.log`, `.DS_Store`, `.playwright-mcp/`, `/*.png`. **Kein** `metrics/` und **kein** `*.json`-Pattern.

- [ ] **Step 2: Git-Check, dass die neuen Files trackable sind**

  ```bash
  git check-ignore -v metrics/.gitkeep metrics/kpi-history.json metrics/playwright/.gitkeep
  ```

  Erwartet: **kein Output** (alle Files sind NICHT ignored). Falls Output entsteht: das matchende Pattern in `.gitignore` identifizieren und explizit ausnehmen mit `!metrics/` (negierter Eintrag).

- [ ] **Step 3: Falls Step 2 Output produziert hat — `.gitignore` patchen**

  Append `!metrics/` ans Ende von `.gitignore` und Step 2 wiederholen.

### Task 1.3: Phase-1-Commit

- [ ] `pnpm check` grün
- [ ] `git add metrics/ .gitignore` (falls .gitignore geändert)
- [ ] `git commit` mit Commit-Vorlage aus Phase-Header

---

## Phase 2 — KPI-Skript inkrementell (Commits 3a–3c, oder als 1 Commit am Ende)

**Phase-Strategie:** `scripts/kpi.mjs` wird in 6 Inkrement-Tasks (2.1–2.6) plus 2 Verdrahtungs-/Commit-Tasks (2.7 + 2.8) aufgebaut. Nach jedem Inkrement-Task ist das Skript lauffähig (`node scripts/kpi.mjs` exit-0), aber liefert in frühen Tasks noch nicht den vollen Snapshot. **Commit-Granularität für Phase 2: 1 Commit am Ende (Task 2.8)** — Tasks 2.1–2.7 sind WIP-Iterationen ohne Commit. (Plan-Header sagt: 7 Commits total — Phase 2 = 1 Commit.)

**Standing-Reminder Phase 2:**

- Conv §3: KPI-Skript ≤ 400 LOC (Spec-Ausnahme, dokumentiert). Bei Annäherung an Limit: split-Vorschlag als USER-DECISION melden.
- Conv §1.5: max 3-4 Parameter pro Funktion, sonst Argument-Objekt.
- Conv §7 Logging: kein `[custom-energy-flow-card]`-Prefix (analog smoke-test.mjs); stderr-Errors mit `kpi.mjs:`-Prefix.
- `JSON.stringify(obj, null, 2) + '\n'` + `utf8`-encoding für prettier-Stabilität (Spec §3.2).
- Anti-Pattern (Spec §3.6 #3): **ein einziges** `ts.createProgram(rootFiles=allSrc, opts)`, dann `program.getSourceFile(path)` pro File. NICHT pro-Datei `createProgram`.
- Anti-Pattern (Spec §3.6 #1): keine Inline-Threshold-Werte verstreut — Single-Source in Top-Level-`const`-Block.
- Lit-Decorators: `experimentalDecorators: true` in den TS-CompilerOptions zwingend, sonst werden `@customElement`/`@property` falsch geparst.

**Commit-Vorlage (Final, Task 2.7):**

```
feat(scripts): add KPI snapshot script with TS-AST analyzer

scripts/kpi.mjs liefert Wartbarkeits-KPIs (LOC, cyclomatic complexity,
max-nesting, function/file metrics, fan-in/out, dead-exports, intra-layer
import-cycles, escape-hatch counter, bundle bytes, coverage per layer)
als JSON gegen Spec §3.3 Schema. Append-only history in
metrics/kpi-history.json. `pnpm kpi:report` zeigt Delta zwischen den
letzten zwei Snapshots.

USER-DECISION resolved: vitest.config.ts bekommt additive
`coverage.reporter: ['text', 'json-summary']` damit KPI-Skript
coverage-summary.json parsen kann (1-Liner, kein ADR nötig).
package.json bekommt `engines: { node: ">=20" }` (Node ≥ 20 für
TS-Compiler-API).

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
```

### Task 2.1: Skript-Grundgerüst + Konstanten + CLI-Dispatch

**Files:**

- Create: `scripts/kpi.mjs`

- [ ] **Step 1: Datei anlegen mit Shebang, Imports, Top-Level-Konstanten**

  ```javascript
  #!/usr/bin/env node
  // scripts/kpi.mjs — Wartbarkeits-KPI-Snapshot für custom-energy-flow-card
  // Aufruf:
  //   pnpm kpi                                    # Snapshot nach stdout
  //   pnpm kpi:snapshot --label <l> --phase <p>   # append an metrics/kpi-history.json
  //   pnpm kpi:report                             # Delta zwischen letzten zwei Snapshots

  import { readFileSync, writeFileSync, readdirSync, statSync, existsSync } from 'node:fs';
  import { join, relative, dirname, basename, resolve } from 'node:path';
  import { execSync } from 'node:child_process';
  import ts from 'typescript';

  // ─── Konstanten (Single-Source aller Thresholds) ───────────────────────
  const SCHEMA_VERSION = '1.0';
  const REPO_ROOT = resolve(dirname(new URL(import.meta.url).pathname), '..');
  const SRC_DIR = join(REPO_ROOT, 'src');
  const HISTORY_FILE = join(REPO_ROOT, 'metrics/kpi-history.json');

  // LOC-Limits aus conventions §3 — explizite Pfad-Map, Fallback 250
  const FILE_LOC_LIMITS = {
    'src/card.ts': 200,
    'src/editor.ts': 400,
    'src/engine/energy-engine.ts': 300,
  };
  const DEFAULT_LOC_LIMIT = 250;

  const COMPLEXITY_LIMIT = 10;
  const FUNCTION_LOC_LIMIT = 50;
  const PARAMS_LIMIT = 4;
  const FAN_IN_LIMIT = 10;
  const MAX_NESTING_LIMIT = 4;
  const BUNDLE_BUDGET_BYTES = 60 * 1024;

  const COVERAGE_REQUIRED_LAYERS = ['engine', 'config', 'util'];
  const COVERAGE_MIN_PCT = 90;

  // PARAMS_LIMIT: conv §1.5 fordert "3-4 Parameter, sonst Argument-Objekt".
  // Wir wählen 4 als hard-fail (Verstoß = >4). Funktionen mit genau 4 Params
  // werden NICHT als KPI-Verstoß markiert, aber Sub-Agent-Pass 2 darf sie
  // als "Argument-Objekt-Kandidat" inhaltlich aufgreifen.

  // ─── CLI-Dispatch ──────────────────────────────────────────────────────
  const args = process.argv.slice(2);
  const mode = args.includes('--snapshot')
    ? 'snapshot'
    : args.includes('--report')
      ? 'report'
      : 'print';

  function flagValue(name) {
    const i = args.indexOf(name);
    return i >= 0 && i + 1 < args.length ? args[i + 1] : null;
  }

  if (mode === 'snapshot') {
    const label = flagValue('--label') || `manual-${new Date().toISOString().slice(0, 10)}`;
    const phase = flagValue('--phase') || 'manual';
    if (!['pre', 'post', 'manual'].includes(phase)) {
      console.error(`kpi.mjs: --phase muss pre|post|manual sein, war "${phase}"`);
      process.exit(2);
    }
    const snapshot = buildSnapshot(label, phase);
    appendSnapshot(snapshot);
    console.log(`✓ Snapshot "${label}" (phase=${phase}) appendet`);
  } else if (mode === 'report') {
    const history = loadHistory();
    if (history.length < 2) {
      console.error('kpi.mjs: Mindestens 2 Snapshots in History für Delta-Report nötig');
      process.exit(2);
    }
    const [pre, post] = history.slice(-2);
    console.log(renderDeltaReport(pre, post));
  } else {
    const snapshot = buildSnapshot('stdout', 'manual');
    console.log(JSON.stringify(snapshot, null, 2));
  }

  // ─── Stub-Funktionen (in folgenden Tasks gefüllt) ─────────────────────
  function buildSnapshot(label, phase) {
    throw new Error('Task 2.5 implementiert');
  }
  function appendSnapshot(s) {
    throw new Error('Task 2.6 implementiert');
  }
  function loadHistory() {
    throw new Error('Task 2.6 implementiert');
  }
  function renderDeltaReport(a, b) {
    throw new Error('Task 2.6 implementiert');
  }
  ```

- [ ] **Step 2: Skript ausführbar verifizieren — `node scripts/kpi.mjs` läuft mit Throw**

  ```bash
  node scripts/kpi.mjs 2>&1 | head -5
  ```

  Erwartet: Throw von `buildSnapshot`-Stub (Task 2.5 implementiert). Das beweist: CLI-Dispatch funktioniert, Imports laden, Konstanten parsen.

- [ ] **Step 3: Konstanten-Sanity-Check**

  ```bash
  node -e "
    import('./scripts/kpi.mjs').catch(e => {
      // Throw von Stub erwartet — wir wollen nur die Imports prüfen
      if (e.message.includes('Task 2.5')) { console.log('✓ Imports + Konstanten OK'); process.exit(0); }
      console.error('✗ Unerwarteter Fehler:', e.message);
      process.exit(1);
    });
  "
  ```

  Erwartet: `✓ Imports + Konstanten OK`.

### Task 2.2: File-Analyse, AST-Walks, Function-Metrics

**Files:**

- Modify: `scripts/kpi.mjs` (Funktionen `listSrcFiles`, `analyzeFile`, `functionMetrics`, `cyclomaticForFunction`, `maxNestingForFunction`, `countLoc`)

- [ ] **Step 1: File-Listing implementieren**

  Vor dem Stub-Block einfügen:

  ```javascript
  // ─── File-Listing ──────────────────────────────────────────────────────
  function listSrcFiles() {
    const result = [];
    function walk(dir) {
      for (const entry of readdirSync(dir, { withFileTypes: true })) {
        const full = join(dir, entry.name);
        if (entry.isDirectory()) walk(full);
        else if (entry.name.endsWith('.ts')) result.push(full);
      }
    }
    walk(SRC_DIR);
    return result.map((p) => relative(REPO_ROOT, p).replace(/\\/g, '/'));
  }
  ```

- [ ] **Step 2: TS-Program einmalig erstellen (Performance-Anti-Pattern vermeiden)**

  ```javascript
  // ─── TS-Compiler-Setup (ein Program für alle Files, Performance) ──────
  function createTsProgram(files) {
    // experimentalDecorators: true ist zwingend für Lit-Card.ts/editor.ts
    // (sonst werden @customElement/@property als unbekannt geparst).
    return ts.createProgram(
      files.map((p) => join(REPO_ROOT, p)),
      {
        experimentalDecorators: true,
        target: ts.ScriptTarget.ES2022,
        module: ts.ModuleKind.ESNext,
        allowJs: false,
        noEmit: true,
      },
    );
  }
  ```

- [ ] **Step 3: `countLoc` — Zeilen ohne Blank- und Comment-Only-Lines**

  ```javascript
  function countLoc(sourceText) {
    const lines = sourceText.split('\n');
    let count = 0;
    let inBlockComment = false;
    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed) continue;
      if (inBlockComment) {
        if (trimmed.includes('*/')) inBlockComment = false;
        continue;
      }
      if (trimmed.startsWith('/*')) {
        if (!trimmed.endsWith('*/')) inBlockComment = true;
        continue;
      }
      if (trimmed.startsWith('//')) continue;
      count++;
    }
    return count;
  }
  ```

- [ ] **Step 4: `cyclomaticForFunction` — Standard-McCabe**

  ```javascript
  function cyclomaticForFunction(funcNode) {
    let complexity = 1;
    function visit(node) {
      switch (node.kind) {
        case ts.SyntaxKind.IfStatement:
        case ts.SyntaxKind.CaseClause:
        case ts.SyntaxKind.ForStatement:
        case ts.SyntaxKind.ForInStatement:
        case ts.SyntaxKind.ForOfStatement:
        case ts.SyntaxKind.WhileStatement:
        case ts.SyntaxKind.DoStatement:
        case ts.SyntaxKind.CatchClause:
        case ts.SyntaxKind.ConditionalExpression:
          complexity++;
          break;
        case ts.SyntaxKind.BinaryExpression: {
          const op = node.operatorToken.kind;
          if (
            op === ts.SyntaxKind.AmpersandAmpersandToken ||
            op === ts.SyntaxKind.BarBarToken ||
            op === ts.SyntaxKind.QuestionQuestionToken
          ) {
            complexity++;
          }
          break;
        }
      }
      ts.forEachChild(node, visit);
    }
    visit(funcNode);
    return complexity;
  }
  ```

- [ ] **Step 5: `maxNestingForFunction` — depth-tracker**

  ```javascript
  function maxNestingForFunction(funcNode) {
    let max = 0;
    function visit(node, depth) {
      max = Math.max(max, depth);
      const nesting = [
        ts.SyntaxKind.IfStatement,
        ts.SyntaxKind.ForStatement,
        ts.SyntaxKind.ForInStatement,
        ts.SyntaxKind.ForOfStatement,
        ts.SyntaxKind.WhileStatement,
        ts.SyntaxKind.DoStatement,
        ts.SyntaxKind.SwitchStatement,
        ts.SyntaxKind.TryStatement,
      ].includes(node.kind);
      const newDepth = nesting ? depth + 1 : depth;
      ts.forEachChild(node, (c) => visit(c, newDepth));
    }
    visit(funcNode, 0);
    return max;
  }
  ```

- [ ] **Step 6: `functionMetrics` + `analyzeFile`**

  ```javascript
  function functionMetrics(funcNode, sourceFile) {
    const { line: lineStart } = sourceFile.getLineAndCharacterOfPosition(funcNode.getStart());
    const { line: lineEnd } = sourceFile.getLineAndCharacterOfPosition(funcNode.getEnd());
    const name = funcNode.name?.getText(sourceFile) ?? '<anonymous>';
    const params = funcNode.parameters?.length ?? 0;
    return {
      name,
      loc: lineEnd - lineStart + 1,
      cyclomatic: cyclomaticForFunction(funcNode),
      max_nesting: maxNestingForFunction(funcNode),
      params,
      line_start: lineStart + 1,
    };
  }

  function analyzeFile(relPath, program) {
    const sourceFile = program.getSourceFile(join(REPO_ROOT, relPath));
    if (!sourceFile) throw new Error(`kpi.mjs: kein SourceFile für ${relPath}`);
    const sourceText = sourceFile.getFullText();
    const is_test = relPath.endsWith('.test.ts');
    const functions = [];
    function collectFunctions(node) {
      if (
        ts.isFunctionDeclaration(node) ||
        ts.isMethodDeclaration(node) ||
        ts.isArrowFunction(node) ||
        ts.isFunctionExpression(node)
      ) {
        functions.push(functionMetrics(node, sourceFile));
      }
      ts.forEachChild(node, collectFunctions);
    }
    collectFunctions(sourceFile);
    return {
      path: relPath,
      is_test,
      loc: countLoc(sourceText),
      functions,
      // imports/exports/fan_in/escape_hatches kommen in Task 2.3 + 2.4
    };
  }
  ```

- [ ] **Step 7: Sanity-Check per Smoke-Aufruf**

  Temporär in der Datei: am Ende des CLI-Dispatch `else`-Zweigs **vor** `buildSnapshot(...)` einfügen:

  ```javascript
  // TEMP-DEBUG (in Task 2.5 wieder entfernen)
  const files = listSrcFiles();
  const program = createTsProgram(files);
  const sample = analyzeFile('src/util/format-power.ts', program);
  console.log(`Sample: ${sample.path} loc=${sample.loc} functions=${sample.functions.length}`);
  for (const fn of sample.functions)
    console.log(`  ${fn.name} loc=${fn.loc} cyclomatic=${fn.cyclomatic}`);
  process.exit(0);
  ```

  ```bash
  node scripts/kpi.mjs
  ```

  Erwartet: Output ähnlich `Sample: src/util/format-power.ts loc=~30 functions=1-2`, jede Function mit `cyclomatic` ≥ 1. Werte gegen manuelles `cat src/util/format-power.ts` plausibilisieren.

- [ ] **Step 8: TEMP-DEBUG entfernen, Skript bleibt im Throw-Zustand für Stub-Funktionen**

### Task 2.3: Escape-Hatch-Counter, Custom-Elements, Imports/Exports

**Files:**

- Modify: `scripts/kpi.mjs`

- [ ] **Step 1: `countEscapeHatches` — regex-basiert**

  ```javascript
  function countEscapeHatches(sourceText) {
    return {
      // \bany\b — Word-Boundary, fängt aber auch Variable namens "any" ein.
      // Wir filtern grob: `any` im Type-Kontext via Hint "as any" / ": any" / "<any" — niedrige Toleranz.
      any: (sourceText.match(/\b(?:as\s+any|:\s*any\b|<\s*any\b|any\s*[,\]\)>])/g) || []).length,
      as: (sourceText.match(/\bas\s+[A-Z]/g) || []).length,
      non_null: (sourceText.match(/[a-zA-Z_$\]\)]\s*!\.\s*[a-zA-Z_$]/g) || []).length,
      eslint_disable: (sourceText.match(/eslint-disable/g) || []).length,
      ts_directive: (sourceText.match(/@ts-(expect-error|ignore|nocheck)/g) || []).length,
      todo: (sourceText.match(/\bTODO\b|\bFIXME\b/g) || []).length,
    };
  }
  ```

- [ ] **Step 2: `customElementsCount` für gesamtes `src/`**

  ```javascript
  function countCustomElementsAcrossSrc(files) {
    let count = 0;
    for (const path of files) {
      if (path.endsWith('.test.ts')) continue;
      const text = readFileSync(join(REPO_ROOT, path), 'utf8');
      const matches = text.match(/@customElement\s*\(\s*['"][^'"]+['"]\s*\)/g) || [];
      count += matches.length;
    }
    return count;
  }
  ```

- [ ] **Step 3: Imports/Exports-Detection via AST**

  ```javascript
  function extractImports(sourceFile) {
    const imports = [];
    sourceFile.forEachChild((node) => {
      if (ts.isImportDeclaration(node)) {
        const specifier = node.moduleSpecifier.getText(sourceFile).replace(/['"]/g, '');
        // Nur relative Imports zählen für fan-in/out (externe wie 'lit' weglassen)
        if (specifier.startsWith('.')) imports.push(specifier);
      }
    });
    return imports;
  }

  function extractExports(sourceFile) {
    const exported = [];
    sourceFile.forEachChild((node) => {
      if (
        ts.isExportDeclaration(node) &&
        node.exportClause &&
        ts.isNamedExports(node.exportClause)
      ) {
        for (const el of node.exportClause.elements) exported.push(el.name.getText(sourceFile));
      } else if (
        ts.canHaveModifiers(node) &&
        ts.getModifiers(node)?.some((m) => m.kind === ts.SyntaxKind.ExportKeyword)
      ) {
        if (ts.isFunctionDeclaration(node) || ts.isClassDeclaration(node)) {
          if (node.name) exported.push(node.name.getText(sourceFile));
        } else if (ts.isVariableStatement(node)) {
          for (const decl of node.declarationList.declarations) {
            if (ts.isIdentifier(decl.name)) exported.push(decl.name.getText(sourceFile));
          }
        }
      }
    });
    return exported;
  }
  ```

- [ ] **Step 4: `analyzeFile` erweitern**

  ```javascript
  // ERSETZE die `analyzeFile`-Funktion aus Task 2.2 KOMPLETT durch diese erweiterte Version
  // (nicht patchen — die alte Version wird vollständig überschrieben):
  function analyzeFile(relPath, program) {
    const sourceFile = program.getSourceFile(join(REPO_ROOT, relPath));
    if (!sourceFile) throw new Error(`kpi.mjs: kein SourceFile für ${relPath}`);
    const sourceText = sourceFile.getFullText();
    const is_test = relPath.endsWith('.test.ts');
    const functions = [];
    function collectFunctions(node) {
      if (
        ts.isFunctionDeclaration(node) ||
        ts.isMethodDeclaration(node) ||
        ts.isArrowFunction(node) ||
        ts.isFunctionExpression(node)
      ) {
        functions.push(functionMetrics(node, sourceFile));
      }
      ts.forEachChild(node, collectFunctions);
    }
    collectFunctions(sourceFile);
    const imports = extractImports(sourceFile);
    const exports = extractExports(sourceFile);
    const escape_hatches = countEscapeHatches(sourceText);
    return {
      path: relPath,
      is_test,
      loc: countLoc(sourceText),
      imports_count: imports.length,
      imports, // intern für fan-in-Graph (Task 2.4)
      exports,
      functions,
      escape_hatches,
    };
  }
  ```

- [ ] **Step 5: Smoke-Check**

  Temporärer Aufruf wie Task 2.2:

  ```javascript
  const sample = analyzeFile('src/util/format-power.ts', program);
  console.log(`Imports: ${sample.imports_count}, exports: ${sample.exports.length}`);
  console.log(`Custom Elements im Repo: ${countCustomElementsAcrossSrc(files)}`);
  process.exit(0);
  ```

  ```bash
  node scripts/kpi.mjs
  ```

  Erwartet: `Custom Elements im Repo: 2` (genau card + editor).

- [ ] **Step 6: TEMP-DEBUG entfernen**

### Task 2.4: Import-Graph, Layer-Detection, Dead-Exports, Intra-Layer-Cycles

**Files:**

- Modify: `scripts/kpi.mjs`

- [ ] **Step 1: `layerForPath` — Mapping**

  ```javascript
  function layerForPath(relPath) {
    if (relPath.startsWith('src/engine/')) return 'engine';
    if (relPath.startsWith('src/config/')) return 'config';
    if (relPath.startsWith('src/render/')) return 'render';
    if (relPath.startsWith('src/util/')) return 'util';
    if (relPath.startsWith('src/ha/')) return 'ha';
    if (relPath.startsWith('src/i18n/')) return 'i18n';
    // src/card.ts, src/editor.ts, src/card-helpers.ts, src/card-styles.ts,
    // src/editor-list-sections.ts, src/index.ts, src/const.ts
    return 'card_editor';
  }
  ```

- [ ] **Step 2: Import-Graph aufbauen + Fan-In**

  ```javascript
  function buildImportGraph(analyses) {
    const fanIn = new Map();
    for (const a of analyses) fanIn.set(a.path, 0);
    for (const a of analyses) {
      for (const spec of a.imports) {
        // Resolve relative path: 'src/foo/bar.ts' + '../util/x' → 'src/util/x.ts'
        const fromDir = dirname(a.path);
        let resolved = join(fromDir, spec).replace(/\\/g, '/');
        if (!resolved.endsWith('.ts')) resolved += '.ts';
        if (fanIn.has(resolved)) fanIn.set(resolved, fanIn.get(resolved) + 1);
      }
    }
    return fanIn;
  }
  ```

- [ ] **Step 3: Dead-Exports — exportiert, aber nirgendwo importiert namentlich**

  ```javascript
  function findDeadExports(analyses) {
    // Allowlist: src/index.ts ist HACS-Entry, exports werden vom Bundle konsumiert
    const allowlist = new Set(['src/index.ts']);
    // Sammle alle importierten Namen pro Target-File:
    const importedNamesPerFile = new Map();
    for (const a of analyses) {
      for (const spec of a.imports) {
        const fromDir = dirname(a.path);
        let resolved = join(fromDir, spec).replace(/\\/g, '/');
        if (!resolved.endsWith('.ts')) resolved += '.ts';
        // Importierte Namen aus dem Import-Statement extrahieren wäre AST-aufwendig.
        // Heuristik: wenn Datei überhaupt importiert wird, gilt jeder Export als "verwendet".
        // (False-negative-Risiko bei selektiven Imports — akzeptiert für v1.0.)
        if (!importedNamesPerFile.has(resolved)) importedNamesPerFile.set(resolved, true);
      }
    }
    // Nur `card.ts` und `editor.ts` haben legitim keine direkten Importeure
    // (sie werden via Custom-Element-Registrierung im Browser konsumiert).
    // `card-helpers.ts`, `card-styles.ts`, `editor-list-sections.ts`, `const.ts`,
    // `index.ts` werden hingegen von card/editor.ts importiert — dead-export-Check
    // ist also sinnvoll für sie.
    const cardEditorNoImporters = new Set(['src/card.ts', 'src/editor.ts']);
    const dead = [];
    for (const a of analyses) {
      if (a.is_test || allowlist.has(a.path)) continue;
      if (cardEditorNoImporters.has(a.path)) continue;
      if (!importedNamesPerFile.has(a.path) && a.exports.length > 0) {
        dead.push({ path: a.path, exports: a.exports });
      }
    }
    return dead;
  }
  ```

  **TDD-Hinweis:** False-Negative-Heuristik. Akzeptable Vereinfachung. Echter Walker (welche Symbole importiert?) ist v1.x-Verbesserung.

- [ ] **Step 4: Intra-Layer-Import-Cycles via DFS**

  ```javascript
  function findIntraLayerCycles(analyses) {
    const cycles = [];
    const byLayer = new Map();
    for (const a of analyses) {
      const layer = layerForPath(a.path);
      if (!byLayer.has(layer)) byLayer.set(layer, []);
      byLayer.get(layer).push(a);
    }
    for (const [layer, files] of byLayer) {
      const adj = new Map();
      const pathsInLayer = new Set(files.map((f) => f.path));
      for (const f of files) {
        const edges = [];
        for (const spec of f.imports) {
          const fromDir = dirname(f.path);
          let resolved = join(fromDir, spec).replace(/\\/g, '/');
          if (!resolved.endsWith('.ts')) resolved += '.ts';
          if (pathsInLayer.has(resolved) && resolved !== f.path) edges.push(resolved);
        }
        adj.set(f.path, edges);
      }
      const visited = new Set();
      const stack = new Set();
      function dfs(node, path) {
        if (stack.has(node)) {
          const cycleStart = path.indexOf(node);
          cycles.push([layer, path.slice(cycleStart).concat(node)]);
          return;
        }
        if (visited.has(node)) return;
        visited.add(node);
        stack.add(node);
        for (const next of adj.get(node) || []) dfs(next, path.concat(node));
        stack.delete(node);
      }
      for (const f of files) if (!visited.has(f.path)) dfs(f.path, []);
    }
    return cycles;
  }
  ```

- [ ] **Step 5: Smoke-Check**

  Temporär:

  ```javascript
  const analyses = files.map((p) => analyzeFile(p, program));
  const fanIn = buildImportGraph(analyses);
  console.log(`Top fan-in:`);
  [...fanIn.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .forEach(([p, n]) => console.log(`  ${p}: ${n}`));
  const dead = findDeadExports(analyses);
  console.log(`Dead exports: ${dead.length}`);
  const cycles = findIntraLayerCycles(analyses);
  console.log(`Intra-layer cycles: ${cycles.length}`);
  process.exit(0);
  ```

  Erwartet: top fan-in zeigt `engine/types.ts`, `util/...`, etc. Dead-exports und cycles 0 oder klein für aktuellen Repo-Zustand.

- [ ] **Step 6: TEMP-DEBUG entfernen**

### Task 2.5: Coverage, Bundle, Deps, Snapshot-Assembly, Violation-Detection

**Files:**

- Modify: `scripts/kpi.mjs`

- [ ] **Step 1: `readCoverage` — parsed `coverage/coverage-summary.json` falls vorhanden**

  ```javascript
  function readCoverage(analyses) {
    const path = join(REPO_ROOT, 'coverage/coverage-summary.json');
    if (!existsSync(path)) {
      console.error(
        'kpi.mjs: coverage/coverage-summary.json fehlt (pnpm test:coverage vergessen?), coverage_pct=null',
      );
      return { total: null, per_layer: {} };
    }
    const raw = JSON.parse(readFileSync(path, 'utf8'));
    const total = raw.total?.lines?.pct ?? null;

    // Per-Layer aggregieren: für jedes File im coverage-summary mappen wir den Layer
    const perLayerSum = {};
    const perLayerCount = {};
    for (const [filePath, stats] of Object.entries(raw)) {
      if (filePath === 'total') continue;
      const rel = relative(REPO_ROOT, filePath).replace(/\\/g, '/');
      if (!rel.startsWith('src/')) continue;
      const layer = layerForPath(rel);
      const pct = stats.lines?.pct ?? 0;
      perLayerSum[layer] = (perLayerSum[layer] || 0) + pct;
      perLayerCount[layer] = (perLayerCount[layer] || 0) + 1;
    }
    const per_layer = {};
    for (const layer of Object.keys(perLayerSum)) {
      per_layer[layer] =
        perLayerCount[layer] > 0 ? +(perLayerSum[layer] / perLayerCount[layer]).toFixed(1) : null;
    }
    return { total, per_layer };
  }
  ```

- [ ] **Step 2: `readBundleBytes`**

  ```javascript
  function readBundleBytes() {
    const path = join(REPO_ROOT, 'dist/custom-energy-flow-card.js');
    if (!existsSync(path)) {
      console.error(
        'kpi.mjs: dist/custom-energy-flow-card.js fehlt (pnpm build vergessen?), bundle_bytes=null',
      );
      return null;
    }
    return statSync(path).size;
  }
  ```

- [ ] **Step 3: `readDependencies`**

  ```javascript
  function readDependencies() {
    const pkg = JSON.parse(readFileSync(join(REPO_ROOT, 'package.json'), 'utf8'));
    return {
      runtime: Object.keys(pkg.dependencies || {}).length,
      dev: Object.keys(pkg.devDependencies || {}).length,
    };
  }
  ```

- [ ] **Step 4: `detectViolations` — die echte Threshold-Pflicht**

  ```javascript
  function detectViolations(snapshot) {
    const v = {
      loc_exceeds_limit: [],
      complexity_above_10: [],
      function_loc_above_50: [],
      params_above_4: [],
      fan_in_above_10: [],
      max_nesting_above_4: [],
      coverage_below_90_pure_layers: [],
      bundle_above_budget:
        snapshot.totals.bundle_bytes != null && snapshot.totals.bundle_bytes > BUNDLE_BUDGET_BYTES,
      custom_elements_not_2: snapshot.totals.custom_elements_count !== 2,
      any_in_pure_layers: [],
      non_null_in_pure_layers: [],
      missing_tests_pure_layers: [],
      import_cycles: snapshot.import_cycles || [],
      dead_exports: snapshot.dead_exports || [],
    };
    for (const f of snapshot.files) {
      if (f.is_test) continue;
      const limit = FILE_LOC_LIMITS[f.path] ?? DEFAULT_LOC_LIMIT;
      if (f.loc > limit) v.loc_exceeds_limit.push({ path: f.path, loc: f.loc, limit });
      if (f.fan_in > FAN_IN_LIMIT) v.fan_in_above_10.push({ path: f.path, value: f.fan_in });
      for (const fn of f.functions) {
        if (fn.cyclomatic > COMPLEXITY_LIMIT)
          v.complexity_above_10.push({ path: f.path, function: fn.name, value: fn.cyclomatic });
        if (fn.loc > FUNCTION_LOC_LIMIT)
          v.function_loc_above_50.push({ path: f.path, function: fn.name, value: fn.loc });
        if (fn.params > PARAMS_LIMIT)
          v.params_above_4.push({ path: f.path, function: fn.name, value: fn.params });
        if (fn.max_nesting > MAX_NESTING_LIMIT)
          v.max_nesting_above_4.push({ path: f.path, function: fn.name, value: fn.max_nesting });
      }
      const layer = layerForPath(f.path);
      if (['engine', 'config', 'util'].includes(layer)) {
        if (f.escape_hatches.any > 0)
          v.any_in_pure_layers.push({ path: f.path, count: f.escape_hatches.any });
        if (f.escape_hatches.non_null > 0)
          v.non_null_in_pure_layers.push({ path: f.path, count: f.escape_hatches.non_null });
        // Test-Pflicht für engine/config/util: gibt es einen .test.ts-Sibling?
        const expectedTest = f.path.replace(/\.ts$/, '.test.ts');
        if (!snapshot.files.find((g) => g.path === expectedTest)) {
          v.missing_tests_pure_layers.push(f.path);
        }
      }
    }
    for (const [layer, pct] of Object.entries(snapshot.layers)) {
      if (
        COVERAGE_REQUIRED_LAYERS.includes(layer) &&
        pct.coverage_pct != null &&
        pct.coverage_pct < COVERAGE_MIN_PCT
      ) {
        v.coverage_below_90_pure_layers.push({ layer, pct: pct.coverage_pct });
      }
    }
    return v;
  }
  ```

- [ ] **Step 5: `buildSnapshot` — alles zusammenführen (Stub aus 2.1 ersetzen)**

  ```javascript
  function buildSnapshot(label, phase) {
    const files = listSrcFiles();
    const program = createTsProgram(files);
    const analyses = files.map((p) => analyzeFile(p, program));
    const fanIn = buildImportGraph(analyses);
    for (const a of analyses) a.fan_in = fanIn.get(a.path) || 0;

    const cycles = findIntraLayerCycles(analyses);
    const dead = findDeadExports(analyses);
    const coverage = readCoverage(analyses);
    const bundleBytes = readBundleBytes();
    const deps = readDependencies();
    const customElementsCount = countCustomElementsAcrossSrc(files);

    // Per-Layer-Aggregat
    const layers = {};
    for (const a of analyses) {
      if (a.is_test) continue;
      const layer = layerForPath(a.path);
      if (!layers[layer])
        layers[layer] = { files: 0, loc: 0, complexity_sum: 0, escape_hatches_sum: 0 };
      layers[layer].files++;
      layers[layer].loc += a.loc;
      for (const fn of a.functions) layers[layer].complexity_sum += fn.cyclomatic;
      const eh = a.escape_hatches;
      layers[layer].escape_hatches_sum +=
        eh.any + eh.as + eh.non_null + eh.eslint_disable + eh.ts_directive + eh.todo;
    }
    for (const layer of Object.keys(layers)) {
      const l = layers[layer];
      l.complexity_avg = l.files > 0 ? +(l.complexity_sum / l.files).toFixed(1) : 0;
      l.coverage_pct = coverage.per_layer[layer] ?? null;
    }

    // Totals
    const sourceFiles = analyses.filter((a) => !a.is_test);
    const totals = {
      loc: sourceFiles.reduce((s, a) => s + a.loc, 0),
      files: sourceFiles.length,
      coverage_pct: coverage.total,
      bundle_bytes: bundleBytes,
      any_count: sourceFiles.reduce((s, a) => s + a.escape_hatches.any, 0),
      as_count: sourceFiles.reduce((s, a) => s + a.escape_hatches.as, 0),
      non_null_count: sourceFiles.reduce((s, a) => s + a.escape_hatches.non_null, 0),
      eslint_disable_count: sourceFiles.reduce((s, a) => s + a.escape_hatches.eslint_disable, 0),
      ts_directive_count: sourceFiles.reduce((s, a) => s + a.escape_hatches.ts_directive, 0),
      todo_count: sourceFiles.reduce((s, a) => s + a.escape_hatches.todo, 0),
      custom_elements_count: customElementsCount,
      dependencies: deps,
    };

    // Git-Info
    let commit = 'unknown',
      branch = 'unknown';
    try {
      commit = execSync('git rev-parse HEAD', { cwd: REPO_ROOT }).toString().trim();
      branch = execSync('git branch --show-current', { cwd: REPO_ROOT }).toString().trim();
    } catch (e) {
      console.error('kpi.mjs: git nicht verfügbar oder nicht in Repo');
    }

    // plan_id aus label ableiten (entferne pre-/post-/manual-Prefix)
    const planId = label.replace(/^(pre|post|manual)-/, '');

    const snapshot = {
      version: SCHEMA_VERSION,
      timestamp: new Date().toISOString(),
      commit,
      branch,
      plan_id: planId,
      phase,
      label,
      totals,
      layers,
      files: analyses.map((a) => ({
        path: a.path,
        layer: layerForPath(a.path),
        is_test: a.is_test,
        loc: a.loc,
        imports_count: a.imports_count,
        fan_in: a.fan_in,
        exports: a.exports,
        functions: a.functions,
        escape_hatches: a.escape_hatches,
      })),
      import_cycles: cycles,
      dead_exports: dead,
    };
    snapshot.violations = detectViolations(snapshot);
    return snapshot;
  }
  ```

- [ ] **Step 6: Smoke-Aufruf — vollständiger Snapshot**

  ```bash
  node scripts/kpi.mjs | head -30
  ```

  Erwartet: JSON beginnt mit `{ "version": "1.0", "timestamp": "2026-05-15T...", "commit": "...", "totals": { "loc": <gross>, "files": <34>, ...`.

  Sanity-Check:

  ```bash
  node scripts/kpi.mjs | python3 -c "import sys, json; d=json.load(sys.stdin); print('files:', d['totals']['files'], 'custom_elements:', d['totals']['custom_elements_count'], 'editor_loc:', [f['loc'] for f in d['files'] if f['path']=='src/editor.ts'])"
  ```

  Erwartet: `files: 34 custom_elements: 2 editor_loc: [405]` (oder ähnlich).

  **STOP-Condition:** Falls `custom_elements: 2` falsch ist oder `editor.ts:405` nicht in `violations.loc_exceeds_limit` auftaucht → Bug im Skript, debuggen vor Weitergehen.

### Task 2.6: History-IO + Delta-Report + finale CLI-Verdrahtung

**Files:**

- Modify: `scripts/kpi.mjs`

- [ ] **Step 1: `loadHistory` + `appendSnapshot`**

  ```javascript
  function loadHistory() {
    if (!existsSync(HISTORY_FILE)) return [];
    return JSON.parse(readFileSync(HISTORY_FILE, 'utf8'));
  }

  function appendSnapshot(snapshot) {
    const history = loadHistory();
    history.push(snapshot);
    writeFileSync(HISTORY_FILE, JSON.stringify(history, null, 2) + '\n', 'utf8');
  }
  ```

- [ ] **Step 2: `renderDeltaReport` — siehe Spec §3.4 für Format**

  ```javascript
  function renderDeltaReport(pre, post) {
    const lines = [];
    lines.push(`=== KPI Delta: ${pre.label} → ${post.label} ===`);
    lines.push(
      `(commit ${pre.commit.slice(0, 8)} → ${post.commit.slice(0, 8)}, branch ${post.branch})`,
    );
    lines.push('');
    lines.push('Totals:');
    const fmtDelta = (a, b) => {
      if (a == null || b == null) return `(n/a)`;
      const d = b - a;
      const sign = d > 0 ? '+' : '';
      return `(${sign}${d})`;
    };
    lines.push(
      `  LOC:                ${pre.totals.loc} → ${post.totals.loc}  ${fmtDelta(pre.totals.loc, post.totals.loc)}`,
    );
    lines.push(
      `  Files:              ${pre.totals.files} → ${post.totals.files}  ${fmtDelta(pre.totals.files, post.totals.files)}`,
    );
    lines.push(
      `  Coverage:           ${pre.totals.coverage_pct ?? 'n/a'} → ${post.totals.coverage_pct ?? 'n/a'}`,
    );
    lines.push(
      `  Bundle:             ${pre.totals.bundle_bytes ?? 'n/a'} → ${post.totals.bundle_bytes ?? 'n/a'} B`,
    );
    for (const k of [
      'any_count',
      'as_count',
      'non_null_count',
      'eslint_disable_count',
      'ts_directive_count',
      'todo_count',
    ]) {
      lines.push(
        `  ${k.padEnd(20)}${pre.totals[k]} → ${post.totals[k]}  ${fmtDelta(pre.totals[k], post.totals[k])}`,
      );
    }
    lines.push(
      `  custom_elements:    ${post.totals.custom_elements_count} (${post.totals.custom_elements_count === 2 ? 'OK' : 'FEHLER'})`,
    );
    lines.push(
      `  deps (runtime):     ${pre.totals.dependencies.runtime} → ${post.totals.dependencies.runtime}`,
    );
    lines.push(
      `  deps (dev):         ${pre.totals.dependencies.dev} → ${post.totals.dependencies.dev}`,
    );
    lines.push('');
    lines.push('Layer-Coverage:');
    for (const layer of Object.keys(post.layers)) {
      const preLayer = pre.layers[layer] || {};
      const a = preLayer.coverage_pct;
      const b = post.layers[layer].coverage_pct;
      if (a != null || b != null) {
        lines.push(`  ${layer.padEnd(12)}${a ?? 'n/a'} → ${b ?? 'n/a'}`);
      }
    }
    lines.push('');
    lines.push('Threshold-Verstöße (NEU):');
    // Vergleiche Pre und Post violations
    const violationsKeys = Object.keys(post.violations).filter((k) =>
      Array.isArray(post.violations[k]),
    );
    for (const key of violationsKeys) {
      const preItems = JSON.stringify(pre.violations[key] || []);
      const postItems = post.violations[key] || [];
      for (const item of postItems) {
        if (!preItems.includes(JSON.stringify(item))) {
          lines.push(`  - ${key}: ${JSON.stringify(item)}`);
        }
      }
    }
    lines.push('');
    lines.push(
      `Historie-Position: post-Snapshot ist Eintrag ${loadHistory().length}/${loadHistory().length}`,
    );
    return lines.join('\n');
  }
  ```

- [ ] **Step 3: Smoke-Check der vollen CLI**

  ```bash
  # Manueller Test-Snapshot
  pnpm test:coverage 2>/dev/null || true  # erzeugt coverage-summary.json (falls vitest.config.ts Task 2.7 schon erledigt)
  pnpm build 2>/dev/null || true          # erzeugt dist/

  node scripts/kpi.mjs --snapshot --label test-1 --phase manual
  node scripts/kpi.mjs --snapshot --label test-2 --phase manual
  node scripts/kpi.mjs --report
  ```

  Erwartet:
  - `✓ Snapshot "test-1" (phase=manual) appendet`
  - `✓ Snapshot "test-2" (phase=manual) appendet`
  - Delta-Report mit `=== KPI Delta: test-1 → test-2 ===` und vermutlich 0 Drift (gleicher Code).

- [ ] **Step 4: History rollback (test-Snapshots wieder entfernen)**

  ```bash
  echo '[]' > metrics/kpi-history.json
  ```

  Erwartet: `metrics/kpi-history.json` ist wieder `[]` für initialen Commit.

### Task 2.7: `package.json` + `vitest.config.ts` Edits

**Files:**

- Modify: `package.json`
- Modify: `vitest.config.ts`

- [ ] **Step 1: `package.json` Scripts hinzufügen**

  Diff:

  ```diff
     "scripts": {
       "dev": "rollup -c -w",
       "build": "NODE_ENV=production rollup -c",
  +    "kpi": "node scripts/kpi.mjs",
  +    "kpi:snapshot": "node scripts/kpi.mjs --snapshot",
  +    "kpi:report": "node scripts/kpi.mjs --report",
       "build:analyze": "ANALYZE=1 rollup -c",
       ...
     },
  ```

  Reihenfolge folgt grob dem existierenden Pattern (build-related zusammen). Eslint/format der package.json-Reihenfolge übernehmen falls hardcoded.

- [ ] **Step 2: `package.json` `engines` ergänzen**

  Diff (top-level, nach `packageManager`):

  ```diff
     "packageManager": "pnpm@9.0.0",
  +  "engines": {
  +    "node": ">=20"
  +  }
   }
  ```

- [ ] **Step 3: `vitest.config.ts` `coverage.reporter` ergänzen (USER-DECISION resolved)**

  Aktueller Inhalt (aus Discovery):

  ```typescript
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
  ```

  Diff:

  ```diff
     coverage: {
       provider: 'v8',
  +    reporter: ['text', 'json-summary'],
       include: ['src/engine/**', 'src/config/**', 'src/util/**'],
       exclude: ['**/*.test.ts'],
       thresholds: {
  ```

  **WICHTIG:** Default-Reporter ist `['text']` — wir müssen `text` explizit dazuschreiben, sonst verlieren wir die stdout-Coverage-Ausgabe.

- [ ] **Step 4: Pipeline verifizieren — alle Scripts laufen**

  ```bash
  pnpm test:coverage 2>&1 | tail -5
  ls coverage/coverage-summary.json
  pnpm kpi --help 2>/dev/null || pnpm kpi | head -3
  pnpm kpi:snapshot --label sanity-2-7 --phase manual
  pnpm kpi:report 2>&1 | head -3
  echo '[]' > metrics/kpi-history.json  # rollback
  ```

  Erwartet:
  - `coverage/coverage-summary.json` existiert nach `test:coverage`
  - `pnpm kpi` produziert JSON-Output
  - `pnpm kpi:snapshot` appendet
  - `pnpm kpi:report` schlägt fehl (nur 1 Snapshot in History) — das ist OK, Smoke-Verifikation

- [ ] **Step 5: `pnpm check` grün**

  ```bash
  pnpm check
  ```

  Erwartet: lint + typecheck + test grün. `scripts/kpi.mjs` ist außerhalb lint/typecheck-Scope, daher unverändert grün.

### Task 2.8: Phase-2-Commit

- [ ] `pnpm check` grün
- [ ] `pnpm build` grün (Bundle unverändert ≤ 60 kB, da kein `src/`-Edit)
- [ ] `pnpm smoke` grün
- [ ] `wc -l scripts/kpi.mjs` — sollte ≤ 400 LOC sein. Falls > 400: STOP, splitten oder Spec-Ausnahme anpassen.
- [ ] `git add scripts/kpi.mjs package.json vitest.config.ts`
- [ ] `git commit` mit Commit-Vorlage aus Phase-Header

---

## Phase 3 — Code-Review-Checklist + Lessons-Hot-Pot (Commit 4)

**Commit-Vorlage:**

```
feat(docs): add code-review-checklist template + lessons-learned hot-pot

docs/templates/code-review-checklist.md mit Self-Review-Phasen A-H und
Phase Z mit 6 Sub-Agent-Pass-Prompts (Spec/Plan↔Code-Coverage,
Architektur+ADRs+Conv, Wartbarkeits-KPIs, Test-Tiefe+TDD,
UX+Funktional via Playwright, Release-Readiness+Restrisiko).

docs/lessons-learned.md als append-only Hot-Pot — Eintragsformat,
Curation-Workflow, PROMOTED-Tag-Spec dokumentiert.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
```

**Standing-Reminder Phase 3:** Conv §15 Sprache: Deutsch für Doku. Anti-Pattern aus Spec §3.6 #6: Sub-Agent-Prompts dürfen NICHT 1:1 aus `plan-review-checklist.md` kopiert werden — sie müssen Code-Review-spezifisch sein.

### Task 3.1: `docs/templates/code-review-checklist.md` schreiben

**Files:**

- Create: `docs/templates/code-review-checklist.md`

- [ ] **Step 1: Datei anlegen mit Kopf und Self-Review-Phasen A–H**

  Strukturelle Vorlage: `docs/templates/plan-review-checklist.md` (gleicher Aufbau: Phase-Liste am Anfang, dann Output, dann Phase Z mit Pass-Prompts, Iterations-Loop am Ende).

  **Inhalt Phase A–H** (analog zu plan-review-checklist Phase A–L, aber Code-Review-spezifisch):
  - Phase A — Diff-Discovery (vor Pass 1): `git diff main...HEAD --stat`, alle geänderten Files identifizieren, Spec+Plan querlesen
  - Phase B — Spec/Plan ↔ Code-Mapping (für Pass-1-Vorbereitung)
  - Phase C — KPI-Snapshot-Existenz (pre + post in `metrics/kpi-history.json`)
  - Phase D — Playwright-Capture-Artefakte (pre + post in `metrics/playwright/`)
  - Phase E — `pnpm check` grün als Vorbedingung
  - Phase F — Edge-Cases aus Spec §11.3 / §6 manuell durchquert
  - Phase G — CLAUDE.md Implementation-Workflow Phase 1 + Phase 4 ausgeführt (Snapshots erfasst)
  - Phase H — Stop-Kriterien klar für die kommenden Sub-Agent-Pässe

  **Pro Phase A–H:** Bullet-Liste mit Checkboxes, jeweils ~5–8 Items.

- [ ] **Step 2: Phase Z mit 6 Sub-Agent-Pass-Prompts**

  Vollständige Pass-Prompts (1:1 aus Spec §3.7 Skelette ausformulieren, je Pass ~600–800 Wörter):
  - **Pass 1 — Spec/Plan ↔ Code-Coverage** (siehe Spec §3.7 Pass 1)
  - **Pass 2 — Architektur + ADRs + Conventions** (siehe Spec §3.7 Pass 2; ADR-0009 ergänzen wenn nicht schon in Spec)
  - **Pass 3 — Wartbarkeits-KPIs** (siehe Spec §3.7 Pass 3; Sub-Agent ruft `pnpm kpi:report` auf)
  - **Pass 4 — Test-Tiefe + TDD-Compliance** (siehe Spec §3.7 Pass 4)
  - **Pass 5 — UX + Funktional via Playwright (Two-Stage)** (siehe Spec §3.7 Pass 5; Hinweis: Sub-Agent liest nur Artefakte aus `metrics/playwright/`, Hauptagent capturt sie)
  - **Pass 6 — Release-Readiness + Restrisiko** (siehe Spec §3.7 Pass 6; Pass-6-Befund "CARD_VERSION/hacs.json sync" ist `[USER-DECISION]`, NICHT `[AUTO-FIX]`)

  **Pro Pass:** Rolle, Pass-Nummer, Brille, Lese-Quellen, konkrete Aufgabe, Beweisführungs-Pflicht (gemeinsame Regeln), Finding-Kategorien (gemeinsame Regeln: AUTO-FIX/FIX-PLAN/USER-DECISION/VERIFY-NEEDED/LESSON-LEARNED), Output-Format, Top-3-Code-Blocker, Empfehlung.

- [ ] **Step 3: Iterations-Loop-Beschreibung am Ende**

  Analog `plan-review-checklist.md` Phase Z Iterations-Loop:
  - Sequentiell, nicht parallel
  - Pro Pass: dispatch → Findings als TaskCreate → Trust-but-Verify → AUTO-FIX inline / FIX-PLAN sammeln / USER-DECISION sammeln / VERIFY-NEEDED prüfen / LESSON-LEARNED appenden zu `docs/lessons-learned.md`
  - Nach 6 Pässen einer Iteration: FIX-PLAN umsetzen (mini-Sub-Plan via `superpowers:writing-plans` + `subagent-driven-development`) → neuer Post-Snapshot → Iteration N+1
  - Stop-Kriterien: 2 Iterationen ohne neue AUTO-FIX/FIX-PLAN, nur USER-DECISION, max 3 Iterationen
  - ADR-Check vor User-Vorlage
  - User-Vorlage bündelt: USER-DECISION + KPI-Delta + Playwright-Artefakte + Lessons-Liste + ADR-Vorschläge

- [ ] **Step 4: Verifizieren — Datei vorhanden, Phase Z mit allen 6 Pass-Prompts**

  ```bash
  grep -c "Pass [1-6]" docs/templates/code-review-checklist.md
  ```

  Erwartet: ≥ 12 (jeder Pass mindestens 2-mal erwähnt: Header + Verweis).

- [ ] **Step 5: LOC-Sanity**

  ```bash
  wc -l docs/templates/code-review-checklist.md
  ```

  Erwartet: ~500–800 Zeilen (Phase Z dominiert).

### Task 3.2: `docs/lessons-learned.md` anlegen

**Files:**

- Create: `docs/lessons-learned.md`

- [ ] **Step 1: Header + Curation-Workflow-Erklärung**

  ````markdown
  # Lessons Learned

  > **Append-only Hot-Pot** für Code-Review-Erkenntnisse. Jeder Eintrag wird vom Eigentümer (@griebner) curiert: in `conventions.md` / `architecture.md` übernehmen, neuer ADR, Plan-/Spec-Template-Update, oder verwerfen.
  >
  > **Promotierte Einträge bekommen ein `PROMOTED`-Tag** statt gelöscht zu werden — Herkunft bleibt traceable für spätere Archäologie (z. B. "wann haben wir bemerkt, dass `unsafeCSS` für raw-CSS-Strings nötig ist?").
  >
  > **Spec- und Plan-Dokumente werden retroaktiv NIE angefasst** — sie sind historisches Protokoll der Entscheidungen vor Implementation. Erkenntnisse aus Implementation und Code-Review fließen in diese Datei, nicht in Spec/Plan-Files.
  >
  > **Eintrags-Format:**
  >
  > ```markdown
  > ### LESSON: <Kurz-Titel> (YYYY-MM-DD, Plan: <plan-id>)
  >
  > **Quelle:** Code-Review Pass <N>, Finding <ID>
  > **Beobachtet:** `<datei:zeile>` — was passierte
  > **Fix im Code:** kurz beschreiben (oder Verweis auf Commit-SHA)
  > **Lehre für nächstes Mal:** was sollte bei künftigen Spec/Plan/Implementation berücksichtigt werden?
  > **Promotion-Kandidat:** `conventions.md §X` / neuer ADR / `plan-template.md` Phase Y / verwerfen
  > **Status:** offen | PROMOTED zu <ziel> | VERWORFEN (mit Grund)
  > ```

  ---

  ## Pro Plan-Datum gruppiert

  _(Erster Eintrag wird beim ersten Code-Review-Run angelegt.)_
  ````

- [ ] **Step 2: Verifizieren**

  ```bash
  head -30 docs/lessons-learned.md
  ```

  Erwartet: 30 Zeilen Markdown, Header `# Lessons Learned`, dann Curation-Workflow-Block.

### Task 3.3: Phase-3-Commit

- [ ] `pnpm check` grün
- [ ] `git add docs/templates/code-review-checklist.md docs/lessons-learned.md`
- [ ] `git commit` mit Commit-Vorlage aus Phase-Header

---

## Phase 4 — Cross-Reference ADR-0012 → ADR-0021 (Commit 5)

**Commit-Vorlage:**

```
docs(adr): cross-ref ADR-0012 → ADR-0021 (code-review extends smoke-test gate)

1-Zeilen-Cross-Reference in `## Verlinkte Spec-Sektionen / Referenzen`-Block
am Ende von ADR-0012. Sub-Spec 2026-05-15 etabliert Code-Review-Workflow
als zweite, tiefere Pre-Release-Stufe nach Smoke-Test.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
```

### Task 4.1: ADR-0012 Cross-Reference

**Files:**

- Modify: `docs/adr/0012-headless-smoke-test-pre-release-gate.md`

- [ ] **Step 1: Existierende Sektion lokalisieren**

  ```bash
  grep -n "Verlinkte Spec-Sektionen" docs/adr/0012-headless-smoke-test-pre-release-gate.md
  ```

  Erwartet: 1 Zeile mit dem Sektionsheader.

- [ ] **Step 2: 1-Zeilen-Eintrag in den existierenden Block einfügen**

  Diff (Beispiel — exakte Position abhängig vom letzten Bullet-Eintrag):

  ```diff
   ## Verlinkte Spec-Sektionen / Referenzen

   * Plan Task 5.5 (`scripts/smoke-test.mjs`)
   * Plan Task 0.1 (CI-Workflow mit Smoke-Step)
   * Plan Phase 0.2 (M1-Reference-Comparison als Komplement)
  +* [ADR-0021](./0021-code-review-workflow-pre-release-gate.md) — Code-Review-Workflow erweitert das Smoke-Test-Gate um Post-Implementation-6-Brillen-Review
  ```

- [ ] **Step 3: Verifizieren**

  ```bash
  grep "0021" docs/adr/0012-headless-smoke-test-pre-release-gate.md
  ```

  Erwartet: 1 Zeile mit Link auf `0021-code-review-workflow-pre-release-gate.md`.

### Task 4.2: Phase-4-Commit

- [ ] `pnpm check` grün
- [ ] `git add docs/adr/0012-headless-smoke-test-pre-release-gate.md`
- [ ] `git commit` mit Commit-Vorlage aus Phase-Header

---

## Phase 5 — CLAUDE.md + plan-template (Commit 6)

**Commit-Vorlage:**

```
docs: integrate code-review-workflow into CLAUDE.md + plan-template

CLAUDE.md bekommt neue Top-Level-Sektion "Code-Review — Workflow
(verbindlich)" zwischen "Implementation — Workflow" und "Module-Layer".
Doku-Karte erweitert um code-review-checklist.md, kpi.mjs,
kpi-history.json, lessons-learned.md. "Wo dokumentiere ich was?"-
Tabelle bekommt Zeilen für Lessons-Anlage und -Promotion.
Implementation-Workflow erweitert um Pre/Post-Snapshot-Schritte.

docs/templates/plan-template.md Standing-Requirement und Phases-
Beispiel um Pre/Post-Snapshot-Schritte erweitert, damit künftige Pläne
KPI-Snapshots erfassen.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
```

**Standing-Reminder Phase 5:** CLAUDE.md ist Projekt-Schnellreferenz. Neue Sektion analog zu "Spec-Erstellung" und "Plan-Erstellung" strukturieren (Phase 1 Discovery, Phase 2 Workflow, Phase 3 Self-Review, Phase 4 Sub-Agent-Pässe, Phase 5 ADR-Check + User-Vorlage). Sprache DE (conv §15).

### Task 5.1: CLAUDE.md "Code-Review — Workflow (verbindlich)" Sektion

**Files:**

- Modify: `CLAUDE.md`

- [ ] **Step 1: Einfüge-Position lokalisieren**

  ```bash
  grep -n "## Implementation — Workflow\|## Module-Layer" CLAUDE.md
  ```

  Erwartet: 2 Zeilen. Neue Sektion wird zwischen diesen beiden eingefügt.

- [ ] **Step 2: Neue Sektion mit 5 Phasen (~100 Zeilen, analog Spec/Plan-Erstellung)**

  Pflicht-Inhalt:
  - Block-Header `## Code-Review — Workflow (verbindlich)`
  - Erkenntnis-Einleitung: Spec/Plan-Review vor Implementation, Smoke-Test vor Release; Code-Review schließt die Lücke dazwischen
  - **Phase 1 — Pre-Snapshot (vor Implementation):** `pnpm check && pnpm build && pnpm test:coverage && pnpm kpi:snapshot --label pre-<plan-id> --phase pre`. Playwright-Capture-Stufe-1 mit konkretem Trap-Pattern:
    ```bash
    PREVIEW_PID=$(pnpm preview > /tmp/preview.log 2>&1 & echo $!)
    trap "kill $PREVIEW_PID 2>/dev/null" EXIT INT TERM
    # MCP browser_navigate → browser_wait_for "ha-card" → browser_console_messages → browser_snapshot → browser_evaluate
    # Hauptagent schreibt Artefakt explizit via Write-Tool nach metrics/playwright/<plan-id>-pre.json
    # (NICHT auf MCP-Default-Pfad .playwright-mcp/ verlassen — der ist gitignored)
    kill $PREVIEW_PID
    ```
  - **Phase 2 — Implementation (unverändert, siehe "Implementation — Workflow")**
  - **Phase 3 — Post-Snapshot (nach letztem Implementation-Task):** dito `--label post-<plan-id> --phase post` + Playwright-Capture
  - **Phase 4 — Self-Review + 6-Pass-Iteration:**
    - Self-Review-Phasen A–H aus `docs/templates/code-review-checklist.md` durcharbeiten
    - 6 Sub-Agent-Pässe sequentiell mit rotierenden Fokus-Vektoren (siehe Pass-Reihenfolge unten)
    - Pro Pass: AUTO-FIX inline (Trust-but-Verify) / FIX-PLAN sammeln / USER-DECISION sammeln / VERIFY-NEEDED prüfen / LESSON-LEARNED appenden
    - Nach 6 Pässen einer Iteration: FIX-PLAN → mini-Sub-Plan via writing-plans + subagent-driven → Iteration N+1
    - Stop: 2 Iterationen ohne neue Findings, oder nur USER-DECISION offen, oder max 3 Iterationen
  - **Phase 5 — ADR-Check + User-Vorlage:**
    - Hauptagent scannt Findings + Lessons → ADR-würdig?
    - User-Vorlage bündelt: USER-DECISION + KPI-Delta + Playwright-Artefakte + neue Lessons + ADR-Vorschläge
  - **Phase 6 — `finishing-a-development-branch`** (existierender Skill)

  Pass-Reihenfolge-Tabelle (analog Spec/Plan-Sektionen):

  | Pass | Fokus                              | Was prüft die Brille                                                                       |
  | ---- | ---------------------------------- | ------------------------------------------------------------------------------------------ |
  | 1    | Spec/Plan ↔ Code-Coverage          | Wurde alles aus Spec §3 und Plan-Tasks 1:1 umgesetzt? Drift?                               |
  | 2    | Architektur + ADRs + Conventions   | Layer-Boundaries (Doppel-Check), Anti-Patterns conv §11, ADR-Compliance, Imports, Comments |
  | 3    | Wartbarkeits-KPIs (skript-basiert) | `pnpm kpi:report` Delta pre→post; Threshold-Verstöße; Type-Safety-Drift                    |
  | 4    | Test-Tiefe + TDD-Compliance        | Edge-Cases, TDD-Order via `git log`, `it.each`, Coverage-Lücken                            |
  | 5    | UX + Funktional via Playwright     | Hauptagent: MCP-Capture; Sub-Agent: Artefakt-Analyse + Spec §9                             |
  | 6    | Release-Readiness + Restrisiko     | Bundle, smoke, check, Doku, HACS-Bump (USER-DECISION), Rollback                            |

  Iterations-Anzahl: max 3 × 6 = bis 18 Sub-Agent-Pässe + Fix-Pläne.

  Anti-Patterns-Liste am Ende: ❌ parallel-Dispatch (analog Spec/Plan), ❌ FIX-PLAN ohne mini-Sub-Plan-Disziplin, ❌ Edits an docs/specs oder docs/plans (Spec/Plan sind historisch).

- [ ] **Step 3: Verifizieren**

  ```bash
  grep -n "## Code-Review — Workflow" CLAUDE.md
  wc -l CLAUDE.md
  ```

  Erwartet: 1 neue Header-Zeile, CLAUDE.md wächst um ~100 Zeilen.

### Task 5.2: CLAUDE.md Doku-Karte erweitern

**Files:**

- Modify: `CLAUDE.md`

- [ ] **Step 1: Doku-Karte-Tabelle lokalisieren**

  ```bash
  grep -n "Doku-Karte\|Was suchst du" CLAUDE.md
  ```

- [ ] **Step 2: 4 neue Zeilen ergänzen**

  Diff (Beispiel — exaktes Pattern aus existierender Tabelle ablesen):

  ```diff
   | **Spec-Vorlage (neue Subspec schreiben)** | [`docs/templates/spec-template.md`](./docs/templates/spec-template.md)                                                 |
   | **Spec-Review-Checkliste** (vor Vorlage)  | [`docs/templates/spec-review-checklist.md`](./docs/templates/spec-review-checklist.md)                                 |
   | **Plan-Vorlage (Implementation-Plan)**    | [`docs/templates/plan-template.md`](./docs/templates/plan-template.md)                                                 |
   | **Plan-Review-Checkliste** (vor Vorlage)  | [`docs/templates/plan-review-checklist.md`](./docs/templates/plan-review-checklist.md)                                 |
  +| **Code-Review-Checkliste** (post-Implementation) | [`docs/templates/code-review-checklist.md`](./docs/templates/code-review-checklist.md)                          |
  +| **KPI-Skript (Wartbarkeits-Snapshots)**   | [`scripts/kpi.mjs`](./scripts/kpi.mjs)                                                                                |
  +| **KPI-Historie**                          | [`metrics/kpi-history.json`](./metrics/kpi-history.json)                                                              |
  +| **Lessons-Learned-Hot-Pot**               | [`docs/lessons-learned.md`](./docs/lessons-learned.md)                                                                |
  ```

  Spalten-Alignment erhalten.

### Task 5.3: CLAUDE.md "Wo dokumentiere ich was?"-Tabelle erweitern

**Files:**

- Modify: `CLAUDE.md`

- [ ] **Step 1: Tabelle lokalisieren**

  ```bash
  grep -n "Wo dokumentiere ich was" CLAUDE.md
  ```

- [ ] **Step 2: 2 neue Zeilen ergänzen**

  Diff:

  ```diff
   | einen **Bug** fixt                                                                     | Commit + Test, keine Doku-Pflicht                                                                                                       |
  +| eine **Erkenntnis aus Code-Review** dokumentierst                                     | `docs/lessons-learned.md` (append, NICHT Edit von Spec/Plan)                                                                            |
  +| eine **Lessons-Eintrag in Convention/ADR promotest**                                  | User-curiert: conv.md / neuer ADR / plan-template.md; Lessons-Eintrag bekommt `PROMOTED`-Tag                                            |
   | eine neue **Subspec** für ein Feature schreibst                                        | **Workflow zwingend** — siehe „Spec-Erstellung" unten; `docs/specs/YYYY-MM-DD-<topic>.md`                                               |
  ```

### Task 5.4: CLAUDE.md "Implementation — Workflow"-Sektion erweitern

**Files:**

- Modify: `CLAUDE.md`

- [ ] **Step 1: Sektion finden**

  ```bash
  grep -n "## Implementation — Workflow\|Phase 1 — Todo-Liste" CLAUDE.md
  ```

- [ ] **Step 2: Neue Sub-Phase **vor** "Phase 1 — Todo-Liste aus Plan upfront aufbauen" einfügen**

  ```markdown
  **Phase 0 — Pre-Plan-Snapshot (verbindlich, vor erstem TaskCreate):**

  Vor dem TaskCreate-Batch zur Plan-Abarbeitung muss der Hauptagent einen KPI-Snapshot und ein Playwright-Capture erfassen:

  1. `pnpm check && pnpm build && pnpm test:coverage` (Voraussetzungen für Coverage- und Bundle-Werte)
  2. `pnpm kpi:snapshot --label pre-<plan-id> --phase pre` (appendet an `metrics/kpi-history.json`)
  3. Playwright-Capture-Stufe-1 (siehe Code-Review-Workflow Phase 1 für Detail-Pattern mit Trap)
  4. Sichtbares Output: "Pre-Snapshot pre-<plan-id> erfasst. KPI-Baseline: <files>, <loc>, ..."

  Erst dann Phase 1 (TaskCreate-Batch).
  ```

  Und nach "Phase 4 — Abschluss" eine neue Phase ergänzen:

  ```markdown
  **Phase 5 — Post-Plan-Snapshot + Code-Review (verbindlich, vor finishing-a-development-branch):**

  Nach letztem TaskUpdate auf `completed` und `pnpm check` + `pnpm smoke` grün:

  1. `pnpm build && pnpm test:coverage`
  2. `pnpm kpi:snapshot --label post-<plan-id> --phase post`
  3. Playwright-Capture-Stufe-1 (post)
  4. Code-Review-Workflow starten (siehe "Code-Review — Workflow (verbindlich)")
  5. Erst nach Code-Review-Stop-Kriterium: `superpowers:finishing-a-development-branch`
  ```

  CLAUDE.md aktueller "Implementation — Workflow"-Block hat Phasen 1/2/3/4 (TaskCreate / Abarbeitung / Anpassung / Abschluss). Diese werden umnummeriert: alte Phase 1 → neue Phase 1 (bleibt), alte Phase 2 → 2, alte Phase 3 → 3, alte Phase 4 (Abschluss) → 6. NEU dazwischen: Phase 0 (Pre-Snapshot, vor altem Phase 1) und Phase 5 (Post-Snapshot + Code-Review, vor altem Phase 4).

  Endgültige Phase-Numbering: 0 Pre-Snapshot → 1 TaskCreate → 2 Abarbeitung → 3 Anpassung → 4 (alte Phase 4 weicht auf 6) → 5 Post-Snapshot + Code-Review → 6 Abschluss (finishing-a-development-branch).

  Aktuelle CLAUDE.md-Phase-Header-Diff exakt formulieren.

### Task 5.5: `docs/templates/plan-template.md` erweitern

**Files:**

- Modify: `docs/templates/plan-template.md`

- [ ] **Step 1: Standing-Requirement-Block lokalisieren**

  ```bash
  grep -n "Standing Requirement\|Phases:" docs/templates/plan-template.md
  ```

- [ ] **Step 2: Pre-/Post-Snapshot-Hinweise im Standing-Requirement-Block ergänzen**

  Vor der existierenden Bullet-Liste oder als zusätzliche Bullets:

  ```markdown
  > 🛑 ... (existierende Bullets)
  >
  > **KPI-Snapshot-Pflicht (siehe `CLAUDE.md` "Code-Review — Workflow"):**
  >
  > - Vor erstem Task: `pnpm kpi:snapshot --label pre-<plan-id> --phase pre`
  > - Nach letztem Task: `pnpm kpi:snapshot --label post-<plan-id> --phase post`
  > - Code-Review-Workflow läuft danach VOR finishing-a-development-branch
  ```

- [ ] **Step 3: Phases-Block-Beispiel um Pre/Post erweitern**

  Diff:

  ```diff
   **Phases:**

  +- Phase 0. **KPI-Pre-Snapshot + Playwright-Capture** (verbindlich, vor erstem Task)
   - Phase 0. [Vorab-Gates: Spike, ADR-Anlage] ([N] tasks)
   - Phase 1. [Foundation] ([N] tasks)
   - Phase 2. [...] ([N] tasks)
   - Phase 3. [Doku + Verifikation] ([N] tasks)
  +- Phase N+1. **KPI-Post-Snapshot + Code-Review-Workflow** (verbindlich, nach letztem Task)
  ```

  (Phase-Numbering ist Beispiel — der Planer setzt konkrete Nummern beim Befüllen.)

- [ ] **Step 4: Verifizieren**

  ```bash
  grep -c "kpi:snapshot" docs/templates/plan-template.md
  ```

  Erwartet: ≥ 2 (Standing-Requirement + Phases-Beispiel).

### Task 5.6: Phase-5-Commit

- [ ] `pnpm check` grün
- [ ] `git add CLAUDE.md docs/templates/plan-template.md`
- [ ] `git commit` mit Commit-Vorlage aus Phase-Header

---

## Phase 6 — End-to-End-Verifikation + Baseline + Final-Commit (Commit 7)

**Commit-Vorlage:**

```
chore(metrics): end-to-end verification + initial baseline KPI snapshot

Vollständiger Workflow-Trockenlauf mit Dummy-Plan: pre+post-Snapshots,
6 Sub-Agent-Pässe (Trockendurchgang ohne echte Findings), Lessons-Datei
bereit. Initial-Baseline-Snapshot appendet als Referenz für künftige
Pläne.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
```

**Standing-Reminder Phase 6:** Diese Phase IST die Verifikation des gesamten Workflows. Bei Fehlern hier: Bug im KPI-Skript oder in der Workflow-Doku — NICHT autonom durchwinken.

### Task 6.1: Full-Pipeline-Grün-Check

- [ ] `pnpm check` (lint + typecheck + test) grün
- [ ] `pnpm build` grün, Bundle ≤ 60 kB (`stat -c%s dist/custom-energy-flow-card.js`)
- [ ] `pnpm build:analyze` grün, kein neuer verbotener Import
- [ ] `pnpm smoke` grün (ADR-0012-Smoke-Test mit aktueller Geometrie)
- [ ] `wc -l src/**/*.ts` zeigt KEINE Änderung gegenüber Plan-Start (Spec ändert kein `src/`)

### Task 6.2: KPI-Skript-Sanity-Walkthrough

- [ ] **Step 1: Aktuell ist `metrics/kpi-history.json` `[]`. Initial Snapshot:**

  ```bash
  pnpm kpi:snapshot --label baseline-2026-05-15 --phase manual
  ```

  Erwartet: `✓ Snapshot "baseline-2026-05-15" (phase=manual) appendet`.

- [ ] **Step 2: Snapshot-Inhalt manuell plausibilisieren**

  ```bash
  node -e "
    const d = JSON.parse(require('fs').readFileSync('metrics/kpi-history.json','utf8'))[0];
    console.log('files:', d.totals.files);
    console.log('loc:', d.totals.loc);
    console.log('bundle:', d.totals.bundle_bytes, '(≤', 60*1024, ')');
    console.log('custom_elements:', d.totals.custom_elements_count, '(erwartet 2)');
    console.log('editor.ts loc:', d.files.find(f => f.path === 'src/editor.ts').loc, '(erwartet ~405)');
    console.log('any_count:', d.totals.any_count);
    console.log('coverage_pct:', d.totals.coverage_pct);
    console.log('violations.loc_exceeds_limit:', JSON.stringify(d.violations.loc_exceeds_limit));
    console.log('violations.custom_elements_not_2:', d.violations.custom_elements_not_2);
  "
  ```

  Erwartete Outputs:
  - `files: 34` (oder ähnlich, Repo-Stand)
  - `loc: ~3000–4000`
  - `bundle: <60*1024`
  - `custom_elements: 2`
  - `editor.ts loc: > 400` (heute ~405 — Wert kann durch Whitespace-Trim minimal variieren)
  - `violations.loc_exceeds_limit` enthält einen Eintrag mit `path: "src/editor.ts"` und `loc > limit=400` (USER-DECISION resolved: known-Drift, akzeptiert)
  - `violations.custom_elements_not_2: false`

  **STOP-Condition:** Falls `custom_elements != 2`, oder `editor.ts loc` nicht im `loc_exceeds_limit`-Array auftaucht: Bug, debuggen.

### Task 6.3: End-to-End-Workflow-Trockenlauf

**Hinweis:** "Workflow-Trockenlauf" heißt: KPI-Snapshot- und Report-Mechanik wird verifiziert. Die echten 6 Sub-Agent-Pässe können hier NICHT durchlaufen werden (kein echter Code-Diff zu reviewen, kein echter Plan abgeschlossen). Die Sub-Agent-Pass-Mechanik wird durch den **ersten echten Code-Review-Run nach diesem Plan** verifiziert (= bei nächstem Subspec, der diesen Workflow nutzt). Plan-Spec §11-Bullet "alle 6 Pässe laufen" ist hier als "Workflow-Infrastruktur ist da und bereit für die 6 Pässe" zu lesen — Verifikation der Infrastruktur, nicht echte Sub-Agent-Dispatch.

- [ ] **Step 1: Simuliere Pre-Snapshot eines Dummy-Plans**

  ```bash
  pnpm kpi:snapshot --label pre-2026-05-15-dummy --phase pre
  ```

- [ ] **Step 2: Simuliere "kein Code geändert", direkter Post-Snapshot**

  ```bash
  pnpm kpi:snapshot --label post-2026-05-15-dummy --phase post
  ```

- [ ] **Step 3: Delta-Report soll Drift = 0 zeigen**

  ```bash
  pnpm kpi:report
  ```

  Erwartet: `=== KPI Delta: pre-2026-05-15-dummy → post-2026-05-15-dummy ===`, alle Werte mit `+0` oder `(=)`, `Threshold-Verstöße (NEU): (keine)`.

  **STOP-Condition:** Falls Drift ≠ 0 bei unverändertem Code: Skript ist nicht-deterministisch (z. B. Timestamp-Vergleich falsch). Debuggen.

- [ ] **Step 4: Synthetische Threshold-Verletzung verifizieren (Spec §6.1 Akzeptanz 4)**

  Temporär eine Datei mit künstlich hoher Komplexität anlegen und prüfen, dass das KPI-Skript sie meldet. **Trap-basierter Cleanup zwingend**, damit das Test-Artefakt bei Skript-Crash sicher entfernt wird (sonst bricht nachfolgender `pnpm check`):

  ```bash
  # Trap-Cleanup ZUERST setzen, dann erst Datei anlegen:
  trap "rm -f src/util/kpi-fixture.ts /tmp/kpi-fixture.ts" EXIT INT TERM

  cat > /tmp/kpi-fixture.ts <<'EOF'
  export function ohneSinn(x: number, y: number, z: number, w: number, q: number): number {
    if (x > 0) if (y > 0) if (z > 0) if (w > 0) if (q > 0) return 1;
    if (x < 0) if (y < 0) if (z < 0) return 2;
    return x && y && z || w && q ? 3 : 4;
  }
  EOF
  cp /tmp/kpi-fixture.ts src/util/kpi-fixture.ts
  pnpm kpi 2>/dev/null | node -e "
    let d = '';
    process.stdin.on('data', c => d += c);
    process.stdin.on('end', () => {
      const snap = JSON.parse(d);
      const hits = snap.violations.complexity_above_10.filter(v => v.path === 'src/util/kpi-fixture.ts');
      const paramHits = snap.violations.params_above_4.filter(v => v.path === 'src/util/kpi-fixture.ts');
      console.log('complexity hits:', hits.length, JSON.stringify(hits));
      console.log('params hits:', paramHits.length, JSON.stringify(paramHits));
      process.exit(hits.length > 0 && paramHits.length > 0 ? 0 : 1);
    });
  "
  echo "exit=$?"
  # Cleanup geschieht via trap (oben) — explizites rm hier nicht nötig, aber
  # zur Klarheit redundant ausführen:
  rm -f src/util/kpi-fixture.ts /tmp/kpi-fixture.ts
  ```

  Erwartet: `complexity hits: ≥1` und `params hits: ≥1` und `exit=0`. Beweist, dass KPI-Skript synthetische Verstöße erkennt.

  **Verifikations-Check nach Cleanup:** `ls src/util/kpi-fixture.ts 2>&1` muss `No such file or directory` zeigen. Falls die Datei noch da ist: manuell `rm` und `pnpm check` ausführen bevor Phase weitergeht.

  **STOP-Condition:** Falls keine Hits: Skript-Bug, vor Commit fixen.

- [ ] **Step 5: Rollback der Dummy-Snapshots, Baseline behalten**

  ```bash
  node -e "
    const fs = require('fs');
    const h = JSON.parse(fs.readFileSync('metrics/kpi-history.json','utf8'));
    const cleaned = h.filter(s => !s.label.includes('dummy'));
    fs.writeFileSync('metrics/kpi-history.json', JSON.stringify(cleaned, null, 2) + '\n', 'utf8');
  "
  pnpm kpi:report 2>&1 | head -2 || true  # nur 1 Snapshot (baseline) → Fehler erwartet
  ```

  Erwartet: `kpi.mjs: Mindestens 2 Snapshots in History für Delta-Report nötig` (Skript-Validierung greift).

### Task 6.4: Lessons-Datei initialisiert prüfen

- [ ] **Step 1: `docs/lessons-learned.md` hat Header + Curation-Workflow, sonst leer**

  ```bash
  wc -l docs/lessons-learned.md
  ```

  Erwartet: ~25–40 Zeilen (Header + Format-Beispiel + Placeholder-Zeile).

- [ ] **Step 2: Keine "echten" Lessons noch — Datei wartet auf ersten Code-Review-Run**

### Task 6.5: Final-Verifikation Plan-Erfolgs-Kriterien (Spec §11)

Pro Spec §11-Bullet abhaken:

- [ ] `scripts/kpi.mjs` existiert und exportiert kein `default`
- [ ] `pnpm kpi` produziert JSON gegen Schema §3.3
- [ ] `pnpm kpi:snapshot --label test --phase manual` appendet validen Eintrag
- [ ] `pnpm kpi:report` vergleicht letzten zwei Einträge mit "=== KPI Delta:" Header
- [ ] `metrics/kpi-history.json` git-tracked, enthält Baseline-Eintrag (NICHT `[]` — Plan committet absichtlich den initial-baseline-Snapshot)
- [ ] `metrics/playwright/` git-tracked (`.gitkeep` allein, Inhalte werden vom ersten Code-Review-Run erzeugt)
- [ ] `docs/templates/code-review-checklist.md` existiert mit Phasen A–H + Phase Z (6 Sub-Agent-Pass-Prompts vollständig)
- [ ] `docs/lessons-learned.md` existiert mit Header + Curation-Workflow-Erklärung + leerem Body
- [ ] `docs/adr/0021-...md` existiert (Stub aus Spec §8 1:1)
- [ ] `docs/adr/README.md` indexiert ADR-0021 (im 3-Spalten-Tabellen-Format)
- [ ] `docs/architecture.md` §4 enthält ADR-0021 mit Kurz-Begründung
- [ ] `CLAUDE.md` hat neue Sektion "Code-Review — Workflow (verbindlich)" zwischen "Implementation — Workflow" und "Module-Layer"
- [ ] `CLAUDE.md` Doku-Karte enthält Zeilen für code-review-checklist.md, kpi.mjs, kpi-history.json, lessons-learned.md
- [ ] `CLAUDE.md` "Implementation — Workflow"-Sektion enthält Pre-/Post-Snapshot-Schritte
- [ ] `package.json` Scripts `kpi`, `kpi:snapshot`, `kpi:report` enthalten, existierende Scripts unverändert
- [ ] `package.json` `engines.node: ">=20"` ergänzt
- [ ] `.gitignore` ignoriert `metrics/` NICHT (entweder fehlt der Pattern, oder explizites `!metrics/`)
- [ ] `vitest.config.ts` `coverage.reporter: ['text', 'json-summary']` ergänzt
- [ ] `pnpm check` grün (lint + typecheck + tests)
- [ ] `pnpm smoke` grün (ADR-0012 Smoke-Test unverändert)
- [ ] `pnpm build` Bundle ≤ 60 kB minified (unverändert, da kein `src/`-Edit)
- [ ] **LOC-Regression-Check:** `wc -l src/**/*.ts` zeigt **keine** Änderung vs Plan-Start (Spec ändert kein `src/`)
- [ ] **Unverändert-Check:** `git diff main...HEAD -- src/` ist leer
- [ ] **End-to-End-Verifikation Infrastruktur** (Plan-Schritt 6.3): Snapshot-Mechanik + Threshold-Detection funktionieren — echte 6-Pass-Sub-Agent-Dispatch wird beim ersten realen Plan-Run nach diesem Plan stattfinden

### Task 6.6: Phase-6-Commit + Plan-Abschluss

- [ ] `git add metrics/kpi-history.json` (baseline-Eintrag committed; dummy-Einträge bereits rollbacked)
- [ ] `git status` zeigt nur committable changes
- [ ] `git commit` mit Commit-Vorlage aus Phase-Header
- [ ] **Plan abgeschlossen** — wechseln zu `superpowers:finishing-a-development-branch` für Release/Merge/PR-Entscheidung

---

## Self-Review-Checkliste (vor Plan-Abschluss — Hauptagent durchgeht)

- [ ] **Spec-Coverage:** Spec §X.Y → Plan-Task explizit gemappt (siehe Plan-Header) — jede Spec-Sektion hat ≥1 Task ✓
- [ ] **Spec-Plan-Alignment:** Plan widerspricht Spec nirgends; USER-DECISIONs aus Spec übernommen
- [ ] **Keine Placeholders** (`TBD`/`TODO`/`Similar-to`) — alle Code-Snippets vollständig in Plan-Tasks
- [ ] **Type-Consistency:** Funktions-Signaturen konsistent zwischen Tasks (z. B. `analyzeFile(relPath, program)` identisch in 2.2/2.3/2.4/2.5)
- [ ] **Commit-Granularität:** 6 Phasen = 6 Commits (oder 7 falls 5.x als 3 Sub-Commits)
- [ ] **Verifikations-Pipeline:** typecheck → lint → test → coverage → check → build → preview/smoke ✓ pro Phase
- [ ] **Don't-Touch-Liste (Spec §0.4):** kein Plan-Task ändert eines der Elemente — keine `src/`-Edits, keine bestehenden Skripte
- [ ] **Code-Reuse-Tabelle (Spec §3.6):** `typescript` als DevDep-Import, `node:*` builtins genutzt
- [ ] **Anti-Patterns (Spec §3.6):** ein `ts.createProgram` (Task 2.2 Step 2), keine Inline-Threshold-Werte (Task 2.1 Step 1 const-Block), keine 1:1-Kopien von Plan-Review-Prompts (Task 3.1 Step 2)
- [ ] **Standing-Reminder pro Phase:** Conventions+ADRs in Phase-Headern erwähnt
- [ ] **TDD-Order:** N/A — Spec ändert kein `src/`-Code; TDD-Konzept ist via End-to-End-Verifikation in Task 6.x abgedeckt (Skript-Output validiert)
- [ ] **STOP-Conditions:** Task 2.5 Step 6, Task 6.2 Step 2, Task 6.3 Step 3 (jeweils explizit "STOP, debuggen")
- [ ] **Framework-Quirks** abgedeckt: Lit-Decorator-`experimentalDecorators` in Task 2.2 Step 2 + Spec §3.2 Code-Block
- [ ] **Build-Pipeline:** vitest.config.ts 1-Liner in Task 2.7 Step 3, package.json scripts + engines in 2.7 Step 1-2, .gitignore in Task 1.2
- [ ] **Doku-Pflicht (conv §12):** ADR-0021 (Phase 0) + ADR-Index + architecture.md §4 ✓; CLAUDE.md (Phase 5) ✓; README.md NICHT angefasst (out-of-scope, kein User-facing-Change)

---

## Out of Scope (nicht Teil dieses Plans)

Aus Spec §2.2 Non-Goals und Spec §9.2 Out-of-Scope:

- Per-Phasen-Quality-Gate (nur ein Review am Plan-Ende)
- KPI-Dashboard-UI (HTML-Report aus History) — v1.x
- Visual-Regression-Screenshots — Spec §9 Light-Modus
- Interaktions-Test-Scripts via Playwright — brittle
- Per-Commit-KPI-Tracking — nur Pre/Post-Plan
- History-Pruning — append-only bleibt
- Cross-Browser-Tests — nur Chromium via MCP
- CI-Integration der KPI-Skripte
- Slack-/Email-Notifications
- Lessons-Auto-Promotion in conventions/ADRs — User-curiert
- Refactor von `src/editor.ts` (405 LOC) — USER-DECISION resolved als known-Drift
- ADR-0022 für vitest-Reporter-Edit — USER-DECISION resolved als 1-Liner-mit-Commit-Begründung

---

## Notizen für den Implementierer

1. **`scripts/kpi.mjs` ist nicht Lint/Typecheck-gecheckt** — manuelle Style-Disziplin. Bei Unklarheit `scripts/smoke-test.mjs` als Vorbild lesen.

2. **Phase 2 Tasks 2.1–2.6 sind WIP-Iterationen** — können in 1 Commit (Task 2.8) gebündelt werden, oder als 3 Sub-Commits (2.1+2.2 / 2.3+2.4+2.5 / 2.6+2.7) falls Reviewer feinere Granularität wünscht. Empfohlen: 1 Commit (kleinster Diff für CI).

3. **Task 6.3 Step 4 (Rollback Dummy-Snapshots):** Wichtig, dass nur die `baseline-2026-05-15` in `kpi-history.json` bleibt. Sonst sieht der erste echte Plan-Pre-Snapshot Drift gegenüber Dummy-Daten.

4. **CLAUDE.md ist ein Living-Document** — bestehende Sektionen (z. B. "Implementation — Workflow") werden additiv erweitert, nicht ersetzt. Diff genau prüfen.

5. **ADR-0021 enthält Pros/Cons aller Optionen (A/B/C/D)** — 1:1 aus Spec §8 übernehmen, nicht abkürzen. ADR ist permanent traceable.

6. **Lessons-Datei bleibt nach Phase 6 leer (außer Header)** — erst der nächste Code-Review-Run füllt sie mit echten Einträgen.

7. **Falls Pass 5 (Playwright) bei künftigen Reviews fehlschlägt** (z. B. MCP-Verfügbarkeit): Sub-Agent-Output zeigt klar "Pass 5 skipped". Andere 5 Pässe laufen normal. Code-Review insgesamt bleibt gültig.

8. **Performance-Erwartung KPI-Skript:** ~2–4s cold pro Snapshot (TS-Compiler-Setup), ~6–10s pro `kpi:snapshot`-Run (mit Coverage- und Bundle-Reads). Wenn deutlich langsamer: TS-Program wird pro-Datei erstellt (Anti-Pattern) — debuggen.
