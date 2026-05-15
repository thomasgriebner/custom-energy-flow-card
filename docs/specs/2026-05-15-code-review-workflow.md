# Subspec — Code-Review-Workflow (Post-Implementation Quality-Gate)

**Status:** v6 (user-decisions resolved, ready for plan)
**Datum:** 2026-05-15
**Autor:** Brainstorming-Session mit @griebner
**Verlinkte Hauptspec:** [`2026-05-10-custom-energy-flow-card-design.md`](./2026-05-10-custom-energy-flow-card-design.md)
**Verlinkte Subspec(s):** Keine direkt — Workflow wirkt prozedural auf alle künftigen Pläne
**Berührte ADRs:** 0012 (Smoke-Test — Code-Review-Workflow stellt erweiterte zweite Pre-Release-Stufe), 0010 (Single-Source — Wartbarkeits-KPIs erzwingen sie)
**Neuer ADR benötigt:** ja → ADR-0021 (Code-Review-Workflow als Pre-Release-Quality-Gate)

## 0. Zusammenfassung

Etabliert einen verbindlichen Post-Implementation-Workflow für Code-Review, analog zu den bereits etablierten Spec- und Plan-Review-Workflows (CLAUDE.md). Drei Bausteine:

1. **Skript `scripts/kpi.mjs`** — produziert Wartbarkeits-KPIs (LOC, cyclomatic Komplexität, max-Nesting, Funktions-Länge, Params, Imports, Fan-In/Out, Escape-Hatch-Counter, Bundle-Bytes, Coverage pro Layer, dead-exports, intra-layer-Import-Cycles, Test-Lücken, Threshold-Verstöße) als JSON, append an Single-File-Historie `metrics/kpi-history.json`.
2. **Checklist `docs/templates/code-review-checklist.md`** — Self-Review-Phasen (A–H) + 6 rotierende Sub-Agent-Pass-Brillen (Spec/Plan↔Code-Coverage, Architektur+ADRs+Conventions, Wartbarkeits-KPIs skript-basiert, Test-Tiefe+TDD-Compliance, UX+Funktional via Playwright MCP, Release-Readiness+Restrisiko) mit 5 Finding-Kategorien (`AUTO-FIX`/`FIX-PLAN`/`USER-DECISION`/`VERIFY-NEEDED`/`LESSON-LEARNED`).
3. **Lessons-Datei `docs/lessons-learned.md`** — append-only Hot-Pot für Erkenntnisse, die der User später in `conventions.md` / neue ADRs / Plan-Templates promotet. **Spec- und Plan-Dokumente werden retroaktiv nie angefasst** — sie sind historisches Protokoll.

Der Workflow läuft pro Plan einmal: nach letztem Implementation-Task, vor `superpowers:finishing-a-development-branch`. KPI-Snapshots werden in zwei Phasen erfasst (pre = vor erstem Implementation-Task, post = nach letztem) — Delta zeigt direkten Effekt der Implementation auf die Codebase-Gesundheit. Iterations-Budget: max 3 vollständige Iterationen × 6 Pässe = bis 18 Sub-Agent-Runs.

Treiber: Spec/Plan-Review fängt Architektur-Probleme **vor** Implementation. Smoke-Test (ADR-0012) fängt Class-Load- und basic-Render-Smoke-Crashes **vor** Release (`scripts/smoke-test.mjs` setzt `hass`, prüft `shadowRoot` und SVG-`viewBox`-Interpolation, deckt aber keine A11y- oder Detail-DOM-Verifikation ab). Aber zwischen Implementation und Release fehlt ein systematischer Pass für Code-Qualität-Drift, Wartbarkeits-KPI-Trends und tiefere funktionale UI-Verifikation (A11y-Tree, alle key elements, Console-Cleanliness). Dieser Workflow schließt die Lücke.

### 0.0 TL;DR — Was der Planer NICHT tun darf

1. ❌ **Kein Edit an Sourcen unter `src/`** — die Spec etabliert nur Workflow-/Tooling-Infrastruktur. `src/` wird durch den **Workflow** geprüft, nicht durch ihn geändert.
2. ❌ **Keine neuen Runtime-Dependencies** (Lit bleibt einzige Runtime-Dep, ADR-0003). KPI-Skript nutzt ausschließlich `typescript` (bereits DevDep) + `node:*` builtins.
3. ❌ **Keine neuen DevDependencies** (`jscpd`, `madge`, `complexity-report` etc.) — der Workflow soll mit existierenden Tools auskommen. Conv §13 erlaubt sie zwar mit Commit-Body-Begründung, aber wir wollen sie hier nicht.
4. ❌ **Spec-/Plan-Dokumente nicht retroaktiv ändern**. Wenn Code von Spec abweicht und Code korrekt ist, ist das eine `LESSON-LEARNED` (für künftige Specs präziser werden), nicht ein Spec-Update.
5. ❌ **Existierende Skripte (`scripts/smoke-test.mjs`, `scripts/build-preview.mjs`, `scripts/build-spike-haicon-bundle.mjs`) nicht refactoren** — `scripts/kpi.mjs` wird als neuer, eigenständiger ES-Module-Skript angelegt.
6. ❌ **Keine Hooks in `package.json` (z. B. `prepublishOnly`)** — Workflow ist explizit-Agent-getrieben, nicht automatisch-bei-`pnpm-build`.
7. ❌ **Keine ESLint-Plugins/-Rules ergänzen** — Wartbarkeits-Checks laufen über das KPI-Skript, nicht via Lint.
8. ❌ **Keine zentrale `metrics/`-Pruning-Logik** — History wächst monoton. Pruning ist USER-DECISION nach erster Erfahrung.
9. ❌ **Keine Playwright-Test-Suite-Files** anlegen — Pass 5 nutzt Playwright **MCP** im Hauptagenten ad-hoc, nicht ein `.spec.ts` mit `@playwright/test`.
10. ❌ **Kein automatisches `git commit`** im KPI-Skript oder Workflow-Doku — Commits bleiben Hauptagent-getrieben.

### 0.1 Harte Constraints für den Planer

**ESLint-Layer-Zonen aus `.eslintrc.cjs`:** Diese Spec berührt **keine** `src/`-Files. Layer-Zonen sind nicht aktiv betroffen. Trotzdem zur Referenz (für den Planer bei Lektüre von `src/`-Files durch das KPI-Skript):

| Target        | Darf importieren aus (Auszug, authoritative ist `.eslintrc.cjs`)                                     |
| ------------- | ---------------------------------------------------------------------------------------------------- |
| `src/engine/` | `engine/*`, `util/memo.ts`, `util/warning-types.ts`                                                  |
| `src/config/` | `config/*`, `util`, `engine/types.ts`, `i18n`                                                        |
| `src/render/` | `render/*`, `util`, `engine/types.ts`, `engine/flow-graph.ts`, `config/types.ts`, `const.ts`, `i18n` |
| `src/util/`   | nur `util/*`                                                                                         |
| `src/i18n/`   | nur `i18n/*`                                                                                         |
| `src/ha/`     | `ha/*`, `config/types.ts`, `engine/types.ts`                                                         |

**Weitere Constraints:**

| Constraint                                          | Quelle                          | Konsequenz bei Verletzung                                                                                                                                                                                                                                                                                      |
| --------------------------------------------------- | ------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Keine neuen Runtime-Dependencies außer Lit          | ADR-0003                        | Bundle wächst, HACS-Constraint bricht                                                                                                                                                                                                                                                                          |
| Bundle-Budget ≤ 60 kB                               | Spec §10.2                      | Indirekt: KPI-Skript darf nichts touchen, das Bundle vergrößert                                                                                                                                                                                                                                                |
| Datei-Größen-Limits (`scripts/kpi.mjs` ≤ 400 LOC)   | diese Spec (analog `editor.ts`) | Konv §3 listet `scripts/` nicht; diese Spec dokumentiert 400 LOC als bewusste Ausnahme. Bei Überschreitung: Skript in mehrere `.mjs`-Module splitten                                                                                                                                                           |
| Style-Konsistenz statt `any` in `.mjs`-Skript       | conv §1.2 nicht 1:1 anwendbar   | `.mjs` kennt kein TypeScript-`any`-Keyword (in `.mjs` ist `any` eine normale Variable). ESLint ignoriert `*.mjs` (.eslintrc.cjs:75 `ignorePatterns: ['dist/', 'node_modules/', '*.cjs', '*.mjs']`). Style-Konsistenz wird durch Code-Review erzwungen — `unknown` statt loose typing wo Type-Skeleton sinnvoll |
| Conventional Commits                                | conv §8                         | Commits müssen `feat(scripts)`, `feat(docs)`, `docs(adr)` etc.                                                                                                                                                                                                                                                 |
| Sprache: Code-Identifier EN, User-Strings DE        | conv §15                        | Skript-Output (Reports): Deutsch oder Englisch konsistent                                                                                                                                                                                                                                                      |
| Smoke-Test (ADR-0012) bleibt unangetastet           | ADR-0012                        | `pnpm smoke` muss weiter grün laufen                                                                                                                                                                                                                                                                           |
| Pre-Commit-Hook (lint + format) bleibt unangetastet | conv §10                        | Husky/lint-staged-Konfig nicht touchen                                                                                                                                                                                                                                                                         |
| Single-Source: `package.json` Skripte additiv       | conv §12                        | Existierende Skripte (`dev`, `build`, `test`, `lint`, etc.) bleiben                                                                                                                                                                                                                                            |
| `metrics/` git-tracked, NICHT in `.gitignore`       | diese Spec                      | History würde sonst nicht über PRs sichtbar                                                                                                                                                                                                                                                                    |

**Weitere verbindliche Lese-Quellen für den Planer:**

- `CLAUDE.md` (Projekt-Schnellreferenz, insbesondere "Spec-Erstellung" und "Plan-Erstellung" Workflow-Sektionen — neuer Code-Review-Workflow muss dazu parallel passen)
- `docs/conventions.md` (Code-Stil, Naming, Anti-Patterns §11, Doku-Pflicht §12, Dependencies §13, Sprache §15)
- `docs/architecture.md` (Layer-Tabelle §2 — Skript muss Layer-Detection aus Pfaden korrekt machen)
- `docs/templates/spec-review-checklist.md` und `docs/templates/plan-review-checklist.md` (als strukturelle Vorlagen für `code-review-checklist.md`)
- `scripts/smoke-test.mjs` (Stil-Vorlage für `.mjs`-Skripte mit happy-dom / Node-builtins)
- ADR-0012 (Smoke-Test-Gate — analog für Code-Review-Gate)

### 0.2 Architektur-Kontext (welche Layer berührt)

| Layer / Bereich      | Datei                                                    | Art der Änderung                                                                                          |
| -------------------- | -------------------------------------------------------- | --------------------------------------------------------------------------------------------------------- |
| `scripts/` (Tooling) | `scripts/kpi.mjs`                                        | NEW — ~300–400 LOC ESM-Skript, TS-Compiler-API für AST                                                    |
| `docs/templates/`    | `docs/templates/code-review-checklist.md`                | NEW — Self-Review-Phasen + 6 Sub-Agent-Pass-Prompts                                                       |
| `docs/`              | `docs/lessons-learned.md`                                | NEW — append-only Lessons-Hot-Pot                                                                         |
| `docs/adr/`          | `docs/adr/0021-code-review-workflow-pre-release-gate.md` | NEW — ADR                                                                                                 |
| `docs/adr/`          | `docs/adr/README.md`                                     | EDIT — ADR-0021 indexieren                                                                                |
| `docs/`              | `docs/architecture.md`                                   | EDIT — §4 ADR-Tabelle um 0021                                                                             |
| Root                 | `CLAUDE.md`                                              | EDIT — neue Sektion "Code-Review — Workflow (verbindlich)" + Doku-Karte + Wo-dokumentiere-ich-was-Tabelle |
| Root                 | `package.json`                                           | EDIT — `kpi`, `kpi:snapshot`, `kpi:report` Skripte (additiv)                                              |
| Root                 | `.gitignore`                                             | VERIFY — sicherstellen dass `metrics/` NICHT ignored ist                                                  |
| Tracked-Dirs (NEW)   | `metrics/.gitkeep` + `metrics/kpi-history.json`          | NEW — `kpi-history.json` als `[]` initialisiert                                                           |
| Tracked-Dirs (NEW)   | `metrics/playwright/.gitkeep`                            | NEW — Verzeichnis git-tracked, Inhalte werden vom Workflow erzeugt                                        |

