# Subspec — MDI-Icon-Rendering & Editor-ID-Cleanup

**Status:** v1 (proposed, ready for plan)
**Datum:** 2026-05-13
**Autor:** Brainstorming-Session mit @griebner
**Verlinkte Hauptspec:** [`2026-05-10-custom-energy-flow-card-design.md`](./2026-05-10-custom-energy-flow-card-design.md)
**Berührte CLAUDE.md-Regeln:** 2, 3, 5, 8, 9, 10
**Berührte ADRs:** 0003 (No Runtime Deps außer Lit), 0009 (Layer-Boundaries), 0010 (Shared Util)

## 0. Zusammenfassung

Zwei kleine, voneinander unabhängige UI-Korrekturen in einer Subspec gebündelt, weil sie aus derselben Editor-Review entstanden sind:

1. **Editor-ID-Cleanup** — Das `id`-Textfeld verschwindet aus Solar- und Battery-Sektion des Editors. IDs werden ausschließlich beim Hinzufügen via `_nextUniqueId` auto-generiert. Pairing-Dropdown bei Akkus zeigt `${name ?? \`PV ${i+1}\`}` statt der internen ID als Fallback. Keine Breaking Change: YAML-Persistenz, Typen und Validierung bleiben identisch.

2. **MDI-Icon-Rendering** — User- und Area-konfigurierte `mdi:*`-Icons werden tatsächlich gerendert (heute werden sie verworfen, siehe §1). Implementation via `<ha-icon>` (HA-globales Custom Element) in einem SVG-`<foreignObject>`-Wrapper. Default-Icons aus Spec §3.2 wandern in eine Konstante. Emoji-Pass-Through bleibt erhalten. Diagnostics-`"!"`-Marker wird gleichzeitig auf `mdi:alert-circle-outline` umgestellt, weil er den gleichen Code-Pfad nutzen kann.

Für Tests und Screenshots wird im Sandbox/Test-Setup ein `ha-icon`-Stub registriert, der `@mdi/js` (DevDep, tree-shakable, prod-Bundle unberührt) als Path-Quelle nutzt und das Icon als inline-SVG rendert. Damit werden die WSL-Emoji-Render-Probleme in Screenshots gelöst, und Render-Tests können das tatsächliche Markup verifizieren.

### 0.1 Harte Constraints für den Planer

| Constraint                           | Quelle            | Konsequenz bei Verletzung                                                                          |
| ------------------------------------ | ----------------- | -------------------------------------------------------------------------------------------------- |
| Keine Runtime-Deps außer Lit         | ADR-0003          | `@mdi/js` ist **DevDependency** (Sandbox/Tests), nicht `dependency`. Prod-Bundle bleibt ≤ 60 kB.   |
| `ha-icon` ist HA-global, kein Import | Hauptspec §6.4.2  | Nur via Lit-Template benutzen; Typ-Declaration bereits in `src/ha/ha-globals.d.ts:16` vorhanden    |
| ESLint-Zonen für Layer-Imports       | ADR-0009          | `render/` darf nur `config/types.ts` aus config/ importieren; Resolver-Logik liegt im render-Layer |
| Engine pure                          | ADR-0004          | Icon-Resolution passiert im Renderer, nicht in der Engine                                          |
| `card.ts` ≤ 200 LOC                  | CLAUDE.md Regel 3 | Keine relevante LOC-Änderung erwartet (Renderer-only)                                              |
| User-Strings aus `i18n/de.ts`        | CLAUDE.md Regel 8 | Diese Subspec führt keine neuen User-Strings ein                                                   |
| TDD für `util/` ≥ 90 % Coverage      | CLAUDE.md Regel 9 | `iconNameToCamelCase`-Helper (für ha-icon-Stub) wird test-first                                    |
| Bundle ≤ 60 kB minified              | Hauptspec §2.1    | `<foreignObject>` ist nativer SVG-Tag, kein zusätzlicher Code                                      |

