import ExcelJS from "exceljs";
import { decodeAnswer } from "./answerDisplay.js";

export const XLSX_MIME = "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";
const matrixTypes = new Set(["linked_matrix", "radio_grid", "checkbox_grid"]);
const isPresent = (value) => value !== undefined && value !== null && String(value).trim() !== "";
const parse = (value) => { try { return JSON.parse(value); } catch { return value; } };
const text = (value) => value == null ? "" : typeof value === "object" ? JSON.stringify(value) : String(value);

export function exportProfileFields(fields, users) {
  const result = new Map();
  const privateKeys = new Set(["account", "password", "password_hash"]);
  fields.filter((f) => f.field_type === "password").forEach((f) => privateKeys.add(f.field_key));
  const hasValue = (key) => users.some((u) => isPresent(u.profile?.[key]));
  [...fields].sort((a, b) => Number(a.field_order || 0) - Number(b.field_order || 0)).forEach((f) => {
    const key = f.field_key;
    if (!key || privateKeys.has(key)) return;
    // Imports can leave generated field_N placeholders in both profile and field settings.
    const placeholder = /^field_\d+$/i.test(key) && (!f.field_label || f.field_label === key);
    if (!hasValue(key) && (placeholder || String(f.active) === "false")) return;
    result.set(key, { key, label: f.field_label || key });
  });
  users.forEach((u) => Object.keys(u.profile || {}).forEach((key) => {
    if (!privateKeys.has(key) && !result.has(key) && key.trim() && hasValue(key)) result.set(key, { key, label: key });
  }));
  return [...result.values()];
}

export function uniqueSheetName(title, used) {
  const base = Array.from(String(title), (char) => char.charCodeAt(0) < 32 || '\\/*?:[]'.includes(char) ? "_" : char).join("").replace(/^'+|'+$/g, "").trim() || "工作表";
  let name = base.slice(0, 31), suffix = 1;
  while (used.has(name.toLowerCase())) {
    const ending = `_${++suffix}`;
    name = base.slice(0, 31 - ending.length) + ending;
  }
  used.add(name.toLowerCase());
  return name;
}

