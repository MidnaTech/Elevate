// Acceptance for the combined workspace: scopes, review actions and retained navigation.
import assert from 'node:assert/strict';
const { chromium } = await import(process.env.PLAYWRIGHT_MODULE || 'playwright');
const browser = await chromium.launch({ headless: true, channel: process.env.BROWSER_CHANNEL || 'chrome' });
const base = process.env.BASE_URL || 'http://localhost:5173';
const page = await browser.newPage({ viewport: { width: 1440, height: 1000 }, reducedMotion: 'reduce' });
page.setDefaultTimeout(10000);
await page.route('**/*', route => ['localhost', '127.0.0.1', '[::1]'].includes(new URL(route.request().url()).hostname) ? route.continue() : route.abort());
const errors = [];
page.on('pageerror', error => errors.push(error.message));
const workspace = page.locator('#view-programs');
const noOverflow = async label => assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false, label + ' keeps overflow inside tables and plots');
const open = async (program = 'all', period = 1, tab = 'activity') => {
  await page.goto(base + '/?program=' + program + '&period=' + period + '&programTab=' + tab + '#programs');
  await workspace.locator('#program-tab-' + tab).waitFor();
};
const facts = async (id, period) => page.evaluate(({ id, period }) => {
  const records = sessions.filter(record => (id === 'all' || record.categoryId === id) && (record.weeksAgo || 0) < period);
  const review = records.filter(record => record.state === 'manager_attention');
  const active = records.filter(record => record.state === 'system_handling');
  return {
    total: records.length, review: review.length, reviewIds: review.map(record => record.id), reviewDrivers: [...new Set(review.map(record => record.person))],
    progress: active.length, automated: records.filter(record => record.deliveryMode === 'automated').length,
    manual: records.filter(record => record.deliveryMode === 'one_on_one').length,
    completed: records.filter(record => ['completed', 'archived'].includes(record.state)).length,
  };
}, { id, period });
try {
  await open();
  assert.deepEqual(await page.locator('.primary-nav a[data-view]').allTextContents().then(labels => labels.map(label => label.replace(/\d+/g, '').trim())), ['Automation Centre', 'Sessions', 'Programmes', 'Drivers', 'Training library', 'Driver app']);
  assert.deepEqual(await workspace.locator('[data-program-tab]').allTextContents(), ['Activity', 'Learning', 'Configuration', 'Automation']);
  const baseline = await page.evaluate(() => JSON.stringify(sessions));
  const ids = await page.evaluate(() => ['all', ...categories.map(program => program.id)]);
  for (const period of [1, 4, 8]) {
    for (const id of ids) {
      await open(id, period);
      const expected = await facts(id, period);
      const values = await workspace.locator('#program-page-kpis .kpi-tile').evaluateAll(tiles => Object.fromEntries(tiles.map(tile => [tile.querySelector('.kpi-label > span').textContent, tile.querySelector('.kpi-value').textContent])));
      assert.equal(values.Identified, String(expected.total), id + ' identified');
      assert.equal(values['In progress'], String(expected.progress));
      assert.equal(values['Needs review'], String(expected.review));
      assert.equal(values.Completed, String(expected.completed));
      assert.equal(values['Automated sessions'], String(expected.automated));
      assert.equal(values['One-on-one sessions'], String(expected.manual));
      const score = await page.evaluate(id => {const program=categories.find(item=>item.id===id);return {label:id==='all'?'Elevate score':program.name+' score',value:id==='all'?fleetSafetyScore.score:programScore(program)};},id);
      assert.equal(values[score.label],score.value===null?'—':String(score.value),'The score is named for its selected programme');
      assert.equal(await workspace.locator('#program-activity-chart .chart-summary thead th').last().textContent(),score.label+' / 100','The equivalent data names the same score');
      if(id!=='all')assert.equal(await workspace.locator('#program-rate-chart,[data-program-chart-view]').count(),0,'A selected programme has no separate event-rate module');
      assert.equal(expected.total, expected.progress + expected.review + expected.completed);
      assert.equal(expected.total, expected.automated + expected.manual);
      const reviewIds = await workspace.locator('#program-activity-attention [data-open-session]').evaluateAll(nodes => nodes.map(node => node.dataset.openSession));
      assert.ok(reviewIds.every(recordId => expected.reviewIds.includes(recordId)), id + ' attention only includes matching review records');
      assert.equal(reviewIds.length, expected.review, id + ' every attention session remains available by scrolling');
      if (expected.review) {
        await workspace.locator('[data-program-attention]').click();
        assert.equal(new URL(page.url()).hash, '#programs', 'Review KPI stays with its on-page attention list');
        await page.waitForFunction(() => document.activeElement?.id === 'program-activity-attention-title');
      }
      assert.match(await workspace.locator('#program-activity-chart').textContent(), /sample/i, 'History labels prototype observations');
      const geometry = await workspace.evaluate(node => {
        const chart = node.querySelector('#program-activity-chart').getBoundingClientRect();
        const attention = node.querySelector('#program-activity-attention').getBoundingClientRect();
        const heading=node.querySelector('#program-activity-attention-title').getBoundingClientRect();
        const count=node.querySelector('.program-attention-heading .caption').getBoundingClientRect();
        return { chartWidth: chart.width, attentionWidth: attention.width, chartTop: chart.top, attentionTop: attention.top, chartRight:chart.right, attentionLeft:attention.left, headingRight:heading.right,countLeft:count.left,headingTop:heading.top,headingBottom:heading.bottom,countTop:count.top,countBottom:count.bottom };
      });
      assert.ok(Math.abs(geometry.attentionTop - geometry.chartTop) < 2, 'Attention shares the chart row');
      assert.ok(Math.abs(geometry.chartWidth / (geometry.chartWidth + geometry.attentionWidth) - .7) < .01, 'Weekly coaching uses70% of the content width');
      assert.ok(Math.abs(geometry.chartRight-geometry.attentionLeft)<1,'Weekly coaching and attention join without a gutter');
      assert.ok(geometry.countLeft>=geometry.headingRight&&geometry.countTop<geometry.headingBottom&&geometry.headingTop<geometry.countBottom,'Attention count stays inline to the right of the heading');
      await noOverflow(id + ' / ' + period);
    }
  }
  assert.equal(await page.evaluate(() => JSON.stringify(sessions)), baseline, 'Browsing never changes the ledger');

  const history = await page.evaluate(() => {
    coachingPeriod = 8;
    const fleet = programActivityWeeks(allProgramsPage);
    const programmes = categories.map(program => ({ id: program.id, weeks: programActivityWeeks(program), expectedScore: programScore(program) }));
    return { fleet, programmes, latest: categories.map(program => {
      const active = sessions.filter(record => record.categoryId === program.id && (record.weeksAgo || 0) === 0 && record.state === 'system_handling');
      return { id: program.id, automated: active.filter(record => record.deliveryMode === 'automated').length, oneToOne: active.filter(record => record.deliveryMode === 'one_on_one').length };
    }) };
  });
  for (let index = 0; index < 7; index++) {
    for (const field of ['automated', 'oneToOne']) assert.equal(history.programmes.reduce((sum, program) => sum + (program.weeks.length > 1 ? program.weeks[index][field] : 0), 0), history.fleet[index][field], 'Illustrative programme counts reconcile to the existing fleet snapshot');
  }
  for (const program of history.programmes) {
    const latest = program.weeks.at(-1), expected = history.latest.find(row => row.id === program.id);
    assert.equal(latest.automated, expected.automated);
    assert.equal(latest.oneToOne, expected.oneToOne);
    assert.equal(latest.score, program.expectedScore, 'Programme history ends at its own recorded score');
  }
  assert.equal(history.fleet.at(-1).score, 74, 'The overall score remains independently recorded');
  assert.equal(history.programmes.find(program => program.id === 'backing').weeks.length, 1, 'Missing programme history is not padded with invented zeroes');

  // A second review for the same driver must remain visible in its own programme,
  // while the headline counts distinct drivers separately from sessions.
  await open('following');
  const repeatedDriver = await page.evaluate(() => {
    const source = sessions.find(record => record.categoryId === 'following' && record.state === 'manager_attention');
    sessions.push({ ...source, id: 'workspace-test-second-review', attentionReason: 'reminders_exhausted' });
    renderProgramsPage();
    const rows = sessions.filter(record => record.categoryId === 'following' && record.state === 'manager_attention' && (record.weeksAgo || 0) === 0);
    return { people: new Set(rows.map(record => record.person)).size, sessions: rows.length };
  });
  assert.equal(await workspace.locator('#program-activity-attention').getAttribute('data-attention-driver-count'), String(repeatedDriver.people));
  assert.equal(await workspace.locator('#program-activity-attention').getAttribute('data-attention-session-count'), String(repeatedDriver.sessions));
  await page.evaluate(() => sessions.splice(sessions.findIndex(record => record.id === 'workspace-test-second-review'), 1));

  // The programmes attention action opens the actual matching session; close restores context.
  await open('speeding', 4);
  const action = workspace.locator('#program-activity-attention [data-open-session]').first();
  const recordId = await action.getAttribute('data-open-session');
  await action.click();
  assert.equal(await page.evaluate(() => activeSessionId), recordId);
  assert.equal(await page.locator('#driver-drawer').isVisible(), true);
  await page.keyboard.press('Escape');
  await page.waitForFunction(() => !document.querySelector('#driver-drawer').open);
  assert.equal(await page.inputValue('#program-page-select'), 'speeding');
  assert.equal(await page.inputValue('#program-page-period'), '4');
  await page.waitForFunction(id => document.activeElement?.dataset.openSession === id, recordId);

  // A native details toggle is queued. A fast period/program change must retain
  // the visible state even when its toggle event has not reached the document.
  await open('following', 4);
  const recordedSample = await workspace.locator('#program-page-outcome-sample').textContent();
  await page.evaluate(() => {
    document.getElementById('program-page-outcomes').open = true;
    const period = document.getElementById('program-page-period');
    period.value = '8';
    period.dispatchEvent(new Event('change', { bubbles: true }));
  });
  assert.equal(await workspace.locator('#program-page-outcomes').getAttribute('open'), '', 'Immediate period change preserves an opened disclosure');
  assert.equal(await workspace.locator('#program-page-outcome-sample').textContent(), recordedSample, 'The undated sample remains independent of period');
  await page.evaluate(() => {
    document.getElementById('program-page-outcomes').open = false;
    const period = document.getElementById('program-page-period');
    period.value = '4';
    period.dispatchEvent(new Event('change', { bubbles: true }));
  });
  assert.equal(await workspace.locator('#program-page-outcomes').getAttribute('open'), null, 'Immediate period change also preserves a closed disclosure');
  await page.evaluate(() => {
    document.getElementById('program-page-outcomes').open = true;
    const program = document.getElementById('program-page-select');
    program.value = 'speeding';
    program.dispatchEvent(new Event('change', { bubbles: true }));
  });
  assert.equal(await workspace.locator('#program-page-outcomes').getAttribute('open'), null, 'Disclosure state belongs to its programme');
  await page.selectOption('#program-page-select', 'following');
  assert.equal(await workspace.locator('#program-page-outcomes').getAttribute('open'), '', 'Returning to the programme restores its recorded-outcome disclosure');
  await open('speeding', 4);

  // Mapping and automation tabs retain the period but omit misleading time controls.
  for (const tab of ['content', 'configuration', 'automation', 'activity']) {
    await workspace.locator('#program-tab-' + tab).click();
    assert.equal(await page.evaluate(() => coachingPeriod), 4);
    assert.equal(await workspace.locator('#program-page-period').isVisible(), tab === 'activity');
    assert.equal(await workspace.locator('#program-page-select').isVisible(), tab !== 'automation');
    assert.equal(await workspace.locator('[role="tab"][aria-selected="true"]').getAttribute('data-program-tab'), tab);
  }
  await workspace.locator('#program-tab-activity').focus();
  await page.keyboard.press('ArrowRight');
  await page.keyboard.press('Enter');
  assert.equal(await workspace.locator('#program-tab-content').getAttribute('aria-selected'), 'true', 'Tabs support keyboard activation');
  assert.equal(await page.locator('#drivers-panel-groups').isVisible(), false);

  const migrations = [
    ['/?analytics=activity#analytics', '#programs', 'activity'],
    ['/?analytics=outcomes#analytics', '#programs', 'activity'],
    ['/?analytics=groups#analytics', '#drivers', null],
    ['/#groups', '#drivers', null],
    ['/?program=speeding&programTab=overview&period=4#programs', '#programs', 'activity'],
    ['/#settings', '#programs', 'automation'],
    ['/?analytics=drivers#analytics', '#drivers', null],
    ['/#content', '#learning', null],
  ];
  for (const [url, hash, tab] of migrations) {
    await page.goto(base + url);
    assert.equal(new URL(page.url()).hash, hash, 'Old links migrate: ' + url);
    if (tab) assert.equal(await page.evaluate(() => programTab), tab);
  }
  await page.goto(base + '/?analytics=drivers&program=Following%20distance&driverStatus=attention#analytics');
  assert.equal(new URL(page.url()).hash, '#drivers');
  assert.equal(await page.evaluate(() => activeDriverCategory), 'following', 'Legacy programme names normalize to IDs');

  // Scope changes must not duplicate controls or lose retained group panels.
  for (const width of [1440, 390, 320]) {
    await page.setViewportSize({ width, height: 1000 });
    for (const tab of ['activity', 'content', 'configuration', 'automation']) {
      await open('following', 4, tab);
      await noOverflow(tab + ' at ' + width);
      const duplicateIds = await page.evaluate(() => {
        const seen = new Set();
        return [...document.querySelectorAll('[id]')].map(node => node.id).filter(id => seen.has(id) || !seen.add(id));
      });
      assert.deepEqual(duplicateIds, [], 'All DOM IDs remain unique on ' + tab);
    }
  }
  await page.setViewportSize({ width: 1440, height: 1000 });
  await open('following', 8);
  await page.evaluate(() => document.documentElement.style.fontSize = '200%');
  await noOverflow('Activity at 200% text');
  await workspace.locator('#program-page-outcomes > summary').click();
  await noOverflow('Disclosed outcomes at 200% text');
  await page.screenshot({ path: '/tmp/elevate-programmes-text-zoom.png', fullPage: true });
  assert.deepEqual(errors, []);
  console.log('Passed: six destinations including Driver app; scoped Activity/attention across all programmes and 1/4/8 weeks; session return/focus; four programme tabs and Drivers/Groups tabs; legacy routes; independent Drivers; responsive and enlarged text layouts.');
} finally { await browser.close(); }
