// Session evidence and conversation workflows. Run against locally served dist/.
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
page.setDefaultTimeout(10000);
const errors = [];
page.on('pageerror', error => errors.push(error.message));
page.on('response', response => {
  if (response.url().startsWith(base) && response.status() >= 400) errors.push(response.status() + ' ' + response.url());
});
const drawer = page.locator('#driver-drawer');
const picker = page.locator('#session-event-browser');
const reply = page.locator('#reply-text');
// The explicit Action cell opens a session; the driver-name shortcut remains separate.
const sessionAction = id => page.locator('#view-inbox .session-record > td:last-child [data-open-session="' + id + '"]');
const session = () => page.evaluate(() => {
  const record = sessions.find(item => item.id === activeSessionId);
  const state = sessionWorkspaceState(record);
  return { id: record.id, person: record.person, state: record.state, selected: [...state.selectedEvents], eventId: state.eventId, clipId: state.clipId, mode: state.mode, drafts: state.drafts, messages: record.messages };
});
const openSession = async id => {
  await page.goto(base + '/?session=all&record=' + encodeURIComponent(id) + '#sessions');
  await page.waitForFunction(expected => activeSessionId === expected && document.getElementById('driver-drawer').classList.contains('is-session'), id);
};
const reopenWithoutReload = async id => {
  await drawer.locator('[data-close-drawer]').click();
  await page.waitForFunction(() => document.getElementById('driver-drawer').getAttribute('aria-hidden') === 'true');
  await page.locator('[data-session-filter="all"]').locator('..').click();
  await sessionAction(id).click();
  await page.waitForFunction(expected => activeSessionId === expected && document.getElementById('driver-drawer').classList.contains('is-session'), id);
};
const openPicker = async (scope = 'driver') => {
  await drawer.locator('[data-open-session-events]').first().click();
  await page.waitForFunction(() => document.getElementById('session-event-browser').open);
  await picker.locator('[data-event-scope="' + scope + '"]').click();
  await picker.locator('#session-event-search').fill('');
};
const cancelPicker = async () => {
  await picker.locator('[data-cancel-event-selection]').last().click();
  await page.waitForFunction(() => !document.getElementById('session-event-browser').open);
};
const applyPicker = async () => {
  await picker.locator('[data-use-event-selection]').click();
  await page.waitForFunction(() => !document.getElementById('session-event-browser').open);
};
const selectMode = mode => page.selectOption('#session-composer-mode', mode);
const assertDraft = async (text, start, end = start, sameNode = false) => {
  assert.equal(await reply.inputValue(), text, 'Browsing evidence must retain the unsent message');
  if (start !== undefined) assert.deepEqual(await reply.evaluate(node => [node.selectionStart, node.selectionEnd]), [start, end], 'Browsing must preserve the draft selection/caret');
  if (sameNode) assert.equal(await reply.evaluate(node => node === window.workspaceReplyElement), true, 'Evidence browsing should keep the composer mounted');
};
const rememberDraft = async text => {
  await reply.fill(text);
  await reply.evaluate(node => { window.workspaceReplyElement = node; node.setSelectionRange(7, 16); });
};

