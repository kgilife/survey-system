import test from "node:test";
import assert from "node:assert/strict";
import { focusSurveyError, validationNotice, matrixErrors, matrixCellId, serverErrors } from "../src/surveyErrors.js";

const matrix = { id: "matrix", sectionId: "one", title: "據點經營", type: "linked_matrix", required: true,
  options: [{ value: "south", label: "台南分行" }, { value: "north", label: "台北分行" }],
  config: { prompts: [{ id: "q1", label: "是否經營" }, { id: "q2", label: "人數" },
    { id: "q3", label: "經營進展" }, { id: "q4", label: "經營困難" }, { id: "optional", required: false }] } };
const values = { south: { q1: "是", q2: "5", q3: [], q4: "  " }, north: { q1: "否", q2: 0, q3: ["無"], q4: "無" } };

test("matrix errors identify Q3 and Q4 in item order without a parent error", () => {
  const entries = matrixErrors(matrix, values);
  assert.deepEqual(entries.map((e) => [e.itemId, e.promptId]), [["south", "q3"], ["south", "q4"]]);
  assert.match(entries[0].message, /據點經營.*台南分行.*Q3.*經營進展/);
  assert.equal(entries[0].cellId, matrixCellId("matrix", "south", "q3"));
  assert.equal(matrixErrors({ ...matrix, required: false }, {}).length, 0);
  assert.equal(matrixErrors({ ...matrix, options: [] }, {}).length, 0);
  assert.deepEqual(matrixErrors(matrix, { ...values, south: { ...values.south, q3: ["已拜訪"] } }).map((e) => e.promptId), ["q4"]);
});

test("server errors mix general questions and cells in survey order without duplicate counts", () => {
  const schema = { sections: [{ id: "two", order: 2 }, { id: "one", order: 1 }],
    questions: [{ id: "phone", sectionId: "two", title: "聯絡電話" }, matrix] };
  const entries = serverErrors([{ questionId: "phone", message: "尚未填寫" },
    { questionId: "matrix", message: "未完成" }, { questionId: "matrix", message: "未完成" }], schema, { matrix: values });
  assert.deepEqual(entries.map((e) => e.questionId), ["matrix", "matrix", "phone"]);
  assert.match(validationNotice(entries), /^有 3 處/);
});

test("focus chooses the exact matrix cell instead of its parent", () => {
  const calls = [];
  const id = matrixCellId("m", "row", "q3");
  const cell = { dataset: { errorCell: id }, focus: () => calls.push("cell"), scrollIntoView: () => calls.push("scroll") };
  const root = { querySelectorAll: (selector) => selector === "[data-error-cell]" ? [cell] : [] };
  assert.equal(focusSurveyError(root, "m", id), true);
  assert.deepEqual(calls, ["cell", "scroll"]);
});

test("validation notice identifies the first question and error count", () => {
  assert.equal(validationNotice([
    { questionId: "a", message: "「參加意願」為必填題" },
    { questionId: "b", message: "「聯絡信箱」Email 格式錯誤" },
  ]), "有 2 處尚未完成或需要修正，第一處：「參加意願」為必填題");
});

test("focuses the question container and aligns its top on every attempt", () => {
  const calls = [];
  const target = {
    dataset: { questionId: 'long["matrix"]' },
    focus: (options) => calls.push(["focus", options]),
    scrollIntoView: (options) => calls.push(["scroll", options]),
  };
  const other = { dataset: { questionId: "other" } };
  const root = { querySelectorAll: () => [other, target] };
  for (let attempt = 0; attempt < 2; attempt++) {
    assert.equal(focusSurveyError(root, target.dataset.questionId), true);
  }
  const expected = [
    ["focus", { preventScroll: true }],
    ["scroll", { behavior: "instant", block: "start", inline: "nearest" }],
  ];
  assert.deepEqual(calls, [...expected, ...expected]);
});

test("missing/unmounted questions do not throw or scroll an unrelated survey", () => {
  assert.equal(focusSurveyError(null, "absent"), false);
  assert.equal(focusSurveyError({ querySelectorAll: () => [] }, "absent"), false);
});

test("falls back to top alignment if scroll options are unsupported", () => {
  const calls = [];
  const target = {
    dataset: { questionId: "a" },
    focus() {},
    scrollIntoView(options) {
      calls.push(options);
      if (typeof options === "object") throw new TypeError("unsupported options");
    },
  };
  assert.equal(focusSurveyError({ querySelectorAll: () => [target] }, "a"), true);
  assert.equal(calls.at(-1), true);
});
