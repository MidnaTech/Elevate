/* Programs reads the existing ledger and owns program configuration. It does not run coaching rules. */
const allProgramsPage = { id: 'all', name: 'All programs' };
const programPageTabs = [['overview', 'Overview'], ['content', 'Content'], ['configuration', 'Configuration']];
const programRecordViews = [['review', 'Needs review'], ['progress', 'In progress'], ['completed', 'Completed'], ['all', 'All records']];
const programRecordScopes = new Map();
const programChartViews = new Map();
const programOutcomeDisclosures = new Set();
let programComparisonView = 'coaching';
let programCoachingExpanded = false;
let programChartObserver = null;

function programPageRecords(programId) {
  return allSessionRecords().filter(record => (programId === 'all' || record.categoryId === programId) && sessionWithinPeriod(record, coachingPeriod));
}

function programPageCounts(programId) {
  return coachingCounts(record => programId === 'all' || record.categoryId === programId);
}

function programPageLink(program, tab = 'overview') {
  return '<button class="text-link" type="button" data-open-program-page="' + escapeHtml(program.id) + '" data-program-page-tab="' + tab + '">' + escapeHtml(program.name) + '</button>';
}

function programPageDriverName(name) {
  if (!directory.some(driver => driver.name === name)) return escapeHtml(name);
  return '<button class="text-link" type="button" data-open-driver-profile="' + escapeHtml(name) + '" aria-haspopup="dialog" aria-controls="driver-drawer">' + escapeHtml(name) + '</button>';
}

function programPageRecordAction(record) {
  return '<button class="text-link" type="button" ' + (record.candidate ? 'data-start-session-for="' : 'data-open-session="') + escapeHtml(record.id) + '" aria-haspopup="dialog" aria-label="' + (record.candidate ? 'Start session' : 'Open session') + ' for ' + escapeHtml(record.person) + '">' + (record.candidate ? 'Start session' : 'Open session') + '</button>';
}

function programPageSummary(program) {
  const counts = programPageCounts(program.id);
  const scope = program.name + ' · ' + periodScopeLabel() + '. ';
  return uiKpiStrip(program.name + ' coaching summary', [
    { label: 'Identified', value: counts.total, context: scope + 'Coaching sessions automation opened in this period.', action: 'data-program-record-scope="all"' },
    { label: 'In progress', value: counts.automated + counts.one_to_one, context: scope + counts.automated + ' automated and ' + counts.one_to_one + ' one-on-one sessions in progress. Sessions needing review and completed sessions are counted separately.', action: 'data-program-record-scope="progress"' },
    { label: 'Needs review', value: counts.needs_review, context: scope + 'Sessions waiting on a person: Overdue, Repeated or Replied.', action: 'data-program-record-scope="review"' },
    { label: 'Completed', value: counts.completed, context: scope + (counts.total ? counts.completed + ' of ' + counts.total + ' identified records completed (' + Math.round(counts.completed / counts.total * 100) + '%). Includes archived completions.' : 'No identified records; completion rate unavailable.'), action: 'data-program-record-scope="completed"', meter: { value: counts.completed, max: counts.total } },
    { label: 'Automated sessions', value: counts.automatedTotal, context: scope + 'All automated sessions, including in progress, needing review and completed.', action: 'data-program-method="automated"' },
    { label: 'One-on-one sessions', value: counts.oneOnOneTotal, context: scope + 'All actual manager-started sessions, including in progress, needing review and completed.', action: 'data-program-method="manual_override"' }
  ]);
}

function programPageRecordScope(programId) {
  return programRecordScopes.get(programId) || { view: 'all', method: 'all' };
}

