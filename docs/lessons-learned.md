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

_(Erster Eintrag wird beim ersten Code-Review-Run angelegt.)_
