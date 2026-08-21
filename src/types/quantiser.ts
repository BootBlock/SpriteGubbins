/**
 * The vocabulary of the post-generation quantiser — the one capability in this app that reads an
 * image rather than composing text.
 *
 * It exists because no prompt wording fixes the problem it addresses: models return smooth artwork
 * that has been downscaled far more often than true pixel art, however firmly the template asks
 * otherwise. Grid alignment and palette reduction *on the returned image* are the only guarantee,
 * because they are the only step that does not depend on a model complying.
 */

/**
 * One colour, channel by channel, each 0–255 as the canvas stores it.
 *
 * Alpha is a channel like the other three rather than a separate concern: it is what the histogram
 * keys on, one of the four axes a group of colours is split across, and what makes two
 * otherwise-identical pixels different colours — which is why a soft edge can hold a palette slot of
 * its own rather than being written opaque. The one place it is privileged is `FULLY_TRANSPARENT`,
 * which is excluded from the palette entirely — see `colorHistogram`.
 */
export interface Rgba {
  readonly r: number;
  readonly g: number;
  readonly b: number;
  readonly a: number;
}

/**
 * The channels a colour is measured, split and compared across, in a fixed order.
 *
 * Here rather than beside either of the two functions that walk it, because both of them do —
 * `exactSplit` scores a cut across every one of them and `applyPalette` measures distance across all
 * four, and a second copy of the tuple would be a second answer to what a colour is made of.
 */
export const RGBA_CHANNELS = ['r', 'g', 'b', 'a'] as const;
export type RgbaChannel = (typeof RGBA_CHANNELS)[number];

/**
 * A pixel scale: the side of the square block that one *drawn* pixel occupies in the image.
 *
 * A 16 × 16 sprite delivered on a 128 × 128 canvas has a grid of 8. A grid of 1 says the image is
 * already at its own resolution and only the palette needs work.
 *
 * A named alias over `number`, which the compiler cannot tell apart from any other number — it is
 * documentation, not a check. It earns the name because the same quantity crosses five signatures
 * and "grid" alone reads as a layout, not a scale.
 */
export type PixelGrid = number;

/**
 * Where a pixel grid sits against the image: how far in from the left and top its first interior
 * cut falls, each in `[0, grid)`.
 *
 * `{x: 0, y: 0}` is a grid anchored at the image's own corner, which returned sheets almost never
 * are — a generator places its art wherever composition puts it. The offset is read off the mesh
 * the transform measured rather than ever being typed, so it appears in no **setting**: a stored
 * offset would be the stale half of a pair the moment the grid beside it was overtyped. It does
 * ride on the {@link QuantiseResult} coming back the other way, because the pane that draws the
 * result against the source has to know how wide the leading cell was — a result's own facts
 * travel with it, exactly as its colour count does.
 */
export interface GridOffset {
  readonly x: number;
  readonly y: number;
}

/**
 * Where every cell begins, per axis — each array ascending, starting at 0, each entry a cell's
 * first pixel.
 *
 * A mesh rather than a pitch, because generated art **drifts**: its apparent blocks are almost a
 * period but not quite, so a single `grid × grid` lattice — at any offset — straddles more of the
 * art's own cells the further across the sheet it walks. `boundaryMesh` measures where the
 * boundaries actually are and completes the gaps at the expected spacing, which degenerates to the
 * regular lattice exactly when the art is regular. The transforms in `gridAlignment.ts` walk
 * whatever this holds, so the two of them cannot disagree about where a cell begins.
 */
export interface GridMesh {
  readonly x: readonly number[];
  readonly y: readonly number[];
}

/** An image the user has brought in, and the filename anything derived from it is named after. */
export interface ImportedImage {
  readonly name: string;
  readonly image: ImageData;
}

/**
 * Which of the two readings of a sheet produced its scale, and therefore how far it can be trusted.
 *
 * `EXACT` is `detectPixelGrid`: every colour transition in the image falls on the lattice, give or
 * take the stray pixel a compression artefact leaves, and there is nothing to check. `ESTIMATED` is
 * `estimatePixelGrid`, reading the *period* of edges that resampling has already destroyed — a
 * measurement with a tolerance in it, so it is offered as a candidate and never adopted on its own.
 *
 * The distinction is carried rather than dropped because the two are not interchangeable on screen:
 * a number the user must check against the preview, presented as one they need not, is the failure
 * this whole reading exists to avoid.
 */
