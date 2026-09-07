/* Program quick view: source-led coaching review, with the parent workspace kept in place. */
let programQuickChartObserver = null;

function programQuickChartWidth() {
  const tokens = getComputedStyle(document.documentElement);
  const drawerWidth = parseFloat(tokens.getPropertyValue('--drawer-width')) || 1060;
  const gutter = window.innerWidth <= 680 ? 0 : parseFloat(tokens.getPropertyValue('--drawer-gutter')) || 84;
  const spacing = tokens.getPropertyValue('--space-5').trim();
  const padding = (parseFloat(spacing) || 20) * (spacing.endsWith('rem') ? parseFloat(tokens.fontSize) : 1);
  return Math.max(480, Math.min(drawerWidth, window.innerWidth - gutter) - padding * 4 - 4);
}

function observeProgramQuickView() {
  programQuickChartObserver?.disconnect();
  const body = document.querySelector('.program-quick-body');
  if (!body || typeof ResizeObserver === 'undefined') return;
  let previousSize = '';
  const refresh = () => {
    if (!body.isConnected || !activeCategory || !body.getClientRects().length) return;
    const trendPlot = body.querySelector('#program-quick-trend .chart-plot');
    const comparisonPlot = body.querySelector('#program-quick-outcomes .chart-plot');
    const nextSize = [trendPlot?.clientWidth, comparisonPlot?.clientWidth, getComputedStyle(document.documentElement).fontSize].join('|');
    if (nextSize === previousSize) return;
    previousSize = nextSize;
    const replaceSvg = (plot, markup) => {
      if (!plot) return;
      const previous = plot.querySelector('svg');
      const focused = previous?.contains(document.activeElement) ? document.activeElement : null;
      const focusIndex = focused ? [...previous.querySelectorAll('[tabindex]')].indexOf(focused) : -1;
      const template = document.createElement('template');
      template.innerHTML = markup;
      const svg = template.content.querySelector('.category-weekly-chart, .before-after-chart');
      if (!previous || !svg) return;
      previous.replaceWith(svg);
      if (focusIndex >= 0) svg.querySelectorAll('[tabindex]')[focusIndex]?.focus({ preventScroll: true });
    };
    replaceSvg(trendPlot, chartCategoryWeekly(activeCategory, trendPlot?.clientWidth));
    if (comparisonPlot) replaceSvg(comparisonPlot, chartBeforeAfterSvg([{ label: 'Event rate', ...rateChange(activeCategory.weeklyRates) }], comparisonPlot.clientWidth));
  };
  programQuickChartObserver = new ResizeObserver(refresh);
  programQuickChartObserver.observe(body);
  refresh();
}

function programQuickRecordLink(record, label) {
  const action = record.candidate ? 'data-start-session-for' : 'data-open-session';
  return '<button class="text-link" type="button" ' + action + '="' + escapeHtml(record.id) + '" aria-haspopup="dialog" aria-label="' + (record.candidate ? 'Start session' : 'Open session') + ' for ' + escapeHtml(record.person) + '">' + escapeHtml(label) + '</button>';
}

function programQuickRecords(category, tab) {
  const records = sessionsInPeriod(record => record.categoryId === category.id && (tab === 'all' || sessionTab(record) === tab));
  const priority = { manager_attention: 0, system_handling: 1, completed: 2, archived: 3 };
  records.sort((a, b) => priority[a.state] - priority[b.state] || sessionWeeksAgo(a) - sessionWeeksAgo(b) || a.person.localeCompare(b.person));
  if (!records.length) return '<div class="empty-state compact"><strong>No coaching records in this stage</strong><span>Choose another stage or reporting period.</span></div>';
  const rows = records.map(record => '<tr data-program-drawer-record="' + escapeHtml(record.id) + '"><td>' + programQuickRecordLink(record, record.person) + sessionClipBadge(record) + '</td><td>' + uiStatus(compactSessionStatus(record)[1]) + '</td><td>' + escapeHtml(record.candidate ? '—' : coachLabel(record)) + '</td><td>' + escapeHtml(sessionStartedLabel(record)) + '</td><td>' + escapeHtml(sessionCompletedLabel(record)) + '</td><td>' + escapeHtml(sessionDueLabel(record)) + '</td><td>' + programQuickRecordLink(record, record.candidate ? 'Start session' : 'Open session') + '</td></tr>').join('');
  return uiTable(category.name + ' coaching records', ['Driver', 'State', 'Coach', 'Started', 'Completed', 'Due', 'Action'], rows);
}

