import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, render, renderHook, screen } from '@testing-library/react';
import { SPRITE_GUIDANCE } from '../../constants/spriteSegmentation.ts';
import { useExpectedComponents } from '../../hooks/useExpectedComponents.ts';
import { useOutputStore } from '../../stores/useOutputStore.ts';
import { useQuantiseStore } from '../../stores/useQuantiseStore.ts';
import { useSpriteAssignmentStore } from '../../stores/useSpriteAssignmentStore.ts';
import { useSubjectStore } from '../../stores/useSubjectStore.ts';
import type { SpriteBox, SpriteSegmentation } from '../../types/quantiser.ts';
import { spritePin } from '../../utils/spritePin.ts';
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

/** A sheet that came apart into `count` sprites, laid out along one row from column `from`. */
function segmented(count: number, from = 0): SpriteSegmentation {
  return {
    kind: 'SEGMENTED',
    boxes: Array.from({ length: count }, (_, index) => boxAt(from + index * 8)),
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
    useSpriteAssignmentStore.getState().forget();
  });

  afterEach(() => {
    vi.restoreAllMocks();
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
    // A size typed in the studio reaches the panel through `useComponentTarget`. An icon library
    // states its size per component, which is what lets the figure through at all.
    useSubjectStore.setState({ category: 'ICON' });
    useOutputStore.getState().setOutputField('directionalMode', 'SINGLE_DIRECTION_POSE_LIBRARY');
    useOutputStore.getState().setOutputField('resolutionProfile', 'CUSTOM');
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
    // The list's own finding, how the naming stands, is the same comparison and is held back too.
    expect(screen.queryByText('named in reading order')).not.toBeInTheDocument();
    expect(screen.getByText('Reading the sheet…')).toBeInTheDocument();
  });

  it('scrolls to the selected sprite’s row once, not again each time a result lands', () => {
    // The selection stands through every dial move. A row that scrolled on being selected dragged
    // the page back to itself each time it mounted afresh, taking the slider the reader was
    // dragging with it.
    const sprites = segmented(asked());
    const scroll = vi.spyOn(Element.prototype, 'scrollIntoView');
    const { rerender } = render(<SpriteControls sprites={sprites} busy={false} />);

    act(() => {
      // The second sprite along the row `segmented` lays out.
      useSpriteAssignmentStore.getState().select(spritePin(boxAt(8)));
    });
    expect(scroll).toHaveBeenCalledTimes(1);
    // The row the click named, and no other.
    expect(scroll.mock.contexts[0]).toContainElement(screen.getByRole('combobox', { name: 'Sprite 2' }));
    expect(scroll.mock.contexts[0]).not.toContainElement(screen.getByRole('combobox', { name: 'Sprite 1' }));

    // Through a result that moves every pin and back, so the selected row mounts afresh each time.
    for (let cycle = 0; cycle < 3; cycle += 1) {
      rerender(<SpriteControls sprites={segmented(asked(), 1)} busy={false} />);
      rerender(<SpriteControls sprites={sprites} busy />);
      rerender(<SpriteControls sprites={sprites} busy={false} />);
    }

    expect(scroll).toHaveBeenCalledTimes(1);
    expect(useSpriteAssignmentStore.getState().selected).not.toBeNull();
  });

  it('answers a click made while a result is on its way once, and not again once it lands', () => {
    // The preview keeps the previous result's chips while the next is computed, and the list beside
    // it keeps the same sheet's rows, so the click is answered at once. A request left standing
    // would scroll the page the next time a dial brought that box back, answering no click at all.
    const before = segmented(asked());
    const scroll = vi.spyOn(Element.prototype, 'scrollIntoView');
    const { rerender } = render(<SpriteControls sprites={before} busy />);

    act(() => {
      useSpriteAssignmentStore.getState().select(spritePin(boxAt(8)));
    });
    expect(scroll).toHaveBeenCalledTimes(1);
    expect(useSpriteAssignmentStore.getState().reveal).toBeNull();

    // The same sprites one column over, so no box keeps the pin that was clicked.
    rerender(<SpriteControls sprites={segmented(asked(), 1)} busy={false} />);
    rerender(<SpriteControls sprites={before} busy />);
    rerender(<SpriteControls sprites={before} busy={false} />);

    expect(scroll).toHaveBeenCalledTimes(1);
  });

  it('keeps the list mounted while a result is on its way, and out of reach', () => {
    // Remounting it on every result rebuilt every row after every dial move, which on a sheet of
    // hundreds of sprites was most of what a move cost.
    const sprites = segmented(asked());
    const { rerender } = render(<SpriteControls sprites={sprites} busy={false} />);
    const first = screen.getByRole('combobox', { name: 'Sprite 1' });

    rerender(<SpriteControls sprites={sprites} busy />);
    // `inert` rather than withdrawn: a press against the previous result's sprites would pin a
    // decision to a sheet that may already be gone.
    expect(first.closest('[inert]')).not.toBeNull();

    rerender(<SpriteControls sprites={sprites} busy={false} />);
    expect(screen.getByRole('combobox', { name: 'Sprite 1' })).toBe(first);
    expect(first.closest('[inert]')).toBeNull();
  });
});
