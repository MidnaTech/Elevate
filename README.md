# Elevate Autocoach

Elevate is an interactive prototype for automated driver coaching. It demonstrates how a fleet safety system can detect risky behaviour, automatically assign and track coaching, and surface only the exceptions that need a manager’s attention.

## What the prototype includes

- Automation Centre with weekly coaching results and transparent, prioritized attention
- A searchable session ledger with separate state, attention, and method dimensions and a shared reporting period
- A session workspace with video and map together, event search and sharing, and separate reply/private-note drafts
- Driver portfolios with a weekly driving overview, a rule breakdown, one coaching list, and source exception/video history
- Group-level safety views and consistent record drawers
- Analytics with Outcomes/Activity/Drivers/Groups; former program-drawer data lives directly on Programs, which starts with an All programs comparison and scopes Overview/Content/Configuration to a selected program
- Retained weekly Activity throughput and exposure-aware Outcomes report links
- Training content library
- Draft-first automation mode and cadence settings with previews and audit history
- Native tables with local narrow-screen scrolling, filter dialogs, global search, and a collapsible sidebar with saved preferences

## Automated program setup

Programs now supports guided setup and a single editable Configuration page. Review suggested connected rules, prepared course selections, deadlines and escalation limits, then save a draft or activate the local program. **Preview coaching** opens a separate sample driver/manager workflow with quiz retries, follow-up assessments, queuing, reminders and explicit manager decisions. No notifications are sent and no production scoring or LMS service is connected. See [the current program contract](docs/program-configuration.md).

Run `npm run test:config` for program setup, `npm run test:coaching` for the driver and manager scenario workflow, and `npm test` for the deterministic coaching engine. The sample course catalog has quiz content and video specifications. Authored courses can link hosted video files for native playback; scripts without media remain visibly planned previews.

**Training library** replaces the top-level Content label, retaining `#content` links. It features the supplied three-level heavy-truck speeding pack, searchable course materials, behavior/level/readiness filters, and accessible course previews for lessons, video scripts, quizzes and follow-up guides. Speeding course IDs are unchanged; version 2 incorporates the source learning content. All 12 source questions remain available for review, while assigned courses retain three questions and the agreed retry policy. No source-pack administrator proposals override program automation. Run `npm run test:library` for this workflow.

**Create course** opens a template-first editor for an ordered series of one to three courses. Each level has its own lesson, hosted video link or planned script, three-question quiz with explanations, and follow-up commitment. Start from a generic path, the supplied speeding pack, a blank course, or a saved template. Drafts autosave locally; **Add to library** validates and publishes locally, while edits to published courses require **Save new version**. Existing assignments retain their original course snapshots. Templates create independent copies with fresh IDs. Program Configuration can explicitly select a series with **Use this series**; it advances one level at a time only after course completion and a complete follow-up assessment. Missing approved levels require manager review. Run `npm run test:authoring` for creation, templates, versioning, program selection and responsive keyboard checks. This prototype does not upload or generate videos, verify remote video access, or send content to drivers.

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
dist/programs.js       First-step program review page and scoped source presentation
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
active subsets, and pending flags. With Playwright and Chrome
available, serve `dist` on port 5173 and run:

```bash
npm run test:browser
```

Set `BASE_URL` for another local port, `PLAYWRIGHT_MODULE` for an existing
Playwright module path, or `BROWSER_CHANNEL` for another installed browser channel. All browser suites block external requests before navigation, keeping fixture coordinates and data on localhost; remote map availability is outside these checks.

Run `npm run test:drivers` for driver-profile navigation, weekly chart reconciliation,
coaching filters, source evidence, pending-review cancellation, return context,
session draft preservation, focus, and drawer layout checks.
See [driver spotlight design](docs/driver-spotlight.md) for the interaction and data contract.

Run `npm run test:sessions` for event preview and selection, grouped clips,
assignment only on Send, source metadata, per-session drafts, private notes,
read-only and automatically retrying delivery states, focus, and session layout checks. The installed
[session workspace](docs/session-redesign.md) keeps evidence beside the conversation
and uses the shared record drawer width. Its sample footage and maps are explicitly
illustrative wherever source media or coordinates are unavailable.

Run `npm run test:programs` for the [Jobin review prototype](docs/programs-review.md): full-page Programs, native routing/switcher, independent program/time filters, scoped data, retained record navigation, and unavailable score/LMS metrics.

## Design-library release checks

Run `npm run test:design` for shared component, accessibility, and universal table-alignment browser checks, alongside `npm run test:browser`, `npm run test:drivers`, and `npm run test:sessions`. `npm test` includes static design-library, literal-token, contrast, and domain checks. See [migration and release evidence](docs/design-library-migration.md) for scope and limitations.

The system uses the native system sans stack; no font download or build step is required. Older screenshots and the standalone session concept under `docs/` are historical references, not the current design specification.

A standalone [shared component specimen](dist/design-library.html) is served at `/design-library.html`. It loads the production shared stylesheet/components with isolated example data; it is not an additional app destination.

Run `npm run test:program-drawer` for former program-drawer data retained inline, Analytics/Group-to-Programs navigation, session return context, manual creation, responsive layouts and text zoom.

Run `npm run test:cleanup` for consistent right-hand toolbars, accessible scope controls, disclosure placement, pagination and narrow-screen overflow. Programs opens with one compact Coaching comparison; Event rates switches that module to the retained full chart. Selected programs keep their chart and Coaching above the expandable Recorded outcomes sample.

Run `npm run test:config` for [program configuration](docs/program-configuration.md): creating and deleting programs, per-rule severity and threshold, the program coaching threshold, one-on-one coach routing (one coach or per group), local persistence, and the overview without a featured driver or an "awaiting session" row.
