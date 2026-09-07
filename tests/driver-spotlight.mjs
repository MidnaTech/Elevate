// Focused driver-portfolio checks. Run against locally served dist/ (see README).
import assert from 'node:assert/strict';
const { chromium } = await import(process.env.PLAYWRIGHT_MODULE || 'playwright');
const browser = await chromium.launch({ headless: true, channel: process.env.BROWSER_CHANNEL || 'chrome' });
const base = process.env.BASE_URL || 'http://localhost:5173';
const page = await browser.newPage({ viewport: { width: 1440, height: 1000 }, reducedMotion: 'reduce' });
// Local UI validation never sends fixture coordinates or other data to map/CDN services.
// The approval review requires all external requests to be blocked before navigation.
await page.route('**/*', route => {
  const hostname = new URL(route.request().url()).hostname;
  return ['localhost', '127.0.0.1', '[::1]'].includes(hostname) ? route.continue() : route.abort();
});
const errors = [];
page.on('pageerror', error => errors.push(error.message));
page.on('response', response => {
  if (response.url().startsWith(base) && response.status() >= 400) errors.push(response.status() + ' ' + response.url());
});
const drawer = page.locator('#driver-drawer');
const profile = page.locator('#driver-drawer.is-profile');
const rowFor = name => page.locator('.directory-record').filter({ has: page.locator('[data-open-driver-profile="' + name + '"]') });
const identityFor = name => rowFor(name).locator('.directory-person[data-open-driver-profile]');
const expectProfile = async name => {
  await page.waitForFunction(expected => {
    const drawer = document.getElementById('driver-drawer');
    return drawer.classList.contains('is-profile') && drawer.getAttribute('aria-hidden') === 'false' && document.getElementById('driver-drawer-title')?.textContent.trim() === expected;
  }, name);
  assert.equal(await drawer.evaluate(node => node.classList.contains('is-session')), false, 'Opening a driver must show their portfolio');
  assert.equal(new URL(page.url()).searchParams.get('driver'), name, 'Driver links must identify a driver independently of a session');
  assert.equal(new URL(page.url()).searchParams.get('record'), null);
  assert.equal(new URL(page.url()).hash, '#analytics');
  assert.equal(new URL(page.url()).searchParams.get('analytics'), 'drivers', 'Driver portfolios remain in the Analytics Drivers view');
};
const closeProfile = async () => {
  await profile.locator('[data-close-drawer]').click();
  await page.waitForFunction(() => document.getElementById('driver-drawer').getAttribute('aria-hidden') === 'true');
};
const revealAllSessions = async () => {
  const showAll = profile.locator('[data-profile-show-all]');
  if (await showAll.count() && /Show all/.test(await showAll.textContent())) await showAll.click();
};
const focusableEnds = () => drawer.evaluate(node => {
  const elements = [...node.querySelectorAll('button, [href], input, select, textarea, summary, [tabindex]')]
    .filter(element => element.tabIndex >= 0 && !element.disabled && !element.closest('[inert]') && element.getClientRects().length);
  elements.at(-1).focus();
  return elements.length;
});
const expectProfileCharts = async name => {
  const expected = await page.evaluate(driverName => ({
    driver: directory.find(driver => driver.name === driverName),
    activity: driverActivity[driverName] || null
  }), name);
  const score = expected.driver;
  if (Number.isFinite(score.safetyScore)) {
    const scoreTile = profile.locator('.profile-score');
    assert.equal(await scoreTile.locator('.kpi-value').textContent(), String(score.safetyScore));
    assert.match(await scoreTile.locator('.hint-trigger').getAttribute('data-tooltip'), new RegExp('Previous ' + (score.safetyScore - score.scoreChange)));
    assert.match(await scoreTile.locator('.hint-trigger').getAttribute('data-tooltip'), /dates unavailable/i);
    assert.equal(await scoreTile.locator('[role="meter"]').getAttribute('aria-valuemin'), '0');
    assert.equal(await scoreTile.locator('[role="meter"]').getAttribute('aria-valuemax'), '100');
    assert.equal(await scoreTile.locator('[role="meter"]').getAttribute('aria-valuenow'), String(score.safetyScore));
  }
  if (expected.activity) {
    const days = expected.activity.days;
    const total = key => days.reduce((sum, day) => sum + day[key], 0);
    assert.equal(await profile.locator('[data-week-metric="miles"] .kpi-value').textContent(), total('miles').toLocaleString('en-US'));
    assert.equal(await profile.locator('[data-week-metric="trips"] .kpi-value').textContent(), String(total('trips')));
    assert.equal((await profile.locator('[data-week-metric="days"] .kpi-value').textContent()).trim(), days.filter(day => day.miles > 0).length + ' of ' + days.length);
    assert.equal(await profile.locator('.chart-daily-datum').count(), days.length);
    const labels = await profile.locator('.chart-daily-datum').evaluateAll(nodes => nodes.map(node => node.getAttribute('aria-label')));
    assert.deepEqual(labels, days.map(day => day.date + ': ' + day.miles + ' miles, ' + day.trips + ' trips'));
    const heights = await profile.locator('.chart-daily-bar').evaluateAll(nodes => nodes.map(node => Number(node.getAttribute('height'))));
    const max = Math.max(...days.map(day => day.miles), 1);
    const maxHeight = Math.max(...heights);
    heights.forEach((height, index) => assert.ok(Math.abs(height / maxHeight - days[index].miles / max) <= 0.001, 'Daily bars must share an honest zero baseline and scale'));
    assert.equal(await profile.locator('.profile-week-head .profile-meta').textContent(), expected.activity.week);
    assert.match(await profile.locator('.profile-daily .chart-footnote').textContent(), /illustrative prototype observations/i);
    assert.equal(await profile.locator('.profile-daily .chart-summary').evaluate(node => node.open), false);
    assert.equal(await profile.locator('.profile-daily .chart-summary table tbody tr').count(), days.length);
  } else {
    assert.equal(await profile.locator('.chart-daily-datum').count(), 0);
    for (const key of ['miles', 'trips', 'days']) assert.equal(await profile.locator('[data-week-metric="' + key + '"] .kpi-value').textContent(), '—');
    assert.match(await profile.locator('.profile-week').textContent(), /No dated driving observations recorded/);
  }
};

