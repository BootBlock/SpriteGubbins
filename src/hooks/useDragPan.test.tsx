import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { useDragPan } from './useDragPan.ts';

/**
 * The drag itself: a pointer state machine over a scroll offset, none of which is observable without
 * a layout — which happy-dom does not perform. So the scrollport is modelled instead, because three
 * of its properties are what the arithmetic here is written around and none is reachable otherwise:
 * it knows its own limits, it refuses anything past them, and it stores offsets in whole units of a
 * grain that is one CSS pixel only at 100% browser zoom.
 *
 * Everything else is the hook's own logic, driven through real events.
 */
function Harness({ enabled }: { readonly enabled: boolean }) {
  const { isPanning, panHandlers } = useDragPan(enabled);
  return <div aria-label="box" role="group" data-panning={isPanning} {...panHandlers} />;
}

/**
 * Render the harness over a modelled scrollport and hand back the element the handlers are on.
 *
 * `grain` is the whole unit offsets are stored in: 1 CSS pixel at 100% browser zoom, 2 at 50%, 4 at
 * 25%. The default box is 100 square with 4000 of overflow, which is deep enough that nothing but
 * the tests about edges reaches one.
 */
function box({ enabled = true, overflow = 4000, grain = 1 } = {}): HTMLElement {
  render(<Harness enabled={enabled} />);
  const element = screen.getByRole('group', { name: 'box' });

  Object.defineProperty(element, 'clientWidth', { value: 100, configurable: true });
  Object.defineProperty(element, 'clientHeight', { value: 100, configurable: true });
  Object.defineProperty(element, 'scrollWidth', { value: 100 + overflow, configurable: true });
  Object.defineProperty(element, 'scrollHeight', { value: 100 + overflow, configurable: true });
  for (const property of ['scrollLeft', 'scrollTop'] as const) {
    let offset = 0;
    Object.defineProperty(element, property, {
      configurable: true,
      get: () => offset,
      set: (next: number) => {
        offset = Math.round(Math.min(Math.max(next, 0), overflow) / grain) * grain;
      },
    });
  }
  return element;
}

/** A left-button mouse press, which is the one gesture that starts a pan. */
function press(element: HTMLElement, x: number, y: number) {
  fireEvent.pointerDown(element, {
    pointerId: 1,
    pointerType: 'mouse',
    button: 0,
    buttons: 1,
    isPrimary: true,
    clientX: x,
    clientY: y,
  });
}

/** A move with the button still down, which is the only kind that pans. */
function drag(element: HTMLElement, x: number, y: number, pointerId = 1) {
  fireEvent.pointerMove(element, { pointerId, buttons: 1, clientX: x, clientY: y });
}

/**
 * A finger arriving, which is both how a touch drag starts and how a pinch does. The first contact of
 * a gesture is primary and no later one is, until every finger has lifted and the next begins afresh —
 * which is the difference the hook reads to tell a drag from a pinch, so the tests state it too.
 */
function touch(element: HTMLElement, x: number, y: number, pointerId = 2, isPrimary = true) {
  fireEvent.pointerDown(element, {
    pointerId,
    pointerType: 'touch',
    button: 0,
    buttons: 1,
    isPrimary,
    clientX: x,
    clientY: y,
  });
}

