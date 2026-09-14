/* Programs reads the existing ledger and owns program configuration. It does not run coaching rules. */
const allProgramsPage = { id: 'all', name: 'All programmes' };
const programPageTabs = [['activity', 'Activity'], ['content', 'Learning'], ['configuration', 'Configuration'], ['automation', 'Automation']];
const programOutcomeDisclosures = new Set();
let programComparisonView = 'coaching';
let programChartObserver = null;


function programPageCounts(programId) {
  return coachingCounts(record => programId === 'all' || record.categoryId === programId);
}

function programPageLink(program, tab = 'activity') {
  return '<button class="text-link" type="button" data-open-program-page="' + escapeHtml(program.id) + '" data-program-page-tab="' + tab + '">' + escapeHtml(program.name) + '</button>';
}



function programPageSummary(program) {
  const counts = programPageCounts(program.id);
  const scope = program.name + ' · ' + periodScopeLabel() + '. ';
  // All programmes shares the week-over-week deltas the Automation Centre and Sessions strips show; programme histories have no prior snapshot.
  const trends = program.id === 'all' ? uiSessionCycleTrends({ identified: counts.total, inProgress: counts.automated + counts.one_to_one, needsReview: counts.needs_review, completed: counts.completed }, coachingPeriod === 1) : {};
  const sessionsLink = (filter, origin = '') => 'data-view-link="inbox" data-inbox-filter="' + filter + '" data-inbox-program="' + escapeHtml(program.id) + '"' + (origin ? ' data-inbox-origin="' + origin + '"' : '');
  return uiKpiStrip(program.name + ' coaching summary', [
    { label: 'Identified', value: counts.total, context: scope + 'Coaching sessions automation opened in this period. Opens Sessions.', action: sessionsLink('all'), trend: trends.identified },
    { label: 'In progress', value: counts.automated + counts.one_to_one, context: scope + counts.automated + ' automated and ' + counts.one_to_one + ' one-on-one sessions in progress. Sessions needing review and completed sessions are counted separately. Opens Sessions.', action: sessionsLink('system_handling'), trend: trends.inProgress },
    { label: 'Needs review', value: counts.needs_review, context: scope + 'Sessions waiting on a person: Overdue, Repeated or Replied. Shows the drivers needing attention below Activity.', action: 'data-program-attention', trend: trends.needsReview },
    { label: 'Completed', value: counts.completed, context: scope + (counts.total ? counts.completed + ' of ' + counts.total + ' identified records completed (' + Math.round(counts.completed / counts.total * 100) + '%). Includes archived completions.' : 'No identified records; completion rate unavailable.'), action: sessionsLink('completed'), trend: trends.completed, meter: { value: counts.completed, max: counts.total } },
    { label: 'Automated sessions', value: counts.automatedTotal, context: scope + 'All automated sessions, including in progress, needing review and completed. Opens Sessions.', action: sessionsLink('all', 'automated') },
    { label: 'One-on-one sessions', value: counts.oneOnOneTotal, context: scope + 'All one-on-one sessions, including escalations, across in progress, needing review and completed. Opens Sessions.', action: sessionsLink('all', 'manual_override') },
    program.id === 'all'
      ? { label: 'Elevate score', value: fleetSafetyScore.score, context: 'Recorded overall prototype score from 0 to 100; higher is safer. The weighted roll-up of program scores is not configured yet.' }
      : { label: program.name + ' score', value: programScore(program) === null ? '—' : programScore(program), context: programScore(program) === null ? 'No recorded score for this program yet. Program scores require configured event weights and period evaluations.' : 'Recorded prototype score for ' + program.name + ' from 0 to 100; higher is safer. Not yet computed from rule weights.' }
  ]);
}



function programPageRateChart(program) {
  if (program.id !== 'all') return '';
  return '<section class="chart-card" id="program-rate-chart" aria-labelledby="program-comparison-title"' + (programComparisonView === 'rates' ? '' : ' hidden') + '><div id="program-rate-content"></div></section>';
}

function programPageComparisons() {
  return categories.map(program => ({ program, counts: programPageCounts(program.id), rate: rateChange(program.weeklyRates) }))
    .sort((a, b) => b.counts.needs_review - a.counts.needs_review || b.counts.total - a.counts.total || a.program.name.localeCompare(b.program.name));
}

function programPageAllRateComparison(width) {
  const beforeLabel = 'Week of ' + weeklyCoachingActivity[Math.max(0, periodWindowStart())].label;
  const afterLabel = 'Week of ' + weeklyCoachingActivity.at(-1).label;
  const comparisons = programPageComparisons();
  const rows = comparisons.map(({ program, rate }) => ({ label: program.name, ...rate }));
  const summary = 'Each pair compares one program: ' + beforeLabel + ' with ' + afterLabel + ', in events per 1,000 trips. Lower is safer. Rates are separate prototype observations; they are not added or averaged because comparable program exposure is unavailable. Rate changes do not establish a coaching or video effect. The comparison uses the last two observed weeks for This week, or the first and last weeks of a longer reporting window. A program can have observed events without a coaching record.';
  return '<p class="chart-context">' + escapeHtml(beforeLabel + ' → ' + afterLabel) + ' · events / 1,000 trips · lower is safer</p><div class="chart-legend">' + chartLegendMarkup([{ tone: 'baseline', label: 'Before' }, { tone: 'primary', label: 'After' }]) + '</div><div class="chart-plot" id="program-rate-plot" tabindex="0" role="region" aria-label="All programs event-rate comparison">' + chartBeforeAfterSvg(rows, width) + '</div>' + chartSummaryMarkup(summary, chartTableMarkup('All program event-rate observations', ['Program', beforeLabel, afterLabel], comparisons.map(({ program, rate }) => [program.name, chartRate(rate.before), chartRate(rate.after)])));
}

