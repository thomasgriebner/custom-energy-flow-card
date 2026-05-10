# HA-Integration — Referenz-Vergleich gegen `power-flow-card-plus`

**Datum:** 2026-05-10
**Aufgabe:** Plan Task 0.2 (Reference-Implementation-Comparison-Pass)
**Referenz-Repo:** [`flixlix/power-flow-card-plus`](https://github.com/flixlix/power-flow-card-plus)
**Referenz-Commit (Source-Branch):** `920ae91a3290e34223ceec157b8f674afb5290c5`
(Branch `feat-center-the-view-without-the-grid`)
**Referenz-Commit (Release-Branch `main`):** `9f396c83c227ce3bf93c3675aa412ad438ecc15d`
(Tag `v0.3.7`)

> **Hinweis:** Der `main`-Branch von `power-flow-card-plus` enthält nur den
> kompilierten Bundle (`power-flow-card-plus.js`). Die TypeScript-Quellen
> liegen auf einem Feature-Branch (`feat-center-the-view-without-the-grid`).
> Da die Implementations-Konventionen für die HA-Integration am Source und
> nicht am Bundle abgelesen werden, wurde dieser Branch als Vergleich
> herangezogen. Die HA-Touchpoints sind über die letzten ~12 Monate stabil
> geblieben.

## Vorgehensweise

Pro HA-Touchpoint aus Plan-Tabelle (`docs/plans/2026-05-10-v1-implementation-plan.md`,
Zeilen 411–423):

1. Code-Snippet aus pfcp-ref mit Datei:Zeile.
2. Plan-/Spec-Status: `matches`, `diverges`, `informational`, `missing`.
3. Action-Item, falls Anpassung nötig.

---

## 1. `setConfig(config)` — Signatur & Throw-Verhalten

**pfcp-ref** (`src/power-flow-card-plus.ts:105-127`):

```typescript
setConfig(config: PowerFlowCardPlusConfig): void {
  if ((config.entities as any).individual1 || (config.entities as any).individual2) {
    throw new Error("You are using an outdated configuration. ...");
  }
  if (!config.entities || (!config.entities?.battery?.entity && ...)) {
    throw new Error("At least one entity for battery, grid or solar must be defined");
  }
  this._config = { ...config, /* coerced numeric defaults */ };
}
```

**Plan/Spec:** Plan Task 3.2 (`docs/plans/...:4048-4059`) und Spec §6.2:
`setConfig(config: unknown): void { const validated = validateConfig(config); ... }`.
`validateConfig` wirft synchron bei invalid (siehe Spec §6.2, Plan Task
1.11).

**Status:** **matches**. Beide implementieren `setConfig(config)` synchron,
ohne `Promise`-Rückgabe, und werfen bei invalid. Plan ist sogar konservativer
(strikte Schema-Validierung, akzeptiert die Stub-Config explizit — siehe
Spec §6.2 + ADR-0014).

**Action-Item:** keines.

---

## 2. `static getConfigElement()` — Returntyp & Element-Tag

**pfcp-ref** (`src/power-flow-card-plus.ts:147-150`):

```typescript
public static async getConfigElement(): Promise<LovelaceCardEditor> {
  await import("./ui-editor/ui-editor");
  return document.createElement("power-flow-card-plus-editor");
}
```

**Plan/Spec:** Plan Task 3.2 (`docs/plans/...:4061-4063`) und Spec §6.2:

```typescript
static getConfigElement(): HTMLElement {
  return document.createElement(`${CARD_TYPE}-editor`);
}
```

**Status:** **diverges (informational)**.

- pfcp ist async + dynamisches Import zur Editor-Lazy-Load. Plan importiert
  den Editor in `index.ts` synchron (`import './editor'` als Side-Effect,
  Task 3.3 Step 1, Plan-Zeile 4266). Damit ist der Editor zum Zeitpunkt von
  `getConfigElement` bereits registriert; ein Promise ist nicht nötig.
- Element-Tag: pfcp = `power-flow-card-plus-editor`, plan = `${CARD_TYPE}-editor`
  = `custom-energy-flow-card-editor`. Beide folgen demselben Pattern.
- HA akzeptiert sowohl `HTMLElement`-Sync-Returns als auch Promises laut
  Lovelace-Doku.

**Action-Item:** keines. Synchronous return ist konform und einfacher.
Bundle-Größe-Argument für lazy-load (was pfcp tut) ist bei unserem 60 kB
Bundle-Budget (Spec §1.3) unkritisch — der Editor wird gemeinsam gebündelt.

---

## 3. `static getStubConfig(hass, entities)` — Args & Return-Shape

**pfcp-ref** (`src/power-flow-card-plus.ts:152-155`):

```typescript
public static getStubConfig(hass: HomeAssistant): object {
  return getDefaultConfig(hass);
}
```

`getDefaultConfig` durchsucht `hass.states` nach Entities mit
`device_class === "power"` und Substring-Matches (`getDefaultConfig` in
`src/utils/get-default-config.ts:21-71`).

**Plan/Spec:** Plan Task 3.2 (`docs/plans/...:4065-4067`) und Spec §6.2:

```typescript
static getStubConfig(_hass: unknown, _entities: unknown): Partial<Config> {
  return { type: 'custom:custom-energy-flow-card', grid: { power: '' }, solar: [], battery: [], consumers: [] };
}
```

**Status:** **diverges (informational)**.

- Argumente: pfcp deklariert nur `(hass)`. HA ruft die Funktion mit
  `(hass, entities, entitiesFallback)` auf (laut HA-Source). Plan deklariert
  beide Args (`_hass`, `_entities`) — semantisch identisch, expliziter.
- Return: pfcp gibt einen befüllten Default zurück (Auto-Detection). Plan
  gibt eine **leere** Stub-Config zurück und behandelt sie als
  „Stub-Mode"-UX-Zustand (siehe Spec §5.9, ADR-0014). Das ist eine bewusste
  Designentscheidung der Card.

**Action-Item:** keines. Die Plan-Lösung ist konsistent mit ADR-0014.
**Achtung beim Implementieren:** Plan Task 1.11 (`config/schema.ts`) muss die
Stub-Config (leerer `grid.power`, leere Listen) **erfolgreich validieren**
und `card.ts` muss sie als `isStubConfig`-Trigger erkennen. Das ist im Plan
durch `card-helpers.isStubConfig` (Task 3.2 Step 2) bereits abgedeckt
(Plan-Zeilen 4186-4195).

---

## 4. `getCardSize()` — Wert

**pfcp-ref** (`src/power-flow-card-plus.ts:157-159`):

```typescript
public getCardSize(): Promise<number> | number {
  return 3;
}
```

**Plan/Spec:** Plan Task 3.2 (`docs/plans/...:4069`) und Spec §6.2:
`getCardSize(): number { return 6; }`.

**Status:** **diverges (informational)**.

- pfcp = 3, Plan = 6. Größere Zahl bedeutet HA reserviert mehr vertikalen
  Platz im Stack. Da unsere Card mit N PVs / N Akkus / N Verbrauchern
  größer wird als die pfcp-Single-Source-Variante, ist 6 angemessen.
- HA akzeptiert Werte 1..n; bei `Promise<number>` gibt es Special-Handling
  (Auto-Re-Layout). Plan synchroner `number`-Return ist einfacher und
  ausreichend.

**Action-Item:** keines.

---

## 5. `customCards.push({...})` — Pflichtfelder

**pfcp-ref** (`src/utils/register-custom-card.ts:6-17`):

```typescript
export function registerCustomCard(params: { type; name; description }) {
  const windowWithCards = window as unknown as Window & { customCards: unknown[] };
  windowWithCards.customCards = windowWithCards.customCards || [];
  windowWithCards.customCards.push({
    ...params,
    preview: true,
    documentationURL: `https://github.com/flixlix/power-flow-card-plus`,
  });
}
```

Effektive Felder: `type`, `name`, `description`, `preview`, `documentationURL`.

**Plan/Spec:** Plan Task 3.3 (`docs/plans/...:4285-4301`):

```typescript
interface CardEntry {
  type: string;
  name: string;
  description: string;
  preview: boolean;
  documentationURL: string;
}
win.customCards.push({
  type: CARD_TYPE,
  name: CARD_NAME,
  description: DE.card.description,
  preview: true,
  documentationURL: CARD_DOC_URL,
});
```

**Status:** **matches**. Beide setzen alle fünf Felder
(`type`, `name`, `description`, `preview`, `documentationURL`). HA-Frontend
verlangt nur `type` als Pflicht; `name`+`description` für die Card-Picker-Liste;
`preview: true` zeigt die Vorschau-Card im Picker an; `documentationURL`
wird als Link im Picker dargestellt.

**Action-Item:** keines.

---

## 6. `<ha-form>` — Schema-Selector-Format

**pfcp-ref** (`src/ui-editor/schema/grid.ts:38-42`,
`src/ui-editor/schema/_schema-base.ts:8-14`):

```typescript
{ name: "entity", selector: { entity: {} } },
{ name: "entity_generator", label: "Generator Entity", selector: { entity: {} } },
{ name: "label_alert", label: "Outage Label", selector: { text: {} } },
{ name: "icon_alert", label: "Outage Icon", selector: { icon: {} } },
{ name: "boolean_field", selector: { boolean: {} } },
{ name: "number_field", selector: { number: { mode: "box", min: 0, max: 1000000, step: 1 } } },
{ name: "select_field", selector: { select: { options: [...], mode: "dropdown" } } },
{ name: "color_rgb_field", selector: { color_rgb: {} } },
```

Container/Layout-Schemata: `{ type: "expandable", title, schema: [...] }`,
`{ type: "grid", column_min_width: "200px", schema: [...] }`. Das Top-Level
einer Section ist ein **Array** von Items (siehe `gridSchema = [...]`,
`src/ui-editor/schema/grid.ts:47`).

**Plan/Spec:** Plan Task 4.1 (`docs/plans/...:4505-4512`, 4540-4557) und
Spec §6.4.1 + §6.4.2:

```typescript
const schema = [
  { name: 'title', selector: { text: {} } },
  { name: 'number_format', selector: { select: { options: ['standard', 'grouped'] } } },
  { name: 'show_inactive_paths', selector: { boolean: {} } },
];
// Grid section:
{ name: 'power', selector: { entity: { domain: 'sensor' } } },
{ name: 'power_invert', selector: { boolean: {} } },
```

**Status:** **matches**.

- Schema ist bei beiden ein Array aus Item-Objekten mit `name` + `selector`.
- `selector: { entity: { domain: 'sensor' } }` ist gültiges HA-Format
  (siehe HA-Source `homeassistant/helpers/selector.py` — `EntitySelectorConfig`
  unterstützt `domain: str | list[str]`). pfcp nutzt häufig `selector: { entity: {} }`
  ohne Domain-Filter; Plan ist hier strikter (nur `sensor`).
- Plan verwendet **kein** `type: 'grid'`/`type: 'expandable'`-Container
  (flach-flat). pfcp tut das für komplexere Sub-Sections. Das ist
  rein optisch — `<ha-form>` rendert beide korrekt.

**Action-Item:** keines. Hinweis: Falls die UX-Tests in Phase 4 zeigen, dass
das flat-Layout zu lang wird, kann auf `type: 'expandable'`-Container
umgestellt werden (siehe Spec §6.4.1 — Plan-Listen-UI ist davon nicht
betroffen).

---

## 7. `<ha-entity-picker>` — Properties

**pfcp-ref** (`src/ui-editor/components/individual-row-editor.ts:113-120`,
`140`):

```html
<ha-entity-picker
  allow-custom-entity
  hideClearIcon
  .hass="${this.hass}"
  .value="${(entityConf"
  as
  EntityConfig).entity}
  .index="${index}"
  @value-changed="${this._valueChanged}"
