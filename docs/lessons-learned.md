# Lessons Learned

> **Append-only Hot-Pot** für Code-Review-Erkenntnisse. Jeder Eintrag wird vom Eigentümer (@griebner) curiert: in `conventions.md` / `architecture.md` übernehmen, neuer ADR, Plan-/Spec-Template-Update, oder verwerfen.
>
> **Promotierte Einträge bekommen ein `PROMOTED`-Tag** statt gelöscht zu werden — Herkunft bleibt traceable für spätere Archäologie (z. B. "wann haben wir bemerkt, dass `unsafeCSS` für raw-CSS-Strings nötig ist?").
>
> **Spec- und Plan-Dokumente werden retroaktiv NIE angefasst** — sie sind historisches Protokoll der Entscheidungen vor Implementation. Erkenntnisse aus Implementation und Code-Review fließen in diese Datei, nicht in Spec/Plan-Files.
>
> **Eintrags-Format:**
>
> ```markdown
> ### LESSON: <Kurz-Titel> (YYYY-MM-DD, Plan: <plan-id>)
>
> **Quelle:** Code-Review Pass <N>, Finding <ID>
> **Beobachtet:** `<datei:zeile>` — was passierte
> **Fix im Code:** kurz beschreiben (oder Verweis auf Commit-SHA)
> **Lehre für nächstes Mal:** was sollte bei künftigen Spec/Plan/Implementation berücksichtigt werden?
> **Promotion-Kandidat:** `conventions.md §X` / neuer ADR / `plan-template.md` Phase Y / verwerfen
> **Status:** offen | PROMOTED zu <ziel> | VERWORFEN (mit Grund)
> ```

---

## Pro Plan-Datum gruppiert

### Plan 2026-05-15-icon-positionierung-und-kreis-skalierung

#### LESSON: Plan-Step-5-Test-Erwartungen mathematisch validieren (2026-05-15, Plan: 2026-05-15-icon-positionierung)

**Quelle:** Code-Review Pass 4 + Implementation Task 2.2 + 2.3 (DONE_WITH_CONCERNS)
**Beobachtet:** Plan-Step-5 (icon.test.ts Spacing-Test) erwartete `FAIL`, aber Plan-Step-4-Code hardcodiert die Soll-Werte (`24, -12, 20, 14`) als Input. Test ist mathematisch immer PASS (10.2 ≥ 8). Ähnlich Plan-Step-5 (layout.test.ts Distanz-Check) erwartete N=2..7-FAIL, aber reale Distanzen so groß (Consumer x>740 vs PV/Akku x=250/560 ≈ 496) dass Marginalität (36 vs 38) nicht greift.
**Fix im Code:** Tests sind inhaltlich korrekt (Geometrie-Anchor + Regression-Schutz). Implementation 1:1 nach Plan-Step-4. Plan-Step-5-Erwartung ist Plan-interne Doku-Inkonsistenz.
**Lehre für nächstes Mal:** Plan-Review Pass 1 (faktisch) sollte Plan-Step-4-Code-Snippets mathematisch gegen Plan-Step-5-Erwartungen validieren. Bei "Test FAIL erwartet"-Pattern: prüfen ob hardcoded-Soll-Werte den FAIL überhaupt erreichen können oder ob die Test-Doku falsch ist.
**Promotion-Kandidat:** `plan-review-checklist.md` Phase Z Pass 1 (faktische Korrektheit): Bullet "Plan-Step-5-Erwartungen mathematisch gegen Plan-Step-4-Code validieren — bei `Test FAIL erwartet`-Pattern: Input-Werte gegen Assertion durchrechnen"
**Status:** PROMOTED zu `docs/templates/plan-review-checklist.md` Pass-1-Prompt Punkt 5 (2026-05-15)

#### LESSON: Plan-Referenz auf nicht-existente Test-File (2026-05-15, Plan: 2026-05-15-icon-positionierung)

