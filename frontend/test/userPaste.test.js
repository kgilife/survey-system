import test from "node:test";
import assert from "node:assert/strict";
import { parseUserPaste } from "../src/userPaste.js";

const fields = [{ field_key: "name", field_label: "姓名" }];

test("使用者匯入會略過系統代碼表頭", () => {
  const result = parseUserPaste("account\tpassword\tname\nA001\t0101\t王小明", fields);
  assert.deepEqual(result.users, [{ account: "A001", password: "0101", profile: { name: "王小明" } }]);
});

test("使用者匯入會辨識中文顯示名稱表頭", () => {
  const result = parseUserPaste("帳號\t密碼\t姓名\nA001\t0101\t王小明", fields);
  assert.deepEqual(result.users, [{ account: "A001", password: "0101", profile: { name: "王小明" } }]);
});

test("使用者匯入會辨識自訂的帳號及密碼顯示名稱", () => {
  const result = parseUserPaste("業務員代碼\t生日後四碼\t姓名\nA001\t0101\t王小明", fields, {
    account: "業務員代碼",
    password: "生日後四碼",
  });
  assert.equal(result.users[0].account, "A001");
});

test("沒有表頭時仍會匯入第一筆資料", () => {
  const result = parseUserPaste("A001\t0101\t王小明", fields);
  assert.equal(result.users[0].account, "A001");
});

test("使用者匯入包含額外多欄位時會完整保留各欄位資訊", () => {
  const result = parseUserPaste("帳號\t密碼\t姓名\t部門\t職稱\nA001\t0101\t王小明\t行銷部\t專員", []);
  assert.deepEqual(result.users, [{
    account: "A001",
    password: "0101",
    profile: {
      姓名: "王小明",
      部門: "行銷部",
      職稱: "專員"
    }
  }]);
});
