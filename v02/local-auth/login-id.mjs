// AccountID is also the immutable login identifier. The existing 20-character cap remains.
export const LOGIN_ID_PATTERN='[A-Za-z][A-Za-z0-9_-]{3,19}';
export const normalizeAccountId=value=>typeof value==='string'?value.toLowerCase():'';
export function isLoginId(value){return typeof value==='string'&&/^[A-Za-z][A-Za-z0-9_-]{3,19}$/.test(value);}
