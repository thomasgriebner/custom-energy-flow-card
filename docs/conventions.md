# Conventions

> **Lebendiges Dokument.** Praktische Regeln für die tägliche Arbeit.
> Die formale Spec liegt in [`specs/`](./specs/), Architektur-Entscheidungen
> in [`adr/`](./adr/). Hier geht es um *Code-Stil und Workflow*.

## 1. TypeScript-Code-Stil

### 1.1 Strict-Mode

Alle Compiler-Optionen aus `tsconfig.json` sind verbindlich (siehe Spec §2.6):

* `strict: true`
* `noUncheckedIndexedAccess: true`
* `noImplicitOverride: true`
* `noFallthroughCasesInSwitch: true`
* `noPropertyAccessFromIndexSignature: true`

### 1.2 Type-Safety

* **Kein `any`** ohne `// eslint-disable-next-line @typescript-eslint/no-explicit-any`
  + einzeiliger Begründungs-Kommentar
* **Kein `as` cast** ohne Kommentar (außer `as const`)
* **Keine non-null assertion `!`** ohne Kommentar; in `engine/` niemals
* **Explizite Return-Types** für exportierte Funktionen
* **`unknown` statt `any`** für externe Daten, dann narrowing

### 1.3 Naming

| Element | Konvention | Beispiel |
|---|---|---|
| Variablen, Funktionen | `camelCase` | `formatPowerW`, `currentState` |
| Klassen, Interfaces, Types, Enum | `PascalCase` | `EnergyEngine`, `FlowResult` |
| Konstanten (top-level, immutable) | `SCREAMING_SNAKE_CASE` | `CARD_VERSION` |
| Datei-Namen | `kebab-case.ts` | `format-power.ts`, `energy-engine.ts` |
| Test-Dateien | `name.test.ts` neben Source | `format-power.ts` + `format-power.test.ts` |
| Privater Member (Lit) | `_camelCase` | `_systemState`, `_resizeObs` |

### 1.4 Const & Immutability

* **`const` per Default**, `let` nur wenn Reassign nötig
* **Kein `var`**
* Engine-Funktionen mutieren niemals ihre Eingaben — neue Objekte zurückgeben

### 1.5 Function Design

* Eine Funktion macht **eine** Sache (Single Responsibility)
* Maximal 3–4 Parameter; bei mehr → Argument-Objekt
* Pure Functions sind Default (siehe ADR-0004 für Engine)
* Default-Werte am Funktions-Signatur, nicht erst im Body

## 2. Comments-Policy

* **Default: keine Kommentare.** Code soll selbsterklärend sein.
* Schreibe einen Kommentar nur, wenn das **WARUM** nicht offensichtlich ist:
  versteckte Constraints, Sensor-Quirks, Performance-Workarounds, surprising
  Behavior.
* **Niemals WHAT-Kommentare** wie `// inkrementiere counter`. Der Code sagt das.
* **Keine TODO/FIXME** im committed Code. Entweder fixen oder als ADR/Issue
  öffnen.
* **JSDoc nur für exportierte Util-Funktionen** mit nicht-trivialer Signatur.
  Engine-Pure-Functions reichen mit gutem Naming.
* **Kein Auskommentierter Code.** Git history reicht.

## 3. Datei-Organisation

* **Eine Datei = ein Konzept.** Zwei zusammengehörige Klassen können in einer
  Datei leben, wenn sie zusammen verstanden werden müssen — sonst splitten.
* **Test-File neben Source:** `format-power.ts` + `format-power.test.ts`
* **Keine `index.ts`-Re-Exports** in Modulen (Ausnahme: `src/index.ts` für
  Card-Registrierung). Imports zeigen direkt auf die Quelle.
* **Modul-Größenobergrenzen** (siehe Spec §2.2):
  * `card.ts` ≤ 200 LOC
  * `editor.ts` ≤ 400 LOC
  * `energy-engine.ts` ≤ 300 LOC
  * Andere: hartes Limit 250 LOC, dann splitten

## 4. Imports

* **Reihenfolge** (Prettier sortiert nicht; manuell pflegen):
  1. Externe Pakete (`lit`, `home-assistant-js-websocket`)
  2. Interne Module (`../engine/types`, `../util/format-power`)
  3. Type-only-Imports am Ende (`import type { Foo } from '../types'`)
* **Layer-Boundaries** sind ESLint-erzwungen (siehe ADR-0009 + Spec §11.4).
  Verstoß bricht den CI-Build.
