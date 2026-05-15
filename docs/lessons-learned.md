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
**Status:** offen

#### LESSON: Theme-adaptive SVG-Text via `var(--primary-text-color, ...)` als Attribut funktioniert (2026-05-15, Plan: 2026-05-15-akku-prozent-im-ring)

**Quelle:** User-Feedback nach Initial-Implementation + Sandbox-Verifikation
**Beobachtet:** Statisches `fill="#ffffff"` auf gesättigtem grünem Stroke (`#10b981`) ist bei font-size 9 schwach lesbar — User-Beanstandung im Light-Theme. Die etablierte Lösung via HA-CSS-Custom-Property `var(--primary-text-color, #1c1c1c)` als SVG-Text-`fill`-Attribut wurde live in der Sandbox verifiziert (DevTools `style.setProperty('--primary-text-color', '#1c1c1c'|'#ffffff')` toggelt `computedStyle.fill` zwischen `rgb(28,28,28)` und `rgb(255,255,255)`). HA-Light-Theme → dunkel, Dark-Theme → hell.
**Fix im Code:** `src/render/battery-ring.ts` `LABEL_FILL = 'var(--primary-text-color, #1c1c1c)'`. `node-renderer.ts:81` (Knoten-Kreis) nutzte das Pattern schon, also Repo-konsistent.
**Lehre für nächstes Mal:** Für Text auf Theme-abhängiger Background-Fläche (gesättigte Stroke-Farbe, Card-Background etc.): default theme-adaptiv via HA-CSS-Var, NICHT statisch weiß oder schwarz. Konvention in conventions.md §15 Sprache („Farben") ergänzen oder als Render-Anti-Pattern in §11 dokumentieren.
**Promotion-Kandidat:** `docs/conventions.md` neue §15.X „Render-Farben auf themable Background: `var(--primary-text-color, …)` statt statische Werte"
**Status:** offen

#### LESSON: Spec-Risiko §10 + Plan-STOP-Condition mit konkretem Mitigation-Pfad sind das richtige Pattern (2026-05-15, Plan: 2026-05-15-akku-prozent-im-ring)

**Quelle:** User-Feedback (Name-Label-Kollision) + Plan-Phase-4-STOP-Condition
**Beobachtet:** Spec §10 listete „Name-Label kollidiert mit Ring-Außenrand (7 px Reserve)" als niedrig-Risiko mit Mitigation „Falls Kollision: Name-Offset von 22 auf 26 anheben". Plan Phase 4 Task 4.1 Step 3 hatte die STOP-Condition wortwörtlich übernommen. User-Feedback nach Preview bestätigte die Kollision — der vorgesehene Mitigation-Pfad wurde dann **ohne neue Spec/Plan-Iteration** umgesetzt (Commit `3205cb2`, Offset 22 → 30 statt 26 wegen +4 px Sicherheits-Puffer).
**Fix im Code:** `src/render/node-renderer.ts:154` `node.r + 22` → `node.r + 30`.
**Lehre für nächstes Mal:** Wenn Spec §10 Risiken + Plan STOP-Conditions mit **konkretem Wert** als Mitigation hat, ist post-Implementation-User-Feedback der eingeplante Trigger — kein Pattern-Bruch, sondern Pattern-Erfolg. Code-Drift gegenüber Spec dann als Lesson dokumentieren (analog zur Grid-Font-Lesson 2026-05-15-icon-positionierung).
**Promotion-Kandidat:** `spec-template.md` §10 Risiken: Hinweis „Mitigations-Pfade dürfen konkrete Code-Werte vorgeben — der Plan übernimmt sie als STOP-Conditions, der Drift wird in lessons-learned dokumentiert."
**Status:** offen
