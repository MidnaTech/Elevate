/* Driver identity is separate from an individual coaching session. */
let activeDriverProfile = null;
let driverProfileFilter = 'all';
let profileRulesExpanded = false;
let profileExpandedProgrammes = new Set();
let driverProfileReturnState = null;
let profileEventView = 'exceptions';
let profileExpandedEvent = null;
let profileEventClip = null;

function saveProfileSessionDraft() {
  saveSessionWorkspaceDraft();
}

function driverProfileRecords(name) {
  return sessions.filter(session => session.person === name);
}

/* The current score is dated separately from the observed driving week. */
function profileScoreComparison(driver) {
  const scored = Number.isFinite(driver.safetyScore);
  const changed = scored && Number.isFinite(driver.scoreChange);
  const previous = changed ? driver.safetyScore - driver.scoreChange : null;
  const context = (!scored ? 'Not enough data to score' : changed ? 'Previous ' + previous + ' · ' + (driver.scoreChange > 0 ? '+' : '') + driver.scoreChange + ' points · dates unavailable' : 'Previous score unavailable') + '. Recorded prototype score; the weighted program roll-up is not configured yet.';
  return uiKpi({ label: 'Latest Elevate score', value: scored ? driver.safetyScore : '—', context, meter: scored ? { value: driver.safetyScore, max: 100 } : null }).replace('class="kpi-tile"', 'class="kpi-tile profile-score" data-week-metric="score"');
}

function profileWeeklyOverview(driver) {
  const record = typeof driverActivity !== 'undefined' ? driverActivity[driver.name] : null;
  const days = record?.days || [];
  const totals = days.reduce((sum, day) => ({ miles: sum.miles + day.miles, trips: sum.trips + day.trips, driven: sum.driven + (day.miles > 0 ? 1 : 0) }), { miles: 0, trips: 0, driven: 0 });
  const metric = (key, label, value, context) => uiKpi({ label, value, context }).replace('class="kpi-tile"', 'class="kpi-tile" data-week-metric="' + key + '"');
  return '<section class="profile-week" aria-labelledby="profile-week-title"><header class="profile-week-head"><h3 id="profile-week-title">This week</h3><span class="profile-meta">' + escapeHtml(record?.week || 'No observed week') + '</span></header><section class="kpi-strip" tabindex="0" aria-label="Driver score and observed driving">' + profileScoreComparison(driver) +
    metric('miles', 'Miles', record ? totals.miles.toLocaleString('en-US') : '—', record ? 'Illustrative · ' + record.week : 'No dated observations') + metric('trips', 'Trips', record ? totals.trips : '—', record ? record.week : 'No dated observations') + metric('days', 'Days driven', record ? totals.driven + ' of ' + days.length : '—', record ? record.week : 'No dated observations') + '</section>' + chartDailyMiles(driver, record) + '</section>';
}

const profileMonths = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

function profileEventWhen(event) {
  const text = String(event.time || '');
  const matches = Array.from(text.matchAll(/(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)\s+(\d{1,2})/g));
  const last = matches[matches.length - 1];
  return { label: text || 'Date not recorded', sortKey: last ? profileMonths.indexOf(last[1]) * 31 + Number(last[2]) : -1 };
}

function profileDriverEvents(name) {
  const events = new Map();
  driverProfileRecords(name).forEach(session => sessionEvidenceEvents(session).forEach(event => {
    if (event.person !== name) return;
    const existing = events.get(event.id);
    if (existing) existing.sessions.push(session);
    else events.set(event.id, { event, session, sessions: [session], when: profileEventWhen(event) });
  }));
  return [...events.values()].map(entry => {
    const source = sessions.find(session => session.id === entry.event.sourceSessionId);
    entry.dismissed = Boolean(source && (/^Dismissed\b/i.test(source.due || '') || source.history?.some(item => /event dismissed/i.test(item[0]))));
    entry.workflow = source?.eventType === 'Training delivery failed';
    entry.session = entry.sessions.find(session => session.id === entry.event.sourceSessionId) || entry.session;
    return entry;
  }).filter(entry => !entry.workflow).sort((a, b) => b.when.sortKey - a.when.sortKey || a.event.id.localeCompare(b.event.id));
}

