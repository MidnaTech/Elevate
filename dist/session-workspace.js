/* One evidence workspace and one conversation, with drafts owned by the session. */
const sessionWorkspaceStates = new Map();
let sessionEventBrowser = null;

function sessionWorkspaceState(session) {
  if (!sessionWorkspaceStates.has(session.id)) {
    const events = sessionEvidenceEvents(session);
    const shared = new Set((session.messages || []).flatMap(message => message.events || []));
    sessionWorkspaceStates.set(session.id, {
      drafts: { reply: '', note: '' }, carets: { reply: [0, 0], note: [0, 0] }, mode: 'reply',
      selectedEvents: new Set(events.filter(event => !shared.has(event.id)).map(event => event.id)),
      eventId: events[0]?.id || null, clipId: eventClips(events[0])[0]?.id || null, viewerOpen: false, breakdownOpen: true
    });
  }
  return sessionWorkspaceStates.get(session.id);
}

function workspaceSession() { return sessions.find(session => session.id === activeSessionId); }
function sessionIsReadOnly(session) { return ['completed', 'archived'].includes(session.state); }
function sessionCanReply(session) { return !sessionIsReadOnly(session); }

function saveSessionWorkspaceDraft() {
  const session = workspaceSession();
  const input = document.getElementById('reply-text');
  if (!session || !input || input.closest('.sw-shell')?.dataset.sessionId !== session.id) return;
  const state = sessionWorkspaceState(session);
  state.drafts[state.mode] = input.value;
  state.carets[state.mode] = [input.selectionStart, input.selectionEnd];
}

function selectedWorkspaceEvents(session, selection = sessionWorkspaceState(session).selectedEvents) {
  if (sessionIsReadOnly(session)) return [];
  const available = new Set([...availableEvidenceEvents(session, 'driver'), ...availableEvidenceEvents(session, 'unassigned')].map(event => event.id));
  return [...selection].filter(id => available.has(id)).map(evidenceEvent).filter(Boolean);
}

function workspaceSelectionLabel(events) {
  const clips = events.reduce((sum, event) => sum + eventClips(event).length, 0);
  const patterns = events.filter(event => event.kind !== 'video').length;
  return [clips || !patterns ? clips + (clips === 1 ? ' clip' : ' clips') : '', patterns ? patterns + (patterns === 1 ? ' pattern' : ' patterns') : ''].filter(Boolean).join(' · ');
}

function workspaceRoadArt(camera) {
  return '<svg class="sw-road-art" viewBox="0 0 640 400" preserveAspectRatio="xMidYMid slice" aria-hidden="true"><rect width="640" height="400" fill="#91a6b4"/><path d="M0 158 60 126 110 155 168 122 242 150 311 133 395 164 503 118 570 151 640 123V260H0Z" fill="#657b70"/><path d="M0 204 280 174 350 174 640 203V400H0Z" fill="#94a28e"/><path d="m282 174-261 226h598L347 174Z" fill="#64727e"/><path d="M305 175 190 400m138-225 127 225" stroke="#e4e7dc" stroke-width="4" stroke-dasharray="19 23"/><path d="m284 176-211 224m273-224 231 224" stroke="#c7cec5" stroke-width="3"/><g class="sw-demo-vehicle"><rect x="299" y="214" width="39" height="34" rx="4" fill="#e2e7e9"/><rect x="303" y="217" width="31" height="12" rx="2" fill="#506a80"/><path d="M299 244h39" stroke="#964846" stroke-width="4"/></g><path d="M0 383q320-52 640 0v17H0Z" fill="#253547"/>' + (camera === 'Cab' ? '<path d="M0 0h110l45 155-20 245H0ZM640 0H530l-45 155 20 245h135Z" fill="#203043b8"/>' : '') + '</svg>';
}

let leafletLoader = null;
function ensureLeaflet() {
  if (window.L?.map) return Promise.resolve(window.L);
  if (!leafletLoader) leafletLoader = new Promise((resolve, reject) => {
    const base = 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/';
    if (!document.querySelector('link[data-leaflet]')) {
      const link = document.createElement('link');
      link.rel = 'stylesheet'; link.href = base + 'leaflet.min.css'; link.dataset.leaflet = '';
      document.head.appendChild(link);
    }
    const script = document.createElement('script');
    script.src = base + 'leaflet.min.js'; script.async = true;
    script.onload = () => resolve(window.L);
    script.onerror = () => { leafletLoader = null; reject(new Error('Leaflet unavailable')); };
    document.head.appendChild(script);
  });
  return leafletLoader;
}

