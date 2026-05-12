# ADR-0017: Quellen-Cluster + Consumer-Arc Layout

- **Status:** accepted
- **Datum:** 2026-05-12
- **Entscheider:** @griebner

## Kontext und Problem

Das ursprüngliche Layout (Quellen voll-breit verteilt, Verbraucher als vertikale Spalte rechts) bricht ab 5 Verbrauchern aus dem ViewBox heraus. Mit Consumer-Grouping erwarten wir 5–7 sichtbare Knoten — genau die kritische Zone.

## Entscheidungs-Treiber

- Skaliert sauber für 1–8 sichtbare Verbraucher
- Bewahrt die radiale Schaltbild-Sprache (Kreise + Bezier + animierte Dots)
- Eine eigene Animation pro Verbraucher (nicht via Sammelschiene/Trunk)
- Fixer ViewBox für vorhersagbare HA-Sections-View-Integration

## Geprüfte Optionen

- **A — Bogen (Arc)**: Verbraucher fächern in ±α-Bogen rechts um Home
- **B — Sammelschiene**: Trunk + senkrechte Bus-Bar mit Tap-Verbrauchern
- **C — Spalte+ adaptiv**: bestehende Spalte mit dynamischem Gap, 2 Spalten ab N=7

## Entscheidung

**Gewählt: Option A.** Bogen mit Radius 350 um Home (480, 270), Winkel ±α=`min(42°, (N-1)·14°/2)`, fixer ViewBox 960×540 (Aspect 16:9, [ADR-0019](./0019-aspect-16-9-no-grid-options.md)). Quellen (PV/Akku) clustern in der linken 2/3-Fläche (x ∈ [200, 560]).

### Positive Konsequenzen

- Pro Verbraucher eine eigene animierte Bezier-Kurve — Schaltbild-DNA bleibt erhalten
- α-Cap bei 42° / Step 14° verhindert PV/Akku-Kollision UND Consumer-Überlappung bis N=8 (Gap 25 px bei R=350)
- ViewBox-Höhe bleibt fix (fixer Aspect 16:9, [ADR-0019](./0019-aspect-16-9-no-grid-options.md))

### Negative Konsequenzen

- **Breaking Visual Change**: Existierende Configs sehen anders aus (Quellen rücken zusammen, Verbraucher fächern). Datenmapping bleibt 1:1. Kommunikation via README-Changelog.
- Bei N>8 wird der Bogen visuell dicht (Knoten-Abstand < Durchmesser) — Doku-Hinweis im README.
- Consumer-Labels mussten rechts neben den Kreis (statt unter/über), damit sie im engen Arc nicht überlappen.

### Style-Konsistenz Battery-Ring ↔ Home-Ring

Beide nutzen `<g transform="rotate(-90)">` für 12-Uhr-Start und `stroke-dasharray` zur Anteilsdarstellung. Bewusste Abweichung: `stroke-linecap="round"` beim Battery-Ring (SoC-typische runde Anmutung); Home-Ring bleibt standard square.

## Pros und Cons der Optionen

### Option A — Bogen / Arc

- ✅ Pro Verbraucher eigene Animation
- ✅ Skaliert 1–8 ohne Layout-Sprung
- ✅ Radiale Sprache der Card bleibt
- ❌ Bei N>8 visuell dicht

### Option B — Sammelschiene

- ✅ Aufgeräumt bei hohem N
- ❌ Pro-Verbraucher-Animation verloren (nur ein Trunk-Stream)
- ❌ Asymmetrie: PV/Akku haben Spokes, Verbraucher haben Tap

### Option C — Spalte+ (adaptiv)

- ✅ Bekannter visueller Rahmen
- ❌ Konzept-Bruch beim Übergang 1→2-Spalten
- ❌ Sechs gerade Linien aus Home wirken redundant

## Verlinkte Spec-Sektionen / Referenzen

- Subspec [`docs/specs/2026-05-11-consumer-grouping-and-layout.md §5.1, §5.2, §5.3`](../specs/2026-05-11-consumer-grouping-and-layout.md)
- [ADR-0006](./0006-strict-1-to-1-pv-battery-pairing.md) (1:1 PV-Battery — bleibt)
- [ADR-0010](./0010-shared-util-module.md) (Shared Util — `bezierPath`/`straightPath` wiederverwendet)