function profileRuleBreakdown(name) {
  // Current sessions: evidence still linked to a session that has not been archived.
  const records = profileDriverEvents(name).filter(entry => !entry.dismissed && entry.sessions.some(session => session.state !== 'archived'));
  const rules = new Map();
  records.forEach(({ event }) => {
    const rule = event.categoryName || event.eventType;
    rules.set(rule, (rules.get(rule) || 0) + 1);
  });
  const sorted = [...rules].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]));
  return '<details class="profile-rules" id="profile-rule-breakdown"' + (profileRulesExpanded ? ' open' : '') + '><summary class="profile-rules-head"><span id="profile-rules-title">Rule breakdown</span><span class="profile-meta profile-rule-count">' + records.length + (records.length === 1 ? ' record' : ' records') + '</span></summary><p class="profile-meta">Unique source evidence in non-archived sessions; patterns count once. Dismissed events and delivery failures are excluded.</p><div class="profile-rule-list">' +
    (sorted.length ? sorted.map(([label, count]) => '<div class="profile-rule-row"><strong>' + escapeHtml(label) + '</strong><b>' + count + '</b></div>').join('') : '<p class="profile-empty-inline">No rule evidence recorded</p>') + '</div></details>';
}

function profileEventPanel(entry) {
  const { event, session } = entry;
  const [icon, label] = compactSessionStatus(session);
  const facts = [event.severity && event.severity + ' severity', event.source, event.vehicle].filter(Boolean);
  return '<div class="profile-event-panel" id="profile-event-panel-' + escapeHtml(event.id) + '">' + workspaceMedia(event, 'profile', profileEventClip) +
    (facts.length ? '<div class="profile-event-facts">' + facts.map(fact => '<span>' + escapeHtml(fact) + '</span>').join('') + '</div>' : '') +
    '<footer class="profile-event-footer"><span><strong>' + escapeHtml(session.category) + '</strong><span class="profile-session-status ' + sessionStatusClass(session) + '">' + uiIcon(icon) + escapeHtml(label) + '</span>' + (entry.sessions.length > 1 ? '<small class="profile-meta">Linked to ' + entry.sessions.length + ' sessions</small>' : '') + '</span><button class="secondary-button" type="button" data-open-session="' + escapeHtml(session.id) + '" data-profile-event-session="' + escapeHtml(event.id) + '" aria-label="Open ' + escapeHtml(session.category) + ' session for ' + escapeHtml(session.person) + '">Open session' + uiIcon('chevron') + '</button></footer></div>';
}

function profileEventRow(entry) {
  const { event, when } = entry;
  const expanded = profileExpandedEvent === event.id;
  const video = eventClips(event).length > 0;
  const meta = [entry.dismissed && 'Dismissed', when.label].filter(Boolean).join(' · ');
  return '<li class="profile-event' + (expanded ? ' is-expanded' : '') + '"><button class="profile-event-row" type="button" data-profile-event="' + escapeHtml(event.id) + '" aria-expanded="' + expanded + '" aria-controls="profile-event-panel-' + escapeHtml(event.id) + '">' +
    '<span class="profile-event-main"><strong>' + escapeHtml(event.title) + '</strong><small>' + escapeHtml(meta) + '</small></span><span class="profile-event-kind">' + (video ? event.clips.length + (event.clips.length === 1 ? ' video' : ' videos') : 'Pattern') + '</span>' + uiIcon('chevron') + '</button>' +
    (expanded ? profileEventPanel(entry) : '') + '</li>';
}

function renderProfileEvents() {
  const container = document.getElementById('profile-events');
  if (!container || !activeDriverProfile) return;
  const events = profileDriverEvents(activeDriverProfile);
  const visible = events.filter(entry => profileEventView !== 'videos' || eventClips(entry.event).length > 0);
  if (profileExpandedEvent && !visible.some(entry => entry.event.id === profileExpandedEvent)) profileExpandedEvent = null;
  const sources = [...new Set(events.map(entry => entry.event.source).filter(Boolean))];
  const tabs = [['exceptions', 'Exceptions'], ['videos', 'Videos']];
  container.innerHTML = '<div class="profile-section-toolbar"><div class="profile-section-head"><div><h3 id="profile-events-title">Recent exceptions</h3><p class="profile-meta">Rule exceptions' + (sources.length ? ' · from ' + escapeHtml(sources.join(', ')) : '') + '<button class="info-hint" type="button" aria-label="About recent exceptions" data-tooltip="Recorded incidents and patterns linked to this driver, newest first across available dates. Video shows only events with clips. Each event appears once; dismissed history remains labeled and is excluded from the rule breakdown.">' + uiIcon('info') + '</button></p></div></div>' +
    '<div class="view-tabs profile-segments" role="tablist" aria-label="Recent exception scope">' + tabs.map(([key, label]) => '<button type="button" role="tab" id="profile-event-tab-' + key + '" data-profile-event-view="' + key + '" class="' + (profileEventView === key ? 'is-active' : '') + '" aria-selected="' + (profileEventView === key) + '" aria-controls="profile-event-list" tabindex="' + (profileEventView === key ? 0 : -1) + '">' + label + '</button>').join('') + '</div></div>' +
    (visible.length ? '<ul class="profile-event-list" id="profile-event-list" role="tabpanel" aria-labelledby="profile-event-tab-' + profileEventView + '" tabindex="0">' + visible.map(profileEventRow).join('') + '</ul>' : '<div class="profile-events-empty" id="profile-event-list" role="tabpanel" aria-labelledby="profile-event-tab-' + profileEventView + '" tabindex="0">' + uiIcon(profileEventView === 'videos' ? 'video' : 'chart') + '<p>' + (profileEventView === 'videos' ? 'No videos recorded' : 'No exceptions recorded') + '</p></div>');
  if (typeof mountWorkspaceMaps === 'function') mountWorkspaceMaps(container);
}

