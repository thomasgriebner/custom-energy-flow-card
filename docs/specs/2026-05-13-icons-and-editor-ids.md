# Subspec — MDI-Icon-Rendering & Editor-ID-Cleanup

**Status:** v2 (post-review, ready for plan)
**Datum:** 2026-05-13
**Autor:** Brainstorming-Session mit @griebner
**Verlinkte Hauptspec:** [`2026-05-10-custom-energy-flow-card-design.md`](./2026-05-10-custom-energy-flow-card-design.md)
**Berührte CLAUDE.md-Regeln:** 2, 3, 5, 8, 9, 10
**Berührte ADRs:** 0003, 0009, 0010 — **neuer ADR-0020 verpflichtend** (siehe §8)

## 0. Zusammenfassung

Zwei kleine UI-Korrekturen aus derselben Editor-Review:

1. **Editor-ID-Cleanup** — Das `id`-Textfeld verschwindet aus Solar- und Battery-Sektion des Editors. IDs werden ausschließlich beim Hinzufügen via `_nextUniqueId` auto-generiert. Pairing-Dropdown bei Akkus zeigt `${name ?? \`${DE.nodes.solar} ${idx + 1}\`}` (also "Solar 1") als Fallback statt der internen ID. Keine Breaking Change: YAML-Persistenz, Typen, Validierung bleiben identisch.

2. **MDI-Icon-Rendering** — User- und Area-konfigurierte `mdi:*`-Icons werden tatsächlich gerendert (heute werden sie verworfen). Implementation via `<ha-icon>` (HA-globales Custom Element) in einem SVG-`<foreignObject>`-Wrapper. Default-Icons aus Hauptspec §3.2 werden zur Quelle der Wahrheit. Emoji-Pass-Through bleibt erhalten. Diagnostics-`"!"`-Marker wird mit demselben Code-Pfad auf `mdi:alert-circle-outline` umgestellt.

Architektonisch wandert die Icon-Logik in ein **neues Modul `src/render/icon.ts`**, das sowohl `node-renderer.ts` als auch `flow-renderer.ts` nutzen (ADR-0010 Single-Source). Für Sandbox und Tests wird ein gemeinsamer `ha-icon`-Stub registriert, der `@mdi/js` (DevDep) als Path-Quelle nutzt und das Icon als inline-SVG rendert. Damit werden WSL-Emoji-Render-Probleme in Screenshots gelöst, und Render-Tests können das tatsächliche Markup verifizieren.

Die Strategie-Änderung von Hauptspec §5.3 (inline `mdi-paths.ts`) zu **ha-icon via foreignObject** ist eine Architektur-Entscheidung und braucht **ADR-0020**.

### 0.1 Harte Constraints für den Planer

ESLint-Layer-Zonen aus `.eslintrc.cjs` (authoritative — Spec hier nicht doppelpflegen, im Zweifel die `.eslintrc.cjs` lesen):

| Target                                          | Darf importieren aus                                                                                 |
| ----------------------------------------------- | ---------------------------------------------------------------------------------------------------- |
| `src/render/`                                   | `./render, ./util, ./engine/types.ts, ./engine/flow-graph.ts, ./config/types.ts, ./const.ts, ./i18n` |
| `src/editor.ts`                                 | `./config, ./ha, ./util, ./i18n, ./const.ts, ./editor-list-sections.ts`                              |
| `src/editor-list-sections.ts` (**eigene Zone**) | `./config, ./ha, ./util, ./i18n, ./const.ts`                                                         |

Weitere Constraints:

| Constraint                                       | Quelle            | Konsequenz bei Verletzung                                                                          |
| ------------------------------------------------ | ----------------- | -------------------------------------------------------------------------------------------------- |
| Keine Runtime-Deps außer Lit                     | ADR-0003          | `@mdi/js` **MUSS** `devDependencies` sein; ESLint `no-restricted-imports` blockt Import aus `src/` |
| `ha-icon` ist HA-global, kein Import             | Hauptspec §6.4.2  | Nur via Lit-Template benutzen; Type-Declaration bereits in `src/ha/ha-globals.d.ts:16`             |
| Single-Source für Icon-Rendering                 | ADR-0010          | `nodeIcon`/`diagnosticsIcon` liegen in `src/render/icon.ts`, **nicht** dupliziert in den Renderern |
| Modul-LOC-Limit 250                              | conventions.md §3 | `node-renderer.ts` ist bei 246 LOC — Auslagerung ist Pflicht, nicht optional                       |
| Engine pure                                      | ADR-0004          | Icon-Resolution passiert im render-Layer; Engine bleibt unberührt                                  |
| `card.ts` ≤ 200 LOC                              | CLAUDE.md Regel 3 | Keine Änderung an card.ts erwartet                                                                 |
| User-Strings aus `i18n/de.ts`                    | CLAUDE.md Regel 8 | Diese Subspec führt keine neuen User-Strings ein                                                   |
| `noUncheckedIndexedAccess`                       | tsconfig.json     | Index-Zugriffe (`p[0]`) müssen explizit auf `undefined` geprüft sein                               |
| TDD für `util/` ≥ 90 % Coverage                  | CLAUDE.md Regel 9 | `iconNameToCamelCase` test-first                                                                   |
| Bundle ≤ 60 kB minified, `@mdi/js` nicht in Prod | Hauptspec §2.1    | `pnpm build:analyze`-Verifikation im Plan; ESLint-Restriction als Sicherheitsnetz                  |

