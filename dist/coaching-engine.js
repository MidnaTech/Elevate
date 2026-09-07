/*
 * Deterministic, local-only coaching scenario model. No ingestion, scoring, media
 * generation, notification transport, DOM or storage runs here.
 *
 * Public API (classic script; also importable in a Node VM):
 * Coaching.catalog = { behaviors, rules, courses }; course IDs and versions stable.
 * createPolicy(behaviorId, overrides = {}) -> complete policy; status defaults draft.
 * validatePolicy(policy) -> string[] activation errors.
 * createSimulation(policiesArray, {fleetMode='fully', now, drivers}={}) -> state.
 * dispatch(state, action) -> same state; rejects with state.lastError, never throws.
 * assessmentIntervalDays(policy) -> calendar duration (distance/hours return 0).
 *
 * Actions: assess {driverId,programId,score,valid,complete,ruleIds,evidenceIds,
 *   periodStart?,periodEnd?,exposure?}; advance {days}; deliver {assignmentId,success};
 * video {assignmentId,complete}; quiz {assignmentId,answers:{questionId:index}};
 * driverMessage {assignmentId,text,dispute?}; managerReply {caseId,text};
 * resume {caseId,deadlineDays,confirm:true,revisedMaxCycles?,reason?};
 * resolveDispute {caseId,upheld,reason,evidenceIds?}; waive/close {caseId,reason};
 * handoff {assignmentId,reason}; setFleetMode {mode}; updatePolicy {policy}.
 *
 * State contains now, fleetMode, policies[], drivers[], assignments[], assessments[],
 * cases[], quizAttempts[], decisions[], notifications[], journeys[], exclusions[],
 * events[], lastError. One driver defaults to id='demo-driver'. All timestamps ISO.
 * Assignment statuses: queued, ready, delivered, paused, completed, waived, closed.
 * origin is immutable automated; currentMode is automated or manager. Each assignment
 * snapshots policy/course, score and evidence. Review reuses its sessionId.
 * Reviews have deduplicated reasons Replied / Overdue / Repeated / Content gap /
 * Manager review. Reply/dispute resolution alone never resumes paused automation.
 * Scores supplied by callers are explicit sample observations, never computed here.
 * Non-fully fleet modes freeze delivered-course clocks. Returning to fully shifts
 * due/reminder clocks by paused time; manager-review timers remain paused separately.
 */
