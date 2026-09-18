# Phase 1 — Score

Source: [Phase 1 — Score](https://app.clickup.com/t/868m6ve4m) (ClickUp, Elevate Tasks list)

> **Scope (18 Sep 2026) — zero execution.** The nine stories below are written as **scripts and declarations only**: migration revisions, model declarations, services, jobs and their tests. Nothing is run, no database is created, no cell is deployed. Each story's DoD clauses *"suite/lint/typecheck/boundary green"* and *"applied to dev"* are satisfied by **GATE 1** at the end of this phase, **not** in the story. The story descriptions in this directory are pulled verbatim from the ClickUp task bodies, which themselves mirror local files in `docs/stories-local-untracked/phase-1-score/` (the ClickUp author's own source of truth, not present in this repo).

From `00-INDEX-strict.md` §"Build order — the flow, UI before API, LLM last":

| # | Story | Milestone reached |
| --- | --- | --- |
| Phase 1 · read the platform, produce a score | | |
| 01 | FOUNDATION-1 series scaffold | `alembic_version_elevate` in every tenant schema |
| 02 | FOUNDATION-2 programmes · versions · rules | a programme can exist |
| 03 | FOUNDATION-3 learning · config_audit | |
| 03b | ELEV-016 managed learning library (catalogue + seed job; import route lands with API-2 at step 21) | the builder has videos to pick |
| 04 | ELEV-004 config service | a programme can be created (by test/CLI) with rules and a frozen version |
| 05 | FOUNDATION-4 daily_scores + `elevate_scoring_events` view | the read surface over `events` / `incidents` |
| 06 | ELEV-001 periods + scoring pure functions | the formula, pinned by golden vectors |
| 07 | ELEV-002 queries — population from `trips`, argmax counts from the view | incidents are being read and counted |
| 08 | ELEV-003 `score_daily` | ▶ drivers have period-to-date scores |

**Phase total: 9 stories, 40 hours** (+ GATE 1, provisionally 8).

## Suggested ordering change

**ELEV-001 (item 7) has no database dependency** — `periods.py`, `scoring.py` and `shapes.py` are pure functions, and its stated dependency on FOUNDATION-2 is for the *shape* of the `rules` payload, which is settled on paper. It can be written first, in parallel with the whole FOUNDATION chain, by anyone. It is also the scoring formula, so it is the highest-consequence code in the phase.

**ELEV-016 (item 4)** ships an empty catalogue if the product owner has not supplied the video list, and will silently land as a no-op. Get the list moving now.

## Stories in this directory

1. [01-FOUNDATION-1.md](01-FOUNDATION-1.md) — Elevate Alembic series scaffold
2. [02-FOUNDATION-2.md](02-FOUNDATION-2.md) — elevate_programmes, elevate_programme_versions, elevate_programme_rules
3. [03-FOUNDATION-3.md](03-FOUNDATION-3.md) — elevate_learning_items, elevate_programme_learning, elevate_config_audit
4. [03b-ELEV-016.md](03b-ELEV-016.md) — Managed learning library
5. [04-ELEV-004.md](04-ELEV-004.md) — Programme configuration service
6. [05-FOUNDATION-4.md](05-FOUNDATION-4.md) — elevate_driver_daily_scores + view elevate_scoring_events
7. [06-ELEV-001.md](06-ELEV-001.md) — Periods and scoring pure functions
8. [07-ELEV-002.md](07-ELEV-002.md) — Scoring queries
9. [08-ELEV-003.md](08-ELEV-003.md) — score_daily job
10. [GATE-1.md](GATE-1.md) — Phase 1 execution & verification pass

Each file's content is pulled from its ClickUp task body; where ClickUp's response was cut off mid-section, the file ends with "…" and a link back to the live task for the remainder.
