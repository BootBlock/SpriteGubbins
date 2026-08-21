import { ATLAS_CANVAS_SIZES, ATLAS_PADDING_SIZES, TEXTURE_FORMAT_IDS } from '../types/atlas.ts';
import type { AtlasCanvasSize, AtlasPadding, TextureFormat, TextureFormatId } from '../types/atlas.ts';

/**
 * Labels and guidance for the atlas calculator.
 *
 * The sizes themselves are in `types/atlas.ts`, because they are the domain's closed sets; what each
 * one is *for* is presentation, and lives here so the modal carries no option list of its own.
 */

/** What each texture size is used for in practice. Sizes come from {@link ATLAS_CANVAS_SIZES}. */
const CANVAS_SIZE_NOTES: Readonly<Record<AtlasCanvasSize, string>> = {
  512: 'Low-poly retro',
  1024: 'Standard SD',
  2048: 'HD atlas — recommended',
  4096: 'Ultra HD master atlas',
  8192: 'Extreme resolution',
};

/** What each gutter width buys. Widths come from {@link ATLAS_PADDING_SIZES}. */
const PADDING_NOTES: Readonly<Record<AtlasPadding, string>> = {
  0: 'No padding',
  2: 'Light gutter',
  4: 'Standard gutter — recommended',
  8: 'Wide bleed buffer',
  16: 'Maximum isolation',
};

export const ATLAS_CANVAS_CHOICES = ATLAS_CANVAS_SIZES.map((value) => ({
  value,
  label: `${value} × ${value} px (${CANVAS_SIZE_NOTES[value]})`,
}));

export const ATLAS_PADDING_CHOICES = ATLAS_PADDING_SIZES.map((value) => ({
  value,
  label: `${value} px (${PADDING_NOTES[value]})`,
}));

/** The configuration the calculator opens on — a 2048px texture with a standard gutter. */
export const DEFAULT_ATLAS_CANVAS_SIZE: AtlasCanvasSize = 2048;
export const DEFAULT_ATLAS_PADDING: AtlasPadding = 4;

/**
 * The two ways this texture will actually be sitting in graphics memory.
 *
 * Two entries rather than a menu of a dozen, because the dozen collapse to these: every
 * 4 × 4-block format a 2D engine ships an atlas in — BC7, BC3/DXT5, ETC2 RGBA, ASTC 4 × 4 — encodes
 * a block in 16 bytes, so they cost precisely the same and differ only in which GPU accepts them.
 * The uncompressed row is what a PNG becomes once decoded and uploaded, which is what most 2D
 * projects ship whether or not they meant to.
 *
 * Both rows are exact arithmetic, not an estimate, which is the only reason they are worth showing:
 * a figure a developer is meant to budget against has to be one they can check.
 */
const FORMAT_ENCODINGS: Readonly<Record<TextureFormatId, Omit<TextureFormat, 'id'>>> = {
  rgba8: { label: 'RGBA8 uncompressed', blockSize: 1, bytesPerBlock: 4 },
  // The label names one format and the tooltip names the family, because the whole list sits wider
  // than the row and pushes its own figure onto a second line — which loses the two-column read that
  // is the only reason the rows are worth putting side by side.
  block_compressed: { label: 'Block compressed (BC7 / ASTC 4×4)', blockSize: 4, bytesPerBlock: 16 },
};

/**
 * Built from {@link TEXTURE_FORMAT_IDS} rather than written out beside it, as the canvas and padding
 * choices above are: a hand-written array is a second copy of the id list that the type only checks
 * one way — every entry must name a member, but nothing requires every member to have an entry, so a
 * format could be declared and never priced. Mapping the union makes a missing one a compile error.
 */
export const TEXTURE_FORMATS: readonly TextureFormat[] = TEXTURE_FORMAT_IDS.map((id) => ({
  id,
  ...FORMAT_ENCODINGS[id],
}));

