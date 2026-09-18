# FOUNDATION-3: elevate_learning_items, elevate_programme_learning, elevate_config_audit (revision 0003)

Source: [FOUNDATION-3](https://app.clickup.com/t/868m6vhaw) (ClickUp)

| Field | Value |
| --- | --- |
| Priority | P0 |
| Estimate | 4 hours |
| Status | Ready |
| Created | 2026-09-16 |
| Story Type | Schema Change |
| Plan reference | `00-DECISIONS.md` D10 (two learning tables), §3 R4 (`audit_log` is control-plane → `elevate_config_audit`) |
| Depends On | FOUNDATION-2 |
| Blocks | ELEV-004, API-1, API-2 |
| Owner | Calvin |

## Summary

Create the video library (`elevate_learning_items`), the ordered per-programme playlist (`elevate_programme_learning`), and the tenant-schema audit table for application configuration (`elevate_config_audit`) — the last because the platform's `audit_log` lives in the control-plane database and cannot share a transaction with tenant-schema writes.

## Background

### What exists today (current architecture)

- FOUNDATION-2 created `elevate_programmes` (`id uuid PK`).
- Platform audit: `audit_log` is a control-plane table (`backend/app/db/models/control_plane.py:132–143`); `app/core/audit.py:1–5` — *"Callers pass the control-plane connection they are mutating with, so the audit row and the change share one commit."* Tenant tables are reached through `instance_engine` (`backend/app/db/session.py:55`), a different database → same-transaction audit into `audit_log` is impossible for Elevate config (review R4).
- No learning or audit tables exist.

### What this story does (the proposed change)

Additive revision `0003` with three tables and their `Table` objects. No platform change.

### Why we're making this change (per the decision log)

- D10: *"Two learning tables stay (`learning_items`, `programme_learning` with `position`)."* Contract §05: a programme may contain several required videos; the saved bundle **and order** are authoritative; customers may add a video by URL; no file uploads.
- R4 → `elevate_config_audit`: *"an `elevate_config_audit` table in the tenant schema, written in the same transaction as the config change."*

### How we'll do it (high-level steps for the implementer)

1. Append the three `Table`s to `models.py`.
2. Write `0003_learning_and_audit.py`.
3. `make migrate-all`; verify constraints by name.
4. Tests; docs/05 §2.4 rows for the three tables.

### Existing References

- `backend/app/db/models/control_plane.py:132–143`; `backend/app/core/audit.py:1–33`
- `backend/app/db/session.py:55, 78` (instance vs control-plane engines)
- `backend/alembic/elevate/versions/0002_programmes.py` (FOUNDATION-2 idiom)
- `00-DECISIONS.md` D10; §3 R4

## Requirements

### 1. Database Schema

```sql
CREATE TABLE elevate_learning_items (
  id          uuid        NOT NULL DEFAULT gen_random_uuid(),
  title       text        NOT NULL,
  url         text        NOT NULL,
  category    text        NULL,          -- canonical event_type for the builder filter (docs/08 §1); NULL = uncategorised
  source      text        NOT NULL,
  managed_key text        NULL,          -- stable key of a managed catalogue entry (ELEV-016 seed job upserts on it); NULL for customer items
  created_at  timestamptz NOT NULL DEFAULT now(),
  updated_at  timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT pk_elevate_learning_items   PRIMARY KEY (id),
  CONSTRAINT ck_elevate_learning_items_source CHECK (source IN ('managed','customer_url')),
  CONSTRAINT ck_elevate_learning_items_url    CHECK (url ~ '^https://')
);
CREATE INDEX ix_elevate_learning_items_category ON elevate_learning_items (category);
CREATE UNIQUE INDEX uq_elevate_learning_items_managed_key ON elevate_learning_items (managed_key) WHERE managed_key IS NOT NULL;   -- ELEV-016

CREATE TABLE elevate_programme_learning (
  programme_id  uuid    NOT NULL,
  item_id       uuid    NOT NULL,
  position      integer NOT NULL,
  CONSTRAINT pk_elevate_programme_learning PRIMARY KEY (programme_id, item_id),
  CONSTRAINT uq_elevate_programme_learning_position UNIQUE (programme_id, position),
  CONSTRAINT fk_elevate_programme_learning_programme
    FOREIGN KEY (programme_id) REFERENCES elevate_programmes (id) ON DELETE CASCADE,
  CONSTRAINT fk_elevate_programme_learning_item
    FOREIGN KEY (item_id) REFERENCES elevate_learning_items (id) ON DELETE RESTRICT,
  CONSTRAINT ck_elevate_programme_learning_position CHECK (position >= 1)
);

CREATE TABLE elevate_config_audit (
  id             uuid        NOT NULL DEFAULT gen_random_uuid(),
  actor_user_id  uuid        NOT NULL,
  entity         text        NOT NULL,
  entity_id      uuid        NOT NULL,
  action         text        NOT NULL,
  before         jsonb       NULL,
  after          jsonb       NULL,
  at             timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT pk_elevate_config_audit PRIMARY KEY (id),
  CONSTRAINT ck_elevate_config_audit_entity CHECK (entity IN ('programme','programme_rules','programme_learning','learning_item')),
  CONSTRAINT ck_elevate_config_audit_action CHECK (action IN ('create','update','archive','restore','delete'))
);
CREATE INDEX ix_elevate_config_audit_entity ON elevate_config_audit (entity, entity_id, at DESC);
CREATE INDEX ix_elevate_config_audit_at     ON elevate_config_audit (at DESC);
```

### 2. SQLAlchemy Model & 3. Alembic Migration

Table objects mirror the SQL above 1:1 (`_uuid_pk()`, `_audit_cols()`, `CheckConstraint`, `ForeignKeyConstraint`, `Index`), and the revision `0003_learning_and_audit.py` uses explicit `op.create_table()` / `op.create_index()` calls with `schema=_schema()`, per the FOUNDATION-1 §3d frozen-DDL rule.

---

*ClickUp truncated the remainder of this task body (full model/migration code, Testing, Acceptance Criteria) in transit. See the [live task](https://app.clickup.com/t/868m6vhaw) for the complete story.*
