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
 * The Dither control's options, in the order offered — the identifier the pipeline stores, and the
 * label the select shows.
 *
 * Four positions rather than a dial, because a pattern is a *kind* of thing rather than a quantity:
 * there is no position between a 4 × 4 matrix and an 8 × 8 one. `NONE` leads, and is the off
 * position every other control on this tab spells as a zero — the pass does not run at all.
 *
 * **The colour decision is the same under all three patterns, and only the tile differs.** That is
 * not a cheap tier and a quality tier collapsed into one, but the result of measuring both: the classic
 * threshold form was defined for a palette that is a uniform lattice, and a sprite palette is a
 * list, so the arbitrary-palette search (`mixingPlan`) is what every pattern here needs. Memoised
 * per distinct colour it costs the same for all three — see the reference-sheet figures under
 * {@link DITHER_SHORTLIST} — so a cheaper tier would have been a worse result at no saving.
 *
 * What separates the patterns is what the eye does with them, measured on the reference sheet
 * (`armour.png`, grid 6, the standard vote, no keying, the cleanup dials off, the resolved sheet
 * 211 × 209) as the mean scaled-OKLab distance from that resolved sheet: per pixel, then over
 * aligned 4 × 4 and 8 × 8 blocks averaged in linear light. The second pair is what a dither is
 * *for*, since a pattern trades per-pixel accuracy for a local average.
 *
 * ```
 * budget 64      flat 1.85 / 0.78 / 0.48   BAYER_4 2.10 / 0.72 / 0.43   BAYER_8 2.12 / 0.73 / 0.43   BLUE_NOISE 2.12 / 0.73 / 0.42
 * budget 32      flat 2.61 / 1.07 / 0.71   BAYER_4 2.94 / 1.14 / 0.72   BAYER_8 2.97 / 1.16 / 0.74   BLUE_NOISE 2.95 / 1.14 / 0.74
 * budget 8       flat 5.62 / 2.72 / 1.90   BAYER_4 6.23 / 2.54 / 1.71   BAYER_8 6.27 / 2.58 / 1.80   BLUE_NOISE 6.27 / 2.59 / 1.75
 * Game Boy       flat 92.3 / 89.2 / 91.1   BAYER_4 94.2 / 85.1 / 87.3   BAYER_8 94.2 / 85.1 / 87.3   BLUE_NOISE 94.2 / 85.2 / 87.3
 * Mega Drive     flat 6.59 / 4.44 / 4.11   BAYER_4 9.31 / 1.73 / 1.29   BAYER_8 9.31 / 1.76 / 1.30   BLUE_NOISE 9.29 / 1.92 / 1.22
 * Master System  flat 9.82 / 6.03 / 5.03   BAYER_4 15.0 / 2.91 / 1.91   BAYER_8 14.9 / 3.11 / 2.03   BLUE_NOISE 14.7 / 3.33 / 1.89
 * ```
 *
 * Three things to read out of that, and one of them is an admission. **The per-pixel figure always
 * rises**, because every pattern moves pixels off their nearest colour on purpose. **The block
 * figures fall on five of the six cases**, and by most on the two channel-depth machines — a third
 * of the flat step's error over 8 × 8 blocks — which is unsurprising, since a lattice is what
 * ordered dithering was invented for. **Budget 32 is the sixth, where they do not fall at all**
 * (0.71 flat over 8 × 8 blocks against 0.72 to 0.74 dithered), and nothing here explains it: a
 * budget of 64 is a *larger* palette and its figures do fall, so whatever separates the two rows it
 * is not simply how much colour the palette is short of. It is recorded rather than reasoned about.
 *
 * The choice between the three patterns is about what each *looks* like rather than about fidelity.
 * They are not identical — the Master System's 4 × 4 figure spreads 0.42 across them — but that
 * spread is an eighth of the 3.1 between the flat step and the best of them, so it is not what a
 * reader should be choosing on.
 *
 * The labels' parentheticals carry the choosing half, per the select budget's rule; what each
 * pattern is for lives in {@link QUANTISE_TOOLTIPS}.
 */
export const DITHER_CHOICES = [
  { value: 'NONE', label: 'NONE (no dithering)' },
  { value: 'BAYER_4', label: 'BAYER_4 (ordered, 4 × 4)' },
  { value: 'BAYER_8', label: 'BAYER_8 (ordered, 8 × 8)' },
  { value: 'BLUE_NOISE', label: 'BLUE_NOISE (void-and-cluster)' },
] as const;

/**
 * Where the dither opens — off, as every pass that changes the artwork on this tab opens.
 *
 * A dither is a *style*, and the figures above say so: it costs per-pixel accuracy everywhere and
 * buys a better local average only where the palette is too small for the sheet. Nothing here can
 * tell which sheet arrived, and the reader is the one who knows whether they want a visible pattern
 * in their artwork at all — the same argument the outline expansion and the background keying open
 * off on.
 */
export const DEFAULT_DITHER = 'NONE';

/** The tile edge each Bayer pattern names, which is also the square root of its rank ladder. */
export const BAYER_EDGES = { BAYER_4: 4, BAYER_8: 8 } as const;

