import { useCallback, useLayoutEffect, useRef, useState } from 'react';
import type { ReactNode, RefCallback } from 'react';
import { useDragPan } from '../../hooks/useDragPan.ts';

interface PanViewportProps {
  /** Names the scrolling region for a screen reader, and only once it is one. */
  readonly label: string;
  /**
   * Told about the scrollport as it mounts, and about `null` as it goes.
   *
   * A callback rather than a ref object, because the caller has to *notice*: two of these panes are
   * held to the same view of the same artwork, the arithmetic that does it needs both elements at
   * once, and choosing a preview layout replaces both. A ref object's identity survives that, so
   * nothing downstream could tell — see `useLinkedPanes`, which takes the elements for this reason.
   */
  readonly viewportRef: RefCallback<HTMLDivElement>;
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
 * **The drag is the mouse's, and the browser keeps everything else.** No `touch-action` is claimed, so
 * a finger and a nib pan this box the way they pan any scroll container — with momentum, and chaining
 * out to the page once it reaches its end. That last part is why: below `lg` these panes are the full
 * width of the page and 24rem of its height, twice over, so a pane that took the vertical swipe for
 * itself would leave a finger no way past it. `useDragPan` states the rest of the reasoning.
 *
 * **It carries no padding, and must not.** Content starts at scroll offset zero, which is what makes
 * `src/utils/panGeometry.ts` exact: padding inside a scrolling box displaces the content within the
 * scroll coordinate space, putting a scale-dependent error into every conversion, and engines
 * disagree about whether its trailing edge counts towards `scrollWidth`. Anything needing room around
 * itself brings its own.
 */
export function PanViewport({ label, viewportRef, children }: PanViewportProps) {
  // This component's own handle on the box, kept beside the caller's callback rather than instead of
  // it: the observation below needs the element every commit, and a callback only fires when it
  // changes. Memoised, so React is not detaching and re-attaching the ref on every render.
  const own = useRef<HTMLDivElement>(null);
  const attach = useCallback(
    (element: HTMLDivElement | null) => {
      own.current = element;
      viewportRef(element);
    },
    [viewportRef],
  );
  const [overflow, setOverflow] = useState<Overflow>(NO_OVERFLOW);
  const isPannable = overflow.x || overflow.y;
  const { isPanning, panHandlers } = useDragPan(isPannable);
  // Keeps a focused region reachable after its overflow goes: dropping `tabIndex` from the element
  // that currently has focus blurs it to `<body>`, so the next Tab restarts at the top of the page.
  const [holdsFocus, setHoldsFocus] = useState(false);
  const isReachable = isPannable || holdsFocus;

  // No dependency array, so the observation is re-established after every commit. `children` is a
  // `ReactNode`, which this component cannot depend on, and the element inside it is *replaced* — not
  // merely resized — when `ImageComparison` swaps its placeholder `<p>` for the `<canvas>` a result
  // brings. Re-establishing covers that: a `ResizeObserver` delivers an entry as soon as it starts
  // observing, so re-observing whatever the children now are is also a re-measure of them.
  useLayoutEffect(() => {
    const element = own.current;
    if (element === null) return;

    // The browser's own answer to "does this scroll", rather than the content's size modelled against
    // the box's. Borders and a scrollbar that has appeared are already in it, so there is nothing left
    // to be wrong about where an engine differs. Both sides are integer-rounded, so an overflow of
    // less than a pixel reads as none — which is the answer worth having either way.
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
      ref={attach}
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
      // The cap is a property of where the pane *is*, not of the pane: 24rem is what fits beside ten
      // panels of controls in the split, and it is the whole preview when the panel has been detached
      // into a window of its own. `DetachedPreview` sets the property there; the fallback is written
      // in rather than declared on `:root`, so an unset property can never silently remove the cap.
      className={`max-h-[var(--pane-height,24rem)] overflow-auto rounded-xl border bg-foundry-950 ${
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
