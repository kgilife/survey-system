import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";
import vm from "node:vm";

const dbSource = fs.readFileSync(new URL("../../backend/Database.gs", import.meta.url), "utf8");
const adminSource = fs.readFileSync(new URL("../../backend/ApiAdmin.gs", import.meta.url), "utf8");

function loadBackendHelpers() {
  const context = {
    Utilities: {
      getUuid: () => "uuid-123",
      base64Encode: (s) => Buffer.from(s).toString("base64"),
      Charset: { UTF_8: "UTF_8" },
    },
    LockService: {
      getScriptLock: () => ({
        tryLock: () => true,
        releaseLock: () => {},
      }),
    },
    SpreadsheetApp: {},
    DriveApp: {},
    console: console,
  };
  vm.createContext(context);
  vm.runInContext(dbSource, context);
  vm.runInContext(adminSource, context);
  return context;
}

test("decodeAnswerValue_ decodes linked_matrix with prompt labels and option labels", () => {
  const { decodeAnswerValue_ } = loadBackendHelpers();
  const q = {
    id: "q_matrix",
    type: "linked_matrix",
    title: "據點經營價值與難易度",
    config: {
      prompts: [
        {
          id: "P_value",
          label: "經營價值",
          type: "single",
          options: [
            { value: "PO_high", label: "很高" },
            { value: "PO_mid", label: "普通" },
          ],
        },
        {
          id: "P_comment",
          label: "備註說明",
          type: "short",
        },
      ],
    },
  };
  const linkedMap = {
    q_matrix: {
      LM_tp: "台北據點",
      LM_tc: "台中據點",
    },
  };
  const rawAnswer = JSON.stringify({
    LM_tp: {
      P_value: "PO_high",
      P_comment: "業績穩定成長",
    },
    LM_tc: {
      P_value: "PO_mid",
    },
  });

  const decoded = decodeAnswerValue_(q, rawAnswer, linkedMap);
  assert.equal(
    decoded,
    "【台北據點】經營價值：很高｜備註說明：業績穩定成長；【台中據點】經營價值：普通",
  );
});

test("decodeAnswerValue_ decodes single, checkbox, radio_grid, ranking", () => {
  const { decodeAnswerValue_ } = loadBackendHelpers();

  const qSingle = {
    id: "q1",
    type: "single",
    options: [{ value: "opt_1", label: "滿意" }, { value: "opt_2", label: "不滿意" }],
  };
  assert.equal(decodeAnswerValue_(qSingle, "opt_1"), "滿意");

  const qCheckbox = {
    id: "q2",
    type: "checkbox",
    options: [
      { value: "c1", label: "功能完整" },
      { value: "c2", label: "介面美觀" },
      { value: "c3", label: "載入快速" },
    ],
  };
  assert.equal(decodeAnswerValue_(qCheckbox, JSON.stringify(["c1", "c3"])), "功能完整、載入快速");

  const qGrid = {
    id: "q3",
    type: "radio_grid",
    options: [{ value: "r1", label: "硬體設備" }, { value: "r2", label: "軟體系統" }],
    config: { cols: ["好", "普通", "差"] },
  };
  assert.equal(
    decodeAnswerValue_(qGrid, JSON.stringify({ r1: "好", r2: "普通" })),
    "硬體設備：好；軟體系統：普通",
  );

  const qRank = {
    id: "q4",
    type: "ranking",
    options: [{ value: "A", label: "項目甲" }, { value: "B", label: "項目乙" }, { value: "C", label: "項目丙" }],
  };
  assert.equal(decodeAnswerValue_(qRank, JSON.stringify(["B", "A", "C"])), "1. 項目乙 > 2. 項目甲 > 3. 項目丙");
});

test("wideCsv_ generates respondent-level wide format with profiles and decoded answers", () => {
  const { wideCsv_ } = loadBackendHelpers();

  const fakeSheets = {
    "問項設計": [
      ["question_id", "section_id", "question_order", "type", "title", "description", "required", "config_json", "validation_json", "active", "updated_at"],
      ["q1", "S1", 1, "single", "滿意度", "", true, "{}", "{}", true, "2026-08-27"],
      ["q2", "S1", 2, "heading", "說明區塊", "", false, "{}", "{}", true, "2026-08-27"],
      ["q3", "S1", 3, "short", "心得建議", "", false, "{}", "{}", true, "2026-08-27"],
    ],
    "專案設定": [
      ["key", "value", "updated_at"],
      ["sections", JSON.stringify([{ id: "S1", title: "主要問卷", order: 1 }]), "2026-08-27"],
    ],
    "一般選項設定": [
      ["question_id", "option_value", "option_label", "option_order", "next_section_id", "active", "option_config_json"],
      ["q1", "opt_good", "非常滿意", 1, "", true, "{}"],
      ["q1", "opt_bad", "不滿意", 2, "", true, "{}"],
    ],
    "連結型選項設定": [
      ["question_id", "account", "option_value", "option_label", "option_order", "active"],
    ],
    "連結型矩陣問項設定": [
      ["question_id", "prompt_id", "prompt_label", "prompt_order", "active", "prompt_type", "prompt_options_json", "prompt_required", "prompt_config_json"],
    ],
    "使用者欄位設定": [
      ["field_id", "field_key", "field_label", "field_order", "field_type", "statistical_dimension", "active"],
      ["f1", "account", "業務員代碼", 1, "text", true, true],
      ["f2", "name", "姓名", 2, "text", true, true],
    ],
    "問卷使用者設定": [
      ["account", "password_hash", "profile_json", "status", "created_at", "updated_at"],
      ["0001082", "hash", JSON.stringify({ name: "王大明" }), "active", "2026-08-27", "2026-08-27"],
      ["0002099", "hash", JSON.stringify({ name: "李小美" }), "active", "2026-08-27", "2026-08-27"],
    ],
    "填寫狀態": [
      ["account", "status", "first_saved_at", "last_saved_at", "first_submitted_at", "last_submitted_at", "last_login_at", "revision_count", "updated_by"],
      ["0001082", "已送出", "2026-08-27", "2026-08-27", "2026-08-27", "2026-08-27", "2026-08-27", 1, "使用者:0001082"],
    ],
    "使用者回答": [
      ["answer_id", "account", "question_id", "answer_value", "answer_display", "attachment_ids", "status", "created_at", "updated_at", "submitted_at", "updated_by"],
      ["a1", "0001082", "q1", JSON.stringify("opt_good"), "非常滿意", "[]", "已送出", "2026-08-27", "2026-08-27", "2026-08-27", "使用者:0001082"],
      ["a2", "0001082", "q3", JSON.stringify("系統很好用"), "系統很好用", "[]", "已送出", "2026-08-27", "2026-08-27", "2026-08-27", "使用者:0001082"],
    ],
  };

  const fakeSS = {
    getSheetByName: (name) => {
      const data = fakeSheets[name] || [];
      return {
        getDataRange: () => ({
          getValues: () => data.map((r) => [...r]),
        }),
      };
    },
  };

  const csv = wideCsv_(fakeSS, "wide");
  const lines = csv.split("\r\n");
  assert.equal(lines[0], '"業務員代碼","name","填寫狀態","滿意度","心得建議"');
  assert.equal(lines[1], '"0001082","王大明","已送出","非常滿意","系統很好用"');
  assert.equal(lines[2], '"0002099","李小美","未填寫","",""');
});

