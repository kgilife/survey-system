import assert from "node:assert/strict";
import test from "node:test";
import ExcelJS from "exceljs";
import { buildSurveySheets, createSurveyWorkbook, exportProfileFields, uniqueSheetName } from "../src/surveyExport.js";

function fixture() {
  const data = {
    fields: [
      { field_key: "account", field_label: "業務員代碼" },
      { field_key: "name", field_label: "姓名", field_order: 1 },
      { field_key: "field_1", field_label: "field_1", field_order: 2 },
      { field_key: "empty", field_label: "正式空欄", field_order: 3 },
      { field_key: "password", field_label: "密碼" },
    ],
    users: [
      { account: "00123", profile: { name: "王明", field_1: "", password: "secret", unknown: "有值" } },
      { account: "00456", profile: { name: "李華", field_1: " " } },
      { account: "00789", profile: { name: "未填者" } },
    ],
    schema: { questions: [
      { id: "heading", type: "heading", title: "說明" },
      { id: "q1", type: "single", title: "一般題", options: [{ value: "yes", label: "同意" }] },
      { id: "q2", type: "linked_matrix", title: "據點/評估", config: { prompts: [
        { id: "p1", type: "single", label: "價值", options: [{ value: "high", label: "高" }] },
        { id: "p2", type: "checkbox", label: "優點", options: [{ value: "a", label: "地點" }, { value: "b", label: "服務" }] },
        { id: "p3", type: "short", label: "建議" },
      ] } },
      { id: "q3", type: "radio_grid", title: "方格", options: [{ value: "r1", label: "硬體" }], config: { cols: ["好", "差"] } },
    ] },
    linkedOptions: [
      { account: "00123", question_id: "q2", option_value: "site1", option_label: "台北", option_order: 1 },
      { account: "00123", question_id: "q2", option_value: "site2", option_label: "桃園", option_order: 2 },
      { account: "00456", question_id: "q2", option_value: "site1", option_label: "高雄", option_order: 1 },
    ],
  };
  const responses = {
    statuses: [{ account: "00123", status: "已送出" }, { account: "00456", status: "已暫存" }],
    answers: [
      { account: "00123", question_id: "q1", answer_value: '"yes"' },
      { account: "00123", question_id: "q2", answer_value: JSON.stringify({ site1: { p1: "high", p2: ["a", "b"], p3: '=HYPERLINK("https://invalid")\n第二行' } }), updated_at: "2026-08-28" },
      { account: "00456", question_id: "q2", answer_value: JSON.stringify({ site1: { p1: "high" } }) },
      { account: "00123", question_id: "q3", answer_value: JSON.stringify({ r1: "好" }) },
    ],
  };
  return { data, responses };
}

test("single workbook combines overview, submitted, separate matrices and unified detail", () => {
  const { data, responses } = fixture();
  const sheets = buildSurveySheets(data, responses);
  assert.deepEqual(sheets.map((s) => s.name), ["回答總覽", "已送出總覽", "Q2_據點_評估", "Q3_方格", "完整答案明細"]);
  assert.equal(sheets[0].rows.length, 4);
  assert.equal(sheets[1].rows.length, 2);
  assert.deepEqual(sheets[0].rows[0].slice(0, 5), ["業務員代碼", "姓名", "正式空欄", "unknown", "填寫狀態"]);
  assert.equal(sheets[0].rows[1][5], "同意");
  assert.equal(sheets[0].rows[1][6].hyperlink, "#'Q2_據點_評估'!A1");
  assert.deepEqual(sheets[2].rows[1].slice(5, 9), ["據點/評估", "台北", "高", "地點、服務"]);
  assert.equal(sheets[2].rows[2][6], "桃園");
  assert.equal(sheets[2].rows[2][7], "");
  assert.equal(sheets[2].rows[3][6], "高雄");
  assert.equal(sheets[3].rows[1].at(-1), "好");
  const detail = sheets.at(-1).rows;
  assert.ok(detail.some((r) => r[5] === "Q1" && r[9] === "同意"));
  assert.ok(detail.some((r) => r[7] === "台北" && r[8] === "價值" && r[9] === "高" && r[11] === "site1" && r[12] === "p1"));
  assert.equal(JSON.stringify(sheets).includes("secret"), false);
});

