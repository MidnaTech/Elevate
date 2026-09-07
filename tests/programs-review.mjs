// First-step Jobin review acceptance. This is a local UI prototype, not a scoring/LMS engine test.
import assert from 'node:assert/strict';
import { assertBeforeAfterText } from './chart-text-zoom.mjs';
const {chromium}=await import(process.env.PLAYWRIGHT_MODULE||'playwright');
const browser=await chromium.launch({headless:true,channel:process.env.BROWSER_CHANNEL||'chrome'});
const base=process.env.BASE_URL||'http://localhost:5173';
const page=await browser.newPage({viewport:{width:1440,height:1000},reducedMotion:'reduce'});
page.setDefaultTimeout(10000);
// Block external traffic before navigation: fixture records and map coordinates stay local.
await page.route('**/*',route=>['localhost','127.0.0.1','[::1]'].includes(new URL(route.request().url()).hostname)?route.continue():route.abort());
const errors=[];page.on('pageerror',error=>errors.push(error.message));
page.on('response',response=>{if(response.url().startsWith(base)&&response.status()>=400)errors.push(response.status()+' '+response.url());});
const programPage=page.locator('#view-programs');
const selectChart=async mode=>{
  const control=programPage.locator('[data-program-chart-view="'+mode+'"]');
  await control.locator('..').click();
  assert.equal(await control.isChecked(),true,'The native chart selector exposes its selected mode');
};
const selectComparison=async mode=>{
  const control=programPage.locator('[data-program-comparison-view="'+mode+'"]');
  await control.locator('..').click();
  assert.equal(await control.isChecked(),true,'The comparison module exposes its selected native radio');
  assert.equal(await programPage.locator('#program-comparison-table').isVisible(),mode==='coaching');
  assert.equal(await programPage.locator('#program-rate-chart').isVisible(),mode==='rates','Only one representation of the comparison is visible');
};
const assertTrendGeometry=async label=>{
  await page.evaluate(()=>new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve))));
  const geometry=await programPage.locator('.category-weekly-chart').evaluate(svg=>{
    const box=svg.getBoundingClientRect(),plot=svg.closest('.chart-plot');
    const labels=[...svg.querySelectorAll('text.chart-label')].slice(-8).map(text=>{
      const {left,right}=text.getBoundingClientRect();return {left,right};
    });
    return {width:box.width,minimum:680*Math.max(1,parseFloat(getComputedStyle(document.documentElement).fontSize)/16),scroll:plot.scrollWidth,viewport:plot.clientWidth,labels};
  });
  assert.ok(geometry.width>=geometry.minimum-1,label+' retains intrinsic chart width instead of shrinking text');
  assert.ok(geometry.scroll>=geometry.width-1,label+' keeps the complete graph inside its local scroll region');
  for(let index=1;index<geometry.labels.length;index++)assert.ok(geometry.labels[index-1].right<=geometry.labels[index].left,label+' weekly labels remain separate');
  await assertNoPageOverflow(label);
};
const source=async(id,weeks)=>page.evaluate(({id,weeks})=>{
  const inScope=record=>(id==='all'||record.categoryId===id)&&(Number.isFinite(record.weeksAgo)?record.weeksAgo:0)<weeks;
  const actual=sessions.filter(inScope),flags=reviewCandidates.filter(flag=>!flag.started&&inScope(flag));
  const active=actual.filter(record=>record.state==='system_handling');
  const review=actual.filter(record=>record.state==='manager_attention');
  const completed=actual.filter(record=>['completed','archived'].includes(record.state));
  const automatic=actual.filter(record=>record.origin==='automated'),manual=actual.filter(record=>record.origin==='manual_override');
  const rates=categories.find(program=>program.id===id)?.weeklyRates;
  const before=rates?.[rates.length-(weeks===1?2:weeks)],after=rates?.at(-1);
  return {ids:actual.concat(flags).map(record=>record.id),actualIds:actual.map(record=>record.id),identified:actual.length+flags.length,actual:actual.length,flags:flags.length,inProgress:active.length,review:review.length+flags.length,completed:completed.length,automated:automatic.length,manual:manual.length,activeAutomated:active.filter(record=>record.origin==='automated').length,activeManual:active.filter(record=>record.origin==='manual_override').length,stageIds:{all:actual.concat(flags).map(record=>record.id),progress:active.map(record=>record.id),review:review.concat(flags).map(record=>record.id),completed:completed.map(record=>record.id)},originIds:{automated:automatic.map(record=>record.id),manual_override:manual.map(record=>record.id)},before,after,change:before?Math.round((after-before)/before*100):null,completion:actual.length+flags.length?Math.round(completed.length/(actual.length+flags.length)*100):null};
},{id,weeks});
const assertProgramKpis=async facts=>{
  const metrics=await page.locator('#program-page-kpis .kpi-tile').evaluateAll(tiles=>Object.fromEntries(tiles.map(tile=>[tile.querySelector('.kpi-label > span').textContent,tile.querySelector('.kpi-value').textContent])));
  assert.deepEqual(metrics,{Identified:String(facts.identified),'In progress':String(facts.inProgress),'Needs review':String(facts.review),'Automated sessions':String(facts.automated),'One-on-one sessions':String(facts.manual),Completed:String(facts.completed)},'Program KPIs preserve total method counts and mutually exclusive workflow stages');
};
const assertNoPageOverflow=async label=>assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false,label+' keeps horizontal scrolling local');
const assertFullPage=async id=>{
  assert.equal(await programPage.isVisible(),true,'Program detail is a first-class full page');
  assert.equal(await programPage.evaluate(node=>node.classList.contains('is-active')),true);
  assert.equal(new URL(page.url()).hash,'#programs');
  assert.equal(new URL(page.url()).searchParams.get('program')||'all',id);
  assert.equal(await page.evaluate(()=>selectedProgramId),id);
  assert.equal(await page.locator('dialog:modal').count(),0,'Opening a program does not open a shelf or modal');
  assert.equal(await page.locator('#app-shell').evaluate(node=>node.inert),false,'Program pages leave the workspace interactive');
  assert.equal(await page.locator('.primary-nav [data-view="programs"]').getAttribute('aria-current'),'page');
};
try {
  await page.goto(base+'/#automation');
  const programs=await page.evaluate(()=>categories.map(({id,name})=>({id,name})));
  assert.deepEqual((await page.locator('.primary-nav a[data-view]').evaluateAll(nodes=>nodes.map(node=>node.dataset.view))).sort(),['coaching','inbox','outcomes','programs','library','settings'].sort());
  assert.equal(await page.locator('.primary-nav a[data-view="outcomes"]').count(),1,'Analytics remains a visible primary destination alongside the optional Program pages');
  assert.equal(await page.inputValue('#landing-program-filter'),'all');
  assert.deepEqual(await page.locator('#landing-program-filter option').evaluateAll(options=>options.map(option=>option.value)),['all',...programs.map(program=>program.id)],'Every program is selectable, including a program with no coaching');
  const baseline=await page.evaluate(()=>({ids:sessions.map(record=>record.id),flags:reviewCandidates.map(flag=>flag.started),mode:automationMode,cadence:cadenceWeeks}));

  for(const weeks of [1,4,8]) {
    await page.selectOption('#view-coaching [data-coaching-period]',String(weeks));
    for(const {id} of [{id:'all'},...programs]) {
      await page.selectOption('#landing-program-filter',id);
      const facts=await source(id,weeks);
      assert.equal(await page.inputValue('#view-coaching [data-coaching-period]'),String(weeks),'Selecting a program preserves time scope');
      assert.equal(new URL(page.url()).searchParams.get('program'),id==='all'?null:id);
      for(const [node,key] of [['kpi-identified','identified'],['kpi-in-progress','inProgress'],['kpi-needs-review','review'],['kpi-completed','completed'],['automation-week-automated','automated'],['automation-week-manual','manual'],['automation-session-total','actual']])assert.equal(await page.locator('#'+node).textContent(),String(facts[key]),id+' '+weeks+'wk '+node+' reconciles to source');
      assert.equal(facts.identified,facts.inProgress+facts.review+facts.completed);
      assert.equal(await page.locator('#automation-share').textContent(),(facts.actual?Math.round(facts.automated/facts.actual*100):0)+'%');
      if(id!=='all') {
        assert.equal(await page.locator('#kpi-fleet-safety').textContent(),'—','Program scores are unavailable until program scoring exists');
        assert.match(await page.locator('#landing-score-hint').getAttribute('data-tooltip'),/not yet measured/i);
        assert.equal(await page.locator('#kpi-safety-trend').isVisible(),false,'A fleet delta cannot be relabelled as a program score change');
      }
    }
  }
  assert.deepEqual(await page.evaluate(()=>({ids:sessions.map(record=>record.id),flags:reviewCandidates.map(flag=>flag.started),mode:automationMode,cadence:cadenceWeeks})),baseline,'Browsing program/time scope cannot mutate the ledger or active configuration');
  await page.selectOption('#landing-program-filter','speeding');
  await page.selectOption('#view-coaching [data-coaching-period]','4');
  assert.equal(await page.inputValue('#landing-program-filter'),'speeding','Changing period preserves the selected program');
  await page.reload();
  assert.equal(await page.inputValue('#landing-program-filter'),'speeding');
  assert.equal(await page.inputValue('#view-coaching [data-coaching-period]'),'4','Program and time scopes survive a deep-link reload');
  const scoped=await source('speeding',4);
  await page.locator('#kpi-identified').locator('..').click();
  assert.equal(new URL(page.url()).hash,'#sessions');
  assert.equal(await page.inputValue('#session-program-filter'),'speeding','Landing shortcuts retain the named program');
  assert.equal(await page.inputValue('#view-inbox [data-coaching-period]'),'4');
  assert.equal(await page.locator('[data-session-filter="all"]').isChecked(),true);
  assert.deepEqual((await page.locator('.session-record').evaluateAll(rows=>rows.map(row=>row.dataset.recordId))).sort(),scoped.ids.sort(),'Program shortcut shows exactly its source coaching records');
  assert.ok((await page.locator('#session-applied-filters').textContent()).includes('Speeding'),'Applied program scope is visible');
  assert.equal(await page.locator('#sessions-kpis .kpi-value').first().textContent(),String(scoped.identified),'Sessions summary adopts the explicit program scope');
  await page.locator('#sessions-kpis [data-inbox-filter="completed"]').click();
  assert.equal(await page.inputValue('#session-program-filter'),'speeding','Session KPI shortcuts retain the program scope');

  await page.locator('.primary-nav [data-view="programs"]').click();
  await assertFullPage('all');
  assert.equal(await page.inputValue('#program-page-period'),'4','Opening Programs preserves the reporting period');
  assert.equal(await page.inputValue('#program-page-select'),'all','Programs starts with the complete comparison');
  assert.deepEqual(await page.locator('#program-page-select option').evaluateAll(options=>options.map(option=>option.value)),['all',...programs.map(program=>program.id)]);
  assert.deepEqual(await programPage.locator('[role="tab"]').allTextContents(),['Overview','Content','Configuration']);
  assert.equal(await programPage.locator('#program-coaching-disclosure').evaluate(node=>node.open),false,'All-program coaching records stay collapsed until requested');

  assert.equal(await programPage.locator('[data-program-comparison-view="coaching"]').isChecked(),true,'All programs defaults to the actionable coaching table');
  assert.equal(await programPage.locator('#program-rate-chart').isVisible(),false);
  await programPage.locator('[data-program-comparison-view="coaching"]').focus();
  await page.keyboard.press('ArrowRight');
  assert.equal(await programPage.locator('[data-program-comparison-view="rates"]').isChecked(),true,'Native radio arrows activate the alternative comparison');
  assert.equal(new URL(page.url()).searchParams.get('programComparison'),'rates');
  await page.reload();
  assert.equal(await programPage.locator('[data-program-comparison-view="rates"]').isChecked(),true,'Event-rate view survives reload');
  await selectComparison('coaching');
  await page.goBack();
  assert.equal(await programPage.locator('[data-program-comparison-view="rates"]').isChecked(),true,'Browser Back restores the comparison choice');
  await page.goForward();
  assert.equal(await programPage.locator('[data-program-comparison-view="coaching"]').isChecked(),true);

  const number=text=>Number(text.replace(/[−–]/g,'-').replace(/[^0-9.+-]/g,''))*(text.includes('↓')?-1:1);
  for(const weeks of [1,4,8]) {
    await page.selectOption('#program-page-period',String(weeks));
    const facts=await source('all',weeks);
    await assertProgramKpis(facts);
    const rows=programPage.locator('[data-program-comparison]');
    assert.deepEqual((await rows.evaluateAll(nodes=>nodes.map(node=>node.dataset.programComparison))).sort(),programs.map(program=>program.id).sort(),'Comparison includes every program, including zero-record Backing');
    await selectComparison('coaching');
    const tableHeaders=await programPage.locator('#program-comparison-table thead th').allTextContents();
    assert.deepEqual(tableHeaders,['Program','Needs review','In progress','Completed','Automated sessions','One-on-one sessions','Event-rate change'],'The compact comparison keeps independent workflow and method columns');
    const changes=new Map(),periodFacts=new Map();
    for(const {id} of programs) {
      const programFacts=await source(id,weeks);
      changes.set(id,programFacts.change);periodFacts.set(id,programFacts);
      const cells=await programPage.locator('[data-program-comparison="'+id+'"] td').allTextContents();
      assert.deepEqual(cells.slice(1,6).map(number),[programFacts.review,programFacts.inProgress,programFacts.completed,programFacts.automated,programFacts.manual],id+' compact comparison totals match selected-period source');
      assert.equal(number(cells[6]),programFacts.change);
    }
    const totals=await rows.evaluateAll(nodes=>nodes.reduce((sum,row)=>sum.map((value,index)=>value+Number(row.cells[index+1].textContent)),[0,0,0,0,0]));
    assert.deepEqual(totals,[facts.review,facts.inProgress,facts.completed,facts.automated,facts.manual],'Comparison totals reconcile to the all-program KPIs');
    assert.equal(totals[0]+totals[1]+totals[2],facts.identified,'Identified remains derivable from the mutually exclusive stages');
    const changeHeader=programPage.locator('#program-comparison-table thead th').last();
    if(await changeHeader.getAttribute('aria-sort')!=='ascending'){await changeHeader.locator('button').focus();await page.keyboard.press('Enter');}
    const sortedChanges=(await rows.evaluateAll(nodes=>nodes.map(node=>node.dataset.programComparison))).map(id=>changes.get(id));
    assert.deepEqual(sortedChanges,sortedChanges.slice().sort((a,b)=>a-b),'Change sorting respects signed rates behind fewer/more labels');
    await selectComparison('rates');
    assert.equal(await programPage.locator('#program-rate-chart .ba-row').count(),programs.length,'The alternative graph retains all programs');
    for(const {id,name} of programs) {
      const programFacts=periodFacts.get(id);
      const graph=await programPage.locator('#program-rate-chart .ba-row').evaluateAll((nodes,name)=>nodes.filter(node=>node.getAttribute('aria-label').startsWith(name+':')).map(node=>[...node.querySelectorAll('.ba-value')].map(value=>Number(value.textContent))),name);
      assert.deepEqual(graph,[[programFacts.before,programFacts.after]],'Absolute rates remain available in the chart with the same program and reporting window');
    }
    await selectComparison('coaching');
    for(const [attribute,value,expected] of [
      ['data-program-record-scope','all',facts.stageIds.all],['data-program-record-scope','progress',facts.stageIds.progress],
      ['data-program-record-scope','review',facts.stageIds.review],['data-program-record-scope','completed',facts.stageIds.completed],
      ['data-program-method','automated',facts.originIds.automated],['data-program-method','manual_override',facts.originIds.manual_override]
    ]) {
      await programPage.locator('#program-page-kpis ['+attribute+'="'+value+'"]').click();
      assert.equal(await programPage.locator('#program-coaching-disclosure').evaluate(node=>node.open),true,'Summary shortcuts reveal the requested coaching records');
      assert.deepEqual((await programPage.locator('[data-program-record]').evaluateAll(nodes=>nodes.map(node=>node.dataset.programRecord))).sort(),expected.slice().sort(),'All-program coaching shortcut preserves period and record grain');
      await assertFullPage('all');
    }
  }

  await programPage.locator('#program-page-kpis [data-program-record-scope="all"]').click();
  const repeatedDriver=await programPage.locator('[data-program-record]').evaluateAll(rows=>{
    const seen=new Set();
    for(const row of rows){const control=row.querySelector('[data-open-driver-profile]');if(!control)continue;const name=control.dataset.openDriverProfile;if(seen.has(name))return {id:row.dataset.programRecord,name};seen.add(name);}
  });
  assert.ok(repeatedDriver,'All-record coaching includes a repeated source driver for focus restoration coverage');
  const repeatedAction=programPage.locator('[data-program-record="'+repeatedDriver.id+'"] [data-open-driver-profile]');
  await repeatedAction.click();
  assert.equal(await page.locator('#driver-drawer-title').textContent(),repeatedDriver.name);
  await page.locator('#driver-drawer [data-close-drawer]').click();
  await page.waitForFunction(id=>document.activeElement?.closest('[data-program-record]')?.dataset.programRecord===id,repeatedDriver.id);
  assert.equal(await programPage.locator('#program-coaching-disclosure').evaluate(node=>node.open),true,'Returning from a repeated driver retains the disclosure and exact source action');

  // Comparison rows and the selector enter a full program detail; primary navigation returns to All.
  await programPage.locator('[data-program-comparison="following"] [data-open-program-page="following"]').click();
  await assertFullPage('following');
  assert.equal(await page.inputValue('#program-page-period'),'8');
  await programPage.locator('#program-tab-configuration').click();
  await page.locator('.primary-nav [data-view="programs"]').click();
  await assertFullPage('all');
  assert.equal(await programPage.locator('#program-tab-overview').getAttribute('aria-selected'),'true','Primary Programs entry resets to the all-program overview');
  assert.equal(await page.inputValue('#program-page-period'),'8');
  await page.goBack();
  await assertFullPage('following');
  assert.equal(await programPage.locator('#program-tab-configuration').getAttribute('aria-selected'),'true','Browser Back restores the selected program and section');
  await page.selectOption('#program-page-select','all');
  assert.equal(new URL(page.url()).searchParams.get('program'),'all');
  assert.equal(await programPage.locator('#program-tab-configuration').getAttribute('aria-selected'),'true','Changing program scope retains Configuration');
  const configurationRows=await programPage.locator('#program-page-panel tbody tr').evaluateAll(rows=>rows.map(row=>[row.querySelector('[data-open-program-page]').dataset.openProgramPage,row.cells[1].textContent.trim(),Number(row.cells[2].textContent),row.cells[3].textContent,Number(row.cells[4].textContent),Number(row.cells[5].textContent),row.cells[6].textContent]));
  const configurationFacts=await page.evaluate(()=>ProgramSetup.getPolicies().map(policy=>[policy.id,policy.status==='active'?'Active':'Draft',policy.scoreThreshold,'every '+policy.assessment.amount+' '+policy.assessment.unit,policy.rules.filter(rule=>rule.enabled).length,policy.courseIds.length,policy.coachMode==='group'?'By group':policy.coach||'Unassigned']));
  assert.deepEqual(configurationRows,configurationFacts,'All Configuration lists each stable program ID, state, coaching threshold, independent assessment, enabled rules, approved course pool and manager');
  assert.ok(configurationFacts.every(row=>row[5]===0),'Imported metadata is preserved separately and is not counted as an approved video-and-quiz course');
  await programPage.locator('#program-tab-content').click();
  const allLessons=await programPage.locator('#program-page-panel tbody tr').evaluateAll(rows=>rows.map(row=>[row.cells[0].textContent,[...row.cells[1].querySelectorAll('[data-open-program-page]')].map(link=>link.dataset.openProgramPage),row.cells[2].textContent,row.cells[3].textContent,row.cells[4].textContent]));
  const contentFacts=await page.evaluate(()=>{
    const policies=ProgramSetup.getPolicies(),courses=ProgramSetup.getCourses();
    const ids=[...new Set(policies.flatMap(policy=>[...policy.courseIds,...(policy.legacyCourseIds||[])]))];
    return ids.map(id=>{const course=courses.find(item=>item.id===id);return [course.title,policies.filter(policy=>[...policy.courseIds,...(policy.legacyCourseIds||[])].includes(id)).map(policy=>policy.id),course.legacy?course.length:course.durationMinutes+' min video · '+course.questions.length+' questions',course.legacy?course.version:'v'+course.version,course.legacy?'Incomplete · no video or quiz':'Course preview · video unavailable'];});
  });
  assert.deepEqual(allLessons,contentFacts,'All Content shows each stable mapped course once, its program links, version and honest availability');
  assert.equal(allLessons.length,await page.evaluate(()=>lessons.length),'Migration preserves every original lesson as incomplete metadata');
  const contentLink=programPage.locator('#program-page-panel tbody [data-open-program-page]').first();
  const contentProgram=await contentLink.getAttribute('data-open-program-page');
  await contentLink.click();
  await assertFullPage(contentProgram);
  assert.equal(await programPage.locator('#program-tab-content').getAttribute('aria-selected'),'true','Content program links preserve their section');
  await page.selectOption('#program-page-select','all');
  await programPage.locator('#program-tab-configuration').click();
  await programPage.locator('[data-open-program-page="speeding"][data-program-page-tab="configuration"]').click();
  await assertFullPage('speeding');
  assert.equal(await programPage.locator('#program-tab-configuration').getAttribute('aria-selected'),'true');
  await page.goto(base+'/?program=speeding&programTab=drivers#programs');
  assert.equal(await programPage.locator('#program-tab-overview').getAttribute('aria-selected'),'true','Removed Drivers links resolve to Overview without a blank page');

  await page.goto(base+'/?program=following&period=4#programs');
  await assertFullPage('following');
  assert.equal(await programPage.locator('#program-title').textContent(),'Programs');
  assert.equal(await page.locator('#program-page-select option:checked').textContent(),'Following distance','The selected program is named once in its native selector');
  assert.equal(await programPage.getAttribute('aria-labelledby'),'program-title');
  assert.equal(await page.inputValue('#program-record-view'),'all','A program starts with all coaching records visible');
  assert.deepEqual((await programPage.locator('[data-program-record]').evaluateAll(rows=>rows.map(row=>row.dataset.programRecord))).sort(),(await source('following',4)).ids.sort(),'The default coaching list keeps current work and completed history');
  assert.equal(await programPage.locator('[data-program-chart-view="trend"]').isChecked(),true,'A visible weekly trend is the default program graph');
  assert.equal(await programPage.locator('#program-rate-content .category-weekly-chart').isVisible(),true);
  const graphOrder=await programPage.evaluate(node=>({chart:node.querySelector('#program-rate-chart').getBoundingClientRect().bottom,coaching:node.querySelector('#program-coaching').getBoundingClientRect().top}));
  assert.ok(graphOrder.chart<=graphOrder.coaching,'The program graph appears above Coaching without overlapping it');
  assert.deepEqual(await programPage.locator('[role="tab"]').allTextContents(),['Overview','Content','Configuration']);
  await programPage.locator('#program-tab-overview').focus();
  await page.keyboard.press('ArrowRight');
  assert.equal(await page.evaluate(()=>document.activeElement.id),'program-tab-content');
  assert.equal(await programPage.locator('#program-tab-overview').getAttribute('aria-selected'),'true','Arrow keys move focus without changing view');
  await page.keyboard.press('Enter');
  assert.equal(await programPage.locator('#program-tab-content').getAttribute('aria-selected'),'true');
  assert.equal(new URL(page.url()).searchParams.get('programTab'),'content');
  await page.goBack();
  assert.equal(await programPage.locator('#program-tab-overview').getAttribute('aria-selected'),'true');
  await page.goForward();
  assert.equal(await programPage.locator('#program-tab-content').getAttribute('aria-selected'),'true');

  for(const weeks of [1,4,8]) {
    await programPage.locator('#program-tab-overview').click();
    await page.selectOption('#program-page-period',String(weeks));
    await programPage.locator('#program-tab-content').click();
    for(const {id,name} of programs) {
      await page.selectOption('#program-page-select',id);
      await assertFullPage(id);
      const facts=await source(id,weeks);
      assert.equal(await page.evaluate(()=>coachingPeriod),weeks,'Program switching on metadata retains the reporting period');
      assert.equal(await programPage.locator('#program-page-period,.kpi-strip,#program-page-scope').count(),0,'Content omits reporting-only controls and KPIs');
      assert.equal(await programPage.locator('#program-title').textContent(),'Programs','The page heading stays stable across program filters');
      assert.equal(await page.locator('#program-page-select option:checked').textContent(),name);
      assert.equal(await programPage.locator('#program-tab-content').getAttribute('aria-selected'),'true','Switching programs retains the selected section');
      assert.equal(await programPage.locator('#program-tab-drivers').count(),0,'Drivers remains in Analytics, not the Programs sections');
      await programPage.locator('#program-tab-overview').click();
      assert.equal(await page.inputValue('#program-page-period'),String(weeks),'Overview restores the retained period');
      await assertProgramKpis(facts);
      await programPage.locator('#program-tab-content').click();
    }
  }

  await page.selectOption('#program-page-select','speeding');
  await programPage.locator('#program-tab-overview').click();
  await page.selectOption('#program-page-period','4');
  const programFacts=await source('speeding',4);
  for(const [view,count] of [['all',programFacts.identified],['review',programFacts.review],['progress',programFacts.inProgress],['completed',programFacts.completed]]) {
    await page.selectOption('#program-record-view',view);
    assert.equal(await programPage.locator('[data-program-record]').count(),count,view+' filter shows source records');
  }
  await programPage.locator('[data-program-method="automated"]').click();
  assert.equal(await page.inputValue('#program-record-view'),'all');
  assert.equal(await page.inputValue('#program-record-method'),'automated');
  assert.equal(await programPage.locator('[data-program-record]').count(),programFacts.automated,'Automated total shortcut excludes flags and includes completed sessions');
  assert.ok((await programPage.locator('[data-program-record]').evaluateAll(rows=>rows.map(row=>row.dataset.programRecord))).every(id=>programFacts.actualIds.includes(id)));
  assert.equal(await programPage.locator('#program-page-outcomes').evaluate(node=>node.open),false,'Recorded outcomes stay collapsed until requested');
  await programPage.locator('#program-page-outcomes > summary').click();
  assert.equal(await programPage.locator('#program-page-outcome-sample').isVisible(),true);
  assert.match(await programPage.locator('#program-page-outcomes').textContent(),/not available/i);
  assert.equal(await programPage.locator('#program-page-outcomes .before-after-chart,#program-page-outcomes .category-weekly-chart').count(),0,'Missing cohort observations do not produce a fabricated impact chart');
  await selectChart('comparison');
  assert.equal(await programPage.locator('.before-after-chart').isVisible(),true,'Comparison remains available in the same graph card');
  await programPage.locator('.chart-summary summary').click();
  assert.match(await programPage.locator('.chart-summary').textContent(),/not outcomes attributable to a video or a coached cohort/);
  const rateFacts=await page.evaluate(()=>{const program=categories.find(item=>item.id==='speeding');return {before:program.weeklyRates[4],after:program.weeklyRates.at(-1)};});
  const rateCells=await programPage.locator('.chart-summary table tbody tr td:last-child').allTextContents();
  assert.deepEqual(rateCells.map(Number),[rateFacts.before,rateFacts.after]);
  await assertFullPage('speeding');
  await programPage.locator('#program-rate-plot').focus();
  await programPage.locator('.before-after-chart .ba-row').focus();
  assert.match(await page.locator('#ui-tooltip').textContent(),/Event rate: Before/);
  await programPage.locator('.before-after-chart .ba-after').click();
  await assertFullPage('speeding');
  await selectChart('trend');
  assert.equal(await programPage.locator('.before-after-chart').count(),0,'Changing mode replaces the plot instead of duplicating graphs');
  const trendSummary=programPage.locator('#program-rate-content .chart-summary');
  if(!await trendSummary.evaluate(node=>node.open))await trendSummary.locator('summary').click();
  const trendFacts=await page.evaluate(()=>categories.find(item=>item.id==='speeding').weeklyRates);
  assert.deepEqual((await trendSummary.locator('table tbody tr td:last-child').allTextContents()).map(Number),trendFacts,'Every observed week remains available in the trend data table');
  assert.match(await trendSummary.textContent(),/all eight weekly observations independently of the coaching-record period filter/,'The historical graph clearly describes its scope');
  await programPage.locator('.category-weekly-chart .chart-line-marker').first().focus();
  await programPage.locator('.category-weekly-chart .chart-line-marker').first().click();
  await assertFullPage('speeding');

  await programPage.locator('#program-tab-content').click();
  const titles=await page.evaluate(()=>{const policy=ProgramSetup.getPolicy('speeding'),courses=ProgramSetup.getCourses();return [...policy.courseIds,...policy.legacyCourseIds].map(id=>courses.find(course=>course.id===id).title);});
  assert.deepEqual(await programPage.locator('#program-page-panel table tbody tr th').allTextContents(),titles,'Selected Content follows stable course IDs and retains imported lesson metadata');
  assert.doesNotMatch(await programPage.locator('#program-page-panel').textContent(),/\d+%/,'Unlinked fixture completion percentages are omitted');
  await programPage.locator('#program-tab-configuration').click();
  const speedPolicy=await page.evaluate(()=>ProgramSetup.getPolicy('speeding'));
  assert.equal(await programPage.locator('[data-ps-field="scoreThreshold"]').inputValue(),String(speedPolicy.scoreThreshold),'A program owns its coaching threshold');
  for(const rule of speedPolicy.rules){
    assert.equal(await programPage.locator('[data-ps-rule="'+rule.ruleId+'"][data-ps-rule-field="severity"]').inputValue(),rule.severity,'Each preserved connected rule has an editable severity');
    assert.equal(await programPage.locator('[data-ps-rule="'+rule.ruleId+'"][data-ps-rule-field="allowance"]').inputValue(),String(rule.allowance),'Each rule retains its own tolerated event count');
    assert.equal(await programPage.locator('[data-ps-rule="'+rule.ruleId+'"][data-ps-rule-field="enabled"]').isChecked(),rule.enabled);
  }
  assert.match(await programPage.locator('#ps-review-title').locator('..').locator('..').textContent(),new RegExp('score below '+speedPolicy.scoreThreshold),'Configuration explains what happens in plain language');
  assert.equal(await programPage.locator('[data-ps-field="coach"]').inputValue(),speedPolicy.coach,'Manager exceptions route to the configured coach');
  assert.equal(await programPage.locator('[data-bulk-training]').count(),0,'Program review has no bulk coaching action');

  // Actual sessions and supported profiles open over Programs and restore their invoker.
  await page.goto(base+'/?program=distraction#programs');
  const sessionAction=programPage.locator('[data-open-session="rowan-distraction"]');
  await sessionAction.click();
  assert.equal(await page.locator('#driver-drawer').evaluate(node=>node.matches(':modal')),true);
  assert.equal(await page.evaluate(()=>activeSessionId),'rowan-distraction');
  await page.locator('#driver-drawer [data-close-drawer]').click();
  await page.waitForFunction(()=>document.activeElement?.getAttribute('data-open-session')==='rowan-distraction');
  await assertFullPage('distraction');
  await page.selectOption('#program-page-select','speeding'); // Priya is in the representative directory; most distraction names are not.
  const driverAction=programPage.locator('[data-open-driver-profile]').first();
  const driverName=await driverAction.getAttribute('data-open-driver-profile');
  await driverAction.click();
  assert.equal(await page.locator('#driver-drawer').evaluate(node=>node.classList.contains('is-profile')),true);
  assert.equal(new URL(page.url()).searchParams.get('driver'),driverName,'Program-origin profile links retain driver identity');
  await page.reload();
  assert.equal(await page.locator('#driver-drawer-title').textContent(),driverName,'Program/profile deep links rehydrate the portfolio');
  await page.locator('#driver-drawer [data-close-drawer]').click();
  await assertFullPage('speeding');

  // Analytics remains in primary navigation; only an actual source creates a Program Back action.
  await page.selectOption('#program-page-period','4');
  assert.equal(await programPage.locator('#program-reports-link').count(),0,'A duplicate Analytics shortcut is not needed inside Programs');
  await page.locator('.primary-nav [data-view="outcomes"]').click();
  await page.locator('#analytics-activity-tab').click();
  assert.equal(await page.locator('#analytics-activity .weekly-activity-chart').isVisible(),true,'The Activity graph remains reachable through primary navigation');
  assert.equal(await page.locator('#view-outcomes [data-coaching-period]').inputValue(),'4');
  await page.locator('#analytics-outcomes-tab').click();
  assert.equal(await page.locator('#analytics-outcomes .before-after-chart').isVisible(),true,'Outcomes retains its comparison graph');
  await page.locator('#analytics-outcomes [data-open-category="speeding"]').first().click();
  await assertFullPage('speeding');
  assert.equal(await page.inputValue('#program-page-period'),'4','Report drilldown preserves program and period');
  await programPage.locator('[data-back-program-page]').click();
  assert.equal(await page.locator('#analytics-outcomes').isVisible(),true,'Source Back restores the originating report');
  await page.goBack();
  await assertFullPage('speeding');

  // All states keep an explicit drawer action. Opening history must not create a new session.
  await page.selectOption('#program-page-select','following');
  await page.selectOption('#program-page-period','8');
  await page.selectOption('#program-record-view','all');
  await page.selectOption('#program-record-method','all');
  const recordActions=await page.evaluate(()=>{
    const records=sessions.filter(record=>record.categoryId==='following'&&(Number.isFinite(record.weeksAgo)?record.weeksAgo:0)<8);
    return ['system_handling','completed','archived'].map(state=>records.find(record=>record.state===state)).map(record=>({id:record.id,state:record.state}));
  });
  for(const record of recordActions) {
    const action=programPage.locator('[data-program-record="'+record.id+'"] [data-open-session]');
    assert.equal(await action.textContent(),'Open session');
    await action.click();
    const drawer=page.locator('#driver-drawer');
    assert.equal(await drawer.evaluate(node=>node.matches(':modal')&&node.classList.contains('is-session')),true);
    assert.equal(await page.evaluate(()=>activeSessionId),record.id);
    if(record.state!=='system_handling')assert.equal(await drawer.locator('#reply-text').count(),0,'Completed and archived sessions retain their read-only drawer');
    await drawer.locator('[data-close-drawer]').click();
    await page.waitForFunction(id=>document.activeElement?.getAttribute('data-open-session')===id,record.id);
    await assertFullPage('following');
  }

  await page.locator('.primary-nav [data-view="inbox"]').click();
  if(await page.locator('#session-applied-filters [data-clear-session-filters]').isVisible())await page.locator('#session-applied-filters [data-clear-session-filters]').click();
  await page.locator('#sessions-kpis [data-inbox-filter="all"]').click();
  const sessionsView=page.locator('#view-inbox');
  assert.equal((await sessionsView.locator('thead th').allTextContents()).at(-1),'Action','Sessions exposes a named Action column');
  for(const state of ['system_handling','completed']) {
    if(state==='completed')await page.locator('[data-session-filter="completed"]').locator('..').click();
    const id=await sessionsView.locator('.session-record').evaluateAll((rows,state)=>rows.map(row=>row.dataset.recordId).find(id=>sessions.some(record=>record.id===id&&record.state===state)),state);
    assert.ok(id,'A visible source record exists for '+state);
    const action=sessionsView.locator('[data-record-id="'+id+'"] td:last-child [data-open-session]');
    assert.equal(await action.textContent(),'Open session');
    await action.click();
    assert.equal(await page.evaluate(()=>activeSessionId),id);
    await page.locator('#driver-drawer [data-close-drawer]').click();
    await page.waitForFunction(id=>document.activeElement?.matches('#view-inbox td:last-child [data-open-session="'+id+'"]'),id);
    assert.equal(await sessionsView.isVisible(),true,'Closing returns to the Sessions list');
  }

  await page.locator('.primary-nav [data-view="outcomes"]').click();
  await page.locator('#analytics-drivers-tab').click();
  await page.locator('#driver-directory [data-open-driver-profile="Priya Singh"]').click();
  const profile=page.locator('#driver-drawer');
  assert.equal(await profile.locator('.profile-daily-chart').isVisible(),true,'The driver portfolio retains its daily graph');
  const profileGraph=await profile.locator('.profile-daily-chart').getAttribute('aria-label');
  await profile.locator('[data-profile-session="priya-speeding"] [data-open-session]').click();
  assert.equal(await page.evaluate(()=>activeSessionId),'priya-speeding');
  await profile.locator('[data-back-driver-profile]').click();
  assert.equal(await profile.locator('.profile-daily-chart').getAttribute('aria-label'),profileGraph,'Returning from a session retains the driver graph');
  await profile.locator('[data-close-drawer]').click();


  await page.goto(base+'/#drivers');
  await page.fill('#driver-search','Taylor');
  assert.equal(new URL(page.url()).searchParams.get('q'),'Taylor');
  await page.locator('.primary-nav [data-view="programs"]').click();
  await page.goBack();
  assert.equal(await page.inputValue('#driver-search'),'Taylor','Driver search survives navigation and browser Back');
  assert.equal(await page.locator('.primary-nav [data-view="outcomes"]').getAttribute('aria-current'),'page');
  assert.equal(await page.locator('#analytics-drivers-tab').getAttribute('aria-selected'),'true');
  for(const [path,tab] of [['/?analytics=drivers#analytics','drivers'],['/?analytics=groups#analytics','groups'],['/?analytics=activity#analytics','activity'],['/?analytics=outcomes#analytics','outcomes']]) {
    await page.goto(base+path);
    assert.equal(await page.evaluate(()=>analyticsTab),tab,'Legacy report deep links remain reachable');
    assert.equal(await page.locator('#view-outcomes').isVisible(),true);
  }

  for(const width of [1440,390,320]) {
    await page.setViewportSize({width,height:1000});
    for(const id of ['all','speeding']) {
      await page.goto(base+'/?program='+id+'#programs');
      await assertFullPage(id);
      for(const tab of ['overview','content','configuration']) {
        await programPage.locator('#program-tab-'+tab).click();
        await assertNoPageOverflow('Program '+id+' '+tab+' at '+width);
        assert.equal(await programPage.locator('#program-reports-link').count(),0,'Program sections omit redundant navigation');
        assert.equal(await programPage.locator('#program-title').textContent(),'Programs');
        if(tab==='overview'&&id!=='all')await assertTrendGeometry('Program trend at '+width);
        if(tab==='overview'&&id==='all'){await selectComparison('rates');assert.equal(await programPage.locator('#program-rate-chart .ba-row').count(),programs.length);await assertNoPageOverflow('All rates at '+width);await selectComparison('coaching');}
        const strip=programPage.locator('.kpi-strip');
        assert.equal(await strip.count(),tab==='overview'?1:0,'Only Overview shows coaching metrics');
        assert.equal(await programPage.locator('#program-page-period,#program-page-scope').count(),tab==='overview'?2:0);
        if(tab==='overview')assert.equal(await strip.evaluate(node=>getComputedStyle(node).flexWrap),'nowrap');
        for(const table of await programPage.locator('table:visible').all())assert.equal(await table.evaluate(node=>node.tagName==='TABLE'&&node.tHead.rows[0].cells.length>0),true,'Program data keeps native table semantics');
      }
    }
    await page.goto(base+'/?program=speeding#automation');
    await assertNoPageOverflow('Program-scoped landing at '+width);
  }
  await page.setViewportSize({width:390,height:1000});
  await page.goto(base+'/?program=all&programComparison=rates#programs');
  await page.evaluate(()=>document.documentElement.style.fontSize='200%');
  assert.equal(await assertBeforeAfterText(page,'All-program comparison at 390px'),programs.length,'Every program remains readable at enlarged text size');
  await assertNoPageOverflow('All-program comparison at 200% text zoom');
  await page.setViewportSize({width:390,height:1000});
  await page.goto(base+'/?program=speeding#programs');
  await page.evaluate(()=>document.documentElement.style.fontSize='200%');
  await assertTrendGeometry('Program trend at 390px and 200% text zoom');
  await selectChart('comparison');
  assert.equal(await assertBeforeAfterText(page,'Program overview at 390px'),1,'Program chart scales its two series with enlarged text');
  await assertNoPageOverflow('Program overview at 200% text zoom');
  assert.deepEqual(errors,[]);
  console.log('Passed: All-program default, six reconciled KPIs and all 10 comparisons across 1/4/8 weeks, signed sorting, coaching disclosures and exact driver focus return, three-tab source-backed Content/Configuration, scope/history and detail drilldowns, retained reports/session drawers, and all/selected responsive charts including 200% text zoom.');
} finally {await browser.close();}
