// Driver app checks: the standalone iOS app, then the Sessions-linked behaviour inside the manager workspace.
// Run against locally served dist/ (see README).
import assert from 'node:assert/strict';
const { chromium } = await import(process.env.PLAYWRIGHT_MODULE || 'playwright');
const browser = await chromium.launch({ headless: true, channel: process.env.BROWSER_CHANNEL || 'chrome' });
const base = process.env.BASE_URL || 'http://localhost:5173';
const page = await browser.newPage({ viewport: { width: 402, height: 874 }, reducedMotion: 'reduce' });
// Local UI validation never sends fixture data to font, map or CDN services.
// The approval review requires all external requests to be blocked before navigation.
await page.route('**/*', route => {
  const hostname = new URL(route.request().url()).hostname;
  return ['localhost', '127.0.0.1', '[::1]'].includes(hostname) ? route.continue() : route.abort();
});
const errors = [];
page.on('pageerror', error => errors.push(error.message));
page.on('response', response => { if (response.url().startsWith(base) && response.status() >= 400) errors.push(response.status() + ' ' + response.url()); });
const heading = () => page.locator('h1').first().textContent();
const priya = () => page.evaluate(() => {
  const session = sessions.find(item => item.id === 'priya-speeding');
  return { state: session.state, label: session.stateLabel, reason: session.attentionReason, last: session.messages.at(-1)?.text || '', history: session.history[0]?.[0] || '' };
});
try {
  // ── Standalone app on a phone-sized viewport (design fixture until Elevate publishes data) ──
  await page.goto(base + '/driver/index.html#home');
  await page.evaluate(() => localStorage.clear());
  await page.reload();
  assert.equal(await heading(), 'Morning, Dana');
  assert.equal(await page.locator('.statusbar').isVisible(), false, 'A real phone supplies its own status bar');
  assert.equal(await page.locator('.rail, .sketch-note, .rail-notes').count(), 0, 'No design chrome or navigation instructions');
  assert.equal(await page.locator('.score-num').first().textContent(), '82');
  await page.locator('.tab', { hasText: 'Coaching' }).click();
  assert.equal(await heading(), 'Coaching');
  assert.equal(new URL(page.url()).hash, '#sessions', 'Standalone routes are addressable');
  assert.equal(await page.locator('.session-card').count(), 1);
  await page.locator('.session-card').first().click();
  assert.match(await heading(), /Speed in a posted 40 zone/);
  assert.equal(await page.locator('.clip').count(), 1);
  assert.equal(await page.locator('.map').count(), 1);
  await page.locator('[data-act="ack"]').click();
  assert.match(await page.locator('.acked-card strong').textContent(), /Reviewed · Marcus K notified/);
  assert.equal(await page.locator('[data-act="ack"]').count(), 0, 'Acknowledging is one-way');
  await page.goBack();
  assert.equal(await heading(), 'Coaching', 'Browser back returns to the list');
  assert.equal(await page.locator('.session-card .chip').first().textContent(), 'Reviewed');
  await page.locator('.pill', { hasText: 'History' }).click();
  assert.equal(await page.locator('.session-card').count(), 3);

  await page.locator('.tab', { hasText: 'Messages' }).click();
  assert.equal(await heading(), 'Messages');
  assert.equal(await page.locator('.thread-card').count(), 4);
  assert.equal(await page.locator('.thread-card.is-unread').count(), 1);
  await page.locator('.thread-card').first().click();
  assert.equal(await page.locator('.tabbar').count(), 0, 'The thread hides the tab bar for the composer');
  const before = await page.locator('.msg').count();
  await page.locator('.ask').first().click();
  assert.equal(await page.locator('.msg').count(), before + 2, 'A quick ask adds the question and the answer');
  await page.fill('#draft', 'Watching the clip tonight.');
  await page.locator('.send').click();
  await page.locator('.msg.is-me .bubble', { hasText: 'Watching the clip tonight.' }).waitFor();
  await page.locator('.msg.is-coach .bubble', { hasText: 'Thursday check-in' }).waitFor({ timeout: 4000 });
  assert.equal(await page.inputValue('#draft'), '', 'Sending clears the draft');

  await page.locator('.back').click();
  await page.locator('.tab', { hasText: 'Learn' }).click();
  assert.equal(await heading(), 'Learn', 'Learn is a learning module, not a direct jump into one video');
  assert.equal(await page.locator('.lesson-row').count(), 1, 'The assigned lesson comes first');
  assert.equal(await page.locator('.lesson-lib').count(), 8, 'The whole Elevate lesson library is browsable, including the three delivered speeding course videos');
  await page.locator('.lesson-lib', { hasText: 'Eyes Forward' }).click();
  assert.equal(await page.locator('.player .title').textContent(), 'Eyes Forward');
  assert.equal(await page.locator('.player .eyebrow').textContent(), 'From the library');
  await page.locator('[data-act="complete-lesson"]').click();
  assert.equal(await page.locator('[data-act="complete-lesson"]').textContent(), 'Watched · back to Learn');
  await page.locator('[data-act="complete-lesson"]').click();
  assert.equal(await heading(), 'Learn');
  assert.equal(await page.locator('.lesson-lib', { hasText: 'Eyes Forward' }).locator('.delta--good').textContent(), 'Watched', 'Self-directed viewing is remembered locally');
  await page.locator('.lesson-row').click();
  assert.equal(await page.locator('.player').count(), 1, 'The assigned lesson opens the player');
  assert.equal(new URL(page.url()).hash, '#player');
  await page.locator('[data-act="toggle-play"]').click();
  assert.equal(await page.locator('[data-act="toggle-play"]').getAttribute('aria-pressed'), 'true');
  await page.locator('[data-act="complete-lesson"]').click();
  assert.equal(await page.locator('[data-act="complete-lesson"]').textContent(), 'Completed · back to session');
  await page.locator('[data-act="complete-lesson"]').click();
  assert.equal(await page.locator('.detail-head .chip').textContent(), 'Completed', 'Completing the lesson closes the session');

  await page.goto(base + '/driver/index.html#analytics');
  assert.equal(await heading(), 'Your score');
  assert.equal(await page.locator('.bh-row').count(), 5);
  await page.locator('.bh-row').first().click();
  assert.equal(await heading(), 'Following speed limits');
  assert.equal(await page.locator('.reminder').count(), 3);
  await page.goto(base + '/driver/index.html#scoring');
  assert.equal(await heading(), 'How your score works');
  assert.equal(await page.locator('.measured .row').count(), 5);
  await page.goto(base + '/driver/index.html#nudge');
  assert.equal(await page.locator('.nudge').count(), 1);
  await page.locator('[data-act="overlay"][data-overlay="posttrip"]').click();
  assert.equal(await page.locator('.sheet').count(), 1);
  await page.locator('.sheet [data-act="open-session"]').click();
  assert.match(await heading(), /Speed in a posted 40 zone/);

  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.goto(base + '/driver/index.html#home');
  assert.equal(await page.locator('.statusbar').isVisible(), true, 'Wide screens show the device frame');
  assert.equal(await page.locator('.device').evaluate(node => Math.round(node.getBoundingClientRect().width)), 402);

  // ── Inside the manager workspace: only the app, linked to the Sessions ledger ──
  await page.goto(base + '/?reset=1#driver-app');
  assert.equal(await page.locator('.app-view.is-active').getAttribute('id'), 'view-driver');
  assert.equal(await page.locator('.primary-nav [data-view="driver"]').isVisible(), true, 'The required sixth Driver app destination stays visible on desktop');
  assert.equal(await page.locator('.primary-nav [data-view="driver"]').getAttribute('aria-current'), 'page');
  assert.equal(new URL(page.url()).searchParams.get('reset'), null, 'The reset flag is consumed');
  assert.equal(await page.locator('#view-driver :is(p, ol, ul, select, .card)').count(), 0, 'The destination renders only the app');
  const frame = page.frameLocator('#driver-app-frame');
  await frame.locator('h1', { hasText: 'Morning, Priya' }).waitFor();
  assert.equal(await frame.locator('.score-num').first().textContent(), '58', 'The phone shows the Elevate score');
  assert.equal(await frame.locator('.stat-pair').count(), 0, 'Streaks stay hidden without trip exposure data');
  assert.equal((await priya()).state, 'manager_attention');
  // Imported programmes start without an approved course pool, so the driver sees the legacy lesson.
  assert.equal(await page.evaluate(() => elevateDriverLink.publish(true).drivers.flatMap(d => d.sessions).find(s => s.id === 'priya-speeding').lesson.title), 'Managing Speed', 'Without approved courses the mapped legacy lesson is assigned');
  // Approving the delivered speeding courses in Configuration swaps in the Level 1 video for the driver.
  await page.evaluate(() => { const policy = ProgramSetup.getPolicy('speeding'); policy.courseIds = ['speeding-course-1', 'speeding-course-2', 'speeding-course-3']; ProgramSetup.savePolicy(policy); elevateDriverLink.publish(true); });
  await frame.locator('h1', { hasText: 'Morning, Priya' }).waitFor();

  await frame.locator('.action-card [data-act="open-session"]').click();
  assert.equal(await frame.locator('.detail-head .chip').textContent(), 'Overdue');
  assert.equal(await frame.locator('.clip--pattern').count(), 1, 'Telematics-only evidence renders as a pattern, not a fake clip');
  assert.equal(await frame.locator('.assign-card .row-title').textContent(), 'Reset your speed', 'The approved Level 1 course video is assigned for the speeding programme');
  assert.equal(await frame.locator('[data-act="ack"]').count(), 0, 'An escalated one-on-one cannot be cleared by acknowledgement');
  await frame.locator('.assign-card').click();
  const assignedVideo = frame.locator('video.lesson-video');
  assert.equal(await assignedVideo.count(), 1, 'The assigned course opens the real video player');
  assert.match(await assignedVideo.getAttribute('src'), /\/media\/courses\/speeding\/speeding-level-1\.mp4$/);
  assert.equal(await assignedVideo.locator('track[kind="captions"]').count(), 1);
  await frame.locator('[data-act="complete-lesson"]').click();
  await page.waitForFunction(() => sessions.find(item => item.id === 'priya-speeding').lessonWatched === true);
  assert.equal((await priya()).state, 'manager_attention', 'Watching a lesson does not resolve a one-on-one review');
  await frame.locator('[data-act="complete-lesson"]').click();
  assert.equal(await frame.locator('.detail-head .chip').textContent(), 'Overdue');

  await frame.locator('[data-act="open-thread"]').click();
  await frame.locator('#draft').fill('Done — watched the lesson.');
  await frame.locator('.send').click();
  await page.waitForFunction(() => sessions.find(item => item.id === 'priya-speeding').messages.at(-1)?.author === 'driver');
  assert.equal((await priya()).last, 'Done — watched the lesson.');
  await page.evaluate(() => {
    const session = sessions.find(item => item.id === 'priya-speeding');
    session.messages.push({ author: 'manager', text: 'Nice work, see you Thursday.', time: 'Just now' });
    session.messages.push({ author: 'note', text: 'PRIVATE NOTE', time: 'Just now' });
  });
  await frame.locator('.msg.is-coach .bubble', { hasText: 'Nice work' }).waitFor({ timeout: 6000 });
  assert.equal(await frame.locator('.bubble', { hasText: 'PRIVATE NOTE' }).count(), 0, 'Private manager notes never reach the driver app');
  assert.equal(await page.evaluate(() => localStorage.getItem('elevate.driver-app.link').includes('PRIVATE NOTE')), false);

  await page.goto(base + '/?record=priya-speeding#sessions');
  await page.locator('#driver-drawer', { hasText: 'Done — watched the lesson.' }).waitFor();
  assert.equal((await priya()).state, 'manager_attention', 'Recorded review actions replay after a reload');

  await page.goto(base + '/?reset=1#driver-app');
  await page.locator('#driver-app-frame').waitFor();
  assert.equal(await page.evaluate(() => localStorage.getItem('elevate.driver-app.events')), null, 'Reset clears the recorded actions');
  assert.equal((await priya()).state, 'manager_attention');

  await page.setViewportSize({ width: 600, height: 900 });
  await page.goto(base + '/#automation');
  assert.equal(await page.locator('#mobile-more-trigger').isVisible(), true);
  assert.equal(await page.locator('.primary-nav [data-view="driver"]').isVisible(), false, 'Mobile places the Driver app in its More sheet');
  await page.locator('#mobile-more-trigger').click();
  assert.equal(await page.locator('#mobile-more-dialog [data-mobile-view="driver"]').isVisible(), true, 'The required Driver app menu entry remains available');
  await page.locator('#mobile-more-dialog [data-mobile-view="driver"]').click();
  assert.equal(await page.locator('.app-view.is-active').getAttribute('id'), 'view-driver', 'More opens the linked Driver app on mobile');
  assert.equal(await page.locator('#mobile-more-dialog').isVisible(), false);
  assert.equal(await page.locator('#mobile-more-trigger').getAttribute('aria-current'), 'page');
  assert.equal(new URL(page.url()).hash, '#driver-app');

  // Driver actions arriving while the manager is reviewing a programme or driver
  // update that visible page without a reload or a jump to the retired Analytics view.
  await page.goto(base + '/?program=all#programs');
  const progress = await page.evaluate(() => {
    const record = sessions.find(session => session.state === 'system_handling' && sessionDeliveryMode(session) === 'automated');
    const before = currentCycleCounts();
    elevateDriverLink.applyEvent({id:'early-ack',type:'session_acknowledged',sessionId:record.id});
    const afterEarly = record.state;
    elevateDriverLink.applyEvent({id:'watched',type:'lesson_watched',sessionId:record.id});
    const afterWatch = record.state;
    elevateDriverLink.applyEvent({id:'ack',type:'session_acknowledged',sessionId:record.id});
    return {afterEarly,afterWatch,afterAck:record.state,before,after:currentCycleCounts()};
  });
  assert.equal(progress.afterEarly, 'system_handling');
  assert.equal(progress.afterWatch, 'system_handling');
  assert.equal(progress.afterAck, 'completed');
  assert.equal(progress.after.completed, progress.before.completed + 1);
  assert.equal(new URL(page.url()).hash, '#programs');
  const handoff = await page.evaluate(() => {
    const record = sessions.find(session => session.state === 'system_handling' && sessionDeliveryMode(session) === 'automated');
    const count = sessions.length, origin = record.origin;
    elevateDriverLink.applyEvent({id:'driver-review',type:'review_requested',sessionId:record.id});
    const snapshot = elevateDriverLink.publish(true);
    return {count,after:sessions.length,origin,currentOrigin:record.origin,mode:record.deliveryMode,excluded:record.scoreReviewExcluded,scores:snapshot.drivers.flatMap(driver=>driver.programmes.map(program=>program.score))};
  });
  assert.equal(handoff.after,handoff.count,'Handoff keeps the same case');
  assert.equal(handoff.currentOrigin,handoff.origin,'Creation origin is immutable');
  assert.equal(handoff.mode,'one_on_one');
  assert.equal(handoff.excluded,true);
  assert.ok(handoff.scores.every(score=>score===null),'No status-derived score penalties');
  await page.goto(base + '/#drivers');
  const cameron = page.locator('.directory-record', { has: page.locator('[data-open-driver-profile="Cameron Davis"]') });
  assert.match(await cameron.textContent(), /In progress/);
  await page.evaluate(() => elevateDriverLink.applyEvent({ id: 'directory-live-reply', type: 'message_sent', sessionId: 'cameron-following-manual', text: 'Ready to discuss.' }));
  assert.equal(new URL(page.url()).hash, '#drivers');
  assert.match(await cameron.textContent(), /Replied/);

  assert.deepEqual(errors, []);
  console.log('Driver app checks passed');
} finally {
  await browser.close();
}
