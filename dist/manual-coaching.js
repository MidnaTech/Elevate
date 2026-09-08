/* One-on-one sessions: one page to create, and the same page to edit. A draft is never a ledger
   record; evidence is linked only on Create. Layout mirrors the session workspace (header with
   identity and actions, stacked details and expandable evidence rows). */
let manualCoachingState = null;
// The existing incident fixtures cover late August / early September 2026.
// This is a labelled prototype calendar boundary, not a live programme evaluation.
const manualEvidenceCalendarEnd = Date.UTC(2026, 8, 7);

function manualCoachingDraft() {
  const draft = manualCoachingState;
  const program = categories.find(item => item.id === draft?.programId);
  return draft && program && draft.person ? {
    id: 'manual-coaching-draft', person: draft.person, categoryId: program.id,
    category: program.name, state: 'system_handling', origin: 'manual_override',
    deliveryMode: 'one_on_one', evidence: [], messages: []
  } : null;
}

function manualEditingSession() {
  return manualCoachingState?.editSessionId ? sessions.find(item => item.id === manualCoachingState.editSessionId) : null;
}

function manualEvidenceDate(event) {
  const raw = event.time || '';
  const iso = raw.match(/\b(\d{4}-\d{2}-\d{2})\b/);
  if (iso) { const value = Date.parse(iso[1] + 'T00:00:00Z'); return Number.isFinite(value) ? value : null; }
  const date = raw.match(/\b(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)\s+(\d{1,2})(?:,?\s+(\d{4}))?\b/i);
  if (!date) return null;
  const month = ['jan', 'feb', 'mar', 'apr', 'may', 'jun', 'jul', 'aug', 'sep', 'oct', 'nov', 'dec'].indexOf(date[1].toLowerCase());
  return Date.UTC(Number(date[3] || 2026), month, Number(date[2]));
}

function manualEvidenceWindow() {
  const programId = manualCoachingState?.programId;
  const policy = typeof programPolicyFor === 'function' ? programPolicyFor(programId) : { basis: 'calendar', window: 2 };
  if (policy.basis !== 'calendar' || !(policy.window > 0)) {
    const label = typeof programPolicyPeriodLabel === 'function' ? programPolicyPeriodLabel(programId) : 'Exposure period';
    return { calendar: false, label, note: 'Exposure-period matching is unavailable. Choose from recorded programme evidence.' };
  }
  const start = manualEvidenceCalendarEnd - policy.window * 7 * 86400000;
  const format = value => new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric', timeZone: 'UTC' }).format(value);
  return { calendar: true, start, end: manualEvidenceCalendarEnd, label: format(start) + '–' + format(manualEvidenceCalendarEnd - 86400000) + ' · ' + policy.window + (policy.window === 1 ? ' week' : ' weeks'), note: 'Prototype calendar dates. Undated records are available in Add events and are not assumed to belong to this period.' };
}

function manualProgrammeEvents() {
  const draft = manualCoachingDraft();
  return draft ? availableEvidenceEvents(draft, 'driver').filter(event => event.categoryId === draft.categoryId) : [];
}

function manualPeriodEvents() {
  if (!manualCoachingDraft()) return [];
  const window = manualEvidenceWindow();
  return window.calendar ? manualProgrammeEvents().filter(event => {
    const time = manualEvidenceDate(event);
    return time !== null && time >= window.start && time < window.end;
  }) : [];
}

function resetManualCoachingEvidence() {
  if (!manualCoachingState) return;
  const evidence = manualSuggestedEvents();
  manualCoachingState.selectedEvents = new Set(evidence.map(event => event.id));
  manualCoachingState.previewId = null;
  manualCoachingState.clipId = null;
  manualCoachingState.addedEvents = new Set();
  manualCoachingState.picker = null;
}

function manualSuggestedEvents() {
  // Programme videos already assigned to this driver are relevant even if undated.
  // Non-video patterns retain the programme's configured observation period.
  const patterns = manualPeriodEvents();
  const videos = manualProgrammeEvents().filter(event => eventClips(event).length);
  return [...new Map([...videos, ...patterns].map(event => [event.id, event])).values()];
}

