# ADR-0004: Energie-Engine als pure functions

* **Status:** accepted
* **Datum:** 2026-05-10
* **Entscheider:** @griebner

## Kontext und Problem

Die Energie-Bilanz-Mathematik (16 Edge-Cases, Mehr-Source-Aufteilung,
Reconcile mit Sensor-Werten) ist die fachlich anspruchsvollste Komponente
der Card. Bugs hier sind für den Anwender unsichtbar (Werte sehen plausibel
aus, sind aber falsch). Wir brauchen extrem hohe Test-Disziplin. Wie
strukturieren wir die Engine?

## Entscheidungs-Treiber

* Tests müssen tabellengetrieben sein (gleiche Eingabe → gleiche Ausgabe)
* Coverage-Anforderung ≥ 90 % (Spec §10.2)
* Keine HA-Test-Instanz — Verifikation läuft komplett über Unit-Tests
* Refactoring-Sicherheit: bei Änderungen darf keine Edge-Case-Regression
  durchschlüpfen

## Geprüfte Optionen

* **A — Pure Functions** (`export function compute(state): result`)
* **B — Engine-Klasse mit Methoden** (`new EnergyEngine().compute(...)`)
* **C — Klasse mit internem State zwischen Aufrufen** (z. B. „letzter FlowResult"
  als Caching)

## Entscheidung

**Gewählt: Option A.** Engine besteht ausschließlich aus exportierten
Funktionen. Keine Klassen, kein Instanz-State, keine globalen Side-Effects.

### Positive Konsequenzen

* Tests sind trivial: `expect(compute(input)).toEqual(expected)`. Keine
  Setup/Teardown-Logik, keine Mocks.
* Identisches Verhalten in allen Umgebungen — kein Race-Condition-Risiko.
* Refactoring: Funktion umbenennen / aufteilen ändert keinen Aufrufer-Code,
  solange die Signatur stabil bleibt.
* Future-proof gegen Web-Worker-Auslagerung: pure Functions sind problemlos
  in Worker übertragbar (für sehr große Setups).

### Negative Konsequenzen

* Caching zwischen Aufrufen muss in der Aufrufer-Schicht erfolgen (Spec §5.7
  Memoization-Tabelle). *Mitigation:* `util/memo.ts` als Helper.
* Funktions-Argumente werden bei vielen Parametern unhandlich. *Mitigation:*
  `SystemState` und `FlowResult` als Container-Typen reduzieren Parameter auf 1.

## Pros und Cons der Optionen

### Option A — Pure Functions

* ✅ Trivial testbar
* ✅ Refactoring-sicher
* ✅ Keine versteckten Abhängigkeiten
* ❌ Caching extern

### Option B — Engine-Klasse mit Methoden

* ✅ Vertrautes OO-Pattern
* ❌ Test-Setup zwingt zu `new` + Optional-Mock-Konfiguration
* ❌ Versucht zu „helfen" mit State, der die Tests komplex macht

### Option C — Klasse mit internem Cache

* ✅ Caching elegant
* ❌ Test-Suite muss nun die Cache-Invalidierungs-Logik mittesten
* ❌ Compute < 1 ms — Caching nicht nötig (siehe Spec §5.7)

## Verlinkte Spec-Sektionen / Referenzen

* Spec §4 (Algorithmus), §11.1 (Pure Functions), §11.3 (TDD), §4.11 (Test-Tabelle)
* [ADR-0002](./0002-layered-modular-architecture.md) (Layer-Architektur)