// Incident maps mount after their markup is in the DOM. Without Leaflet the recorded position still shows through an embed.
function mountWorkspaceMaps(root = document) {
  const stages = [...root.querySelectorAll('[data-sw-leaflet]:not([data-mounted])')];
  if (!stages.length) return;
  stages.forEach(stage => { stage.dataset.mounted = 'pending'; });
  ensureLeaflet().then(L => {
    // The stylesheet may still be loading, so name the marker image path explicitly.
    L.Icon.Default.imagePath = 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/';
    stages.forEach(stage => {
      if (!stage.isConnected) return;
      const lat = Number(stage.dataset.lat), lon = Number(stage.dataset.lon);
      const map = L.map(stage, { scrollWheelZoom: false }).setView([lat, lon], 15);
      L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', { maxZoom: 19, attribution: '&copy; <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener">OpenStreetMap</a>' }).addTo(map);
      L.marker([lat, lon], { keyboard: false }).addTo(map);
      stage.dataset.mounted = 'true';
      requestAnimationFrame(() => map.invalidateSize());
    });
  }).catch(() => {
    stages.forEach(stage => {
      if (!stage.isConnected) return;
      const lat = Number(stage.dataset.lat), lon = Number(stage.dataset.lon);
      const bounds = [lon - .007, lat - .005, lon + .007, lat + .005].join(',');
      stage.dataset.mounted = 'fallback';
      stage.innerHTML = '<iframe title="Incident location map" loading="lazy" referrerpolicy="no-referrer" src="https://www.openstreetmap.org/export/embed.html?bbox=' + encodeURIComponent(bounds) + '&amp;layer=mapnik&amp;marker=' + encodeURIComponent(lat + ',' + lon) + '"></iframe>';
    });
  });
}

function workspaceMap(event) {
  const location = event?.location;
  const coordinates = event?.coordinates;
  const valid = coordinates && Number.isFinite(coordinates.latitude) && Number.isFinite(coordinates.longitude) && Math.abs(coordinates.latitude) <= 90 && Math.abs(coordinates.longitude) <= 180;
  if (valid) {
    const { latitude: lat, longitude: lon } = coordinates;
    return '<div class="sw-map"><div class="sw-map-stage" data-sw-leaflet data-lat="' + lat + '" data-lon="' + lon + '" aria-label="Incident location map"></div>' +
      (location ? '<div class="sw-map-caption">' + uiIcon('pin') + '<span>' + escapeHtml(location) + '</span></div>' : '') +
      '<div class="sw-map-footer"><span class="sw-map-coordinates">' + lat.toFixed(5) + ', ' + lon.toFixed(5) + '</span><a class="sw-map-link" href="https://www.google.com/maps?q=' + encodeURIComponent(lat + ',' + lon) + '" target="_blank" rel="noopener">Open in Google Maps' + uiIcon('external') + '</a></div></div>';
  }
  const map = '<div class="sw-map-unavailable"><svg viewBox="0 0 260 240" preserveAspectRatio="xMidYMid slice" aria-hidden="true"><rect width="260" height="240" fill="#edf1ee"/><path d="M12 16h61v60H12Zm144 141h90v67h-90Z" fill="#d7e4d8"/><path d="M95 14h135v60H95ZM8 108h108v96H8Zm139-4h95v34h-95Z" fill="#e0e6e5"/><g stroke="#fff" stroke-width="13" fill="none"><path d="M83-10v260M-10 89h280M132 93v155"/><path d="M-20 245Q113 81 276 8" stroke-width="20"/></g></svg><div>' + uiIcon('map') + '<span>' + (location ? 'Coordinates unavailable' : 'Location unavailable') + '</span></div></div>';
  return '<div class="sw-map">' + map + '<div class="sw-map-caption">' + uiIcon('map') + '<span>' + (location ? escapeHtml(location) + '<small>Illustrative map</small>' : 'Illustrative map') + '</span></div></div>';
}