function openManualCoaching(prefill = null) {
  if (!prefill) pendingCandidateId = null;
  const editing = prefill?.editSessionId ? sessions.find(item => item.id === prefill.editSessionId) : null;
  manualCoachingState = editing ? {
    mode: 'edit', editSessionId: editing.id, programId: editing.categoryId, person: editing.person,
    reason: editing.reason || '', selectedEvents: new Set(), previewId: null, clipId: null, breakdownOpen: false,
    profileName: null, fromProgram: false, opener: document.activeElement
  } : {
    mode: 'create', editSessionId: null,
    programId: categories.some(item => item.id === prefill?.categoryId) ? prefill.categoryId : '',
    person: prefill?.person || '', selectedEvents: new Set(),
    previewId: null, clipId: null, breakdownOpen: false,
    profileName: typeof activeDriverProfile !== 'undefined' && driverDrawer.classList.contains('is-profile') ? activeDriverProfile : null,
    fromProgram: currentView === 'programs', opener: document.activeElement
  };
  if (!editing) resetManualCoachingEvidence();
  trainingDialog.classList.add('dialog', 'drawer', 'manual-coaching-dialog', 'is-open');
  trainingDialog.querySelector('form').classList.add('manual-coaching-form');
  trainingDialog.querySelector('header').classList.add('drawer-header', 'sw-header', 'manual-coaching-header');
  trainingDialogContent.classList.add('manual-coaching-content');
  renderManualCoaching();
  if (!trainingDialog.open) trainingDialog.showModal();
  document.getElementById(editing ? 'manual-session-reason' : manualCoachingState.person ? 'manual-category-select' : 'manual-driver-select')?.focus();
}

function manualCoachingHeader() {
  const draft = manualCoachingState;
  const editing = manualEditingSession();
  const ready = Boolean(manualCoachingDraft()) && !draft.picker;
  const program = categories.find(item => item.id === draft.programId);
  const context = editing
    ? 'One-on-one coaching · ' + editing.person + ' · opened by ' + (editing.owner || 'a manager')
    : 'One-on-one coaching · ' + (draft.person && program ? draft.person + ' · ' + program.name : draft.person || program?.name || 'choose a driver and a program');
  return '<div class="sw-header-identity"><div class="sw-identity"><span class="person-avatar" aria-hidden="true">' + (draft.person ? escapeHtml(initials(draft.person)) : '+') + '</span><div><h2 id="training-dialog-title">' + (editing ? 'Edit session' : 'Create session') + '</h2><span class="sw-program">' + escapeHtml(context) + '</span></div></div></div>' +
    '<div class="sw-header-actions"><button class="secondary-button" value="cancel">Cancel</button><button class="primary-button" type="button" data-confirm-manual-session' + (ready ? '' : ' disabled') + '>' + (editing ? 'Save changes' : 'Create session') + '</button><button class="icon-button" type="button" value="cancel" formmethod="dialog" data-manual-close aria-label="Close one-on-one coaching">×</button></div>';
}

function manualSelect(id, label, options, value, { disabled = false, placeholder = '', help = '' } = {}) {
  return '<label class="field manual-field"><span class="field-label">' + escapeHtml(label) + '</span><select class="filter-control" id="' + id + '"' + (disabled ? ' disabled' : '') + (help ? ' aria-describedby="' + id + '-help"' : '') + '>' +
    (placeholder ? '<option value="">' + escapeHtml(placeholder) + '</option>' : '') + options + '</select>' + (help ? '<small class="caption" id="' + id + '-help">' + escapeHtml(help) + '</small>' : '') + '</label>';
}

