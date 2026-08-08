import { useRef, useState } from 'react';
import type { PointerEvent as ReactPointerEvent, PointerEventHandler } from 'react';
import { clampOffset } from '../utils/panGeometry.ts';

/**
 * Everything the next move is measured against: the dragging pointer, where it was when it last moved
 * the content, the offset asked for in fractions of a pixel, and what the scrollport took in reply.
 */
interface PanOrigin {
  readonly pointerId: number;
  readonly x: number;
  readonly y: number;
  readonly left: number;
  readonly top: number;
  readonly tookLeft: number;
  readonly tookTop: number;
}

/** The pointer events a drag is built from — every one of which is spread onto the same element. */
type PanEvent =
  'onPointerDown' | 'onPointerMove' | 'onPointerUp' | 'onPointerCancel' | 'onLostPointerCapture';

/** What a scrolling box needs from this hook: one flag to style by, and the handlers to spread. */
export interface DragPan {
  readonly isPanning: boolean;
  readonly panHandlers: Readonly<Record<PanEvent, PointerEventHandler<HTMLElement>>>;
}

/**
 * Dragging a scrolling box's own content to move around it, with the mouse rather than a scrollbar.
 *
 * Impure to its core — it captures pointers, moves focus and writes scroll offsets — so it cannot live
 * in `src/utils/`, and it is not a component. The element it drives is whichever one the handlers are
 * spread onto; nothing here knows what is inside it. `enabled` is the caller's answer to "is there
 * anywhere to scroll": a drag on a box whose content fits would suppress a text selection and move
 * focus to pay for a pan that could not move anything.
 *
 * **The mouse, and only the mouse.** A finger and a nib already drag a scroll container — that is what
 * `touch-action: auto` means — and the browser does it with momentum, rubber-banding and chaining out
 * to the page at the ends, none of which a handler can reproduce. Claiming the gesture would replace
 * that with something worse *and* take the page with it: these panes are full-width below `lg`, so a
 * pane that swallowed a vertical swipe would leave a finger no way to scroll past it. Precision is not
 * the trade it looks like, either — a fling needs a flick, and the slow deliberate drag that positions
 * a sprite for inspection stops exactly where it was released. The mouse gets a handler because it is
 * the pointer with no such gesture: without one it has a 10px scrollbar and nothing else.
 */
export function useDragPan(enabled: boolean): DragPan {
  const origin = useRef<PanOrigin | null>(null);
  const [isPanning, setIsPanning] = useState(false);

  function beginPan(event: ReactPointerEvent<HTMLElement>): void {
    // The left button of a mouse. The middle button is the browser's own autoscroll and the right one
    // opens the context menu, so claiming either would take away a way to pan; a finger or a nib is
    // the browser's too, for the reasons above. Everything else here is therefore a single pointer,
    // which is what lets this hook do without any of the machinery a multi-touch gesture would need.
    if (!enabled || event.button !== 0 || event.pointerType !== 'mouse') return;
    if (origin.current !== null) return;
    const element = event.currentTarget;

    // Suppresses the text selection and drag image this press would otherwise start — and with them the
    // synthesised `mousedown` that would have moved focus, so focus is set explicitly instead, leaving
    // the arrow keys aimed at what was just dragged.
    event.preventDefault();
    element.focus({ preventScroll: true });
    // Keeps the drag alive past the edge of the box: every move, and the release, is delivered here.
    element.setPointerCapture(event.pointerId);

    origin.current = {
      pointerId: event.pointerId,
      x: event.clientX,
      y: event.clientY,
      left: element.scrollLeft,
      top: element.scrollTop,
      tookLeft: element.scrollLeft,
      tookTop: element.scrollTop,
    };
    setIsPanning(true);
  }

  function continuePan(event: ReactPointerEvent<HTMLElement>): void {
    const start = origin.current;
    if (start === null || start.pointerId !== event.pointerId) return;
    // A move with the left button no longer among those held means the release happened somewhere this
    // element never heard about — a window that lost focus, or a chorded release, which reports the
    // *other* button still down rather than nothing at all. Masking is what sees that second one.
    if (!enabled || (event.buttons & 1) === 0) {
      endPan();
      return;
    }

    // Each move shifts the content by its own travel, clamped here rather than discovered by writing past
    // the limit — a refused offset would go on counting, and a drag 300px past the bottom would owe it all
    // back before the content stirred. That travel is added to the offset this hook *asked* for, not what
    // the scrollport rounded it to, since a pointer reports fractions of a pixel and a scrollport whole
    // ones; an offset it did not hand back means something else scrolled it, and is where the next starts.
    const element = event.currentTarget;
    const fromLeft = element.scrollLeft === start.tookLeft ? start.left : element.scrollLeft;
    const fromTop = element.scrollTop === start.tookTop ? start.top : element.scrollTop;
    const left = clampOffset(fromLeft - (event.clientX - start.x), element.scrollWidth - element.clientWidth);
    const top = clampOffset(fromTop - (event.clientY - start.y), element.scrollHeight - element.clientHeight);
    element.scrollLeft = left;
    element.scrollTop = top;

    origin.current = {
      ...start,
      x: event.clientX,
      y: event.clientY,
      left,
      top,
      tookLeft: element.scrollLeft,
      tookTop: element.scrollTop,
    };
  }

  function endPan(): void {
    origin.current = null;
    setIsPanning(false);
  }

  /** Only the pointer that started the drag may end it: a stray contact must not kill a mouse pan. */
  function endPanFor(event: ReactPointerEvent<HTMLElement>): void {
    if (origin.current?.pointerId !== event.pointerId) return;
    endPan();
  }

  return {
    isPanning,
    panHandlers: {
      onPointerDown: beginPan,
      onPointerMove: continuePan,
      // Every ending. `pointerup` is the ordinary one and `pointercancel` the platform taking over;
      // `lostpointercapture` catches a capture going another way, however it went.
      onPointerUp: endPanFor,
      onPointerCancel: endPanFor,
      onLostPointerCapture: endPanFor,
    },
  };
}