## 1. Kontext und Motivation

Beim Editor-Review wurden drei Beobachtungen gemacht:

1. **ID-Feld im Editor ist Pflichtfeld, aber wertlos für den User.** Die ID wird heute beim Hinzufügen automatisch auf `pv1`, `pv2`, `b1`, … gesetzt (`editor.ts:245` `_nextUniqueId`). Sie dient nur als interne Referenz für `battery.charged_by`-Pairing. Wenn der User die ID manuell ändert, kann er das Pairing brechen — es gibt keinen Nutzen, das Feld editierbar zu halten.

2. **Icon-Feld im Editor erscheint funktional, ist es aber nicht.** Der HA `icon`-Selector liefert `mdi:*`-Strings. `render/node-renderer.ts:244` verwirft alle Werte, die mit `mdi:` beginnen, und fällt auf Emoji-Defaults zurück. Der User setzt ein Icon im Editor, sieht aber weiterhin das Default-Emoji.

3. **Automatische Raumgruppierung leitet das Area-Icon korrekt ab, kann es aber nicht rendern.** `config/derive-display-consumers.ts:83` setzt `icon = areaEntry.icon` (typischerweise ein `mdi:*`-String aus dem HA Area-Registry). Dieses Icon landet auf `DisplayConsumer.icon` und durchläuft denselben Filter wie oben — und verschwindet damit.

Beobachtungen 2 und 3 hängen direkt zusammen: Sobald `mdi:*`-Rendering existiert, funktioniert die Raumgruppierung mit Area-Icon automatisch.

Sekundäre Motivation: In WSL/Linux ohne Color-Emoji-Font werden die heutigen Emoji-Defaults (☀ 🔋 ⚡ 🏠 🔌) als monochrome Glyphen oder Tofu-Boxen gerendert. README-Screenshots leiden darunter. Echte MDI-Icons sind als Vektor-SVG ausgeliefert und immer korrekt darstellbar.

## 2. Goals und Non-Goals

### 2.1 Goals

- ID-Textfeld aus Solar- und Battery-Sektion des Editors entfernen.
- Pairing-Dropdown zeigt `${name ?? \`${DE.nodes.solar} ${idx + 1}\`}`(also "Solar 1") als Fallback. Konsistent mit`nodeName`in`node-renderer.ts:221-236`, das ebenfalls `DE.nodes.solar` als Default-Präfix verwendet.
- Solar/Battery/Consumer-Icons aus dem Editor (`mdi:*`-Strings) werden tatsächlich gerendert.
- Area-Icons (aus `hass.areas[*].icon`) werden im `consumer_grouping: 'by_area'`-Mode tatsächlich gerendert.
- Diagnostics-Marker (Warnings) wird auf `mdi:alert-circle-outline` umgestellt.
- Default-Icons pro Knoten-Kind aus Hauptspec §3.2 werden zur Quelle der Wahrheit (`mdi:solar-power`, `mdi:battery`, `mdi:transmission-tower`, `mdi:home`, `mdi:power-plug`).
- Icon-Logik liegt in einem neuen `src/render/icon.ts`-Modul (Single-Source per ADR-0010).
- Sandbox (`examples/preview.html`) und Vitest-Tests rendern `ha-icon` über einen geteilten Stub, der echte MDI-Paths aus `@mdi/js` einbettet. Screenshots in WSL werden brauchbar.
- Emoji-Pass-Through bleibt erhalten: Wenn `entry.icon` nicht mit `mdi:` beginnt, wird der Wert direkt als Text gerendert.

### 2.2 Non-Goals

- Keine Änderung an `SolarConfig.id` / `BatteryConfigBase.id`-Typen — sie bleiben Pflichtfelder in YAML und TypeScript. Reine Editor-Sichtbarkeitsänderung.
- Keine Migration von Configs ohne ID — Validierung verlangt sie weiterhin (entstehen automatisch beim Hinzufügen).
- Keine Änderung am Verbraucher-Editor (hat heute kein ID-Feld, wird nicht eingeführt).
- Keine inline-`<path>`-Map in der Prod-Card (`mdi-paths.ts` aus Hauptspec §5.3 wird durch ha-icon ersetzt — dokumentiert in ADR-0020).
- Kein neues `icon`-Feld auf Home/Grid in der Editor-UI. Home/Grid-Editor-Erweiterungen sind separate Arbeit.
- Keine i18n-Erweiterung — keine neuen User-Strings.

## 3. Architektur

### 3.1 Editor-ID-Entfernung — `src/editor-list-sections.ts`

