import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";
import vm from "node:vm";

const source = fs.readFileSync(new URL("../../backend/Database.gs", import.meta.url), "utf8");

function loadDatabaseHelpers() {
  const context = {};
  vm.createContext(context);
  vm.runInContext(source, context);
  return context;
}

test("rows_ normalizes a legacy numeric account to text", () => {
  const { rows_ } = loadDatabaseHelpers();
  const sheet = {
    getDataRange: () => ({
      getValues: () => [
        ["account", "status", "revision_count", "active"],
        [10026225, "active", 2, true],
      ],
    }),
  };

  assert.deepEqual(
    JSON.parse(JSON.stringify(rows_(sheet))),
    [{ account: "10026225", status: "active", revision_count: 2, active: true }],
  );
});

test("rows_ preserves leading zeroes already stored as text", () => {
  const { rows_ } = loadDatabaseHelpers();
  const sheet = {
    getDataRange: () => ({ getValues: () => [["account"], ["00123"]] }),
  };

  assert.equal(rows_(sheet)[0].account, "00123");
});
