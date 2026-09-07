// Source reconciliation is kept separate from visual assertions and runs in test:browser.
import assert from 'node:assert/strict';

const expectedPeriods = [
  {weeks:1,identified:151,sessionTotal:151,pendingSessionReviews:0,automatedTotal:147,oneOnOneTotal:4,automatedInProgress:8,oneOnOneInProgress:2,inProgress:10,sessionReviews:11,needsReview:11,completed:130},
  {weeks:4,identified:161,sessionTotal:161,pendingSessionReviews:0,automatedTotal:155,oneOnOneTotal:6,automatedInProgress:8,oneOnOneInProgress:2,inProgress:10,sessionReviews:11,needsReview:11,completed:140},
  {weeks:8,identified:177,sessionTotal:177,pendingSessionReviews:0,automatedTotal:171,oneOnOneTotal:6,automatedInProgress:8,oneOnOneInProgress:2,inProgress:10,sessionReviews:11,needsReview:11,completed:156}
];

async function readReconciliation(page,weeks) {
  return page.evaluate(period=>{
    // Read dated source rows independently of the summary/filter helpers under test.
    const inWindow=record=>(Number.isFinite(record.weeksAgo)?record.weeksAgo:0)<period;
    const actual=sessions.filter(inWindow);
    const flags=reviewCandidates.filter(flag=>!flag.started&&inWindow(flag));
    const active=actual.filter(record=>!['completed','archived','manager_attention'].includes(record.state));
    const source={
      identified:actual.length+flags.length,sessionTotal:actual.length,pendingSessionReviews:flags.length,
      automatedTotal:actual.filter(record=>record.origin==='automated').length,
      oneOnOneTotal:actual.filter(record=>record.origin==='manual_override').length,
      automatedInProgress:active.filter(record=>record.origin==='automated').length,
      oneOnOneInProgress:active.filter(record=>record.origin==='manual_override').length,
      inProgress:active.length,sessionReviews:actual.filter(record=>record.state==='manager_attention').length,
      needsReview:actual.filter(record=>record.state==='manager_attention').length+flags.length,
      completed:actual.filter(record=>['completed','archived'].includes(record.state)).length
    };
    const cycle=currentCycleCounts(period);
    return {source,summary:Object.fromEntries(Object.keys(source).map(key=>[key,cycle[key]])),ids:actual.map(record=>record.id),flagIds:flags.map(flag=>flag.id),week:{...weeklyCoachingActivity.at(-1)},run:{...automationRunSummary.counts},origins:sessionOriginTotals};
  },weeks);
}

function assertReconciled(result,expected) {
  const {weeks,...facts}=expected;
  assert.deepEqual(result.source,facts,'Source rows reconcile for '+weeks+' weeks');
  assert.deepEqual(result.summary,facts,'Common summary matches independently counted source rows');
  assert.equal(new Set(result.ids).size,result.ids.length,'Actual session IDs are unique');
  assert.ok(result.flagIds.every(id=>!result.ids.includes(id)),'Pending flags are separate from the actual ledger');
  const s=result.summary;
  assert.equal(s.identified,s.sessionTotal+s.pendingSessionReviews);
  assert.equal(s.identified,s.inProgress+s.needsReview+s.completed);
  assert.equal(s.sessionTotal,s.automatedTotal+s.oneOnOneTotal);
  assert.equal(s.needsReview,s.sessionReviews+s.pendingSessionReviews);
}

function assertWeeklySnapshot(result,expected=expectedPeriods[0]) {
  const week=result.week;
  assert.deepEqual({identified:week.identified,completed:week.completed,automated:week.automated,manual:week.oneToOne,inProgress:week.inProgress,review:week.escalated},
    {identified:expected.identified,completed:expected.completed,automated:expected.automatedInProgress,manual:expected.oneOnOneInProgress,inProgress:expected.inProgress,review:expected.needsReview},'Latest weekly chart snapshot never inherits a longer selected reporting window');
  assert.equal(result.run.sessionTotal,expected.sessionTotal,'Latest automation run retains its weekly actual-session denominator');
}

async function assertStageTiles(page,expected) {
  for(const [id,key] of [['kpi-identified','identified'],['kpi-in-progress','inProgress'],['kpi-needs-review','needsReview'],['kpi-completed','completed'],['analytics-identified-count','identified'],['analytics-in-progress-count','inProgress'],['analytics-escalated-count','needsReview'],['analytics-completed-count','completed'],['analytics-coached-count','automatedTotal'],['analytics-one-to-one-count','oneOnOneTotal']]) {
    assert.equal(await page.locator('#'+id).textContent(),String(expected[key]),id+' has its declared denominator');
  }
}