`renderSolarSection` und `renderBatterySection`: `{ name: 'id', selector: { text: {} }, required: true }` aus `itemSchema` entfernen. Die `id` bleibt im `data`-Objekt enthalten, damit ha-form sie beim `value-changed`-Event nicht verliert.

**Handler-Anpassung für Solar (Sicherheit):** `onItemChange` bekommt explizit ein Merge-Pattern statt direktem Cast:

```ts
// alt (editor-list-sections.ts:54):
@value-changed=${(e: CustomEvent) => h.onItemChange(i, e.detail.value as SolarConfig)}

// neu — analog Battery-Section (Zeile 156-159):
@value-changed=${(e: CustomEvent) => {
  const v = e.detail.value as Partial<SolarConfig>;
  h.onItemChange(i, { ...item, ...v } as SolarConfig);
}}
```

**Pairing-Dropdown in `renderBatterySection`:**

```ts
${solar.map((s, idx) => html`
  <option value=${s.id} ?selected=${item.charged_by === s.id}>
    ${s.name ?? `${DE.nodes.solar} ${idx + 1}`}
  </option>
`)}
```

`DE.nodes.solar` = `'Solar'` (`i18n/de.ts:8`).

### 3.2 Icon-Modul — `src/render/icon.ts` (NEU)

Single-Source für Default-Icons, Size-Konfiguration und Rendering. Wird sowohl von `node-renderer.ts` (Knoten-Icons) als auch `flow-renderer.ts` (Diagnostics-Icon) genutzt. Auslagerung ist auch nötig, weil `node-renderer.ts` heute schon bei 246 LOC liegt (`conventions.md §3` Limit 250).

```ts
// src/render/icon.ts
import { svg, type SVGTemplateResult } from 'lit';
import type { LayoutNode } from './layout';

export const DEFAULT_MDI_ICONS: Record<LayoutNode['kind'], string> = {
  pv: 'mdi:solar-power',
  battery: 'mdi:battery',
  grid: 'mdi:transmission-tower',
  home: 'mdi:home',
  consumer: 'mdi:power-plug',
};

interface IconBox {
  size: number; // foreignObject Kantenlänge in SVG-Units
  centerY: number; // y-Koordinate der Icon-Mitte (relativ zum Knoten-Zentrum)
  emojiFontSize: number; // Fallback für Emoji-Pass-Through
  emojiY: number; // text-baseline-y für Emoji-<text>
}

// Werte aus dem heutigen Code (node-renderer.ts:62-63, :93):
//   - home:     iconY=-10, font-size=28
//   - consumer: y=6,       font-size=18
//   - sonst:    iconY=-4,  font-size=22
const NODE_ICON_BOX: Record<LayoutNode['kind'], IconBox> = {
  pv: { size: 24, centerY: -4, emojiFontSize: 22, emojiY: -4 },
  battery: { size: 24, centerY: -4, emojiFontSize: 22, emojiY: -4 },
  grid: { size: 24, centerY: -4, emojiFontSize: 22, emojiY: -4 },
  home: { size: 32, centerY: -10, emojiFontSize: 28, emojiY: -10 },
  consumer: { size: 18, centerY: 6, emojiFontSize: 18, emojiY: 6 },
};

// Heutige Diagnostics-Werte (flow-renderer.ts:82-84): r=12 (Badge), text y=4
const DIAGNOSTICS_ICON_BOX: IconBox = {
  size: 18,
  centerY: 0,
  emojiFontSize: 13,
  emojiY: 4,
};

const DIAGNOSTICS_ICON_NAME = 'mdi:alert-circle-outline';

export function nodeIcon(
  kind: LayoutNode['kind'],
  configuredIcon: string | undefined,
): SVGTemplateResult {
  const box = NODE_ICON_BOX[kind];
  if (configuredIcon && !configuredIcon.startsWith('mdi:')) {
    return renderEmojiText(configuredIcon, box);
  }
  const iconName = configuredIcon ?? DEFAULT_MDI_ICONS[kind];
  return renderIconForeignObject(iconName, box);
}

export function diagnosticsIcon(): SVGTemplateResult {
  return renderIconForeignObject(DIAGNOSTICS_ICON_NAME, DIAGNOSTICS_ICON_BOX);
}

function renderEmojiText(text: string, box: IconBox): SVGTemplateResult {
  return svg`<text
    class="node-icon"
    text-anchor="middle"
    y="${box.emojiY}"
    font-size="${box.emojiFontSize}"
  >${text}</text>`;
}

function renderIconForeignObject(name: string, box: IconBox): SVGTemplateResult {
  const half = box.size / 2;
  return svg`
    <foreignObject
      x="${-half}"
      y="${box.centerY - half}"
      width="${box.size}"
      height="${box.size}"
      class="node-icon-fo"
    >
      <ha-icon
        icon="${name}"
        style="display:block; width:100%; height:100%; --mdc-icon-size: ${box.size}px; color: inherit;"
      ></ha-icon>
    </foreignObject>
  `;
}
```

