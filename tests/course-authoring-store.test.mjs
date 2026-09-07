import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
const scripts = ['speeding-course-pack.js', 'coaching-engine.js', 'course-authoring-store.js'].map(name => fs.readFileSync(new URL('../dist/' + name, import.meta.url), 'utf8'));
const plain = value => JSON.parse(JSON.stringify(value));
function harness(saved = new Map()) {
  const storage = { getItem: key => saved.get(key) ?? null, setItem: (key, value) => saved.set(key, String(value)) };
  const context = vm.createContext({ URL, localStorage: storage });
  scripts.forEach(script => vm.runInContext(script, context));
  return { S: context.CourseAuthoringStore, C: context.Coaching, context, storage, saved };
}
function draft(S, template = 'generic-three-level', behaviorId = 'braking') {
  const series = S.create(template); series.title = 'Safer driving series'; series.behaviorId = behaviorId; return series;
}
function published(S, template = 'generic-three-level', behaviorId = 'braking') {
  const result = S.publish(draft(S, template, behaviorId)); assert.equal(result.ok, true, result.errors.join(' ')); return result.series;
}
function action(C, state, type, detail = {}) { C.dispatch(state, { type, ...detail }); assert.equal(state.lastError, null); }
function assess(C, state, score = 60, programId = 'braking') { action(C, state, 'assess', { driverId: 'demo-driver', programId, score, valid: true, complete: true, evidenceIds: ['event-' + state.assessments.length] }); }
function complete(C, state) {
  const course = state.assignments.find(item => item.status === 'ready');
  assert.ok(course, 'An ordered course is ready');
  action(C, state, 'deliver', { assignmentId: course.id }); action(C, state, 'video', { assignmentId: course.id });
  action(C, state, 'quiz', { assignmentId: course.id, answers: Object.fromEntries(course.courseSnapshot.questions.map(q => [q.id, q.correctIndex])) });
  assert.equal(course.status, 'completed'); return course;
}
function followUp(C, state, score = 50) { action(C, state, 'advance', { days: 14 }); assess(C, state, score); }

test('templates provide independent three-level, source-backed and blank starting points', () => {
  const { S, C } = harness();
  assert.deepEqual(plain(S.templates().map(item => item.id)), ['generic-three-level', 'speeding-pack', 'blank-one-level']);
  const source = S.create('speeding-pack'), second = S.create('speeding-pack');
  assert.equal(source.levels.length, 3); assert.deepEqual(plain(source.levels.map(level => level.questions.length)), [3, 3, 3]);
  assert.deepEqual(plain(source.levels[2].questions.map(q => q.sourceQuestionId)), ['L3-Q2', 'L3-Q3', 'L3-Q4']);
  assert.ok(source.levels[2].questions.every(q => q.critical));
  assert.ok(source.levels.every(level => level.video.script && level.video.mode === 'planned'));
  assert.notEqual(source.id, second.id); assert.notEqual(source.levels[0].id, second.levels[0].id); assert.notEqual(source.levels[0].questions[0].id, second.levels[0].questions[0].id);
  source.levels[0].title = 'Changed outside the store'; assert.equal(second.levels[0].title, 'Reset your speed'); assert.equal(S.get(source.id).levels[0].title, 'Reset your speed');
  assert.equal(C.catalog.courses.length, 30); assert.equal(S.getPublishedCourses().length, 0);
});

test('incomplete drafts autosave across reload and preserve unrelated local settings', () => {
  const { S, saved } = harness(); saved.set('elevate-unrelated-setting', 'keep');
  const series = S.create('blank-one-level'); series.title = 'A draft in progress'; series.levels[0].questions[0].prompt = 'Draft question';
  S.saveDraft(series);
  const reloaded = harness(saved); const restored = reloaded.S.get(series.id);
  assert.equal(restored.title, series.title); assert.equal(restored.levels[0].questions[0].prompt, 'Draft question'); assert.equal(restored.levels[0].id, series.levels[0].id);
  assert.equal(reloaded.S.list()[0].status, 'draft'); assert.equal(reloaded.S.getPublishedCourses().length, 0); assert.equal(saved.get('elevate-unrelated-setting'), 'keep');
});

