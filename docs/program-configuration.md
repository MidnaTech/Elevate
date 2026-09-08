# Program configuration

> Latest correction: Groups now lives under Drivers; Programmes has Activity, Learning, Configuration and Automation. Weekly coaching and attention share a 70/30 row, with the full attention list scrollable. This document contains earlier scope/history; the [full request audit](request-audit-2026-09-07.md) records current implementation and outstanding decisions. Historical descriptions of scoring or escalation are not proof of an operational engine.


## Current implementation: guided setup and versioned policies

Programs › Configuration and Programs › Learning are rendered by `dist/program-setup.js` (ported from `codex/automated-program-setup` on September 7, 2026). A program is a **policy** with a stable ID, behavior, connected rules (severity and tolerated event allowance), an assessment interval, a coaching score threshold (75 is an editable sample default), an approved course pool, a cycle limit and a coach. Policies live in `localStorage` under `elevate-program-policies-v1`; existing fixture programs and their `elevate-event-types` rules migrate additively on first load, and imported lesson metadata is preserved as incomplete courses.

- **New program** (Configuration, or **Set up a program** on the Training library) opens a four-step setup: name and focus, connected rules, coaching plan, review and activate. The draft persists locally between steps.
- A saved program has one editable Configuration page. Changes to an active program require **Save changes**, increment the policy version and apply to future work only.
- Programs › Learning lists the approved course pool for the selected program with the same stable course IDs used in Configuration.
- The **Training library** (navigation label; route `#learning`, `#content` remains an alias) lists courses and templates with behavior, level and readiness filters, course previews (lesson, video script, quiz, follow-up) and **Create course**, a template-first editor backed by `dist/course-authoring-store.js` (`elevate-course-authoring-v1`). **Use this series** on a program replaces its approved pool with the series' ordered levels.
- **Course media.** The three heavy-truck speeding videos delivered on September 8, 2026 live in `dist/media/courses/speeding/` (captioned MP4 masters at 2560x1440, 1280 px JPEG posters, WebVTT captions, and a manifest with the CloudFront links to the clean masters). `dist/speeding-course-pack.js` references them per level (`levels[].media`), the catalog marks those courses as linked video rather than preview-only, the Training library and Programmes › Learning previews play them with a native `<video>` and captions track, and the Driver app plays them in its lesson player. A driver's assigned lesson follows the programme's approved course pool; imported programmes start with only their legacy lesson until courses are approved in Configuration. Every produced course is browsable under Learn in the Driver app regardless.
- `dist/coaching-engine.js` supplies the behavior, rule and course catalog and policy validation. Its scenario simulator and the Preview driver journey dialog are not wired into this build; nothing scores events, schedules work or contacts drivers.
- Acceptance: `npm run test:config`, `npm run test:library`, `npm run test:authoring`; `npm test` covers the catalog and store.

The per-rule weight, escalation and evaluation-period cards described below remain in `dist/programs.js` and `dist/program-policy.js` as data the one-on-one flow still reads, but they are no longer rendered on Configuration.

Decided with Calvin on September 7, 2026 and refined in the same-day UI review with Jobin (see [meeting-2026-09-07-ui-decisions.md](meeting-2026-09-07-ui-decisions.md)). Replaces the read-only "shared draft proposal" that used to sit under Programs › Configuration, removes event types and coaching rules from the former Settings page, and moves the remaining fleet-wide automation settings to Programs › Automation.

## Model

A **program** owns its configuration. Everything below is stored per program in `localStorage` (`elevate-program-settings` for thresholds, escalation and coach routing; `elevate-event-types` for rules). Fleet-wide automation mode, cadence and completion policy are not part of this model; they live on Programs › Automation and apply to every program.

### Rules

A program has zero or more rules. Each rule has:

| Field | Meaning | Values |
| --- | --- | --- |
| Source | The feed the rule listens to | A Geotab exception rule or a Lytx camera event picked from the catalog, or Custom |
| Name | What the rule is called in tables and in the "What happens" text | Free text |
| Severity | How serious one event is | Low, Medium, High |
| Weight | Points deducted from the program score per event beyond the threshold | 1 to 10. Choosing a severity sets the default weight (Low 1, Medium 3, High 5); the weight can then be edited independently |
| Threshold | Free events per period; events up to and including this number cost nothing | 0 to 50 |
| On/off | Whether the rule is active | Only active rules score |
| Direct one-on-one | Skip the lesson and open a one-on-one immediately when this rule fires | Flag |

Only events beyond the threshold deduct; crossing the threshold does not make earlier events count.

### Score

Each period, for each program, a driver's score is:

    score = 100 minus the sum over active rules of (weight x events beyond the threshold)

Each program has a **coaching threshold**, a score out of 100 (default 75). When a driver's program score falls below it, automation starts a session. A rule marked Direct one-on-one opens a one-on-one without a lesson as soon as it fires, regardless of the score.

Worked example. A Speeding program has three active rules:

| Rule | Severity | Weight | Threshold | Events this period | Beyond threshold | Deduction |
| --- | --- | --- | --- | --- | --- | --- |
| Speeding over 80 km/h | High | 5 | 2 | 5 | 3 | 15 |
| Posted speed limit | Medium | 3 | 4 | 6 | 2 | 6 |
| Harsh braking | Low | 1 | 3 | 2 | 0 | 0 |