**Vorteil der Datentrennung:** Sizes/Positionen sind in `NODE_ICON_BOX` zentral; Anpassung pro Knoten-Kind ist eine Datenänderung, kein Code-Diff. Tests können `nodeIcon` aufrufen und das Lit-`SVGTemplateResult` strukturell prüfen (siehe §6).

### 3.3 Renderer-Migration — `src/render/node-renderer.ts`

Konkrete Änderungen in `renderNode` (Zeilen 36–117):

1. **Neue Imports:** `import { nodeIcon } from './icon';`
2. **`<g>`-Wrapper bekommt `style="color: ${color};"`** — sonst erbt `<ha-icon>` (`color: inherit`) keine Farbe. Bisher hat `<g>` kein inline-`style`. Ersetzt durch:
   ```html
   <g
     transform="translate(${node.x} ${node.y})"
     class="node node--${node.kind} ${unavailable ? 'node--unavailable' : ''}"
     part="node node-${node.kind}"
     style="color: ${color};"
     role="button"
     tabindex="0"
     aria-label="${ariaLabel}"
     ...
   ></g>
   ```
3. **`nodeIconChar`-Aufrufer (Zeilen 93–95) ersetzen:** Heute:
   ```html
   <text class="node-icon" text-anchor="middle" y="${isConsumer ? 6 : iconY}" font-size="...">
     ${nodeIconChar(node, ctx)}
   </text>
   ```
   Neu:
   ```html
   ${nodeIcon(node.kind, configEntryForNode(node, ctx)?.icon)}
   ```
   (Sizing/Positionierung liegt jetzt im `nodeIcon`-Modul, nicht mehr inline.)
4. **`nodeIconChar` und `DEFAULT_ICONS` löschen** — beide werden durch `icon.ts` ersetzt. `configEntryForNode` bleibt private in `node-renderer.ts` (Resolver-Logik gegen RenderContext gehört hierher).
5. **Lokale `iconY` / Inline-font-size-Logik** (Zeilen 62, 93) für das Icon-Element entfernen. Sie werden durch `NODE_ICON_BOX` in `icon.ts` ersetzt. Achtung: `valueY` (Zeile 63) bleibt — das ist für `<text class="node-value">`, **nicht** für das Icon.

### 3.4 Diagnostics-Migration — `src/render/flow-renderer.ts`

Konkrete Änderungen in `renderDiagnostics` (Zeilen 46–88):

1. **Neuer Import:** `import { diagnosticsIcon } from './icon';`
2. **`<g>`-Style erweitern** auf `style="cursor: help; color: ${fill};"` (heute nur `cursor: help`).
3. **Die beiden `<circle>`-Elemente (Badge-Hintergrund + Outline) bleiben unverändert** — sie erzeugen den visuellen Indikator.
4. **`<text>!</text>` (Zeile 84) durch `${diagnosticsIcon()}` ersetzen.** Klick-Handler, `tabindex`, `aria-label`, `<title>` bleiben unverändert.

### 3.5 ha-icon-Stub — `examples/lib/ha-icon-stub.ts` (NEU)

Außerhalb von `src/` (ESLint-Layer-Check greift nicht). `tsconfig.preview.json` deckt `examples/**/*` bereits ab.

```ts
// examples/lib/ha-icon-stub.ts
import * as mdiAll from '@mdi/js';

export function iconNameToCamelCase(name: string): string {
  // 'mdi:alert-circle-outline' → 'mdiAlertCircleOutline'
  // 'mdi:battery'              → 'mdiBattery'
  // 'mdi:'                     → 'mdi'
  // 'battery'                  → 'mdiBattery'
  const slug = name.startsWith('mdi:') ? name.slice(4) : name;
  if (!slug) return 'mdi';
  return (
    'mdi' +
    slug
      .split('-')
      .filter((p) => p.length > 0)
      .map((p) => {
        const first = p[0] ?? ''; // noUncheckedIndexedAccess
        return first.toUpperCase() + p.slice(1);
      })
      .join('')
  );
}

function pathFor(name: string): string | undefined {
  const key = iconNameToCamelCase(name);
  return (mdiAll as Record<string, string>)[key];
}

class HaIconStub extends HTMLElement {
  static observedAttributes = ['icon'];

  connectedCallback(): void {
    this.update();
  }

  attributeChangedCallback(): void {
    this.update();
  }

  private update(): void {
    const name = this.getAttribute('icon') ?? '';
    const path = pathFor(name);
    this.innerHTML = path
      ? `<svg viewBox="0 0 24 24" style="width:100%;height:100%"><path d="${path}" fill="currentColor"/></svg>`
      : `<svg viewBox="0 0 24 24" style="width:100%;height:100%"><rect x="2" y="2" width="20" height="20" fill="none" stroke="currentColor" stroke-width="1"/></svg>`;
    if (!path && name) console.warn(`[ha-icon-stub] unknown icon: ${name}`);
  }
}

export function registerHaIconStub(): void {
  if (typeof customElements === 'undefined') return; // Node-Env safe
  if (!customElements.get('ha-icon')) {
    customElements.define('ha-icon', HaIconStub);
  }
}
```

