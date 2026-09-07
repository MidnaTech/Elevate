# Elevate design system

The governing specification is [Elevate Autocoach — Design Library v1.1](Elevate-Autocoach-Design-Library.md), dated September 7, 2026. Read it before any UI work. This file supplements that library with repository integration and product behavior; it does not define a competing palette or component system. Current explicit user decisions take precedence.

The library replaces the former cobalt palette, font downloads, tinted panels, decorative gradients, aliased root tokens, status-as-method conflation, filled view tabs, and separate KPI/table styles. Earlier screenshots and concept pages under `docs/` are historical references only.

## Automated program amendment — September 7, 2026

The approved [automated program contract](docs/program-configuration.md) supersedes the earlier read-only configuration and video/acknowledgement-only flow. Programs uses guided creation followed by one editable page, and stable-ID course mappings on Content. A local driver/manager preview is now explicitly in scope. It uses the shared native dialog and drawer width and is accessed from program setup, without changing the primary navigation. Courses require a short video plus a quiz with explanatory retries. Sending a manager reply does not resolve review; resuming requires an explicit assignment/deadline decision. Historical creation origin and current handling mode are separate. Sample simulation records remain separate from the fleet ledger.

## Sources of truth

| File | Responsibility |
| --- | --- |
| `Elevate-Autocoach-Design-Library.md` | Exact tokens, shared component states, typography, charts, native semantics, accessibility, and release requirements |
| `DESIGN_SYSTEM.md` | Product-specific behavior, data scope, navigation, and the shared-width override |
| `dist/styles.css` | Application layout in the legacy composition layer |
| `dist/design-system.css` | Sole literal root, shared components, and accessibility rules, loaded after layout styles |
| `dist/design-system.js` | Shared icons and accessible help |
| `dist/components.js` | Shared KPI, status dictionary, table, and native-control components |
| `dist/charts.js` | Reusable chart marks, scales, legends, summaries, and equivalent tables |
| `dist/app.js` | Fixture data, ledger scopes, navigation, filtering, and lifecycle actions |
| `dist/overview.js` | Shared KPI and chart data bindings |
| `dist/session-evidence.js` | Event identity, source metadata, and driver/session associations |
| `dist/session-workspace.js` | Evidence review, sharing, conversation, and per-session drafts |
| `dist/driver-spotlight.js` | Driver portfolio and its session return context |
| `dist/programs.js` | Full-page program review, source-scoped records, and Content/Configuration integration |
| `dist/program-setup.js` | Guided setup, editable configuration, added rules, and versioned local program policies |
| `dist/training-library.js` | Searchable training materials and accessible course inspection using the shared drawer |
| `dist/course-builder.js` | Template-first course series editor using shared drawer, fields, tabs and segmented controls |
| `dist/course-authoring-store.js` | Local drafts, reusable templates and versioned published course materials |
| `dist/speeding-course-pack.js` | Learning content extracted from the supplied heavy-truck speeding pack |
| `dist/program-drawer.js` | Retired, unloaded program-drawer reference; its source data now appears in `dist/programs.js` |
| `tests/design-library.test.mjs` | Static design-library acceptance and palette contrast |
| `tests/design-library-browser.mjs` | Shared states, native semantics, KPI geometry, charts, accessibility, and responsive acceptance |
| `tests/browser-smoke.mjs` | Existing navigation, filtering, data, lifecycle, and route regression checks |

Page-specific code may arrange content and bind data. It must not redefine shared tokens, typography, KPI tiles, table cells, status colors, focus, or selection states. Dynamic data widths are allowed; inline colors are not.

## Visual and semantic baseline

Apply the complete library, including its appendix. Every root token is literal. Ember orange `#B84A00` identifies actions and location; petrol `#236C72` identifies neutral data. Headline numbers remain ink. Status and directional colors are independent from brand and categorical series. Use the native system font stack and the six rem-based type steps, reduced to 85% by the dated user amendment. At the unchanged 16px HTML root, body/control text is 11.9px and section/drawer headings are 13.6px. Keep spacing, hit targets, chart geometry and drawer widths unchanged. The amended neutrals are canvas `#FAFBFD`, soft `#FCFDFE`, strong `#F3F5F7`, border `#DEE4EB`, and separator `#EEF1F5`; segmented containers are white. Permanent surfaces have borders and no shadows; only overlays float.

Each major page and session workspace has one `.kpi-strip`, with `.kpi-tile` children on a single nonwrapping row. In Programs, this strip belongs only to Overview; its Content and Configuration tabs show mappings without coaching totals. Narrow strips scroll locally with a label and keyboard access. Use label with accessible info hint → value → optional useful change → optional meaningful meter. Put explanatory scope/definitions in the hint; omit empty context rows. Do not invent denominators or zeroes to fill a tile.

