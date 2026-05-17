# Claude Code – Projekt-Schnellreferenz

Dieses Dokument ist die kompakte Sicht für Claude Code beim Arbeiten an
`custom-energy-flow-card`. Vollständige Quelle der Wahrheit ist die Spec.

## Projekt

Lovelace-Custom-Card für Home Assistant zur Live-Visualisierung des
Energieflusses in Mehr-Quellen-Haushalten (N PV-Anlagen, N Akkus, N
Verbraucher, 1 Netz, 1 Haus). Greenfield, TypeScript, Lit 3, HACS-distribuiert.

## Tech-Stack (kompakt)

| Was                     | Version       | Rolle                            |
| ----------------------- | ------------- | -------------------------------- |
| **Node**                | ≥ 20 LTS      | Runtime                          |
| **pnpm**                | ≥ 9           | Package-Manager (verbindlich)    |
| **TypeScript**          | `^5.4` strict | Sprache                          |
| **Lit**                 | `^3.2`        | LitElement, einzige Runtime-Dep  |
| **Rollup**              | `^4.13`       | Single-File-Bundle               |
| **Vitest**              | `^1.4`        | Tests (node + happy-dom)         |
| **happy-dom**           | `^14.0`       | DOM-Env für Editor/Card-Tests    |
| **ESLint**              | `^8.57`       | Lint, Layer-Boundaries erzwingen |
| **Prettier**            | `^3.2`        | Formatter                        |
| **husky + lint-staged** | `^9 / ^15`    | Pre-Commit-Hook                  |

**Decorators:** `experimentalDecorators: true`. **Bundle-Budget:** 60 kB
minified. **Keine Runtime-Deps außer Lit.**

Volle Versionsliste: Spec §2.1.

## Dokumentations-Karte

| Was suchst du?                                   | Wo es liegt                                                                                                            |
| ------------------------------------------------ | ---------------------------------------------------------------------------------------------------------------------- |
| Was bauen wir & warum (Vollspec)                 | [`docs/specs/2026-05-10-custom-energy-flow-card-design.md`](./docs/specs/2026-05-10-custom-energy-flow-card-design.md) |
| Architektur-Überblick (lebendig)                 | [`docs/architecture.md`](./docs/architecture.md)                                                                       |
| Architektur-Entscheidungen mit Begründung        | [`docs/adr/`](./docs/adr/) (Index in `README.md`)                                                                      |
| Code-/Workflow-Konventionen                      | [`docs/conventions.md`](./docs/conventions.md)                                                                         |
| **Spec-Vorlage (neue Subspec schreiben)**        | [`docs/templates/spec-template.md`](./docs/templates/spec-template.md)                                                 |
| **Spec-Review-Checkliste** (vor Vorlage)         | [`docs/templates/spec-review-checklist.md`](./docs/templates/spec-review-checklist.md)                                 |
| **Plan-Vorlage (Implementation-Plan)**           | [`docs/templates/plan-template.md`](./docs/templates/plan-template.md)                                                 |
| **Plan-Review-Checkliste** (vor Vorlage)         | [`docs/templates/plan-review-checklist.md`](./docs/templates/plan-review-checklist.md)                                 |
| **Code-Review-Checkliste** (post-Implementation) | [`docs/templates/code-review-checklist.md`](./docs/templates/code-review-checklist.md)                                 |
| **KPI-Skript (Wartbarkeits-Snapshots)**          | [`scripts/kpi.mjs`](./scripts/kpi.mjs)                                                                                 |
| **KPI-Historie**                                 | [`metrics/kpi-history.json`](./metrics/kpi-history.json)                                                               |
| **Lessons-Learned-Hot-Pot**                      | [`docs/lessons-learned.md`](./docs/lessons-learned.md)                                                                 |
| Subspec: Verbraucher-Gruppierung & Layout        | [`docs/specs/2026-05-11-consumer-grouping-and-layout.md`](./docs/specs/2026-05-11-consumer-grouping-and-layout.md)     |
| Implementation-Pläne (Checkbox-Tasks)            | [`docs/plans/`](./docs/plans/) (per `superpowers:executing-plans` / `subagent-driven-development` abarbeiten)          |
| Beispiel-Configs (User)                          | `examples/2-pv-2-batt.yaml`                                                                                            |
| Sandbox (Renderer-Verifikation)                  | `examples/preview.html`                                                                                                |
| User-facing Doku                                 | `README.md` (im Repo-Root, wird mit v1.0 angelegt)                                                                     |

## Wo dokumentiere ich was?