describe('useDragPan', () => {
  it('moves the content under the pointer, by exactly the distance dragged', () => {
    const element = box();
    element.scrollLeft = 120;
    element.scrollTop = 80;

    press(element, 200, 200);
    drag(element, 170, 150);

    // Dragging left and up pulls the content with it, so the offsets grow by what the pointer travelled.
    expect(element.scrollLeft).toBe(150);
    expect(element.scrollTop).toBe(130);
  });

  it('tracks the pointer across a series of moves rather than accumulating drift', () => {
    const element = box();

    press(element, 200, 200);
    drag(element, 150, 200);
    drag(element, 100, 200);

    expect(element.scrollLeft).toBe(100);
  });

  it('resumes the moment a drag comes back off an edge it overshot', () => {
    const element = box({ overflow: 300 });

    press(element, 400, 400);
    drag(element, 100, 400); // 300 right to the edge, then 200 further into the clamp
    drag(element, -100, 400);
    expect(element.scrollLeft).toBe(300);

    // Measured from the press instead, this 60px of travel back would be swallowed repaying the 200
    // the overshoot banked, and the content would sit still through most of a screen of dragging.
    drag(element, -40, 400);
    expect(element.scrollLeft).toBe(240);
  });

  it('keeps up with a pointer moving in fractions of a pixel, rather than drifting behind it', () => {
    const element = box({ overflow: 300 });

    press(element, 200, 200);
    for (let step = 1; step <= 8; step++) drag(element, 200 - step * 0.5, 200);

    // Eight half-pixel moves are four pixels of content. Adding each one to what the scrollport
    // rounded the last to would instead round every 0.5 up to a whole pixel — the model above rounds
    // halves up — and the content would land on 8, having run twice as far as the hand moving it.
    expect(element.scrollLeft).toBe(4);
  });

  it.each([
    { zoom: '50%', grain: 2 },
    { zoom: '33%', grain: 3 },
    { zoom: '25%', grain: 4 },
  ])(
    'tracks the pointer at $zoom browser zoom, where the scrollport stores $grain px at a time',
    ({ grain }) => {
      const element = box({ overflow: 300, grain });

      press(element, 200, 200);
      for (let step = 1; step <= 20; step++) drag(element, 200 - step * 2.5, 200);

      // 50px of pointer travel is 50px of content, whatever the scrollport can express. Judged against
      // the grain rather than exactly, because that is all a scrollport at this zoom can be held to.
      expect(Math.abs(element.scrollLeft - 50)).toBeLessThanOrEqual(grain);
    },
  );

  it('carries a scroll that arrived from somewhere else mid-drag, rather than overwriting it', () => {
    const element = box();

    press(element, 200, 200);
    drag(element, 200, 190);
    // A wheel, a trackpad, a caret moving — anything that scrolls the box while the button is held.
    element.scrollTop += 120;
    drag(element, 200, 160);

    // 10 + 120 + 30. Measured from the press instead, the wheel's 120 would vanish on this move.
    expect(element.scrollTop).toBe(160);
  });

  it('takes the pointer capture that keeps a drag alive outside the box, and pans out there', () => {
    const element = box();
    const capture = vi.spyOn(element, 'setPointerCapture').mockImplementation(() => undefined);

    press(element, 200, 200);
    // Captured moves are delivered here wherever the pointer is, so a coordinate far outside the
    // 100px box must still pan — which is the whole point of taking the capture.
    drag(element, -800, -800);

    expect(capture).toHaveBeenCalledWith(1);
    expect(element.scrollLeft).toBe(1000);
  });

  it('does nothing at all when there is nowhere to scroll', () => {
    const element = box({ enabled: false });
    const capture = vi.spyOn(element, 'setPointerCapture').mockImplementation(() => undefined);

    press(element, 200, 200);
    drag(element, 100, 100);

    expect(element.scrollLeft).toBe(0);
    expect(capture).not.toHaveBeenCalled();
    expect(element.dataset['panning']).toBe('false');
  });

  it('stops panning when the pointer is released', () => {
    const element = box();

    press(element, 200, 200);
    fireEvent.pointerUp(element, { pointerId: 1 });
    drag(element, 100, 100);

    expect(element.scrollLeft).toBe(0);
  });

  it('stops panning when the gesture is cancelled out from under it', () => {
    const element = box();

    press(element, 200, 200);
    fireEvent.pointerCancel(element, { pointerId: 1 });
    drag(element, 100, 100);

    expect(element.scrollLeft).toBe(0);
  });

  it('stops panning when the capture goes without a release ever arriving', () => {
    const element = box();

    press(element, 200, 200);
    // The platform releases the capture after a `pointerup` or a `pointercancel`, so this is the
    // backstop for it going without either — the element removed from the document mid-drag, say.
    fireEvent.lostPointerCapture(element, { pointerId: 1 });
    drag(element, 100, 100);

    expect(element.scrollLeft).toBe(0);
  });

  it('stops panning when the left button is let go while another is still held', () => {
    const element = box();

    press(element, 200, 200);
    // A chorded release: the right button is still down, so this move reports `buttons: 2` rather
    // than nothing at all, and a plain comparison against zero would let the drag run on.
    fireEvent.pointerMove(element, { pointerId: 1, buttons: 2, clientX: 150, clientY: 200 });
    drag(element, 100, 200);

    expect(element.scrollLeft).toBe(0);
    expect(element.dataset['panning']).toBe('false');
  });

  it('stops panning on a move with nothing pressed, however the release went missing', () => {
    const element = box();

    press(element, 200, 200);
    fireEvent.pointerMove(element, { pointerId: 1, buttons: 0, clientX: 100, clientY: 100 });
    // Whatever ended the press, the content must not go on following a bare cursor.
    drag(element, 50, 50);

    expect(element.scrollLeft).toBe(0);
    expect(element.dataset['panning']).toBe('false');
  });

  it('leaves the middle button to the browser, whose autoscroll is a way to pan already', () => {
    const element = box();

    fireEvent.pointerDown(element, {
      pointerId: 1,
      pointerType: 'mouse',
      button: 1,
      buttons: 4,
      clientX: 200,
      clientY: 200,
    });
    drag(element, 100, 100);

    expect(element.scrollLeft).toBe(0);
  });

  it('pans from a finger as readily as from a mouse', () => {
    const element = box();

    touch(element, 200, 200);
    drag(element, 140, 160, 2);

    expect(element.scrollLeft).toBe(60);
    expect(element.scrollTop).toBe(40);
  });

  it('stands down when a second finger joins the first, so the browser can take the pinch', () => {
    const element = box();

    touch(element, 200, 200, 2);
    drag(element, 180, 180, 2);
    touch(element, 300, 300, 3, false);
    drag(element, 100, 100, 2);

    // The 20px the first finger had already moved stands; nothing after the second one lands does.
    expect(element.scrollLeft).toBe(20);
    expect(element.dataset['panning']).toBe('false');
  });

  it('stays down for a third finger mid-pinch rather than arming a pan under the gesture', () => {
    const element = box();

    touch(element, 200, 200, 2);
    drag(element, 180, 180, 2);
    touch(element, 300, 300, 3, false);
    // A third finger while the other two are still on the glass. Standing down cleared the drag, so
    // without a latch there is nothing left to say this contact is part of a gesture already running.
    touch(element, 400, 400, 4, false);
    drag(element, 100, 100, 4);

    expect(element.scrollLeft).toBe(20);
    expect(element.dataset['panning']).toBe('false');
  });

  it('stays down when a finger lifts and lands again with another still on the glass', () => {
    const element = box();

    touch(element, 200, 200, 2);
    drag(element, 180, 180, 2);
    touch(element, 300, 300, 3, false);
    fireEvent.pointerUp(element, { pointerId: 3 });
    // The gesture is not over — the first finger never left — so this contact is still not primary.
    touch(element, 320, 320, 3, false);
    drag(element, 100, 100, 3);

    expect(element.scrollLeft).toBe(20);
    expect(element.dataset['panning']).toBe('false');
  });

  it('survives a palm on the screen mid mouse-drag, which is not a pinch and must not end one', () => {
    const element = box();

    press(element, 200, 200);
    // A touchscreen laptop, and a hand resting on the glass while the other holds the button.
    touch(element, 500, 500, 7);
    fireEvent.pointerUp(element, { pointerId: 7 });
    drag(element, 150, 200);

    expect(element.scrollLeft).toBe(50);
    expect(element.dataset['panning']).toBe('true');
  });

  it('ignores a second pointer moving mid-drag rather than jumping to it', () => {
    const element = box();

    press(element, 200, 200);
    drag(element, 0, 0, 9);

    expect(element.scrollLeft).toBe(0);
  });
});
