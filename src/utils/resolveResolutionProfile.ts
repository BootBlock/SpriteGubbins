import type { ResolutionProfile } from '../types/output.ts';
import type { RigContract } from '../types/rigContract.ts';

/**
 * The profile a sheet is drawn at: the stored one, or `CUSTOM` wherever a rig contract applies.
 *
 * **A sheet states one scale, and the profile is where it is chosen** (issue #405). `HIGH_RESOLUTION`,
 * `MID_RESOLUTION` and `RETRO_16_BIT` each state a scale of their own, and `CUSTOM` is the one that
 * defers to a stated size — so the typed size is read only under `CUSTOM` (see `statedTargetSize`),
 * and a loaded rig, which states its frame and every piece's size, makes the profile `CUSTOM` on the
 * sheet it describes. Left to the stored profile, the shipped rig preset printed a share of the cell
 * beside the engine's own frame and a native grid derived from its pieces: three scales, one line
 * apart.
 *
 * It is `resolveCameraElevation`'s pattern: the stored value is left alone, so it returns the moment
 * the contract is removed. The compiler, the studio header and the control take this answer rather
 * than the raw field. The quantiser and the atlas planner read the stored profile, which gives the
 * same result: they want one component's size, and every sheet a rig applies to states an assembly,
 * so `componentTargetSize` answers `null` there under any profile.
 */
export function resolveResolutionProfile(
  profile: ResolutionProfile,
  rig: RigContract | null,
): ResolutionProfile {
  return rig === null ? profile : 'CUSTOM';
}
