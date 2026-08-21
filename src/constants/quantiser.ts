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
 * reading serves. Negative neighbours are clamped rather than subtracted because in the
 * *differenced* domain the correlation is read in, a genuine peak stands between structural
 * anticorrelation troughs at every pitch — a trough is the shape a strong period has, not
 * evidence against the peak beside it.
 *
 * Applied per axis, against the axis's own variance. Calibrated in the differenced domain, where
 * the synthetic fixtures measure 0.86 to 0.99 at their true pitch and a real returned sheet —
 * sprites on a field, whose envelope once buried the reading entirely — measures 0.58 on its
 * clean rows axis and 0.35 on its detail-polluted columns axis. The floor sits between the real
 * sheet's two axes: the clean axis answers and the polluted one refuses, and one axis is enough.
 * For a structureless profile the correlation at any lag sits within a few hundredths of zero,
 * far below it.
 *
 * The floor is the last gate in its chain, and every synthetic junk class constructed so far dies
 * at an earlier one — the structure gate, the positivity floor, or the double's confirmation — so
 * its refusal direction is witnessed only by the real sheet's polluted axis, not by a fixture.
 * That makes it defence in depth rather than a load-bearing wall: recalibrating it downward is
 * pinned by the sprites-on-field fixture, and a fixture that reaches it from above is still
 * wanted.
 */
export const ACF_CORRELATION_FLOOR = 0.5;

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
 * A genuine period correlates at its multiples; a coincidence does not. Windowed and clamped by
 * the same measure as every other gate, because a fractional pitch's echo lands beside the exact
 * double rather than on it — art at four and a third settled on five carries its echo at nine,
 * inside the double's window but flanked by the troughs a signed sum would count against it.
 * Weaker than the floor because drift decays multiples faster than it decays the fundamental.
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
 * The share of a cell a **dark** minority must hold before the vote may keep it: at least one
 * pixel in every {@link LINE_DARK_SHARE}.
 *
 * The reported failure this serves is a broken outline. A one-pixel drawn contour rendered at a
 * drifting six-ish scale lands astride the mesh as often as inside one cell, and the cell holding
 * the thinner slice — a third of its pixels, say — loses the vote to its own body colour. The line
 * that survives in one cell and not its neighbour reads as snapped, which no palette choice can
 * repair later. An eighth is well under the thinnest slice a straddled line leaves (about a third)
 * and well over what anti-aliased speckle musters in a cell it merely brushes, so it separates the
 * two populations rather than sitting near either. `≥` rather than `>`, so a cell of exactly eight
 * pixels still lets its single contour pixel qualify.
 */
export const LINE_DARK_SHARE = 8;

/**
 * The share of a cell a **bright** minority must hold — one pixel in every
 * {@link LINE_BRIGHT_SHARE}, deliberately twice as strict as the dark side's.
 *
 * The asymmetry is the observed one, not a symmetry broken for effect: generators bloom highlights
 * outward — a bright rim gains soft neighbours that inflate its count — while dark contour lines
 * thin under the same softening. A bright speck therefore reaches a dark line's floor far more
 * easily than a genuine trim reaches this one, and holding the bright side to a quarter keeps
 * single-pixel glints from claiming whole cells while a real two-pixel trim on a six-pixel cell
 * still clears it.
 */
export const LINE_BRIGHT_SHARE = 4;

/**
 * How far apart two lumas must sit, in 0–255 luma, for the vote to treat them as different tones
 * rather than shades of one surface — the floor under both the modal-to-line gap and the cell's
 * skew.
 *
 * Luma is the integer Rec. 601 weighting (`(54 R + 183 G + 19 B) >> 8`), the standard measure of
 * how light a colour reads to the eye. 32 is an eighth of the range: comfortably above the spread
 * shading and wobble put within one surface, comfortably below the gap between any body colour and
 * the near-black a drawn outline uses. A candidate nearer the modal colour than this is shading,
 * and keeping it would trade the surface for its own shadow.
 */
export const LINE_LUMA_GAP = 32;

/**
 * The luma range a cell must span before the vote looks for a line in it at all — twice
 * {@link LINE_LUMA_GAP}, so a qualifying cell has room for a genuine line *and* the gap that
 * separates it from the body.
 *
 * The anti-flatness gate, and the reason soft shading stays untouched: a cell whose colours all
 * sit within a quarter of the luma range holds tones of one surface, and the correct answer there
 * is the modal colour the vote already gives. Only a cell holding genuinely light and genuinely
 * dark pixels together can be holding a drawn line over a body.
 */