function renderManualCoaching() {
  const draft = manualCoachingState;
  if (!draft) return;
  const editing = manualEditingSession();
  const names = [...new Set([draft.person, ...directory.map(driver => driver.name), ...sessions.map(session => session.person)].filter(Boolean))].sort((a, b) => a.localeCompare(b));
  const coach = editing?.owner || currentManager.name;
  trainingDialog.querySelector('header').innerHTML = manualCoachingHeader();
  trainingDialogContent.innerHTML = '<div class="manual-coaching-body">' +
    '<section class="manual-coaching-details" aria-label="Session details"><div class="manual-field-grid">' +
      manualSelect('manual-driver-select', 'Driver', names.map(name => '<option' + (draft.person === name ? ' selected' : '') + '>' + escapeHtml(name) + '</option>').join(''), draft.person, { placeholder: 'Choose driver', disabled: Boolean(editing), help: editing ? 'Fixed once evidence is linked.' : '' }) +
      manualSelect('manual-category-select', 'Programme', categories.map(item => '<option value="' + escapeHtml(item.id) + '"' + (draft.programId === item.id ? ' selected' : '') + '>' + escapeHtml(item.name) + '</option>').join(''), draft.programId, { placeholder: 'Choose programme', disabled: Boolean(editing), help: editing ? 'Fixed once evidence is linked.' : '' }) +
      '<dl class="manual-coach-summary manual-field--full"><dt>Coach</dt><dd id="manual-coach-value">' + escapeHtml(coach) + (coach === currentManager.name ? ' <span class="caption">(you)</span>' : '') + '</dd></dl>' +
      (editing ? '<label class="field manual-field manual-field--full"><span class="field-label">Reason (optional)</span><textarea class="filter-control" id="manual-session-reason" rows="4" placeholder="What would you like to discuss?">' + escapeHtml(draft.reason) + '</textarea></label>' : '') +
    '</div></section>' +
    '<section class="manual-evidence-pane" aria-labelledby="manual-evidence-title"><header class="manual-evidence-header"><h3 class="section-title" id="manual-evidence-title">Evidence</h3>' + (editing ? '' : '<button class="text-link" type="button" data-manual-browse-events aria-expanded="' + Boolean(draft.picker) + '" aria-controls="manual-event-picker"' + (manualCoachingDraft() ? '' : ' disabled') + '>Add events</button>') + '</header><div id="manual-coaching-evidence"></div></section></div>';
  renderManualCoachingEvidence();
}

function renderManualCoachingEvidence() {
  const host = document.getElementById('manual-coaching-evidence');
  if (!host) return;
  const editing = manualEditingSession();
  if (editing) {
    const linked = sessionEvidenceEvents(editing);
    host.innerHTML = linked.length
      ? manualEvidenceTable(linked, { readOnly: true }) + '<p class="caption">Add or share more events from the session itself.</p>'
      : '<p class="caption">No events linked yet. Add events from the session itself.</p>';
    mountWorkspaceMaps(host);
    return;
  }
  const session = manualCoachingDraft();
  if (!session) { host.innerHTML = '<p class="caption manual-evidence-empty">Related videos appear here once a driver and programme are chosen.</p>'; return; }
  const draft = manualCoachingState;
  const window = manualEvidenceWindow();
  const programmeEvents = manualSuggestedEvents();
  const groups = workspaceBreakdown(session, programmeEvents);
  const chosen = selectedWorkspaceEvents(session, draft.selectedEvents);
  const added = selectedWorkspaceEvents(session, draft.addedEvents || []);
  const visible = [...new Map([...programmeEvents, ...added, ...chosen].map(event => [event.id, event])).values()];
  host.innerHTML = '<div class="stack program-section-stack manual-evidence-stack">' +
    (groups.length ? '<details id="manual-evidence-breakdown"' + (draft.breakdownOpen ? ' open' : '') + '><summary>' + escapeHtml(session.category) + ' breakdown</summary><ul class="sw-breakdown">' + groups.map(group => '<li><b>' + group.count + '</b><span>' + escapeHtml(group.label) + '</span></li>').join('') + '</ul></details>' : '<p class="caption">No matching evidence for this driver and programme.</p>') +
    (visible.length ? manualEvidenceTable(visible) : '') +
    '<div class="manual-evidence-total"><span class="caption" role="status" data-manual-selection-summary>' + escapeHtml(workspaceSelectionLabel(chosen)) + ' selected</span><button class="hint-trigger" type="button" aria-label="About programme evidence" data-tooltip="' + escapeHtml('Videos assigned to this driver and programme are selected automatically, including every camera clip. Non-video patterns use ' + window.label + '. ' + window.note) + '">' + uiIcon('info') + '</button></div></div><div id="manual-event-picker"' + (draft.picker ? '' : ' hidden') + '></div>';
  if (draft.picker) renderManualEventPicker();
  mountWorkspaceMaps(host);
}

