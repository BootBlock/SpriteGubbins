import type { RenderStyle } from '../../types/rendering.ts';
import type { ResolutionProfile, StatedTargetSize, SurfaceDetail } from '../../types/output.ts';

/**
 * How the sheet is drawn, in the prose the prompt carries.
 *
 * These strings are the contract handed to the generator, not UI copy — editing one changes the
 * artwork that comes back. The render-style wording is taken verbatim from
 * `docs/todo/baseline-prompt-new.md` §2, because paraphrasing it changes the output.
 */
export const RENDER_STYLE_TEXT: Readonly<Record<RenderStyle, string>> = {
  PIXEL_ART:
    'Modern high-resolution pixel art. Deliberate pixel placement, hard edges, controlled value bands',
  RETRO_PIXEL_ART: 'Constrained 8/16-bit era pixel art with a small palette and visible chunky pixels',
  PAINTED_2D: 'Digitally painted with soft blended forms and visible brush economy',
  CEL_SHADED: 'Flat colour fills with hard-edged shadow steps and a clean ink contour',
  VECTOR_FLAT: 'Flat geometric shapes, no gradients, crisp mathematical curves',
  HAND_DRAWN_INK: 'Inked linework with hatched or flat fills, visible drawn line weight',
  RENDERED_3D: 'Rendered 3D forms with material shading and soft form shadow',
  LOW_POLY_3D: 'Faceted low-polygon forms with flat per-face shading',
  CLAY_RENDER:
    'Untextured single-material form study. Useful for validating silhouette and volume before committing to colour',
  SILHOUETTE_ONLY:
    'Solid single-colour silhouettes. A readability pass — does the shape read at target size with no internal detail?',
};

export const SURFACE_DETAIL_TEXT: Readonly<Record<SurfaceDetail, string>> = {
  MINIMAL: 'Minimal — base colour blocking and essential joints only',
  CLEAN_PRODUCTION: 'Clean production — major panels and folds, nothing finer',
  DETAILED_PRODUCTION: 'Detailed production — seams and material divisions resolved',
  TEXTURED: 'Textured — controlled surface texturing, still inside the palette limit',
};

/** The two profiles that state their scale as a *share* of a cell in the grid rather than in pixels. */
type ShareProfile = 'HIGH_RESOLUTION' | 'MID_RESOLUTION';

/**
 * The share of its own cell height the largest component fills, per rung, as the two percentages the
 * prose reads out.
 *
 * **Numbers rather than two written sentences**, so that changing a rung is one edit and the two
 * rungs stay comparable. What checks them is `tests/resolution-profile-fit.test.ts`, and it reads
 * the *compiled line* rather than this record, because what a generator acts on is the sentence and
 * not the constant behind it.
 *
 * **A cell in the grid, and never the sheet height, on every sheet the app compiles.** Both rungs
 * were once a share of the sheet height, and that frame is decided by something else in the prompt on
 * every kind of sheet there is:
 *
 * - **Where a sheet draws its unit once per component, the count decides it.** Twenty-eight icons at
 *   the bottom of `25–35%` need 1.75 sheet heights squared against a 16:9 page measuring 1.78, which is
 *   the whole surface with nothing left for the spacing the layout section asks for (issue #178).
 * - **Where a sheet draws the parts of one whole, the layout decides it.** A CHARACTER directional core
 *   draws a row of heads, a row of torsos and a row of pelvises. The three are disjoint pieces of one
 *   figure at one consistent scale, so the figure is at least as tall as the rows added together — and
 *   three rows in a grid laid across the page put that near the whole sheet height. All eighteen
 *   character sheets measured for issue #245 drew the head and the pelvis alone at 40–73% of the sheet
 *   height, against a whole figure priced at 25–35%, and it was never once honoured.
 *
 * A cell is the frame neither can reach. Cells tile the sheet by construction, and on the model
 * `SHEET_CELL_PITCH` states — a cell 1.5× its component on each axis, so it carries that component's
 * aspect — the largest component filling `f` of its cell height fills about `f` of its width too, and
 * spends at most about `f²` of the page whatever the count, the aspect or the number of rows — which is the property that makes both contradictions impossible rather than
 * merely smaller. **What a cell cannot hold is one scale across the sheets of a series**: a sheet of
 * twelve parts and a sheet of thirty-four each fill their own grid, so their pieces come out at
 * different sizes. That is a stated size's to hold — `CUSTOM` with a target size, which the field's
 * guidance tells the reader — and the share of the sheet height never held it either, because none
 * of the eighteen sheets measured for issue #245 honoured it.
 *
 * Every figure in the pair is derived rather than chosen:
 *
 * - **The top comes from `SHEET_CELL_PITCH` in `constants/sheetCanvas.ts`, which is where this app
 *   already answers the question.** That constant gives each component a cell 1.5× its own size, and
 *   says in as many words that the half-a-component gutter it buys "is what generously spaced looks
 *   like at sprite scale" — the layout section's own phrase, and the same exploded grid
 *   `nativeGridScale` seats one cell per component in. So a component may fill at most `1 / 1.5` of
 *   its cell, and 65 is the round number under that. Re-deriving a spacing budget here instead is how
 *   two constants in `src` end up answering one template sentence with different numbers, which is
 *   what the first pass at this record did. **The figure is written out and the coupling is held by
 *   the fit test**, whose ceiling is `1 / SHEET_CELL_PITCH ** 2`: a rung raised past 67% fails there.
 *   An expression here would compute a round number from a constant that is not itself round, which
 *   is a worse thing for a reader to meet in the prose the prompt carries.
 * - The two rungs stay **contiguous**, so the ladder has no gap for a configuration to fall into.
 * - `MID`'s midpoint is then 0.74 of `HIGH`'s, against the 0.72 the retired sheet-height pair
 *   carried. The profile is a choice about relative size, and that ratio is what the choice has
 *   always been.
 */
