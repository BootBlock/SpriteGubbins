import type { Palette, PaletteId } from '../../types/palette.ts';

/**
 * Sega's three colour spaces, each a different number of bits per channel on the same VDP lineage.
 *
 * None of them has a list: two, three and four bits per channel are 64, 512 and 4,096 entries, and
 * the ladder is the definition rather than a summary of one. The Master System's four levels — 0,
 * 85, 170, 255 — are the same arithmetic as the Game Boy's four greys, which is why a two-bit
 * machine's palette can be written down in one sentence.
 *
 * The Mega Drive's real DAC does not output an evenly spaced ramp, and what it does output varies by
 * console revision and by whether the shadow or highlight mode is on. That is a property of one
 * machine's video output rather than of the palette, so it is not what this states: the palette is
 * three bits per channel, and three bits per channel is eight evenly spaced levels.
 */

const MASTER_SYSTEM: Palette = {
  id: 'MASTER_SYSTEM',
  name: 'the Sega Master System',
  label: 'Master System — 64 colours, 32 at once',
  space: { kind: 'CHANNEL_DEPTH', bitsPerChannel: 2 },
  onScreenColors: 32,
  colorsPerComponent: 15,
  note: 'Two palettes of sixteen entries; sprites may only use the second, spending fifteen of it on colour and one on transparency.',
};

const MEGA_DRIVE: Palette = {
  id: 'MEGA_DRIVE',
  name: 'the Sega Mega Drive',
  label: 'Mega Drive — 512 colours, 61 at once',
  space: { kind: 'CHANNEL_DEPTH', bitsPerChannel: 3 },
  onScreenColors: 61,
  colorsPerComponent: 15,
  note: 'Four palette lines of sixteen entries, the first entry of each being transparent; one sprite draws from one line.',
};

const GAME_GEAR: Palette = {
  id: 'GAME_GEAR',
  name: 'the Sega Game Gear',
  label: 'Game Gear — 4,096 colours, 32 at once',
  space: { kind: 'CHANNEL_DEPTH', bitsPerChannel: 4 },
  onScreenColors: 32,
  colorsPerComponent: 15,
  note: 'The Master System’s two sixteen-entry palettes, widened to four bits per channel; sprites use the second, one entry of which is transparent.',
};

export const SEGA_PALETTES: Readonly<
  Record<Extract<PaletteId, 'MASTER_SYSTEM' | 'MEGA_DRIVE' | 'GAME_GEAR'>, Palette>
> = {
  MASTER_SYSTEM,
  MEGA_DRIVE,
  GAME_GEAR,
};