function openManualEvidenceBrowser(opener) {
  const session = manualCoachingDraft();
  if (!session) return;
  if (manualCoachingState.picker) return closeManualEventPicker(false);
  manualCoachingState.picker = { scope: 'driver', query: '', selected: new Set(), previewId: null, clipId: null };
  trainingDialog.querySelector('header').innerHTML = manualCoachingHeader();
  renderManualCoachingEvidence();
  opener.setAttribute('aria-expanded', 'true');
  document.getElementById('manual-event-search')?.focus();
}

function manualEvidenceTable(events, { picker = false, readOnly = false } = {}) {
  const draft = manualCoachingState;
  const state = picker ? draft.picker : draft;
  const rows = events.map(event => {
    const id = (picker ? 'manual-picker-row-' : 'manual-row-') + encodeURIComponent(event.id);
    const included = !picker && readOnly || draft.selectedEvents.has(event.id);
    const checked = picker ? included || state.selected.has(event.id) : included;
    const expanded = state.previewId === event.id;
    const selectAttr = picker ? 'data-manual-picker-select' : 'data-manual-event';
    const previewAttr = picker ? 'data-manual-picker-preview' : 'data-manual-preview';
    const select = '<label class="manual-event-selection"><input type="checkbox" ' + selectAttr + '="' + escapeHtml(event.id) + '" aria-label="' + escapeHtml((included && picker ? 'Already included: ' : 'Include ') + event.title) + '"' + (checked ? ' checked' : '') + (readOnly || picker && included ? ' disabled' : '') + '></label>';
    return '<tr id="' + id + '" data-selected="' + checked + '"><td>' + select + '</td><td><button type="button" class="manual-event-toggle" ' + previewAttr + '="' + escapeHtml(event.id) + '" aria-expanded="' + expanded + '" aria-controls="' + id + '-detail">' + uiIcon('chevron') + '<span>' + escapeHtml(event.title) + '</span></button></td><td>' + escapeHtml(event.time || 'Date unavailable') + '</td><td class="num">' + eventClips(event).length + '</td></tr>' +
      '<tr class="manual-evidence-expanded" id="' + id + '-detail" data-detail-for="' + id + '"' + (expanded ? '' : ' hidden') + '><td colspan="4">' + (expanded ? '<div class="manual-evidence-preview" role="region" aria-label="' + escapeHtml(event.title + ' evidence') + '">' + workspaceMedia(event, 'manual', state.clipId) + '</div>' : '') + '</td></tr>';
  }).join('');
  return '<div class="manual-evidence-table">' + uiTable(picker ? 'Available programme events' : 'Session evidence', ['', 'Event', 'Recorded', { label: 'Videos', numeric: true }], rows) + '</div>';
}

function manualPickerEvents() {
  const session = manualCoachingDraft();
  const picker = manualCoachingState?.picker;
  if (!session || !picker) return [];
  return availableEvidenceEvents(session, picker.scope).filter(event => event.categoryId === session.categoryId).filter(event =>
    [event.title, event.eventType, event.time, event.location, event.vehicle, event.source].filter(Boolean).join(' ').toLowerCase().includes(picker.query.trim().toLowerCase()));
}