const SHARE_RANGE: Readonly<Record<ShareProfile, readonly [number, number]>> = {
  HIGH_RESOLUTION: [50, 65],
  MID_RESOLUTION: [35, 50],
};

/**
 * One rung's range as the reader sees it, with the en dash every other range in the prompt is written
 * with.
 *
 * Exported because the resolution-profile guidance states the same two ranges to the reader, and
 * reads them from here rather than keeping a copy of this record in prose.
 */
export function shareRange(profile: ShareProfile): string {
  const [low, high] = SHARE_RANGE[profile];
  return `${String(low)}–${String(high)}%`;
}

/**
 * The share as the prompt states it.
 *
 * **It measures the largest component, because the pieces of one sheet are not one size.** A torso
 * and a hand each filling the same share of a cell is a hand drawn as large as a torso — the break in
 * section 0's one consistent scale that a profile must never ask for. So the largest piece fills its
 * cell and every other is drawn to the scale that sets. On a sheet of equal pieces — an icon family,
 * a blend set — that is every piece filling its cell, and on a frame sequence it is the frame at the
 * height of the effect filling its cell, with every frame before and after it drawn smaller at that
 * scale, which "one frame of the effect" could not say.
 *
 * **No category noun, and that is what the largest component buys.** The noun a category's sheet is
 * priced in cannot name a piece with a cell on six of the thirteen: `a full figure` is the whole the
 * parts assemble into, and a CHARACTER series draws heads on one sheet and upper legs on the next. A
 * per-sheet noun would be a new answer on every plan, and on the plans whose `SheetPlan.scaleExample`
 * pairs a smallest piece with a largest one it would be a second copy of that largest piece, free to
 * drift from it. A *component* is the prompt's own defined term, and "the largest" picks out one
 * on every sheet without being told which piece that is.
 *
 * It names the grid rather than citing the layout section by number: `[SEC:LAYOUT]` cannot be used
 * here, because both of that heading's declarations sit inside an `[IF:…]` and
 * `tests/prompt-citations.test.ts` admits only a heading no configuration can drop. "The exploded
 * grid" is that section's own phrase for it, so the reference survives whatever number the heading
 * takes.
 */
function shareText(profile: ShareProfile): string {
  return `the largest component occupies ${shareRange(profile)} of its cell height in the exploded grid, and every other component is drawn to that same scale`;
}