export type ScaleMeasurement = 'EXACT' | 'ESTIMATED';

/**
 * The pixel scale in a sheet, and how it was arrived at.
 *
 * One value rather than an exact scale beside an estimated one, because at most one of those is ever
 * true: the estimate is what the app falls back to *when* the exact reading found nothing, so a pair
 * of fields would spend most of its life half `null` and would admit a state — both set, disagreeing
 * — that has no meaning and would have to be resolved at every point of use.
 */
export interface SheetScale {
  readonly grid: PixelGrid;
  readonly measurement: ScaleMeasurement;
}

/**
 * What one look at a newly-loaded sheet establishes, before any setting has been chosen.
 *
 * Separate from {@link QuantiseResult} because these two answers depend on the *image* and nothing
 * else, and the transform's answers depend on the settings as well. Kept together with the result
 * they would be recomputed on every grid keystroke — which is what they were, and counting the
 * colours in a 16.8-megapixel sheet is not a thing to do on a keystroke.
 */
export interface SheetFacts {
  /** The scale the sheet was read at, or `null` for artwork with no pixel scale in it at all. */
  readonly scale: SheetScale | null;
  /** Distinct non-transparent colours in the sheet as it arrived. */
  readonly colors: number;
}

/**
 * A key colour and how far a pixel may sit from it and still count as background.
 *
 * One value rather than two loose arguments, because neither means anything alone: a colour with no
 * tolerance is the exact match that keys almost nothing on a real returned sheet, and a tolerance with
 * no colour is a radius around nothing. Carried together, `null` says keying does not run at all —
 * which is a state with two distinct causes (the user has not asked for it, or the studio's key is
 * `TRANSPARENT` and there is no colour to match) that the transform does not need to tell apart.
 */
export interface BackgroundKeying {
  readonly color: Rgba;
  /**
   * How far a pixel may sit in scaled OKLab, as `keyDistanceSquared` measures it — alpha ignored.
   *
   * **Not the plain Euclidean distance `nearestColor` uses, and the difference is the feature.** That
   * metric answers "how far apart are these two colours" across raw RGBA, which is the right question
   * when picking the nearest palette entry and the wrong one here: a key field varies by being shaded
   * and washed out, and measured plainly that variation costs more than a change of hue does. So this
   * one measures in the perceptual space every colour-tolerance gate now shares (`oklab.ts`) and discounts
   * the key's own plane of variation besides; `keyDistance.ts` carries the reasoning and the
   * measurements. Two metrics, because they are answering two questions — not two answers to one.
   *
   * Colour-only because a key field is opaque by definition, so a pixel's own alpha says nothing
   * about whether it is background.
   */
  readonly tolerance: number;
}

/**
 * What the palette step is asked to do, which is one of three different things.
 *
 * The studio can constrain a returned sheet's colour two ways, and they are not variations of one
 * setting: a **budget** says how many colours, leaving the choice of them to the image, while a
 * **palette** says which colours, leaving the count to fall out. Pinning a palette supersedes the
 * budget, so exactly one of these ever applies — which is why this is a union rather than three
 * fields that would have to be checked against each other.
 *
 * `CHANNEL_DEPTH` is the palette case for the machines whose colours are a space rather than a list.
 * It reduces the colour *count* barely at all, and that is not what it is for: it makes every colour
 * one the machine could actually have shown.
 */
export type ColorReduction =
  | { readonly kind: 'MAX_COLORS'; readonly maxColors: number }
  | { readonly kind: 'PALETTE'; readonly entries: readonly Rgba[] }
  | { readonly kind: 'CHANNEL_DEPTH'; readonly bitsPerChannel: number }
  | {
      readonly kind: 'LOCKED';
      readonly entries: readonly Rgba[];
      /** How near an entry a colour must sit to be taken to it; beyond this it keeps its own. */
      readonly snap: number;
    };