function programQuickOutcomes(category, counts) {
  const rate = rateChange(category.weeklyRates);
  const beforeLabel = 'Week of ' + weeklyCoachingActivity[Math.max(0, periodWindowStart())].label;
  const afterLabel = 'Week of ' + weeklyCoachingActivity.at(-1).label;
  const summary = beforeLabel + ': ' + chartRate(rate.before) + '; ' + afterLabel + ': ' + chartRate(rate.after) + ' events per 1,000 trips. ' + chartChangeLabel(rate) + '. These are program-level prototype observations. The difference is not attributed to a coaching session or video.';
  const completion = counts.total ? Math.round(counts.completed / counts.total * 100) : null;
  const sample = outcomeSamples[category.id];
  const sampleRow = sample ? '<tr><td class="num">' + escapeHtml(sample.eligible) + '</td><td class="num">' + escapeHtml(sample.improved) + '%</td><td class="num">' + escapeHtml(sample.repeated) + '</td></tr>' : '';
  return '<div class="stack" id="program-quick-outcomes"><section class="chart-card" aria-labelledby="program-quick-comparison-title"><h3 class="chart-title" id="program-quick-comparison-title">Recorded event rates</h3><p class="chart-context">' + escapeHtml(beforeLabel + ' → ' + afterLabel) + ' · events / 1,000 trips · lower is safer</p><div class="chart-legend">' + chartLegendMarkup([{ tone: 'baseline', label: 'Before' }, { tone: 'primary', label: 'After' }]) + '</div><div class="chart-plot" tabindex="0" role="region" aria-label="' + escapeHtml(category.name) + ' before and after event rates">' + chartBeforeAfterSvg([{ label: 'Event rate', ...rate }], programQuickChartWidth()) + '</div>' + chartSummaryMarkup(summary, chartTableMarkup(category.name + ' reporting-period event rates', ['Observation', 'Events / 1,000 trips'], [[beforeLabel, chartRate(rate.before)], [afterLabel, chartRate(rate.after)]])) + '</section>' +
    '<section aria-labelledby="program-quick-completion-title"><h3 class="section-title" id="program-quick-completion-title">Completion</h3><p id="program-quick-completion">' + (completion === null ? 'No coaching records in this reporting period.' : '<strong>' + counts.completed + ' of ' + counts.total + '</strong> identified records completed · ' + completion + '%') + '</p></section>' +
    '<section id="program-quick-outcome-sample" aria-labelledby="program-quick-sample-title"><h3 class="section-title" id="program-quick-sample-title">Recorded outcome sample</h3><p class="chart-context">Observation window unavailable · independent of the reporting period</p>' + (sample ? uiTable(category.name + ' recorded outcome sample — observation window unavailable', [{ label: 'Eligible drivers', numeric: true }, { label: 'Improved share', numeric: true }, { label: 'Repeated', numeric: true }], sampleRow) : '<p>No outcome sample recorded for this program.</p>') + '<details><summary>About this sample</summary><p>These retained prototype sample facts have no dated driver cohort or linked video follow-up records. They stay fixed when the reporting period changes.</p></details></section></div>';
}

