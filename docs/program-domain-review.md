# Program model review

Read-only product/domain review of the Kevin / Calvin call notes dated September 7, 2026, against the current static prototype. Source: the supplied `pasted-text.txt` attachment. This document proposes decisions and a local review scope; it does not activate configuration, change fixture records, send notifications, or authorize GCP work. Sharing with Jobin remains a prepared handoff until a recipient and channel are provided.

## What the notes establish

| Direction | Implication for the prototype |
| --- | --- |
| Automation should handle ordinary coaching; human work should be exceptional. | Lead with what needs action and what was handled. Treat 95% as a product aspiration, not a fixture value or a claimed service level. |
| Programs replace Analytics as a top-level destination. Program detail is a full page with a program switcher. | Replace the program drawer entry point; retain existing Sessions and driver portfolio drawers and their shared width. Preserve old program links through route compatibility. |
| The command center remains the landing page, with overall context and program visibility. | A program filter is the preferred review concept, **pending Jobin's approval**. It supplements a real program page. |
| Configuration has event inputs, program evaluation/trigger rules, and coaching content. | Present these as distinct sections. A content mapping is not a scoring rule. |
| Calendar cadence defaults to two weeks. Distance and driving-time bases are also intended. | The current one-week configuration default conflicts. Reporting range and evaluation cadence must remain separate controls. |
| Automated coaching is training video → watched → acknowledged. | No ordinary reply, quiz, or assignment requirement in this phase. A review request is an exception action. |
| Escalation levels, manual handoff, reset periods, grace, and reminders are configurable. | Show the ladder and handoff conditions, including reuse of one content asset at several levels. Do not imply the current prototype already evaluates this logic. |
| Driver context is a primary manual-coaching entry point. | Select a program, show that driver's program evidence, require a specific reason, and allow one driver at a time. Keep the Sessions entry point. |
| Each driver must be represented against every program. | Extend the existing coaching section to include all programs, period score, current coaching, history, and an action. Do not populate it only from existing sessions. |
| Program scores are primary; optional overall Elevate score is a weighted roll-up. | The existing safety-score fixture cannot simply be relabelled as a newly calculated Elevate score. Equal program weights are an explicitly requested default; event penalties and trigger defaults are not. |
| Program ownership, quizzes, and assignments are later work. | Keep them out of the first review's ordinary flow. |
| Local UI review precedes GCP/production changes. | Prepare review screens and an explicit assumptions list. No architecture, ingestion, production storage, scheduler, or notification changes. |

## Decisions that cannot safely be inferred

### 1. Scores need a definition before they drive coaching

Weights alone do not define a normalized score. Confirm the score range and formula; severity-to-weight mapping; exposure denominator; clipping; minimum valid exposure; and whether score equality triggers coaching. The notes imply higher is better and coaching below a threshold, but do not establish `<` versus `<=` or a particular penalty function.

Distance, driving time, and calendar time define **when/how a period closes**. A score threshold defines **whether coaching fires**. They are not competing trigger types. For calendar periods, define timezone, boundary alignment, and minimum driving exposure. For distance/time periods, define carry-over at boundaries and what happens to an event spanning the boundary. No driving must remain unavailable, rather than a perfect score or a successful reset period.

The current UI displays miles, while the configuration examples use kilometres. Every period value needs an explicit unit and conversions must be consistent. Fleet and driver roll-ups also need an aggregation definition: averaging driver scores and scoring a pooled fleet event rate are different calculations. Missing program scores need coverage disclosure and an explicit weighting policy.

The event grain also needs a contract: multiple camera clips for one incident must not become multiple scoring events. Define whether an event may contribute to several programs, how duplicate provider records are reconciled, and how late events or corrected driver assignments revise a closed period. “Enable event ingestion” should distinguish collecting source evidence from making it eligible for a program; disabling a rule must not erase historical evidence.

**Confirm before an operational evaluator:** formula, comparator, period boundaries, minimum exposure, missing-data treatment, and fleet aggregation. **Safe review assumption:** show clearly illustrative scores or unavailable states; never derive a new score from the existing event-rate or safety-score fields.

### 2. Acceptable baselines and severity weights solve different problems