function programPageRecordTable(program, records) {
  const isAll = program.id === 'all';
  const scope = programPageRecordScope(program.id);
  const matchesMethod = (record, method) => method === 'all' || (!record.candidate && record.origin === method);
  const matchesView = (record, view) => view === 'all' || (view === 'review' && record.state === 'manager_attention') ||
    (view === 'progress' && record.state === 'system_handling') || (view === 'completed' && ['completed', 'archived'].includes(record.state));
  const selected = records.filter(record => matchesMethod(record, scope.method) && matchesView(record, scope.view)).sort((a, b) => {
    const priority = { manager_attention: 0, system_handling: 1, completed: 2, archived: 3 };
    return priority[a.state] - priority[b.state] || sessionWeeksAgo(a) - sessionWeeksAgo(b) || a.person.localeCompare(b.person);
  });
  const rows = selected.map(record => '<tr data-program-record="' + escapeHtml(record.id) + '"><td>' + programPageDriverName(record.person) + sessionClipBadge(record) + '</td>' + (isAll ? '<td>' + programPageLink(categories.find(item => item.id === record.categoryId)) + '</td>' : '') + '<td>' + uiStatus(compactSessionStatus(record)[1]) + '</td><td>' + escapeHtml(record.candidate ? '—' : coachLabel(record)) + '</td><td>' + escapeHtml(sessionStartedLabel(record)) + '</td><td>' + escapeHtml(sessionCompletedLabel(record)) + '</td><td>' + escapeHtml(sessionDueLabel(record)) + '</td><td>' + programPageRecordAction(record) + '</td></tr>').join('');
  return '<div class="program-section-heading"><div class="program-section-title"><h2 class="section-title" id="program-records-title">Coaching</h2><span class="sr-only" id="program-record-count" role="status">' + selected.length + ' ' + (selected.length === 1 ? 'record' : 'records') + '</span></div><div class="program-record-controls">' +
    '<label class="field"><span class="field-label">State</span><select class="filter-control" id="program-record-view">' + programRecordViews.map(([value, label]) => '<option value="' + value + '"' + (scope.view === value ? ' selected' : '') + '>' + label + ' · ' + records.filter(record => matchesView(record, value) && matchesMethod(record, scope.method)).length + '</option>').join('') + '</select></label>' +
    '<label class="field"><span class="field-label">Started by</span><select class="filter-control" id="program-record-method">' + [['all', 'All origins'], ['automated', 'Automation'], ['manual_override', 'Manager']].map(([value, label]) => '<option value="' + value + '"' + (scope.method === value ? ' selected' : '') + '>' + label + ' · ' + records.filter(record => matchesMethod(record, value) && matchesView(record, scope.view)).length + '</option>').join('') + '</select></label></div></div>' +
    (rows ? uiTable(program.name + ' coaching records', ['Driver', ...(isAll ? ['Program'] : []), 'State', 'Coach', 'Started', 'Completed', 'Due', 'Action'], rows) : '<div class="card empty-state compact"><strong>No matching coaching records</strong><span>Choose another state, origin or reporting period.</span></div>');
}

function programPageRateChart(program) {
  if (program.id === 'all') return '<section class="chart-card" id="program-rate-chart" aria-labelledby="program-comparison-title"' + (programComparisonView === 'rates' ? '' : ' hidden') + '><div id="program-rate-content"></div></section>';
  const view = programChartViews.get(program.id) || 'trend';
  return '<section class="chart-card" id="program-rate-chart" aria-labelledby="program-rate-title"><div class="program-section-heading"><h2 class="chart-title" id="program-rate-title">Event rate</h2><fieldset class="segmented" id="program-chart-view"><legend class="sr-only">Event-rate view</legend>' + [['trend', 'Trend'], ['comparison', 'Comparison']].map(([value, label]) => '<label><input type="radio" name="program-chart-view" value="' + value + '" data-program-chart-view="' + value + '" aria-controls="program-rate-content"' + (view === value ? ' checked' : '') + '><span class="segmented__option">' + label + '</span></label>').join('') + '</fieldset></div><div id="program-rate-content"></div></section>';
}

