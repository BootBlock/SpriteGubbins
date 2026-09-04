import { CATEGORY_OPTIONS, fieldLabelFor } from '../constants/categories/index.ts';
import {
  ASPECT_TEXT,
  BACKGROUND_KEY_TEXT,
  CATEGORY_ASSEMBLY,
  CATEGORY_AUDIT_TEXT,
  CATEGORY_EXCLUSION_TEXT,
  CATEGORY_GUARD_TEXT,
  depthOrderDescription,
  describeDirections,
  describeHardware,
  describePalette,
  describeStyleReference,
  JOINT_CAP_TEXT,
  LANDMARK_TEXT,
  LIGHTING_TEXT,
  minFeatureSize,
  OUTLINE_TEXT,
  OVERLAP_MARGIN_TEXT,
  PALETTE_TEXT,
  PROJECTION_TEXT,
  RENDER_STYLE_TEXT,
  resolutionProfileDescription,
  SCALE_EXAMPLE_TEXT,
  smallScaleDiscipline,
  SURFACE_DETAIL_TEXT,
  VALIDATION_PASS_TEXT,
} from '../constants/promptText/index.ts';
import type { OutputConfig } from '../types/output.ts';
import { SUBJECT_FIELD_KEYS } from '../types/subject.ts';
import type { SubjectCategory, SubjectDefinition } from '../types/subject.ts';
import { componentBreakdownFor } from './componentSet.ts';
import { describeSeries } from './describeSeries.ts';
import { directionalRotation } from './directionalRotation.ts';
import { leadingSideLedger } from './leadingSideLedger.ts';
import { describeMirrorPairs } from './mirrorPairs.ts';
import type { SheetFacts } from './promptFacts.ts';
import { turntableSequence } from './turntableSequence.ts';

/**
 * Every token the template substitutes, with the app/user boundary drawn through it.
 *
 * The compiler's third phase. Two halves, and the line between them is the point of the module: the
 * app's own prose is resolved through `cite`, and the text the reader typed never is. That boundary
 * has to be between *values* rather than between keys — a subject field reading `[SEC:NOPE]` is an
 * odd name, not a broken template, and resolving citations over it would throw out of the compiler
 * mid-render.
 *
 * `cite` is passed in rather than built here because it is a function of the *conditioned* template:
 * the headings that survive decide what number each citation resolves to, so it cannot exist until
 * `promptConditions` has been applied. See `promptCompiler.ts`, which owns that order.
 */