/**
 * A palette taken off a quantised sheet and held for the sheets that follow it.
 *
 * The quantiser's twin of the prompt system's identity lock, and it exists for the same failure:
 * a series is generated one sheet at a time, and a palette chosen afresh from each of them drifts.
 * Two sheets of one character, quantised at one budget, come back with two sets of greens that are
 * near-identical and not the same — so the armour changes shade between the walk sheet and the run
 * sheet, which is exactly what a fixed palette exists to stop.
 *
 * Locking is an explicit act on a result the reader is looking at, so it **supersedes the studio's
 * colour setting** for as long as it is held — the newer and more specific statement of which
 * colours this series is made of. {@link setting} records what that studio setting was at the time,
 * which is the one thing the lock cannot re-derive later and the only way the tab can say that the
 * two have since parted company.
 *
 * The entries are colours, not pixels: they are deduplicated across alpha and applied with
 * `applyLockedPalette`, which keeps each pixel's own coverage. A previous sheet's silhouette is a
 * fact about that sheet, not about this one's palette.
 */
export interface LockedPalette {
  /** The colours, most-used first, opaque — see `lockPaletteFrom` for the order and the dedupe. */
  readonly entries: readonly Rgba[];
  /** The name of the studio colour setting in force when the palette was taken — a `ColorPlan.setting`. */
  readonly setting: string;
  /** The file the sheet it was taken from came from, so the panel can say which sheet these are. */
  readonly sheetName: string;
}

/**
 * The reduction, and what the tab's own panel calls it.
 *
 * One value rather than two functions, because the two must always describe the same thing: the
 * panel sits beside the preview, and a readout naming the colour budget while the pipeline maps to
 * four greens is two statements on one screen contradicting each other. `colorPlanFor` decides both
 * in one branch, so they cannot part company.
 */
export interface ColorPlan {
  /** What the palette step will do, or `null` to leave the colours alone. */
  readonly reduction: ColorReduction | null;
  /** The stored identifier of whichever studio setting decided it — a palette, or the budget. */
  readonly setting: string;
  /** What that does to the image, as a clause following the setting's name. */
  readonly effect: string;
  /**
   * The studio's own colour setting, whether or not a lock has superseded it.
   *
   * Carried because it is what a lock **records** when one is taken: the panel that takes it is
   * looking at a plan that may already be a lock's, so reading {@link setting} would stamp a
   * re-locked palette with the name of the palette it replaced. It is the same string
   * {@link setting} carries whenever no lock is in force.
   */
  readonly studioSetting: string;
  /**
   * The studio colour setting a locked palette is overriding, or `null` where it overrides nothing.
   *
   * Named only when a lock is in force **and** the studio has moved to a different colour setting
   * since it was taken. That is the one state in which the supersession is a surprise rather than
   * the point: a palette locked under a machine's fixed colours, still applied after the studio has
   * been pinned to a different machine, produces colours the new machine could not show. Everywhere
   * else the lock is simply what the reader asked for, and there is nothing to report.
   */
  readonly superseded: string | null;
}

/**
 * How each mesh cell is read down to its one pixel — the algorithms the Downscale control offers.
 *
 * The `as const` array is the union's single definition; nothing validates stored values against
 * it, because the choice lives in the session's store and is never persisted.
 */
export const VOTE_METHODS = ['DOMINANT', 'INK_WEIGHTED', 'K_CENTROID'] as const;

/**
 * One of the three cell readings.
 *
 * `DOMINANT` selects — the modal colour, with the line rescue — and never invents a colour, so it
 * votes over reduced colours. The other two *average*, deliberately: `INK_WEIGHTED` darkens a
 * cell's body toward the line crossing it, and `K_CENTROID` takes the centre of the cell's
 * dominant colour cluster. An average has to see the unreduced colours to have anything to blend,
 * so for those the reduction runs after the vote — the order is `quantiseImage`'s to hold.
 */
export type VoteMethod = (typeof VOTE_METHODS)[number];

