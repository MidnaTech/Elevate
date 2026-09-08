/*
 * Programme Activity is a view of the existing session ledger, not another ledger.
 * The first seven observations below are explicitly illustrative sample history.
 * Their coaching counts reconcile to the seven existing fleet weekly snapshots;
 * programme scores are independent samples, not a computed fleet-score roll-up.
 * The eighth observation always reads this week's ledger and recorded score.
 */
const programActivitySampleHistory = Object.freeze({
  following: { automated: [1, 1, 1, 1, 1, 1, 2], oneToOne: [0, 0, 0, 0, 0, 0, 0], score: [62, 63, 64, 64, 65, 66, 67] },
  speeding: { automated: [1, 1, 1, 2, 1, 1, 1], oneToOne: [1, 1, 0, 1, 0, 0, 1], score: [65, 66, 66, 67, 68, 69, 70] },
  braking: { automated: [1, 1, 1, 1, 1, 1, 1], oneToOne: [0, 0, 1, 0, 0, 0, 0], score: [69, 70, 71, 72, 73, 74, 75] },
  distraction: { automated: [1, 1, 0, 1, 1, 0, 1], oneToOne: [0, 0, 0, 0, 1, 0, 0], score: [65, 64, 64, 65, 64, 65, 66] },
  seatbelt: { automated: [1, 1, 1, 1, 1, 1, 1], oneToOne: [0, 0, 0, 0, 0, 0, 0], score: [72, 73, 74, 75, 76, 77, 78] },
  acceleration: { automated: [0, 1, 0, 1, 0, 0, 1], oneToOne: [0, 0, 0, 0, 0, 0, 0], score: [75, 76, 77, 78, 78, 79, 80] },
  cornering: { automated: [0, 0, 1, 0, 1, 0, 0], oneToOne: [0, 0, 0, 0, 0, 0, 0], score: [77, 78, 78, 79, 80, 81, 82] },
  traffic: { automated: [0, 0, 0, 0, 0, 1, 0], oneToOne: [0, 0, 0, 0, 0, 1, 0], score: [71, 72, 73, 74, 75, 75, 76] },
  fatigue: { automated: [0, 0, 0, 0, 0, 0, 1], oneToOne: [0, 0, 0, 0, 0, 0, 0], score: [64, 65, 65, 66, 67, 68, 69] }
});

function programActivityWeeks(program) {
  const isAll = program.id === 'all';
  const history = programActivitySampleHistory[program.id];
  const latest = currentCycleCounts(1, program.id);
  const current = {
    label: weeklyCoachingActivity.at(-1).label,
    automated: latest.automatedInProgress,
    oneToOne: latest.oneOnOneInProgress,
    score: isAll ? fleetSafetyScore.score : programScore(program),
    source: 'Current ledger counts · recorded prototype score',
    countSource: 'Current This week session ledger',
    scoreSource: 'Recorded prototype score',
    current: true
  };
  if (!isAll && !history) return [current];
  const earlier = weeklyCoachingActivity.slice(0, -1).map((week, index) => ({
    label: week.label,
    automated: isAll ? week.automated : history.automated[index],
    oneToOne: isAll ? week.oneToOne : history.oneToOne[index],
    score: isAll ? week.score : history.score[index],
    source: 'Sample history',
    countSource: 'Sample history',
    scoreSource: 'Sample history',
    current: false
  }));
  const span = coachingPeriod === 4 ? 4 : 8;
  return [...earlier, current].slice(-span);
}

function programActivityAttentionRecords(program) {
  const reasons = { reminders_exhausted: 0, repeat_after_coaching: 1, driver_reply: 2 };
  return allSessionRecords()
    .filter(session => !session.candidate && session.state === 'manager_attention' &&
      Object.hasOwn(reasons, session.attentionReason) && sessionWithinPeriod(session, coachingPeriod) &&
      (program.id === 'all' || session.categoryId === program.id))
    .sort((a, b) => reasons[a.attentionReason] - reasons[b.attentionReason] ||
      a.person.localeCompare(b.person) || a.id.localeCompare(b.id));
}