/**
 * The edge of the generated blue-noise tile.
 *
 * 64 is what makes the pattern unfindable: the tile repeats across the sheet, so its edge is the
 * distance at which a reader could in principle see the same arrangement twice, and the reference
 * sheet's 211 pixels hold three of them. Smaller tiles repeat often enough to read as a texture,
 * which is the one thing this pattern exists not to do; larger ones cost the generator time
 * quadratically — the ranking scans the whole tile once per rank — for a repeat nobody was going to
 * find anyway.
 */
export const BLUE_NOISE_TILE = 64;

/**
 * How many ratios the blue-noise tile's 4,096 ranks are folded into.
 *
 * The same ladder the 8 × 8 matrix has, and deliberately: a mixing plan is searched over whole
 * `k / levels` ratios, so 4,096 levels would be sixty-four times the search for mixtures no palette
 * pair has that many distinguishable versions of. Folding in blocks of sixty-four leaves every level
 * holding exactly 64 of the tile's positions, which is what keeps the even spread the ranking was
 * computed for. `ditherMatrix.test.ts` pins the fold; `voidAndCluster.test.ts` pins the spread it
 * carries, on both sides of the halfway point.
 */
export const BLUE_NOISE_LEVELS = 64;

/**
 * The spread of the Gaussian the void-and-cluster ranking measures crowding with, in tile pixels.
 *
 * Ulichney's own figure. It is the one number in that algorithm with a free choice in it, and what
 * it decides is the scale at which "too close together" is judged: much narrower and only immediate
 * neighbours repel, which leaves clusters two pixels across; much wider and the field flattens, so
 * the search for the tightest cluster stops discriminating.
 */
export const BLUE_NOISE_SIGMA = 1.5;

/**
 * The seed the opening scatter is drawn from.
 *
 * Any value gives a valid tile — the ranking moves every clustered point into the largest void until
 * the arrangement stops changing, so the scatter it opened from is mostly forgotten. What matters is
 * that there *is* one, fixed: a positional dither whose tile differed between two runs would put a
 * different pattern on two sheets of one series, which is the failure the whole approach exists to
 * avoid.
 */
export const BLUE_NOISE_SEED = 20260821;

/**
 * The share of the tile the opening scatter fills before the ranking begins.
 *
 * A tenth, as Ulichney has it. The prototype pattern the first phase settles is what both later
 * phases grow outward from, and it wants to be sparse enough that the largest void is unambiguous
 * and dense enough that the field has structure to read.
 */
export const BLUE_NOISE_MINORITY = 0.1;

/**
 * How many of the palette's nearest colours a mixing plan may pair.
 *
 * `mixingPlan`'s one restriction on the published search, and the measurements say it is an
 * improvement rather than a compromise. Swept on the reference sheet as above — blue noise, the same
 * three figures per pixel and over 4 × 4 and 8 × 8 blocks:
 *
 * ```
 *              2                    3                    4                    6                    8              unrestricted
 * budget 64  1.76 / 0.73 / 0.45   2.12 / 0.73 / 0.42   2.40 / 0.81 / 0.47   2.86 / 0.93 / 0.53   3.24 / 1.03 / 0.58   7.06 / 2.20 / 1.14
 * budget 16  3.59 / 1.41 / 0.92   4.27 / 1.47 / 0.94   4.73 / 1.54 / 0.99   5.52 / 1.75 / 1.09   6.21 / 2.00 / 1.22   8.39 / 2.32 / 1.30
 * budget 8   5.61 / 2.51 / 1.71   6.27 / 2.59 / 1.75   6.98 / 2.64 / 1.77   7.97 / 2.75 / 1.82   8.64 / 2.83 / 1.87   8.63 / 2.83 / 1.88
 * Game Boy   92.2 / 85.4 / 87.7   94.2 / 85.2 / 87.3   94.6 / 85.3 / 87.3         —                    —             94.6 / 85.3 / 87.3
 * ```
 *
 * **The unrestricted search is the worst column wherever the palette is large enough for it to
 * matter** — 2.7× to 3.3× worse than a shortlist of 3 on the 64-colour budget, 1.4× to 2.0× at 16,
 * and level with it by 8 colours, where three of eight is most of the palette anyway (the Game Boy's
 * four make the two columns the same search). The reason is worth stating because it is not obvious:
 * a plan is optimal for the *whole tile*, and a flat region a few pixels across samples only a few
 * of the tile's positions. So a pair drawn from opposite ends of the palette — whose mixture at some
 * extreme ratio does land nearest the target — spends most of that region on one colour and puts the
 * other down as a stray pixel of something wildly different. A pair drawn from the target's own
 * neighbourhood cannot do that, whatever ratio it takes.
 *
 * **3 rather than 2 is a genuinely close call, and the figures alone do not settle it.** 2 is the
 * quieter per-pixel figure everywhere and the better 8 × 8 figure at budgets 16 and 8, by about 2%;
 * 3 is the better 8 × 8 figure at budget 64 by 7% and on the four-colour Game Boy by 0.4%. What
 * decides it is structural rather than measured: with two candidates there is exactly one pair, so a
 * target whose two nearest entries lie the *same* side of it has no mixture that can reach it and the
 * plan falls back to a flat colour. A third candidate is the smallest shortlist that can straddle,
 * which is why the two palettes where 3 wins are the largest and the smallest measured.
 *
 * **What it costs is a scan of the whole ratio ladder per pair**, which for the resolved reference
 * sheet — 44,099 pixels carrying 10,031 distinct colours — is the same order as one of the cleanup
 * passes, and which grows with the *distinct colours* of a sheet rather than with its pixels. A grid
 * of 1 is where that bites: the sheet arrives with 218,978 of them, and the plan search is then the
 * most expensive pass in the pipeline. Wall-clock figures are deliberately not stated — they move by
 * several times between runs on one machine — but the shape is: three pairs, `levels` rungs each,
 * once per distinct colour.
 */
