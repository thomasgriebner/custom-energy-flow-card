# ADR-0014: HA-Stub-Config wird als valide Config behandelt

* **Status:** accepted
* **Datum:** 2026-05-10
* **Entscheider:** @griebner

## Kontext und Problem

HA-Lovelace ruft `setConfig(config)` mit einer Default-Config auf, die unsere
Card via `static getStubConfig()` selbst liefert. Per Konvention enthält dieser
Stub:

```typescript
{ type: 'custom:custom-energy-flow-card',
  grid: { power: '' },
  solar: [], battery: [], consumers: [] }
```

Dieser Stub bricht aber unsere normale `validateConfig`-Regeln:
* `grid.power = ''` schlägt gegen `ENTITY_RE` fehl
* Alle drei Listen leer → "at least one of solar/battery/consumers" wirft

Spec §6.2 fordert „validiert erfolgreich" — was inkonsistent zu §3.2 wäre, wenn
wir es nicht explizit handhaben. Card und Editor teilen denselben
`validateConfig`-Pfad; eine Lösung muss für beide gelten.

## Entscheidungs-Treiber

* Single-Source-of-Truth für Validierung (Card + Editor identisch)
* Kein Throw beim ersten setConfig-Aufruf (sonst Card-Picker bricht in HA)
* Saubere Trennung: Stub-Erkennung ist Validation-Concern, nicht Render-Concern
* Reader des Codes muss verstehen, warum der "leere Grid + leere Listen"-Fall
  erlaubt ist

## Geprüfte Optionen

* **A — `validateConfig` erkennt Stub-Form via `isStubShape()`-Vorabprüfung
  und gibt sie als gültig zurück**
* **B — Card.setConfig prüft Stub vorab, ruft `validateConfig` nur bei
  Nicht-Stub. Editor muss separat dasselbe tun.**
* **C — `validateConfig` wirft bei Stub; HA zeigt Default-Error; Card-Picker
  fällt zurück auf rohe YAML-Edit.**

## Entscheidung

**Gewählt: Option A.**

```typescript
function isStubShape(c: Partial<Config>): boolean {
  if (c.type !== 'custom:custom-energy-flow-card') return false;
  const gridStub = !!c.grid && 'power' in c.grid && c.grid.power === '';
  const listsEmpty = (c.solar?.length ?? 0) === 0
    && (c.battery?.length ?? 0) === 0
    && (c.consumers?.length ?? 0) === 0;
  return gridStub && listsEmpty;
}

export function validateConfig(input: unknown): Config {
  // … type check first …
  if (isStubShape(c)) {
    return { /* normalized stub */ };
  }
  // … normal validation …
}
```

Card erkennt zur Render-Zeit ebenfalls Stub-Configs (via `card-helpers.ts:isStubConfig`)
und zeigt den freundlichen "Konfiguriere PV/Akku/Verbraucher"-Hinweis.

### Positive Konsequenzen

* Card-Picker in HA-Lovelace funktioniert ohne Crash beim ersten Add.
* Editor und Card verhalten sich identisch — eine Validierung, ein Verhalten.
* Stub-Erkennung ist explizit benannt (`isStubShape`), nicht „magisch versteckt".
* Tests prüfen sowohl die Akzeptanz der Stub-Form als auch den Crash bei
  echten Validation-Fehlern (Plan Task 1.11).

### Negative Konsequenzen

* `validateConfig` hat einen Special-Case-Branch — Reader muss die Stub-Form
  kennen. *Mitigation:* dieser ADR + ausführlicher Kommentar im Code („absichtlich
  gültig — Card rendert dann den Stub-Hinweis").
* Falls HA jemals die Stub-Form ändert (z. B. `grid: undefined` statt
  `{ power: '' }`), müssen wir `isStubShape` mit anpassen. *Mitigation:*
  M1-Reference-Comparison-Pass deckt das auf.

## Pros und Cons der Optionen

### Option A — `validateConfig` akzeptiert Stub

* ✅ Single Source of Truth
* ✅ Card + Editor identisch
* ✅ Testbar
* ❌ Special-Case in der Validierung (kommentiert)

### Option B — Card.setConfig prüft Stub vorab

* ✅ `validateConfig` bleibt rein
* ❌ Editor müsste dasselbe tun → Code-Doppelung (verstößt gegen ADR-0010-Geist)
* ❌ Bug-Anfälligkeit: Drift zwischen Card- und Editor-Stub-Erkennung

### Option C — Stub wirft, HA fällt zurück

* ✅ Strikteste Validation
* ❌ Card-Picker bricht beim ersten Add → echtes UX-Problem
* ❌ Anwender sieht nur Error-Banner statt Card-Demo

## Verlinkte Spec-Sektionen / Referenzen

* Spec §3.2 (Schema-Regeln)
* Spec §6.2 (Card-Lifecycle, getStubConfig)
* Plan Task 1.11 (`config/schema.ts isStubShape` + `validateConfig`)
* Plan Task 3.2 (`card.ts` mit `card-helpers.ts:isStubConfig`)
* [ADR-0010](./0010-shared-util-module.md) (Single-Source-Util — Geist)