Use real navigation links, native radio groups in fieldsets, native tables with header cells, labelled inputs, and native modal dialogs. Declare table alignment once per column: text/status columns align left and quantities align right. The shared renderer propagates that declaration to both headers and every body/footer cell; do not style a numeric header independently from its cells. Sort controls inherit the same alignment, and number inputs align their entered values right. Numeric columns sort by signed quantity, with missing values last in both directions; cells with descriptive values such as “4% fewer” carry a numeric `data-sort-value`. This includes chart data equivalents, Settings editors, and all drawer tables. View tabs use the shared underline selection and manual keyboard activation: arrow keys/Home/End move focus; Enter/Space activates. Navigation uses an edge marker; radio segments use a bounded selected cell. Focus overlays selection rather than replacing it.

Session tables show one **State** column: the attention reason when a person must act (Overdue, Needs review, Repeated, Replied), otherwise the lifecycle word (Awaiting driver, Completed, Archived). Shared status words and icons come from one dictionary. Completed clears obsolete attention. There is no Method column; **Coach** reads "Automated" or the manager's name. Dates are **Started**, **Completed**, and **Due**, with an em dash where a record has none; there is no Updated column. Delivery problems retry automatically; do not restore a Blocked workflow.

Charts use title → concise context → legend → plot → collapsed **Summary and data**. Put long source/exposure notes inside that disclosure. Use one petrol colour for Automation/Attention Centre category dots and bars; retain the declared categorical series in other charts. Before/after charts use adjacent grey/petrol horizontal bars with a common zero baseline and a separate signed change. Their shared geometry scales with user text zoom so labels and values remain separate at 200%; preserve normal-size geometry and local plot scrolling. Weekly activity uses petrol/umber bars and a cased ink score line on a fixed 0–100 axis. Preserve exact values, source windows, and equivalent tables; a before/after observation does not establish causation.

## Workspace navigation

The user's latest September 7 clarification places the **data from the former program drawer directly on Programs**. Analytics remains a primary destination with Outcomes, Activity, Drivers and Groups. Program links in Analytics, Groups, Automation Centre and search open the full Programs page. There is no Quick view detour or loaded program-modal renderer. A Back action restores the originating report or group, including its scroll and source control. See [Programs review scope](docs/programs-review.md). Do not restore the fleet switcher or account footer. The program coaching preview is governed by the automated program amendment.

Programs opens **All programs / Overview** with one summary strip ordered Identified, In progress, Needs review, Completed, Automated sessions and One-on-one sessions. The first four reconcile the lifecycle; method totals include completed sessions and exclude pending flags. One comparison module uses a native **Coaching / Event rates** control. Coaching is the default and shows one table: Program, Needs review, In progress, Completed, Automated sessions, One-on-one sessions and Event-rate change. Event rates replaces that table with the full Before/After chart; do not repeat the ten-program list in two simultaneously visible modules. Both views retain every program, including those with no current coaching. Compare rates individually without averaging a fleet rate. Underlying Coaching records remain in one collapsed disclosure, opened and filtered by summary shortcuts.

The program selector and comparison links narrow the same page while retaining the reporting period. Programs has only **Overview, Content and Configuration**; driver portfolios remain reachable through coaching records and the fleet Drivers tab stays inside Analytics. The Program selector is available on all three tabs. Only Overview shows the six coaching KPIs, Period selector and exact date caption. Content lists mapped lessons; Configuration lists existing feed/content coverage and links to the selected program's proposal. These mappings are not reporting-period data, so neither tab displays coaching totals or time controls. Keep the selected `coachingPeriod` in URL/state while those tabs are open and restore it on return to Overview. Top-level Programs navigation returns to All programs / Overview / Coaching comparison. `programComparison=rates` restores the Event rates view in URLs and history; the omitted/default comparison is Coaching. Browser history also restores the previous program and page tab.

A selected program's Overview preserves one full-width event-rate chart above Coaching, with Trend and Comparison views; the trend retains its explicitly dated eight-week history, while Comparison follows the selected reporting window. Coaching starts with All records, ordered with review first, and each actual record has an explicit Open session action. The Sessions table also exposes that action. Analytics remains in primary navigation; a contextual Back returns to the source report or group without adding a duplicate generic header link. Driver portfolios and individual session details continue to open in shared-width drawers.

The selected Overview orders its content **event-rate chart → Coaching → Recorded outcomes**. Recorded outcomes is one initially collapsed disclosure with an explicit **Undated sample** cue. It retains eligible drivers, improved share, repeated counts and their methodology; the expanded content states that the observation window is unavailable and independent of reporting period. Keep chart Summary and data with its chart. Period completion fraction/percentage belongs in the Completed KPI help and its meaningful meter, without a separate completion section; a zero identified denominator has no completion percentage or meter. Coaching retains clip availability and count-aware state/coach filters, while review composition stays in KPI help. Total method KPIs remain distinct from active-method counts. Start one-on-one prefills the program and opens the new session over that page; cancel changes nothing.

