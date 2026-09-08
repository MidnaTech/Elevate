# Elevate Autocoach

Current workspace: Automation Centre, Sessions, Programmes, Drivers, Training library and Driver app. Drivers contains Drivers / Groups; Programmes contains Activity / Learning / Configuration / Automation. Activity joins weekly coaching and attention in a 70/30 row with zero gutter and one divider; the attention count stays beside its heading. At 680px and below, More exposes Training library and Driver app. See the [full request audit](docs/request-audit-2026-09-07.md) for completion status, local-only features and unresolved scoring rules. Run `npm run test:groups` for the moved tab and drawer paths.


Elevate is an interactive prototype for automated driver coaching. It demonstrates how a fleet safety system can detect risky behaviour, automatically assign and track coaching, and surface only the exceptions that need a manager’s attention.

## What the prototype includes

- Automation Centre with weekly coaching results, the three grouped review rows (Overdue, Repeated, Replied) and a compact per-program table
- A searchable session ledger where each record shows one state (In progress, Replied, Overdue, Completed, Repeated), a Coach dimension and a shared reporting period
- A session workspace with video and map together, event search and sharing, and separate reply/private-note drafts
- Driver portfolios with a weekly driving overview, a rule breakdown, one coaching list, and source exception/video history
- Group-level safety views and consistent record drawers
- Programmes combines the former Analytics and Programs workspaces: Activity, Learning, Configuration and Automation; Groups belongs to Drivers
- Activity starts with seven current summary values, joined 70/30 weekly coaching and attention panels, All-programme comparison/Event rates and collapsed retained outcomes; selected scope uses `<programme name> score` in its KPI/chart and has no separate event-rate Trend/Comparison card
- A standalone Drivers directory with scoped portfolio/session actions; Groups coaching workload follows programme/time scope while recorded group scores remain explicitly overall
- Fleet weekly snapshots and visibly labelled sample programme histories, with source caveats and equivalent chart data
- Training library of courses, quizzes and reusable templates, with a template-first Create course editor; drafts and published series stay in this browser
- Three delivered heavy-truck speeding course videos (60, 90 and 120 seconds, captioned, with posters and WebVTT tracks) under `dist/media/courses/speeding/`, playable from the Training library preview, Programmes › Learning and the Driver app; see [the media notes](dist/media/courses/speeding/README.md)
- Guided program setup on Programmes › Configuration (name and focus, connected rules, coaching plan, review and activate) with locally saved, versioned policies; fleet-wide draft-first automation mode and cadence on Programmes › Automation with previews and audit history
- Native tables with local narrow-screen scrolling, filter dialogs, and a collapsible sidebar with saved preferences

Primary navigation has six desktop destinations: **Automation Centre, Sessions, Programmes, Drivers, Training library and Driver app**. At **680px and below**, the bottom bar keeps Automation Centre, Sessions, Programmes and Drivers; **More** contains Training library and Driver app. Preserve the required Driver app entry and the user’s KEEP markers in `dist/index.html` and `AGENTS.md`; the app must not become route-only. The full Learning library remains separate from programme lesson mappings. There is no separate Settings page or global search bar. Canonical `#programs` opens Activity; other tabs use `programTab=content|configuration|automation`. Legacy Analytics/Outcomes/Activity links migrate to Activity, `analytics=groups` and legacy `programTab=groups` to Drivers / Groups (`driversTab=groups`), and `analytics=drivers` to standalone `#drivers`. Legacy `#settings` and `#content` resolve to Programmes › Automation and Learning. Preserve scope, filters and linked records during migration. The required Driver app sidebar and mobile More entries open `#driver-app`; direct access and standalone `/driver/` also remain available.

## Run locally

No build step is required. Serve the `dist` directory with any static web server. For example:

```bash
python3 -m http.server 4173 --directory dist
```

Then open `http://localhost:4173`.

## Verify changes

```bash
npm run check
npm test
```

## Repository structure

```text
.openai/hosting.json   ChatGPT Sites project configuration
dist/index.html        Application markup
dist/styles.css        Application layout in the legacy composition layer
dist/design-system.css Literal foundation tokens, shared components and accessibility
dist/design-system.js  Shared icons, tooltips, and interaction helpers
dist/components.js     Shared KPI, status, table, and native-control components
dist/charts.js         Reusable source-backed SVG chart rendering
dist/design-library.html Isolated shared-component review specimen
dist/programs.js       Programmes workspace, comparison/event rates, mappings, local configuration and fleet Automation
dist/program-activity.js Scoped Activity chart, attention and retained outcomes with sample-history provenance
dist/app.js            Mock data and interactions
dist/session-evidence.js   Event/clip identity and source metadata
dist/session-workspace.js  Session evidence, conversation, and draft behavior
dist/session-workspace.css Session workspace layout
```

## Status

This repository contains a front-end product prototype with mock data. It is intended for product design, workflow validation, and demonstrations; it does not include a production backend or live fleet integrations.

## UI review and browser checks

Read the governing [Elevate Autocoach Design Library](Elevate-Autocoach-Design-Library.md) and the [local design contract](DESIGN_SYSTEM.md) before UI changes. The library supplies the exact Ember-orange, neutral-surface, petrol-data system and shared native components. The local contract preserves product behavior and the uniform 1060px record-drawer width. The [UI review](docs/ui-review.md) records the review findings and implementation scope.

The optional browser smoke check exercises navigation, filters, tooltips, drawers,
responsive layouts, source metric reconciliation, and script/style integration. The
[metric definitions](docs/metric-definitions.md) distinguish actual session totals,
active subsets, and source windows. Current ledger records govern over historical pending-flag arithmetic. With Playwright and Chrome
available, serve `dist` on port 5173 and run:

