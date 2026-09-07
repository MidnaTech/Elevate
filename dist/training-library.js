/* Training library and course inspection. Preview activity never creates assignments. */
(function () {
  'use strict';
  const h = value => escapeHtml(String(value ?? ''));
  const pack = () => globalThis.SpeedingCoursePack;
  const materialFor = id => globalThis.CourseAuthoringStore?.getMaterials(id) || pack()?.levels.find(level => level.id === id);
  const courses = () => ProgramSetup.getCourses();
  const usedBy = id => ProgramSetup.getPolicies().filter(policy => [...policy.courseIds, ...(policy.legacyCourseIds || [])].includes(id));
  const behavior = course => Coaching.catalog.behaviors.find(item => item.id === course.behaviorId)?.name || course.category || 'Uncategorized';
  const readiness = course => course.legacy ? 'legacy' : materialFor(course.id) ? 'authored' : 'sample';
  const readinessLabel = course => course.videoUrl ? 'Video linked' : ({ authored: 'Materials prepared', sample: 'Sample outline', legacy: 'Incomplete' })[readiness(course)];
  const runtime = course => {
    const seconds = materialFor(course.id)?.videoSeconds || course.videoSeconds || Math.round((course.durationMinutes || 0) * 60);
    return Math.floor(seconds / 60) + ':' + String(seconds % 60).padStart(2, '0');
  };
  const levelLabel = course => course.legacy ? 'Imported lesson' : 'Level ' + course.level;
  let dialog, opener, selectedCourse, selectedTab = 'lesson', answers = {}, passed = new Set(), feedback = [], submitted = false;
  let libraryView = new URLSearchParams(location.search).get('libraryTab') === 'templates' ? 'templates' : 'courses';
  const tabs = [['lesson', 'Lesson'], ['video', 'Video'], ['quiz', 'Quiz'], ['followup', 'Follow-up']];

  function metrics() {
    return { courses: courses().length, authored: courses().filter(course => readiness(course) === 'authored').length, incomplete: courses().filter(course => course.legacy).length };
  }
  function previewButton(course, text = 'Preview course') {
    return '<button class="button button--secondary" type="button" data-tl-open="' + h(course.id) + '" aria-haspopup="dialog" aria-label="' + h(text + ': ' + course.title) + '">' + h(text) + '</button>';
  }
  function featured() {
    return '<section class="tl-featured" id="tl-featured" aria-labelledby="tl-pack-title"><div class="tl-section-heading"><div><p class="eyebrow">Featured course series · Heavy-duty drivers</p><h2 class="section-title" id="tl-pack-title">Heavy-truck speeding</h2><p>Build safer speed decisions, from an early habit reset to judgment under pressure.</p></div>' + uiStatus('Video production pending') + '</div><div class="tl-levels">' + (pack()?.levels || []).map(level => {
      const course = courses().find(item => item.id === level.id);
      if (!course) return '';
      return '<article class="card tl-level"><span class="caption">Level ' + level.level + '</span><h3 class="section-title">' + h(course.title) + '</h3><p>' + h(level.learningGoal) + '</p><p class="caption">' + h(level.estimatedDuration) + ' estimated · ' + h(runtime(course)) + ' video target · 3-question quiz</p><div class="toolbar">' + previewButton(course) + '</div></article>';
    }).join('') + '</div><p class="caption">Lessons, scripts and question banks are prepared. Videos have not been produced. Estimated course times include reading and reflection.</p></section>';
  }
  function mountFilters() {
    const field = document.getElementById('tl-behavior');
    if (field && !field.dataset.ready) {
      field.innerHTML = '<option value="all">All behaviors</option>' + Coaching.catalog.behaviors.map(item => '<option value="' + h(item.id) + '">' + h(item.name) + '</option>').join('');
      field.dataset.ready = 'true';
    }
  }
  function authoringSeries(term, behaviorId) {
    const series = (globalThis.CourseAuthoringStore?.list() || []).filter(item => (!term || (item.title || '').toLowerCase().includes(term)) && (behaviorId === 'all' || item.behaviorId === behaviorId));
    if (!series.length) return '';
    return '<section aria-labelledby="tl-series-title"><div class="tl-section-heading"><div><h2 class="section-title" id="tl-series-title">Your course series</h2><p class="caption">Draft your videos and quizzes, then add the series to the library when it is ready to review.</p></div></div>' + uiTable('Your course series', ['Series', 'Behavior', 'Progression', 'State', 'Action'], series.map(item => '<tr data-tl-series="' + h(item.id) + '"><th scope="row">' + h(item.title || 'Untitled series') + '</th><td>' + h(behavior(item)) + '</td><td>' + (item.levels || []).map((level, index) => 'Level ' + (index + 1) + ': ' + h(level.title || 'Untitled course')).join('<br>') + '</td><td>' + uiStatus(item.status === 'published' ? 'In library' : 'Draft') + '<p class="caption">' + (item.status === 'published' ? 'v' + h(item.version) + (item.hasDraft ? ' · Unpublished changes' : '') : 'Not available for assignment') + '</p></td><td><button class="text-link" type="button" data-edit-course-series="' + h(item.id) + '">' + (item.status === 'published' ? 'Edit series' : 'Continue editing') + '</button></td></tr>').join('')) + '</section>';
  }
  function templatesMarkup(term, behaviorId) {
    const templates = (globalThis.CourseAuthoringStore?.templates() || []).filter(item => (!term || (item.title || item.name || '').toLowerCase().includes(term)) && (behaviorId === 'all' || !item.behaviorId || item.behaviorId === behaviorId));
    return '<div class="tl-workspace"><section aria-labelledby="tl-templates-title"><div class="tl-section-heading"><div><h2 class="section-title" id="tl-templates-title">Reusable course templates</h2><p>Start with a prepared structure, customize each level’s video and quiz, and save your own templates for the next series.</p></div><span class="caption" id="tl-result-count" role="status">' + templates.length + ' templates</span></div><div class="tl-levels">' + templates.map(item => '<article class="card tl-level" data-tl-template="' + h(item.id) + '"><span class="caption">' + (item.builtin ? 'Starter template' : 'Saved template') + '</span><h3 class="section-title">' + h(item.title || item.name) + '</h3><p>' + h(item.description || 'Reusable lessons, video plans and quiz questions.') + '</p><p class="caption">' + (item.levels?.length || item.levelCount || 1) + ' levels · Independent copy on use</p><div class="toolbar"><button class="button button--secondary" type="button" data-use-course-template="' + h(item.id) + '">Use template</button></div></article>').join('') + '</div>' + (!templates.length ? '<div class="card empty-state"><strong>No matching templates</strong><span>Clear the search or choose another behavior.</span><button class="button button--secondary" type="button" data-tl-reset>Clear filters</button></div>' : '') + '</section></div>';
  }
  function render(term = '') {
    mountFilters();
    const filters = Object.fromEntries(['behavior', 'level', 'readiness'].map(key => [key, document.getElementById('tl-' + key)?.value || 'all']));
    document.querySelectorAll('[data-tl-view]').forEach(tab => { const active = tab.dataset.tlView === libraryView; tab.setAttribute('aria-selected', String(active)); tab.tabIndex = active ? 0 : -1; });
    document.getElementById('library-grid')?.setAttribute('aria-labelledby', 'tl-view-' + libraryView);
    const filterSheet = document.querySelector('[data-filter-sheet="training"]');
    if (filterSheet) filterSheet.hidden = libraryView === 'templates';
    const count = Object.entries(filters).filter(([key, value]) => value !== 'all' && (libraryView === 'courses' || key === 'behavior')).length;
    const badge = document.getElementById('tl-filter-count');
    if (badge) { badge.textContent = count; badge.hidden = !count; }
    const reset = document.querySelector('#tl-filters [data-tl-reset]');
    if (reset) reset.disabled = !count && !term;
    const query = term.trim().toLowerCase();
    if (libraryView === 'templates') return templatesMarkup(query, filters.behavior);
    const visible = courses().filter(course => {
      const material = materialFor(course.id);
      const text = [course.title, behavior(course), course.tip, material?.summary, material?.learningGoal, ...(material?.lesson || []).map(section => section.heading + ' ' + section.body), ...usedBy(course.id).map(policy => policy.name)].join(' ').toLowerCase();
      return (!query || text.includes(query)) && (filters.behavior === 'all' || course.behaviorId === filters.behavior) && (filters.level === 'all' || (filters.level === 'legacy' ? course.legacy : !course.legacy && String(course.level) === filters.level)) && (filters.readiness === 'all' || readiness(course) === filters.readiness);
    });
    const rows = visible.map(course => {
      const material = materialFor(course.id);
      const programs = usedBy(course.id);
      return '<tr data-tl-course="' + h(course.id) + '"><th scope="row"><button class="text-link" type="button" data-tl-open="' + h(course.id) + '" aria-haspopup="dialog">' + h(course.title) + '</button><p class="caption">' + h(levelLabel(course)) + ' · ' + h(course.legacy ? course.version : 'v' + course.version) + (course.seriesTitle ? ' · ' + h(course.seriesTitle) : '') + '</p></th><td>' + h(behavior(course)) + '</td><td>' + (course.legacy ? 'Lesson metadata only' : (course.videoUrl ? runtime(course) + ' linked video' : material ? 'Reading · ' + runtime(course) + ' video script' : runtime(course) + ' video outline') + '<p class="caption">' + course.questions.length + '-question quiz' + (material?.estimatedDuration ? ' · ' + h(material.estimatedDuration) + ' estimated' : '') + '</p>') + '</td><td>' + uiStatus(readinessLabel(course)) + '<p class="caption">' + (course.legacy ? 'Video and quiz missing' : course.videoUrl ? 'Playback depends on the linked source' : 'Video not produced') + '</p></td><td>' + (programs.length ? programs.map(policy => '<button class="text-link" type="button" data-open-program-page="' + h(policy.id) + '" data-program-page-tab="content">' + h(policy.name) + '</button>').join(', ') : '<span class="caption">Not selected in a program</span>') + '</td></tr>';
    }).join('');
    return '<div class="tl-workspace">' + authoringSeries(query, filters.behavior) + (!query && !count ? featured() : '') + '<section aria-labelledby="tl-courses-title"><div class="tl-section-heading"><h2 class="section-title" id="tl-courses-title">' + (count || query ? 'Matching courses' : 'All courses') + '</h2><span class="caption" id="tl-result-count" role="status">' + visible.length + ' of ' + courses().length + ' courses</span></div>' + (rows ? uiTable('Training courses', ['Course', 'Behavior', 'Learning materials', 'Readiness', 'Used in programs'], rows) : '<div class="card empty-state"><strong>No courses match these filters</strong><span>Try another behavior, level or search.</span><button class="button button--secondary" type="button" data-tl-reset>Clear filters</button></div>') + '</section></div>';
  }
  function sourceNote(material) {
    if (!material) return '';
    if (material.custom) return '<p class="caption tc-source">Created in the Training library. Edits create a new course version; existing assignments retain their saved version. Course progression follows this series, while assessment and manager escalation follow the program.</p>';
    const refs = (pack()?.references || []).filter(reference => (material.referenceIds || []).includes(reference.id));
    return '<details class="tc-source"><summary>Source and course preparation</summary><div class="tc-stack"><p>Adapted from the supplied Heavy-truck speeding course pack, version ' + h(pack().source.version) + ', September 7, 2026. Video timings are authoring targets; narration and media have not been rendered.</p><p>The source includes ' + material.questions.length + ' questions. This course uses three, with explanations and retries until all are correct. Program assessment and escalation settings remain in Configuration.</p>' + (refs.length ? '<ul>' + refs.map(ref => '<li>' + (ref.url && /^https:\/\//.test(ref.url) ? '<a href="' + h(ref.url) + '" target="_blank" rel="noopener noreferrer">' + h(ref.title || ref.id) + '</a>' : h(ref.title || ref.id)) + '</li>').join('') + '</ul>' : '') + '</div></details>';
  }
  function lessonPanel(course, material) {
    if (course.legacy) return '<div class="card empty-state"><strong>Imported lesson is incomplete</strong><span>The original title and program mappings are preserved. Reading, video and quiz materials have not been supplied.</span></div>';
    return '<div class="tc-reading">' + (material ? '<h3 class="section-title">' + h(material.tagline || material.title) + '</h3><p>' + h(material.summary || course.tip) + '</p>' + (material.lesson || []).map(section => '<section class="tc-stack"><h4 class="section-title">' + h(section.heading) + '</h4><p>' + h(section.body) + '</p></section>').join('') : '<h3 class="section-title">Coaching outline</h3><p>' + h(course.tip) + '</p><p class="caption">This sample includes a coaching tip and quiz. A full learner lesson and authored video script have not been supplied for this course.</p>') + '<div class="tc-callout"><strong>Learn while safely parked</strong><p>Complete the lesson and quiz when you are off the driving task.</p></div></div>';
  }
  function videoPanel(course, material) {
    const scenes = material?.scenes || [];
    const transcript = material?.transcript || scenes.map(scene => scene.voiceover).join('\n\n');
    const player = course.videoUrl && /^https?:\/\//.test(course.videoUrl)
      ? '<video id="tc-video" class="tc-video" controls playsinline preload="none" aria-label="' + h(course.title + ' training video') + '" src="' + h(course.videoUrl) + '"></video><p class="caption" id="tc-video-error" role="status">Video supplied by a linked source. Playback begins when you choose Play.</p>'
      : '<div class="tc-video-placeholder">' + uiIcon('video') + '<h3 class="section-title">' + (course.legacy ? 'Video unavailable' : 'Video not produced') + '</h3><p>' + (course.legacy ? 'No training video was included with this imported lesson.' : h(runtime(course)) + ' planned runtime · No playable training media has been supplied.') + '</p></div>';
    return '<div class="tc-stack">' + player + (transcript ? '<h3 class="section-title">Video outline</h3><p>Review the planned narration and scenes before producing the video.</p><details><summary>Read the complete transcript</summary><div class="tc-reading">' + transcript.split(/\n+/).map(paragraph => '<p>' + h(paragraph) + '</p>').join('') + '</div></details>' : '<p class="caption">An authored transcript and scene plan have not been added.</p>') + (scenes.length ? '<div class="tc-scenes">' + scenes.map(scene => '<details><summary>Scene ' + h(scene.number) + ' · ' + h(scene.time) + '</summary><div class="tc-stack"><p><strong>Narration</strong><br>' + h(scene.voiceover) + '</p><p><strong>On screen</strong><br>' + h(scene.onScreen) + '</p><p><strong>Visual direction</strong><br>' + h(scene.visual) + '</p><p class="caption">' + h(scene.production) + '</p></div></details>').join('') + '</div>' : '') + '</div>';
  }
  function bankMarkup(material) {
    if (!material) return '';
    if (material.custom) return '';
    return '<details id="tc-question-bank"><summary>Full source question bank · ' + material.questions.length + ' questions</summary><div class="tc-stack"><p class="caption">Reference material for course review. Questions marked critical in the source are identified below.</p>' + material.questions.map(question => '<section class="tc-stack"><h4 class="section-title">' + h(question.id) + (question.critical ? ' · Critical concept' : '') + '</h4><p>' + h(question.prompt) + '</p><ol type="A">' + question.options.map((option, index) => '<li>' + h(option) + (index === question.correctIndex ? ' <strong>— Correct</strong>' : '') + '<p class="caption">' + h(question.feedback?.[index] || question.explanation) + '</p></li>').join('') + '</ol><p class="caption">' + h(question.remediation) + '</p></section>').join('') + '</div></details>';
  }
  function quizPanel(course, material) {
    if (!course.questions?.length) return '<div class="card empty-state"><strong>No quiz supplied</strong><span>This imported lesson needs questions and answer feedback before assignment.</span></div>';
    const remaining = course.questions.filter(question => !passed.has(question.id));
    return '<div class="tc-stack"><div><h3 class="section-title">Try the driver quiz</h3><p>Three questions. Review explanations and retry missed questions until all are correct. This preview does not create an assignment.</p></div><div id="tc-quiz-feedback" role="status" tabindex="-1">' + (submitted ? '<strong>' + passed.size + ' of ' + course.questions.length + ' correct' + (remaining.length ? ' · Retry the missed questions' : ' · Quiz preview complete') + '</strong>' + feedback.map(item => '<p>' + h(item) + '</p>').join('') : '') + '</div>' + (remaining.length ? '<form class="tc-stack" id="tc-quiz-form">' + remaining.map(question => '<fieldset class="tc-question"><legend>' + h(question.prompt) + '</legend>' + question.options.map((option, index) => '<label><input type="radio" name="quiz-' + h(question.id) + '" value="' + index + '" required' + (answers[question.id] === index ? ' checked' : '') + '><span>' + h(option) + '</span></label>').join('') + '</fieldset>').join('') + '<div class="toolbar"><button class="button button--primary" type="submit" id="tc-submit-quiz">Check answers</button></div></form>' : '<div class="toolbar"><button class="button button--secondary" type="button" data-tl-retry>Try again</button></div>') + bankMarkup(material) + '</div>';
  }
  function followupPanel(course, material) {
    const commitment = material?.commitment;
    return '<div class="tc-reading">' + (commitment ? '<h3 class="section-title">' + h(commitment.title) + '</h3><p>' + h(commitment.instruction || '') + '</p><div class="tc-callout"><p>' + h(commitment.prompt || '') + '</p></div>' + (commitment.fields || []).map(field => '<section class="tc-stack"><h4 class="section-title">' + h(field.label || field.question || field.title) + '</h4><p>' + h(field.prompt || field.guidance || field.description) + '</p></section>').join('') : '<h3 class="section-title">Next-trip coaching tip</h3><p>' + h(course.tip || 'Follow-up learning material has not been supplied.') + '</p>') + (material?.coachReview ? '<details open><summary>Coach conversation guide</summary><div class="tc-stack">' + coachReviewMarkup(material.coachReview) + '</div></details>' : '') + '<p class="caption">These are supporting materials for follow-up. Completing a course and improving driving are separate outcomes; manager involvement follows the program’s approved escalation settings.</p></div>';
  }
  function coachReviewMarkup(review) {
    const criteria = Array.isArray(review) ? review : review.criteria || [];
    return (review.summary ? '<p>' + h(review.summary) + '</p>' : '') + criteria.map(item => '<section><h4 class="section-title">' + h(item.title || item.heading || item.criterion) + '</h4><p>' + h(item.description || item.body) + '</p>' + (item.ifNotMet ? '<p class="caption">' + h(item.ifNotMet) + '</p>' : '') + '</section>').join('');
  }
  function renderPanel(focus = false) {
    const material = materialFor(selectedCourse.id);
    const panel = dialog.querySelector('#tc-panel');
    panel.setAttribute('aria-labelledby', 'tc-tab-' + selectedTab);
    panel.innerHTML = ({ lesson: lessonPanel, video: videoPanel, quiz: quizPanel, followup: followupPanel })[selectedTab](selectedCourse, material);
    panel.querySelector('#tc-video')?.addEventListener('error', () => { const notice = panel.querySelector('#tc-video-error'); if (notice) notice.textContent = 'The linked video could not be loaded. Check the source link or access permissions in the course editor.'; });
    dialog.querySelectorAll('[data-tl-tab]').forEach(tab => { const active = tab.dataset.tlTab === selectedTab; tab.setAttribute('aria-selected', String(active)); tab.tabIndex = active ? 0 : -1; });
    if (focus) dialog.querySelector('#tc-tab-' + selectedTab)?.focus();
  }
  function ensureDialog() {
    if (dialog) return;
    dialog = document.createElement('dialog');
    dialog.className = 'dialog drawer training-course';
    dialog.id = 'training-course-dialog';
    dialog.setAttribute('aria-labelledby', 'tc-title');
    document.body.appendChild(dialog);
    dialog.addEventListener('close', () => { if (opener?.isConnected) { opener.setAttribute('aria-expanded', 'false'); opener.focus({ preventScroll: true }); } });
    dialog.addEventListener('click', event => {
      if (event.target.closest('[data-tl-close]')) dialog.close();
      const tab = event.target.closest('[data-tl-tab]');
      if (tab) { selectedTab = tab.dataset.tlTab; renderPanel(true); }
      if (event.target.closest('[data-tl-retry]')) { answers = {}; passed.clear(); feedback = []; submitted = false; renderPanel(); dialog.querySelector('input')?.focus(); }
      if (event.target === dialog) { const rect = dialog.getBoundingClientRect(); if (event.clientX < rect.left || event.clientX > rect.right || event.clientY < rect.top || event.clientY > rect.bottom) dialog.close(); }
      if (event.target.closest('[data-open-program-page]')) dialog.close();
    });
    dialog.addEventListener('keydown', event => {
      const tab = event.target.closest('[data-tl-tab]');
      if (!tab || !['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(event.key)) return;
      event.preventDefault();
      const index = tabs.findIndex(([key]) => key === tab.dataset.tlTab);
      const next = event.key === 'Home' ? 0 : event.key === 'End' ? tabs.length - 1 : (index + (event.key === 'ArrowRight' ? 1 : -1) + tabs.length) % tabs.length;
      dialog.querySelector('#tc-tab-' + tabs[next][0]).focus();
    });
    dialog.addEventListener('change', event => { if (event.target.matches('#tc-quiz-form input[type="radio"]')) answers[event.target.name.slice(5)] = Number(event.target.value); });
    dialog.addEventListener('submit', event => {
      if (event.target.id !== 'tc-quiz-form') return;
      event.preventDefault();
      feedback = [];
      selectedCourse.questions.filter(question => !passed.has(question.id)).forEach(question => {
        if (answers[question.id] === question.correctIndex) passed.add(question.id);
        else feedback.push(question.feedback?.[answers[question.id]] || question.explanation);
      });
      submitted = true;
      renderPanel();
      dialog.querySelector('#tc-quiz-feedback').focus();
    });
    window.addEventListener('hashchange', () => { if (dialog.open) dialog.close(); });
  }
  function open(id, target) {
    selectedCourse = courses().find(course => course.id === id);
    if (!selectedCourse) return;
    ensureDialog();
    opener = target || document.activeElement;
    opener?.setAttribute('aria-expanded', 'true');
    selectedTab = 'lesson'; answers = {}; passed = new Set(); feedback = []; submitted = false;
    const material = materialFor(id);
    const programs = usedBy(id);
    dialog.innerHTML = '<header class="drawer__header"><div><h2 id="tc-title">' + h(selectedCourse.title) + '</h2><p class="caption">' + h(behavior(selectedCourse)) + ' · ' + h(levelLabel(selectedCourse)) + ' · ' + h(selectedCourse.legacy ? selectedCourse.version : 'v' + selectedCourse.version) + '</p></div><button class="button button--secondary button--icon" type="button" data-tl-close aria-label="Close course preview">' + uiIcon('close') + '</button></header><div class="drawer__body tc-body"><div class="tl-section-heading"><p>' + h(material?.learningGoal || selectedCourse.tip || 'Retained lesson metadata') + '</p>' + uiStatus(readinessLabel(selectedCourse)) + '</div><div class="view-tabs tc-tabs" role="tablist" aria-label="Course materials">' + tabs.map(([key, label]) => '<button class="view-tab" type="button" role="tab" id="tc-tab-' + key + '" data-tl-tab="' + key + '" aria-controls="tc-panel" aria-selected="' + (key === 'lesson') + '" tabindex="' + (key === 'lesson' ? '0' : '-1') + '">' + label + '</button>').join('') + '</div><section id="tc-panel" role="tabpanel" tabindex="0"></section><section class="tc-usage"><h3 class="section-title">Used in programs</h3>' + (programs.length ? '<div class="toolbar">' + programs.map(policy => '<button class="text-link" type="button" data-open-program-page="' + h(policy.id) + '" data-program-page-tab="content">' + h(policy.name) + '</button>').join('') + '</div>' : '<p>This course has not been selected in a program. Approve courses from the program’s Configuration page.</p>') + '</section>' + sourceNote(material) + '</div>';
    renderPanel();
    if (!dialog.open) dialog.showModal();
    dialog.scrollTop = 0;
    dialog.querySelector('[data-tl-close]').focus();
  }
  document.addEventListener('click', event => {
    const viewButton = event.target.closest('[data-tl-view]');
    if (viewButton) {
      const sheet = document.querySelector('[data-filter-sheet="training"].is-open');
      if (sheet && typeof closeFilterSheet === 'function') closeFilterSheet(sheet, false);
      libraryView = viewButton.dataset.tlView;
      if (typeof updateUrlState === 'function') updateUrlState(true);
      renderLibrary();
      viewButton.focus();
    }
    const target = event.target.closest('[data-tl-open]');
    if (target) open(target.dataset.tlOpen, target);
    if (event.target.closest('[data-tl-reset]')) {
      ['behavior', 'level', 'readiness'].forEach(key => { const field = document.getElementById('tl-' + key); if (field) field.value = 'all'; });
      document.getElementById('content-search').value = '';
      renderLibrary();
      if (!event.target.closest('#tl-filters')) document.getElementById('content-search').focus();
    }
  });
  document.addEventListener('keydown', event => {
    const tab = event.target.closest('[data-tl-view]');
    if (!tab || !['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(event.key)) return;
    event.preventDefault();
    const key = event.key === 'Home' ? 'courses' : event.key === 'End' ? 'templates' : tab.dataset.tlView === 'courses' ? 'templates' : 'courses';
    document.querySelector('[data-tl-view="' + key + '"]').focus();
  });
  window.addEventListener('course-authoring-change', () => { if (document.getElementById('library-grid') && typeof renderLibrary === 'function') renderLibrary(); });
  document.addEventListener('change', event => { if (['tl-behavior', 'tl-level', 'tl-readiness'].includes(event.target.id)) renderLibrary(); });
  window.addEventListener('popstate', () => { libraryView = new URLSearchParams(location.search).get('libraryTab') === 'templates' ? 'templates' : 'courses'; if (typeof renderLibrary === 'function') renderLibrary(); });
  globalThis.TrainingLibrary = { render, open, metrics, getView: () => libraryView };
})();