**NICHT zu berührende Layer:**

- `src/**` — gesamter Source-Tree. Workflow prüft ihn, ändert ihn nicht.
- `examples/**` — Sandbox bleibt unverändert. Playwright-Pass 5 nutzt `examples/preview.html` read-only.
- `scripts/smoke-test.mjs` und `scripts/build-preview.mjs` — bestehende Skripte unverändert.
- `tsconfig.json`, `tsconfig.preview.json`, `rollup.config.*`, `.eslintrc.cjs` — Tooling-Configs unverändert. **Ausnahme `vitest.config.ts`:** USER-DECISION genehmigt eine **einzige additive 1-Liner-Änderung** (`coverage.reporter: ['text', 'json-summary']` hinzufügen). Sonst unverändert.
- `.husky/`, `lint-staged.config.*` — Pre-Commit-Hook unverändert.

**Single-Source-Regeln (ADR-0010):**

- KPI-Threshold-Konstanten (`COMPLEXITY_LIMIT = 10`, `FUNCTION_LOC_LIMIT = 50`, `PARAMS_LIMIT = 4`, `FAN_IN_LIMIT = 10`, `MAX_NESTING_LIMIT = 4`, `BUNDLE_BUDGET_BYTES = 60 * 1024`, Layer-LOC-Limits) **in `scripts/kpi.mjs` einmalig** definiert (top-level `const`-Block). Keine Doppelung in Tests oder Reports.
- Layer-Detection (Pfad → Layer-Name) als **eine** Funktion in `kpi.mjs`. Sub-Agent-Prompts referenzieren die Funktion namentlich.
- Schema-Version (`"version": "1.0"`) als Skript-Konstante.

#### 0.2.1 Files-to-Verify — Parent-Dirs + Tool-Coverage (Pflicht-Tabelle)

| Datei (NEW)                                              | Parent-Dir existiert?            | Welche Tools decken sie ab?                                                                                                       |
| -------------------------------------------------------- | -------------------------------- | --------------------------------------------------------------------------------------------------------------------------------- |
| `scripts/kpi.mjs`                                        | ✓ `scripts/` existiert           | Manuelle Verifikation (`pnpm kpi` auf Repo-State), keine Vitest-Coverage (außerhalb `src/**`), kein ESLint (nicht in `lint` glob) |
| `docs/templates/code-review-checklist.md`                | ✓ `docs/templates/` existiert    | Markdown, kein Tool-Check                                                                                                         |
| `docs/lessons-learned.md`                                | ✓ `docs/` existiert              | Markdown                                                                                                                          |
| `docs/adr/0021-code-review-workflow-pre-release-gate.md` | ✓ `docs/adr/` existiert          | Markdown                                                                                                                          |
| `metrics/.gitkeep`                                       | ❌ `mkdir -p metrics` nötig      | Existenz-Check via Plan-Verifikation                                                                                              |
| `metrics/kpi-history.json`                               | ❌ (s. o.)                       | JSON-Validität via `node -e "JSON.parse(...)"` in Plan-Verifikation                                                               |
| `metrics/playwright/.gitkeep`                            | ❌ `mkdir -p metrics/playwright` | Existenz-Check                                                                                                                    |

**Tool-Coverage-Gap (akzeptiert):** `scripts/kpi.mjs` läuft nicht durch `pnpm lint` (ESLint-glob ist `src/**/*.ts`) und nicht durch `pnpm typecheck` (`.mjs`). Konsequenz: Style-Konsistenz manuell. Akzeptabel weil:

- Existierende Skripte (`smoke-test.mjs`, `build-preview.mjs`) sind genauso.
- Skript-Output validiert sich selbst (JSON-Validität).
- Skript-Logik wird durch Inspektion + manuelle Snapshot-Verifikation reviewed.

### 0.3 Konzept-Modell / Datenfluss

Workflow-Sequenz pro Plan (gesamter Lifecycle):

```
PLAN-FREIGABE (Plan-Review fertig)
       │
       ▼
[Pre-Plan KPI-Snapshot]  ◄── Hauptagent: `pnpm build && pnpm test:coverage && pnpm kpi:snapshot --label pre-<plan-id> --phase pre`
       │
       ▼
[Pre-Plan Playwright-Capture]  ◄── Hauptagent: MCP-browser_navigate + console + snapshot → `metrics/playwright/<plan-id>-pre.json`
       │
       ▼
SUBAGENT-DRIVEN IMPLEMENTATION (existierender Workflow aus CLAUDE.md)
       │
       ▼ (alle Tasks done, smoke + check grün)
[Post-Plan KPI-Snapshot]  ◄── `pnpm kpi:snapshot --label post-<plan-id> --phase post`
       │
       ▼
[Post-Plan Playwright-Capture]
       │
       ▼
[CODE-REVIEW WORKFLOW] ──────────► iteriert bis Stop-Kriterium ──────────┐
   • Self-Review (Phasen A–H der code-review-checklist)                  │
   • Sub-Agent-Pass 1 → 2 → 3 → 4 → 5 → 6 (sequentiell)                  │
   • Pro Pass: Findings → AUTO-FIX inline / FIX-PLAN sammeln /           │
     USER-DECISION sammeln / VERIFY-NEEDED prüfen / LESSON-LEARNED       │
     appenden zu docs/lessons-learned.md                                 │
   • Nach 6 Pässen: FIX-PLAN umsetzen (mini-Sub-Plan via writing-plans + │
     subagent-driven-development) → neue Iteration                       │
   • Stop: 2 Iterationen ohne neue AUTO-FIX/FIX-PLAN  ODER nur USER-     │
     DECISION offen  ODER max 3 Iterationen erreicht                     │
                                                                          │
       ▼ (Stop)                                                          │
[ADR-Check] ◄── Hauptagent: aus Findings + LESSON-LEARNED ableiten, ob   │
                neuer ADR vorzuschlagen ist (z. B. ADR-0022 für Pattern) │
       │                                                                  │
       ▼                                                                  │
[USER-VORLAGE] ─── bündelt: USER-DECISION-Findings + KPI-Delta + Playwright-Artefakt-Pfade + neue Lessons-Einträge + ADR-Vorschläge
       │
       ▼ (User entscheidet)
[FINISHING-A-DEVELOPMENT-BRANCH] (existierender Skill)
```

**Pflicht-Wissen für den Planer:**

- Pre-Snapshot wird **direkt vor** dem ersten Implementation-Task aufgenommen (in der bestehenden CLAUDE.md "Implementation — Workflow"-Phase 1, vor TaskCreate-Batch). Nicht später.
- Post-Snapshot wird **direkt nach** dem letzten Implementation-Task aufgenommen, bevor Code-Review-Pass 1 startet.
- Sub-Agent-Pässe sind **sequentiell, nicht parallel** — Pass N+1 muss den Fix-Diff von Pass N sehen (analog Plan-Workflow). Parallel-Dispatch ist verboten.
- Pass 5 (Playwright) hat eine Sonderrolle: Hauptagent capturt MCP-Artefakte (Sub-Agents haben keinen MCP-Zugriff), Sub-Agent analysiert die Artefakte.
- AUTO-FIX wird **inline zwischen Pässen** umgesetzt (analog Spec-/Plan-Workflow). Erst nach Trust-but-Verify gegen echten Code.
- FIX-PLAN wird **am Ende einer Iteration** umgesetzt — danach nächste Iteration (alle 6 Pässe nochmal).

### 0.4 Don't-Touch-Liste

| Element                                                                                                                                                            | Wo                                                                   | Warum nicht anfassen                                                                                     |
| ------------------------------------------------------------------------------------------------------------------------------------------------------------------ | -------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------- |
| Existierende `package.json`-Skripte (`dev`, `build`, `test`, `test:watch`, `test:coverage`, `lint`, `format`, `typecheck`, `check`, `preview`, `prepare`, `smoke`) | `package.json`                                                       | Nur **additiv** ergänzen — kein Edit existierender Scripts                                               |
| `scripts/smoke-test.mjs`                                                                                                                                           | `scripts/smoke-test.mjs`                                             | ADR-0012-Smoke-Test bleibt unverändert. Code-Review ist Add-on, nicht Ersatz                             |
| `scripts/build-preview.mjs`                                                                                                                                        | `scripts/build-preview.mjs`                                          | Sandbox bleibt unverändert                                                                               |
| `scripts/build-spike-haicon-bundle.mjs`                                                                                                                            | `scripts/build-spike-haicon-bundle.mjs`                              | Spike-Helper für Subspec 2026-05-13, bleibt unverändert; KPI-Skript darf ihn NICHT als Source einlesen   |
| Spec-Review-Checklist                                                                                                                                              | `docs/templates/spec-review-checklist.md`                            | Bleibt unverändert. Diese Spec referenziert sie nur als Vorlage                                          |
| Plan-Review-Checklist                                                                                                                                              | `docs/templates/plan-review-checklist.md`                            | Bleibt unverändert                                                                                       |
| Spec-Template / Plan-Template                                                                                                                                      | `docs/templates/spec-template.md`, `docs/templates/plan-template.md` | Bleiben unverändert                                                                                      |
| Bestehende Specs unter `docs/specs/`                                                                                                                               | gesamter Ordner                                                      | Werden **nie** retroaktiv editiert (Kern-Prinzip dieser Spec)                                            |
| Bestehende Pläne unter `docs/plans/`                                                                                                                               | gesamter Ordner                                                      | Werden **nie** retroaktiv editiert                                                                       |
| Bestehende ADRs unter `docs/adr/`                                                                                                                                  | außer Index-Update                                                   | Werden **nie** retroaktiv editiert. Nur Cross-References hinzufügen erlaubt, aber nicht durch diese Spec |
| Lit-Lifecycle in `src/card.ts`                                                                                                                                     | `src/card.ts`                                                        | Diese Spec ändert keinen Source-Code                                                                     |
| Engine, Config, Render, Util, HA, i18n                                                                                                                             | gesamtes `src/`                                                      | Diese Spec ändert keinen Source-Code                                                                     |

## 1. Kontext und Motivation

**User-Beobachtung (2026-05-15):** Spec- und Plan-Review-Workflows (CLAUDE.md "Spec-Erstellung" und "Plan-Erstellung") liefern hohe Architektur-Qualität **vor** der Implementation. ADR-0012 (Smoke-Test-Gate) fängt Class-Load-Crashes **vor** Release. Aber zwischen Implementation und Release fehlt ein systematischer Post-Implementation-Pass für:

1. **Code-Qualitäts-Drift**: Sind Funktionen komplexer geworden? Type-Safety-Drift (`any`/`as`/`!`-Counter steigt)? LOC-Limits an Modulen verletzt?
2. **Wartbarkeits-Trends**: Wie verändert sich die Codebase mit jedem Plan über die Zeit? KPI-Historie fehlt.
3. **Funktionale Verifikation**: Smoke-Test rendert Card nicht (registriert nur Custom-Element). Echte UI-Verifikation passiert nur manuell. Playwright MCP ist verfügbar — wird nicht systematisch genutzt.
4. **Lessons-Learned**: Erkenntnisse aus Implementation werden mündlich oder verloren — kein dokumentierter Pfad zur Übernahme in `conventions.md` oder neue ADRs.

**Verifizierter Bedarf:** Nach 6 abgeschlossenen Plänen (`docs/plans/`) hat die Codebase 34 Source-`.ts`-Files in `src/` (48 inkl. `*.test.ts`), Bundle <60 kB. Kein Tool fängt Drift gegenüber den `conventions.md §3` LOC-Limits oder `conv §1.5` Param-Counts. KPI-Trend über die 6 Pläne ist nicht abrufbar. **Konkretes Drift-Beispiel bereits sichtbar:** `src/editor.ts` ist heute 405 LOC und überschreitet damit das conv §3-Limit von 400 LOC um 5 Zeilen — diese stille Drift wird durch das KPI-Skript ab Baseline-Snapshot sichtbar gemacht.

**USER-DECISION zu editor.ts (resolved):** Der 5-LOC-Verstoß wird **als known-Drift akzeptiert**. Erster KPI-Baseline-Snapshot wird ihn als Violation flaggen; im ersten echten Code-Review-Run wird er als `LESSON-LEARNED` dokumentiert (z. B. "Refactor editor.ts als low-priority TODO" oder "Limit-Anpassung in conv §3 erwägen"). Diese Spec ändert `src/editor.ts` **nicht**.

