# Coaching metrics and reconciliation

These definitions govern Automation Centre, Sessions, Activity, Drivers, Groups, their shortcuts, and shared reporting helpers. The unit is a coaching record or actual session, never an inferred unique driver.

| Measure | Source and inclusion |
| --- | --- |
| Identified | Actual sessions within the reporting period plus pending session-needed flags. |
| In progress | Actual sessions in the active stage; excludes review and completed history. |
| Needs review | Actual sessions needing manager attention plus pending session-needed flags. |
| Completed | Completed sessions and archived completion history inside the selected period. |
| Automated sessions | All actual sessions created automatically inside the period, across active, review, and completed stages. Excludes pending flags. |
| One-on-one sessions | All actual manager-started sessions inside the period, across stages. |
| Automated / One-on-one in progress | Active subsets of the corresponding actual method totals. |
| Awaiting session | Pending session-needed flags, included in Identified and Needs review but excluded from actual method totals. |
| Automation share | Automated actual sessions divided by all actual sessions, rounded to a whole percentage. |

The three independent reconciliations are:

- Identified = actual sessions + pending flags = In progress + Needs review + Completed.
- Actual sessions = automated total + one-on-one total.
- Needs review = actual session reviews + pending flags.

The initial weekly source ledger reconciles as **154 = 151 + 3 = 10 + 14 + 130**. Actual sessions reconcile as **151 = 147 + 4**. Automated sessions reconcile as **147 = 128 completed + 11 needing review + 8 in progress**; the four one-on-one sessions comprise two completed and two in progress. This is why 147 total automated sessions and 8 automated sessions in progress are both correct. Pending flags do not acquire an actual method merely because an automation rule identified them.

| Reporting period | Identified | Actual sessions | Automated total | One-on-one total | In progress | Needs review | Completed | Pending flags |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| This week | 154 | 151 | 147 | 4 | 10 | 14 | 130 | 3 |
| Last 4 weeks | 164 | 161 | 155 | 6 | 10 | 14 | 140 | 3 |
| Last 8 weeks | 180 | 177 | 171 | 6 | 10 | 14 | 156 | 3 |

The historical ledger contains 177 actual sessions plus three separate pending flags. Raw Archived counts are 0, 10, and 26 in the three periods; those records also contribute to reporting Completed. Their archival identity remains available for history filtering.

Source-specific Sessions filters count actual sessions only: Automated totals are 147/155/171; One-on-one totals are 4/6/6. All origins includes pending flags. Mixed lists and pagination say “records.” Summary counts retain their reporting scope while table search, status, source, or other filters narrow the list. Activity places the same four stage measures first, followed by actual method totals. Its table and weekly chart explicitly label active method subsets. Group workload counts actual automated sessions by group and excludes pending flags.

## Reporting time and mutations

The reporting selector changes a selected-window summary; it does not rewrite an individual weekly snapshot. `currentCycleCounts(period)` and `coachingCounts(predicate, period)` accept an explicit period independent of the selected UI window. The latest weekly chart and automation-run snapshot always use period 1, so Last 8 weeks does not relabel 180 identified records as a single week's activity.

A direct manual start adds one actual session: **155 identified = 152 actual + 3 flags = 11 in progress + 14 review + 130 completed**. The actual method split becomes 147 automated + 5 one-on-one. Starting coaching from a pending flag replaces that flag: **154 identified = 152 actual + 2 flags = 11 in progress + 13 review + 130 completed**. Automated total remains 147 in either case. Cancel creates nothing.

Completing a session moves it from an active/review stage into Completed without changing actual method totals. Archiving current work preserves its reporting age and completed count; restoring archived history retains its original age. Reloading the static prototype resets in-memory mutations.

## Unavailable projections and validation

Settings previews describe draft mode and cadence behavior without estimating next-cycle volume. “Drivers in next cycle” remains **Not estimated**; multiplying prior record totals by cadence would invent both a forecast and a unique-driver measure. Previewing a draft does not send assignments or change saved configuration.

[tests/metric-reconciliation.mjs](../tests/metric-reconciliation.mjs), run by `npm run test:browser`, independently counts source rows and asserts the three equations, all period totals, displayed Automation/Activity/Sessions values, active method table columns, origin-filter membership, weekly snapshot independence, manual creation, pending-flag conversion, and unsaved Settings previews. The session suite covers Complete/Archive/Restore and historical age. Browser requests are restricted to the local prototype; no fixture coordinates or records are sent to external services.
