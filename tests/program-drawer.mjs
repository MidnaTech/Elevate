// Migration regression: former program-drawer DATA belongs on the full Programs page.
// Keep this filename so test:program-drawer continues guarding the retained product data.
import assert from 'node:assert/strict';
import { assertBeforeAfterText } from './chart-text-zoom.mjs';
const {chromium}=await import(process.env.PLAYWRIGHT_MODULE||'playwright');
const browser=await chromium.launch({headless:true,channel:process.env.BROWSER_CHANNEL||'chrome'});
const base=process.env.BASE_URL||'http://localhost:5173';
const page=await browser.newPage({viewport:{width:1440,height:1000},reducedMotion:'reduce'});
page.setDefaultTimeout(10000);
// Block external services before any navigation, including incident-map requests.
await page.route('**/*',route=>['localhost','127.0.0.1','[::1]'].includes(new URL(route.request().url()).hostname)?route.continue():route.abort());
const errors=[];
page.on('pageerror',error=>errors.push(error.message));
page.on('response',response=>{if(response.url().startsWith(base)&&response.status()>=400)errors.push(response.status()+' '+response.url());});
const programPage=page.locator('#view-programs'),groupDrawer=page.locator('#category-drawer'),sessionDrawer=page.locator('#driver-drawer');
const source=async(id,weeks)=>page.evaluate(({id,weeks})=>{
  const scoped=record=>(id==='all'||record.categoryId===id)&&(Number.isFinite(record.weeksAgo)?record.weeksAgo:0)<weeks;
  const actual=sessions.filter(scoped),pending=reviewCandidates.filter(record=>!record.started&&scoped(record));
  return {id,name:categories.find(program=>program.id===id)?.name,records:actual.map(record=>({id:record.id,state:record.state,origin:sessionMethodFilter(record)})).concat(pending.map(record=>({id:record.id,state:'manager_attention',origin:null}))),rates:categories.find(program=>program.id===id)?.weeklyRates,sample:outcomeSamples[id],pending:pending.length,sessionReviews:actual.filter(record=>record.state==='manager_attention').length,sessionIds:sessions.map(record=>record.id),flags:reviewCandidates.map(record=>({id:record.id,started:record.started}))};
},{id,weeks});
const stateMatches=(record,state)=>state==='all'||(state==='review'&&record.state==='manager_attention')||(state==='progress'&&record.state==='system_handling')||(state==='completed'&&['completed','archived'].includes(record.state));
const coachMatches=(record,coach)=>coach==='all'||record.origin===coach;
const idsFor=(facts,state='all',coach='all')=>facts.records.filter(record=>stateMatches(record,state)&&coachMatches(record,coach)).map(record=>record.id).sort();
const assertPage=async id=>{
  assert.equal(await programPage.isVisible(),true);
  assert.equal(new URL(page.url()).hash,'#programs','Program details use the full Programs route');
  assert.equal(await page.inputValue('#program-page-select'),id);
  assert.equal(await page.locator('dialog:modal').count(),0,'Program navigation does not open a program drawer');
  assert.equal(await page.locator('#app-shell').evaluate(node=>node.inert),false);
  assert.equal(await programPage.locator('.page-heading [data-open-category]').count(),0,'Quick view cannot recreate the removed layout');
};
const assertOutcomes=async(facts,weeks)=>{
  const outcomes=programPage.locator('#program-page-outcomes');
  assert.equal(await outcomes.evaluate(node=>node.tagName),'DETAILS','Recorded outcomes use one native disclosure');
  assert.equal(await programPage.locator('#program-page-completion').count(),0,'Completion is not repeated as a separate page section');
  const completion=await programPage.locator('#program-page-kpis .kpi-tile').evaluateAll(tiles=>tiles.find(tile=>tile.querySelector('.kpi-label > span').textContent==='Completed').querySelector('[data-tooltip]').dataset.tooltip);
  const completed=idsFor(facts,'completed').length;
  if(facts.records.length){assert.ok(completion.includes(completed+' of '+facts.records.length),'Completed help retains its identified denominator');assert.ok(completion.includes(Math.round(completed/facts.records.length*100)+'%'));}
  else{assert.match(completion,/unavailable|No coaching records/i);assert.equal(completion.includes('0%'),false,'Empty programs have no invented completion percentage');}
  if(!await outcomes.evaluate(node=>node.open))await outcomes.locator(':scope > summary').click();
  const sample=programPage.locator('#program-page-outcome-sample');
  assert.equal(await sample.isVisible(),true,'Historical data remains available on request');
  assert.deepEqual((await sample.locator('tbody td').allTextContents()).map(value=>value.trim()),[String(facts.sample.eligible),facts.sample.improved+'%',String(facts.sample.repeated)],'Retained facts belong to this program');
  assert.match(await outcomes.textContent(),/no recorded cohort dates.*stay unchanged when the reporting period changes/s,'The sample remains explicitly independent of reporting scope');
  assert.match(await outcomes.textContent(),/unavailable/i,'The limitation stays beside its historical data');
  await outcomes.locator(':scope > summary').click();
  assert.equal(await sample.isVisible(),false,'The same source data can be collapsed again');
  assert.equal(await programPage.locator('#program-rate-chart,[data-program-chart-view]').count(),0,'A selected programme has no duplicate event-rate card');
  const weeklyRows=await programPage.locator('#program-activity-chart .chart-summary tbody tr').count();
  assert.equal(weeklyRows,await page.evaluate(id=>programActivityWeeks(categories.find(program=>program.id===id)).length,facts.id),'The retained weekly chart has equivalent source rows');
  await page.selectOption('#program-page-select','all');
  await programPage.locator('[data-program-comparison-view="rates"]').locator('..').click();
  const rateRow=programPage.locator('#program-rate-chart .ba-row').filter({has:page.locator('.ba-label',{hasText:new RegExp('^'+facts.name+'$')})});
  assert.deepEqual((await rateRow.locator('.ba-value').allTextContents()).map(Number),[facts.rates[facts.rates.length-(weeks===1?2:weeks)],facts.rates.at(-1)],'The all-programme comparison retains source event rates for this reporting window');
  await page.selectOption('#program-page-select',facts.id);
  assert.equal(await programPage.locator('.category-weekly-chart,.before-after-chart').count(),0,'Returning to a programme keeps the removed rate card absent');
};
try{
  await page.goto(base+'/?analytics=activity#analytics');
  assert.equal(await programPage.locator('#program-activity-plot .weekly-activity-chart').isVisible(),true);
  const programIds=await page.evaluate(()=>categories.map(program=>program.id));
  // Every program, including zero-coaching Backing, keeps independent sample and period facts.
  for(const weeks of [1,4,8]){
    await page.goto(base+'/?program=all&period='+weeks+'#programs');
    for(const id of programIds){
      await page.selectOption('#program-page-select',id);await assertPage(id);
      const facts=await source(id,weeks);
      const kpis=await programPage.locator('#program-page-kpis .kpi-tile').evaluateAll(tiles=>Object.fromEntries(tiles.map(tile=>[tile.querySelector('.kpi-label > span').textContent,tile.querySelector('.kpi-value').textContent])));
      const score=await page.evaluate(id=>programScore(categories.find(program=>program.id===id)),id);
      assert.deepEqual(kpis,{Identified:String(facts.records.length),'In progress':String(idsFor(facts,'progress').length),'Needs review':String(idsFor(facts,'review').length),'Automated sessions':String(idsFor(facts,'all','automated').length),[facts.name+' score']:score===null?'—':String(score),'One-on-one sessions':String(idsFor(facts,'all','manual_override').length),Completed:String(idsFor(facts,'completed').length)});
      await assertOutcomes(facts,weeks);
      assert.equal(await programPage.locator('#program-review-context').count(),0,'The table does not repeat the summary review prose');
      const reviewHint=await programPage.locator('#program-page-kpis .kpi-tile').evaluateAll(tiles=>tiles.find(tile=>tile.querySelector('.kpi-label > span').textContent==='Needs review').querySelector('[data-tooltip]').dataset.tooltip);
      assert.ok(reviewHint.includes('Overdue, Repeated or Replied'),'Review hint names the states a person acts on');
    }
  }
  // Both former reports now enter Activity, with explicit comparison source return.
  for(const tab of ['activity','outcomes']){
    await page.goto(base+'/?analytics='+tab+'&period=4#analytics');
    assert.equal(await programPage.locator('#program-tab-activity').getAttribute('aria-selected'),'true','Both legacy reports migrate to Activity');
    const opener=programPage.locator('#program-comparison-table [data-open-program-page="following"]');
    await opener.scrollIntoViewIfNeeded();const scroll=await page.evaluate(()=>scrollY);await opener.click();
    await assertPage('following');assert.equal(await page.inputValue('#program-page-period'),'4');
    await programPage.locator('[data-back-program-page]').click();
    assert.equal(await programPage.locator('#program-comparison-table').isVisible(),true);
    await page.waitForFunction(()=>document.activeElement?.getAttribute('data-open-program-page')==='following');
    assert.ok(Math.abs(await page.evaluate(()=>scrollY)-scroll)<2,'Report scroll is restored');
  }
  // Legacy stages preserve their source scope after migration and reload.
  for(const [stage,state,coach] of [['all','all','all'],['needs','review','all'],['automated','progress','automated'],['one_to_one','progress','manual_override'],['completed','completed','all'],['outcomes','all','all']]){
    await page.goto(base+'/?analytics=activity&period=8&programPreview=following&programStage='+stage+'#analytics');
    await assertPage('following');assert.equal(new URL(page.url()).searchParams.get('programPreview'),null);
    assert.equal(await page.inputValue('#program-page-period'),'8');assert.equal(await programPage.locator('#program-coaching,#program-record-view').count(),0,'Legacy stage links do not restore the full records table; the compact attention list opens Sessions');
    if(stage==='outcomes'){assert.equal(await programPage.locator('[data-program-chart-view]').count(),0);assert.equal(await programPage.locator('#program-page-outcomes').evaluate(node=>node.open),true,'A legacy Outcomes link reveals its retained sample');await page.waitForFunction(()=>document.activeElement?.id==='program-page-outcomes-title');}
    await page.reload();await assertPage('following');
  }
  // Group remains a drawer; Program is a page and returns to the same group and source row.
  await page.goto(base+'/?analytics=groups&period=8#analytics');
  const groupOpener=page.locator('#view-groups [data-open-group]').first(),groupName=await groupOpener.getAttribute('data-open-group');await groupOpener.click();
  const groupProgram=groupDrawer.locator('.group-programs [data-open-category]').first(),groupId=await groupProgram.getAttribute('data-open-category');await groupProgram.scrollIntoViewIfNeeded();
  const groupScroll=await groupDrawer.locator('.category-panel-scroll').evaluate(node=>node.scrollTop);await groupProgram.click();await assertPage(groupId);
  assert.equal(await programPage.locator('[data-back-program-page]').textContent(),'← '+groupName);await programPage.locator('[data-back-program-page]').click();
  assert.equal(await groupDrawer.evaluate(node=>node.matches(':modal')),true);assert.equal(await groupDrawer.locator('#category-title').textContent(),groupName);
  await page.waitForFunction(id=>document.activeElement?.getAttribute('data-open-category')===id,groupId);
  await page.waitForTimeout(250); // A delayed modal-open focus callback must not steal source focus.
  assert.equal(await page.evaluate(()=>document.activeElement?.getAttribute('data-open-category')),groupId);assert.ok(Math.abs(await groupDrawer.locator('.category-panel-scroll').evaluate(node=>node.scrollTop)-groupScroll)<2);
  await page.keyboard.press('Escape');await page.waitForFunction(()=>!document.getElementById('category-drawer').open);
  // Manual one-on-ones start from Sessions; Programs no longer carries a Start one-on-one action.
  await page.goto(base+'/?program=backing&period=8#programs');assert.equal(await programPage.locator('.page-heading [data-manual-session]').count(),0,'Programs has no Start one-on-one action');
  for(const width of [1440,390,320]){
    await page.setViewportSize({width,height:1000});await page.goto(base+'/?program=following&period=8#programs');await assertPage('following');
    if(!await programPage.locator('#program-page-outcomes').evaluate(node=>node.open))await programPage.locator('#program-page-outcomes > summary').click();assert.equal(await programPage.locator('#program-page-outcome-sample').isVisible(),true);assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false,'Program overflow stays local with disclosed outcomes at '+width);
    await programPage.locator('#program-page-kpis [data-inbox-filter="all"]:not([data-inbox-origin])').click();await page.locator('.session-record [data-open-session]').first().click();assert.ok(Math.abs((await sessionDrawer.boundingBox()).width-(width<=680?width:Math.min(1060,width-84)))<1,'Session drawer widths survive page migration');
    await page.keyboard.press('Escape');await page.waitForFunction(()=>!document.getElementById('driver-drawer').open);await page.goto(base+'/?program=following&period=8#programs');await assertPage('following');
    if(width===390){await page.evaluate(()=>document.documentElement.style.fontSize='200%');assert.equal(await programPage.locator('#program-rate-chart').count(),0);await page.selectOption('#program-page-select','all');await programPage.locator('[data-program-comparison-view="rates"]').locator('..').click();assert.equal(await assertBeforeAfterText(page,'Retained all-programme rates at 200% text zoom'),programIds.length);assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);}
  }
  assert.deepEqual(errors,[]);
  console.log('Passed: retained program data on full pages for all 10 programs and 1/4/8-week scopes; weekly coaching and the retained all-programme event comparison, undated outcomes/completion, comparison/group source returns, legacy URLs and stage links, session navigation, shared session widths and 200% text zoom.');
}finally{await browser.close();}
