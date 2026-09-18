# GATE 1 — Phase 1 execution & verification pass

Source: [GATE 1](https://app.clickup.com/t/868m6waku) (ClickUp)

> **Not a story from `docs/stories-local-untracked/`.** Added 18 Sep 2026 to hold the verification work that the nine Phase 1 stories defer. Stories 01–08 are written with **zero execution**; everything runs here.

| Field | Value |
| --- | --- |
| Priority | P0 |
| Estimate | 8 hours (provisional — first time anything runs; size after Phase 1 is written) |
| Status | Blocked until stories 01–08 are merged |
| Depends On | FOUNDATION-1, FOUNDATION-2, FOUNDATION-3, ELEV-016, ELEV-004, FOUNDATION-4, ELEV-001, ELEV-002, ELEV-003 |
| Blocks | Phase 2 |
| Owner | Calvin |

## Why this task exists

Under the agreed scope, the nine Phase 1 stories produce **scripts and declarations only** — migration revisions, model declarations, services and jobs — and nothing is executed while they are written. Each of those stories has a Definition of Done reading *"suite/lint/typecheck/boundary green"*; that clause is satisfied **here**, not in the story.

Two consequences worth stating plainly:

1. Each story's 3–6 hour estimate covers writing the code and its tests, **not** getting them green. That work is this task.
2. This is the first execution of ~40 hours of interdependent code, so failures will not be localised. Budget accordingly.

**No cell, no Terraform, no production database.** A disposable local Postgres only.

## Environment

```bash
docker compose -f docker/docker-compose.yml up -d     # postgres :5432 + pgbouncer :6432 + Pub/Sub emulator
# backend/.env DB URLs must point at 5432 — compose and .env.example disagree (.env.example ships 5433)
```

`make db-up` does **not** work on macOS (no `/usr/lib/postgresql`). Use compose.

## Steps

1. **Migrate.** `make migrate-all` → control_plane, platform, and elevate `0001`–`0004` applied to every tenant schema. Confirm **one head per series** (the loop fails on multiple heads).
2. **Drift test first.** FOUNDATION-1 AC8 `test_no_schema_drift` — `compare_metadata` returns `[]` per tenant schema. This is the single most important check in the gate: it is the only thing proving `models.py` and the frozen revisions agree, and it has never run before this moment.
3. **Static gates.** `make lint typecheck` (mypy baseline is 22 errors — do not add to it) and `uv run python backend/scripts/lint_boundaries.py`, including the three placement checks FOUNDATION-1 §3e adds.
4. **Acceptance criteria**, story by story:

| Story | ACs | Notes |
| --- | --- | --- |
| FOUNDATION-1 | AC1–AC8 | AC3/AC4 autogenerate isolation; AC6b planted-violation tests |
| FOUNDATION-2 | AC1–AC7 | constraint + index names; violation tests |
| FOUNDATION-3 | AC1–AC6 | incl. the partial unique index on `managed_key` |
| ELEV-016 | AC1–AC5 | upsert idempotency; empty catalogue runs clean |
| ELEV-004 | AC1–AC8 | needs seeded `vendor_event_mappings` (default + tenant override) |
| FOUNDATION-4 | AC1–AC7 | AC3 proves the view ignores `primary_event_type` |
| ELEV-001 | AC1–AC8 | pure functions — no database needed; run these first |
| ELEV-002 | AC1–AC9 | the argmax SQL; AC9 is the static `programme_score(` grep |
| ELEV-003 | AC1–AC8, AC10–AC12 | AC9 blocked on P#8 (`drivers.deactivated_at`) — document, don't chase |

5. **Milestone proof.** Create a programme via test/CLI, run `score_daily` against a seeded tenant, and confirm period-to-date rows exist and match a hand computation to 0.01. That is the Phase 1 milestone: *drivers have period-to-date scores.*
6. **`make test`** (full suite, not one file).

## Run ELEV-001's tests first

ELEV-001 (`periods.py`, `scoring.py`, `shapes.py`) is pure — no I/O, no Postgres, no fixtures. It is also the scoring formula, so it is the highest-consequence code in the phase and the cheapest thing to verify. Run its golden vectors, the HALF_UP rounding pins (AC6) and the averaging-trap test (AC5) before touching the database; a formula bug found here is minutes, found at Gate 2 it is hours.

## Acceptance Criteria

- [ ] G1 — `make migrate-all` clean on a fresh database with ≥ 2 seeded tenants; rerun is a no-op; one head per series.
- [ ] G2 — Drift test green for the elevate series on every tenant schema.
- [ ] G3 — `make lint typecheck` green, mypy error count ≤ 22; `lint_boundaries.py` green.
- [ ] G4 — Every AC in the table above verified, or explicitly recorded as blocked with its platform dependency (only ELEV-003 AC9 is expected).
- [ ] G5 — `make test` green.
- [ ] G6 — Milestone proof recorded: a hand-computed score matches a `score_daily` row to 0.01.
- [ ] G7 — Any defect found is fixed in its own story's files, not patched here; the story is reopened if its ACs no longer hold.

## Definition of Done

- [ ] G1–G7 checked; Phase 1 stories' DoD clauses satisfied; actual hours recorded against the provisional 8 so Gates 2 and 3 can be sized from evidence.
