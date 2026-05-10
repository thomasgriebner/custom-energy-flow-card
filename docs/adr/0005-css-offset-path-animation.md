# ADR-0005: CSS `offset-path` statt SVG `<animateMotion>` für Punktströme

* **Status:** accepted
* **Datum:** 2026-05-10
* **Entscheider:** @griebner

## Kontext und Problem

Punkte müssen entlang gekrümmter Pfade fließen. Anzahl und Geschwindigkeit
sollen mit der Leistung skalieren. Wenn sich die Leistung ändert (z. B. PV
schwankt), soll die Animation **ohne DOM-Rebuild** angepasst werden — sonst
flackert die Anzeige bei jedem Sensor-Update.

## Entscheidungs-Treiber

* Animations-Parameter via CSS-Variable updateable (für `style.setProperty`)
* Punktbewegung exakt entlang einer SVG-Bezier-Kurve
* Performance: viele Pfade × viele Punkte ohne JS-Tick
* Browser-Support für aktuelle HA-Browser (Chrome 100+, Firefox 100+, Safari 15+)

## Geprüfte Optionen

* **A — CSS `offset-path` + `offset-distance` + `animation-duration` via CSS-Variable**
* **B — SVG `<animateMotion>` mit `<mpath>`**
* **C — Eigene JS-Animation per `requestAnimationFrame`**

## Entscheidung

**Gewählt: Option A.**

### Positive Konsequenzen

* `--dur: 2s` als CSS-Variable kann via `el.style.setProperty('--dur', '1.4s')`
  bei Leistungs-Änderung aktualisiert werden — kein DOM-Rebuild nötig (siehe
  Spec §5.7).
* Keine JS-Tick-Last — Browser-Compositor übernimmt die Animation.
* Einfache Reduced-Motion-Behandlung (Spec §5.8): `animation-duration: 0s` per
  `@media`-Query.

### Negative Konsequenzen

* Browser-Support: Safari erst ab 14 (16+ vollständig). *Mitigation:* HA-
  Min-Browser-Versions decken das ab (Spec §9, §7.4).
* `offset-path` mit komplexen `path()`-Werten muss korrekt escaped werden in
  CSS-Custom-Properties. *Mitigation:* nur quadratic Beziers, einfache Strings.

## Pros und Cons der Optionen

### Option A — CSS `offset-path`

* ✅ CSS-Variable-Updates ohne DOM-Rebuild
* ✅ Compositor-Animation, keine JS-Last
* ✅ Reduced Motion trivial
* ❌ Safari < 14 nicht unterstützt (akzeptabel)

### Option B — SVG `<animateMotion>`

* ✅ Sehr alter Browser-Support
* ✅ Pfad als XML-Referenz
* ❌ `dur`/`begin`/`keyTimes` sind XML-Attribute, *nicht* CSS-zugänglich →
  Parameter-Update erfordert DOM-Rebuild
* ❌ DOM-Rebuild bei jedem Sensor-Update → Flackern, hohe Layout-Last

### Option C — JS-`requestAnimationFrame`

* ✅ Maximale Kontrolle
* ❌ JS-Tick-Last bei vielen Pfaden × Punkten
* ❌ Eigener State-Manager nötig
* ❌ Reduced Motion muss manuell gehandhabt werden

## Verlinkte Spec-Sektionen / Referenzen

* Spec §5.5 (Flow-Animation), §5.7 (Update-Strategie)
* [MDN: `offset-path`](https://developer.mozilla.org/en-US/docs/Web/CSS/offset-path)
* [Can I Use: `offset-path`](https://caniuse.com/css-motion-paths)

## Notiz zur Vorgängerversion

Spec v1 hatte `<animateMotion>` vorgesehen mit der widersprüchlichen Annahme,
man könne `dur` per CSS-Variable steuern (was technisch nicht geht). Spec v2
hat das auf `offset-path` korrigiert; dieser ADR hält die Begründung fest.
