import assert from 'node:assert/strict';
const { chromium } = await import(process.env.PLAYWRIGHT_MODULE || 'playwright');
const browser = await chromium.launch({headless:true,channel:process.env.BROWSER_CHANNEL || 'chrome'});
const page = await browser.newPage({viewport:{width:1440,height:1000},reducedMotion:'reduce'});
const base=process.env.BASE_URL || 'http://127.0.0.1:5173';
await page.route('**/*',r=>['localhost','127.0.0.1','[::1]'].includes(new URL(r.request().url()).hostname)?r.continue():r.abort());
const errors=[];page.on('pageerror',e=>errors.push(e.message));
try {
  await page.goto(base+'/?program=all#programs');
  const scroll=page.locator('.program-attention-scroll');
  assert.ok(await scroll.evaluate(el=>el.scrollHeight>el.clientHeight),'The full attention list has independent scrolling');
  await scroll.evaluate(el=>el.scrollTop=el.scrollHeight);
  const last=page.locator('[data-program-attention-record]').last();
  await last.locator('[data-open-session]').click();
  await page.locator('#driver-drawer [data-close-drawer]').click();
  assert.equal(await page.locator('#program-activity-chart').isVisible(),true);
  await page.goto(base+'/?driversTab=groups&program=following&period=4#drivers');
  assert.equal(await page.locator('#drivers-tab-groups').getAttribute('aria-selected'),'true');
  assert.equal(await page.locator('#drivers-panel-directory').isVisible(),false);
  assert.equal(await page.inputValue('#groups-program-filter'),'following');
  assert.deepEqual(await page.locator('#group-rows tbody tr').evaluateAll(rows=>rows.map(row=>[...row.cells].slice(3,7).map(cell=>Number(cell.textContent)))),await page.evaluate(()=>Object.keys(groupComparisonData).map(name=>{
    const records=sessions.filter(s=>s.categoryId==='following' && groupForPerson(s.person)===name && (s.weeksAgo||0)<4);
    return [records.filter(s=>s.state==='system_handling'&&s.deliveryMode==='automated').length,records.filter(s=>s.state==='system_handling'&&s.deliveryMode==='one_on_one').length,records.filter(s=>s.state==='manager_attention').length,records.filter(s=>['completed','archived'].includes(s.state)).length];
  })),'Moved group comparison still reconciles to programme-period records');
  await page.locator('#group-rows [data-open-group]').first().click();
  const group=await page.locator('#category-title').textContent();
  await page.locator('#category-drawer [data-open-category="following"]').click();
  assert.equal(new URL(page.url()).hash,'#programs');
  await page.locator('[data-back-program-page]').click();
  assert.equal(new URL(page.url()).hash,'#drivers');
  assert.equal(await page.locator('#drivers-tab-groups').getAttribute('aria-selected'),'true');
  assert.equal(await page.locator('#category-title').textContent(),group);
  await page.locator('#category-drawer [data-driver-group-link]').click();
  assert.equal(await page.locator('#drivers-tab-directory').getAttribute('aria-selected'),'true','View drivers leaves Groups and opens its scoped directory');
  assert.equal(await page.evaluate(()=>activeDriverGroup),group);
  await page.locator('#drivers-tab-groups').click();
  assert.equal(await page.inputValue('#groups-program-filter'),'following');
  await page.selectOption('#groups-program-filter','speeding');
  await page.reload();
  assert.equal(await page.inputValue('#groups-program-filter'),'speeding');
  for(const width of [390,320]) {
    await page.setViewportSize({width,height:900});
    assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);
    assert.equal(await page.locator('#mobile-more-trigger').isVisible(),true);
    await page.goto(base+'/?program=following#programs');
    const boxes=await page.evaluate(()=>['program-activity-chart','program-activity-attention'].map(id=>{const r=document.getElementById(id).getBoundingClientRect();return {top:r.top,bottom:r.bottom}}));
    assert.ok(boxes[1].top>=boxes[0].bottom,'Narrow layouts stack the two panels');
    assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);
    await page.goto(base+'/?driversTab=groups#drivers');
  }
  assert.deepEqual(errors,[]);
  console.log('Passed: scrollable70/30 attention, Drivers/Groups tabs, scoped group counts, group→programme→back drawer, View drivers, persistent scope and mobile reflow.');
} finally { await browser.close(); }
