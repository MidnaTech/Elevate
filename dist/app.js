const escapeHtml = (value) => String(value).replace(/[&<>"']/g, (character) => ({
  '&': '&amp;',
  '<': '&lt;',
  '>': '&gt;',
  '"': '&quot;',
  "'": '&#039;'
})[character]);

/** @typedef {'system_handling' | 'manager_attention' | 'completed' | 'archived'} SessionLifecycleState */
/** @typedef {'driver_reply' | 'reminders_exhausted' | 'repeat_after_coaching'} AttentionReason */
/** @typedef {'automated' | 'manual_override'} SessionOrigin */
/**
 * @typedef {Object} AttentionItem
 * @property {string} id
 * @property {AttentionReason} reason
 * @property {string} recommendedAction
 * @property {string[]} rankingFactors
 * @property {number} automationAttempts
 * @property {string} dueTime
 * @property {{name: string, initials: string, group: string}} driver
 * @property {{id: string, name: string}} program
 */
/**
 * @typedef {Object} AutomationRunSummary
 * @property {string} analysisWindow
 * @property {string} lastRun
 * @property {string} nextRun
 * @property {'manual' | 'semi' | 'fully'} mode
 * @property {1 | 2} cadenceWeeks
 * @property {{identified: number, sessionTotal: number, pendingSessionReviews: number, automatedTotal: number, oneOnOneTotal: number, completed: number, systemHandled: number, escalated: number}} counts
 */
/**
 * @typedef {Object} OutcomeSeries
 * @property {string} id
 * @property {string} label
 * @property {number[]} values
 * @property {'events_per_1000_trips'} unit
 * @property {number} exposureTrips
 * @property {number} sampleSize
 * @property {'lower_is_better'} direction
 */

const attentionReasonMeta = {
  reminders_exhausted: { label: 'Overdue', shortLabel: 'Overdue', action: 'Contact driver', tone: 'overdue' },
  repeat_after_coaching: { label: 'Repeated', shortLabel: 'Repeated', action: 'Review pattern', tone: 'repeat' },
  driver_reply: { label: 'Replied', shortLabel: 'Replied', action: 'Review reply', tone: 'reply' }
};

function normalizeAttentionReason(reason) {
  return ({
    reply: 'driver_reply',
    overdue: 'reminders_exhausted',
    repeat: 'repeat_after_coaching'
  })[reason] || (attentionReasonMeta[reason] ? reason : null);
}

function normalizeSessionFilter(filter) {
  return ({ attention: 'manager_attention', open: 'system_handling', waiting: 'system_handling' })[filter] || normalizeAttentionReason(filter) || filter;
}

function normalizeSessionOrigin(origin) {
  return origin === 'manual' ? 'manual_override' : origin;
}

const driverNames = [
  'Jordan Lee', 'Casey Patel', 'Sam Rivera', 'Drew Thompson', 'Priya Singh',
  'Nico Perry', 'Mia Kim', 'Noah Reed', 'Quinn Parker', 'Alex Morgan',
  'Taylor Brooks', 'Morgan Chen', 'Riley Adams', 'Cameron Davis', 'Jamie Wilson',
  'Avery Robinson', 'Devin Carter', 'Harper Nguyen', 'Emery Clark', 'Rowan Hall',
  'Skyler Moore', 'Parker Young', 'Reese Turner', 'Finley Scott', 'Dakota Lewis',
  'Hayden Green', 'Blake Adams', 'Sage Bennett', 'Robin Walker', 'Elliot King',
  'Kendall Wright', 'Shawn Hill', 'Bailey Baker', 'Charlie Evans', 'Jesse Nelson',
  'Frankie Diaz', 'Ari Collins', 'Marley Stewart', 'Kris Ward', 'Lane Foster'
];

const driverGroups = ['Long haul · North', 'Regional · East', 'Local delivery', 'Regional · West'];

// Who coached: automation, or the manager who ran the one-on-one.
function coachLabel(session) {
  if (sessionDeliveryMode(session) === 'automated') return 'Automated';
  return session.owner && session.owner !== 'Unassigned' ? session.owner : 'Manager';
}

// Table dates read the record's own history, so no separate "updated" column is needed.
function sessionStartedLabel(session) {
  if (session.candidate) return '—';
  const opened = (session.history || []).find(([text]) => /assigned|created|opened|started/i.test(text));
  const label = opened?.[1] || session.automationRun || '';
  return /cycle/i.test(label) ? '—' : label || '—';
}

function sessionCompletedLabel(session) {
  if (!['completed', 'archived'].includes(session.state)) return '—';
  const latest = session.latest || '';
  const when = latest.includes('·') ? latest.split('·').at(-1).trim() : latest.replace(/^(archived|completed|closed)\s*/i, '');
  return when || '—';
}

function sessionDueLabel(session) {
  if (['completed', 'archived'].includes(session.state)) return '—';
  return session.due === 'Resolve before next shift' ? 'Next shift' : session.due || '—';
}

function inProgressLabel(origin) {
  if (origin && typeof origin === 'object') return sessionDeliveryMode(origin) === 'one_on_one' ? 'One-on-one' : 'Automated';
  return origin === 'manual_override' || origin === 'One-on-one' ? 'One-on-one' : 'Automated';
}

function initials(name) {
  return name.split(' ').map((part) => part.charAt(0)).join('').slice(0, 2).toUpperCase();
}

function makeCases(category, count, kind, offset) {
  return Array.from({ length: count }, (_, index) => {
    const name = driverNames[(index + offset) % driverNames.length];
    const repeat = index % 5 === 0;
    return {
      id: category + '-' + kind + '-' + index,
      categoryId: category,
      name,
      initials: initials(name),
      group: driverGroups[(index + offset) % driverGroups.length],
      events: 2 + (index % 6),
      trips: 2 + (index % 8),
      clips: index % 3 === 0 ? 1 : 0,
      reason: repeat ? 'Repeated after prior coaching' : (2 + (index % 6)) + ' events in the current window',
      prior: repeat ? 'Quick training completed 24 days ago' : 'No recent coaching',
      selected: true
    };
  });
}

const categories = [
  {
    id: 'following',
    name: 'Following distance',
    priority: 'critical',
    priorityLabel: 'High priority',
    eventCount: 117,
    trips: 1842,
    drivers: 42,
    quick: 36,
    directed: 6,
    active: 13,
    completed: 28,
    repeats: 6,
    clips: 29,
    change: 18,
    rate: 63.5,
    previousRate: 53.8,
    training: 'Following Distance Basics · 2 min',
    description: 'Drivers crossing time-gap thresholds across camera and telematics sources.',
    trend: [16, 20, 18, 23, 21, 26, 24, 28, 25, 29, 27, 30, 31, 32],
    eventTypes: [
      { id: 'following-under-2', name: 'Following distance under 2 sec', drivers: 36, events: 83, trips: 1197, change: 14, quick: 36, directed: 0, path: 'Quick training' },
      { id: 'following-under-1', name: 'Critical gap under 1 sec', drivers: 4, events: 23, trips: 431, change: 8, quick: 0, directed: 4, path: 'Directed 1:1' },
      { id: 'following-repeat', name: 'Following distance after training', drivers: 2, events: 11, trips: 214, change: 22, quick: 0, directed: 2, path: 'Directed 1:1' }
    ],
    tripContext: [{ label: 'Highway', value: 54 }, { label: 'Urban', value: 31 }, { label: 'Night', value: 15 }]
  },
  {
    id: 'speeding',
    name: 'Speeding',
    priority: 'critical',
    priorityLabel: 'High priority',
    eventCount: 96,
    trips: 3760,
    drivers: 31,
    quick: 24,
    directed: 7,
    active: 14,
    completed: 34,
    repeats: 3,
    clips: 8,
    change: 11,
    rate: 25.5,
    previousRate: 23.0,
    training: 'Managing Speed · 3 min',
    description: 'Threshold and posted-speed events grouped into one coaching category.',
    trend: [22, 18, 24, 25, 27, 24, 29, 31, 28, 34, 33, 36, 37, 39],
    eventTypes: [
      { id: 'speeding-50', name: 'Speeding over 50 km/h', drivers: 24, events: 84, trips: 3290, change: 9, quick: 24, directed: 0, path: 'Quick training' },
      { id: 'speeding-80', name: 'Speeding over 80 km/h', drivers: 7, events: 12, trips: 470, change: 19, quick: 0, directed: 7, path: 'Directed 1:1' }
    ],
    tripContext: [{ label: 'Highway', value: 62 }, { label: 'Urban', value: 24 }, { label: 'Night', value: 14 }]
  },
  {
    id: 'braking',
    name: 'Harsh braking',
    priority: 'watch',
    priorityLabel: 'Watch',
    eventCount: 58,
    trips: 2650,
    drivers: 18,
    quick: 15,
    directed: 3,
    active: 8,
    completed: 19,
    repeats: 2,
    clips: 11,
    change: 7,
    rate: 21.9,
    previousRate: 20.5,
    training: 'Anticipation & Space · 2 min',
    description: 'Repeated or severe braking patterns that benefit from anticipation coaching.',
    trend: [13, 16, 14, 17, 18, 17, 20, 18, 19, 21, 20, 22, 21, 23],
    eventTypes: [
      { id: 'braking-standard', name: 'Harsh brake', drivers: 15, events: 41, trips: 1920, change: 5, quick: 15, directed: 0, path: 'Quick training' },
      { id: 'braking-repeat', name: 'Severe or repeated braking', drivers: 3, events: 17, trips: 730, change: 11, quick: 0, directed: 3, path: 'Directed 1:1' }
    ],
    tripContext: [{ label: 'Urban', value: 58 }, { label: 'Highway', value: 27 }, { label: 'Night', value: 15 }]
  },
  {
    id: 'distraction',
    name: 'Distracted driving',
    priority: 'critical',
    priorityLabel: 'High priority',
    eventCount: 17,
    trips: 1102,
    drivers: 12,
    quick: 2,
    directed: 10,
    active: 6,
    completed: 11,
    repeats: 4,
    clips: 17,
    change: 6,
    rate: 15.4,
    previousRate: 14.5,
    training: 'Eyes Forward · 2 min',
    description: 'Video-confirmed phone use and eyes-off-road events.',
    trend: [6, 7, 8, 7, 9, 8, 10, 9, 11, 10, 12, 11, 12, 13],
    eventTypes: [
      { id: 'phone-use', name: 'Phone use while driving', drivers: 7, events: 10, trips: 643, change: 8, quick: 0, directed: 7, path: 'Directed 1:1' },
      { id: 'eyes-off-road', name: 'Eyes off road', drivers: 5, events: 7, trips: 459, change: 3, quick: 2, directed: 3, path: '2 quick · 3 directed' }
    ],
    tripContext: [{ label: 'Urban', value: 49 }, { label: 'Highway', value: 34 }, { label: 'Night', value: 17 }]
  },
  {
    id: 'seatbelt',
    name: 'Seat belt use',
    priority: 'watch',
    priorityLabel: 'Watch',
    eventCount: 24,
    trips: 954,
    drivers: 11,
    quick: 6,
    directed: 5,
    active: 4,
    completed: 16,
    repeats: 3,
    clips: 9,
    change: 6,
    rate: 25.2,
    previousRate: 23.8,
    training: 'Buckle Every Trip · 90 sec',
    description: 'Unbuckled movement events and repeat non-use.',
    trend: [9, 8, 10, 9, 11, 10, 12, 11, 11, 13, 12, 14, 13, 14],
    eventTypes: [
      { id: 'seatbelt-moving', name: 'Unbuckled while moving', drivers: 6, events: 19, trips: 751, change: 5, quick: 6, directed: 0, path: 'Quick training' },
      { id: 'seatbelt-repeat', name: 'Repeated seat belt non-use', drivers: 5, events: 5, trips: 203, change: 10, quick: 0, directed: 5, path: 'Directed 1:1' }
    ],
    tripContext: [{ label: 'Local', value: 51 }, { label: 'Regional', value: 33 }, { label: 'Night', value: 16 }]
  },
  {
    id: 'acceleration',
    name: 'Harsh acceleration',
    priority: 'watch',
    priorityLabel: 'Watch',
    eventCount: 31,
    trips: 2115,
    drivers: 10,
    quick: 5,
    directed: 5,
    active: 3,
    completed: 14,
    repeats: 3,
    clips: 4,
    change: 9,
    rate: 14.7,
    previousRate: 13.5,
    training: 'Smooth Starts · 2 min',
    description: 'Rapid-start patterns with fuel and safety implications.',
    trend: [7, 8, 8, 9, 10, 9, 11, 12, 10, 11, 13, 12, 14, 14],
    eventTypes: [
      { id: 'acceleration-standard', name: 'Harsh acceleration', drivers: 5, events: 23, trips: 1585, change: 7, quick: 5, directed: 0, path: 'Quick training' },
      { id: 'acceleration-repeat', name: 'Repeated rapid starts', drivers: 5, events: 8, trips: 530, change: 13, quick: 0, directed: 5, path: 'Directed 1:1' }
    ],
    tripContext: [{ label: 'Urban', value: 63 }, { label: 'Regional', value: 24 }, { label: 'Night', value: 13 }]
  },
  {
    id: 'cornering',
    name: 'Harsh cornering',
    priority: 'watch',
    priorityLabel: 'Watch',
    eventCount: 19,
    trips: 1480,
    drivers: 8,
    quick: 4,
    directed: 4,
    active: 2,
    completed: 8,
    repeats: 2,
    clips: 6,
    change: 4,
    rate: 12.8,
    previousRate: 12.3,
    training: 'Cornering Control · 2 min',
    description: 'High lateral-force and rollover-risk cornering events.',
    trend: [6, 7, 6, 8, 7, 8, 9, 8, 9, 9, 10, 9, 10, 11],
    eventTypes: [
      { id: 'cornering-force', name: 'High lateral force', drivers: 4, events: 15, trips: 1172, change: 3, quick: 4, directed: 0, path: 'Quick training' },
      { id: 'cornering-rollover', name: 'Rollover-risk corner', drivers: 4, events: 4, trips: 308, change: 8, quick: 0, directed: 4, path: 'Directed 1:1' }
    ],
    tripContext: [{ label: 'Regional', value: 47 }, { label: 'Urban', value: 38 }, { label: 'Night', value: 15 }]
  },
  {
    id: 'traffic',
    name: 'Traffic controls',
    priority: 'critical',
    priorityLabel: 'High priority',
    eventCount: 15,
    trips: 690,
    drivers: 6,
    quick: 2,
    directed: 4,
    active: 1,
    completed: 7,
    repeats: 1,
    clips: 7,
    change: 2,
    rate: 21.7,
    previousRate: 21.3,
    training: 'Intersections & Signals · 3 min',
    description: 'Video-confirmed stop-sign and red-light events.',
    trend: [4, 5, 4, 5, 6, 5, 6, 6, 7, 6, 7, 7, 8, 8],
    eventTypes: [
      { id: 'stop-sign', name: 'Stop-sign violation', drivers: 4, events: 11, trips: 501, change: 1, quick: 2, directed: 2, path: '2 quick · 2 directed' },
      { id: 'red-light', name: 'Red-light violation', drivers: 2, events: 4, trips: 189, change: 5, quick: 0, directed: 2, path: 'Directed 1:1' }
    ],
    tripContext: [{ label: 'Urban', value: 72 }, { label: 'Regional', value: 19 }, { label: 'Night', value: 9 }]
  },
  {
    id: 'fatigue',
    name: 'Driver fatigue',
    priority: 'critical',
    priorityLabel: 'High priority',
    eventCount: 12,
    trips: 812,
    drivers: 5,
    quick: 0,
    directed: 5,
    active: 1,
    completed: 7,
    repeats: 2,
    clips: 10,
    change: -3,
    rate: 14.8,
    previousRate: 15.3,
    training: 'Fatigue Awareness · 3 min',
    description: 'Drowsiness and microsleep indicators requiring directed review.',
    trend: [7, 6, 7, 6, 5, 6, 5, 5, 4, 5, 4, 4, 4, 3],
    eventTypes: [
      { id: 'drowsiness', name: 'Drowsiness indicator', drivers: 3, events: 8, trips: 559, change: -2, quick: 0, directed: 3, path: 'Directed 1:1' },
      { id: 'microsleep', name: 'Microsleep indicator', drivers: 2, events: 4, trips: 253, change: -5, quick: 0, directed: 2, path: 'Directed 1:1' }
    ],
    tripContext: [{ label: 'Night', value: 58 }, { label: 'Highway', value: 31 }, { label: 'Regional', value: 11 }]
  },
  {
    id: 'backing',
    name: 'Backing & parking',
    priority: 'on-track',
    priorityLabel: 'On track',
    eventCount: 0,
    trips: 1220,
    drivers: 0,
    quick: 0,
    directed: 0,
    active: 0,
    completed: 86,
    repeats: 0,
    clips: 0,
    change: -12,
    rate: 0.3,
    previousRate: 0.4,
    training: 'Backing Safely · 2 min',
    description: 'No drivers currently require coaching.',
    trend: [9, 8, 7, 7, 6, 5, 5, 4, 4, 3, 3, 2, 2, 1],
    eventTypes: [{ id: 'unsafe-backing', name: 'Unsafe backing', drivers: 0, events: 0, trips: 1220, change: -12, quick: 0, directed: 0, path: 'On track' }],
    tripContext: [{ label: 'Yard', value: 64 }, { label: 'Urban', value: 24 }, { label: 'Other', value: 12 }],
    state: 'all'
  }
];

const weeklyCycleStats = {
  following: { coached: 32, completed: 29, attention: 3, lessonAssigned: 28, oneToOne: 4, eventChange: -12, weeklyRates: [3.64, 3.62, 3.58, 3.51, 3.43, 3.38, 3.35, 3.2] },
  speeding: { coached: 29, completed: 27, attention: 2, lessonAssigned: 25, oneToOne: 4, eventChange: -8, weeklyRates: [4.13, 4.12, 4.1, 4.0, 3.95, 3.9, 3.86, 3.8] },
  braking: { coached: 21, completed: 19, attention: 2, lessonAssigned: 18, oneToOne: 3, eventChange: -15, weeklyRates: [4.47, 4.43, 4.4, 4.25, 4.12, 4.03, 3.96, 3.8] },
  distraction: { coached: 18, completed: 15, attention: 3, lessonAssigned: 12, oneToOne: 6, eventChange: 6, weeklyRates: [2.36, 2.37, 2.39, 2.42, 2.45, 2.46, 2.47, 2.5] },
  seatbelt: { coached: 15, completed: 14, attention: 1, lessonAssigned: 13, oneToOne: 2, eventChange: -18, weeklyRates: [2.8, 2.75, 2.69, 2.58, 2.48, 2.43, 2.39, 2.3] },
  acceleration: { coached: 12, completed: 11, attention: 1, lessonAssigned: 10, oneToOne: 2, eventChange: -9, weeklyRates: [2.09, 2.07, 2.05, 2.02, 1.98, 1.96, 1.94, 1.9] },
  traffic: { coached: 8, completed: 7, attention: 1, lessonAssigned: 6, oneToOne: 2, eventChange: -3, weeklyRates: [1.65, 1.64, 1.64, 1.63, 1.62, 1.61, 1.61, 1.6] },
  fatigue: { coached: 7, completed: 6, attention: 1, lessonAssigned: 2, oneToOne: 5, eventChange: 4, weeklyRates: [1.44, 1.45, 1.45, 1.47, 1.48, 1.48, 1.49, 1.5] },
  cornering: { coached: 0, completed: 0, attention: 0, lessonAssigned: 0, oneToOne: 0, eventChange: -5, weeklyRates: [1.16, 1.16, 1.15, 1.14, 1.13, 1.12, 1.12, 1.1] },
  backing: { coached: 0, completed: 0, attention: 0, lessonAssigned: 0, oneToOne: 0, eventChange: -12, weeklyRates: [.34, .34, .33, .32, .31, .31, .31, .3] }
};

categories.forEach((category, index) => {
  Object.assign(category, weeklyCycleStats[category.id] || weeklyCycleStats.backing);
  category.active = Math.max(0, category.coached - category.completed);
  category.quickCases = makeCases(category.id, Math.max(category.quick, category.lessonAssigned), 'quick', index * 3);
  category.directedCases = makeCases(category.id, category.directed, 'directed', index * 3 + 8);
  let quickIndex = 0;
  let directedIndex = 0;
  category.eventTypes.forEach((eventType) => {
    category.quickCases.slice(quickIndex, quickIndex + eventType.quick).forEach((item) => {
      item.eventTypeId = eventType.id;
      item.eventTypeName = eventType.name;
    });
    category.directedCases.slice(directedIndex, directedIndex + eventType.directed).forEach((item) => {
      item.eventTypeId = eventType.id;
      item.eventTypeName = eventType.name;
    });
    quickIndex += eventType.quick;
    directedIndex += eventType.directed;
  });
  category.eventTypes.forEach((eventType, eventIndex) => {
    eventType.quickCases = makeCases(category.id, eventType.quick, eventType.id + '-quick', index * 3 + eventIndex);
    eventType.directedCases = makeCases(category.id, eventType.directed, eventType.id + '-directed', index * 3 + eventIndex + 8);
    eventType.quickCases.concat(eventType.directedCases).forEach((item) => {
      item.eventTypeId = eventType.id;
      item.eventTypeName = eventType.name;
    });
  });
});

const aiCoachInsights = [
  { id: 'ai-quinn-following', categoryId: 'following', caseKind: 'directed', caseIndex: 0, safetyScore: 61, scoreChange: -4, criterion: 'Threshold reached', tone: 'neutral', insight: 'The following-distance threshold was reached and the automated session remains active.' },
  { id: 'ai-harper-distraction', categoryId: 'distraction', caseKind: 'directed', caseIndex: 0, safetyScore: 58, scoreChange: -8, criterion: 'Overdue after reminder', attentionReason: 'overdue', tone: 'risk', insight: 'The video-confirmed distraction session remains incomplete after automatic reminders, alongside a falling Elevate score.' },
  { id: 'ai-morgan-speeding', categoryId: 'speeding', caseKind: 'directed', caseIndex: 0, safetyScore: 63, scoreChange: -6, criterion: 'Repeated after coaching', attentionReason: 'repeat', tone: 'risk', insight: 'High-severity speeding continued across separate trips after previous coaching.' },
  { id: 'ai-jamie-braking', categoryId: 'braking', caseKind: 'directed', caseIndex: 0, safetyScore: 67, scoreChange: -3, criterion: 'Repeated after coaching', attentionReason: 'repeat', tone: 'watch', insight: 'Harsh-braking events returned after training, suggesting that a direct conversation may work better than another lesson.' },
  { id: 'ai-skyler-distraction', categoryId: 'distraction', caseKind: 'directed', caseIndex: 2, safetyScore: 64, scoreChange: -5, criterion: 'Driver replied', attentionReason: 'reply', tone: 'risk', insight: 'The driver asked for a manager review of a video-confirmed distraction event after the automated session.' },
  { id: 'ai-priya-speeding', categoryId: 'speeding', caseKind: 'quick', caseIndex: 1, safetyScore: 58, scoreChange: -9, criterion: 'Overdue after reminder', attentionReason: 'overdue', tone: 'risk', insight: 'The mapped lesson was assigned automatically, but it remains incomplete after the reminder window.' },
  { id: 'ai-bailey-fatigue', categoryId: 'fatigue', caseKind: 'directed', caseIndex: 0, safetyScore: 55, scoreChange: -7, criterion: 'Overdue after reminder', attentionReason: 'overdue', tone: 'risk', insight: 'The fatigue session remains incomplete after automatic reminders while the Elevate score continues to decline.' },
  { id: 'ai-elliot-traffic', categoryId: 'traffic', caseKind: 'directed', caseIndex: 0, safetyScore: 60, scoreChange: -5, criterion: 'Driver disputed event', attentionReason: 'reply', tone: 'risk', insight: 'The driver disputed a traffic-control event and the automated session is waiting for a manager response.' },
  { id: 'ai-alex-following', categoryId: 'following', caseKind: 'directed', caseIndex: 1, safetyScore: 62, scoreChange: -4, criterion: 'Driver disputed event', attentionReason: 'reply', tone: 'risk', insight: 'The driver disputed a critical-gap clip, so the automated session requires a manager response.' },
  { id: 'ai-emery-distraction', categoryId: 'distraction', caseKind: 'directed', caseIndex: 1, safetyScore: 66, scoreChange: -2, criterion: 'Driver replied', attentionReason: 'reply', tone: 'watch', insight: 'The driver added context to the automated distraction session and is waiting for a manager response.' },
  { id: 'ai-riley-seatbelt', categoryId: 'seatbelt', caseKind: 'quick', caseIndex: 0, safetyScore: 68, scoreChange: 3, criterion: 'Overdue after reminder', attentionReason: 'overdue', tone: 'watch', insight: 'The seat-belt lesson was assigned and reminded automatically, but the acknowledgement is still overdue.' },
  { id: 'ai-taylor-following', categoryId: 'following', caseKind: 'directed', caseIndex: 2, safetyScore: 64, scoreChange: -4, criterion: 'Repeated after coaching', attentionReason: 'repeat', tone: 'risk', insight: 'Following-distance events continued after earlier coaching, so the automated follow-up requires review.' },
  { id: 'ai-parker-traffic', categoryId: 'traffic', caseKind: 'quick', caseIndex: 0, safetyScore: 73, scoreChange: -1, criterion: 'Threshold met', tone: 'neutral', insight: 'The traffic-control threshold was reached in the current window with no recent coaching on record.' }
].map((seed) => {
  const category = categories.find((item) => item.id === seed.categoryId);
  const item = category[seed.caseKind + 'Cases'][seed.caseIndex];
  return {
    ...seed,
    caseId: item.id,
    name: item.name,
    initials: item.initials,
    group: item.group,
    events: item.events,
    trips: item.trips,
    clips: item.clips,
    prior: item.prior,
    categoryName: category.name
  };
});

/** @type {AttentionItem[]} */
const attentionItems = aiCoachInsights
  .filter((insight) => insight.tone !== 'neutral')
  .map((insight, index) => {
    const reason = normalizeAttentionReason(insight.attentionReason);
    const meta = attentionReasonMeta[reason];
    const attemptCount = reason === 'reminders_exhausted' ? 3 : 1;
    return {
      ...insight,
      reason,
      attentionReason: reason,
      recommendedAction: meta.action,
      rankingFactors: [
        insight.criterion,
        'Elevate score ' + insight.safetyScore,
        (insight.scoreChange > 0 ? '+' : '') + insight.scoreChange + ' points'
      ],
      automationAttempts: attemptCount,
      dueTime: index < 2 ? 'Today' : 'Within 24 hours',
      driver: { name: insight.name, initials: insight.initials, group: insight.group },
      program: { id: insight.categoryId, name: insight.categoryName }
    };
  });

// Kept as a compatibility alias for existing render paths while the public model is AttentionItem.
const attentionAiInsights = attentionItems;

let sessions = [
  {
    id: 'rowan-distraction',
    person: 'Rowan Hall',
    initials: 'RH',
    category: 'Distracted driving',
    categoryId: 'distraction',
    eventType: 'Phone use while driving',
    state: 'reply',
    stateLabel: 'Driver replied',
    latest: 'Driver added context · 22 min ago',
    owner: 'Alex Kim',
    due: 'Today · 5:00 PM',
    summary: 'Two video-confirmed phone-use events were recorded in seven days. Rowan reviewed both clips and added context for the second event.',
    evidence: [
      // Fixture incident positions for the prototype's map viewer; no live GPS feed is connected.
      { title: 'Phone-use event', meta: 'Lytx · Sep 2 · 10:42 PM', duration: '0:18', location: 'Airport Rd near Derry Rd, Mississauga', coordinates: { latitude: 43.70846, longitude: -79.65362 } },
      { title: 'Navigation interaction', meta: 'Lytx · Sep 3 · 1:16 PM', duration: '0:12', location: 'Dixie Rd near Eglinton Ave, Mississauga', coordinates: { latitude: 43.63912, longitude: -79.62231 } }
    ],
    messages: [
      { author: 'system', text: 'Automated coach sent the mapped session with two clips for review.', time: 'Yesterday · 3:42 PM' },
      { author: 'system', text: 'Rowan accepted the coaching session', time: 'Today · 1:04 PM' },
      { author: 'driver', text: 'I watched both clips. The second happened while I was adjusting the navigation.', time: 'Today · 1:16 PM' }
    ],
    history: [['Driver replied', '22 min ago'], ['Session accepted', '34 min ago'], ['Assigned automatically', 'Yesterday · 3:42 PM']]
  },
  {
    id: 'alex-following',
    person: 'Alex Morgan',
    initials: 'AM',
    category: 'Following distance',
    categoryId: 'following',
    eventType: 'Critical gap under 1 sec',
    state: 'reply',
    stateLabel: 'Driver replied',
    latest: 'Driver disputed one event · 48 min ago',
    owner: 'Alex Kim',
    due: 'Today · 4:00 PM',
    summary: 'Six following-distance events were recorded in 14 days. Alex disputed one clip and is waiting for a coach response.',
    evidence: [
      { title: 'Critical time-gap clip', meta: 'Lytx · Sep 3 · 7:18 AM', duration: '0:16' },
      { title: 'Five-event pattern', meta: 'Geotab · Aug 22–Sep 3', duration: '14 days' }
    ],
    messages: [
      { author: 'system', text: 'Automated coach sent Alex’s template with the critical-gap clip.', time: 'Yesterday · 11:10 AM' },
      { author: 'driver', text: 'The vehicle ahead changed lanes into my gap. I do not think this event should count.', time: 'Today · 12:50 PM' }
    ],
    history: [['Event disputed', '48 min ago'], ['Session accepted', 'Yesterday'], ['Assigned automatically', 'Yesterday']]
  },
  {
    id: 'jamie-braking',
    person: 'Jamie Wilson',
    initials: 'JW',
    category: 'Harsh braking',
    categoryId: 'braking',
    eventType: 'Severe or repeated braking',
    state: 'repeat',
    stateLabel: 'Repeated after coaching',
    latest: 'Invitation delivered · 3h ago',
    owner: 'Alex Kim',
    due: 'Tomorrow',
    summary: 'Four harsh-braking events occurred after prior training. The automated follow-up is waiting for Jamie to accept.',
    evidence: [{ title: 'Four-event pattern', meta: 'Geotab · Aug 24–Sep 2', duration: '10 days' }],
    messages: [{ author: 'system', text: 'Automated coach opened a follow-up for the repeated braking pattern.', time: 'Today · 9:22 AM' }],
    history: [['Invitation delivered', '3h ago'], ['Assigned automatically', 'Today · 9:22 AM']]
  },
  {
    id: 'priya-speeding',
    person: 'Priya Singh',
    initials: 'PS',
    category: 'Speeding',
    categoryId: 'speeding',
    eventType: 'Speeding over 80 km/h',
    state: 'overdue',
    stateLabel: 'Overdue',
    latest: 'No response for 3 days',
    owner: 'Morgan Chen',
    due: 'Sep 2',
    summary: 'Seven high-severity speeding events occurred across four trips. Priya has not accepted the coaching invitation.',
    evidence: [{ title: 'Four-trip speed pattern', meta: 'Geotab · Aug 27–Sep 1', duration: '4 trips' }],
    messages: [{ author: 'system', text: 'Automated coach assigned the speeding follow-up before the next shift.', time: 'Sep 1 · 2:10 PM' }],
    history: [['Reminder sent automatically', 'Yesterday'], ['Invitation delivered', '3 days ago'], ['Assigned automatically', '3 days ago']]
  },
  {
    id: 'taylor-following',
    person: 'Taylor Brooks',
    initials: 'TB',
    category: 'Following distance',
    categoryId: 'following',
    eventType: 'Following distance after training',
    state: 'repeat',
    stateLabel: 'Repeated after coaching',
    latest: 'Session accepted · 1d ago',
    owner: 'Morgan Chen',
    due: 'Sep 6',
    summary: 'Three following-distance events occurred after Taylor completed quick training. One representative clip is attached.',
    evidence: [{ title: 'Repeat following-distance event', meta: 'Lytx · Aug 31 · 8:45 AM', duration: '0:16' }],
    messages: [
      { author: 'system', text: 'Automated coach opened a follow-up because the pattern continued after the lesson.', time: 'Yesterday · 10:20 AM' },
      { author: 'system', text: 'Taylor accepted the coaching session', time: 'Yesterday · 10:34 AM' }
    ],
    history: [['Session accepted', '1d ago'], ['Assigned automatically', '1d ago'], ['Automated lesson completed', '25d ago']]
  },
  {
    id: 'delivery-exception',
    person: 'Jordan Lee',
    initials: 'JL',
    category: 'Following distance',
    categoryId: 'following',
    eventType: 'Training delivery retrying',
    state: 'waiting',
    stateLabel: 'Automated',
    latest: 'Delivery retry queued · 4h ago',
    owner: 'Automation',
    due: 'Retrying before next shift',
    summary: 'The training assignment did not reach the driver app on the first attempt. Automation retries delivery before the next shift; no review is needed.',
    evidence: [],
    messages: [],
    history: [['Delivery retry queued', '4h ago'], ['Assignment created automatically', '4h ago']]
  },
  {
    id: 'avery-acceleration-delivery',
    person: 'Avery Robinson',
    initials: 'AR',
    category: 'Harsh acceleration',
    categoryId: 'acceleration',
    eventType: 'Training delivery retrying',
    state: 'waiting',
    stateLabel: 'Automated',
    latest: 'Delivery retry queued · 5h ago',
    owner: 'Automation',
    due: 'Retrying before next shift',
    summary: 'The rapid-start lesson did not reach the driver app on the first attempt. Automation retries delivery before the next shift; no review is needed.',
    evidence: [],
    messages: [],
    history: [['Delivery retry queued', '5h ago'], ['Assignment created automatically', '5h ago']]
  },
  {
    id: 'noah-braking-delivery',
    person: 'Noah Reed',
    initials: 'NR',
    category: 'Harsh braking',
    categoryId: 'braking',
    eventType: 'Training delivery retrying',
    state: 'waiting',
    stateLabel: 'Automated',
    latest: 'Delivery retry queued · 6h ago',
    owner: 'Automation',
    due: 'Retrying before next shift',
    summary: 'The braking lesson did not reach the driver app on the first attempt. Automation retries delivery before the next shift; no review is needed.',
    evidence: [],
    messages: [],
    history: [['Delivery retry queued', '6h ago'], ['Assignment created automatically', '6h ago']]
  }
];

