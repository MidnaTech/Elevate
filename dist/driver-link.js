/* Direct-route Driver app link. Keeps the two
   surfaces in step:
   - publishes a snapshot of Elevate drivers, coaches, sessions, lessons and messages to localStorage
     (key elevate.driver-app.link) that dist/driver/ reads in its linked mode;
   - applies driver actions (session opened, acknowledged, lesson completed, message sent) that the
     driver app writes back (key elevate.driver-app.events, plus postMessage when embedded) to the
     same session ledger the Sessions and Automation Centre views render.
   Recorded actions replay on load so both surfaces agree after a refresh; open the workspace with
   ?reset=1 to clear them. Loaded after app.js and touches app.js state only through its functions. */
(() => {
  'use strict';
  const LINK_KEY = 'elevate.driver-app.link';
  const EVENTS_KEY = 'elevate.driver-app.events';
  const DEFAULT_DRIVER = 'Priya Singh';
  const linkState = { driver: DEFAULT_DRIVER, log: [], applied: new Set(), lastSnapshot: '', ready: false };

  const readJson = (key, fallback) => { try { const raw = window.localStorage.getItem(key); return raw ? JSON.parse(raw) : fallback; } catch (error) { return fallback; } };
  const writeJson = (key, value) => { try { window.localStorage.setItem(key, JSON.stringify(value)); return true; } catch (error) { return false; } };
  const has = (name) => typeof window[name] === 'function';
  const isOpen = (session) => !['completed', 'archived'].includes(session.state);

  /* ── Snapshot for the driver app ───────────────────────────────────── */
  function coachFor(list) {
    const owner = list.map((s) => s.owner).find((o) => o && !/automation|unassigned|manager/i.test(o)) || 'Alex Kim';
    return { name: owner, initials: initials(owner) };
  }
  /* Course videos approved for a programme (ProgramSetup policy pool) become the driver's
     playable lesson. URLs are made absolute so the embedded driver app can load them. */
  const absoluteUrl = (path) => path ? new URL(path, window.location.href).href : '';
  const lengthLabel = (seconds) => !seconds ? '' : seconds % 60 === 0 ? (seconds / 60) + ' min video' : seconds + ' sec video';
  function courseLesson(course, category) {
    const seconds = course.videoSeconds || Math.round((course.durationMinutes || 0) * 60);
    return { title: course.title, length: lengthLabel(seconds), category: category || '', courseId: course.id, level: course.level || null, seconds,
      videoUrl: absoluteUrl(course.videoUrl), posterUrl: absoluteUrl(course.posterUrl), captionsUrl: absoluteUrl(course.captionsUrl), lede: course.summary || '',
      questions: (course.questions || []).map((q) => ({ id: q.id, prompt: q.prompt, options: q.options.slice(), correctIndex: q.correctIndex, explanation: q.explanation || '', feedback: Array.isArray(q.feedback) ? q.feedback.slice() : [] })) };
  }
  function courseLessonFor(categoryId) {
    if (typeof ProgramSetup === 'undefined') return null;
    const policy = ProgramSetup.getPolicy(categoryId);
    if (!policy) return null;
    const courses = ProgramSetup.getCourses();
    const byLevel = (a, b) => (a.level || 0) - (b.level || 0);
    // Approved pool first; otherwise the produced course for the programme's behaviour, so a
    // delivered video is never hidden behind imported lesson metadata.
    const course = policy.courseIds.map((id) => courses.find((c) => c.id === id)).filter((c) => c && c.videoUrl).sort(byLevel)[0]
      || courses.filter((c) => c.behaviorId === policy.behaviorId && c.videoUrl && !c.legacy && !c.customSeriesId).sort(byLevel)[0];
    return course ? courseLesson(course, (categories.find((c) => c.id === categoryId) || {}).name) : null;
  }
  function courseLibrary() {
    if (typeof ProgramSetup === 'undefined') return [];
    const behaviors = (typeof Coaching !== 'undefined' && Coaching.catalog.behaviors) || [];
    return ProgramSetup.getCourses().filter((c) => c.videoUrl && !c.legacy).sort((a, b) => (a.level || 0) - (b.level || 0))
      .map((c) => courseLesson(c, (categories.find((item) => item.id === c.behaviorId) || behaviors.find((item) => item.id === c.behaviorId) || {}).name || c.behaviorId));
  }
  function lessonFor(session) {
    if (session.lesson === null) return null;
    if (session.lesson) return { title: session.lesson, length: (lessons.find((l) => l.title === session.lesson) || {}).length || '' };
    const course = courseLessonFor(session.categoryId);
    if (course) return course;
    const lesson = lessons.find((l) => l.category === session.category);
    return lesson ? { title: lesson.title, length: lesson.length } : null;
  }
  function scoreFor(name) {
    const insight = aiCoachInsights.find((item) => item.name === name);
    return insight ? { score: insight.safetyScore, change: insight.scoreChange, group: insight.group || '' } : { score: null, change: null, group: '' };
  }
  // Driver programme scores need recorded period observations; workflow states never assign score penalties.
  function programmeStatus(open) {
    if (!open.length) return 'Completed';
    if (open.some((s) => s.attentionReason === 'reminders_exhausted')) return 'Overdue';
    if (open.some((s) => s.attentionReason === 'repeat_after_coaching')) return 'Repeated';
    if (open.some((s) => s.attentionReason === 'driver_reply')) return 'Replied';
    return 'In progress';
  }
  function driverProgrammes(snapshotSessions) {
    const byCat = new Map();
    snapshotSessions.forEach((s) => { if (s.state === 'archived') return; if (!byCat.has(s.categoryId)) byCat.set(s.categoryId, []); byCat.get(s.categoryId).push(s); });
    const order = categories.map((c) => c.id);
    categories.forEach(category => { if (!byCat.has(category.id)) byCat.set(category.id, []); });
    return [...byCat.entries()].sort((a, b) => order.indexOf(a[0]) - order.indexOf(b[0])).map(([id, list]) => {
      const cat = categories.find((c) => c.id === id);
      const open = list.filter(isOpen);
      const events = list.reduce((n, s) => n + Math.max(1, (s.evidence || []).length), 0);
      const status = list.length ? programmeStatus(open) : 'Not coached';
      const lesson = (list.find((s) => isOpen(s) && s.lesson) || list.find((s) => s.lesson) || {}).lesson || null;
      return { id, name: cat ? cat.name : id, score: null, scoreSource: 'No recorded driver programme-period score', events, open: open.length, completed: list.length - open.length, status, lesson, sessionIds: list.map((s) => s.id) };
    });
  }
  function snapshotSession(session) {
    return {
      id: session.id, categoryId: session.categoryId, category: session.category, eventType: session.eventType || session.category,
      state: session.state, stateLabel: session.stateLabel, attentionReason: session.attentionReason || null, origin: session.origin, deliveryMode: sessionDeliveryMode(session),
      lessonWatched: Boolean(session.lessonWatched), lessonAcknowledged: Boolean(session.lessonAcknowledged), reviewRequested: Boolean(session.reviewRequested),
      due: session.due || '', latest: session.latest || '', summary: session.summary || '', lesson: lessonFor(session),
      // Locations are kept as text only; fixture coordinates never leave the manager page.
      evidence: sessionEvidenceEvents(session).map(e => ({ id: e.id, title: e.title, meta: [e.source, e.time].filter(Boolean).join(' · '), duration: eventClips(e).map(clip => clip.duration).filter(Boolean).join(' / '), location: e.location?.label || '', video: eventClips(e).length > 0, clips: eventClips(e).map(clip => ({ id: clip.id, title: clip.title, duration: clip.duration })) })),
      // Private manager notes stay private.
      messages: (session.messages || []).filter((m) => m.author !== 'note').map((m) => ({ author: m.author, text: m.text, time: m.time || '', events: m.events || [], clips: m.clips || [] })),
      history: (session.history || []).slice(0, 8)
    };
  }
  function buildSnapshot() {
    const byPerson = new Map();
    sessions.forEach((s) => { if (!s.person) return; if (!byPerson.has(s.person)) byPerson.set(s.person, []); byPerson.get(s.person).push(s); });
    const drivers = [...byPerson.entries()]
      // Stable membership: a driver stays in the snapshot once any session carries evidence or a conversation,
      // so completing their last open session never switches the phone to another driver.
      .filter(([, list]) => list.some((s) => (s.evidence && s.evidence.length) || (s.messages || []).some((m) => m.author === 'driver' || m.author === 'manager')))
      .map(([name, list]) => {
        const score = scoreFor(name);
        const ordered = list.slice().sort((a, b) => Number(isOpen(b)) - Number(isOpen(a))).map(snapshotSession);
        return { name, initials: initials(name), group: score.group, coach: coachFor(list), score: score.score, scoreChange: score.change, programmes: driverProgrammes(ordered), sessions: ordered };
      })
      .sort((a, b) => (a.name === DEFAULT_DRIVER ? -1 : b.name === DEFAULT_DRIVER ? 1 : a.name.localeCompare(b.name)));
    return {
      version: 1, defaultDriver: DEFAULT_DRIVER,
      today: new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' }),
      programs: categories.map((c) => ({ id: c.id, name: c.name })),
      lessons: courseLibrary().concat(lessons.map((l) => ({ title: l.title, category: l.category, length: l.length }))), drivers
    };
  }
  function publish(force) {
    const snapshot = buildSnapshot();
    // Compare content only: a timestamp in the snapshot made every 2-second tick look like a change,
    // so the driver app re-rendered (and rebuilt its video) twice every two seconds.
    const json = JSON.stringify(snapshot);
    if (!force && json === linkState.lastSnapshot) return snapshot;
    linkState.lastSnapshot = json;
    snapshot.publishedAt = new Date().toISOString();
    writeJson(LINK_KEY, snapshot);
    postToFrame({ link: snapshot });
    return snapshot;
  }

  /* ── Applying driver actions to the ledger ─────────────────────────── */
  function clearAttentionFor(session) {
    const insight = aiCoachInsights.find((item) => item.name === session.person && item.categoryId === session.categoryId);
    if (!insight || resolvedAttentionIds.has(insight.id)) return;
    resolvedAttentionIds.add(insight.id);
    dismissedAiInsightIds.add(insight.id);
    const category = categories.find((item) => item.id === session.categoryId);
    if (category) category.attention = Math.max(0, (category.attention || 0) - 1);
    try { if (has('updateGroupAttention')) updateGroupAttention(insight, true); } catch (error) { /* keep going */ }
  }
  function raiseAttentionFor(session, text) {
    const category = categories.find((item) => item.id === session.categoryId);
    const score = scoreFor(session.person);
    const item = {
      id: 'driver-app-' + session.id + '-' + Date.now().toString(36), categoryId: session.categoryId, categoryName: session.category, caseKind: 'quick', caseIndex: 0,
      name: session.person, initials: session.initials || initials(session.person), group: score.group || driverGroups[0],
      safetyScore: score.score ?? 0, scoreChange: score.change ?? 0, criterion: 'Driver replied', attentionReason: 'reply', tone: 'watch',
      insight: 'The driver replied from the driver app: “' + text + '”',
      reason: 'driver_reply', recommendedAction: attentionReasonMeta.driver_reply.action,
      rankingFactors: ['Driver replied', 'Elevate score ' + (score.score ?? '—'), 'Replied from the driver app'],
      automationAttempts: 1, dueTime: 'Today', driver: { name: session.person, initials: session.initials || initials(session.person), group: score.group || '' },
      program: { id: session.categoryId, name: session.category }
    };
    try { attentionItems.push(item); if (category) category.attention = (category.attention || 0) + 1; } catch (error) { /* keep going */ }
  }
  function rerender(session) {
    try {
      if (has('adjustSessionFleetTotals')) adjustSessionFleetTotals();
      if (currentView === 'inbox' && has('renderInbox')) renderInbox();
      if (currentView === 'coaching' && has('renderHomeOverview')) renderHomeOverview();
      if (currentView === 'programs' && has('renderProgramsPage')) renderProgramsPage();
      if (has('renderQueue')) renderQueue();
      if (has('updateAiCommandPreview')) updateAiCommandPreview();
      if (has('syncDirectoryAttentionState')) syncDirectoryAttentionState(session.person, currentView === 'drivers');
      if (activeSessionId === session.id && has('renderSessionDrawer')) renderSessionDrawer();
    } catch (error) { console.warn('driver-link: rerender skipped', error); }
  }
  function applyEvent(event) {
    if (!event || !event.id || linkState.applied.has(event.id) || event.mode === 'design') return;
    linkState.applied.add(event.id);
    const session = sessions.find((s) => s.id === event.sessionId);
    if (!session) return;
    const previousReason = session.attentionReason || null;
    const who = session.person;
    session.history = session.history || [];
    session.messages = session.messages || [];
    let toast = '';
    if (event.type === 'session_opened') {
      session.history.unshift(['Opened in driver app', 'Just now']);
      session.latest = 'Driver opened the session · just now';
      toast = who + ' opened the session in the driver app';
    } else if (event.type === 'session_acknowledged' || event.type === 'lesson_completed' || event.type === 'lesson_watched') {
      if (!isOpen(session)) return;
      if (event.type === 'session_acknowledged') {
        if (!session.lessonWatched) return;
        session.lessonAcknowledged = true;
        session.lessonAcknowledgedAt = event.at || new Date().toISOString();
        session.history.unshift(['Lesson acknowledged', 'Just now']);
        toast = who + ' acknowledged the lesson';
      } else {
        session.lessonWatched = true;
        session.lessonWatchedAt = event.at || new Date().toISOString();
        session.history.unshift(['Lesson marked watched · local prototype action', 'Just now']);
        toast = who + ' marked the lesson watched';
      }
      if (session.lessonWatched && session.lessonAcknowledged && sessionDeliveryMode(session) === 'automated') {
        session.state = 'completed';
        session.stateLabel = 'Completed';
        session.attentionReason = null;
        session.latest = 'Lesson watched and acknowledged · just now';
        session.due = 'Completed just now';
        session.sla = 'Met'; session.slaTone = 'met';
        clearAttentionFor(session);
        toast = who + ' completed the lesson and acknowledgement';
      }
    } else if (event.type === 'review_requested' || event.type === 'message_sent') {
      if (!isOpen(session)) return;
      const text = String(event.text || 'Please review this event with me.').slice(0, 500);
      if (event.type === 'message_sent' && sessionDeliveryMode(session) === 'automated') return;
      session.messages.push({ author: 'driver', text, time: 'Just now' });
      if (session.state !== 'manager_attention' || session.attentionReason !== 'driver_reply') raiseAttentionFor(session, text);
      handoffSessionToCoach(session, 'driver_reply');
      session.latest = 'Driver requested review · just now';
      session.sla = 'On track'; session.slaTone = 'due-soon';
      session.due = 'Today';
      toast = who + ' requested a one-on-one review';
    } else if (event.type === 'quiz_passed') {
      if (!isOpen(session)) return;
      session.quizPassed = true;
      session.quizPassedAt = event.at || new Date().toISOString();
      session.history.unshift(['Quiz passed · ' + (event.questions || 3) + ' of ' + (event.questions || 3) + ' correct', 'Just now']);
      session.latest = 'Driver passed the ' + (event.lesson || 'lesson') + ' quiz · just now';
      toast = who + ' passed the ' + (event.lesson || 'lesson') + ' quiz';
    } else return;
    rerender(session);
    if (has('showToast') && linkState.ready && currentView !== 'driver') showToast(toast);
    linkState.log.unshift({ at: new Date().toISOString(), text: toast, sessionId: session.id });
    linkState.log = linkState.log.slice(0, 20);
    publish();
  }
  function drainEvents() { readJson(EVENTS_KEY, []).forEach(applyEvent); }
  function reset() {
    try { window.localStorage.removeItem(EVENTS_KEY); } catch (error) { /* ignore */ }
    window.location.reload();
  }

  /* ── Frame messaging ───────────────────────────────────────────────── */
  function postToFrame(data) {
    const node = document.getElementById('driver-app-frame');
    if (!node || !node.contentWindow) return;
    try { node.contentWindow.postMessage(Object.assign({ source: 'elevate-manager' }, data), window.location.origin); } catch (error) { /* ignore */ }
  }
  window.addEventListener('message', (event) => {
    if (event.origin !== window.location.origin || !event.data || event.data.source !== 'elevate-driver-app') return;
    if (event.data.event) applyEvent(event.data.event);
  });
  window.addEventListener('storage', (event) => { if (event.key === EVENTS_KEY) drainEvents(); });

  /* ── The Driver app destination: just the app ──────────────────────── */
  function renderDriverAppView() {
    const host = document.getElementById('driver-app-content');
    if (!host) return;
    publish(true);
    if (host.querySelector('#driver-app-frame')) return;
    host.innerHTML = '<iframe class="driver-app-frame" id="driver-app-frame" title="Elevate driver app" src="./driver/index.html?embed=1&mode=linked&driver=' + encodeURIComponent(linkState.driver) + '"></iframe>';
  }

  /* ── Register the destination without editing app.js ───────────────── */
  routeViewNames.driver = 'driver-app';
  internalViewNames['driver-app'] = 'driver';
  const originalSetView = setView;
  setView = function (view, options) {
    const result = originalSetView.call(this, view, options);
    if (currentView === 'driver') {
      renderDriverAppView();
    }
    return result;
  };

  const startParams = new URLSearchParams(window.location.search);
  if (startParams.get('reset') === '1') {
    try { window.localStorage.removeItem(EVENTS_KEY); } catch (error) { /* ignore */ }
    startParams.delete('reset');
    const query = startParams.toString();
    window.history.replaceState(window.history.state, '', window.location.pathname + (query ? '?' + query : '') + window.location.hash);
  }
  drainEvents();
  publish(true);
  linkState.ready = true;
  window.setInterval(() => publish(false), 2000);
  if (window.__elevateInitialHash === '#driver-app' && currentView !== 'driver') setView('driver', { replaceUrl: true, focusHeading: false });
  window.elevateDriverLink = { publish, applyEvent, reset, state: linkState };
})();