**Quelle:** Implementation Task 3.3 (DONE_WITH_CONCERNS)
**Beobachtet:** Plan-Step-3 in Task 3.3 verwies auf `home-ring.test.ts` (Sanity-Check gegen RING_RADIUS-Namens-Kollision). File existiert im Repo nicht. Sub-Agent hat Sanity-Goal stattdessen via `git diff src/render/home-ring.ts` (leer) erbracht — funktional äquivalent.
**Fix im Code:** Kein Code-Fix; Verifikation via git-diff statt Test-Run.
**Lehre für nächstes Mal:** Plan-Review sollte Datei-Referenzen via `ls`/`find` belegen. Bei "Sanity-Check via Test"-Pattern: Test-File-Existenz vorher verifizieren.
**Promotion-Kandidat:** `plan-review-checklist.md` Phase A (Repo-Discovery): Bullet "Alle Plan-referenzierte Test-Files via `find src/ -name '*.test.ts'` verifizieren bevor Plan angenommen wird"
**Status:** PROMOTED zu `docs/templates/plan-review-checklist.md` Phase A letzter Bullet (2026-05-15)

#### LESSON: Plan-Bundle-Schwelle vs CI-Gate-Wert (2026-05-15, Plan: 2026-05-15-icon-positionierung)

**Quelle:** Code-Review Pass 3 + Implementation Task 4.3 (DONE_WITH_CONCERNS)
**Beobachtet:** Plan §4.3 Step 2 sagt "Größe < 60 KB" (interpretierbar als 60.000 oder 61.440 bytes). Tatsächlicher CI-Gate-Wert ist `scripts/kpi.mjs:29 BUNDLE_BUDGET_BYTES = 60 * 1024 = 61440` (= 60 KiB). Bundle ist 61427 bytes — unter Gate (13 bytes Headroom), aber über 60.000 (decimal).
**Fix im Code:** Kein Fix; Klärung war ausreichend.
**Lehre für nächstes Mal:** Plan-Templates sollten Bundle-Werte mit expliziter Einheit (KiB vs kB) und Verweis auf den CI-Gate-Pfad (`scripts/kpi.mjs:29`) zitieren statt "60 KB" ambivalent.
**Promotion-Kandidat:** `plan-template.md` Phase Verifikations-Pipeline: Bundle-Budget-Bullet auf `BUNDLE_BUDGET_BYTES (scripts/kpi.mjs:29)` referenzieren statt freier "60 kB"-Formulierung
**Status:** PROMOTED zu `docs/templates/plan-template.md` Task N.6 Final-Verifikation (2026-05-15)

#### LESSON: KPI-Skript `kpi:report` listet aktuelle Verstöße als "NEU" (2026-05-15, Plan: 2026-05-15-icon-positionierung)

**Quelle:** Code-Review Pass 3
**Beobachtet:** `scripts/kpi.mjs:560-563` Diff-Logik vergleicht `JSON.stringify(item)` exakt. Bei `renderNode complexity 16→15` sieht der Diff `value:15` als "nicht im pre-JSON enthalten" und labelt es als NEU, obwohl dieselbe Funktion bereits im pre-Snapshot stand (mit anderem Wert). Irreführend für Pass-3-Sub-Agent — sieht aus wie Regression, ist aber Verbesserung.
**Fix im Code:** Skript-Verbesserung: Vergleich nach `(path, function)`-Tupel statt JSON-Substring, mit Wertangabe `(was 16, now 15)`.
**Lehre für nächstes Mal:** KPI-Skript Delta-Logik mit echter Tupel-Vergleichs-Semantik bauen (path+function als Key, value als Vergleichsfeld). Test-Case: künstlicher Snapshot mit complexity-Reduktion → soll als "VERBESSERT" gelabelt werden, nicht "NEU".
**Promotion-Kandidat:** `scripts/kpi.mjs` Refactor (Sub-Plan-Kandidat falls User priorisiert)
**Status:** PROMOTED zu `scripts/kpi.mjs` Delta-Logik (Tupel-Vergleich + IMPROVED/REGRESSED/NEW/RESOLVED-Labels) (2026-05-15)

