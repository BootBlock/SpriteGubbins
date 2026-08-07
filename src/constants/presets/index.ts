import type { PresetArchetype } from '../../types/preset.ts';
import { BUILT_IN_ARCHETYPES } from './archetypes.ts';
import { UNSUNG_SAVIOUR_PRESETS } from './unsungSaviour.ts';

export { DEFAULT_PRESET } from './archetypes.ts';

/**
 * Every preset that ships with the app.
 *
 * Two families, split one file each. The **archetypes** are worked examples — one per category,
 * complete subjects, there to show what a filled-in studio looks like. The **Unsung Saviour**
 * presets are the opposite: technical contracts with almost no subject, encoding one game's art
 * requirements so its sheets can be generated without re-deriving them.
 *
 * The archetypes come first because `DEFAULT_PRESET` is the studio's opening state and wants to be a
 * complete example rather than an empty technical shell.
 */
export const PRESETS: readonly PresetArchetype[] = [...BUILT_IN_ARCHETYPES, ...UNSUNG_SAVIOUR_PRESETS];
