import { PALETTES } from '../src/constants/palettes/index.ts';
import type { PaletteId } from '../src/types/palette.ts';
import type { ColorReduction } from '../src/types/quantiser.ts';
import { fixedPaletteColors } from '../src/utils/paletteEntries.ts';

/**
 * The reduction a machine palette the app ships quantises to, for the dither tables' machine rows.
 *
 * Read from the shipped palette rather than restated, so a row named for a machine keeps measuring
 * that machine: a change to its entries or its channel depth fails the suite that pins the row,
 * rather than leaving the row measuring a palette the app no longer offers.
 */
export function machineReduction(id: PaletteId): ColorReduction {
  const palette = PALETTES[id];
  if (palette === null) throw new Error(`${id} names no machine palette`);
  const { space } = palette;
  if (space.kind === 'CHANNEL_DEPTH') {
    return { kind: 'CHANNEL_DEPTH', bitsPerChannel: space.bitsPerChannel };
  }
  return { kind: 'PALETTE', entries: fixedPaletteColors(space.entries) };
}