export const DITHER_SHORTLIST = 3;

/**
 * How many candidates a channel-depth lattice offers a mixing plan: the corners of the cell the
 * colour falls in, which is two rungs per channel.
 *
 * Both a bound and an override. A lattice has hundreds of thousands of points and no list to search,
 * so the candidates are worked out per colour rather than per palette — and these eight are the only
 * points a mixture could usefully be made from, being exactly the pair per channel that the classic
 * threshold dither for a bit-depth reduction chooses between.
 *
 * **All eight are paired, rather than the nearest {@link DITHER_SHORTLIST} of them**, because
 * nearness is the wrong ordering on a lattice. Measured on a mid grey against the Master System's
 * two bits: of the eight corners around it, the one raising a single channel is much the nearest and
 * the diagonal corner raising all three is the *furthest* — and the diagonal is the only one whose
 * mixture stays neutral. Drawn from the three nearest, a grey of 100 came back dithered between grey
 * and *red*, which is a visible fault rather than a lost fraction of accuracy. Correcting it is what
 * takes the two machine spaces in {@link DITHER_CHOICES}'s table from roughly the flat step's error
 * over 8 × 8 blocks to a third of it.
 *
 * Eight candidates is twenty-eight pairs where a list palette's three are three, so the lattice arm
 * costs an order more per distinct colour — which it can afford precisely because its candidate set
 * is worked out per colour and is this small, where a list palette's is up to 128 and could not be
 * paired exhaustively at all.
 */
export const DITHER_LATTICE_CORNERS = 8;

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
 * The sprite-gap slider's range: how far apart two pieces of artwork may sit and still be counted
 * as one sprite, in drawn pixels.
 *
 * **`0` is not an off position**, which is what most of this tab's zeros mean. Two others depart
 * from it — the symmetry tolerance and the duplicate tolerance — and both depart differently: their
 * zeros are their passes at their strictest, where this is a pass with no off position at all. The segmentation always runs, and at
 * zero it still folds pieces whose bounding boxes overlap — a figure with an outstretched arm passes through its own torso's box
 * without sharing a pixel with it, and a reader would never want those counted as two sprites. What
 * the dial adds above zero is reach into empty space.
 *
 * The floor of usefulness is therefore 1, which takes in a piece one clear pixel away — the ordinary
 * result of keying an anti-aliased join, where the blend the fringe pass removed was all that
 * connected a pauldron to its shoulder. The ceiling is 8 because the useful range ends well before
 * it and the failure past it is silent: sprites on a returned sheet are separated by a gutter, and a
 * gap wider than that gutter folds the whole sheet into one box while reporting "1 sprite" as
 * confidently as it would report twelve. Eight drawn pixels is half the smallest edge anyone draws a
 * sprite at, so a sheet whose sprites sit that close together has no gutter to speak of.
 */
export const SPRITE_GAP_RANGE = { min: 0, max: 8, step: 1 } as const;

/**
 * The gap the tab opens with — one drawn pixel.
 *
 * The one dial here that opens engaged rather than off, and it can because it changes no pixel of
 * the sheet: it decides what a *reading* of the result counts, so an opening that is wrong costs a
 * number a reader can correct while they watch, not artwork they have to notice was altered. One
 * pixel is the reach that recovers a piece the keying separated by removing the blend between it and
 * its neighbour, which is the commonest way a sprite arrives in pieces.
 */
export const DEFAULT_SPRITE_GAP = 1;

/**
 * The fewest drawn pixels a piece of artwork must hold to be counted as a sprite rather than a
 * speck.
 *
 * Keying leaves fringe: pixels that were mostly key colour, sat just outside the tolerance, and are
 * now islands of one or two pixels along a silhouette. Counted as sprites they would swamp the
 * figure the whole reading exists to give — a sheet of twelve components reporting four hundred —
 * so anything under this is reported as a speck instead, which is a fact about the keying and worth
 * a reader seeing fall as they raise the tolerance.
 *
 * Four, because it is far below anything drawn deliberately and far above what a fringe island is. A
 * 2 × 2 block is the smallest mark a pixel artist makes that reads as a shape rather than as noise —
 * an inventory pip, a spark, a rivet — and fringe islands are one and two pixels, since three or more
 * connected pixels of near-key colour is a run the tolerance should have taken.
 *
 * **It cannot be zero, and the reason is the ceiling below rather than the merge.** With no floor
 * every stray pixel is a sprite, so an ordinary keyed sheet — which leaves fringe along every
 * silhouette — would be pushed past {@link SCATTERED_SPRITE_CEILING} by its own halo and reported as
 * scattered, when what it holds is twelve components and some fringe. The floor is what lets the
 * ceiling mean "this sheet has not been keyed" rather than "this sheet has edges".
 */
export const SMALLEST_SPRITE_PIXELS = 4;

