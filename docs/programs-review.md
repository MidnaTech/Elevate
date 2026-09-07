# Programs review prototype — September 7, 2026

Current setup/workflow decisions are in [Automated program configuration and coaching](program-configuration.md). That approved contract supersedes the older configuration, quiz, recurrence and manager-resume assumptions below; recorded call notes and historical review findings are retained.

Programs now presents one comparison at a time: an all-program coaching table or an event-rate chart. Selecting a program leads to its chart, Coaching records, and one Recorded outcomes disclosure. This is the current September 7 content contract; earlier navigation and validation notes are retained below as history.

## Current interface

**All programs / Overview** is the landing view. Overview alone shows the six coaching KPIs: Identified, In progress, Needs review, Completed, total Automated sessions and total One-on-one sessions. The lifecycle four stay together; method totals include completed actual sessions and exclude pending flags. The Completed KPI help contains the period completion fraction and percentage, and its meter uses identified records as the denominator. A program with no identified records has no completion percentage or meter.

One comparison module uses a native **Coaching / Event rates** control. **Coaching** is the default seven-column table:

| Program | Needs review | In progress | Completed | Automated sessions | One-on-one sessions | Event-rate change |
| --- | --- | --- | --- | --- | --- | --- |
| One row per program | Review backlog, including pending flags | Active actual sessions | Completed and archived within the period | Total actual automated sessions | Total actual manager-started sessions | Signed change between the rate observations |

Every program remains available, including programs with no coaching records. **Event rates** replaces that table with the full Before/After chart for the same programs. It retains the exact observation endpoints, rate units, named rows, keyboard access and equivalent data in Summary and data. The full program list is not repeated in a second simultaneously visible comparison. Event-rate change is not a measured coaching effect, and program rates are not averaged into a fleet rate without exposure. Identified totals, completion and exact rate observations remain accessible through the summary, selected program and chart data.

All underlying Coaching records remain accessible in one initially collapsed disclosure. Summary shortcuts open it at the requested state or coach, preserving the reporting window. Selecting a program through the native selector or a comparison row opens its detail on the same page. Program selection and reporting period are independent.

A selected Overview follows **one Trend/Comparison chart → Coaching → Recorded outcomes**. Trend preserves all eight explicitly dated observations; Comparison uses the selected reporting-window endpoints in the same chart card. Coaching begins with All records and orders reviews first. State and Coach options show the applicable counts, clip indicators reflect attached source evidence, actual records retain Open session, and pending flags retain Start session. Driver names still open portfolios. Review composition stays in KPI help and the filtered record count remains an accessible live announcement.

**Recorded outcomes** is one initially collapsed disclosure with an **Undated sample** cue. Opening it retains the program's eligible-driver, improved-share and repeated source facts, with the visible statement that its observation window is unavailable and independent of reporting period. These facts are not a dated video/coaching cohort and do not change with the reporting selector. Missing samples have no fallback borrowed from another program. Longer methodology stays inside this disclosure; each chart keeps its own Summary and data. Completion has no separate page section because its fraction, percentage and meter belong to the Completed KPI.

The page title stays **Programs**. Overview, Content and Configuration remain on the left and the Program selector stays on the right on every tab. Only Overview shows the coaching KPI strip, Period selector and exact date caption. Content lists mapped lesson metadata without duplicate rows; Configuration lists current feed/content coverage and keeps the read-only proposal inside its disclosure. These mappings are not reporting-period data, so both tabs omit coaching totals and time controls. The selected `coachingPeriod` remains in URL/state and returns intact with Overview. Start one-on-one remains in the selected program's header. No scoring, escalation or LMS engine is activated.

## Navigation and retained context

Analytics remains a primary destination with Outcomes, Activity, Drivers and Groups. Program links in Analytics, Groups, Automation Centre and search open Programs directly. The former program drawer is retired and its script is unloaded; its data remains on the page. Only Driver, Group and Session records use the shared 1060px drawer contract, with the existing responsive width cap and mobile full-width behavior.

Source Back restores the originating report or group, including scroll and the source control. A group-origin page displays **All groups** because its breadcrumb is navigation context, not an implicit ledger filter. Session Back returns to Programs with its filters and source record. Start one-on-one prefills the selected program and opens the new session over the page; Cancel changes nothing. Driver portfolios retain Back to driver when entering a session.

`programComparison=rates` preserves the all-program Event rates view in URLs and browser history; Coaching is the default when the parameter is absent. `programState` and `programCoach` preserve record filters. Top-level Programs navigation returns to All programs / Overview / Coaching comparison, while history restores the previous selection. Legacy `programPreview` / `programStage` links migrate to full-page program scope and retain linked sessions. The page sections remain `overview`, `content` and `configuration`; legacy `programTab=drivers` resolves to Overview.