export const LINE_LUMA_RANGE = 2 * LINE_LUMA_GAP;

/**
 * The luma below which a colour can be a drawn outline's ink — the darkest quarter of the range.
 *
 * The anchor that keeps the rescue's two directions apart, and it has to be absolute: a cell that
 * is two thirds outline with a sliver of body, and a cell that is two thirds body with a sliver of
 * trim, are the *same tally* up to a luma shift — same shares, same span, same skew — so no rule
 * built on the cell's own statistics can tell "keep the line the vote already chose" from "keep
 * the trim the vote lost". What separates them is where the tones actually sit: pixel-art outlines
 * are drawn near black, and a mid tone is a surface, which the rescue exists to overrule but must
 * never install. Without this anchor the bright pass repainted majority-ink cells with the body
 * showing through them — the exact linework the feature exists to keep.
 */
export const LINE_INK_CEILING = 64;

/**
 * The luma at or above which a colour can be a bright trim — the brightest quarter, mirroring
 * {@link LINE_INK_CEILING} from the other end of the range.
 *
 * The same anchor for the same reason, in the direction the mistake inverts: without it the dark
 * pass read a majority-trim cell's body sliver as a "line" and repainted the trim with its own
 * surface. A genuine highlight — gold trim, rim light, specular edge — sits in this quarter on any
 * surface dark enough for the range gate to open at all.
 */
export const LINE_TRIM_FLOOR = 255 - LINE_INK_CEILING;

/**
 * The line-strength slider's range: how much beyond its own share a cell's ink pulls the
 * ink-weighted blend toward it.
 *
 * At 1 the blend is the plain proportional mean the ink already had, and a one-third contour
 * slice darkens its cell by a third — legible as shading, not as a line; the pull is capped at
 * full, so past roughly 3 a one-third slice is already pure ink and further travel only reaches
 * thinner slices. A slider in tenths rather than a handful of pills, because the right pull is
 * the artwork's own and is judged against the live preview: measured on the armour sheet, 1.5
 * kept contours present, 2 made them read as drawn, and 2.5 was the crispest without blackening
 * a panel — positions on a dial, not a choice of three.
 */
export const LINE_STRENGTH_RANGE = { min: 1, max: 4, step: 0.1 } as const;

/** The line strength the tab opens with — present but not heavy. */
export const DEFAULT_LINE_STRENGTH = 1.5;

/**
 * The trim-strength slider's range: the bright mirror of the line strength, for gold edging, rim
 * light and highlight trims, with `0` leaving highlights entirely to the plain blend.
 *
 * A separate dial rather than one shared strength, because the two directions fail differently —
 * generators bloom highlights outward while thinning dark lines, so a sheet often wants its ink
 * pulled hard and its trims left alone — which is also why it opens at zero where the line
 * strength opens engaged, and why its ceiling sits lower.
 */
export const TRIM_STRENGTH_RANGE = { min: 0, max: 3, step: 0.1 } as const;

/** The trim strength the tab opens with — off, matching the behaviour before the dial existed. */
export const DEFAULT_TRIM_STRENGTH = 0;

/**
 * The ink-threshold slider's range: the luma below which the ink-weighted reading may read a
 * pixel as line ink at all.
 *
 * The default is {@link LINE_INK_CEILING}, the darkest-quarter anchor the dominant vote's rescue
 * shares. Lowering it restricts the pull to truly black strokes; raising it lets darker artwork's
 * outlines qualify — at the cost that, past the point where a sheet's own shadows enter, the
 * line-versus-shading gate is the only thing keeping fills out, so the top of the range wants the
 * preview watched.
 */
export const INK_THRESHOLD_RANGE = { min: 16, max: 96, step: 1 } as const;

/** The ink threshold the tab opens with — the shared darkest-quarter anchor. */
export const DEFAULT_INK_THRESHOLD = LINE_INK_CEILING;

