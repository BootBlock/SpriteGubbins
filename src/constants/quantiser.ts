import type { PaletteLimit } from '../types/output.ts';

/** The quantiser's fixed numbers and the copy that explains its one control. */

/**
 * How many colours each studio palette limit allows the returned image, or `null` for no budget.
 *
 * Read from `useOutputStore` rather than chosen again here. The limit is already stated in the
 * prompt the user sent, so a second colour-count control on this tab would be a second source of
 * truth for a value the sheet was generated against — and the place to change it is the place it is
 * already changed.
 *
 * **It is not on its own the answer to whether the palette step runs.** A pinned palette supersedes
 * the budget entirely, so `colorPlanFor` reads this only when there is none — and `null` here means
 * "no budget", not "no reduction".
 */
export const PALETTE_COLOR_COUNTS: Readonly<Record<PaletteLimit, number | null>> = {
  STRICT_32_COLOR: 32,
  RESTRAINED_64_COLOR: 64,
  EXPANDED_ALBEDO: 128,
  UNRESTRICTED: null,
};

/**
 * The fraction of an image's colour transitions that must fall on a scale's lattice for that scale to
 * be believed.
 *
 * Not 1.0: a returned sheet is rarely flawless, and a single stray pixel from a compression artefact
 * should not deny an otherwise obvious grid. It can afford to be no higher than this and no lower,
 * because of how far apart the two answers sit — the true scale scores 1, and a scale twice as coarse
 * misses every other lattice line and scores about a half. There is nothing legitimate in between.
 */
export const GRID_DETECTION_THRESHOLD = 0.9;

/**
 * How far either side of a boundary the softening in a resampled sheet is taken to reach.
 *
 * Art drawn at a scale and then **resampled** has no colour transitions left to count: a symmetric
 * three-tap kernel convolves each boundary's step with itself, so one crisp edge becomes a ramp
 * spread over the pixel before it, the pixel itself, and the pixel after. `detectPixelGrid` sees
 * that as three transitions of which two miss the lattice, and answers `null` for the whole sheet —
 * correctly, by its own definition, and uselessly.
 *
 * `1` is therefore the whole claim the estimator makes about what happened to the image, and it is
 * a claim with a cost at both ends. Narrower and a three-tap ramp is two-thirds off-lattice again.
 * **Wider costs the floor.** {@link MIN_ESTIMATED_GRID} is derived from this, so a ramp of 2 raises
 * it to 6 and grids of 4 and 5 stop being measurable at all — softened art at both answers `null`
 * there. (A second cost was once measured here — a widened window admitting non-divisor scales for
 * art inset from the corner — but that was a property of the lattice being anchored at the origin,
 * and the phase search dissolved it: inset art now measures as its own scale at either ramp width,
 * which `pixelPeriod.test.ts` pins across every inset of an 8-grid.)
 *
 * Softening broader than this falls short of {@link GRID_ESTIMATION_THRESHOLD} and answers `null`,
 * which is the honest outcome rather than a missed one: past a ramp this wide there is no lattice
 * left in the image for `alignToGrid` to snap to. How far short depends on how much broader — a
 * five-tap kernel still measures 0.64 to 0.72, while a bilinear upscale spreads each boundary across
 * the whole cell rather than one pixel either side and measures essentially nothing (−0.01). The two
 * are not one band, and only the conclusion is shared.
 */
export const SOFTENED_EDGE_RAMP = 1;

/**
 * The smallest scale the estimator will consider, and the one number here that is derived rather
 * than chosen.
 *
 * A ramp of {@link SOFTENED_EDGE_RAMP} admits `2 × ramp + 1` offsets out of every `grid`, so at a
 * grid of `2 × ramp + 1` the window covers *every* offset and the measurement below becomes the
 * statement that an image is an image. One more than that is the coarsest scale at which a single
 * offset is still left over to disagree — at 4, the cell's own centre — which is what the score is
 * measured against.
 *
 * It is also the honest floor on the question. A boundary softened across three pixels inside a
 * cell four pixels wide has already consumed three quarters of it; below that the ramps either side
 * of a cell overlap, and there is no period left in the image to find.
 */
export const MIN_ESTIMATED_GRID = 2 * SOFTENED_EDGE_RAMP + 2;

