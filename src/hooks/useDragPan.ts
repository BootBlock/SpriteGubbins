import { useRef, useState } from 'react';
import type { PointerEvent as ReactPointerEvent, PointerEventHandler } from 'react';

/**
 * Everything the next move is measured against: the dragging pointer, where it was when it last moved
 * the content, the offset asked for in fractions of a pixel, and what the scrollport took in reply.
 */
interface PanOrigin {
  readonly pointerId: number;
  readonly pointerType: string;
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
 * Dragging a scrolling box's own content to move around it, with the pointer rather than a scrollbar.
 *
 * Impure to its core — it captures pointers, moves focus and writes scroll offsets — so it cannot live
 * in `src/utils/`, and it is not a component. The element it drives is whichever one the handlers are
 * spread onto; nothing here knows what is inside it. `enabled` is the caller's answer to "is there
 * anywhere to scroll": a drag on a box whose content fits would suppress a text selection and move
 * focus to pay for a pan that could not move anything.
 *
 * The offsets assume a left-to-right scrollport, running from zero to its overflow; this app has no
 * other kind, and the clamp in `continuePan` is the line an RTL one would have to change.
 */
export function useDragPan(enabled: boolean): DragPan {
  const origin = useRef<PanOrigin | null>(null);
  const [isPanning, setIsPanning] = useState(false);

  function beginPan(event: ReactPointerEvent<HTMLElement>): void {
    // The left button, or a finger or nib in contact. The middle button is the browser's own autoscroll
    // and the right one opens the context menu, so claiming either would take away a way to pan.
    if (!enabled || event.button !== 0) return;
    const element = event.currentTarget;

    // Any contact but the first is a pinch beginning, so a touch drag stands down and lets the browser
    // have the gesture whole. `isPrimary` is the latch as much as the test — no touch is primary again
    // until every finger has lifted — so nothing can arm a fresh pan under a gesture still in progress.
    // Only a touch drag gives way: a finger during a *mouse* drag is a palm on a touchscreen laptop,
    // and must not take the drag from the hand still holding the button.
    if (event.pointerType === 'touch' && !event.isPrimary) {
      if (origin.current?.pointerType === 'touch') {
        element.releasePointerCapture(origin.current.pointerId);
        endPan();
      }
      return;
    }
    if (origin.current !== null) return;

    // Suppresses the text selection and drag image this press would otherwise start — and with them the
    // synthesised `mousedown` that would have moved focus, so focus is set explicitly instead, leaving
    // the arrow keys aimed at what was just dragged.
    event.preventDefault();
    element.focus({ preventScroll: true });
    // Keeps the drag alive past the edge of the box: every move, and the release, is delivered here.
    element.setPointerCapture(event.pointerId);

    origin.current = {
      pointerId: event.pointerId,
      pointerType: event.pointerType,
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
    const left = within(fromLeft - (event.clientX - start.x), element.scrollWidth - element.clientWidth);
    const top = within(fromTop - (event.clientY - start.y), element.scrollHeight - element.clientHeight);
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

  /** Only the pointer that started the drag may end it: a stray touch must not kill a mouse pan. */
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
      // `lostpointercapture` catches a capture going another way, as the stand-down above releases it.
      onPointerUp: endPanFor,
      onPointerCancel: endPanFor,
      onLostPointerCapture: endPanFor,
    },
  };
}

/** Hold an offset inside a left-to-right scrollport's range, which runs from zero to its overflow. */
function within(offset: number, overflow: number): number {
  return Math.min(Math.max(offset, 0), Math.max(overflow, 0));
}
