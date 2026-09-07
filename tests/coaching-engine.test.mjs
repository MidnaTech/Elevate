import test from 'node:test';
import assert from 'node:assert/strict';
import '../dist/speeding-course-pack.js';
import '../dist/coaching-engine.js';
const C = globalThis.Coaching;
const active = (behaviorId = 'speeding', overrides = {}) => C.createPolicy(behaviorId, { status: 'active', coach: 'Fleet manager', ...overrides });
const sim = (policies = [active()], options = {}) => C.createSimulation(policies, options);
const run = (state, type, detail = {}) => { C.dispatch(state, { type, ...detail }); assert.equal(state.lastError, null); return state; };
const assess = (state, score = 62, programId = 'speeding', rest = {}) => run(state, 'assess', { driverId: 'demo-driver', programId, score, evidenceIds: ['sample-' + programId + '-' + state.assessments.length], ...rest });
const ready = state => state.assignments.find(item => item.status === 'ready');
const current = state => state.assignments.find(item => item.status === 'delivered');
const deliver = state => { const assignment = ready(state); run(state, 'deliver', { assignmentId: assignment.id, success: true }); return assignment; };
const finish = (state, assignment = current(state)) => { run(state, 'video', { assignmentId: assignment.id }); run(state, 'quiz', { assignmentId: assignment.id, answers: Object.fromEntries(assignment.courseSnapshot.questions.map(q => [q.id, q.correctIndex])) }); return assignment; };
const followup = (state, score = 60, programId = 'speeding', rest = {}) => { run(state, 'advance', { days: 14 }); assess(state, score, programId, rest); };

test('catalog has stable behavior/rule/course identifiers and honest complete sample previews', () => {
  assert.equal(C.catalog.behaviors.length, 10);
  assert.equal(C.catalog.courses.length, 30);
  assert.equal(new Set(C.catalog.courses.map(course => course.id)).size, 30);
  for (const course of C.catalog.courses) {
    assert.equal(course.questions.length, 3);
    assert.equal(course.previewOnly, true);
    assert.equal(course.videoUrl, null);
    assert.equal(new Set(course.questions.map(question => question.correctIndex)).size, 3);
    assert.ok(course.questions.every(question => question.explanation && question.options[question.correctIndex]));
  }
});

test('heavy-truck source content versions the existing speeding courses while retaining the full library bank', () => {
  const pack = globalThis.SpeedingCoursePack;
  const selectedIds = [['L1-Q1', 'L1-Q2', 'L1-Q3'], ['L2-Q1', 'L2-Q2', 'L2-Q3'], ['L3-Q2', 'L3-Q3', 'L3-Q4']];
  const speeding = C.catalog.courses.filter(course => course.behaviorId === 'speeding');
  assert.deepEqual(speeding.map(course => course.id), ['speeding-course-1', 'speeding-course-2', 'speeding-course-3']);
  assert.deepEqual(speeding.map(course => course.durationMinutes), [1, 1.5, 2]);
  assert.deepEqual(speeding.map(course => course.focus), ['foundation', 'reinforcement', 'reflection']);
  for (let index = 0; index < speeding.length; index++) {
    const course = speeding[index], level = pack.levels[index];
    assert.equal(course.version, 2); assert.equal(course.title, level.title);
    assert.equal(course.videoSeconds, level.videoSeconds); assert.equal(course.learningGoal, level.learningGoal);
    assert.deepEqual(course.lesson, level.lesson); assert.deepEqual(course.commitment, level.commitment);
    assert.deepEqual(course.questions.map(question => question.id), selectedIds[index]);
    assert.deepEqual(course.questions, selectedIds[index].map(id => level.questions.find(question => question.id === id)));
    assert.equal(course.videoUrl, null); assert.equal(course.previewOnly, true);
    assert.ok(course.questions.every(question => question.feedback.length === question.options.length));
    assert.notEqual(course.questions[0], level.questions.find(question => question.id === selectedIds[index][0]), 'Catalog content is isolated from the source bank');
  }
  assert.deepEqual(pack.levels.map(level => level.questions.length), [3, 4, 5]);
  assert.ok(speeding[2].questions.every(question => question.critical));
  assert.ok(C.catalog.courses.filter(course => course.behaviorId !== 'speeding').every(course => course.version === 1));
});