/**
 * How many separate pieces a sheet may break into before the reading refuses to call them sprites.
 *
 * Two things at once, and the second is the reason for the figure. It **bounds the merge**, whose
 * rounds are quadratic in the pieces still standing, so a pathological sheet cannot turn a keystroke
 * in the grid box into minutes of work. And it **bounds the claim**: past some count, "sprites" is
 * the wrong word for what was found, and a number a reader would act on — a component count, an
 * atlas plan — must not be produced from a sheet that plainly has not been keyed into anything.
 *
 * 512 is far above every real sheet and far below any pathology. `PRACTICAL_COMPONENT_CEILING`
 * bounds one generation at 43 components, and a sheet of animation frames reaches perhaps a couple
 * of hundred; a sheet whose field survived the key runs to tens of thousands of islands. Nothing
 * legitimate sits between.
 */
export const SCATTERED_SPRITE_CEILING = 512;

/**
 * How far either side of a sprite's bounding-box centre the mirror-axis search looks, in drawn
 * pixels.
 *
 * A tight bounding box centres a symmetric sprite exactly, so the centre is where the answer is
 * unless something asymmetric widened the box — and an appendage sticking `d` pixels past the
 * silhouette's mirror moves the centre by `d / 2`. Eight pixels of reach therefore covers a limb,
 * a weapon or a cloak extending sixteen drawn pixels past what the other side holds, which is well
 * past anything a sprite drawn at 16 to 64 pixels a side can carry. The reference sheet
 * (`armour.png`, 1254², grid 6) separates into fifteen pieces measuring 24 to 35 drawn pixels
 * across, where the quarter-width bound below is the binding one on all but the widest of them.
 *
 * It is a **bound on cost as much as on the claim**: the sweep is `(4 × reach + 1)` scorings of a
 * whole box, so an unbounded search would be quadratic in the widest sprite on the sheet while a
 * bounded one is linear in the sheet. `symmetryAxis` narrows it further to a quarter of the box's
 * own width, since a candidate further out than that pairs up less of the sprite than it leaves
 * unpaired.
 *
 * An axis genuinely further out comes back as a **low confidence about the centre**, which is the
 * honest report: the pass says it did not find symmetry, rather than naming an axis it did not test.
 */
export const SYMMETRY_AXIS_SEARCH = 8;

/**
 * The Symmetry control's options, in the order offered — the identifier the pipeline stores, and the
 * label the select shows.
 *
 * Three positions rather than a checkbox, because measuring and rewriting are different acts and the
 * gap between them is the safety of the whole feature: `CHECK` tells a reader what their sheet is,
 * and `SNAP` acts on it. A single toggle would make finding out and being changed the same button.
 */
export const SYMMETRY_MODE_CHOICES = [
  { value: 'OFF', label: 'OFF (no symmetry reading)' },
  { value: 'CHECK', label: 'CHECK (report the axis)' },
  { value: 'SNAP', label: 'SNAP (settle mirrored pairs)' },
] as const;

/**
 * Where the Symmetry control opens — off, as every pass on this tab that changes artwork opens.
 *
 * It opens off for a stronger reason than the others, though, and the reason is about the subjects
 * rather than about the cost: **held items, drawn weapons and one-sided gear are legitimately
 * asymmetric.** A sword in the right hand, a single pauldron, a quiver over one shoulder, a bag on
 * one hip — each is the thing that makes the subject that subject, and each is exactly what a
 * mirror-pair vote would fold away. Nothing here can tell a drifted highlight from a deliberate
 * asymmetry, so the reader is the one who says whether their sheet was meant to be symmetric at all.
 */
export const DEFAULT_SYMMETRY = 'OFF';

/**
 * The symmetry tolerance's range: how far two mirrored pixels may sit apart and still count as
 * agreeing, in the scaled-OKLab units every colour dial here is stated in.
 *
 * **`0` is the strictest position rather than an off position**, which the duplicate tolerance's
 * zero also is; the sprite gap's zero is a third departure of a different kind, being a pass that
 * has no off position at all rather than one at its tightest. At zero a pair agrees only where the two pixels are identical,
 * which is what a flat-coloured sheet from a clean generator can actually reach. The Symmetry
 * control's own `OFF` is what stops the pass running.
 *
 * The ceiling is 64 because past it the figure stops separating anything: a quarter of the
 * black-to-white span already admits a mid-tone against its own shadow, and a tolerance that admits
 * a shadow admits most of what a returned sprite's two halves disagree about. Measured on the
 * reference sheet, whose fifteen armour pieces are drawn at several angles and are asymmetric by
 * subject, the mean share reported rises from **39%** at exact to **72%** at 64 — near-symmetry
 * claimed for a sheet that holds none, which is what would leave the floor below nothing to refuse.
 *
 * **What the dial is worth depends entirely on how flat the sheet already is**, and the reference
 * sheet measures both ends of that. Reduced to 64 colours with the colour merge at 24 it settles to
 * eleven colours, and every rung from exact to 24 reports the identical **38.6%** — the merge has
 * already folded everything within 24, so no two mirrored pixels are left sitting between it and
 * exact. The same sheet read with no reduction and no merge holds 12,026 colours, where exact
 * reports **0.6%** and the rungs climb smoothly: 8.0% at 2, 15.1% at 4, 24.4% at 8, 35.8% at 16,
 * 53.2% at 32.
 */
export const SYMMETRY_TOLERANCE_RANGE = { min: 0, max: 64, step: 1 } as const;

