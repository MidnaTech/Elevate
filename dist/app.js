const escapeHtml = (value) => String(value).replace(/[&<>"']/g, (character) => ({
  '&': '&amp;',
  '<': '&lt;',
  '>': '&gt;',
  '"': '&quot;',
  "'": '&#039;'
})[character]);

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
  { id: 'ai-jordan-following', categoryId: 'following', caseKind: 'quick', caseIndex: 0, safetyScore: 76, scoreChange: 4, criterion: 'Delivery blocked', attentionReason: 'issues', tone: 'risk', insight: 'The mapped lesson could not reach the driver because the Drive account identity is not linked.' },
  { id: 'ai-skyler-distraction', categoryId: 'distraction', caseKind: 'directed', caseIndex: 2, safetyScore: 64, scoreChange: -5, criterion: 'Driver replied', attentionReason: 'reply', tone: 'risk', insight: 'The driver asked for a manager review of a video-confirmed distraction event after the automated session.' },
  { id: 'ai-priya-speeding', categoryId: 'speeding', caseKind: 'quick', caseIndex: 1, safetyScore: 58, scoreChange: -9, criterion: 'Overdue after reminder', attentionReason: 'overdue', tone: 'risk', insight: 'The mapped lesson was assigned automatically, but it remains incomplete after the reminder window.' },
  { id: 'ai-bailey-fatigue', categoryId: 'fatigue', caseKind: 'directed', caseIndex: 0, safetyScore: 55, scoreChange: -7, criterion: 'Overdue after reminder', attentionReason: 'overdue', tone: 'risk', insight: 'The fatigue session remains incomplete after automatic reminders while the safety score continues to decline.' },
  { id: 'ai-avery-acceleration', categoryId: 'acceleration', caseKind: 'quick', caseIndex: 0, safetyScore: 71, scoreChange: -6, criterion: 'Delivery blocked', attentionReason: 'issues', tone: 'watch', insight: 'The mapped rapid-start lesson could not reach the driver because the Drive account identity is not linked.' },
  { id: 'ai-elliot-traffic', categoryId: 'traffic', caseKind: 'directed', caseIndex: 0, safetyScore: 60, scoreChange: -5, criterion: 'Driver disputed event', attentionReason: 'reply', tone: 'risk', insight: 'The driver disputed a traffic-control event and the automated session is waiting for a manager response.' },
  { id: 'ai-alex-following', categoryId: 'following', caseKind: 'directed', caseIndex: 1, safetyScore: 62, scoreChange: -4, criterion: 'Driver disputed event', attentionReason: 'reply', tone: 'risk', insight: 'The driver disputed a critical-gap clip, so the automated session requires a manager response.' },
  { id: 'ai-noah-braking', categoryId: 'braking', caseKind: 'quick', caseIndex: 1, safetyScore: 89, scoreChange: 2, criterion: 'Delivery blocked', attentionReason: 'issues', tone: 'watch', insight: 'The mapped braking lesson could not reach the driver because the Drive account identity is not linked.' },
  { id: 'ai-emery-distraction', categoryId: 'distraction', caseKind: 'directed', caseIndex: 1, safetyScore: 66, scoreChange: -2, criterion: 'Driver replied', attentionReason: 'reply', tone: 'watch', insight: 'The driver added context to the automated distraction session and is waiting for a manager response.' },
  { id: 'ai-riley-seatbelt', categoryId: 'seatbelt', caseKind: 'quick', caseIndex: 0, safetyScore: 68, scoreChange: 3, criterion: 'Overdue after reminder', attentionReason: 'overdue', tone: 'watch', insight: 'The seat-belt lesson was assigned and reminded automatically, but the acknowledgement is still overdue.' },
  { id: 'ai-taylor-following', categoryId: 'following', caseKind: 'directed', caseIndex: 2, safetyScore: 64, scoreChange: -4, criterion: 'Repeated after coaching', attentionReason: 'repeat', tone: 'risk', insight: 'Following-distance events continued after earlier coaching, so the automated follow-up requires manager attention.' },
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

const attentionAiInsights = aiCoachInsights.filter((insight) => insight.tone !== 'neutral');

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
      { title: 'Phone-use event', meta: 'Lytx · Sep 2 · 10:42 PM', duration: '0:18' },
      { title: 'Navigation interaction', meta: 'Lytx · Sep 3 · 1:16 PM', duration: '0:12' }
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
    category: 'Quick training delivery',
    categoryId: 'following',
    eventType: 'Training delivery failed',
    state: 'issues',
    stateLabel: 'Delivery blocked',
    latest: 'Drive account not linked · 4h ago',
    owner: 'Unassigned',
    due: 'Resolve before next shift',
    summary: 'The training assignment could not be delivered because the driver identity is not linked to a Drive account.',
    evidence: [],
    messages: [],
    history: [['Delivery failed', '4h ago'], ['Assignment created automatically', '4h ago']]
  },
  {
    id: 'avery-acceleration-delivery',
    person: 'Avery Robinson',
    initials: 'AR',
    category: 'Harsh acceleration',
    categoryId: 'acceleration',
    eventType: 'Training delivery failed',
    state: 'issues',
    stateLabel: 'Delivery blocked',
    latest: 'Drive account not linked · 5h ago',
    owner: 'Unassigned',
    due: 'Resolve before next shift',
    summary: 'The rapid-start lesson could not be delivered because the driver identity is not linked to a Drive account.',
    evidence: [],
    messages: [],
    history: [['Delivery failed', '5h ago'], ['Assignment created automatically', '5h ago']]
  },
  {
    id: 'noah-braking-delivery',
    person: 'Noah Reed',
    initials: 'NR',
    category: 'Harsh braking',
    categoryId: 'braking',
    eventType: 'Training delivery failed',
    state: 'issues',
    stateLabel: 'Delivery blocked',
    latest: 'Drive account not linked · 6h ago',
    owner: 'Unassigned',
    due: 'Resolve before next shift',
    summary: 'The braking lesson could not be delivered because the driver identity is not linked to a Drive account.',
    evidence: [],
    messages: [],
    history: [['Delivery failed', '6h ago'], ['Assignment created automatically', '6h ago']]
  }
];

