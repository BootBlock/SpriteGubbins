import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import { LOCKED_SWATCHES_SHOWN } from '../../constants/paletteLock.ts';
import type { Rgba } from '../../types/quantiser.ts';
import { LockedSwatches } from './LockedSwatches.tsx';

/**
 * The cap, which is the only judgement this component makes.
 *
 * A lock taken with no colour budget in force can hold thousands of entries, and the failure worth
 * pinning is the silent one: a strip that shows the first sixty-four and says nothing about the rest
 * reads as a palette of sixty-four.
 */

const entries = (count: number): Rgba[] =>
  Array.from({ length: count }, (_, index) => ({ r: index, g: 128, b: 64, a: 255 }));

describe('LockedSwatches', () => {
  it('counts what it could not show, rather than dropping it', () => {
    render(<LockedSwatches entries={entries(LOCKED_SWATCHES_SHOWN + 12)} />);

    expect(screen.getByText('+12 more')).toBeInTheDocument();
  });

  it('says nothing about a remainder when the whole palette fits', () => {
    render(<LockedSwatches entries={entries(LOCKED_SWATCHES_SHOWN)} />);

    expect(screen.queryByText(/more$/)).toBeNull();
  });
});
