# Spec-Template

> **Vor Nutzung:** Diese Vorlage füllen, **`docs/templates/spec-review-checklist.md` durcharbeiten**, dann committen als `docs/specs/YYYY-MM-DD-<topic>.md`.
>
> **Goldstandard-Beispiele im Repo:** `docs/specs/2026-05-12-aspect-ratio-redesign.md` (kleine Subspec) und `docs/specs/2026-05-11-consumer-grouping-and-layout.md` (mittlere Subspec). Bei Unsicherheit dort die konkrete Form ansehen.
>
> **Erinnerung:** Specs scheitern meist nicht an fehlender Architektur-Idee, sondern an **zu wenig Repo-Discovery vor Schreiben**. Mindestens diese Files vor Schreiben lesen: `.eslintrc.cjs`, `vitest.config.ts`, `tsconfig.json`, `package.json`, `docs/conventions.md`, `docs/architecture.md`, jede Source-Datei, die in der Spec genannt wird. Plus `grep` für jede zu ändernde Funktion.

---

# Subspec — [Kurz-Titel]

**Status:** v1 (proposed, ready for review)
**Datum:** YYYY-MM-DD
**Autor:** Brainstorming-Session mit @user
**Verlinkte Hauptspec:** [`2026-05-10-custom-energy-flow-card-design.md`](./2026-05-10-custom-energy-flow-card-design.md)
**Verlinkte Subspec(s):** (optional, falls vorhandene Spec berührt wird)
**Berührte ADRs:** [Liste mit Status — anwenden / erweitern / superseden]
**Neuer ADR benötigt:** [ja → ADR-00XX | nein]

## 0. Zusammenfassung

[1–3 Absätze: WAS bauen wir, WARUM, und welche Architektur-Entscheidung steht dahinter. Bei Strategie-Wechsel: Verweis auf neuen ADR.]

### 0.0 TL;DR — Was der Planer NICHT tun darf

[**Pflicht-Sektion.** Verbots-Liste mit ❌, 5–15 Items. Sehr konkret pro File/Modul. Verhindert, dass der Planer im Eifer mehr ändert als nötig. Beispiele:

1. ❌ `src/engine/*` anfassen — Engine bleibt pure
2. ❌ Neue Felder im Editor-Schema hinzufügen — `icon`-Feld existiert bereits
3. ❌ `card.ts` Lifecycle-Hooks ändern
4. ❌ Neue i18n-Strings anlegen

Bei Konflikt zwischen Verbot und Plan-Schritt: STOP und nachfragen.]

### 0.1 Harte Constraints für den Planer

**ESLint-Layer-Zonen aus `.eslintrc.cjs`** (authoritative — Spec hier NICHT doppelpflegen, immer die echte Config lesen):

| Target         | Darf importieren aus             |
| -------------- | -------------------------------- |
| `src/[layer]/` | [aus `.eslintrc.cjs` übernehmen] |

**Weitere Constraints:**

| Constraint       | Quelle              | Konsequenz bei Verletzung |
| ---------------- | ------------------- | ------------------------- |
| [konkrete Regel] | [ADR / conventions] | [was bricht]              |

[Hinweis: mindestens diese Constraints prüfen: Engine pure, `card.ts ≤ 200 LOC`, Bundle ≤ 60 kB, Layer-Boundaries, TDD-Coverage, i18n-Quelle, noUncheckedIndexedAccess.]

**Weitere verbindliche Lese-Quellen für den Planer:**

- `CLAUDE.md` (Projekt-Schnellreferenz, Workflow-Regeln, Anti-Patterns)
- `docs/conventions.md` (Code-Stil, Naming, Commit-Konventionen)
- `docs/architecture.md` (Module-Map §2, ADR-Tabelle §4)
- Alle in obiger Tabelle referenzierten ADRs

### 0.2 Architektur-Kontext (welche Layer berührt)

