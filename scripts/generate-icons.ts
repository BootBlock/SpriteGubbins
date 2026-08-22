// Generates the Sprite Gubbins app-icon set from a single source-of-truth pixel glyph.
//
//   node scripts/generate-icons.ts
//
// The artwork and its palette are `iconGlyph.ts`; the writers are `iconPng.ts`. This file is the
// runner: it resolves where the output goes, resolves the palette against `src/index.css`, and
// writes the three files. TypeScript run by node directly — node strips the types, and the file
// being in a program is what type-checks the palette derivation against `src/utils/oklab.ts`.
//
// Outputs into public/: favicon.ico (16/32/48), icon-192.png, icon-512.png.

import { writeFile, mkdir } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { resolve } from 'node:path';
import { FAVICON_SIZES, MANIFEST_ICON_SIZES, iconPalette, rasterise } from './iconGlyph.ts';
import { encodeIco, encodePng } from './iconPng.ts';

const OUT_DIR = fileURLToPath(new URL('../public/', import.meta.url));

/** The stylesheet the palette is read out of — the one place a colour value is written down. */
const STYLESHEET = new URL('../src/index.css', import.meta.url);

async function main(): Promise<void> {
  await mkdir(OUT_DIR, { recursive: true });
  const palette = iconPalette(STYLESHEET);

  for (const size of MANIFEST_ICON_SIZES) {
    const png = encodePng(rasterise(size, palette), size);
    await writeFile(resolve(OUT_DIR, `icon-${size}.png`), png);
    console.log(`  wrote icon-${size}.png (${size}x${size}, ${png.length} bytes)`);
  }

  const ico = encodeIco(
    FAVICON_SIZES.map((size) => ({ size, png: encodePng(rasterise(size, palette), size) })),
  );
  await writeFile(resolve(OUT_DIR, 'favicon.ico'), ico);
  console.log(`  wrote favicon.ico (16/32/48, ${ico.length} bytes)`);

  console.log('Icon set generated in', OUT_DIR);
}

main().catch((err: unknown) => {
  console.error(err);
  process.exitCode = 1;
});
