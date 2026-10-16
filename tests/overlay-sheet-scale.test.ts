import { beforeAll, describe, expect, it } from 'vitest';
import { readOverlaySheet, type OverlayReading } from './overlaySheetReading.ts';
import type { PixelGrid } from '../src/types/quantiser.ts';
import { cropSprite } from '../src/utils/cropSprite.ts';
import { estimateMeshPeriod } from '../src/utils/meshPeriod.ts';
import { detectPixelGrid, measureSheetScale } from '../src/utils/pixelGrid.ts';
import { estimatePixelGrid } from '../src/utils/pixelPeriod.ts';
import { estimateProfilePeriod } from '../src/utils/profilePeriod.ts';
import { stepProfile } from '../src/utils/stepProfile.ts';

/**
 * Why no scale reading answers on `test_sprites/game_overlay_test.png`, and why none should.
 *
 * **The sheet has no one pitch to read.** The prompt asks pixel art for one square-pixel grid at one
 * pixel density across the entire sheet, and the generator drew the pieces at pitches of their own
 * instead. Measured outside the app, with a decode and a correlation of each piece's differenced step
 * profile written apart from the code judged here, the combs run:
 *
 * | Piece | Peaks across | Peaks down | Pitch |
 * | --- | --- | --- | --- |
 * | `disabled-veil` | 10, weakly | 9, weakly | about 9½ |
 * | `highlight-halo` | 10, 21 | 11, 21 | about 10½ |
 * | `selected-ring` | 10, 19, 29 | 9, 19, 28 | about 9½ |
 * | `cooldown-sweep-quarter` | 9 | 9 | about 9 |
 * | `cooldown-sweep-three-quarters` | 9, 19, 28 | 9, 19 | about 9½ |
 * | `tier-mark-1` | 9, 18, 26 | 9, 18, 27 | about 9 |
 * | `tier-mark-2` | 8, 17 | 8, 15, 22 | about 8 |
 * | `tier-mark-3` | 8, 16, 24 | 8, 15, 22 | about 8 |
 * | `tier-mark-4` | 7 | 7, 15 | about 7½ |
 * | `rarity-glow` | 10, 21, 30 | 11, 24 | about 10½ |
 * | `locked-mark` | 9, 19 | 10, 20 | about 10 |
 * | `new-item-flare` | 10, 22 | 10 | about 10 |
 * | `broken-overlay` | 8, 16 | 8, 16 | 8 |
 * | `empty-mark` | 8, 16, 24 | 8, 16 | 8 |
 *
 * So the whole sheet's step profile is fourteen combs at pitches from about 7½ to about 10½, laid at
 * unrelated phases, and they reinforce at no lag: over the whole sheet the strongest correlation is
 * 0.22 across and 0.16 down, both at 10, with nothing at either double. A grid of 9 would merge the
 * cells of every piece drawn at 8 or finer, which nothing can undo, and a grid of 7 would leave the
 * rest under-reduced, so no one grid is right for the sheet. The refusal is the honest answer.
 *
 * **The reading is not at fault**, and the second test shows it: given one piece at a time, the
 * correlation reads four different pitches. Each is the piece's pitch or the integer below it, because
 * the reading offers the whole scale at or below the pitch it measures and never one above, the rule
 * `sheet-scale-corpus.test.ts` holds its own sheets to.
 */
/**
 * What the correlation reads off each piece cropped alone, by slot name.
 *
 * `null` where no axis can vouch for its pitch alone. Five of the six settle a peak at 9 or 10, in
 * the spread the table records, and each axis that does falls short of `ACF_CORRELATION_FLOOR` in
 * support or of `ACF_MULTIPLE_CONFIRMATION` at its double, so two such axes agreeing corroborate
 * nothing. The quarter sweep, 118 pixels across, finds no prominent peak on either axis.
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

let reading: OverlayReading;

beforeAll(async () => {
  reading = await readOverlaySheet('game_overlay_test.png', 'FULL_BLEED_TILE');
}, 300_000);

describe('the generated overlay sheet’s pixel scale', () => {
  it('reads no scale off the whole sheet, on any reading', () => {
    const { sheet } = reading;
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
    const { sheet, boxes, names } = reading;
    expect(boxes).toHaveLength(names.length);
    const read = Object.fromEntries(
      names.map((name, at) => {
        const box = boxes[at];
        if (box === undefined) throw new Error(`unreachable: no box for ${name}`);
        return [name, estimateProfilePeriod(stepProfile(cropSprite(sheet, box)))];
      }),
    );
    expect(read).toStrictEqual(PER_PIECE);
  });
});