function workspaceMedia(event, context, requestedClipId) {
  if (!event) return '<div class="sw-notice">' + uiIcon('video') + '<strong>No event evidence recorded</strong></div>';
  const clips = eventClips(event);
  const clip = clips.find(item => item.id === requestedClipId) || clips[0];
  const pattern = !clip;
  const video = pattern
    ? '<div class="sw-pattern" data-pattern-event="' + escapeHtml(event.id) + '">' + uiIcon('chart') + '<strong>' + escapeHtml(event.title) + '</strong><span>' + escapeHtml(event.duration || event.time || 'Recorded pattern') + '</span><small>Event data · no video</small></div>'
    : '<div class="sw-video" data-media-event="' + escapeHtml(event.id) + '" data-media-clip="' + escapeHtml(clip.id) + '">' +
      (clip.mediaUrl ? '<video controls preload="metadata" playsinline src="' + escapeHtml(clip.mediaUrl) + '"' + (clip.thumbnailUrl ? ' poster="' + escapeHtml(clip.thumbnailUrl) + '"' : '') + ' aria-label="' + escapeHtml(event.title) + '"></video>' : '<div class="sw-video-stage">' + workspaceRoadArt(clip.camera) + '<span class="sw-media-label">Illustrative footage</span><button class="sw-play" type="button" data-sw-play aria-pressed="false" aria-label="Play illustrative clip">' + playGlyph + '</button></div>') +
      '<div class="sw-playback"><span>' + escapeHtml(clip.camera || 'Camera') + '</span><span>' + escapeHtml(clip.duration || 'Duration unavailable') + '</span></div>' +
      (clips.length > 1 ? '<div class="sw-camera-tabs" role="group" aria-label="Camera angle">' + clips.map((camera, index) => '<button type="button" data-sw-camera="' + escapeHtml(camera.id) + '" data-camera-context="' + context + '" aria-pressed="' + (camera.id === clip.id) + '">' + escapeHtml(camera.camera || 'Camera ' + (index + 1)) + '</button>').join('') + '</div>' : '') + '</div>';
  return '<div class="sw-media-grid">' + workspaceMap(event) + video + '</div>';
}

function sessionOpenedLabel(session) {
  const opened = (session.history || []).find(([text]) => /assigned|created|opened|started/i.test(text));
  return opened?.[1] || session.automationRun || '';
}

function sessionWorkspaceHeader(session) {
  const [, label] = compactSessionStatus(session);
  const waiting = session.state === 'system_handling' && session.origin === 'automated';
  const action = session.state === 'completed' ? '<button class="secondary-button" type="button" data-archive-session>Archive</button>' : session.state === 'archived' ? '<button class="secondary-button" type="button" data-restore-session>Restore</button>' : waiting ? '' : '<button class="primary-button" type="button" data-complete-session>Complete session</button>';
  const coach = coachLabel(session);
  const opened = sessionOpenedLabel(session);
  const context = ['Coaching session', session.person, 'opened by ' + (coach === 'Automated' ? 'Autocoach' : coach) + (opened ? ', ' + opened : '')].join(' · ');
  return '<div class="sw-header-identity">' + (sessionDrawerOrigin?.type === 'driver-profile' ? '<button class="profile-back" type="button" data-back-driver-profile>← Driver profile</button>' : '') + '<div class="sw-identity"><span class="person-avatar" aria-hidden="true">' + session.initials + '</span><div><h2 id="driver-drawer-title">' + escapeHtml(session.category) + '</h2><span class="sw-program">' + escapeHtml(context) + '</span></div></div></div><div class="sw-header-actions"><span class="sw-status ' + sessionStatusClass(session) + '"' + (session.sla ? ' title="' + escapeHtml(session.sla) + '"' : '') + '><i class="sw-status-dot" aria-hidden="true"></i>' + escapeHtml(label) + (!sessionIsReadOnly(session) && session.due ? ' · ' + escapeHtml(session.due) : '') + '</span>' + action + '<button class="icon-button" type="button" data-close-drawer aria-label="Close session">' + uiIcon('close') + '</button></div>';
}

function renderSessionWorkspace(session) {
  const state = sessionWorkspaceState(session);
  return '<div class="sw-shell" data-session-id="' + escapeHtml(session.id) + '"><header class="drawer-header sw-header">' + sessionWorkspaceHeader(session) + '</header><div id="sw-kpis"></div><div class="sw-body"><aside class="drawer drawer--persistent sw-evidence-pane" aria-label="Session evidence"><header class="drawer__header"><h3 class="drawer__title">Evidence</h3></header><div class="drawer__body"><p class="sw-why">' + escapeHtml(session.summary) + '</p><div id="session-evidence"></div></div></aside><section class="sw-conversation-pane" aria-label="Session conversation"><div class="sw-conversation-scroll"><div class="sw-conversation-heading"><h3>Conversation</h3><div id="sw-activity"></div></div><div id="sw-messages"></div></div><div id="sw-composer-region">' + workspaceComposer(session, state) + '</div></section></div></div>';
}

function workspaceComposer(session, state) {
  if (sessionIsReadOnly(session)) return '';
  return '<div class="sw-composer"><div class="sw-composer-tools"><label><span class="sr-only">Message type</span><select id="session-composer-mode"><option value="reply"' + (state.mode === 'reply' ? ' selected' : '') + '>Reply to ' + escapeHtml(session.person.split(' ')[0]) + '</option><option value="note"' + (state.mode === 'note' ? ' selected' : '') + '>Private note</option></select></label><button class="text-action" type="button" data-open-session-events data-composer-attachment-count>' + uiIcon('paperclip') + '<span></span></button></div><label class="sr-only" id="sw-reply-label" for="reply-text">Reply</label><textarea id="reply-text" rows="3"></textarea><div class="sw-composer-footer"><span id="sw-message-visibility"></span><button class="primary-button" type="button" data-send-reply>Send</button></div></div>';
}