test("matrixCsv_ generates matrix breakdown table for pivot table analysis", () => {
  const { matrixCsv_ } = loadBackendHelpers();

  const fakeSheets = {
    "問項設計": [
      ["question_id", "section_id", "question_order", "type", "title", "description", "required", "config_json", "validation_json", "active", "updated_at"],
      ["q_mat", "S1", 1, "linked_matrix", "據點經營價值與難易度", "", true, "{}", "{}", true, "2026-08-27"],
    ],
    "專案設定": [
      ["key", "value", "updated_at"],
      ["sections", JSON.stringify([{ id: "S1", title: "主要問卷", order: 1 }]), "2026-08-27"],
    ],
    "一般選項設定": [],
    "連結型選項設定": [
      ["question_id", "account", "option_value", "option_label", "option_order", "active"],
      ["q_mat", "0001082", "LM_tp", "台北服務中心", 1, true],
      ["q_mat", "0001082", "LM_tc", "台中服務中心", 2, true],
    ],
    "連結型矩陣問項設定": [
      ["question_id", "prompt_id", "prompt_label", "prompt_order", "active", "prompt_type", "prompt_options_json", "prompt_required", "prompt_config_json"],
      ["q_mat", "P_val", "經營價值", 1, true, "single", JSON.stringify([{ value: "PO_1", label: "高" }, { value: "PO_2", label: "中" }]), true, "{}"],
      ["q_mat", "P_diff", "經營難易度", 2, true, "single", JSON.stringify([{ value: "PO_a", label: "容易" }, { value: "PO_b", label: "困難" }]), true, "{}"],
    ],
    "使用者欄位設定": [
      ["field_id", "field_key", "field_label", "field_order", "field_type", "statistical_dimension", "active"],
      ["f1", "account", "帳號", 1, "text", true, true],
      ["f2", "dept", "單位", 2, "text", true, true],
    ],
    "問卷使用者設定": [
      ["account", "password_hash", "profile_json", "status", "created_at", "updated_at"],
      ["0001082", "hash", JSON.stringify({ dept: "北區業務部" }), "active", "2026-08-27", "2026-08-27"],
    ],
    "填寫狀態": [
      ["account", "status", "first_saved_at", "last_saved_at", "first_submitted_at", "last_submitted_at", "last_login_at", "revision_count", "updated_by"],
      ["0001082", "已送出", "2026-08-27", "2026-08-27", "2026-08-27", "2026-08-27", "2026-08-27", 1, "使用者:0001082"],
    ],
    "使用者回答": [
      ["answer_id", "account", "question_id", "answer_value", "answer_display", "attachment_ids", "status", "created_at", "updated_at", "submitted_at", "updated_by"],
      ["a1", "0001082", "q_mat", JSON.stringify({
        LM_tp: { P_val: "PO_1", P_diff: "PO_a" },
        LM_tc: { P_val: "PO_2", P_diff: "PO_b" },
      }), "", "[]", "已送出", "2026-08-27", "2026-08-27", "2026-08-27", "使用者:0001082"],
    ],
  };

  const fakeSS = {
    getSheetByName: (name) => {
      const data = fakeSheets[name] || [];
      return {
        getDataRange: () => ({
          getValues: () => data.map((r) => [...r]),
        }),
      };
    },
  };

  const csv = matrixCsv_(fakeSS);
  const lines = csv.split("\r\n");
  assert.equal(lines[0], '"帳號","dept","填寫狀態","題目名稱","項目名稱","經營價值","經營難易度"');
  assert.equal(lines[1], '"0001082","北區業務部","已送出","據點經營價值與難易度","台北服務中心","高","容易"');
  assert.equal(lines[2], '"0001082","北區業務部","已送出","據點經營價值與難易度","台中服務中心","中","困難"');
});