/**
 * What the symmetry pass does with what it finds — the three positions the Symmetry control offers.
 *
 * The `as const` array is the union's single definition, and unlike the two beside it this one *is*
 * validated against on the way out of storage: it is a dial, so it travels in a saved quantiser
 * preset. `parseQuantiseDials` checks membership against this array rather than a list restated
 * there.
 */
export const SYMMETRY_MODES = ['OFF', 'CHECK', 'SNAP'] as const;

/**
 * One of the three.
 *
 * `OFF` is the off position every pass on this tab opens at: nothing is measured and nothing is
 * reported. `CHECK` scores each sprite's best vertical mirror axis and reports it, changing no pixel
 * of the sheet. `SNAP` does that and then settles the mirrored pairs of the sprites that were
 * already symmetric enough to qualify, which is the only one of the three that rewrites artwork.
 *
 * **The gap between `CHECK` and `SNAP` is deliberate and is the whole safety of the feature.** A
 * sprite holding a sword, wearing one pauldron, or drawn with a shoulder bag is *legitimately*
 * asymmetric, and a snap that settled it would delete the thing that made it that subject. `CHECK`
 * is therefore where a reader finds out what their sheet actually is, before anything is rewritten.
 */
export type SymmetryMode = (typeof SYMMETRY_MODES)[number];

/**
 * The positional dither patterns the tab offers, in the order the control shows them.
 *
 * The `as const` array is the union's single definition, as the vote methods' is. Nothing validates
 * a stored value against it, because the choice lives in the session's store and is never persisted.
 */
export const DITHER_PATTERNS = ['NONE', 'BAYER_4', 'BAYER_8', 'BLUE_NOISE'] as const;

/**
 * One of the four — which threshold pattern decides, at each position, whether a pixel takes its
 * mixing plan's first colour or its second.
 *
 * **Positional, never error-diffusion, and that is the constraint the whole feature rests on.** A
 * sprite sheet is source artwork for frames that are later animated and tiled, and error diffusion
 * makes each pixel's dither depend on the pixels before it — so a shape that moves by one pixel
 * between two frames comes back wearing a different pattern, and the pattern crawls as the
 * animation plays. A threshold matrix is a function of position alone, so one colour lands on one
 * pattern in every frame of a run and on both sides of a tile seam.
 *
 * `NONE` is the off position: the pass does not run at all, as every dial's zero on this tab means.
 * `BAYER_4` and `BAYER_8` are the recursive ordered matrices, whose crosshatch is what a reader
 * recognises as a retro dither; `BLUE_NOISE` is a void-and-cluster tile, which spreads the same
 * ratios without a repeating figure — quieter, and the choice when the crosshatch reads as texture
 * the artwork does not have. What each is worth lives in {@link QUANTISE_TOOLTIPS}.
 */
export type DitherPattern = (typeof DITHER_PATTERNS)[number];

/**
 * A positional threshold pattern: one rank per position of a square tile, and how many ranks there
 * are.
 *
 * **`levels` is the plan's resolution as well as the pattern's**, which is why the two travel
 * together. A ratio finer than the tile can express is a ratio no position can act on, so a mixing
 * plan is searched over `k / levels` for whole `k` — and a pixel takes the plan's second colour
 * exactly when its own rank is below `k`, which puts `k` of every `levels` positions on it.
 *
 * The ranks are `0 … levels − 1`, each occurring equally often across the tile. For the Bayer
 * matrices that is one position per rank; for the blue-noise tile it is sixty-four, which is what
 * lets a 64 × 64 tile carry the same sixty-four ratios without a visible figure.
 */
export interface ThresholdMatrix {
  /** The tile's edge, in pixels — it repeats across the sheet from the image's own origin. */
  readonly size: number;
  /** How many distinct ranks the tile holds, and the denominator every mixing ratio is stated over. */
  readonly levels: number;
  /** Row-major, `size × size`, each entry `0 … levels − 1`. */
  readonly ranks: Uint16Array;
}

