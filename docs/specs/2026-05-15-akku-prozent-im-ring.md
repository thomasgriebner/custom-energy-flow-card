# Subspec — Akku-SoC-Prozentwert im verbreiterten Ring

**Status:** v4 (post-subagent-5-konsolidierung, ready for user)
**Datum:** 2026-05-15
**Autor:** Brainstorming-Session mit @griebner
**Verlinkte Hauptspec:** [`2026-05-10-custom-energy-flow-card-design.md`](./2026-05-10-custom-energy-flow-card-design.md)
**Verlinkte Subspec(s):** [`2026-05-15-icon-positionierung-und-kreis-skalierung.md`](./2026-05-15-icon-positionierung-und-kreis-skalierung.md) (zuletzt geänderte Battery-Geometrie — `NODE_R_MEDIUM=42`, SoC-Ring r=50 mit stroke=6; wird in dieser Spec teilweise abgelöst)
**Berührte ADRs:** 0010 (Single-Source-Util — anwenden), 0012 (Smoke-Test — durchlaufen)
**Neuer ADR benötigt:** nein (reines Visual-Polish, keine Layer-/Lib-/Algorithmus-Änderung)

## 0. Zusammenfassung

Heute zeigt der Akku-Node den Ladestand visuell als Ring um den Akku-Kreis, aber **ohne numerischen %-Wert** — der User sieht „etwa 70 %", liest aber nicht den exakten Wert. Diese Subspec ergänzt den Wert als SVG-Text **im farbigen Ring-Stroke selbst**, oben-links auf der 10:30-Uhr-Position, tangential zum Ring rotiert.

Dafür wird der Ring-Stroke von **6 px auf 14 px** verbreitert (Radius r=50 bleibt unverändert), und ein neuer `<text>`-Block rendert den gerundeten SoC-Wert im Format „73 %" (Leerzeichen-Notation, deutsche Typographie) mit `font-size 9`, `font-weight 400`, `fill #ffffff`, `transform: rotate(−45° um den Ankerpunkt)`. Bei nicht verfügbarem SoC-Sensor bleibt das Verhalten wie heute (kein Ring, kein Text).

Eine kleine Helper-Funktion `formatSocPct(socPct)` wird aus `battery-ring.ts` exportiert, damit Renderer + aria-Label dieselbe Format-Quelle nutzen (ADR-0010 Single-Source).

### 0.0 TL;DR — Was der Planer NICHT tun darf

