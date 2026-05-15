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
- [ ] **Alle Plan-referenzierten Test-Files via `find src/ -name '*.test.ts'` verifizieren** (Lesson 2026-05-15: Plan kann auf `*.test.ts` verweisen, die nicht existieren — z. B. `home-ring.test.ts`. Sanity-Check via `pnpm test <pfad>` schlägt dann fehl, Implementation muss umroutet werden)

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

## Phase Z — Iterative Sub-Agent-Reviews mit rotierenden Fokus-Vektoren

**Warum rotierende Fokus-Vektoren statt identischem Skepsis-Prompt:** Sub-Agents leiden am gleichen Brillen-Bias wie der Hauptagent. Identische Prompts über mehrere Pässe → diminishing returns. Verschiedene Brillen pro Pass → jeder Pass findet andere Lücken. Loop-Oszillations-Schutz bleibt aktiv: aber ähnliche Findings aus verschiedenen Brillen sind keine Oszillation — sie sind Bestätigung.

**Wann:** Verbindlich nach Phase A–L (Self-Review), BEVOR der Plan dem User vorgelegt wird.

**Wie:** `Agent`-Tool mit `subagent_type: general-purpose`. Pro Pass den passenden Fokus-Vektor-Prompt unten 1:1 nutzen.

**Erwartete Pass-Anzahl:** 3–5 (kleine Pläne: 3, mittlere: 4, große: 5). Stop wenn zwei aufeinanderfolgende Pässe keine neuen Findings bringen oder nur noch `USER-DECISION` offen ist.

### Pass-Reihenfolge (Fokus-Rotation für Pläne)

| Pass | Fokus-Vektor                                           | Was prüft dieser Pass                                                                                                                                                                                                                         |
| ---- | ------------------------------------------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1    | **Spec-Plan-Coverage**                                 | Ist alles aus der Spec im Plan? Sind die Details korrekt übernommen? Mapping-Tabelle Spec § → Plan-Task; Gaps?                                                                                                                                |
| 2    | **Plan-Interne Konsistenz + Architektur (+ADRs/Conv)** | Widersprüche im Plan? Architektur-Vorgaben (ADR-0002/0004/0009/0010), Datentrennung, Logik-Schicht, Code-Reuse, Test-Coverage, conventions §1–§11. **Verifikation auch wenn Spec schon gecheckt hat — Plan kann eigene Verstöße einbringen.** |
| 3    | **UX + Design-Bruch (+UX-ADRs/Conv §15)**              | UX-Vorgaben aus Spec §9 in Tasks abgebildet? Sprache-Regeln (User-Strings DE, conv §15)? A11y-Patterns nicht gebrochen? Theming/`::part()`-Hooks aus relevanten ADRs respektiert? Mode-Verhalten (none vs by_area)?                           |
| 4    | **Task-Granularität + Agent-Freiraum**                 | 1 Task = 1 Commit? Jedes Detail klar? Agent-Freiraum explizit markiert (was darf der Agent selbst entscheiden, was nicht)? STOP-Conditions klar?                                                                                              |
| 5    | **Pro-Task-Konfidenz + Restrisiko**                    | Pro Task: wie wahrscheinlich erfolgreiche Umsetzung (high/medium/low)? Größtes Risiko für nicht-funktionierende App? Konkrete Minimierungs-Strategien (Spike? Reihenfolge? Mehr Tests?).                                                      |

**Pflicht-Pässe je nach Plan-Komplexität:**

- Klein (Spec-Subset, 3–5 Tasks, ≤ 200 Plan-Zeilen): Pass 1 + Pass 5 (2 Pässe).
- Mittel (5–10 Phasen, 15–25 Tasks, 200–600 Plan-Zeilen): Pass 1 + Pass 2 + Pass 5 (3 Pässe).
- Groß (10+ Phasen, 25+ Tasks, > 600 Plan-Zeilen): Pass 1 + Pass 2 + Pass 4 + Pass 5 (4 Pässe).
- v1.0-artig (mehrere Tage Implementation): Alle 5 Pässe.

### Gemeinsame Beweisführungs-Pflicht (für ALLE Pässe)

