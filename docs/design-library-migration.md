# Design-library migration and release evidence

The governing baseline is [Elevate Autocoach — Design Library v1.1](../Elevate-Autocoach-Design-Library.md), dated September 7, 2026. The repository copy incorporates the dated version 1.1 user amendment; the original supplied Downloads file remains historical and unchanged. [AGENTS.md](../AGENTS.md), [CLAUDE.md](../CLAUDE.md), [DESIGN_SYSTEM.md](../DESIGN_SYSTEM.md), and the README direct future work to it.

## Scope and retained behavior

The latest [Programs content cleanup](programs-review.md) consolidates its all-program table and chart into Coaching / Event rates views. Selected programs retain the chart and Coaching before an expandable Recorded outcomes sample; completion detail lives in its existing KPI. Only Overview shows reporting metrics and time controls. Shared toolbars group controls on the right, chart disclosures lose inherited margins, and duplicate scope/navigation text is removed. Focused Programs, retained-data, cleanup, shared-design and browser suites pass alongside 15 static tests; current alignment coverage is 90 tables and 10,708 cells. See the review document for the sorting retry and precise coverage.

This migration applies the full system: literal tokens, native system typography, shared action/selection/focus/disabled states, neutral surfaces, one State column with Coach and Started/Completed/Due dates, native navigation and controls, one KPI row per major view, semantic tables, common chart anatomy, and native record dialogs. The earlier cobalt cosmetic pass and its screenshots are historical; it is not the baseline for new components.

The version 1.1 amendment brightens the neutral palette, scales all text/line-height tokens to 85% at an unchanged 16px HTML root, gives attention categories uniform petrol marks, moves KPI explanations into accessible hints, and places long chart source notes inside Summary and data. Activity uses a full-width weekly chart above one consolidated program table. Hit targets and drawer geometry remain unchanged.

Business data and product interactions remain independent from this visual system. The prototype retains the shared reporting period, 177-session source ledger, three pending session-needed reviews, current-cycle reconciliation, source-owned evidence, assignment only on Send, private-note isolation, lifecycle actions, automatic delivery retry, directory filtering, and driver/session return context. Assertions use the current ledger and period instead of restoring stale counts or obsolete workflows.

**Drawer-width override:** all record dialogs remain 1060px maximum, capped by the viewport minus an 84px gutter and full viewport width at 680px and below. This is the user's explicit requirement for Program, Group, Driver, and Session drawers. The latest [Programs clarification](programs-review.md) retains Analytics and places former program-drawer data directly on the full Programs page; only Group, Driver and Session overlays remain. The obsolete assignment composer remains retired. It overrides only the library's illustrative 32rem drawer-width declaration; all other shared header, native-modal, focus, surface, and elevation rules still apply.

## Recorded migration inventory

The [pre-migration token inventory](migration-token-inventory.md) records the exact root declarations from saved copies of `dist/styles.css` and `dist/design-system.css`, including duplicate success-soft values and brand/semantic aliases. It is historical evidence, not an alternate palette. The migration replaces those competing roots with the canonical literal system and the documented drawer-width extension.

## Acceptance coverage

| Check | Evidence |
| --- | --- |
| Canonical source and agent instructions | `tests/design-library.test.mjs` checks the library version and instruction links. |
| Literal and independent tokens | Every root declaration is checked for aliases; every governed color is checked against the exact six-digit literal. |
| Contrast | Text on all four neutrals, primary/hover buttons, semantic pills, required boundaries, focus, and essential chart marks are calculated from sRGB luminance. |
| Foundations | No downloaded fonts or `@font-face`, no decorative CSS gradients, and required shared classes/reduced-motion/forced-color rules. |
| Native semantics | Browser checks use actual links, fieldset/radio groups, tables/header cells, and native modal dialogs. |
| Universal table alignment | `tests/table-alignment.mjs` audits major pages, All programs and selected-program Overview/Content/Configuration, chart data disclosures and reachable record drawers at 1440/390px. Headers and cells share declared alignment and physical content edges; number inputs align right and keyboard sorting retains focus. |
| Metric reconciliation | `tests/metric-reconciliation.mjs` independently counts source rows across 1/4/8 weeks, separates actual method totals from active subsets and pending flags, and verifies creation, reporting snapshots, and unsaved Settings previews. |
| Shared state behavior | The standalone [component specimen](../dist/design-library.html) and a temporary browser specimen exercise default/hover/focus/selected/disabled without saving product settings. |
| KPI composition | All major views plus Session use one labelled section of article tiles, ink values, a nonwrapping row, and keyboard-accessible local overflow. |
| Responsive accessibility | Browser checks cover 1440px, 390px, 320px, 200% text zoom, reduced motion, and forced colors. |
| Product regression | Browser, driver, and session suites cover navigation, filters, source data, lifecycle, drafts, focus, and shared widths. |