#### LESSON: Phase-0-Pre-Snapshot von Build-Stale-State abhängig (2026-05-15, Plan: 2026-05-15-icon-positionierung)

**Quelle:** Code-Review Pass 5 F3 + Implementation Task 4.1
**Beobachtet:** Playwright-Pre-Capture passierte glücklicherweise mit `dist/custom-energy-flow-card.js` vom 13:39 (vor Phase 3 commits). Hätte ich Pre-Capture mit aktuellem `dist/` gemacht (nach Phase 3), wäre kein Vergleich gegen Pre-State möglich gewesen. CLAUDE.md Phase 0 sagt "Playwright-Capture-Stufe-1 optional" — aber wenn capture, dann MUSS vor erstem Implementation-Commit + mit aktuellem `dist/` zu diesem Zeitpunkt.
**Fix im Code:** Im konkreten Fall durch Zufall korrekt. Pattern für künftige Plans: Phase 0 explizit dokumentieren `pnpm build && pnpm preview & ... playwright capture pre.json` als verbindliche Sequenz, NICHT optional.
**Lehre für nächstes Mal:** Phase-0-Playwright-Capture sollte das Bundle-Hash im `_meta`-Block mitloggen, damit Build-Drift sichtbar wird (wenn capture nach Phase-3-Build statt vor: error). Oder Pre-Snapshot pflicht machen statt optional (graceful-fallback nur bei MCP-Nichtverfügbarkeit).
**Promotion-Kandidat:** `CLAUDE.md` Implementation-Workflow Phase 0 (Pre-Snapshot): Bullet "Bundle-Hash + Build-Timestamp in playwright/$plan-id-pre.json `_meta` mitloggen"
**Status:** PROMOTED zu `CLAUDE.md` Implementation-Workflow Phase 0 Punkt 3 (2026-05-15)

#### LESSON: Engine-Recompute verhindert hardcoded Stress-Tests (2026-05-15, Plan: 2026-05-15-icon-positionierung)

**Quelle:** Code-Review Pass 5 F4 + Implementation Task 4.2
**Beobachtet:** Plan §4.2 wollte Grid-Power per DevTools-Override auf `-12345` setzen, um 5-stellig-Overflow-Risiko zu verifizieren. Energy-Engine recomputed Grid-Power aus PV+Battery+Consumer-Balance, sodass der Override nicht 1:1 ankommt. Live-Stress-Test schlug fehl — wurde mathematisch erschlossen statt visuell verifiziert.
**Fix im Code:** Kein Code-Fix; Verifikation war indirekt-mathematisch ausreichend.
**Lehre für nächstes Mal:** Stress-Tests für UI-Overflow-Verhalten sollten Engine-Bypass-Hooks haben (z. B. direkten SVG-DOM-Edit der `text.node-value`-Texts) oder Snapshot-basierte Pixel-Tests. Plan-Tasks für "5-stellig im Browser verifizieren" via DevTools-Override sind brittle bei recomputed-engines.
**Promotion-Kandidat:** `spec-template.md` UX-Stress-Tests-Bullet: "Bei UI-Overflow-Stress-Tests: Engine-Bypass-Hook vorsehen oder Snapshot-Pixel-Test statt Live-Engine-Mutation"
**Status:** PROMOTED zu `docs/templates/spec-template.md` §9.1 Blockquote-Hinweis (2026-05-15)

#### LESSON: Hotfix Grid-Font 14→13 nach Plan §4.2-Fallback — Spec-Drift legitim, weil Plan §4.2 STOP-Aktion explizit vorgesehen (2026-05-15, Plan: 2026-05-15-icon-positionierung)

