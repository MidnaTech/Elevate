/* Shared chart marks and accessible data alternatives. Colours come from the data palette. */
function chartRate(value) {
  return Number.isFinite(value) ? String(Math.round(value * 100) / 100) : 'Not enough data';
}

function chartScaleCeiling(peak) {
  if (!(peak > 0)) return 1;
  const power = 10 ** Math.floor(Math.log10(peak));
  const normalized = peak / power;
  return ([1, 2, 4, 5, 8, 10].find(step => step >= normalized) || 10) * power;
}

function chartChangeLabel(row) {
  if (!Number.isFinite(row.before) || !Number.isFinite(row.after)) return 'Not enough data';
  const difference = row.after - row.before;
  if (!difference) return '= No change';
  const arrow = difference < 0 ? '↓' : '↑';
  if (!row.before) return arrow + ' +' + chartRate(difference) + ' / 1,000';
  const percent = Number.isFinite(row.change) ? Math.abs(row.change) : Math.round(Math.abs(difference / row.before) * 100);
  return arrow + ' ' + percent + '% ' + (difference < 0 ? 'fewer' : 'more');
}

function chartLegendMarkup(series) {
  return series.map(item => '<span><svg class="chart-legend-swatch" viewBox="0 0 24 14" aria-hidden="true">' +
    (item.kind === 'score' ? '<path class="chart-score-casing" d="M1 7h22"/><path class="chart-score-line" d="M1 7h22"/><circle class="chart-score-marker" cx="12" cy="7" r="3"/>' : item.kind === 'line' ? '<path class="chart-line' + (item.tone === 'baseline' ? ' chart-line--baseline' : '') + '" d="M1 7h22"/>' : '<rect class="chart-bar--' + item.tone + '" x="1" y="2" width="22" height="10"/>') +
    '</svg>' + escapeHtml(item.label) + '</span>').join('');
}

function chartTableMarkup(caption, headers, rows) {
  return '<div class="table-scroll chart-data-table-scroll" tabindex="0" role="region" aria-label="' + escapeHtml(caption) + '"><table class="data-table chart-data-table"><caption>' + escapeHtml(caption) + '</caption><thead><tr>' + headers.map((header, index) => '<th scope="col"' + (index ? ' class="num"' : '') + '>' + escapeHtml(header) + '</th>').join('') + '</tr></thead><tbody>' + rows.map(row => '<tr>' + row.map((value, index) => (index ? '<td class="num">' : '<th scope="row">') + escapeHtml(String(value)) + (index ? '</td>' : '</th>')).join('') + '</tr>').join('') + '</tbody></table></div>';
}

function chartSummaryMarkup(summary, table) {
  return '<details class="chart-summary chart-data-summary"><summary><span>Summary and data</span>' + uiIcon('chevron') + '</summary><p>' + escapeHtml(summary) + '</p>' + table + '</details>';
}

function chartHorizontalBar(x, y, width, height = 12) {
  const end = x + Math.max(0, width);
  const radius = Math.min(2, width / 2);
  return 'M' + x + ' ' + y + 'H' + (end - radius).toFixed(2) + 'Q' + end.toFixed(2) + ' ' + y + ' ' + end.toFixed(2) + ' ' + (y + radius) + 'V' + (y + height - radius) + 'Q' + end.toFixed(2) + ' ' + (y + height) + ' ' + (end - radius).toFixed(2) + ' ' + (y + height) + 'H' + x + 'Z';
}

