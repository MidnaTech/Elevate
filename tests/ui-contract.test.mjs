import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';
import vm from 'node:vm';

const html = await readFile(new URL('../dist/index.html', import.meta.url), 'utf8');
const css = await readFile(new URL('../dist/styles.css', import.meta.url), 'utf8');
const js = await readFile(new URL('../dist/app.js', import.meta.url), 'utf8');

function readDomainSnapshot() {
  const domainEnd = js.indexOf('const driverSafetyScores');
  assert.ok(domainEnd > 0, 'domain boundary should remain available to contract tests');
  const sandbox = {};
  vm.runInNewContext(`${js.slice(0, domainEnd)}\nglobalThis.__domain = { sessions, attentionItems };`, sandbox);
  return JSON.parse(JSON.stringify(sandbox.__domain));
}

test('primary navigation and global search are accessible', () => {
  assert.match(html, /class="skip-link"/);
  assert.match(html, /id="main-content"/);
  assert.match(html, /id="global-search-trigger"/);
  assert.match(html, /id="global-search-dialog"/);

  for (const view of ['coaching', 'inbox', 'outcomes', 'drivers', 'groups', 'library', 'settings']) {
    const navButton = new RegExp(`<button[^>]+data-view="${view}"[^>]+aria-label=`, 'i');
    assert.match(html, navButton, `${view} navigation needs an accessible name`);
  }

  assert.match(js, /aria-current/);
  assert.match(js, /global-search-input/);
});

test('session lifecycle is mutually exclusive and reconciles to all sessions', () => {
  assert.match(js, /manager_attention/);
  assert.match(js, /system_handling/);
  assert.match(js, /driver_reply/);
  assert.match(js, /reminders_exhausted/);
  assert.match(js, /repeat_after_coaching/);
  assert.match(js, /delivery_blocked/);

  const { sessions, attentionItems } = readDomainSnapshot();
  const count = (key, value) => sessions.filter((session) => session[key] === value).length;
  assert.equal(sessions.length, 177);
  assert.equal(new Set(sessions.map((session) => session.id)).size, 177, 'session ids must be unique');
  assert.deepEqual({
    manager_attention: count('state', 'manager_attention'),
    system_handling: count('state', 'system_handling'),
    completed: count('state', 'completed'),
    archived: count('state', 'archived'),
  }, { manager_attention: 14, system_handling: 7, completed: 130, archived: 26 });
  assert.deepEqual({
    automated: count('origin', 'automated'),
    manual_override: count('origin', 'manual_override'),
  }, { automated: 171, manual_override: 6 });
  assert.deepEqual(Object.fromEntries(['driver_reply', 'reminders_exhausted', 'repeat_after_coaching', 'delivery_blocked'].map((reason) => [reason, count('attentionReason', reason)])), {
    driver_reply: 4,
    reminders_exhausted: 4,
    repeat_after_coaching: 3,
    delivery_blocked: 3,
  });
  assert.equal(attentionItems.length, 14);
  attentionItems.forEach((item) => {
    assert.ok(sessions.some((session) => session.person === item.name && session.categoryId === item.categoryId && session.attentionReason === item.reason), `${item.id} must resolve to a session record`);
  });
});

test('production controls and responsive navigation contracts are present', () => {
  for (const id of ['settings-impact', 'settings-discard', 'settings-preview', 'settings-save']) {
    assert.match(html, new RegExp(`id="${id}"`));
  }

  assert.match(html, /id="mobile-more-trigger"/);
  assert.match(html, /id="mobile-more-dialog"/);
  assert.match(css, /prefers-reduced-motion/);
  assert.match(css, /\.skip-link/);
  assert.match(css, /\.global-search-dialog/);
  assert.match(css, /\.mobile-more-trigger/);
  assert.match(css, /Program rows become complete labelled cards/);
  assert.match(css, /Analytics rows retain every field as labelled cards/);
  assert.match(css, /--control-size:\s*44px/);
  assert.match(css, /\.activity-legend[^}]*flex-wrap:\s*wrap/);
  assert.match(html, /data-open-global-search/);
  assert.match(js, /content\?\.querySelector\('\[data-filter-sheet-close\]'\)\?\.focus/);
  assert.match(js, /filterDialog\?\.querySelectorAll/);
});

test('analytics separates throughput from outcomes', () => {
  assert.match(html, /Week of Aug 31/i);
  assert.match(html, /lower is safer/i);
  assert.match(js, /escalated/i);
  assert.doesNotMatch(js, /Weekly coaching activity and fleet safety score/);
});

test('canonical coaching terminology is visible', () => {
  assert.match(html, /Coaching programs/i);
  assert.match(html, />Program</i);
  assert.match(html, /Start one-on-one coaching/i);
  assert.doesNotMatch(html, /Quick training delivery/);
});

test('routing and interaction state use canonical, shareable values', () => {
  assert.match(js, /normalizeSessionOrigin/);
  assert.match(js, /manual_override/);
  assert.match(js, /url\.searchParams\.set\('record'/);
  assert.match(js, /url\.searchParams\.set\('q'/);
  assert.match(js, /routeHash === 'main-content'/);
  assert.match(js, /syncRadioGroups/);
});
