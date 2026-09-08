/* Browser-local lesson catalogue. Files stay in IndexedDB; no service upload occurs. */
let learningDatabasePromise;
let learningEditorOpener = null;
let learningPreviewUrl = null;

function learningLessonId(lesson) {
  return lesson.id || ('lesson-' + String(lesson.title).toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, ''));
}

function initializeLearningLibrary() {
  lessons.forEach(lesson => { lesson.id = learningLessonId(lesson); lesson.source = lesson.source || { kind: 'none' }; });
  const saved = readSavedJson('elevate-learning-library', []);
  if (!Array.isArray(saved)) return;
  saved.forEach(item => {
    if (!item || typeof item.id !== 'string' || typeof item.title !== 'string') return;
    const existing = lessons.find(lesson => lesson.id === item.id);
    if (existing) Object.assign(existing, item);
    else lessons.push(item);
  });
}

function learningDatabase() {
  if (!learningDatabasePromise) learningDatabasePromise = new Promise((resolve, reject) => {
    const request = indexedDB.open('elevate-learning-files', 1);
    request.onupgradeneeded = () => request.result.createObjectStore('videos');
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => { learningDatabasePromise = null; reject(request.error); };
  });
  return learningDatabasePromise;
}

async function learningFileStore(key, blob) {
  const db = await learningDatabase();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction('videos', blob === undefined ? 'readonly' : 'readwrite');
    const request = blob === undefined ? transaction.objectStore('videos').get(key) : transaction.objectStore('videos').put(blob, key);
    transaction.oncomplete = () => resolve(request.result);
    transaction.onerror = () => reject(transaction.error);
    transaction.onabort = () => reject(transaction.error || new Error('Local file could not be saved.'));
  });
}

function learningMappings(lesson) {
  const id = learningLessonId(lesson);
  return categories.flatMap(program => programPolicyFor(program.id).levelLessons.flatMap((lessonId, index) => lessonId === id ? [{ programId: program.id, programName: program.name, level: index + 1 }] : []));
}

function learningLessonsForProgram(programId) {
  if (!programId || programId === 'all') return lessons.slice();
  const ids = new Set(programPolicyFor(programId).levelLessons);
  return lessons.filter(lesson => ids.has(learningLessonId(lesson)));
}

function learningSourceLabel(lesson) {
  return lesson.source?.kind === 'file' ? 'Local video' : lesson.source?.kind === 'link' ? 'Video link' : 'Video not connected';
}

function learningLessonRecords(lesson) {
  if (typeof allSessionRecords !== 'function') return [];
  const id = learningLessonId(lesson);
  return allSessionRecords().filter(session => !session.candidate && (session.lessonId ? session.lessonId === id : [lesson.title, ...(lesson.previousTitles || [])].includes(session.lesson) || [lesson.title, ...(lesson.previousTitles || [])].includes(session.lessonTitle)));
}

function learningLessonMetrics(lesson) {
  const records = learningLessonRecords(lesson);
  const measured = records.filter(session => typeof session.lessonWatched === 'boolean' || typeof session.lessonAcknowledged === 'boolean');
  return { assigned: records.length, measured: measured.length, watched: measured.filter(session => session.lessonWatched === true).length,
    acknowledged: measured.filter(session => session.lessonAcknowledged === true).length,
    completed: records.filter(session => session.state === 'completed' || session.state === 'archived' && (session.completedAt || session.completed)).length };
}

function learningLessonActions(lesson) {
  const id = escapeHtml(learningLessonId(lesson));
  return '<div class="program-record-controls">' + (lesson.source?.kind && lesson.source.kind !== 'none' ? '<button class="text-link" type="button" data-preview-lesson="' + id + '" aria-haspopup="dialog">Preview</button>' : '') + '<button class="text-link" type="button" data-edit-lesson="' + id + '" aria-haspopup="dialog">Edit</button></div>';
}

