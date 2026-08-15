import type { HardwareProfileId } from './hardware.ts';
import type { PaletteId } from './palette.ts';
import type { Projection, RenderStyle } from './rendering.ts';
import type {
  LightingModel,
  OutlineStyle,
  PaletteLimit,
  ResolutionProfile,
  SurfaceDetail,
} from './output.ts';

/**
 * A published game whose art direction this sheet is drawn to match.
 *
 * **A reference is a measurement, not an homage.** What it carries into the prompt is the geometry a
 * look is actually made of — the grid the art sits on, the size a figure is drawn at, how many ways
 * it turns, whether the contour is black or a darker shade of the fill, and where the light comes
 * from. Those are facts about the artwork, and they are what a generator can act on. "Draw it like
 * Stardew Valley" is not: it is an adjective, and this app's whole argument is that a generator
 * resolves an adjective however it likes and a number the same way every time.
 *
 * That is why {@link StyleReference.characteristics} reaches the prompt whether or not
 * {@link StyleReference.name} does — see `nameStyleReference` in `ImageOutputConfig`. Naming the game
 * is an amplifier a reader may switch on, never the substance; a reference whose look survives only
 * while its title is attached has not been specified, and does not belong in this library.
 *
 * **The line between this and a hardware profile.** A profile is a machine, and its constraints are
 * what the silicon could put on a screen — every game on that machine obeyed them. A reference is one
 * team's answer *within* those limits, which is why a reference may name a profile in its own settings
 * and pin the palette that goes with it: `LINKS_AWAKENING` is the Game Boy plus a set of decisions
 * about tile size, facings and outline that Nintendo made and the hardware did not. Where a look ran
 * on no fixed machine the profile is `NONE`, and the reference carries the whole statement itself.
 */

/**
 * The settings a reference writes when it is chosen.
 *
 * Every field is required rather than a `Partial<ImageOutputConfig>`, on the same argument
 * `HardwareSettings` makes: adding a reference is a compile error until it has answered all of them,
 * and the set of settings a reference speaks for is visible here rather than being whatever some
 * object literal happened to include.
 *
 * **The fields a reference deliberately does not write** are the ones that describe the *deliverable*
 * rather than the look: the sheet mode, which sheet of a series this is, the rig, the sockets, the
 * background key, the aspect ratio, the target model and the identity lock. Two sheets drawn to the
 * same reference — a character turnaround and a tileset — differ in every one of those and agree in
 * every field below, which is exactly where the line falls. A preset is what pairs the two halves.
 */
export interface StyleReferenceSettings {
  readonly renderStyle: RenderStyle;
  readonly surfaceDetail: SurfaceDetail;
  /** `CUSTOM` wherever the look states a pixel size, which is what makes {@link spriteTargetSize} the scale. */
  readonly resolutionProfile: ResolutionProfile;
  /** `W × H px`, in the form `parseTargetSize` reads, or empty where the look fixes no figure size. */
  readonly spriteTargetSize: string;
  readonly outlineStyle: OutlineStyle;
  readonly lightingModel: LightingModel;
  readonly projection: Projection;
  /** Degrees above the horizon — the ground read is half of what makes a top-down game recognisable. */
  readonly cameraElevation: number;
  /** The machine the art was drawn for, or `NONE` where the look ran on no fixed hardware. */
  readonly hardwareProfile: HardwareProfileId;

  /**
   * The colours the look may use, or `FREE` where it was never pinned to a set.
   *
   * **Exactly one of this and {@link paletteLimit} states the colour**, which is the invariant
   * `styleReferences.test.ts` holds. A pinned palette supersedes the budget everywhere — the prompt
   * drops the budget line, the quantiser ignores the count — so a reference that pins one and *also*
   * names a budget would be writing a field that does nothing, and quietly overwriting the reader's
   * own budget for when they set the palette back to `FREE`. That is the trap `HardwareSettings`
   * avoided by omitting `paletteLimit` outright; a reference cannot, because a modern look pins no
   * palette and the budget is then the only colour statement it has.
   */
  readonly palette: PaletteId;
  /** The colour budget, or `null` where {@link palette} is the statement instead. */
  readonly paletteLimit: PaletteLimit | null;
}

/**
 * Every reference the studio offers, `NONE` first.
 *
 * `NONE` is a member for the same reason it is one in `HARDWARE_PROFILE_IDS`: a `SelectField` needs a
 * value to render. Choosing it writes **only** this field — the settings a previous reference applied
 * are the reader's now, and reverting them would discard whatever they have edited since.
 *
 * Ordered by how the sheet is read rather than by date or platform: the overhead looks, the side-on
 * looks, the projected-grid looks, and the one that is not pixel art at all. A reader arrives here
 * knowing what their game looks like from the player's seat, which is the only thing they can match
 * a list against before they have chosen anything.
 */
export const STYLE_REFERENCE_IDS = [
  'NONE',
  'STARDEW_VALLEY',
  'A_LINK_TO_THE_PAST',
  'LINKS_AWAKENING',
  'POKEMON_EMERALD',
  'SONIC_THE_HEDGEHOG',
  'SHOVEL_KNIGHT',
  'CAVE_STORY',
  'CELESTE',
  'TERRARIA',
  'BLASPHEMOUS',
  'DIABLO_II',
  'AGE_OF_EMPIRES_II',
] as const;
export type StyleReferenceId = (typeof STYLE_REFERENCE_IDS)[number];

/** One reference's whole definition. */
export interface StyleReference {
  readonly id: StyleReferenceId;
  /**
   * The game, as the prompt names it when the reader asks for it to be named — `Stardew Valley`.
   *
   * Reached only through `nameStyleReference`, and never load-bearing: everything the sheet needs is
   * in {@link characteristics}, which is emitted either way.
   */
  readonly name: string;
  /**
   * The dropdown's own wording, at most 50 characters: the game and the one fact that distinguishes
   * its look from its neighbours in the list.
   *
   * The same budget every other select in the studio keeps, and for the same reason — a native
   * `<select>` truncates the tail, which is the half a reader is choosing by. See
   * `tests/select-option-labels.test.ts`, which enforces it.
   */
  readonly label: string;
  /**
   * What the look is made of that {@link settings} **cannot say**, one statement per line, given to
   * the generator verbatim.
   *
   * **The restriction is the whole design, and it is not tidiness.** A reference writes its settings
   * and then the reader is free to edit them — that is what makes it a template rather than a lock.
   * So a characteristic that restated a setting would become a lie the moment one was changed: pick
   * a top-down reference, switch the projection to isometric, and the prompt would carry
   * `TRUE_ISOMETRIC` on one line and "characters are drawn in flat front elevation" three lines
   * below. That is the self-contradicting prompt this app's prompt rules exist to prevent, and here
   * it would arrive without anybody doing anything wrong.
   *
   * What is left is everything a look is made of that has no field to live in: the tile grid, the
   * internal resolution the art was authored for, how many facings were drawn against how many the
   * engine produced by mirroring, the convention behind a colour choice the palette can only list.
   * This is the same discipline `HardwareProfile.constraints` keeps — "there is no field for 8
   * sprites per scanline" — applied to a look instead of a machine.
   *
   * Measurements and drawing decisions only. Never a value judgement, never a mood, and never a
   * comparison to another game: this is the half that has to carry the look with the title withheld.
   *
   * It is also the studio's own description of the chosen reference, joined into one line under the
   * control, so what the reader is shown and what the generator is told cannot drift apart.
   */
  readonly characteristics: readonly string[];
  readonly settings: StyleReferenceSettings;
}