/**
 * The Downscale panel's dials, as one value: which reading turns the mesh into pixels, and the
 * strengths and tolerances that shape it.
 *
 * A named shape rather than more fields on {@link QuantiseSettings} directly, because the dials
 * travel together — the store holds them as workflow intent, the tab hands them to the hook as
 * one memoised object, and the comparison that decides whether a result is stale walks all of
 * them. Every slider's range and default lives in `constants/quantiser.ts` beside its reasoning.
 */
export interface QuantiseTuning {
  /** Which cell reading turns the mesh into pixels — see {@link VoteMethod}. */
  readonly vote: VoteMethod;
  /**
   * How far the outline-expansion pre-pass grows the local detail before any cell is read, in
   * source pixels; `0` means the pass does not run.
   *
   * Ahead of {@link vote} in the pipeline rather than beside it, and it applies to all three
   * readings — a contour that is a minority in its cell loses under every one of them, which is
   * what a pass running *before* the vote is for. See `outlineExpansion`.
   */
  readonly outlineExpansion: number;
  /** How hard `INK_WEIGHTED` pulls a cell toward its line; read only by that reading. */
  readonly lineStrength: number;
  /** The bright mirror of {@link lineStrength}, `0` off; read only by `INK_WEIGHTED`. */
  readonly trimStrength: number;
  /** The luma below which `INK_WEIGHTED` may read a pixel as line ink. */
  readonly inkThreshold: number;
  /** The colour merge's sheet-wide fold tolerance, `0` off; runs before the fill cleanup. */
  readonly colorMerge: number;
  /** The fill cleanup's speckle-merge tolerance, `0` off; applied to every reading's output. */
  readonly fillCleanup: number;
  /** How many times the fill cleanup runs over its own output; each pass stops early when idle. */
  readonly cleanupPasses: number;
  /**
   * Which positional pattern the palette step dithers through, or `NONE` to map each pixel to one
   * colour outright.
   *
   * Read only where {@link QuantiseSettings.reduction} names a palette to dither *against*: a dither
   * expresses a colour the palette does not hold as a mixture of colours it does, so with no palette
   * in force there is nothing to express and nothing to express it in. It also moves the palette step
   * itself — see `quantiseImage`, which holds that rule.
   */
  readonly dither: DitherPattern;
  /**
   * How far apart two pieces of artwork may sit and still be counted as one sprite, in drawn pixels.
   *
   * A dial that changes no pixel of the result — one of three, with the symmetry mode at `CHECK`
   * and the tolerance that shapes what `CHECK` reports. It shapes {@link QuantiseResult.sprites}
   * — the reading of the sheet the tab reports and the preview's outline mode draws — and it is on
   * this shape rather than beside it because the segmentation travels with the result, so the
   * comparison that decides whether a result is stale has to walk it like every other dial.
   *
   * `0` is not an off position: the pass always runs, and at zero it still folds pieces whose boxes
   * overlap. See `spriteSegments`.
   */
  readonly spriteGap: number;
  /**
   * What the vertical-symmetry pass does with what it finds — see {@link SymmetryMode}.
   *
   * Downstream of {@link spriteGap} rather than beside it, because it is a reading *of* the
   * segmentation: the boxes that pass produces are the regions an axis is scored inside, so a sheet
   * that did not segment has nothing for this to run on whatever it is set to.
   */
  readonly symmetry: SymmetryMode;
  /**
   * How far two mirrored pixels may sit apart and still be counted as agreeing, in the scaled-OKLab
   * units every colour dial on this tab is stated in.
   *
   * `0` is not an off position — it is the strictest one, where a pair agrees only when the two
   * pixels are identical. {@link symmetry} is what switches the pass off.
   */
  readonly symmetryTolerance: number;
  /**
   * The share of a sprite's mirrored pairs that must already agree before `SNAP` will rewrite it,
   * as a percentage.
   *
   * The gate that stops a snap deleting a held sword. Read only under `SNAP`; under `CHECK` every
   * sprite is reported and none is rewritten, so there is nothing for a floor to admit or refuse.
   */
  readonly symmetryConfidence: number;
}

