# Driver spotlight

Drivers opens a driver portfolio in a drawer. It shows the driver's score and driving activity, coaching, and source safety evidence. A full session opens only through an explicit session action.

## Layout and interaction

Use the [shared drawer width](../DESIGN_SYSTEM.md#record-drawers): 1060px maximum, capped to the viewport minus an 84px gutter, and full width at 680px and below. Programs, Groups, portfolios, sessions, and session composers share that width. Keep one scrolling body, a compact identity header, and the shared controls, tokens, status vocabulary, and disclosure behavior.

| Order | Area | Content |
| --- | --- | --- |
| 1 | Header | Driver name, avatar, group, and Close. Show identity once. |
| 2 | This week | One bordered strip with the latest safety score (change and previous score inline, compact scale beneath), Miles, Trips, and Days driven, followed by daily-mile bars. Keep the observed period visible and explain the sample scope in chart help. |
| 3 | Rule breakdown | Always visible. Scope line **Recorded evidence · current sessions**, the record count, and one row per rule grouping unique source safety-evidence records from non-archived sessions. |
| 4 | Recent exceptions | Exactly two segments: Exceptions and Video, with a scope line naming the sources. Rows show title and time; expanding one reviews its video or pattern data, map, and linked session. |
| 5 | Coaching | Exactly two segments: Current sessions and Past sessions. Rows show program, due or recorded time, one status, and a visible **Open session** action. |

The weekly strip uses the full width instead of competing score and activity cards, with one compact daily-mile chart beneath. There is no coaching-cycle panel, coaching-impact strip, second history timeline, dropdown filter, or permanent metadata rail.

In the Drivers directory the whole row opens the portfolio; the driver name and **View** remain its keyboard openers. The columns are Driver, Safety score, Top event, Last coached, Status, and View.

### Coaching

**Current sessions** is the default and contains automated, one-on-one, and needs-review sessions, plus pending reviews. **Past sessions** contains completed and archived sessions.

A row shows the program with its due or recorded time on one line, one meaningful status, and a visible **Open session** action. Rows do not expand; the recorded trigger and coach live in the full session, and evidence stays in Recent exceptions.

A pending review has its own identity, shows its trigger inline, and offers **Start session**. It appears only in Current sessions. Starting and then cancelling it does not create coaching. Archived sessions remain identifiable as history rather than active work.

### Recent exceptions

**Exceptions** contains all unique source safety-evidence records associated with the driver. This includes dismissed historical evidence labeled **Dismissed**. **Video** is the subset of those events that has one or more camera clips; it is not a separate list of every camera recording. The scope line names the recording sources (for example, from Geotab).

An expanded event uses the session workspace's evidence pattern: video and map together, camera controls when multiple clips exist, or a data view for a non-video pattern. The linked-session action opens the full coaching record. Event identity and original source metadata stay intact when evidence has been shared into several sessions.

The event list precedes Coaching, so the evidence is reviewed before the coaching action beneath it. Avoid extra severity/status tabs, duplicate events for each session link, or a second footage library inside the portfolio.

### Preserving context

Opening a session preserves the portfolio's coaching scope, Exceptions/Video selection, expanded exception, active camera, and scroll position. **Back to driver** restores that context. Reply and private-note drafts belong to the separate session workspace and survive the round trip within the current page session.

Closing the portfolio restores focus to its originating Drivers control and preserves directory search and filters. The `driver` URL parameter identifies the portfolio; `record` identifies a session. These are distinct destinations even when a session is opened from the portfolio.

Keep essential states in visible words. Shared help icons explain definitions without standing paragraphs beneath each value. Controls and disclosures must work with keyboard and touch. The drawer contains focus, supports Escape and backdrop dismissal, and must not introduce horizontal page overflow.

## Score and driving observations

The directory contains 14 representative driver records, not the entire 1,024-driver fleet. It supplies identity, group, current safety score, and a recorded score change. The previous score is current score minus that change. Its comparison dates are not recorded: label the score as the latest recorded score, and do not imply its change happened during the displayed driving week. Use the directory score consistently because some insight fixtures contain different values. An unscored driver remains unscored.

`driverActivity` contains illustrative daily miles and trip observations for the 13 scored directory drivers over Aug 24–30. The This week area displays that fixture period, with sample scope explained in chart help. Miles and Trips summarize the available daily records, and Days driven reflects recorded driving days. Daily-mile bars use a zero baseline, a shared scale, and direct value labels. The chart does not imply that the sample data came from a connected telematics service.

Drivers without an activity record keep an unavailable state. Missing coverage is not zero driving. A recorded rest day may be zero, while an absent observation must remain distinguishable from it. Never interpolate a weekly score trend or infer that fewer events demonstrate safer driving without comparable trip or mileage exposure.

## Source evidence and rule counts

The event registry, not coaching status totals, supplies Rule breakdown and Recent exceptions. Deduplicate by stable source event ID before grouping or counting. One incident with Road and Cab recordings is one evidence record; one pattern spanning several trips is also one evidence record. A video count is the number of event records with footage, not the number of their clips.

Rule breakdown counts evidence from the driver's non-archived sessions, excludes evidence explicitly dismissed after review, and excludes workflow failures. Recent exceptions retains dismissed source safety history with its outcome label. For example, Drew's emergency-braking event remains available as dismissed history, while an account-link delivery failure is not a driving exception or rule violation.

Session counts, evidence-record counts, incident counts, and trip counts answer different questions. Keep their labels distinct. Priya's four-trip Geotab pattern does not establish four separately identified incidents in the evidence registry. A generic coaching program or reminder state does not establish a historical rule match.

Current event-type and coaching-rule settings describe configuration now. A historical rule evaluation requires the recorded rule version, condition, supporting event IDs, and evaluation time. Preserve original source facts if settings change or an event is shared into a session with a different program.

Media and maps follow the [session workspace data contract](session-redesign.md#data-contract). Patterns do not become video clips. Supplied media URLs and recorded coordinates drive real playback and map placement; unavailable media uses an explicit illustration, and missing coordinates do not receive an incident pin.

## Future monitoring data

Replacing sample observations with live monitoring needs stable driver and event identities, normalized timestamps and reporting timezone, coverage and freshness, and comparable observation windows. A partial week should compare equivalent elapsed periods. Dated score observations are required before showing a weekly score change or score trend.

Rates need their numerators, denominators, eligibility rules, and minimum exposure. Missing coverage remains unavailable; low exposure needs an insufficient-data state. A before/after comparison alone does not establish that coaching caused an improvement.

## References and validation

The drawer and disclosure direction was reviewed against [Midday on Mobbin](https://mobbin.com/screens/924969bd-edd1-476d-ad75-70e9a457d480) and [Lightfield on Mobbin](https://mobbin.com/screens/76496176-2e7f-4ccf-a3db-c01a422dcb59). Elevate's shared design contract remains the source for visual tokens and common controls.

With the local app running and Playwright and Chrome available, run:

```bash
npm run check
npm test
npm run test:drivers
npm run test:sessions
npm run test:browser
```

Check weekly fixture totals and missing-data states; the always-visible rule breakdown and unique evidence counts; Current/Past membership; always-visible session actions; pending-review cancellation; the Exceptions/Video subset and dismissed-history labels; whole-row opening and the Top event and Last coached columns; event and camera preview; full portfolio context restoration; session drafts; keyboard focus; and shared drawer sizing on desktop and mobile. See [README](../README.md) for browser setup.
