// Global session deadlines use the shared settings transaction; no scheduler is invoked.
import assert from 'node:assert/strict';
const { chromium } = await import(process.env.PLAYWRIGHT_MODULE || 'playwright');
const browser = await chromium.launch({ headless: true, channel: process.env.BROWSER_CHANNEL || 'chrome' });
const page = await browser.newPage({ viewport: { width: 1440, height: 1000 }, reducedMotion: 'reduce' });
const base = process.env.BASE_URL || 'http://localhost:5173';
page.setDefaultTimeout(10000);
await page.route('**/*', route => ['localhost', '127.0.0.1', '[::1]'].includes(new URL(route.request().url()).hostname) ? route.continue() : route.abort());
const errors = []; page.on('pageerror', error => errors.push(error.message));
const active = () => page.evaluate(() => ({ days: globalSessionDueDays(), label: globalSessionDueLabel(), mode: automationMode, cadence: cadenceWeeks }));
const keys = ['elevate-session-due-days', 'elevate-automation-mode', 'elevate-cadence-weeks', 'elevate-settings-saved-at'];
const saved = () => page.evaluate(keys => Object.fromEntries(keys.map(key => [key, localStorage.getItem(key)])), keys);
try {
  await page.goto(base + '/?programTab=automation#programs');
  assert.deepEqual(await active(), { days: 7, label: 'Within 1 week', mode: 'fully', cadence: 2 });
  const records = await page.evaluate(() => JSON.stringify(sessions));
  assert.equal(await page.getByRole('spinbutton', { name: 'Session due period in days', exact: true }).count(), 1);
  assert.equal(await page.locator('#session-due-days').inputValue(), '7');
  assert.equal(await page.locator('#settings-save').isDisabled(), true);

  await page.locator('#session-due-days').fill('14');
  assert.equal(await page.evaluate(() => settingsAreDirty()), true, 'A due-only edit marks the shared settings draft dirty');
  assert.equal((await active()).days, 7, 'The active creation default does not read unsaved edits');
  assert.equal((await saved())['elevate-session-due-days'], null);
  await page.locator('#settings-preview').click();
  assert.match(await page.locator('#settings-preview-panel').textContent(), /due within 2 weeks of creation/);
  assert.match(await page.locator('#settings-preview-panel').textContent(), /Existing deadlines stay unchanged/);
  assert.equal((await active()).days, 7, 'Preview neither activates the draft nor starts sessions');
  await page.locator('#settings-discard').click();
  assert.equal(await page.locator('#session-due-days').inputValue(), '7');
  assert.equal(await page.locator('#settings-save').isDisabled(), true);

  await page.locator('#session-due-days').fill('14');
  await page.locator('#settings-save').click();
  assert.equal((await active()).days, 14);
  assert.equal((await active()).label, 'Within 2 weeks');
  assert.equal((await saved())['elevate-session-due-days'], '14');
  assert.equal(await page.evaluate(() => JSON.stringify(sessions)), records, 'Activation never rewrites existing session deadlines or creates records');
  await page.reload();
  assert.equal(await page.locator('#session-due-days').inputValue(), '14');
  assert.equal((await active()).days, 14, 'The active deadline survives reload');
  await page.locator('#settings-audit-history').click();
  assert.match(await page.locator('.program-automation-history').textContent(), /new sessions due 14 days from creation/);

  // A failed due-key write must roll back every other key in the same activation.
  const before = await saved();
  await page.locator('[data-automation-mode="manual"]').locator('..').click();
  await page.locator('[data-cadence="1"]').locator('..').click();
  await page.locator('#session-due-days').fill('21');
  await page.evaluate(() => {
    window.originalDueStorageSet = Storage.prototype.setItem;
    let rejected = false;
    Storage.prototype.setItem = function (key, value) {
      if (key === 'elevate-session-due-days' && value === '21' && !rejected) { rejected = true; throw new Error('Simulated storage failure'); }
      return window.originalDueStorageSet.call(this, key, value);
    };
  });
  await page.locator('#settings-save').click();
  assert.equal(await page.locator('#settings-save-state').textContent(), 'Activation failed');
  assert.deepEqual(await saved(), before, 'The transaction restores mode, cadence, timestamp and due period together');
  assert.deepEqual(await active(), { days: 14, label: 'Within 2 weeks', mode: 'fully', cadence: 2 });
  assert.equal(await page.locator('#session-due-days').inputValue(), '21', 'A failed activation keeps the reviewable draft');
  await page.evaluate(() => { Storage.prototype.setItem = window.originalDueStorageSet; });
  await page.locator('#settings-save').click();
  assert.deepEqual(await active(), { days: 21, label: 'Within 3 weeks', mode: 'manual', cadence: 1 });
  assert.equal(await page.evaluate(() => JSON.stringify(sessions)), records);

  for (const value of ['', '0', '-1', '3.5', '366']) {
    await page.locator('#session-due-days').fill(value);
    assert.equal(await page.locator('#session-due-days').getAttribute('aria-invalid'), 'true');
    assert.equal(await page.locator('#settings-save').isDisabled(), true);
    assert.equal(await page.locator('#settings-preview').isDisabled(), true);
    assert.equal((await active()).days, 21, 'Invalid input cannot change the active creation default');
  }
  await page.locator('#settings-discard').click();
  assert.equal(await page.locator('#session-due-days').inputValue(), '21');
  assert.equal(await page.locator('#session-due-days').getAttribute('aria-invalid'), 'false');

  // Old storage without this key, and malformed/out-of-range values, fall back to the old one-week default.
  for (const invalid of [null, 'invalid', '0', '-1', '1.5', '366']) {
    await page.evaluate(value => { if (value === null) localStorage.removeItem('elevate-session-due-days'); else localStorage.setItem('elevate-session-due-days', value); }, invalid);
    await page.reload();
    assert.equal((await active()).days, 7);
    assert.equal(await page.locator('#session-due-days').inputValue(), '7');
    assert.equal((await active()).mode, 'manual', 'Due migration retains unrelated saved settings');
    assert.equal((await active()).cadence, 1);
  }
  await page.locator('#session-due-days').fill('10');await page.locator('#settings-save').click();
  assert.equal((await active()).label, 'Within 10 days', 'Non-week durations retain their exact day count');
  for (const width of [390, 320]) {
    await page.setViewportSize({ width, height: 844 });
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false, 'Global settings do not overflow at ' + width);
    assert.equal(await page.locator('#session-due-days').isVisible(), true);
  }
  // New session records snapshot the active setting; an unsaved settings draft is never consulted.
  const existingDeadlines = await page.evaluate(() => sessions.map(record => ({id:record.id,due:record.due ?? null,dueDays:record.dueDays ?? null})));
  await page.setViewportSize({width:1440,height:1000});
  await page.locator('#session-due-days').fill('35');
  const createSession = async (person, program) => {
    await page.locator('.primary-nav [data-view="inbox"]').click();
    await page.locator('#view-inbox [data-manual-session]').click();
    assert.equal(await page.locator('#training-dialog #manual-session-due,#training-dialog #session-due-days').count(),0,'Creation has no due selector');
    await page.selectOption('#manual-driver-select',person);
    await page.selectOption('#manual-category-select',program);
    await page.locator('#training-dialog [data-confirm-manual-session]').click();
    const result=await page.evaluate(()=>{const record=sessions.find(item=>item.id===activeSessionId);return {id:record.id,due:record.due,dueDays:record.dueDays};});
    await page.keyboard.press('Escape');await page.waitForFunction(()=>!document.getElementById('driver-drawer').open);
    return result;
  };
  const beforeActivation=await createSession('Rowan Hall','distraction');
  assert.equal(beforeActivation.dueDays,10,'An unsaved 35-day draft still creates a session using the saved 10-day setting');
  assert.equal(beforeActivation.due,'Within 10 days');
  await page.locator('.primary-nav [data-view="programs"]').click();await page.locator('#program-tab-automation').click();
  assert.equal(await page.locator('#session-due-days').inputValue(),'35','The draft survives switching pages');
  await page.locator('#settings-save').click();
  const afterActivation=await createSession('Priya Singh','speeding');
  assert.equal(afterActivation.dueDays,35,'Sessions created after activation inherit the new global period');
  assert.equal(afterActivation.due,'Within 5 weeks');
  const priorDeadline=await page.evaluate(id=>{const record=sessions.find(item=>item.id===id);return {id:record.id,due:record.due,dueDays:record.dueDays};},beforeActivation.id);
  assert.deepEqual(priorDeadline,beforeActivation,'Changing the global period never alters the earlier session snapshot');
  assert.deepEqual(await page.evaluate(ids=>sessions.filter(record=>ids.includes(record.id)).map(record=>({id:record.id,due:record.due ?? null,dueDays:record.dueDays ?? null})),existingDeadlines.map(record=>record.id)),existingDeadlines,'Every existing fixture deadline remains unchanged');
  await page.evaluate(() => localStorage.clear());await page.reload();
  assert.deepEqual(await active(), { days: 7, label: 'Within 1 week', mode: 'fully', cadence: 2 }, 'Clearing local prototype settings resets the global due default');
  assert.deepEqual(errors, []);
  console.log('Passed: fleet-wide due period default/migration, due-only draft, preview/discard, atomic activation and rollback, invalid values, active-only API, existing deadline preservation and mobile layout.');
} finally { await browser.close(); }
