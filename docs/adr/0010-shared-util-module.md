# ADR-0010: Single-Source-Util-Modul gegen Code-Doppelungen

* **Status:** accepted
* **Datum:** 2026-05-10
* **Entscheider:** @griebner

## Kontext und Problem

Bei einer in mehrere Schichten getrennten Card (ADR-0002) gibt es Logik,
die **mehrere Schichten** brauchen: Power-Werte formatieren (für Renderer
*und* Editor-Preview *und* Sandbox), Sensor-Werte aus `hass.states` lesen
(für `buildSystemState` *und* Editor-Live-Preview), Farben auflösen, SVG-
Pfade bauen. Wenn diese Logik in jeder Schicht *erneut* implementiert wird,
divergieren die Implementierungen über Zeit (Format-Inkonsistenzen, leicht
unterschiedliche Sensor-Robustheit, …).

## Entscheidungs-Treiber

* Keine Code-Doppelungen — gleicher Output an gleichem Input
* Zentrale Test-Stelle (eine `format-power`-Implementation, ein Test-File)
* Architektonisch sauber: Util darf nicht von oben (engine, render) importieren
* Lint-erzwungen (siehe ADR-0009)

## Geprüfte Optionen

* **A — `src/util/`-Modul als Single-Source** (`format-power`, `resolve-color`,
  `read-sensor`, `svg-path`, `memo`)
* **B — Helfer ad-hoc in den jeweiligen Layern duplizieren**
* **C — Erst bei zweiter Verwendung extrahieren** ("DRY rule of three")

## Entscheidung

**Gewählt: Option A.** Wir legen `src/util/` von Anfang an an mit den
explizit identifizierten 5 Helfern. Anti-Pattern „Util-Funktion außerhalb
von `util/` re-implementieren" steht in Spec §11.5 als verbotenes Muster.

### Positive Konsequenzen

* Eine Implementierung pro Helfer, ein Test-File, eine Bug-Fix-Stelle.
* `read-sensor` zentralisiert die Unit-Konvertierungs-Logik (W/kW/mW) — kritisch
  korrekt zu sein, einmal getestet, überall konsistent.
* `format-power` mit konsistenter Tausender-Trennung in Card und Editor.
* Boundary-Lint (ADR-0009) erlaubt Util-Imports aus allen Layern, aber Util
  selbst zieht keine.

### Negative Konsequenzen

* Über-engineerte Single-Use-Helfer wären Verschwendung. *Mitigation:* die
  5 Helfer in der Spec sind alle nachweislich von ≥ 2 Layern genutzt.
* Util darf nicht zur Catch-all-Müllkippe werden. *Mitigation:* Spec §2.7
  listet die erlaubten Helfer; weitere brauchen bewusste Entscheidung
  (idealerweise neuen ADR).

## Pros und Cons der Optionen

### Option A — Util-Modul von Anfang an

* ✅ Keine Doppelungen
* ✅ Zentrale Tests
* ✅ Klare Architektur
* ❌ Strenge Regel über Util-Inhalt nötig (akzeptabel)

### Option B — Ad-hoc duplizieren

* ✅ Lokal schneller
* ❌ Divergenz garantiert über Zeit
* ❌ Bug-Fixes müssen mehrfach gemacht werden

### Option C — DRY rule of three

* ✅ Pragmatisch
* ❌ Unsere 5 Helfer haben **schon** zur Spec-Zeit ≥ 2 Verwender
* ❌ Wartet die zweite Verwendung ab → Risiko der Vergesslichkeit

## Verlinkte Spec-Sektionen / Referenzen

* Spec §2.7 (Util-Modul-Spezifikation), §11.5 (Anti-Pattern)
* [ADR-0002](./0002-layered-modular-architecture.md) (Layer-Architektur)
* [ADR-0009](./0009-eslint-enforced-layer-boundaries.md) (Lint-Boundaries)
