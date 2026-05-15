# Subspec — Icon-Positionierung und Kreis-Skalierung

**Status:** v4 (post-test-pass-brillen-rotation: 4 zusätzliche Pässe Pass-2/3/4/5 parallel ausgeführt, 17 weitere auto-fixes + 1 verify-needed integriert, 1 user-decision F20 verworfen)
**Datum:** 2026-05-15
**Autor:** Brainstorming-Session mit @griebner
**Verlinkte Hauptspec:** [`2026-05-10-custom-energy-flow-card-design.md`](./2026-05-10-custom-energy-flow-card-design.md)
**Verlinkte Subspec(s):** [`2026-05-13-icons-and-editor-ids.md`](./2026-05-13-icons-and-editor-ids.md) (Icon-Modul §3.2 wird in NODE_ICON_BOX-Werten angepasst); [`2026-05-12-aspect-ratio-redesign.md`](./2026-05-12-aspect-ratio-redesign.md) (Geometrie-Konstanten in layout.ts werden ergänzt)
**Berührte ADRs:** 0017 (Werte-Update Consumer-Arc), 0020 (Cross-Reference Icon-Box-Werte), 0010 (Single-Source-Bestätigung)
**Neuer ADR benötigt:** nein

## 0. Zusammenfassung

Visuelles Polish-Release auf `0.12.x` zur Behebung von vier Render-Issues, die nach v0.12.0-Release im Live-Betrieb beim User auffielen (Screenshot vom 2026-05-14):

1. **Icon ↔ Wert quetschen sich** in Home/PV/Batt/Grid (Spacing 1–3 px statt komfortablen 8–10 px)
2. **Consumer-Icon wirkt winzig** (18 px im r=24-Kreis, weil Werte außerhalb stehen)
3. **Kreise zu klein** für 4–5-stellige signed Werte (z. B. `-3.743 W` im r=32-Grid-Kreis am Rand)
4. **Battery-Default-Icon** (`mdi:battery` = leeres Outline) wirkt wie „kein Icon hinterlegt"

Es sind ausschließlich Maßzahl- und Default-Wert-Updates innerhalb des `render/`-Layers. Keine neuen Architektur-Konzepte; keine neuen ADRs nötig. ADR-0017 erhält Werte-Updates (Consumer-Radius 24→28 verändert Arc-Gap-Margin).

### 0.0 TL;DR — Was der Planer NICHT tun darf

1. ❌ `src/engine/*` anfassen — Engine bleibt pure (ADR-0004, CLAUDE.md 1)
2. ❌ `src/config/*` anfassen — Config-Schema bleibt identisch; keine neuen User-facing Optionen
3. ❌ `src/i18n/*` anfassen — keine neuen User-facing Strings
4. ❌ `src/card.ts` Lifecycle (`shouldUpdate`/`willUpdate`/`render`) ändern (CLAUDE.md 5–6)
5. ❌ `src/editor.ts` und `src/editor-list-sections.ts` anfassen — Editor unverändert (kein neues Feld)
6. ❌ `src/util/format-power.ts` anfassen — kein kW-Switch in dieser Spec (Non-Goal §2.2)
7. ❌ `src/render/flow-renderer.ts` Diagnostics-Icon-Geometrie anfassen — nur die Knoten-Geometrie wird verändert
8. ❌ `src/render/edge-color.ts`, `src/render/flow-animation.ts` anfassen — Edges/Animation unverändert
9. ❌ `src/card-styles.ts` CSS-Variablen anfassen — Anpassung passiert auf SVG-Attribut-Ebene
10. ❌ Neue Layer-Cross-Imports einführen (ADR-0009; ESLint bricht CI)
11. ❌ Neue Runtime-Dependency aufnehmen (CLAUDE.md Tech-Stack: nur Lit)
12. ❌ `DEFAULT_MDI_ICONS` für andere Knoten als `battery` ändern (User hat nur Battery genannt)
13. ❌ Neue Konstanten/Magic-Numbers ohne Single-Source einführen (ADR-0010, CLAUDE.md 2)
14. ❌ Spec-Code-Snippets der Form `// alt: …` als Kommentar ins Prod-File übernehmen — WHAT-Kommentar (conventions.md §2)
15. ❌ Battery-Ring-Radius unverändert lassen (RING_RADIUS=42 vs. neuer NODE_R_MEDIUM=42 → Kollision; siehe §3.4)

Bei Konflikt zwischen Verbot und Plan-Schritt: STOP und nachfragen.

### 0.1 Harte Constraints für den Planer

**ESLint-Layer-Zonen aus `.eslintrc.cjs`** (authoritative — Spec hier NICHT doppelpflegen, immer die echte Config lesen):

| Target        | Darf importieren aus                                                                                             |
| ------------- | ---------------------------------------------------------------------------------------------------------------- |
| `src/render/` | `./render`, `./util`, `./engine/types.ts`, `./engine/flow-graph.ts`, `./config/types.ts`, `./const.ts`, `./i18n` |
| `src/util/`   | `./util` (in sich geschlossen)                                                                                   |

Andere Layer (`engine/`, `config/`, `editor.ts`, …) sind in dieser Spec **nicht** Edit-Ziel. Falls ein Plan-Schritt diese Layer berührt: STOP.

**Weitere Constraints:**

| Constraint                                          | Quelle                 | Konsequenz bei Verletzung                                |
| --------------------------------------------------- | ---------------------- | -------------------------------------------------------- |
| Engine = pure functions                             | ADR-0004, CLAUDE.md 1  | Engine bleibt unangetastet                               |
| Single-Source für `NODE_R_*` + `NODE_ICON_BOX`      | ADR-0010, CLAUDE.md 2  | Werte nur an einer Stelle definieren, nirgends doppeln   |
| `card.ts ≤ 200 LOC`                                 | Spec §2.2, CLAUDE.md 3 | Diese Spec ändert `card.ts` nicht                        |
| Keine `any` ohne Begründungs-Kommentar              | CLAUDE.md 4            | TypeScript strict + lint-enforced bleibt                 |
| Berechnung in `willUpdate`, niemals `render`        | CLAUDE.md 5            | Lifecycle bleibt unverändert                             |
| Crash-Resilient: try/catch + Fallback-UI            | CLAUDE.md 7            | Maßzahl-Updates können nicht crashen — keine neuen Pfade |
| Strings aus `i18n/de.ts`                            | CLAUDE.md 8            | Keine neuen Strings                                      |
| TDD für `engine`/`util`/`config`, ≥ 90 % Coverage   | CLAUDE.md 9            | Diese Spec berührt nur `render/`; Tests bleiben TDD-Stil |
| HA-Custom-Elements (`ha-form`, …) NICHT importieren | CLAUDE.md 10           | Nicht berührt                                            |
| Layer-Boundaries via ESLint `no-restricted-paths`   | ADR-0009               | Keine neuen Cross-Layer-Imports                          |
| Pre-Release-Smoke-Test grün                         | ADR-0012               | MUSS mit neuer Geometrie bestanden werden                |
| Bundle ≤ 60 kB minified                             | CLAUDE.md Tech-Stack   | Werte-Updates sind volumen-neutral; Verifikation in P8   |
| `noUncheckedIndexedAccess` strict                   | `tsconfig.json`        | Tests, die `consumers[i]?.x` lesen, müssen `?.` behalten |

**Weitere verbindliche Lese-Quellen für den Planer:**

- `CLAUDE.md` (Projekt-Schnellreferenz, Workflow-Regeln, Anti-Patterns)
- `docs/conventions.md` (Code-Stil, Naming, Commit-Konventionen, §11 Anti-Patterns, §12 Doku-Pflicht)
- `docs/architecture.md` (Module-Map §2, ADR-Tabelle §4)
- [`docs/adr/0017-adaptive-svg-layout.md`](../adr/0017-adaptive-svg-layout.md)
- [`docs/adr/0020-ha-icon-via-foreignobject.md`](../adr/0020-ha-icon-via-foreignobject.md)
- [`docs/adr/0010-shared-util-module.md`](../adr/0010-shared-util-module.md)

### 0.2 Architektur-Kontext (welche Layer berührt)

| Layer            | Datei                                       | Art der Änderung                                                                                                                                                                                                                   |
| ---------------- | ------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `render/`        | `src/render/icon.ts`                        | edit — `DEFAULT_MDI_ICONS.battery` + `NODE_ICON_BOX` (5 Knoten-Kinder)                                                                                                                                                             |
| `render/`        | `src/render/layout.ts`                      | edit — `NODE_R_MEDIUM/CONSUMER/GRID` + ggf. `BOTTOM_Y` + Arc-Konstanten                                                                                                                                                            |
| `render/`        | `src/render/battery-ring.ts`                | edit — `RING_RADIUS 42 → 50` (Kollisions-Auflösung, siehe §3.4)                                                                                                                                                                    |
| `render/`        | `src/render/node-renderer.ts`               | edit — `valueY` (vereinheitlicht auf 20), `font-size` für Non-Home Value 13→14                                                                                                                                                     |
| `render/`        | `src/render/icon.test.ts`                   | edit — `width="18"` → `width="24"` (Consumer), neue Battery-Default-Assertion                                                                                                                                                      |
| `render/`        | `src/render/layout.test.ts`                 | edit — `grid.r: 32 → 40`, PV/Akku Magic-Number-Block (Lines 96–103) auf neue Radien                                                                                                                                                |
| `render/`        | `src/render/battery-ring.test.ts`           | edit (falls Radius-Asserts) — neuer `RING_RADIUS`                                                                                                                                                                                  |
| Root (top-level) | `src/const.ts`                              | edit — `CARD_VERSION: '0.12.0' → '0.12.1'` (Patch-Bump, visuell-only Change). Top-Level-File, kein spezifischer Layer (in allen ESLint-Zonen importierbar).                                                                        |
| `examples/`      | `examples/preview.html`                     | kein Edit — verifiziert: keine hardcoded Radien (`grep "NODE_R\|r=\d" examples/preview.html` leer); rendert automatisch. Nur Visual-Verifikation in P7.                                                                            |
| `examples/`      | `examples/preview-mocks.ts`                 | **edit (temporär oder permanent)** — neues Scenario mit 5-stelligen Werten (`grid_power: '-12345'`, `pv1_power: '12345'`, `batt1_power: '9999'`) für Issue-C-Verifikation in P7. Alternativ: DevTools-Live-Anpassung (siehe §6.4). |
| `scripts/`       | `scripts/smoke-test.mjs`                    | kein Edit — prüft nur viewBox-Interpolation (`smoke-test.mjs:81-97`), keine Radius/Geometrie-Asserts. Von Radius-Updates unbetroffen. Wird in P8 ausgeführt (Pre-Release-Gate, ADR-0012).                                          |
| `docs/`          | `docs/adr/0017-adaptive-svg-layout.md`      | edit — Consumer-Radius 24→28 + ggf. Arc-Step-Anpassung                                                                                                                                                                             |
| `docs/`          | `docs/architecture.md`                      | check — Module-Map unverändert (kein neuer Layer/Modul)                                                                                                                                                                            |
| `docs/`          | `README.md`                                 | edit — Changelog-Eintrag für 0.12.1                                                                                                                                                                                                |
| `docs/`          | `docs/screenshots/individual-consumers.png` | **regen** — kanonisches User-facing-Bild aus README:11; neu generieren via `pnpm preview` mit Default-Config                                                                                                                       |
| `docs/`          | `docs/screenshots/by-area-grouping.png`     | **regen** — kanonisches User-facing-Bild aus README:20; mit `consumer_grouping: by_area`-Scenario                                                                                                                                  |

