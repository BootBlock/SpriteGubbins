import type { ImageOutputConfig, OutputConfig } from '../types/output.ts';

/**
 * Moving between the whole output configuration and the image half of it.
 *
 * The two directions are here together because they have to agree about one thing, and they are the
 * only code that knows it: **which fields are the user's rather than the sheet's**. Splitting them
 * across two files would mean adding a third companion output in one place and not the other, and
 * the failure is silent in both directions — a preset that quietly stores a preference, or a load
 * that quietly overwrites one.
 *
 * `OutputConfig` extends `ImageOutputConfig`, so TypeScript is happy to pass a whole configuration
 * wherever the image half is wanted; structural typing has no way to *forbid* the extra fields. That
 * is exactly why `toImageConfig` exists as a runtime step rather than as a cast: what gets saved and
 * exported has to actually be the image half, not merely be typed as it.
 *
 * Pure, so which fields belong to which half is testable without a store or a database.
 */

/**
 * Everything but the companion outputs — what a preset is allowed to hold.
 *
 * Written as a rest-of-object so the image half is whatever `OutputConfig` has *minus* these two:
 * listing the other twenty-five would be a copy to keep in step, and a field added to the type and
 * not to the copy would silently stop being saved. The two names carry the `_` prefix
 * `eslint.config.js` reserves for a binding that exists only so something else can be taken.
 */
export function toImageConfig(output: OutputConfig): ImageOutputConfig {
  const { emitManifest: _emitManifest, emitPromptFeedback: _emitPromptFeedback, ...image } = output;
  return image;
}

/**
 * An image configuration made whole again, taking the companion outputs from `from`.
 *
 * `from` is the *current* studio configuration wherever this is loading something into it, which is
 * what keeps the user's two answers theirs across a preset load.
 */
export function withCompanionOutputs(image: ImageOutputConfig, from: OutputConfig): OutputConfig {
  return {
    ...image,
    emitManifest: from.emitManifest,
    emitPromptFeedback: from.emitPromptFeedback,
  };
}