test('publication validates teaching, video and all three complete quiz questions', () => {
  const { S } = harness(); const series = S.create('blank-one-level');
  const result = S.publish(series); assert.equal(result.ok, false); assert.match(result.errors.join(' '), /behavior|learning goal|script|answer choices/);
  const complete = draft(S); complete.levels[0].video.seconds = null; complete.levels[0].questions[0].correctIndex = null; complete.levels[1].questions.pop();
  assert.match(S.validate(complete).join(' '), /duration|correct answer|exactly three/);
  complete.levels[0].questions[1].options = ['Repeat', ' repeat ', 'Another']; assert.match(S.validate(complete).join(' '), /distinct/);
  assert.equal(S.getPublishedCourses().length, 0);
});

test('publishing adds stable catalog courses without enrolling them in program defaults', () => {
  const { S, C } = harness(); const original = C.createPolicy('braking'); const ref = C.catalog.courses;
  const series = published(S);
  assert.equal(series.version, 1); assert.equal(series.status, 'published'); assert.equal(S.list()[0].levels.length, 3); assert.equal(S.list()[0].hasDraft, false);
  assert.equal(C.catalog.courses, ref); assert.equal(ref.length, 33);
  assert.deepEqual(plain(C.createPolicy('braking').courseIds), plain(original.courseIds));
  for (const [index, course] of S.getPublishedCourses().entries()) {
    assert.equal(course.id, series.levels[index].id); assert.equal(course.level, index + 1); assert.equal(course.seriesId, series.id); assert.equal(course.version, 1); assert.equal(course.progression, 'ordered'); assert.equal(course.previewOnly, true); assert.equal(course.videoUrl, null);
  }
  S.init(); assert.equal(ref.length, 33, 'Catalog hydration is idempotent');
});

test('published edits remain staged and stable IDs survive reordering and a new version', () => {
  const { S, C, saved } = harness(); const first = published(S); const edited = S.get(first.id, { draft: true });
  edited.title = 'Revised course series'; edited.levels.reverse(); edited.levels[0].title = 'Reflection first'; S.saveDraft(edited);
  assert.equal(S.get(first.id).title, first.title); assert.equal(S.get(first.id, { draft: true }).title, edited.title); assert.equal(S.list()[0].hasDraft, true); assert.equal(S.list()[0].title, first.title);
  assert.equal(C.catalog.courses.find(course => course.id === first.levels[2].id).title, first.levels[2].title);
  const second = S.publish(edited); assert.equal(second.ok, true); assert.equal(second.series.version, 2); assert.equal(second.series.levels[0].id, first.levels[2].id); assert.equal(second.series.levels[0].level, 1);
  assert.equal(second.series.levels[0].questions[0].id, first.levels[2].questions[0].id);
  const reloaded = harness(saved); reloaded.S.init(); assert.equal(reloaded.C.catalog.courses.find(course => course.id === first.levels[2].id).version, 2); assert.equal(reloaded.S.get(first.id).title, edited.title);
});

test('published behavior cannot change into another program category', () => {
  const { S } = harness(); const series = published(S); const edit = S.get(series.id, { draft: true }); edit.behaviorId = 'speeding';
  const result = S.publish(edit); assert.equal(result.ok, false); assert.match(result.errors.join(' '), /behavior stays fixed/); assert.equal(S.get(series.id).behaviorId, 'braking');
});