function programPageRateComparison(program, width) {
  if (program.id === 'all') return programPageAllRateComparison(width);
  const rate = rateChange(program.weeklyRates);
  const weeks = weeklyCoachingActivity;
  const beforeLabel = 'Week of ' + weeks[Math.max(0, periodWindowStart())].label;
  const afterLabel = 'Week of ' + weeks[weeks.length - 1].label;
  const summary = beforeLabel + ': ' + chartRate(rate.before) + '; ' + afterLabel + ': ' + chartRate(rate.after) + ' events per 1,000 trips. ' + chartChangeLabel(rate) + '. These are program-level prototype observations, not outcomes attributable to a video or a coached cohort. The comparison uses the last two observed weeks for This week, or the first and last weeks of a longer selected window.';
  return '<p class="chart-context">' + escapeHtml(beforeLabel + ' → ' + afterLabel) + ' · events / 1,000 trips · lower is safer</p><div class="chart-legend">' + chartLegendMarkup([{ tone: 'baseline', label: 'Before' }, { tone: 'primary', label: 'After' }]) + '</div><div class="chart-plot" id="program-rate-plot" tabindex="0" role="region" aria-label="Program event-rate comparison">' + chartBeforeAfterSvg([{ label: 'Event rate', ...rate }], width) + '</div>' + chartSummaryMarkup(summary, chartTableMarkup(program.name + ' event rates', ['Observation', 'Events / 1,000 trips'], [[beforeLabel, chartRate(rate.before)], [afterLabel, chartRate(rate.after)]]));
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
    return '<tr data-program-comparison="' + escapeHtml(program.id) + '"><td>' + programPageLink(program) + '</td>' + values.map((value, index) => '<td class="num"' + (index === values.length - 1 ? ' data-sort-value="' + rate.change + '"' : '') + '>' + escapeHtml(String(value)) + '</td>').join('') + '</tr>';
  }).join('');
  return '<div id="program-comparison-table"' + (programComparisonView === 'rates' ? ' hidden' : '') + '>' + uiTable('Program coaching and event-rate comparison', ['Program', ...['Needs review', 'In progress', 'Completed', 'Automated sessions', 'One-on-one sessions', 'Event-rate change'].map(label => ({ label, numeric: true }))], rows) + '</div>';
}

function programPageComparison() {
  return '<section id="program-comparison" aria-labelledby="program-comparison-title"><div class="program-section-heading"><div class="program-section-title"><h2 class="section-title" id="program-comparison-title">Compare programs</h2><button class="hint-trigger" type="button" aria-label="About program comparison" data-tooltip="Needs review + In progress + Completed = Identified. Automated and one-on-one are total sessions across all states. Event-rate change compares the dated endpoints in Event rates, not coaching outcomes.">' + uiIcon('info') + '</button></div><fieldset class="segmented" id="program-comparison-view"><legend class="sr-only">Program comparison view</legend>' + [['coaching', 'Coaching', 'program-comparison-table'], ['rates', 'Event rates', 'program-rate-chart']].map(([value, label, panel]) => '<label><input type="radio" name="program-comparison-view" value="' + value + '" data-program-comparison-view="' + value + '" aria-controls="' + panel + '"' + (programComparisonView === value ? ' checked' : '') + '><span class="segmented__option">' + label + '</span></label>').join('') + '</fieldset></div>' + programPageComparisonTable() + programPageRateChart(allProgramsPage) + '</section>';
}

function programPageOutcomes(program) {
  const sample = outcomeSamples[program.id];
  const sampleRow = sample ? '<tr><td class="num">' + escapeHtml(sample.eligible) + '</td><td class="num">' + escapeHtml(sample.improved) + '%</td><td class="num">' + escapeHtml(sample.repeated) + '</td></tr>' : '';
  return '<details id="program-page-outcomes"' + (programOutcomeDisclosures.has(program.id) ? ' open' : '') + '><summary id="program-page-outcomes-title">Recorded outcomes <span class="caption">· Undated sample</span></summary><div class="stack program-section-stack program-disclosure-body"><div id="program-page-outcome-sample"><p class="chart-context">Observation window unavailable · independent of reporting period</p>' +
    (sample ? uiTable(program.name + ' recorded outcome sample — observation window unavailable', [{ label: 'Eligible drivers', numeric: true }, { label: 'Improved share', numeric: true }, { label: 'Repeated', numeric: true }], sampleRow) : '<p>No outcome sample recorded for this program.</p>') + '</div><p>These recorded values stay fixed when the reporting period changes. Dated driver cohorts, program-period scores and video watch / acknowledgement records are not available.</p></div></details>';
}

