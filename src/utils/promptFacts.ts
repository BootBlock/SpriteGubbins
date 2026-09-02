import { resolveProjection } from '../constants/categoryProjections.ts';
import { resolveStyleReference } from '../constants/categoryStyleReferences.ts';
import { hardwareProfileFor } from '../constants/hardware/index.ts';
import type { HardwareProfile } from '../types/hardware.ts';
import { paletteFor } from '../constants/palettes/index.ts';
import type { Palette } from '../types/palette.ts';
import { resolveCameraElevation, validationPassFor } from '../constants/promptText/index.ts';
import { resolveMode, resolveRigMode, sheetPlanFor } from '../constants/sheetPlans/index.ts';
import { styleReferenceFor } from '../constants/styleReferences/index.ts';
import type { StyleReference } from '../types/styleReference.ts';
import type {
  Direction,
  DirectionalMode,
  OutputConfig,
  Projection,
  RigMode,
  StatedTargetSize,
  TargetSize,
} from '../types/output.ts';
import type { SheetPlan } from '../types/components.ts';
import type { SubjectCategory, SubjectDefinition } from '../types/subject.ts';
import { formatAnatomyComponent, parseAdditionalAnatomy } from './additionalAnatomy.ts';
import type { AnatomyComponent } from '../types/anatomy.ts';
import { anatomyFacingsFor, componentCountFor } from './componentSet.ts';
import { statedTargetSize } from './componentTargetSize.ts';
import { mirrorPairs } from './mirrorPairs.ts';
import { nativeGridScale } from './nativeGridScale.ts';
import { sheetBatch } from './sheetBatch.ts';
import type { SheetBatch } from './sheetBatch.ts';
import { sheetDirections } from './sheetDirections.ts';
import { returnsText, supportsPromptFeedback } from './targetCapabilities.ts';

/**
 * What this configuration turns out to be a sheet *of*, resolved once.
 *
 * The first of the compiler's three phases, and the one every other part of it reads. A stored
 * configuration can name a mode its category has no plan for, a camera it cannot be drawn under, or
 * a rig it has no joints for — a preset saved before the plans were split by category, or a
 * hand-edited export — so almost nothing here is the field as stored. Each resolver says at its own
 * line what a raw value would have produced.
 *
 * **Resolved once and read many times, which is the whole reason it is a record rather than
 * twenty-two arguments threaded down.** The failures this prevents are all one shape: a prompt
 * disagreeing with itself because two sections asked the same question separately and one of them
 * asked it of the raw field. See `promptConditions.ts`, which gates the template's blocks on these,
 * and `promptValues.ts`, which fills its tokens from them.
 */
export interface SheetFacts {
  readonly mode: DirectionalMode;
  readonly rigMode: RigMode;
  readonly plan: SheetPlan;
  readonly coveredDirections: readonly [Direction, ...Direction[]];
  readonly assemblyDirection: Direction;
  readonly coveredMirrorPairs: ReturnType<typeof mirrorPairs>;
  readonly projection: Projection;
  readonly cameraElevation: number;
  readonly batch: SheetBatch;
  readonly emitComponentMap: boolean;
  readonly emitPromptFeedback: boolean;
  readonly anatomy: readonly AnatomyComponent[];
  readonly hardware: HardwareProfile | null;
  readonly palette: Palette | null;
  readonly reference: StyleReference | null;
  readonly validationPass: ReturnType<typeof validationPassFor>;
  readonly componentCount: number;
  readonly statedTarget: StatedTargetSize | null;
  readonly componentTarget: TargetSize | null;
  readonly nativeScale: number | null;
  readonly anatomyFacings: ReturnType<typeof anatomyFacingsFor>;
  /** The anatomy rendered from the parse, or empty on a sheet that does not carry it. */
  readonly additionalAnatomyLine: string;
}

