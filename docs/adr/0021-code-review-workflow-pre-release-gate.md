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
