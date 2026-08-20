export const isEmail = (value) =>
  /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(value || ""));
export const allocationTotal = (value) =>
  Object.values(value || {}).reduce(
    (sum, item) => sum + (Number(item) || 0),
    0,
  );
export const inventoryDelta = (before, after) => {
  const keys = new Set([
    ...Object.keys(before || {}),
    ...Object.keys(after || {}),
  ]);
  return Object.fromEntries(
    [...keys].map((key) => [
      key,
      (Number(after?.[key]) || 0) - (Number(before?.[key]) || 0),
    ]),
  );
};
export const normalizePoint = (x, y, width, height) => ({
  x: Math.max(0, Math.min(1, x / width)),
  y: Math.max(0, Math.min(1, y / height)),
});
export const validMaxDiff = (value) =>
  Array.isArray(value)
    ? value.length > 0 && value.every((round) => round?.best && round?.worst && round.best !== round.worst)
    : Boolean(value?.best && value?.worst && value.best !== value.worst);
export const maxDiffSets = (options, setSize = 4, rounds = 0) => {
  const ids = (options || []).map((o) => o.value);
  if (ids.length < 2) return [];
  const size = Math.max(2, Math.min(ids.length, Number(setSize) || 4));
  const count = Math.max(1, Math.min(Number(rounds) || ids.length, ids.length * 3));
  return Array.from({ length: count }, (_, round) =>
    Array.from({ length: size }, (_, offset) => ids[(round + offset * Math.max(1, Math.floor(ids.length / size))) % ids.length])
      .filter((id, i, set) => set.indexOf(id) === i),
  );
};
export const maxDiffUtilities = (responses, optionIds) => {
  const score = Object.fromEntries((optionIds || []).map((id) => [id, { best: 0, worst: 0, shown: 0 }]));
  (responses || []).flat().forEach((r) => {
    (r?.set || []).forEach((id) => { if (score[id]) score[id].shown += 1; });
    if (score[r?.best]) score[r.best].best += 1;
    if (score[r?.worst]) score[r.worst].worst += 1;
  });
  return Object.fromEntries(Object.entries(score).map(([id, s]) => [id, s.shown ? (s.best - s.worst) / s.shown : 0]));
};
export const ADVANCED_OPTION_TYPES = [
  "image_choice",
  "cascading",
  "ranking",
  "allocation",
  "inventory",
  "maxdiff",
];

export const linkedMatrixMissingCells = (value, items, prompts) => {
  const answers = value && typeof value === "object" ? value : {};
  const missing = [];
  (prompts || []).forEach((prompt) =>
    (items || []).forEach((item) => {
      const cell = answers[item.value]?.[prompt.id];
      if (cell === undefined || cell === null || String(cell).trim() === "")
        missing.push({ item: item.label, prompt: prompt.label });
    }),
  );
  return missing;
};
