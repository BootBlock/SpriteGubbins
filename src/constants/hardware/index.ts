import { HARDWARE_PROFILE_IDS } from '../../types/hardware.ts';
import type { HardwareProfile, HardwareProfileId } from '../../types/hardware.ts';
import type { OutputChoice } from '../output/choices.ts';
import { ARCADE_HARDWARE } from './arcade.ts';
import { ATARI_HARDWARE } from './atari.ts';
import { COMPUTER_HARDWARE } from './computers.ts';
import { NINTENDO_HARDWARE } from './nintendo.ts';
import { PC_HARDWARE } from './pc.ts';
import { SEGA_HARDWARE } from './sega.ts';

/**
 * Every machine the studio offers, and the two ways the app reaches them.
 *
 * Assembled from one module per family, exactly as the palette library is, and keyed by the whole
 * `HardwareProfileId` union so a new member is a compile error until it has a definition. `NONE`
 * maps to `null`, which is what "no machine targeted" means everywhere downstream.
 */
export const HARDWARE_PROFILES: Readonly<Record<HardwareProfileId, HardwareProfile | null>> = {
  NONE: null,
  ...NINTENDO_HARDWARE,
  ...SEGA_HARDWARE,
  ...COMPUTER_HARDWARE,
  ...ATARI_HARDWARE,
  ...PC_HARDWARE,
  ...ARCADE_HARDWARE,
};

/** The targeted machine, or `null` for `NONE`. */
export function hardwareProfileFor(id: HardwareProfileId): HardwareProfile | null {
  return HARDWARE_PROFILES[id];
}

/** What the `NONE` option is called, since it has no `HardwareProfile` to carry a label. */
const NONE_LABEL = 'NONE (no target machine — set everything yourself)';

/**
 * The dropdown's options, derived from the map so a machine cannot be added without appearing.
 *
 * `HARDWARE_PROFILE_IDS` fixes the order, which keeps the families contiguous in the list.
 */
export const HARDWARE_PROFILE_CHOICES: readonly OutputChoice<HardwareProfileId>[] = HARDWARE_PROFILE_IDS.map(
  (id) => ({
    value: id,
    label: HARDWARE_PROFILES[id]?.label ?? NONE_LABEL,
  }),
);