**Sandbox-Wire-up:** `scripts/build-preview.mjs` baut `dist/preview/_preview-entry.ts` aus einem inline-Template-String. Dieses Template wird erweitert: erste Zeile der `previewSrc`-Variable wird

```ts
import { registerHaIconStub } from '../../examples/lib/ha-icon-stub';
registerHaIconStub();
```

vor dem heutigen `import { scenarios, buildMockHass } from '../../examples/preview-mocks';`. Damit ist `ha-icon` definiert, bevor das Card-Module via `examples/preview.html` Script-Tag den ersten Lit-Render auslöst.

**`examples/preview.html`** wird **nicht** geändert — sie lädt nur die fertigen `.js`-Files. Der Stub wird als TypeScript-Quelle in den Preview-Bundle gerollt.

### 3.6 Test-Setup — `tests/setup/ha-icon.ts` und Vitest-Konfig

Neue Datei für globales Test-Setup:

```ts
// tests/setup/ha-icon.ts
import { registerHaIconStub } from '../../examples/lib/ha-icon-stub';
registerHaIconStub();
```

`vitest.config.ts` erweitern:

```ts
test: {
  globals: true,
  environment: 'node',
  setupFiles: ['./tests/setup/ha-icon.ts'],   // NEU — wird in jedem Env vor Tests geladen
  environmentMatchGlobs: [
    ['**/editor*.test.ts', 'happy-dom'],       // matched editor.test.ts UND editor-list-sections.test.ts
    ['**/card.test.ts', 'happy-dom'],
    // ha-icon-stub.dom.test.ts nutzt file-level `// @vitest-environment happy-dom`
  ],
  ...
}
```

`setupFiles` läuft pro Test-Env. Der Stub-Guard `typeof customElements === 'undefined'` (im Code aus §3.5) macht den `registerHaIconStub`-Aufruf in Node-Env zu einem no-op. In Node-Env ist der Stub also inaktiv; Tests, die ha-icon-DOM-Verhalten brauchen, laufen explizit in happy-dom.

### 3.7 ESLint `no-restricted-imports` für `@mdi/js`

Verbindlicher Plan-Schritt — `@mdi/js` darf niemals von `src/` importiert werden, sonst landet es im Prod-Bundle. In `.eslintrc.cjs` zur `rules`-Sektion (greift global; `examples/` wird vom Lint-Script `eslint 'src/**/*.ts'` ohnehin ausgeschlossen):

```js
'no-restricted-imports': ['error', {
  patterns: [
    { group: ['@mdi/js', '@mdi/js/*'], message: 'Nur in examples/lib/ erlaubt; @mdi/js würde sonst ins Prod-Bundle.' },
  ],
}],
```

### 3.8 Layer-Boundaries — Kontrollpunkte

| Datei                          | Layer            | Neue Imports                 | Konformität                      |
| ------------------------------ | ---------------- | ---------------------------- | -------------------------------- |
| `src/render/icon.ts`           | `render/`        | `lit`, `./layout` (Type)     | ✓ (render → render Type-only OK) |
| `src/render/node-renderer.ts`  | `render/`        | `./icon` (sibling)           | ✓                                |
| `src/render/flow-renderer.ts`  | `render/`        | `./icon` (sibling)           | ✓                                |
| `src/editor-list-sections.ts`  | eigene Zone      | keine neuen externen Imports | ✓                                |
| `examples/lib/ha-icon-stub.ts` | außerhalb `src/` | `@mdi/js` (devDep)           | ✓ (kein Layer-Lint)              |

Keine neue Layer-Whitelist-Erweiterung in `.eslintrc.cjs` nötig.

## 4. Datenfluss

```
User setzt "icon: mdi:heat-pump" auf einem Consumer (Editor)
  ↓
_onConsumerItemChange → _emitChange → validateConfig → fireConfigChanged
  ↓
card.ts willUpdate → buildSystemState → RenderContext mit DisplayConsumer.icon
  ↓
renderNode (node-renderer.ts) ruft configEntryForNode(node, ctx)?.icon
  → liefert 'mdi:heat-pump'
  ↓
nodeIcon(node.kind, 'mdi:heat-pump') in icon.ts
  → renderIconForeignObject('mdi:heat-pump', NODE_ICON_BOX.consumer)
  ↓
Output: <foreignObject><ha-icon icon="mdi:heat-pump" style="…">…</ha-icon></foreignObject>
  ↓