function programPageComparisonTable() {
  const rows = programPageComparisons().map(({ program, counts, rate }) => {
    const values = [counts.needs_review, counts.automated + counts.one_to_one, counts.completed, counts.automatedTotal, counts.oneOnOneTotal, chartChangeLabel(rate)];
    const score = programScore(program);
    return '<tr data-program-comparison="' + escapeHtml(program.id) + '"><td>' + programPageLink(program) + '</td>' + values.map((value, index) => '<td class="num"' + (index === values.length - 1 ? ' data-sort-value="' + rate.change + '"' : '') + '>' + escapeHtml(String(value)) + '</td>').join('') + '<td class="num"' + (score === null ? ' data-sort-value=""' : '') + '>' + (score === null ? '—' : score) + '</td></tr>';
  }).join('');
  return '<div id="program-comparison-table"' + (programComparisonView === 'rates' ? ' hidden' : '') + '>' + uiTable('Program coaching and event-rate comparison', ['Program', ...['Needs review', 'In progress', 'Completed', 'Automated sessions', 'One-on-one sessions', 'Event-rate change', 'Score'].map(label => ({ label, numeric: true }))], rows) + '</div>';
}

function programPageComparison() {
  return '<section id="program-comparison" aria-labelledby="program-comparison-title"><div class="program-section-heading"><div class="program-section-title"><h2 class="section-title" id="program-comparison-title">Compare programs</h2><button class="hint-trigger" type="button" aria-label="About program comparison" data-tooltip="Needs review + In progress + Completed = Identified. Automated and one-on-one are total sessions across all states. Event-rate change compares the dated endpoints in Event rates, not coaching outcomes.">' + uiIcon('info') + '</button></div><fieldset class="segmented" id="program-comparison-view"><legend class="sr-only">Program comparison view</legend>' + [['coaching', 'Coaching', 'program-comparison-table'], ['rates', 'Event rates', 'program-rate-chart']].map(([value, label, panel]) => '<label><input type="radio" name="program-comparison-view" value="' + value + '" data-program-comparison-view="' + value + '" aria-controls="' + panel + '"' + (programComparisonView === value ? ' checked' : '') + '><span class="segmented__option">' + label + '</span></label>').join('') + '</fieldset></div>' + programPageComparisonTable() + programPageRateChart(allProgramsPage) + '</section>';
}

function programPageOverview(program) {
  return '<div class="stack"><div class="program-activity-layout">' + programActivityMarkup(program) + '</div>' +
    (program.id === 'all' ? programPageComparison() : '') +
    programActivityOutcomes(program) + '</div>';
}

function programPageLessons(program) {
  return learningLessonsForProgram(program.id);
}

function programPageContent(program) {
  if (typeof ProgramSetup !== 'undefined') return ProgramSetup.renderContent(program);
  return learningMappedTable(program);
}

// ---- Program configuration ---------------------------------------------------------
// A program owns its rules (one per event feed, each with a severity and a threshold), the score
// threshold that starts coaching, and where its one-on-ones go. Edits save immediately and
// persist locally; nothing here runs a scoring engine.
const coachDirectory = ['Alex Kim', 'Morgan Chen'];
const programCoachModes = [['program', 'One coach for this program'], ['group', 'A coach per group']];
// Geotab exception rules a program rule can be mapped to. Lytx camera events use the same shape.
const ruleSourceCatalog = [
  ['Geotab', ['Speeding', 'Posted speed limit', 'Harsh braking', 'Harsh acceleration', 'Harsh cornering', 'Following distance', 'Seat belt', 'Idling', 'After-hours use', 'Reverse at start']],
  ['Lytx', ['Following distance (camera)', 'Driver distraction (camera)', 'Phone use (camera)', 'Drowsiness (camera)']]
];
const severityWeights = { Low: 1, Medium: 3, High: 5 };
// How a program escalates to a one-on-one. Overdue after N days without acknowledgement; Repeated after
// N repeats within a window of completed coaching; drivers with too little exposure are not scored.
const escalationDefaults = { overdueDays: 10, repeatCount: 2, repeatWindowWeeks: 8, minTrips: 20 };
const escalationLimits = { overdueDays: [1, 60], repeatCount: [1, 10], repeatWindowWeeks: [1, 52], minTrips: [0, 500] };
function ruleWeight(rule) { const weight = Number(rule.weight); return rule.weight !== undefined && rule.weight !== null && rule.weight !== '' && Number.isFinite(weight) ? weight : severityWeights[rule.severity] || severityWeights.Medium; }
function ruleSourceLabel(rule) { return (rule.source || 'Geotab') + (rule.sourceRule ? ' · ' + rule.sourceRule : ''); }
let programSettings = null;
let programCreateOpen = false;
let programRuleFormOpen = false;

function programSettingFor(programId) {
  if (!programSettings) programSettings = readSavedJson('elevate-program-settings', null) || {};
  programSettings[programId] = { threshold: 75, coachMode: 'program', coach: coachDirectory[0], groupCoaches: {}, ...escalationDefaults, ...(programSettings[programId] || {}) };
  return programSettings[programId];
}

function saveProgramSettings() {
  return saveSetting('elevate-program-settings', JSON.stringify(programSettings || {}));
}

function saveProgramRules() {
  return saveSetting('elevate-event-types', JSON.stringify(eventTypeRules));
}

function blankProgram(id, name) {
  return {
    id, name, priority: 'watch', priorityLabel: 'New program', eventCount: 0, trips: 0, drivers: 0, quick: 0, directed: 0, active: 0,
    completed: 0, repeats: 0, clips: 0, change: 0, rate: 0, previousRate: 0, training: '', description: 'Created locally. Add rules so automation has something to score.',
    trend: Array(14).fill(0), eventTypes: [], tripContext: [], coached: 0, attention: 0, lessonAssigned: 0, oneToOne: 0, eventChange: 0,
    weeklyRates: Array(8).fill(0), quickCases: [], directedCases: []
  };
}

// Runs once from app.js after the fixture ledger exists: replay locally created and deleted programs.
function applyStoredProgramChanges() {
  const created = readSavedJson('elevate-custom-programs', []);
  if (Array.isArray(created)) created.forEach(item => {
    if (item && item.id && item.name && !categories.some(program => program.id === item.id)) categories.push(blankProgram(item.id, item.name));
  });
  const deleted = readSavedJson('elevate-deleted-programs', []);
  if (Array.isArray(deleted)) deleted.forEach(id => removeProgramRecords(id));
}