export async function auditMetricReconciliation(page,base) {
  await page.setViewportSize({width:1440,height:1000});
  for(const expected of expectedPeriods) {
    await page.goto(base+'/?period='+expected.weeks+'#automation');
    const result=await readReconciliation(page,expected.weeks);
    assertReconciled(result,expected);assertWeeklySnapshot(result);await assertStageTiles(page,expected);
    assert.equal(await page.locator('#automation-session-total').textContent(),String(expected.sessionTotal));
    assert.equal(await page.locator('#automation-week-automated').textContent(),String(expected.automatedTotal));
    assert.equal(await page.locator('#automation-week-manual').textContent(),String(expected.oneOnOneTotal));
    assert.equal(await page.locator('#automation-share').textContent(),Math.round(expected.automatedTotal/expected.sessionTotal*100)+'%');
    assert.equal(result.origins.automated.all,expected.automatedTotal,'Automated source totals exclude pending flags');
    assert.equal(result.origins.manual_override.all,expected.oneOnOneTotal);

    await page.locator('#automation-sessions-link').click();
    assert.equal(await page.locator('[data-session-filter="all"]').isChecked(),true,'Automation shortcut opens actual total, not only active work');
    assert.equal(await page.inputValue('#session-origin-filter'),'automated');
    assert.ok((await page.locator('.session-footer').textContent()).includes('of '+expected.automatedTotal+' records'));
    const rowIds=await page.locator('.session-record').evaluateAll(rows=>rows.map(row=>row.dataset.recordId));
    assert.ok(rowIds.every(id=>result.ids.includes(id)&&!result.flagIds.includes(id)),'Source-filtered rows contain actual sessions only');
    await page.locator('#view-inbox [data-filter-sheet-trigger]').click();
    await page.selectOption('#session-origin-filter','manual_override');
    assert.equal(await page.locator('.session-record').count(),expected.oneOnOneTotal);
    await page.selectOption('#session-origin-filter','all');
    assert.ok((await page.locator('.session-footer').textContent()).includes('of '+expected.identified+' records'));
    await page.keyboard.press('Escape');

    await page.goto(base+'/?period='+expected.weeks+'&analytics=activity#analytics'); // Retained detailed report, no longer a primary nav item.
    assert.deepEqual(await page.locator('#analytics-activity .kpi-strip .kpi-label > span').allTextContents(),['Identified','In progress','Needs review','Completed','Automated sessions','One-on-one sessions']);
    assertWeeklySnapshot(await readReconciliation(page,expected.weeks));
    const programCounts=await page.locator('#coaching-queue tbody tr').evaluateAll(rows=>rows.map(row=>[...row.cells].slice(2,7).map(cell=>Number(cell.textContent))));
    assert.deepEqual(programCounts.reduce((sum,row)=>sum.map((value,index)=>value+row[index]),[0,0,0,0,0]),[expected.identified,expected.automatedInProgress,expected.oneOnOneInProgress,expected.needsReview,expected.completed],'Program records reconcile to stages; explicit method columns describe active sessions');
    // Explicit period arguments must stay independent of the currently selected UI span.
    assertReconciled(await readReconciliation(page,1),expectedPeriods[0]);
  }

  // A direct manual start creates an additional record. Automation opens every other session
  // itself, so there is no pending flag to convert.
  {
    await page.goto(base+'/?period=1#sessions');
    await page.locator('#view-inbox [data-manual-session]').click();
    await page.locator('[data-confirm-manual-session]').click();
    const expected={...expectedPeriods[0],identified:152,sessionTotal:152,pendingSessionReviews:0,oneOnOneTotal:5,oneOnOneInProgress:3,inProgress:11,needsReview:11};
    const result=await readReconciliation(page,1);
    assertReconciled(result,expected);assertWeeklySnapshot(result,expected);await assertStageTiles(page,expected);
    assert.equal(await page.locator('.session-record').count(),3,'Creation opens the three active one-on-one sessions');
    const tiles=await page.locator('#sessions-kpis .kpi-value').allTextContents();
    assert.deepEqual(tiles,[String(expected.identified),'11',String(expected.needsReview),'130'],'Session summary preserves the stage equation after creation');
    assert.equal(result.origins.automated.all,147,'Starting a manual session does not manufacture an automated session');
    assert.equal(result.origins.manual_override.all,5);
  }

  await page.goto(base+'/#settings');
  const active=await page.evaluate(()=>({mode:automationMode,weeks:cadenceWeeks,sessions:sessions.length}));
  for(const mode of ['manual','semi','fully']) {
    await page.locator('[data-automation-mode="'+mode+'"]').locator('..').click();
    const cadence=page.locator('[data-cadence="2"]');
    if(await cadence.evaluate(node=>node.tagName==='INPUT'))await cadence.locator('..').click();else await cadence.click();
    await page.locator('#settings-preview').click();
    assert.equal(await page.locator('#settings-impact-drivers').textContent(),'Not estimated','A cadence preview cannot invent next-cycle driver volume');
    assert.match(await page.locator('#settings-preview-panel').textContent(),/Next-cycle volume is not estimated/);
  }
  assert.deepEqual(await page.evaluate(()=>({mode:automationMode,weeks:cadenceWeeks,sessions:sessions.length})),active,'Previewing unsaved modes/cadence leaves configuration and ledger untouched');
  await page.goto(base+'/#sessions'); // Reset local draft/mutations for the caller.
}
