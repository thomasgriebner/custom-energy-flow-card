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

**Warum:** Self-Review wird oberflächlich, sobald der Hauptagent alle Brainstorming-Argumente kennt. Ein Sub-Agent mit frischen Augen findet Lücken, die der Hauptagent durch Sunk-Cost-Bias übersieht.

**Wann:** Verbindlich nach Phase A–H, BEVOR die Spec dem User vorgelegt wird.

**Wie:** `Agent`-Tool mit `subagent_type: general-purpose`. Prompt-Template unten 1:1 nutzen (Spec-Pfad einsetzen):

```
Du bist Spec-Reviewer ohne Vorab-Kontext. Lies die Spec unter
`/home/griebner/repos/custom-energy-flow-card/docs/specs/[FILENAME].md`
und prüfe sie unabhängig gegen das echte Repository.

**Aufgabe:** Arbeite die Checkliste unter
`/home/griebner/repos/custom-energy-flow-card/docs/templates/spec-review-checklist.md`
Phase A–H durch.

**Wichtig — Skepsis-Modus:**
- Du hast KEINEN Brainstorming-Kontext. Du kennst die Argumente NICHT,
  mit denen die Spec entstanden ist.
- Vertraue der Spec NICHT, prüfe gegen echten Code:
  - Jede Behauptung über `.eslintrc.cjs` → echte Datei lesen
  - Jede Behauptung über Source-File-Inhalte → echte Datei lesen
  - Jede Behauptung über Test-Konfig (`vitest.config.ts`) → echte Datei lesen
  - Jede Behauptung über bestehende Helper → `grep` durchführen
  - Jede Risk-Einschätzung "niedrig" → ist das verifiziert oder Annahme?
- Du darfst NICHT die anderen Spec-Iterationen (v1, v2, …) konsultieren —
  prüfe diese Spec stand-alone.

**Beweisführung-Pflicht (verbindlich — aus früheren Sub-Agent-Errors gelernt):**

1. **Quote-Pflicht:** Für jede Behauptung über existierenden Code MUSST du
   `Datei:Zeile`-Quote als Beweis mitliefern. Ohne konkrete Code-Zeile als
   Beweis: kategorisiere das Finding als `[VERIFY-NEEDED]`, nicht als
   `[AUTO-FIX]`. Beispiel: NICHT „Smoke-Test rendert nicht" sondern
   „`smoke-test.mjs:75-79` setzt `card.hass = {...}` + `await Promise` —
   das triggert Lit-Render. Spec-Behauptung X ist falsch."
2. **Cross-Reference-Verifikation:** Für jede Spec-Aussage „konsistent mit X"
   oder „analog zu Y": lies X/Y im echten Code, zitiere die echte Zeile,
   vergleiche wortwörtlich mit dem Spec-Wert. Falls divergent: Finding.
3. **Negative-Behauptungen-Beweis:** Für jede „rendert nicht" / „läuft nicht" /
   „wird nicht ausgeführt" / „bricht nichts"-Aussage: zeige die Code-Stelle,
   die das beweist. Negative-Behauptungen ohne Beweis sind fast immer falsch.
4. **Missing-Directory-Check:** Für jeden neuen Datei-Pfad in der Spec
   (`path/to/x.ts`): prüfe ob `path/to/` existiert (`ls path/to/`). Falls
   nicht: `[AUTO-FIX]` Finding mit Vorschlag „mkdir-Schritt explizit".
5. **Tool-Coverage-Awareness:** Bei neuen Files: erwähne welche Pipeline-
   Stufen (`typecheck`/`lint`/`test`/`smoke`) sie abdecken. Hinweis: `tsc`
   excludet typischerweise `**/*.test.ts`; ESLint läuft typischerweise nur
   auf `src/**/*.ts`.

**Format der Antwort (max 500 Worte):**

Jedes Finding MUSS explizit kategorisiert werden:

- **`[AUTO-FIX]`** — Klar, faktisch falsch oder Form-Lücke **mit Beweis-Quote** (`Datei:Zeile`). Beispiele: Tippfehler, fehlende Doku-Cross-Ref, Spec-Behauptung widerspricht echtem Code (mit Quote), Inkonsistenz zwischen zwei Spec-Sektionen, fehlendes `mkdir` im Plan (verifiziert via `ls`), ungenaues Snippet. Hauptagent darf das alleine fixen.
- **`[USER-DECISION]`** — Architektur-Wahl, UX-Trade-off, Scope-Frage, Strategie-Inkonsistenz mit ungewisser richtiger Antwort. Hauptagent darf das NICHT alleine entscheiden.
- **`[VERIFY-NEEDED]`** — Vermutung ohne Quote, könnte falsch sein. Hauptagent muss vor Auto-Fix selbst gegen echten Code prüfen (Trust-but-Verify). Falls verifiziert → wird zu `[AUTO-FIX]`. Falls widerlegt → Sub-Agent-Fehler, Finding verworfen.

Format:

## Phase A (Discovery)
- [AUTO-FIX] Finding 1 (mit konkretem Fix-Vorschlag)
- [USER-DECISION] Finding 2 (mit Optionen A/B)

## Phase B (Spec-Struktur)
- [AUTO-FIX / USER-DECISION] Finding X

(... pro Phase A–H ...)

## Top-3 Plan-Blocker
Falls vorhanden — Lücken, die der Planer NICHT umsetzen kann.

## Empfehlung
[ready for user / iterate (N auto-fixes offen) / blocker]
```

**Hauptagent-Verhalten (Iterations-Loop):**

1. Sub-Agent-Pass durchführen
2. Findings als Tasks anlegen (`TaskCreate`), Kategorie als `metadata` mitführen
3. Pro `AUTO-FIX`-Task: Trust-but-Verify gegen echten Code, dann Spec aktualisieren
4. Bei `USER-DECISION`-Tasks: sammeln, NICHT alleine fixen
5. Neue Spec-Version → erneuten Sub-Agent-Pass starten
6. Mindestens 3 Iterationen, höchstens 5
7. Stop wenn Sub-Agent „ready for user" meldet oder nur noch `USER-DECISION` offen

**Erst nach Iterations-Loop: User die Spec mit gesammelten `USER-DECISION`-Fragen zeigen.**

**Loop-Oszillations-Schutz:** Wenn Pass N+1 dasselbe Finding zurückbringt wie Pass N (gleicher Wortlaut oder gleicher File/Section), STOP und Fix prüfen. Sub-Agents können bei semantischen Verschiebungen verwirrt sein.