function removeProgramRecords(programId) {
  const index = categories.findIndex(program => program.id === programId);
  if (index >= 0) categories.splice(index, 1);
  for (let i = sessions.length - 1; i >= 0; i -= 1) if (sessions[i].categoryId === programId) sessions.splice(i, 1);
  for (let i = attentionAiInsights.length - 1; i >= 0; i -= 1) if (attentionAiInsights[i].categoryId === programId) attentionAiInsights.splice(i, 1);
  if (typeof eventTypeRules !== 'undefined') eventTypeRules = eventTypeRules.filter(rule => rule.programId !== programId);
  if (programSettings) delete programSettings[programId];
}

function programSlug(name) {
  const base = name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '') || 'program';
  let id = base; let n = 2;
  while (categories.some(program => program.id === id)) id = base + '-' + (n += 1);
  return id;
}

function createProgram(name) {
  const id = programSlug(name);
  categories.push(blankProgram(id, name));
  const created = readSavedJson('elevate-custom-programs', []);
  saveSetting('elevate-custom-programs', JSON.stringify((Array.isArray(created) ? created : []).concat({ id, name })));
  programSettingFor(id);
  saveProgramSettings();
  programCatalogChanged();
  showToast(name + ' created');
  return id;
}

function deleteProgram(programId) {
  const program = categories.find(item => item.id === programId);
  if (!program) return;
  const created = readSavedJson('elevate-custom-programs', []);
  const custom = Array.isArray(created) && created.some(item => item.id === programId);
  if (custom) saveSetting('elevate-custom-programs', JSON.stringify(created.filter(item => item.id !== programId)));
  else {
    const deleted = readSavedJson('elevate-deleted-programs', []);
    saveSetting('elevate-deleted-programs', JSON.stringify((Array.isArray(deleted) ? deleted : []).concat(programId)));
  }
  removeProgramRecords(programId);
  if (typeof ProgramSetup !== 'undefined') ProgramSetup.removePolicy(programId);
  saveProgramRules();
  saveProgramSettings();
  if (selectedProgramId === programId) selectedProgramId = 'all';
  if (landingProgramId === programId) landingProgramId = 'all';
  programCatalogChanged();
  showToast(program.name + ' deleted');
}

function programCatalogChanged() {
  const landing = document.getElementById('landing-program-filter');
  if (landing) landing.innerHTML = '';
  syncFleetSessionCounts();
  refreshPeriodData();
  if (currentView === 'coaching') renderHomeOverview();
  if (currentView === 'programs') renderProgramsPage();
  updateUrlState();
}

function programCoachLabel(program) {
  const cfg = programSettingFor(program.id);
  return cfg.coachMode === 'group' ? 'By group' : cfg.coach;
}

function programCoachPhrase(program) {
  const cfg = programSettingFor(program.id);
  return cfg.coachMode === 'group' ? 'the coach set for the driver’s group' : cfg.coach;
}

function programFlowCopy(program) {
  const cfg = programSettingFor(program.id);
  const rules = eventTypeRules.filter(rule => rule.programId === program.id && rule.enabled);
  const policy = programPolicyFor(program.id);
  return program.name + ' has ' + rules.length + ' enabled rules and a ' + programPolicyPeriodLabel(program.id) +
    ' evaluation period. The configured coaching threshold is below ' + cfg.threshold + ' / 100. ' +
    policy.levelLessons.length + ' lesson levels lead to one-on-one coaching. Saved coach: ' + programCoachLabel(program) + '. ' +
    (rules.some(rule => rule.direct) ? 'Direct one-on-one rules: ' + rules.filter(rule => rule.direct).map(rule => rule.name).join(', ') + '. ' : '') +
    'These settings are saved in this browser. ' +
    'Score calculation, threshold evaluation, automatic level advancement, reset and reminder scheduling are not connected.';
}

function nativeSelect(attrs, options, selected) {
  return '<select class="filter-control" ' + attrs + '>' + options.map(([value, label]) => '<option value="' + escapeHtml(value) + '"' + (value === selected ? ' selected' : '') + '>' + escapeHtml(label) + '</option>').join('') + '</select>';
}

function programRuleRow(program, rule) {
  const name = escapeHtml(rule.name);
  const id = escapeHtml(rule.id);
  const field = (key, label) => 'data-program-rule-field="' + key + '" data-program-rule-id="' + id + '" aria-label="' + escapeHtml(label) + '"';
  return '<tr class="program-rule-record' + (rule.enabled ? '' : ' is-off') + '" data-program-rule="' + id + '">' +
    '<td><input type="checkbox" ' + field('enabled', (rule.enabled ? 'Disable ' : 'Enable ') + rule.name) + (rule.enabled ? ' checked' : '') + '></td>' +
    '<td>' + name + '<span class="program-rule-source">' + escapeHtml(ruleSourceLabel(rule)) + '</span></td>' +
    '<td>' + nativeSelect(field('severity', 'Severity for ' + rule.name), Object.entries(severityOptions), rule.severity) + '</td>' +
    '<td class="num"><input class="filter-control program-number" type="number" min="0" step="any" value="' + ruleWeight(rule) + '" ' + field('weight', 'Event weight for ' + rule.name) + '></td>' +
    '<td class="num"><input class="filter-control program-number" type="number" min="0" max="50" value="' + rule.threshold + '" ' + field('threshold', 'Events per period before ' + rule.name + ' counts') + '></td>' +
    '<td><input type="checkbox" ' + field('direct', 'Open a one-on-one directly for ' + rule.name) + (rule.direct ? ' checked' : '') + '></td>' +
    '<td><button class="icon-button row-remove" type="button" data-remove-program-rule="' + id + '" aria-label="' + escapeHtml('Delete rule ' + rule.name) + '">' + uiIcon('close') + '</button></td></tr>';
}

