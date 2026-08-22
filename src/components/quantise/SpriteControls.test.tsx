import { beforeEach, describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import { SPRITE_GUIDANCE } from '../../constants/spriteSegmentation.ts';
import { useQuantiseStore } from '../../stores/useQuantiseStore.ts';
import type { SpriteBox, SpriteSegmentation } from '../../types/quantiser.ts';
import { SpriteControls } from './SpriteControls.tsx';

/**
 * What the panel says about the sheet against what the prompt asked for.
 *
 * The segmentation itself is pinned in `utils/spriteSegments.test.ts`. What can only be checked here
 * is the comparison this panel exists for: a sheet returning nine components where twelve were
 * requested looks, in the preview, exactly like a sheet returning twelve, so the count and the
 * inventory have to be put beside each other in words.
 */

function boxAt(left: number): SpriteBox {
  return { left, top: 0, width: 4, height: 4, pixels: 16 };
}

const three: SpriteSegmentation = { kind: 'SEGMENTED', boxes: [boxAt(0), boxAt(8), boxAt(16)], specks: 0 };

function show(overrides: Partial<Parameters<typeof SpriteControls>[0]> = {}) {
  render(<SpriteControls sprites={three} target={null} expected={3} busy={false} {...overrides} />);
}

describe('SpriteControls', () => {
  beforeEach(() => {
    useQuantiseStore.getState().clear();
  });

  it('says so when the sheet came back with what was asked for', () => {
    show();

    expect(screen.getByText('3 sprites')).toBeInTheDocument();
    expect(screen.getByText('matches the 3 asked for')).toBeInTheDocument();
  });

  it('names how far short a sheet is, and why that matters', () => {
    show({ expected: 5 });

    expect(screen.getByText('2 short of the 5 asked for')).toBeInTheDocument();
    expect(screen.getByText(SPRITE_GUIDANCE.miscount)).toBeInTheDocument();
  });

  it('names an overrun in the same words', () => {
    // The two directions are different faults — dropped entries against an added piece or a key that
    // left one component in two — so the panel reports which of them happened.
    show({ expected: 2 });

    expect(screen.getByText('1 over the 2 asked for')).toBeInTheDocument();
  });

  it('compares nothing where the sheet produced no count of its own', () => {
    // A solid sheet has no number to hold against the inventory, and "3 asked for" beside "nothing
    // transparent to separate" would read as a judgement on a reading nobody made.
    show({ sprites: { kind: 'SOLID' } });

    expect(screen.getByText('Nothing transparent to separate')).toBeInTheDocument();
    expect(screen.queryByText(/asked for/)).not.toBeInTheDocument();
    expect(screen.getByText(SPRITE_GUIDANCE.solid)).toBeInTheDocument();
  });

  it('holds the comparison back while a newer result is on its way', () => {
    // The figures on screen belong to the previous job for as long as the next one is running, and a
    // comparison of a stale count against the inventory is a finding about nothing.
    show({ busy: true });

    expect(screen.queryByText(/asked for/)).not.toBeInTheDocument();
    expect(screen.getByText('Reading the sheet…')).toBeInTheDocument();
  });
});
