/**
 * The files the Quantise tab can hand a finished sheet back as, and what each of them turned out to
 * be once it was written.
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
 * layouts. They are ordered by how much of the app's own knowledge they carry out with them: PNG is
 * the picture and nothing else, and it leads because it is what most pipelines consume; `.aseprite`
 * is the editable document; the sprite pack is the picture cut up with a manifest naming the pieces;
 * and the manifest alone is that description without the artwork, for a pipeline that already has
 * the sheet and wants the rects.
 */
export const SHEET_FORMATS = ['PNG', 'ASEPRITE', 'SPRITE_PACK', 'MANIFEST'] as const;

export type SheetFormat = (typeof SHEET_FORMATS)[number];

/** What every writer hands back: the bytes. */
interface WrittenFile {
  readonly bytes: Uint8Array<ArrayBuffer>;
}

/**
 * How many entries the palette holds, or `null` where the sheet held more colours than a palette can
 * name and was written with a colour per pixel instead.
 *
 * The one thing about a download a reader cannot see from the preview, and the same question in the
 * three formats that carry pixels — an indexed PNG, an indexed Aseprite document and a pack of
 * indexed PNGs all fit a palette or they do not, and the answer is read off the same result by the
 * same code. The manifest deliberately does not extend this: a file holding no pixels has no palette
 * to state, and a field that was always `null` there is one every reader would have to be told to
 * ignore.
 */
interface WrittenPixels extends WrittenFile {
  readonly paletteEntries: number | null;
}

export interface WrittenPng extends WrittenPixels {
  readonly format: 'PNG';
}

export interface WrittenAseprite extends WrittenPixels {
  readonly format: 'ASEPRITE';
  /** How many frames the document holds — one per sprite, or one for a sheet with nothing to cut. */
  readonly frames: number;
  /** How many tags name runs of those frames; `0` where the file is the single-frame case. */
  readonly tags: number;
}

/** What a written description of the sheet's sprites came to, whether or not artwork went with it. */
interface WrittenSprites {
  /** How many sprites were described — `0` where the sheet held nothing separable. */
  readonly sprites: number;
  /**
   * Whether the sprites carry the inventory's own names or positional ones.
   *
   * The confirmation says so, because it is the difference between a pipeline that can key on
   * `heads-south` and one that has to work from ordinals — and the reason is worth meeting at the
   * moment of download rather than on opening the file: the sheet came back with a different number
   * of components from the one the prompt asked for.
   */
  readonly named: boolean;
}

export interface WrittenSpritePack extends WrittenPixels, WrittenSprites {
  readonly format: 'SPRITE_PACK';
}

export interface WrittenManifest extends WrittenFile, WrittenSprites {
  readonly format: 'MANIFEST';
}

/**
 * One written file, whichever was asked for.
 *
 * A discriminated union rather than one widened shape, because the fields are meaningless outside
 * the format that has them: `frames` and `tags` say nothing about a PNG, a manifest has no palette,
 * and a field that is always the same value in half of its uses is a field every reader has to be
 * told to ignore. The `format` tag is what the confirmation message narrows on.
 */
export type WrittenSheet = WrittenPng | WrittenAseprite | WrittenSpritePack | WrittenManifest;