function learningMappedTable(program) {
  const mapped = learningLessonsForProgram(program.id).filter(lesson => program.id !== 'all' || learningMappings(lesson).length);
  const rows = mapped.map(lesson => {
    const mappings = learningMappings(lesson).filter(item => program.id === 'all' || item.programId === program.id);
    return '<tr data-program-lesson="' + escapeHtml(lesson.title) + '"><td>' + escapeHtml(lesson.title) + '</td><td>' + mappings.map(item => (program.id === 'all' ? programPageLink(categories.find(candidate => candidate.id === item.programId), 'content') + ' · ' : '') + 'Level ' + item.level).join('<br>') + '</td><td>' + escapeHtml(learningSourceLabel(lesson)) + '</td><td>' + escapeHtml(lesson.version || 'v1.0') + '</td><td>' + learningLessonActions(lesson) + '</td></tr>';
  }).join('');
  return '<section class="stack program-section-stack" aria-labelledby="program-content-title"><div class="program-section-heading"><h2 class="section-title" id="program-content-title">Mapped lessons</h2><button class="button button--secondary" type="button" data-new-lesson' + (program.id !== 'all' ? ' data-lesson-program="' + escapeHtml(program.id) + '"' : '') + '>Add lesson</button></div>' +
    (rows ? uiTable(program.name + ' mapped lessons', ['Lesson', program.id === 'all' ? 'Programme / level' : 'Level', 'Source', 'Version', 'Action'], rows) : '<div class="card empty-state compact"><strong>No lesson mapped</strong><span>Choose a library lesson in the coaching ladder or add one here.</span></div>') +
    '<p class="caption">Lesson files and edits stay in this browser.</p></section>';
}

function renderLearningLibrary() {
  const host = document.getElementById('library-grid');
  if (!host) return;
  const term = (document.getElementById('content-search')?.value || '').trim().toLowerCase();
  const visible = lessons.filter(lesson => (lesson.title + ' ' + learningMappings(lesson).map(item => item.programName).join(' ')).toLowerCase().includes(term));
  const kpis = document.getElementById('content-kpis');
  if (kpis) kpis.innerHTML = uiKpiStrip('Learning library', [
    { label: 'Lessons', value: lessons.length, context: 'Lesson records available in this browser.' },
    { label: 'With video', value: lessons.filter(lesson => ['file', 'link'].includes(lesson.source?.kind)).length, context: 'Locally saved files or external links. Links are not verified automatically.' },
    { label: 'Mapped programmes', value: categories.filter(program => programPolicyFor(program.id).levelLessons.some(Boolean)).length, context: 'Programmes with at least one lesson assigned to a coaching level.' }
  ]);
  host.innerHTML = visible.map(lesson => {
    const mappings = learningMappings(lesson);
    const metrics = learningLessonMetrics(lesson);
    const source = learningSourceLabel(lesson);
    const stats = metrics.measured ? metrics.watched + ' watched · ' + metrics.acknowledged + ' acknowledged' : 'Watch and acknowledgement data unavailable';
    return '<article class="card learning-card" data-library-lesson="' + escapeHtml(learningLessonId(lesson)) + '"><header><h2 class="section-title">' + escapeHtml(lesson.title) + '</h2><span class="caption">' + escapeHtml(lesson.version || 'v1.0') + '</span></header>' +
      '<p class="caption">' + escapeHtml([lesson.length, source].filter(Boolean).join(' · ')) + '</p>' +
      '<p class="learning-mappings">' + (mappings.length ? mappings.map(item => escapeHtml(item.programName + ' · Level ' + item.level)).join('<br>') : '<span class="caption">Unmapped</span>') + '</p>' +
      '<footer>' + learningLessonActions(lesson) + '<details><summary>Learning records</summary><p>' + metrics.assigned + ' recorded assignments · ' + metrics.completed + ' completed sessions</p><p>' + stats + '</p><p class="caption">Counts include sessions explicitly linked to this lesson. Unlinked history is unavailable.</p>' + (metrics.measured ? '<p class="caption">Explicit progress exists for ' + metrics.measured + ' of ' + metrics.assigned + ' records. A completed session alone does not prove the lesson was watched.</p>' : '') +
      (lesson.completion ? '<p class="caption">Legacy undated sample: ' + escapeHtml(lesson.completion) + ' completion. Its cohort and observation window are unavailable.</p>' : '') + '<p class="caption">Video retention, repeat exposure and coaching impact are unavailable.</p></details></footer></article>';
  }).join('') || '<p class="caption">No lessons match your search.</p>';
}

