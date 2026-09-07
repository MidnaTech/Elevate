// Run against a locally served dist/ with Playwright available (see README).
import assert from 'node:assert/strict';
const { chromium } = await import(process.env.PLAYWRIGHT_MODULE || 'playwright');
const browser = await chromium.launch({ headless: true, channel: process.env.BROWSER_CHANNEL || 'chrome' });
const base = process.env.BASE_URL || 'http://localhost:5173';
const page = await browser.newPage({ viewport: { width: 1440, height: 1000 }, reducedMotion: 'reduce' });
const errors = [];
page.on('pageerror', error => errors.push(error.message));
page.on('response', response => { if (response.url().startsWith(base) && response.status() >= 400) errors.push(response.status() + ' ' + response.url()); });
try {
  await page.goto(base + '/#sessions');
  assert.equal(await page.locator('.app-view.is-active').getAttribute('id'), 'view-inbox');
  for (const asset of ['design-system.css', 'sessions.css', 'analytics-refinement.css', 'drivers-refinement.css', 'supporting-refinement.css']) {
    assert.equal(await page.locator('link[href*="' + asset + '"]').count(), 1, asset + ' must be loaded');
  }
  assert.equal(await page.locator('script[src*="overview.js"]').count(), 1, 'Shared overview behavior must be loaded');

  const sidebarToggle = page.locator('#sidebar-toggle');
  const sidebarState = () => page.locator('html').getAttribute('data-sidebar');
  const expectSidebarWidth = async width => {
    await page.waitForFunction(expected => Math.round(document.querySelector('.sidebar').getBoundingClientRect().width) === expected, width);
  };
  const workspaceWidth = () => page.locator('#main-content').evaluate(node => Math.round(node.getBoundingClientRect().width));
  assert.equal(await page.locator('.fleet-card, .account-row, .driver-preview-link, #open-driver-preview').count(), 0, 'Retired sidebar controls must be removed');
  assert.equal(await sidebarState(), 'expanded', 'Wide screens should start with navigation labels');
  assert.equal(await sidebarToggle.getAttribute('aria-expanded'), 'true');
  await expectSidebarWidth(224);
  await page.setViewportSize({ width: 1024, height: 1000 });
  await page.waitForFunction(() => document.documentElement.dataset.sidebar === 'collapsed');
  await expectSidebarWidth(72);
  assert.equal(await page.evaluate(() => localStorage.getItem('elevate.sidebar')), null, 'Responsive defaults must not overwrite a saved preference');
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.waitForFunction(() => document.documentElement.dataset.sidebar === 'expanded');
  await expectSidebarWidth(224);
  const expandedWorkspaceWidth = await workspaceWidth();
  await sidebarToggle.focus();
  await page.keyboard.press('Enter');
  assert.equal(await sidebarState(), 'collapsed');
  assert.equal(await sidebarToggle.getAttribute('aria-expanded'), 'false');
  assert.equal(await page.evaluate(() => document.activeElement.id), 'sidebar-toggle', 'Collapsing must preserve keyboard focus');
  await expectSidebarWidth(72);
  assert.equal(await workspaceWidth() - expandedWorkspaceWidth, 152, 'Collapsed navigation must give its freed width to content');
  assert.equal(await page.locator('.primary-nav [data-view="inbox"] > span').isVisible(), false);
  await page.locator('.primary-nav [data-view="inbox"]').hover();
  assert.equal(await page.locator('#ui-tooltip').isVisible(), true, 'Collapsed navigation must explain its icons on hover');
  assert.equal(await page.locator('#ui-tooltip').textContent(), 'Sessions');
  await page.keyboard.press('Escape');
  await page.locator('.primary-nav [data-view="outcomes"]').focus();
  assert.equal(await page.locator('#ui-tooltip').isVisible(), true, 'Collapsed navigation must explain its icons on keyboard focus');
  assert.equal(await page.locator('#ui-tooltip').textContent(), 'Analytics');
  await page.keyboard.press('Escape');
  for (const view of ['coaching', 'inbox', 'outcomes', 'library', 'settings']) {
    const destination = page.locator('.primary-nav [data-view="' + view + '"]');
    assert.ok(await destination.getAttribute('aria-label'), 'Every collapsed destination needs an accessible name');
    await destination.click();
    assert.equal(await page.locator('.app-view.is-active').getAttribute('id'), 'view-' + view);
    assert.equal(await destination.getAttribute('aria-current'), 'page');
  }
  await page.reload();
  assert.equal(await sidebarState(), 'collapsed', 'The chosen sidebar width must survive a reload');
  assert.equal(await sidebarToggle.getAttribute('aria-expanded'), 'false');
  assert.equal(await page.evaluate(() => localStorage.getItem('elevate.sidebar')), 'collapsed');
  await page.setViewportSize({ width: 1024, height: 1000 });
  await sidebarToggle.focus();
  await page.keyboard.press('Enter');
  assert.equal(await sidebarState(), 'expanded', 'Users must be able to expand navigation at medium widths');
  assert.equal(await sidebarToggle.getAttribute('aria-expanded'), 'true');
  assert.equal(await page.evaluate(() => document.activeElement.id), 'sidebar-toggle');
  await expectSidebarWidth(224);
  assert.equal(await page.locator('.primary-nav [data-view="inbox"] > span').isVisible(), true, 'Expanding must restore navigation labels');
  assert.equal(await page.evaluate(() => localStorage.getItem('elevate.sidebar')), 'expanded');
  await page.setViewportSize({ width: 768, height: 1000 });
  await page.goto(base + '/#drivers');
  assert.equal(await sidebarState(), 'expanded', 'Small desktop widths must respect an explicit expansion');
  await expectSidebarWidth(224);
  assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false, 'Expanded navigation must not cause page overflow at 768px');
  assert.equal(await page.locator('#main-content').evaluate(node => node.scrollWidth > node.clientWidth), false, 'Expanded navigation must leave driver content usable at 768px');
  await page.setViewportSize({ width: 390, height: 1000 });
  assert.equal(await sidebarToggle.isVisible(), false, 'Mobile uses the bottom navigation instead of the desktop toggle');
  assert.equal(await page.locator('.brand-lockup').isVisible(), false);
  await page.locator('#mobile-more-trigger').click();
  assert.equal(await page.locator('#mobile-more-dialog').isVisible(), true);
  await page.locator('[data-mobile-view="library"]').click();
  assert.equal(await page.locator('.app-view.is-active').getAttribute('id'), 'view-library');
  assert.equal(await page.locator('#mobile-more-dialog').isVisible(), false);
  assert.equal(await page.locator('#mobile-more-trigger').getAttribute('aria-expanded'), 'false');
  await page.setViewportSize({ width: 1024, height: 1000 });
  assert.equal(await sidebarState(), 'expanded', 'Returning from mobile must preserve the chosen desktop width');
  await expectSidebarWidth(224);
  assert.equal(await page.locator('.primary-nav [data-view="inbox"] > span').isVisible(), true);
  await page.evaluate(() => localStorage.removeItem('elevate.sidebar'));
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.goto(base + '/#sessions');

  for (const view of ['inbox', 'drivers']) {
    const layout = await page.locator('#view-' + view).evaluate(section => ({
      searchInToolbar: Boolean(section.querySelector('.data-toolbar input[type="search"]')),
      searchInHeading: Boolean(section.querySelector('.page-heading input[type="search"]')),
      tabsInToolbar: Boolean(section.querySelector('.data-toolbar .view-tabs')),
      filterAfterSearch: Boolean(section.querySelector('.data-toolbar input[type="search"]').compareDocumentPosition(section.querySelector('[data-filter-sheet-trigger]')) & Node.DOCUMENT_POSITION_FOLLOWING)
    }));
    assert.deepEqual(layout, { searchInToolbar: true, searchInHeading: false, tabsInToolbar: true, filterAfterSearch: true }, view + ' must follow the design system');
  }
  assert.equal(await page.locator('#view-outcomes .page-heading [role="tablist"]').count(), 0);
  assert.equal(await page.locator('#view-outcomes .data-toolbar [role="tablist"]').count(), 1);
  assert.equal(await page.locator('.session-row').count(), 17);
  await page.locator('[data-session-filter="all"]').click();
  assert.equal(await page.locator('.session-row').count(), 180);
  await page.locator('#view-inbox [data-filter-sheet-trigger]').click();
  await page.selectOption('#session-origin-filter', 'manual_override');
  assert.equal(await page.locator('.session-row').count(), 6);
  await page.selectOption('#session-reason-filter', 'driver_reply');
  assert.equal(await page.locator('.session-row').count(), 0);
  await page.locator('#session-filters [data-clear-session-filters]').click();
  assert.equal(await page.locator('.session-row').count(), 17);
  await page.keyboard.press('Escape');
  assert.equal(await page.locator('#view-inbox [data-filter-sheet-trigger]').getAttribute('aria-expanded'), 'false');
  assert.equal(await page.evaluate(() => document.activeElement.hasAttribute('data-filter-sheet-trigger')), true);
  await page.fill('#session-search', 'Rowan Hall');
  assert.equal(await page.locator('.session-row').count(), 1);
  await page.locator('.session-origin-icon').hover();
  assert.equal(await page.locator('#ui-tooltip').isVisible(), true);
  await page.keyboard.press('Escape');
  assert.equal(await page.locator('#ui-tooltip').isVisible(), false);
  assert.equal(await page.inputValue('#session-search'), 'Rowan Hall', 'Tooltip Escape must preserve search');
  await page.locator('.session-row').click();
  assert.equal(await page.locator('#driver-drawer').getAttribute('aria-hidden'), 'false');
  await page.keyboard.press('Escape');
  await page.fill('#session-search', '');
  await page.locator('[data-session-filter="completed"]').focus();
  await page.keyboard.press('ArrowRight');
  assert.equal(await page.evaluate(() => document.activeElement.dataset.sessionFilter), 'archived');

  const readSessionOverview = () => page.locator('#session-overview').evaluate(node => ({
    rate: node.querySelector('#session-overview-rate').textContent,
    completed: node.querySelector('#session-overview-completed').textContent,
    week: node.querySelector('#session-overview-week').textContent,
    review: node.querySelector('#session-overview-review-count').textContent,
    reasons: Array.from(node.querySelectorAll('[data-overview-session-reason] strong'), value => value.textContent)
  }));
  const sessionOverview = {
    rate: '84%', completed: '130 of 154 identified', week: 'Week of Aug 31',
    review: '17', reasons: ['3', '4', '4', '3', '3']
  };
  await page.goto(base + '/?session=archived#sessions');
  assert.deepEqual(await readSessionOverview(), sessionOverview, 'Archived rows must not redefine the weekly summary');
  await page.locator('#view-inbox [data-filter-sheet-trigger]').click();
  await page.selectOption('#session-origin-filter', 'manual_override');
  await page.keyboard.press('Escape');
  assert.deepEqual(await readSessionOverview(), sessionOverview, 'Manual origin must not redefine the automated weekly summary');
  await page.fill('#session-search', 'no matching driver');
  assert.equal(await page.locator('.session-row').count(), 0);
  assert.deepEqual(await readSessionOverview(), sessionOverview, 'Search must leave fleet summary counts intact');
  for (const [reason, count] of [['driver_reply', 4], ['reminders_exhausted', 4], ['repeat_after_coaching', 3], ['session_needed', 3]]) {
    const shortcut = page.locator('[data-overview-session-reason="' + reason + '"]');
    await shortcut.click();
    assert.equal(await page.locator('.session-row').count(), count, reason + ' must open its review queue');
    assert.equal(await page.inputValue('#session-search'), '', 'Overview shortcuts must clear conflicting search');
    assert.equal(await page.inputValue('#session-origin-filter'), 'all', 'Overview shortcuts must clear conflicting origin');
    assert.equal(await shortcut.getAttribute('aria-pressed'), 'true');
    assert.equal(await page.evaluate(() => document.activeElement.dataset.overviewSessionReason), reason, 'Filtering must retain shortcut focus');
    assert.equal(new URL(page.url()).searchParams.get('session'), reason);
    assert.deepEqual(await readSessionOverview(), sessionOverview);
  }

  await page.goto(base + '/#drivers');
  assert.equal(await page.locator('.driver-distribution-card').getAttribute('open'), null);
  await page.locator('#view-drivers [data-filter-sheet-trigger]').click();
  await page.selectOption('#driver-group-filter', 'Long haul · North');
  assert.ok(await page.locator('.directory-row:not(.directory-head)').count() < 14);
  await page.selectOption('#driver-sort', 'lowest');
  await page.locator('#driver-reset-filters').click();
  assert.equal(await page.inputValue('#driver-sort'), 'action');
  assert.equal(await page.locator('.directory-row:not(.directory-head)').count(), 14);
  await page.locator('#driver-filters .filter-sheet-actions [data-filter-sheet-close]').click();
  assert.equal(await page.locator('#view-drivers [data-filter-sheet-trigger]').getAttribute('aria-expanded'), 'false');

  const readDriverOverview = () => page.locator('#view-drivers .overview-band').evaluate(node => ({
    scope: node.querySelector('#driver-safety-scope').textContent,
    tiers: Array.from(node.querySelectorAll('#driver-tier-totals strong'), value => value.textContent),
    progress: node.querySelector('#driver-coaching-progress-count').textContent,
    automated: node.querySelector('#driver-coaching-automated').textContent,
    manual: node.querySelector('#driver-coaching-manual').textContent,
    completed: node.querySelector('#driver-coaching-completed').textContent,
    improvedDriver: node.querySelector('#driver-improvement .overview-driver-name strong').textContent,
    improvedScore: node.querySelector('#driver-improvement .overview-driver-name .overview-scope').textContent,
    improvement: node.querySelector('#driver-improvement .overview-driver-gain').textContent
  }));
  const driverOverview = {
    scope: 'All 1,024 drivers', tiers: ['93', '471', '395', '65'],
    progress: '10', automated: '8', manual: '2', completed: '130',
    improvedDriver: 'Taylor Brooks', improvedScore: '71 → 78 safety score', improvement: '+7 pts'
  };
  assert.deepEqual(await readDriverOverview(), driverOverview);
  assert.match(await page.locator('#driver-improvement').getAttribute('aria-label'), /among 14 directory drivers/, 'Improvement must identify its available-directory scope');
  await page.goto(base + '/?q=no-match#drivers');
  assert.equal(await page.inputValue('#driver-search'), 'no-match', 'Driver links must restore the search field');
  assert.equal(await page.locator('.directory-row').count(), 0, 'Driver links must apply restored search before rendering rows');
  await page.goto(base + '/?driverStatus=outcome&group=Regional%20%C2%B7%20East&program=Speeding&q=no-match#drivers');
  await page.fill('#driver-search', 'no matching driver');
  assert.equal(await page.locator('.directory-row').count(), 0);
  await page.locator('.driver-distribution-card summary').click();
  await page.locator('#driver-tier-totals [data-driver-score-filter="risk"]').click();
  assert.equal(await page.locator('.directory-row').count(), 1, 'High risk must show the matching sample driver after clearing conflicting filters');
  assert.ok(Number(await page.locator('.directory-row .driver-score strong').textContent()) < 60);
  assert.equal(await page.inputValue('#driver-search'), '');
  assert.equal(await page.inputValue('#driver-group-filter'), 'all');
  assert.equal(await page.inputValue('#driver-category-filter'), 'all');
  assert.equal(await page.locator('[data-driver-filter="all"]').getAttribute('aria-pressed'), 'true');
  assert.equal(await page.locator('#driver-safety-mix [data-driver-score-filter="risk"]').getAttribute('aria-pressed'), 'true');
  assert.equal(await page.evaluate(() => document.activeElement?.closest('#driver-tier-totals')?.id), 'driver-tier-totals');
  assert.equal(await page.locator('.driver-distribution-card').evaluate(node => node.open), true);
  assert.deepEqual(await readDriverOverview(), driverOverview);
  await page.locator('#driver-distribution [data-driver-score-filter="80-89"]').click();
  assert.equal(await page.locator('.directory-row').count(), 1);
  assert.equal(await page.locator('.directory-row .driver-score strong').textContent(), '89');
  assert.equal(await page.evaluate(() => document.activeElement.dataset.driverScoreFilter), '80-89');
  await page.fill('#driver-search', 'no matching driver');
  await page.locator('#driver-improvement').click();
  assert.equal(await page.inputValue('#driver-search'), 'Taylor Brooks');
  assert.equal(await page.inputValue('#driver-group-filter'), 'all');
  assert.equal(await page.inputValue('#driver-category-filter'), 'all');
  assert.equal(await page.locator('.directory-row').count(), 1, 'Improved-driver shortcut must replace conflicting search and score filters');
  assert.equal(await page.locator('.directory-row .directory-person strong').textContent(), 'Taylor Brooks');
  assert.equal(await page.locator('#view-drivers [data-driver-score-filter][aria-pressed="true"]').count(), 0);
  assert.equal(await page.evaluate(() => document.activeElement.id), 'driver-improvement');
  assert.equal(await page.locator('.driver-distribution-card').evaluate(node => node.open), true);
  assert.deepEqual(await readDriverOverview(), driverOverview, 'Directory filters must never relabel sample counts as fleet totals');

  for (const [state, origin, count] of [['system_handling', 'automated', 8], ['system_handling', 'manual_override', 2], ['completed', 'all', 130]]) {
    await page.locator('[data-overview-session-state="' + state + '"][data-overview-session-origin="' + origin + '"]').click();
    assert.equal(await page.locator('.app-view.is-active').getAttribute('id'), 'view-inbox');
    assert.equal(await page.locator('.session-row').count(), count, 'Coaching count must open its matching session list');
    assert.equal(await page.inputValue('#session-origin-filter'), origin);
    assert.equal(await page.inputValue('#session-search'), '');
    assert.equal(new URL(page.url()).searchParams.get('session'), state);
    await page.goto(base + '/#drivers');
  }
  await page.locator('[data-overview-session-state="system_handling"][data-overview-session-origin="manual_override"]').click();
  await page.locator('.session-row').first().click();
  await page.locator('#driver-drawer [data-complete-session]').click();
  await page.waitForFunction(() => document.querySelector('#driver-drawer').getAttribute('aria-hidden') === 'true');
  await page.goto(base + '/#drivers');
  assert.deepEqual(await readDriverOverview(), { ...driverOverview, progress: '9', manual: '1', completed: '131' }, 'Completing one-on-one coaching must update both lifecycle counts');

  await page.goto(base + '/#groups');
  assert.equal(await page.locator('.app-view.is-active').getAttribute('id'), 'view-outcomes', 'Groups is an Analytics tab');
  assert.equal(await page.locator('[data-analytics-tab="groups"]').getAttribute('aria-selected'), 'true');
  assert.equal(await page.locator('#view-drivers').isVisible(), false);
  assert.deepEqual(await page.locator('#group-coaching-workload strong').allTextContents(), ['39', '38', '38', '35'], 'Group workload sums to the 150 records started automatically');
  assert.equal(await page.locator('#group-workload-scope').textContent(), 'Started automatically · week of Aug 31');
  assert.deepEqual(await page.locator('#groups-overview .overview-value').allTextContents(), ['−4%', '+5%'], 'Group movement follows the shared one-week span');
  assert.deepEqual(await page.locator('#groups-overview .overview-person').allTextContents(), ['Local delivery', 'Long haul · North']);
  for (const [container, group] of [['#group-coaching-workload', 'Regional · East'], ['#view-groups .group-comparison-card', 'Regional · East'], ['#groups-overview >', 'Local delivery'], ['#view-groups .group-comparison-card', 'Local delivery']]) {
    const opener = container + ' [data-open-group="' + group + '"]';
    await page.locator(opener).click();
    assert.equal(await page.locator('#category-drawer').getAttribute('aria-hidden'), 'false');
    assert.equal(await page.locator('#category-title').textContent(), group);
    await page.waitForFunction(() => document.activeElement?.matches('#category-drawer [data-close-category]'));
    await page.keyboard.press('Escape');
    await page.waitForFunction(selector => document.activeElement?.matches(selector), opener);
    assert.equal(await page.locator('#category-drawer').getAttribute('aria-hidden'), 'true');
  }

  for (const width of [1440, 1024, 768, 390]) {
    await page.setViewportSize({ width, height: 1000 });
    for (const view of ['automation', 'sessions', 'analytics', 'drivers', 'groups', 'content', 'settings']) {
      await page.goto(base + '/#' + view);
      assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false, view + ' overflows at ' + width);
    }
    await page.goto(base + '/#analytics');
    assert.equal(await page.locator('[data-analytics-tab="outcomes"]').getAttribute('aria-selected'), 'true', 'Analytics opens on Outcomes');
    assert.equal(await page.locator('#view-outcomes [data-queue-lens], #view-outcomes .sla-health-card, #view-outcomes [data-outcome-tab="cohort"]').count(), 0, 'Analytics must not repeat Groups or the review reasons inside its own tabs');
    await page.locator('[data-analytics-tab="activity"]').click();
    assert.ok(await page.locator('#coaching-queue .queue-row').count() > 0, 'Program performance is the shared programs table');
    await page.locator('#coaching-queue .queue-row').first().click();
    assert.equal(await page.locator('#category-drawer').getAttribute('aria-hidden'), 'false', 'Program rows open the program drawer from Analytics');
    await page.keyboard.press('Escape');
    await page.waitForFunction(() => document.getElementById('category-drawer').getAttribute('aria-hidden') === 'true');
    await page.goto(base + '/?analytics=outcomes#analytics');
    for (const tab of ['category', 'driver']) {
      await page.locator('[data-outcome-tab="' + tab + '"]').click();
      assert.equal(await page.locator('#outcome-table tbody tr').count(), 3);
    }
  }
  await page.goto(base + '/#sessions');
  await page.locator('#view-inbox [data-filter-sheet-trigger]').click();
  await page.evaluate(() => { location.hash = 'drivers'; });
  await page.waitForFunction(() => document.querySelector('#view-outcomes').classList.contains('is-active') && !document.querySelector('#view-drivers').hidden);
  assert.equal(await page.evaluate(() => document.body.classList.contains('has-filter-sheet')), false);
  assert.equal(await page.evaluate(() => document.querySelector('#view-drivers').inert), false);
  assert.deepEqual(errors, []);
  console.log('Passed: asset integration, analytics-hosted drivers and groups, collapsible navigation and saved preferences, mobile navigation, session lifecycle/search/filters, fleet overview scopes and shortcuts, disclosure and opener focus, tooltip dismissal, keyboard navigation, drawers, driver filters/reset, analytics tabs, all-page responsive layouts, and route recovery.');
} finally {
  await browser.close();
}
