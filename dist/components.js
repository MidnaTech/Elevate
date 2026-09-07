/* Elevate Autocoach Design Library v1 — shared DOM components and contracts. */
const uiStatusDictionary = Object.freeze({
  Completed: { tone: 'success', icon: 'checkCircle', dimension: 'state' },
  Replied: { tone: 'reply', icon: 'message', dimension: 'state' },
  Assigned: { tone: 'neutral', icon: 'clock', dimension: 'state' },
  'Awaiting driver': { tone: 'neutral', icon: 'clock', dimension: 'state' },
  'In progress': { tone: 'neutral', icon: 'clock', dimension: 'state' },
  Archived: { tone: 'neutral', icon: 'archive', dimension: 'state' },
  'Needs review': { tone: 'warning', icon: 'alert', dimension: 'attention' },
  Overdue: { tone: 'danger', icon: 'octagon', dimension: 'attention' },
  Repeated: { tone: 'warning', icon: 'repeat', dimension: 'attention' },
  Automated: { tone: 'neutral', icon: 'gear', dimension: 'method' },
  'One-on-one': { tone: 'neutral', icon: 'people', dimension: 'method' },
  'On track': { tone: 'success', icon: 'checkCircle', dimension: 'state' },
  Improved: { tone: 'success', icon: 'arrowDown', dimension: 'outcome' },
  Unchanged: { tone: 'neutral', icon: 'repeat', dimension: 'outcome' },
  Review: { tone: 'warning', icon: 'alert', dimension: 'outcome' }
});

function uiStatus(label) {
  const spec = uiStatusDictionary[label] || { tone: 'neutral', icon: 'info', dimension: 'state' };
  return '<span class="status" data-tone="' + spec.tone + '" data-dimension="' + spec.dimension + '">' + uiIcon(spec.icon) + '<span>' + escapeHtml(label) + '</span></span>';
}

function uiSessionState(session) {
  if (session.state === 'completed') return 'Completed';
  if (session.state === 'archived') return 'Archived';
  if (session.attentionReason === 'driver_reply') return 'Replied';
  if (session.candidate) return '—';
  return 'Awaiting driver';
}

function uiSessionAttention(session) {
  if (['completed', 'archived'].includes(session.state)) return '—';
  return ({ reminders_exhausted: 'Overdue', repeat_after_coaching: 'Repeated', driver_reply: 'Needs review' })[session.attentionReason] || (session.state === 'manager_attention' ? 'Needs review' : '—');
}

function uiKpi({ label, value, context = '', action = '', meter }) {
  const valueHtml = action ? '<button class="kpi-link" type="button" ' + action + '>' + escapeHtml(String(value)) + '</button>' : escapeHtml(String(value));
  const hasMeter = meter && Number.isFinite(meter.value) && Number.isFinite(meter.max) && meter.max > 0;
  const help = context ? '<button class="info-hint hint-trigger" type="button" aria-label="About ' + escapeHtml(label) + '" data-tooltip="' + escapeHtml(context) + '">' + uiIcon('info') + '</button>' : '';
  return '<article class="kpi-tile"><div class="kpi-label"><span>' + escapeHtml(label) + '</span>' + help + '</div><div class="kpi-value">' + valueHtml + '</div>' +
    (hasMeter ? '<div class="meter" role="meter" aria-label="' + escapeHtml(label) + '" aria-valuemin="0" aria-valuemax="' + meter.max + '" aria-valuenow="' + meter.value + '"><div class="meter__fill" style="width:' + Math.max(0, Math.min(100, meter.value / meter.max * 100)) + '%"></div></div>' : '') + '</article>';
}

function uiKpiStrip(label, items) {
  return '<section class="kpi-strip" tabindex="0" aria-label="' + escapeHtml(label) + '">' + items.map(uiKpi).join('') + '</section>';
}

function uiTable(label, headings, rows) {
  return '<div class="table-scroll" role="region" tabindex="0" aria-label="' + escapeHtml(label) + '"><table class="data-table"><caption class="sr-only">' + escapeHtml(label) + '</caption><thead><tr>' + headings.map(heading => '<th scope="col"' + (heading.numeric ? ' class="num"' : '') + '>' + escapeHtml(typeof heading === 'string' ? heading : heading.label) + '</th>').join('') + '</tr></thead><tbody>' + rows + '</tbody></table></div>';
}

