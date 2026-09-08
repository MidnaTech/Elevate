/* Compact fleet context. Quantities and data colours are independent of action colours. */
function overviewSparkline(values, { label = 'Trend', domain } = {}) {
  const points = values.map(Number);
  if (!points.length || points.some(value => !Number.isFinite(value))) return '';
  const low = domain ? domain[0] : 0;
  const high = domain ? domain[1] : chartScaleCeiling(Math.max(1, ...points) * 1.05);
  const coords = pointsPath(points, 180, 52, 5, 5, 5, 5, low, high);
  const last = coords.at(-1);
  return '<svg class="overview-sparkline" viewBox="0 0 180 52" role="img" aria-label="' + escapeHtml(label + ' Scale ' + low + ' to ' + high + '.') + '"><path class="chart-line" d="' + linePath(coords) + '"/><circle class="chart-line-marker" cx="' + last.x.toFixed(1) + '" cy="' + last.y.toFixed(1) + '" r="3"/></svg>';
}

function renderSessionOverview() {
  if (typeof renderDesignLibraryKpis === 'function') renderDesignLibraryKpis();
}

function renderDriverCoachingOverview() {
  if (typeof renderDesignLibraryKpis === 'function') renderDesignLibraryKpis();
  const panel = document.querySelector('.overview-driver-coaching');
  const list = document.getElementById('driver-improvement-list');
  if (!panel || !list) return;
  const candidates = directory.filter(driver => Number.isFinite(driver.safetyScore) && Number.isFinite(driver.scoreChange));
  const best = candidates.filter(driver => driver.scoreChange > 0).sort((a, b) => b.scoreChange - a.scoreChange || a.name.localeCompare(b.name)).slice(0, 5);
  const help = document.getElementById('driver-improvement-help');
  if (help) help.dataset.tooltip = 'The five largest recorded Elevate-score increases among the ' + directory.length + ' drivers in this directory. Comparison dates are unavailable; higher is safer.';
  const empty = document.getElementById('driver-improvement-empty');
  if (empty) empty.hidden = Boolean(best.length);
  const maxGain = Math.max(1, ...best.map(driver => driver.scoreChange));
  const ordinal = ['largest', 'second largest', 'third largest', 'fourth largest', 'fifth largest'];
  list.innerHTML = best.map((driver, index) => {
    const previous = driver.safetyScore - driver.scoreChange;
    const label = 'View ' + driver.name + ', ' + ordinal[index] + ' recorded improvement among ' + directory.length + ' directory drivers: up ' + driver.scoreChange + ' points, from ' + previous + ' to ' + driver.safetyScore + '.';
    return '<button class="overview-driver-winner"' + (index === 0 ? ' id="driver-improvement"' : '') + ' type="button" data-overview-driver="' + escapeHtml(driver.name) + '" aria-label="' + escapeHtml(label) + '" style="--share:' + (driver.scoreChange / maxGain) + '"><span class="person-avatar" aria-hidden="true">' + escapeHtml(driver.initials) + '</span><span class="overview-driver-name"><strong>' + escapeHtml(driver.name) + '</strong><span class="overview-scope">' + previous + ' → ' + driver.safetyScore + '</span></span><span class="overview-driver-bar" aria-hidden="true"><i></i></span><strong class="overview-driver-gain">+' + driver.scoreChange + ' pts</strong>' + uiIcon('chevron') + '</button>';
  }).join('');
}

function renderSafetyChartDetails() {
  const mix = document.getElementById('driver-safety-mix');
  const legend = document.getElementById('driver-tier-totals');
  const scope = document.getElementById('driver-safety-scope');
  if (!mix || !legend || !scope) return;
  const card = mix.closest('.overview-panel');
  card.classList.add('chart-card');
  card.querySelector('h2')?.classList.add('chart-title');
  scope.classList.add('chart-context');
  scope.textContent = 'Fleet snapshot · date unavailable';
  if (!mix.parentElement.classList.contains('chart-plot')) {
    const plot = document.createElement('div'); plot.className = 'chart-plot'; mix.before(plot); plot.append(mix);
  }
  legend.classList.add('chart-legend');
  if (legend.nextElementSibling !== mix.parentElement) mix.parentElement.before(legend);
  const keys = ['risk', 'watch', 'safe', 'unscored'];
  keys.forEach((key, index) => card.querySelectorAll('[data-driver-score-filter="' + key + '"]').forEach(button => { button.dataset.chartSeries = ['primary', 'secondary', 'tertiary', 'quaternary'][index]; }));
  const tiers = keys.map(key => driverTierCounts.find(tier => tier.key === key));
  const summary = tiers.map(tier => tier.label + ': ' + tier.count + ' drivers').join('; ') + '. Tier selection filters the representative 14-driver directory, not these fleet totals.';
  chartMountSummary(card, summary, chartTableMarkup('Fleet Elevate-score distribution', ['Score band', 'Fleet drivers'], driverDistributionBins.map(bin => [bin.label, bin.count])), 'Source: 1,024-driver prototype fleet distribution, including 65 unscored drivers. Update time and score coverage dates are unavailable. Directory filtering does not recalculate fleet totals.');
}