| Wenn du …                                                                              | … dann                                                                                                                                  |
| -------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------- |
| eine **Architektur-Entscheidung** triffst (Lib-Wahl, Layer-Änderung, Algorithmus-Wahl) | neuer ADR in `docs/adr/00XX-kurz-titel.md` (Template: `0000-template.md`), Index in `docs/adr/README.md` + `architecture.md §4` updaten |
| eine **Spec-Änderung** machst                                                          | Spec-Header `Status` und `Datum` aktualisieren, Commit `docs(specs): …`                                                                 |
| eine **Konvention** ergänzt/änderst (Code-Stil, Workflow)                              | `docs/conventions.md`                                                                                                                   |
| den **Tech-Stack** änderst                                                             | dieses `CLAUDE.md` + ADR + Spec §2.1                                                                                                    |
| ein **User-facing Verhalten** änderst                                                  | `README.md` + ggf. Spec                                                                                                                 |
| einen **Bug** fixt                                                                     | Commit + Test, keine Doku-Pflicht                                                                                                       |
| eine **Erkenntnis aus Code-Review** dokumentierst                                      | `docs/lessons-learned.md` (append, NICHT Edit von Spec/Plan — siehe „Code-Review — Workflow" unten)                                     |
| einen **Lessons-Eintrag in Convention/ADR promotest**                                  | User-curiert: `conventions.md` / neuer ADR / `plan-template.md`; Lessons-Eintrag bekommt `PROMOTED`-Tag                                 |
| eine neue **Subspec** für ein Feature schreibst                                        | **Workflow zwingend** — siehe „Spec-Erstellung" unten; `docs/specs/YYYY-MM-DD-<topic>.md`                                               |
| eine Spec in eine **Multi-Step-Implementation** zerlegst                               | **Workflow zwingend** — siehe „Plan-Erstellung" unten; `docs/plans/YYYY-MM-DD-<topic>.md` (Checkbox-Liste)                              |

## Spec-Erstellung — Workflow (verbindlich)

Erfahrung: Specs scheitern selten an fehlender Architektur-Idee, fast immer an **zu wenig Repo-Discovery vor Schreiben** (~55 % aller Review-Findings). Deshalb dieser Workflow:

**Phase 1 — Repo-Discovery (VOR jedem Spec-Wort):**

1. `.eslintrc.cjs` + `vitest.config.ts` + `tsconfig.json` + `package.json` lesen
2. `docs/conventions.md` (§11 Anti-Patterns, §12 Doku-Pflicht), `docs/architecture.md` (Layer-Tabelle + ADR-Index) lesen
3. Goldstandard-Beispiel im Repo lesen: [`docs/specs/2026-05-12-aspect-ratio-redesign.md`](./docs/specs/2026-05-12-aspect-ratio-redesign.md) (kleinere Subspec) oder [`docs/specs/2026-05-11-consumer-grouping-and-layout.md`](./docs/specs/2026-05-11-consumer-grouping-and-layout.md) (mittlere Subspec)
4. Alle Source-Files lesen, die in der Spec genannt werden
5. `grep` für jede zu ändernde Funktion/Klasse — Aufrufer identifizieren
6. Sichtbare Ausgabe vor Spec-Schreiben: „Ich habe gelesen: [Liste]. Grep für `X` zeigt N Aufrufer."

**Phase 2 — Spec-Schreiben via `superpowers:brainstorming`-Skill:**

Skill aufrufen und ihm verbindlich mitgeben:

- **Spec-Inputs:** User-Idee + Phase-1-Discovery-Ergebnis
- **Struktur-Vorgabe:** [`docs/templates/spec-template.md`](./docs/templates/spec-template.md) als Pflicht-Skeleton (Verbots-Liste, Constraints, Layer-Berührung, Don't-Touch-Liste, Code-Reuse-Tabelle, Doku-Pflicht, Plan-Schritte)
- **Goldstandard-Beispiele:** `docs/specs/2026-05-12-aspect-ratio-redesign.md` (kleine Subspec), `docs/specs/2026-05-11-consumer-grouping-and-layout.md` (mittlere)
- **Output-Pfad:** `docs/specs/YYYY-MM-DD-<topic>.md` (NICHT `docs/superpowers/specs/…` — Repo-Konvention überschreibt Skill-Default)

Das Skill bringt Brainstorming-/Frageführungs-Expertise mit, unser Template bringt Repo-spezifische Pflicht-Sektionen. Beides ergänzt sich.

**Phase 3 — Self-Review (Hauptagent):**

Checkliste [`docs/templates/spec-review-checklist.md`](./docs/templates/spec-review-checklist.md) durcharbeiten — 8 Phasen (Discovery, Struktur, UX, Side-Effects, Conventions, ADRs, Code-Snippets, Plan). **Nicht „ich habe das überlegt"** — jeden Punkt namentlich abhaken oder begründen warum nicht zutreffend.

**Phase 4 — Iterative Sub-Agent-Reviews mit rotierenden Fokus-Vektoren (verbindlich, 3–5 Iterationen):**

Erfahrung: Self-Review wird mit jedem Durchgang oberflächlicher („Sunk-Cost-Bias"). **Ein identischer Skepsis-Prompt über mehrere Pässe leidet am gleichen Brillen-Bias** — Sub-Agent 2 mit derselben Brille findet dasselbe wie Sub-Agent 1. Lehre aus 2026-05-15-Spec: Pass 1 fand 8 Findings, Pass 2 fand 1, Pass 3 fand 0. Mit anderer Brille hätte Pass 3 noch was gefunden.

**Lösung:** **Rotierende Fokus-Vektoren** — jeder Pass legt eine andere Brille an. 5 Vektoren (vollständige Prompt-Templates in [`spec-review-checklist.md`](./docs/templates/spec-review-checklist.md) Phase I):

| Pass | Fokus                         | Brille                                                                          |
| ---- | ----------------------------- | ------------------------------------------------------------------------------- |
| 1    | Faktische Korrektheit         | Skepsis-Modus, Datei:Zeile-Quotes, Werte/Rechnungen verifizieren                |
| 2    | Auswirkungs-Suche             | Übersehene Side-Effects (Test-Drift, abgeleitete Werte, CSS, HA-Globals, Smoke) |
| 3    | Planer-Klarheit + Architektur | Layer-Klarheit, Helper-Reuse, Code-Duplikation, Datentrennung, TDD-Order        |
| 4    | Conventions + ADR-Abgleich    | conventions §1–§15, alle relevanten ADRs, ggf. neuer ADR nötig                  |
| 5    | Restrisiko + Konsolidierung   | Sektion-Querkonsistenz, vage Aussagen, Planer-Sackgassen, Iterations-Drift      |

**Pass-Anzahl je nach Spec-Größe:**

- Mini-Spec (< 200 Zeilen, 1–2 Files): Pässe 1 + 5 (2 Pässe)
- Klein (200–500 Zeilen, 2–4 Files): Pässe 1 + 3 + 5 (3 Pässe)
- Mittel (500–900 Zeilen, 4–8 Files): Pässe 1 + 2 + 4 + 5 (4 Pässe)
- Groß (> 900 Zeilen, > 8 Files): Alle 5 Pässe

**Ablauf: SEQUENTIELL, nicht parallel.** Pässe nacheinander, jeder gegen die aktualisierte Spec-Version. Sub-Agent N+1 sieht Fix-Diff (vN → vN+1) — implizite zweite Trust-but-Verify-Schicht + keine doppelten Findings. Parallel-Dispatch ist explizit verboten: erkennbar an doppelten Findings, weil keiner den Fix des anderen sieht.

**Loop pro Pass:**

1. **Sub-Agent-Pass mit passendem Fokus-Vektor-Prompt** (1:1 aus `spec-review-checklist.md` Phase I).
2. **Findings als Tasks anlegen** (`TaskCreate`): pro Finding eine Task, Kategorie + Pass-Nummer als `metadata`.
3. **Trust-but-Verify** pro `AUTO-FIX`-Task: Sub-Agent kann falsch liegen (siehe 2026-05-15-Spec Pass-1 F6 = False-Positive). Hauptagent prüft jedes Finding gegen echten Code, BEVOR er fixt.
4. **Spec aktualisieren**, Status hochzählen (`vN+1 (post-subagent-K-FOKUSNAME)`).
5. **ERST DANN** nächsten Pass starten (sequentiell — Sub-Agent N+1 muss die geupdatete Spec sehen).

**Stop-Kriterien:**

- Sub-Agent meldet „ready for user"
- Zwei aufeinanderfolgende Pässe ohne neue Findings
- Nur noch `USER-DECISION` offen
- Max 5 Pässe erreicht

**Loop-Oszillations-Schutz (verschärft):**

- Pass N+1 WORTWÖRTLICH wiederholtes Finding aus Pass N → STOP und Fix prüfen.
- Pass N+1 mit Finding aus anderer Brille zum gleichen Code-Punkt: **KEINE Oszillation**, sondern Bestätigung („zwei Linsen sehen dasselbe Problem"). Fix war richtig — ggf. Spec-Doku braucht Cross-Reference.

**Bei User-Vorlage:** Nur die `USER-DECISION`-Findings präsentieren (gebündelt mit Optionen). Auto-Fix-Schritte und Iterations-Internas sind kein User-Anliegen.

**Versionierung:** Status-Header `v1 (proposed, ready for review)`. Pro Sub-Agent-Iteration hochzählen mit Fokus-Name (`v2 (post-subagent-1-faktisch)`, `v3 (post-subagent-2-auswirkung)`, …).

## Plan-Erstellung — Workflow (verbindlich, analog zu Spec-Workflow)

Erfahrung aus v1.0-Plan-Iterationen (7 Pässe, 56+ Findings): Pläne scheitern an **mehr Punkten als Specs** — neben Repo-Drift kommen Spec-Plan-Drift, Layer-Boundary-Edits, Framework-Quirks (Lit-css-Tag, hasChanged-this-Binding, foreignObject-namespace), Build-Pipeline-Details und TDD-Order hinzu.

**Phase 1 — Repo-Discovery + Spec-Reading (VOR jedem Plan-Wort):**

1. **Spec vollständig lesen**, alle Sektionen erfassen → Mapping-Tabelle vorbereiten (welche Spec-§ → welcher Plan-Task)
2. `.eslintrc.cjs`, `vitest.config.ts`, `tsconfig.json` + `tsconfig.preview.json`, `package.json` lesen
3. `docs/conventions.md` (§11 Anti-Patterns, §12 Doku-Pflicht, §13 Dependencies) lesen
4. `docs/architecture.md` (Layer-Tabelle + ADR-Index) lesen
5. Goldstandard-Plan lesen: [`docs/plans/2026-05-12-aspect-ratio-redesign.md`](./docs/plans/2026-05-12-aspect-ratio-redesign.md) (1 Iteration nötig)
6. Alle Source-Files lesen, die in Plan-Tasks angefasst werden
7. `grep` für jede zu ändernde Funktion — Aufrufer identifizieren

Sichtbare Ausgabe vor Plan-Schreiben: „Spec-§ → Plan-Task Mapping: §0.X → Task Y, §3.X → Task Z. Grep für `Z` zeigt N Aufrufer."

**Phase 2 — Plan-Schreiben via `superpowers:writing-plans`-Skill:**

Skill aufrufen und ihm verbindlich mitgeben:

- **Spec-Pfad:** zugehörige Subspec aus `docs/specs/` (Single-Source aller Constraints)
- **Struktur-Vorgabe:** [`docs/templates/plan-template.md`](./docs/templates/plan-template.md) als Pflicht-Skeleton (Standing-Requirement-Block, Elements-NICHT-anfassen, File Structure inkl. Build-Pipeline-Files, Phase-Vorlagen mit Commit-Templates, Task-Skeletons mit TDD-First-Pattern, STOP-Conditions, Self-Review-Checkliste)
- **Discovery-Pflichten:** [`docs/templates/plan-review-checklist.md`](./docs/templates/plan-review-checklist.md) Phase A — Skill MUSS Source-Files lesen + Spec-§-→-Plan-Task-Mapping erstellen
- **Goldstandard-Beispiele:** `docs/plans/2026-05-12-aspect-ratio-redesign.md` (1 Iteration nötig — Referenz für Task-Granularität)
- **Output-Pfad:** `docs/plans/YYYY-MM-DD-<topic>.md`

Das Skill bringt Plan-Schreib-Expertise mit (Task-Granularität, Phase-Struktur, Checkbox-Tasks), unser Template bringt Repo-spezifische Pflicht-Sektionen + Lessons aus früheren Iterationen. Beides ergänzt sich.

**Phase 3 — Self-Review (Hauptagent):**

Checkliste [`docs/templates/plan-review-checklist.md`](./docs/templates/plan-review-checklist.md) durcharbeiten — 12 Phasen (A–L), Schwerpunkte: **Spec-Plan-Coverage**, ADR-Compliance pro Task, Framework-Quirks (Lit), Build-Pipeline-Details, TDD-Order.

**Phase 4 — Iterative Sub-Agent-Reviews mit rotierenden Fokus-Vektoren (verbindlich, 3–5 Iterationen):**

Analog zum Spec-Workflow, aber Plan-spezifische Fokus-Vektoren (vollständige Prompt-Templates in [`plan-review-checklist.md`](./docs/templates/plan-review-checklist.md) Phase Z):

| Pass | Fokus                                              | Brille                                                                                                                                                     |
| ---- | -------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1    | Spec-Plan-Coverage                                 | Mapping Spec § → Plan-Task; Gaps; Detail-Inkonsistenzen                                                                                                    |
| 2    | Plan-Interne Konsistenz + Architektur (+ADRs/Conv) | Widersprüche, Architektur, Datentrennung, Code-Reuse, Tests, conventions §1–§11. **Auch wenn Spec schon gecheckt — Plan kann eigene Verstöße einbringen.** |
| 3    | UX + Design-Bruch (+UX-ADRs/Conv §15)              | Spec §9 UX-Coverage in Tasks, Sprache, A11y, Theming, Mode-Verhalten, Backwards-Compat                                                                     |
| 4    | Task-Granularität + Agent-Freiraum                 | Atomarität, Detail-Klarheit, Agent-Freiraum markiert, STOP-Conditions, Verifikations-Schritte                                                              |
| 5    | Pro-Task-Konfidenz + Restrisiko                    | Pro-Task-Bewertung (high/medium/low), größtes App-Risiko, Minimierungs-Strategien, Rollback-Pfad                                                           |

**Pass-Anzahl je nach Plan-Komplexität:**

- Klein (3–5 Tasks): Pässe 1 + 5 (2 Pässe)
- Mittel (15–25 Tasks): Pässe 1 + 2 + 5 (3 Pässe)
- Groß (25+ Tasks): Pässe 1 + 2 + 4 + 5 (4 Pässe)
- v1.0-artig (mehrtägig): Alle 5 Pässe

**Ablauf: SEQUENTIELL, nicht parallel.** Pässe nacheinander, jeder gegen die aktualisierte Plan-Version. Analog zur Spec-Phase 4 — Sub-Agent N+1 muss den Fix-Diff (vN → vN+1) sehen, sonst Findings-Doppelung statt Konvergenz.

**Loop pro Pass:** identisch zur Spec-Phase 4 — Sub-Agent dispatchen, warten auf Abschluss, Findings als Tasks anlegen, Trust-but-Verify, Plan aktualisieren, **erst dann** nächsten Pass.

**Loop-Oszillations-Schutz:** WORTWÖRTLICH wiederholtes Finding → STOP; gleicher Code-Punkt aus anderer Brille → Bestätigung, keine Oszillation.

**Bei User-Vorlage:** Nur `USER-DECISION`-Findings + finale Pro-Task-Konfidenz-Bewertung aus Pass 5 präsentieren.

**Bei > 5 Pässen** → Plan ist vermutlich noch nicht spec-aligned, STOP und Spec re-reviewen statt weiter zu iterieren.

**Versionierung:** Status-Header analog Spec — `v1 (proposed, ready for review)`, pro Iteration hochzählen mit Fokus-Name.

## Implementation — Workflow (verbindlich)

Erfahrung aus Subagent-Driven-Implementation: Wenn Tasks **inkrementell** als Todos angelegt werden (jeweils erst die aktuelle Phase), verliert der User Sicht auf die Restarbeit — wieviele Phasen noch kommen, ob alles auf der Liste ist. Skill `superpowers:subagent-driven-development` sagt explizit: „**Read plan, extract all tasks with full text, note context, create TodoWrite**" — alle upfront.

**Phase 0 — Pre-Plan-Snapshot (verbindlich, vor erstem TaskCreate):**

Vor dem TaskCreate-Batch zur Plan-Abarbeitung erfasst der Hauptagent einen KPI-Snapshot und ein Playwright-Capture als Baseline für den späteren Code-Review (siehe „Code-Review — Workflow (verbindlich)" Phase 1 für Detail-Pattern):

1. `pnpm check && pnpm build && pnpm test:coverage` (Voraussetzungen für Coverage- und Bundle-Werte)
2. `pnpm kpi:snapshot --label pre-<plan-id> --phase pre` (appendet an `metrics/kpi-history.json`)
3. Playwright-Capture-Stufe-1 mit Trap-Pattern (Artefakt explizit nach `metrics/playwright/<plan-id>-pre.json`). **Bundle-Hash + Build-Timestamp** des aktuell geladenen `dist/custom-energy-flow-card.js` im `_meta.card_bundle_built`-Feld mitloggen (Lesson 2026-05-15: Playwright lädt das `dist/`-Bundle — wenn `dist/` veraltet ist, capturt der Pre-Snapshot eine ältere Render-Version als der aktuelle Source-Stand; mit Bundle-Hash wird Drift sichtbar)
4. Sichtbarer Output: „Pre-Snapshot pre-<plan-id> erfasst. KPI-Baseline: <files>, <loc>, …"

Erst dann Phase 1. **Ausnahme:** Bei Implementation des Code-Review-Workflows selbst (chicken-and-egg — `pnpm kpi:snapshot` existiert noch nicht) ist diese Phase OPTIONAL und im Plan dokumentiert.

**Phase 1 — Todo-Liste aus Plan upfront aufbauen:**

Bevor der erste Implementations-Subagent gestartet wird:

1. Plan einmal komplett lesen, **alle Plan-Tasks** (nicht nur Phasen-Header) identifizieren
2. **1 TaskCreate pro Plan-Task** (NICHT pro Phase!) als Batch anlegen — in einem Message-Block mit mehreren parallelen TaskCreate-Calls. Phasen sind nur Gruppierungs-Header im Plan, keine eigene Task. `superpowers:subagent-driven-development` ist hier explizit: „**Read plan, extract all tasks with full text, note context, create TodoWrite**" — alle Plan-Tasks upfront, 1:1
3. Sichtbares Format z. B. `[IMPL] Task N.M — Kurzbeschreibung` als Subject (N = Phase, M = Task innerhalb der Phase)
4. User sieht: „N Tasks warten, X done, Y in_progress" mit voller Plan-Granularität — Restarbeit pro Task sichtbar, nicht nur pro Phase

**Phase 2 — Abarbeitung:**

Tasks werden nach Plan-Reihenfolge abgearbeitet. **Pro Task ein frischer Subagent** (Standard aus `superpowers:subagent-driven-development` — saubere Kontext-Isolation, kein Cross-Task-Bleed):

- Eine TaskUpdate auf `in_progress`
- **Neuen Subagent dispatchen** (mit Plan-Task-Text + Kontext) — KEIN Wiederverwenden eines früheren Subagents über mehrere Tasks hinweg (z. B. via `SendMessage` an alten Agent), auch nicht „kurz für den nächsten kleinen Task"
- Two-Stage-Review (Spec-Compliance + Code-Quality) oder Inline-Review bei klar überschaubaren Tasks
- TaskUpdate auf `completed`

**Phase 3 — Liste anpassen wenn nötig:**

Wenn beim Abarbeiten **neue Tasks auftauchen** (z. B. Bundle-Budget-Verletzung in Phase 6 brauchte Whitespace-Trim-Commit, was im Plan nicht stand): **mit TaskCreate ergänzen**, nicht heimlich nebenbei machen.

Wenn ein Task **nicht mehr nötig** ist (z. B. eine Verifikation, die durch einen anderen Schritt schon abgedeckt wurde): mit `TaskUpdate status: deleted` entfernen, nicht stillschweigend ignorieren.

**Phase 5 — Post-Plan-Snapshot + Code-Review-Trigger (verbindlich, vor finishing-a-development-branch):**

Nach letztem TaskUpdate auf `completed` und `pnpm check` + `pnpm smoke` grün:

1. `pnpm build && pnpm test:coverage`
2. `pnpm kpi:snapshot --label post-<plan-id> --phase post`
3. Playwright-Capture-Stufe-1 (post) — Artefakt nach `metrics/playwright/<plan-id>-post.json`
4. Code-Review-Workflow starten (siehe „Code-Review — Workflow (verbindlich)")
5. Erst nach Code-Review-Stop-Kriterium: Phase 6.

**Phase 6 — Abschluss:**

Nach erfolgreichem Code-Review: `superpowers:finishing-a-development-branch` für strukturierte Release-Optionen (Merge / Tag / PR / HACS-Bump). NICHT autonom mergen ohne User-Consent.

**Anti-Patterns (verboten):**

- ❌ Inkrementell Todos anlegen („nächste Phase erst nach Abschluss der aktuellen"). Versteckt Restarbeit.
- ❌ Phasen-Bündel statt Plan-Tasks als TaskCreate anlegen (z. B. „Phase 3 — Engine umbauen" als 1 Task statt der 5 Plan-Tasks darin). Versteckt Sub-Task-Granularität, User sieht Restarbeit nur grob.
- ❌ Tasks im Hinterkopf führen statt als TaskCreate. Verliert Sichtbarkeit.
- ❌ Neue notwendige Arbeit ohne TaskCreate machen („mal eben fixen"). Versteckt Scope-Drift.
- ❌ Einen Subagent über mehrere Tasks wiederverwenden (`SendMessage` an alten Agent für „den nächsten kleinen Task"). Bricht die Kontext-Isolation, die `superpowers:subagent-driven-development` als Standard vorsieht — verschmutzt Folge-Task mit altem Kontext, erschwert Reviews und produziert versehentliche Kopplungen.
- ❌ Implementation auf `main` ohne User-Consent (siehe `superpowers:using-git-worktrees`).
- ❌ Phase 0 (Pre-Snapshot) überspringen — Code-Review-Pass 3 hat dann keine Delta-Baseline.
- ❌ Phase 5 (Post-Snapshot + Code-Review) überspringen und direkt zu `finishing-a-development-branch` — Quality-Gate-Bypass.

## Code-Review — Workflow (verbindlich)

Erfahrung: Spec/Plan-Review (Workflows oben) fängt Architektur-Probleme **vor** Implementation. Smoke-Test (ADR-0012) fängt Class-Load-Crashes **vor** Release. Zwischen Implementation und Release fehlte aber ein systematischer Pass für Code-Qualitäts-Drift, Wartbarkeits-KPI-Trends und funktionale UI-Verifikation. Dieser Workflow schließt die Lücke (ADR-0021).

**Phase 1 — Pre-Snapshot (vor Implementation, identisch zu „Implementation — Workflow" Phase 0):**

1. Voraussetzungen herstellen: `pnpm check && pnpm build && pnpm test:coverage`
2. `pnpm kpi:snapshot --label pre-<plan-id> --phase pre` (appendet an `metrics/kpi-history.json`)
3. Playwright-Capture-Stufe-1 mit Trap-Pattern:

   ```bash
   PREVIEW_PID=$(pnpm preview > /tmp/preview.log 2>&1 & echo $!)
   trap "kill $PREVIEW_PID 2>/dev/null" EXIT INT TERM
   # MCP-Tools: browser_navigate → browser_wait_for "ha-card" →
   # browser_console_messages → browser_snapshot → browser_evaluate
   # Hauptagent schreibt Artefakt explizit nach metrics/playwright/<plan-id>-pre.json
   # (NICHT auf MCP-Default-Pfad .playwright-mcp/ verlassen — der ist gitignored)
   kill $PREVIEW_PID
   ```

**Phase 2 — Implementation:** unverändert, siehe „Implementation — Workflow (verbindlich)" Phasen 1–3.

**Phase 3 — Post-Snapshot (nach letztem Implementation-Task):** analog Phase 1, mit `--label post-<plan-id> --phase post` und Artefakt-Pfad `metrics/playwright/<plan-id>-post.json`.

**Phase 4 — Self-Review + 6-Pass-Iteration:**

- Self-Review-Phasen A–H aus [`docs/templates/code-review-checklist.md`](./docs/templates/code-review-checklist.md) durcharbeiten (Hauptagent, namentlich abhaken).
- Danach 6 Sub-Agent-Pässe **sequentiell** mit rotierenden Fokus-Vektoren (vollständige Prompt-Templates in der Checkliste Phase Z):

  | Pass | Fokus                              | Was prüft die Brille                                                                                          |
  | ---- | ---------------------------------- | ------------------------------------------------------------------------------------------------------------- |
  | 1    | Spec/Plan ↔ Code-Coverage          | Spec §3 + Plan-Tasks 1:1 im Code? Drift?                                                                      |
  | 2    | Architektur + ADRs + Conventions   | Layer-Boundaries (Doppel-Check), Anti-Patterns conv §11, ADR-Compliance, Imports-Reihenfolge, Comments-Policy |
  | 3    | Wartbarkeits-KPIs (skript-basiert) | `pnpm kpi:report` Delta pre→post; Threshold-Verstöße; Type-Safety-Drift                                       |
  | 4    | Test-Tiefe + TDD-Compliance        | Edge-Cases, TDD-Order via `git log --reverse`, `it.each`, Coverage-Lücken                                     |
  | 5    | UX + Funktional via Playwright     | Hauptagent: MCP-Capture (Stufe-1); Sub-Agent: Artefakt-Analyse + Spec §9                                      |
  | 6    | Release-Readiness + Restrisiko     | Bundle ≤ 60 kB, `pnpm smoke`, `pnpm check`, Doku-Updates komplett, HACS-Bump (USER-DECISION), Rollback-Pfad   |

- **Pflicht-Pässe je Plan-Komplexität:**
  - Klein (≤ 5 Tasks): Pässe 1 + 6 (2 Pässe)
  - Mittel (5–15 Tasks): Pässe 1 + 2 + 3 + 6 (4 Pässe)
  - Groß (15+ Tasks): alle 6 Pässe
  - Multi-Iteration: bis 3 Iterationen × 6 = 18 Sub-Agent-Runs

- **Ablauf: SEQUENTIELL, nicht parallel.** Analog zu Spec/Plan-Workflow — Sub-Agent N+1 muss die durch Pass N gefixten Findings sehen. Parallel-Dispatch erzeugt doppelte Findings, weil kein Pass den Fix des anderen sieht.

- **Loop pro Pass:**
  1. Sub-Agent dispatchen mit Fokus-Vektor-Prompt aus `code-review-checklist.md` Phase Z.
  2. Findings als Tasks anlegen (`TaskCreate`): Kategorie + Pass-Nummer als Metadata. Kategorien: `AUTO-FIX` / `FIX-PLAN` / `USER-DECISION` / `VERIFY-NEEDED` / `LESSON-LEARNED`.
  3. **Trust-but-Verify** pro `AUTO-FIX`: Hauptagent prüft jedes Finding gegen echten Code, BEVOR er fixt. Sub-Agent kann falsch liegen (False-Positive).
  4. `AUTO-FIX` inline umsetzen. `FIX-PLAN` sammeln für mini-Sub-Plan nach Pass 6. `USER-DECISION` für User-Vorlage sammeln. `VERIFY-NEEDED` prüfen (z. B. Coverage-Daten fehlen). `LESSON-LEARNED` an `docs/lessons-learned.md` appenden.
  5. **ERST DANN** nächsten Pass starten.

- **Spec/Plan-Dokumente bleiben unangetastet** — retroaktive Edits an `docs/specs/` oder `docs/plans/` wären Revisionismus. Lessons fließen ausschließlich in `docs/lessons-learned.md` (User-curiert, Promotion zu Convention/ADR erfolgt separat mit `PROMOTED`-Tag).

- Nach allen Pässen einer Iteration: gibt es `FIX-PLAN`-Findings? → mini-Sub-Plan via `superpowers:writing-plans` + `subagent-driven-development` umsetzen, danach **neuen** Post-Snapshot ziehen (überschreibt vorigen), dann Iteration N+1.

- **Stop-Kriterien:**
  - Zwei aufeinanderfolgende Iterationen ohne neue `AUTO-FIX`/`FIX-PLAN`-Findings
  - Nur noch `USER-DECISION` offen
  - Max 3 Iterationen erreicht

**Phase 5 — ADR-Check + User-Vorlage:**

- Hauptagent scannt Findings + neue `LESSON-LEARNED`-Einträge: wiederkehrende Architektur-Entscheidung erkennbar? Falls ja: ADR-Stub vorbereiten und als `USER-DECISION` präsentieren.
- User-Vorlage bündelt: `USER-DECISION`-Findings (mit Optionen) + KPI-Delta-Tabelle aus `pnpm kpi:report` + Playwright-Artefakt-Pfade + Titel der neuen Lessons + ADR-Vorschläge.
- User entscheidet pro `USER-DECISION` → Hauptagent setzt Entscheidungen um, ggf. weitere `AUTO-FIX`, KPI-Snapshot ggf. erneut überschreiben.

**Phase 6 — `finishing-a-development-branch`** (existierender Skill): strukturierte Release-Optionen (Merge / Tag / PR / HACS-Bump). NICHT autonom mergen.

**Anti-Patterns (verboten):**

- ❌ Parallel-Dispatch der Sub-Agent-Pässe (analog Spec/Plan: sequentiell-Pflicht — doppelte Findings statt Konvergenz).
- ❌ `FIX-PLAN`-Findings inline fixen ohne mini-Sub-Plan-Disziplin („mal eben refactoren") — versteckt Scope-Drift, gleicher Fehler wie in Implementation-Workflow.
- ❌ Edits an `docs/specs/` oder `docs/plans/` als „Lesson-Update" — Spec/Plan sind historische Artefakte, Lessons gehören in `docs/lessons-learned.md`.
- ❌ Pass 5 ohne Hauptagent-MCP-Capture — Sub-Agent hat keinen MCP-Browser-Zugriff. Ohne Pre-/Post-Artefakte ist Pass 5 nicht durchführbar (dann explizit als „skipped" markieren, nicht stillschweigend überspringen).
- ❌ Playwright-Output auf `.playwright-mcp/`-Default-Pfad verlassen — Verzeichnis ist gitignored, Artefakte verschwinden. Pfad immer explizit nach `metrics/playwright/<plan-id>-<phase>.json` setzen.
- ❌ KPI-Skript laufen lassen ohne vorheriges `pnpm test:coverage` — `coverage-summary.json` fehlt dann, Snapshot bekommt `coverage_pct: null` und Pass 4 hat keine echte Datengrundlage.

## Module-Layer (Kurzform)

```
util/    ←  format-power, resolve-color, read-sensor, svg-path, memo  (single source)
i18n/    ←  alle User-Strings (DE)
engine/  ←  pure functions, Energie-Bilanz, HA-frei
config/  ←  Schema-Validation, buildSystemState (HA → State)
render/  ←  SVG, CSS-Animation (Lit-Templates)
ha/      ←  HA-Event-Helfer, Type-Skelett
card.ts  ←  LitElement, ≤ 200 LOC, delegiert
editor.ts←  Lovelace-GUI-Editor (eigener LitElement)
```

Layer-Imports sind via ESLint `no-restricted-paths` erzwungen
(siehe ADR-0009). Verstoß bricht CI.

Volle Modulkarte: `architecture.md §2` und Spec §2.2.

## Kritische Regeln

1. **Engine = pure functions.** Keine Klassen, kein State, kein DOM, keine
   Side-Effects. (ADR-0004, Spec §11.1)
2. **Keine Code-Doppelungen.** `util/`-Modul ist Single-Source. Wer
   `formatPowerW` außerhalb von `util/` re-implementiert: Bug. (ADR-0010, Spec §11.5)
3. **`card.ts` ≤ 200 LOC.** Delegiert vollständig, baut keine SVG-Strings,
   parst keine Sensoren direkt. (Spec §2.2)
4. **Keine `any` ohne Begründungs-Kommentar.** TypeScript strict + lint-enforced.
   (Spec §11.2, conventions.md §1.2)
5. **Berechnung in `willUpdate`, niemals `render`.** Lit-Lifecycle. (Spec §5.7)
6. **Custom `hasChanged` für `hass`-Property.** Sonst re-rendert die Card auf
   jedes globale State-Update. (Spec §5.7)
7. **Crash-Resilient.** `willUpdate` mit try/catch + Fallback-UI. Engine wirft
   nicht bei Daten-Inkonsistenzen — nur Warnings. (Spec §5.10, §6.1 in conventions)
8. **Strings aus `i18n/`.** Niemals user-facing Strings hardcoded in
   Templates. Caller holen `T = resolveT(lang)` und reichen `T` durch.
   (Spec §11.5, Subspec 2026-05-15-en-i18n, ADR-0023)
9. **Tests-driven für Engine.** Edge-Cases zuerst, Implementation danach.
   ≥ 90 % Coverage. (Spec §11.3)
10. **HA-Custom-Elements (`ha-form`, `ha-entity-picker`) NICHT importieren.**
    Sind globale Custom Elements; nur Type-Deklaration in `ha/ha-globals.d.ts`.
    (Spec §6.4.2)

Volle Anti-Pattern-Liste: Spec §11.5, conventions.md §11.

## Häufige Befehle

```bash
pnpm install            # initial setup
pnpm dev                # rollup watch-mode
pnpm test               # vitest run
pnpm test:watch         # vitest watch
pnpm test:coverage      # mit coverage report
pnpm lint               # eslint
pnpm typecheck          # tsc --noEmit
pnpm check              # alles zusammen (CI-Gate)
pnpm build              # production bundle in dist/
pnpm build:analyze      # mit rollup-plugin-visualizer
pnpm preview            # Sandbox in Browser öffnen
```

## Workflow

1. **Vor jeder Implementation:** lies die relevante Spec-Sektion
2. **Entscheidung mit langfristiger Bindung:** ADR-0000-Template kopieren,
   neuen ADR anlegen, Index updaten
3. **TDD für Engine/Util/Config:** Test zuerst, Code danach
4. **Pre-Commit-Hook** läuft automatisch (lint + format)
5. **Vor `git push`:** `pnpm check` lokal grün
6. **Auf `main` mergen:** nur wenn CI grün

## Out-of-Scope (v1.0)

- Energie-Tagesstatistiken (HA-Energy-Cards)
- Phasen-aufgelöste Anzeige (L1/L2/L3)
- Dynamische Stromtarif-Anzeige
- Internationalisierung (Strings auf Deutsch in `i18n/de.ts`, v1.x-Kandidat)

## Bei Unklarheit

- Zuerst **Spec** in `docs/specs/`
- Dann **ADRs** für „warum so?"-Fragen
- Dann **conventions.md** für „wie schreiben wir das?"-Fragen
- Dann nachfragen
