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
const selectComparison=async mode=>{
  const control=programPage.locator('[data-program-comparison-view="'+mode+'"]');
  await control.locator('..').click();
  assert.equal(await control.isChecked(),true,'The comparison module exposes its selected native radio');
  assert.equal(await programPage.locator('#program-comparison-table').isVisible(),mode==='coaching');
  assert.equal(await programPage.locator('#program-rate-chart').isVisible(),mode==='rates','Only one representation of the comparison is visible');
};
const assertTrendGeometry=async label=>{
  await page.evaluate(()=>new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve))));
  const geometry=await programPage.locator('#program-activity-plot .weekly-activity-chart').evaluate(svg=>{
    const box=svg.getBoundingClientRect(),plot=svg.closest('.chart-plot');
    const labels=[...svg.querySelectorAll('text.activity-week-label')].map(text=>{
      const {left,right}=text.getBoundingClientRect();return {left,right};
    });
    return {width:box.width,minimum:440*Math.max(1,parseFloat(getComputedStyle(document.documentElement).fontSize)/16),scroll:plot.scrollWidth,viewport:plot.clientWidth,labels};
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
  const automatic=actual.filter(record=>sessionDeliveryMode(record)==='automated'),manual=actual.filter(record=>sessionDeliveryMode(record)==='one_on_one');
  const rates=categories.find(program=>program.id===id)?.weeklyRates;
  const before=rates?.[rates.length-(weeks===1?2:weeks)],after=rates?.at(-1);
  return {id,name:categories.find(program=>program.id===id)?.name,score:typeof programScore==='function'?programScore(categories.find(program=>program.id===id)):null,ids:actual.concat(flags).map(record=>record.id),actualIds:actual.map(record=>record.id),identified:actual.length+flags.length,actual:actual.length,flags:flags.length,inProgress:active.length,review:review.length+flags.length,completed:completed.length,automated:automatic.length,manual:manual.length,activeAutomated:active.filter(record=>sessionDeliveryMode(record)==='automated').length,activeManual:active.filter(record=>sessionDeliveryMode(record)==='one_on_one').length,stageIds:{all:actual.concat(flags).map(record=>record.id),progress:active.map(record=>record.id),review:review.concat(flags).map(record=>record.id),completed:completed.map(record=>record.id)},originIds:{automated:automatic.map(record=>record.id),manual_override:manual.map(record=>record.id)},before,after,change:before?Math.round((after-before)/before*100):null,completion:actual.length+flags.length?Math.round(completed.length/(actual.length+flags.length)*100):null};
},{id,weeks});
const assertProgramKpis=async facts=>{
  const metrics=await page.locator('#program-page-kpis .kpi-tile').evaluateAll(tiles=>Object.fromEntries(tiles.map(tile=>[tile.querySelector('.kpi-label > span').textContent,tile.querySelector('.kpi-value').textContent])));
  assert.deepEqual(metrics,{Identified:String(facts.identified),'In progress':String(facts.inProgress),'Needs review':String(facts.review),'Automated sessions':String(facts.automated),'One-on-one sessions':String(facts.manual),[facts.id==='all'?'Elevate score':facts.name+' score']:facts.id==='all'?'74':(facts.score===null?'—':String(facts.score)),Completed:String(facts.completed)},'Program KPIs preserve total method counts and mutually exclusive workflow stages');
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
  assert.deepEqual((await page.locator('.primary-nav a[data-view]').evaluateAll(nodes=>nodes.map(node=>node.dataset.view))).filter(view=>view!=='driver').sort(),['coaching','inbox','programs','drivers','library'].sort());
  assert.equal(await page.locator('.primary-nav a[data-view="outcomes"]').count(),0,'Analytics is consolidated into the Programmes workspace');
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
        assert.equal(await page.locator('#kpi-fleet-safety').textContent(),facts.score===null?'—':String(facts.score),'A scoped landing shows the recorded program score, or an explicit dash');
        assert.match(await page.locator('#landing-score-hint').getAttribute('data-tooltip'),/recorded prototype score|no recorded score/i);
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
  assert.deepEqual(await programPage.locator('[role="tab"]').allTextContents(),['Activity','Learning','Configuration','Automation']);
  assert.equal(await programPage.locator('#program-coaching-disclosure,#program-record-view').count(),0,'Coaching records live in Sessions, not on Programs');

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
    assert.deepEqual(tableHeaders,['Program','Needs review','In progress','Completed','Automated sessions','One-on-one sessions','Event-rate change','Score'],'The compact comparison keeps independent workflow and method columns plus the recorded score');
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
    const changeHeader=programPage.locator('#program-comparison-table thead th').nth(6);
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
    await programPage.locator('[data-program-attention]').click();
    assert.equal(await page.evaluate(()=>document.activeElement.id),'program-activity-attention-title','Needs review focuses the on-page attention list');
    assert.equal(await programPage.locator('#program-activity-attention').getAttribute('data-attention-session-count'),String(facts.review),'The attention list reconciles every review session');
    await programPage.locator('#program-activity-attention [data-view-link="inbox"]').click();
    assert.equal(new URL(page.url()).hash,'#sessions');
    assert.deepEqual((await page.locator('.session-record').evaluateAll(rows=>rows.map(row=>row.dataset.recordId))).sort(),facts.stageIds.review.slice().sort(),'View all in Sessions retains review scope');
    await page.goBack();await assertFullPage('all');
    for(const [filter,origin,expected] of [['all','',facts.stageIds.all],['system_handling','',facts.stageIds.progress],['completed','',facts.stageIds.completed],['all','automated',facts.originIds.automated],['all','manual_override',facts.originIds.manual_override]]) {
      await programPage.locator('#program-page-kpis [data-inbox-filter="'+filter+'"]'+(origin?'[data-inbox-origin="'+origin+'"]':':not([data-inbox-origin])')).click();
      assert.equal(new URL(page.url()).hash,'#sessions','Program KPI shortcuts open Sessions');
      assert.ok((await page.locator('.session-footer').textContent()).includes(' '+expected.length+' records'),'The Sessions list keeps the program period and record grain');
      const shown=await page.locator('.session-record').evaluateAll(rows=>rows.map(row=>row.dataset.recordId));
      assert.ok(shown.every(id=>expected.includes(id)),'Every listed session belongs to the shortcut scope');
      await page.goBack();await assertFullPage('all');
    }
  }


  // Comparison rows and the selector enter a full program detail; primary navigation returns to All.
  await programPage.locator('[data-program-comparison="following"] [data-open-program-page="following"]').click();
  await assertFullPage('following');
  assert.equal(await page.inputValue('#program-page-period'),'8');
  await programPage.locator('#program-tab-configuration').click();
  await page.locator('.primary-nav [data-view="programs"]').click();
  await assertFullPage('all');
  assert.equal(await programPage.locator('#program-tab-activity').getAttribute('aria-selected'),'true','Primary Programs entry resets to the all-program overview');
  assert.equal(await page.inputValue('#program-page-period'),'8');
  await page.goBack();
  await assertFullPage('following');
  assert.equal(await programPage.locator('#program-tab-configuration').getAttribute('aria-selected'),'true','Browser Back restores the selected program and section');
  await page.selectOption('#program-page-select','all');
  assert.equal(new URL(page.url()).searchParams.get('program'),'all');
  assert.equal(await programPage.locator('#program-tab-configuration').getAttribute('aria-selected'),'true','Changing program scope retains Configuration');
  const configurationRows=await programPage.locator('[data-program-configuration]').evaluateAll(rows=>rows.map(row=>[row.dataset.programConfiguration,Number(row.cells[1].textContent),Number(row.cells[2].textContent),row.cells[3].textContent,row.cells[4].textContent,Number(row.cells[5].textContent)]));
  const configurationFacts=await page.evaluate(()=>categories.map(program=>{const cfg=programSettingFor(program.id);return [program.id,cfg.threshold,eventTypeRules.filter(rule=>rule.programId===program.id).length,programPolicyPeriodLabel(program.id),programCoachLabel(program),learningLessonsForProgram(program.id).length];}));
  assert.deepEqual(configurationRows,configurationFacts,'All Configuration lists each program’s threshold, rules, escalation, coach and lesson mappings');
  await programPage.locator('#program-tab-content').click();
  const allLessons=await programPage.locator('[data-program-lesson]').evaluateAll(rows=>rows.map(row=>[row.cells[0].textContent,row.cells[1].textContent]));
  assert.deepEqual(allLessons,await page.evaluate(()=>lessons.filter(lesson=>learningMappings(lesson).length).map(lesson=>[lesson.title,learningMappings(lesson).map(mapping=>mapping.programName+' · Level '+mapping.level).join('')])),'All Content shows every source lesson once with its program');
  const contentLink=programPage.locator('[data-program-lesson] [data-open-program-page]').first();
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
  assert.equal(await programPage.locator('#program-tab-activity').getAttribute('aria-selected'),'true','Removed Drivers links resolve to Overview without a blank page');

  await page.goto(base+'/?program=following&period=4#programs');
  await assertFullPage('following');
  assert.equal(await programPage.locator('#program-title').textContent(),'Programmes');
  assert.equal(await page.locator('#program-page-select option:checked').textContent(),'Following distance','The selected program is named once in its native selector');
  assert.equal(await programPage.getAttribute('aria-labelledby'),'program-title');
  assert.equal(await programPage.locator('#program-rate-chart,[data-program-chart-view]').count(),0,'Selected programmes omit the separate event-rate card');
  assert.equal(await programPage.locator('#program-activity-plot .weekly-activity-chart').isVisible(),true);
  const graphOrder=await programPage.evaluate(node=>({chart:node.querySelector('.program-activity-layout').getBoundingClientRect().bottom,outcomes:node.querySelector('#program-page-outcomes').getBoundingClientRect().top}));
  assert.ok(graphOrder.chart<=graphOrder.outcomes,'The program graph appears above Recorded outcomes without overlapping it');
  assert.equal(await programPage.locator('#program-coaching,#program-record-view').count(),0,'A selected program no longer repeats its session list; Sessions owns it');
  assert.deepEqual(await programPage.locator('[role="tab"]').allTextContents(),['Activity','Learning','Configuration','Automation']);
  await programPage.locator('#program-tab-activity').focus();
  await page.keyboard.press('ArrowRight');
  assert.equal(await page.evaluate(()=>document.activeElement.id),'program-tab-content');
  assert.equal(await programPage.locator('#program-tab-activity').getAttribute('aria-selected'),'true','Arrow keys move focus without changing view');
  await page.keyboard.press('Enter');
  assert.equal(await programPage.locator('#program-tab-content').getAttribute('aria-selected'),'true');
  assert.equal(new URL(page.url()).searchParams.get('programTab'),'content');
  await page.goBack();
  assert.equal(await programPage.locator('#program-tab-activity').getAttribute('aria-selected'),'true');
  await page.goForward();
  assert.equal(await programPage.locator('#program-tab-content').getAttribute('aria-selected'),'true');

  for(const weeks of [1,4,8]) {
    await programPage.locator('#program-tab-activity').click();
    await page.selectOption('#program-page-period',String(weeks));
    await programPage.locator('#program-tab-content').click();
    for(const {id,name} of programs) {
      await page.selectOption('#program-page-select',id);
      await assertFullPage(id);
      const facts=await source(id,weeks);
      assert.equal(await page.evaluate(()=>coachingPeriod),weeks,'Program switching on metadata retains the reporting period');
      assert.equal(await programPage.locator('#program-page-period,#program-page-kpis,#program-page-scope').count(),0,'Content omits reporting-only controls and KPIs');
      assert.equal(await programPage.locator('#program-title').textContent(),'Programmes','The page heading stays stable across program filters');
      assert.equal(await page.locator('#program-page-select option:checked').textContent(),name);
      assert.equal(await programPage.locator('#program-tab-content').getAttribute('aria-selected'),'true','Switching programs retains the selected section');
      assert.equal(await programPage.locator('#program-tab-drivers').count(),0,'Drivers is independent of the Programme sections');
      await programPage.locator('#program-tab-activity').click();
      assert.equal(await page.inputValue('#program-page-period'),String(weeks),'Overview restores the retained period');
      await assertProgramKpis(facts);
      await programPage.locator('#program-tab-content').click();
    }
  }

  await page.selectOption('#program-page-select','speeding');
  await programPage.locator('#program-tab-activity').click();
  await page.selectOption('#program-page-period','4');
  const programFacts=await source('speeding',4);
  assert.equal(await programPage.locator('#program-page-outcomes').evaluate(node=>node.open),false,'Recorded outcomes stay collapsed until requested');
  await programPage.locator('#program-page-outcomes > summary').click();
  assert.equal(await programPage.locator('#program-page-outcome-sample').isVisible(),true);
  assert.match(await programPage.locator('#program-page-outcomes').textContent(),/unavailable|no recorded cohort dates/i);
  assert.equal(await programPage.locator('#program-page-outcomes .before-after-chart,#program-page-outcomes .category-weekly-chart').count(),0,'Missing cohort observations do not produce a fabricated impact chart');
  assert.equal(await programPage.locator('#program-rate-chart,[data-program-chart-view]').count(),0,'The selected programme has one weekly coaching chart');
  const weeklySummary=programPage.locator('#program-activity-chart .chart-summary');
  await weeklySummary.locator('summary').click();
  assert.match(await weeklySummary.textContent(),/illustrative sample history/,'Sample provenance stays with the retained weekly chart');
  const weeklyFacts=await page.evaluate(()=>programActivityWeeks(categories.find(item=>item.id==='speeding')).map(week=>[week.automated,week.oneToOne,week.score]));
  const weeklyRows=await weeklySummary.locator('table tbody tr').evaluateAll(rows=>rows.map(row=>[...row.cells].slice(1).map(cell=>Number(cell.textContent))));
  assert.deepEqual(weeklyRows,weeklyFacts,'Retained weekly coaching and score data stays available in the native disclosure');
  await programPage.locator('#program-activity-plot .weekly-bars [tabindex]').first().focus();
  assert.match(await page.locator('#ui-tooltip').textContent(),/in-progress sessions/);
  await programPage.locator('#program-activity-plot .weekly-bars [tabindex]').first().click();
  await assertFullPage('speeding');
  // Event rates remain available once, in the all-programme comparison.
  await page.selectOption('#program-page-select','all');await selectComparison('rates');
  const rateFacts=await page.evaluate(()=>{const program=categories.find(item=>item.id==='speeding');return {before:program.weeklyRates[4],after:program.weeklyRates.at(-1)};});
  const rateRow=programPage.locator('.before-after-chart .ba-row').filter({has:page.locator('.ba-label',{hasText:/^Speeding$/})});
  assert.deepEqual((await rateRow.locator('.ba-value').allTextContents()).map(Number),[rateFacts.before,rateFacts.after],'All-programme comparison retains selected-period Speeding rates');
  await rateRow.focus();assert.match(await page.locator('#ui-tooltip').textContent(),/Speeding: Before/);
  await rateRow.locator('.ba-after').click();await assertFullPage('all');
  await page.selectOption('#program-page-select','speeding');

  await programPage.locator('#program-tab-content').click();
  const titles=await page.evaluate(()=>learningLessonsForProgram('speeding').map(lesson=>lesson.title));
  assert.deepEqual(await programPage.locator('#program-page-panel table tbody tr td:first-child').allTextContents(),titles,'Only recorded mapped lesson metadata is shown');
  assert.doesNotMatch(await programPage.locator('#program-page-panel').textContent(),/\d+%/,'Unlinked fixture completion percentages are omitted');
  await programPage.locator('#program-tab-configuration').click();
  assert.equal(await programPage.locator('#program-configuration [data-program-threshold]').count(),1,'A program owns its coaching threshold');
  assert.equal(await programPage.locator('#program-configuration [data-program-rule-field="severity"]').count(),2,'Each Speeding rule has an editable severity');
  assert.equal(await programPage.locator('#program-configuration [data-program-rule-field="threshold"]').count(),2,'Each rule has its own threshold');
  assert.equal(await programPage.locator('#program-configuration [data-program-rule-field="weight"]').count(),2,'Each rule has an editable weight');
  assert.equal(await programPage.locator('#program-configuration [data-program-rule-field="direct"]').count(),2,'Each rule can escalate directly to a one-on-one');
  assert.deepEqual(await programPage.locator('#program-configuration [data-program-escalation]').evaluateAll(nodes=>nodes.map(node=>node.dataset.programEscalation)),['minTrips'],'The previous minimum-trip exposure preference remains inside Evaluation details');
  assert.match(await programPage.locator('#program-flow-copy').getAttribute('data-tooltip'),/below 75/,'Configuration explains what happens in plain language');
  assert.deepEqual(await programPage.locator('[data-program-policy]').evaluateAll(nodes=>nodes.map(node=>node.dataset.programPolicy)),['basis','window','resetPeriods','graceDays','reminderCount'],'Programme configuration exposes its period, reset and completion policy');
  assert.equal(await programPage.locator('#program-configuration [data-program-coach]').count(),1,'One-on-ones route to a named coach');
  assert.equal(await programPage.locator('[data-bulk-training]').count(),0,'Program review has no bulk coaching action');


  // The combined Activity retains both graphs and source return without duplicate navigation.
  await page.goto(base+'/?program=speeding#programs');
  await page.selectOption('#program-page-period','4');
  assert.equal(await programPage.locator('#program-reports-link').count(),0,'There is no duplicate Analytics shortcut');
  await page.locator('.primary-nav [data-view="programs"]').click();
  assert.equal(await programPage.locator('#program-activity-plot .weekly-activity-chart').isVisible(),true,'Activity graph remains reachable through primary navigation');
  assert.equal(await page.inputValue('#program-page-period'),'4');
  await selectComparison('rates');
  assert.equal(await programPage.locator('#program-rate-chart .before-after-chart').isVisible(),true,'Former Outcomes comparison remains in the same workspace');
  await selectComparison('coaching');
  const sourceControl=programPage.locator('#program-comparison-table [data-open-program-page="speeding"]');
  await sourceControl.click();await assertFullPage('speeding');
  assert.equal(await page.inputValue('#program-page-period'),'4','Drilldown preserves programme and period');
  await programPage.locator('[data-back-program-page]').click();
  assert.equal(await programPage.locator('#program-comparison-table').isVisible(),true,'Source Back restores All programmes');
  await page.waitForFunction(()=>document.activeElement?.dataset.openProgramPage==='speeding');
  await page.goBack();await assertFullPage('speeding');

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

  await page.locator('.primary-nav [data-view="drivers"]').click();
  await page.locator('#driver-directory [data-open-driver-profile="Priya Singh"]').click();
  const profile=page.locator('#driver-drawer');
  assert.equal(await profile.locator('.profile-daily-chart').isVisible(),true,'The driver portfolio retains its daily graph');
  const profileGraph=await profile.locator('.profile-daily-chart').getAttribute('aria-label');
  await profile.locator('#profile-programme-session-speeding[data-open-session="priya-speeding"]').click();
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
  assert.equal(await page.locator('.primary-nav [data-view="drivers"]').getAttribute('aria-current'),'page');
  assert.equal(await page.locator('#view-drivers').isVisible(),true);
  for(const [path,tab] of [['/?analytics=drivers#analytics','drivers'],['/?analytics=groups#analytics','groups'],['/?analytics=activity#analytics','activity'],['/?analytics=outcomes#analytics','outcomes']]) {
    await page.goto(base+path);
    assert.equal(await page.evaluate(()=>currentView),['drivers','groups'].includes(tab)?'drivers':'programs','Legacy report deep links resolve to their canonical workspace');
    if(tab==='groups')assert.equal(await page.evaluate(()=>driversTab),'groups');
    if(!['drivers','groups'].includes(tab))assert.equal(await page.evaluate(()=>programTab),'activity');
    assert.equal(await page.locator('#view-outcomes').isVisible(),false,'No obsolete Analytics page is shown');
  }

  for(const width of [1440,390,320]) {
    await page.setViewportSize({width,height:1000});
    for(const id of ['all','speeding']) {
      await page.goto(base+'/?program='+id+'#programs');
      await assertFullPage(id);
      for(const tab of ['activity','content','configuration','automation']) {
        await programPage.locator('#program-tab-'+tab).click();
        await assertNoPageOverflow('Program '+id+' '+tab+' at '+width);
        assert.equal(await programPage.locator('#program-reports-link').count(),0,'Program sections omit redundant navigation');
        assert.equal(await programPage.locator('#program-title').textContent(),'Programmes');
        if(tab==='automation')assert.ok(await programPage.locator('#program-automation [data-automation-mode]').count()>=3,'Automation is a Programs section');
        if(tab==='activity'&&id!=='all')await assertTrendGeometry('Program trend at '+width);
        if(tab==='activity'&&id==='all'){await selectComparison('rates');assert.equal(await programPage.locator('#program-rate-chart .ba-row').count(),programs.length);await assertNoPageOverflow('All rates at '+width);await selectComparison('coaching');}
        const strip=programPage.locator('.kpi-strip:visible');
        assert.equal(await strip.count(),tab==='activity'?1:0,'Reporting tabs show exactly their own scoped KPI strip');
        assert.equal(await programPage.locator('#program-page-period,#program-page-scope').count(),tab==='activity'?2:0);
        if(tab==='activity')assert.equal(await strip.evaluate(node=>getComputedStyle(node).flexWrap),'nowrap');
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
  assert.equal(await programPage.locator('#program-rate-chart').count(),0,'Text zoom does not restore the removed selected programme card');
  await assertNoPageOverflow('Program overview at 200% text zoom');
  assert.deepEqual(errors,[]);
  console.log('Passed: All-program default, reconciled lifecycle/method/score KPIs and all 10 comparisons across 1/4/8 weeks, signed sorting, attention shortcuts and source focus return, four-tab source-backed Learning/Configuration/Automation with Groups under Drivers, scope/history and detail drilldowns, retained report data and session drawers, and all/selected responsive charts including 200% text zoom.');
} finally {await browser.close();}