function renderDesignLibraryKpis() {
  const cycle = currentCycleCounts();
  const update = (id, label, items) => {
    const host = document.getElementById(id);
    if (host) host.innerHTML = uiKpiStrip(label, items);
  };
  const action = (filter, programId = 'all') => 'data-view-link="inbox" data-inbox-filter="' + filter + '" data-inbox-program="' + programId + '"';
  const sessionCycle = currentCycleCounts(coachingPeriod, activeSessionProgram);
  const sessionScope = (activeSessionProgram === 'all' ? 'All programs' : categoryNameFor(activeSessionProgram)) + ' · ' + periodLabel();
  update('sessions-kpis', 'Sessions · ' + sessionScope, [
    { label: 'Identified', value: sessionCycle.identified, context: sessionScope + '. Coaching sessions in scope.', action: action('all', activeSessionProgram) },
    { label: 'In progress', value: sessionCycle.inProgress, context: sessionScope + '. Automated and one-on-one.', action: action('system_handling', activeSessionProgram) },
    { label: 'Needs review', value: sessionCycle.needsReview, context: sessionScope + '. Current review backlog.', action: action('attention', activeSessionProgram) },
    { label: 'Completed', value: sessionCycle.completed, context: sessionScope + '. Of ' + sessionCycle.identified + ' identified.', action: action('completed', activeSessionProgram), meter: { value: sessionCycle.completed, max: sessionCycle.identified } }
  ]);
  update('drivers-kpis', 'Driver directory summary', [
    { label: 'Drivers', value: '1,024', context: 'Fleet total' },
    { label: 'Automated in progress', value: cycle.automatedInProgress, context: 'Current workload only. Completed sessions and sessions needing review are counted separately.', action: 'data-overview-session-state="system_handling" data-overview-session-origin="automated"' },
    { label: 'One-on-one in progress', value: cycle.oneOnOneInProgress, context: 'Current workload only. Completed sessions and sessions needing review are counted separately.', action: 'data-overview-session-state="system_handling" data-overview-session-origin="manual_override"' },
    { label: 'Completed', value: cycle.completed, context: periodLabel(), action: action('completed') }
  ]);
  update('groups-kpis', 'Group summary', [
    { label: 'Groups', value: Object.keys(groupComparisonData).length, context: 'Fleet groups' },
    { label: 'Drivers', value: Object.values(groupComparisonData).reduce((sum, group) => sum + group.drivers, 0).toLocaleString('en-US'), context: 'Across all groups' },
    { label: 'Improving groups', value: Object.values(groupComparisonData).filter(group => group.change < 0).length, context: 'Fewer events · ' + periodLabel() },
    { label: 'Needs review', value: sessionFleetTotals.manager_attention, context: 'Sessions · ' + periodLabel(), action: action('attention') }
  ]);
  const content = typeof ProgramSetup !== 'undefined' ? ProgramSetup.libraryMetrics() : null;
  const training = typeof TrainingLibrary !== 'undefined' ? TrainingLibrary.metrics() : null;
  update('content-kpis', 'Training library summary', training ? [
    { label: 'Courses', value: training.courses, context: 'Published authored courses, prepared previews, sample outlines and preserved imported lessons. Drafts stay separate.' },
    { label: 'Materials prepared', value: training.authored, context: 'Courses with prepared teaching and quiz materials. Video availability is shown on each course.' },
    { label: 'Incomplete lessons', value: training.incomplete, context: 'Imported lesson metadata still missing the video and quiz needed for assignment.' }
  ] : content ? [
    { label: 'Sample courses', value: content.courses, context: 'Prepared video specifications and quizzes for local preview. Training videos are not connected.' },
    { label: 'Programs with courses', value: content.mappedPrograms, context: 'Programs with a selected sample course pool, including drafts.' },
    { label: 'Incomplete legacy lessons', value: content.legacyCourses, context: 'Retained metadata without the video and quiz required for assignment.' }
  ] : [
    { label: 'Programs', value: categories.length, context: 'Coaching programs' },
    { label: 'Lessons', value: lessons.length, context: 'Available coaching content' },
    { label: 'Mapped programs', value: categories.filter(category => category.training).length, context: 'Programs with assigned content' }
  ]);
  update('settings-kpis', 'Automation configuration summary', [
    { label: 'Mode', value: draftAutomationMode === 'fully' ? 'Fully automated' : draftAutomationMode === 'semi' ? 'Semi-automated' : 'Manual', context: 'Current configuration draft' },
    { label: 'Cadence', value: draftCadenceWeeks === 1 ? 'Weekly' : '2 weeks', context: 'One coaching cycle per interval' },
    { label: 'Programs', value: categories.length, context: 'Thresholds, rules and coach routing are configured per program in Programs' },
    { label: 'Active rules', value: eventTypeRules.filter(rule => rule.enabled).length, context: 'Across all programs · edited in Programs › Configuration' }
  ]);
}

