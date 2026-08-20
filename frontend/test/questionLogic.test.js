import test from "node:test";
import assert from "node:assert/strict";
import {
  allocationTotal,
  inventoryDelta,
  isEmail,
  normalizePoint,
  validMaxDiff,
  maxDiffSets,
  maxDiffUtilities,
  linkedMatrixMissingCells,
} from "../src/questionLogic.js";

test("Email 格式檢查", () => {
  assert.equal(isEmail("user@example.com"), true);
  assert.equal(isEmail("kgi"), false);
});
test("連結型矩陣能找出未填的項目與問項", () => {
  const items=[{value:"north",label:"北區"},{value:"south",label:"南區"}], prompts=[{id:"service",label:"服務"}];
  assert.deepEqual(linkedMatrixMissingCells({north:{service:"好"}},items,prompts),[{item:"南區",prompt:"服務"}]);
});
test("MaxDiff 產生多輪交叉題組且可計算相對效用", () => {
  const sets = maxDiffSets([{value:"a"},{value:"b"},{value:"c"},{value:"d"}], 3, 4);
  assert.equal(sets.length, 4);
  assert.ok(sets.every((set) => set.length === 3));
  assert.deepEqual(maxDiffUtilities([[{set:["a","b"],best:"a",worst:"b"}]], ["a","b"]), {a:1,b:-1});
});
test("總計題正確加總", () =>
  assert.equal(allocationTotal({ a: 40, b: 35, c: 25 }), 100));
test("庫存修改只計算新舊差額", () =>
  assert.deepEqual(inventoryDelta({ a: 2, b: 0 }, { a: 1, b: 1 }), {
    a: -1,
    b: 1,
  }));
test("熱點座標正規化並限制在圖片內", () =>
  assert.deepEqual(normalizePoint(250, -5, 500, 200), { x: 0.5, y: 0 }));
test("MaxDiff 不允許最佳與最差相同", () => {
  assert.equal(validMaxDiff({ best: "a", worst: "b" }), true);
  assert.equal(validMaxDiff({ best: "a", worst: "a" }), false);
});