The argument for a per-event baseline is sound: severity describes impact; a baseline describes tolerated frequency at a given exposure. A low severity weight cannot express “the first five events per 500 km are tolerated” without also weakening every event beyond five.

The argument against shipping it now is also sound: without a defined score formula, the interaction is difficult to explain and test; it adds configuration burden and could duplicate an intended normalization rule. The call explicitly leaves the decision open.

If adopted, resolve whether `baseline = 5` means only the sixth and later events contribute, or all events contribute once the threshold is crossed. Those produce very different scores. Also decide whether the baseline affects score, coaching eligibility, or both. Retain raw evidence for audit even if it is excluded from a coaching calculation.

**Recommendation for the first review:** omit the baseline control from the primary form, document it as an unresolved extension, and reserve a versioned optional field. Do not represent a severity weight as an equivalent substitute. Do not activate the current hardcoded thresholds as customer-approved policy.

### 3. Escalation and reset need one coherent evaluation rule

“Third consecutive period below 60,” “fourth offence,” and “level 1 → 2 → 3 → manual” are not yet the same rule. Define an offence as a qualifying evaluated period or another explicit unit. Confirm when a level advances: assignment, acknowledgment, or a later failed period after coaching. Advancing on each source event would conflict with the requirement to consolidate.

Define precedence when a repeat rule, exhausted ladder, overdue acknowledgment, and review request all occur. One open case should receive one review handoff with multiple reasons, rather than duplicate manual assignments and reminder streams. A new failing period while coaching is still open also needs a policy: attach evidence to the open case, queue a later attempt, or create a distinct episode.

The reset example is unresolved: three consecutive 1,000 km periods equal 3,000 km. If 1,500 km was intended, either the period size or count differs. Do not encode either interpretation as the agreed configuration.

**Recommended reset semantics for review:** successful, sufficiently observed closed periods advance a consecutive-success counter; a failing period clears it; reaching the configured count resets the **next** assignment to level 1. Missing exposure does not count as success. Whether missing periods pause or break the streak requires confirmation. Reset never rewrites the level/content recorded on past assignments or closes an unresolved human review by itself.

### 4. Manual handoff must not rewrite origin or double count coaching

The current model uses `origin: automated | manual_override` for both creation origin and “Automated / One-on-one” reporting. The notes introduce a new distinction: automation can initiate a manual session, and an existing automated session can become one-on-one. Creation origin and current delivery mode therefore cannot remain the same field.

**Recommended model:** immutable `initiatedBy: automation | coach`; mutable `deliveryMode: automated | one_to_one`; lifecycle state and review reason independent of both. Record a handoff event with reason and timestamp. Keep the same coaching-case identity for a conversion of existing work; model new content assignments/attempts separately.

The statement “overdue automatically creates a session” still needs to distinguish creating a review task for an existing coaching case from creating a second coaching episode. Recommended local review behavior is one case converted to Needs review/one-on-one, with its original automatic assignment retained in history. A distinct later program period can produce a new episode; conversion of the same episode should not increment the session total.

An automated-origin case that becomes one-on-one remains automation-initiated historically. It is no longer wholly handled automatically. Report origin, current mode, and human intervention as separate measures. The current 97% automatic-origin share cannot be treated as proof that 97% finished without human involvement. Do not adjust records to force the 95% aspiration.

**Example invariant:** converting one existing automatic case to one-on-one keeps case total unchanged; current-mode totals move by one; automatic-origin total is unchanged. A pending flag becoming its first case replaces the flag without adding another identified record. Repeating a video creates another attempt, not another enrolled driver.

### 5. Review requests and overdue handling need precise outcomes

“Doesn't count against them” could mean excluding an event from score, pausing escalation, reversing a coaching offence, or simply avoiding an overdue penalty. These are materially different policies. A disagreement must not silently delete source evidence or retrospectively alter historical scores. Prefer a separate disputed/review status and an explicit coach disposition; confirm whether any score exclusion applies immediately or only after review.

For reminders, define grace start (assignment, delivery, or notification), reminder schedule and timezone, and the acknowledgment event that stops reminders. A delivery failure should not be treated as driver noncompliance. Confirm how delivery retries interact with the grace timer and handoff deadline.