| Layer      | Datei     | Art der Änderung              |
| ---------- | --------- | ----------------------------- |
| `[layer]/` | `src/[…]` | [edit / new / delete / check] |

**NICHT zu berührende Layer** (Verstoß bricht CI via ESLint `no-restricted-paths`):

- [Pro nicht-berührter Layer eine Zeile mit Begründung]

**Single-Source-Regeln (ADR-0010):**

- [Welche Konstante / Funktion ist Single-Source und darf nicht dupliziert werden]

#### 0.2.1 Files-to-Verify — Parent-Dirs + Tool-Coverage (Pflicht-Tabelle)

**Lehre aus Sub-Agent-Pässen:** „neue Datei `path/to/x.ts`" verifiziert nicht ob `path/to/` existiert. Tool-Coverage-Gaps werden implizit übergangen. Diese Tabelle erzwingt Klarheit:

| Datei (NEW)         | Parent-Dir existiert?            | Welche Tools decken sie ab?                                 |
| ------------------- | -------------------------------- | ----------------------------------------------------------- |
| `src/[layer]/x.ts`  | ✓ existiert                      | `typecheck` + `lint` + `test` (falls Test-File: nur `test`) |
| `tests/setup/x.ts`  | ❌ `mkdir -p tests/setup` nötig  | Test-Setup nur via Vitest (kein `typecheck`/`lint`)         |
| `examples/lib/x.ts` | ❌ `mkdir -p examples/lib` nötig | Vitest (Tests) / esbuild via build-preview (Stub)           |

**Faustregeln:**

- Tests werden via Vitest+esbuild ausgeführt, **nicht** per `tsc --noEmit`. Type-Errors in Test-Files werden erst zur Laufzeit sichtbar.
- ESLint läuft auf `src/**/*.ts` — `examples/`, `tests/`, `scripts/` sind nicht lint-gecheckt.
- Smoke-Test rendert die Card (`card.hass = …` triggert Lit-Lifecycle) — nicht nur Custom-Element-Registrierung.

Tool-Coverage-Gaps müssen entweder akzeptiert (in Spec dokumentiert) oder behoben werden (z. B. `tsconfig.preview.json` erweitern).

### 0.3 Konzept-Modell / Datenfluss

[ASCII-Diagramm mit den 3–5 relevanten Pipeline-Schritten. Markieren welcher Schritt durch diese Spec berührt wird. Beispiel:]

```
HA hass.states ─┐
                ├─► buildSystemState ─► engine.compute ─► FlowResult
config         ─┘                                              │
                                                               ▼
                                              [HIER GEÄNDERT] renderCard(...)
```

**Pflicht-Wissen:**

- [Eine Bullet-Liste mit 3–6 Punkten, was der Planer architektonisch verstanden haben muss]

### 0.4 Don't-Touch-Liste

[Konkrete Elemente die NICHT angefasst werden dürfen — anders als §0.0 Verbots-Liste hier auf File-/Element-Ebene:]

| Element               | Wo            | Warum nicht anfassen |
| --------------------- | ------------- | -------------------- |
| [konkretes Konstrukt] | `[file:line]` | [Begründung]         |

## 1. Kontext und Motivation

[Konkrete Beobachtungen: was hat den Bedarf ausgelöst? User-Feedback? Bug? Spec-Inkonsistenz? Mit Datum + Code-Referenz.]

## 2. Goals und Non-Goals

### 2.1 Goals

- [Konkret, messbar, in Bullet-Form]

### 2.2 Non-Goals

**Editor / Config:**

- [Was bleibt unverändert]

**Render / Engine / Config-Data-Layer:**

- [Was bleibt unverändert]

**Konfiguration / Tooling:**

- [Was bleibt unverändert]

[Mindestens 5 explizite Non-Goals pro Sektion. Bewusste Vollständigkeit statt Implizität.]

## 3. Architektur / Konkrete Änderungen

### 3.X [Pro File/Modul: was ändert sich konkret]