try {
  await openSession('rowan-distraction');
  assert.equal(await drawer.locator('#session-evidence').count(), 1);
  assert.equal(await drawer.locator('.case-summary-card, .session-rail, .attachment-chip-remove, .footage-strip').count(), 0, 'Old duplicated summary, metadata rail and attachment strips must be removed');
  assert.equal(await drawer.locator('#session-activity').count(), 1, 'Keep a single system activity disclosure');
  assert.equal(await drawer.locator('#session-activity').evaluate(node => node.open), false);
  assert.equal(await drawer.locator('#sw-messages .system-message').count(), 0, 'System events belong in Activity, not a second conversation timeline');
  const initial = await session();
  const initialEvents = await drawer.locator('[data-session-event]').evaluateAll(nodes => nodes.map(node => node.dataset.sessionEvent));
  assert.ok(initialEvents.length >= 2, 'Rowan has two linked incidents to review');
  assert.deepEqual(initial.selected.slice().sort(), initialEvents.slice().sort(), 'Linked incident clips should be selected for the first reply');
  assert.ok(await page.evaluate(() => attachedClipsFor(sessions.find(item => item.id === activeSessionId)).length) >= 2);
  // The shared evidence header and one recorded summary replace the duplicate program breakdown.
  assert.equal(await drawer.locator('.sw-evidence-pane > .drawer__header').count(), 1);
  assert.equal(await drawer.locator('.sw-why').count(), 1);
  assert.ok((await drawer.locator('.sw-why').innerText()).includes('Two video-confirmed'));
  assert.equal(await drawer.locator('[data-session-details], #session-details').count(), 0, 'A permanent metadata rail is not recreated');
  assert.match(await drawer.locator('#driver-drawer-title').innerText(), /Distracted driving/, 'The program names the session');
  assert.match(await drawer.locator('.sw-program').innerText(), /Rowan Hall/, 'The driver stays in the header context line');
  // Video rows open a viewer with the incident map beside the footage; the row toggles it closed again.
  assert.equal(await drawer.locator('#session-evidence .sw-viewer').count(), 0, 'The viewer stays closed until a video row is chosen');
  await drawer.locator('#session-evidence [data-session-event]').first().click();
  assert.equal(await drawer.locator('#session-evidence .sw-viewer').count(), 1);
  assert.equal(await drawer.locator('#session-evidence .sw-media-grid > :first-child').evaluate(node => node.classList.contains('sw-map')), true, 'The map sits on the left of the footage');
  assert.match(await drawer.locator('#session-evidence').innerText(), /illustrative footage|media unavailable|footage unavailable|video unavailable|preview unavailable/i, 'Missing media URLs must be communicated; any demo media must be explicitly illustrative');
  assert.match(await drawer.locator('#session-evidence .sw-map-coordinates').innerText(), /43\.70846, -79\.65362/, 'Recorded fixture coordinates are shown with the map');
  assert.match(await drawer.locator('#session-evidence .sw-map-link').getAttribute('href'), /google\.com\/maps\?q=43\.70846/);
  await drawer.locator('#session-evidence [data-session-event]').first().click();
  assert.equal(await drawer.locator('#session-evidence .sw-viewer').count(), 0, 'Choosing the open row again closes the viewer');

  const draft = 'Please explain the navigation interaction before the next shift.';
  await rememberDraft(draft);
  await drawer.locator('[data-session-event="' + initialEvents[1] + '"]').click();
  await assertDraft(draft, 7, 16, true);
  await selectMode('note');
  const privateDraft = 'Ask the route manager about the navigation setup.';
  await reply.fill(privateDraft);
  await drawer.locator('[data-session-event="' + initialEvents[0] + '"]').click();
  await assertDraft(privateDraft);
  await selectMode('reply');
  await assertDraft(draft);

  await rememberDraft(draft);
  await openPicker();
  await picker.locator('[data-use-event-selection]').focus();
  await page.keyboard.press('Tab');
  assert.equal(await picker.evaluate(node => node.contains(document.activeElement)), true, 'Tab must remain in the top event dialog');
  await page.keyboard.press('Shift+Tab');
  assert.equal(await picker.evaluate(node => node.contains(document.activeElement)), true, 'Reverse Tab must remain in the event dialog');
  const driverEventIds = await picker.locator('[data-preview-event]').evaluateAll(nodes => nodes.map(node => node.dataset.previewEvent));
  assert.ok(driverEventIds.length);
  assert.equal(await page.evaluate(ids => ids.every(id => evidenceEvent(id).person === sessions.find(item => item.id === activeSessionId).person), driverEventIds), true, 'This driver must not expose another driver’s incidents');
  const selectedBeforePreview = (await session()).selected;
  const availablePreview = picker.locator('[data-preview-event]').first();
  assert.ok(await availablePreview.count());
  await availablePreview.click();
  assert.deepEqual((await session()).selected, selectedBeforePreview, 'Previewing must not change draft selection');
  await picker.locator('#session-event-search').fill('no matching event xqz');
  assert.equal(await picker.locator('[data-preview-event]').count(), 0);
  assert.equal(await picker.locator('#session-event-search').evaluate(node => node === document.activeElement), true, 'Searching should retain input focus');
  await cancelPicker();
  assert.deepEqual((await session()).selected, selectedBeforePreview);
  await assertDraft(draft, 7, 16, true);
  assert.equal(await page.evaluate(() => document.activeElement.hasAttribute('data-open-session-events')), true);

  // Unassigned group fixture and source snapshots are derived from the actual event model.
  await openPicker('unassigned');
  const unassignedIds = await picker.locator('[data-select-event]').evaluateAll(nodes => nodes.map(node => node.dataset.selectEvent));
  assert.ok(unassignedIds.length);
  const group = await page.evaluate(ids => {
    for (const id of ids) {
      const clips = eventClips(id);
      if (clips.length > 1) return { id, clips: clips.map(clip => ({ ...clip })), original: evidenceEvent(id).original };
    }
    return null;
  }, unassignedIds);
  assert.ok(group, 'Provide an unassigned event with multiple camera clips so grouped selection can be verified');
  const otherCategory = await page.evaluate(ids => {
    const current = sessions.find(item => item.id === activeSessionId);
    const event = ids.map(evidenceEvent).find(item => item.categoryId !== current.categoryId && eventClips(item).length);
    return event && { id: event.id, original: event.original, clips: eventClips(event).map(clip => ({ ...clip })) };
  }, unassignedIds);
  assert.ok(otherCategory, 'The picker must support reviewing evidence from another event category');
  await picker.locator('[data-preview-event="' + group.id + '"]').click();
  assert.equal(await picker.locator('[data-select-event="' + group.id + '"]').isChecked(), false, 'Preview must remain independent of selection');
  assert.equal(await picker.locator('[data-sw-camera]').count(), group.clips.length, 'All camera angles should be accessible within the event preview');
  assert.match(await picker.locator('#sw-browser-preview').innerText(), /location unavailable|map unavailable|coordinates unavailable|location not available/i, 'No map pin may imply missing coordinates are known');
  await picker.locator('[data-sw-camera="' + group.clips[1].id + '"]').locator('..').click();
  assert.equal(await picker.locator('[data-media-clip]').getAttribute('data-media-clip'), group.clips[1].id);
  assert.deepEqual((await session()).selected, selectedBeforePreview, 'Switching camera angle must not attach evidence');
  await picker.locator('[data-select-event="' + group.id + '"]').check();
  await cancelPicker();
  assert.deepEqual((await session()).selected, selectedBeforePreview, 'Cancel must discard staged selections');
  await openPicker('unassigned');
  assert.equal(await picker.locator('[data-select-event="' + group.id + '"]').isChecked(), false);
  await picker.locator('[data-select-event="' + group.id + '"]').check();
  await picker.locator('[data-select-event="' + otherCategory.id + '"]').check();
  await applyPicker();
  assert.ok((await session()).selected.includes(group.id));
  assert.equal(await page.evaluate(id => evidenceEvent(id).person, group.id), null, 'Use selection stages evidence without assigning an unassigned incident');
  assert.deepEqual(await page.evaluate(ids => ids.map(id => ({ ...findClip(id) })), group.clips.map(clip => clip.id)), group.clips, 'Staging a group must not mutate any original clip facts');
  await assertDraft(draft, 7, 16, true);
  const expectedClips = await page.evaluate(() => attachedClipsFor(sessions.find(item => item.id === activeSessionId)).map(clip => clip.id));
  for (const clip of group.clips) assert.ok(expectedClips.includes(clip.id), 'One event checkbox must include every associated camera clip');

  await selectMode('note');
  await assertDraft(privateDraft);
  assert.equal(await drawer.locator('[data-open-session-events]:visible').count(), 0, 'Private notes must not imply reply evidence is being selected or shared');
  await drawer.locator('[data-send-reply]').click();
  assert.deepEqual(await page.evaluate(ids => ids.map(id => ({ ...findClip(id) })), group.clips.map(clip => clip.id)), group.clips, 'Saving a private note must not assign or alter reply evidence');
  assert.ok((await session()).selected.includes(group.id));
  await selectMode('reply');
  await assertDraft(draft);
  await reply.fill('');
  await drawer.locator('[data-send-reply]').click();
  const afterSend = await session();
  const sent = afterSend.messages.filter(message => message.author === 'manager').at(-1);
  assert.ok(sent, 'A reply consisting only of selected evidence must be sendable');
  assert.deepEqual(sent.clips.slice().sort(), expectedClips.slice().sort(), 'The sent reply must carry all selected camera clips once');
  assert.ok(sent.events.includes(group.id));
  assert.equal(afterSend.selected.length, 0, 'Sending must clear that reply’s selected evidence');
  assert.equal(afterSend.state, initial.state, 'Sending a manager reply must not resolve review or resume automation');
  const immutableKeys = ['id', 'eventId', 'categoryId', 'categoryName', 'eventType', 'source', 'time', 'location', 'vehicle', 'duration', 'video'];
  const afterClips = await page.evaluate(ids => ids.map(id => ({ ...findClip(id) })), group.clips.map(clip => clip.id));
  const sharedEvent = await page.evaluate(id => ({ person: evidenceEvent(id).person, sessionIds: evidenceEvent(id).sessionIds, original: evidenceEvent(id).original }), group.id);
  assert.equal(sharedEvent.person, 'Rowan Hall');
  assert.ok(sharedEvent.sessionIds.includes('rowan-distraction'));
  assert.deepEqual(sharedEvent.original, group.original, 'Assignment must retain the original event facts independently of its coaching association');
  for (const [index, clip] of afterClips.entries()) {
    for (const key of immutableKeys) assert.deepEqual(clip[key], group.clips[index][key], 'Sharing must preserve the recorded ' + key);
  }
  const otherClips = await page.evaluate(ids => ids.map(id => ({ ...findClip(id) })), otherCategory.clips.map(clip => clip.id));
  for (const [index, clip] of otherClips.entries()) {
    for (const key of immutableKeys) assert.deepEqual(clip[key], otherCategory.clips[index][key], 'Cross-category sharing must preserve source ' + key + ' instead of copying the coaching program');
  }
  await openPicker('unassigned');
  assert.equal(await picker.locator('[data-select-event="' + group.id + '"]').count(), 0, 'Sharing associates the unassigned event and removes it from that pool');
  await page.keyboard.press('Escape');
  await page.waitForFunction(() => !document.getElementById('session-event-browser').open);
  assert.equal(await drawer.getAttribute('aria-hidden'), 'false', 'Escape should dismiss only the event browser');
  await reopenWithoutReload('rowan-distraction');
  assert.equal((await session()).selected.length, 0, 'Reopening must not silently select already-shared footage again');
  assert.ok((await drawer.locator('[data-session-event]').evaluateAll(nodes => nodes.map(node => node.dataset.sessionEvent))).includes(group.id), 'Shared events remain linked in the evidence workspace');
  const attachments = drawer.locator('#sw-messages .sw-message-attachments').last();
  assert.match(await attachments.locator('summary').innerText(), /attached/, 'Shared evidence is summarised under the message');
  await attachments.locator('summary').click();
  await attachments.locator('.sw-shared-event[data-session-event="' + group.id + '"]').click();
  assert.equal(await drawer.locator('#session-evidence [data-session-event="' + group.id + '"]').getAttribute('aria-expanded'), 'true', 'A shared event reopens in the evidence viewer');
  assert.equal(await drawer.locator('#session-evidence .sw-viewer [data-sw-camera]').count(), group.clips.length);

  // Drafts belong to the session, not to whichever drawer was opened last.
  await reply.fill('Rowan draft remains here.');
  await drawer.locator('[data-close-drawer]').click();
  await page.locator('[data-session-filter="all"]').locator('..').click();
  await sessionAction('alex-following').click();
  assert.equal(await reply.inputValue(), '');
  await reply.fill('Alex has a separate draft.');
  await drawer.locator('[data-close-drawer]').click();
  await sessionAction('rowan-distraction').click();
  assert.equal(await reply.inputValue(), 'Rowan draft remains here.');

  await openSession('alex-following');
  const pattern = drawer.locator('[data-session-event]').filter({ hasText: 'Five-event pattern' });
  assert.equal(await pattern.count(), 1);
  await pattern.click();
  const patternCopy = await drawer.locator('#session-evidence').innerText();
  assert.match(patternCopy, /14 days|Aug 22/);
  assert.equal(await drawer.locator('#session-evidence video, #session-evidence [data-sw-play], #session-evidence [data-toggle-playback]').count(), 0, 'A multi-trip pattern must not be presented as a playable incident clip');
  assert.match(patternCopy, /pattern|event data/i);

  // Preserve existing lifecycle actions, including restore-to-completed semantics.
  await page.goto(base + '/#sessions');
  const manualId = await page.evaluate(() => sessions.find(item => item.origin === 'manual_override' && item.state === 'system_handling').id);
  await page.locator('[data-session-filter="all"]').locator('..').click();
  await sessionAction(manualId).click();
  await drawer.locator('[data-complete-session]').click();
  await sessionAction(manualId).click();
  assert.equal((await session()).state, 'completed');
  assert.equal(await reply.count(), 0);
  assert.equal(await drawer.locator('[data-open-session-events]:visible').count(), 0);
  const cycleBeforeArchive=await page.evaluate(()=>currentCycleCounts());
  await drawer.locator('[data-archive-session]').click();
  assert.deepEqual(await page.evaluate(()=>currentCycleCounts()),cycleBeforeArchive,'Archiving current completed work retains it in the same reporting period');
  await sessionAction(manualId).click();
  assert.equal((await session()).state, 'archived');
  assert.equal(await reply.count(), 0);
  await drawer.locator('[data-restore-session]').click();
  assert.equal(await page.evaluate(id => sessions.find(item => item.id === id).state, manualId), 'completed', 'Restoring an archive must not resume an active coaching session');

  // Restoring a historical archive retains its original observation period.
  await page.goto(base+'/?period=8&session=archived#sessions');
  const historical=await page.evaluate(()=>{const item=sessions.find(record=>record.state==='archived'&&sessionWeeksAgo(record)>0);return {id:item.id,age:sessionWeeksAgo(item)};});
  await sessionAction(historical.id).click();
  await drawer.locator('[data-restore-session]').click();
  assert.equal(await page.evaluate(id=>sessionWeeksAgo(sessions.find(record=>record.id===id)),historical.id),historical.age);
  await page.selectOption('#view-inbox [data-coaching-period]','1');
  assert.equal(await page.evaluate(()=>currentCycleCounts().completed),130,'Restoring past history does not add a current-week completion');
  assert.equal(await page.evaluate(()=>currentCycleCounts().identified),151);

  await page.goto(base + '/#sessions');
  const retryingId = await page.evaluate(() => sessions.find(item => item.eventType === 'Training delivery retrying').id);
  await page.locator('[data-session-filter="system_handling"]').locator('..').click();
  await sessionAction(retryingId).click();
  assert.equal(await drawer.locator('[data-relink-driver]').count(), 0, 'Delivery retries run automatically; there is no manual relink step');
  assert.match(await drawer.innerText(), /Automated|retr(y|ies|ying)/i);
  assert.equal(await reply.count(), 1, 'A retrying automated session still accepts coach messages');

  for (const width of [1440, 1024, 768, 390, 320]) {
    await page.setViewportSize({ width, height: 1000 });
    await openSession('rowan-distraction');
    const expectedWidth = width <= 680 ? width : Math.min(1060, width - 84);
    assert.ok(Math.abs((await drawer.boundingBox()).width - expectedWidth) < 2, 'Session drawer must use the shared width at ' + width + 'px');
    assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1), 'The page must not overflow horizontally at ' + width + 'px');
    assert.ok(await drawer.evaluate(node => node.scrollWidth <= node.clientWidth + 1), 'The session must fit its drawer at ' + width + 'px');
    await openPicker('unassigned');
    assert.ok(await picker.evaluate(node => node.scrollWidth <= node.clientWidth + 1), 'Event browser must not overflow at ' + width + 'px');
    const rect = await picker.boundingBox();
    assert.ok(rect.x >= -1 && rect.x + rect.width <= width + 1, 'Event browser must stay inside the viewport');
    await page.keyboard.press('Escape');
    await page.waitForFunction(() => !document.getElementById('session-event-browser').open);
  }
  assert.deepEqual(errors, [], 'Session interactions must not throw script or asset-loading errors');
  console.log('Passed: linked-event defaults, grouped footage staging/cancel/share, source preservation, private-note isolation, attachment-only replies, persistent drafts/caret, source summary and viewer toggles, Activity, lifecycle actions, missing-media honesty, modal dismissal, and shared responsive drawer widths.');
} catch (error) {
  if (errors.length) console.error('Browser errors:', errors);
  throw error;
} finally {
  await browser.close();
}