## Review scope

This is the first UI review build for Jobin following the [Kevin/Calvin call notes](kevin-calvin-call-2026-09-07.md). The [domain review](program-domain-review.md) separately critiques the larger logic design. It makes programs a primary workspace and lets the command center answer the same question for all programs or one selected program. It reuses the existing local source ledger and shared design library. It is not the scoring, ingestion, escalation, acknowledgement, or LMS engine described in the broader call. The all-program driver score/session matrix and simplified automated watch → acknowledge session flow are subsequent work; this build does not imply the whole call has been implemented.

## What can be shown honestly

| Measure or interaction | Available evidence and review treatment |
| --- | --- |
| Program coaching stages and method totals | Derive from the current session ledger and separate pending flags inside the selected period. Keep total automated sessions distinct from the active subset. |
| Who has a session and its status | Existing source session records support review, active, completed, and archived views. |
| Existing program event rates | The prototype has program-level rate fixtures. Label their observation window and units; these are not video-level causal impact. |
| Per-program period score | The legacy recorded driver score fixture is not this measure. Show unavailable until scored program observations exist. |
| Overall Elevate score | Requires a defined weighted roll-up and per-program observations. Visible labels now say Elevate score, but the legacy recorded values are unchanged and their help explicitly identifies the unconfigured roll-up. |
| Watched, acknowledged, and completion duration | Existing narrative messages are not a complete event ledger. Do not count them as verified LMS activity. |
| Repeat attempts per video and outcome cohorts | No linked video-attempt/period-outcome dataset exists. Show the intended place or unavailable state without fabricated counts or curves. |
| Configuration and uploads | The full event-feed, trigger, escalation, reset, grace-period, and video-library engine remains a later build. |

The shared [metric definitions](metric-definitions.md) continue to govern source counts. “95% automated” in the call is a design principle, not permission to replace the fixture's measured percentage.

## Research informing the structure