/** Resolve one studio configuration into the facts every phase below it reads. */
export function sheetFacts(
  category: SubjectCategory,
  subject: SubjectDefinition,
  output: OutputConfig,
): SheetFacts {
  // The sheet mode this category can actually produce, for the values below that are read from it
  // directly — the plan, the inventory, the count and the anatomy's sheet. A stored configuration can
  // name a mode its category has no plan for (a preset saved before the plans were split by category,
  // or a hand-edited export), and a reader that skipped this would be describing a different sheet
  // from the one beside it.
  //
  // Everything else here takes the **category** and resolves for itself, which is the stronger
  // arrangement and the one this file is converging on: `sheetDirections` and `sheetBatch` below both
  // do, so there is no way to reach them with an unresolved mode at all, where handing down a
  // pre-resolved one only works for as long as every call site remembers to.
  const mode = resolveMode(category, output.directionalMode);

  // And the rig this sheet is actually drawn for, resolved for the same reason and against both
  // axes: a stored configuration can name one its category has no joints for, and section 5 is what
  // that decides. Unresolved, `POSE_LIBRARY` — the default — put "flexion comes from assembling
  // separately oriented rigid segments around shared pivots" on a tileset, a nine-slice and a
  // flipbook, and left the cut-out rig sheet itself — whose inventory *is* rig pieces — with no
  // pivot registration, no overlap margin and no depth order at all. It takes the raw mode rather
  // than the resolved one above for the reason that comment gives: a reader that resolves for
  // itself cannot be reached with an unresolved argument.
  const rigMode = resolveRigMode(category, output.directionalMode, output.rigMode);

  // Which sheet of that pairing's series this is. Resolved here for the same reason the mode is: a
  // stored index can name a second sheet on a pairing that has one, and `sheetPlanFor` answers with
  // the series' first rather than with `undefined`.
  const plan = sheetPlanFor(category, mode, output.directions, output.sheetIndex);

  // Which facings this sheet covers and which it assembles towards — resolved in `sheetDirections`
  // because the splitter labels its runs from the same answer, and two implementations of it would
  // eventually disagree about the prompt one of them is describing. It takes the category rather than
  // the `mode` above because it resolves the pairing itself, which is what stops the studio's own
  // reading of that answer drifting from this one — and because the *direction set* is category-scoped
  // as well: an INTERFACE or a TERRAIN has no facing to turn to, so a stored `THREE_CLASSIC` degrades
  // there the way an unsupported mode does.
  const { covered: coveredDirections, assembly: assemblyDirection } = sheetDirections(category, output, plan);

  // The covered facings a mirrored copy could counterfeit — `west` flipped is a counterfeit `east`
  // — which only the compass sets put on one sheet. Where a pair exists, section 3 and the
  // directional audit both name it: the audit's other checks all pass a reflection, since it faces
  // exactly where the turned view would, and only the named pair gives the generator a comparison
  // that catches one.
  const coveredMirrorPairs = mirrorPairs(coveredDirections);

  // Which camera this sheet is drawn under, resolved through the category for the reason the mode
  // and the direction set above are: a widget is screen-space art with no top surface and no depth
  // axis, so a stored `THREE_QUARTER_TOPDOWN` on an INTERFACE puts `the vertical screen axis carries
  // both height and depth` above an inventory of button states — one prompt disagreeing with itself.
  const projection = resolveProjection(category, output.projection);

  // Where that camera stands, resolved for the reason the mode above is: the projection *is* a
  // camera, so all but the angled-overhead one fix the elevation, and a stored configuration can
  // still be holding a number that projection cannot be drawn at. Section 3 prints the projection
  // and the elevation as adjacent lines, so an unresolved one is two statements about one camera
  // that disagree — and it decides section 3's occlusion contract as well, which is a good deal
  // more than a line of prose: from directly overhead a yaw hides nothing, and the front/rear
  // occlusions the oblique wording states are exactly what section 9 then audits for. It takes the
  // projection resolved on the line above rather than the stored one, because resolving the two
  // against different cameras is the same disagreement one step further back.
  const cameraElevation = resolveCameraElevation(projection, output.cameraElevation);

  // Which sheet of which batch this configuration is. Every prompt before this one described its
  // sheet as the whole deliverable — the component count, the inventory's "do not omit entries" and
  // the assembly capability all read as statements about the finished set — so sheet three
  // of eight arrived claiming a count and a capability belonging to something else. The batch is
  // enumerated rather than passed in because a configuration already *is* one sheet of one batch:
  // the splitter varies nothing but the facing and the sheet index, and both are fields of `output`.
  const batch = sheetBatch(category, output);

  // Only a target that returns text alongside the image can honour a component map; asking a pure
  // image endpoint for one just spends tokens on an instruction it will drop.
  const emitComponentMap = output.emitComponentMap && returnsText(output.targetModel);

  // The report needs *both* halves of that — a pass in which to re-read the specification against
  // the pixels, and a channel to answer through — so it is gated on the conjunction rather than on
  // either alone. The `deliberates` half is also what makes the section's wording safe: it points at
  // the layout section's checks instead of restating them, and that section is a bare `LAYOUT`
  // heading on a target that does not deliberate. That meeting of two separately-computed flags is
  // asserted on the compiled prompt across every target, since here is where they meet rather than
  // in either gate alone.
  const emitPromptFeedback = output.emitPromptFeedback && supportsPromptFeedback(output.targetModel);

  // Additional anatomy is separate pieces by section 1's own rule, so it is counted and listed
  // rather than folded into a neighbouring component — otherwise the sheet asks for more pieces than
  // the contract says it has, which is the one arithmetic the whole template rests on.
  const anatomy = parseAdditionalAnatomy(subject.additional_anatomy);

  // The machine and its colours, or `null` for `NONE`/`FREE`. Resolved once and read four times
  // below, so the two blocks and the two flags that gate them cannot disagree about whether there
  // is a machine — the failure mode being a heading with nothing under it.
  const hardware = hardwareProfileFor(output.hardwareProfile);
  const palette = paletteFor(output.palette);
  // The look this sheet is drawn to match, or `null` for `NONE`. Resolved once and read three times
  // below — the two values and the flag that gates their block — so a heading with nothing under it
  // is not expressible, exactly as it is not for the two above.
  //
  // Narrowed through the category first, for the reason the projection above is: a reference states
  // the camera it was rendered under, and its characteristics carry that camera into section 2 as a
  // measurement no resolver downstream can edit. A Diablo II reference on an INTERFACE would put
  // “a tile edge runs two pixels sideways for every one it drops” above `Flat front elevation`.
  const reference = styleReferenceFor(resolveStyleReference(category, output.styleReference));

  // Whether the render style withholds the surface rather than describing one, and what it withholds.
  // Read four times below — three conditionals and the paragraph that stands in for the lines they
  // drop — from one lookup, so the prompt cannot drop a line and then say nothing in its place.
  const validationPass = validationPassFor(output.renderStyle);

  // How many components this sheet asks for. Hoisted out of the values below because the scale the
  // sheet presents its native grid at is a function of it: the canvas has to seat all of them, so a
  // sheet of forty components is enlarged less than a sheet of twelve.
  const componentCount = componentCountFor(category, mode, output.directions, output.sheetIndex, anatomy);

  // The size the field states, with the quantity it is a size of, or `null` where it states none.
  // Resolved once and read by every section-2 feature that turns on it, so they cannot disagree
  // about what the reader named. The quantity is the sheet's answer, not the text's: a sheet whose
  // components are the parts one subject is cut into states the size of the subject they assemble
  // into — see `componentTargetSize.ts`.
  const statedTarget = statedTargetSize(
    category,
    output.directionalMode,
    output.directions,
    output.sheetIndex,
    output.spriteTargetSize,
  );

  // The same answer narrowed to a genuine component size, for the three readers that can do nothing
  // with an assembly: each seats or measures one component, and an assembled figure fed to any of
  // them prices a canvas of fifteen whole characters. `minFeatureSize` takes the wider value
  // instead, because it has a defensible floor to state on such a sheet and no floor at all is worse
  // than a permissive one.
  const componentTarget = statedTarget?.quantity === 'COMPONENT' ? statedTarget.size : null;

  // The whole-number enlargement the native pixel grid is delivered at, or `null` where this
  // configuration has no native grid — a style that is not pixel art, a profile that states its own
  // scale, no per-component size, or a component already large enough that there is nothing to
  // enlarge. Read three times below — as the value, as the flag that gates the three places stating
  // it, and as the unit the pixel-discipline section counts its minimum feature in — so the prompt
  // cannot carry the carve-out without the figure it points at, nor name a native pixel where
  // nothing defines one.
  const nativeScale = nativeGridScale(
    output.renderStyle,
    output.resolutionProfile,
    componentTarget,
    output.aspectRatio,
    componentCount,
  );

  // Rendered from the parse rather than passed through raw, so section 1 and section 4 describe the
  // same anatomy: a field reading `Tail ×0` cannot say one thing at the top of the prompt and
  // another in the inventory. It also empties for `NONE`, which drops the line entirely rather than
  // putting a bare sentinel in the highest-weighted section.
  //
  // **And it empties on a sheet that does not carry the anatomy**, for the same reason and a sharper
  // one. Section 1's own prose says additional anatomy is "the single exception" that section 4
  // lists and counts separately — so naming a tail here on the articulation sheet, whose inventory
  // has no tail in it and whose contract demands an exact count without one, is a contradiction
  // inside one prompt. The generator resolves it by drawing an uncounted piece or by ignoring a
  // line it was told was binding, and neither is recoverable.
  //
  // The facings are held rather than a boolean, because the exception sentence has two shapes: a
  // multi-view sheet draws each piece at each of its facings, so its sentence has to say so, where
  // a run sheet draws each piece once. Held in a local as well, because `config` below gates both on
  // it and reading it back off `values` would come out `string | undefined`.
  const anatomyFacings = anatomyFacingsFor(category, mode, output.directions, output.sheetIndex);
  const additionalAnatomyLine = anatomyFacings !== null ? anatomy.map(formatAnatomyComponent).join(', ') : '';

  return {
    mode,
    rigMode,
    plan,
    coveredDirections,
    assemblyDirection,
    coveredMirrorPairs,
    projection,
    cameraElevation,
    batch,
    emitComponentMap,
    emitPromptFeedback,
    anatomy,
    hardware,
    palette,
    reference,
    validationPass,
    componentCount,
    statedTarget,
    componentTarget,
    nativeScale,
    anatomyFacings,
    additionalAnatomyLine,
  };
}