function learningMappingRow(mapping = {}) {
  return '<div class="learning-mapping-row">' + nativeSelect('name="mapping-program" aria-label="Mapped programme"', [['', 'Choose programme'], ...categories.map(item => [item.id, item.name])], mapping.programId || '') +
    '<label class="field learning-level"><span>Level</span><input class="filter-control program-number" name="mapping-level" type="number" min="1" max="100" value="' + (mapping.level || 1) + '" required></label>' +
    '<button class="icon-button" type="button" data-remove-lesson-mapping aria-label="Remove programme mapping">' + uiIcon('close') + '</button></div>';
}

function learningEditorDialog() {
  let dialog = document.getElementById('learning-editor');
  if (!dialog) {
    dialog = document.createElement('dialog');
    dialog.id = 'learning-editor'; dialog.className = 'dialog learning-dialog';
    dialog.setAttribute('aria-labelledby', 'learning-editor-title');
    document.body.append(dialog);
    dialog.addEventListener('close', () => { learningEditorOpener?.isConnected && learningEditorOpener.focus({ preventScroll: true }); });
  }
  return dialog;
}

function openLearningEditor(lessonId = '', programId = '') {
  const lesson = lessons.find(item => learningLessonId(item) === lessonId);
  const dialog = learningEditorDialog();
  learningEditorOpener = document.activeElement;
  const mappings = lesson ? learningMappings(lesson) : programId ? [{ programId, level: 1 }] : [];
  const source = lesson?.source || { kind: 'none' };
  dialog.innerHTML = '<form id="learning-editor-form" data-lesson-id="' + escapeHtml(lessonId) + '"><header class="learning-dialog-header"><h2 class="section-title" id="learning-editor-title">' + (lesson ? 'Edit lesson' : 'New lesson') + '</h2><button class="icon-button" type="button" data-close-learning-editor aria-label="Close lesson editor">' + uiIcon('close') + '</button></header>' +
    '<div class="learning-editor-fields"><label class="field"><span>Lesson title</span><input class="filter-control" name="title" required maxlength="120" value="' + escapeHtml(lesson?.title || '') + '"></label>' +
    '<div class="learning-field-row"><label class="field"><span>Duration (optional)</span><input class="filter-control" name="length" maxlength="40" placeholder="e.g. 2 min video" value="' + escapeHtml(lesson?.length || '') + '"></label><label class="field"><span>Version</span><input class="filter-control" name="version" required maxlength="20" value="' + escapeHtml(lesson?.version || 'v1.0') + '"></label></div>' +
    '<label class="field"><span>Video source</span>' + nativeSelect('name="source-kind"', [['none', 'Add video later'], ['file', 'Local video file'], ['link', 'Video link']], source.kind) + '</label>' +
    '<label class="field" data-learning-source="file"' + (source.kind === 'file' ? '' : ' hidden') + '><span>Video file</span><input class="filter-control" type="file" name="video" accept="video/*"><span class="caption">' + escapeHtml(source.fileName ? 'Saved: ' + source.fileName + '. Choose a file to replace it.' : 'Saved in this browser only; not uploaded to a server.') + '</span></label>' +
    '<label class="field" data-learning-source="link"' + (source.kind === 'link' ? '' : ' hidden') + '><span>Video URL</span><input class="filter-control" type="url" name="url" placeholder="https://" value="' + escapeHtml(source.url || '') + '"></label>' +
    '<section aria-labelledby="learning-mapping-title"><div class="program-section-heading"><h3 class="section-title" id="learning-mapping-title">Programme and level</h3><button class="button button--secondary" type="button" data-add-lesson-mapping>Add mapping</button></div><div id="learning-mapping-rows">' + mappings.map(learningMappingRow).join('') + '</div><p class="caption">One lesson per level. Saving a mapping replaces that level’s current lesson. You can reuse this video across levels.</p></section>' +
    '<p class="caption">Saved locally. Other browsers and devices will not receive these changes.</p><p id="learning-editor-error" class="field-help" role="alert" hidden></p></div>' +
    '<footer class="learning-dialog-footer"><button class="button button--secondary" type="button" data-close-learning-editor>Cancel</button><button class="button button--primary" type="submit">Save lesson</button></footer></form>';
  dialog.showModal();
  dialog.querySelector('[name="title"]').focus();
}