test('source-backed assigned quizzes snapshot version 2, explain the selected mistake, and retain unlimited retries', () => {
  const state = sim(); assess(state); const assignment = deliver(state);
  assert.equal(assignment.courseVersion, 2); assert.equal(assignment.courseSnapshot.version, 2);
  assert.equal(assignment.courseSnapshot.questions.length, 3);
  assert.equal(assignment.policySnapshot.maxCycles, 3); assert.equal(assignment.policySnapshot.deadlineDays, 7);
  const [first, ...others] = assignment.courseSnapshot.questions;
  const incorrect = (first.correctIndex + 1) % first.options.length;
  run(state, 'video', { assignmentId: assignment.id });
  run(state, 'quiz', { assignmentId: assignment.id, answers: { [first.id]: incorrect, ...Object.fromEntries(others.map(question => [question.id, question.correctIndex])) } });
  for (let retry = 0; retry < 4; retry++) {
    run(state, 'quiz', { assignmentId: assignment.id, answers: { [first.id]: incorrect } });
    assert.equal(state.quizAttempts.at(-1).feedback[0].explanation, first.feedback[incorrect]);
    assert.equal(assignment.status, 'delivered'); assert.equal(state.cases.length, 0);
    assert.deepEqual(assignment.correctQuestionIds, others.map(question => question.id));
  }
  run(state, 'quiz', { assignmentId: assignment.id, answers: { [first.id]: first.correctIndex } });
  assert.equal(assignment.status, 'completed'); assert.equal(state.quizAttempts.length, 6);
  assert.equal(state.journeys[0].stage, 'monitoring');
  const sourceCourse = C.catalog.courses.find(course => course.id === assignment.courseId);
  assert.notEqual(assignment.courseSnapshot.questions, sourceCourse.questions);
  assert.deepEqual(assignment.courseSnapshot.lesson, sourceCourse.lesson);
});

test('policy defaults and activation validation separate connected detection and coaching thresholds', () => {
  const policy = C.createPolicy('speeding');
  assert.equal(policy.status, 'draft'); assert.equal(policy.scoreThreshold, 75);
  assert.equal(C.assessmentIntervalDays(policy), 14);
  assert.deepEqual(policy.reminderDays, [3, 6]);
  assert.ok(C.validatePolicy(policy).some(error => error.includes('manager')));
  policy.coach = 'Manager'; assert.deepEqual(C.validatePolicy(policy), []);
  policy.rules = []; policy.courseIds = []; policy.deadlineDays = 2;
  assert.equal(C.validatePolicy(policy).length, 3);
  const legacy = active('speeding', { rules: [{ ruleId: 'legacy-speed', enabled: true, severity: 'High', allowance: 2, name: 'Source speeding feed', condition: 'Reported speed over 80 km/h' }] });
  assert.deepEqual(C.validatePolicy(legacy), []);
});

test('invalid, incomplete, passing and out-of-audience scores do not start a course', () => {
  const state = sim(); assess(state, 62, 'speeding', { valid: false }); assess(state, 62, 'speeding', { complete: false }); assess(state, 75);
  assert.equal(state.assignments.length, 0);
  assert.deepEqual(state.assessments.map(a => a.outcome), ['missing', 'incomplete-period', 'improved']);
  const outside = sim([active('speeding', { audience: { mode: 'groups', groups: ['South'] } })]); assess(outside);
  assert.equal(outside.assessments[0].outcome, 'outside-audience');
  const broken = sim([active('speeding', { rules: null })]); C.dispatch(broken, { type: 'assess', programId: 'speeding', driverId: 'demo-driver', score: 50 });
  assert.match(broken.lastError, /configuration needs attention/); assert.equal(broken.assignments.length, 0);
});

test('first failing score creates one ready course and additional unfinished-course events do not pile up', () => {
  const state = sim(); assess(state); const assignment = ready(state);
  assert.equal(assignment.cycle, 1); assert.equal(assignment.courseId, 'speeding-course-1');
  assert.equal(assignment.dueAt, null); assert.match(assignment.recommendation, /Sample score 62 is below 75/);
  run(state, 'advance', { days: 1 }); assess(state, 40);
  assert.equal(state.assignments.length, 1); assert.equal(state.assessments.at(-1).outcome, 'course-in-progress');
});

test('queue reprioritizes undelivered work by severity, score shortfall, then waiting time', () => {
  const policies = [active('speeding', { rules: [{ ruleId: 'speeding-rule-1', enabled: true, severity: 'Low', allowance: 0 }] }), active('braking'), active('following')];
  const state = sim(policies); assess(state, 20); assess(state, 60, 'braking'); assert.equal(ready(state).programId, 'braking');
  assess(state, 40, 'following'); assert.equal(ready(state).programId, 'following');
  const assignment = deliver(state); assert.equal(assignment.programId, 'following');
  assert.ok(state.assignments.filter(a => a.status === 'queued').every(a => a.dueAt === null));
  finish(state); assert.equal(ready(state).programId, 'braking');
});

