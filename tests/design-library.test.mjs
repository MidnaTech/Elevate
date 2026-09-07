import assert from 'node:assert/strict';
import { readFile, readdir } from 'node:fs/promises';
import test from 'node:test';

const root = new URL('../', import.meta.url);
const html = await readFile(new URL('dist/index.html', root), 'utf8');
const names = (await readdir(new URL('dist/', root))).filter(name => name.endsWith('.css'));
const sheets = await Promise.all(names.map(async name => ({ name, css: await readFile(new URL('dist/' + name, root), 'utf8') })));
const css = sheets.map(sheet => sheet.css).join('\n');
const rootDeclarations = sheets.flatMap(({ name, css: text }) => [...text.matchAll(/:root\s*\{([^}]+)\}/g)].flatMap(block => [...block[1].matchAll(/(--[\w-]+)\s*:\s*([^;]+);/g)].map(match => ({ file: name, token: match[1], value: match[2].trim() }))));
const expected = {
  '--canvas':'#FAFBFD','--surface':'#FFFFFF','--surface-soft':'#FCFDFE','--surface-strong':'#F3F5F7',
  '--ink':'#18212F','--ink-700':'#364152','--ink-500':'#4F5D70','--ink-400':'#59697C','--ink-300':'#606E80',
  '--border':'#DEE4EB','--border-soft':'#EEF1F5','--border-strong':'#7F8B9A',
  '--primary':'#B84A00','--primary-hover':'#963C00','--primary-soft':'#FFF2E8','--spotlight':'#FFE2CC','--button-ink':'#FFFFFF','--focus-ring':'#713000',
  '--success':'#216E47','--success-soft':'#EAF5EE','--amber':'#7A5900','--amber-soft':'#FFF4D6','--rust':'#B02A46','--rust-soft':'#FCECF0','--violet':'#7047A3','--violet-soft':'#F2EDF9','--automated':'#596675','--automated-soft':'#EDF0F4','--green':'#216E47',
  '--chart-primary':'#236C72','--chart-secondary':'#8A5A44','--chart-tertiary':'#8B4F7D','--chart-quaternary':'#64743A','--chart-baseline':'#7D8795','--chart-track':'#E1E6ED','--chart-score':'#364152','--chart-reduction':'#216E47','--chart-increase':'#B02A46','--chart-unchanged':'#596675'
};
const luminance = hex => {
  const channels = hex.match(/[\da-f]{2}/gi).map(value => parseInt(value,16)/255).map(value => value <= 0.04045 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4);
  return channels[0]*0.2126+channels[1]*0.7152+channels[2]*0.0722;
};
const contrast = (a,b) => (Math.max(luminance(a),luminance(b))+0.05)/(Math.min(luminance(a),luminance(b))+0.05);

test('the September 7 library governs agent instructions and product exceptions', async () => {
  const library = await readFile(new URL('Elevate-Autocoach-Design-Library.md', root),'utf8');
  assert.match(library,/Version 1\.1 · 7 September 2026/);
  for (const file of ['AGENTS.md','CLAUDE.md','DESIGN_SYSTEM.md']) assert.match(await readFile(new URL(file,root),'utf8'),/Elevate-Autocoach-Design-Library\.md/);
  assert.match(await readFile(new URL('DESIGN_SYSTEM.md',root),'utf8'),/1060px[\s\S]*32rem/,'The user’s uniform drawer-width decision is an explicit override');
});

test('all governed colors are exact literals and every root token is independent', () => {
  for(const declaration of rootDeclarations) assert.doesNotMatch(declaration.value,/var\s*\(/,declaration.file+' '+declaration.token+' must not alias another root token');
  for(const [token,value] of Object.entries(expected)) {
    const declarations=rootDeclarations.filter(item=>item.token===token);
    assert.ok(declarations.length,token+' is defined');
    for(const declaration of declarations) assert.equal(declaration.value.toUpperCase(),value,declaration.file+' '+token+' must use its exact governed value');
  }
});

test('the user-amended type scale is literal and keeps geometry independent', async () => {
  const expectedType={'--font-1':'0.6375rem','--font-2':'0.74375rem','--font-3':'0.85rem','--font-4':'1.0625rem','--font-5':'1.275rem','--font-6':'1.7rem','--line-1':'0.85rem','--line-2':'1.0625rem','--line-3':'1.275rem','--line-4':'1.4875rem','--line-5':'1.7rem','--line-6':'1.9125rem','--font-section-title':'0.85rem'};
  const library=await readFile(new URL('Elevate-Autocoach-Design-Library.md',root),'utf8');
  for(const [token,value] of Object.entries(expectedType)) {
    assert.equal(rootDeclarations.find(item=>item.token===token)?.value,value,token+' uses the exact 85% type scale');
    assert.ok(library.includes(token+': '+value),token+' agrees with the governing library');
  }
  assert.ok(rootDeclarations.some(item=>item.token==='--icon-target'&&item.value==='2rem'),'The 32px icon target is unchanged');
  assert.ok(rootDeclarations.some(item=>item.token==='--control-height'&&item.value==='2.25rem'),'The 36px control target is unchanged');
});

test('approved text, control, data and focus pairs retain measured contrast', () => {
  const neutrals=['--surface','--surface-soft','--canvas','--surface-strong'];
  for(const ink of ['--ink','--ink-700','--ink-500','--ink-400','--ink-300']) for(const neutral of neutrals) assert.ok(contrast(expected[ink],expected[neutral])>=4.5,ink+' on '+neutral);
  for(const [fg,bg] of [['--button-ink','--primary'],['--button-ink','--primary-hover'],['--success','--success-soft'],['--amber','--amber-soft'],['--rust','--rust-soft'],['--violet','--violet-soft'],['--automated','--automated-soft']]) assert.ok(contrast(expected[fg],expected[bg])>=4.5,fg+' on '+bg);
  for(const neutral of neutrals) for(const fg of ['--focus-ring','--border-strong']) assert.ok(contrast(expected[fg],expected[neutral])>=3,fg+' on '+neutral);
  for(const fg of ['--chart-primary','--chart-baseline','--chart-score']) assert.ok(contrast(expected[fg],expected['--surface'])>=3,fg+' on the white plot');
});

test('foundations have no downloaded fonts or decorative gradients', () => {
  assert.doesNotMatch(html,/fonts\.(?:googleapis|gstatic)\.com|\.(?:woff2?|ttf)(?:[?"'])/i);
  assert.doesNotMatch(css,/@font-face|(?:linear|radial|conic)-gradient\s*\(/i);
  const font=rootDeclarations.filter(item=>item.token==='--font-family');
  assert.ok(font.length);
  font.forEach(item=>assert.match(item.value,/^system-ui,\s*-apple-system,\s*BlinkMacSystemFont,\s*"Segoe UI",\s*sans-serif$/));
});

test('shared component vocabulary and accessibility modes exist', () => {
  for(const name of ['button--primary','button--secondary','segmented__option','view-tab','nav-item','kpi-strip','kpi-tile','kpi-value','data-table','table-scroll','status','drawer__header','search-control','filter-control','chart-summary']) assert.match(css,new RegExp('\\.'+name+'\\b'),name+' must have one shared implementation');
  assert.match(css,/prefers-reduced-motion:\s*reduce/);
  assert.match(css,/forced-colors:\s*active/);
  assert.doesNotMatch(css,/forced-color-adjust:\s*none/);
  assert.ok(rootDeclarations.some(item=>item.token==='--focus-width'&&item.value==='3px'));
  assert.ok(rootDeclarations.some(item=>item.token==='--focus-offset'&&item.value==='2px'));
});