function programRuleForm(program) {
  const sources = ruleSourceCatalog.map(([source, names]) => '<optgroup label="' + escapeHtml(source) + '">' + names.map(item => '<option value="' + escapeHtml(source + '|' + item) + '">' + escapeHtml(item) + '</option>').join('') + '</optgroup>').join('') + '<option value="custom">Custom rule</option>';
  return '<form class="program-config-form" id="program-rule-form" aria-label="Add rule to ' + escapeHtml(program.name) + '">' +
    '<label class="field"><span>Source rule</span><select class="filter-control" name="source" aria-describedby="program-rule-source-help">' + sources + '</select></label>' +
    '<label class="field"><span>Rule name</span><input class="filter-control" name="name" required maxlength="60" placeholder="e.g. Speeding over 20" autocomplete="off"></label>' +
    '<label class="field"><span>Severity</span>' + nativeSelect('name="severity"', Object.entries(severityOptions), 'Medium') + '</label>' +
    '<label class="field"><span>Weight</span><input class="filter-control program-number" type="number" name="weight" min="0" step="any" value="' + severityWeights.Medium + '" aria-describedby="program-rule-weight-help"></label>' +
    '<label class="field"><span>Threshold</span><input class="filter-control program-number" type="number" name="threshold" min="0" max="50" value="5"></label>' +
    '<label class="field program-config-check"><input type="checkbox" name="direct"><span>Open a one-on-one directly, without a lesson</span></label>' +
    '<p class="field-help" id="program-rule-source-help">Choose the event source and relative weight. Fractional weights are supported; score normalization is not connected.</p><span class="sr-only" id="program-rule-weight-help">Relative event weight, including fractional values. No score formula is applied here.</span>' +
    '<div class="program-config-form-actions"><button class="button button--secondary" type="button" data-cancel-program-rule>Cancel</button><button class="button button--primary" type="submit">Add rule</button></div></form>';
}

// Settings cards follow one anatomy: title + one-line purpose, then label-left / control-right rows.
function programSettingRow(label, description, control) {
  return '<div class="program-setting-row"><span class="program-setting-copy"><strong>' + escapeHtml(label) + '</strong>' + (description ? '<small>' + escapeHtml(description) + '</small>' : '') + '</span><span class="program-setting-control">' + control + '</span></div>';
}

function programSettingCard(id, title, purpose, body, action = '') {
  return '<section class="card program-config-card" aria-labelledby="' + id + '"><header class="program-config-card-head"><div><h3 class="section-title" id="' + id + '">' + escapeHtml(title) + '</h3><p class="caption">' + escapeHtml(purpose) + '</p></div>' + action + '</header>' + body + '</section>';
}

function programNumberInput(attrs, value, min, max, label) {
  return '<input class="filter-control program-number" type="number" min="' + min + '" max="' + max + '" value="' + value + '" ' + attrs + ' aria-label="' + escapeHtml(label) + '">';
}

function programConfigurationDetail(program) {
  const cfg = programSettingFor(program.id);
  const rules = eventTypeRules.filter(rule => rule.programId === program.id);
  const coachOptions = coachDirectory.map(name => [name, name]);
  const ruleRows = rules.map(rule => programRuleRow(program, rule)).join('');
  const coachBody = '<fieldset class="segmented program-coach-mode" id="program-coach-mode"><legend class="sr-only">Coach routing</legend>' + programCoachModes.map(([value, label]) => '<label><input type="radio" name="program-coach-mode" value="' + value + '" data-program-coach-mode="' + value + '"' + (cfg.coachMode === value ? ' checked' : '') + '><span class="segmented__option">' + escapeHtml(label) + '</span></label>').join('') + '</fieldset>' +
    (cfg.coachMode === 'group'
      ? uiTable(program.name + ' coach by group', ['Group', 'Coach'], Object.keys(groupComparisonData).map(group => '<tr><th scope="row">' + escapeHtml(group) + '</th><td>' + nativeSelect('data-program-group-coach="' + escapeHtml(group) + '" aria-label="' + escapeHtml('Coach for ' + group) + '"', coachOptions, cfg.groupCoaches[group] || cfg.coach) + '</td></tr>').join(''))
      : programSettingRow('Coach', '', nativeSelect('data-program-coach="' + escapeHtml(program.id) + '" aria-label="Coach"', coachOptions, cfg.coach)));
  const coachCard = programSettingCard('program-coach-title', 'One-on-one coach', 'Locally saved routing preference.', coachBody);
  return '<div class="stack program-section-stack" id="program-configuration" data-program-configuration-detail="' + escapeHtml(program.id) + '">' +
    '<section aria-labelledby="program-rules-title"><div class="program-section-heading"><div class="program-section-title"><h2 class="section-title" id="program-rules-title">Rules</h2><span class="caption">' + rules.length + (rules.length === 1 ? ' rule' : ' rules') + '</span><button class="hint-trigger" type="button" id="program-flow-copy" aria-label="What happens in this program" data-tooltip-wide="true" data-tooltip="' + escapeHtml(programFlowCopy(program)) + '">' + uiIcon('info') + '</button></div><button class="button button--secondary" type="button" data-add-program-rule aria-expanded="' + programRuleFormOpen + '">Add rule</button></div>' +
      (programRuleFormOpen ? programRuleForm(program) : '') +
      (ruleRows ? uiTable(program.name + ' rules', ['On', 'Rule', 'Severity', { label: 'Weight', numeric: true }, { label: 'Threshold', numeric: true }, 'Direct one-on-one', 'Delete'], ruleRows) : '<div class="card empty-state compact"><strong>No rules yet</strong><span>Add an event rule to this programme.</span></div>') + '</section>' +
    '<div class="program-config-cards">' + programPolicyCards(program) + coachCard + '</div></div>';
}


function programCreateForm() {
  return '<form class="program-config-form" id="program-create-form" aria-label="Create program">' +
    '<label class="field"><span>Program name</span><input class="filter-control" name="name" required maxlength="60" placeholder="e.g. Lane discipline" autocomplete="off"></label>' +
    '<div class="program-config-form-actions"><button class="button button--secondary" type="button" data-cancel-program-create>Cancel</button><button class="button button--primary" type="submit">Create program</button></div></form>';
}

