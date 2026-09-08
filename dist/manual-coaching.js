/* One-on-one sessions: one page to create, and the same page to edit. A draft is never a ledger
   record; evidence is linked only on Create. Layout mirrors the session workspace (header with
   identity and actions, details on the left, evidence on the right). */
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
  manualCoachingState.previewId = evidence.find(event => eventClips(event).length)?.id || null;
  manualCoachingState.clipId = null;
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
  const ready = Boolean(manualCoachingDraft());
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
  trainingDialogContent.innerHTML = '<div class="sw-body manual-coaching-body">' +
    '<section class="manual-coaching-scroll manual-coaching-details" aria-label="Session details"><div class="manual-field-grid">' +
      manualSelect('manual-driver-select', 'Driver', names.map(name => '<option' + (draft.person === name ? ' selected' : '') + '>' + escapeHtml(name) + '</option>').join(''), draft.person, { placeholder: 'Choose driver', disabled: Boolean(editing), help: editing ? 'Fixed once evidence is linked.' : '' }) +
      manualSelect('manual-category-select', 'Programme', categories.map(item => '<option value="' + escapeHtml(item.id) + '"' + (draft.programId === item.id ? ' selected' : '') + '>' + escapeHtml(item.name) + '</option>').join(''), draft.programId, { placeholder: 'Choose programme', disabled: Boolean(editing), help: editing ? 'Fixed once evidence is linked.' : '' }) +
      '<dl class="manual-coach-summary manual-field--full"><dt>Coach</dt><dd id="manual-coach-value">' + escapeHtml(coach) + (coach === currentManager.name ? ' <span class="caption">(you)</span>' : '') + '</dd></dl>' +
      (editing ? '<label class="field manual-field manual-field--full"><span class="field-label">Reason (optional)</span><textarea class="filter-control" id="manual-session-reason" rows="4" placeholder="What would you like to discuss?">' + escapeHtml(draft.reason) + '</textarea></label>' : '') +
    '</div></section>' +
    '<aside class="drawer drawer--persistent sw-evidence-pane manual-evidence-pane" aria-label="Session evidence"><header class="drawer__header manual-evidence-header"><h3 class="drawer__title">Evidence</h3>' + (editing ? '' : '<button class="text-link" type="button" data-manual-browse-events' + (manualCoachingDraft() ? '' : ' disabled') + '>Add events</button>') + '</header><div class="drawer__body" id="manual-coaching-evidence"></div></aside></div>';
  renderManualCoachingEvidence();
}

function renderManualCoachingEvidence() {
  const host = document.getElementById('manual-coaching-evidence');
  if (!host) return;
  const editing = manualEditingSession();
  if (editing) {
    const linked = sessionEvidenceEvents(editing);
    host.innerHTML = linked.length
      ? '<ul class="sw-clip-list manual-event-list">' + linked.map(event => '<li class="manual-event-readonly"><span class="sw-clip-title"><strong>' + escapeHtml(event.title) + '</strong><small>' + escapeHtml([event.time || 'Date unavailable', workspaceSelectionLabel([event])].join(' · ')) + '</small></span></li>').join('') + '</ul><p class="caption">Add or share more events from the session itself.</p>'
      : '<p class="caption">No events linked yet. Add events from the session itself.</p>';
    return;
  }
  const session = manualCoachingDraft();
  if (!session) { host.innerHTML = '<p class="caption manual-evidence-empty">Related videos appear here once a driver and programme are chosen.</p>'; return; }
  const draft = manualCoachingState;
  const window = manualEvidenceWindow();
  const programmeEvents = manualSuggestedEvents();
  const groups = workspaceBreakdown(session, programmeEvents);
  const chosen = selectedWorkspaceEvents(session, draft.selectedEvents);
  const visible = [...new Map([...programmeEvents, ...chosen].map(event => [event.id, event])).values()];
  const rows = visible.map(event => '<li><label class="manual-event-selection"><input type="checkbox" data-manual-event="' + escapeHtml(event.id) + '" aria-label="Include ' + escapeHtml(event.title) + '"' + (draft.selectedEvents.has(event.id) ? ' checked' : '') + '></label><button type="button" data-manual-preview="' + escapeHtml(event.id) + '" aria-expanded="' + (draft.previewId === event.id) + '"><span class="sw-clip-title"><strong>' + escapeHtml(event.title) + '</strong><small>' + escapeHtml([event.time || 'Date unavailable', workspaceSelectionLabel([event]), !event.person ? 'Unassigned' : ''].filter(Boolean).join(' · ')) + '</small></span>' + uiIcon('chevron') + '</button></li>').join('');
  const preview = visible.find(event => event.id === draft.previewId);
  host.innerHTML = '<div class="stack program-section-stack manual-evidence-stack"><p class="caption">' + escapeHtml(session.category) + ' <button class="hint-trigger" type="button" aria-label="About programme evidence" data-tooltip="' + escapeHtml('Videos assigned to this driver and programme are selected automatically, including every camera clip. Non-video patterns use ' + window.label + '. ' + window.note) + '">' + uiIcon('info') + '</button></p>' +
    (groups.length ? '<details id="manual-evidence-breakdown"' + (draft.breakdownOpen ? ' open' : '') + '><summary>' + escapeHtml(session.category) + ' breakdown</summary><ul class="sw-breakdown">' + groups.map(group => '<li><b>' + group.count + '</b><span>' + escapeHtml(group.label) + '</span></li>').join('') + '</ul></details>' : '<p class="caption">No matching evidence for this driver and programme.</p>') +
    (rows ? '<ul class="sw-clip-list manual-event-list">' + rows + '</ul>' : '') +
    (preview ? '<div class="manual-evidence-preview">' + workspaceMedia(preview, 'manual', draft.clipId) + '</div>' : '') +
    '<p class="caption" data-manual-selection-summary>' + escapeHtml(workspaceSelectionLabel(chosen)) + ' selected</p></div>';
  if (preview) mountWorkspaceMaps(host);
}

function openManualEvidenceBrowser(opener) {
  const session = manualCoachingDraft();
  if (!session) return;
  openSessionEventBrowser(opener, {
    session, eventId: manualCoachingState.previewId,
    selectedEvents: manualCoachingState.selectedEvents,
    filterEvent: event => event.categoryId === session.categoryId,
    onApply: selection => { manualCoachingState.selectedEvents = selection; renderManualCoachingEvidence(); return document.querySelector('[data-manual-browse-events]'); }
  });
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
  if (!draft || !proposed) return;
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
    const summary = document.querySelector('[data-manual-selection-summary]');
    if (summary) summary.textContent = workspaceSelectionLabel(selectedWorkspaceEvents(manualCoachingDraft(), manualCoachingState.selectedEvents)) + ' selected';
  }
});
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
  const browse = event.target.closest('[data-manual-browse-events]');
  if (browse) openManualEvidenceBrowser(browse);
  const preview = event.target.closest('[data-manual-preview]');
  if (preview) {
    manualCoachingState.previewId = manualCoachingState.previewId === preview.dataset.manualPreview ? null : preview.dataset.manualPreview;
    manualCoachingState.clipId = null;
    renderManualCoachingEvidence();
    document.querySelector('[data-manual-preview="' + preview.dataset.manualPreview + '"]')?.focus({ preventScroll: true });
  }
  const camera = event.target.closest('[data-sw-camera][data-camera-context="manual"]');
  if (camera) { manualCoachingState.clipId = camera.dataset.swCamera; renderManualCoachingEvidence(); }
});