/**
 * The fill-cleanup slider's range, `0` meaning the pass does not run.
 *
 * The failure the pass serves: a lone pixel disagreeing with a settled fill. The cleanup snaps it
 * to its neighbourhood's most common colour when a strict majority of the neighbours it *has*
 * agree — see `despeckle` for the rule and why a region boundary can never form one — and the
 * pixel already sits within the tolerance of that colour, measured as straight-line distance in
 * scaled OKLab (see `oklab.ts` for the space and the scale). The tolerance is what keeps lines
 * safe: ink against a mid green measures about 109, past double the whole range — and further
 * than RGB ever put it, because OKLab spreads dark colours apart where the RGB cube crowded
 * them. On a densely dithered sheet the pass has little to do until the colour merge has settled
 * the fills — majorities cannot form between colours that alternate everywhere — which is the
 * pairing its guidance points at.
 *
 * Half the RGB range it replaced, and deliberately: a perceptual step is roughly two RGB steps
 * across the mid tones, so 48 here reaches about as far as the old 96 did there — while meaning
 * the *same* reach in the darks and the lights, which is what the RGB dial could not say.
 */
export const FILL_CLEANUP_RANGE = { min: 0, max: 48, step: 1 } as const;

/** The tolerance the tab opens with — off, so a sheet is exactly what its reading made of it. */
export const DEFAULT_FILL_CLEANUP = 0;

/**
 * The cleanup-passes slider's range: how many times the fill cleanup runs over its own output.
 *
 * One pass fixes every pixel that was a lone dissenter *in the input*; a pixel two deep in a
 * speckled patch only becomes the lone one after its neighbour has settled, which is the next
 * pass's work. Each pass stops early when nothing changed, so the ceiling costs nothing on a
 * sheet that settles in one.
 */
export const CLEANUP_PASSES_RANGE = { min: 1, max: 4, step: 1 } as const;

/** The passes the tab opens with — one, the pass as it always ran. */
export const DEFAULT_CLEANUP_PASSES = 1;

/**
 * The colour-merge slider's range, `0` meaning the pass does not run.
 *
 * Where the fill cleanup fixes a lone dissenting pixel, this fixes *dense* speckle — fills
 * dithered between palette entries a dozen steps apart, where no pixel is ever the lone one — by
 * folding near-duplicate colours together sheet-wide; `mergeColors` holds the rule, and the
 * distance is scaled OKLab, as every colour-tolerance gate measures. Calibration points, measured on
 * the armour sheet (grid 6, ink-weighted 1.5×, a budget of 64): at 12 its sixty-four colours
 * settle to thirty and every fill reads as one surface with its shading intact; by 24 it
 * reaches fourteen and begins to spend genuine shading. The range runs on to 48 anyway — six
 * colours on that sheet — because a flatter look is a style, not a mistake, and the preview is
 * beside the dial. Half the RGB range it replaced, for the reason `FILL_CLEANUP_RANGE` gives:
 * a perceptual step is about two RGB steps, so the reach is the old dial's, said honestly.
 */
export const COLOR_MERGE_RANGE = { min: 0, max: 48, step: 1 } as const;

/** The merge the tab opens with — off, as every cleanup dial opens. */
export const DEFAULT_COLOR_MERGE = 0;

/**
 * The snap-distance slider's range: how near a locked colour a colour must sit to be taken to it,
 * anything further keeping the colour it arrived with.
 *
 * In scaled OKLab, as every colour tolerance on this tab is — see `oklab.ts` — and `0` is the pass
 * not running at all, as it is on every other dial here: at zero the lock reaches nothing, so it
 * supersedes nothing either and the studio's own colour setting stands. `colorPlanFor` holds that
 * rule and says what the alternative cost.
 *
 * **The two populations this dial separates overlap, and the range is set from where.** Measured on
 * the armour sheet (grid 6, a budget of 64, ink-weighted 1.5×): a palette locked from one reading of
 * it and applied to four others — the k-centroid and dominant readings, a budget of 32, and a grid of
 * 5 — puts the median colour 0.38 from its nearest locked entry, the ninetieth percentile between
 * 3.7 and 10.3, the ninety-ninth between 9.8 and 20.4, and the furthest single colour at 38. Six
 * colours that sheet does not contain — a saturated red, cyan, orange, violet, emerald and pink —
 * sit between 20.8 and 54.5 from it. So the drift a lock exists to remove and the colours it must
 * not remove are cleanly apart at the median and overlap from about 20 to about 38, which is why
 * this is a dial and not a fixed threshold.
 *
 * The ceiling is 64 rather than the 48 the two cleanup dials stop at, because the useful span here
 * runs past theirs: at 48 the reddest of those six is still snapped, and a ceiling that cannot admit
 * a genuinely new colour would fail at the one job the gate has. It is a quarter of the 255 that
 * black to white measures.
 */
