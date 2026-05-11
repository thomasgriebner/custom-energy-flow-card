# ADR-0015: Battery accepts split charge/discharge sensors

- **Status:** accepted
- **Datum:** 2026-05-11
- **Entscheider:** @griebner

## Kontext und Problem

`BatteryConfig` akzeptiert seit v0.9.0 genau **einen** signierten Power-Sensor
(`+` laden, `−` entladen; `power_invert` optional). In Praxis liefern viele
Wechselrichter (z. B. Sungrow, Solarwatt) **zwei separate** Sensoren —
`battery_charge_power` und `battery_discharge_power` — beide ≥ 0.

Workaround mit Template-Sensor (`{{ charge - discharge }}`) ist möglich, aber:

- erfordert YAML-Eingriff vor der Card-Konfiguration
- der Anwender muss verstehen, dass das Vorzeichen "+laden / −entladen" lauten muss
- Bug-Quelle bei jedem Setup

Out-of-Scope v1.0 lt. `CLAUDE.md`, jetzt erforderlich für v0.9.1 weil erster
Live-Anwender genau diese Hardware hat.

## Entscheidungs-Treiber

- Anwender soll Sensoren ohne YAML-Klimmzüge auswählen können
- Engine bleibt unverändert (rein signierter Wert wird in der Bilanz erwartet) —
  Aggregation passiert im Config-Layer
- Bestehende Configs (single signed `power`) müssen weiter funktionieren
- Schema bleibt valides JSON-Schema (kein Custom-Parser)

## Geprüfte Optionen

- **Option A — Discriminated Union analog `GridConfig`.** Schema akzeptiert
  entweder `{ power, power_invert? }` oder `{ charge_power, discharge_power }`.
  Validation prüft Exklusivität; `buildSystemState` aggregiert split → signed.
- **Option B — Optionale Zusatz-Felder.** `power` bleibt Pflicht, `charge_power`/
  `discharge_power` sind optional und überschreiben `power` wenn beide gesetzt.
- **Option C — Komplett-Bruch.** Single-`power`-Variante deprecated, alle User
  müssen migrieren.

## Entscheidung

**Gewählt: Option A** (Discriminated Union).

Spiegelt das bewährte `GridConfig`-Muster wider (siehe Spec §3.2 + dortige
Validation). Macht Exklusivität explizit ("genau eine der zwei Varianten"),
Validation-Fehler sind unmissverständlich. Backwards-compatible: alle v0.9.0-
Configs bleiben gültig.

### Positive Konsequenzen

- Hardware mit zwei separaten Sensoren ohne Template-Sensor-Workaround nutzbar
- Konsistent mit Grid-Schema (Anwender lernt das Muster nur einmal)
- Engine bleibt unverändert — `buildSystemState` macht die Aggregation
  (`signedPowerW = charge - discharge`)
- Editor kann beide Varianten anbieten

### Negative Konsequenzen

- Schema-Validation wird leicht komplexer (Union-Check pro Battery-Item)
- Editor-UI muss Mode-Toggle anbieten (analog Grid-Section)
- Tests müssen beide Varianten abdecken

Mitigations-Plan: Engine-Tests bleiben unberührt (sie testen `SystemState`,
nicht Config); neue Tests nur in `config/schema.test.ts`.

## Pros und Cons der Optionen

### Option A — Discriminated Union

- ✅ Exklusivität durch Schema erzwungen — keine "beide gesetzt"-Ambiguität
- ✅ Spiegelt `GridConfig`-Pattern — konsistente Anwender-Erwartung
- ✅ Backwards-compatible (v0.9.0-Configs funktionieren unverändert)
- ❌ Validation-Logik wächst um ~15 Zeilen

### Option B — Optionale Zusatz-Felder

- ✅ Minimal-Eingriff in Schema
- ❌ Ambiguität: was passiert wenn `power` UND `charge_power`/`discharge_power`
  gesetzt sind? Schema kann das nicht ausdrücken
- ❌ Anwender muss "Reihenfolge der Override-Regel" lernen

### Option C — Komplett-Bruch

- ✅ Klares Schema, eine Variante
- ❌ Breaking Change ohne Not — v0.9.0-Anwender müssten migrieren
- ❌ Single-Sensor-Hardware (z. B. KOSTAL Plenticore) wäre dann awkward

## Verlinkte Spec-Sektionen / Referenzen

- Spec §3 (Konfigurations-Schema) — wird zu §3.2 erweitert
- Spec §11.1 (Pure Functions Engine) — Engine bleibt unangetastet
- `CLAUDE.md` Out-of-Scope-Liste — Eintrag wird gestrichen
- ADR-0006 (1:1-Pairing) — unangetastet, Pairing ist orthogonal zum Sensor-Format