(function (global) {
  'use strict';
  const DAY = 86400000;
  const clone = value => JSON.parse(JSON.stringify(value));
  const severityWeight = { Low: 1, Medium: 2, High: 3 };
  const numeric = value => value !== null && value !== undefined && String(value).trim() !== '' && Number.isFinite(Number(value));
  const behaviorSeeds = [
    ['following', 'Following distance', 'Following too closely', 'Connected feed reports a following-distance exception', 'Allow a larger gap so you have time to react.'],
    ['speeding', 'Speeding', 'Speeding over 80 km/h', 'Connected feed reports speed above 80 km/h', 'Check your speed early and leave time for a calm arrival.'],
    ['braking', 'Harsh braking', 'Harsh braking', 'Connected feed reports a harsh-braking exception', 'Look farther ahead and release the accelerator sooner.'],
    ['distraction', 'Distraction', 'Distracted driving', 'Connected feed reports a distraction exception', 'Set up navigation before departure and keep your attention on the road.'],
    ['seatbelt', 'Seatbelt usage', 'Seatbelt not worn', 'Connected feed reports driving without a fastened seatbelt', 'Buckle up before moving, including short trips.'],
    ['acceleration', 'Acceleration', 'Harsh acceleration', 'Connected feed reports a harsh-acceleration exception', 'Build speed smoothly and anticipate the traffic ahead.'],
    ['cornering', 'Cornering', 'Harsh cornering', 'Connected feed reports a harsh-cornering exception', 'Set a suitable speed before entering the turn.'],
    ['traffic', 'Traffic signs', 'Traffic-sign violation', 'Connected feed reports a traffic-sign exception', 'Scan ahead for signs and prepare to respond early.'],
    ['fatigue', 'Fatigue', 'Fatigue warning', 'Connected feed reports a fatigue warning', 'Stop in a safe place when you feel drowsy and contact your manager.'],
    ['backing', 'Backing', 'Unsafe backing', 'Connected feed reports a backing-safety exception', 'Check the area before reversing and stop if visibility is lost.']
  ];
  const topics = {
    following: [['Build a safe following gap', 'Slow gradually to create more space', 'Stay close so traffic cannot merge'], ['Adjust the gap in poor conditions', 'Increase space when grip or visibility falls', 'Use the same gap in all weather'], ['Make space a lasting habit', 'Review where gaps shrink and plan extra space', 'Assume the other driver will brake gently']],
    speeding: [['Choose a safe speed', 'Reduce speed before the lower limit starts', 'Wait until after the sign to slow down'], ['Manage speed under pressure', 'Allow more time and contact your manager about delays', 'Make up lost time by exceeding the limit'], ['Build a lasting speed routine', 'Identify repeat locations and plan a safe approach', 'Rely only on a warning after speeding starts']],
    braking: [['Brake smoothly', 'Scan farther ahead and slow down earlier', 'Follow closely and brake at the last moment'], ['Anticipate changing traffic', 'Ease off early when traffic begins to slow', 'Keep accelerating until the queue is near'], ['Build a smoother approach', 'Review repeat braking locations and prepare earlier', 'Treat every harsh stop as unavoidable']],
    distraction: [['Keep attention on driving', 'Set up devices while safely parked', 'Adjust navigation while the vehicle is moving'], ['Handle distractions calmly', 'Stop safely before responding to messages', 'Read a short message while moving'], ['Protect attention every trip', 'Make a pre-trip device routine and check its effect', 'Use the phone only on familiar roads']],
    seatbelt: [['Buckle up before moving', 'Fasten the seatbelt before starting to drive', 'Wait until reaching a main road'], ['Keep the habit on short trips', 'Wear the seatbelt on every drive', 'Skip it for a short yard movement'], ['Make restraint checks routine', 'Check fit and report a faulty belt before driving', 'Continue using a belt that does not latch']],
    acceleration: [['Accelerate with control', 'Apply power progressively when it is safe to move', 'Press hard to get ahead of nearby vehicles'], ['Match acceleration to conditions', 'Leave space and use smooth inputs on poor surfaces', 'Accelerate sharply to clear a slippery area'], ['Build a smooth departure habit', 'Review repeat locations and plan gentler departures', 'Ignore acceleration after reaching cruising speed']],
    cornering: [['Prepare for a safe turn', 'Choose a safe speed before the turn', 'Enter fast and brake sharply mid-turn'], ['Read the road before turning', 'Allow more margin for limited visibility or grip', 'Assume all bends can be taken at the same speed'], ['Plan a consistent approach', 'Use earlier observation and review repeat corners', 'Rely on correcting steering at the last moment']],
    traffic: [['Read and follow signs', 'Scan for signs early and respond to their instructions', 'Follow the vehicle ahead regardless of signs'], ['Handle unfamiliar junctions', 'Reduce workload and allow time to read the signs', 'Commit quickly before checking the signs'], ['Build reliable junction habits', 'Review repeat locations and plan an earlier scan', 'Assume familiar signs never change']],
    fatigue: [['Recognize fatigue early', 'Stop safely when drowsy and contact your manager', 'Open a window and continue despite drowsiness'], ['Plan for alert driving', 'Plan appropriate rest and report fatigue concerns early', 'Use a deadline as a reason to skip rest'], ['Keep a sustainable rest routine', 'Review recurring fatigue and agree a safer work plan', 'Hide fatigue to avoid changing the schedule']],
    backing: [['Check before reversing', 'Check the area and use the agreed safe backing procedure', 'Reverse immediately if the mirrors look clear'], ['Respond to limited visibility', 'Stop when the path or agreed signal is unclear', 'Continue slowly without knowing what is behind'], ['Build a safer backing routine', 'Plan to avoid reversing where possible and recheck changes', 'Assume the area remains clear after one earlier check']]
  };
  const behaviors = behaviorSeeds.map(([id, name]) => ({ id, name }));
  const rules = behaviorSeeds.flatMap(([id, name, ruleName, condition]) => [
    { id: id + '-rule-1', behaviorId: id, name: ruleName, condition, severity: 'High', allowance: 0 },
    { id: id + '-rule-2', behaviorId: id, name: name + ' repeated pattern', condition: 'Connected feed identifies repeated ' + name.toLowerCase() + ' exceptions in the assessed period', severity: 'Medium', allowance: 1 }
  ]);
  const courses = behaviorSeeds.flatMap(([behaviorId, name, , , tip]) => topics[behaviorId].map(([title, correct, wrong], index) => ({
    id: behaviorId + '-course-' + (index + 1), version: 1, behaviorId, title,
    durationMinutes: index + 2, level: index + 1, focus: ['foundation', 'reinforcement', 'reflection'][index], ruleIds: [behaviorId + '-rule-1', behaviorId + '-rule-2'], tip, videoUrl: null, previewOnly: true,
    videoSummary: 'Sample storyboard: ' + title.toLowerCase() + '. ' + tip + ' Training video has not been supplied.',
    questions: [
      { id: behaviorId + '-' + (index + 1) + '-q1', prompt: 'Which action best applies this lesson?', options: [correct, wrong, 'Ignore the behavior unless another driver complains'], correctIndex: 0, explanation: correct + '. This gives you more time and control.' },
      { id: behaviorId + '-' + (index + 1) + '-q2', prompt: 'What should you do if completing the trip safely conflicts with time pressure?', options: ['Take more risk to keep the schedule', 'Keep the safe behavior and contact your manager about the constraint', 'Skip the checks on familiar routes'], correctIndex: 1, explanation: 'Keep the safe behavior and discuss the constraint with your manager. Time pressure does not remove the need for safe driving.' },
      { id: behaviorId + '-' + (index + 1) + '-q3', prompt: 'After the course, what shows whether this behavior is improving?', options: ['Passing the quiz alone', 'Opening the course again', 'A full subsequent driving assessment with fewer relevant problems'], correctIndex: 2, explanation: 'Course completion confirms learning activity. Improvement is reviewed using a complete subsequent driving assessment.' }
    ]
  }))).map(course => {
    const sourceLevel = global.SpeedingCoursePack?.levels?.find(level => level.id === course.id);
    if (!sourceLevel || course.behaviorId !== 'speeding') return course;
    // The source library retains its full question bank. Assigned coaching keeps
    // the approved three-question, all-correct and retry-missed-questions policy.
    const questionNumbers = course.level === 3 ? [2, 3, 4] : [1, 2, 3];
    const questions = questionNumbers.map(number => sourceLevel.questions.find(question => question.id === 'L' + course.level + '-Q' + number));
    return {
      ...course, version: 2, title: sourceLevel.title,
      summary: sourceLevel.summary, learningGoal: sourceLevel.learningGoal,
      durationMinutes: sourceLevel.videoSeconds / 60, videoSeconds: sourceLevel.videoSeconds,
      estimatedDuration: sourceLevel.estimatedDuration,
      tip: (course.level === 1 ? sourceLevel.commitment?.prompt : sourceLevel.lesson?.[0]?.body) || course.tip,
      videoSummary: sourceLevel.summary,
      lesson: clone(sourceLevel.lesson), commitment: clone(sourceLevel.commitment),
      questions: clone(questions), source: clone(global.SpeedingCoursePack.source)
    };
  });
  const catalog = { behaviors, rules, courses };
  const byId = (items, id) => items.find(item => item.id === id);
  function createPolicy(behaviorId, overrides = {}) {
    const behavior = byId(behaviors, behaviorId);
    const base = {
      id: behaviorId, name: (behavior?.name || 'New') + ' program', behaviorId, status: 'draft', version: 1,
      audience: { mode: 'all', groups: [] },
      rules: rules.filter(rule => rule.behaviorId === behaviorId).map(rule => ({ ruleId: rule.id, enabled: true, severity: rule.severity, allowance: rule.allowance })),
      scoreThreshold: 75, assessment: { basis: 'calendar', amount: 2, unit: 'weeks' },
      courseIds: courses.filter(course => course.behaviorId === behaviorId && !course.customSeriesId).map(course => course.id),
      deadlineDays: 7, reminderDays: [3, 6], maxCycles: 3, resetPeriods: 3,
      coachMode: 'program', coach: '', groupCoaches: {}
    };
    return clone({ ...base, ...overrides, audience: { ...base.audience, ...overrides.audience }, assessment: { ...base.assessment, ...overrides.assessment } });
  }
  function validatePolicy(policy) {
    const errors = [];
    if (!policy || typeof policy !== 'object') return ['Program configuration is missing.'];
    if (!String(policy.name || '').trim()) errors.push('Give this program a title.');
    if (!String(policy.id || '').trim()) errors.push('Program ID is missing.');
    if (!['draft', 'active'].includes(policy.status)) errors.push('Choose draft or active program status.');
    if (!Number.isInteger(Number(policy.version)) || Number(policy.version) < 1) errors.push('Program policy version is missing.');
    if (!byId(behaviors, policy.behaviorId)) errors.push('Choose a behavior.');
    if (!['all', 'groups'].includes(policy.audience?.mode)) errors.push('Choose the driver audience.');
    if (policy.audience?.mode === 'groups' && (!Array.isArray(policy.audience.groups) || !policy.audience.groups.length)) errors.push('Choose at least one driver group.');
    const enabledRules = (Array.isArray(policy.rules) ? policy.rules : []).filter(rule => rule && rule.enabled);
    if (!enabledRules.length) errors.push('Connect at least one enabled rule.');
    if (enabledRules.some(rule => byId(rules, rule.ruleId) ? byId(rules, rule.ruleId).behaviorId !== policy.behaviorId : !(rule.ruleId && rule.name && rule.condition))) errors.push('Each enabled rule needs a connected detection condition.');
    if (enabledRules.some(rule => !Object.hasOwn(severityWeight, rule.severity) || !numeric(rule.allowance) || !Number.isInteger(Number(rule.allowance)) || Number(rule.allowance) < 0)) errors.push('Set a severity and a nonnegative whole-number allowance for every enabled rule.');
    if (!numeric(policy.scoreThreshold) || Number(policy.scoreThreshold) < 0 || Number(policy.scoreThreshold) > 100) errors.push('Coaching threshold must be between 0 and 100.');
    if (!['calendar', 'distance', 'hours'].includes(policy.assessment?.basis) || !Number.isFinite(Number(policy.assessment?.amount)) || Number(policy.assessment.amount) <= 0) errors.push('Set a positive assessment interval.');
    if (policy.assessment?.basis === 'calendar' && !['days', 'weeks', 'months'].includes(policy.assessment.unit)) errors.push('Choose days, weeks or months for the calendar assessment.');
    const selected = (Array.isArray(policy.courseIds) ? policy.courseIds : []).map(id => byId(courses, id));
    if (!selected.length || selected.some(course => !course || course.behaviorId !== policy.behaviorId || !course.questions?.length || (!course.videoUrl && !course.previewOnly))) errors.push('Approve at least one suitable video-and-quiz course. Incomplete legacy content cannot be assigned.');
    if (!Number.isFinite(Number(policy.deadlineDays)) || Number(policy.deadlineDays) <= 0) errors.push('Set a positive course deadline.');
    if (!Array.isArray(policy.reminderDays) || policy.reminderDays.some(day => !Number.isFinite(Number(day)) || Number(day) <= 0 || Number(day) >= Number(policy.deadlineDays))) errors.push('Place reminders after delivery and before the deadline.');
    if (!Number.isInteger(Number(policy.maxCycles)) || Number(policy.maxCycles) < 1) errors.push('Allow at least one complete coaching cycle.');
    if (!Number.isInteger(Number(policy.resetPeriods)) || Number(policy.resetPeriods) < 1) errors.push('Set at least one passing assessment for a fresh start.');
    if (!['program', 'group'].includes(policy.coachMode)) errors.push('Choose how manager reviews are routed.');
    if (policy.coachMode === 'program' && !String(policy.coach || '').trim()) errors.push('Choose a manager for escalations.');
    if (policy.coachMode === 'group') {
      const groups = policy.audience?.mode === 'groups' ? (Array.isArray(policy.audience.groups) ? policy.audience.groups : []) : Object.keys(policy.groupCoaches || {});
      if (!groups.length || groups.some(group => !String(policy.groupCoaches?.[group] || '').trim())) errors.push('Assign a manager to every included group.');
    }
    return errors;
  }
  function assessmentIntervalDays(policy) {
    if (policy.assessment.basis !== 'calendar') return 0;
    return Number(policy.assessment.amount) * ({ days: 1, weeks: 7, months: 30 }[policy.assessment.unit] || 7);
  }
  const iso = value => new Date(value).toISOString();
  const afterDays = (value, days) => iso(new Date(value).getTime() + days * DAY);
  function createSimulation(policies, options = {}) {
    return {
      now: iso(options.now || '2026-09-07T09:00:00.000Z'), fleetMode: options.fleetMode || 'fully', fleetPausedAt: options.fleetMode && options.fleetMode !== 'fully' ? iso(options.now || '2026-09-07T09:00:00.000Z') : null,
      policies: clone(policies || []), drivers: clone(options.drivers || [{ id: 'demo-driver', name: 'Alex Morgan', group: 'North' }]),
      assignments: [], assessments: [], cases: [], quizAttempts: [], decisions: [], notifications: [], journeys: [], exclusions: [], events: [], lastError: null, sequence: 0
    };
  }
  const nextId = (state, prefix) => prefix + '-' + (++state.sequence);
  const note = (state, type, detail) => state.events.push({ id: nextId(state, 'event'), type, at: state.now, ...detail });
  const policyFor = (state, id) => byId(state.policies, id);
  const assignmentFor = (state, id) => byId(state.assignments, id);
  const caseFor = (state, id) => byId(state.cases, id);
  const openCase = (state, driverId, programId) => state.cases.find(item => item.driverId === driverId && item.programId === programId && item.status === 'open');
  const automationEnabled = state => state.fleetMode === 'fully';
    const unfinished = assignment => ['queued', 'ready', 'delivered', 'paused'].includes(assignment.status);
  function journeyFor(state, driverId, programId) {
    let journey = state.journeys.find(item => item.driverId === driverId && item.programId === programId);
    if (!journey) {
      journey = { driverId, programId, cycles: 0, goodStreak: 0, monitorFrom: null, lastAssessmentAt: null, stage: 'idle', reviewCaseId: null, lastCompletedAssignmentId: null, approvedMaxCycles: null };
      state.journeys.push(journey);
    }
    return journey;
  }
  function promote(state) {
    if (!automationEnabled(state)) return;
    for (const driver of state.drivers) {
      if (state.assignments.some(item => item.driverId === driver.id && item.status === 'delivered')) continue;
      const queued = state.assignments.filter(item => item.driverId === driver.id && ['ready', 'queued'].includes(item.status) && !openCase(state, item.driverId, item.programId));
      queued.sort((a, b) => severityWeight[b.severity] - severityWeight[a.severity] || (b.threshold - b.score) - (a.threshold - a.score) || a.createdAt.localeCompare(b.createdAt) || a.id.localeCompare(b.id));
      queued.forEach((item, index) => { const status = index === 0 ? 'ready' : 'queued'; if (item.status !== status) { item.status = status; if (!index) note(state, 'ready', { assignmentId: item.id }); } });
    }
  }
  function review(state, journey, assignment, reason, text) {
    let item = openCase(state, journey.driverId, journey.programId);
    if (!item) {
      item = { id: nextId(state, 'case'), driverId: journey.driverId, programId: journey.programId, assignmentId: assignment?.id || null, sessionId: assignment?.sessionId || null, status: 'open', reasons: [], messages: [], decisions: [], openedAt: state.now, resolvedAt: null };
      state.cases.push(item);
    }
    if (!item.reasons.includes(reason)) item.reasons.push(reason);
    if (text) item.messages.push({ author: 'system', text, at: state.now });
    for (const affected of state.assignments.filter(value => value.driverId === journey.driverId && value.programId === journey.programId && (unfinished(value) || value === assignment))) {
      affected.currentMode = 'manager';
      if (unfinished(affected) && affected.status !== 'paused') { affected.statusBeforePause = affected.status; affected.status = 'paused'; affected.pausedAt = state.now; affected.previousDueAt = affected.dueAt; affected.dueAt = null; }
      if (unfinished(affected)) { item.assignmentId = affected.id; item.sessionId = affected.sessionId; }
    }
    journey.stage = 'review'; journey.reviewCaseId = item.id;
    note(state, 'review', { caseId: item.id, reason });
    promote(state);
    return item;
  }
  function selectedRules(policy, ruleIds) {
    const enabled = policy.rules.filter(rule => rule.enabled);
    return ruleIds?.length ? enabled.filter(rule => ruleIds.includes(rule.ruleId)) : enabled;
  }
  // Authored series follow the manager's explicit level order. Once a series is
  // started it cannot silently fall back to another series or a built-in lesson.
  function orderedCourse(candidates, history, journey) {
    const seriesId = journey.customSeriesId || candidates.find(course => course.customSeriesId)?.customSeriesId;
    if (!seriesId) return { ordered: false };
    const completed = history.filter(item => item.completedAt && item.courseSnapshot.customSeriesId === seriesId);
    const previous = completed.at(-1);
    const nextLevel = previous ? previous.courseSnapshot.level + 1 : 1;
    const used = history.filter(item => item.completedAt || unfinished(item)).map(item => item.courseId);
    return { ordered: true, seriesId, nextLevel, selected: candidates.find(course => course.customSeriesId === seriesId && course.level === nextLevel && !used.includes(course.id)) };
  }
  function assignCourse(state, journey, policy, assessment) {
    const candidates = policy.courseIds.map(id => byId(courses, id)).filter(course => course && course.behaviorId === policy.behaviorId && course.questions?.length);
    const previous = state.assignments.filter(item => item.driverId === journey.driverId && item.programId === journey.programId);
    const sinceReset = previous.filter(item => !journey.resetAt || item.createdAt >= journey.resetAt);
    const usedIds = sinceReset.filter(item => item.completedAt || unfinished(item)).map(item => item.courseId);
    const quizErrors = state.quizAttempts.filter(attempt => sinceReset.some(item => item.id === attempt.assignmentId)).flatMap(attempt => attempt.feedback.filter(item => !item.correct)).length;
    const lastCompleted = sinceReset.filter(item => item.completedAt).at(-1);
    const worsening = lastCompleted && assessment.score < lastCompleted.score;
    const focus = journey.cycles ? (quizErrors ? 'reinforcement' : worsening ? 'reflection' : null) : 'foundation';
    const ordered = orderedCourse(candidates, sinceReset, journey);
    const selected = ordered.ordered ? ordered.selected : candidates.filter(course => !usedIds.includes(course.id)).sort((a, b) => Number(b.focus === focus) - Number(a.focus === focus) || (b.ruleIds || []).filter(id => assessment.ruleIds.includes(id)).length - (a.ruleIds || []).filter(id => assessment.ruleIds.includes(id)).length || a.level - b.level || a.id.localeCompare(b.id))[0];
    if (!selected) { review(state, journey, previous.at(-1), 'Content gap', ordered.ordered ? 'The next course in this ordered series is level ' + ordered.nextLevel + '. It is missing from the approved pool. Add and approve suitable follow-up content or resolve the review; another series will not be substituted.' : 'No suitable unused course remains in the approved library. Review the course pool before continuing.'); return; }
    const contributing = selectedRules(policy, assessment.ruleIds);
    const severity = contributing.map(rule => rule.severity).sort((a, b) => severityWeight[b] - severityWeight[a])[0] || 'Low';
    const cycle = journey.cycles + 1;
    if (ordered.ordered) journey.customSeriesId = ordered.seriesId;
    const recommendation = (cycle === 1 ? 'Start with the introductory lesson' : 'Build on ' + journey.cycles + ' completed course' + (journey.cycles === 1 ? '' : 's')) + ' for ' + (byId(behaviors, policy.behaviorId)?.name || policy.name).toLowerCase() + '. Sample score ' + assessment.score + ' is below ' + policy.scoreThreshold + '; ' + contributing.length + ' contributing rule' + (contributing.length === 1 ? '' : 's') + (quizErrors ? '. Earlier quizzes needed ' + quizErrors + ' corrections' : '') + (cycle > 1 ? '. The full follow-up assessment has not yet shown sufficient improvement.' : '.') + (ordered.ordered ? ' Ordered level ' + selected.level + ' of ' + selected.seriesLevelCount + ' in ' + selected.seriesTitle + '. Later levels wait for a completed course and full follow-up assessment.' : cycle > 1 && selected.focus === 'reinforcement' && quizErrors ? ' Reinforcement practice was selected because earlier quiz responses needed correction.' : cycle > 1 && selected.focus === 'reflection' && worsening && !quizErrors ? ' Reflection practice was selected because the sample driving score worsened despite a correct quiz.' : '');
    const assignment = {
      id: nextId(state, 'assignment'), sessionId: nextId(state, 'session'), driverId: journey.driverId, programId: policy.id,
      origin: 'automated', currentMode: 'automated', status: 'queued', createdAt: state.now, deliveredAt: null, dueAt: null, completedAt: null,
      policyVersion: policy.version, policySnapshot: clone(policy), courseId: selected.id, courseVersion: selected.version, courseSnapshot: clone(selected),
      cycle, score: assessment.score, threshold: policy.scoreThreshold, severity, ruleIds: clone(assessment.ruleIds), evidenceIds: clone(assessment.evidenceIds), assessmentId: assessment.id,
      recommendation, videoCompleted: false, correctQuestionIds: [], quizPassed: false, reminders: [], deliveryAttempts: []
    };
    state.assignments.push(assignment); journey.stage = 'course';
    note(state, 'assigned', { assignmentId: assignment.id, courseId: selected.id, cycle }); promote(state);
  }
  function completeAssignment(state, assignment) {
    if (!assignment.videoCompleted || !assignment.quizPassed || assignment.status !== 'delivered') return;
    assignment.status = 'completed'; assignment.completedAt = state.now; assignment.dueAt = null;
    const journey = journeyFor(state, assignment.driverId, assignment.programId);
    journey.cycles = Math.max(journey.cycles, assignment.cycle); journey.stage = 'monitoring'; journey.monitorFrom = state.now; journey.lastCompletedAssignmentId = assignment.id;
    note(state, 'completed', { assignmentId: assignment.id }); promote(state);
  }
  function assess(state, action) {
    const policy = policyFor(state, action.programId);
    const driver = byId(state.drivers, action.driverId);
    if (!policy || !driver) return 'Choose an existing program and driver.';
    const policyErrors = validatePolicy(policy);
    if (policy.status === 'active' && policyErrors.length) return 'Program configuration needs attention: ' + policyErrors.join(' ');
    const journey = journeyFor(state, driver.id, policy.id);
    const periodEnd = action.periodEnd ? iso(action.periodEnd) : state.now;
    if (new Date(periodEnd) > new Date(state.now)) return 'An assessment cannot end in the future.';
    const periodStart = action.periodStart ? iso(action.periodStart) : journey.monitorFrom || journey.lastAssessmentAt || afterDays(periodEnd, -assessmentIntervalDays(policy));
    const evidenceIds = (action.evidenceIds || []).filter(id => !state.exclusions.some(exclusion => exclusion.driverId === driver.id && exclusion.programId === policy.id && exclusion.evidenceId === id));
    const excludedAny = evidenceIds.length < (action.evidenceIds || []).length;
    const valid = action.valid !== false && Number.isFinite(action.score) && action.score >= 0 && action.score <= 100;
    const assessment = { id: nextId(state, 'assessment'), driverId: driver.id, programId: policy.id, policyVersion: policy.version, at: state.now, periodStart, periodEnd, score: Number.isFinite(action.score) ? action.score : null, valid, complete: action.complete !== false, exposure: action.exposure ?? null, ruleIds: action.ruleIds?.length ? clone(action.ruleIds) : policy.rules.filter(rule => rule.enabled).map(rule => rule.ruleId), evidenceIds: clone(evidenceIds), originalEvidenceIds: clone(action.evidenceIds || []), excludedEvidenceIds: (action.evidenceIds || []).filter(id => !evidenceIds.includes(id)), outcome: 'recorded' };
    state.assessments.push(assessment);
    if (policy.status !== 'active') { assessment.outcome = 'draft'; return; }
    if (policy.audience.mode === 'groups' && !policy.audience.groups.includes(driver.group)) { assessment.outcome = 'outside-audience'; return; }
    if (!automationEnabled(state)) { assessment.outcome = 'fleet-paused'; return; }
    if (policy.coachMode === 'group' && !String(policy.groupCoaches?.[driver.group] || '').trim()) { assessment.outcome = 'manager-routing-missing'; return; }
    if (!valid) { assessment.outcome = 'missing'; return; }
    if (!assessment.complete) { assessment.outcome = 'incomplete-period'; return; }
    if (journey.lastAssessmentAt && periodEnd <= journey.lastAssessmentAt) { assessment.outcome = 'duplicate-period'; return; }
    if (openCase(state, driver.id, policy.id)) { assessment.outcome = 'review-paused'; return; }
    if (excludedAny) { assessment.outcome = 'excluded-evidence'; assessment.needsReassessment = true; return; }
    if (state.assignments.some(item => item.driverId === driver.id && item.programId === policy.id && unfinished(item))) { assessment.outcome = 'course-in-progress'; return; }
    if (journey.monitorFrom) {
      const observedFrom = new Date(periodStart).getTime(), monitorFrom = new Date(journey.monitorFrom).getTime();
      const enough = policy.assessment.basis === 'calendar' ? (new Date(periodEnd).getTime() - observedFrom >= assessmentIntervalDays(policy) * DAY) : Number(action.exposure) >= Number(policy.assessment.amount);
      if (observedFrom < monitorFrom || !enough) { assessment.outcome = 'awaiting-full-follow-up'; return; }
    } else if (policy.assessment.basis === 'calendar' && new Date(periodEnd).getTime() - new Date(periodStart).getTime() < assessmentIntervalDays(policy) * DAY) { assessment.outcome = 'incomplete-period'; return; }
    else if (policy.assessment.basis !== 'calendar' && (!Number.isFinite(Number(action.exposure)) || Number(action.exposure) < Number(policy.assessment.amount))) { assessment.outcome = 'incomplete-period'; return; }
    journey.lastAssessmentAt = periodEnd;
    if (assessment.score >= Number(policy.scoreThreshold)) {
      journey.goodStreak++; assessment.outcome = 'improved'; journey.monitorFrom = periodEnd;
      if (journey.goodStreak >= Number(policy.resetPeriods)) { journey.cycles = 0; journey.customSeriesId = null; journey.approvedMaxCycles = null; journey.goodStreak = 0; journey.resetAt = state.now; journey.stage = 'idle'; journey.monitorFrom = null; assessment.outcome = 'reset'; note(state, 'reset', { driverId: driver.id, programId: policy.id }); }
      return;
    }
    journey.goodStreak = 0;
    if (journey.cycles >= (journey.approvedMaxCycles || Number(policy.maxCycles))) {
      assessment.outcome = 'repeated'; review(state, journey, assignmentFor(state, journey.lastCompletedAssignmentId), 'Repeated', 'Behavior remained below the threshold after ' + journey.cycles + ' complete course-and-follow-up cycles.'); return;
    }
    assessment.outcome = 'coaching'; assignCourse(state, journey, policy, assessment);
  }
  function recordDecision(state, item, type, detail) {
    const decision = { id: nextId(state, 'decision'), caseId: item.id, assignmentId: item.assignmentId, at: state.now, type, ...detail };
    state.decisions.push(decision); item.decisions.push(decision.id); return decision;
  }
  function resolveCase(state, item) { item.status = 'resolved'; item.resolvedAt = state.now; const journey = journeyFor(state, item.driverId, item.programId); journey.reviewCaseId = null; return journey; }
  function tick(state) {
    if (!automationEnabled(state)) return;
    for (const assignment of state.assignments) {
      if (assignment.status !== 'delivered' || !assignment.deliveredAt || !assignment.dueAt || openCase(state, assignment.driverId, assignment.programId)) continue;
      const delivered = new Date(assignment.clockStartAt || assignment.deliveredAt).getTime();
      for (const day of assignment.policySnapshot.reminderDays) {
        const scheduledAt = iso(delivered + day * DAY);
        if (new Date(scheduledAt) <= new Date(state.now) && new Date(scheduledAt) < new Date(assignment.dueAt) && !assignment.reminders.includes(day)) { assignment.reminders.push(day); state.notifications.push({ id: nextId(state, 'notice'), assignmentId: assignment.id, type: 'reminder', day, at: scheduledAt, simulated: true }); }
      }
      if (new Date(state.now) >= new Date(assignment.dueAt)) review(state, journeyFor(state, assignment.driverId, assignment.programId), assignment, 'Overdue', 'The delivered course passed its deadline without completion.');
    }
  }
  function handle(state, action) {
    if (!action || !action.type) return 'Choose a simulation action.';
    if (action.type === 'assess') return assess(state, action);
    if (action.type === 'advance') { if (!Number.isFinite(Number(action.days)) || Number(action.days) < 0) return 'Advance by a nonnegative number of days.'; state.now = afterDays(state.now, Number(action.days)); tick(state); return; }
    if (action.type === 'setFleetMode') {
      if (!['fully', 'semi', 'assisted', 'manual'].includes(action.mode)) return 'Choose a fleet automation mode.';
      if (state.fleetMode === 'fully' && action.mode !== 'fully') state.fleetPausedAt = state.now;
      if (state.fleetMode !== 'fully' && action.mode === 'fully' && state.fleetPausedAt) {
        for (const item of state.assignments.filter(value => value.status === 'delivered' && value.dueAt)) {
          const pauseStart = Math.max(new Date(state.fleetPausedAt).getTime(), new Date(item.clockStartAt || item.deliveredAt).getTime());
          const pausedDays = (new Date(state.now).getTime() - pauseStart) / DAY;
          item.clockStartAt = afterDays(item.clockStartAt || item.deliveredAt, pausedDays); item.dueAt = afterDays(item.dueAt, pausedDays);
        }
        state.fleetPausedAt = null;
      }
      state.fleetMode = action.mode; note(state, 'fleet-mode', { mode: action.mode }); promote(state); tick(state); return;
    }
    if (action.type === 'updatePolicy') {
      const errors = validatePolicy(action.policy); if (action.policy?.status === 'active' && errors.length) return errors.join(' ');
      const index = state.policies.findIndex(policy => policy.id === action.policy.id); if (index < 0) state.policies.push(clone(action.policy)); else state.policies[index] = clone(action.policy);
      note(state, 'policy-updated', { programId: action.policy.id, version: action.policy.version }); return;
    }
    const assignment = assignmentFor(state, action.assignmentId);
    if (['deliver', 'video', 'quiz', 'driverMessage', 'handoff'].includes(action.type) && !assignment) return 'Choose an existing course assignment.';
    if (action.type === 'deliver') {
      if (!automationEnabled(state)) return 'Fleet automation is paused. Set the fleet to fully automated to deliver.';
      if (assignment.status !== 'ready') return 'Only the ready course can be delivered.';
      const success = action.success !== false; assignment.deliveryAttempts.push({ at: state.now, success });
      if (!success) { note(state, 'delivery-failed', { assignmentId: assignment.id }); return; }
      assignment.status = 'delivered'; assignment.firstDeliveredAt ||= state.now; assignment.deliveredAt = state.now; assignment.clockStartAt = state.now; assignment.dueAt = afterDays(state.now, assignment.resumeDeadlineDays || assignment.policySnapshot.deadlineDays);
      state.notifications.push({ id: nextId(state, 'notice'), type: 'course-delivered', assignmentId: assignment.id, at: state.now, simulated: true });
      note(state, 'delivered', { assignmentId: assignment.id }); return;
    }
    if (action.type === 'video') { if (assignment.status !== 'delivered') return 'Deliver the course and resolve any open review before continuing.'; assignment.videoCompleted = action.complete !== false; completeAssignment(state, assignment); return; }
    if (action.type === 'quiz') {
      if (assignment.status !== 'delivered') return 'Deliver the course and resolve any open review before taking the quiz.';
      if (!assignment.videoCompleted) return 'Complete the video preview before taking the quiz.';
      const remaining = assignment.courseSnapshot.questions.filter(question => !assignment.correctQuestionIds.includes(question.id));
      if (!remaining.length) return 'This quiz is already complete.';
      const answers = action.answers || {};
      if (remaining.some(question => !Number.isInteger(Number(answers[question.id])) || Number(answers[question.id]) < 0 || Number(answers[question.id]) >= question.options.length || answers[question.id] === undefined || answers[question.id] === '')) return 'Answer each remaining question before submitting.';
      const feedback = remaining.map(question => ({ questionId: question.id, correct: Number(answers[question.id]) === question.correctIndex, explanation: question.feedback?.[Number(answers[question.id])] || question.explanation }));
      feedback.filter(item => item.correct).forEach(item => assignment.correctQuestionIds.push(item.questionId));
      assignment.quizPassed = assignment.correctQuestionIds.length === assignment.courseSnapshot.questions.length;
      state.quizAttempts.push({ id: nextId(state, 'quiz'), assignmentId: assignment.id, at: state.now, answers: clone(answers), feedback, passed: assignment.quizPassed }); completeAssignment(state, assignment); return;
    }
    if (action.type === 'driverMessage') {
      const text = String(action.text || '').trim(); if (!text) return 'Write a message for your manager.';
      if (['waived', 'closed'].includes(assignment.status)) return 'This assignment is closed.';
      const item = review(state, journeyFor(state, assignment.driverId, assignment.programId), assignment, 'Replied');
      item.messages.push({ author: 'driver', text, at: state.now, dispute: !!action.dispute }); if (action.dispute) item.disputePending = true;
      note(state, 'driver-message', { caseId: item.id }); return;
    }
    if (action.type === 'handoff') { const reason = String(action.reason || '').trim(); if (!reason) return 'Record why this program needs an early manager handoff.'; review(state, journeyFor(state, assignment.driverId, assignment.programId), assignment, 'Manager review', reason); return; }
    const item = caseFor(state, action.caseId);
    if (!item || item.status !== 'open') return 'Choose an open manager review.';
    const caseAssignment = assignmentFor(state, item.assignmentId);
    if (action.type === 'managerReply') { const text = String(action.text || '').trim(); if (!text) return 'Write a reply.'; item.messages.push({ author: 'manager', text, at: state.now }); note(state, 'manager-reply', { caseId: item.id }); return; }
    if (action.type === 'resolveDispute') {
      if (!String(action.reason || '').trim()) return 'Record the reason for the dispute decision.';
      const evidenceIds = action.evidenceIds || caseAssignment?.evidenceIds || [];
      if (action.upheld && !evidenceIds.length) return 'Choose recorded evidence to exclude when upholding the dispute.';
      if (action.upheld) for (const evidenceId of evidenceIds) {
        if (!caseAssignment?.evidenceIds.includes(evidenceId)) return 'Only evidence linked to this assignment can be excluded.';
      }
      if (action.upheld) for (const evidenceId of evidenceIds) if (!state.exclusions.some(exclusion => exclusion.driverId === item.driverId && exclusion.programId === item.programId && exclusion.evidenceId === evidenceId)) state.exclusions.push({ id: nextId(state, 'exclusion'), driverId: item.driverId, programId: item.programId, evidenceId, caseId: item.id, at: state.now, reason: action.reason });
      item.disputePending = false; item.disputeOutcome = action.upheld ? 'upheld' : 'not-upheld'; recordDecision(state, item, 'dispute', { upheld: !!action.upheld, reason: action.reason, evidenceIds: clone(evidenceIds) }); return;
    }
    if (action.type === 'resume') {
      if (action.confirm !== true || !Number.isFinite(Number(action.deadlineDays)) || Number(action.deadlineDays) <= 0) return 'Confirm the remaining course and a new positive deadline before resuming.';
      if (item.disputePending) return 'Resolve the pending dispute before resuming coaching.';
      const journey = journeyFor(state, item.driverId, item.programId), policy = policyFor(state, item.programId);
      const limit = journey.approvedMaxCycles || Number(policy.maxCycles);
      if (journey.cycles >= limit && (!Number.isInteger(Number(action.revisedMaxCycles)) || Number(action.revisedMaxCycles) <= journey.cycles || !String(action.reason || '').trim())) return 'Record an explicitly revised cycle limit and reason before continuing beyond the approved plan.';
      if (action.revisedMaxCycles !== undefined) { if (!Number.isInteger(Number(action.revisedMaxCycles)) || Number(action.revisedMaxCycles) <= journey.cycles || !String(action.reason || '').trim()) return 'The revised cycle limit must exceed completed cycles and include a reason.'; }
      if (item.reasons.includes('Content gap')) {
        const used = state.assignments.filter(value => value.driverId === item.driverId && value.programId === item.programId && (value.completedAt || unfinished(value)) && (!journey.resetAt || value.createdAt >= journey.resetAt)).map(value => value.courseId);
        const candidates = policy.courseIds.map(id => byId(courses, id)).filter(course => course && course.behaviorId === policy.behaviorId && course.questions?.length);
        const history = state.assignments.filter(value => value.driverId === item.driverId && value.programId === item.programId && (!journey.resetAt || value.createdAt >= journey.resetAt));
        const ordered = orderedCourse(candidates, history, journey);
        if (ordered.ordered ? !ordered.selected : !candidates.some(course => !used.includes(course.id))) return 'Approve suitable unused content before resuming this program.';
      }
      if (action.revisedMaxCycles !== undefined) journey.approvedMaxCycles = Number(action.revisedMaxCycles);
      recordDecision(state, item, 'resume', { deadlineDays: Number(action.deadlineDays), revisedMaxCycles: action.revisedMaxCycles || null, reason: action.reason || 'Manager confirmed remaining course and deadline.' }); resolveCase(state, item);
      if (caseAssignment && caseAssignment.status === 'paused') { caseAssignment.currentMode = 'automated'; caseAssignment.status = 'queued'; caseAssignment.dueAt = null; caseAssignment.resumeDeadlineDays = Number(action.deadlineDays); caseAssignment.reminders = []; journey.stage = 'course'; }
      else { if (caseAssignment) caseAssignment.currentMode = 'automated'; journey.stage = journey.cycles ? 'monitoring' : 'idle'; journey.monitorFrom = state.now; }
      promote(state); return;
    }
    if (action.type === 'waive' || action.type === 'close') {
      const reason = String(action.reason || '').trim(); if (!reason) return 'Record why the assignment is being closed.';
      recordDecision(state, item, action.type, { reason }); const journey = resolveCase(state, item);
      if (caseAssignment && unfinished(caseAssignment)) { caseAssignment.status = action.type === 'waive' ? 'waived' : 'closed'; caseAssignment.dueAt = null; caseAssignment.closedAt = state.now; }
      journey.stage = 'monitoring'; journey.monitorFrom = state.now; promote(state); return;
    }
    return 'Unknown simulation action.';
  }
  function dispatch(state, action) {
    state.lastError = null;
    try { state.lastError = handle(state, action) || null; } catch (error) { state.lastError = error instanceof Error ? error.message : String(error); }
    return state;
  }
  global.Coaching = { catalog, createPolicy, validatePolicy, createSimulation, dispatch, assessmentIntervalDays };
})(globalThis);