/**
 * The share of a sheet's change that must sit on a scale's lattice for that scale to be *offered*.
 *
 * The same nine tenths as {@link GRID_DETECTION_THRESHOLD}, measuring the same thing about a
 * different quantity: that is a share of colour *transitions*, this a share of the summed magnitude
 * of every step between neighbouring pixels, corrected for the share a lattice of this scale would
 * collect from an image with no structure at all. So both read as "nine tenths of what changes in
 * this sheet changes on the lattice", and neither can be nudged into believing a scale twice the
 * truth — which collects about half, whatever the wording.
 *
 * High, and deliberately so, because the two answers are not symmetric: a scale that is not offered
 * costs the user a number they must type themselves, while a **wrong** scale offered is one they
 * click, and it hands back a sheet reduced by the wrong factor with nothing on screen saying so.
 * Measured across softened art at 4, 6, 8, 12 and 16 — varied cell colours, two-colour art, and a
 * small sprite on a large key field — the true scale scores exactly 1, the best **coarser**
 * candidate 0.37, and smooth painted artwork with no scale in it at most 0.40. A doubled scale
 * *collects* about half the sheet's change, which is the figure intuition reaches for, but scores
 * 0.17 to 0.38 once the share a lattice that coarse would collect by chance is taken back out.
 *
 * **Coarser is the only direction this number defends, and that is not a weakness.** A *finer*
 * candidate scores 1 as well and always will: art drawn at 8 changes only on multiples of 8, every
 * one of which is also a multiple of 4, so a grid of 4 explains it perfectly and would merely fail
 * to reduce it as far. What picks the right one is the **descending loop** in `estimatePixelGrid`,
 * which takes the coarsest scale that holds — exactly the rule `detectPixelGrid` uses, and for
 * exactly the same reason. Read this figure as the headroom above a scale that would *destroy*
 * detail, never as a general 1-against-0.52 margin, because a reader who takes it for the latter
 * will conclude there is room to lower it.
 */
export const GRID_ESTIMATION_THRESHOLD = 0.9;

/**
 * The edge of the largest **square** sheet the tab accepts, and the figure its controls are derived
 * from.
 *
 * A square at this edge is exactly {@link MAX_IMAGE_PIXELS}, which is the limit actually enforced —
 * and that one bounds *area*, so a sheet may be wider and shorter than this and still be taken. So
 * it is the size a control reasons from, never a second limit imposed on the image. Module-private,
 * as `SMALLEST_SPRITE_EDGE` below is: both exist to derive a bound in this file, and neither is a
 * number anything outside it should be reading.
 */
const MAX_IMAGE_EDGE = 4096;

/**
 * The smallest edge anyone actually draws a sprite at — an inventory icon, a console-era tile.
 *
 * Sixteen is the floor rather than a typical value, which is what makes it the right divisor for a
 * *ceiling*: a grid coarser than this reduces the widest sheet the tab accepts to something smaller
 * than any sprite it could have held.
 */
const SMALLEST_SPRITE_EDGE = 16;

/**
 * What the user may type when detection finds nothing, or disagrees with them.
 *
 * The floor is 1 rather than 2, because "this image is already at its own resolution, just reduce
 * the palette" is a real request — and it is the one answer detection can never give, since every
 * image is trivially uniform at a grid of 1.
 *
 * **The ceiling is derived from the sheets the tab accepts, not from what the readers measure.**
 * For a while it borrowed the automatic readers' old fixed ceiling of 32, which turned a limit on
 * inference into a limit on what the user is allowed to assert: a single 16 × 16 sprite returned
 * alone on a 1024-pixel canvas is a grid of 64, which was untypeable, and that sheet could not be
 * reduced at all. The honest bound is the arithmetic — the widest sheet the tab accepts, cut to the
 * smallest edge a sprite is drawn at. {@link measurableGridCeiling} caps the automatic readers to
 * this same figure, so nothing is ever measured that could not have been typed.
 */
export const MANUAL_GRID_RANGE = { min: 1, max: MAX_IMAGE_EDGE / SMALLEST_SPRITE_EDGE } as const;

