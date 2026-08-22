import { useRef } from 'react';
import type { CSSProperties } from 'react';
import type { ComparisonPaneProps } from './ComparisonPane.tsx';
import { PaneWindow } from './PaneWindow.tsx';
import { WipeHandle } from './WipeHandle.tsx';
import { WorkingBadge } from './WorkingBadge.tsx';

interface WipePanesProps {
  /** The sheet as it arrived, which the divider reveals to its left. */
  readonly first: ComparisonPaneProps;
  /** The quantised sheet, which the divider reveals to its right. */
  readonly second: ComparisonPaneProps;
  readonly busy: boolean;
  /** Where the divider stands, 0 at the frame's left edge and 1 at its right. */
  readonly at: number;
  readonly onMove: (at: number) => void;
}

/**
 * The two previews in one frame, under a divider — the same screen pixels, before and after.
 *
 * The side-by-side pair answers "what did this become". It cannot answer "what moved", because the
 * two frames are three hundred pixels apart and the eye has to carry a colour across the gap: a
 * change of one shade in a handful of cells is simply not findable that way, which is the reading
 * behind both reports that a working dial appeared to do nothing. Laid over one another, the same
 * pixel is the same pixel, and the divider is what lets a reader put the join exactly where they are
 * looking.
 *
 * **Two whole scrollports stacked, not one frame with two canvases in it**, and the reason is the
 * link between them. Both previews already have to be kept on the same region of the same artwork at
 * the same magnification, and `useLinkedPanes` does that by converting through source pixels — so
 * stacking two of the panes it already drives costs nothing and inherits all of it, where a single
 * scrollport holding two canvases would need the leading-cell inset, the extents and the pan
 * arithmetic written a second time.
 *
 * **The upper pane is clipped, and the clip is what makes it half a frame.** `clip-path` on the
 * scrollport clips it in its own border-box coordinates, which do not move when its contents scroll
 * — so the divider stays where the reader put it while the artwork pans beneath it, with nothing
 * tracking the scroll offset. The clipped-away side is not hit-tested either, which is what lets a
 * drag on the left of the divider reach the pane underneath and pan the pair from there.
 *
 * Both extents are identical by construction — every `PaneContent` carries a window sized to the
 * source's own extent — so the two scrollports scroll through the same range and their scrollbars sit
 * on top of one another rather than disagreeing.
 */
export function WipePanes({ first, second, busy, at, onMove }: WipePanesProps) {
  const frame = useRef<HTMLDivElement>(null);

  return (
    <figure className="space-y-2">
      {/* One caption row for one frame, ordered as the frame is: what is on the left of the divider,
          then what is on the right. */}
      <figcaption className="flex flex-wrap items-baseline justify-between gap-x-4 font-mono text-2xs text-ink-faint">
        <span>{first.caption}</span>
        <span>{second.caption}</span>
      </figcaption>

      {/* The positioning context for the divider, the clip and the working chip — and where the
          divider's position is published, so the handle and the clip below cannot come apart. */}
      {/* Cast because `CSSProperties` enumerates the known CSS properties and a custom one is not
          among them — the same cast, for the same reason, as the one `PresetCard` makes to hand a
          card its own stop on the wheel. */}
      <div ref={frame} className="relative" style={{ '--wipe': `${String(at * 100)}%` } as CSSProperties}>
        {busy && <WorkingBadge />}
        <PaneWindow {...paneOf(first)} />
        <div className="absolute inset-0" style={{ clipPath: 'inset(0 0 0 var(--wipe))' }}>
          <PaneWindow {...paneOf(second)} />
        </div>
        <WipeHandle at={at} onMove={onMove} frameRef={frame} />
      </div>
    </figure>
  );
}

/** A pane's props without the two the caption row and the frame have taken over. */
function paneOf({ caption: _caption, busy: _busy, ...window }: ComparisonPaneProps) {
  return window;
}
