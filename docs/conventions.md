# Conventions

> **Lebendiges Dokument.** Praktische Regeln für die tägliche Arbeit.
> Die formale Spec liegt in [`specs/`](./specs/), Architektur-Entscheidungen
> in [`adr/`](./adr/). Hier geht es um _Code-Stil und Workflow_.

## 1. TypeScript-Code-Stil

### 1.1 Strict-Mode

Alle Compiler-Optionen aus `tsconfig.json` sind verbindlich (siehe Spec §2.6):

- `strict: true`
- `noUncheckedIndexedAccess: true`
- `noImplicitOverride: true`
- `noFallthroughCasesInSwitch: true`
- `noPropertyAccessFromIndexSignature: true`

### 1.2 Type-Safety

- **Kein `any`** ohne `// eslint-disable-next-line @typescript-eslint/no-explicit-any`
  - einzeiliger Begründungs-Kommentar
- **Explizite Return-Types** für exportierte Funktionen
- **`unknown` statt `any`** für externe Daten, dann narrowing

#### `as`-Casts: Boundary vs. Internal

Wir unterscheiden zwei Arten von `as`-Casts:

**Boundary-Casts (kein Kommentar nötig):** Casts an klar definierten externen
Schnittstellen, wo das External-API selbst untypisiert ist. Erlaubt ohne
einzelnen Kommentar — die Stelle selbst dokumentiert die Boundary:

- `validateConfig(input: unknown)`-Casts auf Config-Form-Variants
- `e.target as HTMLSelectElement` in DOM-Event-Handlers
- `e.detail.value as Partial<…>` in `<ha-form>`-Handlers
- `changed.get('hass') as HomeAssistant | undefined` in Lit-Lifecycle-Hooks
- `window as unknown as { customCards }` für globale window-Erweiterungen
- `entity.attributes?.['x'] as string | undefined` für HA-State-Attribute
- `config as Partial<Config>` in Card-Helper-Type-Guards

**Internal-Casts (brauchen Kommentar):** alles andere — wenn der Cast Logik
verschiebt oder eine Type-Lüge ist:

```typescript
// Map.get returns T | undefined; we delete + re-set so the value is present
const value = cache.get(key) as R;
```

- **Niemals** `as any` (durch ESLint geblockt)
- **`as const`** ohne Kommentar erlaubt — semantik-erhaltend
- **Niemals non-null assertion `!`** in `engine/`, `config/`, `util/`. In
  `card.ts`/`editor.ts`/Tests erlaubt, wenn vorher `expect(…).toBeDefined()`
  oder eine andere Garantie steht — sonst kommentieren.

### 1.3 Naming

| Element                           | Konvention                  | Beispiel                                   |
| --------------------------------- | --------------------------- | ------------------------------------------ |
| Variablen, Funktionen             | `camelCase`                 | `formatPowerW`, `currentState`             |
| Klassen, Interfaces, Types, Enum  | `PascalCase`                | `EnergyEngine`, `FlowResult`               |
| Konstanten (top-level, immutable) | `SCREAMING_SNAKE_CASE`      | `CARD_VERSION`                             |
| Datei-Namen                       | `kebab-case.ts`             | `format-power.ts`, `energy-engine.ts`      |
| Test-Dateien                      | `name.test.ts` neben Source | `format-power.ts` + `format-power.test.ts` |
| Privater Member (Lit)             | `_camelCase`                | `_systemState`, `_resizeObs`               |

### 1.4 Const & Immutability

- **`const` per Default**, `let` nur wenn Reassign nötig
- **Kein `var`**
- Engine-Funktionen mutieren niemals ihre Eingaben — neue Objekte zurückgeben

### 1.5 Function Design

- Eine Funktion macht **eine** Sache (Single Responsibility)
- Maximal 3–4 Parameter; bei mehr → Argument-Objekt
- Pure Functions sind Default (siehe ADR-0004 für Engine)
- Default-Werte am Funktions-Signatur, nicht erst im Body

### 1.6 Funktionale Iteration

**Bevorzuge funktionale Array-Methoden** über imperative Loops, wenn der Zweck
eine Transformation ist. Macht die Intention sofort lesbar und passt zur
pure-functions-Linie (ADR-0004, ADR-0010).

| Zweck                         | Bevorzugt                           | Statt                   |
| ----------------------------- | ----------------------------------- | ----------------------- |
| Eingabe → gleichlanger Output | `.map()`                            | `forEach + result.push` |
| Filter + Transform            | `.filter().map()` oder `.flatMap()` | `forEach + if + push`   |
| Aggregat auf einen Wert       | `.reduce()`                         | `forEach + akk += …`    |
| Existenz-Check                | `.some()` / `.every()`              | `forEach + return-flag` |
| Element finden                | `.find()`                           | `forEach + break`       |
| Index finden                  | `.findIndex()`                      | `for + index++`         |
| Reine Side-Effects            | `for…of` oder `forEach`             | (kein Wechsel nötig)    |