export function promptValues(
  category: SubjectCategory,
  subject: SubjectDefinition,
  output: OutputConfig,
  facts: SheetFacts,
  cite: (text: string) => string,
): Record<string, string> {
  const {
    mode,
    plan,
    coveredDirections,
    assemblyDirection,
    coveredMirrorPairs,
    projection,
    cameraElevation,
    batch,
    anatomy,
    hardware,
    palette,
    reference,
    componentCount,
    statedTarget,
    componentTarget,
    nativeScale,
    additionalAnatomyLine,
  } = facts;

  // Empty on exactly the sheets that append no additional-anatomy block: the subject named nothing,
  // or this is a later sheet of a series, where `anatomyFacingsFor` answers `null` and the pieces are
  // left off deliberately. That is the one question the two sentences below have to ask, so it is
  // asked once here rather than twice there.
  const listedAdditions = additionalAnatomyLine === '' ? null : fieldLabelFor(category, 'additional_anatomy');

  // Every value below is the app's own prose, so each is resolved through `cite` once the record is
  // built: a `[SEC:…]` written into one of the constants they read from is a citation of a heading,
  // and `substitute` runs last, so nothing else would ever consume it. **The values carrying text
  // the reader typed are assigned afterwards instead, and are never cited over** — that is where the
  // app/user boundary sits, and it has to be a boundary between *values* rather than one drawn
  // inside the record's keys: a subject field reading `[SEC:NOPE]` is an odd name, not a broken
  // template, and resolving citations over it would throw out of the compiler mid-render.
  const authored: Record<string, string> = {
    CATEGORY: category,
    // The article belongs to the category rather than to the sentence, and is written down in
    // `CATEGORY_OPTIONS` rather than derived from the identifier's first letter — English picks it
    // by sound. See `CategoryDefinition.article`.
    CATEGORY_ARTICLE: CATEGORY_OPTIONS[category].article,
    COMPONENT_COUNT: String(componentCount),
    // Every one of these is now a function of the category as well as the mode. That is the whole
    // correction: an inventory, an assembly sentence and an exclusion list that knew only the mode
    // are what let a CHARACTER sheet ask for floors and walls and then forbid them.
    //
    // The two that take `listedAdditions` are functions of the *sheet* as well, because each opens
    // by saying what every component of it is, and section 4 appends the subject's own pieces to
    // that list — see `guardExemption`. They are handed the heading those pieces arrive under, or
    // `null` where this sheet appends none.
    CATEGORY_GUARD: CATEGORY_GUARD_TEXT[category](listedAdditions),
    ASSEMBLY_POSES: plan.assembly,
    CATEGORY_EXCLUSIONS: CATEGORY_EXCLUSION_TEXT[category],
    CATEGORY_AUDIT: CATEGORY_AUDIT_TEXT[category](listedAdditions),
    // The same claim in three sections, from the record that also feeds the wrappers' two negative
    // channels — so a category names its assembled whole the same way wherever the prompt says it.
    CATEGORY_ASSEMBLY_INSTRUCTION: CATEGORY_ASSEMBLY[category].instruction,
    CATEGORY_ASSEMBLY_EXCLUSION: CATEGORY_ASSEMBLY[category].exclusion,
    CATEGORY_ASSEMBLY_AUDIT: CATEGORY_ASSEMBLY[category].audit,
    // Section 0's "one consistent scale" rule is abstract, and its worked example is what makes it
    // land — so the example names pieces this category's sheet actually holds, rather than the hand
    // and torso it named for every subject the app can describe.
    SCALE_EXAMPLE_DESCRIPTION: SCALE_EXAMPLE_TEXT[category],

    RENDER_STYLE_DESCRIPTION: RENDER_STYLE_TEXT[output.renderStyle],
    SURFACE_DETAIL_DESCRIPTION: SURFACE_DETAIL_TEXT[output.surfaceDetail],
    // Takes the same answer the target-size line does, because the two are printed one after the
    // other and `CUSTOM` is the profile that defers to that line. Left as the flat lookup, it told
    // the generator to work to a component size where one is stated, directly above a line stating a
    // size and saying no component is it.
    //
    // **Keyed on the field, not on the sheet**, unlike the gate below. The assembled wording points
    // at a size "stated below", and on a rig sheet with the box empty there is no line below — so
    // the sheet's answer would leave the prompt pointing at nothing. The base wording covers that
    // case as it always did, by saying *where one is stated*.
    //
    // The category is the third argument for the reason section 0's scale example takes one: the
    // three profiles that state a scale state it against something, and that something was a figure
    // on the nine categories whose sheets hold none.
    //
    // The fourth is the *sheet's*, and the split matters: the noun is the category's, because a
    // profile is chosen once for a whole series, while what that noun is measured against is a fact
    // about the page in front of the generator. See `SheetPlan.scaleUnitFrame`.
    RESOLUTION_PROFILE_DESCRIPTION: resolutionProfileDescription(
      output.resolutionProfile,
      statedTarget?.quantity === 'ASSEMBLED',
      category,
      plan.scaleUnitFrame,
    ),
    // A function of the target size as well as the profile, because `CUSTOM` is the one profile
    // that carries no scale of its own — see `minFeatureSize`. It carries its own unit, from the
    // same `nativeScale` answer `NATIVE_GRID` is: the figure counts native pixels only where the
    // block defining a native pixel is emitted, and delivered pixels everywhere else. The bullet
    // stated *native* unconditionally for as long as the two were separate, so every pixel-art
    // prompt on a stock profile — the default among them — measured against a unit it never
    // defined.
    MIN_FEATURE_SIZE: minFeatureSize(output.resolutionProfile, statedTarget, nativeScale !== null),
    // Sprite-scale bullets join the pixel discipline only when the stated component is small
    // enough that silhouette carries the identity; `''` is what drops the optional line.
    SMALL_SCALE_DISCIPLINE: smallScaleDiscipline(output.resolutionProfile, componentTarget),
    // Emitted only where no palette is pinned, since a pinned one supersedes the budget outright —
    // the value is still supplied because `substitute` throws on a token it has no value for, and
    // the template's own `[IF:PALETTE!=yes]` is what decides whether the line survives to be filled.
    PALETTE_DESCRIPTION: PALETTE_TEXT[output.paletteLimit],
    OUTLINE_DESCRIPTION: OUTLINE_TEXT[output.outlineStyle],
    LIGHTING_DESCRIPTION: LIGHTING_TEXT[output.lightingModel],
    // Supplied for every style, as `PALETTE_DESCRIPTION` is, and `''` for the eight that describe a
    // finished surface — the template's own `[IF:VALIDATION_PASS]` is what decides whether the token
    // is still there to be filled.
    VALIDATION_PASS_DESCRIPTION: VALIDATION_PASS_TEXT[output.renderStyle],
    // Supplied whether or not the blocks survive, as `PALETTE_DESCRIPTION` is: `substitute` throws
    // on a token it has no value for, and the template's own `[IF:NATIVE_GRID]` is what decides
    // whether the token is still there to be filled.
    NATIVE_GRID_SCALE: nativeScale === null ? '' : String(nativeScale),

    HARDWARE_NAME: hardware?.name ?? '',
    HARDWARE_CONSTRAINTS: hardware === null ? '' : describeHardware(hardware),
    PALETTE_NAME: palette?.name ?? '',
    PALETTE_SPECIFICATION: palette === null ? '' : describePalette(palette),

    STYLE_REFERENCE_NAME: reference?.name ?? '',
    STYLE_REFERENCE_CHARACTERISTICS: reference === null ? '' : describeStyleReference(reference),

    PROJECTION_DESCRIPTION: PROJECTION_TEXT[projection],
    CAMERA_ELEVATION: String(cameraElevation),
    DIRECTIONS_DESCRIPTION: describeDirections(coveredDirections),
    // The fix for the defect that made a front-three-quarter, a right-side and a back-three-quarter
    // head come back at the same angle: the facings are stated as object *yaws* beneath a camera the
    // prompt separately pins, rather than as names a generator can satisfy with its favourite view.
    // The elevation goes with them because what a yaw reveals is a function of both.
    DIRECTIONAL_ROTATION: directionalRotation(coveredDirections, cameraElevation),
    // The same facings related to each other rather than enumerated: cell N + 1 is cell N after a
    // stated turn. The yaw list above is four independent descriptions, and a generator reads it as
    // four independent pictures — which is how a sheet comes back with its asymmetries re-decided in
    // every cell, each view facing correctly and none of them the same object.
    TURNTABLE_SEQUENCE: turntableSequence(coveredDirections),
    // Which of the subject's own sides each of those yaws brings towards the camera. Supplied
    // whether or not the block survives, as `PALETTE_DESCRIPTION` is: the template gates it on
    // `[IF:PLAN_VIEW!=yes]` *inside* `[IF:MULTI_DIRECTION]`, so a single-facing sheet drops it for
    // having no second view to compare and a plan view drops it for having no near side at all.
    LEADING_SIDE_LEDGER: leadingSideLedger(coveredDirections),
    // Supplied whether or not the blocks survive, as `PALETTE_DESCRIPTION` is: the template's own
    // `[IF:MIRROR_PAIRS]` decides whether a token remains to be filled.
    MIRROR_PAIRS_DESCRIPTION: describeMirrorPairs(coveredMirrorPairs),
    LANDMARK_DESCRIPTION: LANDMARK_TEXT[category],
    // Spelled through the same function as the directions line two bullets above it, because on a
    // single-facing sheet the two are the *same facing* and printed one after the other — the raw
    // value gave `Directions required: Front` and `Primary assembly direction: front`, which reads
    // as two different things. A `Direction` is stored lower case, so whichever bullet capitalises
    // has to be the one both go through.
    PRIMARY_DIRECTION: describeDirections([assemblyDirection]),
    // A function of the elevation as well as the facings, for the same reason the yaw list is: which
    // of a subject's pieces renders in front of its body is a near/far question, and directly
    // overhead there is no near side to answer it with.
    //
    // **Asked of the whole coverage, not of the assembly facing.** A cut-out rig used to be a
    // single-facing run sheet and this read `assemblyDirection`, which is that sheet's only facing;
    // once the rig reached a multi-view core the same call stated the *first* facing's depth order
    // for a sheet section 3 turns to five yaws, contradicting itself at four of them.
    DEPTH_ORDER_DESCRIPTION: depthOrderDescription(coveredDirections, cameraElevation),

    BACKGROUND_KEY_DESCRIPTION: BACKGROUND_KEY_TEXT[output.backgroundKey],
    ASPECT_DESCRIPTION: ASPECT_TEXT[output.aspectRatio],
    JOINT_CAP_DESCRIPTION: JOINT_CAP_TEXT[output.jointCapStyle],
    OVERLAP_MARGIN_DESCRIPTION: OVERLAP_MARGIN_TEXT[output.overlapMargin],

    SERIES_POSITION: String(batch.ordinal),
    SERIES_TOTAL: String(batch.sheets.length),
    // Computed whether or not the block survives, as `PALETTE_DESCRIPTION` is: `substitute` throws
    // on a token it has no value for, and the template's own `[IF:SERIES]` is what decides whether
    // the token is still there to be filled.
    SERIES_SHEETS: describeSeries(category, batch, anatomy),
  };

  // The sixteen field labels are the app's own words too, so they are cited over with the rest —
  // their values, assigned below, are not. Read through `fieldLabelFor` so the prompt and the
  // studio cannot drift apart: they are now the same string. Sixteen keys shared by six categories
  // otherwise meant one category's vocabulary reaching all of them — a vehicle's *Service Condition*
  // arriving as "Age / Vitality", its turret under "Anatomy base" and its vision slit under "Head &
  // sensory features" — correct values, every one of them labelled from the category the keys were
  // first designed for, in the section the template calls the sole authority for the subject's
  // design and which forbids inferring anything it does not state.
  for (const key of SUBJECT_FIELD_KEYS) {
    authored[`${key.toUpperCase()}_LABEL`] = fieldLabelFor(category, key);
  }

  const values: Record<string, string> = Object.fromEntries(
    Object.entries(authored).map(([token, text]) => [token, cite(text)]),
  );

  // Everything from here down carries text the reader typed, so none of it is cited over.
  //
  // The sixteen subject fields are keyed by the upper-case form of their own key rather than written
  // out again — a field added to `SUBJECT_FIELD_KEYS` reaches the template without a second edit.
  for (const key of SUBJECT_FIELD_KEYS) {
    values[key.toUpperCase()] = subject[key];
  }

  values.SPRITE_TARGET_SIZE = output.spriteTargetSize;
  values.SOCKETS = output.sockets;
  values.IDENTITY_LOCK = output.identityLock;
  values.ADDITIONAL_ANATOMY = additionalAnatomyLine;

  // The one value that is both: an inventory of the app's own prose with the anatomy the reader named
  // appended to it. It resolves its own citations over the app-authored half, before the reader's
  // text is composed into it — which is what keeps the boundary above a boundary between strings
  // rather than a hopeful exclusion.
  values.COMPONENT_BREAKDOWN = componentBreakdownFor(
    category,
    mode,
    output.directions,
    output.sheetIndex,
    anatomy,
    cite,
  );

  return values;
}
