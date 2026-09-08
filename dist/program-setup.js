/* Guided program setup. Policies are versioned independently of historical sessions. */
(function () {
  'use strict';
  const STORAGE_KEY = 'elevate-program-policies-v1';
  let state = { schemaVersion: 1, policies: [], legacyCourses: [], editDrafts: {}, wizard: null };
  let initialized = false;
  let wizardOpen = false;
  let errors = [];
  let storageAvailable = true;
  const copy = value => JSON.parse(JSON.stringify(value));
  const h = value => escapeHtml(String(value == null ? '' : value));
  const catalog = () => globalThis.Coaching.catalog;
  const groups = () => Object.keys(groupComparisonData);
  const managers = () => coachDirectory.slice();
  const stepNames = ['Name and focus', 'Connected rules', 'Coaching plan', 'Review and activate'];

  function persist() {
    storageAvailable = saveSetting(STORAGE_KEY, JSON.stringify(state));
    return storageAvailable;
  }
  function syncName(policy) {
    const record = categories.find(item => item.id === policy.id);
    if (record && policy.name.trim()) record.name = policy.name.trim();
  }
  function init() {
    if (initialized) return;
    initialized = true;
    const saved = readSavedJson(STORAGE_KEY, null);
    if (saved && saved.schemaVersion === 1 && Array.isArray(saved.policies)) {
      state = { ...state, ...saved, editDrafts: saved.editDrafts || {}, legacyCourses: saved.legacyCourses || [] };
    }
    const knownIds = new Set(categories.map(item => item.id));
    state.policies = state.policies.filter(item => knownIds.has(item.id));
    categories.forEach(program => {
      if (state.policies.some(item => item.id === program.id)) return;
      const behavior = catalog().behaviors.find(item => item.id === program.id) || catalog().behaviors.find(item => item.name.toLowerCase() === program.name.toLowerCase());
      const cfg = programSettingFor(program.id);
      const mapped = lessons.filter(lesson => lesson.category === program.name).map((lesson, index) => {
        const id = 'legacy-' + program.id + '-' + (index + 1);
        if (!state.legacyCourses.some(item => item.id === id)) state.legacyCourses.push({ ...copy(lesson), id, programId: program.id, behaviorId: behavior?.id || '', videoUrl: null, questions: [], legacy: true });
        return id;
      });
      const importedRules = eventTypeRules.filter(rule => rule.programId === program.id).map(rule => ({
        ruleId: rule.id, enabled: rule.enabled !== false, severity: rule.severity, allowance: Number(rule.threshold) || 0,
        name: rule.name, condition: rule.name + ' · Connected feed; detailed detection settings are unavailable in this prototype.'
      }));
      const policy = Coaching.createPolicy(behavior?.id || 'speeding', {
        id: program.id, name: program.name, behaviorId: behavior?.id || '', status: 'draft',
        rules: importedRules, courseIds: producedCourses(behavior?.id || '').map(course => course.id), legacyCourseIds: mapped, imported: true,
        scoreThreshold: cfg.threshold, coachMode: cfg.coachMode, coach: cfg.coach,
        groupCoaches: Object.fromEntries(groups().map(group => [group, cfg.coachMode === 'group' ? (cfg.groupCoaches?.[group] ?? '') : (cfg.groupCoaches?.[group] ?? cfg.coach)]))
      });
      state.policies.push(policy);
    });
    state.policies.forEach(syncName);
    persist();
  }
  function getPolicies() { init(); return copy(state.policies); }
  function getPolicy(id, options = {}) { init(); const policy = id === '__new' ? state.wizard?.policy : options.draft && state.editDrafts[id] ? state.editDrafts[id] : state.policies.find(item => item.id === id); return policy ? copy(policy) : null; }
  function getPreviewPolicy(id) { return getPolicy(id, { draft: true }); }
  function syncLegacyPolicy(policy) {
    const previous = eventTypeRules.filter(rule => rule.programId === policy.id);
    const adapted = policy.rules.map(rule => {
      const source = ruleFor(rule);
      const existing = previous.find(item => item.id === rule.ruleId || item.sourceRuleId === rule.ruleId);
      return { ...existing, id: existing?.id || policy.id + '::' + rule.ruleId, sourceRuleId: rule.ruleId,
        programId: policy.id, name: source.name, condition: source.condition,
        severity: rule.severity, threshold: rule.allowance, enabled: rule.enabled,
        videoRequired: existing?.videoRequired || false, path: 'lesson' };
    });
    eventTypeRules = eventTypeRules.filter(rule => rule.programId !== policy.id).concat(adapted);
    Object.assign(programSettingFor(policy.id), { threshold: policy.scoreThreshold, coachMode: policy.coachMode, coach: policy.coach, groupCoaches: copy(policy.groupCoaches) });
    saveProgramRules();
    saveProgramSettings();
  }
  function savePolicy(policy) {
    init();
    const next = copy(policy);
    const index = state.policies.findIndex(item => item.id === next.id);
    if (index < 0) state.policies.push(next); else state.policies[index] = next;
    syncName(next);
    syncLegacyPolicy(next);
    persist();
    return copy(next);
  }
  function removePolicy(id) {
    state.policies = state.policies.filter(item => item.id !== id);
    delete state.editDrafts[id];
    persist();
  }
  function getCourses() { return [...catalog().courses, ...state.legacyCourses]; }
  const byLevel = (a, b) => (a.level || 0) - (b.level || 0);
  // Produced catalog courses (delivered video) for a behavior, lowest level first.
  function producedCourses(behaviorId) { return catalog().courses.filter(course => course.behaviorId === behaviorId && course.videoUrl && !course.customSeriesId).sort(byLevel); }
  // The course a driver in this program is assigned: the approved pool's lowest playable level,
  // otherwise the produced course for the program's behavior. Null when nothing playable exists.
  function courseForProgram(programId) {
    init();
    const policy = state.policies.find(item => item.id === programId);
    if (!policy) return null;
    const pool = policy.courseIds.map(courseFor).filter(course => course && course.videoUrl).sort(byLevel);
    const course = pool[0] || producedCourses(policy.behaviorId)[0] || null;
    return course ? copy(course) : null;
  }
  function courseFor(id) { return getCourses().find(item => item.id === id); }
  function ruleFor(rule) { return catalog().rules.find(item => item.id === rule.ruleId) || rule; }
  function behaviorName(policy) { return catalog().behaviors.find(item => item.id === policy.behaviorId)?.name || 'Choose a behavior'; }
  function assessmentLabel(policy) {
    const a = policy.assessment;
    if (a.basis === 'distance') return 'every ' + (a.amount == null ? '—' : Number(a.amount).toLocaleString()) + ' ' + (a.unit || 'km') + ' driven';
    if (a.basis === 'hours') return 'every ' + a.amount + ' driving hours';
    return 'every ' + a.amount + ' ' + (a.unit || 'weeks');
  }
  function draftFor(id) {
    const policy = state.policies.find(item => item.id === id);
    if (!policy) return null;
    return state.editDrafts[id] || policy;
  }
  function editable() {
    if (wizardOpen) return state.wizard?.policy;
    return draftFor(document.querySelector('[data-ps-policy]')?.dataset.psPolicy);
  }
  function announce(text) {
    const live = document.getElementById('ps-save-status');
    if (live) live.textContent = text;
  }
  function remember(policy) {
    if (wizardOpen) state.wizard.policy = policy;
    else {
      const original = state.policies.find(item => item.id === policy.id);
      if (original?.status === 'active') state.editDrafts[policy.id] = policy;
      else savePolicy(policy);
    }
    persist();
    announce(!storageAvailable ? 'Storage unavailable. Keep this page open to retain your changes.' : policy.status === 'active' ? 'Unsaved changes · active policy unchanged' : 'Draft saved locally');
    const save = document.querySelector('[data-ps-action="save-active"]');
    if (save) save.disabled = !state.editDrafts[policy.id];
    const discard = document.querySelector('[data-ps-action="discard"]');
    if (discard) discard.hidden = !state.editDrafts[policy.id];
    const summary = document.getElementById('ps-review-title')?.closest('.ps-section');
    if (summary) summary.outerHTML = reviewFields(policy);
    const cadence = document.getElementById('ps-assessment-copy');
    if (cadence) cadence.textContent = 'Assess ' + assessmentLabel(policy) + '. After a completed course, observe a complete assessment period before assigning follow-up coaching.';
  }
  function redraw(focusId) {
    renderProgramsPage();
    if (typeof applyDesignLibrary === 'function') applyDesignLibrary(document.getElementById('view-programs'));
    requestAnimationFrame(() => {
      const target = document.getElementById(focusId || 'ps-section-title');
      target?.focus({ preventScroll: false });
    });
  }
  function start() {
    init();
    if (!state.wizard) state.wizard = { step: 0, policy: Coaching.createPolicy('speeding', { id: '__new', name: '', coach: managers()[0], groupCoaches: Object.fromEntries(groups().map(group => [group, managers()[0]])) }) };
    wizardOpen = true;
    errors = [];
    persist();
    openProgramPage('all', 'configuration');
    requestAnimationFrame(() => document.getElementById('ps-name')?.focus());
  }
  function button(label, action, primary, attrs = '') {
    return '<button class="button button--' + (primary ? 'primary' : 'secondary') + '" type="button" data-ps-action="' + action + '" ' + attrs + '>' + h(label) + '</button>';
  }
  function input(name, label, value, options = '') {
    return '<label class="field"><span class="field-label">' + h(label) + '</span><input class="filter-control" id="ps-' + name + '" data-ps-field="' + name + '" value="' + h(value) + '" ' + options + '></label>';
  }
  function select(name, label, value, options, attrs = '') {
    return '<label class="field"><span class="field-label">' + h(label) + '</span><select class="filter-control" id="ps-' + name + '" data-ps-field="' + name + '" ' + attrs + '>' + options.map(([key, text]) => '<option value="' + h(key) + '"' + (key === value ? ' selected' : '') + '>' + h(text) + '</option>').join('') + '</select></label>';
  }
  function section(title, description, content, id) {
    return '<section class="ps-section" aria-labelledby="ps-' + id + '-title"><div class="ps-section-intro"><h3 class="section-title" id="ps-' + id + '-title">' + h(title) + '</h3>' + (description ? '<p>' + h(description) + '</p>' : '') + '</div><div class="ps-section-body">' + content + '</div></section>';
  }
  function errorMarkup() {
    return errors.length ? '<div class="card ps-errors" role="alert" tabindex="-1" id="ps-errors"><strong>Check these details before continuing</strong><ul>' + errors.map(error => '<li>' + h(error) + '</li>').join('') + '</ul></div>' : '';
  }
  function identityFields(policy) {
    const immutableBehavior = policy.status === 'active';
    return section('Name and focus', 'One behavior per program keeps rules, coaching and progress easy to understand.',
      '<div class="ps-fields">' + input('name', 'Program title', policy.name, 'type="text" required maxlength="80" autocomplete="off" placeholder="e.g. Safer speeds"') +
      select('behaviorId', 'Behavior to improve', policy.behaviorId, [['', 'Select a behavior'], ...catalog().behaviors.map(item => [item.id, item.name])], immutableBehavior ? 'disabled' : '') + '</div>' +
      (immutableBehavior ? '<p class="caption">The behavior stays fixed after activation. Create a separate program for a different behavior.</p>' : '') +
      select('audienceMode', 'Drivers covered', policy.audience.mode, [['all', 'All drivers, including new arrivals'], ['groups', 'Selected groups']]) +
      (policy.audience.mode === 'groups' ? '<fieldset class="ps-checks"><legend class="field-label">Included groups</legend>' + groups().map(group => '<label><input type="checkbox" data-ps-group="' + h(group) + '"' + (policy.audience.groups.includes(group) ? ' checked' : '') + '> <span>' + h(group) + '</span></label>').join('') + '</fieldset>' : '<p class="caption">New drivers automatically join this program. One driver can participate in several programs.</p>'), 'identity');
  }
  function rulesForPolicy(policy) {
    const allRules = [...policy.rules];
    catalog().rules.filter(rule => rule.behaviorId === policy.behaviorId && !allRules.some(item => item.ruleId === rule.id || String(ruleFor(item).name).trim().toLowerCase() === rule.name.trim().toLowerCase())).forEach(rule => allRules.push({ ruleId: rule.id, enabled: false, severity: rule.severity, allowance: rule.allowance }));
    return allRules;
  }
  function addRuleFields(policy) {
    return '<div class="toolbar">' + button('Add rule', 'add-rule', false, 'id="ps-add-rule-button" aria-expanded="false" aria-controls="ps-add-rule-form"' + (!policy.behaviorId ? ' disabled' : '')) + '</div>' +
      '<form class="card ps-rule-form" id="ps-add-rule-form" aria-labelledby="ps-add-rule-title" hidden><h4 class="section-title" id="ps-add-rule-title">Add a rule</h4>' +
      '<p class="caption">Add a detection condition for ' + h(behaviorName(policy).toLowerCase()) + '. This rule is saved with the program; connected event detection is unchanged.</p>' +
      '<label class="field"><span class="field-label">Rule name</span><input class="filter-control" id="ps-rule-name" name="name" type="text" required maxlength="120" autocomplete="off" placeholder="e.g. Speeding above the posted limit"></label>' +
      '<label class="field"><span class="field-label">Detection condition</span><textarea class="filter-control" id="ps-rule-condition" name="condition" required maxlength="500" rows="3" placeholder="Describe what counts as an event, including any limits and duration."></textarea></label>' +
      '<div class="ps-fields"><label class="field"><span class="field-label">Severity</span><select class="filter-control" id="ps-rule-severity" name="severity"><option>High</option><option selected>Medium</option><option>Low</option></select></label>' +
      '<label class="field"><span class="field-label">Tolerated events per assessment</span><input class="filter-control" id="ps-rule-allowance" name="allowance" type="number" min="0" max="1000" step="1" required value="0"></label></div>' +
      '<div class="toolbar">' + button('Cancel', 'cancel-rule', false) + '<button class="button button--primary" type="submit">Add rule</button></div></form>';
  }
  function ruleFields(policy) {
    const rows = rulesForPolicy(policy).map(rule => {
      const source = ruleFor(rule);
      return '<tr><td><label class="check-target"><input type="checkbox" data-ps-rule="' + h(rule.ruleId) + '" data-ps-rule-field="enabled"' + (rule.enabled ? ' checked' : '') + ' aria-label="Include ' + h(source.name) + '"></label></td><th scope="row">' + h(source.name) + '<p class="caption">' + h(source.condition) + '</p></th><td><select class="filter-control" data-ps-rule="' + h(rule.ruleId) + '" data-ps-rule-field="severity" aria-label="Severity for ' + h(source.name) + '">' + ['High', 'Medium', 'Low'].map(value => '<option' + (rule.severity === value ? ' selected' : '') + '>' + value + '</option>').join('') + '</select></td><td class="num"><input class="filter-control ps-number num" type="number" min="0" max="1000" step="1" value="' + h(rule.allowance) + '" data-ps-rule="' + h(rule.ruleId) + '" data-ps-rule-field="allowance" aria-label="Tolerated events per assessment for ' + h(source.name) + '"></td></tr>';
    }).join('');
    return section('Connected rules', 'Detection conditions describe the source event. Severity and tolerated counts determine which events contribute to coaching.',
      addRuleFields(policy) +
      (rows ? uiTable(policy.name + ' connected rules', ['Include', 'Rule and detection condition', 'Severity', { label: 'Tolerated events', numeric: true }], rows) : '<div class="card empty-state compact"><strong>Select a behavior to see connected rules</strong></div>') +
      '<p class="caption">Tolerated counts apply within each assessment. Detection settings remain in the connected event feed; no scoring formula is calculated in this prototype.</p>' +
      '<div class="ps-fields">' + input('scoreThreshold', 'Start coaching when the program score is below', policy.scoreThreshold, 'type="number" min="1" max="100" step="1" required') + '<p class="ps-field-note">Out of 100. The recommended 75 is an editable sample setting. An assessed score starts coaching; a single event does not automatically assign another course.</p></div>', 'rules');
  }
  function coursePool(policy) {
    const available = catalog().courses.filter(course => course.behaviorId === policy.behaviorId);
    const seriesIds = [...new Set(available.map(course => course.seriesId).filter(Boolean))];
    const selectedSeries = policy.courseIds.map(courseFor).find(course => course?.seriesId);
    const seriesChoices = seriesIds.length ? '<div class="ps-series-list">' + seriesIds.map(id => {
      const levels = available.filter(course => course.seriesId === id).sort((a, b) => a.level - b.level);
      return '<div class="card ps-section-heading"><div><strong>' + h(levels[0].seriesTitle) + '</strong><p class="caption">' + levels.map(course => 'Level ' + course.level + ': ' + h(course.title)).join(' → ') + '</p></div><button class="button button--secondary" type="button" data-ps-course-series="' + h(id) + '">Use this series</button></div>';
    }).join('') + '</div><p class="caption">Using a series replaces this program’s course selections with its ordered levels. Further levels wait for completion and a full follow-up assessment. Manager escalation follows the program’s cycle limit.</p>' + (selectedSeries ? '<p class="caption">Current series: ' + h(selectedSeries.seriesTitle) + '. If several series are approved below, the first approved series takes priority.</p>' : '') : '';
    return '<div class="ps-section-heading"><div><h4 class="section-title">Approved course pool</h4><p class="caption">Choose an ordered series or approve individual courses for automatic coaching.</p></div>' + button('Use recommended courses', 'recommend-courses', false) + '</div>' + seriesChoices +
      (available.length ? '<div class="ps-course-pool">' + available.map(course => '<label class="ps-course-option"><input type="checkbox" data-ps-course="' + h(course.id) + '"' + (policy.courseIds.includes(course.id) ? ' checked' : '') + '><span><strong>' + h(course.title) + '</strong><span class="caption">' + h(course.durationMinutes) + ' min video · ' + course.questions.length + ' questions · ' + h(typeof course.level === 'number' ? ['Introduction', 'Practice', 'Reflection'][course.level - 1] || 'Follow-up' : course.level) + ' · v' + h(course.version) + '</span><span>' + h(course.tip) + '</span></span></label>').join('') + '</div>' : '<p>Select a behavior to see course recommendations.</p>') +
      '<p class="caption">Each course pairs one video with a short quiz. Linked videos use the supplied source; planned videos remain clearly labelled previews.</p>' + legacyMarkup(policy);
  }
  function legacyMarkup(policy) {
    const legacy = (policy.legacyCourseIds || []).map(courseFor).filter(Boolean);
    if (!legacy.length) return '';
    return '<details><summary>Imported content · ' + legacy.length + ' incomplete</summary><div class="ps-details-body"><p>These existing mappings are preserved as metadata. Add video and quiz content before making them assignable.</p>' + uiTable('Imported course metadata', ['Course', 'Format', 'Version', 'Availability'], legacy.map(course => '<tr><th scope="row">' + h(course.title) + '</th><td>' + h(course.length) + '</td><td>' + h(course.version) + '</td><td>Incomplete · video and quiz unavailable</td></tr>').join('')) + '</div></details>';
  }
  function coachingFields(policy) {
    const a = policy.assessment;
    const includedGroups = policy.audience.mode === 'groups' ? policy.audience.groups : groups();
    const routing = select('coachMode', 'Escalation routing', policy.coachMode, [['program', 'One manager for this program'], ['group', 'A manager for each group']]) +
      (policy.coachMode === 'program' ? select('coach', 'Fleet manager', policy.coach, [['', 'Select a manager'], ...managers().map(name => [name, name])]) : includedGroups.length ? '<div class="ps-fields">' + includedGroups.map((group, index) => '<label class="field"><span class="field-label">Manager for ' + h(group) + '</span><select class="filter-control" data-ps-group-coach="' + h(group) + '"><option value="">Select a manager</option>' + managers().map(name => '<option value="' + h(name) + '"' + (policy.groupCoaches[group] === name ? ' selected' : '') + '>' + h(name) + '</option>').join('') + '</select></label>').join('') + '</div>' : '<p class="field-error">Select the groups covered by this program first.</p>');
    return section('Coaching plan', 'Recommendations use the selected behavior. Drivers receive a relevant tip, a short video and a short quiz.',
      coursePool(policy) +
      '<div class="ps-policy-summary"><h4 class="section-title">Assessment and follow-up</h4><p id="ps-assessment-copy">Assess ' + h(assessmentLabel(policy)) + '. After a completed course, observe a complete assessment period before assigning follow-up coaching.</p></div>' +
      '<details id="ps-advanced"><summary>Assessment and course settings</summary><div class="ps-details-body"><div class="ps-fields">' +
      select('assessmentBasis', 'Assess by', a.basis, [['calendar', 'Calendar interval'], ['distance', 'Distance driven'], ['hours', 'Driving hours']]) +
      input('assessmentAmount', a.basis === 'distance' ? 'Distance between assessments' : a.basis === 'hours' ? 'Driving hours between assessments' : 'Interval', a.amount, 'type="number" min="1" max="100000" step="1" required') +
      (a.basis === 'hours' ? '' : select('assessmentUnit', 'Unit', a.unit, a.basis === 'distance' ? [['km', 'Kilometres'], ['miles', 'Miles']] : [['days', 'Days'], ['weeks', 'Weeks']])) +
      '</div><p class="caption">This program’s assessment schedule is independent of the reporting period and fleet schedule.</p><div class="ps-fields">' +
      input('deadlineDays', 'Course deadline after delivery (days)', policy.deadlineDays, 'type="number" min="1" max="365" step="1" required') +
      input('reminderDays', 'Remind on days after delivery', policy.reminderDays.join(', '), 'type="text" placeholder="3, 6" aria-describedby="ps-reminder-help"') +
      input('maxCycles', 'Maximum course and follow-up cycles', policy.maxCycles, 'type="number" min="1" max="10" step="1" required') +
      input('resetPeriods', 'Passing assessments before a fresh start', policy.resetPeriods, 'type="number" min="1" max="10" step="1" required') +
      '</div><p class="caption" id="ps-reminder-help">Enter reminder days separated by commas, before the deadline. Queued courses and failed deliveries have no running deadline.</p></div></details>' +
      '<div class="ps-policy-summary"><h4 class="section-title">Completion and workload</h4><p>Finish the video and answer all three quiz questions correctly. Incorrect answers include an explanation and can be retried. One active course per driver across programs; the next course waits without a deadline.</p></div>' +
      '<div class="ps-fields">' + routing + '</div><p class="caption">Driver replies, disputes, overdue coursework and persistent behavior go to the manager. Reviews pause this program until the manager explicitly resolves them.</p>', 'coaching');
  }
  function reviewFields(policy) {
    const coach = policy.coachMode === 'group' ? 'the manager assigned to their group' : policy.coach || 'the assigned manager';
    const activeRules = policy.rules.filter(rule => rule.enabled);
    const names = policy.courseIds.map(courseFor).filter(Boolean).map(course => course.title);
    return section('What happens', '', '<p class="ps-summary-copy">' + h(policy.name || 'This program') + ' covers ' + (policy.audience.mode === 'all' ? 'all drivers, including new arrivals' : h(policy.audience.groups.join(', ') || 'the selected groups')) + '. It assesses ' + h(behaviorName(policy).toLowerCase()) + ' ' + h(assessmentLabel(policy)) + ' using ' + activeRules.length + ' connected ' + (activeRules.length === 1 ? 'rule' : 'rules') + '. A valid score below ' + h(policy.scoreThreshold) + ' starts automated coaching.</p>' +
      '<dl class="ps-review-facts"><div><dt>Approved content</dt><dd>' + h(names.join(' · ') || 'No courses selected') + '</dd></div><div><dt>Due and reminders</dt><dd>' + h(policy.deadlineDays) + ' days after delivery; reminders ' + (policy.reminderDays.length ? 'on days ' + h(policy.reminderDays.join(' and ')) : 'off') + '</dd></div><div><dt>Manager handoff</dt><dd>Any driver message, an overdue course, or ' + h(policy.maxCycles) + ' unsuccessful cycles → ' + h(coach) + '</dd></div><div><dt>Fresh start</dt><dd>' + h(policy.resetPeriods) + ' consecutive passing assessments reset future progression. History stays visible.</dd></div></dl>' +
      '<h4 class="section-title">Example driver journey</h4><ol class="ps-journey"><li><strong>Understand the behavior.</strong> Sample score ' + h(Math.max(0, Number(policy.scoreThreshold) - 7)) + '/100 is below the ' + h(policy.scoreThreshold) + '-point threshold. Explain the contributing rules and send a personalized tip with an introductory course.</li><li><strong>Learn and check understanding.</strong> The driver finishes a short video, retries missed quiz questions and completes the course.</li><li><strong>Observe improvement.</strong> Wait for a full assessment period. A passing score needs no new course; an unsuccessful cycle can receive a different approved course.</li><li><strong>Bring in the manager when needed.</strong> Questions, overdue work or persistent behavior open one review case. The affected program pauses until an explicit resolution.</li></ol>' +
      '<p class="caption">This local prototype stores the policy in this browser. It does not score events, send messages to drivers or change connected fleet data.</p>', 'review');
  }
  function fleetNotice() {
    if (automationMode === 'fully') return '<p class="caption">Fleet mode: Fully automated. The program’s own assessment settings apply.</p>';
    return '<div class="card"><strong>Fleet automation is ' + (automationMode === 'manual' ? 'manual' : 'set to human review') + '</strong><p>You can configure and activate this program, but automatic delivery follows the fleet setting. Change the mode in Settings to run fully automated coaching.</p></div>';
  }
  function wizardMarkup() {
    const { policy, step } = state.wizard;
    const content = [identityFields, ruleFields, coachingFields, reviewFields][step](policy);
    return '<div class="stack ps-workspace" data-ps-policy="__new"><div class="program-section-heading"><div><h2 class="section-title" id="ps-section-title" tabindex="-1">Set up a program</h2><p class="caption">Step ' + (step + 1) + ' of 4</p></div>' + button('Close setup', 'close-wizard', false) + '</div><nav aria-label="Program setup progress"><ol class="ps-steps">' + stepNames.map((name, index) => '<li' + (step === index ? ' aria-current="step"' : '') + '><button class="button button--secondary" type="button" data-ps-step="' + index + '"' + (index > step ? ' disabled' : '') + '><span>' + (index + 1) + '.</span> ' + name + '</button></li>').join('') + '</ol></nav>' + errorMarkup() + content +
      (step === 3 ? fleetNotice() : '') + '<div class="ps-footer"><span class="caption" id="ps-save-status" role="status">' + (storageAvailable ? 'Draft progress saved locally' : 'Storage unavailable. Keep this page open.') + '</span><div class="toolbar">' + (step ? button('Back', 'back', false) : '') + button('Save draft', 'save-draft', false) + button(step === 3 ? 'Activate program' : 'Continue', step === 3 ? 'activate' : 'next', true) + '</div></div></div>';
  }
  function configurationIndex() {
    const rows = getPolicies().map(policy => '<tr><th scope="row"><button class="text-link" type="button" data-open-program-page="' + h(policy.id) + '" data-program-page-tab="configuration">' + h(policy.name) + '</button><p class="caption">' + h(behaviorName(policy)) + '</p></th><td>' + uiStatus(policy.status === 'active' ? 'Active' : 'Draft') + '</td><td class="num">' + h(policy.scoreThreshold) + '</td><td>' + h(assessmentLabel(policy)) + '</td><td class="num">' + policy.rules.filter(rule => rule.enabled).length + '</td><td class="num">' + policy.courseIds.length + '</td><td>' + h(policy.coachMode === 'group' ? 'By group' : policy.coach || 'Unassigned') + '</td><td><button class="text-link" type="button" data-ps-remove="' + h(policy.id) + '" aria-label="Delete ' + h(policy.name) + '">Delete</button></td></tr>').join('');
    return '<div class="stack ps-workspace"><div class="program-section-heading"><div><h2 class="section-title" id="ps-section-title" tabindex="-1">Automated programs</h2><p>Define the boundaries. Automation coaches drivers; managers handle exceptions.</p></div><button class="button button--primary" type="button" data-ps-start>New program</button></div>' +
      (state.wizard ? '<div class="card ps-section-heading"><div><strong>Continue setting up ' + h(state.wizard.policy.name || 'your program') + '</strong><p class="caption">Step ' + (state.wizard.step + 1) + ' of 4 · Draft saved locally</p></div><button class="button button--secondary" type="button" data-ps-start>Resume setup</button></div>' : '') +
      uiTable('Automated program configuration', ['Program', 'State', { label: 'Score threshold', numeric: true }, 'Assessment', { label: 'Rules', numeric: true }, { label: 'Courses', numeric: true }, 'Manager', 'Action'], rows) +
      '<p class="caption">Imported programs keep their existing rules and content mappings. Produced course videos for a program\'s behavior are approved from the start; review them before activating the new coaching workflow. Historical coaching records are unchanged.</p></div>';
  }
  function renderConfiguration(program) {
    init();
    if (program.id === 'all') return wizardOpen && state.wizard ? wizardMarkup() : configurationIndex();
    const policy = draftFor(program.id);
    if (!policy) return '<p>Program configuration is unavailable.</p>';
    const original = getPolicy(program.id);
    return '<div class="stack ps-workspace" data-ps-policy="' + h(policy.id) + '"><div class="program-section-heading"><div><h2 class="section-title" id="ps-section-title" tabindex="-1">Program configuration</h2><p class="caption">' + (original.status === 'active' ? 'Active policy v' + original.version + ' · Saved changes apply to future assignments.' : policy.imported ? 'Imported configuration · Review and activate when ready.' : 'Draft · Review and activate when ready.') + '</p></div>' + uiStatus(original.status === 'active' ? 'Active' : 'Draft') + '</div>' + errorMarkup() + identityFields(policy) + ruleFields(policy) + coachingFields(policy) + reviewFields(policy) + fleetNotice() +
      '<div class="ps-footer"><span class="caption" id="ps-save-status" role="status">' + (!storageAvailable ? 'Storage unavailable. Keep this page open.' : state.editDrafts[policy.id] ? 'Unsaved changes · active policy unchanged' : original.status === 'active' ? 'All changes saved · v' + original.version : 'Draft saved locally') + '</span><div class="toolbar">' +
      (original.status === 'active' ? button('Discard changes', 'discard', false, state.editDrafts[policy.id] ? '' : 'hidden') + button('Save changes', 'save-active', true, state.editDrafts[policy.id] ? '' : 'disabled') : button('Save draft', 'save-draft', false) + button('Activate program', 'activate', true)) + '</div></div></div>';
  }
  function contentRows(courses, programId) {
    return courses.map(course => {
      const usedBy = state.policies.filter(policy => [...policy.courseIds, ...(policy.legacyCourseIds || [])].includes(course.id));
      return '<tr><th scope="row"><button class="text-link" type="button" data-tl-open="' + h(course.id) + '" aria-haspopup="dialog">' + h(course.title) + '</button></th>' + (programId === 'all' ? '<td>' + usedBy.map(policy => '<button class="text-link" type="button" data-open-program-page="' + h(policy.id) + '" data-program-page-tab="content">' + h(policy.name) + '</button>').join(', ') + '</td>' : '') + '<td>' + h(course.legacy ? course.length : course.durationMinutes + ' min video · ' + course.questions.length + ' questions') + '</td><td>' + h(course.legacy ? course.version : 'v' + course.version) + '</td><td>' + (course.legacy ? 'Incomplete · no video or quiz' : course.videoUrl ? 'Video linked · quiz prepared' : 'Course preview · video unavailable') + '</td></tr>';
    }).join('');
  }
  function renderContent(program) {
    init();
    const policies = program.id === 'all' ? getPolicies() : [getPolicy(program.id)].filter(Boolean);
    const ids = [...new Set(policies.flatMap(policy => [...policy.courseIds, ...(policy.legacyCourseIds || [])]))];
    const courses = ids.map(courseFor).filter(Boolean);
    return '<section class="stack ps-workspace"><div class="program-section-heading"><div><h2 class="section-title">Approved coaching content</h2><p>The same course pool is used in Configuration and automated course selection.</p></div>' + (program.id !== 'all' ? '<button class="button button--secondary" type="button" data-open-program-page="' + h(program.id) + '" data-program-page-tab="configuration">Edit course pool</button>' : '') + '</div>' +
      (courses.length ? uiTable('Approved program course content', ['Course', ...(program.id === 'all' ? ['Programs'] : []), 'Format', 'Version', 'Availability'], contentRows(courses, program.id)) : '<div class="card empty-state compact"><strong>No courses approved yet</strong><span>Open Configuration to review the recommended video-and-quiz course pool.</span></div>') +
      '<p class="caption">Course completion requires the full video and correct quiz responses. Imported metadata stays visible as incomplete; open a course to preview its lesson, video script and quiz.</p>' +
      '</section>';
  }
  function renderLibrary(term = '') {
    init();
    const search = String(term).toLowerCase().trim();
    const courses = getCourses().filter(course => !search || (course.title + ' ' + (catalog().behaviors.find(item => item.id === course.behaviorId)?.name || course.category || '')).toLowerCase().includes(search));
    return '<div class="stack ps-workspace"><p>Prepared short courses pair a video with a three-question quiz. Course previews use sample content; imported lessons still need their video and quiz.</p>' +
      (courses.length ? uiTable('Coaching course library', ['Course', 'Programs', 'Format', 'Version', 'Availability'], contentRows(courses, 'all')) : '<div class="card empty-state compact"><strong>No matching courses</strong><span>Try another title or behavior.</span></div>') + '</div>';
  }
  function libraryMetrics() { return { courses: catalog().courses.length, legacyCourses: state.legacyCourses.length, programs: state.policies.length, mappedPrograms: state.policies.filter(policy => policy.courseIds.length).length }; }

  function validate(policy) {
    const found = Coaching.validatePolicy(policy).slice();
    if (policy.scoreThreshold == null || Number(policy.scoreThreshold) < 1) found.push('Set a coaching threshold from 1 to 100.');
    if (policy.coachMode === 'group') {
      const requiredGroups = policy.audience.mode === 'groups' ? policy.audience.groups : groups();
      if (requiredGroups.some(group => !policy.groupCoaches[group])) found.push('Choose a manager for every included group.');
    }
    return [...new Set(found)];
  }
  function saveFromForm(activate) {
    let policy = copy(editable());
    if (!policy) return;
    policy.name = policy.name.trim();
    errors = activate ? validate(policy) : !policy.name ? ['Enter a program title.'] : [];
    if (errors.length) { redraw('ps-errors'); return; }
    if (policy.id === '__new') {
      policy.id = createProgram(policy.name);
      state.wizard = null;
      wizardOpen = false;
    }
    const original = state.policies.find(item => item.id === policy.id);
    const wasActive = original?.status === 'active';
    if (activate) { policy.status = 'active'; policy.imported = false; }
    if (original?.status === 'active') policy.version = original.version + 1;
    delete state.editDrafts[policy.id];
    savePolicy(policy);
    errors = [];
    if (typeof programCatalogChanged === 'function') programCatalogChanged();
    openProgramPage(policy.id, 'configuration');
    showToast((wasActive ? 'Changes saved for future assignments' : activate ? 'Program activated' : 'Draft saved') + (storageAvailable ? '' : ' · storage unavailable'));
    requestAnimationFrame(() => document.getElementById('ps-section-title')?.focus());
  }
  function changeField(event) {
    const target = event.target;
    if (!target.closest('[data-ps-policy]')) return;
    const current = editable();
    if (!current) return;
    const policy = copy(current);
    let refresh = false;
    if (target.dataset.psField) {
      const key = target.dataset.psField;
      const value = target.type === 'number' ? (target.value === '' ? null : Number(target.value)) : target.value;
      if (key === 'behaviorId') {
        policy.behaviorId = value;
        policy.rules = catalog().rules.filter(rule => rule.behaviorId === value).map(rule => ({ ruleId: rule.id, enabled: true, severity: rule.severity, allowance: rule.allowance }));
        policy.courseIds = catalog().courses.filter(course => course.behaviorId === value && !course.seriesId).map(course => course.id);
        refresh = true;
      } else if (key === 'audienceMode') { policy.audience.mode = value; refresh = true; }
      else if (key === 'assessmentBasis') {
        policy.assessment = value === 'calendar' ? { basis: value, amount: 2, unit: 'weeks' } : value === 'distance' ? { basis: value, amount: 1000, unit: 'km' } : { basis: value, amount: 40, unit: 'hours' };
        refresh = true;
      } else if (key === 'assessmentAmount') policy.assessment.amount = value;
      else if (key === 'assessmentUnit') policy.assessment.unit = value;
      else if (key === 'reminderDays') policy.reminderDays = target.value.trim() ? target.value.split(',').map(item => Number(item.trim())) : [];
      else { policy[key] = value; refresh = key === 'coachMode'; }
    } else if (target.dataset.psRule) {
      let rule = policy.rules.find(item => item.ruleId === target.dataset.psRule);
      if (!rule) {
        const source = catalog().rules.find(item => item.id === target.dataset.psRule);
        if (!source) return;
        rule = { ruleId: source.id, enabled: false, severity: source.severity, allowance: source.allowance };
        policy.rules.push(rule);
      }
      rule[target.dataset.psRuleField] = target.type === 'checkbox' ? target.checked : target.type === 'number' ? (target.value === '' ? null : Number(target.value)) : target.value;
    } else if (target.dataset.psCourse) {
      policy.courseIds = target.checked ? [...new Set([...policy.courseIds, target.dataset.psCourse])] : policy.courseIds.filter(id => id !== target.dataset.psCourse);
    } else if (target.dataset.psGroup) {
      policy.audience.groups = target.checked ? [...new Set([...policy.audience.groups, target.dataset.psGroup])] : policy.audience.groups.filter(group => group !== target.dataset.psGroup);
      refresh = true;
    } else if (target.dataset.psGroupCoach) policy.groupCoaches[target.dataset.psGroupCoach] = target.value;
    else return;
    errors = [];
    remember(policy);
    if (refresh) {
      const advancedOpen = document.getElementById('ps-advanced')?.open;
      const id = target.id;
      const groupName = target.dataset.psGroup;
      redraw(id || 'ps-section-title');
      if (advancedOpen && document.getElementById('ps-advanced')) document.getElementById('ps-advanced').open = true;
      if (groupName) requestAnimationFrame(() => [...document.querySelectorAll('[data-ps-group]')].find(input => input.dataset.psGroup === groupName)?.focus());
    }
  }
  document.addEventListener('input', event => {
    if (event.target.closest('#ps-add-rule-form')) event.target.setCustomValidity('');
    if (event.target.matches('[data-ps-policy] input:not([type="checkbox"]):not([type="radio"])')) changeField(event);
  });
  document.addEventListener('change', event => {
    if (event.target.matches('[data-ps-policy] select, [data-ps-policy] input[type="checkbox"], [data-ps-policy] input[type="radio"]')) changeField(event);
  });
  document.addEventListener('submit', event => {
    const form = event.target;
    if (form.id !== 'ps-add-rule-form') return;
    event.preventDefault();
    const current = editable();
    if (!current?.behaviorId) return;
    const nameInput = form.elements.namedItem('name');
    const conditionInput = form.elements.namedItem('condition');
    const name = nameInput.value.trim();
    const condition = conditionInput.value.trim();
    const normalizeName = value => String(value).trim().replace(/\s+/g, ' ').toLowerCase();
    nameInput.setCustomValidity(!name ? 'Enter a rule name.' : rulesForPolicy(current).some(rule => normalizeName(ruleFor(rule).name) === normalizeName(name)) ? 'A rule with this name already appears in the program. Use a different name or include the existing rule.' : '');
    conditionInput.setCustomValidity(condition ? '' : 'Describe the detection condition.');
    if (!form.reportValidity()) return;
    const policy = copy(current);
    const ruleId = 'custom-rule-' + crypto.randomUUID();
    policy.rules.push({ ruleId, name, condition, behaviorId: policy.behaviorId, enabled: true, severity: form.elements.namedItem('severity').value, allowance: Number(form.elements.namedItem('allowance').value) });
    errors = [];
    remember(policy);
    redraw();
    requestAnimationFrame(() => {
      document.querySelector('[data-ps-rule="' + ruleId + '"][data-ps-rule-field="enabled"]')?.focus();
      announce('Rule added · ' + (policy.status === 'active' ? 'Save changes to apply it to future assignments.' : 'Draft saved locally'));
    });
  });
  document.addEventListener('click', event => {
    const useSeries = event.target.closest('[data-ps-course-series]');
    if (useSeries) {
      const current = editable();
      if (!current) return;
      const next = copy(current);
      next.courseIds = catalog().courses.filter(course => course.seriesId === useSeries.dataset.psCourseSeries && course.behaviorId === next.behaviorId).sort((a, b) => a.level - b.level).map(course => course.id);
      if (!next.courseIds.length) return;
      errors = []; remember(next); redraw('ps-coaching-title');
      requestAnimationFrame(() => document.querySelector('[data-ps-course-series="' + useSeries.dataset.psCourseSeries + '"]')?.focus());
      return;
    }
    if (event.target.closest('[data-ps-start]')) { start(); return; }
    const remove = event.target.closest('[data-ps-remove]');
    if (remove) {
      const policy = getPolicy(remove.dataset.psRemove);
      if (!policy || !window.confirm('Delete ' + policy.name + '? Its coaching records will be removed from this workspace.')) return;
      removePolicy(policy.id);
      deleteProgram(policy.id);
      redraw('ps-section-title');
      return;
    }
    const stepButton = event.target.closest('[data-ps-step]');
    if (stepButton && wizardOpen) { state.wizard.step = Number(stepButton.dataset.psStep); errors = []; persist(); redraw(); return; }
    const action = event.target.closest('[data-ps-action]')?.dataset.psAction;
    if (!action) return;
    if (action === 'close-wizard') { wizardOpen = false; errors = []; persist(); redraw('ps-section-title'); return; }
    if (action === 'save-draft') { saveFromForm(false); return; }
    if (action === 'activate' || action === 'save-active') { saveFromForm(true); return; }
    const policy = editable();
    if (!policy) return;
    if (action === 'add-rule' || action === 'cancel-rule') {
      const form = document.getElementById('ps-add-rule-form');
      const opener = document.getElementById('ps-add-rule-button');
      const opening = action === 'add-rule';
      if (!form || !opener || (opening && !policy.behaviorId)) return;
      form.hidden = !opening;
      opener.setAttribute('aria-expanded', String(opening));
      if (opening) document.getElementById('ps-rule-name').focus();
      else {
        form.reset();
        [...form.elements].forEach(field => field.setCustomValidity?.(''));
        opener.focus();
      }
      return;
    }
    if (action === 'discard') { delete state.editDrafts[policy.id]; errors = []; persist(); redraw(); return; }
    if (action === 'recommend-courses') { const next = copy(policy); next.courseIds = catalog().courses.filter(course => course.behaviorId === policy.behaviorId && !course.seriesId).map(course => course.id); remember(next); redraw('ps-coaching-title'); return; }
    if (action === 'back') { state.wizard.step = Math.max(0, state.wizard.step - 1); errors = []; persist(); redraw(); return; }
    if (action === 'next') {
      const step = state.wizard.step;
      errors = step === 0 ? (!policy.name.trim() ? ['Enter a program title.'] : []).concat(!policy.behaviorId ? ['Choose a behavior.'] : []).concat(policy.audience.mode === 'groups' && !policy.audience.groups.length ? ['Select at least one group.'] : []) : step === 1 ? validate(policy).filter(error => /rule|severity|allowance|score|threshold/i.test(error)) : validate(policy);
      if (!errors.length) state.wizard.step = Math.min(3, step + 1);
      persist(); redraw(errors.length ? 'ps-errors' : 'ps-section-title');
    }
  });
  globalThis.ProgramSetup = { init, start, getPolicy, getPreviewPolicy, getPolicies, savePolicy, removePolicy, getCourses, courseForProgram, renderConfiguration, renderContent, renderLibrary, libraryMetrics, validatePolicy: validate };
})();