// Keep legacy renderers on the canonical component contract during incremental
// rendering. This adapter only changes semantics and shared component classes.
function applyDesignLibrary(root = document) {
  const nodes = selector => [...root.querySelectorAll(selector)];
  const add = (selector, ...classes) => nodes(selector).forEach(node => {
    classes.forEach(name => { if (!node.classList.contains(name)) node.classList.add(name); });
  });
  const set = (node, name, value) => { if (node.getAttribute(name) !== value) node.setAttribute(name, value); };
  add('.primary-button, .attention-review-button', 'button', 'button--primary');
  add('.secondary-button, .filter-sheet-trigger, .filter-button:not(label)', 'button', 'button--secondary');
  add('.icon-button, .sidebar-toggle', 'button', 'button--secondary', 'button--icon');
  nodes('.icon-button').forEach(button => {
    if (['×', '✕'].includes(button.textContent.trim())) button.innerHTML = uiIcon('close');
  });
  add('.text-action, .card-link, .scope-link, .profile-back, .status-link', 'text-link');
  add('.info-hint, .icon-hint', 'hint-trigger');
  // Normalize the existing icon geometry onto the library's 16px coordinate
  // system. Non-scaling strokes keep every control icon at 1.75px.
  nodes('svg[viewBox="0 0 24 24"]').forEach(svg => {
    const geometry = document.createElementNS('http://www.w3.org/2000/svg', 'g');
    geometry.setAttribute('transform', 'scale(0.666666667)');
    while (svg.firstChild) geometry.append(svg.firstChild);
    geometry.querySelectorAll('path, rect, circle, line, polyline, polygon').forEach(mark => mark.setAttribute('vector-effect', 'non-scaling-stroke'));
    svg.append(geometry); svg.setAttribute('viewBox', '0 0 16 16');
    svg.setAttribute('width', '16'); svg.setAttribute('height', '16');
    svg.setAttribute('stroke-width', '1.75'); svg.classList.add('ui-icon');
  });
  add('dialog', 'dialog');
  add('.drawer-header, .category-panel-header, .sw-dialog-header, .global-search-header, .action-dialog header', 'drawer__header');
  add('.drawer__header h1, .drawer__header h2, .drawer__header h3', 'drawer__title');
  add('.drawer__header p:not(.eyebrow), .drawer__header .sw-program', 'drawer__context');
  add('.analytics-data-table', 'data-table');
  add('.analytics-table-scroll', 'table-scroll');
  nodes('[role="tablist"]').forEach(group => {
    group.classList.remove('segmented');
    group.querySelectorAll('[role="tab"]').forEach(tab => { if (!tab.classList.contains('view-tab')) tab.classList.add('view-tab'); });
    const selected = group.querySelector('[aria-selected="true"]') || group.querySelector('[role="tab"]');
    if (![...group.querySelectorAll('[role="tab"]')].some(tab => tab.tabIndex === 0)) selected?.setAttribute('tabindex', '0');
  });
  nodes('[role="radiogroup"]:not(fieldset), fieldset.segmented, .directory-filters:not(fieldset), .draft-evidence-tabs:not(fieldset), .sw-camera-tabs:not(fieldset)').forEach(group => {
    const buttons = [...group.children].filter(node => node.tagName === 'BUTTON');
    if (!buttons.length) return;
    const field = document.createElement('fieldset');
    [...group.attributes].forEach(attribute => field.setAttribute(attribute.name, attribute.value));
    field.classList.add('segmented');
    field.removeAttribute('role');
    const legend = document.createElement('legend');
    legend.className = 'sr-only';
    legend.textContent = group.getAttribute('aria-label') || document.getElementById(group.getAttribute('aria-labelledby'))?.textContent || 'Choose view';
    field.prepend(legend);
    const name = group.id || 'segment-' + (++applyDesignLibrary.groupId);
    let focusInput = null;
    buttons.forEach((button, index) => {
      const label = document.createElement('label');
      const input = document.createElement('input');
      [...button.attributes].filter(attribute => attribute.name.startsWith('data-') || ['id', 'aria-label', 'aria-controls', 'aria-checked', 'aria-pressed', 'disabled'].includes(attribute.name)).forEach(attribute => input.setAttribute(attribute.name, attribute.value));
      input.type = 'radio'; input.name = name;
      input.value = Object.values(button.dataset)[0] || String(index);
      input.checked = button.getAttribute('aria-checked') === 'true' || button.classList.contains('is-active');
      if (button === document.activeElement) focusInput = input;
      const option = document.createElement('span'); option.className = 'segmented__option';
      option.innerHTML = button.innerHTML;
      label.append(input, option); field.append(label);
    });
    group.replaceWith(field);
    focusInput?.focus({ preventScroll: true });
  });
  nodes('fieldset.segmented input[type="radio"][aria-checked]').forEach(input => { input.checked = input.getAttribute('aria-checked') === 'true'; });
  nodes('fieldset.segmented input[aria-pressed]').forEach(input => { input.checked = input.getAttribute('aria-pressed') === 'true'; });
  nodes('.analytics-kpi-strip').forEach(strip => {
    if (strip.tabIndex !== 0) strip.tabIndex = 0;
    if (!strip.classList.contains('kpi-strip')) strip.classList.add('kpi-strip');
    [...strip.children].forEach(tile => {
      if (tile.tagName !== 'ARTICLE') {
        const article = document.createElement('article');
        [...tile.attributes].forEach(attribute => article.setAttribute(attribute.name, attribute.value));
        while (tile.firstChild) article.append(tile.firstChild);
        tile.replaceWith(article); tile = article;
      }
      if (!tile.classList.contains('kpi-tile')) tile.classList.add('kpi-tile');
      tile.querySelector('.analytics-metric-label')?.classList.add('kpi-label');
      const value = tile.querySelector('.analytics-metric-value') || tile.querySelector(':scope > strong');
      if (value && !value.classList.contains('kpi-value')) value.classList.add('kpi-value');
      tile.querySelector('.analytics-kpi-caption')?.classList.add('kpi-context');
      const meter = tile.querySelector('.analytics-kpi-meter');
      if (meter) {
        meter.classList.add('meter'); meter.querySelector('i')?.classList.add('meter__fill'); meter.removeAttribute('aria-hidden');
        const percent = parseFloat(meter.querySelector('i')?.style.width);
        set(meter, 'role', 'meter'); set(meter, 'aria-label', tile.querySelector('.analytics-metric-label > span')?.textContent || 'Share');
        set(meter, 'aria-valuemin', '0'); set(meter, 'aria-valuemax', '100'); set(meter, 'aria-valuenow', String(Number.isFinite(percent) ? percent : 0));
        const context = tile.querySelector('.kpi-context');
        if (context && meter.nextElementSibling === context) context.after(meter);
      }
    });
  });
  // Explanations live in one help affordance; only real comparisons remain
  // under the number. Keep existing IDs available for the data renderers.
  nodes('.kpi-tile').forEach(tile => {
    const label = tile.querySelector('.kpi-label');
    if (!label) return;
    const contexts = [...tile.querySelectorAll('.kpi-context')].filter(context => !context.querySelector('.kpi-trend'));
    let help = label.querySelector('[data-tooltip]');
    if (!help && contexts.some(context => context.textContent.trim())) {
      help = document.createElement('button'); help.type = 'button'; help.className = 'info-hint hint-trigger';
      help.setAttribute('aria-label', 'About ' + label.textContent.trim()); help.innerHTML = uiIcon('info'); label.append(help);
    }
    if (help) {
      if (help.dataset.baseExplanation === undefined || help.dataset.tooltip !== help.dataset.composedExplanation) help.dataset.baseExplanation = help.dataset.tooltip || '';
      const explanations = contexts.map(context => context.textContent.trim()).filter(Boolean);
      help.dataset.tooltip = help.dataset.baseExplanation || [...new Set(explanations)].join(' ');
      help.dataset.composedExplanation = help.dataset.tooltip;
    }
    contexts.forEach(context => { if (!context.hidden) context.hidden = true; });
  });
  // Keep sources and lengthy methodology with the chart's existing data
  // disclosure, without removing any information or adding another section.
  nodes('.chart-card').forEach(card => {
    const details = [...card.querySelectorAll('details.chart-summary')].find(node => node.closest('.chart-card') === card);
    if (!details) return;
    [...card.querySelectorAll('.chart-footnote, [data-chart-source-note]')].filter(note => note.closest('.chart-card') === card && !note.closest('details')).forEach(note => details.append(note));
  });
  nodes('.session-status, .profile-session-status, .directory-status, .sw-status').forEach(status => {
    const label = Object.keys(uiStatusDictionary).sort((a,b) => b.length-a.length).find(label => status.textContent.trim().startsWith(label));
    if (!label) return;
    const spec = uiStatusDictionary[label];
    if (!status.classList.contains('status')) status.classList.add('status');
    set(status, 'data-tone', spec.tone); set(status, 'data-dimension', spec.dimension);
    if (status.dataset.statusIcon !== spec.icon) {
      status.querySelector('svg, .sw-status-dot')?.remove();
      status.insertAdjacentHTML('afterbegin', uiIcon(spec.icon)); status.dataset.statusIcon = spec.icon;
    }
  });
  nodes('[data-open-driver-profile][aria-controls="driver-drawer"]').forEach(button => set(button, 'aria-expanded', String(document.getElementById('driver-drawer').open && activeDriverProfile === button.dataset.openDriverProfile)));
  nodes('[data-filter-sheet-trigger]').forEach(button => set(button, 'data-applied', String(Boolean(button.querySelector('.filter-count')))));
  nodes('.data-table').forEach(table => {
    const headings = [...(table.tHead?.rows[0]?.cells || [])];
    // A column's declaration governs its heading and every value, including
    // missing values and editable counts. Never infer alignment from the text.
    [...table.tBodies].flatMap(body => [...body.rows]).forEach(row => {
      if (row.cells.length !== headings.length || [...row.cells].some(cell => cell.colSpan !== 1)) return;
      headings.forEach((heading, index) => {
        row.cells[index].classList.toggle('num', heading.classList.contains('num'));
      });
    });
    headings.forEach((heading, index) => {
      if (heading.querySelector('button') || !heading.textContent.trim() || ['Action', 'On', 'Trigger', 'Coaching path', 'Severity'].includes(heading.textContent.trim())) return;
      const button = document.createElement('button'); button.type = 'button';
      button.className = 'table-sort'; button.dataset.tableSort = String(index);
      while (heading.firstChild) button.append(heading.firstChild);
      button.insertAdjacentHTML('beforeend', uiIcon('arrowDown'));
      heading.append(button); heading.setAttribute('aria-sort', 'none');
    });
  });
}
applyDesignLibrary.groupId = 0;

