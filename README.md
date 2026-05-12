# Custom Energy Flow Card

Lovelace-Custom-Card für Home Assistant zur Live-Visualisierung des
Energieflusses in Mehr-Quellen-Haushalten — beliebig viele PV-Anlagen,
Akkus (1:1 mit ihrer ladenden PV gepairt), Großverbraucher.

## Was sie kann

- Solar oben, Netz links, Akkus unten, Verbraucher rechts, Haus mittig — alle Knoten als Kreise
- Animierte Punktströme entlang aktiver Pfade (Geschwindigkeit/Anzahl skaliert mit Leistung)
- Anteils-Ring um den Haus-Knoten zeigt Quellen-Anteile am aktuellen Verbrauch
- Werte in Watt mit Tausendertrennung; Netz mit Vorzeichen (`+Bezug` / `−Einspeisung`)
- HA-Theme-aware (Light/Dark folgt automatisch)
- Klick auf Knoten → HA-`more-info`-Dialog
- Tastatur-navigierbar
- YAML-Config plus grafischer Editor
- HACS-installierbar

## Installation via HACS

1. HACS öffnen → "Custom repositories" → Dieses Repo als "Lovelace" hinzufügen.
2. "Custom Energy Flow Card" installieren.
3. Resource in `configuration.yaml` (oder UI) eintragen:
   ```yaml
   resources:
     - url: /hacsfiles/custom-energy-flow-card/custom-energy-flow-card.js
       type: module
   ```

## Beispiel-Config

Siehe [`examples/2-pv-2-batt.yaml`](./examples/2-pv-2-batt.yaml) für eine
vollständige Beispiel-Konfiguration mit 2 PV-Anlagen, 2 Akkus, 3 Verbrauchern.

## Schema-Referenz

| Feld          | Typ                              | Pflicht | Beschreibung               |
| ------------- | -------------------------------- | ------- | -------------------------- |
| `type`        | `custom:custom-energy-flow-card` | ja      | —                          |
| `title`       | string                           | nein    | Card-Titel                 |
| `solar[]`     | Liste                            | nein    | siehe unten                |
| `battery[]`   | Liste                            | nein    | siehe unten                |
| `grid`        | Objekt                           | ja      | siehe unten                |
| `home`        | Objekt                           | nein    | optionaler Override-Sensor |
| `consumers[]` | Liste                            | nein    | siehe unten                |
| `display`     | Objekt                           | nein    | Anzeige-Optionen           |

### `solar[]`

```yaml
- id: <eindeutig im solar-Array>
  name: <optional>
  power: sensor.<entity> # in W, kW, mW (auto-konvertiert)
  icon: mdi:<icon> # optional
```

### `battery[]`

Entweder ein signierter Power-Sensor:

```yaml
- id: <eindeutig im battery-Array>
  name: <optional>
  soc: sensor.<entity> # 0–100 %
  power: sensor.<entity> # signiert: + laden, − entladen
  power_invert: false # falls Sensor umgekehrt liefert
  charged_by: <solar.id> # Pairing → Pflicht, 1:1
  icon: mdi:<icon>
```

oder zwei separate Sensoren (z. B. Sungrow, Solarwatt):

```yaml
- id: <eindeutig im battery-Array>
  name: <optional>
  soc: sensor.<entity> # 0–100 %
  charge_power: sensor.<entity> # ≥ 0, nur Lade-Leistung
  discharge_power: sensor.<entity> # ≥ 0, nur Entlade-Leistung
  charged_by: <solar.id> # Pairing → Pflicht, 1:1
  icon: mdi:<icon>
```

Genau eine der beiden Varianten pro Battery — nicht beides, nicht keines.

### `grid`

Entweder ein signierter Sensor:

```yaml
grid:
  power: sensor.grid_power # + Bezug, − Einspeisung
  power_invert: false
```

oder zwei separate:

```yaml
grid:
  import: sensor.grid_import
  export: sensor.grid_export
```

### `home`

```yaml
home:
  name: <optional Anzeigename> # Default: "Hausverbrauch"
  power: sensor.<entity> # optional Override-Sensor (W)
  icon: mdi:<icon>
```

Ohne `power` wird der Hausverbrauch aus der Bilanz berechnet:

```
P_home = ΣPV + ΣAkku-Entladen + Netzbezug − ΣAkku-Laden − Einspeisung
```

### `consumers[]`

```yaml
- name: <Anzeigename> # required
  power: sensor.<entity> # ≥ 0
  icon: mdi:<icon>
```

### `display`