/** Everything `quantiseImage` needs beyond the image itself. */
export interface QuantiseSettings extends QuantiseTuning {
  readonly grid: PixelGrid;
  /** The background to remove, or `null` to leave every pixel where it is. */
  readonly key: BackgroundKeying | null;
  /**
   * How the result's colours are constrained, or `null` to leave them alone.
   *
   * `null` rather than a generous budget, because `UNRESTRICTED` with no palette pinned means the
   * step does not run at all — a painted or 3D-rendered sheet has no colour budget to enforce, and
   * reducing it to some high figure anyway would still be a reduction.
   */
  readonly reduction: ColorReduction | null;
}

/**
 * How far each output pixel sits from the patch of source it replaced, one figure per pixel of
 * {@link QuantiseResult.image}, plus the two summaries that make a sheet's figures comparable.
 *
 * **Distances, not colours.** What a difference is worth looking at depends on how closely the
 * reader is looking — a sheet whose worst cell is 8 and a sheet whose worst cell is 200 want
 * completely different ramps — so the scale is a control in the preview and the colouring happens
 * where that control is read. Carrying an already-painted heatmap across the boundary would fix the
 * scale at whatever the worker guessed and make the control a second transform of the whole sheet.
 *
 * **Fixed point, at {@link DIFFERENCE_PRECISION} steps to the unit**, because this is per *pixel*
 * of a result that reaches 16.8 million of them at a grid of 1, where the four bytes a float wants
 * are another sixty-seven megabytes to allocate and to clone back. Two bytes hold the whole range a
 * distance across four 0–255 axes can occupy with room to spare, at a resolution far below the
 * finest rung the scale offers.
 */
export interface DifferenceMap {
  /** The result's own dimensions — one cell here for one pixel there. */
  readonly width: number;
  readonly height: number;
  /**
   * Row-major, one entry per pixel of {@link QuantiseResult.image}, holding
   * `distance × DIFFERENCE_PRECISION`.
   *
   * There is deliberately no accessor. The one consumer that reads it in bulk converts its
   * *threshold* into these units once and compares in them — which is the cheap direction at
   * sixteen million cells — so a per-cell reader would exist only to be avoided.
   */
  readonly cells: Uint16Array;
  /**
   * The mean distance over the cells that carry anything, in unscaled units.
   *
   * Cells empty on **both** sides are left out: they were not reduced faithfully, they were not
   * reduced at all, and averaging them in would make the figure a measure of how much empty margin
   * the artist left around the sprites rather than of how the sheet came through the pipeline.
   */
  readonly mean: number;
  /** The largest distance any single cell reached, which is what the scale is judged against. */
  readonly peak: number;
}

/**
 * One sprite's footprint on the finished sheet, in drawn pixels.
 *
 * **Drawn pixels, not source pixels**, because every question a box is asked is stated in them: the
 * studio's target component size, the cell an atlas affords, and what a reader is looking at in the
 * result pane. `spriteSegments` says why the segmentation runs where it does.
 *
 * A position and an extent rather than four edges, so there is no exclusive-versus-inclusive
 * convention for a consumer to get wrong. `left + width` is the first column past the box, and the
 * two places that need to say so — the merge in `spriteSegments` and the ring in `spriteOutline` —
 * each derive it where they use it rather than carrying a second pair of fields nobody else reads.
 */
export interface SpriteBox {
  readonly left: number;
  readonly top: number;
  readonly width: number;
  readonly height: number;
  /**
   * Opaque drawn pixels inside the box — the artwork it actually carries, not `width × height`.
   *
   * The two differ by however much empty space the sprite's own silhouette leaves in its bounding
   * box, and by whatever a gap merge folded in: a figure with an outstretched arm fills perhaps half
   * of its box. It is what the speck floor is measured against, because area is what separates
   * artwork from the fringe a key left behind — a bounding box says nothing about how much is in it.
   */
  readonly pixels: number;
}