**NICHT zu berührende Layer** (Verstoß bricht CI via ESLint `no-restricted-paths`):

- `engine/` — pure Energiebilanz, kennt keine Geometrie (ADR-0004)
- `config/` — Schema-Validation, `deriveDisplayConsumers` (ADR-0016) — keine neuen Felder
- `ha/` — HA-Event-Helfer, Type-Skelett — nicht betroffen
- `i18n/` — keine neuen User-facing-Strings
- `editor.ts` + `editor-list-sections.ts` — kein neues Editor-Feld
- `card.ts` — Lifecycle unverändert; bleibt ≤ 200 LOC
- `card-helpers.ts` + `card-styles.ts` — CSS-Vars und Skeleton-Layout unangetastet

**Single-Source-Regeln (ADR-0010, CLAUDE.md 2):**

- `NODE_R_LARGE/MEDIUM/CONSUMER/GRID` werden **ausschließlich** in `src/render/layout.ts:29-32` definiert. Tests dürfen die Werte importieren, NICHT re-deklarieren. Heutige Magic-Number `32` in `layout.test.ts:97-101` MUSS durch `NODE_R_MEDIUM` ersetzt werden (es ist die alte Radius-Annahme für PV/Akku — gleichzeitige Modernisierung).
- `NODE_ICON_BOX` ist **ausschließlich** in `src/render/icon.ts:20-26` definiert.
- `RING_RADIUS` (`battery-ring.ts:3`) und `STROKE_WIDTH` (`battery-ring.ts:4`) bleiben modul-private — kein Re-Export.
- `CARD_VERSION` (`const.ts:3`) ist die einzige Versionsquelle.

#### 0.2.1 Files-to-Verify — Parent-Dirs + Tool-Coverage

Alle berührten Files existieren bereits — keine neuen Files, keine `mkdir -p` nötig.

| Datei (EDIT)                           | Parent-Dir  | Tool-Coverage                                                                              |
| -------------------------------------- | ----------- | ------------------------------------------------------------------------------------------ |
| `src/render/icon.ts`                   | ✓ existiert | `typecheck` + `lint` + `test (icon.test.ts)`                                               |
| `src/render/layout.ts`                 | ✓ existiert | `typecheck` + `lint` + `test (layout.test.ts)`                                             |
| `src/render/battery-ring.ts`           | ✓ existiert | `typecheck` + `lint` + `test (battery-ring.test.ts)`                                       |
| `src/render/node-renderer.ts`          | ✓ existiert | `typecheck` + `lint` (kein eigener Test — Render-Resultat über `layout.test.ts` + Sandbox) |
| `src/const.ts`                         | ✓ existiert | `typecheck` + `lint`                                                                       |
| `examples/preview.html`                | ✓ existiert | manuelle Visual-Verifikation                                                               |
| `docs/adr/0017-adaptive-svg-layout.md` | ✓ existiert | manuelle Review                                                                            |
| `README.md`                            | ✓ existiert | manuelle Review                                                                            |

**Faustregeln (aus 2026-05-12-Spec übernommen):**

- Tests werden via Vitest+esbuild ausgeführt, **nicht** per `tsc --noEmit`. Type-Errors in Test-Files werden erst zur Laufzeit sichtbar.
- ESLint läuft auf `src/**/*.ts` — `examples/`, `tests/`, `scripts/` sind nicht lint-gecheckt.
- Smoke-Test rendert die Card (`card.hass = …` triggert Lit-Lifecycle) — nicht nur Custom-Element-Registrierung.

### 0.3 Konzept-Modell / Datenfluss

```
HA hass.states ─┐
                ├─► buildSystemState ─► engine.compute ─► FlowResult
config         ─┘                                              │
                                                               │
displayConsumers ────────────────► computeLayout ─► LayoutResult ─┐
                                       (← betroffen: NODE_R_*)    │
                                                                  ▼
                                                      renderCard(layout, flow, ctx)
                                                          │
                                                          ├─► node-renderer.renderNode  (← betroffen: valueY, font)
                                                          │     ├─► battery-ring.renderBatteryRing  (← betroffen: RING_RADIUS)
                                                          │     ├─► home-ring.renderHomeRing
                                                          │     └─► icon.nodeIcon  (← betroffen: NODE_ICON_BOX, DEFAULT_MDI_ICONS.battery)
                                                          └─► flow-renderer.renderFlow
```

**Pflicht-Wissen:**

- `engine/` und `config/` bleiben unangetastet. Diese Spec greift nur am letzten Schritt (Rendering) ein.
- `icon.ts` ist **theme-agnostisch** (ADR-0020 / Subspec 2026-05-13 §3.2) — Farbe kommt via `currentColor` vom Parent-`<g>`. Spec ändert nur Geometrie-Werte, nicht das Farb-Verhalten.
- `layout.ts` produziert nur Positionen + Pfade; **kennt keine Power-Werte**. Spec ändert die Radien und damit indirekt die Edge-Tangenten (über `consumerEdgePath`, `node.r` in Bezier-Aufrufen).
- `node-renderer.ts` kombiniert Layout + Power. Spec ändert nur die Text-Positionen (`valueY`, `font-size`), keine Logik.
- `battery-ring.ts` rendert den SOC-Ring **außerhalb** des Batterie-Kreises. Bei größerem Kreis muss der Ring nach außen rücken, sonst überlagern sich Kreis-Stroke und Ring-Stroke.

### 0.4 Don't-Touch-Liste

| Element                                       | Wo                               | Warum nicht anfassen                                                                     |
| --------------------------------------------- | -------------------------------- | ---------------------------------------------------------------------------------------- |
| `DEFAULT_MDI_ICONS` für pv/grid/home/consumer | `src/render/icon.ts:5-11`        | Nur `battery` ist Issue D; andere Defaults bleiben (User hat nur Battery genannt)        |
| `DIAGNOSTICS_ICON_BOX`                        | `src/render/icon.ts:28-33`       | Diagnostics-Icon-Geometrie unabhängig vom Knoten-Layout                                  |
| `NODE_R_LARGE = 50`                           | `src/render/layout.ts:29`        | Home als Anker behält Größe — visuelle Hierarchie soll erhalten bleiben                  |
| `TOP_Y = 80`, `MIDDLE_Y = 270`                | `src/render/layout.ts:33, 35`    | Vertikal-Layout unverändert; nur Radien wachsen (ausreichend Margin verifiziert in §1.3) |
| `HOME_X`, `GRID_X`, `SOURCE_X_MIN/MAX`        | `src/render/layout.ts:36-39`     | X-Geometrie bleibt; nur Y/Radius betroffen                                               |
| `CONSUMER_ARC_R = 350`                        | `src/render/layout.ts:40`        | Arc-Radius bleibt                                                                        |
| `home.color`, `home-ring.RING_RADIUS=60`      | `src/render/home-ring.ts:5`      | Home-Ring außerhalb r=50 mit 10 px Margin — unverändert (Home wächst nicht)              |
| `STROKE_WIDTH` (Battery-Ring) = 6             | `src/render/battery-ring.ts:4`   | Strichbreite unverändert; nur Radius wandert                                             |
| `STROKE_WIDTH` (Knoten-Kreis) = 2.5           | `src/render/node-renderer.ts:83` | Strichbreite unverändert                                                                 |
| Stroke-Dash `4 4` für unavailable             | `src/render/node-renderer.ts:53` | Unavailable-Indikator unverändert                                                        |
| `TAB_ORDER` in `flow-renderer.ts`             | `src/render/flow-renderer.ts:13` | Reihenfolge ist semantisch (Knoten-Typ), nicht räumlich                                  |
| `aria-label` auf Nodes                        | `src/render/node-renderer.ts:68` | A11y, semantisch                                                                         |
| `prefers-reduced-motion`-CSS                  | `src/render/flow-animation.ts`   | OS-Setting unverändert                                                                   |
| `VIEWBOX = { width: 960, height: 540 }`       | `src/const.ts:20`                | 16:9-Layout bleibt (Subspec 2026-05-12)                                                  |
| `MIN_CONTAINER_WIDTH_PX = 280`                | `src/const.ts:21`                | Narrow-Banner-Schwelle, container-bezogen                                                |
| `_containerW = 720` Default                   | `src/card.ts`                    | ResizeObserver-Default, unverändert                                                      |
| `shouldUpdate`/`willUpdate`/`render`          | `src/card.ts`                    | Lifecycle-Logik unverändert (ADR-0011, CLAUDE.md 5–6)                                    |
| Engine, Config-Schema, i18n, Editor           | alle entsprechenden Dateien      | siehe §0.2                                                                               |

## 1. Kontext und Motivation

### 1.1 User-Beobachtung (2026-05-14)

