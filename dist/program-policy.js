/* Locally saved programme policies. These settings do not evaluate events or run a scheduler. */
function programPolicyFor(programId) {
  const cfg = programSettingFor(programId);
  const program = categories.find(item => item.id === programId);
  const firstLesson = typeof lessons !== 'undefined' ? lessons.find(item => item.category === program?.name) : null;
  if (!cfg.policy || typeof cfg.policy !== 'object') cfg.policy = {};
  cfg.policy = { basis: 'calendar', window: 2, resetPeriods: null, graceDays: null, reminderCount: null,
    levelLessons: [firstLesson ? learningLessonId(firstLesson) : ''], ...cfg.policy };
  if (!['calendar', 'distance', 'driving_duration'].includes(cfg.policy.basis)) cfg.policy.basis = 'calendar';
  if (!Array.isArray(cfg.policy.levelLessons) || !cfg.policy.levelLessons.length) cfg.policy.levelLessons = [''];
  return cfg.policy;
}

function programPolicyPeriodLabel(programId) {
  const policy = programPolicyFor(programId);
  if (!(policy.window > 0)) return { calendar: 'Calendar period not set', distance: 'Distance not set', driving_duration: 'Driving duration not set' }[policy.basis];
  return Number(policy.window).toLocaleString('en-CA') + ' ' + ({ calendar: policy.window === 1 ? 'week' : 'weeks', distance: 'km', driving_duration: policy.window === 1 ? 'driving hour' : 'driving hours' }[policy.basis]);
}

function programPolicyControl(key, value, label, min = 1, max = 1000) {
  return '<input class="filter-control program-number" type="number" min="' + min + '" max="' + max + '" step="1" placeholder="—" value="' + (value ?? '') + '" data-program-policy="' + key + '" aria-label="' + escapeHtml(label) + '">';
}

function programPolicyCards(program) {
  const cfg = programSettingFor(program.id);
  const policy = programPolicyFor(program.id);
  const units = { calendar: 'weeks', distance: 'km', driving_duration: 'driving hours' };
  const period = programSettingCard('program-period-title', 'Evaluation period', 'Saved for this programme.',
    programSettingRow('Measure by', '', nativeSelect('data-program-policy="basis" aria-label="Evaluation period basis"', [['calendar', 'Calendar time'], ['distance', 'Distance'], ['driving_duration', 'Driving duration']], policy.basis)) +
    programSettingRow('Period length', '', programPolicyControl('window', policy.window, 'Evaluation period length', 1, 1000000) + '<span>' + units[policy.basis] + '</span>') +
    programSettingRow('Coaching threshold', 'Recorded scores are not recalculated by these settings.', programNumberInput('data-program-threshold="' + escapeHtml(program.id) + '"', cfg.threshold, 1, 100, 'Coach when the period score falls below') + '<span>/ 100</span>') +
    '<details class="program-policy-notes"><summary>Evaluation details</summary>' + programSettingRow('Minimum exposure', 'Legacy trip setting; exposure handling awaits the scoring model.', programNumberInput('data-program-escalation="minTrips"', cfg.minTrips, 0, 500, 'Minimum trips in the period before a driver is scored') + '<span>trips</span>') + '<p class="caption">Period settings are local configuration. Live event evaluation and score normalization are not connected.</p></details>');
  const options = [['', 'Choose a lesson'], ...lessons.map(item => [learningLessonId(item), item.title])];
  const rows = policy.levelLessons.map((lessonId, index) => '<div class="program-ladder-row"><strong>Level ' + (index + 1) + '</strong>' + nativeSelect('data-program-level="' + index + '" aria-label="Lesson for level ' + (index + 1) + '"', options, lessonId) + '<button class="icon-button" type="button" data-remove-program-level="' + index + '" aria-label="Remove level ' + (index + 1) + '"' + (policy.levelLessons.length === 1 ? ' disabled' : '') + '>' + uiIcon('close') + '</button></div>').join('');
  const ladder = programSettingCard('program-ladder-title', 'Coaching ladder', 'The same lesson can be used at multiple levels.',
    '<div class="program-ladder">' + rows + '<div class="program-ladder-row"><strong>Final step</strong><span>One-on-one coaching</span></div></div>' +
    programSettingRow('Reset after', 'Consecutive periods without a trigger.', programPolicyControl('resetPeriods', policy.resetPeriods, 'Consecutive good periods before resetting the coaching level') + '<span>periods</span>') +
    '<p class="caption">Levels and reset rules are saved locally. Automatic advancement is not connected.</p>',
    '<button class="button button--secondary" type="button" data-add-program-level>Add level</button>');
  const completion = programSettingCard('program-grace-title', 'Completion and follow-up', 'Watch the lesson and acknowledge it.',
    programSettingRow('Grace period', 'Time to watch and acknowledge.', programPolicyControl('graceDays', policy.graceDays, 'Grace period in days', 1, 365) + '<span>days</span>') +
    programSettingRow('Reminders', 'Number before one-on-one follow-up.', programPolicyControl('reminderCount', policy.reminderCount, 'Number of reminders', 0, 30)) +
    programSettingRow('When grace expires', '', '<span>One-on-one</span>') +
    '<p class="caption">Unset values need a decision. Saving does not send reminders or change existing sessions.</p>');
  return period + ladder + completion;
}

document.addEventListener('change', event => {
  if (!event.target.closest('[data-program-configuration-detail]')) return;
  const field = event.target.closest('[data-program-policy]');
  const level = event.target.closest('[data-program-level]');
  if (!field && !level) return;
  const policy = programPolicyFor(selectedProgramId);
  let focus;
  if (level) {
    policy.levelLessons[Number(level.dataset.programLevel)] = level.value;
    focus = '[data-program-level="' + level.dataset.programLevel + '"]';
  } else {
    const key = field.dataset.programPolicy;
    if (key === 'basis') {
      policy.savedWindows = { ...(policy.savedWindows || {}), [policy.basis]: policy.window };
      policy.basis = field.value;
      policy.window = policy.savedWindows[policy.basis] ?? (policy.basis === 'calendar' ? 2 : null);
    } else if (field.value === '') policy[key] = null;
    else {
      if (!field.checkValidity()) { field.reportValidity(); return; }
      policy[key] = Number(field.value);
    }
    focus = '[data-program-policy="' + key + '"]';
  }
  saveProgramSettings();
  // Numeric edits do not change the form anatomy; keep the user's next field intact.
  if (level || field?.dataset.programPolicy === 'basis') rerenderProgramConfiguration(focus);
  else {
    const help = document.getElementById('program-flow-copy');
    const program = categories.find(item => item.id === selectedProgramId);
    if (help && program) help.dataset.tooltip = programFlowCopy(program);
  }
});

document.addEventListener('click', event => {
  if (!event.target.closest('[data-program-configuration-detail]')) return;
  const add = event.target.closest('[data-add-program-level]');
  const remove = event.target.closest('[data-remove-program-level]');
  if (!add && !remove) return;
  const policy = programPolicyFor(selectedProgramId);
  if (add) policy.levelLessons.push('');
  else if (policy.levelLessons.length > 1) policy.levelLessons.splice(Number(remove.dataset.removeProgramLevel), 1);
  saveProgramSettings();
  rerenderProgramConfiguration(add ? '[data-program-level="' + (policy.levelLessons.length - 1) + '"]' : '[data-add-program-level]');
});