test('delivered work keeps the slot even when another program has higher priority', () => {
  const state = sim([active('speeding'), active('braking')]); assess(state, 70); const assignment = deliver(state); assess(state, 20, 'braking');
  assert.equal(current(state).id, assignment.id); assert.equal(state.assignments[1].status, 'queued');
});

test('failed delivery has no deadline; successful delivery starts reminder and overdue clocks', () => {
  const state = sim(); assess(state); const assignment = ready(state);
  run(state, 'deliver', { assignmentId: assignment.id, success: false }); run(state, 'advance', { days: 10 });
  assert.equal(assignment.dueAt, null); assert.equal(state.cases.length, 0); assert.equal(state.notifications.length, 0);
  deliver(state); assert.equal(assignment.dueAt, '2026-09-24T09:00:00.000Z');
  run(state, 'advance', { days: 3 }); assert.deepEqual(assignment.reminders, [3]);
  run(state, 'advance', { days: 3 }); assert.deepEqual(assignment.reminders, [3, 6]);
  run(state, 'advance', { days: 1 }); assert.equal(assignment.status, 'paused'); assert.deepEqual(state.cases[0].reasons, ['Overdue']);
  run(state, 'advance', { days: 20 }); assert.equal(state.cases.length, 1);
});

test('video and all quiz answers are required; retries preserve correct answers and explain mistakes', () => {
  const state = sim(); assess(state); const assignment = deliver(state);
  C.dispatch(state, { type: 'quiz', assignmentId: assignment.id, answers: {} }); assert.match(state.lastError, /video preview/);
  run(state, 'video', { assignmentId: assignment.id });
  const [q1, q2, q3] = assignment.courseSnapshot.questions;
  run(state, 'quiz', { assignmentId: assignment.id, answers: { [q1.id]: q1.correctIndex, [q2.id]: 0, [q3.id]: q3.correctIndex } });
  assert.deepEqual(assignment.correctQuestionIds, [q1.id, q3.id]); assert.equal(assignment.status, 'delivered');
  assert.ok(state.quizAttempts[0].feedback.find(item => !item.correct).explanation);
  run(state, 'quiz', { assignmentId: assignment.id, answers: { [q2.id]: q2.correctIndex } });
  assert.equal(assignment.status, 'completed'); assert.equal(state.quizAttempts[1].feedback.length, 1);
  assert.equal(state.journeys[0].stage, 'monitoring');
});

test('a complete subsequent calendar period is required before further coaching', () => {
  const state = sim(); assess(state); const first = finish(state, deliver(state));
  run(state, 'advance', { days: 1 }); assess(state, 30);
  assert.equal(state.assessments.at(-1).outcome, 'awaiting-full-follow-up'); assert.equal(state.assignments.length, 1);
  run(state, 'advance', { days: 13 }); assess(state, 30, 'speeding', { periodStart: '2026-09-06T09:00:00.000Z' });
  assert.equal(state.assessments.at(-1).outcome, 'awaiting-full-follow-up');
  assess(state, 30); assert.equal(state.assignments.length, 2); assert.equal(ready(state).courseId, 'speeding-course-3');
  assert.equal(first.status, 'completed'); assert.equal(first.score, 62);
});

test('distance and driving-hour followups require supplied complete driving exposure', () => {
  for (const basis of ['distance', 'hours']) {
    const state = sim([active('speeding', { assessment: { basis, amount: 100, unit: basis === 'distance' ? 'km' : 'hours' } })]);
    assess(state); assert.equal(state.assignments.length, 0);
    assess(state, 50, 'speeding', { exposure: 100 }); finish(state, deliver(state));
    run(state, 'advance', { days: 1 }); assess(state, 40, 'speeding', { exposure: 99 }); assert.equal(state.assignments.length, 1);
    assess(state, 40, 'speeding', { exposure: 100 }); assert.equal(state.assignments.length, 2);
  }
});