User-Screenshot vom Live-System ([`docs/screenshots/Screenshot 2026-05-14 112950.png`](../screenshots/Screenshot%202026-05-14%20112950.png)) zeigt vier konkrete Render-Issues:

1. **PV „Dach" (`4.077 W`)** und PV „Balkon" (`1.010 W`): Wert-Text steht direkt unter dem Solar-Icon, optisch gequetscht. Spacing rechnerisch 1 px (Icon-Bottom `-4 + 12 = +8`, Wert-Top `16 − 9 ≈ +7`).
2. **Batterie „Balkon" (`+1.010 W`)**: 7 Zeichen mit Vorzeichen+Tausenderpunkt, beanspruchen viel horizontalen Raum im r=34-Kreis und kollidieren visuell mit dem Akku-Icon.
3. **Grid (`-3.743 W`)**: 8 Zeichen im r=32-Kreis. Der Text läuft fast bis zum Kreis-Rand. Bei 5-stelligen Werten (`-12.345 W` = 9 Zeichen) würde der Text überlaufen, da `format-power.ts` aktuell keinen kW-Switch hat.
4. **Akku-Default-Icon**: User berichtet „der Akku kein Standardsymbol hinterlegt hat, das war leer, wenn ich eines Hinzufüge ist das dann da (wie auf dem Bild)". Auf dem Bild ist das User-konfigurierte `mdi:battery-charging-high`-Icon zu sehen. Default ist `mdi:battery` (`icon.ts:7`) — ein leeres Akku-Outline, das auf manchen MDI-Renderings als „leerer Rahmen" wahrgenommen wird.

### 1.2 Code-Referenz für die Engheit

| Element                              | Datei:Zeile                      | Heutige Werte   | Rechnung                                                       |
| ------------------------------------ | -------------------------------- | --------------- | -------------------------------------------------------------- |
| `valueY` (Non-Home)                  | `src/render/node-renderer.ts:55` | `16`            | Wert-Baseline; Top ≈ `16 - cap` (cap ≈ 9)                      |
| `valueY` (Home)                      | `src/render/node-renderer.ts:55` | `14`            | Top ≈ `14 - 11 = 3`                                            |
| `font-size` (Non-Home)               | `src/render/node-renderer.ts:98` | `13`            | Cap-Höhe ≈ 9 px                                                |
| `font-size` (Home)                   | `src/render/node-renderer.ts:98` | `15`            | Cap-Höhe ≈ 11 px                                               |
| `NODE_ICON_BOX.pv/batt/grid.centerY` | `src/render/icon.ts:21-23`       | `-4`            | Icon-Bottom ≈ `-4 + (24/2) = +8`                               |
| `NODE_ICON_BOX.home.centerY`         | `src/render/icon.ts:24`          | `-10`           | Icon-Bottom ≈ `-10 + (32/2) = +6`                              |
| `NODE_R_MEDIUM`                      | `src/render/layout.ts:30`        | `34`            | PV/Batt-Diameter 68                                            |
| `NODE_R_GRID`                        | `src/render/layout.ts:32`        | `32`            | Grid-Diameter 64; bei font 13 und 9-Zeichen-Text ≈ 60 px breit |
| `NODE_R_CONSUMER`                    | `src/render/layout.ts:31`        | `24`            | Consumer-Icon 18 px (75 % von 24)                              |
| `DEFAULT_MDI_ICONS.battery`          | `src/render/icon.ts:7`           | `'mdi:battery'` | Leeres Outline                                                 |

## 2. Goals und Non-Goals

### 2.1 Goals

- **G1** — Spacing zwischen Icon-Bottom und Wert-Top **≥ 8 px** für alle Knoten mit innerem Wert (Home, PV, Batt, Grid). Verifizierbar per Geometrie-Rechnung in Test.
- **G2** — PV/Batt-Radius wächst von 34 auf 42 (Diameter 84); Grid von 32 auf 40 (Diameter 80) — robust für 5-stellige signed Werte mit Tausenderpunkt (z. B. `-12.345 W` ≈ 70 px Textbreite bei Font 14).
- **G3** — Consumer-Radius wächst von 24 auf 28; Consumer-Icon wächst von 18 auf 24 (gleiche Box wie PV/Batt/Grid). Layout-Struktur (Name+Wert rechts außen) bleibt unverändert.
- **G4** — Battery-Default-Icon wechselt von `mdi:battery` auf `mdi:home-battery` (Heimakku-Symbol, kontextstark).
- **G5** — `pnpm check` grün; Bundle ≤ 60 kB; Pre-Release-Smoke-Test grün; `docs/screenshots/` aktualisiert.

### 2.2 Non-Goals

**Editor / Config:**

- Keine neuen Editor-Felder, kein neues `display`-Sub-Feld.
- Keine YAML-Schema-Änderung. Bestehende `icon`-Properties auf Solar/Battery/Grid/Home/Consumer bleiben in Funktion und Default-Verhalten.
- Keine Migration bestehender User-Configs nötig (additiv-werte-only).

**Render / Engine / Config-Data-Layer:**

- Engine bleibt unangetastet (ADR-0004).
- `config/`-Layer bleibt unangetastet (`deriveDisplayConsumers`, Schema-Validation).
- Keine Änderung an `format-power.ts` — Werte werden weiterhin in W ausgegeben, kein kW-Switch. (Eigene Subspec falls gewünscht.)
- Keine Änderung an Edge-Color-Logik (`edge-color.ts`).
- Keine Änderung an Animation (`flow-animation.ts`, Punkt-Geschwindigkeit, `prefers-reduced-motion`).
- Keine Änderung an Diagnostics-Icon-Geometrie (`flow-renderer.ts`).
- Keine Änderung an Home-Ring-Radius (`home-ring.ts`); Home bleibt visueller Anker mit Radius 50.

**Konfiguration / Tooling:**

- Keine neuen DevDeps.
- Keine neuen Lint-/ESLint-Regeln.
- Keine Änderungen an `tsconfig.json`, `vitest.config.ts`, `rollup.config.mjs`.
- Keine Änderung an `hacs.json` außer ggf. Version-Sync (wird in P8 geprüft).
- Keine neuen MDI-Imports in `@mdi/js` für die Sandbox — `mdi:home-battery` ist bereits im aktuellen `@mdi/js`-Bundle enthalten (devDep, nicht prod).

## 3. Architektur / Konkrete Änderungen

### 3.1 `src/render/icon.ts` — Default + Icon-Box

**Issue D (Battery-Default-Icon):**

```ts
export const DEFAULT_MDI_ICONS: Record<LayoutNode['kind'], string> = {
  pv: 'mdi:solar-power',
- battery: 'mdi:battery',
+ battery: 'mdi:home-battery',
  grid: 'mdi:transmission-tower',
  home: 'mdi:home',
  consumer: 'mdi:power-plug',
};
```

**Issue A + B (Icon-Geometrie):**

```ts
const NODE_ICON_BOX: Record<LayoutNode['kind'], IconBox> = {
- pv:       { size: 24, centerY:  -4, emojiFontSize: 22, emojiY:  -4 },
- battery:  { size: 24, centerY:  -4, emojiFontSize: 22, emojiY:  -4 },
- grid:     { size: 24, centerY:  -4, emojiFontSize: 22, emojiY:  -4 },
- home:     { size: 32, centerY: -10, emojiFontSize: 28, emojiY: -10 },
- consumer: { size: 18, centerY:   6, emojiFontSize: 18, emojiY:   6 },
+ pv:       { size: 24, centerY: -12, emojiFontSize: 22, emojiY: -12 },
+ battery:  { size: 24, centerY: -12, emojiFontSize: 22, emojiY: -12 },
+ grid:     { size: 24, centerY: -12, emojiFontSize: 22, emojiY: -12 },
+ home:     { size: 32, centerY: -16, emojiFontSize: 28, emojiY: -16 },
+ consumer: { size: 24, centerY:   0, emojiFontSize: 22, emojiY:   0 },
};
```

**Begründung pro Knoten-Typ:**

- **pv/battery/grid**: Icon centerY −4 → −12 verschiebt das Icon um 8 px nach oben. Mit `valueY=20` (neu) ergibt sich Icon-Bottom `−12 + 12 = 0`, Wert-Top `20 − 10 = 10` (cap-Höhe ≈ 0.7·14 = 10) → **10 px Spacing**.
- **home**: Icon centerY −10 → −16; mit `valueY=20` und Font 15 (unverändert) ergibt sich Icon-Bottom `−16 + 16 = 0`, Wert-Top `20 − 11 = 9` → **9 px Spacing**.
- **consumer**: Icon-Box wechselt von `size=18, centerY=6` (unten-versetzt, klein) auf `size=24, centerY=0` (zentriert, groß wie PV/Batt). Konsistenz mit Issue-B-Wahl C aus Brainstorming.
- **emojiFontSize/emojiY**: bleiben synchron zu `size/centerY`, weil sie der Emoji-Fallback-Pfad sind und denselben optischen Anker brauchen.

**Architektur-Prinzipien (verbindlich für Planer):**

| Prinzip                                  | Begründung                                                                                                               |
| ---------------------------------------- | ------------------------------------------------------------------------------------------------------------------------ |
| `icon.ts` bleibt **theme-agnostisch**    | Farbe kommt via `currentColor` aus dem Parent-`<g>` (ADR-0020 / Subspec 2026-05-13 §3.2). Werte-Update ändert das nicht. |
| `icon.ts` enthält **nur Icon-Geometrie** | `valueY`, `labelOffset`, `consumerLabelX` bleiben in `node-renderer.ts`. Spec verschiebt die Trennung nicht.             |
| Keine `RenderContext` in `icon.ts`       | Funktion-Signaturen bleiben (`kind`, `configuredIcon: string \| undefined`). Werte-Update ändert keine API.              |
| Werte sind **Datenstruktur**, nicht Code | `NODE_ICON_BOX[kind]` bleibt einfache Map-Lookup. Keine `if (kind === 'home')`-Verzweigungen einführen.                  |
| Spec-Code-Kommentare (`// alt: …`)       | **NICHT ins Prod-File übernehmen** — WHAT-Kommentar verboten (conventions.md §2). Werte selbst sind selbsterklärend.     |

### 3.2 `src/render/layout.ts` — Knoten-Radien + Arc-Konstanten