Only individual sessions, driver portfolios and groups use record drawers. Session close/Back restores Programs with its filters and source row. `programState` and `programCoach` preserve coaching scope in URLs and history. Legacy `programPreview` / `programStage` URLs migrate to the corresponding Programs page and filter, including a nested session when present. Drivers and Groups use `?analytics=drivers#analytics` and `?analytics=groups#analytics`; former direct links still resolve.

Desktop navigation expands to 224px or collapses to 72px. The toggle preserves focus, reports `aria-expanded`, and remembers the preference locally with a storage-unavailable fallback. Collapsed icons expose names on hover and focus. At 681–900px expansion overlays the workspace; mobile retains bottom navigation and More. Returning to desktop restores the saved preference.

## Control placement

Use page header → one KPI strip → dataset toolbar → applied filters → primary content → supporting detail. Programs Content and Configuration omit the overview's KPI strip and time scope because they show mappings; all other page compositions remain as specified. The header places the title left and actions right. Put view tabs left in the dataset toolbar; keep applicable program/period, search and Filters together on the right, with search immediately before Filters. Reporting-only scope replaces unsupported search or filters. Controls for a nested dataset stay on the right of that dataset's heading. On smaller screens the control group wraps beneath the views and retains its order; do not scatter individual filters across both sides. All controls retain accessible names, and search stays mounted as results change.

The September 7 cleanup uses one stable Programs title, one named program selector on every tab and one exact page-period caption on Overview only. Do not repeat the period in every section, copy a KPI status into the page title, or add generic cross-links to destinations already present in navigation. Preserve context that changes interpretation: undated samples, chart endpoints, rate units, fleet versus directory scope, and total versus active methods. State/coach options carry counts; the filtered result count is announced without a second visible heading count. Hide pagination controls when there is only one page.

Use 24px between major sections, 16px between a section heading and its content, and 8px between related controls. Segmented tracks have 4px padding while options retain their 36px minimum height. Charts align their disclosure with the chart content and have no inherited side or bottom margins. A panel owns its internal gap; legend and disclosure margins must not add a second gap. Small driver highlights size to their content instead of stretching to match a neighboring chart.

Filters open on request and show an applied count when closed. Reset is in the panel footer left; Done is right. Escape, backdrop, and Done dismiss the panel and restore its invoker. Native modal state must be released during navigation. Announce results through one restrained live region.

Manual coaching remains a deliberate individual action because automated coaching is the ordinary workflow. Settings Save/Discard stay with the dirty draft. Settings changes share the draft → Preview → Save and activate flow; cancelling or discarding must not modify active configuration.

## Shared reporting period and data

Automation Centre, Sessions, Programs, and the detailed reports share `data-coaching-period` and the `period` URL value: This week, Last 4 weeks, Last 8 weeks. `currentCycleCounts(period, programId)`, `coachingCounts(predicate, period)`, `rateChange()`, and `periodScopeLabel()` provide the common scope. Counts, rates, tables, shortcuts, program pages, and group drawers must describe that same selected window. The Automation Centre program selector is independent of time: its default is All programs, and a selected program scopes both the summary and its drilldowns without changing the reporting period.

The initial weekly fixture has **154 identified = 151 actual sessions + 3 pending flags = 10 in progress + 14 needing review + 130 completed**. Actual sessions split into **147 automated + 4 one-on-one**. The automated total includes 128 completed, 11 needing review, and 8 in progress; the one-on-one total includes 2 completed and 2 in progress. Review comprises 4 Overdue, 3 Session needed, 3 Repeated, and 4 Replied. Pending session-needed flags belong to identified/review counts, but are not created sessions and have no session method yet. “Automated sessions” and “One-on-one sessions” always describe actual totals; use “Automated in progress” and “One-on-one in progress” for the 8/2 active subset. Automation share is 147 ÷ 151, rounded to 97%, and its Awaiting session row exposes the 3 pending flags separately.

Activity, Automation Centre, and Sessions begin with the same four stage totals. Activity then adds the two actual method totals; its combined program table retains explicit in-progress method columns. Source-specific Sessions filters exclude pending flags; All origins includes them. A mixed list uses “records” rather than claiming every item is a session. The [metric definitions and source reconciliation](docs/metric-definitions.md) specify the 1/4/8-week scopes, lifecycle invariants, and test coverage. Latest-week chart/run snapshots stay weekly when the reporting selector changes. Settings may describe how a draft mode/cadence would work, but next-cycle driver volume remains **Not estimated** without source observations.

