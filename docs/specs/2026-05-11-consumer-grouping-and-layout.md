# Subspec — Verbraucher-Gruppierung & Card-Layout-Integration

**Status:** v1 (proposed, ready for plan)
**Datum:** 2026-05-11
**Autor:** Brainstorming-Session mit @griebner
**Verlinkte Hauptspec:** [`2026-05-10-custom-energy-flow-card-design.md`](./2026-05-10-custom-energy-flow-card-design.md)
**Berührte CLAUDE.md-Regeln:** 1, 2, 3, 4, 5, 7, 10
**Berührte ADRs:** 0002 (Layer), 0004 (Pure Engine), 0010 (Shared Util)

## 0. Zusammenfassung

Drei verkettete Änderungen in einer Spec, weil sie sich gegenseitig bedingen:

1. **Verbraucher-Gruppierung nach HA-Area** — User listet wie heute einzelne Sensoren; die Card resolvt die `area_id` aus `hass.entities`/`hass.devices` und gruppiert automatisch. Engine sieht nur die finalen Gruppen-Knoten, bleibt pure.
2. **Adaptives SVG-Layout** — Quellen (PV/Akku) clustern in der linken 2/3-Fläche, Verbraucher fächern in einem Bogen rechts um Home. Fixer ViewBox 760×540. SoC-Ring ersetzt das Text-Label am Akku.
3. **HA-Dashboard-Layout-API** — Neue `getGridOptions()`-Methode auf `card.ts` deklariert die bevorzugte Größe für die HA Sections-View; `getCardSize()` wird dynamisch.

Single-Source-of-Truth für die "Anzahl sichtbarer Verbraucher" (N) ist eine neue pure Funktion `deriveDisplayConsumers(config, hass)`. Engine, Layout und Dashboard-API leiten N daraus ab.

**Opt-in via** `display.consumer_grouping: 'by_area' | 'none'` (Default `'none'` — bestehende Configs ändern sich beim Daten-Mapping nicht).
**Always-on** sind die Layout-Änderung und die Dashboard-API-Methoden — sie verbessern das Default-Verhalten für jeden User. Das ist ein **bewusster Breaking Visual Change** (siehe §11).

### 0.1 Harte Constraints für den Planer

Vor dem Plan-Schreiben verbindlich zur Kenntnis nehmen:

| Constraint                                    | Quelle                    | Konsequenz bei Verletzung                                                                                                                  |
| --------------------------------------------- | ------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------ |
| `card.ts` ≤ 200 LOC                           | CLAUDE.md Regel 3         | Auslagerung in `card-helpers.ts` zwingend (Plan-Schritt 0; siehe §9)                                                                       |
| Engine pure (kein hass, kein DOM, kein State) | ADR-0004                  | Layer-Boundary-ESLint-Verstoß bricht CI                                                                                                    |
| ESLint-Zonen für Layer-Imports                | ADR-0009, `.eslintrc.cjs` | Geteilte Typen (z. B. `DisplayConsumer`) MÜSSEN in `config/types.ts` liegen — render/ darf nur `./config/types.ts` aus config/ importieren |
| Bundle ≤ 60 kB minified                       | Hauptspec §2.1            | Erwartete Zuwächse 3–5 kB; im CI-Check beobachten                                                                                          |
| Keine Runtime-Deps außer Lit                  | ADR-0003                  | `hass.entities`/`devices`/`areas` nur als TYP, kein Import (Regel 10)                                                                      |
| User-Strings aus `i18n/de.ts`                 | Regel 8                   | Editor-Labels, Group-Name "Sonstige" zentral                                                                                               |
| TDD für `engine/`, `config/`, `util/`         | Regel 9, ≥ 90 % Coverage  | `deriveDisplayConsumers` Test-first                                                                                                        |
| Keine `any` ohne Begründungs-Kommentar        | conventions.md §1.2       | `hass.entities`-Zugriff via getypter Interface (siehe §4.1)                                                                                |

## 1. Kontext und Motivation

In `2026-05-10-custom-energy-flow-card-design.md §3.4` sind Verbraucher als flache Liste mit je einem Power-Sensor definiert. Praktisch hat ein typischer Haushalt aber 10–20 Smart-Plug-Sensoren, sinnvoll gruppiert nach Räumen.

**Schmerzpunkte heute:**

- Aktuelles Layout in `render/layout.ts` (CONSUMER_Y_TOP=160, CONSUMER_Y_GAP=110) bricht ab **N=5** sichtbar aus dem ViewBox 540 heraus.
- 12 Einzel-Sensoren als 12 Knoten wären unleserlich; die Card ist als Überblicks-Visualisierung gedacht, nicht als Sensor-Liste.
- Die Card kommuniziert ihre bevorzugte Größe nicht an HA: `getCardSize()` ist statisch `6`; `getGridOptions()` für die seit HA 2024.3 voreingestellte Sections-View fehlt komplett.

**Zielbild:** Eine Konfiguration mit N Sensoren → 5–7 gruppierte Knoten → adaptives Layout, das HA-Dashboards den richtigen Slot deklariert.

## 2. Scope und Out-of-Scope

**In Scope (v1.x):**

- Auto-Gruppierung nach HA-Area
- Sources-Cluster + Consumer-Arc Layout (immer aktiv, kein Opt-in)
- SoC-Ring am Akku ersetzt Text-Label
- `getGridOptions()` + dynamisches `getCardSize()`
- Editor-Toggle für Grouping-Modus
- Tests für `deriveDisplayConsumers`, Layout-Geometrie, Schema

**Explizit out-of-Scope (verschoben oder verworfen):**

- Pro-Sensor Area-Override in YAML — Workaround: HA-Area-Zuweisung anpassen
- Hierarchische Areas (HA kennt sie nicht flach) — flach reicht
- Live-Animation, wenn N sich durch Area-Reassignment ändert — re-render hart
- Per-Verbraucher Position-Override in YAML — Auto-Layout reicht für 1–8
- Farb-Codierung des SoC-Rings nach Ladestand (low/mid/high) — flat green for v1
- "Classic"-Layout-Toggle für User, die das alte Aussehen wollen — falls Bedarf entsteht, v1.x
- Eigene Display-Section im Editor (neues `_renderDisplaySection`-Layout) — Toggle landet in der existierenden General-Section, siehe §10 Schritt 10
- Neues separates `CHANGELOG.md` — Changelog-Abschnitt im README, siehe §12
- Engine-Code-Änderungen — `engine/energy-engine.ts` und `engine/flow-graph.ts` bleiben unangetastet
- Veränderung der `relevantSensorIds`-Logik — der existierende Sensor-Set bleibt unverändert (§6.3)
- Refactoring außerhalb dieser Spec — kein "while I'm here"-Cleanup an Code, der nicht in §7.1 gelistet ist

**Plan-Disziplin:** Wenn der Planer das Gefühl hat, eine dieser Out-of-Scope-Linien überschreiten zu müssen, ist das ein Signal zum Innehalten und Rückfrage — nicht zum heimlichen Erweitern.

## 3. Konfigurations-Schema (YAML)

Bestehendes `consumers`-Schema bleibt unverändert; neue Option in `display`:

```yaml
type: custom:custom-energy-flow-card
solar:
  - id: dach
    power: sensor.pv_dach
  - id: garage
    power: sensor.pv_garage
battery:
  - id: b1
    power: sensor.batt1_power
    soc: sensor.batt1_soc
    charged_by: dach
grid:
  import: sensor.netz_bezug
  export: sensor.netz_einspeisung
consumers:
  - power: sensor.herd_power # name/icon weiterhin optional
  - power: sensor.geschirrspueler_power
  - power: sensor.tv_power
  - power: sensor.pc_power
  - power: sensor.monitor_power
display:
  consumer_grouping: by_area # NEU. Werte: 'none' (Default) | 'by_area'
```

**Verhalten:**

- `consumer_grouping: 'none'` (Default) — exakt heutiges Verhalten; jeder `consumers[i]` wird ein eigener Knoten.
- `consumer_grouping: 'by_area'` — Card resolvt pro Sensor die Area und merged Sensoren mit gleicher `area_id` in einen Gruppen-Knoten.

