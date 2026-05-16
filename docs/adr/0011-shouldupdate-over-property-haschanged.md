# ADR-0011: `shouldUpdate` statt `@property({ hasChanged })` für selektives Re-Render

- **Status:** accepted
- **Datum:** 2026-05-10
- **Entscheider:** @griebner

## Kontext und Problem

HA pusht `hass`-Updates bei jeder State-Änderung _aller_ Entities — auch
solchen, die unsere Card nicht referenziert. Lit's Default reagiert auf jedes
Property-Update mit Re-Render. Wir wollen die Compute-Pipeline (`buildSystemState`
→ `EnergyEngine.compute`) **nur** auslösen, wenn ein in `this._config` referenzierter
Sensor sich tatsächlich geändert hat.

Anti-Pattern wäre: Default-Reactivity beibehalten → Engine läuft hunderte Male
pro Sekunde unnötig (siehe Spec §11.5).

## Entscheidungs-Treiber

- Filter-Logik braucht Zugriff auf `this._config` (nur dort wissen wir, welche
  Sensor-IDs relevant sind)
- Lösung muss idiomatic Lit sein
- Performance ist messbar wichtig (Renderer + Engine pro hass-Push)
- Pattern muss für künftige Entwickler leicht verständlich und reproduzierbar sein

## Geprüfte Optionen

- **A — `shouldUpdate(changedProperties)` Override**
- **B — `@property({ hasChanged: function (this, value, oldValue) {…} })`**
- **C — Custom Property Setter mit manuellem `requestUpdate`-Aufruf**
- **D — `update(changedProperties)` Override**

## Entscheidung

**Gewählt: Option A (`shouldUpdate`).**

```typescript
@property({ attribute: false }) hass?: HomeAssistant;

protected override shouldUpdate(changed: PropertyValues): boolean {
  if (changed.size === 1 && changed.has('hass') && this._config) {
    const prev = changed.get('hass') as HomeAssistant | undefined;
    if (!hassRelevantSensorsChanged(prev, this.hass, this._config)) return false;
  }
  return true;
}
```

### Positive Konsequenzen

- `shouldUpdate` läuft auf der Element-Instanz → voller `this`-Zugriff →
  `this._config` verfügbar.
- Vor Lit's Render-Cycle ausgewertet → keine unnötigen Compute-Läufe.
- `changedProperties` Map liefert sowohl alten als auch neuen Wert → präziser
  Diff möglich.

### Negative Konsequenzen

- Beim Hinzufügen einer neuen `@property` muss man bedenken, ob die im
  shouldUpdate-Filter berücksichtigt werden muss. _Mitigation:_ Default
  `return true` heißt: Properties, die nicht spezifisch behandelt werden,
  triggern Update — sicheres Default.
- Lit-Best-Practice-Doku referenziert primär `hasChanged` für selektive
  Reactivity — Code-Reviewer aus Lit-Welt könnten irritiert sein.
  _Mitigation:_ dieser ADR + Spec §5.7 + conventions.md erklären den Grund.

## Pros und Cons der Optionen

### Option A — `shouldUpdate`

- ✅ Voller `this`-Zugriff
- ✅ Vor Render-Cycle, spart Compute
- ✅ `changedProperties` mit alten Werten verfügbar
- ❌ Nicht der erste Lit-Doku-Reflex

### Option B — `@property({ hasChanged })`

- ✅ Lit-Doku-idiomatisch
- ❌ Callback wird ohne `this`-Binding aufgerufen — kann nicht `this._config`
  lesen. Lit signiert es als `(value, oldValue) => boolean`.
- ❌ Ende des Versuchs.

### Option C — Custom Setter mit manuellem `requestUpdate`

- ✅ Volle Kontrolle
- ❌ Hebelt Lit's Reactive-Pipeline aus, eigene State-Synchronisation
- ❌ Zerschneidet @property-Semantik

### Option D — `update()` Override

- ✅ Volle Kontrolle
- ❌ Läuft _nach_ willUpdate; Compute läuft ggf. trotzdem
- ❌ Eingriff weit unten im Lit-Lifecycle, fehleranfällig

## Verlinkte Spec-Sektionen / Referenzen

- Spec §5.7 (Update-Strategie & Lit-Lifecycle)
- Spec §11.5 (Anti-Patterns)
- conventions.md §11 (Anti-Patterns)
- Plan Task 3.2 (`card.ts` `shouldUpdate`-Implementation)
- [ADR-0023](./0023-i18n-via-hass-locale.md) (erweitert `shouldUpdate` um Locale-Vergleich für i18n-Wechsel)
- [Lit-Doku: shouldUpdate](https://lit.dev/docs/components/lifecycle/#shouldupdate)
