import {
  ASPECT_TEXT,
  BACKGROUND_KEY_TEXT,
  CATEGORY_AUDIT_TEXT,
  CATEGORY_EXCLUSION_TEXT,
  CATEGORY_GUARD_TEXT,
  DEPTH_ORDER_TEXT,
  describeDirections,
  JOINT_CAP_TEXT,
  LANDMARK_TEXT,
  LIGHTING_TEXT,
  MIN_FEATURE_SIZE,
  OUTLINE_TEXT,
  OVERLAP_MARGIN_TEXT,
  PALETTE_TEXT,
  PROJECTION_TEXT,
  RENDER_STYLE_TEXT,
  RESOLUTION_PROFILE_TEXT,
  SURFACE_DETAIL_TEXT,
} from '../constants/promptText/index.ts';
import { PROMPT_TEMPLATE } from '../constants/promptTemplate.ts';
import type { OutputConfig } from '../types/output.ts';
import { SUBJECT_FIELD_KEYS } from '../types/subject.ts';
import type { SubjectCategory, SubjectDefinition } from '../types/subject.ts';
import { resolveMode } from '../constants/sheetPlans/index.ts';
import { formatAnatomyComponent, parseAdditionalAnatomy } from './additionalAnatomy.ts';
import { assemblyFor, componentBreakdownFor, componentCountFor } from './componentSet.ts';
import { directionalRotation } from './directionalRotation.ts';
import { wrapForModel } from './modelWrappers.ts';
import { deliberates, supportsManifest } from './targetCapabilities.ts';
import { sheetDirections } from './sheetDirections.ts';
import { applyConditionals, applyOptionals, assertBlocksResolved, substitute } from './templateEngine.ts';

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

  // Which facings this sheet covers and which it assembles towards — resolved in `sheetDirections`
  // because the splitter labels its runs from the same answer, and two implementations of it would
  // eventually disagree about the prompt one of them is describing.
  const { covered: coveredDirections, assembly: assemblyDirection } = sheetDirections({
    ...output,
    directionalMode: mode,
  });

  // Only a target that returns text alongside the image can honour a manifest; asking a pure image
  // endpoint for one just spends tokens on an instruction it will drop.
  const emitManifest = output.emitManifest && supportsManifest(output.targetModel);

  // Additional anatomy is separate pieces by section 1's own rule, so it is counted and listed
  // rather than folded into a neighbouring component — otherwise the sheet asks for more pieces than
  // the contract says it has, which is the one arithmetic the whole template rests on.
  const anatomy = parseAdditionalAnatomy(subject.additional_anatomy);

  const values: Record<string, string> = {
    CATEGORY: category,
    COMPONENT_COUNT: String(componentCountFor(category, mode, anatomy)),
    COMPONENT_BREAKDOWN: componentBreakdownFor(category, mode, anatomy),
    // Every one of these is now a function of the category as well as the mode. That is the whole
    // correction: an inventory, an assembly sentence and an exclusion list that knew only the mode
    // are what let a CHARACTER sheet ask for floors and walls and then forbid them.
    CATEGORY_GUARD: CATEGORY_GUARD_TEXT[category],
    ASSEMBLY_POSES: assemblyFor(category, mode),
    CATEGORY_EXCLUSIONS: CATEGORY_EXCLUSION_TEXT[category],
    CATEGORY_AUDIT: CATEGORY_AUDIT_TEXT[category],

    RENDER_STYLE_DESCRIPTION: RENDER_STYLE_TEXT[output.renderStyle],
    SURFACE_DETAIL_DESCRIPTION: SURFACE_DETAIL_TEXT[output.surfaceDetail],
    RESOLUTION_PROFILE_DESCRIPTION: RESOLUTION_PROFILE_TEXT[output.resolutionProfile],
    MIN_FEATURE_SIZE: MIN_FEATURE_SIZE[output.resolutionProfile],
    PALETTE_DESCRIPTION: PALETTE_TEXT[output.paletteLimit],
    OUTLINE_DESCRIPTION: OUTLINE_TEXT[output.outlineStyle],
    LIGHTING_DESCRIPTION: LIGHTING_TEXT[output.lightingModel],
    SPRITE_TARGET_SIZE: output.spriteTargetSize,

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
  };

  // The sixteen subject fields, keyed by the upper-case form of their own key rather than written
  // out again — a field added to `SUBJECT_FIELD_KEYS` reaches the template without a second edit.
  for (const key of SUBJECT_FIELD_KEYS) values[key.toUpperCase()] = subject[key];

  // Rendered from the parse rather than passed through raw, so section 1 and section 4 describe the
  // same anatomy: a field reading `Tail ×0` cannot say one thing at the top of the prompt and
  // another in the inventory. It also empties for `NONE`, which drops the line entirely rather than
  // putting a bare sentinel in the highest-weighted section.
  values.ADDITIONAL_ANATOMY = anatomy.map(formatAnatomyComponent).join(', ');

  const config: Record<string, string> = {
    RENDER_STYLE: output.renderStyle,
    RIG_MODE: output.rigMode,
    // The rules about views *disagreeing* — landmarks, occlusion, no mirroring, the directional
    // audit — only bite where one sheet carries more than one facing. On a single-facing sheet they
    // would be forty lines of instruction about a comparison the generator cannot make.
    MULTI_DIRECTION: coveredDirections.length > 1 ? 'yes' : '',
    IDENTITY_LOCK: output.identityLock,
    SOCKETS: output.sockets,
    EMIT_MANIFEST: emitManifest ? 'yes' : '',
    // Section 9's self-audit tells the reader to check the sheet and redraw before delivering. A
    // single-pass diffusion endpoint has no such step, so on those targets it is the most
    // rule-list-shaped block in the template sitting where attention is weakest. Same reasoning as
    // MULTI_DIRECTION above, applied to what the *target* can do rather than what the sheet holds.
    DELIBERATES: deliberates(output.targetModel) ? 'yes' : '',
  };

  // Blocks first, then optionals, then substitution — see `templateEngine.ts` for why that order. The
  // marker check sits *before* substitution: afterwards the text carries whatever the user typed, and
  // a subject named `Robot [IF:X] guard` is an odd name rather than a broken template.
  const resolved = applyOptionals(applyConditionals(PROMPT_TEMPLATE, config), values);
  assertBlocksResolved(resolved);
  const prompt = substitute(resolved, values);

  return wrapForModel(prompt, output.targetModel, {
    aspectRatio: output.aspectRatio,
    backgroundKeyDescription: BACKGROUND_KEY_TEXT[output.backgroundKey],
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