/**
 * Where the symmetry tolerance opens — see {@link SYMMETRY_TOLERANCE_RANGE} for the units and for
 * the sweep behind this figure.
 *
 * Eight is the rung that behaves sensibly at both ends of that sweep. On a **reduced** sheet it is a
 * no-op, and rightly so: the colours are flat and far apart, so exact equality is the question worth
 * asking and anything short of the gap between two palette entries changes no answer. On an
 * **unreduced** one it turns a reading of 0.6% — which says nothing about the artwork and everything
 * about the resampling — into 24.4%, without reaching the 32 and above where a surface starts
 * matching its own shading.
 */
export const DEFAULT_SYMMETRY_TOLERANCE = 8;

/**
 * The confidence floor's range: the share of a sprite's mirrored pairs that must already agree
 * before `SNAP` will settle it, as a percentage.
 *
 * **It starts at 50 rather than at 0, and that floor under the floor is the point of the control.**
 * A sprite whose halves agree about half the time is not a symmetric sprite with drift in it, it is
 * an asymmetric subject — and offering a position that would snap one is offering to delete the
 * sword. The top of the range is 100, which settles only sprites already exactly symmetric within
 * the tolerance; that sounds like a position that does nothing and is not, because the pass still
 * *reports* every sprite and the reader can watch which of them reach it.
 *
 * The reference sheet is what this was read against, and it is the awkward case rather than the easy
 * one: fifteen armour pieces drawn at several angles, none of them meant to be symmetric. At the
 * default tolerance they report **20% to 68%**, so nothing is settled at 90 or at 75; two are
 * settled at 65 and four at 60, those four being the pieces whose best axis lands on or beside their
 * own box centre. A sheet of front-facing subjects is the case the other way round, and the panel
 * lists every share so which one is in front of the reader is legible rather than assumed.
 */
export const SYMMETRY_CONFIDENCE_RANGE = { min: 50, max: 100, step: 1 } as const;

/**
 * Where the confidence floor opens — see {@link SYMMETRY_CONFIDENCE_RANGE} for the figures behind it.
 *
 * High, because the cost of the two mistakes is not symmetric: a floor set too high leaves a sprite
 * unchanged that a reader can settle by lowering it while they watch, and a floor set too low
 * rewrites a subject that was asymmetric on purpose. Nine tenths admits the drift a generator leaves
 * across a subject it did draw symmetric, and refuses every piece on the reference sheet.
 */
export const DEFAULT_SYMMETRY_CONFIDENCE = 90;

/**
 * The duplicate tolerance's range: the mean per-cell distance under which two sprites are counted
 * as one drawing, in the scaled OKLab units every colour tolerance on this tab uses.
 *
 * **A mean over a whole sprite, which is why the numbers here are so much smaller than the merge's
 * or the cleanup's.** Those two compare one colour with another, where a fold worth making is a
 * dozen units. This averages a distance over every cell of a sprite, and the cells of two frames
 * that are the same drawing are mostly identical — so what moves the figure is the share of cells
 * that differ, multiplied by how far they differ. A pair with one cell in twenty landing a whole
 * palette step apart — say 50 units — scores 2.5. A pair with one cell in ten *missing* on one side
 * scores 25.5, because a cell present on one side and absent on the other is the full 255 apart.
 *
 * So the ceiling is 24, which sits just under that second case: at the top of the range two sprites
 * whose silhouettes differ by a tenth are still two sprites. That is already well past any pair a
 * reader would call one drawing, and stopping there is what keeps the last rung meaningful rather
 * than a setting at which most of a sheet folds into itself. The step is 1 because the useful spread
 * sits in the first handful of rungs and a finer one would be a slider nobody could land on.
 */
export const DUPLICATE_TOLERANCE_RANGE = { min: 0, max: 24, step: 1 } as const;

/**
 * The tolerance the tab opens at — zero, which reports only sprites whose visible pixels match.
 *
 * One of three dials on this tab whose zero is not the pass being switched off — the symmetry
 * tolerance is the other of its kind, and the sprite gap the odd one, having no off position at all.
 * It opens at zero for
 * the reason the sprite gap opens engaged: the reading changes no pixel of the sheet, so an opening
 * that is wrong costs a number a reader can correct while they watch. What it opens *at* is the
 * finding nobody has to be persuaded of — a frame that came back byte-identical to another is a
 * frame the generator repeated, whatever anyone's tolerance for near-misses is. Everything above
 * zero is a judgement about how alike two drawings have to be, which is the reader's to make against
 * their own sheet.
 */
export const DEFAULT_DUPLICATE_TOLERANCE = 0;

/**
 * Whether the snap opens engaged — it does not.
 *
 * The one dial in this tab's control stack that **deletes artwork**: it overwrites each
 * near-duplicate with the sprite its group is named after, so whatever distinguished the two is
 * gone from the download. Every other dial here transforms the whole sheet by a rule, and this one
 * acts on a finding — a finding the reader has not necessarily looked at yet. Defaulting it on would
 * be the tab deciding that two frames a generator drew separately were a mistake.
 */