## 1. Kontext und Motivation

Beim Editor-Review wurden drei Beobachtungen gemacht:

1. **ID-Feld im Editor ist Pflichtfeld, aber wertlos für den User.** Die ID wird heute beim Hinzufügen automatisch auf `pv1`, `pv2`, `b1`, … gesetzt (`editor.ts:245` `_nextUniqueId`). Sie dient nur als interne Referenz für `battery.charged_by`-Pairing. Wenn der User die ID manuell ändert, kann er das Pairing brechen — es gibt keinen Nutzen, das Feld editierbar zu halten.

2. **Icon-Feld im Editor erscheint funktional, ist es aber nicht.** Der HA `icon`-Selector liefert `mdi:*`-Strings. `render/node-renderer.ts:244` verwirft alle Werte, die mit `mdi:` beginnen, und fällt auf Emoji-Defaults zurück. Der Code-Kommentar dokumentiert das als v1.x-Deferral mit Verweis auf Hauptspec §9. Resultat: Der User setzt ein Icon im Editor, sieht aber weiterhin das Default-Emoji.

3. **Automatische Raumgruppierung leitet das Area-Icon korrekt ab, kann es aber nicht rendern.** `config/derive-display-consumers.ts:83` setzt `icon = areaEntry.icon` (typischerweise ein `mdi:*`-String aus dem HA Area-Registry). Dieses Icon landet auf `DisplayConsumer.icon` und durchläuft denselben Filter wie oben — und verschwindet damit.

Beobachtungen 2 und 3 hängen direkt zusammen: Sobald `mdi:*`-Rendering existiert, funktioniert die Raumgruppierung mit Area-Icon automatisch.

Sekundäre Motivation: In WSL/Linux ohne Color-Emoji-Font werden die heutigen Emoji-Defaults (☀ 🔋 ⚡ 🏠 🔌) als monochrome Glyphen oder Tofu-Boxen gerendert. README-Screenshots leiden darunter. Echte MDI-Icons sind als Vektor-SVG ausgeliefert und immer korrekt darstellbar.

## 2. Goals und Non-Goals

### 2.1 Goals

- ID-Textfeld aus Solar- und Battery-Sektion des Editors entfernen, sodass der User es nicht mehr sieht/setzen kann.
- Pairing-Dropdown zeigt `${name ?? \`PV ${i+1}\`}` statt `${name ?? id}`.
- Solar/Battery/Consumer-Icons aus dem Editor (`mdi:*`-Strings) werden tatsächlich gerendert.
- Area-Icons (aus `hass.areas[*].icon`) werden im `consumer_grouping: 'by_area'`-Mode tatsächlich gerendert.
- Diagnostics-Marker (Warnings) wird auf `mdi:alert-circle-outline` umgestellt — gleicher Code-Pfad wie alle anderen Icons.
- Default-Icons pro Knoten-Kind aus Hauptspec §3.2 werden zur Quelle der Wahrheit (`mdi:solar-power`, `mdi:battery`, `mdi:transmission-tower`, `mdi:home`, `mdi:power-plug`).
- Sandbox (`examples/preview.html`) und Vitest-Tests rendern `ha-icon` über einen geteilten Stub, der echte MDI-Paths aus `@mdi/js` einbettet. Screenshots in WSL werden brauchbar.
- Emoji-Pass-Through bleibt erhalten: Wenn `entry.icon` nicht mit `mdi:` beginnt, wird der Wert direkt als Text gerendert.

### 2.2 Non-Goals