1. **Quote-Pflicht:** Für jede Behauptung über existierenden Code MUSST du `Datei:Zeile`-Quote als Beweis mitliefern. Ohne Quote: `[VERIFY-NEEDED]`.
2. **Spec-Quote-Pflicht:** Für jede Aussage über Spec-Inhalt: Spec-Sektion zitieren (`spec.md §X.Y`).
3. **Cross-Reference-Verifikation:** Für „konsistent mit X" / „analog zu Y": echten Code/echte Spec zitieren, wortwörtlich vergleichen.
4. **Negative-Behauptungen-Beweis:** Für „rendert nicht" / „bricht nichts": Code-Stelle zeigen.
5. **Missing-Directory-Check:** Für jeden neuen Datei-Pfad: Parent-Dir existiert?

### Gemeinsame Finding-Kategorien (für ALLE Pässe)

- **`[AUTO-FIX]`** — Klar falsch oder Form-Lücke **mit Beweis-Quote**. Hauptagent darf alleine fixen.
- **`[USER-DECISION]`** — Architektur-/Scope-Frage, ungewisse Antwort. Hauptagent darf NICHT alleine entscheiden.
- **`[VERIFY-NEEDED]`** — Vermutung ohne Quote. Hauptagent prüft vor Auto-Fix gegen echten Code.
- **`[OSCILLATION]`** — Finding kam in vorherigem Pass schon vor und wurde als „fixed" gemeldet — STOP und Fix prüfen.

### Pass-1-Prompt — Spec-Plan-Coverage

```
Du bist Plan-Reviewer ohne Vorab-Kontext. Pass 1 von N: **Spec-Plan-Coverage**.
Lies den Plan unter `[PLAN-PFAD]` und die zugehörige Spec (im Plan-Header verlinkt).

**Fokus dieses Passes:** Ist alles aus der Spec im Plan? Sind die Details korrekt
übernommen, oder fehlt etwas?

**Konkrete Aufgabe:**
1. Erstelle ein Mapping „Spec §X.Y → Plan Task A.B" für ALLE Spec-Sektionen (§0.0
   Verbots-Liste, §0.4 Don't-Touch, §3 Code-Änderungen, §6 Tests, §7 Doku-Pflicht,
   §10 Risiken, §11 Erfolgs-Kriterien, §12 Plan-Schritte).
2. Identifiziere Spec-Sektionen, die KEINEN Plan-Task haben (Gaps).
3. Identifiziere Plan-Tasks ohne Spec-Anker (Scope-Drift).
4. Verifiziere konkrete Werte: wenn Spec sagt „Wert von X auf Y", steht im Plan-Task
   exakt Y? Oder hat der Planer einen anderen Wert geschrieben?
5. **Plan-Step-Erwartungen mathematisch validieren** (Lesson 2026-05-15): Wenn ein
   Plan-Step `Test FAIL erwartet` sagt und ein Test-Snippet hardcoded SOLL-Werte als
   Input verwendet, ist der Test **immer PASS** (mathematisch konsistente Werte
   gegen Threshold), nicht FAIL. Inputs gegen Assertions durchrechnen. Bei
   ähnlich strikten Margin-Checks („FAIL weil Wert N=34 vs 32") prüfen ob die
   reale Marginalität die Bedingung überhaupt auslöst.
6. Verifiziere Test-Vorgaben: wenn Spec §6 einen Test fordert (neuer Test-Case),
   ist der im Plan als konkreter Plan-Task enthalten?

**Verbindliche Lese-Quellen:**
- Plan-File und Spec-File
- `.eslintrc.cjs`, `vitest.config.ts`, `tsconfig.json` (um Plan-Aussagen zu verifizieren)
- Alle Source-Files, die der Plan namentlich erwähnt

**Beweisführung:** [gemeinsame Regeln in plan-review-checklist.md]
**Finding-Kategorien:** [gemeinsame Regeln]

**Format (max 700 Worte):**

## Spec-Plan-Mapping
| Spec §  | Plan-Task | Status (✓ / GAP / DRIFT) |
| ------- | --------- | ------------------------ |

## Gaps (Spec-Inhalte ohne Plan-Task)
- [AUTO-FIX] Spec §X.Y „..." hat keinen Plan-Task — Vorschlag: neuer Task „..."

## Drifts (Plan-Tasks ohne Spec-Anker)
- [USER-DECISION] Plan Task X „..." erweitert Spec-Scope — Streichen oder Spec ergänzen?

## Detail-Inkonsistenzen
- [AUTO-FIX] Spec sagt „r=42", Plan-Task schreibt „r=40" — korrigieren auf 42.

## Top-3 Plan-Blocker
## Empfehlung
[ready for next pass / iterate (N auto-fixes offen) / blocker]
```