document.addEventListener('DOMContentLoaded', () => {
  applyDesignLibrary();
  const observer = new MutationObserver(() => {
    observer.disconnect(); applyDesignLibrary();
    observer.observe(document.body, { childList: true, subtree: true, attributes: true, attributeFilter: ['aria-checked', 'aria-pressed', 'class', 'style'] });
  });
  observer.observe(document.body, { childList: true, subtree: true, attributes: true, attributeFilter: ['aria-checked', 'aria-pressed', 'class', 'style'] });
  ['driver-drawer', 'category-drawer'].forEach(id => {
    const dialog = document.getElementById(id);
    if (!dialog) return;
    dialog.addEventListener('cancel', event => { event.preventDefault(); id === 'driver-drawer' ? closeDrawer() : closeCategoryDrawer(); });
    dialog.addEventListener('click', event => { if (event.target === dialog && event.clientX < dialog.getBoundingClientRect().left) id === 'driver-drawer' ? closeDrawer() : closeCategoryDrawer(); });
  });
});

document.addEventListener('click', event => {
  if (event.target.closest('[aria-disabled="true"]')) { event.preventDefault(); event.stopImmediatePropagation(); return; }
  const pager = event.target.closest('[data-session-page]');
  if (pager && !pager.disabled) {
    const direction = Number(pager.dataset.sessionPage) > sessionPage ? 'next' : 'previous';
    sessionPage = Number(pager.dataset.sessionPage); renderInbox();
    const controls = document.querySelectorAll('[data-session-page]');
    const target = controls[direction === 'next' ? 1 : 0];
    (target?.disabled ? controls[direction === 'next' ? 0 : 1] : target)?.focus();
    return;
  }
  const button = event.target.closest('[data-table-sort]');
  if (!button) return;
  const table = button.closest('table'), heading = button.closest('th');
  const descending = heading.getAttribute('aria-sort') === 'ascending';
  table.querySelectorAll('[aria-sort]').forEach(node => node.setAttribute('aria-sort', 'none'));
  heading.setAttribute('aria-sort', descending ? 'descending' : 'ascending');
  const index = Number(button.dataset.tableSort);
  const rows = [...table.tBodies[0].rows];
  const text = row => row.cells[index]?.textContent.trim().replace(/[−,]/g, match => match === '−' ? '-' : '') || '';
  const numeric = heading.classList.contains('num');
  const quantity = row => {
    const cell = row.cells[index];
    const raw = cell?.dataset.sortValue ?? cell?.querySelector('input[type="number"]')?.value ?? text(row);
    return raw.trim() ? Number.parseFloat(raw) : NaN;
  };
  rows.sort((a, b) => {
    if (numeric) {
      const first = quantity(a), second = quantity(b);
      if (!Number.isFinite(first)) return Number.isFinite(second) ? 1 : 0;
      if (!Number.isFinite(second)) return -1;
      return (first - second) * (descending ? -1 : 1);
    }
    return text(a).localeCompare(text(b), undefined, { numeric: true }) * (descending ? -1 : 1);
  });
  rows.forEach(row => table.tBodies[0].append(row));
}, true);