**Schema-Validation** (in `config/schema.ts`):

- Akzeptiert `'none' | 'by_area'`; alles andere wirft mit klarer Meldung.
- Wenn `'by_area'` + `consumers` leer → keine Warnung, aber Gruppe entfällt.

## 4. Daten-Typen und Auflösung

### 4.1 HA-Type-Erweiterung (`src/ha/ha-types.ts`)

```ts
export interface HomeAssistant {
  states: Record<string, HassEntity | undefined>;
  // NEU — Felder existieren seit HA 2023, sind aber nicht in jedem Lifecycle-Snapshot
  // garantiert befüllt. Optional und tolerant prüfen.
  entities?: Record<string, { area_id?: string; device_id?: string }>;
  devices?: Record<string, { area_id?: string }>;
  areas?: Record<string, { area_id: string; name: string; icon?: string }>;
  // bisherige Felder
  locale?: { language: string };
  themes?: { darkMode: boolean };
  callService?: (...args: unknown[]) => Promise<unknown>;
  callApi?: (...args: unknown[]) => Promise<unknown>;
}
```

**Nur Type-Deklaration, kein Import** — folgt Regel 10 (HA-Globals nicht importieren).

### 4.2 Neue pure Funktion `deriveDisplayConsumers`

**Single-Source-of-Truth für N.** Wird einmal pro `willUpdate` gerufen, das Ergebnis fließt parallel in `buildSystemState`, `computeLayout` und `RenderContext`.

**Code-Lokationen (Layer-Boundary-konform, siehe §0.1):**

- **Typ `DisplayConsumer` in `src/config/types.ts`** — damit `render/` ihn importieren darf (ESLint-Zone für `render/` erlaubt `./config/types.ts`).
- **Funktion `deriveDisplayConsumers` in `src/config/derive-display-consumers.ts`** — die Funktion selbst wird nur von `card.ts` aufgerufen (Orchestrator), nicht aus `render/`.

```ts
// in config/types.ts
export interface DisplayConsumer {
  /** Stabile ID, prefixed: 'c0','c1'… für 'none'-Mode | 'g_<areaId>' bzw. 'g_unassigned' für 'by_area'. */
  id: string;
  /** Anzeige-Name (von Area oder vom einzelnen consumer). */
  name: string;
  /** Optional. Auflösungs-Reihenfolge siehe Algorithmus Schritt 5. */
  icon?: string;
  /** Entity-IDs, deren powerW in diese Gruppe summiert wird. NIE leer. */
  members: string[];
  /** Falls aus Area aufgelöst; undefined im 'none'-Mode oder bei __unassigned. */
  areaId?: string;
}

// in config/derive-display-consumers.ts
export function deriveDisplayConsumers(
  config: Config,
  hass: HomeAssistant,
): { consumers: DisplayConsumer[]; warnings: EngineWarning[] };
```

**Algorithmus:**

1. **'none'-Mode (Default ODER `hass.entities` fehlt mit aktiviertem `by_area`):**
   - 1:1-Mapping in **User-Reihenfolge** (`consumers[i] → { id: 'c' + i, name: consumer.name ?? defaultName, icon: consumer.icon, members: [consumer.power], areaId: undefined }`).
   - Default-Name: `${DE.nodes.consumer} ${i+1}` (siehe i18n-Strings, §7-Tabelle).
   - Bei aktiviertem `by_area` aber fehlender Registry: zusätzlich Warning `REGISTRY_UNAVAILABLE` ausgeben.

2. **'by_area'-Mode (Registry verfügbar):** für jeden Sensor `s.power` die Area auflösen.

   ```
   areaId =
     hass.entities[s.power]?.area_id        // direkter Area-Bezug der Entity
     ?? (hass.entities[s.power]?.device_id
         ? hass.devices[device_id]?.area_id  // via Device
         : undefined)
     ?? undefined
   ```

   - `null` wird in der Implementation mit `?? undefined` neutralisiert (HA liefert beides je nach Endpoint).
   - Wenn `areaId === undefined`: Sensor landet in der Gruppe `g_unassigned`.

3. **Gruppieren** nach `areaId`. Jede entstandene Gruppe bekommt:
   - `id`: `'g_' + areaId` (für `g_unassigned`: literal `'g_unassigned'`).
   - `name`: in dieser Präzedenz
     1. `hass.areas[areaId]?.name` (wenn Registry-Eintrag existiert)
     2. `areaId` selbst (Warning `AREA_NOT_FOUND` zusätzlich emittieren)
     3. `DE.nodes.unassignedGroup` für `g_unassigned` (i18n-String "Sonstige")
   - `icon`: `hass.areas[areaId]?.icon` (Area-Icon **gewinnt** über alle Member-`consumer.icon`-Werte; v1.0 nicht gerendert, bleibt Emoji-Default 🔌 — siehe Hauptspec §9).
   - `members`: alle `consumers[i].power`-Strings dieser Area.
   - `areaId`: die aufgelöste Area-ID (oder `undefined` für `g_unassigned`).

4. **Präzedenz-Regeln im 'by_area'-Mode** (explizit, weil mehrdeutig):
   - `consumer.name` wird **ignoriert** (eine Gruppe hat mehrere Member; deren Einzel-Namen wären willkürlich gewählt). Area-Name gewinnt.
   - `consumer.icon` wird **ignoriert**. Area-Icon gewinnt.
   - Wer Single-Sensor-Display will, setzt `consumer_grouping: 'none'`.

5. **Sortier-Reihenfolge** (deterministisch, stabil über hass-Updates):
   - 'none'-Mode: **User-Reihenfolge** aus `config.consumers[]`.
   - 'by_area'-Mode: primary `name` aufsteigend (Locale `'de'`-aware, `Intl.Collator`), secondary `id` aufsteigend (Tiebreaker für gleichnamige Areas — HA erlaubt das technisch). `g_unassigned` immer ans Ende, unabhängig von Name.

**Annahme zur Registry-Stabilität:** HA liefert in `hass.entities`, `hass.devices`, `hass.areas` stabile Referenzen, solange das Registry unverändert ist. `card.ts` nutzt das für Re-Render-Filter (§6.3). Falls in der Praxis bei jedem `hass`-Update neue Referenzen kommen, wird `deriveDisplayConsumers` häufiger als nötig gerufen — Kosten O(N) klein genug, kein Defensive-Memo nötig.

### 4.3 `buildSystemState`-Erweiterung (`config/schema.ts`)

Statt direkt aus `config.consumers` zu mappen:

1. `display = deriveDisplayConsumers(config, hass)` aufrufen.
2. Pro Gruppe: `powerW = sum(read(member.power) for member in group.members)`. Member, deren `read()` SENSOR_UNAVAILABLE warnt, gehen mit `0` in die Summe ein (read returnt 0 + Warning) — die Summe der verfügbaren Member ist also die effektive Anzeige.
3. Einzel-Member-Warnings durchreichen, plus die `display.warnings` einsammeln.

**"All members unavailable"-Erkennung pro Gruppe:**

Die heutige Logik in `flow-renderer.ts:isNodeUnavailable` prüft Sensor-IDs direkt aus `config.consumers` via Index. Mit Gruppen muss die Erkennung dorthin verschoben werden, wo `members[]` bekannt ist — also in `buildSystemState`. Das Ergebnis wird via `BuildResult` weitergereicht:

```ts
// in config/schema.ts BuildResult (Erweiterung der bestehenden Struktur):
export interface BuildResult {
  state: SystemState;
  warnings: EngineWarning[];
  unavailableEntities: Set<string>;
  batterySoc: Map<string, number>; // bereits aus Session-Fix
  unavailableGroups: Set<string>; // NEU: groupId, wenn ALLE members unavailable
}
```

Berechnung:

```ts
unavailableGroups = new Set();
for (const g of displayConsumers) {
  if (g.members.every((m) => unavailableEntities.has(m))) {
    unavailableGroups.add(g.id);
  }
}
```

