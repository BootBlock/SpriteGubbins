/**
 * A palette the reader brought with them, rather than one a machine imposed.
 *
 * The one thing the shipped library cannot express. Every palette in `src/constants/palettes/` is a
 * fact about hardware, written down once and never edited; this is a design decision belonging to
 * whoever is generating the sheets, and the only place it can come from is a file they already
 * have. So it is held on `OutputConfig` rather than in a constant, and `pinnedPalette` is what
 * turns it into the same `Palette` every reader downstream already knows how to handle.
 *
 * **Its own file rather than a corner of `types/palette.ts`**, which is about the machines. What
 * they share is the shape of the entries, deliberately: a list of `#RRGGBB` is what
 * `Palette.space.entries` carries, what `hexListText` writes, and what JSON stores without a
 * converter either way.
 */

/**
 * The colours, and the reader's own word for them.
 *
 * The name reaches the compiled prompt — "every pixel is one of the 24 colours of Dusk Harbour" —
 * so it is the one field here a reader can type. It arrives from the file: a `.gpl` states one in
 * its header, and a swatch picture or a hex list has only its own name to give.
 *
 * Entries are `#RRGGBB`, upper case, deduplicated, in the order the file listed them, and at most
 * {@link MAX_PALETTE_ENTRIES} of them. Order is the author's, not a measurement, so nothing
 * downstream sorts it: a swatch strip reads the way the file was written, and a palette that leaves
 * the app again through `PaletteDownload` comes back identical.
 */
export interface CustomPalette {
  readonly name: string;
  readonly entries: readonly string[];
}
