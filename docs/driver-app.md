# Driver app

The iOS coaching app drivers see. It is a separate surface from the manager workspace with its own
design, implemented from the Claude Design source [Elevate.dc.html](design-import/Elevate.dc.html)
(project `d1f1f34b-e5e1-4f70-a9d4-043d48688149`, imported September 7, 2026).

## Navigation (do not remove)

**Driver app** is a required, clickable sidebar destination (and a matching mobile More entry), decided by
the product owner (Calvin) on September 7, 2026. It is not a route-only page. The sidebar item lives in
`dist/index.html` between Learning and More, wrapped in `<!-- KEEP: Driver app ... -->` comments;
`dist/driver-link.js` registers the `#driver-app` route and renders `#view-driver`. Do not remove or hide
either entry. If a change seems warranted, ask Calvin first. This is also stated in `AGENTS.md`.

At 681px and above, all six destinations remain available in the expanded or collapsed sidebar;
collapsed icons retain hover and keyboard-focus names. At 680px and below, the bottom navigation
shows Automation Centre, Sessions, Programmes, Drivers and More. More contains Learning and Driver
app, and marks the current location when either is active. Escape closes the sheet and restores focus
to More. The direct `#driver-app` route remains valid at every width.

## Where it runs

| Entry | What renders |
|---|---|
| **Driver app** in the manager navigation (`#driver-app`, also in the mobile More sheet) | The app alone, edge to edge, linked to the workspace's sessions. No preview chrome, captions or instructions. |
| `/driver/index.html` | The same app as a standalone page: a centred device frame on wide screens, full-bleed on a phone. |

Files: `dist/driver/index.html`, `dist/driver/driver.css`, `dist/driver/driver.js` (the app) and
`dist/driver-link.js` (the manager-side link, loaded after `app.js`). No build step.

The app loads Bricolage Grotesque and Instrument Sans from Google Fonts with system fallbacks. That is
the design's own type and applies only to this surface; the manager workspace keeps the native stack.
Browser tests block external requests, so they exercise the fallback stack.

## Screens

Home (score, session to action, where you stand, lesson), Coaching (open and history), Session detail
(status, evidence, what happened, assigned lesson, coach, mark reviewed), Learn (the assigned lesson first,
then the whole Elevate lesson library to watch freely; library viewing is remembered on the phone only and
never recorded in Elevate), Lesson player, Messages
(one thread per session), Session thread, Your score, Program drill-down, How your score works, plus
the in-trip nudge and post-trip review overlays and the coach roster. Routes are addressable on the
standalone page (`#home`, `#sessions`, `#detail/<id>`, `#learn`, `#thread/<id>`, `#analytics`,
`#behaviour/<key>`, `#scoring`, `#coach`, `#coachview`, `#nudge`, `#posttrip`, `#player`).

## Programme model

The app is organized by **programme** (the manager's behaviour categories: Following distance, Speeding,
Harsh braking, Distracted driving, Seat belt use, and so on), not by an anonymous "session to action".

- **Home** leads with the programme that needs the driver ("1 programme needs you · Speeding") and lists
  "Your programmes" with each programme's own score.
- **Your score** shows the Program breakdown: one row per programme the driver has activity in, with the
  programme's score, event count and status, ordered as the fleet orders its categories.
- Tapping a programme opens its **breakdown**: the score, what was recorded, the mapped lesson, and every
  session and event attributed to that programme.
- **Learn** lists the assigned lesson first, then the whole library grouped by programme.

**Per-programme score.** Elevate stores one Elevate score per driver, not one per programme, so the
per-programme number is an illustrative composite: it starts at 100 and subtracts a penalty for the
programme's worst open status (Overdue 34, Repeated 24, Replied 18, In progress 12, Completed 4) plus a
small amount per event beyond the first. A coached programme reads in the 90s (green); an overdue one
reads lower (orange). The manager publishes it in the snapshot and the app recomputes it if a snapshot
predates the value. When Elevate publishes real per-programme scores, swap this composite for them.

## Two data modes

- **Linked** (default whenever the manager workspace has published data): a real Elevate driver,
  their coach, sessions, evidence, mapped lesson and messages. Opened from the workspace it shows
  Priya Singh, whose speeding session is overdue. Features Elevate cannot supply are hidden (below).
- **Design** (`?mode=design`, or when nothing has been published): the design file's fixture driver
  Dana R with every screen populated, including the parts Elevate does not have yet.

## How the two surfaces stay linked

