import { describe, expect, it } from 'vitest';
import { estimatedScaleStatus } from '../constants/quantiser.ts';
import type { Quantised, SheetReading } from '../types/quantiser.ts';
import { flatDifference } from '../test/images.ts';
import { createImage } from './imageData.ts';
import { statusOf } from './quantiseStatus.ts';

const PENDING: SheetReading = { kind: 'pending' };
const SHEET_FAILED: SheetReading = { kind: 'failed', cause: 'sheet' };

/** A finished transform: only the image's size and the colour count reach the sentence. */
function quantisedTo(width: number, height: number, colors: number): Quantised {
  const image = createImage(width, height);
  return {
    grid: 8,
    result: {
      image,
      difference: flatDifference(width, height, 0),
      colors,
      paletteEntries: [],
      keyedShare: 0,
      sprites: { kind: 'SEGMENTED', boxes: [], specks: 0 },
      symmetry: null,
      duplicates: [],
      snapped: false,
      strips: null,
      leadingShift: { x: 0, y: 0 },
    },
  };
}

describe('statusOf', () => {
  it('announces the measuring only while the reading is pending', () => {
    expect(statusOf(true, PENDING, null, null)).toBe('Measuring the sheet.');
  });

  it('announces a scale typed over a failed survey as quantising, not measuring', () => {
    // The worker still holds a sheet whose survey threw, so a typed scale is genuinely computed —
    // and a live region saying the sheet is being measured would contradict the error beside it.
    expect(statusOf(true, SHEET_FAILED, 8, null)).toBe('Quantising the sheet.');
  });

  it('says nothing about a failed survey once nothing is running', () => {
    // The error is announced where it is shown; this region has no outcome to add.
    expect(statusOf(false, SHEET_FAILED, null, null)).toBe('');
  });

  it('asks for the click an estimate is waiting on, and only until a scale is in force', () => {
    const reading: SheetReading = {
      kind: 'facts',
      facts: { scale: { grid: 8, measurement: 'EDGE_PERIOD' }, colors: 64 },
    };
    // The sentence the badge and the panel take theirs from, naming the reading that answered.
    expect(statusOf(false, reading, null, null)).toBe(estimatedScaleStatus(8, 'EDGE_PERIOD'));
    // Applied, with the transform then failing, there is still no result — and the region may not
    // go on telling the reader to do what they have just done.
    expect(statusOf(false, reading, 8, null)).toBe('');
  });

  it('announces the outcome by the result’s own size and colour count', () => {
    // The half a screen-reader user cannot otherwise get: the previews show it and nothing says it.
    const exact: SheetReading = {
      kind: 'facts',
      facts: { scale: { grid: 8, measurement: 'EXACT' }, colors: 64 },
    };
    expect(statusOf(false, exact, null, quantisedTo(12, 7, 30))).toBe(
      'Quantised to 12 by 7 pixels, 30 colours.',
    );
    expect(statusOf(false, PENDING, 8, quantisedTo(4, 4, 1))).toBe('Quantised to 4 by 4 pixels, 1 colour.');
  });
});