- Keine Änderung an `SolarConfig.id` / `BatteryConfigBase.id`-Typen — sie bleiben Pflichtfelder in YAML und TypeScript. Reine Editor-Sichtbarkeitsänderung.
- Keine Migration von Configs ohne ID — Validierung verlangt sie weiterhin (entstehen automatisch beim Hinzufügen).
- Keine Änderung am `Verbraucher`-Editor (hat heute kein ID-Feld, wird nicht eingeführt).
- Keine inline-`<path>`-Map in der Prod-Card (`mdi-paths.ts` aus Hauptspec §5.3 wird durch ha-icon ersetzt).
- Kein neues `icon`-Feld auf Home/Grid in der Editor-UI. Home/Grid-Editor-Erweiterungen sind separate Arbeit.
- Keine i18n-Erweiterung — keine neuen User-Strings.

## 3. Architektur

### 3.1 Editor-ID-Entfernung — `src/editor-list-sections.ts`

`renderSolarSection` und `renderBatterySection`: `{ name: 'id', selector: { text: {} }, required: true }` aus `itemSchema` entfernen. Die `id` bleibt im `data`-Objekt enthalten, damit ha-form sie beim `value-changed`-Event nicht verliert.

Handler-Anpassung für Sicherheit: `onItemChange` bekommt im Solar-Section explizit ein Merge `{ ...item, ...v }` statt `value as SolarConfig`, um beizubehalten, was nicht im Schema steht (Battery-Section macht das bereits, `editor-list-sections.ts:156-159`).

Pairing-Dropdown in `renderBatterySection`:

```ts
${solar.map((s, idx) => html`
  <option value=${s.id} ?selected=${item.charged_by === s.id}>
    ${s.name ?? `${DE.nodes.solar} ${idx + 1}`}
  </option>
`)}
```

`DE.nodes.solar` existiert bereits (`i18n/de.ts`).

### 3.2 Icon-Rendering — `src/render/node-renderer.ts`

Neue Konstante ersetzt `DEFAULT_ICONS`:

```ts
const DEFAULT_MDI_ICONS: Record<LayoutNode['kind'], string> = {
  pv: 'mdi:solar-power',
  battery: 'mdi:battery',
  grid: 'mdi:transmission-tower',
  home: 'mdi:home',
  consumer: 'mdi:power-plug',
};
```

`nodeIconChar` wird zu `nodeIcon` und liefert einen `SVGTemplateResult` zurück:

```ts
export function nodeIcon(node: LayoutNode, ctx: RenderContext): SVGTemplateResult {
  const entry = configEntryForNode(node, ctx);
  const configured = entry?.icon;

  if (configured && !configured.startsWith('mdi:')) {
    // Emoji / Text Pass-Through (Bestandsverhalten)
    return svg`<text class="node-icon" text-anchor="middle" ...>${configured}</text>`;
  }

  const iconName = configured ?? DEFAULT_MDI_ICONS[node.kind];
  return renderHaIcon(iconName, node);
}
```

`renderHaIcon` ist eine neue Helper-Funktion (im selben Modul oder in `render/icon-helpers.ts`):

```ts
function renderHaIcon(name: string, node: LayoutNode): SVGTemplateResult {
  const size = iconSizeFor(node.kind); // home: 32, consumer: 18, default: 24
  const half = size / 2;
  return svg`
    <foreignObject
      x="${-half}"
      y="${-half + iconYOffsetFor(node.kind)}"
      width="${size}"
      height="${size}"
      class="node-icon-fo"
    >
      <ha-icon
        icon="${name}"
        style="display:block; width:100%; height:100%; --mdc-icon-size: ${size}px; color: inherit;"
      ></ha-icon>
    </foreignObject>
  `;
}
```

Color-Inheritance: `<g class="node">` setzt `color: <stroke-color>` via inline-Style; `ha-icon` rendert per `currentColor`.

Der Aufrufer in `renderNode` ersetzt den heutigen `<text class="node-icon">…${nodeIconChar(...)}</text>`-Block durch `${nodeIcon(node, ctx)}`.

### 3.3 Diagnostics-Icon — `src/render/flow-renderer.ts`