const sessionSla = {
  'rowan-distraction': { sla: '1h 38m left', slaTone: 'due-soon' },
  'alex-following': { sla: '52m left', slaTone: 'due-soon' },
  'jamie-braking': { sla: '21h left', slaTone: 'on-track' },
  'priya-speeding': { sla: '2d overdue', slaTone: 'overdue' },
  'taylor-following': { sla: '2d left', slaTone: 'on-track' },
  'delivery-exception': { sla: 'Retrying automatically', slaTone: 'due-soon' },
  'avery-acceleration-delivery': { sla: 'Retrying automatically', slaTone: 'due-soon' },
  'noah-braking-delivery': { sla: 'Retrying automatically', slaTone: 'due-soon' }
};

sessions = sessions.map((session) => ({ source: 'Automated', automationRun: 'Week of Aug 31', ...session, ...sessionSla[session.id] }));
sessions.push(
  {
    id: 'jordan-following-complete',
    person: 'Jordan Lee',
    initials: 'JL',
    category: 'Following distance',
    categoryId: 'following',
    eventType: 'Following distance under 2 sec',
    state: 'completed',
    stateLabel: 'Completed',
    latest: 'Quiz passed · Today, 10:14 AM',
    owner: 'Alex Kim',
    due: 'Completed today',
    sla: 'Met · 34m',
    slaTone: 'met',
    summary: 'The braking lesson did not reach the driver app on the first attempt. Automation retries delivery before the next shift; no review is needed.',
    goal: 'Maintain a three-second following gap for the next 14 days.',
    lesson: 'Following Distance Basics',
    evidence: [{ title: 'Representative time-gap clip', meta: 'Lytx · Aug 29 · Hwy 401 near Milton', duration: '0:18' }],
    messages: [{ author: 'system', text: 'Training completed · acknowledgement received · quiz 4/5', time: 'Today · 10:14 AM' }],
    history: [['Training completed', 'Today · 10:14 AM'], ['Video reviewed', 'Today · 10:08 AM'], ['Assigned automatically', 'Yesterday · 2:42 PM']]
  },
  {
    id: 'sam-speeding-complete',
    person: 'Sam Rivera',
    initials: 'SR',
    category: 'Speeding',
    categoryId: 'speeding',
    eventType: 'Speeding over 50 km/h',
    state: 'completed',
    stateLabel: 'Completed',
    latest: 'Manager closed follow-up · Yesterday',
    owner: 'Morgan Chen',
    due: 'Completed Sep 3',
    sla: 'Met · 1h 12m',
    slaTone: 'met',
    source: 'One-on-one',
    automationRun: 'Outside weekly cycle',
    summary: 'Sam reviewed four events and agreed to use cruise control on open-highway segments. The 14-day outcome window is active.',
    goal: 'No speeding events above the configured threshold for 14 days.',
    evidence: [{ title: 'Four-trip speed pattern', meta: 'Geotab · Aug 24–Sep 1 · 4 trips', duration: '8 days', video: false }],
    messages: [
      { author: 'driver', text: 'I will use cruise control earlier and watch the transition zones.', time: 'Sep 3 · 3:20 PM' },
      { author: 'system', text: 'Morgan closed the follow-up; outcome monitoring started', time: 'Sep 3 · 3:34 PM' }
    ],
    history: [['Session closed', 'Sep 3 · 3:34 PM'], ['Driver committed to action', 'Sep 3 · 3:20 PM'], ['Session started', 'Sep 2 · 9:10 AM']]
  },
  {
    id: 'cameron-following-manual',
    person: 'Cameron Davis',
    initials: 'CD',
    category: 'Following distance',
    categoryId: 'following',
    eventType: 'Manager-observed following gap',
    state: 'waiting',
    stateLabel: 'Active',
    latest: 'Waiting for driver · 1h ago',
    owner: 'Alex Kim',
    due: 'Today · 6:00 PM',
    sla: '2h 10m left',
    slaTone: 'due-soon',
    source: 'One-on-one',
    automationRun: 'Outside weekly cycle',
    summary: 'A manager opened a manual follow-up after an in-person observation outside the automated event feed. It is waiting for the driver.',
    evidence: [],
    messages: [{ author: 'manager', text: 'Please share what made it difficult to rebuild the following gap during yesterday’s route.', time: 'Yesterday · 4:12 PM' }],
    history: [['Manual session created', 'Yesterday · 4:12 PM']]
  },
  {
    id: 'casey-seatbelt-archived',
    weeksAgo: 3,
    person: 'Casey Patel',
    initials: 'CP',
    category: 'Seat belt use',
    categoryId: 'seatbelt',
    eventType: 'Unbuckled while moving',
    state: 'archived',
    stateLabel: 'Archived',
    latest: 'Archived Aug 26',
    owner: 'Alex Kim',
    due: 'Closed Aug 23',
    sla: 'Met · 46m',
    slaTone: 'met',
    summary: 'The automated lesson was completed and the 14-day outcome window showed no repeat seat-belt events.',
    goal: 'Seat belt fastened before vehicle movement.',
    evidence: [{ title: 'Seat-belt event', meta: 'Lytx · Aug 9 · Local route 18', duration: '0:12' }],
    messages: [{ author: 'system', text: 'Outcome measured · no repeat events', time: 'Aug 26 · 9:00 AM' }],
    history: [['Archived', 'Aug 26'], ['Outcome measured', 'Aug 25'], ['Training completed', 'Aug 12']]
  },
  {
    id: 'drew-braking-archived',
    weeksAgo: 3,
    person: 'Drew Thompson',
    initials: 'DT',
    category: 'Harsh braking',
    categoryId: 'braking',
    eventType: 'Severe braking event',
    state: 'archived',
    stateLabel: 'Archived',
    latest: 'Archived Aug 21',
    owner: 'Morgan Chen',
    due: 'Dismissed Aug 20',
    sla: 'Not applicable · event dismissed',
    slaTone: 'neutral',
    source: 'One-on-one',
    automationRun: 'Outside weekly cycle',
    summary: 'The event was reviewed and dismissed because emergency braking prevented a collision. It remains in history for context.',
    evidence: [{ title: 'Emergency braking clip', meta: 'Lytx · Aug 20 · QEW near Oakville', duration: '0:16' }],
    messages: [{ author: 'system', text: 'Event dismissed with coach note', time: 'Aug 20 · 4:18 PM' }],
    history: [['Archived', 'Aug 21'], ['Event dismissed', 'Aug 20 · 4:18 PM'], ['Review started', 'Aug 20 · 3:52 PM']]
  }
);
sessions = sessions.map((session) => ({ automationRun: 'Week of Aug 31', source: 'Automated', ...session }));
sessions = sessions.map((session) => {
  const attentionReason = normalizeAttentionReason(session.state);
  /** @type {SessionLifecycleState} */
  const lifecycleState = attentionReason
    ? 'manager_attention'
    : session.state === 'waiting'
      ? 'system_handling'
      : session.state;
  /** @type {SessionOrigin} */
  const origin = session.source === 'Automated' ? 'automated' : 'manual_override';
  return {
    ...session,
    legacyState: session.state,
    state: lifecycleState,
    stateLabel: lifecycleState === 'manager_attention'
      ? 'Needs review'
      : lifecycleState === 'system_handling'
        ? inProgressLabel(origin)
        : session.stateLabel,
    attentionReason,
    origin
  };
});

function auditSessionRecord({ id, person, category, categoryId, state, attentionReason = null, origin = 'automated', index = 0 }) {
  const stateCopy = {
    manager_attention: {
      label: 'Needs review',
      latest: attentionReasonMeta[attentionReason]?.label + ' · ' + (index + 1) + 'h ago',
      due: index % 2 ? 'Within 24 hours' : 'Today',
      sla: attentionReason === 'reminders_exhausted' ? 'Overdue' : 'On track',
      slaTone: attentionReason === 'reminders_exhausted' ? 'overdue' : 'due-soon'
    },
    system_handling: { label: inProgressLabel(origin), latest: 'Automation continuing · ' + (index + 1) + 'h ago', due: 'Within 3 days', sla: 'On track', slaTone: 'on-track' },
    completed: { label: 'Completed', latest: 'Coaching completed · ' + ((index % 7) + 1) + 'd ago', due: 'Completed', sla: 'Met', slaTone: 'met' },
    archived: { label: 'Archived', latest: 'Archived · ' + ((index % 4) + 2) + ' weeks ago', due: 'Closed', sla: 'Met', slaTone: 'met' }
  }[state];
  const source = origin === 'automated' ? 'Automated' : 'One-on-one';
  const attentionCopy = attentionReason ? attentionReasonMeta[attentionReason] : null;
  return {
    id,
    person,
    initials: initials(person),
    category,
    categoryId,
    eventType: category,
    state,
    stateLabel: stateCopy.label,
    attentionReason,
    origin,
    latest: stateCopy.latest,
    owner: origin === 'automated' ? (index % 2 ? 'Morgan Chen' : 'Alex Kim') : 'Alex Kim',
    due: stateCopy.due,
    sla: stateCopy.sla,
    slaTone: stateCopy.slaTone,
    source,
    automationRun: origin === 'automated' ? 'Week of Aug 31' : 'Outside weekly cycle',
    weeksAgo: state === 'archived' ? 2 + (index % 6) : 0,
    summary: attentionCopy
      ? attentionCopy.label + ' requires ' + attentionCopy.action.toLowerCase() + ' before automation can continue.'
      : state === 'completed'
        ? 'The driver completed the mapped coaching and the outcome window is being measured.'
        : state === 'archived'
          ? 'This coaching record is retained as searchable audit history.'
          : 'Automation is continuing delivery, reminders, or acknowledgement tracking.',
    evidence: [],
    messages: state === 'manager_attention'
      ? [{ author: 'system', text: 'Automation flagged this session for review: ' + attentionCopy.label.toLowerCase() + '.', time: stateCopy.latest }]
      : [{ author: 'system', text: stateCopy.latest, time: stateCopy.latest }],
    history: [[stateCopy.label, stateCopy.latest], [origin === 'automated' ? 'Assigned automatically' : 'Manual session created', origin === 'automated' ? 'Week of Aug 31' : 'Outside weekly cycle']]
  };
}

// Every prioritized attention record is represented by the same searchable session ledger.
const attentionSessionKeys = new Set(sessions.filter((session) => session.state === 'manager_attention').map((session) => session.person + '|' + session.categoryId));
attentionItems.forEach((item, index) => {
  const key = item.name + '|' + item.categoryId;
  if (attentionSessionKeys.has(key)) return;
  sessions.push(auditSessionRecord({
    id: 'attention-' + item.id,
    person: item.name,
    category: item.categoryName,
    categoryId: item.categoryId,
    state: 'manager_attention',
    attentionReason: item.reason,
    origin: 'automated',
    index
  }));
  attentionSessionKeys.add(key);
});

// Populate the complete audit ledger. Totals below are subsequently derived from these records.
const sessionLedgerTargets = {
  automated: { manager_attention: 11, system_handling: 8, completed: 128, archived: 24 },
  manual_override: { manager_attention: 0, system_handling: 2, completed: 2, archived: 2 }
};
Object.entries(sessionLedgerTargets).forEach(([origin, stateTargets], originIndex) => {
  Object.entries(stateTargets).forEach(([state, target]) => {
    const existing = sessions.filter((session) => session.origin === origin && session.state === state).length;
    for (let index = existing; index < target; index += 1) {
      const category = categories[(index + originIndex * 3) % Math.max(1, categories.length - 1)];
      const person = driverNames[(index * 3 + originIndex * 11 + (state === 'archived' ? 5 : state === 'completed' ? 2 : 0)) % driverNames.length];
      sessions.push(auditSessionRecord({
        id: 'audit-' + origin + '-' + state + '-' + index,
        person,
        category: category.name,
        categoryId: category.id,
        state,
        origin,
        index
      }));
    }
  });
});

const driverSafetyScores = [76, 91, 62, 67, 58, 74, 65, 89, 61, 70, 78, 93, 68, null];
const driverScoreChanges = [4, 1, -6, 3, -9, 5, 2, 2, -4, 6, 7, 1, 3, null];
const directory = driverNames.slice(0, 14).map((name, index) => ({
  name,
  initials: initials(name),
  group: driverGroups[index % driverGroups.length],
  focus: ['Following distance', 'Speeding', 'Harsh braking', 'Distracted driving'][index % 4],
  safetyScore: driverSafetyScores[index],
  scoreChange: driverScoreChanges[index],
  state: [4, 9, 10, 12].includes(index) ? 'attention' : index % 3 === 0 ? 'coached' : index % 4 === 1 ? 'outcome' : 'track',
  stateLabel: [4, 9, 10, 12].includes(index) ? 'Needs review' : index % 3 === 0 ? 'Automated' : index % 4 === 1 ? 'Completed' : 'On track',
  lastCoaching: index % 3 === 0 ? 'This week' : index % 4 === 1 ? '2 weeks ago' : '—'
}));

/*
 * Dated daily driving observations for the driver spotlight: illustrative fixture data for
 * the 13 scored directory drivers over one observed week (Aug 24–30) with miles and trips.
 * Drivers without a record keep the "unavailable" state; unavailable is never rendered as zero.
 */
const driverActivityDays = ['Aug 24', 'Aug 25', 'Aug 26', 'Aug 27', 'Aug 28', 'Aug 29', 'Aug 30'];
const driverActivity = Object.fromEntries(directory.filter((driver) => Number.isFinite(driver.safetyScore)).map((driver, index) => {
  const seed = hashText(driver.name);
  const restDays = new Set([5, 6, (seed + index) % 5]);
  const days = driverActivityDays.map((date, dayIndex) => {
    if (restDays.has(dayIndex)) return { date, miles: 0, trips: 0 };
    const hours = 4 + ((seed >>> (dayIndex * 2)) % 6) + ((seed >>> dayIndex) % 10) / 10;
    return { date, miles: Math.round(hours * (42 + ((seed >>> (dayIndex + 1)) % 19))), trips: 2 + ((seed >>> (dayIndex + 2)) % 9) };
  });
  return [driver.name, { week: 'Aug 24–30', days }];
}));

const driverDistributionBins = [
  { key: 'unscored', label: 'Unscored', count: 65, tone: 'unscored' },
  { key: '0-19', label: '0–19', count: 5, min: 0, max: 19, tone: 'risk' },
  { key: '20-39', label: '20–39', count: 18, min: 20, max: 39, tone: 'risk' },
  { key: '40-59', label: '40–59', count: 70, min: 40, max: 59, tone: 'risk' },
  { key: '60-69', label: '60–69', count: 230, min: 60, max: 69, tone: 'watch' },
  { key: '70-79', label: '70–79', count: 241, min: 70, max: 79, tone: 'watch' },
  { key: '80-89', label: '80–89', count: 245, min: 80, max: 89, tone: 'safe' },
  { key: '90-100', label: '90–100', count: 150, min: 90, max: 100, tone: 'safe' }
];

const driverTierCounts = [
  { key: 'unscored', label: 'Unscored', count: 65, tone: 'unscored' },
  { key: 'risk', label: 'High risk', count: 93, tone: 'risk' },
  { key: 'watch', label: 'Watch', count: 471, tone: 'watch' },
  { key: 'safe', label: 'Safe', count: 395, tone: 'safe' }
];

sessions.forEach(session => { session.deliveryMode ||= sessionDeliveryMode(session); });

const lessons = [
  { title: 'Following Distance Basics', category: 'Following distance', length: '2 min video', version: 'v3.2', completion: '76%' },
  { title: 'Managing Speed', category: 'Speeding', length: '3 min video', version: 'v2.6', completion: '83%' },
  { title: 'Anticipation & Space', category: 'Harsh braking', length: '2 min video', version: 'v1.9', completion: '91%' },
  { title: 'Eyes Forward', category: 'Distracted driving', length: '2 min video', version: 'v2.1', completion: '74%' },
  { title: 'Buckle Every Trip', category: 'Seat belt use', length: '90 sec video', version: 'v1.7', completion: '88%' },
  { title: 'Fatigue Awareness', category: 'Driver fatigue', length: '3 min video', version: 'v2.0', completion: '79%' }
];
initializeLearningLibrary();

let queueStatus = 'needs';
let queueLens = 'program';
let coachingPeriod = 1;
let landingProgramId = 'all';
let groupsProgramId = 'all';
let driversTab = 'directory';
let selectedProgramId = 'all';
let programTab = 'activity';
let programPageReturn = null;
let activeSessionProgram = 'all';
let activeCategory = null;
let programDrawerParent = null;
let workflowTab = 'needs';
let trainingExpanded = false;
let trainingSearch = '';
let activeSessionFilter = 'manager_attention';
let activeSessionSource = 'all';
let sessionSearch = '';
let sessionPage = 1;
let sessionPageScope = '';
let activeSessionId = null;
let activeDriverFilter = 'all';
let activeDriverScoreFilter = 'all';
let activeDriverGroup = 'all';
let activeDriverCategory = 'all';
let driverSort = 'action';
let analyticsTab = 'outcomes';
const analyticsTabs = ['outcomes', 'activity', 'drivers', 'groups'];
let outcomeTab = 'category';
let outcomeSort = 'change';
let composerMode = 'reply';
let drawerOpener = null;
let categoryDrawerOpener = null;
let toastTimer;
const dismissedAiInsightIds = new Set();
const resolvedAttentionIds = new Set();
let sessionDraft = null;
let sessionDrawerOrigin = null;
let currentView = 'coaching';
let categoryDrawerReturnTarget = null;
let filterSheetOpener = null;
let filterSheetInertState = [];
let globalSearchOpener = null;
let mobileMoreOpener = null;
function readSavedSetting(key, fallback) {
  try {
    return window.localStorage?.getItem(key) || fallback;
  } catch (error) {
    return fallback;
  }
}
function readSavedJson(key, fallback) {
  try {
    const value = window.localStorage?.getItem(key);
    return value ? JSON.parse(value) : fallback;
  } catch (error) {
    return fallback;
  }
}
function saveSetting(key, value) {
  try {
    if (!window.localStorage) return false;
    window.localStorage.setItem(key, String(value));
    return true;
  } catch (error) {
    return false;
  }
}

const savedAutomationMode = readSavedSetting('elevate-automation-mode', 'fully');
const savedCadenceWeeks = Number(readSavedSetting('elevate-cadence-weeks', '2'));
let automationMode = ['manual', 'semi', 'fully'].includes(savedAutomationMode) ? savedAutomationMode : 'fully';
let cadenceWeeks = [1, 2].includes(savedCadenceWeeks) ? savedCadenceWeeks : 2;
let draftAutomationMode = automationMode;
let draftCadenceWeeks = cadenceWeeks;
// Older saved settings have no due-period key: retain the existing one-week default.
const SESSION_DUE_DEFAULT_DAYS = 7;
function validSessionDueDays(value) { return Number.isInteger(value) && value >= 1 && value <= 365; }
const savedSessionDueDays = Number(readSavedSetting('elevate-session-due-days', String(SESSION_DUE_DEFAULT_DAYS)));
let sessionDueDays = validSessionDueDays(savedSessionDueDays) ? savedSessionDueDays : SESSION_DUE_DEFAULT_DAYS;
let draftSessionDueDays = sessionDueDays;
function globalSessionDueDays() { return sessionDueDays; }
function sessionDuePeriodLabel(days) {
  return 'Within ' + (days % 7 === 0 ? (days / 7) + (days === 7 ? ' week' : ' weeks') : days + (days === 1 ? ' day' : ' days'));
}
function globalSessionDueLabel() { return sessionDuePeriodLabel(sessionDueDays); }
let settingsState = 'saved';
let settingsPanelMode = null;

// ---- Program rules ----------------------------------------------------------------
// Each program owns its rules (severity + threshold per event feed), its coaching threshold and
// its one-on-one coach routing. They are edited on the Programs page and saved immediately.
function defaultEventTypeRules() {
  return categories.flatMap((category) => (category.eventTypes || []).map((type, index) => {
    const directed = type.path === 'Directed 1:1';
    const severity = directed || /critical|after|repeat|phone|fatigue|drows/i.test(type.name) ? 'High' : index === 0 ? 'Medium' : 'Low';
    return {
      id: type.id,
      programId: category.id,
      name: type.name,
      severity,
      weight: { Low: 1, Medium: 3, High: 5 }[severity],
      threshold: directed || category.id === 'distraction' ? 1 : 5,
      source: category.id === 'distraction' ? 'Lytx' : 'Geotab',
      direct: directed && !/after|repeat/i.test(type.name),
      videoRequired: category.id === 'distraction' || /repeat|after/i.test(type.name),
      path: directed ? 'one_to_one' : 'lesson',
      enabled: true
    };
  }));
}
const severityOptions = { Low: 'Low', Medium: 'Medium', High: 'High' };
function cloneJson(value) {
  return JSON.parse(JSON.stringify(value));
}
let eventTypeRules = readSavedJson('elevate-event-types', null);
if (!Array.isArray(eventTypeRules)) eventTypeRules = defaultEventTypeRules();
applyStoredProgramChanges(); // programs.js: locally created and deleted programs
eventTypeRules = eventTypeRules.filter((rule) => categories.some((program) => program.id === rule.programId));
let settingsSavedAt = readSavedSetting('elevate-settings-saved-at', 'Sep 4 · 9:12 AM');
let settingsAuditHistory = readSavedJson('elevate-settings-audit', [
  { action: 'Configuration activated', detail: (automationMode === 'fully' ? 'Fully automated' : automationMode === 'semi' ? 'Semi-automated' : 'Manual') + ' · ' + (cadenceWeeks === 1 ? 'weekly' : 'every 2 weeks') + ' · new sessions due ' + sessionDueDays + ' days from creation', time: settingsSavedAt },
  { action: 'Sample configuration preview', detail: 'Historical prototype entry · no rule evaluation recorded', time: 'Sep 3 · 3:40 PM' }
]);
if (!Array.isArray(settingsAuditHistory)) settingsAuditHistory = [];

function scheduleForCadence(weeks) {
  return weeks === 1
    ? { analysisWindow: 'Aug 25–31 · previous 7 days', nextRun: 'Mon, Sep 7, 8:00 AM' }
    : { analysisWindow: 'Aug 18–31 · previous 14 days', nextRun: 'Mon, Sep 14, 8:00 AM' };
}
const initialAutomationSchedule = scheduleForCadence(cadenceWeeks);
/** @type {AutomationRunSummary} */
const automationRunSummary = {
  analysisWindow: initialAutomationSchedule.analysisWindow,
  lastRun: 'Aug 31, 8:04 AM',
  nextRun: initialAutomationSchedule.nextRun,
  mode: automationMode,
  cadenceWeeks,
  counts: { identified: 154, sessionTotal: 151, pendingSessionReviews: 3, automatedTotal: 147, oneOnOneTotal: 4, completed: 130, systemHandled: 10, escalated: 14 }
};
const progressCaseStore = new Map();

const queueNode = document.getElementById('coaching-queue');
const categoryContent = document.getElementById('category-content');
const inboxContent = document.getElementById('inbox-content');
const categoryDrawer = document.getElementById('category-drawer');
const categoryBackdrop = document.getElementById('category-backdrop');
const driverDrawer = document.getElementById('driver-drawer');
const driverDrawerContent = document.getElementById('driver-drawer-content');
const drawerBackdrop = document.getElementById('drawer-backdrop');
const driverDistribution = document.getElementById('driver-distribution');
const driverTierTotals = document.getElementById('driver-tier-totals');
const driverFilterState = document.getElementById('driver-filter-state');
const trainingDialog = document.getElementById('training-dialog');
const trainingDialogContent = document.getElementById('training-dialog-content');
categoryDrawer.inert = true;
driverDrawer.inert = true;

function getCoachingScope(category) {
  return category;
}

function outcomeFor(category) {
  const movement = rateChange(category.weeklyRates || [0]);
  const counts = coachingCounts((session) => session.categoryId === category.id);
  const completion = counts.total ? Math.round(counts.completed / counts.total * 100) : 0;
  const label = movement.change <= -5 ? 'Improved' : movement.change >= 3 ? 'Review' : 'Unchanged';
  const fixture = outcomeSamples[category.id] || outcomeSamples.following;
  return { ...fixture, before: movement.before, after: movement.after, change: movement.change, completion, label, improvedResult: movement.change <= -5 };
}

// Driver-sample facts that the ledger does not carry (improved-driver share, eligible sample, repeats).
const outcomeSamples = (() => {
  const outcomes = {
    following: { before: 3.2, after: 2.7, change: -16, completion: 76, improved: 68, eligible: 29, repeated: 6, label: 'No clear change' },
    speeding: { before: 4.8, after: 2.9, change: -40, completion: 83, improved: 74, eligible: 31, repeated: 3, label: 'Improved' },
    braking: { before: 5.1, after: 3.6, change: -29, completion: 91, improved: 72, eligible: 18, repeated: 2, label: 'Improved' },
    distraction: { before: 2.4, after: 2.5, change: 4, completion: 74, improved: 51, eligible: 11, repeated: 4, label: 'Needs another approach' },
    seatbelt: { before: 2.9, after: 2.3, change: -21, completion: 88, improved: 64, eligible: 10, repeated: 3, label: 'Improved' },
    acceleration: { before: 2.1, after: 1.8, change: -14, completion: 81, improved: 61, eligible: 9, repeated: 3, label: 'Outcome pending' },
    cornering: { before: 1.9, after: 1.5, change: -21, completion: 79, improved: 63, eligible: 7, repeated: 2, label: 'Improved' },
    traffic: { before: 1.6, after: 1.5, change: -6, completion: 86, improved: 54, eligible: 6, repeated: 1, label: 'No clear change' },
    fatigue: { before: 1.8, after: 1.3, change: -28, completion: 82, improved: 70, eligible: 5, repeated: 2, label: 'Improved' },
    backing: { before: .4, after: .3, change: -25, completion: 93, improved: 79, eligible: 12, repeated: 0, label: 'Improved' }
  };
  return outcomes;
})();

// One vocabulary everywhere: Automated and One-on-one are the two in-progress states,
// Needs review is where a person must act, Completed closes the cycle. Every table reads the
// same session ledger, so Programs, Groups, Drivers, and the stat band add up.
function sessionWeeksAgo(session) {
  return Number.isFinite(session.weeksAgo) ? session.weeksAgo : session.state === 'archived' ? 3 : 0;
}

// Reporting age belongs to the record and stays independent of Archive/Restore state.
function sessionWithinPeriod(session, period) {
  return sessionWeeksAgo(session) < period;
}

function sessionInPeriod(session) {
  return sessionWithinPeriod(session, coachingPeriod);
}

function sessionsInPeriod(predicate) {
  return allSessionRecords().filter((session) => sessionInPeriod(session) && predicate(session));
}

function sessionTab(session) {
  if (session.state === 'manager_attention') return 'needs';
  if (session.state === 'completed' || session.state === 'archived') return 'completed';
  return sessionDeliveryMode(session) === 'one_on_one' ? 'one_to_one' : 'automated';
}

function periodLabel() {
  return coachingPeriod === 1 ? 'This week' : 'Last ' + coachingPeriod + ' weeks';
}

// The comparison week for the selected span: last week for a one-week span, otherwise the first week in the window.
function periodWindowStart() {
  return coachingPeriod === 1 ? weeklyCoachingActivity.length - 2 : weeklyCoachingActivity.length - coachingPeriod;
}

function periodScopeLabel() {
  const weeks = weeklyCoachingActivity;
  const last = weeks[weeks.length - 1].label;
  if (coachingPeriod === 1) return 'Week of ' + last;
  return weeks[weeks.length - coachingPeriod].label + ' – ' + last + ' · ' + coachingPeriod + ' weeks';
}

function periodComparisonLabel() {
  return coachingPeriod === 1 ? 'vs last week' : 'vs ' + coachingPeriod + ' wks ago';
}

// Event-rate movement over the selected span, from a weekly series (events per 1,000 trips).
function rateChange(series) {
  const before = series[Math.max(0, Math.min(series.length - 1, periodWindowStart()))];
  const after = series[series.length - 1];
  return { before, after, change: before ? Math.round((after - before) / before * 100) : 0 };
}

// Archived records inside the span count as completed; outside it they stay archived.
function sessionEffectiveState(session) {
  return session.state === 'archived' && sessionInPeriod(session) ? 'completed' : session.state;
}

function refreshPeriodData() {
  categories.forEach((category) => { category.eventChange = rateChange(category.weeklyRates).change; });
  Object.values(groupComparisonData).forEach((group) => { group.change = rateChange(group.weeklyRates).change; });
  document.querySelectorAll('[data-coaching-period]').forEach((control) => { control.value = String(coachingPeriod); });
  adjustSessionFleetTotals();
  syncGroupDisplay();
  if (currentView === 'inbox') renderInbox();
  if (currentView === 'drivers') renderDriversWorkspace();
  if (currentView === 'outcomes') renderAnalytics();
  if (currentView === 'programs') renderProgramsPage();
}

function coachingCounts(predicate, period = coachingPeriod) {
  const counts = { automated: 0, one_to_one: 0, needs_review: 0, completed: 0, total: 0, sessionTotal: 0, pendingSessionReviews: 0, automatedTotal: 0, oneOnOneTotal: 0, sessionReviews: 0 };
  allSessionRecords().forEach((session) => {
    if (!sessionWithinPeriod(session, period) || !predicate(session)) return;
    counts.total += 1;
    if (session.candidate) counts.pendingSessionReviews += 1;
    else {
      counts.sessionTotal += 1;
      if (sessionDeliveryMode(session) === 'one_on_one') counts.oneOnOneTotal += 1;
      else counts.automatedTotal += 1;
      if (session.state === 'manager_attention') counts.sessionReviews += 1;
    }
    if (session.state === 'archived') { counts.completed += 1; return; }
    if (session.state === 'manager_attention') counts.needs_review += 1;
    else if (session.state === 'completed') counts.completed += 1;
    else if (sessionDeliveryMode(session) === 'one_on_one') counts.one_to_one += 1;
    else counts.automated += 1;
  });
  counts.automatedInProgress = counts.automated;
  counts.oneOnOneInProgress = counts.one_to_one;
  return counts;
}

function driverOrigin(name) {
  return sessionMethodFilter(driverPreferredRecord(directory.find(driver => driver.name === name) || { name }));
}

function driverMatchesStatus(item, filter) {
  if (filter === 'all') return true;
  const record = driverPreferredRecord(item);
  const attention = record?.state === 'manager_attention';
  const completed = record && ['completed', 'archived'].includes(record.state);
  const active = record && !record.candidate && !attention && !completed;
  if (filter === 'attention') return attention;
  if (filter === 'automated') return active && sessionDeliveryMode(record) === 'automated';
  if (filter === 'one_to_one') return active && sessionDeliveryMode(record) === 'one_on_one';
  if (filter === 'coached') return Boolean(active);
  if (filter === 'completed' || filter === 'outcome') return Boolean(completed);
  return filter === 'track' && !record;
}

