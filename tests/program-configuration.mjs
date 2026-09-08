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
  assert.deepEqual(await page.locator('#view-coaching .attention-row .attention-row-label').allTextContents(),['Overdue','Repeated','Replied'],'Needs you lists the states a person must act on');
  assert.equal(await page.locator('.automation-row.is-pending, #automation-week-pending').count(),0,'Nothing awaits a session');
  assert.deepEqual(await page.locator('.automation-row .automation-row-label').allTextContents(),['Automated sessions','One-on-one sessions']);
  assert.doesNotMatch(await page.locator('#view-coaching').textContent(),/Session needed|Awaiting session/);
  assert.equal(await page.evaluate(()=>reviewCandidates.length),0);

  // There is no Settings page: fleet-wide automation mode and cadence live on Programs › Automation.
  assert.equal(await page.locator('.primary-nav [data-view="settings"], #view-settings').count(),0,'Settings is not a destination');
  await page.goto(base+'/#settings');
  await page.waitForSelector('#program-automation');
  assert.equal(await page.locator('#view-programs [role="tab"][aria-selected="true"]').textContent(),'Automation','Legacy Settings links resolve to Programs › Automation');
  assert.equal(await page.locator('#program-automation [data-add-program-rule], #program-automation [data-program-rule]').count(),0,'Rules and thresholds are not edited on the fleet-wide tab');
  assert.ok(await page.locator('#program-automation [data-automation-mode]').count()>=3);
  assert.ok(await page.locator('#program-automation [data-cadence]').count()>=2);
  assert.equal(await page.locator('#program-automation #session-due-days').count(),1,'One fleet-wide due period is configured in Automation');
  assert.equal(await page.locator('#session-due-days').inputValue(),'7','New sessions retain the one-week default');
  assert.equal(await page.locator('#settings-save').isDisabled(),true,'Nothing to save until the draft changes');

  // All programs: one configuration table with threshold, rule count and coach per program.
  await page.goto(base+'/?program=all&programTab=configuration#programs');
  const programCount=await page.evaluate(()=>categories.length);
  assert.deepEqual(await config.locator('thead th').allTextContents(),['Program','Threshold','Rules','Evaluation period','One-on-one coach','Lessons','Delete']);
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

  // Add, edit, toggle and delete a rule; each rule has a source, severity, weight and threshold.
  await config.locator('[data-add-program-rule]').click();
  await page.selectOption('#program-rule-form [name="source"]','Geotab|Harsh cornering');
  assert.equal(await page.inputValue('#program-rule-form [name="name"]'),'Harsh cornering','Picking a Geotab rule names the rule');
  await page.fill('#program-rule-form [name="name"]','Lane departure');
  await page.selectOption('#program-rule-form [name="severity"]','High');
  assert.equal(await page.inputValue('#program-rule-form [name="weight"]'),'5','Severity sets the default weight');
  await page.fill('#program-rule-form [name="threshold"]','3');
  await page.locator('#program-rule-form button[type="submit"]').click();
  await page.waitForSelector('#program-configuration [data-program-rule]');
  const rule=await page.evaluate(()=>eventTypeRules.find(item=>item.programId==='lane-discipline'));
  assert.deepEqual({name:rule.name,severity:rule.severity,weight:rule.weight,threshold:rule.threshold,enabled:rule.enabled,source:rule.source,sourceRule:rule.sourceRule,direct:rule.direct},{name:'Lane departure',severity:'High',weight:5,threshold:3,enabled:true,source:'Geotab',sourceRule:'Harsh cornering',direct:false});
  await page.selectOption('#program-configuration [data-program-rule-field="severity"]','Low');
  await page.fill('#program-configuration [data-program-rule-field="threshold"]','8');
  await page.locator('#program-configuration [data-program-rule-field="threshold"]').press('Tab');
  await page.waitForFunction(()=>eventTypeRules.find(item=>item.programId==='lane-discipline')?.threshold===8);
  assert.equal(await page.evaluate(()=>eventTypeRules.find(item=>item.programId==='lane-discipline').severity),'Low');
  assert.equal(await page.evaluate(()=>eventTypeRules.find(item=>item.programId==='lane-discipline').weight),1,'Changing severity resets the weight to its default');
  await page.fill('#program-configuration [data-program-rule-field="weight"]','4');
  await page.locator('#program-configuration [data-program-rule-field="weight"]').press('Tab');
  await page.waitForFunction(()=>eventTypeRules.find(item=>item.programId==='lane-discipline')?.weight===4);
  await config.locator('[data-program-rule-field="direct"]').check();
  await page.waitForFunction(()=>eventTypeRules.find(item=>item.programId==='lane-discipline')?.direct===true);
  assert.match(await page.locator('#program-flow-copy').getAttribute('data-tooltip'),/Direct one-on-one rules: Lane departure/);
  assert.equal((await stored('elevate-event-types')).find(item=>item.programId==='lane-discipline').threshold,8,'Rule edits persist immediately');
  await config.locator('[data-program-rule-field="enabled"]').uncheck();
  await page.waitForFunction(()=>eventTypeRules.find(item=>item.programId==='lane-discipline')?.enabled===false);
  assert.match(await page.locator('#program-flow-copy').getAttribute('data-tooltip'),/0 enabled rules/);

  // Per-program grace, reminder count and reset policy are locally configurable.
  for (const [key, value] of [['graceDays', 7], ['reminderCount', 3], ['resetPeriods', 3]]) {
    await page.fill('#program-configuration [data-program-policy="' + key + '"]', String(value));
    await page.locator('#program-configuration [data-program-policy="' + key + '"]').press('Tab');
    await page.waitForFunction(({ key, value }) => programPolicyFor('lane-discipline')[key] === value, { key, value });
  }
  const policy = (await stored('elevate-program-settings'))['lane-discipline'].policy;
  assert.deepEqual({basis:policy.basis,window:policy.window,graceDays:policy.graceDays,reminderCount:policy.reminderCount,resetPeriods:policy.resetPeriods}, {basis:'calendar',window:2,graceDays:7,reminderCount:3,resetPeriods:3});
  assert.match(await page.locator('#program-flow-copy').getAttribute('data-tooltip'), /not connected/);

  // Program threshold and coach routing, one coach or per group.
  await page.evaluate(()=>new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve))));
  await page.fill('#program-configuration [data-program-threshold]','60');
  await page.locator('#program-configuration [data-program-threshold]').press('Tab');
  await page.waitForFunction(()=>document.getElementById('program-flow-copy')?.dataset.tooltip.includes('below 60'));
  assert.equal((await stored('elevate-program-settings'))['lane-discipline'].threshold,60);
  await page.selectOption('#program-configuration [data-program-coach]','Morgan Chen');
  await page.waitForFunction(()=>document.getElementById('program-flow-copy')?.dataset.tooltip.includes('Morgan Chen'));
  await page.locator('#program-coach-mode [data-program-coach-mode="group"]').locator('..').click();
  await page.waitForSelector('#program-configuration [data-program-group-coach]');
  const groups=await page.evaluate(()=>Object.keys(groupComparisonData));
  assert.equal(await config.locator('[data-program-group-coach]').count(),groups.length,'A coach can be set for every group');
  await page.selectOption('#program-configuration [data-program-group-coach="'+groups[0]+'"]','Alex Kim');
  await page.waitForFunction(()=>true);
  const saved=await stored('elevate-program-settings');
  assert.equal(saved['lane-discipline'].coachMode,'group');
  assert.equal(saved['lane-discipline'].groupCoaches[groups[0]],'Alex Kim');
  assert.match(await page.locator('#program-flow-copy').getAttribute('data-tooltip'),/By group/);

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
