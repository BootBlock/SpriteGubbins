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
 * keys on, what a box is split by when it is the widest, and what makes two otherwise-identical
 * pixels different colours. The one place it is privileged is `FULLY_TRANSPARENT`, which is excluded
 * from the palette entirely — see `colorHistogram`.
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
 * `buildPalette` splits a box across its widest channel and `applyPalette` measures distance across
 * all four, and a second copy of the tuple would be a second answer to what a colour is made of.
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
   * How far across RGB a pixel may sit, as `keyDistanceSquared` measures it — alpha ignored.
   *
   * **Not the plain Euclidean distance `nearestColor` uses, and the difference is the feature.** That
   * metric answers "how far apart are these two colours", which is the right question when picking
   * the nearest palette entry and the wrong one here: a key field varies by being shaded and washed
   * out, and measured plainly that variation costs more than a change of hue does. So this one
   * discounts the key's own plane of variation, and `keyDistance.ts` carries the reasoning and the
   * measurements. Two metrics, because they are answering two questions — not two answers to one.
   *
   * RGB-only because a key field is opaque by definition, so a pixel's own alpha says nothing about
   * whether it is background.
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
  | { readonly kind: 'CHANNEL_DEPTH'; readonly bitsPerChannel: number };

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
}

/** Everything `quantiseImage` needs beyond the image itself. */
export interface QuantiseSettings {
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

/** What came back: the transformed image, and the numbers that say what it did. */
export interface QuantiseResult {
  readonly image: ImageData;
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
