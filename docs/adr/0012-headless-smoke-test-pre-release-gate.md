# ADR-0012: Headless Smoke-Test als Pre-Release-Gate

* **Status:** accepted
* **Datum:** 2026-05-10
* **Entscheider:** @griebner

## Kontext und Problem

Der Anwender hat **keine HA-Test-Instanz**. Die erste Live-Validierung der
Card passiert im produktiven HA. Klassische "Card lädt nicht"-Bugs (Class-
Load-Errors, fehlende Custom-Element-Registrierung, Render-Crash beim ersten
hass-Update) sind ohne automatischen Pre-Flight-Check schwer zu fangen — und
besonders peinlich beim ersten Install.

Die Risikoanalyse identifizierte zwei konkrete Klassen-Load-Crashes (Lit
`css`-Tag-Interpolation, `hasChanged`-Binding) als Beinahe-Unfälle. Wir
brauchen ein automatisches Sicherheitsnetz, das genau diese Klasse von Bugs
abfängt **vor** dem Release.

## Entscheidungs-Treiber

* Muss in CI in jeder PR laufen (schnell, deterministisch)
* Muss den real-laufenden Bundle-Code testen (nicht nur Source)
* Muss ohne externe Dependencies (kein Docker, kein laufender Server) auskommen
* Ergebnis muss interpretierbar sein (klare Pass/Fail-Logs)
* Aufwand für Wartung muss verhältnismäßig zum Nutzen bleiben

## Geprüfte Optionen

* **A — `happy-dom`-basierter Smoke-Test in Node**
* **B — `Playwright` / Headless-Chrome End-to-End-Tests**
* **C — Nur manuelle Sandbox-Verifikation**
* **D — Docker-HA-Integration**

## Entscheidung

**Gewählt: Option A (`happy-dom`).**

`scripts/smoke-test.mjs` lädt das gebaute Bundle in eine `happy-dom`-Window-
Instanz und prüft sequentiell:

1. Custom-Element `custom-energy-flow-card` wird registriert
2. Editor-Element `custom-energy-flow-card-editor` wird registriert
3. `window.customCards`-Eintrag wird gepushed
4. `setConfig(stub-config)` wirft nicht
5. `setConfig(realistic-config)` wirft nicht
6. `hass`-Setzen löst Render aus → Shadow-DOM enthält `<svg>` mit `<circle>`-Elementen

Läuft als `pnpm smoke` Skript und als CI-Step nach `pnpm build`.

### Positive Konsequenzen

* Class-Load-Crashes (Lit `css`-Tag-Probleme, fehlende Imports, kaputte
  Decorator-Konfigurationen) → CI fängt sie vor Merge auf `main`.
* Rendert real ein DOM mit dem Bundle → erkennt nicht nur Compile-Fehler,
  sondern auch Runtime-Initialisierungs-Bugs.
* Schnell (~1–2 Sek.) und deterministisch — kein Flaky-Test-Risiko.
* Keine externen Services, kein Docker → läuft auf jeder CI-Maschine.

### Negative Konsequenzen

* `happy-dom` ist kein echter Browser → echte CSS-Animation, `offset-path`-
  Rendering, SVG-Tabindex-Verhalten werden **nicht** verifiziert.
  *Mitigation:* Dafür ist die manuelle Sandbox-Verifikation da (Phase 2 + 3).
* HA-spezifische Verhalten (`<ha-form>`-Rendering, `<ha-entity-picker>`-
  Listing) werden nicht getestet. *Mitigation:* M1-Reference-Comparison-Pass
  + manuelle Editor-Verifikation in der Sandbox.
* Test-Code muss bei API-Änderungen (z. B. neuer setConfig-Pflichtparameter)
  mitgepflegt werden. *Mitigation:* die getesteten Touchpoints sind sehr
  stabile HA-Konventionen.

## Pros und Cons der Optionen

### Option A — `happy-dom` Smoke-Test

* ✅ Schnell, kein externes Setup
* ✅ Testet das gebaute Bundle, nicht nur Source
* ✅ Class-Load + erste Render zuverlässig
* ❌ Keine echte Browser-Engine — CSS-Quirks bleiben unentdeckt

### Option B — Playwright / Headless-Chrome

* ✅ Echter Browser → CSS, Animation, SVG real
* ❌ Setup-Komplexität (Browser-Binary in CI)
* ❌ Langsamer (Sekunden statt Millisekunden)
* ❌ Test-Stabilität tendenziell schlechter

### Option C — Nur Sandbox-Verifikation

* ✅ Kein zusätzlicher Test-Code
* ❌ Manuelle Verifikation skaliert nicht; bei jeder Änderung neuer Sandbox-
  Walk-Through nötig
* ❌ Bricht den CI-Gate-Workflow

### Option D — Docker-HA

* ✅ Echteste Umgebung
* ❌ Anwender hat explizit kein Docker
* ❌ Setup-/Maintenance-Aufwand sehr hoch
* ❌ HA-Versionsdrift → dauerhafte Pflege

## Verlinkte Spec-Sektionen / Referenzen

* Plan Task 5.5 (`scripts/smoke-test.mjs`)
* Plan Task 0.1 (CI-Workflow mit Smoke-Step)
* Plan Phase 0.2 (M1-Reference-Comparison als Komplement)
