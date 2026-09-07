import assert from 'node:assert/strict';

// Inspect real text bounds after the shared ResizeObserver has handled text zoom.
// A locally scrollable plot must still keep each series label and value readable.
export async function assertBeforeAfterText(page, label) {
  await page.evaluate(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))));
  const rows = await page.locator('.before-after-chart:visible .ba-row').evaluateAll(nodes => nodes.map(node => {
    const bounds = selector => [...node.querySelectorAll(selector)].map(text => {
      const {left, right, top, bottom} = text.getBoundingClientRect();
      return {left, right, top, bottom};
    });
    return {labels: bounds('.ba-series'), values: bounds('.ba-value'), name: bounds('.ba-label')[0]};
  }));
  for (const [index, row] of rows.entries()) {
    for (const [kind, pair] of [['series labels', row.labels], ['values', row.values]]) {
      assert.equal(pair.length, 2, label + ' has Before and After ' + kind);
      assert.ok(pair[0].bottom <= pair[1].top + 0.5, label + ' row ' + index + ' ' + kind + ' do not overlap at 200% text zoom');
    }
    assert.ok(row.name.right <= Math.min(...row.labels.map(item => item.left)) + 0.5, label + ' row name does not overlap its series labels');
  }
  return rows.length;
}