Summaries keep the selected program and reporting window while search, status, and coach filters narrow their tables. Selecting a different program changes the dataset scope for both the summary and records. A summary shortcut retains program/time scope, clears conflicting table filters, then opens its named stage or method. All-program totals remain unchanged by directory-only filtering. Current workload and completed history must remain distinguishable. Data tests should reconcile visible results to the selected-period records and pending candidates, rather than preserve an obsolete all-history count.

Event-rate changes use the latest week against its previous week for a one-week span, otherwise against the first week of the displayed span. Longer-period Automation Centre deltas say **No prior window** when no comparable prior period is supplied. Keep events per 1,000 trips distinct from events per 100,000 trips; never average rates without exposure.

The safety distribution describes 1,024 fixture drivers; the directory contains 14 representative records. Include unscored drivers in the fleet distribution. The Taylor Brooks highlight is +7 points, 71 → 78, among those directory records; it is not a fleet ranking or a dated weekly score change. Coaching by group belongs to Groups. Session counts are not unique-driver counts.

## Record drawers

**Explicit product override:** all overlay record drawers use the same `--drawer-width: 1060px`, capped by `calc(100vw - var(--drawer-gutter))` with `--drawer-gutter: 84px`; at 680px and below they use the full viewport width. This preserves the user's requirement that every drawer have identical width. It overrides only the illustrative `32rem` width in the library's `.dialog.drawer` CSS example. Groups, driver portfolios and sessions all follow this rule. Programs is a full page and is not an overlay. Nested record navigation never changes drawer width.

Use the library's shared `.drawer__header`, native modal dialog behavior, neutral surfaces, and overlay shadow. Move focus inside on opening, contain it while modal, close on Escape/backdrop/Close, and restore the exact invoker. The background is inert. Content scrolls inside the drawer; tables, plots, and KPI strips may scroll in their named local regions.

### Driver portfolios

The driver name in the Drivers directory opens a portfolio. Its separate **Action** column offers **View session** for an actual active session (prefer the displayed focus), or **Create session** when no active session exists, including drivers with only completed/archived history. Past sessions remain accessible through the portfolio. A pending review uses its flagged Create session flow. Creation uses the existing prefilled form and Cancel changes nothing. Inside a portfolio, **Open session** enters coaching. Driver identity appears once in the header. Keep the recorded latest score distinct from the observed driving week. Weekly miles, trips, and days driven come from dated sample observations; missing coverage is unavailable, not zero. Do not invent a weekly score series.

Use the current product arrangement documented in [Driver spotlight](docs/driver-spotlight.md), while applying the library's shared KPI, chart, table, header, and control classes. Deduplicate source evidence by event ID. One multicamera incident is one evidence record, as is one pattern spanning multiple trips. Exclude dismissed events and delivery failures from rule counts; retain dismissed evidence as labelled history where appropriate. Historical rule evaluations need their original rule/version/context, not current configuration.

Opening a session preserves coaching scope, expanded exception, active camera, and scroll. Back to driver restores that context. The `driver` URL identifies a portfolio; `record` identifies a session. Closing preserves directory search and filters.

### Session evidence and conversation

Use one session KPI strip, neutral conversation bubbles with author labels, and the shared evidence header. Retain the useful video/map pairing and compact composer; do not recreate a permanent repeated metadata rail, duplicate history timeline, or attachment strip.

Stable events own camera clips. Preview changes the viewer only. Selecting an event stages all its clips; patterns remain data with zero video clips. One browser provides This driver and Unassigned scopes, visible search, checkboxes, and preview. Use selection commits the draft; Cancel/Escape/backdrop discards browser changes.

Only Send shares evidence and assigns unassigned events. Preserve original category, source, type, timestamp, vehicle, and location. Cross-driver or closed-session assignment is rejected. An attachments-only reply is valid. First drafts select linked evidence not already shared; Send clears selection, and reopening does not reselect it.

Reply and private-note text, carets, active event/camera, and selection belong to each session. Evidence refreshes preserve the textarea. Private notes are team-visible, hide sharing controls, retain the separate reply selection, and never assign evidence. These prototype drafts persist in memory, not across reloads.

Completed and archived sessions have no composer or Add events action. Archive/Restore retain history; Restore returns to Completed. Failed deliveries follow automatic retry under the active automated workflow, without a new Blocked state or manual account-relink gate.

Actual supplied media URLs use native playback; valid supplied coordinates place the incident map. Missing media/GPS uses explicitly labelled illustrations without an invented incident pin. Do not infer routes or generate incident facts from session hashes. See [Session workspace](docs/session-redesign.md).

## Validation and future changes

Run the documented commands in [README](README.md), including design-library acceptance for shared changes. Follow [migration and release checks](docs/design-library-migration.md). Verify the shared state specimen and representative pages at desktop, narrow widths, 200% text zoom, reduced motion, and forced colors. Contrast-pair tests do not establish whole-product WCAG conformance; report the checks actually completed and any remaining limitations.