7a. Prod (HA-Runtime): HA hat ha-icon registriert, lädt MDI-Asset, rendert SVG
7b. Sandbox/Tests: HaIconStub.attributeChangedCallback → innerHTML mit Path aus @mdi/js
```

Für Area-Icons gilt derselbe Pfad — `consumer.icon` wird durch `displayConsumer.icon` (aus `derive-display-consumers.ts:83`) ersetzt. Keine Code-Änderung in `derive-display-consumers.ts` nötig.

## 5. Fehlerverhalten

- **Unbekannter Icon-Name in Prod-HA:** ha-icon rendert ein leeres SVG. Akzeptabel — User-Error, keine Card-Crash-Quelle.
- **Unbekannter Icon-Name in Sandbox/Tests:** Stub rendert leeres Rechteck-Placeholder + `console.warn`. Sichtbares Feedback.
- **Leerer/undefined Icon-String + Standard-Knoten:** kann nicht auftreten, weil `DEFAULT_MDI_ICONS` und `NODE_ICON_BOX` für alle `LayoutNode['kind']`-Werte definiert sind (TypeScript Record-Typ erzwingt Exhaustiveness).
- **Emoji im `icon`-Feld:** Pass-Through-Pfad rendert weiter `<text>` mit korrekten font-size/y-Werten aus `NODE_ICON_BOX[kind].emojiY/emojiFontSize`. Test deckt das ab (§6.2).
- **Node-Env-Tests + customElements nicht definiert:** `registerHaIconStub` guard'ed via `typeof customElements === 'undefined'`. Stub inaktiv, kein Throw.

## 6. Tests

### 6.1 Unit — `iconNameToCamelCase` (Node-Env)

`examples/lib/ha-icon-stub.test.ts`:

```ts
it.each([
  ['mdi:battery', 'mdiBattery'],
  ['mdi:alert-circle-outline', 'mdiAlertCircleOutline'],
  ['mdi:', 'mdi'],
  ['battery', 'mdiBattery'],
  ['', 'mdi'],
  ['mdi:double--dash', 'mdiDoubleDash'], // Edge: leeres Segment
])('iconNameToCamelCase(%s) → %s', (input, expected) => {
  expect(iconNameToCamelCase(input)).toBe(expected);
});
```

### 6.2 Render — `nodeIcon` / `diagnosticsIcon` (Node-Env)

`src/render/icon.test.ts` (Node-Env reicht — wir prüfen die Lit-`SVGTemplateResult`-Struktur, nicht das gerenderte DOM):

```ts
import { nodeIcon, diagnosticsIcon } from './icon';

it('renders ha-icon for default-icon when no config-icon set', () => {
  const result = nodeIcon('pv', undefined);
  const flat = String.raw({ raw: result.strings }, ...result.values);
  expect(flat).toContain('<ha-icon');
  expect(flat).toContain('icon="mdi:solar-power"');
});

it('renders ha-icon with user-set mdi:* icon', () => {
  const result = nodeIcon('consumer', 'mdi:heat-pump');
  const flat = String.raw({ raw: result.strings }, ...result.values);
  expect(flat).toContain('icon="mdi:heat-pump"');
});

it('falls through to <text> for emoji icon', () => {
  const result = nodeIcon('pv', '☀');
  const flat = String.raw({ raw: result.strings }, ...result.values);
  expect(flat).toContain('<text');
  expect(flat).toContain('☀');
  expect(flat).not.toContain('<foreignObject');
});

it('diagnosticsIcon uses alert-circle-outline', () => {
  const result = diagnosticsIcon();
  const flat = String.raw({ raw: result.strings }, ...result.values);
  expect(flat).toContain('icon="mdi:alert-circle-outline"');
});
```

### 6.3 Stub-DOM — `HaIconStub` (Happy-DOM-Env)

`examples/lib/ha-icon-stub.dom.test.ts` mit `// @vitest-environment happy-dom`:

```ts
it('renders <svg><path> with d-attribute when icon is known', () => {
  registerHaIconStub();
  const el = document.createElement('ha-icon');
  el.setAttribute('icon', 'mdi:battery');
  document.body.appendChild(el);
  expect(el.innerHTML).toContain('<svg');
  expect(el.innerHTML).toMatch(/<path d="[^"]+"/);
});
```

### 6.4 Editor — kein ID-Feld + Merge-Pattern (Happy-DOM-Env)

`src/editor-list-sections.test.ts` (neu, gleicher Glob wie `editor.test.ts` — sollte zu happy-dom matchen; falls nicht, file-level `@vitest-environment`-Comment):

- Schema-Array für Solar enthält kein `{ name: 'id' }`
- Schema-Array für Battery enthält kein `{ name: 'id' }`
- Bei `value-changed` mit Teil-Daten (ohne `id`) bleibt `id` im resultierenden Item erhalten (Merge-Pattern)
- Pairing-Dropdown ohne Solar-`name` rendert `"Solar 1"`, `"Solar 2"`, nicht `"pv1"`, `"pv2"`

### 6.5 Sandbox — visuelle Akzeptanz

Manuelle Verifikation: `pnpm preview` öffnen, Card mit Default-Config rendern, prüfen dass alle Knoten-Icons als saubere SVGs erscheinen (kein Emoji, kein Tofu). Screenshot in WSL möglich.

### 6.6 Coverage