test("empty and ordinary-only surveys retain headers, without fake matrix sheets", () => {
  const { data } = fixture();
  data.schema.questions = data.schema.questions.slice(0, 2);
  const sheets = buildSurveySheets(data, { answers: [], statuses: [] });
  assert.deepEqual(sheets.map((s) => s.name), ["回答總覽", "已送出總覽", "完整答案明細"]);
  assert.equal(sheets[1].rows.length, 1);
  data.users = [];
  assert.ok(buildSurveySheets(data, { answers: [], statuses: [] }).every((s) => s.rows.length === 1));
});

test("only empty generated fields are removed; real empty fields, zero and false survive", () => {
  const { data } = fixture();
  data.users[0].profile.field_1 = 0;
  data.users[0].profile.extra = false;
  data.fields.push({ field_key: "field_2", field_label: "正式名稱" }, { field_key: "credential", field_type: "password" });
  data.users[0].profile.credential = "secret";
  assert.deepEqual(exportProfileFields(data.fields, data.users).map((f) => f.key), ["field_2", "name", "field_1", "empty", "unknown", "extra"]);
});

test("removed assignments, removed questions and orphan respondents retain answers", () => {
  const { data, responses } = fixture();
  data.linkedOptions = [];
  responses.answers.push({ account: "00999", question_id: "deleted", answer_value: '"歷史答案"' });
  const sheets = buildSurveySheets(data, responses);
  assert.equal(sheets[0].rows.at(-1)[0], "00999");
  assert.ok(sheets[2].rows.some((r) => r[6] === "site1" && r[7] === "高"));
  assert.ok(sheets.at(-1).rows.some((r) => r[9] === "歷史答案" && r[10] === "deleted"));
});

test("worksheet names are safe, short and case-insensitively unique", () => {
  const used = new Set();
  const first = uniqueSheetName("'長名稱".repeat(20) + "/:*?[]", used);
  const second = uniqueSheetName("'長名稱".repeat(20) + "/:*?[]", used);
  assert.ok(first.length <= 31 && second.length <= 31);
  assert.notEqual(first, second);
  assert.equal(uniqueSheetName("ABC", used), "ABC");
  assert.equal(uniqueSheetName("abc", used), "abc_2");
});

test("checkbox grids, linked short answers and deleted prompts expand without loss", () => {
  const { data, responses } = fixture();
  data.schema.questions[3].type = "checkbox_grid";
  responses.answers[3].answer_value = JSON.stringify({ r1: ["好", "差"] });
  data.schema.questions.push({ id: "short", type: "linked_short", title: "逐項說明" });
  data.linkedOptions.push({ account: "00123", question_id: "short", option_value: "item", option_label: "項目甲" });
  responses.answers.push({ account: "00123", question_id: "short", answer_value: JSON.stringify({ item: "保留文字" }) });
  const matrix = JSON.parse(responses.answers[1].answer_value);
  matrix.site1.deleted = "舊子題答案";
  responses.answers[1].answer_value = JSON.stringify(matrix);
  const sheets = buildSurveySheets(data, responses);
  assert.equal(sheets[3].rows[1].at(-1), "好、差");
  assert.ok(sheets.at(-1).rows.some((r) => r[7] === "項目甲" && r[9] === "保留文字"));
  assert.ok(sheets.at(-1).rows.some((r) => r[9] === "舊子題答案" && r[12] === "deleted"));
});

test("real xlsx round trip preserves leading zeros, Chinese, hyperlinks and formula-like text", async () => {
  const { data, responses } = fixture();
  const buffer = await createSurveyWorkbook(data, responses);
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.load(buffer);
  assert.equal(workbook.worksheets.length, 5);
  const overview = workbook.getWorksheet("回答總覽");
  assert.equal(overview.getCell("A2").value, "00123");
  assert.equal(overview.getCell("A2").numFmt, "@");
  assert.equal(overview.getCell("B2").value, "王明");
  assert.equal(overview.getCell("G2").hyperlink, "#'Q2_據點_評估'!A1");
  const answer = workbook.getWorksheet("Q2_據點_評估").getCell("J2");
  assert.equal(answer.value, '=HYPERLINK("https://invalid")\n第二行');
  assert.equal(answer.formula, undefined);
  assert.ok(overview.autoFilter);
  assert.equal(overview.views[0].state, "frozen");
});

test("oversized cell fails explicitly rather than silently truncating an answer", async () => {
  const { data, responses } = fixture();
  responses.answers[0].answer_value = JSON.stringify("a".repeat(32768));
  await assert.rejects(createSurveyWorkbook(data, responses), /32,767/);
});