function programPageConfiguration(program) {
  if (typeof ProgramSetup !== 'undefined') return ProgramSetup.renderConfiguration(program);
  if (program.id !== 'all') return programConfigurationDetail(program);
  const rows = categories.map(item => {
    const rules = eventTypeRules.filter(rule => rule.programId === item.id);
    const cfg = programSettingFor(item.id);
    return '<tr data-program-configuration="' + escapeHtml(item.id) + '"><td>' + programPageLink(item, 'configuration') + '</td><td class="num">' + cfg.threshold + '</td><td class="num">' + rules.length + '</td><td>' + escapeHtml(programPolicyPeriodLabel(item.id)) + '</td><td>' + escapeHtml(programCoachLabel(item)) + '</td><td class="num">' + programPageLessons(item).length + '</td>' +
      '<td><button class="icon-button row-remove" type="button" data-delete-program="' + escapeHtml(item.id) + '" aria-label="' + escapeHtml('Delete ' + item.name) + '">' + uiIcon('close') + '</button></td></tr>';
  }).join('');
  return '<div class="stack program-section-stack" id="program-configuration"><div class="program-section-heading"><div class="program-section-title"><h2 class="section-title">Program configuration</h2><span class="caption">' + categories.length + ' programs</span></div><button class="button button--secondary" type="button" data-add-program aria-expanded="' + programCreateOpen + '">New program</button></div>' +
    (programCreateOpen ? programCreateForm() : '') +
    uiTable('Program configuration', ['Program', { label: 'Threshold', numeric: true }, { label: 'Rules', numeric: true }, 'Evaluation period', 'One-on-one coach', { label: 'Lessons', numeric: true }, 'Delete'], rows) + '</div>';
}

function rerenderProgramConfiguration(focusSelector) {
  renderProgramsPage();
  const focusAfterRender = document.activeElement;
  if (focusSelector) requestAnimationFrame(() => {
    // A user may already have moved to another field before the next frame.
    if (document.activeElement === focusAfterRender) document.querySelector(focusSelector)?.focus({ preventScroll: true });
  });
}

document.addEventListener('click', event => {
  const host = event.target.closest('#view-programs #program-configuration');
  if (!host) return;
  if (event.target.closest('[data-add-program]')) {
    programCreateOpen = !programCreateOpen;
    rerenderProgramConfiguration(programCreateOpen ? '#program-create-form [name="name"]' : '[data-add-program]');
    return;
  }
  if (event.target.closest('[data-cancel-program-create]')) {
    programCreateOpen = false;
    rerenderProgramConfiguration('[data-add-program]');
    return;
  }
  const remove = event.target.closest('[data-delete-program]');
  if (remove) {
    const program = categories.find(item => item.id === remove.dataset.deleteProgram);
    if (!program) return;
    const records = allSessionRecords().filter(record => record.categoryId === program.id).length;
    if (!window.confirm('Delete ' + program.name + '?' + (records ? ' Its ' + records + ' coaching records will be removed from this workspace.' : ''))) return;
    deleteProgram(program.id);
    requestAnimationFrame(() => document.querySelector('[data-add-program]')?.focus({ preventScroll: true }));
    return;
  }
  if (event.target.closest('[data-add-program-rule]')) {
    programRuleFormOpen = !programRuleFormOpen;
    rerenderProgramConfiguration(programRuleFormOpen ? '#program-rule-form [name="name"]' : '[data-add-program-rule]');
    return;
  }
  if (event.target.closest('[data-cancel-program-rule]')) {
    programRuleFormOpen = false;
    rerenderProgramConfiguration('[data-add-program-rule]');
    return;
  }
  const removeRule = event.target.closest('[data-remove-program-rule]');
  if (removeRule) {
    const rule = eventTypeRules.find(item => item.id === removeRule.dataset.removeProgramRule);
    eventTypeRules = eventTypeRules.filter(item => item.id !== removeRule.dataset.removeProgramRule);
    saveProgramRules();
    rerenderProgramConfiguration('[data-add-program-rule]');
    if (rule) showToast(rule.name + ' deleted');
  }
});