### Pass-2-Prompt — Plan-Interne Konsistenz + Architektur (+ ADRs/Conventions)

```
Du bist Plan-Reviewer ohne Vorab-Kontext. Pass 2 von N: **Konsistenz + Architektur**.
Lies den Plan unter `[PLAN-PFAD]`.

**Fokus dieses Passes:** Widersprüche im Plan? Architektur-Verstöße? Code-Dopplungen?
**Wichtig:** Auch wenn die Spec bereits gegen Conventions und ADRs gecheckt wurde,
kann der Plan EIGENE Verstöße einbringen (z.B. Task-Reihenfolge bricht Pure-Engine,
Helper-Auswahl ignoriert Single-Source, Test-Granularität verletzt TDD-First).
**Defense-in-Depth-Check.**

**Konkrete Suchstrategie:**

1. **Plan-Interne Widersprüche:** Sagt Phase 3 etwas, das Phase 7 widerspricht
   (z.B. „RING_RADIUS = 50" in Phase 3 vs „RING_RADIUS = 48" in Phase 7)?
2. **Architektur-Vorgaben:**
   - ADR-0002 Layered Architecture: Plan-Tasks respektieren Layer-Grenzen?
   - ADR-0004 Pure Engine: Plan-Tasks touch Engine? Falls ja: warum?
   - ADR-0009 ESLint Layer Boundaries: neue Imports konform zu `.eslintrc.cjs`?
   - ADR-0010 Single-Source: wird Helper dupliziert oder wiederverwendet?
3. **Datentrennung + Logik-Schicht:**
   - Engine-Layer pure (kein hass, kein DOM, kein State)?
   - Config-Layer nur Schema-Validation + buildSystemState?
   - Render-Layer nur SVG + CSS, keine Power-Logik?
4. **Code-Reuse:**
   - Welche bestehenden Helper (util/, render/svg-path.ts, etc.) werden wiederverwendet?
   - Wo droht Duplikation, weil Plan eine neue Funktion erstellt, die schon existiert?
   - `grep -rn "[funktion-name]" src/` für jeden „neuen" Helper.
5. **Test-Coverage:**
   - TDD-First für engine/util/config (CLAUDE.md §9)?
   - Test-Tasks VOR Implementation-Tasks?
   - Genug Test-Cases, um alle Spec-Erfolgs-Kriterien zu verifizieren?
6. **Conventions (`docs/conventions.md`):**
   - §1.2 Type-Safety: keine `any` ohne Begründungs-Kommentar?
   - §3 Datei-Größen-Limits eingehalten?
   - §11 Anti-Patterns: 12 verbotene Muster geprüft?
   - §13 Dependencies: neue DevDep mit Commit-Body-Begründung?

**Beweisführung:** [gemeinsame Regeln]
**Finding-Kategorien:** [gemeinsame Regeln]

**Format (max 700 Worte):** Strukturierte Findings pro Suchstrategie-Punkt (1.–6.).

## Top-3 Plan-Blocker
## Empfehlung
[ready for next pass / iterate (N auto-fixes offen) / blocker]

**Spezial-Hinweis:** ADR-Drift ist häufig — wenn der Plan einen Schritt vorsieht,
der einem ADR widerspricht (z.B. neuer Layer-Cross-Import), MUSS das als
`[USER-DECISION]` markiert werden (entweder Plan-Task streichen oder neuer ADR).
```

### Pass-3-Prompt — UX + Design-Bruch (+ UX-ADRs/Conventions §15)