/**
 * How many times chance a position's change must be before it reads as a boundary line.
 *
 * A structureless axis spreads its change evenly, handing every position `total / usable` of it —
 * so a boundary is a position carrying a *multiple* of that, and 2 is the smallest multiple that
 * separates the two populations on the sheets measured: a softened boundary's centre column carries
 * about half its step, which is many times chance on any sheet with real cells, while noise and
 * gradient columns sit at chance by definition. Weak genuine boundaries that fall under it are not
 * lost — `boundaryMesh` completes a missing line at the expected spacing, which is where a boundary
 * too faint to detect almost certainly is.
 *
 * Filed here with the other calibrated thresholds — `GRID_DETECTION_THRESHOLD` and its siblings —
 * rather than beside the function that reads it, for the reason `KEY_SHADING_LATITUDE` records:
 * these numbers are read against one another, and scattering them is how two of them drift apart.
 */
export const BOUNDARY_THRESHOLD_OVER_CHANCE = 2;

/**
 * The prominence a correlation peak must stand above its flanking valleys to be a candidate pitch.
 *
 * The step profile carries a low-frequency envelope — art here, gutter there — that mean removal
 * does not touch, and the envelope raises the whole correlation baseline at small lags. An absolute
 * threshold read against a raised baseline believes the baseline; prominence measures the peak
 * against its own surroundings and is immune to it.
 */
export const ACF_PROMINENCE = 0.2;

/**
 * How much *support* an axis's settled peak must carry — its ±1 window, with negative neighbours
 * held at zero — for that axis to offer the pitch.
 *
 * Measured on the window rather than the single lag, deliberately: drift splits a fundamental
 * between two neighbouring lags, so a single-lag floor under-measures exactly the sheets this
 * reading serves. Negative neighbours are clamped rather than subtracted because at a pitch of
 * four the window spans most of a period and one neighbour sits in the anticorrelation trough *by
 * geometry* — a trough is the shape a strong period has, not evidence against it — and subtracting
 * it made every drifting pitch below five unreachable however strong the art.
 *
 * Applied per axis, against the axis's own variance. On the armour fixture the rows axis carries
 * 1.31 of support at the pitch and answers; the columns axis, polluted by the marks drawn along
 * it, musters 0.56 and refuses — and the one clean axis is enough. For a structureless profile
 * the correlation at any lag sits within a few hundredths of zero, so the floor stands far above
 * anything noise or a gradient reaches.
 */
export const ACF_CORRELATION_FLOOR = 0.75;

/**
 * How much of a peak's windowed mass a division of it must carry before the reading descends to
 * it.
 *
 * The harmonic question: art at a fractional pitch — six and a half pixels — puts its sharpest
 * integer-lag peak at *twice* the true pitch, and art at four and a third puts it at *three*
 * times, so a settled peak is asked whether its half or its third is nearly as well supported, and
 * descends while one is. Measured on the ±1 window rather than the single lag, because a
 * fractional pitch splits its evidence between two neighbouring lags and the window is what lets
 * the split fundamental still beat its own unified ghost. When the bar fails but the division is
 * still a prominent peak of its own, the axis reports it as octave-ambiguous instead of keeping
 * the coarse answer — see `estimateProfilePeriod`, which then demands the other axis corroborate.
 */
export const ACF_HARMONIC_DESCENT = 0.7;

/**
 * The confirmation a settled pitch takes from its own double's ±1 window, where the range holds
 * one.
 *
 * A genuine period correlates at its multiples; a coincidence does not. Windowed because drift
 * smears the echo across neighbouring lags, but *signed*, unlike the floor above: a negative
 * neighbourhood at the double is evidence against the pitch. Weaker than the floor because drift
 * decays multiples faster than it decays the fundamental — on the armour fixture the rows axis's
 * double-window carries 0.86 against its fundamental's 1.31, and the refused columns axis manages
 * only 0.16 there.
 */
export const ACF_MULTIPLE_CONFIRMATION = 0.3;

/**
 * The least structure an axis must carry — its profile's deviation against its mean — before that
 * axis's correlation may speak.
 *
 * A smooth gradient's profile is nearly constant, so after mean removal the correlation is a ratio
 * of two vanishingly small numbers and can be spuriously large; this gate refuses before that ratio
 * is ever consulted. Per axis, because the axes are read apart: a sheet structured on one axis
 * only is answered by that axis alone rather than diluted by the flat one. The same instinct as
 * {@link BOUNDARY_THRESHOLD_OVER_CHANCE}: structure is a multiple of chance, and a profile with no
 * multiples anywhere holds no boundaries to correlate.
 */
export const ACF_STRUCTURE_FLOOR = 0.5;

