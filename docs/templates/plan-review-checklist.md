# Plan Review Checklist

> **Wann nutzen:** Bevor ein Plan-Entwurf (v1) dem User vorgelegt wird. Analog zur Spec-Checkliste, aber Plan-spezifisch.
>
> **Erkenntnis aus v1.0-Plan-Iterationen** (7 Iterationen, 56+ Findings): Pläne scheitern an mehr Punkten als Specs. Hauptfehler-Cluster: Spec-Plan-Drift, Layer-Boundary-Edits unklar, Framework-Quirks übersehen, Build-Pipeline unscharf, TDD-Order vergessen.
>
> **Bei jedem unchecked Item:** entweder fixen oder explizit dokumentieren („nicht zutreffend, weil …").

---

## Phase A — Repo-Discovery + Spec-Reading (VOR dem Plan-Schreiben)

- [ ] **Spec gelesen, alle Sektionen erfasst** — Mapping-Tabelle vorbereitet (welche Spec-§ → welcher Plan-Task)
- [ ] Plan referenziert Spec mit **konkreten Sektion-Nummern** (Spec §X.Y, nicht „aus der Spec")
- [ ] `.eslintrc.cjs` gelesen — Layer-Zonen erfasst (Plan darf zones erweitern, aber explizit)
- [ ] `vitest.config.ts` gelesen — environmentMatchGlobs, setupFiles, coverage.include erfasst
- [ ] `tsconfig.json` + `tsconfig.preview.json` gelesen — strict-flags, includes
- [ ] `package.json` gelesen — Scripts (`smoke`, `preview`, `check`), DevDeps
- [ ] `docs/conventions.md` gelesen — §11 Anti-Patterns, §12 Doku-Pflicht, §13 Dependencies
- [ ] `docs/architecture.md` gelesen — Layer-Tabelle §2, ADR-Tabelle §4
- [ ] Goldstandard-Plan-Beispiel gelesen: `docs/plans/2026-05-12-aspect-ratio-redesign.md` (1 Iteration)
- [ ] Alle Source-Files gelesen, die in Plan-Tasks angefasst werden — Zeilennummern verifiziert
- [ ] `grep` für jede zu ändernde Funktion — Aufrufer identifiziert

**Ausgabe vor User-Vorlage:** „Spec-§ → Plan-Task Mapping vollständig: §0.X → Task Y, §3.X → Task Z, …"

## Phase B — Spec-Plan-Coverage (kritisch)

- [ ] Jede Spec §-Sektion hat einen Plan-Task — **explizites Mapping** in Self-Review-Sektion
- [ ] Spec §0.0 Verbots-Liste → Plan respektiert alle 14 Verbote, kein Task verstößt
- [ ] Spec §0.2 berührte Layer = Plan File Structure „Modified"
- [ ] Spec §0.2 NICHT-berührte Layer = Plan File Structure „NICHT anfassen"
- [ ] Spec §0.4 Don't-Touch-Liste = Plan Elements-NICHT-anfassen (1:1)
- [ ] Spec §3.X Code-Reuse-Tabelle = Plan-Tasks nutzen genannte Helper
- [ ] Spec §6 Tests = Plan-Tasks haben Test-First-Pflicht für engine/config/util
- [ ] Spec §7 Doku-Pflicht = Plan hat Doku-Tasks für alle Cross-References
- [ ] Spec §11 Erfolgs-Kriterien = Plan endet mit Verifikations-Tasks die diese Kriterien prüfen
- [ ] Spec §12 Plan-Schritte = Plan-Tasks haben ähnliche Granularität

## Phase C — Plan-Struktur (Pflicht-Sektionen)

- [ ] **Header-Block:** Goal, Architecture, Tech Stack, verbindliche Lese-Quellen
- [ ] **Konzepte-Block** mit Spec-Cross-References
- [ ] **Standing Requirement** (Disziplin-Block) prominent
- [ ] **Elements NICHT anfassen** (aus Spec §0.4)
- [ ] **File Structure:** Modified / Created / NICHT anfassen / Build-Pipeline-Files
- [ ] **Pro Phase: Commit-Vorlage** (Conventional Commit präpariert)
- [ ] **Pro Task: Files-Block** (Modify/Create/Delete)
- [ ] **Pro Task: nummerierte Steps mit Checkboxes**
- [ ] **STOP-Conditions** bei kritischen Tasks
- [ ] **Self-Review-Checkliste am Ende**
- [ ] **Out of Scope**
- [ ] **Notizen für den Implementierer**

## Phase D — Task-Granularität

- [ ] Tasks **atomar** = 1 Commit-fähig?
- [ ] Steps konkret (kein „anpassen", sondern „ersetze X durch Y mit alt/neu-Diff")?
- [ ] Verifikations-Commands pro Step (`pnpm test path/to/x.test.ts`)?
- [ ] Code-Snippets **vollständig** (keine `...`)?
- [ ] Zeilennummern referenziert wo relevant (`file.ts:42-50`)?

## Phase E — TDD-Compliance

- [ ] Für `engine/`, `config/`, `util/`: Tests vor Code (TDD-Rot-Phase explizit)?
- [ ] TDD-Hinweise inline ("MUSS rot sein", "Sanity-Check: wenn grün → STOP")?
- [ ] Tests werden ausgeführt VOR dem Code-Commit?
- [ ] Defensive Coverage-Tests (mit altem UND neuem Code grün) als solche markiert?

## Phase F — Conventions-Compliance (pro Task gegen `conventions.md`)

- [ ] **§1.2 Type-Safety:** kein `any` ohne Begründungs-Kommentar in Plan-Code-Snippets?
- [ ] **§1.2 as-Casts:** Boundary vs Internal korrekt unterschieden?
- [ ] **§1.5 Function Design:** ≤ 3–4 Parameter, sonst Argument-Objekt?
- [ ] **§1.6 Funktionale Iteration:** `.map/.filter/.reduce` statt `forEach + push`?
- [ ] **§2 Comments-Policy:** Keine WHAT-Kommentare in Plan-Code (Plan-Doku-Kommentare als „nicht im Code" markiert)?
- [ ] **§3 Datei-Größen-Limits:** Plan-Tasks behalten alle Limits ein (`card.ts ≤ 200`, etc.)?
- [ ] **§4 Imports:** Reihenfolge in Plan-Code-Snippets korrekt?
- [ ] **§5.3 Test-Stil:** Table-driven mit `it.each`?
- [ ] **§7 Logging:** `console.error/warn/info` mit `[custom-energy-flow-card]`-Prefix (außerhalb `src/` Sonderfall begründen)?
- [ ] **§8 Commit-Messages:** Conventional Commits, korrekter Scope?
- [ ] **§11 Anti-Patterns:** Alle 12 verbotenen Muster geprüft, keiner in Plan-Code?
- [ ] **§12 Doku-Pflicht:** Bei neuem ADR alle drei Pflicht-Updates (File, Index, architecture.md §4) als Plan-Tasks?
- [ ] **§13 Dependencies:** Neue DevDep mit Commit-Body-Begründung im Plan?
- [ ] **§15 Sprache:** Code-Identifier EN, User-Strings DE?

## Phase G — ADR-Compliance (pro relevantem ADR)

- [ ] Pro relevantem ADR aus Spec §0.1: wie wird er respektiert? (explizite Erwähnung in Plan-Task)
- [ ] ADR-0002 (Layered): Layer-Boundaries respektiert?
- [ ] ADR-0003 (No Runtime Deps): neue Deps nur DevDeps oder ADR-begründet?
- [ ] ADR-0004 (Pure Engine): kein Plan-Task ändert Engine?
- [ ] ADR-0009 (ESLint Layer Boundaries): falls Zone-Erweiterung — als eigener Plan-Task mit Begründung?
- [ ] ADR-0010 (Shared Util): keine Code-Duplikation in Plan-Tasks?
- [ ] ADR-0012 (Smoke-Test): Plan hat Smoke-Test-Verifikations-Task?
- [ ] Neue ADRs (z. B. ADR-0020) als eigener Plan-Task (vor Code-Tasks, oder bei Spike-Abhängigkeit nach Spike)?

## Phase H — Standing-Reminder pro Phase

- [ ] Standing-Requirement-Block (Conventions + ADRs + `pnpm check` grün) im Header?
- [ ] Pro Phase-Header: nochmal kurz an Conventions/ADRs erinnert (verhindert Drift bei langem Plan)?
- [ ] Code-Reuse-Tabelle wird in mehreren Tasks referenziert (nicht nur einmal am Anfang)?

## Phase I — Build-Pipeline-Details (oft übersehen)

- [ ] Build-Skripte: konkrete Datei + Zeile + Tool für jeden Edit?
- [ ] `tsconfig.json` / `tsconfig.preview.json`: include erweitern wenn neue Files außerhalb `src/`?
- [ ] `.eslintrc.cjs`: neue Rule additive (nicht replace), Position in `rules:`-Sektion klar?
- [ ] `vitest.config.ts`: `setupFiles`, `environmentMatchGlobs`, `coverage.include` korrekt erweitert (additive)?
- [ ] `scripts/smoke-test.mjs`: Stub-Registrierung wenn neue Custom Elements im Render-Pfad?
- [ ] `scripts/build-preview.mjs`: konkrete Code-Stelle für Edits (Zeile, Template-Variable)?
- [ ] `package.json`: neue DevDep mit Commit-Body-Begründung (conventions §13)?
- [ ] **Missing-Directory-Pattern** (analog Spec-Phase D.1): für jeden neuen Pfad → Parent-Dir existiert?

## Phase J — Framework-Quirks (Lit/TypeScript)

> **Lehre aus v1.0-Plan-Iterationen** — diese Quirks wurden erst in Iteration 2-3 entdeckt:

- [ ] **Lit `css`-Tag mit `unsafeCSS` für raw strings?** Lit's `css` rejecten String-Interpolation; `unsafeCSS(ANIMATION_CSS)` ist nötig
- [ ] **Lit `shouldUpdate` statt `@property hasChanged`?** `hasChanged` hat keinen `this`-Binding — `shouldUpdate(changedProperties)` ist die korrekte API
- [ ] **Lit `svg`-Template + `<foreignObject>`?** Namespace-Switch nicht automatisch — Custom Elements im foreignObject brauchen ggf. `unsafeSVG`-Workaround
- [ ] **`noUncheckedIndexedAccess` Edge-Cases?** `arr[0]` → `string | undefined`; explizit `?? default` oder Type-Guard
- [ ] **`customElements`-Guard in Node-Env?** Test-Setup das `customElements.define` aufruft braucht `typeof customElements === 'undefined'`-Guard
- [ ] **Lit-Lifecycle Side-Effects nur in `willUpdate`?** Nie in `render` (conventions §11.5)
- [ ] **HA-Custom-Elements (ha-form, ha-icon, ha-entity-picker) NICHT importieren** — nur Type-Declaration in `ha-globals.d.ts`
- [ ] **TypeScript-strict `experimentalDecorators: true`** für Lit-Decorators?

## Phase K — Cross-Reference-Verifikation

> **Lehre aus Spec-Sub-Agent-Pässen** — „konsistent mit X"-Behauptungen oft falsch:

- [ ] Jede „konsistent mit X"-Aussage im Plan: X aus echtem Code zitiert (`Datei:Zeile`)?
- [ ] Plan-Wert und echter X-Wert seite-an-seite verglichen?
- [ ] Falls Plan-Wert vom Code abweicht: Plan-Code wird auf Spec-Vorgabe geändert (nicht umgekehrt)?

## Phase L — Verifikations-Pipeline (Plan-spezifisch)

- [ ] Pro Phase: `pnpm check` grün-Pflicht vor Commit
- [ ] Final-Phase: `pnpm build` ≤ Bundle-Budget verifiziert
- [ ] Final-Phase: `pnpm build:analyze` zeigt keine verbotenen Deps
- [ ] Final-Phase: `pnpm smoke` grün
- [ ] LOC-Regression-Check: `wc -l src/[file]` < vorher (bei Auslagerung)
- [ ] Unverändert-Check: `git diff` zeigt keine Änderungen an Spec §0.0 verbotenen Files

---

## Self-Review-Output (Hauptagent)

Zwei Sätze, z. B.:

> Plan-Review durchgeführt. Phase A vollständig (Spec-Plan-Mapping: §0 → Tasks 0.1+0.2, §3.1 → Task 1.3, …). Phase B–L abgehakt mit Ausnahme von [X], weil [Begründung]. Bereit für Sub-Agent-Review.

---

## Phase Z — Iterative Sub-Agent-Reviews mit Auto-Fix-Loop (verbindlich, mind. 3 Iterationen)

**Analog zur Spec-Phase I** — Sub-Agent ohne Plan-Kontext prüft gegen echte Repo-Files. Loop bis stabil oder Max-Iterationen.

### Sub-Agent-Prompt-Template für Plan-Review

```
Du bist Plan-Reviewer ohne Vorab-Kontext. Lies den Plan unter
`/home/griebner/repos/custom-energy-flow-card/docs/plans/[FILENAME].md`
und prüfe ihn unabhängig gegen die zugehörige Spec und das echte
Repository.

**Verbindliche Lese-Quellen:**
- Plan-File (Pfad oben)
- Zugehörige Spec (im Plan-Header verlinkt)
- `docs/conventions.md`
- `docs/architecture.md`
- `.eslintrc.cjs`, `vitest.config.ts`, `tsconfig.json`, `package.json`
- Alle Source-Files, die der Plan namentlich erwähnt
- Relevante ADRs

**Aufgabe:** Arbeite die Checkliste unter
`/home/griebner/repos/custom-energy-flow-card/docs/templates/plan-review-checklist.md`
Phase A–L durch.

**Wichtig — Skepsis-Modus:**
- Du hast KEINEN Kontext zum Plan-Brainstorming oder zur Spec-Iteration.
- Vertraue dem Plan NICHT, prüfe gegen echten Code:
  - Jede Behauptung über Spec-Inhalt → echte Spec-Datei lesen, Sektion zitieren
  - Jede Behauptung über `.eslintrc.cjs` Layer-Zonen → echte Datei lesen
  - Jede Behauptung über Source-File-Zeilen → echte Datei lesen, Zeile verifizieren
  - Jede Behauptung über Test-Konfig → echte Datei lesen
  - Jede Behauptung über bestehende Helper → `grep` durchführen

**Beweisführung-Pflicht (verbindlich):**

1. **Quote-Pflicht:** Für jede Behauptung über existierenden Code MUSST du
   `Datei:Zeile`-Quote als Beweis mitliefern.
2. **Spec-Plan-Coverage:** Erstelle ein Mapping „Spec §X.Y → Plan Task A.B".
   Gibt es Spec-Sektionen ohne Plan-Task? Plan-Tasks ohne Spec-Anker?
3. **Cross-Reference-Verifikation:** Für jede „konsistent mit X"-Behauptung
   im Plan: lies X, vergleiche.
4. **Framework-Quirks-Check** (siehe Phase J): Lit-css-Tag, hasChanged-this,
   foreignObject-namespace, customElements-Guard, noUncheckedIndexedAccess
5. **Missing-Directory-Check:** Für jeden neuen Datei-Pfad: Parent-Dir
   existiert?
6. **TDD-Order:** Für engine/config/util-Tasks: Tests vor Code?

**Findings-Kategorisierung:**

- **`[AUTO-FIX]`** — Klar, faktisch falsch oder Form-Lücke MIT Beweis-Quote.
  Hauptagent darf alleine fixen.
- **`[USER-DECISION]`** — Architektur-/Scope-Frage mit ungewisser Antwort.
- **`[VERIFY-NEEDED]`** — Vermutung ohne Quote. Hauptagent muss
  Trust-but-Verify gegen echten Code laufen lassen, bevor er fixt.

**Format der Antwort (max 700 Worte):**

## Phase A (Discovery + Spec-Reading)
- [...] Finding

## Phase B (Spec-Plan-Coverage) — KRITISCH
- Mapping-Tabelle (Spec § → Plan-Task)
- Gaps?

## Phase C (Plan-Struktur)
(...)

## Phase D-L
(...)

## Top-3 Plan-Blocker
Falls vorhanden — Lücken, die der Implementierer NICHT umsetzen kann.

## Empfehlung
[ready for user — stabil / iterate (N auto-fixes offen) / blocker]

**Loop-Oszillations-Check:** Wenn Pass N+1 ein Finding zurückbringt, das
Pass N als „fixed" gemeldet hatte, markiere als `[OSCILLATION]`.
```

### Iterations-Loop

1. **Sub-Agent-Pass N:** mit obigem Prompt
2. **Findings als Tasks anlegen** (`TaskCreate`), `[AUTO-FIX]` und `[USER-DECISION]` getrennt
3. **Trust-but-Verify** pro `AUTO-FIX`: gegen echten Code prüfen, dann fixen
4. **`USER-DECISION`-Tasks:** sammeln, NICHT alleine fixen
5. **Neue Plan-Version** → erneuten Sub-Agent-Pass
6. **Mindestens 3 Iterationen, höchstens 5**
7. **Stop wenn** Sub-Agent „ready for user" meldet oder nur noch `USER-DECISION` offen

**User-Vorlage:** Nur die `USER-DECISION`-Findings präsentieren.

---

## Iterations-Statistik (aus Erfahrung)

| Plan-Komplexität                  | Erwartete Sub-Agent-Pässe | Erwartete Auto-Fixes |
| --------------------------------- | ------------------------- | -------------------- |
| Klein (Spec-Subset, 3-5 Tasks)    | 2–3                       | 1–5                  |
| Mittel (5–10 Phasen, 15-25 Tasks) | 3–4                       | 5–15                 |
| Groß (v1.0-artig, 29+ Tasks)      | 4–5                       | 10–30                |

Bei > 5 Sub-Agent-Pässen oder > 30 Auto-Fixes: Plan vermutlich noch nicht spec-aligned — STOP, Spec re-reviewen.