**Quelle:** Code-Review Pass 5 F1 + USER-DECISION 1(b) + Hotfix-Commit
**Beobachtet:** Plan §4.2 STOP-Aktion (1) sagte: "Bei Grid-Überlauf Font reduzieren auf 13 statt 14 (Plan §3.3 Task 3.4 Step 2 anpassen, neuer Plan-Version)". Nach Pass-5-Analyse + User-Wahl (b) wurde Grid-Font 14→13 als Hotfix nach Phase-5-Abschluss umgesetzt. Spec §3.3 sagt nach wie vor "non-home Font = 14" — formaler Drift zwischen Spec und Code.
**Fix im Code:** `src/render/node-renderer.ts:98` Font-Size-Bedingung erweitert: `node.kind === 'home' ? 15 : node.kind === 'grid' ? 13 : 14`. `icon.test.ts:66` it.each-Eintrag für Grid auf fontSize=13. README-Changelog ergänzt um Grid-Font-Erwähnung. KEIN Spec-Update (Spec ist historisches Artefakt).
**Lehre für nächstes Mal:** Plan §STOP-Aktionen, die explizit Code-Werte ändern, sind legitime "Plan-internal-Fix"-Pfade — der entstehende Spec-Code-Drift sollte als Lesson dokumentiert werden, nicht in Spec retroaktiv gepatcht. Optional für künftige Plan-Templates: STOP-Aktions-Sektion explizit als "Spec-Drift-Erlaubnis" markieren mit Verweis auf Lessons-Update.
**Promotion-Kandidat:** `plan-template.md` STOP-Conditions-Sektion: Hinweis "STOP-Aktion, die einen Spec-Wert ändert, ist ein 'Plan-internal-Fix' → führt zu Spec-Drift → MUSS als Lessons-Learned dokumentiert werden (NICHT Spec retroaktiv patchen)"
**Status:** PROMOTED zu `docs/templates/plan-template.md` Self-Review-Checkliste STOP-Conditions-Bullet (2026-05-15)

#### LESSON: Pass 6 sollte zwischen Spec-induced vs pre-existing Test-Flake trennen (2026-05-15, Plan: 2026-05-15-icon-positionierung)

**Quelle:** Code-Review Pass 6
**Beobachtet:** `pnpm check` in Pass 6 zeigte einen FAIL bei `src/engine/energy-engine.test.ts:323` Edge case 16 stress-test (`expected 6.5 ms to be less than 5 ms`). Wiederholungslauf isoliert zeigte 24/24 grün — load-empfindliche Performance-Schwelle, nicht Spec-Regression. Test wurde in Commit `90c8e83` authored (vor Subspec 2026-05-15), also Pre-existing. Aktuelles Pass-6-Workflow würde dennoch als Block werten.
**Fix im Code:** Pass 6 sollte `git blame` auf failing test ziehen — wenn Test-Commit vor Plan-Start: LESSON statt Block. Code-Fix (Threshold-Lockerung): User-Entscheidung, nicht autonom.
**Lehre für nächstes Mal:** Pass-6-Workflow-Erweiterung: bei `pnpm check`-FAIL `git blame` auf failing Test-File-Zeile. Wenn Blame-Commit nicht im Plan-Diff: als pre-existing markieren, LESSON-LEARNED appenden, USER-DECISION für Fix-Hotfix.
**Promotion-Kandidat:** `code-review-checklist.md` Phase Z Pass 6: Bullet "Bei `pnpm check`-FAIL: `git blame` auf failing test → Pre-existing? → LESSON statt Block"
**Status:** PROMOTED zu `docs/templates/code-review-checklist.md` Pass-6-Prompt Punkt 2 (2026-05-15)

### 2026-05-15 — Plan: 2026-05-15-akku-prozent-im-ring

#### LESSON: Bundle-Optimierung via Whitespace-Trim ist Einmal-Trick — proaktiv Headroom planen (2026-05-15, Plan: 2026-05-15-akku-prozent-im-ring)

