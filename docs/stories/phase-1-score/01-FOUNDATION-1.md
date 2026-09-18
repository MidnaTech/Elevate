# FOUNDATION-1: Elevate Alembic series scaffold — metadata, both `env.py` filters, `migrate_all` entry, revision 0001

Source: [FOUNDATION-1](https://app.clickup.com/t/868m6vexy) (ClickUp)

| Field | Value |
| --- | --- |
| Priority | P0 |
| Estimate | 4 hours |
| Status | Ready |
| Created | 2026-09-16 |
| Story Type | Schema Change (infrastructure — no tables yet) |
| Plan reference | `00-DECISIONS.md` §2 "Design deltas"; ADR-032 (`docs/06-architecture-decision-records.md:154–156`) |
| Depends On | Platform P#4 (BUDGET comment line — done in this PR), P#13 (autogenerate filters — done in this PR) |
| Blocks | FOUNDATION-2 … FOUNDATION-8 |
| Owner | Calvin |

## Open Questions Requiring Product / Architecture Input

None — story is Ready.

## Summary

Instantiate the `elevate` migration series that ADR-032 deferred: an `app.elevate.models.elevate` `MetaData`, `backend/alembic/elevate/` with its own `env.py` and version table `alembic_version_elevate`, a no-op revision `0001`, the `SERIES` entry in the migration loop, and `include_object` filters in **both** series' `env.py` so an autogenerate run for one series can never propose dropping the other's tables. No Elevate table is created here — FOUNDATION-2 onward add tables one revision at a time.

## Background

### What exists today (current architecture)

- Tenant tables are Core `Table` objects on `tenant = MetaData()` in `backend/app/db/models/tenant.py:44`, with helpers `_uuid_pk()` (`tenant.py:31`) and `_audit_cols()` (`tenant.py:37`). Application tables are explicitly excluded: *"Application tables (`elevate_*`) are NOT here (ADR-026) — they live in app/elevate/ with their own series."* (`tenant.py:6–7`).
- Migration loop `backend/app/db/migrate_all.py:40–42`:

```python
SERIES: list[tuple[str, str]] = [
    ("platform", "alembic_version_platform"),
]
```

  with docstring `migrate_all.py:3–4`: *"the 'elevate' entry is appended in the same PR as the first elevate_ table (never earlier)."* Per-tenant loop `migrate_tenant()` at `migrate_all.py:100–105` iterates `SERIES` after `ensure_schema()`.
- Platform env: `backend/alembic/platform/env.py` — `target_metadata` = `app.db.models.tenant.tenant` (line 14), `version_table` default `alembic_version_platform` (line 17), `target_schema` from config (line 18), online mode `SET search_path` + `context.configure(... include_schemas=True)` (lines 39–50). **No `include_object` filter** → autogenerate against a schema containing `elevate_*` tables would propose `DROP TABLE` for each (verified 2026-09-16).
- Platform revision `backend/alembic/platform/versions/0001_tenant_template.py`: `_schema()` reads `target_schema` (lines 29–31); `upgrade()` uses `schema_translate_map={None: _schema()}` (lines 34–36). Only one platform revision exists.
- `backend/alembic/README.md:7`: elevate row marked "(deferred)". `docs/08-conventions-and-reference.md:83` §6: "Instantiation is deferred (ADR-032)".
- Connection budget comment `backend/app/db/session.py:3–6` lists `api 10x5 + normalizer 10x5 + workers 5x5 + backfill 3x5 = 140 / ~400`; CI greps for the word BUDGET. `POOL_SIZE = 5` at `backend/app/db/engines.py:19`.
- Boundary lint `backend/scripts/lint_boundaries.py:19` `APP_NS = "app.elevate"`; platform modules importing it fail CI.

### What this story does (the proposed change)

Additive only:

- `backend/app/elevate/models.py` — `elevate = MetaData()` and the two helpers copied from `tenant.py:31–42` (the module is empty of tables in this story).
- `backend/alembic/elevate/{env.py, script.py.mako, versions/0001_init.py}` — series with `alembic_version_elevate`; revision 0001 has empty `upgrade()`/`downgrade()` so every tenant schema gets the version table and a head.
- `backend/alembic/platform/env.py` — `include_object` excluding `elevate_*` tables and the view `elevate_scoring_events`.
- `backend/alembic/elevate/env.py` — `include_object` including only `elevate_*`.
- `backend/app/db/migrate_all.py` — append `("elevate", "alembic_version_elevate")`; docstring updated.
- `backend/app/db/session.py` — BUDGET line for the Elevate services.
- `backend/scripts/lint_boundaries.py` — three placement checks so the ADR-028 directory law is machine-enforced rather than only written.
- `backend/alembic/README.md`, `docs/08` §6 — "instantiated with FOUNDATION-1".
- **The series rule** (§3d): every later revision is explicit `op.*` DDL that imports nothing from `app.elevate.models`; `models.py` is a query-side mirror; a drift test (AC8) proves the two agree after every migration.

Unchanged: every platform table; `alembic.ini` (CLI convenience only, `backend/alembic.ini:1–2`).

### Why we're making this change (per the decision log)

ADR-032 (`docs/06:154–156`): *"the loop is series-aware from day one but carries only `platform` until the first `elevate_*` table's PR adds the `elevate` series."* Review finding E4 (`00-DECISIONS.md` §3 / platform dep #13): *"platform env.py has no include_object filter and will propose DROP for elevate_ tables it does not know."* Doing the scaffold as its own revision keeps FOUNDATION-2…7 each to one table group and one 3–6 h PR.

### How we'll do it (high-level steps for the implementer)

1. Create `models.py`. Import must not touch a database.
2. Create `alembic/elevate/env.py` by copying `alembic/platform/env.py` and applying the edits described below. Add `include_object` to the platform env.
3. Create `alembic/elevate/versions/0001_init.py` and `script.py.mako` (copy of `alembic/platform/script.py.mako`).
4. Edit `migrate_all.py`. Run `make db-up && make migrate-all` locally; confirm both version tables in `tenant_acme` (`backend/tests/conftest.py:56` `seed_tenant`).
5. Edit the BUDGET comment — keep the sum ≤ ⅔ of `max_connections`.
6. Add the tests. Update the README/docs lines.

### Existing References

- `backend/app/db/models/tenant.py:6–7, 31–44`
- `backend/app/db/migrate_all.py:3–4, 40–42, 100–105`
- `backend/alembic/platform/env.py:14–18, 39–50`; `backend/alembic/platform/versions/0001_tenant_template.py:29–38`
- `backend/alembic/README.md:7`; `docs/08-conventions-and-reference.md:83`
- `backend/app/db/session.py:3–6`; `backend/app/db/engines.py:19`
- `backend/scripts/lint_boundaries.py:19, 31–37`
- `docs/06-architecture-decision-records.md:154–156` (ADR-032), `:106–123` (ADR-026), `:125–131` (ADR-028)

## Requirements

### 1. Database Schema

Only the Alembic bookkeeping table is created (by Alembic itself, from `version_table_schema`):

```sql
-- created by alembic in each tenant schema on first upgrade of the elevate series
CREATE TABLE "<tenant_schema>".alembic_version_elevate (
  version_num VARCHAR(32) NOT NULL,
  CONSTRAINT alembic_version_elevate_pkc PRIMARY KEY (version_num)
);
```

### 2. SQLAlchemy Model

```python
# backend/app/elevate/models.py
"""Elevate application tables — Core Table objects on their own MetaData (ADR-026/028/032).

FOUNDATION-1 creates the metadata and helpers only. FOUNDATION-2..7 add tables, one
revision each, in `backend/alembic/elevate/versions/`. schema=None on every table: the
tenant session pins search_path per transaction (app/db/session.py:44); migrations pass
schema=_schema() explicitly. Never import app.db.models.tenant.tenant here — that MetaData
is created by the PLATFORM series (alembic/platform/versions/0001_tenant_template.py).
"""

from __future__ import annotations

from sqlalchemy import Column, DateTime, MetaData, text
from sqlalchemy.dialects.postgresql import UUID

elevate = MetaData()

def _uuid_pk() -> Column:  # mirrors app/db/models/tenant.py:31-34
    return Column(
        "id", UUID(as_uuid=True), primary_key=True, server_default=text("gen_random_uuid()")
    )

def _audit_cols() -> list[Column]:  # mirrors app/db/models/tenant.py:37-41
    return [
        Column("created_at", DateTime(timezone=True), nullable=False, server_default=text("now()")),
        Column("updated_at", DateTime(timezone=True), nullable=False, server_default=text("now()")),
    ]
```

### 3. Alembic Migration

**3a. `backend/alembic/elevate/env.py`** — copy of `backend/alembic/platform/env.py` with exactly these differences:

```python
# line 14 equivalent
from app.elevate.models import elevate as target_metadata

# line 17 equivalent
version_table = config.get_main_option("version_table") or "alembic_version_elevate"

def include_object(obj, name, type_, reflected, compare_to):  # FOUNDATION-1: series isolation
    if type_ == "table":
        return name.startswith("elevate_")
    return True
```

and `include_object=include_object` passed in **both** `context.configure(...)` calls (offline and online). Everything else — `target_schema`, `SET search_path TO "<schema>"` inside `connectable.begin()`, `version_table_schema=target_schema`, `include_schemas=True` — is identical to the platform env.

**3b. `backend/alembic/platform/env.py`** — add:

```python
ELEVATE_VIEW = "elevate_scoring_events"  # created by the elevate series (FOUNDATION-4)

def include_object(obj, name, type_, reflected, compare_to):  # FOUNDATION-1: series isolation
    if type_ == "table":
        return not (name.startswith("elevate_") or name == ELEVATE_VIEW)
    return True
```

and pass `include_object=include_object` in both `context.configure(...)` calls.

**3c. `backend/alembic/elevate/versions/0001_init.py`**

```python
"""Elevate series — init (FOUNDATION-1).

Creates nothing. Exists so every tenant schema gets `alembic_version_elevate` and the
series has a head before the first table revision (FOUNDATION-2).

Revision ID: 0001
Revises: None
"""

from __future__ import annotations

from alembic import context

revision = "0001"
down_revision = None
branch_labels = None
depends_on = None


def _schema() -> str:
    return context.config.get_main_option("target_schema") or "public"


def upgrade() -> None:
    _schema()  # asserts config is wired; no DDL in this revision


def downgrade() -> None:
    pass
```

**3d. The series rule** for every later revision in this series (frozen DDL): a revision is explicit `op.*` DDL that imports nothing from `app.elevate.models`.

---

*ClickUp truncated the rest of this task body (Testing / Acceptance Criteria sections) in transit. See the [live task](https://app.clickup.com/t/868m6vexy) for the complete story.*