/**
 * The scale the components are drawn at, as a function of the unit this sheet is priced in.
 *
 * Stated in prose because v1 interpolated the identifier raw, so the prompt read
 * "Selected profile: `HIGH_RESOLUTION_PIXEL_ART`" — a token the model had to guess the meaning of.
 *
 * **A map of functions rather than of strings, because `RETRO_16_BIT` states a height *of
 * something*** — and that something was `a full figure` on all thirteen categories, so a glyph
 * sheet, a tile field and a widget kit were each measured against a subject they cannot contain.
 * `SheetPlan.scaleUnit` is the noun each sheet supplies. It survives on that rung alone because
 * "roughly 64–96 pixels tall" is an absolute height, which no count and no layout can argue with.
 *
 * **The two share rungs take no unit**, for the reason `shareText` records: a share of a cell is
 * stated of the largest component, which is a piece every sheet has without being told which one.
 * `CUSTOM` carries no range and takes none either — it defers to the target-size line, which names
 * its quantity itself.
 */
export const RESOLUTION_PROFILE_TEXT: Readonly<Record<ResolutionProfile, (unit: string) => string>> = {
  HIGH_RESOLUTION: () => `High resolution — ${shareText('HIGH_RESOLUTION')}`,
  MID_RESOLUTION: () => `Mid resolution — ${shareText('MID_RESOLUTION')}`,
  RETRO_16_BIT: (unit) => `16-bit retro scale — ${unit} is roughly 64–96 pixels tall`,
  CUSTOM: () =>
    'Custom — work to the target component size where one is stated, and to the sheet aspect otherwise',
};

/**
 * What `CUSTOM` works to on a sheet whose stated size is the assembly.
 *
 * The entry above says *component size*, and it is printed on the line directly before section 2's
 * target-size line — so on a sheet of parts the two disagreed the moment that line started saying
 * *assembled*: one telling the generator to work to a component size where one is stated, the next
 * stating a size and saying outright that no component is it. That is the same label-against-value
 * contradiction removed one line further up.
 *
 * It states the assembly rather than falling silent because the assembly **is** the scale on that
 * sheet: the pieces are drawn at their share of one subject, which is what section 2's own line
 * already tells the generator. Falling back to *the sheet aspect* would throw away the only
 * measurement the prompt has.
 *
 * **It names the assembled whole, and no category's or sheet's noun for it.** It first read "the share
 * of that figure it occupies" on every category, which told an OBJECT part library and a VEHICLE rig
 * to work to the share of a figure they have none of. The repair put the category's scale unit in
 * that place, and that was true only while the unit and the assembly were the same thing. They are
 * not on BACKGROUND's layer library, the sixth sheet kind to reach this wording and the one no test
 * drove: the stated size there is a whole backdrop, and the line read "the share of one parallax band
 * it occupies" one line above a size with no band in it (issue #275).
 *
 * The assembly is what the target-size line below names on every sheet that reaches this branch —
 * "for the complete subject once its pieces are put together … whatever share of the whole it
 * occupies" — so this line uses that line's own term rather than a second answer to the question it
 * has already answered. A noun cannot drift from a sentence that does not take one.
 */
const CUSTOM_ASSEMBLED_TEXT =
  'Custom — work to the target assembled size stated below, drawing every component at the share of the assembled whole it occupies';

/**
 * The resolution profile in the prose the prompt carries.
 *
 * `RETRO_16_BIT` states its height of the unit the sheet is priced in, which the caller hands in as
 * `SheetPlan.scaleUnit`. It is the sheet's rather than the category's because BACKGROUND's two sheets
 * have no noun in common, and one answer per series is what that field's own docblock argues.
 * `CUSTOM` is the one that defers to the target-size field, so it is the one that has to agree with
 * what that field turns out to be naming.
 *
 * **The two share rungs take nothing of the sheet's**, and that is the correction issue #245 made.
 * They were once stated against the sheet height on some plans and against a cell on others, with
 * each plan choosing — and every plan left on the sheet height was one whose share the layout decided
 * before the line was read. A share of a cell is true on every sheet, so there is no longer a
 * per-sheet frame to hand in.
 */