function chartBeforeAfterSvg(rows, availableWidth) {
  // SVG text follows the user's root font size; reserve matching geometry at text zoom.
  const textScale = typeof document !== 'undefined' && typeof getComputedStyle === 'function'
    ? Math.max(1, (parseFloat(getComputedStyle(document.documentElement).fontSize) || 16) / 16) : 1;
  const width = Math.max(480 * textScale, Math.min(1400 * textScale, availableWidth || 720));
  const compact = width < 680 * textScale;
  const left = (compact ? 156 : 220) * textScale;
  const right = (compact ? 135 : 154) * textScale;
  const top = 24 * textScale;
  const rowHeight = 44 * textScale;
  const height = top + rows.length * rowHeight + 38 * textScale;
  const plotWidth = width - left - right;
  const finiteValues = rows.flatMap(row => [row.before, row.after]).filter(value => Number.isFinite(value) && value >= 0);
  const max = chartScaleCeiling(Math.max(1, ...finiteValues) * 1.05);
  const x = value => left + value / max * plotWidth;
  const endY = top + rows.length * rowHeight - 8 * textScale;
  const ticks = Array.from({ length: 5 }, (_, index) => max * index / 4);
  return '<svg class="before-after-chart" width="' + width + '" height="' + height + '" viewBox="0 0 ' + width + ' ' + height + '" role="img" aria-label="Before and after event rates. Gray Before bars above petrol After bars. Events per 1,000 trips; lower is safer.">' +
    '<g>' + ticks.map(tick => '<line class="chart-grid" x1="' + x(tick).toFixed(1) + '" y1="' + (top - 5 * textScale) + '" x2="' + x(tick).toFixed(1) + '" y2="' + endY + '"/><text class="chart-label" x="' + x(tick).toFixed(1) + '" y="' + (endY + 20 * textScale) + '" text-anchor="middle">' + chartRate(tick) + '</text>').join('') + '<line class="chart-axis" x1="' + left + '" y1="' + (top - 5 * textScale) + '" x2="' + left + '" y2="' + endY + '"/><text class="chart-label" x="' + (width - 10 * textScale) + '" y="' + (12 * textScale) + '" text-anchor="end">Change</text></g>' +
    rows.map((row, index) => {
      const y = top + index * rowHeight;
      const valid = Number.isFinite(row.before) && Number.isFinite(row.after) && row.before >= 0 && row.after >= 0;
      const tone = !valid || row.after === row.before ? 'flat' : row.after < row.before ? 'improved' : 'worse';
      const maxChars = compact ? 15 : 24;
      const label = row.label.length > maxChars ? row.label.slice(0, maxChars - 1).trimEnd() + '…' : row.label;
      const info = row.label + (row.meta ? ' · ' + row.meta : '') + ': Before ' + chartRate(row.before) + ', After ' + chartRate(row.after) + ' events per 1,000 trips. ' + chartChangeLabel(row) + (row.before === 0 && row.after > 0 ? '. Percentage change unavailable because the starting rate is zero.' : '') + '.';
      return '<g class="ba-row ' + tone + '" tabindex="0" role="img" aria-label="' + escapeHtml(info) + '" data-tooltip="' + escapeHtml(info) + '"><title>' + escapeHtml(info) + '</title><text class="chart-label ba-label" x="0" y="' + (y + 18 * textScale) + '">' + escapeHtml(label) + '</text>' +
        (valid ? [['Before', row.before, 'baseline'], ['After', row.after, 'primary']].map(([name, value, series], offset) => {
          const barY = y + offset * 16 * textScale;
          return '<text class="chart-label ba-series" x="' + (left - 8 * textScale) + '" y="' + (barY + 10 * textScale) + '" text-anchor="end">' + name + '</text><path class="chart-bar--' + series + ' ba-' + name.toLowerCase() + '" d="' + chartHorizontalBar(left, barY, x(value) - left, 12 * textScale) + '"/><text class="chart-label ba-value" x="' + (x(value) + 6 * textScale).toFixed(1) + '" y="' + (barY + 10 * textScale) + '">' + chartRate(value) + '</text>';
        }).join('') : '<text class="chart-label" x="' + left + '" y="' + (y + 18 * textScale) + '">Not enough data</text>') +
        '<text class="chart-label ba-change" x="' + (width - 10 * textScale) + '" y="' + (y + 18 * textScale) + '" text-anchor="end">' + escapeHtml(chartChangeLabel(row)) + '</text></g>';
    }).join('') + '</svg>';
}