function refreshLearningViews() {
  if (typeof currentView !== 'undefined' && currentView === 'programs') renderProgramsPage();
  renderLearningLibrary();
}

async function saveLearningEditor(form) {
  const error = form.querySelector('#learning-editor-error');
  const submit = form.querySelector('[type="submit"]');
  error.hidden = true;
  const data = new FormData(form);
  const existing = lessons.find(item => learningLessonId(item) === form.dataset.lessonId);
  const id = existing ? learningLessonId(existing) : 'lesson-local-' + crypto.randomUUID();
  const mappings = [...form.querySelectorAll('.learning-mapping-row')].map(row => ({ programId: row.querySelector('[name="mapping-program"]').value, level: Number(row.querySelector('[name="mapping-level"]').value) }));
  try {
    if (mappings.some(item => !categories.some(program => program.id === item.programId) || !Number.isInteger(item.level) || item.level < 1 || item.level > 100)) throw new Error('Choose a programme and a valid level for every mapping.');
    if (new Set(mappings.map(item => item.programId + ':' + item.level)).size !== mappings.length) throw new Error('Each programme and level only needs one mapping.');
    const kind = data.get('source-kind');
    let source = { kind };
    const file = data.get('video');
    if (kind === 'link') {
      let url; try { url = new URL(String(data.get('url') || '')); } catch { throw new Error('Enter a complete https:// or http:// video URL.'); }
      if (!['https:', 'http:'].includes(url.protocol)) throw new Error('Video links must use https:// or http://.');
      source.url = url.href;
    } else if (kind === 'file') {
      if (file?.size) {
        if (!file.type.startsWith('video/') && !/\.(mp4|webm|mov|m4v|ogv)$/i.test(file.name)) throw new Error('Choose a video file.');
        const fileKey = id + '-' + crypto.randomUUID();
        submit.disabled = true;
        await learningFileStore(fileKey, file);
        source = { kind, fileKey, fileName: file.name, type: file.type, size: file.size };
      } else if (existing?.source?.kind === 'file') source = { ...existing.source };
      else throw new Error('Choose the video file to save in this browser.');
    }
    const next = { ...(existing || {}), id, title: String(data.get('title')).trim(), length: String(data.get('length') || '').trim(), version: String(data.get('version') || '').trim(), source,
      previousTitles: [...new Set([...(existing?.previousTitles || []), ...(existing && existing.title !== String(data.get('title')).trim() ? [existing.title] : [])])],
      category: categories.find(program => program.id === mappings[0]?.programId)?.name || '', updatedAt: new Date().toISOString() };
    const nextLessons = lessons.map(item => learningLessonId(item) === id ? next : item);
    if (!existing) nextLessons.push(next);
    // Build both persisted documents before changing the in-memory catalogue.
    const previousSettings = JSON.stringify(programSettings || {});
    categories.forEach(program => {
      const policy = programPolicyFor(program.id);
      policy.levelLessons = policy.levelLessons.map(lessonId => lessonId === id ? '' : lessonId);
    });
    mappings.forEach(mapping => {
      const ladder = programPolicyFor(mapping.programId).levelLessons;
      while (ladder.length < mapping.level) ladder.push('');
      ladder[mapping.level - 1] = id;
    });
    try {
      const previousCatalogue = localStorage.getItem('elevate-learning-library');
      localStorage.setItem('elevate-learning-library', JSON.stringify(nextLessons));
      try { localStorage.setItem('elevate-program-settings', JSON.stringify(programSettings)); }
      catch (saveError) { if (previousCatalogue === null) localStorage.removeItem('elevate-learning-library'); else localStorage.setItem('elevate-learning-library', previousCatalogue); throw saveError; }
    } catch (saveError) { programSettings = JSON.parse(previousSettings); throw saveError; }
    lessons.splice(0, lessons.length, ...nextLessons);
    document.getElementById('learning-editor').close();
    refreshLearningViews();
    showToast(next.title + ' saved in this browser');
  } catch (failure) {
    error.textContent = failure.message || 'This browser could not save the lesson. Your draft is still here.';
    error.hidden = false;
  } finally { submit.disabled = false; }
}