`renderDiagnostics` ersetzt nur das `<text>!</text>`-Element durch einen `<foreignObject>`-Wrapper mit `<ha-icon icon="mdi:alert-circle-outline">`. Die beiden umgebenden `<circle>`-Elemente (Badge-Hintergrund + Outline) bleiben erhalten — sie erzeugen den visuellen "Indikator"-Eindruck und sind unabhängig vom Icon. Klick-Handler, `tabindex`, `aria-label` und `<title>` bleiben unverändert. Farbe via inline-`color`-Style.

### 3.4 ha-icon-Stub für Sandbox & Tests — `examples/lib/ha-icon-stub.ts`

Neue Datei (außerhalb von `src/`, deshalb keine Layer-Verstöße):

```ts
import * as mdiAll from '@mdi/js';

function iconNameToCamelCase(name: string): string {
  // 'mdi:alert-circle-outline' → 'mdiAlertCircleOutline'
  const slug = name.startsWith('mdi:') ? name.slice(4) : name;
  return (
    'mdi' +
    slug
      .split('-')
      .map((p) => p[0].toUpperCase() + p.slice(1))
      .join('')
  );
}

function pathFor(name: string): string | undefined {
  return (mdiAll as Record<string, string>)[iconNameToCamelCase(name)];
}

class HaIconStub extends HTMLElement {
  static observedAttributes = ['icon'];
  connectedCallback() {
    this.update();
  }
  attributeChangedCallback() {
    this.update();
  }
  private update() {
    const name = this.getAttribute('icon') ?? '';
    const path = pathFor(name);
    this.innerHTML = path
      ? `<svg viewBox="0 0 24 24" style="width:100%;height:100%"><path d="${path}" fill="currentColor"/></svg>`
      : `<svg viewBox="0 0 24 24" style="width:100%;height:100%"><rect x="2" y="2" width="20" height="20" fill="none" stroke="currentColor" stroke-width="1"/></svg>`;
    if (!path && name) console.warn(`[ha-icon-stub] unknown icon: ${name}`);
  }
}

export function registerHaIconStub(): void {
  if (!customElements.get('ha-icon')) {
    customElements.define('ha-icon', HaIconStub);
  }
}
```

`examples/preview.html` importiert und ruft `registerHaIconStub()` **vor** dem Card-Module-Import auf.

Vitest-Setup (`vitest.config.ts` → `test.setupFiles`): neue `tests/setup/ha-icon.ts`, die `registerHaIconStub()` einmal pro Test-Session aufruft.

`iconNameToCamelCase` wird test-first geschrieben (`tests/lib/icon-name.test.ts`) — pure function, einfach abdeckbar. Edge-Cases: leerer String, fehlender `mdi:`-Präfix, mehrteilige Slugs (`alert-circle-outline`), Single-Word-Slugs (`battery`).

### 3.5 Layer-Boundaries

- `render/node-renderer.ts` und `render/flow-renderer.ts` bleiben in Layer `render/`. Icon-Resolver-Logik ist Renderer-Detail.
- `examples/lib/ha-icon-stub.ts` liegt außerhalb von `src/`, kein ESLint-Layer-Check greift.
- `@mdi/js` wird **ausschließlich** in `examples/lib/ha-icon-stub.ts` importiert. Wenn der Build versucht, `src/` daraus zu importieren, blockt ESLint via `no-restricted-imports`-Regel (zu prüfen, ob das im Plan ergänzt werden muss).

## 4. Datenfluss

```
1. User setzt im Editor "icon: mdi:heat-pump" auf einem Consumer
   ↓
2. _onConsumerItemChange → _emitChange → validateConfig → fireConfigChanged
   ↓
3. card.ts willUpdate → buildSystemState → derived RenderContext
   (consumer.icon bleibt im configEntryForNode-Lookup auflösbar)
   ↓
4. renderNode → nodeIcon(node, ctx)
   ↓
5. configured = 'mdi:heat-pump' → renderHaIcon('mdi:heat-pump', node)
   ↓
6. <foreignObject><ha-icon icon="mdi:heat-pump">…</ha-icon></foreignObject>
   ↓
7a. Prod (HA-Runtime): HA registriert ha-icon, lädt MDI-Asset, rendert SVG
7b. Sandbox/Tests: registerHaIconStub() rendert path aus @mdi/js
```

