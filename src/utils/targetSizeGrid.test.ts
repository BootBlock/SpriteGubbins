import { describe, expect, it } from 'vitest';
import { imageFrom } from '../test/images.ts';
import { targetSizeGrid } from './targetSizeGrid.ts';

/** Only the dimensions matter here, so every pixel can be the same colour. */
function sheet(width: number, height: number): ImageData {
  return imageFrom(width, height, () => ({ r: 1, g: 2, b: 3, a: 255 }));
}

describe('targetSizeGrid', () => {
  it('answers the largest scale at which the sheet still seats every component', () => {
    // 1536 ÷ (3 × 48) = 10 columns and 1536 ÷ (3 × 96) = 5 rows — 50 cells for 43 components. At 4×
    // it is 8 × 4 = 32 cells, which is short, so 3 is the tightest scale the sheet can have used.
    expect(targetSizeGrid(sheet(1536, 1536), { width: 48, height: 96 }, 43)).toBe(3);
  });

  it('falls as the sheet gets smaller, and as the sheet asks for more', () => {
    expect(targetSizeGrid(sheet(640, 640), { width: 32, height: 32 }, 4)).toBe(10);
    expect(targetSizeGrid(sheet(640, 640), { width: 32, height: 32 }, 100)).toBe(2);
  });

  it('reaches the scales a sprite-sized target on a generated canvas actually needs', () => {
    // The ceiling used to be the detection limit of 32, which capped this answer below the truth
    // for the case the tab most needs it: one 16 × 16 sprite returned alone on a 1024-pixel canvas
    // is a grid of 64, and the candidate offered was 32 — a sheet reduced to twice the size asked
    // for, with nothing on screen saying so.
    expect(targetSizeGrid(sheet(1024, 1024), { width: 16, height: 16 }, 1)).toBe(64);
    // The same size packed as a sheet: 512 ÷ (8 × 16) is 4 columns and 4 rows, which seats 16.
    expect(targetSizeGrid(sheet(512, 512), { width: 16, height: 16 }, 16)).toBe(8);
  });

  it('answers null when the sheet cannot hold the components even at 1:1', () => {
    // The target size and the returned sheet disagree, and no scale reconciles them. Offering a
    // candidate anyway would be inventing one.
    expect(targetSizeGrid(sheet(64, 64), { width: 48, height: 96 }, 4)).toBeNull();
  });

  it('answers null for a sheet with no components on it', () => {
    expect(targetSizeGrid(sheet(1536, 1536), { width: 48, height: 96 }, 0)).toBeNull();
  });
});
