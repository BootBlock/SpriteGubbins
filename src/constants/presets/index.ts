import type { PresetArchetype } from '../../types/preset.ts';
import { BUILDING_STREET_PRESETS } from './buildingStreet.ts';
import { BUILDING_TILESET_PRESETS } from './buildingTilesets.ts';
import { CHARACTER_CORE_PRESETS } from './characterCore.ts';
import { CHARACTER_RIG_PRESETS } from './characterRigs.ts';
import { CHARACTER_STYLE_PRESETS } from './characterStyles.ts';
import { CREATURE_BEAST_PRESETS } from './creatureBeasts.ts';
import { CREATURE_HORROR_PRESETS } from './creatureHorrors.ts';
import { ITEM_GEAR_PRESETS } from './itemGear.ts';
import { ITEM_WEAPON_PRESETS } from './itemWeapons.ts';
import { OBJECT_MACHINE_PRESETS } from './objectMachines.ts';
import { OBJECT_WORLD_PRESETS } from './objectWorld.ts';
import { UNSUNG_SAVIOUR_PRESETS } from './unsungSaviour.ts';
import { VEHICLE_CORE_PRESETS } from './vehicleCore.ts';

export { DEFAULT_PRESET } from './characterCore.ts';

/**
 * Every preset that ships with the app.
 *
 * **The library is the app's documentation of itself.** A dropdown listing ten render styles and seven
 * projections tells a first-time user nothing about which combinations are coherent, and the settings
 * that matter most — the sheet mode, the camera, the tile size — are the ones hardest to picture from
 * a label. So the built-ins are written to *cover* the vocabulary: every render style, projection,
 * sheet mode, palette limit, outline, lighting model, resolution profile, aspect ratio, direction set,
 * background key and rig parameter the app offers appears in at least one of them, paired with the
 * other settings it actually implies. `presetCoverage.test.ts` enforces that coverage, so an option
 * added to one of those controls without a preset to demonstrate it fails the build.
 *
 * **The System Profile and Palette selects are outside that contract, deliberately.** The argument
 * turns on a dropdown of bare identifiers teaching nothing about which combinations cohere, and those
 * two are the one place it does not hold: each entry names a real machine, states its own constraints
 * under the control, and applies the settings that go with it. `presetCoverage.test.ts` says so where
 * it declines to cover them, and their own libraries carry their own contracts.
 *
 * Filed one module per theme, grouped by category in the order the Presets tab lists them, because a
 * single file holding fifty complete subjects would be unreadable and unreviewable. Order matters in
 * exactly two ways: `DEFAULT_PRESET` is first, since it is the studio's opening state, and the
 * position of a preset in this list is the stop it takes on the hue wheel — so keeping a category's
 * presets contiguous is what makes each collection read as a sweep rather than as noise.
 *
 * The **Unsung Saviour** presets come last and are the one family that is not a worked example: they
 * are technical contracts with almost no subject, encoding one game's art requirements so its sheets
 * can be generated without re-deriving them.
 */
export const PRESETS: readonly PresetArchetype[] = [
  ...CHARACTER_CORE_PRESETS,
  ...CHARACTER_STYLE_PRESETS,
  ...CHARACTER_RIG_PRESETS,
  ...CREATURE_BEAST_PRESETS,
  ...CREATURE_HORROR_PRESETS,
  ...OBJECT_MACHINE_PRESETS,
  ...OBJECT_WORLD_PRESETS,
  ...ITEM_WEAPON_PRESETS,
  ...ITEM_GEAR_PRESETS,
  ...BUILDING_STREET_PRESETS,
  ...BUILDING_TILESET_PRESETS,
  ...VEHICLE_CORE_PRESETS,
  ...UNSUNG_SAVIOUR_PRESETS,
];