**Issue C:**

```ts
- const NODE_R_LARGE    = 50;
- const NODE_R_MEDIUM   = 34;
- const NODE_R_CONSUMER = 24;
- const NODE_R_GRID     = 32;
+ const NODE_R_LARGE    = 50;
+ const NODE_R_MEDIUM   = 42;
+ const NODE_R_CONSUMER = 28;
+ const NODE_R_GRID     = 40;
```

**`BOTTOM_Y`-Anpassung (margin-getrieben):**

Bei `NODE_R_MEDIUM = 42` und `BOTTOM_Y = 460` würde:

- Batt-Bottom-Edge: `460 + 42 = 502` → 38 px Margin zum viewBox-Boden (540)
- Batt-Label (`labelOffset = r + 22`): absolute y = `460 + 42 + 22 = 524`; mit Font 11 Baseline-zu-Bottom ≈ 4 → Text-Bottom ≈ 528 → 12 px Margin

12 px Margin ist akzeptabel (analog zu Subspec 2026-05-12 §1.4: Top-Edge-Margin = 12 px). **`BOTTOM_Y` bleibt 460**, **kein Edit**.

**`TOP_Y`-Prüfung:**

- PV-Top-Edge: `80 - 42 = 38` → 38 px Margin zum viewBox-Top (0)
- PV-Label (`labelOffset = -r - 16`): absolute y = `80 - 42 - 16 = 22`; mit Font 11 Cap-Höhe ≈ 8 → Text-Top ≈ 14 → 14 px Margin

→ **`TOP_Y` bleibt 80**, **kein Edit**.

**Consumer-Arc-Konstanten — Gap-Margin-Rechnung:**

Bei `NODE_R_CONSUMER = 28` (Diameter 56) und unveränderten Arc-Konstanten:

| N   | α-cap aktiv? | Step (°) | Center-Distanz (px)  | Gap zu Diameter 56 | Status                                    |
| --- | ------------ | -------- | -------------------- | ------------------ | ----------------------------------------- |
| 2   | nein         | 14       | `2·350·sin(7°)` = 85 | 29 px              | ✓ komfortabel                             |
| 3   | nein         | 14       | 85                   | 29 px              | ✓                                         |
| 4   | nein         | 14       | 85                   | 29 px              | ✓                                         |
| 5   | nein         | 14       | 85                   | 29 px              | ✓                                         |
| 6   | nein         | 14       | 85                   | 29 px              | ✓                                         |
| 7   | ja (42°)     | 14       | 85                   | 29 px              | ✓                                         |
| 8   | ja (42°)     | 12       | `2·350·sin(6°)` = 73 | 17 px              | ✓ knapp aber sicher (Margin > 15 px Goal) |

→ **`CONSUMER_ARC_MAX_DEG` und `CONSUMER_ARC_STEP_DEG` bleiben unverändert** (42° / 14°). **Beide Comment-Blöcke** in `layout.ts` müssen aktualisiert werden (Drift-Vermeidung — Lehre aus 2026-05-12-Spec §2.4.4):

**Block 1 — `layout.ts:41-43` (42°-Cap, Top-Edge-Margin):**

```ts
- // 42° cap: limited by viewBox-top margin (top consumer y = 36 → 12 px to
- // viewBox top y=0). PV/Akku collision is NOT the constraint — they sit at
- // x≈250/560 while consumers are at x≈740+, horizontally far apart.
+ // 42° cap: limited by viewBox-top margin (top consumer y = 36 → 8 px to
+ // viewBox top y=0 at r=28). PV/Akku collision is NOT the constraint — they sit at
+ // x≈250/560 while consumers are at x≈740+, horizontally far apart.
```

Begründung: bei r=28 ist Consumer-Top-Edge = `36 - 28 = 8` (vorher: `36 - 24 = 12`). Bottom-Edge symmetrisch: `540 - (270 + 234 + 28) = 8`. Beide Margins schrumpfen von 12 px auf 8 px — sicher, aber dokumentations-relevant.

**Block 2 — `layout.ts:45-47` (Adjacent-Gap):**

```ts
- // 14° step keeps adjacent center-to-center gap at 85 px (= 2·R·sin(7°)),
- // well above the 48 px consumer diameter, for N=2..7. At N=8 the cap kicks
- // in and gap shrinks to 73 px — still 25 px margin to diameter.
+ // 14° step keeps adjacent center-to-center gap at 85 px (= 2·R·sin(7°)),
+ // well above the 56 px consumer diameter, for N=2..7. At N=8 the cap kicks
+ // in and gap shrinks to 73 px — still 17 px margin to diameter.
```

**`consumerEdgePath`-Pfad-Tangente (`layout.ts:225-226`):**

```ts
const homeEdgeR = NODE_R_LARGE + 2; // = 52  (unverändert: NODE_R_LARGE bleibt 50)
const consEdgeR = NODE_R_CONSUMER + 2; // = 30  (war 26; automatisch durch Konstante)
```

`+2` als visueller Edge-Offset bleibt — KEIN expliziter Edit, weil die Konstante aus `NODE_R_CONSUMER` abgeleitet wird.

**Layout-Boundary-Test (`layout.test.ts:96-103`) — Magic-Number-Modernisierung:**

Heutige Tests assertieren PV/Akku-Radius hardcoded mit `32`:

```ts
expect(d).toBeGreaterThan(c.r + 32 + 4); // 4px breathing
```

Bei neuem `NODE_R_MEDIUM = 42` muss dieser Test-Block:

- entweder die hardcoded `32` durch `42` ersetzen (Single-Source-Verstoß, aber lokal sichtbar),
- oder den `NODE_R_MEDIUM`-Import nutzen — Test-File darf `layout.ts`-Konstanten lesen, was Single-Source bewahrt.

**Empfohlen (Single-Source-konform):** `NODE_R_MEDIUM` aus `layout.ts` exportieren (heute modul-private) und im Test importieren. Im Plan als Schritt explizit.

Alternative: `NODE_R_MEDIUM` privat lassen, Test-File hardcodiert `42` — akzeptabel, weil Test-Drift bei Konstanten-Update sofort durch Test-Failure auffliegt.

**Entscheidung in dieser Spec:** Konstante `NODE_R_MEDIUM` aus `layout.ts` **exportieren** (`export const NODE_R_MEDIUM`); Test importiert sie. Vorteil: zukünftige Werte-Updates ändern Test automatisch mit, kein „vergessenes" Test-Update.

**Zusätzlicher Kommentar-Drift-Fix in `layout.test.ts:96-97`:**

```ts
- // No physical circle overlap with PV (x=250/560, y=80, r=32)
- // or Akku (x=250/560, y=460, r=32) — consumers are far right (x>740).
+ // No physical circle overlap with PV (x=250/560, y=80, r=NODE_R_MEDIUM)
+ // or Akku (x=250/560, y=460, r=NODE_R_MEDIUM) — consumers are far right (x>740).
```

Begründung: Der Kommentar zeigt heute `r=32`, was bereits vor dieser Spec falsch ist (status-quo `NODE_R_MEDIUM = 34`). Mit Spec-Update auf `42` würde der Drift noch größer. **Bei der Gelegenheit korrigieren** — Kommentar zeigt die Konstante, nicht den Zahlenwert (selbst-aktualisierend).

### 3.3 `src/render/node-renderer.ts` — Text-Position + Font

**Issue A:**

```ts
// Line 55:
- const valueY = node.kind === 'home' ? 14 : 16;
+ const valueY = 20;  // einheitlich für alle Knoten mit innerem Wert

// Line 98 (Non-Consumer branch):
- <text class="node-value" text-anchor="middle" y="${valueY}" font-weight="700" font-size="${node.kind === 'home' ? 15 : 13}">
+ <text class="node-value" text-anchor="middle" y="${valueY}" font-weight="700" font-size="${node.kind === 'home' ? 15 : 14}">
```

**Begründung:**

- `valueY` ist heute kind-spezifisch nur wegen Home (`14` vs `16`). Mit neuer Icon-Position für Home (`centerY=-16`) und harmonisiertem Spacing kann `valueY` auf `20` vereinheitlicht werden.
- Font-Size für Non-Home Value 13 → 14: minimal größer, harmoniert besser mit größeren Kreisen (r=40/42) und vergrößertem Spacing.
- Home-Font bleibt 15 (Anker, optisch dominant).
- Consumer-Branch (Line 90, 93) bleibt unverändert: Text-Position außerhalb (`consumerLabelX = node.r + 8`) skaliert automatisch mit neuem `node.r = 28` (war 24).

### 3.4 `src/render/battery-ring.ts` — Ring nach außen

**Kollisions-Auflösung:**

Bei `NODE_R_MEDIUM = 42` (neu) und `RING_RADIUS = 42` (heute) würden Batterie-Kreis und SOC-Ring exakt aufeinander liegen — der SOC-Ring wäre unsichtbar.

```ts
- const RING_RADIUS = 42;
+ const RING_RADIUS = 50;  // 8 px außerhalb Batterie-Kreis (r=42) — entspricht Home-Ring (60-50=10 px)
  const STROKE_WIDTH = 6;
```

**Begründung der `50`:**

- Home-Ring sitzt 10 px außerhalb Home-Kreis (`r=60` vs `r=50`); Batt-Ring soll proportional ähnlich wirken: 8 px außerhalb Batt-Kreis (`r=50` vs `r=42`).
- Stroke-Width 6 bleibt — keine Veränderung der visuellen Dicke.
- Mit `STROKE_WIDTH = 6` reicht der Ring-Stroke von `r=47` (Innenkante) bis `r=53` (Außenkante). Batt-Kreis-Stroke endet bei `r=42 + 1.25 = 43.25` (`STROKE_WIDTH/2 = 1.25`). → 3.75 px Luft zwischen Kreis-Stroke-Außen und Ring-Stroke-Innen.

**Vertikal-Margin-Check für Batt-Ring:**

- Ring-Bottom absolute y = `460 + 53 = 513`
- viewBox-Bodenmargin = `540 - 513 = 27` px → komfortabel.

**Räumlich-Verifikation Home-Ring ↔ Batt-Ring (keine Kollision):**

