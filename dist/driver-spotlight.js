/* Driver identity is separate from an individual coaching session. */
let activeDriverProfile = null;
let driverProfileFilter = 'current';
let driverProfileShowAll = false;
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
  const context = !scored ? 'Not enough data to score' : changed ? 'Previous ' + previous + ' · ' + (driver.scoreChange > 0 ? '+' : '') + driver.scoreChange + ' points · dates unavailable' : 'Previous score unavailable';
  return uiKpi({ label: 'Latest safety score', value: scored ? driver.safetyScore : '—', context, meter: scored ? { value: driver.safetyScore, max: 100 } : null }).replace('class="kpi-tile"', 'class="kpi-tile profile-score" data-week-metric="score"');
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
  return '<section class="profile-rules" id="profile-rule-breakdown" aria-labelledby="profile-rules-title"><div class="profile-section-head profile-rules-head"><div><h3 id="profile-rules-title">Rule breakdown</h3><p class="profile-meta">Recorded evidence · current sessions<button class="info-hint" type="button" aria-label="About rule breakdown" data-tooltip="Unique source evidence records grouped by their original rule, from this driver’s sessions that are not archived. A pattern spanning several trips counts as one record. Dismissed events and delivery failures are excluded. This is not a count of individual violations.">' + uiIcon('info') + '</button></p></div><span class="profile-meta profile-rule-count">' + records.length + (records.length === 1 ? ' record' : ' records') + '</span></div><div class="profile-rule-list">' +
    (sorted.length ? sorted.map(([label, count]) => '<div class="profile-rule-row"><strong>' + escapeHtml(label) + '</strong><b>' + count + '</b></div>').join('') : '<p class="profile-empty-inline">No rule evidence recorded</p>') + '</div></section>';
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
  const tabs = [['exceptions', 'Exceptions'], ['videos', 'Video']];
  container.innerHTML = '<div class="profile-section-toolbar"><div class="profile-section-head"><div><h3 id="profile-events-title">Recent exceptions</h3><p class="profile-meta">Rule exceptions' + (sources.length ? ' · from ' + escapeHtml(sources.join(', ')) : '') + '<button class="info-hint" type="button" aria-label="About recent exceptions" data-tooltip="Recorded incidents and patterns linked to this driver, newest first across available dates. Video shows only events with clips. Each event appears once; dismissed history remains labeled and is excluded from the rule breakdown.">' + uiIcon('info') + '</button></p></div></div>' +
    '<div class="view-tabs profile-segments" role="tablist" aria-label="Recent exception scope">' + tabs.map(([key, label]) => '<button type="button" role="tab" id="profile-event-tab-' + key + '" data-profile-event-view="' + key + '" class="' + (profileEventView === key ? 'is-active' : '') + '" aria-selected="' + (profileEventView === key) + '" aria-controls="profile-event-list" tabindex="' + (profileEventView === key ? 0 : -1) + '">' + label + '</button>').join('') + '</div></div>' +
    (visible.length ? '<ul class="profile-event-list" id="profile-event-list" role="tabpanel" aria-labelledby="profile-event-tab-' + profileEventView + '" tabindex="0">' + visible.map(profileEventRow).join('') + '</ul>' : '<div class="profile-events-empty" id="profile-event-list" role="tabpanel" aria-labelledby="profile-event-tab-' + profileEventView + '" tabindex="0">' + uiIcon(profileEventView === 'videos' ? 'video' : 'chart') + '<p>' + (profileEventView === 'videos' ? 'No videos recorded' : 'No exceptions recorded') + '</p></div>');
  if (typeof mountWorkspaceMaps === 'function') mountWorkspaceMaps(container);
}

/* One coaching list with Current and Past scopes. The scope never changes the session ledger. */
function profileDueLabel(session) {
  const due = session.due || 'not set';
  if (/^Resolve\b/i.test(due)) return due;
  return 'Due ' + (/^(Within|Today|Tomorrow|Completed|Closed)\b/i.test(due) ? due.charAt(0).toLowerCase() + due.slice(1) : due);
}

function profileSessionRow(session) {
  const [icon, label] = compactSessionStatus(session);
  const archived = session.state === 'archived';
  const recordedTime = (session.latest || '').split(/\s*·\s*/).slice(-1)[0].replace(/^(?:Coaching\s+)?(?:completed|archived)\s*/i, '').trim();
  return '<div class="profile-session-row" data-profile-session="' + escapeHtml(session.id) + '"><span class="profile-session-program"><strong>' + escapeHtml(session.category) + '</strong><small>' + escapeHtml(session.state === 'completed' || archived ? recordedTime : profileDueLabel(session)) + '</small></span><span class="profile-session-status ' + sessionStatusClass(session) + '">' + uiIcon(icon) + escapeHtml(label) + '</span><button class="secondary-button" type="button" data-open-session="' + escapeHtml(session.id) + '" aria-label="Open ' + escapeHtml(session.category) + ' session for ' + escapeHtml(session.person) + '">Open session' + uiIcon('chevron') + '</button></div>';
}

function profilePendingReview(flag) {
  return '<div class="profile-session-row" data-profile-review="' + escapeHtml(flag.id) + '"><span class="profile-session-program"><strong>' + escapeHtml(flag.category) + '</strong><small>' + escapeHtml(flag.trigger + ' · ' + flag.detail) + '</small></span><span class="profile-session-status repeat">' + uiIcon('alert') + 'Needs review</span><button class="secondary-button" type="button" data-profile-start-review="' + escapeHtml(flag.id) + '">Start session' + uiIcon('chevron') + '</button></div>';
}