`RenderContext` bekommt `unavailableGroups` zusätzlich; `flow-renderer.ts:isNodeUnavailable` prüft für Consumer-Nodes via `ctx.unavailableGroups.has(node.id)` statt der heutigen Index-Logik.

Engine bleibt unverändert — sie konsumiert `ConsumerState[]` ohne zu wissen, ob es Gruppen oder Einzel-Sensoren sind. **Damit ist ADR-0004 (pure Engine) gewahrt.**

## 5. Layout-Geometrie

### 5.1 ViewBox und Quellen-Cluster

> **Update 2026-05-12:** Die hier genannten Geometrie-Werte sind durch
> [Subspec 2026-05-12 + ADR-0019](./2026-05-12-aspect-ratio-redesign.md) aktualisiert:
> ViewBox 960×540 (16:9), HOME_X=480, Source-Cluster x∈[200, 560], Hardcoded-Positionen
> n=1..4 mit neuen Werten. Konzept (Quellen-Cluster links 2/3, PV oben, Akku unten)
> bleibt erhalten — siehe [ADR-0017](../adr/0017-adaptive-svg-layout.md) für aktuelle Maße.

**Konstanten in `src/const.ts`:**

```ts
export const VIEWBOX = { width: 760, height: 540 } as const; // fix, kein Höhen-Sprung
```

Die ViewBox bleibt fix. Eine adaptive Höhe (ursprünglich angedacht für N≥7) wurde verworfen, weil das Arc-Winkel-Capping (§5.2) Überschneidungen mit PV/Akku auch bei N=8 verhindert.

**Quellen-Cluster (`render/layout.ts`):** PVs und Akkus teilen sich das linke 2/3 (x ∈ [130, 440]). Tabelle pro Source-Count:

| N   | x-Positionen                         |
| --- | ------------------------------------ |
| 1   | 180                                  |
| 2   | 180, 440                             |
| 3   | 130, 290, 440                        |
| 4   | 130, 230, 330, 440                   |
| 5–6 | 130 + i·(310/(N-1)) für i ∈ [0..N-1] |

Y-Achsen: PV bei y=80, Akku bei y=460. Akku-x folgt der x-Achse des paired PV (Regel ADR-0006 unverändert).

Grid: (60, 270). Home: (380, 270). Home-Radius bleibt 50, Source-/Akku-Radius bleibt 34, Grid-Radius 32.

**Hinweis zur Home-x-Verschiebung:** Heute liegt Home bei x=360 (Mitte von ViewBox 720). Mit ViewBox-Breite 760 verschiebt sich Home auf x=380, damit es zentrisch zur effektiven Inhaltsfläche (760/2) bleibt. Alle Edge-Berechnungen (PV→Home, Battery→Home, Grid→Home, Home→Consumer) referenzieren das neue Home-Zentrum.

**Hinweis zu PV-Count > 6:** Die x-Positionen rücken so eng, dass Kreise sich berühren. v1.0 funktioniert visuell für 1–6 PVs sauber; für mehr PVs ist die Card konzeptionell ohnehin nicht gedacht (Out-of-Scope-Doku im README).

### 5.2 Consumer-Arc

> **Update 2026-05-12:** Die hier genannten Arc-Parameter sind durch
> [Subspec 2026-05-12 + ADR-0019](./2026-05-12-aspect-ratio-redesign.md) aktualisiert:
> Radius R=350 (statt 275), α-Cap 42° (statt 25°), Step 14° (statt 7°). Konzept
> (Arc um Home-Mitte, lineare α-Spread) bleibt erhalten — siehe
> [ADR-0017](../adr/0017-adaptive-svg-layout.md) für aktuelle Werte und Gap-Begründung.

**Zentrum:** Home-Mitte. **Radius:** 275, fix.

**Winkel** abhängig von N (Anzahl Display-Consumers):

- N = 1: kein Arc — einzelner Knoten rechts auf y = home.y, x = home.x + 275.
- N ≥ 2: Bogen ±α um die horizontale Achse durch Home, mit
  ```
  α = min(25°, (N-1) · 7° / 2)
  ```
  Verbraucher gleichmäßig auf 2α verteilt.

**Warum 25° als Cap:** Bei α=25° und R=275 liegt der oberste Verbraucher bei y ≈ 270 − 116 = 154; mit r=24 reicht der Kreis bis y=130. PV bei y=80 + r=32 reicht bis y=112 → 18 px Luft. Gleiches Bild unten gegen den Akku bei y=460. Höhere α-Werte würden bei N≥7 mit PV/Akku kollidieren.

**Knoten-Geometrie:**

- Radius: 24 (war 32).
- Label rechts des Knotens (`text-anchor="start"`, `x = node.x + r + 8`).
- Label-Y: Name und Wert auf zwei Zeilen, Name `font-size 12 weight 700`, Wert `font-size 11 weight 600 fill secondary-text`.

**Edge-Routing Home → Consumer (exakte Formel):**

Pro Verbraucher-Knoten an Position `(cx, cy)` mit Winkel `θ` zum Home-Zentrum `(hx, hy) = (380, 270)`:

**Wichtig:** Pfad-Strings werden NICHT manuell gebaut. Der existierende Helper `bezierPath(from, to, control)` aus `util/svg-path.ts` wird verwendet (rundet Koordinaten + Single-Source-Format, ADR-0010). Pseudocode:

```ts
const HOME_R = 50;
const CONS_R = 24;
const R = 275;

function consumerEdgePath(θ: number, cx: number, cy: number): string {
  // Start: Home-Kantenpunkt in Knoten-Richtung
  const start = {
    x: hx + (HOME_R + 2) * Math.cos(θ),
    y: hy + (HOME_R + 2) * Math.sin(θ),
  };
  // Ende: Consumer-Kantenpunkt zur Home-Richtung
  const end = {
    x: cx - (CONS_R + 2) * Math.cos(θ),
    y: cy - (CONS_R + 2) * Math.sin(θ),
  };
  // Control-Point: 55 % zwischen Start und Ende, leicht zur Home-Mitte
  // gezogen — verstärkt das radiale Fächern statt gerader Linien
  const control = {
    x: start.x + 0.55 * (end.x - start.x) - 18 * Math.cos(θ),
    y: start.y + 0.55 * (end.y - start.y) - 18 * Math.sin(θ),
  };
  return bezierPath(start, end, control);
}
```

Für N=1 ohne Arc: `straightPath(home, consumer)` aus dem gleichen Helper.

**Animation-Kopplung:** Die so erzeugten `d`-Strings werden in `LayoutEdge.d` gespeichert. `flow-renderer.ts:renderEdge` und `flow-animation.ts:renderDots` konsumieren das per `offset-path: path('${edge.d}')` — funktioniert unverändert mit jedem gültigen SVG-Pfad. **Keine Änderungen an `computeAnimationParams` oder `renderDots` nötig.**

### 5.3 SoC-Ring am Akku (`render/battery-ring.ts`, NEU)

Analog zu `render/home-ring.ts`, aber single-segment:

```ts
export function renderBatteryRing(
  socPct: number, // 0..100
  color: string, // Akku-Farbe, theme-resolved
): SVGTemplateResult;
```

**Geometrie:**

- Outer-Ring r = 42 (8 px außerhalb des Knoten-Kreises r=34).
- Stroke-Width 6.
- Hintergrund-Kreis: Farbe + opacity 0.18.
- Filled-Kreis: stroke-dasharray = `${C·soc/100} ${C·(1-soc/100)}`, `stroke-linecap="round"`, mit transform `rotate(-90)` damit der Start bei 12 Uhr ist.
- Bei `socPct >= 99.5`: einfacher solid stroke ohne dasharray (Float-Toleranz, weil HA-Sensoren oft Werte wie `99.7` liefern).
- Bei `socPct <= 0.5`: nur der Hintergrund-Ring (gleiche Toleranz nach unten).
- Dazwischen: dasharray-Berechnung wie oben, `socPct` zuvor auf `[0, 100]` geclampt.

**Aufruf in `flow-renderer.ts`:**