function renderManualEventPicker() {
  const picker = manualCoachingState?.picker;
  const host = document.getElementById('manual-event-picker');
  if (!picker || !host) return;
  host.hidden = false;
  host.className = 'manual-event-picker';
  host.setAttribute('role', 'region'); host.setAttribute('aria-labelledby', 'manual-picker-title');
  host.innerHTML = '<header class="manual-picker-heading"><h3 class="section-title" id="manual-picker-title">Add events</h3><div class="manual-picker-actions"><button class="secondary-button" type="button" data-manual-picker-cancel>Cancel</button><button class="primary-button" type="button" data-manual-picker-apply disabled>Add selected</button></div></header>' +
    '<div class="manual-picker-toolbar"><div class="view-tabs" role="tablist" aria-label="Event source">' + [['driver', 'This driver'], ['unassigned', 'Unassigned']].map(([scope, label]) => '<button class="view-tab" type="button" id="manual-picker-tab-' + scope + '" role="tab" data-manual-picker-scope="' + scope + '" aria-selected="' + (picker.scope === scope) + '" aria-controls="manual-event-results" tabindex="' + (picker.scope === scope ? 0 : -1) + '">' + label + '</button>').join('') + '</div><label class="search-control">' + searchGlyph + '<span class="sr-only">Search events</span><input id="manual-event-search" type="search" autocomplete="off" placeholder="Search events" value="' + escapeHtml(picker.query) + '"></label></div><div id="manual-event-results" role="tabpanel" aria-labelledby="manual-picker-tab-' + picker.scope + '"></div><p class="caption" id="manual-picker-selection" role="status"></p>';
  renderManualEventResults();
}

function renderManualEventResults() {
  const picker = manualCoachingState?.picker;
  const results = document.getElementById('manual-event-results');
  if (!picker || !results) return;
  const events = manualPickerEvents();
  results.innerHTML = events.length ? manualEvidenceTable(events, { picker: true }) : '<p class="manual-evidence-empty caption">No matching events.</p>';
  updateManualPickerSelection();
  mountWorkspaceMaps(results);
}

function updateManualPickerSelection() {
  const picker = manualCoachingState?.picker;
  if (!picker) return;
  const selected = selectedWorkspaceEvents(manualCoachingDraft(), picker.selected).filter(event => event.categoryId === manualCoachingState.programId && !manualCoachingState.selectedEvents.has(event.id));
  document.getElementById('manual-picker-selection').textContent = selected.length ? workspaceSelectionLabel(selected) + ' to add' : 'Select events to add.';
  document.querySelector('[data-manual-picker-apply]').disabled = selected.length === 0;
}

function closeManualEventPicker(apply) {
  const draft = manualCoachingState;
  if (!draft?.picker) return;
  if (apply) selectedWorkspaceEvents(manualCoachingDraft(), draft.picker.selected).filter(event => event.categoryId === draft.programId).forEach(event => {
    draft.selectedEvents.add(event.id);
    draft.addedEvents.add(event.id);
  });
  draft.picker = null;
  trainingDialog.querySelector('header').innerHTML = manualCoachingHeader();
  renderManualCoachingEvidence();
  const opener = document.querySelector('[data-manual-browse-events]');
  opener?.setAttribute('aria-expanded', 'false'); opener?.focus({ preventScroll: true });
}

function readManualCoachingFields() {
  const draft = manualCoachingState;
  if (!draft) return;
  draft.reason = document.getElementById('manual-session-reason')?.value.trim() ?? draft.reason;
}

function saveManualCoachingEdits(record) {
  const draft = manualCoachingState;
  readManualCoachingFields();
  const program = categories.find(item => item.id === record.categoryId);
  const changes = [];
  if ((record.reason || '') !== draft.reason) {
    changes.push('reason updated');
    record.reason = draft.reason;
    record.summary = draft.reason || 'One-on-one coaching for ' + (program?.name || record.category) + '.';
  }
  if (changes.length) {
    record.history = record.history || [];
    record.history.push(['Session updated · ' + changes.join(', '), 'Just now']);
    record.latest = 'Session updated · just now';
  }
  manualCoachingState = null;
  trainingDialog.close();
  if (typeof renderSessionDrawer === 'function' && activeSessionId === record.id) renderSessionDrawer();
  if (currentView === 'inbox') renderInbox();
  showToast(changes.length ? 'Session updated' : 'No changes to save');
}