/**
 * What the sheet broke into, or why it did not break into anything a reader can act on.
 *
 * Three outcomes rather than a list with a flag beside it, because they are not one answer at
 * different sizes — each calls for something different from whoever is reading it, and two of them
 * are statements about the **keying** rather than about sprites.
 *
 * - `SEGMENTED` is a set of sprites: count them against what the prompt asked for, check the largest
 *   against the target size, pack them into an atlas.
 * - `SOLID` says nothing on the sheet is transparent, so there is nothing to separate anything by.
 *   It carries no boxes at all, and that absence is the point: one box covering the whole image
 *   would be indistinguishable from a genuine single-component sheet, and every reader downstream
 *   would go on to compare it with a component count and report a sprite the size of the raster.
 * - `SCATTERED` says this sheet holds more separate pieces than a sprite sheet has — a field that
 *   has not come out, or a tolerance so tight that every anti-aliased edge survives as its own
 *   island. Handed back as a list it would be three thousand boxes in the same shape as twelve.
 *
 * **`SOLID` is a fact about the result, not about whether the keying pass ran**, and the distinction
 * is load-bearing: a sheet that arrived carrying its own alpha — including one this app downloaded
 * earlier — segments perfectly well with keying switched off, while a sheet keyed at a tolerance
 * that matched nothing is fully opaque with keying switched on. A reader that inferred this from the
 * keying setting would be wrong in both directions.
 */
export type SpriteSegmentation =
  | {
      readonly kind: 'SEGMENTED';
      /** Reading order — top to bottom, then left to right. */
      readonly boxes: readonly SpriteBox[];
      /** Pieces too small to be a sprite; see {@link SMALLEST_SPRITE_PIXELS}. */
      readonly specks: number;
    }
  | { readonly kind: 'SOLID' }
  | {
      readonly kind: 'SCATTERED';
      /** How many pieces there were, which is the figure that says how far past a sheet this is. */
      readonly pieces: number;
      readonly specks: number;
    };

/**
 * One sprite's best vertical mirror axis, how well it holds, and whether the snap acted on it.
 *
 * **It carries its own box rather than an index into {@link SpriteSegmentation}.** A snap rewrites
 * pixels, and rewriting pixels can split or join a connected region — so the segmentation reported
 * beside the finished sheet is re-taken *after* the snap and need not hold the same boxes this was
 * measured over. An index would then point at a different sprite, silently. The box is what the
 * reading is about, so the reading holds it.
 *
 * The figures are the sheet as it stood **before** the snap, which is the only state in which they
 * mean anything: a sprite that has just been made symmetric scores a confidence of 1 whatever it
 * arrived as, and a reader deciding whether their subject is symmetric would be reading their own
 * snap back to themselves.
 */
export interface SpriteSymmetry {
  /** The sprite the axis was scored inside, in the drawn pixels `SpriteBox` is stated in. */
  readonly box: SpriteBox;
  /**
   * The mirror line, as a column coordinate on the result — the partner of column `x` is
   * `2 × axis − x`.
   *
   * Half-integer where the line falls between two columns, whole where it runs down the middle of
   * one. Both are ordinary: a sprite an even number of pixels wide has no centre column to be
   * symmetric about.
   */
  readonly axis: number;
  /**
   * How much of the sprite actually mirrors about {@link axis}, `0`–`1`.
   *
   * The share of its mirrored pairs agreeing within the tolerance in force, counting only pairs
   * where at least one side carries coverage — a pair of empty pixels is not evidence of symmetry,
   * and counting the empty corners of a bounding box would report a diagonal sword as a symmetric
   * sprite.
   */
  readonly confidence: number;
  /** Whether the snap settled this sprite's pairs, which `SNAP` and the confidence floor decide. */
  readonly snapped: boolean;
}

