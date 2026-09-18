# FOUNDATION-2: elevate_programmes, elevate_programme_versions, elevate_programme_rules (revision 0002)

Source: [FOUNDATION-2](https://app.clickup.com/t/868m6vg5z) (ClickUp)

| Field | Value |
| --- | --- |
| Priority | P0 |
| Estimate | 5 hours |
| Status | Ready |
| Created | 2026-09-16 |
| Story Type | Schema Change |
| Plan reference | `00-DECISIONS.md` D1 (edits apply next period → versions), D5 (allowance default 0), D9 (default coach), D13 (`dedup_group`) |
| Depends On | FOUNDATION-1 |
| Blocks | FOUNDATION-3, FOUNDATION-4, FOUNDATION-5, FOUNDATION-6, ELEV-001, ELEV-004 |
| Owner | Calvin |

## Summary

Create the three configuration tables that define a coaching programme: the programme itself (threshold, exposure minimum, default coach, status), its editable rules (one row per vendor rule with severity label, weight, allowance and `dedup_group`), and the frozen versions that scoring actually reads (one row per save, so an edit made mid-period takes effect only from the next period). Everything else in Elevate hangs off `programme_id`.

## Background

### What exists today (current architecture)

- FOUNDATION-1 gives `app.elevate.models.elevate` (empty), helpers `_uuid_pk()` / `_audit_cols()`, and the elevate series at head `0001`.
- Platform reference data the rules point at: `vendor_event_mappings` in the **control plane** (`backend/app/db/models/control_plane.py:83–98`): PK `(vendor_id, vendor_event_ref, tenant_id)`, `event_type` (canonical, `docs/08` §1), `tenant_id = ''` for default rows. Events carry `vendor_id` and `vendor_event_ref` (`backend/app/db/models/tenant.py:204, 206`).
- Users are control-plane rows; tenant tables reference them by plain `uuid` without FK (pattern: platform tables carry `batch_id` uuids without FK, `docs/05-database-design.md` §3).
- No programme concept exists anywhere.

**Audience (recorded interpretation):** there is deliberately no enrolment/audience table — every active programme scores every driver with trip exposure in the tenant, per contract §01 ("Every enabled programme applies to every active fleet driver in version one"); scope by group/driver is a §16 deferral (`91-DEFERRED.md`).

### What this story does (the proposed change)

Additive: revision `0002` creates `elevate_programmes`, `elevate_programme_versions`, `elevate_programme_rules` with the constraints and indexes below, and adds the three `Table` objects to `models.py`. Nothing platform-side changes.

### Why we're making this change (per the decision log)

- D1: *"Programme edits apply from the next period … Keep `programmes.config_version` (bumped on save); every evaluation records the version that scored it."* → `elevate_programme_versions` is the frozen copy; scoring picks the latest version with `created_at <= period_start` (ELEV-004 implements the lookup).
- D5: *"Allowance defaults to 0."* → column default.
- D9: *"Default coach per programme."* → `default_coach_user_id NOT NULL`.
- D13: *"`dedup_group` kept; default = the rule's canonical behaviour."* → `dedup_group NOT NULL`, filled by the service from `vendor_event_mappings.event_type` (ELEV-004).
- Review R3: *"segment formula is non-additive; jsonb daily row cannot hold segments"* → no `effective_from/to`; versions instead.

### How we'll do it (high-level steps for the implementer)

1. Add the three `Table` objects to `backend/app/elevate/models.py`.
2. Write `backend/alembic/elevate/versions/0002_programmes.py` — explicit `schema=_schema()` on every op, named constraints (needed for `downgrade`).
3. `make migrate-all`; verify with `\d+ tenant_acme.elevate_programme_rules` that the unique constraint and check constraints exist under the names below.
4. Run tests.
5. Update `docs/05-database-design.md` §2.4 with these three tables.

### Existing References

- `backend/app/elevate/models.py` (FOUNDATION-1)
- `backend/alembic/elevate/versions/0001_init.py` (FOUNDATION-1) — `_schema()` idiom
- `backend/app/db/models/control_plane.py:83–98` — `vendor_event_mappings`
- `backend/app/db/models/tenant.py:204, 206` — `events.vendor_id`, `events.vendor_event_ref`
- `docs/08-conventions-and-reference.md` §1 — canonical `event_type` values (the `dedup_group` default domain)
- `00-DECISIONS.md` D1, D5, D9, D13; §3 R3

## Requirements

### 1. Database Schema

```sql
-- all objects in the tenant schema; shown unqualified, the migration passes schema=_schema()

CREATE TABLE elevate_programmes (
  id                    uuid          NOT NULL DEFAULT gen_random_uuid(),
  name                  text          NOT NULL,
  threshold             numeric(5,2)  NOT NULL DEFAULT 70,            -- contract §03, strict <
  min_exposure_miles    numeric(8,1)  NOT NULL DEFAULT 100,           -- contract §03
  default_coach_user_id uuid          NOT NULL,                       -- D9; control-plane user, no FK
  status                text          NOT NULL DEFAULT 'active',
  activated_at          timestamptz   NOT NULL DEFAULT now(),          -- last time status became active (create or restore); scoring windows start here (D19)
  config_version        integer       NOT NULL DEFAULT 1,             -- D1; bumped on scoring-affecting save
  created_at            timestamptz   NOT NULL DEFAULT now(),
  updated_at            timestamptz   NOT NULL DEFAULT now(),
  CONSTRAINT pk_elevate_programmes            PRIMARY KEY (id),
  CONSTRAINT uq_elevate_programmes_name       UNIQUE (name),
  CONSTRAINT ck_elevate_programmes_status     CHECK (status IN ('active','archived')),
  CONSTRAINT ck_elevate_programmes_threshold  CHECK (threshold >= 0 AND threshold <= 100),
  CONSTRAINT ck_elevate_programmes_min_exp    CHECK (min_exposure_miles >= 0)
);

CREATE TABLE elevate_programme_versions (
  programme_id        uuid          NOT NULL,
  config_version      integer       NOT NULL,
  threshold           numeric(5,2)  NOT NULL,
  min_exposure_miles  numeric(8,1)  NOT NULL,
  rules               jsonb         NOT NULL,   -- [{vendor_id, vendor_event_ref, severity_label, weight, allowed_per_1000mi, dedup_group}]
  created_at          timestamptz   NOT NULL DEFAULT now(),   -- version effective for period P iff created_at <= P.start (D1)
  created_by          uuid          NOT NULL,
  CONSTRAINT pk_elevate_programme_versions PRIMARY KEY (programme_id, config_version),
  CONSTRAINT fk_elevate_programme_versions_programme
    FOREIGN KEY (programme_id) REFERENCES elevate_programmes (id) ON DELETE CASCADE,
  CONSTRAINT ck_elevate_programme_versions_rules_is_array CHECK (jsonb_typeof(rules) = 'array')
);
CREATE INDEX ix_elevate_programme_versions_lookup
  ON elevate_programme_versions (programme_id, created_at DESC);

CREATE TABLE elevate_programme_rules (
  id                  uuid          NOT NULL DEFAULT gen_random_uuid(),
  programme_id        uuid          NOT NULL,
  vendor_id           text          NOT NULL,   -- matches events.vendor_id        (tenant.py:204)
  vendor_event_ref    text          NOT NULL,   -- matches events.vendor_event_ref (tenant.py:206)
  severity_label      text          NOT NULL,
  weight              numeric(6,2)  NOT NULL,
  allowed_per_1000mi  numeric(8,3)  NOT NULL DEFAULT 0,        -- D5
  dedup_group         text          NOT NULL,                  -- D13; default = mapping event_type, set by the service
  created_at          timestamptz   NOT NULL DEFAULT now(),
  updated_at          timestamptz   NOT NULL DEFAULT now(),
  CONSTRAINT pk_elevate_programme_rules PRIMARY KEY (id),
  CONSTRAINT fk_elevate_programme_rules_programme
    FOREIGN KEY (programme_id) REFERENCES elevate_programmes (id) ON DELETE CASCADE,
  CONSTRAINT uq_elevate_programme_rules_rule UNIQUE (programme_id, vendor_id, vendor_event_ref),
  CONSTRAINT ck_elevate_programme_rules_severity CHECK (severity_label IN ('low','medium','high','critical')),
  CONSTRAINT ck_elevate_programme_rules_weight   CHECK (weight >= 0),
  CONSTRAINT ck_elevate_programme_rules_allowed  CHECK (allowed_per_1000mi >= 0)
);
CREATE INDEX ix_elevate_programme_rules_ref ON elevate_programme_rules (vendor_id, vendor_event_ref);
```

### 2. SQLAlchemy Model

```python
# backend/app/elevate/models.py — append after the helpers (FOUNDATION-2)
from sqlalchemy import (  # extend the existing import
    CheckConstraint, ForeignKey, ForeignKeyConstraint, Index, Integer, Numeric,
    PrimaryKeyConstraint, Table, Text, UniqueConstraint,
)
from sqlalchemy.dialects.postgresql import JSONB

# --- 2.4 Application layer — Elevate (docs/05 §2.4) -----------------------------

elevate_programmes = Table(
    "elevate_programmes",
    elevate,
    _uuid_pk(),
    Column("name", Text, nullable=False),
    Column("threshold", Numeric(5, 2), nullable=False, server_default="70"),
    Column("min_exposure_miles", Numeric(8, 1), nullable=False, server_default="100"),
    Column("default_coach_user_id", UUID(as_uuid=True), nullable=False),  # control-plane user; no FK
    Column("status", Text, nullable=False, server_default="active"),
    Column("activated_at", DateTime(timezone=True), nullable=False, server_default=text("now()")),
    Column("config_version", Integer, nullable=False, server_default="1"),
    UniqueConstraint("name", name="uq_elevate_programmes_name"),
    CheckConstraint("status IN ('active','archived')", name="ck_elevate_programmes_status"),
    CheckConstraint("threshold >= 0 AND threshold <= 100", name="ck_elevate_programmes_threshold"),
    CheckConstraint("min_exposure_miles >= 0", name="ck_elevate_programmes_min_exp"),
    *_audit_cols(),
)

elevate_programme_versions = Table(
    "elevate_programme_versions",
    elevate,
    Column("programme_id", UUID(as_uuid=True), nullable=False),
    Column("config_version", Integer, nullable=False),
    Column("threshold", Numeric(5, 2), nullable=False),
    Column("min_exposure_miles", Numeric(8, 1), nullable=False),
    Column("rules", JSONB, nullable=False),
    # ... see live task for the remaining columns/constraints on this table and elevate_programme_rules
)
```

---

*ClickUp truncated the remainder of this task body (full model definitions, Testing, Acceptance Criteria) in transit. See the [live task](https://app.clickup.com/t/868m6vg5z) for the complete story.*
