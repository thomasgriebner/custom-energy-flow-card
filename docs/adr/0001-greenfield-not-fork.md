# ADR-0001: Greenfield neu bauen statt power-flow-card-plus forken

* **Status:** accepted
* **Datum:** 2026-05-10
* **Entscheider:** @griebner

## Kontext und Problem

Der Anwender nutzt aktuell `power-flow-card-plus`, stößt aber an dessen
Limitierung: nur eine PV-Anlage und ein Akku werden unterstützt. Sein System
(Balkonkraftwerk + Speicher und Dachanlage + Speicher) braucht Multi-Source-
Visualisierung. Die Frage: vorhandene Card erweitern oder neu bauen?

## Entscheidungs-Treiber

* Multi-Source (N PVs, N Akkus, N Verbraucher) sauber abbilden
* Wartbarkeit auf längere Sicht
* Saubere Architektur ohne Altlasten
* Realistischer Aufwand zur ersten lauffähigen Version

## Geprüfte Optionen

* **A — Neu bauen, an `power-flow-card-plus` orientiert**
* **B — `power-flow-card-plus` forken und erweitern**
* **C — Auf einem anderen Projekt (z. B. `power-distribution-card`) aufbauen**

## Entscheidung

**Gewählt: Option A.** Wir bauen eine neue Card von Grund auf, mit der
`power-flow-card-plus`-Architektur als Referenz und Inspiration für HA-Idiome —
aber ohne deren Code-Basis zu erben.

### Positive Konsequenzen

* Multi-Source-Topologie kann von Anfang an als First-Class-Konzept
  modelliert werden (siehe ADR-0006: 1:1-Pairing).
* Saubere Layer-Architektur (siehe ADR-0002) statt nachträgliches Refactoring
  einer Single-Source-Codebase.
* Aktueller Tech-Stack (Lit 3, TypeScript-strict, Vitest) ohne Migrationspfade.
* Wir können `power-flow-card-plus` als Referenz für HA-Konventionen weiter nutzen.

### Negative Konsequenzen

* Höherer initialer Implementierungsaufwand. *Mitigation:* der Spec ist
  vollständig und der Plan in Phasen strukturiert.
* Edge-Cases, die `power-flow-card-plus` mühsam erlernt hat, müssen wir selbst
  finden. *Mitigation:* extensive Engine-Test-Tabelle (Spec §4.11).
* Keine HACS-Reputation aus bestehendem Repo. *Mitigation:* nicht-Ziel für v1.0.

## Pros und Cons der Optionen

### Option A — Neu bauen

* ✅ Multi-Source als First-Class
* ✅ Saubere Architektur
* ✅ Aktueller Tech-Stack
* ❌ Mehr Initialarbeit

### Option B — Forken

* ✅ Schnellerer Start
* ✅ Vorhandene Edge-Case-Behandlung
* ❌ Single-Source-Annahmen tief eingebettet
* ❌ Erweiterung wird messy
* ❌ Upstream-Updates schwierig nachzuziehen

### Option C — Anderes Projekt

* ❌ Keine etablierte Multi-Source-Card mit unserer Topologie identifiziert
* ❌ Mehr Recherche-Aufwand mit unklarem Gewinn

## Verlinkte Spec-Sektionen / Referenzen

* Spec §1.1, §1.2 (Motivation)
* [`power-flow-card-plus`](https://github.com/flixlix/power-flow-card-plus) als Referenz