export const PALETTE_SNAP_RANGE = { min: 0, max: 64, step: 1 } as const;

/**
 * The snap distance the tab opens with, and the one figure here chosen by where the two populations
 * the range's note measures actually sit.
 *
 * They are 0.4 apart at the point they meet: the highest ninety-ninth percentile of drift measured
 * was 20.4, and the nearest of the six colours the sheet does not contain was 20.8. No integer lies
 * between them, so the opening errs towards **keeping** rather than snapping. At 20, of the four
 * re-readings measured, the share of pixels the lock takes is 100% at a budget of 32, 99.96% at a
 * grid of 5, 99.80% under the k-centroid reading and 93.93% under the dominant one — 59, 60 and 63
 * of each of those sheets' 64 colours, and all 32 of the 32-colour one — while every one of the six
 * colours the sheet does not contain is left alone. What it fails to take is by definition what sits furthest from the locked palette, which is
 * what snapping would change most; keeping it costs a few extra colours and no artwork. The dominant
 * reading is the outlier of the four because it selects rather than blends, so its cells land on the
 * source's own colours instead of on tones near the locked ones.
 *
 * A lock therefore does **not** promise a colour count. Nothing but the top of the range comes close
 * to promising one, and a setting that snapped a genuinely new colour to keep a number tidy would
 * have the gate failing at the one job it has.
 */
export const DEFAULT_PALETTE_SNAP = 20;

/**
 * The outline-expansion slider's range, `0` meaning the pass does not run.
 *
 * In **source pixels**, so a thickness of `n` widens a contour by `n` on each side and the drawn
 * line a cell is asked to resolve becomes `2n + 1` wide. That makes it the one dial on this tab
 * whose unit is the sheet's own resolution rather than a colour distance, and the reason it is a
 * small integer ladder rather than a continuous slider: there is no position between one pixel and
 * two.
 *
 * The ceiling is 4 because the useful range ends well before it, and the floor of usefulness is 1.
 * Measured on the reference sheet at a grid of 6 — the full figures and the two metrics are in
 * `outlineExpansion` — thin-line survival climbs 29.5 → 43.5 → 54.4 → 60.4 → 64.1% across 0 to 4
 * while surface loss climbs 0.39 → 2.89 → 5.71 → 8.03 → 10.70%, so the first step buys fourteen
 * points of the first for two and a half of the second and every step after it buys less. The
 * range runs on anyway, because a sheet drawn at a coarser scale or with thinner contours than this
 * one will want more, and the preview is beside the dial.
 */
export const OUTLINE_EXPANSION_RANGE = { min: 0, max: 4, step: 1 } as const;

/**
 * The expansion the tab opens with — off, as every pass that changes the artwork opens.
 *
 * **Not the measured knee, which is 1, and the difference is deliberate.** This pass moves pixels
 * the reader did not ask to have moved: even at 1 it thickens every contour on the sheet, and it
 * takes the sheet's ink share from 14.2% to 17.0% where the reduction alone had it at 15.8%. That is
 * the right answer for a sheet whose outlines are breaking up and the wrong one for a sheet that came
 * back clean, and nothing here can tell which arrived — the same argument the background keying opens
 * off on. The guidance names the symptom to raise it for, and the preview beside the dial is where
 * the judgement gets made.
 */
export const DEFAULT_OUTLINE_EXPANSION = 0;

/**
 * How many refinement passes the k-centroid reading's two clusters take per cell.
 *
 * Two clusters over at most a few dozen pixels settle almost immediately — the seeds start at the
 * cell's luma extremes, which is most of the answer — so this is a determinism bound, not a
 * convergence hope: the same cell always takes the same passes and lands on the same centres.
 * Eight is comfortably past where any cell this size still moves.
 */
export const K_CENTROID_PASSES = 8;

/**
 * The Downscale control's options, in the order offered — the identifier the pipeline stores, and
 * the label the select shows.
 *
 * Three genuinely different readings rather than variants of one: the standard vote *selects* a
 * colour the cell already contains, and the other two *average* — which is why the pipeline
 * applies the colour reduction after them rather than before. The labels' parentheticals carry
 * the choosing half, per the select budget's rule; what each reading is for lives in
 * {@link QUANTISE_TOOLTIPS}.
 */