- Home-Ring (`home-ring.ts:5` `RING_RADIUS = 60`, `RING_WIDTH = 9`): Stroke-Außenkante y = `270 + 60 + 4.5 = 334.5`
- Batt-Ring (neu): Stroke-Außenkante y = `460 - 50 - 3 = 407`
- → 72.5 px Luft zwischen beiden Ringen, keine Kollisionsgefahr.

→ Kein weiterer Layout-Edit nötig.

### 3.5 `src/const.ts` + `package.json` — Version-Sync

```ts
// src/const.ts:3
- export const CARD_VERSION = '0.12.0';
+ export const CARD_VERSION = '0.12.1';
```

```json
// package.json:3
- "version": "0.12.0",
+ "version": "0.12.1",
```

Patch-Bump, weil Änderungen visuell-only sind und Config-Schema sowie API stabil bleiben. **Beide Files müssen synchron** — `package.json:3` und `src/const.ts:3` zeigen dieselbe Version. HACS/Smoke-Test prüfen via `const.ts`; npm/repo via `package.json`. Plan-Schritt P8 enthält beide.

### 3.6 Code-Reuse-Tabelle (verbindlich)

Vorhandene Helper, die der Planer **wiederverwenden MUSS** statt neu zu schreiben (CLAUDE.md 2 + ADR-0010):

| Helper / Konstante                  | Wann verwenden                                                                                                                       | Datei                                  |
| ----------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------ | -------------------------------------- |
| `NODE_ICON_BOX[kind]`               | Icon-Box-Lookup pro Knoten-Typ                                                                                                       | `src/render/icon.ts:20`                |
| `DEFAULT_MDI_ICONS[kind]`           | Default-Icon-Lookup pro Knoten-Typ                                                                                                   | `src/render/icon.ts:5`                 |
| `NODE_R_LARGE/MEDIUM/CONSUMER/GRID` | Knoten-Radius-Konstante (Single-Source); `NODE_R_MEDIUM` wird `export` in dieser Spec                                                | `src/render/layout.ts:29-32`           |
| `RING_RADIUS`, `STROKE_WIDTH`       | Battery-Ring-Geometrie (modul-private bleiben; **Wert von `RING_RADIUS` ändert sich in §3.4**)                                       | `src/render/battery-ring.ts:3-4`       |
| `labelYOffset(node)`                | Außen-Label-Position pro Knoten-Kind (**unverändert**, automatisch durch geändertes `node.r` skaliert — Margin-Verifikation in §3.2) | `src/render/node-renderer.ts:149-161`  |
| `renderBatteryRing(soc, color)`     | SOC-Ring-Rendering (Funktion unverändert; nur interne Konstante `RING_RADIUS` ändert sich)                                           | `src/render/battery-ring.ts:7`         |
| `renderHomeRing(...)`               | Home-Ring-Rendering (unverändert)                                                                                                    | `src/render/home-ring.ts:9`            |
| `nodeIcon(kind, configIcon)`        | Icon-Rendering (unverändert)                                                                                                         | `src/render/icon.ts:37`                |
| `formatPowerW(value, opts)`         | Power-Wert-Formatierung (unverändert)                                                                                                | `src/util/format-power.ts:12`          |
| `bezierPath`, `straightPath`        | SVG-Pfad-Berechnung (unverändert)                                                                                                    | `src/util/svg-path.ts`                 |
| `serialize(template)` (Test-Helper) | Lit-SVGTemplateResult zu String — **wiederverwenden in neuem Ring-Test (§6.3)** statt Inline-`String.raw`                            | `src/render/battery-ring.test.ts:5-13` |

**Anti-Patterns (explizit zu vermeiden):**

