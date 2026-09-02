import type { ManifestSheet } from '../types/spriteManifest.ts';

/**
 * What tells one sheet apart from the rest of its batch, as a single filename-safe word.
 *
 * **A batch is generated one sheet at a time and downloaded one sheet at a time**, so everything a
 * download is named by has to distinguish the sheet from its siblings or the files collide. Two
 * things do: the facing, where a facing names this sheet alone, and the ordinal, which every sheet
 * of a batch has and no two share. The facing is preferred wherever there is one, because it is the
 * word the tree an engine importer scans is keyed by — see `SheetIdentity.facing`, which sets out
 * the three cases that have no facing to offer.
 *
 * **`null` means nothing tells this sheet apart, because there is nothing to tell it apart from.**
 * A batch of one is the whole of that case: a tileset, or a studio composing a single sheet. Naming
 * it `sheet-1` would assert a series that does not exist.
 *
 * **Both the download's own name and the layout inside a sprite pack are keyed on this**, which is
 * the reason it is a function rather than two rules written twice. The pack was keyed on the facing
 * alone until an eight-compass character batch showed what that costs: its first two sheets are the
 * directional cores, each drawing four facings, so neither has a facing to be named by and both
 * packs carried the same entry names, every one of them. The archive files differed — those already
 * used the ordinal — and everything inside them did not.
 *
 * Pure, as everything in this directory is.
 */
export function sheetToken(facing: string | null, sheet: ManifestSheet | null): string | null {
  if (facing !== null) return facing;
  if (sheet === null || sheet.total < 2) return null;
  return `sheet-${String(sheet.ordinal)}`;
}
