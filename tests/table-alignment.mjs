// Shared column alignment acceptance; imported by test:design or run directly.
import assert from 'node:assert/strict';
import { pathToFileURL } from 'node:url';

const scenes = [
  ['Automation Centre','/#automation'], ['Sessions','/#sessions'], ['Programmes','/#programs'], ['Programme rates','/?program=all&programComparison=rates#programs'], ['Programme detail','/?program=following#programs'],
  ['Drivers','/#drivers'], ['Groups','/?driversTab=groups#drivers'],
  ['Learning','/#learning'], ['Automation','/?programTab=automation#programs'], ['Programme configuration','/?program=following&programTab=configuration#programs']
];
const numericLabels = new Set(['drivers','records','sessions','identified','in progress','automated','one-on-one','automated in progress','one-on-one in progress','needs review','completed','safety score','elevate score','event change','event-rate change','events / 1000 trips','events per 1000 trips','change','before','after','before / 1000 trips','after / 1000 trips','completion','count','miles','trips','fleet drivers','automated sessions','one-on-one sessions','safety score / 100','elevate score / 100','identified records','completed sessions','eligible drivers','improved share','repeated','repeated drivers','recorded completion','programme score / 100','overall elevate score','score']);
const textLabels = new Set(['driver','program','programme','group','state','attention','method','coach','due','updated','started','event type','severity','trigger','coaching path','action','remove','on','condition','result','week','week / source','day','record','score band','name','select']);

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
          if(cell.colSpan===1&&headings[index]?.span===1)cells.push({column:index,numeric:cell.classList.contains('num'),alignment:alignment(cell),links:[...cell.querySelectorAll('button.text-link')].map(link=>alignment(link)),edge:edge(cell,headings[index].numeric),inputs:[...cell.querySelectorAll('input[type="number"]')].map(input=>({alignment:alignment(input),value:input.value}))});
          index+=cell.colSpan;
        }
      }
      return {name:node.caption?.textContent.trim()||node.getAttribute('aria-label')||'table',shared:node.classList.contains('data-table'),headings,cells};
    });
    assert.equal(audit.shared,true,label+' '+audit.name+' uses the shared native table');
    // Session tables date their rows (Started · Completed · Due); those words are quantities elsewhere.
    const sessionDates=/coaching (records|sessions)/i.test(audit.name)?new Set(['started','completed','due']):new Set();
    for(const header of audit.headings) {
      const name=header.text.toLowerCase();
      if(numericLabels.has(name)&&!sessionDates.has(name))assert.equal(header.numeric,true,label+' '+header.text+' declares quantity alignment');
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
      for(const alignment of cell.links)assert.equal(alignment,expected,label+' '+audit.name+' '+header.text+' wrapped link text inherits column alignment');
      assert.ok(Math.abs(cell.edge-header.edge)<1,label+' '+audit.name+' '+header.text+' header/body content edges align');
      for(const input of cell.inputs){result.numberInputs++;assert.equal(input.alignment,'right',label+' '+audit.name+' number inputs align their entered quantities');}
    }
    result.cells+=audit.cells.length;
    // Exercise one existing sort per table without changing the record data.
    const sort=table.locator('.table-sort').first();
    if(await sort.count()) {
      const before=await sort.locator('..').getAttribute('aria-sort');
      await sort.focus();await page.keyboard.press('Enter');
      assert.equal(await sort.locator('..').getAttribute('aria-sort'),before==='ascending'?'descending':'ascending',label+' '+audit.name+' sorting updates its column state');
      assert.equal(await sort.evaluate(node=>node===document.activeElement),true,label+' '+audit.name+' sorting retains keyboard focus; active '+await page.evaluate(()=>document.activeElement.outerHTML.slice(0,250)));
    }
  }
  assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false,label+' keeps overflow inside the table region');
  return result;
}

