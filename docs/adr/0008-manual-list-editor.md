# ADR-0008: Editor-Listen manuell mit Lit (statt ha-form-Listen)

* **Status:** accepted
* **Datum:** 2026-05-10
* **Entscheider:** @griebner

## Kontext und Problem

Der Lovelace-GUI-Editor muss Solar-Anlagen, Akkus und Verbraucher als
**Listen** mit „+ Hinzufügen", „Entfernen" und Drag-/Move-up-down erlauben.
HAs `<ha-form>` ist Standard für Card-Editoren — bietet aber **keine
zuverlässige Listen-UI** (kein eingebautes Add-Button-Pattern, keine
Reorder-UI). Wie lösen wir das?

## Entscheidungs-Treiber

* Funktionale Listen-Bearbeitung (mind. add/remove/edit)
* Reihenfolge der Items soll vom Nutzer steuerbar sein (für Layout-Reihenfolge)
* Editor-Code-Aufwand soll vertretbar bleiben
* Pairing-Dropdown-Optionen müssen dynamisch aus dem Solar-Array kommen

## Geprüfte Optionen

* **A — Manuelle Listen-UI mit Lit, ha-form pro Eintrag**
* **B — Nur ha-form-Schema** mit verschachtelten Selectoren (`{type: 'expandable'}` etc.)
* **C — Drittanbieter-Editor** (z. B. Embedded form-builder lib)

## Entscheidung

**Gewählt: Option A.** Listen werden manuell mit Lit gerendert (Add-Button,
Remove-Button, Move-up/down-Buttons, Drag&Drop optional). Pro Listen-Eintrag
wird intern ein `<ha-form>` mit einem Schema für die *primitiven Felder*
genutzt (text, entity-picker, icon-picker, number).

### Positive Konsequenzen

* Volle UI-Kontrolle über Listen-Operationen.
* Pairing-Dropdown kann dynamisch aus dem aktuellen Solar-Array gerendert werden.
* Validierungs-Inline-Hinweise pro Eintrag möglich.
* `ha-form` wird trotzdem für die häufige Felder-Logik genutzt (Entity-Picker,
  Icon-Picker, Selectoren) — kein Re-Implementieren von HA-Standard-UI.

### Negative Konsequenzen

* Editor wird größer (~400 LOC statt vielleicht ~150). *Mitigation:* Spec §2.2
  budgetiert das.
* Custom UI-States (Move-up disabled bei Index 0 etc.) müssen manuell gepflegt
  werden. *Mitigation:* unvermeidbar bei Listen-Editing.
* Drag-and-drop ist optional und wird in v1.0 ggf. weggelassen
  (Up/Down-Buttons reichen). *Mitigation:* dokumentiert.

## Pros und Cons der Optionen

### Option A — Manuelle Listen-UI

* ✅ Volle UI-Kontrolle
* ✅ Dynamische Pairing-Optionen
* ✅ HA-Form für primitiven-Felder weiter genutzt
* ❌ Mehr Editor-Code

### Option B — Nur ha-form-Schema

* ✅ Sehr wenig Code
* ❌ HA-Form unterstützt keine zuverlässige Listen-Bearbeitung
* ❌ Pairing-Dropdown mit dynamischen Options nicht trivial
* ❌ User kann keine Items neu sortieren

### Option C — Drittanbieter-Editor

* ❌ Bundle-Größe sprengt das 60-kB-Budget
* ❌ Zusätzliche Dependency außer Lit (verstößt gegen Spec §2.1)
* ❌ Inkonsistent mit HA-Look-and-Feel

## Verlinkte Spec-Sektionen / Referenzen

* Spec §3.3, §6.4 (Editor-UX)
* [HA-Form-Doku](https://github.com/home-assistant/frontend/blob/dev/src/components/ha-form/ha-form.ts) (intern)