Score = 100 minus (15 + 6 + 0) = 79. With the default coaching threshold of 75, this driver is not coached this period. One more event over 80 km/h would take the score to 74 and start an automated session.

### Escalation

Each program also sets when an automated session stops being automated:

| Setting | Meaning | Default | Range |
| --- | --- | --- | --- |
| Overdue after | Days without acknowledgement before the session is Overdue and becomes a one-on-one. Daily reminders start at the due date and run until this limit | 10 days | 1 to 60 |
| Repeated after | Number of repeats within a window of weeks after completed coaching before the driver is Repeated and a one-on-one opens | 2 repeats within 8 weeks | 1 to 10 repeats, 1 to 52 weeks |
| Minimum exposure | Trips in the period a driver must have before they are scored at all | 20 trips | 0 to 500 |

A reply from the driver always becomes a one-on-one; that is not configurable.

### Coach routing

Each program routes its one-on-ones either to one coach for the whole program or to a coach per group. Overdue, Replied and Repeated cases, and Direct one-on-one rules, all go to that coach. This is unchanged from the earlier decision.

### What happens

The configuration page states **what happens** in plain language, generated from the current values (`programFlowCopy`): number of active rules, minimum exposure, the coaching threshold and mapped lesson, the Overdue limit, the reply rule, the Repeated limit, and any Direct one-on-one rules.

## Layout

A selected program's Configuration tab reads top to bottom: the full-width Rules table with Add rule (the info icon beside the Rules heading shows the generated "What happens" text on hover or focus), then one row of three settings cards (Coaching threshold with the exposure floor, One-on-one escalation, One-on-one coach). Each card has a title, a one-line purpose, and label-left / control-right rows, the same anatomy Linear and Plain use for automation settings. Cards wrap to a single column below about 60rem.

## Review states

Automation opens every coaching session itself. Nothing waits for a manager to create a session, so there is no "Session needed" reason and no "Awaiting session" row. A session record shows exactly one of In progress, Replied, Overdue, Completed or Repeated (Archived remains as history). An automated session waiting on the driver reads In progress; "Awaiting driver" is gone. The states a person acts on are Overdue, Repeated and Replied, and "Needs review" is only the name of the queue that groups those three (KPI tiles, the Sessions tab, "Needs you this week" on the Automation Centre and "Needs your review this week" on Sessions). Opening one of those sessions shows a one-line reason under the header explaining why automation opened the one-on-one (`sessionOpenReason` in `dist/session-workspace.js`).

## Programs

- Tabs are **Overview, Learning, Configuration, Automation**. The Program selector applies to the first three; Automation is fleet-wide.
- Programs no longer hosts a coaching records table. Sessions live in Sessions; the Overview KPI tiles and a "View sessions" link open Sessions scoped to that program. The `programState` and `programCoach` URL parameters are no longer written.
- All programs Overview is the Compare programs module only. A selected program's Overview is the event-rate chart followed by Recorded outcomes.
- All programs Configuration shows one table with columns Program, Threshold, Rules, One-on-one after, One-on-one coach, Lessons, Delete, plus **New program**, which creates a program with no rules, no records and the default threshold and escalation, then opens its configuration.
- **Delete** removes the program, its rules and its coaching records from the workspace after a native confirmation.
- Programs › Automation carries the fleet-wide automation mode, cadence and completion requirements with the draft → Run preview → Save and activate flow that used to be on Settings. The legacy `#settings` route resolves here, as does the automation status link on the Automation Centre.
- Created programs, deleted programs, rule edits and program settings persist in `localStorage` (`elevate-custom-programs`, `elevate-deleted-programs`, `elevate-event-types`, `elevate-program-settings`). Clearing local storage restores the fixture programs.

## Not built

No scoring engine runs. Rules, weights, thresholds and escalation settings are stored and explained but do not yet compute a program score from events; program scores stay "unavailable" in the UI until that exists. The worked example above is arithmetic on the documented formula, not output from the prototype. Period type (calendar, distance, driving time) and content levels are not configurable yet. Whether Overdue groups need a bulk reminder action is still open.

## Code

- `dist/programs.js`: `programPageTabs`, `programPageConfiguration`, `programConfigurationDetail`, `programFlowCopy`, `escalationDefaults`, `escalationLimits`, `ruleWeight`, `applyStoredProgramChanges`, `createProgram`, `deleteProgram`, `programPageAutomation` (Automation tab), `renderLandingPrograms` (Automation Centre programs table), handlers.
- `dist/app.js`: `eventTypeRules` is the rule store; `reviewCandidates` is empty; automation mode and cadence draft state stay here and `renderSettings` re-renders the Automation tab.
- `dist/components.js`: `uiSessionState` returns the single record state and reads "In progress" for automated sessions waiting on the driver.
- `dist/session-workspace.js`: `sessionOpenReason`.
- `dist/program-setup.js`, `dist/training-library.js`, `dist/course-builder.js`, `dist/course-authoring-store.js`, `dist/coaching-engine.js`, `dist/speeding-course-pack.js`: guided setup, Training library and course authoring (see above).
- Acceptance: `npm run test:config` (`tests/program-configuration.mjs`), `npm run test:library`, `npm run test:authoring`.
