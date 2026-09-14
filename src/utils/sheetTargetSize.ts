import type { SheetPlan } from '../types/components.ts';
import type { OutputConfig, StatedTargetSize } from '../types/output.ts';
import type { RigContract } from '../types/rigContract.ts';
import type { SheetSubject, SubjectCategory } from '../types/subject.ts';
import { statedTargetSize } from './componentTargetSize.ts';

/**
 * What size this sheet states, and in the words section 2 prints — one answer, from two sources.
 *
 * **The words and the arithmetic have to come from one place.** Section 2 prints a phrase and the
 * native-grid derivation prices the pair inside it, so a prompt whose text said one figure while its
 * grid seated another would be a sheet nobody could satisfy — and nothing downstream could see the
 * disagreement, because each half would be internally consistent.
 *
 * **A loaded rig contract supersedes the field**, because the frame is a number the engine declares
 * and the field is one somebody transcribed. That is the whole of the precedence: the contract is
 * consulted only where it applies, and the caller has already decided that.
 */
export interface SheetTargetSize {
  /** The size with the quantity it is a size of, or `null` where the sheet states none. */
  readonly stated: StatedTargetSize | null;
  /** The same, as the phrase section 2 prints. Empty where the sheet states no size. */
  readonly text: string;
}

export function sheetTargetSize(
  category: SubjectCategory,
  subject: SheetSubject,
  output: OutputConfig,
  plan: SheetPlan,
  rig: RigContract | null,
): SheetTargetSize {
  if (rig === null) {
    return {
      stated: statedTargetSize(
        category,
        subject,
        output.directionalMode,
        output.directions,
        output.sheetIndex,
        output.spriteTargetSize,
      ),
      // The reader's own prose rather than the parse, which is narrower: `48 × 96 px assembled
      // (2 metres tall at 48 px per metre)` states a scale the pair alone cannot carry, and section
      // 2 is where a reader put it to be read.
      text: output.spriteTargetSize,
    };
  }

  // The quantity comes off the plan rather than being written as a literal, which would be the
  // enumeration `componentTargetSize` already owns, stated a second time.
  return {
    stated: { quantity: plan.targetQuantity, size: rig.frame_size },
    text: `${String(rig.frame_size.width)} × ${String(rig.frame_size.height)} px assembled`,
  };
}
