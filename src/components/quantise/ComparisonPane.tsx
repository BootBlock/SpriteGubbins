import type { ReactNode, RefCallback } from 'react';
import type { PaneContent } from './PaneWindow.tsx';
import { PaneWindow } from './PaneWindow.tsx';
import { WorkingBadge } from './WorkingBadge.tsx';

export interface ComparisonPaneProps {
  /** What this pane is showing and how big it is — the line above the frame. */
  readonly caption: ReactNode;
  /** Names the scrolling region — see `PaneWindow`, which is what receives it. */
  readonly label: string;
  readonly viewportRef: RefCallback<HTMLDivElement>;
  readonly canvasRef: RefCallback<HTMLCanvasElement>;
  /** `null` where there is nothing to draw yet, which is when {@link placeholder} takes its place. */
  readonly content: PaneContent | null;
  readonly alt: string;
  readonly placeholder: ReactNode;
  /**
   * Whether what this pane is showing is about to be replaced.
   *
   * Optional because only one of the two panes can ever be waiting on anything: the sheet as it
   * arrived is already here, and it is the transform of it that takes a second.
   */
  readonly busy?: boolean;
}

/**
 * One side of the side-by-side comparison: a caption, and a frame the image is looked at through.
 *
 * The pane is told what it is showing rather than working it out, which is what lets the difference
 * heatmap take the result's place here without a second component: both are one pixel per mesh cell,
 * both are placed on the source through the same magnification and leading-cell inset, and the only
 * thing that differs is the caption above and the pixels inside.
 */
export function ComparisonPane({ caption, busy = false, ...window }: ComparisonPaneProps) {
  return (
    <figure className="space-y-2">
      <figcaption className="font-mono text-2xs text-ink-faint">{caption}</figcaption>
      {/* The positioning context the working chip resolves against — see `WorkingBadge`. */}
      <div className="relative">
        {busy && <WorkingBadge />}
        <PaneWindow {...window} />
      </div>
    </figure>
  );
}