**Sub-Agent-Beobachtung aus Spec-Workflow:** Rotierende Fokus-Vektoren (5 Brillen) erhöhen die Finding-Tiefe gegenüber identischem Skepsis-Prompt erheblich (Spec-Workflow-Erfahrung: Pass 1 fand 8 Findings, Pass 2 nur 1 mit gleicher Brille — mit anderer Brille fand Pass 3 wieder 5 neue). Dasselbe Pattern ist für Code-Review erwartet.

**Bestehende CI / Pre-Commit-Mechanik (für den Planer wichtig):**

- `.github/workflows/ci.yml` läuft auf push/PR: `pnpm install --frozen-lockfile`, `pnpm check`, `pnpm build`, Bundle-Size-Check (≤ 60 kB), `node scripts/smoke-test.mjs`. **KPI wird NICHT in CI integriert** (siehe §2.2 Non-Goals).
- `.husky/pre-commit` ruft `pnpm lint-staged`. `.lintstagedrc.json` formatiert `*.ts` mit prettier+eslint, `*.{json,md,yaml,yml}` mit prettier. Konsequenz: alle vom KPI-Skript geschriebenen Dateien (`metrics/kpi-history.json`, `metrics/playwright/*.json`) und Lessons-Doku müssen **prettier-stabil** sein (siehe §3.2).
- `.gitignore` ignoriert `.playwright-mcp/` — falls Playwright MCP-Tool dorthin default-schreibt, würden Artefakte verloren gehen. Spec §4 erzwingt explizites Schreiben nach `metrics/playwright/...` via Write-Tool aus dem Hauptagenten.

## 2. Goals und Non-Goals

### 2.1 Goals

- **Verbindlicher 6-Brillen-Workflow** für Code-Review nach jeder Plan-Implementation, parallel zum bestehenden Spec/Plan-Workflow.
- **Wartbarkeits-KPI-Skript** liefert reproduzierbare JSON-Snapshots mit Komplexität, Abhängigkeiten, Methoden-/Komponenten-Länge, Datei-LOC, Escape-Hatch-Counter, Bundle-Bytes, Coverage pro Layer, dead-exports, intra-layer-Import-Cycles, Test-Lücken.
- **History-Datei** trackt KPI-Trends über alle Pläne hinweg, git-tracked, in PRs sichtbar.
- **Pre/Post-Delta** macht den direkten Effekt einer Implementation auf die Codebase-Gesundheit sichtbar.
- **Playwright-Pass** verifiziert die UI funktional gegen erwartete DOM-Struktur, Console-Cleanliness, A11y-Attribute.
- **Lessons-Pipeline** sammelt Code-Review-Erkenntnisse in `docs/lessons-learned.md` für User-Curation in `conventions.md` / neue ADRs / Plan-Template-Updates. Spec/Plan-Dokumente bleiben unangetastet.
- **5 Finding-Kategorien** mit klarem Handover (`AUTO-FIX` inline / `FIX-PLAN` mini-Sub-Plan / `USER-DECISION` gebündelt / `VERIFY-NEEDED` Hauptagent prüft / `LESSON-LEARNED` appendet).
- **Iterations-Budget** klar (max 3 Iterationen × 6 Pässe = 18 Sub-Agent-Runs + Fix-Pläne).
- **ADR-Check** als expliziter Schritt vor User-Vorlage (neuer ADR aus wiederkehrenden Findings/Lessons ableitbar?).

### 2.2 Non-Goals

**Workflow / Doku:**

- Kein automatischer Trigger (kein Pre-Push-Hook, kein CI-Workflow-File). Code-Review ist explizit-Agent-getrieben.
- Keine Spec/Plan-Templates-Edits — bestehende Templates bleiben unangetastet.
- Keine retroaktiven Edits an existierenden ADRs/Specs/Plänen.
- Kein Per-Phasen-Quality-Gate (Frage 1 entschied "nur ein Review am Plan-Ende").

**Skript / Tooling:**

- Keine neuen Runtime-Dependencies (ADR-0003).
- Keine neuen DevDependencies (`jscpd`, `madge`, `complexity-report`, `eslint-plugin-sonarjs`). Bewusste Selbst-Beschränkung.
- Keine ESLint-Plugin-Erweiterungen — Wartbarkeits-Checks via Skript, nicht via Lint.
- Keine Auto-Fixes durch das Skript — es produziert nur Daten, der Hauptagent entscheidet.
- Keine Per-Branch / Per-Commit KPI-Tracking. Snapshots sind Pre/Post-Plan, nicht Per-Commit.
- Kein Pruning der History — append-only. Erste Erfahrung zeigt, ob Pruning nötig.
- Kein Schema-Migrations-Tool — wenn das JSON-Schema (`version: "1.0"`) später bricht, ist das ein expliziter neuer ADR.

**Playwright:**

- Keine `@playwright/test`-Test-Suite. Pass 5 nutzt Playwright **MCP** im Hauptagenten ad-hoc.
- Keine Visual-Regression-Screenshots (Frage 5 entschied "Light: kein Screenshot-Storage"). Bestehende `docs/screenshots/*.png` bleiben User-curiert und werden vom Workflow NICHT regeneriert.
- Keine Interaktions-Scripts (Editor-Felder klicken, Mode-Switch, Hover-States).
- Keine Cross-Browser-Tests — nur Chromium via Playwright MCP.
- **Keine CI-Integration**: `.github/workflows/ci.yml` ruft `pnpm kpi:*` NICHT auf. Workflow ist explizit menschen-/agent-getrieben, nicht automatisch. CI-Integration wäre v1.x-Kandidat.
- **Lessons-Datei ist NICHT der README-Changelog**: User-facing-Changes (visuelle Änderungen, Config-Breaks) gehören weiterhin in den `README.md`-Changelog. Lessons sind Developer-/Maintainer-Erkenntnisse.

**KPIs:**

- Kein Halstead, kein Maintainability-Index — gestrichen in KPI-Review (Tier 0+1).
- Kein Cognitive-Complexity (redundant zu cyclomatic + max_nesting).
- Keine Test-/Source-File-Ratio (Coverage ist besseres Signal).
- Keine Comment-Density (kann WHAT- vs WHY-Kommentare nicht unterscheiden).
- Kein Build-/Test-Runtime-Tracking (instabil, low signal).

**Out-of-Scope (potenzielle v1.x-Features):**

- KPI-Dashboard-UI (HTML-Report aus History) — v1.x-Kandidat.
- Per-Author KPI-Tracking — irrelevant für Solo-Dev-Projekt.
- Slack-/Email-Notifications bei KPI-Regression.

## 3. Architektur / Konkrete Änderungen

### 3.1 Datei-Übersicht

| Datei                                                    | Art    | Phase | Änderung                                                                                                                                                                                                                                                                                       |
| -------------------------------------------------------- | ------ | ----- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `scripts/kpi.mjs`                                        | NEW    | 2     | KPI-Skript (~300–400 LOC, ESM, TS-Compiler-API für AST)                                                                                                                                                                                                                                        |
| `metrics/.gitkeep`                                       | NEW    | 1     | Verzeichnis git-tracked                                                                                                                                                                                                                                                                        |
| `metrics/kpi-history.json`                               | NEW    | 1     | Initial `[]`                                                                                                                                                                                                                                                                                   |
| `metrics/playwright/.gitkeep`                            | NEW    | 1     | Verzeichnis git-tracked                                                                                                                                                                                                                                                                        |
| `docs/templates/code-review-checklist.md`                | NEW    | 3     | Self-Review-Phasen A–H + 6 Sub-Agent-Pass-Prompts + Iteration-Loop                                                                                                                                                                                                                             |
| `docs/lessons-learned.md`                                | NEW    | 3     | Append-only Hot-Pot mit Header + Promotion-Tags                                                                                                                                                                                                                                                |
| `docs/adr/0021-code-review-workflow-pre-release-gate.md` | NEW    | 4     | Neuer ADR (Stub in §8 — Planer übernimmt 1:1)                                                                                                                                                                                                                                                  |
| `docs/adr/README.md`                                     | EDIT   | 4     | ADR-0021 indexieren                                                                                                                                                                                                                                                                            |
| `docs/architecture.md`                                   | EDIT   | 4     | §4 ADR-Tabelle: 0021 hinzufügen                                                                                                                                                                                                                                                                |
| `CLAUDE.md`                                              | EDIT   | 5     | Neue Sektion "Code-Review — Workflow (verbindlich)" + Doku-Karte + "Wo dokumentiere ich was?"-Zeile + Update "Implementation — Workflow" um Pre/Post-Snapshot-Schritte                                                                                                                         |
| `docs/templates/plan-template.md`                        | EDIT   | 5     | Standing-Requirement-Block + Header-Block um Pre/Post-Snapshot-Schritte erweitern — sonst driften CLAUDE.md und plan-template auseinander                                                                                                                                                      |
| `docs/adr/0012-headless-smoke-test-pre-release-gate.md`  | EDIT   | 4     | 1-Zeilen-Edit im existierenden `## Verlinkte Spec-Sektionen / Referenzen`-Block: Cross-Reference auf ADR-0021 (Code-Review-Workflow erweitert das Smoke-Test-Gate)                                                                                                                             |
| `package.json`                                           | EDIT   | 2     | Scripts `kpi`, `kpi:snapshot`, `kpi:report` additiv ergänzen. **USER-DECISION resolved**: `engines: { node: ">=20" }` additiv ergänzen (Node-Mindestversion explizit pinnen)                                                                                                                   |
| `vitest.config.ts`                                       | EDIT   | 2     | **USER-DECISION resolved**: additive 1-Liner `coverage.reporter: ['text', 'json-summary']` — sonst keine Änderung. KPI-Skript liest `coverage/coverage-summary.json`. Conv §13 Tech-Stack-Drift-Frage entschieden: kein ADR-0022 nötig, Commit-Body-Begründung reicht (1-Liner Tooling-Konfig) |
| `.gitignore`                                             | VERIFY | 1     | Bestätigen dass `metrics/` NICHT ignored (ggf. expliziter `!metrics/`-Eintrag falls `*.json` o.ä. greift)                                                                                                                                                                                      |

### 3.2 `scripts/kpi.mjs` — Skript-Architektur

**Top-Level-Struktur (Pflicht-Sektionen, in dieser Reihenfolge):**

