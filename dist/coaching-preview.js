/* Isolated, explicit sample workspace for the program coaching engine. */
(function () {
  'use strict';
  const clone = value => JSON.parse(JSON.stringify(value));
  const esc = value => String(value == null ? '' : value).replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[char]);
  const icon = name => typeof uiIcon === 'function' ? uiIcon(name) : '';
  const status = label => typeof uiStatus === 'function' ? uiStatus(label) : '<span class="status">' + esc(label) + '</span>';
  let dialog, opener, simulation, sourcePolicies = [], selectedProgram, selectedDriver = 'demo-driver', view = 'driver';
  let message = '', scoreInput = 62, daysInput = 3, draftMessages = {}, draftReplies = {}, decisionNotes = {}, controlsOpen = false;
  let previewDefaults = new Set();
  const date = value => value && !Number.isNaN(new Date(value).getTime()) ? new Intl.DateTimeFormat('en-CA', { month: 'short', day: 'numeric', year: 'numeric', timeZone: 'UTC' }).format(new Date(value)) : 'Not started';
  const button = (action, label, primary, extra = '') => '<button type="button" class="button button--' + (primary ? 'primary' : 'secondary') + '" data-cp-action="' + action + '" ' + extra + '>' + label + '</button>';
  const field = (label, html) => '<label class="field"><span class="field-label">' + label + '</span>' + html + '</label>';
  const numeric = (id, value, min, max) => '<input class="filter-control" id="' + id + '" type="number" min="' + min + '" max="' + max + '" step="1" required value="' + esc(value) + '">';
  const policyList = () => Array.isArray(simulation?.policies) ? simulation.policies : Object.values(simulation?.policies || {});
  const policy = () => policyList().find(item => item.id === selectedProgram);
  const driver = () => simulation?.drivers.find(item => item.id === selectedDriver);
  const assignments = () => (simulation?.assignments || []).filter(item => item.driverId === selectedDriver);
  const currentAssignment = () => assignments().filter(item => item.programId === selectedProgram).slice(-1)[0];
  const currentCase = () => (simulation?.cases || []).filter(item => item.driverId === selectedDriver && item.programId === selectedProgram && item.status === 'open').slice(-1)[0];
  const journey = () => {
    const records = Array.isArray(simulation?.journeys) ? simulation.journeys : Object.values(simulation?.journeys || {});
    return records.find(item => item.driverId === selectedDriver && item.programId === selectedProgram);
  };
  const course = assignment => assignment?.courseSnapshot;
  const videoDuration = item => item?.videoSeconds ? item.videoSeconds + ' sec' : (item?.durationMinutes || 3) + ' min';
  const nameFor = id => policyList().find(item => item.id === id)?.name || id;
  const labelFor = assignment => ({ queued: 'Queued', ready: 'Ready to deliver', delivered: 'Awaiting driver', paused: 'Needs review', completed: 'Completed', waived: 'Waived', closed: 'Closed' })[assignment.status] || assignment.status;
  const assessmentOutcomes = { coaching: 'A suitable course has been selected.', improved: 'The score met the threshold. The on-track streak increased.', reset: 'The on-track streak is complete. Future coaching starts at an introductory level.', missing: 'Missing assessment recorded. The on-track streak is paused.', 'fleet-paused': 'Fleet automation requires a manager. No automated course was assigned.', 'outside-audience': 'This sample driver is outside the program audience.', 'manager-routing-missing': 'The sample driver’s group needs a manager for this program.', 'duplicate-period': 'This period was already assessed. Run the next full assessment to continue.', 'review-paused': 'The assessment was recorded, but coaching stays paused during manager review.', 'course-in-progress': 'The assessment was recorded. Finish the current course before another is considered.', 'awaiting-full-follow-up': 'Wait for a complete assessment period after course completion.', 'incomplete-period': 'A complete assessment interval is required.', 'excluded-evidence': 'This evidence was excluded by an upheld dispute.', repeated: 'The completed cycle limit was reached. Manager review is now required.' };
  const validation = item => {
    const result = window.Coaching.validatePolicy(item);
    return Array.isArray(result) ? result : result?.errors || [];
  };
  const errorText = item => typeof item === 'string' ? item : item.message || item.error || item.field || 'Program configuration is incomplete.';
  const fleetMode = () => {
    try { return localStorage.getItem('elevate-automation-mode') || 'fully'; } catch (_) { return 'fully'; }
  };
  const modeLabel = mode => mode === 'fully' ? 'Fully automated' : mode === 'manual' ? 'Manual' : 'Manager approval required';

  function init() {
    if (dialog) return;
    dialog = document.createElement('dialog');
    dialog.className = 'dialog drawer coaching-preview';
    dialog.id = 'coaching-preview-dialog';
    dialog.setAttribute('aria-labelledby', 'coaching-preview-title');
    dialog.setAttribute('aria-describedby', 'coaching-preview-description');
    document.body.appendChild(dialog);
    dialog.addEventListener('click', handleClick);
    dialog.addEventListener('change', handleChange);
    dialog.addEventListener('input', handleInput);
    dialog.addEventListener('submit', handleSubmit);
    dialog.addEventListener('toggle', event => {
      if (event.target.id === 'cp-scenario-controls') controlsOpen = event.target.open;
    }, true);
    dialog.addEventListener('close', () => {
      if (opener?.isConnected) {
        opener.setAttribute('aria-expanded', 'false');
        opener.focus({ preventScroll: true });
      }
    });
    dialog.addEventListener('click', event => {
      if (event.target !== dialog) return;
      const rect = dialog.getBoundingClientRect();
      if (event.clientX < rect.left || event.clientX > rect.right || event.clientY < rect.top || event.clientY > rect.bottom) dialog.close();
    });
    window.addEventListener('hashchange', () => { if (dialog.open) dialog.close(); });
    let narrow = window.innerWidth <= 900;
    window.addEventListener('resize', () => {
      const nextNarrow = window.innerWidth <= 900;
      if (nextNarrow && !narrow) {
        controlsOpen = false;
        const controls = dialog.querySelector('#cp-scenario-controls');
        if (controls) controls.open = false;
      }
      narrow = nextNarrow;
    });
  }

  function reset() {
    simulation = window.Coaching.createSimulation(clone(sourcePolicies).map(item => ({ ...item, status: 'active' })), {
      fleetMode: fleetMode(), now: '2026-09-07T09:00:00.000Z',
      drivers: [{ id: 'demo-driver', name: 'Alex Morgan', group: firstGroup() }, { id: 'demo-driver-2', name: 'Taylor Brooks', group: firstGroup() }]
    });
    selectedDriver = 'demo-driver';
    scoreInput = 62;
    daysInput = 3;
    draftMessages = {};
    draftReplies = {};
    decisionNotes = {};
    previewDefaults = new Set();
    message = 'Sample workspace ready. Assess a driver to see the first coaching assignment.';
  }

  function firstGroup() {
    const selected = sourcePolicies.find(item => item.id === selectedProgram);
    return selected?.audience?.groups?.[0] || Object.keys(selected?.groupCoaches || {})[0] || 'North';
  }

  function open(programId, suppliedPolicy) {
    if (!window.Coaching || !window.ProgramSetup) return;
    init();
    opener = document.activeElement;
    if (opener instanceof HTMLElement) opener.setAttribute('aria-expanded', 'true');
    sourcePolicies = clone(window.ProgramSetup.getPolicies() || []);
    const current = suppliedPolicy || window.ProgramSetup.getPreviewPolicy?.(programId) || window.ProgramSetup.getPolicy(programId);
    if (current) {
      const existing = sourcePolicies.findIndex(item => item.id === current.id);
      if (existing >= 0) sourcePolicies[existing] = clone(current);
      else sourcePolicies.push(clone(current));
    }
    if (!sourcePolicies.length) return;
    selectedProgram = current?.id || (sourcePolicies.some(item => item.id === programId) ? programId : sourcePolicies[0].id);
    view = 'driver';
    controlsOpen = window.innerWidth > 900;
    reset();
    render(false);
    if (!dialog.open) dialog.showModal();
    requestAnimationFrame(() => dialog.querySelector('[data-cp-action="close-preview"]')?.focus());
  }

  function dispatch(action, successMessage) {
    window.Coaching.dispatch(simulation, action);
    message = simulation.lastError || successMessage || 'Sample workspace updated.';
    render();
    return !simulation.lastError;
  }

  function render(restoreFocus = true) {
    if (!simulation || !policy()) return;
    const focused = dialog.contains(document.activeElement) ? document.activeElement : null;
    const focusKey = focused?.id || null;
    const actionKey = focused?.dataset?.cpAction || null;
    const scroll = dialog.scrollTop;
    const openDetails = [...dialog.querySelectorAll('details[id][open]')].map(item => item.id);
    const hasReview = (simulation.cases || []).some(item => item.driverId === selectedDriver && item.status === 'open');
    dialog.innerHTML = '<header class="drawer__header"><div class="cp-header-copy"><h2 class="drawer__title" id="coaching-preview-title">Coaching preview</h2><p class="drawer__context">' + esc(policy().name) + '</p></div>' + button('close-preview', icon('close') + '<span class="sr-only">Close coaching preview</span>', false, 'aria-label="Close coaching preview"') + '</header>' +
      '<div class="drawer__body"><div class="cp-intro"><div class="cp-intro-copy"><p id="coaching-preview-description"><strong>Sample workspace</strong> · Try the driver journey and manager exceptions with explicit sample assessments.</p><p class="caption">No messages are sent. Sample courses, decisions, and scores stay separate from fleet reporting. Draft plans are simulated as active.</p></div><span class="status">' + esc(date(simulation.now)) + '</span></div>' +
      '<div class="cp-intro"><fieldset class="segmented"><legend class="sr-only">Preview perspective</legend>' + [['driver', 'Driver preview'], ['manager', 'Manager review' + (hasReview ? ' · Action needed' : '')], ['activity', 'Activity']].map(([id, label]) => '<label><input id="cp-view-' + id + '" type="radio" name="cp-view" value="' + id + '"' + (view === id ? ' checked' : '') + '><span class="segmented__option">' + label + '</span></label>').join('') + '</fieldset><p class="caption">Fleet mode: ' + esc(modeLabel(simulation.fleetMode)) + '</p></div>' +
      '<p class="cp-alert' + (simulation.lastError ? ' cp-error' : ' caption') + '" role="status" aria-live="polite" tabindex="-1" id="cp-announcement">' + esc(message) + '</p>' +
      '<div class="cp-layout"><main class="cp-main" aria-label="' + (view === 'driver' ? 'Sample driver coaching' : view === 'manager' ? 'Sample manager review' : 'Sample coaching activity') + '">' + (view === 'driver' ? renderDriver() : view === 'manager' ? renderManager() : renderActivity()) + '</main>' + renderControls() + '</div></div>';
    openDetails.forEach(id => { const node = dialog.querySelector('#' + id); if (node) node.open = true; });
    dialog.querySelectorAll('video[data-cp-video]').forEach(video => {
      video.addEventListener('ended', () => dispatch({ type: 'video', assignmentId: video.dataset.cpVideo, complete: true }, 'Video finished. Complete the short quiz next.'));
      video.addEventListener('error', () => {
        const notice = dialog.querySelector('#cp-video-error');
        if (notice) { notice.hidden = false; notice.textContent = 'This training video could not be loaded. Check the saved video link or try again when it is available. The video has not been marked complete.'; }
      });
    });
    dialog.scrollTop = scroll;
    if (restoreFocus && focused) {
      const next = focusKey ? document.getElementById(focusKey) : actionKey ? [...dialog.querySelectorAll('[data-cp-action]')].find(node => node.dataset.cpAction === actionKey) : null;
      (next || dialog.querySelector('#cp-announcement'))?.focus?.({ preventScroll: true });
    }
  }

  function renderControls() {
    const item = policy();
    const j = journey();
    const a = currentAssignment();
    const interval = window.Coaching.assessmentIntervalDays(item);
    const assessmentDisabled = validation(item).length ? ' disabled' : '';
    const cadence = item.assessment?.basis === 'distance' ? item.assessment.amount + ' ' + (item.assessment.unit || 'km') : item.assessment?.basis === 'hours' ? item.assessment.amount + ' driving hours' : interval + ' days';
    return '<details class="card cp-controls" id="cp-scenario-controls"' + (controlsOpen ? ' open' : '') + '><summary>Scenario controls</summary><div class="cp-stack">' +
      field('Sample driver', '<select class="filter-control" id="cp-driver">' + simulation.drivers.map(item => '<option value="' + esc(item.id) + '"' + (item.id === selectedDriver ? ' selected' : '') + '>' + esc(item.name) + '</option>').join('') + '</select>') +
      field('Program to assess', '<select class="filter-control" id="cp-program">' + policyList().map(item => '<option value="' + esc(item.id) + '"' + (item.id === selectedProgram ? ' selected' : '') + '>' + esc(item.name) + '</option>').join('') + '</select>') +
      '<p class="caption">Select another program for the same driver to try the shared course queue.</p><hr>' +
      '<form id="cp-assessment-form" class="cp-stack">' + field('Sample program score (0–100)', numeric('cp-score', scoreInput, 0, 100)) +
      '<p class="caption">Coaching begins below ' + esc(item.scoreThreshold) + '. Assessment: ' + esc(cadence) + '. This score is supplied explicitly, not calculated from events.</p>' +
      '<button class="button button--secondary" type="submit" id="cp-assess-now"' + assessmentDisabled + '>Assess sample driver</button>' +
      button('next-assessment', 'Run next full assessment', false, 'id="cp-next-assessment"' + assessmentDisabled) +
      button('missing-assessment', 'Record missing assessment', false) + '</form><hr>' +
      '<form id="cp-advance-form" class="cp-stack">' + field('Advance sample clock (days)', numeric('cp-days', daysInput, 1, 365)) + '<button class="button button--secondary" type="submit">Advance time</button></form><p class="caption">Delivered courses receive reminders on the saved schedule. Queued or failed deliveries have no deadline.</p>' +
      '<dl class="cp-facts"><div><dt>Completed cycles</dt><dd>' + esc(j?.cycles || 0) + ' / ' + esc(j?.approvedMaxCycles || item.maxCycles) + '</dd></div><div><dt>On-track streak</dt><dd>' + esc(j?.goodStreak || 0) + ' / ' + esc(item.resetPeriods) + '</dd></div></dl>' +
      (a ? '<details class="cp-disclosure" id="cp-assignment-details"><summary>Assignment details</summary><dl class="cp-facts"><div><dt>Created by</dt><dd>' + esc(a.origin === 'automated' ? 'Automation' : a.origin) + '</dd></div><div><dt>Current handling</dt><dd>' + esc(a.currentMode === 'manager' ? 'Manager' : 'Automated') + '</dd></div><div><dt>Policy version</dt><dd>' + esc(a.policyVersion) + '</dd></div><div><dt>Course version</dt><dd>' + esc(a.courseVersion) + '</dd></div></dl><p class="caption cp-footer">Session ' + esc(a.sessionId) + ' retains its creation origin when a manager takes over.</p></details>' : '') +
      '<div class="cp-footer">' + button('reset', 'Reset sample workspace', false) + '</div></div></details>';
  }

  function renderDriver() {
    const item = policy(), a = currentAssignment(), review = currentCase(), j = journey();
    const errors = validation(item);
    const intro = '<div class="cp-heading"><div><p class="caption">SAMPLE DRIVER · ' + esc(driver()?.group) + '</p><h3 class="cp-title">' + esc(driver()?.name) + '</h3><p class="cp-meta">' + esc(item.name) + '</p></div>' + (review ? status(review.reasons[0] || 'Needs review') : a ? status(labelFor(a)) : status('Automated')) + '</div>';
    if (errors.length && !a) return '<section class="card cp-card">' + intro + '<div class="cp-notice"><h4>This program needs setup</h4><ul class="cp-step-list">' + errors.map(error => '<li>' + esc(errorText(error)) + '</li>').join('') + '</ul><p>Try a recommended sample plan to explore the course journey. Your saved program stays unchanged.</p>' + button('load-sample', 'Load recommended sample plan', true) + '</div></section>' + renderQueue();
    if (!a) return '<section class="card cp-card cp-empty">' + intro + icon('bolt') + '<h4>' + (j?.goodStreak ? 'Driving is on track' : 'See what the driver receives') + '</h4><p>' + (j?.goodStreak ? 'The latest valid sample score met the program threshold. Keep assessing to demonstrate the fresh-start streak.' : 'A below-threshold assessment starts automated coaching with a tip and a short video-and-quiz course.') + '</p><ol class="cp-step-list"><li>Review the behavior and why coaching was assigned.</li><li>Finish a short video and three-question quiz.</li><li>Check driving improvement after the next full assessment.</li></ol>' + button('assess-default', 'Assess sample driver', true) + (simulation.fleetMode !== 'fully' ? '<p class="cp-notice">The fleet is set to ' + esc(modeLabel(simulation.fleetMode).toLowerCase()) + '. Automatic assignment remains subject to that mode.</p>' : '') + '</section>' + renderQueue();
    const c = course(a);
    const rules = (a.policySnapshot?.rules || []).filter(rule => (a.ruleIds || []).includes(rule.ruleId)).map(rule => ({ ...window.Coaching.catalog.rules.find(connected => connected.id === rule.ruleId), ...rule }));
    const evidence = '<details class="cp-disclosure" id="cp-evidence"><summary>Why this coaching was assigned</summary><div class="cp-stack"><p>' + esc(a.recommendation) + '</p><dl class="cp-facts"><div><dt>Sample assessed score</dt><dd>' + esc(a.score) + ' / 100</dd></div><div><dt>Coaching threshold</dt><dd>Below ' + esc(a.threshold) + '</dd></div></dl>' + (rules.length ? '<ul class="cp-list">' + rules.map(rule => '<li><strong>' + esc(rule.name || rule.id) + '</strong><span class="caption">' + esc(rule.severity) + ' severity · Detection: ' + esc(rule.detection || rule.condition || rule.name || 'Connected rule') + '</span></li>').join('') + '</ul>' : '') + '<p class="caption">Explicit sample evidence: ' + esc((a.evidenceIds || []).join(', ') || 'Sample assessment') + '. No real driving incident or calculated score is implied.</p></div></details>';
    let body = '';
    if (review) body = '<div class="cp-notice"><div class="cp-badges">' + review.reasons.map(status).join('') + '</div><h4>Your manager is reviewing this coaching</h4><p>Your progress is saved. This program’s deadlines and reminders are paused while your manager reviews it.</p>' + button('view-manager', 'Open manager review', false) + '</div>';
    else if (a.status === 'queued') body = '<div class="cp-notice"><h4>This course is next in your queue</h4><p>Finish your current course first. This course’s deadline begins when it is delivered.</p></div>';
    else if (a.status === 'ready') body = '<div class="cp-notice"><h4>' + (a.deliveryAttempts?.some(attempt => attempt.success === false) ? 'Delivery will be retried' : 'Your course is ready to deliver') + '</h4><p>The ' + esc(a.resumeDeadlineDays || a.policySnapshot.deadlineDays) + '-day deadline starts only after successful delivery.</p><div class="cp-actions">' + button('deliver', 'Simulate successful delivery', true) + button('fail-delivery', 'Simulate delivery failure', false) + '</div></div>';
    else if (a.status === 'completed') body = '<div class="cp-notice">' + status('Completed') + '<h4>' + (j?.resetAt && !j.cycles ? 'Fresh start earned' : 'Coursework complete') + '</h4><p>' + (j?.resetAt && !j.cycles ? 'You completed the on-track assessment streak. Future coaching starts with an introductory course; your history remains available.' : j?.stage === 'monitoring' ? 'Your course is finished. Driving improvement is checked after a complete subsequent assessment period.' : 'Your driving assessment and course completion remain separate outcomes. Keep reviewing the next complete assessment period.') + '</p><p class="caption">On-track assessments: ' + esc(j?.goodStreak || 0) + ' / ' + esc(item.resetPeriods) + '. ' + esc(item.resetPeriods) + ' consecutive valid on-track assessments restart future coaching at an introductory level.</p></div>';
    else if (['closed', 'waived'].includes(a.status)) body = '<div class="cp-notice"><h4>Assignment ' + esc(a.status) + '</h4><p>Your recorded course and conversation history are preserved.</p></div>';
    else if (a.status === 'delivered') body = renderCourse(a);
    return '<section class="card cp-card">' + intro + '<div class="cp-heading"><div><h4>' + esc(c?.title || 'Coaching review') + '</h4><p class="caption">' + esc(videoDuration(c)) + ' video · ' + esc(c?.questions?.length || 3) + ' questions · Course ' + esc(a.cycle) + '</p></div>' + (a.dueAt && !review && a.status === 'delivered' ? '<span class="caption">Due ' + esc(date(a.dueAt)) + '</span>' : '') + '</div><p>Your sample program score of <strong>' + esc(a.score) + '</strong> was below the coaching threshold of ' + esc(a.threshold) + '.</p>' + evidence + (c?.tip ? '<div class="cp-tip"><strong>A tip for your next drive</strong><p>' + esc(c.tip) + '</p></div>' : '') + body + '</section>' +
      (a.status !== 'ready' && a.status !== 'queued' && !['closed', 'waived'].includes(a.status) ? renderDriverMessages(a, review) : '') + renderQueue();
  }

  function renderCourse(a) {
    const c = course(a);
    if (!c || !Array.isArray(c.questions) || !c.questions.length) return '<div class="cp-notice">This legacy course has incomplete video or quiz content. A suitable course needs to be approved before it can be completed.</div>';
    const parkedCue = '<p class="cp-notice">Complete this training only when safely parked, never while driving.</p>';
    const video = parkedCue + (a.videoCompleted ? '<div class="cp-actions">' + status('Completed') + '<span>Video finished</span></div>' : c.videoUrl ? '<video controls playsinline preload="none" src="' + esc(c.videoUrl) + '" data-cp-video="' + esc(a.id) + '" aria-label="' + esc(c.title) + '"></video><p class="cp-notice" id="cp-video-error" role="status" hidden></p>' : '<div class="cp-video">' + icon('video') + '<div class="cp-video-copy"><strong>Short training video · ' + esc(videoDuration(c)) + '</strong><p>' + esc(c.title) + '</p><p class="caption">Preview only · No training video has been supplied. Use the control below to demonstrate finishing the video.</p></div>' + button('video-finished', 'Simulate video finished', true) + '</div>');
    if (!a.videoCompleted) return video + '<p class="caption">The short quiz unlocks when the video is finished.</p>';
    const correct = a.correctQuestionIds || [];
    const questions = c.questions.filter(question => !correct.includes(question.id));
    const attempts = simulation.quizAttempts.filter(attempt => attempt.assignmentId === a.id);
    const last = attempts.slice(-1)[0];
    return video + '<form id="cp-quiz-form" class="cp-stack"><div class="cp-progress"><div class="cp-heading"><h4>Quick knowledge check</h4><span class="caption">' + correct.length + ' / ' + c.questions.length + ' correct</span></div><progress value="' + correct.length + '" max="' + c.questions.length + '" aria-label="Questions answered correctly"></progress></div>' +
      (last && questions.length ? '<p class="cp-feedback">' + (correct.length ? 'Your correct answers are saved. ' : '') + 'Review the explanations and retry the questions below.</p>' : '') +
      questions.map((question, index) => {
        const feedback = last?.feedback?.find(item => item.questionId === question.id);
        return '<fieldset class="cp-question"><legend>' + (index + 1) + '. ' + esc(question.prompt) + '</legend>' + question.options.map((option, optionIndex) => '<label class="cp-choice"><input type="radio" name="quiz-' + esc(question.id) + '" value="' + optionIndex + '" required><span>' + esc(typeof option === 'object' ? option.label || option.text : option) + '</span></label>').join('') + (feedback && !feedback.correct ? '<p class="cp-feedback"><strong>Try again.</strong> ' + esc(feedback.explanation) + '</p>' : '') + '</fieldset>';
      }).join('') + '<button type="submit" class="button button--primary" id="cp-submit-quiz">' + (last ? 'Check remaining answers' : 'Check answers') + '</button><p class="caption">Finish all questions correctly to complete this course. Incorrect answers include an explanation and can be retried.</p></form>';
  }

  function renderDriverMessages(a, review) {
    const messages = (simulation.cases || []).filter(item => item.driverId === selectedDriver && item.programId === selectedProgram).flatMap(item => item.messages || []);
    return '<section class="card cp-card"><h4>Talk to your fleet manager</h4><p>Ask a question or tell your manager if this coaching does not look right. Any message opens manager review and pauses this program’s coursework.</p>' + renderMessages(messages) + '<form class="cp-stack" id="cp-driver-message-form">' + field('Your message', '<textarea class="search-control" id="cp-driver-message" maxlength="3000" required placeholder="I have a question about this coaching…">' + esc(draftMessages[a.id] || '') + '</textarea>') + '<label class="cp-check"><input type="checkbox" id="cp-dispute">I want to dispute this assignment</label><div class="cp-actions cp-actions--end"><button type="submit" class="button button--primary">Send sample message</button></div></form>' + (review ? '<p class="caption">Your manager has this conversation. The program resumes only after an explicit review decision.</p>' : '') + '</section>';
  }

  function renderMessages(messages) {
    if (!messages.length) return '';
    return '<ol class="cp-messages" aria-label="Sample conversation">' + messages.map(item => '<li class="cp-message"><div class="cp-message-head"><strong>' + (item.author === 'driver' ? esc(driver()?.name || 'Driver') : item.author === 'system' ? 'Automation' : 'Fleet manager') + '</strong><time class="caption">' + esc(date(item.at)) + '</time></div><p>' + esc(item.text) + '</p></li>').join('') + '</ol>';
  }

  function renderQueue() {
    const pending = assignments().filter(item => ['queued', 'ready', 'delivered', 'paused'].includes(item.status));
    if (!pending.length) return '';
    return '<details class="card cp-disclosure" id="cp-course-queue"' + (pending.length > 1 ? ' open' : '') + '><summary>Driver course queue · ' + pending.length + '</summary><ul class="cp-list">' + pending.map(item => '<li><div class="cp-heading"><div><strong>' + esc(course(item)?.title || nameFor(item.programId)) + '</strong><span class="caption">' + esc(nameFor(item.programId)) + ' · ' + esc(labelFor(item)) + '</span></div>' + (item.programId !== selectedProgram ? button('open-queued-program', 'Open', false, 'data-cp-program="' + esc(item.programId) + '"') : '') + '</div><span class="caption">' + (item.status === 'queued' ? 'Deadline starts after delivery. Priority: ' + esc(item.severity) + ' severity, ' + esc(item.threshold - item.score) + '-point score shortfall.' : item.status === 'paused' ? 'Manager review pauses only this program.' : item.dueAt ? 'Due ' + esc(date(item.dueAt)) : 'No deadline before successful delivery.') + '</span></li>').join('') + '</ul><p class="caption cp-footer">One active course per driver across programs. Paused programs release the slot for other coaching.</p></details>';
  }

  function renderManager() {
    const review = currentCase(), a = currentAssignment(), item = policy(), j = journey();
    const cases = (simulation.cases || []).filter(record => record.driverId === selectedDriver && record.status === 'open');
    const caseLinks = cases.filter(record => record.programId !== selectedProgram).length ? '<div class="cp-notice"><strong>Other programs needing review</strong><div class="cp-actions">' + cases.filter(record => record.programId !== selectedProgram).map(record => button('open-queued-program', esc(nameFor(record.programId)), false, 'data-cp-program="' + esc(record.programId) + '"')).join('') + '</div></div>' : '';
    if (!review) return '<section class="card cp-card cp-empty">' + icon('checkCircle') + '<h3>No manager action needed for ' + esc(item.name) + '</h3><p>Coaching continues automatically. A driver message, overdue course, persistent behavior, or content gap brings the evidence and saved progress here.</p>' + caseLinks + (a && !['closed', 'waived'].includes(a.status) ? '<details class="cp-disclosure" id="cp-early-handoff"><summary>Request an earlier manager review</summary><form id="cp-handoff-form" class="cp-stack">' + field('Reason for early handoff', '<textarea id="cp-handoff-reason" class="search-control" required maxlength="1000"></textarea>') + '<button type="submit" class="button button--secondary">Request manager review</button></form></details>' : '') + '</section>' + renderQueue();
    const related = simulation.assignments.find(assignment => assignment.id === review.assignmentId) || a;
    const limit = j?.approvedMaxCycles || item.maxCycles;
    const needsRevision = (j?.cycles || 0) >= limit;
    return '<section class="card cp-card"><div class="cp-heading"><div><p class="caption">MANAGER REVIEW</p><h3 class="cp-title">' + esc(driver()?.name) + '</h3><p>' + esc(item.name) + ' · ' + esc(item.coachMode === 'group' ? item.groupCoaches?.[driver()?.group] || 'Group manager' : item.coach || 'Fleet manager') + '</p></div><div class="cp-badges">' + review.reasons.map(status).join('') + '</div></div><p>This program is paused. Its course progress and evidence are preserved while other programs can continue.</p>' +
      '<dl class="cp-facts"><div><dt>Sample score</dt><dd>' + esc(related?.score ?? 'Unavailable') + ' / 100</dd></div><div><dt>Course progress</dt><dd>' + esc(related?.correctQuestionIds?.length || 0) + ' / ' + esc(course(related)?.questions?.length || 3) + ' answers correct</dd></div><div><dt>Original session</dt><dd>' + esc(review.sessionId || related?.sessionId || 'Review case') + '</dd></div><div><dt>Created by</dt><dd>' + esc(related?.origin === 'automated' ? 'Automation' : related?.origin || 'Automation') + '</dd></div></dl>' +
      (related?.recommendation ? '<p class="cp-notice">' + esc(related.recommendation) + '</p>' : '') + renderMessages(review.messages || []) +
      '<form id="cp-manager-reply-form" class="cp-stack">' + field('Reply to driver', '<textarea class="search-control" id="cp-manager-reply" required maxlength="3000">' + esc(draftReplies[review.id] || '') + '</textarea>') + '<div class="cp-actions cp-actions--end"><button class="button button--secondary" type="submit">Send sample reply</button></div><p class="caption">Sending a reply keeps review open. Choose a decision below to resume or close the assignment.</p></form></section>' +
      '<section class="card cp-card"><h3>Resolve this review</h3><form id="cp-review-decision-form" class="cp-stack">' + field('Decision note', '<textarea class="search-control" id="cp-decision-note" required maxlength="2000" placeholder="Record the review outcome and next step…">' + esc(decisionNotes[review.id] || '') + '</textarea>') +
      '<div class="cp-fields">' + field('New deadline after resume (days)', numeric('cp-resume-days', related?.policySnapshot?.deadlineDays || item.deadlineDays, 1, 90)) + (needsRevision ? field('Revised maximum coaching cycles', numeric('cp-revised-cycles', Math.max(limit + 1, (j?.cycles || 0) + 1), limit + 1, 20)) : '') + '</div>' +
      (needsRevision ? '<p class="cp-notice">This driver has reached the approved course limit. Resuming requires a revised plan and your recorded reason.</p>' : '') +
      '<label class="cp-check"><input type="checkbox" id="cp-confirm-resume">I reviewed the remaining course and confirm the new deadline' + (needsRevision ? ' and revised coaching limit' : '') + '.</label>' +
      '<div class="cp-actions">' + button('resume', 'Resume automated coaching', true) + button('waive', 'Waive assignment', false) + button('close-case', 'Close assignment', false) + '</div>' +
      '<details class="cp-disclosure" id="cp-dispute-decision"><summary>Resolve a dispute</summary><div class="cp-stack"><p>Record whether the disputed evidence should be excluded from future coaching decisions. Recorded scores and historical evidence remain visible.</p><div class="cp-actions">' + button('uphold-dispute', 'Uphold dispute', false) + button('reject-dispute', 'Keep evidence', false) + '</div></div></details></form></section>' + caseLinks;
  }

  function renderActivity() {
    const ass = assignments();
    const managerAssignments = new Set((simulation.cases || []).filter(item => item.driverId === selectedDriver && item.status === 'open' && item.assignmentId).map(item => item.assignmentId));
    const belongs = item => {
      if (item.driverId) return item.driverId === selectedDriver;
      if (item.assignmentId) return ass.some(assignment => assignment.id === item.assignmentId);
      if (item.caseId) return simulation.cases.some(review => review.id === item.caseId && review.driverId === selectedDriver);
      return ['policy-updated', 'fleet-mode'].includes(item.type);
    };
    const decisions = (simulation.decisions || []).filter(belongs);
    const notes = (simulation.notifications || []).filter(belongs);
    const assessments = (simulation.assessments || []).filter(item => item.driverId === selectedDriver);
    const events = (simulation.events || []).filter(belongs);
    return '<section class="card cp-card"><h3>Sample session accounting</h3><dl class="cp-facts"><div><dt>Actual sample sessions</dt><dd data-cp-session-total>' + new Set(ass.map(item => item.sessionId)).size + '</dd></div><div><dt>Started by automation</dt><dd data-cp-automated-total>' + new Set(ass.filter(item => item.origin === 'automated').map(item => item.sessionId)).size + '</dd></div><div><dt>Currently with a manager</dt><dd>' + ass.filter(item => managerAssignments.has(item.id)).length + '</dd></div><div><dt>Coursework completed</dt><dd>' + ass.filter(item => item.completedAt).length + '</dd></div></dl><p class="caption">A handoff changes current handling. It does not add a session or change who created it. These sample totals never enter fleet reporting.</p></section>' +
      '<section class="card cp-card"><h3>Assessment history</h3>' + (assessments.length ? '<ol class="cp-timeline">' + assessments.slice().reverse().map(item => '<li><div class="cp-heading"><strong>' + esc(nameFor(item.programId)) + '</strong><span class="caption">' + esc(date(item.periodEnd || item.at || item.createdAt)) + '</span></div><p>' + (item.valid === false ? 'Missing assessment · pauses the fresh-start streak.' : 'Explicit sample score: ' + esc(item.score) + ' / 100') + '</p>' + (assessmentOutcomes[item.outcome] ? '<p class="caption">' + esc(assessmentOutcomes[item.outcome]) + '</p>' : '') + '</li>').join('') + '</ol>' : '<p>No sample assessments yet.</p>') + '</section>' +
      '<details class="card cp-disclosure" id="cp-delivery-history"><summary>Deliveries and reminders · ' + notes.length + '</summary>' + renderGenericTimeline(notes) + '</details>' +
      '<details class="card cp-disclosure" id="cp-decision-history"><summary>Review decisions · ' + decisions.length + '</summary>' + renderGenericTimeline(decisions) + '</details>' +
      '<details class="card cp-disclosure" id="cp-event-history"><summary>Workflow history · ' + events.length + '</summary>' + renderGenericTimeline(events) + '</details>' +
      ((simulation.exclusions || []).filter(belongs).length ? '<details class="card cp-disclosure" id="cp-excluded-evidence"><summary>Evidence excluded from future coaching</summary>' + renderGenericTimeline(simulation.exclusions.filter(belongs)) + '<p class="caption">Historical evidence and recorded scores are preserved.</p></details>' : '');
  }

  function renderGenericTimeline(items) {
    if (!items.length) return '<p class="caption">Nothing recorded yet.</p>';
    const labels = { assigned: 'Course selected', ready: 'Ready to deliver', delivered: 'Course delivered', 'course-delivered': 'Course delivered', reminder: 'Course reminder', 'delivery-failed': 'Delivery failed · retry pending', completed: 'Coursework completed', review: 'Manager review opened', 'driver-message': 'Driver message received', 'manager-reply': 'Manager replied', resume: 'Automated coaching resumed', close: 'Assignment closed', waive: 'Assignment waived', dispute: 'Dispute reviewed', reset: 'Fresh start earned', 'policy-updated': 'Sample policy updated', 'fleet-mode': 'Fleet automation changed' };
    return '<ol class="cp-timeline">' + items.slice().reverse().map(item => {
      const a = simulation.assignments.find(assignment => assignment.id === item.assignmentId);
      return '<li><div class="cp-heading"><strong>' + esc(item.label || labels[item.type] || item.type || item.action || item.reason || 'Recorded update') + '</strong><time class="caption">' + esc(date(item.at || item.createdAt || item.sentAt)) + '</time></div>' + (item.detail || item.text || item.reason || item.message ? '<p>' + esc(item.detail || item.text || item.reason || item.message) + '</p>' : '') + (item.programId || a ? '<span class="caption">' + esc(nameFor(item.programId || a.programId)) + (item.day ? ' · Day ' + esc(item.day) + ' after delivery' : '') + '</span>' : '') + '</li>';
    }).join('') + '</ol>';
  }

  function assess(next, valid) {
    const item = policy();
    const scoreNode = dialog.querySelector('#cp-score');
    if (valid && scoreNode && !scoreNode.reportValidity()) return;
    if (next) window.Coaching.dispatch(simulation, { type: 'advance', days: Math.max(1, window.Coaching.assessmentIntervalDays(item)) });
    const assessment = { type: 'assess', driverId: selectedDriver, programId: selectedProgram, score: valid ? Number(scoreInput) : null, valid, complete: true,
      ruleIds: item.rules.filter(rule => rule.enabled !== false).map(rule => rule.ruleId), evidenceIds: ['sample-' + selectedDriver + '-' + selectedProgram + '-' + (simulation.assessments.length + 1)] };
    if (item.assessment?.basis !== 'calendar') assessment.exposure = item.assessment?.amount;
    window.Coaching.dispatch(simulation, assessment);
    const latest = simulation.assessments.slice(-1)[0];
    message = simulation.lastError || assessmentOutcomes[latest?.outcome] || 'Full sample assessment recorded. Review the driver journey for the result.';
    render();
  }

  function handleInput(event) {
    const a = currentAssignment(), review = currentCase();
    if (event.target.id === 'cp-score') scoreInput = event.target.value;
    if (event.target.id === 'cp-days') daysInput = event.target.value;
    if (event.target.id === 'cp-driver-message' && a) draftMessages[a.id] = event.target.value;
    if (event.target.id === 'cp-manager-reply' && review) draftReplies[review.id] = event.target.value;
    if (event.target.id === 'cp-decision-note' && review) decisionNotes[review.id] = event.target.value;
  }

  function handleChange(event) {
    if (event.target.name === 'cp-view') { view = event.target.value; render(); }
    if (event.target.id === 'cp-program') { selectedProgram = event.target.value; message = ''; render(); }
    if (event.target.id === 'cp-driver') { selectedDriver = event.target.value; message = ''; render(); }
  }

  function handleSubmit(event) {
    const form = event.target, a = currentAssignment(), review = currentCase();
    if (!form.id.startsWith('cp-')) return;
    event.preventDefault();
    if (!form.reportValidity()) return;
    if (form.id === 'cp-assessment-form') assess(false, true);
    if (form.id === 'cp-advance-form') dispatch({ type: 'advance', days: Number(daysInput) }, 'Sample clock advanced. Delivery reminders and overdue reviews have been evaluated.');
    if (form.id === 'cp-quiz-form' && a) {
      const answers = {};
      for (const [name, value] of new FormData(form)) answers[name.slice(5)] = Number(value);
      dispatch({ type: 'quiz', assignmentId: a.id, answers }, 'Answers checked. Correct answers are saved; missed answers include an explanation.');
    }
    if (form.id === 'cp-driver-message-form' && a) {
      const text = dialog.querySelector('#cp-driver-message').value.trim();
      if (!text) return;
      delete draftMessages[a.id];
      dispatch({ type: 'driverMessage', assignmentId: a.id, text, dispute: dialog.querySelector('#cp-dispute').checked }, 'Sample message sent. Manager review is open and this program is paused.');
    }
    if (form.id === 'cp-manager-reply-form' && review) {
      const text = dialog.querySelector('#cp-manager-reply').value.trim();
      if (!text) return;
      delete draftReplies[review.id];
      dispatch({ type: 'managerReply', caseId: review.id, text }, 'Sample reply sent. Review remains open until you record a decision.');
    }
    if (form.id === 'cp-handoff-form' && a) dispatch({ type: 'handoff', assignmentId: a.id, reason: dialog.querySelector('#cp-handoff-reason').value.trim() }, 'Early handoff recorded with its reason.');
  }

  function handleClick(event) {
    const control = event.target.closest('[data-cp-action]');
    if (!control || !dialog.contains(control)) return;
    const action = control.dataset.cpAction, a = currentAssignment(), review = currentCase();
    if (action === 'close-preview') { dialog.close(); return; }
    if (action === 'reset') { reset(); render(); return; }
    if (action === 'assess-default') { assess(false, true); return; }
    if (action === 'next-assessment') { assess(true, true); return; }
    if (action === 'missing-assessment') { assess(true, false); return; }
    if (action === 'view-manager') { view = 'manager'; render(); return; }
    if (action === 'open-queued-program') { selectedProgram = control.dataset.cpProgram; render(); return; }
    if (action === 'load-sample') { loadRecommendedSample(); return; }
    if (action === 'deliver' && a) dispatch({ type: 'deliver', assignmentId: a.id, success: true }, 'Sample course delivered. Its deadline begins now.');
    if (action === 'fail-delivery' && a) dispatch({ type: 'deliver', assignmentId: a.id, success: false }, 'Sample delivery failed. No deadline or overdue status applies before successful delivery.');
    if (action === 'video-finished' && a) dispatch({ type: 'video', assignmentId: a.id, complete: true }, 'Sample video finished. Complete the short quiz next.');
    if (['resume', 'waive', 'close-case', 'uphold-dispute', 'reject-dispute'].includes(action) && review) {
      const note = dialog.querySelector('#cp-decision-note');
      if (!note.reportValidity() || !note.value.trim()) return;
      const reason = note.value.trim();
      if (action === 'resume') {
        const deadline = dialog.querySelector('#cp-resume-days');
        const revised = dialog.querySelector('#cp-revised-cycles');
        const confirm = dialog.querySelector('#cp-confirm-resume');
        if (!deadline.reportValidity() || (revised && !revised.reportValidity())) return;
        if (!confirm.checked) { message = 'Confirm the remaining course and new deadline before resuming.'; simulation.lastError = message; render(); dialog.querySelector('#cp-confirm-resume')?.focus(); return; }
        dispatch({ type: 'resume', caseId: review.id, deadlineDays: Number(deadline.value), confirm: true, ...(revised ? { revisedMaxCycles: Number(revised.value) } : {}), reason }, 'Review resolved. Saved course progress is preserved and automation has resumed.');
      } else if (action === 'waive' || action === 'close-case') dispatch({ type: action === 'waive' ? 'waive' : 'close', caseId: review.id, reason }, 'Review resolved. The assignment and recorded history are preserved.');
      else dispatch({ type: 'resolveDispute', caseId: review.id, upheld: action === 'uphold-dispute', reason }, action === 'uphold-dispute' ? 'Dispute upheld. The exclusion is recorded for future coaching; historical scores and evidence are preserved.' : 'Evidence retained. Record a resume or close decision to finish this review.');
    }
  }

  function loadRecommendedSample() {
    const current = policy();
    const suggested = window.Coaching.createPolicy(current.behaviorId, { id: current.id, name: current.name, status: 'active', coach: current.coach || 'Morgan Chen' });
    dispatch({ type: 'updatePolicy', policy: suggested }, 'Recommended content and rules loaded into this sample only. Assess the driver to start coaching.');
    previewDefaults.add(current.id);
  }

  document.addEventListener('click', event => {
    const trigger = event.target.closest('[data-open-coaching-preview]');
    if (trigger) { event.preventDefault(); open(trigger.dataset.openCoachingPreview); }
  });
  window.CoachingPreview = { open, init, getState: () => simulation ? clone(simulation) : null };
})();