try {
  await page.goto(base + '/?analytics=outcomes#analytics');
  await page.locator('[data-analytics-tab="drivers"]').click();
  assert.equal(await page.locator('#outcomes-title').textContent(), 'Analytics');
  assert.equal(await page.locator('[data-analytics-tab]:visible').count(), 4, 'Drivers keeps the Analytics view tabs visible');
  assert.equal(new URL(page.url()).hash, '#analytics');
  assert.equal(new URL(page.url()).searchParams.get('analytics'), 'drivers');
  const records = await page.evaluate(() => directory.map(({ name, safetyScore, scoreChange, group }) => ({ name, safetyScore, scoreChange, group })));
  assert.equal(records.length, 14, 'Keep every representative directory driver reachable');
  for (const { name } of records) {
    const row = rowFor(name);
    assert.equal(await row.count(), 1, name + ' must have one directory row');
    assert.equal(await identityFor(name).evaluate(node => node.tagName), 'BUTTON', 'Driver identity must work with keyboard and pointer');
    const action = identityFor(name);
    assert.ok((await action.getAttribute('aria-label'))?.includes(name), 'Identity action names its driver');
    assert.equal(await action.getAttribute('aria-controls'), 'driver-drawer');
    assert.equal(await row.locator('[data-open-attention-driver]').count(), 0, 'Directory actions must not silently open a session');
  }

  // The name opens the portfolio; the separate Action column chooses a real
  // coaching record or a prefilled create form without changing the ledger.
  assert.deepEqual(await page.locator('#driver-directory thead th').allTextContents(),['Driver','Elevate score','Top event','Last coached','Status','Action']);
  assert.equal(await page.locator('#driver-directory thead th').last().locator('button').count(),0,'Action is not a sortable data column');
  for(const {name} of records) {
    const action=rowFor(name).locator('td').last().locator('button');
    assert.equal(await action.count(),1,name+' has exactly one explicit coaching action');
    assert.match(await action.textContent(),/^(View|Create) session$/);
    assert.ok((await action.getAttribute('aria-label')).includes(name));
  }
  // A competing active record inserted ahead of the focused program must not
  // redirect View session to the wrong coaching topic. Fixtures reset on reload.
  await page.evaluate(()=>{
    const original=sessions.find(record=>record.id==='priya-speeding');
    sessions.unshift({...original,id:'qa-other-active-program',category:'Harsh braking',categoryId:'braking'});
    renderDirectory();
  });
  const activeAction=rowFor('Priya Singh').getByRole('button',{name:'View session for Priya Singh',exact:true});
  assert.equal(await activeAction.getAttribute('data-open-session'),'priya-speeding','Active coaching matching the displayed focus wins over another active record');
  await activeAction.focus();await page.keyboard.press('Enter');
  await page.waitForFunction(()=>activeSessionId==='priya-speeding'&&document.getElementById('driver-drawer').classList.contains('is-session'));
  assert.equal(await drawer.locator('[data-back-driver-profile]').count(),0,'A directory session action does not pretend the portfolio was opened');
  await drawer.locator('[data-close-drawer]').click();
  await page.waitForFunction(()=>document.activeElement?.getAttribute('data-open-session')==='priya-speeding');

  // Isolate historical-only and never-coached states without editing fixtures on disk.
  await page.evaluate(()=>{
    const source=sessions.find(record=>record.id==='priya-speeding');
    for(let index=sessions.length-1;index>=0;index--)if(sessions[index].person==='Priya Singh')sessions.splice(index,1);
    sessions.push({...source,id:'qa-older-history',state:'archived',weeksAgo:4},{...source,id:'qa-recent-history',state:'completed',weeksAgo:1});
    renderDirectory();
  });
  const historicalAction=rowFor('Priya Singh').getByRole('button',{name:'Create session for Priya Singh',exact:true});
  await historicalAction.click();
  assert.equal(await page.inputValue('#manual-driver-select'),'Priya Singh','A driver with only history can start fresh coaching');
  await page.locator('#training-dialog').getByRole('button',{name:'Cancel',exact:true}).click();
  await identityFor('Priya Singh').click();
  await expectProfile('Priya Singh');
  await profile.locator('[data-profile-coaching-view="past"]').click();
  assert.deepEqual((await profile.locator('[data-profile-session]').evaluateAll(rows=>rows.map(row=>row.dataset.profileSession))).sort(),['qa-older-history','qa-recent-history'],'Prior coaching remains accessible through the portfolio');
  await profile.locator('[data-open-session="qa-recent-history"]').click();
  await page.waitForFunction(()=>activeSessionId==='qa-recent-history');
  assert.equal(await drawer.locator('#reply-text').count(),0,'Completed history still opens the actual read-only session');
  await drawer.locator('[data-close-drawer]').click();
  await page.waitForFunction(()=>!document.getElementById('driver-drawer').open);
  await page.evaluate(()=>{
    for(let index=sessions.length-1;index>=0;index--)if(sessions[index].person==='Priya Singh')sessions.splice(index,1);
    renderDirectory();
  });
  const withoutHistory=await page.evaluate(()=>({ids:sessions.map(record=>record.id),flags:reviewCandidates.map(flag=>flag.started),program:categories.find(category=>category.name===directory.find(driver=>driver.name==='Priya Singh').focus).id}));
  const newAction=rowFor('Priya Singh').getByRole('button',{name:'Create session for Priya Singh',exact:true});
  await newAction.click();
  assert.equal(await page.inputValue('#manual-driver-select'),'Priya Singh');
  assert.equal(await page.inputValue('#manual-category-select'),withoutHistory.program);
  assert.equal(await page.evaluate(()=>pendingCandidateId),null,'An ordinary create flow cannot inherit a previously cancelled review flag');
  await page.locator('#training-dialog').getByRole('button',{name:'Cancel',exact:true}).click();
  await page.waitForFunction(()=>!document.getElementById('training-dialog').open);
  assert.deepEqual(await page.evaluate(()=>({ids:sessions.map(record=>record.id),flags:reviewCandidates.map(flag=>flag.started)})),{ids:withoutHistory.ids,flags:withoutHistory.flags},'Cancelling a never-coached driver leaves all data unchanged');

  for(const width of [1440,390]) {
    await page.setViewportSize({width,height:1000});await page.goto(base+'/#drivers');
    const alignment=await page.locator('#driver-directory .data-table').evaluate(table=>{
      const header=table.tHead.rows[0].cells[1],sort=header.querySelector('.table-sort');
      const rows=[...table.tBodies[0].rows].map(row=>{
        const score=row.querySelector('.driver-score'),value=score.querySelector('strong'),change=score.querySelector('small');
        return {scoreRight:score.getBoundingClientRect().right,valueRight:value.getBoundingClientRect().right,deltaRight:change.getBoundingClientRect().right};
      });
      return {numeric:header.classList.contains('num'),headerAlign:getComputedStyle(header).textAlign,sortRight:sort.getBoundingClientRect().right,rows,overflow:document.documentElement.scrollWidth>innerWidth};
    });
    assert.equal(alignment.numeric,true,'Elevate score uses the shared numeric header contract');
    assert.equal(alignment.headerAlign,'end');
    assert.equal(alignment.overflow,false,'Scores remain inside the local table scroll region at '+width);
    for(const edge of ['scoreRight','valueRight','deltaRight'])assert.ok(Math.max(...alignment.rows.map(row=>row[edge]))-Math.min(...alignment.rows.map(row=>row[edge]))<1,edge+' stays aligned for positive, negative and missing changes at '+width);
    assert.ok(Math.abs(alignment.sortRight-alignment.rows[0].scoreRight)<1,'The numeric header and score group share the same right edge at '+width);
    const scoreSort=page.locator('#driver-directory thead th.num .table-sort');
    await scoreSort.focus();await page.keyboard.press('Enter');
    assert.equal(await scoreSort.locator('..').getAttribute('aria-sort'),'ascending');
    const scores=await page.locator('.directory-record .driver-score strong').evaluateAll(nodes=>nodes.map(node=>Number(node.textContent)).filter(Number.isFinite));
    assert.deepEqual(scores,scores.slice().sort((a,b)=>a-b),'Numeric score sorting remains keyboard-operable');
  }
  await page.setViewportSize({width:1440,height:1000});await page.goto(base+'/#drivers');

  await identityFor('Priya Singh').focus();
  await page.keyboard.press('Enter');
  await expectProfile('Priya Singh');
  await closeProfile();
  // Native table cells retain their data; labelled controls open the portfolio.
  const columnNames = await page.locator('#view-drivers .data-table thead th').allTextContents();
  for (const label of ['Driver', 'Elevate score', 'Top event', 'Last coached', 'Status']) assert.ok(columnNames.some(text => text.includes(label)), label + ' column remains available');
  assert.equal(await rowFor('Priya Singh').locator('td').nth(3).count(), 1);
  await identityFor('Priya Singh').click();
  await expectProfile('Priya Singh');
  assert.equal(await page.locator('#app-shell').evaluate(node => node.inert), true, 'Background content must be inert while the drawer is open');
  const priyaScore = await profile.locator('.profile-score .hint-trigger').getAttribute('data-tooltip');
  assert.equal(await profile.locator('.profile-score .kpi-value').textContent(), '58', 'Show the directory safety score');
  assert.match(priyaScore, /prev(?:ious)?\s+67/i, 'Show the actual prior score, current minus the recorded change');
  await expectProfileCharts('Priya Singh');
  assert.deepEqual(await profile.locator('[data-profile-coaching-view]').allTextContents(), ['Current sessions', 'Past sessions'], 'Coaching has exactly the two requested scopes');
  assert.equal(await profile.locator('[data-profile-coaching-view="current"]').getAttribute('aria-selected'), 'true', 'Current sessions is the default scope');
  assert.equal(await profile.locator('.profile-coaching-list').count(), 1, 'Coaching uses one filtered list');
  assert.equal(await profile.locator('#profile-rule-breakdown').isVisible(), true, 'Rule breakdown is always visible');
  assert.match(await profile.locator('#profile-rule-breakdown').innerText(), /Recorded evidence · current sessions/);
  assert.equal(await profile.locator('#profile-coaching-filter, .profile-shell select').count(), 0, 'No dropdown filters in the portfolio');
  const sectionOrder = await profile.locator('.profile-scroll > section').evaluateAll(nodes => nodes.map(node => node.id || node.className));
  assert.deepEqual(sectionOrder.map(id => id.split(' ')[0]), ['profile-week', 'profile-rule-breakdown', 'profile-events', 'profile-coaching'], 'Sections follow This week → Rule breakdown → Recent exceptions → Coaching');
  assert.equal(await profile.locator('textarea').count(), 0, 'The portfolio must not duplicate the session conversation');
  const currentIds = await page.evaluate(() => sessions.filter(session => session.person === 'Priya Singh' && !['completed', 'archived'].includes(session.state)).map(session => session.id));
  const pastIds = await page.evaluate(() => sessions.filter(session => session.person === 'Priya Singh' && ['completed', 'archived'].includes(session.state)).map(session => session.id));
  assert.ok(currentIds.includes('priya-speeding'));
  assert.ok(pastIds.length > 0);
  await revealAllSessions();
  assert.deepEqual((await profile.locator('[data-profile-session]').evaluateAll(rows => rows.map(row => row.dataset.profileSession))).sort(), currentIds.sort(), 'Current sessions shows the in-progress and needs-review ledger records');
  await profile.locator('[data-profile-coaching-view="past"]').click();
  await revealAllSessions();
  assert.deepEqual((await profile.locator('[data-profile-session]').evaluateAll(rows => rows.map(row => row.dataset.profileSession))).sort(), pastIds.sort(), 'Past sessions shows completed and archived records');
  await profile.locator('[data-profile-coaching-view="current"]').click();
  const detail = profile.locator('[data-profile-session="priya-speeding"]');
  assert.match(await detail.textContent(), /Speeding/);
  assert.match(await detail.textContent(), /Due Sep 2/, 'A current row shows its program and due context on one line');
  assert.equal(await drawer.evaluate(node => node.classList.contains('is-profile')), true);
  const openSession = detail.getByRole('button', { name: /Open .* session for Priya Singh/i });
  await openSession.click();
  await page.waitForFunction(() => document.getElementById('driver-drawer').classList.contains('is-session'));
  assert.equal(new URL(page.url()).searchParams.get('record'), 'priya-speeding');
  assert.equal(await drawer.locator('textarea').count() > 0, true, 'An explicit Open session action must expose the full workflow');
  const replyDraft = 'Please walk me through what happened on that trip.';
  await page.fill('#reply-text', replyDraft);
  await drawer.locator('[data-back-driver-profile]').click();
  await expectProfile('Priya Singh');
  assert.equal(await profile.locator('[data-profile-coaching-view="current"]').getAttribute('aria-selected'), 'true', 'Back to driver retains the coaching scope');
  await openSession.click();
  assert.equal(await page.inputValue('#reply-text'), replyDraft, 'Returning through the profile must retain an unsent reply');
  assert.equal(await page.inputValue('#session-composer-mode'), 'reply');
  await page.selectOption('#session-composer-mode', 'note');
  const privateDraft = 'Ask about the route before the next shift.';
  await page.fill('#reply-text', privateDraft);
  await drawer.locator('[data-back-driver-profile]').click();
  await expectProfile('Priya Singh');
  await openSession.click();
  assert.equal(await page.inputValue('#reply-text'), privateDraft, 'Returning through the profile must retain an unsent private note');
  assert.equal(await page.inputValue('#session-composer-mode'), 'note', 'Returning to a note must not change it into a driver reply');
  await drawer.locator('[data-back-driver-profile]').click();
  await expectProfile('Priya Singh');

  assert.ok(await focusableEnds() > 2);
  await page.keyboard.press('Tab');
  assert.equal(await drawer.evaluate(node => {
    const first = [...node.querySelectorAll('button, [href], input, select, textarea, summary, [tabindex]')]
      .find(element => element.tabIndex >= 0 && !element.disabled && !element.closest('[inert]') && element.getClientRects().length);
    return document.activeElement === first;
  }), true, 'Tab from the final drawer control must wrap to its first control');
  await page.keyboard.press('Shift+Tab');
  assert.equal(await drawer.evaluate(node => node.contains(document.activeElement)), true, 'Shift+Tab must remain inside the modal');
  await page.keyboard.press('Escape');
  await page.waitForFunction(() => document.getElementById('driver-drawer').getAttribute('aria-hidden') === 'true');
  await page.waitForFunction(() => document.activeElement?.dataset.openDriverProfile === 'Priya Singh');
  assert.equal(await page.locator('#app-shell').evaluate(node => node.inert), false);
  assert.equal(new URL(page.url()).searchParams.get('driver'), null);

  const taylor = records.find(record => record.name === 'Taylor Brooks');
  const scopedUrl = new URL(base + '/#drivers');
  scopedUrl.searchParams.set('group', taylor.group);
  scopedUrl.searchParams.set('q', 'Taylor');
  await page.goto(scopedUrl.href);
  await identityFor('Taylor Brooks').click();
  await expectProfile('Taylor Brooks');
  const taylorScore = await profile.locator('.profile-score .hint-trigger').getAttribute('data-tooltip');
  assert.equal(await profile.locator('.profile-score .kpi-value').textContent(), '78');
  assert.match(taylorScore, /prev(?:ious)?\s+71/i, 'Taylor’s previous score must remain 71, not a conflicting attention-insight score');
  await expectProfileCharts('Taylor Brooks');
  const taylorSession = profile.locator('[data-profile-session="taylor-following"]');
  const openTaylorSession = taylorSession.getByRole('button', { name: /Open .* session for Taylor Brooks/ });
  await openTaylorSession.click();
  const removedEventId = await page.evaluate(() => [...sessionWorkspaceState(sessions.find(item => item.id === activeSessionId)).selectedEvents][0]);
  assert.ok(removedEventId, 'Taylor’s existing session includes associated evidence');
  await drawer.locator('[data-open-session-events]').first().click();
  const eventBrowser = page.locator('#session-event-browser');
  await eventBrowser.locator('[data-event-scope="driver"]').click();
  await eventBrowser.locator('[data-select-event="' + removedEventId + '"]').uncheck();
  await eventBrowser.locator('[data-use-event-selection]').click();
  await drawer.locator('[data-session-event="' + removedEventId + '"]').click();
  await page.fill('#reply-text', 'Review this following-distance event together.');
  await drawer.locator('[data-back-driver-profile]').click();
  await expectProfile('Taylor Brooks');
  await openTaylorSession.click();
  assert.equal(await page.evaluate(id => sessionWorkspaceState(sessions.find(item => item.id === activeSessionId)).selectedEvents.has(id), removedEventId), false, 'Returning to a session must not reattach evidence the manager removed');
  assert.equal(await page.evaluate(() => sessionWorkspaceState(sessions.find(item => item.id === activeSessionId)).eventId), removedEventId, 'Returning to the session must restore the selected evidence preview');
  assert.equal(await page.inputValue('#reply-text'), 'Review this following-distance event together.');
  await drawer.locator('[data-back-driver-profile]').click();
  await expectProfile('Taylor Brooks');
  const profileUrl = page.url();
  await page.reload();
  await expectProfile('Taylor Brooks');
  assert.equal(page.url(), profileUrl, 'Refreshing a driver deep link must preserve its route and directory context');
  assert.equal(await page.inputValue('#driver-search'), 'Taylor');
  assert.equal(await page.inputValue('#driver-group-filter'), taylor.group);
  await closeProfile();
  assert.equal(await page.inputValue('#driver-search'), 'Taylor');
  assert.equal(await page.inputValue('#driver-group-filter'), taylor.group);
  assert.equal(await page.locator('.directory-record').count(), 1, 'Closing the portfolio must retain the originating directory scope');

  await page.goto(base + '/?driver=Alex%20Morgan#drivers');
  await expectProfile('Alex Morgan');
  const exceptionTabs = profile.locator('[data-profile-event-view]');
  assert.deepEqual(await exceptionTabs.allTextContents(), ['Exceptions', 'Video'], 'Recent exceptions has exactly the two requested scopes');
  assert.equal(await profile.locator('[data-profile-event]').count(), 2, 'Exceptions includes both recorded video and pattern evidence');
  await profile.locator('[data-profile-event-view="videos"]').click();
  assert.equal(await profile.locator('[data-profile-event]').count(), 1, 'Videos excludes telematics patterns');
  await page.keyboard.press('ArrowLeft');
  await page.keyboard.press('Enter');
  assert.equal(await profile.locator('[data-profile-event-view="exceptions"]').getAttribute('aria-selected'), 'true', 'Exception tabs support keyboard selection');
  assert.equal(await profile.locator('[data-profile-event]').count(), 2);
  const pattern = profile.locator('[data-profile-event="event:alex-following-evidence-1"]');
  await pattern.click();
  assert.equal(await drawer.evaluate(node => node.classList.contains('is-profile')), true, 'Previewing an exception must not open its session');
  assert.equal(await profile.locator('[data-pattern-event]').count(), 1, 'A pattern stays event data without a video player');
  const ruleDetails = profile.locator('#profile-rule-breakdown');
  assert.deepEqual(await ruleDetails.locator('.profile-rule-row').evaluateAll(rows => rows.map(row => [row.querySelector('strong').textContent, Number(row.querySelector('b').textContent)])), [['Following distance', 2]], 'A multi-event pattern counts once as evidence, rather than inventing a violation total');
  const previewOpenSession = profile.locator('[data-profile-event-session="event:alex-following-evidence-1"]');
  await previewOpenSession.click();
  await page.waitForFunction(() => document.getElementById('driver-drawer').classList.contains('is-session'));
  await drawer.locator('[data-back-driver-profile]').click();
  await expectProfile('Alex Morgan');
  assert.equal(await pattern.getAttribute('aria-expanded'), 'true', 'Back restores the expanded exception');
  assert.equal(await page.evaluate(() => document.activeElement?.dataset.profileEventSession), 'event:alex-following-evidence-1', 'Back returns focus to the precise event action');
  const sourceFacts = await page.evaluate(() => {
    const source = sessions.find(session => session.id === 'alex-following');
    const destination = sessions.find(session => session.person === source.person && session.state === 'system_handling');
    const evidence = sessionEvidenceEvents(source)[0];
    const before = JSON.stringify(evidence.original);
    linkEvidenceEvents(destination, [evidence.id]);
    renderProfileEvents();
    return { before, after: JSON.stringify(evidence.original), id: evidence.id, links: profileDriverEvents(source.person).find(entry => entry.event.id === evidence.id).sessions.length };
  });
  assert.equal(sourceFacts.before, sourceFacts.after, 'Linking a second session preserves the original incident facts');
  assert.equal(sourceFacts.links, 2);
  assert.equal(await profile.locator('[data-profile-event="' + sourceFacts.id + '"]').count(), 1, 'An event linked to two sessions must appear once');
  await page.goto(base + '/?driver=Drew%20Thompson#drivers');
  await expectProfile('Drew Thompson');
  assert.match(await profile.locator('#profile-rule-breakdown .profile-rule-count').textContent(), /0 records/, 'Dismissed history must not count as a rule violation');
  assert.match(await profile.locator('[data-profile-event="event:drew-braking-archived-evidence-0"]').textContent(), /Dismissed/);
  await profile.locator('[data-profile-event-view="videos"]').click();
  assert.equal(await profile.locator('[data-profile-event]').count(), 1, 'Dismissed footage remains available with its disposition');
  await page.goto(base + '/?driver=Noah%20Reed#drivers');
  await expectProfile('Noah Reed');
  assert.match(await profile.locator('#profile-rule-breakdown .profile-rule-count').textContent(), /0 records/, 'Delivery failures must not become driving violations');
  await profile.locator('[data-profile-event-view="videos"]').click();
  assert.equal(await profile.locator('[data-profile-event-view="videos"]').getAttribute('aria-selected'), 'true', 'An empty video scope remains selectable');
  assert.match(await profile.locator('#profile-event-list').textContent(), /No videos recorded/);

  await page.goto(base + '/#drivers');
  const unscored = records.find(record => record.safetyScore === null);
  assert.ok(unscored, 'Fixture includes a driver without score data');
  await identityFor(unscored.name).click();
  await expectProfile(unscored.name);
  await expectProfileCharts(unscored.name);
  await profile.locator('.profile-score .hint-trigger').focus();
  assert.match(await page.locator('#ui-tooltip').textContent(), /unscored|unavailable|not available|no score|not enough data/i, 'Missing score has an accessible explanation in its info hint');
  await page.keyboard.press('Escape');
  assert.equal(await profile.locator('.profile-score').evaluate(node => /NaN|undefined|Infinity/.test(node.textContent)), false);
  await closeProfile();

  // Reopening during the old 220ms close animation must not let its timer hide the new modal.
  await identityFor('Priya Singh').click();
  await expectProfile('Priya Singh');
  await page.evaluate(() => {
    document.querySelector('#driver-drawer [data-close-drawer]').click();
    document.querySelector('.directory-person[data-open-driver-profile="Taylor Brooks"]').click();
  });
  await expectProfile('Taylor Brooks');
  await page.waitForTimeout(300);
  assert.equal(await page.locator('#drawer-backdrop').evaluate(node => node.hidden), false, 'A stale close timer must not hide the reopened drawer backdrop');
  assert.equal(await page.locator('#app-shell').evaluate(node => node.inert), true);
  assert.equal(await drawer.evaluate(node => node.contains(document.activeElement)), true, 'A stale close timer must not move focus behind the reopened drawer');
  await closeProfile();

  for (const width of [1024, 768, 390]) {
    await page.setViewportSize({ width, height: 900 });
    await page.goto(base + '/?driver=Priya%20Singh#drivers');
    await expectProfile('Priya Singh');
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false, 'Driver portfolio must not cause page overflow at ' + width);
    assert.equal(await drawer.evaluate(node => node.scrollWidth > node.clientWidth), false, 'Driver portfolio must fit its drawer at ' + width);
    await profile.locator('[data-profile-coaching-view="past"]').click();
    assert.equal(await drawer.evaluate(node => node.scrollWidth > node.clientWidth), false, 'Driver history must fit its drawer at ' + width);
  }
  // Nested record types must keep one workspace width instead of resizing by destination.
  for (const width of [1440, 1024, 768, 390]) {
    await page.setViewportSize({ width, height: 1000 });
    const expectedWidth = width <= 680 ? width : Math.min(1060, width - 84);
    const measuredWidths = [];
    for (const kind of ['profile', 'session', 'group']) {
      await page.goto(base + '/#drivers');
      await page.evaluate(destination => {
        if (destination === 'profile') openDriverProfile('Priya Singh');
        else if (destination === 'session') openSessionDrawer('priya-speeding', { type: 'sessions' });
        else if (destination === 'group') openGroupDrawer('Regional · East');
      }, kind);
      const target = page.locator(['profile', 'session'].includes(kind) ? '#driver-drawer' : '#category-drawer');
      assert.equal(await target.getAttribute('aria-hidden'), 'false', kind + ' must actually open before its width is checked');
      if (['profile', 'session'].includes(kind)) {
        assert.equal(await target.evaluate((node, variant) => node.classList.contains('is-' + variant), kind), true, 'The ' + kind + ' variant must be rendered');
      }
      const measurements = await target.evaluate(node => ({ width: node.getBoundingClientRect().width, fits: node.scrollWidth <= node.clientWidth }));
      assert.ok(Math.abs(measurements.width - expectedWidth) < 0.1, kind + ' must use the shared drawer width at ' + width);
      assert.equal(measurements.fits, true, kind + ' content must fit the shared drawer at ' + width);
      assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false, kind + ' must not cause page overflow at ' + width);
      measuredWidths.push(measurements.width);
    }
    assert.ok(Math.max(...measuredWidths) - Math.min(...measuredWidths) < 0.1, 'Every drawer must have the same width at ' + width);
  }
  assert.deepEqual(errors, []);
  console.log('Passed: all driver entry points, accurate weekly metrics and daily-mile charts, missing data, one two-scope coaching list, always-visible rule breakdown, deduplicated exception/video scopes and previews, source facts and dismissed-event exclusions, pending-review preview and cancellation, full sessions and preserved reply/note/evidence drafts, driver deep links, preserved filters, focus containment/restoration, stale-close protection, responsive portfolio layout, and matching widths without overflow for all three reachable drawer variants.');
} finally {
  await browser.close();
}
