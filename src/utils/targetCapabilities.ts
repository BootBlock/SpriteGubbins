import { TARGET_MODELS } from '../constants/models.ts';
import type { PromptBudget, TargetCapabilities, TargetModelId } from '../types/output.ts';

/**
 * What each target generator can do with the prompt, looked up by id.
 *
 * The capabilities themselves are declared on the model entries in `constants/models.ts`, beside
 * the name and description, so there is one place a target is described rather than a set of ids per
 * capability sitting somewhere else. See {@link TargetCapabilities} for what each one means and why
 * it is a property of the endpoint rather than a preference.
 *
 * Built once. `TARGET_MODELS` is a compile-time constant, so rebuilding this map per call would be
 * work with no possible change in answer.
 */
const CAPABILITIES: ReadonlyMap<TargetModelId, TargetCapabilities> = new Map(
  TARGET_MODELS.map((model) => [model.id, model.capabilities]),
);

/**
 * Every id in the union has an entry, because `TARGET_MODELS` is typed `TargetModel[]` and a
 * `TargetModel` cannot be written without its capabilities. A test pins the converse — that the
 * table covers the union — since the type cannot say the list is exhaustive.
 */
function capabilitiesFor(target: TargetModelId): TargetCapabilities {
  const capabilities = CAPABILITIES.get(target);
  if (!capabilities) throw new Error(`No capabilities declared for target model "${target}".`);
  return capabilities;
}

/**
 * Whether this target works *through* the prompt as a procedure rather than conditioning on it as
 * one description.
 *
 * What it gates is instruction the target cannot carry out: the self-audit tells the reader
 * to check the sheet against the specification and redraw before delivering, which a single-pass
 * diffusion endpoint has no step for. Emitting it there spends tokens at the *end* of the prompt —
 * where attention is weakest — on the most rule-list-shaped block in the template, which is exactly
 * what the guidance for Imagen warns against.
 */
export function deliberates(target: TargetModelId): boolean {
  return capabilitiesFor(target).deliberates;
}

/**
 * Whether this target hands back text alongside the image.
 *
 * A pure image endpoint has no channel for it, so anything the template asks to be *written* spends
 * tokens on an instruction it can only drop — which is why both companion outputs are gated rather
 * than emitted and silently ignored.
 *
 * Named for the capability rather than for the manifest it was first added to gate: the adherence
 * report needs the same channel, and a predicate called `supportsManifest` answering "may this
 * target write a report?" would be the loose seam where the two quietly stop meaning the same thing.
 */
export function returnsText(target: TargetModelId): boolean {
  return capabilitiesFor(target).emitsText;
}

/**
 * Whether this target can audit the sheet it just produced and write back about it.
 *
 * The conjunction of the two capabilities above, and it needs both halves for different reasons:
 * without {@link deliberates} there is no pass in which to re-read the specification against the
 * pixels, and without {@link returnsText} there is nowhere to put the answer. Seedream is the target
 * that proves they are separate questions — it plans before it renders, and still returns nothing
 * but an image.
 *
 * Stated once here rather than composed at each call site, because the compiler's gate and the
 * studio's availability check must agree: a checkbox the user can tick that compiles to nothing is
 * the failure this file exists to prevent.
 */
export function supportsPromptFeedback(target: TargetModelId): boolean {
  return deliberates(target) && returnsText(target);
}

/**
 * The documented ceiling on how much prompt this target will read, or `null` where none is
 * published.
 *
 * `null` means nobody stated a figure — never that the target is unlimited. Treating the two as the
 * same is how a prompt ends up silently truncated by a text encoder that was documented all along.
 */
export function promptBudgetFor(target: TargetModelId): PromptBudget | null {
  return capabilitiesFor(target).promptBudget;
}
