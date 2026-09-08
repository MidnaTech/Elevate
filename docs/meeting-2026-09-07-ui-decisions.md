# UI review decisions, September 7, 2026

> Latest correction: Groups now lives under Drivers; Programmes has Activity, Learning, Configuration and Automation. Weekly coaching and attention share a 70/30 row, with the full attention list scrollable. This document contains earlier scope/history; the [full request audit](request-audit-2026-09-07.md) records current implementation and outstanding decisions. Historical descriptions of scoring or escalation are not proof of an operational engine.


Attendees: Calvin Kattathara, Jobin. Scope: a walkthrough of the version 3.0 prototype. Every decision below has been implemented in `dist/`; the code map at the end says where.

## Decisions

### 1. One state per session

Decided: a session record shows exactly one of In progress, Replied, Overdue, Completed or Repeated. Archived remains as history. "Awaiting driver" is gone; an automated session waiting on the driver reads In progress. "Needs review" is no longer a per-record state or lifecycle word. It survives only as the name of the queue that groups Overdue, Repeated and Replied (KPI tiles, the Sessions tab, "Needs you this week"). Nothing is labelled "Awaiting session" or "Session needed".

Why: the table mixed a lifecycle word with an attention reason in the same column, so a reader could not tell whether "Needs review" meant a specific problem or a bucket. Automation now opens every session itself, so there is nothing to await and no pending flag to name.

### 2. Navigation

Decided: primary navigation is Automation Centre, Sessions, Analytics, Programs, Learning. The Settings page is removed. Its automation mode, cadence, completion policy and the draft → Run preview → Save and activate flow move to Programs › Automation, which is fleet-wide and applies to every program. The legacy `#settings` route resolves there. Content is renamed Learning (route `#learning`; legacy `#content` still resolves). The global search bar (⌘K) and its dialog are removed.

Why: after event types and coaching rules moved into programs, Settings held only two controls and had become a place people looked for program configuration that was not there. Keeping all automation behaviour under Programs means one destination answers "what will automation do". Search duplicated the Sessions and Drivers filters and had no distinct job. "Learning" describes what drivers receive; "Content" described the file type.

### 3. Automation Centre home

Decided: "Needs you this week" shows only the three grouped rows (Overdue, Repeated, Replied), never a single featured driver. The "Automation this week" card stays. A compact Programs table sits below it with Program, Overdue, Repeated, Replied, In progress, Completed and Event-rate change; rows open the full Programs page. The automation status link opens Programs › Automation.

Why: a featured driver implied a ranking the prototype cannot justify and hid the shape of the week. The three rows answer the manager's actual question (how much of each kind of problem) and the programs table shows where it is coming from without leaving the home page.

### 4. Sessions

Decided: no separate "Needs your review" card on Sessions. It was built, then removed the same afternoon because the status filters below the KPI strip already expose Overdue, Repeated and Replied. Opening an Overdue, Repeated or Replied session shows a one-line reason under the header explaining why automation opened the one-on-one (`sessionOpenReason`).

Why: the Sessions filters and the home card already read the same queue, so a second module would duplicate it, and a manager should never have to reconstruct from evidence why a one-on-one exists.

### 5. Programs

Decided: tabs are Overview, Learning, Configuration, Automation. The per-program coaching records table is removed from Programs; sessions live in Sessions, and the Overview KPI tiles and a "View sessions" link open Sessions scoped to that program. A selected program's Overview is the event-rate chart followed by Recorded outcomes. All programs Overview is the Compare programs module only. The `programState` and `programCoach` URL parameters are no longer written.

Why: the same records were browsable in two places with two sets of filters. One ledger (Sessions) keeps the state vocabulary and filters in one implementation; Programs becomes the place to compare programs and configure them.

### 6. Configuration model

