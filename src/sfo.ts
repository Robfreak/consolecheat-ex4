/**
 * PARAM.SFO reader.
 *
 * Layout documented at https://www.psdevwiki.com/ps4/PARAM.SFO
 * Magic "\0PSF", then a 20-byte header, an index table, a key table, and a data table.
 * Formats (little-endian uint16): 0x0004 utf-8 special, 0x0204 utf-8, 0x0404 uint32.
 *
 * PARAMS timestamps (same page): uint64 LE at 0x60 created, 0x68 last modified, Unix seconds.
 * SAVEDATA_LIST_PARAM is the save's user integer. It is used as a date only when that
 * integer is a Unix time in the PS4 era. Otherwise the date falls through to PARAMS,
 * then to the file's lastModified. Each source is labelled by the caller.
 */

import { accountDisplay } from "./mask.ts";

export const SFO_MAX_BYTES = 1024 * 1024;

export type SfoFormat = "utf8" | "utf8-special" | "int32" | "unknown";

export type SfoErrorCode = "not-sfo" | "truncated" | "bad-offset" | "encrypted" | "too-big";

export class SfoParseError extends Error {
  readonly code: SfoErrorCode;

  constructor(code: SfoErrorCode) {
    super(code);
    this.name = "SfoParseError";
    this.code = code;
  }
}

export type SfoEntry = {
  key: string;
  format: SfoFormat;
  formatCode: number;
  length: number;
  maxLength: number;
  text: string | null;
  hex: string;
  int32: number | null;
  bytes: Uint8Array;
};

export type SfoDocument = {
  version: number;
  entries: SfoEntry[];
};

const HEADER_SIZE = 20;
const INDEX_SIZE = 16;
const MAX_ENTRIES = 512;
const MAX_KEY = 256;

const MIN_UNIX = 1_384_473_600;
const MAX_UNIX = 4_102_444_800;

export type SaveDateSource = "savedata-list-param" | "params-modified" | "params-created" | "file-modified";

export type SaveDate = {
  source: SaveDateSource;
  ms: number;
};

function fail(code: SfoErrorCode): never {
  throw new SfoParseError(code);
}

export function toHex(bytes: Uint8Array): string {
  let hex = "";
  for (const byte of bytes) hex += byte.toString(16).padStart(2, "0");
  return hex.toUpperCase();
}

function looksEncrypted(bytes: Uint8Array): boolean {
  if (bytes.length < 32) return false;
  const n = Math.min(bytes.length, 256);
  const seen = new Uint8Array(256);
  let unique = 0;
  let printable = 0;
  for (let i = 0; i < n; i++) {
    const byte = bytes[i] ?? 0;
    if (seen[byte] === 0) {
      seen[byte] = 1;
      unique += 1;
    }
    if (byte === 9 || byte === 10 || byte === 13 || (byte >= 32 && byte < 127)) printable += 1;
  }
  return printable / n < 0.5 && unique / n > 0.4;
}

function classifyNonSfo(bytes: Uint8Array): SfoErrorCode {
  if (bytes.length >= 4) {
    const b0 = bytes[0];
    const b1 = bytes[1];
    const b2 = bytes[2];
    const b3 = bytes[3];
    const png = b0 === 0x89 && b1 === 0x50 && b2 === 0x4e && b3 === 0x47;
    const zip = b0 === 0x50 && b1 === 0x4b && (b2 === 0x03 || b2 === 0x05 || b2 === 0x07);
    const jpeg = b0 === 0xff && b1 === 0xd8 && b2 === 0xff;
    const gzip = b0 === 0x1f && b1 === 0x8b;
    if (png || zip || jpeg || gzip) return "not-sfo";
  }
  return looksEncrypted(bytes) ? "encrypted" : "not-sfo";
}

