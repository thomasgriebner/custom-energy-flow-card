# custom-energy-flow-card — Design

**Status:** Spec, ready for implementation planning
**Datum:** 2026-05-10
**Autor:** Brainstorming-Session mit @griebner

## 1. Zielsetzung & Scope

### 1.1 Was die Card ist

Ein Lovelace-Custom-Card-Plugin für Home Assistant (`custom-energy-flow-card`),
das den Live-Energiefluss eines Mehr-Quellen-Haushalts visualisiert. Konzeptionell
inspiriert von [`power-flow-card-plus`](https://github.com/flixlix/power-flow-card-plus),
aber neu gebaut, um beliebig viele Solaranlagen, Speicher und Großverbraucher
zu unterstützen — was die Vorlage nicht kann.

### 1.2 Konkrete Motivation

Das Zielsystem des Anwenders besteht aus:

- Balkonkraftwerk **mit eigenem Speicher**
- Dach-PV-Anlage **mit eigenem Speicher**
- 2–3 großen Einzelverbrauchern (z. B. Wärmepumpe, Wallbox, Herd)
- Netzanschluss mit Bezugs-/Einspeisesensorik

`power-flow-card-plus` unterstützt nur eine PV und einen Akku; das ist nicht
ausreichend.

### 1.3 In Scope (v1.0)

- Generisch konfigurierbar: **N PV-Anlagen, N Akkus** (1:1 mit einer PV gepairt),
  **N Großverbraucher**, **1 Netz**, **1 Haus**
- Festes Layout: **Solar oben · Netz links · Akkus unten · Verbraucher rechts ·
  Haus mittig**
- Alle Knoten als **Kreise** mit Icon + Wert innen, **Bezeichner außerhalb** auf
  der jeweils flussfreien Seite
- **Animierte Punktströme** entlang aller aktiven Pfade; Punktanzahl und
  Geschwindigkeit skalieren mit der Leistung
- **Inaktive Pfade werden ausgeblendet** (Threshold-konfigurierbar)
- **Anteils-Ring** (Doughnut) um den Haus-Kreis: zeigt live, woher der
  Hausverbrauch stammt
- Werte in **Watt** mit Tausendertrennung
- Netz signiert: **`+W = Bezug` · `−W = Einspeisung`** (Farbe wechselt mit Vorzeichen)
- Akkus: **SoC %** + Lade-/Entladeleistung mit Vorzeichen
- HA-Theme-aware (Light/Dark folgt automatisch)
- Klick auf Knoten → HA-Standard-`more-info`-Dialog
- YAML-Config **plus** grafischer Editor in Lovelace
- HACS-installierbar

### 1.4 Out of Scope (v1.0)

- Energie-Tagesstatistiken / Historien (HA hat dafür eigene Karten)
- Phasen-aufgelöste Anzeige (L1/L2/L3)
- Dynamische Stromtarif-Anzeige
- Tooltip-Detail-Werte beim Hover (`more-info`-Dialog reicht)
- Internationalisierung (deutsche Default-Strings, mit `name`-Override pro
  Knoten in der Config)

## 2. Architektur

### 2.1 Tech-Stack

- **TypeScript** (strict mode) + **Lit 3** (Custom Element)
- **Rollup** für Bundle (Single-File-Distribution für HACS)
- **Vitest** für Unit-Tests
- Keine Runtime-Dependencies außer Lit (Bundle ~30–50 kB minified)

### 2.2 Modulaufteilung

```
src/
├── card.ts                  # LitElement, HA-Lifecycle, Konfig-Integration
├── editor.ts                # LitElement-Editor (ha-form, Entity-Picker)
├── engine/
│   ├── energy-engine.ts     # Reine Berechnungs-Logik (HA-frei, testbar)
│   ├── flow-graph.ts        # Topologie: Knoten + die 14 Pfad-Definitionen
│   ├── types.ts             # SystemState, FlowResult, Config
│   └── energy-engine.test.ts
├── render/
│   ├── layout.ts            # Knoten-Positionen (Grid → SVG-Koordinaten)
│   ├── flow-renderer.ts     # SVG-Zeichnung Knoten + Pfade
│   ├── flow-animation.ts    # Animation: Dot-Anzahl/Speed aus Leistung
│   ├── home-ring.ts         # Anteils-Doughnut um Haus-Kreis
│   └── layout.test.ts
├── ha/
│   ├── ha-helpers.ts        # fireEvent('hass-more-info'), state-Helper
│   └── theme.ts             # CSS-Variablen-Mapping
├── const.ts                 # Card-Name, Version, Defaults
└── index.ts                 # window.customCards.push, Registrierung

examples/
├── preview.html             # Standalone-Sandbox (Card + Mock-Daten ohne HA)
└── 2-pv-2-batt.yaml         # Beispiel-Config für die README
```

### 2.3 Datenfluss

```
HA hass.states  ─→  card.ts liest Sensor-Werte
                ↓
          buildSystemState(config, hass)  →  SystemState
                ↓
          EnergyEngine.compute(SystemState)  →  FlowResult
                ↓
          Layout.compute(config) + FlowRenderer.render(FlowResult)  →  SVG
```

### 2.4 Schicht-Abgrenzungen

| Modul | kennt nicht |
|---|---|
| `engine/*` | Lit, HA, Farben, SVG |
| `render/*` | HA-Sensorik, Lit-Wrapper |
| `card.ts` | Direkte SVG-Logik (delegiert an Renderer) |

`card.ts` ist die einzige Stelle, an der HA, Engine und Renderer
zusammenkommen.

## 3. Konfigurations-Schema (YAML)

### 3.1 Beispiel-Config

```yaml
type: custom:custom-energy-flow-card
title: Energiefluss

solar:
  - id: dach
    name: Solar Dach
    power: sensor.solar_dach_power
    icon: mdi:solar-power
  - id: balkon
    name: Solar Balkon
    power: sensor.solar_balkon_power
    icon: mdi:solar-panel

battery:
  - id: dach
    name: Dach-Speicher
    soc:   sensor.akku_dach_soc
    power: sensor.akku_dach_power     # signiert: + laden, − entladen
    power_invert: false               # falls Sensor umgekehrt liefert
    charged_by: dach                  # Pairing → muss eine solar.id sein

  - id: balkon
    name: Balkon-Speicher
    soc:   sensor.akku_balkon_soc
    power: sensor.akku_balkon_power
    charged_by: balkon

grid:
  power: sensor.grid_power            # signiert: + Bezug, − Einspeisung
  power_invert: false
  # Alternativ:
  # import: sensor.grid_import
  # export: sensor.grid_export

home:
  name: Hausverbrauch
  # power: sensor.home_total_power    # optional Override; sonst per Bilanz

consumers:
  - name: Wärmepumpe
    power: sensor.heatpump_power
    icon: mdi:heat-pump
  - name: Wallbox
    power: sensor.wallbox_power
    icon: mdi:ev-station
  - name: Herd
    power: sensor.stove_power
    icon: mdi:stove

display:
  active_threshold_w: 5
  number_format: grouped              # standard | grouped (1 900 W)
  show_inactive_paths: false
  animation:
    base_duration_s: 2.5
    reference_power_w: 1000
    min_duration_s: 0.6
    max_dots_per_path: 4
```

### 3.2 Schema-Regeln (Validierung)

- `solar`, `battery`, `consumers` sind Arrays beliebiger Länge (auch leer
  möglich)
- `solar[].id` und `battery[].id` müssen innerhalb ihrer Liste eindeutig sein
- `battery[].charged_by` muss auf eine existierende `solar[].id` zeigen
- `grid` hat **entweder** `power` **oder** `import`+`export`, nie beides, nie keines
- Ungültige Sensor-IDs (Entity nicht in HA): Anzeige `—`, Card stürzt nicht ab
- Default-Icons: `mdi:solar-power` (PV), `mdi:battery` (Akku), `mdi:transmission-tower`
  (Netz), `mdi:home` (Haus), `mdi:power-plug` (Verbraucher)

### 3.3 Editor-UX

Akkordeon mit klappbaren Sektionen:

1. **Allgemein** — `title`, `display.show_inactive_paths`,
   `display.number_format`
2. **Solar** — Liste mit „+ PV hinzufügen". Pro Eintrag: id, name,
   power-Sensor, icon
3. **Akkus** — Liste mit „+ Akku hinzufügen". Pro Eintrag: id, name, soc-Sensor,
   power-Sensor, `power_invert`, **`charged_by` (Dropdown der existierenden
   Solar-IDs)**
4. **Netz** — Toggle „1 signierter Sensor / 2 Sensoren", entsprechende Felder
5. **Verbraucher** — Liste mit „+ Verbraucher hinzufügen". Pro Eintrag: name,
   power-Sensor, icon-Picker
6. **Anzeige** (advanced, default zugeklappt) — `display.animation.*` mit Slidern

Live-Validierung: Pairing-Dropdown rot, wenn das gewählte Solar gelöscht
wurde; „Speichern" deaktiviert, solange invalid.

## 4. Energiebilanz-Algorithmus

Die Engine bekommt einen `SystemState` und liefert ein `FlowResult` mit allen
Pfadleistungen + Hausverbrauch. Reine Mathematik, keine HA-Abhängigkeit.

### 4.1 Eingabe (`SystemState`)

| Feld | Typ | Beschreibung |
|---|---|---|
| `pv[i].power_w` | `number` | PV-Leistung, ≥ 0 |
| `battery[j].power_w` | `number` | signiert (+ laden, − entladen) |
| `battery[j].soc_pct` | `number` | 0–100 |
| `battery[j].paired_pv_id` | `string` | ID der ladenden PV |
| `grid.power_w` | `number` | signiert (+ Bezug, − Einspeisung) |
| `consumer[k].power_w` | `number` | ≥ 0 |
| `home.power_override_w?` | `number` | optional, sonst berechnet |

### 4.2 Schritt 1 — Decomposition

```
charge[j]    = max(0,  battery[j].power_w)
discharge[j] = max(0, -battery[j].power_w)
import       = max(0,  grid.power_w)
export       = max(0, -grid.power_w)
```

### 4.3 Schritt 2 — Hausverbrauch

```
P_home_calculated = Σ pv[i].power_w
                  + Σ discharge[j]
                  + import
                  − Σ charge[j]
                  − export

P_home = home.power_override_w ?? max(0, P_home_calculated)
```

### 4.4 Schritt 3 — Pairing: PV → Akku

Jeder ladende Akku wird zuerst aus seiner gepairten PV gespeist:

```
für jeden Akku j mit charge[j] > 0:
  i = paired_pv(j)
  P_pv→batt[i] = min(pv[i].power_w, charge[j])
  P_pv_remaining[i] = pv[i].power_w − P_pv→batt[i]

  // Pairing-Defizit: PV nicht stark genug → Rest kommt logisch aus dem Netz
  // Wird im FlowResult als pairing_deficit[j] ausgewiesen, aber nicht als
  // separater "Grid → Battery"-Pfad visualisiert (steckt im Netzbezug).
  pairing_deficit[j] = charge[j] − P_pv→batt[i]
```

### 4.5 Schritt 4 — Quellen → Haus (Priorität: PV → Akku → Netz)

```
total_pv_to_home   = min(P_home, Σ P_pv_remaining[i])
remaining_demand   = P_home − total_pv_to_home

total_batt_to_home = min(remaining_demand, Σ discharge[j])
remaining_demand   −= total_batt_to_home

P_grid_to_home     = max(0, remaining_demand)
```

### 4.6 Schritt 5 — Excess → Netzeinspeisung

```
total_pv_to_grid   = Σ P_pv_remaining[i] − total_pv_to_home
total_batt_to_grid = Σ discharge[j]      − total_batt_to_home
```

### 4.7 Schritt 6 — Per-Quelle Aufteilung

Innerhalb einer Quellengruppe wird proportional zur Einzelleistung gesplittet:

```
falls Σ P_pv_remaining > 0:
  P_pv→home[i] = P_pv_remaining[i] / Σ P_pv_remaining * total_pv_to_home
  P_pv→grid[i] = P_pv_remaining[i] / Σ P_pv_remaining * total_pv_to_grid
sonst: alle P_pv→…[i] = 0

falls Σ discharge > 0:
  P_batt→home[j] = discharge[j] / Σ discharge * total_batt_to_home
  P_batt→grid[j] = discharge[j] / Σ discharge * total_batt_to_grid
sonst: alle P_batt→…[j] = 0
```

### 4.8 Schritt 7 — Reconcile mit Netz-Sensor

Sensor-Latenz und Wechselrichter-Verluste verursachen kleine Bilanzfehler.
Der Netz-Sensor wird als „ground truth" genommen; abgeleitete Export- und
Import-Werte werden auf den gemessenen Wert normiert:

```
expected_export = total_pv_to_grid + total_batt_to_grid
falls |expected_export − export| > 1 W:
  scale = export / expected_export   (falls expected_export > 0)
  P_pv→grid[i]   *= scale
  P_batt→grid[j] *= scale

// Analog für Import: Differenz wird in P_grid_to_home geclamped.
```

Inkonsistenzen > 100 W werden als Warning in `FlowResult.warnings[]`
zurückgegeben (zur späteren Anzeige im Editor / Debugging-Tool).

### 4.9 Schritt 8 — Haus → Verbraucher

```
P_home→consumer[k] = consumer[k].power_w   (direkt aus Sensor)

// Implizite "Sonstige": P_home − Σ consumer[k].power_w
// Wird nicht als Flow visualisiert, ist aber im Anteils-Ring enthalten
// (steckt schon in den Quellen-Segmenten).
```

### 4.10 Anteils-Ring (Doughnut)

Segmente proportional zu:

```
share_pv[i]  = P_pv→home[i]  / P_home
share_batt[j] = P_batt→home[j] / P_home
share_grid   = P_grid_to_home / P_home

  Σ aller shares = 1.0
```

### 4.11 Engine-Edge-Cases (Test-Tabelle)

| Szenario | Erwartung |
|---|---|
| Alle Werte 0 | Alle Flows 0; P_home 0; ring leer |
| Sonniger Tag, Akkus laden, Überschuss ins Netz | PV→Akku, PV→Haus, PV→Netz aktiv; Akku→… inaktiv |
| Abend, Akkus speisen Haus + Netz | Akku→Haus, Akku→Netz aktiv; PV inaktiv |
| Nacht, Netzbezug | Nur Netz→Haus, Haus→Verbraucher |
| Pairing-Defizit (Akku lädt 500 W, PV liefert 200 W) | `pairing_deficit[j] = 300 W`, Akku zeigt `+500 W laden` |
| `home.power_override` gesetzt | P_home = override, Bilanz-Berechnung übersprungen |
| Negative PV-Werte (Sensor-Glitch) | Auf 0 geclampt, Warning |
| Netz-Reconcile: PV+Akku-Export > export-Sensor | Skalierung greift |
| Keine PV in Config | PV-Sektion leer, alle PV-Flows 0 |
| Keine Akkus in Config | Akku-Sektion leer, alle Akku-Flows 0 |
| `Σ Verbraucher > P_home` (Sensor-Drift) | Verbraucher-Werte direkt anzeigen, "Sonstige" implizit negativ → 0 |

## 5. Rendering & Animation

### 5.1 Layout-Engine

Logisches Grid mit fixen Zonen:

```
                 [Solar oben]
[Netz links]    [    Haus    ]    [Verbraucher rechts]
                 [Speicher unten]
```

- **Solar oben:** N PV-Kreise horizontal verteilt, zentriert über dem Haus
- **Speicher unten:** M Akku-Kreise horizontal verteilt, **gleiche x-Achse wie
  ihre gepairte PV** (visuelle Pairing-Ankerung)
- **Verbraucher rechts:** vertikal gestapelt
- **Netz links** und **Haus mittig** auf fester Position

SVG-Viewport responsiv: `viewBox="0 0 720 540"` als Basis,
`preserveAspectRatio="xMidYMid meet"`. Card skaliert in jeder Lovelace-Spalte.

### 5.2 Pfad-Routing

14 Pfade (für 2 PV / 2 Akku / 3 Verbraucher), generalisiert:

| Quelle → Ziel | Routing |
|---|---|
| Solar i → Akku paired_batt(i) | Vertikale Bahn (Bogen) |
| Solar i → Haus | Bogen Richtung Mitte |
| Solar i → Netz | Bogen über die linke Seite (ggf. quer bei rechter PV) |
| Akku j → Haus | Bogen nach oben Richtung Mitte |
| Akku j → Netz | Bogen unter dem Haus durch nach links |
| Netz → Haus | Gerade horizontal |
| Haus → Verbraucher k | Gerade horizontal nach rechts |

SVG quadratic-Bezier-Kurven (`<path d="M … Q … …">`). Pfade werden bei Layout-
Berechnung erzeugt und gecacht; Re-Generierung nur bei Config-Änderung oder
Container-Resize.

### 5.3 Knoten-Rendering

Jeder Knoten = SVG-`<g>`:

```html
<g transform="translate(x y)">
  <!-- Bezeichner außerhalb auf flussfreier Seite -->
  <text class="node-name" y="-58">Solar Dach</text>
  <!-- Kreis -->
  <circle r="42" fill="var(--ha-card-background)"
          stroke="var(--c-solar)" stroke-width="2.5"/>
  <!-- Icon (MDI als <ha-icon>-Pendant via SVG-Path) -->
  <text class="node-icon" y="-4">☀️</text>
  <!-- Wert -->
  <text class="node-value" y="16">2 000</text>
  <text class="node-unit" y="28">W</text>
</g>
```

Bezeichner-Position pro Zone:

| Zone | Label-Position |
|---|---|
| Solar (oben) | oberhalb des Kreises |
| Akku (unten) | unterhalb des Kreises |
| Netz (links) | oberhalb des Kreises |
| Verbraucher (rechts) | oberhalb des Kreises |
| Haus (mittig) | unterhalb des Anteils-Rings |

### 5.4 Anteils-Ring (Haus)

Konzentrische `<circle>` mit `stroke-dasharray`. Pro Quelle ein Segment,
`stroke-dashoffset` summiert sich. Update nur bei `FlowResult`-Änderung.

### 5.5 Flow-Animation

Pro Pfad mit Leistung > `display.active_threshold_w`:

**1. Linie selbst:** `stroke-dasharray: 4 6` + CSS-`@keyframes`
   `stroke-dashoffset: 0 → −40`. Animation-Duration skaliert mit Leistung
   (höhere Leistung → schnellere Strömung).

**2. Punkte:** SVG-`<circle>` mit `<animateMotion>`, `<mpath>` referenziert den
   Pfad.

```
duration_s = base_duration_s × (reference_power_w / power_w)
   clamped to [min_duration_s, base_duration_s × 4]

dot_count = ceil(power_w / reference_power_w × 2)
   clamped to [1, max_dots_per_path]

dots gestaffelt:  begin = i × (duration_s / dot_count)
```

Resultat: bei 0 W keine Punkte; bei ~500 W 1 Punkt langsam; bei ~2 000 W
4 Punkte zügig.

**3. Inaktive Pfade** (≤ Threshold) — `display:none` auf Linie, `<animateMotion>`
   wird komplett entfernt (sonst läuft die Animation im Hintergrund weiter und
   verbraucht CPU).

### 5.6 Theme-Mapping

Card nutzt HA-CSS-Variablen für neutrale Farben:

| Element | Variable |
|---|---|
| Card-Hintergrund | `var(--ha-card-background, var(--card-background-color, white))` |
| Text primär | `var(--primary-text-color)` |
| Text sekundär | `var(--secondary-text-color)` |
| Border / Divider | `var(--divider-color)` |
| Card-Padding | `var(--ha-card-padding, 16px)` |

Semantische Akzentfarben **nicht** an HA-Theme gekoppelt (Bedeutung muss in
Light/Dark gleich bleiben). Defaults:

| Bedeutung | Farbe |
|---|---|
| Solar | `#f59e0b` (gelb-orange) |
| Akku → Haus | `#10b981` (grün) |
| Netzbezug (+) | `#6b7280` (grau) |
| Einspeisung (−) | `#16a34a` (sattes grün) |
| Haus | `#ef4444` (rot) |
| Verbraucher | `#db2777` (pink) |

Über `display.colors` in der Config überschreibbar (Power-User).

### 5.7 Update-Strategie

- Card abonniert HA-`hass`-Updates (Lit `@property` mit deepEquality-Check)
- Bei jedem State-Update: Engine läuft, FlowResult wird verglichen, nur
  veränderte Werte triggern Re-Render
- Animationen laufen CSS-/SMIL-basiert weiter ohne JS-Tick → niedrige CPU-Last
- Bei reiner Leistungs-Änderung (gleiche aktive/inaktive Pfade): `dot_count`
  und `duration_s` per CSS-Custom-Property aktualisieren, kein DOM-Rebuild

### 5.8 Reduced Motion

`@media (prefers-reduced-motion: reduce)` schaltet die Punktanimation aus,
lässt die Linien-Streaming-Animation (subtiler) bestehen. Knoten-Werte
aktualisieren weiter normal.

## 6. Editor (GUI)

### 6.1 Registrierung

```typescript
// in card.ts
static getConfigElement(): HTMLElement {
  return document.createElement('custom-energy-flow-card-editor');
}
static getStubConfig(): Partial<Config> {
  return { /* sinnvolle Mindest-Config */ };
}
```

Editor-Element ist ein eigenes `LitElement` in `src/editor.ts`.

### 6.2 Form-Schema

Aufgebaut mit `<ha-form>` und HA-Selectoren:

- `selector: { entity: { domain: 'sensor', device_class: 'power' } }` für Power-
  Sensoren
- `selector: { entity: { domain: 'sensor', device_class: 'battery' } }` für SoC
- `selector: { icon: {} }` für Icon-Picker
- `selector: { number: { min, max, step, unit } }` für Animations-Config

### 6.3 Pairing-Dropdown

Beim Akku-Editor enthält `charged_by` ein `selector: { select: { options: […] } }`,
dessen Optionen aus den aktuell konfigurierten `solar[].id`-Einträgen kommen.
Wird ein Solar gelöscht, dessen ID noch referenziert ist: rote Inline-Fehlermeldung.

### 6.4 Validierung

Vor `config-changed`-Event:

- Schema-Check (Zod oder eigene Validate-Funktion)
- Pairing-Integrität
- Mindestens 1 Solar **oder** 1 Akku **oder** 1 Verbraucher **oder** Netz konfiguriert

Bei Fehler: kein Save, Inline-Fehler unter dem entsprechenden Feld.

## 7. Build, Tests, Distribution

### 7.1 Package & Build

```json
{
  "name": "custom-energy-flow-card",
  "version": "1.0.0",
  "module": "dist/custom-energy-flow-card.js",
  "scripts": {
    "dev": "rollup -c -w",
    "build": "rollup -c",
    "test": "vitest run",
    "test:watch": "vitest",
    "lint": "tsc --noEmit"
  }
}
```

Rollup-Output: ES2020 Single-File-Bundle, terser für Produktion, Source-Maps
in `dist/`.

### 7.2 Test-Strategie

Da der Anwender keine Test-HA-Instanz hat und v1.0 direkt produktiv eingespielt
wird, muss die Verifikation vor dem Release maximal stark sein:

| Schicht | Tool | Anspruch |
|---|---|---|
| `engine/*` | Vitest, tabellengetrieben | ≥ 90 % Coverage, alle Edge-Cases aus 4.11 |
| `render/layout` | Vitest, Snapshot | Schnappschüsse für 1, 2, 3, 5 PV-Anzahlen |
| `render/flow-renderer`, `home-ring`, `flow-animation` | Manuell via Sandbox | 6–8 Mock-Szenarien in `examples/preview.html` |
| `editor.ts` | Manuell via Sandbox | Form-Logik mit Mock-`hass` |
| `ha/*` | Code-Review nach HA-Konventionen | Orientierung an power-flow-card-plus |

### 7.3 Standalone-Sandbox (`examples/preview.html`)

Statische HTML-Datei, die das gebaute Bundle lädt und mit Mock-`hass`-Daten +
Mock-`FlowResult`-Daten 6–8 Szenarien durchschaltet (Buttons im UI). So lässt
sich das Rendering ohne HA verifizieren. Wird mit ausgeliefert (im Repo, nicht
zwingend im HACS-Bundle).

Szenarien:

1. ☀️ Sonniger Tag · beide Akkus laden · Überschuss → Netz
2. 🌙 Abend · beide Akkus speisen Haus + Netz
3. 🌃 Nacht · Reiner Netzbezug
4. ⚡ Pairing-Defizit (Akku lädt, PV zu schwach)
5. 🔌 Großverbraucher aktiv (Wallbox an)
6. 🛑 Alle Werte 0 (ruhender Zustand)
7. ⚠️ Inkonsistente Sensor-Werte (Reconcile-Test)
8. 🔢 5 PV-Anlagen (Layout-Stress-Test)

### 7.4 HACS-Distribution

```
hacs.json:
{
  "name": "Custom Energy Flow Card",
  "render_readme": true,
  "filename": "custom-energy-flow-card.js"
}
```

GitHub-Release pro Version mit `dist/custom-energy-flow-card.js` als Asset.
Standard-HACS-Workflow: User trägt Repo in HACS „Custom" ein, installiert,
fügt Resource in Lovelace ein.

### 7.5 README-Inhalt

- Screenshots aus der Sandbox (Light + Dark)
- Installation via HACS (3 Schritte)
- YAML-Beispiel (1-PV-Setup minimal, 2-PV-2-Akku-Setup wie in 3.1)
- Schema-Referenz (alle Felder mit Defaults)
- FAQ: Pairing-Regel, Sensor-Vorzeichen, Reconcile-Verhalten
- Link zum Sandbox-Preview (GitHub Pages)

## 8. Entwicklungs-Phasen (intern, kein Release)

Da der Anwender v1.0 als ersten Test einspielt, sind das interne Etappen zur
Fortschrittskontrolle, **keine** veröffentlichten Versionen:

1. **Phase 1 — Engine**
   - `engine/types.ts`, `engine/flow-graph.ts`, `engine/energy-engine.ts`
   - Vollständige Test-Suite aus 4.11 grün
   - Verifikation: `pnpm test` zeigt grünen Lauf, ≥ 90 % Coverage

2. **Phase 2 — Renderer + Sandbox**
   - `render/layout.ts`, `render/flow-renderer.ts`, `render/flow-animation.ts`,
     `render/home-ring.ts`
   - `examples/preview.html` mit allen 8 Szenarien
   - Verifikation: optisches OK in allen Szenarien

3. **Phase 3 — HA-Integration**
   - `card.ts`, `ha/*`, `index.ts`
   - Lebenszyklus, more-info-Click, Theme-Mapping
   - Verifikation: Sandbox läuft mit Mock-`hass`, Code-Review gegen HA-Konventionen

4. **Phase 4 — Editor**
   - `editor.ts` mit ha-form + Pairing-Dropdown
   - Validierung
   - Verifikation: Editor in Sandbox mit Mock-`hass`

5. **Phase 5 — Polish & Release**
   - HACS-Konformität (`hacs.json`, GitHub-Release-Workflow)
   - README inkl. Screenshots
   - `examples/2-pv-2-batt.yaml`
   - Verifikation: Release-Build erzeugt, in produktivem HA installierbar
   - Anwender-Akzeptanztest in seinem realen HA-Setup

## 9. Offene Punkte / Annahmen

Diese werden in der Plan-Phase oder bei Implementierung konkretisiert:

- **Battery-Sensor-Konventionen variieren herstellerseitig.** `power_invert`
  in der Config deckt den Standardfall ab; Sonderfälle (z. B. zwei separate
  Sensoren `charge_w` + `discharge_w`) werden nicht in v1.0 unterstützt.
- **Verbraucher-Anzahl > 5** könnten vertikal überquellen. Das Layout sieht
  Scrolling oder Skalierung nicht vor; Empfehlung in der README, max. 5 zu
  konfigurieren.
- **PV-Anzahl > 4** dito.
- **Icon-Rendering:** MDI-Icons werden als `<ha-icon>`-Pendant im SVG via
  inline `<path>` gerendert. Falls das zu viel Boilerplate wird, fällt v1.0
  auf Emoji-Defaults zurück und MDI-Path-Embedding kommt in v1.1.

## 10. Erfolg

v1.0 ist erfolgreich, wenn:

- [ ] Anwender installiert die Card per HACS in seinem produktiven HA
- [ ] Beide PV-Anlagen, beide Speicher und drei Verbraucher werden korrekt
      angezeigt
- [ ] Energieflüsse stimmen zur jeder Tageszeit qualitativ mit der Realität
      überein
- [ ] Anteils-Ring zeigt sinnvolle Verteilung
- [ ] Klick auf Knoten öffnet `more-info`
- [ ] Editor in Lovelace funktioniert für initialen Setup
- [ ] Card crasht nicht bei kurzfristig fehlenden Sensoren