function programPageOverview(program, records) {
  const coaching = '<section id="program-coaching" aria-labelledby="program-records-title">' + programPageRecordTable(program, records) + '</section>';
  return '<div class="stack">' + (program.id === 'all' ? programPageComparison() + '<details id="program-coaching-disclosure"' + (programCoachingExpanded ? ' open' : '') + '><summary>Coaching records · ' + records.length + '</summary>' + coaching + '</details>' : programPageRateChart(program) + coaching + programPageOutcomes(program)) + '</div>';
}

function programPageLessons(program) {
  return lessons.filter(lesson => program.id === 'all' || lesson.category === program.name);
}

function programPageContent(program) {
  if (typeof ProgramSetup !== 'undefined') return ProgramSetup.renderContent(program);
  const mapped = programPageLessons(program);
  const isAll = program.id === 'all';
  const rows = mapped.map(lesson => '<tr data-program-lesson="' + escapeHtml(lesson.title) + '"><td>' + escapeHtml(lesson.title) + '</td>' + (isAll ? '<td>' + programPageLink(categories.find(item => item.name === lesson.category), 'content') + '</td>' : '') + '<td>' + escapeHtml(lesson.length) + '</td><td>' + escapeHtml(lesson.version) + '</td></tr>').join('');
  return '<section class="stack program-section-stack" aria-labelledby="program-content-title"><div class="program-section-heading"><h2 class="section-title" id="program-content-title">Mapped content</h2><span class="caption">' + mapped.length + ' ' + (mapped.length === 1 ? 'lesson' : 'lessons') + '</span></div>' +
    (rows ? uiTable(program.name + ' mapped lessons', ['Lesson', ...(isAll ? ['Program'] : []), 'Format', 'Version'], rows) : '<div class="card empty-state compact"><strong>No mapped lesson in the library</strong><span>Content can be connected when this program is configured.</span></div>') +
    '<details><summary>About content records</summary><p>Lesson metadata only. Playback, watch / acknowledgement history and video-level outcomes are not connected.</p></details></section>';
}

// ---- Program configuration ---------------------------------------------------------
// A program owns its rules (one per event feed, each with a severity and a threshold), the score
// threshold that starts coaching, and where its one-on-ones go. Edits save immediately and
// persist locally; nothing here runs a scoring engine.
const coachDirectory = ['Alex Kim', 'Morgan Chen'];
const programCoachModes = [['program', 'One coach for this program'], ['group', 'A coach per group']];
let programSettings = null;
let programCreateOpen = false;
let programRuleFormOpen = false;

function programSettingFor(programId) {
  if (!programSettings) programSettings = readSavedJson('elevate-program-settings', null) || {};
  if (!programSettings[programId]) programSettings[programId] = { threshold: 75, coachMode: 'program', coach: coachDirectory[0], groupCoaches: {} };
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
  const active = eventTypeRules.filter(rule => rule.programId === program.id && rule.enabled).length;
  const lesson = lessons.find(item => item.category === program.name);
  const coach = programCoachPhrase(program);
  return 'Each period, automation scores every driver on ' + program.name + ' from ' + active + (active === 1 ? ' active rule. ' : ' active rules. ') +
    'Events inside a rule’s threshold cost nothing; each event beyond it deducts its severity. ' +
    'A driver whose score falls below ' + cfg.threshold + ' is assigned ' + (lesson ? lesson.title : 'the mapped lesson') + ' automatically, and the session waits for their reply. ' +
    'A reply becomes a one-on-one with ' + coach + '. No acknowledgement in time goes Overdue and is routed to ' + coach + '. A repeat after coaching goes to ' + coach + ' as well.';
}

