# ADR-0006: Strikte 1:1-Pairing-Regel zwischen PV und Akku

* **Status:** accepted
* **Datum:** 2026-05-10
* **Entscheider:** @griebner

## Kontext und Problem

Das Zielsystem hat zwei PV-Anlagen (Dach + Balkon), jede mit eigenem Akku.
Eine PV lädt physisch nur „ihren" Akku — Energie der Dachanlage geht *nicht*
in den Balkon-Akku, weil sie über getrennte Hybrid-Wechselrichter laufen.
Das muss in der Datenmodellierung und im Algorithmus abgebildet werden.

Frage: ist das Pairing strikt 1:1, oder erlauben wir flexiblere
Konstellationen (1 PV → mehrere Akkus, mehrere PVs → 1 Akku, gar keine
Pairing-Regel)?

## Entscheidungs-Treiber

* Spiegelt die physische Realität (DC-/AC-gekoppelte Hybrid-Inverter)
* Engine-Algorithmus muss entscheidbar sein („wer lädt wen?")
* Validierung im Editor muss scharf prüfen
* Vermeidung über-flexibler Konfigurationen, die in der Praxis selten sind

## Geprüfte Optionen

* **A — Strikt 1:1** (jeder Akku referenziert eine PV via `charged_by`; jede
  PV höchstens einer Battery zugeordnet)
* **B — N:M flexibel** (Pairing als Liste; Akku akzeptiert mehrere Quellen)
* **C — Keine Pairing-Regel** (alle PVs laden alle Akkus proportional)

## Entscheidung

**Gewählt: Option A.**

* Jede `BatteryConfig.charged_by` muss auf eine existierende `SolarConfig.id` zeigen.
* Eine PV darf höchstens einer Battery gepairt sein (Validierung via Schema).
* Eine PV ohne gepairten Akku ist erlaubt (PV ohne Speicher).
* Ein Akku ohne `charged_by` ist nicht erlaubt.

### Positive Konsequenzen

* Algorithmus simpel und deterministisch (Spec §4.4): ein Akku ↔ eine PV.
* Editor kann mit einem einfachen Dropdown validieren.
* Spiegelt die häufigste reale Anlagentopologie (Hybrid-Inverter).
* Visuelles Layout kann den gepairten Akku x-achsen-aligned unter seine PV setzen
  (Spec §5.1 — visuelle Pairing-Ankerung).

### Negative Konsequenzen

* AC-gekoppelte Multi-Inverter-Setups, in denen ein Akku theoretisch von zwei
  PVs geladen werden kann, sind nicht abbildbar. *Mitigation:* in der Praxis
  selten (HEMS regelt das meist auf Hardware-Ebene); v2-Kandidat falls Bedarf.
* Akku ohne PV (z. B. Netz-geladener Notstrom-Akku) ist *nicht* konfigurierbar.
  *Mitigation:* aktuell kein Anwender-Bedarf; v1.x-Kandidat.

## Pros und Cons der Optionen

### Option A — Strikt 1:1

* ✅ Deterministischer Algorithmus
* ✅ Einfache Editor-Validierung
* ✅ Realistische Topologie
* ✅ Visuelle Pairing-Ankerung möglich
* ❌ AC-Coupling-Edge-Cases nicht abbildbar

### Option B — N:M flexibel

* ✅ Maximale Modellierung
* ❌ Algorithmus muss Aufteilungsregel definieren — komplex
* ❌ Editor muss Listen-in-Listen darstellen
* ❌ Validierung wird schwammig

### Option C — Keine Pairing-Regel

* ✅ Keine Validierung nötig
* ❌ Verletzt physische Realität (Dach lädt nicht Balkon-Akku)
* ❌ Anwender erwartet Pairing-Anzeige
* ❌ Algorithmus muss willkürlich aufteilen

## Verlinkte Spec-Sektionen / Referenzen

* Spec §3.2 (Pairing-Kardinalität), §4.4 (Algorithmus PV→Akku)
