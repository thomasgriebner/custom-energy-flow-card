# Playwright-Capture-Pattern für i18n-Plans

> **Wann nutzen:** Bei jedem Plan, der neue Sprachen hinzufügt (FR/ES/IT/…) oder das i18n-System verändert. Aktiviert Code-Review Pass 5 (UX + Funktional) als Pflicht-Gate (siehe `docs/templates/code-review-checklist.md` Pass-5-Prompt).
>
> **Warum kein Auto-Capture-Skript:** Playwright als DevDep würde ~50 MB Browser-Downloads erzwingen. Bei < 5 Sprachen lohnt sich der Aufwand nicht. Diese Doku ersetzt das Skript — der Hauptagent kopiert die Sequenz und führt sie via MCP-Tools aus.
>
> **Goldstandard-Capture:** `metrics/playwright/2026-05-15-en-i18n-post.json` (en-i18n-Plan v0.14.0) zeigt das Pattern produktiv.

## Voraussetzungen

- `pnpm build` erfolgreich (frisches `dist/custom-energy-flow-card.js`)
- Playwright-MCP-Server aktiv (Tools `mcp__plugin_playwright_playwright__*` verfügbar)
- Aktueller Plan-ID (z. B. `2026-XX-XX-fr-i18n`) für Pfad-Konvention

## Schritte (Hauptagent kopiert 1:1)

### 1. Pre-Snapshot (vor erstem Implementation-Commit)

```bash
mkdir -p metrics/playwright
pnpm preview > /tmp/preview.log 2>&1 &
PID=$!
sleep 4   # warten bis Server bereit
```

```text
mcp__plugin_playwright_playwright__browser_navigate
  url: "http://127.0.0.1:5173/preview/preview.html"

mcp__plugin_playwright_playwright__browser_wait_for
  time: 2

mcp__plugin_playwright_playwright__browser_snapshot
  filename: "/home/.../metrics/playwright/<plan-id>-pre-de.md"

mcp__plugin_playwright_playwright__browser_click
  element: "EN Language Toggle Button"
  target: "#lang-en"

mcp__plugin_playwright_playwright__browser_wait_for
  time: 1

mcp__plugin_playwright_playwright__browser_snapshot
  filename: "/home/.../metrics/playwright/<plan-id>-pre-en.md"
```

Für **funktionale aria-label-Differentiation** (stärkster Beweis):

```text
mcp__plugin_playwright_playwright__browser_click
  element: "Sensor-unavailable scenario"
  target: "button:has-text(\"🚫 Sensor unavailable\")"

mcp__plugin_playwright_playwright__browser_evaluate
  function: |
    () => {
      const card = document.querySelector('custom-energy-flow-card');
      const svg = card?.shadowRoot?.querySelector('svg');
      const ariaLabels = Array.from(svg?.querySelectorAll('[aria-label*=":"]') ?? [])
        .map(e => e.getAttribute('aria-label'))
        .filter(l => /verfügbar|unavailable|indisponible|no disponible/i.test(l));
      return { lang: card?.hass?.locale?.language, ariaLabels };
    }
```

Wiederholen für jede unterstützte Sprache (per Click auf `#lang-de`, `#lang-en`, `#lang-fr`, …).

Aggregat-JSON via Write-Tool:

```json
{
  "plan_id": "<plan-id>",
  "phase": "pre",
  "timestamp": "<ISO-Date>",
  "_meta": {
    "card_bundle_built": "<CARD_VERSION>",
    "card_bundle_hash": "<commit-sha-pre>"
  },
  "captures": [
    {
      "scenario": "Sensor unavailable",
      "lang": "de",
      "aria_label": "Solar Dach: Sensor nicht verfügbar"
    },
    {
      "scenario": "Sensor unavailable",
      "lang": "en",
      "aria_label": "Solar Dach: Sensor unavailable"
    }
  ],
  "functional_proof": {
    "toggle_works": true,
    "lang_resolution_via_hass_locale": true,
    "render_no_crash_in_either_language": true
  }
}
```

Speicherpfad: `metrics/playwright/<plan-id>-pre.json` — **NICHT** `.playwright-mcp/`-Default (in `.gitignore`).

Server beenden:

```bash
mcp__plugin_playwright_playwright__browser_close
kill $PID
```

### 2. Post-Snapshot (nach letztem Implementation-Commit)

Gleiche Sequenz, Pfade nach `<plan-id>-post-{de,en,fr,…}.md` + `<plan-id>-post.json`.

### 3. Commit

```bash
git add metrics/playwright/ && git commit -m "chore(metrics): playwright capture for <plan-id> (<langs>)"
```

## Warum YAML-User-Overrides die Default-Strings überschreiben

`examples/preview-mocks.ts` setzt für alle Knoten `name`-Felder (`Solar Dach`, `Dach-Speicher`, …) — diese sind YAML-User-Overrides und werden vom Renderer-Fallback `entry.name ?? ctx.t.nodes.*` bevorzugt. Die i18n-Differentiation wird also nicht über Knoten-Namen sichtbar, sondern über **sprachneutrale Renderer-Stellen**:

- `ctx.t.states.sensorUnavailable` (Szenario „🚫 Sensor unavailable")
- `ctx.t.diagnostics.{iconLabel,title,pluralize}` (Diagnostics-Icon — Szenario mit warnings)
- `ctx.t.states.stubHint` (leere Config)
- `ctx.t.states.narrowBanner` (Container < 280 px Breite)

Wähle bei der Capture mindestens **ein Szenario** mit aktiver sprachneutraler Stelle, um aria-label-Differentiation zu beweisen.

## Promotion-Pfad zu echtem Auto-Capture-Skript

Falls bei 3+ Sprachen die manuelle MCP-Sequenz zu mühsam wird:

1. `playwright-core` (nur ~10 MB ohne Browser-Binaries) als DevDep installieren — User-Browsers via `PLAYWRIGHT_BROWSERS_PATH` umnutzen
2. `scripts/capture-i18n.mjs` schreiben: spawnt `pnpm preview` als Subprocess, navigiert per `playwright-core` headless, schreibt Aggregat-JSON
3. CLI: `pnpm capture-i18n --plan-id 2026-XX-XX-fr-i18n --langs de,en,fr`
4. ADR-Eintrag für DevDep + Doku-Update in dieser Datei

Bleibt v1.x-Kandidat, sobald reale Friction da ist.

## Goldstandard-Referenz

- `metrics/playwright/2026-05-15-en-i18n-post.json` — Aggregat-JSON für en-i18n (v0.14.0)
- `metrics/playwright/2026-05-15-en-i18n-post-{de,en}.md` — Roh-Snapshots der A11y-Trees
- Commit `b683f72` — Pattern produktiv eingeführt
