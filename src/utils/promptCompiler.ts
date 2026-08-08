import {
  ASPECT_TEXT,
  BACKGROUND_KEY_TEXT,
  CATEGORY_AUDIT_TEXT,
  CATEGORY_EXCLUSION_TEXT,
  CATEGORY_GUARD_TEXT,
  DEPTH_ORDER_TEXT,
  describeDirections,
  describeHardware,
  describePalette,
  FRAME_IS_A_COMPONENT,
  JOINT_CAP_TEXT,
  LANDMARK_TEXT,
  LIGHTING_TEXT,
  MIN_FEATURE_SIZE,
  OUTLINE_TEXT,
  OVERLAP_MARGIN_TEXT,
  PALETTE_TEXT,
  perComponentLimit,
  PROJECTION_TEXT,
  RENDER_STYLE_TEXT,
  RESOLUTION_PROFILE_TEXT,
  SCALE_EXAMPLE_TEXT,
  SURFACE_DETAIL_TEXT,
} from '../constants/promptText/index.ts';
import { fieldLabelFor } from '../constants/categories/index.ts';
import { PROMPT_TEMPLATE } from '../constants/promptTemplate.ts';
import { hardwareProfileFor } from '../constants/hardware/index.ts';
import { paletteFor } from '../constants/palettes/index.ts';
import type { OutputConfig } from '../types/output.ts';
import { SUBJECT_FIELD_KEYS } from '../types/subject.ts';
import type { SubjectCategory, SubjectDefinition } from '../types/subject.ts';
import { resolveMode, resolveRigMode, sheetPlanFor } from '../constants/sheetPlans/index.ts';
import { formatAnatomyComponent, parseAdditionalAnatomy } from './additionalAnatomy.ts';
import { componentBreakdownFor, componentCountFor, sheetCarriesAnatomy } from './componentSet.ts';
import { directionalRotation } from './directionalRotation.ts';
import { wrapForModel } from './modelWrappers.ts';
import { deliberates, returnsText, supportsPromptFeedback } from './targetCapabilities.ts';
import { describeSeries } from './describeSeries.ts';
import { sheetBatch } from './sheetBatch.ts';
import { sheetDirections } from './sheetDirections.ts';
import {
  applyConditionals,
  applyNumbering,
  applyOptionals,
  assertBlocksResolved,
  substitute,
} from './templateEngine.ts';

/**
 * Compile the studio's state into the prompt the user copies.
 *
 * A pure function of its three arguments: the same state always produces the same text, which is
 * what lets the preview derive it during render (with `useMemo`) instead of mirroring it into state
 * through an effect — the anti-pattern the specification bans first.
 *
 * **A cleared field omits its line entirely.** v1 emitted `` Species / Archetype: `DEFINED` `` on the
 * reasoning that an empty backtick pair looks like an authoring mistake. That weighed two options
 * and missed the third: `DEFINED` is a *content-shaped token in the highest-weighted section of the
 * prompt*, and a generator reading it either ignores the line or treats "DEFINED" as a descriptor to
 * satisfy. Absence says "you decide" precisely, costs no tokens, and cannot be misread — and the
 * template states that rule outright, so absence is unambiguous rather than merely silent.
 */