export const ATLAS_TOOLTIPS = {
  canvasSize:
    'The dimensions of the finished texture every component gets packed into. Each cell size below is derived from it, so raising this buys resolution per component and costs graphics memory on every platform that loads the texture — 2048 px is the usual ceiling for mobile, 4096 px for desktop. Every size offered is a power of two, which is what keeps mipmapping and the older sampling paths available.',
  padding:
    'The gutter left around each cell, in pixels. It stops neighbouring cells bleeding into one another when the engine filters or mipmaps the texture — the symptom is a faint edge of the sprite next door appearing as the camera pulls back. 4 px survives a full mip chain; 0 px is only safe with point filtering and no mipmaps.',
  memory:
    'What this texture occupies in graphics memory once uploaded — the figure to budget against, not the size of the PNG on disk. Uncompressed is width × height × 4 bytes. Every 4 × 4 block format a 2D engine ships an atlas in — BC7, BC3/DXT5, ETC2 RGBA and ASTC 4 × 4 — stores each block of 16 texels in 16 bytes, so they all cost a quarter of that and differ only in which GPU accepts them. A full mip chain adds roughly a third again, and is what filtering needs to stop distant sprites shimmering.',
  fit: 'Whether the component size the studio asks the generator for actually fits the cell this texture affords, and the largest whole-number scale it fits at. Whole numbers only: artwork placed at a fractional scale is resampled, which is exactly what destroys pixel art — so a component that only fits at 1.6× fits at 1×, and the rest of the cell is headroom.',
  componentCount:
    'How many separately-drawn pieces the sheet is being asked for — the category plan for the chosen directional mode, plus any additional anatomy the subject names. It is the same number the prompt states as its done-condition, so the grid below is the grid the prompt would actually produce.',
  gridLayout:
    'Columns × rows the components are laid into. The shape follows the sheet aspect ratio, so a 16:9 sheet is biased towards columns and a 9:16 sheet towards rows; the count is always at least the component count, which is where empty slots come from.',
  cellSize:
    'The pitch of one grid cell on the texture, before the bleed gutter. Divided by the grid’s longer axis, not its width — a grid taller than it is wide has to fit the texture downwards too.',
  usableBounds:
    'The square a component actually has to itself, once the bleed gutter is removed from both sides of the cell. This is what a sprite has to fit inside, and it is what the fit check above measures against.',
  emptySlots:
    'Cells the grid affords that no component lands in. The grid has to be rectangular, so a component count that is not a neat product leaves a short last row — texture that is uploaded, and paid for, holding nothing.',
  usableShare:
    'How much of the texture ends up inside a filled cell’s usable bounds. It prices every kind of waste at once: empty slots, the gutter around each cell, and the strip left over where the grid’s shorter axis stops short of the texture edge. A low figure with a wide or tall sheet aspect ratio is that last one — a square sheet packs a square texture better.',
  packingPlan:
    'The same figures drawn to scale, so the waste has a shape rather than only a price. The bright cells are components, the dim ones are slots the grid affords that nothing lands in, and the bare margin is texture the grid never reaches. It plans the atlas you repack the extracted artwork into. The prompt fixes the order the components are drawn in but never the number of rows and columns, so treat this as the packing you can choose rather than a picture of the sheet you will get back.',
} as const;

/**
 * What the calculator says about the sheet a reader has actually quantised, keyed to what was found
 * in it.
 *
 * Beside `ATLAS_TOOLTIPS` rather than inside it, and the split is the one the quantiser makes for
 * the same reason: those explain the modal's *controls*, and these describe the state of the
 * reader's own image — the same standing `QUANTISE_SCALE_GUIDANCE` has. Neither names a figure; the
 * badge and the line above them state the counts.
 */
export const MEASURED_SPRITE_GUIDANCE = {
  /** The sheet came apart into things that can be counted against the plan above. */
  measured:
    'Every other figure on this panel describes the atlas your prompt asks for. This one describes the sheet you quantised — how many separate pieces of artwork were actually found on it, and how big the largest of them is. The two disagreeing is worth knowing before you pack anything: a generator that returned fewer components than were asked for leaves slots empty, and one whose artwork came back larger than the target size will not seat at 1:1 in the cell planned for it. The plan above is not changed by any of this; it stays the atlas your prompt describes.',

  /** Nothing on the quantised sheet is transparent, so no boundary between components exists yet. */
  solid:
    'The sheet you quantised has nothing transparent on it, so no boundary between one component and the next exists to be found, and there is nothing here to check the plan against. Key the background on the Quantise tab — switch keying on if it is off, or raise the tolerance if it is already on — and this becomes a count you can read against the plan above.',

  /** It broke into far more pieces than a sprite sheet holds, which says the keying is not settled. */
  scattered:
    'The sheet you quantised broke into far more separate pieces than a sprite sheet holds, so none of them is being counted as a sprite and there is nothing here to check the plan against. A background field that has only partly come out does this, and so does a tolerance tight enough to leave every anti-aliased edge behind as its own island. Adjust the keying tolerance on the Quantise tab until the count settles, and this becomes a figure you can read against the plan above.',
} as const;