export function resolutionProfileDescription(
  profile: ResolutionProfile,
  statesAssembled: boolean,
  scaleUnit: string,
): string {
  // `RESOLUTION_PROFILE_TEXT` stays exported even though nothing else imports it: it is still the map
  // `[DEFINE:RESOLUTION_PROFILE_DESCRIPTION]` is filled from for three of the four profiles, and
  // `promptTemplate.test.ts` walks that naming convention over `constants/promptText/`'s exports.
  // Listing the token as *computed* there instead would say the map does not exist, and drop the
  // check that it still does.
  return profile === 'CUSTOM' && statesAssembled
    ? CUSTOM_ASSEMBLED_TEXT
    : RESOLUTION_PROFILE_TEXT[profile](scaleUnit);
}

/**
 * What the three profiles that *are* a scale permit.
 *
 * v1 stated a flat `2×2` across every profile, which is wrong at both ends: at high resolution a
 * two-pixel minimum is small enough to read as noise, and at 16-bit scale it forbids the
 * single-pixel detail that style is made of. The minimum therefore scales with the canvas.
 */
const PROFILE_MIN_FEATURE: Readonly<Record<Exclude<ResolutionProfile, 'CUSTOM'>, string>> = {
  HIGH_RESOLUTION: '3 × 3',
  MID_RESOLUTION: '2 × 2',
  RETRO_16_BIT: '1 × 1',
};

/**
 * The same three rungs as a function of the component size `CUSTOM` states, keyed on its **smaller**
 * edge.
 *
 * Smaller rather than taller, because that is the edge detail runs out on: a 16 × 128 polearm has a
 * hundred and twenty-eight rows and sixteen columns, and it is the sixteen that decide whether a
 * two-pixel feature is affordable. Keying on height would call that component mid-resolution.
 *
 * Both boundaries were read off the profiles as they stood when this ladder was cut, when both share
 * rungs were a share of the sheet height. `RETRO_16_BIT` ran to 96 px per unit drawn and
 * `MID_RESOLUTION` started at roughly 184 on a 1024-pixel sheet, so the `1 × 1` rung ends somewhere
 * in that gap — 128 is the round number inside it, and is itself a size people draw sprites at.
 * `MID_RESOLUTION` topped out near 256 on the same sheet and `HIGH_RESOLUTION` began at that figure,
 * so the second boundary is that number exactly.
 *
 * **Those two landmarks have since moved, because both share rungs are a share of a cell now, which is
 * lower.** A default ICON sheet is twenty-eight components on a 16:9 page, so its grid is about seven
 * cells by four and a cell on the same 1024-pixel sheet is 256 px tall: `MID_RESOLUTION` is then
 * 90–128 px and `HIGH_RESOLUTION` 128–166. The gap the first boundary sat in closes, since 128 now
 * lands exactly where `MID_RESOLUTION` gives way to `HIGH_RESOLUTION`, and `RETRO_16_BIT`'s 64–96
 * overlaps the bottom of `MID_RESOLUTION` rather than sitting clear below it. **The rungs are
 * unchanged anyway**, and deliberately: these two boundaries key on a size the *reader* typed into
 * the target-size field, which no category and no profile moves — the profiles are landmarks that
 * were used to pick a round number, not inputs. Re-cutting the ladder because a landmark moved would
 * change what `CUSTOM` answers for every stated size in the app, which is a different question from
 * the one section 2's share was wrong about.
 */
const CUSTOM_MIN_FEATURE = [
  { upTo: 128, size: '1 × 1' },
  { upTo: 256, size: '2 × 2' },
] as const;

/** Past the last rung, which is `HIGH_RESOLUTION`'s own answer. */
const LARGEST_MIN_FEATURE = '3 × 3';

/**
 * `CUSTOM` with no size stated at all.
 *
 * The profile then falls back to "the sheet aspect", so there is no scale to reason from and the
 * middle rung is the only answer that is not a guess at one end or the other.
 */
const UNSTATED_MIN_FEATURE = '2 × 2';

