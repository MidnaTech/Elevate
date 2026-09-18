# FOUNDATION-4: elevate_driver_daily_scores + view elevate_scoring_events (revision 0004)

Source: [FOUNDATION-4](https://app.clickup.com/t/868m6vmf6) (ClickUp)

| Field | Value |
| --- | --- |
| Priority | P0 |
| Estimate | 4 hours |
| Status | Ready |
| Created | 2026-09-16 |
| Story Type | Schema Change |
| Plan reference | `00-DECISIONS.md` D7 (attribution filter + excluded count), D8 (daily rows are display), D13 (`dedup_group` counts); §3 R11 (charge on the event's driver) |
| Depends On | FOUNDATION-2 · Platform P#3 (indexes on `incidents(window_start)` / `events(vendor_id, vendor_event_ref)` — separate platform PR; not blocking, only performance sign-off) |
| Blocks | ELEV-002, API-4 |
| Owner | Calvin |

## Summary

Create the period-to-date daily score table (one row per day × driver × programme, rebuilt nightly for the whole open period and rewritten once more from the decision's own computation at period close — D17; a display table for the chart — never read by the period decision) and the `elevate_scoring_events` view — the **only** surface through which Elevate reads `events`/`incidents` for counting: one row per (incident, vendor report) carrying the rule that fired, the report's own driver, and the incident id for dedup.

## Background

### What exists today (current architecture)

- Platform `events` (`backend/app/db/models/tenant.py:198–243`): `id`, `incident_id → incidents` (`:203`), `vendor_id` (`:204`), `vendor_event_ref` (`:206`), `event_type` (`:207`), `occurred_at` (`:208`), `driver_id` (`:211`), `driver_attribution` (`:212`), `tombstoned_at` (`:229`). Indexes `ix_events_driver_occurred (driver_id, occurred_at)` (`:233`), `ix_events_incident (incident_id)` (`:235`). **No index on `(vendor_id, vendor_event_ref)`** — platform dep #3.
- Platform `incidents` (`tenant.py:245–263`): `id`, `driver_id` (`:249`), `driver_attribution` (`:250`), `window_start` (`:251`), `tombstoned_at` (`:257`); `primary_event_type` (`:253`) is winner-take-all by severity and **must never be read for scoring**.
- Correlation sets the incident driver first-writer-wins; a later event with a different driver does not raise `contradiction` (review R11) → Elevate charges on the **event's** `driver_id`.
- `incident_events` (`tenant.py:265–272`) duplicates `events.incident_id`; the view uses `events.incident_id` directly.

### What this story does (the proposed change)

Additive revision `0004`: table `elevate_driver_daily_scores` and view `elevate_scoring_events`. The view is created with `CREATE VIEW` SQL in the migration (not a `Table`); a read-only `Table` reflection object is provided in `models.py` for query building.

### Why we're making this change (per the decision log)

- D8: *"`evaluate_period` … computes the fortnight from source; daily rows are display."*
- D7: *"`explicit` + `inferred` count; contradiction/unassigned excluded and shown"* → `excluded_count`.
- D13 (amended): an incident counts once per `dedup_group`, under the highest-weighted **matched** rule → `rule_counts`/`penalties` keyed by rule.
- Adversarial review: *"`primary_event_type` is a trap … scoring never reads it"*; *"one row per (incident, rule that fired), so there's no label to be misled by"* → the view.

### Existing References

- `backend/app/db/models/tenant.py:198–272`
- `backend/app/processing/correlation.py:211–222`
- `backend/alembic/platform/env.py` `ELEVATE_VIEW` (FOUNDATION-1 §3b)
- `00-DECISIONS.md` D7, D8, D13; §3 R11

## Requirements

### 1. Database Schema

```sql
CREATE TABLE elevate_driver_daily_scores (
  day              date          NOT NULL,
  driver_id        uuid          NOT NULL,   -- platform drivers.id; no FK
  programme_id     uuid          NOT NULL,
  period_start     date          NOT NULL,
  miles_ptd        numeric(9,1)  NOT NULL,
  rule_counts      jsonb         NOT NULL,   -- {"<vendor_id>:<vendor_event_ref>": <distinct incidents>} period-to-date
  penalties        jsonb         NOT NULL,   -- {"<vendor_id>:<vendor_event_ref>": <points numeric as string>}
  excluded_count   integer       NOT NULL DEFAULT 0,   -- incidents with contradiction/unassigned attribution (D7)
  score            numeric(5,2)  NULL,       -- NULL when status = insufficient_exposure
  status           text          NOT NULL,
  config_version   integer       NOT NULL,
  scoring_version  text          NOT NULL,   -- e.g. 'autocoach.v1' (ELEV-001 SCORING_VERSION)
  computed_at      timestamptz   NOT NULL DEFAULT now(),
  CONSTRAINT pk_elevate_driver_daily_scores PRIMARY KEY (day, driver_id, programme_id),
  CONSTRAINT fk_elevate_driver_daily_scores_programme
    FOREIGN KEY (programme_id) REFERENCES elevate_programmes (id) ON DELETE RESTRICT,
  CONSTRAINT ck_elevate_driver_daily_scores_status CHECK (status IN ('scored','insufficient_exposure')),
  CONSTRAINT ck_elevate_driver_daily_scores_score  CHECK (score IS NULL OR (score >= 0 AND score <= 100)),
  CONSTRAINT ck_elevate_driver_daily_scores_score_status
    CHECK ((status = 'scored' AND score IS NOT NULL) OR (status = 'insufficient_exposure' AND score IS NULL)),
  CONSTRAINT ck_elevate_driver_daily_scores_maps_are_objects
    CHECK (jsonb_typeof(rule_counts) = 'object' AND jsonb_typeof(penalties) = 'object')
);
CREATE INDEX ix_elevate_dds_programme_period_driver
  ON elevate_driver_daily_scores (programme_id, period_start, driver_id, day);
CREATE INDEX ix_elevate_dds_driver_day
  ON elevate_driver_daily_scores (driver_id, day DESC);

CREATE VIEW elevate_scoring_events AS
SELECT e.incident_id,
       e.driver_id,                              -- the report's own driver: the CHARGE (R11)
       i.driver_id        AS incident_driver_id, -- display only
       e.driver_attribution,                     -- per report (D7 filter applies here)
       i.driver_attribution AS incident_driver_attribution,   -- incident-level; 'contradiction' => never scores
       e.occurred_at,                            -- bucketing clock (D8)
       e.vendor_id,
       e.vendor_event_ref,
       e.event_type       AS category
FROM events e
JOIN incidents i ON i.id = e.incident_id
WHERE e.incident_id IS NOT NULL
  AND e.tombstoned_at IS NULL
  AND i.tombstoned_at IS NULL;
```

### 2. SQLAlchemy Model

The `elevate_driver_daily_scores` `Table` mirrors the SQL 1:1. The view gets a read-only reflection object:

```python
elevate_scoring_events = Table(
    "elevate_scoring_events",
    elevate,
    Column("incident_id", UUID(as_uuid=True)),
    Column("driver_id", UUID(as_uuid=True)),
    Column("incident_driver_id", UUID(as_uuid=True)),
    Column("driver_attribution", Text),
    Column("incident_driver_attribution", Text),
    Column("occurred_at", DateTime(timezone=True)),
    Column("vendor_id", Text),
    Column("vendor_event_ref", Text),
    Column("category", Text),
    info={"skip_create": True},
)
```

The view's SQL lives only in revision `0004` (frozen DDL); `models.py` carries the column reflection above and nothing else for the view.

---

*ClickUp truncated the remainder of this task body (full migration code, Testing, Acceptance Criteria) in transit. See the [live task](https://app.clickup.com/t/868m6vmf6) for the complete story.*