async function auditNumericSorting(page, base) {
  // Verify the actual program comparison against its source rates, not against
  // the arrow-decorated display text or the implementation's parsing helper.
  await page.goto(base+'/?program=all#programs');
  const changes = await page.evaluate(() => Object.fromEntries(categories.map(program => [program.id, rateChange(program.weeklyRates).change])));
  const comparison = page.locator('#program-comparison-table table');
  const changeSort = comparison.locator('thead th').filter({ hasText: /^Event-rate change$/ }).locator('.table-sort');
  for (const direction of ['ascending','descending']) {
    await changeSort.focus();await page.keyboard.press('Enter');
    assert.equal(await changeSort.locator('..').getAttribute('aria-sort'),direction);
    const rows = await comparison.locator('tbody tr').evaluateAll(nodes => nodes.map(row => ({id:row.dataset.programComparison,value:row.cells[6].getAttribute('data-sort-value')})));
    assert.equal(rows.length,Object.keys(changes).length,'Sorting retains every program, including those without coaching records');
    for (const row of rows) assert.equal(Number(row.value),changes[row.id],'The decorated Change cell retains the signed source value for '+row.id);
    const observed = rows.map(row => changes[row.id]);
    const expected = Object.values(changes).sort((a,b) => direction==='ascending'?a-b:b-a);
    assert.deepEqual(observed,expected,'Program Change sorts signed source values '+direction);
    assert.equal(await changeSort.evaluate(node => node===document.activeElement),true,'Numeric sorting retains keyboard focus');
  }

  // A temporary specimen exercises decimal and unavailable values that are not
  // all represented by the current whole-percent program fixture. Fleet records
  // and the durable component specimen remain unchanged.
  await page.goto(base+'/design-library.html');
  await page.evaluate(() => {
    const fixtures = [
      ['positive-ten','+10.2%',null],
      ['missing-dash','—',null],
      ['negative-two','−2.75%',null],
      ['input-negative','<input type="number" value="-3.25" aria-label="Negative example quantity">',null],
      ['formatted-decrease','↓ 14.25% fewer','-14.25'],
      ['zero','0%',null],
      ['positive-fraction','+0.25%',null],
      ['negative-fraction','-0.5%',null],
      ['positive-two','2.1%',null],
      ['formatted-increase','↑ 3.5% more','3.5'],
      ['input-positive','<input type="number" value="4.25" aria-label="Positive example quantity">',null],
      ['thousands','1,200.5',null],
      ['missing-empty','',null]
    ];
    const host=document.createElement('section');host.id='numeric-sort-acceptance';
    host.innerHTML=uiTable('Temporary numeric sorting examples',['Example',{label:'Change',numeric:true}],fixtures.map(([id,label,value])=>'<tr data-example="'+id+'"><td>'+id+'</td><td'+(value===null?'':' data-sort-value="'+value+'"')+'>'+label+'</td></tr>').join(''));
    document.getElementById('specimen').append(host);applyDesignLibrary(host);
  });
  const examples=page.locator('#numeric-sort-acceptance');
  const sort=examples.locator('th.num .table-sort');
  const ascending=['formatted-decrease','input-negative','negative-two','negative-fraction','zero','positive-fraction','positive-two','formatted-increase','input-positive','positive-ten','thousands'];
  for (const direction of ['ascending','descending']) {
    await sort.focus();await page.keyboard.press('Enter');
    assert.equal(await sort.locator('..').getAttribute('aria-sort'),direction);
    const expected=[...(direction==='ascending'?ascending:[...ascending].reverse()),'missing-dash','missing-empty'];
    assert.deepEqual(await examples.locator('tbody tr').evaluateAll(nodes=>nodes.map(node=>node.dataset.example)),expected,'Signed decimals sort numerically and unavailable values stay last '+direction);
    assert.equal(await sort.evaluate(node=>node===document.activeElement),true,'The numeric specimen keeps keyboard focus '+direction);
  }
  await examples.evaluate(node=>node.remove());
}

export async function auditAllTableAlignment(page,base) {
  const results=[];
  for(const width of [1440,390]) {
    await page.setViewportSize({width,height:1000});
    for(const [name,path] of scenes) {
      await page.goto(base+path);
      results.push(await auditScope(page,page.locator('.app-view.is-active'),name+' at '+width));

    }
    for(const program of ['all','following']) {
      await page.goto(base+'/?program='+program+'#programs');
      for(const tab of ['activity','content','configuration','automation']) {
        await page.locator('#program-tab-'+tab).click();
        await page.waitForFunction(id=>document.activeElement?.id===id,'program-tab-'+tab);
        results.push(await auditScope(page,page.locator('#view-programs'),'Program '+program+' '+tab+' at '+width));
      }
    }
    for(const program of ['all','following']) {
      await page.goto(base+'/?driversTab=groups&program='+program+'#drivers');
      results.push(await auditScope(page,page.locator('#drivers-panel-groups'),'Groups '+program+' at '+width));
    }
    const drawer=page.locator('#category-drawer');
    await page.goto(base+'/#programs');
    await page.locator('#program-comparison-table [data-open-program-page="following"]').click();
    const programPage=page.locator('#view-programs');
    await programPage.waitFor({state:'visible'});
    assert.equal(await page.locator('dialog:modal').count(),0,'Program data is reviewed inline');
    assert.equal(await programPage.locator('#program-page-outcome-sample table').count(),1,'Retained sample outcomes remain available as a native page table');
    const programResult=await auditScope(page,programPage,'Program detail from report at '+width);
    assert.ok(programResult.tables>=2,'The page includes chart data and retained outcome sample data');
    results.push(programResult);
    assert.equal(await programPage.locator('[data-program-chart-view]').count(),0,'Selected programme rate controls are removed');
    await page.selectOption('#program-page-select','all');
    await programPage.locator('[data-program-comparison-view="rates"]').locator('..').click();
    results.push(await auditScope(page,programPage,'All-programme rate comparison and outcomes at '+width));
    await page.goto(base+'/?driversTab=groups#drivers');
    await page.locator('.group-comparison-card [data-open-group="Regional · East"]').click();
    await page.waitForFunction(()=>document.activeElement.matches('#category-drawer [data-close-category]'));
    results.push(await auditScope(page,drawer,'Group drawer at '+width));
    await page.goto(base+'/?driver=Priya%20Singh#drivers');
    results.push(await auditScope(page,page.locator('#driver-drawer'),'Driver drawer at '+width));
    await page.goto(base+'/design-library.html');
    results.push(await auditScope(page,page.locator('#specimen'),'Component specimen at '+width));
  }
  const summary=results.reduce((sum,result)=>({tables:sum.tables+result.tables,cells:sum.cells+result.cells,numberInputs:sum.numberInputs+result.numberInputs,sorts:sum.sorts+result.sorts}),{tables:0,cells:0,numberInputs:0,sorts:0});
  assert.ok(summary.tables>=30,'All table families and their chart equivalents were actually inspected');
  assert.ok(summary.numberInputs>=8,'Program configuration numeric editors were included at both widths');
  await auditNumericSorting(page,base);
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
    const base=process.env.BASE_URL||'http://localhost:5173';
    const numericOnly=process.argv.includes('--numeric-only');
    const result=numericOnly?await auditNumericSorting(page,base):await auditAllTableAlignment(page,base);
    assert.deepEqual(errors,[]);
    console.log(numericOnly?'Passed numeric sorting: source program changes, signed decimals, editable quantities, explicit values and missing cells in both directions.':'Passed universal table alignment at1440/390: '+JSON.stringify(result));
  } finally {await browser.close();}
}