The manager workspace writes a snapshot to `localStorage['elevate.driver-app.link']` on load, every
two seconds when the ledger changed, and after every driver action. The snapshot carries drivers with
an open session that has evidence or a conversation: name, coach (session owner), Elevate score and
change (from the coaching insights), programs, and each session's state, due date, summary, mapped
lesson, evidence as text (no coordinates) and messages. Private manager notes are never included.

Driver actions are appended to `localStorage['elevate.driver-app.events']` and posted to the parent
window when embedded. The manager applies each once to the same session objects that Sessions, the
Automation Centre and the record drawer render:

| Driver action | Ledger effect |
|---|---|
| Opens a session | History: "Opened in driver app". |
| Got it — mark reviewed | History and system message "Session accepted". An Overdue or Repeated record leaves Needs review and returns to Automated (in progress); the matching Automation Centre item is resolved. |
| Mark lesson complete | State Completed, "Training completed · acknowledgement received · <lesson>", SLA Met (Missed when it had been overdue). |
| Sends a message | Message appended as the driver; an open record becomes Driver replied · Needs review and a new attention item is raised. |

Manager replies from the record reach the phone thread on the next snapshot (within two seconds).
Recorded actions replay when the workspace reloads so both sides agree. Open the workspace with
`/?reset=1#driver-app` to clear them, or call `elevateDriverLink.reset()`.

## What Elevate cannot supply yet

Each row is something the design shows that the current Elevate system does not hold. Linked mode
hides it; Design mode still shows it for review.

| Design element | In Elevate today | Linked mode | Recommendation |
|---|---|---|---|
| In-trip nudge (live speed, posted limit, "ease off") | No live telemetry; flagged events arrive after the trip | Hidden | Take out until a telematics stream exists. Needs a vehicle-side integration, not an app change. |
| Post-trip review sheet ("trip complete · 42 min · 31 km", per-trip moments) | No trip records or per-trip event lists | Hidden | Take out. Could return as "new session" push once sessions are created per trip. |
| Daily score sparkline (M–S bars) | One Elevate score per driver with a previous value, no dated history | Replaced by a meter against the fleet target | Keep the meter; add the sparkline when the score is stored per week. |
| Per-behaviour trends (−3 pts vs last period) and dated verdicts | Per-rule evidence counts only; no stored per-rule score or trend | Program breakdown shows an illustrative per-programme score (see Programme model) plus event count and status; no trend arrow | Replace the composite with real per-program scores and add trends when the scoring model publishes them. |
| Score composition bar (Speed −7, Braking −4 …) | Not derivable | Hidden | Take out until per-program point attribution exists. |
| Streak and clean-trip tiles, "Top 22% of your group" | No per-driver trip exposure or group percentile | Hidden | Take out for now; group averages exist at fleet level only. |
| "Two things that help" coach tips, speed-vs-limit chart, event narrative with speeds | No per-event narrative or speed trace | Hidden; the session summary is the narrative and the mapped lesson carries guidance | Keep the summary; tips would need coach-authored text per session. |
| Event clip with camera label and scrubber | Only sessions with video evidence (Lytx) | Placeholder clip for video evidence; a telematics pattern card otherwise | Keep; wire to actual media URLs when supplied. |
| Incident map | Fixture coordinates exist for a few sessions | Placeholder with the location text; no pin drawn | Keep as a labelled placeholder until GPS is supplied. |
| Assistant quick answers in the thread | No assistant connected | Hidden; questions go to the coach | Take out for now. |
| Scoring weights (30% / 20% …) and "what never affects it" rules | Programs exist; weights are not published | Programs listed without weights; policy copy kept | Publish weights from program configuration when available. |
| Lesson chapters, coach notes in the player | Lesson titles and lengths only; notes come from manager messages | Chapters are illustrative; the latest manager message is the note | Replace chapters with real lesson metadata when the LMS exposes it. |
| Coach roster (coach side) | Drivers and open sessions exist | Real drivers, scores and open-session counts | Keep as the coach-side sketch. |
| Dispute action | Not in the session model | Replaced by "message your coach" copy | Add when disputes become a session state. |

Available today and used as-is: driver identity, coach (session owner), Elevate score and change,
programs, session state and due date, summaries, evidence titles and locations, mapped lessons, the
Learning library (all six lessons with program and length), conversation history, and the three review
states (Overdue, Repeated, Replied).

## Verify

```bash
npm run check
npm test
BASE_URL=http://localhost:5173 npm run test:driver
```

`test:driver` covers the standalone app (routes, acknowledgement, history, threads, quick asks, send,
Learn library and assigned lesson, player, overlays, device frame), the app-only destination in the workspace, the four ledger effects,
manager replies reaching the phone, private notes never leaving the workspace, replay after reload,
reset, and the mobile More sheet.