- Ersetzt den bisher in v0.9.x eingebauten `<text class="node-soc">`.
- Bedingung: `node.kind === 'battery' && socPct !== undefined`.

**UX-Unterscheidung SoC unavailable vs SoC=0%** (wichtig — beide sahen sonst gleich aus):

- `socPct ≤ 0.5`: Hintergrund-Ring (volle Bahn, opacity 0.18). Akku-Border solide. Power-Wert wird normal angezeigt (Akku selbst funktioniert).
- `socPct sensor unavailable`: **Kein Ring** + Akku-Border **gestrichelt** (vorhandenes `node--unavailable`-Pattern aus `flow-renderer.ts:isNodeUnavailable`). Power-Wert kann trotzdem da sein, wenn der `power`-Sensor verfügbar ist — das `unavailable`-State gilt pro Knoten (siehe heutige Logik in `isNodeUnavailable`, die `charge_power`/`discharge_power` separat prüft).
- Implementierung: `_batterySoc`-Map aus dem Session-Fix bleibt — fehlende Sensoren erscheinen schlicht nicht in der Map, der Renderer rendert dann keinen Ring.

## 6. HA-Dashboard-Layout-Integration

### 6.1 `getGridOptions()` (`card.ts`)

> **Update 2026-05-12:** Diese Sektion ist superseded durch
> [Subspec 2026-05-12 + ADR-0019](./2026-05-12-aspect-ratio-redesign.md).
> `getGridOptions` und `getCardSize` werden ersatzlos gestrichen.

```ts
getGridOptions(): {
  columns: number;
  rows: number;
  min_columns?: number;
  max_columns?: number;
  min_rows?: number;
  max_rows?: number;
} {
  return {
    columns: 6,
    rows: 5,
    min_columns: 4,
    max_columns: 12,
    min_rows: 4,
    max_rows: 8,
  };
}
```

Statisch, weil der ViewBox fix ist (§5.1). Wenn künftig eine adaptive Höhe eingeführt würde, kann hier ein `_displayConsumerCount @state` einfließen.

### 6.2 `getCardSize()` an Grid ankoppeln

> **Update 2026-05-12:** Diese Sektion ist superseded durch
> [Subspec 2026-05-12 + ADR-0019](./2026-05-12-aspect-ratio-redesign.md).
> `getGridOptions` und `getCardSize` werden ersatzlos gestrichen.

```ts
getCardSize(): number {
  const rows = this.getGridOptions().rows;
  return Math.ceil((rows * 56) / 50);  // Masonry rechnet in 50-px-Slots
}
```

Damit funktioniert die Card sowohl in der modernen Sections-View (12-Spalten-Grid, 56-px-Rows) als auch in der Legacy-Masonry-View (50-px-Rows). Ergibt aktuell `Math.ceil(280/50) = 6` (gleich dem bisherigen Hardcode-Wert), aber automatisch korrekt, falls die Grid-Höhe in Zukunft adaptiv wird.

### 6.3 Re-Render-Filter und Layout-Memoization

**`hassRelevantSensorsChanged` (in `card-helpers.ts`) muss erweitert werden:**

Bisher (Heute): nur Sensor-State-Vergleich.
Neu: zusätzlich Registry-Referenz-Vergleich, **nur wenn** `consumer_grouping === 'by_area'`:

```ts
export function hassRelevantSensorsChanged(
  prev: HomeAssistant | undefined,
  next: HomeAssistant | undefined,
  config: Config | undefined,
): boolean {
  if (!prev || !next || !config) return true;
  // NEU: Registry-Ref-Vergleich im Grouping-Modus
  if (config.display?.consumer_grouping === 'by_area') {
    if (prev.entities !== next.entities) return true;
    if (prev.devices !== next.devices) return true;
    if (prev.areas !== next.areas) return true;
  }
  // bisheriger Sensor-State-Loop bleibt unverändert
  for (const id of relevantSensorIds(config)) {
    if (prev.states[id]?.state !== next.states[id]?.state) return true;
  }
  return false;
}
```

`relevantSensorIds` bleibt **unverändert** — die `consumers[i].power`-Liste ist im Grouping-Modus weiterhin die Quelle aller Sensoren (nur Aggregation ändert sich, nicht die Sensor-Menge).

**`memoLayout` (heute in `card.ts:18-26`) wird entfernt — inkl. setConfig-Aufruf.**

Konkrete Änderungen in `card.ts`:

- Top-level `const memoLayout = memoize(...)` (Zeilen 18–26) **streichen** inkl. des `memoize`-Imports, wenn dieser nirgendwo sonst genutzt wird (`memoize` selbst bleibt im util, siehe §7.2).
- In `setConfig` (Zeile 53): die Zeile `this._layout = memoLayout(validated);` **streichen**. `_layout` wird nur noch in `willUpdate` gesetzt.
- Folge: Vor dem ersten `hass`-Update ist `_layout === undefined` — der Skeleton-Loading-Pfad in `render()` (heute schon: `if (!this._flowResult || !this._layout) return Skeleton`) greift. Verhalten zur User-Sicht unverändert.

Begründung des Removals: Im 'by_area'-Mode kann sich die effektive Verbraucher-Anzahl ändern (User-Reassignment in HA), ohne dass die Config sich ändert. Ein config-only-Cache-Key wäre stale. Statt komplexer Key-Erweiterung (config + displayConsumer-IDs):

→ **`computeLayout` wird in `willUpdate` direkt aufgerufen**, einmal pro tatsächlich relevantem Update (das via `shouldUpdate`/`hassRelevantSensorsChanged` schon gefiltert ist).

Kosten: O(N+M+K) mit kleinen Konstanten, ~30 SVG-Pfad-Strings pro Aufruf. Sub-Millisekunden-Bereich. Performance-Test in Sandbox bestätigen, sonst Re-Add Memo mit `keyOf(config, displayConsumer.ids.join('|'))`.

**`computeLayout`-Signatur ändert sich:**

```ts
// Heute:
computeLayout(config: Config): LayoutResult

// Neu:
computeLayout(
  config: Config,
  displayConsumers: ReadonlyArray<DisplayConsumer>,
): LayoutResult
```

Layout liest aus `config.solar/battery/grid` weiterhin direkt; Verbraucher-Knoten werden aus `displayConsumers` gebaut (statt aus `config.consumers`). Damit ist Layout sauber von der Grouping-Logik entkoppelt — es weiß nur "hier sind N Knoten zu platzieren".

## 7. Auswirkungen auf den bestehenden Code

### 7.1 Datei-für-Datei-Tabelle

