# Kevin / Calvin call — supplied notes

September 7, 2026. Original user-supplied notes, preserved below. These are call notes, not a verbatim transcript. Open questions remain open; the implementation and domain reviews are separate documents.

---

From the Kevin / Calvin call, 7 Sep 2026. Everything agreed, everything still open, and what not to touch yet.

1. Core principle

95% of coaching is automated. The UI's job is to show what got handled automatically, and surface only the 5% that actually needs a human. No dashboards for dashboards' sake — the customer (T4) explicitly doesn't want them. "So what" first, "why" second.

2. Landing page / command center
Stays the entry point. Shows overall score, per-program state, and what needs you this week.
Keep the coaching breakdown: needs review / automated / 1:1 / completed + outcomes.
Add programs to it. Right now it's fully general. Either a chart showing each program's score and how many people have taken it, or —
Preferred: a program filter. Same page, filtered by program (default "All programs"), sitting where the "this week" filter is. Same page serves both views. Check this with Jobin first — Kevin thinks he'll like it.
Landing page is not a substitute for a real program page. Both exist.
3. Navigation
Programs becomes a top-level menu item. Not a tab, not a shelf.
Rename / replace "Analytics" with "Programs". Analytics gets absorbed.
Program detail = full page, one program at a time, with a switcher between them. Same pattern as the driver/vehicle spotlight.
Kill the shelf/drawer for program detail. A program is a first-class citizen.
4. Terminology
"Behavior category" / "umbrella" → program. Speeding, Following Distance, Distracted Driving.
Overall score is not a "safety score" — it's the Elevate score.
5. Program configuration (the big build)

Three planes: event ingestion → program triggers → coaching content. All configured on the program config page.

5.1 Event feeds
Enable which events get ingested into the program.
Each event gets a weight (severity → low/med/high → 0.5 / 1 / etc.), normalized into the program score.
Optional per-event threshold = how many times an event has to happen before it counts as coachable. This is the "acceptable baseline" dimension: if the average driver speeds 5x per 500 km and you're fine with that, those 5 shouldn't be coachable.
The customer sets these, not us. We're not managing their rule set — we don't have the industry benchmark data to justify shipping opinionated defaults. Revisit when we have ~100 customers and can actually pool it.
5.2 Program triggers
Period basis: distance (every 500 / 1,000 km), duration/time driven, or calendar time.
Not per-event — too noisy. Has to consolidate.
Calendar default: bi-weekly (2 weeks), not weekly. Calvin's call, Kevin agreed.
Trigger score: the score within that period that fires coaching.
5.3 Escalation
Escalating videos: level 1 → 2 → 3 → …
Configurable number of escalations before it drops to manual review. e.g. 1, 2, 3, manual.
Build the ladder logic now even though we only have one video per module. Reuse the same video across levels if we have to — the point is the logic and the code path exist so adding videos later is trivial, including customer-uploaded ones.
5.4 Reset
How many consecutive periods above the trigger score are needed before escalation drops back to level 1.
Config: period + score + reset periods. e.g. 1,000 km / 75% / 3 periods.
⚠️ Transcript math is inconsistent here — Kevin said 1,000 km × 3 reset periods = "1,500 km straight". Should be 3,000. Confirm which he meant before building.
5.5 Grace period & reminders
Grace period to watch + acknowledge.
Number of reminders the driver gets.
When the grace period expires → auto-escalates to manual / needs review. Nobody creates it by hand. This replaces the open "should overdue create a session?" question — yes, automatically.
5.6 Later, not now
Assigning program ownership to a person (a supervisor who owns the Speeding program).
Quizzes / assignments attached to videos.
6. Video library
A page to upload or link videos and assign them to a program + escalation level. Can be the same page as program config or linked from it.
Needs to support external videos (Lytx etc.) for manual sessions.
Jobin is currently generating videos with AI, one per module — the escalated set doesn't exist yet. Not a blocker for the logic.
7. Coaching session logic
Automated (the 95%)
Fires on the program trigger. Sends a video. Driver watches, hits Acknowledge. That's the whole loop for now.
No reply, no assignment.
Manual / 1:1 (the 5%) — fires when:
Repeat-offender rule hits (e.g. third consecutive period under 60).
Escalation ladder is exhausted (4th offence without a reset).
Session goes overdue past the grace period.
Driver requests review. They watched it, they disagree → flag for discussion → becomes a 1:1 and doesn't count against them.
A coach starts one deliberately (e.g. a driver sitting right on the cusp of every score — mediocre but never technically triggering).
Manual session creation
Must pick a program first.
Auto-loads the breakdown of what hurt that driver in that program over the period (2 weeks).
Coach picks which videos go in.
No bulk sends
No bulk automated coaching from the driver list. If the thresholds are set up right there's no reason for it. Manual coaching needs a specific event and a specific reason — so it stays one at a time.
8. Driver page changes

Problem today: you can only create a session from the Sessions page, where you can't see which drivers actually need coaching. Wrong place.

Add "Coach" / "Create manual session" to the driver table and driver detail page. That's where the context lives — make it the primary entry point. Leave the Sessions entry point in place too.
Drop the "Method" column. Status already tells you. (On the Sessions page, the Coach column shows "Automated" or the coach's name — that covers it.)
Add a period score column — score over the last period, per program.
Make the action column context-aware: active session → "View session". No active session → "Coach" / "Create manual session". Plus access to past sessions.
Show the driver against every program, not just the ones they have sessions on. Score over last period, current session if any, past sessions, or start a new one. Don't add a second table — extend the existing coaching table with the score + session columns.
9. Scoring model
Per-program scores replace the single safety score.
Optional overall Elevate score = weighted roll-up of program scores. Equal weights by default, customer can re-weight per program.
Applies at both driver and fleet level.
Needs its own overall-score / weights config tab, set up after programs and event feeds exist.
10. Program page stats (treat it like an LMS)

Go look at how real LMS systems are built before designing this.

Who's enrolled / been coached, who watched, who hasn't.
Completion counts and completion time.
Who's repeated a course, and how many times.
Currently registered vs. completed vs. overdue.
Session mix: automated / needs review / 1:1 / completed + outcomes.
Impact measurement — the one that matters. Cohort tracking per video: 100 drivers took video 1 → 99 stayed above score in period 1 → 95 in period 2 → and so on. If we can't show the coaching moved the number, there's no reason for the customer to run it.
11. Visual design
Current pass is better because it's less cluttered. Minimalist is the base.
Cut the heavy color borders, the color everywhere, the shadows.
It's still a bit plain — it needs some life. But add flair after the minimal base is approved, not before.
12. Sequencing
Tomorrow: mock up the simplified design — landing page/command center + programs — for the review with Jobin.
Do not touch the GCP architecture / configuration, even with access in hand, until Jobin signs off on this UI. Kevin's sending full instructions separately.
Share this transcript with Jobin.
Run it through Fable and/or Austra to tear it apart — find gaps, bad calls, missing pieces.
13. Open questions
#	Question	Status
1	Per-event thresholds, or category threshold only?	Calvin says weights + severities roll up, so per-event is unnecessary. Kevin says it's a different dimension (acceptable baseline). Plan: have Fable argue both sides, likely ship without and add if the customer asks.
2	Reset period math — 3 × 1,000 km = 1,500 or 3,000?	Confirm with Kevin.
3	Program filter on the landing page vs. separate program charts?	Ask Jobin.
4	Exact trigger definition per program (score-based vs distance/duration/calendar) defaults	Talk to Jobin.
5	Escalation video count when only one video exists per module	Reuse the same video across levels for now.