```
Du bist Plan-Reviewer ohne Vorab-Kontext. Pass 3 von N: **UX + Design-Bruch**.
Lies den Plan unter `[PLAN-PFAD]` aus User-Erlebnis-Perspektive.

**Fokus dieses Passes:** Ist die UX sauber umgesetzt? Brechen wir bestehendes Design?
**Wichtig:** Auch wenn Spec §9 UX bereits dokumentiert, kann der Plan
UX-Vorgaben in den Tasks falsch übersetzen oder weglassen.

**Konkrete Suchstrategie:**

1. **Spec §9 UX-Coverage:** Jeder UX-Punkt aus Spec §9 (visuell, Konsistenz,
   Default-Icon-Verhalten, Migration, Edge-Geometrie, A11y, bestehende Configs,
   HACS-Update) MUSS in mindestens einem Plan-Task abgebildet sein.
   `grep "UX\|visuell\|migration"` im Plan — sind die in Tasks?
2. **Sprache-Regeln (`docs/conventions.md` §15):**
   - User-facing Strings in `i18n/de.ts`? Keine Hardcoded Strings in Templates?
   - Plan erwähnt neue Strings? Falls ja: Pflicht-Task „i18n/de.ts erweitern"?
3. **A11y-Patterns:**
   - `aria-label` und `tabindex` aus bestehendem Code respektiert?
   - Plan-Tasks ändern Tab-Order oder Focus-Management? Falls ja: explizit erwähnt?
4. **Theming + `::part()`-Hooks:**
   - Bestehende CSS-Variablen (`--ha-card-padding`, etc.) unverändert?
   - `part="node"` / `part="node-icon"` etc. — bleibt verfügbar für Card-Mod-User?
5. **Mode-Verhalten:**
   - Falls Spec Modes betrifft (`consumer_grouping: none` vs `by_area`):
     Plan-Tasks decken beide Modes ab? Tests für beide Modes?
6. **Mobile / Narrow-Container:**
   - `MIN_CONTAINER_WIDTH_PX` und Narrow-Banner-Verhalten unverändert?
   - Plan-Änderungen verschlechtern Render bei < 280 px Container?
7. **Bestehende User-Configs (Backwards-Compatibility):**
   - Plan-Änderungen brechen User-Configs aus älteren Versionen?
   - Falls ja: Migration-Pfad oder Editor-Banner als Plan-Task?

**Beweisführung:** [gemeinsame Regeln]
**Finding-Kategorien:** [gemeinsame Regeln]

**Format (max 700 Worte):** Strukturierte Findings pro Suchstrategie-Punkt.

## Top-3 Plan-Blocker
## Empfehlung
[ready for next pass / iterate (N auto-fixes offen) / blocker]

**Spezial-Hinweis:** UX-Findings sind oft `[USER-DECISION]`, weil Design-Trade-offs
ungewiss sind. Klare Verstöße (hardcoded String, Layer-Boundary-Verletzung) bleiben
`[AUTO-FIX]`.
```

### Pass-4-Prompt — Task-Granularität + Agent-Freiraum

