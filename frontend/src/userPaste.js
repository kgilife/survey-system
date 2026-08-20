const normalizeHeader = (value) =>
  String(value || "").trim().toLowerCase().replace(/[\s_-]+/g, "");

export function parseUserPaste(text, fields = [], systemLabels = {}) {
  const rows = String(text || "")
    .trim()
    .split(/\r?\n/)
    .filter((row) => row.trim())
    .map((row) => row.split("\t"));
  if (!rows.length) return { users: [] };

  const headerKeys = new Map();
  const addAliases = (key, aliases) =>
    aliases.filter(Boolean).forEach((alias) => headerKeys.set(normalizeHeader(alias), key));
  addAliases("account", ["account", "帳號", "账号", "使用者 ID", "使用者ID", "user id", "userid", systemLabels.account]);
  addAliases("password", ["password", "密碼", "密码", "passcode", systemLabels.password]);
  fields.forEach((field) =>
    addAliases(field.field_key, [field.field_key, field.field_label]),
  );

  const first = rows[0].map((cell) => cell.trim());
  const resolvedFirst = first.map((cell) => headerKeys.get(normalizeHeader(cell)));
  // Excel 範本的第一欄固定是帳號；辨識欄位代碼及畫面顯示名稱，避免把表頭當使用者。
  const hasHeader = resolvedFirst[0] === "account";
  const defaultHeaders = ["account", "password", ...fields.map((field) => field.field_key)];
  const headers = hasHeader
    ? first.map((cell, index) => resolvedFirst[index] || cell || defaultHeaders[index])
    : defaultHeaders;
  const body = hasHeader ? rows.slice(1) : rows;

  return {
    users: body
      .map((cols) => {
        const user = { profile: {} };
        headers.forEach((header, index) => {
          const value = (cols[index] || "").trim();
          if (header === "account" || header === "password") user[header] = value;
          else if (header) user.profile[header] = value;
        });
        return user;
      })
      .filter((user) => user.account),
  };
}