* **Keine wilden Cross-Layer-Imports.** Wenn ein Layer einen anderen anzapfen
  will: ist es legitim, dann ESLint-Zone erweitern + ADR überdenken.

## 5. Test-Konventionen

### 5.1 Was testen

* `engine/`, `config/`, `util/`: **Pflicht** ≥ 90 % Coverage, alle Edge-Cases
* `render/layout`: Snapshot oder strukturell (Knoten-Positionen)
* `render/flow-renderer`, Editor: visuell via Sandbox + Smoke-Tests in happy-dom
* `card.ts`, `ha/*`: Code-Review, keine harten Coverage-Zahlen

### 5.2 Test-Struktur

```typescript
// format-power.test.ts
import { describe, expect, it } from 'vitest';
import { formatPowerW } from './format-power';

describe('formatPowerW', () => {
  it.each([
    [0,        { format: 'standard' },         '0 W'],
    [1900,     { format: 'standard' },         '1900 W'],
    [1900,     { format: 'grouped' },          '1 900 W'],
    [-450,     { format: 'standard', signed: true }, '−450 W'],
  ])('formats %d with %o → %s', (input, opts, expected) => {
    expect(formatPowerW(input, opts)).toBe(expected);
  });
});
```

### 5.3 Test-Stil

* **Tabellen-getrieben** (`it.each`) für mehrere Eingabe-Varianten
* **Eine Assertion pro Test** wo möglich
* **Aussagekräftige Test-Namen**: was ist die Bedingung, was die Erwartung
* **Kein `.skip` / `.only` im commit**
* **Jeder Test eigenständig** — keine Reihenfolge-Abhängigkeit
* **Keine sleep / setTimeout in Engine-Tests** (Engine ist pure)

### 5.4 TDD für Engine

Reihenfolge:
1. Test für Edge-Case schreiben (failt erstmal)
2. Engine erweitern, bis Test grün
3. Refactor wenn nötig
4. Nächster Edge-Case

Edge-Case-Liste: Spec §4.11.

## 6. Error-Handling

### 6.1 Engine: Warnings statt Throws

`engine/` wirft niemals bei Daten-Inkonsistenz. Stattdessen:

```typescript
return {
  ...result,
  warnings: [...result.warnings, {
    code: 'PAIRING_DEFICIT',
    detail: `Battery ${j} charges from grid (${deficit} W)`,
    magnitudeW: deficit,
  }],
};
```

`throw` nur bei **Programmierfehlern** (z. B. ungültiger Pairing-Index, der
schon vorher hätte gefangen werden müssen).

### 6.2 HA-Boundary: `setConfig` darf werfen

```typescript
setConfig(config: unknown): void {
  const validated = validateConfig(config);  // wirft bei invalid
  this.config = validated;
}
```

HA fängt Errors aus `setConfig` und zeigt sie im Editor.

### 6.3 Render-Pfad: Try-Catch + Fallback-UI

```typescript
willUpdate(changed: PropertyValues): void {
  try {
    this._systemState = buildSystemState(this.config, this.hass);
    this._flowResult = EnergyEngine.compute(this._systemState);
    this._renderError = undefined;
  } catch (err) {
    this._renderError = err instanceof Error ? err.message : String(err);
    console.error('[custom-energy-flow-card]', err);
  }
}
```

Detail in Spec §5.10. Niemals stillschweigend fressen.

## 7. Logging

* `console.error('[custom-energy-flow-card]', …)` für Errors
* `console.warn(…)` für Diagnose-Warnings (zusätzlich zur Card-UI)
* `console.info(…)` einmalig beim Modul-Load (Version-Banner, siehe Spec §6.1)
* **Kein `console.log` im committed Code** — außer hinter
  `if (process.env.NODE_ENV !== 'production')`-Guard
* Card-Name-Prefix `[custom-energy-flow-card]` immer als erstes Argument

## 8. Commit-Messages