test('three unsuccessful complete cycles escalate once without adding a session', () => {
  const state = sim(); assess(state);
  for (let cycle = 1; cycle <= 3; cycle++) {
    const assignment = deliver(state); assert.equal(assignment.cycle, cycle); finish(state, assignment); followup(state, 50);
  }
  assert.equal(state.assignments.length, 3); assert.equal(state.cases.length, 1);
  assert.deepEqual(state.cases[0].reasons, ['Repeated']); assert.equal(state.journeys[0].cycles, 3);
  const last = state.assignments.at(-1); assert.equal(last.origin, 'automated'); assert.equal(last.currentMode, 'manager'); assert.equal(state.cases[0].sessionId, last.sessionId);
  C.dispatch(state, { type: 'resume', caseId: state.cases[0].id, confirm: true, deadlineDays: 7 }); assert.match(state.lastError, /revised cycle limit/);
});

test('three good assessments reset course selection; missing periods pause and failing periods clear the streak', () => {
  const state = sim(); assess(state); finish(state, deliver(state)); followup(state, 80); followup(state, null, 'speeding', { valid: false });
  assert.equal(state.journeys[0].goodStreak, 1);
  followup(state, 80); followup(state, 80);
  assert.equal(state.assessments.at(-1).outcome, 'reset'); assert.equal(state.journeys[0].cycles, 0);
  followup(state, 50); assert.equal(ready(state).courseId, 'speeding-course-1'); assert.equal(state.assignments.length, 2);
  finish(state, deliver(state)); followup(state, 80); followup(state, 50); assert.equal(state.journeys[0].goodStreak, 0);
});

test('a driver message pauses only its program, deduplicates review reasons, and frees the slot', () => {
  const state = sim([active('speeding'), active('braking')]); assess(state); const assignment = deliver(state); assess(state, 30, 'braking');
  run(state, 'driverMessage', { assignmentId: assignment.id, text: 'Can you explain this?' });
  assert.equal(assignment.status, 'paused'); assert.equal(assignment.dueAt, null); assert.equal(ready(state).programId, 'braking');
  run(state, 'driverMessage', { assignmentId: assignment.id, text: 'I have a second question.' }); run(state, 'handoff', { assignmentId: assignment.id, reason: 'Needs a discussion' });
  assert.equal(state.cases.length, 1); assert.deepEqual(state.cases[0].reasons, ['Replied', 'Manager review']);
  run(state, 'advance', { days: 30 }); assess(state, 40);
  assert.equal(state.assessments.at(-1).outcome, 'review-paused'); assert.equal(assignment.reminders.length, 0);
});

test('manager reply and dispute decision do not resume; explicit resume preserves progress with a new deadline', () => {
  const state = sim(); assess(state); const assignment = deliver(state); run(state, 'video', { assignmentId: assignment.id });
  run(state, 'driverMessage', { assignmentId: assignment.id, text: 'This event is wrong.', dispute: true }); const item = state.cases[0];
  run(state, 'managerReply', { caseId: item.id, text: 'I will review it.' }); assert.equal(item.status, 'open'); assert.equal(assignment.status, 'paused');
  C.dispatch(state, { type: 'resume', caseId: item.id, confirm: true, deadlineDays: 9 }); assert.match(state.lastError, /pending dispute/);
  run(state, 'resolveDispute', { caseId: item.id, upheld: false, reason: 'Evidence supports the event.' }); assert.equal(item.status, 'open');
  C.dispatch(state, { type: 'resume', caseId: item.id, deadlineDays: 9 }); assert.match(state.lastError, /Confirm/);
  run(state, 'advance', { days: 20 }); run(state, 'resume', { caseId: item.id, confirm: true, deadlineDays: 9 });
  assert.equal(item.status, 'resolved'); assert.equal(assignment.videoCompleted, true); assert.equal(assignment.status, 'ready'); assert.equal(assignment.dueAt, null);
  deliver(state); assert.equal(assignment.dueAt, '2026-10-06T09:00:00.000Z'); assert.equal(assignment.origin, 'automated'); assert.equal(state.assignments.length, 1);
});

test('upheld disputes preserve history and score while excluding linked evidence from future decisions', () => {
  const state = sim(); assess(state, 40, 'speeding', { evidenceIds: ['event-1'] }); const assignment = deliver(state);
  run(state, 'driverMessage', { assignmentId: assignment.id, text: 'Wrong driver.', dispute: true }); const item = state.cases[0];
  run(state, 'resolveDispute', { caseId: item.id, upheld: true, reason: 'Confirmed wrong attribution.' });
  assert.equal(assignment.score, 40); assert.deepEqual(assignment.evidenceIds, ['event-1']); assert.equal(state.assessments[0].score, 40);
  assert.equal(state.exclusions.length, 1); assert.equal(item.status, 'open');
  run(state, 'waive', { caseId: item.id, reason: 'No action required for this event.' }); followup(state, 40, 'speeding', { evidenceIds: ['event-1'] });
  assert.equal(state.assessments.at(-1).outcome, 'excluded-evidence'); assert.equal(state.assignments.length, 1); assert.equal(assignment.status, 'waived');
});

