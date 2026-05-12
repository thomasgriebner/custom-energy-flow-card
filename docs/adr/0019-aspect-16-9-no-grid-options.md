# ADR-0019: ViewBox-Aspect 16:9 + Entfernung HA-Dashboard-Layout-API

- **Status:** accepted
- **Datum:** 2026-05-12
- **Entscheider:** @griebner
- **Supersedes:** ADR-0018

## Kontext und Problem

Nach Inbetriebnahme von [ADR-0018](./0018-ha-dashboard-layout-api.md) (`getGridOptions` mit `max_columns: 12`, `max_rows: 8`) berichtete der User am 2026-05-12, dass die Card im HA-Dashboard zu klein wirkt — der HA-Layout-Slider lässt sich nur bis 12 Spalten / 8 Reihen ziehen, vorher (ohne `getGridOptions`) war freie Skalierung möglich. Zusätzlich erzeugt der bisherige ViewBox-Aspect 820:540 (~1.52:1) in typischen HA-Sections-Slots (12 Spalten × 8 Reihen = 1056×448 px = 2.36:1) deutlichen Letterbox-Streifen links/rechts.

## Entscheidungs-Treiber

- Card soll den horizontalen Platz im HA-Grid sinnvoll nutzen, nicht künstlich beschneiden
- HA-Slider darf nicht durch unsere Methoden gedeckelt sein — User soll die Card so groß ziehen können, wie die Section es erlaubt
- Arc-Geometrie (ADR-0017) soll für N=8 weiterhin sicher passen — keine Layout-Revolution
- Konsistenz zwischen HA Sections-View und Masonry-View durch Default-Verhalten von HA selbst

## Geprüfte Optionen

- **A — Aspect 16:9 (960×540) + `getGridOptions/getCardSize` ersatzlos entfernen** (gewählt)
- **B — `getGridOptions` mit großzügigeren Bounds (z.B. `max_columns: 24, max_rows: 14`)**
- **C — Status quo beibehalten** (820×540 + bestehende Slider-Bounds)

## Entscheidung

**Gewählt: Option A.** ViewBox auf `960×540` (Aspect 16:9, 1.78:1). `HOME_X` 380 → 480, `CONSUMER_ARC_R` 275 → 350, Source-Cluster-Range 130-440 → 200-560. Vollständige Streichung von `getGridOptions()` und `getCardSize()` aus `card.ts`, damit HA seinen nativen Auto-Layout-Mechanismus nutzt.

### Positive Konsequenzen

- HA-Layout-Slider ohne künstliches Cap — User kann die Card frei skalieren bis Section-Maxgröße
- 16:9-Aspect fits HA-Sections-Slots 12×9 und 12×10 sehr gut (minimal/optimal Letterbox)
- Arc bleibt strukturell wie ADR-0017 — nur größerer Radius (komfortablere Knoten-Abstände: Gap 25 px statt 9.5 px bei N=8)
- Bundle-Reduktion durch Streichung von zwei Methoden

### Negative Konsequenzen

- **Breaking Visual Change**: Bestehende Configs sehen anders aus (Bogen ausladender, Knoten weiter rechts). Datenmapping bleibt 1:1.
- HA-Sections-View ohne `getGridOptions` wählt vermutlich einen kleineren Default-Slot als die bisherigen 6×5 — User-Resize einmalig nötig nach Update.
- Bei sehr schmalen Containern (`< 280 px`) greift weiterhin der bestehende Narrow-Banner, sonst Anpassung nicht nötig.

## Pros und Cons der Optionen

### Option A — Aspect 16:9 + Methoden-Streichung (gewählt)

- ✅ Adressiert beide Beschwerden des Users in einem Schritt
- ✅ Vertraueter Aspect (Video-Standard)
- ✅ Cleaner Code (subtraktiv)
- ❌ Breaking Visual Change

### Option B — Großzügigere Bounds in `getGridOptions`

- ✅ Minimaler Eingriff
- ❌ Beim User vorher war es OHNE `getGridOptions` — wir wären weiterhin in einem anderen Modus als das ursprüngliche Verhalten
- ❌ Behebt nicht den Letterbox-Effekt

### Option C — Status quo

- ✅ Kein Risiko
- ❌ Beschwerde bleibt unaddressiert

## Verlinkte Spec-Sektionen / Referenzen

- Subspec [`docs/specs/2026-05-12-aspect-ratio-redesign.md`](../specs/2026-05-12-aspect-ratio-redesign.md)
- [ADR-0017](./0017-adaptive-svg-layout.md) (Arc-Geometrie bleibt — Maßzahlen aktualisiert)
- [ADR-0018](./0018-ha-dashboard-layout-api.md) (superseded)
- [HA Frontend: Custom Card Layout](https://developers.home-assistant.io/docs/frontend/custom-ui/custom-card/)