[Vollständige Diffs, keine `...`. Bei neuen Modulen: Code-Block + Architektur-Prinzipien-Tabelle:]

| Prinzip   | Begründung          |
| --------- | ------------------- |
| [Prinzip] | [Warum verbindlich] |

[Bei Edit: alt/neu-Diff in Code-Blöcken. Bei Konfig-Edit: explizit „additive, NICHT replace" markieren.]

### 3.X Code-Reuse-Tabelle (verbindlich)

| Helper / Konstante   | Wann verwenden | Datei     |
| -------------------- | -------------- | --------- |
| [bestehender Helper] | [Use-Case]     | `src/[…]` |

[**Anti-Patterns** explizit listen, die der Planer aktiv vermeiden muss — z. B. Inline-SVG-Strings statt `bezierPath`.]

### 3.X Layer-Boundary-Check

| Datei                 | Layer      | Neue Imports | Konformität |
| --------------------- | ---------- | ------------ | ----------- |
| `src/[neue-datei].ts` | `[layer]/` | `[importe]`  | ✓ / ✗       |

## 4. Datenfluss

[Konkreter End-to-End-Pfad: User-Aktion → Edit-Event → … → Render. Pro Schritt ein Pfeil. Klärt, an welcher Stelle die Änderung greift.]

## 5. Fehlerverhalten / Edge-Cases

- **[Edge-Case]:** [Erwartetes Verhalten]
- **[Edge-Case]:** [Erwartetes Verhalten]

[Engine wirft niemals (conventions §6.1). Bei Daten-Inkonsistenz: `EngineWarning`.]

## 6. Tests

### 6.1 [Unit/Render/Integration-Tests pro Modul]

[Konkrete Test-Cases, table-driven wo möglich (conventions §5.3). TDD für `engine/`, `config/`, `util/` (CLAUDE.md Regel 9). `it.each`-Form.]

### 6.X Sandbox / manuelle Verifikation

[Schritte für `pnpm preview`-Verifikation. Was muss der Tester sehen?]

### 6.X Coverage

[Wenn `coverage.include` erweitert werden muss — explizit. Wenn nicht: explizit „NICHT erweitern".]

## 7. Auswirkung auf Doku

[Per `conventions.md §12 Doku-Pflicht` braucht jede Spec mehrere Doku-Updates. Hier vollständig auflisten:]

**Hauptspec `2026-05-10-…-design.md`:**

- §X.Y: [konkrete Änderung]

**`docs/architecture.md`:**

- §2 (Layer-Tabelle): [falls neuer Layer / neue Aufgabe]
- §4 (ADR-Tabelle): [bei neuem ADR Pflicht]

**`docs/adr/README.md` (ADR-Index):**

- [bei neuem ADR Pflicht]

**`docs/adr/[bestehender-adr].md`:**

- Cross-Reference falls relevant

**`CLAUDE.md`:**

- [Optional, bei Tech-Stack-/Module-Layer-Änderung Pflicht]

**`README.md`:**

- [Bei User-facing-Verhalten Pflicht: Changelog-Eintrag]

## 8. ADR (falls neuer ADR nötig)

**Titel:** `0XXX-[kebab-case-titel].md`

**Inhalt (Kurzform für den Planer — Vollform per `docs/adr/0000-template.md`):**

- **Kontext:** [Problem]
- **Optionen:** [A/B/C mit Begründung]
- **Entscheidung:** [Gewählt + Begründung]
- **Konsequenzen:** [Pro / Contra]

Anlegen vor Code-Änderungen (Plan-Schritt 1 oder 2).

## 9. UX-Verhalten und Out-of-Scope

### 9.1 UX-Verhalten (was der User sieht/erlebt)

[**Pflicht-Sektion.** Konkrete UX-Implikationen: Field-Reihenfolge ändert sich? Visuelle Änderung (Farbe, Größe)? Mode-spezifisches Verhalten? Editor-Banner nötig? A11y-Auswirkungen?]

> **Bei UI-Overflow-/Geometrie-Stress-Tests** (Lesson 2026-05-15): Wenn ein Plan-Task einen Edge-Case via Live-Sensor-Override im Browser testen soll (z. B. „5-stellig-Werte"), prüfe ob die Engine den Wert recomputed (Energy-Bilanz aus PV+Batt+Consumer). Bei recomputed-Engines schlägt DevTools-Override fehl — der Test ist brittle. **Stattdessen:** Engine-Bypass-Hook (direkter SVG-DOM-Edit der `text.node-value`), Snapshot-basierter Pixel-Test, oder mathematische Geometrie-Validierung. Plan-Tasks sollten den Test-Pfad explizit benennen.

### 9.2 Out-of-Scope

- **[Feature]:** [Begründung] → v1.x-Kandidat / separates Issue
- **[…]**

## 10. Risiken

Sortiert nach Schwere (Wahrscheinlichkeit × Auswirkung), absteigend:

| Risiko    | Wahrscheinlichkeit      | Auswirkung | Mitigation |
| --------- | ----------------------- | ---------- | ---------- |
| [konkret] | niedrig/mittel/**hoch** | [konkret]  | [konkret]  |

[**Wichtig:** Bei "niedrig" — habe ich das verifiziert oder ist das eine Annahme? Annahmen explizit markieren.]

> **Mitigations-Pfade als Plan-STOP-Conditions (Lesson 2026-05-15 akku-prozent-im-ring):**
> Mitigations dürfen **konkrete Code-Werte** vorgeben (z. B. „Falls Kollision: Offset von 22 auf 26 anheben"). Der Plan übernimmt sie in der STOP-Condition-Sektion (siehe `plan-template.md`). Wenn die Implementation den Mitigations-Pfad aktiviert (z. B. weil Preview-Verifikation die Kollision bestätigt), entsteht **legitimer Spec-Code-Drift** — er ist im voraus erlaubt und wird in `docs/lessons-learned.md` dokumentiert. **Nicht** Spec retroaktiv patchen.

### 10.1 [Optional: Verschärfter Risiko-Block bei "hoch"]

[Detail-Analyse + Workaround-Strategie + Verifikations-Code für Spike.]

## 11. Erfolgs-Kriterien

- [ ] [funktional, konkret messbar]
- [ ] `pnpm test` grün
- [ ] `pnpm check` grün (lint + typecheck + tests)
- [ ] `pnpm build` produziert Bundle ≤ 60 kB minified
- [ ] **LOC-Regression-Check:** `wc -l src/[…]` < [vorher] (Auslagerung statt Aufbau)
- [ ] **Unverändert-Check:** `git diff` zeigt KEINE Änderungen an [betroffene Files aus §0.0]
- [ ] [Doku-Cross-References aus §7 alle erledigt]
- [ ] [Neuer ADR im Index referenziert]

## 12. Plan-Schritte (Reihenfolge mit Begründung)

[Atomare Schritte, Nummerierung ab 1. Pro Schritt eine Begründung warum jetzt. Abhängigkeiten explizit. Bei hohem Risiko: Spike als Schritt 1.]

1. **[Spike, falls Risiko "hoch"]** — [Verifikations-Code]
2. **ADR-0XXX anlegen** (falls nötig) + ADR-Index aktualisieren
3. **[Vorab-Setup: DevDeps, ESLint-Rules, Test-Setup]**
4. **[Neue Module: TDD-First]**
5. **[Bestehende Module migrieren]**
6. **[Tests grün halten: pnpm check]**
7. **[Sandbox/manuelle Verifikation]**
8. **[Doku-Updates: Hauptspec + architecture + README]**
9. **[Screenshots regenerieren, falls relevant]**

Erwarteter Gesamtumfang: [N Plan-Schritte] (X Vorab-Gates, Y Implementation, Z Doku/Assets).

**Kritische Abhängigkeit:** [Falls Spike → Implementation: explizit machen.]
