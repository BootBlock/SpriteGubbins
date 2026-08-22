interface LoadingPlaceholderProps {
  /**
   * What is being waited for, announced rather than painted — the sheen says *something* is coming
   * and cannot say what, and a reader who hears nothing is looking at an empty page.
   */
  readonly label: string;
  /** The ground the sheen travels over, and how big it is: a surface class and a size. */
  readonly className: string;
}

/**
 * The stand-in for a chunk that has not arrived yet.
 *
 * `App` and `AppOverlays` split the four views and the four overlays into chunks of their own, so
 * between a reader pressing a tab and that view's code being parsed there is a gap — sub-frame once
 * the service worker has precached everything, and a real wait on a first visit. This is what
 * occupies the space meanwhile: the app's own loading treatment, which the quantiser's working
 * overlay already uses for the same purpose.
 *
 * **The sheen is a layer over the surface, not a class beside it**, which is the arrangement
 * `WorkingOverlay` already has and the reason it has it: `shimmer-surface` is a `background-image`,
 * and so is `glass-panel`'s hairline of the view's colour. On one element the two are the same
 * property and the winner is decided by where they land in the generated stylesheet, which no call
 * site can see — the panel would simply lose its top edge. On two, they compose.
 *
 * `role="status"` rather than `alert`: a view arriving is the expected outcome of the press that
 * asked for it, so it belongs in the queue rather than interrupting. **The announcement is
 * best-effort and not the primary signal**, which is the difference between this and `Toast`: that
 * one keeps an empty region mounted for the whole session precisely because a region inserted at
 * the same moment as its text may not be noticed, and a placeholder cannot do that — it does not
 * exist until the wait it describes begins. What carries the message reliably is the label the
 * control that was pressed already has, and the sheen filling the space it will occupy.
 */
export function LoadingPlaceholder({ label, className }: LoadingPlaceholderProps) {
  return (
    <div role="status" className={`relative overflow-hidden ${className}`}>
      <span
        aria-hidden="true"
        className="shimmer-surface animate-shimmer pointer-events-none absolute inset-0"
      />
      <span className="sr-only">{label}</span>
    </div>
  );
}