```yaml
display:
  active_threshold_w: 5 # darunter wird der Pfad ausgeblendet
  number_format: grouped # "standard" | "grouped"
  show_inactive_paths: false
  animation:
    base_duration_s: 2.5
    reference_power_w: 1000
    min_duration_s: 0.6
    max_dots_per_path: 4
  colors: # optional Override pro semantischer Rolle
    solar: '#f59e0b' # Solar-Fluss
    battery: '#10b981' # Akku → Haus
    grid_import: '#6b7280' # Netzbezug
    grid_export: '#16a34a' # Einspeisung
    home: '#ef4444' # Haus-Knoten
    consumer: '#db2777' # Verbraucher
    warning: '#eab308' # Diagnose-Icon (Engine-Warnings)
```

### `display.consumer_grouping`

Optional. Default: `none`.

- `none` (Default) — jeder Sensor aus `consumers[]` wird als eigener Knoten gezeigt.
- `by_area` — die Card resolvt für jeden Sensor die zugewiesene Area
  (aus HAs Entity/Device-Registry) und merged Sensoren gleicher Area zu einer
  Gruppe. Anzeige-Name = Area-Name.

Beispiel: siehe [`examples/with-grouping.yaml`](./examples/with-grouping.yaml).

**Hinweise zur Visualisierung:**

- Optimiert für 1–6 PV-Anlagen und 1–8 sichtbare Verbraucher (Einzel-Sensoren
  oder Area-Gruppen).
- Bei > 8 Verbrauchern wird der Bogen visuell dicht — funktional bleibt alles
  erhalten, aber die Lesbarkeit leidet.
- Sensoren ohne Area landen in einer Gruppe „Sonstige".

### Sensor-Format

Alle `power`/`soc`-Felder erwarten die HA-Standard-Form `domain.object_id`
(Regex: `^[a-z_][a-z0-9_]*\.[a-z0-9_]+$`). Beispiel: `sensor.solar_dach_power` ✓,
`not_an_entity` ✗.

Power-Sensoren werden mit `unit_of_measurement` aus den HA-Attributen erkannt
und automatisch nach W konvertiert (`W`, `kW`, `mW`, `VA` unterstützt).

## Debug-Modus

Falls die Card nicht wie erwartet funktioniert: setze `display.debug: true` in
der Config. Die Card schreibt dann ausführliche `[CEFC] …`-Logs in die
Browser-Console (HA-Frontend → DevTools → Console), die uns bei Bug-Triage helfen.

```yaml
display:
  debug: true
```

## Pairing-Regel

Jeder Akku referenziert genau eine PV via `charged_by`. Eine PV darf
höchstens _einer_ Battery zugeordnet sein (1:1). Eine PV ohne gepairten
Akku ist erlaubt; ein Akku ohne `charged_by` ist nicht erlaubt.

## Sensor-Vorzeichen

- **PV-Sensor**: ≥ 0 W
- **Akku-Sensor**: entweder signiert (`+` = laden, `−` = entladen; `power_invert: true`
  falls Sensor umgekehrt arbeitet) oder zwei separate ≥ 0-Sensoren
  (`charge_power` + `discharge_power`)
- **Netz-Sensor**: signiert: `+` = Bezug, `−` = Einspeisung. Oder alternativ
  zwei separate Sensoren `import`/`export`

## Anpassen mit card-mod

Die Card stellt CSS `::part()`-Hooks bereit:

| Part                                                                        | Element      |
| --------------------------------------------------------------------------- | ------------ |
| `card`                                                                      | Card-Wrapper |
| `node`                                                                      | jeder Knoten |
| `node-solar` / `node-battery` / `node-grid` / `node-home` / `node-consumer` | per Typ      |
| `flow`                                                                      | jeder Fluss  |
| `flow-pv-to-home` / …                                                       | per Pfad-Typ |
| `home-ring`                                                                 | Anteils-Ring |

## Changelog

### v0.10.0 (unreleased)

**Breaking visual change.** Existierende Configs funktionieren unverändert,
aber die Optik der Card ist neu:

- ViewBox 720×540 → **820×540** (breiter wegen Verbraucher-Labels rechts neben den Knoten).
- PVs und Akkus clustern in der linken 2/3-Fläche (x ∈ [130, 440]) statt voll verteilt.
- Verbraucher sind ein Bogen rechts um Home (statt vertikale Spalte).
- Akku-Ladestand als **Ring** statt Text-Label (analog zum Home-Attribution-Ring).
- Card deklariert ihre bevorzugte Größe an HA Sections-View via `getGridOptions()`.

**Neu:**

- `display.consumer_grouping: by_area` — automatische Verbraucher-Gruppierung
  nach HA-Area (siehe `examples/with-grouping.yaml`).
- SoC-Sensor wird im Akku-Knoten als gefüllter Ring visualisiert (0–100 %).

Falls das alte Aussehen explizit benötigt wird: GitHub-Issue eröffnen —
`display.layout: 'classic'` ist als v1.x-Option vorgesehen.

## Lizenz

MIT.