/* One programme portfolio. Filters change displayed history, never the source ledger. */
function profileDueLabel(session) {
  const due = session.due || 'not set';
  if (/^Resolve\b/i.test(due)) return due;
  return 'Due ' + (/^(Within|Today|Tomorrow|Completed|Closed)\b/i.test(due) ? due.charAt(0).toLowerCase() + due.slice(1) : due);
}

function profileSessionRow(session, hasPrimaryAction = false) {
  const [icon, label] = compactSessionStatus(session);
  const archived = session.state === 'archived';
  const recordedTime = (session.latest || '').split(/\s*·\s*/).slice(-1)[0].replace(/^(?:Coaching\s+)?(?:completed|archived)\s*/i, '').trim();
  return '<div class="profile-session-row" data-profile-session="' + escapeHtml(session.id) + '"><span class="profile-session-program"><small>' + escapeHtml(session.state === 'completed' || archived ? recordedTime : profileDueLabel(session)) + '</small></span><span class="profile-session-status ' + sessionStatusClass(session) + '">' + uiIcon(icon) + escapeHtml(label) + '</span>' + (hasPrimaryAction ? '' : '<button class="secondary-button" type="button" id="profile-session-' + escapeHtml(session.id) + '" data-open-session="' + escapeHtml(session.id) + '" aria-label="Open ' + escapeHtml(session.category) + ' session for ' + escapeHtml(session.person) + '">Open session' + uiIcon('chevron') + '</button>') + '</div>';
}

function profileMatchesCoachingFilter(session) {
  if (driverProfileFilter === 'completed') return session.state === 'completed';
  if (driverProfileFilter === 'archived') return session.state === 'archived';
  if (driverProfileFilter === 'active') return !['completed', 'archived'].includes(session.state);
  return true;
}

function renderDriverProfileSessions() {
  const panel = document.getElementById('profile-coaching-list');
  if (!panel || !activeDriverProfile) return;
  const priority = { manager_attention: 0, system_handling: 1, completed: 2, archived: 3 };
  const records = driverProfileRecords(activeDriverProfile).filter(profileMatchesCoachingFilter)
    .sort((a, b) => (priority[a.state] ?? 1) - (priority[b.state] ?? 1));
  const programmes = categories.filter(programme => driverProfileFilter === 'all' || records.some(session => session.categoryId === programme.id));
  const rows = programmes.map(programme => {
    const matching = records.filter(session => session.categoryId === programme.id);
    const active = matching.find(session => !['completed', 'archived'].includes(session.state));
    const focus = active || (['completed', 'archived'].includes(driverProfileFilter) ? matching[0] : null);
    const action = focus
      ? '<button class="text-link" type="button" id="profile-programme-session-' + escapeHtml(programme.id) + '" data-open-session="' + escapeHtml(focus.id) + '" aria-label="View ' + escapeHtml(programme.name) + ' session for ' + escapeHtml(activeDriverProfile) + '">View session</button>'
      : '<button class="text-link" type="button" id="profile-create-' + escapeHtml(programme.id) + '" data-profile-create-session="' + escapeHtml(programme.id) + '" aria-label="Create ' + escapeHtml(programme.name) + ' session for ' + escapeHtml(activeDriverProfile) + '">Create session</button>';
    const history = matching.length
      ? '<details class="profile-programme-history" data-profile-programme-history="' + escapeHtml(programme.id) + '"' + (profileExpandedProgrammes.has(programme.id) ? ' open' : '') + '><summary aria-label="Show ' + matching.length + ' ' + escapeHtml(programme.name) + ' sessions">' + matching.length + (matching.length === 1 ? ' session' : ' sessions') + '</summary><div class="profile-programme-sessions">' + matching.map(session => profileSessionRow(session, session.id === focus?.id)).join('') + '</div></details>'
      : '<span class="caption" aria-label="No sessions">—</span>';
    // A fleet-wide programme score is not a driver-level programme score. No such source exists yet.
    return '<tr data-profile-programme="' + escapeHtml(programme.id) + '"><th scope="row">' + escapeHtml(programme.name) + '</th><td class="num" data-profile-programme-score="' + escapeHtml(programme.id) + '"><span aria-label="Programme score unavailable">—</span></td><td data-sort-value="' + matching.length + '">' + history + '</td><td>' + action + '</td></tr>';
  }).join('');
  panel.innerHTML = rows ? uiTable(activeDriverProfile + ' programme coaching', ['Programme', { label: 'Programme score', numeric: true }, { label: 'Sessions', numeric: true }, 'Action'], rows) : '<p class="profile-empty-inline">No ' + escapeHtml(driverProfileFilter) + ' sessions recorded</p>';
  const select = document.getElementById('profile-coaching-filter');
  if (select) select.value = driverProfileFilter;
  if (typeof applyDesignLibrary === 'function') applyDesignLibrary(panel);
}

