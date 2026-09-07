// Run against a locally served dist/ with Playwright available (see README).
import assert from 'node:assert/strict';
import { auditMetricReconciliation } from './metric-reconciliation.mjs';
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
  await page.locator('.primary-nav [data-view="programs"]').focus();
  assert.equal(await page.locator('#ui-tooltip').isVisible(), true, 'Collapsed navigation must explain its icons on keyboard focus');
  assert.equal(await page.locator('#ui-tooltip').textContent(), 'Programs');
  await page.keyboard.press('Escape');
  for (const view of ['coaching', 'inbox', 'outcomes', 'programs', 'library', 'settings']) {
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
      tabsInToolbar: Boolean(section.querySelector('.data-toolbar .view-tabs, .data-toolbar fieldset.segmented')),
      filterAfterSearch: Boolean(section.querySelector('.data-toolbar input[type="search"]').compareDocumentPosition(section.querySelector('[data-filter-sheet-trigger]')) & Node.DOCUMENT_POSITION_FOLLOWING)
    }));
    assert.deepEqual(layout, { searchInToolbar: true, searchInHeading: false, tabsInToolbar: true, filterAfterSearch: true }, view + ' must follow the design system');
  }
  assert.equal(await page.locator('#view-outcomes .page-heading [role="tablist"]').count(), 0);
  assert.equal(await page.locator('#view-outcomes .data-toolbar [role="tablist"]').count(), 1);
  assert.equal(await page.locator('.session-record').count(), await page.evaluate(() => sessions.filter(record => record.state === 'manager_attention').length + activeCandidates().length));
  await page.locator('[data-session-filter="all"]').locator('..').click();
  const allRecordCount = await page.evaluate(() => sessions.filter(sessionInPeriod).length + activeCandidates().length);
  assert.equal(await page.locator('.session-record').count(), Math.min(50, allRecordCount));
  assert.ok((await page.locator('.session-footer').textContent()).includes('of ' + allRecordCount + ' records'));
  const firstPageIds = await page.locator('.session-record').evaluateAll(rows => rows.map(row => row.dataset.recordId));
  await page.getByRole('button', {name:'Next',exact:true}).click();
  assert.equal(await page.locator('.session-record').count(), 50);
  const secondPageIds = await page.locator('.session-record').evaluateAll(rows => rows.map(row => row.dataset.recordId));
  assert.ok(secondPageIds.every(id => !firstPageIds.includes(id)), 'Next shows distinct source records');
  await page.getByRole('button', {name:'Previous',exact:true}).click();
  await page.locator('#view-inbox [data-filter-sheet-trigger]').click();
  await page.selectOption('#session-origin-filter', 'manual_override');
  assert.equal(await page.locator('.session-record').count(), await page.evaluate(() => sessions.filter(record => record.origin === 'manual_override' && sessionInPeriod(record)).length));
  await page.selectOption('#session-reason-filter', 'driver_reply');
  assert.equal(await page.locator('.session-record').count(), 0);
  await page.locator('#session-filters [data-clear-session-filters]').click();
  assert.equal(await page.locator('.session-record').count(), await page.evaluate(() => sessions.filter(record => record.state === 'manager_attention').length + activeCandidates().length));
  await page.keyboard.press('Escape');
  assert.equal(await page.locator('#view-inbox [data-filter-sheet-trigger]').getAttribute('aria-expanded'), 'false');
  assert.equal(await page.evaluate(() => document.activeElement.hasAttribute('data-filter-sheet-trigger')), true);
  await page.fill('#session-search', 'Rowan Hall');
  assert.equal(await page.locator('.session-record').count(), 1);
  await page.locator('.session-clips').first().hover();
  assert.equal(await page.locator('#ui-tooltip').isVisible(), true);
  await page.keyboard.press('Escape');
  assert.equal(await page.locator('#ui-tooltip').isVisible(), false);
  assert.equal(await page.inputValue('#session-search'), 'Rowan Hall', 'Tooltip Escape must preserve search');
  await page.locator('.session-record [data-open-session], .session-record[data-open-session]').first().click();
  assert.equal(await page.locator('#driver-drawer').getAttribute('aria-hidden'), 'false');
  await page.keyboard.press('Escape');
  await page.fill('#session-search', '');
  await page.locator('[data-session-filter="completed"]').focus();
  await page.keyboard.press('ArrowRight');
  assert.equal(await page.evaluate(() => document.activeElement.dataset.sessionFilter), 'archived');

  const readSessionOverview = () => page.locator('#sessions-kpis').evaluate(node => {
    const values = Object.fromEntries([...node.querySelectorAll('.kpi-tile')].map(tile => [tile.querySelector('.kpi-label').textContent, tile.querySelector('.kpi-value').textContent]));
    const meter = node.querySelector('[role="meter"]');
    return { values, completed: meter.getAttribute('aria-valuenow'), identified: meter.getAttribute('aria-valuemax') };
  });
  const sessionOverview = { values: { Identified: '151', 'In progress': '10', 'Needs review': '11', Completed: '130' }, completed: '130', identified: '151' };
  await page.goto(base + '/?session=archived#sessions');
  assert.deepEqual(await readSessionOverview(), sessionOverview, 'Archived rows must not redefine the weekly summary');
  for (const [weeks, all, completed, archived] of [[1,151,130,0],[4,161,140,10],[8,177,156,26]]) {
    await page.selectOption('#view-inbox [data-coaching-period]',String(weeks));
    for (const [filter,total] of [['all',all],['completed',completed],['archived',archived]]) {
      await page.locator('[data-session-filter="'+filter+'"]').locator('..').click();
      assert.equal(await page.locator('.session-record').count(),Math.min(50,total),filter+' rows honor '+weeks+'-week scope');
      assert.equal(await page.locator('.session-footer nav[aria-label="Session pages"]').isVisible(),total>50,'Pagination appears only when the filtered records need another page');
      if(total) assert.ok((await page.locator('.session-footer').textContent()).includes('of '+total+' records'),filter+' footer reconciles to period source');
      else assert.match(await page.locator('#view-inbox').textContent(),/Change the period to view earlier history/);
    }
    const scopedOverview=await readSessionOverview();
    assert.equal(scopedOverview.values.Identified,String(all),'Shared identified count uses the same period as All');
    assert.equal(scopedOverview.values.Completed,String(completed),'Reporting Completed includes archived history within the period');
  }
  await page.selectOption('#view-inbox [data-coaching-period]','1');
  await page.locator('#view-inbox [data-filter-sheet-trigger]').click();
  await page.selectOption('#session-origin-filter', 'manual_override');
  await page.keyboard.press('Escape');
  assert.deepEqual(await readSessionOverview(), sessionOverview, 'Manual origin must not redefine the automated weekly summary');
  await page.fill('#session-search', 'no matching driver');
  assert.equal(await page.locator('.session-record').count(), 0);
  assert.deepEqual(await readSessionOverview(), sessionOverview, 'Search must leave fleet summary counts intact');
  await page.fill('#session-search', '');
  for (const [reason, count] of [['driver_reply', 4], ['reminders_exhausted', 4], ['repeat_after_coaching', 3]]) {
    await page.locator('#view-inbox [data-filter-sheet-trigger]').click();
    await page.selectOption('#session-origin-filter', 'all');
    await page.selectOption('#session-reason-filter', reason);
    await page.keyboard.press('Escape');
    assert.equal(await page.locator('.session-record').count(), count, reason + ' filters its actual review records');
    assert.equal(new URL(page.url()).searchParams.get('session'), reason);
    assert.deepEqual(await readSessionOverview(), sessionOverview, 'Dataset filters leave the shared KPI scope unchanged');
  }

  await page.goto(base + '/#drivers');
  assert.equal(await page.locator('.driver-distribution-card').getAttribute('open'), null);
  await page.locator('#view-drivers [data-filter-sheet-trigger]').click();
  await page.selectOption('#driver-group-filter', 'Long haul · North');
  assert.ok(await page.locator('.directory-record:not(.directory-head)').count() < 14);
  await page.selectOption('#driver-sort', 'lowest');
  await page.locator('#driver-reset-filters').click();
  assert.equal(await page.inputValue('#driver-sort'), 'action');
  assert.equal(await page.locator('.directory-record:not(.directory-head)').count(), 14);
  await page.locator('#driver-filters .filter-sheet-actions [data-filter-sheet-close]').click();
  assert.equal(await page.locator('#view-drivers [data-filter-sheet-trigger]').getAttribute('aria-expanded'), 'false');

  const readDriverOverview = () => page.locator('#view-drivers').evaluate(node => {
    const kpis = Object.fromEntries([...node.querySelectorAll('#drivers-kpis .kpi-tile')].map(tile => [tile.querySelector('.kpi-label').textContent, tile.querySelector('.kpi-value').textContent]));
    return ({
    scope: node.querySelector('#driver-safety-scope').textContent,
    tiers: Array.from(node.querySelectorAll('#driver-tier-totals strong'), value => value.textContent),
    automated: kpis['Automated in progress'],
    manual: kpis['One-on-one in progress'],
    completed: kpis.Completed,
    improvedDriver: node.querySelector('#driver-improvement .overview-driver-name strong').textContent,
    improvedScore: node.querySelector('#driver-improvement .overview-driver-name .overview-scope').textContent,
    improvement: node.querySelector('#driver-improvement .overview-driver-gain').textContent
  }); });
  const driverOverview = {
    scope: 'Fleet snapshot · date unavailable', tiers: ['93', '471', '395', '65'],
    automated: '8', manual: '2', completed: '130',
    improvedDriver: 'Taylor Brooks', improvedScore: '71 → 78', improvement: '+7 pts'
  };
  assert.deepEqual(await readDriverOverview(), driverOverview);
  assert.match(await page.locator('#driver-improvement').getAttribute('aria-label'), /among 14 directory drivers/, 'Improvement must identify its available-directory scope');
  await page.goto(base + '/?q=no-match#drivers');
  assert.equal(await page.inputValue('#driver-search'), 'no-match', 'Driver links must restore the search field');
  assert.equal(await page.locator('.directory-record').count(), 0, 'Driver links must apply restored search before rendering rows');
  await page.goto(base + '/?driverStatus=outcome&group=Regional%20%C2%B7%20East&program=Speeding&q=no-match#drivers');
  await page.fill('#driver-search', 'no matching driver');
  assert.equal(await page.locator('.directory-record').count(), 0);
  await page.locator('.driver-distribution-card summary').click();
  await page.locator('#driver-tier-totals [data-driver-score-filter="risk"]').click();
  assert.equal(await page.locator('.directory-record').count(), 1, 'High risk must show the matching sample driver after clearing conflicting filters');
  assert.ok(Number(await page.locator('.directory-record .driver-score strong').textContent()) < 60);
  assert.equal(await page.inputValue('#driver-search'), '');
  assert.equal(await page.inputValue('#driver-group-filter'), 'all');
  assert.equal(await page.inputValue('#driver-category-filter'), 'all');
  assert.equal(await page.locator('[data-driver-filter="all"]').getAttribute('aria-pressed'), 'true');
  assert.equal(await page.locator('#driver-safety-mix [data-driver-score-filter="risk"]').getAttribute('aria-pressed'), 'true');
  assert.equal(await page.evaluate(() => document.activeElement?.closest('#driver-tier-totals')?.id), 'driver-tier-totals');
  assert.equal(await page.locator('.driver-distribution-card').evaluate(node => node.open), true);
  assert.deepEqual(await readDriverOverview(), driverOverview);
  await page.locator('#driver-distribution [data-driver-score-filter="80-89"]').click();
  assert.equal(await page.locator('.directory-record').count(), 1);
  assert.equal(await page.locator('.directory-record .driver-score strong').textContent(), '89');
  assert.equal(await page.evaluate(() => document.activeElement.dataset.driverScoreFilter), '80-89');
  await page.fill('#driver-search', 'no matching driver');
  await page.locator('#driver-improvement').click();
  assert.equal(await page.inputValue('#driver-search'), 'Taylor Brooks');
  assert.equal(await page.inputValue('#driver-group-filter'), 'all');
  assert.equal(await page.inputValue('#driver-category-filter'), 'all');
  assert.equal(await page.locator('.directory-record').count(), 1, 'Improved-driver shortcut must replace conflicting search and score filters');
  assert.equal(await page.locator('.directory-record .directory-person strong').textContent(), 'Taylor Brooks');
  assert.equal(await page.locator('#view-drivers [data-driver-score-filter][aria-pressed="true"]').count(), 0);
  assert.equal(await page.evaluate(() => document.activeElement.id), 'driver-improvement');
  assert.equal(await page.locator('.driver-distribution-card').evaluate(node => node.open), true);
  assert.deepEqual(await readDriverOverview(), driverOverview, 'Directory filters must never relabel sample counts as fleet totals');

  for (const [state, origin, count] of [['system_handling', 'automated', 8], ['system_handling', 'manual_override', 2], ['completed', 'all', 130]]) {
    const shortcut = state === 'completed' ? '#drivers-kpis [data-inbox-filter="completed"]' : '[data-overview-session-state="' + state + '"][data-overview-session-origin="' + origin + '"]';
    await page.locator(shortcut).click();
    assert.equal(await page.locator('.app-view.is-active').getAttribute('id'), 'view-inbox');
    assert.equal(await page.locator('.session-record').count(), Math.min(count, 50), 'Coaching count opens its matching paginated session list');
    assert.ok((await page.locator('.session-footer').textContent()).includes(count + ' records'));
    assert.equal(await page.inputValue('#session-origin-filter'), origin);
    assert.equal(await page.inputValue('#session-search'), '');
    assert.equal(new URL(page.url()).searchParams.get('session'), state);
    await page.goto(base + '/#drivers');
  }
  await page.locator('[data-overview-session-state="system_handling"][data-overview-session-origin="manual_override"]').click();
  await page.locator('.session-record [data-open-session], .session-record[data-open-session]').first().click();
  await page.locator('#driver-drawer [data-complete-session]').click();
  await page.waitForFunction(() => document.querySelector('#driver-drawer').getAttribute('aria-hidden') === 'true');
  await page.evaluate(() => setView('drivers'));
  assert.deepEqual(await readDriverOverview(), { ...driverOverview, manual: '1', completed: '131' }, 'Completing one-on-one coaching must update both lifecycle counts');

  await page.goto(base + '/#groups');
  assert.equal(await page.locator('.app-view.is-active').getAttribute('id'), 'view-outcomes', 'Groups retains its existing report container');
  assert.equal(await page.locator('[data-analytics-tab="groups"]').getAttribute('aria-selected'), 'true');
  assert.equal(await page.locator('#view-drivers').isVisible(), false);
  const groupAutomatedCounts = await page.evaluate(() => driverGroups.map(group => sessions.filter(session => sessionInPeriod(session) && session.origin === 'automated' && groupForPerson(session.person) === group).length).sort((a,b)=>b-a));
  assert.equal(groupAutomatedCounts.reduce((sum,count)=>sum+count,0),147,'Group workload counts automated sessions only');
  assert.deepEqual((await page.locator('#group-coaching-workload strong').allTextContents()).map(Number),groupAutomatedCounts,'Group workload reconciles to actual automated sessions by group');
  assert.equal(await page.locator('#group-workload-scope').textContent(),'Sessions');
  assert.equal(await page.locator('.overview-workload-panel .chart-legend').textContent(),'Automated');
  assert.match(await page.locator('#analytics-report-scope-detail').textContent(),/Week of Aug 31/,'The global reporting scope still dates the group workload');
  assert.deepEqual(await page.locator('#groups-overview .chart-footnote [class^="delta--"]').allTextContents(), ['↓ 4% fewer', '↑ 5% more'], 'Group movement follows the shared one-week span');
  assert.deepEqual(await page.locator('#groups-overview .chart-card:not(.overview-workload-panel) .chart-context').evaluateAll(nodes => nodes.map(node => node.textContent.split(' · Aug')[0])), ['Local delivery', 'Long haul · North']);
  for (const [container, group] of [['#group-coaching-workload', 'Regional · East'], ['#view-groups .group-comparison-card', 'Regional · East'], ['#groups-overview .chart-card >', 'Local delivery'], ['#view-groups .group-comparison-card', 'Local delivery']]) {
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
    for (const view of ['automation', 'sessions', 'programs', 'analytics', 'drivers', 'groups', 'content', 'settings']) {
      await page.goto(base + '/#' + view);
      assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false, view + ' overflows at ' + width);
    }
    await page.goto(base + '/#analytics');
    assert.equal(await page.locator('[data-analytics-tab="outcomes"]').getAttribute('aria-selected'), 'true', 'Analytics opens on Outcomes');
    assert.equal(await page.locator('#view-outcomes [data-queue-lens], #view-outcomes .sla-health-card, #view-outcomes [data-outcome-tab="cohort"]').count(), 0, 'Analytics must not repeat Groups or the review reasons inside its own tabs');
    await page.locator('[data-analytics-tab="activity"]').click();
    assert.ok(await page.locator('#coaching-queue .program-record').count() > 0, 'Program performance is the shared programs table');
    await page.locator('#coaching-queue .program-record [data-open-category], #coaching-queue .program-record[data-open-category]').first().click();
    assert.equal(await page.locator('#view-programs').isVisible(), true, 'Program links open the full Programs page');
    assert.equal(await page.locator('dialog:modal').count(),0,'Program review does not open a duplicate program drawer');
    assert.equal(await page.locator('#program-rate-content .category-weekly-chart').count(),1,'Program review retains its weekly graph inline');
    assert.equal(await page.locator('#program-page-outcomes').evaluate(node=>node.open),false,'Recorded outcome detail starts collapsed');
    await page.locator('#program-page-outcomes > summary').click();
    assert.equal(await page.locator('#program-page-outcome-sample table').isVisible(),true,'The disclosure retains the outcome facts on the page');
    await page.locator('#view-programs [data-back-program-page]').click();
    assert.equal(await page.locator('#analytics-activity').isVisible(),true,'Back restores the source report');
    await page.goto(base + '/?analytics=outcomes#analytics');
    for (const tab of ['category', 'driver']) {
      await page.locator('[data-outcome-tab="' + tab + '"]').locator('..').click();
      assert.equal(await page.locator('#outcome-table tbody tr').count(), await page.evaluate(tab => outcomeDetailViews[tab].rows.length, tab), 'Outcome table includes every record for the selected lens');
    }
  }
  await page.goto(base + '/#sessions');
  await page.locator('#view-inbox [data-filter-sheet-trigger]').click();
  await page.evaluate(() => { location.hash = 'drivers'; });
  await page.waitForFunction(() => document.querySelector('#view-outcomes').classList.contains('is-active') && !document.querySelector('#view-drivers').hidden);
  assert.equal(await page.evaluate(() => document.body.classList.contains('has-filter-sheet')), false);
  assert.equal(await page.evaluate(() => document.querySelector('#view-drivers').inert), false);
  await auditMetricReconciliation(page,base);
  assert.deepEqual(errors, []);
  console.log('Passed: asset integration, analytics-hosted drivers and groups, collapsible navigation and saved preferences, mobile navigation, session lifecycle/search/filters, fleet overview scopes and shortcuts, disclosure and opener focus, tooltip dismissal, keyboard navigation, drawers, driver filters/reset, analytics tabs, all-page responsive layouts, route recovery, and source metric reconciliation across periods, method totals, active subsets, pending flags, manual starts, weekly snapshots, and Settings previews.');
} finally {
  await browser.close();
}
