/** Group hex in fours when the length allows it. Account ids are 16 digits. */
function groupHex(hex: string): string {
  if (hex.length % 4 !== 0) return hex;
  return hex.replace(/(.{4})(?=.)/g, "$1 ");
}

export function normalizeHex(hex: string): string {
  return hex.replace(/[^0-9a-fA-F]/g, "").toUpperCase();
}

/**
 * Hide an account id so a screenshot only keeps the last four hex digits.
 * Shorter values have nothing further to hide and stay visible.
 */
export function maskAccountHex(hex: string): string {
  const clean = normalizeHex(hex);
  if (clean.length <= 4) return clean;
  return groupHex("•".repeat(clean.length - 4) + clean.slice(-4));
}

export function revealAccountHex(hex: string): string {
  return groupHex(normalizeHex(hex));
}

export function accountDisplay(hex: string, reveal: boolean): string {
  return reveal ? revealAccountHex(hex) : maskAccountHex(hex);
}

/**
 * ACCOUNT_ID is a little-endian uint64 (PS4 Developer wiki, PARAM.SFO).
 * The printed form is that integer as 16 hex digits, zero-padded.
 * File bytes 00 11 22 33 44 55 66 77 are 7766554433221100.
 */
export function accountIdFromBytes(bytes: Uint8Array): string {
  let hex = "";
  for (let i = 7; i >= 0; i--) {
    const byte = bytes[i] ?? 0;
    hex += byte.toString(16).padStart(2, "0");
  }
  return hex.toUpperCase();
}
