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
  Boolean(value?.best && value?.worst && value.best !== value.worst);
export const ADVANCED_OPTION_TYPES = [
  "image_choice",
  "cascading",
  "ranking",
  "allocation",
  "inventory",
  "maxdiff",
];
