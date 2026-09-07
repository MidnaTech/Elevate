/* Compact fleet summaries. Their data scope is independent of table filters. */
function overviewSparkline(values, { label = 'Trend', tone = 'neutral', domain } = {}) {
  const points = values.map(Number);
  if (!points.length || points.some(value => !Number.isFinite(value))) return '';
  const width = 180;
  const height = 52;
  const padding = 5;
  const observedMin = Math.min(...points);
  const observedMax = Math.max(...points);
  const spread = Math.max(observedMax - observedMin, Math.abs(observedMax) * .08, 1);
  const low = domain ? domain[0] : observedMin - spread * .2;
  const high = domain ? domain[1] : observedMax + spread * .2;
  const coords = points.map((value, index) => ({
    x: padding + index / Math.max(1, points.length - 1) * (width - padding * 2),
    y: height - padding - (value - low) / Math.max(1, high - low) * (height - padding * 2)
  }));
  const path = coords.map((point, index) => (index ? 'L' : 'M') + point.x.toFixed(1) + ',' + point.y.toFixed(1)).join(' ');
  const last = coords[coords.length - 1];
  const first = coords[0];
  const safeTone = ['positive', 'negative', 'neutral'].includes(tone) ? tone : 'neutral';
  return '<svg class="overview-sparkline ' + safeTone + '" viewBox="0 0 180 52" role="img" aria-label="' + escapeHtml(label) + '">' +
    '<path class="overview-spark-area" d="' + path + ' L' + last.x + ',52 L' + first.x + ',52 Z"/>' +
    '<path class="overview-spark-path" d="' + path + '"/><circle cx="' + last.x.toFixed(1) + '" cy="' + last.y.toFixed(1) + '" r="3"/></svg>';
}

function renderSessionOverview() {
  const overview = document.getElementById('session-overview');
  if (!overview) return;
  const cycle = currentCycleCounts();
  const weeklyRates = weeklyCoachingActivity.map(week => week.identified ? week.completed / week.identified * 100 : 0);
  const rate = cycle.identified ? cycle.completionRate : null;
  document.getElementById('session-overview-rate').textContent = rate === null ? '—' : rate + '%';
  document.getElementById('session-overview-week').textContent = periodScopeLabel();
  document.getElementById('session-overview-completed').textContent = cycle.completed + ' of ' + cycle.identified + ' identified';
  document.getElementById('session-overview-trend').innerHTML = overviewSparkline(weeklyRates, {
    label: 'Weekly completion of identified coaching records. ' + weeklyCoachingActivity.map((week, index) => week.label + ': ' + weeklyRates[index].toFixed(1) + '%').join('; '),
    tone: 'positive', domain: [0, 100]
  });
  document.getElementById('session-overview-review-count').textContent = sessionFleetTotals.manager_attention;
  const total = sessionFleetTotals.manager_attention;
  overview.querySelectorAll('[data-overview-session-reason]').forEach(button => {
    const reason = button.dataset.overviewSessionReason;
    const count = sessionFleetTotals[reason];
    button.querySelector('strong').textContent = count;
    button.disabled = count === 0;
    button.setAttribute('aria-label', attentionReasonMeta[reason].label + ': ' + count + ' sessions. Filter session list.');
    button.setAttribute('aria-pressed', String(activeSessionFilter === reason && activeSessionSource === 'all' && !sessionSearch.trim()));
    const segment = overview.querySelector('[data-overview-reason-segment="' + reason + '"]');
    segment.style.flexGrow = count;
    segment.hidden = count === 0;
  });
  document.getElementById('session-overview-reason-bar').hidden = !total;
  document.getElementById('session-overview-all-clear').hidden = Boolean(total);
}

function renderDriverCoachingOverview() {
  const panel = document.querySelector('.overview-driver-coaching');
  if (!panel) return;
  document.getElementById('driver-coaching-progress-count').textContent = sessionFleetTotals.system_handling;
  document.getElementById('driver-coaching-automated').textContent = sessionOriginTotals.automated.system_handling;
  document.getElementById('driver-coaching-manual').textContent = sessionOriginTotals.manual_override.system_handling;
  document.getElementById('driver-coaching-completed').textContent = sessionFleetTotals.completed;
  const completedScope = document.getElementById('driver-completed-scope');
  if (completedScope) completedScope.textContent = periodLabel();
  panel.querySelectorAll('[data-overview-session-state]').forEach(button => {
    const state = button.dataset.overviewSessionState;
    const origin = button.dataset.overviewSessionOrigin;
    const count = origin === 'all' ? sessionFleetTotals[state] : sessionOriginTotals[origin][state];
    const description = state === 'completed' ? 'completed sessions, all recorded sessions' : (origin === 'automated' ? 'automated' : 'manager-started one-on-one') + ' sessions in progress';
    button.setAttribute('aria-label', 'View ' + count + ' ' + description);
  });

  const candidates = directory.filter(driver => Number.isFinite(driver.safetyScore) && Number.isFinite(driver.scoreChange));
  const best = candidates.filter(driver => driver.scoreChange > 0).sort((a, b) => b.scoreChange - a.scoreChange || a.name.localeCompare(b.name))[0];
  const winner = document.getElementById('driver-improvement');
  document.getElementById('driver-improvement-help').dataset.tooltip = 'Largest safety-score increase from the prior period among the ' + directory.length + ' drivers available in this directory. This is not a fleet-wide ranking. Higher is safer.';
  winner.hidden = !best;
  document.getElementById('driver-improvement-empty').hidden = Boolean(best);
  if (!best) return;
  const previous = best.safetyScore - best.scoreChange;
  winner.dataset.overviewDriver = best.name;
  winner.querySelector('.person-avatar').textContent = best.initials;
  winner.querySelector('.overview-driver-name strong').textContent = best.name;
  winner.querySelector('.overview-driver-name .overview-scope').textContent = previous + ' → ' + best.safetyScore + ' safety score';
  winner.querySelector('.overview-driver-gain').textContent = '+' + best.scoreChange + ' pts';
  winner.setAttribute('aria-label', 'View ' + best.name + ', top score improvement among ' + directory.length + ' directory drivers: up ' + best.scoreChange + ' points, from ' + previous + ' to ' + best.safetyScore + '.');
}