function groupForPerson(name) {
  const profile = directory.find((item) => item.name === name);
  if (profile) return profile.group;
  return driverGroups[Math.max(0, driverNames.indexOf(name)) % driverGroups.length];
}

function movementCopy(change) {
  return (change > 0 ? '+' : change < 0 ? '−' : '') + Math.abs(change) + '%';
}

function coachingRowCells(counts, change) {
  return [counts.automated, counts.one_to_one, counts.needs_review, counts.completed].map(value => '<td class="num">' + value + '</td>').join('') + '<td class="num ' + (change < 0 ? 'positive' : change > 0 ? 'negative' : '') + '">' + movementCopy(change) + '</td>';
}

function activityMetricCells(drivers, counts, rate, change) {
  const direction = change < 0 ? 'favourable' : change > 0 ? 'adverse' : 'unchanged';
  return [drivers, counts.total, counts.automated, counts.one_to_one, counts.needs_review, counts.completed].map(value => '<td class="num">' + value + '</td>').join('') +
    '<td class="num">' + chartRate(rate) + '</td><td class="num"><span class="delta--' + direction + '">' + movementCopy(change) + '</span></td>';
}

function categoryRow(category, counts) {
  const outcome = outcomeFor(category);
  return '<tr class="program-record"><td><button class="text-link" type="button" data-open-category="' + category.id + '" aria-controls="view-programs">' + escapeHtml(category.name) + '</button></td>' + activityMetricCells(category.drivers, counts, outcome.after, outcome.change) + '</tr>';
}

function groupRow(name, group, counts) {
  const outcome = rateChange(group.weeklyRates);
  return '<tr class="program-record"><td><button class="text-link" type="button" data-open-group="' + escapeHtml(name) + '" aria-haspopup="dialog">' + escapeHtml(name) + '</button></td>' + activityMetricCells(group.drivers, counts, outcome.after, outcome.change) + '</tr>';
}

function coachingSummaryCopy() {
  return periodLabel() + ' · Rates: ' + weeklyCoachingActivity.at(-1).label + ' · Change vs ' + weeklyCoachingActivity[periodWindowStart()].label;
}

function syncQueueLensControl() {
  document.querySelectorAll('[data-queue-lens]').forEach((node) => {
    const active = node.dataset.queueLens === queueLens;
    node.classList.toggle('is-active', active);
    node.setAttribute('aria-checked', String(active));
    node.tabIndex = active ? 0 : -1;
  });
}

function renderQueue() {
  if (!queueNode) return;
  const byGroup = queueLens === 'group';
  const title = document.getElementById('queue-lens-title');
  if (title) title.textContent = byGroup ? 'Performance by group' : 'Program performance';
  const byActivity = (a, b) => b.counts.needs_review - a.counts.needs_review || (b.counts.automated + b.counts.one_to_one) - (a.counts.automated + a.counts.one_to_one) || b.counts.completed - a.counts.completed;
  let rows = '';
  if (byGroup) {
    rows = Object.entries(groupComparisonData)
      .map(([name, group]) => ({ name, group, counts: coachingCounts((session) => groupForPerson(session.person) === name) }))
      .sort(byActivity)
      .map((entry) => groupRow(entry.name, entry.group, entry.counts)).join('');
  } else {
    rows = categories
      .map((category) => ({ category, counts: coachingCounts((session) => session.categoryId === category.id) }))
      .filter((entry) => entry.counts.total > 0 || entry.category.coached > 0)
      .sort(byActivity)
      .map((entry) => categoryRow(entry.category, entry.counts)).join('');
  }
  const summary = document.getElementById('queue-summary');
  if (summary) summary.textContent = coachingSummaryCopy();
  document.querySelectorAll('[data-coaching-period]').forEach((control) => { control.value = String(coachingPeriod); });
  queueNode.innerHTML = rows ? uiTable(byGroup ? 'Group performance' : 'Program performance', [byGroup ? 'Group' : 'Program', { label: 'Drivers', numeric: true }, { label: 'Records', numeric: true }, { label: 'Automated in progress', numeric: true }, { label: 'One-on-one in progress', numeric: true }, { label: 'Needs review', numeric: true }, { label: 'Completed', numeric: true }, { label: 'Events / 1,000 trips', numeric: true }, { label: 'Change', numeric: true }], rows) : '<div class="empty-state queue-empty"><strong>No coaching activity</strong><span>Nothing has been assigned in this period yet.</span></div>';
}

function updateAiCommandPreview() {
  const inScope = (insight) => landingProgramId === 'all' || insight.categoryId === landingProgramId;
  const available = attentionAiInsights.filter((insight) => inScope(insight) && !dismissedAiInsightIds.has(insight.id));
  const unresolved = attentionAiInsights.filter((insight) => inScope(insight) && !resolvedAttentionIds.has(insight.id));
  const first = available[0];
  const avatar = document.getElementById('ai-priority-avatar');
  const name = document.getElementById('ai-priority-name');
  const score = document.getElementById('ai-priority-score');
  const meta = document.getElementById('ai-priority-meta');
  if (avatar) {
    avatar.textContent = first ? initials(first.name) : '✓';
    avatar.classList.toggle('is-clear', !first);
  }
  document.querySelectorAll('[data-open-driver-record]').forEach((node) => {
    node.dataset.openDriverRecord = first ? first.name : '';
    node.dataset.priorityProgram = first ? first.categoryId : '';
    node.disabled = !first;
  });
  const clipPill = document.getElementById('ai-priority-clips');
  if (clipPill) {
    const spotlightSession = first ? sessions.find((session) => session.person === first.name && session.categoryId === first.categoryId && session.state === 'manager_attention') : null;
    const clipCount = spotlightSession ? sessionClips(spotlightSession).length : 0;
    clipPill.hidden = !clipCount;
    clipPill.innerHTML = playGlyph + clipCount + (clipCount === 1 ? ' clip' : ' clips');
    clipPill.setAttribute('aria-label', 'Play ' + clipCount + (clipCount === 1 ? ' clip' : ' clips') + (first ? ' for ' + first.name : ''));
  }
  if (name) name.textContent = first ? first.name : unresolved.length ? 'All insights reviewed' : 'Automation clear';
  if (score) {
    const recordedScore = first && (directory.find(driver => driver.name === first.name)?.safetyScore ?? first.safetyScore);
    score.textContent = first ? 'Elevate ' + recordedScore : '';
  }
  if (meta) meta.textContent = first
    ? first.categoryName + ' · ' + first.criterion.toLowerCase()
    : unresolved.length
      ? 'Attention remains visible in programs and sessions'
      : 'No attention items remain in this coaching cycle';
}

function openAiCoach(insightId) {
  const insight = attentionAiInsights.find((item) => item.id === insightId);
  if (!insight) return;
  const record = allSessionRecords().find(session => session.person === insight.name && session.categoryId === insight.categoryId && session.state === 'manager_attention');
  if (record?.candidate) startSessionForCandidate(record.id);
  else if (record) openSessionDrawer(record.id, { type: 'automation-centre' });
  else showToast('No open review remains for ' + insight.name);
}

function markAttentionReviewed(insightId) {
  const insight = attentionAiInsights.find((item) => item.id === insightId);
  if (!insight || dismissedAiInsightIds.has(insightId)) return;
  dismissedAiInsightIds.add(insightId);
  updateAiCommandPreview();
  showToast('Priority item marked reviewed');
}

function clearAttentionForSession(session) {
  const insight = attentionAiInsights.find((item) => (
    item.name === session.person &&
    item.categoryId === session.categoryId &&
    !resolvedAttentionIds.has(item.id)
  ));
  if (!insight) return;
  resolvedAttentionIds.add(insight.id);
  dismissedAiInsightIds.add(insight.id);
  const category = categories.find((item) => item.id === insight.categoryId);
  if (category) category.attention = Math.max(0, category.attention - 1);
  updateGroupAttention(insight, false);
  syncFleetSessionCounts();
  syncDirectoryAttentionState(session.person);
  updateAiCommandPreview();
  renderQueue();
  if (activeCategory && category && activeCategory.id === category.id) renderCategory();
}

function resolveAttentionInsight(insightId) {
  const insight = attentionAiInsights.find((item) => item.id === insightId);
  if (!insight || resolvedAttentionIds.has(insightId)) return;
  resolvedAttentionIds.add(insightId);
  dismissedAiInsightIds.add(insightId);
  const category = categories.find((item) => item.id === insight.categoryId);
  if (category) {
    category.attention = Math.max(0, category.attention - 1);
    category.completed = Math.min(category.coached, category.completed + 1);
    category.active = Math.max(0, category.coached - category.completed);
  }
  updateGroupAttention(insight, true);
  const matchingSession = sessions.find((session) => session.person === insight.name && session.categoryId === insight.categoryId && isAttentionSessionState(session.state));
  if (matchingSession) {
    const previousState = matchingSession.state;
    const previousReason = matchingSession.attentionReason;
    matchingSession.state = 'completed';
    matchingSession.stateLabel = 'Completed';
    matchingSession.attentionReason = null;
    matchingSession.latest = 'Review resolved · just now';
    matchingSession.due = 'Completed just now';
    matchingSession.sla = previousReason === 'reminders_exhausted' ? 'Missed' : 'Met';
    matchingSession.slaTone = previousReason === 'reminders_exhausted' ? 'overdue' : 'met';
    matchingSession.history.unshift(['Attention resolved', 'Just now']);
    adjustSessionFleetTotals(previousState, matchingSession.state, matchingSession.source, previousReason, null);
  } else {
    adjustSessionFleetTotals('manager_attention', 'completed', 'Automated', insight.reason, null);
  }
  syncDirectoryAttentionState(insight.name);
  updateAiCommandPreview();
  renderQueue();
  if (activeCategory && category && activeCategory.id === category.id) renderCategory();
  showToast('Attention item resolved');
}

const routeViewNames = {
  coaching: 'automation',
  inbox: 'sessions',
  programs: 'programs',
  outcomes: 'analytics',
  drivers: 'drivers', // Independent driver directory
  groups: 'groups', // Legacy route: opens Drivers › Groups
  library: 'learning'
};
// The lesson an automation-started session carries: the programme's produced course when one exists,
// otherwise the imported lesson label. Keeps the draft, the session and the driver app in agreement.
function draftCourse(category) { return typeof ProgramSetup !== 'undefined' ? ProgramSetup.courseForProgram(category.id) : null; }
function draftLessonTitle(category) { const course = draftCourse(category); return course ? course.title : category.training; }
function draftLessonLabel(category) {
  const course = draftCourse(category);
  if (!course) return category.training;
  const seconds = course.videoSeconds || 0;
  return course.title + ' · ' + (seconds % 60 === 0 ? seconds / 60 + ' min video' : seconds + ' sec video') + (course.questions?.length ? ' · ' + course.questions.length + '-question quiz' : '');
}
const internalViewNames = Object.fromEntries(Object.entries(routeViewNames).map(([internal, route]) => [route, internal]));
internalViewNames.content = 'library'; // legacy route: Content is now Learning
internalViewNames.settings = 'settings'; // legacy route: automation settings now live in Programs › Automation

function updateUrlState(replace = false) {
  const url = new URL(window.location.href);
  ['session', 'origin', 'analytics', 'outcome', 'queue', 'lens', 'period', 'driversTab', 'driverStatus', 'group', 'program', 'programTab', 'programState', 'programCoach', 'programComparison', 'libraryTab', 'programPreview', 'programStage', 'groupPreview', 'score', 'sort', 'view', 'q', 'record', 'driver'].forEach((key) => url.searchParams.delete(key));
  if (currentView === 'inbox') {
    url.searchParams.set('session', activeSessionFilter);
    url.searchParams.set('origin', activeSessionSource);
    if (activeSessionProgram !== 'all') url.searchParams.set('program', activeSessionProgram);
    if (sessionSearch) url.searchParams.set('q', sessionSearch);
  } else if (currentView === 'outcomes') {
    url.searchParams.set('analytics', analyticsTab);
    if (analyticsTab === 'outcomes') url.searchParams.set('outcome', outcomeTab);
  }
  if (currentView === 'coaching' && landingProgramId !== 'all') url.searchParams.set('program', landingProgramId);
  if (currentView === 'programs') {
    url.searchParams.set('program', selectedProgramId);
    if (programTab !== 'activity') url.searchParams.set('programTab', programTab);
    if (selectedProgramId === 'all' && programTab === 'activity' && programComparisonView === 'rates') url.searchParams.set('programComparison', 'rates');
  }
  if (currentView === 'library' && typeof TrainingLibrary !== 'undefined' && TrainingLibrary.getView() === 'templates') url.searchParams.set('libraryTab', 'templates');
  if (coachingPeriod !== 1) url.searchParams.set('period', String(coachingPeriod));
  if (currentView === 'drivers' && driversTab === 'groups') {
    url.searchParams.set('driversTab', 'groups');
    if (groupsProgramId !== 'all') url.searchParams.set('program', groupsProgramId);
  }
  if (currentView === 'drivers' && driversTab === 'directory') {
    url.searchParams.set('driverStatus', activeDriverFilter);
    if (activeDriverGroup !== 'all') url.searchParams.set('group', activeDriverGroup);
    if (activeDriverCategory !== 'all') url.searchParams.set('program', activeDriverCategory);
    if (activeDriverScoreFilter !== 'all') url.searchParams.set('score', activeDriverScoreFilter);
    if (driverSort !== 'action') url.searchParams.set('sort', driverSort);
    const driverTerm = document.getElementById('driver-search')?.value.trim();
    if (driverTerm) url.searchParams.set('q', driverTerm);
  }
  if (activeSessionId) url.searchParams.set('record', activeSessionId);
  if (categoryDrawer.open) {
    if (activeCategory) {
      url.searchParams.set('programPreview', activeCategory.id);
      url.searchParams.set('programStage', workflowTab);
      if (programDrawerParent) url.searchParams.set('groupPreview', programDrawerParent.groupName);
    } else if (categoryDrawerReturnTarget?.type === 'group') url.searchParams.set('groupPreview', categoryDrawerReturnTarget.id);
  }
  if (activeDriverProfile && ((currentView === 'drivers') || currentView === 'programs')) url.searchParams.set('driver', activeDriverProfile);
  url.hash = routeViewNames[currentView];
  const next = url.pathname + (url.searchParams.toString() ? '?' + url.searchParams.toString() : '') + url.hash;
  const current = window.location.pathname + window.location.search + window.location.hash;
  if (next === current) return;
  window.history[replace ? 'replaceState' : 'pushState']({ elevateView: currentView, programPageReturn: currentView === 'programs' ? programPageReturn : null }, '', next);
}