test('saved templates remain independent and create fresh course/question identities', () => {
  const { S, saved } = harness(); const series = draft(S); const templateResult = S.saveTemplate(series, 'Depot coaching');
  assert.equal(templateResult.ok, true); assert.equal(S.getPublishedCourses().length, 0);
  const a = S.create(templateResult.template.id), b = S.create(templateResult.template.id);
  a.levels[0].title = 'One local edit'; S.saveDraft(a);
  assert.notEqual(a.id, b.id); assert.notEqual(a.levels[0].id, b.levels[0].id); assert.notEqual(a.levels[0].questions[0].id, b.levels[0].questions[0].id); assert.notEqual(S.get(b.id).levels[0].title, a.levels[0].title);
  const reloaded = harness(saved); assert.ok(reloaded.S.templates().some(template => template.id === templateResult.template.id)); assert.equal(reloaded.S.templates().filter(template => template.builtin).length, 3);
});

test('new levels gain stable IDs and an ordered position without mutating the published series', () => {
  const { S } = harness(); const series = draft(S); series.levels = series.levels.slice(0, 1); const initial = S.publish(series).series;
  const edit = S.get(initial.id, { draft: true }); const second = S.newLevel(initial.id); edit.levels.push(second); S.saveDraft(edit);
  assert.equal(S.get(initial.id).levels.length, 1); assert.equal(S.get(initial.id, { draft: true }).levels[1].id, second.id); assert.equal(second.questions.length, 3); assert.equal(S.get(initial.id, { draft: true }).levels[1].level, 2);
  const result = S.deleteDraft(initial.id); assert.equal(result.ok, true); assert.equal(S.get(initial.id).version, 1); assert.equal(S.list()[0].hasDraft, false);
});

test('only HTTP(S) video references publish; planned videos never pretend media exists', () => {
  const { S } = harness(); const series = draft(S); series.levels[0].video = { mode: 'url', url: 'https://example.test/training.mp4', seconds: 60, script: 'A transcript for the linked video.' };
  const valid = S.publish(series); assert.equal(valid.ok, true);
  const course = S.getPublishedCourses()[0]; assert.equal(course.videoUrl, 'https://example.test/training.mp4'); assert.equal(course.previewOnly, false);
  const materials = S.getMaterials(course.id); assert.equal(materials.videoSeconds, 60); assert.equal(materials.transcript, series.levels[0].video.script); assert.deepEqual(plain(materials.scenes), []); assert.equal(materials.custom, true);
  for (const url of ['javascript:alert(1)', 'data:video/mp4;base64,AAAA', 'ftp://example.test/video.mp4', 'https://username:password@example.test/video.mp4']) {
    const changed = S.get(series.id, { draft: true }); changed.levels[0].video.url = url; assert.equal(S.publish(changed).ok, false, url);
  }
});

test('editing source quiz content removes stale option-specific explanations', () => {
  const { S } = harness(); const series = S.create('speeding-pack'); assert.equal(series.levels[0].questions[0].feedback.length, 3);
  series.levels[0].questions[0].explanation = 'My adapted feedback for this question.'; S.saveDraft(series);
  assert.equal(S.get(series.id).levels[0].questions[0].feedback, undefined); assert.equal(S.get(series.id).levels[0].questions[0].explanation, 'My adapted feedback for this question.');
});

test('existing assignments retain published course snapshots when a new library version is published', () => {
  const { S, C } = harness(); const series = published(S); const policy = C.createPolicy('braking', { status: 'active', coach: 'Manager', courseIds: series.levels.map(level => level.id) }); const state = C.createSimulation([policy]); assess(C, state);
  const assignment = state.assignments[0]; const originalTitle = assignment.courseSnapshot.title;
  const edit = S.get(series.id, { draft: true }); edit.levels[0].title = 'Updated introduction'; edit.levels[1].title = 'Updated follow-up'; S.publish(edit);
  assert.equal(assignment.courseVersion, 1); assert.equal(assignment.courseSnapshot.title, originalTitle); assert.equal(C.catalog.courses.find(course => course.id === assignment.courseId).version, 2);
  complete(C, state); followUp(C, state, 20); assert.equal(state.assignments[1].courseVersion, 2); assert.equal(state.assignments[1].courseSnapshot.title, 'Updated follow-up');
});