/**
 * How many times a pitch must fit across the sheet's shorter edge before the correlation reading
 * will consider it.
 *
 * Eight, where the mesh-period reading demands six spacings, and for the same reason at a stricter
 * bar: a pitch is a habit, and the correlation reading is the one most exposed to *content*
 * periodicity — components laid out evenly on the sheet repeat at a spacing hundreds of pixels
 * wide, inside the manual range's ceiling. Eight repeats across the short edge is what a sprite
 * layout never has and a pixel grid always does.
 */
export const ACF_FEWEST_REPEATS = 8;

/**
 * The fewest boundary spacings that can call a spacing a habit rather than a coincidence, for the
 * mesh-period reading.
 *
 * A median exists for any two lines, so the reading has to demand a sample: six spacings is three
 * per axis on a square sheet, the smallest count at which "the gaps cluster" is an observation
 * about the sheet rather than about two gaps.
 */
export const FEWEST_SPACINGS = 6;

/**
 * The share of boundary spacings that must sit within a pixel of their median for the mesh-period
 * reading to offer it.
 *
 * Within a pixel, because that is the drift `boundaryMesh` follows cut by cut; seven tenths,
 * because a genuine drifting grid concentrates nearly all its spacings on the two integers around
 * its true pitch, while edges at assorted distances spread theirs — the two populations are far
 * apart, and the threshold sits between them rather than near either.
 */
export const SPACING_AGREEMENT = 0.7;

/**
 * The coarsest scale the two automatic readers will consider for an image of this size.
 *
 * Derived per image rather than fixed, because the fixed version was a cap on the truth: detection
 * stopped at 32, so a sheet drawn at 64 — one 16 × 16 sprite filling a 1024-pixel canvas — was
 * reported as **32**, a finer, lossless reading of the same lattice that reduces the sheet to twice
 * the size that was asked for, wearing the confidence of a measurement while it does. Neither
 * reader needs the small bound to stay honest: a coarser-than-true candidate collects about half an
 * image's change against thresholds of nine tenths whatever phase it takes, and the sparse shapes
 * that could flatter a coarse lattice are refused by the estimator's adjacency guard — see
 * `sawTheSpacing` — while under the exact detector a stray feature in the sheet's interior is *two*
 * transitions, one pixel apart — where it starts and where it ends — which no phase class of any
 * scale holds both of. One touching the far edge has no end inside the image and does read as a
 * coarse two-cell sheet, but it did before the readers learnt phases too — and a share of 1 means
 * every phased cell is uniform, so either reduction is lossless.
 *
 * Two bounds remain, and each is a statement rather than a tuning:
 *
 * - **Half the shorter edge**, because a period has to fit in the image at least twice — art two
 *   cells to a side is the smallest sheet that holds one, and both readers' tests pin that case.
 *   Past it the *shorter* axis offers no interior lattice line to score; the longer one still may,
 *   but art with fewer than two cells on an axis is not a period, whichever axis holds the lines.
 * - **{@link MANUAL_GRID_RANGE}'s own ceiling**, so an automatic answer is always one the reader
 *   could have typed and can correct in place. Art genuinely drawn coarser than that comes back as
 *   the coarsest divisor the range holds — an under-reduction the user can finish, not a refusal.
 */
export function measurableGridCeiling(width: number, height: number): number {
  return Math.min(MANUAL_GRID_RANGE.max, Math.floor(Math.min(width, height) / 2));
}

/**
 * The preview magnifications, in the order the control offers them.
 *
 * 1:1 leads because it is the case that decides whether the result is genuine pixel art; the rest
 * are what make an individual pixel inspectable.
 */
export const PREVIEW_ZOOMS = [1, 2, 4, 8] as const;

/**
 * The tolerances the keying control offers, as the distance `keyDistanceSquared` measures.
 *
 * **A ladder rather than a slider**, and the reason is the pipeline: every pass in it is linear in an
 * image that may be {@link MAX_IMAGE_PIXELS}, so a range input would recompute the whole transform on
 * every pointer move of a drag. Stepped values reach the same range in one click each, and match what
 * this tab already does twice over — the zoom levels and the grid candidates.
 *
 * `0` is on the ladder because "exact match only" is a real request, and it is the one setting that
 * also switches the fringe pass off (which is scaled from this number). The rest roughly double.
 * Against the recommended magenta they read: **32** takes a field that only re-encoding moved, **64**
 * takes one the generator painted at varying purity, **96** takes one that was shaded to half its
 * lightness, and **128** is past where the nearest hues that are *not* the key begin — rose and
 * purple both measure 100 — so it is a rung to reach for once and check the sprite against, not one
 * to sit at.
 */