**Quelle:** Code-Review Pass 3 + Pass 6 USER-DECISION
**Beobachtet:** Bundle lag vor Implementation bei 61446 B (6 B über 60-KiB-Budget durch Drift). Nach Spec-treuer Implementation 61984 B (+538 B). Whitespace-Compaction in `src/render/battery-ring.ts` Lit-Templates brachte das Bundle auf 61434 B (6 B Reserve), aber um den Preis von Spec-Plan-Drift (Magic-Numbers inline statt Konstanten). Pass 3 markierte: Lit-`svg`-Templates lassen sich exakt einmal whitespace-komprimieren — die nächste Render-Subspec hätte kein Polster mehr.
**Fix im Code:** Bundle-Budget angehoben (ADR-0022, 60 → 64 KiB), Konstanten danach wieder extrahiert (Commit `3205cb2`). Net-Bundle 61475 B (4061 B Reserve).
**Lehre für nächstes Mal:** Code-Review-Pass 3 sollte Bundle-Headroom explizit prüfen — wenn Reserve < 1 KiB ODER Whitespace-Trim als Bundle-Recovery genutzt wurde: USER-DECISION für Budget-Anhebung VOR der nächsten Render-Subspec einplanen, nicht reaktiv.
**Promotion-Kandidat:** `code-review-checklist.md` Pass 3 Bullet: „Bundle-Headroom < 1 KiB ODER Whitespace-Trim genutzt → USER-DECISION für Budget-Bump"
**Status:** PROMOTED zu `docs/templates/code-review-checklist.md` Pass-3-Prompt Punkt 3 Bundle-Headroom-Check (2026-05-15)

#### LESSON: Theme-adaptive SVG-Text via `var(--primary-text-color, ...)` als Attribut funktioniert (2026-05-15, Plan: 2026-05-15-akku-prozent-im-ring)