function chartWeeklyActivitySvg(weeks, availableWidth, availableHeight, options = {}) {
  const textScale = typeof document !== 'undefined' && typeof getComputedStyle === 'function'
    ? Math.max(1, (parseFloat(getComputedStyle(document.documentElement).fontSize) || 16) / 16) : 1;
  const width = Math.max(440 * textScale, availableWidth || 760 * textScale);
  const height = Math.max(270 * textScale, Math.min(420 * textScale, (availableHeight || 300) * textScale));
  const hasScore = weeks.some(week => Number.isFinite(week.score));
  const scoreName = options.scoreName || 'Elevate score';
  const titleId = (options.idPrefix || 'weekly-activity') + '-title';
  const descriptionId = (options.idPrefix || 'weekly-activity') + '-desc';
  const left = 38 * textScale;
  const right = (hasScore ? 40 : 16) * textScale;
  const top = 36 * textScale;
  const bottom = 34 * textScale;
  const plotHeight = height - top - bottom;
  const plotWidth = width - left - right;
  const maximum = chartScaleCeiling(Math.max(1, ...weeks.flatMap(week => [week.automated, week.oneToOne])) * 1.15);
  const slot = plotWidth / Math.max(1, weeks.length);
  const barWidth = Math.min(20 * textScale, Math.max(7 * textScale, (slot - 14 * textScale) / 2));
  const baseY = height - bottom;
  const y = value => baseY - value / maximum * plotHeight;
  const scoreY = value => baseY - value / 100 * plotHeight;
  const points = weeks.map((week, index) => Number.isFinite(week.score) ? { x: left + (index + .5) * slot, y: scoreY(week.score), value: week.score } : null);
  let connected = false;
  const scorePath = points.map(point => {
    if (!point) { connected = false; return ''; }
    const command = connected ? 'L' : 'M';
    connected = true;
    return command + point.x.toFixed(1) + ' ' + point.y.toFixed(1);
  }).join(' ');
  const tickSteps = maximum % 4 === 0 ? 4 : 2;
  const tickValues = Array.from({ length: tickSteps + 1 }, (_, index) => maximum * index / tickSteps);
  const description = options.description || 'In-progress sessions at each weekly snapshot. Bars use the left Sessions axis starting at zero. ' +
    (hasScore ? 'Score uses the right ' + scoreName + ' axis fixed from zero to 100. ' : 'No score observations are available. ') +
    weeks.map(week => week.label + ': ' + week.automated + ' automated sessions, ' + week.oneToOne + ' one-on-one sessions, ' + scoreName + ' ' + (Number.isFinite(week.score) ? week.score + ' out of 100' : 'unavailable')).join('; ') + '.';
  return '<svg class="weekly-activity-chart" width="' + width + '" height="' + height + '" viewBox="0 0 ' + width + ' ' + height + '" role="img" aria-labelledby="' + escapeHtml(titleId + ' ' + descriptionId) + '"><title id="' + escapeHtml(titleId) + '">' + escapeHtml(options.title || 'Weekly coaching activity and ' + scoreName) + '</title><desc id="' + escapeHtml(descriptionId) + '">' + escapeHtml(description) + '</desc>' +
    '<text class="chart-label activity-axis-title" x="0" y="' + (12 * textScale) + '">Sessions</text>' + (hasScore ? '<text class="chart-label activity-axis-title" x="' + width + '" y="' + (12 * textScale) + '" text-anchor="end">' + escapeHtml(scoreName) + ' / 100</text>' : '') +
    tickValues.map(tick => '<line class="chart-grid" x1="' + left + '" x2="' + (width - right) + '" y1="' + y(tick) + '" y2="' + y(tick) + '"/><text class="chart-label" x="' + (left - 8 * textScale) + '" y="' + (y(tick) + 4 * textScale) + '" text-anchor="end">' + chartRate(tick) + '</text>').join('') +
    '<path class="chart-axis" fill="none" d="M' + left + ' ' + top + 'V' + baseY + 'H' + (width - right) + (hasScore ? 'V' + top : '') + '"/>' +
    (hasScore ? [0, 25, 50, 75, 100].map(tick => '<text class="chart-label" x="' + (width - right + 8 * textScale) + '" y="' + (scoreY(tick) + 4 * textScale) + '">' + tick + '</text>').join('') : '') +
    '<g class="weekly-bars">' + weeks.map((week, index) => {
      const center = left + (index + .5) * slot;
      const showLabel = width >= 600 * textScale || index % 2 === 0 || index === weeks.length - 1;
      return [{ key: 'automated', label: 'Automated', tone: 'primary', x: center - barWidth - 2 * textScale }, { key: 'oneToOne', label: 'One-on-one', tone: 'secondary', x: center + 2 * textScale }].map(series => {
        const value = week[series.key];
        const tooltip = 'Week of ' + week.label + ': ' + series.label + ', ' + value + ' in-progress sessions. Left axis.' + (week.countSource ? ' ' + week.countSource + '.' : '');
        return '<g tabindex="0" role="img" aria-label="' + escapeHtml(tooltip) + '" data-tooltip="' + escapeHtml(tooltip) + '"><rect class="activity-bar chart-bar--' + series.tone + '" x="' + series.x.toFixed(1) + '" y="' + y(value).toFixed(1) + '" width="' + barWidth.toFixed(1) + '" height="' + (baseY - y(value)).toFixed(1) + '"/><text class="chart-label activity-bar-value" x="' + (series.x + barWidth / 2).toFixed(1) + '" y="' + (y(value) - 6 * textScale).toFixed(1) + '" text-anchor="middle">' + value + '</text></g>';
      }).join('') + (showLabel ? '<text class="chart-label activity-week-label" x="' + center.toFixed(1) + '" y="' + (height - 8 * textScale) + '" text-anchor="middle">' + escapeHtml(week.label) + '</text>' : '');
    }).join('') + '</g>' + (hasScore ? '<path class="chart-score-casing" d="' + scorePath + '"/><path class="chart-score-line" d="' + scorePath + '"/>' : '') +
    points.map((point, index) => {
      if (!point) return '';
      const tooltip = 'Week of ' + weeks[index].label + ': ' + scoreName + ' ' + point.value + ' out of 100. Right axis.' + (weeks[index].scoreSource ? ' ' + weeks[index].scoreSource + '.' : '');
      return '<circle class="chart-score-marker" cx="' + point.x.toFixed(1) + '" cy="' + point.y.toFixed(1) + '" r="' + (3 * textScale) + '" tabindex="0" role="img" aria-label="' + escapeHtml(tooltip) + '" data-tooltip="' + escapeHtml(tooltip) + '"><title>' + escapeHtml(tooltip) + '</title></circle>';
    }).join('') + '</svg>';
}