| Datei                                       | Art                   | Was genau                                                                                                                                                                                                                                                                                                                                               |
| ------------------------------------------- | --------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `src/config/types.ts`                       | erweitern             | Neuer Export `DisplayConsumer`-Interface; ggf. Re-Export von `EngineWarning` falls noch nicht da                                                                                                                                                                                                                                                        |
| `src/config/derive-display-consumers.ts`    | NEU                   | Spec §4.2 implementieren, Tests TDD-first                                                                                                                                                                                                                                                                                                               |
| `src/config/schema.ts`                      | erweitern             | `consumer_grouping`-Field in Validation; `BuildResult` um `unavailableGroups: Set<string>` (§4.3); `buildSystemState` ruft `deriveDisplayConsumers`, summiert Member-Powers, baut `unavailableGroups`                                                                                                                                                   |
| `src/config/schema.test.ts`                 | erweitern             | Validation der neuen Option; end-to-end mit Mock-Registry                                                                                                                                                                                                                                                                                               |
| `src/engine/types.ts`                       | unverändert           | `ConsumerState` ist schon `{ id, powerW }` — passt zu Gruppen                                                                                                                                                                                                                                                                                           |
| `src/engine/energy-engine.ts`               | unverändert           | Sieht weiterhin nur `state.consumer[]`, agnostisch zu Gruppen vs. Einzelsensoren                                                                                                                                                                                                                                                                        |
| `src/util/warning-types.ts`                 | erweitern             | Neue Codes `REGISTRY_UNAVAILABLE`, `AREA_NOT_FOUND`                                                                                                                                                                                                                                                                                                     |
| `src/ha/ha-types.ts`                        | erweitern             | `entities?` / `devices?` / `areas?` als optionale Felder (nur Typen, kein Import — Regel 10)                                                                                                                                                                                                                                                            |
| `src/render/layout.ts`                      | refactor              | Quellen-Cluster-Tabelle, Consumer-Arc-Geometrie, neue Signatur mit `displayConsumers`-Parameter                                                                                                                                                                                                                                                         |
| `src/render/layout.test.ts`                 | **Rewrite**           | Bestehende 10 Tests basieren auf alter Geometrie (PV bei x=590, ViewBox 720). Ersetzen durch neue Matrix (siehe §8)                                                                                                                                                                                                                                     |
| `src/render/battery-ring.ts`                | NEU                   | `renderBatteryRing(socPct, color)` analog `home-ring.ts`                                                                                                                                                                                                                                                                                                |
| `src/render/flow-renderer.ts`               | erweitern             | `RenderContext` bekommt `displayConsumers`-Map + `unavailableGroups: Set<string>`; `entityIdForNode`, `configEntryForNode`, `nodeName` schauen via Map statt `slice(1)+parseInt`; `isNodeUnavailable` für Consumer-Nodes nutzt `unavailableGroups`-Check; SoC-Ring-Aufruf ersetzt `<text class="node-soc">`; ViewBox-Konstante kommt aus `const.ts`     |
| `src/const.ts`                              | erweitern             | `VIEWBOX = { width: 760, height: 540 }` (von 720 hoch)                                                                                                                                                                                                                                                                                                  |
| `src/card.ts`                               | erweitern + auslagern | `_displayConsumers`-State, `_unavailableGroups`-State, `_layout` jede `willUpdate` neu (kein memoLayout mehr — §6.3), `memoLayout`-Konstante und `setConfig`-Aufruf streichen, neue Methoden `getGridOptions()` und dynamisches `getCardSize()`; LOC-Limit ≤ 200 ⇒ ggf. Auslagerung von willUpdate-Schritten in `card-helpers.ts` (siehe §10 Schritt 0) |
| `src/card-helpers.ts`                       | erweitern             | `hassRelevantSensorsChanged` um Registry-Ref-Check (§6.3); `resolveEntityId` so anpassen, dass es Group-IDs (`g_*`) genauso wie `c0`/`c1` korrekt auf die erste Member-Entity auflöst (heute `Number.parseInt(nodeId.slice(1))` — bricht bei `g_*`); ggf. neuer Helper `buildRenderContext(...)` falls card.ts > 200 LOC droht                          |
| `src/card-styles.ts`                        | trimmen               | `.node-soc`-CSS-Regel entfernen (wird durch Ring ersetzt)                                                                                                                                                                                                                                                                                               |
| `src/editor.ts`                             | erweitern             | `consumer_grouping`-Selector in die existierende General-Section (`_renderGeneralSection`) einbauen — dort leben heute schon `number_format` und `show_inactive_paths` (siehe §10 Schritt 10)                                                                                                                                                           |
| `src/i18n/de.ts`                            | erweitern             | Neue Strings: `nodes.unassignedGroup: 'Sonstige'`, `editor.consumerGroupingLabel: 'Verbraucher-Gruppierung'`, `editor.consumerGroupingNone: 'Keine'`, `editor.consumerGroupingByArea: 'Nach HA-Area'`                                                                                                                                                   |
| `README.md`                                 | erweitern             | Neue Option dokumentieren; PV>6 / N>8 Edge-Cases erwähnen; **neuer "Changelog"-Abschnitt am Ende** (Repo hat kein eigenes CHANGELOG.md — siehe §12); Breaking-Visual-Change-Hinweis als ersten Eintrag dort                                                                                                                                             |
| `docs/architecture.md`                      | erweitern             | §2 Modulkarte um `derive-display-consumers.ts` + `battery-ring.ts` ergänzen                                                                                                                                                                                                                                                                             |
| `CLAUDE.md`                                 | erweitern             | Doku-Karte: neue Subspec-Zeile                                                                                                                                                                                                                                                                                                                          |
| `docs/adr/0016-…md`, `0017-…md`, `0018-…md` | NEU                   | Pro Entscheidung ein ADR (siehe §11)                                                                                                                                                                                                                                                                                                                    |
| `docs/adr/README.md`                        | erweitern             | Index um neue ADRs ergänzen                                                                                                                                                                                                                                                                                                                             |
| `examples/with-grouping.yaml`               | NEU                   | Beispiel-Config mit `consumer_grouping: by_area` als Doku-Referenz                                                                                                                                                                                                                                                                                      |
| `hacs.json`                                 | optional              | Bei Bedarf `homeassistant`-Mindestversion ergänzen, falls die `getGridOptions()`-API erfordert (HA ≥ 2024.3). Wenn unklar: nicht setzen — ältere HA ignorieren die Methode einfach                                                                                                                                                                      |

### 7.2 Bestehende Helper, die wiederverwendet werden müssen (keine Doppelung!)

ADR-0010 ("Shared Util Module") verbietet duplizierte Helper. Der Planer **muss** diese existierenden Bausteine nutzen, statt Eigenes zu schreiben:

| Helper                                            | Lokation                   | Wofür im neuen Code                                                                                                                                                                                       |
| ------------------------------------------------- | -------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `bezierPath(from, to, control)`                   | `util/svg-path.ts`         | Alle Consumer-Arc-Pfade (statt manuelle `M..Q..` Strings, §5.2)                                                                                                                                           |
| `straightPath(from, to)`                          | `util/svg-path.ts`         | N=1-Sonderfall, alle gerade Edges                                                                                                                                                                         |
| `formatPowerW(w, opts)`                           | `util/format-power.ts`     | Power-Anzeige in Gruppen-Knoten (`{ format: ctx.formatGrouped ? 'grouped' : 'standard' }`)                                                                                                                |
| `readSensorW(hass, id, opts)`                     | `util/read-sensor.ts`      | Sensor-Lesen im erweiterten `buildSystemState` (Member-Summierung). NICHT direkt aus `hass.states`                                                                                                        |
| `colorFor(role, theme)`                           | `render/theme.ts`          | Akku-Farbe für `renderBatteryRing` (NICHT hartcoded `#10b981`)                                                                                                                                            |
| `computeAnimationParams(power, kind, cfg, theme)` | `render/flow-animation.ts` | Pro Consumer-Edge — unverändert nutzbar mit den neuen Bezier-Pfaden                                                                                                                                       |
| `renderDots(edge, params)`                        | `render/flow-animation.ts` | Dot-Animation entlang neuer Pfade — `offset-path: path(...)` funktioniert mit beliebigem SVG-Pfad, kein Anpassungsbedarf                                                                                  |
| `edgeColorRole(kind)`                             | `render/edge-color.ts`     | `home-to-consumer` → `consumer`-Farbe; existierender FlowEdgeKind-Switch bleibt korrekt                                                                                                                   |
| `memoize(fn, keyFn)`                              | `util/memo.ts`             | Bleibt erhalten als Helper. Wird im neuen Code NICHT mehr für Layout genutzt (§6.3), kann aber für `deriveDisplayConsumers` einspringen, wenn Profiling zeigt, dass die Auflösung warm-path-relevant wird |
| `HA_CSS_VARS`                                     | `render/theme.ts`          | Card-Background-Color für Knoten-Fill — neuer Ring nutzt `colorFor('battery', theme)`, Hintergrund-Bahn nutzt gleiche Farbe + opacity                                                                     |

**Style-Konsistenz Battery-Ring ↔ Home-Ring:**

- Gleiche stroke-width-Familie (Home-Ring: 9; Battery-Ring: 6 — bewusst dünner, damit der Akku-Knoten kleiner als Home wirkt)
- Gleicher `rotate(-90)` für 12-Uhr-Start
- Gleiches `stroke-dasharray`-Pattern (filled length + remaining gap)
- Linecap: home-ring nutzt heute keinen explizit (square); battery-ring nutzt `round` für SoC-typische runde Anmutung. **Bewusste Abweichung, dokumentieren in ADR-0017.**

