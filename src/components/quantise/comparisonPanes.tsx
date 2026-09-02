import type { PixelGrid, PreviewMode, Quantised, SheetScale } from '../../types/quantiser.ts';
import type { ComparisonPaneProps } from './ComparisonPane.tsx';
import { emptyReason, secondCaption, sourceCaption } from './paneCaptions.tsx';

/**
 * How each of the two preview frames is described to `ComparisonPane`.
 *
 * Split out of `ImageComparison`, which owns the panel: the state, the toolbar, the detached window
 * and the paint. These are pure descriptions — a caption, a label, an alt string and the geometry
 * that puts the two frames at one scale — and none of them touches the DOM or holds anything.
 *
 * The geometry is the reason they are together rather than beside their panes. One full-cell result
 * pixel covers `grid` source pixels and a leading partial cell covers only `offset` of them, so the
 * two frames only agree while the same file writes both.
 */

/**
 * What the second frame is called, and what it is described as, per mode.
 *
 * **Keyed by what the frame is showing rather than by the mode chosen**, which are the same thing in
 * four of the five cases and are not in the fifth — see `SecondPaneImage.pictured` in
 * `src/hooks/useSecondPaneImage.ts`, which decides that, for the onion mode that can be selected
 * with nothing to stack.
 *
 * Records keyed by the union rather than a chain of ternaries at the two call sites, so a sixth mode
 * fails to compile until both halves have been written — which is the same property
 * `PREVIEW_MODE_LABELS` is a separate file to keep. `WIPE` names the result because that is what the
 * second frame holds there; the layout is what differs, not the picture.
 */
const SECOND_PANE_LABELS: Readonly<Record<PreviewMode, string>> = {
  SIDE_BY_SIDE: 'Pan the quantised sheet',
  WIPE: 'Pan the quantised sheet',
  DIFFERENCE: 'Pan the difference heatmap',
  SPRITES: 'Pan the quantised sheet with its sprite bounds marked',
  ONION: 'Pan the quantised sheet with each strip’s frames stacked on its first slot',
};

const SECOND_PANE_ALT: Readonly<Record<PreviewMode, string>> = {
  SIDE_BY_SIDE: 'The sheet after grid alignment and palette reduction',
  WIPE: 'The sheet after grid alignment and palette reduction',
  DIFFERENCE: 'How far each drawn pixel sits from the patch of the sheet it stands for',
  SPRITES: 'The quantised sheet, with a box drawn around each separate sprite found on it',
  ONION: 'The quantised sheet, with every frame of each row of sprites laid over the first frame of that row',
};

/** The left frame: the sheet exactly as it arrived. */
export function sourcePane(
  source: ImageData,
  sourceColors: number | null,
  zoom: number,
  viewportRef: (view: HTMLDivElement | null) => void,
  canvasRef: (canvas: HTMLCanvasElement | null) => void,
): ComparisonPaneProps {
  return {
    caption: sourceCaption(source, sourceColors),
    label: 'Pan the sheet as it arrived',
    viewportRef,
    canvasRef,
    content: {
      image: source,
      magnification: zoom,
      window: { width: source.width * zoom, height: source.height * zoom },
      inset: { x: 0, y: 0 },
    },
    alt: 'The sheet as it arrived',
    placeholder: null,
  };
}

/** The right frame: whichever picture the mode showing calls for, placed against the left one. */
export function secondPane(
  source: ImageData,
  quantised: Quantised | null,
  secondImage: ImageData | undefined,
  shown: PreviewMode,
  pictured: PreviewMode,
  zoom: number,
  busy: boolean,
  grid: PixelGrid | null,
  scale: SheetScale | null,
  viewportRef: (view: HTMLDivElement | null) => void,
  canvasRef: (canvas: HTMLCanvasElement | null) => void,
): ComparisonPaneProps {
  return {
    caption: secondCaption(shown, quantised, busy),
    label: SECOND_PANE_LABELS[pictured],
    viewportRef,
    canvasRef,
    // One full-cell result pixel covers `grid` source pixels, so `zoom * grid` is what puts the two
    // panes at the same scale — and a leading partial cell covers only `offset` of them, which is
    // what the inset corrects for. Everything comes from the same value, so no half of the placement
    // can go missing on its own, and the heatmap inherits all of it by being the same size.
    content:
      quantised === null || secondImage === undefined
        ? null
        : {
            image: secondImage,
            magnification: zoom * quantised.grid,
            window: { width: source.width * zoom, height: source.height * zoom },
            inset: {
              x: quantised.result.offset.x > 0 ? (quantised.grid - quantised.result.offset.x) * zoom : 0,
              y: quantised.result.offset.y > 0 ? (quantised.grid - quantised.result.offset.y) * zoom : 0,
            },
          },
    alt: SECOND_PANE_ALT[pictured],
    placeholder: (
      // Its own padding, because `PanViewport` carries none — see the note on its geometry.
      <p className="p-3 text-xs leading-relaxed text-ink-muted">{emptyReason(busy, grid, scale)}</p>
    ),
  };
}