```javascript
#!/usr/bin/env node
// scripts/kpi.mjs — Wartbarkeits-KPI-Snapshot
// Aufruf: pnpm kpi | pnpm kpi:snapshot --label X --phase pre|post|manual | pnpm kpi:report

import { readFileSync, writeFileSync, readdirSync, statSync, existsSync, mkdirSync } from 'node:fs';
import { join, relative, dirname, basename } from 'node:path';
import { execSync } from 'node:child_process';
import ts from 'typescript';

// ─── Konstanten (Single-Source aller Thresholds) ─────────────────────────
const SCHEMA_VERSION = '1.0';
const REPO_ROOT = ...; // ermittelt via process.cwd() oder script-relativ
const SRC_GLOB = 'src/**/*.ts';
const HISTORY_FILE = 'metrics/kpi-history.json';

// LOC-Limits aus conventions §3 — explizite Pfad-Map, Fallback 250
const FILE_LOC_LIMITS = {
  'src/card.ts': 200,
  'src/editor.ts': 400,
  'src/engine/energy-engine.ts': 300,
};
const DEFAULT_LOC_LIMIT = 250;
// editor-list-sections.ts, card-helpers.ts, card-styles.ts etc. fallen auf DEFAULT_LOC_LIMIT
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

// Performance-Erwartung: Bei ~34 src-Files braucht ein einziges
// `ts.createProgram(rootFiles=allSrc)` typisch 2-4s cold. Pro Snapshot-Run
// ≤ 10s erwartet. Anti-Pattern: pro-Datei `ts.createProgram` (10×+ langsamer).

// ─── Layer-Detection ─────────────────────────────────────────────────────
function layerForPath(relPath) {
  // Mapping nach architecture §2 / conventions §3:
  //   'src/engine/**'  → 'engine'
  //   'src/config/**'  → 'config'
  //   'src/render/**'  → 'render'
  //   'src/util/**'    → 'util'
  //   'src/ha/**'      → 'ha'
  //   'src/i18n/**'    → 'i18n'
  //   'src/card.ts' | 'src/editor.ts' | 'src/card-helpers.ts'
  //     | 'src/card-styles.ts' | 'src/editor-list-sections.ts'
  //     | 'src/index.ts' | 'src/const.ts'  → 'card_editor'
  //   (Restliche src/-Root-Files fallen ebenfalls auf 'card_editor';
  //    architecture §2 zeigt nur die nested Layer + card+editor parallel.)
}

// ─── AST-Walks ───────────────────────────────────────────────────────────
function analyzeFile(absPath) {
  // Liest, parst, walked, returnt:
  // { path, layer, loc, is_test, imports: [...], exports: [...], functions: [...], escape_hatches: {...} }
}

function functionMetrics(node, sourceFile) {
  // returnt { name, loc, cyclomatic, max_nesting, params, line_start }
  // cyclomatic: count if/case/for/while/catch/&&/||/??/?: + 1
}

// ─── Import-Graph (für fan_in, dead_exports, import_cycles) ─────────────
function buildImportGraph(fileAnalyses) {
  // returnt { fanIn: Map<path, count>, deadExports: [...], cycles: [...] }
}

// ─── Coverage-Parse ──────────────────────────────────────────────────────
function readCoverage() {
  // Liest coverage/coverage-summary.json wenn vorhanden, sonst null
  // Returnt { total_pct, per_layer: { engine: 95.3, util: ..., ... } }
}

// ─── Bundle-Größe ────────────────────────────────────────────────────────
function readBundleBytes() {
  // statSync('dist/custom-energy-flow-card.js').size wenn vorhanden, sonst null
}

// ─── Package-Deps ────────────────────────────────────────────────────────
function readDependencies() {
  // package.json: count runtime + dev
}

// ─── Violation-Checker ───────────────────────────────────────────────────
function detectViolations(snapshot) {
  // Walked snapshot.files, returnt {
  //   loc_exceeds_limit: [{ path, loc, limit }],
  //   complexity_above_10: [{ path, function, value }],
  //   function_loc_above_50: [...],
  //   params_above_4: [...],
  //   fan_in_above_10: [...],
  //   max_nesting_above_4: [...],
  //   coverage_below_90_pure_layers: [...],
  //   bundle_above_budget: bool,
  //   custom_elements_not_2: bool,
  //   any_in_pure_layers: [...],
  //   non_null_in_pure_layers: [...],
  //   missing_tests_pure_layers: [...],
  //   import_cycles: [...]
  // }
}

// ─── Snapshot zusammenbauen ──────────────────────────────────────────────
function buildSnapshot(label, phase) {
  // Returnt komplette JSON-Struktur nach §3.3 Schema
}

// ─── History-File-IO ─────────────────────────────────────────────────────
// PFLICHT: prettier-stabil schreiben, sonst diff-Schleife im pre-commit-Hook
// (`.lintstagedrc.json` formatiert `*.json` mit `prettier --write`).
// Konkret: JSON.stringify(arr, null, 2) + '\n' (trailing newline) + 'utf8'.
function appendSnapshot(snapshot) {
  // Liest metrics/kpi-history.json (utf8), parsed, appended,
  // schreibt mit JSON.stringify(arr, null, 2) + '\n'
}

function loadHistory() { /* analog: utf8 read, JSON.parse */ }

// ─── Delta-Report ────────────────────────────────────────────────────────
function renderDeltaReport(pre, post) {
  // Returnt Text-Report (siehe §3.4)
}

// ─── Logging-Pattern (für scripts/, kein [custom-energy-flow-card]-Prefix) ─
// analog scripts/smoke-test.mjs: Stdout-Erfolg via `console.log('✓ ...')`,
// Stderr-Fehler/Warnings via `console.error('kpi.mjs: ...')` mit Skript-Prefix
// zur Differenzierbarkeit von Card-Logs (conv §7 fordert
// `[custom-energy-flow-card]` nur für Card-Runtime-Logs, nicht für Tooling).

// ─── CLI-Dispatch ────────────────────────────────────────────────────────
const args = process.argv.slice(2);
const mode = args.includes('--snapshot') ? 'snapshot'
           : args.includes('--report') ? 'report'
           : 'print';

if (mode === 'snapshot') { /* parse --label, --phase, append, exit */ }
else if (mode === 'report') { /* load last two, render delta, exit */ }
else { /* build snapshot, pretty-print to stdout, exit */ }
```

**Lit-Decorators (`experimentalDecorators: true`):** `src/card.ts` und `src/editor.ts` nutzen Lit-Decorators (`@customElement`, `@property`, `@state`). Das KPI-Skript MUSS `ts.createProgram` mit `{ experimentalDecorators: true, target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.ESNext }` aufrufen, sonst werden Decorator-Knoten als unbekannt geparst und Funktionszählungen sind falsch. Konkret:

```javascript
const program = ts.createProgram(rootFiles, {
  experimentalDecorators: true,
  target: ts.ScriptTarget.ES2022,
  module: ts.ModuleKind.ESNext,
  allowJs: false,
});
```

`tsconfig.json` lesen ist Anti-Pattern (Pfade unterschiedlich resolvbar) — explizite Options im Skript reichen.

**Komplexitäts-Algorithmus (Cyclomatic, vereinfacht aber konsistent):**

```javascript
function cyclomaticForFunction(funcNode, sourceFile) {
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
      case ts.SyntaxKind.ConditionalExpression: // ternary
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

**Max-Nesting-Algorithmus:**

Walk descent mit Counter, der für jede Block-bildende Construct (If/For/While/Switch/Try) hochzählt und beim Verlassen runter. Max über Walk speichern.

**LOC-Algorithmus:** Zeilen-Split → leer-trimmen → ohne reine Kommentar-Zeilen (`^\s*\/\/` oder block-comment-only) zählen.

**Imports-Detection:** AST `ImportDeclaration` für jeden `.ts`-File. Module-Specifier wird relativ aufgelöst (`'../util/foo'` → `src/util/foo.ts`). Bare-Imports (`'lit'`, `'home-assistant-js-websocket'`) ignoriert (externe Deps).

**Exports-Detection:** AST `ExportDeclaration`, `ExportAssignment`, exported `FunctionDeclaration`/`ClassDeclaration`/`VariableStatement` mit `export` modifier. Liste der exportierten Namen pro File.

**Dead-Exports-Algorithmus:** Build map `{ "src/util/foo.ts": ["formatPowerW", "...", ...] }`. Für jeden Eintrag: durchsuche alle anderen Files nach Import dieses Namens aus diesem Pfad. Wenn `0` Importeure (außer der Datei selbst, Tests zählen als Importeure) → dead export. Edge-Case: Default-Export einer Card-Registrierung (`src/index.ts`) wird vom HACS-Bundle nicht via `import` konsumiert — Allowlist für `src/index.ts` einbauen.

**Import-Cycles (intra-layer):** Für jeden Layer separat: Tarjan oder einfach DFS. Liste der Cycles als `[[a, b], [c, d, e]]`-Liste.

**Escape-Hatch-Counter:** Regex auf File-Inhalt nach `\bany\b` (mit AST-Filter um Variable namens `any` auszuschließen), `as\s+`, `!\.`, `// eslint-disable`, `@ts-`. `// TODO` und `// FIXME` als `todo_count` separat.

**Custom-Elements-Counter:** Regex auf `@customElement\s*\(\s*['"]` im gesamten `src/`. Erwartung: exakt 2 (`custom-energy-flow-card`, `custom-energy-flow-card-editor`).

**Coverage-Parser:** Wenn `coverage/coverage-summary.json` (vitest-coverage-v8-Output) existiert, parse `total.lines.pct` für repo-wide, dann pro File für Per-Layer-Aggregat. Wenn nicht: `coverage_pct: null` und Warning auf stderr.

### 3.3 JSON-Schema (Snapshot)

```json
{
  "version": "1.0",
  "timestamp": "2026-05-15T10:30:00.000Z",
  "commit": "abc123def",
  "branch": "feat/code-review-workflow",
  "plan_id": "2026-05-15-code-review-workflow",
  "phase": "pre",
  "label": "pre-2026-05-15-code-review-workflow",
  "totals": {
    "loc": 4567,
    "files": 42,
    "coverage_pct": 93.2,
    "bundle_bytes": 51234,
    "any_count": 2,
    "as_count": 17,
    "non_null_count": 0,
    "eslint_disable_count": 3,
    "ts_directive_count": 1,
    "todo_count": 0,
    "custom_elements_count": 2,
    "dependencies": { "runtime": 1, "dev": 22 }
  },
  "layers": {
    "engine": {
      "files": 4,
      "loc": 612,
      "complexity_sum": 87,
      "complexity_avg": 4.2,
      "coverage_pct": 95.3,
      "escape_hatches_sum": 1
    },
    "config": {
      "files": 5,
      "loc": 423,
      "complexity_sum": 45,
      "complexity_avg": 3.5,
      "coverage_pct": 92.1,
      "escape_hatches_sum": 0
    },
    "render": {
      "files": 12,
      "loc": 1289,
      "complexity_sum": 156,
      "complexity_avg": 5.8,
      "coverage_pct": null,
      "escape_hatches_sum": 8
    },
    "util": {
      "files": 6,
      "loc": 384,
      "complexity_sum": 42,
      "complexity_avg": 3.8,
      "coverage_pct": 94.0,
      "escape_hatches_sum": 0
    },
    "ha": {
      "files": 3,
      "loc": 234,
      "complexity_sum": 28,
      "complexity_avg": 4.7,
      "coverage_pct": null,
      "escape_hatches_sum": 3
    },
    "i18n": {
      "files": 1,
      "loc": 89,
      "complexity_sum": 3,
      "complexity_avg": 1.5,
      "coverage_pct": null,
      "escape_hatches_sum": 0
    },
    "card_editor": {
      "files": 4,
      "loc": 587,
      "complexity_sum": 78,
      "complexity_avg": 7.1,
      "coverage_pct": null,
      "escape_hatches_sum": 7
    }
  },
  "files": [
    {
      "path": "src/card.ts",
      "layer": "card_editor",
      "is_test": false,
      "loc": 195,
      "imports_count": 12,
      "fan_in": 0,
      "exports": ["CustomEnergyFlowCard"],
      "functions": [
        {
          "name": "willUpdate",
          "loc": 28,
          "cyclomatic": 5,
          "max_nesting": 2,
          "params": 1,
          "line_start": 142
        },
        {
          "name": "render",
          "loc": 22,
          "cyclomatic": 3,
          "max_nesting": 1,
          "params": 0,
          "line_start": 175
        }
      ],
      "escape_hatches": {
        "any": 0,
        "as": 4,
        "non_null": 0,
        "eslint_disable": 0,
        "ts_directive": 0,
        "todo": 0
      }
    }
  ],
  "violations": {
    "loc_exceeds_limit": [],
    "complexity_above_10": [],
    "function_loc_above_50": [],
    "params_above_4": [],
    "fan_in_above_10": [],
    "max_nesting_above_4": [],
    "coverage_below_90_pure_layers": [],
    "bundle_above_budget": false,
    "custom_elements_not_2": false,
    "any_in_pure_layers": [],
    "non_null_in_pure_layers": [],
    "missing_tests_pure_layers": [],
    "import_cycles": [],
    "dead_exports": []
  }
}
```

### 3.4 Delta-Report-Format (`pnpm kpi:report`)

Stdout-Output für menschliches Lesen + Sub-Agent-Konsum:

```
=== KPI Delta: pre-2026-05-15-feature → post-2026-05-15-feature ===
(commit abc123 → def456, branch feat/code-review-workflow)

Totals:
  LOC:                4567 → 4612   (+45,  +1.0%)
  Files:              42   → 43     (+1)
  Coverage:           93.2 → 93.8   (+0.6%)
  Bundle:             51.2 → 51.5 KB  (+0.3 KB, OK ≤ 60.0)
  any-count:          2    → 2      (=)
  as-count:           17   → 19     (+2)
  non-null-count:     0    → 0      (=)
  eslint-disable:     3    → 3      (=)
  ts-directive:       1    → 1      (=)
  todo:               0    → 0      (=)
  custom-elements:    2    → 2      (OK)
  deps (runtime):     1    → 1      (=)
  deps (dev):         22   → 22     (=)

Layers (LOC-Drift):
  engine:     612  → 612   (=)
  config:     423  → 423   (=)
  render:     1289 → 1334  (+45)
  util:       384  → 384   (=)
  ha:         234  → 234   (=)
  i18n:       89   → 89    (=)
  card_editor: 587 → 587   (=)

Layer-Coverage (gemittelt):
  engine:     95.3 → 95.3  (OK ≥ 90)
  config:     92.1 → 92.8  (+0.7, OK ≥ 90)
  util:       94.0 → 94.0  (OK ≥ 90)

Threshold-Verstöße (NEU):
  - src/render/icon.ts Funktion `renderIcon`: cyclomatic 8 → 12  (>10 Limit)
  - src/render/icon.ts: imports 8 → 11  (nah am Limit)

Threshold-Verstöße (BEHOBEN):
  (keine)

Threshold-Verstöße (UNVERÄNDERT):
  (keine)

Historie-Position: post-Snapshot ist Eintrag 12/12 in metrics/kpi-history.json
```

**Sprach-Konsistenz:** Skript-Output durchgehend Deutsch (konsistent mit Spec/Doku-Sprache §15). Englische Identifier-Namen (`cyclomatic`, `LOC`, `KPI`) bleiben — sind Code-Begriffe, keine User-Texte.

### 3.5 Layer-Boundary-Check

Diese Spec ändert **keinen** Source-Code unter `src/`. Layer-Boundaries sind nicht aktiv betroffen. Das KPI-Skript **liest** alle `src/**/*.ts`-Files via `fs.readFileSync` und parsed sie mit `ts.createSourceFile` — keine Imports von `src/`-Modulen in den Skript-Code.

| Datei             | Layer / Bereich | Imports (relevant)                                         | Konformität                                            |
| ----------------- | --------------- | ---------------------------------------------------------- | ------------------------------------------------------ |
| `scripts/kpi.mjs` | `scripts/`      | `typescript`, `node:fs`, `node:path`, `node:child_process` | ✓ keine ESLint-Layer-Verstöße (außerhalb ESLint-Scope) |

### 3.6 Code-Reuse-Tabelle

Diese Spec führt neue Werkzeuge ein und nutzt:

| Helper / Modul                              | Wann verwenden                                                                                                                                                                                                 | Datei                           |
| ------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------- |
| `typescript` (TS-Compiler-API)              | AST-Walks für Komplexität, Imports, Exports, Functions. **Tool-Use einer existierenden DevDep — kein Bundle-Touch, unterliegt nicht dem 60-kB-Budget; conv §13 ADR-Pflicht für neue Runtime-Deps gilt nicht.** | DevDep, importiert in `kpi.mjs` |
| `node:fs` (`readFileSync`, `writeFileSync`) | Snapshot-IO, File-Listing                                                                                                                                                                                      | Built-in                        |
| `node:path` (`join`, `relative`, `dirname`) | Path-Normalisierung (Layer-Detection, Import-Resolve)                                                                                                                                                          | Built-in                        |
| `node:child_process` (`execSync`)           | `git rev-parse HEAD` für Commit-SHA, `git branch --show-current`                                                                                                                                               | Built-in                        |
| `happy-dom` (NICHT verwenden in kpi.mjs!)   | Nur in `smoke-test.mjs` relevant — KPI-Skript braucht kein DOM                                                                                                                                                 | DevDep, nicht für KPI           |

**Anti-Patterns für den Planer (aktiv vermeiden):**

1. ❌ Inline-Threshold-Werte im Sub-Agent-Prompt-Text — Sub-Agent ruft `pnpm kpi:report` auf und liest die Threshold-Werte aus dem Skript-Output, **nicht** aus Prompt-Hardcodes.
2. ❌ Duplikate von `LAYER_LOC_LIMITS` o.ä. in der Checklist-Datei — Single-Source in `kpi.mjs`.
3. ❌ Synchrone `ts.createProgram(...)` für jede Datei einzeln — das ist langsam. Ein einziges Program für alle `src/**/*.ts` und dann `program.getSourceFile(path)` pro File.
4. ❌ Eigene Pfad-Globbing-Logik wenn `fs.readdirSync` rekursiv reicht.
5. ❌ Hardcoded Strings für Layer-Namen verstreut — eine `const LAYERS = ['engine', 'config', ...]` als Single-Source.
6. ❌ Sub-Agent-Prompts kopieren existierende Texte aus Plan-Review-Checklist 1:1 — sie müssen **Code-Review-spezifisch** formuliert sein (siehe Pass-Prompt-Skelette unten).

### 3.7 Sub-Agent-Pass-Prompts (Skelette für die Checklist)

Vollständige Prompts gehen in `docs/templates/code-review-checklist.md` Phase Z. Hier die Skelette zur Validierung der Form. **Verbindliche Struktur pro Prompt:** Rollenzuweisung → Pass-Nummer + Brille → Lese-Quellen → Konkrete Suchstrategie → Beweisführungs-Pflicht (gemeinsame Regeln) → Finding-Kategorien (gemeinsame Regeln) → Output-Format (max 700 Worte) → Top-3 Code-Blocker → Empfehlung (ready/iterate/blocker).

**Pass 1 — Spec/Plan ↔ Code-Coverage:**

```
Du bist Code-Reviewer ohne Vorab-Kontext. Pass 1 von 6: **Spec/Plan ↔ Code-Coverage**.
Lies die Spec unter `[SPEC-PFAD]`, den Plan unter `[PLAN-PFAD]`, und den Diff der
Branch-Implementation (`git diff main...HEAD --stat` + relevante Files).

Fokus: Wurde alles aus Spec §3 und Plan-Tasks 1:1 im Code umgesetzt? Wo gibt es Drift?

Konkrete Aufgabe:
1. Mapping "Spec §X.Y / Plan-Task A.B → Code-File:Zeile" für JEDE Spec-§3-Vorgabe
   und JEDEN Plan-Task. Markiere ✓ / GAP / DRIFT pro Eintrag.
2. Drift-Verifikation: Wenn Spec sagt "Wert auf X setzen", steht im Code exakt X?
   Oder ein anderer Wert?
3. Plan-Tasks markiert als "✓ completed" — Code-Stelle existiert wirklich?
4. Test-Vorgaben aus Spec §6: Test-Case wirklich im Code? `grep` für den Test-Namen.

Beweisführung: Datei:Zeile-Quotes pro Behauptung.

Output: Mapping-Tabelle, Gaps-Liste, Drift-Liste, Top-3-Blocker, Empfehlung.
```

**Pass 2 — Architektur + ADRs + Conventions:**

```
[...] Pass 2: **Architektur + ADRs + Conventions**.

Fokus: ESLint catched Layer-Boundaries automatisch, aber wir prüfen tiefer.

Konkrete Aufgabe:
1. Anti-Patterns aus conventions §11 (12 Items): for each — `grep` für Pattern in Diff?
   • god-class in card.ts (>200 LOC)
   • SVG-String-Konkatenation
   • Externe DOM-Libs
   • Side-Effects in engine/
   • Doppelte Util-Funktionen
   • Berechnung in render()
   • Hardcoded User-Strings
   • TODO/FIXME im Release
   • etc.
2. ADR-Compliance pro relevantem ADR (aus Spec §0.1):
   • ADR-0002 Layered: Diff verletzt Layer-Imports?
   • ADR-0003 No Runtime Deps: package.json-Diff zeigt neue Runtime-Dep?
   • ADR-0004 Pure Engine: engine/-Diff zeigt hass/DOM/State?
   • ADR-0010 Single-Source-Util: neue Helper außerhalb util/?
   • ADR-0011 shouldUpdate: hasChanged statt shouldUpdate eingeführt?
3. Conventions §1 (Type-Safety), §2 (Comments-Policy), §3 (LOC-Limits), §4 (Imports-Order), §5 (Tests), §8 (Commit-Messages — letzte Commits), §15 (Sprache).
4. Imports-Reihenfolge in geänderten Files manuell prüfen (conv §4).

[Rest analog]
```

**Pass 3 — Wartbarkeits-KPIs (skript-basiert):**

```
[...] Pass 3: **Wartbarkeits-KPIs**.

Fokus: KPI-Skript-Output auswerten. Drift erkennen. Threshold-Verstöße melden.

Konkrete Aufgabe:
1. `pnpm kpi:report` ausführen, Output lesen.
2. Wenn nicht vorhanden: `metrics/kpi-history.json` direkt lesen, letzte zwei Einträge
   (pre + post desselben plan_id) vergleichen.
3. Pro Drift-Kategorie:
   • Threshold-Verstöße NEU: jedes Item als Finding. Wenn klar Code-Fehler:
     [AUTO-FIX] mit Datei:Zeile + Fix-Vorschlag. Wenn größer (Refactor):
     [FIX-PLAN]. Wenn Architektur-Frage: [USER-DECISION].
   • LOC-Drift: signifikant (>10% in einem Layer) → Begründung im Diff erkennbar?
   • Complexity-Anstieg: welche Funktion? Refactor-Vorschlag.
   • Type-Safety-Drift (any/as/non-null counter): wo? warum?
   • Fan-In/Fan-Out-Anstieg: Coupling-Hotspot?
   • Dead-Exports: streichen?
   • Import-Cycles: lösen?

Beweisführung: KPI-Werte aus dem Report zitieren.

[Rest analog]
```

**Pass 4 — Test-Tiefe + TDD-Compliance:**

```
[...] Pass 4: **Test-Tiefe + TDD-Compliance**.

Konkrete Aufgabe:
1. Coverage-Lücken: `coverage_per_layer < 90%` für engine/config/util = Befund.
2. TDD-Order: `git log --reverse <plan-start>..HEAD` — kam Test-Commit VOR
   Implementation-Commit für jeden engine/config/util-Edit? Falls nein: Finding.
3. Edge-Cases aus Spec §11.3 oder §6: jeder Edge-Case hat einen Test-Case?
4. `it.each` für Tabellen-Tests (conv §5.3)?
5. Snapshot-Tests veraltet oder neu erstellt?
6. Test-Stil: Single-Assertion, eigenständige Tests (conv §5.3)?

[Rest analog]
```

**Pass 5 — UX + Funktional via Playwright (Two-Stage):**

```
[Sub-Agent-Prompt — analysiert Artefakte, die Hauptagent vorher erfasst hat]

[...] Pass 5: **UX + Funktional via Playwright**.

Voraussetzung: Hauptagent hat ausgeführt:
  - `pnpm build`
  - `pnpm preview` Background-Server
  - Playwright MCP: navigate → wait_for(ha-card) → console_messages → snapshot → evaluate
  - Geschrieben nach `metrics/playwright/<plan-id>-pre.json` und -post.json

Konkrete Aufgabe:
1. Lies beide Artefakte (pre + post).
2. Lies Spec §9 (UX-Verhalten).
3. Pflicht-Checks im post-Artefakt:
   • console: 0 error, 0 unerwartete warn (warns dokumentiert in Spec §X erwartet?)
   • DOM/A11y-Tree enthält: ha-card, svg, mind. 1 node-icon, mind. 1 edge
   • aria-labels auf Nodes und Edges gesetzt
   • tabindex sinnvoll (keine 0/-1-Mischung)
   • customElements.get('custom-energy-flow-card-editor') !== undefined
4. Delta pre→post:
   • neue Console-Errors/Warns?
   • DOM-Struktur unerwartet anders?
   • A11y-Regression (label/tabindex weg)?
5. UX-Vorgaben aus Spec §9 manuell durchquert.

[Rest analog]
```

**Pass 6 — Release-Readiness + Restrisiko:**

```
[...] Pass 6: **Release-Readiness + Restrisiko**.

Konkrete Aufgabe:
1. `pnpm build` Bundle ≤ 60 kB? (KPI-Skript-Output)
2. `pnpm build:analyze` zeigt keine verbotenen Deps?
3. `pnpm smoke` grün? (Hauptagent läuft, Sub-Agent fragt nach Output)
4. `pnpm check` grün?
5. Doku-Updates komplett pro Spec §7?
   • CLAUDE.md aktualisiert wo nötig?
   • architecture.md §4 ADR-Tabelle aktualisiert wenn neuer ADR?
   • ADR-Index aktualisiert wenn neuer ADR?
   • README.md Changelog wenn User-facing-Change?
6. HACS-Version-Bump nötig? `CARD_VERSION` und `hacs.json` synchron?
   **WICHTIG:** Diese Frage löst KEIN AUTO-FIX aus (Version-Bump ist out-of-scope für Code-Review). Befund ist `[USER-DECISION]` → "im finishing-a-development-branch-Skill Version-Bump einplanen".
7. Rollback-Pfad: gibt es einen Commit ab dem Revert teuer wird (Schema-Migration)?
8. Restrisiko-Top-3: was könnte nach Release User-Schaden anrichten?

[Rest analog]
```