function nativeSelect(attrs, options, selected) {
  return '<select class="filter-control" ' + attrs + '>' + options.map(([value, label]) => '<option value="' + escapeHtml(value) + '"' + (value === selected ? ' selected' : '') + '>' + escapeHtml(label) + '</option>').join('') + '</select>';
}

function programRuleRow(program, rule) {
  const name = escapeHtml(rule.name);
  return '<tr class="program-rule-record' + (rule.enabled ? '' : ' is-off') + '" data-program-rule="' + escapeHtml(rule.id) + '">' +
    '<td><input type="checkbox" data-program-rule-field="enabled" data-program-rule-id="' + escapeHtml(rule.id) + '"' + (rule.enabled ? ' checked' : '') + ' aria-label="' + escapeHtml((rule.enabled ? 'Disable ' : 'Enable ') + rule.name) + '"></td>' +
    '<td>' + name + '</td>' +
    '<td>' + nativeSelect('data-program-rule-field="severity" data-program-rule-id="' + escapeHtml(rule.id) + '" aria-label="' + escapeHtml('Severity for ' + rule.name) + '"', Object.entries(severityOptions), rule.severity) + '</td>' +
    '<td class="num"><input class="filter-control program-number" type="number" min="0" max="50" value="' + rule.threshold + '" data-program-rule-field="threshold" data-program-rule-id="' + escapeHtml(rule.id) + '" aria-label="' + escapeHtml('Events per period before ' + rule.name + ' counts') + '"></td>' +
    '<td><button class="icon-button row-remove" type="button" data-remove-program-rule="' + escapeHtml(rule.id) + '" aria-label="' + escapeHtml('Delete rule ' + rule.name) + '">' + uiIcon('close') + '</button></td></tr>';
}

function programRuleForm(program) {
  return '<form class="program-config-form" id="program-rule-form" aria-label="Add rule to ' + escapeHtml(program.name) + '">' +
    '<label class="field"><span>Rule</span><input class="filter-control" name="name" required maxlength="60" placeholder="e.g. Speeding over 20" autocomplete="off"></label>' +
    '<label class="field"><span>Severity</span>' + nativeSelect('name="severity"', Object.entries(severityOptions), 'Medium') + '</label>' +
    '<label class="field"><span>Threshold</span><input class="filter-control program-number" type="number" name="threshold" min="0" max="50" value="5"></label>' +
    '<div class="program-config-form-actions"><button class="button button--secondary" type="button" data-cancel-program-rule>Cancel</button><button class="button button--primary" type="submit">Add rule</button></div></form>';
}