></ha-entity-picker>

<ha-entity-picker
  class="add-entity"
  .hass="${this.hass}"
  @value-changed="${this._addEntity}"
></ha-entity-picker>
```

Verwendete Properties: `hass`, `value`, optional `allow-custom-entity` (Attribut),
`hideClearIcon` (Attribut), `.index` (custom-Tag für Event-Handler).
**Wichtig:** `includeDomains` taucht im pfcp-Source **nicht** auf — pfcp
nutzt `<ha-entity-picker>` ohne Domain-Filter.

`loadHaForm()` (`src/ui-editor/utils/load-ha-form.ts:5`) bestätigt dass
`ha-entity-picker` ein global registriertes Element ist.

**Plan/Spec:** Spec §6.4.2 deklariert in `ha-globals.d.ts`:

```typescript
'ha-entity-picker': HTMLElement & {
  hass: HomeAssistant;
  value: string;
  includeDomains?: string[];
};
```

Plan verwendet jedoch **nicht** `<ha-entity-picker>` direkt. Stattdessen
nutzt der Plan in den Listen `<ha-form>` mit
`selector: { entity: { domain: 'sensor' } }` (Plan-Zeilen 4654, 4719-4720,
4810-4811). Das delegiert intern an `<ha-entity-picker>`, gefiltert auf
Domain `sensor`.

**Status:** **diverges (informational)**.

- pfcp verwendet `<ha-entity-picker>` direkt für die Liste der
  "individual devices". Das ist freier (custom Entity erlaubt, drag-and-drop
  Sortable etc.), aber komplexer.
- Plan löst dasselbe Problem über `<ha-form>` mit Entity-Selector + manuelle
  Add/Remove/Reorder-Buttons (siehe Spec §6.4.1 + ADR-0008).
- Die in `ha-globals.d.ts` deklarierte Property `includeDomains` wird im
  Plan-Code aktuell **nicht direkt** gesetzt — die Domain-Filterung erfolgt
  via `selector: { entity: { domain: 'sensor' } }` an `<ha-form>`. Der
  globale Type bleibt korrekt für eventuelle direkte Nutzung später.

**Action-Item:** keines. Aber **Beobachtung für Phase 4 Verification:**
Wenn beim manuellen Editor-Test in HA das Domain-Filter über `<ha-form>` +
`selector.entity.domain` nicht greift, fallback auf direkte
`<ha-entity-picker .includeDomains=${['sensor']} ...>` Verwendung (analog
pfcp `individual-row-editor.ts`).

---

## 8. `value-changed`-Event — Detail-Shape

**pfcp-ref** (`src/ui-editor/ui-editor.ts:163-181`):

```typescript
private _valueChanged(ev: any): void {
  let config = ev.detail.value || "";
  // ...
  fireEvent(this, "config-changed", { config });
}
```

`<ha-form>` und `<ha-entity-picker>` feuern beide
`@value-changed` mit `detail = { value: <neuer Wert> }`.

**Plan/Spec:** Plan Task 4.1 (`docs/plans/...:4520, 4565`):

```typescript
@value-changed=${(e: CustomEvent) => this._onGeneralChange(e.detail.value)}
```

**Status:** **matches**. Beide lesen `e.detail.value` — pfcp nutzt es in
`_valueChanged`, Plan-Editor genauso. Spec §6.4 und Plan Task 3.1
(`ha-globals.d.ts`, Plan-Zeile 3935) deklarieren
`'value-changed': CustomEvent<{ value: unknown }>` korrekt.

**Action-Item:** keines.

---

## 9. `config-changed`-Event — Detail-Shape

**pfcp-ref** (`src/ui-editor/ui-editor.ts:180`):

```typescript
fireEvent(this, 'config-changed', { config });
```

→ Detail = `{ config: <PowerFlowCardPlusConfig> }`.

`fireEvent` aus `custom-card-helpers` (oder eigener Helper in
`src/ui-editor/utils/fire-event.ts:56` und `src/ha/common/dom/fire-event.ts:56`)
setzt `bubbles: true, composed: true, cancelable: false` und feuert
`new CustomEvent('config-changed', { detail: { config }, bubbles, composed, cancelable })`.

**Plan/Spec:** Plan Task 3.1 (`docs/plans/...:3956-3963`):

```typescript
export function fireConfigChanged(target: HTMLElement, config: unknown): void {
  const event = new CustomEvent('config-changed', {
    bubbles: true,
    composed: true,
    detail: { config },
  });
  target.dispatchEvent(event);
}
```

**Status:** **matches**. Detail-Shape `{ config }` identisch. `bubbles`+`composed`
identisch. `cancelable` ist im pfcp-`fireEvent` `false` (default) — Plan
explizit auch nicht gesetzt (TS-Default `false`). Identisches Verhalten.

**Action-Item:** keines.

---

## 10. `fireEvent('hass-more-info')` — Detail.entityId vs entity_id

**pfcp-ref** (`src/power-flow-card-plus.ts:174-178`):

```typescript
const e = new CustomEvent('hass-more-info', {
  composed: true,
  detail: { entityId },
});
this.dispatchEvent(e);
```

→ Detail-Key ist **`entityId`** (camelCase).

**Plan/Spec:** Plan Task 3.1 (`docs/plans/...:3947-3954`):

```typescript
export function fireMoreInfo(target: HTMLElement, entityId: string): void {
  const event = new CustomEvent('hass-more-info', {
    bubbles: true,
    composed: true,
    detail: { entityId },
  });
  target.dispatchEvent(event);
}
```

**Status:** **matches**.

- Detail-Key `entityId` (camelCase) — identisch.
- pfcp setzt nur `composed: true`, kein `bubbles`. Plan setzt
  `bubbles: true, composed: true`. Beide funktionieren mit HA — `composed`
  ist der entscheidende Flag, damit das Event durch ShadowDOM-Boundaries
  an das `home-assistant-main`-Element bubblet, das `more-info` öffnet.
  `bubbles: true` zusätzlich zu setzen schadet nicht und ist idiomatisch
  (siehe HA-internes `fireEvent`-Helper in
  `pfcp:src/ha/common/dom/fire-event.ts:56` — dort ist `bubbles: true` der
  Default).

**Action-Item:** keines. **Wichtig:** Falls jemand später `entity_id`
(snake_case) verwendet, würde HA das Event ignorieren — Detail-Key
`entityId` ist der vom HA-Frontend erwartete Schlüssel
(siehe `home-assistant-main` Handler).

---

## 11. HA-CSS-Variablen

**pfcp-ref**: Verwendete HA-CSS-Variablen (Greppable in `src/style.ts`,
`src/style/`, `src/ui-editor/components/`):

| Variable                          | Verwendung im pfcp                                                                  |
| --------------------------------- | ----------------------------------------------------------------------------------- |
| `--primary-text-color`            | `src/style.ts:20-34, 91, 240, 359`, Default-Text-Farbe                              |
| `--secondary-text-color`          | `src/style.ts:209`, `ui-editor/components/link-subpage.ts:87,108`                   |
| `--card-background-color`         | `src/style.ts:93` (auskommentiert; Hintergrund)                                     |
| `--divider-color`                 | `src/ui-editor/components/link-subpage.ts:62`, fallback in `--ha-card-border-color` |
| `--ha-card-border-color`          | `src/ui-editor/components/link-subpage.ts:62`                                       |
| `--ha-card-border-radius`         | `src/ui-editor/components/link-subpage.ts:63`                                       |
| `--energy-grid-consumption-color` | `src/style.ts:17,28,52`, Energy-Theme                                               |
| `--energy-grid-return-color`      | `src/style.ts:30,53`                                                                |
| `--energy-battery-in-color`       | `src/style.ts:18,29,54`                                                             |
| `--energy-battery-out-color`      | `src/style.ts:55`                                                                   |
| `--energy-non-fossil-color`       | `src/style.ts:12`                                                                   |
| `--energy-solar-color`            | `src/style.ts:14`                                                                   |
| `--error-color`                   | (nicht direkt im pfcp; HA-Standard verfügbar)                                       |

**Plan/Spec:** Plan Task 2.1 (`docs/plans/...:2548-2554`):

```typescript
export const HA_CSS_VARS = {
  cardBackground: 'var(--ha-card-background, var(--card-background-color, #fff))',
  primaryText: 'var(--primary-text-color, #0f172a)',
  secondaryText: 'var(--secondary-text-color, #64748b)',
  divider: 'var(--divider-color, #e2e8f0)',
  cardPadding: 'var(--ha-card-padding, 16px)',
} as const;
```

Zusätzlich im `card.ts`-Style-Block (Plan-Zeilen 4035-4046) und
`editor.ts`-Style-Block (Plan-Zeilen 4424-4477) referenziert:
`--error-color`, `--primary-color`, `--secondary-text-color`, `--divider-color`,
`--energy-solar-color`, `--energy-battery-in-color`, `--energy-grid-consumption-color`
(letztere drei via `resolve-color.ts` in Task 1.3 / Spec §5.6).

**Status:** **matches** mit einer Anmerkung.

- `--ha-card-background` (Plan) vs `--card-background-color` (pfcp).
  HA-Frontend stellt **beide** bereit; `--ha-card-background` ist die
  modernere Karten-Token-Variable, `--card-background-color` die ältere
  globale. Plan kombiniert beide als Fallback-Kette
  (`var(--ha-card-background, var(--card-background-color, #fff))`) — das
  ist robust und idiomatisch.
- `--ha-card-padding` (Plan) ist HA-Standard-Token und wird von HA-Themes
  gesetzt. pfcp verwendet diese Variable selbst nicht (eigenes Padding via
  `padding: 0 16px;` in `style.ts:90`). Plan-Verwendung ist vorzuziehen.
- Energy-Theme-Farben (`--energy-*-color`) werden in `resolve-color.ts`
  (Task 1.3) gesetzt; pfcp nutzt sie ebenso (Spec §5.6 Mapping passt).

**Action-Item:** keines.

---

## Zusammenfassung — Action-Items

**Blocker:** keine.

**Warnings:** keine.

**Informational:**

1. **`getConfigElement` async vs sync** (Touchpoint 2): Plan ist sync; pfcp
   ist async + dynamic-import. Bei wachsendem Editor-Bundle kann
   nachträglich auf async + lazy-load umgestellt werden, aber bei
   60-kB-Budget und bereits gemeinsam gebündeltem Editor unkritisch.

2. **`<ha-form>`-Schema flat vs nested** (Touchpoint 6): Plan flach;
   pfcp nutzt `type: 'expandable'`-Container für komplexere Sub-Sections.
   Falls in Phase 4 die Editor-Höhe als zu lang empfunden wird, einzelne
   Sektionen in Expandables packen.

3. **`<ha-entity-picker>` direkt vs via `<ha-form>` Selector** (Touchpoint 7):
   Plan delegiert Domain-Filter an `<ha-form>` (Selector
   `entity.domain: 'sensor'`). Falls in Phase 4 manuell-getestet sich
   herausstellt, dass das Filter nicht durchschlägt, fallback auf direkte
   `<ha-entity-picker .includeDomains=${['sensor']}>`-Verwendung
   (analog `pfcp:src/ui-editor/components/individual-row-editor.ts:113-120`).
   Die Type-Deklaration in `ha-globals.d.ts` (Spec §6.4.2, Plan Task 3.1)
   enthält `includeDomains` bereits.

4. **`hass-more-info`-Bubbles-Flag** (Touchpoint 10): pfcp setzt nur
   `composed: true` ohne `bubbles`. Plan setzt beide. Idiomatisch identisch
   und beide funktionieren — kein Action-Item.

**Diverges:** keine — alle Divergenzen sind bewusste, im Plan/ADR begründete
Designentscheidungen (Stub-Config-Mode, getCardSize=6, sync Editor-Load).

**Missing:** keine — alle 11 Touchpoints sind vom Plan und der Spec
abgedeckt.

---

## Ergebnis

**Der Plan ist konform zur HA-Frontend-API**, wie sie in der aktuellen
`power-flow-card-plus`-Referenz verwendet wird. Es sind **keine
Plan-Patches** notwendig. Die im Plan implementierten Lifecycle-Methoden,
Event-Shapes und CSS-Variable-Verwendungen reproduzieren das pfcp-Verhalten
korrekt; abweichende Designentscheidungen (Stub-Config-Mode, sync Editor-Load,
flat Schema-Layout, `<ha-form>` mit Entity-Selector statt direkter
`<ha-entity-picker>`) sind in Spec/ADR begründet.

Das Implementations-Risiko für Phase 3 (HA-Integration) ist damit
minimiert. Der einzige nicht-aus-Source-validierbare Punkt — das
tatsächliche Runtime-Verhalten von `<ha-form>`-Selector
`entity.domain: 'sensor'` — bleibt ein manueller Test in Phase 4
Verification (siehe Action-Item Informational #3).