function createManualCoaching() {
  const draft = manualCoachingState;
  const editing = manualEditingSession();
  if (editing) return saveManualCoachingEdits(editing);
  const proposed = manualCoachingDraft();
  if (!draft || !proposed || draft.picker) return;
  readManualCoachingFields();
  const program = categories.find(item => item.id === draft.programId);
  const selected = selectedWorkspaceEvents(proposed, draft.selectedEvents);
  const owner = currentManager.name;
  const record = {
    ...proposed, id: 'manual-' + Date.now(), initials: initials(draft.person), eventType: program.name,
    stateLabel: 'One-on-one', attentionReason: null, weeksAgo: 0,
    latest: 'Manual session created · just now', owner, due: globalSessionDueLabel(), dueDays: globalSessionDueDays(), sla: '', slaTone: '',
    source: 'One-on-one', automationRun: 'Manager initiated',
    lesson: null, lessonId: null, reason: '',
    summary: 'One-on-one coaching for ' + program.name + '.',
    evidence: [], evidenceEventIds: [], messages: [], history: [['Manual session created', 'Just now']],
    evidencePeriod: { label: manualEvidenceWindow().label, calendarEnd: manualEvidenceCalendarEnd }
  };
  sessions.unshift(record);
  const linked = linkEvidenceEvents(record, selected.map(event => event.id));
  if (linked.length) record.messages.push({ author: 'manager', text: '', time: 'Just now', events: linked.map(event => event.id), clips: linked.flatMap(eventClips).map(clip => clip.id) });
  if (linked.length) record.history.push([linked.length + (linked.length === 1 ? ' event attached' : ' events attached'), 'Just now']);
  const candidate = reviewCandidates.find(item => item.id === pendingCandidateId && !item.started);
  if (candidate) { candidate.started = true; record.history.push(['Flagged for review', candidate.flagged]); }
  pendingCandidateId = null;
  manualCoachingState = null;
  trainingDialog.close();
  adjustSessionFleetTotals();
  syncDirectoryAttentionState(record.person, false);
  syncGroupDisplay();
  if (draft.profileName === record.person && typeof restoreProfileAfterManualSession === 'function') restoreProfileAfterManualSession(record.id);
  else {
    if (driverDrawer.open) closeDrawer(false);
    openSessionDrawer(record.id, { type: draft.fromProgram ? 'program-page' : currentView === 'coaching' ? 'automation-centre' : 'sessions' });
  }
  showToast('One-on-one session created for ' + record.person);
}