function decodeUtf8(bytes: Uint8Array): string | null {
  try {
    const text = new TextDecoder("utf-8", { fatal: true }).decode(bytes);
    for (let i = 0; i < text.length; i++) {
      const code = text.charCodeAt(i);
      if (code < 32 && code !== 9 && code !== 10 && code !== 13) return null;
    }
    return text;
  } catch {
    return null;
  }
}

function decodeCString(bytes: Uint8Array): string | null {
  const nul = bytes.indexOf(0);
  const end = nul >= 0 ? nul : bytes.length;
  return decodeUtf8(bytes.subarray(0, end));
}

function decodeSpecial(bytes: Uint8Array): string | null {
  let end = bytes.length;
  while (end > 0 && bytes[end - 1] === 0) end -= 1;
  for (let i = 0; i < end; i++) {
    if (bytes[i] === 0) return null;
  }
  if (end === 0) return "";
  return decodeUtf8(bytes.subarray(0, end));
}

export function parseSfo(input: Uint8Array): SfoDocument {
  if (input.byteLength > SFO_MAX_BYTES) fail("too-big");
  const bytes = new Uint8Array(input.byteLength);
  bytes.set(input);
  if (bytes.length < 4 || bytes[0] !== 0x00 || bytes[1] !== 0x50 || bytes[2] !== 0x53 || bytes[3] !== 0x46) {
    fail(classifyNonSfo(bytes));
  }
  if (bytes.length < HEADER_SIZE) fail("truncated");

  const view = new DataView(bytes.buffer);
  const version = view.getUint32(4, true);
  const keyOff = view.getUint32(8, true);
  const dataOff = view.getUint32(12, true);
  const count = view.getUint32(16, true);

  if (count > MAX_ENTRIES) fail("bad-offset");
  if (keyOff < HEADER_SIZE || dataOff < HEADER_SIZE) fail("bad-offset");

  const indexEnd = HEADER_SIZE + count * INDEX_SIZE;
  // A short file whose tables were cut off still has plausible offsets.
  // An offset that lands far past both the file and the index is not a truncation.
  const farPast = (offset: number) => offset > bytes.length && offset > Math.max(bytes.length * 2, indexEnd + 1024);
  if (farPast(keyOff) || farPast(dataOff)) fail("bad-offset");
  if (indexEnd > bytes.length || keyOff > bytes.length || dataOff > bytes.length) fail("truncated");
  if (indexEnd > keyOff || dataOff < keyOff) fail("bad-offset");

  const entries: SfoEntry[] = [];
  for (let i = 0; i < count; i++) {
    const at = HEADER_SIZE + i * INDEX_SIZE;
    const keyRel = view.getUint16(at, true);
    const formatCode = view.getUint16(at + 2, true);
    const length = view.getUint32(at + 4, true);
    const maxLength = view.getUint32(at + 8, true);
    const dataRel = view.getUint32(at + 12, true);

    if (length > SFO_MAX_BYTES || maxLength > SFO_MAX_BYTES) fail("bad-offset");
    if (maxLength < length) fail("bad-offset");

    const keyPos = keyOff + keyRel;
    if (keyPos > bytes.length || keyPos > dataOff) fail("bad-offset");
    const keyLimit = Math.min(dataOff, bytes.length, keyPos + MAX_KEY);
    let keyEnd = keyPos;
    while (keyEnd < keyLimit && bytes[keyEnd] !== 0) keyEnd += 1;
    if (keyEnd >= bytes.length) fail("truncated");
    if (bytes[keyEnd] !== 0 || keyEnd === keyPos) fail("bad-offset");

    let key: string;
    try {
      key = new TextDecoder("utf-8", { fatal: true }).decode(bytes.subarray(keyPos, keyEnd));
    } catch {
      fail("bad-offset");
    }

    if (dataRel > bytes.length) fail("bad-offset");
    const dataPos = dataOff + dataRel;
    if (dataPos > bytes.length) fail("bad-offset");
    if (length > bytes.length - dataPos) fail("truncated");

    const value = bytes.slice(dataPos, dataPos + length);
    let format: SfoFormat = "unknown";
    let text: string | null = null;
    let int32: number | null = null;
    if (formatCode === 0x0204) {
      format = "utf8";
      text = decodeCString(value);
    } else if (formatCode === 0x0004) {
      format = "utf8-special";
      text = decodeSpecial(value);
    } else if (formatCode === 0x0404) {
      format = "int32";
      if (length !== 4) fail("bad-offset");
      int32 = view.getUint32(dataPos, true);
      text = String(int32);
    }

    entries.push({
      key,
      format,
      formatCode,
      length,
      maxLength,
      text,
      hex: toHex(value),
      int32,
      bytes: value,
    });
  }

  return { version, entries };
}

