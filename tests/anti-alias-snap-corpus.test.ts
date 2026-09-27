import { beforeAll, describe, expect, it } from 'vitest';
import { BACKGROUND_KEY_COLORS } from '../src/constants/backgroundKeyColors.ts';
import { QUANTISE_DEFAULT_DIALS } from '../src/constants/quantiseDials.ts';
import { COVERAGE_FLOOR } from '../src/constants/quantiser.ts';
import type { PaletteId } from '../src/types/palette.ts';
import type { ColorReduction, QuantiseSettings } from '../src/types/quantiser.ts';
import { channelLevels } from '../src/utils/channelLevels.ts';
import { CHANNELS_PER_PIXEL } from '../src/utils/imageData.ts';
import { quantiseImage } from '../src/utils/quantiseImage.ts';
import { machineReduction } from './machineReductions.ts';
import { loadCorpusSheet } from './sheetCorpus.ts';

/**
 * What anti-aliasing's `SNAP` position keeps a real sheet to, under the reductions whose space it
 * cannot read off the sheet.
 *
 * **The failure this pins.** The snap once searched the colours the sheet held and gave up past
 * `MAX_PALETTE_ENTRIES` of them, writing every blend raw. A channel depth barely reduces the count,
 * so at the settings below the Game Gear's four-bit sheet came back with 4,414 pixels off its
 * ladder, the SNES's 4,282 and VGA's 4,275. The Mega Drive's three bits leave few enough colours
 * that the old search answered, so it is the case that was already right.
 */
const KEY = BACKGROUND_KEY_COLORS.MAGENTA_FF00FF;

function settingsFor(reduction: ColorReduction): QuantiseSettings {
  return {
    ...QUANTISE_DEFAULT_DIALS,
    grid: 6,
    key: KEY === null ? null : { color: KEY, tolerance: QUANTISE_DEFAULT_DIALS.keyTolerance },
    reduction,
    antiAlias: 'BOTH',
    antiAliasPalette: 'SNAP',
  };
}

/** How many pixels of a sheet carry a channel off the ladder of this depth. */
function offLadder(image: ImageData, bitsPerChannel: number): number {
  const rungs = new Set(channelLevels(bitsPerChannel));
  let off = 0;
  for (let offset = 0; offset < image.data.length; offset += CHANNELS_PER_PIXEL) {
    if ((image.data[offset + 3] ?? 0) === 0) continue;
    const onLadder = [0, 1, 2].every((channel) => rungs.has(image.data[offset + channel] ?? -1));
    if (!onLadder) off += 1;
  }
  return off;
}

/** How many colours a sheet holds, alpha dropped and faint pixels left out, as `blendSnap` reads it. */
function heldColors(image: ImageData): number {
  const seen = new Set<number>();
  for (let offset = 0; offset < image.data.length; offset += CHANNELS_PER_PIXEL) {
    if ((image.data[offset + 3] ?? 0) < COVERAGE_FLOOR) continue;
    seen.add(
      ((image.data[offset] ?? 0) * 256 + (image.data[offset + 1] ?? 0)) * 256 + (image.data[offset + 2] ?? 0),
    );
  }
  return seen.size;
}

const MACHINES: readonly PaletteId[] = ['MEGA_DRIVE', 'GAME_GEAR', 'SNES', 'VGA_256'];

describe('anti-aliasing under SNAP on the reference sheet', () => {
  let armour: ImageData;

  beforeAll(async () => {
    armour = await loadCorpusSheet('armour.png');
  }, 60_000);

  it.each(MACHINES)(
    'keeps every pixel of a %s sheet on its channel ladder',
    (id) => {
      const reduction = machineReduction(id);
      if (reduction.kind !== 'CHANNEL_DEPTH') throw new Error(`${id} is not a channel-depth machine`);
      const softened = quantiseImage(armour, settingsFor(reduction)).image;
      const unsoftened = quantiseImage(armour, { ...settingsFor(reduction), antiAlias: 'OFF' }).image;

      // Proof that the pass ran and changed the sheet, so the ladder check is not over an untouched one.
      expect(Array.from(softened.data)).not.toEqual(Array.from(unsoftened.data));
      expect(offLadder(softened, reduction.bitsPerChannel)).toBe(0);
    },
    60_000,
  );

  it('leaves a budget’s sheet holding no more colours than the budget, which bounds its snap', () => {
    // `blendSnap` searches the colours a budget's sheet holds, and the budget is what keeps that
    // search affordable. Every pass between the reduction and the anti-aliasing only moves colours
    // the sheet already holds.
    const budget: ColorReduction = { kind: 'MAX_COLORS', maxColors: 64 };
    const sheet = quantiseImage(armour, { ...settingsFor(budget), antiAlias: 'OFF' }).image;
    expect(heldColors(sheet)).toBeLessThanOrEqual(budget.maxColors);
  }, 60_000);
});
