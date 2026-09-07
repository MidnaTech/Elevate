const escapeHtml = (value) => String(value).replace(/[&<>"']/g, (character) => ({
  '&': '&amp;',
  '<': '&lt;',
  '>': '&gt;',
  '"': '&quot;',
  "'": '&#039;'
})[character]);

/** @typedef {'system_handling' | 'manager_attention' | 'completed' | 'archived'} SessionLifecycleState */
/** @typedef {'driver_reply' | 'reminders_exhausted' | 'repeat_after_coaching' | 'session_needed'} AttentionReason */
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
 * @property {{identified: number, coached: number, completed: number, systemHandled: number, escalated: number}} counts
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
  session_needed: { label: 'Session needed', shortLabel: 'Session needed', action: 'Start session', tone: 'issue' },
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
  if (session.origin !== 'manual_override' && session.source === 'Automated') return 'Automated';
  return session.owner && session.owner !== 'Unassigned' ? session.owner : 'Manager';
}

function inProgressLabel(origin) {
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
  { id: 'ai-harper-distraction', categoryId: 'distraction', caseKind: 'directed', caseIndex: 0, safetyScore: 58, scoreChange: -8, criterion: 'Overdue after reminder', attentionReason: 'overdue', tone: 'risk', insight: 'The video-confirmed distraction session remains incomplete after automatic reminders, alongside a falling safety score.' },
  { id: 'ai-morgan-speeding', categoryId: 'speeding', caseKind: 'directed', caseIndex: 0, safetyScore: 63, scoreChange: -6, criterion: 'Repeated after coaching', attentionReason: 'repeat', tone: 'risk', insight: 'High-severity speeding continued across separate trips after previous coaching.' },
  { id: 'ai-jamie-braking', categoryId: 'braking', caseKind: 'directed', caseIndex: 0, safetyScore: 67, scoreChange: -3, criterion: 'Repeated after coaching', attentionReason: 'repeat', tone: 'watch', insight: 'Harsh-braking events returned after training, suggesting that a direct conversation may work better than another lesson.' },
  { id: 'ai-skyler-distraction', categoryId: 'distraction', caseKind: 'directed', caseIndex: 2, safetyScore: 64, scoreChange: -5, criterion: 'Driver replied', attentionReason: 'reply', tone: 'risk', insight: 'The driver asked for a manager review of a video-confirmed distraction event after the automated session.' },
  { id: 'ai-priya-speeding', categoryId: 'speeding', caseKind: 'quick', caseIndex: 1, safetyScore: 58, scoreChange: -9, criterion: 'Overdue after reminder', attentionReason: 'overdue', tone: 'risk', insight: 'The mapped lesson was assigned automatically, but it remains incomplete after the reminder window.' },
  { id: 'ai-bailey-fatigue', categoryId: 'fatigue', caseKind: 'directed', caseIndex: 0, safetyScore: 55, scoreChange: -7, criterion: 'Overdue after reminder', attentionReason: 'overdue', tone: 'risk', insight: 'The fatigue session remains incomplete after automatic reminders while the safety score continues to decline.' },
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
        'Safety score ' + insight.safetyScore,
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

const lessons = [
  { title: 'Following Distance Basics', category: 'Following distance', length: '2 min video', version: 'v3.2', completion: '76%' },
  { title: 'Managing Speed', category: 'Speeding', length: '3 min video', version: 'v2.6', completion: '83%' },
  { title: 'Anticipation & Space', category: 'Harsh braking', length: '2 min video', version: 'v1.9', completion: '91%' },
  { title: 'Eyes Forward', category: 'Distracted driving', length: '2 min video', version: 'v2.1', completion: '74%' },
  { title: 'Buckle Every Trip', category: 'Seat belt use', length: '90 sec video', version: 'v1.7', completion: '88%' },
  { title: 'Fatigue Awareness', category: 'Driver fatigue', length: '3 min video', version: 'v2.0', completion: '79%' }
];

let queueStatus = 'needs';
let queueLens = 'program';
let coachingPeriod = 1;
let activeCategory = null;
let workflowTab = 'needs';
let trainingExpanded = false;
let trainingSearch = '';
let activeSessionFilter = 'manager_attention';
let activeSessionSource = 'all';
let sessionSearch = '';
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
const savedCadenceWeeks = Number(readSavedSetting('elevate-cadence-weeks', '1'));
let automationMode = ['manual', 'semi', 'fully'].includes(savedAutomationMode) ? savedAutomationMode : 'fully';
let cadenceWeeks = [1, 2].includes(savedCadenceWeeks) ? savedCadenceWeeks : 1;
let draftAutomationMode = automationMode;
let draftCadenceWeeks = cadenceWeeks;
let settingsState = 'saved';
let settingsPanelMode = null;

// ---- Safety event types and coaching rules ------------------------------------
// Event types decide what automation listens for; rules decide what it does when they match.
// Both are drafted, previewed, and activated with the rest of the automation settings.
function defaultEventTypeRules() {
  return categories.flatMap((category) => (category.eventTypes || []).map((type, index) => {
    const directed = type.path === 'Directed 1:1';
    const severity = directed || /critical|after|repeat|phone|fatigue|drows/i.test(type.name) ? 'High' : index === 0 ? 'Medium' : 'Low';
    return {
      id: type.id,
      programId: category.id,
      name: type.name,
      severity,
      threshold: directed || category.id === 'distraction' ? 1 : 5,
      videoRequired: category.id === 'distraction' || /repeat|after/i.test(type.name),
      path: directed ? 'one_to_one' : 'lesson',
      enabled: true
    };
  }));
}
function defaultCoachingRules() {
  return [
    { id: 'rule-repeat', scope: 'all', condition: 'repeat_after_coaching', count: 2, action: 'one_to_one' },
    { id: 'rule-speeding-severe', scope: 'speeding', condition: 'severity_high', count: 1, action: 'one_to_one' },
    { id: 'rule-distraction-video', scope: 'distraction', condition: 'video_confirmed', count: 1, action: 'lesson' },
    { id: 'rule-volume', scope: 'all', condition: 'count_threshold', count: 8, action: 'manager_review' }
  ];
}
const ruleConditionLabels = {
  severity_high: 'a high-severity event',
  repeat_after_coaching: 'a repeat after coaching',
  video_confirmed: 'a video-confirmed event',
  count_threshold: 'or more events in one cycle'
};
const ruleActionLabels = {
  lesson: 'assign the mapped lesson',
  one_to_one: 'schedule a one-to-one',
  manager_review: 'hold for manager review',
  none: 'take no coaching action'
};
const severityOptions = { Low: 'Low', Medium: 'Medium', High: 'High' };
const coachingPathOptions = { lesson: 'Mapped lesson', one_to_one: 'One-to-one' };
function cloneJson(value) {
  return JSON.parse(JSON.stringify(value));
}
let eventTypeRules = readSavedJson('elevate-event-types', null);
if (!Array.isArray(eventTypeRules) || !eventTypeRules.length) eventTypeRules = defaultEventTypeRules();
let coachingRules = readSavedJson('elevate-coaching-rules', null);
if (!Array.isArray(coachingRules)) coachingRules = defaultCoachingRules();
let draftEventTypeRules = cloneJson(eventTypeRules);
let draftCoachingRules = cloneJson(coachingRules);
let eventTypeFormOpen = false;
let settingsSavedAt = readSavedSetting('elevate-settings-saved-at', 'Sep 4 · 9:12 AM');
let settingsAuditHistory = readSavedJson('elevate-settings-audit', [
  { action: 'Configuration activated', detail: (automationMode === 'fully' ? 'Fully automated' : automationMode === 'semi' ? 'Semi-automated' : 'Manual') + ' · ' + (cadenceWeeks === 1 ? 'weekly' : 'every 2 weeks'), time: settingsSavedAt },
  { action: 'Dry run completed', detail: '154 records evaluated · no changes applied', time: 'Sep 3 · 3:40 PM' }
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
  counts: { identified: 154, coached: 150, completed: 130, systemHandled: 10, escalated: 14 }
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

// Archived records are earlier completions; widening the period brings them back as completed.
function sessionInPeriod(session) {
  if (session.state !== 'archived') return true;
  return coachingPeriod > 1 && sessionWeeksAgo(session) < coachingPeriod;
}

function sessionsInPeriod(predicate) {
  return allSessionRecords().filter((session) => sessionInPeriod(session) && predicate(session));
}

function sessionTab(session) {
  if (session.state === 'manager_attention') return 'needs';
  if (session.state === 'completed' || session.state === 'archived') return 'completed';
  return session.origin === 'manual_override' ? 'one_to_one' : 'automated';
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
  if (currentView === 'outcomes') renderAnalytics();
}

function coachingCounts(predicate) {
  const counts = { automated: 0, one_to_one: 0, needs_review: 0, completed: 0, total: 0 };
  allSessionRecords().forEach((session) => {
    if (!sessionInPeriod(session) || !predicate(session)) return;
    counts.total += 1;
    if (session.state === 'archived') { counts.completed += 1; return; }
    if (session.state === 'manager_attention') counts.needs_review += 1;
    else if (session.state === 'completed') counts.completed += 1;
    else if (session.origin === 'manual_override') counts.one_to_one += 1;
    else counts.automated += 1;
  });
  return counts;
}

function driverOrigin(name) {
  return sessions.some((session) => session.person === name && session.state !== 'archived' && session.origin === 'manual_override') ? 'manual_override' : 'automated';
}

function driverMatchesStatus(item, filter) {
  if (filter === 'all') return true;
  if (filter === 'automated') return item.state === 'coached' && driverOrigin(item.name) !== 'manual_override';
  if (filter === 'one_to_one') return item.state === 'coached' && driverOrigin(item.name) === 'manual_override';
  if (filter === 'completed' || filter === 'outcome') return item.state === 'outcome';
  if (filter === 'coached') return item.state === 'coached';
  return item.state === filter;
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
  const movementClass = change < 0 ? 'improving' : change > 0 ? 'worsening' : '';
  return [
    '<span class="queue-number' + (counts.automated ? '' : ' is-zero') + '"><strong>' + counts.automated + '</strong></span>',
    '<span class="queue-number' + (counts.one_to_one ? '' : ' is-zero') + '"><strong>' + counts.one_to_one + '</strong></span>',
    '<span class="queue-attention' + (counts.needs_review ? ' has-attention' : '') + '"><strong>' + counts.needs_review + '</strong></span>',
    '<span class="queue-number' + (counts.completed ? '' : ' is-zero') + '"><strong>' + counts.completed + '</strong></span>',
    '<span class="risk-change ' + movementClass + '" data-tooltip="Events per 1,000 trips over 8 weeks. Lower is safer."><strong>' + movementCopy(change) + '</strong></span>',
    '<span class="row-arrow" aria-hidden="true">›</span>'
  ].join('');
}

function coachingRowLabel(name, counts, change) {
  return name + '. ' + counts.automated + ' automated, ' + counts.one_to_one + ' one-on-one, ' + counts.needs_review + ' need review, ' + counts.completed + ' completed. Event change ' + movementCopy(change) + ' over 8 weeks; lower is safer.';
}

function categoryRow(category, counts) {
  const selected = activeCategory?.id === category.id && categoryDrawer.classList.contains('is-open');
  return [
    '<button class="queue-row' + (selected ? ' is-selected' : '') + '" type="button" data-open-category="' + category.id + '" aria-label="' + escapeHtml(coachingRowLabel(category.name, counts, category.eventChange)) + '">',
      '<span class="behavior-cell">',
        '<span class="behavior-title-line"><h3>' + category.name + '</h3>' + (category.priority === 'critical' ? '<span class="program-priority icon-hint" data-tooltip="High-priority coaching program" aria-label="High priority">' + uiIcon('alert') + '</span>' : '') + '</span>',
      '</span>',
      coachingRowCells(counts, category.eventChange),
    '</button>'
  ].join('');
}

function groupRow(name, group, counts) {
  return [
    '<button class="queue-row" type="button" data-open-group="' + escapeHtml(name) + '" aria-label="' + escapeHtml(coachingRowLabel(name, counts, group.change)) + '">',
      '<span class="behavior-cell"><span class="behavior-title-line"><h3>' + escapeHtml(name) + '</h3></span></span>',
      coachingRowCells(counts, group.change),
    '</button>'
  ].join('');
}

function coachingSummaryCopy(counts) {
  return periodLabel() + ' · ' + counts.total + ' sessions · ' + counts.automated + ' automated · ' + counts.one_to_one + ' one-on-one · ' + counts.needs_review + ' need review · ' + counts.completed + ' completed';
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
  const byGroup = queueLens === 'group';
  const totals = coachingCounts(() => true);
  const columns = document.getElementById('queue-columns');
  if (columns) columns.innerHTML = '<span>' + (byGroup ? 'Group' : 'Program') + '</span><span>Automated</span><span>One-on-one</span><span>Needs review</span><span>Completed</span><span>8-week event change</span><span></span>';
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
  if (summary) summary.textContent = coachingSummaryCopy(totals);
  document.querySelectorAll('[data-coaching-period]').forEach((control) => { control.value = String(coachingPeriod); });
  queueNode.innerHTML = rows || '<div class="empty-state queue-empty"><strong>No coaching activity</strong><span>Nothing has been assigned in this cycle yet.</span></div>';
}

function updateAiCommandPreview() {
  const available = attentionAiInsights.filter((insight) => !dismissedAiInsightIds.has(insight.id));
  const unresolved = attentionAiInsights.filter((insight) => !resolvedAttentionIds.has(insight.id));
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
  if (score) score.textContent = first ? 'Score ' + first.safetyScore : '';
  if (meta) meta.textContent = first
    ? first.categoryName + ' · ' + first.criterion.toLowerCase()
    : unresolved.length
      ? 'Attention remains visible in programs and sessions'
      : 'No attention items remain in this coaching cycle';
}

function openAiCoach(insightId) {
  const insight = attentionAiInsights.find((item) => item.id === insightId);
  if (!insight) return;
  const category = categories.find((item) => item.id === insight.categoryId);
  const target = category && category[insight.caseKind + 'Cases'].find((item) => item.id === insight.caseId);
  openCategoryDrawer(insight.categoryId);
  openDriverDrawer(insight.caseId, insight.caseKind);
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
  outcomes: 'analytics',
  drivers: 'drivers', // legacy route: opens Analytics › Drivers
  groups: 'groups', // legacy route: opens Analytics › Groups
  library: 'content',
  settings: 'settings'
};
const internalViewNames = Object.fromEntries(Object.entries(routeViewNames).map(([internal, route]) => [route, internal]));

function updateUrlState(replace = false) {
  const url = new URL(window.location.href);
  ['session', 'origin', 'analytics', 'outcome', 'queue', 'lens', 'period', 'driverStatus', 'group', 'program', 'score', 'sort', 'view', 'q', 'record', 'driver'].forEach((key) => url.searchParams.delete(key));
  if (currentView === 'inbox') {
    url.searchParams.set('session', activeSessionFilter);
    url.searchParams.set('origin', activeSessionSource);
    if (sessionSearch) url.searchParams.set('q', sessionSearch);
  } else if (currentView === 'outcomes') {
    url.searchParams.set('analytics', analyticsTab);
    if (analyticsTab === 'outcomes') url.searchParams.set('outcome', outcomeTab);
  }
  if (coachingPeriod !== 1) url.searchParams.set('period', String(coachingPeriod));
  if (currentView === 'outcomes' && analyticsTab === 'drivers') {
    url.searchParams.set('driverStatus', activeDriverFilter);
    if (activeDriverGroup !== 'all') url.searchParams.set('group', activeDriverGroup);
    if (activeDriverCategory !== 'all') url.searchParams.set('program', activeDriverCategory);
    if (activeDriverScoreFilter !== 'all') url.searchParams.set('score', activeDriverScoreFilter);
    if (driverSort !== 'action') url.searchParams.set('sort', driverSort);
    const driverTerm = document.getElementById('driver-search')?.value.trim();
    if (driverTerm) url.searchParams.set('q', driverTerm);
  }
  if (activeSessionId) url.searchParams.set('record', activeSessionId);
  if (activeDriverProfile && currentView === 'outcomes' && analyticsTab === 'drivers') url.searchParams.set('driver', activeDriverProfile);
  url.hash = routeViewNames[currentView];
  const next = url.pathname + (url.searchParams.toString() ? '?' + url.searchParams.toString() : '') + url.hash;
  const current = window.location.pathname + window.location.search + window.location.hash;
  if (next === current) return;
  window.history[replace ? 'replaceState' : 'pushState']({ elevateView: currentView }, '', next);
}

function applyUrlState() {
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
  outcomeTab = 'category';
  queueStatus = 'needs';
  queueLens = 'program';
  coachingPeriod = 1;
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
  const driversRoute = analyticsTab === 'drivers';
  if (['category', 'driver'].includes(params.get('outcome'))) outcomeTab = params.get('outcome');
  if (['needs', 'all'].includes(params.get('queue'))) queueStatus = params.get('queue');
  if (['program', 'group'].includes(params.get('lens'))) queueLens = params.get('lens');
  if (['1', '4', '8'].includes(params.get('period'))) coachingPeriod = Number(params.get('period'));
  refreshPeriodData();
  if (['all', 'attention', 'automated', 'one_to_one', 'completed', 'coached', 'outcome', 'track'].includes(params.get('driverStatus'))) activeDriverFilter = params.get('driverStatus');
  if (params.get('group') && (params.get('group') === 'all' || driverGroups.includes(params.get('group')))) activeDriverGroup = params.get('group');
  if (params.get('program') && (params.get('program') === 'all' || categories.some((program) => program.name === params.get('program')))) activeDriverCategory = params.get('program');
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
  setView(view, { updateUrl: false, focusHeading: false });
  const requestedRecord = params.get('record');
  const requestedDriver = driversRoute && directory.some(driver => driver.name === params.get('driver')) ? params.get('driver') : null;
  if (requestedDriver) openDriverProfile(requestedDriver);
  if (requestedRecord && sessions.some((session) => session.id === requestedRecord)) {
    const fromProfile = requestedDriver && sessions.some(session => session.id === requestedRecord && session.person === requestedDriver);
    openSessionDrawer(requestedRecord, fromProfile ? { type: 'driver-profile', driverName: requestedDriver } : { type: 'deep-link' });
  }
}

function setView(view, options = {}) {
  view = internalViewNames[view] || view;
  if (view === 'drivers' || view === 'groups') {
    analyticsTab = view;
    view = 'outcomes';
  }
  if (!routeViewNames[view]) view = 'coaching';
  document.querySelectorAll('[data-filter-sheet].is-open').forEach((sheet) => closeFilterSheet(sheet, false));
  if (categoryDrawer.classList.contains('is-open')) closeCategoryDrawer(false);
  if (driverDrawer.classList.contains('is-open')) closeDrawer(false);
  currentView = view;
  document.querySelectorAll('.app-view').forEach((node) => node.classList.toggle('is-active', node.id === 'view-' + view));
  document.querySelectorAll('[data-view], [data-mobile-view]').forEach((node) => {
    const targetView = node.dataset.view || node.dataset.mobileView;
    const active = targetView === view;
    node.classList.toggle('is-active', active);
    if (active) node.setAttribute('aria-current', 'page');
    else node.removeAttribute('aria-current');
  });
  const mobileMoreTrigger = document.getElementById('mobile-more-trigger');
  if (mobileMoreTrigger) {
    const moreActive = ['library', 'settings'].includes(view);
    mobileMoreTrigger.classList.toggle('is-active', moreActive);
    if (moreActive) mobileMoreTrigger.setAttribute('aria-current', 'page');
    else mobileMoreTrigger.removeAttribute('aria-current');
  }
  if (view === 'inbox') renderInbox();
  if (view === 'coaching') renderHomeOverview();
  if (view === 'outcomes') renderAnalytics();
  if (view === 'library') renderLibrary();
  if (view === 'settings') renderSettings();
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

function openCategoryDrawer(categoryId) {
  categoryDrawerOpener = document.activeElement;
  categoryDrawerReturnTarget = { type: 'program', id: categoryId };
  activeCategory = categories.find((item) => item.id === categoryId);
  if (!activeCategory) return;
  sessionDraft = null;
  categoryDrawer.classList.remove('is-composer');
  workflowTab = 'needs';
  trainingExpanded = false;
  trainingSearch = '';
  renderCategory();
  categoryBackdrop.hidden = false;
  categoryDrawer.inert = false;
  categoryDrawer.classList.add('is-open');
  categoryDrawer.setAttribute('aria-hidden', 'false');
  document.getElementById('app-shell').inert = true;
  document.body.style.overflow = 'hidden';
  renderQueue();
  setTimeout(() => categoryDrawer.querySelector('[data-close-category]')?.focus(), 100);
}

function closeCategoryDrawer(restoreFocus = true) {
  sessionDraft = null;
  categoryDrawer.classList.remove('is-composer');
  categoryDrawer.classList.remove('is-open');
  categoryDrawer.setAttribute('aria-hidden', 'true');
  categoryDrawer.inert = true;
  document.getElementById('app-shell').inert = false;
  document.body.style.overflow = '';
  setTimeout(() => {
    categoryBackdrop.hidden = true;
    renderQueue();
    if (!restoreFocus) return;
    const target = categoryDrawerReturnTarget?.type === 'group'
      ? (categoryDrawerOpener?.dataset.openGroup === categoryDrawerReturnTarget.id && document.contains(categoryDrawerOpener) ? categoryDrawerOpener : Array.from(document.querySelectorAll('[data-open-group]')).find((node) => node.dataset.openGroup === categoryDrawerReturnTarget.id))
      : Array.from(document.querySelectorAll('[data-open-category]')).find((node) => node.dataset.openCategory === categoryDrawerReturnTarget?.id);
    if (target) target.focus();
    else if (categoryDrawerOpener && document.contains(categoryDrawerOpener)) categoryDrawerOpener.focus();
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
  const overview = document.getElementById('groups-overview');
  if (!overview) return;
  const groups = Object.entries(groupComparisonData);
  if (!groups.length) {
    overview.innerHTML = '<div class="overview-panel"><span class="overview-heading">Group highlights</span><strong class="overview-person">No group data yet</strong></div>';
    return;
  }
  const startedByGroup = Object.fromEntries(groups.map(([name]) => [name, coachingCounts((session) => session.origin === 'automated' && groupForPerson(session.person) === name).total]));
  const workloadGroups = groups.slice().sort((a, b) => startedByGroup[b[0]] - startedByGroup[a[0]] || a[0].localeCompare(b[0]));
  const maxWorkload = Math.max(1, ...Object.values(startedByGroup));
  const currentWeek = weeklyCoachingActivity[weeklyCoachingActivity.length - 1];
  const mostImproved = groups.slice().sort((a, b) => a[1].change - b[1].change)[0];
  const worsening = groups.filter(([, group]) => group.change > 0).sort((a, b) => b[1].change - a[1].change)[0];
  const changeLabel = (change) => (change > 0 ? '+' : change < 0 ? '−' : '') + Math.abs(change) + '%';
  const trendPanel = ([name, group], label, action) => {
    const tone = group.change > 0 ? 'negative' : group.change < 0 ? 'positive' : 'neutral';
    const chartLabel = name + ': ' + group.weeklyRates.join(', ') + ' events per 1,000 trips, weekly from July 13 to August 31. Lower is safer.';
    return '<button class="overview-panel" type="button" data-open-group="' + escapeHtml(name) + '" aria-label="' + escapeHtml(label + ': ' + name + ', events ' + changeLabel(group.change) + ' from July 13 to August 31. Open group details.') + '">' +
      '<span class="overview-heading">' + label + '</span>' +
      '<span class="overview-chart-row"><strong class="overview-value is-' + tone + '">' + changeLabel(group.change) + '</strong>' + overviewSparkline(group.weeklyRates, { label: chartLabel, tone }) + '</span>' +
      '<strong class="overview-person">' + escapeHtml(name) + '</strong>' +
      '<span class="overview-foot"><span>Events / 1K trips · lower is safer</span><span>' + action + uiIcon('chevron') + '</span></span>' +
      '</button>';
  };
  overview.innerHTML = [
    '<article class="overview-panel overview-workload-panel" aria-labelledby="group-workload-title">',
      '<header class="overview-heading"><h2 id="group-workload-title">Coaching by group <button class="info-hint" type="button" aria-label="About coaching workload by group" data-tooltip="Coaching records automation started on its own in the current cycle, not unique drivers. Select a group to review its coaching activity and programs.">' + uiIcon('info') + '</button></h2></header>',
      '<span class="overview-scope" id="group-workload-scope">Started automatically · week of ' + escapeHtml(currentWeek.label) + '</span>',
      '<div class="overview-workload" id="group-coaching-workload" role="group" aria-label="Coaching records started automatically, by group">',
        workloadGroups.map(([name, group]) => '<button class="overview-workload-row" type="button" data-open-group="' + escapeHtml(name) + '" aria-label="' + escapeHtml(name + ': ' + startedByGroup[name] + ' coaching records started automatically, week of ' + currentWeek.label + '. Open group details.') + '"><span>' + escapeHtml(name) + '</span><span class="overview-bar-track" aria-hidden="true"><i style="width:' + (startedByGroup[name] / maxWorkload * 100) + '%"></i></span><strong>' + startedByGroup[name] + '</strong></button>').join(''),
      '</div>',
    '</article>',
    trendPanel(mostImproved, mostImproved[1].change < 0 ? 'Most improved' : 'Smallest event change', 'Open'),
    worsening ? trendPanel(worsening, 'Worsening trend', 'Review') : '<div class="overview-panel"><span class="overview-heading">Worsening trend</span><strong class="overview-value">0</strong><strong class="overview-person">No worsening groups</strong><span class="overview-foot">Events / 1K trips · Jul 13–Aug 31</span></div>'
  ].join('');
}

function groupComparisonRow(name, group) {
  const counts = coachingCounts((session) => groupForPerson(session.person) === name);
  const scoreTone = group.score < 60 ? 'risk' : group.score < 80 ? 'watch' : 'good';
  const label = name + ': ' + group.drivers + ' drivers, safety score ' + group.score + ', ' + counts.automated + ' automated, ' + counts.one_to_one + ' one-on-one, ' + counts.needs_review + ' need review, ' + counts.completed + ' completed. Events ' + (group.change > 0 ? 'increased ' : 'decreased ') + Math.abs(group.change) + ' percent. Open group details.';
  return '<button class="group-row" type="button" data-open-group="' + escapeHtml(name) + '" aria-label="' + escapeHtml(label) + '">'
    + '<strong data-label="Group">' + escapeHtml(name) + '</strong>'
    + '<span data-label="Drivers">' + group.drivers + '</span>'
    + '<b class="' + scoreTone + '" data-label="Safety score">' + group.score + '</b>'
    + '<span data-label="Automated">' + counts.automated + '</span>'
    + '<span data-label="One-on-one">' + counts.one_to_one + '</span>'
    + '<em class="' + (counts.needs_review >= 4 ? 'risk' : '') + '" data-label="Needs review">' + counts.needs_review + '</em>'
    + '<span data-label="Completed">' + counts.completed + '</span>'
    + '<i class="' + (group.change > 0 ? 'negative' : 'positive') + '" data-label="Event change">' + movementCopy(group.change) + '</i>'
    + '</button>';
}

function syncGroupDisplay() {
  renderGroupOverview();
  const rows = document.getElementById('group-rows');
  if (rows) rows.innerHTML = Object.entries(groupComparisonData).map(([name, group]) => groupComparisonRow(name, group)).join('');
  const priority = Object.entries(groupComparisonData).sort((a, b) => b[1].attention - a[1].attention)[0];
  const priorityName = document.getElementById('groups-priority-name');
  const priorityCount = document.getElementById('groups-priority-count');
  if (priorityName) priorityName.textContent = priority[1].attention ? priority[0] : 'No groups need review';
  if (priorityCount) priorityCount.textContent = priority[1].attention;
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

function openGroupDrawer(groupName) {
  const group = groupComparisonData[groupName];
  if (!group) return;
  categoryDrawerOpener = document.activeElement;
  categoryDrawerReturnTarget = { type: 'group', id: groupName };
  activeCategory = null;
  sessionDraft = null;
  categoryDrawer.classList.remove('is-composer');
  const chartCategory = { id: 'group-' + groupName.toLowerCase().replace(/[^a-z0-9]+/g, '-'), name: groupName, weeklyRates: group.weeklyRates };
  const groupCounts = coachingCounts((session) => groupForPerson(session.person) === groupName);
  categoryContent.innerHTML = [
    '<header class="category-panel-header"><div><p class="eyebrow">Group comparison</p><div class="panel-title-line"><h1 id="category-title">' + escapeHtml(groupName) + '</h1></div></div><button class="icon-button" type="button" data-close-category aria-label="Close group">×</button></header>',
    '<div class="category-panel-scroll group-detail-drawer">',
      '<div class="category-facts"><strong>' + group.score + '<span>safety score</span></strong><strong>' + groupCounts.automated + '<span>automated</span></strong><strong>' + groupCounts.one_to_one + '<span>one-on-one</span></strong><strong>' + groupCounts.needs_review + '<span>need review</span></strong><strong>' + groupCounts.completed + '<span>completed</span></strong></div>',
      '<section class="group-detail-summary"><div><span>Weekly result</span><h2>' + (group.change > 0 ? 'Coached events increased ' + group.change + '%' : 'Coached events decreased ' + Math.abs(group.change) + '%') + '</h2><p>' + (group.change > 0 ? 'This group is the first priority for program review.' : 'The group is moving in the intended direction.') + '</p></div><button class="secondary-button" type="button" data-view-link="drivers" data-driver-group-link="' + escapeHtml(groupName) + '">View ' + group.drivers + ' drivers</button></section>',
      '<section class="signal-panel"><div class="signal-heading"><div><h2>Weekly coached events</h2><span>Events per 1,000 trips · eight coaching cycles</span></div><div class="signal-value ' + (group.change > 0 ? 'is-negative' : '') + '"><strong>' + (group.change > 0 ? '+' : '') + group.change + '%</strong><span>since Jul 13</span></div></div><div class="category-progress-chart">' + categoryWeeklyChartSvg(chartCategory) + '</div><div class="chart-axis"><span>Jul 13</span><span>Aug 10</span><span>Aug 31</span></div></section>',
      '<section class="group-programs"><header><div><h2>Programs in this group</h2><span>' + escapeHtml(periodLabel()) + ' · needs review first</span></div></header><div class="group-program-head"><span>Program</span><span>Automated</span><span>One-on-one</span><span>Needs review</span><span>Completed</span><span>Event change</span></div>' + categories.map((program) => ({ program, counts: coachingCounts((session) => groupForPerson(session.person) === groupName && session.categoryId === program.id) })).filter((entry) => entry.counts.total > 0).sort((a, b) => b.counts.needs_review - a.counts.needs_review || b.counts.total - a.counts.total).map(({ program, counts }) => '<div class="group-program-row"><strong>' + escapeHtml(program.name) + '</strong><span>' + counts.automated + '</span><span>' + counts.one_to_one + '</span><span>' + counts.needs_review + '</span><span>' + counts.completed + '</span><i class="' + (program.eventChange > 0 ? 'negative' : 'positive') + '">' + movementCopy(program.eventChange) + '</i></div>').join('') + '</section>',
    '</div>'
  ].join('');
  categoryBackdrop.hidden = false;
  categoryDrawer.inert = false;
  categoryDrawer.classList.add('is-open');
  categoryDrawer.setAttribute('aria-hidden', 'false');
  document.getElementById('app-shell').inert = true;
  document.body.style.overflow = 'hidden';
  setTimeout(() => categoryDrawer.querySelector('[data-close-category]')?.focus(), 100);
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
  const width = Math.max(280, Math.min(1400, availableWidth || 720));
  const compact = width < 520;
  const rowHeight = compact ? 34 : 38;
  const top = 6;
  const axisHeight = 30;
  const height = top + rows.length * rowHeight + axisHeight;
  const labelWidth = compact ? 104 : 150;
  const noteWidth = compact ? 64 : 150;
  const left = labelWidth + 8;
  const plotWidth = width - left - noteWidth;
  const peak = Math.max(1, ...rows.flatMap((row) => [row.before, row.after]));
  const max = Math.max(1, Math.ceil(peak * 1.1));
  const x = (value) => left + value / max * plotWidth;
  const barHeight = compact ? 16 : 18;
  const maxLabelChars = compact ? 14 : 22;
  const ticks = Array.from({ length: max + 1 }, (_, index) => index).filter((tick) => max <= 6 || tick % 2 === 0);
  const body = rows.map((row, index) => {
    const y = top + index * rowHeight + rowHeight / 2;
    const improved = row.after < row.before;
    const worse = row.after > row.before;
    const label = row.label.length > maxLabelChars ? row.label.slice(0, maxLabelChars - 1).trimEnd() + '…' : row.label;
    const afterX = x(row.after);
    const beforeX = x(row.before);
    const barY = (y - barHeight / 2).toFixed(1);
    const valueInside = afterX - left > 40;
    const noteX = Math.max(afterX, beforeX) + 10;
    return [
      '<g class="ba-row ' + (improved ? 'improved' : worse ? 'worse' : 'flat') + '">',
        '<title>' + escapeHtml(row.label) + (row.meta ? ' · ' + escapeHtml(row.meta) : '') + ': ' + formatRate(row.before) + ' before, ' + formatRate(row.after) + ' after (' + movementCopy(row.change) + '). Events per 1,000 trips; lower is safer.</title>',
        '<text class="ba-label" x="0" y="' + (y + 4) + '">' + escapeHtml(label) + '</text>',
        '<rect class="ba-track" x="' + left + '" y="' + barY + '" width="' + plotWidth.toFixed(1) + '" height="' + barHeight + '" rx="3"/>',
        improved ? '<rect class="ba-reduction" x="' + afterX.toFixed(1) + '" y="' + barY + '" width="' + (beforeX - afterX).toFixed(1) + '" height="' + barHeight + '" rx="3"/>' : '',
        '<rect class="ba-latest" x="' + left + '" y="' + barY + '" width="' + Math.max(2, afterX - left).toFixed(1) + '" height="' + barHeight + '" rx="3"/>',
        worse ? '<rect class="ba-increase" x="' + beforeX.toFixed(1) + '" y="' + barY + '" width="' + Math.max(3, afterX - beforeX).toFixed(1) + '" height="' + barHeight + '" rx="2"/>' : '',
        valueInside ? '<text class="ba-value" x="' + (afterX - 8).toFixed(1) + '" y="' + (y + 4) + '" text-anchor="end">' + formatRate(row.after) + '</text>' : '<text class="ba-value outside" x="' + (afterX + 6).toFixed(1) + '" y="' + (y + 4) + '">' + formatRate(row.after) + '</text>',
        '<text class="ba-change" x="' + noteX.toFixed(1) + '" y="' + (y + 4) + '">' + movementCopy(row.change) + '</text>',
        compact ? '' : '<text class="ba-was" x="' + (noteX + 48).toFixed(1) + '" y="' + (y + 4) + '">was ' + formatRate(row.before) + '</text>',
      '</g>'
    ].join('');
  }).join('');
  const axisY = top + rows.length * rowHeight + 6;
  const axis = '<g class="ba-axis">' + ticks.map((tick) => '<line x1="' + x(tick).toFixed(1) + '" y1="' + top + '" x2="' + x(tick).toFixed(1) + '" y2="' + (axisY - 4) + '"/><text x="' + x(tick).toFixed(1) + '" y="' + (axisY + 10) + '" text-anchor="middle">' + tick + '</text>').join('') +
    '<text class="ba-axis-title" x="' + left + '" y="' + (axisY + 24) + '">events per 1,000 trips · fewer is safer</text></g>';
  const defs = '<defs><pattern id="ba-hatch" patternUnits="userSpaceOnUse" width="6" height="6" patternTransform="rotate(45)"><rect class="ba-hatch-ground" width="6" height="6"/><line class="ba-hatch-line" x1="0" y1="0" x2="0" y2="6"/></pattern></defs>';
  return '<svg class="before-after-chart" width="' + width + '" height="' + height + '" viewBox="0 0 ' + width + ' ' + height + '" role="img" aria-labelledby="outcome-chart-title outcome-chart-summary">' + defs + axis + body + '</svg>';
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
  node.innerHTML = beforeAfterChartSvg(rows, node.clientWidth);
  const footnote = document.getElementById('outcome-chart-footnote');
  if (footnote) footnote.innerHTML = outcomeFootnote(rows);
  const dots = document.getElementById('outcome-program-dots');
  if (dots && outcomeTab === 'category') dots.innerHTML = rows.map((row) => '<i class="' + (row.change < 0 ? 'is-improved' : row.change > 0 ? 'is-worse' : 'is-flat') + '" title="' + escapeHtml(row.label + ' ' + movementCopy(row.change)) + '"></i>').join('');
  document.querySelectorAll('[data-outcome-sort]').forEach((button) => {
    const active = button.dataset.outcomeSort === outcomeSort;
    button.classList.toggle('is-active', active);
    button.setAttribute('aria-checked', String(active));
    button.tabIndex = active ? 0 : -1;
  });
  const lensLabel = { category: 'by program', cohort: 'by group', driver: 'by driver' }[outcomeTab] || 'by program';
  const lens = document.getElementById('outcome-chart-lens');
  if (lens) lens.textContent = lensLabel;
  const text = 'Events per 1,000 trips before and after coaching, ' + lensLabel + ': ' + rows.map((row) => row.label + ' ' + formatRate(row.before) + ' to ' + formatRate(row.after) + ' (' + movementCopy(row.change) + ')').join('; ') + '. Lower is safer.';
  ['outcome-chart-summary', 'outcome-chart-summary-text'].forEach((id) => {
    const summary = document.getElementById(id);
    if (summary) summary.textContent = text;
  });
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
  const width = Math.max(300, Math.min(1200, availableWidth || 760));
  const height = Math.max(230, Math.min(520, availableHeight || 0));
  const left = width < 450 ? 29 : 42;
  const right = width < 450 ? 26 : 34;
  const top = 20;
  const bottom = 34;
  const max = 160;
  const scoreMin = 40;
  const scoreMax = 100;
  const plotWidth = width - left - right;
  const plotHeight = height - top - bottom;
  const groupWidth = plotWidth / weeklyCoachingActivity.length;
  const barWidth = Math.min(14, (groupWidth - 11) / 5);
  const barStep = barWidth + 2;
  const dataSummary = weeklyCoachingActivity.map((week) => week.label + ': ' + week.identified + ' identified, ' + week.automated + ' automated, ' + week.oneToOne + ' one-on-one, ' + week.completed + ' completed, ' + week.escalated + ' need review, fleet safety score ' + week.score).join('. ');
  const scorePoints = weeklyCoachingActivity.map((week, index) => ({
    x: left + groupWidth * index + groupWidth / 2,
    y: top + (scoreMax - Math.min(scoreMax, Math.max(scoreMin, week.score))) / (scoreMax - scoreMin) * plotHeight,
    value: week.score
  }));
  return [
    '<svg class="activity-line-chart weekly-activity-chart" width="' + width + '" height="' + height + '" viewBox="0 0 ' + width + ' ' + height + '" role="img" aria-labelledby="weekly-activity-title weekly-activity-desc">',
      '<title id="weekly-activity-title">Weekly coaching throughput</title>',
      '<desc id="weekly-activity-desc">' + dataSummary + '.</desc>',
      '<g class="activity-grid">' + [160, 80, 0].map((tick, index) => {
        const y = top + index * plotHeight / 2;
        return '<line x1="' + left + '" y1="' + y + '" x2="' + (width - right) + '" y2="' + y + '"/><text x="4" y="' + (y + 4) + '">' + tick + '</text>';
      }).join('') + '</g>',
      '<g class="weekly-bars">' + weeklyCoachingActivity.map((week, index) => {
        const center = left + groupWidth * index + groupWidth / 2;
        const showWeekLabel = width >= 450 || [0, 2, 4, weeklyCoachingActivity.length - 1].includes(index);
        const bars = [
          { value: week.identified, tone: 'identified', label: 'identified', x: center - barStep * 2 - barWidth / 2 },
          { value: week.automated, tone: 'coached', label: 'automated', x: center - barStep - barWidth / 2 },
          { value: week.oneToOne, tone: 'one-to-one', label: 'one-on-one', x: center - barWidth / 2 },
          { value: week.completed, tone: 'completed', label: 'completed', x: center + barStep - barWidth / 2 },
          { value: week.escalated, tone: 'escalated', label: 'need review', x: center + barStep * 2 - barWidth / 2 }
        ];
        return bars.map((bar) => {
          const barHeight = bar.value / max * plotHeight;
          return '<rect class="activity-bar ' + bar.tone + '" x="' + bar.x.toFixed(1) + '" y="' + (top + plotHeight - barHeight).toFixed(1) + '" width="' + barWidth + '" height="' + barHeight.toFixed(1) + '" rx="3"><title>' + week.label + ': ' + bar.value + ' ' + bar.label + '</title></rect>';
        }).join('') + (showWeekLabel ? '<text class="activity-week-label" x="' + center.toFixed(1) + '" y="' + (height - 8) + '" text-anchor="middle">' + week.label + '</text>' : '');
      }).join('') + '</g>',
      '<g class="activity-score-axis">' + [scoreMax, 70, scoreMin].map((tick) => {
        const y = top + (scoreMax - tick) / (scoreMax - scoreMin) * plotHeight;
        return '<text x="' + (width - right + 6) + '" y="' + (y + 4).toFixed(1) + '">' + tick + '</text>';
      }).join('') + '</g>',
      '<path class="activity-score-path" d="' + linePath(scorePoints) + '"/>',
      '<g class="activity-score-points">' + scorePoints.map((point, index) => '<circle cx="' + point.x.toFixed(1) + '" cy="' + point.y.toFixed(1) + '" r="3.5"><title>' + weeklyCoachingActivity[index].label + ': fleet safety score ' + point.value + '</title></circle>').join('') + '</g>',
    '</svg>'
  ].join('');
}

function categoryWeeklyChartSvg(category) {
  const width = 720;
  const height = 186;
  const left = 42;
  const right = 18;
  const top = 18;
  const bottom = 18;
  const values = category.weeklyRates;
  const max = Math.max(2, Math.ceil(Math.max.apply(null, values)));
  const points = pointsPath(values, width, height, left, right, top, bottom, 0, max);
  return [
    '<svg class="category-weekly-chart" viewBox="0 0 ' + width + ' ' + height + '" role="img" aria-labelledby="category-weekly-' + category.id + '-title">',
      '<title id="category-weekly-' + category.id + '-title">' + category.name + ' weekly event rate</title>',
      '<g class="trend-grid">' + [max, Math.round(max / 2), 0].map((tick, index) => {
        const y = top + index * (height - top - bottom) / 2;
        return '<line x1="' + left + '" y1="' + y + '" x2="' + (width - right) + '" y2="' + y + '"/><text x="4" y="' + (y + 4) + '">' + tick + '</text>';
      }).join('') + '</g>',
      '<path class="category-event-path" d="' + linePath(points) + '"/>',
      '<g class="category-event-points">' + points.map((point, index) => '<circle cx="' + point.x.toFixed(1) + '" cy="' + point.y.toFixed(1) + '" r="4"><title>Week ' + (index + 1) + ': ' + point.value + ' events per 1,000 trips</title></circle>').join('') + '</g>',
    '</svg>'
  ].join('');
}

function renderCoachingActivityChart() {
  renderProgramPivot();
  const node = document.getElementById('coaching-activity-chart');
  if (!node) return;
  // Beside the program pivot the chart fills the card's height; stacked, it keeps its default height.
  // Measure with the previous drawing removed so the last height does not carry over between layouts.
  node.innerHTML = '';
  node.innerHTML = coachingActivityChartSvg(node.clientWidth, node.clientHeight);
}

// Program pivot beside the weekly chart: how many records each program produced this cycle and where its
// event rate stands now. Program names open the same drawer as the Program performance rows below.
function renderProgramPivot() {
  const node = document.getElementById('program-pivot');
  if (!node) return;
  const rows = outcomePrograms().map((category) => {
    const counts = coachingCounts((session) => session.categoryId === category.id);
    const outcome = outcomeFor(category);
    return { category, records: counts.total, rate: outcome.after, change: outcome.change };
  }).sort((a, b) => b.records - a.records || b.rate - a.rate || a.category.name.localeCompare(b.category.name));
  const maxRecords = Math.max(1, ...rows.map((row) => row.records));
  const maxRate = Math.max(1, ...rows.map((row) => row.rate));
  const tone = (change) => change > 0 ? 'is-worse' : change < 0 ? 'is-improved' : 'is-flat';
  node.innerHTML = [
    '<table class="analytics-data-table program-pivot">',
      '<thead><tr><th scope="col">Program</th><th scope="col">Records</th><th scope="col">Events / 1,000 trips</th><th scope="col" class="num">Change</th></tr></thead>',
      '<tbody>' + rows.map((row) => [
        '<tr>',
          '<th scope="row"><button class="pivot-program" type="button" data-open-category="' + row.category.id + '" aria-label="Open ' + escapeHtml(row.category.name) + '"><strong>' + escapeHtml(row.category.name) + '</strong><small>' + row.category.drivers + ' drivers</small></button></th>',
          '<td><span class="pivot-measure"><b>' + row.records + '</b><span class="analytics-kpi-meter" aria-hidden="true"><i style="width:' + Math.round(row.records / maxRecords * 100) + '%"></i></span></span></td>',
          '<td><span class="pivot-measure"><b>' + formatRate(row.rate) + '</b><span class="analytics-kpi-meter ' + (row.change > 0 ? 'is-worse' : 'is-positive') + '" aria-hidden="true"><i style="width:' + Math.round(row.rate / maxRate * 100) + '%"></i></span></span></td>',
          '<td class="num"><span class="pivot-change ' + tone(row.change) + '">' + movementCopy(row.change) + '</span></td>',
        '</tr>'
      ].join('')).join('') + '</tbody>',
    '</table>'
  ].join('');
}

function renderAnalytics() {
  document.querySelectorAll('[data-analytics-tab]').forEach((button) => {
    const active = button.dataset.analyticsTab === analyticsTab;
    button.classList.toggle('is-active', active);
    button.setAttribute('aria-selected', String(active));
    button.removeAttribute('aria-pressed');
    button.tabIndex = active ? 0 : -1;
  });
  const activity = document.getElementById('analytics-activity');
  const outcomes = document.getElementById('analytics-outcomes');
  const drivers = document.getElementById('view-drivers');
  const groups = document.getElementById('view-groups');
  const scopes = { outcomes: 'All programs', activity: 'All programs', drivers: 'Fleet · 1,024 drivers · 14 directory records', groups: 'All groups' };
  const reportScopeDetail = document.getElementById('analytics-report-scope-detail');
  if (reportScopeDetail) reportScopeDetail.textContent = periodScopeLabel() + ' · ' + scopes[analyticsTab];
  if (activity && !activity.dataset.chartsObserved && typeof ResizeObserver !== 'undefined') {
    const chartObserver = new ResizeObserver((entries) => {
      entries.forEach(({ target, contentRect }) => {
        const width = Math.round(contentRect.width);
        if (!width || target.dataset.chartWidth === String(width)) return;
        target.dataset.chartWidth = String(width);
        if (target.id === 'coaching-activity-chart') renderCoachingActivityChart();
        else renderOutcomeProgressChart();
      });
    });
    ['coaching-activity-chart', 'outcome-progress-chart'].forEach((id) => {
      const chart = document.getElementById(id);
      if (chart) chartObserver.observe(chart);
    });
    activity.dataset.chartsObserved = 'true';
  }
  if (activity) activity.hidden = analyticsTab !== 'activity';
  if (outcomes) outcomes.hidden = analyticsTab !== 'outcomes';
  if (drivers) drivers.hidden = analyticsTab !== 'drivers';
  if (groups) groups.hidden = analyticsTab !== 'groups';
  if (analyticsTab === 'activity') {
    renderCoachingActivityChart();
    syncQueueLensControl();
    renderQueue();
  } else if (analyticsTab === 'outcomes') {
    renderOutcomeProgressChart();
    renderOutcomeTable();
  } else if (analyticsTab === 'drivers') {
    document.querySelectorAll('[data-driver-filter]').forEach((node) => node.classList.toggle('is-active', node.dataset.driverFilter === activeDriverFilter));
    renderDirectory();
  } else if (analyticsTab === 'groups') {
    syncGroupDisplay();
  }
  const eventRate = fleetEventRatePer100k();
  const rateHeadline = document.getElementById('outcome-event-rate-change');
  if (rateHeadline) rateHeadline.textContent = movementCopy(eventRate.change);
  const improving = outcomePrograms().filter((category) => outcomeFor(category).change < 0).length;
  const improvingNode = document.getElementById('outcome-programs-improving');
  if (improvingNode) improvingNode.textContent = improving + ' of ' + outcomePrograms().length;
  const unit = document.getElementById('outcome-unit');
  if (unit) unit.textContent = 'Coached events per 1,000 trips · ' + outcomeWindowLabel() + ' · lower is safer';
  const windowFact = document.getElementById('outcome-window-fact');
  if (windowFact) windowFact.innerHTML = '<strong>' + coachingPeriod + '</strong> ' + (coachingPeriod === 1 ? 'week' : 'weeks');
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
  if (!list.length) {
    const copy = { needs: 'Nothing needs review in this period.', automated: 'No automated coaching in progress in this period.', one_to_one: 'No one-on-one coaching in progress in this period.', completed: 'Nothing completed in this period.' }[tab];
    return '<div class="empty-state compact"><strong>' + copy + '</strong><span>Change the period to widen the view.</span></div>';
  }
  return '<div class="drawer-session-head" aria-hidden="true"><span>Driver</span><span>Status</span><span>Coach</span><span>Latest</span><span>Due</span><span></span></div>' + list.map((session) => {
    const [icon, status] = compactSessionStatus(session);
    const clips = sessionClipBadge(session);
    const trailing = tab === 'needs' ? '<span class="row-action">' + reviewActionLabel(session) + '</span>' : '<span class="row-arrow" aria-hidden="true">' + uiIcon('chevron') + '</span>';
    return '<button class="drawer-session-row' + (session.candidate ? ' is-candidate' : '') + '" type="button" ' + (session.candidate ? 'data-start-session-for="' + session.id + '"' : 'data-open-session="' + session.id + '"') + ' aria-label="' + escapeHtml(session.person + '. ' + status + '. Coach ' + coachLabel(session) + '. ' + session.latest + '. Due ' + (session.due || '—') + '. ' + (session.candidate ? 'Start session.' : 'View session.')) + '">'
      + '<span class="drawer-session-person"><span class="person-avatar" aria-hidden="true">' + session.initials + '</span><strong>' + escapeHtml(session.person) + '</strong>' + clips + '</span>'
      + '<span class="drawer-session-status ' + sessionStatusClass(session) + '">' + uiIcon(icon) + '<span>' + status + '</span></span>'
      + '<span class="drawer-session-coach">' + uiIcon(coachLabel(session) === 'Automated' ? 'bolt' : 'user') + '<span>' + escapeHtml(coachLabel(session)) + '</span></span>'
      + '<span class="drawer-session-meta">' + escapeHtml(session.latest) + '</span>'
      + '<span class="drawer-session-meta">' + escapeHtml(session.due || '—') + '</span>'
      + trailing + '</button>';
  }).join('');
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
  const category = activeCategory;
  if (!category) return;
  const outcome = outcomeFor(category);
  const counts = coachingCounts((session) => session.categoryId === category.id);
  const completionRate = counts.total ? Math.round(counts.completed / counts.total * 100) : 0;
  categoryContent.innerHTML = [
    '<header class="category-panel-header">',
      '<div><div class="panel-title-line"><h1 id="category-title">' + category.name + '</h1>' + (category.priority === 'critical' ? '<span class="priority-label">High</span>' : '') + '</div></div>',
      '<div class="category-header-actions"><label class="filter-button period-control"><span class="sr-only">Coaching period</span><select id="category-period" data-coaching-period aria-label="Coaching period">' + periodOptions() + '</select></label><button class="secondary-button" type="button" data-manual-session>Start one-on-one coaching</button><button class="icon-button" type="button" data-close-category aria-label="Close program">×</button></div>',
    '</header>',
    '<div class="category-panel-scroll">',
      '<div class="category-facts"><strong>' + counts.automated + '<span>automated</span></strong><strong>' + counts.one_to_one + '<span>one-on-one</span></strong><strong>' + counts.needs_review + '<span>need review</span></strong><strong>' + counts.completed + '<span>completed</span></strong></div>',
      categoryCoachRecommendation(category),
      '<section class="signal-panel">',
        '<div class="signal-heading"><div><h2>Weekly coached events</h2><span>Events per 1,000 trips · eight coaching cycles</span></div><div class="signal-value ' + (category.eventChange > 0 ? 'is-negative' : '') + '"><strong>' + (category.eventChange > 0 ? '+' : '') + category.eventChange + '%</strong><span>since Jul 13</span></div></div>',
        '<div class="category-progress-chart">' + categoryWeeklyChartSvg(category) + '</div>',
        '<div class="chart-axis"><span>Jul 13</span><span>Aug 10</span><span>Aug 31</span></div>',
      '</section>',
      '<button class="outcome-snapshot" type="button" data-workflow-tab="outcomes"><span>Measured outcome</span><strong>' + completionRate + '% completed</strong><b class="' + (category.eventChange < 0 ? 'positive' : 'negative') + '">' + (category.eventChange > 0 ? '+' : '') + category.eventChange + '% events</b><em>' + outcome.label + '</em><i>View detail ›</i></button>',
      '<section class="workflow-card" id="coaching-work">',
        '<div class="workflow-tabs" role="tablist" aria-label="Coaching stage">',
          workflowTabButton('needs', 'Needs review', counts.needs_review),
          workflowTabButton('automated', 'Automated', counts.automated),
          workflowTabButton('one_to_one', 'One-on-one', counts.one_to_one),
          workflowTabButton('completed', 'Completed', counts.completed),
          '<button class="' + (workflowTab === 'outcomes' ? 'is-active' : '') + '" type="button" role="tab" data-workflow-tab="outcomes" aria-selected="' + (workflowTab === 'outcomes') + '" tabindex="' + (workflowTab === 'outcomes' ? '0' : '-1') + '">Outcomes</button>',
        '</div>',
        '<div class="workflow-body" role="tabpanel">' + workflowBody(category) + '</div>',
      '</section>',
    '</div>'
  ].join('');
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
  const briefReason = item.events + ' events across ' + item.trips + ' trips. ' + (Number.isFinite(safetyScore) ? 'Safety score ' + safetyScore + ', ' + scoreMovement + '.' : 'Safety score pending more exposure.') + ' ' + (attentionInsight ? attentionInsight.insight : item.prior === 'No recent coaching' ? 'No recent coaching is on record.' : 'The pattern continued after earlier coaching.');
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
  activeDriverProfile = null;
  driverDrawer.classList.remove('is-open', 'is-profile', 'is-session');
  driverDrawer.setAttribute('aria-hidden', 'true');
  driverDrawer.inert = true;
  document.getElementById('app-shell').inert = false;
  document.body.style.overflow = '';
  if (closingSession) {
    activeSessionId = null;
    sessionDrawerOrigin = null;
  }
  if (restoreFocus && (closingSession || closingProfile)) updateUrlState();
  setTimeout(() => {
    if (driverDrawer.classList.contains('is-open')) return;
    drawerBackdrop.hidden = true;
    if (!restoreFocus) return;
    if (closingOrigin?.type === 'automation-centre') document.getElementById('ai-priority-review')?.focus();
    else if (closingOrigin?.type === 'global-search') document.getElementById('global-search-trigger')?.focus();
    else if (drawerOpener && document.contains(drawerOpener)) drawerOpener.focus();
    else if (closingDriverName) Array.from(document.querySelectorAll('.directory-person[data-open-driver-profile]')).find(button => button.dataset.openDriverProfile === closingDriverName)?.focus();
    else document.getElementById('inbox-title')?.focus();
  }, 220);
}

function openManualSessionDialog(prefill = null) {
  if (!prefill) pendingCandidateId = null;
  const dialogEyebrow = trainingDialog.querySelector('.eyebrow');
  const dialogTitle = document.getElementById('training-dialog-title');
  if (dialogEyebrow) dialogEyebrow.textContent = 'Manager initiated';
  if (dialogTitle) dialogTitle.textContent = 'Start one-on-one coaching';
  trainingDialogContent.innerHTML = [
    '<div class="assignment-dialog-body">',
      '<div class="manual-override-note"><strong>Start one-on-one coaching</strong><span>Use this when a manager needs to intervene outside the weekly automation cycle. The resulting session is recorded with a One-on-one origin.</span></div>',
      '<label class="dialog-field">Driver<select id="manual-driver-select">' + (prefill && !directory.some((driver) => driver.name === prefill.person) ? '<option selected>' + escapeHtml(prefill.person) + '</option>' : '') + directory.map((driver) => '<option' + (prefill && driver.name === prefill.person ? ' selected' : '') + '>' + escapeHtml(driver.name) + '</option>').join('') + '</select></label>',
      '<label class="dialog-field">Program<select id="manual-category-select">' + categories.filter((category) => category.coached).map((category) => '<option value="' + category.id + '"' + (prefill && category.id === prefill.categoryId ? ' selected' : '') + '>' + escapeHtml(category.name) + '</option>').join('') + '</select></label>',
      '<label class="dialog-field">Reason<textarea id="manual-session-reason">' + escapeHtml(prefill?.reason || 'Manager follow-up required outside the normal automated cycle.') + '</textarea></label>',
    '</div>',
    '<footer class="dialog-footer"><button class="secondary-button" value="cancel">Cancel</button><button class="primary-button" type="button" data-confirm-manual-session>Start one-on-one coaching</button></footer>'
  ].join('');
  trainingDialog.showModal();
}

function openTrainingDialog() {
  openManualSessionDialog();
}

function createManualSession() {
  const person = document.getElementById('manual-driver-select')?.value;
  const categoryId = document.getElementById('manual-category-select')?.value;
  const reason = document.getElementById('manual-session-reason')?.value.trim();
  const category = categories.find((item) => item.id === categoryId);
  if (!person || !category) return;
  sessions.unshift({
    id: 'manual-' + Date.now(),
    person,
    initials: initials(person),
    category: category.name,
    categoryId: category.id,
    eventType: category.name,
    state: 'system_handling',
    stateLabel: 'One-on-one',
    attentionReason: null,
    origin: 'manual_override',
    latest: 'Manual session created · just now',
    owner: 'Alex Kim',
    due: 'Within 7 days',
    sla: '7d left',
    slaTone: 'on-track',
    source: 'One-on-one',
    automationRun: 'Outside weekly cycle',
    summary: reason || 'Manager follow-up created outside the normal automated cycle.',
    evidence: [],
    messages: [{ author: 'manager', text: reason || 'Please review this follow-up and reply with context.', time: 'Just now' }],
    history: [['Manual session created', 'Just now']]
  });
  const startedFlag = reviewCandidates.find((flag) => flag.id === pendingCandidateId && !flag.started);
  if (startedFlag) {
    startedFlag.started = true;
    const created = sessions[0];
    created.summary = startedFlag.trigger + ': ' + startedFlag.detail + '. ' + created.summary;
    created.history.push(['Flagged for review', startedFlag.flagged]);
    created.latest = 'Session started from flagged review · just now';
  }
  pendingCandidateId = null;
  adjustSessionFleetTotals(null, 'system_handling', 'One-on-one');
  syncDirectoryAttentionState(person, false);
  renderQueue();
  syncGroupDisplay();
  trainingDialog.close();
  activeSessionFilter = 'system_handling';
  activeSessionSource = 'manual_override';
  renderInbox();
  setView('inbox');
  showToast(startedFlag ? 'Session started for ' + person : 'Manual session created for ' + person);
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
  const safetyScore = knownProfile && Number.isFinite(knownProfile.safetyScore) ? knownProfile.safetyScore : knownProfile ? '—' : 57 + ((Math.max(0, driverNames.indexOf(item.name)) * 7 + item.events) % 31);
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
          '<span><small>Safety score</small><strong>' + safetyScore + '</strong></span>',
          '<span><small>Program</small><strong>' + escapeHtml(activeCategory.name) + '</strong></span>',
          '<span><small>Trigger</small><strong>' + item.events + ' events / ' + item.trips + ' trips</strong></span>',
        '</section>',
        '<section class="session-draft-section selected-evidence-section">',
          '<header><div><span class="section-kicker">Evidence to send</span><h2>Attached events <b>' + selected.length + '</b></h2></div><span>Visible to the driver</span></header>',
          inlineDraftEvidencePreview(previewEvidence),
          '<div class="draft-selected-list">' + (selected.length ? selected.map(selectedEvidenceCard).join('') : '<div class="draft-empty-evidence">No evidence attached</div>') + '</div>',
        '</section>',
        '<section class="session-draft-section evidence-picker-section">',
          '<header><div><span class="section-kicker">Add evidence</span><h2>Related events and clips</h2></div><select aria-label="Evidence date range"><option>Last 14 days</option><option>Current week</option><option>Last 30 days</option></select></header>',
          '<div class="draft-evidence-tabs" role="group" aria-label="Evidence source">',
            '<button class="' + (sessionDraft.evidenceTab === 'driver' ? 'is-active' : '') + '" type="button" data-draft-evidence-tab="driver" aria-pressed="' + (sessionDraft.evidenceTab === 'driver') + '">This driver <b>' + sessionDraft.options.driver.length + '</b></button>',
            '<button class="' + (sessionDraft.evidenceTab === 'unassigned' ? 'is-active' : '') + '" type="button" data-draft-evidence-tab="unassigned" aria-pressed="' + (sessionDraft.evidenceTab === 'unassigned') + '">Unassigned clips <b>87</b></button>',
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
          '<label><input type="checkbox" data-draft-option="includeLesson" ' + (sessionDraft.includeLesson ? 'checked' : '') + '><span><strong>Include mapped lesson</strong><small>' + escapeHtml(activeCategory.training) + '</small></span></label>',
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
    lesson: sessionDraft.includeLesson ? activeCategory.training : null,
    state: 'system_handling',
    stateLabel: 'One-on-one',
    attentionReason: null,
    origin: 'manual_override',
    latest: 'Manual session created · just now',
    owner: 'Alex Kim',
    due: 'Within 3 days',
    sla: '3h 45m left',
    slaTone: 'on-track',
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
    repeat_after_coaching: 0,
    session_needed: 0
  };
}

// Flagged reviews: automation matched a rule that needs a person to start the session
// (repeat offender, critical event). They count as Needs review until a session exists.
const reviewCandidates = [
  { id: 'flag-casey-speeding', person: 'Casey Patel', categoryId: 'speeding', trigger: 'Critical event', detail: 'Speeding 15+ over the limit · high severity · Aug 31', flagged: '2h ago' },
  { id: 'flag-frankie-following', person: 'Frankie Diaz', categoryId: 'following', trigger: 'Repeat offender', detail: 'Third following-distance event after coaching', flagged: '5h ago' },
  { id: 'flag-marley-distraction', person: 'Marley Stewart', categoryId: 'distraction', trigger: 'Critical event', detail: 'Phone handling · video-confirmed · Aug 30', flagged: 'Yesterday' }
].map((flag) => {
  const category = categories.find((item) => item.id === flag.categoryId);
  return {
    ...flag,
    candidate: true,
    started: false,
    initials: initials(flag.person),
    category: category ? category.name : flag.categoryId,
    eventType: flag.detail.split(' · ')[0],
    state: 'manager_attention',
    stateLabel: 'Needs review',
    attentionReason: 'session_needed',
    origin: 'automated',
    source: 'Automated',
    owner: 'Unassigned',
    latest: flag.trigger + ' flagged · ' + flag.flagged,
    due: 'Start before next shift',
    sla: 'Session not started',
    slaTone: 'due-soon',
    automationRun: 'Week of Aug 31',
    summary: flag.trigger + ': ' + flag.detail + '. Automation rules require a manager to start this session.',
    evidence: [],
    messages: [{ author: 'system', text: 'Automation flagged this driver for review: ' + flag.detail.toLowerCase() + '.', time: flag.flagged }],
    history: [['Flagged for review', flag.flagged]],
    weeksAgo: 0
  };
});
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
  allSessionRecords().forEach((session) => {
    const origin = session.origin === 'manual_override' || session.source !== 'Automated' ? 'manual_override' : 'automated';
    session.origin = origin;
    const originTotals = byOrigin[origin];
    const state = sessionEffectiveState(session);
    if (fleet[state] !== undefined) fleet[state] += 1;
    if (originTotals[state] !== undefined) originTotals[state] += 1;
    if (session.attentionReason && fleet[session.attentionReason] !== undefined) {
      fleet[session.attentionReason] += 1;
      originTotals[session.attentionReason] += 1;
    }
    fleet.all += 1;
    originTotals.all += 1;
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

// The current cycle, read once from the session ledger. Identified is every record automation
// surfaced (sessions plus flagged reviews without a session yet); the four states sum to it.
function currentCycleCounts() {
  const counts = coachingCounts(() => true);
  const startedAutomatically = coachingCounts((session) => session.origin === 'automated').total;
  return {
    identified: counts.total,
    automated: counts.automated,
    oneToOne: counts.one_to_one,
    inProgress: counts.automated + counts.one_to_one,
    // Everything automation is carrying this cycle: open sessions plus completed ones. Identified = coached + needs review.
    coached: counts.total - counts.needs_review,
    needsReview: counts.needs_review,
    completed: counts.completed,
    startedAutomatically,
    startedByManager: counts.total - startedAutomatically,
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
    'attention-session-needed-count': sessionFleetTotals.session_needed,
    'driver-attention-button-count': cycle.needsReview,
    'driver-attention-filter-count': cycle.needsReview,
    'analytics-identified-count': cycle.identified,
    'analytics-coached-count': cycle.automated,
    'analytics-escalated-count': cycle.needsReview,
    'analytics-one-to-one-count': cycle.oneToOne
  };
  Object.entries(values).forEach(([id, value]) => {
    const node = document.getElementById(id);
    if (node) node.textContent = value;
  });
  const attentionTotalButton = document.getElementById('attention-total-button');
  if (attentionTotalButton) attentionTotalButton.setAttribute('aria-label', 'Open all ' + sessionFleetTotals.manager_attention + ' sessions needing review');
  const attentionScope = document.getElementById('attention-scope');
  if (attentionScope) attentionScope.textContent = cycle.needsReview === 1 ? '1 session needs a person' : cycle.needsReview + ' sessions need a person';
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
  automationRunSummary.counts = { identified: cycle.identified, coached: cycle.startedAutomatically, completed: cycle.completed, systemHandled: cycle.inProgress, escalated: cycle.needsReview };
  if (currentWeek) {
    currentWeek.identified = cycle.identified;
    currentWeek.automated = cycle.automated;
    currentWeek.oneToOne = cycle.oneToOne;
    currentWeek.completed = cycle.completed;
    currentWeek.escalated = cycle.needsReview;
    currentWeek.inProgress = cycle.inProgress;
  }
  renderQueue();
  renderHomeOverview();
  const activitySummary = 'Across eight weekly cycles, identified and completed coaching generally increased while in-progress and review counts stayed small. For the week of ' + (currentWeek ? currentWeek.label : 'Aug 31') + ': ' + cycle.identified + ' identified = ' + cycle.automated + ' automated + ' + cycle.oneToOne + ' one-on-one + ' + cycle.needsReview + ' need review + ' + cycle.completed + ' completed.';
  const activitySummaryNode = document.getElementById('activity-chart-summary');
  const activitySummaryVisible = document.querySelector('.chart-data-summary p');
  if (activitySummaryNode) activitySummaryNode.textContent = activitySummary;
  if (activitySummaryVisible) activitySummaryVisible.textContent = activitySummary;
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
  const cycle = currentCycleCounts();
  const weekly = coachingPeriod === 1; // the ledger carries no prior window for multi-week spans
  kpiTrend('kpi-identified-trend', { delta: weekly && Number.isFinite(previousWeek?.identified) ? cycle.identified - previousWeek.identified : NaN, comparison: 'vs last week', neutral: true, unavailableLabel: 'No prior window' });
  kpiTrend('kpi-in-progress-trend', { delta: weekly && Number.isFinite(previousWeek?.inProgress) ? cycle.inProgress - previousWeek.inProgress : NaN, comparison: 'vs last week', neutral: true, unavailableLabel: 'No prior window' });
  kpiTrend('kpi-completed-trend', { delta: weekly && Number.isFinite(previousWeek?.completed) ? cycle.completed - previousWeek.completed : NaN, comparison: 'vs last week', unavailableLabel: 'No prior window' });
  kpiTrend('kpi-needs-review-trend', { delta: weekly && Number.isFinite(previousWeek?.escalated) ? cycle.needsReview - previousWeek.escalated : NaN, comparison: 'vs last week', lowerIsBetter: true, unavailableLabel: 'No prior window' });
  const safety = document.getElementById('kpi-fleet-safety');
  if (safety) safety.textContent = fleetSafetyScore.score;
  kpiTrend('kpi-safety-trend', { delta: fleetSafetyScore.change, comparison: fleetSafetyScore.comparison });
  const eventRate = fleetEventRatePer100k();
  const eventNode = document.getElementById('kpi-event-rate');
  if (eventNode) eventNode.textContent = eventRate.latest.toLocaleString('en-US');
  kpiTrend('kpi-events-trend', { delta: eventRate.change, suffix: '%', comparison: periodComparisonLabel(), lowerIsBetter: true });

  const reviewTotal = Math.max(1, cycle.needsReview); // flagged reviews without a session are already inside this total
  document.querySelectorAll('.attention-row[data-attention-reason]').forEach((row) => {
    const count = sessionFleetTotals[row.dataset.attentionReason] || 0;
    row.style.setProperty('--share', String(count / reviewTotal));
    row.classList.toggle('is-empty', count === 0);
  });

  const automated = cycle.startedAutomatically;
  const oneToOne = cycle.startedByManager;
  const completed = cycle.completed;
  const share = cycle.identified ? Math.round(automated / cycle.identified * 100) : 0;
  const values = {
    'automation-share': share + '%',
    'automation-week-automated': automated,
    'automation-week-manual': oneToOne,
    'automation-week-completed': completed,
    'automation-week-scope': periodScopeLabel(),
    'automation-week-title': coachingPeriod === 1 ? 'Automation this week' : 'Automation · last ' + coachingPeriod + ' weeks'
  };
  Object.entries(values).forEach(([id, value]) => {
    const node = document.getElementById(id);
    if (node) node.textContent = value;
  });
  const splitBar = document.getElementById('automation-split-bar');
  if (splitBar) {
    splitBar.setAttribute('aria-label', automated + ' coaching records started automatically versus ' + oneToOne + ' started by a manager, ' + periodLabel().toLowerCase());
    splitBar.querySelector('.is-automated').style.flexGrow = String(automated);
    splitBar.querySelector('.is-manual').style.flexGrow = String(oneToOne);
  }
  const max = Math.max(1, automated, oneToOne, completed);
  [['.automation-row.is-automated', automated], ['.automation-row.is-manual', oneToOne], ['.automation-row.is-completed', completed]].forEach(([selector, value]) => {
    const row = document.querySelector(selector);
    if (row) row.style.setProperty('--share', String(value / max));
  });
  const sessionsLink = document.getElementById('automation-sessions-link');
  if (sessionsLink) sessionsLink.setAttribute('aria-label', 'View ' + cycle.automated + ' automated sessions in progress');
}

function sessionMatchesFilter(session, filter) {
  filter = normalizeSessionFilter(filter);
  if (attentionReasonMeta[filter]) return session.state === 'manager_attention' && session.attentionReason === filter;
  if (filter === 'all') return true;
  return sessionEffectiveState(session) === filter;
}

function sessionViewTabs() {
  const totals = activeSessionSource === 'all' ? sessionFleetTotals : sessionOriginTotals[activeSessionSource];
  const activeLifecycle = attentionReasonMeta[activeSessionFilter] ? 'manager_attention' : activeSessionFilter;
  const labels = { all: 'All', manager_attention: 'Needs review', system_handling: 'In progress', completed: 'Completed', archived: 'Archived' };
  return Object.entries(labels).map(([key, label]) =>
    '<button type="button" role="radio" data-session-filter="' + key + '" class="' + (key === activeLifecycle ? 'is-active' : '') + '" aria-checked="' + (key === activeLifecycle) + '" tabindex="' + (key === activeLifecycle ? '0' : '-1') + '">' + label + '<b>' + totals[key] + '</b></button>'
  ).join('');
}

function sessionFilters() {
  const reason = attentionReasonMeta[activeSessionFilter] ? activeSessionFilter : 'all';
  const count = Number(activeSessionSource !== 'all') + Number(reason !== 'all');
  const option = (value, label, selected) => '<option value="' + value + '"' + (selected === value ? ' selected' : '') + '>' + label + '</option>';
  return '<div class="filter-sheet" data-filter-sheet="sessions">' +
    '<button class="filter-sheet-trigger" type="button" data-filter-sheet-trigger aria-expanded="false" aria-controls="session-filters">' + uiIcon('filter') + '<span>Filters</span>' + (count ? '<b class="filter-count">' + count + '</b>' : '') + '</button>' +
    '<button class="filter-sheet-backdrop" type="button" data-filter-sheet-close tabindex="-1" aria-label="Close session filters"></button>' +
    '<div class="filter-sheet-content" id="session-filters"><div class="filter-sheet-header"><strong>Session filters</strong><button class="icon-button" type="button" data-filter-sheet-close aria-label="Close session filters">' + uiIcon('close') + '</button></div>' +
    '<label class="refined-filter-field" for="session-origin-filter">Origin<select id="session-origin-filter">' + option('all', 'All origins', activeSessionSource) + option('automated', 'Automated', activeSessionSource) + option('manual_override', 'One-on-one', activeSessionSource) + '</select></label>' +
    '<label class="refined-filter-field" for="session-reason-filter">Review reason<select id="session-reason-filter">' + option('all', 'All reasons', reason) + Object.entries(attentionReasonMeta).map(([key, value]) => option(key, value.label, reason)).join('') + '</select></label>' +
    '<div class="filter-sheet-actions"><button class="text-action" type="button" data-clear-session-filters' + (count ? '' : ' disabled') + '>Reset</button><button class="primary-button" type="button" data-filter-sheet-close>Done</button></div></div></div>';
}

function renderSessionAppliedFilters() {
  const filters = [activeSessionSource === 'all' ? '' : activeSessionSource === 'automated' ? 'Automated' : 'One-on-one', attentionReasonMeta[activeSessionFilter]?.label].filter(Boolean);
  const summary = document.getElementById('session-applied-filters');
  summary.hidden = !filters.length;
  summary.innerHTML = filters.length ? '<span>' + filters.join(' · ') + '</span><button type="button" data-clear-session-filters>Clear filters</button>' : '';
}

function compactSessionStatus(session) {
  if (session.state === 'system_handling' && !session.attentionReason) return session.origin === 'manual_override' ? ['user', 'One-on-one'] : ['bolt', 'Automated'];
  const states = {
    driver_reply: ['message', 'Replied'], reminders_exhausted: ['clock', 'Overdue'],
    repeat_after_coaching: ['repeat', 'Repeated'],
    session_needed: ['alert', 'Needs review'], manager_attention: ['alert', 'Needs review'], system_handling: ['clock', 'In progress'],
    completed: ['check', 'Completed'], archived: ['archive', 'Archived']
  };
  return states[session.attentionReason] || states[session.state] || ['info', session.stateLabel];
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
  const reasonPriority = { reminders_exhausted: 0, session_needed: 1, repeat_after_coaching: 2, driver_reply: 3 };
  const normalizedSearch = sessionSearch.trim().toLowerCase();
  const filtered = allSessionRecords()
    .filter((item) => sessionMatchesFilter(item, activeSessionFilter))
    .filter((item) => activeSessionSource === 'all' || item.origin === activeSessionSource)
    .filter((item) => !normalizedSearch || [item.person, item.category, item.eventType, item.stateLabel, attentionReasonMeta[item.attentionReason]?.label, item.source, item.owner, item.latest, item.automationRun, item.due, item.sla].join(' ').toLowerCase().includes(normalizedSearch))
    .slice()
    .sort((a, b) => (lifecyclePriority[a.state] ?? 9) - (lifecyclePriority[b.state] ?? 9) || (reasonPriority[a.attentionReason] ?? 9) - (reasonPriority[b.attentionReason] ?? 9));
  const scopedTotals = activeSessionSource === 'all' ? sessionFleetTotals : sessionOriginTotals[activeSessionSource];
  const scopedCount = scopedTotals[activeSessionFilter] ?? 0;
  return [
    '<section class="session-list-card refined-sessions" aria-label="Coaching sessions">',
      '<div class="session-list-head" aria-hidden="true"><span>Driver</span><span>Program</span><span>Status</span><span>Coach</span><span>Due</span><span>Updated</span><span></span></div>',
      (filtered.length ? filtered.map((session) => {
        const [icon, status] = compactSessionStatus(session);
        const fullStatus = session.stateLabel + (session.attentionReason ? ' · ' + attentionReasonMeta[session.attentionReason].label : '');
        const activity = session.latest.split('·').map(part => part.trim());
        const updated = activity.length > 1 ? activity.at(-1) : /No response for (\d+) days/.test(session.latest) ? session.latest.match(/(\d+) days/)[1] + 'd inactive' : session.latest;
        const due = session.due === 'Resolve before next shift' ? 'Next shift' : session.due || '—';
        const origin = session.origin === 'manual_override' ? 'One-on-one' : 'Automated';
        const context = [session.person, session.category, fullStatus, origin, 'Coach: ' + coachLabel(session), 'Owner: ' + session.owner, session.automationRun, 'Due: ' + session.due, session.latest].filter(Boolean).join('. ');
        const rowAction = session.state === 'manager_attention' ? '<span class="row-action">' + reviewActionLabel(session) + '</span>' : '<span class="row-arrow" aria-hidden="true">' + uiIcon('chevron') + '</span>';
        return '<button class="session-row' + (session.candidate ? ' is-candidate' : '') + '" type="button" ' + (session.candidate ? 'data-start-session-for="' + session.id + '"' : 'data-open-session="' + session.id + '"') + ' aria-haspopup="dialog" aria-label="' + escapeHtml(context + (session.state === 'manager_attention' ? '. ' + reviewActionLabel(session) : '')) + '">' +
          '<span class="session-person"><span class="person-avatar" aria-hidden="true">' + session.initials + '</span><strong>' + escapeHtml(session.person) + '</strong></span>' +
          '<span class="session-topic"><span class="icon-hint session-origin-icon" data-tooltip="' + escapeHtml(origin + ' · ' + (session.automationRun || 'Current cycle')) + '" aria-label="' + origin + '">' + uiIcon(origin === 'Automated' ? 'bolt' : 'user') + '</span><span>' + escapeHtml(session.category) + '</span>' + sessionClipBadge(session) + '</span>' +
          '<span class="session-status compact-status ' + sessionStatusClass(session) + '" data-tooltip="' + escapeHtml(fullStatus) + '">' + uiIcon(icon) + '<span>' + status + '</span></span>' +
          '<span class="session-coach" data-tooltip="' + escapeHtml(coachLabel(session) === 'Automated' ? 'Coached by automation' : 'One-on-one coached by ' + coachLabel(session)) + '">' + uiIcon(coachLabel(session) === 'Automated' ? 'bolt' : 'user') + '<span>' + escapeHtml(coachLabel(session)) + '</span></span>' +
          '<span class="session-sla ' + (session.slaTone || '') + '" data-tooltip="' + escapeHtml([session.due, session.sla].filter(Boolean).join(' · ')) + '">' + escapeHtml(due) + '</span>' +
          '<span class="latest-activity" data-tooltip="' + escapeHtml(session.latest) + '">' + escapeHtml(updated) + '</span>' +
          rowAction + '</button>';
      }).join('') : '<div class="empty-state">No sessions found.<br><small>Try another search or clear your filters.</small></div>'),
      '<footer class="session-footer"><span>' + filtered.length + ' of ' + scopedCount + ' sessions</span><span>' + (activeSessionFilter === 'all' ? 'Attention first' : ['completed', 'archived'].includes(activeSessionFilter) ? '' : 'Grouped by reason') + '</span></footer>',
    '</section>'
  ].join('');
}

// Source fixtures and compatibility helpers for the event-owned evidence model.
// Staging is local to the reply; driver/session associations change only on Send.
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
  sessionDrawerOrigin = { type: origin?.type || 'sessions', driverName: origin?.driverName || null };
  if (sessionDrawerOrigin.type !== 'driver-profile') activeDriverProfile = null;
  renderSessionDrawer();
  drawerBackdrop.hidden = false;
  driverDrawer.inert = false;
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
  const tierDescriptions = { unscored: 'Safety score unavailable', risk: 'Safety score below 60', watch: 'Safety score 60–79', safe: 'Safety score 80–100' };
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
    button.querySelector('.driver-bin-track i').style.height = Math.max(8, Math.round(bin.count / max * 100)) + '%';
  });
  document.querySelectorAll('#view-drivers [data-driver-score-filter]').forEach((button) => {
    const selected = button.dataset.driverScoreFilter === activeDriverScoreFilter;
    button.classList.toggle('is-active', selected);
    button.setAttribute('aria-pressed', String(selected));
  });
  renderDriverCoachingOverview();
}


function renderDriverFilterState() {
  if (!driverFilterState) return;
  const tokens = [];
  if (activeDriverScoreFilter !== 'all') tokens.push(['score', driverScoreFilterLabel(activeDriverScoreFilter)]);
  if (activeDriverGroup !== 'all') tokens.push(['group', activeDriverGroup]);
  if (activeDriverCategory !== 'all') tokens.push(['program', activeDriverCategory]);
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

function driverDirectoryStatus(item) {
  const states = {
    coached: driverOrigin(item.name) === 'manual_override'
      ? { label: 'One-on-one', icon: 'user', tone: 'neutral', description: 'Manager-led coaching in progress.' }
      : { label: 'Automated', icon: 'bolt', tone: 'neutral', description: 'Automated coaching in progress.' },
    outcome: { label: 'Completed', icon: 'check', tone: 'neutral', description: 'Coaching completed; the outcome window is being measured.' },
    track: { label: 'On track', icon: 'check', tone: 'good', description: 'No review needed.' }
  };
  if (item.state !== 'attention') return states[item.state] || states.track;
  const session = allSessionRecords().find((record) => record.person === item.name && record.state === 'manager_attention');
  const insight = attentionAiInsights.find((record) => record.name === item.name && !resolvedAttentionIds.has(record.id));
  const reason = session?.attentionReason || insight?.reason;
  return ({
    session_needed: { label: 'Needs review', icon: 'alert', tone: 'issue', description: 'Automation flagged this driver; no session exists yet. Start the session.' },
    driver_reply: { label: 'Replied', icon: 'message', tone: 'reply', description: 'A driver response needs your review.' },
    reminders_exhausted: { label: 'Overdue', icon: 'clock', tone: 'issue', description: 'Automatic reminders are exhausted. Contact the driver.' },
    repeat_after_coaching: { label: 'Repeated', icon: 'repeat', tone: 'warning', description: 'The behavior repeated after coaching. Review the latest event.' }
  })[reason] || { label: 'Needs review', icon: 'alert', tone: 'issue', description: 'A coaching record needs review.' };
}

function renderDirectory() {
  renderDriverDistribution();
  renderDriverFilterState();
  const term = document.getElementById('driver-search').value.trim().toLowerCase();
  const filtered = directory.filter((item) => {
    const statusMatches = driverMatchesStatus(item, activeDriverFilter);
    const groupMatches = activeDriverGroup === 'all' || item.group === activeDriverGroup;
    const categoryMatches = activeDriverCategory === 'all' || item.focus === activeDriverCategory;
    return statusMatches && groupMatches && categoryMatches && driverMatchesScore(item, activeDriverScoreFilter) && item.name.toLowerCase().includes(term);
  }).sort((a, b) => {
    if (driverSort === 'lowest') return (Number.isFinite(a.safetyScore) ? a.safetyScore : 101) - (Number.isFinite(b.safetyScore) ? b.safetyScore : 101);
    if (driverSort === 'decline') return (Number.isFinite(a.scoreChange) ? a.scoreChange : 99) - (Number.isFinite(b.scoreChange) ? b.scoreChange : 99);
    const priority = { attention: 0, coached: 1, outcome: 2, track: 3 };
    return priority[a.state] - priority[b.state] || (Number.isFinite(a.safetyScore) ? a.safetyScore : 101) - (Number.isFinite(b.safetyScore) ? b.safetyScore : 101);
  });
  const rows = filtered.map((item) => {
    const scored = Number.isFinite(item.safetyScore);
    const scoreTone = !scored ? 'unscored' : item.safetyScore < 60 ? 'risk' : item.safetyScore < 80 ? 'watch' : 'good';
    const hasChange = scored && Number.isFinite(item.scoreChange);
    const changeLabel = hasChange ? (item.scoreChange > 0 ? '+' : '') + item.scoreChange : '';
    const scoreLabel = scored ? 'Safety score ' + item.safetyScore + (hasChange ? '. Change: ' + changeLabel + ' points from the prior period.' : '') : 'Safety score unavailable';
    const coachingLabel = item.lastCoaching === '—' ? 'No recent coaching recorded' : 'Last coaching: ' + item.lastCoaching;
    const status = driverDirectoryStatus(item);
    const action = '<button class="directory-review" type="button" data-open-driver-profile="' + escapeHtml(item.name) + '" aria-label="View driver ' + escapeHtml(item.name) + '">View' + uiIcon('chevron') + '</button>';
    return [
      // The whole row opens the driver; the name and View buttons remain the keyboard openers.
      '<div class="directory-row" data-open-driver-profile="' + escapeHtml(item.name) + '">',
        '<button class="directory-person" type="button" data-open-driver-profile="' + escapeHtml(item.name) + '" aria-haspopup="dialog" aria-label="Open driver profile for ' + escapeHtml(item.name) + '"><span class="person-avatar" aria-hidden="true">' + item.initials + '</span><span class="person-copy"><strong>' + escapeHtml(item.name) + '</strong></span></button>',
        '<span class="driver-score ' + scoreTone + '" tabindex="0" data-tooltip="' + escapeHtml(scoreLabel) + '" aria-label="' + escapeHtml(scoreLabel) + '"><strong>' + (scored ? item.safetyScore : '—') + '</strong>' + (hasChange ? '<small class="' + (item.scoreChange >= 0 ? 'up' : 'down') + '">' + changeLabel + '</small>' : '') + '</span>',
        '<span class="directory-program"><span>' + escapeHtml(item.focus) + '</span></span>',
        '<span class="directory-coached' + (item.lastCoaching === '—' ? ' is-empty' : '') + '" aria-label="' + escapeHtml(coachingLabel) + '">' + escapeHtml(item.lastCoaching === '—' ? 'Not yet' : item.lastCoaching) + '</span>',
        '<span class="directory-status ' + status.tone + '" tabindex="0" data-tooltip="' + escapeHtml(status.description) + '" aria-label="' + escapeHtml(status.label + '. ' + status.description) + '">' + uiIcon(status.icon) + '<span>' + escapeHtml(status.label) + '</span></span>',
        '<span class="directory-action">' + action + '</span>',
      '</div>'
    ].join('');
  }).join('');
  document.getElementById('driver-directory').innerHTML = filtered.length
    ? '<div class="directory-head"><span>Driver</span><span class="directory-score-heading">Safety score<button class="info-hint" type="button" data-tooltip="Higher is safer. The smaller number shows the change from the prior period." aria-label="About safety scores">' + uiIcon('info') + '</button></span><span>Top event</span><span>Last coached</span><span>Status</span><span class="sr-only">Action</span></div>' + rows + '<div class="driver-directory-footer">Showing ' + filtered.length + ' of 1,024 drivers</div>'
    : '<div class="driver-directory-empty"><strong>No drivers match</strong><span>Change or clear the active filters.</span><button class="secondary-button" type="button" data-clear-driver-filter="all">Clear filters</button></div>';
}

function syncDirectoryAttentionState(name, shouldRender = true) {
  const driver = directory.find((item) => item.name === name);
  if (!driver) return;
  const unresolvedInsight = attentionAiInsights.find((insight) => insight.name === name && !resolvedAttentionIds.has(insight.id));
  const attentionSession = allSessionRecords().find((session) => session.person === name && isAttentionSessionState(session.state));
  if (unresolvedInsight || attentionSession) {
    driver.state = 'attention';
    driver.stateLabel = 'Needs review';
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
function openDriverRecord(name, focusFootage = false) {
  if (!name) return;
  pendingFootageFocus = Boolean(focusFootage);
  activeDriverFilter = 'all';
  activeDriverGroup = 'all';
  activeDriverCategory = 'all';
  activeDriverScoreFilter = 'all';
  const driverSearch = document.getElementById('driver-search');
  if (driverSearch) driverSearch.value = name;
  setView('drivers', { focusHeading: false });
  window.setTimeout(() => {
    if (focusFootage) openAttentionDriver(name);
    else openDriverProfile(name);
  }, 0);
}

function openAttentionDriver(name) {
  const flag = candidateFor(name);
  if (flag) {
    startSessionForCandidate(flag.id);
    return;
  }
  const session = sessions.find((item) => item.person === name && item.state === 'manager_attention');
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
  document.getElementById('library-grid').innerHTML = lessons.map((lesson) => [
    '<article class="lesson-card">',
      '<div class="lesson-card-top"><span class="lesson-icon" aria-hidden="true"><svg viewBox="0 0 24 24"><path d="M4 4h16v16H4zM8 4v16M16 4v16M4 9h4M4 15h4M16 9h4M16 15h4"/></svg></span><button class="info-hint" type="button" data-tooltip="' + escapeHtml(lesson.version + ' · Requires video review, acknowledgement, and a two-question quiz.') + '" aria-label="' + escapeHtml('Requirements and version for ' + lesson.title) + '">' + uiIcon('info') + '</button></div>',
      '<h2>' + escapeHtml(lesson.title) + '</h2>',
      '<p>' + escapeHtml(lesson.category) + '</p>',
      '<div class="lesson-meta"><span>' + escapeHtml(lesson.length) + '</span><span>' + escapeHtml(lesson.completion) + ' completion</span></div>',
    '</article>'
  ].join('')).join('');
}

function settingsAreDirty() {
  return draftAutomationMode !== automationMode
    || draftCadenceWeeks !== cadenceWeeks
    || JSON.stringify(draftEventTypeRules) !== JSON.stringify(eventTypeRules)
    || JSON.stringify(draftCoachingRules) !== JSON.stringify(coachingRules);
}

function settingsRuleChanges() {
  const before = new Map(eventTypeRules.map((rule) => [rule.id, JSON.stringify(rule)]));
  const afterIds = new Set(draftEventTypeRules.map((rule) => rule.id));
  const changedTypes = draftEventTypeRules.filter((rule) => before.get(rule.id) !== JSON.stringify(rule));
  const addedTypes = changedTypes.filter((rule) => !before.has(rule.id));
  const removedTypes = eventTypeRules.filter((rule) => !afterIds.has(rule.id));
  const rulesChanged = JSON.stringify(draftCoachingRules) !== JSON.stringify(coachingRules);
  const programs = new Set(changedTypes.concat(removedTypes).map((rule) => rule.programId));
  if (rulesChanged) draftCoachingRules.concat(coachingRules).forEach((rule) => programs.add(rule.scope));
  return { changedTypes, addedTypes, removedTypes, rulesChanged, programs };
}

function settingsDraftProgramsAffected() {
  const activePrograms = categories.filter((category) => category.coached > 0).length;
  if (draftAutomationMode !== automationMode || draftCadenceWeeks !== cadenceWeeks) return activePrograms;
  const { programs } = settingsRuleChanges();
  if (programs.has('all')) return activePrograms;
  return programs.size || activePrograms;
}

function settingsDraftSummary() {
  const parts = [];
  if (draftAutomationMode !== automationMode || draftCadenceWeeks !== cadenceWeeks) parts.push(settingsModeLabel(draftAutomationMode) + ' with coaching ' + (draftCadenceWeeks === 1 ? 'every week' : 'every 2 weeks'));
  const { changedTypes, addedTypes, removedTypes, rulesChanged } = settingsRuleChanges();
  const edited = changedTypes.length - addedTypes.length;
  if (addedTypes.length) parts.push(addedTypes.length + (addedTypes.length === 1 ? ' new event type' : ' new event types'));
  if (edited) parts.push(edited + (edited === 1 ? ' event type changed' : ' event types changed'));
  if (removedTypes.length) parts.push(removedTypes.length + (removedTypes.length === 1 ? ' event type removed' : ' event types removed'));
  if (rulesChanged) parts.push('coaching rules updated');
  return parts.join(' · ') + ' will apply only after Save and activate.';
}

function persistRuleSettings() {
  const typesSaved = saveSetting('elevate-event-types', JSON.stringify(draftEventTypeRules));
  const rulesSaved = saveSetting('elevate-coaching-rules', JSON.stringify(draftCoachingRules));
  return typesSaved && rulesSaved;
}

function markSettingsDraft() {
  settingsState = settingsAreDirty() ? 'dirty' : 'saved';
  settingsPanelMode = null;
  renderSettings();
}

function selectOptions(map, selected) {
  return Object.entries(map).map(([value, label]) => '<option value="' + value + '"' + (value === selected ? ' selected' : '') + '>' + label + '</option>').join('');
}

function programOptions(selected, includeAll) {
  return (includeAll ? '<option value="all"' + (selected === 'all' ? ' selected' : '') + '>any program</option>' : '')
    + categories.map((category) => '<option value="' + category.id + '"' + (category.id === selected ? ' selected' : '') + '>' + escapeHtml(category.name) + '</option>').join('');
}

function eventTypeRow(rule) {
  const name = escapeHtml(rule.name);
  return [
    '<div class="event-type-row' + (rule.enabled ? '' : ' is-off') + '" data-event-type-row="' + rule.id + '">',
      '<button class="switch" type="button" role="switch" aria-checked="' + rule.enabled + '" data-event-type-toggle="' + rule.id + '" aria-label="' + escapeHtml((rule.enabled ? 'Disable ' : 'Enable ') + rule.name) + '"><i></i></button>',
      '<span class="event-type-name"><strong>' + name + '</strong><small>' + escapeHtml(categoryNameFor(rule.programId)) + '</small></span>',
      '<select class="settings-select" data-event-type-field="severity" data-event-type-id="' + rule.id + '" aria-label="' + escapeHtml('Severity for ' + rule.name) + '">' + selectOptions(severityOptions, rule.severity) + '</select>',
      '<span class="trigger-field"><input class="settings-input" type="number" min="1" max="50" value="' + rule.threshold + '" data-event-type-field="threshold" data-event-type-id="' + rule.id + '" aria-label="' + escapeHtml('Events per cycle that trigger ' + rule.name) + '"><span>/ cycle</span><label class="check-field"><input type="checkbox" data-event-type-field="videoRequired" data-event-type-id="' + rule.id + '"' + (rule.videoRequired ? ' checked' : '') + ' aria-label="' + escapeHtml('Require video for ' + rule.name) + '"><span>Video</span></label></span>',
      '<select class="settings-select" data-event-type-field="path" data-event-type-id="' + rule.id + '" aria-label="' + escapeHtml('Coaching path for ' + rule.name) + '">' + selectOptions(coachingPathOptions, rule.path) + '</select>',
      '<button class="icon-button row-remove" type="button" data-remove-event-type="' + rule.id + '" aria-label="' + escapeHtml('Remove ' + rule.name) + '">×</button>',
    '</div>'
  ].join('');
}

function eventTypeForm() {
  return [
    '<form class="event-type-form" id="event-type-form" aria-label="Add event type">',
      '<label>Event type<input class="settings-input" name="name" required maxlength="60" placeholder="e.g. Lane departure" autocomplete="off"></label>',
      '<label>Program<select class="settings-select" name="programId">' + programOptions('following', false) + '</select></label>',
      '<label>Severity<select class="settings-select" name="severity">' + selectOptions(severityOptions, 'Medium') + '</select></label>',
      '<label>Trigger<span class="trigger-field"><input class="settings-input" type="number" name="threshold" min="1" max="50" value="3"><span>events / cycle</span></span></label>',
      '<label class="check-field form-check"><input type="checkbox" name="videoRequired"><span>Video required</span></label>',
      '<label>Coaching path<select class="settings-select" name="path">' + selectOptions(coachingPathOptions, 'lesson') + '</select></label>',
      '<div class="event-type-form-actions"><button class="secondary-button" type="button" data-cancel-event-type>Cancel</button><button class="primary-button" type="submit">Add to draft</button></div>',
    '</form>'
  ].join('');
}

function coachingRuleRow(rule) {
  return [
    '<div class="rule-row" data-rule-row="' + rule.id + '">',
      '<span class="rule-word">When</span>',
      '<select class="settings-select" data-rule-field="scope" data-rule-id="' + rule.id + '" aria-label="Rule scope">' + programOptions(rule.scope, true) + '</select>',
      '<span class="rule-word">has</span>',
      (rule.condition === 'count_threshold' ? '<input class="settings-input rule-count" type="number" min="2" max="50" value="' + rule.count + '" data-rule-field="count" data-rule-id="' + rule.id + '" aria-label="Event count">' : ''),
      '<select class="settings-select" data-rule-field="condition" data-rule-id="' + rule.id + '" aria-label="Rule condition">' + selectOptions(ruleConditionLabels, rule.condition) + '</select>',
      '<span class="rule-word">then</span>',
      '<select class="settings-select" data-rule-field="action" data-rule-id="' + rule.id + '" aria-label="Rule action">' + selectOptions(ruleActionLabels, rule.action) + '</select>',
      '<button class="icon-button row-remove" type="button" data-remove-rule="' + rule.id + '" aria-label="Remove rule">×</button>',
    '</div>'
  ].join('');
}

function renderRuleSettings() {
  const rows = document.getElementById('event-type-rows');
  if (rows) {
    const order = (rule) => categories.findIndex((category) => category.id === rule.programId);
    const list = draftEventTypeRules.slice().sort((a, b) => order(a) - order(b)).map(eventTypeRow).join('');
    rows.innerHTML = (eventTypeFormOpen ? eventTypeForm() : '') + (list || '<div class="settings-empty">No event types configured. Add one so automation has something to listen for.</div>');
  }
  const typeCount = document.getElementById('event-types-count');
  if (typeCount) {
    const on = draftEventTypeRules.filter((rule) => rule.enabled).length;
    const off = draftEventTypeRules.length - on;
    typeCount.textContent = on + ' active' + (off ? ' · ' + off + ' off' : '');
  }
  const addButton = document.querySelector('[data-add-event-type]');
  if (addButton) addButton.setAttribute('aria-expanded', String(eventTypeFormOpen));
  const ruleRows = document.getElementById('rule-rows');
  if (ruleRows) ruleRows.innerHTML = draftCoachingRules.map(coachingRuleRow).join('') || '<div class="settings-empty">No rules. Automation follows each event type’s coaching path.</div>';
  const ruleCount = document.getElementById('rules-count');
  if (ruleCount) ruleCount.textContent = draftCoachingRules.length + (draftCoachingRules.length === 1 ? ' rule' : ' rules');
}

function settingsModeLabel(mode) {
  return mode === 'fully' ? 'Fully automated' : mode === 'semi' ? 'Semi-automated' : 'Manual';
}

function persistSettings(mode, weeks, savedAt) {
  try {
    if (!window.localStorage) return false;
    const previous = {
      mode: window.localStorage.getItem('elevate-automation-mode'),
      cadence: window.localStorage.getItem('elevate-cadence-weeks'),
      savedAt: window.localStorage.getItem('elevate-settings-saved-at')
    };
    try {
      window.localStorage.setItem('elevate-automation-mode', mode);
      window.localStorage.setItem('elevate-cadence-weeks', String(weeks));
      window.localStorage.setItem('elevate-settings-saved-at', savedAt);
      return true;
    } catch (error) {
      Object.entries(previous).forEach(([key, value]) => {
        const storageKey = key === 'mode' ? 'elevate-automation-mode' : key === 'cadence' ? 'elevate-cadence-weeks' : 'elevate-settings-saved-at';
        if (value === null) window.localStorage.removeItem(storageKey);
        else window.localStorage.setItem(storageKey, value);
      });
      return false;
    }
  } catch (error) {
    return false;
  }
}

function settingsPreviewCopy(mode, weeks) {
  const cycle = currentCycleCounts();
  const identified = weeks === 1 ? cycle.identified : cycle.identified * 2;
  const eligible = weeks === 1 ? cycle.startedAutomatically : cycle.startedAutomatically * 2;
  const windowLabel = weeks === 1 ? '7-day' : '14-day';
  if (mode === 'manual') {
    return {
      drivers: identified + ' require review',
      audit: identified + ' matches evaluated · manual review only',
      description: identified + ' matches were evaluated across 8 programs for the ' + windowLabel + ' window. All ' + identified + ' would require manager review and 0 would be coached automatically. No assignments were sent.'
    };
  }
  if (mode === 'semi') {
    return {
      drivers: eligible + ' await approval',
      audit: eligible + ' assignments held for approval',
      description: identified + ' matches were evaluated across 8 programs for the ' + windowLabel + ' window. ' + eligible + ' coaching assignments would be prepared for manager approval and 0 would be sent automatically. No assignments were sent.'
    };
  }
  return {
    drivers: eligible + ' projected',
    audit: eligible + ' automatic assignments projected',
    description: identified + ' matches were evaluated across 8 programs for the ' + windowLabel + ' window: ' + eligible + ' would be coached automatically. The current ledger contains ' + sessionFleetTotals.system_handling + ' automated and ' + sessionFleetTotals.manager_attention + ' needs-review sessions. No assignments were sent.'
  };
}

function previewSettingsDraft() {
  settingsPanelMode = 'preview';
  settingsState = settingsAreDirty() ? 'dirty' : 'saved';
  const now = new Intl.DateTimeFormat('en-CA', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' }).format(new Date()).replace(',', ' ·');
  const preview = settingsPreviewCopy(draftAutomationMode, draftCadenceWeeks);
  settingsAuditHistory.unshift({ action: 'Dry run completed', detail: preview.audit, time: now });
  saveSetting('elevate-settings-audit', JSON.stringify(settingsAuditHistory.slice(0, 20)));
  renderSettings();
  showToast('Dry run complete; no coaching was sent');
}

function discardSettingsDraft() {
  draftAutomationMode = automationMode;
  draftCadenceWeeks = cadenceWeeks;
  draftEventTypeRules = cloneJson(eventTypeRules);
  draftCoachingRules = cloneJson(coachingRules);
  eventTypeFormOpen = false;
  settingsState = 'saved';
  settingsPanelMode = null;
  renderSettings();
  showToast('Draft changes discarded');
}

function activateSettingsDraft() {
  if (!settingsAreDirty()) return;
  const now = new Intl.DateTimeFormat('en-CA', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' }).format(new Date()).replace(',', ' ·');
  if (!persistSettings(draftAutomationMode, draftCadenceWeeks, now)) {
    settingsState = 'error';
    settingsPanelMode = null;
    renderSettings();
    showToast('Changes could not be activated');
    return;
  }
  const ruleChanges = settingsRuleChanges();
  persistRuleSettings();
  eventTypeRules = cloneJson(draftEventTypeRules);
  coachingRules = cloneJson(draftCoachingRules);
  eventTypeFormOpen = false;
  automationMode = draftAutomationMode;
  cadenceWeeks = draftCadenceWeeks;
  settingsSavedAt = now;
  settingsState = 'saved';
  settingsPanelMode = null;
  automationRunSummary.mode = automationMode;
  automationRunSummary.cadenceWeeks = cadenceWeeks;
  const schedule = scheduleForCadence(cadenceWeeks);
  automationRunSummary.analysisWindow = schedule.analysisWindow;
  automationRunSummary.nextRun = schedule.nextRun;
  const ruleDetail = [ruleChanges.changedTypes.length + ruleChanges.removedTypes.length ? (ruleChanges.changedTypes.length + ruleChanges.removedTypes.length) + ' event type change' + (ruleChanges.changedTypes.length + ruleChanges.removedTypes.length === 1 ? '' : 's') : '', ruleChanges.rulesChanged ? 'rules updated' : ''].filter(Boolean).join(' · ');
  settingsAuditHistory.unshift({ action: 'Configuration activated', detail: settingsModeLabel(automationMode) + ' · ' + (cadenceWeeks === 1 ? 'weekly' : 'every 2 weeks') + (ruleDetail ? ' · ' + ruleDetail : ''), time: settingsSavedAt });
  saveSetting('elevate-settings-audit', JSON.stringify(settingsAuditHistory.slice(0, 20)));
  renderSettings();
  syncFleetSessionCounts();
  showToast('Settings saved and activated');
}

function renderSettings() {
  const modes = {
    manual: { label: 'Manual', next: 'Managers review every match before coaching starts' },
    semi: { label: 'Semi-automated', next: 'Matches wait for manager approval' },
    fully: { label: 'Fully automated', next: 'Next coaching cycle · Monday, 8:00 AM' }
  };
  const dirty = settingsAreDirty();
  if (settingsState !== 'error') settingsState = dirty ? 'dirty' : 'saved';
  document.querySelectorAll('[data-automation-mode]').forEach((button) => {
    const active = button.dataset.automationMode === draftAutomationMode;
    button.classList.toggle('is-active', active);
    button.setAttribute('aria-checked', String(active));
    button.removeAttribute('aria-pressed');
    button.tabIndex = active ? 0 : -1;
  });
  document.querySelectorAll('[data-cadence]').forEach((button) => {
    const active = Number(button.dataset.cadence) === draftCadenceWeeks;
    button.classList.toggle('is-active', active);
    button.setAttribute('aria-checked', String(active));
    button.removeAttribute('aria-pressed');
    button.tabIndex = active ? 0 : -1;
  });
  const statusTitle = document.querySelector('.settings-status-card strong');
  const statusCopy = document.querySelector('.settings-status-card small');
  const statusDot = document.querySelector('.settings-status-card .automation-live-dot');
  if (statusTitle) statusTitle.textContent = modes[automationMode].label;
  if (statusCopy) statusCopy.textContent = modes[automationMode].next;
  if (statusDot) {
    statusDot.classList.toggle('is-paused', automationMode === 'manual');
    statusDot.classList.toggle('is-review', automationMode === 'semi');
  }
  const cadenceWindow = document.getElementById('cadence-window');
  const cadenceDispatch = document.getElementById('cadence-dispatch');
  if (cadenceWindow) cadenceWindow.textContent = draftCadenceWeeks === 1 ? 'Previous 7 days' : 'Previous 14 days';
  if (cadenceDispatch) cadenceDispatch.textContent = draftCadenceWeeks === 1 ? 'Monday · 8:00 AM' : 'Every other Monday · 8:00 AM';
  const impact = document.getElementById('settings-impact');
  const impactState = settingsState === 'error' ? 'error' : settingsPanelMode === 'preview' ? 'preview' : dirty ? 'dirty' : 'saved';
  if (impact) {
    impact.dataset.state = impactState;
    impact.classList.toggle('is-saved-quiet', !dirty && settingsState !== 'error' && !settingsPanelMode);
    impact.classList.toggle('is-dirty', dirty);
    impact.classList.toggle('is-error', settingsState === 'error');
    impact.classList.toggle('is-preview', settingsPanelMode === 'preview');
  }
  const impactCopy = {
    title: dirty ? 'Review unpublished changes' : 'No unpublished changes',
    summary: dirty
      ? settingsDraftSummary()
      : 'The active setup remains scheduled for the next ' + (cadenceWeeks === 1 ? 'weekly' : 'two-week') + ' cycle.',
    state: settingsState === 'error' ? 'Activation failed' : dirty ? 'Unsaved draft' : 'Active',
    programs: String(dirty ? settingsDraftProgramsAffected() : categories.filter((category) => category.coached > 0).length),
    drivers: dirty ? settingsPreviewCopy(draftAutomationMode, draftCadenceWeeks).drivers : String(currentCycleCounts().startedAutomatically),
    run: dirty
      ? (draftCadenceWeeks === 1 ? 'Next Monday' : 'Moves to Sep 14')
      : 'No change'
  };
  Object.entries({
    'settings-impact-title': impactCopy.title,
    'settings-impact-summary': impactCopy.summary,
    'settings-impact-state': impactCopy.state,
    'settings-impact-programs': impactCopy.programs,
    'settings-impact-drivers': impactCopy.drivers,
    'settings-impact-run': impactCopy.run
  }).forEach(([id, value]) => {
    const node = document.getElementById(id);
    if (node) node.textContent = value;
  });
  const previewPanel = document.getElementById('settings-preview-panel');
  if (previewPanel) {
    previewPanel.hidden = !settingsPanelMode;
    if (settingsPanelMode === 'preview') {
      previewPanel.innerHTML = '<strong>Dry-run preview ready</strong><span>' + escapeHtml(settingsPreviewCopy(draftAutomationMode, draftCadenceWeeks).description) + '</span>';
    } else if (settingsPanelMode === 'audit') {
      previewPanel.innerHTML = '<strong>Recent run &amp; change history</strong><ol>' + settingsAuditHistory.slice(0, 4).map((item) => '<li><span>' + escapeHtml(item.action) + '</span><small>' + escapeHtml(item.detail + ' · ' + item.time) + '</small></li>').join('') + '</ol>';
    }
  }
  const errorNode = document.getElementById('settings-save-error');
  if (errorNode) errorNode.hidden = settingsState !== 'error';
  const saveState = document.getElementById('settings-save-state');
  if (saveState) {
    saveState.dataset.state = settingsState;
    saveState.classList.toggle('is-dirty', dirty);
    saveState.classList.toggle('is-error', settingsState === 'error');
    saveState.textContent = settingsState === 'error' ? 'Activation failed · draft retained' : dirty ? 'Unsaved changes' : 'Saved ' + settingsSavedAt;
  }
  const discard = document.getElementById('settings-discard');
  const save = document.getElementById('settings-save');
  const preview = document.getElementById('settings-preview');
  if (discard) discard.disabled = !dirty;
  if (save) save.disabled = !dirty;
  if (preview) preview.textContent = settingsPanelMode === 'preview' ? 'Refresh preview' : 'Run preview';
  renderRuleSettings();
  const commandStatus = document.getElementById('automation-command-status');
  if (commandStatus) {
    const schedule = cadenceWeeks === 1 ? 'Runs Mondays' : 'Runs every other Monday';
    const mode = automationMode === 'fully' ? 'fully automated' : automationMode === 'semi' ? 'human review' : 'manual review only';
    commandStatus.innerHTML = schedule + ' · ' + mode + ' <b aria-hidden="true">›</b>';
  }
  const summaryValues = {
    'automation-mode-summary': settingsModeLabel(automationMode),
    'automation-cadence-summary': cadenceWeeks === 1 ? 'Every week' : 'Every 2 weeks',
    'automation-last-run': automationRunSummary.lastRun,
    'automation-next-run': automationRunSummary.nextRun
  };
  Object.entries(summaryValues).forEach(([id, value]) => {
    const node = document.getElementById(id);
    if (node) node.textContent = value;
  });
}

const outcomeDetailViews = {
  get category() {
    return {
      label: 'Program',
      rows: outcomePrograms()
        .map((category) => ({ category, outcome: outcomeFor(category) }))
        .sort((a, b) => a.outcome.change - b.outcome.change)
        .map(({ category, outcome }) => [category.name, outcomeWindowLabel(), formatRate(outcome.before), formatRate(outcome.after), movementCopy(outcome.change), outcome.completion, outcome.label, outcome.improvedResult])
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
  const resultIcons = {
    Improved: '<circle cx="12" cy="12" r="9"/><path d="m8 12 3 3 5-6"/>',
    Unchanged: '<circle cx="12" cy="12" r="9"/><path d="M8 12h8"/>',
    Review: '<path d="m12 3 10 18H2L12 3Z"/><path d="M12 9v5m0 3v1"/>'
  };
  const periodHint = 'Before and after coaching, aligned to each coaching date. Rates are events per 1,000 trips.';
  table.innerHTML = [
    '<table class="analytics-data-table analytics-outcome-table"><caption class="sr-only">Coaching outcomes by ' + view.label.toLowerCase() + '. Event rates per 1,000 trips.</caption>',
    '<thead><tr><th scope="col">' + view.label + '</th><th scope="col"><span class="analytics-column-label">Before<button class="info-hint" type="button" data-tooltip="' + periodHint + '" aria-label="' + periodHint + '">' + infoIcon + '</button></span></th><th scope="col">After</th><th scope="col">Change</th><th scope="col">Completion</th><th scope="col">Result</th></tr></thead><tbody>',
    view.rows.map((row) => {
      const context = outcomeTab === 'category' ? '' : '<button class="info-hint" type="button" data-tooltip="' + escapeHtml(row[1]) + '" aria-label="' + escapeHtml(row[0] + ': ' + row[1]) + '">' + infoIcon + '</button>';
      const resultDescription = row[0] + ': ' + row[6];
      return '<tr><th scope="row"><span class="analytics-row-name">' + escapeHtml(row[0]) + context + '</span></th><td>' + row[2] + '</td><td>' + row[3] + '</td><td class="' + (row[7] ? 'positive' : '') + '">' + row[4] + '</td><td>' + row[5] + '%</td><td><button class="analytics-status-icon ' + row[6].toLowerCase() + '" type="button" data-tooltip="' + escapeHtml(resultDescription) + '" aria-label="' + escapeHtml(resultDescription) + '"><svg viewBox="0 0 24 24" aria-hidden="true">' + resultIcons[row[6]] + '</svg></button></td></tr>';
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
    setView('coaching', { focusHeading: false });
    window.setTimeout(() => openCategoryDrawer(id), 0);
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
    openManualSessionDialog();
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
    openDriverRecord(driverRecordButton.dataset.openDriverRecord, driverRecordButton.hasAttribute('data-focus-footage'));
    return;
  }

  const groupButton = event.target.closest('[data-open-group]');
  if (groupButton) {
    openGroupDrawer(groupButton.dataset.openGroup);
    return;
  }

  const viewButton = event.target.closest('[data-view]');
  if (viewButton) {
    activeSessionId = null;
    setView(viewButton.dataset.view);
    return;
  }

  const viewLink = event.target.closest('[data-view-link]');
  if (viewLink) {
    activeSessionId = null;
    if (viewLink.dataset.analyticsLink && analyticsTabs.includes(viewLink.dataset.analyticsLink)) analyticsTab = viewLink.dataset.analyticsLink;
    if (viewLink.dataset.inboxFilter) {
      activeSessionFilter = normalizeSessionFilter(viewLink.dataset.inboxFilter);
      activeSessionSource = ['automated', 'manual_override'].includes(viewLink.dataset.inboxOrigin) ? viewLink.dataset.inboxOrigin : 'all';
      sessionSearch = '';
      const sessionSearchInput = document.getElementById('session-search');
      if (sessionSearchInput) sessionSearchInput.value = '';
    }
    if (viewLink.dataset.driverFilterLink) activeDriverFilter = viewLink.dataset.driverFilterLink;
    if (viewLink.dataset.driverGroupLink) {
      activeDriverGroup = viewLink.dataset.driverGroupLink;
      activeDriverFilter = 'all';
      activeDriverScoreFilter = 'all';
      activeDriverCategory = 'all';
      const driverSearch = document.getElementById('driver-search');
      if (driverSearch) driverSearch.value = '';
      const categoryFilter = document.getElementById('driver-category-filter');
      if (categoryFilter) categoryFilter.value = 'all';
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

  const categoryButton = event.target.closest('[data-open-category]');
  if (categoryButton) {
    openCategoryDrawer(categoryButton.dataset.openCategory, null);
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
    renderCategory();
    document.getElementById('coaching-work')?.scrollIntoView({ block: 'start' });
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
    overviewDriver.focus({ preventScroll: true });
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
    if (openSessionButton.closest('.profile-shell')) {
      openProfileSession(openSessionButton.dataset.openSession);
      return;
    }
    openSessionDrawer(openSessionButton.dataset.openSession, { type: 'sessions' });
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

  const eventTypeToggle = event.target.closest('[data-event-type-toggle]');
  if (eventTypeToggle) {
    const rule = draftEventTypeRules.find((item) => item.id === eventTypeToggle.dataset.eventTypeToggle);
    if (rule) rule.enabled = !rule.enabled;
    markSettingsDraft();
    document.querySelector('[data-event-type-toggle="' + eventTypeToggle.dataset.eventTypeToggle + '"]')?.focus();
    return;
  }

  const removeEventType = event.target.closest('[data-remove-event-type]');
  if (removeEventType) {
    const rule = draftEventTypeRules.find((item) => item.id === removeEventType.dataset.removeEventType);
    draftEventTypeRules = draftEventTypeRules.filter((item) => item.id !== removeEventType.dataset.removeEventType);
    markSettingsDraft();
    document.querySelector('[data-add-event-type]')?.focus();
    if (rule) showToast(rule.name + ' removed from the draft');
    return;
  }

  if (event.target.closest('[data-add-event-type]')) {
    eventTypeFormOpen = !eventTypeFormOpen;
    renderSettings();
    if (eventTypeFormOpen) document.querySelector('#event-type-form [name="name"]')?.focus();
    else document.querySelector('[data-add-event-type]')?.focus();
    return;
  }

  if (event.target.closest('[data-cancel-event-type]')) {
    eventTypeFormOpen = false;
    renderSettings();
    document.querySelector('[data-add-event-type]')?.focus();
    return;
  }

  if (event.target.closest('[data-add-rule]')) {
    const id = 'rule-' + Date.now().toString(36);
    draftCoachingRules.push({ id, scope: 'all', condition: 'severity_high', count: 3, action: 'manager_review' });
    markSettingsDraft();
    document.querySelector('[data-rule-field="scope"][data-rule-id="' + id + '"]')?.focus();
    return;
  }

  const removeRule = event.target.closest('[data-remove-rule]');
  if (removeRule) {
    draftCoachingRules = draftCoachingRules.filter((item) => item.id !== removeRule.dataset.removeRule);
    markSettingsDraft();
    document.querySelector('[data-add-rule]')?.focus();
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
  if (event.target.id === 'session-origin-filter') {
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
  if ((event.key === '/' && !editing && !event.metaKey && !event.ctrlKey && !event.altKey) || ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k')) {
    event.preventDefault();
    openGlobalSearch();
    return;
  }
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
    tabs[index].focus();
    tabs[index].click();
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
renderAnalytics();
renderSettings();
applyUrlState();
syncRadioGroups();
updateUrlState(true);

document.addEventListener('change', (event) => {
  const field = event.target.closest('[data-event-type-field], [data-rule-field]');
  if (!field) return;
  let selector;
  if (field.dataset.eventTypeField) {
    const rule = draftEventTypeRules.find((item) => item.id === field.dataset.eventTypeId);
    if (!rule) return;
    const key = field.dataset.eventTypeField;
    rule[key] = field.type === 'checkbox' ? field.checked : field.type === 'number' ? Math.min(50, Math.max(1, Number(field.value) || 1)) : field.value;
    selector = '[data-event-type-field="' + key + '"][data-event-type-id="' + field.dataset.eventTypeId + '"]';
  } else {
    const rule = draftCoachingRules.find((item) => item.id === field.dataset.ruleId);
    if (!rule) return;
    const key = field.dataset.ruleField;
    rule[key] = field.type === 'number' ? Math.min(50, Math.max(2, Number(field.value) || 2)) : field.value;
    selector = '[data-rule-field="' + key + '"][data-rule-id="' + field.dataset.ruleId + '"]';
  }
  markSettingsDraft();
  document.querySelector(selector)?.focus();
});

document.addEventListener('submit', (event) => {
  if (event.target.id !== 'event-type-form') return;
  event.preventDefault();
  const data = new FormData(event.target);
  const name = String(data.get('name') || '').trim();
  if (!name) return;
  draftEventTypeRules.push({
    id: 'custom-' + Date.now().toString(36),
    programId: String(data.get('programId')),
    name,
    severity: String(data.get('severity')),
    threshold: Math.min(50, Math.max(1, Number(data.get('threshold')) || 1)),
    videoRequired: data.get('videoRequired') === 'on',
    path: String(data.get('path')),
    enabled: true
  });
  eventTypeFormOpen = false;
  markSettingsDraft();
  document.querySelector('[data-add-event-type]')?.focus();
  showToast(name + ' added to the draft');
});

document.addEventListener('change', (event) => {
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
