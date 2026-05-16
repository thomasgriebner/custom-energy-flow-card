# ADR-0024: Bundle-Budget 64 KiB → 80 KiB

- **Status:** accepted
- **Datum:** 2026-05-16
- **Entscheider:** @griebner
- **Supersedes:** ADR-0022 (Bundle-Budget 60 KiB → 64 KiB, accepted 2026-05-15)

## Kontext und Problem

Nach Implementation der EN-i18n-Subspec (Subspec `2026-05-15-en-i18n.md`, Plan v3, Release v0.14.0) zeigt der KPI-Snapshot:

- Bundle pre-Implementation: 61475 B (60.0 KiB)
- Bundle post-Implementation: 64615 B (63.1 KiB)
- Reserve unter 64 KiB Budget: **921 Bytes**

Plan-Schätzung war +1 KiB Overhead für i18n; tatsächlich +3.1 KiB (Lesson 2026-05-16 dokumentiert die Ursachen: EN-Strings ~700 B + Argument-Objekt-Interfaces ~800 B + RenderContext-`t`-Throughput ~1.5 KiB).

Spec §1.5 i18n-Architektur ist explizit auf einfache Erweiterung weiterer Sprachen ausgelegt (`resolveT(lang)`-Factory, `Widen<typeof DE>`). Jede weitere Sprache kostet ~1.5 KiB Strings + Hash-Map-Overhead. Bei FR/ES/IT (v1.x-Roadmap-Kandidaten) wäre das Budget innerhalb ein bis zwei Sprachen erreicht.

ADR-0023 negative Konsequenz markiert „Bei FR/ES würde Budget knapp" als bewusste v1.x-Frage. Dieser ADR löst sie präventiv VOR der nächsten Sprach-Implementation.

## Entscheidungs-Treiber

- Headroom für 3–4 weitere Sprachen vor erneutem Bump
- HACS-Distribution ist tolerant gegenüber 80 KiB (kein technischer Lade-Druck — `dist/`-Files bis ~500 KiB werden in HA-Lovelace gängig verteilt)
- Vermeidung von „Bundle-Budget-Bump pro Sprach-Plan" als wiederkehrende Bürokratie
- Lesson 2026-05-16 (en-i18n): pro Sprache realistisch ≥ 1.5 KiB einplanen, plus Framework-Pattern-Overhead

## Geprüfte Optionen

- **A — Budget 72 KiB**: +8 KiB. Reicht für 2 weitere Sprachen, dann erneuter Bump. Konservativ.
- **B — Budget 80 KiB**: +16 KiB. Reicht für 4–5 weitere Sprachen UND ggf. neue Render-Features parallel. Großzügig, aber semantisch passend zum gewählten i18n-Pattern (statisches Bundle inkl. aller Sprachen).
- **C — Dynamic-Import aktivieren statt Budget bumpen**: ADR-0023 Option D verworfen, weil Async-Komplexität ohne Nutzen bei wenigen Sprachen. Bei N > 5 Sprachen lohnt sich das ggf. — separater zukünftiger ADR.
- **D — Status quo 64 KiB**: 921 B Reserve — bei FR-Plan würde Budget gleich gesprengt. Reaktive Bumps sind dokumentations-aufwändig.

## Entscheidung

**Gewählt: Option B — Budget auf 80 KiB (81920 B) anheben.**

Konkrete Umsetzung:

- `scripts/kpi.mjs:29`: `BUNDLE_BUDGET_BYTES = 80 * 1024` (Single-Source).
- ADR-0022 Status: `superseded by ADR-0024`.
- Doku-Updates: `docs/conventions.md §13`, `docs/architecture.md §4`, ADR-Index — alle Verweise nutzen weiterhin den Single-Source `BUNDLE_BUDGET_BYTES`-Verweis (Lesson 2026-05-15-akku Bundle-Budget-Single-Source-Pattern).
- Spec-/Plan-Templates: `spec-template.md` §0.1 und `plan-template.md` Verifikations-Pipeline sind schon auf `BUNDLE_BUDGET_BYTES` umgestellt — keine Template-Edits nötig.

### Positive Konsequenzen

- Headroom für 4–5 weitere Sprachen bei beibehaltener statischer Bundle-Strategie (ADR-0023 Option A).
- Keine Re-Iteration des Bundle-Budgets bei jeder Sprach-Erweiterung.
- HACS-User: kein User-sichtbarer Effekt (HA-Lovelace lädt 80 KiB praktisch instant).
- Bundle-Wachstum bleibt KPI-überwacht (`pnpm kpi:report` zeigt Delta jedes Snapshots, auch unter 80 KiB).

### Negative Konsequenzen

- 16 KiB zusätzlicher Headroom kann zu „Bundle-Bloat-Verschleppung" führen: Code-Review-Pass 3 muss weiterhin auf semantisch unnötiges Wachstum achten, nicht nur auf Hard-Gate.
- Mitigation: KPI-Report bleibt `pnpm kpi:report`-getrieben, Bundle-Wachstum > 5 % pro Plan ist weiter ein `[USER-DECISION]`-Trigger laut `code-review-checklist.md` Pass-3.

## Pros und Cons der Optionen

### Option A — 72 KiB

- ✅ Konservativ, wenig „Overshoot"
- ❌ Bei 3 Sprachen erneut bump-bedürftig
- ❌ Doku-Bookkeeping-Aufwand pro Sprach-Plan

### Option B — 80 KiB (gewählt)

- ✅ Reicht für 4–5 Sprachen
- ✅ Kein Re-Bump bei FR/ES/IT
- ❌ Größerer Sprung (40 → 60 → 64 → 80 KiB-Historie)

### Option C — Dynamic-Import

- ✅ Skaliert besser für N > 5
- ❌ Async-Komplexität (ADR-0023 Option D)
- ❌ Out-of-Scope für aktuelle Roadmap

### Option D — Status quo 64 KiB

- ✅ Strikteres KPI-Gate
- ❌ Bricht beim ersten FR-Plan
- ❌ Reaktiver Bump = mehr Doku-Aufwand

## Verlinkte Spec-Sektionen / Referenzen

- [ADR-0022](./0022-bundle-budget-60-to-64-kib.md) (superseded by this ADR)
- [ADR-0023](./0023-i18n-via-hass-locale.md) (i18n via HA-Locale — negative Konsequenz war Auslöser)
- Subspec [`docs/specs/2026-05-15-en-i18n.md`](../specs/2026-05-15-en-i18n.md) §1.5 Bundle-Strategie
- Lesson 2026-05-16 (`docs/lessons-learned.md`) „Bundle-Forecast für i18n-Erweiterungen unterschätzt"
- `scripts/kpi.mjs:29` Single-Source-Konstante
