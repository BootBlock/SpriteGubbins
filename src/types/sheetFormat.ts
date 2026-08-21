/**
 * The two files the Quantise tab can hand a finished sheet back as, and what one of them turned out
 * to be once it was written.
 *
 * Its own file rather than a corner of `types/quantiser.ts` because it is the vocabulary of the
 * *download* rather than of the transform: the writers in `src/utils/`, the thread in
 * `src/workers/` and the control in `src/components/quantise/` all speak it, and none of them has
 * anything to do with grids, meshes or votes. It also carries no `ImageData`, which keeps it
 * readable by the Node-side suites under `tests/`, whose program has no DOM library.
 */

/**
 * The formats, in the order the control offers them.
 *
 * The `as const` array is the union's single definition, as `PREVIEW_MODES` is for the preview's
 * layouts. PNG leads because it is what most pipelines consume and what the button did before there
 * was a choice; `.aseprite` is the editable document, which is a second thing to want rather than a
 * better one.
 */
export const SHEET_FORMATS = ['PNG', 'ASEPRITE'] as const;

export type SheetFormat = (typeof SHEET_FORMATS)[number];

/** What both writers hand back: the bytes, and what the palette came to. */
interface WrittenFile {
  readonly bytes: Uint8Array<ArrayBuffer>;
  /**
   * How many entries the palette holds, or `null` where the sheet held more colours than a palette
   * can name and was written with a colour per pixel instead.
   *
   * The one thing about a download a reader cannot see from the preview, and the same question in
   * both formats — an indexed PNG and an indexed `.aseprite` document fit a palette or they do not,
   * and the answer is read off the same result by the same code.
   */
  readonly paletteEntries: number | null;
}

export interface WrittenPng extends WrittenFile {
  readonly format: 'PNG';
}

export interface WrittenAseprite extends WrittenFile {
  readonly format: 'ASEPRITE';
  /** How many frames the document holds — one per sprite, or one for a sheet with nothing to cut. */
  readonly frames: number;
  /** How many tags name runs of those frames; `0` where the file is the single-frame case. */
  readonly tags: number;
}

/**
 * One written file, whichever was asked for.
 *
 * A discriminated union rather than one widened shape, because `frames` and `tags` are meaningless
 * for a PNG: a field that is always `1` and always `0` in half of its uses is a field every reader
 * has to be told to ignore. The `format` tag is what the confirmation message narrows on.
 */
export type WrittenSheet = WrittenPng | WrittenAseprite;