test('authored series uses levels one, two and three even when worsening scores would change built-in choices', () => {
  const { S, C } = harness(); const series = published(S); const policy = C.createPolicy('braking', { status: 'active', coach: 'Manager', courseIds: series.levels.map(level => level.id) }); const state = C.createSimulation([policy]); assess(C, state, 65);
  for (let index = 0; index < 3; index++) {
    const assignment = complete(C, state); assert.equal(assignment.courseId, series.levels[index].id); assert.match(assignment.recommendation, new RegExp('Ordered level ' + (index + 1)));
    followUp(C, state, 50 - index * 10);
  }
  assert.equal(state.assignments.length, 3); assert.deepEqual(plain(state.cases[0].reasons), ['Repeated']);
});

test('missing the next approved level opens a content gap instead of skipping or mixing another series', () => {
  const { S, C } = harness(); const first = published(S); const other = published(S);
  const policy = C.createPolicy('braking', { status: 'active', coach: 'Manager', courseIds: [first.levels[0].id, first.levels[2].id, ...other.levels.map(level => level.id), ...C.createPolicy('braking').courseIds] });
  const state = C.createSimulation([policy]); assess(C, state); assert.equal(state.assignments[0].courseId, first.levels[0].id); complete(C, state); followUp(C, state);
  assert.equal(state.assignments.length, 1); assert.deepEqual(plain(state.cases[0].reasons), ['Content gap']);
  C.dispatch(state, { type: 'resume', caseId: state.cases[0].id, confirm: true, deadlineDays: 7 }); assert.match(state.lastError, /unused content/);
  policy.courseIds.push(first.levels[1].id); policy.version = 2; action(C, state, 'updatePolicy', { policy });
  action(C, state, 'resume', { caseId: state.cases[0].id, confirm: true, deadlineDays: 7 }); followUp(C, state);
  assert.equal(state.assignments[1].courseId, first.levels[1].id);
});

test('fresh-start assessments return an authored series to its first level', () => {
  const { S, C } = harness(); const series = published(S); const state = C.createSimulation([C.createPolicy('braking', { status: 'active', coach: 'Manager', courseIds: series.levels.map(level => level.id) })]);
  assess(C, state); complete(C, state); followUp(C, state, 80); followUp(C, state, 80); followUp(C, state, 80); followUp(C, state, 40);
  assert.equal(state.assignments[1].courseId, series.levels[0].id); assert.equal(state.assignments[1].cycle, 1);
});

test('failed persistence keeps draft work in memory and does not claim a new published version', () => {
  const { S, C, storage } = harness(); const series = published(S); const edited = S.get(series.id, { draft: true }); edited.title = 'Not yet durable';
  storage.setItem = () => { throw new Error('Quota exceeded'); };
  const result = S.publish(edited); assert.equal(result.ok, false); assert.equal(result.storageAvailable, false); assert.equal(S.get(series.id).version, 1); assert.equal(S.get(series.id, { draft: true }).title, 'Not yet durable');
  assert.ok(C.catalog.courses.filter(course => course.customSeriesId).every(course => course.version === 1));
});


test('duplicate course and question identities cannot be published', () => {
  const { S } = harness(); const series = draft(S);
  series.levels[1].id = series.levels[0].id; series.levels[2].questions[0].id = series.levels[0].questions[0].id;
  const result = S.publish(series); assert.equal(result.ok, false); assert.match(result.errors.join(' '), /stable course ID/); assert.match(result.errors.join(' '), /stable ID/);
});

test('malformed published data is withheld from the catalog without breaking materials lookup', () => {
  const saved = new Map([['elevate-course-authoring-v1', JSON.stringify({schemaVersion:1,sequence:1,series:[{id:'broken',published:{id:'broken',title:'Incomplete imported record'}}],templates:[]})]]);
  const { S, C } = harness(saved); S.init(); assert.equal(C.catalog.courses.length, 30); assert.equal(S.getPublishedCourses().length, 0); assert.equal(S.getMaterials('missing'), null);
});
