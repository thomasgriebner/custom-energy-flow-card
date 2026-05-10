# Claude Code – Projekt-Schnellreferenz

Dieses Dokument ist die kompakte Sicht für Claude Code beim Arbeiten an
`custom-energy-flow-card`. Vollständige Quelle der Wahrheit ist die Spec.

## Projekt

Lovelace-Custom-Card für Home Assistant zur Live-Visualisierung des
Energieflusses in Mehr-Quellen-Haushalten (N PV-Anlagen, N Akkus, N
Verbraucher, 1 Netz, 1 Haus). Greenfield, TypeScript, Lit 3, HACS-distribuiert.

## Tech-Stack (kompakt)

| Was | Version | Rolle |
|---|---|---|
| **Node** | ≥ 20 LTS | Runtime |
| **pnpm** | ≥ 9 | Package-Manager (verbindlich) |
| **TypeScript** | `^5.4` strict | Sprache |
| **Lit** | `^3.2` | LitElement, einzige Runtime-Dep |
| **Rollup** | `^4.13` | Single-File-Bundle |
| **Vitest** | `^1.4` | Tests (node + happy-dom) |
| **happy-dom** | `^14.0` | DOM-Env für Editor/Card-Tests |
| **ESLint** | `^8.57` | Lint, Layer-Boundaries erzwingen |
| **Prettier** | `^3.2` | Formatter |
| **husky + lint-staged** | `^9 / ^15` | Pre-Commit-Hook |

**Decorators:** `experimentalDecorators: true`. **Bundle-Budget:** 60 kB
minified. **Keine Runtime-Deps außer Lit.**

Volle Versionsliste: Spec §2.1.

## Dokumentations-Karte

| Was suchst du? | Wo es liegt |
|---|---|
| Was bauen wir & warum (Vollspec) | [`docs/specs/2026-05-10-custom-energy-flow-card-design.md`](./docs/specs/2026-05-10-custom-energy-flow-card-design.md) |
| Architektur-Überblick (lebendig) | [`docs/architecture.md`](./docs/architecture.md) |
| Architektur-Entscheidungen mit Begründung | [`docs/adr/`](./docs/adr/) (Index in `README.md`) |
| Code-/Workflow-Konventionen | [`docs/conventions.md`](./docs/conventions.md) |
| Beispiel-Configs (User) | `examples/2-pv-2-batt.yaml` |
| Sandbox (Renderer-Verifikation) | `examples/preview.html` |
| User-facing Doku | `README.md` (im Repo-Root, wird mit v1.0 angelegt) |

## Wo dokumentiere ich was?

| Wenn du … | … dann |
|---|---|
| eine **Architektur-Entscheidung** triffst (Lib-Wahl, Layer-Änderung, Algorithmus-Wahl) | neuer ADR in `docs/adr/00XX-kurz-titel.md` (Template: `0000-template.md`), Index in `docs/adr/README.md` + `architecture.md §4` updaten |
| eine **Spec-Änderung** machst | Spec-Header `Status` und `Datum` aktualisieren, Commit `docs(specs): …` |
| eine **Konvention** ergänzt/änderst (Code-Stil, Workflow) | `docs/conventions.md` |
| den **Tech-Stack** änderst | dieses `CLAUDE.md` + ADR + Spec §2.1 |
| ein **User-facing Verhalten** änderst | `README.md` + ggf. Spec |
| einen **Bug** fixt | Commit + Test, keine Doku-Pflicht |
| eine neue **Subspec** für ein Feature schreibst | `docs/specs/YYYY-MM-DD-<topic>.md` |

## Module-Layer (Kurzform)

```
util/    ←  format-power, resolve-color, read-sensor, svg-path, memo  (single source)
i18n/    ←  alle User-Strings (DE)
engine/  ←  pure functions, Energie-Bilanz, HA-frei
config/  ←  Schema-Validation, buildSystemState (HA → State)
render/  ←  SVG, CSS-Animation (Lit-Templates)
ha/      ←  HA-Event-Helfer, Type-Skelett
card.ts  ←  LitElement, ≤ 200 LOC, delegiert
editor.ts←  Lovelace-GUI-Editor (eigener LitElement)
```