document.addEventListener('change', event => {
  if (!manualCoachingState) return;
  if (event.target.id === 'manual-category-select' || event.target.id === 'manual-driver-select') {
    readManualCoachingFields();
    manualCoachingState[event.target.id === 'manual-category-select' ? 'programId' : 'person'] = event.target.value;
    resetManualCoachingEvidence();
    renderManualCoaching();
    document.getElementById(event.target.id)?.focus();
    return;
  }
  if (event.target.matches('[data-manual-event]')) {
    if (event.target.checked) manualCoachingState.selectedEvents.add(event.target.dataset.manualEvent);
    else manualCoachingState.selectedEvents.delete(event.target.dataset.manualEvent);
    event.target.closest('tr').dataset.selected = String(event.target.checked);
    const summary = document.querySelector('[data-manual-selection-summary]');
    if (summary) summary.textContent = workspaceSelectionLabel(selectedWorkspaceEvents(manualCoachingDraft(), manualCoachingState.selectedEvents)) + ' selected';
  }
  if (event.target.matches('[data-manual-picker-select]') && manualCoachingState.picker) {
    const id = event.target.dataset.manualPickerSelect;
    if (manualCoachingState.selectedEvents.has(id) || !manualPickerEvents().some(item => item.id === id)) return;
    if (event.target.checked) manualCoachingState.picker.selected.add(id);
    else manualCoachingState.picker.selected.delete(id);
    event.target.closest('tr').dataset.selected = String(event.target.checked);
    updateManualPickerSelection();
  }
});
document.addEventListener('input', event => {
  if (event.target.id !== 'manual-event-search' || !manualCoachingState?.picker) return;
  manualCoachingState.picker.query = event.target.value;
  renderManualEventResults();
});
document.addEventListener('cancel', event => {
  if (event.target.id === 'training-dialog' && manualCoachingState?.picker) {
    event.preventDefault();
    closeManualEventPicker(false);
  }
}, true);
document.addEventListener('close', event => {
  if (event.target.id === 'training-dialog' && !event.target.open) {
    const opener = manualCoachingState?.opener;
    manualCoachingState = null;
    event.target.classList.remove('is-open');
    if (opener?.isConnected) opener.focus({ preventScroll: true });
  }
}, true);
document.addEventListener('toggle', event => {
  if (manualCoachingState && event.target.id === 'manual-evidence-breakdown' && event.target.isConnected) manualCoachingState.breakdownOpen = event.target.open;
}, true);
document.addEventListener('click', event => {
  const edit = event.target.closest('[data-edit-session]');
  if (edit && typeof activeSessionId !== 'undefined' && activeSessionId) { openManualCoaching({ editSessionId: activeSessionId }); return; }
  if (!manualCoachingState) return;
  if (event.target.closest('[data-manual-close]')) { trainingDialog.close(); return; }
  if (event.target.closest('[data-manual-picker-cancel]')) { closeManualEventPicker(false); return; }
  if (event.target.closest('[data-manual-picker-apply]')) { closeManualEventPicker(true); return; }
  const browse = event.target.closest('[data-manual-browse-events]');
  if (browse) { openManualEvidenceBrowser(browse); return; }
  const scope = event.target.closest('[data-manual-picker-scope]');
  if (scope && manualCoachingState.picker) {
    manualCoachingState.picker.scope = scope.dataset.manualPickerScope;
    manualCoachingState.picker.previewId = null;
    manualCoachingState.picker.clipId = null;
    renderManualEventPicker();
    document.getElementById('manual-picker-tab-' + scope.dataset.manualPickerScope)?.focus({ preventScroll: true });
    return;
  }
  const pickerPreview = event.target.closest('[data-manual-picker-preview]');
  if (pickerPreview && manualCoachingState.picker) {
    const picker = manualCoachingState.picker;
    picker.previewId = picker.previewId === pickerPreview.dataset.manualPickerPreview ? null : pickerPreview.dataset.manualPickerPreview;
    picker.clipId = null;
    renderManualEventResults();
    [...document.querySelectorAll('[data-manual-picker-preview]')].find(node => node.dataset.manualPickerPreview === pickerPreview.dataset.manualPickerPreview)?.focus({ preventScroll: true });
    return;
  }
  const preview = event.target.closest('[data-manual-preview]');
  if (preview) {
    manualCoachingState.previewId = manualCoachingState.previewId === preview.dataset.manualPreview ? null : preview.dataset.manualPreview;
    manualCoachingState.clipId = null;
    renderManualCoachingEvidence();
    [...document.querySelectorAll('[data-manual-preview]')].find(node => node.dataset.manualPreview === preview.dataset.manualPreview)?.focus({ preventScroll: true });
  }
  const camera = event.target.closest('[data-sw-camera][data-camera-context="manual"]');
  if (camera) {
    const inPicker = Boolean(camera.closest('#manual-event-picker'));
    if (inPicker && manualCoachingState.picker) { manualCoachingState.picker.clipId = camera.dataset.swCamera; renderManualEventResults(); }
    else { manualCoachingState.clipId = camera.dataset.swCamera; renderManualCoachingEvidence(); }
    [...document.querySelectorAll('[data-sw-camera][data-camera-context="manual"]')].find(node => node.dataset.swCamera === camera.dataset.swCamera && Boolean(node.closest('#manual-event-picker')) === inPicker)?.focus({ preventScroll: true });
  }
});
