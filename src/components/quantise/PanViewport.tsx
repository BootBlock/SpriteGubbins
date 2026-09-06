import { useCallback } from 'react';
import type { ReactNode, RefCallback } from 'react';
import { useDragPan } from '../../hooks/useDragPan.ts';
import { useScrollableRegion } from '../../hooks/useScrollableRegion.ts';

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
  // The naming, the tab stop and the overflow measurement are `useScrollableRegion`'s, shared with
  // the compiled prompt, the split drawer's prompts and the quantiser's two report lists — every box
  // in the app that scrolls with nothing focusable inside it. What stays here is the half that is
  // this component's alone: the drag, and the cursor that advertises it.
  // Destructured, not held as one object: the React Compiler's `refs` rule treats a hook result
  // whose member reaches a `ref=` prop as a ref container and rejects every other read of it during
  // render, `overflow` included.
  const { attach: attachScrollport, overflow, regionProps } = useScrollableRegion<HTMLDivElement>(label);
  // The caller's callback beside the hook's, rather than instead of it. Memoised, so React is not
  // detaching and re-attaching the ref on every render.
  const attach = useCallback(
    (element: HTMLDivElement | null) => {
      attachScrollport(element);
      viewportRef(element);
    },
    [attachScrollport, viewportRef],
  );
  const isPannable = overflow.x || overflow.y;
  const { isPanning, panHandlers } = useDragPan(isPannable);

  return (
    <div
      ref={attach}
      {...regionProps}
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