function applyUrlState(options = {}) {
  const routeHash = window.location.hash.replace(/^#/, '');
  if (routeHash === 'main-content') {
    document.getElementById('main-content')?.focus({ preventScroll: true });
    return;
  }
  const params = new URLSearchParams(window.location.search);
  const hashView = internalViewNames[routeHash];
  const queryView = internalViewNames[params.get('view')] || (routeViewNames[params.get('view')] ? params.get('view') : null);
  const view = hashView || queryView || 'coaching';
  activeSessionFilter = 'manager_attention';
  activeSessionSource = 'all';
  sessionSearch = '';
  analyticsTab = 'outcomes';
  driversTab = 'directory';
  groupsProgramId = 'all';
  outcomeTab = 'category';
  queueStatus = 'needs';
  queueLens = 'program';
  coachingPeriod = 1;
  landingProgramId = 'all';
  activeSessionProgram = 'all';
  selectedProgramId = 'all';
  programTab = 'activity';
  programComparisonView = 'coaching';
  programPageReturn = window.history.state?.programPageReturn || null;
  const requestedProgram = categories.find(program => program.id === params.get('program') || program.name === params.get('program'));
  if (requestedProgram) {
    if (view === 'coaching') landingProgramId = requestedProgram.id;
    if (view === 'inbox') activeSessionProgram = requestedProgram.id;
    if (['programs', 'groups'].includes(view) || (view === 'outcomes' && params.get('analytics') !== 'drivers')) selectedProgramId = requestedProgram.id;
  }
  if (programPageTabs.some(([value]) => value === params.get('programTab'))) programTab = params.get('programTab');
  if (view === 'programs' && selectedProgramId === 'all' && programTab === 'activity' && params.get('programComparison') === 'rates') programComparisonView = 'rates';
  activeDriverFilter = 'all';
  activeDriverGroup = 'all';
  activeDriverCategory = 'all';
  activeDriverScoreFilter = 'all';
  driverSort = 'action';
  const requestedSessionFilter = normalizeSessionFilter(params.get('session') || 'manager_attention');
  const validSessionFilters = ['manager_attention', 'system_handling', 'completed', 'archived', 'all', ...Object.keys(attentionReasonMeta)];
  if (validSessionFilters.includes(requestedSessionFilter)) activeSessionFilter = requestedSessionFilter;
  const requestedOrigin = normalizeSessionOrigin(params.get('origin'));
  if (['all', 'automated', 'manual_override'].includes(requestedOrigin)) activeSessionSource = requestedOrigin;
  if (analyticsTabs.includes(params.get('analytics'))) analyticsTab = params.get('analytics');
  if (view === 'drivers' || view === 'groups') analyticsTab = view;
  const groupsRoute = view === 'groups' || (view === 'drivers' && params.get('driversTab') === 'groups') || (view === 'outcomes' && analyticsTab === 'groups') || (view === 'programs' && params.get('programTab') === 'groups');
  driversTab = groupsRoute ? 'groups' : 'directory';
  if (groupsRoute) groupsProgramId = requestedProgram?.id || 'all';
  const driversRoute = view === 'drivers' || groupsRoute || (view === 'outcomes' && analyticsTab === 'drivers');
  if (['category', 'driver'].includes(params.get('outcome'))) outcomeTab = params.get('outcome');
  if (['needs', 'all'].includes(params.get('queue'))) queueStatus = params.get('queue');
  if (['program', 'group'].includes(params.get('lens'))) queueLens = params.get('lens');
  if (['1', '4', '8'].includes(params.get('period'))) coachingPeriod = Number(params.get('period'));
  refreshPeriodData();
  if (['all', 'attention', 'automated', 'one_to_one', 'completed', 'coached', 'outcome', 'track'].includes(params.get('driverStatus'))) activeDriverFilter = params.get('driverStatus');
  if (params.get('group') && (params.get('group') === 'all' || driverGroups.includes(params.get('group')))) activeDriverGroup = params.get('group');
  if (driversRoute && requestedProgram) activeDriverCategory = requestedProgram.id;
  if (params.get('score') && (params.get('score') === 'all' || driverDistributionBins.some((bin) => bin.key === params.get('score')) || ['risk', 'watch', 'safe'].includes(params.get('score')))) activeDriverScoreFilter = params.get('score');
  if (['action', 'lowest', 'decline'].includes(params.get('sort'))) driverSort = params.get('sort');
  if (view === 'inbox') sessionSearch = params.get('q') || '';
  const sessionSearchInput = document.getElementById('session-search');
  const driverSearchInput = document.getElementById('driver-search');
  if (sessionSearchInput) sessionSearchInput.value = sessionSearch;
  if (driverSearchInput) driverSearchInput.value = driversRoute ? params.get('q') || '' : '';
  const groupSelect = document.getElementById('driver-group-filter');
  const programSelect = document.getElementById('driver-category-filter');
  const sortSelect = document.getElementById('driver-sort');
  if (groupSelect) groupSelect.value = activeDriverGroup;
  if (programSelect) programSelect.value = activeDriverCategory;
  if (sortSelect) sortSelect.value = driverSort;
  setView(groupsRoute ? 'groups' : view, { updateUrl: false, focusHeading: false });
  if (groupComparisonData[params.get('groupPreview')]) openGroupDrawer(params.get('groupPreview'), { updateUrl: false, focus: options.focus !== false });
  const previewProgram = categories.find(program => program.id === params.get('programPreview'));
  if (previewProgram) openCategoryDrawer(previewProgram.id, { updateUrl: false, stage: params.get('programStage') });
  const requestedRecord = params.get('record');
  const requestedDriver = (driversRoute || currentView === 'programs') && directory.some(driver => driver.name === params.get('driver')) ? params.get('driver') : null;
  if (requestedDriver) openDriverProfile(requestedDriver);
  if (requestedRecord && sessions.some((session) => session.id === requestedRecord)) {
    const fromProfile = requestedDriver && sessions.some(session => session.id === requestedRecord && session.person === requestedDriver);
    const fromProgram = previewProgram && sessions.some(session => session.id === requestedRecord && session.categoryId === previewProgram.id);
    openSessionDrawer(requestedRecord, fromProfile ? { type: 'driver-profile', driverName: requestedDriver } : { type: fromProgram || currentView === 'programs' ? 'program-page' : 'deep-link' });
  }
  if (previewProgram || ['outcomes', 'drivers', 'groups', 'settings'].includes(view) || params.get('programTab') === 'overview') updateUrlState(true);
}

function setView(view, options = {}) {
  view = internalViewNames[view] || view;
  if (view === 'drivers') driversTab = 'directory';
  if (view === 'groups') {
    driversTab = 'groups';
    view = 'drivers';
  } else if (view === 'outcomes') {
    if (['drivers', 'groups'].includes(analyticsTab)) { driversTab = analyticsTab === 'groups' ? 'groups' : 'directory'; view = 'drivers'; }
    else { programTab = 'activity'; view = 'programs'; }
  }
  if (view === 'settings') {
    selectedProgramId = 'all';
    programTab = 'automation';
    view = 'programs';
  }
  if (!routeViewNames[view]) view = 'coaching';
  document.querySelectorAll('[data-filter-sheet].is-open').forEach((sheet) => closeFilterSheet(sheet, false));
  if (categoryDrawer.classList.contains('is-open')) closeCategoryDrawer(false);
  if (driverDrawer.classList.contains('is-open')) closeDrawer(false);
  currentView = view;
  document.querySelectorAll('.app-view').forEach((node) => node.classList.toggle('is-active', node.id === 'view-' + view));
  document.querySelectorAll('[data-view], [data-mobile-view]').forEach((node) => {
    const targetView = node.dataset.view || node.dataset.mobileView;
    const destination = view;
    const active = targetView === destination;
    node.classList.toggle('is-active', active);
    if (active) node.setAttribute('aria-current', 'page');
    else node.removeAttribute('aria-current');
  });
  const mobileMoreTrigger = document.getElementById('mobile-more-trigger');
  if (mobileMoreTrigger) {
    const moreActive = ['library', 'driver'].includes(view);
    mobileMoreTrigger.classList.toggle('is-active', moreActive);
    if (moreActive) mobileMoreTrigger.setAttribute('aria-current', 'page');
    else mobileMoreTrigger.removeAttribute('aria-current');
  }
  if (view === 'inbox') renderInbox();
  if (view === 'coaching') renderHomeOverview();
  if (view === 'drivers') renderDriversWorkspace();
  if (view === 'outcomes') renderAnalytics();
  if (view === 'programs') renderProgramsPage();
  if (view === 'library') renderLibrary();
  if (options.updateUrl !== false) updateUrlState(Boolean(options.replaceUrl));
  const reduceMotion = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
  window.scrollTo({ top: 0, behavior: reduceMotion ? 'auto' : 'smooth' });
  if (options.focusHeading !== false) {
    const heading = document.querySelector('#view-' + view + ' h1');
    if (heading) {
      heading.setAttribute('tabindex', '-1');
      window.requestAnimationFrame(() => heading.focus({ preventScroll: true }));
    }
  }
}

function renderDriversWorkspace() {
  const grouped = driversTab === 'groups';
  document.getElementById('drivers-panel-directory').hidden = grouped;
  document.getElementById('drivers-panel-groups').hidden = !grouped;
  document.getElementById('driver-group-controls').hidden = !grouped;
  document.querySelectorAll('[data-drivers-tab]').forEach(tab => {
    const selected = tab.dataset.driversTab === driversTab;
    tab.classList.toggle('is-active', selected);
    tab.setAttribute('aria-selected', String(selected));
    tab.tabIndex = selected ? 0 : -1;
  });
  if (grouped) syncGroupDisplay();
  else renderDirectory();
}

document.addEventListener('click', event => {
  const tab = event.target.closest('[data-drivers-tab]');
  if (!tab) return;
  driversTab = tab.dataset.driversTab;
  renderDriversWorkspace();
  updateUrlState();
});

function openProgramPage(categoryId, tab = 'activity') {
  if (categoryId !== 'all' && !categories.some(program => program.id === categoryId)) return;
  selectedProgramId = categoryId;
  programTab = programPageTabs.some(([value]) => value === tab) ? tab : 'activity';
  activeSessionId = null;
  setView('programs');
}

// Compatibility entry point: program detail now belongs to the full Programs page.
function openCategoryDrawer(categoryId, options = {}) {
  if (!categories.some(program => program.id === categoryId)) return;
  if (currentView !== 'programs' || categoryDrawer.open || (selectedProgramId !== categoryId && ['activity', 'groups'].includes(programTab))) {
    const groupName = categoryDrawer.open && categoryDrawerReturnTarget?.type === 'group' ? categoryDrawerReturnTarget.id : null;
    const source = new URL(window.location.href);
    ['programPreview', 'programStage', 'record'].forEach(key => source.searchParams.delete(key));
    const opener = document.activeElement;
    programPageReturn = {
      label: groupName || (currentView === 'drivers' && driversTab === 'groups' ? 'Groups' : currentView === 'programs' ? (programTab === 'groups' ? 'Groups' : selectedProgramId === 'all' ? 'All programmes' : categoryNameFor(selectedProgramId)) : document.querySelector('.app-view.is-active h1')?.textContent || 'Previous page'),
      programTab, selectedProgramId,
      url: source.pathname + source.search + source.hash,
      programId: categoryId,
      openerId: opener?.id || null,
      scrollTop: window.scrollY,
      groupScrollTop: groupName ? categoryDrawer.querySelector('.category-panel-scroll')?.scrollTop || 0 : null
    };
  }
  const stage = options.stage || 'all';
  if (options.updateUrl === false) {
    selectedProgramId = categoryId;
    programTab = 'activity';
    setView('programs', { updateUrl: false, focusHeading: false });
  } else openProgramPage(categoryId);
  if (stage === 'outcomes') requestAnimationFrame(() => showProgramRecordedOutcomes());
}

function backToProgramSource() {
  const parent = programPageReturn;
  if (!parent) { openProgramPage('all'); return; }
  window.history.pushState({}, '', parent.url);
  applyUrlState({ focus: false });
  requestAnimationFrame(() => {
    window.scrollTo({ top: parent.scrollTop, behavior: 'instant' });
    const groupBody = categoryDrawer.open && categoryDrawer.querySelector('.category-panel-scroll');
    if (groupBody && parent.groupScrollTop !== null) groupBody.scrollTop = parent.groupScrollTop;
    const target = (parent.openerId && document.getElementById(parent.openerId)) || Array.from(document.querySelectorAll('[data-open-category], [data-open-program-page]')).find(node => (node.dataset.openCategory || node.dataset.openProgramPage) === parent.programId && node.getClientRects().length);
    target?.focus({ preventScroll: true });
  });
}

function backToProgramGroup() {
  const parent = programDrawerParent;
  if (!parent) return;
  openGroupDrawer(parent.groupName, { focus: false, updateUrl: false });
  categoryDrawerOpener = parent.opener;
  updateUrlState(true);
  requestAnimationFrame(() => {
    const panel = categoryDrawer.querySelector('.category-panel-scroll');
    if (panel) panel.scrollTop = parent.scrollTop;
    categoryDrawer.querySelector('[data-open-category="' + parent.programId + '"]')?.focus({ preventScroll: true });
  });
}

function closeCategoryDrawer(restoreFocus = true) {
  if (restoreFocus && programDrawerParent) { backToProgramGroup(); return; }
  const targetContext = categoryDrawerReturnTarget;
  const opener = categoryDrawerOpener;
  sessionDraft = null;
  activeCategory = null;
  programDrawerParent = null;
  categoryDrawer.classList.remove('is-composer');
  categoryDrawer.classList.remove('is-open');
  categoryDrawer.close();
  categoryDrawer.setAttribute('aria-hidden', 'true');
  categoryDrawer.inert = true;
  document.getElementById('app-shell').inert = driverDrawer.open;
  document.body.style.overflow = driverDrawer.open ? 'hidden' : '';
  if (restoreFocus) updateUrlState(true);
  setTimeout(() => {
    if (categoryDrawer.open) return;
    categoryBackdrop.hidden = true;
    if (!restoreFocus) return;
    const target = opener && document.contains(opener) && opener.getClientRects().length ? opener : targetContext?.type === 'group'
      ? Array.from(document.querySelectorAll('[data-open-group]')).find(node => node.dataset.openGroup === targetContext.id && node.getClientRects().length)
      : Array.from(document.querySelectorAll('[data-open-category]')).find(node => node.dataset.openCategory === targetContext?.id && node.getClientRects().length);
    if (target) target.focus();
    else document.querySelector('[data-view="coaching"]')?.focus();
  }, 220);
}

const groupComparisonData = {
  'Long haul · North': { drivers: 286, score: 69, coached: 48, completed: 44, attention: 4, change: 8, weeklyRates: [3.1, 3.0, 3.05, 3.12, 3.08, 3.17, 3.2, 3.35], programs: [['Following distance', 12, 11, 1, 14], ['Speeding', 10, 9, 1, 9], ['Harsh braking', 5, 5, 0, -6], ['Distracted driving', 4, 4, 0, 4], ['Seat belt use', 8, 7, 1, -8], ['Harsh acceleration', 2, 2, 0, -9], ['Traffic controls', 2, 2, 0, -11], ['Driver fatigue', 5, 4, 1, 6]] },
  'Local delivery': { drivers: 267, score: 78, coached: 37, completed: 34, attention: 3, change: -29, weeklyRates: [3.8, 3.65, 3.5, 3.35, 3.1, 2.95, 2.82, 2.7], programs: [['Following distance', 8, 7, 1, -31], ['Speeding', 6, 6, 0, -17], ['Harsh braking', 7, 6, 1, -24], ['Distracted driving', 5, 4, 1, -12], ['Seat belt use', 4, 4, 0, -18], ['Harsh acceleration', 3, 3, 0, -14], ['Traffic controls', 3, 3, 0, -19], ['Driver fatigue', 1, 1, 0, -8]] },
  'Regional · East': { drivers: 241, score: 82, coached: 31, completed: 28, attention: 3, change: -21, weeklyRates: [3.3, 3.22, 3.12, 3.02, 2.9, 2.8, 2.72, 2.6], programs: [['Following distance', 7, 6, 1, -18], ['Speeding', 7, 7, 0, -16], ['Harsh braking', 4, 4, 0, -15], ['Distracted driving', 4, 3, 1, -27], ['Seat belt use', 2, 2, 0, -13], ['Harsh acceleration', 3, 3, 0, -12], ['Traffic controls', 3, 2, 1, -11], ['Driver fatigue', 1, 1, 0, -10]] },
  'Regional · West': { drivers: 230, score: 72, coached: 26, completed: 22, attention: 4, change: -11, weeklyRates: [3.6, 3.55, 3.48, 3.42, 3.35, 3.3, 3.25, 3.2], programs: [['Following distance', 5, 5, 0, -8], ['Speeding', 6, 5, 1, -17], ['Harsh braking', 5, 4, 1, -12], ['Distracted driving', 5, 4, 1, 4], ['Seat belt use', 1, 1, 0, -6], ['Harsh acceleration', 4, 3, 1, -9]] }
};

const groupDisplayIds = {
  'Long haul · North': 'north',
  'Local delivery': 'local',
  'Regional · East': 'east',
  'Regional · West': 'west'
};

function renderGroupOverview() {
  renderGroupChartOverview();
}

function groupScopeProgram() {
  return groupsProgramId;
}

function groupScopedCounts(name) {
  const programId = groupScopeProgram();
  return coachingCounts(record => groupForPerson(record.person) === name && (programId === 'all' || record.categoryId === programId));
}

function renderProgramGroups() {
  syncGroupDisplay();
}

function renderGroupScopedKpis() {
  const programId = groupScopeProgram();
  if (programId === 'all') return;
  const scoped = allSessionRecords().filter(record => record.categoryId === programId && sessionWithinPeriod(record, coachingPeriod));
  const counts = coachingCounts(record => record.categoryId === programId);
  document.getElementById('groups-kpis').innerHTML = uiKpiStrip('Group coaching · ' + categoryNameFor(programId), [
    { label: 'Groups with coaching', value: new Set(scoped.map(record => groupForPerson(record.person))).size, context: categoryNameFor(programId) + ' · ' + periodScopeLabel() },
    { label: 'Coached drivers', value: new Set(scoped.map(record => record.person)).size, context: 'Distinct drivers with records for this programme and period.' },
    { label: 'In progress', value: counts.automated + counts.one_to_one, context: 'Programme sessions currently in progress.', action: 'data-view-link="inbox" data-inbox-filter="system_handling" data-inbox-program="' + escapeHtml(programId) + '"' },
    { label: 'Needs review', value: counts.needs_review, context: 'Programme sessions waiting on a person.', action: 'data-view-link="inbox" data-inbox-filter="attention" data-inbox-program="' + escapeHtml(programId) + '"' }
  ]);
}

function groupComparisonRow(name, group) {
  const counts = groupScopedCounts(name);
  return '<tr class="group-record"><td><button class="text-link" type="button" data-open-group="' + escapeHtml(name) + '" aria-haspopup="dialog">' + escapeHtml(name) + '</button></td><td class="num">' + group.drivers + '</td><td class="num">' + group.score + '</td><td class="num">' + counts.automated + '</td><td class="num">' + counts.one_to_one + '</td><td class="num">' + counts.needs_review + '</td><td class="num">' + counts.completed + '</td><td class="num ' + (group.change > 0 ? 'negative' : 'positive') + '">' + movementCopy(group.change) + '</td></tr>';
}

function syncGroupDisplay() {
  const scope = document.getElementById('driver-groups-scope');
  if (scope) scope.textContent = periodScopeLabel();
  renderGroupOverview();
  const rows = document.getElementById('group-rows');
  if (rows) rows.innerHTML = uiTable('Group comparison — programme-scoped coaching; driver totals, scores and event trends describe the overall groups', ['Group', { label: 'Fleet drivers', numeric: true }, { label: 'Overall Elevate score', numeric: true }, { label: 'Automated in progress', numeric: true }, { label: 'One-on-one in progress', numeric: true }, { label: 'Needs review', numeric: true }, { label: 'Completed', numeric: true }, { label: 'Overall event change', numeric: true }], Object.entries(groupComparisonData).map(([name, group]) => groupComparisonRow(name, group)).join(''));
  const priority = Object.entries(groupComparisonData).sort((a, b) => b[1].attention - a[1].attention)[0];
  const priorityName = document.getElementById('groups-priority-name');
  const priorityCount = document.getElementById('groups-priority-count');
  if (priorityName) priorityName.textContent = priority[1].attention ? priority[0] : 'No groups need review';
  if (priorityCount) priorityCount.textContent = priority[1].attention;
  const hint = document.querySelector('.group-comparison-card [aria-label="About group comparison"]');
  if (hint) hint.dataset.tooltip = (groupScopeProgram() === 'all' ? 'All programmes' : categoryNameFor(groupScopeProgram())) + ' coaching · ' + periodScopeLabel() + '. Fleet driver totals, Elevate scores and event-rate changes describe each overall group; they are not programme-specific.';
  renderGroupScopedKpis();
  if (groupScopeProgram() !== 'all') document.querySelectorAll('#groups-overview > .chart-card:not(.overview-workload-panel) .chart-context').forEach(context => { context.textContent = 'Overall group · ' + context.textContent; });
}

function updateGroupAttention(insight, completed) {
  const group = groupComparisonData[insight.group];
  if (!group || !group.attention) return;
  group.attention = Math.max(0, group.attention - 1);
  const program = group.programs.find((item) => item[0] === insight.categoryName);
  if (program) program[3] = Math.max(0, program[3] - 1);
  if (completed) {
    group.completed = Math.min(group.coached, group.completed + 1);
    if (program) program[2] = Math.min(program[1], program[2] + 1);
  }
  syncGroupDisplay();
}

function openGroupDrawer(groupName, options = {}) {
  const group = groupComparisonData[groupName];
  if (!group) return;
  categoryDrawerOpener = document.activeElement;
  categoryDrawerReturnTarget = { type: 'group', id: groupName };
  programDrawerParent = null;
  activeCategory = null;
  sessionDraft = null;
  categoryDrawer.classList.remove('is-composer');
  const chartCategory = { id: 'group-' + groupName.toLowerCase().replace(/[^a-z0-9]+/g, '-'), name: groupName, weeklyRates: group.weeklyRates };
  const scopedProgramId = groupScopeProgram();
  const scopedProgramLabel = scopedProgramId === 'all' ? 'All programmes' : categoryNameFor(scopedProgramId);
  const groupCounts = groupScopedCounts(groupName);
  categoryContent.innerHTML = [
    '<header class="category-panel-header"><div><p class="eyebrow">Group comparison</p><div class="panel-title-line"><h1 id="category-title">' + escapeHtml(groupName) + '</h1></div></div><button class="icon-button" type="button" data-close-category aria-label="Close group">×</button></header>',
    '<div class="category-panel-scroll group-detail-drawer">',
      uiKpiStrip('Group coaching summary', [{ label: 'Overall Elevate score', value: group.score, context: 'Recorded prototype score · scale 0–100. The weighted program roll-up is not configured yet.', meter: { value: group.score, max: 100 } }, { label: 'Automated', value: groupCounts.automated, context: 'In progress' }, { label: 'One-on-one', value: groupCounts.one_to_one, context: 'In progress' }, { label: 'Needs review', value: groupCounts.needs_review, context: periodLabel() }, { label: 'Completed', value: groupCounts.completed, context: periodLabel() }]),
      '<section class="group-detail-summary"><div><span>Overall group · ' + escapeHtml(outcomeWindowLabel()) + '</span><h2>' + (group.change > 0 ? 'Coached events increased ' + group.change + '%' : 'Coached events decreased ' + Math.abs(group.change) + '%') + '</h2><p>' + (group.change > 0 ? 'This group is the first priority for program review.' : 'The group is moving in the intended direction.') + '</p></div><button class="secondary-button" type="button" data-view-link="drivers" data-driver-group-link="' + escapeHtml(groupName) + '" data-driver-program-link="' + escapeHtml(scopedProgramId) + '">View drivers</button></section>',
      '<section class="signal-panel chart-card"><div class="signal-heading"><h2 class="chart-title">Overall group event rate</h2><div class="signal-value ' + (group.change > 0 ? 'is-negative' : '') + '"><strong>' + (group.change > 0 ? '+' : '') + group.change + '%</strong><span>' + escapeHtml(outcomeWindowLabel()) + '</span></div></div><div class="category-progress-chart">' + categoryWeeklyChartSvg(chartCategory) + '</div></section>',
      '<section class="group-programs"><header><h2>Programmes in this group</h2><span>' + escapeHtml(scopedProgramLabel + ' · ' + periodLabel()) + '</span></header>' + uiTable('Programs in group', ['Program', { label: 'Automated in progress', numeric: true }, { label: 'One-on-one in progress', numeric: true }, { label: 'Needs review', numeric: true }, { label: 'Completed', numeric: true }, { label: 'Event change', numeric: true }], categories.filter(program => scopedProgramId === 'all' || program.id === scopedProgramId).map(program => ({ program, counts: coachingCounts(session => groupForPerson(session.person) === groupName && session.categoryId === program.id) })).filter(entry => entry.counts.total > 0).sort((a,b) => b.counts.needs_review - a.counts.needs_review || b.counts.total - a.counts.total).map(({ program, counts }) => '<tr><td><button class="text-link" type="button" data-open-category="' + program.id + '">' + escapeHtml(program.name) + '</button></td>' + coachingRowCells(counts, program.eventChange) + '</tr>').join('')) + '</section>',
    '</div>'
  ].join('');
  categoryBackdrop.hidden = false;
  categoryDrawer.inert = false;
  if (!categoryDrawer.open) categoryDrawer.showModal();
  categoryDrawer.classList.add('is-open');
  categoryDrawer.setAttribute('aria-hidden', 'false');
  document.getElementById('app-shell').inert = true;
  document.body.style.overflow = 'hidden';
  if (options.updateUrl !== false) updateUrlState();
  if (options.focus !== false) setTimeout(() => categoryDrawer.querySelector('[data-close-category]')?.focus(), 100);
}

function beforeAfterRows() {
  if (outcomeTab === 'cohort') {
    return Object.entries(groupComparisonData).map(([name, group]) => ({
      label: name,
      before: group.weeklyRates[0],
      after: group.weeklyRates[group.weeklyRates.length - 1],
      change: group.change
    }));
  }
  if (outcomeTab === 'driver') {
    return outcomeDetailViews.driver.rows.map((row) => ({
      label: row[0],
      meta: row[1],
      before: Number(row[2]),
      after: Number(row[3]),
      change: parseInt(row[4].replace('−', '-'), 10)
    }));
  }
  return outcomePrograms().map((category) => {
    const outcome = outcomeFor(category);
    return { label: category.name, before: outcome.before, after: outcome.after, change: outcome.change };
  });
}

function outcomePrograms() {
  return categories.filter((category) => coachingCounts((session) => session.categoryId === category.id).total > 0);
}

function outcomeWindowLabel() {
  return coachingPeriod === 1 ? 'last week vs this week' : 'first vs latest week · last ' + coachingPeriod + ' weeks';
}

function formatRate(value) {
  return (Math.round(value * 10) / 10).toFixed(1);
}

// One horizontal bar per program, group, or driver: the latest level is solid; the distance back to the
// starting level is hatched when events fell and marked when they rose. Sorted by the chosen lens.
function sortedOutcomeRows(rows) {
  const list = rows.slice();
  if (outcomeSort === 'level') return list.sort((a, b) => b.after - a.after || a.label.localeCompare(b.label));
  if (outcomeSort === 'alpha') return list.sort((a, b) => a.label.localeCompare(b.label));
  return list.sort((a, b) => a.change - b.change || a.label.localeCompare(b.label));
}

function beforeAfterChartSvg(rows, availableWidth) {
  return chartBeforeAfterSvg(rows.slice(0, 4), availableWidth);
}

function outcomeFootnote(rows) {
  if (!rows.length) return '';
  const changes = rows.map((row) => row.change).sort((a, b) => a - b);
  const middle = Math.floor(changes.length / 2);
  const median = changes.length % 2 ? changes[middle] : Math.round((changes[middle - 1] + changes[middle]) / 2);
  const increases = rows.filter((row) => row.change > 0).map((row) => row.label);
  const noun = { category: 'programs', cohort: 'groups', driver: 'drivers' }[outcomeTab] || 'programs';
  const increaseCopy = !increases.length ? 'No increases' : increases.length === 1 ? increases[0] + ' is the only increase' : increases.length + ' ' + noun + ' increased: ' + increases.join(', ');
  return 'Median change <strong>' + movementCopy(median) + '</strong> across ' + rows.length + ' ' + noun + ' · <em class="' + (increases.length ? 'is-increase' : 'is-clear') + '">' + escapeHtml(increaseCopy) + '</em>';
}

function renderOutcomeProgressChart() {
  const node = document.getElementById('outcome-progress-chart');
  if (!node) return;
  const rows = sortedOutcomeRows(beforeAfterRows());
  const plotted = rows.slice(0, 4);
  node.classList.add('chart-plot');
  node.setAttribute('tabindex', '0');
  node.setAttribute('role', 'region');
  node.setAttribute('aria-label', 'Before and after event-rate chart');
  node.innerHTML = beforeAfterChartSvg(plotted, node.clientWidth);
  const footnote = document.getElementById('outcome-chart-footnote');
  if (footnote) { footnote.classList.add('chart-footnote'); footnote.innerHTML = outcomeFootnote(rows); }
  const dots = document.getElementById('outcome-program-dots');
  if (dots && outcomeTab === 'category') dots.innerHTML = rows.map((row) => '<i class="' + (row.change < 0 ? 'is-improved' : row.change > 0 ? 'is-worse' : 'is-flat') + '" title="' + escapeHtml(row.label + ' ' + movementCopy(row.change)) + '"></i>').join('');
  document.querySelectorAll('[data-outcome-sort]').forEach((button) => {
    const active = button.dataset.outcomeSort === outcomeSort;
    button.classList.toggle('is-active', active);
    button.setAttribute('aria-checked', String(active));
    button.tabIndex = active ? 0 : -1;
  });
  const lensLabel = { category: 'by program', cohort: 'by group', driver: 'by driver' }[outcomeTab] || 'by program';
  const windowLabel = outcomeTab === 'driver' ? 'Matched before/after observations · dates unavailable' : outcomeTab === 'cohort' ? 'Jul 13 versus Aug 31' : outcomeWindowLabel();
  const caption = node.parentElement.querySelector('.ba-caption');
  const chartTitle = document.getElementById('outcome-chart-title');
  if (chartTitle) chartTitle.classList.add('chart-title');
  const chartContext = document.getElementById('outcome-unit');
  if (chartContext) { chartContext.classList.add('chart-context'); chartContext.textContent = 'Recorded observations ' + lensLabel + ' · ' + windowLabel + ' · events per 1,000 trips · lower is safer'; }
  if (caption) caption.innerHTML = '<div class="ba-legend chart-legend">' + chartLegendMarkup([{ tone: 'baseline', label: 'Before' }, { tone: 'primary', label: 'After' }]) + '</div>';
  const text = 'Events per 1,000 trips ' + lensLabel + ': ' + rows.map((row) => row.label + ' Before ' + chartRate(row.before) + ', After ' + chartRate(row.after) + ' (' + chartChangeLabel(row) + ')').join('; ') + '. Lower is safer. ' + (rows.length > 4 ? 'The chart shows the first four records in the selected sort order; this table includes all ' + rows.length + '.' : '');
  const summary = document.getElementById('outcome-chart-summary');
  if (summary) summary.textContent = text;
  chartMountSummary(node.parentElement, text, chartTableMarkup('Before and after event rates ' + lensLabel, ['Record', 'Before / 1,000 trips', 'After / 1,000 trips', 'Change'], rows.map(row => [row.label + (row.meta ? ' · ' + row.meta : ''), chartRate(row.before), chartRate(row.after), chartChangeLabel(row) + (row.before === 0 && row.after > 0 ? '; percentage change unavailable' : '')])), (rows.length > 4 ? 'Showing 4 of ' + rows.length + ' records; all records are in Summary and data. ' : '') + 'Source: prototype event-rate observations. Window-level trip exposure, driver counts, update time, and exclusions are not recorded. Differences are observational.');
  const visibleSummary = node.parentElement.querySelector('.chart-summary p');
  if (visibleSummary) visibleSummary.id = 'outcome-chart-summary-text';
}

// Each week: identified = automated (in progress) + one-on-one (in progress) + needs review + completed.
// The current week is overwritten from the session ledger in syncFleetSessionCounts.
const weeklyCoachingActivity = [
  { label: 'Jul 13', identified: 118, automated: 5, oneToOne: 1, completed: 100, escalated: 12 },
  { label: 'Jul 20', identified: 121, automated: 6, oneToOne: 1, completed: 102, escalated: 12 },
  { label: 'Jul 27', identified: 124, automated: 5, oneToOne: 1, completed: 105, escalated: 13 },
  { label: 'Aug 3', identified: 133, automated: 7, oneToOne: 1, completed: 111, escalated: 14 },
  { label: 'Aug 10', identified: 139, automated: 6, oneToOne: 1, completed: 119, escalated: 13 },
  { label: 'Aug 17', identified: 136, automated: 5, oneToOne: 1, completed: 117, escalated: 13 },
  { label: 'Aug 24', identified: 151, automated: 8, oneToOne: 1, completed: 127, escalated: 15 },
  { label: 'Aug 31', identified: 154, automated: 8, oneToOne: 2, completed: 130, escalated: 14 }
].map((week, index) => ({ ...week, inProgress: week.automated + week.oneToOne, score: [70, 70, 71, 71, 72, 72, 73, 74][index] }));


function pointsPath(values, width, height, left, right, top, bottom, min, max) {
  const plotWidth = width - left - right;
  const plotHeight = height - top - bottom;
  return values.map((value, index) => {
    const x = left + index / Math.max(1, values.length - 1) * plotWidth;
    const y = top + (max - value) / Math.max(1, max - min) * plotHeight;
    return { x, y, value };
  });
}

function linePath(points) {
  return points.map((point, index) => (index ? 'L' : 'M') + point.x.toFixed(1) + ' ' + point.y.toFixed(1)).join(' ');
}

function coachingActivityChartSvg(availableWidth, availableHeight) {
  return chartWeeklyActivitySvg(weeklyCoachingActivity, availableWidth, availableHeight);
}

function categoryWeeklyChartSvg(category) {
  return chartCategoryWeekly(category);
}

function renderCoachingActivityChart() {
  const node = document.getElementById('coaching-activity-chart');
  if (!node) return;
  const card = node.closest('.analytics-chart-card');
  node.classList.add('chart-plot');
  node.setAttribute('tabindex', '0');
  node.setAttribute('role', 'region');
  node.setAttribute('aria-label', 'Weekly coaching activity and Elevate score chart');
  node.innerHTML = coachingActivityChartSvg(node.clientWidth, 300);
  const context = card.querySelector('header span');
  if (context) { context.classList.add('chart-context'); context.textContent = 'In-progress sessions · weekly snapshots Jul 13–Aug 31'; }
  card.querySelector('h2')?.classList.add('chart-title');
  const legend = card.querySelector('.activity-legend');
  if (legend) {
    legend.classList.add('chart-legend');
    legend.innerHTML = chartLegendMarkup([{ tone: 'primary', label: 'Automated · left axis' }, { tone: 'secondary', label: 'One-on-one · left axis' }, { kind: 'score', label: 'Elevate score / 100 · right axis' }]);
  }
  const latest = weeklyCoachingActivity.at(-1);
  const summary = 'For the week of ' + latest.label + ', ' + latest.automated + ' automated and ' + latest.oneToOne + ' one-on-one sessions were in progress. Fleet Elevate score was ' + latest.score + ' out of 100. These are separate measures; co-movement does not establish cause.';
  const summaryNode = document.getElementById('activity-chart-summary');
  if (summaryNode) summaryNode.textContent = summary;
  chartMountSummary(card, summary, chartWeeklyData(weeklyCoachingActivity), 'Source: prototype weekly snapshots; current cycle reconciles to the session ledger. Completed and review states are excluded from the bars and retained in the data table. Score sample size and update time are unavailable.');
}
function renderAnalytics() {
  if (analyticsTab === 'drivers') { setView('drivers'); return; }
  if (analyticsTab === 'groups') { setView('groups'); return; }
  programTab = 'activity';
  setView('programs');
}

function quickTrainingBlock(category) {
  const scope = getCoachingScope(category);
  if (!scope.lessonAssigned) return '';
  const normalizedSearch = trainingSearch.trim().toLowerCase();
  const visibleCases = normalizedSearch
    ? scope.quickCases.slice(0, scope.lessonAssigned).filter((item) => [item.name, item.group, item.reason].join(' ').toLowerCase().includes(normalizedSearch))
    : scope.quickCases.slice(0, scope.lessonAssigned);
  const driverList = trainingExpanded ? [
    '<div class="selection-toolbar"><label class="search-control"><span class="sr-only">Search coached drivers</span><input type="search" data-training-search value="' + escapeHtml(trainingSearch) + '" placeholder="Search coached drivers"></label><span data-training-results>' + visibleCases.length + ' shown</span></div>',
    '<div class="training-driver-list">',
    visibleCases.map((item) => [
      '<div class="training-driver-row">',
        '<span class="person-copy"><strong>' + item.name + '</strong><small>' + item.group + '</small></span>',
        '<span class="case-reason">' + category.name + ' · ' + item.reason + '</span>',
        '<span class="automation-status">Assigned automatically</span>',
        '<span class="row-actions"><button type="button" data-open-driver="' + item.id + '" data-case-kind="quick">Review</button></span>',
      '</div>'
    ].join('')).join('') || '<div class="empty-state">No matching drivers.</div>',
    '</div>'
  ].join('') : '';
  return [
    '<section class="quick-training-card">',
      '<div class="quick-training-top">',
        '<div class="quick-training-title"><div><h3>Automated lesson <b>' + scope.lessonAssigned + '</b></h3><p>' + category.training + ' · video · acknowledgement · quiz</p></div></div>',
        '<div class="quick-actions">',
          '<span class="automation-complete-status"><i>✓</i> Assigned Monday</span>',
          '<button class="secondary-button" type="button" data-toggle-training>' + (trainingExpanded ? 'Hide drivers' : 'View drivers') + '</button>',
        '</div>',
      '</div>',
      '<div class="automation-result-row"><span><strong>' + scope.lessonAssigned + '</strong> assigned automatically</span><span><strong>' + scope.completed + '</strong> coaching assignments completed across this program</span></div>',
      driverList,
    '</section>'
  ].join('');
}

function directedBlock(category) {
  const scope = getCoachingScope(category);
  if (!scope.attention) return scope.coached
    ? '<div class="empty-state compact"><strong>No unresolved attention</strong><span>All attention items in this program are now closed or back in the automated flow.</span></div>'
    : '<div class="empty-state compact"><strong>No coaching triggered</strong><span>No driver matched this program in the current cycle.</span></div>';
  const cases = attentionAiInsights
    .filter((insight) => insight.categoryId === category.id && !resolvedAttentionIds.has(insight.id))
    .map((insight) => {
      const item = category[insight.caseKind + 'Cases'].find((candidate) => candidate.id === insight.caseId);
      return item ? { item, insight } : null;
    })
    .filter(Boolean);
  if (!cases.length) return '<div class="empty-state compact"><strong>No attention needed</strong><span>Every outlier in this program has been reviewed.</span></div>';
  return [
    '<section class="directed-section attention-section">',
      '<header><div><h3>Needs review <b>' + scope.attention + '</b></h3><p>Only drivers automation could not resolve.</p></div></header>',
      '<div class="directed-columns"><span>Driver</span><span>Why</span><span>Evidence</span><span></span></div>',
      cases.map(({ item, insight }) => [
        '<div class="directed-row">',
          '<span class="person-copy"><strong>' + item.name + '</strong><small>' + item.group + '</small></span>',
          '<span class="case-reason"><strong>' + escapeHtml(insight.criterion) + '</strong><small>' + category.name + ' · ' + item.reason + '</small></span>',
          '<span class="evidence-count">' + (item.clips ? item.clips + ' clip' : 'Pattern') + '</span>',
          '<span class="row-actions"><button class="coach" type="button" data-open-driver="' + item.id + '" data-case-kind="' + insight.caseKind + '" data-attention-insight="' + insight.id + '">Review</button></span>',
        '</div>'
      ].join('')).join(''),
    '</section>'
  ].join('');
}

function progressBlock(category, type) {
  const stageTotal = type === 'active'
    ? category.active
    : type === 'completed'
      ? category.completed
      : Math.round(category.completed * .57);
  if (!stageTotal) return '<div class="empty-state">No drivers in this stage.</div>';
  const count = Math.min(stageTotal, 8);
  const cases = makeCases(category.id, count, category.id + '-' + type, type === 'active' ? 3 : type === 'completed' ? 12 : 20);
  cases.forEach((item) => progressCaseStore.set(item.id, item));
  const states = type === 'active'
    ? ['Video viewed · quiz pending', 'Awaiting acknowledgement', 'Driver replied · attention needed', 'Automatic reminder scheduled']
    : type === 'completed'
      ? ['Video viewed · quiz 4/5 · acknowledged', 'Action agreed · follow-up closed', 'Lesson completed · 88%', 'Session completed']
      : ['Improved · −31%', 'Awaiting enough trip exposure', 'Unchanged · review approach', 'Outcome window closes in 6 days'];
  return [
    '<div class="directed-section">',
      cases.map((item, index) => [
        '<div class="progress-row">',
          '<span class="person-copy"><strong>' + item.name + '</strong><small>' + item.group + '</small></span>',
          '<span class="case-reason">' + (type === 'outcomes' ? 'Before ' + (3.2 + index * .2).toFixed(1) + ' → After ' + (2.2 + index * .15).toFixed(1) + ' events / 1k trips' : states[index % states.length]) + '</span>',
          '<span class="state-pill ' + (type === 'completed' || (type === 'outcomes' && index % 3 === 0) ? 'complete' : '') + '">' + (type === 'active' ? 'In progress' : type === 'completed' ? 'Completed' : index % 3 === 0 ? 'Improved' : 'Pending') + '</span>',
          '<span class="row-actions"><button type="button" data-open-driver="' + item.id + '" data-case-kind="' + type + '">Open</button></span>',
        '</div>'
      ].join('')).join(''),
    '</div>'
  ].join('');
}

function outcomesBlock(category) {
  const outcome = outcomeFor(category);
  const completionCounts = coachingCounts((session) => session.categoryId === category.id);
  const currentCompletion = completionCounts.total ? Math.round(completionCounts.completed / completionCounts.total * 100) : 0;
  return [
    '<section class="category-outcomes">',
      '<div class="outcome-result">',
        '<div><span>Event rate</span><strong>' + outcome.before.toFixed(1) + ' <i>→</i> ' + outcome.after.toFixed(1) + '</strong><small>per 1,000 trips</small></div>',
        '<b class="' + (outcome.change < 0 ? 'positive' : 'negative') + '">' + (outcome.change > 0 ? '+' : '') + outcome.change + '%</b>',
        '<em class="outcome-pill ' + (outcome.label === 'Improved' ? 'improved' : 'neutral') + '">' + outcome.label + '</em>',
      '</div>',
      '<div class="outcome-compact-metrics"><div><strong>' + currentCompletion + '%</strong><span>Completed</span></div><div><strong>' + outcome.eligible + '</strong><span>Measured</span></div><div><strong>' + outcome.improved + '%</strong><span>Improved</span></div><div><strong>' + outcome.repeated + '</strong><span>Repeated</span></div></div>',
    '</section>'
  ].join('');
}

function periodOptions() {
  return [[1, 'This week'], [4, 'Last 4 weeks'], [8, 'Last 8 weeks']].map(([weeks, label]) => '<option value="' + weeks + '"' + (weeks === coachingPeriod ? ' selected' : '') + '>' + label + '</option>').join('');
}

function workflowTabButton(tab, label, count) {
  const active = workflowTab === tab;
  return '<button class="' + (active ? 'is-active' : '') + '" type="button" role="tab" data-workflow-tab="' + tab + '" aria-selected="' + active + '" tabindex="' + (active ? '0' : '-1') + '">' + label + ' ' + count + '</button>';
}

// The drawer lists the same session records the table counted, grouped by the same words.
function drawerSessionRows(list, tab) {
  if (!list.length) return '<div class="empty-state compact"><strong>No sessions in this view.</strong><span>Change the period to widen the view.</span></div>';
  const rows = list.map(session => {
    const [, state] = compactSessionStatus(session);
    return '<tr><td><button class="text-link" type="button" ' + (session.candidate ? 'data-start-session-for="' + session.id + '"' : 'data-open-session="' + session.id + '"') + ' aria-haspopup="dialog">' + escapeHtml(session.person) + '</button>' + sessionClipBadge(session) + '</td><td>' + uiStatus(state) + '</td><td>' + escapeHtml(coachLabel(session)) + '</td><td>' + escapeHtml(sessionStartedLabel(session)) + '</td><td>' + escapeHtml(sessionCompletedLabel(session)) + '</td><td>' + escapeHtml(sessionDueLabel(session)) + '</td></tr>';
  }).join('');
  return uiTable(list.some(session => session.candidate) ? 'Program coaching records' : 'Program coaching sessions', ['Driver', 'State', 'Coach', 'Started', 'Completed', 'Due'], rows);
}

function workflowBody(category) {
  if (workflowTab === 'outcomes') return outcomesBlock(category);
  if (!['needs', 'automated', 'one_to_one', 'completed'].includes(workflowTab)) workflowTab = 'needs';
  const list = sessionsInPeriod((session) => session.categoryId === category.id && sessionTab(session) === workflowTab)
    .sort((a, b) => sessionWeeksAgo(a) - sessionWeeksAgo(b));
  return drawerSessionRows(list, workflowTab);
}

function categoryCoachRecommendation(category) {
  const reviewCount = coachingCounts((session) => session.categoryId === category.id).needs_review;
  const lesson = category.training.split(' · ')[0];
  const movement = category.eventChange > 0
    ? 'Events up ' + category.eventChange + '%'
    : category.eventChange < 0
      ? 'Events down ' + Math.abs(category.eventChange) + '%'
      : 'Events steady';
  const counts = coachingCounts((session) => session.categoryId === category.id);
  const recommendation = counts.total
    ? 'Automation opened ' + counts.total + ' coaching ' + (counts.total === 1 ? 'record' : 'records') + ' this cycle with ' + lesson + ': ' + counts.completed + ' completed, ' + counts.automated + ' automated and ' + counts.one_to_one + ' one-on-one in progress, ' + counts.needs_review + ' need review.'
    : 'No coaching was triggered for this program in the current cycle.';
  const signals = [
    movement,
    category.repeats ? category.repeats + ' repeated after coaching' : null,
    category.clips ? category.clips + ' clips available' : null
  ].filter(Boolean).join(' · ');
  return [
    '<section class="category-coach-recommendation">',
      '<div class="category-recommendation-copy">',
        '<div class="category-recommendation-label"><span>Weekly automation result</span><i>Automated</i></div>',
        '<h2>' + recommendation + '</h2>',
        '<p>' + signals + '</p>',
      '</div>',
      (reviewCount ? '<button class="secondary-button" type="button" data-workflow-tab="needs">Review ' + reviewCount + (reviewCount === 1 ? ' session' : ' sessions') + '</button>' : '<span class="automation-complete-status"><i>✓</i> No attention needed</span>'),
    '</section>'
  ].join('');
}

function renderCategory() {
  if (!activeCategory) return;
  openProgramPage(activeCategory.id);
}

function rerenderCategoryPreservingScroll(focusSelector) {
  const currentPanel = categoryDrawer.querySelector('.category-panel-scroll');
  const scrollTop = currentPanel ? currentPanel.scrollTop : 0;
  renderCategory();
  const nextPanel = categoryDrawer.querySelector('.category-panel-scroll');
  if (nextPanel) nextPanel.scrollTop = scrollTop;
  if (focusSelector) {
    const control = categoryDrawer.querySelector(focusSelector);
    control?.focus?.();
    control?.setSelectionRange?.(control.value.length, control.value.length);
  }
}

function findCategoryCase(caseId, kind) {
  if (!activeCategory) return null;
  const scope = getCoachingScope(activeCategory);
  if (kind === 'quick') return scope.quickCases.find((item) => item.id === caseId);
  if (kind === 'directed') return scope.directedCases.find((item) => item.id === caseId);
  return progressCaseStore.get(caseId) || null;
}

function openDriverDrawer(caseId, kind) {
  const item = findCategoryCase(caseId, kind);
  if (!item || !activeCategory) return;
  sessionDraft = null;
  categoryDrawer.classList.remove('is-composer');
  const category = activeCategory;
  const progressStage = ['active', 'completed', 'outcomes'].includes(kind) ? kind : null;
  const attentionInsight = progressStage ? null : attentionAiInsights.find((insight) => insight.categoryId === category.id && insight.caseId === item.id && !resolvedAttentionIds.has(insight.id));
  const needsAttention = Boolean(attentionInsight);
  const matchingSession = needsAttention
    ? sessions.find((session) => session.person === item.name && session.categoryId === category.id && isAttentionSessionState(session.state))
    : null;
  const stateLabel = progressStage === 'active' ? 'Automated' : progressStage === 'completed' ? 'Completed' : progressStage === 'outcomes' ? 'Completed' : needsAttention ? 'Needs review' : 'Automated';
  const eventName = category.name;
  const knownProfile = directory.find((profile) => profile.name === item.name);
  const driverIndex = Math.max(0, driverNames.indexOf(item.name));
  const safetyScore = knownProfile && Number.isFinite(knownProfile.safetyScore) ? knownProfile.safetyScore : knownProfile ? null : 57 + ((driverIndex * 7 + item.events) % 31);
  const scoreChange = knownProfile && Number.isFinite(knownProfile.scoreChange) ? knownProfile.scoreChange : knownProfile ? null : ((driverIndex % 7) - 4);
  const scoreMovement = !Number.isFinite(scoreChange) ? 'pending more exposure' : scoreChange === 0 ? 'unchanged' : (scoreChange > 0 ? 'up ' : 'down ') + Math.abs(scoreChange);
  const automationRoute = progressStage === 'active'
    ? 'Automated session active'
    : progressStage === 'completed'
      ? 'Completion recorded'
      : progressStage === 'outcomes'
        ? 'Completed'
        : needsAttention
          ? 'Needs review'
          : 'Automated';
  const attentionGuidance = !attentionInsight
    ? ''
    : attentionInsight.reason === 'reminders_exhausted'
        ? 'Automatic reminders did not produce a response. Contact the driver or start a manual follow-up.'
        : attentionInsight.reason === 'driver_reply'
          ? 'Review the driver response and agree on one behavior change.'
          : 'Review the repeated behavior and decide whether a manual conversation is needed.';
  const briefReason = item.events + ' events across ' + item.trips + ' trips. ' + (Number.isFinite(safetyScore) ? 'Elevate score ' + safetyScore + ', ' + scoreMovement + '.' : 'Elevate score pending more exposure.') + ' ' + (attentionInsight ? attentionInsight.insight : item.prior === 'No recent coaching' ? 'No recent coaching is on record.' : 'The pattern continued after earlier coaching.');
  const nextStep = progressStage === 'active'
    ? 'No action required. Automation will remind the driver and surface a failure here.'
    : progressStage === 'completed'
      ? 'No action required. The system is measuring the next outcome window.'
      : progressStage === 'outcomes'
        ? 'Review the measured outcome only if the behavior has not improved.'
        : needsAttention
          ? attentionGuidance
          : 'No action required. The lesson, acknowledgement, and quiz were assigned automatically.';
  const actions = progressStage === 'active'
    ? '<button class="primary-button" type="button" data-toast="Assignment activity opened">View activity</button>'
    : progressStage === 'completed'
      ? '<button class="primary-button" type="button" data-toast="Completion receipt opened">View completion</button><button class="secondary-button" type="button" data-toast="Outcome window opened">View outcome window</button>'
      : progressStage === 'outcomes'
        ? '<button class="primary-button" type="button" data-toast="Matched outcome opened">Review outcome</button>'
        : needsAttention
          ? (matchingSession ? '<button class="primary-button" type="button" data-open-attention-session="' + matchingSession.id + '">' + escapeHtml(attentionInsight.recommendedAction) + '</button>' : '<button class="primary-button" type="button" data-start-session="' + item.id + '">' + escapeHtml(attentionInsight.recommendedAction) + '</button>') + '<button class="secondary-button" type="button" data-start-session="' + item.id + '">Start one-on-one coaching</button>'
          : '<button class="primary-button" type="button" data-toast="Assignment activity opened">View activity</button>';
  categoryContent.innerHTML = [
    '<header class="category-panel-header nested-detail-header"><div><button class="scope-link" type="button" data-back-category>← ' + category.name + '</button><div class="panel-title-line"><h1 id="category-title">' + item.name + '</h1></div></div><button class="icon-button" type="button" data-close-category aria-label="Close program">×</button></header>',
    '<div class="category-panel-scroll driver-case-detail">',
      '<div class="case-status-line"><span>' + stateLabel + '</span><strong>' + item.group + '</strong></div>',
      '<section class="case-section coach-brief"><div class="coach-brief-heading"><h2>Automation summary</h2><span>Explainable</span></div><p>' + briefReason + '</p><div class="coach-brief-route"><span>Current route</span><strong>' + automationRoute + '</strong></div></section>',
      '<section class="case-section"><h2>Program evidence</h2><p><strong>' + eventName + '</strong> · ' + item.reason + '</p><div class="case-facts"><div><strong>' + item.events + '</strong><span>Events</span></div><div><strong>' + item.trips + '</strong><span>Trips</span></div><div><strong>' + item.clips + '</strong><span>Clips</span></div></div></section>',
      '<section class="case-section"><h2>Evidence</h2><button class="evidence-card" type="button" data-toast="Evidence preview opened"><span class="evidence-thumb">' + (item.clips ? '▶ 0:18' : 'Pattern') + '</span><div><strong>' + eventName + '</strong><small>' + (item.clips ? item.clips + ' event clip · current 14-day window' : item.events + ' events across ' + item.trips + ' trips') + '</small></div><span>Open</span></button></section>',
      '<section class="case-section two-column"><div><h2>Previous coaching</h2><p>' + item.prior + '</p></div><div><h2>Manager guidance</h2><p>' + nextStep + '</p></div></section>',
      '<div class="drawer-actions">' + actions + '</div>',
    '</div>'
  ].join('');
  categoryDrawer.scrollTop = 0;
}

function closeDrawer(restoreFocus = true) {
  saveSessionWorkspaceDraft();
  document.getElementById('session-event-browser')?.close();
  document.getElementById('session-details')?.close();
  const closingSession = driverDrawer.classList.contains('is-session');
  const closingProfile = Boolean(activeDriverProfile);
  const closingDriverName = activeDriverProfile;
  const closingOrigin = sessionDrawerOrigin;
  const returnToProgram = categoryDrawer.open && Boolean(activeCategory);
  const quickInvoker = returnToProgram ? { record: drawerOpener?.dataset.openSession, column: drawerOpener?.closest('td')?.cellIndex, scrollTop: categoryDrawer.querySelector('.category-panel-scroll')?.scrollTop || 0 } : null;
  const programInvoker = currentView === 'programs' && drawerOpener ? { session: drawerOpener.dataset.openSession, driver: drawerOpener.dataset.openDriverProfile, record: drawerOpener.closest('[data-program-record]')?.dataset.programRecord } : null;
  const programScrollTop = currentView === 'programs' ? window.scrollY : null;
  activeDriverProfile = null;
  driverDrawer.classList.remove('is-open', 'is-profile', 'is-session');
  driverDrawer.close();
  driverDrawer.setAttribute('aria-hidden', 'true');
  driverDrawer.inert = true;
  if (categoryDrawer.open) categoryDrawer.inert = false;
  document.getElementById('app-shell').inert = categoryDrawer.open;
  document.body.style.overflow = categoryDrawer.open ? 'hidden' : '';
  if (closingSession) {
    activeSessionId = null;
    sessionDrawerOrigin = null;
  }
  if (restoreFocus && (closingSession || closingProfile)) updateUrlState();
  if (returnToProgram && restoreFocus) {
    categoryDrawer.inert = false;
    renderCategory();
    const panel = categoryDrawer.querySelector('.category-panel-scroll');
    if (panel) panel.scrollTop = quickInvoker.scrollTop;
  } else if (currentView === 'programs' && restoreFocus) renderProgramsPage();
  setTimeout(() => {
    if (driverDrawer.classList.contains('is-open')) return;
    drawerBackdrop.hidden = true;
    if (!restoreFocus) return;
    if (returnToProgram && categoryDrawer.open) {
      const panel = categoryDrawer.querySelector('.category-panel-scroll');
      if (panel) panel.scrollTop = quickInvoker.scrollTop;
      const invoker = Array.from(categoryDrawer.querySelectorAll('[data-open-session]')).find(node => node.dataset.openSession === quickInvoker.record && node.closest('td')?.cellIndex === quickInvoker.column);
      (invoker || categoryDrawer.querySelector('[data-workflow-tab="' + workflowTab + '"]'))?.focus({ preventScroll: true });
      return;
    }
    if (currentView === 'programs') {
      if (programScrollTop !== null) window.scrollTo({ top: programScrollTop, behavior: 'instant' });
      const restoredInvoker = Array.from(document.querySelectorAll('#view-programs [data-open-session], #view-programs [data-open-driver-profile]')).find(node => (!programInvoker?.record || node.closest('[data-program-record]')?.dataset.programRecord === programInvoker.record) && ((programInvoker?.session && node.dataset.openSession === programInvoker.session) || (programInvoker?.driver && node.dataset.openDriverProfile === programInvoker.driver)));
      (restoredInvoker || document.getElementById('program-record-view') || document.getElementById('program-page-select'))?.focus({ preventScroll: true });
      return;
    }
    if (closingOrigin?.type === 'automation-centre') document.getElementById('ai-priority-review')?.focus();
    else if (closingOrigin?.type === 'global-search') document.getElementById('global-search-trigger')?.focus();
    else if (drawerOpener && document.contains(drawerOpener)) drawerOpener.focus();
    else if (closingDriverName) Array.from(document.querySelectorAll('.directory-person[data-open-driver-profile]')).find(button => button.dataset.openDriverProfile === closingDriverName)?.focus();
    else document.getElementById('inbox-title')?.focus();
  }, 220);
}

function openManualSessionDialog(prefill = null) {
  return openManualCoaching(prefill);
}

function openTrainingDialog() {
  openManualSessionDialog();
}

function createManualSession() {
  return createManualCoaching();
}

function sessionEvidenceOptions(item, category) {
  const triggerName = item.eventTypeName || category.name;
  const vehicle = 'Unit ' + (415 - (driverNames.indexOf(item.name) % 7)) + '-0' + (3714 + Math.max(0, driverNames.indexOf(item.name)) * 3);
  return {
    driver: [
      { id: item.id + '-driver-1', title: triggerName, source: item.clips ? 'Lytx' : 'Geotab', date: 'Sep 4 · 9:42 AM', location: 'Hwy 401 near Milton', vehicle, severity: 'High', duration: item.clips ? '0:18' : item.trips + ' trips', video: Boolean(item.clips), trigger: true },
      { id: item.id + '-driver-2', title: category.name, source: 'Lytx', date: 'Sep 3 · 4:18 PM', location: 'QEW near Oakville', vehicle, severity: 'Medium', duration: '0:12', video: true },
      { id: item.id + '-driver-3', title: 'Harsh braking', source: 'Geotab', date: 'Sep 1 · 10:21 AM', location: 'Dixie Rd at Courtneypark', vehicle, severity: 'Medium', duration: 'Event', video: false },
      { id: item.id + '-driver-4', title: 'Speeding', source: 'Geotab', date: 'Aug 30 · 2:05 PM', location: 'Hwy 407 near Vaughan', vehicle, severity: 'High', duration: '86 km/h', video: false }
    ],
    unassigned: [
      { id: item.id + '-unassigned-1', title: category.name, source: 'Lytx', date: 'Sep 4 · 8:57 AM', location: 'Hwy 401 near Milton', vehicle: 'Unit 415-03714', severity: 'High', duration: '0:16', video: true },
      { id: item.id + '-unassigned-2', title: 'Distracted driving', source: 'Lytx', date: 'Sep 4 · 7:32 AM', location: 'Airport Rd near Derry', vehicle: 'Unit 412-08421', severity: 'Medium', duration: '0:14', video: true },
      { id: item.id + '-unassigned-3', title: 'Following distance', source: 'Lytx', date: 'Sep 3 · 10:30 PM', location: 'QEW near Oakville', vehicle: 'Unit 415-03714', severity: 'Low', duration: '0:18', video: true },
      { id: item.id + '-unassigned-4', title: 'Traffic control', source: 'Lytx', date: 'Sep 3 · 6:12 PM', location: 'Steeles Ave at Keele', vehicle: 'Unit 404-56145', severity: 'High', duration: '0:11', video: true },
      { id: item.id + '-unassigned-5', title: 'Driver fatigue', source: 'Lytx', date: 'Sep 2 · 11:48 PM', location: 'Hwy 400 northbound', vehicle: 'Unit 414-33437', severity: 'High', duration: '0:20', video: true },
      { id: item.id + '-unassigned-6', title: 'Harsh cornering', source: 'Lytx', date: 'Sep 2 · 3:36 PM', location: 'Bramalea Rd at Clark', vehicle: 'Unit 408-77109', severity: 'Medium', duration: '0:13', video: true }
    ]
  };
}

function beginSessionDraft(item) {
  const firstName = item.name.split(' ')[0];
  const caseKind = activeCategory.directedCases.some((entry) => entry.id === item.id) ? 'directed' : 'quick';
  const options = sessionEvidenceOptions(item, activeCategory);
  sessionDraft = {
    caseId: item.id,
    caseKind,
    categoryId: activeCategory.id,
    evidenceTab: 'driver',
    previewEvidenceId: null,
    selectedEvidence: new Set([options.driver[0].id]),
    options,
    method: 'app',
    title: activeCategory.name + ' manual follow-up · Sep 4',
    goal: 'Reduce ' + activeCategory.name.toLowerCase() + ' events over the next 14 days',
    message: 'Hi ' + firstName + ', please review the attached ' + activeCategory.name.toLowerCase() + ' evidence and share what was happening. What can you do differently on your next shift?',
    requireResponse: true,
    includeLesson: false,
    trackOutcome: true
  };
}

function allDraftEvidence() {
  if (!sessionDraft) return [];
  return sessionDraft.options.driver.concat(sessionDraft.options.unassigned);
}

function selectedDraftEvidence() {
  if (!sessionDraft) return [];
  return allDraftEvidence().filter((item) => sessionDraft.selectedEvidence.has(item.id));
}

function selectedEvidenceCard(item) {
  return [
    '<article class="draft-selected-card">',
      '<button class="draft-evidence-preview ' + (item.video ? 'video' : 'data') + '" type="button" data-preview-evidence="' + item.id + '" aria-label="Open ' + escapeHtml(item.title) + '">' + (item.video ? '▶<small>' + item.duration + '</small>' : '<strong>DATA</strong>') + '</button>',
      '<div><span><strong>' + escapeHtml(item.title) + '</strong>' + (item.trigger ? '<i>Trigger</i>' : '<i>Added</i>') + '</span><small>' + escapeHtml(item.source + ' · ' + item.date + ' · ' + item.location + ' · ' + item.vehicle) + '</small></div>',
      '<button class="draft-remove" type="button" data-remove-evidence="' + item.id + '" aria-label="Remove ' + escapeHtml(item.title) + '">×</button>',
    '</article>'
  ].join('');
}

function evidencePickerRow(item) {
  const selected = sessionDraft.selectedEvidence.has(item.id);
  return [
    '<div class="draft-evidence-row' + (selected ? ' is-selected' : '') + '">',
      '<input type="checkbox" data-draft-evidence="' + item.id + '" ' + (selected ? 'checked' : '') + ' aria-label="Attach ' + escapeHtml(item.title) + '">',
      '<button class="evidence-row-preview ' + (item.video ? 'video' : 'data') + '" type="button" data-preview-evidence="' + item.id + '" aria-label="Preview ' + escapeHtml(item.title) + '">' + (item.video ? '▶' : '◆') + '</button>',
      '<span class="evidence-row-main"><strong>' + escapeHtml(item.title) + '</strong><small>' + escapeHtml(item.source + ' · ' + item.date + ' · ' + item.location) + '</small></span>',
      '<span class="evidence-row-vehicle">' + escapeHtml(item.vehicle) + '</span>',
      '<span class="evidence-row-severity ' + item.severity.toLowerCase() + '">' + item.severity + '</span>',
      '<span class="evidence-row-duration">' + escapeHtml(item.duration) + '</span>',
    '</div>'
  ].join('');
}

function inlineDraftEvidencePreview(item) {
  if (!item) return '';
  return [
    '<div class="draft-inline-preview">',
      '<div class="draft-preview-stage ' + (item.video ? 'video' : 'data') + '">',
        (item.video
          ? '<button type="button" data-toast="Clip playback toggled" aria-label="Play clip">▶</button><div class="draft-video-progress"><i></i></div><small>' + escapeHtml(item.duration) + '</small>'
          : '<span><strong>' + escapeHtml(item.duration) + '</strong><small>Telematics event</small></span>'),
      '</div>',
      '<div class="draft-preview-copy"><span><i>' + escapeHtml(item.source) + '</i><b>' + escapeHtml(item.severity) + '</b></span><h3>' + escapeHtml(item.title) + '</h3><p>' + escapeHtml(item.date + ' · ' + item.location + ' · ' + item.vehicle) + '</p><small>' + (item.video ? 'Review the clip before sharing it with the driver.' : 'This event will be shared as event data without footage.') + '</small></div>',
      '<button class="draft-preview-close" type="button" data-close-evidence-preview aria-label="Close evidence preview">×</button>',
    '</div>'
  ].join('');
}

function renderSessionComposer() {
  if (!sessionDraft || !activeCategory) return;
  const item = activeCategory.directedCases.concat(activeCategory.quickCases).find((entry) => entry.id === sessionDraft.caseId);
  if (!item) return;
  const selected = selectedDraftEvidence();
  const available = sessionDraft.options[sessionDraft.evidenceTab];
  const previewEvidence = allDraftEvidence().find((evidence) => evidence.id === sessionDraft.previewEvidenceId);
  const knownProfile = directory.find((profile) => profile.name === item.name);
  const safetyScore = knownProfile && Number.isFinite(knownProfile.safetyScore) ? knownProfile.safetyScore : '—';
  categoryDrawer.classList.add('is-composer');
  categoryContent.innerHTML = [
    '<header class="category-panel-header session-composer-header">',
      '<div><button class="scope-link" type="button" data-back-driver-case>← ' + escapeHtml(item.name) + '</button><div class="panel-title-line"><h1 id="category-title">Start one-on-one coaching</h1><span class="draft-state">One-on-one</span></div></div>',
      '<button class="icon-button" type="button" data-close-category aria-label="Close coaching composer">×</button>',
    '</header>',
    '<div class="session-composer-layout">',
      '<main class="session-composer-scroll">',
        '<section class="draft-driver-context">',
          '<span class="person-avatar">' + item.initials + '</span>',
          '<div><strong>' + escapeHtml(item.name) + '</strong><small>' + escapeHtml(item.group) + '</small></div>',
          '<span><small>Program</small><strong>' + escapeHtml(activeCategory.name) + '</strong></span>',
        '</section>',
        uiKpiStrip('Draft coaching evidence', [{ label: 'Elevate score', value: safetyScore, context: safetyScore === '—' ? 'Score unavailable' : 'Latest recorded · 0–100' }, { label: 'Events', value: item.events, context: 'Across ' + item.trips + ' trips' }, { label: 'Selected evidence', value: selected.length, context: 'Shared when this session is sent' }]),
        '<section class="session-draft-section selected-evidence-section">',
          '<header><div><span class="section-kicker">Evidence to send</span><h2>Attached events <b>' + selected.length + '</b></h2></div><span>Visible to the driver</span></header>',
          inlineDraftEvidencePreview(previewEvidence),
          '<div class="draft-selected-list">' + (selected.length ? selected.map(selectedEvidenceCard).join('') : '<div class="draft-empty-evidence">No evidence attached</div>') + '</div>',
        '</section>',
        '<section class="session-draft-section evidence-picker-section">',
          '<header><div><span class="section-kicker">Add evidence</span><h2>Related events and clips</h2></div><select aria-label="Evidence date range"><option>Last 14 days</option><option>Current week</option><option>Last 30 days</option></select></header>',
          '<div class="draft-evidence-tabs" role="group" aria-label="Evidence source">',
            '<button class="' + (sessionDraft.evidenceTab === 'driver' ? 'is-active' : '') + '" type="button" data-draft-evidence-tab="driver" aria-pressed="' + (sessionDraft.evidenceTab === 'driver') + '">This driver <b>' + sessionDraft.options.driver.length + '</b></button>',
            '<button class="' + (sessionDraft.evidenceTab === 'unassigned' ? 'is-active' : '') + '" type="button" data-draft-evidence-tab="unassigned" aria-pressed="' + (sessionDraft.evidenceTab === 'unassigned') + '">Unassigned clips <b>' + sessionDraft.options.unassigned.length + '</b></button>',
          '</div>',
          '<div class="draft-evidence-head"><span></span><span></span><span>Event</span><span>Vehicle</span><span>Severity</span><span>Evidence</span></div>',
          '<div class="draft-evidence-list">' + available.map(evidencePickerRow).join('') + '</div>',
        '</section>',
      '</main>',
      '<aside class="session-compose-rail">',
        '<section class="compose-section"><span class="section-kicker">What is being coached</span><div class="compose-focus"><i></i><strong>' + escapeHtml(activeCategory.name) + '</strong><span>' + item.events + ' events</span></div></section>',
        '<section class="compose-section">',
          '<label class="compose-field"><span>Title</span><input type="text" data-draft-field="title" value="' + escapeHtml(sessionDraft.title) + '"></label>',
          '<div class="compose-field"><span>Method</span><div class="draft-methods" role="group" aria-label="Coaching method">',
            '<button class="' + (sessionDraft.method === 'app' ? 'is-active' : '') + '" type="button" data-draft-method="app" aria-pressed="' + (sessionDraft.method === 'app') + '"><i>▣</i>App</button>',
            '<button class="' + (sessionDraft.method === 'in-person' ? 'is-active' : '') + '" type="button" data-draft-method="in-person" aria-pressed="' + (sessionDraft.method === 'in-person') + '"><i>◉</i>In person</button>',
            '<button class="' + (sessionDraft.method === 'phone' ? 'is-active' : '') + '" type="button" data-draft-method="phone" aria-pressed="' + (sessionDraft.method === 'phone') + '"><i>⌕</i>Phone</button>',
          '</div></div>',
          '<label class="compose-field"><span>Goal</span><input type="text" data-draft-field="goal" value="' + escapeHtml(sessionDraft.goal) + '"></label>',
          '<div class="compose-field message-field"><span>Message to ' + escapeHtml(item.name.split(' ')[0]) + '<button type="button" data-dictate-message>◉ Dictate</button></span><textarea data-draft-field="message" aria-label="Message to ' + escapeHtml(item.name.split(' ')[0]) + '">' + escapeHtml(sessionDraft.message) + '</textarea></div>',
        '</section>',
        '<section class="compose-section compose-options">',
          '<label><input type="checkbox" data-draft-option="requireResponse" ' + (sessionDraft.requireResponse ? 'checked' : '') + '><span><strong>Response required</strong><small>Keep the session open until the driver replies</small></span></label>',
          '<label><input type="checkbox" data-draft-option="includeLesson" ' + (sessionDraft.includeLesson ? 'checked' : '') + '><span><strong>Include mapped lesson</strong><small>' + escapeHtml(draftLessonLabel(activeCategory)) + '</small></span></label>',
          '<label><input type="checkbox" data-draft-option="trackOutcome" ' + (sessionDraft.trackOutcome ? 'checked' : '') + '><span><strong>Measure 14-day outcome</strong><small>Track the category after this follow-up</small></span></label>',
        '</section>',
      '</aside>',
    '</div>',
    '<footer class="session-draft-footer"><span><strong>' + selected.length + '</strong> ' + (selected.length === 1 ? 'event' : 'events') + ' attached' + (sessionDraft.includeLesson ? ' · lesson included' : '') + '</span><div><button class="secondary-button" type="button" data-back-driver-case>Cancel</button><button class="primary-button" type="button" data-send-session-draft>Start one-on-one coaching</button></div></footer>'
  ].join('');
}

function rerenderSessionComposer(focusSelector) {
  const scroll = categoryDrawer.querySelector('.session-composer-scroll');
  const scrollTop = scroll ? scroll.scrollTop : 0;
  renderSessionComposer();
  const nextScroll = categoryDrawer.querySelector('.session-composer-scroll');
  if (nextScroll) nextScroll.scrollTop = scrollTop;
  if (focusSelector) categoryDrawer.querySelector(focusSelector)?.focus();
}

function startSession(caseId) {
  if (!activeCategory) return;
  const scope = getCoachingScope(activeCategory);
  const item = scope.directedCases.concat(scope.quickCases).find((entry) => entry.id === caseId);
  if (!item) return;
  beginSessionDraft(item);
  renderSessionComposer();
}

function sendSessionDraft() {
  if (!sessionDraft || !activeCategory) return;
  const item = activeCategory.directedCases.concat(activeCategory.quickCases).find((entry) => entry.id === sessionDraft.caseId);
  if (!item) return;
  const targetEventType = item.eventTypeName || activeCategory.name;
  const attachedEvidence = selectedDraftEvidence().map((evidence) => ({
    title: evidence.title,
    meta: evidence.source + ' · ' + evidence.date + ' · ' + evidence.location + ' · ' + evidence.vehicle,
    duration: evidence.duration,
    video: evidence.video
  }));
  const parentSession = sessions.find((entry) => entry.person === item.name && entry.categoryId === activeCategory.id && entry.eventType === targetEventType && entry.source === 'Automated');
  const session = {
    id: 'manual-' + item.id + '-' + Date.now(),
    parentSessionId: parentSession ? parentSession.id : null,
    person: item.name,
    initials: item.initials,
    category: activeCategory.name,
    categoryId: activeCategory.id,
    eventType: targetEventType,
    title: sessionDraft.title,
    method: sessionDraft.method,
    goal: sessionDraft.goal,
    lesson: sessionDraft.includeLesson ? draftLessonTitle(activeCategory) : null,
    lessonId: sessionDraft.includeLesson ? (draftCourse(activeCategory)?.id || null) : null,
    state: 'system_handling',
    stateLabel: 'One-on-one',
    attentionReason: null,
    origin: 'manual_override',
    latest: 'Manual session created · just now',
    owner: currentManager.name,
    due: globalSessionDueLabel(),
    dueDays: globalSessionDueDays(),
    sla: '',
    slaTone: '',
    source: 'One-on-one',
    automationRun: 'Outside weekly cycle',
    summary: item.reason + '. Goal: ' + sessionDraft.goal + '.',
    evidence: attachedEvidence,
    messages: [{ author: 'manager', text: sessionDraft.message, time: 'Just now' }],
    history: [['Manual session created', 'Just now'], [attachedEvidence.length + ' evidence ' + (attachedEvidence.length === 1 ? 'item' : 'items') + ' attached', 'Just now']]
  };
  sessions.unshift(session);
  adjustSessionFleetTotals(null, 'system_handling', 'One-on-one');
  const driverName = item.name;
  sessionDraft = null;
  activeSessionId = session.id;
  activeSessionFilter = 'system_handling';
  activeSessionSource = 'manual_override';
  closeCategoryDrawer();
  setTimeout(() => {
    setView('inbox');
    openSessionDrawer(session.id, { type: 'sessions' });
  }, 220);
  showToast('Manual session created for ' + driverName);
}

function emptySessionTotals() {
  return {
    manager_attention: 0,
    system_handling: 0,
    completed: 0,
    archived: 0,
    all: 0,
    driver_reply: 0,
    reminders_exhausted: 0,
    repeat_after_coaching: 0
  };
}

// Automation opens every coaching session itself. Nothing waits for a person to create one,
// so there are no pending review candidates; the list stays for the shared record helpers.
const reviewCandidates = [];
let pendingCandidateId = null;

function activeCandidates() {
  return reviewCandidates.filter((flag) => !flag.started);
}

function allSessionRecords() {
  return sessions.concat(activeCandidates());
}

function candidateFor(name) {
  return activeCandidates().find((flag) => flag.person === name) || null;
}

function reviewActionLabel(record) {
  return record.candidate ? 'Start session' : 'View session';
}

function startSessionForCandidate(id) {
  const flag = reviewCandidates.find((item) => item.id === id && !item.started);
  if (!flag) return;
  pendingCandidateId = flag.id;
  openManualSessionDialog({ person: flag.person, categoryId: flag.categoryId, reason: flag.trigger + ' · ' + flag.detail + '. Start the one-on-one and agree on one behavior change.' });
}

function calculateSessionTotals() {
  const fleet = emptySessionTotals();
  const byOrigin = { automated: emptySessionTotals(), manual_override: emptySessionTotals() };
  allSessionRecords().filter(sessionInPeriod).forEach((session) => {
    const origin = sessionMethodFilter(session);
    // A pending review has no coaching session origin until a session is created.
    const totals = session.candidate ? [fleet] : [fleet, byOrigin[origin]];
    const state = sessionEffectiveState(session);
    totals.forEach(total => {
      if (total[state] !== undefined) total[state] += 1;
      // Archived is a history subset of reporting completions.
      if (session.state === 'archived' && state !== 'archived') total.archived += 1;
      if (session.attentionReason && total[session.attentionReason] !== undefined) total[session.attentionReason] += 1;
      total.all += 1;
    });
  });
  fleet.automated = byOrigin.automated.all;
  fleet.manual_override = byOrigin.manual_override.all;
  return { fleet, byOrigin };
}

let calculatedSessionTotals = calculateSessionTotals();
let sessionFleetTotals = calculatedSessionTotals.fleet;
let sessionOriginTotals = calculatedSessionTotals.byOrigin;

function isOpenSessionState(state) {
  return state === 'manager_attention' || state === 'system_handling';
}

function isAttentionSessionState(state) {
  return state === 'manager_attention';
}

function adjustSessionFleetTotals(previousState, nextState, source, previousReason = null, nextReason = null) {
  calculatedSessionTotals = calculateSessionTotals();
  sessionFleetTotals = calculatedSessionTotals.fleet;
  sessionOriginTotals = calculatedSessionTotals.byOrigin;
  syncFleetSessionCounts();
}

// One reporting-period summary. Identified includes pending flags; delivery-method totals count actual sessions; origin remains immutable.
function currentCycleCounts(period = coachingPeriod, programId = 'all') {
  const counts = coachingCounts(session => programId === 'all' || session.categoryId === programId, period);
  return {
    identified: counts.total,
    sessionTotal: counts.sessionTotal,
    pendingSessionReviews: counts.pendingSessionReviews,
    automatedTotal: counts.automatedTotal,
    oneOnOneTotal: counts.oneOnOneTotal,
    automatedInProgress: counts.automatedInProgress,
    oneOnOneInProgress: counts.oneOnOneInProgress,
    sessionReviews: counts.sessionReviews,
    // Compatibility aliases retain the original active-stage meaning.
    automated: counts.automatedInProgress,
    oneToOne: counts.oneOnOneInProgress,
    inProgress: counts.automatedInProgress + counts.oneOnOneInProgress,
    coached: counts.total - counts.needs_review,
    needsReview: counts.needs_review,
    completed: counts.completed,
    startedAutomatically: sessions.filter(session => sessionWithinPeriod(session, period) && (programId === 'all' || session.categoryId === programId) && session.origin === 'automated').length,
    startedByManager: sessions.filter(session => sessionWithinPeriod(session, period) && (programId === 'all' || session.categoryId === programId) && session.origin === 'manual_override').length,
    completionRate: counts.total ? Math.round(counts.completed / counts.total * 100) : 0
  };
}

function syncFleetSessionCounts() {
  const cycle = currentCycleCounts();
  const values = {
    'sidebar-session-count': cycle.needsReview,
    'sidebar-queue-count': cycle.needsReview,
    'kpi-identified': cycle.identified,
    'kpi-in-progress': cycle.inProgress,
    'kpi-completed': cycle.completed,
    'kpi-needs-review': cycle.needsReview,
    'attention-total-count': cycle.needsReview,
    'attention-reply-count': sessionFleetTotals.driver_reply,
    'attention-overdue-count': sessionFleetTotals.reminders_exhausted,
    'attention-repeat-count': sessionFleetTotals.repeat_after_coaching,
    'driver-attention-button-count': cycle.needsReview,
    'driver-attention-filter-count': cycle.needsReview,
    'analytics-identified-count': cycle.identified,
    'analytics-in-progress-count': cycle.inProgress,
    'analytics-coached-count': cycle.automatedTotal,
    'analytics-escalated-count': cycle.needsReview,
    'analytics-one-to-one-count': cycle.oneOnOneTotal
  };
  Object.entries(values).forEach(([id, value]) => {
    const node = document.getElementById(id);
    if (node) node.textContent = value;
  });
  const attentionTotalButton = document.getElementById('attention-total-button');
  if (attentionTotalButton) attentionTotalButton.setAttribute('aria-label', 'Open all ' + sessionFleetTotals.manager_attention + ' coaching records needing review');
  const attentionScope = document.getElementById('attention-scope');
  if (attentionScope) attentionScope.textContent = cycle.needsReview === 1 ? '1 review item needs a person' : cycle.needsReview + ' review items need a person';
  const analyticsValues = {
    'analytics-completed-count': cycle.completed,
    'analytics-completed-rate': cycle.completionRate + '%',
    'outcome-completion-rate': cycle.completionRate + '%',
    'outcome-completion-count': cycle.completed + ' of ' + cycle.identified + ' identified',
    'outcome-completion-caption': cycle.completed + ' of ' + cycle.identified + ' identified coaching records completed'
  };
  const completionMeter = document.getElementById('outcome-completion-meter');
  if (completionMeter) completionMeter.style.width = cycle.completionRate + '%';
  Object.entries(analyticsValues).forEach(([id, value]) => {
    const node = document.getElementById(id);
    if (node) node.textContent = value;
  });
  document.querySelectorAll('[data-analytics-completion-hint]').forEach((hint) => {
    const description = cycle.completed + ' of ' + cycle.identified + ' identified coaching records completed this cycle.';
    hint.dataset.tooltip = description;
    hint.setAttribute('aria-label', description);
  });
  const currentWeek = weeklyCoachingActivity[weeklyCoachingActivity.length - 1];
  const weeklyCycle = currentCycleCounts(1);
  automationRunSummary.counts = { identified: weeklyCycle.identified, sessionTotal: weeklyCycle.sessionTotal, pendingSessionReviews: weeklyCycle.pendingSessionReviews, automatedTotal: weeklyCycle.automatedTotal, oneOnOneTotal: weeklyCycle.oneOnOneTotal, completed: weeklyCycle.completed, systemHandled: weeklyCycle.inProgress, escalated: weeklyCycle.needsReview };
  if (currentWeek) {
    currentWeek.identified = weeklyCycle.identified;
    currentWeek.automated = weeklyCycle.automatedInProgress;
    currentWeek.oneToOne = weeklyCycle.oneOnOneInProgress;
    currentWeek.completed = weeklyCycle.completed;
    currentWeek.escalated = weeklyCycle.needsReview;
    currentWeek.inProgress = weeklyCycle.inProgress;
  }
  renderQueue();
  renderHomeOverview();
  const summaryText = {
    'automation-analysis-window': automationRunSummary.analysisWindow,
    'automation-last-run': automationRunSummary.lastRun,
    'automation-next-run': automationRunSummary.nextRun,
    'automation-mode': automationMode === 'fully' ? 'Fully automated' : automationMode === 'semi' ? 'Semi-automated' : 'Manual',
    'automation-mode-summary': automationMode === 'fully' ? 'Fully automated' : automationMode === 'semi' ? 'Semi-automated' : 'Manual',
    'automation-cadence': cadenceWeeks === 1 ? 'Every week' : 'Every 2 weeks',
    'automation-cadence-summary': cadenceWeeks === 1 ? 'Every week' : 'Every 2 weeks'
  };
  Object.entries(summaryText).forEach(([id, value]) => {
    const node = document.getElementById(id);
    if (node) node.textContent = value;
  });
  renderCoachingActivityChart();
  renderSessionOverview();
  renderDriverCoachingOverview();
}

// Automation Centre: four KPI cards with a trend each, review reasons by severity, and the
// automated-versus-one-on-one split for the current cycle. Every figure reads the session ledger
// or the weekly fixture; nothing here has its own denominator.
const fleetSafetyScore = { score: 74, change: 3, comparison: 'vs prior period' };
// Recorded prototype program scores (0–100, higher is safer), the same footing as the fleet and
// group scores above. They are not yet computed from rule weights; programs created locally have none.
const programScores = { following: 68, speeding: 71, braking: 76, distraction: 66, seatbelt: 79, acceleration: 81, cornering: 83, traffic: 77, fatigue: 70, backing: null };
function programScore(program) {
  const value = program ? programScores[program.id] : undefined;
  return Number.isFinite(value) ? value : null;
}

function fleetEventRatePer100k() {
  const rates = Object.values(weeklyCycleStats).map((stat) => stat.weeklyRates);
  const sumAt = (index) => rates.reduce((sum, series) => sum + (series[index] ?? 0), 0);
  const first = sumAt(Math.max(0, Math.min(rates[0].length - 1, periodWindowStart())));
  const latest = sumAt(rates[0].length - 1);
  return { latest: Math.round(latest * 100), first: Math.round(first * 100), change: first ? Math.round((latest - first) / first * 100) : 0 };
}

function kpiTrend(id, { delta, suffix = '', comparison, lowerIsBetter = false, neutral = false, unavailable = false, unavailableLabel = 'No comparison yet' }) {
  const node = document.getElementById(id);
  if (!node) return;
  if (unavailable || !Number.isFinite(delta)) {
    node.dataset.tone = 'neutral';
    node.innerHTML = '<span>' + escapeHtml(unavailableLabel) + '</span>';
    node.setAttribute('aria-label', unavailableLabel);
    return;
  }
  const direction = delta > 0 ? 'up' : delta < 0 ? 'down' : 'flat';
  const improving = delta === 0 ? null : lowerIsBetter ? delta < 0 : delta > 0;
  node.dataset.tone = neutral || improving === null ? 'neutral' : improving ? 'positive' : 'negative';
  const glyph = direction === 'flat' ? '<i class="kpi-trend-flat" aria-hidden="true"></i>' : uiIcon(direction === 'up' ? 'arrowUp' : 'arrowDown');
  const magnitude = (delta > 0 ? '+' : delta < 0 ? '−' : '') + Math.abs(delta) + suffix;
  node.innerHTML = glyph + '<b>' + magnitude + '</b><span>' + escapeHtml(comparison) + '</span>';
  node.setAttribute('aria-label', (direction === 'flat' ? 'No change' : (direction === 'up' ? 'Up ' : 'Down ') + Math.abs(delta) + suffix) + ' ' + comparison);
}

function renderHomeOverview() {
  const weeks = weeklyCoachingActivity;
  const currentWeek = weeks[weeks.length - 1];
  const previousWeek = weeks[weeks.length - 2];
  const cycle = currentCycleCounts(coachingPeriod, landingProgramId);
  const program = categories.find(item => item.id === landingProgramId);
  const weekly = coachingPeriod === 1 && !program; // no program-level historical coaching snapshots
  const scopeRecords = allSessionRecords().filter(session => sessionInPeriod(session) && (!program || session.categoryId === program.id));
  const reasons = Object.fromEntries(Object.keys(attentionReasonMeta).map(reason => [reason, scopeRecords.filter(session => session.state === 'manager_attention' && session.attentionReason === reason).length]));
  const headingProgram = document.getElementById('landing-program-filter');
  if (headingProgram) {
    if (!headingProgram.options.length) headingProgram.innerHTML = '<option value="all">All programs</option>' + categories.map(item => '<option value="' + item.id + '">' + escapeHtml(item.name) + '</option>').join('');
    headingProgram.value = landingProgramId;
  }
  const scopedValues = { 'kpi-identified': cycle.identified, 'kpi-in-progress': cycle.inProgress, 'kpi-completed': cycle.completed, 'kpi-needs-review': cycle.needsReview, 'attention-total-count': cycle.needsReview, 'attention-reply-count': reasons.driver_reply, 'attention-overdue-count': reasons.reminders_exhausted, 'attention-repeat-count': reasons.repeat_after_coaching };
  Object.entries(scopedValues).forEach(([id, value]) => { const node = document.getElementById(id); if (node) node.textContent = value; });
  document.getElementById('attention-scope').textContent = cycle.needsReview + (cycle.needsReview === 1 ? ' review item needs a person' : ' review items need a person');
  document.getElementById('attention-total-button').setAttribute('aria-label', 'Open ' + cycle.needsReview + ' review items' + (program ? ' for ' + program.name : ''));
  document.getElementById('prioritized-attention-title').textContent = coachingPeriod === 1 ? 'Needs you this week' : 'Needs you';
  document.querySelectorAll('#view-coaching [data-inbox-filter]').forEach(node => { node.dataset.inboxProgram = landingProgramId; });
  document.querySelectorAll('#view-coaching [data-analytics-link]').forEach(node => {
    if (program) node.dataset.programLink = program.id;
    else delete node.dataset.programLink;
  });
  updateAiCommandPreview();
  kpiTrend('kpi-identified-trend', { delta: weekly && Number.isFinite(previousWeek?.identified) ? cycle.identified - previousWeek.identified : NaN, comparison: 'vs last week', neutral: true, unavailableLabel: 'No prior window' });
  kpiTrend('kpi-in-progress-trend', { delta: weekly && Number.isFinite(previousWeek?.inProgress) ? cycle.inProgress - previousWeek.inProgress : NaN, comparison: 'vs last week', neutral: true, unavailableLabel: 'No prior window' });
  kpiTrend('kpi-completed-trend', { delta: weekly && Number.isFinite(previousWeek?.completed) ? cycle.completed - previousWeek.completed : NaN, comparison: 'vs last week', unavailableLabel: 'No prior window' });
  kpiTrend('kpi-needs-review-trend', { delta: weekly && Number.isFinite(previousWeek?.escalated) ? cycle.needsReview - previousWeek.escalated : NaN, comparison: 'vs last week', lowerIsBetter: true, unavailableLabel: 'No prior window' });
  ['kpi-identified-trend', 'kpi-in-progress-trend', 'kpi-completed-trend', 'kpi-needs-review-trend'].forEach(id => { document.getElementById(id).hidden = Boolean(program); });
  const safety = document.getElementById('kpi-fleet-safety');
  const scopedScore = program ? programScore(program) : null;
  if (safety) safety.textContent = program ? (scopedScore === null ? '—' : scopedScore) : fleetSafetyScore.score;
  const scoreLabel = document.getElementById('landing-score-label');
  if (scoreLabel) scoreLabel.textContent = program ? program.name + ' score' : 'Elevate score';
  const scoreHint = document.getElementById('landing-score-hint');
  if (scoreHint) { scoreHint.dataset.tooltip = program ? (scopedScore === null ? 'No recorded score for this program yet. Program scores require configured event weights and period evaluations.' : 'Recorded prototype score for ' + program.name + ' from 0 to 100; higher is safer. Not yet computed from rule weights.') : 'Recorded overall prototype score. The weighted roll-up of program scores is not configured yet.'; scoreHint.setAttribute('aria-label', scoreHint.dataset.tooltip); }
  kpiTrend('kpi-safety-trend', { delta: fleetSafetyScore.change, comparison: fleetSafetyScore.comparison });
  document.getElementById('kpi-safety-trend').hidden = Boolean(program);
  const programRate = program ? rateChange(program.weeklyRates) : null;
  const eventRate = programRate ? { latest: Math.round(programRate.after * 100), change: programRate.change } : fleetEventRatePer100k();
  const eventNode = document.getElementById('kpi-event-rate');
  if (eventNode) eventNode.textContent = eventRate.latest.toLocaleString('en-US');
  const eventHint = eventNode?.closest('.kpi-tile, .analytics-kpi-tile')?.querySelector('[data-tooltip]');
  if (eventHint) { eventHint.dataset.tooltip = 'Recorded events per 100,000 trips · ' + (program ? program.name : 'all programs') + ' · latest week. Lower is safer. This is an event rate, not a program score.'; eventHint.setAttribute('aria-label', eventHint.dataset.tooltip); }
  kpiTrend('kpi-events-trend', { delta: eventRate.change, suffix: '%', comparison: periodComparisonLabel(), lowerIsBetter: true });

  const reviewTotal = Math.max(1, cycle.needsReview); // flagged reviews without a session are already inside this total
  document.querySelectorAll('.attention-row[data-attention-reason]').forEach((row) => {
    const count = reasons[row.dataset.attentionReason] || 0;
    row.style.setProperty('--share', String(count / reviewTotal));
    row.classList.toggle('is-empty', count === 0);
  });

  const automated = cycle.automatedTotal;
  const oneToOne = cycle.oneOnOneTotal;
  const share = cycle.sessionTotal ? Math.round(automated / cycle.sessionTotal * 100) : 0;
  const values = {
    'automation-share': share + '%',
    'automation-session-total': cycle.sessionTotal,
    'automation-week-automated': automated,
    'automation-week-manual': oneToOne,
    'automation-week-scope': periodScopeLabel() + (program ? ' · ' + program.name : ''),
    'automation-week-title': coachingPeriod === 1 ? 'Automation this week' : 'Automation · last ' + coachingPeriod + ' weeks'
  };
  Object.entries(values).forEach(([id, value]) => {
    const node = document.getElementById(id);
    if (node) node.textContent = value;
  });
  const splitBar = document.getElementById('automation-split-bar');
  if (splitBar) {
    splitBar.setAttribute('aria-label', automated + ' automated sessions versus ' + oneToOne + ' one-on-one sessions, of ' + cycle.sessionTotal + ' actual sessions, ' + periodLabel().toLowerCase());
    splitBar.querySelector('.is-automated').style.flexGrow = String(automated);
    splitBar.querySelector('.is-manual').style.flexGrow = String(oneToOne);
  }
  const max = Math.max(1, automated, oneToOne);
  [['.automation-row.is-automated', automated], ['.automation-row.is-manual', oneToOne]].forEach(([selector, value]) => {
    const row = document.querySelector(selector);
    if (row) row.style.setProperty('--share', String(value / max));
  });
  const sessionsLink = document.getElementById('automation-sessions-link');
  if (sessionsLink) {
    sessionsLink.dataset.inboxFilter = 'all';
    sessionsLink.dataset.inboxOrigin = 'automated';
    sessionsLink.setAttribute('aria-label', 'View ' + cycle.automatedTotal + ' automated sessions');
  }
  const detailLink = document.getElementById('landing-program-link');
  if (detailLink) { detailLink.dataset.openCategory = program?.id || categories[0].id; detailLink.textContent = program ? 'Open program' : 'Explore programs'; }
  if (typeof renderLandingPrograms === 'function') renderLandingPrograms();
}

function sessionMatchesFilter(session, filter) {
  filter = normalizeSessionFilter(filter);
  if (attentionReasonMeta[filter]) return session.state === 'manager_attention' && session.attentionReason === filter;
  if (filter === 'all') return true;
  if (filter === 'archived') return session.state === 'archived';
  return sessionEffectiveState(session) === filter;
}

function sessionViewTabs() {
  const totals = { all: 0, manager_attention: 0, system_handling: 0, completed: 0, archived: 0 };
  allSessionRecords().filter(session => sessionInPeriod(session) && (activeSessionProgram === 'all' || session.categoryId === activeSessionProgram) && (activeSessionSource === 'all' || (!session.candidate && sessionMethodFilter(session) === activeSessionSource))).forEach(session => {
    totals.all += 1;
    totals[sessionEffectiveState(session)] += 1;
    if (session.state === 'archived') totals.archived += 1;
  });
  const activeLifecycle = attentionReasonMeta[activeSessionFilter] ? 'manager_attention' : activeSessionFilter;
  const labels = { all: 'All', manager_attention: 'Needs review', system_handling: 'In progress', completed: 'Completed', archived: 'Archived' };
  return '<legend class="sr-only">Session status</legend>' + Object.entries(labels).map(([key, label]) =>
    '<label><input type="radio" name="session-status" value="' + key + '" data-session-filter="' + key + '" aria-checked="' + (key === activeLifecycle) + '"' + (key === activeLifecycle ? ' checked' : '') + '><span class="segmented__option">' + label + '<b>' + totals[key] + '</b></span></label>'
  ).join('');
}

function sessionFilters() {
  const reason = attentionReasonMeta[activeSessionFilter] ? activeSessionFilter : 'all';
  const count = Number(activeSessionSource !== 'all') + Number(reason !== 'all') + Number(activeSessionProgram !== 'all');
  const option = (value, label, selected) => '<option value="' + value + '"' + (selected === value ? ' selected' : '') + '>' + label + '</option>';
  return '<div class="filter-sheet" data-filter-sheet="sessions">' +
    '<button class="filter-sheet-trigger" type="button" data-filter-sheet-trigger aria-expanded="false" aria-controls="session-filters">' + uiIcon('filter') + '<span>Filters</span>' + (count ? '<b class="filter-count">' + count + '</b>' : '') + '</button>' +
    '<button class="filter-sheet-backdrop" type="button" data-filter-sheet-close tabindex="-1" aria-label="Close session filters"></button>' +
    '<div class="filter-sheet-content" id="session-filters"><div class="filter-sheet-header"><strong>Session filters</strong><button class="icon-button" type="button" data-filter-sheet-close aria-label="Close session filters">' + uiIcon('close') + '</button></div>' +
    '<label class="refined-filter-field" for="session-program-filter">Program<select id="session-program-filter">' + option('all', 'All programs', activeSessionProgram) + categories.map(program => option(program.id, escapeHtml(program.name), activeSessionProgram)).join('') + '</select></label>' +
    '<label class="refined-filter-field" for="session-origin-filter">Method<select id="session-origin-filter">' + option('all', 'All methods', activeSessionSource) + option('automated', 'Automated', activeSessionSource) + option('manual_override', 'One-on-one', activeSessionSource) + '</select></label>' +
    '<label class="refined-filter-field" for="session-reason-filter">Review reason<select id="session-reason-filter">' + option('all', 'All reasons', reason) + Object.entries(attentionReasonMeta).map(([key, value]) => option(key, value.label, reason)).join('') + '</select></label>' +
    '<div class="filter-sheet-actions"><button class="text-action" type="button" data-clear-session-filters' + (count ? '' : ' disabled') + '>Reset</button><button class="primary-button" type="button" data-filter-sheet-close>Done</button></div></div></div>';
}

function renderSessionAppliedFilters() {
  const filters = [activeSessionProgram === 'all' ? '' : categoryNameFor(activeSessionProgram), activeSessionSource === 'all' ? '' : activeSessionSource === 'automated' ? 'Automated' : 'One-on-one', attentionReasonMeta[activeSessionFilter]?.label].filter(Boolean);
  const summary = document.getElementById('session-applied-filters');
  summary.hidden = !filters.length;
  summary.innerHTML = filters.length ? '<span>' + filters.join(' · ') + '</span><button type="button" data-clear-session-filters>Clear filters</button>' : '';
}

function compactSessionStatus(session) {
  const state = uiSessionState(session);
  const attention = uiSessionAttention(session);
  const label = ['Completed', 'Archived', 'Replied'].includes(state) ? state : attention !== '—' ? attention : state;
  return [uiStatusDictionary[label]?.icon || 'clock', label];
}

function sessionStatusClass(session) {
  if (session.state === 'manager_attention') return attentionReasonMeta[session.attentionReason]?.tone || 'issue';
  if (session.state === 'system_handling') return 'system';
  if (session.state === 'completed') return 'complete';
  if (session.state === 'archived') return 'archived';
  return '';
}

function renderSessionList() {
  const lifecyclePriority = { manager_attention: 0, system_handling: 1, completed: 2, archived: 3 };
  const reasonPriority = { reminders_exhausted: 0, repeat_after_coaching: 1, driver_reply: 2 };
  const term = sessionSearch.trim().toLowerCase();
  const filtered = allSessionRecords()
    .filter(sessionInPeriod)
    .filter(session => activeSessionProgram === 'all' || session.categoryId === activeSessionProgram)
    .filter(session => sessionMatchesFilter(session, activeSessionFilter))
    .filter(session => activeSessionSource === 'all' || (!session.candidate && sessionMethodFilter(session) === activeSessionSource))
    .filter(session => !term || [session.person, session.category, session.eventType, session.stateLabel, attentionReasonMeta[session.attentionReason]?.label, session.source, session.owner, session.latest, session.automationRun, session.due, session.sla].join(' ').toLowerCase().includes(term))
    .sort((a,b) => (lifecyclePriority[a.state] ?? 9) - (lifecyclePriority[b.state] ?? 9) || (reasonPriority[a.attentionReason] ?? 9) - (reasonPriority[b.attentionReason] ?? 9));
  const pageSize = 50;
  const pages = Math.max(1, Math.ceil(filtered.length / pageSize));
  sessionPage = Math.max(1, Math.min(pages, sessionPage));
  const pageStart = (sessionPage - 1) * pageSize;
  const rows = filtered.slice(pageStart, pageStart + pageSize).map(session => {
    const [, state] = compactSessionStatus(session);
    const open = session.candidate ? 'data-start-session-for="' + session.id + '"' : 'data-open-session="' + session.id + '"';
    const href = session.candidate ? '' : ' href="?record=' + encodeURIComponent(session.id) + '#sessions"';
    const tag = session.candidate ? 'button' : 'a';
    return '<tr class="session-record" data-record-id="' + session.id + '"><td><' + tag + ' class="session-person text-link"' + href + ' ' + open + ' aria-haspopup="dialog" aria-label="' + escapeHtml((session.candidate ? 'Start session for ' : 'Open session for ') + session.person + ': ' + session.category) + '"><span class="person-avatar" aria-hidden="true">' + session.initials + '</span><strong>' + escapeHtml(session.person) + '</strong></' + tag + '></td>' +
      '<td><span class="session-topic">' + escapeHtml(session.category) + sessionClipBadge(session) + '</span></td>' +
      '<td>' + uiStatus(state) + '</td>' +
      '<td>' + escapeHtml(coachLabel(session)) + '</td>' +
      '<td>' + escapeHtml(sessionStartedLabel(session)) + '</td><td>' + escapeHtml(sessionCompletedLabel(session)) + '</td><td>' + escapeHtml(sessionDueLabel(session)) + '</td><td><button class="text-link" type="button" ' + open + ' aria-haspopup="dialog" aria-label="' + escapeHtml((session.candidate ? 'Start session for ' : 'Open session for ') + session.person + ': ' + session.category) + '">' + (session.candidate ? 'Start session' : 'Open session') + '</button></td></tr>';
  }).join('');
  const empty = activeSessionFilter === 'archived' && !term && activeSessionSource === 'all'
    ? '<div class="empty-state">No archived sessions in this period.<br><small>Change the period to view earlier history.</small></div>'
    : '<div class="empty-state">No coaching records found.<br><small>Try another search or clear your filters.</small></div>';
  const content = filtered.length ? uiTable('Coaching records', ['Driver', 'Program', 'State', 'Coach', 'Started', 'Completed', 'Due', 'Action'], rows) : empty;
  return '<section class="session-list-card refined-sessions" aria-label="Coaching records">' + content + '<footer class="session-footer"><span>' + (filtered.length ? (pageStart + 1) + '–' + Math.min(pageStart + pageSize, filtered.length) + ' of ' : '') + filtered.length + ' records</span><nav aria-label="Session pages"' + (pages === 1 ? ' hidden' : '') + '><button class="button button--secondary" type="button" data-session-page="' + (sessionPage - 1) + '"' + (sessionPage === 1 ? ' disabled' : '') + '>Previous</button><span>Page ' + sessionPage + ' of ' + pages + '</span><button class="button button--secondary" type="button" data-session-page="' + (sessionPage + 1) + '"' + (sessionPage === pages ? ' disabled' : '') + '>Next</button></nav></footer></section>';
}
// Source fixtures and compatibility helpers for the event-owned evidence model.
const playGlyph = '<svg class="ui-icon clip-glyph" viewBox="0 0 24 24" aria-hidden="true"><path d="M8 5.5v13l10.5-6.5Z" fill="currentColor" stroke="none"/></svg>';
const pauseGlyph = '<svg class="ui-icon clip-glyph" viewBox="0 0 24 24" aria-hidden="true"><path d="M8 5h3v14H8zM13 5h3v14h-3z" fill="currentColor" stroke="none"/></svg>';
const searchGlyph = '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="11" cy="11" r="6.5"/><path d="m16 16 4 4"/></svg>';
function hashText(text) {
  let hash = 0;
  for (let index = 0; index < text.length; index += 1) hash = (hash * 31 + text.charCodeAt(index)) >>> 0;
  return hash;
}

function categoryNameFor(id) {
  return categories.find((category) => category.id === id)?.name || id;
}

const unassignedClips = [
  { id: 'unassigned-1', categoryId: 'distraction', eventType: 'Phone handling', severity: 'High', duration: '0:14', time: 'Sep 4 · 7:32 AM', location: 'Airport Rd near Derry', vehicle: 'Unit 412-08421' },
  { id: 'unassigned-2', categoryId: 'following', eventType: 'Following distance under 2 sec', severity: 'Low', duration: '0:18', time: 'Sep 3 · 10:30 PM', location: 'QEW near Oakville', vehicle: 'Unit 415-03714' },
  { id: 'unassigned-3', categoryId: 'traffic', eventType: 'Rolling stop', severity: 'Medium', duration: '0:11', time: 'Sep 3 · 6:12 PM', location: 'Steeles Ave at Keele', vehicle: 'Unit 404-56145' },
  { id: 'unassigned-4', categoryId: 'fatigue', eventType: 'Drowsiness detected', severity: 'High', duration: '0:20', time: 'Sep 2 · 11:48 PM', location: 'Hwy 400 northbound', vehicle: 'Unit 414-33437' },
  { id: 'unassigned-5', categoryId: 'cornering', eventType: 'Harsh cornering', severity: 'Medium', duration: '0:13', time: 'Sep 2 · 3:36 PM', location: 'Bramalea Rd at Clark', vehicle: 'Unit 408-77109' },
  { id: 'unassigned-6', categoryId: 'distraction', eventType: 'Eyes off road', severity: 'Medium', duration: '0:16', time: 'Sep 2 · 8:05 AM', location: 'Hwy 401 near Milton', vehicle: 'Unit 415-03714' },
  { id: 'unassigned-7', categoryId: 'speeding', eventType: 'Speeding 15+ over limit', severity: 'High', duration: '0:15', time: 'Sep 1 · 5:27 PM', location: 'Hwy 407 near Vaughan', vehicle: 'Unit 411-05233' },
  { id: 'unassigned-8', categoryId: 'braking', eventType: 'Emergency braking', severity: 'High', duration: '0:12', time: 'Sep 1 · 9:40 AM', location: 'Dixie Rd at Courtneypark', vehicle: 'Unit 409-01288' },
  { id: 'unassigned-9', categoryId: 'seatbelt', eventType: 'Seat belt unfastened', severity: 'Low', duration: '0:10', time: 'Aug 31 · 1:12 PM', location: 'Local route 18', vehicle: 'Unit 413-07690' },
  { id: 'unassigned-10', categoryId: 'distraction', eventType: 'Phone handling', severity: 'Low', duration: '0:13', time: 'Aug 31 · 7:58 AM', location: 'Airport Rd near Derry', vehicle: 'Unit 412-08421' }
].map((clip) => ({ ...clip, categoryName: categoryNameFor(clip.categoryId), source: 'Lytx', video: true, assigned: false, person: null, sessionId: null }));

function sessionClips(session) { return sessionEvidenceClips(session); }
function findClip(id) { return evidenceClip(id); }
function attachedClipsFor(session) { return selectedWorkspaceEvents(session).flatMap(eventClips); }
let pendingFootageFocus = false;

function sessionClipBadge(session) {
  const count = sessionClips(session).length;
  if (!count) return '';
  return '<span class="session-clips icon-hint" data-tooltip="' + count + (count === 1 ? ' clip attached' : ' clips attached') + '" aria-label="' + count + (count === 1 ? ' clip' : ' clips') + '">' + playGlyph + count + '</span>';
}

function renderInbox() {
  renderDesignLibraryKpis();
  const scope = [activeSessionFilter, activeSessionSource, activeSessionProgram, sessionSearch, coachingPeriod].join('|');
  if (scope !== sessionPageScope) { sessionPage = 1; sessionPageScope = scope; }
  renderSessionOverview();
  const controls = document.getElementById('session-filter-controls');
  const sheet = controls.querySelector('[data-filter-sheet].is-open');
  const focusedId = document.activeElement?.id;
  if (sheet) closeFilterSheet(sheet, false);
  document.getElementById('session-view-tabs').innerHTML = sessionViewTabs();
  controls.innerHTML = sessionFilters();
  renderSessionAppliedFilters();
  inboxContent.innerHTML = renderSessionList();
  if (sheet) {
    openFilterSheet(controls.querySelector('[data-filter-sheet-trigger]'));
    requestAnimationFrame(() => document.getElementById(focusedId)?.focus());
  }
  syncRadioGroups();
}

function renderSessionDrawer() {
  const session = sessions.find((item) => item.id === activeSessionId);
  if (!session) {
    closeDrawer();
    return;
  }
  mountSessionWorkspace(session);
  driverDrawer.classList.remove('is-profile');
  driverDrawer.classList.add('is-session');
  driverDrawer.scrollTop = 0;
}

function openSessionDrawer(sessionId, origin) {
  const session = sessions.find((item) => item.id === sessionId);
  if (!session) return;
  const drawerWasOpen = driverDrawer.classList.contains('is-open');
  if (!drawerWasOpen) drawerOpener = document.activeElement;
  saveSessionWorkspaceDraft();
  activeSessionId = session.id;
  const workspace = sessionWorkspaceState(session);
  composerMode = workspace.mode;
  if (pendingFootageFocus) {
    const first = sessionEvidenceEvents(session).find(event => eventClips(event).length);
    if (first) { workspace.eventId = first.id; workspace.clipId = eventClips(first)[0].id; }
  }
  pendingFootageFocus = false;
  sessionDrawerOrigin = { type: origin?.type || (currentView === 'programs' ? 'program-page' : 'sessions'), driverName: origin?.driverName || null };
  if (sessionDrawerOrigin.type !== 'driver-profile') activeDriverProfile = null;
  renderSessionDrawer();
  drawerBackdrop.hidden = false;
  driverDrawer.inert = false;
  if (!driverDrawer.open) driverDrawer.showModal();
  if (categoryDrawer.open) categoryDrawer.inert = true;
  driverDrawer.classList.add('is-open');
  driverDrawer.setAttribute('aria-hidden', 'false');
  document.getElementById('app-shell').inert = true;
  document.body.style.overflow = 'hidden';
  updateUrlState(true);
  setTimeout(() => {
    if (driverDrawer.classList.contains('is-session') && activeSessionId === sessionId) driverDrawer.querySelector('[data-close-drawer]')?.focus();
  }, 100);
}

function driverMatchesScore(item, filter) {
  const score = item.safetyScore;
  if (filter === 'all') return true;
  if (filter === 'unscored') return !Number.isFinite(score);
  if (!Number.isFinite(score)) return false;
  if (filter === 'risk') return score < 60;
  if (filter === 'watch') return score >= 60 && score < 80;
  if (filter === 'safe') return score >= 80;
  const bin = driverDistributionBins.find((item) => item.key === filter);
  return Boolean(bin && score >= bin.min && score <= bin.max);
}

function driverScoreFilterLabel(filter) {
  const labels = { unscored: 'Unscored', risk: 'High risk', watch: 'Watch', safe: 'Safe' };
  const bin = driverDistributionBins.find((item) => item.key === filter);
  return labels[filter] || (bin ? 'Score ' + bin.label : 'All scores');
}

function renderDriverDistribution() {
  if (!driverDistribution || !driverTierTotals) return;
  const max = Math.max.apply(null, driverDistributionBins.map((bin) => bin.count));
  const tierDescriptions = { unscored: 'Elevate score unavailable', risk: 'Elevate score below 60', watch: 'Elevate score 60–79', safe: 'Elevate score 80–100' };
  const tiers = ['risk', 'watch', 'safe', 'unscored'].map((key) => driverTierCounts.find((tier) => tier.key === key));
  const safetyMix = document.getElementById('driver-safety-mix');
  const fleetTotal = tiers.reduce((total, tier) => total + tier.count, 0);
  document.getElementById('driver-safety-scope').textContent = 'All ' + fleetTotal.toLocaleString('en-US') + ' drivers';

  // Mount controls once: filtering must preserve keyboard focus and the open score disclosure.
  if (!driverTierTotals.children.length) {
    driverTierTotals.innerHTML = tiers.map((tier) => [
      '<button class="overview-key-button driver-tier-total ' + tier.tone + ' overview-tone-' + tier.tone + '" type="button" data-driver-score-filter="' + tier.key + '">',
        '<i aria-hidden="true"></i><span>' + tier.label + '</span><strong></strong>',
      '</button>'
    ].join('')).join('');
  }
  if (safetyMix && !safetyMix.children.length) {
    safetyMix.innerHTML = tiers.map((tier) => '<button class="overview-tone-' + tier.tone + '" type="button" data-driver-score-filter="' + tier.key + '"></button>').join('');
  }
  tiers.forEach((tier) => {
    const label = tier.label + ': ' + tier.count + ' of ' + fleetTotal + ' fleet drivers. ' + tierDescriptions[tier.key] + '. Filter the directory.';
    [driverTierTotals, safetyMix].filter(Boolean).forEach((container) => {
      const button = container.querySelector('[data-driver-score-filter="' + tier.key + '"]');
      button.setAttribute('aria-label', label);
      button.dataset.tooltip = tier.label + ' · ' + tier.count + ' drivers · ' + tierDescriptions[tier.key];
      if (container === safetyMix) button.style.flexGrow = tier.count;
      else button.querySelector('strong').textContent = tier.count;
    });
  });

  if (!driverDistribution.children.length) {
    driverDistribution.innerHTML = driverDistributionBins.map((bin) => [
      '<button class="driver-distribution-bin ' + bin.tone + '" type="button" data-driver-score-filter="' + bin.key + '">',
        '<span class="driver-bin-count"></span><span class="driver-bin-track"><i></i></span>',
        '<span class="driver-bin-label">' + bin.label + '</span>',
      '</button>'
    ].join('')).join('');
  }
  driverDistributionBins.forEach((bin) => {
    const button = driverDistribution.querySelector('[data-driver-score-filter="' + bin.key + '"]');
    button.setAttribute('aria-label', bin.label + ', ' + bin.count + ' fleet drivers. Filter the directory.');
    button.querySelector('.driver-bin-count').textContent = bin.count;
    button.querySelector('.driver-bin-track i').style.height = (bin.count / max * 100).toFixed(2) + '%';
  });
  document.querySelectorAll('#view-drivers [data-driver-score-filter]').forEach((button) => {
    const selected = button.dataset.driverScoreFilter === activeDriverScoreFilter;
    button.classList.toggle('is-active', selected);
    button.setAttribute('aria-pressed', String(selected));
  });
  renderDriverCoachingOverview();
  renderSafetyChartDetails();
}


function renderDriverFilterState() {
  if (!driverFilterState) return;
  const tokens = [];
  if (activeDriverScoreFilter !== 'all') tokens.push(['score', driverScoreFilterLabel(activeDriverScoreFilter)]);
  if (activeDriverGroup !== 'all') tokens.push(['group', activeDriverGroup]);
  if (activeDriverCategory !== 'all') tokens.push(['program', categoryNameFor(activeDriverCategory)]);
  driverFilterState.innerHTML = tokens.length
    ? tokens.map((token) => '<button type="button" data-clear-driver-filter="' + token[0] + '" aria-label="Remove ' + escapeHtml(token[1]) + ' filter">' + escapeHtml(token[1]) + ' <b aria-hidden="true">×</b></button>').join('') + '<button class="clear-driver-filters" type="button" data-clear-driver-filter="all">Reset</button>'
    : '';
  driverFilterState.hidden = !tokens.length;
  const activeCount = tokens.length + (driverSort !== 'action' ? 1 : 0);
  const count = document.getElementById('driver-active-filter-count');
  if (count) {
    count.textContent = activeCount;
    count.hidden = !activeCount;
  }
  const trigger = document.querySelector('[data-filter-sheet="drivers"] [data-filter-sheet-trigger]');
  trigger?.setAttribute('aria-label', 'Driver filters' + (activeCount ? ', ' + activeCount + ' active' : ''));
  const reset = document.getElementById('driver-reset-filters');
  if (reset) reset.disabled = !activeCount && activeDriverFilter === 'all' && !document.getElementById('driver-search').value.trim();
  document.querySelectorAll('[data-driver-filter]').forEach((button) => button.setAttribute('aria-pressed', String(button.dataset.driverFilter === activeDriverFilter)));
}

// Directory program scope follows recorded coaching relationships, not the driver's top event.
function driverScopedRecords(name) {
  return allSessionRecords().filter(record => record.person === name && sessionWithinPeriod(record, coachingPeriod) && (activeDriverCategory === 'all' || record.categoryId === activeDriverCategory));
}

function driverPreferredRecord(driver) {
  const records = driverScopedRecords(driver.name).filter(record => !record.candidate);
  const attention = records.filter(record => record.state === 'manager_attention');
  const active = records.filter(record => !['completed', 'archived', 'manager_attention'].includes(record.state));
  const completed = records.filter(record => ['completed', 'archived'].includes(record.state));
  const preferred = attention.length ? attention : active.length ? active : completed;
  return preferred.find(record => record.category === driver.focus) || preferred[0] || null;
}

function renderDriverScopedKpis() {
  if (activeDriverCategory === 'all') return;
  const counts = coachingCounts(record => record.categoryId === activeDriverCategory);
  const records = allSessionRecords().filter(record => record.categoryId === activeDriverCategory && sessionWithinPeriod(record, coachingPeriod));
  const driverCount = new Set(records.map(record => record.person)).size;
  const scope = categoryNameFor(activeDriverCategory) + ' · ' + periodScopeLabel();
  const action = (filter, origin = '') => 'data-view-link="inbox" data-inbox-program="' + escapeHtml(activeDriverCategory) + '" data-inbox-filter="' + filter + '"' + (origin ? ' data-inbox-origin="' + origin + '"' : '');
  document.getElementById('drivers-kpis').innerHTML = uiKpiStrip('Drivers · ' + scope, [
    { label: 'Coached drivers', value: driverCount, context: 'Distinct drivers with coaching records in ' + scope + '. The directory contains representative profiles.' },
    { label: 'Automated in progress', value: counts.automated, context: scope + '. Active sessions only.', action: action('system_handling', 'automated') },
    { label: 'One-on-one in progress', value: counts.one_to_one, context: scope + '. Active sessions only.', action: action('system_handling', 'manual_override') },
    { label: 'Completed', value: counts.completed, context: scope, action: action('completed') }
  ]);
}

function driverDirectoryStatus(item) {
  const record = driverPreferredRecord(item);
  if (!record) return { label: 'On track' };
  if (record.state === 'manager_attention') return { label: attentionReasonMeta[record.attentionReason]?.label || 'Overdue' };
  return { label: ['completed', 'archived'].includes(record.state) ? 'Completed' : 'In progress' };
}

function driverDirectorySession(driver) {
  const record = driverPreferredRecord(driver);
  return record && !['completed', 'archived'].includes(record.state) ? record : null;
}

function renderDirectory() {
  renderDriverDistribution();
  renderDriverFilterState();
  renderDesignLibraryKpis();
  const categorySelect = document.getElementById('driver-category-filter');
  const catalogKey = categories.map(program => program.id).join('|');
  if (categorySelect && categorySelect.dataset.catalogKey !== catalogKey) {
    categorySelect.innerHTML = '<option value="all">All programmes</option>' + categories.map(program => '<option value="' + escapeHtml(program.id) + '">' + escapeHtml(program.name) + '</option>').join('');
    categorySelect.dataset.catalogKey = catalogKey;
  }
  if (categorySelect) categorySelect.value = activeDriverCategory;
  const term = document.getElementById('driver-search').value.trim().toLowerCase();
  const scopedDirectory = activeDriverCategory === 'all' ? directory : directory.filter(item => driverScopedRecords(item.name).length);
  const filtered = scopedDirectory.filter(item => driverMatchesStatus(item, activeDriverFilter) && (activeDriverGroup === 'all' || item.group === activeDriverGroup) && driverMatchesScore(item, activeDriverScoreFilter) && item.name.toLowerCase().includes(term)).sort((a,b) => {
    if (driverSort === 'lowest') return (Number.isFinite(a.safetyScore) ? a.safetyScore : 101) - (Number.isFinite(b.safetyScore) ? b.safetyScore : 101);
    if (driverSort === 'decline') return (Number.isFinite(a.scoreChange) ? a.scoreChange : 99) - (Number.isFinite(b.scoreChange) ? b.scoreChange : 99);
    const priority = driver => { const record = driverPreferredRecord(driver); return !record ? 3 : record.state === 'manager_attention' ? 0 : ['completed', 'archived'].includes(record.state) ? 2 : 1; };
    return priority(a) - priority(b) || (a.safetyScore ?? 101) - (b.safetyScore ?? 101);
  });
  const rows = filtered.map(item => {
    const scored = Number.isFinite(item.safetyScore);
    const delta = scored && Number.isFinite(item.scoreChange) ? (item.scoreChange > 0 ? '+' : '') + item.scoreChange : '';
    const status = driverDirectoryStatus(item);
    const record = driverDirectorySession(item);
    const action = record
      ? 'data-open-session="' + escapeHtml(record.id) + '" aria-controls="driver-drawer" aria-label="View session for ' + escapeHtml(item.name) + '"'
      : 'data-create-driver-session="' + escapeHtml(item.name) + '" aria-controls="training-dialog" aria-label="Create session for ' + escapeHtml(item.name) + '"';
    const label = status.label;
    return '<tr class="directory-record"><td><button class="directory-person text-link" type="button" data-open-driver-profile="' + escapeHtml(item.name) + '" aria-haspopup="dialog" aria-expanded="' + (activeDriverProfile === item.name) + '" aria-controls="driver-drawer" aria-label="Open driver profile for ' + escapeHtml(item.name) + '"><span class="person-avatar" aria-hidden="true">' + item.initials + '</span><strong>' + escapeHtml(item.name) + '</strong></button></td>' +
      '<td class="num"><span class="driver-score"><strong>' + (scored ? item.safetyScore : '—') + '</strong><small class="' + (item.scoreChange >= 0 ? 'positive' : 'negative') + '">' + delta + '</small></span></td>' +
      '<td>' + escapeHtml(activeDriverCategory === 'all' ? item.focus : categoryNameFor(activeDriverCategory)) + '</td><td>' + escapeHtml(activeDriverCategory === 'all' ? (item.lastCoaching === '—' ? 'Not yet' : item.lastCoaching) : sessionCompletedLabel(driverScopedRecords(item.name).find(record => ['completed', 'archived'].includes(record.state)) || {})) + '</td>' +
      '<td>' + uiStatus(label) + '</td><td><button class="text-link" type="button" aria-haspopup="dialog" ' + action + '>' + (record ? 'View session' : 'Create session') + '</button></td></tr>';
  }).join('');
  document.getElementById('driver-directory').innerHTML = filtered.length
    ? uiTable('Driver directory', ['Driver', { label: 'Overall Elevate score', numeric: true }, activeDriverCategory === 'all' ? 'Top event' : 'Programme', 'Last coached', 'Status', 'Action'], rows) + '<div class="driver-directory-footer">' + (activeDriverCategory === 'all' ? 'Showing ' + filtered.length + ' of 1,024 drivers' : filtered.length + ' matching directory profiles · ' + escapeHtml(categoryNameFor(activeDriverCategory))) + '</div>'
    : '<div class="driver-directory-empty"><strong>No drivers match</strong><span>Change or clear the active filters.</span><button class="secondary-button" type="button" data-clear-driver-filter="all">Clear filters</button></div>';
  document.querySelectorAll('[data-driver-filter]').forEach(button => {
    const state = button.dataset.driverFilter;
    const badge = button.querySelector('b');
    if (badge) badge.textContent = activeDriverCategory === 'all' ? (state === 'all' ? '1,024' : currentCycleCounts().needsReview) : scopedDirectory.filter(item => driverMatchesStatus(item, state)).length;
  });
  renderDriverScopedKpis();
}

function syncDirectoryAttentionState(name, shouldRender = true) {
  const driver = directory.find((item) => item.name === name);
  if (!driver) return;
  const unresolvedInsight = attentionAiInsights.find((insight) => insight.name === name && !resolvedAttentionIds.has(insight.id));
  const attentionSession = allSessionRecords().find((session) => session.person === name && isAttentionSessionState(session.state));
  if (unresolvedInsight || attentionSession) {
    driver.state = 'attention';
    driver.stateLabel = attentionReasonMeta[attentionSession?.attentionReason || unresolvedInsight?.reason]?.label || 'Overdue';
    driver.focus = unresolvedInsight?.categoryName || attentionSession.category;
  } else if (driver.state === 'attention') {
    driver.state = 'coached';
    driver.stateLabel = 'Automated';
    driver.lastCoaching = 'This week';
  }
  if (shouldRender) renderDirectory();
}

function syncDirectoryAttentionStates() {
  directory.forEach((driver) => syncDirectoryAttentionState(driver.name, false));
}

// The Automation Centre spotlight lands on the driver inside Drivers, then opens their record.
function openDriverRecord(name, focusFootage = false, programId = null) {
  if (!name) return;
  pendingFootageFocus = Boolean(focusFootage);
  if (!directory.some(driver => driver.name === name)) {
    openAttentionDriver(name, programId);
    return;
  }
  activeDriverFilter = 'all';
  activeDriverGroup = 'all';
  activeDriverCategory = 'all';
  activeDriverScoreFilter = 'all';
  const driverSearch = document.getElementById('driver-search');
  if (driverSearch) driverSearch.value = name;
  setView('drivers', { focusHeading: false });
  window.setTimeout(() => {
    if (focusFootage) openAttentionDriver(name, programId);
    else openDriverProfile(name);
  }, 0);
}

function openAttentionDriver(name, programId = null) {
  const flag = activeCandidates().find(item => item.person === name && (!programId || item.categoryId === programId));
  if (flag) {
    startSessionForCandidate(flag.id);
    return;
  }
  const session = sessions.find((item) => item.person === name && (!programId || item.categoryId === programId) && item.state === 'manager_attention');
  if (session) {
    openSessionDrawer(session.id, { type: 'sessions' });
    return;
  }
  const insight = attentionAiInsights.find((item) => item.name === name && !resolvedAttentionIds.has(item.id));
  if (insight) {
    openAiCoach(insight.id);
    return;
  }
  showToast('Attention record opened for ' + name);
}

function renderLibrary() {
  renderDesignLibraryKpis();
  if (typeof TrainingLibrary !== 'undefined') {
    const term = document.getElementById('content-search')?.value.trim().toLowerCase() || '';
    const training = TrainingLibrary.metrics();
    const kpis = document.getElementById('content-kpis');
    if (kpis) kpis.innerHTML = uiKpiStrip('Training library summary', [
      { label: 'Courses', value: training.courses, context: 'Published authored courses, prepared previews, sample outlines and preserved imported lessons. Drafts stay separate.' },
      { label: 'Materials prepared', value: training.authored, context: 'Courses with prepared teaching and quiz materials. Video availability is shown on each course.' },
      { label: 'Incomplete lessons', value: training.incomplete, context: 'Imported lesson metadata still missing the video and quiz needed for assignment.' }
    ]);
    document.getElementById('library-grid').innerHTML = TrainingLibrary.render(term);
    if (typeof applyDesignLibrary === 'function') applyDesignLibrary(document.getElementById('view-library'));
    return;
  }
  renderLearningLibrary();
}

function settingsAreDirty() {
  return draftAutomationMode !== automationMode || draftCadenceWeeks !== cadenceWeeks || draftSessionDueDays !== sessionDueDays;
}

function settingsDraftProgramsAffected() {
  return categories.filter((category) => category.coached > 0).length;
}

function settingsDraftSummary() {
  if (!validSessionDueDays(draftSessionDueDays)) return 'Enter a whole number from 1 to 365 days for the session due period.';
  const parts = [];
  if (draftAutomationMode !== automationMode || draftCadenceWeeks !== cadenceWeeks) parts.push(settingsModeLabel(draftAutomationMode) + ' with coaching ' + (draftCadenceWeeks === 1 ? 'every week' : 'every 2 weeks'));
  if (draftSessionDueDays !== sessionDueDays) parts.push('New sessions due ' + sessionDuePeriodLabel(draftSessionDueDays).toLowerCase() + ' of creation');
  return parts.join(' · ') + ' will apply only after Save and activate.';
}

document.addEventListener('input', event => {
  if (event.target.id !== 'session-due-days') return;
  draftSessionDueDays = event.target.value === '' ? null : Number(event.target.value);
  settingsState = settingsAreDirty() ? 'dirty' : 'saved';
  settingsPanelMode = null;
  const valid = validSessionDueDays(draftSessionDueDays);
  event.target.setAttribute('aria-invalid', String(!valid));
  const status = document.getElementById('settings-save-state');
  if (status) {
    status.textContent = valid ? settingsAreDirty() ? 'Unsaved changes' : 'Saved ' + settingsSavedAt : 'Invalid due period';
    status.dataset.state = valid ? settingsState : 'error';
    status.classList.toggle('is-error', !valid);
    status.classList.toggle('is-dirty', valid && settingsAreDirty());
  }
  const impact = document.getElementById('settings-impact');
  if (impact) impact.dataset.state = valid ? settingsState : 'error';
  const summary = document.getElementById('settings-impact-summary');
  if (summary) summary.textContent = settingsAreDirty() ? settingsDraftSummary() : 'Saved in this browser. Preview shows settings only; activation does not run scoring, dispatch or reminders.';
  document.getElementById('settings-save').disabled = !settingsAreDirty() || !valid;
  document.getElementById('settings-discard').disabled = !settingsAreDirty();
  document.getElementById('settings-preview').disabled = !valid;
  document.getElementById('settings-preview-panel')?.remove();
  document.querySelector('.program-automation-history')?.remove();
  document.getElementById('settings-audit-history')?.setAttribute('aria-expanded', 'false');
});

function settingsModeLabel(mode) {
  return mode === 'fully' ? 'Fully automated' : mode === 'semi' ? 'Semi-automated' : 'Manual';
}

function persistSettings(mode, weeks, savedAt, dueDays = globalSessionDueDays()) {
  if (!validSessionDueDays(dueDays) || !['manual', 'semi', 'fully'].includes(mode) || ![1, 2].includes(weeks)) return false;
  try {
    if (!window.localStorage) return false;
    const next = { 'elevate-automation-mode': mode, 'elevate-cadence-weeks': String(weeks), 'elevate-settings-saved-at': savedAt, 'elevate-session-due-days': String(dueDays) };
    const previous = Object.fromEntries(Object.keys(next).map(key => [key, window.localStorage.getItem(key)]));
    try {
      Object.entries(next).forEach(([key, value]) => window.localStorage.setItem(key, value));
      return true;
    } catch (error) {
      Object.entries(previous).forEach(([key, value]) => {
        if (value === null) window.localStorage.removeItem(key);
        else window.localStorage.setItem(key, value);
      });
      return false;
    }
  } catch (error) { return false; }
}

function settingsPreviewCopy(mode, weeks, dueDays = globalSessionDueDays()) {
  const windowLabel = weeks === 1 ? '7-day' : '14-day';
  const dueCopy = ' New sessions: due ' + sessionDuePeriodLabel(dueDays).toLowerCase() + ' of creation. Existing deadlines stay unchanged.';
  if (mode === 'manual') {
    return {
      drivers: 'Not estimated',
      audit: 'Manual review only · ' + windowLabel + ' analysis window · due ' + dueDays + ' days from creation',
      description: 'Matches from the ' + windowLabel + ' analysis window would wait for manager review. Configuration preview only; rule evaluation and next-cycle volume are not available.' + dueCopy
    };
  }
  if (mode === 'semi') {
    return {
      drivers: 'Not estimated',
      audit: 'Manager approval required · ' + windowLabel + ' analysis window · due ' + dueDays + ' days from creation',
      description: 'Eligible matches from the ' + windowLabel + ' analysis window would wait for manager approval before coaching begins. Configuration preview only; rule evaluation and next-cycle volume are not available.' + dueCopy
    };
  }
  return {
    drivers: 'Not estimated',
    audit: 'Configured automation rules · ' + windowLabel + ' analysis window · due ' + dueDays + ' days from creation',
    description: 'Eligible matches from the ' + windowLabel + ' analysis window would follow the configured automated coaching rules. Configuration preview only; rule evaluation and next-cycle volume are not available.' + dueCopy
  };
}

function previewSettingsDraft() {
  if (!validSessionDueDays(draftSessionDueDays)) { document.getElementById('session-due-days')?.reportValidity(); return; }
  settingsPanelMode = 'preview';
  settingsState = settingsAreDirty() ? 'dirty' : 'saved';
  const now = new Intl.DateTimeFormat('en-CA', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' }).format(new Date()).replace(',', ' ·');
  const preview = settingsPreviewCopy(draftAutomationMode, draftCadenceWeeks, draftSessionDueDays);
  settingsAuditHistory.unshift({ action: 'Configuration preview', detail: preview.audit, time: now });
  saveSetting('elevate-settings-audit', JSON.stringify(settingsAuditHistory.slice(0, 20)));
  renderSettings();
  showToast('Configuration preview ready · rules have not been evaluated');
}

function discardSettingsDraft() {
  draftAutomationMode = automationMode;
  draftCadenceWeeks = cadenceWeeks;
  draftSessionDueDays = sessionDueDays;
  settingsState = 'saved';
  settingsPanelMode = null;
  renderSettings();
  showToast('Draft changes discarded');
}

function activateSettingsDraft() {
  if (!settingsAreDirty()) return;
  if (!validSessionDueDays(draftSessionDueDays)) { document.getElementById('session-due-days')?.reportValidity(); return; }
  const now = new Intl.DateTimeFormat('en-CA', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' }).format(new Date()).replace(',', ' ·');
  if (!persistSettings(draftAutomationMode, draftCadenceWeeks, now, draftSessionDueDays)) {
    settingsState = 'error';
    settingsPanelMode = null;
    renderSettings();
    showToast('Changes could not be activated');
    return;
  }
  automationMode = draftAutomationMode;
  cadenceWeeks = draftCadenceWeeks;
  sessionDueDays = draftSessionDueDays;
  settingsSavedAt = now;
  settingsState = 'saved';
  settingsPanelMode = null;
  automationRunSummary.mode = automationMode;
  automationRunSummary.cadenceWeeks = cadenceWeeks;
  const schedule = scheduleForCadence(cadenceWeeks);
  automationRunSummary.analysisWindow = schedule.analysisWindow;
  automationRunSummary.nextRun = schedule.nextRun;
  settingsAuditHistory.unshift({ action: 'Configuration activated', detail: settingsModeLabel(automationMode) + ' · ' + (cadenceWeeks === 1 ? 'weekly' : 'every 2 weeks') + ' · new sessions due ' + sessionDueDays + ' days from creation', time: settingsSavedAt });
  saveSetting('elevate-settings-audit', JSON.stringify(settingsAuditHistory.slice(0, 20)));
  renderSettings();
  syncFleetSessionCounts();
  showToast('Settings saved and activated');
}

function renderSettings() {
  if (settingsState !== 'error') settingsState = settingsAreDirty() ? 'dirty' : 'saved';
  if (currentView === 'programs' && programTab === 'automation' && typeof renderProgramsPage === 'function') renderProgramsPage();
  const status = document.getElementById('automation-command-status');
  if (status) status.innerHTML = escapeHtml((cadenceWeeks === 1 ? 'Runs Mondays' : 'Runs every other Monday') + ' · ' + settingsModeLabel(automationMode).toLowerCase()) + ' <b aria-hidden="true">›</b>';
}

const outcomeDetailViews = {
  get category() {
    return {
      label: 'Program',
      rows: outcomePrograms()
        .map((category) => ({ category, outcome: outcomeFor(category) }))
        .sort((a, b) => a.outcome.change - b.outcome.change)
        .map(({ category, outcome }) => [category.name, outcomeWindowLabel(), chartRate(outcome.before), chartRate(outcome.after), movementCopy(outcome.change), outcome.completion, outcome.label, outcome.improvedResult])
    };
  },
  cohort: {
    label: 'Group',
    rows: [
      ['New hires · first 90 days', '38 eligible drivers', '5.3', '3.6', '−32%', 87, 'Improved', true],
      ['Night operations', '42 eligible drivers', '4.1', '3.8', '−7%', 74, 'Review', false],
      ['Linehaul · West', '31 eligible drivers', '3.9', '2.5', '−36%', 89, 'Improved', true]
    ]
  },
  driver: {
    label: 'Driver',
    rows: [
      ['Jordan Lee', 'Following distance', '4.7', '2.6', '−45%', 100, 'Improved', true],
      ['Quinn Parker', 'Distracted driving', '3.1', '3.0', '−3%', 100, 'Review', false],
      ['Taylor Brooks', 'Speeding', '5.6', '3.4', '−39%', 100, 'Improved', true]
    ]
  }
};

function renderOutcomeTable() {
  const table = document.getElementById('outcome-table');
  if (!table) return;
  const view = outcomeDetailViews[outcomeTab];
  const infoIcon = '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="9"/><path d="M12 11v6m0-10v1"/></svg>';
  const periodHint = 'Before and after coaching, aligned to each coaching date. Rates are events per 1,000 trips.';
  table.innerHTML = [
    '<table class="analytics-data-table analytics-outcome-table"><caption class="sr-only">Coaching outcomes by ' + view.label.toLowerCase() + '. Event rates per 1,000 trips.</caption>',
    '<thead><tr><th scope="col">' + view.label + '</th><th scope="col" class="num"><span class="analytics-column-label">Before<button class="info-hint" type="button" data-tooltip="' + periodHint + '" aria-label="' + periodHint + '">' + infoIcon + '</button></span></th><th scope="col" class="num">After</th><th scope="col" class="num">Change</th><th scope="col" class="num">Completion</th><th scope="col">Result</th></tr></thead><tbody>',
    view.rows.map((row) => {
      const context = outcomeTab === 'category' ? '' : '<button class="info-hint" type="button" data-tooltip="' + escapeHtml(row[1]) + '" aria-label="' + escapeHtml(row[0] + ': ' + row[1]) + '">' + infoIcon + '</button>';
      const program = outcomeTab === 'category' && categories.find(category => category.name === row[0]);
      const name = program ? '<button class="text-link" type="button" data-open-category="' + program.id + '" aria-controls="view-programs">' + escapeHtml(row[0]) + '</button>' : escapeHtml(row[0]);
      return '<tr><th scope="row"><span class="analytics-row-name">' + name + context + '</span></th><td class="num">' + row[2] + '</td><td class="num">' + row[3] + '</td><td class="num ' + (row[7] ? 'positive' : '') + '">' + row[4] + '</td><td class="num">' + row[5] + '%</td><td>' + uiStatus(row[6]) + '</td></tr>';
    }).join(''),
    '</tbody></table>'
  ].join('');
}

function globalSearchRecords(query) {
  const normalized = query.trim().toLowerCase();
  if (!normalized) return [];
  const contains = (values) => values.filter(Boolean).join(' ').toLowerCase().includes(normalized);
  const records = [];
  categories.forEach((program) => {
    if (contains([program.name, program.description, program.training, 'program'])) {
      records.push({ kind: 'program', id: program.id, title: program.name, detail: coachingCounts((session) => session.categoryId === program.id).total + ' records · ' + coachingCounts((session) => session.categoryId === program.id).needs_review + ' need review', rank: program.name.toLowerCase().startsWith(normalized) ? 0 : 3 });
    }
  });
  sessions.forEach((session) => {
    const reasonLabel = attentionReasonMeta[session.attentionReason]?.label;
    if (contains([session.person, session.category, session.eventType, session.stateLabel, reasonLabel, session.source, 'session'])) {
      records.push({ kind: 'session', id: session.id, title: session.person, detail: session.category + ' · ' + (reasonLabel || session.stateLabel), rank: session.person.toLowerCase().startsWith(normalized) ? 1 : 4 });
    }
  });
  directory.forEach((driver) => {
    if (contains([driver.name, driver.group, driver.focus, driver.stateLabel, 'driver'])) {
      records.push({ kind: 'driver', id: driver.name, title: driver.name, detail: driver.group + ' · ' + driver.focus, rank: driver.name.toLowerCase().startsWith(normalized) ? 0 : 2 });
    }
  });
  attentionItems.forEach((item) => {
    const reasonLabel = attentionReasonMeta[item.reason]?.label;
    if (contains([item.name, item.group, item.program.name, reasonLabel, item.recommendedAction, item.criterion, 'attention'])) {
      records.push({
        kind: 'attention',
        id: item.id,
        title: item.name,
        detail: item.program.name + ' · ' + reasonLabel + ' · ' + item.recommendedAction,
        rank: item.name.toLowerCase().startsWith(normalized) ? 0 : 2
      });
    }
  });
  return records.sort((a, b) => a.rank - b.rank || a.title.localeCompare(b.title)).slice(0, 12);
}

function renderGlobalSearch(query = '') {
  const resultsNode = document.getElementById('global-search-results');
  const input = document.getElementById('global-search-input');
  if (!resultsNode || !input) return;
  const results = globalSearchRecords(query);
  input.setAttribute('aria-expanded', String(Boolean(query.trim())));
  if (!query.trim()) {
    resultsNode.innerHTML = '<div class="global-search-empty"><strong>Start typing to search</strong><span>Try a driver name, session status, or program such as Following distance.</span></div>';
    return;
  }
  if (!results.length) {
    resultsNode.innerHTML = '<div class="global-search-empty"><strong>No matching drivers, sessions, or programs</strong><span>Try a broader name, status, or program.</span></div>';
    return;
  }
  const typeLabel = { driver: 'Driver', session: 'Session', program: 'Program', attention: 'Attention' };
  resultsNode.innerHTML = results.map((result, index) => [
    '<button class="global-search-result" type="button" role="option" aria-selected="false" data-global-search-kind="' + result.kind + '" data-global-search-id="' + escapeHtml(result.id) + '"' + (index === 0 ? ' data-first-result' : '') + '>',
      '<span class="global-search-result-type">' + typeLabel[result.kind] + '</span>',
      '<span class="global-search-result-copy"><strong>' + escapeHtml(result.title) + '</strong><small>' + escapeHtml(result.detail) + '</small></span>',
      '<b aria-hidden="true">›</b>',
    '</button>'
  ].join('')).join('');
}

function openGlobalSearch() {
  const dialog = document.getElementById('global-search-dialog');
  const input = document.getElementById('global-search-input');
  if (!dialog || !input || dialog.open) return;
  globalSearchOpener = document.activeElement;
  input.value = '';
  renderGlobalSearch('');
  dialog.showModal();
  window.requestAnimationFrame(() => input.focus());
}

function closeGlobalSearch(restoreFocus = true) {
  const dialog = document.getElementById('global-search-dialog');
  if (dialog?.open) dialog.close();
  if (restoreFocus && globalSearchOpener && document.contains(globalSearchOpener)) globalSearchOpener.focus();
}

function openGlobalSearchResult(kind, id) {
  closeGlobalSearch(false);
  if (kind === 'attention') {
    setView('coaching', { focusHeading: false });
    window.setTimeout(() => openAiCoach(id), 0);
    return;
  }
  if (kind === 'program') {
    document.getElementById('global-search-trigger')?.focus();
    openCategoryDrawer(id);
    return;
  }
  if (kind === 'session') {
    activeSessionFilter = 'all';
    activeSessionSource = 'all';
    setView('inbox', { focusHeading: false });
    window.setTimeout(() => openSessionDrawer(id, { type: 'global-search' }), 0);
    return;
  }
  if (kind === 'driver') {
    activeDriverFilter = 'all';
    activeDriverGroup = 'all';
    activeDriverCategory = 'all';
    activeDriverScoreFilter = 'all';
    const driverSearch = document.getElementById('driver-search');
    if (driverSearch) driverSearch.value = id;
    setView('drivers');
    openDriverProfile(id);
  }
}

function openMobileMore() {
  const dialog = document.getElementById('mobile-more-dialog');
  const trigger = document.getElementById('mobile-more-trigger');
  if (!dialog || dialog.open) return;
  mobileMoreOpener = document.activeElement;
  trigger?.setAttribute('aria-expanded', 'true');
  dialog.showModal();
  window.requestAnimationFrame(() => dialog.querySelector('.mobile-more-link')?.focus());
}

function closeMobileMore(restoreFocus = true) {
  const dialog = document.getElementById('mobile-more-dialog');
  const trigger = document.getElementById('mobile-more-trigger');
  if (dialog?.open) dialog.close();
  trigger?.setAttribute('aria-expanded', 'false');
  if (restoreFocus && mobileMoreOpener && document.contains(mobileMoreOpener)) mobileMoreOpener.focus();
}

function openFilterSheet(trigger) {
  const sheet = trigger.closest('[data-filter-sheet]');
  if (!sheet) return;
  if (sheet.classList.contains('is-open')) { closeFilterSheet(sheet); return; }
  document.querySelectorAll('[data-filter-sheet].is-open').forEach((node) => {
    if (node !== sheet) closeFilterSheet(node, false);
  });
  filterSheetOpener = trigger;
  sheet.classList.add('is-open');
  document.body.classList.add('has-filter-sheet');
  trigger.setAttribute('aria-expanded', 'true');
  const content = sheet.querySelector('.filter-sheet-content');
  content?.setAttribute('role', 'dialog');
  content?.setAttribute('aria-modal', 'true');
  content?.setAttribute('aria-label', (sheet.dataset.filterSheet || 'Analytics') + ' filters');
  filterSheetInertState = [];
  let branch = sheet;
  while (branch.parentElement) {
    const parent = branch.parentElement;
    Array.from(parent.children).forEach((sibling) => {
      if (sibling === branch || sibling.matches?.('script')) return;
      filterSheetInertState.push({ node: sibling, inert: sibling.inert });
      sibling.inert = true;
    });
    branch = parent;
    if (parent === document.body) break;
  }
  window.requestAnimationFrame(() => content?.querySelector('[data-filter-sheet-close]')?.focus());
}

function closeFilterSheet(sheet, restoreFocus = true) {
  if (!sheet) return;
  sheet.classList.remove('is-open');
  document.body.classList.remove('has-filter-sheet');
  sheet.querySelector('[data-filter-sheet-trigger]')?.setAttribute('aria-expanded', 'false');
  const content = sheet.querySelector('.filter-sheet-content');
  content?.removeAttribute('role');
  content?.removeAttribute('aria-modal');
  content?.removeAttribute('aria-label');
  filterSheetInertState.forEach(({ node, inert }) => { node.inert = inert; });
  filterSheetInertState = [];
  if (restoreFocus && filterSheetOpener && document.contains(filterSheetOpener)) filterSheetOpener.focus();
}

function syncRadioGroups() {
  document.querySelectorAll('[role="radiogroup"]').forEach((group) => {
    const radios = Array.from(group.querySelectorAll('[role="radio"]'));
    if (!radios.length) return;
    const checked = radios.find((radio) => radio.getAttribute('aria-checked') === 'true') || radios[0];
    radios.forEach((radio) => { radio.tabIndex = radio === checked ? 0 : -1; });
  });
}

function showToast(message) {
  const toast = document.getElementById('toast');
  document.getElementById('toast-message').textContent = message;
  clearTimeout(toastTimer);
  toast.classList.add('is-visible');
  toastTimer = setTimeout(() => toast.classList.remove('is-visible'), 2800);
}

document.addEventListener('click', (event) => {
  if (event.target.closest('[data-program-attention]')) {
    const heading = document.getElementById('program-activity-attention-title');
    heading?.scrollIntoView({ block: 'start', behavior: 'instant' });
    heading?.focus({ preventScroll: true });
    return;
  }
  if (event.target.closest('#global-search-trigger')) {
    openGlobalSearch();
    return;
  }
  if (event.target.closest('[data-global-search-close]') || event.target === document.getElementById('global-search-dialog')) {
    closeGlobalSearch();
    return;
  }
  const globalResult = event.target.closest('[data-global-search-kind]');
  if (globalResult) {
    openGlobalSearchResult(globalResult.dataset.globalSearchKind, globalResult.dataset.globalSearchId);
    return;
  }
  if (event.target.closest('#mobile-more-trigger')) {
    openMobileMore();
    return;
  }
  if (event.target.closest('[data-open-global-search]')) {
    closeMobileMore(false);
    document.getElementById('mobile-more-trigger')?.focus();
    openGlobalSearch();
    return;
  }
  if (event.target.closest('[data-mobile-more-close]') || event.target === document.getElementById('mobile-more-dialog')) {
    closeMobileMore();
    return;
  }
  const mobileView = event.target.closest('[data-mobile-view]');
  if (mobileView) {
    closeMobileMore(false);
    if (mobileView.dataset.mobileView === 'outcomes') analyticsTab = 'outcomes';
    if (mobileView.dataset.mobileView === 'programs') { programPageReturn = null; openProgramPage('all'); return; }
    setView(mobileView.dataset.mobileView);
    return;
  }
  const filterSheetTrigger = event.target.closest('[data-filter-sheet-trigger]');
  if (filterSheetTrigger) {
    openFilterSheet(filterSheetTrigger);
    return;
  }
  const filterSheetClose = event.target.closest('[data-filter-sheet-close]');
  if (filterSheetClose) {
    closeFilterSheet(filterSheetClose.closest('[data-filter-sheet]'));
    return;
  }
  if (event.target.closest('[data-manual-session]')) {
    pendingCandidateId = null;
    openManualSessionDialog(currentView === 'programs' && selectedProgramId !== 'all' ? { categoryId: selectedProgramId } : categoryDrawer.open && activeCategory ? { categoryId: activeCategory.id } : null);
    return;
  }

  const createDriverSession = event.target.closest('[data-create-driver-session]');
  if (createDriverSession) {
    const driver = directory.find(item => item.name === createDriverSession.dataset.createDriverSession);
    if (!driver) return;
    const flag = activeDriverCategory === 'all' ? candidateFor(driver.name) : allSessionRecords().find(record => record.candidate && record.person === driver.name && record.categoryId === activeDriverCategory);
    if (flag) startSessionForCandidate(flag.id);
    else {
      pendingCandidateId = null;
      openManualSessionDialog({ person: driver.name, categoryId: activeDriverCategory !== 'all' ? activeDriverCategory : categories.find(category => category.name === driver.focus)?.id });
    }
    return;
  }

  if (event.target.closest('[data-confirm-manual-session]')) {
    createManualSession();
    return;
  }

  const startForButton = event.target.closest('[data-start-session-for]');
  if (startForButton) {
    startSessionForCandidate(startForButton.dataset.startSessionFor);
    return;
  }

  const driverRecordButton = event.target.closest('[data-open-driver-record]');
  if (driverRecordButton) {
    const focusFootage = driverRecordButton.hasAttribute('data-focus-footage');
    if (driverRecordButton.id === 'ai-priority-review' || focusFootage) {
      pendingFootageFocus = focusFootage;
      openAttentionDriver(driverRecordButton.dataset.openDriverRecord, driverRecordButton.dataset.priorityProgram);
    } else openDriverRecord(driverRecordButton.dataset.openDriverRecord, false, driverRecordButton.dataset.priorityProgram);
    return;
  }

  const groupButton = event.target.closest('[data-open-group]');
  if (groupButton) {
    openGroupDrawer(groupButton.dataset.openGroup);
    return;
  }

  const viewButton = event.target.closest('[data-view]');
  if (viewButton) {
    if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
    event.preventDefault();
    activeSessionId = null;
    if (viewButton.dataset.view === 'outcomes') analyticsTab = 'outcomes';
    if (viewButton.dataset.view === 'programs') { programPageReturn = null; programComparisonView = 'coaching'; openProgramPage('all'); return; }
    setView(viewButton.dataset.view);
    return;
  }

  const viewLink = event.target.closest('[data-view-link]');
  if (viewLink) {
    activeSessionId = null;
    if (viewLink.dataset.programLink) {
      openCategoryDrawer(viewLink.dataset.programLink, { stage: 'outcomes' });
      return;
    }
    if (viewLink.dataset.analyticsLink && analyticsTabs.includes(viewLink.dataset.analyticsLink)) { analyticsTab = viewLink.dataset.analyticsLink; if (analyticsTab !== 'drivers') selectedProgramId = 'all'; }
    if (viewLink.dataset.inboxFilter) {
      activeSessionFilter = normalizeSessionFilter(viewLink.dataset.inboxFilter);
      activeSessionSource = ['automated', 'manual_override'].includes(viewLink.dataset.inboxOrigin) ? viewLink.dataset.inboxOrigin : 'all';
      activeSessionProgram = categories.some(program => program.id === viewLink.dataset.inboxProgram) ? viewLink.dataset.inboxProgram : 'all';
      sessionSearch = '';
      const sessionSearchInput = document.getElementById('session-search');
      if (sessionSearchInput) sessionSearchInput.value = '';
    }
    if (viewLink.dataset.driverFilterLink) activeDriverFilter = viewLink.dataset.driverFilterLink;
    if (viewLink.dataset.driverProgramLink) activeDriverCategory = categories.some(program => program.id === viewLink.dataset.driverProgramLink) ? viewLink.dataset.driverProgramLink : 'all';
    if (viewLink.dataset.driverGroupLink) {
      activeDriverGroup = viewLink.dataset.driverGroupLink;
      activeDriverFilter = 'all';
      activeDriverScoreFilter = 'all';
      activeDriverCategory = categories.some(program => program.id === viewLink.dataset.driverProgramLink) ? viewLink.dataset.driverProgramLink : 'all';
      const driverSearch = document.getElementById('driver-search');
      if (driverSearch) driverSearch.value = '';
      const categoryFilter = document.getElementById('driver-category-filter');
      if (categoryFilter) categoryFilter.value = activeDriverCategory;
      const groupFilter = document.getElementById('driver-group-filter');
      if (groupFilter) groupFilter.value = activeDriverGroup;
    }
    setView(viewLink.dataset.viewLink);
    return;
  }

  const attentionDriverButton = event.target.closest('[data-open-attention-driver]');
  if (attentionDriverButton) {
    openAttentionDriver(attentionDriverButton.dataset.openAttentionDriver);
    return;
  }

  const programPageButton = event.target.closest('[data-open-program-page]');
  if (programPageButton) {
    if (programPageButton.closest('#program-comparison-table')) openCategoryDrawer(programPageButton.dataset.openProgramPage);
    else openProgramPage(programPageButton.dataset.openProgramPage, programPageButton.dataset.programPageTab);
    return;
  }
  if (event.target.closest('[data-back-program-page]')) { backToProgramSource(); return; }
  if (event.target.closest('[data-back-program-group]')) { backToProgramGroup(); return; }
  if (event.target.closest('[data-back-program-drawer]')) { closeDrawer(); return; }
  const categoryButton = event.target.closest('[data-open-category]');
  if (categoryButton) {
    openCategoryDrawer(categoryButton.dataset.openCategory);
    return;
  }

  if (event.target.closest('[data-close-category]') || event.target === categoryBackdrop || event.target.closest('[data-back-queue]')) {
    if (!driverDrawer.classList.contains('is-open')) closeCategoryDrawer();
    return;
  }

  if (event.target.closest('[data-back-category]')) {
    renderCategory();
    return;
  }

  if (event.target.closest('[data-back-driver-case]') && sessionDraft) {
    const caseId = sessionDraft.caseId;
    const caseKind = sessionDraft.caseKind;
    openDriverDrawer(caseId, caseKind);
    return;
  }

  const evidenceTabButton = event.target.closest('[data-draft-evidence-tab]');
  if (evidenceTabButton && sessionDraft) {
    sessionDraft.evidenceTab = evidenceTabButton.dataset.draftEvidenceTab;
    rerenderSessionComposer('[data-draft-evidence-tab="' + sessionDraft.evidenceTab + '"]');
    return;
  }

  const previewEvidenceButton = event.target.closest('[data-preview-evidence]');
  if (previewEvidenceButton && sessionDraft) {
    const evidenceId = previewEvidenceButton.dataset.previewEvidence;
    sessionDraft.previewEvidenceId = sessionDraft.previewEvidenceId === evidenceId ? null : evidenceId;
    rerenderSessionComposer();
    return;
  }

  if (event.target.closest('[data-close-evidence-preview]') && sessionDraft) {
    sessionDraft.previewEvidenceId = null;
    rerenderSessionComposer();
    return;
  }

  const removeEvidenceButton = event.target.closest('[data-remove-evidence]');
  if (removeEvidenceButton && sessionDraft) {
    sessionDraft.selectedEvidence.delete(removeEvidenceButton.dataset.removeEvidence);
    rerenderSessionComposer();
    return;
  }

  const draftMethodButton = event.target.closest('[data-draft-method]');
  if (draftMethodButton && sessionDraft) {
    sessionDraft.method = draftMethodButton.dataset.draftMethod;
    rerenderSessionComposer('[data-draft-method="' + sessionDraft.method + '"]');
    return;
  }

  if (event.target.closest('[data-dictate-message]')) {
    showToast('Voice dictation ready');
    return;
  }

  if (event.target.closest('[data-send-session-draft]')) {
    sendSessionDraft();
    return;
  }

  const queueLensButton = event.target.closest('[data-queue-lens]');
  if (queueLensButton && queueLensButton.closest('.queue-toolbar')) {
    queueLens = queueLensButton.dataset.queueLens;
    syncQueueLensControl();
    renderQueue();
    updateUrlState();
    return;
  }

  const queueStatusButton = event.target.closest('[data-queue-status]');
  if (queueStatusButton && queueStatusButton.closest('.queue-toolbar')) {
    queueStatus = queueStatusButton.dataset.queueStatus;
    document.querySelectorAll('.queue-toolbar [data-queue-status]').forEach((node) => {
      const active = node.dataset.queueStatus === queueStatus;
      node.classList.toggle('is-active', active);
      node.setAttribute('aria-checked', String(active));
      node.removeAttribute('aria-pressed');
      node.tabIndex = active ? 0 : -1;
    });
    renderQueue();
    updateUrlState();
    return;
  }

  const workflowButton = event.target.closest('[data-workflow-tab]');
  if (workflowButton) {
    workflowTab = workflowButton.dataset.workflowTab;
    trainingExpanded = false;
    rerenderCategoryPreservingScroll('#program-quick-tab-' + workflowTab);
    updateUrlState(true);
    return;
  }

  if (event.target.closest('[data-toggle-training]')) {
    trainingExpanded = !trainingExpanded;
    if (!trainingExpanded) trainingSearch = '';
    rerenderCategoryPreservingScroll();
    categoryDrawer.querySelector('.quick-training-card')?.scrollIntoView({ block: 'nearest' });
    return;
  }

  if (event.target.closest('[data-preview-training]')) {
    openTrainingDialog(null);
    return;
  }

  const singleTrainingButton = event.target.closest('[data-single-training]');
  if (singleTrainingButton) {
    openTrainingDialog(singleTrainingButton.dataset.singleTraining);
    return;
  }

  const confirmTraining = event.target.closest('[data-confirm-training]');
  if (confirmTraining) {
    trainingDialog.close();
    workflowTab = 'automated';
    renderCategory();
    showToast('Automation status refreshed');
    return;
  }

  const openDriverButton = event.target.closest('[data-open-driver]');
  if (openDriverButton) {
    openDriverDrawer(openDriverButton.dataset.openDriver, openDriverButton.dataset.caseKind);
    return;
  }

  const openAttentionSessionButton = event.target.closest('[data-open-attention-session]');
  if (openAttentionSessionButton) {
    const sessionId = openAttentionSessionButton.dataset.openAttentionSession;
    closeCategoryDrawer(false);
    setTimeout(() => openSessionDrawer(sessionId, { type: 'automation-centre' }), 220);
    return;
  }

  const markAttentionButton = event.target.closest('[data-mark-attention-reviewed]');
  if (markAttentionButton) {
    markAttentionReviewed(markAttentionButton.dataset.markAttentionReviewed);
    return;
  }

  const resolveAttentionButton = event.target.closest('[data-resolve-attention]');
  if (resolveAttentionButton) {
    resolveAttentionInsight(resolveAttentionButton.dataset.resolveAttention);
    return;
  }

  if (event.target.closest('[data-close-drawer]') || event.target === drawerBackdrop) {
    closeDrawer();
    return;
  }

  const startSessionButton = event.target.closest('[data-start-session]');
  if (startSessionButton) {
    startSession(startSessionButton.dataset.startSession);
    return;
  }

  if (event.target.closest('[data-clear-session-filters]')) {
    activeSessionSource = 'all';
    activeSessionProgram = 'all';
    if (attentionReasonMeta[activeSessionFilter]) activeSessionFilter = 'manager_attention';
    renderInbox();
    updateUrlState();
    return;
  }

  const overviewReason = event.target.closest('[data-overview-session-reason]');
  if (overviewReason) {
    activeSessionFilter = overviewReason.dataset.overviewSessionReason;
    activeSessionSource = 'all';
    sessionSearch = '';
    activeSessionId = null;
    document.getElementById('session-search').value = '';
    renderInbox();
    updateUrlState();
    overviewReason.focus({ preventScroll: true });
    return;
  }

  const overviewSession = event.target.closest('[data-overview-session-state]');
  if (overviewSession) {
    activeSessionFilter = overviewSession.dataset.overviewSessionState;
    activeSessionSource = overviewSession.dataset.overviewSessionOrigin;
    activeSessionProgram = 'all';
    sessionSearch = '';
    activeSessionId = null;
    document.getElementById('session-search').value = '';
    setView('inbox');
    return;
  }

  const overviewDriver = event.target.closest('[data-overview-driver]');
  if (overviewDriver && overviewDriver.dataset.overviewDriver) {
    activeDriverFilter = 'all';
    activeDriverGroup = 'all';
    activeDriverScoreFilter = 'all';
    activeDriverCategory = 'all';
    document.getElementById('driver-search').value = overviewDriver.dataset.overviewDriver;
    document.getElementById('driver-group-filter').value = 'all';
    document.getElementById('driver-category-filter').value = 'all';
    document.querySelectorAll('[data-driver-filter]').forEach(button => button.classList.toggle('is-active', button.dataset.driverFilter === 'all'));
    renderDirectory();
    updateUrlState();
    (document.querySelector('[data-overview-driver="' + overviewDriver.dataset.overviewDriver.replace(/"/g, '\\"') + '"]') || overviewDriver).focus({ preventScroll: true });
    return;
  }

  const sessionFilterButton = event.target.closest('[data-session-filter]');
  if (sessionFilterButton) {
    activeSessionFilter = normalizeSessionFilter(sessionFilterButton.dataset.sessionFilter);
    activeSessionId = null;
    renderInbox();
    document.getElementById('session-view-tabs').querySelector('[data-session-filter="' + activeSessionFilter + '"]')?.focus();
    updateUrlState();
    return;
  }

  const sessionSourceButton = event.target.closest('[data-session-source]');
  if (sessionSourceButton) {
    activeSessionSource = normalizeSessionOrigin(sessionSourceButton.dataset.sessionSource);
    activeSessionId = null;
    renderInbox();
    updateUrlState();
    return;
  }

  const openSessionButton = event.target.closest('[data-open-session]');
  if (openSessionButton) {
    if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
    event.preventDefault();
    if (openSessionButton.closest('.profile-shell')) {
      openProfileSession(openSessionButton.dataset.openSession);
      return;
    }
    openSessionDrawer(openSessionButton.dataset.openSession, { type: currentView === 'programs' ? 'program-page' : 'sessions' });
    return;
  }

  if (event.target.closest('[data-send-reply]')) {
    sendSessionWorkspaceReply();
    return;
  }

  const outcomeTabButton = event.target.closest('[data-outcome-tab]');
  if (outcomeTabButton) {
    outcomeTab = outcomeTabButton.dataset.outcomeTab;
    document.querySelectorAll('[data-outcome-tab]').forEach((node) => {
      const active = node.dataset.outcomeTab === outcomeTab;
      node.classList.toggle('is-active', active);
      node.setAttribute('aria-checked', String(active));
      node.removeAttribute('aria-pressed');
      node.tabIndex = active ? 0 : -1;
    });
    renderOutcomeTable();
    renderOutcomeProgressChart();
    updateUrlState();
    return;
  }

  const outcomeSortButton = event.target.closest('[data-outcome-sort]');
  if (outcomeSortButton) {
    outcomeSort = outcomeSortButton.dataset.outcomeSort;
    renderOutcomeProgressChart();
    return;
  }

  const analyticsTabButton = event.target.closest('[data-analytics-tab]');
  if (analyticsTabButton) {
    analyticsTab = analyticsTabButton.dataset.analyticsTab;
    if (['drivers', 'groups'].includes(analyticsTab)) {
      setView(analyticsTab);
      return;
    }
    renderAnalytics();
    updateUrlState();
    return;
  }

  if (event.target.closest('[data-complete-session]')) {
    const session = sessions.find((item) => item.id === activeSessionId);
    if (session) {
      const linkedInsight = attentionAiInsights.find((insight) => (
        insight.name === session.person &&
        insight.categoryId === session.categoryId &&
        !resolvedAttentionIds.has(insight.id)
      ));
      if (linkedInsight && isAttentionSessionState(session.state)) {
        resolveAttentionInsight(linkedInsight.id);
        activeSessionFilter = 'completed';
        closeDrawer();
        renderInbox();
        return;
      }
      const previousState = session.state;
      const previousReason = session.attentionReason;
      session.state = 'completed';
      session.stateLabel = 'Completed';
      session.attentionReason = null;
      session.latest = 'Manager closed follow-up · just now';
      session.sla = session.slaTone === 'overdue' ? 'Missed' : 'Met';
      session.slaTone = session.slaTone === 'overdue' ? 'overdue' : 'met';
      session.history.unshift(['Session closed', 'Just now']);
      showToast('Session completed; outcome monitoring started');
      adjustSessionFleetTotals(previousState, session.state, session.source, previousReason, null);
    }
    activeSessionFilter = session && session.state === 'archived' ? 'archived' : 'completed';
    closeDrawer();
    renderInbox();
    return;
  }

  if (event.target.closest('[data-archive-session]')) {
    const session = sessions.find((item) => item.id === activeSessionId);
    if (session) {
      const previousState = session.state;
      const previousReason = session.attentionReason;
      session.weeksAgo = sessionWeeksAgo(session);
      session.state = 'archived';
      session.stateLabel = 'Archived';
      session.attentionReason = null;
      session.latest = 'Archived · just now';
      session.history.unshift(['Archived', 'Just now']);
      adjustSessionFleetTotals(previousState, session.state, session.source, previousReason, null);
    }
    activeSessionFilter = 'archived';
    closeDrawer();
    renderInbox();
    showToast('Session archived');
    return;
  }

  if (event.target.closest('[data-restore-session]')) {
    const session = sessions.find((item) => item.id === activeSessionId);
    if (session) {
      const previousState = session.state;
      session.state = 'completed';
      session.stateLabel = 'Completed';
      session.latest = 'Restored to completed · just now';
      session.history.unshift(['Restored', 'Just now']);
      adjustSessionFleetTotals(previousState, session.state, session.source);
    }
    activeSessionFilter = 'completed';
    closeDrawer();
    renderInbox();
    showToast('Session restored');
    return;
  }

  const driverFilterButton = event.target.closest('[data-driver-filter]');
  if (driverFilterButton) {
    activeDriverFilter = driverFilterButton.dataset.driverFilter;
    document.querySelectorAll('[data-driver-filter]').forEach((node) => node.classList.toggle('is-active', node.dataset.driverFilter === activeDriverFilter));
    renderDirectory();
    updateUrlState();
    return;
  }

  const automationModeButton = event.target.closest('[data-automation-mode]');
  if (automationModeButton) {
    draftAutomationMode = automationModeButton.dataset.automationMode;
    settingsState = settingsAreDirty() ? 'dirty' : 'saved';
    settingsPanelMode = null;
    renderSettings();
    return;
  }

  const cadenceButton = event.target.closest('[data-cadence]');
  if (cadenceButton) {
    draftCadenceWeeks = Number(cadenceButton.dataset.cadence);
    settingsState = settingsAreDirty() ? 'dirty' : 'saved';
    settingsPanelMode = null;
    renderSettings();
    return;
  }

  if (event.target.closest('#settings-discard')) {
    discardSettingsDraft();
    return;
  }

  if (event.target.closest('#settings-preview')) {
    previewSettingsDraft();
    return;
  }

  if (event.target.closest('#settings-save')) {
    activateSettingsDraft();
    return;
  }

  if (event.target.closest('#settings-audit-history')) {
    settingsPanelMode = settingsPanelMode === 'audit' ? null : 'audit';
    renderSettings();
    return;
  }

  const driverScoreFilterButton = event.target.closest('[data-driver-score-filter]');
  if (driverScoreFilterButton) {
    if (driverScoreFilterButton.closest('.overview-band')) {
      activeDriverFilter = 'all';
      activeDriverGroup = 'all';
      activeDriverCategory = 'all';
      document.getElementById('driver-search').value = '';
      document.getElementById('driver-group-filter').value = 'all';
      document.getElementById('driver-category-filter').value = 'all';
      document.querySelectorAll('[data-driver-filter]').forEach(button => button.classList.toggle('is-active', button.dataset.driverFilter === 'all'));
    }
    const nextFilter = driverScoreFilterButton.dataset.driverScoreFilter;
    activeDriverScoreFilter = activeDriverScoreFilter === nextFilter ? 'all' : nextFilter;
    renderDirectory();
    updateUrlState();
    return;
  }

  const clearDriverFilterButton = event.target.closest('[data-clear-driver-filter]');
  if (clearDriverFilterButton) {
    const filter = clearDriverFilterButton.dataset.clearDriverFilter;
    if (filter === 'score' || filter === 'all') activeDriverScoreFilter = 'all';
    if (filter === 'group' || filter === 'all') {
      activeDriverGroup = 'all';
      document.getElementById('driver-group-filter').value = 'all';
    }
    if (filter === 'category' || filter === 'program' || filter === 'all') {
      activeDriverCategory = 'all';
      document.getElementById('driver-category-filter').value = 'all';
    }
    if (filter === 'all') {
      driverSort = 'action';
      document.getElementById('driver-sort').value = 'action';
      activeDriverFilter = 'all';
      const driverSearchInput = document.getElementById('driver-search');
      if (driverSearchInput) driverSearchInput.value = '';
      document.querySelectorAll('[data-driver-filter]').forEach((node) => node.classList.toggle('is-active', node.dataset.driverFilter === 'all'));
    }
    renderDirectory();
    updateUrlState();
    return;
  }

  const toastButton = event.target.closest('[data-toast]');
  if (toastButton) {
    showToast(toastButton.dataset.toast);
    return;
  }

  if (event.target.closest('[data-scroll-directed]')) {
    document.getElementById('coaching-work')?.scrollIntoView({ behavior: 'smooth' });
    return;
  }

});

document.addEventListener('change', (event) => {
  if (event.target.matches('[data-draft-evidence]') && sessionDraft) {
    if (event.target.checked) sessionDraft.selectedEvidence.add(event.target.dataset.draftEvidence);
    else sessionDraft.selectedEvidence.delete(event.target.dataset.draftEvidence);
    rerenderSessionComposer();
    return;
  }

  if (event.target.matches('[data-draft-option]') && sessionDraft) {
    sessionDraft[event.target.dataset.draftOption] = event.target.checked;
    rerenderSessionComposer();
    return;
  }

  if (event.target.matches('[data-bulk-training]') && activeCategory) {
    const scope = getCoachingScope(activeCategory);
    scope.selected = event.target.checked
      ? new Set(scope.quickCases.map((item) => item.id))
      : new Set();
    rerenderCategoryPreservingScroll();
    return;
  }

});

document.addEventListener('input', (event) => {
  if (event.target.matches('[data-draft-field]') && sessionDraft) {
    sessionDraft[event.target.dataset.draftField] = event.target.value;
    return;
  }
  if (event.target.matches('[data-training-search]') && activeCategory) {
    trainingSearch = event.target.value;
    rerenderCategoryPreservingScroll('[data-training-search]');
  }
});

document.addEventListener('change', (event) => {
  if (event.target.id === 'session-program-filter') {
    activeSessionProgram = event.target.value;
  } else if (event.target.id === 'session-origin-filter') {
    activeSessionSource = normalizeSessionOrigin(event.target.value);
  } else if (event.target.id === 'session-reason-filter') {
    activeSessionFilter = event.target.value === 'all' ? 'manager_attention' : event.target.value;
  } else return;
  renderInbox();
  updateUrlState();
});

document.getElementById('driver-search')?.addEventListener('input', () => {
  renderDirectory();
  if (currentView === 'drivers') updateUrlState(true);
});
document.getElementById('session-search').addEventListener('input', (event) => {
  sessionSearch = event.target.value;
  renderInbox();
  updateUrlState(true);
});
document.getElementById('driver-group-filter').addEventListener('change', (event) => {
  activeDriverGroup = event.target.value;
  renderDirectory();
  updateUrlState();
});
document.getElementById('driver-category-filter').addEventListener('change', (event) => {
  activeDriverCategory = event.target.value;
  renderDirectory();
  updateUrlState();
});
document.getElementById('driver-sort').addEventListener('change', (event) => {
  driverSort = event.target.value;
  renderDirectory();
  updateUrlState();
});
document.getElementById('global-search-input')?.addEventListener('input', (event) => renderGlobalSearch(event.target.value));
document.getElementById('global-search-dialog')?.addEventListener('close', () => {
  document.getElementById('global-search-input')?.setAttribute('aria-expanded', 'false');
});
document.getElementById('mobile-more-dialog')?.addEventListener('close', () => document.getElementById('mobile-more-trigger')?.setAttribute('aria-expanded', 'false'));
document.addEventListener('focusin', (event) => {
  const result = event.target.closest?.('.global-search-result');
  if (!result) return;
  result.closest('#global-search-results')?.querySelectorAll('.global-search-result').forEach((item) => item.setAttribute('aria-selected', String(item === result)));
});
window.addEventListener('popstate', applyUrlState);
window.addEventListener('hashchange', () => {
  if (window.location.hash !== '#main-content') applyUrlState();
});
document.addEventListener('keydown', (event) => {
  const editing = event.target.matches?.('input, textarea, select, [contenteditable="true"]');
  const globalDialog = document.getElementById('global-search-dialog');
  if (globalDialog?.open) {
    const results = Array.from(globalDialog.querySelectorAll('.global-search-result'));
    if ((event.key === 'ArrowDown' || event.key === 'ArrowUp') && results.length) {
      event.preventDefault();
      const index = results.indexOf(document.activeElement);
      const nextIndex = event.key === 'ArrowDown'
        ? (index + 1 + results.length) % results.length
        : (index < 0 ? results.length - 1 : index - 1 + results.length) % results.length;
      results[nextIndex].focus();
      results.forEach((result, resultIndex) => result.setAttribute('aria-selected', String(resultIndex === nextIndex)));
      return;
    }
    if (event.key === 'Enter' && event.target.id === 'global-search-input' && results[0]) {
      event.preventDefault();
      results[0].click();
    }
    return;
  }
  const openFilter = document.querySelector('[data-filter-sheet].is-open');
  if (event.key === 'Escape' && openFilter) {
    event.preventDefault();
    closeFilterSheet(openFilter);
    return;
  }
  if (openFilter && event.key === 'Tab') {
    const filterDialog = openFilter.querySelector('.filter-sheet-content');
    const focusable = Array.from(filterDialog?.querySelectorAll('button:not([disabled]), input:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])') || []).filter((node) => node.offsetParent !== null);
    if (!focusable.length) return;
    const first = focusable[0];
    const last = focusable[focusable.length - 1];
    if (event.shiftKey && document.activeElement === first) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault();
      first.focus();
    }
    return;
  }
  const currentTab = event.target.closest?.('[role="tab"]');
  if (currentTab && ['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(event.key)) {
    const tabs = Array.from(currentTab.closest('[role="tablist"]').querySelectorAll('[role="tab"]'));
    let index = tabs.indexOf(currentTab);
    if (event.key === 'Home') index = 0;
    else if (event.key === 'End') index = tabs.length - 1;
    else index = (index + (event.key === 'ArrowRight' ? 1 : -1) + tabs.length) % tabs.length;
    event.preventDefault();
    tabs.forEach((tab, tabIndex) => { tab.tabIndex = tabIndex === index ? 0 : -1; });
    tabs[index].focus();
    return;
  }
  const currentRadio = event.target.closest?.('[role="radio"]');
  if (currentRadio && ['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', 'Home', 'End'].includes(event.key)) {
    const group = currentRadio.closest('[role="radiogroup"]');
    const radios = Array.from(group?.querySelectorAll('[role="radio"]') || []).filter((radio) => !radio.disabled);
    if (!radios.length) return;
    let index = radios.indexOf(currentRadio);
    if (event.key === 'Home') index = 0;
    else if (event.key === 'End') index = radios.length - 1;
    else index = (index + (event.key === 'ArrowRight' || event.key === 'ArrowDown' ? 1 : -1) + radios.length) % radios.length;
    event.preventDefault();
    radios[index].focus();
    radios[index].click();
    window.requestAnimationFrame(syncRadioGroups);
    return;
  }
  if (document.querySelector('dialog[open]')) return;
  const activeDrawer = driverDrawer.classList.contains('is-open')
    ? driverDrawer
    : categoryDrawer.classList.contains('is-open')
      ? categoryDrawer
      : null;
  if (!activeDrawer) return;
  if (event.key === 'Escape') {
    if (activeDrawer === driverDrawer) closeDrawer();
    else closeCategoryDrawer();
    return;
  }
  if (event.key === 'Tab') {
    const focusable = Array.from(activeDrawer.querySelectorAll('button:not([disabled]), summary, input:not([disabled]), textarea:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])')).filter(node => node.tabIndex !== -1 && node.getClientRects().length && getComputedStyle(node).visibility !== 'hidden');
    if (!focusable.length) return;
    const first = focusable[0];
    const last = focusable[focusable.length - 1];
    if (event.shiftKey && document.activeElement === first) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault();
      first.focus();
    }
  }
});

if (typeof CourseAuthoringStore !== 'undefined') CourseAuthoringStore.init();
if (typeof ProgramSetup !== 'undefined') ProgramSetup.init();

document.addEventListener('click', event => {
  if (event.target.closest('[data-open-program-setup]') && typeof ProgramSetup !== 'undefined') {
    openProgramPage('all', 'configuration');
    ProgramSetup.start();
  }
});

renderOutcomeProgressChart();
updateAiCommandPreview();
renderQueue();
syncFleetSessionCounts();
syncGroupDisplay();
renderInbox();
syncDirectoryAttentionStates();
renderDirectory();
renderLibrary();
renderOutcomeTable();
renderSettings();
applyUrlState();
syncRadioGroups();
updateUrlState(true);

document.addEventListener('change', (event) => {
  if (event.target.id === 'landing-program-filter') {
    landingProgramId = event.target.value;
    renderHomeOverview();
    updateUrlState();
    return;
  }
  if (event.target.id === 'groups-program-filter') {
    groupsProgramId = categories.some(program => program.id === event.target.value) ? event.target.value : 'all';
    syncGroupDisplay();
    updateUrlState();
    requestAnimationFrame(() => document.getElementById('groups-program-filter')?.focus({ preventScroll: true }));
    return;
  }
  const control = event.target.closest('[data-coaching-period]');
  if (!control) return;
  const weeks = Number(control.value);
  if (![1, 4, 8].includes(weeks)) return;
  coachingPeriod = weeks;
  refreshPeriodData();
  if (categoryDrawer.classList.contains('is-open')) {
    if (activeCategory) rerenderCategoryPreservingScroll('#category-period');
    else if (categoryDrawerReturnTarget?.type === 'group') openGroupDrawer(categoryDrawerReturnTarget.id);
  }
  updateUrlState();
});
