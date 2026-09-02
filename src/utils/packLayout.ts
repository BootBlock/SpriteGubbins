/**
 * What a sprite pack calls its three kinds of entry, decided from the word that names the sheet.
 *
 * **A pack holds three kinds of thing and a batch holds several packs.** The sprites moved under the
 * facing so that eight rig runs expand into the per-facing tree an engine importer scans rather than
 * into eight `sprites/` that overwrite one another — and the sheet picture and the manifest, still
 * at fixed names in the archive root, kept overwriting one another for exactly that reason. Seven of
 * the eight sheets go, and so do seven of the eight manifests, which is the half that costs
 * something: a manifest is what a packer reads to learn which rect is which piece, each of the eight
 * describes a different picture, and the one that survives says nothing about which.
 *
 * **The word is `sheetToken`'s answer, not the facing.** Keying this on the facing alone left the
 * two sheets of a batch that have none — the directional cores, which draw four facings each and are
 * named by their ordinal instead — sharing every entry name they have. Whatever the download itself
 * is named by is what the entries inside it are named by, and one function decides both.
 *
 * **The word prefixes the two root files rather than swallowing them.** A pack rooted at `south/`
 * would put the sheet picture beside the sprite PNGs in the one directory an importer keyed by
 * facing reads as the sheet's pieces, where it would arrive as a piece the rig never declared. So
 * the sprites keep the directory #142 gave them, and the sheet and the manifest take the word in
 * their own names: extracting a whole batch into one root leaves one directory of pieces per sheet,
 * beside one sheet picture and one manifest each that say whose they are. The word leads so that a
 * listing groups a sheet's entries together, which is the order a reader working a batch is already
 * thinking in.
 *
 * **A sheet nothing tells apart keeps the flat layout**, which is the case #142 argued for: a batch
 * of one has no siblings to collide with, so naming everything in it after a series that does not
 * exist would buy nothing.
 *
 * Pure, as everything in this directory is.
 */

/** What a pack calls the sheet, the manifest and the sprite directory it holds. */
export interface PackLayout {
  /** What the sheet itself is called inside the archive, and what the manifest's `image` names. */
  readonly sheetFile: string;
  /** What the manifest is called inside the archive. */
  readonly manifestFile: string;
  /** The directory the cut-out sprites sit in, and what the manifest's `spriteDirectory` names. */
  readonly spriteDirectory: string;
}

/** The layout a pack takes where nothing tells its sheet apart from the rest of its batch. */
export const FLAT_PACK_LAYOUT: PackLayout = {
  sheetFile: 'sheet.png',
  manifestFile: 'manifest.json',
  spriteDirectory: 'sprites',
};

export function packLayout(token: string | null): PackLayout {
  if (token === null) return FLAT_PACK_LAYOUT;
  return {
    sheetFile: `${token}-sheet.png`,
    manifestFile: `${token}-manifest.json`,
    spriteDirectory: token,
  };
}
