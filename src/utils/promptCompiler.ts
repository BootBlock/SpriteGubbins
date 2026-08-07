import {
  ASPECT_TEXT,
  ASSEMBLY_POSES,
  BACKGROUND_KEY_TEXT,
  COMPONENT_BREAKDOWNS,
  COMPONENT_COUNTS,
  DEPTH_ORDER_TEXT,
  DIRECTION_COVERAGE,
  DIRECTION_LISTS,
  describeDirections,
  JOINT_CAP_TEXT,
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
import type { Direction } from '../types/rendering.ts';
import { SUBJECT_FIELD_KEYS } from '../types/subject.ts';
import type { SubjectCategory, SubjectDefinition } from '../types/subject.ts';
import { supportsManifest, wrapForModel } from './modelWrappers.ts';
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
  const [primaryDirection] = DIRECTION_LISTS[output.directions];

  // The facings the *sheet* covers, which is not simply the set the user chose: each mode's inventory
  // and component count are written for a particular number of directions. A single-direction mode
  // takes the chosen set's first facing — the set is its run list, one sheet per direction — so a
  // fifteen-piece cut-out sheet cannot also demand all eight compass points.
  const coverage = DIRECTION_COVERAGE[output.directionalMode];
  const coveredDirections: readonly [Direction, ...Direction[]] =
    coverage === 'primary' ? [primaryDirection] : DIRECTION_LISTS[coverage];
  const [assemblyDirection] = coveredDirections;

  // Sockets belong to a cut-out rig. The template's `[IF:SOCKETS]` block is a *sibling* of the rig
  // section rather than nested inside it — the engine's blocks are flat by contract — so the gate
  // lives here instead, and a socket list left over from a rig configuration cannot strand an
  // orphaned heading in a pose-library sheet.
  const sockets = output.rigMode === 'CUTOUT_RIG' ? output.sockets : '';

  // Only a target that returns text alongside the image can honour a manifest; asking a pure image
  // endpoint for one just spends tokens on an instruction it will drop.
  const emitManifest = output.emitManifest && supportsManifest(output.targetModel);

  const values: Record<string, string> = {
    CATEGORY: category,
    COMPONENT_COUNT: String(COMPONENT_COUNTS[output.directionalMode]),
    COMPONENT_BREAKDOWN: COMPONENT_BREAKDOWNS[output.directionalMode],
    ASSEMBLY_POSES: ASSEMBLY_POSES[output.directionalMode],

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
    PRIMARY_DIRECTION: assemblyDirection,
    DEPTH_ORDER_DESCRIPTION: DEPTH_ORDER_TEXT[assemblyDirection],

    BACKGROUND_KEY_DESCRIPTION: BACKGROUND_KEY_TEXT[output.backgroundKey],
    ASPECT_DESCRIPTION: ASPECT_TEXT[output.aspectRatio],
    JOINT_CAP_DESCRIPTION: JOINT_CAP_TEXT[output.jointCapStyle],
    OVERLAP_MARGIN_DESCRIPTION: OVERLAP_MARGIN_TEXT[output.overlapMargin],
    SOCKETS: sockets,
    IDENTITY_LOCK: output.identityLock,
  };

  // The sixteen subject fields, keyed by the upper-case form of their own key rather than written
  // out again — a field added to `SUBJECT_FIELD_KEYS` reaches the template without a second edit.
  for (const key of SUBJECT_FIELD_KEYS) values[key.toUpperCase()] = subject[key];

  const config: Record<string, string> = {
    RENDER_STYLE: output.renderStyle,
    RIG_MODE: output.rigMode,
    IDENTITY_LOCK: output.identityLock,
    SOCKETS: sockets,
    EMIT_MANIFEST: emitManifest ? 'yes' : '',
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
