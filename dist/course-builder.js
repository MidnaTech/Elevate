/* Course series authoring. Drafts and published versions are owned by CourseAuthoringStore. */
(function () {
  'use strict';
  const h = value => escapeHtml(String(value ?? ''));
  const clone = value => JSON.parse(JSON.stringify(value));
  const api = () => globalThis.CourseAuthoringStore;
  const tabs = [['lesson', 'Lesson'], ['video', 'Video'], ['quiz', 'Quiz'], ['followup', 'Follow-up']];
  let dialog, opener, returnSeriesId = '', working = null, selectedTemplate = 'generic-three-level';
  let selectedLevel = 0, selectedTab = 'lesson', errors = [], note = '', storageAvailable = true;
  let templateFormOpen = false, templateName = '';

  function field(id, label, value, attrs = '', data = '') {
    return '<label class="field"><span class="field-label">' + h(label) + '</span><input class="filter-control" id="' + id + '" value="' + h(value) + '" ' + attrs + ' ' + data + '></label>';
  }
  function area(id, label, value, data = '', rows = 4) {
    return '<label class="field"><span class="field-label">' + h(label) + '</span><textarea class="filter-control" id="' + id + '" rows="' + rows + '" ' + data + '>' + h(value) + '</textarea></label>';
  }
  function select(id, label, value, options, data = '') {
    return '<label class="field"><span class="field-label">' + h(label) + '</span><select class="filter-control" id="' + id + '" ' + data + '>' + options.map(([key, text]) => '<option value="' + h(key) + '"' + (String(value) === String(key) ? ' selected' : '') + '>' + h(text) + '</option>').join('') + '</select></label>';
  }
  function button(id, label, primary = false, attrs = '') {
    return '<button class="button button--' + (primary ? 'primary' : 'secondary') + '" type="button" id="' + id + '" ' + attrs + '>' + h(label) + '</button>';
  }
  function currentLevel() { return working?.levels?.[selectedLevel]; }
  function publishedVersion() { return api().list().find(series => series.id === working?.id)?.version || 0; }
  function savedCopy(result) {
    const next = clone(result);
    storageAvailable = next.storageAvailable !== false;
    delete next.storageAvailable;
    return next;
  }
  function persistDraft(message = '') {
    if (!working) return;
    working = savedCopy(api().saveDraft(working));
    note = message || (publishedVersion() ? 'Draft saved locally. Published courses stay unchanged until you save a new version.' : 'Draft saved locally. Add the series to the library when it is ready.');
    updateStatus();
    if (publishedVersion() && !dialog.querySelector('#cb-discard-draft')) {
      const save = dialog.querySelector('#cb-save-draft');
      if (save) save.insertAdjacentHTML('beforebegin', button('cb-discard-draft', 'Discard changes'));
    }
  }
  function updateStatus() {
    const status = document.getElementById('cb-save-status');
    if (status) status.textContent = storageAvailable ? note : 'Local storage is unavailable. Keep this page open to retain your draft.';
    const title = dialog?.querySelector('[data-cb-level-title="' + selectedLevel + '"]');
    if (title && currentLevel()) title.textContent = currentLevel().title || 'Untitled course';
  }
  function ensureDialog() {
    if (dialog) return;
    dialog = document.createElement('dialog');
    dialog.id = 'course-builder-dialog';
    dialog.className = 'dialog drawer course-builder';
    dialog.setAttribute('aria-labelledby', 'cb-title');
    document.body.appendChild(dialog);
    dialog.addEventListener('close', () => {
      if (opener?.isConnected) opener.focus({ preventScroll: true });
      else {
        const templateId = opener?.dataset.useCourseTemplate;
        const selector = returnSeriesId ? '[data-edit-course-series="' + CSS.escape(returnSeriesId) + '"]' : templateId ? '[data-use-course-template="' + CSS.escape(templateId) + '"]' : '[data-open-course-builder]';
        document.querySelector(selector)?.focus({ preventScroll: true });
      }
    });
    // Every edit is already saved; closing must not create an unchanged draft of a published series.
    dialog.addEventListener('click', onClick);
    dialog.addEventListener('input', onInput);
    dialog.addEventListener('change', onChange);
    dialog.addEventListener('submit', onSubmit);
    dialog.addEventListener('keydown', event => {
      const tab = event.target.closest('[data-cb-tab]');
      if (!tab || !['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(event.key)) return;
      event.preventDefault();
      const index = tabs.findIndex(([key]) => key === tab.dataset.cbTab);
      const next = event.key === 'Home' ? 0 : event.key === 'End' ? tabs.length - 1 : (index + (event.key === 'ArrowRight' ? 1 : -1) + tabs.length) % tabs.length;
      dialog.querySelector('[data-cb-tab="' + tabs[next][0] + '"]').focus();
    });
    window.addEventListener('hashchange', () => { if (dialog.open) close(); });
  }
  function open(seriesId) {
    api().init(); ensureDialog();
    opener = document.activeElement; returnSeriesId = seriesId || '';
    working = seriesId ? api().get(seriesId, { draft: true }) : null;
    if (seriesId && !working) { showToast('That course draft is no longer available.'); return; }
    selectedLevel = 0; selectedTab = 'lesson'; errors = []; note = ''; templateFormOpen = false; templateName = '';
    if (!api().templates().some(template => template.id === selectedTemplate)) selectedTemplate = api().templates()[0]?.id || '';
    render();
    if (!dialog.open) dialog.showModal();
    dialog.scrollTop = 0;
    dialog.querySelector(working ? '#cb-series-title' : 'input[name="cb-template"]:checked')?.focus({ preventScroll: true });
  }
  function openTemplate(templateId) {
    api().init();
    const template = api().templates().find(item => item.id === templateId);
    if (!template) { showToast('That course template is no longer available.'); return; }
    ensureDialog(); if (!dialog.open) opener = document.activeElement; returnSeriesId = '';
    working = savedCopy(api().create(templateId));
    selectedTemplate = templateId; selectedLevel = 0; selectedTab = 'lesson'; errors = []; templateFormOpen = false; templateName = '';
    note = 'Created from ' + template.name + '. Your changes are saved as a local draft.';
    render();
    if (!dialog.open) dialog.showModal();
    dialog.scrollTop = 0;
    dialog.querySelector('#cb-series-title')?.focus({ preventScroll: true });
  }
  function close() { dialog.close(); }
  function errorMarkup() {
    return errors.length ? '<div class="card cb-errors" id="cb-errors" role="alert" tabindex="-1"><strong>Check these details</strong><ul>' + errors.map(error => '<li>' + h(error) + '</li>').join('') + '</ul></div>' : '';
  }
  function templatePicker() {
    return '<div class="cb-stack"><div><h3 class="section-title">Start with a template</h3><p>Build a course series with up to three levels. Adapt the lesson, video, questions and follow-up at each level.</p></div><fieldset class="cb-template-grid"><legend class="sr-only">Course template</legend>' + api().templates().map(template => '<label class="card cb-template-option"><input type="radio" name="cb-template" value="' + h(template.id) + '"' + (selectedTemplate === template.id ? ' checked' : '') + '><span><strong>' + h(template.name) + '</strong><span class="caption">' + template.levelCount + (template.levelCount === 1 ? ' level' : ' levels') + ' · ' + (template.builtin ? 'Built-in template' : 'Saved template') + '</span><span>' + h(template.description) + '</span></span></label>').join('') + '</fieldset><p class="caption">Templates create independent drafts. Source videos are never generated or uploaded by this prototype.</p><div class="cb-footer"><span></span>' + button('cb-use-template', 'Use template', true, !selectedTemplate ? 'disabled' : '') + '</div></div>';
  }
  function lessonEditor(level) {
    const sections = level.lesson?.length ? level.lesson : [{ heading: '', body: '' }];
    return '<div class="cb-stack"><div><h3 class="section-title">Short learner lesson</h3><p>Give the driver practical context before the video and quiz.</p></div>' + sections.map((section, index) => '<section class="cb-stack cb-lesson-section">' + field('cb-lesson-heading-' + index, 'Section ' + (index + 1) + ' heading', section.heading, 'type="text" maxlength="160"', 'data-cb-lesson="' + index + '" data-cb-lesson-field="heading"') + area('cb-lesson-body-' + index, 'Lesson text', section.body, 'data-cb-lesson="' + index + '" data-cb-lesson-field="body"', 5) + (sections.length > 1 ? '<div class="toolbar"><button class="text-link" type="button" data-cb-remove-lesson="' + index + '">Remove section ' + (index + 1) + '</button></div>' : '') + '</section>').join('') + '<div class="toolbar">' + button('cb-add-lesson', 'Add lesson section') + '</div></div>';
  }
  function videoEditor(level) {
    const video = level.video || { mode: 'planned', url: '', seconds: 60, script: '' };
    return '<div class="cb-stack"><div><h3 class="section-title">Video for this level</h3><p>Link a video you already host, or prepare its script while production is pending.</p></div><div class="cb-fields">' + select('cb-video-mode', 'Video source', video.mode, [['planned', 'Planned video script'], ['url', 'Hosted video URL']], 'data-cb-video="mode"') + field('cb-video-seconds', 'Video duration (seconds)', video.seconds, 'type="number" min="1" max="3600" step="1" required', 'data-cb-video="seconds"') + '</div>' +
      (video.mode === 'url' ? field('cb-video-url', 'Hosted video URL', video.url, 'type="url" required placeholder="https://example.com/training.mp4"', 'data-cb-video="url"') + '<p class="caption">Use a direct video file URL that your drivers can access. This prototype stores the link and does not upload files or check access permissions.</p>' : '<div class="card"><strong>Video production pending</strong><p>Add the narration or storyboard below. A planned script is clearly marked as unproduced in the library.</p></div>') + area('cb-video-script', video.mode === 'planned' ? 'Video script or narration' : 'Transcript or supporting script', video.script, 'data-cb-video="script"', 10) + '<p class="caption">Keep the video short and focused on the behavior. Learning happens while the driver is safely parked and off the driving task.</p></div>';
  }
  function quizEditor(level) {
    return '<div class="cb-stack"><div><h3 class="section-title">Three-question quiz</h3><p>Check the driver’s understanding with practical choices. Explain the right answer so missed questions teach something useful.</p></div>' + (level.questions || []).map((question, index) => '<fieldset class="card cb-question" data-cb-question="' + index + '"><legend>Question ' + (index + 1) + '</legend>' + area('cb-q-' + index + '-prompt', 'Question', question.prompt, 'data-cb-question-index="' + index + '" data-cb-question-field="prompt"', 3) + '<div class="cb-stack">' + [0, 1, 2].map(option => field('cb-q-' + index + '-option-' + option, 'Answer ' + String.fromCharCode(65 + option), question.options?.[option] || '', 'type="text" required maxlength="500"', 'data-cb-question-index="' + index + '" data-cb-option="' + option + '"')).join('') + '</div>' + select('cb-q-' + index + '-correct', 'Correct answer', question.correctIndex, [[0, 'Answer A'], [1, 'Answer B'], [2, 'Answer C']], 'data-cb-question-index="' + index + '" data-cb-question-field="correctIndex"') + area('cb-q-' + index + '-explanation', 'Answer explanation', question.explanation, 'data-cb-question-index="' + index + '" data-cb-question-field="explanation"', 3) + '</fieldset>').join('') + '<p class="caption">Drivers retry missed questions until all three are correct. Quiz completion and subsequent driving improvement remain separate outcomes.</p></div>';
  }
  function followupEditor(level) {
    const commitment = level.commitment || { title: '', prompt: '' };
    return '<div class="cb-stack"><div><h3 class="section-title">Put learning into practice</h3><p>Give the driver one clear commitment for the next trip.</p></div>' + field('cb-commitment-title', 'Follow-up title', commitment.title, 'type="text" maxlength="160"', 'data-cb-commitment="title"') + area('cb-commitment-prompt', 'Next-trip commitment or action plan', commitment.prompt, 'data-cb-commitment="prompt"', 6) +
      ((commitment.fields || []).length ? '<details><summary>Additional action-plan prompts from this template</summary><div class="cb-stack cb-details">' + commitment.fields.map(item => '<section><h4 class="section-title">' + h(item.label) + '</h4><p>' + h(item.prompt) + '</p></section>').join('') + '</div></details>' : '') + '<p class="caption">These materials support coaching. Programs decide when another course is needed and when a manager handles an exception.</p></div>';
  }
  function levelEditor() {
    const level = currentLevel();
    if (!level) return '<p>No course level is available.</p>';
    return '<section class="cb-stack" aria-labelledby="cb-level-heading"><div class="cb-heading"><h3 class="section-title" id="cb-level-heading">Level ' + (selectedLevel + 1) + '</h3><div class="toolbar">' + button('cb-move-up', 'Move up', false, 'data-cb-move="up"' + (selectedLevel === 0 ? ' disabled' : '')) + button('cb-move-down', 'Move down', false, 'data-cb-move="down"' + (selectedLevel === working.levels.length - 1 ? ' disabled' : '')) + button('cb-remove-level', 'Remove level', false, working.levels.length < 2 ? 'disabled title="Keep at least one course level."' : '') + '</div></div><div class="cb-fields">' + field('cb-level-title', 'Course title', level.title, 'type="text" required maxlength="120"', 'data-cb-level-field="title"') + field('cb-learning-goal', 'Learning goal', level.learningGoal, 'type="text" required maxlength="300"', 'data-cb-level-field="learningGoal"') + '</div>' + area('cb-tip', 'Coaching tip', level.tip, 'data-cb-level-field="tip"', 3) + '<div class="view-tabs" role="tablist" aria-label="Level ' + (selectedLevel + 1) + ' course content">' + tabs.map(([key, title]) => '<button class="view-tab" type="button" role="tab" id="cb-tab-' + key + '" data-cb-tab="' + key + '" aria-selected="' + (selectedTab === key) + '" aria-controls="cb-level-panel" tabindex="' + (selectedTab === key ? 0 : -1) + '">' + title + '</button>').join('') + '</div><section id="cb-level-panel" role="tabpanel" aria-labelledby="cb-tab-' + selectedTab + '" tabindex="0">' + ({ lesson: lessonEditor, video: videoEditor, quiz: quizEditor, followup: followupEditor })[selectedTab](level) + '</section></section>';
  }
  function editor() {
    const version = publishedVersion();
    return '<form class="cb-stack" id="cb-editor-form" novalidate>' + errorMarkup() + '<div class="cb-fields">' + field('cb-series-title', 'Course series title', working.title, 'type="text" required maxlength="120"', 'data-cb-series-field="title"') + select('cb-behavior', 'Behavior to improve', working.behaviorId, [['', 'Select a behavior'], ...Coaching.catalog.behaviors.map(item => [item.id, item.name])], 'data-cb-series-field="behaviorId"' + (version ? ' disabled' : '')) + '</div><div class="cb-progression"><h3 class="section-title">An ordered learning path</h3>' + (version ? '<p class="caption">The behavior stays fixed after publication. Create another series to teach a different behavior.</p>' : '') + '<p>Start with Level 1. After the course is complete and a full assessment period has passed, automation can move to the next level if the driver still needs coaching. Manager escalation follows the program’s settings.</p></div><div class="cb-heading"><fieldset class="segmented cb-levels"><legend class="sr-only">Course level</legend>' + working.levels.map((level, index) => '<label><input type="radio" name="cb-level" value="' + index + '" data-cb-level="' + index + '"' + (selectedLevel === index ? ' checked' : '') + '><span class="segmented__option"><span>Level ' + (index + 1) + '</span><span class="caption" data-cb-level-title="' + index + '">' + h(level.title || 'Untitled course') + '</span></span></label>').join('') + '</fieldset>' + button('cb-add-level', 'Add next level', false, working.levels.length >= 3 ? 'disabled title="A course series supports up to three levels."' : '') + '</div><p class="caption">' + working.levels.length + ' of 3 levels · Add, reorder or remove a level to adapt the learning path.</p>' + levelEditor() +
      '<section class="cb-stack cb-template-save"><div class="toolbar">' + button('cb-template-toggle', 'Save as a template', false, 'aria-expanded="' + templateFormOpen + '" aria-controls="cb-template-save-fields"') + '</div>' + (templateFormOpen ? '<div class="cb-template-save-fields" id="cb-template-save-fields">' + field('cb-template-name', 'Template name', templateName, 'type="text" maxlength="120"') + button('cb-save-template', 'Save template') + '</div><p class="caption">Save a reusable copy of this series. Future courses start from an independent draft.</p>' : '') + '</section><div class="cb-footer"><div><p class="caption" id="cb-save-status" role="status" tabindex="-1">' + h(storageAvailable ? note || (version ? 'Editing a draft of published version ' + version + '. Existing assignments retain their original version.' : 'Draft saved locally') : 'Local storage is unavailable. Keep this page open to retain your draft.') + '</p><p class="caption">Local prototype · no content is sent to drivers.</p></div><div class="toolbar">' + (version && api().list().find(item => item.id === working.id)?.hasDraft ? button('cb-discard-draft', 'Discard changes') : '') + button('cb-save-draft', 'Save draft') + '<button class="button button--primary" type="submit" id="cb-publish">' + (version ? 'Save new version' : 'Add to library') + '</button></div></div></form>';
  }
  function render(focusSelector) {
    dialog.innerHTML = '<header class="drawer__header"><div><h2 class="drawer__title" id="cb-title">' + (working ? 'Edit course series' : 'Create course') + '</h2><p class="drawer__context">' + (working ? 'Build each level, then add the series to your training library.' : 'Start from a reusable learning path.') + '</p></div><button class="button button--secondary button--icon" type="button" data-cb-close aria-label="Close course builder">' + uiIcon('close') + '</button></header><div class="drawer__body cb-body">' + (working ? editor() : templatePicker()) + '</div>';
    if (typeof applyDesignLibrary === 'function') applyDesignLibrary(dialog);
    if (focusSelector) requestAnimationFrame(() => dialog.querySelector(focusSelector)?.focus({ preventScroll: false }));
  }
  function updateInput(target) {
    if (!working) return;
    const level = currentLevel();
    let changed = true;
    if (target.dataset.cbSeriesField) working[target.dataset.cbSeriesField] = target.value;
    else if (target.dataset.cbLevelField) level[target.dataset.cbLevelField] = target.value;
    else if (target.dataset.cbVideo) {
      level.video ||= { mode: 'planned', url: '', seconds: 60, script: '' };
      level.video[target.dataset.cbVideo] = target.type === 'number' ? (target.value === '' ? null : Number(target.value)) : target.value;
    } else if (target.dataset.cbLesson !== undefined) {
      level.lesson ||= [];
      level.lesson[Number(target.dataset.cbLesson)] ||= { heading: '', body: '' };
      level.lesson[Number(target.dataset.cbLesson)][target.dataset.cbLessonField] = target.value;
    }
    else if (target.dataset.cbQuestionIndex !== undefined) {
      const question = level.questions[Number(target.dataset.cbQuestionIndex)];
      if (target.dataset.cbOption !== undefined) question.options[Number(target.dataset.cbOption)] = target.value;
      else question[target.dataset.cbQuestionField] = target.dataset.cbQuestionField === 'correctIndex' ? Number(target.value) : target.value;
      // Source option feedback may no longer fit an edited question; retain one explicit explanation.
      delete question.feedback;
    } else if (target.dataset.cbCommitment) {
      level.commitment ||= { title: '', prompt: '' };
      level.commitment[target.dataset.cbCommitment] = target.value;
    } else changed = false;
    if (changed) persistDraft();
  }
  function onInput(event) {
    if (event.target.id === 'cb-template-name') { templateName = event.target.value; return; }
    if (event.target.matches('input:not([type="radio"]), textarea')) updateInput(event.target);
  }
  function onChange(event) {
    const target = event.target;
    if (target.name === 'cb-template') { selectedTemplate = target.value; return; }
    if (target.dataset.cbLevel !== undefined) { selectedLevel = Number(target.dataset.cbLevel); errors = []; render('[data-cb-level="' + selectedLevel + '"]'); return; }
    if (target.tagName === 'SELECT') {
      updateInput(target);
      if (target.id === 'cb-video-mode') render('#cb-video-mode');
    }
  }
  function onSubmit(event) {
    if (event.target.id !== 'cb-editor-form') return;
    event.preventDefault();
    const result = api().publish(working);
    errors = result.errors || [];
    if (!result.ok) { render('#cb-errors'); return; }
    working = savedCopy(result.series);
    storageAvailable = result.storageAvailable !== false;
    note = 'Version ' + working.version + ' added to the training library. Existing assignments keep their original course version.';
    errors = [];
    render('#cb-save-status');
    showToast('Course series added to the library');
  }
  function onClick(event) {
    if (event.target.closest('[data-cb-close]')) { close(); return; }
    if (event.target === dialog) { const rect = dialog.getBoundingClientRect(); if (event.clientX < rect.left || event.clientX > rect.right || event.clientY < rect.top || event.clientY > rect.bottom) close(); return; }
    if (event.target.closest('#cb-use-template')) { openTemplate(selectedTemplate); return; }
    if (!working) return;
    const target = event.target.closest('button');
    if (!target) return;
    if (target.dataset.cbTab) { selectedTab = target.dataset.cbTab; render('[data-cb-tab="' + selectedTab + '"]'); return; }
    if (target.id === 'cb-save-draft') { persistDraft('Draft saved locally. It can be reopened from Your course series.'); return; }
    if (target.id === 'cb-discard-draft') {
      const result = api().deleteDraft(working.id);
      if (!result.ok) { errors = result.errors || []; render('#cb-errors'); return; }
      working = api().get(working.id); selectedLevel = Math.min(selectedLevel, working.levels.length - 1); errors = [];
      note = 'Unpublished changes discarded. Published version ' + working.version + ' is restored.';
      render('#cb-series-title'); return;
    }
    if (target.id === 'cb-remove-level' && working.levels.length > 1) {
      working.levels.splice(selectedLevel, 1); selectedLevel = Math.min(selectedLevel, working.levels.length - 1); errors = [];
      persistDraft(); render('[data-cb-level="' + selectedLevel + '"]'); return;
    }
    if (target.id === 'cb-add-level' && working.levels.length < 3) {
      working.levels.push(api().newLevel(working.id)); selectedLevel = working.levels.length - 1; selectedTab = 'lesson'; errors = [];
      persistDraft(); render('#cb-level-title'); return;
    }
    if (target.dataset.cbMove) {
      const next = selectedLevel + (target.dataset.cbMove === 'up' ? -1 : 1);
      if (next < 0 || next >= working.levels.length) return;
      const level = working.levels.splice(selectedLevel, 1)[0]; working.levels.splice(next, 0, level); selectedLevel = next;
      persistDraft(); render('[data-cb-level="' + selectedLevel + '"]'); return;
    }
    if (target.id === 'cb-add-lesson') { if (!currentLevel().lesson?.length) currentLevel().lesson = [{ heading: '', body: '' }]; currentLevel().lesson.push({ heading: '', body: '' }); persistDraft(); render('#cb-lesson-heading-' + (currentLevel().lesson.length - 1)); return; }
    if (target.dataset.cbRemoveLesson !== undefined) { currentLevel().lesson.splice(Number(target.dataset.cbRemoveLesson), 1); persistDraft(); render('#cb-add-lesson'); return; }
    if (target.id === 'cb-template-toggle') { templateFormOpen = !templateFormOpen; if (!templateName) templateName = working.title + ' template'; render(templateFormOpen ? '#cb-template-name' : '#cb-template-toggle'); return; }
    if (target.id === 'cb-save-template') {
      const result = api().saveTemplate(working, templateName.trim());
      errors = result.errors || [];
      if (!result.ok) { render('#cb-errors'); return; }
      note = 'Template saved. Use it to start an independent course series.'; templateFormOpen = false; errors = [];
      render('#cb-template-toggle'); showToast('Course template saved');
    }
  }
  document.addEventListener('click', event => {
    const create = event.target.closest('[data-open-course-builder]');
    if (create) { open(); return; }
    const edit = event.target.closest('[data-edit-course-series]');
    if (edit) { open(edit.dataset.editCourseSeries); return; }
    const template = event.target.closest('[data-use-course-template]');
    if (template) openTemplate(template.dataset.useCourseTemplate);
  });
  globalThis.CourseBuilder = { open, openTemplate, close, getDraft: () => working ? clone(working) : null };
})();
