# Code Review Checklist

> **Wann nutzen:** Nach Abschluss aller Implementations-Tasks eines Plans (Phase „Implementation done") und BEVOR `superpowers:finishing-a-development-branch` aufgerufen wird. Jede Phase explizit abarbeiten — nicht „ich habe das überlegt", sondern jeden Punkt namentlich abhaken oder dokumentieren warum nicht zutreffend.
>
> **Erkenntnis-Hinweis:** Analog zur Spec- und Plan-Review-Checkliste setzen wir auf **rotierende Fokus-Vektoren** statt eines identischen Skepsis-Prompts über mehrere Pässe. **Aber:** Code-Review hat eine andere Topologie als Spec/Plan-Review — wir vergleichen drei Ebenen (Spec ↔ Plan ↔ Code) statt zwei, wir messen quantitative KPIs (nicht nur Doku-Konsistenz), und wir verifizieren Laufzeit-Verhalten via Playwright. Deshalb **6 Pässe statt 5**, plus eine zusätzliche Finding-Kategorie (`[FIX-PLAN]`) für Refactors, die einen eigenen Sub-Plan rechtfertigen.
>
> **Bei jedem unchecked Item:** entweder fixen oder explizit dokumentieren („nicht zutreffend, weil …").

---

## Phase A — Diff-Discovery (VOR Pass 1)

Der Hauptagent verschafft sich einen vollständigen Überblick über die Implementation, bevor irgendein Sub-Agent dispatcht wird.

- [ ] `git diff main...HEAD --stat` ausgeführt, vollständige Datei-Liste in Self-Review-Notiz aufgenommen
- [ ] `git log --oneline main..HEAD` gelesen — Commit-Granularität entspricht Plan-Phasen-Aufteilung (Conventional Commits, conv §8)
- [ ] Pro geänderter Datei: aktueller Stand mit `Read` gelesen (nicht nur Diff — Sub-Agents lesen den finalen Stand)
- [ ] Spec-Datei (`docs/specs/YYYY-MM-DD-<topic>.md`) querelesen, alle Sektionen erfasst
- [ ] Plan-Datei (`docs/plans/YYYY-MM-DD-<topic>.md`) querelesen, Task-Reihenfolge gegen `git log` verifiziert
- [ ] Erwartete Files aus Plan-`File Structure`-Sektion mit `git diff --stat`-Output abgeglichen — keine ungeplanten Files (Scope-Drift) und keine fehlenden Files (Plan-Lücke)
- [ ] `pnpm install` lief seit letztem Pull (DevDeps frisch)?

**Ausgabe vor Pass 1:** „Diff zeigt N Files geändert, M neu, K gelöscht. Spec hat X §3-Sektionen, Plan hat Y Tasks. Erwartete Mapping-Reichweite: Spec § → Plan-Task → Code-File."

## Phase B — Spec/Plan ↔ Code-Mapping vorbereiten (für Pass 1)

Bevor Pass 1 dispatcht wird, bereitet der Hauptagent mental (oder als Notizblock-Tabelle) das Mapping vor, das Sub-Agent 1 später verifiziert.

- [ ] Mapping-Tabelle skizziert: Spec §X.Y → Plan-Task A.B → Code-File:Zeile
- [ ] Jede Spec-§3-Code-Änderung mindestens einem Plan-Task zugeordnet
- [ ] Jede „✓ completed"-Markierung im Plan-Markdown verifiziert: zugehöriger Code-Edit existiert wirklich (Stichprobe: 3 Tasks gezielt prüfen)
- [ ] Spec §0.4 Don't-Touch-Liste gegen `git diff` geprüft — keine verbotene Datei berührt
- [ ] Spec §11 Erfolgs-Kriterien einzeln benannt — welcher Code-Stelle entspricht jedes Kriterium?
- [ ] Plan-Tasks ohne Spec-Anker als Scope-Drift markiert (für Pass 1 als USER-DECISION-Kandidat)

## Phase C — KPI-Snapshot-Existenz (für Pass 3)

Pass 3 verlangt zwei Snapshots im History-File. Der Hauptagent verifiziert deren Existenz vor Dispatch.

- [ ] `metrics/kpi-history.json` existiert und ist valides JSON (`node -e "JSON.parse(require('fs').readFileSync('metrics/kpi-history.json'))"` ohne Fehler)
- [ ] Pre-Snapshot mit `label: pre-<plan-id>` vorhanden (vor erstem Implementations-Commit erfasst, siehe CLAUDE.md Implementation-Workflow Phase 0)
- [ ] Post-Snapshot mit `label: post-<plan-id>` vorhanden (nach letztem Implementations-Commit erfasst, siehe CLAUDE.md Implementation-Workflow Phase 5)
- [ ] `pnpm kpi:report` produziert Output ohne Crash und enthält die Header-Zeile `=== KPI Delta:`
- [ ] Falls Coverage- oder Bundle-Daten fehlen (`coverage_pct: null` / `bundle_bytes: null`): bewusst notiert für Pass-3- und Pass-6-Sub-Agents
- [ ] Falls Snapshot-Paar fehlt: Hauptagent läuft `pnpm test:coverage && pnpm build && pnpm kpi:snapshot --label post-<plan-id> --phase post` nach (Pre kann NICHT mehr nachträglich erfasst werden — Plan-Review-Lücke, USER-DECISION)

## Phase D — Playwright-Capture-Artefakte (für Pass 5)

Pass 5 ist Two-Stage: Hauptagent capturt vorher die Browser-Artefakte, Sub-Agent analysiert sie. Pass 5 wird optional übersprungen, wenn MCP nicht verfügbar.

- [ ] `metrics/playwright/<plan-id>-pre.json` existiert und ist valides JSON
- [ ] `metrics/playwright/<plan-id>-post.json` existiert und ist valides JSON
- [ ] Beide Artefakte enthalten `schema_version`, `timestamp`, `phase`, `console`, `a11y_tree`, `evaluate_results`
- [ ] `pnpm preview`-Server während Capture sauber gestartet UND beendet (kein verwaister Port)
- [ ] Capture-Pfad explizit per `Write`-Tool nach `metrics/playwright/` — NICHT auf MCP-Default-Pfad `.playwright-mcp/` verlassen (in `.gitignore`)
- [ ] Falls MCP-Verfügbarkeit fehlt (Browser-Engine, Port-Konflikt, MCP-Tool-Error): Hauptagent notiert „Pass 5: skipped" mit Begründung, andere 5 Pässe laufen unverändert

## Phase E — `pnpm check` grün als Vorbedingung

Ohne sauberes lint/typecheck/test-Baseline würden Sub-Agents auf Fehlern Stolper-Findings produzieren.

- [ ] `pnpm lint` grün (kein Output ist Erfolg)
- [ ] `pnpm typecheck` grün
- [ ] `pnpm test` grün (alle Vitest-Suites)
- [ ] `pnpm check` grün (Aggregat-Skript)
- [ ] `pnpm build` produziert `dist/custom-energy-flow-card.js` ohne Fehler
- [ ] `pnpm smoke` grün (ADR-0012 Pre-Release-Smoke-Test)

## Phase F — Edge-Cases aus Spec §11.3 / §6 manuell durchquert

Edge-Cases sind in Spec-Texten oft präzise, in Implementation aber leicht „vergessen". Hauptagent geht sie selbst einmal durch.

- [ ] Spec §6 (Tests) als Liste aufgemacht — jeder genannte Test-Case existiert im Testbaum (`grep -rn` für eindeutige Test-Namen)
- [ ] Spec §11.3 (oder analoge Sektion „Edge-Cases" / „Fehlerverhalten") durchgegangen — jeder gelistete Edge-Case wird im Code defensiv behandelt (Try/Catch, `?? default`, Type-Guard)
- [ ] Negative Werte / Nullen / leere Arrays / fehlende Sensoren: pro Engine-/Util-/Config-Funktion einen Test-Case identifiziert
- [ ] User-Strings aus `i18n/de.ts`-Erweiterungen geprüft (kein hardcoded String in Templates)
- [ ] Lifecycle: keine Side-Effects in `render()` (conv §11.5), nur in `willUpdate`

## Phase G — CLAUDE.md Implementation-Workflow Phase 0 + Phase 5 ausgeführt

Wenn Pre- oder Post-Snapshot fehlen, ist der Workflow gebrochen — Sub-Agent-Pass 3 hat dann keine Vergleichsbasis.

- [ ] Phase 0 (Pre-Snapshot vor erstem Implementations-Commit) wurde ausgeführt — Eintrag in `metrics/kpi-history.json` mit `phase: "pre"` und `label: pre-<plan-id>`
- [ ] Phase 5 (Post-Snapshot nach letztem Implementations-Commit) wurde ausgeführt — Eintrag mit `phase: "post"` und `label: post-<plan-id>`
- [ ] Falls eine Phase vergessen wurde: Hauptagent dokumentiert es ehrlich (nicht heimlich nachholen — Sub-Agent-Pass 3 würde es als Drift markieren, weil Timestamps inkonsistent sind)
- [ ] Playwright-Pre + -Post analog erfasst (siehe Phase D)

## Phase H — Stop-Kriterien klar für die kommenden Sub-Agent-Pässe

Der Hauptagent verinnerlicht die Loop-Abbruch-Bedingungen, damit er nicht „aus Trägheit" eine 4. Iteration fährt.

- [ ] Stop-Kriterium 1: **2 Iterationen ohne neue `[AUTO-FIX]` oder `[FIX-PLAN]`** (nur `[USER-DECISION]` und `[LESSON-LEARNED]`) — Konvergenz erreicht
- [ ] Stop-Kriterium 2: **Nur noch `[USER-DECISION]` offen** — Hauptagent kann nicht alleine entscheiden, also Übergang zur User-Vorlage
- [ ] Stop-Kriterium 3: **Max 3 Iterationen** — Hard-Cap. Bei Überschreiten: USER-DECISION „Code-Review konvergiert nicht — was tun?"
- [ ] Pro Iteration: Pass-Anzahl ergibt sich aus Plan-Komplexität (siehe Pass-Reihenfolge-Tabelle unten)

---

## Self-Review-Output (Hauptagent)

Zwei Sätze als Zusammenfassung, z. B.:

> Code-Review-Self-Review durchgeführt. Phase A vollständig (Diff: N Files, M neue, K gelöschte; Mapping Spec §X.Y → Plan-Task A.B → Code-Datei:Zeile skizziert für N Einträge). Phase B–H abgehakt mit Ausnahme von [X], weil [Begründung]. KPI-Snapshots (pre+post) und Playwright-Artefakte vorhanden. `pnpm check` grün. Bereit für Sub-Agent-Pässe.

---

## Phase Z — Iterative Sub-Agent-Reviews mit rotierenden Fokus-Vektoren

**Warum rotierende Fokus-Vektoren statt identischem Skepsis-Prompt:** Sub-Agents leiden am gleichen Brillen-Bias wie der Hauptagent. Identische Prompts über mehrere Pässe → diminishing returns. Verschiedene Brillen pro Pass → jeder Pass findet andere Lücken. Loop-Oszillations-Schutz bleibt aktiv: aber ähnliche Findings aus verschiedenen Brillen sind keine Oszillation — sie sind Bestätigung („zwei Linsen sehen dasselbe Problem" → echtes Problem).

**Sequentiell, nicht parallel.** Pässe NACHEINANDER, jeder gegen den durch vorherige Fixes verbesserten Code-Stand. Parallel-Dispatch ist verboten: erkennbar an doppelten Findings, weil keiner den Fix des anderen sieht.

**Wann:** Verbindlich nach Phase A–H (Self-Review), BEVOR der User die finale `USER-DECISION`-Vorlage sieht.

**Wie:** `Agent`-Tool mit `subagent_type: general-purpose`. Pro Pass den passenden Fokus-Vektor-Prompt unten 1:1 nutzen, Placeholder `[SPEC-PFAD]` / `[PLAN-PFAD]` / `[REPO-ROOT]` ersetzen.

### Pass-Reihenfolge (Fokus-Rotation für Code-Review)

| Pass | Fokus-Vektor                                   | Was prüft diese Brille                                                                                                                                                                                                                                                         |
| ---- | ---------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| 1    | **Spec/Plan ↔ Code-Coverage**                  | Wurde alles aus Spec §3 und Plan-Tasks 1:1 im Code umgesetzt? Drift-Verifikation pro Wert. „✓ completed"-Plan-Tasks ohne tatsächlichen Code? Spec-Vorgaben ohne Code-Stelle?                                                                                                   |
| 2    | **Architektur + ADRs + Conventions**           | ESLint catched Layer-Boundaries — wir prüfen tiefer. Anti-Patterns aus conv §11 (12 Items), ADR-Compliance pro relevantem ADR (0002/0003/0004/0009/0010/0011), Imports-Order conv §4, Comments-Policy conv §2, Logging conv §7, Commit-Messages conv §8.                       |
| 3    | **Wartbarkeits-KPIs (skript-basiert)**         | `pnpm kpi:report`-Output auswerten. Drift erkennen. Threshold-Verstöße melden (LOC, Cyclomatic, Type-Safety-Drift, Fan-In/Fan-Out, Dead-Exports, Import-Cycles). Pro Drift: AUTO-FIX / FIX-PLAN / USER-DECISION.                                                               |
| 4    | **Test-Tiefe + TDD-Compliance**                | Edge-Cases aus Spec §11.3 / §6 jeweils ein Test-Case? TDD-Order via `git log --reverse <plan-start>..HEAD` (Test-Commit VOR Implementation-Commit für engine/config/util)? `it.each` (conv §5.3)? Coverage-Lücken (engine/config/util < 90 % = no-go)? Snapshot-Tests aktuell? |
| 5    | **UX + Funktional via Playwright (Two-Stage)** | Hauptagent erfasst Artefakte vorher. Sub-Agent liest `metrics/playwright/<plan-id>-pre.json` und `-post.json` + Spec §9. Pflicht-Checks: Console-Errors = 0, key elements im A11y-Tree, aria-labels, tabindex, customElements-Check, Editor-Crash-frei. Delta pre→post.        |
| 6    | **Release-Readiness + Restrisiko**             | `pnpm build` ≤ 60 kB, `pnpm build:analyze`, `pnpm smoke`, `pnpm check`, Doku-Updates pro Spec §7 (CLAUDE.md, architecture.md §4, ADR-Index, README.md Changelog). HACS-Version-Bump: `[USER-DECISION]`, NICHT AUTO-FIX. Rollback-Pfad. Restrisiko-Top-3.                       |

**Pflicht-Pässe je nach Plan-Komplexität:**

- Klein (≤ 5 Plan-Tasks, ≤ 200 geänderte Code-Zeilen): Pass 1 + Pass 6 (2 Pässe). Pass 5 nur wenn UX-relevante Änderung.
- Mittel (5–15 Plan-Tasks, 200–1000 geänderte Code-Zeilen): Pass 1 + Pass 2 + Pass 3 + Pass 6 (4 Pässe). Pass 5 wenn UX-Pfad berührt.
- Groß (15+ Plan-Tasks, > 1000 geänderte Code-Zeilen): Alle 6 Pässe.
- Multi-Iteration (kritische Implementation, v1.0-artig): bis 3 Iterationen × 6 Pässe = max 18 Sub-Agent-Runs. Hard-Stop bei Iteration 3.

### Gemeinsame Beweisführungs-Pflicht (für ALLE Pässe)

1. **Quote-Pflicht:** Für jede Behauptung über existierenden Code MUSST du `Datei:Zeile`-Quote als Beweis mitliefern. Ohne Quote: `[VERIFY-NEEDED]` statt `[AUTO-FIX]`.
2. **Spec-Quote-Pflicht:** Für jede Aussage über Spec-Inhalt: Spec-Sektion zitieren (`docs/specs/<file>.md §X.Y`). Plan-Aussagen analog (`docs/plans/<file>.md Task A.B`).
3. **Cross-Reference-Verifikation:** Für „konsistent mit X" / „analog zu Y": echten Code/echte Spec/echten Plan zitieren, wortwörtlich vergleichen.
4. **Negative-Behauptungen-Beweis:** Für „rendert nicht" / „bricht nichts" / „wird nicht aufgerufen": Code-Stelle zeigen, die das beweist (z. B. `grep -rn "fnName" src/` zeigt 0 Treffer).
5. **Tool-Coverage-Awareness:** Bei neuen Files: welche Pipeline-Stufen (`typecheck` / `lint` / `test` / `smoke`) decken sie ab? Lücken explizit benennen.

### Gemeinsame Finding-Kategorien (für ALLE Pässe)

- **`[AUTO-FIX]`** — Klar falsch oder Form-Lücke **mit Beweis-Quote**, Fix ist klein (< 20 Zeilen Diff, kein Architektur-Eingriff). Hauptagent darf alleine fixen (mit Trust-but-Verify gegen echten Code).
- **`[FIX-PLAN]`** — Größerer Refactor (Layer-Verschiebung, Helper-Extraktion, mehrere Files koordiniert) → Hauptagent erstellt einen **mini Fix-Sub-Plan** via `superpowers:writing-plans`, lässt ihn via `superpowers:subagent-driven-development` abarbeiten, dann neue Iteration. NICHT inline fixen — Sub-Plan macht den Scope sichtbar.
- **`[USER-DECISION]`** — Architektur-/Scope-/UX-Frage, ungewisse Antwort. Hauptagent darf NICHT alleine entscheiden. Werden am Ende gebündelt vorgelegt.
- **`[VERIFY-NEEDED]`** — Sub-Agent-Vermutung ohne Quote oder mit unklarem Code-Bezug. Hauptagent prüft VOR Auto-Fix gegen echten Code. Wenn False-Positive: dokumentiert als „resolved-to-not-a-bug" im Pass-Bericht (NICHT in `lessons-learned.md` — lehrt nichts Generalisierbares).
- **`[LESSON-LEARNED]`** — Beobachtung, die für zukünftige Specs/Pläne nützlich ist (z. B. „Lit-`css`-Tag rejected raw-String-Interpolation — `unsafeCSS` nötig"). Hauptagent appendet zu `docs/lessons-learned.md` als Append-only-Hot-Pot. **Spec- und Plan-Dokumente werden retroaktiv NIE angefasst** — sie sind historisches Protokoll der Entscheidungen vor Implementation.

### Pass-1-Prompt — Spec/Plan ↔ Code-Coverage

```
Du bist Code-Reviewer ohne Vorab-Kontext. Pass 1 von N: **Spec/Plan ↔ Code-Coverage**.
Lies die Spec unter `[SPEC-PFAD]`, den Plan unter `[PLAN-PFAD]`, und den Diff der
Branch-Implementation: `git diff main...HEAD --stat` plus alle Files im Diff.

**Fokus dieses Passes:** Wurde alles aus Spec §3 (Code-Änderungen) und allen Plan-Tasks
1:1 im Code umgesetzt? Wo gibt es Drift zwischen Spec-Wert und Code-Wert? Welche
Plan-Tasks sind als „✓ completed" markiert, aber die Code-Stelle fehlt? Welche
Spec-Vorgaben tauchen weder im Plan noch im Code auf?

**Konkrete Aufgabe:**

1. **Drei-Ebenen-Mapping erstellen** für JEDE Spec-§3-Vorgabe und JEDEN Plan-Task:
   `Spec §X.Y → Plan-Task A.B → Code-File:Zeile`.
   Markiere ✓ (vollständig), GAP (Spec/Plan fordert, Code fehlt), DRIFT (Wert anders),
   SCOPE-DRIFT (Code hat etwas, Plan fordert nichts).

2. **Drift-Verifikation pro konkretem Wert:** Wenn Spec sagt „Konstante auf 42 setzen",
   `grep -rn "= 42" src/` zeigt die Stelle? Oder steht da 40, 41, 43?

3. **„✓ completed"-Reality-Check:** Plan-Markdown enthält Tasks mit `- [x]`-Checkboxes.
   Für jede: existiert die behauptete Code-Stelle wirklich? (Stichproben-Check mindestens
   bei 5 zufällig gewählten Tasks, plus alle als „kritisch" markierten Tasks.)

4. **Test-Vorgaben aus Spec §6:** Für jeden benannten Test-Case ein `grep -rn` für den
   Test-Namen oder eindeutige Assertion. Fehlt der Test im Code: `[AUTO-FIX]` mit
   konkretem Test-Skeleton oder `[FIX-PLAN]` wenn größere Test-Suite-Erweiterung.

5. **Spec §0.4 Don't-Touch-Verstöße:** `git diff main...HEAD --stat` zeigt eine §0.4-Datei?
   Sofort `[USER-DECISION]` mit Begründungs-Pflicht.

6. **Erfolgs-Kriterien aus Spec §11:** Jedes Kriterium hat eine verifizierbare Code-Stelle?
   (z. B. „LOC < 200 in `card.ts`" → `wc -l src/card.ts`; „Coverage ≥ 90 %" → coverage-Report.)

7. **Plan §12 / Plan-Phasen-Reihenfolge:** Wurde die im Plan vorgegebene Reihenfolge
   gehalten (`git log --reverse`)? Aus-der-Reihe-Commits können Tests-vor-Code-Order
   gebrochen haben (siehe Pass 4) — hier nur Reihenfolge dokumentieren.

**Verbindliche Lese-Quellen:**

- `[SPEC-PFAD]` und `[PLAN-PFAD]` vollständig
- Alle im Diff geänderten Source-Files (lese den FINALEN Stand, nicht nur den Diff)
- `git log --oneline main..HEAD`, `git log --reverse main..HEAD`
- `.eslintrc.cjs`, `vitest.config.ts`, `tsconfig.json`, `package.json` (zur Verifikation
  von Plan-Aussagen über Build-Pipeline-Edits)

**Beweisführung:** Gemeinsame Regeln (siehe oben). Quote-Pflicht ist hier besonders
streng — jede „fehlt"-Behauptung MUSS mit `grep`-Output belegt sein (0 Treffer).

**Finding-Kategorien:** Gemeinsame Regeln. `[FIX-PLAN]` ist hier korrekt, wenn Drift
mehrere Files betrifft und ein koordinierter Refactor nötig ist.

**Format (max 700 Worte):**

## Spec/Plan-Code-Mapping
| Spec §  | Plan-Task | Code-File:Zeile | Status |
| ------- | --------- | --------------- | ------ |

## Gaps (Spec-/Plan-Vorgaben ohne Code)
- [AUTO-FIX] Spec §X.Y „..." — kein Code-Edit gefunden (`grep` 0 Treffer). Vorschlag: ...

## Drifts (Wert in Spec/Plan ≠ Wert im Code)
- [AUTO-FIX] Spec sagt „r = 42" (`spec.md §3.2`), Code hat `r = 40` (`src/x.ts:15`) — auf 42 korrigieren.

## Scope-Drifts (Code-Änderung ohne Spec/Plan-Anker)
- [USER-DECISION] Diff zeigt Edit in `src/y.ts:30-50`, weder Spec noch Plan referenzieren — beibehalten und Spec ergänzen oder revertieren?

## „✓ completed"-Reality-Check
- [Task A.B: ✓ verifiziert / Task C.D: GAP — Plan sagt done, Code zeigt nichts]

## Top-3 Code-Blocker
1. ...
2. ...
3. ...

## Empfehlung
[ready for next pass / iterate (N auto-fixes offen) / blocker]

**Spezial-Hinweis:** Wenn du eine Spec §0.4 Don't-Touch-Verletzung findest: ALLES STOP,
das ist immer `[USER-DECISION]` und blockiert weitere Pässe bis User entscheidet.
```

### Pass-2-Prompt — Architektur + ADRs + Conventions

```
Du bist Code-Reviewer ohne Vorab-Kontext. Pass 2 von N: **Architektur + ADRs + Conventions**.
Lies den Diff der Branch-Implementation und prüfe gegen `docs/conventions.md`,
`docs/architecture.md` §2 (Layer-Tabelle) und alle relevanten ADRs in `docs/adr/`.

**Fokus dieses Passes:** ESLint catched Layer-Boundaries automatisch (ADR-0009), aber wir
prüfen tiefer: Anti-Patterns, ADR-Compliance, Imports-Order, Comments-Policy, Logging,
Commit-Messages. **Defense-in-Depth-Check** — auch wenn die Spec/Plan-Reviews gegen
Conventions+ADRs gecheckt haben, kann der Code EIGENE Verstöße einbringen (z. B.
Helper-Duplikat in einem zweiten File, das beim Plan-Review niemandem auffiel).

**Konkrete Suchstrategie:**

1. **Anti-Patterns aus conventions §11 (12 Items)** — pro Item ein gezielter `grep` im Diff:
   - god-class in `card.ts` (> 200 LOC): `wc -l src/card.ts`
   - SVG-String-Konkatenation: `grep -rn "'<svg" src/render/`
   - Externe DOM-Libs außer Lit: `package.json` Diff zeigt neue Runtime-Dep?
   - Side-Effects in `src/engine/`: `grep -rn "hass\|document\|window" src/engine/`
   - Doppelte Util-Funktionen: jedes neue Helper-Konstrukt — `grep -rn "function <name>"` zeigt nur 1 Vorkommen?
   - Berechnung in `render()`: `grep -A20 "render() {" src/` zeigt nur Templates?
   - Hardcoded User-Strings: `grep -rn "'[A-ZÄÖÜ][a-zäöü ]\{4,\}'" src/render/ src/card.ts` (DE-Strings)
   - TODO/FIXME im Release-Diff: `grep -rn "TODO\|FIXME\|XXX" <diff-files>`
   - `console.log` ohne Prefix: `grep -rn "console\." src/` — alle müssen `[custom-energy-flow-card]` haben
   - Magic Numbers ohne Konstante: kritisch in `engine/` und `config/`
   - Default-Exports in Library-Code (sollten Named-Exports sein)
   - Imperative-`forEach` + `push` statt `.map` / `.filter` / `.reduce` (conv §1.6)

2. **ADR-Compliance pro relevantem ADR** (aus Spec §0.1 Liste):
   - ADR-0002 (Layered Architecture): Diff verletzt Layer-Imports? Cross-Layer-Imports nur engine←config←util und render←engine?
   - ADR-0003 (No Runtime Deps außer Lit): `package.json` Diff zeigt neue `dependencies` (NICHT `devDependencies`)? Falls ja: `[USER-DECISION]` — neuer ADR nötig
   - ADR-0004 (Pure Engine): `git diff src/engine/` zeigt `hass` / `document` / `window` / `this.X = Y`? Engine MUSS pure bleiben
   - ADR-0009 (ESLint Layer Boundaries): wurden Zone-Definitionen in `.eslintrc.cjs` erweitert? Falls ja: additive (nicht replace)?
   - ADR-0010 (Shared Util Single-Source): jede neue Helper-Funktion — existiert ein Pendant in `src/util/`? `grep -rn "<funktionsname>"`
   - ADR-0011 (Lit shouldUpdate): `grep -rn "hasChanged" src/` — keine `hasChanged`-Property-Decorator (this-Binding-Problem)? Stattdessen `shouldUpdate(changedProperties)`?

3. **Conventions §1 (Type-Safety)**:
   - `grep -rn ": any" src/` — jedes `: any` hat einen Begründungs-Kommentar in derselben Zeile / Zeile drüber? (conv §1.2)
   - `as X`-Casts: an Layer-Boundary OK, intern brauchen Kommentar
   - `noUncheckedIndexedAccess`: `arr[0]` → muss `?? default` oder Type-Guard haben

4. **Conventions §2 (Comments-Policy)**: keine WHAT-Kommentare, nur WHY-Kommentare im finalen Code. Stichprobe in neuen Files.

5. **Conventions §3 (Datei-Größen-Limits)**:
   - `wc -l src/card.ts` ≤ 200
   - `wc -l src/editor.ts` ≤ 400
   - `wc -l src/engine/energy-engine.ts` ≤ 300
   - sonst alle Files ≤ 250

6. **Conventions §4 (Imports-Order)**: in JEDER geänderten Datei manuell prüfen — Reihenfolge: external → internal absolute → internal relative → type-only.

7. **Conventions §7 (Logging)**: alle `console.*`-Aufrufe in `src/` haben Prefix `[custom-energy-flow-card]`?

8. **Conventions §8 (Commit-Messages)**: `git log --oneline main..HEAD` — alle Conventional Commits mit korrektem Scope (`feat(engine):`, `fix(render):`, `docs(adr):`, etc.)?

9. **Conventions §13 (Dependencies)**: neue DevDep in `package.json` hat Commit-Body-Begründung? (`git log -p package.json`)

10. **Conventions §15 (Sprache)**: Code-Identifier EN, User-Strings DE, neue Doku-Files DE?

**Verbindliche Lese-Quellen:**

- `docs/conventions.md` (§1–§15)
- `docs/architecture.md` §2 (Layer) + §4 (ADR-Index)
- Alle ADR-Files, die aus Spec §0.1 referenziert sind, plus ADR-0009/0010/0011 (immer relevant)
- `.eslintrc.cjs`, `package.json`, `tsconfig.json`

**Beweisführung:** Gemeinsame Regeln. Hier ist `grep`-Output für negative Behauptungen
(„keine Helper-Dopplung") Pflicht.

**Finding-Kategorien:** Gemeinsame Regeln. ADR-Bruch ist oft `[USER-DECISION]` (entweder
Code anpassen oder neuer ADR), Anti-Pattern ist meist `[AUTO-FIX]`, Helper-Dopplung kann
`[FIX-PLAN]` werden wenn Refactor mehrere Stellen betrifft.

**Format (max 700 Worte):** Strukturierte Findings pro Suchstrategie-Punkt (1.–10.).

## Top-3 Code-Blocker
## Empfehlung
[ready for next pass / iterate (N auto-fixes offen) / blocker]

**Spezial-Hinweis:** ADR-Drift ist häufig — wenn der Code einen Wert ändert, der in
einem ADR fixiert ist (z. B. Bundle-Budget, Layer-Definition), MUSS der ADR mit-
aktualisiert werden (`[FIX-PLAN]` oder `[USER-DECISION]` je nach Tragweite). NIE
stillschweigend Code-Realität als „den ADR ungültig machend" akzeptieren.
```

### Pass-3-Prompt — Wartbarkeits-KPIs (skript-basiert)

```
Du bist Code-Reviewer ohne Vorab-Kontext. Pass 3 von N: **Wartbarkeits-KPIs**.
Du arbeitest skript-basiert: das KPI-Skript (`scripts/kpi.mjs`) hat zwei Snapshots in
`metrics/kpi-history.json` produziert (pre + post für `[PLAN-ID]`). Werte sie aus.

**Fokus dieses Passes:** Quantitative Drift-Erkennung. Wo verschlechtert die
Implementation messbare Wartbarkeits-Kennzahlen? Welche Threshold-Verstöße sind NEU
(post hat Verstoß, pre nicht)?

**Konkrete Aufgabe:**

1. **Skript-Run + Daten-Lese:**
   - Falls nicht schon geschehen: `pnpm kpi:report` ausführen (im Repo-Root), Output lesen
   - `metrics/kpi-history.json` direkt lesen, letzte zwei Einträge mit `phase: pre` und
     `phase: post` für denselben `plan_id` finden
   - Validierung: beide Snapshots haben identische `schema_version`?

2. **Pro Drift-Kategorie aus dem Delta-Report:**
   - **Threshold-Verstöße NEU** (`violations`-Array in post hat Items, die in pre fehlen):
     jedes Item als Finding. Wenn klar Code-Fehler: `[AUTO-FIX]` mit Datei:Zeile + Fix-
     Vorschlag. Wenn größerer Refactor: `[FIX-PLAN]`. Wenn Architektur-Frage: `[USER-DECISION]`.
   - **LOC-Drift** (`loc_total` oder `loc_per_layer`): signifikant (> 10 % in einem Layer
     ODER > 5 % Gesamt) → ist die Begründung im Diff erkennbar (neuer Feature-Code legitim)?
     Oder Bloat-Indiz (Helper nicht extrahiert)?
   - **Complexity-Anstieg** (`cyclomatic_max` oder neue Funktionen > 10 cyclomatic):
     welche Funktion (Datei:Zeile)? Refactor-Vorschlag (z. B. Early-Return, Extract-Method).
   - **Type-Safety-Drift** (`any_count` / `as_count` / `non_null_assert_count`):
     wo (Datei:Zeile)? Warum? `[AUTO-FIX]` mit konkretem Type oder `[USER-DECISION]`
     wenn HA-Boundary unvermeidlich.
   - **Fan-In/Fan-Out-Anstieg** (`fan_in_max` / `fan_out_max`): Coupling-Hotspot? Welcher
     Modul ist „Gott-Importeur"? Refactor-Hinweis.
   - **Dead-Exports** (`dead_exports`-Array): gestrichene Konsumenten ohne Export-Cleanup?
     `[AUTO-FIX]` (Export entfernen, falls wirklich tot).
   - **Import-Cycles** (`intra_layer_cycles`-Array): Architektur-Smell — `[FIX-PLAN]`
     mit konkretem Auflöse-Pfad (Helper extrahieren, Interface invertieren).

3. **Bundle-Budget (kritisch):**
   - `bundle_bytes` post ≤ 60 000 (60 kB)?
   - Bei Überschreitung: `[FIX-PLAN]` mit `pnpm build:analyze`-Hinweis zur Diagnose.

4. **Coverage-Drift:**
   - `coverage_pct` und `coverage_per_layer` (engine/config/util) ≥ 90 %?
   - Wenn pre 92 % → post 87 % für engine/: `[AUTO-FIX]` (Tests nachreichen) oder
     `[FIX-PLAN]` wenn mehrere Edge-Cases zu schreiben sind.

5. **Plan-spezifische KPIs (falls Plan §11 quantitative Kriterien hat):**
   - Spec/Plan-Erfolgs-Kriterium war „LOC < 200 in `card.ts`"? Check via Snapshot-Wert.
   - Bundle-Reduzierung erwartet? Check Delta.

**Verbindliche Lese-Quellen:**

- `metrics/kpi-history.json` (pre + post Einträge)
- Output von `pnpm kpi:report` (Hauptagent kann es noch einmal laufen lassen, oder
  Sub-Agent ruft es selbst via Bash)
- Plan §11 Erfolgs-Kriterien (für quantitative Vergleiche)

**Beweisführung:** Pro Behauptung: KPI-Wert aus dem Snapshot zitieren (`metrics/kpi-history.json
[N].cyclomatic_max = 14`). Datei:Zeile-Quote für die problematische Code-Stelle (aus
`violations`-Array entnehmbar).

**Finding-Kategorien:** Gemeinsame Regeln. Threshold-Verstöße sind meist `[AUTO-FIX]`
(Refactor klein) oder `[FIX-PLAN]` (Refactor mehrere Files). Bundle-Sprenger sind fast
immer `[FIX-PLAN]` (mit `build:analyze`-Diagnose-Subtask).

**Format (max 700 Worte):**

## KPI-Delta-Übersicht
| Metric | Pre | Post | Delta | Status |
| ------ | --- | ---- | ----- | ------ |
| loc_total | ... | ... | ... | ✓ / ⚠ / ✗ |

## Threshold-Verstöße (neu in post)
- [AUTO-FIX] `src/engine/x.ts:42` `myFunc` cyclomatic = 14 (threshold 10). Vorschlag: Early-Return.

## Coverage-Lücken
- [FIX-PLAN] engine-Layer 87 % (< 90 %). Fehlende Test-Cases: ...

## Top-3 Code-Blocker
## Empfehlung
[ready for next pass / iterate (N auto-fixes offen) / blocker]

**Spezial-Hinweis:** Falls KPI-Skript fehlgeschlagen ist (Crash, fehlende Snapshots):
Pass 3 kann nicht laufen. Sub-Agent meldet `[VERIFY-NEEDED]` an Hauptagent: „KPI-Skript
muss erst grün laufen — Pass 3 skipped."
```

### Pass-4-Prompt — Test-Tiefe + TDD-Compliance

```
Du bist Code-Reviewer ohne Vorab-Kontext. Pass 4 von N: **Test-Tiefe + TDD-Compliance**.
Prüfe die Test-Suite gegen Spec §6 / §11.3, gegen TDD-Pflicht aus CLAUDE.md §9, und
gegen Conventions §5 (Test-Stil).

**Fokus dieses Passes:** Sind Edge-Cases getestet, wurde TDD-Reihenfolge gehalten,
ist die Test-Coverage ≥ 90 % für `engine/` / `config/` / `util/`, sind Tests in
`it.each`-Tabellenform (conv §5.3), sind Snapshot-Tests aktuell?

**Konkrete Aufgabe:**

1. **Edge-Cases aus Spec §11.3 / §6:** Pro gelistetem Edge-Case ein Test-Case
   identifiziert. `grep -rn "<eindeutiger-Test-Name>"` in `tests/` / `*.test.ts`.
   Fehlend = `[AUTO-FIX]` mit Test-Skeleton.

2. **TDD-Order:** `git log --reverse main..HEAD --name-status` durchgehen. Für jeden
   Edit in `src/engine/`, `src/config/`, `src/util/`: kam VOR diesem Commit ein
   Test-Commit für dieselbe Funktion? Falls nein: `[LESSON-LEARNED]` (TDD wurde
   verletzt — die Lehre ist für künftige Implementations).

3. **`it.each` für Tabellen-Tests (conv §5.3):** `grep -rn "it.each\|describe.each" tests/`
   — werden Tabellen-Tests genutzt? Reihenfolge prüfen: Tests, die mehrere Input-Output-
   Paare prüfen, sollten `it.each` nutzen, NICHT `it()` mit copy-paste.

4. **Coverage-Lücken (kritisch):**
   - `pnpm test:coverage` Output lesen (oder `metrics/kpi-history.json` post-Eintrag
     für `coverage_per_layer`)
   - engine/config/util-Layer < 90 % = **`[FIX-PLAN]`** mit Auflistung fehlender
     Branches (`coverage/lcov-report` oder Vitest-Output zeigt Lines/Branches uncovered)

5. **Snapshot-Tests:** `grep -rn "toMatchSnapshot\|toMatchInlineSnapshot" tests/` —
   Veraltete Snapshots? `git diff` zeigt `__snapshots__/*.snap`-Files? Falls ja:
   sind die Diffs sinnvoll (gewollt) oder verdächtig (Render-Regression)?

6. **Test-Stil-Pflicht (conv §5.3):**
   - Single-Assertion pro `it`: jedes `it`-Block hat ≤ 1 logische Assertion-Gruppe?
   - Eigenständige Tests: keine impliziten Reihenfolge-Abhängigkeiten zwischen `it`s?
   - Aussagekräftige Namen: `it('returns 0 for negative power')` ist gut, `it('works')` nicht

7. **Defensive Tests vs Coverage-Tests:** Plan oder Spec hat defensive Tests gefordert
   („alter UND neuer Code grün")? Sind sie als solche markiert? Oder hat ein Test
   mit altem AND neuem Code grün, was ein TDD-Fehler wäre?

**Verbindliche Lese-Quellen:**

- Spec §6 (Tests) und §11.3 (Edge-Cases) oder analoge Sektion
- `tests/` und `src/**/*.test.ts`
- `vitest.config.ts` (für `coverage.include` und `coverage.thresholds`)
- `coverage/coverage-summary.json` (falls vorhanden) oder `metrics/kpi-history.json`
  post-Eintrag
- `git log --reverse main..HEAD --name-status` für TDD-Order

**Beweisführung:** Gemeinsame Regeln. TDD-Verletzungen brauchen `git log`-Quote (welcher
Commit-SHA hat Implementation vor Test). Coverage-Lücken brauchen exakte Prozent-Zahl.

**Finding-Kategorien:** Gemeinsame Regeln. Fehlender Test ist meist `[AUTO-FIX]`,
TDD-Verletzungen sind oft `[LESSON-LEARNED]` (Vergangenheit nicht reparierbar, aber
für nächstes Mal merken), Coverage-Lücken mehrerer Files sind `[FIX-PLAN]`.

**Format (max 700 Worte):**

## Edge-Case-Coverage
| Spec §11.3 Edge-Case | Test gefunden? | Test-File:Test-Name |
| -------------------- | -------------- | ------------------- |

## TDD-Order-Check
- Funktion `X` (`src/engine/x.ts`): Test-Commit `abc1234` vor Impl-Commit `def5678` ✓
- Funktion `Y` (`src/util/y.ts`): Impl-Commit vor Test-Commit ✗ → [LESSON-LEARNED]

## Coverage-Status
- engine/: 94 % ✓
- config/: 88 % ✗ → [FIX-PLAN] fehlende Branches in `config/schema.ts:30-45`

## Top-3 Code-Blocker
## Empfehlung
[ready for next pass / iterate (N auto-fixes offen) / blocker]

**Spezial-Hinweis:** TDD-Verletzungen sind RÜCKWIRKEND nicht fixbar — ein Test, der
NACH der Implementation geschrieben wurde, ist nicht „rot vorher gewesen". Markiere als
`[LESSON-LEARNED]` und appende an `docs/lessons-learned.md` (siehe gemeinsame
Finding-Kategorien). NICHT als `[AUTO-FIX]` „Test umschreiben" — Schaden ist getan,
nur Lehre bleibt.
```

### Pass-5-Prompt — UX + Funktional via Playwright (Two-Stage)

```
Du bist Code-Reviewer ohne Vorab-Kontext. Pass 5 von N: **UX + Funktional via Playwright**.
Two-Stage-Pattern: der Hauptagent hat VORHER mit Playwright MCP die Browser-Artefakte
erfasst und nach `metrics/playwright/[PLAN-ID]-pre.json` und `-post.json` geschrieben.
Du liest beide Artefakte und Spec §9 (UX-Verhalten).

**Voraussetzung (Hauptagent-Side, schon erledigt vor deinem Pass):**
- `pnpm build` erfolgreich
- `pnpm preview` Background-Server gestartet (mit `trap` für Cleanup)
- Playwright MCP-Sequence: `browser_navigate http://127.0.0.1:<PORT>/preview/preview.html`
  → `browser_wait_for "ha-card"` → `browser_console_messages` → `browser_snapshot`
  → `browser_evaluate "customElements.get('custom-energy-flow-card-editor') !== undefined"`
- Artefakte explizit per `Write`-Tool nach `metrics/playwright/[PLAN-ID]-{pre,post}.json`
  (NICHT MCP-Default `.playwright-mcp/` — der ist in `.gitignore`!)

**Fokus dieses Passes:** Funktioniert die Card im Browser? A11y-Tree intakt? Console
sauber? Editor-Custom-Element registriert? Delta pre→post sinnvoll oder regression?

**Konkrete Aufgabe:**

1. **Lies beide Artefakte:** `metrics/playwright/[PLAN-ID]-pre.json` und `-post.json`.
   Beide haben Schema: `{ schema_version, timestamp, phase, console: [...], a11y_tree: {...}, evaluate_results: {...} }`.

2. **Lies Spec §9 (UX-Verhalten):** welche UX-Vorgaben sind gemacht? Sichtbarkeit von
   Nodes, Edges, Modes, Editor-Fields, A11y-Patterns, Theming?

3. **Pflicht-Checks im post-Artefakt:**
   - **Console:** `console`-Array enthält 0 Einträge mit `level: "error"` und 0 unerwartete
     `level: "warning"` (erwartete Warnings müssten in Spec §X explizit dokumentiert sein)
   - **A11y-Tree / DOM:** enthält `ha-card`, mindestens 1 `svg`, mindestens 1 `node-icon`,
     mindestens 1 `edge` (oder das Card-spezifische Pendant)
   - **aria-labels:** alle interaktiven Elemente (Nodes, Edges) haben `aria-label`
   - **tabindex:** sinnvoll gesetzt (keine 0/-1-Mischung in einem fokussierbaren Cluster)
   - **customElements-Check:** `evaluate_results.editor_registered === true`
   - **Editor-Crash-frei:** falls ein `editor-open`-Capture vorhanden — keine Errors

4. **Delta pre→post:**
   - Neue Console-Errors oder -Warnings, die in pre fehlen?
   - DOM-Struktur unerwartet anders (key elements verschwunden)?
   - A11y-Regression (Label oder tabindex weg)?
   - Editor-Custom-Element war pre registriert, jetzt nicht?

5. **UX-Vorgaben aus Spec §9 manuell durchquert:**
   - Z. B. Spec sagt „Default-Icon-Verhalten bei fehlender Konfiguration ist `mdi:flash`":
     im A11y-Tree des post-Artefakts den Icon-Namen finden, prüfen.
   - Z. B. Spec sagt „Editor-Field-Reihenfolge: A, B, C": `evaluate_results.editor_fields`-
     Liste prüfen.

6. **Falls Pass 5 skipped (MCP nicht verfügbar):** Sub-Agent meldet das explizit und
   beendet Pass mit Empfehlung „skipped — Pass 5 nicht ausführbar, andere Pässe
   unberührt." Hauptagent dokumentiert in User-Vorlage.

**Verbindliche Lese-Quellen:**

- `metrics/playwright/[PLAN-ID]-pre.json` und `-post.json`
- Spec §9 (UX-Verhalten)
- Optional: Plan-Tasks, die UX betreffen (für Vollständigkeits-Check)

**Beweisführung:** Pro Behauptung: JSON-Pfad im Artefakt zitieren (z. B.
`[PLAN-ID]-post.json $.console[3].level = "error"`). Bei A11y-Findings: Element-Selector
oder Rolle nennen.

**Finding-Kategorien:** Gemeinsame Regeln. Funktional-Regression (Console-Error neu, A11y
weg) ist meist `[AUTO-FIX]` oder `[FIX-PLAN]`. UX-Trade-offs (Editor-Field-Reihenfolge)
sind oft `[USER-DECISION]`. Skipped-Pass ist `[VERIFY-NEEDED]` mit Begründung.

**Format (max 700 Worte):**

## Browser-Artefakte
- Pre: `metrics/playwright/[PLAN-ID]-pre.json` (Timestamp: ...)
- Post: `metrics/playwright/[PLAN-ID]-post.json` (Timestamp: ...)

## Pflicht-Checks (post)
| Check | Status | Beweis (JSON-Pfad) |
| ----- | ------ | ------------------ |
| Console: 0 errors | ✓ / ✗ | $.console[*].level |

## Delta pre→post
- Neue Errors: ...
- A11y-Regression: ...

## Spec §9 UX-Coverage
- Vorgabe „...": ✓ verifiziert (Beleg: ...)

## Top-3 Code-Blocker
## Empfehlung
[ready for next pass / iterate (N auto-fixes offen) / blocker / skipped]

**Spezial-Hinweis:** Du analysierst NUR Artefakte, du startest NICHT selbst Playwright.
Falls Artefakte fehlen oder korrupt: melde `[VERIFY-NEEDED]` an Hauptagent, NICHT
selbst capturen versuchen.
```

### Pass-6-Prompt — Release-Readiness + Restrisiko

```
Du bist Code-Reviewer ohne Vorab-Kontext. Pass 6 von N: **Release-Readiness + Restrisiko**.
Dieser Pass ist der letzte vor User-Vorlage. Du prüfst, ob die Implementation
release-fähig ist, und identifizierst Restrisiken.

**Fokus dieses Passes:** Ist alles bereit für `superpowers:finishing-a-development-branch`?
Welche Risiken bleiben, die der User vor Merge/Release kennen sollte?

**Konkrete Aufgabe:**

1. **Bundle-Budget (kritisch):**
   - `dist/custom-energy-flow-card.js` Bytes lesen oder `metrics/kpi-history.json` post
     `bundle_bytes`
   - ≤ 60 000 (60 kB)? Falls Überschreitung: `[FIX-PLAN]` mit `pnpm build:analyze`-Hint
   - Falls knapp (> 55 kB): `[USER-DECISION]` ob bewusst akzeptiert

2. **Build-Pipeline grün:**
   - `pnpm check` grün (Hauptagent hat es laufen lassen; Sub-Agent fragt nach Output
     oder vertraut Self-Review-Phase E)
   - `pnpm build:analyze` zeigt keine verbotenen Deps (alles außer Lit ist Bug)
   - `pnpm smoke` grün (ADR-0012 Pre-Release-Smoke-Test)

3. **Doku-Updates komplett pro Spec §7:**
   - CLAUDE.md aktualisiert wo nötig (Spec §7 spezifiziert konkrete Sektionen)?
   - `docs/architecture.md` §4 ADR-Tabelle aktualisiert wenn neuer ADR?
   - `docs/adr/README.md` Index aktualisiert wenn neuer ADR?
   - `README.md` Changelog wenn User-facing-Change?
   - Cross-References in betroffenen ADRs aktualisiert?

4. **HACS-Version-Bump-Check:**
   - `src/version.ts` oder analoge `CARD_VERSION`-Konstante: Wert geändert?
   - `hacs.json` (falls vorhanden): Version synchron?
   - **WICHTIG:** Diese Frage löst KEIN `[AUTO-FIX]` aus — Version-Bump ist out-of-scope
     für Code-Review (`finishing-a-development-branch` macht das). Befund ist
     `[USER-DECISION]` → „im finishing-a-development-branch-Skill Version-Bump einplanen".

5. **Rollback-Pfad:**
   - Gibt es einen Commit, ab dem ein Revert kompliziert wird (Schema-Migration,
     Datei-Umbenennung, Build-Pipeline-Bruch)?
   - `git log --oneline main..HEAD` durchsehen — komplexer Commit-Graph oder linear?
   - Falls riskanter Punkt: `[USER-DECISION]` mit Hinweis im User-Bundle

6. **Restrisiko-Top-3:**
   - Was könnte nach Release User-Schaden anrichten? (z. B. Render-Bruch bei alten Configs,
     Bundle-Bloat in Energy-Card-Slot, Editor-Crash bei seltenen Edge-Cases)
   - Pro Risiko: Auswirkung, Wahrscheinlichkeit, Minimierungs-Vorschlag

7. **Konsolidierungs-Status:**
   - Alle vorherigen Pässe (1–5) Fixes konsistent? Hat ein späterer Fix einen früheren
     teilweise revertiert? (`git log` und Diff prüfen)
   - Code ist „freistehend lesbar"? (Wer das Repo das erste Mal sieht, versteht die
     Implementation?)

**Verbindliche Lese-Quellen:**

- `metrics/kpi-history.json` post-Eintrag (`bundle_bytes`, `coverage_pct`, `violations`)
- Spec §7 (Doku-Pflicht)
- `git log --oneline main..HEAD`
- `package.json`, `hacs.json` (falls vorhanden), `src/version.ts` oder analog

**Beweisführung:** Gemeinsame Regeln. Bundle-Wert exakt zitieren, Doku-Updates per
`git diff` belegen.

**Finding-Kategorien:** Gemeinsame Regeln. HACS-Version-Bump ist IMMER `[USER-DECISION]`
(nie AUTO-FIX). Restrisiken sind oft `[USER-DECISION]` (informativ für User-Entscheidung
zu mergen). Doku-Gap ist meist `[AUTO-FIX]`.

**Format (max 700 Worte):**

## Release-Readiness-Checkliste
| Check | Status | Beleg |
| ----- | ------ | ----- |
| Bundle ≤ 60 kB | ✓ / ✗ | `metrics/kpi-history.json` $.[-1].bundle_bytes |
| pnpm check grün | ✓ | Self-Review Phase E |
| pnpm smoke grün | ✓ | ... |
| Doku Spec §7 komplett | ✓ / ✗ | git diff docs/ |

## HACS-Version-Bump
- [USER-DECISION] `CARD_VERSION` aktuell 0.4.0, neue Funktionalität würde 0.5.0 rechtfertigen — im finishing-Skill einplanen?

## Rollback-Pfad
- Linear, alle Commits revertierbar / Riskant ab Commit `<sha>` (Begründung)

## Restrisiko-Top-3
1. [USER-DECISION] Risiko ... — Auswirkung, Wahrscheinlichkeit, Minimierung
2. ...
3. ...

## Konsolidierungs-Status
- Iterations-Fixes konsistent? Ja / Nein (Beleg)
- Code freistehend lesbar? Ja / Nein (Beleg)

## Top-3 Code-Blocker
## Empfehlung
[ready for user — release-bereit / iterate (N auto-fixes offen) / blocker]

**Spezial-Hinweis:** Pass 6 ist der finale Pass. Wenn du „ready for user" empfiehlst,
sollte die User-Vorlage nur noch `[USER-DECISION]`-Findings + KPI-Delta + Playwright-
Artefakt-Pfade + LESSON-LEARNED-Liste enthalten. Wenn du noch `[AUTO-FIX]`/`[FIX-PLAN]`
siehst: „iterate" empfehlen, Hauptagent fixt und startet ggf. neue Iteration.
```

---

## Hauptagent-Verhalten (Iterations-Loop)

**Ablauf: SEQUENTIELL, nicht parallel.** Pässe NACHEINANDER, jeder gegen den durch vorherige Fixes verbesserten Code-Stand.

**Warum sequentiell:**

- Sub-Agent N+1 liest den durch Pass-N-Fixes verbesserten Code → sieht den Fix-Diff und prüft implizit, ob der Fix korrekt war (zweite Trust-but-Verify-Schicht).
- Sub-Agent N+1 muss keine Findings duplizieren, die N schon gemeldet hat → kann tiefer auf die nächste Brille gehen.
- Iterationen werden sichtbar konvergent — diagnostisches Signal für Stabilität.
- Kosten: ~2× langsamer Wall-Clock-Zeit, aber Token-Kosten nicht höher (jeder Pass liest eh die Files).

**Anti-Pattern:** Parallel-Dispatch aller Pässe gegen denselben Code-Stand. Erkennbar daran, dass Pässe Findings doppelt melden, weil keiner den Fix des anderen sieht.

**Konkreter Ablauf pro Iteration:**

1. **Vor Pass 1:** Self-Review (Phase A–H) durchführen, Findings dokumentieren.
2. **Pass-Loop (sequentiell):**
   1. Sub-Agent mit Fokus-Vektor-Prompt dispatchen.
   2. Findings als `TaskCreate`-Tasks anlegen, Kategorie + Pass-Nummer als Subject-Prefix (z. B. `[CR Pass 2: AUTO-FIX] grep findet doppelten Helper`).
   3. Pro `[AUTO-FIX]`-Task: **Trust-but-Verify** gegen echten Code (Sub-Agents irren auch!), dann Code aktualisieren, neuer Commit (`fix(scope): code-review pass N — kurzbeschreibung`).
   4. Pro `[FIX-PLAN]`-Task: NICHT inline fixen. Stattdessen als USER-Bundle-Kandidat sammeln; falls Hauptagent autonom-mode (Plan §3.6 #6: Hauptagent darf Mini-Sub-Plan starten): `superpowers:writing-plans` mit Findings als Input → Sub-Plan in `docs/plans/YYYY-MM-DD-codereview-fix-<plan-id>.md` → `superpowers:subagent-driven-development` zum Abarbeiten → Post-Snapshot neu erfassen.
   5. Pro `[USER-DECISION]`-Task: sammeln, NICHT alleine fixen — werden am Ende präsentiert.
   6. Pro `[VERIFY-NEEDED]`-Task: gegen echten Code prüfen. Wenn False-Positive: im Pass-Bericht als „resolved-to-not-a-bug" markieren (NICHT in `docs/lessons-learned.md` appenden — lehrt nichts).
   7. Pro `[LESSON-LEARNED]`-Task: an `docs/lessons-learned.md` appenden mit Eintrags-Format (Quelle, Beobachtet, Fix im Code, Lehre für nächstes Mal, Promotion-Kandidat, Status: offen).
   8. **Jetzt nächster Pass:** Sub-Agent mit nächstem Fokus-Vektor gegen den aktualisierten Code.
3. **Nach Pass 6 einer Iteration:**
   - Wenn `[FIX-PLAN]`-Tasks offen: mini-Sub-Plan-Workflow ausführen (siehe oben), dann Iteration N+1 starten.
   - Wenn nur `[USER-DECISION]` offen: Stop-Kriterium erreicht, ADR-Check + User-Vorlage.
   - Wenn nichts mehr offen außer `[LESSON-LEARNED]`: Stop, ADR-Check + User-Vorlage.

**Stop-Kriterien (Hard-Stop):**

- 2 Iterationen ohne neue `[AUTO-FIX]` oder `[FIX-PLAN]`
- Nur noch `[USER-DECISION]` offen
- Max 3 Iterationen — bei Überschreiten: `[USER-DECISION]` „Code-Review konvergiert nicht — was tun?", nie autonom über Budget hinaus

**Loop-Oszillations-Schutz:**

- Wenn Pass N+1 ein Finding aus Pass N WORTWÖRTLICH wiederholt: STOP und Fix prüfen — als `[OSCILLATION]` markieren, im User-Bundle erwähnen.
- Wenn Pass N+1 ein Finding aus Pass N **aus anderer Brille** identifiziert (Pass 1: Spec-Code-Drift, Pass 2: ADR-Bruch wegen demselben Wert): das ist KEINE Oszillation, sondern Bestätigung — Fix war richtig, der zweite Pass bestätigt aus anderer Linse.

---

## ADR-Check als expliziter Schritt vor User-Vorlage

Bevor der Hauptagent die finale User-Vorlage erstellt, scannt er alle Findings + neue `[LESSON-LEARNED]`-Einträge:

- [ ] Liste aller Findings durchgegangen — gibt es eine wiederkehrende Architektur-Entscheidung (z. B. „mehrfach mussten Type-Casts an HA-Boundary kommentiert werden — neues Pattern-Standard?")?
- [ ] Falls ja: ADR-Stub vorbereiten (`docs/adr/0000-template.md` kopieren nach `docs/adr/00XX-<topic>.md`)
- [ ] ADR-Stub als `[USER-DECISION]` ins User-Bundle aufnehmen
- [ ] Wenn LESSON-LEARNED den Promotion-Kandidaten `neuer ADR` benennt: ADR-Stub-Pfad in der LESSON-Eintrags-Zeile verlinken

---

## User-Vorlage am Ende

Nach Iterations-Loop bündelt der Hauptagent für den User:

1. **`[USER-DECISION]`-Findings** — gebündelt mit Optionen (A/B/C), pro Finding eine kurze Empfehlung des Hauptagenten falls eindeutig
2. **KPI-Delta-Tabelle** — aus `pnpm kpi:report`-Output, die wichtigsten Metriken (LOC, Bundle, Coverage, Cyclomatic-Max, Type-Safety-Counters)
3. **Playwright-Artefakt-Pfade** — `metrics/playwright/<plan-id>-pre.json` + `-post.json` (oder „Pass 5 skipped — Begründung")
4. **Neue `[LESSON-LEARNED]`-Einträge** — als Kurz-Titel-Liste mit Verweis auf `docs/lessons-learned.md`-Zeilen
5. **ADR-Vorschläge** (falls vorhanden) — Stub-Pfad + Kurz-Begründung

**Nicht im User-Bundle:** `[AUTO-FIX]`-Findings (sind schon gefixt), `[VERIFY-NEEDED]`-Findings (sind schon resolved), `[FIX-PLAN]`-Findings (sind via Sub-Plan abgearbeitet), Iterations-Internas.

---

## Iterations-Statistik (aus Erfahrung)

| Plan-Komplexität                       | Erwartete Pässe pro Iteration | Erwartete Iterationen | Erwartete Findings gesamt           |
| -------------------------------------- | ----------------------------- | --------------------- | ----------------------------------- |
| Klein (≤ 5 Plan-Tasks, ≤ 200 LOC)      | 2 (Pass 1 + 6)                | 1                     | 0–5 (überwiegend AUTO-FIX)          |
| Mittel (5–15 Plan-Tasks, 200–1000 LOC) | 4 (Pass 1 + 2 + 3 + 6)        | 1–2                   | 5–15 (Mix AUTO-FIX / USER-DECISION) |
| Groß (15+ Plan-Tasks, > 1000 LOC)      | 6 (alle)                      | 2                     | 10–30 (FIX-PLAN wahrscheinlich)     |
| Multi-Iteration (kritische v1.0-Phase) | 6                             | bis 3                 | 20–50+                              |

Bei > 3 Iterationen oder > 50 Findings: Implementation vermutlich nicht plan-aligned — STOP, Plan re-reviewen statt weiter zu iterieren (Verweis auf entsprechenden Stop-Hinweis in `plan-review-checklist.md`).