document.addEventListener('input', event => {
  if (event.target.id === 'content-search') renderLibrary();
});

document.addEventListener('change', event => {
  const selection = event.target.closest('.data-table [data-row-select]');
  if (selection) selection.closest('tr').dataset.selected = String(selection.checked);
});

// Native dialogs provide modal inertness and Escape. Keep Tab cycling within
// their visible controls as well, including when a nested browser is open.
document.addEventListener('keydown', event => {
  if (event.key !== 'Tab') return;
  const dialog = event.target.closest('dialog[open]');
  if (!dialog) return;
  const controls = [...dialog.querySelectorAll('button, input, select, textarea, summary, [href], [tabindex]')].filter(node => {
    if (node.tabIndex < 0 || node.disabled || !node.getClientRects().length || getComputedStyle(node).visibility === 'hidden' || node.closest('[inert]')) return false;
    if (node.matches('input[type="radio"]') && !node.checked && [...dialog.querySelectorAll('input[type="radio"]')].some(radio => radio.name === node.name && radio.checked)) return false;
    return true;
  });
  if (!controls.length) { event.preventDefault(); dialog.focus(); return; }
  const first = controls[0], last = controls.at(-1);
  if (event.shiftKey && document.activeElement === first || !event.shiftKey && document.activeElement === last) {
    event.preventDefault(); (event.shiftKey ? last : first).focus();
  }
}, true);
