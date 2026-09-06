/*
 * Event-owned evidence for the static coaching prototype.
 *
 * Reading or staging evidence never assigns it. Only linkEvidenceEvents(), called
 * after Send, changes driver/session associations. Original incident metadata is
 * retained independently of those associations. No media, positions, severity,
 * or extra clips are inferred from a session's hash or coaching status.
 */
const sessionEvidenceIndex = new Map();
const sessionEvidenceClipIndex = new Map();
const sessionEvidenceSourceKeys = new Set();

function evidenceMeta(item) {
  const parts = String(item.meta || '').split(/\s+·\s+/).filter(Boolean);
  const metaSource = parts.shift();
  const source = item.source || metaSource || null;
  const vehicle = item.vehicle || item.unit || parts.find((part) => /^Unit\s/i.test(part)) || null;
  const dateParts = parts.filter((part) => /^(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec|Today|Yesterday)\b|^\d{4}-\d{2}-\d{2}|^\d{1,2}:\d{2}/i.test(part));
  const locationParts = parts.filter((part) => !dateParts.includes(part) && !/^Unit\s/i.test(part) && !/^\d+\s+(?:trips?|days?|events?)$/i.test(part));
  const position = item.coordinates || item.position || null;
  const rawLatitude = position && (position.latitude ?? position.lat);
  const rawLongitude = position && (position.longitude ?? position.lng ?? position.lon);
  const latitude = rawLatitude === null || rawLatitude === undefined || rawLatitude === '' ? NaN : Number(rawLatitude);
  const longitude = rawLongitude === null || rawLongitude === undefined || rawLongitude === '' ? NaN : Number(rawLongitude);
  const coordinates = position && Number.isFinite(latitude) && Number.isFinite(longitude) && Math.abs(latitude) <= 90 && Math.abs(longitude) <= 180
    ? { latitude, longitude }
    : null;
  return {
    source,
    time: item.time || item.date || dateParts.join(' · ') || null,
    location: item.location || locationParts.join(' · ') || null,
    vehicle,
    severity: item.severity || null,
    coordinates
  };
}

function isVideoEvidence(item) {
  if (item.video === false || /\b(?:days?|trips?|weeks?|events?)\b/i.test(String(item.duration || ''))) return false;
  return Boolean(item.video === true || item.mediaUrl || item.videoUrl || item.url || /^\d+:\d{2}(?::\d{2})?$/.test(String(item.duration || '')));
}

function registerEvidenceEvent(item, session, sourceKey, fallbackClipId) {
  if (sessionEvidenceSourceKeys.has(sourceKey)) return;
  sessionEvidenceSourceKeys.add(sourceKey);
  const id = 'event:' + (item.eventId || fallbackClipId);
  const meta = evidenceMeta(item);
  const categoryId = item.categoryId || session?.categoryId || null;
  const categoryName = item.categoryName || item.category || session?.category || (categoryId && typeof categoryNameFor === 'function' ? categoryNameFor(categoryId) : null);
  const originalPerson = item.person || session?.person || null;
  let incident = sessionEvidenceIndex.get(id);
  if (!incident) {
    incident = {
      id,
      title: item.title || item.eventType || 'Recorded event',
      eventType: item.eventType || item.title || 'Recorded event',
      categoryId,
      categoryName,
      person: originalPerson,
      assigned: Boolean(originalPerson),
      originalPerson,
      sourceSessionId: session?.id || item.sessionId || null,
      sessionIds: [],
      ...meta,
      duration: item.duration || null,
      video: false,
      kind: 'pattern',
      clips: [],
      original: Object.freeze({
        eventId: item.eventId || null,
        eventType: item.eventType || item.title || 'Recorded event',
        categoryId,
        categoryName,
        person: originalPerson,
        sessionId: session?.id || item.sessionId || null,
        meta: item.meta || null,
        duration: item.duration || null,
        ...meta
      })
    };
    sessionEvidenceIndex.set(id, incident);
  }
  if (session && !incident.sessionIds.includes(session.id)) incident.sessionIds.push(session.id);
  const suppliedClips = Array.isArray(item.clips) ? item.clips : [item];
  suppliedClips.forEach((record, index) => {
    if (!isVideoEvidence(record)) return;
    const clipId = record.id || (index === 0 ? fallbackClipId : fallbackClipId + '-camera-' + index);
    if (sessionEvidenceClipIndex.has(clipId)) return;
    const clipMeta = { ...meta };
    // Explicit camera metadata may refine a clip, without borrowing a location
    // or category from the coaching session it is later shared into.
    if (record !== item) {
      const cameraMeta = evidenceMeta(record);
      Object.keys(cameraMeta).forEach((key) => { if (cameraMeta[key] !== null) clipMeta[key] = cameraMeta[key]; });
    }
    const clip = {
      id: clipId,
      eventId: id,
      sessionId: session?.id || item.sessionId || null,
      sourceSessionId: session?.id || item.sessionId || null,
      person: incident.person,
      assigned: incident.assigned,
      categoryId: record.categoryId || categoryId,
      categoryName: record.categoryName || categoryName,
      eventType: record.eventType || incident.eventType,
      title: record.title || incident.title,
      ...clipMeta,
      duration: record.duration || null,
      camera: record.camera || record.angle || null,
      mediaUrl: record.mediaUrl || record.videoUrl || record.url || null,
      thumbnailUrl: record.thumbnailUrl || record.thumbnail || null,
      video: true,
      original: Object.freeze({
        ...clipMeta,
        person: originalPerson,
        sessionId: session?.id || item.sessionId || null,
        categoryId: record.categoryId || categoryId,
        categoryName: record.categoryName || categoryName,
        eventType: record.eventType || incident.eventType
      })
    };
    incident.clips.push(clip);
    sessionEvidenceClipIndex.set(clipId, clip);
  });
  incident.video = incident.clips.length > 0;
  incident.kind = incident.video ? 'video' : 'pattern';
}