**Erlaubte Ausnahmen** für `forEach` mit `push`:

- Loop ist gleichzeitig **stateful** (z. B. ein laufendes Akkumulator-Array
  wird in jedem Durchgang gelesen _und_ mutiert). Beispiel: Engine-Pairing-Step
  konsumiert `pv_remaining[i]` schrittweise — `.reduce()` wäre hier weniger
  lesbar als die direkte Sequenz.
- Die Transformation produziert **mehrere unterschiedliche** Outputs in einem
  Durchgang (z. B. zwei Listen + Warnings). `.flatMap` wäre möglich, aber
  oft weniger klar.

**Niemals erlaubt:**

- `forEach` mit `push` als reine Transformation 1:1 (was `.map()` ist).
- Manuelle `for (let i = 0; ...)`-Loops, wenn `.map`/`.filter`/`.find` reichen.

## 2. Comments-Policy

- **Default: keine Kommentare.** Code soll selbsterklärend sein.
- Schreibe einen Kommentar nur, wenn das **WARUM** nicht offensichtlich ist:
  versteckte Constraints, Sensor-Quirks, Performance-Workarounds, surprising
  Behavior.
- **Niemals WHAT-Kommentare** wie `// inkrementiere counter`. Der Code sagt das.
- **Keine TODO/FIXME** im committed Code. Entweder fixen oder als ADR/Issue
  öffnen.
- **JSDoc nur für exportierte Util-Funktionen** mit nicht-trivialer Signatur.
  Engine-Pure-Functions reichen mit gutem Naming.
- **Kein Auskommentierter Code.** Git history reicht.

## 3. Datei-Organisation

- **Eine Datei = ein Konzept.** Zwei zusammengehörige Klassen können in einer
  Datei leben, wenn sie zusammen verstanden werden müssen — sonst splitten.
- **Test-File neben Source:** `format-power.ts` + `format-power.test.ts`
- **Keine `index.ts`-Re-Exports** in Modulen (Ausnahme: `src/index.ts` für
  Card-Registrierung). Imports zeigen direkt auf die Quelle.
- **Modul-Größenobergrenzen** (siehe Spec §2.2):
  - `card.ts` ≤ 200 LOC
  - `editor.ts` ≤ 430 LOC (Tech-Debt formalisiert seit i18n-Refactor + Argument-Objekt-Pattern; siehe ADR-0023)
  - `energy-engine.ts` ≤ 300 LOC
  - Andere: hartes Limit 250 LOC, dann splitten

## 4. Imports

- **Reihenfolge** (Prettier sortiert nicht; manuell pflegen):
  1. Externe Pakete (`lit`, `home-assistant-js-websocket`)
  2. Interne Module (`../engine/types`, `../util/format-power`)
  3. Type-only-Imports am Ende (`import type { Foo } from '../types'`)
- **Layer-Boundaries** sind ESLint-erzwungen (siehe ADR-0009 + Spec §11.4).
  Verstoß bricht den CI-Build.
- **Keine wilden Cross-Layer-Imports.** Wenn ein Layer einen anderen anzapfen
  will: ist es legitim, dann ESLint-Zone erweitern + ADR überdenken.

## 5. Test-Konventionen

### 5.1 Was testen

- `engine/`, `config/`, `util/`: **Pflicht** ≥ 90 % Coverage, alle Edge-Cases
- `render/layout`: Snapshot oder strukturell (Knoten-Positionen)
- `render/flow-renderer`, Editor: visuell via Sandbox + Smoke-Tests in happy-dom
- `card.ts`, `ha/*`: Code-Review, keine harten Coverage-Zahlen

### 5.2 Test-Struktur

```typescript
// format-power.test.ts
import { describe, expect, it } from 'vitest';
import { formatPowerW } from './format-power';

describe('formatPowerW', () => {
  it.each([
    [0, { format: 'standard' }, '0 W'],
    [1900, { format: 'standard' }, '1900 W'],
    [1900, { format: 'grouped' }, '1 900 W'],
    [-450, { format: 'standard', signed: true }, '−450 W'],
  ])('formats %d with %o → %s', (input, opts, expected) => {
    expect(formatPowerW(input, opts)).toBe(expected);
  });
});
```

### 5.3 Test-Stil

