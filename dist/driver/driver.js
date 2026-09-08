/* Elevate driver app (iOS). Vanilla implementation of docs/design-import/Elevate.dc.html.
   Two data modes:
   - design: the design file's fixture driver (Dana R) with every screen populated.
   - linked: a real Elevate driver read from the snapshot the manager workspace publishes to
     localStorage (see dist/driver-link.js). Actions are written back as events for the manager app.
   No build step. No external requests except the two typefaces declared in index.html. */
(() => {
  'use strict';

  const LINK_KEY = 'elevate.driver-app.link';
  const EVENTS_KEY = 'elevate.driver-app.events';
  const params = new URLSearchParams(window.location.search);
  const EMBED = params.get('embed') === '1';
  const NARROW = () => window.matchMedia('(max-width: 520px)').matches;

  const esc = (value) => String(value ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;' })[c]);
  const initialsOf = (name) => String(name || '').split(' ').filter(Boolean).map((part) => part[0]).join('').slice(0, 2).toUpperCase();
  const firstName = (name) => String(name || '').split(' ')[0];
  const safeParse = (raw, fallback) => { try { return raw ? JSON.parse(raw) : fallback; } catch (error) { return fallback; } };
  const storage = {
    get(key, fallback) { try { return safeParse(window.localStorage.getItem(key), fallback); } catch (error) { return fallback; } },
    set(key, value) { try { window.localStorage.setItem(key, JSON.stringify(value)); return true; } catch (error) { return false; } }
  };

  /* ── State ─────────────────────────────────────────────────────────── */
  const state = {
    mode: ['linked', 'design'].includes(params.get('mode')) ? params.get('mode') : null,
    driverName: params.get('driver') || null,
    route: 'home', overlay: null, previousRoute: 'home',
    sessionId: null, thread: null, behaviour: null,
    filter: 'Open', range: 'Week',
    acked: {}, lessonDone: {}, opened: {}, readThreads: {},
    lessonTitle: null, watched: {},
    localMsgs: {}, draft: '',
    playing: false, progress: 62, timer: null
  };
  let link = storage.get(LINK_KEY, null);
  // Linked whenever the manager workspace has published Elevate data; the design fixture otherwise.
  if (!state.mode) state.mode = link ? 'linked' : 'design';

  /* ── Design fixture (verbatim from the design file) ────────────────── */
  const DESIGN = {
    driver: { name: 'Dana R', initials: 'DR' },
    coach: { name: 'Marcus K', initials: 'MK' },
    dateLabel: 'Tuesday, Sep 8',
    score: 82,
    spark: [['M', 44, 0], ['T', 52, 0], ['W', 38, 0], ['T', 60, 0], ['F', 47, 0], ['S', 56, 0], ['S', 66, 1]],
    sessions: [
      { id: 'elm', title: 'Speed in a posted 40 zone', place: 'Elm St & 3rd', when: 'Tue Sep 8 · 2:14 PM', dateShort: 'Sep 8', status: 'action', meta: 'Elm St & 3rd · 1 clip assigned · Marcus K', dueLabel: 'Due Thu',
        subline: 'Elm St & 3rd · Route 214 · 22 seconds',
        summary: 'You held 48 km/h for 22 seconds through a posted 40 zone at the school entrance, then slowed on the approach to 3rd. Traffic ahead was light, so the speed most likely carried over from the 60 stretch just before the turn.',
        clip: { kind: 'video', label: 'Event clip · 14 s', cam: 'Forward camera', time: '0:05 / 0:14', note: 'Orange marks the 22 s over the limit · video placeholder', footnote: 'Clips cover 7 seconds either side of a flagged event. Nothing outside that window is kept.' },
        map: { place: '' }, speedChart: true,
        tips: [
          { title: 'Set speed before the crossing', body: 'The painted markings at Elm start about 60 m ahead of the sign. Coming off 60, that is the point to lift.' },
          { title: 'Treat 3rd as the exit, not the entry', body: 'Drivers on 214 tend to hold speed until the turn. Carrying 40 through the crossing makes the turn easier anyway.' }
        ],
        lesson: { title: 'Reading a school zone early', length: '3 min', lede: 'Three minutes on the cues that show up before the sign does, and how to carry less speed into the turn.' },
        coachNote: 'Your approach speed is fine everywhere else on 214. This one crossing is signed late — the painted markings show up before the sign does.' },
      { id: 'follow', title: 'Following distance on 214 North', place: 'Route 214', when: 'Aug 26', dateShort: 'Aug 26', status: 'closed', meta: 'Reviewed · lesson complete · discussed with coach', subline: 'Route 214 · Aug 26', summary: 'Two-second gap at 80 km/h is about 45 m. The clip showed the marker trick for judging it without doing maths. Numbers on 214 are already back down.', clip: { kind: 'video', label: 'Event clip · 16 s', cam: 'Forward camera', time: '0:00 / 0:16', note: 'Video placeholder' }, map: null, speedChart: false, tips: null, lesson: { title: 'Judging the gap without maths', length: '2 min' }, coachNote: '' },
      { id: 'corner', title: 'Cornering load, yard exit', place: 'Depot yard', when: 'Aug 12', dateShort: 'Aug 12', status: 'closed', meta: 'Reviewed · lesson complete', subline: 'Depot yard · Aug 12', summary: 'The yard exit onto Depot is tighter than it looks with a loaded trailer. Slowing before the gate rather than in it does most of the work.', clip: { kind: 'video', label: 'Event clip · 12 s', cam: 'Forward camera', time: '0:00 / 0:12', note: 'Video placeholder' }, map: null, speedChart: false, tips: null, lesson: { title: 'Slow in, steady out', length: '2 min' }, coachNote: '' },
      { id: 'stop', title: 'Rolling stop, Depot Rd', place: 'Depot Rd', when: 'Jul 30', dateShort: 'Jul 30', status: 'closed', meta: 'Reviewed · coach signed off', subline: 'Depot Rd · Jul 30', summary: 'A rolling stop at the Depot Rd exit. Reviewed with your coach and signed off.', clip: null, map: null, speedChart: false, tips: null, lesson: null, coachNote: '' }
    ],
    threads: {
      elm: { sub: 'Elm St & 3rd · Sep 8', open: true, unread: 1, msgs: [
        { from: 'coach', text: "Saw the Elm St flag come through. Nothing dramatic — the zone there is signed late and it catches most people on that route.", meta: 'Marcus K · Tue 4:02 PM' },
        { from: 'me', text: "Yeah, I didn't see the 40 until I was past the crossing.", meta: 'You · Tue 6:15 PM' },
        { from: 'coach', text: "That tracks. I've assigned the 3-minute clip on early cues — the painted markings come up before the sign. Watch it and mark the session reviewed when you're done.", meta: 'Marcus K · Tue 6:40 PM' }
      ] },
      follow: { sub: 'Route 214 · Aug 26', open: false, unread: 0, msgs: [
        { from: 'coach', text: "Two-second gap at 80 km/h is about 45 m. The clip shows the marker trick for judging it without doing maths.", meta: 'Marcus K · Aug 26 3:10 PM' },
        { from: 'me', text: "Watched it. Using the overpass shadows as markers on that stretch now.", meta: 'You · Aug 27 7:02 AM' },
        { from: 'coach', text: "That's the idea. Numbers on 214 are already back down — closing this one out.", meta: 'Marcus K · Aug 29 9:20 AM' }
      ] },
      corner: { sub: 'Depot yard · Aug 12', open: false, unread: 0, msgs: [
        { from: 'coach', text: "The yard exit onto Depot is tighter than it looks with a loaded trailer. Slowing before the gate rather than in it does most of the work.", meta: 'Marcus K · Aug 12 5:41 PM' },
        { from: 'me', text: "Makes sense, the load shifted on that one.", meta: 'You · Aug 13 6:55 AM' }
      ] },
      stop: { sub: 'Depot Rd · Jul 30', open: false, unread: 0, msgs: [] }
    },
    focusRows: [
      { name: 'Speed in posted zones', note: '6 events, all on route 214', delta: '−7 pts', tone: 'bad' },
      { name: 'Braking on approach', note: '2 hard stops this week', delta: '−4 pts', tone: 'bad' }
    ],
    winRows: [
      { name: 'Seatbelt', note: '38 trips, no exceptions', delta: '100%', tone: 'good' },
      { name: 'Cornering', note: 'Down from 8 events in August', delta: '−38%', tone: 'good' }
    ],
    behaviours: [
      { key: 'speed', name: 'Following speed limits', count: '6 events', trend: '−3 pts', trendTone: 'bad', score: 64, avg: 71, verdict: 'Room to improve',
        why: 'Sustained speed in a posted zone is the single behaviour most tied to severity when something does go wrong. It also compounds — a few km/h over on a route you drive daily shows up as a lot of events by Friday.',
        reminders: ['Set your speed before the zone starts, not at the sign.', 'On 214 the school zone at Elm is signed late — the painted markings come first.', 'Short overshoots while merging are not counted, so no need to brake hard for them.'],
        events: [{ title: '48 km/h in a 40 zone', meta: 'Tue Sep 8 · 2:14 PM · Elm St & 3rd · 22 s', tag: 'Coaching', sessionId: 'elm' }, { title: '71 km/h in a 60 zone', meta: 'Fri Sep 4 · 8:41 AM · Route 214 N · 14 s', tag: 'Logged', sessionId: 'elm' }] },
      { key: 'brake', name: 'Steady braking', count: '2 events', trend: '+1 pt', trendTone: 'good', score: 81, avg: 76, verdict: 'On track',
        why: 'Hard stops usually mean the gap ahead closed faster than expected. Reading further down the road gives you the option to coast instead of brake.',
        reminders: ['Aim for a four-second gap at highway speed.', 'Cover the brake early on the Depot Rd approach — the lights there are short.'],
        events: [{ title: 'Hard brake', meta: 'Tue Sep 8 · 2:31 PM · Depot Rd · light traffic', tag: 'Logged', sessionId: 'elm' }] },
      { key: 'corner', name: 'Smooth turning', count: '1 event', trend: '−38% vs Aug', trendTone: 'good', score: 88, avg: 74, verdict: 'Strong',
        why: 'Cornering load matters more with a loaded box. Slower in, steady out keeps the load settled and the tyres wearing evenly.',
        reminders: ['Set speed before the turn, not through it.', 'The yard exit at Depot is tighter than it looks when loaded.'],
        events: [{ title: 'Cornering load', meta: 'Wed Aug 27 · 11:06 AM · yard exit', tag: 'Closed', sessionId: 'corner' }] },
      { key: 'belt', name: 'Seatbelt use', count: 'No events', trend: '100%', trendTone: 'good', score: 100, avg: 92, verdict: 'Perfect',
        why: 'Belt use is a pass/fail check on every trip start. It carries the most weight of any behaviour because it is the easiest to get right.',
        reminders: ['38 trips clean. Nothing to change here.'], events: [] },
      { key: 'phone', name: 'Zero phone distraction', count: 'No events', trend: '100%', trendTone: 'good', score: 100, avg: 68, verdict: 'Perfect',
        why: 'Handling the phone while moving is detected from motion and screen state. Hands-free calls and mounted navigation are not counted.',
        reminders: ['Mounted nav and hands-free calls are fine.', 'Pull over for anything that needs typing.'], events: [] }
    ],
    rangeMap: { Week: [82, '+4 vs last week', 'This week'], Month: [79, '+7 vs August', 'This month'], '90 days': [76, '+11 since June', 'Last 90 days'] },
    composition: [['Speed −7', '#FF6B3D', 40], ['Braking −4', '#E8A33D', 24], ['Cornering −2', '#8FB88A', 14], ['Clean driving +5', '#2F8F6B', 22]],
    measured: [
      { name: 'Following speed limits', rule: '5 km/h over a posted limit for 10 s or more', weight: '30%' },
      { name: 'Steady braking', rule: 'Deceleration above 0.4 g', weight: '20%' },
      { name: 'Smooth turning', rule: 'Lateral load above 0.35 g', weight: '15%' },
      { name: 'Seatbelt use', rule: 'Checked at every trip start', weight: '20%' },
      { name: 'Zero phone distraction', rule: 'Handling detected while moving', weight: '15%' }
    ],
    notMeasured: ['Idle time, fuel use, or how long a job takes', 'Traffic, weather, or a route you were assigned', 'Hands-free calls and mounted navigation', 'Anything recorded while the vehicle is parked'],
    answers: {
      "Why did my score drop 3?": "Three points came off this week: two from the Elm St 40-zone stretch and one from a hard brake on Depot Rd. Your clean-trip credit added two back, so the net is −1.",
      "What's a 40 zone rule?": "Your fleet flags any sustained 5 km/h over a posted limit for more than 10 seconds. Short overshoots while merging aren't counted.",
      "How close am I to 85?": "Three more clean trips holds you at 82. Clearing the open session and no speed flags this week puts you at about 85 by Sunday."
    },
    roster: [
      { initials: 'DR', name: 'Dana R', note: '1 session open · due Thu', score: '82', trend: '+4', tone: 'good' },
      { initials: 'PS', name: 'Priya S', note: 'Awaiting your review', score: '91', trend: '+1', tone: 'good' },
      { initials: 'JL', name: 'Jon L', note: '2 sessions open · overdue', score: '68', trend: '−3', tone: 'bad' },
      { initials: 'AM', name: 'Amara M', note: 'No open items', score: '88', trend: '0', tone: 'muted' },
      { initials: 'TC', name: 'Tomas C', note: 'Lesson assigned Monday', score: '75', trend: '+6', tone: 'good' }
    ],
    trip: { events: [
      { name: 'Speed in a 40 zone', meta: '2:14 PM · Elm St & 3rd · 22 s', tag: 'Coaching', color: 'var(--accent)', sessionId: 'elm' },
      { name: 'Hard brake', meta: '2:31 PM · Depot Rd · light traffic', tag: 'Logged', color: 'var(--amber)', sessionId: 'elm' }
    ] },
    chapters: [['0:00', 'Cues before the sign', 32], ['1:08', 'Carrying speed out of a turn', 68], ['2:14', 'Where drivers usually catch it', 100]]
  };

  // The Elevate Learning library. Linked mode replaces it with the workspace's published lessons.
  const LIBRARY = [
    { title: 'Following Distance Basics', category: 'Following distance', length: '2 min video' },
    // Delivered heavy-truck speeding course videos (dist/media/courses/speeding).
    { title: 'Reset your speed', category: 'Speeding', length: '1 min video', videoUrl: '../media/courses/speeding/speeding-level-1.mp4', posterUrl: '../media/courses/speeding/speeding-level-1.jpg', captionsUrl: '../media/courses/speeding/speeding-level-1.vtt', lede: 'Level 1. Check limits and conditions, adjust early, restore space.' },
    { title: 'Understand the consequences', category: 'Speeding', length: '90 sec video', videoUrl: '../media/courses/speeding/speeding-level-2.mp4', posterUrl: '../media/courses/speeding/speeding-level-2.jpg', captionsUrl: '../media/courses/speeding/speeding-level-2.vtt', lede: 'Level 2. What extra speed costs a heavy truck in stopping distance, control and time.' },
    { title: 'Make the safer decision', category: 'Speeding', length: '2 min video', videoUrl: '../media/courses/speeding/speeding-level-3.mp4', posterUrl: '../media/courses/speeding/speeding-level-3.jpg', captionsUrl: '../media/courses/speeding/speeding-level-3.vtt', lede: 'Level 3. Pause and choose: safer judgment under schedule pressure.' },
    { title: 'Anticipation & Space', category: 'Harsh braking', length: '2 min video' },
    { title: 'Eyes Forward', category: 'Distracted driving', length: '2 min video' },
    { title: 'Buckle Every Trip', category: 'Seat belt use', length: '90 sec video' },
    { title: 'Fatigue Awareness', category: 'Driver fatigue', length: '3 min video' }
  ];

  const STATUS = {
    action: { label: 'Action needed', chip: 'live', open: true },
    overdue: { label: 'Overdue', chip: 'live', open: true },
    followup: { label: 'Follow-up', chip: 'live', open: true },
    waiting: { label: 'Waiting on coach', chip: 'open', open: true },
    reviewed: { label: 'Reviewed', chip: 'neutral', open: true },
    completed: { label: 'Completed', chip: 'good', open: false },
    closed: { label: 'Closed', chip: 'closed', open: false }
  };

  /* ── Model: design mode ────────────────────────────────────────────── */
  function designModel() {
    const d = DESIGN;
    const sessions = d.sessions.map((s) => {
      let status = s.status;
      if (state.lessonDone[s.id]) status = 'completed';
      else if (state.acked[s.id] && status === 'action') status = 'reviewed';
      const meta = STATUS[status];
      return Object.assign({}, s, { status, statusLabel: meta.label, chip: meta.chip, open: meta.open, canAck: status === 'action' || status === 'overdue' || status === 'followup', acked: Boolean(state.acked[s.id]), lessonDone: Boolean(state.lessonDone[s.id]), coach: d.coach });
    });
    const threads = Object.keys(d.threads).map((id) => {
      const t = d.threads[id];
      const s = sessions.find((x) => x.id === id);
      const msgs = t.msgs.concat(state.localMsgs[id] || []);
      return { id, title: s.title, sub: t.sub, open: t.open, unread: state.readThreads[id] ? 0 : t.unread, msgs };
    });
    return {
      mode: 'design', linked: false,
      driver: d.driver, coach: d.coach, dateLabel: d.dateLabel,
      score: { value: d.score, change: 4, changeLabel: '+4 this week', standingLabel: 'Good standing', standingTone: 'good', spark: d.spark, groupLine: 'Top 22% of your group' },
      streaks: [{ label: 'Streak', value: '12 days', small: '', sub: 'No harsh events' }, { label: 'Clean trips', value: '31', small: 'of 38', sub: 'Last 14 days' }],
      programmes: null,
      sessions, focusRows: d.focusRows, winRows: d.winRows,
      lesson: { title: 'Reading a school zone early', remaining: '3 min left', sessionId: 'elm' },
      lessons: LIBRARY,
      analytics: { ranges: true, rangeMap: d.rangeMap, composition: d.composition, behaviours: d.behaviours, groupAvg: "74 · you're 8 above", gain: { title: 'Cornering events down 38% since August', body: "Worth 5 of the points you've added this month." }, measured: d.measured, notMeasured: d.notMeasured, intro: 'Your score covers a rolling 14 days across five behaviours your fleet has enabled. It reflects how you drove — not which vehicle you were in.', bhRange: 'Rolling 14 days', showWeights: true },
      threads, quickAsks: Object.keys(d.answers).map((label) => ({ label, answer: d.answers[label] })),
      roster: d.roster, rosterLede: '4 sessions waiting on a driver, 2 waiting on you.', trip: d.trip, chapters: d.chapters,
      caps: { nudge: true, postTrip: true, assistant: true }
    };
  }

  /* ── Model: linked mode (Elevate snapshot) ─────────────────────────── */
  function pickLinkedDriver() {
    if (!link || !Array.isArray(link.drivers) || !link.drivers.length) return null;
    return link.drivers.find((d) => d.name === state.driverName) || link.drivers.find((d) => d.name === link.defaultDriver) || link.drivers[0];
  }

  // Missing programme scores remain unavailable; a request for review never changes a score.
  function progStatus(list) {
    const open = list.filter((s) => s.open);
    if (!open.length) return 'Completed';
    if (open.some((s) => s.raw.attentionReason === 'reminders_exhausted' || s.status === 'overdue')) return 'Overdue';
    if (open.some((s) => s.raw.attentionReason === 'repeat_after_coaching' || s.status === 'followup')) return 'Repeated';
    if (open.some((s) => s.raw.attentionReason === 'driver_reply' || s.status === 'waiting')) return 'Replied';
    return 'In progress';
  }

  function linkedStatus(s) {
    if (s.state === 'completed') return 'completed';
    if (s.state === 'archived') return 'closed';
    if (s.lessonAcknowledged) return 'reviewed';
    if (s.state === 'manager_attention') {
      if (s.attentionReason === 'driver_reply') return 'waiting';
      if (s.attentionReason === 'reminders_exhausted') return 'overdue';
      return 'followup';
    }
    return 'action';
  }

  function whenFromMeta(meta) {
    const parts = String(meta || '').split('·').map((p) => p.trim()).filter(Boolean);
    return parts.length > 1 ? parts.slice(1).join(' · ') : parts[0] || '';
  }

  function linkedModel(driver) {
    const coach = driver.coach || { name: 'Your coach', initials: 'C' };
    const sessions = (driver.sessions || []).map((s) => {
      const status = linkedStatus(s);
      const meta = STATUS[status];
      const ev = (s.evidence || [])[0] || null;
      const videoEv = (s.evidence || []).find((e) => e.video !== false && /lytx|clip|camera/i.test(e.title + ' ' + e.meta)) || null;
      const when = ev ? whenFromMeta(ev.meta) : (s.history && s.history.length ? s.history[s.history.length - 1][1] : '');
      const dateShort = (when.match(/(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)\s+\d{1,2}(?:–\S+)?/) || [when.split(' · ')[0]])[0] || '';
      const place = (ev && ev.location) || '';
      const managerMsgs = (s.messages || []).filter((m) => m.author === 'manager');
      return {
        id: s.id, title: s.eventType || s.category, place, when, dateShort, status, statusLabel: meta.label, chip: meta.chip, open: meta.open,
        canAck: Boolean(s.lessonWatched || state.lessonDone[s.id]) && s.state === 'system_handling' && s.deliveryMode === 'automated', acked: Boolean(s.lessonAcknowledged), lessonDone: Boolean(s.lessonWatched || state.lessonDone[s.id]),
        meta: [place || s.category, s.lesson ? '1 lesson assigned' : null, coach.name].filter(Boolean).join(' · '),
        subline: [s.category, place, ev && ev.duration ? ev.duration : null].filter(Boolean).join(' · '),
        dueLabel: s.due && !/completed|closed/i.test(s.due) ? 'Due ' + s.due : '',
        summary: s.summary || '',
        clip: videoEv ? { kind: 'video', label: 'Event clip · ' + (videoEv.duration || ''), cam: 'Forward camera', time: '0:00 / ' + (videoEv.duration || '0:00'), note: videoEv.title + ' · ' + videoEv.meta, footnote: 'Clips cover the seconds either side of a flagged event. Nothing outside that window is kept.' }
          : ev ? { kind: 'pattern', title: ev.title, meta: ev.meta + (ev.duration ? ' · ' + ev.duration : ''), footnote: 'This session is based on a telematics pattern, so there is no camera clip to review.' } : null,
        map: ev && ev.location ? { place: ev.location } : null, speedChart: false, tips: null,
        lesson: s.lesson ? { title: s.lesson.title, length: s.lesson.length || '', videoUrl: s.lesson.videoUrl || '', posterUrl: s.lesson.posterUrl || '', captionsUrl: s.lesson.captionsUrl || '', lede: (s.lesson.videoUrl ? 'The course for ' : 'The lesson your fleet mapped to ') + s.category.toLowerCase() + '. Watch it, then mark the session reviewed.' } : null,
        coachNote: managerMsgs.length ? managerMsgs[managerMsgs.length - 1].text : '',
        category: s.category, categoryId: s.categoryId, raw: s, coach
      };
    }).sort((a, b) => Number(b.open) - Number(a.open));

    const threads = sessions.filter(s => s.raw.deliveryMode === 'one_on_one').map((s) => {
      const msgs = (s.raw.messages || []).filter((m) => m.author !== 'note').map((m) => ({
        from: m.author === 'driver' ? 'me' : m.author === 'manager' ? 'coach' : 'system',
        text: m.text,
        meta: (m.author === 'driver' ? 'You' : m.author === 'manager' ? coach.name : 'Elevate') + ' · ' + (m.time || '')
      })).concat(state.localMsgs[s.id] || []);
      const lastMe = msgs.map((m) => m.from).lastIndexOf('me');
      const unread = state.readThreads[s.id] ? 0 : msgs.slice(lastMe + 1).filter((m) => m.from === 'coach').length;
      return { id: s.id, title: s.title, sub: [s.place, s.dateShort].filter(Boolean).join(' · '), open: s.open, unread, msgs };
    });

    // Programmes are the organizing unit, mirroring the manager's behaviour categories. Each carries
    // its own score, and its drill-down lists every session and event attributed to it.
    let programmes = Array.isArray(driver.programmes) ? driver.programmes.slice() : [];
    if (!programmes.length) {
      const seen = new Map();
      sessions.filter((s) => s.raw.state !== 'archived').forEach((s) => {
        const e = seen.get(s.categoryId) || { id: s.categoryId, name: s.category, events: 0, open: 0, completed: 0, lesson: null, sessionIds: [] };
        e.events += Math.max(1, (s.raw.evidence || []).length);
        if (s.open) e.open += 1; else e.completed += 1;
        if (!e.lesson && s.lesson) e.lesson = s.lesson;
        e.sessionIds.push(s.id); seen.set(s.categoryId, e);
      });
      programmes = [...seen.values()].map((p) => ({ ...p, status: progStatus(sessions.filter((s) => s.categoryId === p.id)) }));
    }
    // Ensure every programme carries a status and its own score, even from an older snapshot.
    programmes = programmes.map((p) => {
      const status = p.status || progStatus(sessions.filter((s) => s.categoryId === p.id));
      return { ...p, status, score: Number.isFinite(p.score) ? p.score : null };
    });
    const behaviours = programmes.map((p) => {
      const progSessions = sessions.filter((s) => s.categoryId === p.id);
      const openSession = progSessions.find((s) => s.open) || progSessions[0] || null;
      const events = progSessions.flatMap((s) => {
        const evs = s.raw.evidence || [];
        return evs.length ? evs.map((e) => ({ title: e.title, meta: e.meta, tag: s.statusLabel, sessionId: s.id })) : [{ title: s.title, meta: [s.when, s.place].filter(Boolean).join(' · '), tag: s.statusLabel, sessionId: s.id }];
      });
      return { key: p.id, name: p.name, count: p.events + (p.events === 1 ? ' event' : ' events'), trend: null, trendTone: 'muted', score: p.score ?? null, avg: null,
        verdict: p.status, w: p.score ?? Math.min(100, p.events * 20), tone: p.open ? 'low' : 'good',
        why: (openSession && openSession.summary) || (p.name + ' — ' + p.events + (p.events === 1 ? ' event recorded' : ' events recorded') + ' this period.'),
        reminders: [], events, lesson: p.lesson || (openSession && openSession.lesson) || null,
        sessionId: openSession ? openSession.id : (progSessions[0] && progSessions[0].id) };
    });
    const completed = sessions.filter((s) => s.status === 'completed');
    const score = Number.isFinite(driver.score) ? driver.score : null;
    const change = Number.isFinite(driver.scoreChange) ? driver.scoreChange : null;
    const standingTone = score === null ? 'none' : score >= 80 ? 'good' : score >= 70 ? 'watch' : 'risk';
    const openLesson = sessions.find((s) => s.open && s.lesson && !s.lessonDone);
    const today = new Date();
    return {
      mode: 'linked', linked: true,
      driver: { name: driver.name, initials: driver.initials || initialsOf(driver.name), group: driver.group || '' }, coach,
      dateLabel: link.today || today.toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' }),
      score: { value: score, change, changeLabel: change === null ? 'Previous score unavailable' : (change > 0 ? '+' : '') + change + ' vs previous', standingLabel: score === null ? 'Not enough data' : standingTone === 'good' ? 'Good standing' : standingTone === 'watch' ? 'Worth a look' : 'Needs attention', standingTone, spark: null, groupLine: null },
      streaks: null,
      programmes,
      sessions,
      focusRows: programmes.filter((p) => p.open).map((p) => ({ name: p.name, note: p.status + ' · ' + p.events + (p.events === 1 ? ' event' : ' events'), delta: p.score === null ? p.open + ' open' : String(p.score), tone: p.score !== null && p.score >= 90 ? 'good' : 'bad', key: p.id })),
      winRows: programmes.filter((p) => !p.open && p.completed).map((p) => ({ name: p.name, note: 'Coaching completed', delta: p.score === null ? 'Done' : String(p.score), tone: 'good', key: p.id })),
      lesson: openLesson ? { title: openLesson.lesson.title, remaining: openLesson.lesson.length || 'Assigned', sessionId: openLesson.id } : null,
      lessons: Array.isArray(link.lessons) && link.lessons.length ? link.lessons : LIBRARY,
      analytics: { ranges: false, rangeMap: null, composition: null, behaviours, groupAvg: null, gain: completed.length ? { title: completed.length + (completed.length === 1 ? ' coaching session completed' : ' coaching sessions completed'), body: 'Completed coaching is measured over the following 14 days.' } : null,
        measured: (link.programs || []).map((p) => ({ name: p.name, rule: 'Threshold set by your fleet in Elevate', weight: '' })), notMeasured: DESIGN.notMeasured,
        intro: 'The overall score is a recorded prototype value. Driver programme scores and the scoring formula are not available. Requesting a review never creates a score penalty.', bhRange: 'Current sessions', showWeights: false },
      threads, quickAsks: null,
      roster: (link.drivers || []).map((d) => {
        const open = (d.sessions || []).filter((s) => !['completed', 'archived'].includes(s.state));
        return { initials: d.initials || initialsOf(d.name), name: d.name, note: open.length ? open.length + (open.length === 1 ? ' session open' : ' sessions open') + (open.some((s) => s.attentionReason === 'reminders_exhausted') ? ' · overdue' : '') : 'No open items', score: Number.isFinite(d.score) ? String(d.score) : '—', trend: Number.isFinite(d.scoreChange) ? (d.scoreChange > 0 ? '+' : '') + d.scoreChange : '', tone: !Number.isFinite(d.scoreChange) || d.scoreChange === 0 ? 'muted' : d.scoreChange > 0 ? 'good' : 'bad' };
      }),
      rosterLede: (link.drivers || []).length + ' drivers with sessions in Elevate.',
      trip: null, chapters: DESIGN.chapters,
      caps: { nudge: false, postTrip: false, assistant: false }
    };
  }

  function model() {
    if (state.mode === 'linked') {
      const driver = pickLinkedDriver();
      if (driver) return linkedModel(driver);
    }
    return designModel();
  }

  /* ── Event channel to the manager workspace ────────────────────────── */
  function emit(type, extra) {
    const m = model();
    const event = Object.assign({ id: 'ev-' + Date.now().toString(36) + '-' + Math.random().toString(36).slice(2, 7), type, driver: m.driver.name, mode: m.mode, at: new Date().toISOString() }, extra || {});
    if (m.linked) {
      const list = storage.get(EVENTS_KEY, []);
      list.push(event);
      storage.set(EVENTS_KEY, list.slice(-60));
    }
    if (EMBED && window.parent && window.parent !== window) {
      try { window.parent.postMessage({ source: 'elevate-driver-app', event }, window.location.origin); } catch (error) { /* ignore */ }
    }
  }

  function notifyRoute() {
    if (!(EMBED && window.parent && window.parent !== window)) return;
    try { window.parent.postMessage({ source: 'elevate-driver-app', route: state.route, overlay: state.overlay, mode: state.mode, driver: model().driver.name }, window.location.origin); } catch (error) { /* ignore */ }
  }

  /* ── Templates ─────────────────────────────────────────────────────── */
  const chipHtml = (chip, label) => '<span class="chip chip--' + chip + '">' + esc(label) + '</span>';
  const backHtml = (act, label) => '<div class="back-row"><button class="back" type="button" data-act="' + act + '"><span class="chev chev--back" aria-hidden="true"></span><span>' + esc(label) + '</span></button></div>';
  const illustrative = (label) => '<span class="tag-ill">' + esc(label || 'Illustrative') + '</span>';

  function homeHtml(m) {
    const toAction = m.sessions.filter((s) => ['action', 'overdue', 'followup'].includes(s.status));
    const waiting = m.sessions.filter((s) => s.status === 'waiting' || s.status === 'reviewed');
    const first = toAction[0] || null;
    const s = m.score;
    const scoreTop = s.value === null
      ? '<div><div class="eyebrow eyebrow--light">Elevate score</div><div class="score-num-row"><div class="score-num">—</div></div></div><div class="score-side"><span class="standing standing--watch">Not enough data</span></div>'
      : '<div><div class="eyebrow eyebrow--light">Elevate score</div><div class="score-num-row"><div class="score-num num">' + s.value + '</div><div class="score-den">/ 100</div></div></div>' +
        '<div class="score-side"><span class="standing standing--' + (s.standingTone === 'none' ? 'watch' : s.standingTone) + '">' + esc(s.standingLabel) + '</span><span class="trend trend--' + (s.change === null || s.change === 0 ? 'flat' : s.change > 0 ? 'good' : 'bad') + '">' + esc(s.changeLabel) + '</span></div>';
    const spark = s.spark
      ? '<div class="spark" aria-label="Score by day, this week">' + s.spark.map(([label, h, hot]) => '<div><i style="height:' + h + 'px" class="' + (hot ? 'is-hot' : '') + '"></i><small>' + label + '</small></div>').join('') + '</div>'
      : s.value !== null ? '<div class="gap-8"><div class="meter" aria-hidden="true"><i class="' + (s.standingTone === 'risk' ? 'is-low' : s.standingTone === 'watch' ? 'is-mid' : '') + '" style="width:' + s.value + '%"></i></div><div class="meter-scale"><span>0</span><span>Fleet target 85</span><span>100</span></div></div>' : '';
    const foot = '<div class="score-foot"><p>' + (s.groupLine ? esc(s.groupLine) : m.linked ? 'Scored by your fleet in Elevate' : '') + '</p><button class="btn btn--ghost-light" type="button" data-act="go" data-route="analytics">What\'s moving it</button></div>';
    const streaks = m.streaks ? '<div class="stat-pair">' + m.streaks.map((t) => '<div class="card card--18 stat"><span class="eyebrow eyebrow--sm">' + esc(t.label) + '</span><strong>' + esc(t.value) + (t.small ? ' <small>' + esc(t.small) + '</small>' : '') + '</strong><span>' + esc(t.sub) + '</span></div>').join('') + '</div>' : '';
    // Attention is framed by programme (behaviour), not by an anonymous "session to action".
    const openProgrammes = m.linked ? (m.programmes || []).filter((p) => p.open) : [];
    const actionProgramme = m.linked && first ? (openProgrammes.find((p) => p.id === first.categoryId) || openProgrammes[0] || null) : null;
    const actionTitle = m.linked && actionProgramme ? actionProgramme.name : esc(first ? first.title : '') + (first && first.place && first.place !== first.title ? ' — ' + esc(first.place) : '');
    const action = first
      ? '<div class="card card--tint action-card"><div class="label"><i class="dot" aria-hidden="true"></i><span class="eyebrow eyebrow--accent">' + (m.linked ? openProgrammes.length + (openProgrammes.length === 1 ? ' programme needs you' : ' programmes need you') : toAction.length + (toAction.length === 1 ? ' session' : ' sessions') + ' to action') + '</span></div>' +
        '<div class="action-title">' + (m.linked && actionProgramme ? esc(actionTitle) : actionTitle) + '</div>' +
        '<p class="lede">' + (m.linked ? esc(first.title) + (first.dueLabel ? ' · ' + esc(first.dueLabel) : '') + '. ' + (first.lesson ? 'Read it, watch the lesson, tell ' + esc(m.coach.name) + ' you\'ve got it.' : 'Read it and reply to ' + esc(m.coach.name) + '.') : (first.lesson ? 'Two minutes: read the moment, watch a ' + esc(first.lesson.length || 'short') + ' clip, tell your coach you\'ve got it.' : 'Read the moment and tell your coach you\'ve got it.')) + '</p>' +
        '<button class="btn btn--dark btn--row" type="button" data-act="open-session" data-id="' + esc(first.id) + '"><span>Open session</span><em>' + esc(first.dueLabel || '') + '</em></button></div>'
      : waiting.length
        ? '<div class="card card--good action-card"><div class="label"><span class="eyebrow eyebrow--good">Nothing to action</span></div><div class="action-title">' + esc(waiting[0].title) + '</div><p class="lede">' + (waiting[0].status === 'waiting' ? esc(m.coach.name) + ' has your reply and will come back to you.' : 'Reviewed. Finish the assigned lesson to close it out.') + '</p><button class="btn btn--outline" type="button" data-act="open-session" data-id="' + esc(waiting[0].id) + '">Open session</button></div>'
        : '<div class="card card--good action-card"><div class="label"><span class="eyebrow eyebrow--good">Nothing to action</span></div><div class="action-title">All caught up</div><p class="lede">No open coaching sessions right now.</p></div>';
    const rows = (list, soft) => list.map((r) => {
      const inner = '<div class="row-text"><span class="row-title">' + esc(r.name) + '</span><span class="row-note">' + esc(r.note) + '</span></div><span class="delta delta--' + (r.tone || 'muted') + ' num">' + esc(r.delta) + '</span>' + (r.key ? '<span class="chev" aria-hidden="true"></span>' : '');
      return r.key
        ? '<button class="row row--btn' + (soft ? ' row--soft' : '') + '" type="button" data-act="behaviour" data-key="' + esc(r.key) + '">' + inner + '</button>'
        : '<div class="row' + (soft ? ' row--soft' : '') + '">' + inner + '</div>';
    }).join('');
    const scoreCol = m.linked ? '<span class="card-head-note">Current score</span>' : '';
    const stand = (m.focusRows.length || (m.winRows && m.winRows.length))
      ? '<div class="gap-9" style="padding-top:4px"><div class="section-head"><h2 class="title-sm">' + (m.linked ? 'Your programmes' : 'Where you stand') + '</h2><button class="link-btn" type="button" data-act="go" data-route="analytics">' + (m.linked ? 'Full breakdown' : 'All behaviours') + '</button></div>' +
        '<div class="card" style="overflow:hidden">' + (m.focusRows.length ? '<div class="card-head card-head--row">' + (m.linked ? 'Worth a look' : 'Worth a look') + scoreCol + '</div>' + rows(m.focusRows, false) : '') +
        (m.winRows && m.winRows.length ? '<div class="card-head card-head--soft card-head--row">' + (m.linked ? 'Completed' : 'Improved') + scoreCol + '</div>' + rows(m.winRows, true) : '') + '</div></div>'
      : '';
    const lesson = m.lesson ? '<div class="card lesson-row"><div class="play-tile" aria-hidden="true"><i class="tri"></i></div><div class="row-text"><span class="eyebrow eyebrow--sm">' + (m.linked ? 'Lesson assigned' : 'Lesson in progress') + '</span><span class="row-title">' + esc(m.lesson.title) + '</span><span class="meta">' + esc(m.lesson.remaining) + '</span></div><button class="btn btn--outline" type="button" data-act="player" data-id="' + esc(m.lesson.sessionId) + '">' + (m.linked ? 'Watch' : 'Resume') + '</button></div>' : '';
    return '<div class="page">' +
      '<div class="greet"><div><span class="eyebrow">' + esc(m.dateLabel) + '</span><h1 class="title-md">Morning, ' + esc(firstName(m.driver.name)) + '</h1></div><div class="avatar" aria-label="' + esc(m.driver.name) + '">' + esc(m.driver.initials) + '</div></div>' +
      '<div class="card card--dark score-card"><div class="score-top">' + scoreTop + '</div>' + spark + foot + '</div>' +
      streaks + action + stand + lesson + '</div>';
  }

  function sessionsHtml(m) {
    const openList = m.sessions.filter((s) => s.open);
    const history = m.sessions.filter((s) => !s.open);
    const rows = state.filter === 'Open' ? openList : history;
    return '<div class="page gap-18">' +
      '<div class="head-block"><h1 class="title-xl">Coaching</h1><p class="lede">Sessions are short. Action the open one, keep the rest for reference.</p></div>' +
      '<div class="pills" role="tablist" aria-label="Session filter">' + ['Open', 'History'].map((f) => '<button class="pill' + (state.filter === f ? ' is-on' : '') + '" type="button" role="tab" aria-selected="' + (state.filter === f) + '" data-act="filter" data-filter="' + f + '">' + f + (f === 'Open' && openList.length ? ' · ' + openList.length : '') + '</button>').join('') + '</div>' +
      (rows.length ? rows.map((s) => '<button class="card session-card' + (['action', 'overdue', 'followup'].includes(s.status) ? ' is-live' : '') + '" type="button" data-act="open-session" data-id="' + esc(s.id) + '"><div class="top">' + chipHtml(s.chip, s.statusLabel) + '<span class="when">' + esc(s.dateShort) + '</span></div><div class="title">' + esc(s.title) + '</div><div class="sub">' + esc(s.meta) + '</div></button>').join('')
        : '<div class="card empty">' + (state.filter === 'Open' ? 'No open sessions. Anything new lands here first.' : 'No completed sessions yet.') + '</div>') +
      '</div>';
  }

  function clipHtml(s, m) {
    if (!s.clip) return '';
    if (s.clip.kind === 'pattern') {
      return '<div class="media-stack"><div class="clip clip--pattern"><span class="eyebrow">Telematics pattern</span><strong>' + esc(s.clip.title) + '</strong><p>' + esc(s.clip.meta) + '</p></div><p class="footnote">' + esc(s.clip.footnote) + '</p></div>';
    }
    return '<div class="media-stack"><div class="clip" role="img" aria-label="Event clip placeholder"><div class="clip-tag"><i class="dot" aria-hidden="true"></i>' + esc(s.clip.label) + '</div><div class="clip-cam">' + esc(s.clip.cam) + '</div><div class="play-big"><i></i></div>' +
      '<div class="clip-foot"><div class="clip-bar"><div class="track"><i></i><b></b></div><span class="num">' + esc(s.clip.time) + '</span></div><p>' + esc(s.clip.note) + (m.linked ? ' · video placeholder' : '') + '</p></div></div>' +
      (s.clip.footnote ? '<p class="footnote">' + esc(s.clip.footnote) + '</p>' : '') + '</div>';
  }

  function mapHtml(s) {
    if (!s.map) return '';
    return '<div class="map" role="img" aria-label="Map placeholder' + (s.map.place ? ' for ' + esc(s.map.place) : '') + '"><svg viewBox="0 0 340 172" aria-hidden="true"><path d="M18 148 C 96 138, 108 92, 168 84 S 268 62, 324 26" fill="none" stroke="#14261F" stroke-width="4" stroke-linecap="round" opacity="0.28"></path><path d="M168 84 S 268 62, 324 26" fill="none" stroke="#FF6B3D" stroke-width="4" stroke-linecap="round"></path><circle cx="168" cy="84" r="6" fill="#FF6B3D"></circle></svg><span class="map-tag">Map placeholder</span>' + (s.map.place ? '<span class="map-place">' + esc(s.map.place) + '</span>' : '') + '</div>';
  }

  function detailHtml(m) {
    const s = m.sessions.find((x) => x.id === state.sessionId) || m.sessions[0];
    if (!s) return '<div class="page">' + backHtml('go-sessions', 'Coaching') + '<div class="card empty">No session selected.</div></div>';
    const speed = s.speedChart ? '<div class="card speed-card"><div class="head"><span class="eyebrow eyebrow--sm">Speed vs limit</span><span class="peak">Peak 48 km/h</span></div><div class="speed-plot"><svg viewBox="0 0 300 74" preserveAspectRatio="none" aria-hidden="true"><line x1="0" y1="34" x2="300" y2="34" stroke="#C7C0B4" stroke-width="1.5" stroke-dasharray="5 5"></line><path d="M0 58 L40 52 L80 40 L110 24 L170 22 L200 26 L240 46 L300 60" fill="none" stroke="#14261F" stroke-width="2.5" stroke-linejoin="round"></path><path d="M110 24 L170 22 L200 26 L200 34 L110 34 Z" fill="#FF6B3D" opacity="0.22"></path></svg><span>40 limit</span></div></div>' : '';
    const tips = s.tips ? '<h2 class="title-sm" style="padding-top:4px">Two things that help</h2><div class="tips">' + s.tips.map((t, i) => '<div class="tip"><span class="tip-n">' + (i + 1) + '</span><div class="row-text"><span class="row-title">' + esc(t.title) + '</span><span class="row-note">' + esc(t.body) + '</span></div></div>').join('') + '</div>' : '';
    const lesson = s.lesson ? '<button class="assign-card" type="button" data-act="player" data-id="' + esc(s.id) + '"><span class="play-tile play-tile--dark" aria-hidden="true"><i class="tri tri--accent"></i></span><span class="row-text"><span class="eyebrow eyebrow--light eyebrow--sm">Assigned ' + (s.lessonDone ? 'lesson · watched' : 'clip' + (s.lesson.length ? ' · ' + esc(s.lesson.length) : '')) + '</span><span class="row-title">' + esc(s.lesson.title) + '</span></span></button>' : '';
    const ack = s.canAck
      ? '<button class="btn btn--accent mt-6" type="button" data-act="ack" data-id="' + esc(s.id) + '">Got it — mark reviewed</button>'
      : s.acked || s.status === 'completed'
        ? '<div class="card card--good acked-card"><strong>' + (s.status === 'completed' ? 'Completed · ' : 'Reviewed · ') + esc(m.coach.name) + ' notified</strong><span>' + (s.status === 'completed' ? 'This session is closed out and moves to your history.' : 'Session moves to your history. Finish the clip to close it out.') + '</span></div>'
        : s.status === 'waiting' ? '<div class="card card--good acked-card"><strong>Waiting on ' + esc(m.coach.name) + '</strong><span>Your reply is with your coach. Nothing else is needed from you right now.</span></div>' : '';
    return '<div class="page page--flush">' + backHtml('go-sessions', 'Coaching') +
      '<div class="detail-head"><div class="chips">' + chipHtml(s.chip, s.statusLabel) + '<span class="meta--faint meta">' + esc(s.when) + '</span></div><h1 class="title-lg">' + esc(s.title) + '</h1><p class="lede lede--lg">' + esc(s.subline) + '</p></div>' +
      clipHtml(s, m) + mapHtml(s) +
      '<div class="block block--top"><h2 class="title-sm">What happened</h2><p class="copy">' + esc(s.summary) + '</p>' + speed + tips + lesson +
      (m.linked && s.raw.deliveryMode === 'automated' ? '<button class="btn btn--outline-wide" type="button" data-act="request-review" data-id="' + esc(s.id) + '">Request review</button>' : '<div class="card coach-card"><div class="avatar avatar--40">' + esc(m.coach.initials) + '</div><div class="row-text"><span class="row-title">' + esc(m.coach.name) + '</span><span class="row-note">Assigned this session</span></div><button class="btn btn--outline" type="button" data-act="open-thread" data-id="' + esc(s.id) + '">Message</button></div>') +
      ack + '</div></div>';
  }

  function analyticsHtml(m) {
    const a = m.analytics;
    const rv = a.ranges ? a.rangeMap[state.range] : null;
    const rangeLabel = rv ? rv[2] : 'Current score';
    const rangeScore = rv ? rv[0] : m.score.value;
    const rangeTrend = rv ? rv[1] : m.score.changeLabel;
    const ranges = a.ranges ? '<div class="ranges" role="tablist" aria-label="Range">' + Object.keys(a.rangeMap).map((r) => '<button class="range' + (state.range === r ? ' is-on' : '') + '" type="button" role="tab" aria-selected="' + (state.range === r) + '" data-act="range" data-range="' + esc(r) + '">' + esc(r) + '</button>').join('') + '</div>' : '';
    const composition = a.composition ? '<div class="composition"><div class="bar" aria-hidden="true">' + a.composition.map(([, color, w]) => '<i style="width:' + w + '%;background:' + color + '"></i>').join('') + '</div><div class="legend">' + a.composition.map(([label, color]) => '<span><i style="background:' + color + '"></i>' + esc(label) + '</span>').join('') + '</div></div>' : '';
    const behaviours = a.behaviours.map((b) => {
      const fill = b.score === null ? (b.tone === 'low' ? 'fill--low' : 'fill--good') : b.score < 70 ? 'fill--low' : b.score < 90 ? 'fill--mid' : 'fill--good';
      const w = b.score === null ? b.w : b.score;
      return '<button class="bh-row" type="button" data-act="behaviour" data-key="' + esc(b.key) + '"><div class="line"><span class="name">' + esc(b.name) + '</span><span class="count num">' + esc(b.count) + '</span>' + (b.score !== null ? '<span class="score num">' + b.score + '</span>' : '') + '<span class="chev" aria-hidden="true"></span></div><div class="bar-track" aria-hidden="true"><i class="' + fill + '" style="width:' + w + '%"></i></div><div class="foot"><span>' + esc(b.verdict) + '</span>' + (b.trend ? '<b class="t-' + (b.trendTone || 'muted') + ' num">' + esc(b.trend) + '</b>' : '') + '</div></button>';
    }).join('');
    return '<div class="page" style="gap:17px">' +
      '<div class="head-block"><h1 class="title-xl">Your score</h1><p class="lede">' + (m.linked ? 'The programs your fleet tracks in Elevate, and where your sessions sit.' : "Every point comes from somewhere. Here's the breakdown.") + '</p></div>' + ranges +
      '<div class="card card--dark range-card"><div class="top"><div><span class="eyebrow eyebrow--light">' + esc(rangeLabel) + '</span><div class="score-num score-num--md num">' + (rangeScore === null ? '—' : rangeScore) + '</div></div><span class="trend trend--' + (m.linked && m.score.change !== null && m.score.change < 0 ? 'bad' : rangeScore === null ? 'flat' : 'good') + '">' + esc(rangeTrend) + '</span></div>' + composition + '</div>' +
      '<div class="card" style="overflow:hidden"><div class="card-head card-head--split"><span style="font:600 11px/1.2 var(--text);letter-spacing:.12em;text-transform:uppercase;color:var(--faint)">' + (m.linked ? 'Program breakdown' : 'Behaviour breakdown') + '</span><span>' + esc(rangeLabel) + '</span></div>' + (behaviours || '<div class="empty">No program evidence recorded.</div>') +
      (a.groupAvg ? '<div class="card-foot"><span>Group average</span><strong>' + esc(a.groupAvg) + '</strong></div>' : '') + '</div>' +
      '<button class="card link-card" type="button" data-act="go" data-route="scoring"><span class="q-mark" aria-hidden="true">?</span><span class="row-text"><span class="row-title">How your score works</span><span class="row-note">What\'s measured, what isn\'t, and who sees it</span></span><span class="chev" aria-hidden="true"></span></button>' +
      (a.gain ? '<div class="card card--good gain-card"><span class="eyebrow eyebrow--good">' + (m.linked ? 'Completed coaching' : 'Biggest gain') + '</span><strong>' + esc(a.gain.title) + '</strong><p>' + esc(a.gain.body) + '</p></div>' : '') +
      '</div>';
  }

  function behaviourHtml(m) {
    const a = m.analytics;
    const b = a.behaviours.find((x) => x.key === state.behaviour) || a.behaviours[0];
    if (!b) return '<div class="page page--flush">' + backHtml('go-analytics', 'Your score') + '<div class="block"><div class="card empty">No program selected.</div></div></div>';
    const low = b.score === null ? b.tone === 'low' : b.score < 70;
    const accentClass = b.score === null ? (low ? 't-bad' : 't-good') : b.score < 70 ? 't-bad' : b.score < 90 ? 't-muted' : 't-good';
    const fill = b.score === null ? (low ? 'fill--low' : 'fill--good') : b.score < 70 ? 'fill--low' : b.score < 90 ? 'fill--mid' : 'fill--good';
    return '<div class="page page--flush">' + backHtml('go-analytics', 'Your score') +
      '<div class="block gap-16"><div class="gap-8"><span class="eyebrow">' + esc(a.bhRange) + '</span><h1 class="title-lg">' + esc(b.name) + '</h1></div>' +
      '<div class="card bh-card' + (low ? ' card--tint' : '') + '"><div class="top"><div><span class="verdict ' + accentClass + '">' + esc(b.verdict) + '</span><div class="score-num-row">' + (b.score === null ? '<div class="score-num score-num--bh num">' + esc(String(b.count).split(' ')[0]) + '</div><div class="den">' + esc(String(b.count).split(' ').slice(1).join(' ')) + '</div>' : '<div class="score-num score-num--bh num">' + b.score + '</div><div class="den">/ 100</div>') + '</div></div><div class="side">' + (b.trend ? '<b class="t-' + (b.trendTone || 'muted') + ' num">' + esc(b.trend) + '</b>' : '') + '<span>' + esc(b.score === null ? 'Recorded in Elevate' : b.count) + '</span></div></div>' +
      '<div class="bar-track" aria-hidden="true"><i class="' + fill + '" style="width:' + (b.score === null ? b.w : b.score) + '%"></i></div>' +
      (b.avg !== null ? '<div class="scale"><span>Group average ' + b.avg + '</span><span>Fleet target 85</span></div>' : '<div class="scale"><span>Evidence still linked to a session</span><span>' + esc(b.verdict) + '</span></div>') + '</div>' +
      (b.why ? '<div class="gap-9"><h2 class="title-sm">' + (m.linked ? 'What was recorded' : "Why it's measured") + '</h2><p class="copy">' + esc(b.why) + '</p></div>' : '') +
      (b.reminders && b.reminders.length ? '<div class="card" style="overflow:hidden"><div class="card-head" style="font-size:11px;line-height:1.2;padding:14px 16px 12px">Reminders</div>' + b.reminders.map((r) => '<div class="reminder"><i aria-hidden="true"></i><p>' + esc(r) + '</p></div>').join('') + '</div>' : '') +
      (b.lesson ? '<div class="gap-9"><h2 class="title-sm">Assigned lesson</h2><button class="card lesson-row" type="button" data-act="player" data-id="' + esc(b.sessionId || '') + '"><span class="play-tile" aria-hidden="true"><i class="tri"></i></span><span class="row-text"><span class="row-title">' + esc(b.lesson.title) + '</span><span class="meta">' + esc(b.lesson.length || 'Mapped to this programme') + '</span></span><span class="chev" aria-hidden="true"></span></button></div>' : '') +
      (b.events && b.events.length ? '<div class="gap-9"><h2 class="title-sm">' + (m.linked ? 'In this programme' : 'Recent moments') + '</h2><div class="moments">' + b.events.map((e) => '<button class="card moment" type="button" data-act="open-session" data-id="' + esc(e.sessionId) + '"><span class="row-text"><span class="row-title">' + esc(e.title) + '</span><span class="row-note">' + esc(e.meta) + '</span></span><span class="delta delta--bad">' + esc(e.tag) + '</span></button>').join('') + '</div></div>' : '') +
      '<button class="btn btn--outline-wide" type="button" data-act="open-thread" data-id="' + esc(b.sessionId || (b.events[0] && b.events[0].sessionId) || (m.sessions[0] && m.sessions[0].id) || '') + '">Ask ' + esc(m.coach.name) + ' about this</button>' +
      '</div></div>';
  }

  function scoringHtml(m) {
    const a = m.analytics;
    return '<div class="page page--flush">' + backHtml('go-analytics', 'Your score') +
      '<div class="block gap-18"><div class="gap-8"><h1 class="title-lg">How your score works</h1><p class="lede lede--lg">' + esc(a.intro) + '</p></div>' +
      '<div class="card measured" style="overflow:hidden"><div class="card-head" style="font-size:11px;line-height:1.2;padding:14px 16px 12px">What\'s measured</div>' + (a.measured.length ? a.measured.map((x) => '<div class="row"><div class="row-text"><span class="row-title">' + esc(x.name) + '</span><span class="row-note">' + esc(x.rule) + '</span></div>' + (a.showWeights ? '<span class="weight">' + esc(x.weight) + '</span>' : '') + '</div>').join('') : '<div class="empty">No programs published yet.</div>') + '</div>' +
      '<div class="card card--good never" style="overflow:hidden"><div class="card-head" style="font-size:11px;line-height:1.2;padding:14px 16px 12px">What never affects it</div>' + a.notMeasured.map((t) => '<div class="item">' + esc(t) + '</div>').join('') + '</div>' +
      '<div class="gap-9"><h2 class="title-sm">Who sees it</h2><p class="copy">You and ' + esc(m.coach.name) + '. Your operations manager sees group-level numbers and open sessions, not individual event locations. Scores aren\'t used for pay or discipline on their own.</p></div>' +
      '<div class="card--dashed">Think a flag is wrong? Open the session and message your coach — your reply goes to them with the trip data attached.</div>' +
      '</div></div>';
  }

  function coachHtml(m) {
    return '<div class="page gap-18">' +
      '<div class="head-block"><h1 class="title-xl">Messages</h1><p class="lede">Every session has its own thread. Replies stay with the event they belong to.</p></div>' +
      '<div class="card card--18 coach-row"><div class="avatar avatar--38">' + esc(m.coach.initials) + '</div><div class="row-text"><span class="row-title">' + esc(m.coach.name) + '</span><span class="row-note">Your coach · usually replies within a day</span></div></div>' +
      '<div class="threads">' + (m.threads.length ? m.threads.map((t) => {
        const last = t.msgs.length ? t.msgs[t.msgs.length - 1] : null;
        const preview = last ? (last.from === 'me' ? 'You: ' + last.text : last.text) : 'No messages yet — start the thread.';
        const stamp = last ? (last.meta.split(' · ')[1] || '') : '';
        return '<button class="card thread-card' + (t.unread ? ' is-unread' : '') + '" type="button" data-act="open-thread" data-id="' + esc(t.id) + '"><div class="top">' + chipHtml(t.open ? 'open' : 'closed', t.open ? 'Open' : 'Closed') + '<span class="sp"></span>' + (t.unread ? '<span class="badge" aria-label="' + t.unread + ' unread">' + t.unread + '</span>' : '') + '<span class="stamp">' + esc(stamp) + '</span></div><div class="title">' + esc(t.title) + '</div><div class="preview' + (last ? '' : ' is-empty') + '">' + esc(preview) + '</div><div class="sub">' + esc(t.sub) + '</div></button>';
      }).join('') : '<div class="card empty">No session threads yet.</div>') + '</div></div>';
  }

  function threadHtml(m) {
    const t = m.threads.find((x) => x.id === state.thread) || m.threads[0];
    if (!t) return '<div class="thread"><div class="thread-head">' + '<button class="back" type="button" data-act="go-coach"><span class="chev chev--back" aria-hidden="true"></span><span>All messages</span></button></div><div class="msgs"><p class="msgs-empty">No session threads yet.</p></div></div>';
    const asks = m.quickAsks ? '<div class="ask-label"><span class="ask-mark" aria-hidden="true"><i></i></span><span>Ask the assistant</span></div><div class="asks">' + m.quickAsks.map((q, i) => '<button class="ask" type="button" data-act="ask" data-index="' + i + '">' + esc(q.label) + '</button>').join('') + '</div>' : '';
    return '<div class="thread">' +
      '<div class="thread-head"><button class="back" type="button" data-act="go-coach"><span class="chev chev--back" aria-hidden="true"></span><span>All messages</span></button>' +
      '<div class="who"><div class="avatar avatar--36">' + esc(m.coach.initials) + '</div><div class="row-text"><h1 class="row-title" style="font-family:var(--text);letter-spacing:0">' + esc(t.title) + '</h1><span class="row-note">' + esc(t.sub) + ' · ' + esc(m.coach.name) + '</span></div><span class="chip chip--pill">' + (t.open ? 'Open' : 'Closed') + '</span></div></div>' +
      '<div class="msgs" id="msgs" aria-live="polite">' + (t.msgs.length ? t.msgs.map((msg) => '<div class="msg is-' + (msg.from === 'me' ? 'me' : msg.from === 'ai' ? 'ai' : msg.from === 'system' ? 'system' : 'coach') + '"><div class="bubble">' + esc(msg.text) + '</div>' + (msg.from === 'system' ? '' : '<small>' + esc(msg.meta) + '</small>') + '</div>').join('') : '<p class="msgs-empty">No messages on this session yet. Anything you send here stays attached to it.</p>') + '</div>' +
      '<form class="composer" data-act="send-form">' + asks + '<div class="compose-row"><label class="sr-only" for="draft">Reply about this session</label><input id="draft" type="text" autocomplete="off" enterkeyhint="send" placeholder="Reply about this session" value="' + esc(state.draft) + '"><button class="send" type="submit" aria-label="Send"><i aria-hidden="true"></i></button></div></form></div>';
  }

  // The library, grouped by programme so a driver can find lessons the way the fleet organizes coaching.
  function libraryHtml(rows) {
    if (!rows.length) return '<div class="gap-9"><span class="eyebrow eyebrow--sm">All lessons</span><div class="card empty">No lessons published yet.</div></div>';
    const groups = [];
    rows.forEach((l) => { const key = l.category || 'Other'; let g = groups.find((x) => x.key === key); if (!g) { g = { key, items: [] }; groups.push(g); } g.items.push(l); });
    const lessonBtn = (l) => '<button class="row lesson-lib" type="button" data-act="play-lesson" data-title="' + esc(l.title) + '"><span class="play-tile play-tile--sm" aria-hidden="true"><i class="tri"></i></span><span class="row-text"><span class="row-title">' + esc(l.title) + '</span><span class="row-note">' + esc(l.length || '') + '</span></span>' + (state.watched[l.title] ? '<span class="delta delta--good">Watched</span>' : '<span class="chev" aria-hidden="true"></span>') + '</button>';
    return '<div class="gap-9"><span class="eyebrow eyebrow--sm">All lessons · by programme</span>' +
      groups.map((g) => '<div class="lesson-group"><div class="lesson-group-head">' + esc(g.key) + '</div><div class="card" style="overflow:hidden">' + g.items.map(lessonBtn).join('') + '</div></div>').join('') + '</div>';
  }

  function learnHtml(m) {
    const assigned = m.sessions.filter((s) => s.lesson && s.open);
    const rows = m.lessons || [];
    return '<div class="page gap-18">' +
      '<div class="head-block"><h1 class="title-xl">Learn</h1><p class="lede">' + (assigned.length ? 'Your assigned lesson comes first. Everything else is yours to watch any time.' : 'Nothing is assigned right now. Every lesson is yours to watch any time.') + '</p></div>' +
      (assigned.length ? '<div class="gap-9"><span class="eyebrow eyebrow--sm">Assigned</span>' + assigned.map((s) => '<button class="card lesson-row" type="button" data-act="player" data-id="' + esc(s.id) + '"><span class="play-tile" aria-hidden="true"><i class="tri"></i></span><span class="row-text"><span class="row-title">' + esc(s.lesson.title) + '</span><span class="meta">' + esc([s.lesson.length, 'For ' + s.title].filter(Boolean).join(' · ')) + '</span></span><span class="chip chip--' + (s.lessonDone ? 'good' : 'live') + '">' + (s.lessonDone ? 'Done' : 'Assigned') + '</span></button>').join('') + '</div>' : '') +
      libraryHtml(rows) + '</div>';
  }

  function coachViewHtml(m) {
    return '<div class="page">' +
      '<div class="sketch-note">' + (m.linked ? 'Coach side — reads the same Elevate sessions the manager sees' : 'Coach side — sketch only, not built out') + '</div>' +
      '<div class="head-block"><h1 class="title-xl">My drivers</h1><p class="lede">' + esc(m.rosterLede) + '</p></div>' +
      m.roster.map((d) => '<div class="card card--18 roster-row"><div class="avatar avatar--40">' + esc(d.initials) + '</div><div class="row-text"><span class="row-title">' + esc(d.name) + '</span><span class="row-note">' + esc(d.note) + '</span></div><div class="score"><strong>' + esc(d.score) + '</strong><span class="t-' + (d.tone || 'muted') + ' num">' + esc(d.trend) + '</span></div></div>').join('') + '</div>';
  }

  function tabsHtml(m) {
    if (state.route === 'thread' || state.route === 'coachview') return '';
    const homeish = ['home', 'analytics', 'behaviour', 'scoring'].includes(state.route);
    const defs = [['home', 'Home', homeish && state.overlay !== 'player'], ['sessions', 'Coaching', ['sessions', 'detail'].includes(state.route) && state.overlay !== 'player'], ['learn', 'Learn', state.route === 'learn' || state.overlay === 'player'], ['coach', 'Messages', ['coach', 'thread'].includes(state.route)]];
    return '<nav class="tabbar" aria-label="App sections">' + defs.map(([key, label, on]) => '<button class="tab' + (on ? ' is-on' : '') + '" type="button" data-act="tab" data-tab="' + key + '"' + (on ? ' aria-current="page"' : '') + '><i aria-hidden="true"></i><span>' + label + '</span></button>').join('') + '</nav>';
  }

  function nudgeHtml() {
    return '<div class="overlay nudge" role="dialog" aria-label="In-trip nudge"><div class="nudge-top"><span class="eyebrow">On trip · 214 North</span><div class="nudge-speed num">48</div><div class="nudge-limit"><b>40</b><span>School zone until 3rd</span></div></div>' +
      '<div class="nudge-sheet"><div class="label"><span class="pulse" aria-hidden="true"></span><span>Heads up</span></div><strong>Zone drops to 40 here. Ease off when it\'s safe.</strong><p>Nothing is logged yet. Full review lands after the trip — no need to touch your phone.</p><button class="btn" type="button" data-act="overlay" data-overlay="posttrip">End trip →</button></div></div>';
  }

  function postTripHtml(m) {
    const trip = m.trip || { events: [] };
    return '<div class="overlay sheet-backdrop" role="dialog" aria-label="Post-trip review"><div class="sheet"><span class="grabber" aria-hidden="true"></span><div class="head-block"><span class="eyebrow">Trip complete · 42 min · 31 km</span><h1 class="title-md">Solid trip. Two moments to look at.</h1></div>' +
      '<div class="card card--18" style="overflow:hidden">' + trip.events.map((e) => '<div class="trip-row"><i style="background:' + e.color + '" aria-hidden="true"></i><div class="row-text"><span class="row-title">' + esc(e.name) + '</span><span class="row-note">' + esc(e.meta) + '</span></div><span class="tag" style="color:' + e.color + '">' + esc(e.tag) + '</span></div>').join('') + '<div class="trip-foot"><span>Smooth stops, no phone use</span><b>+2 pts</b></div></div>' +
      '<button class="btn btn--accent" type="button" data-act="open-session" data-id="' + esc((trip.events[0] && trip.events[0].sessionId) || (m.sessions[0] && m.sessions[0].id) || '') + '">Review the 40-zone moment</button><button class="btn btn--text" type="button" data-act="go" data-route="home">Later — keep it in Coaching</button></div></div>';
  }

  function playerHtml(m) {
    const standalone = !state.sessionId && Boolean(state.lessonTitle);
    const s = standalone ? null : (m.sessions.find((x) => x.id === state.sessionId) || m.sessions.find((x) => x.lesson) || m.sessions[0]);
    const lib = standalone ? (m.lessons || []).find((l) => l.title === state.lessonTitle) : null;
    const lesson = lib
      ? { title: lib.title, length: lib.length, videoUrl: lib.videoUrl, posterUrl: lib.posterUrl, captionsUrl: lib.captionsUrl, lede: [lib.category, lib.length].filter(Boolean).join(' · ') + '. Watch it any time; nothing is assigned or recorded.' }
      : (s && s.lesson) || { title: 'Reading a school zone early', length: '3 min', lede: 'Three minutes on the cues that show up before the sign does, and how to carry less speed into the turn.' };
    const realVideo = Boolean(lesson.videoUrl);
    const secs = Math.round(180 * state.progress / 100);
    const elapsed = Math.floor(secs / 60) + ':' + String(secs % 60).padStart(2, '0');
    const done = standalone ? Boolean(state.watched[lesson.title]) : s ? Boolean(state.lessonDone[s.id]) : false;
    const chapters = m.chapters.map(([time, title, upTo]) => { const on = state.progress >= upTo - 34 && state.progress < upTo + 2; return '<div class="chapter' + (on ? ' is-on' : '') + '"><small class="num">' + time + '</small><span>' + esc(title) + '</span></div>'; }).join('');
    return '<div class="overlay player" role="dialog" aria-label="Lesson player"><div class="player-top"><button class="close" type="button" data-act="close-player">Close</button><span class="eyebrow">' + (standalone ? 'From the library' : m.linked ? 'Assigned lesson' : 'Lesson 2 of 4') + '</span></div>' +
      (realVideo
        ? '<div class="video video--real"><video class="lesson-video" controls playsinline preload="metadata"' + (lesson.posterUrl ? ' poster="' + esc(lesson.posterUrl) + '"' : '') + ' aria-label="' + esc(lesson.title + ' course video') + '" src="' + esc(lesson.videoUrl) + '">' + (lesson.captionsUrl ? '<track kind="captions" srclang="en" label="English" src="' + esc(lesson.captionsUrl) + '">' : '') + '</video></div>'
        : '<div class="video"><button class="play-toggle" type="button" data-act="toggle-play" aria-label="' + (state.playing ? 'Pause' : 'Play') + '" aria-pressed="' + state.playing + '">' + (state.playing ? '<span class="pause" aria-hidden="true"><i></i><i></i></span>' : '<span class="play" aria-hidden="true"></span>') + '</button><span class="tag">Video placeholder</span></div>' +
          '<div class="progress"><div class="track" role="progressbar" aria-valuemin="0" aria-valuemax="100" aria-valuenow="' + state.progress + '"><i style="width:' + state.progress + '%"></i></div><div class="times"><span>' + elapsed + '</span><span>3:00</span></div></div>') +
      '<div class="player-body"><h1 class="title">' + esc(lesson.title) + '</h1><p class="lede">' + esc(lesson.lede || ('Assigned for ' + (s ? s.title.toLowerCase() : 'this session') + '.')) + '</p>' + (realVideo ? '<p class="lede">' + esc(lesson.length || '') + (lesson.captionsUrl ? ' · Captions on screen and in the player.' : '') + '</p>' : '<div class="chapters">' + chapters + '</div>') +
      (s && s.coachNote ? '<div class="notes-card"><span class="eyebrow">Notes from ' + esc(m.coach.name) + '</span><p>' + esc(s.coachNote) + '</p></div>' : '') +
      '<button class="btn btn--accent' + (done ? ' is-done' : '') + '" type="button" data-act="complete-lesson" data-id="' + esc(s ? s.id : '') + '" data-title="' + esc(standalone ? lesson.title : '') + '">' + (done ? (standalone ? 'Watched · back to Learn' : m.linked ? 'Watched · back to session' : 'Completed · back to session') : (standalone ? 'Mark as watched' : m.linked ? 'Mark watched · prototype' : 'Mark lesson complete')) + '</button></div></div>';
  }

  /* ── Render ────────────────────────────────────────────────────────── */
  const app = document.getElementById('app');
  const device = document.getElementById('device');
  const screen = document.getElementById('screen');

  function routeHtml(m) {
    switch (state.route) {
      case 'sessions': return sessionsHtml(m);
      case 'detail': return detailHtml(m);
      case 'analytics': return analyticsHtml(m);
      case 'behaviour': return behaviourHtml(m);
      case 'scoring': return scoringHtml(m);
      case 'coach': return coachHtml(m);
      case 'thread': return threadHtml(m);
      case 'coachview': return coachViewHtml(m);
      case 'learn': return learnHtml(m);
      default: return homeHtml(m);
    }
  }

  function render(options = {}) {
    const m = model();
    document.body.classList.toggle('is-embed', EMBED);
    document.body.classList.toggle('is-narrow', NARROW());
    document.body.classList.toggle('is-framed', !NARROW());
    const dark = state.overlay === 'nudge' || state.overlay === 'player';
    device.classList.toggle('is-dark', dark);
    const keepScroll = options.keepScroll ? screen.querySelector('.scroll')?.scrollTop || 0 : 0;
    screen.innerHTML = (state.route === 'thread' ? routeHtml(m) : '<div class="scroll">' + routeHtml(m) + '</div>') + tabsHtml(m) +
      (state.overlay === 'nudge' ? nudgeHtml() : state.overlay === 'posttrip' ? postTripHtml(m) : state.overlay === 'player' ? playerHtml(m) : '');
    const scroll = screen.querySelector('.scroll');
    if (scroll) scroll.scrollTop = keepScroll;
    const msgs = document.getElementById('msgs');
    if (msgs) msgs.scrollTop = msgs.scrollHeight;
    document.title = (m.linked ? esc(firstName(m.driver.name)) + ' · ' : '') + 'Elevate Driver';
    renderRail(m);
    if (!options.silent) {
      const heading = screen.querySelector('.overlay h1, .overlay [role="dialog"], .scroll h1, .thread h1');
      if (heading && options.focus !== false) { heading.setAttribute('tabindex', '-1'); heading.focus({ preventScroll: true }); }
    }
  }

  const RAIL = [
    ['home', 'Home — score & standing', 'Home'], ['nudge', 'In-trip nudge', 'Overlay'], ['posttrip', 'Post-trip review', 'Sheet'],
    ['detail', 'Session detail', 'Coaching'], ['player', 'Lesson player', 'Learn'], ['coach', 'Message threads', 'Messages'],
    ['thread', 'Session thread — chat', 'Messages'], ['analytics', 'Score analytics', 'Insights'], ['behaviour', 'Behaviour drill-down', 'Insights'],
    ['scoring', 'How your score works', 'Trust'], ['sessions', 'Session list & history', 'Coaching']
  ];
  const OVERLAYS = ['nudge', 'posttrip', 'player'];

  function renderRail(m) {
    const rail = document.getElementById('rail-flows');
    if (!rail) return;
    rail.innerHTML = RAIL.map(([key, label, hint]) => {
      const on = OVERLAYS.includes(key) ? state.overlay === key : (!state.overlay && state.route === key);
      const unsupported = m.linked && !m.caps[key === 'posttrip' ? 'postTrip' : key];
      const shownHint = (key === 'nudge' || key === 'posttrip') && m.linked ? 'Not in Elevate' : hint;
      return '<button class="rail-btn' + (on ? ' is-on' : '') + '" type="button" data-act="flow" data-flow="' + key + '"' + (unsupported && OVERLAYS.includes(key) && key !== 'player' ? ' aria-describedby="rail-unsupported"' : '') + '><span>' + label + '</span><small>' + shownHint + '</small></button>';
    }).join('');
    const coachBtn = document.getElementById('rail-coachview');
    if (coachBtn) coachBtn.classList.toggle('is-on', !state.overlay && state.route === 'coachview');
    document.querySelectorAll('[data-act="mode"]').forEach((b) => b.classList.toggle('is-on', b.dataset.mode === state.mode));
    const who = document.getElementById('rail-who');
    if (who) who.textContent = m.linked ? 'Linked to Elevate · viewing as ' + m.driver.name + (m.coach ? ' · coach ' + m.coach.name : '') : 'Design fixture · Dana R with Marcus K as coach';
  }

  /* ── Hash routing (standalone only) ────────────────────────────────── */
  function currentHash() {
    if (state.overlay) return '#' + state.overlay;
    const id = state.route === 'detail' ? state.sessionId : state.route === 'thread' ? state.thread : state.route === 'behaviour' ? state.behaviour : null;
    return '#' + state.route + (id ? '/' + encodeURIComponent(id) : '');
  }
  function syncHash(replace) {
    if (EMBED) return;
    const next = currentHash();
    if (window.location.hash === next) return;
    try { window.history[replace ? 'replaceState' : 'pushState'](null, '', next); } catch (error) { window.location.hash = next; }
  }
  function readHash() {
    const raw = window.location.hash.replace(/^#/, '');
    if (!raw) return false;
    const [key, id] = raw.split('/');
    const decoded = id ? decodeURIComponent(id) : null;
    if (OVERLAYS.includes(key)) { state.overlay = key; return true; }
    if (['home', 'sessions', 'detail', 'analytics', 'behaviour', 'scoring', 'coach', 'thread', 'coachview', 'learn'].includes(key)) {
      state.overlay = null; state.route = key;
      if (key === 'detail') state.sessionId = decoded || state.sessionId;
      if (key === 'thread') state.thread = decoded || state.thread;
      if (key === 'behaviour') state.behaviour = decoded || state.behaviour;
      return true;
    }
    return false;
  }

  /* ── Actions ───────────────────────────────────────────────────────── */
  function stopTimer() { clearInterval(state.timer); state.timer = null; }
  function tick() {
    stopTimer();
    state.timer = setInterval(() => {
      if (state.progress >= 100) { stopTimer(); state.playing = false; render({ silent: true, keepScroll: true }); return; }
      state.progress = Math.min(100, state.progress + 2);
      render({ silent: true, keepScroll: true });
    }, 260);
  }
  function go(route, extra) {
    if (state.overlay) stopTimer();
    state.previousRoute = state.route;
    state.overlay = null; state.playing = false; state.route = route;
    Object.assign(state, extra || {});
    render(); syncHash(); notifyRoute();
  }
  function openOverlay(name) {
    state.overlay = name;
    if (name !== 'player') { stopTimer(); state.playing = false; }
    render(); syncHash(); notifyRoute();
  }
  function openSession(id) {
    const m = model();
    const s = m.sessions.find((x) => x.id === id) || m.sessions[0];
    if (!s) return go('sessions');
    if (!state.opened[s.id] && s.open) { state.opened[s.id] = true; emit('session_opened', { sessionId: s.id, title: s.title }); }
    go('detail', { sessionId: s.id });
  }
  function openThread(id) {
    const m = model();
    const t = m.threads.find((x) => x.id === id) || m.threads[0];
    if (!t) return go('coach');
    state.readThreads[t.id] = true; state.draft = '';
    go('thread', { thread: t.id });
  }
  function pushLocal(id, msgs) { state.localMsgs[id] = (state.localMsgs[id] || []).concat(msgs); }

  const actions = {
    go: (el) => go(el.dataset.route),
    'go-sessions': () => go('sessions'),
    'go-analytics': () => go('analytics'),
    'go-coach': () => go('coach'),
    tab: (el) => {
      const key = el.dataset.tab;
      go(key);
    },
    flow: (el) => {
      const key = el.dataset.flow;
      if (OVERLAYS.includes(key)) { if (key === 'player' && !state.sessionId) { const m = model(); state.sessionId = (m.lesson && m.lesson.sessionId) || (m.sessions[0] && m.sessions[0].id) || null; } return openOverlay(key); }
      if (key === 'detail' && !state.sessionId) { const m = model(); state.sessionId = (m.sessions[0] && m.sessions[0].id) || null; }
      if (key === 'thread' && !state.thread) { const m = model(); state.thread = (m.threads[0] && m.threads[0].id) || null; }
      go(key);
    },
    coachview: () => go('coachview'),
    mode: (el) => { state.mode = el.dataset.mode; state.acked = {}; state.lessonDone = {}; state.opened = {}; state.readThreads = {}; state.localMsgs = {}; state.sessionId = null; state.thread = null; state.behaviour = null; go('home'); },
    overlay: (el) => openOverlay(el.dataset.overlay),
    'open-session': (el) => openSession(el.dataset.id),
    'open-thread': (el) => openThread(el.dataset.id),
    filter: (el) => { state.filter = el.dataset.filter; render({ silent: true }); },
    range: (el) => { state.range = el.dataset.range; render({ silent: true }); },
    behaviour: (el) => go('behaviour', { behaviour: el.dataset.key }),
    'request-review': (el) => { emit('review_requested', { sessionId: el.dataset.id }); render({ silent: true, keepScroll: true }); },
    ack: (el) => {
      const id = el.dataset.id; const m = model(); const s = m.sessions.find((x) => x.id === id);
      state.acked[id] = true;
      emit('session_acknowledged', { sessionId: id, title: s ? s.title : '' });
      render({ silent: true, keepScroll: true });
    },
    player: (el) => { if (el.dataset.id) state.sessionId = el.dataset.id; state.lessonTitle = null; openOverlay('player'); },
    'play-lesson': (el) => { state.lessonTitle = el.dataset.title; state.sessionId = null; state.progress = 0; openOverlay('player'); },
    'close-player': () => { stopTimer(); state.playing = false; state.overlay = null; render(); syncHash(); notifyRoute(); },
    'toggle-play': () => { if (state.playing) { stopTimer(); state.playing = false; } else { state.playing = true; tick(); } render({ silent: true, keepScroll: true }); },
    'complete-lesson': (el) => {
      const id = el.dataset.id; const title = el.dataset.title; stopTimer();
      if (!id && title) {
        // Library lessons are the driver's own viewing: watched locally, nothing recorded in Elevate.
        if (state.watched[title]) { state.playing = false; state.overlay = null; go('learn'); return; }
        state.watched[title] = true; state.progress = 100; state.playing = false;
        render({ silent: true, keepScroll: true });
        return;
      }
      if (id && state.lessonDone[id]) { state.playing = false; state.overlay = null; go('detail', { sessionId: id }); return; }
      if (id) { state.lessonDone[id] = true; const m = model(); const s = m.sessions.find((x) => x.id === id); emit('lesson_watched', { sessionId: id, lesson: s && s.lesson ? s.lesson.title : '', title: s ? s.title : '' }); }
      state.progress = 100; state.playing = false;
      render({ silent: true, keepScroll: true });
    },
    ask: (el) => {
      const m = model(); const q = m.quickAsks && m.quickAsks[Number(el.dataset.index)]; if (!q) return;
      pushLocal(state.thread, [{ from: 'me', text: q.label, meta: 'You · just now' }, { from: 'ai', text: q.answer, meta: 'Assistant · just now' }]);
      render({ silent: true });
    }
  };

  function send() {
    const text = state.draft.trim(); if (!text) return;
    const m = model(); const coachName = m.coach.name; const threadId = state.thread;
    if (m.linked && !m.threads.some(t => t.id === threadId && t.open)) return;
    state.draft = '';
    pushLocal(threadId, [{ from: 'me', text, meta: 'You · just now' }]);
    emit('message_sent', { sessionId: threadId, text });
    render({ silent: true });
    if (!m.linked) setTimeout(() => { pushLocal(threadId, [{ from: 'coach', text: "Got it — I'll take a look before your Thursday check-in.", meta: coachName + ' · just now' }]); if (state.route === 'thread' && state.thread === threadId) render({ silent: true }); }, 1100);
    const input = document.getElementById('draft'); if (input) input.focus();
  }

  app.addEventListener('click', (event) => {
    const el = event.target.closest('[data-act]');
    if (!el || el.tagName === 'FORM') return;
    const handler = actions[el.dataset.act];
    if (handler) { event.preventDefault(); handler(el); }
  });
  app.addEventListener('ended', (event) => { if (event.target.matches('.lesson-video')) { state.progress = 100; state.playing = false; } }, true);
  app.addEventListener('submit', (event) => { if (event.target.matches('[data-act="send-form"]')) { event.preventDefault(); send(); } });
  app.addEventListener('input', (event) => { if (event.target.id === 'draft') state.draft = event.target.value; });

  window.addEventListener('storage', (event) => {
    if (event.key !== LINK_KEY) return;
    link = storage.get(LINK_KEY, null);
    render({ silent: true, keepScroll: true });
  });
  window.addEventListener('message', (event) => {
    if (event.origin !== window.location.origin || !event.data || event.data.source !== 'elevate-manager') return;
    const data = event.data;
    if (data.link) { link = data.link; storage.set(LINK_KEY, data.link); }
    if (data.mode && data.mode !== state.mode) { state.mode = data.mode; state.acked = {}; state.lessonDone = {}; state.opened = {}; state.readThreads = {}; state.localMsgs = {}; }
    if (data.driver) { state.driverName = data.driver; state.acked = {}; state.lessonDone = {}; state.opened = {}; state.readThreads = {}; state.localMsgs = {}; state.sessionId = null; state.thread = null; state.behaviour = null; }
    if (data.flow) { actions.flow({ dataset: { flow: data.flow } }); return; }
    if (data.route) { go(data.route); return; }
    render({ silent: true, keepScroll: true }); notifyRoute();
  });
  window.addEventListener('hashchange', () => { if (!EMBED && readHash()) render(); });
  window.addEventListener('resize', () => render({ silent: true, keepScroll: true }));

  if (!EMBED && !readHash()) syncHash(true);
  render({ focus: false });
  notifyRoute();
  window.elevateDriverApp = { state, model, render };
})();
