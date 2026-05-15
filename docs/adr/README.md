# Architecture Decision Records (ADRs)

Hier dokumentieren wir alle Architektur-Entscheidungen für `custom-energy-flow-card`.

## Was ist ein ADR?

Ein **Architecture Decision Record** hält eine bedeutsame Architektur-Entscheidung
fest: Was wurde entschieden, warum, welche Alternativen wurden geprüft, welche
Konsequenzen folgen daraus. ADRs sind unveränderlich — wenn eine Entscheidung
revidiert wird, bekommt sie Status `superseded` und es entsteht ein neuer ADR,
der die alte Entscheidung ersetzt.

## Wann einen ADR schreiben?

**Pflicht** bei:

- Layer-Architektur-Änderung
- Wahl eines neuen Frameworks / einer neuen Library
- Algorithmus-Wahl mit langfristiger Bindung (z. B. Energie-Bilanz)
- Test-Strategie-Entscheidung
- API-/Schema-Bruch
- Verzicht auf etwas, das man erwarten würde

**Nicht nötig** bei:

- Bug-Fix
- Kleine Refactorings ohne Architektur-Auswirkung
- Update einer Dependency auf neue Patch-Version
- Code-Style-Entscheidungen (gehören in ESLint/Prettier-Config)

## Format

Wir nutzen ein leicht angepasstes [MADR](https://adr.github.io/madr/)-Format —
siehe [`0000-template.md`](./0000-template.md).

## Workflow

1. Kopiere `0000-template.md` zu `00XX-kurz-titel.md` (XX = nächste freie Nummer)
2. Status auf `proposed`
3. Schreibe Context, Considered Options, Decision Outcome
4. Wenn implementiert / Code-Review akzeptiert: Status auf `accepted`
5. Eintrag in [Index](#index) und in [`../architecture.md`](../architecture.md) §4
6. Bei Revision: alten ADR auf `superseded by 00YY` setzen, neuen ADR schreiben

## Index

| Nr                                                       | Titel                                                         | Status                                                      |
| -------------------------------------------------------- | ------------------------------------------------------------- | ----------------------------------------------------------- |
| [0001](./0001-greenfield-not-fork.md)                    | Greenfield neu bauen statt power-flow-card-plus forken        | accepted                                                    |
| [0002](./0002-layered-modular-architecture.md)           | Schicht-getrennte modulare Architektur                        | accepted                                                    |
| [0003](./0003-typescript-lit-rollup.md)                  | TypeScript + Lit 3 + Rollup als Tech-Stack                    | accepted                                                    |
| [0004](./0004-pure-functions-engine.md)                  | Energie-Engine als pure functions                             | accepted                                                    |
| [0005](./0005-css-offset-path-animation.md)              | CSS `offset-path` statt SVG `<animateMotion>`                 | accepted                                                    |
| [0006](./0006-strict-1-to-1-pv-battery-pairing.md)       | Strikte 1:1-Pairing-Regel zwischen PV und Akku                | accepted                                                    |
| [0007](./0007-energy-balance-with-reconcile.md)          | Energie-Bilanz mit Netz-Sensor-Reconcile                      | accepted                                                    |
| [0008](./0008-manual-list-editor.md)                     | Editor-Listen manuell mit Lit (statt ha-form-Listen)          | accepted                                                    |
| [0009](./0009-eslint-enforced-layer-boundaries.md)       | Layer-Grenzen via ESLint erzwingen                            | accepted                                                    |
| [0010](./0010-shared-util-module.md)                     | Single-Source-Util-Modul gegen Code-Doppelungen               | accepted                                                    |
| [0011](./0011-shouldupdate-over-property-haschanged.md)  | `shouldUpdate` statt `@property({ hasChanged })`              | accepted                                                    |
| [0012](./0012-headless-smoke-test-pre-release-gate.md)   | Headless Smoke-Test als Pre-Release-Gate                      | accepted                                                    |
| [0013](./0013-v0-9-0-first-release-strategy.md)          | v0.9.0 als erstes Live-Release, v1.0.0 nach Stabilisierung    | accepted                                                    |
| [0014](./0014-stub-config-validates-as-valid.md)         | HA-Stub-Config wird als valide Config behandelt               | accepted                                                    |
| [0015](./0015-split-charge-discharge-battery-sensors.md) | Akku akzeptiert zwei getrennte charge/discharge Sensoren      | accepted                                                    |
| [0016](./0016-ha-area-grouping.md)                       | HA-Area-basierte Verbraucher-Gruppierung                      | accepted                                                    |
| [0017](./0017-adaptive-svg-layout.md)                    | Quellen-Cluster + Consumer-Arc Layout                         | accepted                                                    |
| [0018](./0018-ha-dashboard-layout-api.md)                | HA-Dashboard-Layout-API immer aktiv                           | superseded by [0019](./0019-aspect-16-9-no-grid-options.md) |
| [0019](./0019-aspect-16-9-no-grid-options.md)            | ViewBox-Aspect 16:9 + Entfernung HA-Dashboard-Layout-API      | accepted                                                    |
| [0020](./0020-ha-icon-via-foreignobject.md)              | `<ha-icon>` via `<foreignObject>` statt inline `mdi-paths.ts` | accepted                                                    |
| [0021](./0021-code-review-workflow-pre-release-gate.md)  | Code-Review-Workflow als Pre-Release-Quality-Gate             | accepted                                                    |
| [0022](./0022-bundle-budget-60-to-64-kib.md)             | Bundle-Budget 60 KiB → 64 KiB                                 | accepted                                                    |
