/* Local course-series authoring; publishing means adding to this browser's library.
 * API: CourseAuthoringStore.init(), templates(), list(), get(id,{draft?}),
 * create(templateId), newLevel(seriesId), saveDraft(series), validate(series),
 * publish(series)->{ok,errors,series?,storageAvailable},
 * saveTemplate(series,name)->{ok,errors,template?}, deleteDraft(id),
 * getPublishedCourses(), getMaterials(courseId).
 * Ordered levels are authoritative; IDs survive editing, reorder and publication.
 * Draft edits never replace published courses. Only explicit publication increments
 * the series/course version; active assignments retain their cloned snapshots.
 * No upload, media generation, external publication or program enrollment occurs.
 */
(function (global) {
  'use strict';
  const KEY = 'elevate-course-authoring-v1';
  const clone = value => value == null ? value : JSON.parse(JSON.stringify(value));
  const text = value => typeof value === 'string' ? value.trim() : '';
  const positive = value => value !== null && value !== '' && Number.isFinite(Number(value)) && Number(value) > 0;
  let initialized = false;
  let storageAvailable = true;
  let lastError = '';
  let state = { schemaVersion: 1, instanceId: Date.now().toString(36) + '-' + Math.random().toString(36).slice(2, 7), sequence: 0, series: [], templates: [] };
  const now = () => new Date().toISOString();
  function id(prefix) { state.sequence += 1; return prefix + '-' + state.instanceId + '-' + state.sequence; }
  function emit(type, seriesId) {
    if (typeof global.dispatchEvent === 'function' && typeof global.CustomEvent === 'function') global.dispatchEvent(new global.CustomEvent('course-authoring-change', { detail: { type, seriesId } }));
  }
  function persist(candidate = state) {
    try {
      if (!global.localStorage) throw new Error('Browser storage is unavailable.');
      global.localStorage.setItem(KEY, JSON.stringify(candidate));
      storageAvailable = true; lastError = ''; return true;
    } catch (_) { storageAvailable = false; lastError = 'Browser storage is unavailable. Keep this page open to retain draft changes.'; return false; }
  }
  function urlValid(value) {
    try { const parsed = new URL(value); return ['http:', 'https:'].includes(parsed.protocol) && !parsed.username && !parsed.password; } catch (_) { return false; }
  }
  function validate(series) {
    const errors = [];
    if (!series || typeof series !== 'object') return ['Course series is missing.'];
    if (!text(series.title)) errors.push('Give the course series a title.');
    if (!global.Coaching?.catalog.behaviors.some(item => item.id === series.behaviorId)) errors.push('Choose the behavior this series teaches.');
    if (!Array.isArray(series.levels) || series.levels.length < 1 || series.levels.length > 3) return errors.concat('Include one, two or three ordered levels.');
    const levelIds = new Set(), questionIds = new Set();
    series.levels.forEach((level, index) => {
      const label = 'Level ' + (index + 1);
      if (!level || typeof level !== 'object') { errors.push(label + ': course content is missing.'); return; }
      if (level.id) { if (levelIds.has(level.id)) errors.push('Each level needs its own stable course ID.'); levelIds.add(level.id); }
      if (!text(level.title)) errors.push(label + ': add a title.');
      if (!text(level.learningGoal)) errors.push(label + ': describe the learning goal.');
      if (!text(level.tip)) errors.push(label + ': add a coaching tip.');
      if (!positive(level.video?.seconds)) errors.push(label + ': set a positive video duration in seconds.');
      if (!['planned', 'url'].includes(level.video?.mode)) errors.push(label + ': choose a planned video or an existing video URL.');
      else if (level.video.mode === 'planned' && !text(level.video.script)) errors.push(label + ': add the script for the planned video.');
      else if (level.video.mode === 'url' && !urlValid(text(level.video.url))) errors.push(label + ': provide an HTTP or HTTPS video URL without embedded credentials.');
      if (!Array.isArray(level.questions) || level.questions.length !== 3) { errors.push(label + ': include exactly three quiz questions.'); return; }
      level.questions.forEach((question, qIndex) => {
        const qLabel = label + ', question ' + (qIndex + 1);
        if (!question || typeof question !== 'object') { errors.push(qLabel + ': question content is missing.'); return; }
        if (question.id) { if (questionIds.has(question.id)) errors.push('Each quiz question needs its own stable ID.'); questionIds.add(question.id); }
        if (!text(question.prompt)) errors.push(qLabel + ': enter the question.');
        if (!Array.isArray(question.options) || question.options.length !== 3 || question.options.some(option => !text(option))) errors.push(qLabel + ': provide three answer choices.');
        else if (new Set(question.options.map(option => text(option).toLowerCase())).size !== 3) errors.push(qLabel + ': make the three answer choices distinct.');
        if (!Number.isInteger(question.correctIndex) || question.correctIndex < 0 || question.correctIndex > 2) errors.push(qLabel + ': select the correct answer.');
        if (!text(question.explanation)) errors.push(qLabel + ': explain the correct answer so missed questions can be retried.');
      });
    });
    return [...new Set(errors)];
  }
  function init() {
    if (initialized) return { storageAvailable, lastError };
    initialized = true;
    try {
      if (!global.localStorage) throw new Error('Browser storage is unavailable.');
      const saved = JSON.parse(global.localStorage.getItem(KEY) || 'null');
      if (saved && saved.schemaVersion === 1 && Array.isArray(saved.series) && Array.isArray(saved.templates)) {
        state = { ...state, ...saved, sequence: Number.isInteger(saved.sequence) && saved.sequence >= 0 ? saved.sequence : 0 };
        state.series = state.series.filter(entry => entry && text(entry.id) && (entry.draft || entry.published));
        state.templates = state.templates.filter(template => template && text(template.id) && text(template.name) && Array.isArray(template.levels));
      } else if (saved) lastError = 'Saved course authoring data has an unsupported format.';
    } catch (_) { storageAvailable = false; lastError = 'Saved course drafts could not be read. Keep this page open while editing.'; }
    syncCatalog();
    return { storageAvailable, lastError };
  }
  function bareQuestion() { return { id: id('authored-question'), prompt: '', options: ['', '', ''], correctIndex: 0, explanation: '' }; }
  function newLevel(seriesId) {
    init();
    const count = get(seriesId, { draft: true })?.levels?.length || 0;
    const level = { id: id('authored-course'), level: count + 1, title: '', learningGoal: '', tip: '', video: { mode: 'planned', url: '', seconds: 60, script: '' }, lesson: [], questions: [bareQuestion(), bareQuestion(), bareQuestion()], commitment: { title: 'Your next-trip commitment', prompt: '' } };
    persist();
    return level;
  }
  function normalize(series) {
    const result = clone(series);
    result.id ||= id('course-series');
    result.title = typeof result.title === 'string' ? result.title : '';
    result.levels = Array.isArray(result.levels) ? result.levels : [];
    result.levels = result.levels.map((level, index) => {
      const current = level && typeof level === 'object' ? level : {};
      current.id ||= id('authored-course'); current.level = index + 1;
      current.questions = (Array.isArray(current.questions) ? current.questions : []).map(question => ({ ...question, id: question?.id || id('authored-question') }));
      return current;
    });
    delete result.storageAvailable;
    return result;
  }
  function genericLevels() {
    return ['Introduce the behavior', 'Practise the safer response', 'Make a lasting plan'].map((title, index) => ({
      title, learningGoal: ['Recognize the behavior and choose an earlier safe response.', 'Apply the safer response when the driving situation becomes demanding.', 'Identify a recurring pressure and plan an observable safe response.'][index],
      tip: 'Notice the cue early and use the safe response from this lesson on your next trip.',
      video: { mode: 'planned', url: '', seconds: [60, 90, 120][index], script: ['Introduce the behavior with one realistic driving scenario. Explain what to notice and demonstrate the earlier safe response. End with one next-trip commitment.', 'Show a more demanding scenario involving the selected behavior. Pause before the decision, explain the safer response, and show how preparation protects the driver’s options.', 'Show a recurring source of pressure. Ask the driver to name the cue, choose a safe response before the hazard, and identify the support needed to use it consistently.'][index] },
      lesson: [{ heading: title, body: 'Use this lesson to identify the relevant cue, prepare earlier and choose the safer response. Adapt this template to your fleet’s approved guidance and the behavior being taught.' }],
      questions: [
        { prompt: 'When should you prepare the safer response taught in this lesson?', options: ['Before the situation becomes urgent', 'Only after a warning arrives', 'After another vehicle has reacted'], correctIndex: 0, explanation: 'Preparing before the situation becomes urgent gives you more time and options.' },
        { prompt: 'What should you do if schedule pressure conflicts with the safer response?', options: ['Take more risk to protect the schedule', 'Keep the safe response and discuss the constraint when safely parked', 'Wait for another warning before changing anything'], correctIndex: 1, explanation: 'Keep the safe response and discuss the scheduling constraint when safely parked.' },
        { prompt: 'What should the next-trip commitment describe?', options: ['A general intention to concentrate harder', 'Only a target quiz score', 'A specific cue and the safe action to take when it appears'], correctIndex: 2, explanation: 'A specific cue and action make the commitment practical and observable on later trips.' }
      ], commitment: { title: 'Your next-trip commitment', prompt: 'When I notice the cue from this lesson, I will take the safer action before the situation becomes urgent.' }
    }));
  }
  function builtins() {
    const templates = [
      { id: 'generic-three-level', name: 'Three-level coaching series', description: 'Start with introduction, practice and a lasting plan. Adapt the example teaching to your behavior.', builtin: true, behaviorId: '', levels: genericLevels() },
      { id: 'blank-one-level', name: 'Start with one level', description: 'Write a single video-and-quiz lesson, then add levels when needed.', builtin: true, behaviorId: '', levels: [{ title: '', learningGoal: '', tip: '', video: { mode: 'planned', url: '', seconds: 60, script: '' }, lesson: [], questions: Array.from({ length: 3 }, () => ({ prompt: '', options: ['', '', ''], correctIndex: 0, explanation: '' })), commitment: { title: 'Your next-trip commitment', prompt: '' } }] }
    ];
    if (global.SpeedingCoursePack?.levels?.length === 3) templates.splice(1, 0, {
      id: 'speeding-pack', name: 'Heavy-truck speeding', description: 'Adapt the supplied three-level course pack, including scripts, teaching and scenario questions.', builtin: true, behaviorId: 'speeding', source: clone(global.SpeedingCoursePack.source),
      levels: global.SpeedingCoursePack.levels.map(level => ({
        title: level.title, learningGoal: level.learningGoal, tip: level.level === 1 ? level.commitment.prompt : level.lesson[0].body,
        video: { mode: 'planned', url: '', seconds: level.videoSeconds, script: level.transcript || level.scenes.map(scene => scene.voiceover).join('\n\n') },
        lesson: clone(level.lesson), questions: (level.level === 3 ? [2, 3, 4] : [1, 2, 3]).map(number => { const q = clone(level.questions.find(question => question.id === 'L' + level.level + '-Q' + number)); q.sourceQuestionId = q.id; delete q.id; return q; }),
        commitment: clone(level.commitment)
      }))
    });
    return templates;
  }
  function templates() { init(); return [...builtins(), ...state.templates].map(template => ({ id: template.id, name: template.name, title: template.name, description: template.description || 'Your reusable course template.', builtin: !!template.builtin, behaviorId: template.behaviorId || '', levelCount: template.levels.length })); }
  function list() {
    init();
    return state.series.map(entry => {
      const value = entry.published || entry.draft;
      return { id: entry.id, title: value.title, behaviorId: value.behaviorId, status: entry.published ? 'published' : 'draft', version: entry.published?.version || 0, levels: clone(value.levels || []), levelCount: value.levels?.length || 0, hasDraft: !!entry.draft, updatedAt: entry.draft?.updatedAt || value.updatedAt };
    });
  }
  function get(seriesId, options = {}) { init(); const entry = state.series.find(item => item.id === seriesId); return clone(options.draft ? entry?.draft || entry?.published : entry?.published || entry?.draft) || null; }
  function create(templateId) {
    init();
    const template = [...builtins(), ...state.templates].find(item => item.id === templateId);
    if (!template) return null;
    const base = clone(template);
    base.levels.forEach(level => { delete level.id; level.questions?.forEach(question => { delete question.id; }); });
    const series = normalize({ id: id('course-series'), title: template.builtin ? (templateId === 'speeding-pack' ? 'Heavy-truck speeding' : 'New coaching series') : template.name, behaviorId: base.behaviorId, status: 'draft', version: 0, levels: base.levels, templateId, source: base.source, createdAt: now(), updatedAt: now() });
    state.series.push({ id: series.id, draft: series, published: null }); persist(); emit('draft', series.id);
    return { ...clone(series), storageAvailable };
  }
  function saveDraft(series) {
    init();
    if (!series || typeof series !== 'object') return null;
    const draft = normalize(series);
    let entry = state.series.find(item => item.id === draft.id);
    if (!entry) { entry = { id: draft.id, published: null, draft: null }; state.series.push(entry); }
    const previousQuestions = (entry.draft?.levels || entry.published?.levels || []).flatMap(level => level.questions || []);
    draft.levels.forEach(level => level.questions.forEach(question => {
      const previous = previousQuestions.find(item => item.id === question.id);
      if (previous && ['prompt', 'options', 'correctIndex', 'explanation'].some(key => JSON.stringify(previous[key]) !== JSON.stringify(question[key])) && JSON.stringify(previous.feedback) === JSON.stringify(question.feedback)) delete question.feedback;
    }));
    draft.status = 'draft'; draft.version = entry.published?.version || 0; draft.createdAt ||= entry.published?.createdAt || entry.draft?.createdAt || now(); draft.updatedAt = now();
    entry.draft = draft; persist(); emit('draft', draft.id); return { ...clone(draft), storageAvailable };
  }
  function publish(series) {
    init();
    if (!series) return { ok: false, errors: ['Course series is missing.'], storageAvailable };
    const draft = saveDraft(series), errors = validate(draft);
    const entry = state.series.find(item => item.id === draft.id);
    if (entry.published && draft.behaviorId !== entry.published.behaviorId) errors.push('The behavior stays fixed after publication. Create another series to teach a different behavior.');
    const otherIds = new Set(state.series.filter(item => item.id !== draft.id).flatMap(item => (item.published?.levels || item.draft?.levels || []).map(level => level.id)));
    if (draft.levels.some(level => otherIds.has(level.id) || global.Coaching.catalog.courses.some(course => !course.customSeriesId && course.id === level.id))) errors.push('Course IDs must belong only to this authored series.');
    if (errors.length) return { ok: false, errors: [...new Set(errors)], series: clone(draft), storageAvailable };
    const published = clone(draft); delete published.storageAvailable;
    published.title = published.title.trim(); published.status = 'published'; published.version = (entry.published?.version || 0) + 1; published.publishedAt = now(); published.updatedAt = published.publishedAt;
    const candidate = clone(state), candidateEntry = candidate.series.find(item => item.id === published.id);
    candidateEntry.published = published; candidateEntry.draft = null;
    if (!persist(candidate)) return { ok: false, errors: ['Could not save the published library version. Your draft remains open; retry when browser storage is available.'], series: clone(draft), storageAvailable };
    state = candidate; syncCatalog(); emit('publish', published.id); return { ok: true, errors: [], series: clone(published), storageAvailable };
  }
  function saveTemplate(series, name) {
    init();
    if (!text(name)) return { ok: false, errors: ['Give the reusable template a name.'] };
    if (!series || !Array.isArray(series.levels) || series.levels.length < 1 || series.levels.length > 3) return { ok: false, errors: ['A template needs one, two or three levels.'] };
    const template = { id: id('course-template'), name: text(name), description: 'Reusable template saved from ' + (text(series.title) || 'your course series') + '.', behaviorId: series.behaviorId || '', levels: clone(series.levels), source: clone(series.source), builtin: false, createdAt: now() };
    template.levels.forEach(level => { delete level.id; level.questions?.forEach(question => { delete question.id; }); });
    const candidate = clone(state); candidate.templates.push(template);
    if (!persist(candidate)) return { ok: false, errors: ['Could not save this reusable template. Retry when browser storage is available.'] };
    state = candidate; emit('template', series.id); return { ok: true, errors: [], template: { id: template.id, name: template.name, description: template.description, behaviorId: template.behaviorId, builtin: false, levelCount: template.levels.length } };
  }
  function deleteDraft(seriesId) {
    init(); const entry = state.series.find(item => item.id === seriesId);
    if (!entry?.draft) return { ok: false, errors: ['There is no draft to discard.'] };
    const candidate = clone(state), candidateEntry = candidate.series.find(item => item.id === seriesId);
    if (candidateEntry.published) candidateEntry.draft = null; else candidate.series = candidate.series.filter(item => item.id !== seriesId);
    if (!persist(candidate)) return { ok: false, errors: ['Could not discard the saved draft. Retry when browser storage is available.'] };
    state = candidate; emit('discard', seriesId); return { ok: true, errors: [] };
  }
  function mapCourse(series, level, index) {
    const planned = level.video.mode === 'planned';
    return {
      id: level.id, version: series.version, behaviorId: series.behaviorId, title: level.title, level: index + 1,
      custom: true, authored: true, customSeriesId: series.id, seriesId: series.id, seriesTitle: series.title, seriesLevelCount: series.levels.length, progression: 'ordered',
      focus: ['foundation', 'reinforcement', 'reflection'][index], ruleIds: global.Coaching.catalog.rules.filter(rule => rule.behaviorId === series.behaviorId).map(rule => rule.id),
      durationMinutes: Number(level.video.seconds) / 60, videoSeconds: Number(level.video.seconds), videoUrl: planned ? null : text(level.video.url), previewOnly: planned,
      summary: level.learningGoal, learningGoal: level.learningGoal, tip: level.tip, videoSummary: level.video.script || level.learningGoal,
      lesson: clone(level.lesson || []), questions: clone(level.questions), commitment: clone(level.commitment || { title: '', prompt: '' }), transcript: level.video.script || '', source: series.source ? { ...clone(series.source), adapted: true } : { title: 'Locally authored coaching series', version: String(series.version), mediaStatus: planned ? 'not-rendered' : 'url-supplied' }
    };
  }
  function publishedCourses() { return state.series.filter(entry => entry.published && !validate(entry.published).length).flatMap(entry => entry.published.levels.map((level, index) => mapCourse(entry.published, level, index))); }
  function syncCatalog() {
    if (!global.Coaching?.catalog?.courses) return;
    const target = global.Coaching.catalog.courses;
    for (let index = target.length - 1; index >= 0; index -= 1) if (target[index].customSeriesId) target.splice(index, 1);
    target.push(...publishedCourses());
  }
  function getPublishedCourses() { init(); return clone(publishedCourses()); }
  function getMaterials(courseId) {
    init();
    for (const entry of state.series) {
      const series = entry.published;
      const index = Array.isArray(series?.levels) ? series.levels.findIndex(level => level.id === courseId) : -1;
      if (index >= 0) {
        const level = series.levels[index], course = mapCourse(series, level, index);
        return { ...course, id: courseId, seriesId: series.id, seriesTitle: series.title, custom: true, scenes: [], script: level.video.script || '', transcript: level.video.script || '', questionBankCount: level.questions.length, referenceIds: [] };
      }
    }
    return null;
  }
  global.CourseAuthoringStore = { init, templates, list, get, create, newLevel, saveDraft, publish, saveTemplate, getPublishedCourses, getMaterials, validate, deleteDraft };
})(globalThis);
