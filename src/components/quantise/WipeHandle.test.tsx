import { useRef, useState } from 'react';
import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { WipeHandle } from './WipeHandle.tsx';

/**
 * The divider is a **control**, and these are the two ways it has to be operable.
 *
 * The drag is the gesture it advertises; the keyboard is the one it would be unusable without,
 * because the frame it sits in is itself a scrolling region a keyboard user pans with the very same
 * arrow keys. A divider that only dragged would leave them no way to reach the comparison at all —
 * which is why the keyboard route is tested as a promise rather than as a nicety.
 *
 * happy-dom performs no layout, so the frame's box is stubbed: the handle converts a pointer's page
 * position into a fraction of that box, and with a zero-width box there is no fraction to compute.
 */
const FRAME = { left: 100, width: 400 };

function Harness({ start }: { readonly start: number }) {
  const frame = useRef<HTMLDivElement>(null);
  const [at, setAt] = useState(start);
  return (
    <div ref={frame} data-testid="frame">
      <span data-testid="reading">{at.toFixed(4)}</span>
      <WipeHandle at={at} onMove={setAt} frameRef={frame} />
    </div>
  );
}

function show(start = 0.5) {
  render(<Harness start={start} />);
  const frame = screen.getByTestId('frame');
  // The `DOMRect` itself rather than a spread of one: `left`, `right`, `top` and `bottom` are
  // prototype getters, so spreading drops exactly the field the handle measures from.
  vi.spyOn(frame, 'getBoundingClientRect').mockReturnValue(new DOMRect(FRAME.left, 0, FRAME.width, 200));
  const handle = screen.getByRole('slider');
  vi.spyOn(handle, 'setPointerCapture').mockImplementation(() => undefined);
  return { handle, at: () => Number(screen.getByTestId('reading').textContent) };
}

/** A press on the divider, which is what a drag is measured from. */
function press(handle: HTMLElement, clientX: number) {
  fireEvent.pointerDown(handle, { pointerId: 1, pointerType: 'mouse', button: 0, buttons: 1, clientX });
}

describe('WipeHandle', () => {
  it('announces itself as the value it is, so it can be found and read', () => {
    const { handle } = show(0.25);

    expect(handle).toHaveAttribute('aria-valuenow', '25');
    expect(handle).toHaveAttribute('aria-valuemin', '0');
    expect(handle).toHaveAttribute('aria-valuemax', '100');
    expect(handle).toHaveAccessibleName(/Wipe between/);
  });

  it('follows a drag across the frame, in fractions of the frame it was measured against', () => {
    const { handle, at } = show();

    press(handle, FRAME.left + 100);
    expect(at()).toBeCloseTo(0.25, 4);

    fireEvent.pointerMove(handle, { pointerId: 1, clientX: FRAME.left + 300 });
    expect(at()).toBeCloseTo(0.75, 4);
  });

  it('stays inside the frame however far the pointer travels past it', () => {
    // The divider positions a clip and its own offset as percentages of the frame; a fraction
    // outside 0–1 would put the handle off the panel and clip the upper preview to nothing, with no
    // way back except another drag from wherever the handle had gone.
    const { handle, at } = show();

    press(handle, FRAME.left - 4000);
    expect(at()).toBe(0);

    fireEvent.pointerMove(handle, { pointerId: 1, clientX: FRAME.left + 9000 });
    expect(at()).toBe(1);
  });

  it('ignores a move that belongs to a drag it never started', () => {
    // A second contact arriving mid-drag, or a move after the release: either would otherwise
    // teleport the divider to wherever that pointer happened to be.
    const { handle, at } = show(0.5);

    fireEvent.pointerMove(handle, { pointerId: 9, clientX: FRAME.left + 400 });
    expect(at()).toBeCloseTo(0.5, 4);

    press(handle, FRAME.left + 200);
    fireEvent.pointerUp(handle, { pointerId: 1 });
    fireEvent.pointerMove(handle, { pointerId: 1, clientX: FRAME.left });
    expect(at()).toBeCloseTo(0.5, 4);
  });

  it('steps with the arrows, and takes the coarse step when asked', () => {
    const { handle, at } = show(0.5);

    fireEvent.keyDown(handle, { key: 'ArrowRight' });
    expect(at()).toBeCloseTo(0.51, 4);

    fireEvent.keyDown(handle, { key: 'ArrowLeft' });
    expect(at()).toBeCloseTo(0.5, 4);

    fireEvent.keyDown(handle, { key: 'ArrowRight', shiftKey: true });
    expect(at()).toBeCloseTo(0.6, 4);

    fireEvent.keyDown(handle, { key: 'PageDown' });
    expect(at()).toBeCloseTo(0.5, 4);
  });

  it('goes to either edge, and no further', () => {
    const { handle, at } = show(0.5);

    fireEvent.keyDown(handle, { key: 'Home' });
    expect(at()).toBe(0);
    fireEvent.keyDown(handle, { key: 'ArrowLeft' });
    expect(at()).toBe(0);

    fireEvent.keyDown(handle, { key: 'End' });
    expect(at()).toBe(1);
    fireEvent.keyDown(handle, { key: 'ArrowRight' });
    expect(at()).toBe(1);
  });

  it('claims the keys it acts on, and leaves the rest to the frame below', () => {
    // Every arrow already means "pan" to the scrolling frame this sits on. Answering one without
    // claiming it would move the divider *and* the artwork under it, so neither gesture could be
    // made deliberately — while claiming a key it does nothing with would take Tab, or a shortcut,
    // away from the page.
    const { handle, at } = show(0.5);

    const arrow = fireEvent.keyDown(handle, { key: 'ArrowRight', cancelable: true });
    expect(arrow).toBe(false);

    const tab = fireEvent.keyDown(handle, { key: 'Tab', cancelable: true });
    expect(tab).toBe(true);
    expect(at()).toBeCloseTo(0.51, 4);
  });

  it('takes the touch gesture, because the browser’s default for it would pan instead', () => {
    const { handle } = show();

    expect(handle).toHaveClass('touch-none');
  });
});