/**
 * `CUSTOM` on a sheet whose stated size is the **assembly**, where the floor cannot be derived and
 * must not be guessed coarse.
 *
 * A component of such a sheet is a part of the subject the field measures, so its own smaller edge
 * is somewhere below that subject's — and the rungs below get *coarser* as the edge grows. Two
 * wrong answers are therefore available and they fail differently. Keying the rung off the assembly
 * returns a floor at least as coarse as the truth, which forbids detail a small piece legitimately
 * needs; falling to {@link UNSTATED_MIN_FEATURE} did the same thing on the three shipped rig presets
 * that carry `CUSTOM`, each of which sits on the finest rung by its assembled edge and was being told
 * `2 × 2` instead.
 *
 * The finest rung is the only answer that cannot forbid something real. Where it is wrong it is
 * merely permissive, and a floor that permits is inert rather than incorrect — which is the trade a
 * rule of this kind should take when the quantity it needs is one the app deliberately does not
 * hold.
 */
const ASSEMBLED_MIN_FEATURE = CUSTOM_MIN_FEATURE[0].size;

/**
 * The figure, without the unit it is counted in.
 *
 * **Three of the four profiles *are* a scale, and `CUSTOM` is not** — which is what makes this a
 * function rather than the record it began as. `CUSTOM` means "work to the target size", so its
 * scale lives in that size and nowhere else — resolved by the caller through `statedTargetSize`,
 * never parsed out of the free-text field here, because *which quantity* the field names is a
 * question about the sheet plan rather than about the text, and the rung turns on the answer. Keying
 * the minimum on the profile alone
 * gave the one profile that can state *16 × 16* the same `2 × 2` floor as a 256-pixel component, and a
 * sprite sixteen pixels across whose smallest permitted feature is four of them is a contradiction
 * the generator resolves by discarding one half of it — silently, and in whichever direction it
 * likes.
 */
function minFeatureFigure(profile: ResolutionProfile, stated: StatedTargetSize | null): string {
  if (profile !== 'CUSTOM') return PROFILE_MIN_FEATURE[profile];
  if (stated === null) return UNSTATED_MIN_FEATURE;
  if (stated.quantity === 'ASSEMBLED') return ASSEMBLED_MIN_FEATURE;

  const edge = Math.min(stated.size.width, stated.size.height);
  return CUSTOM_MIN_FEATURE.find((rung) => edge <= rung.upTo)?.size ?? LARGEST_MIN_FEATURE;
}

/**
 * The smallest feature the pixel-discipline section permits, **with the unit it is counted in**.
 *
 * The unit is the whole reason this is one function and not two values the template pairs up. The
 * bullet used to say *native pixels* unconditionally, while the block defining a native pixel is
 * gated on `NATIVE_GRID` — a different and much narrower condition, since `nativeGridScale`
 * additionally wants the `CUSTOM` profile, a size that parses and an enlargement of at least 2. So
 * every pixel-art prompt on a stock profile — the default configuration among them, which is the
 * first prompt the app ever shows anybody — stated a measurement in a unit the document never
 * established. A generator reading *3 × 3 native pixels* with no grid stated has to guess
 * between three pixels of a thousand-pixel image and three cells of a grid eight times coarser, and
 * the rule is supposed to be the floor on interior detail.
 *
 * **`hasNativeGrid` is the compiler's `NATIVE_GRID` answer itself, not a second reading of the same
 * inputs.** That is what makes the pairing hold: the figure and the unit leave this function
 * together, and the template has no unit of its own to write beside the figure.
 *
 * **Where there is no native grid the unit is the delivered pixel**, which the output contract's
 * render-at-the-delivered-resolution rule already establishes for every sheet, and which the
 * native-grid block's own carve-out is the only exception to. It is the correct answer
 * rather than a fallback: with nothing to enlarge, the pixels drawn are the pixels delivered — the
 * same reasoning that has `nativeGridScale` return `null` at a scale of 1.
 */
export function minFeatureSize(
  profile: ResolutionProfile,
  stated: StatedTargetSize | null,
  hasNativeGrid: boolean,
): string {
  return `${minFeatureFigure(profile, stated)} ${hasNativeGrid ? 'native' : 'delivered'} pixels`;
}
