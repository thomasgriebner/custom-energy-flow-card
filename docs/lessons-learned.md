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
