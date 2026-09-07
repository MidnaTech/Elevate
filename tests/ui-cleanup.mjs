// Focused acceptance for compact dataset controls; data/lifecycle coverage remains in the full suites.
import assert from 'node:assert/strict';
const {chromium}=await import(process.env.PLAYWRIGHT_MODULE||'playwright');
const browser=await chromium.launch({headless:true,channel:process.env.BROWSER_CHANNEL||'chrome'});
const page=await browser.newPage({viewport:{width:1440,height:1000},reducedMotion:'reduce'});
const base=process.env.BASE_URL||'http://localhost:5173';
page.setDefaultTimeout(10000);
// Incident data stays local: block every external request before the first navigation.
await page.route('**/*',route=>['localhost','127.0.0.1','[::1]'].includes(new URL(route.request().url()).hostname)?route.continue():route.abort());
const errors=[];page.on('pageerror',error=>errors.push(error.message));
const noOverflow=async label=>assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false,label+' has no document overflow');
const rightOf=async(left,right,label)=>{
  const a=await left.boundingBox(),b=await right.boundingBox();
  assert.ok(a.x+a.width<=b.x+1,label+' places dataset controls to the right of the view controls');
  assert.ok(a.y<b.y+b.height&&b.y<a.y+a.height,label+' keeps both groups on the same desktop toolbar row');
};
try {
  for(const width of [1440,390,320]) {
    await page.setViewportSize({width,height:1000});
    for(const id of ['all','speeding']) {
      await page.goto(base+'/?program='+id+'&period=4#programs');
      const view=page.locator('#view-programs');
      for(const tab of ['overview','content','configuration']) {
        await view.locator('#program-tab-'+tab).click();
        assert.equal(await view.getByRole('heading',{name:'Programs',exact:true,level:1}).count(),1,'The page title is stable');
        assert.equal(await view.getByRole('combobox',{name:'Program',exact:true}).count(),1,'A compact selector retains its accessible label');
        assert.equal(await view.getByRole('combobox',{name:'Period',exact:true}).count(),tab==='overview'?1:0,'Only reporting content offers a reporting period');
        assert.equal(await view.locator('.kpi-strip').count(),tab==='overview'?1:0,'Metadata sections omit inapplicable coaching KPIs');
        assert.equal(await view.locator('#program-page-scope').count(),tab==='overview'?1:0);
        if(tab==='overview') {
          assert.equal(await view.locator('#program-page-scope').textContent(),await page.evaluate(()=>periodScopeLabel()));
          assert.equal(await view.locator('#program-page-period').evaluate(node=>Boolean(node.closest('.data-toolbar'))),true);
        }
        assert.equal(await page.evaluate(()=>coachingPeriod),4,'Metadata navigation preserves the report period in memory');
        assert.equal(new URL(page.url()).searchParams.get('period'),'4');
        assert.equal(await view.locator('.page-heading .ui-status,#program-reports-link,#program-review-context').count(),0,'The heading and toolbar omit duplicate state and navigation');
        assert.equal(await view.locator('#program-page-select').evaluate(node=>Boolean(node.closest('.data-toolbar'))),true);
        if(width===1440)await rightOf(view.locator('.program-page-toolbar [role="tablist"]'),view.locator('.program-page-controls'),'Programs');
        await noOverflow('Programs '+id+' '+tab+' at '+width);
      }
      await view.locator('#program-tab-overview').click();
      assert.equal(await page.inputValue('#program-page-period'),'4','Overview restores the previous period after metadata sections');
      assert.equal(await view.locator('.kpi-tile').count(),6);
      if(id==='all')await view.locator('[data-program-record-scope="all"]').click();
      const status=view.locator('#program-record-count');
      assert.equal(await status.getAttribute('role'),'status');
      assert.equal(await status.evaluate(node=>node.classList.contains('sr-only')),true,'The result count remains available to assistive technology without repeated visible prose');
      assert.equal(await view.getByRole('combobox',{name:'State',exact:true}).count(),1);
      assert.equal(await view.getByRole('combobox',{name:'Coach',exact:true}).count(),1);
    }
    await page.goto(base+'/?session=manager_attention#sessions');
    const sessions=page.locator('#view-inbox'),toolbar=sessions.locator('.session-toolbar');
    assert.equal(await toolbar.getByRole('combobox',{name:'Period',exact:true}).count(),1,'Sessions period lives with its dataset controls');
    assert.equal(await toolbar.getByRole('searchbox',{name:'Search sessions',exact:true}).count(),1);
    assert.equal(await toolbar.getByRole('button',{name:/^Filters/}).count(),1);
    assert.equal(await sessions.locator('.page-heading [data-coaching-period]').count(),0);
    if(width===1440)await rightOf(toolbar.locator('#session-view-tabs'),toolbar.locator('.toolbar-actions'),'Sessions');
    assert.equal(await sessions.locator('nav[aria-label="Session pages"]').isVisible(),false,'A single page has no pagination chrome');
    await noOverflow('Sessions at '+width);
    await page.goto(base+'/#content');
    const content=page.locator('#view-library'),search=content.getByRole('searchbox',{name:'Search content',exact:true});
    assert.equal(await search.count(),1);
    if(width===1440) {
      const control=await search.locator('..').boundingBox(),bar=await content.locator('.data-toolbar').boundingBox();
      assert.ok(Math.abs(control.x+control.width-bar.x-bar.width)<=2,'Content search sits at the right edge of its toolbar');
    }
    await noOverflow('Content at '+width);
  }
  // Hide only unnecessary pagination: multiple pages still navigate to a distinct record set.
  await page.setViewportSize({width:1440,height:1000});
  await page.goto(base+'/?session=all#sessions');
  const pager=page.locator('#view-inbox nav[aria-label="Session pages"]');
  assert.equal(await pager.isVisible(),true);
  assert.equal(await pager.getByRole('button',{name:'Previous',exact:true}).isDisabled(),true);
  const first=await page.locator('#view-inbox [data-record-id]').evaluateAll(rows=>rows.map(row=>row.dataset.recordId));
  assert.equal(first.length,50);
  await pager.getByRole('button',{name:'Next',exact:true}).click();
  const second=await page.locator('#view-inbox [data-record-id]').evaluateAll(rows=>rows.map(row=>row.dataset.recordId));
  assert.equal(second.length,50);assert.equal(second.some(id=>first.includes(id)),false);
  await page.fill('#session-search','No matching driver zz-9182');
  assert.equal(await page.locator('#view-inbox [data-record-id]').count(),0);
  assert.equal(await pager.isVisible(),false,'Empty results also hide paging controls');
  assert.deepEqual(errors,[]);
  console.log('Passed: stable Programs heading, accessible right-hand dataset controls, one exact scope, retained live count, compact single-page pagination, working multiple pages, Content search alignment and mobile overflow.');
} finally {await browser.close();}