function programConfigurationDetail(program) {
  const cfg = programSettingFor(program.id);
  const rules = eventTypeRules.filter(rule => rule.programId === program.id);
  const groups = Object.keys(groupComparisonData);
  const coachOptions = coachDirectory.map(name => [name, name]);
  const ruleRows = rules.map(rule => programRuleRow(program, rule)).join('');
  return '<div class="stack program-section-stack" id="program-configuration" data-program-configuration-detail="' + escapeHtml(program.id) + '">' +
    '<section aria-labelledby="program-flow-title"><div class="program-section-heading"><h2 class="section-title" id="program-flow-title">What happens</h2><span class="caption">Saved locally</span></div><p class="program-flow-copy" id="program-flow-copy">' + escapeHtml(programFlowCopy(program)) + '</p></section>' +
    '<section aria-labelledby="program-threshold-title"><div class="program-section-heading"><div class="program-section-title"><h2 class="section-title" id="program-threshold-title">Coaching threshold</h2><button class="hint-trigger" type="button" aria-label="About the coaching threshold" data-tooltip="Program score out of 100 for the period. Coaching starts automatically when a driver falls below it.">' + uiIcon('info') + '</button></div></div>' +
      '<label class="field program-threshold-field"><span>Coach when the period score falls below</span><span class="program-threshold-control"><input class="filter-control program-number" type="number" min="1" max="100" value="' + cfg.threshold + '" data-program-threshold="' + escapeHtml(program.id) + '"><span class="caption">/ 100</span></span></label></section>' +
    '<section aria-labelledby="program-rules-title"><div class="program-section-heading"><div class="program-section-title"><h2 class="section-title" id="program-rules-title">Rules</h2><span class="caption">' + rules.length + (rules.length === 1 ? ' rule' : ' rules') + '</span><button class="hint-trigger" type="button" aria-label="About rule thresholds" data-tooltip="Threshold is the number of events per period that cost nothing. Each event beyond it deducts the rule’s severity from the program score.">' + uiIcon('info') + '</button></div><button class="button button--secondary" type="button" data-add-program-rule aria-expanded="' + programRuleFormOpen + '">Add rule</button></div>' +
      (programRuleFormOpen ? programRuleForm(program) : '') +
      (ruleRows ? uiTable(program.name + ' rules', ['On', 'Rule', 'Severity', { label: 'Threshold', numeric: true }, 'Delete'], ruleRows) : '<div class="card empty-state compact"><strong>No rules yet</strong><span>Add a rule so automation has something to score.</span></div>') + '</section>' +
    '<section aria-labelledby="program-coach-title"><div class="program-section-heading"><div class="program-section-title"><h2 class="section-title" id="program-coach-title">One-on-one coach</h2><button class="hint-trigger" type="button" aria-label="About coach routing" data-tooltip="Overdue, Replied and Repeated cases become one-on-ones. This is who receives them.">' + uiIcon('info') + '</button></div>' +
      '<fieldset class="segmented" id="program-coach-mode"><legend class="sr-only">Coach routing</legend>' + programCoachModes.map(([value, label]) => '<label><input type="radio" name="program-coach-mode" value="' + value + '" data-program-coach-mode="' + value + '"' + (cfg.coachMode === value ? ' checked' : '') + '><span class="segmented__option">' + label + '</span></label>').join('') + '</fieldset></div>' +
      (cfg.coachMode === 'group'
        ? uiTable(program.name + ' coach by group', ['Group', 'Coach'], groups.map(group => '<tr><th scope="row">' + escapeHtml(group) + '</th><td>' + nativeSelect('data-program-group-coach="' + escapeHtml(group) + '" aria-label="' + escapeHtml('Coach for ' + group) + '"', coachOptions, cfg.groupCoaches[group] || cfg.coach) + '</td></tr>').join(''))
        : '<label class="field program-coach-field"><span>Coach</span>' + nativeSelect('data-program-coach="' + escapeHtml(program.id) + '"', coachOptions, cfg.coach) + '</label>') + '</section></div>';
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
    return '<tr data-program-configuration="' + escapeHtml(item.id) + '"><td>' + programPageLink(item, 'configuration') + '</td><td class="num">' + programSettingFor(item.id).threshold + '</td><td class="num">' + rules.length + '</td><td>' + escapeHtml(programCoachLabel(item)) + '</td><td class="num">' + programPageLessons(item).length + '</td>' +
      '<td><button class="icon-button row-remove" type="button" data-delete-program="' + escapeHtml(item.id) + '" aria-label="' + escapeHtml('Delete ' + item.name) + '">' + uiIcon('close') + '</button></td></tr>';
  }).join('');
  return '<div class="stack program-section-stack" id="program-configuration"><div class="program-section-heading"><div class="program-section-title"><h2 class="section-title">Program configuration</h2><span class="caption">' + categories.length + ' programs</span></div><button class="button button--secondary" type="button" data-add-program aria-expanded="' + programCreateOpen + '">New program</button></div>' +
    (programCreateOpen ? programCreateForm() : '') +
    uiTable('Program configuration', ['Program', { label: 'Threshold', numeric: true }, { label: 'Rules', numeric: true }, 'One-on-one coach', { label: 'Lessons', numeric: true }, 'Delete'], rows) + '</div>';
}