function openProfileManualSession(categoryId = '') {
  if (!activeDriverProfile) return;
  saveProfileSessionDraft();
  driverProfileReturnState = { scroll: document.querySelector('.profile-scroll')?.scrollTop || 0, openerId: document.activeElement?.id || null };
  openManualSessionDialog({ person: activeDriverProfile, ...(categoryId ? { categoryId } : {}) });
}

function restoreProfileAfterManualSession(sessionId) {
  const session = sessions.find(record => record.id === sessionId);
  if (!session || !activeDriverProfile || session.person !== activeDriverProfile) return;
  driverProfileFilter = 'active';
  profileExpandedProgrammes.add(session.categoryId);
  const scroll = driverProfileReturnState?.scroll || 0;
  renderDriverProfile();
  if (typeof applyDesignLibrary === 'function') applyDesignLibrary(driverDrawerContent);
  const source = document.getElementById('profile-session-' + sessionId) || document.getElementById('profile-programme-session-' + session.categoryId);
  source?.focus({ preventScroll: true });
  const panel = document.querySelector('.profile-scroll');
  if (panel) panel.scrollTop = scroll;
  openProfileSession(sessionId);
}

function renderDriverProfile() {
  const driver = directory.find(item => item.name === activeDriverProfile);
  if (!driver) return;
  const coachingOptions = [['all', 'All programmes'], ['active', 'Active'], ['completed', 'Completed'], ['archived', 'Archived']];
  driverDrawerContent.innerHTML = '<div class="profile-shell"><header class="drawer-header profile-header"><div class="profile-identity"><span class="person-avatar" aria-hidden="true">' + driver.initials + '</span><div><h2 id="driver-drawer-title">' + escapeHtml(driver.name) + '</h2><p>' + escapeHtml(driver.group) + '</p></div></div><div class="profile-header-actions"><button class="secondary-button" id="profile-create-session" type="button" data-profile-create-session>Create session</button><button class="icon-button" type="button" data-close-drawer aria-label="Close driver profile">' + uiIcon('close') + '</button></div></header><div class="profile-scroll">' + profileWeeklyOverview(driver) + profileRuleBreakdown(driver.name) +
    '<section class="profile-coaching" id="profile-coaching" aria-labelledby="profile-coaching-title"><div class="profile-section-toolbar"><div class="profile-section-head"><h3 id="profile-coaching-title">Coaching</h3><button class="info-hint" type="button" aria-label="About programme scores and coaching history" data-tooltip="Every configured programme is listed. Driver-level programme scores and evaluation periods are unavailable; the overall Elevate score is separate. Session history includes all recorded dates.">' + uiIcon('info') + '</button></div><label class="field"><span class="sr-only">Coaching filter</span><select class="filter-control" id="profile-coaching-filter">' + coachingOptions.map(([key, label]) => '<option value="' + key + '"' + (driverProfileFilter === key ? ' selected' : '') + '>' + label + '</option>').join('') + '</select></label></div><div class="profile-coaching-list" id="profile-coaching-list"></div></section>' +
    '<section class="profile-events" id="profile-events" aria-labelledby="profile-events-title"></section></div></div>';
  renderDriverProfileSessions();
  renderProfileEvents();
}

