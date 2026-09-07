import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';
import vm from 'node:vm';

const html = await readFile(new URL('../dist/index.html', import.meta.url), 'utf8');
const css = await readFile(new URL('../dist/styles.css', import.meta.url), 'utf8');
const sharedCss = await readFile(new URL('../dist/design-system.css', import.meta.url), 'utf8');
const js = await readFile(new URL('../dist/app.js', import.meta.url), 'utf8');
const programsJs = await readFile(new URL('../dist/programs.js', import.meta.url), 'utf8');

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

  for (const view of ['coaching', 'inbox', 'outcomes', 'programs', 'library', 'settings']) {
    const navLink = new RegExp(`<a[^>]+data-view="${view}"[^>]+aria-label=`, 'i');
    assert.match(html, navLink, `${view} navigation needs an accessible name`);
  }
  assert.doesNotMatch(html, /<a[^>]+data-view="(?:drivers|groups)"/, 'Drivers and Groups belong inside Analytics, not the sidebar');

  assert.match(js, /aria-current/);
  assert.match(js, /global-search-input/);
});

test('session lifecycle is mutually exclusive and reconciles to all sessions', () => {
  assert.match(js, /manager_attention/);
  assert.match(js, /system_handling/);
  assert.match(js, /driver_reply/);
  assert.match(js, /reminders_exhausted/);
  assert.match(js, /repeat_after_coaching/);
  assert.doesNotMatch(js, /delivery_blocked|Blocked/, 'Delivery problems retry automatically; Blocked is not a state');

  const { sessions, attentionItems } = readDomainSnapshot();
  const count = (key, value) => sessions.filter((session) => session[key] === value).length;
  assert.equal(sessions.length, 177);
  assert.equal(new Set(sessions.map((session) => session.id)).size, 177, 'session ids must be unique');
  assert.deepEqual({
    manager_attention: count('state', 'manager_attention'),
    system_handling: count('state', 'system_handling'),
    completed: count('state', 'completed'),
    archived: count('state', 'archived'),
  }, { manager_attention: 11, system_handling: 10, completed: 130, archived: 26 });
  assert.deepEqual({
    automated: count('origin', 'automated'),
    manual_override: count('origin', 'manual_override'),
  }, { automated: 171, manual_override: 6 });
  assert.deepEqual(Object.fromEntries(['driver_reply', 'reminders_exhausted', 'repeat_after_coaching'].map((reason) => [reason, count('attentionReason', reason)])), {
    driver_reply: 4,
    reminders_exhausted: 4,
    repeat_after_coaching: 3,
  });
  assert.equal(attentionItems.length, 11);
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
  assert.match(sharedCss, /prefers-reduced-motion/);
  assert.match(css, /\.skip-link/);
  assert.match(css, /\.global-search-dialog/);
  assert.match(css, /\.mobile-more-trigger/);
  assert.match(html, /data-open-global-search/);
  assert.match(js, /content\?\.querySelector\('\[data-filter-sheet-close\]'\)\?\.focus/);
  assert.match(js, /filterDialog\?\.querySelectorAll/);
});

test('automation centre shares the analytics KPI strip and hero layout', () => {
  assert.match(html, /id="view-coaching"[\s\S]*?class="[^"]*kpi-strip/);
  for (const id of ['kpi-identified', 'kpi-in-progress', 'kpi-needs-review', 'kpi-completed', 'kpi-fleet-safety', 'kpi-event-rate']) assert.match(html, new RegExp(`id="${id}"`));
  assert.match(html, /id="automation-share"/);
  assert.doesNotMatch(html, /id="view-coaching"[\s\S]*?Is coaching working\?[\s\S]*?id="view-inbox"/, 'Outcomes narrative lives in Analytics');
  assert.doesNotMatch(html, /id="view-coaching"[\s\S]*?id="coaching-queue"[\s\S]*?id="view-inbox"/, 'Programs table lives in Analytics › Activity');
  assert.match(js, /renderHomeOverview/);
  assert.match(js, /function currentCycleCounts/, 'Every page reads one cycle summary from the ledger');
  assert.match(html, /id="kpi-identified"/);
  assert.doesNotMatch(html, /Reminders exhausted|Driver replies|Repeated events|Delivery blocked|Repeat after coaching/, 'One review vocabulary: Overdue, Repeated, Replied');
});

test('Analytics links to full-page Programs with inline outcome data', () => {
  assert.match(html, /data-view="programs"[^>]*href="#programs"/);
  assert.match(html, /data-view="outcomes"[^>]*href="#analytics"/);
  assert.match(html, /id="view-programs"/);
  assert.match(js, /function openProgramPage/);
  assert.doesNotMatch(html, /script[^>]+src="\.\/program-drawer\.js/, 'Program data lives on the page without a second program-modal renderer');
  assert.match(programsJs, /id="program-page-outcome-sample"/, 'Retained outcome sample facts are available within Programs');
  assert.doesNotMatch(programsJs, />Quick view<|aria-haspopup="dialog">Quick/, 'Program detail does not redirect users into a duplicate drawer');
  const tabs = [...html.matchAll(/data-analytics-tab="([a-z]+)"/g)].map((match) => match[1]);
  assert.deepEqual(tabs, ['outcomes', 'activity', 'drivers', 'groups']);
  assert.match(html, /id="analytics-outcomes-tab"[^>]*aria-selected="true"/);
  assert.match(html, /<section[^>]+id="view-drivers"/);
  assert.match(html, /<section[^>]+id="view-groups"/);
  assert.match(html, /id="analytics-activity"[\s\S]*?id="coaching-queue"/);
  assert.match(js, /let analyticsTab = 'outcomes'/);
  assert.match(html, /data-view="programs"[^>]*href="#programs"/, 'Programs remains available in primary navigation');
});

test('analytics separates throughput from outcomes', () => {
  assert.match(html, /Week of Aug 31/i);
  assert.match(html, /lower is safer/i);
  assert.match(js, /escalated/i);
  assert.match(js, /outcomeFor/, 'Outcome rates retain their exposure-aware source');
});

test('Programs begins at All programs with three detail sections', () => {
  assert.match(js, /let selectedProgramId = 'all'/, 'Opening Programs must not choose the first category implicitly');
  const definition = programsJs.match(/const programPageTabs = ([^\n]+);/);
  assert.ok(definition, 'Program section declarations are available');
  assert.deepEqual([...definition[1].matchAll(/\['([^']+)',/g)].map(match => match[1]), ['overview', 'content', 'configuration']);
});

test('canonical coaching terminology is visible', () => {
  assert.match(html, /Program performance/i);
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