Layer-Imports sind via ESLint `no-restricted-paths` erzwungen
(siehe ADR-0009). Verstoß bricht CI.

Volle Modulkarte: `architecture.md §2` und Spec §2.2.

## Kritische Regeln

1. **Engine = pure functions.** Keine Klassen, kein State, kein DOM, keine
   Side-Effects. (ADR-0004, Spec §11.1)
2. **Keine Code-Doppelungen.** `util/`-Modul ist Single-Source. Wer
   `formatPowerW` außerhalb von `util/` re-implementiert: Bug. (ADR-0010, Spec §11.5)
3. **`card.ts` ≤ 200 LOC.** Delegiert vollständig, baut keine SVG-Strings,
   parst keine Sensoren direkt. (Spec §2.2)
4. **Keine `any` ohne Begründungs-Kommentar.** TypeScript strict + lint-enforced.
   (Spec §11.2, conventions.md §1.2)
5. **Berechnung in `willUpdate`, niemals `render`.** Lit-Lifecycle. (Spec §5.7)
6. **Custom `hasChanged` für `hass`-Property.** Sonst re-rendert die Card auf
   jedes globale State-Update. (Spec §5.7)
7. **Crash-Resilient.** `willUpdate` mit try/catch + Fallback-UI. Engine wirft
   nicht bei Daten-Inkonsistenzen — nur Warnings. (Spec §5.10, §6.1 in conventions)
8. **Strings aus `i18n/de.ts`.** Niemals user-facing Strings hardcoded in
   Templates. (Spec §11.5)
9. **Tests-driven für Engine.** Edge-Cases zuerst, Implementation danach.
   ≥ 90 % Coverage. (Spec §11.3)
10. **HA-Custom-Elements (`ha-form`, `ha-entity-picker`) NICHT importieren.**
    Sind globale Custom Elements; nur Type-Deklaration in `ha/ha-globals.d.ts`.
    (Spec §6.4.2)

Volle Anti-Pattern-Liste: Spec §11.5, conventions.md §11.

## Häufige Befehle

```bash
pnpm install            # initial setup
pnpm dev                # rollup watch-mode
pnpm test               # vitest run
pnpm test:watch         # vitest watch
pnpm test:coverage      # mit coverage report
pnpm lint               # eslint
pnpm typecheck          # tsc --noEmit
pnpm check              # alles zusammen (CI-Gate)
pnpm build              # production bundle in dist/
pnpm build:analyze      # mit rollup-plugin-visualizer
pnpm preview            # Sandbox in Browser öffnen
```

## Workflow

1. **Vor jeder Implementation:** lies die relevante Spec-Sektion
2. **Entscheidung mit langfristiger Bindung:** ADR-0000-Template kopieren,
   neuen ADR anlegen, Index updaten
3. **TDD für Engine/Util/Config:** Test zuerst, Code danach
4. **Pre-Commit-Hook** läuft automatisch (lint + format)
5. **Vor `git push`:** `pnpm check` lokal grün
6. **Auf `main` mergen:** nur wenn CI grün

## Out-of-Scope (v1.0)

* Energie-Tagesstatistiken (HA-Energy-Cards)
* Phasen-aufgelöste Anzeige (L1/L2/L3)
* Dynamische Stromtarif-Anzeige
* Internationalisierung (Strings auf Deutsch in `i18n/de.ts`, v1.x-Kandidat)
* Mehr als ein signierter Battery-Power-Sensor (zwei separate
  charge/discharge → v1.x)

## Bei Unklarheit

* Zuerst **Spec** in `docs/specs/`
* Dann **ADRs** für „warum so?"-Fragen
* Dann **conventions.md** für „wie schreiben wir das?"-Fragen
* Dann nachfragen