export const KEY_TOLERANCES = [0, 16, 32, 64, 96, 128] as const;

/**
 * How much further a difference may run before it counts, when it runs the way a key field's own
 * variation runs.
 *
 * The whole of `keyDistance.ts` in one number: a difference lying in the plane that holds black, the
 * key and white — shading and washing out, which is what a returned field actually does — is divided
 * by this before it is measured, and a difference standing off that plane is not. The reasoning, and
 * the measurements that fix it at 2 rather than 3, are in that file.
 *
 * Here rather than there because it is the number the tolerance ladder above is calibrated against,
 * and the two cannot be read apart: raising it would move every rung's meaning without changing a
 * digit of them.
 */
export const KEY_SHADING_LATITUDE = 2;

/**
 * Where the tolerance starts: loose enough that the recommended magenta works on the sheets models
 * actually return, and still clear of every colour that is not the key's own hue.
 *
 * 64 rather than a tighter rung because a field the generator *painted* — the ordinary case, not the
 * bad one — measures about 50 once the shading latitude is applied, and the rung below it leaves that
 * field on screen. The nearest artwork colours sit at 100 and above, so this keeps a rung of margin.
 *
 * **`PURE_WHITE` and `PURE_BLACK` get no latitude at all**, so for them this is a plain distance and
 * 64 means what it always meant: a white key reaches greys down to `#DBDBDB`, a black key up to
 * `#242424`. That is looser than the 32 this used to open at and still nowhere near the sheet's own
 * midtones. Those two keys share their colour with real artwork whatever the metric, so the tab's
 * guidance — raise it until the field goes, stop before the sprite does — is where the stopping point
 * is judged; `keyDistance.ts` says why they are held to the straight measurement.
 */
export const DEFAULT_KEY_TOLERANCE = 64;

/**
 * How much further than {@link KEY_TOLERANCES} the one-pixel fringe pass reaches.
 *
 * A pixel on an anti-aliased edge is a blend of the key colour and the artwork beside it, so it sits
 * *outside* any tolerance tight enough to be safe — which is why removing the field exactly leaves a
 * halo. Reaching three times as far is what puts those blends inside it.
 *
 * It is safe to be this loose only because the fringe pass is restricted to pixels that touch the
 * keyed field. The same threshold applied everywhere would swallow a genuinely magenta-ish sprite
 * colour; applied at the boundary alone it only ever reaches pixels that are blends by construction.
 *
 * **The factor alone was never a bound, which is what {@link FRINGE_TOLERANCE_CEILING} is for** — and
 * the ceiling, not this, is what decides how much of a blend the pass actually admits.
 */
export const FRINGE_TOLERANCE_FACTOR = 3;

/**
 * The furthest the fringe pass reaches, however high the tolerance goes.
 *
 * A factor with nothing above it is not a threshold, it is a ramp off the end of the scale: at a
 * tolerance of 128 the product is 384, and the greatest distance any two colours can be apart is
 * 441. So the loosest settings on the ladder eroded a pixel of *everything* that touched the field —
 * the sprite's whole contour, whatever colour it was — while the panel described a one-pixel edge
 * clean-up. Nothing failed; the sheet simply came back a pixel thinner on every silhouette, which is
 * indistinguishable from the artwork having been drawn that way.
 *
 * 96 is fixed by the two things the pass has to sit between, and it is the second of them that is
 * load-bearing. Measured across every art colour it could be blending with, a pixel three-quarters
 * key sits **at most 60** from it, so a ceiling above that admits every one — the halo goes. And the
 * nearest colours to the recommended magenta that are *not* its own hue are rose and purple at
 * **100**, so a ceiling below that reaches no unblended artwork. 96 is between them.
 *
 * **It does not, and should not, exclude the blends nearer half.** Those run from about 50 to 119
 * depending on what the key is blending with, so this admits many of them — which is the pass working
 * rather than overrunning: a pixel half made of the key colour and touching the field *is* halo. The
 * bound that keeps it honest is the 100 above, not a claim about what fraction of key a pixel holds.
 *
 * Above the rung where this binds, the field's own radius has overtaken it and the fringe pass has
 * nothing left to add — every pixel it could reach, pass 1 has already marked.
 */
