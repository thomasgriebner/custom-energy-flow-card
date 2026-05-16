# ADR-0023: i18n via HA-Locale (DE/EN) mit resolveT-Factory

- **Status:** accepted
- **Datum:** 2026-05-16
- **Entscheider:** @griebner

## Kontext und Problem

Hauptspec §1.4 listet Internationalisierung als bewussten v1.x-Kandidaten („trivial weil zentralisiert"). Für eine runde v1.0 soll Englisch als zweite Sprache verfügbar sein, damit die Card außerhalb des deutschsprachigen Raums (HACS-Reichweite) nutzbar ist.

Drei Architektur-Fragen:

1. Woher kommt die Sprache? Config-Feld oder HA-Locale?
2. Wie holen Caller das Translation-Objekt? Modul-Singleton oder Parameter-Durchreichung?
3. Wie wird die EN-Datei type-sicher 1:1 zur DE-Datei gehalten?

## Entscheidung

**Gewählt:**

1. **Sprache aus `hass.locale.language`** (präfix-basiert: `de*` → DE, alles andere → EN). Kein Config-Feld.
2. **`resolveT(lang)`-Factory** in `src/i18n/index.ts`. Caller halten `_lang` als `@state`, holen `T = resolveT(_lang)` pro Render und reichen `T` als Parameter an Sub-Module weiter (oder via `RenderContext.t` für `render/`-Module). Kein Modul-Singleton.
3. **`type Translations = Widen<typeof DE>`** mit Mapped-Type-Widening (`as const` in `de.ts` macht `typeof DE` literal; Widen-Helper ersetzt Literale durch `string`). `EN: Translations` erzwingt 1:1-Struktur via TypeScript-Compiler.
4. **Bundle-Strategie statisch**: beide Sprachen im Main-Bundle (~+1 KiB), kein Dynamic-Import.
5. **Lit-`shouldUpdate`** aus [ADR-0011](./0011-shouldupdate-over-property-haschanged.md) wird um Locale-Vergleich erweitert (`prev.locale.language !== this.hass.locale.language` triggert re-render zusätzlich zur bestehenden Sensor-Filter-Logik).

### Positive Konsequenzen

- Kein User-Eingriff nötig — Card folgt HA-Sprache automatisch.
- Pure-functions-Geist (§11.1) bleibt erhalten — `T` ist Parameter, kein globaler State.
- TypeScript-Compiler verhindert struktur-Drift zwischen DE und EN.
- Bundle bleibt klar unter 64 KiB (ADR-0022).
- Weitere Sprachen (FR, ES, …) sind nach v1.0 trivial: zusätzliche Datei, `Lang`-Type erweitern, `resolveT`-Branch ergänzen.

### Negative Konsequenzen

- **Breaking Visual Change**: User mit HA-Locale ≠ `de` sehen ab Release Englisch. Dokumentiert im Changelog.
- Keine User-Override-Möglichkeit (kein `display.language`-Feld). Bei Bedarf v1.x-Patch.
- Sprach-Switch erfordert hass-Update (kein eigener Event-Bus) — in der Praxis kein Problem, da HA-Sprachwechsel typischerweise Reload triggert.
- **Default-Knoten-Namen aus `derive-display-consumers.ts:43` (`mapNoneMode`) bleiben sprachgebunden zum Zeitpunkt der Config-Auswertung** — Consumer ohne `name` im YAML bekommen den Default-Namen in der aktiven Sprache; bei späterem Sprachwechsel ändert sich der Default nicht (bewusst akzeptiert, v1.x-Refactor möglich).

## Geprüfte Optionen

- **A — HA-Locale-driven + resolveT-Factory** (gewählt)
- **B — Config-Feld `display.language`** — mehr User-Kontrolle, aber Editor-Feld nötig, weniger automatisch
- **C — Modul-Singleton mit `setLang()`** — kürzer in Callern, aber stateful Module = Anti-Pattern (§11.1)
- **D — Dynamic-Import lazy per Sprache** — minimal kleineres Bundle, aber Async-Komplexität ohne Nutzen bei < 5 KiB Differenz
- **E — Browser-Locale (`navigator.language`) als Fallback** — verworfen, weil Browser-Locale ≠ HA-User-Locale (Server-Time-Zone, Geräte-Locale ≠ User-Präferenz, Multi-User-Setups). HA-Locale ist die Single-Source-of-Truth für die Spracheinstellung des HA-Profils.

## Verlinkte Spec-Sektionen / Referenzen

- Subspec [`docs/specs/2026-05-15-en-i18n.md`](../specs/2026-05-15-en-i18n.md)
- Hauptspec §1.4 (Out-of-Scope, aufgelöst durch diese Entscheidung)
- ADR-0010 (Single-Source-Util-Modul — strukturell analog für `i18n/`)
- ADR-0011 (`shouldUpdate` über `hasChanged` — Locale-Vergleich wird ergänzt)
- ADR-0022 (Bundle-Budget 64 KiB — eingehalten)
- [HA Frontend: Locale](https://developers.home-assistant.io/docs/frontend/data/)