**Quelle:** User-Feedback nach Initial-Implementation + Sandbox-Verifikation
**Beobachtet:** Statisches `fill="#ffffff"` auf gesättigtem grünem Stroke (`#10b981`) ist bei font-size 9 schwach lesbar — User-Beanstandung im Light-Theme. Die etablierte Lösung via HA-CSS-Custom-Property `var(--primary-text-color, #1c1c1c)` als SVG-Text-`fill`-Attribut wurde live in der Sandbox verifiziert (DevTools `style.setProperty('--primary-text-color', '#1c1c1c'|'#ffffff')` toggelt `computedStyle.fill` zwischen `rgb(28,28,28)` und `rgb(255,255,255)`). HA-Light-Theme → dunkel, Dark-Theme → hell.
**Fix im Code:** `src/render/battery-ring.ts` `LABEL_FILL = 'var(--primary-text-color, #1c1c1c)'`. `node-renderer.ts:81` (Knoten-Kreis) nutzte das Pattern schon, also Repo-konsistent.
**Lehre für nächstes Mal:** Für Text auf Theme-abhängiger Background-Fläche (gesättigte Stroke-Farbe, Card-Background etc.): default theme-adaptiv via HA-CSS-Var, NICHT statisch weiß oder schwarz. Konvention in conventions.md §15 Sprache („Farben") ergänzen oder als Render-Anti-Pattern in §11 dokumentieren.
**Promotion-Kandidat:** `docs/conventions.md` neue §15.X „Render-Farben auf themable Background: `var(--primary-text-color, …)` statt statische Werte"
**Status:** PROMOTED zu `docs/conventions.md` neue §16 „Render-Farben auf themable Background" (2026-05-15)

#### LESSON: Spec-Risiko §10 + Plan-STOP-Condition mit konkretem Mitigation-Pfad sind das richtige Pattern (2026-05-15, Plan: 2026-05-15-akku-prozent-im-ring)

**Quelle:** User-Feedback (Name-Label-Kollision) + Plan-Phase-4-STOP-Condition
**Beobachtet:** Spec §10 listete „Name-Label kollidiert mit Ring-Außenrand (7 px Reserve)" als niedrig-Risiko mit Mitigation „Falls Kollision: Name-Offset von 22 auf 26 anheben". Plan Phase 4 Task 4.1 Step 3 hatte die STOP-Condition wortwörtlich übernommen. User-Feedback nach Preview bestätigte die Kollision — der vorgesehene Mitigation-Pfad wurde dann **ohne neue Spec/Plan-Iteration** umgesetzt (Commit `3205cb2`, Offset 22 → 30 statt 26 wegen +4 px Sicherheits-Puffer).
**Fix im Code:** `src/render/node-renderer.ts:154` `node.r + 22` → `node.r + 30`.
**Lehre für nächstes Mal:** Wenn Spec §10 Risiken + Plan STOP-Conditions mit **konkretem Wert** als Mitigation hat, ist post-Implementation-User-Feedback der eingeplante Trigger — kein Pattern-Bruch, sondern Pattern-Erfolg. Code-Drift gegenüber Spec dann als Lesson dokumentieren (analog zur Grid-Font-Lesson 2026-05-15-icon-positionierung).
**Promotion-Kandidat:** `spec-template.md` §10 Risiken: Hinweis „Mitigations-Pfade dürfen konkrete Code-Werte vorgeben — der Plan übernimmt sie als STOP-Conditions, der Drift wird in lessons-learned dokumentiert."
**Status:** PROMOTED zu `docs/templates/spec-template.md` §10 Mitigations-als-STOP-Conditions-Blockquote (2026-05-15)

#### LESSON: ESLint-Layer-Zone-Exception für `const.ts` muss bei Tests berücksichtigt werden (2026-05-16, Plan: 2026-05-15-en-i18n Phase 1)

**Quelle:** Sub-Agent-Concern Phase 1, Task 1.1 → Lint-Bruch nach Implementation
**Beobachtet:** Plan §3.1 Task 1.1 schreibt `import { CARD_NAME } from '../const'` in `src/i18n/index.test.ts`. ESLint `no-restricted-paths` Zone für `./src/i18n` war `except: ['./i18n']` — `const.ts` war NICHT in der Exception-Liste. Lint brach nach `pnpm check` rot. Sub-Agent erweiterte die Zone auf `['./i18n', './const.ts']` analog zur bestehenden `editor.ts`-/`render/`-/`editor-list-sections.ts`-Zone (alle haben `'./const.ts'`). Fix war im selben Commit (`da8ea61`).
**Fix im Code:** `.eslintrc.cjs:24` `except: ['./i18n']` → `except: ['./i18n', './const.ts']`.
**Lehre für nächstes Mal:** Bei Spec/Plan-Erstellung muss die ESLint-Layer-Zone-Tabelle (z.B. Spec §0.1) NICHT NUR die Production-Imports, sondern auch **Test-File-Imports** abdecken. `const.ts` ist Repo-weit als Root-Singleton legitim importierbar — gehört in JEDER Layer-Exception-Liste. Beim nächsten Plan mit i18n/-Tests oder anderen Layer-Test-Files: Vorab prüfen, ob die Layer-Zone Test-Imports erlaubt.
**Promotion-Kandidat:** `spec-template.md` §0.1 ESLint-Tabelle: Hinweis „Test-File-Imports (z.B. `const.ts`) müssen in der Zone-Exception-Liste enthalten sein, sonst bricht Lint nach Test-Hinzufügen." UND `conventions.md` §11 Anti-Patterns: „ESLint-Zone-Exception ohne `const.ts` ist Anti-Pattern für jeden Layer der seinen eigenen Tests schreibt."
**Status:** PROMOTED (2026-05-16, Commit `9b69c19` `spec-template.md` §0.1 + `conventions.md` §11 + Commit `e3098a3` `.eslintrc.cjs` defensive `const.ts` in `config/` und `ha/` Zonen)

#### LESSON: Mapped-Type Re-Export erzeugt Type-Only-Import-Cycle, der KPI-Skript meldet (2026-05-16, Plan: 2026-05-15-en-i18n Phase 1)

**Quelle:** Sub-Agent-Concern Phase 1 + `pnpm kpi` Output
**Beobachtet:** `src/i18n/index.ts` definiert `type Translations = Widen<typeof DE>` und exportiert ihn. `src/i18n/en.ts` macht `import type { Translations } from './index'`. `index.ts` importiert `EN` aus `./en` zur Laufzeit. KPI-Skript meldet `import_cycles: [['i18n', ['en.ts', 'index.ts', 'en.ts']]]` — der Zyklus ist zur Laufzeit nicht existent (rein type-only via `import type`), aber `scripts/kpi.mjs` unterscheidet das nicht.
**Fix im Code:** keiner — Pattern ist semantisch korrekt (zero runtime impact).
**Lehre für nächstes Mal:** KPI-Skript-`import_cycles`-Findings, die ausschließlich `import type`-Pfade durchlaufen, sind False-Positives. Code-Review Pass 3 (KPI-Drift) sollte das beim Sub-Agent-Briefing erwähnen. Alternativ: `scripts/kpi.mjs` erweitern, sodass `import type`-Edges nicht in Cycle-Detection eingehen — v1.x-Verbesserung, jetzt nicht blockend.
**Promotion-Kandidat:** `scripts/kpi.mjs` Type-Only-Edge-Filter (separater Patch, v0.15+).
**Status:** PROMOTED (2026-05-16, Commit `e3098a3` — `scripts/kpi.mjs:extractImports` skippt `import type {...}` top-level. Verifiziert: `import_cycles: []` nach Fix, vorher 1 i18n-Cycle.)

#### LESSON: Bundle-Forecast für i18n-Erweiterungen unterschätzt (2026-05-16, Plan: 2026-05-15-en-i18n Phase 5)

**Quelle:** Code-Review Pass 3 KPI-Delta + Pass 6 Restrisiko-Analyse
**Beobachtet:** Plan §1.5 Bundle-Strategie schätzte „+0.8–1.2 KiB" Overhead für EN-Translations. Tatsächlich nach Phase 3c: Bundle 61475 → 64615 Bytes (+3140 Bytes, ~3 KiB). Drei Hauptursachen identifiziert: (a) EN-Strings ~700 B, (b) Lit-Property-Materialisierung für 3 neue Argument-Objekt-Interfaces (`SolarSectionProps`/`BatterySectionProps`/`ConsumersSectionProps`) ~800 B, (c) zusätzlicher `_lang`-State + willUpdate-Logik in card.ts/editor.ts + neuer `t`-Throughput durch RenderContext ~1.5 KiB.
**Fix im Code:** keiner — Bundle bleibt unter 64 KiB Budget (921 Bytes Reserve), Bundle-Wachstum ist semantisch korrekt.
**Lehre für nächstes Mal:** Bei i18n-Erweiterungen pro Sprache **~700 B Strings + ~500 B Hash-Map/Lookup-Overhead + ggf. Lit-Property-Patterns** einplanen. Bei FR/ES würde Budget knapp — ADR-0022-Bundle-Budget vor v0.15 erneut evaluieren. Für Spec/Plan-Bundle-Schätzungen: nicht nur die User-facing-Strings rechnen, sondern auch das Framework-Pattern (Argument-Objekte, RenderContext-Erweiterungen) explizit kalkulieren.
**Promotion-Kandidat:** `spec-template.md` §1.5 Bundle-Strategie: Hinweis „Bei i18n-Plans pro Sprache ≥ 1.5 KiB einplanen, plus Framework-Pattern-Overhead falls Argument-Objekte/Context-Erweiterungen."
**Status:** PROMOTED (2026-05-16, Commit `9b69c19` `spec-template.md` §0.1 Bundle-Schätzungs-Hinweis + Commit `f89d644` ADR-0024 bumpt Bundle-Budget auf 80 KiB). Headroom für 4-5 weitere Sprachen vor erneutem Bump. Dynamic-Import bleibt v1.x-Kandidat falls > 5 Sprachen.

#### LESSON: `derive-display-consumers.ts` complexity-Regression durch ADR-0023-Toleranz akzeptabel (2026-05-16, Plan: 2026-05-15-en-i18n Phase 5)

**Quelle:** Code-Review Pass 3 KPI-Delta + Pass 2 Architektur-Findings
**Beobachtet:** `pnpm kpi:report` meldet `groupByArea` complexity 11 → 13 und function-LOC 62 → 64 (beide REGRESSED, beide über Soft-Threshold 10 bzw. 50). Ursache: `name: undefined`-Fix in Line 72 + `?? ''`-Narrowing in Line 106 (Sort-Funktion). Spec §2.2 + ADR-0023 negative Konsequenz dokumentieren bewusst, dass `mapNoneMode` (Line 43) den DE-Import behält — Refactor würde komplexere Lösung erzwingen (Index-Codierung in DisplayConsumer.id oder Marker-Feld), v1.x-Kandidat.
**Fix im Code:** keiner — KPI-Regression ist erwartet und in ADR-0023 referenziert.
**Lehre für nächstes Mal:** KPI-Regressions, die in einem ADR (negative Konsequenz) explizit als Toleranz dokumentiert sind, sind NICHT Code-Review-Blocker. Pass 3 (KPI-Drift) sollte beim Sub-Agent-Briefing erwähnen, dass ADR-dokumentierte Regressions akzeptabel sind — sonst entsteht False-Positive-Loop.
**Promotion-Kandidat:** `code-review-checklist.md` Pass-3-Prompt: „KPI-Regressionen prüfen, ob sie in einem aktiven ADR als Toleranz dokumentiert sind — falls ja: kein AUTO-FIX, sondern Bestätigung."
**Status:** PROMOTED (2026-05-16, Commit `9b69c19` `code-review-checklist.md` Pass-3-Prompt). **Folge-Schritt v1.x:** `derive-display-consumers.ts` Default-Naming sprachneutralisieren (Marker-Feld in `DisplayConsumer` oder Index-Codierung in `id`) — wird bei FR/ES-Plan schmerzhafter; bleibt USER-DECISION.

#### LESSON: Playwright en-i18n-Capture fehlt (Pass 5 funktional skipped) (2026-05-16, Plan: 2026-05-15-en-i18n Phase 5)

**Quelle:** Code-Review Pass 6 Restrisiko-Analyse
**Beobachtet:** Plan Phase 0 + Phase 5 sehen Playwright-Capture-Stufe-1 mit `metrics/playwright/2026-05-15-en-i18n-{pre,post}.json` vor. Bei Implementation auf `main` (kein Worktree) wurde der Playwright-MCP-Server nicht aktiv genutzt — entsprechend liegt für i18n-Plans kein funktionaler Sprach-Beleg vor. Pass 5 (UX + Funktional via Playwright) ist damit faktisch „skipped".
**Fix im Code:** keiner — `pnpm preview` mit DE/EN-Toggle ist als manuelle Verifikation vorhanden (`examples/preview.html` + `scripts/build-preview.mjs`).
**Lehre für nächstes Mal:** Bei i18n-Plans ist Playwright-Capture mit Lang-Toggle (DE-Screenshot + EN-Screenshot) der EINZIGE automatisierte funktionale Sprach-Beleg. Smoke-Test rendert ohne `locale`-Mock-hass (fällt auf EN), prüft also nur EN-Pfad. Pre/Post-Capture NACHHOLEN vor Tag/Release, ODER explizit als „skipped, manuell via `pnpm preview` verifiziert" im Code-Review-Output dokumentieren.
**Promotion-Kandidat:** `code-review-checklist.md` Pass-5-Pflicht: „Bei i18n-Plans: Playwright-Capture pro Sprache OR explizite Manual-Preview-Notiz."
**Status:** PROMOTED (2026-05-16, Commit `9b69c19` `code-review-checklist.md` Pass-5-Prompt + Commit `b683f72` Capture nachgeholt + Commit `f89d644` `scripts/CAPTURE.md` Pattern-Doku). Headless-Auto-Capture mit Playwright DevDep bleibt v1.x-Kandidat falls reale Friction bei 3+ Sprachen entsteht.