export const FRINGE_TOLERANCE_CEILING = 96;

/**
 * The largest image the tab will accept, in pixels.
 *
 * Every pass in the pipeline is linear in this number, so it is what bounds the work one job asks
 * for. The honest response to a 40000 × 40000 PNG is to decline it with a message, not to appear to
 * hang — the same reasoning that bounds the anatomy multiplier.
 *
 * The pipeline runs in a worker now, so exceeding this no longer freezes the page — but the limit is
 * not therefore redundant. A sheet this size still costs a second of real work per settings change
 * and holds two copies of itself in memory, and neither of those improves by being invisible.
 */
export const MAX_IMAGE_PIXELS = MAX_IMAGE_EDGE * MAX_IMAGE_EDGE;

/**
 * How long the grid and tolerance controls settle before the transform is asked for.
 *
 * Not a throttle on a stream of events — a **filter on states nobody chose**. The grid box is typed
 * into, so reaching 16 means passing through 1, and 1 is the most expensive scale the pipeline has:
 * every pixel becomes a cell of its own and nothing is downscaled before the palette step. Holding
 * the spinner arrow repeats at roughly thirty a second, so without this every intermediate value is a
 * full transform of a sheet that may be 16.8 million pixels.
 *
 * Long enough to span ordinary typing between two digits, short enough that a single deliberate click
 * on a candidate scale still feels immediate.
 */
export const QUANTISE_DEBOUNCE_MS = 250;

/**
 * The order the tab's controls are meant to be used in, as the guide panel lists them.
 *
 * Here rather than inline in the component for the reason every other block of user-facing copy in
 * this app is: it is content, it ships in the bundle, and it is read by strangers. It is also the one
 * place the tab says what to *do* rather than what it is — see `QuantiseGuide`.
 */
export const QUANTISE_STEPS = [
  {
    title: 'Bring the sheet in',
    detail: 'drop it here, paste it from the clipboard, or choose a file. It never leaves the tab.',
  },
  {
    title: 'Check the scale in the sheet',
    detail:
      'the pixel grid is read from the image itself — exactly where the art is crisp, and as an estimate to click where resampling has softened it. Overrule it if the preview disagrees, and type it yourself if no reading found one.',
  },
  {
    title: 'Key the background, if it has one',
    detail:
      'raise the tolerance until the field goes and stop before the sprite does. The colour comes from the studio.',
  },
  {
    title: 'Compare, then download',
    detail:
      'the two previews stay on the same part of the sheet at the same magnification. Judge an edge at 4× or 8×.',
  },
] as const;

/**
 * What the panel says when the sheet's scale could not be read exactly, keyed to how far the reading
 * got.
 *
 * Here rather than inline in `GridControls` for the reason {@link QUANTISE_STEPS} is: it is content,
 * it ships in the bundle, and it is read by strangers. It became a *set* when the estimator arrived,
 * which is the other half of the reason — one paragraph inline is a component with some copy in it,
 * and a choice between paragraphs is a component deciding what the app says.
 *
 * Neither names the scale it is talking about. The badge above and the button beside it both state
 * the number already, and a third copy of it in prose is one more place for the three to disagree.
 */
export const QUANTISE_SCALE_GUIDANCE = {
  /** Nothing was read at all — the sheet is smooth, with no regular spacing left in it to measure. */
  none: 'Nothing in this image changes on a regular grid, its edges do not soften at a regular spacing, its texture repeats at no pitch from one part of the sheet to the next, and such boundaries as it has keep to no one typical spacing either — so none of the four readings of the sheet found a scale. Type the scale the art was meant to be drawn at: a 16 × 16 sprite handed back on a 128 × 128 canvas is a grid of 8. A grid of 1 keeps the size and reduces the palette only. The grid does not have to start at the image’s corner — where it sits on the art is measured from the image whenever a scale is applied.',
  /** The edges repeat at a spacing, which is a candidate the reader still has to check. */
  estimated:
    'Nothing in this image changes on a regular grid, which is what smooth artwork downscaled to sprite size looks like — the thing the prompt asks against and models deliver anyway. Its edges do keep to one typical spacing, though — exactly, or drifting a pixel or two about it — and that spacing is the scale offered above. It is an estimate rather than a measurement, so it has not been applied: click it, then judge an edge at 4× or 8× before downloading, and type a different number if the preview disagrees.',
} as const;