function programActivityAttention(program) {
  const records = programActivityAttentionRecords(program);
  const people = new Set(records.map(session => session.person)).size;
  const rows = records.map(session => {
    const profile = directory.some(driver => driver.name === session.person);
    const name = profile ? '<button class="text-link" type="button" data-open-driver-profile="' + escapeHtml(session.person) + '" aria-haspopup="dialog" aria-label="Open driver profile for ' + escapeHtml(session.person) + '">' + escapeHtml(session.person) + '</button>' : '<strong>' + escapeHtml(session.person) + '</strong>';
    const status = { reminders_exhausted: 'Overdue', repeat_after_coaching: 'Repeated', driver_reply: 'Replied' }[session.attentionReason];
    return '<li class="program-attention-item" data-program-record="' + escapeHtml(session.id) + '" data-program-attention-record="' + escapeHtml(session.id) + '"><div class="program-attention-person">' + name + uiStatus(status) + '</div><div class="program-attention-action"><span class="caption">' + escapeHtml(session.category) + '</span><button class="text-link" type="button" data-open-session="' + escapeHtml(session.id) + '" aria-haspopup="dialog" aria-label="Open ' + escapeHtml(session.category) + ' session for ' + escapeHtml(session.person) + '">Open session' + uiIcon('chevron') + '</button></div></li>';
  }).join('');
  return '<section class="program-activity-attention" id="program-activity-attention" aria-labelledby="program-activity-attention-title" data-attention-session-count="' + records.length + '" data-attention-driver-count="' + people + '"><header class="program-attention-heading"><h2 class="section-title" id="program-activity-attention-title" tabindex="-1">Drivers needing attention</h2><span class="caption">' + people + (people === 1 ? ' driver' : ' drivers') + (people === records.length ? '' : ' · ' + records.length + ' sessions') + '</span></header><div class="program-attention-scroll" tabindex="0" role="region" aria-label="Drivers needing attention, scroll to see all sessions">' + (rows ? '<ul class="program-attention-list">' + rows + '</ul>' : '<p class="caption">No sessions need attention in this period.</p>') + '</div>' + (records.length ? '<footer class="program-attention-footer"><button class="text-link" type="button" data-view-link="inbox" data-inbox-filter="manager_attention" data-inbox-program="' + escapeHtml(program.id) + '">View all in Sessions' + uiIcon('chevron') + '</button></footer>' : '') + '</section>';
}

function programActivityMarkup(program) {
  const weeks = programActivityWeeks(program);
  const hasHistory = weeks.length > 1;
  const context = hasHistory ? weeks[0].label + '–' + weeks.at(-1).label + ' · ' + weeks.length + '-week' + (coachingPeriod === 1 ? ' context' : ' history') + ' · Sample history' : 'Sample history unavailable';
  const scoreLabel = (program.id === 'all' ? 'Elevate' : program.name) + ' score / 100';
  const legend = [{ tone: 'primary', label: 'Automated in progress' }, { tone: 'secondary', label: 'One-on-one in progress' }];
  if (weeks.some(week => Number.isFinite(week.score))) legend.push({ kind: 'score', label: scoreLabel });
  const scoreDefinition = program.id === 'all'
    ? 'The fleet score is the independently recorded prototype series, not an average of programme scores.'
    : 'Programme scores are illustrative observations ending at the recorded prototype score, not an evaluation of configured rules. No score is plotted when unavailable.';
  const summary = 'Bars count sessions in progress at each weekly snapshot; they exclude Overdue, Repeated, Replied and Completed. Earlier coaching counts and scores are illustrative sample history. Only the latest coaching counts read the existing This week session ledger; they do not accumulate when a longer reporting period is selected. ' +
    (coachingPeriod === 1 ? 'This week retains eight weeks of chart context; the attention list and page totals still use This week. ' : '') +
    scoreDefinition + ' Scores use a fixed 0–100 scale, with higher safer. Score sample sizes and update dates are unavailable.';
  const data = chartTableMarkup(program.name + ' weekly activity · sample history and latest ledger counts', ['Week / source', 'Automated in progress', 'One-on-one in progress', scoreLabel], weeks.map(week => [week.label + ' · ' + week.source, week.automated, week.oneToOne, Number.isFinite(week.score) ? week.score : 'Unavailable']));
  return '<section class="chart-card program-activity-chart" id="program-activity-chart" aria-labelledby="program-activity-title"><h2 class="chart-title" id="program-activity-title">Weekly coaching</h2><p class="chart-context" id="program-activity-context">' + escapeHtml(context) + '</p>' +
    (hasHistory ? '<div class="chart-legend">' + chartLegendMarkup(legend) + '</div>' : '') +
    '<div class="chart-plot" id="program-activity-plot" tabindex="0" role="region" aria-label="' + escapeHtml(program.name + ' weekly coaching and score · sample history') + '" aria-describedby="program-activity-context">' + (hasHistory ? '' : '<p class="caption">No sample history for this programme yet. The data summary includes its current coaching counts.</p>') + '</div>' +
    chartSummaryMarkup(summary, data) + '</section>' + programActivityAttention(program);
}

