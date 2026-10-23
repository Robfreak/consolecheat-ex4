import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";
import {
  badDataOffsetBytes,
  badMagicBytes,
  badOffsetBytes,
  encryptedBytes,
  fileDateBytes,
  longTitleBytes,
  overrunBytes,
  paramsDateBytes,
  specialDetailBytes,
  truncatedBytes,
  unknownKeyBytes,
  validSaveBytes,
} from "./fixtures.ts";
import { accountDisplay, maskAccountHex, revealAccountHex } from "./mask.ts";
import { buildSfo } from "./sfo-build.ts";
import { entryText, findEntry, parseSfo, rawValue, readSaveDate, SfoParseError } from "./sfo.ts";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");

function codeOf(bytes: Uint8Array): string {
  try {
    parseSfo(bytes);
  } catch (error) {
    assert.ok(error instanceof SfoParseError);
    return error.code;
  }
  assert.fail("expected the parser to reject the file");
}

test("a synthetic save exposes the documented fields and prefers PARAMS 0x68", () => {
  const doc = parseSfo(validSaveBytes());
  assert.equal(doc.version, 0x00000101);
  assert.equal(entryText(doc.entries, "TITLE"), "Synth Rally");
  assert.equal(entryText(doc.entries, "TITLE_ID"), "CUSA00001");
  assert.equal(entryText(doc.entries, "SUBTITLE"), "Kapitel 1");
  assert.equal(entryText(doc.entries, "DETAIL"), "Ein synthetischer Spielstand, nur für den Test.");
  assert.equal(entryText(doc.entries, "SAVEDATA_DIRECTORY"), "DATA00");
  assert.equal(entryText(doc.entries, "ACCOUNT_ID"), "7766554433221100");
  const account = findEntry(doc.entries, "ACCOUNT_ID");
  assert.equal(account?.hex, "0011223344556677");
  assert.equal(findEntry(doc.entries, "MYSTERY_FLAG")?.text, "synth-only");
  assert.equal(findEntry(doc.entries, "CATEGORY")?.format, "utf8");
  assert.equal(account?.format, "utf8-special");
  assert.equal(findEntry(doc.entries, "SAVEDATA_LIST_PARAM")?.format, "int32");
  assert.equal(rawValue(findEntry(doc.entries, "SAVEDATA_BLOCKS")!, false), "64");

  const date = readSaveDate(doc.entries, 1_710_000_000_000);
  assert.deepEqual(date, { source: "params-modified", ms: 1_650_000_000_000 });
});

test("unknown keys stay in the entry list with their format", () => {
  const doc = parseSfo(unknownKeyBytes());
  const hello = findEntry(doc.entries, "HELLO_FIELD");
  const odd = findEntry(doc.entries, "ODD_NUMBER");
  assert.ok(hello);
  assert.equal(hello.format, "utf8");
  assert.equal(hello.text, "unbekannt");
  assert.ok(odd);
  assert.equal(odd.format, "int32");
  assert.equal(odd.int32, 7);
  assert.equal(rawValue(odd, false), "7 (0x00000007)");
});

test("a user param that is not a timestamp falls through to PARAMS, then to the file date", () => {
  const fromParams = readSaveDate(parseSfo(paramsDateBytes()).entries, 1_710_000_000_000);
  assert.deepEqual(fromParams, { source: "params-modified", ms: 1_650_000_000_000 });

  const createdOnly = parseSfo(paramsDateBytes()).entries.map((entry) => {
    if (entry.key !== "PARAMS") return entry;
    const bytes = entry.bytes.slice();
    bytes.fill(0, 0x68, 0x70);
    return { ...entry, bytes };
  });
  assert.deepEqual(readSaveDate(createdOnly, null), { source: "params-created", ms: 1_600_000_000_000 });

  const fromFile = readSaveDate(parseSfo(fileDateBytes()).entries, 1_710_000_000_000);
  assert.deepEqual(fromFile, { source: "file-modified", ms: 1_710_000_000_000 });
  assert.equal(readSaveDate(parseSfo(fileDateBytes()).entries, null), null);
});

test("utf-8 special text decodes and an 8-byte list param can carry the date", () => {
  const doc = parseSfo(specialDetailBytes());
  assert.equal(entryText(doc.entries, "DETAIL"), "Spezialtext");
  assert.equal(findEntry(doc.entries, "DETAIL")?.format, "utf8-special");
  const date = readSaveDate(doc.entries, null);
  assert.equal(date?.source, "savedata-list-param");
  assert.equal(date?.ms, 1_700_000_000_000);
});

test("truncated, bad magic, bad offsets, and random bytes each get their own error", () => {
  assert.equal(codeOf(truncatedBytes()), "truncated");
  assert.equal(codeOf(overrunBytes()), "truncated");
  assert.equal(codeOf(badMagicBytes()), "not-sfo");
  assert.equal(codeOf(new Uint8Array()), "not-sfo");
  assert.equal(codeOf(new Uint8Array([0x00, 0x50, 0x53, 0x46])), "truncated");
  assert.equal(codeOf(badOffsetBytes()), "bad-offset");
  assert.equal(codeOf(badDataOffsetBytes()), "bad-offset");
  assert.equal(codeOf(encryptedBytes()), "encrypted");
  const png = new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 1, 2, 3, 4]);
  assert.equal(codeOf(png), "not-sfo");
});

test("too many entries and an invalid field type each get their own error", () => {
  const bytes = new Uint8Array(32);
  bytes.set([0x00, 0x50, 0x53, 0x46]);
  const view = new DataView(bytes.buffer);
  view.setUint32(4, 0x00000101, true);
  view.setUint32(8, 20, true);
  view.setUint32(12, 20, true);
  view.setUint32(16, 0xffffffff, true);
  assert.equal(codeOf(bytes), "too-many");

  const badFormat = buildSfo([{ key: "TITLE", format: "utf8", value: "Hi" }]);
  const patched = badFormat.slice();
  new DataView(patched.buffer).setUint16(22, 0x0800, true);
  assert.equal(codeOf(patched), "bad-format");
});

