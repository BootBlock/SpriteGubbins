import type { ResolutionProfile } from '../types/output.ts';

/**
 * The field as a sheet reads it: its text under the `CUSTOM` profile, and empty under any other.
 *
 * **The field is read only under `CUSTOM`** (issue #405). The other three profiles each state a
 * scale of their own, so a size read beside one of them is a second answer to the question the
 * profile has already answered: the prompt printed a share of the cell or a retro height one line
 * above a pixel size, and the quantiser and the atlas measured against a figure the prompt's own
 * profile contradicted. The studio offers the field only under `CUSTOM`, and a value typed there
 * stays in the store for the reader who switches back to it. Section 2's words and every parse of the
 * field take this answer, so the line and the arithmetic cannot disagree about whether a size is
 * stated.
 */
export function targetSizeField(profile: ResolutionProfile, spriteTargetSize: string): string {
  return profile === 'CUSTOM' ? spriteTargetSize : '';
}