export const VOTE_METHOD_CHOICES = [
  { value: 'DOMINANT', label: 'DOMINANT (standard vote)' },
  { value: 'INK_WEIGHTED', label: 'INK_WEIGHTED (keeps outlines)' },
  { value: 'K_CENTROID', label: 'K_CENTROID (cluster average)' },
] as const;

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
 * How many steps of a `DifferenceMap` cell stand for one unit of scaled-OKLab distance.
 *
 * The map is one figure per pixel of a result that reaches {@link MAX_IMAGE_PIXELS} at a grid of 1,
 * so it is held as `Uint16Array` rather than as floats — two bytes instead of four, which is
 * thirty-three megabytes instead of sixty-seven on the largest sheet the tab admits.
 *
 * A power of two, so the conversion is exact in both directions, and **this** power of two because
 * it is the smallest that cannot band at the finest rung the scale offers. `heatmapImage` resolves
 * the ramp to 256 levels, and {@link DIFFERENCE_SCALES} opens at a ceiling of 4 — so 4 × 64 is 256
 * stored steps spread across 256 levels, one apiece. At 32 steps to the unit that rung would have
 * half the values it can show and every other level would be unreachable.
 *
 * It also cannot overflow, which matters more than the resolution does: a `Uint16Array` **wraps**
 * rather than clamping, so a distance past 1023.98 would come back small — a dark cell exactly
 * where the sheet was at its worst, which is the one failure a heatmap cannot be read through. No
 * distance can exceed the diagonal of OKLab's own bounding box over the sRGB cube with the alpha
 * axis added — L spans 255 and each chroma axis about 130, which with 255 of coverage comes to a
 * little under **405**. That is two fifths of the range, and `differenceMap.test.ts` re-derives it
 * from the cube rather than restating it.
 */
export const DIFFERENCE_PRECISION = 64;

/**
 * The distances the difference mode offers as the top of its ramp, in the order the control shows
 * them.
 *
 * A ladder rather than a slider, as the zoom and the keying tolerance are, and for a plainer reason
 * than either: the scale is a way of *looking*, so what it wants is a handful of settled rungs a
 * reader can go back and forth between, not a continuum they have to re-find.
 *
 * The rungs are read off the reference sheet (`armour.png`, 1254², grid 6, the standard vote, a
 * budget of 64, no keying), where the per-cell distance runs p50 **0.66**, p75 10.3, p90 54.8, p99
 * 120.8 and peaks at 180 — roughly seven cells in ten near-exact, and a tail that is the sheet's
 * edges. Against that: **4** grades the near-exact seventy per cent and saturates the rest, **32**
 * is the default because it puts the whole of what a dial moves across the ramp — a second cleanup
 * pass shifts 396 cells by up to 25 — and **128** is the rung a *keyed* sheet needs, where a
 * silhouette cell whose coverage flipped scores past 200 on the alpha axis alone.
 */
export const DIFFERENCE_SCALES = [4, 8, 16, 32, 64, 128] as const;

/** Where the difference scale opens — see {@link DIFFERENCE_SCALES} for what the rung is worth. */
export const DEFAULT_DIFFERENCE_SCALE = 32;

/**
 * Where the wipe's divider opens, and how far each key press moves it.
 *
 * The middle, because a comparison opens with neither side favoured — and because a divider parked
 * at an edge shows one image and reads as a broken frame rather than as a control waiting to be
 * dragged.
 *
 * The two steps are the ARIA slider pattern's fine and coarse rungs. One per cent is a pixel or two
 * at the widths this frame takes, which is the resolution a reader wants for lining the divider up
 * against a contour; ten is what crosses the frame in ten presses, and is what `Shift` and the page
 * keys reach.
 */
export const DEFAULT_WIPE = 0.5;
export const WIPE_STEP = 0.01;
export const WIPE_STEP_COARSE = 0.1;

