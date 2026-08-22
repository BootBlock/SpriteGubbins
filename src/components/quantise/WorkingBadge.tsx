import { Badge } from '../common/Badge.tsx';

/**
 * The chip that says a newer result is on its way, over whichever frame is waiting.
 *
 * Its own component because both preview layouts show it and each has exactly one frame to show it
 * on — the pair's result pane, and the wipe's single overlaid frame. Written twice, the second copy
 * is where the `pointer-events-none` goes missing, and that one class is the whole reason the
 * transform left the main thread: the frame below stays pannable while the next result is computed.
 *
 * **A chip in the corner, and deliberately nothing across the frame.** This used to sit under a
 * `shimmer-surface` sheen spanning the whole pane, which is the app's loading treatment everywhere
 * else — but everywhere else it fills space that holds nothing yet, and here it lay over the
 * reader's own artwork. That gradient is white at 8% through its middle, so the sprites lightened
 * for as long as the worker ran, and the comparison this tab exists for was being made against a
 * washed copy of one side of it. What a preview pane is waiting on is said in the corner instead,
 * where it costs the image no pixels.
 *
 * The caller supplies the positioning context. `PanViewport` cannot be it — it is the scrollport, so
 * anything absolutely positioned inside it would be pinned to the top-left of a *scrolled* sheet and
 * slide away as the user pans.
 */
export function WorkingBadge() {
  return (
    // `Badge` says "live", and the wrapper is the only thing it cannot say for itself: where to sit,
    // and what to sit *on*. The dark ground is the wrapper's because this chip lands on the user's
    // image rather than on the app's own panel, where the badge's own translucent fill has nothing
    // dependable behind it.
    <span className="pointer-events-none absolute top-2 right-2 z-10 rounded-full bg-foundry-950/80">
      <Badge tone="live">Quantising…</Badge>
    </span>
  );
}
