export function decodeAnswer(q, rawValue, linkedOptions) {
  if (rawValue === undefined || rawValue === null || rawValue === "") return "";
  let value;
  try { value = typeof rawValue === "string" ? JSON.parse(rawValue) : rawValue; } catch { value = rawValue; }
  const optMap = {};
  (q.options || []).forEach((o) => { optMap[o.value] = o.label; });
  const linkedMap = {};
  (linkedOptions || []).filter((o) => o.question_id === q.id).forEach((o) => { linkedMap[o.option_value] = o.option_label; });
  const type = q.type;
  if (type === "single" || type === "dropdown" || type === "image_choice") return optMap[value] || String(value);
  if (type === "checkbox") { if (!Array.isArray(value)) return optMap[value] || String(value); return value.map((v) => optMap[v] || String(v)).join("、"); }
  if (type === "ranking") { if (!Array.isArray(value)) return String(value); return value.map((v, i) => `${i + 1}. ${optMap[v] || String(v)}`).join(" > "); }
  if (type === "scale" || type === "star_rating" || type === "number") return String(value);
  if (type === "radio_grid") { if (typeof value !== "object" || value === null) return String(value); const rowMap = {}; (q.options || []).forEach((r) => { rowMap[r.value] = r.label; }); return Object.keys(value).map((k) => `${rowMap[k] || k}：${value[k]}`).join("；"); }
  if (type === "checkbox_grid") { if (typeof value !== "object" || value === null) return String(value); const rowMap = {}; (q.options || []).forEach((r) => { rowMap[r.value] = r.label; }); return Object.keys(value).map((k) => { const sel = Array.isArray(value[k]) ? value[k] : [value[k]]; return `${rowMap[k] || k}：${sel.join("、")}`; }).join("；"); }
  if (type === "linked_multi") { if (!Array.isArray(value)) return linkedMap[value] || String(value); return value.map((v) => linkedMap[v] || String(v)).join("、"); }
  if (type === "linked_short") { if (typeof value !== "object" || value === null) return String(value); return Object.keys(value).map((k) => `${linkedMap[k] || k}：${value[k]}`).join("；"); }
  if (type === "linked_matrix") {
    if (typeof value !== "object" || value === null) return String(value);
    const prompts = q.config?.prompts || [];
    return Object.keys(value).map((itemId) => {
      const itemLabel = linkedMap[itemId] || itemId;
      const answers = value[itemId] || {};
      const parts = prompts.filter((p) => answers[p.id] !== undefined && answers[p.id] !== null && answers[p.id] !== "").map((p) => {
        const cv = answers[p.id];
        if (p.type === "single") { const pm = {}; (p.options || []).forEach((o) => { pm[o.value] = o.label; }); return `${p.label}：${pm[cv] || cv}`; }
        if (p.type === "checkbox") { const pm = {}; (p.options || []).forEach((o) => { pm[o.value] = o.label; }); const sel = Array.isArray(cv) ? cv : [cv]; return `${p.label}：${sel.map((v) => pm[v] || v).join("、")}`; }
        return `${p.label}：${cv}`;
      });
      return `【${itemLabel}】${parts.join("｜")}`;
    }).join("；");
  }
  if (type === "allocation" || type === "inventory") { if (typeof value !== "object" || value === null) return String(value); return Object.keys(value).map((k) => `${optMap[k] || k}：${value[k]}`).join("、"); }
  if (type === "terms") return value?.accepted ? "已同意" : "未同意";
  if (type === "location") { if (typeof value === "object" && value?.lat !== undefined) return `${value.address || ""}(${value.lat}, ${value.lng})`.trim(); return String(value); }
  if (type === "maxdiff") { if (!Array.isArray(value)) return String(value); return value.map((r, i) => `第${i + 1}輪：最佳=${optMap[r.best] || r.best}、最差=${optMap[r.worst] || r.worst}`).join("；"); }
  if (type === "heatmap") { if (Array.isArray(value)) return value.map((p) => `(${Number(p.x).toFixed(2)},${Number(p.y).toFixed(2)})`).join("、"); if (typeof value === "object" && value !== null) return `(${Number(value.x || 0).toFixed(2)},${Number(value.y || 0).toFixed(2)})`; return String(value); }
  if (type === "text_highlight") { if (!Array.isArray(value)) return String(value); const cats = q.config?.categories || []; const catMap = {}; cats.forEach((c) => { catMap[c.id] = c.label; }); return value.map((s) => `[${catMap[s.categoryId] || s.categoryId}] ${s.text}`).join("、"); }
  if (type === "cascading") { if (Array.isArray(value)) return value.join(" > "); return String(value); }
  if (type === "signature" || type === "multi_image") { if (Array.isArray(value)) return value.map((v) => typeof v === "object" ? (v.fileName || v.attachmentId) : String(v)).join("、"); if (typeof value === "object" && value !== null) return value.fileName || value.attachmentId || JSON.stringify(value); return String(value); }
  if (Array.isArray(value)) return value.map((v) => typeof v === "object" ? JSON.stringify(v) : String(v)).join("、");
  if (typeof value === "object" && value !== null) return JSON.stringify(value);
  return String(value);
}
