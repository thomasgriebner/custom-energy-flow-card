# ADR-0003: TypeScript + Lit 3 + Rollup als Tech-Stack

* **Status:** accepted
* **Datum:** 2026-05-10
* **Entscheider:** @griebner

## Kontext und Problem

Welcher Tech-Stack passt zu einer HA-Custom-Card mit folgenden Anforderungen:
typsicher, schlankes Bundle (≤ 60 kB), HACS-distribuierbar, gut testbar,
konsistent zum HA-Ökosystem?

## Entscheidungs-Treiber

* HACS distribuiert ein einziges JS-File; ESM-fähig
* HA Frontend ist selbst Lit-basiert → Wiederverwendung von HA-Custom-Elements
  setzt Lit-Wissen voraus
* Strict-typed Engine (Spec §11.2)
* CI mit `pnpm check` (lint + typecheck + test) muss schnell sein
* Keine Runtime-Dependencies außer Lit (Bundle-Größenobergrenze)

## Geprüfte Optionen

* **A — TypeScript + Lit 3 + Rollup**
* **B — TypeScript + React + Vite (mit Web-Components-Wrapper)**
* **C — Vanilla JS + Web Components ohne Framework**
* **D — TypeScript + Lit 3 + esbuild/tsup**

## Entscheidung

**Gewählt: Option A.** TypeScript 5.4+, Lit 3.2+, Rollup 4.x. Vitest für Tests.

### Positive Konsequenzen

* Konsistenz mit HA-Frontend → HA-Custom-Elements (`<ha-form>`,
  `<ha-entity-picker>`) sind direkt nutzbar
* Lit ist klein (~5–10 kB minified), Bundle bleibt unter 60 kB
* Rollup ist Standard für HA-Custom-Cards (jede etablierte Card nutzt es) →
  Werkzeuge wie `rollup-plugin-typescript`, `rollup-plugin-terser` sind
  battle-tested
* TypeScript strict mode + experimental decorators harmonieren mit Lit's
  `@property`/`@customElement`-Decorators
* Vitest läuft im Vite-Ökosystem, schnell, Coverage-Reporting eingebaut

### Negative Konsequenzen

* Lit-Lifecycle-Konventionen sind eine Lernkurve (`willUpdate` vs `render`,
  `hasChanged`, `firstUpdated`). *Mitigation:* explizit in Spec §5.7 dokumentiert.
* Experimental Decorators sind langfristig durch TC39-Standard-Decorators
  ablösbar — Migration ist v2-Thema. *Mitigation:* in Spec §2.1 als bekannte
  Verschiebung notiert.

## Pros und Cons der Optionen

### Option A — TypeScript + Lit 3 + Rollup

* ✅ Konsistent mit HA-Frontend
* ✅ Battle-tested in HA-Card-Welt
* ✅ Bundle klein
* ❌ Lit-Lernkurve (akzeptabel)

### Option B — TypeScript + React + Vite

* ✅ Vertraut für viele Devs
* ❌ React + DOM-Interop = ~40 kB Bundle-Overhead
* ❌ HA-Custom-Elements brauchen Wrapper-Aufwand
* ❌ Nicht der etablierte HA-Card-Stack

### Option C — Vanilla JS

* ✅ Minimaler Bundle-Overhead
* ❌ Manuelles DOM-Diffing
* ❌ Manuelle Reactivity
* ❌ Boilerplate explodiert

### Option D — TypeScript + Lit + esbuild/tsup

* ✅ Schneller Build
* ❌ Weniger HA-Card-Tooling-Standard
* ❌ Plugin-Ökosystem kleiner als Rollup
* (akzeptable Alternative, aber nicht nötig)

## Verlinkte Spec-Sektionen / Referenzen

* Spec §2.1, §2.6 (Tech-Stack & Versionen, Templates)
* [Lit-Doku](https://lit.dev)