function chartMountSummary(card, summary, table, footnote) {
  if (!card) return;
  (card.closest('.outcome-story') || card).classList.add('chart-card');
  let details = card.querySelector('details.chart-data-summary, details.chart-summary');
  if (!details) { card.insertAdjacentHTML('beforeend', chartSummaryMarkup(summary, table)); details = card.querySelector('details.chart-summary'); }
  else {
    const wasOpen = details.open;
    // Data renderers retain these note nodes by ID across sorting and period
    // changes. Rebuilding the equivalent table must not discard them.
    const notes = [...details.querySelectorAll('.chart-footnote:not([data-chart-source-note])')];
    details.classList.add('chart-summary');
    details.innerHTML = '<summary><span>Summary and data</span>' + uiIcon('chevron') + '</summary><p>' + escapeHtml(summary) + '</p>' + table;
    details.append(...notes);
    details.open = wasOpen;
  }
  let note = card.querySelector('[data-chart-source-note]');
  if (!note) { note = document.createElement('p'); note.dataset.chartSourceNote = ''; note.className = 'chart-footnote'; }
  if (note.parentElement !== details) details.append(note);
  note.textContent = footnote;
}

function chartWeeklyData(weeks) {
  return chartTableMarkup('Weekly coaching snapshots and fleet Elevate score', ['Week', 'Automated in progress', 'One-on-one in progress', 'Elevate score / 100', 'Identified records', 'Completed sessions', 'Needs review'], weeks.map(week => [week.label, week.automated, week.oneToOne, week.score, week.identified, week.completed, week.escalated]));
}

function chartCategoryWeekly(category, availableWidth) {
  const values = category.weeklyRates;
  const textScale = typeof document !== 'undefined' && typeof getComputedStyle === 'function'
    ? Math.max(1, (parseFloat(getComputedStyle(document.documentElement).fontSize) || 16) / 16) : 1;
  const width = Math.max(680 * textScale, availableWidth || 680);
  const height = 222 * textScale;
  const left = 38 * textScale;
  const right = 20 * textScale;
  const top = 16 * textScale;
  const bottom = 34 * textScale;
  const max = chartScaleCeiling(Math.max(1, ...values) * 1.05);
  const points = pointsPath(values, width, height, left, right, top, bottom, 0, max);
  const weeks = ['Jul 13', 'Jul 20', 'Jul 27', 'Aug 3', 'Aug 10', 'Aug 17', 'Aug 24', 'Aug 31'];
  const summary = category.name + ': ' + values.map((value, index) => weeks[index] + ' ' + chartRate(value)).join('; ') + ' events per 1,000 trips. Lower is safer.';
  const svg = '<svg class="category-weekly-chart" width="' + width + '" height="' + height + '" viewBox="0 0 ' + width + ' ' + height + '" role="img" aria-label="' + escapeHtml(summary) + '">' +
    [0, max / 4, max / 2, max * .75, max].map(tick => { const y = height - bottom - tick / max * (height - top - bottom); return '<line class="chart-grid" x1="' + left + '" x2="' + (width - right) + '" y1="' + y + '" y2="' + y + '"/><text class="chart-label" x="' + (left - 8 * textScale) + '" y="' + (y + 4 * textScale) + '" text-anchor="end">' + chartRate(tick) + '</text>'; }).join('') +
    '<path class="chart-axis" fill="none" d="M' + left + ' ' + top + 'V' + (height - bottom) + 'H' + (width - right) + '"/><path class="chart-line" d="' + linePath(points) + '"/>' + points.map((point, index) => '<circle class="chart-line-marker" cx="' + point.x.toFixed(1) + '" cy="' + point.y.toFixed(1) + '" r="3" tabindex="0" role="img" aria-label="' + escapeHtml(weeks[index] + ': ' + chartRate(point.value) + ' events per 1,000 trips') + '" data-tooltip="' + escapeHtml(weeks[index] + ': ' + chartRate(point.value) + ' events per 1,000 trips') + '"/>' + '<text class="chart-label" x="' + point.x.toFixed(1) + '" y="' + (height - 8 * textScale) + '" text-anchor="middle">' + weeks[index] + '</text>').join('') + '</svg>';
  return '<p class="chart-context">Jul 13–Aug 31 · 8 weekly observations · events per 1,000 trips · lower is safer</p><div class="chart-legend">' + chartLegendMarkup([{ tone: 'primary', kind: 'line', label: 'Event rate' }]) + '</div><div class="chart-plot" tabindex="0" role="region" aria-label="' + escapeHtml(category.name + ' weekly event-rate chart') + '">' + svg + '</div>' + chartSummaryMarkup(summary + ' Source: prototype rate observations. Trip exposure and driver counts by week, update time, and exclusions are not recorded. This history keeps all eight weekly observations independently of the coaching-record period filter.', chartTableMarkup(category.name + ' weekly event rates', ['Week', 'Events per 1,000 trips'], values.map((value, index) => [weeks[index], chartRate(value)])));
}