1. ❌ Inline-Magic-Numbers für Radien in Tests (Single-Source-Verstoß, ADR-0010)
2. ❌ Re-Definition von `NODE_ICON_BOX`-Werten in anderen Files (Single-Source-Verstoß)
3. ❌ Spec-Kommentare (`// alt: …`, `// neu: …`) ins Prod-File übernehmen (WHAT-Kommentar, conventions.md §2)
4. ❌ `if (kind === 'home')`-Verzweigung in `icon.ts` einführen (Datentabellen-Prinzip verlassen)
5. ❌ `valueY` in `node-renderer.ts` als kind-spezifisches `switch` re-introducieren (jetzt einheitlich `20`)
6. ❌ Bestehende `icon`-Property-Resolution in Config ändern (Don't-Touch §0.4)
7. ❌ Neue CSS-Klassen in `card-styles.ts` einführen (Style bleibt CSS-Variable-basiert, ADR aus 2026-05-12)
8. ❌ Edges manuell anpassen für neue Radien — `bezierPath`/`straightPath` lesen `node.r` automatisch.

### 3.7 Layer-Boundary-Check

| Datei                         | Layer     | Neue Imports                   | Konformität     |
| ----------------------------- | --------- | ------------------------------ | --------------- |
| `src/render/icon.ts`          | `render/` | keine (nur Werte-Update)       | ✓               |
| `src/render/layout.ts`        | `render/` | keine                          | ✓               |
| `src/render/battery-ring.ts`  | `render/` | keine                          | ✓               |
| `src/render/node-renderer.ts` | `render/` | keine                          | ✓               |
| `src/render/layout.test.ts`   | `render/` | `NODE_R_MEDIUM` aus `./layout` | ✓ (intra-layer) |
| `src/render/icon.test.ts`     | `render/` | keine                          | ✓               |
| `src/const.ts`                | `util/`   | keine                          | ✓               |

Kein ESLint-Layer-Verstoß zu erwarten. `pnpm lint` MUSS Teil der Verifikations-Pipeline sein.

## 4. Datenfluss

Konkreter End-to-End-Pfad für eine PV-Anlage mit 4.077 W:

1. **HA-State-Update** → `card.hass = newHass`
2. **`shouldUpdate(prev, new)`** (`card.ts`, unverändert) → `true`
3. **`willUpdate()`** (`card.ts`, unverändert)
   1. `buildSystemState(config, hass)` → SystemState
   2. `engine.compute(state)` → FlowResult (`pvToHome[pv1] = 4077`)
   3. `computeLayout(config, displayConsumers)` → LayoutResult
      - PV-Node `r = 42` (war 34) ← **diese Spec ändert**
      - Edges berechnet mit neuem `node.r`
4. **`render()`** (`card.ts`, unverändert) → ruft `node-renderer.renderNode(pvNode, result, ctx)` auf
   1. `value = nodeValueText(pvNode, result, ctx)` → `'4.077 W'` (via `formatPowerW`)
   2. `nodeIcon('pv', undefined)` → `<foreignObject>` mit `width=24, height=24, x=-12, y=-12-12=-24, y-bottom=0` ← **diese Spec ändert centerY**
   3. SVG `<text class="node-value" y="20" font-size="14">4.077 W</text>` ← **diese Spec ändert y und font**
   4. Spacing zwischen Icon-Bottom (`0`) und Text-Top (`20 - 10 = 10`) = **10 px** ✓
5. **Browser rendert** Lit-Template → DOM-Update

Für die Akkus zusätzlich:

6. `renderBatteryRing(socPct, color)` → Ring auf `r=50` (war 42) ← **diese Spec ändert**

Für die Consumer-Knoten:

3'. `consumerNode.r = 28` (war 24); `consumerLabelX = node.r + 8 = 36` (war 32) — automatisch durch Konstante.
4'. `nodeIcon('consumer', undefined)` → `<foreignObject>` mit `width=24, height=24, x=-12, y=-12` (zentriert) ← **diese Spec ändert size+centerY**

## 5. Fehlerverhalten / Edge-Cases

- **Wert > 5 Stellen signed (`+99.999 W`, 9 Zeichen)**: passt in `r=40` Grid-Kreis bei Font 14. Bei `+999.999 W` (10 Zeichen) überläuft Text — aber das ist außerhalb realistischer HA-Power-Sensor-Range. Keine Spec-Aktion.
- **NaN-Wert (sensor unavailable)**: `formatPowerW(NaN)` → `'— W'` (2 Zeichen). Spacing bleibt komfortabel.
- **0-Wert**: `formatPowerW(0)` → `'0 W'` (3 Zeichen). Spacing bleibt komfortabel.
- **User-konfigurierter Battery-Icon ungleich `mdi:battery`**: Default-Wechsel betrifft nur User, die kein `icon:`-Feld gesetzt haben. User-Configs mit `icon: mdi:battery-high` etc. bleiben unverändert (resolution in `nodeIcon` priorisiert `configuredIcon ?? DEFAULT_MDI_ICONS[kind]`).
- **User-konfigurierter Battery-Icon = `mdi:battery` (alter Default)**: User wollte explizit das alte Default — bekommt es weiterhin durch explizite Config. Kein Migrationsproblem.
- **Emoji-Icon-Fallback** (`icon: '🔋'`): nutzt `emojiFontSize`/`emojiY`-Werte aus `NODE_ICON_BOX`. Spec hält diese synchron zu `size`/`centerY`.
- **8 Consumer-Knoten (N=8-Cap)**: Gap zwischen adjacent Consumern shrinkt von 25 px (alt) auf 17 px (neu, weil Consumer-Diameter 48→56 wächst). Margin > 15 px Mindest-Goal aus §2.1. Test-Assertion in `layout.test.ts:118-127` ist mit `> r·2 + 4 px breathing` aktuell — bleibt erfüllt (`17 > 4`).
- **Animation während Wert-Update**: keine Animation-Logik berührt; CSS-Animations laufen unverändert.

## 6. Tests

### 6.1 `src/render/icon.test.ts` — Default-Icon + Consumer-Size

**Anpassungen am bestehenden File:**

```ts
// Test "renders default icon for kind %s → %s" (Line 18-26):
- ['battery', 'mdi:battery'],
+ ['battery', 'mdi:home-battery'],

// Test "foreignObject for home has size 32, consumer 18, default 24" (Line 42-52):
- const flatConsumer = flatten(nodeIcon('consumer', undefined));
- expect(flatConsumer).toMatch(/width="18"/);
+ const flatConsumer = flatten(nodeIcon('consumer', undefined));
+ expect(flatConsumer).toMatch(/width="24"/);

// Test-Name aktualisieren:
- 'foreignObject for home has size 32, consumer 18, default 24'
+ 'foreignObject for home has size 32, consumer 24, default 24'
```

**Neuer Test (Spacing-Verifikation, TDD-getrieben):**

```ts
it.each([
  // Spacing-Geometrie: Icon-Bottom (centerY + size/2) muss < Wert-Top (valueY - cap-height) sein
  // mit mind. 8 px Margin.
  ['pv', 24, -12, 20, 14], // icon-bottom=0,  text-top=20-10=10 → 10 px ✓
  ['battery', 24, -12, 20, 14], // gleich
  ['grid', 24, -12, 20, 14], // gleich
  ['home', 32, -16, 20, 15], // icon-bottom=0,  text-top=20-11=9  → 9 px ✓
] as const)('spacing icon-bottom ↔ value-top ≥ 8 px (%s)', (_, size, centerY, valueY, fontSize) => {
  const iconBottom = centerY + size / 2;
  const capHeight = fontSize * 0.7;
  const textTop = valueY - capHeight;
  const spacing = textTop - iconBottom;
  expect(spacing).toBeGreaterThanOrEqual(8);
});
```

**Begründung Spacing-Test:** Erzwingt, dass künftige Werte-Tweaks die Mindest-Spacing-Grenze nicht unterschreiten. Test lebt in `icon.test.ts`, weil Icon-Geometrie der bestimmende Faktor ist; `valueY`+`fontSize` werden als Daten in Test-Param mitgegeben (kein Import aus `node-renderer.ts` nötig).

### 6.2 `src/render/layout.test.ts` — Radien + Arc

**Anpassungen am bestehenden File:**

```ts
// Test "places grid at (60, 270)" (Line 34-38):
-expect(grid).toMatchObject({ x: 60, y: 270, r: 32 });
+expect(grid).toMatchObject({ x: 60, y: 270, r: 40 });

// Test "battery aligns to paired PV x" (Line 62-75) — y=460 bleibt:
expect(b1?.y).toBe(460);
// KEIN Change — BOTTOM_Y bleibt unverändert.

// Test "consumer arc N=%d" (Line 86-106) — PV/Akku-Radius-Magic-Number:
-expect(d).toBeGreaterThan(c.r + 32 + 4); // 4px breathing
+expect(d).toBeGreaterThan(c.r + NODE_R_MEDIUM + 4); // 4px breathing
// mit Import: import { computeLayout, NODE_R_MEDIUM } from './layout';

// Test "N=8 consumers stay clear of each other (min gap 4 px)" (Line 118-127):
// Aktuell: c.r * 2 + 4 = 28*2+4 = 60 px Mindest-Center-Distanz
// Neuer Gap bei N=8: 73 px → 73 > 60 ✓ bleibt erfüllt; KEIN Test-Edit.
```

**Neuer Test (Consumer-Diameter bei N=8 mit neuem r):**

```ts
it('N=8: adjacent consumer gap ≥ 15 px clearance (post-r=28 update)', () => {
  const layout = computeLayout(baseConfig(), mkDisplayConsumers(8));
  const consumers = layout.nodes.filter((n) => n.kind === 'consumer');
  expect(consumers).toHaveLength(8);
  // noUncheckedIndexedAccess: array access yields T | undefined → assert non-null
  const c0 = consumers[0]!;
  const c1 = consumers[1]!;
  // adjacent gap = center-distance - 2*r
  const adjGap = Math.hypot(c0.x - c1.x, c0.y - c1.y) - 2 * c0.r;
  expect(adjGap).toBeGreaterThanOrEqual(15);
});
```

**Hinweis:** `!`-Non-Null-Assertion verboten durch `@typescript-eslint/no-non-null-assertion` (`.eslintrc.cjs:35`) — **außer in `*.test.ts`-Files**, wo `override` die Regel deaktiviert (`.eslintrc.cjs:55-60`). `!` ist hier zulässig. Test-Length-Assertion vorab garantiert die Array-Existenz semantisch.

**Test-Style-Hinweis (Drift-Vermeidung):** `layout.test.ts:118-127` (bestehender N=8-Min-Gap-Test) nutzt `consumers[i].x` ohne `?.`/`!`. Bei Vitest+esbuild läuft das, weil `tsconfig.json:22` Test-Files vom `tsc`-Check exkludiert. **Style-Konsistenz im selben File ist wünschenswert, aber kein Hard-Constraint** — der bestehende Test bleibt unangetastet (Don't-Touch). Der neue Test in §6.2 setzt das `!`-Pattern als Vorbild für künftige Test-Erweiterungen.

### 6.3 `src/render/battery-ring.test.ts` — Ring-Radius

**Verbindlicher Edit (Blocker bei RING_RADIUS-Update):**

`battery-ring.test.ts:19-20` asseriert die `stroke-dasharray`-Werte für SOC=50 %:

```ts
// For 50%: dasharray = (2π·42 · 0.5) ≈ 131.95 131.95
expect(out).toMatch(/131\.\d+ 131\.\d+/);
```

Die Zahl `131` ist `2π·42·0.5 ≈ 131.95`. Bei neuem `RING_RADIUS = 50` wird der Wert zu `2π·50·0.5 ≈ 157.08`. Der Test bricht ohne Update sofort.

**Pflicht-Update:**

```ts
-(
  // For 50%: dasharray = (2π·42 · 0.5) ≈ 131.95 131.95
  (-expect(out).toMatch(/131\.\d+ 131\.\d+/))
);
+(
  // For 50%: dasharray = (2π·50 · 0.5) ≈ 157.08 157.08
  (+expect(out).toMatch(/157\.\d+ 157\.\d+/))
);
```

**Neuer Test (Ring-Geometrie — Single-Source-Verifikation):**

`battery-ring.test.ts:5-13` definiert bereits einen `serialize()`-Helper. Neuer Test nutzt diesen statt Inline-`String.raw`:

```ts
it('ring radius is outside battery circle r=42 (no overlap)', () => {
  const out = serialize(renderBatteryRing(50, '#16a34a'));
  expect(out).toMatch(/r="50"/); // RING_RADIUS = 50
});
```

### 6.4 Sandbox / manuelle Verifikation

**Schritte für `pnpm preview` (in `examples/preview.html`):**

1. Lade Default-Szenario (multi-source: 2 PV + 2 Batt + N Consumer).
2. **Verifiziere Issue A:** zwischen Solar/Akku/Grid-Icon und Wert sind ≥ 8 px Abstand sichtbar.
3. **Verifiziere Issue B:** Consumer-Icon wirkt jetzt deutlich größer als vorher (Diameter 24 vs 18); Name+Wert rechts unverändert.
4. **Verifiziere Issue C:** Setze Sandbox-Werte auf 5-stellige Werte. **Zwei Optionen:**
   - **Option A (empfohlen):** Temporäres Scenario in `examples/preview-mocks.ts` mit `'sensor.grid_power': { state: '-12345', attributes: wAttrs }`, `'sensor.pv1_power': { state: '12345', ... }`, `'sensor.batt1_power': { state: '9999', ... }`. Nach Verifikation rückbauen oder als „edge-case-extreme-values"-Scenario behalten.
   - **Option B:** DevTools Browser Console — `document.querySelector('custom-energy-flow-card').hass.states['sensor.grid_power'].state = '-12345'` + Reload-Trigger. Live, ohne File-Edit.
   - Erwartung: Text `-12.345 W` (9 Zeichen) passt im r=40-Grid-Kreis ohne Überlauf.
5. **Verifiziere Issue D:** Lade Config ohne `icon:` auf Battery — sieht jetzt `mdi:home-battery` (Akku-mit-Haus-Silhouette).
6. **Verifiziere Battery-Ring:** Ring sitzt sichtbar außerhalb Batt-Kreis (3–4 px Luft).
7. **Verifiziere bei N=8 Consumer:** Adjacent-Gap zwischen Consumern visuell ≥ 15 px.

**Pre-Release-Smoke-Test (ADR-0012):** unverändertes Script-File; muss mit neuen Werten grün laufen.

### 6.5 Coverage

`vitest.config.ts`-Coverage-Include bleibt unverändert. **Wichtig:** `vitest.config.ts:14` definiert `include: ['src/engine/**', 'src/config/**', 'src/util/**']` — `src/render/**` ist **nicht** im Coverage-Threshold (90 % statements/branches/functions/lines). Render-Layer wird zwar getestet (Tests existieren in `icon.test.ts`, `layout.test.ts`, `battery-ring.test.ts`), aber Coverage wird nicht erzwungen.

**Coverage-Ziel dieser Spec:**

- Engine/Util/Config bleiben bei ≥ 90 % (kein Edit in diesen Layern, daher Coverage unverändert).
- Render-Layer-Tests dürfen nicht regredieren: alle bestehenden Asserts müssen nach Edits weiter grün sein; neue Asserts (Spacing-Test §6.1, Adjacent-Gap-Test §6.2, Ring-Geometrie §6.3) decken die geänderten Geometrie-Punkte explizit ab.
- **Keine Erweiterung von `coverage.include` in dieser Spec** — separate Entscheidung; out-of-scope (§9.2).

## 7. Auswirkung auf Doku

Per `conventions.md §12 Doku-Pflicht`:

**Hauptspec `docs/specs/2026-05-10-custom-energy-flow-card-design.md`:**

- **Zeile 730 — Default-Icon-Tabelle:** `| Akku | mdi:battery |` → `| Akku | mdi:home-battery |` (Issue D — sonst Drift nach Implementation). Alternativ: Hinweis-Block direkt vor der Tabelle „Default-Icon für Akku wurde in Subspec 2026-05-15 auf `mdi:home-battery` aktualisiert".
- Sonst kein Edit — Hauptspec beschreibt nicht-numerische Konzepte (Module-Layer, Lifecycle, Render-Pipeline). Konkrete Maßzahlen leben in den Subspecs.

**Subspec `docs/specs/2026-05-13-icons-and-editor-ids.md` — zwei Stellen:**

1. **Zeile 217 — Default-Icons-Liste** (`Default-Icons pro Knoten-Kind … (mdi:solar-power, mdi:battery, …)`): Hinweis-Block davor: „NB: `mdi:battery` wurde in Subspec 2026-05-15 auf `mdi:home-battery` aktualisiert".
2. **Zeile 312 — `DEFAULT_MDI_ICONS`-Code-Block** (`battery: 'mdi:battery',`): Hinweis-Block am Anfang des Code-Blocks: „NB: `battery`-Default + `NODE_ICON_BOX`-Werte aktualisiert in docs/specs/2026-05-15-icon-positionierung-und-kreis-skalierung.md".
3. **Zeilen 462, 690, 759:** Test-Beispiele für Stub-Mapper, `mdi:battery` als VALID-MDI-Name (nicht „der Default"). **Kein Edit** — bleiben funktional korrekt.

**Subspec `docs/specs/2026-05-12-aspect-ratio-redesign.md`:**

- §1.2-Tabelle (`NODE_R_*` alle Knoten-Radien unverändert): Hinweis-Block dass die ursprünglich „unveränderten" Werte in dieser Spec geändert werden. Cross-Reference.

**`docs/architecture.md`:**

- §2 (Layer-Tabelle): kein Edit — kein neuer Layer/Modul.
- §4 (ADR-Tabelle): ADR-0017 Cross-Reference auf diese Subspec (Consumer-Radius-Update).

**`docs/adr/0017-adaptive-svg-layout.md`:**

- §"Entscheidung"/„Werte": Consumer-Radius `24 → 28`. Adjacent-Gap-Margin-Tabelle aktualisieren (von „25 px bei N=8" auf „17 px bei N=8 mit r=28").
- §"Konsequenzen": Hinweis dass Battery-Ring-Radius mit Knoten-Radius gekoppelt ist.

**`docs/adr/0020-ha-icon-via-foreignobject.md`:**

- Cross-Reference: Icon-Box-Werte werden in dieser Subspec überarbeitet. Kein Edit am ADR-Inhalt selbst.

**`docs/adr/0010-shared-util-module.md`:**

- Cross-Reference: `NODE_R_MEDIUM` wird jetzt aus `layout.ts` exportiert (war bisher modul-private). Beispiel-Liste in ADR-0010 §"Single-Source" um diese Konstante erweitern (optional, falls die Liste konkret ist).

**`docs/adr/README.md` (ADR-Index):**

- Kein Edit (keine neuen ADRs).

**`CLAUDE.md`:**

- Kein Edit nötig — Tech-Stack/Module-Layer unverändert.

**`README.md`:**

- Changelog-Eintrag für v0.12.1:
  ```
  ## 0.12.1 — 2026-05-15
  - Icon-Positionierung in den Knoten-Kreisen vergrößert (10 px Spacing zwischen Icon und Wert)
  - PV/Batterie/Grid-Kreise vergrößert für 4–5-stellige Werte (z. B. -12.345 W)
  - Consumer-Icon vergrößert (18 → 24 px)
  - Battery-Ring sitzt jetzt außerhalb des Batterie-Kreises (RING_RADIUS 42 → 50)
  - Default-Icon für Batterie: `mdi:battery` → `mdi:home-battery`
  ```

## 8. ADR (kein neuer ADR nötig)

**Begründung:** Keine neuen Architektur-Konzepte. ADR-0017 erhält Werte-Update (in §7 oben dokumentiert), ADR-0020 bleibt strukturell gültig. Single-Source-Prinzip (ADR-0010) wird durch Export von `NODE_R_MEDIUM` aktiv eingehalten — kein neuer Beschluss nötig.

## 9. UX-Verhalten und Out-of-Scope

### 9.1 UX-Verhalten (was der User sieht/erlebt)

- **Visuell:** Knoten-Kreise (PV/Batt/Grid/Consumer) wirken **größer und luftiger**. Wert-Text und Icon haben sichtbar Abstand; nichts mehr „gequetscht".
- **Konsistenz:** Alle inneren-Wert-Knoten (Home + PV + Batt + Grid) folgen jetzt demselben Spacing-Schema. Vorher war Home subtle anders (kleinerer Gap zwischen Icon und Wert).
- **Default-Icon:** User ohne `icon:`-Property auf Batterie sehen ab 0.12.1 ein **Heimakku-Icon** statt eines leeren Akku-Outline. Wahrnehmung: „endlich ein erkennbares Symbol".
- **Migration:** User mit explizit gesetztem `icon: mdi:battery` behalten ihr leeres Outline (Choice-Respekt).
- **Edge-Geometrie:** Edges (Pfeile/Verbindungslinien) ziehen sich automatisch an die neuen Kreis-Radien an. Visuell: minimal andere Tangenten-Winkel an PV/Batt/Grid (Edge sitzt auf größerem Kreis-Rand).
- **A11y:** `aria-label` und Tab-Order unverändert. Screen-Reader-Erlebnis identisch.
- **Bestehende Configs:** keine Migration nötig. YAML-Schema unverändert.
- **HACS-Update:** als Patch-Release (0.12.0 → 0.12.1) sichtbar im HACS-Update-Dialog mit Changelog-Diff.

### 9.2 Out-of-Scope

- **kW-Format-Switch:** `format-power.ts` zeigt weiterhin W mit Tausenderpunkt. Bei `> 9999 W` keine automatische Umstellung auf `kW`. → eigene Subspec falls gewünscht, v1.x-Kandidat.
- **Default-Icon-Review für andere Knoten** (Solar/Grid/Home/Consumer): nur Battery wurde vom User gemeldet. → ggf. künftige Spec mit Visual-Companion-Review.
- **Dynamisches Kreis-Resizing pro Wert-Länge** (Brainstorming-Variante C): bewusst abgelehnt — Knoten würden bei Wert-Sprüngen visuell wackeln.
- **Consumer-Layout uniform machen** (Brainstorming-Variante B mit Wert-innen): bewusst abgelehnt — Wert-innen hätte Platzprobleme bei langen Werten.
- **Editor-Banner „Du nutzt noch alten Default":** Nicht nötig — alter Default ist semantisch gültig, kein Bug. User mit eigenem Icon merken nichts.

## 10. Risiken

Sortiert nach Schwere (Wahrscheinlichkeit × Auswirkung), absteigend:

| Risiko                                                                                      | Wahrscheinlichkeit | Auswirkung                          | Mitigation                                                                                                                                                                                                                                                            |
| ------------------------------------------------------------------------------------------- | ------------------ | ----------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Battery-Ring-Kollision (RING_RADIUS=42 ↔ NODE_R_MEDIUM=42)                                  | **hoch**           | SOC-Ring unsichtbar; Regression     | P4 explizit: Ring-Radius 42→50 mit Test-Assertion (§6.3)                                                                                                                                                                                                              |
| Consumer-Arc-Gap bei N=8 unter Mindest-Margin                                               | niedrig            | Visueller Overlap                   | Berechnet in §3.2 (17 px Luft > 15 px Goal). Test in §6.2 erzwingt Verifikation.                                                                                                                                                                                      |
| Bundle wächst über 60 kB                                                                    | niedrig            | CI bricht                           | Werte-Updates sind volumen-neutral. P8 verifiziert `pnpm build:analyze`.                                                                                                                                                                                              |
| Pre-Release-Smoke-Test rot wegen Geometrie-Drift                                            | niedrig            | Release verzögert                   | P7 vor P8; STOP bei Failure                                                                                                                                                                                                                                           |
| Test-Single-Source-Verstoß (Magic-Number `32` bleibt)                                       | mittel             | Test-Drift unbemerkt                | §3.2 erzwingt Export `NODE_R_MEDIUM`; Test importiert (§6.2)                                                                                                                                                                                                          |
| Spec-Code-Kommentare als WHAT-Kommentar im Prod-File                                        | mittel             | conventions §2 Verletzung           | §3.1 Architektur-Prinzipien explizit: Kommentare NICHT übernehmen                                                                                                                                                                                                     |
| `home-battery` MDI nicht in @mdi/js-Bundle                                                  | niedrig            | Sandbox-Render fehlt                | `mdi:home-battery` ist seit MDI 7.0+ standard. `@mdi/js@^7.4.47` ist devDep (`package.json:22`) — verifizieren als ersten Sub-Schritt von **P3** (icon.ts-Update) via `pnpm list @mdi/js` + `node -e "import('@mdi/js').then(m => console.log(!!m.mdiHomeBattery))"`. |
| `RING_RADIUS`-Namens-Kollision zwischen `home-ring.ts` (=60) und `battery-ring.ts` (=42→50) | mittel             | Globales Sed/Refactor trifft beiden | Plan-Schritt P5 MUSS file-spezifisch editieren (`src/render/battery-ring.ts:3`), nicht via `grep -l RING_RADIUS \| xargs sed`. Test-Asserts in `home-ring.test.ts` müssen weiter grün sein.                                                                           |

### 10.1 Battery-Ring-Kollision — Verschärfter Risiko-Block

**Detail-Analyse:**

`battery-ring.ts:3` definiert `RING_RADIUS = 42`. Heute sitzt das auf 8 px außerhalb von `NODE_R_MEDIUM = 34` (zentriert in `<g transform="translate(${node.x} ${node.y})">`). Bei `NODE_R_MEDIUM = 42` würden Ring (`r=42`) und Kreis-Stroke (`r=42 ± 1.25`) exakt aufeinander liegen — Ring würde komplett vom Kreis-Stroke überlagert.

**Verifikations-Schritt:** Im Plan vor anderen Edits (P0 oder erstes P1-Sub-Task):

1. `pnpm test` mit Status-quo grün halten.
2. Sandbox laden (`pnpm preview`), Battery-Ring sichtbar verifizieren.
3. Mit P3 (Radius 34→42) zusammen P4 (Ring 42→50) ausführen — beide in **einem Commit** (atomares Update).
4. Tests in `battery-ring.test.ts` erweitern (§6.3) — Geometrie-Assertion.

**Workaround-Strategie:** Falls Ring-Radius 50 visuell zu weit außen wirkt: Fallback auf 48 oder 47.

**Konkretes Trigger-Kriterium für Fallback** (in Sandbox-Schritt P7 prüfen):

- Ring-Außenkante (`y = node.y + RING_RADIUS + STROKE_WIDTH/2 = 460 + 50 + 3 = 513`) zum Batt-Label-Top: `labelOffset = r + 22 = 64` → Label-Top absolute y = `460 + 64 - 8 = 516` (Font 11 Cap ≈ 8).
- **Aktuelle Luft Ring-Außen zu Label-Top: `516 - 513 = 3 px`** — visuell knapp.
- Trigger für Fallback: **wenn Ring-Außenkante im Sandbox optisch das Label berührt oder überlappt**, RING_RADIUS auf 48 zurückstellen (Außenkante y=511 → 5 px Luft).

## 11. Erfolgs-Kriterien

- [ ] **Funktional:** Spacing Icon-Bottom ↔ Wert-Top ≥ 8 px für alle Knoten mit innerem Wert (verifiziert per Test in `icon.test.ts`).
- [ ] **Funktional:** PV/Batt-Kreise zeigen Werte bis `+99.999 W` ohne Text-Überlauf (Sandbox-Verifikation).
- [ ] **Funktional:** Grid-Kreis zeigt Werte bis `-99.999 W` ohne Text-Überlauf.
- [ ] **Funktional:** Consumer-Icon ist im DOM 24 px breit/hoch (Test in `icon.test.ts`).
- [ ] **Funktional:** Battery-Default-Icon = `mdi:home-battery` (Test in `icon.test.ts`).
- [ ] **Funktional:** Battery-Ring sitzt sichtbar außerhalb Batt-Kreis (Sandbox-Verifikation).
- [ ] **Geometrie:** Adjacent-Consumer-Gap bei N=8 ≥ 15 px (Test in `layout.test.ts`).
- [ ] `pnpm test` grün
- [ ] `pnpm check` grün (lint + typecheck + tests)
- [ ] `pnpm build` produziert Bundle ≤ 60 kB minified
- [ ] `pnpm build:analyze` zeigt keine neuen Module-Größen
- [ ] **Test-Coverage:** Engine/Util/Config bleiben ≥ 90 % (Provider-Include unverändert; `src/render/**` ist nicht im Coverage-Include — siehe §6.5). Alle bestehenden Render-Layer-Asserts in `icon.test.ts`, `layout.test.ts`, `battery-ring.test.ts` bleiben grün; neue Asserts (Spacing §6.1, Adjacent-Gap §6.2, Ring-Geometrie §6.3) müssen grün sein.
- [ ] **Single-Source-Check:** Nach Plan-Ausführung sollte `grep -rn "32" src/render/` keine `32`-Magic-Number-Verwendung als PV/Akku-Radius mehr zeigen — auch nicht in Comment-Blöcken (`layout.test.ts:96-97` wird durch §3.2 von `r=32` auf `r=NODE_R_MEDIUM` umgestellt; `layout.ts:32` `NODE_R_GRID = 32` bleibt mit `40` ersetzt). Einzig erlaubt: `32` als ViewBox-Margin oder unbenutzte historische Strings.
- [ ] **Unverändert-Check:** `git diff` zeigt KEINE Änderungen an `engine/`, `config/`, `ha/`, `i18n/`, `editor*.ts`, `card.ts`, `card-helpers.ts`, `card-styles.ts`.
- [ ] **Doku-Cross-References:**
  - [ ] README v0.12.1-Changelog-Eintrag
  - [ ] ADR-0017 Werte-Update (Consumer-Radius, Arc-Gap-Margin)
  - [ ] Subspec 2026-05-13 Cross-Reference im NODE_ICON_BOX-Code-Snippet
  - [ ] Subspec 2026-05-12 Cross-Reference in §1.2 NODE_R-Tabelle
- [ ] **Screenshot regeneriert:** `docs/screenshots/Screenshot 2026-05-14 112950.png` durch neuen Screenshot ersetzt oder daneben gestellt.
- [ ] **Pre-Release-Smoke-Test grün** (ADR-0012).

## 12. Plan-Schritte (Reihenfolge mit Begründung)

Atomare Schritte mit TDD-First-Pattern (CLAUDE.md 9). Phase-Bezeichnung `P1..P10` (ab 1, Template-konform).

1. **P1 — Sandbox-Status-quo-Verifikation** (Pre-Edit-Gate):
   - `pnpm test` grün halten.
   - `pnpm preview` laden, Battery-Ring sichtbar verifizieren, optionalen Status-quo-Screenshot zur Vergleichs-Referenz **lokal** ablegen (NICHT committen, nicht in `docs/screenshots/`).
   - Begründung: Vor Mehrfach-Edit garantieren, dass Baseline grün ist.

2. **P2 — Tests anpassen (TDD-rot)**:
   - `src/render/icon.test.ts`: Default-Battery-Assertion + Consumer-Size-Assertion + neuer Spacing-Test (§6.1)
   - `src/render/layout.test.ts`: Grid-Radius-Assertion + Magic-Number-Modernisierung mit `NODE_R_MEDIUM`-Import + Kommentar-Update `r=32` → `r=NODE_R_MEDIUM` in Lines 96-97 + neuer N=8-Gap-Test (§6.2)
   - `src/render/battery-ring.test.ts`: **Pflicht**-Update der dasharray-Regex `/131\.\d+ 131\.\d+/` → `/157\.\d+ 157\.\d+/` (Line 20) + Kommentar-Update Line 19 + neuer Ring-Radius-Test (§6.3)
   - Begründung: Tests rot vor Implementation; CLAUDE.md §9.
   - **Hinweis:** Nach P2 ist `pnpm test` ROT. Das ist gewollt. Erst nach P6 ist `pnpm test` wieder grün. **Zwischen P2 und P6 KEIN `pnpm check`-Gate.**

3. **P3 — `icon.ts`-Update** (Battery-Default + NODE_ICON_BOX):
   - **Pre-Check (MDI-Verfügbarkeit, §10 Risiko):** `pnpm list @mdi/js` zeigt `^7.4.47+` UND `node -e "import('@mdi/js').then(m => console.log(!!m.mdiHomeBattery))"` druckt `true`. Bei Failure STOP.
   - `DEFAULT_MDI_ICONS.battery` → `'mdi:home-battery'`
   - `NODE_ICON_BOX` Werte gemäß §3.1
   - Verifikation: `pnpm test src/render/icon.test.ts` grün.
   - Begründung: Erstes Implementation-File; isoliert testbar.

4. **P4 — `layout.ts`-Update** (NODE*R*\*, Export, Comment-Blöcke):
   - `NODE_R_MEDIUM = 42` (+ `export`-Schlüsselwort)
   - `NODE_R_CONSUMER = 28`, `NODE_R_GRID = 40`
   - Comment-Block 1 (`layout.ts:41-43`): „12 px to viewBox top" → „8 px to viewBox top y=0 at r=28"
   - Comment-Block 2 (`layout.ts:45-47`): „48 px consumer diameter" → „56 px"; „25 px margin" → „17 px"
   - Verifikation: `pnpm test src/render/layout.test.ts` grün.
   - Begründung: Single-Source der Radien — von hier ziehen alle Edge-Tangenten automatisch.

5. **P5 — `battery-ring.ts`-Update** (RING_RADIUS 42 → 50):
   - Atomar mit P4 in **einem Commit**, weil sonst SOC-Ring temporär unsichtbar.
   - Verifikation: `pnpm test src/render/battery-ring.test.ts` grün.
   - Begründung: Kollisions-Auflösung (§3.4); Hoch-Risiko-Schritt (§10.1).

6. **P6 — `node-renderer.ts`-Update** (`valueY = 20`, Font 13→14):
   - Verifikation: `pnpm test` voll grün.
   - Begründung: Letzte Mosaik-Stück für Issue A.

7. **P7 — Sandbox-Verifikation**:
   - `pnpm preview` mit Default-Config sowie 5-stelligen Werten (`gridPower: -12345`, `batt1Power: 9999`, `pv1Power: 12345`).
   - 4 Issues nach §6.4-Checkliste durchgehen.
   - Begründung: visuelle Verifikation vor Release.

8. **P8 — Screenshots regenerieren + Smoke-Test**:
   - `docs/screenshots/` neu mit Browser-Screenshot von `pnpm preview` (alle relevanten Szenarien: individual + by_area).
   - Pre-Release-Smoke-Test (`pnpm smoke` / `ADR-0012`-Script) ausführen.
   - Begründung: Doku-Pflicht + Release-Gate.

9. **P9 — Version-Bump + Bundle-Check**:
   - `src/const.ts:3`: `CARD_VERSION = '0.12.1'`
   - `package.json:3`: `"version": "0.12.1"` (Sync)
   - `hacs.json`: **kein Version-Field vorhanden** (verifiziert via `grep version hacs.json` leer) — kein Edit nötig. HACS liest Versionen aus git-Tags.
   - `pnpm build:analyze` → Bundle ≤ 60 kB verifizieren.
   - Begründung: Release-Vorbereitung.

10. **P10 — Doku-Updates**:
    - `README.md` Changelog-Eintrag (§7)
    - `docs/adr/0017-adaptive-svg-layout.md` Werte-Update
    - Cross-Reference-Blöcke in Subspecs 2026-05-12 und 2026-05-13
    - Begründung: conventions §12 Doku-Pflicht.

Erwarteter Gesamtumfang: 10 Plan-Schritte (1 Vorab-Gate, 5 Implementation, 1 Visual-Verifikation, 1 Screenshots+Smoke, 1 Release-Prep, 1 Doku).

**Kritische Abhängigkeit:** P4 und P5 MÜSSEN in einem Commit erfolgen (Battery-Ring-Kollision). Andere Edits sind unabhängig.

**Empfohlene Commit-Granularität:**

| Commit                                                                                                                       | Phasen                                          |
| ---------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------- |
| 1. `test(render): assert new icon-box + node-radii + battery-ring radius`                                                    | P2                                              |
| 2. `feat(render): enlarge node circles, reposition icons, fix battery-ring overlap`                                          | P3 + P4 + P5 + P6 (atomar wegen Ring-Kollision) |
| 3. `chore(util): bump version to 0.12.1` + `docs(readme): regenerate screenshots + changelog 0.12.1` (zwei separate Commits) | P8 + P9                                         |
| 4. `docs(adr,specs,readme): cross-reference icon-positioning subspec + ADR-0017 update`                                      | P10                                             |

`pnpm check` MUSS zwischen den Commits jeweils grün sein.