“Watched” also needs a completion contract: progress threshold, seeking/replays, external-player tracking, and whether acknowledgment is allowed without verified playback. Training video and incident footage must remain distinct assets. The existing Lytx evidence viewer is not a training-completion tracker.

### 6. Impact cohorts need exposure and follow-up definitions

The proposed “100 watched → 99 above threshold in period 1 → 95 in period 2” is useful, but it has at least two meanings: above threshold in each individual follow-up period, or continuously above threshold through every period. Confirm which is intended. They must not share a label.

Define cohort entry (assigned, watched, or acknowledged), unique drivers versus attempts, content version, program configuration version, and the relevant score threshold. Follow-up periods must use the program's configured exposure basis. Show observed/eligible denominators, insufficient exposure, incomplete follow-up, and repeat/manual handoffs. Do not count unobserved drivers as successful or failed. A before/after cohort describes an association; it does not by itself establish that the video caused the improvement.

### 7. Navigation and manual evidence scope still have gaps

Replacing Analytics leaves the placement of Drivers and Groups unspecified; both currently live inside Analytics. Jobin should review their destination rather than having it disappear accidentally. The program filter is explicitly pending Jobin's feedback. A program switcher can borrow identity/navigation behavior from a spotlight without retaining the drawer container that the notes explicitly reject.

Manual coaching is described as loading two weeks of program evidence, while programs may use distance or driving-time periods. Confirm whether manual evidence uses a fixed calendar lookback or the most recent program evaluation period. Also resolve “specific event required” versus a coach addressing persistent mediocre scores: a period-level evidence pattern plus a specific reason should be a valid selection if that scenario is supported; do not fabricate an incident clip.

## Proposed domain records and transitions

These are design-review contracts, not a database migration.

| Record | Minimum responsibilities |
| --- | --- |
| Program | Stable identity, name, active configuration version, enabled/paused state. |
| ProgramConfigVersion | Effective boundary; event mappings/weights; optional baseline policy; evaluation basis/amount/unit/timezone; scoring formula version; trigger comparator; escalation content mappings; repeat/reset rules; grace/reminders. |
| DriverProgramPeriod | Driver/program identity, stable period identity, source configuration version, exposure/coverage, source-event references, score and contribution breakdown, evaluation result. |
| DriverProgramProgress | Current escalation level and consecutive-success/failure counters, referenced evaluation history; no fabricated counters from session counts. |
| CoachingCase | Driver/program/trigger-period identity, immutable initiator, current delivery mode, lifecycle/review reasons, handoff history and outcome. |
| TrainingAttempt | Case, escalation level, immutable content asset/version, assigned/delivered/watched/acknowledged timestamps, due time, reminder history and disposition. Reusing a video at three levels still creates distinct attempts. |
| EvidenceEvent | Immutable source event facts and stable identity, potentially several camera clips, with per-program evaluation/dispute eligibility separate from the source facts. |
| OverallScoreConfigVersion | Program weights and explicit missing-score/coverage policy, separate from program event severity weights. |

Proposed transition examples:

- Valid period fails its trigger → create or locate the period's coaching case → assign the configured level/content → watch → acknowledge → complete that attempt/case.
- Grace expires before acknowledgment, driver requests review, or an applicable rule requires human work → idempotent handoff to Needs review/one-on-one, retaining the case and automatic attempt history.
- Coach deliberately starts coaching → program first, driver context, evidence period/pattern and reason, then one case for one driver. Cancel creates nothing.
- A later valid period is evaluated → update escalation/reset progress under its governing configuration, then decide whether another attempt or a new episode is appropriate.

Period re-evaluation and repeated delivery of the same source event must not create duplicate cases. Use a stable driver/program/period key and explicit revisions. Active cases and closed evaluations retain their original configuration/content versions. New configuration should take effect at a defined future period boundary; score-rule changes must not silently reset escalation history or rescore past cohorts. Migration of in-flight progress after a rule change requires an explicit policy.

## Existing implementation affected