## 4. Datenfluss

End-to-End-Lifecycle pro Plan (technisch konkret):

```
1. Plan-Review fertig (Plan-File in docs/plans/YYYY-MM-DD-X.md status: accepted)
2. Hauptagent öffnet Implementation-Phase:
     pnpm check && pnpm build && pnpm test:coverage  # Voraussetzungen für KPI
     pnpm kpi:snapshot --label pre-YYYY-MM-DD-X --phase pre
   → metrics/kpi-history.json bekommt neuen pre-Eintrag
3. Hauptagent öffnet Playwright-Capture-Stufe-1:
     # Server-Start mit Trap für Cleanup (Pflicht-Pattern):
     PREVIEW_PID=$(pnpm preview > /tmp/preview.log 2>&1 & echo $!)
     trap "kill $PREVIEW_PID 2>/dev/null" EXIT INT TERM
     # MCP-Tools:
     #   browser_navigate http://127.0.0.1:<PORT>/preview/preview.html
     #   browser_wait_for selector "ha-card"
     #   browser_console_messages → console_arr
     #   browser_snapshot → a11y_tree_obj
     #   browser_evaluate "customElements.get('custom-energy-flow-card-editor') !== undefined"
     # Artefakt explizit schreiben (NICHT auf MCP-Default-Pfad .playwright-mcp/
     # verlassen — der ist in .gitignore!):
     #   Hauptagent nutzt Write-Tool: metrics/playwright/YYYY-MM-DD-X-pre.json
     #   = { schema_version: "1.0", timestamp, phase, console: [...],
     #       a11y_tree: {...}, evaluate_results: {...} }
     browser_close
     kill $PREVIEW_PID  # Trap-Backup falls Hauptagent crasht: trap killt auch
4. CLAUDE.md "Implementation — Workflow" Phase 1 (TaskCreate-Batch) — unverändert.
5. Subagent-Driven Tasks (unverändert).
6. Nach letztem Task: pnpm check && pnpm build && pnpm test:coverage
     pnpm kpi:snapshot --label post-YYYY-MM-DD-X --phase post
7. Playwright-Capture-Stufe-1 erneut (post).
8. Code-Review-Workflow:
   Self-Review-Phasen A–H (Hauptagent, docs/templates/code-review-checklist.md)
   Iteration 1:
     Sub-Agent-Pass 1 → 2 → 3 → 4 → 5 → 6 (sequentiell)
     Pro Pass: Findings → AUTO-FIX inline / FIX-PLAN sammeln /
       USER-DECISION sammeln / VERIFY-NEEDED prüfen / LESSON-LEARNED appenden
     Trust-but-Verify pro AUTO-FIX gegen echten Code
     Nach Pass 6 dieser Iteration: FIX-PLAN-Findings? Ja → mini-Sub-Plan via
       writing-plans, subagent-driven-development implementieren, neue
       post-KPI-Snapshot überschreibt vorigen. Nein → Stop-Check.
   Iteration 2 (falls Iteration 1 AUTO-FIX hatte): alle 6 Pässe nochmal.
   Iteration 3 (max): nochmal.
   Stop: 2 Iterationen ohne neue AUTO-FIX/FIX-PLAN | nur USER-DECISION | max 3.
9. ADR-Check:
     Hauptagent scannt alle Findings + neue LESSON-LEARNED-Einträge.
     Frage: wiederkehrende Architektur-Entscheidung? Falls ja: ADR-Stub
     vorbereiten, als USER-DECISION präsentieren.
10. User-Vorlage:
     - USER-DECISION-Findings gebündelt mit Optionen
     - KPI-Delta-Tabelle aus pnpm kpi:report
     - Playwright-Artefakt-Pfade
     - Anzahl + Titel der neuen LESSON-LEARNED-Einträge
     - ADR-Vorschläge (falls vorhanden, mit Stub-Pfad)
11. User entscheidet pro USER-DECISION → Hauptagent setzt Entscheidungen um → ggf.
    weitere AUTO-FIX. KPI-Snapshot ggf. erneut updaten (post überschreiben).
12. Übergang an superpowers:finishing-a-development-branch.
```

## 5. Fehlerverhalten / Edge-Cases

- **KPI-Skript Crash** (z. B. Syntax-Error in `src/`-File, TS-Compiler kann nicht parsen): Skript schreibt Error auf stderr, exit code 1. Snapshot wird **nicht** appendet. Hauptagent muss erst die SyntaxError-Quelle fixen (separater Task), dann Snapshot erneut nehmen.
- **`coverage/coverage-summary.json` fehlt** (User vergaß `pnpm test:coverage`): KPI-Skript warnt auf stderr, schreibt `coverage_pct: null` + `coverage_per_layer: null`. Snapshot wird appendet. Sub-Agent-Pass 4 (Test-Tiefe) markiert Befund als `[VERIFY-NEEDED]` ("Coverage-Daten fehlen — Hauptagent muss `pnpm test:coverage` laufen lassen und Snapshot überschreiben").
- **`dist/custom-energy-flow-card.js` fehlt** (User vergaß `pnpm build`): `bundle_bytes: null`. Sub-Agent-Pass 6 markiert.
- **Playwright MCP-Server nicht verfügbar** (z. B. Browser-Engine fehlt): Hauptagent erkennt MCP-Tool-Error. Pass 5 wird **skipped** mit klar markierter Begründung im Bericht. Andere 5 Pässe laufen unverändert. User-Vorlage zeigt "Pass 5: skipped (Begründung)".
- **`pnpm preview`-Server-Port-Konflikt:** Hauptagent versucht alternative Ports oder bricht ab. Pass 5 skipped wie oben.
- **`metrics/kpi-history.json` korrupt** (parse-error): Skript bricht ab. Hauptagent muss File reparieren (git-Revert auf vorigen Stand) oder als USER-DECISION eskalieren.
- **History-File beginnt nicht mit `[`** (nie initialisiert): Erstes `kpi:snapshot` initialisiert mit `[snapshot]`. Plan-Schritt 1 sorgt durch `metrics/kpi-history.json` als `[]` Initialisierung dafür, dass das nie unklar ist.
- **Max 3 Iterationen erreicht, noch AUTO-FIX/FIX-PLAN offen:** Hauptagent stoppt zwingend, präsentiert als USER-DECISION ("Code-Review konvergiert nicht — was tun?"). Nie autonom über Budget hinaus.
- **Trust-but-Verify Sub-Agent-Finding ist falsch (false-positive):** Hauptagent dokumentiert Befund als `[VERIFY-NEEDED]`-resolved-to-not-a-bug im Pass-Bericht, nicht im Lessons-Log. Lehrt nichts Generalisierbares.
- **LESSON-LEARNED-Eintrag widerspricht conventions.md:** wird normal appendet, User entscheidet bei Curation, ob conv.md oder Lesson falsch ist.
- **Code-Review-Workflow nach Hotfix (kein Plan):** out-of-scope für initiale Version. Workaround: User legt ad-hoc-Plan an, Workflow läuft normal.

**Engine-Warnings statt Throws-Konvention** (conv §6.1) ist hier nicht aktiv betroffen, da die Spec keinen Source-Code ändert.

## 6. Tests

### 6.1 KPI-Skript Tests (manuell + integration)

Da `scripts/`-Files nicht durch `vitest.config.ts`-`include` gedeckt sind und auch existierende Skripte (`smoke-test.mjs`, `build-preview.mjs`) ohne formale Tests laufen, folgen wir demselben Muster:

**Akzeptanz-Kriterien (manuell verifiziert):**

1. **`pnpm kpi`** auf dem aktuellen Repo-State produziert ein valides JSON gegen das Schema §3.3 (verifiziert via `node -e "JSON.parse(execSync('pnpm kpi', ...))"`).
2. **`pnpm kpi:snapshot --label test --phase manual`** appendet einen Eintrag an `metrics/kpi-history.json`, vor Append-Anzahl + 1 = nach Anzahl. JSON bleibt valide.
3. **`pnpm kpi:report`** vergleicht die letzten zwei Einträge sinnvoll. Output enthält "=== KPI Delta:" Header.
4. **Threshold-Detection auf bekannter Verletzung**: Künstlich eine Funktion mit cyclomatic >10 in eine Test-Datei (NICHT committed) einbauen → Skript erkennt Verstoß. Test-Datei wieder löschen.
5. **Empty-Repo-Sanity**: Skript stürzt nicht ab bei Edge-Cases (leere `src/util/foo.ts`, File ohne exports, Test-File ohne `it`/`describe`).
6. **Coverage-Skip**: Wenn `coverage/coverage-summary.json` fehlt: `coverage_pct: null` ohne Crash.
7. **Bundle-Skip**: Wenn `dist/` fehlt: `bundle_bytes: null` ohne Crash.

Diese werden im Plan als Verifikations-Schritte aufgenommen, nicht als `*.test.mjs`-Files.

### 6.2 Workflow-End-to-End-Verifikation

**Akzeptanz-Kriterium für die Spec:** Nach Anlage des Workflows wird er **einmal manuell durchgespielt** mit einem kleinen Demo-Plan (z. B. trivialem Typo-Fix). Erwartung:

1. Pre-Snapshot wird erfolgreich angehängt
2. Mock-Implementation läuft
3. Post-Snapshot wird angehängt
4. Alle 6 Sub-Agent-Pässe laufen (auch wenn nichts gefunden wird)
5. Bei null Findings: Stop nach Iteration 1 (Pass 6 sagt "ready for user")
6. User-Vorlage zeigt KPI-Delta (vermutlich +0 oder ±wenig)
7. Playwright-Pass-5 produziert beide Artefakte (pre/post)

Diese End-to-End-Verifikation ist **Plan-Schritt 8** (siehe §12).

### 6.3 Coverage

- KPI-Skript hat keine Vitest-Coverage-Anforderung (analog `smoke-test.mjs`, `build-preview.mjs`).
- `coverage.include` und `coverage.thresholds` in `vitest.config.ts` bleiben **unverändert** — `scripts/` bleibt außerhalb des Vitest-Scope.
- `coverage.reporter` in `vitest.config.ts` ist eine separate **USER-DECISION** (siehe §10 Risiko-Tabelle: `coverage-summary.json` wird vom Default-Reporter nicht erzeugt). Falls Option (a) gewählt → 1-Zeilen-additive-Änderung an einer §0.4 Don't-Touch-Datei, daher User-Vorlage zwingend.
- Conv §5.1 Coverage-Pflicht (≥90% für engine/config/util) bleibt unverändert — diese Spec ändert keinen `src/`-Code.

## 7. Auswirkung auf Doku

**Hauptspec `2026-05-10-custom-energy-flow-card-design.md`:**

- Keine Änderung — Workflow ist meta-prozedural, nicht funktional.

**`docs/architecture.md`:**

- §4 (ADR-Tabelle): ADR-0021 hinzufügen mit Kurz-Begründung
- §2 (Layer-Architektur): keine Änderung — keine neuen Layer
- §6 (Wie wir erweitern): keine Änderung

**`docs/adr/README.md` (ADR-Index):**

- ADR-0021 hinzufügen

**`docs/adr/0012-headless-smoke-test-pre-release-gate.md`:**

- Cross-Reference auf ADR-0021 als "erweitert von ADR-0021 (Code-Review-Workflow)" hinzufügen — 1-Zeilen-Edit in den existierenden `## Verlinkte Spec-Sektionen / Referenzen`-Block am Ende der Datei (nicht einen neuen "Verlinkte ADRs"-Block anlegen — der existiert in ADR-0012 nicht).

**`CLAUDE.md`:**