/**
 * What the result pane says when it has no result to show, keyed to the reason it has none.
 *
 * Three reasons, not two, and they call for three different things from the reader — which is the
 * whole reason this is a set rather than the one line it began as. A pane that tells someone to type
 * a number the panel above is already offering them, or to type one they have just typed, reads as a
 * working feature having failed.
 *
 * Beside {@link QUANTISE_SCALE_GUIDANCE} rather than inside it: that is the *panel's* prose, several
 * sentences of instruction, and this is a caption on an empty frame. They are answering the same
 * question at different lengths, and each says only what its own surface has room for.
 */
export const QUANTISE_RESULT_PLACEHOLDER = {
  /** The worker is still reading the sheet, before any setting could apply. */
  reading: 'Reading the sheet and working out the scale it was drawn at…',
  /** No reading found a scale, so there is nothing to align to until one is typed. */
  none: 'No pixel scale was measured in this image, so there is nothing to align it to yet. Type one in the box above.',
  /** A scale was estimated and deliberately not applied — it is waiting to be chosen. */
  estimated:
    'The scale in this sheet was estimated from the spacing of its edges rather than measured outright, so it has not been applied. Click it above to align the sheet to it, or type a different one.',
  /**
   * A scale **is** in force and still produced nothing, which only a failure explains.
   *
   * Reachable two ways — the transform threw, or the worker died — and both put a message above this
   * pane saying which. So this points at that rather than repeating it, and above all does not fall
   * back to "type a scale in the box above", which is what the reader has already done.
   */
  failed: 'This sheet could not be quantised at the scale in force. The message above the controls says why.',
} as const;

/** Guidance shown against the quantiser's controls, keyed to the control it explains. */
export const QUANTISE_TOOLTIPS = {
  grid: 'How many image pixels wide one drawn pixel is. Measured from where the sheet’s colours change — art drawn at 8 changes only every 8 pixels, so that is the scale reported. Where resampling has softened those changes away, the spacing they still keep to — exactly, or with a little drift — is estimated instead and offered to click rather than applied. Type it yourself when no reading found a scale, or when the one reported disagrees with the preview. Art inset from the image’s corner needs no cropping: where the grid sits on the art is measured separately whenever a scale is applied. A grid of 1 leaves the size alone and only reduces the palette.',
  // Where panning is named. The grab cursor only appears once a pointer is already over the image,
  // so it teaches nobody on a touchscreen, and nobody working from the keyboard. The middle sentence
  // is the other thing nothing on screen says: the panes are linked, and moving one moves both.
  zoom: 'How many screen pixels one image pixel is drawn as. Magnifying never resamples — one pixel becomes a square of them. Both previews stay on the same part of the sheet at the same magnification, so moving one moves the other. When a preview is larger than its frame, drag it with the left mouse button or a finger to move around it, or give it focus with Tab and use the arrow keys.',
  keying:
    'Replaces the background key with transparency, so the sheet can be imported without a colour field behind it. The colour comes from the studio, which is where the prompt stated it. Anti-aliased edges carry blends of that key, and at any tolerance above exact the pixel touching the field is eroded with it — against a black or white key that will take some of the artwork’s own contour, which is why magenta is the recommended key.',
  keyTolerance:
    'How far a pixel may sit from the key colour and still count as background. A returned sheet is almost never the exact colour that was asked for, so exact usually keys nothing. Where the key has a colour of its own — magenta, as recommended — the distance is measured with that colour’s own kind of variation discounted: a pixel that is the key shaded darker or washed paler counts as roughly half as far away as one that has drifted to a different colour, which is what lets the field go without the sprite going with it. A white or black key has no colour to preserve, so it is measured straight and wants a closer eye. Raise it until the field goes and stop before the sprite does. It also sets how far the edge clean-up reaches, so at exact there is none.',
  downloadScale:
    'How many file pixels one drawn pixel is written as when the sheet is saved. 1× is the sheet’s own size — one file pixel per drawn pixel, which is what an engine imports. The larger rungs write the same pixels as solid squares, never resampled, for a copy a reader can see without magnifying it first; reducing such a file by the same factor gives back the 1× sheet exactly. It changes only the saved file — the previews, the prompt and everything stored stay as they are — and a rung whose file would outgrow the largest image this tab accepts is not offered for that sheet.',
} as const;