// Pure tabular model, shared by tests and the browser writer. No API writes or temporary Drive files.
export function buildSurveySheets(data, responses) {
  const users = [...(data.users || [])];
  const userMap = new Map(users.map((u) => [String(u.account), u]));
  const statuses = new Map((responses.statuses || []).map((s) => [String(s.account), s.status]));
  const answers = new Map();
  (responses.answers || []).forEach((a) => {
    const account = String(a.account);
    if (!userMap.has(account)) { const u = { account, profile: {} }; users.push(u); userMap.set(account, u); }
    if (!answers.has(account)) answers.set(account, new Map());
    answers.get(account).set(a.question_id, a);
  });
  const fields = exportProfileFields(data.fields || [], users);
  const accountLabel = data.fields?.find((f) => f.field_key === "account")?.field_label || "帳號";
  const baseHeaders = [accountLabel, ...fields.map((f) => f.label), "填寫狀態"];
  const baseRow = (u) => [String(u.account), ...fields.map((f) => text(u.profile?.[f.key])), statuses.get(String(u.account)) || "未填寫"];
  const questions = (data.schema?.questions || []).filter((q) => !["heading", "image_note", "section"].includes(q.type));
  const usedNames = new Set(["回答總覽", "已送出總覽", "完整答案明細"]);
  const matrixSheets = new Map();
  questions.forEach((q, i) => {
    if (matrixTypes.has(q.type)) matrixSheets.set(q.id, { name: uniqueSheetName(`Q${i + 1}_${q.title}`, usedNames), rows: [] });
  });
  const overviewHeaders = [...baseHeaders, ...questions.map((q, i) => `Q${i + 1}_${q.title}`)];
  const overview = { name: "回答總覽", rows: [overviewHeaders] };
  const submitted = { name: "已送出總覽", rows: [overviewHeaders] };
  const detail = { name: "完整答案明細", rows: [[...baseHeaders, "題號", "題目名稱", "項目名稱", "子問項", "答案", "題目 ID", "項目 ID", "子問項 ID", "最後更新", "送出時間"]] };
  const linkedOptions = data.linkedOptions || [];
  questions.forEach((q) => {
    const sheet = matrixSheets.get(q.id);
    if (sheet) sheet.rows.push([...baseHeaders, "題目名稱", "項目名稱", ...(q.type === "linked_matrix" ? (q.config?.prompts || []).map((p) => p.label) : ["答案"])]);
  });
  users.forEach((u) => {
    const base = baseRow(u), account = String(u.account), userAnswers = answers.get(account) || new Map();
    const ownLinked = linkedOptions.filter((o) => String(o.account) === account);
    const overviewRow = [...base];
    questions.forEach((q, index) => {
      const record = userAnswers.get(q.id), raw = parse(record?.answer_value), sheet = matrixSheets.get(q.id);
      const decode = (question, value) => decodeAnswer(question, JSON.stringify(value), ownLinked);
      const appendDetail = (item, prompt, value) => detail.rows.push([
        ...base, `Q${index + 1}`, q.title, item?.label || "", prompt?.label || "", value,
        q.id, item?.value || "", prompt?.id || "", text(record?.updated_at), text(record?.submitted_at),
      ]);
      if (!sheet && q.type !== "linked_short") {
        const value = decode(q, raw);
        overviewRow.push(value);
        appendDetail(null, null, value);
        return;
      }
      overviewRow.push(sheet ? { text: "查看矩陣明細", hyperlink: `#'${sheet.name.replace(/'/g, "''")}'!A1` } : decode(q, raw));
      const values = raw && typeof raw === "object" && !Array.isArray(raw) ? raw : {};
      if (isPresent(raw) && (typeof raw !== "object" || Array.isArray(raw))) appendDetail(null, null, text(raw));
      const linked = q.type.startsWith("linked_");
      const candidates = linked ? ownLinked.filter((o) => o.question_id === q.id).sort((a, b) => a.option_order - b.option_order).map((o) => ({ value: o.option_value, label: o.option_label, active: o.active })) : (q.options || []);
      const items = new Map(candidates.filter((o) => String(o.active) !== "false" || Object.hasOwn(values, o.value)).map((o) => [o.value, o]));
      // Keep historical answers even if the item's assignment has since been removed.
      Object.keys(values).forEach((id) => { if (!items.has(id)) items.set(id, { value: id, label: id }); });
      items.forEach((item) => {
        const itemValue = values[item.value];
        if (q.type === "linked_matrix") {
          const prompts = q.config?.prompts || [];
          const decoded = prompts.map((p) => decode({ ...p, type: p.type || "short" }, itemValue?.[p.id]));
          sheet.rows.push([...base, q.title, item.label, ...decoded]);
          prompts.forEach((p, i) => appendDetail(item, p, decoded[i]));
          const knownPrompts = new Set(prompts.map((p) => p.id));
          if (itemValue && typeof itemValue === "object") Object.keys(itemValue).forEach((id) => {
            if (!knownPrompts.has(id)) appendDetail(item, { id, label: `已移除子問項（${id}）` }, text(itemValue[id]));
          });
        } else {
          const value = decode({ type: q.type === "checkbox_grid" ? "checkbox" : "short" }, itemValue);
          if (sheet) sheet.rows.push([...base, q.title, item.label, value]);
          appendDetail(item, null, value);
        }
      });
    });
    // Older/deleted questions must not disappear from the full-detail export.
    const known = new Set(questions.map((q) => q.id));
    userAnswers.forEach((record, id) => {
      if (!known.has(id)) detail.rows.push([...base, "", `已移除題目（${id}）`, "", "", text(parse(record.answer_value)), id, "", "", text(record.updated_at), text(record.submitted_at)]);
    });
    overview.rows.push(overviewRow);
    if (statuses.get(account) === "已送出") submitted.rows.push(overviewRow);
  });
  return [overview, submitted, ...matrixSheets.values(), detail];
}

export async function createSurveyWorkbook(data, responses) {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = "問卷系統";
  for (const table of buildSurveySheets(data, responses)) {
    if (table.rows.length > 1048576 || table.rows[0].length > 16384) throw new Error("資料超過 Excel 單一工作表上限，請縮小問卷資料範圍。");
    const sheet = workbook.addWorksheet(table.name, { views: [{ state: "frozen", xSplit: 1, ySplit: 1 }] });
    sheet.addRows(table.rows);
    sheet.autoFilter = { from: { row: 1, column: 1 }, to: { row: table.rows.length, column: table.rows[0].length } };
    sheet.columns.forEach((column, index) => {
      column.width = index === 0 ? 18 : Math.min(48, Math.max(18, text(table.rows[0][index]).length * 2 + 4));
      column.numFmt = "@";
      column.alignment = { vertical: "top", wrapText: true };
    });
    sheet.eachRow((row, rowNumber) => {
      row.eachCell((cell) => {
        if (typeof cell.value === "string" && cell.value.length > 32767) throw new Error("有答案超過 Excel 單格 32,767 字元上限，無法完整匯出。");
        cell.font = { name: "Microsoft JhengHei", size: 11 };
        if (cell.hyperlink) cell.font = { ...cell.font, color: { argb: "FF245DAD" }, underline: true };
      });
      if (rowNumber === 1) {
        row.height = 30;
        row.eachCell((cell) => {
          cell.font = { name: "Microsoft JhengHei", size: 11, bold: true, color: { argb: "FFFFFFFF" } };
          cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF254767" } };
        });
      }
    });
  }
  return workbook.xlsx.writeBuffer();
}
