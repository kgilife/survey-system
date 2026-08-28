import test from "node:test";
import assert from "node:assert/strict";
import { focusSurveyError, validationNotice } from "../src/surveyErrors.js";

test("validation notice identifies the first question and error count", () => {
  assert.equal(validationNotice([
    { questionId: "a", message: "「參加意願」為必填題" },
    { questionId: "b", message: "「聯絡信箱」Email 格式錯誤" },
  ]), "有 2 題需要修正，第一題：「參加意願」為必填題");
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