### 7.3 Konzepte, die der Entwickler kennen muss

Querverweis auf Bestandsdokumente — vor Plan-Start lesen:

1. **Layer-Architektur** (`docs/architecture.md §2` + ADR-0002): Welcher Layer darf was importieren. ESLint-Zonen in `.eslintrc.cjs` sind die executable Quelle der Wahrheit. Verstoß bricht CI.
2. **Pure-Engine-Vertrag** (ADR-0004): `engine/` kennt kein hass, keine DOM, keinen State. Grouping passiert vorher in `config/`. Engine-Code-Änderungen sind in dieser Spec **explizit nicht** vorgesehen.
3. **CSS-`offset-path`-Animation** (ADR-0005): Wie Dots entlang SVG-Pfaden laufen. Funktioniert mit JEDEM Pfad-String. `prefers-reduced-motion: reduce` ist bereits in `ANIMATION_CSS` implementiert — neuer Code muss nichts hinzufügen.
4. **`shouldUpdate` statt `hasChanged`** (ADR-0011): Re-Render-Filter läuft auf Element-Instanz, nicht via Lit-`@property({hasChanged})`. Daher kommt `hassRelevantSensorsChanged` (§6.3).
5. **Stub-Config-Akzeptanz** (ADR-0014): HA übergibt beim ersten Setup eine leere Config. Validation akzeptiert sie als gültig; Card rendert Stub-Hint statt zu crashen. Neue Felder (`display.consumer_grouping`) sind optional — Stub-Config-Pfad bleibt intakt.
6. **Engine-Warnings statt Throws** (conventions.md §6.1): `REGISTRY_UNAVAILABLE` und `AREA_NOT_FOUND` werden als `EngineWarning` durchgereicht, NIE geworfen. Erscheinen automatisch im Diagnose-Icon (`flow-renderer.ts:renderDiagnostics`) — kein Extra-Code nötig.
7. **`willUpdate` statt `render`** (Hauptspec §5.7, Regel 5): Alle Berechnungen (`deriveDisplayConsumers`, `computeLayout`, `compute`, Map-Bau) gehören in `willUpdate`. `render()` ist nur Template-Komposition.
8. **Crash-Resilience** (Regel 7): `willUpdate` muss try/catch + Fallback-UI haben (heute schon in `card.ts:114-134`). Neue Aufrufe (`deriveDisplayConsumers`) sind innerhalb des Try-Blocks.
9. **i18n-Schlüssel-Konvention** (`i18n/de.ts`, Hauptspec §11.5): Alle User-Strings (Editor-Labels, Gruppen-Name "Sonstige") liegen in `DE.*`. Warnings-`detail`-Strings dürfen Englisch sein (für Bug-Reports), wie bei den bestehenden Codes.
10. **Type-Only-Imports** (conventions.md §4): `DisplayConsumer` wird in `render/` als Type konsumiert → `import type { DisplayConsumer } from '../config/types'`.

### 7.4 UX-Implikationen, die der Planer berücksichtigen muss

| UX-Aspekt                                                             | Verhalten                                                                                                                                                                                                                                                                            | Quelle / Pattern |
| --------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ---------------- |
| **Erste-Render-Phase** (hass undefined)                               | Skeleton-Loading bleibt unverändert. `getGridOptions()` muss aber auch **ohne Config/hass aufrufbar** sein und sinnvolle Defaults liefern (HA fragt unter Umständen vor `setConfig` ab). Implementation: defensive Defaults im Method-Body, kein Zugriff auf `this._config` zwingend |
| **Stub-Config** (leerer Initial-State)                                | Bestehender `stub-hint`-Pfad bleibt; `getGridOptions` liefert Defaults; kein Crash                                                                                                                                                                                                   |
| **Click auf Gruppen-Knoten**                                          | `fireMoreInfo(this, firstMember)` öffnet das HA-Sensor-Dialog des ERSTEN Members (deterministisch, weil `members[]` sortiert ist). Bewusste Einschränkung in v1.0; v1.x prüft HA-Area-Page-Navigation (§13)                                                                          |
| **Keyboard-Activation**                                               | `Enter`/`Space` auf Gruppen-Knoten triggert gleiches `onNodeClick` wie Maus-Click. Bestehender Handler in `flow-renderer.ts:renderNode` bleibt unverändert                                                                                                                           |
| **Focus-Outline**                                                     | `.node:focus-visible { outline: 2px solid var(--primary-color) }` in `card-styles.ts` greift unverändert. Mit Consumer-Knoten r=24 ist der Focus-Ring entsprechend kleiner, aber sichtbar                                                                                            |
| **Touch-Targets (Mobile)**                                            | Knoten r=24 ⇒ 48 px Durchmesser ≥ WCAG AA Minimum (44 px). Mit `stroke-width 2.5` und `outline 2px`: effektiver Click-Bereich ~52 px. **Im akzeptablen Bereich**, aber im Sandbox auf einem Phone-Viewport verifizieren                                                              |
| **Tab-Reihenfolge**                                                   | `TAB_ORDER` in `flow-renderer.ts` bleibt `['pv', 'grid', 'battery', 'consumer', 'home']`. Innerhalb der Gruppe sortiert nach x dann y — durch den Arc heißt das oben-nach-unten in Lese-Reihenfolge. Konsistent                                                                      |
| **Aria-Labels**                                                       | `${name}: ${value}` bleibt. Für Gruppen: `name = Area-Name`, also "Küche: 820 W". Kein Hinweis auf Member-Count (v1.x für Tooltip-Erweiterung)                                                                                                                                       |
| **Dark-Mode**                                                         | Text-Farben kommen aus `var(--primary-text-color)` (Session-Fix vom 2026-05-11). Ring-Farben sind theme-resolved über `colorFor`. Keine Hardcoded-Farben in neuem Code                                                                                                               |
| **Reduced Motion**                                                    | `@media (prefers-reduced-motion: reduce)` in `ANIMATION_CSS` schaltet dots+streaming aus. Statische Edges bleiben sichtbar, Funktionalität unverändert. **Neue Bezier-Pfade automatisch abgedeckt**                                                                                  |
| **Visuelles Feedback bei `REGISTRY_UNAVAILABLE`**                     | Card fällt auf 'none'-Mode zurück → User sieht Card normal (mit Einzel-Sensoren). Diagnose-Icon oben rechts zeigt Warnung. Akzeptable Degradation für v1.0; v1.x kann einen expliziten Banner einbauen                                                                               |
| **HA-Area umbenennen / Sensor umzuweisen während die Card offen ist** | Re-Render automatisch via Registry-Ref-Check (§6.3). Übergang hart (kein Crossfade), Datenkonsistenz garantiert. Animation-Smoothing ist v1.x (§13)                                                                                                                                  |
| **YAML-Editor-Fehler**                                                | Schema-Validation in `setConfig` wirft bei `consumer_grouping: 'invalid'` → HA zeigt error im Editor. Heute schon Standard-Pfad                                                                                                                                                      |
| **GUI-Editor-Default**                                                | Dropdown zeigt "Keine" als Default. Wenn User auf "Nach HA-Area" wechselt und zurück: YAML wird sauber von dem Eintrag bereinigt (siehe §10 Schritt 10 zur `undefined`-Handhabung beim Schreiben)                                                                                    |

## 8. Edge-Cases und Fehlerbehandlung

