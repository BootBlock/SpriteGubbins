import { beforeAll, describe, expect, it } from 'vitest';
import { loadCorpusSheet } from './sheetCorpus.ts';
import { DEFAULT_KEY_TOLERANCE } from '../src/constants/quantiser.ts';
import { QUANTISE_DEFAULT_DIALS } from '../src/constants/quantiseDials.ts';
import { iconOverlaySheets } from '../src/constants/sheetPlans/iconOverlaySheets.ts';
import type { PixelGrid, SpriteBox } from '../src/types/quantiser.ts';
import { planSlots } from '../src/utils/componentSlots.ts';
import { cropSprite } from '../src/utils/cropSprite.ts';
import { estimateMeshPeriod } from '../src/utils/meshPeriod.ts';
import { detectPixelGrid, measureSheetScale } from '../src/utils/pixelGrid.ts';
import { estimatePixelGrid } from '../src/utils/pixelPeriod.ts';
import { estimateProfilePeriod } from '../src/utils/profilePeriod.ts';
import { quantiseImage } from '../src/utils/quantiseImage.ts';
import { stepProfile } from '../src/utils/stepProfile.ts';

/**
 * Why no scale reading answers on `test_sprites/game_overlay_test.png`, and why none should.
 *
 * **The sheet has no one pitch to read.** The prompt asks pixel art for one square-pixel grid at one
 * pixel density across the entire sheet, and the generator drew each of the fourteen pieces at a pitch
 * of its own instead. Measured outside the app, with a decode and a correlation of each piece's
 * differenced step profile written apart from the code judged here, the combs run:
 *
 * | Piece | Peaks across | Peaks down | Pitch |
 * | --- | --- | --- | --- |
 * | `highlight-halo` | 10, 21 | 11, 21 | about 10½ |
 * | `locked-mark` | 9, 19, 30 | 10, 20 | about 10 |
 * | `tier-mark-1` | 9, 18, 26 | 9, 18, 27 | about 9 |
 * | `tier-mark-2` | 8, 17 | 8, 15, 22 | about 8 |
 * | `tier-mark-3` | 8, 16, 24 | 8, 15, 22 | about 8 |
 * | `broken-overlay` | 8, 16 | 8, 16 | about 8 |
 * | `empty-mark` | 8, 16, 24 | 8, 16 | 8 |
 * | `tier-mark-4` | 7 | 7, 15 | about 7½ |
 *
 * So the whole sheet's step profile is fourteen combs at pitches from about 7½ to about 10½, laid at
 * unrelated phases, and they reinforce at no lag: over the whole sheet the strongest correlation is
 * 0.22 across and 0.16 down, both at 10, with nothing at either double. A grid of 9 would merge the
 * cells of every piece drawn at 8 or finer, which nothing can undo, and a grid of 7 would leave the
 * rest under-reduced, so no one grid is right for the sheet. The refusal is the honest answer.
 *
 * **The reading is not at fault**, and the second test shows it: given one piece at a time, the
 * correlation reads four different pitches, each the piece's own or the integer below it.
 */
const MAGENTA = { r: 255, g: 0, b: 255, a: 255 } as const;
const [OVERLAY] = iconOverlaySheets('FULL_BLEED_TILE', []);

/**
 * What the correlation reads off each piece cropped alone, by slot name.
 *
 * `null` where a piece clears none of the reading's gates alone. That is a refusal on a sheet too small
 * to hold much of a comb, which the whole sheet's own refusal does not rest on.
 */
const PER_PIECE: Readonly<Record<string, PixelGrid | null>> = {
  'disabled-veil': null,
  'highlight-halo': 10,
  'selected-ring': null,
  'cooldown-sweep-quarter': null,
  'cooldown-sweep-three-quarters': null,
  'tier-mark-1': 8,
  'tier-mark-2': 7,
  'tier-mark-3': 7,
  'tier-mark-4': 7,
  'rarity-glow': null,
  'locked-mark': 9,
  'new-item-flare': null,
  'broken-overlay': 7,
  'empty-mark': 8,
};

let sheet: ImageData;
let boxes: readonly SpriteBox[] = [];

beforeAll(async () => {
  sheet = await loadCorpusSheet('game_overlay_test.png');
  const result = quantiseImage(sheet, {
    ...QUANTISE_DEFAULT_DIALS,
    grid: 1,
    key: { color: MAGENTA, tolerance: DEFAULT_KEY_TOLERANCE },
    reduction: null,
  });
  if (result.sprites.kind !== 'SEGMENTED') {
    throw new Error(`the sheet did not segment: ${result.sprites.kind}`);
  }
  boxes = result.sprites.boxes;
}, 300_000);

describe('the generated overlay sheet’s pixel scale', () => {
  it('reads no scale off the whole sheet, on any reading', () => {
    const profile = stepProfile(sheet);
    expect({
      detected: detectPixelGrid(sheet),
      estimated: estimatePixelGrid(profile),
      correlated: estimateProfilePeriod(profile),
      drifting: estimateMeshPeriod(profile),
      offered: measureSheetScale(sheet),
    }).toStrictEqual({ detected: null, estimated: null, correlated: null, drifting: null, offered: null });
  });

  it('reads four different pitches off the pieces, one piece at a time', () => {
    const names = planSlots(OVERLAY);
    expect(boxes).toHaveLength(names.length);
    const read = Object.fromEntries(
      names.map((name, at) => {
        const box = boxes[at];
        if (box === undefined) throw new Error(`unreachable: no box for ${name}`);
        return [name, estimateProfilePeriod(stepProfile(cropSprite(sheet, box)))];
      }),
    );
    expect(read).toStrictEqual(PER_PIECE);
    expect(new Set(Object.values(read).filter((grid) => grid !== null))).toStrictEqual(
      new Set([7, 8, 9, 10]),
    );
  });
});
