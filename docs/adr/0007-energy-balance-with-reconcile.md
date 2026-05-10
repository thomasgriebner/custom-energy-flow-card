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
* Reconcile kann Sensor-Inkonsistenzen verschleiern (z. B. Pairing-Defizit
  wird in `pairingDeficit[]` gemerkt, aber nicht visuell als „Grid → Battery"
  gezeigt). *Mitigation:* Diagnose-UX (Spec §5.12), v1.x kann den Pfad ergänzen.
* Edge-Cases im Reconcile (`untracked_export`, `phantom_export`) sind unvollkommen.
  *Mitigation:* explizit getestet (Spec §4.11 Tests 9–10).

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
