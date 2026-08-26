export const sameAnswer = (left, right) => JSON.stringify(left) === JSON.stringify(right);

export function mergeSurveyAnswers(base = {}, local = {}, remote = {}) {
  const merged = {};
  const conflicts = [];
  const ids = new Set([...Object.keys(base), ...Object.keys(local), ...Object.keys(remote)]);
  ids.forEach((id) => {
    const localChanged = !sameAnswer(local[id], base[id]);
    const remoteChanged = !sameAnswer(remote[id], base[id]);
    if (localChanged && remoteChanged && !sameAnswer(local[id], remote[id])) conflicts.push(id);
    if (localChanged) merged[id] = local[id];
    else if (Object.prototype.hasOwnProperty.call(remote, id)) merged[id] = remote[id];
  });
  return { merged, conflicts };
}

export function resumeGuestId(locationLike) {
  const hashQuery = String(locationLike.hash || '').split('?')[1] || '';
  return new URLSearchParams(hashQuery).get('resume') || new URLSearchParams(locationLike.search || '').get('resume') || '';
}

export function resumeUrl(locationLike, projectId, guestId) {
  return `${locationLike.origin}${locationLike.pathname}#/survey/${encodeURIComponent(projectId)}?resume=${encodeURIComponent(guestId || '')}`;
}
