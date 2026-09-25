import { describe, expect, it } from 'vitest';
import type { SheetReading } from '../types/quantiser.ts';
import { statusOf } from './quantiseStatus.ts';

const PENDING: SheetReading = { kind: 'pending' };
const SHEET_FAILED: SheetReading = { kind: 'failed', cause: 'sheet' };

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

  it('asks for the click an estimate is waiting on', () => {
    const reading: SheetReading = {
      kind: 'facts',
      facts: { scale: { grid: 8, measurement: 'EDGE_PERIOD' }, colors: 64 },
    };
    expect(statusOf(false, reading, null, null)).not.toBe('');
  });
});