function renderDriverProfileSessions() {
  const panel = document.getElementById('profile-coaching-list');
  if (!panel) return;
  const priority = { manager_attention: 0, system_handling: 1, completed: 2, archived: 3 };
  const isPast = session => ['completed', 'archived'].includes(session.state);
  const records = driverProfileRecords(activeDriverProfile).filter(session => driverProfileFilter === 'past' ? isPast(session) : !isPast(session)).sort((a, b) => priority[a.state] - priority[b.state]);
  const pending = driverProfileFilter === 'current' ? activeCandidates().filter(flag => flag.person === activeDriverProfile) : [];
  const visible = driverProfileShowAll ? records : records.slice(0, 5);
  document.querySelectorAll('[data-profile-coaching-view]').forEach(tab => { const active = tab.dataset.profileCoachingView === driverProfileFilter; tab.classList.toggle('is-active', active); tab.setAttribute('aria-selected', String(active)); tab.tabIndex = active ? 0 : -1; });
  panel.innerHTML = pending.map(profilePendingReview).join('') + (visible.length ? visible.map(profileSessionRow).join('') : pending.length ? '' : '<p class="profile-empty-inline">' + (driverProfileFilter === 'past' ? 'No past coaching recorded' : 'No current coaching') + '</p>') +
    (records.length > 5 ? '<button class="profile-show-all" type="button" data-profile-show-all>' + (driverProfileShowAll ? 'Show fewer' : 'Show all ' + records.length + ' sessions') + '</button>' : '');
}

function renderDriverProfile() {
  const driver = directory.find(item => item.name === activeDriverProfile);
  if (!driver) return;
  const coachingTabs = [['current', 'Current sessions'], ['past', 'Past sessions']];
  driverDrawerContent.innerHTML = '<div class="profile-shell"><header class="drawer-header profile-header"><div class="profile-identity"><span class="person-avatar" aria-hidden="true">' + driver.initials + '</span><div><h2 id="driver-drawer-title">' + escapeHtml(driver.name) + '</h2><p>' + escapeHtml(driver.group) + '</p></div></div><button class="icon-button" type="button" data-close-drawer aria-label="Close driver profile">' + uiIcon('close') + '</button></header><div class="profile-scroll">' + profileWeeklyOverview(driver) + profileRuleBreakdown(driver.name) +
    '<section class="profile-events" id="profile-events" aria-labelledby="profile-events-title"></section>' +
    '<section class="profile-coaching" aria-labelledby="profile-coaching-title"><div class="profile-section-toolbar"><div class="profile-section-head"><h3 id="profile-coaching-title">Coaching</h3></div><div class="view-tabs profile-segments" role="tablist" aria-label="Coaching scope">' + coachingTabs.map(([key, label]) => '<button type="button" role="tab" id="profile-coaching-tab-' + key + '" data-profile-coaching-view="' + key + '" aria-controls="profile-coaching-list">' + label + '</button>').join('') + '</div></div><div class="profile-coaching-list" id="profile-coaching-list" role="tabpanel"></div></section></div></div>';
  renderDriverProfileSessions();
  renderProfileEvents();
}

function openDriverProfile(name, options = {}) {
  if (!directory.some(item => item.name === name)) return;
  const wasOpen = driverDrawer.classList.contains('is-open');
  if (!wasOpen) drawerOpener = options.opener || document.activeElement;
  if (!options.restore) {
    driverProfileShowAll = false;
    driverProfileFilter = 'current';
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
    const opener = saved.eventOpener ? document.querySelector('[data-profile-event-session="' + saved.eventOpener + '"]') : Array.from(document.querySelectorAll('.profile-coaching [data-open-session]')).find(button => button.dataset.openSession === saved.sessionId);
    (opener || document.querySelector('[data-profile-coaching-view][aria-selected="true"]'))?.focus({ preventScroll: true });
  } else driverDrawer.querySelector('[data-close-drawer]')?.focus({ preventScroll: true });
}

function openProfileSession(sessionId) {
  const name = activeDriverProfile;
  if (!name || !driverProfileRecords(name).some(session => session.id === sessionId)) return;
  driverProfileReturnState = {
    sessionId, scroll: document.querySelector('.profile-scroll').scrollTop,
    eventOpener: document.activeElement?.dataset.profileEventSession || null
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
  const pendingReview = event.target.closest('[data-profile-start-review]');
  if (pendingReview) startSessionForCandidate(pendingReview.dataset.profileStartReview);
  const showAll = event.target.closest('[data-profile-show-all]');
  if (showAll) {
    driverProfileShowAll = !driverProfileShowAll;
    renderDriverProfileSessions();
    document.querySelector('[data-profile-show-all]')?.focus();
  }
  const coachingView = event.target.closest('[data-profile-coaching-view]');
  if (coachingView) {
    driverProfileFilter = coachingView.dataset.profileCoachingView;
    driverProfileShowAll = false;
    renderDriverProfileSessions();
    document.querySelector('[data-profile-coaching-view="' + driverProfileFilter + '"]')?.focus();
  }
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