```bash
npm run test:browser
```

Set `BASE_URL` for another local port, `PLAYWRIGHT_MODULE` for an existing
Playwright module path, or `BROWSER_CHANNEL` for another installed browser channel. All browser suites block external requests before navigation, keeping fixture coordinates and data on localhost; remote map availability is outside these checks.

Run `npm run test:drivers` for driver-profile navigation, weekly chart reconciliation,
coaching filters, source evidence, scoped session actions, return context,
session draft preservation, focus, and drawer layout checks.
See [driver spotlight design](docs/driver-spotlight.md) for the interaction and data contract.

Run `npm run test:sessions` for event preview and selection, grouped clips,
assignment only on Create/Send, source metadata, per-session drafts, private notes,
read-only and automatically retrying delivery states, focus, and session layout checks. The installed
[session workspace](docs/session-redesign.md) keeps evidence beside the conversation
and uses the shared record drawer width. Its sample footage and maps are explicitly
illustrative wherever source media or coordinates are unavailable.

Run `npm run test:workspace` for the six-destination navigation, mobile More, joined Activity panels, Programme/Period scope across all ten programmes and 1/4/8-week windows, ledger/unique-driver/attention reconciliation, labelled sample history and exact session returns. It also checks that earlier programme sample counts reconcile to their corresponding fleet snapshots without treating score as a weighted roll-up.

Run `npm run test:programs` for the [Programmes review prototype](docs/programs-review.md): merged tabs and native routing, independent programme/time scope, current ledger totals, retained chart/outcome data, labelled sample history, record navigation and unavailable metrics.

## Design-library release checks

Run `npm run test:design` for shared component, accessibility, and universal table-alignment browser checks, alongside `npm run test:browser`, `npm run test:drivers`, and `npm run test:sessions`. `npm test` includes static design-library, literal-token, contrast, and domain checks. See [migration and release evidence](docs/design-library-migration.md) for scope and limitations.

The system uses the native system sans stack; no font download or build step is required. Older screenshots and the standalone session concept under `docs/` are historical references, not the current design specification.

A standalone [shared component specimen](dist/design-library.html) is served at `/design-library.html`. It loads the production shared stylesheet/components with isolated example data; it is not an additional app destination.

Run `npm run test:program-drawer` for former programme-drawer data retained on the page, legacy/source navigation, session return context, responsive layouts and text zoom. The historical command name does not imply a restored programme modal.

Run `npm run test:cleanup` for consistent right-hand toolbars, accessible scope controls, disclosure placement, pagination and narrow-screen overflow. Activity joins weekly coaching and attention with zero gutter and one divider, followed by the All-programme comparison/Event rates module when applicable and collapsed outcomes. Selected programmes have no separate event-rate card; their recorded rates remain available in the All-programme comparison and equivalent data. Activity and Groups use Programme/Period controls; Learning and Configuration omit irrelevant time controls; Automation is fleet-wide.

Run `npm run test:config` for [program configuration](docs/program-configuration.md): migration of existing programs into versioned policies, the four-step guided setup, drafts, activation, versioned edits to active programs, inline rule creation and validation, and stable course mappings. Run `npm run test:library` for the Training library (renamed navigation, source-backed heavy-truck speeding pack, search and filters, course previews with quiz feedback, imported lessons marked incomplete) and `npm run test:authoring` for Create course: templates, ordered levels, local publishing, Save new version, and Use this series on a program. `npm test` includes the deterministic coaching catalog and course-authoring store checks. The coaching scenario simulator from the `codex/automated-program-setup` branch is not included. The speeding course previews and the Driver app player use the delivered course videos; a programme's approved course pool (Programmes › Configuration) decides which course a driver is assigned, while every produced course stays browsable under Learn in the Driver app.

The [September 7, 2026 UI decision log](docs/meeting-2026-09-07-ui-decisions.md) records the review decisions behind earlier navigation, session states and programme settings. The latest governing navigation amendment is in [DESIGN_SYSTEM.md](DESIGN_SYSTEM.md): Programmes merges Analytics/Programs and Drivers stays standalone.

The [driver app](docs/driver-app.md) is the iOS coaching app drivers see, built from the imported Claude Design source under `docs/design-import/`. The required **Driver app** desktop and mobile More entries open `#driver-app`, which renders only the app, linked to the same sessions: marking a session reviewed, completing the mapped lesson and replying from the phone update Sessions and the Automation Centre, and manager replies reach the phone thread. It also runs standalone at `/driver/`. Run `npm run test:driver` for the standalone screens, the linked ledger effects, replay, reset and private-note isolation. The document lists what the design shows that Elevate cannot supply yet and what linked mode hides for now.

**Historical validation — earlier September 7 Programmes merge, before the latest navigation/layout correction:** the merge passed `npm run check`, all 15 static tests, `test:workspace`, `test:programs`, `test:program-drawer`, `test:browser` with metric reconciliation, `test:drivers`, `test:sessions`, `test:config`, `test:driver`, `test:design` and `test:cleanup`. Shared alignment covered 126 tables, 2,860 cells, 24 numeric inputs and 486 sort headers. Design checks cover 320/390/1440px, 200% text zoom, reduced motion and forced colors; linked Driver app changes refresh Programmes and Drivers. These earlier results do not claim that the six-destination, joined-panel and selected-chart correction has passed its latest checks. They use local prototype data and blocked external requests, so they do not validate live integrations, production scoring or causal coaching outcomes. See [current acceptance](docs/programs-review.md#current-acceptance-requirements); earlier historical results remain attributed to their own builds.