const sessionSla = {
  'rowan-distraction': { sla: '1h 38m left', slaTone: 'due-soon' },
  'alex-following': { sla: '52m left', slaTone: 'due-soon' },
  'jamie-braking': { sla: '21h left', slaTone: 'on-track' },
  'priya-speeding': { sla: '2d overdue', slaTone: 'overdue' },
  'taylor-following': { sla: '2d left', slaTone: 'on-track' },
  'delivery-exception': { sla: 'Blocked', slaTone: 'blocked' },
  'avery-acceleration-delivery': { sla: 'Blocked', slaTone: 'blocked' },
  'noah-braking-delivery': { sla: 'Blocked', slaTone: 'blocked' }
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
    summary: 'Jordan reviewed the representative clip, completed the lesson, acknowledged the coaching, and passed the quiz.',
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
    source: 'Manual override',
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
    source: 'Manual override',
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
    source: 'Manual override',
    automationRun: 'Outside weekly cycle',
    summary: 'The event was reviewed and dismissed because emergency braking prevented a collision. It remains in history for context.',
    evidence: [{ title: 'Emergency braking clip', meta: 'Lytx · Aug 20 · QEW near Oakville', duration: '0:16' }],
    messages: [{ author: 'system', text: 'Event dismissed with coach note', time: 'Aug 20 · 4:18 PM' }],
    history: [['Archived', 'Aug 21'], ['Event dismissed', 'Aug 20 · 4:18 PM'], ['Review started', 'Aug 20 · 3:52 PM']]
  }
);
sessions = sessions.map((session) => ({ automationRun: 'Week of Aug 31', source: 'Automated', ...session }));

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
  stateLabel: [4, 9, 10, 12].includes(index) ? 'Needs attention' : index % 3 === 0 ? 'Coached' : index % 4 === 1 ? 'Outcome monitoring' : 'On track',
  lastCoaching: index % 3 === 0 ? 'This week' : index % 4 === 1 ? '2 weeks ago' : '—'
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
let activeCategory = null;
let workflowTab = 'needs';
let trainingExpanded = false;
let trainingSearch = '';
let activeSessionFilter = 'attention';
let activeSessionSource = 'all';
let sessionSearch = '';
let activeSessionId = null;
let activeDriverFilter = 'all';
let activeDriverScoreFilter = 'all';
let activeDriverGroup = 'all';
let activeDriverCategory = 'all';
let driverSort = 'action';
let phoneTab = 'training';
let analyticsTab = 'activity';
let outcomeTab = 'category';
let composerMode = 'reply';
let drawerOpener = null;
let categoryDrawerOpener = null;
let toastTimer;
let activeAiInsightId = null;
let showAllAiInsights = false;
const dismissedAiInsightIds = new Set();
const resolvedAttentionIds = new Set();
let sessionDraft = null;
let sessionDrawerOrigin = null;
function readSavedSetting(key, fallback) {
  try {
    return window.localStorage?.getItem(key) || fallback;
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

function showSettingSaveResult(saved) {
  const state = document.getElementById('settings-save-state');
  if (state) state.textContent = saved ? 'All changes saved' : 'Changes apply for this visit';
}
const savedAutomationMode = readSavedSetting('elevate-automation-mode', 'fully');
const savedCadenceWeeks = Number(readSavedSetting('elevate-cadence-weeks', '1'));
let automationMode = ['manual', 'semi', 'fully'].includes(savedAutomationMode) ? savedAutomationMode : 'fully';
let cadenceWeeks = [1, 2].includes(savedCadenceWeeks) ? savedCadenceWeeks : 1;
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
const driverAppDialog = document.getElementById('driver-app-dialog');
const phoneContent = document.getElementById('phone-content');
categoryDrawer.inert = true;
driverDrawer.inert = true;

function getCoachingScope(category) {
  return category;
}

function outcomeFor(category) {
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
  return outcomes[category.id] || outcomes.following;
}

function categoryRow(category) {
  const selected = activeCategory?.id === category.id && categoryDrawer.classList.contains('is-open');
  const movementClass = category.eventChange < 0 ? 'improving' : category.eventChange > 0 ? 'worsening' : '';
  const movement = (category.eventChange > 0 ? '+' : '') + category.eventChange + '%';
  return [
    '<button class="queue-row' + (selected ? ' is-selected' : '') + '" type="button" data-open-category="' + category.id + '">',
      '<span class="behavior-cell">',
        '<span class="behavior-title-line"><h3>' + category.name + '</h3>' + (category.priority === 'critical' ? '<i class="priority-label">High</i>' : '') + '</span>',
      '</span>',
      '<span class="queue-number"><strong>' + category.coached + '</strong></span>',
      '<span class="queue-number"><strong>' + category.completed + '</strong></span>',
      '<span class="queue-attention' + (category.attention ? ' has-attention' : '') + '"><strong>' + category.attention + '</strong><span>' + (category.attention ? 'review' : 'clear') + '</span></span>',
      '<span class="risk-change ' + movementClass + '"><strong>' + movement + '</strong><span>' + (category.eventChange < 0 ? 'decreasing' : category.eventChange > 0 ? 'increasing' : 'steady') + '</span></span>',
      '<span class="row-arrow" aria-hidden="true">›</span>',
    '</button>'
  ].join('');
}

function renderQueue() {
  const visibleCategories = (queueStatus === 'all' ? categories : categories.filter((item) => item.attention > 0))
    .slice()
    .sort((a, b) => b.attention - a.attention || b.coached - a.coached);
  const totalAttention = categories.reduce((sum, category) => sum + category.attention, 0);
  const activePrograms = categories.filter((category) => category.coached > 0).length;
  const attentionPrograms = categories.filter((category) => category.attention > 0).length;
  document.getElementById('queue-columns').innerHTML = '<span>Category</span><span>Coached</span><span>Completed</span><span>Attention</span><span>8-week event change</span><span></span>';
  document.getElementById('queue-summary').textContent = queueStatus === 'all' ? '142 coached across ' + activePrograms + ' programs' : totalAttention + ' attention items across ' + attentionPrograms + ' programs';
  const sidebarCount = document.getElementById('sidebar-queue-count');
  if (sidebarCount) sidebarCount.textContent = totalAttention;
  queueNode.innerHTML = visibleCategories.length
    ? visibleCategories.map(categoryRow).join('')
    : '<div class="empty-state queue-empty"><strong>No unresolved attention</strong><span>All attention items are closed or back in the automated flow. Switch to All programs to review activity and outcomes.</span></div>';
}

function aiInsightRationale(insight) {
  const eventWord = insight.events === 1 ? 'event' : 'events';
  const tripWord = insight.trips === 1 ? 'trip' : 'trips';
  const clipCopy = insight.clips ? ' A representative clip is available.' : '';
  const scoreCopy = insight.scoreChange === 0
    ? 'unchanged from the prior period'
    : (insight.scoreChange > 0 ? 'up ' : 'down ') + Math.abs(insight.scoreChange) + ' points from the prior period';
  return insight.name + ' recorded ' + insight.events + ' ' + insight.categoryName.toLowerCase() + ' ' + eventWord + ' across ' + insight.trips + ' ' + tripWord + '.' + clipCopy + ' ' + insight.insight + ' Safety score is ' + insight.safetyScore + ', ' + scoreCopy + '.';
}

function updateAiCommandPreview() {
  const available = attentionAiInsights.filter((insight) => !dismissedAiInsightIds.has(insight.id));
  const unresolved = attentionAiInsights.filter((insight) => !resolvedAttentionIds.has(insight.id));
  const first = available[0];
  const name = document.getElementById('ai-priority-name');
  const score = document.getElementById('ai-priority-score');
  const meta = document.getElementById('ai-priority-meta');
  if (name) name.textContent = first ? first.name : unresolved.length ? 'All insights reviewed' : 'Automation clear';
  if (score) score.textContent = first ? 'Score ' + first.safetyScore : '';
  if (meta) meta.textContent = first
    ? first.categoryName + ' · ' + first.criterion.toLowerCase()
    : unresolved.length
      ? 'Attention remains visible in programs and sessions'
      : 'No attention items remain in this coaching cycle';
}

function updateAiToggleLabel(expanded) {
  const remaining = attentionAiInsights.filter((insight) => !dismissedAiInsightIds.has(insight.id)).length;
  const unresolved = attentionAiInsights.filter((insight) => !resolvedAttentionIds.has(insight.id)).length;
  const label = document.querySelector('[data-ai-toggle-label]');
  const text = expanded ? 'Hide AI insights' : remaining ? 'View ' + remaining + ' unreviewed insights' : unresolved ? 'All insights reviewed' : 'No attention items';
  if (label) label.innerHTML = text + ' <b aria-hidden="true">' + (expanded ? '⌃' : '›') + '</b>';
}

function renderCoachNextTray() {
  const node = document.getElementById('coach-next-list');
  if (!node) return;
  const available = attentionAiInsights.filter((insight) => !dismissedAiInsightIds.has(insight.id));
  if (activeAiInsightId && !available.some((insight) => insight.id === activeAiInsightId)) activeAiInsightId = null;
  const visible = showAllAiInsights ? available : available.slice(0, 5);
  const items = visible.map((insight) => {
    const rank = available.indexOf(insight) + 1;
    const expanded = activeAiInsightId === insight.id;
    const route = insight.caseKind === 'directed' ? 'Automated one-to-one' : 'Automated lesson';
    return [
      '<article class="ai-insight-item' + (expanded ? ' is-open' : '') + '">',
        '<div class="ai-insight-row">',
          '<span class="coach-next-rank">' + rank + '</span>',
          '<span class="person-avatar" aria-hidden="true">' + escapeHtml(insight.initials) + '</span>',
          '<span class="ai-insight-main"><strong>' + escapeHtml(insight.name) + '</strong><span class="ai-insight-tags"><i class="ai-category-chip">' + escapeHtml(insight.categoryName) + '</i><i class="ai-criterion-chip ' + insight.tone + '">' + escapeHtml(insight.criterion) + '</i></span></span>',
          '<button class="ai-why-button" type="button" data-ai-insight-why="' + insight.id + '" aria-expanded="' + expanded + '"><span aria-hidden="true">' + (expanded ? '⌃' : '↳') + '</span> Why</button>',
          '<button class="primary-button ai-coach-button" type="button" data-ai-insight-coach="' + insight.id + '">Review</button>',
        '</div>',
        expanded ? [
          '<div class="ai-insight-detail">',
            '<div class="ai-insight-detail-top"><span class="ai-label">Why this needs attention</span><small>Current weekly cycle</small></div>',
            '<p>' + escapeHtml(aiInsightRationale(insight)) + '</p>',
            '<div class="ai-insight-detail-foot"><span>Automation route: <strong>' + route + '</strong></span><button class="secondary-button" type="button" data-ai-insight-dismiss="' + insight.id + '">Mark reviewed</button></div>',
          '</div>'
        ].join('') : '',
      '</article>'
    ].join('');
  }).join('');
  const footer = available.length > 5
    ? '<div class="coach-next-footer"><button type="button" data-ai-insights-more>' + (showAllAiInsights ? 'Show top 5' : 'Show all ' + available.length) + ' <span aria-hidden="true">' + (showAllAiInsights ? '⌃' : '⌄') + '</span></button></div>'
    : '';
  const unresolved = attentionAiInsights.some((insight) => !resolvedAttentionIds.has(insight.id));
  const empty = unresolved
    ? '<div class="ai-insight-empty"><strong>No unreviewed AI insights</strong><span>Unresolved items remain in Programs and Sessions until handled.</span></div>'
    : '<div class="ai-insight-empty"><strong>All attention resolved</strong><span>No automation outliers remain in this coaching cycle.</span></div>';
  node.innerHTML = (items || empty) + footer;
  updateAiCommandPreview();
  const detail = document.getElementById('coach-next-detail');
  updateAiToggleLabel(Boolean(detail && !detail.hidden));
}

function openAiCoach(insightId) {
  const insight = attentionAiInsights.find((item) => item.id === insightId);
  if (!insight) return;
  const category = categories.find((item) => item.id === insight.categoryId);
  const target = category && category[insight.caseKind + 'Cases'].find((item) => item.id === insight.caseId);
  setCoachNextExpanded(false);
  openCategoryDrawer(insight.categoryId);
  openDriverDrawer(insight.caseId, insight.caseKind);
}

function markAttentionReviewed(insightId) {
  const insight = attentionAiInsights.find((item) => item.id === insightId);
  if (!insight || dismissedAiInsightIds.has(insightId)) return;
  dismissedAiInsightIds.add(insightId);
  activeAiInsightId = null;
  renderCoachNextTray();
  showToast('AI insight marked reviewed');
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
  activeAiInsightId = null;
  const category = categories.find((item) => item.id === insight.categoryId);
  if (category) category.attention = Math.max(0, category.attention - 1);
  updateGroupAttention(insight, false);
  syncFleetSessionCounts();
  syncDirectoryAttentionState(session.person);
  renderCoachNextTray();
  renderQueue();
  if (activeCategory && category && activeCategory.id === category.id) renderCategory();
}

function relinkDeliverySession(session) {
  if (!session || session.state !== 'issues' || session.deliveryRelinked) return false;
  const previousState = session.state;
  session.deliveryRelinked = true;
  session.state = 'waiting';
  session.stateLabel = 'Retry queued';
  session.latest = 'Identity linked · delivery retry queued';
  session.due = 'Retrying now';
  session.sla = 'Automatic retry queued';
  session.slaTone = 'on-track';
  session.summary = 'The driver identity is linked. The mapped lesson is queued for automatic delivery retry.';
  session.history.unshift(['Identity linked; delivery retry queued', 'Just now']);
  adjustSessionFleetTotals(previousState, session.state, session.source);
  clearAttentionForSession(session);
  return true;
}

function resolveAttentionInsight(insightId) {
  const insight = attentionAiInsights.find((item) => item.id === insightId);
  if (!insight || resolvedAttentionIds.has(insightId)) return;
  if (insight.attentionReason === 'issues') {
    const deliverySession = sessions.find((session) => session.person === insight.name && session.categoryId === insight.categoryId && session.state === 'issues');
    if (deliverySession && relinkDeliverySession(deliverySession)) {
      renderInbox();
      showToast('Identity linked; automatic delivery retry queued');
      return;
    }
  }
  resolvedAttentionIds.add(insightId);
  dismissedAiInsightIds.add(insightId);
  activeAiInsightId = null;
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
    matchingSession.state = previousState === 'issues' ? 'archived' : 'completed';
    matchingSession.stateLabel = previousState === 'issues' ? 'Archived' : 'Completed';
    matchingSession.latest = 'Attention resolved · just now';
    matchingSession.due = previousState === 'issues' ? 'Archived just now' : 'Completed just now';
    matchingSession.sla = previousState === 'overdue' ? 'Missed' : 'Met';
    matchingSession.slaTone = previousState === 'overdue' ? 'overdue' : 'met';
    matchingSession.history.unshift(['Attention resolved', 'Just now']);
    adjustSessionFleetTotals(previousState, matchingSession.state, matchingSession.source);
  } else {
    adjustSessionFleetTotals(insight.attentionReason || 'issues', 'completed', 'Automated');
  }
  syncDirectoryAttentionState(insight.name);
  renderCoachNextTray();
  renderQueue();
  if (activeCategory && category && activeCategory.id === category.id) renderCategory();
  showToast('Attention item resolved');
}

function setView(view) {
  if (categoryDrawer.classList.contains('is-open')) closeCategoryDrawer();
  if (driverDrawer.classList.contains('is-open')) closeDrawer();
  document.querySelectorAll('.app-view').forEach((node) => node.classList.toggle('is-active', node.id === 'view-' + view));
  document.querySelectorAll('.nav-item').forEach((node) => {
    node.classList.toggle('is-active', node.dataset.view === view);
  });
  if (view === 'inbox') renderInbox();
  if (view === 'drivers') {
    document.querySelectorAll('[data-driver-filter]').forEach((node) => node.classList.toggle('is-active', node.dataset.driverFilter === activeDriverFilter));
    renderDirectory();
  }
  if (view === 'outcomes') renderAnalytics();
  if (view === 'library') renderLibrary();
  if (view === 'settings') renderSettings();
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

function openCategoryDrawer(categoryId) {
  categoryDrawerOpener = document.activeElement;
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

function closeCategoryDrawer() {
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
    categoryDrawerOpener?.focus?.();
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

function syncGroupDisplay() {
  Object.entries(groupDisplayIds).forEach(([groupName, id]) => {
    const group = groupComparisonData[groupName];
    const completedNode = document.getElementById('group-' + id + '-completed');
    const attentionNode = document.getElementById('group-' + id + '-attention');
    if (completedNode) completedNode.textContent = group.completed;
    if (attentionNode) {
      attentionNode.textContent = group.attention;
      attentionNode.classList.toggle('risk', group.attention >= 4);
    }
  });
  const priority = Object.entries(groupComparisonData).sort((a, b) => b[1].attention - a[1].attention)[0];
  const priorityName = document.getElementById('groups-priority-name');
  const priorityCount = document.getElementById('groups-priority-count');
  if (priorityName) priorityName.textContent = priority[1].attention ? priority[0] : 'No groups need attention';
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
  activeCategory = null;
  sessionDraft = null;
  categoryDrawer.classList.remove('is-composer');
  const chartCategory = { id: 'group-' + groupName.toLowerCase().replace(/[^a-z0-9]+/g, '-'), name: groupName, weeklyRates: group.weeklyRates };
  categoryContent.innerHTML = [
    '<header class="category-panel-header"><div><p class="eyebrow">Group comparison</p><div class="panel-title-line"><h1 id="category-title">' + escapeHtml(groupName) + '</h1></div></div><button class="icon-button" type="button" data-close-category aria-label="Close group">×</button></header>',
    '<div class="category-panel-scroll group-detail-drawer">',
      '<div class="category-facts"><strong>' + group.score + '<span>safety score</span></strong><strong>' + group.coached + '<span>coached</span></strong><strong>' + group.completed + '<span>completed</span></strong><strong>' + group.attention + '<span>need attention</span></strong></div>',
      '<section class="group-detail-summary"><div><span>Weekly result</span><h2>' + (group.change > 0 ? 'Coached events increased ' + group.change + '%' : 'Coached events decreased ' + Math.abs(group.change) + '%') + '</h2><p>' + (group.change > 0 ? 'This group is the first priority for program review.' : 'The group is moving in the intended direction.') + '</p></div><button class="secondary-button" type="button" data-view-link="drivers" data-driver-group-link="' + escapeHtml(groupName) + '">View ' + group.drivers + ' drivers</button></section>',
      '<section class="signal-panel"><div class="signal-heading"><div><h2>Weekly coached events</h2><span>Events per 1,000 trips · eight coaching cycles</span></div><div class="signal-value ' + (group.change > 0 ? 'is-negative' : '') + '"><strong>' + (group.change > 0 ? '+' : '') + group.change + '%</strong><span>since Jul 13</span></div></div><div class="category-progress-chart">' + categoryWeeklyChartSvg(chartCategory) + '</div><div class="chart-axis"><span>Jul 13</span><span>Aug 10</span><span>Aug 31</span></div></section>',
      '<section class="group-programs"><header><div><h2>Programs in this group</h2><span>Attention first</span></div></header><div class="group-program-head"><span>Category</span><span>Coached</span><span>Completed</span><span>Attention</span><span>Event change</span></div>' + group.programs.slice().sort((a, b) => b[3] - a[3]).map((program) => '<div class="group-program-row"><strong>' + escapeHtml(program[0]) + '</strong><span>' + program[1] + '</span><span>' + program[2] + '</span><em class="' + (program[3] ? 'risk' : '') + '">' + program[3] + '</em><i class="' + (program[4] > 0 ? 'negative' : 'positive') + '">' + (program[4] > 0 ? '+' : '−') + Math.abs(program[4]) + '%</i></div>').join('') + '</section>',
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

function renderOutcomeProgressChart() {
  const node = document.getElementById('outcome-progress-chart');
  if (!node) return;
  node.innerHTML = programProgressChartSvg();
}

const weeklyCoachingActivity = [
  { label: 'Jul 13', identified: 118, coached: 113, completed: 101, score: 71 },
  { label: 'Jul 20', identified: 121, coached: 116, completed: 104, score: 70 },
  { label: 'Jul 27', identified: 124, coached: 119, completed: 106, score: 69 },
  { label: 'Aug 3', identified: 133, coached: 128, completed: 114, score: 70 },
  { label: 'Aug 10', identified: 139, coached: 134, completed: 121, score: 71 },
  { label: 'Aug 17', identified: 136, coached: 131, completed: 118, score: 71 },
  { label: 'Aug 24', identified: 151, coached: 147, completed: 132, score: 73 },
  { label: 'Aug 31', identified: 148, coached: 142, completed: 128, score: 74 }
];

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

function coachingActivityChartSvg() {
  const width = 760;
  const height = 230;
  const left = 42;
  const right = 48;
  const top = 20;
  const bottom = 34;
  const max = 160;
  const plotWidth = width - left - right;
  const plotHeight = height - top - bottom;
  const groupWidth = plotWidth / weeklyCoachingActivity.length;
  const barWidth = 12;
  const scorePoints = pointsPath(weeklyCoachingActivity.map((week) => week.score), width, height, left + groupWidth / 2, right + groupWidth / 2, top, bottom, 65, 80);
  return [
    '<svg class="activity-line-chart weekly-activity-chart" viewBox="0 0 ' + width + ' ' + height + '" role="img" aria-labelledby="weekly-activity-title weekly-activity-desc">',
      '<title id="weekly-activity-title">Weekly coaching activity and fleet safety score</title>',
      '<desc id="weekly-activity-desc">Eight weekly snapshots show driver-program assignments identified, automatically coached, completed, and fleet safety score.</desc>',
      '<g class="activity-grid">' + [160, 80, 0].map((tick, index) => {
        const y = top + index * plotHeight / 2;
        return '<line x1="' + left + '" y1="' + y + '" x2="' + (width - right) + '" y2="' + y + '"/><text x="4" y="' + (y + 4) + '">' + tick + '</text>';
      }).join('') + '</g>',
      '<g class="weekly-bars">' + weeklyCoachingActivity.map((week, index) => {
        const center = left + groupWidth * index + groupWidth / 2;
        const bars = [
          { value: week.identified, tone: 'identified', x: center - 18 },
          { value: week.coached, tone: 'coached', x: center - 4 },
          { value: week.completed, tone: 'completed', x: center + 10 }
        ];
        return bars.map((bar) => {
          const barHeight = bar.value / max * plotHeight;
          return '<rect class="activity-bar ' + bar.tone + '" x="' + bar.x.toFixed(1) + '" y="' + (top + plotHeight - barHeight).toFixed(1) + '" width="' + barWidth + '" height="' + barHeight.toFixed(1) + '" rx="3"><title>' + week.label + ': ' + bar.value + ' ' + bar.tone + '</title></rect>';
        }).join('') + '<text class="activity-week-label" x="' + center.toFixed(1) + '" y="' + (height - 8) + '" text-anchor="middle">' + week.label + '</text>';
      }).join('') + '</g>',
      '<path class="activity-score-path" d="' + linePath(scorePoints) + '"/>',
      '<g class="activity-score-points">' + scorePoints.map((point, index) => '<circle cx="' + point.x.toFixed(1) + '" cy="' + point.y.toFixed(1) + '" r="4"><title>' + weeklyCoachingActivity[index].label + ': fleet score ' + point.value + '</title></circle>').join('') + '</g>',
      '<g class="activity-score-axis">' + [80, 75, 70, 65].map((tick) => {
        const y = top + (80 - tick) / 15 * plotHeight;
        return '<text x="' + (width - 4) + '" y="' + (y + 4).toFixed(1) + '" text-anchor="end">' + tick + '</text>';
      }).join('') + '</g>',
      '<text class="activity-score-label" x="' + (width - 40) + '" y="' + (scorePoints[scorePoints.length - 1].y - 8).toFixed(1) + '" text-anchor="end">Score 74</text>',
    '</svg>'
  ].join('');
}

function programProgressChartSvg() {
  const width = 720;
  const height = 220;
  const left = 42;
  const right = 22;
  const top = 20;
  const bottom = 26;
  const series = [
    { id: 'following', label: 'Following distance', values: weeklyCycleStats.following.weeklyRates },
    { id: 'speeding', label: 'Speeding', values: weeklyCycleStats.speeding.weeklyRates },
    { id: 'braking', label: 'Harsh braking', values: weeklyCycleStats.braking.weeklyRates }
  ];
  const max = 6;
  return [
    '<svg class="program-progress-chart" viewBox="0 0 ' + width + ' ' + height + '" role="img" aria-labelledby="program-progress-title program-progress-desc">',
      '<title id="program-progress-title">Weekly coached event rates by program</title>',
      '<desc id="program-progress-desc">Following distance, speeding, and harsh braking event rates trend down across eight weekly coaching cycles.</desc>',
      '<g class="trend-grid">' + [6, 3, 0].map((tick, index) => {
        const y = top + index * (height - top - bottom) / 2;
        return '<line x1="' + left + '" y1="' + y + '" x2="' + (width - right) + '" y2="' + y + '"/><text x="4" y="' + (y + 4) + '">' + tick + '</text>';
      }).join('') + '</g>',
      series.map((item) => {
        const points = pointsPath(item.values, width, height, left, right, top, bottom, 0, max);
        return '<path class="program-line ' + item.id + '" d="' + linePath(points) + '"/><g class="program-points ' + item.id + '">' + points.map((point, index) => '<circle cx="' + point.x.toFixed(1) + '" cy="' + point.y.toFixed(1) + '" r="3"><title>Week ' + (index + 1) + ': ' + item.label + ' ' + point.value + ' events per 1,000 trips</title></circle>').join('') + '</g>';
      }).join(''),
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
  const node = document.getElementById('coaching-activity-chart');
  if (node) node.innerHTML = coachingActivityChartSvg();
}

function renderAnalytics() {
  document.querySelectorAll('[data-analytics-tab]').forEach((button) => {
    const active = button.dataset.analyticsTab === analyticsTab;
    button.classList.toggle('is-active', active);
    button.setAttribute('aria-pressed', String(active));
  });
  const activity = document.getElementById('analytics-activity');
  const outcomes = document.getElementById('analytics-outcomes');
  if (activity) activity.hidden = analyticsTab !== 'activity';
  if (outcomes) outcomes.hidden = analyticsTab !== 'outcomes';
  if (analyticsTab === 'activity') renderCoachingActivityChart();
  else {
    renderOutcomeProgressChart();
    renderOutcomeTable();
  }
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
      '<header><div><h3>Needs attention <b>' + scope.attention + '</b></h3><p>Only drivers automation could not resolve.</p></div></header>',
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
  const currentCompletion = Math.round(category.completed / Math.max(1, category.coached) * 100);
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

function workflowBody(category) {
  if (workflowTab === 'needs') return directedBlock(category) + quickTrainingBlock(category);
  if (workflowTab === 'active') return progressBlock(category, 'active');
  if (workflowTab === 'completed') return progressBlock(category, 'completed');
  return outcomesBlock(category);
}

function categoryCoachRecommendation(category) {
  const lesson = category.training.split(' · ')[0];
  const movement = category.eventChange > 0
    ? 'Events up ' + category.eventChange + '%'
    : category.eventChange < 0
      ? 'Events down ' + Math.abs(category.eventChange) + '%'
      : 'Events steady';
  const recommendation = category.coached
    ? 'Automation coached ' + category.coached + ' drivers: ' + category.lessonAssigned + ' received ' + lesson + ' and ' + category.oneToOne + ' entered one-to-one sessions.'
    : 'No coaching was triggered for this program in the current cycle.';
  const signals = [
    movement,
    category.repeats ? category.repeats + ' repeated after coaching' : null,
    category.clips ? category.clips + ' clips available' : null
  ].filter(Boolean).join(' · ');
  return [
    '<section class="category-coach-recommendation">',
      '<div class="category-recommendation-copy">',
        '<div class="category-recommendation-label"><span>Weekly automation result</span><i>AI</i></div>',
        '<h2>' + recommendation + '</h2>',
        '<p>' + signals + '</p>',
      '</div>',
      (category.attention ? '<button class="secondary-button" type="button" data-workflow-tab="needs">Review ' + category.attention + ' outliers</button>' : '<span class="automation-complete-status"><i>✓</i> No attention needed</span>'),
    '</section>'
  ].join('');
}

function renderCategory() {
  const category = activeCategory;
  if (!category) return;
  const outcome = outcomeFor(category);
  const completionRate = Math.round(category.completed / Math.max(1, category.coached) * 100);
  categoryContent.innerHTML = [
    '<header class="category-panel-header">',
      '<div><div class="panel-title-line"><h1 id="category-title">' + category.name + '</h1>' + (category.priority === 'critical' ? '<span class="priority-label">High</span>' : '') + '</div></div>',
      '<div class="category-header-actions"><button class="icon-button" type="button" data-close-category aria-label="Close category">×</button></div>',
    '</header>',
    '<div class="category-panel-scroll">',
      '<div class="category-facts"><strong>' + category.coached + '<span>coached</span></strong><strong>' + category.completed + '<span>completed</span></strong><strong>' + category.attention + '<span>need attention</span></strong><strong>' + category.active + '<span>active</span></strong></div>',
      categoryCoachRecommendation(category),
      '<section class="signal-panel">',
        '<div class="signal-heading"><div><h2>Weekly coached events</h2><span>Events per 1,000 trips · eight coaching cycles</span></div><div class="signal-value ' + (category.eventChange > 0 ? 'is-negative' : '') + '"><strong>' + (category.eventChange > 0 ? '+' : '') + category.eventChange + '%</strong><span>since Jul 13</span></div></div>',
        '<div class="category-progress-chart">' + categoryWeeklyChartSvg(category) + '</div>',
        '<div class="chart-axis"><span>Jul 13</span><span>Aug 10</span><span>Aug 31</span></div>',
      '</section>',
      '<button class="outcome-snapshot" type="button" data-workflow-tab="outcomes"><span>Measured outcome</span><strong>' + completionRate + '% completed</strong><b class="' + (category.eventChange < 0 ? 'positive' : 'negative') + '">' + (category.eventChange > 0 ? '+' : '') + category.eventChange + '% events</b><em>' + outcome.label + '</em><i>View detail ›</i></button>',
      '<section class="workflow-card" id="coaching-work">',
        '<div class="workflow-tabs" role="group" aria-label="Coaching stage">',
          '<button class="' + (workflowTab === 'needs' ? 'is-active' : '') + '" type="button" data-workflow-tab="needs" aria-pressed="' + (workflowTab === 'needs') + '">Needs attention ' + category.attention + '</button>',
          '<button class="' + (workflowTab === 'active' ? 'is-active' : '') + '" type="button" data-workflow-tab="active" aria-pressed="' + (workflowTab === 'active') + '">Active ' + category.active + '</button>',
          '<button class="' + (workflowTab === 'completed' ? 'is-active' : '') + '" type="button" data-workflow-tab="completed" aria-pressed="' + (workflowTab === 'completed') + '">Completed ' + category.completed + '</button>',
          '<button class="' + (workflowTab === 'outcomes' ? 'is-active' : '') + '" type="button" data-workflow-tab="outcomes" aria-pressed="' + (workflowTab === 'outcomes') + '">Outcomes</button>',
        '</div>',
        '<div class="workflow-body">' + workflowBody(category) + '</div>',
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
  const stateLabel = progressStage === 'active' ? 'Active' : progressStage === 'completed' ? 'Completed' : progressStage === 'outcomes' ? 'Outcome monitoring' : needsAttention ? 'Needs attention' : 'Coached';
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
        ? 'Outcome monitoring'
        : needsAttention
          ? 'Manager attention'
          : 'Automated lesson';
  const attentionGuidance = !attentionInsight
    ? ''
    : attentionInsight.attentionReason === 'issues'
      ? 'Open the blocked session and reconnect the driver identity. Delivery will retry automatically.'
      : attentionInsight.attentionReason === 'overdue'
        ? 'Automatic reminders did not produce a response. Contact the driver or start a manual follow-up.'
        : attentionInsight.attentionReason === 'reply'
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
          ? (matchingSession ? '<button class="primary-button" type="button" data-open-attention-session="' + matchingSession.id + '">Open session</button>' : '<button class="primary-button" type="button" data-resolve-attention="' + attentionInsight.id + '">Resolve attention</button>') + '<button class="secondary-button" type="button" data-start-session="' + item.id + '">Manual follow-up</button>'
          : '<button class="primary-button" type="button" data-toast="Assignment activity opened">View activity</button>';
  categoryContent.innerHTML = [
    '<header class="category-panel-header nested-detail-header"><div><button class="scope-link" type="button" data-back-category>← ' + category.name + '</button><div class="panel-title-line"><h1 id="category-title">' + item.name + '</h1></div></div><button class="icon-button" type="button" data-close-category aria-label="Close category">×</button></header>',
    '<div class="category-panel-scroll driver-case-detail">',
      '<div class="case-status-line"><span>' + stateLabel + '</span><strong>' + item.group + '</strong></div>',
      '<section class="case-section coach-brief"><div class="coach-brief-heading"><h2>Automation summary</h2><span>AI</span></div><p>' + briefReason + '</p><div class="coach-brief-route"><span>Current route</span><strong>' + automationRoute + '</strong></div></section>',
      '<section class="case-section"><h2>Category evidence</h2><p><strong>' + eventName + '</strong> · ' + item.reason + '</p><div class="case-facts"><div><strong>' + item.events + '</strong><span>Events</span></div><div><strong>' + item.trips + '</strong><span>Trips</span></div><div><strong>' + item.clips + '</strong><span>Clips</span></div></div></section>',
      '<section class="case-section"><h2>Evidence</h2><button class="evidence-card" type="button" data-toast="Evidence preview opened"><span class="evidence-thumb">' + (item.clips ? '▶ 0:18' : 'Pattern') + '</span><div><strong>' + eventName + '</strong><small>' + (item.clips ? item.clips + ' event clip · current 14-day window' : item.events + ' events across ' + item.trips + ' trips') + '</small></div><span>Open</span></button></section>',
      '<section class="case-section two-column"><div><h2>Previous coaching</h2><p>' + item.prior + '</p></div><div><h2>Manager guidance</h2><p>' + nextStep + '</p></div></section>',
      '<div class="drawer-actions">' + actions + '</div>',
    '</div>'
  ].join('');
  categoryDrawer.scrollTop = 0;
}

function closeDrawer() {
  const closingSession = driverDrawer.classList.contains('is-session');
  driverDrawer.classList.remove('is-open', 'is-profile', 'is-session');
  driverDrawer.setAttribute('aria-hidden', 'true');
  driverDrawer.inert = true;
  document.getElementById('app-shell').inert = false;
  document.body.style.overflow = '';
  if (closingSession) {
    activeSessionId = null;
    sessionDrawerOrigin = null;
  }
  setTimeout(() => {
    drawerBackdrop.hidden = true;
    if (drawerOpener && document.contains(drawerOpener)) drawerOpener.focus();
    else document.getElementById('inbox-title')?.focus();
  }, 220);
}

function openManualSessionDialog() {
  trainingDialogContent.innerHTML = [
    '<div class="assignment-dialog-body">',
      '<div class="manual-override-note"><strong>Manual override</strong><span>Use this only when a manager needs to intervene outside the weekly automation cycle.</span></div>',
      '<label class="dialog-field">Driver<select id="manual-driver-select">' + directory.map((driver) => '<option>' + escapeHtml(driver.name) + '</option>').join('') + '</select></label>',
      '<label class="dialog-field">Category<select id="manual-category-select">' + categories.filter((category) => category.coached).map((category) => '<option value="' + category.id + '">' + escapeHtml(category.name) + '</option>').join('') + '</select></label>',
      '<label class="dialog-field">Reason<textarea id="manual-session-reason">Manager follow-up required outside the normal automated cycle.</textarea></label>',
    '</div>',
    '<footer class="dialog-footer"><button class="secondary-button" value="cancel">Cancel</button><button class="primary-button" type="button" data-confirm-manual-session>Create manual session</button></footer>'
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
    state: 'waiting',
    stateLabel: 'Active',
    latest: 'Manual session created · just now',
    owner: 'Alex Kim',
    due: 'Within 7 days',
    sla: '7d left',
    slaTone: 'on-track',
    source: 'Manual override',
    automationRun: 'Outside weekly cycle',
    summary: reason || 'Manager follow-up created outside the normal automated cycle.',
    evidence: [],
    messages: [{ author: 'manager', text: reason || 'Please review this follow-up and reply with context.', time: 'Just now' }],
    history: [['Manual session created', 'Just now']]
  });
  adjustSessionFleetTotals(null, 'waiting', 'Manual override');
  trainingDialog.close();
  activeSessionFilter = 'open';
  activeSessionSource = 'manual';
  renderInbox();
  setView('inbox');
  showToast('Manual session created for ' + person);
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
      '<div><button class="scope-link" type="button" data-back-driver-case>← ' + escapeHtml(item.name) + '</button><div class="panel-title-line"><h1 id="category-title">Manual follow-up</h1><span class="draft-state">Override</span></div></div>',
      '<button class="icon-button" type="button" data-close-category aria-label="Close coaching composer">×</button>',
    '</header>',
    '<div class="session-composer-layout">',
      '<main class="session-composer-scroll">',
        '<section class="draft-driver-context">',
          '<span class="person-avatar">' + item.initials + '</span>',
          '<div><strong>' + escapeHtml(item.name) + '</strong><small>' + escapeHtml(item.group) + '</small></div>',
          '<span><small>Safety score</small><strong>' + safetyScore + '</strong></span>',
          '<span><small>Category</small><strong>' + escapeHtml(activeCategory.name) + '</strong></span>',
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
    '<footer class="session-draft-footer"><span><strong>' + selected.length + '</strong> ' + (selected.length === 1 ? 'event' : 'events') + ' attached' + (sessionDraft.includeLesson ? ' · lesson included' : '') + '</span><div><button class="secondary-button" type="button" data-back-driver-case>Cancel</button><button class="primary-button" type="button" data-send-session-draft>Create manual session</button></div></footer>'
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
    state: 'waiting',
    stateLabel: 'Active',
    latest: 'Manual session created · just now',
    owner: 'Alex Kim',
    due: 'Within 3 days',
    sla: '3h 45m left',
    slaTone: 'on-track',
    source: 'Manual override',
    automationRun: 'Outside weekly cycle',
    summary: item.reason + '. Goal: ' + sessionDraft.goal + '.',
    evidence: attachedEvidence,
    messages: [{ author: 'manager', text: sessionDraft.message, time: 'Just now' }],
    history: [['Manual session created', 'Just now'], [attachedEvidence.length + ' evidence ' + (attachedEvidence.length === 1 ? 'item' : 'items') + ' attached', 'Just now']]
  };
  sessions.unshift(session);
  adjustSessionFleetTotals(null, 'waiting', 'Manual override');
  const driverName = item.name;
  sessionDraft = null;
  activeSessionId = session.id;
  activeSessionFilter = 'open';
  activeSessionSource = 'manual';
  closeCategoryDrawer();
  setTimeout(() => {
    setView('inbox');
    openSessionDrawer(session.id, { type: 'sessions' });
  }, 220);
  showToast('Manual session created for ' + driverName);
}

let sessionFleetTotals = {
  attention: 14,
  open: 21,
  completed: 130,
  archived: 26,
  all: 177,
  reply: 4,
  overdue: 4,
  repeat: 3,
  issues: 3,
  automated: 171,
  manual: 6
};

const sessionOriginTotals = {
  automated: { attention: 14, open: 19, completed: 128, archived: 24, all: 171, reply: 4, overdue: 4, repeat: 3, issues: 3 },
  manual: { attention: 0, open: 2, completed: 2, archived: 2, all: 6, reply: 0, overdue: 0, repeat: 0, issues: 0 }
};

function isOpenSessionState(state) {
  return ['reply', 'waiting', 'overdue', 'repeat', 'issues'].includes(state);
}

function isAttentionSessionState(state) {
  return ['reply', 'overdue', 'repeat', 'issues'].includes(state);
}

function adjustSessionFleetTotals(previousState, nextState, source) {
  const originKey = source === 'Automated' ? 'automated' : 'manual';
  const originTotals = sessionOriginTotals[originKey];
  if (!previousState) {
    sessionFleetTotals.all += 1;
    if (isOpenSessionState(nextState)) sessionFleetTotals.open += 1;
    if (isAttentionSessionState(nextState)) sessionFleetTotals.attention += 1;
    if (sessionFleetTotals[nextState] !== undefined) sessionFleetTotals[nextState] += 1;
    sessionFleetTotals[originKey] += 1;
    originTotals.all += 1;
    if (isOpenSessionState(nextState)) originTotals.open += 1;
    if (isAttentionSessionState(nextState)) originTotals.attention += 1;
    if (originTotals[nextState] !== undefined) originTotals[nextState] += 1;
    syncFleetSessionCounts();
    return;
  }
  if (previousState === nextState) return;
  if (isOpenSessionState(previousState)) sessionFleetTotals.open = Math.max(0, sessionFleetTotals.open - 1);
  if (isOpenSessionState(nextState)) sessionFleetTotals.open += 1;
  if (isAttentionSessionState(previousState)) sessionFleetTotals.attention = Math.max(0, sessionFleetTotals.attention - 1);
  if (isAttentionSessionState(nextState)) sessionFleetTotals.attention += 1;
  if (sessionFleetTotals[previousState] !== undefined) sessionFleetTotals[previousState] = Math.max(0, sessionFleetTotals[previousState] - 1);
  if (sessionFleetTotals[nextState] !== undefined) sessionFleetTotals[nextState] += 1;
  if (isOpenSessionState(previousState)) originTotals.open = Math.max(0, originTotals.open - 1);
  if (isOpenSessionState(nextState)) originTotals.open += 1;
  if (isAttentionSessionState(previousState)) originTotals.attention = Math.max(0, originTotals.attention - 1);
  if (isAttentionSessionState(nextState)) originTotals.attention += 1;
  if (originTotals[previousState] !== undefined) originTotals[previousState] = Math.max(0, originTotals[previousState] - 1);
  if (originTotals[nextState] !== undefined) originTotals[nextState] += 1;
  syncFleetSessionCounts();
}

function syncFleetSessionCounts() {
  const automationTotals = categories.reduce((sum, category) => ({
    coached: sum.coached + category.coached,
    completed: sum.completed + category.completed,
    attention: sum.attention + category.attention
  }), { coached: 0, completed: 0, attention: 0 });
  const values = {
    'sidebar-session-count': sessionFleetTotals.attention,
    'automation-completed-count': automationTotals.completed,
    'automation-attention-count': automationTotals.attention,
    'attention-reply-count': sessionFleetTotals.reply,
    'attention-overdue-count': sessionFleetTotals.overdue,
    'attention-repeat-count': sessionFleetTotals.repeat,
    'attention-issues-count': sessionFleetTotals.issues,
    'sla-reply-count': sessionFleetTotals.reply,
    'sla-overdue-count': sessionFleetTotals.overdue,
    'sla-repeat-count': sessionFleetTotals.repeat,
    'sla-issues-count': sessionFleetTotals.issues,
    'driver-attention-button-count': automationTotals.attention,
    'driver-attention-filter-count': automationTotals.attention
  };
  Object.entries(values).forEach(([id, value]) => {
    const node = document.getElementById(id);
    if (node) node.textContent = value;
  });
  const completionRate = Math.round(automationTotals.completed / Math.max(1, automationTotals.coached) * 100);
  const attentionRate = Math.round(automationTotals.attention / Math.max(1, automationTotals.coached) * 100);
  const completedBar = document.getElementById('automation-completed-bar');
  const attentionBar = document.getElementById('automation-attention-bar');
  if (completedBar) completedBar.style.width = completionRate + '%';
  if (attentionBar) attentionBar.style.width = attentionRate + '%';
  const analyticsValues = {
    'analytics-completed-count': automationTotals.completed,
    'analytics-completed-rate': completionRate + '% of automated coaching',
    'analytics-outlier-count': automationTotals.attention,
    'outcome-completion-rate': completionRate + '%',
    'outcome-completion-count': automationTotals.completed + ' of ' + automationTotals.coached + ' coached drivers'
  };
  Object.entries(analyticsValues).forEach(([id, value]) => {
    const node = document.getElementById(id);
    if (node) node.textContent = value;
  });
  ['following', 'speeding', 'braking', 'distraction'].forEach((categoryId) => {
    const category = categories.find((item) => item.id === categoryId);
    const completedNode = document.getElementById('analytics-' + categoryId + '-completed');
    const attentionNode = document.getElementById('analytics-' + categoryId + '-attention');
    if (completedNode) completedNode.textContent = category.completed;
    if (attentionNode) attentionNode.textContent = category.attention;
  });
  const currentWeek = weeklyCoachingActivity[weeklyCoachingActivity.length - 1];
  if (currentWeek) currentWeek.completed = automationTotals.completed;
  renderCoachingActivityChart();
}

function sessionMatchesFilter(session, filter) {
  if (filter === 'attention') return isAttentionSessionState(session.state);
  if (filter === 'open') return isOpenSessionState(session.state);
  if (filter === 'all') return true;
  return session.state === filter;
}

function sessionLifecycleStrip() {
  const totals = activeSessionSource === 'all' ? sessionFleetTotals : sessionOriginTotals[activeSessionSource];
  const activeLifecycle = ['reply', 'overdue', 'repeat', 'issues'].includes(activeSessionFilter)
    ? 'attention'
    : activeSessionFilter === 'waiting'
      ? 'open'
      : activeSessionFilter;
  const manual = activeSessionSource === 'manual';
  const automated = activeSessionSource === 'automated';
  const items = [
    ['attention', 'Needs attention', totals.attention, manual ? 'Manual sessions needing a response' : 'Replies · overdue · repeats · blocked'],
    ['open', 'Open', totals.open, manual ? 'Manual overrides in progress' : automated ? 'Includes automatic follow-ups' : 'Automated and manual sessions in progress'],
    ['completed', 'Completed', totals.completed, manual ? 'Manually completed sessions' : automated ? 'This weekly cycle' : 'Automated cycle + manual overrides'],
    ['archived', 'Archived', totals.archived, 'Retained history']
  ];
  return '<div class="session-lifecycle-strip" role="group" aria-label="Session lifecycle">' + items.map((item) => '<button class="' + (activeLifecycle === item[0] ? 'is-active' : '') + '" type="button" data-session-filter="' + item[0] + '" aria-pressed="' + (activeLifecycle === item[0]) + '"><span>' + item[1] + '</span><strong>' + item[2] + '</strong><small>' + item[3] + '</small></button>').join('') + '</div>';
}

function sessionFilters() {
  const totals = activeSessionSource === 'all' ? sessionFleetTotals : sessionOriginTotals[activeSessionSource];
  const labels = { attention: 'Needs attention', open: 'Open', completed: 'Completed', archived: 'Archived', all: 'All' };
  const filters = ['attention', 'open', 'completed', 'archived', 'all'];
  const attentionReasons = ['attention', 'reply', 'overdue', 'repeat', 'issues'].includes(activeSessionFilter)
    ? '<div class="attention-reason-summary"><button class="' + (activeSessionFilter === 'reply' ? 'is-active' : '') + '" type="button" data-session-filter="reply"><i class="reply"></i>' + totals.reply + ' replies</button><button class="' + (activeSessionFilter === 'overdue' ? 'is-active' : '') + '" type="button" data-session-filter="overdue"><i class="overdue"></i>' + totals.overdue + ' overdue</button><button class="' + (activeSessionFilter === 'repeat' ? 'is-active' : '') + '" type="button" data-session-filter="repeat"><i class="repeat"></i>' + totals.repeat + ' repeated</button><button class="' + (activeSessionFilter === 'issues' ? 'is-active' : '') + '" type="button" data-session-filter="issues"><i class="issue"></i>' + totals.issues + ' delivery blocked</button></div>'
    : '';
  return '<div class="session-filter-bar"><div class="inbox-filters" role="group" aria-label="Session filters">' + filters.map((key) => {
    const active = key === 'attention' ? ['attention', 'reply', 'overdue', 'repeat', 'issues'].includes(activeSessionFilter) : activeSessionFilter === key;
    return '<button class="' + (active ? 'is-active' : '') + '" type="button" data-session-filter="' + key + '" aria-pressed="' + active + '">' + labels[key] + '<b>' + totals[key] + '</b></button>';
  }).join('') + '</div><div class="session-source-filter" role="group" aria-label="Session origin"><button class="' + (activeSessionSource === 'all' ? 'is-active' : '') + '" type="button" data-session-source="all">All origins</button><button class="' + (activeSessionSource === 'automated' ? 'is-active' : '') + '" type="button" data-session-source="automated">Automated</button><button class="' + (activeSessionSource === 'manual' ? 'is-active' : '') + '" type="button" data-session-source="manual">Manual</button></div></div>' + attentionReasons;
}

function sessionStatusClass(session) {
  if (session.state === 'reply') return 'reply';
  if (session.state === 'repeat') return 'repeat';
  if (session.state === 'completed') return 'complete';
  if (session.state === 'archived') return 'archived';
  if (session.state === 'issues') return 'issue';
  return '';
}

function renderSessionList() {
  const priority = { reply: 0, overdue: 1, repeat: 2, issues: 3, waiting: 4, completed: 5, archived: 6 };
  const normalizedSearch = sessionSearch.trim().toLowerCase();
  const filtered = sessions
    .filter((item) => sessionMatchesFilter(item, activeSessionFilter))
    .filter((item) => activeSessionSource === 'all' || (activeSessionSource === 'automated' ? item.source === 'Automated' : item.source !== 'Automated'))
    .filter((item) => !normalizedSearch || [item.person, item.category, item.eventType, item.stateLabel, item.source, item.owner, item.latest, item.automationRun, item.due, item.sla].join(' ').toLowerCase().includes(normalizedSearch))
    .slice()
    .sort((a, b) => (priority[a.state] ?? 9) - (priority[b.state] ?? 9));
  const filterLabel = { attention: 'Sessions needing attention', reply: 'Driver replies', overdue: 'Overdue sessions', repeat: 'Repeated after coaching', issues: 'Delivery blocked', open: 'Open sessions', completed: 'Completed sessions', archived: 'Archived sessions', all: 'All session history' }[activeSessionFilter];
  const sortLabel = activeSessionFilter === 'all' ? 'Attention first' : ['completed', 'archived'].includes(activeSessionFilter) ? 'Newest first' : 'Sorted by urgency';
  const scopedTotals = activeSessionSource === 'all' ? sessionFleetTotals : sessionOriginTotals[activeSessionSource];
  const scopedCount = scopedTotals[activeSessionFilter] ?? 0;
  const originLabel = activeSessionSource === 'all' ? '' : activeSessionSource === 'automated' ? ' automated' : ' manual';
  return [
    sessionLifecycleStrip(),
    sessionFilters(),
    '<section class="session-list-card">',
      '<div class="session-list-title"><div><h2>' + filterLabel + '</h2><span>' + sortLabel + '</span></div></div>',
      '<div class="session-list-head"><span>Driver</span><span>Category</span><span>Origin</span><span>Status</span><span>Due</span><span>Latest activity</span><span></span></div>',
      (filtered.length ? filtered.map((session) => [
        '<button class="session-row" type="button" data-open-session="' + session.id + '" aria-haspopup="dialog">',
          '<span class="session-person"><span class="person-avatar">' + session.initials + '</span><span class="session-copy"><strong>' + escapeHtml(session.person) + '</strong><small>' + escapeHtml(session.owner) + '</small></span></span>',
          '<span class="session-topic"><strong>' + escapeHtml(session.category) + '</strong><small>' + escapeHtml(session.automationRun || '—') + '</small></span>',
          '<span class="session-origin ' + (session.source === 'Automated' ? 'automated' : 'manual') + '">' + escapeHtml(session.source || 'Automated') + '</span>',
          '<span class="state-pill ' + sessionStatusClass(session) + '">' + escapeHtml(session.stateLabel) + '</span>',
          '<span class="session-sla ' + (session.slaTone || '') + '">' + escapeHtml(session.due || '—') + '</span>',
          '<span class="latest-activity">' + escapeHtml(session.latest) + '</span>',
          '<span class="row-arrow">›</span>',
        '</button>'
      ].join('')).join('') : '<div class="empty-state">No sessions match this view.</div>'),
      '<footer class="session-footer"><span>Showing ' + filtered.length + ' sample sessions</span><span>' + scopedCount + originLabel + ' across the fleet</span></footer>',
    '</section>'
  ].join('');
}

function evidenceCards(session) {
  if (!session.evidence.length) {
    const emptyCopy = session.state === 'issues'
      ? 'No event attachment is required for this delivery issue.'
      : session.source === 'Automated'
        ? 'No clip attached; this session is based on the detected event pattern.'
        : 'No evidence is attached to this manual session.';
    return '<p class="heading-summary">' + emptyCopy + '</p>';
  }
  return '<div class="evidence-grid">' + session.evidence.map((item) => [
    '<button class="evidence-card" type="button" data-toast="Event evidence opened">',
      '<span class="evidence-thumb">' + (item.video === false ? 'DATA' : '▶ ' + item.duration) + '</span>',
      '<div><strong>' + escapeHtml(item.title) + '</strong><small>' + escapeHtml(item.meta) + '</small></div>',
      '<span>Open</span>',
    '</button>'
  ].join('')).join('') + '</div>';
}

function messageList(session) {
  return session.messages.map((message) => {
    if (message.author === 'system') return '<p class="system-message">' + escapeHtml(message.text) + '</p>';
    return '<div class="message ' + message.author + '"><span>' + escapeHtml(message.text) + '</span><small>' + escapeHtml(message.time) + '</small></div>';
  }).join('');
}

function renderSessionDetail(session) {
  const exception = session.state === 'issues';
  const completed = session.state === 'completed';
  const archived = session.state === 'archived';
  const readOnly = completed || archived;
  const automatedWaiting = session.source === 'Automated' && session.state === 'waiting';
  const deliveryRetrying = Boolean(session.deliveryRelinked && session.state === 'waiting');
  const methodLabel = session.method === 'in-person' ? 'In person' : session.method === 'phone' ? 'Phone' : 'App conversation';
  const headerAction = exception
    ? session.deliveryRelinked
      ? '<span class="automation-complete-status"><i>↻</i> Automatic retry queued</span>'
      : '<span class="state-pill issue">Identity link required</span>'
    : completed
      ? '<button class="secondary-button" type="button" data-archive-session>Archive</button>'
      : archived
        ? '<button class="secondary-button" type="button" data-restore-session>Restore</button>'
        : automatedWaiting
          ? '<span class="automation-complete-status"><i>↻</i> ' + (deliveryRetrying ? 'Automatic delivery retry queued' : 'Automatic reminders active') + '</span>'
          : '<button class="secondary-button" type="button" data-complete-session>Complete session</button>';
  const nextStep = exception
    ? session.deliveryRelinked
      ? 'No manager action required. The system is retrying delivery and will close this item when the assignment reaches the driver.'
      : 'Reconnect the driver identity. The system will retry delivery automatically.'
    : completed
      ? 'No action required. The system is measuring the 14-day outcome window.'
      : archived
        ? 'No action is required. Restore the record if coaching needs to resume.'
        : deliveryRetrying
          ? 'No manager action required. The system is retrying delivery and will close this item when the assignment reaches the driver.'
          : session.state === 'reply'
          ? 'Review the driver response and agree on one behavior change.'
          : session.state === 'repeat'
            ? 'Review the repeated behavior and decide whether a manual conversation is needed.'
            : session.state === 'overdue'
              ? 'Automatic reminders did not produce a response. Contact the driver or begin a manual follow-up.'
              : 'No action required. Automatic reminders remain active.';
  return [
    '<div class="session-drawer-shell">',
      '<header class="drawer-header session-drawer-header">',
        '<div class="session-drawer-title">',
          '<p class="eyebrow">Session</p>',
          '<div class="session-driver"><span class="person-avatar">' + session.initials + '</span><div><h2 id="driver-drawer-title">' + escapeHtml(session.person) + '</h2><small>' + escapeHtml(session.category + ' · ' + session.stateLabel) + '</small></div></div>',
        '</div>',
        '<div class="session-drawer-actions">' + headerAction + '<button class="icon-button" type="button" data-close-drawer aria-label="Close session">×</button></div>',
      '</header>',
      '<section class="session-workspace">',
      '<div class="session-main">',
        '<div class="session-scroll" id="session-scroll">',
          '<section class="case-summary-card"><p class="eyebrow">' + (exception ? 'Delivery blocked' : deliveryRetrying ? 'Delivery retry queued' : readOnly ? 'Coaching record' : session.source === 'Automated' ? 'Automated session' : 'Manual follow-up') + '</p><h2>' + escapeHtml(session.category) + '</h2><p>' + escapeHtml(session.summary) + '</p>' + evidenceCards(session) + '</section>',
          '<div class="conversation-label">Coaching activity</div>',
          (exception ? '<div class="empty-state">Resolve the identity link. Delivery retries automatically after the fix.</div>' : deliveryRetrying ? '<div class="empty-state">Identity linked. Automatic delivery retry is queued.</div>' : '<div class="messages" id="message-list">' + messageList(session) + '</div>'),
        '</div>',
        (deliveryRetrying
          ? '<div class="session-record-footer"><span>Identity linked. Automatic delivery retry is queued.</span></div>'
          : exception
            ? '<div class="composer"><div class="composer-footer"><span>Link the matching Drive account; delivery retries automatically.</span><button class="primary-button" type="button" data-relink-driver>Relink driver</button></div></div>'
          : readOnly
            ? '<div class="session-record-footer"><span>' + (completed ? 'Completion retained with a 14-day outcome window.' : 'Archived records remain searchable and read-only.') + '</span></div>'
            : '<div class="composer"><label class="sr-only" for="reply-text">' + (composerMode === 'note' ? 'Private coaching note' : 'Reply to ' + escapeHtml(session.person)) + '</label><textarea id="reply-text" placeholder="' + (composerMode === 'note' ? 'Add a private note…' : 'Message ' + escapeHtml(session.person.split(' ')[0]) + '…') + '"></textarea><div class="composer-footer"><div class="composer-modes"><button class="' + (composerMode === 'reply' ? 'is-active' : '') + '" type="button" data-composer-mode="reply" aria-pressed="' + (composerMode === 'reply') + '">Reply to driver</button><button class="' + (composerMode === 'note' ? 'is-active' : '') + '" type="button" data-composer-mode="note" aria-pressed="' + (composerMode === 'note') + '">Private note</button><button type="button" data-toast="Evidence picker opened">Attach evidence</button></div><button class="primary-button" type="button" data-send-reply>' + (composerMode === 'note' ? 'Add note' : 'Send reply') + '</button></div></div>'),
      '</div>',
      '<aside class="session-rail">',
        '<section class="rail-section"><h3>Session</h3><div class="rail-field"><span>Category</span><strong>' + escapeHtml(session.category) + '</strong></div><div class="rail-field"><span>Origin</span><strong>' + escapeHtml(session.source || 'Automated') + '</strong></div><div class="rail-field"><span>Method</span><strong>' + methodLabel + '</strong></div><div class="rail-field"><span>Status</span><strong>' + escapeHtml(session.stateLabel) + '</strong></div><div class="rail-field"><span>Owner</span><strong>' + escapeHtml(session.owner) + '</strong></div><div class="rail-field"><span>Due</span><strong>' + escapeHtml(session.due) + '</strong></div><div class="rail-field"><span>Due status</span><strong class="rail-sla ' + (session.slaTone || '') + '">' + escapeHtml(session.sla || '—') + '</strong></div></section>',
        (session.goal ? '<section class="rail-section"><h3>Goal</h3><p class="heading-summary">' + escapeHtml(session.goal) + '</p>' + (session.lesson ? '<div class="rail-field"><span>Lesson</span><strong>' + escapeHtml(session.lesson) + '</strong></div>' : '') + '</section>' : ''),
        '<section class="rail-section"><h3>Next step</h3><p class="heading-summary">' + nextStep + '</p></section>',
        '<section class="rail-section"><h3>Session history</h3><div class="history-list">' + session.history.map((item) => '<div class="history-item"><strong>' + escapeHtml(item[0]) + '</strong><small>' + escapeHtml(item[1]) + '</small></div>').join('') + '</div></section>',
      '</aside>',
      '</section>',
    '</div>'
  ].join('');
}

function renderInbox() {
  inboxContent.innerHTML = renderSessionList();
}

function renderSessionDrawer() {
  const session = sessions.find((item) => item.id === activeSessionId);
  if (!session) {
    closeDrawer();
    return;
  }
  driverDrawerContent.innerHTML = renderSessionDetail(session);
  driverDrawer.classList.remove('is-profile');
  driverDrawer.classList.add('is-session');
  driverDrawer.scrollTop = 0;
}

function openSessionDrawer(sessionId, origin) {
  const session = sessions.find((item) => item.id === sessionId);
  if (!session) return;
  const drawerWasOpen = driverDrawer.classList.contains('is-open');
  if (!drawerWasOpen) drawerOpener = document.activeElement;
  activeSessionId = session.id;
  composerMode = 'reply';
  sessionDrawerOrigin = { type: origin?.type || 'sessions' };
  renderSessionDrawer();
  drawerBackdrop.hidden = false;
  driverDrawer.inert = false;
  driverDrawer.classList.add('is-open');
  driverDrawer.setAttribute('aria-hidden', 'false');
  document.getElementById('app-shell').inert = true;
  document.body.style.overflow = 'hidden';
  setTimeout(() => driverDrawer.querySelector('[data-close-drawer]')?.focus(), 100);
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
  driverTierTotals.innerHTML = driverTierCounts.map((tier) => [
    '<button class="driver-tier-total ' + tier.tone + (activeDriverScoreFilter === tier.key ? ' is-active' : '') + '" type="button" data-driver-score-filter="' + tier.key + '" aria-pressed="' + (activeDriverScoreFilter === tier.key) + '">',
      '<i aria-hidden="true"></i><strong>' + tier.count + '</strong><span>' + tier.label + '</span>',
    '</button>'
  ].join('')).join('');
  driverDistribution.innerHTML = driverDistributionBins.map((bin) => {
    const selected = activeDriverScoreFilter === bin.key;
    const height = Math.max(8, Math.round(bin.count / max * 100));
    return [
      '<button class="driver-distribution-bin ' + bin.tone + (selected ? ' is-active' : '') + '" type="button" data-driver-score-filter="' + bin.key + '" aria-label="' + bin.label + ', ' + bin.count + ' drivers" aria-pressed="' + selected + '">',
        '<span class="driver-bin-count">' + bin.count + '</span>',
        '<span class="driver-bin-track"><i style="height:' + height + '%"></i></span>',
        '<span class="driver-bin-label">' + bin.label + '</span>',
      '</button>'
    ].join('');
  }).join('');
}

function renderDriverFilterState() {
  if (!driverFilterState) return;
  const tokens = [];
  if (activeDriverScoreFilter !== 'all') tokens.push(['score', driverScoreFilterLabel(activeDriverScoreFilter)]);
  if (activeDriverGroup !== 'all') tokens.push(['group', activeDriverGroup]);
  if (activeDriverCategory !== 'all') tokens.push(['category', activeDriverCategory]);
  driverFilterState.innerHTML = tokens.length
    ? '<span>Filtered by</span>' + tokens.map((token) => '<button type="button" data-clear-driver-filter="' + token[0] + '">' + escapeHtml(token[1]) + ' <b aria-hidden="true">×</b></button>').join('') + '<button class="clear-driver-filters" type="button" data-clear-driver-filter="all">Clear all</button>'
    : '';
  driverFilterState.hidden = !tokens.length;
}

function renderDirectory() {
  renderDriverDistribution();
  renderDriverFilterState();
  const term = document.getElementById('driver-search').value.trim().toLowerCase();
  const filtered = directory.filter((item) => {
    const statusMatches = activeDriverFilter === 'all' || item.state === activeDriverFilter;
    const groupMatches = activeDriverGroup === 'all' || item.group === activeDriverGroup;
    const categoryMatches = activeDriverCategory === 'all' || item.focus === activeDriverCategory;
    return statusMatches && groupMatches && categoryMatches && driverMatchesScore(item, activeDriverScoreFilter) && item.name.toLowerCase().includes(term);
  }).sort((a, b) => {
    if (driverSort === 'lowest') return (Number.isFinite(a.safetyScore) ? a.safetyScore : 101) - (Number.isFinite(b.safetyScore) ? b.safetyScore : 101);
    if (driverSort === 'decline') return (Number.isFinite(a.scoreChange) ? a.scoreChange : 99) - (Number.isFinite(b.scoreChange) ? b.scoreChange : 99);
    if (driverSort === 'recent') return directory.indexOf(a) - directory.indexOf(b);
    const priority = { attention: 0, coached: 1, outcome: 2, track: 3 };
    return priority[a.state] - priority[b.state] || (Number.isFinite(a.safetyScore) ? a.safetyScore : 101) - (Number.isFinite(b.safetyScore) ? b.safetyScore : 101);
  });
  const rows = filtered.map((item) => {
    const scored = Number.isFinite(item.safetyScore);
    const scoreTone = !scored ? 'unscored' : item.safetyScore < 60 ? 'risk' : item.safetyScore < 80 ? 'watch' : 'good';
    const changeLabel = scored && Number.isFinite(item.scoreChange) ? (item.scoreChange > 0 ? '+' : '') + item.scoreChange : 'Unscored';
    const scoreLabel = scored ? 'Safety score ' + item.safetyScore + ', change ' + changeLabel : 'Safety score unavailable';
    const action = item.state === 'attention'
      ? '<button class="directory-review" type="button" data-open-attention-driver="' + escapeHtml(item.name) + '">Review</button>'
      : '<span class="directory-automation-status">' + (item.state === 'coached' ? 'Automatic' : '—') + '</span>';
    return [
      '<div class="directory-row">',
        '<span class="directory-person"><span class="person-avatar">' + item.initials + '</span><span class="person-copy"><strong>' + escapeHtml(item.name) + '</strong><small>' + escapeHtml(item.group) + '</small></span></span>',
        '<span>' + escapeHtml(item.focus) + '</span>',
        '<span>' + escapeHtml(item.lastCoaching) + '</span>',
        '<span class="driver-score ' + scoreTone + '" aria-label="' + scoreLabel + '"><strong>' + (scored ? item.safetyScore : '—') + '</strong><small class="' + (scored && item.scoreChange >= 0 ? 'up' : scored ? 'down' : '') + '">' + changeLabel + '</small></span>',
        '<span class="state-pill ' + (item.state === 'track' || item.state === 'outcome' ? 'complete' : item.state === 'coached' ? 'reply' : 'issue') + '">' + escapeHtml(item.stateLabel) + '</span>',
        '<span class="directory-action">' + action + '</span>',
      '</div>'
    ].join('');
  }).join('');
  document.getElementById('driver-directory').innerHTML = filtered.length
    ? '<div class="directory-head"><span>Driver</span><span>Category</span><span>Last coaching</span><span>Safety score</span><span>Status</span><span>Action</span></div>' + rows + '<div class="driver-directory-footer">Showing ' + filtered.length + ' of 1,024 drivers</div>'
    : '<div class="driver-directory-empty"><strong>No drivers match</strong><span>Change or clear the active filters.</span><button class="secondary-button" type="button" data-clear-driver-filter="all">Clear filters</button></div>';
}

function syncDirectoryAttentionState(name, shouldRender = true) {
  const driver = directory.find((item) => item.name === name);
  if (!driver) return;
  const unresolvedInsight = attentionAiInsights.find((insight) => insight.name === name && !resolvedAttentionIds.has(insight.id));
  const attentionSession = sessions.find((session) => session.person === name && isAttentionSessionState(session.state));
  if (unresolvedInsight || attentionSession) {
    driver.state = 'attention';
    driver.stateLabel = 'Needs attention';
    driver.focus = unresolvedInsight?.categoryName || attentionSession.category;
  } else if (driver.state === 'attention') {
    driver.state = 'coached';
    driver.stateLabel = 'Coached';
    driver.lastCoaching = 'This week';
  }
  if (shouldRender) renderDirectory();
}

function syncDirectoryAttentionStates() {
  directory.forEach((driver) => syncDirectoryAttentionState(driver.name, false));
}

function openAttentionDriver(name) {
  const session = sessions.find((item) => item.person === name && ['reply', 'overdue', 'repeat', 'issues'].includes(item.state));
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
      '<span class="lesson-icon">▶</span>',
      '<h2>' + lesson.title + '</h2>',
      '<p>' + lesson.category + ' · requires video review, acknowledgement, and a two-question quiz.</p>',
      '<div class="lesson-meta"><span>' + lesson.length + '</span><span>' + lesson.version + '</span><span>' + lesson.completion + ' completion</span></div>',
    '</article>'
  ].join('')).join('');
}

function renderSettings() {
  const modes = {
    manual: { label: 'Manual', next: 'Managers review every match before coaching starts' },
    semi: { label: 'Semi-automated', next: 'Matches wait for manager approval' },
    fully: { label: 'Fully automated', next: 'Next coaching cycle · Monday, 8:00 AM' }
  };
  document.querySelectorAll('[data-automation-mode]').forEach((button) => {
    const active = button.dataset.automationMode === automationMode;
    button.classList.toggle('is-active', active);
    button.setAttribute('aria-pressed', String(active));
  });
  document.querySelectorAll('[data-cadence]').forEach((button) => {
    const active = Number(button.dataset.cadence) === cadenceWeeks;
    button.classList.toggle('is-active', active);
    button.setAttribute('aria-pressed', String(active));
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
  if (cadenceWindow) cadenceWindow.textContent = cadenceWeeks === 1 ? 'Previous 7 days' : 'Previous 14 days';
  if (cadenceDispatch) cadenceDispatch.textContent = cadenceWeeks === 1 ? 'Monday · 8:00 AM' : 'Every other Monday · 8:00 AM';
  const commandStatus = document.getElementById('automation-command-status');
  if (commandStatus) {
    const schedule = cadenceWeeks === 1 ? 'Runs Mondays' : 'Runs every other Monday';
    const mode = automationMode === 'fully' ? 'fully automated' : automationMode === 'semi' ? 'human review' : 'manual review only';
    commandStatus.innerHTML = schedule + ' · ' + mode + ' <b aria-hidden="true">›</b>';
  }
}

function renderOutcomeTable() {
  const table = document.getElementById('outcome-table');
  if (!table) return;
  const views = {
    category: {
      label: 'Category',
      rows: [
        ['Speeding', 'Aligned to each coaching date', '4.8', '2.9', '−40%', 71, 'Improved', true],
        ['Following distance', 'Aligned to each coaching date', '3.2', '2.7', '−16%', 68, 'Unchanged', false],
        ['Harsh braking', 'Aligned to each coaching date', '5.1', '3.6', '−29%', 70, 'Improved', true]
      ]
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
  const view = views[outcomeTab];
  table.innerHTML = [
    '<div class="outcome-row outcome-head"><span>' + view.label + '</span><span>Before</span><span>After</span><span>Change</span><span>Completion</span><span>Outcome</span></div>',
    view.rows.map((row) => '<div class="outcome-row"><strong>' + row[0] + '<small>' + row[1] + '</small></strong><span>' + row[2] + '<small>events / 1k trips</small></span><span>' + row[3] + '<small>events / 1k trips</small></span><b class="' + (row[7] ? 'positive' : '') + '">' + row[4] + '</b><span><b>' + row[5] + '%</b><i class="progress-line"><u style="width:' + row[5] + '%"></u></i></span><em class="outcome-pill ' + (row[7] ? 'improved' : 'neutral') + '">' + row[6] + '</em></div>').join('')
  ].join('');
}

function renderPhone() {
  if (phoneTab === 'training') {
    phoneContent.innerHTML = '<article class="phone-card"><p class="phone-kicker">Assigned automatically · due in 3 days</p><h3>Following Distance Basics</h3><p>Five following-distance events crossed your fleet\'s weekly coaching rule.</p><div class="phone-reason"><strong>Why I received this</strong><span>5 events · 1 representative clip · weekly coaching cycle</span></div><div class="phone-video">▶ Play 2-minute lesson</div><div class="phone-progress"><i style="width:20%"></i></div><button class="phone-button" type="button" data-phone-action="training">Begin training</button></article>';
  } else if (phoneTab === 'coaching') {
    phoneContent.innerHTML = '<article class="phone-card"><p class="phone-kicker">1:1 coaching · Response requested</p><h3>Following distance</h3><p>Your coach attached one event and asked what made the gap difficult to maintain.</p><div class="phone-video">▶ Event clip · 0:18</div><div class="phone-message manager">Please review the event and share what you could change.</div><div class="phone-message">I understand. Traffic merged into the gap, but I can rebuild it earlier.</div><button class="phone-button" type="button" data-phone-action="coaching">Open conversation</button></article>';
  } else {
    phoneContent.innerHTML = '<article class="phone-card"><p class="phone-kicker">Your progress</p><h3>Safer gaps, sustained.</h3><p>Your following-distance event rate is 31% lower after coaching.</p><div class="before-after"><div><small>Before</small><strong>4.2</strong></div><b>↘</b><div><small>After</small><strong>2.9</strong></div></div><div class="phone-progress"><i style="width:74%"></i></div><button class="phone-button" type="button" data-phone-action="progress">View coaching history</button></article>';
  }
}

function showToast(message) {
  const toast = document.getElementById('toast');
  document.getElementById('toast-message').textContent = message;
  clearTimeout(toastTimer);
  toast.classList.add('is-visible');
  toastTimer = setTimeout(() => toast.classList.remove('is-visible'), 2800);
}

function setCoachNextExpanded(expanded) {
  const detail = document.getElementById('coach-next-detail');
  if (detail) detail.hidden = !expanded;
  document.querySelectorAll('[data-toggle-ai-brief]').forEach((button) => button.setAttribute('aria-expanded', String(expanded)));
  document.querySelector('.ai-command-card')?.classList.toggle('is-expanded', expanded);
  updateAiToggleLabel(expanded);
}

document.addEventListener('click', (event) => {
  if (event.target.closest('[data-manual-session]')) {
    openManualSessionDialog();
    return;
  }

  if (event.target.closest('[data-confirm-manual-session]')) {
    createManualSession();
    return;
  }

  const aiBriefToggle = event.target.closest('[data-toggle-ai-brief]');
  if (aiBriefToggle) {
    const detail = document.getElementById('coach-next-detail');
    setCoachNextExpanded(Boolean(detail && detail.hidden));
    return;
  }

  const aiInsightWhy = event.target.closest('[data-ai-insight-why]');
  if (aiInsightWhy) {
    activeAiInsightId = activeAiInsightId === aiInsightWhy.dataset.aiInsightWhy ? null : aiInsightWhy.dataset.aiInsightWhy;
    renderCoachNextTray();
    return;
  }

  if (event.target.closest('[data-ai-insights-more]')) {
    showAllAiInsights = !showAllAiInsights;
    renderCoachNextTray();
    return;
  }

  const aiInsightCoach = event.target.closest('[data-ai-insight-coach]');
  if (aiInsightCoach) {
    openAiCoach(aiInsightCoach.dataset.aiInsightCoach);
    return;
  }

  const aiInsightDismiss = event.target.closest('[data-ai-insight-dismiss]');
  if (aiInsightDismiss) {
    markAttentionReviewed(aiInsightDismiss.dataset.aiInsightDismiss);
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
    if (viewLink.dataset.inboxFilter) {
      activeSessionFilter = viewLink.dataset.inboxFilter;
      activeSessionSource = 'all';
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
    if (categoryButton.closest('.coach-next-tray')) setCoachNextExpanded(false);
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

  const queueStatusButton = event.target.closest('[data-queue-status]');
  if (queueStatusButton && queueStatusButton.closest('.queue-toolbar')) {
    queueStatus = queueStatusButton.dataset.queueStatus;
    document.querySelectorAll('.queue-toolbar [data-queue-status]').forEach((node) => {
      const active = node.dataset.queueStatus === queueStatus;
      node.classList.toggle('is-active', active);
      node.setAttribute('aria-pressed', String(active));
    });
    renderQueue();
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
    workflowTab = 'active';
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
    closeCategoryDrawer();
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

  const sessionFilterButton = event.target.closest('[data-session-filter]');
  if (sessionFilterButton) {
    activeSessionFilter = sessionFilterButton.dataset.sessionFilter;
    activeSessionId = null;
    renderInbox();
    return;
  }

  const sessionSourceButton = event.target.closest('[data-session-source]');
  if (sessionSourceButton) {
    activeSessionSource = sessionSourceButton.dataset.sessionSource;
    activeSessionId = null;
    renderInbox();
    return;
  }

  const openSessionButton = event.target.closest('[data-open-session]');
  if (openSessionButton) {
    openSessionDrawer(openSessionButton.dataset.openSession, { type: 'sessions' });
    return;
  }

  const composerModeButton = event.target.closest('[data-composer-mode]');
  if (composerModeButton) {
    composerMode = composerModeButton.dataset.composerMode;
    renderSessionDrawer();
    document.getElementById('reply-text')?.focus();
    return;
  }

  if (event.target.closest('[data-send-reply]')) {
    const session = sessions.find((item) => item.id === activeSessionId);
    const input = document.getElementById('reply-text');
    if (session && input && input.value.trim()) {
      const safeText = input.value.trim();
      if (composerMode === 'note') {
        session.messages.push({ author: 'system', text: 'Private note · ' + safeText, time: 'Just now' });
        session.latest = 'Private note added · just now';
      } else {
        const previousState = session.state;
        session.messages.push({ author: 'manager', text: safeText, time: 'Just now' });
        session.state = 'waiting';
        session.stateLabel = 'Active';
        session.latest = 'Coach replied · just now';
        adjustSessionFleetTotals(previousState, session.state, session.source);
        if (isAttentionSessionState(previousState)) clearAttentionForSession(session);
      }
      renderSessionDrawer();
      renderInbox();
      const scroll = document.getElementById('session-scroll');
      if (scroll) scroll.scrollTop = scroll.scrollHeight;
      showToast(composerMode === 'note' ? 'Private note added' : 'Reply sent to ' + session.person);
    }
    return;
  }

  const outcomeTabButton = event.target.closest('[data-outcome-tab]');
  if (outcomeTabButton) {
    outcomeTab = outcomeTabButton.dataset.outcomeTab;
    document.querySelectorAll('[data-outcome-tab]').forEach((node) => {
      const active = node.dataset.outcomeTab === outcomeTab;
      node.classList.toggle('is-active', active);
      node.setAttribute('aria-pressed', String(active));
    });
    renderOutcomeTable();
    return;
  }

  const analyticsTabButton = event.target.closest('[data-analytics-tab]');
  if (analyticsTabButton) {
    analyticsTab = analyticsTabButton.dataset.analyticsTab;
    renderAnalytics();
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
      session.state = 'completed';
      session.stateLabel = 'Completed';
      session.latest = 'Manager closed follow-up · just now';
      session.sla = session.slaTone === 'overdue' ? 'Missed' : 'Met';
      session.slaTone = session.slaTone === 'overdue' ? 'overdue' : 'met';
      session.history.unshift(['Session closed', 'Just now']);
      showToast('Session completed; outcome monitoring started');
      adjustSessionFleetTotals(previousState, session.state, session.source);
    }
    activeSessionFilter = session && session.state === 'archived' ? 'archived' : 'completed';
    closeDrawer();
    renderInbox();
    return;
  }

  if (event.target.closest('[data-relink-driver]')) {
    const session = sessions.find((item) => item.id === activeSessionId);
    if (relinkDeliverySession(session)) {
      renderSessionDrawer();
      renderInbox();
      showToast('Identity linked; automatic delivery retry queued');
    }
    return;
  }

  if (event.target.closest('[data-archive-session]')) {
    const session = sessions.find((item) => item.id === activeSessionId);
    if (session) {
      const previousState = session.state;
      session.state = 'archived';
      session.stateLabel = 'Archived';
      session.latest = 'Archived · just now';
      session.history.unshift(['Archived', 'Just now']);
      adjustSessionFleetTotals(previousState, session.state, session.source);
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
    return;
  }

  const automationModeButton = event.target.closest('[data-automation-mode]');
  if (automationModeButton) {
    automationMode = automationModeButton.dataset.automationMode;
    const saved = saveSetting('elevate-automation-mode', automationMode);
    renderSettings();
    showSettingSaveResult(saved);
    showToast(saved ? 'Automation mode saved' : 'Automation mode updated for this visit');
    return;
  }

  const cadenceButton = event.target.closest('[data-cadence]');
  if (cadenceButton) {
    cadenceWeeks = Number(cadenceButton.dataset.cadence);
    const saved = saveSetting('elevate-cadence-weeks', cadenceWeeks);
    renderSettings();
    showSettingSaveResult(saved);
    showToast(saved ? (cadenceWeeks === 1 ? 'Weekly cadence saved' : 'Two-week cadence saved') : 'Cadence updated for this visit');
    return;
  }

  const driverScoreFilterButton = event.target.closest('[data-driver-score-filter]');
  if (driverScoreFilterButton) {
    const nextFilter = driverScoreFilterButton.dataset.driverScoreFilter;
    activeDriverScoreFilter = activeDriverScoreFilter === nextFilter ? 'all' : nextFilter;
    renderDirectory();
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
    if (filter === 'category' || filter === 'all') {
      activeDriverCategory = 'all';
      document.getElementById('driver-category-filter').value = 'all';
    }
    if (filter === 'all') {
      activeDriverFilter = 'all';
      const driverSearchInput = document.getElementById('driver-search');
      if (driverSearchInput) driverSearchInput.value = '';
      document.querySelectorAll('[data-driver-filter]').forEach((node) => node.classList.toggle('is-active', node.dataset.driverFilter === 'all'));
    }
    renderDirectory();
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

  const phoneTabButton = event.target.closest('[data-phone-tab]');
  if (phoneTabButton) {
    phoneTab = phoneTabButton.dataset.phoneTab;
    document.querySelectorAll('[data-phone-tab]').forEach((node) => {
      const active = node.dataset.phoneTab === phoneTab;
      node.classList.toggle('is-active', active);
      node.setAttribute('aria-pressed', String(active));
    });
    renderPhone();
    return;
  }

  const phoneAction = event.target.closest('[data-phone-action]');
  if (phoneAction) {
    showToast(phoneAction.dataset.phoneAction === 'training' ? 'Training opened in driver view' : phoneAction.dataset.phoneAction === 'coaching' ? 'Conversation opened in driver view' : 'Coaching history opened');
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

document.getElementById('driver-search').addEventListener('input', renderDirectory);
document.getElementById('session-search').addEventListener('input', (event) => {
  sessionSearch = event.target.value;
  renderInbox();
});
document.getElementById('driver-group-filter').addEventListener('change', (event) => {
  activeDriverGroup = event.target.value;
  renderDirectory();
});
document.getElementById('driver-category-filter').addEventListener('change', (event) => {
  activeDriverCategory = event.target.value;
  renderDirectory();
});
document.getElementById('driver-sort').addEventListener('change', (event) => {
  driverSort = event.target.value;
  renderDirectory();
});
document.getElementById('open-driver-preview').addEventListener('click', () => {
  renderPhone();
  driverAppDialog.showModal();
});
document.getElementById('close-driver-preview').addEventListener('click', () => driverAppDialog.close());
document.addEventListener('keydown', (event) => {
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
    const focusable = Array.from(activeDrawer.querySelectorAll('button:not([disabled]), input:not([disabled]), textarea:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])'));
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
renderCoachNextTray();
renderQueue();
syncFleetSessionCounts();
syncGroupDisplay();
renderInbox();
syncDirectoryAttentionStates();
renderDirectory();
renderLibrary();
renderPhone();
renderOutcomeTable();
renderAnalytics();
renderSettings();