function chartDailyMiles(driver, record) {
  if (!record) return '<p class="profile-empty-inline">No dated driving observations recorded</p>';
  const days = record.days;
  const width = Math.max(640, Math.min(1060, window.innerWidth - 84) - 104);
  const height = 210;
  const left = 42;
  const right = 10;
  const top = 24;
  const bottom = 32;
  const max = chartScaleCeiling(Math.max(1, ...days.map(day => day.miles)) * 1.1);
  const baseY = height - bottom;
  const y = value => baseY - value / max * (height - top - bottom);
  const slot = (width - left - right) / days.length;
  const barWidth = Math.min(40, slot * .6);
  const summary = driver.name + ': ' + days.map(day => day.date + ' ' + day.miles + ' miles and ' + day.trips + ' trips').join('; ') + '. These are illustrative driving observations.';
  const svg = '<svg class="profile-daily-chart" width="' + width + '" height="' + height + '" viewBox="0 0 ' + width + ' ' + height + '" role="img" aria-label="' + escapeHtml(summary) + '">' +
    [0, max / 4, max / 2, max * .75, max].map(tick => '<line class="chart-grid" x1="' + left + '" x2="' + (width - right) + '" y1="' + y(tick) + '" y2="' + y(tick) + '"/><text class="chart-label" x="' + (left - 8) + '" y="' + (y(tick) + 4) + '" text-anchor="end">' + chartRate(tick) + '</text>').join('') + '<path class="chart-axis" fill="none" d="M' + left + ' ' + top + 'V' + baseY + 'H' + (width - right) + '"/>' +
    days.map((day, index) => { const x = left + (index + .5) * slot; const label = day.date + ': ' + day.miles + ' miles, ' + day.trips + ' trips'; return '<g class="chart-daily-datum" tabindex="0" role="img" aria-label="' + escapeHtml(label) + '" data-tooltip="' + escapeHtml(label) + '"><rect class="chart-daily-bar chart-bar--primary" x="' + (x - barWidth / 2) + '" y="' + y(day.miles) + '" width="' + barWidth + '" height="' + (baseY - y(day.miles)) + '"/><text class="chart-label" x="' + x + '" y="' + (y(day.miles) - 6) + '" text-anchor="middle">' + day.miles + '</text><text class="chart-label" x="' + x + '" y="' + (height - 8) + '" text-anchor="middle">' + escapeHtml(day.date) + '</text></g>'; }).join('') + '</svg>';
  return '<section class="chart-card profile-daily" aria-labelledby="profile-daily-title"><h3 class="chart-title" id="profile-daily-title">Daily miles</h3><p class="chart-context">' + escapeHtml(driver.name + ' · ' + record.week) + ' · miles driven · volume has no favourable direction</p><div class="chart-legend">' + chartLegendMarkup([{ tone: 'primary', label: 'Miles driven' }]) + '</div><div class="chart-plot" tabindex="0" role="region" aria-label="Daily miles chart">' + svg + '</div><p class="chart-footnote">Source: illustrative prototype observations for one driver. All seven sample days shown, including rest days; update time is unavailable.</p>' + chartSummaryMarkup(summary, chartTableMarkup(driver.name + ' daily driving', ['Day', 'Miles', 'Trips'], days.map(day => [day.date, day.miles, day.trips]))) + '</section>';
}
