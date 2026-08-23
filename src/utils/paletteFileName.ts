import { slugify } from './slugify.ts';

/**
 * `armour.png` → `armour-palette.gpl`, and `the Game Boy` → `the-game-boy-palette.png`.
 *
 * Named after the palette so a swatch sorts beside the sheet it was taken from, and suffixed so it
 * never collides with the sheet download itself — which is `…-quantised.png`, and a swatch of that
 * sheet’s colours would otherwise be offered under a name the reader already has a file for.
 *
 * **A palette named after a file loses that file’s extension first.** Two of the three palettes this
 * app can hand over are named after the sheet they came off, so without this the swatch of
 * `armour.png` would download as `armour-png-palette.png` — a name with the wrong extension in the
 * middle of it. `quantisedName` in `useImageDownload` strips one for the same reason.
 *
 * A name that slugs to nothing — punctuation alone, or a machine spelled in a script `slugify` does
 * not transliterate — comes back as `palette.png` rather than `-palette.png`, so the download is
 * always offered under a name a file system will take. The suffix is what is dropped there rather
 * than the stem: `palette-palette.png` is a name nobody would read as a fallback.
 */
export function paletteFileName(name: string, extension: string): string {
  const stem = slugify(name.replace(/\.[^./\\]+$/, ''));
  return stem === '' ? `palette.${extension}` : `${stem}-palette.${extension}`;
}
