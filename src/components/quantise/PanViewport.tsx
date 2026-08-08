import { useLayoutEffect, useRef, useState } from 'react';
import type { ReactNode } from 'react';
import { useDragPan } from '../../hooks/useDragPan.ts';

interface PanViewportProps {
  /** Names the scrolling region for a screen reader, and only once it is one. */
  readonly label: string;
  readonly children: ReactNode;
}

/** Which way the box holds more than it is showing, which is what every affordance below hangs on. */
interface Overflow {
  readonly x: boolean;
  readonly y: boolean;
}

const NO_OVERFLOW: Overflow = { x: false, y: false };

/**
 * The window a preview is looked at through, panned by dragging the image itself.
 *
 * At 8× a sheet is eight times the box it is shown in, and reaching the part worth judging meant the
 * scrollbars or the browser's middle-button autoscroll — the first a 10px target, the second absent
 * outside Windows, and neither discoverable. Dragging moves the image under the pointer instead,
 * which is the gesture every other image viewer has trained the user to expect.
 *
 * **Touch and pen are driven here too, not left to the browser.** `touch-action` is one declaration
 * governing both, so it is a single decision, and two things settle it: the native fling carries the
 * view hundreds of pixels past where the finger lifted, which is disqualifying on a surface whose
 * whole purpose is judging individual pixels; and the app owns zoom through its own control, so
 * `pinch-zoom` is all the browser needs to keep. The cost is that a finger inside a pane it can pan
 * cannot also scroll the page — the same bargain every embedded map makes — so only the axes that
 * actually overflow are claimed, and a pane that fits one way stays a way through on that axis.
 */
export function PanViewport({ label, children }: PanViewportProps) {
  const viewport = useRef<HTMLDivElement>(null);
  const [overflow, setOverflow] = useState<Overflow>(NO_OVERFLOW);
  const isPannable = overflow.x || overflow.y;
  const { isPanning, panHandlers } = useDragPan(isPannable);
  // Keeps a focused region reachable after its overflow goes: dropping `tabIndex` from the element
  // that currently has focus blurs it to `<body>`, so the next Tab restarts at the top of the page.
  const [holdsFocus, setHoldsFocus] = useState(false);
  const isReachable = isPannable || holdsFocus;

  // Before the paint, not after it, so the commit that changes the content does not go out with the
  // previous one's `touch-action` still on it. It cannot help the *first* paint — nothing has been
  // measured by then, so every mount shows `NO_OVERFLOW` once whichever hook this is.
  //
  // No dependency array, so the observation is re-established after every commit. `children` is a
  // `ReactNode`, which this component cannot depend on, and the element inside it is *replaced* — not
  // merely resized — when `ImageComparison` swaps its placeholder `<p>` for the `<canvas>` a result
  // brings. Re-establishing covers that: a `ResizeObserver` delivers an entry as soon as it starts
  // observing, so re-observing whatever the children now are is also a re-measure of them.
  useLayoutEffect(() => {
    const element = viewport.current;
    if (element === null) return;

    // The browser's own answer to "does this scroll", rather than the content's size modelled against
    // the box's. Padding, borders and a scrollbar that has appeared are already in it, so there is
    // nothing left to be wrong about where an engine differs. Both sides are integer-rounded, so an
    // overflow of less than a pixel reads as none — which is the answer worth having either way.
    const observer = new ResizeObserver(() => {
      const x = element.scrollWidth > element.clientWidth;
      const y = element.scrollHeight > element.clientHeight;
      // The same answer must be the same object, or React re-renders, the effect above re-observes,
      // the fresh observer reports again — and the component renders once a frame for as long as it
      // is mounted, having changed nothing.
      setOverflow((current) => (current.x === x && current.y === y ? current : { x, y }));
    });
    observer.observe(element);
    for (const child of element.children) observer.observe(child);
    return () => {
      observer.disconnect();
    };
  });

  return (
    <div
      ref={viewport}
      // A scrolling region is reachable by keyboard only if something makes it focusable, and
      // announced only if something names it — but a box with nothing to scroll is a tab stop that
      // does nothing, so both arrive with the overflow and leave with it (or with the focus).
      role={isReachable ? 'group' : undefined}
      aria-label={isReachable ? label : undefined}
      tabIndex={isReachable ? 0 : undefined}
      onFocus={() => {
        setHoldsFocus(true);
      }}
      onBlur={() => {
        setHoldsFocus(false);
      }}
      {...panHandlers}
      // Computed from a measurement, one axis at a time, so no static class can express it. Claiming
      // an axis is what stops the browser panning it out from under the drag — the only thing that
      // does, since `preventDefault` cannot cancel a compositor gesture.
      style={{ touchAction: touchActionFor(overflow) }}
      className={`max-h-96 overflow-auto rounded-xl border bg-foundry-950 p-3 ${
        isPanning
          ? // Cyan, not indigo: this is the palette's live state, and a drag under way is exactly that.
            'cursor-grabbing select-none border-neon'
          : `border-foundry-700 ${isPannable ? 'cursor-grab' : ''}`
      }`}
    >
      {children}
    </div>
  );
}

/**
 * What the browser may still do with a finger or a nib here.
 *
 * `pinch-zoom` survives every case: the browser keeps the one gesture it does better than any handler
 * could, and single-finger drags on a claimed axis arrive as pointer events instead of scrolling the
 * pane out from under them.
 */
function touchActionFor(overflow: Overflow): string | undefined {
  if (overflow.x && overflow.y) return 'pinch-zoom';
  if (overflow.x) return 'pan-y pinch-zoom';
  if (overflow.y) return 'pan-x pinch-zoom';
  return undefined;
}