test("an int32 field whose length is not 4 is an invalid field type", () => {
  const bytes = buildSfo([{ key: "ATTRIBUTE", format: "int32", value: 1 }]);
  const patched = bytes.slice();
  new DataView(patched.buffer).setUint32(24, 2, true);
  assert.equal(codeOf(patched), "bad-format");
});

test("the date order is PARAMS 0x68, then 0x60, then the list param, then the file", () => {
  const valid = parseSfo(validSaveBytes()).entries;
  assert.deepEqual(readSaveDate(valid, 1_710_000_000_000), {
    source: "params-modified",
    ms: 1_650_000_000_000,
  });

  const createdOnly = valid.map((entry) => {
    if (entry.key !== "PARAMS") return entry;
    const bytes = entry.bytes.slice();
    bytes.fill(0, 0x68, 0x70);
    return { ...entry, bytes };
  });
  assert.deepEqual(readSaveDate(createdOnly, 1_710_000_000_000), {
    source: "params-created",
    ms: 1_600_000_000_000,
  });

  const withoutParams = valid.filter((entry) => entry.key !== "PARAMS");
  assert.deepEqual(readSaveDate(withoutParams, 1_710_000_000_000), {
    source: "savedata-list-param",
    ms: 1_700_000_000_000,
  });

  const fromFile = parseSfo(fileDateBytes()).entries;
  assert.deepEqual(readSaveDate(fromFile, 1_710_000_000_000), {
    source: "file-modified",
    ms: 1_710_000_000_000,
  });
  assert.equal(readSaveDate(fromFile, null), null);
});

test("numeric fields are decimal and other binary fields are hex", () => {
  const blocks = findEntry(parseSfo(validSaveBytes()).entries, "SAVEDATA_BLOCKS");
  assert.ok(blocks);
  assert.equal(rawValue(blocks, false), "64");
  assert.equal(rawValue(blocks, false).includes("@"), false);

  const doc = parseSfo(
    buildSfo([
      { key: "NOISE", format: "utf8-special", value: new Uint8Array([0x40, 0x00, 0x00, 0x00]) },
      { key: "DETAIL", format: "utf8-special", value: new TextEncoder().encode("Spezialtext\0") },
      { key: "PARENTAL_LEVEL", format: "utf8-special", value: new Uint8Array([0x03, 0x00, 0x00, 0x00]) },
      { key: "ATTRIBUTE", format: "int32", value: 1 },
    ]),
  );
  const noise = findEntry(doc.entries, "NOISE");
  assert.ok(noise);
  assert.equal(rawValue(noise, false), "40000000");
  assert.equal(rawValue(noise, false).includes("@"), false);
  assert.equal(rawValue(findEntry(doc.entries, "DETAIL")!, false), "Spezialtext");
  assert.equal(rawValue(findEntry(doc.entries, "PARENTAL_LEVEL")!, false), "3");
  assert.equal(rawValue(findEntry(doc.entries, "ATTRIBUTE")!, false), "1 (0x00000001)");
});

test("a 128-character title without spaces stays a single field", () => {
  const doc = parseSfo(longTitleBytes());
  const title = entryText(doc.entries, "TITLE");
  assert.equal(title?.length, 128);
  assert.equal(title, "A".repeat(128));
  assert.equal(title?.includes(" "), false);
});

test("account ids stay masked to the last four hex digits until revealed", () => {
  const hex = "7766554433221100";
  const masked = maskAccountHex(hex);
  assert.equal(masked, "•••• •••• •••• 1100");
  assert.equal(masked.replace(/[^0-9A-F]/g, ""), "1100");
  assert.equal(masked.includes("776655443322"), false);
  assert.equal(revealAccountHex(hex.toLowerCase()), "7766 5544 3322 1100");
  assert.equal(accountDisplay(hex, false), masked);
  assert.equal(accountDisplay(hex, true), "7766 5544 3322 1100");
  assert.equal(maskAccountHex("abcd"), "ABCD");
  assert.equal(maskAccountHex(""), "");

  const account = findEntry(parseSfo(validSaveBytes()).entries, "ACCOUNT_ID");
  assert.ok(account);
  const hidden = rawValue(account, false);
  const shown = rawValue(account, true);
  assert.equal(hidden, "•••• •••• •••• 1100");
  assert.equal(hidden.includes("7766"), false);
  assert.equal(hidden.includes("0011"), false);
  assert.equal(shown, "7766 5544 3322 1100");
  assert.equal(shown.replace(/ /g, ""), "7766554433221100");
});

test("the committed sample files match the generator", () => {
  const pairs = [
    ["samples/valid-param.sfo", validSaveBytes()],
    ["samples/unknown-key.sfo", unknownKeyBytes()],
    ["samples/truncated.sfo", truncatedBytes()],
    ["samples/bad-magic.sfo", badMagicBytes()],
    ["samples/bad-offset.sfo", badOffsetBytes()],
    ["samples/encrypted.sfo", encryptedBytes()],
    ["samples/params-date.sfo", paramsDateBytes()],
    ["samples/file-date.sfo", fileDateBytes()],
    ["samples/long-title.sfo", longTitleBytes()],
    ["samples/sce_sys/param.sfo", validSaveBytes()],
  ] as const;
  for (const [path, bytes] of pairs) {
    const onDisk = new Uint8Array(readFileSync(join(root, path)));
    assert.deepEqual(onDisk, bytes, path);
  }
});
