// Program configuration acceptance: programs own thresholds, rules and coach routing; the
// overview has no per-driver spotlight and nothing "awaits" a session. Local prototype only.
import assert from 'node:assert/strict';
const {chromium}=await import(process.env.PLAYWRIGHT_MODULE||'playwright');
const browser=await chromium.launch({headless:true,channel:process.env.BROWSER_CHANNEL||'chrome'});
const base=process.env.BASE_URL||'http://localhost:5173';
const page=await browser.newPage({viewport:{width:1440,height:1000},reducedMotion:'reduce'});
page.setDefaultTimeout(10000);
await page.route('**/*',route=>['localhost','127.0.0.1','[::1]'].includes(new URL(route.request().url()).hostname)?route.continue():route.abort());
const errors=[];page.on('pageerror',error=>errors.push(error.message));
page.on('dialog',dialog=>dialog.accept());
const config=page.locator('#program-configuration');
const stored=key=>page.evaluate(key=>JSON.parse(localStorage.getItem(key)||'null'),key);
try {
  // Overview: three human states, no featured driver, no pending-session concept.
  await page.goto(base+'/#automation');
  assert.equal(await page.locator('.attention-next, #ai-priority-name, #ai-priority-review').count(),0,'The overview does not single out one driver');
  assert.deepEqual(await page.locator('.attention-row .attention-row-label').allTextContents(),['Overdue','Repeated','Replied'],'Needs you lists the states a person must act on');
  assert.equal(await page.locator('.automation-row.is-pending, #automation-week-pending').count(),0,'Nothing awaits a session');
  assert.deepEqual(await page.locator('.automation-row .automation-row-label').allTextContents(),['Started automatically','Started by a manager']);
  assert.doesNotMatch(await page.locator('#view-coaching').textContent(),/Session needed|Awaiting session/);
  assert.equal(await page.evaluate(()=>reviewCandidates.length),0);

  // Settings keeps only automation mode and cadence.
  await page.goto(base+'/#settings');
  assert.equal(await page.locator('#view-settings input[type="number"], #view-settings [data-add-event-type], #view-settings [data-add-rule], #event-type-rows, #rule-rows').count(),0,'Rules and event types are not edited in Settings');
  assert.ok(await page.locator('#view-settings [data-automation-mode]').count()>=3);
  assert.ok(await page.locator('#view-settings [data-cadence]').count()>=2);

  // All programs: one configuration table with threshold, rule count and coach per program.
  await page.goto(base+'/?program=all&programTab=configuration#programs');
  const programCount=await page.evaluate(()=>categories.length);
  assert.deepEqual(await config.locator('thead th').allTextContents(),['Program','Threshold','Rules','One-on-one coach','Lessons','Delete']);
  assert.equal(await config.locator('tbody tr').count(),programCount);
  assert.equal(await config.locator('[data-delete-program]').count(),programCount,'Every program can be deleted');
  assert.equal(await page.locator('#program-proposal').count(),0,'The read-only proposal is replaced by real configuration');

  // Create a program.
  await config.locator('[data-add-program]').click();
  await page.waitForFunction(()=>document.activeElement?.name==='name');
  await page.fill('#program-create-form [name="name"]','Lane discipline');
  await page.locator('#program-create-form button[type="submit"]').click();
  await page.waitForFunction(()=>selectedProgramId==='lane-discipline');
  assert.equal(await page.inputValue('#program-page-select'),'lane-discipline','Creating a program opens its configuration');
  assert.equal(new URL(page.url()).searchParams.get('programTab'),'configuration');
  assert.deepEqual(await stored('elevate-custom-programs'),[{id:'lane-discipline',name:'Lane discipline'}]);
  assert.match(await config.textContent(),/No rules yet/);

  // Add, edit, toggle and delete a rule; each rule has a severity and a threshold.
  await config.locator('[data-add-program-rule]').click();
  await page.fill('#program-rule-form [name="name"]','Lane departure');
  await page.selectOption('#program-rule-form [name="severity"]','High');
  await page.fill('#program-rule-form [name="threshold"]','3');
  await page.locator('#program-rule-form button[type="submit"]').click();
  await page.waitForSelector('#program-configuration [data-program-rule]');
  const rule=await page.evaluate(()=>eventTypeRules.find(item=>item.programId==='lane-discipline'));
  assert.deepEqual({name:rule.name,severity:rule.severity,threshold:rule.threshold,enabled:rule.enabled},{name:'Lane departure',severity:'High',threshold:3,enabled:true});
  await page.selectOption('#program-configuration [data-program-rule-field="severity"]','Low');
  await page.fill('#program-configuration [data-program-rule-field="threshold"]','8');
  await page.locator('#program-configuration [data-program-rule-field="threshold"]').press('Tab');
  await page.waitForFunction(()=>eventTypeRules.find(item=>item.programId==='lane-discipline')?.threshold===8);
  assert.equal(await page.evaluate(()=>eventTypeRules.find(item=>item.programId==='lane-discipline').severity),'Low');
  assert.equal((await stored('elevate-event-types')).find(item=>item.programId==='lane-discipline').threshold,8,'Rule edits persist immediately');
  await config.locator('[data-program-rule-field="enabled"]').uncheck();
  await page.waitForFunction(()=>eventTypeRules.find(item=>item.programId==='lane-discipline')?.enabled===false);
  assert.match(await page.locator('#program-flow-copy').textContent(),/0 active rules/);

  // Program threshold and coach routing, one coach or per group.
  await page.fill('#program-configuration [data-program-threshold]','60');
  await page.locator('#program-configuration [data-program-threshold]').press('Tab');
  await page.waitForFunction(()=>document.getElementById('program-flow-copy')?.textContent.includes('falls below 60'));
  assert.equal((await stored('elevate-program-settings'))['lane-discipline'].threshold,60);
  await page.selectOption('#program-configuration [data-program-coach]','Morgan Chen');
  await page.waitForFunction(()=>document.getElementById('program-flow-copy')?.textContent.includes('one-on-one with Morgan Chen'));
  await page.locator('#program-coach-mode [data-program-coach-mode="group"]').locator('..').click();
  await page.waitForSelector('#program-configuration [data-program-group-coach]');
  const groups=await page.evaluate(()=>Object.keys(groupComparisonData));
  assert.equal(await config.locator('[data-program-group-coach]').count(),groups.length,'A coach can be set for every group');
  await page.selectOption('#program-configuration [data-program-group-coach="'+groups[0]+'"]','Alex Kim');
  await page.waitForFunction(()=>true);
  const saved=await stored('elevate-program-settings');
  assert.equal(saved['lane-discipline'].coachMode,'group');
  assert.equal(saved['lane-discipline'].groupCoaches[groups[0]],'Alex Kim');
  assert.match(await page.locator('#program-flow-copy').textContent(),/coach set for the driver’s group/);

  // Delete the rule, then reload: the program, rule set and settings survive.
  await config.locator('[data-remove-program-rule]').click();
  await page.waitForFunction(()=>!eventTypeRules.some(item=>item.programId==='lane-discipline'));
  await page.reload();
  await page.waitForSelector('#program-configuration');
  assert.equal(await page.inputValue('#program-page-select'),'lane-discipline','A created program survives reload');
  assert.equal(await page.inputValue('#program-configuration [data-program-threshold]'),'60');
  assert.ok((await page.locator('#landing-program-filter option').allTextContents()).includes('Lane discipline'),'The overview program filter lists the new program');

  // Delete a fixture program with coaching records: its records leave the workspace without errors.
  await page.goto(base+'/?program=all&programTab=configuration#programs');
  const before=await page.evaluate(()=>({programs:categories.length,sessions:sessions.length,backing:sessions.filter(item=>item.categoryId==='backing').length}));
  await config.locator('[data-delete-program="backing"]').click();
  await page.waitForFunction(()=>!categories.some(item=>item.id==='backing'));
  const after=await page.evaluate(()=>({programs:categories.length,sessions:sessions.length}));
  assert.deepEqual(after,{programs:before.programs-1,sessions:before.sessions-before.backing});
  assert.equal(await config.locator('tbody tr').count(),before.programs-1);
  assert.deepEqual(await stored('elevate-deleted-programs'),['backing']);
  await config.locator('[data-delete-program="lane-discipline"]').click();
  await page.waitForFunction(()=>!categories.some(item=>item.id==='lane-discipline'));
  assert.deepEqual(await stored('elevate-custom-programs'),[],'Deleting a created program forgets it instead of listing it as deleted');
  for(const hash of ['#automation','#sessions','?analytics=drivers#analytics','?analytics=groups#analytics','#programs']) {
    await page.goto(base+'/'+hash);
    await page.waitForSelector('.app-view.is-active');
  }
  assert.equal(await page.evaluate(()=>categories.some(item=>item.id==='backing')),false,'A deleted program stays deleted across pages and reloads');
  await page.evaluate(()=>localStorage.clear());
  await page.reload();
  assert.equal(await page.evaluate(()=>categories.length),programCount,'Clearing local state restores the fixture programs');
  assert.deepEqual(errors,[],'No page errors');
  console.log('program configuration acceptance passed');
} finally {
  await browser.close();
}