export const DEFAULT_DUPLICATE_SNAP = false;

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
 * The most pixels the whole mirror-axis sweep may visit on one sheet, across every sprite on it.
 *
 * {@link SYMMETRY_AXIS_SEARCH} bounds how far the search *wanders*; this bounds what the wandering
 * costs. The two
 * are not the same bound, and only the first of them was there at first: the sweep is `4 × reach + 1`
 * passes over each sprite, so a sheet whose subjects are large pays thirty-three passes over most of
 * the result, and pays them again on every dial the reader moves anywhere on the tab. One sprite
 * 2048 drawn pixels square is enough to turn a keystroke into seconds of work.
 *
 * **One pass over the largest sheet this tab admits**, which is what {@link MAX_IMAGE_PIXELS} is —
 * so the whole symmetry reading costs, at worst, what a single linear pass of the pipeline beside it
 * costs, and a sheet cannot be shaped in a way that makes it cost more. `symmetryAxis` divides this
 * by the sprites' combined area to arrive at a reach they all share.
 *
 * **It is filed here rather than beside the reach it bounds** only because it is stated in terms of
 * the ceiling above it, and a `const` cannot name one declared further down the file.
 *
 * **It narrows only the sheets the reach was never going to help.** The reach is eight drawn pixels
 * whatever the sprite, so it is a real correction on a subject 32 across and four tenths of one per
 * cent on one 2048 across — where an appendage would have to run a thousand pixels past the
 * silhouette's mirror before the search could reach its axis. The reference sheet's fifteen sprites
 * total 18,073 drawn pixels against this budget, so they are searched to the full eight.
 */