function ensureSessionEvidence() {
  if (typeof sessions !== 'undefined') {
    sessions.forEach((session) => {
      (session.evidence || []).forEach((item, index) => {
        const legacyId = session.id + '-evidence-' + index;
        registerEvidenceEvent(item, session, legacyId, legacyId);
      });
    });
  }
  if (typeof unassignedClips !== 'undefined') {
    unassignedClips.forEach((item) => {
      // Explicit dual-camera sample for the prototype's event grouping flow.
      // Both cameras refer to one incident. There is no playable media or GPS
      // attached; the UI must keep the unavailable/illustrative states visible.
      const record = item.id === 'unassigned-1'
        ? { ...item, eventId: 'unassigned-1', clips: [
            { ...item, camera: 'Road' },
            { ...item, id: 'unassigned-1-cab', camera: 'Cab' }
          ] }
        : item;
      registerEvidenceEvent(record, null, 'pool:' + item.id, item.id);
    });
  }
}

function sessionEvidenceEvents(session) {
  if (!session) return [];
  ensureSessionEvidence();
  const explicitlyLinked = new Set(session.evidenceEventIds || []);
  return Array.from(sessionEvidenceIndex.values()).filter((incident) => incident.sessionIds.includes(session.id) || explicitlyLinked.has(incident.id));
}

function availableEvidenceEvents(session, scope = 'driver') {
  if (!session) return [];
  ensureSessionEvidence();
  return Array.from(sessionEvidenceIndex.values()).filter((incident) => scope === 'unassigned' ? !incident.assigned && !incident.person : incident.person === session.person);
}

function evidenceEvent(id) {
  ensureSessionEvidence();
  return sessionEvidenceIndex.get(id) || null;
}

function eventClips(incident) {
  const record = typeof incident === 'string' ? evidenceEvent(incident) : incident;
  return record ? record.clips.slice() : [];
}

function evidenceClip(id) {
  ensureSessionEvidence();
  return sessionEvidenceClipIndex.get(id) || null;
}

function sessionEvidenceClips(session) {
  return sessionEvidenceEvents(session).flatMap(eventClips);
}

function linkEvidenceEvents(session, eventIds) {
  if (!session || ['completed', 'archived'].includes(session.state)) return [];
  ensureSessionEvidence();
  const selected = Array.from(new Set(eventIds || [])).map((id) => sessionEvidenceIndex.get(id)).filter((incident) => incident && (!incident.person || incident.person === session.person));
  const linked = new Set(session.evidenceEventIds || []);
  selected.forEach((incident) => {
    if (!incident.person) {
      incident.person = session.person;
      incident.assigned = true;
      incident.clips.forEach((clip) => {
        clip.person = session.person;
        clip.assigned = true;
      });
    }
    if (!incident.sessionIds.includes(session.id)) incident.sessionIds.push(session.id);
    linked.add(incident.id);
  });
  session.evidenceEventIds = Array.from(linked);
  return selected;
}
