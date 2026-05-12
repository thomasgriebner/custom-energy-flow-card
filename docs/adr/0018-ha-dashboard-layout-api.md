# ADR-0018: HA-Dashboard-Layout-API immer aktiv

- **Status:** superseded by [ADR-0019](./0019-aspect-16-9-no-grid-options.md) (2026-05-12)
- **Datum:** 2026-05-12
- **Entscheider:** @griebner

> **Superseded:** Diese Entscheidung wurde am 2026-05-12 nach User-Feedback durch
> [ADR-0019](./0019-aspect-16-9-no-grid-options.md) abgelöst. Die deklarierten
> Slider-Bounds (`max_columns: 12, max_rows: 8`) erwiesen sich in der Praxis
> als künstliche Einschränkung gegenüber HAs nativem Auto-Layout.
> Siehe [ADR-0019](./0019-aspect-16-9-no-grid-options.md) für die finale Entscheidung.

## Kontext und Problem

HA Sections-View (Default seit 2024.3) erwartet eine `getGridOptions()`-Methode auf Cards, die bevorzugte Spalten/Reihen deklariert. Ohne sie nimmt HA generische Defaults, die bei unserer 820×540-Geometrie ungünstig sind (Leerraum oder Über-Komprimierung).

## Entscheidungs-Treiber

- Sauberer Default in HA Sections-View ohne manuelles Resize
- Rückwärtskompatibel zur Legacy-Masonry-View (`getCardSize`)
- Kein User-Opt-out nötig (verbessert das Default-Verhalten für alle)

## Geprüfte Optionen

- **A — Statische `getGridOptions`**: sensible Defaults + min/max-Bounds
- **B — Adaptiv**: basierend auf Display-Consumer-Count
- **C — Status quo**: `getCardSize` bleibt statisch hardcoded `6`

## Entscheidung

**Gewählt: Option A.** `getGridOptions()` deklariert 6 cols × 5 rows mit `min_columns: 4`, `max_columns: 12`, `min_rows: 4`, `max_rows: 8`. `getCardSize` leitet sich daraus ab: `Math.ceil(rows × 56 / 50)` = 6 (kompatibel zum bisherigen Hardcode).

### Positive Konsequenzen

- User bekommt einen sinnvollen Slot ohne manuelles Resizing
- Min/Max-Bounds erlauben Anpassung (größer ziehen, schmaler machen)
- `getCardSize` ist konsistent zu `getGridOptions` — keine Drift zwischen Masonry- und Sections-View

### Negative Konsequenzen

- Bei HA-Versionen ohne `getGridOptions`-Support (< 2024.3) wird die Methode ignoriert — Fallback auf `getCardSize`. Funktioniert ohne Crash, suboptimaler Slot.
- Statische Werte: adaptiv wäre genauer, aber ViewBox ist fix → Defaults sind passend.

## Pros und Cons der Optionen

### Option A — Statische getGridOptions

- ✅ Predictable für HA + User
- ✅ Min/Max erlauben User-Resize
- ❌ Nicht adaptiv (akzeptabel bei fixer ViewBox)

### Option B — Adaptiv basierend auf N

- ✅ Optimaler Slot pro Configuration
- ❌ Komplexer Code-Pfad
- ❌ Race-Conditions: getGridOptions kann vor erstem `hass`-Update gerufen werden — N unbekannt
- ❌ ViewBox ist fix → adaptivität bringt wenig

### Option C — Status quo

- ✅ Kein Code-Change
- ❌ HA-Sections-View nutzt generische Defaults → visuell unschön

## Verlinkte Spec-Sektionen / Referenzen

- Subspec [`docs/specs/2026-05-11-consumer-grouping-and-layout.md §6.1, §6.2`](../specs/2026-05-11-consumer-grouping-and-layout.md)
- [HA Frontend: Custom Card Layout](https://developers.home-assistant.io/docs/frontend/custom-ui/custom-card/) (externe Referenz)