function renderProgramQuickView(category) {
  const counts = coachingCounts(record => record.categoryId === category.id);
  const tabs = [['all', 'All records', counts.total], ['needs', 'Needs review', counts.needs_review], ['automated', 'Automated active', counts.automated], ['one_to_one', 'One-on-one active', counts.one_to_one], ['completed', 'Completed', counts.completed], ['outcomes', 'Outcomes', null]];
  const tab = tabs.some(([key]) => key === workflowTab) ? workflowTab : counts.needs_review ? 'needs' : 'all';
  const parentGroup = typeof programDrawerParent !== 'undefined' ? programDrawerParent?.groupName : null;
  const context = category.name + ' · ' + (parentGroup ? 'All groups · ' : '') + periodScopeLabel() + '. ';
  const reviewParts = [counts.sessionReviews ? counts.sessionReviews + (counts.sessionReviews === 1 ? ' session needs review' : ' sessions need review') : '', counts.pendingSessionReviews ? counts.pendingSessionReviews + (counts.pendingSessionReviews === 1 ? ' driver needs a session' : ' drivers need a session') : ''].filter(Boolean);
  const nextAction = reviewParts.length ? reviewParts.join(' · ') : counts.total ? 'No open reviews. ' + (counts.automated + counts.one_to_one) + ' in progress · ' + counts.completed + ' completed.' : 'No coaching records in this reporting period.';
  return '<header class="drawer__header program-quick-header"><div class="program-quick-identity">' + (parentGroup ? '<button class="text-link" type="button" data-back-program-group>← ' + escapeHtml(parentGroup) + '</button>' : '') + '<div class="program-title-line"><h2 class="drawer__title" id="category-title">' + escapeHtml(category.name) + '</h2>' + (parentGroup ? '<span class="caption">All groups</span>' : '') + '</div></div><div class="program-quick-header-actions"><label class="field"><span class="field-label">Period</span><select class="filter-control" id="category-period" data-coaching-period>' + periodOptions() + '</select></label><button class="button button--secondary" type="button" data-manual-session>Start one-on-one</button><button class="text-link" type="button" data-open-program-page="' + escapeHtml(category.id) + '">Open program page</button></div><button class="icon-button" type="button" data-close-category aria-label="Close program">' + uiIcon('close') + '</button></header>' +
    '<div class="category-panel-scroll drawer__body stack program-quick-body"><div id="program-quick-kpis">' + uiKpiStrip(category.name + ' coaching summary', [
      { label: 'Identified', value: counts.total, context: context + 'Coaching sessions automation opened in this period.', action: 'data-workflow-tab="all"' },
      { label: 'Automated in progress', value: counts.automated, context: context + 'Active automated sessions only. Reviews and completions are counted separately.', action: 'data-workflow-tab="automated"' },
      { label: 'One-on-one in progress', value: counts.one_to_one, context: context + 'Active manager-started sessions only. Reviews and completions are counted separately.', action: 'data-workflow-tab="one_to_one"' },
      { label: 'Needs review', value: counts.needs_review, context: context + 'Sessions waiting on a person: Overdue, Repeated or Replied.', action: 'data-workflow-tab="needs"' },
      { label: 'Completed', value: counts.completed, context: context + 'Completed and archived sessions recorded within this reporting window.', action: 'data-workflow-tab="completed"' }
    ]) + '</div><section class="program-quick-next" aria-label="Next action"><p>' + escapeHtml(nextAction) + '</p>' + (counts.needs_review ? '<button class="button button--secondary" type="button" data-workflow-tab="needs">Review ' + counts.needs_review + '</button>' : '') + '</section>' +
    '<section class="chart-card" id="program-quick-trend" aria-labelledby="program-quick-trend-title"><h3 class="chart-title" id="program-quick-trend-title">Weekly event rate</h3>' + chartCategoryWeekly(category, programQuickChartWidth()) + '</section>' +
    '<section class="program-quick-work" id="coaching-work" aria-label="Program coaching"><div class="view-tabs" role="tablist" aria-label="Program coaching stage">' + tabs.map(([value, label, count]) => '<button class="view-tab' + (tab === value ? ' is-active' : '') + '" type="button" role="tab" id="program-quick-tab-' + value + '" data-workflow-tab="' + value + '" aria-selected="' + (tab === value) + '" aria-controls="program-quick-panel" tabindex="' + (tab === value ? '0' : '-1') + '">' + label + (count === null ? '' : ' <span>' + count + '</span>') + '</button>').join('') + '</div><div id="program-quick-panel" role="tabpanel" aria-labelledby="program-quick-tab-' + tab + '" tabindex="0">' + (tab === 'outcomes' ? programQuickOutcomes(category, counts) : programQuickRecords(category, tab)) + '</div></section></div>';
}