```
Du bist Plan-Reviewer ohne Vorab-Kontext. Pass 4 von N: **Task-Granularität + Agent-Freiraum**.
Lies den Plan unter `[PLAN-PFAD]` aus Agent-Ausführungs-Perspektive.

**Fokus dieses Passes:** Sind die Tasks atomar und ausführbar? Weiß der ausführende
Agent, was er selbst entscheiden darf und wann er stoppen muss?

**Konkrete Suchstrategie:**

1. **Atomarität (1 Task = 1 Commit-fähig):**
   - Pro Task: ist klar, welche Files geändert werden, was geändert wird, und
     was die Verifikations-Kriterien sind?
   - Gibt es Tasks, die de facto mehrere Schritte enthalten und gesplittet werden sollten?
   - Gibt es Tasks, die so klein sind, dass sie mit einem anderen Task fusioniert werden sollten?
2. **Detail-Klarheit pro Task:**
   - Welche exakte Datei? `src/render/icon.ts:5` oder „icon.ts irgendwo"?
   - Welcher exakte Wert? `42` oder „größer machen"?
   - Welcher exakte Test-Case? `it('renders 50%' ...)` oder „Test schreiben"?
3. **Agent-Freiraum-Markierung:**
   - Wo darf der ausführende Agent selbst entscheiden? Sind diese Stellen explizit
     als „Implementierungs-Freiheit" / „Agent wählt" markiert?
   - Wo MUSS der Agent stoppen und nachfragen? STOP-Conditions klar?
   - Beispiel: „Falls Test-Failure unerwartet → STOP, kein autonomes Debug".
4. **Vorab-Lese-Pflicht pro Task:**
   - Hat der Agent alle Informationen, um den Task auszuführen, ohne nachzulesen?
   - Falls Pre-Reading nötig (z.B. „lies §3.4 vor Edit"): explizit erwähnt?
5. **Verifikations-Schritte:**
   - Pro Task: `pnpm check` / `pnpm test` / Manual-Verifikation klar?
   - Welche Tests müssen grün sein nach diesem Task?

**Beweisführung:** [gemeinsame Regeln]
**Finding-Kategorien:** [gemeinsame Regeln]

**Format (max 700 Worte):** Pro Task einer Tabelle:

## Task-Granularitäts-Audit
| Task | Atomar? | Details klar? | Agent-Freiraum markiert? | Verifikation klar? |
| ---- | ------- | ------------- | ------------------------ | ------------------ |

## Top-3 Plan-Blocker
## Empfehlung
[ready for next pass / iterate (N auto-fixes offen) / blocker]
```

### Pass-5-Prompt — Pro-Task-Konfidenz + Restrisiko

```
Du bist Plan-Reviewer ohne Vorab-Kontext. Pass 5 von N: **Pro-Task-Konfidenz + Restrisiko**.
Lies den Plan unter `[PLAN-PFAD]` aus Risikoanalyse-Perspektive.

**Fokus dieses Passes:** Wie sicher bist du pro Task, dass er zur Zufriedenheit
umgesetzt wird? Wo besteht das größte Risiko, dass die App am Ende nicht funktioniert?
Was können wir tun, um das Risiko zu minimieren?

**Konkrete Aufgabe:**

1. **Pro-Task-Konfidenz-Bewertung:**
   - Für JEDEN Task: bewerte mit `high` / `medium` / `low`-Konfidenz, dass der Task
     fehlerfrei umsetzbar ist.
   - Begründe `medium` und `low` konkret: was könnte schiefgehen?
   - Bei `low`: was würde Konfidenz auf `medium` heben?

2. **Größtes Restrisiko für nicht-funktionierende App:**
   - Welcher Task ist der wahrscheinlichste Auslöser eines „App startet nicht" / „Render
     bricht" / „Tests grün aber Smoke-Test rot"-Szenarios?
   - Beispiele:
     - Battery-Ring-Kollision: hoch wenn nicht atomar mit Radius-Update
     - Bundle-Budget: hoch wenn neue Imports unverifiziert
     - HACS-Update: mittel wenn Version-Sync vergessen
     - Browser-Caching: mittel wenn Service-Worker nicht invalidiert

3. **Risiko-Minimierungs-Strategien:**
   - Konkrete Vorschläge: zusätzlicher Spike-Task? Reihenfolge-Änderung?
     Mehr Tests? Manueller Verifikations-Schritt?
   - Pre-Release-Smoke-Test (ADR-0012) deckt alles ab oder bleibt eine Lücke?

4. **Rollback-Pfad:**
   - Falls etwas schiefgeht: ist der Plan revertierbar?
   - Gibt es einen Commit-Punkt, ab dem ein Revert kompliziert wird (z.B. Schema-Migration)?

5. **Konsolidierungs-Status:**
   - Alle vorherigen Iterationen-Fixes konsistent? Hat ein späterer Fix einen früheren
     teilweise revertiert?
   - Ist der Plan „freistehend lesbar"? (Agent kann ihn ausführen, ohne Spec parallel zu lesen?)

**Beweisführung:** [gemeinsame Regeln]
**Finding-Kategorien:** [gemeinsame Regeln]

**Format (max 700 Worte):**

## Pro-Task-Konfidenz
| Task | Konfidenz | Risiko-Quelle | Minimierungs-Vorschlag |
| ---- | --------- | ------------- | ---------------------- |

## Größtes Restrisiko
[Welcher Task, warum, Wahrscheinlichkeit, Auswirkung]

## Empfehlungen zur Risiko-Minimierung
- Spike vor Task X
- Reihenfolge: A vor B statt B vor A
- Zusätzlicher Verifikations-Task

## Konsolidierungs-Status
- Iterations-Fixes konsistent? Ja / Nein (Beleg)
- Plan freistehend? Ja / Nein (Beleg)

## Top-3 Plan-Blocker
## Empfehlung
[ready for user — stabil / iterate (N auto-fixes offen) / blocker]
```

