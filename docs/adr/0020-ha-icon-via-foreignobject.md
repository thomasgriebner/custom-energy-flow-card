# ADR-0020: `<ha-icon>` via `<foreignObject>` statt inline `mdi-paths.ts`

- **Status:** draft (promote zu `accepted` nach Plan-Phase 3 — Renderer-Migration grün)
- **Datum:** 2026-05-13
- **Entscheider:** @griebner

## Kontext und Problem

Hauptspec [`2026-05-10-…-design.md`](../specs/2026-05-10-custom-energy-flow-card-design.md) §5.3 plant eine Inline-`<path>`-Map (`mdi-paths.ts`) für die ~5 Default-Icons. Mit der Subspec [`2026-05-11-consumer-grouping-and-layout.md`](../specs/2026-05-11-consumer-grouping-and-layout.md) (Verbraucher-Gruppierung) kommen Area-Icons hinzu, die **zur Compile-Zeit nicht bekannt** sind — eine statische Map kann sie nicht abdecken.

## Entscheidungs-Treiber

- User-konfigurierbare Icons aus dem Editor (Solar/Battery/Consumer) sollen tatsächlich gerendert werden — heute werden alle `mdi:*`-Werte verworfen
- Area-Icons aus `hass.areas[*].icon` (dynamische User-HA-Konfig) müssen ebenfalls funktionieren
- Bundle-Budget ≤ 60 kB (Hauptspec §2.1) bleibt einzuhalten
- Wartungsaufwand soll niedrig sein

## Geprüfte Optionen

- **A — `<ha-icon>` via `<foreignObject>`** (HA-globales Custom Element, deckt alle dynamischen Icons ab)
- **B — Inline-Path-Map `mdi-paths.ts`** (Hauptspec-Plan, Wartungslast + funktioniert nur für bekannte Set)
- **C — Hybrid** (Defaults inline, dynamische via ha-icon — zwei Code-Pfade)

## Entscheidung

**Gewählt: Option A.** Begründung: dynamische User-/Area-Icons + null Wartungslast wiegen mehr als die 1–2 kB Bundle-Ersparnis. `<ha-icon>` ist HA-globales Custom Element (siehe Hauptspec §6.4.2), in jeder HA-Instanz garantiert verfügbar.

Spike-Verifikation (Plan-Phase 0 Task 0.1) hat im echten Chromium bestätigt: Lit's `svg`-Template + `<foreignObject>` + HTML-`<ha-icon>` funktioniert nativ (alle 5 Assertions grün — `ha-icon instanceof HTMLElement === true`, `connectedCallback` feuert, `namespaceURI` korrekt). Spec §10.1 Workaround-Strategien (unsafeSVG, Render-Lifecycle-Hook, mdi-paths-Fallback) sind dokumentierte Mitigationen für den Fall, dass sich das in zukünftigen Lit-Versionen ändert.

### Positive Konsequenzen

- Beliebige `mdi:*`-Icons funktionieren ohne Wartung
- Area-Icons (Subspec 2026-05-11) werden automatisch gerendert
- Card-Mod-Hook via `<foreignObject part="node-icon">` möglich

### Negative Konsequenzen

- Sandbox + Vitest brauchen einen `ha-icon`-Stub via `@mdi/js` (DevDep) — kein Prod-Impact
- Visuelle Diff: Icons werden farbig (Knoten-Farbe via `currentColor`) statt monochrom (heutige `--primary-text-color`)

## Pros und Cons der Optionen

### Option A — `<ha-icon>` via `<foreignObject>` (gewählt)

- ✅ Dynamische Icons (User + Area) ohne Wartung
- ✅ Null Bundle-Impact in Prod (`@mdi/js` ist DevDep, nur Stub)
- ✅ Card-Mod-Hook via `part`-Attribut
- ✅ Spike grün — Lit-Namespace-Quirk in Chromium nicht relevant
- ❌ Stub-Komplexität für Sandbox/Tests (akzeptabel)

### Option B — Inline `mdi-paths.ts`

- ✅ Volle Kontrolle, kein DevDep
- ✅ Kein Lit-Namespace-Risiko
- ❌ Wartungslast: jedes neue Default-Icon braucht Code-Edit
- ❌ Funktioniert NICHT für User-/Area-Icons (Compile-Zeit-Map)
- ❌ Bricht Subspec 2026-05-11 Area-Icon-Rendering

### Option C — Hybrid

- ✅ Bekannte Set lokal, dynamisch via ha-icon
- ❌ Zwei Code-Pfade, mehr Komplexität
- ❌ Reibung bei „Default + User-Override"-Cases

## Verlinkte Spec-Sektionen / Referenzen

- Subspec [`docs/specs/2026-05-13-icons-and-editor-ids.md`](../specs/2026-05-13-icons-and-editor-ids.md) §8 + §10.1
- [ADR-0016](./0016-ha-area-grouping.md) (Area-Icon-Quelle)
- [ADR-0010](./0010-shared-util-module.md) (Single-Source-Prinzip)
- [ADR-0003](./0003-typescript-lit-rollup.md) (Keine Runtime-Deps außer Lit — `@mdi/js` ist DevDep, kein Verstoß)