function rerenderProgramConfiguration(focusSelector) {
  renderProgramsPage();
  if (focusSelector) requestAnimationFrame(() => document.querySelector(focusSelector)?.focus({ preventScroll: true }));
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
    rule[key] = ruleField.type === 'checkbox' ? ruleField.checked : ruleField.type === 'number' ? Math.min(50, Math.max(0, Math.round(Number(ruleField.value)) || 0)) : ruleField.value;
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
    eventTypeRules.push({ id: 'rule-' + selectedProgramId + '-' + Date.now().toString(36), programId: selectedProgramId, name, severity: String(data.get('severity')), threshold: Math.min(50, Math.max(0, Math.round(Number(data.get('threshold'))) || 0)), videoRequired: false, path: 'lesson', enabled: true });
    saveProgramRules();
    programRuleFormOpen = false;
    rerenderProgramConfiguration('[data-add-program-rule]');
    showToast(name + ' added');
  }
});

function renderProgramRateChart() {
  const content = document.getElementById('program-rate-content');
  const program = selectedProgramId === 'all' ? allProgramsPage : categories.find(item => item.id === selectedProgramId);
  if (!content || !program || currentView !== 'programs' || content.closest('[hidden]')) return;
  const view = program.id === 'all' ? 'comparison' : programChartViews.get(program.id) || 'trend';
  const keepSummaryOpen = content.querySelector('.chart-summary')?.open;
  const focusIndex = [...content.querySelectorAll('.chart-plot [tabindex]')].indexOf(document.activeElement);
  content.dataset.chartView = view;
  content.innerHTML = view === 'comparison' ? programPageRateComparison(program, Math.max(480, content.clientWidth)) : chartCategoryWeekly(program, content.clientWidth);
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
  const records = programPageRecords(program.id);
  const isAll = program.id === 'all';
  const renderTab = { overview: programPageOverview, content: programPageContent, configuration: programPageConfiguration };
  const tab = renderTab[programTab] ? programTab : 'overview';
  const returnContext = typeof programPageReturn !== 'undefined' ? programPageReturn : null;
  programChartObserver?.disconnect();
  host.innerHTML = '<header class="page-heading"><div>' + (returnContext ? '<button class="text-link program-page-back" type="button" data-back-program-page>← ' + escapeHtml(returnContext.label) + '</button>' : '') + '<div class="program-title-line"><h1 class="page-title" id="program-title">Programs</h1>' + (returnContext?.groupScrollTop != null ? '<span class="caption">All groups</span>' : '') + '</div></div>' + (isAll ? (tab === 'configuration' ? '' : '<div class="heading-actions"><button class="button button--primary" type="button" data-open-program-setup>New program</button></div>') : '<div class="heading-actions"><button class="button button--secondary" type="button" data-manual-session aria-haspopup="dialog">Start one-on-one</button></div>') + '</header>' +
    (tab === 'overview' ? '<div class="kpi-region" id="program-page-kpis">' + programPageSummary(program) + '</div>' : '') + '<div class="data-toolbar program-page-toolbar"><div class="view-tabs" role="tablist" aria-label="Program sections">' + programPageTabs.map(([value, label]) => '<button class="view-tab' + (tab === value ? ' is-active' : '') + '" type="button" role="tab" id="program-tab-' + value + '" data-program-tab="' + value + '" aria-controls="program-page-panel" aria-selected="' + (tab === value) + '" tabindex="' + (tab === value ? '0' : '-1') + '">' + label + '</button>').join('') + '</div><div class="toolbar-actions program-page-controls"><label class="field"><span class="sr-only">Program</span><select class="filter-control" id="program-page-select">' + [allProgramsPage, ...categories].map(item => '<option value="' + escapeHtml(item.id) + '"' + (item.id === program.id ? ' selected' : '') + '>' + escapeHtml(item.name) + '</option>').join('') + '</select></label>' + (tab === 'overview' ? '<label class="field"><span class="sr-only">Period</span><select class="filter-control" id="program-page-period" data-coaching-period>' + periodOptions() + '</select></label><span class="caption" id="program-page-scope">' + escapeHtml(periodScopeLabel()) + '</span>' : '') + '</div></div>' +
    '<div id="program-page-panel" class="program-page-panel" role="tabpanel" aria-labelledby="program-tab-' + tab + '" tabindex="0">' + renderTab[tab](program, records) + '</div>';
  renderProgramRateChart();
  const content = document.getElementById('program-rate-content');
  if (content && typeof ResizeObserver !== 'undefined') {
    let size = content.clientWidth + '|' + getComputedStyle(document.documentElement).fontSize;
    programChartObserver = new ResizeObserver(() => {
      const nextSize = content.clientWidth + '|' + getComputedStyle(document.documentElement).fontSize;
      if (nextSize === size) return;
      size = nextSize;
      renderProgramRateChart();
    });
    programChartObserver.observe(content);
  }
}