export function generatePrompt(
  category: SubjectCategory,
  subject: SubjectDefinition,
  output: OutputConfig,
): string {
  // The sheet mode this category can actually produce. Resolved **once**, at the top, and used for
  // every mode-dependent value below — the inventory, the count, the assembly sentence and the
  // direction coverage. A stored configuration can name a mode its category has no plan for (a
  // preset saved before the plans were split by category, or a hand-edited export), and resolving it
  // per call site is how three of them would agree and the fourth would not.
  const mode = resolveMode(category, output.directionalMode);

  // And the rig this category can actually be asked for, resolved for the same reason: a stored
  // configuration can name one its category has no joints for, and section 5 is what that decides.
  // Unresolved, `POSE_LIBRARY` — the default — put "flexion comes from assembling separately
  // oriented rigid segments around shared pivots" on a tileset, a nine-slice and a flipbook.
  const rigMode = resolveRigMode(category, output.rigMode);

  // Which sheet of that pairing's series this is. Resolved here for the same reason the mode is: a
  // stored index can name a second sheet on a pairing that has one, and `sheetPlanFor` answers with
  // the series' first rather than with `undefined`.
  const plan = sheetPlanFor(category, mode, output.sheetIndex);

  // Which facings this sheet covers and which it assembles towards — resolved in `sheetDirections`
  // because the splitter labels its runs from the same answer, and two implementations of it would
  // eventually disagree about the prompt one of them is describing.
  const { covered: coveredDirections, assembly: assemblyDirection } = sheetDirections(
    { ...output, directionalMode: mode },
    plan,
  );

  // Which sheet of which batch this configuration is. Every prompt before this one described its
  // sheet as the whole deliverable — the component count, the inventory's "do not omit entries" and
  // section 6's assembly capability all read as statements about the finished set — so sheet three
  // of eight arrived claiming a count and a capability belonging to something else. The batch is
  // enumerated rather than passed in because a configuration already *is* one sheet of one batch:
  // the splitter varies nothing but the facing and the sheet index, and both are fields of `output`.
  const batch = sheetBatch(category, output);

  // Only a target that returns text alongside the image can honour a manifest; asking a pure image
  // endpoint for one just spends tokens on an instruction it will drop.
  const emitManifest = output.emitManifest && returnsText(output.targetModel);

  // The report needs *both* halves of that — a pass in which to re-read the specification against
  // the pixels, and a channel to answer through — so it is gated on the conjunction rather than on
  // either alone. The `deliberates` half is also what makes the section's wording safe: it points at
  // section 9's checks instead of restating them, and section 9 is a bare `## 9. LAYOUT` heading on
  // a target that does not deliberate. That meeting of two separately-computed flags is asserted on
  // the compiled prompt across every target, since here is where they meet rather than in either
  // gate alone.
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

  const values: Record<string, string> = {
    CATEGORY: category,
    COMPONENT_COUNT: String(componentCountFor(category, mode, output.sheetIndex, anatomy)),
    COMPONENT_BREAKDOWN: componentBreakdownFor(category, mode, output.sheetIndex, anatomy),
    // Every one of these is now a function of the category as well as the mode. That is the whole
    // correction: an inventory, an assembly sentence and an exclusion list that knew only the mode
    // are what let a CHARACTER sheet ask for floors and walls and then forbid them.
    CATEGORY_GUARD: CATEGORY_GUARD_TEXT[category],
    ASSEMBLY_POSES: plan.assembly,
    CATEGORY_EXCLUSIONS: CATEGORY_EXCLUSION_TEXT[category],
    CATEGORY_AUDIT: CATEGORY_AUDIT_TEXT[category],
    // Section 0's "one consistent scale" rule is abstract, and its worked example is what makes it
    // land — so the example names pieces this category's sheet actually holds, rather than the hand
    // and torso it named for every subject the app can describe.
    SCALE_EXAMPLE_DESCRIPTION: SCALE_EXAMPLE_TEXT[category],

    RENDER_STYLE_DESCRIPTION: RENDER_STYLE_TEXT[output.renderStyle],
    SURFACE_DETAIL_DESCRIPTION: SURFACE_DETAIL_TEXT[output.surfaceDetail],
    RESOLUTION_PROFILE_DESCRIPTION: RESOLUTION_PROFILE_TEXT[output.resolutionProfile],
    MIN_FEATURE_SIZE: MIN_FEATURE_SIZE[output.resolutionProfile],
    // Emitted only where no palette is pinned, since a pinned one supersedes the budget outright —
    // the value is still supplied because `substitute` throws on a token it has no value for, and
    // the template's own `[IF:PALETTE!=yes]` is what decides whether the line survives to be filled.
    PALETTE_DESCRIPTION: PALETTE_TEXT[output.paletteLimit],
    OUTLINE_DESCRIPTION: OUTLINE_TEXT[output.outlineStyle],
    LIGHTING_DESCRIPTION: LIGHTING_TEXT[output.lightingModel],
    SPRITE_TARGET_SIZE: output.spriteTargetSize,

    HARDWARE_NAME: hardware?.name ?? '',
    HARDWARE_CONSTRAINTS: hardware === null ? '' : describeHardware(hardware),
    PALETTE_NAME: palette?.name ?? '',
    PALETTE_SPECIFICATION: palette === null ? '' : describePalette(palette),

    PROJECTION_DESCRIPTION: PROJECTION_TEXT[output.projection],
    CAMERA_ELEVATION: String(output.cameraElevation),
    DIRECTIONS_DESCRIPTION: describeDirections(coveredDirections),
    // The fix for the defect that made a front-three-quarter, a right-side and a back-three-quarter
    // head come back at the same angle: the facings are stated as object *yaws* beneath a camera the
    // prompt separately pins, rather than as names a generator can satisfy with its favourite view.
    DIRECTIONAL_ROTATION: directionalRotation(coveredDirections),
    LANDMARK_DESCRIPTION: LANDMARK_TEXT[category],
    PRIMARY_DIRECTION: assemblyDirection,
    DEPTH_ORDER_DESCRIPTION: DEPTH_ORDER_TEXT[assemblyDirection],

    BACKGROUND_KEY_DESCRIPTION: BACKGROUND_KEY_TEXT[output.backgroundKey],
    ASPECT_DESCRIPTION: ASPECT_TEXT[output.aspectRatio],
    JOINT_CAP_DESCRIPTION: JOINT_CAP_TEXT[output.jointCapStyle],
    OVERLAP_MARGIN_DESCRIPTION: OVERLAP_MARGIN_TEXT[output.overlapMargin],
    SOCKETS: output.sockets,
    IDENTITY_LOCK: output.identityLock,

    SERIES_POSITION: String(batch.ordinal),
    SERIES_TOTAL: String(batch.sheets.length),
    // Computed whether or not the block survives, as `PALETTE_DESCRIPTION` is: `substitute` throws
    // on a token it has no value for, and the template's own `[IF:SERIES]` is what decides whether
    // the token is still there to be filled.
    SERIES_SHEETS: describeSeries(category, batch, anatomy),
  };

  // The sixteen subject fields, keyed by the upper-case form of their own key rather than written
  // out again — a field added to `SUBJECT_FIELD_KEYS` reaches the template without a second edit.
  //
  // **Each one supplies its label as well as its value**, because section 1 no longer writes the
  // labels itself. Sixteen keys shared by six categories meant one category's vocabulary reaching
  // all of them: a vehicle's *Service Condition* arrived as "Age / Vitality", its turret under
  // "Anatomy base" and its vision slit under "Head & sensory features" — correct values, every one
  // of them labelled from the category the keys were first designed for, in the section the template
  // calls the sole authority for the subject's design and which forbids inferring anything it does
  // not state. Read through `fieldLabelFor` so the prompt and the studio cannot drift apart: they
  // are now the same string.
  for (const key of SUBJECT_FIELD_KEYS) {
    values[key.toUpperCase()] = subject[key];
    values[`${key.toUpperCase()}_LABEL`] = fieldLabelFor(category, key);
  }

  // Rendered from the parse rather than passed through raw, so section 1 and section 4 describe the
  // same anatomy: a field reading `Tail ×0` cannot say one thing at the top of the prompt and
  // another in the inventory. It also empties for `NONE`, which drops the line entirely rather than
  // putting a bare sentinel in the highest-weighted section.
  //
  // **And it empties on a sheet that does not carry the anatomy**, for the same reason and a sharper
  // one. Section 1's own prose says additional anatomy is "the single exception" that section 4
  // lists and counts separately — so naming a tail here on the sheet that draws the limbs, whose
  // inventory has no tail in it and whose contract demands an exact count without one, is a
  // contradiction inside one prompt. The generator resolves it by drawing an uncounted piece or by
  // ignoring a line it was told was binding, and neither is recoverable.
  //
  // Held in a local as well, because `config` below gates section 1's exception sentence on it and
  // reading it back off `values` would come out `string | undefined`.
  const additionalAnatomyLine = sheetCarriesAnatomy(category, mode, output.sheetIndex)
    ? anatomy.map(formatAnatomyComponent).join(', ')
    : '';
  values.ADDITIONAL_ANATOMY = additionalAnatomyLine;

  const config: Record<string, string> = {
    RENDER_STYLE: output.renderStyle,
    RIG_MODE: rigMode,
    // Read from the resolved profile rather than from the stored id, so a configuration naming a
    // machine this build no longer has emits no heading rather than an empty one — the same
    // reasoning that makes `resolveMode` the single answer about the sheet mode.
    HARDWARE_PROFILE: hardware === null ? '' : 'yes',
    // Gates three places at once: the colour clause in section 0, the palette block in section 2,
    // and the audit line in section 9 — and, negated, the palette-strategy line the pinned palette
    // supersedes. One flag, because a pinned palette either governs the sheet's colour or does not.
    PALETTE: palette === null ? '' : 'yes',
    // A second, narrower flag, because section 9's per-component check cites a number section 2 does
    // not always print: seven of the nineteen palettes state no per-component cap, and an audit
    // asking the reader to compare against an allowance that was never given cannot be worked.
    // Read through `perComponentLimit` rather than off `colorsPerComponent`, so the gate answers
    // whether the line was *emitted* rather than whether the field was set.
    PALETTE_PER_COMPONENT: palette !== null && perComponentLimit(palette) !== null ? 'yes' : '',
    // The rules about views *disagreeing* — landmarks, occlusion, no mirroring, the directional
    // audit — only bite where one sheet carries more than one facing. On a single-facing sheet they
    // would be forty lines of instruction about a comparison the generator cannot make.
    MULTI_DIRECTION: coveredDirections.length > 1 ? 'yes' : '',
    // Section 1's "painted onto, never a separate piece" rule names its own exception, and the
    // exception is a line that is often not there — cleared, `NONE`, or on the second sheet of a
    // series, which carries the anatomy on the first. Naming an absent line is worse here than
    // anywhere else in the prompt: the sentence is the one that decides how many components the
    // sheet has. Read off the *rendered* value rather than the raw field, so the gate answers
    // whether the line was emitted rather than whether the user typed something.
    ADDITIONAL_ANATOMY: additionalAnatomyLine,
    // Whether this sheet is one of several, which is a property of the configuration rather than a
    // switch the user sets: the splitter's runs differ from the studio's own configuration only in
    // fields `output` already carries, so a sheet compiled from the drawer and the same sheet
    // compiled from the studio are the same prompt and say the same thing about their batch. A
    // configuration that is one whole deliverable says nothing at all, and its prompt is unchanged.
    SERIES: batch.sheets.length > 1 ? 'yes' : '',
    IDENTITY_LOCK: output.identityLock,
    SOCKETS: output.sockets,
    EMIT_MANIFEST: emitManifest ? 'yes' : '',
    // Read twice by the template: once for the report section itself, and once more by the closing
    // line, which names the second deliverable so the last thing the target reads is not "generate
    // the sheet now" alone.
    EMIT_PROMPT_FEEDBACK: emitPromptFeedback ? 'yes' : '',
    // Section 9's self-audit tells the reader to check the sheet and redraw before delivering. A
    // single-pass diffusion endpoint has no such step, so on those targets it is the most
    // rule-list-shaped block in the template sitting where attention is weakest. Same reasoning as
    // MULTI_DIRECTION above, applied to what the *target* can do rather than what the sheet holds.
    DELIBERATES: deliberates(output.targetModel) ? 'yes' : '',
    // Section 0's category tripwire ends "say so rather than resolving it", which names a channel a
    // pure image endpoint does not have. It is the same argument as DELIBERATES above, applied to
    // the other capability: an instruction that cannot be carried out spends tokens in the
    // highest-weighted section of the prompt to buy nothing. What it guards against is this app's
    // own bug — the category and the inventory are compiled from one value, so they can only
    // disagree if something here is wrong — and only a target with a text channel can report that.
    RETURNS_TEXT: returnsText(output.targetModel) ? 'yes' : '',
  };

  // Blocks, then optionals, then numbering, then substitution — see `templateEngine.ts` for why that
  // order. The marker check sits *before* substitution: afterwards the text carries whatever the user
  // typed, and a subject named `Robot [IF:X] guard` is an odd name rather than a broken template.
  const resolved = applyNumbering(applyOptionals(applyConditionals(PROMPT_TEMPLATE, config), values));
  assertBlocksResolved(resolved);
  const prompt = substitute(resolved, values);

  return wrapForModel(prompt, output.targetModel, {
    aspectRatio: output.aspectRatio,
    backgroundKeyDescription: BACKGROUND_KEY_TEXT[output.backgroundKey],
    frameIsAComponent: FRAME_IS_A_COMPONENT[category],
  });
}

/** Words in the compiled prompt, as the preview counts them. */
export function countWords(prompt: string): number {
  const trimmed = prompt.trim();
  if (!trimmed) return 0;
  return trimmed.split(/\s+/).length;
}

/**
 * A rough token estimate at the usual ~4-characters-per-token heuristic. Deliberately labelled as an
 * estimate in the UI — no tokeniser ships with the app, and the real count depends on which model
 * reads it.
 */
export function estimateTokens(prompt: string): number {
  return Math.round(prompt.length / 4);
}
