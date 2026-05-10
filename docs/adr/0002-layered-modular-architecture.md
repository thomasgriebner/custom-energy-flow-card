# ADR-0002: Schicht-getrennte modulare Architektur

* **Status:** accepted
* **Datum:** 2026-05-10
* **Entscheider:** @griebner

## Kontext und Problem

Die Card muss mehrere Verantwortlichkeiten zusammenführen: Sensor-Lesen,
Energie-Bilanz-Mathematik, SVG-Rendering, CSS-Animation, HA-Integration,
GUI-Editor. Wenn das alles in einer Datei landet, bekommt man eine 2 000+
Zeilen lange `LitElement`-Klasse, die schwer zu testen, schwer zu reviewen
und schwer zu erweitern ist. Was ist die richtige Aufteilung?

## Entscheidungs-Treiber

* Engine muss isoliert testbar sein (kein HA, kein DOM)
* Renderer muss in Sandbox ohne HA aufrufbar sein
* Editor muss unabhängig vom Renderer entwickelt werden können
* Wartbarkeit: ein Bug-Fix soll nur eine Schicht berühren
* `card.ts` darf nicht zu einer „God-Class" werden

## Geprüfte Optionen

* **A — Modular** (`engine/`, `render/`, `config/`, `ha/`, `util/`, `i18n/`,
  `card.ts`, `editor.ts`)
* **B — Single-File-Card** (alles in `LitElement`-Klasse)
* **C — Plugin-System** (steckbare „Provider" für PV/Akku/Netz/Verbraucher)

## Entscheidung

**Gewählt: Option A.** Wir trennen sieben Layer mit klar definierten
Verantwortlichkeiten und (siehe ADR-0009) lint-erzwungenen Import-Grenzen.

### Positive Konsequenzen

* Engine ist als pure functions trivial testbar (siehe ADR-0004).
* Renderer kann in `examples/preview.html` ohne HA verifiziert werden.
* Bug-Fix-Lokalität: Energie-Logik-Bug ⇒ nur `engine/`; SVG-Bug ⇒ nur `render/`.
* Klare Wachstumspfade: neue Quellentypen ändern nur Engine + Renderer + Schema.
* Testbarkeit des Editors getrennt vom Card-Hauptpfad.

### Negative Konsequenzen

* Mehr Dateien im Projekt (~25 statt ~3). *Mitigation:* Module-Größenobergrenzen
  in der Spec (Spec §2.2) verhindern, dass einzelne Dateien zu groß werden.
* Initial mehr Boilerplate (Type-Definitionen, Funktions-Exports). *Mitigation:*
  zahlt sich beim ersten Refactoring zurück.

## Pros und Cons der Optionen

### Option A — Modular

* ✅ Engine isoliert testbar
* ✅ Bug-Lokalität
* ✅ Wachstum klar
* ❌ Mehr Dateien

### Option B — Single-File-Card

* ✅ Schneller Initial-Start
* ❌ ~2 000 LOC in einer Klasse
* ❌ Engine-Logik nicht ohne HA testbar
* ❌ Editor muss in derselben Klasse leben

### Option C — Plugin-System

* ✅ Maximale Erweiterbarkeit
* ❌ Über-engineered für v1
* ❌ Plugin-Schnittstelle muss vor jeder Implementierung stabilisiert werden
* ❌ Höhere kognitive Last für Reader

## Verlinkte Spec-Sektionen / Referenzen

* Spec §2.2, §2.4 (Schicht-Abgrenzungen)
* [ADR-0004](./0004-pure-functions-engine.md) (Engine als pure functions)
* [ADR-0009](./0009-eslint-enforced-layer-boundaries.md) (Lint-Enforcement)
* [ADR-0010](./0010-shared-util-module.md) (Util-Layer Single-Source)
