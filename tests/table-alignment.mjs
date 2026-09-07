// Shared column alignment acceptance; imported by test:design or run directly.
import assert from 'node:assert/strict';
import { pathToFileURL } from 'node:url';

const scenes = [
  ['Automation Centre','/#automation'], ['Sessions','/#sessions'],
  ['Outcomes','/?analytics=outcomes#analytics'], ['Activity','/?analytics=activity#analytics'],
  ['Drivers','/?analytics=drivers#analytics'], ['Groups','/?analytics=groups#analytics'],
  ['Content','/#content'], ['Settings','/#settings']
];
const numericLabels = new Set(['drivers','records','automated','one-on-one','automated in progress','one-on-one in progress','needs review','completed','safety score','event change','events / 1000 trips','events per 1000 trips','change','before','after','before / 1000 trips','after / 1000 trips','completion','count','miles','trips','fleet drivers','automated sessions','one-on-one sessions','safety score / 100','identified records','completed sessions']);
const textLabels = new Set(['driver','program','group','state','attention','method','coach','due','updated','event type','severity','trigger','coaching path','action','remove','on','condition','result','week','day','record','score band','name','select']);

async function auditScope(page, scope, label) {
  // Reveal existing data equivalents through their native disclosures. This only
  // changes local disclosure state; no records, filters or settings are saved.
  await scope.locator('table').evaluateAll(tables => {
    for (const table of tables) for(let node=table.parentElement;node;node=node.parentElement) if(node.tagName==='DETAILS') node.open=true;
  });
  const tables=scope.locator('table:visible');
  const result={scope:label,tables:await tables.count(),cells:0,numberInputs:0,sorts:0};
  for(const table of await tables.all()) {
    const audit=await table.evaluate(node=>{
      const alignment=element=>{
        const css=getComputedStyle(element),value=css.textAlign;
        if(value==='start')return css.direction==='rtl'?'right':'left';
        if(value==='end')return css.direction==='rtl'?'left':'right';
        return value;
      };
      const edge=(cell,numeric)=>{
        const css=getComputedStyle(cell),rect=cell.getBoundingClientRect();
        return numeric?rect.right-parseFloat(css.borderRightWidth)-parseFloat(css.paddingRight):rect.left+parseFloat(css.borderLeftWidth)+parseFloat(css.paddingLeft);
      };
      const headings=[...node.tHead.rows[0].cells].map(header=>({
        text:header.textContent.trim().replace(/,/g,'').replace(/\s+/g,' '),numeric:header.classList.contains('num'),alignment:alignment(header),edge:edge(header,header.classList.contains('num')),span:header.colSpan,
        sort:header.querySelector('.table-sort')?{tag:header.querySelector('.table-sort').tagName,disabled:header.querySelector('.table-sort').disabled,state:header.getAttribute('aria-sort'),alignment:alignment(header.querySelector('.table-sort'))}:null
      }));
      const cells=[];
      for(const section of [...node.tBodies,...(node.tFoot?[node.tFoot]:[])])for(const row of section.rows){
        let index=0;
        for(const cell of row.cells){
          if(cell.colSpan===1&&headings[index]?.span===1)cells.push({column:index,numeric:cell.classList.contains('num'),alignment:alignment(cell),edge:edge(cell,headings[index].numeric),inputs:[...cell.querySelectorAll('input[type="number"]')].map(input=>({alignment:alignment(input),value:input.value}))});
          index+=cell.colSpan;
        }
      }
      return {name:node.caption?.textContent.trim()||node.getAttribute('aria-label')||'table',shared:node.classList.contains('data-table'),headings,cells};
    });
    assert.equal(audit.shared,true,label+' '+audit.name+' uses the shared native table');
    for(const header of audit.headings) {
      const name=header.text.toLowerCase();
      if(numericLabels.has(name))assert.equal(header.numeric,true,label+' '+header.text+' declares quantity alignment');
      if(textLabels.has(name))assert.equal(header.numeric,false,label+' '+header.text+' retains text alignment');
      const expected=header.numeric?'right':'left';
      assert.equal(header.alignment,expected,label+' '+audit.name+' header '+header.text);
      if(header.sort){
        result.sorts++;
        assert.equal(header.sort.tag,'BUTTON');assert.equal(header.sort.disabled,false);
        assert.ok(['none','ascending','descending'].includes(header.sort.state),'Sorting keeps its native state');
        assert.equal(header.sort.alignment,expected,'Sort labels inherit their column alignment');
      }
    }
    for(const cell of audit.cells) {
      const header=audit.headings[cell.column],expected=header.numeric?'right':'left';
      assert.equal(cell.numeric,header.numeric,label+' '+audit.name+' '+header.text+' propagates the column definition into every body cell');
      assert.equal(cell.alignment,expected,label+' '+audit.name+' '+header.text+' header/body alignment matches');
      assert.ok(Math.abs(cell.edge-header.edge)<1,label+' '+audit.name+' '+header.text+' header/body content edges align');
      for(const input of cell.inputs){result.numberInputs++;assert.equal(input.alignment,'right',label+' '+audit.name+' number inputs align their entered quantities');}
    }
    result.cells+=audit.cells.length;
    // Exercise one existing sort per table without changing the record data.
    const sort=table.locator('.table-sort').first();
    if(await sort.count()) {
      const before=await sort.locator('..').getAttribute('aria-sort');
      await sort.focus();await page.keyboard.press('Enter');
      assert.equal(await sort.locator('..').getAttribute('aria-sort'),before==='ascending'?'descending':'ascending');
      assert.equal(await sort.evaluate(node=>node===document.activeElement),true,label+' '+audit.name+' sorting retains keyboard focus; active '+await page.evaluate(()=>document.activeElement.outerHTML.slice(0,250)));
    }
  }
  assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false,label+' keeps overflow inside the table region');
  return result;
}

