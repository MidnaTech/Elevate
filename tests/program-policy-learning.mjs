// Local policy and lesson editing acceptance. No remote upload, scoring engine or LMS is claimed.
import assert from 'node:assert/strict';
const { chromium } = await import(process.env.PLAYWRIGHT_MODULE || 'playwright');
const browser = await chromium.launch({ headless: true, channel: process.env.BROWSER_CHANNEL || 'chrome' });
const page = await browser.newPage({ viewport: { width: 1440, height: 1000 }, reducedMotion: 'reduce' });
page.setDefaultTimeout(10000);
const base = process.env.BASE_URL || 'http://localhost:5173';
await page.route('**/*', route => ['localhost', '127.0.0.1', '[::1]'].includes(new URL(route.request().url()).hostname) ? route.continue() : route.abort());
const errors = []; page.on('pageerror', error => errors.push(error.message));
const policy = () => page.evaluate(() => structuredClone(programPolicyFor('speeding')));
const setPolicy = async (key, value) => {
  const field = page.locator('[data-program-policy="' + key + '"]');
  await field.fill(String(value)); await field.press('Tab');
  await page.waitForFunction(({ key, value }) => programPolicyFor('speeding')[key] === Number(value), { key, value });
};
try {
  await page.goto(base + '/?program=speeding&programTab=configuration#programs');
  assert.equal((await policy()).basis, 'calendar');
  assert.equal((await policy()).window, 2, 'New calendar policy defaults to two weeks');
  const before = await page.evaluate(() => ({ score: programScore(categories.find(p => p.id === 'speeding')), sessions: JSON.stringify(sessions) }));
  await page.selectOption('[data-program-policy="basis"]', 'distance');
  assert.equal((await policy()).window, null, 'Distance exposure is not invented');
  await setPolicy('window', 1000);
  await setPolicy('resetPeriods', 3); await setPolicy('graceDays', 7); await setPolicy('reminderCount', 2);
  await page.selectOption('[data-program-policy="basis"]', 'driving_duration');
  assert.equal((await policy()).window, null);
  await setPolicy('window', 20);
  await page.selectOption('[data-program-policy="basis"]', 'distance');
  assert.equal((await policy()).window, 1000, 'Each basis retains its explicit configured window');
  const lessonId = await page.locator('[data-program-level="0"]').inputValue();
  await page.locator('[data-add-program-level]').click();
  await page.selectOption('[data-program-level="1"]', lessonId);
  assert.deepEqual((await policy()).levelLessons, [lessonId, lessonId], 'One existing video can be reused at multiple levels');
  assert.match(await page.locator('#program-configuration').textContent(), /Final stepOne-on-one coaching/);
  const weight = page.locator('[data-program-rule-field="weight"]').first();
  await weight.fill('0.5'); await weight.press('Tab');
  await page.reload();
  assert.equal(await page.locator('[data-program-rule-field="weight"]').first().inputValue(), '0.5', 'Fractional weights survive reload');
  assert.deepEqual((({ basis, window, resetPeriods, graceDays, reminderCount, levelLessons }) => ({ basis, window, resetPeriods, graceDays, reminderCount, levelLessons }))(await policy()), { basis: 'distance', window: 1000, resetPeriods: 3, graceDays: 7, reminderCount: 2, levelLessons: [lessonId, lessonId] });
  assert.deepEqual(await page.evaluate(() => ({ score: programScore(categories.find(p => p.id === 'speeding')), sessions: JSON.stringify(sessions) })), before, 'Configuration does not invent scores or run session assignment');
  await page.goto(base + '/?programTab=automation#programs');
  assert.doesNotMatch(await page.locator('#program-automation').textContent(), /Quiz|80% pass|Dry run complete/);
  await page.locator('#settings-preview').click();
  assert.match(await page.locator('#settings-preview-panel').textContent(), /Settings preview/);

  await page.goto(base + '/#learning');
  await page.locator('#view-library [data-new-lesson]').click();
  await page.fill('#learning-editor [name="title"]', 'Safer intersections');
  await page.selectOption('#learning-editor [name="source-kind"]', 'link');
  await page.fill('#learning-editor [name="url"]', 'javascript:alert(1)');
  await page.locator('#learning-editor [type="submit"]').click();
  assert.match(await page.locator('#learning-editor-error').textContent(), /https/);
  await page.fill('#learning-editor [name="url"]', 'https://example.com/lesson.mp4');
  await page.locator('[data-add-lesson-mapping]').click();
  await page.selectOption('#learning-mapping-rows [name="mapping-program"]', 'speeding');
  await page.fill('#learning-mapping-rows [name="mapping-level"]', '2');
  await page.locator('#learning-editor [type="submit"]').click();
  await page.waitForFunction(() => !document.getElementById('learning-editor').open);
  const created = await page.evaluate(() => structuredClone(lessons.find(item => item.title === 'Safer intersections')));
  assert.equal(created.source.url, 'https://example.com/lesson.mp4');
  assert.equal((await policy()).levelLessons[1], created.id, 'Library mapping and programme ladder share a source');
  await page.reload();
  assert.equal(await page.locator('[data-library-lesson="' + created.id + '"]').count(), 1);
  await page.locator('[data-preview-lesson="' + created.id + '"]').click();
  assert.equal(await page.locator('#learning-preview a').getAttribute('href'), 'https://example.com/lesson.mp4');
  assert.equal(await page.locator('#learning-preview a').getAttribute('rel'), 'noopener noreferrer');
  await page.locator('[data-close-learning-preview]').click();

  // Produce a small valid local WebM to verify the browser storage + player path.
  const bytes = await page.evaluate(async () => {
    const canvas = document.createElement('canvas'); canvas.width = 32; canvas.height = 32;
    const context = canvas.getContext('2d'); context.fillStyle = '#fff'; context.fillRect(0, 0, 32, 32);
    const stream = canvas.captureStream(10); const recorder = new MediaRecorder(stream, { mimeType: 'video/webm' });
    const chunks = []; recorder.ondataavailable = event => chunks.push(event.data);
    const finished = new Promise(resolve => recorder.onstop = resolve);
    recorder.start(); await new Promise(resolve => setTimeout(resolve, 150)); recorder.stop(); await finished;
    stream.getTracks().forEach(track => track.stop());
    return [...new Uint8Array(await new Blob(chunks, { type: 'video/webm' }).arrayBuffer())];
  });
  await page.locator('[data-edit-lesson="' + created.id + '"]:visible').click();
  await page.fill('#learning-editor [name="title"]', 'Safer intersections revised');
  await page.selectOption('#learning-editor [name="source-kind"]', 'file');
  await page.locator('#learning-editor [name="video"]').setInputFiles({ name: 'local-lesson.webm', mimeType: 'video/webm', buffer: Buffer.from(bytes) });
  await page.locator('#learning-editor [type="submit"]').click();
  await page.waitForFunction(() => !document.getElementById('learning-editor').open);
  await page.reload();
  const saved = await page.evaluate(id => structuredClone(lessons.find(item => item.id === id)), created.id);
  assert.equal(saved.source.kind, 'file'); assert.equal(saved.source.fileName, 'local-lesson.webm');
  assert.deepEqual(saved.previousTitles, ['Safer intersections']);
  assert.equal(await page.evaluate(async id => (await learningFileStore(lessons.find(item => item.id === id).source.fileKey)).size, created.id), bytes.length, 'Video bytes persist in IndexedDB across reload');
  await page.locator('[data-preview-lesson="' + created.id + '"]').click();
  await page.waitForFunction(() => document.querySelector('#learning-preview video')?.readyState >= 1);
  assert.match(await page.locator('#learning-preview video').getAttribute('src'), /^blob:/);
  await page.locator('[data-close-learning-preview]').click();
  await page.waitForFunction(() => learningPreviewUrl === null);
  assert.equal(await page.evaluate(() => learningPreviewUrl), null, 'Closing preview releases the object URL');

  // Progress counts only explicit known observation flags, not a completion assumption.
  const counts = await page.evaluate(id => {
    const lesson = lessons.find(item => item.id === id);
    sessions.push({ id: 'test-lesson-observation', person: 'Test Driver', categoryId: 'speeding', state: 'completed', origin: 'automated', lessonId: id, lessonWatched: false, lessonAcknowledged: true });
    const metrics = learningLessonMetrics(lesson); sessions.pop(); return metrics;
  }, created.id);
  assert.deepEqual(counts, { assigned: 1, measured: 1, watched: 0, acknowledged: 1, completed: 1 });
  await page.goto(base + '/?program=speeding&programTab=content#programs');
  assert.equal(await page.locator('[data-program-lesson="Safer intersections revised"]').count(), 1);
  await page.setViewportSize({ width: 390, height: 844 });
  await page.locator('[data-edit-lesson="' + created.id + '"]:visible').click();
  assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false, 'The editor remains usable on a narrow viewport');
  assert.equal(await page.locator('#learning-editor').evaluate(dialog => dialog.scrollWidth > dialog.clientWidth), false);
  assert.deepEqual(errors, []);
  console.log('programme policy and local learning acceptance passed');
} finally { await browser.close(); }