function programActivityRenderChart(program) {
  const plot = document.getElementById('program-activity-plot');
  if (!plot) return;
  const weeks = programActivityWeeks(program);
  if (weeks.length < 2) return;
  const focusedMark = [...plot.querySelectorAll('[tabindex]')].indexOf(document.activeElement);
  const scoreName = (program.id === 'all' ? 'Elevate' : program.name) + ' score';
  plot.innerHTML = chartWeeklyActivitySvg(weeks, plot.clientWidth, 300, {
    idPrefix: 'program-activity-svg',
    scoreName,
    title: program.name + ' weekly coaching and score · sample history',
    description: 'Sample history. In-progress sessions use the left axis from zero; scores use the right axis from 0 to 100. The latest coaching counts come from the This week session ledger. ' + weeks.map(week => week.label + ': ' + week.automated + ' automated, ' + week.oneToOne + ' one-on-one, ' + scoreName.toLowerCase() + ' ' + (Number.isFinite(week.score) ? week.score + ' of 100' : 'unavailable') + '. ' + week.source).join('; ') + '.'
  });
  if (focusedMark >= 0) plot.querySelectorAll('[tabindex]')[focusedMark]?.focus({ preventScroll: true });
}

function programActivityOutcomes(program) {
  const programmes = program.id === 'all' ? categories : [program];
  const samples = programmes.filter(item => outcomeSamples[item.id]);
  const rows = samples.map(item => {
    const sample = outcomeSamples[item.id];
    return '<tr data-program-outcome-sample="' + escapeHtml(item.id) + '">' +
      (program.id === 'all' ? '<td>' + escapeHtml(item.name) + '</td>' : '') +
      '<td class="num">' + sample.eligible + '</td><td class="num">' + sample.improved + '%</td><td class="num">' + sample.repeated + '</td></tr>';
  }).join('');
  const driverRows = outcomeDetailViews.driver.rows.filter(row => program.id === 'all' || row[1] === program.name).map(row => {
    const profile = directory.some(driver => driver.name === row[0]);
    const name = profile ? '<button class="text-link" type="button" data-open-driver-profile="' + escapeHtml(row[0]) + '" aria-haspopup="dialog" aria-controls="driver-drawer">' + escapeHtml(row[0]) + '</button>' : escapeHtml(row[0]);
    const change = Number(row[4].replace('−', '-').replace('%', ''));
    return '<tr data-program-driver-outcome="' + escapeHtml(row[0]) + '"><td>' + name + '</td>' +
      (program.id === 'all' ? '<td>' + escapeHtml(row[1]) + '</td>' : '') +
      '<td class="num">' + escapeHtml(row[2]) + '</td><td class="num">' + escapeHtml(row[3]) + '</td><td class="num" data-sort-value="' + change + '">' + escapeHtml(row[4]) + '</td><td class="num">' + row[5] + '%</td></tr>';
  }).join('');
  const driverSample = driverRows ? '<section class="stack program-section-stack" aria-labelledby="program-driver-outcomes-title"><h3 class="section-title" id="program-driver-outcomes-title">Driver observations</h3><p class="caption">Undated sample · events / 1,000 trips</p>' +
    uiTable(program.name + ' driver outcome observations · undated sample', ['Driver', ...(program.id === 'all' ? ['Programme'] : []), ...['Before', 'After', 'Change', 'Recorded completion'].map(label => ({ label, numeric: true }))], driverRows) +
    '<p class="caption">These are separate recorded driver observations. Before / after dates, trip exposure and the completion denominator are unavailable. Recorded completion is not the selected period’s session completion rate.</p></section>' : '';
  const open = typeof programOutcomeDisclosures !== 'undefined' && programOutcomeDisclosures.has(program.id);
  return '<details class="program-outcomes-disclosure" id="program-page-outcomes" data-program-outcomes="' + escapeHtml(program.id) + '"' + (open ? ' open' : '') + '><summary id="program-page-outcomes-title">Recorded outcomes <span class="caption">· Undated sample</span></summary><div class="program-outcomes-content program-disclosure-body stack program-section-stack">' +
    (rows ? '<div id="program-page-outcome-sample">' + uiTable(program.name + ' recorded outcomes · undated sample', [...(program.id === 'all' ? ['Programme'] : []), ...['Eligible drivers', 'Improved share', 'Repeated drivers'].map(label => ({ label, numeric: true }))], rows) + '</div>' : '<p class="caption">No recorded outcome sample for this programme.</p>') +
    '<p class="caption">These separate prototype samples have no recorded cohort dates. They stay unchanged when the reporting period changes. Improved share is a reported percentage, not a reconstructable count of drivers; repeated drivers are the recorded sample count.</p><p class="caption">Programme samples may include the same drivers, so they are not added into a fleet total. Exposure, eligibility rules and the improvement definition are unavailable; these samples do not establish that coaching or a specific video caused an improvement.</p>' + driverSample + '</div></details>';
}