function openDriverProfile(name, options = {}) {
  if (!directory.some(item => item.name === name)) return;
  const wasOpen = driverDrawer.classList.contains('is-open');
  if (!wasOpen) drawerOpener = options.opener || document.activeElement;
  if (!options.restore) {
    driverProfileFilter = 'all';
    profileRulesExpanded = false;
    profileExpandedProgrammes = new Set();
    driverProfileReturnState = null;
    profileEventView = 'exceptions';
    profileExpandedEvent = null;
    profileEventClip = null;
  }
  saveProfileSessionDraft();
  activeDriverProfile = name;
  activeSessionId = null;
  sessionDrawerOrigin = null;
  renderDriverProfile();
  driverDrawer.classList.remove('is-session');
  driverDrawer.classList.add('is-open', 'is-profile');
  driverDrawer.inert = false;
  if (!driverDrawer.open) driverDrawer.showModal();
  driverDrawer.setAttribute('aria-hidden', 'false');
  drawerBackdrop.hidden = false;
  document.getElementById('app-shell').inert = true;
  document.body.style.overflow = 'hidden';
  updateUrlState(true);
  if (options.restore && driverProfileReturnState) {
    const saved = driverProfileReturnState;
    document.querySelector('.profile-scroll').scrollTop = saved.scroll;
    const opener = saved.openerId && document.getElementById(saved.openerId) || (saved.eventOpener ? document.querySelector('[data-profile-event-session="' + saved.eventOpener + '"]') : Array.from(document.querySelectorAll('.profile-coaching [data-open-session]')).find(button => button.dataset.openSession === saved.sessionId));
    (opener || document.getElementById('profile-coaching-filter'))?.focus({ preventScroll: true });
  } else driverDrawer.querySelector('[data-close-drawer]')?.focus({ preventScroll: true });
}

function openProfileSession(sessionId) {
  const name = activeDriverProfile;
  if (!name || !driverProfileRecords(name).some(session => session.id === sessionId)) return;
  driverProfileReturnState = {
    sessionId, scroll: document.querySelector('.profile-scroll').scrollTop,
    eventOpener: document.activeElement?.dataset.profileEventSession || null,
    openerId: document.activeElement?.id || null
  };
  openSessionDrawer(sessionId, { type: 'driver-profile', driverName: name });

}

document.addEventListener('click', event => {
  const profile = event.target.closest('[data-open-driver-profile]');
  // The name opens the portfolio; the separate Action cell opens coaching.
  if (profile) openDriverProfile(profile.dataset.openDriverProfile, { opener: profile.matches('button') ? profile : profile.querySelector('.directory-person') || undefined });
  const back = event.target.closest('[data-back-driver-profile]');
  if (back && sessionDrawerOrigin?.driverName) {
    saveProfileSessionDraft();
    openDriverProfile(sessionDrawerOrigin.driverName, { restore: true });
  }
  const create = event.target.closest('[data-profile-create-session]');
  if (create) openProfileManualSession(create.dataset.profileCreateSession || '');
  const eventView = event.target.closest('[data-profile-event-view]');
  if (eventView) {
    profileEventView = eventView.dataset.profileEventView;
    renderProfileEvents();
    document.querySelector('[data-profile-event-view="' + profileEventView + '"]')?.focus();
  }
  const eventToggle = event.target.closest('[data-profile-event]');
  if (eventToggle) {
    const id = eventToggle.dataset.profileEvent;
    profileExpandedEvent = profileExpandedEvent === id ? null : id;
    profileEventClip = null;
    renderProfileEvents();
    document.querySelector('[data-profile-event="' + id + '"]')?.focus({ preventScroll: true });
    if (profileExpandedEvent) document.getElementById('profile-event-panel-' + id)?.scrollIntoView({ block: 'nearest' });
  }
  const camera = event.target.closest('[data-sw-camera][data-camera-context="profile"]');
  if (camera) {
    profileEventClip = camera.dataset.swCamera;
    renderProfileEvents();
    document.querySelector('[data-sw-camera="' + profileEventClip + '"][data-camera-context="profile"]')?.focus({ preventScroll: true });
  }
});

document.addEventListener('change', event => {
  if (event.target.id !== 'profile-coaching-filter') return;
  driverProfileFilter = ['all', 'active', 'completed', 'archived'].includes(event.target.value) ? event.target.value : 'all';
  renderDriverProfileSessions();
  document.getElementById('profile-coaching-filter')?.focus({ preventScroll: true });
});
document.addEventListener('toggle', event => {
  if (event.target.id === 'profile-rule-breakdown') profileRulesExpanded = event.target.open;
  const programme = event.target.dataset?.profileProgrammeHistory;
  if (!programme) return;
  if (event.target.open) profileExpandedProgrammes.add(programme);
  else profileExpandedProgrammes.delete(programme);
}, true);
