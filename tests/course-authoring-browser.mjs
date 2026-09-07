// Course authoring acceptance: local drafts, reusable templates, ordered series and publication.
import assert from 'node:assert/strict';
const { chromium } = await import(process.env.PLAYWRIGHT_MODULE || 'playwright');
const browser = await chromium.launch({ headless: true, channel: process.env.BROWSER_CHANNEL || 'chrome' });
const context = await browser.newContext({ viewport: { width: 1440, height: 1050 }, reducedMotion: 'reduce' });
const page = await context.newPage();
const base = process.env.BASE_URL || 'http://localhost:4173';
page.setDefaultTimeout(10000);
await context.route('**/*', route => ['localhost', '127.0.0.1', '[::1]'].includes(new URL(route.request().url()).hostname) ? route.continue() : route.abort());
const errors = [];
page.on('pageerror', error => errors.push(error.message));
const builder = page.locator('#course-builder-dialog');
const library = page.locator('#view-library');
const coursePreview = page.locator('#training-course-dialog');
const coachingPreview = page.locator('#coaching-preview-dialog');
const readSeries = (id, draft = false) => page.evaluate(({ id, draft }) => CourseAuthoringStore.get(id, { draft }), { id, draft });
const readTemplate = id => page.evaluate(id => JSON.parse(localStorage.getItem('elevate-course-authoring-v1')).templates.find(template => template.id === id), id);
const findSeries = title => page.evaluate(title => CourseAuthoringStore.list().find(series => series.title === title), title);
const publishedCourses = () => page.evaluate(() => CourseAuthoringStore.getPublishedCourses());
const fleetSnapshot = () => page.evaluate(() => ({ sessions: sessions.map(item => ({ id: item.id, origin: item.origin, state: item.state })), policies: ProgramSetup.getPolicies(), mode: automationMode, cadence: cadenceWeeks }));
const tab = name => builder.locator('[data-cb-tab="' + name + '"]').click();
const chooseLevel = index => builder.locator('[data-cb-level="' + index + '"]').locator('..').click();
const closeBuilder = () => builder.locator('[data-cb-close]').click();
const assertNoOverflow = async label => assert.equal(await builder.evaluate(node => node.scrollWidth <= node.clientWidth + 1), true, label);
async function createFrom(templateId) {
  await library.locator('[data-open-course-builder]').first().click();
  await builder.waitFor({ state: 'visible' });
  await builder.locator('[name="cb-template"][value="' + templateId + '"]').check();
  await builder.locator('#cb-use-template').click();
  await builder.locator('#cb-series-title').waitFor();
}
async function editSeries(id) {
  await library.locator('[data-edit-course-series="' + id + '"]').click();
  await builder.waitFor({ state: 'visible' });
}
async function saveDraft() {
  await builder.locator('#cb-save-draft').click();
  assert.match(await builder.locator('#cb-save-status').innerText(), /saved|draft/i);
}