/** What came back: the transformed image, and the numbers that say what it did. */
export interface QuantiseResult {
  readonly image: ImageData;
  /**
   * What {@link image} cost, pixel by pixel — the preview's difference mode, as data.
   *
   * A fact of the result rather than something asked for separately, and deliberately: a heatmap
   * computed on its own could describe an older result than the one beside it, which is precisely
   * the failure the mode exists to expose. Travelling with the result, it cannot.
   */
  readonly difference: DifferenceMap;
  /**
   * The separate sprites on {@link image}, and how big each of them is.
   *
   * A fact of the result rather than something asked for separately, for the reason
   * {@link difference} is: a segmentation computed on its own could describe an older result than
   * the one beside it, and every consumer of this — the readout on the tab, the preview's outline
   * mode, the atlas calculator's count — is comparing it with something a dial has just moved.
   */
  readonly sprites: SpriteSegmentation;
  /**
   * Each sprite's vertical mirror axis and how well it holds, or `null` where the pass did not run.
   *
   * `null` is the Symmetry control's `OFF` position and nothing else. An empty array is a different
   * statement — the pass ran and had no sprites to run on, which is what a solid or scattered sheet
   * gives it — and the panel says so rather than reporting "no symmetry found".
   *
   * A fact of the result for the reason {@link difference} and {@link sprites} are: measured
   * separately it could describe an older result than the one beside it, and under `SNAP` it is the
   * record of what was rewritten in producing {@link image}.
   */
  readonly symmetry: readonly SpriteSymmetry[] | null;
  /**
   * Where the grid sat on the source, as the transform measured it.
   *
   * Carried because a non-zero offset changes what the first pixel of each axis *is* — a leading
   * partial cell covering only `offset` source pixels — and the comparison view cannot place the
   * result against the source without knowing that. See {@link GridOffset} for why it is a fact of
   * the result rather than a setting.
   */
  readonly offset: GridOffset;
  /**
   * Distinct non-transparent colours in {@link image}.
   *
   * The figure it is read against — how many the sheet arrived with — is {@link SheetFacts.colors},
   * which is measured once when the sheet loads rather than again on every settings change.
   */
  readonly colors: number;
  /**
   * The fraction of the source the key removed, 0–1, and `0` where keying did not run.
   *
   * Reported because it is the one question this feature cannot answer from the preview: the sheet
   * that prompted the work had a *visibly* magenta field almost none of which was `#FF00FF`, and at
   * 1× in a 24rem frame a field that was missed looks exactly like a field that was keyed. The number
   * is what says which happened.
   *
   * Counts only pixels that arrived carrying some colour — any alpha above zero — and left fully
   * transparent, so a sheet that already had empty space does not inflate it with area the key never
   * touched.
   */
  readonly keyedShare: number;
}

/**
 * The four ways the preview offers to read one result — the layouts, in the order they are offered.
 *
 * The `as const` array is the union's single definition. Like the vote methods, the choice lives in
 * the panel that draws the preview and is never persisted: it is a preference about how a result is
 * being *looked at* right now, not part of what the result is.
 */
export const PREVIEW_MODES = ['SIDE_BY_SIDE', 'WIPE', 'DIFFERENCE', 'SPRITES'] as const;

/**
 * One of the four.
 *
 * `SIDE_BY_SIDE` is the pair of linked panes, which answers "what did this become". `WIPE` overlays
 * them in one frame under a divider, which answers "what moved" for a change large enough to see.
 * `DIFFERENCE` replaces the result pane with a heatmap of {@link DifferenceMap}, which answers "what
 * did it cost" — the question the other two cannot, and the reason a dial whose effect is real but
 * small reads as a dial that does nothing. `SPRITES` draws the result with each of
 * {@link SpriteSegmentation}'s boxes marked, which answers "what did it find" — a count of sprites
 * nobody can see the extent of is the same unreadable dial in a different place.
 */
export type PreviewMode = (typeof PREVIEW_MODES)[number];

/**
 * What the transform returned, and the pixel scale it returned it at.
 *
 * One value rather than two, because the two are only ever known together — the grid is what the
 * result was computed *from*, so there is no such thing as a result without one. Carried separately
 * they would need a fallback at the point of use, and the only fallback available is a grid of 1:
 * exactly the mis-scaling this pairing was introduced to fix, arriving silently.
 *
 * It matters twice over now that the transform is asynchronous. While a new grid is being computed
 * the tab keeps the previous sheet on screen rather than blanking the pane, so what is displayed is
 * briefly a result for a grid that is no longer the one in the box — and drawing it at the *box's*
 * grid would stretch it by the ratio between them.
 */
export interface Quantised {
  readonly result: QuantiseResult;
  readonly grid: PixelGrid;
}