### Hauptagent-Verhalten (Iterations-Loop)

**Ablauf: SEQUENTIELL, nicht parallel.** Pässe NACHEINANDER, jeder gegen die aktualisierte Plan-Version.

**Warum sequentiell:**

- Sub-Agent N+1 liest den durch Pass-N-Fixes verbesserten Plan → sieht den Fix-Diff (vN → vN+1) und prüft implizit, ob der Fix korrekt war (zweite Trust-but-Verify-Schicht).
- Sub-Agent N+1 muss keine Findings duplizieren, die N schon gemeldet hat → kann tiefer auf die nächste Brille gehen statt halb dasselbe zu finden.
- Iterationen werden sichtbar konvergent (Pass-Findings sinken) — diagnostisches Signal für Stabilität.
- Kosten: ~2× langsamer Wall-Clock-Zeit, aber Token-Kosten nicht höher.

**Anti-Pattern:** Parallel-Dispatch aller Pässe gegen v1. Erkennbar daran, dass Pässe Findings doppelt melden, weil keiner den Fix des anderen sieht.

**Konkreter Ablauf:**

1. **Vor Pass 1:** Self-Review (Phase A–L) durchführen, Findings dokumentieren.
2. **Pass-Loop (sequentiell, ein Pass nach dem anderen):**
   1. Sub-Agent mit passendem Fokus-Vektor-Prompt dispatchen.
   2. Findings als Tasks anlegen (`TaskCreate`), Kategorie und Pass-Nummer als `metadata`.
   3. Pro `AUTO-FIX`-Task: **Trust-but-Verify** gegen echten Code, dann Plan aktualisieren.
   4. Bei `USER-DECISION`-Tasks: sammeln, NICHT alleine fixen.
   5. Plan-Status hochzählen (`vN+1 (post-subagent-K-FOKUSNAME)`).
   6. **Jetzt nächster Pass:** Sub-Agent mit nächstem Fokus-Vektor gegen die aktualisierte Plan-Version.
3. **Stop-Kriterien:**
   - Sub-Agent meldet „ready for user"
   - Zwei aufeinanderfolgende Pässe ohne neue Findings
   - Nur noch `USER-DECISION` offen
   - Max 5 Pässe erreicht

**Loop-Oszillations-Schutz:**

- Wenn Pass N+1 ein Finding aus Pass N WORTWÖRTLICH wiederholt: STOP und Fix prüfen — als `[OSCILLATION]` markieren.
- Wenn Pass N+1 ein Finding aus Pass N **aus anderer Brille** identifiziert (Pass 1: Spec-Plan-Drift, Pass 2: ADR-Bruch wegen demselben Wert): das ist KEINE Oszillation, sondern Bestätigung — Fix war richtig.

**Erst nach Iterations-Loop:** User die `USER-DECISION`-Findings + finale Konfidenz-Bewertung präsentieren.

---

## Iterations-Statistik (aus Erfahrung)

| Plan-Komplexität                  | Erwartete Sub-Agent-Pässe | Erwartete Auto-Fixes |
| --------------------------------- | ------------------------- | -------------------- |
| Klein (Spec-Subset, 3-5 Tasks)    | 2–3                       | 1–5                  |
| Mittel (5–10 Phasen, 15-25 Tasks) | 3–4                       | 5–15                 |
| Groß (v1.0-artig, 29+ Tasks)      | 4–5                       | 10–30                |

Bei > 5 Sub-Agent-Pässen oder > 30 Auto-Fixes: Plan vermutlich noch nicht spec-aligned — STOP, Spec re-reviewen.