function updateProgramRecordScope(updates, focusId) {
  const previous = programPageRecordScope(selectedProgramId);
  programRecordScopes.set(selectedProgramId, { ...previous, ...updates });
  if (selectedProgramId === 'all') programCoachingExpanded = true;
  if (programTab !== 'overview') openProgramPage(selectedProgramId, 'overview');
  else renderProgramsPage();
  updateUrlState();
  requestAnimationFrame(() => {
    const target = document.getElementById(focusId || 'program-record-view');
    target?.focus({ preventScroll: Boolean(focusId) });
  });
}

document.addEventListener('click', event => {
  const comparison = event.target.closest('#program-comparison-table [data-program-comparison]');
  if (comparison && !event.target.closest('button, a, input, select')) {
    openProgramPage(comparison.dataset.programComparison);
    return;
  }
  const tab = event.target.closest('#view-programs [data-program-tab]');
  if (tab) {
    const value = tab.dataset.programTab;
    openProgramPage(selectedProgramId, value);
    requestAnimationFrame(() => document.getElementById('program-tab-' + value)?.focus({ preventScroll: true }));
    return;
  }
  const scope = event.target.closest('#view-programs [data-program-record-scope]');
  if (scope) updateProgramRecordScope({ view: scope.dataset.programRecordScope, method: 'all' });
  const method = event.target.closest('#view-programs [data-program-method]');
  if (method) updateProgramRecordScope({ view: 'all', method: method.dataset.programMethod });
});

document.addEventListener('toggle', event => {
  if (event.target.id === 'program-coaching-disclosure' && event.target.isConnected) programCoachingExpanded = event.target.open;
  if (event.target.id === 'program-page-outcomes' && event.target.isConnected) {
    if (event.target.open) programOutcomeDisclosures.add(selectedProgramId);
    else programOutcomeDisclosures.delete(selectedProgramId);
  }
}, true);

document.addEventListener('change', event => {
  if (event.target.matches('[data-program-comparison-view]')) setProgramComparisonView(event.target.value);
  if (event.target.matches('[data-program-chart-view]')) {
    programChartViews.set(selectedProgramId, event.target.value);
    renderProgramRateChart();
  }
  if (event.target.id === 'program-page-period') requestAnimationFrame(() => document.getElementById('program-page-period')?.focus({ preventScroll: true }));
  if (event.target.id === 'program-page-select') {
    openProgramPage(event.target.value, programTab);
    requestAnimationFrame(() => document.getElementById('program-page-select')?.focus({ preventScroll: true }));
  }
  if (event.target.id === 'program-record-view') updateProgramRecordScope({ view: event.target.value }, 'program-record-view');
  if (event.target.id === 'program-record-method') updateProgramRecordScope({ method: event.target.value }, 'program-record-method');
});
