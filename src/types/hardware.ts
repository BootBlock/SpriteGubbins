import type { PaletteId } from './palette.ts';
import type { RenderStyle } from './rendering.ts';
import type { LightingModel, OutlineStyle, ResolutionProfile, SurfaceDetail } from './output.ts';

/**
 * A machine the sheet is drawn for — the geometry half of "draw this the way a Game Boy could".
 *
 * **A profile owns structure; a palette owns colour, and neither says a word about the other.** That
 * split is what lets the two be independent controls: a Mega Drive profile carrying a Game Boy
 * palette is an unusual request rather than a prompt that contradicts itself. Fold colour into the
 * profile and the two would fight the moment a user changed one of them — which they are entitled
 * to do, since both are ordinary settings once applied.
 *
 * Choosing a profile does two things. It **writes a settings package** into the output configuration
 * — this is the template the studio's dropdown offers — and it **stays**, because the machine's name
 * is the most useful line the prompt can carry: a generator knows what a Game Boy sprite looks like
 * in a way that four hex values cannot convey. Nothing it emits afterwards overlaps a field the user
 * can edit, so there is no drift between the two to detect and no re-apply prompt to build.
 */

/**
 * The settings a profile writes when it is chosen.
 *
 * Every field is required rather than a `Partial<OutputConfig>`, and that is the point: adding a
 * machine is a compile error until it has answered all seven, and the set of fields a profile speaks
 * for is visible here rather than being whatever some object literal happened to include.
 *
 * **`paletteLimit` is deliberately absent.** A pinned palette supersedes it everywhere, so writing
 * one would set a field that does nothing — and would quietly overwrite the user's own budget for
 * when they set the palette back to `FREE`.
 */
export interface HardwareSettings {
  readonly renderStyle: RenderStyle;
  readonly surfaceDetail: SurfaceDetail;
  /** Always `CUSTOM`, which is what makes {@link spriteTargetSize} the statement of scale. */
  readonly resolutionProfile: ResolutionProfile;
  /** `W × H px`, in the form `parseTargetSize` reads. */
  readonly spriteTargetSize: string;
  readonly outlineStyle: OutlineStyle;
  readonly lightingModel: LightingModel;
  readonly palette: PaletteId;
}

/**
 * Every machine the studio offers, `NONE` first.
 *
 * `NONE` is a member for the same reason `FREE` is one in `PALETTE_IDS`: a `SelectField` needs a
 * value to render. Choosing it writes **only** this field — the settings a previous profile applied
 * are the user's now, and silently reverting them would discard work they may have edited since.
 *
 * Ordered by family, which is the order the dropdown shows.
 */
export const HARDWARE_PROFILE_IDS = [
  'NONE',
  'GAME_BOY',
  'GAME_BOY_COLOR',
  'NES',
  'SNES',
  'MASTER_SYSTEM',
  'MEGA_DRIVE',
  'GAME_GEAR',
  'PC_ENGINE',
  'NEO_GEO',
  'COMMODORE_64',
  'ZX_SPECTRUM',
  'AMIGA_OCS',
  'ATARI_ST',
  'ATARI_2600',
  'CGA',
  'EGA',
  'VGA_256',
  'PICO_8',
] as const;
export type HardwareProfileId = (typeof HARDWARE_PROFILE_IDS)[number];

/** One machine's whole definition. */
export interface HardwareProfile {
  readonly id: HardwareProfileId;
  /** The machine, as the prompt names it — `Nintendo Game Boy (DMG)`. */
  readonly name: string;
  /**
   * The dropdown's own wording, at most 50 characters: the name and the native display.
   *
   * Geometry only, never colour — the palette's label carries that, and a profile label quoting a
   * colour count would be repeating a fact it does not own. See {@link Palette.label} for why these
   * two selects show a name where every other studio select shows its stored identifier.
   */
  readonly label: string;
  /**
   * The machine's structural limits, one per line, stated to the generator verbatim.
   *
   * Facts, not preferences: native display, pixel shape, tile grid, hardware sprite sizes and how
   * many of them the machine could show. They are what {@link settings} cannot express — there is no
   * field for "8 sprites per scanline" — and they are also the studio's own description of the
   * chosen profile, joined into one line under the control, so the two cannot disagree.
   */
  readonly constraints: readonly string[];
  readonly settings: HardwareSettings;
}