Decided: configuration is per program, saved in `localStorage` (`elevate-program-settings`, `elevate-event-types`). A rule has a source (Geotab exception rule or Lytx camera event from a catalog, or Custom), name, severity (Low, Medium, High), weight (points deducted per event beyond the threshold; default Low 1, Medium 3, High 5; editable 1 to 10), threshold (free events per period), on/off, and a Direct one-on-one flag that skips the lesson. Score = 100 minus the sum over active rules of weight × events beyond the threshold, evaluated per program per period. A program score below the coaching threshold (default 75) starts an automated session. Escalation per program: Overdue after N days without acknowledgement (default 10; daily reminders start at the due date), Repeated after N repeats within N weeks of completed coaching (default 2 within 8), minimum exposure of N trips per period before a driver is scored (default 20). A reply always becomes a one-on-one. Coach routing is unchanged (one coach per program or a coach per group). The "What happens" paragraph is generated from these values. The All programs Configuration table has Program, Threshold, Rules, One-on-one after, One-on-one coach, Lessons and Delete columns.

Why: severity alone could not express that two Medium rules differ in cost, so weight is separated from severity with severity supplying a default. Escalation limits used to be prose in a tooltip; making them per-program numbers lets the generated "What happens" text be exact. Minimum exposure stops scoring drivers who barely drove.

Still true: no scoring engine runs. Program scores remain unavailable in the UI. Full details are in [program-configuration.md](program-configuration.md).

### Follow-up the same afternoon: scores and group filters

Jobin asked that each program show its own score and that group variation be a filter on existing modules rather than new charts. Implemented: a Score column in the home Programs table and the Compare programs table, a Program score tile on a selected program's Overview, the scoped Automation Centre score, and a Program select on Analytics › Groups that scopes the Coaching by group chart. Scores are recorded prototype values until rule-weight scoring exists; a per-group, per-program score is not derivable from the current fixture and was not invented.

### Follow-up: less on the Configuration page

Jobin asked for less on the Configuration tab. Removed: the Start one-on-one header action on Programs (manual one-on-ones start from Sessions) and the "What happens" paragraph, which is now the hover hint beside the Rules heading. The Program selector is hidden on the Automation tab because those settings are fleet-wide.

### Follow-up: one-on-one sessions on one page

Jobin found the Create session flow ugly and stepwise. Decided: one page, everything visible at once, in the session-workspace layout. The drawer header carries the driver identity and the Cancel / Create actions; the left pane holds Driver, Program, Coach (defaulting to the program's routing), Due, Training lesson and Reason; the right pane holds the recorded evidence for the chosen driver and program with Add events. Nothing is gated behind a prior choice; Create simply stays disabled until a driver and program exist. An open one-on-one shows an Edit action that reopens the same page with driver and program fixed and Coach, Due, Lesson and Reason editable; saving writes a history entry. Code: `dist/manual-coaching.js` (`openManualCoaching`, `saveManualCoachingEdits`), Edit action in `dist/session-workspace.js`.

## Open questions

- **Bulk reminder for Overdue groups.** The Overdue row can hold several drivers in the same program. Nobody decided whether a manager needs a one-click "send reminder to all" or whether the automated daily reminders make that redundant. Leave the row as a filter until there is evidence managers want the action.
- **Where fleet-wide cadence lives.** Mode, cadence and completion policy are now under Programs › Automation with the caption "Applies to every program". That is a tab on a page whose other tabs are scoped by a program selector, which is a mild inconsistency. Alternatives discussed were a top-level Automation destination or a section on the Automation Centre. No change for now; revisit if users look for cadence on the Automation Centre first.

## Code map

- `dist/programs.js`: tabs (`programPageTabs`), configuration (`programPageConfiguration`, `programConfigurationDetail`, `programFlowCopy`), `programPageAutomation` (Automation tab), `renderLandingPrograms` (home programs table).
- `dist/app.js`: automation mode and cadence draft state; `renderSettings` now re-renders the Automation tab; `#settings` and `#content` legacy routes.
- `dist/components.js`: `uiSessionState` returns "In progress" for automated sessions waiting on the driver.
- `dist/session-workspace.js`: `sessionOpenReason`.
- Docs revised the same day: `DESIGN_SYSTEM.md`, `docs/program-configuration.md`, `README.md`.
