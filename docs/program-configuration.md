# Program configuration

Decided with Calvin on September 7, 2026. Replaces the read-only "shared draft proposal" that used to sit under Programs › Configuration, and removes event types and coaching rules from Settings.

## Model

- A **program** owns its configuration. Settings keeps only the fleet-wide automation mode and cadence.
- Each program has a **coaching threshold**: a period score out of 100. Automation starts coaching when a driver's program score falls below it. Default 75.
- Each program has **rules**, one per event feed (for example "Speeding over 80 km/h"). A rule has a **severity** (High, Medium, Low) and a **threshold**: the number of events per period that cost nothing. Each event beyond the threshold deducts the rule's severity from the program score. Only events beyond the threshold deduct; crossing it does not make earlier events count.
- Each program routes its **one-on-ones** to a coach: either one coach for the whole program, or a coach per group. Overdue, Replied and Repeated cases all go to that coach.
- The configuration page states **what happens** in plain language, generated from the current values.

## Review states

Automation opens every coaching session itself. Nothing waits for a manager to create a session, so there is no "Session needed" reason and no "Awaiting session" row. The states a person acts on are Overdue, Repeated and Replied. A reply becomes a one-on-one automatically. The overview no longer features a single driver; "Needs you this week" is the three state rows.

## Programs

- **New program** on Programs › Configuration (All programs) creates a program with no rules, no records and the default threshold, then opens its configuration.
- **Delete** removes the program, its rules and its coaching records from the workspace after a native confirmation.
- Created programs, deleted programs, rule edits and program settings persist in `localStorage` (`elevate-custom-programs`, `elevate-deleted-programs`, `elevate-event-types`, `elevate-program-settings`). Clearing local storage restores the fixture programs.

## Not built

No scoring engine runs. Thresholds and severities are stored and explained but do not yet compute a program score from events; program scores stay "unavailable" in the UI until that exists. Period type (calendar, distance, driving time), grace period length and content levels are not configurable yet.

## Code

- `dist/programs.js`: `programPageConfiguration`, `programConfigurationDetail`, `applyStoredProgramChanges`, `createProgram`, `deleteProgram`, handlers.
- `dist/app.js`: `eventTypeRules` is the rule store; `reviewCandidates` is empty; Settings drafts only mode and cadence.
- Acceptance: `npm run test:config` (`tests/program-configuration.mjs`).