function updateWorkspaceComposer(session, restoreText = false) {
  const state = sessionWorkspaceState(session);
  const region = document.getElementById('sw-composer-region');
  if (!region) return;
  const kind = sessionIsReadOnly(session) ? 'readonly' : 'composer';
  if (region.dataset.kind !== kind) {
    region.innerHTML = workspaceComposer(session, state);
    region.dataset.kind = kind;
  }
  const addEvents = document.querySelector('.sw-evidence-pane [data-open-session-events]');
  if (addEvents) addEvents.hidden = !sessionCanReply(session) || state.mode === 'note';
  const input = region.querySelector('#reply-text');
  if (!input) return;
  document.getElementById('session-composer-mode').value = state.mode;
  const attachment = region.querySelector('[data-composer-attachment-count]');
  attachment.hidden = state.mode === 'note';
  const selectionLabel = workspaceSelectionLabel(selectedWorkspaceEvents(session));
  attachment.querySelector('span').textContent = selectionLabel ? selectionLabel + ' selected' : 'Attach videos';
  const isNote = state.mode === 'note';
  input.placeholder = isNote ? 'Add a private note…' : 'Write a reply…';
  document.getElementById('sw-reply-label').textContent = isNote ? 'Private note' : 'Reply to ' + session.person;
  document.getElementById('sw-message-visibility').textContent = isNote ? 'Visible only to your team' : 'Visible to ' + session.person.split(' ')[0];
  const send = region.querySelector('[data-send-reply]');
  send.textContent = isNote ? 'Save note' : 'Send';
  send.disabled = !state.drafts[state.mode].trim() && (isNote || !selectedWorkspaceEvents(session).length);
  if (restoreText) {
    input.value = state.drafts[state.mode];
    input.setSelectionRange(...state.carets[state.mode]);
  }
}

function workspaceBreakdown(session, events) {
  const groups = new Map();
  events.forEach(event => {
    const key = event.eventType || event.title;
    const group = groups.get(key) || { label: key, count: 0, sources: new Set(), sameProgram: !event.categoryId || event.categoryId === session.categoryId, categoryName: event.categoryName };
    group.count += 1;
    if (event.source) group.sources.add(event.source);
    groups.set(key, group);
  });
  return [...groups.values()].sort((a, b) => b.count - a.count);
}

function workspaceClipRow(session, state, item) {
  const clips = eventClips(item);
  const open = state.viewerOpen && item.id === state.eventId;
  const chip = clips.length
    ? '<span class="sw-clip-chip">' + uiIcon('play') + escapeHtml(clips[0].duration || 'Video') + '</span>'
    : '<span class="sw-clip-chip is-pattern">' + uiIcon('chart') + 'Pattern</span>';
  const primary = item.time || item.title;
  const secondary = [item.time ? item.title : '', clips.length > 1 ? clips.length + ' cameras' : '', !clips.length && item.duration ? item.duration : ''].filter(Boolean).join(' · ');
  return '<li' + (open ? ' class="is-open"' : '') + '><button type="button" data-session-event="' + escapeHtml(item.id) + '" aria-expanded="' + open + '">' + chip + '<span class="sw-clip-title"><strong>' + escapeHtml(primary) + '</strong>' + (secondary ? '<small>' + escapeHtml(secondary) + '</small>' : '') + '</span><span class="sw-clip-source">' + escapeHtml(item.source || '') + '</span></button>' +
    (open ? '<div class="sw-viewer" id="sw-viewer">' + workspaceMedia(item, 'main', state.clipId) + '<div class="sw-event-facts">' + [item.severity ? item.severity + ' severity' : '', item.vehicle].filter(Boolean).map(fact => '<span>' + escapeHtml(fact) + '</span>').join('') + '</div></div>' : '') + '</li>';
}