test('missing suitable followup content opens a content-gap review without silently reusing a course', () => {
  const state = sim([active('speeding', { courseIds: ['speeding-course-1'] })]); assess(state); finish(state, deliver(state)); followup(state);
  assert.equal(state.assignments.length, 1); assert.deepEqual(state.cases[0].reasons, ['Content gap']);
  C.dispatch(state, { type: 'resume', caseId: state.cases[0].id, confirm: true, deadlineDays: 7 }); assert.match(state.lastError, /unused content/);
  run(state, 'updatePolicy', { policy: active('speeding', { version: 2, courseIds: ['speeding-course-1', 'speeding-course-2'] }) });
  run(state, 'resume', { caseId: state.cases[0].id, confirm: true, deadlineDays: 7 }); followup(state);
  assert.equal(ready(state).courseId, 'speeding-course-2');
});

test('policy changes apply to future assignments, preserving existing course and policy snapshots through rename', () => {
  const state = sim(); assess(state); const first = deliver(state);
  const updated = active('speeding', { name: 'Safe speed at every turn', version: 2, deadlineDays: 12, scoreThreshold: 80 });
  run(state, 'updatePolicy', { policy: updated }); updated.name = 'Outside state mutation';
  assert.equal(first.policyVersion, 1); assert.equal(first.policySnapshot.deadlineDays, 7); assert.equal(first.courseVersion, 2);
  assert.equal(first.dueAt, '2026-09-14T09:00:00.000Z');
  finish(state, first); followup(state, 77); const second = ready(state);
  assert.equal(second.policyVersion, 2); assert.equal(second.policySnapshot.name, 'Safe speed at every turn'); assert.equal(second.policySnapshot.deadlineDays, 12);
  assert.equal(first.policySnapshot.name, 'Speeding program'); assert.equal(second.courseId, 'speeding-course-2');
});

test('fleet semi and manual modes gate autonomous actions without changing fleet policy', () => {
  for (const mode of ['semi', 'manual']) {
    const state = sim([active()], { fleetMode: mode }); assess(state); assert.equal(state.assignments.length, 0); assert.equal(state.assessments[0].outcome, 'fleet-paused');
    run(state, 'setFleetMode', { mode: 'fully' }); assess(state); const assignment = ready(state);
    run(state, 'setFleetMode', { mode }); C.dispatch(state, { type: 'deliver', assignmentId: assignment.id }); assert.match(state.lastError, /Fleet automation is paused/);
    assert.equal(state.policies[0].status, 'active'); assert.equal(state.policies[0].assessment.amount, 2);
  }
});


test('course recommendations respond to quiz misconceptions and worsening follow-up driving', () => {
  const worsening = sim(); assess(worsening); finish(worsening, deliver(worsening)); followup(worsening, 40);
  assert.equal(ready(worsening).courseId, 'speeding-course-3'); assert.match(ready(worsening).recommendation, /worsened despite a correct quiz/);
  const misconceptions = sim(); assess(misconceptions); const assignment = deliver(misconceptions); run(misconceptions, 'video', { assignmentId: assignment.id });
  run(misconceptions, 'quiz', { assignmentId: assignment.id, answers: Object.fromEntries(assignment.courseSnapshot.questions.map(q => [q.id, 0])) });
  finish(misconceptions, assignment); followup(misconceptions, 40);
  assert.equal(ready(misconceptions).courseId, 'speeding-course-2'); assert.match(ready(misconceptions).recommendation, /Reinforcement practice/);
});

test('blank numeric inputs cannot become valid zero thresholds or allowances', () => {
  for (const value of [null, '', ' ']) {
    const policy = active('speeding', { scoreThreshold: value }); assert.ok(C.validatePolicy(policy).some(error => error.includes('threshold')));
    policy.scoreThreshold = 75; policy.rules[0].allowance = value; assert.ok(C.validatePolicy(policy).some(error => error.includes('allowance')));
  }
});

test('a supplied partial first calendar period cannot trigger even if marked complete', () => {
  const state = sim(); assess(state, 40, 'speeding', { periodStart: '2026-09-06T09:00:00Z', complete: true });
  assert.equal(state.assignments.length, 0); assert.equal(state.assessments[0].outcome, 'incomplete-period');
});

