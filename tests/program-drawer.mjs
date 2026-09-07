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
  return {records:actual.map(record=>({id:record.id,state:record.state,origin:record.origin})).concat(pending.map(record=>({id:record.id,state:'manager_attention',origin:null}))),rates:categories.find(program=>program.id===id)?.weeklyRates,sample:outcomeSamples[id],pending:pending.length,sessionReviews:actual.filter(record=>record.state==='manager_attention').length,sessionIds:sessions.map(record=>record.id),flags:reviewCandidates.map(record=>({id:record.id,started:record.started}))};
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
const selectChart=async mode=>{
  await programPage.locator('[data-program-chart-view="'+mode+'"]').locator('..').click();
  assert.equal(await programPage.locator('[data-program-chart-view="'+mode+'"]').isChecked(),true);
};
const assertScope=async(facts,state,coach)=>{
  await page.selectOption('#program-record-view',state);
  await page.selectOption('#program-record-method',coach);
  assert.deepEqual((await programPage.locator('[data-program-record]').evaluateAll(rows=>rows.map(row=>row.dataset.programRecord))).sort(),idsFor(facts,state,coach),'Coaching rows match both source filters');
  const stateCounts=await page.locator('#program-record-view option').evaluateAll(options=>Object.fromEntries(options.map(option=>[option.value,Number(option.textContent.split(' · ').at(-1))])));
  for(const key of ['all','review','progress','completed'])assert.equal(stateCounts[key],idsFor(facts,key,coach).length,'State counts respect Coach');
  const coachCounts=await page.locator('#program-record-method option').evaluateAll(options=>Object.fromEntries(options.map(option=>[option.value,Number(option.textContent.split(' · ').at(-1))])));
  for(const key of ['all','automated','manual_override'])assert.equal(coachCounts[key],idsFor(facts,state,key).length,'Coach counts respect State');
};
const assertOutcomes=async(facts,weeks)=>{
  const outcomes=programPage.locator('#program-page-outcomes');
  assert.equal(await outcomes.evaluate(node=>node.tagName),'DETAILS','Recorded outcomes use one native disclosure');
  assert.equal(await programPage.locator('#program-coaching').evaluate(node=>Boolean(node.compareDocumentPosition(document.getElementById('program-page-outcomes'))&Node.DOCUMENT_POSITION_FOLLOWING)),true,'Coaching precedes supporting historical outcomes');
  assert.equal(await programPage.locator('#program-page-completion').count(),0,'Completion is not repeated as a separate page section');
  const completion=await programPage.locator('#program-page-kpis .kpi-tile').evaluateAll(tiles=>tiles.find(tile=>tile.querySelector('.kpi-label > span').textContent==='Completed').querySelector('[data-tooltip]').dataset.tooltip);
  const completed=idsFor(facts,'completed').length;
  if(facts.records.length){assert.ok(completion.includes(completed+' of '+facts.records.length),'Completed help retains its identified denominator');assert.ok(completion.includes(Math.round(completed/facts.records.length*100)+'%'));}
  else{assert.match(completion,/unavailable|No coaching records/i);assert.equal(completion.includes('0%'),false,'Empty programs have no invented completion percentage');}
  if(!await outcomes.evaluate(node=>node.open))await outcomes.locator(':scope > summary').click();
  const sample=programPage.locator('#program-page-outcome-sample');
  assert.equal(await sample.isVisible(),true,'Historical data remains available on request');
  assert.deepEqual((await sample.locator('tbody td').allTextContents()).map(value=>value.trim()),[String(facts.sample.eligible),facts.sample.improved+'%',String(facts.sample.repeated)],'Retained facts belong to this program');
  assert.match(await sample.textContent(),/Observation window unavailable.*independent of reporting period/);
  assert.match(await outcomes.textContent(),/not available/i,'The limitation stays beside its historical data');
  await outcomes.locator(':scope > summary').click();
  assert.equal(await sample.isVisible(),false,'The same source data can be collapsed again');
  await selectChart('comparison');
  assert.deepEqual((await programPage.locator('#program-rate-chart .ba-value').allTextContents()).map(Number),[facts.rates[facts.rates.length-(weeks===1?2:weeks)],facts.rates.at(-1)],'Comparison follows the reporting window');
  assert.equal(await programPage.locator('.category-weekly-chart,.before-after-chart').count(),1,'Retained outcomes do not add another graph');
  await selectChart('trend');
  assert.equal(await programPage.locator('.category-weekly-chart .chart-line-marker').count(),facts.rates.length);
};
try{
  await page.goto(base+'/?analytics=activity#analytics');
  assert.equal(await page.locator('#analytics-activity .weekly-activity-chart').isVisible(),true);
  const programIds=await page.evaluate(()=>categories.map(program=>program.id));
  // Every program, including zero-coaching Backing, keeps independent sample and period facts.
  for(const weeks of [1,4,8]){
    await page.goto(base+'/?program=all&period='+weeks+'#programs');
    for(const id of programIds){
      await page.selectOption('#program-page-select',id);await assertPage(id);
      const facts=await source(id,weeks);
      const kpis=await programPage.locator('#program-page-kpis .kpi-tile').evaluateAll(tiles=>Object.fromEntries(tiles.map(tile=>[tile.querySelector('.kpi-label > span').textContent,tile.querySelector('.kpi-value').textContent])));
      assert.deepEqual(kpis,{Identified:String(facts.records.length),'In progress':String(idsFor(facts,'progress').length),'Needs review':String(idsFor(facts,'review').length),'Automated sessions':String(idsFor(facts,'all','automated').length),'One-on-one sessions':String(idsFor(facts,'all','manual_override').length),Completed:String(idsFor(facts,'completed').length)});
      await assertOutcomes(facts,weeks);
      for(const [state,coach] of [['all','all'],['review','all'],['progress','automated'],['progress','manual_override'],['completed','all']])await assertScope(facts,state,coach);
      assert.equal(await programPage.locator('#program-review-context').count(),0,'The table does not repeat the summary review prose');
      const reviewHint=await programPage.locator('#program-page-kpis .kpi-tile').evaluateAll(tiles=>tiles.find(tile=>tile.querySelector('.kpi-label > span').textContent==='Needs review').querySelector('[data-tooltip]').dataset.tooltip);
      assert.ok(reviewHint.includes('Overdue, Repeated or Replied'),'Review hint names the states a person acts on');
    }
  }
  await page.goto(base+'/?program=all#programs');
  await programPage.locator('#program-page-kpis [data-program-record-scope="progress"]').click();
  await assertScope(await source('all',1),'progress','all');
  assert.match(await page.locator('#program-record-method option[value="automated"]').textContent(),/· 8$/);
  assert.match(await page.locator('#program-record-method option[value="manual_override"]').textContent(),/· 2$/);
  await page.goto(base+'/?program=distraction#programs');
  const clips=programPage.locator('[data-program-record="rowan-distraction"] .session-clips');
  assert.equal(await clips.count(),1);
  const expectedClips=await page.evaluate(()=>sessionClips(sessions.find(record=>record.id==='rowan-distraction')).length);
  assert.equal(await clips.getAttribute('aria-label'),expectedClips+' clips');
  // Analytics and search navigate to a page, with explicit source return.
  for(const tab of ['activity','outcomes']){
    await page.goto(base+'/?analytics='+tab+'&period=4#analytics');
    const opener=page.locator('#analytics-'+tab+' [data-open-category="following"]').first();
    await opener.scrollIntoViewIfNeeded();const scroll=await page.evaluate(()=>scrollY);await opener.click();
    await assertPage('following');assert.equal(await page.inputValue('#program-page-period'),'4');
    await programPage.locator('[data-back-program-page]').click();
    assert.equal(await page.locator('#analytics-'+tab).isVisible(),true);
    await page.waitForFunction(()=>document.activeElement?.getAttribute('data-open-category')==='following');
    assert.ok(Math.abs(await page.evaluate(()=>scrollY)-scroll)<2,'Report scroll is restored');
  }
  await page.goto(base+'/#automation');await page.locator('#global-search-trigger').click();
  await page.fill('#global-search-input','Following distance');
  await page.locator('[data-global-search-kind="program"][data-global-search-id="following"]').click();
  await assertPage('following');await programPage.locator('[data-back-program-page]').click();
  assert.equal(new URL(page.url()).hash,'#automation');
  // Legacy stages preserve their source scope after migration and reload.
  for(const [stage,state,coach] of [['all','all','all'],['needs','review','all'],['automated','progress','automated'],['one_to_one','progress','manual_override'],['completed','completed','all'],['outcomes','all','all']]){
    await page.goto(base+'/?analytics=activity&period=8&programPreview=following&programStage='+stage+'#analytics');
    await assertPage('following');assert.equal(new URL(page.url()).searchParams.get('programPreview'),null);
    assert.equal(await page.inputValue('#program-page-period'),'8');assert.equal(await page.inputValue('#program-record-view'),state);assert.equal(await page.inputValue('#program-record-method'),coach);
    if(stage==='outcomes'){assert.equal(await programPage.locator('[data-program-chart-view="comparison"]').isChecked(),true);assert.equal(await programPage.locator('#program-page-outcomes').evaluate(node=>node.open),true,'A legacy Outcomes link reveals its retained sample');await page.waitForFunction(()=>document.activeElement?.id==='program-page-outcomes-title');}
    await page.reload();assert.equal(await page.inputValue('#program-record-view'),state);assert.equal(await page.inputValue('#program-record-method'),coach);
  }
  // Session drawers keep exact record focus and full-page scroll through Back, Close and Escape.
  await page.goto(base+'/?program=following&period=8&programState=completed#programs');
  for(const close of ['[data-back-program-drawer]','[data-close-drawer]','Escape']){
    const action=programPage.locator('[data-program-record] [data-open-session]').last();await action.scrollIntoViewIfNeeded();
    const id=await action.getAttribute('data-open-session'),scroll=await page.evaluate(()=>scrollY);await action.click();
    assert.equal(await sessionDrawer.evaluate(node=>node.matches(':modal')),true);assert.equal(await sessionDrawer.locator('[data-back-program-drawer]').count(),1);
    assert.ok(Math.abs((await sessionDrawer.boundingBox()).width-1060)<1);assert.equal(new URL(page.url()).searchParams.get('record'),id);
    if(close==='Escape')await page.keyboard.press('Escape');else await sessionDrawer.locator(close).click();
    await page.waitForFunction(()=>!document.getElementById('driver-drawer').open);await assertPage('following');
    assert.equal(await page.inputValue('#program-record-view'),'completed');await page.waitForFunction(id=>document.activeElement?.getAttribute('data-open-session')===id,id);
    assert.ok(Math.abs(await page.evaluate(()=>scrollY)-scroll)<2,'Session return preserves Program scroll');
  }
  const deepId=await programPage.locator('[data-program-record] [data-open-session]').first().getAttribute('data-open-session');
  await page.goto(base+'/?analytics=activity&period=8&programPreview=following&programStage=completed&record='+deepId+'#analytics');
  assert.equal(await page.evaluate(()=>activeSessionId),deepId);assert.equal(new URL(page.url()).hash,'#programs');await page.reload();
  await sessionDrawer.locator('[data-back-program-drawer]').click();await assertPage('following');assert.equal(await page.inputValue('#program-record-view'),'completed');
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
  // Individual creation is prefilled even with no coaching records; Cancel changes no ledger data.
  for(const id of ['following','backing']){
    await page.goto(base+'/?program='+id+'&period=8#programs');const before=await source(id,8),start=programPage.locator('.page-heading [data-manual-session]');await start.click();
    assert.equal(await page.locator('#training-dialog').evaluate(node=>node.matches(':modal')),true);assert.equal(await page.inputValue('#manual-category-select'),id);
    await page.locator('#training-dialog').getByRole('button',{name:'Cancel',exact:true}).click();await page.waitForFunction(()=>!document.getElementById('training-dialog').open);await assertPage(id);
    assert.equal(await start.evaluate(node=>node===document.activeElement),true);const after=await source(id,8);assert.deepEqual(after.sessionIds,before.sessionIds);assert.deepEqual(after.flags,before.flags);
  }
  const before=await source('backing',8);assert.equal(before.records.length,0);await programPage.locator('.page-heading [data-manual-session]').click();
  await page.fill('#manual-session-reason','Review the recorded reversing procedure.');await page.locator('#training-dialog [data-confirm-manual-session]').click();
  const created=await page.evaluate(()=>sessions.find(record=>record.id===activeSessionId));assert.ok(created&&!before.sessionIds.includes(created.id));assert.equal(created.categoryId,'backing');assert.equal(created.origin,'manual_override');
  assert.equal(await sessionDrawer.evaluate(node=>node.matches(':modal')),true);await sessionDrawer.locator('[data-back-program-drawer]').click();await assertPage('backing');
  assert.equal(await page.inputValue('#program-record-view'),'progress');assert.equal(await page.inputValue('#program-record-method'),'manual_override');assert.deepEqual(await programPage.locator('[data-program-record]').evaluateAll(rows=>rows.map(row=>row.dataset.programRecord)),[created.id]);
  for(const width of [1440,390,320]){
    await page.setViewportSize({width,height:1000});await page.goto(base+'/?program=following&period=8#programs');await assertPage('following');
    if(!await programPage.locator('#program-page-outcomes').evaluate(node=>node.open))await programPage.locator('#program-page-outcomes > summary').click();assert.equal(await programPage.locator('#program-page-outcome-sample').isVisible(),true);assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false,'Program overflow stays local with disclosed outcomes at '+width);
    await programPage.locator('[data-program-record] [data-open-session]').first().click();assert.ok(Math.abs((await sessionDrawer.boundingBox()).width-(width<=680?width:Math.min(1060,width-84)))<1,'Session drawer widths survive page migration');
    await sessionDrawer.locator('[data-back-program-drawer]').click();await assertPage('following');
    if(width===390){await page.evaluate(()=>document.documentElement.style.fontSize='200%');await selectChart('comparison');assert.equal(await assertBeforeAfterText(page,'Retained Program data at 200% text zoom'),1);assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);}
  }
  assert.deepEqual(errors,[]);
  console.log('Passed: retained program data on full pages for all 10 programs and 1/4/8-week scopes; one chart, undated outcomes/completion, counted State/Coach filters, clips, report/search/group returns, legacy URLs, session Back/focus/scroll, manual prefill/cancel/create, shared session widths and 200% text zoom.');
}finally{await browser.close();}