The prior browser smoke assertion expected 17 default review rows. The saved pre-migration UI contained 14: eleven actual sessions needing attention plus three pending reviews. The migration updates that assertion to reconcile with these source records; it does not add records or reinstate failed-delivery attention. The completion regression also navigates within the current page, since a full reload deliberately resets in-memory prototype state.

Sessions rows, totals, and summary use the same reporting period. All / Completed / Archived reconcile to **154 / 130 / 0** for This week, **164 / 140 / 10** for Last 4 weeks, and **180 / 156 / 26** for Last 8 weeks. Archived is a raw-state history subset that contributes to reporting Completed within the chosen period; it remains directly filterable. The underlying 177-session ledger is unchanged. [Metric definitions](metric-definitions.md) explain the weekly 154 identified records as 151 actual sessions plus 3 flags, including 147 automated actual sessions and 4 one-on-one sessions. The 8/2 active method subsets are labelled explicitly; weekly chart snapshots remain independent of the selected reporting span. Archiving current work preserves its age and completion count; restoring older history retains its original reporting period.

## Commands

With the application served from `dist/` and Playwright/Chrome available:

```bash
npm run check
npm test
npm run test:design
npm run test:browser
npm run test:drivers
npm run test:sessions
npm run test:programs
```

Use `BASE_URL`, `PLAYWRIGHT_MODULE`, and `BROWSER_CHANNEL` as documented in the [README](../README.md). Final validation on September 7, 2026 passed in local Chrome:

| Command | Result |
| --- | --- |
| `npm run check` | All application scripts and the retained, unloaded program-drawer reference parse. |
| `npm test` | All 14 static, source-ledger, palette, contrast, and exact type-scale tests pass. |
| `npm run test:design` | Shared states, accessible KPI hints, retained chart notes, combined Activity data/sorting, native semantics, all-table alignment, one-row KPIs, and isolated specimen pass. All major views pass at 320/390/1440px and 200% text zoom; shared Before/After labels and values do not overlap. Activity also fills its plot at 1600/1920px. Reduced motion and forced colors retain focus and selection. |
| `npm run test:browser` | Navigation, filters, period counts, pagination, lifecycle shortcuts, source-backed tables, responsive views, and route recovery pass. Source reconciliation additionally passes all method/stage equations, 1/4/8-week scopes, automation source filtering, weekly snapshot independence, direct manual creation, pending-flag conversion, and unestimated Settings previews. |
| `npm run test:drivers` | All 14 representative portfolios, source evidence, current/past coaching, drafts, missing-data help, focus/return context, and three reachable matching drawer variants pass. Driver Action buttons preserve active-focus selection and offer Create session when only history exists; past sessions remain accessible in the profile. Prefilled Create/Cancel behavior and numeric score/header alignment pass at 1440/390px. |
| `npm run test:sessions` | Grouped cameras, preview/selection/sharing, source preservation, replies/private notes, draft carets, closed states, and current/historical archive-period behavior pass. |
| `npm run test:programs` | The later Jobin review passes full-page navigation, independent program/time scope, every program's 1/4/8-week source totals, All programs comparison, the three sections, record/profile links and focus return, unavailable-score/LMS honesty, read-only configuration, responsive tables and 200% chart text zoom. See [review scope](programs-review.md); the full scoring/LMS engine is subsequent work. |
| `git diff --check` | No whitespace errors. |

## Release interpretation

The compact type scale is the user’s explicit amendment. Zoom and reflow remain required; typography changes do not reduce target sizes.

A passing palette test establishes the named foreground/background pairs, not whole-product WCAG conformance. Browser tests block external requests before navigation because the existing map integration would otherwise send fixture coordinates to external services. They validate local map/evidence structure and state, not remote map availability.

Browser tests cover representative states and layouts; manual review must also inspect focus visibility, chart reading without color, text wrapping, and the visual hierarchy. Missing observations remain unavailable. Sample media, maps, and telemetry do not become live integrations through this migration.

When changing a shared rule in the future, update its canonical implementation and acceptance checks together, document the deliberate decision, and verify every affected screen. Do not solve a common component problem with another page-specific override.