export const SYMMETRY_SWEEP_BUDGET = MAX_IMAGE_PIXELS;

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
    'Which of four ways the result is shown. Side by side is the pair of frames, each on the same part of the sheet at the same magnification. Wipe lays them over one another in a single frame under a divider you can drag, so the very same screen pixels can be seen before and after. Difference replaces the result with a map of what the reduction cost: one mark per drawn pixel, coloured by how far that pixel ended up from the patch of the sheet it stands for — dark where it is faithful, green then gold as it drifts, red where it has lost what it replaced. Sprites draws the result with a dashed box just outside each separate piece of artwork the keyed sheet was found to hold, which is how the count and the gap in the sprite panel are checked against the picture. It changes only what this panel draws; the result, the download and everything stored are the same in all four.',
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
  vote: 'How each patch of the sheet is read down to its one pixel. DOMINANT takes the patch’s most common colour — and, once a colour reduction is in force, keeps a near-black outline or bright trim even as a minority. It never invents a colour, so it is the standard choice. INK_WEIGHTED darkens each patch toward the line crossing it, the way a pixel artist draws an outline as a darker shade of the thing outlined — the strongest choice for a sheet whose contours break up, at the cost of blending colours the image never contained. K_CENTROID averages only the patch’s dominant colour cluster, a middle ground that keeps hue smooth but lets a thin line lose its patch. It changes only the quantised result — the prompt, the studio and everything stored stay as they are — and the two averaging readings still honour the studio’s colour setting, applied to the result they produce. The outline rescue is the one part of this that a dither switches off: a dither holds the colour reduction back to the end of the pipeline, so there is none in force while the patches are being read, and DOMINANT falls back to the plain vote it takes when no reduction was asked for.',
  outlineExpansion:
    'How far a drawn line is thickened before the sheet is read down to pixels. A contour one drawn pixel wide is a minority inside the patch it crosses, so the patch resolves to the surface behind it and outlines come back broken. This pass grows whichever side of the local contrast the artwork was drawn with — dark ink where the art is dark on light, bright trim where it is light on dark, judged separately for each part of the sheet — so a line still holds enough of its patch to survive being read. It shapes what every reading is handed, so it applies whichever one the Downscale control has in force. Transparency is left exactly where the background key left it, and every colour it produces is one the sheet already contained. Off leaves the sheet as it arrived. Raise it when contours come back dashed — 1 is enough on a typical sheet, and each step past it thickens more than it rescues — and back off when fine detail starts to close up or shapes begin to look drawn rather than rescued.',
  lineStrength:
    'How hard the ink-weighted reading pulls a patch toward the line crossing it. At 1× a line darkens its patch only by the share it actually holds, which reads as shading; sliding up makes a qualifying line claim more of the patch, so contours come out more defined at the cost of thicker-looking darks. It appears only while the Downscale control is set to the ink-weighted reading, because the other readings do not blend. Slide it up when outlines still look faint, and back when dark areas start to swallow detail.',
  trimStrength:
    'How hard the ink-weighted reading pulls a patch toward a bright trim crossing it — the highlight mirror of the line strength, for gold edging and rim light. At 0 highlights are left entirely to the plain blend, which is the safer opening because generators bloom highlights outward where they thin dark lines, so a sheet often wants ink pulled hard and trims left alone. A dark line takes its patch first where both cross it. It appears only while the ink-weighted reading is chosen; slide it up when bright edging fades out of the result.',
  inkThreshold:
    'How dark a pixel must read before the ink-weighted reading may count it as line ink. The default is the darkest quarter of the tonal range, shared with the standard vote’s line rescue. Lower it to restrict the pull to truly black strokes; raise it when the artwork outlines in dark colours rather than black. Whatever the threshold, shading is protected separately — a patch’s dark mass must also sit a full tonal range below the body it crosses before anything pulls — but past the point where a sheet’s own shadows qualify, watch the preview. It appears only while the ink-weighted reading is chosen.',
  colorMerge:
    'How far apart two colours may sit and still be folded into one across the whole sheet. Reduced fills often dither between several near-identical palette entries — greens a dozen steps apart that read as one surface — and no pixel-level cleanup can settle that, because no pixel is ever the lone odd one out. Colours are ranked by use, and each folds into the most-used surviving colour within the distance, everywhere at once, so a panel becomes one green. It also makes the fill cleanup below far more effective, since settled fills can finally form majorities. A palette pinned in the studio, or locked from an earlier sheet, is exempt — its entries are your statement of which colours are distinct, and folding two of them here would edit the palette the rest of the series is mapped onto. That exemption lifts under a dither, and for the same reason: the dither applies the palette last, so at the point this runs no pixel is a palette entry yet and there is nothing of your statement to fold. Off keeps every colour the reading produced; raise it until fills read as surfaces, and back off when real shading, or a dark outline against a dark fill, starts to fold.',
  fillCleanup:
    'How far apart two colours may sit and still be merged when a pixel disagrees with its neighbours. Flat fills often come back speckled — neighbouring pixels land on near-identical colours with no perceptual difference — and this pass snaps such a pixel to its neighbourhood’s most common colour, but only when most of the neighbours it has already agree and the colours are within this distance. Off leaves the result exactly as the reading made it. It changes colour only, never transparency, and a line sits far outside the whole range, so linework is never merged. On a densely dithered sheet run the colour merge first — settled fills are what let majorities form — then raise this until stray pixels go, and back off if close shades begin to fuse.',
  cleanupPasses:
    'How many times the fill cleanup runs over its own output. One pass settles every pixel that already disagreed with a settled neighbourhood; a pixel two deep in a speckled patch only becomes the lone odd one out after its neighbour has settled, which the next pass picks up. Each pass stops early when nothing changed, so a high setting costs nothing on a sheet that settles quickly. It does nothing while the fill cleanup itself is off.',
  paletteSnap:
    'How near a held colour a colour in this sheet has to sit to be taken to it. Anything further away keeps the colour it arrived with, which is what stops the lock flattening a gem, a flame or a faction trim the sheet you locked from never had. Measured the way every colour distance on this tab is. Off means the lock reaches nothing, and the studio’s own colour setting decides the sheet’s colours as it would with no palette held. The default sits between the two things this has to tell apart on the sheet the dials were tuned against — the drift between two readings of one subject, and a colour that is genuinely new — and those overlap, so raise it when a shade that should have matched comes through as its own, and lower it when a new colour is swallowed by the palette.',
  dither:
    'How the palette step spreads a colour the palette cannot hold across neighbouring pixels, instead of rounding every one of those pixels to the nearest entry on its own. Each pixel is written as one of two palette colours, and which of the two is decided by where the pixel sits in a small repeating tile — so one colour always lands on one pattern, in every frame of an animation and on both sides of a tile seam. That is why the pattern is positional rather than an error-diffusion dither, where each pixel’s choice depends on the pixels already drawn: a shape that moves by a pixel between two frames would come back wearing a different pattern, and the dither would crawl as the animation played. BAYER_4 and BAYER_8 are the classic ordered tiles, whose crosshatch is what reads as a retro dither — the smaller is coarser and more obvious, the larger carries four times as many mixing ratios. BLUE_NOISE spreads the same ratios with no repeating figure at all, which is the quieter choice where a crosshatch would read as texture the artwork does not have. It is offered only while a colour budget, a pinned palette or a locked palette is in force, since without a palette there is nothing for a mixture to express. Turning it on also moves the colour merge and the fill cleanup ahead of it, so those dials tidy what the reading made of the sheet rather than the pattern drawn from it — which is also why the merge stops standing aside for a pinned or locked palette while a pattern is in force. One thing it costs: the standard vote’s outline rescue needs a colour reduction to have run before the patches are read, and a dither is that reduction held back to the end, so choosing a pattern switches the rescue off. Raise the outline expansion above it, or take the ink-weighted reading, if contours start to break up.',
  spriteGap:
    'How far apart two pieces of artwork may sit and still be counted as one sprite, in drawn pixels. A subject rarely comes back as one connected shape — a sword is held clear of the hand, a shadow sits under the feet, and keying an anti-aliased join can cut a pauldron away from the shoulder it rests on — so pieces this close together are read as parts of one thing. Unlike most dials on this tab, 0 is not an off position here: the count is always taken, and at 0 pieces are still gathered where their boxes overlap, which is what keeps an outstretched arm from being counted apart from the body it reaches out of. Raise it when one subject is being counted as several, and lower it when two neighbouring subjects are being counted as one — past the width of the gutter between them, the whole sheet folds into a single box. It changes no pixel of the sheet, only the reading of it, so the download is the same file whatever it is set to. Switch the preview to Sprites to see where the boundaries were drawn.',
  symmetry:
    'Whether each sprite on the sheet is scored for vertical symmetry, and whether anything is done about it. Every separate piece of artwork the sheet was found to hold is scored against a range of candidate mirror lines, half a pixel apart, and the one its two halves agree best about is reported along with how much of the sprite actually mirrors around it. CHECK reports and changes nothing — not one pixel of the sheet, the download or anything stored. SNAP does the same and then settles the mirrored pairs of the sprites that already passed the confidence floor below, writing one colour across each pair so the two halves match exactly — whichever of the pair’s two colours has more of itself beside it inside that sprite, so a break in a contour is closed from the intact side rather than copied across to the other. It is off by default because a great many subjects are asymmetric on purpose: a sword in one hand, a single pauldron, a quiver over one shoulder, a bag on one hip. Nothing here can tell one of those from a half that simply drifted, so read the sheet with CHECK first and only reach for SNAP where the subject was meant to be symmetric. Switch the preview to Sprites to see where each axis was placed.',
  symmetryTolerance:
    'How far apart two mirrored pixels may sit and still be counted as agreeing, measured the way every colour distance on this tab is. It is what the reported confidence is a share of: raise it and more of a sprite counts as already symmetric, lower it and only close matches do. Unlike most dials here, 0 is not an off position — it is the strictest one, where two pixels have to be identical — and the Symmetry control above is what switches the pass off. How much it is worth depends on how flat the sheet already is: once a colour budget and the colour merge have settled it to a handful of flat colours, two mirrored pixels are either identical or a whole palette step apart, and every setting short of that step reports the same figure. On a sheet read with no colour reduction at all it matters a great deal, because almost no two pixels are exactly equal there and exact would report near-nothing about every sprite. The default sits where it does something on the second kind of sheet and nothing on the first, which is the right answer for both. It also decides which mirror line wins: candidates are ranked by the share of pairs that agree, and only where two of them tie does the distance across those pairs separate them. It reaches the sheet itself only through the floor below, since a tolerance that lifts a sprite past the floor is what lets a snap settle it.',
  symmetryConfidence:
    'How much of a sprite has to mirror already before SNAP will settle it. This is the control that keeps a snap off the subjects that are asymmetric on purpose — a figure holding a sword agrees with its own mirror across the body and disagrees across the whole arm, so it lands well below the floor and is reported without being touched. Lower it to snap sprites that have drifted further apart, and raise it to settle only the ones that were nearly there already. It appears only while SNAP is chosen, since under CHECK every sprite is reported and none is rewritten. Sprites that pass are named in the panel, so what a change to this admits or refuses can be watched rather than guessed.',
  duplicateTolerance:
    'How alike two sprites have to be before this reads them as one drawing. Generators repeat themselves — eight facings come back holding two of the same pose, an animation strip repeats a frame it was meant to move — and nothing else on this tab says so, because a repeated sprite is counted like any other. Each pair is laid over the other by its top-left corner and scored on the average distance between them, cell by cell, measured the way every colour distance here is — so what moves the figure is how many cells differ and by how much. Where one sprite reaches further than the other, the cells only it covers count as the widest difference there is, which is what keeps two drawings of genuinely different sizes apart. At 0 only sprites whose visible pixels match outright are grouped, which is the frame a generator handed back twice; raise it to reach the pair that came back a shade apart, and lower it when two poses that are genuinely different are being called the same. On its own it changes no pixel of the sheet — it is a reading of the result, and the download is the same file whatever it says. Switch the preview to Sprites to see the bounds it is working from.',
  duplicateSnap:
    'Rewrites every sprite the reading above grouped with the first sprite of its group, so a pose that came back three times slightly differently is written three times identically. That is what makes the repeats free downstream: one set of colours instead of three near-identical sets, one atlas cell where three were paid for, and no flicker when an animation plays through frames that were never quite the same. It changes the sheet, and it is the only control on this tab that does so by deleting artwork rather than transforming it — whatever made each copy different is gone from the download and from everything measured off it. Look at the count above before switching it on, and raise the tolerance slowly with it on so you can see which sprites are being folded. It has nothing to act on while the tolerance finds no groups.',
  presetName:
    'What this set of dial positions is called in the list below. Give it the name of the thing it suits rather than the settings it holds — the generator whose sheets need it, or the style of artwork — because the numbers are already on screen and the reason for them is not. A name that is already in the list updates that entry rather than adding a second one under the same name.',
  presetDescription:
    'An optional sentence shown under the name, for whatever the name has no room to say: which sheets you found these settings on, what they were fighting, or what to check after loading them. Leaving it empty is fine and the entry simply carries none. It has no effect on the sheet or on the dials — it is a note to yourself.',
  downloadFormat:
    'Which file the sheet is saved as. PNG is one picture of the whole sheet, and it is what an engine importer, a tile editor or an asset pipeline reads. Aseprite is an editable document: the sprites this tab found on the sheet become separate frames, each row of them becomes a tag, and the palette is carried as the document’s own, so the file opens as an animation laid out rather than as an image you have to slice by hand. Both write the same pixels at the same magnification, both keep the palette where the sheet’s colours fit one, and neither changes the previews, the prompt or anything stored. A sheet with nothing separable on it — nothing transparent to divide it, or so many pieces that none of them reads as a sprite — is still written whole, as a document of one frame.',

  downloadScale:
    'How many file pixels one drawn pixel is written as when the sheet is saved. 1× is the sheet’s own size — one file pixel per drawn pixel, which is what an engine imports. The larger rungs write the same pixels as solid squares, never resampled, for a copy a reader can see without magnifying it first; reducing such a file by the same factor gives back the 1× sheet exactly. It changes only the saved file — the previews, the prompt and everything stored stay as they are — and a rung whose file would outgrow the largest image this tab accepts is not offered for that sheet.',
} as const;
