import { PRACTICAL_COMPONENT_CEILING } from './promptText/inventory.ts';

/**
 * The cap the user puts on how many components one generation may be asked for.
 *
 * Distinct from `PRACTICAL_COMPONENT_CEILING` in `promptText/inventory.ts`, which is a fact about
 * current models that bounds what the app may *ship* — no mode and no preset may exceed it. This is
 * a preference: the user's own target model may do better or worse, so they set the number and the
 * studio tells them when the sheet has outgrown it.
 */

/**
 * The budget meaning "no cap".
 *
 * Zero rather than a nullable number, because `OutputConfig` has no optional members — an optional
 * field would push `?? fallback` handling into every reader. Zero is also the honest spelling: a
 * budget of nought components is not a sheet anybody could want, so the value is free to mean
 * something else, and "unset" and "uncapped" are the same intent.
 */
export const NO_COMPONENT_BUDGET = 0;

/**
 * What a stored or typed budget is allowed to be.
 *
 * The ceiling is far above `PRACTICAL_COMPONENT_CEILING` on purpose: this is a bound on corrupt
 * storage and slipped keystrokes, not a second opinion about what a model can draw. Anything at or
 * above the largest count the app can produce already behaves as no cap, so the exact figure only
 * has to be comfortably past it.
 */
export const COMPONENT_BUDGET_RANGE = { min: NO_COMPONENT_BUDGET, max: 999 } as const;

/**
 * Why the over-budget notice is worth heeding, shown under its headline in `ComponentBudgetNotice`.
 *
 * Here rather than in the component because it states `PRACTICAL_COMPONENT_CEILING`, and a figure
 * typed into the markup would go on stating the old one after the ceiling moved.
 */
export const OVER_BUDGET_EXPLANATION = `Current models deliver about ${String(PRACTICAL_COMPONENT_CEILING)} components before they start merging or dropping pieces, and they do not reliably count their own output — so the sheet comes back a plausible subset rather than short in an obvious way. Choose lighter sheet contents, trim the additional anatomy, or raise the component budget if your target model can take it.`;