- Neue Top-Level-Sektion **"Code-Review — Workflow (verbindlich)"** zwischen "Implementation — Workflow (verbindlich)" und "Module-Layer (Kurzform)". Inhalt: Phase 1 (Pre-Plan-Snapshot) / Phase 2 (Implementation) / Phase 3 (Post-Plan-Snapshot) / Phase 4 (Self-Review + 6-Pass-Iteration) / Phase 5 (ADR-Check + User-Vorlage). Analog zu "Spec-Erstellung" und "Plan-Erstellung". ~80–120 Zeilen.
- Doku-Karte: Zeilen für `docs/templates/code-review-checklist.md`, `scripts/kpi.mjs`, `metrics/kpi-history.json`, `docs/lessons-learned.md` ergänzen.
- "Wo dokumentiere ich was?"-Tabelle: Zeile "Lesson aus Code-Review" → `docs/lessons-learned.md` (append, kein Edit von Spec/Plan). Zeile "Promotion einer Lesson in Convention/ADR" → User-curiert, PROMOTED-Tag.
- "Implementation — Workflow (verbindlich)"-Sektion: erweitern um Pre-/Post-Snapshot-Schritte (Phase 1 und Phase 4 als neue Subschritte vor TaskCreate-Batch und nach letztem Task).

**`docs/templates/plan-template.md`:**

- Standing-Requirement-Block erweitern: nach erstem Implementation-Task `pnpm kpi:snapshot --label pre-<plan-id> --phase pre` ist Pflicht, nach letztem Task `pnpm kpi:snapshot --label post-<plan-id> --phase post`.
- "Phases:"-Block-Beispiel um Phase 0 "Pre-Snapshot" und Phase N+1 "Post-Snapshot + Code-Review-Trigger" erweitern.
- Sonst Template-Struktur unverändert (Goldstandard-Plans bleiben gültig).

**`README.md`:**

- Keine Änderung — Workflow ist Developer-Doku, nicht User-facing.

## 8. ADR (Neuer ADR-0021)

**Titel:** `0021-code-review-workflow-pre-release-gate.md`

**Stub (1:1 für den Planer übernehmbar):**

```markdown
# ADR-0021: Code-Review-Workflow als Pre-Release-Quality-Gate

- **Status:** accepted
- **Datum:** 2026-05-15
- **Entscheider:** @griebner
- **Erweitert:** ADR-0012 (Headless-Smoke-Test) — Code-Review-Workflow ist die zweite, tiefere Pre-Release-Stufe

## Kontext und Problem

Spec- und Plan-Review-Workflows (CLAUDE.md "Spec-Erstellung", "Plan-Erstellung") liefern hohe Architektur-Qualität **vor** Implementation. ADR-0012 (Smoke-Test-Gate) fängt Class-Load-Crashes **vor** Release. Zwischen Implementation und Release fehlte ein systematischer Pass für:

1. Code-Qualitäts-Drift (Komplexität, LOC-Limits, Type-Safety-Counter)
2. Wartbarkeits-KPI-Trends über Plan-Sequenz
3. Funktionale UI-Verifikation (Smoke-Test rendert nicht — nur Custom-Element-Registrierung)
4. Lessons-Learned-Sammelpunkt zur User-Curation in conventions / neue ADRs

## Entscheidungs-Treiber

- Code-Qualität ist KPI-messbar, nicht nur Augenmaß
- Wartbarkeits-Drift über mehrere Pläne hinweg sichtbar machen
- Playwright MCP ist verfügbar, wird nicht systematisch genutzt
- Rotierende Fokus-Vektoren haben sich in Spec/Plan-Review als überlegen zur identischen Skepsis-Prompt erwiesen — Pattern wiederverwenden
- Spec/Plan-Dokumente sind historisches Protokoll — retroaktive Edits sind Revisionismus

## Geprüfte Optionen

- **A — 6-Brillen-Code-Review-Workflow mit KPI-Skript, Playwright-MCP-Two-Stage, Lessons-Pipeline** (gewählt)
- **B — Nur KPI-Skript ohne strukturierten Pass-Workflow** (zu schwach — keine Architektur-/UX-Checks)
- **C — ESLint-Plugins für Wartbarkeit (eslint-plugin-sonarjs etc.)** (passt nicht zu ADR-0003 / conv §13 Bewusste-Selbst-Beschränkung)
- **D — Status quo: nur Smoke-Test + Code-Review-Skill** (nicht systematisch, Drift unentdeckt)

## Entscheidung

**Gewählt: Option A.** Verbindlicher Post-Implementation-Workflow mit:

1. `scripts/kpi.mjs` — Wartbarkeits-KPI-Snapshot (Komplexität, Abhängigkeiten, Methoden-/Komponenten-Länge, LOC, Escape-Hatch-Counter, Bundle-Bytes, Coverage pro Layer, dead-exports, intra-layer-Import-Cycles, Test-Lücken)
2. `metrics/kpi-history.json` — append-only, git-tracked, Pre/Post-Snapshots pro Plan
3. `docs/templates/code-review-checklist.md` — Self-Review-Phasen + 6 rotierende Sub-Agent-Pass-Brillen (Spec/Plan↔Code-Coverage, Architektur+ADRs+Conventions, Wartbarkeits-KPIs, Test-Tiefe+TDD-Compliance, UX+Funktional via Playwright MCP, Release-Readiness+Restrisiko)
4. `docs/lessons-learned.md` — append-only Hot-Pot mit User-Curation-Pipeline (Promotion in conventions / neue ADRs / Plan-Template-Updates)
5. ADR-Check als expliziter Schritt vor User-Vorlage
6. 5 Finding-Kategorien: AUTO-FIX / FIX-PLAN / USER-DECISION / VERIFY-NEEDED / LESSON-LEARNED
7. Iteration-Budget: max 3 × 6 Pässe = bis 18 Sub-Agent-Runs + Fix-Pläne

### Positive Konsequenzen

- Wartbarkeits-KPIs sichtbar in PRs (git-tracked metrics/)
- Drift wird Plan-für-Plan dokumentiert
- Funktionale UI-Verifikation via Playwright MCP
- Lessons werden systematisch gesammelt und curiert
- Konsistent mit existierendem Spec/Plan-Workflow (rotierende Fokus-Vektoren)

### Negative Konsequenzen

- Wall-Clock-Zeit pro Plan steigt (bis zu 18 Sub-Agent-Runs + Playwright-Capture)
- `metrics/`-Folder wächst monoton (Pruning ist Future-Work)
- KPI-Skript ist neue Komplexität (~300–400 LOC `.mjs`)

## Pros und Cons der Optionen

### Option A — Verbindlicher 6-Pass-Workflow + KPI-Skript (gewählt)

- ✅ Adressiert alle 4 identifizierten Gaps
- ✅ Konsistent mit Spec/Plan-Workflow
- ✅ Keine neuen Deps (Tier 0+1 KPI mit TS-Compiler-API)
- ❌ Wall-Clock-Zeit pro Plan steigt
- ❌ Skript-Wartung (~300–400 LOC)

### Option B — Nur KPI-Skript

- ✅ Geringerer Aufwand
- ❌ Keine Architektur-/UX-/Test-Tiefen-Checks
- ❌ Kein strukturierter Lessons-Pfad

### Option C — ESLint-Plugins

- ✅ Auto-Detection via Lint
- ❌ Neue DevDeps (conv §13)
- ❌ ESLint-Plugin-Quirks für Komplexität sind oft falsch-positiv
- ❌ Keine Trend-Historie

### Option D — Status quo

- ✅ Kein zusätzlicher Aufwand
- ❌ Drift bleibt unentdeckt
- ❌ Lessons gehen verloren

## Verlinkte Spec-Sektionen / Referenzen

- Subspec [`docs/specs/2026-05-15-code-review-workflow.md`](../specs/2026-05-15-code-review-workflow.md)
- [ADR-0012](./0012-headless-smoke-test-pre-release-gate.md) (Smoke-Test — erste Stufe)
- [ADR-0010](./0010-shared-util-module.md) (Single-Source — KPI-Detection erzwingt sie)
- `docs/templates/spec-review-checklist.md` (strukturelle Vorlage für Code-Review-Checklist)
```

## 9. UX-Verhalten und Out-of-Scope

### 9.1 UX-Verhalten (was der Entwickler/Maintainer sieht/erlebt)

Diese Spec ändert **keine** End-User-UX der Card. UX hier bezieht sich auf den Entwickler-Workflow:

- **Vor jedem Plan-Start:** `pnpm kpi:snapshot --label pre-...` (1 Befehl, ~2 s)
- **Nach jedem Plan-Ende:** dito post + Code-Review-Workflow (bis ~10 min Wall-Clock-Zeit für 1 Iteration ohne Findings, bis 60+ min für 3 Iterationen mit FIX-PLAN-Umsetzung)
- **PR-Review:** Diff zeigt `metrics/kpi-history.json`-Drift als JSON-Diff. Reviewer sieht direkt KPI-Anstiege oder -Verbesserungen
- **`docs/lessons-learned.md`** wächst über die Zeit. User scannt nach jedem Code-Review-Run die neuen Einträge und entscheidet pro Eintrag: in conventions.md promoten / als ADR-Vorschlag annehmen / in Plan-Template integrieren / verwerfen (Eintrag bekommt `PROMOTED-Tag` statt Löschen — Herkunft bleibt traceable)
- **Failure-Mode:** Wenn Pass 5 (Playwright) skipped wird (z. B. wegen MCP-Verfügbarkeit), zeigt der finale User-Bericht das klar. Anderen 5 Pässe laufen normal weiter.

### 9.2 Out-of-Scope

- **Per-Phasen-Quality-Gate** (Frage 1 entschied dagegen): Ein Review nur am Plan-Ende. Per-Phase wäre 3–5× mehr Aufwand, fängt Drift früher, aber für Solo-Dev-Repo überzogen.
- **KPI-Dashboard-UI** (HTML-Report aus History): v1.x-Kandidat. Aktuell stdout + JSON-Diff in PRs ausreichend.
- **Visual-Regression-Screenshots** (Frage 5 entschied "Light"): kein Screenshot-Storage, nur DOM/A11y-Snapshots. Future-Work falls visuelle Regressionen häufig.
- **Interaktions-Tests via Playwright** (Editor-Klicks, Mode-Switch): brittle bei Sandbox-Drift, hoher Wartungs-Overhead. Future-Work.
- **Per-Commit-KPI-Tracking**: nur Pre/Post-Plan. Future-Work falls Code-Review zu spät kommt.
- **History-Pruning**: keine initiale Pruning-Logik. ~5–10 kB pro Snapshot × ~50 Snapshots/Jahr = 500 kB/Jahr → erst nach Jahren relevant. Wenn ja: dann ein separater ADR.
- **Cross-Browser-Tests**: nur Chromium via Playwright MCP. Lit ist Cross-Browser-stabil, kein realistisches Risiko.
- **Slack/Email-Notifications** bei KPI-Regression: irrelevant für Solo-Dev-Projekt.

## 10. Risiken

Sortiert nach Schwere (Wahrscheinlichkeit × Auswirkung), absteigend:

