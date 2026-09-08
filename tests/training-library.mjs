// Training library: source-backed course inspection, filtering, quiz feedback and stable mappings.
import assert from 'node:assert/strict';
const { chromium } = await import(process.env.PLAYWRIGHT_MODULE || 'playwright');
const browser = await chromium.launch({ headless: true, channel: process.env.BROWSER_CHANNEL || 'chrome' });
const context = await browser.newContext({ viewport: { width: 1440, height: 1000 }, reducedMotion: 'reduce' });
const page = await context.newPage();
const base = process.env.BASE_URL || 'http://localhost:4173';
page.setDefaultTimeout(10000);
await context.route('**/*', route => ['localhost', '127.0.0.1', '[::1]'].includes(new URL(route.request().url()).hostname) ? route.continue() : route.abort());
const errors = [];
page.on('pageerror', error => errors.push(error.message));
page.on('response', response => { if (response.url().startsWith(base) && response.status() >= 400) errors.push(response.status() + ' ' + response.url()); });
const library = page.locator('#view-library');
const dialog = page.locator('#training-course-dialog');
const rows = library.locator('#library-grid tr[data-tl-course]');
const rowIds = () => rows.evaluateAll(nodes => nodes.map(node => node.dataset.tlCourse).sort());
const snapshot = () => page.evaluate(() => ({ sessions: sessions.map(session => ({ id: session.id, origin: session.origin, state: session.state })), policies: ProgramSetup.getPolicies(), mode: automationMode, cadence: cadenceWeeks }));
const openFilters = async () => {
  if (!(await library.locator('#tl-filters').isVisible())) await library.locator('[data-filter-sheet="training"] [data-filter-sheet-trigger]').click();
};
const resetFilters = async () => { await openFilters(); await library.locator('[data-tl-reset]').first().click(); };
const openCourse = async id => {
  const opener = rows.locator('[data-tl-open="' + id + '"]');
  await opener.click();
  await dialog.waitFor({ state: 'visible' });
  assert.equal(await dialog.evaluate(node => node.matches(':modal')), true, 'Course preview uses a native modal');
  return opener;
};
const selectTab = tab => dialog.locator('[data-tl-tab="' + tab + '"]').click();
const assertNoOverflow = async label => assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1), true, label + ' keeps horizontal scrolling local');
try {
  await page.goto(base + '/#content');
  await library.waitFor({ state: 'visible' });
  assert.equal(await library.locator('#library-title').innerText(), 'Training library', 'The existing Content URL remains a working alias');
  const nav = page.locator('.primary-nav [data-view="library"]');
  assert.equal(await nav.getAttribute('aria-label'), 'Training library');
  assert.match(await nav.innerText(), /Training library/);
  assert.equal(await page.locator('[data-mobile-view="library"] strong').innerText(), 'Training library');
  assert.equal(await library.getByRole('searchbox', { name: 'Search training library', exact: true }).count(), 1);
  assert.equal(await library.locator('.kpi-strip').count(), 1, 'The library uses one shared KPI strip');
  assert.equal(await library.locator('[data-coaching-period]').count(), 0, 'Course inventory is independent of the reporting period');

  const allCourses = await page.evaluate(() => ProgramSetup.getCourses());
  const sourcePack = await page.evaluate(() => SpeedingCoursePack);
  assert.equal(sourcePack.levels.length, 3);
  assert.equal(sourcePack.levels.reduce((count, level) => count + level.questions.length, 0), 12, 'The supplied source pack retains all twelve questions');
  const authoredIds = ['speeding-course-1', 'speeding-course-2', 'speeding-course-3'];
  const kpis = await library.locator('.kpi-tile').evaluateAll(tiles => Object.fromEntries(tiles.map(tile => [tile.querySelector('.kpi-label > span').textContent, Number(tile.querySelector('.kpi-value').textContent)])));
  assert.deepEqual(kpis, { Courses: allCourses.length, 'Materials prepared': sourcePack.levels.length, 'Incomplete lessons': allCourses.filter(course => course.legacy).length }, 'Inventory summaries reconcile to authored material and legacy availability');
  const baseline = await snapshot();
  assert.deepEqual(await rowIds(), allCourses.map(course => course.id).sort(), 'Every prepared or preserved legacy course has one table record');
  assert.equal(new Set(await rowIds()).size, allCourses.length, 'The catalog table does not duplicate courses');
  assert.equal(await library.locator('#tl-featured [data-tl-open]').count(), 3, 'The source-backed speeding sequence contains three course levels');
  assert.match(await library.locator('#tl-featured').innerText(), /Reset your speed/);

  // Search stays mounted and keyboard focus is not lost as the result table changes.
  await library.locator('#content-search').fill('Reset your speed');
  assert.equal(await page.evaluate(() => document.activeElement.id), 'content-search');
  assert.deepEqual(await rowIds(), ['speeding-course-1']);
  assert.match(await library.locator('#tl-result-count').innerText(), /1/);
  await library.locator('#content-search').fill('No matching training course 49287');
  assert.deepEqual(await rowIds(), []);
  assert.match(await library.locator('#library-grid').innerText(), /no .*course|no .*match/i, 'Search has an actionable empty state');
  await resetFilters();
  assert.equal(await library.locator('#content-search').inputValue(), '');

  // Behavior, level and content readiness narrow the same source-backed inventory.
  await library.locator('#tl-behavior').selectOption('speeding');
  assert.deepEqual(await rowIds(), allCourses.filter(course => course.behaviorId === 'speeding').map(course => course.id).sort());
  await openFilters();
  await library.locator('#tl-level').selectOption('2');
  assert.deepEqual(await rowIds(), ['speeding-course-2']);
  await library.locator('#tl-readiness').selectOption('legacy');
  assert.deepEqual(await rowIds(), [], 'Combined filters do not show a legacy course as a numbered authored level');
  await resetFilters();
  await openFilters();
  await library.locator('#tl-readiness').selectOption('authored');
  assert.deepEqual(await rowIds(), authoredIds, 'Authored content is distinguished from generic sample course previews');
  await library.locator('#tl-readiness').selectOption('sample');
  assert.deepEqual(await rowIds(), allCourses.filter(course => !course.legacy && !authoredIds.includes(course.id)).map(course => course.id).sort());
  await library.locator('#tl-readiness').selectOption('legacy');
  assert.deepEqual(await rowIds(), allCourses.filter(course => course.legacy).map(course => course.id).sort());
  await library.locator('#tl-level').selectOption('legacy');
  assert.deepEqual(await rowIds(), allCourses.filter(course => course.legacy).map(course => course.id).sort());
  await resetFilters();
  assert.deepEqual(await rowIds(), allCourses.map(course => course.id).sort());
  // Closing the filter sheet also restores its own invoker through the shared control.
  if (await library.locator('#tl-filters').isVisible()) {
    await page.keyboard.press('Escape');
    await page.waitForFunction(() => document.activeElement.hasAttribute('data-filter-sheet-trigger'));
  }

  // Inspect the authored lesson, video plan, short quiz and concrete next-drive action.
  const firstCourse = allCourses.find(course => course.id === 'speeding-course-1');
  const opener = await openCourse(firstCourse.id);
  assert.ok(Math.abs((await dialog.boundingBox()).width - 1060) < 1, 'Course previews share the record drawer width');
  assert.deepEqual(await dialog.locator('[role="tab"]').allTextContents(), ['Lesson', 'Video', 'Quiz', 'Follow-up']);
  assert.equal(await dialog.locator('[data-tl-tab="lesson"]').getAttribute('aria-selected'), 'true');
  assert.match(await dialog.innerText(), /Reset your speed/);
  for (const section of sourcePack.levels[0].lesson) {
    assert.ok((await dialog.locator('#tc-panel').textContent()).includes(section.heading));
    assert.ok((await dialog.locator('#tc-panel').textContent()).includes(section.body), 'Lesson copy comes from the supplied course pack');
  }
  assert.match(await dialog.innerText(), /park|stationary/i, 'Drivers are told to use training while safely parked');
  await dialog.locator('[data-tl-tab="lesson"]').focus();
  await page.keyboard.press('ArrowRight');
  assert.equal(await page.evaluate(() => document.activeElement.dataset.tlTab), 'video');
  assert.equal(await dialog.locator('[data-tl-tab="lesson"]').getAttribute('aria-selected'), 'true', 'Arrow navigation moves tab focus without switching the lesson');
  await page.keyboard.press('Enter');
  assert.equal(await dialog.locator('[data-tl-tab="video"]').getAttribute('aria-selected'), 'true', 'Enter activates the focused course tab');
  assert.match(await dialog.locator('#tc-panel').innerText(), /scene|storyboard|narration/i, 'The video tab exposes the authored video plan');
  assert.match(await dialog.locator('#tc-panel').innerText(), /not .*render|not .*supplied|not produced|no playable|unavailable|video.*production|storyboard/i, 'A storyboard is not presented as a playable finished video');
  assert.equal(await dialog.locator('video[src], video source[src]').count(), 0, 'Missing video media is never invented');
  await selectTab('quiz');
  assert.equal(await dialog.locator('#tc-quiz-form fieldset').count(), firstCourse.questions.length, 'Preview uses the same canonical short quiz as driver coaching');
  for (const [index, question] of firstCourse.questions.entries()) {
    await dialog.locator('input[name="quiz-' + question.id + '"][value="' + (index ? question.correctIndex : (question.correctIndex + 1) % question.options.length) + '"]').check();
  }
  await dialog.locator('#tc-submit-quiz').click();
  assert.match(await dialog.locator('#tc-quiz-feedback').innerText(), /correct|review|try|answer/i);
  const wrongIndex = (firstCourse.questions[0].correctIndex + 1) % firstCourse.questions[0].options.length;
  assert.ok((await dialog.locator('#tc-panel').textContent()).includes(firstCourse.questions[0].feedback[wrongIndex]), 'Incorrect responses use the source feedback for the selected option');
  assert.equal(await dialog.locator('#tc-quiz-form fieldset').count(), 1, 'Correct responses are retained and only the missed question needs a retry');
  const missed = firstCourse.questions[0];
  await dialog.locator('input[name="quiz-' + missed.id + '"][value="' + missed.correctIndex + '"]').check();
  await dialog.locator('#tc-submit-quiz').click();
  assert.match(await dialog.locator('#tc-quiz-feedback').innerText(), /3 of 3 correct.*complete/i, 'Retrying the missed response completes the local quiz preview');
  assert.equal(await dialog.locator('#tc-quiz-form').count(), 0);
  await selectTab('followup');
  assert.match(await dialog.locator('#tc-panel').innerText(), /commit|next|plan|check|coach/i, 'A course includes a next-drive commitment and follow-up');
  await page.keyboard.press('Escape');
  await dialog.waitFor({ state: 'hidden' });
  assert.equal(await opener.evaluate(node => node === document.activeElement), true, 'Closing a course restores the exact source-row action');

  // Each level exposes its actual source lesson, timed storyboard and complete question bank.
  let sourceQuestionsInspected = 0;
  for (const level of sourcePack.levels) {
    await openCourse(level.id);
    await selectTab('lesson');
    const lessonText = await dialog.locator('#tc-panel').textContent();
    for (const section of level.lesson) {
      assert.ok(lessonText.includes(section.heading), level.id + ' retains each lesson heading');
      assert.ok(lessonText.includes(section.body), level.id + ' retains its source reading');
    }
    await selectTab('video');
    const sceneText = await dialog.locator('#tc-panel').textContent();
    for (const scene of level.scenes) {
      assert.ok(sceneText.includes(scene.time), level.id + ' preserves authored scene timing');
      assert.ok(sceneText.includes(scene.voiceover), level.id + ' exposes every voiceover passage');
    }
    await selectTab('quiz');
    const canonical = allCourses.find(course => course.id === level.id).questions;
    assert.equal(await dialog.locator('#tc-quiz-form fieldset').count(), 3);
    for (const question of canonical) assert.ok((await dialog.locator('#tc-quiz-form').textContent()).includes(question.prompt));
    const bank = dialog.locator('details').filter({ has: page.locator('summary', { hasText: 'Full source question bank' }) });
    assert.equal(await bank.count(), 1);
    if (!(await bank.evaluate(node => node.open))) await bank.locator(':scope > summary').click();
    for (const question of level.questions) {
      assert.ok((await bank.innerText()).includes(question.prompt), 'The reference bank preserves each source question beyond the canonical three');
      sourceQuestionsInspected += 1;
    }
    await selectTab('followup');
    const followupText = await dialog.locator('#tc-panel').textContent();
    assert.ok(followupText.includes(level.commitment.prompt), level.id + ' retains its concrete next-trip commitment');
    for (const field of level.commitment.fields || []) assert.ok(followupText.includes(field.label), level.id + ' exposes all action-plan prompts');
    for (const criterion of level.coachReview?.criteria || []) assert.ok(followupText.includes(criterion.title), 'Level three retains the coach review criteria');
    await dialog.locator('[data-tl-close]').click();
  }
  assert.equal(sourceQuestionsInspected, 12);

  // Legacy metadata remains readable, explicitly incomplete, and cannot masquerade as a quiz.
  const legacy = allCourses.find(course => course.legacy);
  await openCourse(legacy.id);
  assert.match(await dialog.innerText(), /incomplete|not available|unavailable/i);
  assert.match(await dialog.innerText(), new RegExp(legacy.title.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')));
  assert.equal(await dialog.locator('#tc-quiz-form').count(), 0);
  await dialog.locator('[data-tl-close]').click();
  assert.deepEqual(await snapshot(), baseline, 'Searching and previewing training does not mutate programs, coaching records or fleet settings');

  // Renaming a program cannot sever its stable mappings to the enriched course IDs.
  await page.evaluate(() => {
    const current = ProgramSetup.getPolicy('speeding');
    ProgramSetup.savePolicy({ ...current, name: 'Safer motorway speeds', courseIds: ['speeding-course-1', 'speeding-course-2'] });
    renderLibrary();
  });
  await page.reload();
  await openCourse('speeding-course-1');
  const programLink = dialog.locator('[data-open-program-page="speeding"]');
  assert.equal(await programLink.count(), 1);
  assert.match(await programLink.innerText(), /Safer motorway speeds/);
  await programLink.click();
  assert.equal(await page.locator('#view-programs').isVisible(), true);
  assert.equal(await page.locator('#program-page-select').inputValue(), 'speeding');
  assert.equal(await page.locator('#program-tab-content').innerText(), 'Learning', 'Programs retains its Learning tab');
  assert.deepEqual(await page.evaluate(() => ProgramSetup.getPolicy('speeding').courseIds), ['speeding-course-1', 'speeding-course-2']);
  assert.equal(await page.locator('dialog:modal').count(), 0, 'Program navigation releases the course dialog');

  // Wide tables must scroll inside their region rather than enlarging the feature grid.
  await page.setViewportSize({ width: 1280, height: 1000 });
  await page.goto(base + '/#content');
  await page.evaluate(() => document.documentElement.style.fontSize = '200%');
  await assertNoOverflow('Training library at 1280px with 200% text zoom');

  // Course controls, native modal containment and training content reflow on narrow screens.
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto(base + '/#content');
  await assertNoOverflow('Training library at 390px');
  await openCourse('speeding-course-1');
  assert.ok(Math.abs((await dialog.boundingBox()).width - 390) < 1);
  assert.equal(await dialog.evaluate(node => node.scrollWidth <= node.clientWidth + 1), true);
  await page.evaluate(() => document.documentElement.style.fontSize = '32px');
  for (const tab of ['lesson', 'video', 'quiz', 'followup']) {
    await selectTab(tab);
    assert.equal(await dialog.evaluate(node => node.scrollWidth <= node.clientWidth + 1), true, tab + ' content reflows at 200% text zoom');
    await assertNoOverflow('Training course ' + tab + ' at 200% text zoom');
  }
  await dialog.locator('[data-tl-close]').click();
  assert.deepEqual(errors, []);
  console.log('Training library acceptance passed: renamed navigation, source-backed inventory, search and filters, course previews, quiz feedback, legacy availability, stable program mappings, focus and mobile/text-zoom reflow.');
} catch (error) {
  console.error('Training library failure at', page.url(), 'Page errors:', errors);
  throw error;
} finally { await browser.close(); }
