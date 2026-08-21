import { PREVIEW_MODE_LABELS } from '../../constants/previewModes.ts';
import { DIFFERENCE_SCALES, PREVIEW_ZOOMS, QUANTISE_TOOLTIPS } from '../../constants/quantiser.ts';
import { PREVIEW_MODES } from '../../types/quantiser.ts';
import type { PreviewMode } from '../../types/quantiser.ts';
import { DownloadControls } from './DownloadControls.tsx';
import { SegmentedChoice } from '../common/SegmentedChoice.tsx';
import { Tooltip } from '../common/Tooltip.tsx';

interface ComparisonToolbarProps {
  /** The layout in force, which is not always the one asked for — see `ImageComparison`. */
  readonly mode: PreviewMode;
  readonly onModeChange: (mode: PreviewMode) => void;
  readonly zoom: number;
  readonly onZoomChange: (zoom: number) => void;
  /** What counts as the top of the heatmap's ramp; shown only while the heatmap is. */
  readonly differenceScale: number;
  readonly onDifferenceScaleChange: (scale: number) => void;
  /** How many file pixels one drawn pixel is written as when the sheet is saved. */
  readonly downloadScale: number;
  readonly onDownloadScaleChange: (scale: number) => void;
  /** The dropped file's name — what the download is named after. */
  readonly sourceName: string;
  /** `null` until a grid is settled, which is the only state the download can be refused in. */
  readonly resultImage: ImageData | null;
}

/**
 * How the result is shown and how far it is magnified, with `DownloadControls` beside it for the
 * way to take it away.
 *
 * **The difference scale appears only while the difference mode does**, which is the conditional
 * `DownscaleControls` uses for the ink-weighted dials and for the same reason: a control that
 * changed nothing would be a lie on screen.
 */
export function ComparisonToolbar({
  mode,
  onModeChange,
  zoom,
  onZoomChange,
  differenceScale,
  onDifferenceScaleChange,
  downloadScale,
  onDownloadScaleChange,
  sourceName,
  resultImage,
}: ComparisonToolbarProps) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-3">
      <div className="flex flex-wrap items-center gap-3">
        <div className="flex items-center gap-1.5">
          {/* Grouped and set apart from the pills, so the ⓘ reads as belonging to the label rather
              than sitting among them as though it were one of them. */}
          <span className="mr-1 flex items-center gap-1.5">
            <span className="text-xs font-semibold text-ink-muted">Show</span>
            <Tooltip text={QUANTISE_TOOLTIPS.previewMode} hint="Show" />
          </span>
          <SegmentedChoice
            label="Preview layout"
            values={PREVIEW_MODES}
            value={mode}
            format={(option) => PREVIEW_MODE_LABELS[option]}
            onChange={onModeChange}
          />
        </div>

        <div className="flex items-center gap-1.5">
          <span className="mr-1 flex items-center gap-1.5">
            <span className="text-xs font-semibold text-ink-muted">Zoom</span>
            {/* Where the pan gesture is named. A cursor that only appears once the pointer is
                already over the image teaches nobody working from the keyboard that it is there. */}
            <Tooltip text={QUANTISE_TOOLTIPS.zoom} hint="Zoom" />
          </span>
          <SegmentedChoice
            label="Preview magnification"
            values={PREVIEW_ZOOMS}
            value={zoom}
            format={(level) => `${String(level)}×`}
            onChange={onZoomChange}
          />
        </div>

        {mode === 'DIFFERENCE' && (
          <div className="flex items-center gap-1.5">
            <span className="mr-1 flex items-center gap-1.5">
              <span className="text-xs font-semibold text-ink-muted">Scale</span>
              <Tooltip text={QUANTISE_TOOLTIPS.differenceScale} hint="Scale" />
            </span>
            <SegmentedChoice
              label="Difference scale"
              values={DIFFERENCE_SCALES}
              value={differenceScale}
              format={(level) => String(level)}
              onChange={onDifferenceScaleChange}
            />
          </div>
        )}
      </div>

      <DownloadControls
        downloadScale={downloadScale}
        onDownloadScaleChange={onDownloadScaleChange}
        sourceName={sourceName}
        resultImage={resultImage}
      />
    </div>
  );
}
