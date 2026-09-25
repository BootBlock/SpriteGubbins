import type { SheetPlan } from '../types/components.ts';
import type { OutputConfig, ResolutionProfile, StatedTargetSize, TargetSize } from '../types/output.ts';
import type { RigContract } from '../types/rigContract.ts';
import type { SheetSubject, SubjectCategory } from '../types/subject.ts';
import { statedTargetSize } from './componentTargetSize.ts';
import { targetSizeField } from './targetSizeField.ts';
import { nativeGridScale } from './nativeGridScale.ts';
import { resolveResolutionProfile } from './resolveResolutionProfile.ts';

/**
 * How big this sheet's things are, and the grid they are drawn on — one answer, read five ways.
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
export interface SheetSizing {
  /**
   * The profile the sheet is drawn at — `CUSTOM` wherever a rig contract applies, per
   * `resolveResolutionProfile`. Here because it decides whether the field is read at all, so the
   * profile line and the size line beneath it take one answer.
   */
  readonly profile: ResolutionProfile;
  /** The size with the quantity it is a size of, or `null` where the sheet states none. */
  readonly stated: StatedTargetSize | null;
  /** The same, as the phrase section 2 prints. Empty where the sheet states no size. */
  readonly text: string;
  /**
   * {@link stated} narrowed to a genuine **component** size, for the readers that can do nothing
   * with an assembly.
   *
   * Each of them seats or measures one component, and an assembled figure fed to any of them prices
   * a canvas of fifteen whole characters. `minFeatureSize` takes the wider value instead, because it
   * has a defensible floor to state on such a sheet and no floor at all is worse than a permissive
   * one.
   */
  readonly component: TargetSize | null;
  /**
   * The whole-number enlargement the native pixel grid is delivered at, or `null` where this
   * configuration has no native grid — see `nativeGridScale` for the three ways that happens.
   *
   * It is here rather than beside its own function because it is a fact *about this sheet*, read
   * three times downstream: as the value, as the flag gating the three places that state it, and as
   * the unit the pixel-discipline minimum is counted in. A phase deriving it again could carry the
   * carve-out without the figure it points at.
   */
  readonly nativeScale: number | null;
}

/**
 * The profile, the stated size and its words, without the grid.
 *
 * Split out for the studio's own header, which names what the sheet states and has no use for a
 * multiple — and no component count to price one with. Everything below composes this rather than
 * restating it, so the header and section 2 cannot disagree about what the sheet says.
 */
export function sheetTargetSize(
  category: SubjectCategory,
  subject: SheetSubject,
  output: OutputConfig,
  plan: SheetPlan,
  rig: RigContract | null,
): Pick<SheetSizing, 'profile' | 'stated' | 'text'> {
  const profile = resolveResolutionProfile(output.resolutionProfile, rig);

  // The quantity comes off the plan rather than being written as a literal, which would be the
  // enumeration `componentTargetSize` already owns, stated a second time.
  const stated: StatedTargetSize | null =
    rig === null
      ? statedTargetSize(
          category,
          subject,
          output.directionalMode,
          output.directions,
          output.sheetIndex,
          profile,
          output.spriteTargetSize,
        )
      : { quantity: plan.targetQuantity, size: rig.frame_size };

  // The reader's own prose where they wrote some, because the parse is narrower: `48 × 96 px
  // assembled (2 metres tall at 48 px per metre)` states a scale the pair alone cannot carry. From
  // the rig it carries no “assembled”, since section 2's own line already reads “Target assembled
  // size, for the complete subject once its pieces are put together”. Empty under any profile but
  // `CUSTOM`, which states a scale of its own — see `targetSizeField`.
  const text =
    rig === null
      ? targetSizeField(profile, output.spriteTargetSize)
      : `${String(rig.frame_size.width)} × ${String(rig.frame_size.height)} px`;

  return { profile, stated, text };
}

export function sheetSizing(
  category: SubjectCategory,
  subject: SheetSubject,
  output: OutputConfig,
  plan: SheetPlan,
  rig: RigContract | null,
  components: number,
): SheetSizing {
  const { profile, stated, text } = sheetTargetSize(category, subject, output, plan, rig);
  const component = stated?.quantity === 'COMPONENT' ? stated.size : null;

  return {
    profile,
    stated,
    text,
    component,
    nativeScale: nativeGridScale(output.renderStyle, component, output.aspectRatio, components, rig),
  };
}