Für Area-Icons gilt derselbe Pfad ab Schritt 3, wobei `consumer.icon` durch `displayConsumer.icon` (aus `derive-display-consumers.ts:83`) ersetzt wird.

## 5. Fehlerverhalten

- **Unbekannter Icon-Name in Prod-HA:** ha-icon rendert ein leeres SVG. Akzeptabel — User-Error, keine Card-Crash-Quelle.
- **Unbekannter Icon-Name in Sandbox/Tests:** Stub rendert leeres Rechteck + `console.warn`. Sichtbares Feedback.
- **Leerer/undefined Icon-String + nicht-Standard-Knoten:** kann nicht auftreten, weil `DEFAULT_MDI_ICONS` für alle `LayoutNode['kind']`-Werte definiert ist (TypeScript Record-Typ erzwingt Exhaustiveness).
- **Emoji im `icon`-Feld:** Pass-Through-Pfad rendert weiter `<text>`, unverändert. Coverage durch Bestand-Tests (ggf. neuer Test als Doku).

## 6. Tests

### 6.1 Unit — `iconNameToCamelCase`

`tests/lib/icon-name.test.ts`:

- `'mdi:battery'` → `'mdiBattery'`
- `'mdi:alert-circle-outline'` → `'mdiAlertCircleOutline'`
- `'mdi:'` → `'mdi'` (Edge)
- `'battery'` (kein Präfix) → `'mdiBattery'`
- `''` → `'mdi'`

### 6.2 Render — `nodeIcon`

`src/render/node-renderer.test.ts` (Datei evtl. neu):

- Default-Knoten (kein `icon` im config) → `<foreignObject>` mit `<ha-icon icon="mdi:…">` aus `DEFAULT_MDI_ICONS`
- Config-Icon `mdi:heat-pump` → `<ha-icon icon="mdi:heat-pump">`
- Config-Icon `'☀'` → `<text class="node-icon">☀</text>` (Pass-Through)
- Stub-Verifikation: `<svg><path>` mit korrektem `d`-Attribut im DOM-Output (über happy-dom)

### 6.3 Editor — kein ID-Feld

`src/editor-list-sections.test.ts` (oder neue Test-Datei):

- Schema-Array für Solar enthält kein `{ name: 'id' }`
- Schema-Array für Battery enthält kein `{ name: 'id' }`
- Bei `value-changed` mit Teil-Daten bleibt `id` im resultierenden Item erhalten (Merge-Verhalten)
- Pairing-Dropdown ohne Name fallback'ed auf `"PV {n}"`, nicht auf `pv{n}`

### 6.4 Editor — `setConfig` mit existierender ID-Config bleibt funktional (Regression)

Existierende `editor.test.ts`-Tests (falls vorhanden) müssen weiter grün sein.

### 6.5 Sandbox — visuelle Akzeptanz

Manuelle Verifikation: `pnpm preview` öffnen, Card mit Default-Config rendern, prüfen dass alle Knoten-Icons als saubere SVGs erscheinen (kein Emoji, kein Tofu). Screenshot in WSL möglich.

## 7. Auswirkung auf Hauptspec

§3.2 (Default-Icons): unverändert, wird jetzt tatsächlich Quelle der Wahrheit.

§5.3 (Icon-Rendering): Plan zur inline-`<path>`-Map (mdi-paths.ts) wird verworfen. Stattdessen `ha-icon`. Spec-Text muss aktualisiert werden (Folge-PR oder im selben Plan).

§9 (Offene Punkte): MDI-Icon-Rendering verschwindet aus der „offene Punkte"-Liste.