function updateWorkspaceEvidence(session) {
  const state = sessionWorkspaceState(session);
  const events = [...new Map([...sessionEvidenceEvents(session), ...selectedWorkspaceEvents(session)].map(event => [event.id, event])).values()];
  let event = events.find(item => item.id === state.eventId);
  if (!event) event = events[0] || null;
  state.eventId = event?.id || null;
  const clip = eventClips(event).find(item => item.id === state.clipId) || eventClips(event)[0];
  state.clipId = clip?.id || null;
  const host = document.getElementById('session-evidence');
  const canAdd = sessionCanReply(session) && state.mode !== 'note';
  const breakdown = workspaceBreakdown(session, events);
  const meta = events.length + (events.length === 1 ? ' event' : ' events') + (session.automationRun ? ' · ' + session.automationRun : '');
  host.innerHTML = '<section class="sw-group-card" aria-labelledby="sw-group-title"><div class="sw-group-head"><div><h3 id="sw-group-title">' + escapeHtml(session.category) + '</h3><span>' + escapeHtml(meta) + '</span></div>' +
    (breakdown.length ? '<button class="secondary-button sw-breakdown-toggle" type="button" data-toggle-breakdown aria-expanded="' + state.breakdownOpen + '" aria-controls="sw-breakdown">' + (state.breakdownOpen ? 'Hide breakdown' : 'Show breakdown') + uiIcon('chevron') + '</button>' : '') + '</div>' +
    (breakdown.length ? '<ul id="sw-breakdown" class="sw-breakdown"' + (state.breakdownOpen ? '' : ' hidden') + '>' + breakdown.map(group => '<li><b>' + group.count + '</b><span>' + escapeHtml(group.label) + '</span><small>' + escapeHtml([group.sameProgram && session.eventType ? 'Rule: ' + session.eventType : group.categoryName || '', [...group.sources].join(', ')].filter(Boolean).join(' · ')) + '</small></li>').join('') + '</ul>' : '') + '</section>' +
    '<div class="sw-section-heading"><h3>Videos</h3><button class="text-action" type="button" data-open-session-events' + (canAdd ? '' : ' hidden') + '>' + uiIcon('plus') + 'Add video</button></div>' +
    (events.length ? '<ul class="sw-clip-list">' + events.map(item => workspaceClipRow(session, state, item)).join('') + '</ul>' : '<div class="sw-notice">' + uiIcon('video') + '<strong>No event evidence recorded</strong></div>');
  mountWorkspaceMaps(host);
}

function workspaceMessageEvents(message) {
  return [...new Set([...(message.events || []), ...(message.clips || []).map(id => evidenceClip(id)?.eventId).filter(Boolean)])].map(evidenceEvent).filter(Boolean);
}