export function findEntry(entries: readonly SfoEntry[], key: string): SfoEntry | null {
  return entries.find((entry) => entry.key === key) ?? null;
}

export function entryText(entries: readonly SfoEntry[], key: string): string | null {
  const entry = findEntry(entries, key);
  if (!entry) return null;
  if (key === "ACCOUNT_ID") return entry.hex || null;
  const text = entry.text?.trim() ?? "";
  return text.length ? text : null;
}

function plausibleUnix(value: number): boolean {
  return Number.isInteger(value) && value >= MIN_UNIX && value <= MAX_UNIX;
}

function unixFromBytes(bytes: Uint8Array): number | null {
  if (bytes.length >= 8) {
    const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
    const lo = view.getUint32(0, true);
    const hi = view.getUint32(4, true);
    if (hi === 0 && plausibleUnix(lo)) return lo;
    return null;
  }
  if (bytes.length >= 4) {
    const value = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength).getUint32(0, true);
    return plausibleUnix(value) ? value : null;
  }
  return null;
}

function unixFromEntry(entry: SfoEntry): number | null {
  if (entry.int32 !== null && plausibleUnix(entry.int32)) return entry.int32;
  const fromBytes = unixFromBytes(entry.bytes);
  if (fromBytes !== null) return fromBytes;
  if (entry.text && /^\d+$/.test(entry.text)) {
    const value = Number(entry.text);
    if (plausibleUnix(value)) return value;
  }
  return null;
}

function readU64(bytes: Uint8Array, offset: number): number | null {
  if (offset < 0 || offset + 8 > bytes.length) return null;
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  const lo = view.getUint32(offset, true);
  const hi = view.getUint32(offset + 4, true);
  if (hi !== 0) return null;
  return lo;
}

export function readSaveDate(entries: readonly SfoEntry[], fileModifiedMs: number | null): SaveDate | null {
  const list = findEntry(entries, "SAVEDATA_LIST_PARAM");
  if (list) {
    const unix = unixFromEntry(list);
    if (unix !== null) return { source: "savedata-list-param", ms: unix * 1000 };
  }

  const params = findEntry(entries, "PARAMS");
  if (params && params.bytes.length >= 0x70) {
    const modified = readU64(params.bytes, 0x68);
    if (modified !== null && plausibleUnix(modified)) return { source: "params-modified", ms: modified * 1000 };
    const created = readU64(params.bytes, 0x60);
    if (created !== null && plausibleUnix(created)) return { source: "params-created", ms: created * 1000 };
  }

  if (fileModifiedMs !== null && Number.isFinite(fileModifiedMs) && fileModifiedMs > 0) {
    return { source: "file-modified", ms: fileModifiedMs };
  }
  return null;
}

/** Text, decimal, or hex for the raw list. ACCOUNT_ID follows the reveal flag. */
export function rawValue(entry: SfoEntry, revealAccount: boolean): string {
  if (entry.key.toUpperCase() === "ACCOUNT_ID") return accountDisplay(entry.hex, revealAccount);
  if (entry.format === "int32" && entry.int32 !== null) {
    return `${entry.int32} (0x${entry.int32.toString(16).toUpperCase().padStart(8, "0")})`;
  }
  if (entry.text !== null && entry.text !== "") return entry.text;
  if (entry.hex) return entry.hex;
  return "";
}
