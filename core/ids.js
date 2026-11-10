// Topic の ID。kb と同じ形: YYYYMMDD-HHMMSS-xxxx(日時は日本時間、末尾は英小文字と数字の4文字)

export const ID_PATTERN = /^\d{8}-\d{6}-[a-z0-9]{4}$/;

export function isId(value) {
  return typeof value === "string" && ID_PATTERN.test(value);
}

const CHARS = "abcdefghijklmnopqrstuvwxyz0123456789";

/** 新しい ID を作る。now と random は、テストで差し替えられるように引数にしている。 */
export function newId(now = new Date(), random = Math.random) {
  const jst = new Date(now.getTime() + 9 * 60 * 60 * 1000);
  const pad = (n) => String(n).padStart(2, "0");
  const date = `${jst.getUTCFullYear()}${pad(jst.getUTCMonth() + 1)}${pad(jst.getUTCDate())}`;
  const time = `${pad(jst.getUTCHours())}${pad(jst.getUTCMinutes())}${pad(jst.getUTCSeconds())}`;
  let suffix = "";
  for (let i = 0; i < 4; i++) suffix += CHARS[Math.floor(random() * CHARS.length)];
  return `${date}-${time}-${suffix}`;
}