`icon.ts` und `iconNameToCamelCase` fallen unter die ≥90 %-Coverage-Pflicht für `util/`-artige Module nicht direkt (nicht in `src/util/`), aber die Tests oben decken alle Branches ab. Die `vitest.config.ts` `coverage.include` ist heute auf `src/engine/**`, `src/config/**`, `src/util/**` beschränkt — Renderer-Coverage ist nicht hard-enforced. Plan-Schritt prüft nur grün, nicht ≥90 %.

## 7. Auswirkung auf Hauptspec

§3.2 (Default-Icons): unverändert, wird jetzt tatsächlich Quelle der Wahrheit.

§5.3 (Icon-Rendering): Plan zur inline-`<path>`-Map (`mdi-paths.ts`) wird **verworfen**. Stattdessen `ha-icon` via foreignObject. Spec-Text muss aktualisiert werden — entweder im selben PR oder als Folge-Doc-Commit. Begründung in ADR-0020 (siehe §8).

§9 (Offene Punkte): MDI-Icon-Rendering verschwindet aus der „offene Punkte"-Liste.

§7 (Diagnostics-Icon): `mdi:alert-circle-outline` wird umgesetzt statt des „!"-Textes.

## 8. ADR-0020 — verpflichtend

**Titel:** `0020-ha-icon-via-foreignobject.md`

**Inhalt (Kurzform für den Planer — Vollform per `0000-template.md`):**

- **Kontext:** Hauptspec §5.3 plant Inline-`<path>`-Map (`mdi-paths.ts`) für die ~5 Default-Icons. Mit der Subspec 2026-05-11 (Verbraucher-Gruppierung) kommen Area-Icons hinzu, die zur Compile-Zeit nicht bekannt sind. Eine statische Map kann sie nicht abdecken.
- **Optionen:**
  - A — `<ha-icon>` via `<foreignObject>` (HA-globales CE, deckt alle dynamischen Icons ab)
  - B — Inline-Path-Map (Hauptspec-Plan, Wartungslast + funktioniert nur für bekannte Set)
  - C — Hybrid (Defaults inline, dynamische via ha-icon — zwei Code-Pfade)
- **Entscheidung:** A. Begründung: dynamische User-/Area-Icons + null Wartungslast wiegen mehr als 1–2 kB Bundle-Ersparnis.
- **Konsequenzen:** Sandbox/Tests brauchen Stub via `@mdi/js` (DevDep). Prod-Bundle hängt davon ab, dass HA's MDI-Asset zur Runtime vorhanden ist (in HA garantiert).

Anlegen vor Code-Änderungen (Plan-Schritt 1).

## 9. Out-of-Scope, aber im Hinterkopf

- **Verbraucher-ID:** Konsumenten haben heute kein ID-Feld im Editor. Auto-Generation der DisplayConsumer-ID via Index passt zur Subspec-Logik. Keine Änderung nötig.
- **Home-Section im Editor:** existiert heute nicht. Wenn sie eingeführt wird, profitiert sie automatisch vom selben Icon-Rendering.
- **i18n-Erweiterung:** Diese Subspec ist Deutsch-only und führt keine neuen Strings ein.
- **Card-Mod `::part()`-Hooks:** Das neue `<g style="color: …">` überschreibt `currentColor`. Themability via CSS-Var bleibt möglich, aber `card-mod`-User können nicht mehr per `color:` overriden ohne `!important`. Akzeptabel für v1.0, ggf. v1.x-Refinement.

## 10. Risiken

| Risiko                                                                              | Wahrscheinlichkeit | Auswirkung                               | Mitigation                                                                                                   |
| ----------------------------------------------------------------------------------- | ------------------ | ---------------------------------------- | ------------------------------------------------------------------------------------------------------------ |
| Lit `svg`-Template mit `<foreignObject>` + HTML-Inhalt funktioniert nicht           | niedrig            | Icons rendern nicht in Prod oder Sandbox | **Plan-Schritt 0: Spike** — minimales `<foreignObject><ha-icon>` rendern, in Sandbox verifizieren            |
| `<foreignObject>` in HA-Dashboard nicht zuverlässig (alte Browser)                  | niedrig            | Icons fehlen in Prod                     | Manuelle Verifikation in echtem HA vor Release; Hauptspec §9 Browser-Kompatibilität gilt                     |
| `@mdi/js` versehentlich in Prod-Bundle                                              | mittel             | Bundle >> 60 kB                          | DevDependency + ESLint `no-restricted-imports` + `pnpm build:analyze` als Plan-Schritt                       |
| ha-form verliert die `id` nicht-im-Schema beim `value-changed`-Event                | niedrig            | ID geht beim ersten Edit verloren        | Solar-Handler auf Merge-Pattern; Test deckt das ab (§6.4)                                                    |
| Default-Icon-Größen passen nicht zu allen Knoten optisch                            | mittel             | Visuell unsauber, leichte Layout-Drift   | `NODE_ICON_BOX` zentral; manuelle Sandbox-Verifikation; Anpassung als Datenänderung möglich                  |
| `@mdi/js` namespace-Import bläht Sandbox-Bundle auf                                 | hoch               | Längerer Dev-Build (kein Prod-Impact)    | Akzeptiert (Dev-only). Falls Build > 10 s wird: später auf curated path-map oder dynamische Imports wechseln |
| happy-dom Custom-Element-Reaktivität (`attributeChangedCallback`) ist unvollständig | niedrig            | Stub-DOM-Test (§6.3) failed              | Test umschreiben — Stub manuell instantiieren statt via `document.createElement`                             |
| `card-mod`-User können `currentColor` nicht mehr via `color:` override              | niedrig            | Edge-Case Theming-Inkompatibilität       | Dokumentiert in §9 Out-of-Scope; v1.x-Refinement falls gewünscht                                             |