1. ❌ `src/engine/*` anfassen — Engine-Layer bleibt unberührt (CLAUDE.md 1, ADR-0004).
2. ❌ `src/config/*` anfassen — `batterySoc`-Map kommt heute schon aus `system-state.ts`, kein Schema-Update nötig.
3. ❌ Eine neue Konfigurations-Option für „%-Anzeige an/aus" einführen — Feature ist immer an, wenn SoC-Sensor verfügbar (YAGNI).
4. ❌ Neue i18n-Strings anlegen — `DE.units.percent='%'` existiert bereits in `src/i18n/de.ts:18`.
5. ❌ `RING_RADIUS` ändern (bleibt 50). Nur `STROKE_WIDTH` 6 → 14.
6. ❌ Die Layout-Konstanten in `src/render/layout.ts` (`NODE_R_MEDIUM=42`, `BOTTOM_Y=460`, …) anfassen. Battery-Node-Geometrie bleibt unverändert.
7. ❌ `Math.round`-Wert auf Dezimalstellen erweitern. „73 %" — keine Nachkommastellen (gegen Sensor-Jitter).
8. ❌ `showRing`-Guard in `node-renderer.ts:41` umbauen oder umgehen. Bei fehlendem SoC-Sensor: gar nichts rendern.
9. ❌ Eine zweite Definition von „73 %"-Format-String einführen. Helper `formatSocPct` ist Single-Source (ADR-0010).
10. ❌ Den Text außerhalb des Rings platzieren oder den Akku-Kreis (r=42) vergrößern. Aktuelle Akku-Kreis-Geometrie unangetastet.
11. ❌ Theme-aware Text-Farbe einbauen („wenn Light-Mode, dann dunkler Text") — wir bleiben bei `#ffffff`. Eventuelle Light-Mode-Probleme werden mit Preview-Verifikation (§6.2) erkannt und ggf. in einer Folge-Spec adressiert.
12. ❌ Den Name-Label-Y-Offset (`node.r + 22 = 64` in `node-renderer.ts:154`) ändern, solange der visuelle Check zeigt, dass der Name nicht mit dem Ring kollidiert. Der Ring-Außenrand wandert von 53 auf 57 px (nur 4 px näher an den Name) — der Name beginnt bei y=64-X (font-Höhe-abhängig) und hat heute 11 px Reserve, nach Änderung 7 px. Akzeptabel.
13. ❌ `flow-renderer.ts:57` (`~${Math.round(...)} W` für Warning-Magnitude) anfassen oder durch `formatSocPct` ersetzen — anderer Use-Case (Watt, Schätzwert mit Tilde), nicht im Scope.

Bei Konflikt zwischen einem dieser Verbote und einem Plan-Schritt: STOP und nachfragen.

### 0.1 Harte Constraints für den Planer

**ESLint-Layer-Zonen aus `.eslintrc.cjs`** (authoritative — Spec hier NICHT doppelpflegen, immer die echte Config lesen):

| Target        | Darf importieren aus                                                                                             |
| ------------- | ---------------------------------------------------------------------------------------------------------------- |
| `src/render/` | `./render`, `./util`, `./engine/types.ts`, `./engine/flow-graph.ts`, `./config/types.ts`, `./const.ts`, `./i18n` |

`src/render/battery-ring.ts` darf damit `./i18n` importieren — Voraussetzung für die Verwendung von `DE.units.percent`.

**Weitere Constraints:**

| Constraint                                          | Quelle                | Konsequenz bei Verletzung                                              |
| --------------------------------------------------- | --------------------- | ---------------------------------------------------------------------- |
| Engine = pure functions, kein hass, kein DOM        | ADR-0004, CLAUDE.md 1 | Engine nicht angefasst — kein Risiko                                   |
| Single-Source `util/`/`render/` für geteilte Helfer | ADR-0010, CLAUDE.md 2 | `formatSocPct` ist die einzige Quelle des „X %"-Format-Strings         |
| `card.ts` ≤ 200 LOC                                 | CLAUDE.md 3           | `card.ts` nicht angefasst                                              |
| Keine `any` ohne Begründungs-Kommentar              | CLAUDE.md 4           | Neue Funktion `formatSocPct(socPct: number): string` strikt typisiert  |
| Strings aus `i18n/de.ts`                            | CLAUDE.md 8           | `%` über `DE.units.percent` (kein Hardcode der Einheit)                |
| TDD für `util/`/`config/`/`engine/`                 | CLAUDE.md 9           | `formatSocPct` lebt in `render/`, daher Render-Test-Standard (≥ 90 %)  |
| Anti-Pattern §11: keine SVG-String-Konkatenation    | conventions §11       | Alles über Lit-`svg`-Template-Tags, wie heute                          |
| Anti-Pattern §11: keine doppelten Util-Funktionen   | conventions §11       | `formatSocPct` ist Single-Source — kein Inline-`Math.round`-Duplikat   |
| Layer-Boundaries via ESLint `no-restricted-paths`   | ADR-0009              | Keine neuen Cross-Layer-Imports                                        |
| Pre-Release-Smoke-Test grün                         | ADR-0012              | MUSS mit neuer Stroke-Breite + Text bestanden werden                   |
| Bundle-Budget ≤ 60 kB minified                      | CLAUDE.md Tech-Stack  | Neuer Code ~15–25 LOC + 1 i18n-Import; bleibt deutlich unter dem Limit |

**Weitere verbindliche Lese-Quellen für den Planer:**

- `CLAUDE.md` (Projekt-Schnellreferenz, Workflow-Regeln, Anti-Patterns)
- `docs/conventions.md` (§11 Anti-Patterns, §12 Doku-Pflicht, §15 Sprache)
- `docs/architecture.md` (Module-Map §2)
- ADR-0009 (Layer-Boundaries), ADR-0010 (Single-Source), ADR-0012 (Smoke-Test)
- Subspec [`2026-05-15-icon-positionierung-und-kreis-skalierung.md`](./2026-05-15-icon-positionierung-und-kreis-skalierung.md) — gibt die aktuelle Battery-Geometrie (`NODE_R_MEDIUM`, SoC-Ring r=50, stroke=6) vor

### 0.2 Architektur-Kontext (welche Layer berührt)

| Layer     | Datei                             | Art der Änderung                                                            |
| --------- | --------------------------------- | --------------------------------------------------------------------------- |
| `render/` | `src/render/battery-ring.ts`      | edit — `STROKE_WIDTH` 6→14; neuer `<text>`-Block; export `formatSocPct`     |
| `render/` | `src/render/battery-ring.test.ts` | edit — Stroke-Width-Assertion auf 14; neue Text-Render- und Format-Tests    |
| `render/` | `src/render/node-renderer.ts`     | edit — Zeile 47 aria-Label: Inline-`Math.round(...)%` → `formatSocPct(...)` |

**NICHT zu berührende Layer** (Verstoß bricht CI via ESLint `no-restricted-paths` oder bricht semantisch):

- `engine/` — pure Energiebilanz, kein DOM, kein hass
- `config/` — `batterySoc`-Map kommt bereits aus `system-state.ts:81-85`
- `ha/` — HA-Event-Helfer, Type-Skelett
- `i18n/` — nur Read-Access, kein Edit (Konstante existiert)
- `util/` — nicht angefasst (Helper liegt im Render-Layer, weil dort einziger Use-Case)
- `editor.ts` / `editor-list-sections.ts` — Editor-GUI; keine neue Editor-Option
- `card.ts` — Lit-Lifecycle unverändert
- `src/render/layout.ts` — Layout-Konstanten (Battery-Node-Position, Radius, Name-Offset) bleiben gleich

**Single-Source-Regeln (ADR-0010):**

- `formatSocPct(socPct: number): string` ist die einzige Quelle für den Format-String „X %". Aufrufer: `renderBatteryRing` (für SVG-Text) und `node-renderer.ts` (für aria-Label).
- `DE.units.percent` (in `src/i18n/de.ts:18`) ist die einzige Quelle für das Einheits-Zeichen `%`. Wird ausschließlich in `formatSocPct` gelesen.

#### 0.2.1 Files-to-Verify — Parent-Dirs + Tool-Coverage (Pflicht-Tabelle)

| Datei                             | Parent-Dir existiert? | Welche Tools decken sie ab?                             |
| --------------------------------- | --------------------- | ------------------------------------------------------- |
| `src/render/battery-ring.ts`      | ✓ existiert           | `typecheck` + `lint` + `test`                           |
| `src/render/battery-ring.test.ts` | ✓ existiert           | `test` (nur Vitest, kein `tsc --noEmit` für Test-Files) |
| `src/render/node-renderer.ts`     | ✓ existiert           | `typecheck` + `lint`; manuelle Verifikation via Preview |

**Faustregeln:**

- Tests werden via Vitest+esbuild ausgeführt, nicht per `tsc --noEmit`. Type-Errors in Test-Files werden erst zur Laufzeit sichtbar.
- ESLint läuft auf `src/**/*.ts` — abgedeckt.
- Smoke-Test (ADR-0012) rendert die Card und prüft, ob die Module ohne Fehler laden.

Keine Tool-Coverage-Gaps in dieser Spec.

### 0.3 Konzept-Modell / Datenfluss

```
hass.states ─┐
             ├─► buildSystemState (config/system-state.ts) ─► batterySoc: Map<id, number>
config       ─┘                                                       │
                                                                      ▼
                                              RenderContext.batterySoc (render/context.ts:14)
                                                                      │
                                                                      ▼
                                              renderNode (node-renderer.ts:29) ─► picks socPct via ctx.batterySoc.get(node.id)
                                                                                                │
                                                                                                ▼
                                              renderBatteryRing(socPct, color)   [HIER GEÄNDERT — SVG-Text ergänzt]
                                              aria-Label                          [HIER GEÄNDERT — Format via formatSocPct]
```

**Pflicht-Wissen:**

- `batterySoc` ist eine `ReadonlyMap<string, number>` (Akku-ID → SoC-%) — wird in `config/system-state.ts:81-85` gefüllt, wenn der SoC-Sensor existiert UND finite Werte liefert.
- Wenn `batterySoc.get(node.id)` undefined ist → `showRing = false` → weder Ring noch %-Text werden gerendert (`node-renderer.ts:41-42`). Verhalten bei fehlendem SoC bleibt durch diesen Guard automatisch korrekt.
- `renderBatteryRing` ist heute pure (SoC-Wert rein, SVG raus, keine externen Reads). Bleibt so.
- aria-Label-Text wird in `node-renderer.ts:44-48` zusammengesetzt — drei Varianten je nach Sensor-Status (unavailable / mit Ring / ohne Ring).

### 0.4 Don't-Touch-Liste

| Element                                                   | Wo                                     | Warum nicht anfassen                                                                                                   |
| --------------------------------------------------------- | -------------------------------------- | ---------------------------------------------------------------------------------------------------------------------- |
| `RING_RADIUS = 50`                                        | `battery-ring.ts:3`                    | Radius bleibt gleich; nur Stroke wächst. Ring sitzt geometrisch wo er heute sitzt                                      |
| `transform="rotate(-90)"` auf Ring-Gruppe                 | `battery-ring.ts:12,26,40`             | Damit das gefüllte Segment bei SoC>0 oben startet (12 Uhr) und im Uhrzeigersinn wächst — unverändert                   |
| Drei-Fall-Logik (`<=0.5`, `>=99.5`, dazwischen)           | `battery-ring.ts:10-58`                | Sonderfälle bleiben semantisch gleich. Nur `STROKE_WIDTH`-Wert wird angepasst                                          |
| `showRing`-Guard                                          | `node-renderer.ts:41`                  | Bei fehlendem SoC-Sensor bleibt das Verhalten wie heute (kein Ring, kein Text)                                         |
| `NODE_R_MEDIUM = 42` (Akku-Kreis-Radius)                  | `render/layout.ts:30`                  | Akku-Kreis-Geometrie unverändert                                                                                       |
| `labelYOffset(battery) = node.r + 22 = 64`                | `node-renderer.ts:153-154`             | Name-Y-Offset bleibt — 7 px Reserve zum neuen Ring-Außenrand (r=57) ist visuell akzeptabel (Preview-Verifikation §6.2) |
| `valueY = 20` (Watt-Text-Y im Kreis-Inneren)              | `node-renderer.ts:55`                  | Watt-Text-Position unverändert                                                                                         |
| `nodeIcon(...)`-Aufruf + Icon-Box-Konstanten in `icon.ts` | `node-renderer.ts:86`, `icon.ts:20-26` | Icon-Position unverändert                                                                                              |
| `stroke-linecap="round"` auf gefülltem Ring               | `battery-ring.ts:54`                   | Optisch sauberer Rand des SoC-Segments — unverändert                                                                   |
| `opacity="0.18"` auf Hintergrund-Ring                     | `battery-ring.ts:18, 46`               | Niedrig-SoC-Edge-Case akzeptiert (Variante L1) — kein Bedarf für höhere Opazität                                       |

## 1. Kontext und Motivation

**Beobachtung 2026-05-15 (Brainstorming-Session @griebner):** Der Ring zeigt den Akku-Füllstand zwar visuell sehr gut, aber für die Diagnose („wie weit fehlt es bis zur Vollladung?" oder „bin ich bei kritischen 8 %?") fehlt der exakte Wert. Der User hat den genauen SoC heute nur über das aria-Label (Screen-Reader) oder per Klick auf den HA-Sensor.

**Vor der Subspec-Erstellung** wurden vier Positions-Varianten im Mockup verglichen (`/tmp/akku-prozent-mockup.html` v1) und verworfen: %-Wert im Kreis-Inneren / unter dem Kreis / über dem Icon / am Ring-Ende. Der User wollte stattdessen den **Ring-Stroke breiter** und den %-Text **im Stroke selbst** an einer Schräglage oben-links. Diese Variante wurde durch v2-v5 zu **D2** verfeinert: Stroke 14, font 9 weight 400, weiß, 10:30-Position, Rotation −45° (tangential).

Bei den Edge-Cases (sehr niedrige SoC-Werte) wurde **L1 (nichts tun)** gewählt — der User akzeptiert, dass „5 %" auf dem blassen Hintergrund-Ring schwach lesbar erscheint, weil das ein seltener Zustand ist und keine zusätzliche Logik dafür reinkommen soll.

## 2. Goals und Non-Goals

### 2.1 Goals

- Akku-SoC-Wert in % als sichtbare Zahl im Ring darstellen, sobald ein SoC-Sensor verfügbar ist
- Geometrie: Ring r=50 (unverändert), Stroke 14 px (neu), Text bei (−35, −35) auf 10:30-Position, font-size 9, font-weight 400, fill `#ffffff`, transform `rotate(−45° um Ankerpunkt)`, baseline tangential im Uhrzeigersinn
- Format: „X %" (deutsche Typographie, Leerzeichen, gerundete Ganzzahl) — Quelle `formatSocPct(socPct)` in `battery-ring.ts`
- aria-Label-Format an die neue Quelle angleichen (heute fehlt das Leerzeichen — Konsistenz mit Watt-Format „1.2 kW")
- `pnpm check` grün, `pnpm smoke` grün, Bundle ≤ 60 kB minified
- Pre-Implementation-Snapshot + Post-Implementation-Snapshot via `pnpm kpi:snapshot` (Implementation-Workflow Phase 0/5)
- Subspec [`2026-05-15-icon-positionierung-…`](./2026-05-15-icon-positionierung-und-kreis-skalierung.md) bekommt Cross-Reference-Hinweis (Stroke 6 wurde dort dokumentiert, ist hier abgelöst)

### 2.2 Non-Goals

**Editor / Config:**

- **Keine** neue YAML-Option für „SoC-%-Anzeige an/aus" — Feature ist immer an, wenn `batterySoc` einen Wert für den Akku enthält
- **Keine** Option für Text-Position / -Farbe / -Größe — fix, wie in §3 festgelegt
- **Keine** Schema-Änderung in `src/config/types.ts` oder `src/config/schema.ts` — Battery-Schema (`{id, soc, power, charged_by}` bzw. Split-Variante) unverändert
- **Kein** Editor-Update — die Battery-Section listet weiter dieselben Felder

**Render / Engine / Config-Data-Layer:**

- **Keine** Engine-Änderung — der SoC-Wert fließt schon heute über `batterySoc` durch (Engine selbst kennt SoC, ignoriert ihn für die Bilanz)
- **Kein** neuer Datenflow vom Engine in den Renderer — `RenderContext.batterySoc` ist bereits etabliert
- **Keine** Änderung am `home`-Ring oder anderen Node-Typen (PV, Grid, Consumer)
- **Keine** Änderung an Flow-Animationen oder Edge-Rendering

**Konfiguration / Tooling:**

- **Keine** neuen Dev-Deps, keine neuen Runtime-Deps (Lit reicht)
- **Keine** Bundle-Pipeline-Änderungen — Rollup / Vitest / TypeScript-Config unverändert
- **Keine** neuen ESLint-Rules
- **Kein** neuer ADR (siehe §0 Header)

**Out-of-Scope-Verhalten:**

- **Keine** dynamische Text-Positionierung anhand des SoC-Füllstands (Variante L3, vom User verworfen)
- **Keine** Erhöhung der Hintergrund-Ring-Opazität (Variante L2, vom User verworfen)
- **Keine** theme-aware Text-Farbe (Light-/Dark-Mode-Anpassung) — kann v1.x werden, wenn Light-Mode-Tester Bedarf melden

## 3. Architektur / Konkrete Änderungen

### 3.1 `src/render/battery-ring.ts` — Stroke verbreitern + %-Text rendern

**Alt** (`battery-ring.ts`, gesamte Datei, 58 LOC):

```typescript
import { svg, type SVGTemplateResult } from 'lit';

const RING_RADIUS = 50;
const STROKE_WIDTH = 6;
const CIRCUMFERENCE = 2 * Math.PI * RING_RADIUS;

export function renderBatteryRing(socPct: number, color: string): SVGTemplateResult {
  const clamped = Math.min(100, Math.max(0, socPct));

  if (clamped <= 0.5) {
    return svg`
      <g transform="rotate(-90)" part="battery-ring">
        <circle cx="0" cy="0" r="${RING_RADIUS}" fill="none" stroke="${color}"
                stroke-width="${STROKE_WIDTH}" opacity="0.18"></circle>
      </g>
    `;
  }
  // ... (weitere zwei Fälle: voll, normaler)
}
```

**Neu** (vollständige Datei, Diff inhaltlich kompakt):

```typescript
import { svg, type SVGTemplateResult } from 'lit';
import { DE } from '../i18n/de';

const RING_RADIUS = 50;
const STROKE_WIDTH = 14; // 6 → 14 (Spec 2026-05-15-akku-prozent)
const CIRCUMFERENCE = 2 * Math.PI * RING_RADIUS;

// Position auf Ring-Mittellinie (r=50) bei θ=135° (10:30-Uhr-Stellung, gemessen
// gegen den Uhrzeigersinn von der 3-Uhr-Achse, Standard-Trig):
//   x = RING_RADIUS · cos(135°) = -35.355
//   y = RING_RADIUS · sin(135°) =  35.355   // SVG y-Achse zeigt nach unten —
//                                           // optisch „oben" ist also y negativ
// Die Spec-Mockups nutzen y-down-SVG; wir verschieben das Vorzeichen ins
// Resultat: (LABEL_X, LABEL_Y) = (-35, -35) erscheint visuell oben-links.
const LABEL_X = -35;
const LABEL_Y = -35;
const LABEL_ROTATE_DEG = -45; // Text-Baseline parallel zur Ring-Tangente, im Uhrzeigersinn
const LABEL_FONT_SIZE = 9;
const LABEL_FONT_WEIGHT = 400;
const LABEL_FILL = '#ffffff'; // weiß auf gesättigtem Stroke; Light-Mode-Verifikation siehe §6.2

/**
 * Formatiert einen SoC-Prozentwert als deutsche Typographie: gerundet, mit Leerzeichen.
 * NaN/Infinity → '0 %' (defensiv; im Normalpfad nicht erreichbar, weil
 * system-state.ts:85 nur finite Werte in batterySoc.set ablegt).
 */
export function formatSocPct(socPct: number): string {
  if (!Number.isFinite(socPct)) return `0 ${DE.units.percent}`;
  const clamped = Math.min(100, Math.max(0, socPct));
  return `${Math.round(clamped)} ${DE.units.percent}`;
}

export function renderBatteryRing(socPct: number, color: string): SVGTemplateResult {
  const clamped = Math.min(100, Math.max(0, socPct));
  const label = svg`
    <text x="${LABEL_X}" y="${LABEL_Y}"
          text-anchor="middle" dominant-baseline="middle"
          font-size="${LABEL_FONT_SIZE}" font-weight="${LABEL_FONT_WEIGHT}" fill="${LABEL_FILL}"
          transform="rotate(${LABEL_ROTATE_DEG} ${LABEL_X} ${LABEL_Y})"
          part="battery-ring-label">${formatSocPct(clamped)}</text>
  `;

  if (clamped <= 0.5) {
    return svg`
      <g part="battery-ring">
        <g transform="rotate(-90)">
          <circle cx="0" cy="0" r="${RING_RADIUS}" fill="none" stroke="${color}"
                  stroke-width="${STROKE_WIDTH}" opacity="0.18"></circle>
        </g>
        ${label}
      </g>
    `;
  }

  if (clamped >= 99.5) {
    return svg`
      <g part="battery-ring">
        <g transform="rotate(-90)">
          <circle cx="0" cy="0" r="${RING_RADIUS}" fill="none" stroke="${color}"
                  stroke-width="${STROKE_WIDTH}"></circle>
        </g>
        ${label}
      </g>
    `;
  }

  const filled = (CIRCUMFERENCE * clamped) / 100;
  const rest = CIRCUMFERENCE - filled;
  return svg`
    <g part="battery-ring">
      <g transform="rotate(-90)">
        <circle cx="0" cy="0" r="${RING_RADIUS}" fill="none" stroke="${color}"
                stroke-width="${STROKE_WIDTH}" opacity="0.18"></circle>
        <circle cx="0" cy="0" r="${RING_RADIUS}" fill="none" stroke="${color}"
                stroke-width="${STROKE_WIDTH}"
                stroke-dasharray="${filled} ${rest}" stroke-linecap="round"></circle>
      </g>
      ${label}
    </g>
  `;
}
```

**Strukturelle Änderung (wichtig):** Das `<text>` darf **nicht** in der mit `rotate(-90)` gedrehten `<g>`-Gruppe liegen, sonst rotiert es mit. Lösung: äußere `<g part="battery-ring">` enthält die innere gedrehte Ring-Gruppe **und** das Text-Element nebeneinander. Das `part`-Attribut wandert auf den äußeren Wrapper, damit ein einziger CSS-Hook erhalten bleibt.

**API-Kompatibilität des `part`-Hooks (verifiziert 2026-05-15):** `grep -rn '::part(battery-ring' src/ examples/` ergibt 0 Treffer. Es existiert aktuell **kein interner Card-Mod-/Theming-Selektor**, der auf `::part(battery-ring)` zielt. Die Migration des Attributs auf den äußeren Wrapper ist damit kein Breaking Change. Externe User mit eigenen Card-Mod-Snippets sind durch dieses Repo nicht abgedeckt — falls Bedarf entsteht, kann eine Folge-Spec einen stabileren Selektor anbieten.

| Prinzip                                       | Begründung                                                                                                                                             |
| --------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `formatSocPct` als Modul-Export, nicht inline | Single-Source (ADR-0010) — derselbe Format-String wird in `node-renderer.ts:47` für aria-Label benötigt; ohne Export würde dort ein Duplikat entstehen |
| Konstanten oben, kein Inline-Magic-Number     | Lesbarkeit + Test-Zugriff per Re-Import möglich (falls nötig); conventions §5                                                                          |
| Text außerhalb der `rotate(-90)`-Gruppe       | Text soll NICHT mit dem Ring um −90° vorrotieren — sonst entstehen unerwartete Position-Drifts. Nur die eigene `rotate(-45)` zählt                     |
| `part="battery-ring-label"` zusätzlich        | Erweitert die CSS-Shadow-Part-Schnittstelle; konsistent mit dem bereits vorhandenen `part="battery-ring"`                                              |

### 3.2 `src/render/node-renderer.ts` — aria-Label angleichen

**Datei-Diff:**

```diff
- import { renderBatteryRing } from './battery-ring';
+ import { formatSocPct, renderBatteryRing } from './battery-ring';
```

```diff
   const ariaLabel = unavailable
     ? `${name}: ${DE.states.sensorUnavailable}`
     : showRing
-      ? `${name}: ${value}, ${Math.round(socPct as number)}%`
+      ? `${name}: ${value}, ${formatSocPct(socPct as number)}`
       : `${name}: ${value}`;
```

**Effekt:** aria-Label-Ausgabe ändert sich von z.B. `Speicher: −1.2 kW, 73%` zu `Speicher: −1.2 kW, 73 %` (Leerzeichen vor `%`). Konsistent mit Watt-Format-Konvention `"X.Y kW"`. Screen-Reader sprechen das Leerzeichen meist ohnehin als kleine Pause — kein Akzessibilitäts-Regression.

### 3.3 Code-Reuse-Tabelle

| Helper / Konstante     | Wann verwenden                                                                                                                                                                                                                                                                                                                                                           | Datei                         |
| ---------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ----------------------------- |
| `formatSocPct(socPct)` | Immer wenn ein gerundeter SoC-Wert als String gebraucht wird (SVG-Text, aria-Label, Tooltip-Strings künftig …)                                                                                                                                                                                                                                                           | `src/render/battery-ring.ts`  |
| `DE.units.percent`     | Einzige Quelle für das Zeichen `%`; wird ausschließlich in `formatSocPct` gelesen                                                                                                                                                                                                                                                                                        | `src/i18n/de.ts:18`           |
| `Math.round`           | Built-in; kein eigener Wrapper. Innerhalb `formatSocPct` aufgerufen                                                                                                                                                                                                                                                                                                      | —                             |
| `formatPowerW(value)`  | **Stil-Vorbild (NICHT direkter Reuse-Kandidat).** Definiert in `src/util/format-power.ts:14` und macht „Math.round + Leerzeichen + Einheit"-Format für Watt. `formatSocPct` folgt derselben Konvention, um Format-Konsistenz auf dem Battery-Node zu wahren. NICHT mit `formatSocPct` ersetzen — andere Einheit, andere Sonderfall-Logik (Vorzeichen, kW/MW-Skalierung). | `src/util/format-power.ts:14` |

**Math.round-Vorkommen außerhalb dieses Scopes:**

- `src/render/flow-renderer.ts:57` hat `~${Math.round(...)} W` für Warning-Magnitude (Edge-Diagnostik). **NICHT durch `formatSocPct` ersetzen** — anderer Use-Case (Watt, nicht Prozent, mit Tilde-Präfix für Schätzwert). Aus diesem Refactor-Scope ausgeschlossen.
- `src/util/svg-path.ts:6` hat ein modul-lokales `r = (n) => Math.round(n)` für Pfad-Koordinaten-Rundung. Nicht exportiert, nicht relevant.

**Anti-Patterns, die der Planer aktiv vermeiden muss:**

- ❌ Inline-Reproduktion des Format-Strings irgendwo (`${Math.round(...)} %` oder `${Math.round(...)}%`) — wird per `formatSocPct` ersetzt
- ❌ SVG-String-Konkatenation (`'<text>' + value + '</text>'`) — alles via Lit-`svg`-Templates
- ❌ Inline-Hardcode von Position, Rotation, Font-Werten in `renderBatteryRing` — als Modul-Konstanten oben
- ❌ Kopie von `formatSocPct` in `node-renderer.ts` oder einem `util/`-Modul (z.B. „format-percent.ts") — Helper hat nur Render-Use-Cases, bleibt im Render-Layer

### 3.4 Layer-Boundary-Check

| Datei                             | Layer     | Neue Imports                                     | Konformität (gegen `.eslintrc.cjs` Zone `./src/render`) |
| --------------------------------- | --------- | ------------------------------------------------ | ------------------------------------------------------- |
| `src/render/battery-ring.ts`      | `render/` | `'../i18n/de'`                                   | ✓ (Zone erlaubt `./i18n`)                               |
| `src/render/battery-ring.test.ts` | `render/` | unverändert (`./battery-ring`)                   | ✓                                                       |
| `src/render/node-renderer.ts`     | `render/` | erweitert um `formatSocPct` aus `./battery-ring` | ✓ (intra-Layer-Import)                                  |

Keine neuen Cross-Layer-Imports.

## 4. Datenfluss

1. **HA-Update:** `hass.states['sensor.battery_soc'].state = "73"` (in % als String).
2. **`buildSystemState`** (`config/system-state.ts:50, 81-85`) liest den Wert via `read(b.soc, { expectedUnit: '%' })` → `s.socPct = 73`. Wenn finite, wird er in `batterySoc.set(b.id, 73)` abgelegt.
3. **Card-Lifecycle:** `card.ts:109` schreibt `this._batterySoc = build.batterySoc`. In `card.ts:161` wird die Map als `batterySoc` an den `RenderContext` durchgereicht.
4. **`renderNode`** (`node-renderer.ts:29-108`) liest `ctx.batterySoc.get(node.id)` für Battery-Nodes. Bei verfügbarem Wert: `showRing = true`.
5. **`renderBatteryRing(73, color)`** (`battery-ring.ts`) generiert SVG: Ring-Gruppe (gedreht −90°) mit Hintergrund-Ring + gefülltem Segment (dasharray für 73 %) + Text-Element (außerhalb der Drehgruppe) an Position (−35, −35) rotiert −45° mit Inhalt „73 %".
6. **aria-Label** in `node-renderer.ts:47` wird zu `"Speicher: −1.2 kW, 73 %"` über `formatSocPct(73)`.

## 5. Fehlerverhalten / Edge-Cases

- **SoC-Sensor unavailable:** `system-state.ts` setzt keinen Wert → `ctx.batterySoc.get(node.id) === undefined` → `showRing = false` → **kein Ring, kein Text** wird gerendert (unverändert).
- **Battery-Power-Sensor unavailable, SoC-Sensor verfügbar:** `unavailable = true` → `showRing = false` → kein Ring, kein Text, aria-Label = „Speicher: Sensor nicht verfügbar" (unverändert).
- **SoC = 0 (genau 0 oder ≤ 0.5):** `renderBatteryRing` zeichnet nur Hintergrund-Ring (opacity 0.18) + Text „0 %". Lesbarkeit schwach — **akzeptiert** (Variante L1, Brainstorming-Entscheidung). Kein Crash.
- **SoC = 100 (genau 100 oder ≥ 99.5):** `renderBatteryRing` zeichnet vollen Ring + Text „100 %". `100 %` ist 5 Zeichen vs. „73 %" mit 4 Zeichen — bei font-size 9 ca. 28 px breit, passt innerhalb des Stroke-Bands (14 px Höhe pro Stroke; tangentialer Lauf ist breiter als die Stroke-Dicke). Visuell ungeprüft, Verifikations-Schritt §6.2.
- **SoC > 100 oder < 0 (Sensor-Fehlkalibration):** `clamped = min(100, max(0, socPct))` in beiden Pfaden — Ring zeigt 0 % bzw. 100 %, Text zeigt entsprechend „0 %" bzw. „100 %". Kein Crash, kein Warning.
- **SoC = NaN:** wird im Filter in `system-state.ts:85` (`Number.isFinite(s.socPct)`) ausgeschlossen — kommt nicht im `batterySoc`-Map an. Pfad unmöglich.
- **SoC zwischen 0.5 und ~15 %:** Text liegt außerhalb des sehr kleinen gefüllten Segments → auf opacity-0.18-Hintergrund. Blasser, aber lesbar — **akzeptiert** (L1).

Engine wirft niemals (conventions §6.1) — bei dieser Spec wird Engine nicht angefasst, kein neuer Warning-Path nötig.

## 6. Tests

### 6.1 `src/render/battery-ring.test.ts` — Erweiterung

**Vorabfix: `serialize`-Helper rekursiv machen.** Heute (`battery-ring.test.ts:5-13`) macht der Helper `String(t.values[i])`, was bei eingebetteten `svg`...`-Sub-Templates (`${label}`in`renderBatteryRing`) das Ergebnis `"[object Object]"`liefert und String-Asserts gegen`<text` false-grün macht. Helper muss rekursiv durch Sub-Templates wandern, bevor die neuen Asserts überhaupt aussagekräftig sind:

```typescript
function serialize(template: ReturnType<typeof renderBatteryRing>): string {
  const t = template as unknown as { strings: readonly string[]; values: readonly unknown[] };
  const parts: string[] = [];
  t.strings.forEach((s, i) => {
    parts.push(s);
    if (i < t.values.length) {
      const v = t.values[i];
      // Nested Lit-Template? -> rekursiv serialisieren.
      if (v && typeof v === 'object' && 'strings' in v && 'values' in v) {
        parts.push(serialize(v as ReturnType<typeof renderBatteryRing>));
      } else {
        parts.push(String(v));
      }
    }
  });
  return parts.join('');
}
```

Diese Helper-Änderung ist **die erste Test-Datei-Edit** und muss vor allen neuen Assertions passieren — sonst greifen die `<text>`-Checks in §6.1 nicht.

Bestehende Tests anpassen + neue Tests:

```typescript
import { describe, expect, it } from 'vitest';
import { formatSocPct, renderBatteryRing } from './battery-ring';

// serialize-Helper rekursiv (siehe oben), ersetzt die bestehende Variante

describe('renderBatteryRing — Stroke und Ring-Geometrie', () => {
  it('rendert Ring-Stroke mit Breite 14', () => {
    const out = serialize(renderBatteryRing(50, '#10b981'));
    expect(out).toContain('stroke-width="14"');
    expect(out).not.toContain('stroke-width="6"');
  });
  // bestehende Tests (Füllung, Sonderfälle, Clamping) bleiben, aber:
  // - it.each-Cases ergänzen für socPct=0, 0.5, 73, 99.5, 100
  //   → erwarten alle 3 Zweige (≤0.5, ≥99.5, normal) korrekt
});

describe('renderBatteryRing — %-Text-Element', () => {
  it.each([
    { soc: 0, label: '0 %' },
    { soc: 0.4, label: '0 %' }, // ≤ 0.5 -Pfad: Text trotzdem da
    { soc: 5, label: '5 %' },
    { soc: 50, label: '50 %' },
    { soc: 73, label: '73 %' },
    { soc: 99.6, label: '100 %' }, // ≥ 99.5-Pfad: Text trotzdem da
    { soc: 100, label: '100 %' },
    { soc: 150, label: '100 %' }, // Clamping
    { soc: -10, label: '0 %' }, // Clamping
  ])('rendert Text "$label" für SoC=$soc', ({ soc, label }) => {
    const out = serialize(renderBatteryRing(soc, '#10b981'));
    expect(out).toContain(`>${label}</text>`);
  });

  it('positioniert Text bei (-35, -35) mit rotate(-45 -35 -35)', () => {
    const out = serialize(renderBatteryRing(50, '#10b981'));
    expect(out).toMatch(/x="-35"\s+y="-35"/);
    expect(out).toContain('transform="rotate(-45 -35 -35)"');
  });

  it('Text-Element ist NICHT in der mit rotate(-90) gedrehten Gruppe', () => {
    const out = serialize(renderBatteryRing(50, '#10b981'));
    // Robuster Check: zwischen dem öffnenden `<g transform="rotate(-90)">`
    // und dem zugehörigen schließenden `</g>` darf KEIN `<text` stehen.
    const innerOpenIdx = out.indexOf('<g transform="rotate(-90)">');
    expect(innerOpenIdx).toBeGreaterThan(-1);
    const innerCloseIdx = out.indexOf('</g>', innerOpenIdx);
    expect(innerCloseIdx).toBeGreaterThan(innerOpenIdx);
    const innerSlice = out.slice(innerOpenIdx, innerCloseIdx);
    expect(innerSlice).not.toContain('<text');
    // Plus: das `<text` MUSS im äußeren Wrapper liegen.
    expect(out.slice(innerCloseIdx)).toContain('<text');
  });

  it('Text hat font-size=9, font-weight=400, fill=#ffffff', () => {
    const out = serialize(renderBatteryRing(50, '#10b981'));
    expect(out).toContain('font-size="9"');
    expect(out).toContain('font-weight="400"');
    expect(out).toContain('fill="#ffffff"');
  });

  it('Text hat dominant-baseline=middle und text-anchor=middle', () => {
    const out = serialize(renderBatteryRing(50, '#10b981'));
    expect(out).toContain('text-anchor="middle"');
    expect(out).toContain('dominant-baseline="middle"');
  });

  it('Text exposiert part="battery-ring-label" als Theming-Hook', () => {
    const out = serialize(renderBatteryRing(50, '#10b981'));
    expect(out).toContain('part="battery-ring-label"');
  });

  it('äußerer Wrapper behält part="battery-ring" (API-Kompatibilität)', () => {
    const out = serialize(renderBatteryRing(50, '#10b981'));
    expect(out).toContain('part="battery-ring"');
  });
});

describe('formatSocPct', () => {
  it.each([
    [0, '0 %'],
    [0.4, '0 %'],
    [49.5, '50 %'],
    [73, '73 %'],
    [99.4, '99 %'],
    [99.6, '100 %'],
    [150, '100 %'],
    [-10, '0 %'],
    [Number.NaN, '0 %'], // Non-finite-Guard (defensiv)
    [Number.POSITIVE_INFINITY, '0 %'], // Non-finite-Guard
    [Number.NEGATIVE_INFINITY, '0 %'], // Non-finite-Guard
  ])('formatSocPct(%d) === "%s"', (input, expected) => {
    expect(formatSocPct(input)).toBe(expected);
  });

  it('nutzt DE.units.percent als Einheit', async () => {
    // Indirekter Test: Format enthält das %-Zeichen aus i18n
    const { DE } = await import('../i18n/de');
    expect(formatSocPct(50)).toContain(DE.units.percent);
  });
});
```

**TDD-Order:** Tests für `formatSocPct` und das Text-Element **vor** Code-Implementation (CLAUDE.md 9, `formatSocPct` ist util-artig). Stroke-Width-Test kann zusammen mit Code.

### 6.2 Sandbox / manuelle Verifikation

Schritte (Implementer und Reviewer beide):

1. `pnpm preview` — Sandbox öffnen (`examples/preview.html` mit 2 PVs + 2 Akkus).
2. **Akku-Node prüfen:** Stroke sichtbar dicker als vorher? %-Wert oben-links im Ring lesbar? Rotation läuft visuell mit der Ring-Kurve?
3. **Bei DevTools** den SoC-Wert künstlich variieren (`hass.states['sensor.b_dach_soc'].state = "5"` → Element manuell anpassen, oder direkt im Sandbox-Stub-Modul): Visualisiert sich 5 %, 50 %, 73 %, 100 % korrekt? Bei 100 %: passt der Text optisch in den Ring (5 Zeichen vs. 4)?
4. **Light-Mode-Check (optional):** Browser-`prefers-color-scheme` oder HA-Theme auf Light umstellen. Weißer Text auf grünem Ring noch lesbar? Falls Probleme: in §10 Risiko vermerken, Follow-up-Spec planen.
5. **aria-Label-Check via DevTools-Inspector:** `aria-label` des Battery-Node-`<g>`-Elements zeigt „Speicher: −X.X kW, NN %" (Leerzeichen vor `%`)?
6. **Smoke-Test:** `pnpm smoke` läuft grün (ADR-0012; Card lädt + rendert ohne Class-Load-Crash).

### 6.3 Coverage

`vitest.config.ts` `coverage.include` umfasst aktuell **nur** `src/engine/**`, `src/config/**`, `src/util/**` — `src/render/**` ist explizit NICHT im Coverage-Track. Die neuen Tests in `src/render/battery-ring.test.ts` laufen weiterhin (`pnpm test` und `pnpm test:coverage`), zählen aber nicht in den 90 %-Threshold. **`coverage.include` NICHT erweitern** im Rahmen dieser Spec — das wäre ein eigenes architektonisches Refactor mit globaler Konsequenz (Render-Layer ist visuell und enthält Lit-Templates, deren Branch-Coverage anders bewertet wird).

Test-Disziplin trotzdem: `it.each` für `formatSocPct` deckt alle Edge-Cases ab (NaN, Clamping, Sonderfälle 0.4/99.6), Text-Render-Pfad mit 3 verschiedenen SoC-Bereichen (≤ 0.5, normal, ≥ 99.5).

## 7. Auswirkung auf Doku

**Hauptspec `2026-05-10-…-design.md`:**

- Keine direkte Berührung der Hauptspec. Das Akku-Visual wird nur in §3 (Card-Layout) generisch erwähnt; Detailgeometrie ist Subspec-geführt.

**Subspec `2026-05-15-icon-positionierung-und-kreis-skalierung.md`:**

- Cross-Reference-Block am Anfang oder Ende: „SoC-Ring Stroke 6 px (in dieser Subspec dokumentiert) wird in [`2026-05-15-akku-prozent-im-ring.md`](./2026-05-15-akku-prozent-im-ring.md) auf 14 px aktualisiert, um den %-Wert im Stroke unterbringen zu können."

**`docs/architecture.md`:**

- §2 (Layer-Tabelle): kein Update — keine neuen Module, keine neuen Layer-Aufgaben.
- §4 (ADR-Tabelle): kein Update — kein neuer ADR.

**`docs/adr/README.md`:**

- Kein Update.

**`docs/adr/*.md`:**

- Kein Update.

**`CLAUDE.md`:**

- Kein Update — keine Tech-Stack-/Module-Layer-Änderung.

**`README.md`:**

- Eintrag im Changelog/Visual-Update-Abschnitt (sobald HACS-Release-Bump kommt): „Akku-Knoten zeigt jetzt den Füllstand zusätzlich als Prozentwert im Ring."

**`docs/conventions.md`:**

- Kein Update.

## 8. ADR

Nicht nötig (siehe Header). Reines Visual-Polish ohne Architektur-Auswirkung.

## 9. UX-Verhalten und Out-of-Scope

### 9.1 UX-Verhalten (was der User sieht/erlebt)

- **Akku-Node wirkt visuell präsenter:** Stroke-Dicke verdoppelt sich nahezu (6 → 14 px). Der Akku zieht im Card-Layout mehr Aufmerksamkeit auf sich als andere Nodes — gewollt, weil der SoC für den User eine zentrale Kennzahl ist.
- **„73 %"-Text** im Ring sichtbar, schräg-tangential läuft mit dem Ring. Bei normalen SoC-Werten (15–99 %) klar lesbar; bei sehr niedrigen SoC-Werten (< 5 %) wird der Text blasser, weil er auf dem semitransparenten Hintergrund-Ring sitzt — **akzeptiert** (Variante L1, Brainstorming-Entscheidung).
- **Name-Label** (z.B. „Speicher", „Garage-Akku") sitzt wie heute unter dem Akku-Kreis bei `node.r + 22 = 64`. Mit Ring-Außenrand jetzt bei r=57 (statt 53) gibt es 7 px Abstand zum Text (vorher 11 px). Visuell knapp aber okay — wird in der Preview verifiziert (§6.2).
- **aria-Label** ändert Format minimal: `73%` → `73 %` (Leerzeichen). Screen-Reader-konsistent mit Watt-Format. Keine Bedeutungs-Änderung für blinde User.
- **Bei mehreren Akkus** (z.B. „Garage-Akku" + „Keller-Akku"): jeder bekommt seinen eigenen %-Wert im Ring, identische Geometrie. Visuelle Konsistenz.
- **Bei fehlendem SoC-Sensor:** Akku-Knoten zeigt nur den Akku-Kreis (r=42) mit Icon + Watt-Wert — kein Ring, kein %-Text. Heute schon so, bleibt so.

> **UI-Stress-Test (Light-Mode + 100 %):** Bei der Preview prüfen, ob der weiße Text „100 %" auf dem grünen Stroke im Light-Theme noch ausreichend Kontrast hat. Falls nicht: in Risiko-Sektion §10 als „medium" markieren + Follow-up-Spec für theme-aware Text-Farbe planen (Out-of-Scope dieser Subspec).

### 9.2 Out-of-Scope

- **Konfigurierbarkeit der %-Anzeige (an/aus, Position, Schriftgröße):** YAGNI. v1.x-Kandidat, falls User-Feedback aufkommt.
- **Theme-aware Text-Farbe (Light-Mode-Anpassung):** v1.x-Kandidat. Aktuelle Annahme: weiß auf gesättigtem Grün ist in beiden Modi ausreichend.
- **SoC-Anzeige beim Home-Node (Aggregat über alle Akkus):** Out-of-Scope. Home zeigt aktuell Haus-Verbrauch, nicht akku-spezifische Zahlen.
- **Tooltip beim Hover über Akku-Knoten** mit Detail-Info (Watt + SoC + W-Tendenz): v1.x — sinnvoll, aber separater Aufwand und Layout-Frage.
- **Dynamische Text-Position bei niedrigem SoC** (Variante L3): explizit verworfen — optisch unruhig, Sonderfall-anfällig.
- **Hintergrund-Ring-Opacity-Anhebung** (Variante L2): explizit verworfen.
- **Animierte Übergänge** beim SoC-Wechsel: v1.x — nice-to-have.

## 10. Risiken

| Risiko                                                                      | Wahrscheinlichkeit | Auswirkung | Mitigation                                                                                                                                                     |
| --------------------------------------------------------------------------- | ------------------ | ---------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Name-Label kollidiert visuell mit Ring-Außenrand (7 px Reserve statt 11 px) | niedrig            | klein      | Preview-Verifikation §6.2. Falls Kollision: Name-Offset von 22 auf 26 anheben (Konstante in `node-renderer.ts:154`)                                            |
| Weißer Text im Light-Theme zu wenig Kontrast auf hellem Stroke              | mittel             | klein      | Preview-Verifikation §6.2 explizit im Light-Theme. Bei Bedarf: Follow-up-Spec für theme-aware Fill (Out-of-Scope hier)                                         |
| „100 %" passt visuell nicht entlang der Tangente (5 Zeichen)                | niedrig            | klein      | Preview-Verifikation. Falls zu lang: font-size auf 8 reduzieren oder Position um ein paar Pixel zur 11-Uhr-Stelle ziehen                                       |
| `<text>` außerhalb der `rotate(-90)`-Gruppe rendert anders als erwartet     | niedrig            | mittel     | Test §6.1 prüft Ordnung (`</g>` vor `<text>`). Preview-Verifikation sichert visuell ab                                                                         |
| aria-Label-Änderung („73%" → „73 %") verwirrt automatisierte UI-Tests       | sehr niedrig       | klein      | Keine bekannten externen Tests gegen das Format. Smoke-Test ADR-0012 prüft Rendering, nicht aria-Text                                                          |
| Bundle-Größe übersteigt 60 kB                                               | sehr niedrig       | mittel     | Geschätzter Mehraufwand: 15–25 LOC + 1 i18n-Import → < 0.5 kB minified. Wird beim `pnpm build` verifiziert                                                     |
| Test serialize-Helper rendert Sub-Templates nicht → Tests false-grün        | niedrig            | hoch       | `serialize`-Rekursivität ist Pflicht-Vorabfix in §6.1 dokumentiert. Test §6.1 „Text-Element-Verschachtelung" deckt es ab                                       |
| Render-Snapshot-Tests in anderen Files zerbrechen                           | sehr niedrig       | mittel     | `grep -rn "toMatchSnapshot\|toMatchInlineSnapshot" src/` ergibt **0 Treffer** (2026-05-15 verifiziert) — kein Risiko                                           |
| HACS-/Browser-Cache zeigt alten Bundle nach Release                         | mittel             | klein      | Bekannt — HACS-Bump im Release-Workflow (§12 Schritt 13) löst Cache-Bust auf User-Seite aus. README-Notiz zum Cache-Clear bei Visual-Bugs ist Standard-Hinweis |

Keine „hoch"-Risiken im Wahrscheinlichkeits×Auswirkungs-Produkt. Kein Spike erforderlich.

## 11. Erfolgs-Kriterien

- [ ] Akku-Node zeigt im Ring den SoC als gerundete %-Zahl, sobald `batterySoc` für den Akku einen Wert enthält
- [ ] Ring-Stroke optisch verbreitert (Stroke 14 vs. heute 6)
- [ ] Text sitzt oben-links auf 10:30-Position, tangential rotiert (−45°), font-size 9, weight 400, weiß
- [ ] aria-Label zeigt das Format „X %" (mit Leerzeichen, konsistent mit Watt-Format)
- [ ] `pnpm test` grün (inklusive neuer Tests aus §6.1)
- [ ] `pnpm check` grün (lint + typecheck + tests)
- [ ] `pnpm smoke` grün (ADR-0012)
- [ ] `pnpm build` Bundle ≤ 60 kB minified
- [ ] `wc -l src/render/battery-ring.ts` < 100 (heute 58, neu erwartet ~80–90)
- [ ] `git diff` zeigt KEINE Änderungen an Files außerhalb von §0.2-Tabelle
- [ ] Preview-Verifikation §6.2 dokumentiert (Screenshot oder Notiz im Commit-Body)
- [ ] Cross-Reference-Block in [`2026-05-15-icon-positionierung-…`](./2026-05-15-icon-positionierung-und-kreis-skalierung.md) ergänzt
- [ ] README-Changelog-Entry ergänzt — **erst beim HACS-Bump** (gemeinsamer Commit mit Version-Bump), kein vorab-leerer Doku-Commit
- [ ] Pre/Post-KPI-Snapshot via `pnpm kpi:snapshot --label pre-akku-prozent-im-ring --phase pre` / `…--phase post` erstellt (Implementation-Workflow Phase 0/5)

## 12. Plan-Schritte (Reihenfolge mit Begründung)

1. **Pre-Implementation-Snapshot** — `pnpm check && pnpm build && pnpm test:coverage`, dann `pnpm kpi:snapshot --label pre-akku-prozent-im-ring --phase pre`. Playwright-Capture (Stufe-1) für Vergleich. Implementation-Workflow Phase 0.
2. **Tests für `formatSocPct` schreiben** (TDD, CLAUDE.md 9) — Test-Cases aus §6.1 inklusive Edge-Cases (NaN/Infinity-Guard, Clamping). Tests müssen rot sein bevor Code geschrieben wird. **Vorab in derselben Datei:** den `serialize`-Helper rekursiv machen (siehe §6.1 Vorabfix) — sonst greifen die Asserts in Schritt 4 nicht.
3. **`formatSocPct` implementieren** in `src/render/battery-ring.ts` als exportierte Funktion. Tests werden grün.
4. **Tests für Text-Element + Stroke-14 schreiben** — Position, Rotation, Font-Attribute, Verschachtelungs-Ordnung, `part="battery-ring-label"`-Hook, äußerer `part="battery-ring"`-Wrapper. Voraussetzung: `formatSocPct` aus Schritt 3 bereits exportiert (sonst Import-Fehler statt Assertion-Fehler).
5. **`renderBatteryRing` umbauen:** Stroke 6 → 14, Text-Element außerhalb der `rotate(-90)`-Gruppe ergänzen, Konstanten oben definieren. Tests werden grün.
6. **aria-Label in `node-renderer.ts:47` umstellen** auf `formatSocPct(socPct as number)`, Import ergänzen. Falls existierende node-renderer-Tests aria-Label prüfen: anpassen (heute existiert kein dedizierter aria-Label-Test).
7. **`pnpm check`** grün halten — lint, typecheck, alle Tests.
8. **Preview-Verifikation §6.2** durchlaufen — alle 6 Schritte, mit DevTools-SoC-Override für die Edge-Cases (5, 50, 73, 100, fehlend). Light-Mode-Check explizit. Screenshot/Notiz für Code-Review.
9. **`pnpm smoke`** grün halten (ADR-0012).
10. **Cross-Reference-Block** in [`2026-05-15-icon-positionierung-…`](./2026-05-15-icon-positionierung-und-kreis-skalierung.md) ergänzen.
11. **Post-Implementation-Snapshot** — `pnpm kpi:snapshot --label post-akku-prozent-im-ring --phase post` + Playwright-Capture. Implementation-Workflow Phase 5.
12. **Code-Review-Workflow** starten (Phase 4 in CLAUDE.md): Self-Review + Sub-Agent-Pässe nach `code-review-checklist.md`. Plan hat 13 Schritte → **Plan-Komplexität mittel** (5–15 Tasks) → Pässe **1 + 2 + 3 + 6** (Spec/Plan-Coverage, Architektur+ADR+Conventions, Wartbarkeits-KPIs, Release-Readiness).
13. **Finishing-a-development-branch** (Phase 6): User-Consent für Merge/Tag/HACS-Bump. **Bei HACS-Bump:** README-Changelog-Entry („Akku-Knoten zeigt jetzt den Füllstand zusätzlich als Prozentwert im Ring") gemeinsam mit dem Version-Bump committen — kein eigener vorab-Plan-Schritt.

Erwarteter Gesamtumfang: 13 Plan-Schritte (1 Vorab-Gate, 9 Implementation+Verifikation, 3 Post-Implementation/Doku/Review).

**Kritische Abhängigkeit:** keine (kein Spike nötig — Risiko alle „niedrig"–„mittel").