[Conventional Commits](https://www.conventionalcommits.org/):

```
<type>(<scope>): <kurzer Titel im Imperativ>

<Body, optional, max ~72 Zeichen pro Zeile>

<Footer mit Co-Authored-By, optional>
```

**Typen:**

| Type | Wofür |
|---|---|
| `feat` | neue Funktionalität |
| `fix` | Bug-Fix |
| `docs` | nur Dokumentation |
| `test` | nur Tests |
| `refactor` | Code-Umstellung ohne Verhaltensänderung |
| `perf` | Performance-Optimierung |
| `chore` | Tooling, Dependencies, Build |
| `ci` | CI-Workflow-Änderungen |

**Scopes** (passend zu Modulen):
`engine`, `render`, `config`, `editor`, `util`, `ha`, `card`, `i18n`, `docs`,
`build`, `ci`.

**Beispiele:**

```
feat(engine): handle pairing-deficit case
fix(render): clamp dot count to max_dots_per_path
docs(adr): add ADR-0011 for new sensor type
test(util): cover read-sensor with empty state
```

## 9. Branch-Strategie

* `main`: immer release-bereit, Pre-Commit-Hook + CI grün
* Feature-Branches: `feat/<scope>-<kurz>` (z. B. `feat/engine-pairing-deficit`)
* Bugfix: `fix/<kurz>` (z. B. `fix/render-resize-crash`)
* Doku: `docs/<kurz>`
* **Keine WIP-Commits auf `main`.** Squash oder rebase vor Merge.

## 10. Pre-Commit-Hook

`husky + lint-staged` führt **automatisch vor jedem Commit** aus:

* Prettier (formatieren)
* ESLint (lint)

`pnpm typecheck` und `pnpm test` müssen vor `git push` manuell grün sein
(CI erzwingt das nochmal).

`--no-verify` ist nur für **Notfälle** mit Begründung im Commit-Body erlaubt;
**niemals** auf `main`.

## 11. Anti-Patterns (verboten)

Aus Spec §11.5 (verbindlich):

* ❌ God-Class in `card.ts` (≤ 200 LOC, delegiert)
* ❌ SVG-String-Konkatenation (Lit-Templates)
* ❌ Externe DOM-Libs (jQuery, D3, anime.js)
* ❌ Eigenes State-Management (Redux, MobX)
* ❌ Side-Effects in der Engine
* ❌ Doppelte Util-Funktionen außerhalb von `util/`
* ❌ Berechnung in `render()` (gehört in `willUpdate`)
* ❌ Lit's Default-Reactivity für `hass` unverändert lassen — wir filtern in `shouldUpdate(changedProperties)` auf relevante Sensor-IDs (Spec §5.7); `@property({ hasChanged })` funktioniert dafür nicht, weil das Callback `this` nicht erhält
* ❌ Try-Catch-Schluck (immer mit `console.error` loggen)
* ❌ Hardcoded User-Strings (immer aus `i18n/de.ts`)
* ❌ TODO-Kommentar im Release

## 12. Doku-Pflicht

| Wann | Was tun |
|---|---|
| Neue Architektur-Entscheidung | ADR in `docs/adr/00XX-…md` (Template: `0000-template.md`); ADR-Index in `docs/adr/README.md` aktualisieren; Verweis in `architecture.md §4` ergänzen |
| Spec-Änderung | Spec-Header `Status: Spec vN` und `Datum:` aktualisieren; Conventional-Commit `docs(specs): …` |
| Konvention/Workflow geändert | `docs/conventions.md` (diese Datei) aktualisieren |
| Tech-Stack-Änderung | `CLAUDE.md` + entsprechender ADR + Spec §2.1 |
| User-facing-Feature/Verhalten geändert | `README.md` + ggf. Spec |
| Bug-Fix | nur Commit-Message + Test |

## 13. Dependencies

* **Pinning:** `^x.y.0` (Major-Pin, Minor/Patch frei)
* **Neue Runtime-Dep außer Lit:** **braucht ADR.** Bundle-Budget ist 60 kB.
* **Neue Dev-Dep:** OK ohne ADR, aber kurz im Commit-Body begründen.
* **Update von Major-Versionen:** ADR + manueller Test.

## 14. Datums-Format

* Spec/ADR-Header und Doku-Texte: **ISO-8601** (`2026-05-10`)
* Im Code: niemals Datum hardcoded, immer relativ zur Laufzeit (`Date.now()`)

## 15. Sprache

* **Code-Identifier (TypeScript)**: Englisch
* **User-facing Strings**: Deutsch (in `i18n/de.ts` zentralisiert)
* **Doku, Spec, ADRs**: Deutsch (Anwender + Maintainer sprechen Deutsch)
* **Commit-Messages**: Deutsch oder Englisch — **konsistent innerhalb eines
  PRs / Branches**
