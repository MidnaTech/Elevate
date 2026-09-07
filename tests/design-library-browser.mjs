// Design-library acceptance. Run against locally served dist/ with Playwright/Chrome.
import assert from 'node:assert/strict';
import { auditAllTableAlignment } from './table-alignment.mjs';
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
const fontRequests = [];
page.on('pageerror', error => errors.push(error.message));
page.on('request', request => { if (/fonts\.(googleapis|gstatic)\.com|\.(woff2?|ttf)(?:[?#]|$)/i.test(request.url())) fontRequests.push(request.url()); });
const colors = { ink:'rgb(24, 33, 47)', primary:'rgb(184, 74, 0)', hover:'rgb(150, 60, 0)', soft:'rgb(255, 242, 232)', surface:'rgb(255, 255, 255)', strong:'rgb(243, 245, 247)', disabled:'rgb(96, 110, 128)', focus:'rgb(113, 48, 0)', petrol:'rgb(35, 108, 114)' };
const style = (locator, prop) => locator.evaluate((node,key)=>getComputedStyle(node)[key],prop);
const scenes = [
 ['Automation Centre','/#automation'], ['Sessions','/#sessions'],
 ['Outcomes','/?analytics=outcomes#analytics'], ['Activity','/?analytics=activity#analytics'],
 ['Drivers','/?analytics=drivers#analytics'], ['Groups','/?analytics=groups#analytics'],
 ['Content','/#content'], ['Settings','/#settings']
];
const assertStrip = async (scope,name) => {
 const strips=scope.locator('.kpi-strip:visible');
 assert.equal(await strips.count(),1,name+' uses exactly one shared KPI strip');
 const strip=strips.first();
 const metrics=await strip.evaluate(node=>{
  const tiles=[...node.querySelectorAll('.kpi-tile')].filter(tile=>tile.getClientRects().length);
  return {tag:node.tagName,label:node.getAttribute('aria-label')||node.getAttribute('aria-labelledby'),wrap:getComputedStyle(node).flexWrap,scrollable:node.scrollWidth>node.clientWidth,tabIndex:node.tabIndex,tiles:tiles.map(tile=>({tag:tile.tagName,y:tile.getBoundingClientRect().y,width:tile.getBoundingClientRect().width,value:tile.querySelector('.kpi-value')?.textContent,color:tile.querySelector('.kpi-value')&&getComputedStyle(tile.querySelector('.kpi-value')).color})),overflow:document.documentElement.scrollWidth>innerWidth};
 });
 assert.equal(metrics.tag,'SECTION',name+' KPI strip is a labelled section');
 assert.ok(metrics.label,name+' KPI strip has a name');
 assert.equal(metrics.wrap,'nowrap');
 assert.ok(metrics.tiles.length>0,name+' has meaningful KPI tiles');
 assert.ok(metrics.tiles.every(tile=>tile.tag==='ARTICLE'));
 assert.ok(metrics.tiles.every(tile=>Math.abs(tile.y-metrics.tiles[0].y)<1),name+' never wraps into a second KPI row');
 assert.ok(metrics.tiles.every(tile=>tile.width>=175),name+' tiles preserve readable minimum width');
 assert.ok(metrics.tiles.every(tile=>tile.value?.trim()&&tile.color===colors.ink),name+' headline values are present and ink colored');
 if(metrics.scrollable) assert.ok(metrics.tabIndex>=0,name+' overflowing KPI strip is keyboard scrollable');
 assert.equal(metrics.overflow,false,name+' must not overflow the page');
};
const expectFocus = async locator => {
 await locator.focus();
 assert.equal(await style(locator,'outlineWidth'),'3px');
 assert.equal(await style(locator,'outlineOffset'),'2px');
 assert.equal(await style(locator,'outlineColor'),colors.focus);
};

try {
 for(const [name,path] of scenes) {
  await page.goto(base+path);await page.evaluate(()=>document.fonts.ready);
  await assertStrip(page.locator('.app-view.is-active'),name);
  assert.match(await page.locator('body').evaluate(node=>getComputedStyle(node).fontFamily),/^system-ui,/);
  assert.equal(await page.locator('html').evaluate(node=>getComputedStyle(node).fontSize),'16px','The text amendment does not shrink layout geometry');
  assert.equal(await page.locator('body').evaluate(node=>getComputedStyle(node).fontSize),'11.9px','Body text uses the requested 85% scale');

  for(const table of await page.locator('.data-table:visible').all()) {
   assert.equal(await table.evaluate(node=>node.tagName),'TABLE');
   assert.ok(await table.locator('thead th').count()>0,name+' table uses native column headers');
   assert.ok(await table.locator('tbody').count()>0);
   assert.equal(await table.locator('tbody tr[onclick], tbody tr[role="button"]').count(),0,'Rows retain table semantics; actions belong in cells');
  }
  for(const card of await page.locator('.card:visible,.kpi-strip:visible,.chart-card:visible').all()) assert.equal(await style(card,'boxShadow'),'none','Permanent content must not float');
 }
 await page.goto(base+'/#sessions');
 const nav=page.locator('.primary-nav [data-view]');
 assert.equal(await nav.count(),5);
 assert.ok((await nav.evaluateAll(nodes=>nodes.map(node=>({tag:node.tagName,href:node.getAttribute('href')})))).every(node=>node.tag==='A'&&node.href),'Navigation destinations are real links');
 assert.equal(await page.locator('.primary-nav [aria-current="page"]').count(),1);
 for(const selector of ['#session-search','#driver-search']) {
  if(selector==='#driver-search') await page.goto(base+'/?analytics=drivers#analytics');
  const input=page.locator(selector);
  const label=await input.evaluate(node=>[...node.labels].some(label=>label.getClientRects().length&&!label.classList.contains('sr-only')&&getComputedStyle(label).clipPath==='none'));
  assert.equal(label,true,selector+' has a persistent visible label');
  await input.fill('Priya');assert.equal(await style(input,'backgroundColor'),colors.surface,'Populated search stays neutral');
 }
 await page.goto(base+'/#settings');
 const radios=page.locator('fieldset.segmented input[type="radio"]');
 assert.ok(await radios.count()>=2,'Automation modes use native fieldset radios');
 assert.ok(await page.locator('fieldset.segmented legend').count()>0,'Radio groups have visible legends');

 await page.goto(base+'/?analytics=outcomes#analytics');
 const outcomePlot=page.locator('.before-after-chart').first();
 assert.equal(await outcomePlot.count(),1,'Outcomes renders the shared before/after plot');
 const pairs=outcomePlot.locator('.ba-row');
 assert.ok(await pairs.count()>0&&await pairs.count()<=4,'A plot keeps at most four visible behavior categories');
 for(const pair of await pairs.all()) {
  assert.deepEqual(await pair.locator('.ba-series').allTextContents(),['Before','After']);
  assert.equal(await style(pair.locator('.chart-bar--primary'),'fill'),colors.petrol,'After magnitude uses petrol regardless of direction');
  assert.equal(await style(pair.locator('.chart-bar--baseline'),'fill'),'rgb(125, 135, 149)');
  const geometry=await pair.evaluate(node=>{
   const before=node.querySelector('.chart-bar--baseline').getBBox(), after=node.querySelector('.chart-bar--primary').getBBox();
   const values=[...node.querySelectorAll('.ba-value')].map(value=>Number(value.textContent));
   return {before:{x:before.x,y:before.y,width:before.width,height:before.height},after:{x:after.x,y:after.y,width:after.width,height:after.height},values};
  });
  assert.ok(Math.abs(geometry.before.x-geometry.after.x)<0.1,'Paired bars share the same zero baseline');
  assert.ok(geometry.before.y<geometry.after.y,'Before stays above After');
  if(geometry.values.every(value=>value>0)) assert.ok(Math.abs(geometry.before.width/geometry.after.width-geometry.values[0]/geometry.values[1])<0.02,'Bar lengths encode the displayed values on one scale');
  assert.match(await pair.locator('.ba-change').textContent(),/↓|↑|=|Not enough data/,'Change has a sign or explicit unavailable state');
 }
 const outcomeCard=outcomePlot.locator('xpath=ancestor::*[contains(concat(" ",normalize-space(@class)," ")," chart-card ")][1]');
 assert.ok(await outcomeCard.locator('.chart-footnote').count()>0,'Chart scope includes source and exposure context');
 assert.equal(await outcomeCard.locator(':scope > .chart-footnote').count(),0,'Long chart source notes belong inside Summary and data');

 const outcomeSummary=outcomeCard.locator('details.chart-summary').first();
 assert.equal(await outcomeSummary.evaluate(node=>node.open),false);
 assert.match(await outcomeSummary.locator('summary').textContent(),/^Summary and data/);
 assert.ok(await outcomeSummary.locator('table.data-table tbody tr').count()>=await pairs.count(),'Equivalent chart data includes the plotted records');
 await outcomeSummary.locator('summary').click();
 for(const weeks of [4,8,1]) {
  await page.selectOption('#view-outcomes [data-coaching-period]',String(weeks));
  for(const sort of ['level','alpha','change']) {
   await page.locator('[data-outcome-sort="'+sort+'"]').locator('..').click();
   assert.equal(await outcomeSummary.evaluate(node=>node.open),true,'Sorting and period changes preserve the disclosure state');
   assert.equal(await outcomeSummary.locator('[data-chart-source-note]').count(),1,'A rerender retains exactly one source note');
   assert.equal(await outcomeSummary.locator('#outcome-chart-footnote').count(),1,'The median note retains its original identity inside the disclosure');
   assert.match(await outcomeSummary.locator('#outcome-chart-footnote').textContent(),/Median change/);
   assert.match(await outcomeSummary.locator('[data-chart-source-note]').textContent(),/Source: prototype event-rate observations/);
  }
  const cycle=await page.evaluate(()=>currentCycleCounts());
  assert.ok((await page.locator('#analytics-outcomes [data-analytics-completion-hint]').getAttribute('data-tooltip')).includes(cycle.completed+' of '+cycle.identified),'Completion help follows the current reporting period');
  const exposure=page.locator('#analytics-outcomes .kpi-tile').filter({has:page.locator('.kpi-label').filter({hasText:'Exposure'})});
  assert.ok((await exposure.locator('.hint-trigger').getAttribute('data-tooltip')).includes(weeks+' week'),'Exposure help refreshes its period without losing the original caption node');
 }
 await page.goto(base+'/?analytics=activity#analytics');
 const weekly=page.locator('.weekly-activity-chart').first();
 assert.equal(await weekly.locator('.chart-score-casing').getAttribute('d'),await weekly.locator('.chart-score-line').getAttribute('d'),'White casing follows the exact score path');
 assert.equal(await style(weekly.locator('.chart-score-casing'),'stroke'),colors.surface);
 assert.equal(await style(weekly.locator('.chart-score-line'),'stroke'),'rgb(54, 65, 82)');
 assert.match(await weekly.locator('desc').textContent(),/fixed from zero to 100/);
 assert.deepEqual(await weekly.locator('.activity-axis-title').allTextContents(),['Sessions','Safety score / 100']);
 const weeklyData=await page.evaluate(()=>weeklyCoachingActivity.slice(-coachingPeriod));
 const descriptions=await weekly.locator('.weekly-bars [role="img"]').evaluateAll(nodes=>nodes.map(node=>node.getAttribute('aria-label')));
 for(const week of weeklyData) {
  assert.ok(descriptions.some(text=>text.includes(week.label)&&text.includes(week.automated+' in-progress sessions')));
  assert.ok(descriptions.some(text=>text.includes(week.label)&&text.includes(week.oneToOne+' in-progress sessions')));
 }


 assert.equal(await page.locator('#program-pivot, .program-pivot-card, .analytics-activity-grid, #queue-columns').count(),0,'Activity has one consolidated program table');
 const programTable=page.locator('#coaching-queue .data-table');
 assert.equal(await programTable.count(),1);
 assert.deepEqual(await programTable.locator('thead th').allTextContents(),['Program','Drivers','Records','Automated in progress','One-on-one in progress','Needs review','Completed','Events / 1,000 trips','Change']);
 const chartBounds=await page.locator('.analytics-activity-chart').boundingBox();
 const tableBounds=await page.locator('.analytics-queue-section').boundingBox();
 assert.ok(Math.abs(chartBounds.width-tableBounds.width)<1,'Weekly activity spans the same full width as the combined program table');
 assert.ok(chartBounds.y+chartBounds.height<=tableBounds.y,'The weekly chart stays above the combined table');
 for(const [weeks,total] of [[1,154],[4,164],[8,180]]) {
  await page.selectOption('#view-outcomes [data-coaching-period]',String(weeks));
  assert.equal(await programTable.locator('tbody tr').count(),9);
  const values=await programTable.locator('tbody tr td:nth-child(3)').evaluateAll(nodes=>nodes.map(node=>Number(node.textContent.replace(/,/g,''))));
  assert.equal(values.reduce((sum,value)=>sum+value,0),total,'Combined program records reconcile to the '+weeks+'-week scope');
 }
 const recordsHeading=programTable.locator('thead th').nth(2);
 await recordsHeading.locator('button').click();
 const recordValues=await programTable.locator('tbody tr td:nth-child(3)').evaluateAll(nodes=>nodes.map(node=>Number(node.textContent.replace(/,/g,''))));
 const ascending=await recordsHeading.getAttribute('aria-sort')==='ascending';
 assert.deepEqual(recordValues,recordValues.slice().sort((a,b)=>ascending?a-b:b-a),'The combined table uses working shared numeric sorting');
 for(const width of [1600,1920]) {
  await page.setViewportSize({width,height:1000});
  await page.waitForFunction(()=>{const plot=document.querySelector('.analytics-activity-chart .chart-plot');const svg=plot?.querySelector('.weekly-activity-chart');return svg&&Math.abs(svg.getBoundingClientRect().width-Math.max(440,plot.clientWidth))<1;});
  const fill=await page.locator('.analytics-activity-chart .chart-plot').evaluate(plot=>({plot:plot.clientWidth,svg:plot.querySelector('.weekly-activity-chart').getBoundingClientRect().width}));
  assert.ok(Math.abs(fill.svg-Math.max(440,fill.plot))<1,'Weekly SVG fills its plot at '+width+' instead of stopping at a fixed maximum');
 }
 await page.setViewportSize({width:1440,height:1000});


 await page.goto(base+'/#automation');
 for(const mark of await page.locator('.attention-dot, .attention-bar > i').all()) assert.equal(await style(mark,'backgroundColor'),colors.petrol,'Attention categories use a uniform neutral data colour');
 // A temporary shared specimen verifies states without mutating product settings.
 await page.evaluate(()=>{
  const specimen=document.createElement('section');specimen.id='design-specimen';
  specimen.style.cssText='position:fixed;inset:20px;z-index:20000;background:white;padding:24px;overflow:auto';
  specimen.innerHTML='<button class="button button--primary" id="spec-primary">Save rules</button><button class="button button--secondary" id="spec-secondary">Cancel</button><button class="button button--primary" id="spec-disabled" disabled>Unavailable</button><button class="button button--primary" id="spec-aria-disabled" aria-disabled="true">Unavailable action</button><div class="view-tabs"><button class="view-tab" id="spec-tab" role="tab" aria-selected="true">Selected tab</button></div><fieldset class="segmented"><legend>Mode specimen</legend><label><input type="radio" name="spec-mode" checked><span class="segmented__option">Automated</span></label><label><input type="radio" name="spec-mode"><span class="segmented__option">Paused</span></label></fieldset><p><a class="text-link" href="#" id="spec-link">Open session</a></p>';
  document.body.append(specimen);window.specActivations=0;
  document.getElementById('spec-disabled').addEventListener('click',()=>window.specActivations++);
 });
 const primary=page.locator('#spec-primary');
 assert.equal(await style(primary,'backgroundColor'),colors.primary);assert.equal(await style(primary,'color'),colors.surface);
 await primary.hover();assert.equal(await style(primary,'backgroundColor'),colors.hover);
 await expectFocus(primary);
 const selected=page.locator('#spec-tab');await expectFocus(selected);
 assert.equal(await style(selected,'color'),colors.ink);
 assert.equal(await style(selected,'borderBottomColor'),colors.primary,'Focus keeps the selected tab marker');
 const disabled=page.locator('#spec-disabled');await disabled.hover({force:true});
 assert.equal(await style(disabled,'backgroundColor'),colors.strong);assert.equal(await style(disabled,'color'),colors.disabled);assert.equal(await style(disabled,'opacity'),'1');
 await disabled.evaluate(node=>node.click());assert.equal(await page.evaluate(()=>window.specActivations),0,'Native disabled controls cannot activate');
 assert.ok((await style(page.locator('#spec-link'),'textDecorationLine')).includes('underline'),'Links do not rely on color alone');
 assert.equal(await style(primary,'transitionDuration'),'0s','Reduced motion removes transitions');
 await page.emulateMedia({forcedColors:'active',reducedMotion:'reduce'});
 await selected.focus();assert.equal(await style(selected,'outlineStyle'),'solid');assert.notEqual(await style(selected,'borderBottomStyle'),'none','Forced colors retains selection');
 await page.emulateMedia({forcedColors:'none',reducedMotion:'reduce'});
 await page.locator('#design-specimen').evaluate(node=>node.remove());

 for(const [name,path] of [['driver','/?analytics=drivers&driver=Priya%20Singh#analytics'],['session','/?record=rowan-distraction#sessions']]) {
  await page.goto(base+path);const drawer=page.locator('#driver-drawer');
  assert.equal(await drawer.evaluate(node=>node.tagName),'DIALOG',name+' workspace uses native dialog');
  assert.equal(await drawer.evaluate(node=>node.open),true);
  assert.equal(await drawer.locator('.profile-shell > .drawer__header, .sw-shell > .drawer__header').count(),1,name+' uses one shared overlay header');
  assert.equal(await drawer.evaluate(node=>node.contains(document.activeElement)),true,'Modal opening moves focus inside');
  const close=drawer.locator('[data-close-drawer]');
  const closeBounds=await close.boundingBox();
  assert.ok(closeBounds.width>=32&&closeBounds.height>=32,'Drawer Close preserves a 32px minimum target');
  assert.match(await close.getAttribute('class'),/button--secondary/);
  assert.match(await close.getAttribute('class'),/button--icon/);
  await expectFocus(close);
  assert.equal(await drawer.locator('#driver-drawer-title').evaluate(node=>getComputedStyle(node).fontSize),'13.6px','Record titles share the canonical drawer title size');
  assert.equal(await close.locator('svg').getAttribute('viewBox'),'0 0 16 16');

  if(name==='session') await assertStrip(drawer,'Session workspace');
  await page.keyboard.press('Escape');assert.equal(await drawer.evaluate(node=>node.open),false,'Escape closes the native dialog');
 }

 // The program's existing start-session composer is a record drawer too.
 const openLegacyComposer=async()=>{
  await page.goto(base+'/?analytics=activity#analytics');
  await page.evaluate(()=>{openCategoryDrawer('following');startSession(activeCategory.quickCases[0].id);});
  return page.locator('#category-drawer');
 };
 const legacy=await openLegacyComposer();
 await assertStrip(legacy,'Start-session composer');
 assert.equal(await legacy.evaluate(node=>node.matches(':modal')),true);
 const draftFacts=await page.evaluate(()=>{
  const item=activeCategory.quickCases.find(item=>item.id===sessionDraft.caseId);
  return {score:directory.find(driver=>driver.name===item.name)?.safetyScore??'—',events:item.events,selected:selectedDraftEvidence().length,unassigned:sessionDraft.options.unassigned.length};
 });
 assert.deepEqual(await legacy.locator('.kpi-value').allTextContents(),[String(draftFacts.score),String(draftFacts.events),String(draftFacts.selected)]);
 const draftScope=legacy.locator('[data-draft-evidence-tab="unassigned"]');
 assert.equal(await draftScope.evaluate(node=>node.tagName),'INPUT');
 assert.equal(await draftScope.getAttribute('type'),'radio');
 assert.equal(await draftScope.locator('xpath=ancestor::fieldset').count(),1);
 await draftScope.locator('..').click();
 assert.equal(await legacy.locator('.draft-evidence-row').count(),draftFacts.unassigned,'Unassigned count describes the actual available source options');
 assert.equal(await draftScope.isChecked(),true);
 assert.equal(await page.evaluate(()=>selectedDraftEvidence().length),draftFacts.selected,'Changing evidence scope only browses records');
 await page.keyboard.press('Escape');
 for(const width of [1440,390,320]) {
  await page.setViewportSize({width,height:1000});
  for(const [name,path] of scenes) {
   await page.goto(base+path);await assertStrip(page.locator('.app-view.is-active'),name+' at '+width);
  }
  await page.goto(base+'/?record=rowan-distraction#sessions');const drawer=page.locator('#driver-drawer');
  await assertStrip(drawer,'Session at '+width);
  assert.ok(Math.abs((await drawer.boundingBox()).width-(width<=680?width:1060))<1,'Every record keeps the shared width');
  const legacy=await openLegacyComposer();await assertStrip(legacy,'Start-session composer at '+width);
  assert.ok(Math.abs((await legacy.boundingBox()).width-(width<=680?width:1060))<1,'Start-session composer keeps the same record width');

 }
 await page.setViewportSize({width:1280,height:1000});
 for(const [name,path] of scenes) {
  await page.goto(base+path);await page.evaluate(()=>document.documentElement.style.fontSize='200%');
  await assertStrip(page.locator('.app-view.is-active'),name+' at 200% text zoom');
 }

 // Durable review artifact loads the actual shared components, without application data.
 await page.setViewportSize({width:1440,height:1000});
 await page.goto(base+'/design-library.html');
 assert.equal(await page.title(),'Shared component specimen · Elevate Autocoach');
 assert.equal(await page.locator('script[src*="app.js"]').count(),0);
 assert.equal(await page.locator('#specimen-statuses .status').count(),8);
 assert.equal(await page.locator('#specimen-kpis .kpi-context').count(),0,'KPI definitions do not create repeated visible subtext');
 const metricHelp=page.locator('#specimen-kpis .hint-trigger').first();
 assert.equal(await metricHelp.getAttribute('data-tooltip'),'Sample records');
 await metricHelp.focus();
 assert.equal(await page.locator('#ui-tooltip').textContent(),'Sample records','KPI explanations remain available from keyboard focus');
 await page.keyboard.press('Escape');

 await assertStrip(page.locator('#specimen-kpis'),'Component specimen');
 await page.locator('#spec-primary').click();
 assert.match(await page.locator('#specimen-announcement').textContent(),/Example saved/);
 const unavailable=page.locator('[aria-disabled="true"]').first();
 await unavailable.evaluate(node=>{window.disabledActivations=0;node.addEventListener('click',()=>window.disabledActivations++);});
 await unavailable.focus();await page.keyboard.press('Enter');
 await unavailable.evaluate(node=>node.click());
 assert.equal(await page.evaluate(()=>window.disabledActivations),0,'ARIA-disabled shared controls also block activation');
 await page.locator('[name="example-mode"][value="automated"]').focus();
 await page.keyboard.press('ArrowRight');
 assert.equal(await page.locator('[name="example-mode"][value="review"]').isChecked(),true);
 await page.locator('#spec-tab-one').focus();await page.keyboard.press('ArrowRight');
 assert.equal(await page.locator('#spec-tab-one').getAttribute('aria-selected'),'true','Arrow keys move tab focus without activating the panel');
 await page.keyboard.press('Enter');
 assert.equal(await page.locator('#spec-panel-two').isVisible(),true);
 assert.equal(await page.locator('#spec-panel-one').isVisible(),false);
 await page.locator('#specimen-search').fill('Example');
 assert.equal(await style(page.locator('#specimen-search'),'backgroundColor'),colors.surface);
 await page.locator('#specimen-filter').click();
 assert.equal(await page.locator('#specimen-filter').getAttribute('aria-pressed'),'true');
 await page.locator('#specimen-clear').click();
 assert.equal(await page.locator('#specimen-filter').getAttribute('aria-pressed'),'false');
 const selection=page.getByRole('checkbox',{name:'Select first example'});
 await selection.check();
 assert.equal(await selection.locator('xpath=ancestor::tr').getAttribute('data-selected'),'true');
 assert.equal(await style(selection.locator('xpath=ancestor::td'),'borderInlineStartColor'),colors.primary);
 assert.equal(await style(selection.locator('xpath=ancestor::tr').locator('th[scope="row"]'),'backgroundColor'),colors.soft,'Row header paint follows selected-row state instead of column-header paint');

 await selection.uncheck();assert.equal(await selection.locator('xpath=ancestor::tr').getAttribute('data-selected'),'false');
 for(const width of [1440,390]) {
  await page.setViewportSize({width,height:1000});
  for(const id of ['driver-drawer','category-drawer']) {
   const opener=page.locator('[data-open-specimen-dialog="'+id+'"]');
   await opener.click();const drawer=page.locator('#'+id);
   assert.equal(await drawer.evaluate(node=>node.matches(':modal')),true,'Specimen drawers use the native modal top layer');
   assert.ok(Math.abs((await drawer.boundingBox()).width-(width<=680?width:1060))<1,'Specimen keeps the shared record width');
   await page.keyboard.press('Escape');assert.equal(await drawer.evaluate(node=>node.open),false);
   assert.equal(await opener.evaluate(node=>node===document.activeElement),true,'Native drawer dismissal restores its invoker');
  }
 }
 const tableAlignment=await auditAllTableAlignment(page,base);
 assert.ok(tableAlignment.cells>0);
 assert.deepEqual(fontRequests,[],'No web font is downloaded');
 assert.deepEqual(errors,[]);
 console.log('Passed: exact shared KPI anatomy and one-row reflow; system fonts; native links, radio groups, tables and dialogs; visible search labels; primary/hover/selected/focus/disabled states; forced colors; reduced motion; drawer focus/width; universal header/body/input alignment across 56 tables; the isolated component specimen; and all major pages at 320/390/1440 plus 200% text zoom.');
} finally { await browser.close(); }