function renderGroupChartOverview() {
  if (typeof renderDesignLibraryKpis === 'function') renderDesignLibraryKpis();
  const overview = document.getElementById('groups-overview');
  if (!overview) return;
  const groups = Object.entries(groupComparisonData);
  if (!groups.length) { overview.innerHTML = '<p>No group observations recorded.</p>'; return; }
  const scopedProgram = typeof groupsProgramId !== 'undefined' && groupsProgramId !== 'all' ? categories.find(program => program.id === groupsProgramId) : null;
  const filter = document.getElementById('groups-program-filter');
  if (filter) {
    if (filter.options.length !== categories.length + 1) filter.innerHTML = '<option value="all">All programs</option>' + categories.map(program => '<option value="' + escapeHtml(program.id) + '">' + escapeHtml(program.name) + '</option>').join('');
    filter.value = scopedProgram ? scopedProgram.id : 'all';
  }
  const started = Object.fromEntries(groups.map(([name]) => [name, coachingCounts(session => !session.candidate && sessionDeliveryMode(session) === 'automated' && (!scopedProgram || session.categoryId === scopedProgram.id) && groupForPerson(session.person) === name).total]));
  const ordered = groups.slice().sort((a, b) => started[b[0]] - started[a[0]] || a[0].localeCompare(b[0]));
  const max = Math.max(1, ...Object.values(started));
  const summary = ordered.map(([name]) => name + ': ' + started[name] + ' automated sessions').join('; ') + (scopedProgram ? ' Scoped to ' + scopedProgram.name + '.' : '.') + ' Counts describe sessions, not unique drivers.';
  const workload = '<article class="chart-card overview-panel overview-workload-panel" aria-labelledby="group-workload-title"><h2 class="chart-title" id="group-workload-title">Coaching by group</h2><p class="chart-context" id="group-workload-scope">Sessions' + (scopedProgram ? ' · ' + escapeHtml(scopedProgram.name) : '') + '</p><div class="chart-legend">' + chartLegendMarkup([{ tone: 'primary', label: 'Automated' }]) + '</div><div class="chart-plot overview-workload" id="group-coaching-workload" role="group" aria-label="Automated sessions by group">' + ordered.slice(0, 4).map(([name]) => '<button class="overview-workload-row" type="button" data-open-group="' + escapeHtml(name) + '" aria-label="' + escapeHtml('Open ' + name + ': ' + started[name] + ' automated sessions') + '"><span>' + escapeHtml(name) + '</span><span class="overview-bar-track" aria-hidden="true"><i style="width:' + (started[name] / max * 100) + '%"></i></span><strong>' + started[name] + '</strong></button>').join('') + '</div><p class="chart-footnote">Source: prototype session ledger in the selected period. One-on-one sessions and pending flags excluded; update time unavailable.</p>' + chartSummaryMarkup(summary, chartTableMarkup('Automated coaching workload', ['Group', 'Sessions'], ordered.map(([name]) => [name, started[name]]))) + '</article>';
  const best = groups.slice().sort((a, b) => a[1].change - b[1].change)[0];
  const adverse = groups.filter(([, group]) => group.change > 0).sort((a, b) => b[1].change - a[1].change)[0];
  const trend = ([name, group], label) => {
    const rates = group.weeklyRates.slice(periodWindowStart());
    const weeks = weeklyCoachingActivity.slice(periodWindowStart());
    const windowLabel = weeks[0].label + '–' + weeks.at(-1).label;
    const description = name + ', ' + windowLabel + ': ' + rates.join(', ') + ' events per 1,000 trips. Lower is safer.';
    const tone = group.change > 0 ? 'adverse' : group.change < 0 ? 'favourable' : 'unchanged';
    return '<article class="chart-card overview-panel"><h2 class="chart-title">' + escapeHtml(label) + '</h2><p class="chart-context">' + escapeHtml(name + ' · ' + windowLabel) + ' · events per 1,000 trips · lower is safer</p><div class="chart-legend">' + chartLegendMarkup([{ tone: 'primary', kind: 'line', label: 'Event rate' }]) + '</div><div class="chart-plot">' + overviewSparkline(rates, { label: description }) + '</div><p class="chart-footnote"><span class="delta--' + tone + '">' + escapeHtml((group.change > 0 ? '↑ ' : group.change < 0 ? '↓ ' : '= ') + Math.abs(group.change) + '% ' + (group.change > 0 ? 'more' : group.change < 0 ? 'fewer' : 'change')) + '</span> · Source: prototype weekly rates; trip exposure, update time, and exclusions unavailable.</p>' + chartSummaryMarkup(description, chartTableMarkup(name + ' weekly event rates', ['Week', 'Events per 1,000 trips'], rates.map((rate, index) => [weeks[index].label, chartRate(rate)]))) + '<button class="text-link" type="button" data-open-group="' + escapeHtml(name) + '">Open group</button></article>';
  };
  overview.innerHTML = workload + trend(best, 'Largest recorded reduction') + (adverse ? trend(adverse, 'Recorded increase') : '');
}
