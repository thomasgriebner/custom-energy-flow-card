# Spec Review Checklist

> **Wann nutzen:** Bevor ein Spec-Entwurf (v1) dem User vorgelegt wird. Jede Phase explizit abarbeiten — nicht „ich habe das überlegt", sondern jeden Punkt namentlich abhaken oder dokumentieren warum nicht zutreffend.
>
> **Erkenntnis aus Spec-Iterationen:** ~55 % aller Review-Findings entstanden, weil **erst geschrieben und dann recherchiert wurde**. Phase A (Repo-Discovery) ist deshalb verbindlich VOR dem Schreiben, nicht hinterher.
>
> **Bei jedem unchecked Item:** entweder fixen oder explizit dokumentieren („nicht zutreffend, weil …").

---

## Phase A — Repo-Discovery (VOR dem Schreiben)

- [ ] `.eslintrc.cjs` gelesen — Layer-Zonen direkt zitiert (nicht aus Gedächtnis)?
- [ ] `vitest.config.ts` gelesen — `environmentMatchGlobs`, `setupFiles`, `coverage.include`?
- [ ] `tsconfig.json` + `tsconfig.preview.json` gelesen — strict-flags, paths, includes?
- [ ] `package.json` gelesen — devDeps, scripts (smoke, preview, check)?
- [ ] `docs/conventions.md` gelesen — §11 Anti-Patterns, §12 Doku-Pflicht, §13 Dependencies?
- [ ] `docs/architecture.md` gelesen — Layer-Tabelle §2, ADR-Tabelle §4?
- [ ] `docs/adr/README.md` (ADR-Index) gelesen — welche ADRs sind relevant?
- [ ] Alle Source-Files gelesen, die in der Spec namentlich erwähnt werden?
- [ ] `grep -rn "X"` für jede zu ändernde Funktion/Klasse — Aufrufer und Importeure identifiziert?
- [ ] Andere Specs (`docs/specs/2026-05-12-*.md` als Goldstandard) als Struktur-Referenz angeschaut?

**Ausgabe vor User-Vorlage:** „Ich habe gelesen: [Liste]. `grep` für `[funktion]` zeigt N Aufrufer in `[files]`."

## Phase B — Spec-Struktur (Pflicht-Sektionen vorhanden?)

- [ ] §0.0 TL;DR-Verbots-Liste mit ❌, mindestens 5 konkrete Items?
- [ ] §0.1 Constraints-Tabelle mit Quelle + Konsequenz?
- [ ] §0.1 ESLint-Layer-Zonen aus echter `.eslintrc.cjs` zitiert?
- [ ] §0.2 Architektur-Kontext: berührte UND NICHT-berührte Layer?
- [ ] §0.3 Konzept-Modell / Datenfluss-Diagramm vorhanden?
- [ ] §0.4 Don't-Touch-Liste mit Element + Wo + Warum?
- [ ] §2.2 Non-Goals listet ≥ 5 explizite Files/Module/Tools?
- [ ] §3 Code-Snippets enthalten KEIN `...` / „ggf zu klären" / „im Plan klären"?
- [ ] §3.X Code-Reuse-Tabelle mit bestehenden Helpern?
- [ ] §3.X Layer-Boundary-Check-Tabelle?
- [ ] §7 Doku-Cross-References vollständig (Hauptspec + architecture.md §2 + §4 + ADR-Index + bestehende ADRs)?
- [ ] §10 Risiken nach Schwere sortiert (höchstes zuerst)?
- [ ] §11 LOC-Regression-Check (`wc -l … < vorher`)?
- [ ] §11 Unverändert-Check (`git diff` zeigt nichts an spezifizierten Files)?
- [ ] §12 Plan-Schritte mit Abhängigkeiten + Begründung pro Schritt?

## Phase C — UX-Perspektive

- [ ] Was sieht der User vorher vs. nachher? Konkret beschrieben?
- [ ] Bewusste visuelle Diffs (Farbe, Größe, Position) dokumentiert?
- [ ] UX-Implikationen pro Mode (falls Mode-spezifisch — z. B. `none` vs. `by_area`)?
- [ ] Editor-Field-Reihenfolge / -Sichtbarkeit-Änderung erwähnt?
- [ ] A11y-Verbesserungen / -Regressionen dokumentiert?
- [ ] Card-Mod / Theming / `::part()`-Hooks-Implikationen?
- [ ] Mobile / Schmaler-Container-Verhalten unverändert oder bewusst geändert?

## Phase D — Side-Effect-Suche (für jede geänderte Datei)

- [ ] `grep` für betroffene CSS-Selektoren in `card-styles.ts`?
- [ ] `grep` für betroffene Test-Files / Snapshot-Tests?
- [ ] `scripts/smoke-test.mjs` betroffen? Falls ja: Plan-Schritt einbauen.
- [ ] `examples/preview-mocks.ts` / Sandbox-Szenarien betroffen?
- [ ] `tsconfig.preview.json` deckt neue Files in `examples/` ab?
- [ ] HA-Custom-Elements (`ha-form`, `ha-icon`, `ha-entity-picker`) unverändert?
- [ ] `ha-globals.d.ts` Type-Declarations ausreichend für neue Verwendung?
- [ ] `card.ts` Lifecycle-Hooks unangetastet?
- [ ] `RenderContext`-Typ in `render/context.ts` unverändert?
- [ ] Engine pure (kein `hass`, kein DOM, kein State)?

### Phase D.1 — Missing-Directory-Pattern (Lehre aus Sub-Agent-Pässen)

Aus Sub-Agent-Pässen wiederholt aufgetreten: Spec sagt „neue Datei `path/to/x.ts`", verifiziert aber nicht ob `path/to/` existiert. Pflicht-Check:

- [ ] Für jeden neuen Datei-Pfad in §0.2-Tabelle und §3: Parent-Verzeichnis existiert im Repo? (`ls path/to/`)
- [ ] Falls Parent fehlt: `mkdir -p path/to` als expliziter Plan-Schritt vorgesehen?
- [ ] Falls Parent fehlt: §0.2-Tabelle hat eine `(Verzeichnis)`-Zeile mit `NEW dir`?

### Phase D.2 — Cross-Reference-Verifikation (Lehre aus Solar-pv1-Inkonsistenz)

Aus Sub-Agent-Pässen: Spec behauptete „konsistent mit `nodeName`", war faktisch falsch. Pflicht-Check:

- [ ] Für jede „konsistent mit X"-Behauptung: X aus echtem Code zitiert (Datei:Zeile)?
- [ ] Spec-Wert und echter X-Wert seite-an-seite verglichen?
- [ ] Falls Behauptung falsch: Spec-Wortlaut korrigiert ODER Code wird angepasst?

### Phase D.3 — Tool-Chain-Coverage-Gap

Aus Sub-Agent-Pass #3: `pnpm typecheck` deckt Test-Files nicht ab — Coverage-Gap muss erwartet sein.

- [ ] Pro neuer Datei: welche Pipeline-Stufen (`typecheck` / `lint` / `test` / `smoke`) decken sie ab?
- [ ] Coverage-Gaps explizit in Spec dokumentiert (nicht implizit übergehen)?
- [ ] Wenn Test-File: wird Type-Sicherheit zur Laufzeit via Vitest+esbuild garantiert oder gar nicht?

## Phase E — Conventions-Compliance (`docs/conventions.md`)

- [ ] **§1.2 Type-Safety:** Spec-Code hat kein `any` ohne Begründungs-Kommentar?
- [ ] **§1.2 as-Casts:** Boundary-Casts ohne Kommentar OK, Internal-Casts kommentiert?
- [ ] **§1.5 Function Design:** ≤ 3–4 Parameter, sonst Argument-Objekt?
- [ ] **§1.6 Funktionale Iteration:** `.map.filter.reduce` statt `forEach + push`?
- [ ] **§2 Comments-Policy:** Keine WHAT-Kommentare im finalen Code? Spec-Doku-Kommentare als solche markiert?
- [ ] **§3 Datei-Größen-Limits:** `card.ts` ≤ 200, `editor.ts` ≤ 400, `energy-engine.ts` ≤ 300, sonst ≤ 250?
- [ ] **§4 Imports:** Reihenfolge (external, internal, type-only)?
- [ ] **§5.3 Test-Stil:** Tabellen-getrieben mit `it.each`, aussagekräftige Test-Namen?
- [ ] **§5.4 TDD:** Tests test-first für Engine/Util/Config?
- [ ] **§7 Logging:** `console.error/warn/info` mit `[custom-energy-flow-card]`-Prefix?
- [ ] **§8 Commit-Messages:** Conventional Commits mit korrektem Scope?
- [ ] **§11 Anti-Patterns:** Alle 12 verbotenen Muster geprüft?
- [ ] **§12 Doku-Pflicht:** Bei neuem ADR alle drei Pflicht-Updates (File, Index, architecture.md §4)?
- [ ] **§13 Dependencies:** Neue DevDep mit Commit-Body-Begründung? Runtime-Dep mit ADR?
- [ ] **§15 Sprache:** Code-Identifier EN, User-Strings DE, Doku DE?

## Phase F — ADR-Abgleich (`docs/adr/`)

- [ ] **ADR-0002 Layered Architecture:** Layer-Boundaries respektiert?
- [ ] **ADR-0003 No Runtime Deps außer Lit:** Neue Deps nur DevDeps oder ADR-begründet?
- [ ] **ADR-0004 Pure Engine:** Engine-Module unangetastet?
- [ ] **ADR-0009 ESLint Layer Boundaries:** Keine neuen Zone-Verstöße?
- [ ] **ADR-0010 Shared Util Single-Source:** Helper nicht dupliziert?
- [ ] **ADR-0012 Smoke-Test:** Nach Änderung weiter grün?
- [ ] **ADR-0016 / 0017 / 0019 / etc.:** Falls Funktionalität dort beschrieben — Cross-Reference oder Update?
- [ ] **Neuer ADR nötig?** Bei Architektur-Wechsel, Strategie-Änderung, Tech-Stack-Erweiterung → ADR-0XXX-Stub in §8 vorhanden?

## Phase G — Code-Snippet-Hygiene

- [ ] Vollständige Diffs in Code-Blöcken, keine `...` / „...weiter wie bisher"?
- [ ] Bei Config-Edits explizit „additive Änderung, NICHT replace"?
- [ ] WHAT-Kommentare in Snippets als „Spec-Doku, im finalen Code entfernen" markiert?
- [ ] Konkrete Zeilennummern referenziert (`file.ts:42`) wo relevant?
- [ ] Bei Render-Code: namespace-Wechsel (SVG/HTML) berücksichtigt?
- [ ] Bei TypeScript-Code: `noUncheckedIndexedAccess` beachtet (`arr[0]` → `arr[0] ?? default`)?

## Phase H — Plan-Schritt-Sanity

- [ ] Plan-Schritte atomare Einheiten (1 Schritt = 1 Commit-fähig)?
- [ ] Nummerierung konsistent (überall ab 1, nicht 0 und 1 gemischt)?
- [ ] Abhängigkeiten zwischen Schritten explizit?
- [ ] Bei hohem Risiko: Spike als Schritt 1 mit Verifikations-Code?
- [ ] Pro Plan-Schritt: konkret welche Datei, was ändert sich?
- [ ] Doku-Updates als eigene Plan-Schritte (nicht „nebenher")?
- [ ] Verifikations-Schritte enthalten (`pnpm check`, `pnpm build:analyze`, Smoke-Test)?

---

## Self-Review-Output (Hauptagent)

Zwei Sätze als Zusammenfassung der Review-Pass-Ergebnisse, z. B.:

> Spec-Review durchgeführt. Phase A vollständig (gelesen: …). Phase B–H abgehakt mit Ausnahme von [X], weil [Begründung]. Bereit für Sub-Agent-Review.

---

## Phase I — Independent Sub-Agent-Cross-Check (vor User-Vorlage)

**Warum:** Self-Review wird oberflächlich, sobald der Hauptagent alle Brainstorming-Argumente kennt. Ein Sub-Agent mit frischen Augen findet Lücken, die der Hauptagent durch Sunk-Cost-Bias übersieht. **Aber:** identischer Skepsis-Prompt über mehrere Pässe → Sub-Agents leiden am gleichen Brillen-Bias wie der Hauptagent. Lehre aus 2026-05-15-Spec: Pass 1 fand 8 Findings, Pass 2 fand 1, Pass 3 fand 0 — mit derselben Brille. Ein anderer Fokus hätte vermutlich noch Lücken aufgedeckt.

**Lösung:** **Rotierende Fokus-Vektoren** statt identischer Skepsis-Prompt. Jeder Pass legt eine andere Brille an. Loop-Oszillations-Schutz bleibt aktiv, aber ähnliche Findings aus verschiedenen Brillen sind keine Oszillation — sie sind Bestätigung („zwei Linsen sehen dasselbe Problem" → echtes Problem).

**Wann:** Verbindlich nach Phase A–H, BEVOR die Spec dem User vorgelegt wird.

**Wie:** `Agent`-Tool mit `subagent_type: general-purpose`. Pro Pass den passenden Fokus-Vektor-Prompt unten 1:1 nutzen.

**Erwartete Pass-Anzahl:** 3–5 (kleine Spec: 3, mittlere: 4, große: 5). Stop wenn zwei aufeinanderfolgende Pässe keine neuen Findings bringen oder nur noch `USER-DECISION` offen ist.

### Pass-Reihenfolge (Fokus-Rotation)

| Pass | Fokus-Vektor                      | Was prüft dieser Pass                                                                                                                       |
| ---- | --------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------- |
| 1    | **Faktische Korrektheit**         | Stimmen Datei:Zeile-Referenzen? Stimmen Werte/Rechnungen? Skepsis-Modus mit Beweisführungs-Pflicht.                                         |
| 2    | **Auswirkungs-Suche**             | Was wurde übersehen? Andere Files/Sensoren/Edge-Cases mit Abhängigkeit zu den geänderten Werten? Side-Effects in Tests/Sandbox/Smoke?       |
| 3    | **Planer-Klarheit + Architektur** | Weiß der Planer welche Layer er anfasst? Welche Helper er wiederverwendet? Welche Code-Duplikation er vermeidet? Wie er Tests strukturiert? |
| 4    | **Conventions + ADR-Abgleich**    | Stimmt's mit `conventions.md` §1–§15? Mit allen relevanten ADRs? Neue ADRs nötig?                                                           |
| 5    | **Restrisiko + Konsolidierung**   | Was bleibt unklar? Was könnte den Planer in eine Sackgasse führen? Wo gibt es nach all den Fixes noch Inkonsistenzen zwischen Sektionen?    |

**Pflicht-Pässe je nach Spec-Größe:**

- Mini-Spec (< 200 Zeilen, 1–2 Files berührt): Pass 1 + Pass 5 (2 Pässe reichen).
- Kleine Spec (200–500 Zeilen, 2–4 Files): Pass 1 + Pass 3 + Pass 5 (3 Pässe).
- Mittlere Spec (500–900 Zeilen, 4–8 Files): Pass 1 + Pass 2 + Pass 4 + Pass 5 (4 Pässe).
- Große Spec (> 900 Zeilen, > 8 Files): Alle 5 Pässe.

### Gemeinsame Beweisführungs-Pflicht (für ALLE Pässe)

1. **Quote-Pflicht:** Für jede Behauptung über existierenden Code MUSST du `Datei:Zeile`-Quote als Beweis mitliefern. Ohne konkrete Code-Zeile: `[VERIFY-NEEDED]` statt `[AUTO-FIX]`.
2. **Cross-Reference-Verifikation:** Für „konsistent mit X" / „analog zu Y": echten Code zitieren, wortwörtlich vergleichen.
3. **Negative-Behauptungen-Beweis:** Für „rendert nicht" / „bricht nichts": Code-Stelle zeigen, die das beweist.
4. **Missing-Directory-Check:** Für jeden neuen Datei-Pfad: prüfe ob Parent-Dir existiert.
5. **Tool-Coverage-Awareness:** Bei neuen Files: welche Pipeline-Stufen (`typecheck`/`lint`/`test`/`smoke`) decken sie ab?

### Gemeinsame Finding-Kategorien (für ALLE Pässe)

- **`[AUTO-FIX]`** — Klar falsch oder Form-Lücke **mit Beweis-Quote**. Hauptagent darf alleine fixen.
- **`[USER-DECISION]`** — Architektur-Wahl, UX-Trade-off, Scope-Frage. Hauptagent darf NICHT alleine entscheiden.
- **`[VERIFY-NEEDED]`** — Vermutung ohne Quote. Hauptagent prüft vor Auto-Fix gegen echten Code.

### Pass-1-Prompt — Faktische Korrektheit (Skepsis-Modus)

```
Du bist Spec-Reviewer ohne Vorab-Kontext. Pass 1 von N: **faktische Korrektheit**.
Lies die Spec unter `[SPEC-PFAD]` und prüfe sie unabhängig gegen das echte Repository.

**Fokus dieses Passes:** Stimmen alle Datei:Zeile-Referenzen? Stimmen die Werte und Rechnungen?
Skepsis-Modus — vertraue der Spec NICHT, prüfe jede Behauptung gegen echten Code:
- Jede Behauptung über `.eslintrc.cjs`, `vitest.config.ts`, `tsconfig.json`, `package.json` → echte Datei lesen
- Jede Behauptung über Source-File-Inhalte → echte Datei lesen
- Jede Behauptung über bestehende Helper → `grep` durchführen
- Jede Risk-Einschätzung „niedrig" → verifiziert oder Annahme?

**Beweisführung:** [siehe gemeinsame Regeln in spec-review-checklist.md]
**Finding-Kategorien:** [siehe gemeinsame Regeln]

**Format (max 500 Worte):**

## Phase A (Discovery)
- [AUTO-FIX] Finding (Beweis-Quote)

## Phase B (Spec-Struktur)
...

(pro Phase A–H)

## Top-3 Plan-Blocker
## Empfehlung
[ready for next pass / iterate (N auto-fixes offen) / blocker]
```

### Pass-2-Prompt — Auswirkungs-Suche

```
Du bist Spec-Reviewer ohne Vorab-Kontext. Pass 2 von N: **Auswirkungs-Suche**.
Lies die Spec unter `[SPEC-PFAD]` und such systematisch nach **übersehenen Auswirkungen**.

**Fokus dieses Passes:** Was wurde übersehen? Die Spec beschreibt was geändert wird —
aber welche Files/Sensoren/Edge-Cases haben Abhängigkeiten zu den geänderten Werten,
die in der Spec NICHT erwähnt sind?

**Konkrete Suchstrategie:**
1. Für jede geänderte Konstante/Funktion in §3: `grep -rn "[KONSTANTE]" src/` —
   welche anderen Files lesen sie? Sind die in der Spec als „check" oder „edit" markiert?
2. Für jeden geänderten Test-Assert: gibt es ABGELEITETE Test-Werte (z.B. dasharray
   aus Radius berechnet), die mit-aktualisiert werden müssen?
3. Sandbox / Smoke-Test / Screenshots: sind sie betroffen? Plan-Schritte vorgesehen?
4. CSS-Selektoren (`grep "[selektor]" src/card-styles.ts`) — betroffen?
5. HA-Globals (`ha-icon`, `ha-form`, etc.) — Type-Declarations ausreichend?

**Beweisführung:** [gemeinsame Regeln]
**Finding-Kategorien:** [gemeinsame Regeln]

**Format (max 500 Worte):** wie Pass 1.

**Spezial-Hinweis:** Du suchst Lücken, NICHT Fehler in vorhandenen Aussagen.
Doppelte Findings zu Pass 1 sind erlaubt (Bestätigung), aber dein Hauptwert
liegt in den BISHER NICHT GENANNTEN Auswirkungen.
```

### Pass-3-Prompt — Planer-Klarheit + Architektur

```
Du bist Spec-Reviewer ohne Vorab-Kontext. Pass 3 von N: **Planer-Klarheit + Architektur**.
Lies die Spec unter `[SPEC-PFAD]` aus der Perspektive eines Implementierers, der die Spec
ZUERST liest und danach den Code schreiben muss.

**Fokus dieses Passes:**
1. **Layer-Klarheit:** Weiß der Planer welche Layer er anfasst und welche tabu sind?
   Sind Layer-Imports konkret aus `.eslintrc.cjs` zitiert oder nur vage erwähnt?
2. **Helper-Wiederverwendung:** Welche bestehenden Helper (in `util/`, `engine/`, `render/`)
   muss der Planer wiederverwenden? Ist die Code-Reuse-Tabelle vollständig?
3. **Code-Duplikation:** Wo droht Duplikation, weil ähnliche Logik schon existiert?
   `grep -rn "ähnliche Funktion"` — vorhandene Implementierungen identifizieren.
4. **Test-Struktur:** Sind Test-Schritte konkret genug (welcher Test-File, welcher Test-Case,
   welcher Assert), oder muss der Planer raten?
5. **Datentrennung:** Sind Daten-/Logik-/Render-Schichten sauber getrennt in den Plan-Aufgaben?
   Wird Engine-Pure gewahrt (ADR-0004)?
6. **TDD-Order:** Sind Tests-rot-vor-Implementation-grün konkret geplant (CLAUDE.md §9)?

**Beweisführung:** [gemeinsame Regeln]
**Finding-Kategorien:** [gemeinsame Regeln]

**Format (max 500 Worte):** wie Pass 1.

**Spezial-Hinweis:** Findings dieser Kategorie sind oft `[USER-DECISION]`, weil
Architektur-Wahl betroffen ist. Wenn ein bestehender Helper existiert, der die
gleiche Logik abdeckt: `[AUTO-FIX]` mit Verweis. Wenn die Spec den Planer in einen
Layer-Verstoß führen würde: `[USER-DECISION]` mit Optionen.
```

### Pass-4-Prompt — Conventions + ADR-Abgleich

```
Du bist Spec-Reviewer ohne Vorab-Kontext. Pass 4 von N: **Conventions + ADR-Abgleich**.
Lies die Spec unter `[SPEC-PFAD]` und prüfe sie systematisch gegen `docs/conventions.md`
(§1–§15) und alle relevanten ADRs in `docs/adr/`.

**Fokus dieses Passes:**

**Conventions (`docs/conventions.md`):**
- §1.2 Type-Safety: kein `any` ohne Begründungs-Kommentar?
- §1.5 Function Design: ≤ 3–4 Parameter sonst Argument-Objekt?
- §2 Comments-Policy: keine WHAT-Kommentare im finalen Code (Spec-Doku-Kommentare als solche markiert)?
- §3 Datei-Größen-Limits: `card.ts` ≤ 200, `editor.ts` ≤ 400, sonst ≤ 250?
- §5.3 Test-Stil: `it.each`, aussagekräftige Test-Namen?
- §5.4 TDD: Test-first für Engine/Util/Config?
- §11 Anti-Patterns: alle 12 verbotenen Muster geprüft?
- §12 Doku-Pflicht: bei neuem ADR alle drei Pflicht-Updates (File, Index, architecture.md §4)?
- §13 Dependencies: neue Runtime-Dep mit ADR? DevDep mit Commit-Body-Begründung?
- §15 Sprache: User-Strings DE in `i18n/de.ts`?

**ADR-Abgleich (`docs/adr/`):**
- ADR-0002 Layered Architecture: Layer-Boundaries respektiert?
- ADR-0003 No Runtime Deps außer Lit: keine neuen Runtime-Deps ohne ADR?
- ADR-0004 Pure Engine: Engine unangetastet?
- ADR-0009 ESLint Layer Boundaries: keine neuen Zone-Verstöße?
- ADR-0010 Shared Util Single-Source: Helper nicht dupliziert?
- ADR-0012 Smoke-Test: nach Änderung weiter grün?
- ADR-0017 / 0018 / 0019 / 0020: falls Funktionalität dort beschrieben — Cross-Reference oder Update?
- **Neuer ADR nötig?** Bei Architektur-Wechsel, Strategie-Änderung, Tech-Stack-Erweiterung → ADR-Stub in §8 vorhanden?

**Beweisführung:** [gemeinsame Regeln]
**Finding-Kategorien:** [gemeinsame Regeln]

**Format (max 500 Worte):** wie Pass 1.

**Spezial-Hinweis:** ADR-Drift ist häufig — wenn die Spec Werte ändert, die in
einem ADR fixiert sind, MUSS der ADR mit-aktualisiert werden (in §7 Doku-Pflicht).
Findings hier sind oft `[AUTO-FIX]` weil Doku-Update statt Architektur-Wahl.
```

### Pass-5-Prompt — Restrisiko + Konsolidierung

```
Du bist Spec-Reviewer ohne Vorab-Kontext. Pass 5 von N: **Restrisiko + Konsolidierung**.
Lies die Spec unter `[SPEC-PFAD]` und such nach verbleibenden Unklarheiten, Inkonsistenzen
zwischen Sektionen, und potenziellen Sackgassen für den Planer.

**Fokus dieses Passes:**
1. **Sektion-Querkonsistenz:** Sagt §3 etwas, das §6 (Tests) oder §11 (Erfolgs-Kriterien) widerspricht?
   Z.B.: §6.5 Coverage-Aussage vs §11 Coverage-Erfolgs-Kriterium.
2. **Restunklarheit:** Wo sagt die Spec „ggf." / „falls" / „evtl." / „prüfen ob" —
   ist das eine ECHTE Entscheidung des Planers oder hat die Spec hier nur die Antwort offen gelassen?
3. **Risiko-Honorierung:** §10 listet Risiken. Sind die Mitigations konkret genug oder vage
   („wird in Plan geprüft")? Gibt es Risiken, die NICHT erwähnt sind (z.B. HACS-Cache,
   Browser-Compatibility, Bundle-Budget-Schwellwert-Nähe)?
4. **Planer-Sackgasse:** Gibt es einen Plan-Schritt, der ohne weitere Discovery
   nicht ausführbar ist? Spec sollte alle blockierenden Informationen mitliefern.
5. **Iteration-History-Drift:** Diese Spec hat möglicherweise N Iterationen durchlaufen.
   Sind die Fixes konsistent — oder hat ein späterer Fix einen früheren teilweise revertet?

**Beweisführung:** [gemeinsame Regeln]
**Finding-Kategorien:** [gemeinsame Regeln]

**Format (max 500 Worte):** wie Pass 1, plus:

## Restrisiko-Top-3 (falls vorhanden)
Verbleibende Risiken aus Planer-Sicht, NICHT in §10 explizit.

## Konsolidierungs-Status
- Alle vorherigen Iterationen-Fixes konsistent? Ja / Nein (mit Beleg)
- Spec ist „freistehend lesbar"? (Planer kann sie lesen, ohne Brainstorming-Kontext nötig?)

**Spezial-Hinweis:** Wenn du in Pass 5 nur Findings aus Pass 1–4 wiederholst,
sage „keine neuen Findings, Spec stabil" — das ist ein gültiges Ergebnis.
Bei Pass 5 ist „ready for user" eine häufige und legitime Empfehlung.
```

### Hauptagent-Verhalten (Iterations-Loop)

1. **Vor Pass 1:** Self-Review (Phase A–H) durchführen, Findings dokumentieren.
2. **Pro Pass:**
   1. Sub-Agent mit Fokus-Vektor-Prompt dispatch.
   2. Findings als Tasks anlegen (`TaskCreate`), Kategorie als `metadata` mitführen, Pass-Nummer notieren.
   3. Pro `AUTO-FIX`-Task: **Trust-but-Verify** gegen echten Code (Sub-Agents irren auch!), dann Spec aktualisieren.
   4. Bei `USER-DECISION`-Tasks: sammeln, NICHT alleine fixen.
   5. Spec-Status hochzählen (`vN+1 (post-subagent-K-FOKUSNAME)`).
3. **Nach jedem Pass:** Entscheide ob nächster Pass nötig oder ob „ready for user".
4. **Stop-Kriterien:** Sub-Agent meldet „ready for user", oder zwei aufeinanderfolgende Pässe keine neuen Findings, oder nur noch `USER-DECISION` offen.

**Loop-Oszillations-Schutz:**

- Wenn Pass N+1 ein Finding aus Pass N WORTWÖRTLICH wiederholt: STOP und Fix prüfen.
- Wenn Pass N+1 ein Finding aus Pass N **aus anderer Brille** identifiziert (Pass 1: faktisch falsch, Pass 4: ADR-Bruch wegen demselben Wert): das ist KEINE Oszillation, sondern Bestätigung — Fix war richtig, aber Spec-Doku braucht Cross-Reference.

**Erst nach Iterations-Loop:** User die Spec mit gesammelten `USER-DECISION`-Fragen zeigen.