## 11. Erfolgs-Kriterien

- [ ] ID-Feld erscheint nicht mehr im Editor für Solar und Battery
- [ ] Pairing-Dropdown zeigt `"Solar 1"`, `"Solar 2"` statt `"pv1"`, `"pv2"` für unbenannte Solar-Einträge
- [ ] User-konfiguriertes `mdi:heat-pump` auf einem Consumer erscheint als gerendertes Icon (sowohl in Prod als auch Sandbox)
- [ ] Area-Icons (z. B. Wohnzimmer: `mdi:sofa`) erscheinen im `by_area`-Grouping-Mode
- [ ] Diagnostics-Marker rendert `mdi:alert-circle-outline` statt `"!"`
- [ ] `pnpm test` grün
- [ ] `pnpm check` grün (lint + typecheck + tests)
- [ ] `pnpm build` produziert Bundle ≤ 60 kB minified
- [ ] `pnpm build:analyze` zeigt **kein** `@mdi/js` in `dist/custom-energy-flow-card.js`
- [ ] Sandbox-Screenshot in WSL zeigt korrekte Icons (qualitativ)
- [ ] ADR-0020 angelegt, im ADR-Index referenziert
- [ ] README-Screenshots (`docs/screenshots/*.png`) auf Stand mit MDI-Icons

## 12. Plan-Schritte (Reihenfolge mit Begründung)

1. **Spike (~30 min):** minimales Beispiel `<g><circle><foreignObject><ha-icon mdi:battery></ha-icon></foreignObject></g>` in der heutigen Sandbox einbauen und prüfen, dass Lit-`svg`-Template + foreignObject + HTML funktioniert. Risiko-Mitigation für §10.
2. **ADR-0020 anlegen** + ADR-Index aktualisieren. Vor jeglicher Implementation, weil sie die Strategie-Wahl dokumentiert (conventions.md §12).
3. **`@mdi/js` als DevDep installieren** + ESLint `no-restricted-imports` für `@mdi/js`.
4. **`examples/lib/ha-icon-stub.ts` + Test (`ha-icon-stub.test.ts`)** — pure `iconNameToCamelCase`-Tests test-first (Node-Env), Stub-Klasse implementieren mit `customElements`-Guard.
5. **`tests/setup/ha-icon.ts` + `vitest.config.ts` setupFiles erweitern.**
6. **`src/render/icon.ts` neu anlegen + `src/render/icon.test.ts`** — TDD für `nodeIcon` und `diagnosticsIcon` über Lit-`SVGTemplateResult`-Strukturprüfung.
7. **`node-renderer.ts` migrieren** — `nodeIconChar`/`DEFAULT_ICONS` löschen, `<g>` mit `style="color: …"`, neuer `nodeIcon`-Aufruf, inline icon-y/font-size aufräumen.
8. **`flow-renderer.ts` migrieren** — Diagnostics auf `diagnosticsIcon()`, `<g>` mit `style="color: …"`.
9. **`editor-list-sections.ts` bereinigen** — `id`-Feld aus Schemata raus, Solar-Handler auf Merge-Pattern, Pairing-Dropdown-Fallback auf `${DE.nodes.solar} ${idx + 1}`.
10. **Editor-Tests (`editor-list-sections.test.ts`)** für Schema-ohne-`id` + Merge-Verhalten + Pairing-Fallback.
11. **`scripts/build-preview.mjs`** Preview-Entry-Template um `registerHaIconStub()`-Import erweitern (erste Zeile).
12. **`pnpm check` + `pnpm build:analyze`** verifizieren — `@mdi/js` nicht in `dist/custom-energy-flow-card.js`, Bundle ≤ 60 kB.
13. **Sandbox + manuelle Verifikation** — `pnpm preview`, alle Default-Szenarien durchklicken; Area-Icon-Szenario mit `mdi:sofa` oder ähnlich.
14. **Hauptspec aktualisieren** — §3.2 als Quelle bestätigen, §5.3 auf ha-icon umschreiben, §9 MDI-Punkt entfernen, §7 auf `mdi:alert-circle-outline` aktualisieren. Conventional-Commit `docs(specs): …`.
15. **README-Screenshots regenerieren** — `pnpm preview` als Quelle, neue Screenshots in `docs/screenshots/`.

Erwarteter Gesamtumfang: 15 Plan-Schritte (1+2 sind Vorab-Gates, 3–12 sind Implementation, 13–15 sind Doku/Verifikation).
