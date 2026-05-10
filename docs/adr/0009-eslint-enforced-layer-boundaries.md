# ADR-0009: Layer-Grenzen via ESLint erzwingen

* **Status:** accepted
* **Datum:** 2026-05-10
* **Entscheider:** @griebner

## Kontext und Problem

Die schicht-getrennte Architektur (ADR-0002) lebt davon, dass `engine/` keine
HA-Imports zieht und `render/` keine Engine-Logik anfasst. Wenn diese Regeln
nur in einer Spec stehen, werden sie irgendwann verletzt — sei es durch
einen schnellen Bugfix, ein versehentliches Auto-Import oder einen späteren
Refactor. Wie erzwingen wir das **maschinell**?

## Entscheidungs-Treiber

* Verstöße müssen den CI-Build brechen (sichtbar, nicht nur dokumentiert)
* IDE-Feedback noch vor dem Commit
* Geringer Konfigurations-Aufwand
* Whitelist-Modell (Layer dürfen explizit definierte Module ziehen)

## Geprüfte Optionen

* **A — `eslint-plugin-import` mit `no-restricted-paths`**
* **B — Eigenes Build-Skript, das Imports analysiert**
* **C — Nur Konvention** (Spec sagt's, Reviewer prüft manuell)

## Entscheidung

**Gewählt: Option A.** Wir konfigurieren `import/no-restricted-paths` mit
„zones", die pro Target-Verzeichnis definieren, was importiert werden darf.

```javascript
// .eslintrc.cjs (Auszug)
'import/no-restricted-paths': ['error', {
  zones: [
    { target: './src/engine', from: './src',
      except: ['./engine', './util/memo.ts'] },
    { target: './src/render', from: './src',
      except: ['./render', './util', './engine/types.ts', './i18n'] },
    // … siehe Spec §11.4
  ],
}],
```

### Positive Konsequenzen

* CI bricht sofort bei Verstoß. Pre-Commit-Hook (Spec §11.8) fängt es noch
  früher.
* Modern IDEs zeigen den Lint-Fehler inline beim Tippen.
* Zone-Konfiguration ist die executable Doku der Architektur.
* Refactoring der Layer-Struktur ist explizit (Zonen müssen mit-aktualisiert
  werden) — vergisst niemand.

### Negative Konsequenzen

* Initial-Konfigurations-Aufwand. *Mitigation:* einmalig, dokumentiert in
  Spec §11.4.
* Bei legitimen neuen Cross-Layer-Imports muss die Zone-Whitelist erweitert werden.
  *Mitigation:* erzwungener Stop-Punkt für eine bewusste Architektur-Entscheidung
  (= guter Effekt).

## Pros und Cons der Optionen

### Option A — ESLint zones

* ✅ CI-Gate
* ✅ IDE-Feedback
* ✅ Zone-Config ist Dokumentation
* ❌ Wartung bei legitimen neuen Imports

### Option B — Eigenes Skript

* ❌ Doppelte Logik gegenüber ESLint
* ❌ Eigene Maintenance
* ❌ Keine IDE-Integration

### Option C — Nur Konvention

* ❌ Wird verletzt, sobald jemand unter Zeitdruck arbeitet
* ❌ Reviewer-Aufmerksamkeit ist rare Ressource
* ❌ Architekturentropie über Zeit

## Verlinkte Spec-Sektionen / Referenzen

* Spec §2.4 (Schicht-Abgrenzungen), §11.4 (ESLint-Zonen-Konfiguration)
* [ADR-0002](./0002-layered-modular-architecture.md) (Layer-Architektur)
* [eslint-plugin-import: no-restricted-paths](https://github.com/import-js/eslint-plugin-import/blob/main/docs/rules/no-restricted-paths.md)
