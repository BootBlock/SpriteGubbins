// Generates the Sprite Gubbins app-icon set from a single source-of-truth pixel glyph.
//
//   node scripts/generate-icons.mjs
//
// The icon is authored the way the app's subject matter is: as a 16x16 sprite on a fixed
// palette, scaled up by whole multiples with nearest-neighbour sampling so every output size
// is the *same* artwork with bigger pixels — never a resampled, softened copy. That constraint
// is also why this script rasterises the PNGs itself (a chunk writer over `node:zlib`) instead
// of pulling in an image library or a headless browser: an encoder that only has to emit
// 8-bit RGBA is ~60 lines, adds no dependency to a public repo, and cannot anti-alias the
// pixel edges the glyph exists to show.
//
// Outputs into public/: favicon.ico (16/32/48), icon-192.png, icon-512.png.

import { writeFile, mkdir } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { resolve } from 'node:path';
import { deflateSync } from 'node:zlib';

const OUT_DIR = fileURLToPath(new URL('../public/', import.meta.url));

/** Glyph resolution. Every emitted size must be a whole multiple of this. */
const GRID = 16;

/**
 * The mascot: a chunky little construct with an antenna, lit eyes and gold feet. Colours are
 * the design tokens from `src/index.css` — foundry-900 ground, foundry-700/600 body, neon
 * eyes, gold feet — so the icon and the app cannot drift apart.
 */
const PALETTE = {
  '.': [0x06, 0x09, 0x11, 0xff], // foundry-900 — the ground, opaque
  k: [0x02, 0x04, 0x08, 0xff], // outline, a shade below the ground
  b: [0x1e, 0x29, 0x3b, 0xff], // foundry-700 — body
  h: [0x33, 0x41, 0x55, 0xff], // foundry-600 — top-of-head highlight
  n: [0x22, 0xd3, 0xee, 0xff], // neon — antenna tip and eyes
  g: [0xf5, 0x9e, 0x0b, 0xff], // gold — feet
};

// prettier-ignore
const GLYPH = [
  '................',
  '.......kk.......',
  '......knnk......',
  '.......kk.......',
  '....kkkkkkkk....',
  '...khhhhhhhhk...',
  '..kbbbbbbbbbbk..',
  '..kbnnbbbbnnbk..',
  '..kbnnbbbbnnbk..',
  '..kbbbbbbbbbbk..',
  '..kbbbbbbbbbbk..',
  '..kbbbkkkkbbbk..',
  '..kbbbbbbbbbbk..',
  '..kkbbbbbbbbkk..',
  '...kkgg..ggkk...',
  '................',
];

const CRC_TABLE = (() => {
  const table = new Uint32Array(256);
  for (let n = 0; n < 256; n += 1) {
    let c = n;
    for (let k = 0; k < 8; k += 1) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    table[n] = c >>> 0;
  }
  return table;
})();

function crc32(buf) {
  let c = 0xffffffff;
  for (const byte of buf) c = CRC_TABLE[(c ^ byte) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}

/** A PNG chunk: big-endian length, 4-char type, payload, CRC32 over type+payload. */
function chunk(type, data) {
  const length = Buffer.alloc(4);
  length.writeUInt32BE(data.length, 0);
  const body = Buffer.concat([Buffer.from(type, 'latin1'), data]);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(body), 0);
  return Buffer.concat([length, body, crc]);
}

/** Encode a square 8-bit RGBA buffer as a PNG. Filter type 0 ("none") on every scanline —
 *  the artwork is flat colour, so the adaptive filters would only cost CPU. */
function encodePng(rgba, size) {
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(size, 0);
  ihdr.writeUInt32BE(size, 4);
  ihdr[8] = 8; // bit depth
  ihdr[9] = 6; // colour type: truecolour with alpha
  // Bytes 10-12 (compression, filter, interlace) are all 0, as allocated.

  const stride = size * 4;
  const raw = Buffer.alloc((stride + 1) * size);
  for (let y = 0; y < size; y += 1) {
    const rowStart = y * (stride + 1);
    raw[rowStart] = 0; // filter: none
    Buffer.from(rgba.subarray(y * stride, (y + 1) * stride)).copy(raw, rowStart + 1);
  }

  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk('IHDR', ihdr),
    chunk('IDAT', deflateSync(raw, { level: 9 })),
    chunk('IEND', Buffer.alloc(0)),
  ]);
}

/** Scale the glyph up to `size` by nearest-neighbour. `size` must divide evenly by GRID. */
function rasterise(size) {
  if (size % GRID !== 0) throw new Error(`${size} is not a whole multiple of the ${GRID}px glyph grid`);
  const scale = size / GRID;
  const rgba = new Uint8Array(size * size * 4);
  for (let y = 0; y < size; y += 1) {
    const row = GLYPH[(y / scale) | 0];
    for (let x = 0; x < size; x += 1) {
      const key = row[(x / scale) | 0];
      const colour = PALETTE[key];
      if (!colour) throw new Error(`Glyph uses '${key}', which has no palette entry`);
      rgba.set(colour, (y * size + x) * 4);
    }
  }
  return rgba;
}

/**
 * Wrap PNGs in an ICO container. Every entry is stored PNG-compressed rather than as a BMP
 * DIB — the format has allowed that since Windows Vista, and every browser in the app's
 * baseline reads it, so there is no reason to hand-roll the legacy bitmap-plus-AND-mask form.
 */
function encodeIco(images) {
  const header = Buffer.alloc(6);
  header.writeUInt16LE(0, 0); // reserved
  header.writeUInt16LE(1, 2); // type: icon
  header.writeUInt16LE(images.length, 4);

  let offset = header.length + 16 * images.length;
  const entries = images.map(({ size, png }) => {
    const entry = Buffer.alloc(16);
    // A dimension of 256 is encoded as 0; nothing here is that large, but the rule is the format's.
    entry[0] = size >= 256 ? 0 : size;
    entry[1] = size >= 256 ? 0 : size;
    entry.writeUInt16LE(1, 4); // colour planes
    entry.writeUInt16LE(32, 6); // bits per pixel
    entry.writeUInt32LE(png.length, 8);
    entry.writeUInt32LE(offset, 12);
    offset += png.length;
    return entry;
  });

  return Buffer.concat([header, ...entries, ...images.map(({ png }) => png)]);
}

async function main() {
  await mkdir(OUT_DIR, { recursive: true });

  for (const size of [192, 512]) {
    const png = encodePng(rasterise(size), size);
    await writeFile(resolve(OUT_DIR, `icon-${size}.png`), png);
    console.log(`  wrote icon-${size}.png (${size}x${size}, ${png.length} bytes)`);
  }

  const ico = encodeIco([16, 32, 48].map((size) => ({ size, png: encodePng(rasterise(size), size) })));
  await writeFile(resolve(OUT_DIR, 'favicon.ico'), ico);
  console.log(`  wrote favicon.ico (16/32/48, ${ico.length} bytes)`);

  console.log('Icon set generated in', OUT_DIR);
}

main().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});
