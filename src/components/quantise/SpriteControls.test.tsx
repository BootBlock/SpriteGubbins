import { beforeEach, describe, expect, it } from 'vitest';
import { render, renderHook, screen } from '@testing-library/react';
import { SPRITE_GUIDANCE } from '../../constants/spriteSegmentation.ts';
import { useExpectedComponents } from '../../hooks/useExpectedComponents.ts';
import { useOutputStore } from '../../stores/useOutputStore.ts';
import { useQuantiseStore } from '../../stores/useQuantiseStore.ts';
import { useSubjectStore } from '../../stores/useSubjectStore.ts';
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

/** A sheet that came apart into `count` sprites, laid out along one row. */
function segmented(count: number): SpriteSegmentation {
  return {
    kind: 'SEGMENTED',
    boxes: Array.from({ length: count }, (_, index) => boxAt(index * 8)),
    specks: 0,
  };
}

/**
 * How many components the studio's prompt asks for as the stores stand, through the hook the panel
 * reads — so the sheets below are built against the panel's own figure rather than a copy of it.
 */
function asked(): number {
  return renderHook(() => useExpectedComponents()).result.current;
}

function show(overrides: Partial<Parameters<typeof SpriteControls>[0]> = {}) {
  render(<SpriteControls sprites={segmented(asked())} busy={false} {...overrides} />);
}

describe('SpriteControls', () => {
  beforeEach(() => {
    useQuantiseStore.getState().clear();
    useOutputStore.setState(useOutputStore.getInitialState());
    useSubjectStore.setState(useSubjectStore.getInitialState());
  });

  it('says so when the sheet came back with what was asked for', () => {
    const expected = asked();
    show();

    expect(screen.getByText(`${String(expected)} sprites`)).toBeInTheDocument();
    expect(screen.getByText(`matches the ${String(expected)} asked for`)).toBeInTheDocument();
  });

  it('names how far short a sheet is, and why that matters', () => {
    const expected = asked();
    show({ sprites: segmented(expected - 2) });

    expect(screen.getByText(`2 short of the ${String(expected)} asked for`)).toBeInTheDocument();
    expect(screen.getByText(SPRITE_GUIDANCE.miscount)).toBeInTheDocument();
  });

  it('names an overrun in the same words', () => {
    // The two directions are different faults — dropped entries against an added piece or a key that
    // left one component in two — so the panel reports which of them happened.
    const expected = asked();
    show({ sprites: segmented(expected + 1) });

    expect(screen.getByText(`1 over the ${String(expected)} asked for`)).toBeInTheDocument();
  });

  it('holds the sprites against the studio’s own target size, read where the panel stands', () => {
    // The target used to be handed down through three components that had no use for it. Read
    // through its hook, a size typed in the studio reaches the panel with nothing in between. An icon
    // library states its size per component, which is what lets the figure through at all.
    useSubjectStore.setState({ category: 'ICON' });
    useOutputStore.getState().setOutputField('directionalMode', 'SINGLE_DIRECTION_POSE_LIBRARY');
    useOutputStore.getState().setOutputField('spriteTargetSize', '2 × 2 px');
    show();

    expect(screen.getByText(/studio target 2 × 2/)).toBeInTheDocument();
    expect(screen.getByText(/larger than the target/)).toBeInTheDocument();
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
