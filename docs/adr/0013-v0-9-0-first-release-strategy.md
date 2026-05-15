# ADR-0013: Erstes Produktiv-Release als v0.9.0, v1.0.0 nach Stabilisierung

- **Status:** accepted
- **Datum:** 2026-05-10
- **Entscheider:** @griebner

## Kontext und Problem

Da kein HA-Test-Environment beim Anwender existiert, kann die Card erstmals
nur im produktiven HA validiert werden. Trotz extensiver Vorab-Verifikation
(Spec-Reviews, Engine-Tests, Sandbox, Smoke-Test, Reference-Comparison)
bleibt ein Restrisiko an HA-Form-/Theme-/Animation-Quirks, die erst live
auftauchen.

Welche Version trägt der erste Live-Build?

- **v1.0.0 ab Tag 1** signalisiert „battle-tested, stabil" — was nicht stimmt.
  Anwender und HACS-User würden unrealistisch hohe Erwartungen haben.
- **v0.x.x** signalisiert „in Entwicklung" — passt zur Realität, gibt Raum
  für Bug-Fix-Iterationen ohne Versprechensbruch.

## Entscheidungs-Treiber

- Realistische Anwender-Erwartungen
- Semver-Konventionen einhalten
- Bug-Fix-Releases dürfen nicht als Major-Bump erscheinen
- Klares „v1.0 = stabil"-Signal für später (auch für HACS-Reputation)

## Geprüfte Optionen

- **A — v0.9.0 als erste Live-Version, v1.0.0 nach 1–2 Wochen stabilem Betrieb**
- **B — v1.0.0 ab Tag 1**
- **C — v0.1.0, v0.2.0, … als rolling preview ohne fixes 1.0-Datum**

## Entscheidung

**Gewählt: Option A.**

- Erstes GitHub-Release: **v0.9.0**
- Bug-Fixes: v0.9.1, v0.9.2, …
- Promote auf **v1.0.0**, sobald folgende Kriterien erfüllt sind:
  1. Mindestens 2 Wochen ohne neuen Bug-Report
  2. Mindestens 5 echte Anwender-Stichproben über 3 Tage (Spec §10.1)
  3. Engine-Warning-Frequenz im Normalbetrieb < 1× pro Stunde
  4. Bundle-Größe stabil ≤ `BUNDLE_BUDGET_BYTES` (`scripts/kpi.mjs:29` — zur ADR-Zeit 60 kB, seit ADR-0022 64 KiB)

### Positive Konsequenzen

- Anwender weiß: erste Live-Validierung, Bugs sind erwartet.
- Bug-Fix-Releases (Patch-Bump) bleiben in semver-Konformität.
- HACS-User-Reviews verzeichnen v0.9 als „first release", nicht „1.0 broken".
- Klarer Meilenstein „v1.0" als Stabilisierungs-Signal später.

### Negative Konsequenzen

- Zwei-Phasen-Release-Prozess (v0.9 → v1.0) ist nicht standard für jeden
  HACS-Custom-Card-Workflow. _Mitigation:_ README dokumentiert das Modell
  beim ersten Release explizit.
- Anwender muss nach Promote eine Update von v0.9.x auf v1.0.0 durchführen.
  Bei HACS automatisch — kein Bruch.

## Pros und Cons der Optionen

### Option A — v0.9.0 first

- ✅ Realistische Erwartungen
- ✅ Semver-konforme Patch-Releases
- ✅ Klarer „v1.0 = stabil"-Meilenstein
- ❌ Zwei-Phasen-Release nötig

### Option B — v1.0.0 sofort

- ✅ Einfach
- ❌ Falsches Stabilitäts-Versprechen
- ❌ Bug-Fix-Releases vor 1.1 brauchen Patch-Bumps, die wie unsanft wirken
- ❌ Ein einziger schwerer Bug verbrennt das „v1.0"-Label

### Option C — v0.x.x indefinit

- ✅ Maximale Flexibilität
- ❌ Kein Stabilitäts-Signal nach echtem Stabilisieren
- ❌ Anwender weiß nicht, wann „die richtige" Version da ist

## Verlinkte Spec-Sektionen / Referenzen

- Spec §10.1 (funktionale Akzeptanz-Kriterien)
- Plan Task 1.5 (`const.ts CARD_VERSION = '0.9.0'`)
- Plan Task 0.1 (`package.json version: '0.9.0'`)
- Plan Task 5.3 (Tag `v0.9.0`)
