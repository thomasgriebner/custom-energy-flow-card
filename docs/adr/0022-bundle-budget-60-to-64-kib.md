# ADR-0022: Bundle-Budget 60 KiB → 64 KiB

- **Status:** accepted
- **Datum:** 2026-05-15
- **Entscheider:** @griebner

## Kontext und Problem

Das Bundle-Budget ist seit v0.9.0 (ADR-0013) auf **60 kB** (= 60 KiB = 61440 B) fixiert und im `scripts/kpi.mjs:29` als `BUNDLE_BUDGET_BYTES = 60 * 1024` operationalisiert. Beim Implementations-Workflow für die Subspec `2026-05-15-akku-prozent-im-ring.md` zeigte sich:

- Bundle lag bereits **vor** dem Code-Change bei **61446 B** (6 B über Budget) — Drift aus mehreren früheren Commits.
- Nach Spec/Plan-treuer Implementation lag das Bundle bei 61984 B (+538 B durch SoC-%-Text + `formatSocPct` + `Number.isFinite`-Guard + Magic-Number-Konstanten).
- Whitespace-Trim in den SVG-Templates + `clampSoc`-Konsolidierung brachten das Bundle auf 61434 B (6 B Reserve), aber **um den Preis von Spec-Plan-Drift**: Magic-Numbers (`9`, `400`, `-45`, `#ffffff`) wurden inline gelassen statt als Konstanten extrahiert.

Code-Review-Pass 3 hat das als „**Whitespace-Trim ist Einmal-Trick**" markiert: Lit-`svg`-Templates lassen sich exakt einmal whitespace-komprimieren. Die nächste Render-Layer-Subspec hätte kein Polster mehr — Bundle-Budget würde reproduzierbar das **dominanteste Constraint im Projekt** und Lesbarkeit dauerhaft verdrängen.

## Entscheidungs-Treiber

- Spec/Plan-Treue (Magic-Numbers als Konstanten — conventions §11, §1.3) soll **nicht** dauerhaft gegen Bundle-Constraint stehen.
- HACS-Distribution ist tolerant gegenüber 64 KiB — kein technischer Lade-Druck.
- Lit 3.2 + Rollup 4 Minified-Bundle wächst pro Render-Feature um 200–800 B (siehe KPI-Historie 2026-05-10..15: 60880 → 61446 B in 5 Subspecs).
- 60 KiB war ein psychologischer Anker („round number"), kein technisches Limit.

## Geprüfte Optionen

- **Option A — Status quo (60 KiB)**: Bundle-Budget bleibt 60 KiB. Jeder neue Render-Code-Pfad muss aktiv kompensiert werden (Whitespace-Trim erschöpft, andere Refactors nötig).
- **Option B — Budget 64 KiB anheben**: `BUNDLE_BUDGET_BYTES = 64 * 1024 = 65536`. 4 KiB neuer Headroom (~6 Subspecs Reserve bei 600 B-pro-Spec).
- **Option C — Budget 80 KiB anheben**: Großzügigerer Puffer, aber kein konkreter Bedarf — Bundle wächst langsam, 64 KiB reicht für 12+ Monate.

## Entscheidung

**Gewählt: Option B — Budget auf 64 KiB (65536 B) anheben.**

Operationalisierung:

- `scripts/kpi.mjs:29`: `BUNDLE_BUDGET_BYTES = 64 * 1024` (Single-Source).
- Doku-Updates: `docs/conventions.md §13`, `docs/architecture.md §6`, `CLAUDE.md` Tech-Stack-Tabelle, ADR-0013 §"Verifikation", ADR-0020 §"Constraints" — alle Verweise auf „60 kB" werden zu „64 KiB" oder besser zu „`BUNDLE_BUDGET_BYTES` aus `scripts/kpi.mjs:29`" (Single-Source-Verweis, vermeidet Zukunfts-Drift bei weiteren Bumps).
- Plan/Spec-Templates: `plan-template.md` Verifikations-Pipeline-Bullet ist bereits auf `BUNDLE_BUDGET_BYTES` umgestellt (Lesson 2026-05-15) — kein weiterer Edit nötig.

### Positive Konsequenzen

- **Spec-Treue erreichbar:** Konstanten-Extraktion in `battery-ring.ts` ohne Bundle-Druck umsetzbar.
- **Headroom für nächste 6+ Subspecs** ohne Konstante-vs-Lesbarkeit-Trade-offs.
- **Single-Source-Verweis** in Doku eliminiert Zukunfts-Drift bei weiteren Bumps (z.B. 64 → 80 KiB in v1.x).

### Negative Konsequenzen

- **Bundle wächst tendenziell schneller**, weil Druck weg ist. Mitigation: Code-Review-Pass 3 (Wartbarkeits-KPIs) misst Bundle-Trend pro Iteration; bei +1 KiB-Drift pro Subspec ist eine erneute Diskussion fällig.
- **Psychologischer „60-kB"-Anker geht verloren**. Mitigation: Tech-Stack-Tabelle in `CLAUDE.md` macht den neuen Wert sichtbar.
- **ADR-0013 (v0.9.0)-Verifikation widerspricht jetzt**. Mitigation: Cross-Reference im ADR-0013 mit Hinweis auf ADR-0022.

## Pros und Cons der Optionen

### Option A — Status quo (60 KiB)

**Pro:** Disziplin-Constraint zwingt zu schlankem Code.

**Contra:** Whitespace-Trim ist erschöpft; nächste Subspec scheitert reproduzierbar an Magic-Number-Konstanten vs Bundle-Constraint. Spec/Plan-Drift wird normalisiert.

### Option B — 64 KiB

**Pro:** Reichlich Headroom (4 KiB neuer Puffer), Spec-Treue erreichbar, klar dokumentierbar.

**Contra:** Verliert den 60-kB-Anker, leichter Drift-Bias bei Folge-Subspecs.

### Option C — 80 KiB

**Pro:** Sehr langfristiger Puffer.

**Contra:** Spekulativ — Bundle wächst aktuell ~600 B/Subspec; 80 KiB ist mehr als nötig und schwächt das Constraint ohne konkreten Bedarf.

## Operationale Folgen

- KPI-Historie zeigt seit `baseline-2026-05-15` (61439 B) eine kontinuierliche Drift in Richtung Budget — Bump kommt zur richtigen Zeit, nicht reaktiv „weil's gerade nicht passt".
- `scripts/kpi.mjs` Threshold `bundle_above_budget` greift weiterhin — nur die Schwelle verschiebt sich.
