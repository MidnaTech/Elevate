// Guided setup and versioned policies: migration, drafts, activation, staging and stable mappings.
import assert from 'node:assert/strict';
const { chromium } = await import(process.env.PLAYWRIGHT_MODULE || 'playwright');
const browser = await chromium.launch({ headless: true, channel: process.env.BROWSER_CHANNEL || 'chrome' });
const page = await browser.newPage({ viewport: { width: 1440, height: 1000 }, reducedMotion: 'reduce' });
const base = process.env.BASE_URL || 'http://localhost:4173';
page.setDefaultTimeout(10000);
await page.route('**/*', route => ['localhost', '127.0.0.1', '[::1]'].includes(new URL(route.request().url()).hostname) ? route.continue() : route.abort());
const errors = [];
page.on('pageerror', error => errors.push(error.message));
const policy = id => page.evaluate(id => ProgramSetup.getPolicy(id), id);
const stored = key => page.evaluate(key => JSON.parse(localStorage.getItem(key) || 'null'), key);
const configuration = id => page.goto(base + '/?program=' + id + '&programTab=configuration#programs');
const action = name => page.locator('[data-ps-action="' + name + '"]');
const openAddRule = async () => {
  await page.locator('#ps-add-rule-button').click();
  await page.waitForFunction(() => document.activeElement.id === 'ps-rule-name');
};
const fillRule = async ({ name, condition, severity = 'High', allowance = '0' }) => {
  await page.fill('#ps-rule-name', name);
  await page.fill('#ps-rule-condition', condition);
  await page.selectOption('#ps-rule-severity', severity);
  await page.fill('#ps-rule-allowance', String(allowance));
};
const submitRule = () => page.locator('#ps-add-rule-form button[type="submit"]').click();
const previewPolicy = id => page.evaluate(id => ProgramSetup.getPreviewPolicy(id), id);
try {
  await configuration('all');
  const originalCount = await page.evaluate(() => categories.length);
  assert.equal(await page.locator('#program-page-panel tbody tr').count(), originalCount);
  const migration = await stored('elevate-program-policies-v1');
  assert.equal(migration.schemaVersion, 1);
  assert.equal(migration.policies.length, originalCount);
  assert.equal(migration.legacyCourses.length, 6);
  assert.ok(migration.legacyCourses.every(course => !course.videoUrl && !course.questions.length), 'Legacy content remains incomplete');
  assert.equal((await policy('speeding')).status, 'draft');
  assert.deepEqual((await policy('speeding')).courseIds, [], 'Migration does not invent ready media for legacy courses');
  const initialRule = (await policy('speeding')).rules[0];
  assert.equal(initialRule.ruleId, 'speeding-50', 'Migration preserves connected rule IDs');
  assert.ok(initialRule.condition);
  await page.reload();
  assert.equal((await stored('elevate-program-policies-v1')).legacyCourses.length, 6, 'Migration is idempotent');

  // A separate pre-migration workspace retains user rule and routing settings verbatim.
  const prior = await browser.newPage();
  await prior.goto(base + '/#programs');
  await prior.evaluate(() => {
    localStorage.removeItem('elevate-program-policies-v1');
    localStorage.setItem('elevate-program-settings', JSON.stringify({ speeding: { threshold: 63, coachMode: 'group', coach: 'Morgan Chen', groupCoaches: { 'Long haul · North': '' } } }));
    const savedRules = JSON.parse(localStorage.getItem('elevate-event-types') || JSON.stringify(eventTypeRules));
    Object.assign(savedRules.find(rule => rule.id === 'speeding-50'), { severity: 'Low', threshold: 9, enabled: false });
    localStorage.setItem('elevate-event-types', JSON.stringify(savedRules));
    localStorage.setItem('elevate-unrelated-setting', 'preserve-me');
  });
  await prior.reload();
  const preserved = await prior.evaluate(() => ProgramSetup.getPolicy('speeding'));
  assert.equal(preserved.scoreThreshold, 63);
  assert.equal(preserved.coach, 'Morgan Chen');
  assert.equal(preserved.coachMode, 'group');
  assert.ok(Object.values(preserved.groupCoaches).every(value => value === ''), 'Migration preserves unassigned group routing instead of choosing a manager');
  assert.deepEqual({ severity: preserved.rules[0].severity, allowance: preserved.rules[0].allowance, enabled: preserved.rules[0].enabled }, { severity: 'Low', allowance: 9, enabled: false });
  assert.equal(await prior.evaluate(() => localStorage.getItem('elevate-unrelated-setting')), 'preserve-me');
  await prior.close();

  // Imported settings persist additively, while incomplete courses block activation.
  await configuration('speeding');
  const importedBeforeRuleForm = await policy('speeding');
  const suggestedRuleName = await page.evaluate(() => Coaching.catalog.rules.find(rule => rule.behaviorId === 'speeding' && !ProgramSetup.getPolicy('speeding').rules.some(mapped => mapped.ruleId === rule.id || mapped.name?.trim().toLowerCase() === rule.name.trim().toLowerCase())).name);
  await openAddRule();
  await fillRule({ name: '  ' + suggestedRuleName.toUpperCase() + '  ', condition: 'A duplicate source definition must not be added.' });
  await submitRule();
  assert.equal(await page.locator('#ps-add-rule-form').isVisible(), true, 'Duplicate names from available catalog suggestions are rejected');
  assert.deepEqual(await policy('speeding'), importedBeforeRuleForm, 'A rejected duplicate cannot change existing program mappings');
  await action('cancel-rule').click();
  await page.waitForFunction(() => document.activeElement.id === 'ps-add-rule-button');
  const ruleNames = await page.locator('#ps-rules-title').locator('..').locator('..').locator('tbody th').allTextContents();
  assert.equal(ruleNames.filter(name => name.startsWith('Speeding over 80 km/h')).length, 1, 'Suggestions never duplicate a connected rule with the same name');
  await action('activate').click();
  assert.match(await page.locator('#ps-errors').innerText(), /video-and-quiz/);
  await page.waitForFunction(() => document.activeElement.id === 'ps-errors');
  await action('recommend-courses').click();
  assert.equal((await policy('speeding')).courseIds.length, 3);
  await action('activate').click();
  assert.equal((await policy('speeding')).status, 'active');
  assert.equal((await policy('speeding')).legacyCourseIds.length, 1, 'Imported mapping remains recorded after recommendation');

  // First-step drafts persist; closing or reloading does not lose setup progress.
  await configuration('all');
  await page.locator('#program-page-panel [data-ps-start]').click();
  await page.waitForFunction(() => document.activeElement.id === 'ps-name');
  await page.fill('#ps-name', 'Night driving speed');
  await page.selectOption('#ps-audienceMode', 'groups');
  const firstGroup = await page.locator('[data-ps-group]').first().getAttribute('data-ps-group');
  await page.locator('[data-ps-group]').first().check();
  await action('next').click();
  assert.match(await page.locator('#ps-rules-title').innerText(), /Connected rules/);
  await page.fill('#ps-scoreThreshold', '80');
  await page.locator('[data-ps-rule-field="allowance"]').first().fill('2');

  // Rules can be created directly in the wizard without changing existing mappings on Cancel.
  const beforeWizardRule = await previewPolicy('__new');
  await openAddRule();
  await fillRule({ name: 'Discard this rule', condition: 'This draft definition must not enter the program.', allowance: 4 });
  await action('cancel-rule').click();
  await page.waitForFunction(() => document.activeElement.id === 'ps-add-rule-button');
  assert.equal(await page.locator('#ps-add-rule-form').isVisible(), false);
  assert.deepEqual(await previewPolicy('__new'), beforeWizardRule, 'Cancel does not add or mutate a wizard rule');

  await openAddRule();
  await fillRule({ name: '   ', condition: 'Connected speed event above the configured limit.' });
  await submitRule();
  assert.equal(await page.locator('#ps-add-rule-form').isVisible(), true, 'Whitespace-only rule names are rejected');
  assert.deepEqual(await previewPolicy('__new'), beforeWizardRule);
  await fillRule({ name: 'Night speed exception', condition: '   ' });
  await submitRule();
  assert.equal(await page.locator('#ps-add-rule-form').isVisible(), true, 'Whitespace-only detection conditions are rejected');
  assert.deepEqual(await previewPolicy('__new'), beforeWizardRule);
  const nightRuleDefinition = { name: 'Night speed exception', condition: 'Connected feed reports speed over 70 km/h between 22:00 and 05:00.', severity: 'Medium', allowance: 2 };
  await fillRule({ ...nightRuleDefinition, allowance: -1 });
  await submitRule();
  assert.equal(await page.locator('#ps-rule-allowance').evaluate(input => input.validity.rangeUnderflow), true, 'The native tolerated-count minimum is enforced');
  assert.deepEqual(await previewPolicy('__new'), beforeWizardRule);
  await fillRule(nightRuleDefinition);
  await submitRule();
  const wizardAddedRule = (await previewPolicy('__new')).rules.find(rule => rule.name === nightRuleDefinition.name);
  assert.ok(wizardAddedRule, 'A valid custom connected rule is added in the wizard');
  assert.match(wizardAddedRule.ruleId, /^custom-rule-/);
  assert.deepEqual({ name: wizardAddedRule.name, condition: wizardAddedRule.condition, severity: wizardAddedRule.severity, allowance: wizardAddedRule.allowance, behaviorId: wizardAddedRule.behaviorId, enabled: wizardAddedRule.enabled }, { ...nightRuleDefinition, behaviorId: 'speeding', enabled: true });
  await page.waitForFunction(id => document.activeElement.dataset.psRule === id && document.activeElement.dataset.psRuleField === 'enabled', wizardAddedRule.ruleId);
  assert.equal(await page.locator('#ps-add-rule-form').isVisible(), false, 'Success closes the inline form and focuses the new rule checkbox');

  // Normalized custom rule names also remain unique within the program.
  await openAddRule();
  await fillRule({ ...nightRuleDefinition, name: '  NIGHT SPEED EXCEPTION  ' });
  await submitRule();
  assert.equal(await page.locator('#ps-add-rule-form').isVisible(), true);
  assert.equal((await previewPolicy('__new')).rules.filter(rule => rule.name === nightRuleDefinition.name).length, 1);
  await action('cancel-rule').click();
  await action('close-wizard').click();
  assert.match(await page.locator('#program-page-panel').innerText(), /Continue setting up Night driving speed/);
  await page.reload();
  await page.getByRole('button', { name: 'Resume setup' }).click();
  assert.equal(await page.inputValue('#ps-scoreThreshold'), '80');
  assert.equal(await page.locator('[data-ps-rule-field="allowance"]').first().inputValue(), '2');
  assert.deepEqual((await previewPolicy('__new')).rules.find(rule => rule.ruleId === wizardAddedRule.ruleId), wizardAddedRule, 'Wizard reload preserves the custom rule ID and source definition');
  await action('save-draft').click();
  const draftId = 'night-driving-speed';
  let draft = await policy(draftId);
  assert.equal(draft.status, 'draft');
  assert.equal(draft.scoreThreshold, 80);
  assert.deepEqual(draft.audience, { mode: 'groups', groups: [firstGroup] });
  assert.equal(await page.inputValue('#program-page-select'), draftId);
  await page.reload();
  assert.equal(await page.inputValue('#ps-name'), 'Night driving speed');
  assert.equal((await policy(draftId)).rules[0].allowance, 2);
  assert.deepEqual((await policy(draftId)).rules.find(rule => rule.ruleId === wizardAddedRule.ruleId), wizardAddedRule, 'Saving and reopening a draft retains custom rule mappings');

  // Configuration is one editable page; the advanced cadence is independent of fleet/reporting settings.
  const fleetCadence = await page.evaluate(() => cadenceWeeks);
  const reportingPeriod = await page.evaluate(() => coachingPeriod);
  await page.locator('#ps-advanced > summary').click();
  await page.selectOption('#ps-assessmentBasis', 'distance');
  assert.equal(await page.locator('#ps-advanced').getAttribute('open'), '');
  await page.fill('#ps-assessmentAmount', '1200');
  await page.selectOption('#ps-assessmentUnit', 'km');
  await page.selectOption('#ps-coachMode', 'group');
  await page.locator('[data-ps-group-coach]').selectOption('Morgan Chen');
  await action('activate').click();
  draft = await policy(draftId);
  assert.equal(draft.status, 'active');
  assert.deepEqual(draft.rules.find(rule => rule.ruleId === wizardAddedRule.ruleId), wizardAddedRule, 'Activation retains the custom rule ID, condition and thresholds');
  assert.deepEqual(draft.assessment, { basis: 'distance', amount: 1200, unit: 'km' });
  assert.equal(draft.groupCoaches[firstGroup], 'Morgan Chen');
  assert.equal(await page.evaluate(() => cadenceWeeks), fleetCadence);
  assert.equal(await page.evaluate(() => coachingPeriod), reportingPeriod);
  assert.equal(await page.locator('#program-page-period').count(), 0);
  assert.equal(await page.locator('#program-page-kpis').count(), 0);

  // Active edits are staged locally and do not change any committed adapters until saved.
  const originalVersion = draft.version;
  const courseIds = draft.courseIds.slice();
  const ruleIds = draft.rules.map(rule => rule.ruleId);
  await page.fill('#ps-name', 'Safer night speeds');
  await page.fill('#ps-scoreThreshold', '82');
  assert.equal((await policy(draftId)).name, 'Night driving speed');
  assert.equal((await policy(draftId)).scoreThreshold, 80);
  assert.match(await page.locator('#ps-review-title').locator('..').locator('..').innerText(), /below 82/, 'Plain-language preview follows staged edits');
  assert.equal(await page.evaluate(id => programSettingFor(id).threshold, draftId), 80, 'Legacy adapter does not apply staged active changes');
  assert.equal(await page.evaluate(id => ProgramSetup.getPreviewPolicy(id).scoreThreshold, draftId), 82, 'Preview can inspect staged configuration');
  await page.reload();
  assert.equal(await page.inputValue('#ps-name'), 'Safer night speeds', 'Staged active edits survive reload');
  assert.equal((await policy(draftId)).name, 'Night driving speed');
  await action('discard').click();
  assert.equal(await page.inputValue('#ps-name'), 'Night driving speed');
  await page.fill('#ps-name', 'Safer night speeds');
  await page.fill('#ps-scoreThreshold', '82');
  await action('save-active').click();
  draft = await policy(draftId);
  assert.equal(draft.version, originalVersion + 1);
  assert.equal(draft.name, 'Safer night speeds');
  assert.equal(draft.scoreThreshold, 82);
  assert.deepEqual(draft.courseIds, courseIds, 'Renaming cannot break stable course mappings');
  assert.deepEqual(draft.rules.map(rule => rule.ruleId), ruleIds);
  assert.equal(await page.evaluate(id => programSettingFor(id).threshold, draftId), 82);
  assert.ok((await page.evaluate(id => eventTypeRules.filter(rule => rule.programId === id), draftId)).every(rule => rule.id.includes('::') && rule.sourceRuleId), 'New rules have program-scoped adapters and stable source IDs');
  await page.reload();
  assert.equal(await page.inputValue('#ps-name'), 'Safer night speeds');
  assert.equal(await page.locator('#program-page-select option:checked').innerText(), 'Safer night speeds');
  await page.getByRole('tab', { name: 'Learning', exact: true }).click();
  assert.equal(await page.locator('#program-page-panel tbody tr').count(), courseIds.length);

  // Invalid staged changes cannot publish a policy revision.
  await page.getByRole('tab', { name: 'Configuration', exact: true }).click();
  const allowanceInput = page.locator('[data-ps-rule-field="allowance"]').first();
  await allowanceInput.fill('');
  assert.equal(await page.evaluate(id => ProgramSetup.getPreviewPolicy(id).rules[0].allowance, draftId), null, 'A cleared allowance remains missing rather than becoming zero');
  await action('save-active').click();
  assert.match(await page.locator('#ps-errors').innerText(), /allowance/i);
  assert.equal(await page.locator('[data-ps-rule-field="allowance"]').first().inputValue(), '', 'Invalid blank survives validation rerender');
  assert.equal((await policy(draftId)).rules[0].allowance, 2, 'Invalid staged allowance cannot change the active policy');
  assert.equal((await policy(draftId)).version, originalVersion + 1);
  await action('discard').click();
  await page.fill('#ps-scoreThreshold', '-1');
  await action('save-active').click();
  assert.match(await page.locator('#ps-errors').innerText(), /threshold/i);
  assert.equal((await policy(draftId)).scoreThreshold, 82);
  await action('discard').click();
  await page.locator('#ps-advanced > summary').click();
  await page.fill('#ps-reminderDays', '3, 9');
  await action('save-active').click();
  assert.match(await page.locator('#ps-errors').innerText(), /reminder/i);
  assert.equal((await policy(draftId)).version, originalVersion + 1);
  await action('discard').click();

  // Active configuration stages newly added rules; Discard and Save respect policy versions.
  const beforeActiveRule = await policy(draftId);
  const committedAdapters = await page.evaluate(id => eventTypeRules.filter(rule => rule.programId === id), draftId);
  const activeRuleDefinition = { name: 'Residential speed exception', condition: 'Connected feed reports speed above the posted residential limit.', severity: 'High', allowance: 1 };
  await openAddRule();
  await fillRule(activeRuleDefinition);
  await submitRule();
  const discardedRule = (await previewPolicy(draftId)).rules.find(rule => rule.name === activeRuleDefinition.name);
  assert.ok(discardedRule);
  assert.deepEqual(await policy(draftId), beforeActiveRule, 'Adding a rule does not modify the committed active policy');
  assert.deepEqual(await page.evaluate(id => eventTypeRules.filter(rule => rule.programId === id), draftId), committedAdapters, 'A staged new rule does not enter legacy event adapters');
  await page.reload();
  assert.deepEqual((await previewPolicy(draftId)).rules.find(rule => rule.ruleId === discardedRule.ruleId), discardedRule, 'Staged active additions survive reload without publishing');
  await action('discard').click();
  assert.deepEqual(await previewPolicy(draftId), beforeActiveRule, 'Discard removes the staged rule and preserves the active version');
  assert.equal(await page.locator('[data-ps-rule="' + discardedRule.ruleId + '"]').count(), 0);

  await openAddRule();
  await fillRule(activeRuleDefinition);
  await submitRule();
  const committedRule = (await previewPolicy(draftId)).rules.find(rule => rule.name === activeRuleDefinition.name);
  assert.notEqual(committedRule.ruleId, discardedRule.ruleId, 'A later creation receives a fresh stable ID');
  await action('save-active').click();
  const afterActiveRule = await policy(draftId);
  assert.equal(afterActiveRule.version, beforeActiveRule.version + 1);
  assert.deepEqual(afterActiveRule.rules.find(rule => rule.ruleId === committedRule.ruleId), committedRule);
  assert.deepEqual(afterActiveRule.rules.filter(rule => rule.ruleId !== committedRule.ruleId), beforeActiveRule.rules, 'Publishing an addition preserves all existing rule mappings');
  const customAdapter = await page.evaluate(({ id, ruleId }) => eventTypeRules.find(rule => rule.programId === id && rule.sourceRuleId === ruleId), { id: draftId, ruleId: committedRule.ruleId });
  assert.equal(customAdapter.name, activeRuleDefinition.name);
  assert.equal(customAdapter.condition, activeRuleDefinition.condition);
  await page.reload();
  assert.deepEqual((await policy(draftId)).rules.find(rule => rule.ruleId === committedRule.ruleId), committedRule, 'Published additions retain stable IDs after reload');

  // Full four-step creation recommends a pool, offers preview, and activates under the fleet mode.
  await configuration('all');
  await page.locator('#program-page-panel [data-ps-start]').click();
  await page.fill('#ps-name', 'Braking improvement');
  await page.selectOption('#ps-behaviorId', 'braking');
  await action('next').click();
  await action('next').click();
  assert.equal(await page.locator('[data-ps-course]:checked').count(), 3);
  await action('next').click();
  assert.match(await page.locator('#program-page-panel').innerText(), /Sample score 68\/100 is below the 75-point threshold/);
  assert.equal(await page.evaluate(() => ProgramSetup.getPreviewPolicy('__new').behaviorId), 'braking');
  await action('activate').click();
  assert.equal((await policy('braking-improvement')).status, 'active');

  // All-program content deduplicates shared courses while exposing both programs.
  await page.goto(base + '/?program=all&programTab=content#programs');
  const rows = await page.locator('#program-page-panel tbody tr th').allTextContents();
  assert.equal(new Set(rows).size, rows.length);
  const introTitle = await page.evaluate(() => Coaching.catalog.courses.find(course => course.id === 'speeding-course-1').title);
  const introRow = page.locator('#program-page-panel tbody tr').filter({ has: page.getByRole('rowheader', { name: introTitle, exact: true }) });
  assert.match(await introRow.innerText(), /Speeding/);
  assert.match(await introRow.innerText(), /Safer night speeds/);

  // The long configuration reflows at mobile and enlarged text without page-level overflow.
  await page.setViewportSize({ width: 390, height: 844 });
  await configuration(draftId);
  assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1), true);
  await openAddRule();
  await fillRule({ name: 'Mobile draft', condition: 'A readable rule definition on a narrow screen.' });
  assert.equal(await page.locator('#ps-add-rule-form').isVisible(), true);
  assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1), true, 'The inline Add rule form reflows on mobile');
  const mobileRuleBeforeCancel = await policy(draftId);
  await page.evaluate(() => document.documentElement.style.fontSize = '32px');
  assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1), true, '200% text stays inside the page with local table scrolling');
  assert.equal(await page.locator('#ps-name').isVisible(), true);
  assert.equal(await page.locator('#ps-rule-name').isVisible(), true, 'Add rule remains usable at 200% text zoom');
  await action('cancel-rule').click();
  await page.waitForFunction(() => document.activeElement.id === 'ps-add-rule-button');
  assert.deepEqual(await policy(draftId), mobileRuleBeforeCancel, 'Cancelling the mobile form keeps committed mappings unchanged');
  assert.deepEqual(errors, []);
  console.log('Program configuration acceptance passed: migration, four-step setup, drafts, activation, versioned edits, stable mappings, inline rule creation and validation, local persistence and reflow.');
} catch (error) {
  console.error('Configuration failure at', page.url(), 'Page errors:', errors, 'Panel:', await page.locator('#program-page-panel').innerText().catch(() => 'unavailable'));
  throw error;
} finally { await browser.close(); }