test('partly excluded assessments require a fresh score rather than silently reusing a contaminated score', () => {
  const state = sim(); assess(state, 40, 'speeding', { evidenceIds: ['wrong-event', 'valid-event'] }); const assignment = deliver(state);
  run(state, 'driverMessage', { assignmentId: assignment.id, text: 'First event is wrong.', dispute: true }); const item = state.cases[0];
  run(state, 'resolveDispute', { caseId: item.id, upheld: true, evidenceIds: ['wrong-event'], reason: 'Wrong attribution.' }); run(state, 'waive', { caseId: item.id, reason: 'Review again with fresh evidence.' });
  followup(state, 40, 'speeding', { evidenceIds: ['wrong-event', 'valid-event'] });
  assert.equal(state.assessments.at(-1).needsReassessment, true); assert.equal(state.assignments.length, 1);
  assess(state, 40, 'speeding', { evidenceIds: ['valid-event'] }); assert.equal(state.assignments.length, 2);
  assert.equal(assignment.score, 40); assert.equal(assignment.policyVersion, 1);
});


test('a large clock advance records scheduled reminders before the overdue review', () => {
  const state = sim(); assess(state); const assignment = deliver(state); run(state, 'advance', { days: 7 });
  assert.deepEqual(assignment.reminders, [3, 6]);
  assert.deepEqual(state.notifications.filter(n => n.type === 'reminder').map(n => n.at), ['2026-09-10T09:00:00.000Z', '2026-09-13T09:00:00.000Z']);
  assert.deepEqual(state.cases[0].reasons, ['Overdue']);
});

test('fleet pause freezes delivered deadlines and reminders without penalizing the driver on return', () => {
  const state = sim(); assess(state); const assignment = deliver(state); run(state, 'advance', { days: 2 });
  run(state, 'setFleetMode', { mode: 'manual' }); run(state, 'advance', { days: 30 });
  assert.equal(state.cases.length, 0); assert.deepEqual(assignment.reminders, []);
  run(state, 'setFleetMode', { mode: 'fully' });
  assert.equal(assignment.dueAt, '2026-10-14T09:00:00.000Z'); assert.equal(state.cases.length, 0);
  assert.equal(assignment.firstDeliveredAt, '2026-09-07T09:00:00.000Z');
  run(state, 'advance', { days: 1 }); assert.deepEqual(assignment.reminders, [3]);
  run(state, 'advance', { days: 4 }); assert.deepEqual(state.cases[0].reasons, ['Overdue']);
});

test('manager review overlapping a fleet pause keeps its own fresh-deadline resume flow', () => {
  const state = sim(); assess(state); const assignment = deliver(state); run(state, 'setFleetMode', { mode: 'semi' });
  run(state, 'driverMessage', { assignmentId: assignment.id, text: 'Please help.' }); run(state, 'advance', { days: 20 });
  run(state, 'setFleetMode', { mode: 'fully' }); assert.equal(assignment.dueAt, null); assert.equal(assignment.status, 'paused');
  run(state, 'resume', { caseId: state.cases[0].id, confirm: true, deadlineDays: 4 }); deliver(state);
  assert.equal(assignment.dueAt, '2026-10-01T09:00:00.000Z'); run(state, 'advance', { days: 4 });
  assert.deepEqual(assignment.reminders, [3]); assert.equal(state.cases.length, 2);
});


test('waiving an uncompleted assignment does not advance course progression for a new incident', () => {
  const state = sim(); assess(state); const first = deliver(state);
  run(state, 'driverMessage', { assignmentId: first.id, text: 'Please review.' });
  run(state, 'waive', { caseId: state.cases[0].id, reason: 'Assignment was inappropriate for this incident.' });
  followup(state, 55); assert.equal(ready(state).cycle, 1); assert.equal(ready(state).courseId, 'speeding-course-1'); assert.equal(first.status, 'waived');
});

test('malformed imported audience and rule data return activation errors rather than throwing', () => {
  const policy = active('speeding', { audience: { mode: 'groups', groups: 'North' }, coachMode: 'group' });
  assert.doesNotThrow(() => C.validatePolicy(policy)); assert.ok(C.validatePolicy(policy).length);
  policy.rules = [{ ruleId: 'braking-rule-1', name: 'Mislabelled speed rule', condition: 'Wrong connected category', enabled: true, severity: 'High', allowance: 0 }];
  assert.ok(C.validatePolicy(policy).some(error => error.includes('connected detection')));
});