/**
 * The tolerances the keying control offers, as the distance `keyDistanceSquared` measures.
 *
 * **A ladder rather than a slider**, and the reason is the pipeline: every pass in it is linear in an
 * image that may be {@link MAX_IMAGE_PIXELS}, so a range input would recompute the whole transform on
 * every pointer move of a drag. Stepped values reach the same range in one click each, and match what
 * this tab already does twice over — the zoom levels and the grid candidates.
 *
 * `0` is on the ladder because "exact match only" is a real request, and it is the one setting that
 * also switches the fringe pass off (which is scaled from this number). The values are scaled-OKLab
 * distances, as `keyDistance.ts` measures. Against the recommended magenta they read: **8** takes a
 * field that only re-encoding moved (about 1.4), **16** takes most of one the generator painted at
 * varying purity (its fixtures run 12 to 21), **24** takes the whole of it — shaded and washed to
 * half included — with a margin, **32** is the last rung short of the artwork, and **64** is past
 * where the nearest hues that are *not* the key begin — rose and purple measure 40 and 49 — so it
 * is a rung to reach for once and check the sprite against, not one to sit at. The top rung is
 * also where a black key does its work: OKLab spreads the dark greys apart, so a drifted black
 * field that RGB called near costs more of the scale to reach — see `DEFAULT_KEY_TOLERANCE`.
 */
export const KEY_TOLERANCES = [0, 8, 16, 24, 32, 64] as const;

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
 * 24 rather than a tighter rung because a field the generator *painted* — the ordinary case, not the
 * bad one — measures up to about 21 once the shading latitude is applied, and the rung below it
 * leaves the deepest of that drift on screen. The nearest artwork colours sit at 40 and above, so
 * this keeps a rung of margin.
 *
 * **`PURE_WHITE` and `PURE_BLACK` get no latitude at all**, so for them this is a plain distance —
 * now the plain OKLab one: a white key reaches greys down to about `#E0E0E0`, while a black key
 * reaches only a few steps up, because OKLab spaces the dark greys as far apart as a reader sees
 * them where RGB crowded them together. A black key that needs to swallow a drifted dark field
 * wants the ladder's top rung, which reaches to about `#212121` — and that asymmetry is the space
 * telling the truth, not the ladder failing: differences near black are visible in a way the same
 * byte distance near white is not. Those two keys share their colour with real artwork whatever
 * the metric, so the tab's guidance — raise it until the field goes, stop before the sprite does —
 * is where the stopping point is judged; `keyDistance.ts` says why they are held to the straight
 * measurement.
 */
export const DEFAULT_KEY_TOLERANCE = 24;

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
 * A factor with nothing above it is not a threshold, it is a ramp off the end of the scale: at the
 * ladder's top rung the product is 192, which against a magenta key reaches past every colour the
 * sprite could be made of — rose and purple sit at 40. So the loosest settings on the ladder eroded
 * a pixel of *everything* that touched the field — the sprite's whole contour, whatever colour it
 * was — while the panel described a one-pixel edge clean-up. Nothing failed; the sheet simply came
 * back a pixel thinner on every silhouette, which is indistinguishable from the artwork having been
 * drawn that way.
 *
 * 32 is fixed by the two things the pass has to sit between, and it is the second of them that is
 * load-bearing. Measured across every art colour it could be blending with, a pixel three-quarters
 * key sits **at most 21** from it, so a ceiling above that admits every one — the halo goes. And
 * the nearest colours to the recommended magenta that are *not* its own hue are rose and purple at
 * **40**, so a ceiling below that reaches no unblended artwork. 32 is between them.
 *
 * **It does not, and should not, exclude the blends nearer half.** Those run from about 13 to 40
 * depending on what the key is blending with, so this admits many of them — which is the pass working
 * rather than overrunning: a pixel half made of the key colour and touching the field *is* halo. The
 * bound that keeps it honest is the 40 above, not a claim about what fraction of key a pixel holds.
 *
 * Above the rung where this binds, the field's own radius has overtaken it and the fringe pass has
 * nothing left to add — every pixel it could reach, pass 1 has already marked.
 */
