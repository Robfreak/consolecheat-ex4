export type BuildFormat = "utf8" | "utf8-special" | "int32";

export type BuildEntry = {
  key: string;
  format: BuildFormat;
  value: string | number | Uint8Array;
  maxLength?: number;
};

const FORMAT_CODE: Record<BuildFormat, number> = {
  utf8: 0x0204,
  "utf8-special": 0x0004,
  int32: 0x0404,
};

function concat(parts: Uint8Array[]): Uint8Array {
  const size = parts.reduce((sum, part) => sum + part.length, 0);
  const out = new Uint8Array(size);
  let offset = 0;
  for (const part of parts) {
    out.set(part, offset);
    offset += part.length;
  }
  return out;
}

function align4(value: number): number {
  return (value + 3) & ~3;
}

type Prepared = {
  key: string;
  formatCode: number;
  length: number;
  maxLength: number;
  stored: Uint8Array;
};

function prepare(entry: BuildEntry): Prepared {
  const formatCode = FORMAT_CODE[entry.format];
  if (entry.format === "int32") {
    if (typeof entry.value !== "number" || !Number.isInteger(entry.value) || entry.value < 0 || entry.value > 0xffffffff) {
      throw new Error(`int32 value for ${entry.key}`);
    }
    const stored = new Uint8Array(4);
    new DataView(stored.buffer).setUint32(0, entry.value, true);
    return { key: entry.key, formatCode, length: 4, maxLength: 4, stored };
  }

  let payload: Uint8Array;
  if (entry.format === "utf8") {
    if (typeof entry.value !== "string") throw new Error(`utf8 value for ${entry.key}`);
    const body = new TextEncoder().encode(entry.value);
    payload = concat([body, new Uint8Array([0])]);
  } else {
    if (typeof entry.value === "string") payload = new TextEncoder().encode(entry.value);
    else if (entry.value instanceof Uint8Array) payload = entry.value;
    else throw new Error(`binary value for ${entry.key}`);
  }

  let maxLength = entry.maxLength ?? align4(Math.max(payload.length, 4));
  if (maxLength < payload.length) maxLength = payload.length;
  if (entry.format === "utf8") maxLength = align4(maxLength);
  const stored = new Uint8Array(maxLength);
  stored.set(payload);
  return { key: entry.key, formatCode, length: payload.length, maxLength, stored };
}

/** Build a synthetic PARAM.SFO. Keys are stored in alphabetical order, as on a console. */
export function buildSfo(entries: BuildEntry[], version = 0x00000101): Uint8Array {
  const prepared = entries.map(prepare).sort((a, b) => (a.key < b.key ? -1 : a.key > b.key ? 1 : 0));
  const keyOffsets: number[] = [];
  const keyParts: Uint8Array[] = [];
  let keySize = 0;
  for (const entry of prepared) {
    keyOffsets.push(keySize);
    const bytes = new TextEncoder().encode(`${entry.key}\0`);
    keyParts.push(bytes);
    keySize += bytes.length;
  }
  const keyPad = (4 - (keySize % 4)) % 4;
  if (keyPad) keyParts.push(new Uint8Array(keyPad));
  const keyBlob = concat(keyParts);

  const keyTableOffset = 20 + prepared.length * 16;
  const dataTableOffset = keyTableOffset + keyBlob.length;
  const dataParts: Uint8Array[] = [];
  const dataOffsets: number[] = [];
  let cursor = 0;
  for (const entry of prepared) {
    const pad = (4 - (cursor % 4)) % 4;
    if (pad) {
      dataParts.push(new Uint8Array(pad));
      cursor += pad;
    }
    dataOffsets.push(cursor);
    dataParts.push(entry.stored);
    cursor += entry.stored.length;
  }
  const dataBlob = concat(dataParts);
  const out = new Uint8Array(dataTableOffset + dataBlob.length);
  const view = new DataView(out.buffer);
  out[0] = 0x00;
  out[1] = 0x50;
  out[2] = 0x53;
  out[3] = 0x46;
  view.setUint32(4, version, true);
  view.setUint32(8, keyTableOffset, true);
  view.setUint32(12, dataTableOffset, true);
  view.setUint32(16, prepared.length, true);
  prepared.forEach((entry, index) => {
    const at = 20 + index * 16;
    view.setUint16(at, keyOffsets[index] ?? 0, true);
    view.setUint16(at + 2, entry.formatCode, true);
    view.setUint32(at + 4, entry.length, true);
    view.setUint32(at + 8, entry.maxLength, true);
    view.setUint32(at + 12, dataOffsets[index] ?? 0, true);
  });
  out.set(keyBlob, keyTableOffset);
  out.set(dataBlob, dataTableOffset);
  return out;
}