function updateWorkspaceConversation(session) {
  const messages = session.messages || [];
  const notes = message => message.author === 'note' || (message.author === 'system' && message.text.startsWith('Private note · '));
  const human = messages.filter(message => message.author !== 'system' || notes(message));
  // History is the canonical lifecycle log. System-only facts absent from it remain once.
  const activity = (session.history || []).map(([text, time]) => ({ text, time }));
  for (const message of messages.filter(message => message.author === 'system' && !notes(message))) {
    if (/^Sent \d+ clips? to /.test(message.text)) continue;
    const meaningful = message.text.toLowerCase().replace(/[’']/g, '');
    if (activity.some(item => meaningful.includes(item.text.toLowerCase().replace(/[’']/g, '')) || /assign|sent .*session|sent .*template/.test(meaningful) && /assign/.test(item.text.toLowerCase()) || /accept/.test(meaningful) && /accept/.test(item.text.toLowerCase()))) continue;
    activity.push({ text: message.text, time: message.time });
  }
  const open = document.getElementById('session-activity')?.open;
  document.getElementById('sw-activity').innerHTML = activity.length ? '<details id="session-activity"' + (open ? ' open' : '') + '><summary>Earlier activity · <span>' + activity.length + '</span>' + uiIcon('chevron') + '</summary><ol>' + activity.map(item => '<li><span>' + escapeHtml(item.text) + '</span><small>' + escapeHtml(item.time || '') + '</small></li>').join('') + '</ol></details>' : '';
  document.getElementById('sw-messages').innerHTML = human.length ? human.map(message => {
    const note = notes(message);
    const author = note ? 'Private note' : message.author === 'driver' ? session.person.split(' ')[0] : 'You';
    const text = note ? message.text.replace(/^Private note · /, '') : message.text;
    const shared = workspaceMessageEvents(message);
    const clips = shared.reduce((sum, event) => sum + eventClips(event).length, 0);
    const attachments = clips ? clips + (clips === 1 ? ' video' : ' videos') + ' attached' : shared.length + (shared.length === 1 ? ' event' : ' events') + ' attached';
    return '<article class="sw-message ' + (note ? 'is-note' : message.author === 'driver' ? 'is-driver' : 'is-manager') + '"><header><strong>' + escapeHtml(author) + '</strong><time>' + escapeHtml(message.time || '') + '</time></header>' + (text ? '<div class="sw-message-body"><p>' + escapeHtml(text) + '</p></div>' : '') +
      (shared.length ? '<details class="sw-message-attachments"><summary>' + attachments + '</summary><div>' + shared.map(event => '<button type="button" class="sw-shared-event" data-session-event="' + escapeHtml(event.id) + '">' + uiIcon(event.kind === 'video' ? 'play' : 'chart') + '<span>' + escapeHtml([event.time, event.title].filter(Boolean).join(' · ')) + '</span><small>' + workspaceSelectionLabel([event]) + '</small></button>').join('') + '</div></details>' : '') + '</article>';
  }).join('') : '<p class="sw-conversation-empty">' + 'No messages yet' + '</p>';
}

function mountSessionWorkspace(session) {
  const same = driverDrawerContent.querySelector('.sw-shell')?.dataset.sessionId === session.id;
  if (!same) driverDrawerContent.innerHTML = renderSessionWorkspace(session);
  else driverDrawerContent.querySelector('.sw-header').innerHTML = sessionWorkspaceHeader(session);
  const events = sessionEvidenceEvents(session);
  document.getElementById('sw-kpis').innerHTML = uiKpiStrip('Session evidence and conversation', [
    { label: 'Events', value: events.length, context: 'Linked to this session' },
    { label: 'Videos', value: events.reduce((sum, event) => sum + eventClips(event).length, 0), context: 'Across linked events' },
    { label: 'Messages', value: (session.messages || []).filter(message => message.author !== 'system' || message.text.startsWith('Private note · ')).length, context: 'Conversation and private notes' }
  ]);
  updateWorkspaceEvidence(session);
  updateWorkspaceConversation(session);
  updateWorkspaceComposer(session, !same);
}

function ensureWorkspaceDialogs() {
  if (document.getElementById('session-event-browser')) return;
  document.body.insertAdjacentHTML('beforeend', '<dialog id="session-event-browser" class="sw-event-browser" aria-labelledby="sw-browser-title"><header class="sw-dialog-header"><h2 id="sw-browser-title">Add events</h2><button class="icon-button" type="button" data-cancel-event-selection aria-label="Close event browser">' + uiIcon('close') + '</button></header><div class="sw-browser-body"><div class="sw-browser-list"><div class="view-tabs" role="tablist" aria-label="Event source"><button type="button" data-event-scope="driver" role="tab" aria-controls="sw-event-results">This driver</button><button type="button" data-event-scope="unassigned" role="tab" aria-controls="sw-event-results">Unassigned</button></div><label class="sw-event-search">' + searchGlyph + '<span class="sr-only">Search events</span><input id="session-event-search" type="search" placeholder="Event, location or unit" autocomplete="off"></label><div id="sw-event-results" class="sw-event-results" role="tabpanel"></div></div><div id="sw-browser-preview" class="sw-browser-preview"></div></div><footer class="sw-dialog-footer"><span id="sw-selection-total" role="status"></span><div><button class="secondary-button" type="button" data-cancel-event-selection>Cancel</button><button class="primary-button" type="button" data-use-event-selection>Use selection</button></div></footer></dialog>');
  const browser = document.getElementById('session-event-browser');
  browser.addEventListener('cancel', () => { sessionEventBrowser = null; });
  browser.addEventListener('close', () => { if (!browser.open) sessionEventBrowser = null; });
}

function openSessionEventBrowser(opener) {
  const session = workspaceSession();
  if (!session || !sessionCanReply(session) || sessionWorkspaceState(session).mode === 'note') return;
  saveSessionWorkspaceDraft();
  ensureWorkspaceDialogs();
  const state = sessionWorkspaceState(session);
  sessionEventBrowser = { sessionId: session.id, scope: 'driver', query: '', previewId: state.eventId, clipId: null, selected: new Set(state.selectedEvents), opener };
  document.getElementById('session-event-search').value = '';
  updateSessionEventBrowser(true);
  document.getElementById('session-event-browser').showModal();
  document.getElementById('session-event-search').focus();
}

function updateSessionEventBrowser(preview = false) {
  const browser = sessionEventBrowser;
  const session = workspaceSession();
  if (!browser || !session || browser.sessionId !== session.id) return;
  const events = availableEvidenceEvents(session, browser.scope).filter(event => [event.title, event.time, event.location, event.vehicle, event.source, event.categoryName].filter(Boolean).join(' ').toLowerCase().includes(browser.query.toLowerCase().trim()));
  if (preview) browser.previewId = (events.find(event => event.id === browser.previewId) || events[0])?.id || null;
  document.querySelectorAll('[data-event-scope]').forEach(button => { const active = button.dataset.eventScope === browser.scope; button.setAttribute('aria-selected', String(active)); button.tabIndex = active ? 0 : -1; button.classList.toggle('is-active', active); });
  document.getElementById('sw-event-results').innerHTML = events.length ? events.map(event => '<div class="sw-event-result' + (event.id === browser.previewId ? ' is-preview' : '') + '"><input type="checkbox" data-select-event="' + escapeHtml(event.id) + '" aria-label="Select ' + escapeHtml(event.title) + '"' + (browser.selected.has(event.id) ? ' checked' : '') + '><button type="button" data-preview-event="' + escapeHtml(event.id) + '" aria-label="Preview ' + escapeHtml(event.title) + '"><strong>' + escapeHtml(event.title) + '</strong><small>' + escapeHtml(event.time || 'Date unavailable') + '</small><span>' + escapeHtml(workspaceSelectionLabel([event]) + (event.vehicle ? ' · ' + event.vehicle : '')) + '</span></button></div>').join('') : '<div class="sw-notice">No matching events</div>';
  document.getElementById('sw-selection-total').textContent = workspaceSelectionLabel(selectedWorkspaceEvents(session, browser.selected)) + ' selected';
  if (preview) {
    const event = events.find(event => event.id === browser.previewId) || events[0];
    browser.previewId = event?.id || null;
    document.getElementById('sw-browser-preview').innerHTML = event ? '<h3>' + escapeHtml(event.title) + '</h3><p class="sw-preview-context">' + escapeHtml([event.time, event.severity ? event.severity + ' severity' : ''].filter(Boolean).join(' · ')) + '</p>' + workspaceMedia(event, 'browser', browser.clipId) + '<p class="sw-preview-sharing">' + (event.person ? 'Selection stages this event for your reply.' : 'Previewing keeps this event unassigned. Sending links it to ' + escapeHtml(session.person) + '.') + '</p>' : '<div class="sw-notice">Select an event to preview</div>';
    mountWorkspaceMaps(document.getElementById('sw-browser-preview'));
  }
}

function closeSessionEventBrowser(apply) {
  const browser = sessionEventBrowser;
  const session = workspaceSession();
  if (apply && browser && session && sessionCanReply(session)) {
    sessionWorkspaceState(session).selectedEvents = new Set(selectedWorkspaceEvents(session, browser.selected).map(event => event.id));
    updateWorkspaceEvidence(session);
    updateWorkspaceComposer(session);
  }
  document.getElementById('session-event-browser')?.close();
  sessionEventBrowser = null;
  browser?.opener?.focus();
}

function sendSessionWorkspaceReply() {
  const session = workspaceSession();
  if (!session || !sessionCanReply(session)) return;
  saveSessionWorkspaceDraft();
  const state = sessionWorkspaceState(session);
  const text = state.drafts[state.mode].trim();
  const events = selectedWorkspaceEvents(session);
  if (!text && (state.mode === 'note' || !events.length)) return;
  if (state.mode === 'note') {
    session.messages.push({ author: 'note', text, time: 'Just now' });
    session.latest = 'Private note added · just now';
  } else {
    const previousState = session.state;
    const previousReason = session.attentionReason;
    const linked = linkEvidenceEvents(session, events.map(event => event.id));
    session.messages.push({ author: 'manager', text, time: 'Just now', events: linked.map(event => event.id), clips: linked.flatMap(eventClips).map(clip => clip.id) });
    state.selectedEvents.clear();
    session.state = 'system_handling';
    session.stateLabel = inProgressLabel(session.origin);
    session.attentionReason = null;
    session.latest = 'Coach replied · just now';
    adjustSessionFleetTotals(previousState, session.state, session.source, previousReason, null);
    if (isAttentionSessionState(previousState)) clearAttentionForSession(session);
  }
  state.drafts[state.mode] = '';
  state.carets[state.mode] = [0, 0];
  driverDrawerContent.querySelector('.sw-header').innerHTML = sessionWorkspaceHeader(session);
  updateWorkspaceConversation(session);
  updateWorkspaceComposer(session, true);
  renderInbox();
  const scroll = driverDrawerContent.querySelector('.sw-conversation-scroll');
  scroll.scrollTop = scroll.scrollHeight;
  document.getElementById('reply-text')?.focus();
}

document.addEventListener('input', event => {
  if (event.target.id === 'reply-text' && event.target.closest('.sw-shell')) { saveSessionWorkspaceDraft(); updateWorkspaceComposer(workspaceSession()); }
  if (event.target.id === 'session-event-search' && sessionEventBrowser) { sessionEventBrowser.query = event.target.value; updateSessionEventBrowser(false); }
});
document.addEventListener('change', event => {
  const session = workspaceSession();
  if (event.target.id === 'session-composer-mode' && session) {
    saveSessionWorkspaceDraft();
    const state = sessionWorkspaceState(session);
    state.mode = event.target.value;
    composerMode = state.mode;
    updateWorkspaceComposer(session, true);
    document.querySelector('.sw-evidence-pane [data-open-session-events]').hidden = state.mode === 'note';
  }
  if (event.target.matches('[data-select-event]') && sessionEventBrowser) {
    const id = event.target.dataset.selectEvent;
    if (event.target.checked) sessionEventBrowser.selected.add(id); else sessionEventBrowser.selected.delete(id);
    document.getElementById('sw-selection-total').textContent = workspaceSelectionLabel(selectedWorkspaceEvents(session, sessionEventBrowser.selected)) + ' selected';
  }
});
document.addEventListener('click', event => {
  const target = event.target;
  const session = workspaceSession();
  if (target.closest('[data-open-session-events]')) openSessionEventBrowser(target.closest('[data-open-session-events]'));
  if (target.closest('[data-cancel-event-selection]') || target.id === 'session-event-browser') closeSessionEventBrowser(false);
  if (target.closest('[data-use-event-selection]')) closeSessionEventBrowser(true);
  const scope = target.closest('[data-event-scope]');
  if (scope && sessionEventBrowser) { sessionEventBrowser.scope = scope.dataset.eventScope; sessionEventBrowser.previewId = null; sessionEventBrowser.clipId = null; updateSessionEventBrowser(true); }
  const preview = target.closest('[data-preview-event]');
  if (preview && sessionEventBrowser) { sessionEventBrowser.previewId = preview.dataset.previewEvent; sessionEventBrowser.clipId = null; updateSessionEventBrowser(true); document.getElementById('sw-browser-preview').setAttribute('tabindex', '-1'); document.getElementById('sw-browser-preview').focus(); }
  const breakdownToggle = target.closest('[data-toggle-breakdown]');
  if (breakdownToggle && session) {
    const state = sessionWorkspaceState(session);
    state.breakdownOpen = !state.breakdownOpen;
    breakdownToggle.setAttribute('aria-expanded', String(state.breakdownOpen));
    breakdownToggle.firstChild.textContent = state.breakdownOpen ? 'Hide breakdown' : 'Show breakdown';
    document.getElementById('sw-breakdown').hidden = !state.breakdownOpen;
  }
  const selected = target.closest('[data-session-event]');
  if (selected && session) {
    const state = sessionWorkspaceState(session);
    const id = selected.dataset.sessionEvent;
    const inList = Boolean(selected.closest('#session-evidence'));
    state.viewerOpen = inList && state.viewerOpen && state.eventId === id ? false : true;
    if (state.eventId !== id) state.clipId = null;
    state.eventId = id;
    updateWorkspaceEvidence(session);
    const row = document.querySelector('#session-evidence [data-session-event="' + id.replace(/"/g, '\\"') + '"]');
    row?.focus({ preventScroll: inList });
    if (!inList) row?.closest('li')?.scrollIntoView({ block: 'nearest' });
  }
  const camera = target.closest('[data-sw-camera]');
  if (camera && session) {
    if (camera.dataset.cameraContext === 'browser' && sessionEventBrowser) { sessionEventBrowser.clipId = camera.dataset.swCamera; updateSessionEventBrowser(true); }
    else { sessionWorkspaceState(session).clipId = camera.dataset.swCamera; updateWorkspaceEvidence(session); }
    [...document.querySelectorAll('[data-sw-camera]')].find(button => button.dataset.swCamera === camera.dataset.swCamera && button.dataset.cameraContext === camera.dataset.cameraContext)?.focus({ preventScroll: true });
  }
  const play = target.closest('[data-sw-play]');
  if (play) {
    const playing = play.getAttribute('aria-pressed') !== 'true';
    play.setAttribute('aria-pressed', String(playing));
    play.setAttribute('aria-label', playing ? 'Pause illustrative clip' : 'Play illustrative clip');
    play.innerHTML = playing ? pauseGlyph : playGlyph;
    play.closest('.sw-video-stage').classList.toggle('is-playing', playing);
  }
});

// Keep keyboard focus in the active workspace dialog, including at its boundaries.
document.addEventListener('keydown', event => {
  if (event.key !== 'Tab') return;
  const dialog = ['session-event-browser'].map(id => document.getElementById(id)).find(node => node?.open);
  if (!dialog || document.getElementById('global-search-dialog')?.open || document.getElementById('training-dialog')?.open) return;
  const controls = [...dialog.querySelectorAll('button, input, select, textarea, summary, [href], [tabindex]')].filter(node => node.tabIndex >= 0 && !node.disabled && node.getClientRects().length);
  if (!controls.length) { event.preventDefault(); dialog.focus(); return; }
  const first = controls[0];
  const last = controls.at(-1);
  if (!dialog.contains(document.activeElement) || event.shiftKey && document.activeElement === first || !event.shiftKey && document.activeElement === last) {
    event.preventDefault();
    (event.shiftKey ? last : first).focus();
  }
});