try {
  await page.goto(base + '/#content');
  await library.waitFor({ state: 'visible' });
  const baseline = await fleetSnapshot();
  const originalSource = await page.evaluate(() => JSON.stringify(SpeedingCoursePack));
  const initialPublished = await publishedCourses();

  // A source template provides editable content without changing its original library course.
  await createFrom('speeding-pack');
  assert.equal(await builder.evaluate(node => node.matches(':modal')), true, 'Authoring uses a native modal');
  assert.ok(Math.abs((await builder.boundingBox()).width - 1060) < 1, 'Authoring shares the record drawer width');
  await builder.locator('#cb-series-title').fill('Regional speed refresher');
  await chooseLevel(0);
  await tab('lesson');
  await builder.locator('#cb-level-title').fill('Recognize the lower limit');
  await tab('video');
  await builder.locator('#cb-video-mode').selectOption('planned');
  await builder.locator('#cb-video-seconds').fill('75');
  await builder.locator('#cb-video-script').fill('Prepared narration for the regional refresher. Review the approaching change and the planned response.');
  await tab('quiz');
  await builder.locator('#cb-q-0-prompt').fill('Which response follows the prepared lesson?');
  await builder.locator('#cb-q-0-option-0').fill('Use the planned response');
  await builder.locator('#cb-q-0-option-1').fill('Ignore the lesson');
  await builder.locator('#cb-q-0-option-2').fill('Skip the review');
  await builder.locator('#cb-q-0-correct').selectOption('0');
  await builder.locator('#cb-q-0-explanation').fill('Use the response practiced in this lesson.');
  await saveDraft();
  const firstDraft = await findSeries('Regional speed refresher');
  assert.ok(firstDraft?.id);
  const draftId = firstDraft.id;
  const savedDraft = await readSeries(draftId, true);
  const originalLevelIds = savedDraft.levels.map(level => level.id);
  assert.equal(savedDraft.levels.length, 3);
  assert.equal(savedDraft.levels[0].video.seconds, 75);
  assert.equal(savedDraft.levels[0].questions[0].prompt, 'Which response follows the prepared lesson?');
  assert.deepEqual(await publishedCourses(), initialPublished, 'Saving a draft does not publish courses');
  assert.equal(await page.evaluate(() => JSON.stringify(SpeedingCoursePack)), originalSource, 'Source template data is unchanged');

  // Reload and reorder preserve the identity and learning material of each level.
  await closeBuilder();
  await page.reload();
  await editSeries(draftId);
  assert.equal(await builder.locator('#cb-series-title').inputValue(), 'Regional speed refresher');
  await chooseLevel(0);
  await builder.locator('[data-cb-move="down"]').click();
  await saveDraft();
  const reordered = await readSeries(draftId, true);
  assert.deepEqual(reordered.levels.map(level => level.id), [originalLevelIds[1], originalLevelIds[0], originalLevelIds[2]]);
  const moved = reordered.levels.find(level => level.id === originalLevelIds[0]);
  assert.equal(moved.title, 'Recognize the lower limit');
  assert.equal(moved.video.seconds, 75);
  assert.deepEqual(moved.questions, savedDraft.levels[0].questions, 'Moving a video level preserves its quiz');

  // Invalid playback URLs cannot enter the published catalog.
  await chooseLevel(0);
  await tab('video');
  await builder.locator('#cb-video-mode').selectOption('url');
  await builder.locator('#cb-video-url').fill('javascript:alert(1)');
  await builder.locator('#cb-publish').click();
  assert.ok((await builder.locator('#cb-errors').innerText()).trim().length > 0, 'Publishing reports the invalid video link');
  assert.equal((await publishedCourses()).filter(course => course.seriesId === draftId).length, 0);
  await builder.locator('#cb-video-mode').selectOption('planned');

  // A personal template is a separate reusable copy, including the ordered levels.
  await builder.locator('#cb-template-toggle').click();
  await builder.locator('#cb-template-name').fill('Dispatch-ready refresher template');
  await builder.locator('#cb-save-template').click();
  const template = await page.evaluate(() => CourseAuthoringStore.templates().find(item => (item.title || item.name) === 'Dispatch-ready refresher template'));
  assert.ok(template?.id);
  const templateSnapshot = await readTemplate(template.id);
  await builder.locator('#cb-series-title').fill('Regional speed refresher published');
  await builder.locator('#cb-publish').click();
  const firstPublished = await readSeries(draftId);
  assert.equal(firstPublished.status, 'published');
  assert.equal(firstPublished.version, 1);
  const publishedIds = firstPublished.levels.map(level => level.id);
  assert.deepEqual((await publishedCourses()).filter(course => course.seriesId === draftId).map(course => course.id), publishedIds);
  assert.deepEqual(await readTemplate(template.id), templateSnapshot, 'Published edits cannot alter the saved template');
  assert.deepEqual(await fleetSnapshot(), baseline, 'Course authoring does not alter programs, sessions or fleet settings');

  // Publishing a new version does not rewrite a prior assignment snapshot.
  await page.evaluate(courseIds => {
    const policy = Coaching.createPolicy('speeding', { id: 'authoring-snapshot', status: 'active', coach: 'Sample manager', courseIds });
    window.courseAuthoringHistoricalState = Coaching.createSimulation([policy]);
    Coaching.dispatch(courseAuthoringHistoricalState, { type: 'assess', driverId: 'demo-driver', programId: policy.id, score: 62, valid: true, complete: true });
    if (courseAuthoringHistoricalState.lastError) throw new Error(courseAuthoringHistoricalState.lastError);
  }, publishedIds);
  const historical = await page.evaluate(() => courseAuthoringHistoricalState.assignments[0].courseSnapshot);
  assert.equal(historical.version, 1);
  await chooseLevel(0);
  await tab('lesson');
  await builder.locator('#cb-level-title').fill('Updated first course');
  await tab('video');
  await builder.locator('#cb-video-mode').selectOption('url');
  await builder.locator('#cb-video-url').fill('https://example.invalid/regional-coaching.mp4');
  await saveDraft();
  assert.equal((await readSeries(draftId)).levels[0].title, firstPublished.levels[0].title, 'Published course remains active while its edit is staged');
  assert.equal((await readSeries(draftId, true)).levels[0].title, 'Updated first course');
  assert.equal((await publishedCourses()).find(course => course.id === publishedIds[0]).title, firstPublished.levels[0].title);
  await builder.locator('#cb-publish').click();
  const secondPublished = await readSeries(draftId);
  assert.equal(secondPublished.version, 2);
  assert.deepEqual(secondPublished.levels.map(level => level.id), publishedIds);
  assert.equal((await publishedCourses()).find(course => course.id === publishedIds[0]).videoUrl, 'https://example.invalid/regional-coaching.mp4');
  assert.deepEqual(await page.evaluate(() => courseAuthoringHistoricalState.assignments[0].courseSnapshot), historical, 'Historical course version and content are immutable');
  await builder.locator('#cb-level-title').fill('Discard this staged title');
  assert.equal(await page.evaluate(id => CourseAuthoringStore.list().find(series => series.id === id).hasDraft, draftId), true);
  await builder.locator('#cb-discard-draft').click();
  assert.equal(await builder.locator('#cb-level-title').inputValue(), 'Updated first course');
  assert.equal(await page.evaluate(id => CourseAuthoringStore.list().find(series => series.id === id).hasDraft, draftId), false, 'Discard removes only the staged edit');
  assert.deepEqual(await readSeries(draftId, true), secondPublished, 'Discard restores committed content without another version');
  assert.equal((await publishedCourses()).find(course => course.id === publishedIds[0]).version, 2);

  // Personal templates and new level sequences stay outside the assignable catalog until published.
  await closeBuilder();
  await library.locator('[data-tl-view="templates"]').click();
  assert.equal(new URL(page.url()).searchParams.get('libraryTab'), 'templates');
  await page.reload();
  assert.equal(await library.locator('[data-tl-view="templates"]').getAttribute('aria-selected'), 'true', 'Reload restores the Templates view');
  assert.equal(new URL(page.url()).searchParams.get('libraryTab'), 'templates');
  await library.locator('[data-use-course-template="' + template.id + '"]').click();
  await builder.locator('#cb-series-title').fill('Template copy in progress');
  await saveDraft();
  const copy = await findSeries('Template copy in progress');
  assert.notEqual(copy.id, draftId);
  assert.ok(copy.levels.every(level => !publishedIds.includes(level.id)), 'Template instances receive independent stable course IDs');
  assert.deepEqual(await readTemplate(template.id), templateSnapshot);
  assert.equal(copy.levels[0].title, firstPublished.levels[0].title, 'Template copying preserves its saved content before later source edits');
  assert.deepEqual(copy.levels[0].video, firstPublished.levels[0].video);
  await chooseLevel(1);
  await builder.locator('#cb-remove-level').click();
  const levelContent = level => ({ id: level.id, title: level.title, video: level.video, questions: level.questions });
  const twoLevelCopy = await readSeries(copy.id, true);
  assert.deepEqual(twoLevelCopy.levels.map(levelContent), [copy.levels[0], copy.levels[2]].map(levelContent), 'Removing a level preserves the remaining videos and quizzes');
  assert.deepEqual(twoLevelCopy.levels.map(level => level.level), [1, 2]);
  await closeBuilder();
  await page.reload();
  await library.locator('[data-tl-view="courses"]').click();
  await editSeries(copy.id);
  assert.equal(await builder.locator('[data-cb-level]').count(), 2, 'The removed level stays removed after reload');
  assert.deepEqual((await readSeries(copy.id, true)).levels.map(levelContent), twoLevelCopy.levels.map(levelContent));
  await closeBuilder();
  await library.locator('[data-tl-view="templates"]').click();
  await library.locator('[data-use-course-template="blank-one-level"]').click();
  await builder.locator('#cb-series-title').fill('Blank draft not ready');
  assert.equal(await builder.locator('#cb-remove-level').isDisabled(), true, 'At least one level must remain');
  await builder.locator('#cb-add-level').click();
  await builder.locator('#cb-add-level').click();
  assert.equal(await builder.locator('[data-cb-level]').count(), 3);
  assert.equal(await builder.locator('#cb-add-level').isDisabled(), true, 'A series supports one, two or three ordered levels');
  await builder.locator('#cb-publish').click();
  assert.ok((await builder.locator('#cb-errors').innerText()).trim().length > 0, 'Missing content blocks publication');
  await saveDraft();
  const blank = await findSeries('Blank draft not ready');
  assert.equal((await publishedCourses()).some(course => [copy.id, blank.id].includes(course.seriesId)), false);
  await closeBuilder();
  assert.deepEqual(await fleetSnapshot(), baseline, 'Drafts and templates are independent from fleet configuration');

  // The program explicitly approves the published series in its authored order.
  await page.goto(base + '/?program=speeding&programTab=configuration#programs');
  for (const id of publishedIds) assert.equal(await page.locator('[data-ps-course="' + id + '"]').count(), 1);
  for (const level of [...copy.levels, ...blank.levels]) assert.equal(await page.locator('[data-ps-course="' + level.id + '"]').count(), 0);
  await page.locator('[data-ps-course-series="' + draftId + '"]').click();
  assert.deepEqual(await page.evaluate(() => ProgramSetup.getPreviewPolicy('speeding').courseIds), publishedIds);
  const sequence = await page.evaluate(courseIds => {
    const policy = Coaching.createPolicy('speeding', { id: 'authoring-sequence', status: 'active', coach: 'Sample manager', courseIds });
    const state = Coaching.createSimulation([policy]);
    const apply = action => { Coaching.dispatch(state, action); if (state.lastError) throw new Error(state.lastError); };
    const assigned = [];
    for (let index = 0; index < 3; index++) {
      if (index) apply({ type: 'advance', days: 14 });
      apply({ type: 'assess', driverId: 'demo-driver', programId: policy.id, score: 65 - index * 15, valid: true, complete: true });
      const assignment = state.assignments.find(item => item.status === 'ready');
      assigned.push(assignment.courseId);
      apply({ type: 'deliver', assignmentId: assignment.id, success: true });
      apply({ type: 'video', assignmentId: assignment.id, complete: true });
      apply({ type: 'quiz', assignmentId: assignment.id, answers: Object.fromEntries(assignment.courseSnapshot.questions.map(question => [question.id, question.correctIndex])) });
    }
    return assigned;
  }, publishedIds);
  assert.deepEqual(sequence, publishedIds, 'Custom series follow their approved level order even when later scores worsen');

  // Custom media uses native playback, with no autoplay or false completion on metadata/error.
  await page.locator('[data-open-coaching-preview="speeding"]').click();
  await coachingPreview.locator('[data-cp-action="assess-default"]').click();
  await coachingPreview.locator('[data-cp-action="deliver"]').click();
  const video = coachingPreview.locator('video[data-cp-video]');
  assert.equal(await video.getAttribute('src'), 'https://example.invalid/regional-coaching.mp4');
  assert.equal(await video.getAttribute('preload'), 'none');
  assert.equal(await video.getAttribute('autoplay'), null);
  assert.equal(await coachingPreview.locator('[data-cp-action="video-finished"]').count(), 0, 'A supplied video is not a simulated missing-media placeholder');
  await video.dispatchEvent('loadedmetadata');
  assert.equal(await page.evaluate(() => CoachingPreview.getState().assignments[0].videoCompleted), false);
  await video.dispatchEvent('error');
  assert.match(await coachingPreview.locator('#cp-video-error').innerText(), /could not be loaded/);
  assert.equal(await page.evaluate(() => CoachingPreview.getState().assignments[0].videoCompleted), false);
  await video.dispatchEvent('ended');
  assert.equal(await coachingPreview.locator('#cp-quiz-form fieldset').count(), 3, 'Native playback completion unlocks the custom quiz');
  await page.keyboard.press('Escape');

  // Library preview uses the same published content; planned media stays visibly unavailable.
  await page.goto(base + '/#content');
  await library.locator('[data-tl-course="' + publishedIds[0] + '"] [data-tl-open]').click();
  assert.equal(await coursePreview.locator('#tc-title').innerText(), 'Updated first course');
  await coursePreview.locator('[data-tl-tab="video"]').click();
  assert.equal(await coursePreview.locator('#tc-video').getAttribute('src'), 'https://example.invalid/regional-coaching.mp4');
  await page.keyboard.press('Escape');
  await library.locator('[data-tl-course="' + publishedIds[1] + '"] [data-tl-open]').click();
  await coursePreview.locator('[data-tl-tab="video"]').click();
  assert.match(await coursePreview.locator('#tc-panel').innerText(), /not produced|not.*supplied|unavailable|planned/i);
  assert.equal(await coursePreview.locator('video').count(), 0);
  await coursePreview.locator('[data-tl-tab="quiz"]').click();
  assert.match(await coursePreview.locator('#tc-panel').innerText(), /Which response follows the prepared lesson/);
  await page.keyboard.press('Escape');

  // Reflow and native focus remain usable with the editor's longest content.
  const opener = library.locator('[data-edit-course-series="' + draftId + '"]');
  await opener.click();
  for (const width of [390, 1280]) {
    await page.setViewportSize({ width, height: 1000 });
    for (const name of ['lesson', 'video', 'quiz', 'followup']) { await tab(name); await assertNoOverflow(width + 'px ' + name + ' panel has no horizontal overflow'); }
  }
  await page.addStyleTag({ content: ':root{--font-1:1.275rem;--font-2:1.4875rem;--font-3:1.7rem;--font-4:2.125rem;--font-5:2.55rem;--font-6:3.4rem;--line-1:1.7rem;--line-2:2.125rem;--line-3:2.55rem;--line-4:2.975rem;--line-5:3.4rem;--line-6:3.825rem;--font-section-title:1.7rem;}' });
  for (const name of ['video', 'quiz']) { await tab(name); await assertNoOverflow('200% text zoom ' + name + ' panel reflows'); }
  await page.keyboard.press('Escape');
  assert.equal(await builder.evaluate(node => node.open), false);
  assert.equal(await opener.evaluate(node => document.activeElement === node), true, 'Closing returns focus to the exact series editor opener');
  const finalFleet = await fleetSnapshot();
  assert.deepEqual(finalFleet.sessions, baseline.sessions, 'Preview and authoring never create real fleet sessions');
  assert.equal(finalFleet.mode, baseline.mode); assert.equal(finalFleet.cadence, baseline.cadence);
  assert.deepEqual(errors, [], 'No browser JavaScript errors');
  console.log('Course authoring browser acceptance passed');
} finally {
  await browser.close();
}
