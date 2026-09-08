# Full request audit — 7 September 2026

This audit records the chat requirements, including the later corrections. Passing a navigation test does not establish that every requested product behavior exists. The supplied Kevin/Calvin call notes are included; generated meeting summaries are not substitutes for the user's decisions.

## Latest layout and navigation

Primary navigation has six desktop destinations: **Automation Centre, Sessions, Programmes, Drivers, Learning and Driver app**. At **680px and below**, the bottom bar keeps Automation Centre, Sessions, Programmes and Drivers; **More** contains Learning and Driver app. Preserve the required Driver app entry and the user’s KEEP markers in `dist/index.html` and `AGENTS.md`; the app must not become route-only. Drivers has **Drivers / Groups** tabs. Programmes has **Activity / Learning / Configuration / Automation**. Groups no longer belongs to Programmes or Analytics.

Activity uses joined **70% weekly coaching / 30% drivers needing attention** panels with **zero gutter and a single divider**. The full attention list scrolls independently, and its count sits inline to the right of the heading. Panels share their top and bottom edges and stack on narrow screens. Programme and reporting-period filters scope both cards; selecting a driver or session retains its drawer flow. Legacy Groups and Analytics/Groups links resolve to Drivers / Groups.

The selected programme’s KPI and weekly-chart label is **`<programme name> score`**, such as **Speeding score**; All programmes keeps **Elevate score**. Selected scope no longer repeats a separate event-rate Trend/Comparison card. All-programme Coaching/Event rates comparison, recorded endpoints and equivalent data remain available.

This supersedes the earlier six-tab proposal, the later five-tab Programmes implementation, and the instruction to place attention below the chart on desktop. Drivers remains separate from Sessions.

## Requirement ledger

| Request | Current result | Implementation / remaining limit |
|---|---|---|
| Brighter surfaces, universal Ember action accent, 15% smaller text | Implemented | Shared design tokens; original geometry and touch targets retained. |
| Calm attention colors, fewer explanations and repeated headings | Implemented shared patterns; continued page review | Petrol attention-category marks; short semantic status labels remain. Help uses accessible hints; methodology uses disclosures. |
| Consistent numeric table headings and values | Implemented shared table helper | Numeric columns inherit matching alignment and tabular figures. |
| Collapsible sidebar; remove the old Preview control/footer switchers while keeping the Driver app destination | Corrected current contract | Six desktop destinations. At 680px and below, More exposes Learning and Driver app. Keep the user-marked Driver app sidebar and More links, direct route and standalone app. |
| Data above Sessions, Drivers and Groups | Implemented | Ledger counts, distribution, improvement highlights and group workload. Completed counts remain separate from active coaching. |
| Unified programme comparison and weekly coaching | Implemented; latest focused checks passed | All scope retains Coaching/Event rates and recorded data. Selected scope removes the separate event-rate Trend/Comparison card and names its KPI/chart `<programme name> score`; All keeps Elevate score. Programme histories stay labelled sample data. |
| Weekly coaching 70% / attention 30%, joined and scrolling | Implemented; latest focused checks passed | `program-activity.js`, `programs.css`; zero gutter, one divider, inline heading count and no five-record truncation. |
| Groups as a Drivers tab | Implemented | `index.html`, `app.js`; independent programme selector, shared period, group charts/table/drawer, scoped View drivers. |
| Driver identity opens a portfolio | Implemented | Dedicated spotlight with weekly metrics/chart; session entry remains explicit. |
| Collapsed rules; one coaching filter; recent Exceptions/Videos | Corrected | Week → collapsed rules → Coaching → Recent exceptions. All programmes / Active / Completed / Archived filter. |
| Every programme represented in driver portfolio, with View/Create | Implemented UI | One programme list including programmes without sessions; expandable session history. Programme-period scores remain unavailable without recorded observations. |
| All drawers same width | Implemented | Shared 1060px maximum, responsive full-width drawers. Session creation uses the same right-side, full-height drawer and width. |
| Driver table Action replaces Method | Implemented | View session or Create session is separate from the profile action. |
| Simplified manual coaching; load relevant driver evidence | Corrected | Only Driver and Programme inputs; current manager is the read-only Coach. No Due, Training lesson or Reason inputs during creation. Matching driver/programme videos and all cameras select automatically, including undated clips; non-video patterns retain the configured observation period. First video previews automatically. Create commits links and opens the session over the source page. |
| Due as a global setting | Implemented locally | Session due period under Programmes → Automation uses the existing draft, preview, discard and save flow. Seven-day default; new sessions inherit the saved value. Existing deadlines and unsaved drafts remain separate. |
| Automatically attach clips belonging to an event; find driver/unassigned events | Implemented locally | Whole-event camera groups, preview/map, selection and cancellation, source-preserving linkage on Create/Send. |
| Less repeated session content, footage with map | Implemented | Events and Videos in a compact summary; no Messages count. A programme-named behaviour breakdown, separate event/video sections, map/video side by side, collapsed secondary history and a taller conversation area. |
| Automated watch + acknowledgement; review becomes one-on-one | Corrected local model | Private notes for automatic sessions, explicit one-on-one handoff; separate delivery mode and immutable creation origin. Watch and acknowledgement are both required to complete an automated session. |
| Requesting review must not penalize score | Corrected | Removed workflow-derived score penalties. Review flag is separate; no new score formula is invented. |
| Matching method and lifecycle totals everywhere | Corrected | Method totals describe current delivery, including escalated one-on-ones. Active methods exclude review/completed. Creation-origin counts remain separately named. |
| Horizontal Mode/Cadence | Implemented | Shared automation layout retains draft/discard/save. Preview is explicitly configuration-only, not a claimed rule run. |
| Per-programme calendar/distance/driving-duration periods; fortnightly calendar default | Implemented configuration | Local policy data and controls. Fresh fleet cadence defaults to two weeks; saved selections remain respected. Distance/time event matching needs exposure records. |
| Fractional rule weights and persistently disabled rules | Corrected | Fractional input supported. An explicitly empty rule list no longer restores defaults on reload. |
| Lesson escalation levels, manual handoff, reset, grace and reminders | Configuration implemented; execution pending decision | Local level-to-video mapping and policy controls exist. No automatic evaluator or scheduler is claimed. Advance/reset semantics are awaiting the user's answer. |
| Video library upload/link/edit and programme/level mapping | Implemented locally | Metadata in localStorage, video files in IndexedDB, external-link preview. No cloud upload or distribution implied. One video can be reused at several levels. |
| Quizzes and assignments later | Corrected | Removed required quiz from current automation and learning policy. |
| Programme LMS/cohort effectiveness | Partial | Explicitly recorded assignment/watch/acknowledgement/session-completion facts and legacy undated samples retained. Completion duration, attempts and video-cohort trajectories are unavailable. |
| Per-driver programme score and weighted overall score | Pending data/formula | Existing recorded overall/programme aggregates retained. No fabricated driver scores or exposure-weighted rollup. Customer weight configuration and an evaluator still require completion. |
| Preserve old useful charts, data, drawers and return navigation | Implemented within available sources | Programme samples/outcomes and group charts retained. Historical unsupported metric claims are not presented as current observations. |
| Mobbin/reference research and shared design language | Prior and fresh reference review | The governing library retains earlier research. The creation drawer and conversation repair also reviewed Front, Acctual, Midday, Plain and Zendesk screens in Mobbin; see session-drawer-review.md. |