document.addEventListener('change', event => {
  if (!event.target.closest('#view-programs #program-configuration')) return;
  const form = event.target.closest('#program-rule-form');
  if (form) {
    if (event.target.name === 'source') {
      const [, sourceRule] = String(event.target.value).split('|');
      const nameInput = form.querySelector('[name="name"]');
      if (nameInput && (!nameInput.value.trim() || nameInput.dataset.autofilled === 'true')) { nameInput.value = sourceRule || ''; nameInput.dataset.autofilled = sourceRule ? 'true' : 'false'; }
    }
    if (event.target.name === 'name') event.target.dataset.autofilled = 'false';
    if (event.target.name === 'severity') { const weight = form.querySelector('[name="weight"]'); if (weight) weight.value = severityWeights[event.target.value] || severityWeights.Medium; }
    return;
  }
  const escalation = event.target.closest('[data-program-escalation]');
  if (escalation) {
    const key = escalation.dataset.programEscalation;
    const [min, max] = escalationLimits[key] || [0, 999];
    const cfg = programSettingFor(selectedProgramId);
    const value = Math.round(Number(escalation.value));
    cfg[key] = Number.isFinite(value) ? Math.min(max, Math.max(min, value)) : cfg[key];
    saveProgramSettings();
    rerenderProgramConfiguration('[data-program-escalation="' + key + '"]');
    return;
  }
  const threshold = event.target.closest('[data-program-threshold]');
  if (threshold) {
    programSettingFor(threshold.dataset.programThreshold).threshold = Math.min(100, Math.max(1, Math.round(Number(threshold.value)) || 1));
    saveProgramSettings();
    rerenderProgramConfiguration('[data-program-threshold]');
    return;
  }
  const ruleField = event.target.closest('[data-program-rule-field]');
  if (ruleField) {
    const rule = eventTypeRules.find(item => item.id === ruleField.dataset.programRuleId);
    if (!rule) return;
    const key = ruleField.dataset.programRuleField;
    if (key === 'weight') {
      if (ruleField.value === '' || !ruleField.checkValidity()) { ruleField.reportValidity(); return; }
      rule.weight = Math.max(0, Number(ruleField.value));
    }
    else rule[key] = ruleField.type === 'checkbox' ? ruleField.checked : ruleField.type === 'number' ? Math.min(50, Math.max(0, Math.round(Number(ruleField.value)) || 0)) : ruleField.value;
    if (key === 'severity') rule.weight = severityWeights[rule.severity] || rule.weight;
    saveProgramRules();
    rerenderProgramConfiguration('[data-program-rule-field="' + key + '"][data-program-rule-id="' + rule.id + '"]');
    return;
  }
  const mode = event.target.closest('[data-program-coach-mode]');
  if (mode) {
    programSettingFor(selectedProgramId).coachMode = mode.value;
    saveProgramSettings();
    rerenderProgramConfiguration('[data-program-coach-mode="' + mode.value + '"]');
    return;
  }
  const coach = event.target.closest('[data-program-coach]');
  if (coach) {
    programSettingFor(coach.dataset.programCoach).coach = coach.value;
    saveProgramSettings();
    rerenderProgramConfiguration('[data-program-coach]');
    return;
  }
  const groupCoach = event.target.closest('[data-program-group-coach]');
  if (groupCoach) {
    programSettingFor(selectedProgramId).groupCoaches[groupCoach.dataset.programGroupCoach] = groupCoach.value;
    saveProgramSettings();
    rerenderProgramConfiguration('[data-program-group-coach="' + groupCoach.dataset.programGroupCoach.replace(/"/g, '\\"') + '"]');
  }
});

document.addEventListener('submit', event => {
  if (event.target.id === 'program-create-form') {
    event.preventDefault();
    const name = String(new FormData(event.target).get('name') || '').trim();
    if (!name) return;
    programCreateOpen = false;
    const id = createProgram(name);
    openProgramPage(id, 'configuration');
    requestAnimationFrame(() => document.getElementById('program-page-select')?.focus({ preventScroll: true }));
    return;
  }
  if (event.target.id === 'program-rule-form') {
    event.preventDefault();
    const data = new FormData(event.target);
    const name = String(data.get('name') || '').trim();
    if (!name) return;
    const severity = String(data.get('severity'));
    const [source, sourceRule] = String(data.get('source') || 'custom').split('|');
    const weight = Math.max(0, Number(data.get('weight')));
    if (!Number.isFinite(weight)) return;
    eventTypeRules.push({ id: 'rule-' + selectedProgramId + '-' + Date.now().toString(36), programId: selectedProgramId, name, severity, weight, threshold: Math.min(50, Math.max(0, Math.round(Number(data.get('threshold'))) || 0)), source: source === 'custom' ? 'Custom' : source, sourceRule: sourceRule || '', direct: data.get('direct') === 'on', videoRequired: source === 'Lytx', path: data.get('direct') === 'on' ? 'one_to_one' : 'lesson', enabled: true });
    saveProgramRules();
    programRuleFormOpen = false;
    rerenderProgramConfiguration('[data-add-program-rule]');
    showToast(name + ' added');
  }
});

function renderProgramRateChart() {
  const content = document.getElementById('program-rate-content');
  const program = selectedProgramId === 'all' ? allProgramsPage : categories.find(item => item.id === selectedProgramId);
  if (!content || !program || program.id !== 'all' || currentView !== 'programs' || content.closest('[hidden]')) return;
  const keepSummaryOpen = content.querySelector('.chart-summary')?.open;
  const focusIndex = [...content.querySelectorAll('.chart-plot [tabindex]')].indexOf(document.activeElement);
  content.dataset.chartView = 'comparison';
  content.innerHTML = programPageAllRateComparison(Math.max(480, content.clientWidth));
  if (keepSummaryOpen) content.querySelector('.chart-summary').open = true;
  if (focusIndex >= 0) content.querySelectorAll('.chart-plot [tabindex]')[focusIndex]?.focus({ preventScroll: true });
}

function setProgramComparisonView(value) {
  programComparisonView = value === 'rates' ? 'rates' : 'coaching';
  const table = document.getElementById('program-comparison-table');
  const chart = document.getElementById('program-rate-chart');
  if (!table || !chart || selectedProgramId !== 'all') return;
  table.hidden = programComparisonView !== 'coaching';
  chart.hidden = programComparisonView !== 'rates';
  document.querySelectorAll('[data-program-comparison-view]').forEach(input => { input.checked = input.value === programComparisonView; });
  renderProgramRateChart();
  updateUrlState();
}

function showProgramRecordedOutcomes() {
  const disclosure = document.getElementById('program-page-outcomes');
  if (!disclosure) return;
  programOutcomeDisclosures.add(selectedProgramId);
  disclosure.open = true;
  disclosure.querySelector('summary')?.focus();
}

function renderProgramsPage() {
  const host = document.getElementById('view-programs');
  const program = selectedProgramId === 'all' ? allProgramsPage : categories.find(item => item.id === selectedProgramId) || allProgramsPage;
  if (!host || !program) return;
  // Native toggle events are queued. Capture the visible state before a fast
  // period/program change replaces the node, using its own programme identity.
  const outgoingOutcomes = host.querySelector('#program-page-outcomes[data-program-outcomes]');
  if (outgoingOutcomes) {
    const owner = outgoingOutcomes.dataset.programOutcomes;
    if (outgoingOutcomes.open) programOutcomeDisclosures.add(owner);
    else programOutcomeDisclosures.delete(owner);
  }
  const renderTab = { activity: programPageOverview, content: programPageContent, configuration: programPageConfiguration, automation: programPageAutomation };
  const tab = programPageTabs.some(([value]) => value === programTab) ? programTab : 'activity';
  const reporting = tab === 'activity';
  const returnContext = typeof programPageReturn !== 'undefined' ? programPageReturn : null;
  programChartObserver?.disconnect();
  const controls = (tab === 'automation' ? '<span class="caption">Applies to every programme</span>' :
    '<label class="field"><span class="sr-only">Programme</span><select class="filter-control" id="program-page-select">' + [allProgramsPage, ...categories].map(item => '<option value="' + escapeHtml(item.id) + '"' + (item.id === program.id ? ' selected' : '') + '>' + escapeHtml(item.name) + '</option>').join('') + '</select></label>') +
    (reporting ? '<label class="field"><span class="sr-only">Period</span><select class="filter-control" id="program-page-period" data-coaching-period>' + periodOptions() + '</select></label><span class="caption" id="program-page-scope">' + escapeHtml(periodScopeLabel()) + '</span>' : '');
  host.innerHTML = '<header class="page-heading"><div>' + (returnContext ? '<button class="text-link program-page-back" type="button" data-back-program-page>← ' + escapeHtml(returnContext.label) + '</button>' : '') + '<h1 class="page-title" id="program-title">Programmes</h1></div></header>' +
    (tab === 'activity' ? '<div class="kpi-region" id="program-page-kpis">' + programPageSummary(program) + '</div>' : '') +
    '<div class="data-toolbar program-page-toolbar"><div class="view-tabs" role="tablist" aria-label="Programme sections">' + programPageTabs.map(([value, label]) => '<button class="view-tab' + (tab === value ? ' is-active' : '') + '" type="button" role="tab" id="program-tab-' + value + '" data-program-tab="' + value + '" aria-controls="' + 'program-page-panel' + '" aria-selected="' + (tab === value) + '" tabindex="' + (tab === value ? '0' : '-1') + '">' + label + '</button>').join('') + '</div><div class="toolbar-actions program-page-controls">' + controls + '</div></div>' +
    '<div id="program-page-panel" class="program-page-panel" role="tabpanel" aria-labelledby="program-tab-' + tab + '" tabindex="0"' + '>' + (renderTab[tab] ? renderTab[tab](program) : '') + '</div>';
  const renderCharts = () => {
    if (tab !== 'activity') return;
    programActivityRenderChart(program);
    renderProgramRateChart();
  };
  renderCharts();
  if (tab === 'activity' && typeof ResizeObserver !== 'undefined') {
    let size = host.clientWidth + '|' + getComputedStyle(document.documentElement).fontSize;
    programChartObserver = new ResizeObserver(() => {
      const nextSize = host.clientWidth + '|' + getComputedStyle(document.documentElement).fontSize;
      if (nextSize === size) return;
      size = nextSize;
      renderCharts();
    });
    programChartObserver.observe(host);
  }
}


document.addEventListener('click', event => {
  const comparison = event.target.closest('#program-comparison-table [data-program-comparison]');
  if (comparison && !event.target.closest('button, a, input, select')) {
    openCategoryDrawer(comparison.dataset.programComparison);
    return;
  }
  const tab = event.target.closest('#view-programs [data-program-tab]');
  if (tab) {
    const value = tab.dataset.programTab;
    openProgramPage(selectedProgramId, value);
    requestAnimationFrame(() => document.getElementById('program-tab-' + value)?.focus({ preventScroll: true }));
    return;
  }
  const landing = event.target.closest('#landing-programs-table [data-landing-program]');
  if (landing && !event.target.closest('button, a, input, select')) openProgramPage(landing.dataset.landingProgram);
});

document.addEventListener('toggle', event => {
  if (event.target.id === 'program-page-outcomes' && event.target.isConnected) {
    const owner = event.target.dataset.programOutcomes;
    if (!owner) return;
    if (event.target.open) programOutcomeDisclosures.add(owner);
    else programOutcomeDisclosures.delete(owner);
  }
}, true);

document.addEventListener('change', event => {
  if (event.target.matches('[data-program-comparison-view]')) setProgramComparisonView(event.target.value);
  if (event.target.id === 'program-page-period') requestAnimationFrame(() => document.getElementById('program-page-period')?.focus({ preventScroll: true }));
  if (event.target.id === 'program-page-select') {
    openProgramPage(event.target.value, programTab);
    requestAnimationFrame(() => document.getElementById('program-page-select')?.focus({ preventScroll: true }));
  }
});

// ---- Automation (fleet-wide) ---------------------------------------------------------
// The former Settings page, folded into Programs. Mode and cadence apply to every program; the
// draft → Run preview → Save and activate flow is unchanged and its state lives in app.js.
const automationModeOptions = [['manual', 'Manual'], ['semi', 'Semi-automated'], ['fully', 'Fully automated']];
const automationModeHelp = { manual: 'Configured to require manager approval for each match.', semi: 'Configured to prepare matches for human approval.', fully: 'Configured for automatic assignment and follow-up. Live scheduling is not connected.' };

function programPageAutomation() {
  const dirty = settingsAreDirty();
  const validDue = validSessionDueDays(draftSessionDueDays);
  const draftSchedule = scheduleForCadence(draftCadenceWeeks);
  const activeSchedule = scheduleForCadence(cadenceWeeks);
  const dotState = automationMode === 'manual' ? ' is-paused' : automationMode === 'semi' ? ' is-review' : '';
  const statusLine = automationMode === 'fully' ? 'Configured next cycle · ' + activeSchedule.nextRun : automationMode === 'semi' ? 'Matches wait for manager approval' : 'Managers review every match before coaching starts';
  const saveState = !validDue ? 'Invalid due period' : settingsState === 'error' ? 'Activation failed' : dirty ? 'Unsaved changes' : 'Saved ' + settingsSavedAt;
  const summary = !validDue ? settingsDraftSummary() : settingsState === 'error'
    ? 'Changes could not be activated. Your draft is still available; retry when the connection is restored.'
    : dirty ? settingsDraftSummary() : 'Saved in this browser. Preview shows settings only; activation does not run scoring, dispatch or reminders.';
  const hint = (id, label, text) => '<button class="hint-trigger" type="button" aria-label="' + escapeHtml(label) + '" data-tooltip="' + escapeHtml(text) + '">' + uiIcon('info') + '</button>';
  const heading = (id, title, help, caption = '') => '<div class="program-section-heading"><div class="program-section-title"><h2 class="section-title" id="' + id + '">' + title + '</h2>' + (caption ? '<span class="caption">' + escapeHtml(caption) + '</span>' : '') + (help ? hint(id, 'About ' + title.toLowerCase(), help) : '') + '</div></div>';
  const radios = (name, attr, options, selected, id, describedBy) => '<fieldset class="segmented" id="' + id + '" aria-describedby="' + describedBy + '"><legend class="sr-only">' + escapeHtml(name) + '</legend>' + options.map(([value, label]) =>
    '<label><input type="radio" name="' + attr + '" value="' + value + '" data-' + attr + '="' + value + '"' + (String(value) === String(selected) ? ' checked' : '') + '><span class="segmented__option">' + escapeHtml(label) + '</span></label>').join('') + '</fieldset>';
  const completionRows = [['Lesson', 'Watch required'], ['Acknowledgement', 'Required'], ['Grace and reminders', 'Configured per programme'], ['Follow-up', 'One-on-one after grace expires']]
    .map(([label, value]) => '<tr><th scope="row">' + escapeHtml(label) + '</th><td>' + escapeHtml(value) + '</td></tr>').join('');
  const preview = settingsPanelMode === 'preview' ? '<p class="program-flow-copy" id="settings-preview-panel" role="status">Settings preview. ' + escapeHtml(settingsPreviewCopy(draftAutomationMode, draftCadenceWeeks, draftSessionDueDays).description) + ' Drivers in next cycle: <strong id="settings-impact-drivers">Not estimated</strong>.</p>' : '';
  const history = settingsPanelMode === 'audit' ? '<section class="program-automation-history" aria-labelledby="automation-history-title">' + heading('automation-history-title', 'History', '') +
    uiTable('Automation history', ['Change', 'Detail', 'When'], settingsAuditHistory.slice(0, 20).map(entry => '<tr><td>' + escapeHtml(entry.action) + '</td><td>' + escapeHtml(entry.detail) + '</td><td>' + escapeHtml(entry.time) + '</td></tr>').join('')) + '</section>' : '';
  return '<div class="stack program-section-stack" id="program-automation">' +
    '<section aria-labelledby="program-automation-title"><div class="program-section-heading"><div class="program-section-title"><h2 class="section-title" id="program-automation-title">Automation</h2></div>' +
      '<span class="settings-save-state' + (settingsState === 'error' ? ' is-error' : dirty ? ' is-dirty' : '') + '" id="settings-save-state" role="status" aria-live="polite" data-state="' + (settingsState === 'error' ? 'error' : dirty ? 'dirty' : 'saved') + '">' + escapeHtml(saveState) + '</span></div>' +
      '<div class="program-automation-status"><span class="automation-live-dot' + dotState + '"></span><strong>' + escapeHtml(settingsModeLabel(automationMode)) + '</strong><span class="caption">' + escapeHtml(statusLine) + '</span></div></section>' +
    '<div class="program-automation-layout"><section aria-labelledby="automation-mode-title">' + heading('automation-mode-title', 'Mode', 'How much automation does on its own. Program thresholds, rules and escalation are configured per program on the Configuration tab.') +
      '<div class="program-automation-options">' + radios('Automation mode', 'automation-mode', automationModeOptions, draftAutomationMode, 'automation-mode-grid', 'automation-mode-help') + '<p class="field-help" id="automation-mode-help">' + escapeHtml(automationModeHelp[draftAutomationMode]) + '</p></div></section>' +
    '<section aria-labelledby="cadence-title">' + heading('cadence-title', 'Cadence', 'Fleet scheduling preference. Evaluation periods are configured separately for each programme. No scheduler is connected.') +
      '<div class="program-automation-options">' + radios('Coaching cadence', 'cadence', [[1, 'Every week'], [2, 'Every 2 weeks']], draftCadenceWeeks, 'program-automation-cadence', 'cadence-help') + '<p class="field-help" id="cadence-help">Configured dispatch window ' + escapeHtml(draftSchedule.analysisWindow) + ' · Dispatch ' + (draftCadenceWeeks === 1 ? 'Monday · 8:00 AM' : 'every other Monday · 8:00 AM') + '.</p></div>' +
      '<section class="program-automation-due" aria-labelledby="session-due-title">' + heading('session-due-title', 'Session due period', 'Applies to every new session, measured in calendar days from its creation. Existing session deadlines stay unchanged.') +
        '<label class="program-setting-control"><span class="sr-only">Session due period in days</span><input class="filter-control program-number" id="session-due-days" aria-label="Session due period in days" type="number" min="1" max="365" step="1" required value="' + (draftSessionDueDays ?? '') + '" aria-describedby="session-due-help" aria-invalid="' + (!validDue) + '"><span>days from creation</span></label>' +
        '<p class="field-help" id="session-due-help">For all new sessions.</p></section></section>' +
    '<section class="program-automation-completion" aria-labelledby="completion-title">' + heading('completion-title', 'Completion', 'What an automated lesson requires before a session completes.', 'Automated lessons') + uiTable('Completion requirements', ['Requirement', 'Setting'], completionRows) + '</section></div>' +
    '<div class="program-automation-actions" id="settings-impact" data-state="' + (settingsState === 'error' ? 'error' : dirty ? 'dirty' : 'saved') + '" aria-live="polite"><p id="settings-impact-summary">' + escapeHtml(summary) + '</p>' +
      '<div class="program-config-form-actions"><button class="button button--secondary" id="settings-audit-history" type="button" aria-expanded="' + (settingsPanelMode === 'audit') + '">History</button><button class="button button--secondary" id="settings-preview" type="button"' + (validDue ? '' : ' disabled') + '>Run preview</button>' +
      '<button class="button button--secondary" id="settings-discard" type="button"' + (dirty ? '' : ' disabled') + '>Discard changes</button><button class="button button--primary" id="settings-save" type="button"' + (dirty && validDue ? '' : ' disabled') + '>Save and activate</button></div></div>' +
    preview + history + '</div>';
}

// ---- Automation Centre: compact programs table --------------------------------------------
function renderLandingPrograms() {
  const host = document.getElementById('landing-programs-table');
  if (!host) return;
  const records = allSessionRecords().filter(record => sessionInPeriod(record) && record.state === 'manager_attention');
  const rows = programPageComparisons().map(({ program, counts, rate }) => {
    const reasons = { reminders_exhausted: 0, repeat_after_coaching: 0, driver_reply: 0 };
    records.forEach(record => { if (record.categoryId === program.id && reasons[record.attentionReason] !== undefined) reasons[record.attentionReason] += 1; });
    const values = [reasons.reminders_exhausted, reasons.repeat_after_coaching, reasons.driver_reply, counts.automated + counts.one_to_one, counts.completed];
    const score = programScore(program);
    return '<tr data-landing-program="' + escapeHtml(program.id) + '"><td>' + programPageLink(program) + '</td><td class="num"' + (score === null ? ' data-sort-value=""' : '') + '>' + (score === null ? '—' : score) + '</td>' + values.map(value => '<td class="num">' + value + '</td>').join('') + '<td class="num" data-sort-value="' + rate.change + '">' + escapeHtml(chartChangeLabel(rate)) + '</td></tr>';
  }).join('');
  host.innerHTML = uiTable('Programs · ' + periodScopeLabel(), ['Program', ...['Score', 'Overdue', 'Repeated', 'Replied', 'In progress', 'Completed', 'Event-rate change'].map(label => ({ label, numeric: true }))], rows);
}