export async function auditAllTableAlignment(page,base) {
  const results=[];
  for(const width of [1440,390]) {
    await page.setViewportSize({width,height:1000});
    for(const [name,path] of scenes) {
      await page.goto(base+path);
      results.push(await auditScope(page,page.locator('.app-view.is-active'),name+' at '+width));
      if(name==='Outcomes') {
        await page.locator('[data-outcome-tab="driver"]').locator('..').click();
        results.push(await auditScope(page,page.locator('.app-view.is-active'),'Outcomes by driver at '+width));
      }
    }
    await page.goto(base+'/?analytics=activity#analytics');
    await page.locator('#coaching-queue [data-open-category="following"]').click();
    const drawer=page.locator('#category-drawer');
    await page.waitForFunction(()=>document.activeElement.matches('#category-drawer [data-close-category]')); // Wait for the existing delayed opening-focus transition.
    for(const stage of ['needs','automated','one_to_one','completed','outcomes']) {
      await drawer.locator('.workflow-tabs [data-workflow-tab="'+stage+'"]').click();
      results.push(await auditScope(page,drawer,'Program '+stage+' at '+width));
    }
    await page.goto(base+'/?analytics=groups#analytics');
    await page.locator('.group-comparison-card [data-open-group="Regional · East"]').click();
    await page.waitForFunction(()=>document.activeElement.matches('#category-drawer [data-close-category]'));
    results.push(await auditScope(page,drawer,'Group drawer at '+width));
    await page.goto(base+'/?analytics=drivers&driver=Priya%20Singh#analytics');
    results.push(await auditScope(page,page.locator('#driver-drawer'),'Driver drawer at '+width));
    await page.goto(base+'/design-library.html');
    results.push(await auditScope(page,page.locator('#specimen'),'Component specimen at '+width));
  }
  const summary=results.reduce((sum,result)=>({tables:sum.tables+result.tables,cells:sum.cells+result.cells,numberInputs:sum.numberInputs+result.numberInputs,sorts:sum.sorts+result.sorts}),{tables:0,cells:0,numberInputs:0,sorts:0});
  assert.ok(summary.tables>=30,'All table families and their chart equivalents were actually inspected');
  assert.ok(summary.numberInputs>=8,'Settings numeric editors were included at both widths');
  return summary;
}

if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href) {
  const {chromium}=await import(process.env.PLAYWRIGHT_MODULE||'playwright');
  const browser=await chromium.launch({headless:true,channel:process.env.BROWSER_CHANNEL||'chrome'});
  const page=await browser.newPage({viewport:{width:1440,height:1000},reducedMotion:'reduce'});
  // Approval review requires local-only browser validation: never send fixture
  // coordinates or other records to external map/CDN services.
  await page.route('**/*',route=>['localhost','127.0.0.1','[::1]'].includes(new URL(route.request().url()).hostname)?route.continue():route.abort());
  const errors=[];page.on('pageerror',error=>errors.push(error.message));
  try {
    const result=await auditAllTableAlignment(page,process.env.BASE_URL||'http://localhost:5173');
    assert.deepEqual(errors,[]);
    console.log('Passed universal table alignment at1440/390: '+JSON.stringify(result));
  } finally {await browser.close();}
}
