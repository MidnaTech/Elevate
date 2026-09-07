# Automated program configuration and coaching

Current contract: the approved September 7 program setup and coaching workflow. This supersedes the earlier title-only creation, immediate settings saves, and automatic handoff on the first recurrence.

## Set up a program

New programs use four steps: name and behavior, connected rules, coaching plan, and review/activation. Each program covers one behavior and all drivers by default, with an optional group restriction. Elevate recommends connected rules and prepared courses. Managers can also add a rule in the Connected rules step or saved Configuration page, providing a name, detection condition, severity, and tolerated event count. Added rules have stable IDs and follow the program's draft and versioned-save behavior; the prototype does not configure the connected event feed. The manager reviews the coaching score threshold (75 is an editable sample default, not a safety benchmark).

A saved program has one editable Configuration page. Drafts persist locally. Active-program changes require Save changes, increment the policy version, and apply to future work. Course and policy snapshots on existing assignments do not change. Programs keeps Overview, Content, and Configuration, with reporting-period controls on Overview only. Content uses the same stable course IDs as Configuration, so renaming a program does not break mappings.

AI-generated courses are prepared centrally before fleet setup. The local catalog demonstrates three course levels for each behavior, each with a short video specification and three quiz questions. This repository has no bundled training videos: planned previews explicitly simulate video completion. Authored courses may link a hosted HTTP(S) video file, using native playback and an explicit source-loading error. Imported lesson metadata remains marked incomplete. Recommendations and scores in the preview are explicit samples, not live AI judgments or newly calculated fleet scores.

The Training library (formerly the top-level Content page) adds source-backed heavy-truck speeding materials: three learner lessons, 60/90/120-second video scripts, a 12-question reference bank, commitments and coach guidance. The existing speeding course IDs now reference version 2. Each assigned course still uses three questions; Level 3 retains the source's three critical decisions. The document's alternative episode-count routing, pass percentages and retry limits are reference proposals, not changes to the approved automation contract. Programs retains its Content tab and uses the same course previews and stable mappings.

## Create courses and templates

Training library → Create course starts from a generic three-level path, the heavy-truck speeding pack, a blank single course, or a saved template. Each series covers one behavior and one to three ordered levels. Each level is one course with its own stable ID, title, learning goal, tip, video duration and hosted URL or planned script, lesson, three quiz questions with answer explanations, and follow-up commitment. Levels can be added, removed or reordered while remaining levels retain their identities.

Drafts autosave in `elevate-course-authoring-v1`, separately from programs and fleet settings. Add to library validates complete teaching, video specifications and all three questions before publishing locally. Published edits remain a draft until Save new version; Discard changes restores the published series, and assigned work retains its original course snapshot. A published series keeps its behavior. Saving a template makes an independent reusable copy; starting from it creates fresh course and question IDs. Drafts and templates never appear in approved program pools.

Use this series explicitly replaces a program's approved pool with that series' ordered levels. Individual course selection remains available. If multiple authored series are approved, the first approved series takes priority; progression stays within it and follows the next ordinal level. Missing introductory or subsequent approved content creates a review gap instead of skipping levels, repeating unsuitable content or switching series. Built-in-only pools retain their adaptive selection. Completing each course and a full subsequent assessment remain necessary before the next level; the program's cycle limit and manager exceptions still apply. New library content is never silently approved by program recommendations.

## Approved automation policy

- Assess every two weeks by default; advanced configuration supports calendar intervals, distance, or driving hours. Program assessment is independent of reporting scope and respects the fleet-wide automation mode.
- A valid score below the program threshold qualifies the driver. Rules define severity and an event allowance; raw evidence is retained. This prototype does not calculate scores from events.
- Queue one active course per driver across all programs, ordered by contributing-rule severity, score shortfall, then time waiting. Waiting coursework has no deadline.
- Successful delivery starts a seven-day deadline with reminders on days three and six. Failed delivery retries without making the driver overdue.
- Finish the video and answer the three quiz questions correctly. Incorrect responses get explanations and retries; passing questions retain their progress.
- Course completion and driving improvement are separate. Wait for a complete subsequent valid assessment period before another course. New events during unfinished coursework do not pile up assignments.
- Allow up to three course-and-follow-up cycles. Persistent behavior then reaches a manager; earlier handoff needs a recorded reason. Unavailable suitable follow-up content also requires review.
- Three consecutive valid scores at or above the threshold reset future progression to the introductory level. Missing assessments pause the streak; failing ones clear it. Reset preserves history.

## Manager review

Any driver message means questions or a possible dispute and opens Replied review. Overdue and Repeated are the other established review categories. Keep one case, with all applicable reasons, original evidence, and its automatic creation origin. Current handling mode is separate from historical origin.

Review pauses the affected program's coursework, deadlines, reminders, and new assignments. Other programs can continue. The manager can reply, resume with a confirmed assignment/deadline, or close/waive the work. Sending a reply alone never resolves review, including in the existing session workspace. Resuming beyond the cycle cap needs an explicitly revised plan.

A pending dispute retains recorded evidence and scores. Upholding it records the exclusion for future coaching without deleting evidence or rewriting historical scores. A manager decision is retained in history.

## Local prototype boundary

The scenario preview has its own sample drivers, assessments, assignments, quizzes, queues, and manager decisions. It does not add sample coaching to the historical fleet ledger. Time advances only through explicit scenario controls; no notification is sent. Production video generation, event ingestion, scoring, background scheduling, delivery, and LMS services are not connected.

Existing programs/settings and incomplete lesson metadata migrate additively. Local storage remains device-specific. The simulator uses stable program, rule, course-version and assignment IDs, with independent quiz attempts, assessments and review decisions.

## Validation

Run `npm run check`, `npm test`, and `npm run test:coaching`. The configuration, programs, session, and shared design browser suites cover navigation and retained contracts. Use `BASE_URL=http://localhost:4173` and `PLAYWRIGHT_MODULE` for an existing Playwright installation. Browser fixtures block external requests.