| Requirement | Current helpers/data to change after review |
| --- | --- |
| Programs as full pages; absorb analytics | `routeViewNames`, `setView`, `applyUrlState`, `updateUrlState`, `renderAnalytics`, `renderQueue`, `openCategoryDrawer`, `renderCategory`, `rerenderCategoryPreservingScroll` in `dist/app.js`; navigation in `dist/index.html`. |
| Program filter on the command center | `renderHomeOverview`, `syncFleetSessionCounts`, `currentCycleCounts`, `coachingCounts`; scope must apply to counts and action shortcuts together. |
| Per-program configuration and two-week default | `defaultEventTypeRules`, `defaultCoachingRules`, `scheduleForCadence`, `renderRuleSettings`, `settingsRuleChanges`, `persistRuleSettings`, `previewSettingsDraft`, `activateSettingsDraft`; `savedCadenceWeeks`/`cadenceWeeks`. Existing defaults are opinionated and currently activate on an empty store. |
| Score model and all-program driver coverage | `weeklyCycleStats`, `outcomeFor`, `rateChange`, `fleetSafetyScore`, `fleetEventRatePer100k`, `driverMatchesScore`, `renderDriverDistribution`, `renderDirectory`; `profileScoreComparison`, `profileRuleBreakdown`, `renderDriverProfileSessions` in `dist/driver-spotlight.js`. Current evidence is session-linked, so it cannot provide complete program-period scoring coverage. |
| Coach action when no active session | `driverDirectorySession` currently falls back to completed history, so it returns View session where the notes now want Coach; `renderDirectory`, `openManualSessionDialog`, `createManualSession`, `startSessionForCandidate`, `beginSessionDraft`, `sendSessionDraft`. The current form permits an empty reason and does not require selected evidence. |
| Immutable origin/current mode and count invariants | `SessionOrigin`, `normalizeSessionOrigin`, `coachingCounts`, `calculateSessionTotals`, `currentCycleCounts`, `syncFleetSessionCounts`, `driverOrigin`, `coachLabel`, source filters and `compactSessionStatus`; corresponding definitions in `docs/metric-definitions.md`. |
| Watch/acknowledge and manual-only conversation | `sessionCanReply`, `workspaceComposer`, `sessionWorkspaceHeader`, `updateWorkspaceConversation`, `sendSessionWorkspaceReply` in `dist/session-workspace.js`; `[data-complete-session]` handling in `dist/app.js`. Currently any open session can reply and completion is a manager button; no acknowledgment evaluator exists. |
| Event provenance and period evidence | Reuse `registerEvidenceEvent`, `sessionEvidenceEvents`, `availableEvidenceEvents`, `linkEvidenceEvents` in `dist/session-evidence.js`; do not reconstruct clips or score contributions from text summaries. Add program-period source coverage separately. |
| Content levels and completion cohorts | `lessons`, `renderLibrary`, `quickTrainingBlock`, `progressBlock`, `outcomesBlock`, `weeklyCoachingActivity`; remove current quiz copy for this phase. The fixture percentages/weekly snapshots are not per-video longitudinal cohorts. |

## First-step local Jobin review scope

1. Command center with All programs/program scope, action-first content, and coherent stage/mode labels. Present the filter as a review option, not an approved permanent navigation decision.
2. Programs as a first-class page with a switcher; one program's overview, learner/coaching list, and a concise impact concept. Keep expanded data on request and use the shared table/chart conventions.
3. A program configuration shell separating Events, Evaluation & escalation, and Content. Show the two-week calendar example, an escalation ladder reusing one asset, reset/grace/reminder fields, and unresolved scoring/period choices. Preserve draft/preview behavior without executing ingestion or scheduling.
4. Illustrative state previews for ordinary acknowledgment, overdue handoff, exhausted levels, and review request. Label missing scores/coverage honestly; do not change the existing session ledger to demonstrate hypothetical conversions.
5. Prepare the driver all-programs coaching-table extension and context-aware Coach action for the next reviewed step. Do not hide those entry points when Analytics is replaced.

Before building the operational engine, obtain answers on scoring/baselines, period/equality rules, level advancement and reset arithmetic, conversion grain, dispute treatment, and impact cohort semantics. The review prototype can proceed without those answers by exposing the choices and unavailable states. Program ownership, quizzes/assignments, bulk coaching, and production/GCP changes remain outside this step.