| Risiko                                                                                                                                           | Wahrscheinlichkeit | Auswirkung                               | Mitigation                                                                                                                                                                      |
| ------------------------------------------------------------------------------------------------------------------------------------------------ | ------------------ | ---------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| KPI-Skript-Bug produziert falsche Werte (Komplexität, Fan-In)                                                                                    | mittel             | False-Positive-Findings, Vertrauen sinkt | Plan-Schritt 8 (End-to-End-Verifikation manual). Trust-but-Verify pro Finding. Skript bleibt einfach (~300–400 LOC, Tier 0+1, keine externen libs für Komplexität-Heuristik)    |
| Iteration-Loop konvergiert nicht (>3 Iterationen)                                                                                                | niedrig (Annahme)  | Stop, USER-DECISION nötig                | Hartes Cap auf 3 Iterationen. Bei Oszillation: STOP + USER-DECISION                                                                                                             |
| Sub-Agent-Pass 5 (Playwright) flaky (MCP-Timeouts, Port-Conflict)                                                                                | mittel             | Pass skipped, UX-Verifikation fehlt      | Klar dokumentierter Skip im Bericht. Andere 5 Pässe laufen unbeeinträchtigt. Pre-Snapshot fehlt → Delta-Vergleich impossible, aber Post-Check allein wertvoll                   |
| Playwright MCP-Artefakt-Format ändert sich (Tool-Update)                                                                                         | niedrig            | Sub-Agent-Parser bricht                  | Artefakt-JSON-Schema dokumentiert in checklist. Schema-Version-Tag                                                                                                              |
| Sub-Agent-Findings sind oft False-Positive                                                                                                       | mittel             | Trust-but-Verify-Overhead steigt         | Plan-Workflow zeigt: Trust-but-Verify funktioniert. Reuse-Pattern.                                                                                                              |
| `metrics/`-File wächst exponentiell (Snapshot zu groß)                                                                                           | niedrig            | Disk-Space, PR-Diff-Lärm                 | Annahme: ~5–10 kB pro Snapshot, ~50 Snapshots/Jahr. Pruning Future.                                                                                                             |
| LESSON-LEARNED-Liste wächst, Promotion verschoben                                                                                                | mittel             | Lessons-File wird unübersichtlich        | User-Curation als bewusster Workflow-Schritt nach Code-Review. PROMOTED-Tag verhindert Verlust                                                                                  |
| KPI-Schema-V1.0 muss später aufgebrochen werden                                                                                                  | niedrig            | History wird inkompatibel                | `version: "1.0"` als Schema-Marker. Migration via separater ADR + Skript-Update                                                                                                 |
| `coverage/coverage-summary.json` (User entschied: vitest.config.ts Option (a) — `coverage.reporter: ['text', 'json-summary']` additive ergänzen) | RESOLVED           | KPI-Skript bekommt `coverage_pct`-Werte  | §3.1 Datei-Tabelle hat eine vitest.config.ts-EDIT-Zeile. §0.4 Don't-Touch wurde minimal aufgeweicht. Kein ADR-0022 nötig — 1-Liner mit Commit-Body-Begründung (conv §13).       |
| Workflow-Wall-Clock-Zeit zu hoch für kleine Pläne (Typo-Fix)                                                                                     | mittel             | User skipped Workflow, Disziplin sinkt   | Workflow ist verbindlich für **alle** Pläne. Bei 0 Findings: 1 Iteration = 6 Sub-Agent-Pässe + Playwright = ~10 min. Akzeptabel. Skip ist Skip-the-Whole-Workflow USER-DECISION |

### 10.1 Verschärfter Risiko-Block: KPI-Skript-Bug

Wahrscheinlichkeit mittel — Skript hat 300–400 LOC, ~6–8 Algorithmen (Complexity, Imports, Fan-In, Dead-Exports, Cycles, Coverage-Parse, Bundle-Read, Violation-Detection). Jeder Algorithmus kann false-positive sein.

**Workaround-Strategie:**

1. Plan-Schritt 8 (End-to-End-Verifikation manual) muss **wirklich** durchgespielt werden — nicht abkürzen.
2. Erste Iterationen: bewusste Skepsis gegenüber Skript-Output. Bei jedem "Threshold-Verstoß"-Finding: manuell verifizieren (Code-Stelle anschauen).
3. Wenn Skript-Bug entdeckt: als `[FIX-PLAN]` markieren (Skript ist Teil der Codebase), neue mini-Sub-Plan-Iteration.

**Verifikations-Code für ersten Snapshot:**

```bash
pnpm kpi > /tmp/kpi-now.json
node -e "const data = JSON.parse(require('fs').readFileSync('/tmp/kpi-now.json', 'utf8'));
  console.log('files:', data.totals.files);
  console.log('any_count:', data.totals.any_count);
  console.log('layer engine:', JSON.stringify(data.layers.engine));"

# Stimmt Files-Count?
ls src/**/*.ts | grep -v test | wc -l

# Stimmt any_count?
grep -rn "\bany\b" src --include="*.ts" | grep -v "// eslint-disable" | wc -l
```

Wenn die Werte um >10% abweichen: Skript hat einen Bug.

## 11. Erfolgs-Kriterien

- [ ] **`scripts/kpi.mjs`** existiert und exportiert kein `default`-Export (ist ein CLI-Skript)
- [ ] **`pnpm kpi`** läuft auf dem aktuellen Repo-State, produziert JSON gegen Schema §3.3
- [ ] **`pnpm kpi:snapshot --label test --phase manual`** appendet validen Eintrag an `metrics/kpi-history.json`
- [ ] **`pnpm kpi:report`** vergleicht die letzten zwei Einträge, Output enthält "=== KPI Delta:" Header
- [ ] **`metrics/kpi-history.json`** initial vorhanden als `[]`, git-tracked
- [ ] **`metrics/playwright/`** verzeichnis-existent, git-tracked via `.gitkeep`
- [ ] **`docs/templates/code-review-checklist.md`** existiert mit Phasen A–H + Phase Z (6 Sub-Agent-Prompts, vollständig nutzbar 1:1)
- [ ] **`docs/lessons-learned.md`** existiert mit Header + Curation-Workflow-Erklärung + leeren Body
- [ ] **`docs/adr/0021-code-review-workflow-pre-release-gate.md`** existiert (Stub aus §8 1:1 übernommen)
- [ ] **`docs/adr/README.md`** indexiert ADR-0021
- [ ] **`docs/architecture.md` §4** enthält ADR-0021 mit Kurz-Begründung
- [ ] **`CLAUDE.md`** hat neue Sektion "Code-Review — Workflow (verbindlich)" zwischen "Implementation — Workflow" und "Module-Layer"
- [ ] **`CLAUDE.md`** Doku-Karte enthält Zeilen für code-review-checklist.md, kpi.mjs, kpi-history.json, lessons-learned.md
- [ ] **`CLAUDE.md`** "Implementation — Workflow"-Sektion enthält Pre-/Post-Snapshot-Schritte
- [ ] **`package.json`** Scripts `kpi`, `kpi:snapshot`, `kpi:report` enthalten, existierende Scripts unverändert
- [ ] **`.gitignore`** ignoriert `metrics/` NICHT (entweder fehlt der Pattern, oder explizites `!metrics/`)
- [ ] **`pnpm check`** grün (lint + typecheck + tests)
- [ ] **`pnpm smoke`** grün (ADR-0012 Smoke-Test unverändert)
- [ ] **`pnpm build`** Bundle ≤ 60 kB minified (unverändert, da kein `src/`-Edit)
- [ ] **LOC-Regression-Check:** `wc -l src/**/*.ts` zeigt **keine** Änderung vs Plan-Start (Spec ändert kein `src/`)
- [ ] **Unverändert-Check:** `git diff main...HEAD -- src/` ist leer
- [ ] **End-to-End-Verifikation manuell** (Plan-Schritt 8): einmal kompletten Workflow durchspielen mit Dummy-Plan, alle 6 Pässe laufen, Lessons-Datei wird gefüllt, User-Vorlage zeigt KPI-Delta
- [ ] **ADR-0021** im Index referenziert + in architecture.md §4 sichtbar

## 12. Plan-Schritte (Reihenfolge mit Begründung)

Erwarteter Gesamtumfang: ~12 Plan-Tasks (1 Vorab-Gate, 1 Tracked-Dirs, 5 Implementation, 1 ADR, 3 Doku, 1 End-to-End-Verifikation).

1. **ADR-0021 anlegen** (Phase 0). Begründung: ADRs werden VOR Code laut conv §12. Stub aus §8 übernehmen. `docs/adr/README.md` index updaten. `docs/architecture.md` §4 updaten.

2. **`metrics/`-Tracked-Dirs anlegen** (Phase 1). `mkdir -p metrics/playwright`, `touch metrics/.gitkeep`, `touch metrics/playwright/.gitkeep`, `echo '[]' > metrics/kpi-history.json`. `.gitignore`-Check.

3. **`scripts/kpi.mjs` Grundgerüst + Konstanten** (Phase 2). Datei anlegen mit Top-Level-Konstanten (Thresholds), CLI-Dispatch-Skeleton, Imports. Manuell: `node scripts/kpi.mjs` exit-0.

4. **`scripts/kpi.mjs` File-Analyse + AST-Walks** (Phase 2). `analyzeFile`, `functionMetrics`, `cyclomaticForFunction`, Imports/Exports-Detection, Escape-Hatch-Counter. Verifikation: `pnpm kpi` produziert sinnvolle Werte für 2–3 known files (z. B. `src/util/format-power.ts` mit cyclomatic ~3).

5. **`scripts/kpi.mjs` Import-Graph + Dead-Exports + Cycles + Violations + Coverage-Parse + Bundle-Read** (Phase 2). Verifikation: Threshold-Verstöße werden bei künstlich-eingebauter Verletzung erkannt (Test-Beispiel aus §6.1 Akzeptanz 4).

6. **`scripts/kpi.mjs` History-IO + Delta-Report + CLI-Vervollständigung** (Phase 2). `pnpm kpi:snapshot --label test --phase manual` appendet. `pnpm kpi:report` läuft. `package.json`-Scripts hinzufügen. **`package.json` `engines: { node: ">=20" }` additiv ergänzen.** **`vitest.config.ts` `coverage.reporter: ['text', 'json-summary']` additiv ergänzen.**

7. **`docs/templates/code-review-checklist.md` schreiben** (Phase 3). Self-Review-Phasen A–H. Phase Z mit 6 Sub-Agent-Pass-Prompts (Skelette aus §3.7 vollständig ausformulieren). Iteration-Loop-Beschreibung analog zu plan-review-checklist.md Phase Z.

8. **`docs/lessons-learned.md` anlegen** (Phase 3). Header + Curation-Workflow-Erklärung + PROMOTED-Tag-Spec.

9. **`CLAUDE.md` updaten** (Phase 5). Neue Sektion "Code-Review — Workflow (verbindlich)". Doku-Karte + "Wo dokumentiere ich was?"-Tabelle. "Implementation — Workflow"-Sektion erweitern.

9a. **`docs/templates/plan-template.md` updaten** (Phase 5). Standing-Requirement-Block + Phases-Block um Pre/Post-Snapshot erweitern, sonst driftet CLAUDE.md vs Plan-Template. Optional als eigener Commit `docs(templates): align plan-template with new code-review workflow`.

9b. **`docs/adr/0012-...md` Cross-Reference** (Phase 4). 1-Zeilen-Edit für Forward-Reference auf ADR-0021.

10. **`pnpm check` + `pnpm build` + `pnpm smoke` grün** (Phase 5). Alle bestehenden CI-Gates müssen weiter grün laufen, da kein `src/`-Edit.

11. **End-to-End-Verifikation manuell** (Phase 6). Einmal kompletten Workflow mit Dummy-Plan durchspielen. Alle Akzeptanz-Kriterien §11 verifizieren.

12. **Initialer Pre-Snapshot des Repo-States** (Phase 6). Optional als Baseline für künftige Pläne: `pnpm kpi:snapshot --label baseline-2026-05-15 --phase manual` (oder beim ersten Plan natürlich-pre).

**Kritische Abhängigkeit:** Plan-Schritte 3–6 sind Skript-Inkremente — jeder Schritt muss isoliert lauffähig sein (vorherige Schritte einbeziehen, kein Big-Bang). Plan-Schritte 7–9 sind Doku, parallel möglich. Plan-Schritt 11 (End-to-End) ist Pflicht **vor** finalem Commit.

### 12.1 Empfohlene Commit-Granularität (Conventional Commits, conv §8)

| Task(s) | Conventional-Commit-Vorlage                                                               |
| ------- | ----------------------------------------------------------------------------------------- |
| 1       | `docs(adr): add ADR-0021 code-review-workflow-pre-release-gate + index`                   |
| 2       | `chore(metrics): scaffold metrics/ with kpi-history.json placeholder`                     |
| 3–4     | `feat(scripts): add kpi.mjs scaffolding + AST analyzer`                                   |
| 5       | `feat(scripts): kpi.mjs import-graph, dead-exports, cycles, violations, coverage, bundle` |
| 6       | `feat(scripts): kpi.mjs history append + delta report + package.json scripts`             |
| 7       | `feat(docs): add code-review-checklist template with 6 focus-vector prompts`              |
| 8       | `feat(docs): add lessons-learned hot-pot + curation workflow`                             |
| 9       | `docs(claude): extend CLAUDE.md with code-review workflow + implementation hooks`         |
| 9a      | `docs(templates): align plan-template with pre/post-snapshot steps`                       |
| 9b      | `docs(adr): cross-ref ADR-0012 → ADR-0021`                                                |
| 11–12   | `chore(metrics): end-to-end verification + initial baseline snapshot`                     |

`pnpm check` MUSS zwischen den Commits jeweils grün laufen.