The team reviewed the [Circle course screen](https://mobbin.com/screens/8137f10e-d943-44fd-ac18-8d417a131586) for a course title, compact summary, and student progress table, and [Deel's assignment screen](https://mobbin.com/screens/183566db-f0b6-42f8-b0e1-03e56e32ed35) for stage-based assignment views. These are structural references, not designs to copy wholesale.

Docebo's course report separates course totals from learner-level progress and training-material activity. This supports making one program the page context and putting its people below the summary. [Docebo course report documentation](https://help.docebo.com/hc/en-us/articles/360020080200-Checking-the-course-report)

TalentLMS describes a training matrix that relates individual users to course progress, completion, and outstanding work. That supports the next driver iteration: extend one existing coaching table to include every program, rather than add a second disconnected table. [TalentLMS reporting features](https://www.talentlms.com/features/lms-reporting)

## Decisions still needed before the full logic build

- Review the implemented All programs comparison and selected-program scope with Jobin before the later domain build.
- Define program score normalization, missing/exposure rules, and customer-controlled event/program weights. Do not ship assumed industry benchmarks.
- Decide whether an acceptable per-event baseline is needed. It is a separate question from event severity and program trigger score.
- Confirm distance, driving-duration, and calendar trigger behavior. The call's two-week scheduling default is separate from a reporting selector.
- Resolve reset examples: three 1,000 km periods total 3,000 km; the notes also quote 1,500 km.
- Define an automatic-to-manual handoff separately from creation origin, so escalation does not rewrite historical automation totals.
- Define which score or eligibility calculation is exempted when a driver requests review, and whether the exemption is temporary or depends on the review outcome.
- Define enrolment, watch/acknowledgement events, video versions, repeat attempts, and eligible follow-up cohorts before publishing LMS or impact counts.

Program ownership, quizzes, and assignments remain deferred as stated in the call. GCP architecture and configuration are untouched. This repository work does not send the transcript or messages to Jobin.

## Current acceptance requirements

The current cleanup passes `npm run check`, all 15 static tests, `test:programs`, `test:program-drawer`, `test:cleanup`, `test:browser` and `test:design`. The affected Programs and cleanup suites were rerun after restricting reporting controls to Overview; they verify period restoration, all ten programs and responsive metadata tabs. The shared alignment audit covers 90 tables, 10,708 cells and 370 sort headers. One initial shared-suite sorting-state assertion did not recur in the isolated table run or full retry; the assertion now identifies the affected table if it recurs. Prior acceptance results below refer to their earlier builds.

Validation must reconcile all ten programs across 1/4/8-week windows, including zero-coaching programs, method totals, completion denominators, exact event-rate endpoints and unchanged undated samples. Check that Content and Configuration retain the Program selector while omitting coaching KPIs, Period and date captions, and that returning to Overview restores the same reporting window from URL/state. Check both comparison modes and `programComparison=rates` history; record filters and KPI shortcuts; source/group/session returns; manual creation/cancellation; pending-flag conversion; portfolio links; native labels, focus, local scrolling and 200% text zoom. The chart remains accessible when its view is selected; hiding its default module must not remove its data or URL access.

`npm run test:programs` covers the Programs workspace. The retained `npm run test:program-drawer` command verifies full-page data retention and individual-session drawers, not a restored program modal. Existing design, browser, driver and session suites remain relevant. Local browser checks block external requests before navigation.

Example routes include `/?program=all#programs`, `/?program=all&programComparison=rates&period=4#programs`, and `/?program=speeding&programTab=content#programs`. Analytics Drivers/Groups remain `?analytics=drivers#analytics` and `?analytics=groups#analytics`, with the former direct aliases retained.

## Historical decisions and validation

These notes preserve earlier September 7 review builds and their recorded acceptance results. They are not the current interface contract and do not establish that the latest content consolidation has passed validation.

### Full-page data restoration before content consolidation

The user clarified that the requested restoration concerns **program data**, not a separate program drawer. This supersedes the earlier drawer-restoration interpretation below. Program links in Analytics, Groups, Automation Centre and search now open the full Programs page. Quick view is removed, and the former drawer script is no longer loaded. Driver, Group and Session drawers remain.

A selected Overview retains one Trend/Comparison chart and brings completion fraction/percentage, eligible/improved/repeated sample facts, clip indicators, review composition, active-method counts and one-on-one creation onto the page. No second chart or KPI strip is added. The driver sample is visibly undated and independent of reporting period; completion and coaching records remain period scoped. Pending flags keep Start session and actual records keep Open session.

Back returns to the source report/group with its scroll and opener. Session Back returns to the page and source record. New sessions created from Programs prefill that program and open over it, with refreshed active/manual filters; Cancel changes nothing. State/coach scope uses `programState` and `programCoach`; old `programPreview` / `programStage` links migrate to full-page scope and retain linked sessions. All programs, the three page tabs and Analytics Drivers/Groups remain unchanged.

Validation of this correction passed: 15 static tests, Programs acceptance, the repurposed `test:program-drawer` data-retention suite, shared design checks and browser smoke with metric reconciliation. Retained samples/completion and state/coach counts reconcile for all ten programs across 1/4/8 weeks. Legacy links, report/search/group returns, manual cancellation/creation, pending-flag conversion, exact session return focus/scroll, mobile widths and 200% text zoom are covered. The shared alignment audit covers 90 tables and 8,424 cells. The former drawer test filename is retained for command compatibility; it now verifies full-page data retention and individual-session drawers.

### Earlier review decisions (superseded where noted)

Automation Centre remains the landing page. Its program selector starts at **All programs**. Program scope and reporting period are independent: choosing Speeding must not silently change the date range, and changing the date range must not clear Speeding. Summary values, attention records, and their links describe the selected scope.

**Later user correction:** restore the familiar Analytics entry and program drawer workflow. Analytics opens Outcomes/Activity directly; program names in those reports, Groups and search open a quick-review drawer over the source workspace. Programs remains available for full-page review/configuration, with an explicit Open program page action from the drawer and Quick view from the page. Programs is additive. Drivers and Groups remain inside Analytics as tabs, alongside Outcomes and Activity, without separate sidebar entries. This supersedes the earlier removal of program drawers in the first Jobin mockup.

**All programs is the Programs landing view.** One summary strip shows Identified, In progress, Needs review, total Automated sessions, total One-on-one sessions and Completed. A full-width event-rate comparison and one program table compare all ten programs, including those with no current coaching. The table combines review/workload, method totals, completed counts, completion, latest event rate and period change. No fleet rate is inferred by averaging program rates. All underlying coaching records remain accessible in a collapsed disclosure; summary shortcuts open it at the requested state or coach.

Selecting a program in the filter or comparison table narrows the same page while preserving its reporting period. The only sections are **Overview, Content and Configuration**. Drivers stays inside Analytics; names in the Coaching table still open portfolios. All-program Content lists the mapped lesson metadata across programs. All-program Configuration provides current feed/content coverage and entry points into each program's draft configuration. This replaces the separate Programs Drivers tab.

A selected program places identity and scope first, then a concise summary, a visible event-rate graph, and one Coaching table. The graph defaults to **Trend**, showing all eight dated observations with its own scope label; **Comparison** switches the same card to Before/After for the selected reporting window. The Coaching table defaults to **All records**, retaining current work and completed/archived history; State and Coach filters remain optional. Preserve the distinction between records, actual sessions, and unique drivers. A program with no current coaching still exists and can be selected. Unavailable impact information is collapsed under **About program impact**.

Group, Driver, and Session records continue to use the same 1060px drawer contract. **Open session** is explicit in Program and Sessions Action columns, including completed and archived records; pending flags offer **Start session**. Closing returns to the originating list and action. Driver names still open the portfolio with its daily graph, and its session drilldown retains **Back to driver**. Program quick views use that same width. Program → session → Back preserves the selected stage, scroll and source record; Group → program → Back returns to the group. The underlying workspace stays in place. The Sessions evidence/conversation experience is retained.

### Earlier acceptance contract

`npm run test:programs` covers the new navigation and program switcher, shared program/time scope, source-count reconciliation, preserved record navigation, unavailable metrics, and responsive/native-control behavior. Existing design, browser, driver, and session coverage remains relevant; navigation assertions change only where the product contract intentionally changes. Browser checks block external requests before opening the local application.

The implemented routes include `/?program=speeding#automation`, `/?program=all#programs`, and `/?program=speeding&programTab=content#programs`. Opening `#programs` defaults to All programs / Overview. An independent `period=4` or `period=8` can be added. Program sections are `overview`, `content`, and `configuration`; legacy `programTab=drivers` resolves to Overview with its coaching records. Top-level Programs navigation returns to All programs / Overview, while browser history restores the previous selection. Driver/Group destinations are `?analytics=drivers#analytics` and `?analytics=groups#analytics`; former `#drivers` / `#groups` aliases still resolve.

The program page's state and coach filters operate on the existing source ledger. Content shows mapped lesson metadata; Configuration is a read-only proposal. The program quick-review drawer is restored; the obsolete generated assignment composer remains retired. Its stage tabs read actual session records and pending flags. A program-level one-on-one action preselects the program, including programs with no current coaching; Cancel makes no data changes. Creating a session from the program retains its context and opens that session.

The graph/drawer restoration retains the dated trend before Coaching, current and completed history, Trend/Comparison views, and active/completed/archived session actions. The weekly trend keeps its intrinsic plot width on narrow screens and expands with text zoom, with separate week labels and local scrolling. Analytics, driver portfolios and the session evidence/lifecycle suite passed before the All programs addition; the latest acceptance below records validation of that addition.

### Historical program-drawer interpretation (superseded)

The drawer contains one identified/stage KPI strip, a factual review shortcut, the weekly event-rate trend and one coaching region with All records, Needs review, Automated active, One-on-one active, Completed and Outcomes tabs. Driver names and Open session actions here both open the individual session. Driver portfolio navigation remains unchanged in Drivers.

Outcomes restores period-scoped completion and event-rate comparison, plus the old eligible-driver, improved-share and repeat sample. The sample is explicitly undated and does not change with the period selector; it must not be presented as a measured video cohort. No session records are manufactured to fill the view.

The URL values `programPreview`, `programStage` and optional `groupPreview` preserve review context alongside the existing `record`, `period`, filters and underlying route. Example: `/?analytics=activity&programPreview=following&programStage=completed&period=8#analytics`.

`npm run test:program-drawer` validates this restoration in addition to full-page Programs and shared UI tests. The raw call notes remain unchanged; this later user correction governs the restored UI.

Final additive-navigation acceptance passed: six sidebar destinations (Automation Centre, Sessions, Analytics, Programs, Content, Settings), with Outcomes, Activity, Drivers and Groups inside Analytics. Static checks, Programs, program-drawer, browser, Sessions, Drivers and shared design suites passed. The shared alignment audit covers 66 tables and 2,578 cells. Program/sample counts, nested drawer return, manual creation/cancellation, legacy links, mobile widths and 200% text zoom are covered.

### Earlier All programs acceptance

The All programs addition passes `npm run check`, all 15 static tests, `npm run test:programs`, `npm run test:program-drawer`, and `npm run test:design`. Source comparisons cover all ten programs at 1/4/8-week scopes, every stage/method total, event-rate endpoints, mapped lessons and feed settings. The focused Programs suite covers selector/row navigation, the three tabs, browser history, legacy Drivers-tab links, KPI disclosures and exact return focus for repeated driver names. All-program and selected-program pages pass at 1440/390/320px and 200% text zoom. Configuration remains read-only.

The shared audit now covers 84 tables and 7,920 cells. Numeric sorting checks verify signed changes against the source rates, decimals, formatted values, explicit sort quantities, editable number values and missing values last in both directions. The final editable-value fallback was checked with `tests/table-alignment.mjs --numeric-only` after the full shared suite. Program, group, driver and session drawer widths and retained navigation remain covered by the shared and program-drawer suites. Local browser requests were blocked from external services before navigation.