async function previewLearningLesson(id) {
  const lesson = lessons.find(item => learningLessonId(item) === id);
  if (!lesson) return;
  let dialog = document.getElementById('learning-preview');
  if (!dialog) {
    dialog = document.createElement('dialog'); dialog.id = 'learning-preview'; dialog.className = 'dialog learning-dialog'; dialog.setAttribute('aria-labelledby', 'learning-preview-title'); document.body.append(dialog);
    dialog.addEventListener('close', () => {
      dialog.querySelector('video')?.pause();
      if (learningPreviewUrl) { URL.revokeObjectURL(learningPreviewUrl); learningPreviewUrl = null; }
      learningEditorOpener?.isConnected && learningEditorOpener.focus({ preventScroll: true });
    });
  }
  learningEditorOpener = document.activeElement;
  dialog.innerHTML = '<header class="learning-dialog-header"><h2 class="section-title" id="learning-preview-title">' + escapeHtml(lesson.title) + '</h2><button class="icon-button" type="button" data-close-learning-preview aria-label="Close lesson preview">' + uiIcon('close') + '</button></header><div class="learning-preview-content" role="status">Loading video…</div>';
  dialog.showModal();
  const body = dialog.querySelector('.learning-preview-content');
  try {
    if (lesson.source?.kind === 'file') {
      const blob = await learningFileStore(lesson.source.fileKey);
      if (!dialog.open) return;
      if (!blob) throw new Error('This video file is unavailable in this browser. Edit the lesson to choose it again.');
      learningPreviewUrl = URL.createObjectURL(blob);
      body.innerHTML = '<video controls playsinline preload="metadata" aria-label="' + escapeHtml(lesson.title) + '" src="' + learningPreviewUrl + '"></video><p class="caption">Local preview. Watching here does not update a driver’s coaching record.</p>';
    } else if (lesson.source?.kind === 'link') {
      const url = new URL(lesson.source.url);
      if (!['https:', 'http:'].includes(url.protocol)) throw new Error('This video link is not supported.');
      body.innerHTML = '<p>' + escapeHtml(url.hostname) + '</p><a class="button button--secondary" href="' + escapeHtml(url.href) + '" target="_blank" rel="noopener noreferrer">Open video link ' + uiIcon('external') + '</a><p class="caption">Opens the external source. Viewing is not tracked here.</p>';
    } else throw new Error('No video is connected to this lesson.');
  } catch (failure) { body.textContent = failure.message; }
}

document.addEventListener('click', event => {
  const create = event.target.closest('[data-new-lesson]');
  const edit = event.target.closest('[data-edit-lesson]');
  const preview = event.target.closest('[data-preview-lesson]');
  if (create) openLearningEditor('', create.dataset.lessonProgram || '');
  if (edit) openLearningEditor(edit.dataset.editLesson);
  if (preview) previewLearningLesson(preview.dataset.previewLesson);
  if (event.target.closest('[data-close-learning-editor]')) document.getElementById('learning-editor')?.close();
  if (event.target.closest('[data-close-learning-preview]')) document.getElementById('learning-preview')?.close();
  if (event.target.closest('[data-add-lesson-mapping]')) {
    const rows = document.getElementById('learning-mapping-rows');
    rows.insertAdjacentHTML('beforeend', learningMappingRow());
    rows.lastElementChild.querySelector('select').focus();
  }
  const remove = event.target.closest('[data-remove-lesson-mapping]');
  if (remove) { remove.closest('.learning-mapping-row').remove(); document.querySelector('[data-add-lesson-mapping]')?.focus(); }
});

document.addEventListener('change', event => {
  if (!event.target.matches('#learning-editor [name="source-kind"]')) return;
  document.querySelectorAll('#learning-editor [data-learning-source]').forEach(field => { field.hidden = field.dataset.learningSource !== event.target.value; });
});

document.addEventListener('submit', event => {
  if (event.target.id !== 'learning-editor-form') return;
  event.preventDefault();
  saveLearningEditor(event.target);
});