export const FRINGE_TOLERANCE_CEILING = 32;

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
      'the two previews stay on the same part of the sheet at the same magnification. Judge an edge at 4× or 8×, lay the two over one another and drag the divider to see the same pixels before and after, and switch to the difference map when a dial’s effect is too small to see.',
  },
  {
    title: 'Lock the palette, if this sheet is one of a series',
    detail:
      'the colours of a sheet you are happy with can be held and applied to the sheets that follow, so a character’s armour is the same green on the walk sheet and the run sheet. Drop the next sheet in afterwards — the lock survives it, which is the whole point of it.',
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
  previewMode:
    'Which of three ways the result is shown. Side by side is the pair of frames, each on the same part of the sheet at the same magnification. Wipe lays them over one another in a single frame under a divider you can drag, so the very same screen pixels can be seen before and after. Difference replaces the result with a map of what the reduction cost: one mark per drawn pixel, coloured by how far that pixel ended up from the patch of the sheet it stands for — dark where it is faithful, green then gold as it drifts, red where it has lost what it replaced. It changes only what this panel draws; the result, the download and everything stored are the same in all three.',
  differenceScale:
    'How large a difference has to be to reach the top of the heatmap’s ramp, measured the way every colour tolerance on this tab is. Lower rungs grade the differences a sheet is mostly made of — on a typical sheet six drawn pixels in ten sit under 1 — and paint everything coarser than the rung in red. Higher rungs flatten those to dark and keep the ramp for the edges, where a patch that straddled a contour never had one colour to be reduced to, and for keyed sheets, whose silhouettes score past 200 wherever transparency landed differently from the artwork. The scale is fixed rather than fitted to each sheet on purpose: a ramp that re-scaled itself when you moved a dial could not be compared with the one you were looking at a moment ago.',
  wipe: 'Drag this to move the divider between the sheet as it arrived, on its left, and the quantised sheet on its right. Both are drawn at the same magnification on the same part of the sheet, so the pixels immediately either side of the divider are the same pixels before and after — which is what makes a change of a single shade findable. It can also be moved with the arrow keys once it has focus, and dragging anywhere else in the frame pans both images together as usual.',
  // Where panning is named. The grab cursor only appears once a pointer is already over the image,
  // so it teaches nobody on a touchscreen, and nobody working from the keyboard. The middle sentence
  // is the other thing nothing on screen says: the panes are linked, and moving one moves both.
  zoom: 'How many screen pixels one image pixel is drawn as. Magnifying never resamples — one pixel becomes a square of them. Both previews stay on the same part of the sheet at the same magnification, so moving one moves the other. When a preview is larger than its frame, drag it with the left mouse button or a finger to move around it, or give it focus with Tab and use the arrow keys.',
  keying:
    'Replaces the background key with transparency, so the sheet can be imported without a colour field behind it. The colour comes from the studio, which is where the prompt stated it. Anti-aliased edges carry blends of that key, and at any tolerance above exact the pixel touching the field is eroded with it — against a black or white key that will take some of the artwork’s own contour, which is why magenta is the recommended key.',
  keyTolerance:
    'How far a pixel may sit from the key colour and still count as background. A returned sheet is almost never the exact colour that was asked for, so exact usually keys nothing. Where the key has a colour of its own — magenta, as recommended — the distance is measured with that colour’s own kind of variation discounted: a pixel that is the key shaded darker or washed paler counts as roughly half as far away as one that has drifted to a different colour, which is what lets the field go without the sprite going with it. A white or black key has no colour to preserve, so it is measured straight and wants a closer eye. Raise it until the field goes and stop before the sprite does. It also sets how far the edge clean-up reaches, so at exact there is none.',
  vote: 'How each patch of the sheet is read down to its one pixel. DOMINANT takes the patch’s most common colour — and, once a colour reduction is in force, keeps a near-black outline or bright trim even as a minority. It never invents a colour, so it is the standard choice. INK_WEIGHTED darkens each patch toward the line crossing it, the way a pixel artist draws an outline as a darker shade of the thing outlined — the strongest choice for a sheet whose contours break up, at the cost of blending colours the image never contained. K_CENTROID averages only the patch’s dominant colour cluster, a middle ground that keeps hue smooth but lets a thin line lose its patch. It changes only the quantised result — the prompt, the studio and everything stored stay as they are — and the two averaging readings still honour the studio’s colour setting, applied to the result they produce.',
  outlineExpansion:
    'How far a drawn line is thickened before the sheet is read down to pixels. A contour one drawn pixel wide is a minority inside the patch it crosses, so the patch resolves to the surface behind it and outlines come back broken. This pass grows whichever side of the local contrast the artwork was drawn with — dark ink where the art is dark on light, bright trim where it is light on dark, judged separately for each part of the sheet — so a line still holds enough of its patch to survive being read. It shapes what every reading is handed, so it applies whichever one the Downscale control has in force. Transparency is left exactly where the background key left it, and every colour it produces is one the sheet already contained. Off leaves the sheet as it arrived. Raise it when contours come back dashed — 1 is enough on a typical sheet, and each step past it thickens more than it rescues — and back off when fine detail starts to close up or shapes begin to look drawn rather than rescued.',
  lineStrength:
    'How hard the ink-weighted reading pulls a patch toward the line crossing it. At 1× a line darkens its patch only by the share it actually holds, which reads as shading; sliding up makes a qualifying line claim more of the patch, so contours come out more defined at the cost of thicker-looking darks. It appears only while the Downscale control is set to the ink-weighted reading, because the other readings do not blend. Slide it up when outlines still look faint, and back when dark areas start to swallow detail.',
  trimStrength:
    'How hard the ink-weighted reading pulls a patch toward a bright trim crossing it — the highlight mirror of the line strength, for gold edging and rim light. At 0 highlights are left entirely to the plain blend, which is the safer opening because generators bloom highlights outward where they thin dark lines, so a sheet often wants ink pulled hard and trims left alone. A dark line takes its patch first where both cross it. It appears only while the ink-weighted reading is chosen; slide it up when bright edging fades out of the result.',
  inkThreshold:
    'How dark a pixel must read before the ink-weighted reading may count it as line ink. The default is the darkest quarter of the tonal range, shared with the standard vote’s line rescue. Lower it to restrict the pull to truly black strokes; raise it when the artwork outlines in dark colours rather than black. Whatever the threshold, shading is protected separately — a patch’s dark mass must also sit a full tonal range below the body it crosses before anything pulls — but past the point where a sheet’s own shadows qualify, watch the preview. It appears only while the ink-weighted reading is chosen.',
  colorMerge:
    'How far apart two colours may sit and still be folded into one across the whole sheet. Reduced fills often dither between several near-identical palette entries — greens a dozen steps apart that read as one surface — and no pixel-level cleanup can settle that, because no pixel is ever the lone odd one out. Colours are ranked by use, and each folds into the most-used surviving colour within the distance, everywhere at once, so a panel becomes one green. It also makes the fill cleanup below far more effective, since settled fills can finally form majorities. A palette pinned in the studio, or locked from an earlier sheet, is exempt — its entries are your statement of which colours are distinct, and folding two of them here would edit the palette the rest of the series is mapped onto. Off keeps every colour the reading produced; raise it until fills read as surfaces, and back off when real shading, or a dark outline against a dark fill, starts to fold.',
  fillCleanup:
    'How far apart two colours may sit and still be merged when a pixel disagrees with its neighbours. Flat fills often come back speckled — neighbouring pixels land on near-identical colours with no perceptual difference — and this pass snaps such a pixel to its neighbourhood’s most common colour, but only when most of the neighbours it has already agree and the colours are within this distance. Off leaves the result exactly as the reading made it. It changes colour only, never transparency, and a line sits far outside the whole range, so linework is never merged. On a densely dithered sheet run the colour merge first — settled fills are what let majorities form — then raise this until stray pixels go, and back off if close shades begin to fuse.',
  cleanupPasses:
    'How many times the fill cleanup runs over its own output. One pass settles every pixel that already disagreed with a settled neighbourhood; a pixel two deep in a speckled patch only becomes the lone odd one out after its neighbour has settled, which the next pass picks up. Each pass stops early when nothing changed, so a high setting costs nothing on a sheet that settles quickly. It does nothing while the fill cleanup itself is off.',
  paletteSnap:
    'How near a held colour a colour in this sheet has to sit to be taken to it. Anything further away keeps the colour it arrived with, which is what stops the lock flattening a gem, a flame or a faction trim the sheet you locked from never had. Measured the way every colour distance on this tab is. Off means the lock reaches nothing, and the studio’s own colour setting decides the sheet’s colours as it would with no palette held. The default sits between the two things this has to tell apart on the sheet the dials were tuned against — the drift between two readings of one subject, and a colour that is genuinely new — and those overlap, so raise it when a shade that should have matched comes through as its own, and lower it when a new colour is swallowed by the palette.',
  downloadScale:
    'How many file pixels one drawn pixel is written as when the sheet is saved. 1× is the sheet’s own size — one file pixel per drawn pixel, which is what an engine imports. The larger rungs write the same pixels as solid squares, never resampled, for a copy a reader can see without magnifying it first; reducing such a file by the same factor gives back the 1× sheet exactly. It changes only the saved file — the previews, the prompt and everything stored stay as they are — and a rung whose file would outgrow the largest image this tab accepts is not offered for that sheet.',
} as const;
