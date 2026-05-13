# ADR-0016: HA-Area-basierte Verbraucher-Gruppierung

- **Status:** accepted
- **Datum:** 2026-05-12
- **Entscheider:** @griebner

## Kontext und Problem

Ein typischer Haushalt hat 10–20 Smart-Plug-Sensoren. 12 Einzelknoten in der Card wären unleserlich. Wie aggregieren wir sinnvoll, ohne dass der User pro Gruppe extra YAML schreiben muss?

## Entscheidungs-Treiber

- Kein zusätzlicher YAML-Aufwand für User (Single-Sensor-Liste bleibt)
- HA-konform: Areas sind die etablierte HA-Gruppierungseinheit
- Engine bleibt pure (ADR-0004); Grouping-Logik gehört in `config/`
- Single-Source-of-Truth für "wie viele Verbraucher sehen wir gerade" (N)

## Geprüfte Optionen

- **A — Card-seitig**: `hass.entities`/`devices`/`areas` auflösen, gruppieren
- **B — HA-seitig**: User baut Template-Sensoren pro Raum, Card konsumiert je einen
- **C — Explizite YAML-Liste pro Gruppe**: `consumers: [{name: Küche, power: [...]}]`

## Entscheidung

**Gewählt: Option A.** Card resolvt `area_id` über `hass.entities` (Fallback `hass.devices`). Neue pure Funktion `deriveDisplayConsumers(config, hass)` in `config/derive-display-consumers.ts` ist Single-Source-of-Truth — `buildSystemState`, `computeLayout` und `RenderContext` ziehen alle daraus.

### Positive Konsequenzen

- Zero-Config: User listet wie heute einzelne Sensoren; Gruppierung passiert automatisch
- HA bleibt Master der Area-Struktur; Card folgt live (Registry-Ref-Vergleich in `hassRelevantSensorsChanged`)
- Engine kennt keine Gruppen-Semantik — bleibt pure

### Negative Konsequenzen

- Card hängt am HA-Registry-Lifecycle. Wenn `hass.entities` fehlt (alte HA / früher Lifecycle): Fallback auf `'none'`-Mode + `REGISTRY_UNAVAILABLE`-Warning. _Mitigation:_ warnings sind im Diagnose-Icon sichtbar.
- Spec/ADR-Update nötig, falls HA-Registry-Shape sich ändert. _Mitigation:_ Layer-Boundary verhindert direkte Kopplung — `DeriveConsumersHassShape` ist eine lokale Minimal-Schnittstelle in `config/`.

## Pros und Cons der Optionen

### Option A — Card-seitige Auflösung

- ✅ Keine HA-Config-Arbeit für den User
- ✅ Live-Update bei Area-Reassignment
- ❌ Card-Code wächst um Registry-Auflösung

### Option B — HA Template-Sensoren

- ✅ Card bleibt schlank
- ❌ User muss pro Raum einen Template-Sensor schreiben (Doppelhaltung Card + HA)
- ❌ Card sieht nicht die Area-Struktur — keine Live-Anpassung

### Option C — Explizite YAML-Listen

- ✅ Deterministisch, einfach getestet
- ❌ User-Doppelhaltung mit HA-Area-Definitionen
- ❌ Bei Area-Änderung in HA muss die Card-YAML manuell mit-angepasst werden

## Verlinkte Spec-Sektionen / Referenzen

- Subspec [`docs/specs/2026-05-11-consumer-grouping-and-layout.md §4.2`](../specs/2026-05-11-consumer-grouping-and-layout.md)
- [ADR-0004](./0004-pure-functions-engine.md) (Pure Engine)
- [ADR-0010](./0010-shared-util-module.md) (Shared Util)
- [ADR-0020](./0020-ha-icon-via-foreignobject.md) — Area-Icon-Rendering via ha-icon (implementiert v1.x)