§7 (Diagnostics-Icon): `mdi:alert-circle-outline` wird umgesetzt statt des „!"-Textes.

## 8. Out-of-Scope, aber im Hinterkopf

- **Verbraucher-ID:** Konsumenten haben heute kein ID-Feld im Editor. Auto-Generation der DisplayConsumer-ID via Index passt zur Subspec-Logik. Keine Änderung nötig.
- **Home-Section im Editor:** existiert heute nicht. Wenn sie eingeführt wird, profitiert sie automatisch vom selben Icon-Rendering.
- **i18n-Erweiterung:** Diese Subspec ist Deutsch-only und führt keine neuen Strings ein.
- **ESLint `no-restricted-imports` für `@mdi/js`:** Plan-Schritt zur Verifikation einbauen, um zu garantieren, dass `src/` niemals aus `@mdi/js` importiert (sonst landet's im Prod-Bundle).

## 9. Risiken

| Risiko                                                               | Wahrscheinlichkeit | Auswirkung                             | Mitigation                                                                                 |
| -------------------------------------------------------------------- | ------------------ | -------------------------------------- | ------------------------------------------------------------------------------------------ |
| `<foreignObject>` in HA-Dashboard nicht zuverlässig gerendert        | niedrig            | Icons fehlen in Prod                   | Manuelle Verifikation in echtem HA vor Release; Spec §1010+ Browser-Kompatibilität gilt    |
| `@mdi/js` versehentlich in Prod-Bundle                               | mittel             | Bundle >> 60 kB                        | DevDependency, ESLint-Regel, `pnpm build:analyze`-Check im Plan                            |
| ha-form verliert die `id` nicht-im-Schema beim `value-changed`-Event | niedrig            | ID geht beim ersten Edit verloren      | Solar-Handler auf Merge-Pattern (`{...item, ...v}`) umstellen; Test deckt das ab           |
| Default-Icon-Größen passen nicht zu allen Knoten                     | mittel             | Visuell unsauber, leichte Layout-Drift | `iconSizeFor`/`iconYOffsetFor` zentral; manuelle Verifikation; Anpassung im Plan-Schritt 4 |
| ha-icon in happy-dom nicht das richtige `currentColor` erbt          | niedrig            | Test-Screenshot vs. Prod weicht ab     | Stub rendert nur Markup; visuelle Verifikation passiert in Sandbox, nicht in Vitest        |

## 10. Erfolgs-Kriterien

- [ ] ID-Feld erscheint nicht mehr im Editor für Solar und Battery
- [ ] Pairing-Dropdown zeigt `"PV 1"`, `"PV 2"` statt `"pv1"`, `"pv2"` für unbenannte Solar-Einträge
- [ ] User-konfiguriertes `mdi:heat-pump` auf einem Consumer erscheint als gerendertes Icon (sowohl in Prod als auch Sandbox)
- [ ] Area-Icons (z. B. Wohnzimmer: `mdi:sofa`) erscheinen im `by_area`-Grouping-Mode
- [ ] Diagnostics-Marker rendert `mdi:alert-circle-outline` statt `"!"`
- [ ] `pnpm test` grün
- [ ] `pnpm check` grün (lint + typecheck + tests)
- [ ] `pnpm build` produziert Bundle ≤ 60 kB minified (kein @mdi/js drin)
- [ ] Sandbox-Screenshot in WSL zeigt korrekte Icons (qualitativ)

## 11. Aufwand-Schätzung

Klein. Hauptaufwand:

1. ha-icon-Stub + Tests (~1 h)
2. Renderer-Umbau + Tests (~1 h)
3. Editor-Schema-Bereinigung + Tests (~30 min)
4. Diagnostics-Umstellung (~15 min)
5. Sandbox/Setup-Wire-up (~15 min)
6. Hauptspec-Update §5.3 / §9 (~15 min)

Erwartet als ein Plan mit ~6 Schritten.
