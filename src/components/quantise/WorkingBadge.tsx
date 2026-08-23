import { Badge } from '../common/Badge.tsx';

/**
 * The chip that says a newer result is on its way, over whichever frame is waiting.
 *
 * Its own component because both preview layouts show it and each has exactly one frame to show it
 * on — the pair's result pane, and the wipe's single overlaid frame. Written twice, the second copy
 * is where the `pointer-events-none` goes missing, and the corner it sits in is the corner a reader
 * grabs to pan: the transform left the main thread so the frame below stays draggable while the next
 * result is computed, and a chip that swallowed the gesture would spend part of that.
 *
 * **A chip in the corner, and deliberately nothing across the frame.** This used to arrive under a
 * `shimmer-surface` sheen spanning the whole pane — the treatment `LoadingPlaceholder` and the
 * history drawer use for space that holds nothing yet. Neither of these frames is that space: each
 * is still showing the previous result, which is the whole reason it is not blanked. The gradient is
 * white at 8% through its middle, so the sprites lightened for as long as the worker ran and the
 * before-and-after this tab exists for was being read off a washed copy of one side of it. What a
 * pane is waiting on is said in the corner instead, where it costs the image no pixels.
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