| Fall                                                              | Verhalten                                                                                                                                                           |
| ----------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `consumer_grouping: 'by_area'`, aber `hass.entities` fehlt        | Fallback auf `'none'`-Mode + Warning `REGISTRY_UNAVAILABLE`.                                                                                                        |
| Sensor hat weder `entity.area_id` noch `device.area_id`           | Gruppe `g_unassigned` mit Name `'Sonstige'`.                                                                                                                        |
| Area-ID existiert in `hass.entities`, aber `hass.areas[id]` fehlt | Name = `id` (hartes Fallback), Warning `AREA_NOT_FOUND`.                                                                                                            |
| Einzel-Member eines Groups ist `unavailable`                      | Gruppe bleibt sichtbar, powerW = Summe der verfügbaren Member. Wenn ALLE Member unavailable: Gruppe als `unavailable` rendern (dashed border, kein Power-Wert).     |
| Akku-SoC-Sensor `unavailable`                                     | Ring entfällt; bisheriges dashed-border-Verhalten bleibt.                                                                                                           |
| Display-Consumer-Count > 8                                        | Layout deckt 1–8 sauber ab; α=25°-Cap greift. Bei 9+ wird der Bogen visuell dicht (Knoten-Abstand < 2·r), technisch funktioniert es weiter. Doku-Hinweis im README. |

**Neue `EngineWarningCode`-Werte** (in `util/warning-types.ts`):

- `REGISTRY_UNAVAILABLE`
- `AREA_NOT_FOUND`

## 9. Test-Strategie

### Neue Test-Dateien

- `src/config/derive-display-consumers.test.ts` — Coverage-Matrix:
  - `'none'`-Mode passthrough (User-Reihenfolge bleibt)
  - `'by_area'`-Mode, 3 Sensoren gleiche Area → 1 Gruppe
  - `'by_area'`, 2 Sensoren verschiedene Areas → 2 Gruppen, sortiert
  - `'by_area'`, Sensor ohne `area_id` direkt aber via `device.area_id` → korrekt aufgelöst
  - `'by_area'`, Sensor weder Entity- noch Device-Area → `g_unassigned`
  - `'by_area'`, `area_id` aus `entities` aber `areas`-Eintrag fehlt → Fallback Name=`areaId`, Warning `AREA_NOT_FOUND`
  - `'by_area'` aber `hass.entities` fehlt → Fallback `'none'`-Mode, Warning `REGISTRY_UNAVAILABLE`
  - Zwei Areas mit gleichem Display-Namen → deterministische Sortierung via `id` als Tiebreaker
  - `area_id: null` (statt undefined) wird wie `undefined` behandelt

### Erweiterungen bestehender Tests

- `src/config/schema.test.ts` — Validation für `consumer_grouping: 'none' | 'by_area' | invalid`, end-to-end-Build mit Mock-Registry (Sensor-States + Entity-Registry-Stubs gemeinsam), `BuildResult.unavailableGroups`-Befüllung bei 0/teilweise/alle unavailable Members.

### Neue Tests für Helper / Render

- `src/card-helpers.test.ts` — NEU oder erweitert: `hassRelevantSensorsChanged` mit Registry-Ref-Vergleich; `resolveEntityId` für `c0`-IDs (Bestand) UND `g_*`-IDs (neu), inkl. `g_unassigned`.
- `src/render/battery-ring.test.ts` — NEU: Strukturelle Snapshot-/DOM-Tests für SoC = 0%, 25%, 99%, 99.5%, 100%, `clamp` bei < 0 und > 100. Pure-Function-Test, kein happy-dom nötig (gibt `SVGTemplateResult` zurück).

### Neuschreiben statt Erweitern

- `src/render/layout.test.ts` — **Rewrite**. Die bisherigen 10 Tests verwenden alte Koordinaten (PV bei x=590, ViewBox 720×540) und sind mit der neuen Geometrie nicht reparable. Neue Matrix:
  - Quellen-x-Positionen für PV-Count = 1, 2, 3, 4, 5, 6 (gegen die Tabelle in §5.1)
  - Akku-x-Positionen folgen paired PV (ADR-0006-Invariante)
  - Consumer-Arc-Winkel-Matrix für N = 2, 3, 4, 6, 7, 8 (α-Formel + 25°-Cap-Check)
  - Sonderfall N=1: keine Arc-Geometrie, einzelner Knoten bei x=655, y=270
  - Edge-Pfad-Anzahl (Σ PV→Home/Battery/Grid + Battery→Home/Grid + Grid→Home/Battery + Home→Consumer) stimmt mit Source/Sink-Counts
  - ViewBox = 760×540 in jedem Aufruf

### Manuell verifiziert (Sandbox via `pnpm preview`)

- SoC-Ring optisch korrekt bei 5 %, 50 %, 95 %, 99.5 %, 100 % und unavailable; Übergang dasharray → solid an der 99.5 %-Schwelle ohne Flicker.
- Übergang N=4 → N=7 → N=8 (Arc-Spreizung wächst, Knoten überlappen nicht mit PV/Akku).
- Dark-Mode (siehe Fix vom 2026-05-11): Ring + alle Texte lesbar.
- HA Sections-View: Card belegt 6 cols × 5 rows ohne Leerraum.
- Editor: Toggle `consumer_grouping` schreibt korrekten Wert in die Config; YAML-Editor zeigt die Änderung sofort.

## 10. Implementierungs-Reihenfolge (vorgeschlagen für writing-plans)

0. **Card.ts-LOC-Vorab-Check** — Bevor irgendwas hinzu kommt: prüfen, ob das aktuelle `card.ts` (199 LOC nach Session-Fixes) Platz für `_displayConsumers`-State, `getGridOptions()`-Methode und Re-Render-Filter-Erweiterung lässt. Wenn nicht: vorab `buildRenderContext()` und/oder den `willUpdate`-Try-Block in `card-helpers.ts` auslagern. Ziel: ≤ 190 LOC, damit ~10 LOC für die neuen Features Platz haben.

1. **Schema + Validation + Warning-Codes** — `display.consumer_grouping` in `config/schema.ts`, neue Codes in `util/warning-types.ts`, Tests für die Validation.

2. **HA-Types + i18n-Strings** — `ha/ha-types.ts` um `entities`/`devices`/`areas` ergänzen. `i18n/de.ts` um `nodes.unassignedGroup`, `editor.consumerGroupingLabel`, `editor.consumerGroupingNone`, `editor.consumerGroupingByArea`.

3. **`deriveDisplayConsumers`** — `config/types.ts` um `DisplayConsumer`-Interface, `config/derive-display-consumers.ts` neu, Tests **TDD-first** (Coverage-Matrix aus §9).

4. **`buildSystemState`-Anpassung** — Aufruf von `deriveDisplayConsumers`, Member-Summierung (`powerW = sum(read(m) for m in group.members)`), Warnings durchreichen, Tests erweitern.

5. **Layout-Refactor** — `const.ts` ViewBox 760×540, `render/layout.ts` neue Signatur `computeLayout(config, displayConsumers)`, Quellen-Cluster-Tabelle (§5.1), Consumer-Arc-Geometrie (§5.2 mit exakter Bezier-Formel). **`layout.test.ts` komplett neu schreiben** (§9).

6. **`renderBatteryRing`** — `render/battery-ring.ts` neu (analog `home-ring.ts`), Aufruf aus `flow-renderer.ts:renderNode` für `kind === 'battery'`, **Entfernen** der `<text class="node-soc">`-Zeile aus `flow-renderer.ts` und der `.node-soc`-CSS-Regel aus `card-styles.ts`.

7. **`flow-renderer.ts` ID-Lookup-Refactor** — `RenderContext` bekommt `displayConsumers: ReadonlyMap<string, DisplayConsumer>`; `entityIdForNode`/`configEntryForNode`/`nodeName` schauen via Map statt `slice(1)+parseInt`. Heute funktionierende `'c0'`-IDs bleiben in der Map (Index = `c<i>`), sodass im 'none'-Mode kein Verhalten kippt.

8. **Re-Render-Filter erweitern** — `card-helpers.ts:hassRelevantSensorsChanged` um Registry-Ref-Vergleich (§6.3). `memoLayout` in `card.ts` entfernen, Layout in `willUpdate` direkt berechnen.

9. **HA-Dashboard-API** — `getGridOptions()` (statisch, §6.1) und dynamisches `getCardSize()` (§6.2) in `card.ts`. Statischer `getCardSize() = 6` wird ersetzt.

