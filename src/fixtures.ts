import { buildSfo } from "./sfo-build.ts";

const encoder = new TextEncoder();

function u64(value: number): Uint8Array {
  const bytes = new Uint8Array(8);
  const view = new DataView(bytes.buffer);
  view.setUint32(0, value >>> 0, true);
  view.setUint32(4, Math.floor(value / 0x100000000), true);
  return bytes;
}

function paramsBlob(created: number, modified: number): Uint8Array {
  const bytes = new Uint8Array(0x400);
  const view = new DataView(bytes.buffer);
  view.setUint32(0x60, created, true);
  view.setUint32(0x68, modified, true);
  return bytes;
}

const ACCOUNT = new Uint8Array([0x00, 0x11, 0x22, 0x33, 0x44, 0x55, 0x66, 0x77]);

/** A full synthetic save SFO. No real game data. */
export function validSaveBytes(): Uint8Array {
  return buildSfo([
    { key: "ACCOUNT_ID", format: "utf8-special", value: ACCOUNT },
    { key: "CATEGORY", format: "utf8", value: "sd" },
    { key: "DETAIL", format: "utf8", value: "Ein synthetischer Spielstand, nur für den Test." },
    { key: "FORMAT", format: "utf8", value: "obs" },
    { key: "PARAMS", format: "utf8-special", value: paramsBlob(1_600_000_000, 1_650_000_000) },
    { key: "SAVEDATA_BLOCKS", format: "utf8-special", value: u64(64) },
    { key: "SAVEDATA_DIRECTORY", format: "utf8", value: "DATA00" },
    { key: "SAVEDATA_LIST_PARAM", format: "int32", value: 1_700_000_000 },
    { key: "SUBTITLE", format: "utf8", value: "Kapitel 1" },
    { key: "TITLE", format: "utf8", value: "Synth Rally" },
    { key: "TITLE_ID", format: "utf8", value: "CUSA00001" },
    { key: "MYSTERY_FLAG", format: "utf8", value: "synth-only" },
  ]);
}

export function unknownKeyBytes(): Uint8Array {
  return buildSfo([
    { key: "TITLE", format: "utf8", value: "Nur ein Test" },
    { key: "HELLO_FIELD", format: "utf8", value: "unbekannt" },
    { key: "ODD_NUMBER", format: "int32", value: 7 },
  ]);
}

/** User param is 2, so the date has to come from PARAMS offset 0x68. */
export function paramsDateBytes(): Uint8Array {
  return buildSfo([
    { key: "TITLE", format: "utf8", value: "Params Datum" },
    { key: "TITLE_ID", format: "utf8", value: "CUSA00002" },
    { key: "SAVEDATA_LIST_PARAM", format: "int32", value: 2 },
    { key: "PARAMS", format: "utf8-special", value: paramsBlob(1_600_000_000, 1_650_000_000) },
  ]);
}

/** Nothing inside the SFO is a date. The UI falls back to lastModified. */
export function fileDateBytes(): Uint8Array {
  return buildSfo([
    { key: "TITLE", format: "utf8", value: "Nur Dateidatum" },
    { key: "TITLE_ID", format: "utf8", value: "CUSA00003" },
    { key: "SAVEDATA_LIST_PARAM", format: "int32", value: 3 },
  ]);
}

export function truncatedBytes(): Uint8Array {
  return validSaveBytes().slice(0, 28);
}

export function overrunBytes(): Uint8Array {
  const bytes = buildSfo([{ key: "TITLE", format: "utf8", value: "Hi" }]);
  const copy = bytes.slice();
  const view = new DataView(copy.buffer);
  const length = view.getUint32(24, true);
  view.setUint32(24, length + 50, true);
  view.setUint32(28, length + 50, true);
  return copy;
}

export function badOffsetBytes(): Uint8Array {
  const out = new Uint8Array(64);
  const view = new DataView(out.buffer);
  out[0] = 0x00;
  out[1] = 0x50;
  out[2] = 0x53;
  out[3] = 0x46;
  view.setUint32(4, 0x00000101, true);
  view.setUint32(8, 0x00fff000, true);
  view.setUint32(12, 0x00fff100, true);
  view.setUint32(16, 1, true);
  return out;
}

export function badDataOffsetBytes(): Uint8Array {
  const bytes = buildSfo([{ key: "TITLE", format: "utf8", value: "Hi" }]);
  const copy = bytes.slice();
  new DataView(copy.buffer).setUint32(32, 0x00fff000, true);
  return copy;
}

export function badMagicBytes(): Uint8Array {
  return encoder.encode("this is not a param.sfo file, just text\n");
}

export function encryptedBytes(): Uint8Array {
  const out = new Uint8Array(64);
  let x = 0xc0ffee;
  for (let i = 0; i < out.length; i++) {
    x ^= x << 13;
    x ^= x >>> 17;
    x ^= x << 5;
    x >>>= 0;
    out[i] = x & 0xff;
  }
  if (out[0] === 0x00 && out[1] === 0x50 && out[2] === 0x53 && out[3] === 0x46) out[0] = 0xa5;
  return out;
}

export function specialDetailBytes(): Uint8Array {
  const account = new Uint8Array(8);
  new DataView(account.buffer).setUint32(0, 1_700_000_000, true);
  return buildSfo([
    { key: "DETAIL", format: "utf8-special", value: encoder.encode("Spezialtext\0") },
    { key: "SAVEDATA_LIST_PARAM", format: "utf8-special", value: account },
    { key: "TITLE_ID", format: "utf8", value: "CUSA00004" },
  ]);
}