## Questions still open

1. Exact programme-score normalization, exposure units and treatment of acceptable event baselines. Until defined, unavailable driver programme-period scores remain unavailable.
2. What advances a ladder level, and confirmation that N consecutive above-threshold periods reset it. The call's 1,000km × 3 versus 1,500km example conflicts.

The user has been asked these specific questions. Their answers are required for the dependent evaluator; the UI and navigation work can proceed independently.

## Explicitly deferred scope

No GCP architecture/configuration, ingestion, operational scheduler, live video distribution or verified playback integration has been built or changed. The call requires UI signoff before that work. The separate driver's “marked watched” action is a labelled local prototype signal, not proof of video playback. Cohort-impact claims need actual longitudinal observations.

## Validation

Latest focused run reported by the implementing agent: `npm run check`, `npm test` (15 tests), `test:groups`, `test:workspace`, `test:programs`, `test:program-drawer` and `test:design` passed. Shared design checked 108 tables and 2,844 cells; navigation checks covered eight widths from 320–1440px. These results are separate from the earlier repair results below.

The latest required checks cover six desktop destinations, mobile More with Learning and Driver app, zero-gutter/single-divider 70/30 geometry, inline attention counts, dynamic programme score labels and removal of only the selected event-rate card. `test:workspace` checks all programme scopes and reporting windows, full attention membership, session return, historical routes and responsive/text-zoom layouts. `test:groups` checks scrolling to the last attention entry, moved Groups tabs, independent scoped group counts, group → programme → back, View drivers, reload and narrow layouts. `test:sessions`, `test:drivers`, `test:driver` cover evidence drafts, portfolio behavior and local delivery handoff. Policy/library tests cover persistence and mapping; shared design/cleanup checks cover tokens, controls and tables. Run results for this repair are reported after the actual checks, not inferred from historical passing suites.

### Historical results — earlier 7 September repair

This run predates the latest Driver app navigation, zero-gutter Activity and selected-chart correction. It is retained as historical evidence, not a passing result for those changes.

Passed: `npm run check`, `npm test` (15 tests), `test:workspace`, `test:groups`, `test:sessions`, `test:drivers`, `test:driver`, `test:browser`, `test:policy-learning`, `test:config`, `test:programs`, `test:program-drawer`, `test:design`, `test:cleanup`, and `git diff --check`. Shared design checks inspected 114 tables and 2,788 cells, narrow layouts, 200% text zoom, focus and uniform drawer widths. The final session tests cover cancellation without ledger mutation, preserved drafts and source navigation, progressive creation fields, compact counts and separate pattern events. A final visual check confirmed a 49px Events/Videos summary, a full-height 1060px creation drawer on desktop and no page script errors. These checks validate the local prototype, not the deferred operational evaluator or production integrations.