10. **Editor-Toggle** — **Wichtig:** das i18n hat `DE.editor.sectionDisplay = 'Anzeige'`, aber es existiert KEINE eigene `_renderDisplaySection`-Methode im Editor. Display-Optionen (`number_format`, `show_inactive_paths`) leben heute in `_renderGeneralSection` (siehe `editor.ts:135–168`). Konkret: in dieser Methode das `schema`-Array um folgendes Item erweitern:

    ```ts
    {
      name: 'consumer_grouping',
      selector: {
        select: {
          mode: 'dropdown',
          options: [
            { value: 'none', label: DE.editor.consumerGroupingNone },
            { value: 'by_area', label: DE.editor.consumerGroupingByArea },
          ],
        },
      },
    }
    ```

    Und im `data`-Objekt: `consumer_grouping: c.display?.consumer_grouping ?? 'none'`. Im `_onGeneralChange`-Handler entsprechend übernehmen:

    ```ts
    display: {
      ...this._config.display,
      number_format: value['number_format'] as 'standard' | 'grouped',
      show_inactive_paths: Boolean(value['show_inactive_paths']),
      consumer_grouping: value['consumer_grouping'] === 'by_area' ? 'by_area' : undefined,
    }
    ```

    `consumer_grouping: undefined` (statt `'none'`) sorgt dafür, dass die YAML nicht mit dem Default-Wert verschmutzt wird. Label via `.computeLabel=${(s) => s.name === 'consumer_grouping' ? DE.editor.consumerGroupingLabel : s.name}`-Callback an `<ha-form>` — **nur für `consumer_grouping`** (die anderen Schema-Items behalten ihre heutigen Default-Labels, kein Refactor außerhalb dieses Felds). Eine eigene Display-Section anzulegen (`_renderDisplaySection` mit `DE.editor.sectionDisplay`) ist **explizit out-of-scope** dieser Spec — würde die existierende UI umstrukturieren.

11. **Doku-Updates** — `README.md` (neue Option dokumentieren, Edge-Cases bei PV>6 / N>8 erwähnen; **neuer Abschnitt "Changelog" am Ende der Datei** mit Breaking-Visual-Change-Hinweis als ersten Eintrag, siehe §12 — Repo hat kein separates CHANGELOG.md), `docs/architecture.md` (§2 Modulkarte um `derive-display-consumers.ts` und `battery-ring.ts`), `CLAUDE.md` (Doku-Karte um Subspec-Eintrag), neues `examples/with-grouping.yaml` (anhand des YAML-Beispiels aus §3 dieser Spec) als Referenz-Config für User.

12. **ADRs schreiben** — `0016-ha-area-grouping.md`, `0017-adaptive-svg-layout.md`, `0018-ha-dashboard-layout-api.md` nach Template (Begründungstexte siehe §11). Index in `docs/adr/README.md` aktualisieren.

13. **End-to-end-Check (CI-Gate)** — alle folgenden Kommandos müssen grün/innerhalb-Budget sein, **bevor** auf main commitet wird:
    - `pnpm check` (lint + typecheck + tests, alle ≥ 90 % für engine/config/util)
    - `pnpm build` — anschließend `wc -c dist/custom-energy-flow-card.js`, **muss ≤ 61440 Bytes** (60 kB) sein
    - `pnpm smoke` (Headless-Smoke-Test)
    - `wc -l src/card.ts` — **muss ≤ 200** sein (Regel 3)
    - Sandbox-Verifikation der Punkte aus §9 (`pnpm preview` → Browser-Check)
    - `pnpm lint` zeigt keine `import/no-restricted-paths`-Verstöße (Layer-Boundary-Check)

## 11. ADR-Kandidaten (während Implementation anlegen)

Drei eigenständige Entscheidungen, je ein ADR (CLAUDE.md "Bei Architektur-Entscheidung neuer ADR"):

- **ADR-0016: HA-Area-basierte Verbraucher-Gruppierung** — Card-seitige Auflösung über `hass.entities`/`devices`/`areas` statt HA-seitiger Template-Sensoren. Begründung: kein zusätzlicher HA-Config-Aufwand für User; Single-Source-of-Truth-Funktion `deriveDisplayConsumers` (pure, in `config/`); Engine-Reinheit (ADR-0004) bleibt. Verworfen: Template-Sensor-Pfad (HA-seitige Aggregation), explizite YAML-Listen pro Gruppe.

- **ADR-0017: Quellen-Cluster + Consumer-Arc Layout** — Geometrie-Umstellung: Quellen (PV/Akku) clustern in der linken 2/3-Fläche, Verbraucher fächern in einem Bogen rechts um Home. ViewBox bleibt **fix 760×540**, Arc-Winkel ist auf ±25° gedeckelt → keine PV/Akku-Kollision auch bei N=8. Verworfen: adaptive ViewBox-Höhe (unnötig wegen α-Cap), Sammelschiene/Trunk (Animation pro Verbraucher geht verloren), zweispaltige Verbraucher (Konzept-Bruch bei N-Übergängen).

- **ADR-0018: HA-Dashboard-Layout-API immer aktiv** — `getGridOptions()` deklariert 6 cols × 5 rows mit min/max-Bounds, dynamisches `getCardSize()` leitet sich daraus ab. Kein User-Opt-out: verbesserter Default-Slot in der HA Sections-View, statt User die manuelle Resize-Arbeit aufzudrücken. Verworfen: weiterhin statisch hardcoded `6`, optionale YAML-Override-Felder (YAGNI für v1.x).

## 12. Breaking-Visual-Change Kommunikation

Diese Spec ändert die optische Anordnung der Karte zwangsweise (Quellen-Cluster + Arc statt Spalte + spread Quellen). Existierende Configs **funktionieren weiter**, sehen aber anders aus.

**Aktionsplan:**

| Wo                                                | Was                                                                                                                                                                                                                                                                                                                                                                                                                                                                         |
| ------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `README.md` (NEUER Abschnitt „Changelog" am Ende) | Das Repo hat heute kein eigenes `CHANGELOG.md`. Statt eine neue Datei zu erstellen (zusätzlicher Maintenance-Overhead), wird im README ein **Changelog-Abschnitt** angelegt. Eintrag unter „v0.10.0" o. ä.: **Breaking visual change**: ViewBox 720→760, PVs/Akkus rücken nach innen, Verbraucher als Bogen rechts. Bestehende Configs unverändert, aber Optik neu. Wer das alte Aussehen explizit braucht: Issue eröffnen — `display.layout: 'classic'` ist v1.x-Kandidat. |
| `README.md` (existierender Body)                  | Screenshot austauschen, kurzer Migrations-Hinweis: „Wenn die Card nach Update kleiner/anders wirkt — das ist die neue Default-Geometrie; Inhalt bleibt gleich."                                                                                                                                                                                                                                                                                                             |
| Release-Notes auf GitHub (für HACS)               | Gleiche Botschaft kurz im Release-Description-Feld. Manueller Schritt beim Tag-Push.                                                                                                                                                                                                                                                                                                                                                                                        |

**Was _nicht_ breaking ist** und keine Kommunikation braucht:

- Daten-Mapping unverändert (Default `consumer_grouping: 'none'`)
- API/YAML-Schema rückwärtskompatibel
- Engine-Verhalten identisch

## 13. Offene Punkte / v1.x-Kandidaten

- Pro-Sensor Area-Override (`consumer.area: kueche` als YAML-Override für falsche HA-Zuweisung)
- Farb-Stufung des SoC-Rings (rot < 20 %, grün > 20 %, evtl. amber bei aktivem Laden)
- Klick auf Gruppen-Knoten: öffnet HA-Area-Page statt einzelnem Sensor-Dialog (heute öffnet sich der erste Member)
- Tooltip auf Gruppe mit Member-Liste und Pro-Sensor-Power-Breakdown
- Animation, wenn Sensor live einer Area zugewiesen wird (Re-render statt Hard-Cut)

---

**Hinweis:** Alle Doku-Updates (CLAUDE.md, architecture.md, ADRs, README, CHANGELOG) sind explizit als Schritte 11 + 12 in §10 verlistet und werden vom Implementation-Plan getrackt.
