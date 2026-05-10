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

* `animation-duration` ist eine CSS-Property (anders als SVG-`<animateMotion dur=…>`,
  ein XML-Attribut). Damit lassen sich Animations-Parameter überhaupt erst per
  CSS-Variable parametrisieren — Voraussetzung dafür, dass Lit die Werte
  effizient interpolieren oder ein optionaler Optimierungspfad
  (`el.style.setProperty(...)`) existieren kann.
* Keine JS-Tick-Last — Browser-Compositor übernimmt die Animation.
* Einfache Reduced-Motion-Behandlung (Spec §5.8): `animation-duration: 0s` per
  `@media`-Query.

### Was diese ADR NICHT garantiert

Diese ADR sagt **nicht**, dass v1.0 manuelles `el.style.setProperty(...)`
außerhalb von Lit verwenden muss. Der Standard-Implementations-Pfad bleibt
Lit's reactive Re-Render mit `style="..."`-Interpolation. Die direkte
setProperty-Optimierung ist eine optionale v1.x-Variante, falls Profiling
einen Hotspot bei sehr vielen Pfaden / hoher Update-Frequenz zeigt — siehe
Spec §5.7 für die Begründung der v1.0-Wahl.

### Negative Konsequenzen

* Browser-Support: Safari erst ab 14 (16+ vollständig). *Mitigation:* HA-
  Min-Browser-Versions decken das ab (Spec §9, §7.4).
* `offset-path` mit komplexen `path()`-Werten muss korrekt escaped werden in
  CSS-Custom-Properties. *Mitigation:* nur quadratic Beziers, einfache Strings.

## Pros und Cons der Optionen

### Option A — CSS `offset-path`

* ✅ Animations-Parameter (`animation-duration`, Pfad-Geometrie) via CSS-Variable steuerbar
* ✅ Compositor-Animation, keine JS-Last
* ✅ Reduced Motion trivial
* ✅ Setzt setProperty-Optimierung als Tür offen, ohne sie zu erzwingen
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
