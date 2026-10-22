import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { deflateSync } from "node:zlib";
import { fileURLToPath } from "node:url";
import {
  badMagicBytes,
  badOffsetBytes,
  encryptedBytes,
  fileDateBytes,
  paramsDateBytes,
  truncatedBytes,
  unknownKeyBytes,
  validSaveBytes,
} from "../src/fixtures.ts";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");

function crc32(data: Buffer): number {
  let crc = ~0;
  for (const byte of data) {
    crc ^= byte;
    for (let bit = 0; bit < 8; bit++) crc = (crc >>> 1) ^ (0xedb88320 & -(crc & 1));
  }
  return ~crc >>> 0;
}

function chunk(type: string, data: Buffer): Buffer {
  const length = Buffer.alloc(4);
  length.writeUInt32BE(data.length);
  const body = Buffer.concat([Buffer.from(type, "ascii"), data]);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(body));
  return Buffer.concat([length, body, crc]);
}

/** A small synthetic icon. Not from a game. */
function iconPng(): Buffer {
  const width = 96;
  const height = 54;
  const raw = Buffer.alloc(height * (1 + width * 4));
  for (let y = 0; y < height; y++) {
    const row = y * (1 + width * 4);
    raw[row] = 0;
    for (let x = 0; x < width; x++) {
      const dx = x - 28;
      const dy = y - 27;
      const inside = dx * dx + dy * dy < 16 * 16;
      const i = row + 1 + x * 4;
      raw[i] = inside ? 0x7e : 0x00;
      raw[i + 1] = inside ? 0xb6 : 0x70;
      raw[i + 2] = inside ? 0xff : 0xd1;
      raw[i + 3] = 0xff;
    }
  }
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8;
  ihdr[9] = 6;
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk("IHDR", ihdr),
    chunk("IDAT", deflateSync(raw)),
    chunk("IEND", Buffer.alloc(0)),
  ]);
}

const files: Record<string, Uint8Array | Buffer> = {
  "samples/valid-param.sfo": validSaveBytes(),
  "samples/unknown-key.sfo": unknownKeyBytes(),
  "samples/truncated.sfo": truncatedBytes(),
  "samples/bad-magic.sfo": badMagicBytes(),
  "samples/bad-offset.sfo": badOffsetBytes(),
  "samples/encrypted.sfo": encryptedBytes(),
  "samples/params-date.sfo": paramsDateBytes(),
  "samples/file-date.sfo": fileDateBytes(),
  "samples/sce_sys/param.sfo": validSaveBytes(),
  "samples/sce_sys/icon0.png": iconPng(),
};

for (const [path, bytes] of Object.entries(files)) {
  const target = join(root, path);
  mkdirSync(dirname(target), { recursive: true });
  writeFileSync(target, bytes);
  console.log(path);
}
