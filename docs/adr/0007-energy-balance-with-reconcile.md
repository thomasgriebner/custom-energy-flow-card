# ADR-0007: Energie-Bilanz-Algorithmus mit Netz-Sensor-Reconcile

* **Status:** accepted
* **Datum:** 2026-05-10
* **Entscheider:** @griebner

## Kontext und Problem

Die Card visualisiert 14 mögliche Pfade (für 2-PV-/2-Akku-/3-Verbraucher-Setup;
generell N+M+K). Wir kennen pro PV/Akku/Verbraucher/Netz die Einzel-Leistung
aus dem Sensor, müssen aber pro Pfad die Leistung *berechnen* (Solar→Haus,
Solar→Akku, Akku→Haus, …). Sensoren haben Latenzen und Wechselrichter-Verluste,
die Bilanz schließt nie perfekt. Was tun bei Inkonsistenzen?

## Entscheidungs-Treiber

* Visualisierung muss qualitativ stimmen (Anwender erkennt „PV lädt Akku")
* Netz-Sensor ist messtechnisch zuverlässig (Strommesser am Hausanschluss)
* Algorithmus muss in der Engine ohne State berechenbar sein (ADR-0004)
* Edge-Cases dürfen nicht zu Crashes führen (Spec §5.10)

## Geprüfte Optionen

* **A — Bilanz + Reconcile** (Bilanz berechnet alle Pfade; Netz-Sensor als
  ground truth, abgeleitete Werte werden auf Sensor-Wert skaliert)
* **B — Strict-Accounting** (jede Energie-Einheit muss exakt zugeordnet sein;
  bei Inkonsistenz wirft Engine)
* **C — Verteilungs-frei** (Card zeigt Einzelwerte, keine Pfade)

## Entscheidung

**Gewählt: Option A.** Algorithmus in 8 Schritten (Spec §4.2–4.10):

1. Decomposition (charge/discharge, import/export)
2. Hausverbrauch via Bilanz (oder Override-Sensor)
3. Pairing PV→Akku (jede PV lädt nur ihre gepairte Battery)
4. Quellen → Haus mit Priorität: PV → Akku → Netz
5. Excess → Netzeinspeisung
6. Per-Quelle proportional aufteilen
7. Reconcile mit Netz-Sensor (4 Fälle, siehe Spec §4.8)
8. Haus → Verbraucher direkt aus Sensoren

### Positive Konsequenzen

* Anwender sieht qualitativ realistische Flüsse — auch wenn Sensoren leicht
  driften.
* Inkonsistenzen werden als `FlowResult.warnings` zurückgegeben, sichtbar als
  Diagnose-Icon (Spec §5.12).
* Kein Engine-Crash bei Sensor-Glitches.
* Pairing-Regel (ADR-0006) sorgt für deterministische Aufteilung im
  Mehr-Source-Fall.

### Negative Konsequenzen

* Visualisierte Pfad-Werte sind *Schätzungen* aus der Bilanz, keine direkten
  Messwerte. *Mitigation:* dokumentiert in der README + im Code.
* Edge-Cases im Reconcile (`untracked_export`, `phantom_export`) sind unvollkommen.
  *Mitigation:* explizit getestet (Spec §4.11 Tests 9–10).

### Update v2 (Risiko-Mitigation M7, 2026-05-10)

Der ursprüngliche v1-ADR sagte: „Pairing-Defizit wird *nicht* als Grid→Battery
visualisiert; bleibt im Netzbezug verborgen." Bei der Risiko-Analyse stellten
wir fest, dass dies User-Verwirrung verursacht (Netz-Sensor zeigt 1500 W Bezug,
sichtbarer Netz→Haus-Pfad nur 1000 W — wo gehen die anderen 500 W hin?).

**Geänderte Entscheidung:** `flows.gridToBattery[]` wird in v1.0 als
zusätzlicher Pfadtyp gerendert (siehe Spec §5.2). Engine erzeugt einen
Eintrag pro Battery mit `pairing_deficit > 0.5 W`. Der Pfad nutzt dieselbe
`grid_import`-Farbrolle wie Netz→Haus.

Topologie der gerenderten Edges in 2-PV/2-Akku/3-Verbraucher-Setup steigt von
14 auf **16** — die Layout-Tests prüfen das.

## Pros und Cons der Optionen

### Option A — Bilanz + Reconcile

* ✅ Realistische Visualisierung trotz Sensor-Drift
* ✅ Crash-resilient
* ✅ Pairing-Regel integriert
* ❌ Pfad-Werte sind Schätzungen
* ❌ Reconcile-Logik komplex (in Tests abgedeckt)

### Option B — Strict-Accounting

* ✅ Keine Schätzungen
* ❌ Wirft bei minimalen Sensor-Drifts → Card crasht ständig
* ❌ Reale Anlagen sind nie perfekt konsistent

### Option C — Verteilungs-frei

* ✅ Kein Algorithmus
* ❌ Kein Multi-Source-Fluss erkennbar — die Hauptanforderung der Card
* ❌ Anteils-Ring nicht möglich

## Verlinkte Spec-Sektionen / Referenzen

* Spec §4 (Algorithmus, alle Schritte), §4.11 (16 Edge-Case-Tests)
* [ADR-0004](./0004-pure-functions-engine.md) (Engine als pure functions)
* [ADR-0006](./0006-strict-1-to-1-pv-battery-pairing.md) (Pairing-Regel)