- **Tabellen-getrieben** (`it.each`) für mehrere Eingabe-Varianten
- **Eine Assertion pro Test** wo möglich
- **Aussagekräftige Test-Namen**: was ist die Bedingung, was die Erwartung
- **Kein `.skip` / `.only` im commit**
- **Jeder Test eigenständig** — keine Reihenfolge-Abhängigkeit
- **Keine sleep / setTimeout in Engine-Tests** (Engine ist pure)

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
  warnings: [
    ...result.warnings,
    {
      code: 'PAIRING_DEFICIT',
      detail: `Battery ${j} charges from grid (${deficit} W)`,
      magnitudeW: deficit,
    },
  ],
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

- `console.error('[custom-energy-flow-card]', …)` für Errors
- `console.warn(…)` für Diagnose-Warnings (zusätzlich zur Card-UI)
- `console.info(…)` einmalig beim Modul-Load (Version-Banner, siehe Spec §6.1)
- **Kein `console.log` im committed Code** — außer hinter
  `if (process.env.NODE_ENV !== 'production')`-Guard
- Card-Name-Prefix `[custom-energy-flow-card]` immer als erstes Argument

## 8. Commit-Messages

[Conventional Commits](https://www.conventionalcommits.org/):

```
<type>(<scope>): <kurzer Titel im Imperativ>

<Body, optional, max ~72 Zeichen pro Zeile>

<Footer mit Co-Authored-By, optional>
```

**Typen:**

| Type       | Wofür                                   |
| ---------- | --------------------------------------- |
| `feat`     | neue Funktionalität                     |
| `fix`      | Bug-Fix                                 |
| `docs`     | nur Dokumentation                       |
| `test`     | nur Tests                               |
| `refactor` | Code-Umstellung ohne Verhaltensänderung |
| `perf`     | Performance-Optimierung                 |
| `chore`    | Tooling, Dependencies, Build            |
| `ci`       | CI-Workflow-Änderungen                  |

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

- `main`: immer release-bereit, Pre-Commit-Hook + CI grün
- Feature-Branches: `feat/<scope>-<kurz>` (z. B. `feat/engine-pairing-deficit`)
- Bugfix: `fix/<kurz>` (z. B. `fix/render-resize-crash`)
- Doku: `docs/<kurz>`
- **Keine WIP-Commits auf `main`.** Squash oder rebase vor Merge.

## 10. Pre-Commit-Hook

`husky + lint-staged` führt **automatisch vor jedem Commit** aus:

- Prettier (formatieren)
- ESLint (lint)

`pnpm typecheck` und `pnpm test` müssen vor `git push` manuell grün sein
(CI erzwingt das nochmal).

`--no-verify` ist nur für **Notfälle** mit Begründung im Commit-Body erlaubt;
**niemals** auf `main`.

## 11. Anti-Patterns (verboten)

Aus Spec §11.5 (verbindlich):

- ❌ God-Class in `card.ts` (≤ 200 LOC, delegiert)
- ❌ SVG-String-Konkatenation (Lit-Templates)
- ❌ Externe DOM-Libs (jQuery, D3, anime.js)
- ❌ Eigenes State-Management (Redux, MobX)
- ❌ Side-Effects in der Engine
- ❌ Doppelte Util-Funktionen außerhalb von `util/`
- ❌ Berechnung in `render()` (gehört in `willUpdate`)
- ❌ Lit's Default-Reactivity für `hass` unverändert lassen — wir filtern in `shouldUpdate(changedProperties)` auf relevante Sensor-IDs (Spec §5.7); `@property({ hasChanged })` funktioniert dafür nicht, weil das Callback `this` nicht erhält
- ❌ Try-Catch-Schluck (immer mit `console.error` loggen)
- ❌ Hardcoded User-Strings (immer aus `i18n/`, via `resolveT(lang)` aufgelöst — Modul-Singleton verboten)
- ❌ ESLint-`no-restricted-paths`-Zone-Exception ohne `./const.ts` für Layer, die eigene Tests schreiben (Lesson 2026-05-16: `CARD_NAME`/`CARD_VERSION`-Imports in Tests brechen sonst Lint). Engine + util bleiben strikt (pure / const-Owner-Layer).
- ❌ TODO-Kommentar im Release

## 12. Doku-Pflicht

| Wann                                     | Was tun                                                                                                                                              |
| ---------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------- |
| Neue Architektur-Entscheidung            | ADR in `docs/adr/00XX-…md` (Template: `0000-template.md`); ADR-Index in `docs/adr/README.md` aktualisieren; Verweis in `architecture.md §4` ergänzen |
| Spec-Änderung                            | Spec-Header `Status: Spec vN` und `Datum:` aktualisieren; Conventional-Commit `docs(specs): …`                                                       |
| Neue Subspec für ein Feature             | `docs/specs/YYYY-MM-DD-<topic>.md`                                                                                                                   |
| Multi-Step-Implementation aus einer Spec | Plan in `docs/plans/YYYY-MM-DD-<topic>.md` (Checkbox-Liste, ausführbar mit `superpowers:executing-plans` / `subagent-driven-development`)            |
| Konvention/Workflow geändert             | `docs/conventions.md` (diese Datei) aktualisieren                                                                                                    |
| Tech-Stack-Änderung                      | `CLAUDE.md` + entsprechender ADR + Spec §2.1                                                                                                         |
| User-facing-Feature/Verhalten geändert   | `README.md` + ggf. Spec                                                                                                                              |
| Bug-Fix                                  | nur Commit-Message + Test                                                                                                                            |

## 13. Dependencies

- **Pinning:** `^x.y.0` (Major-Pin, Minor/Patch frei)
- **Neue Runtime-Dep außer Lit:** **braucht ADR.** Bundle-Budget ist `BUNDLE_BUDGET_BYTES` aus `scripts/kpi.mjs:29` (Single-Source, aktuell 64 KiB — siehe ADR-0022).
- **Neue Dev-Dep:** OK ohne ADR, aber kurz im Commit-Body begründen.
- **Update von Major-Versionen:** ADR + manueller Test.

## 14. Datums-Format

- Spec/ADR-Header und Doku-Texte: **ISO-8601** (`2026-05-10`)
- Im Code: niemals Datum hardcoded, immer relativ zur Laufzeit (`Date.now()`)

## 15. Sprache

- **Code-Identifier (TypeScript)**: Englisch
- **User-facing Strings**: Deutsch (`i18n/de.ts`) + Englisch (`i18n/en.ts`), Sprach-Auswahl
  automatisch über `hass.locale.language` (`resolveT(lang)`-Factory in `i18n/index.ts`,
  siehe ADR-0023). Default-Fallback: EN.

**i18n-Pflege:** Bei jeder Änderung an `src/i18n/de.ts` MUSS `src/i18n/en.ts`
synchron mitgepflegt werden. TypeScript verhindert struktur-Drift
(`EN: Translations`), aber Wert-Drift („DE-Bullet hinzugefügt, EN vergessen")
ist Reviewer-Pflicht. `pnpm typecheck` fängt fehlende Keys.

- **Doku, Spec, ADRs**: Deutsch (Anwender + Maintainer sprechen Deutsch)
- **Commit-Messages**: Deutsch oder Englisch — **konsistent innerhalb eines
  PRs / Branches**

## 16. Render-Farben auf themable Background

Für Text/Icons, die **auf einer theme-abhängigen Fläche** sitzen (gesättigte
Stroke-Farbe, Card-Background, semitransparenter Hintergrund), ist die
Standard-Farbe **theme-adaptiv** via HA-CSS-Custom-Property — **nicht statisch
weiß oder schwarz**.

**Empfohlenes Pattern:**

```typescript
// Text-Farbe, die im Light-Theme dunkel und im Dark-Theme hell wird
fill = 'var(--primary-text-color, #1c1c1c)';

// Background-Farbe (Card-Innenfüllung), die mit dem HA-Theme mitwandert
fill = '${HA_CSS_VARS.cardBackground}'; // = 'var(--ha-card-background, var(--card-background-color, #fff))'
```

**Verfügbare HA-CSS-Variablen** (siehe `src/render/theme.ts` für `HA_CSS_VARS`):

- `--primary-text-color` — Standard-Textfarbe (Light dunkel, Dark hell)
- `--secondary-text-color` — Sekundär-Textfarbe (gedämpft)
- `--ha-card-background` / `--card-background-color` — Card-Fläche
- `--divider-color` — Trennlinien

**Wann erlaubt, statisch zu sein:** Ringe und Icons, die selbst die
**Theme-tragende Fläche** definieren (z. B. `colorFor('battery', theme)` als
Stroke-Farbe — die Theme-Override-Logik sitzt dann eine Ebene tiefer in
`util/resolve-color.ts`). Auch zentrale Brand-Akzente, die in beiden Themes
gleich wirken müssen.

**Anti-Pattern:** `fill="#ffffff"` für Text auf gesättigtem farbigem Stroke —
liest sich im Light-Theme als „schwach", im Dark-Theme als korrekt; Bug fällt
beim ersten Theme-Switch auf.

**Lesson-Quelle:** `docs/lessons-learned.md` 2026-05-15 (akku-prozent-im-ring,
User-Feedback nach Initial-Implementation).
