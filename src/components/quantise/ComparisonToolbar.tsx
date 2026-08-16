import { PREVIEW_MODE_LABELS } from '../../constants/previewModes.ts';
import {
  DIFFERENCE_SCALES,
  MAX_IMAGE_PIXELS,
  PREVIEW_ZOOMS,
  QUANTISE_TOOLTIPS,
} from '../../constants/quantiser.ts';
import { QUANTISE_ACTION_TOOLTIPS } from '../../constants/tooltips/index.ts';
import { useImageDownload } from '../../hooks/useImageDownload.ts';
import { PREVIEW_MODES } from '../../types/quantiser.ts';
import type { PreviewMode } from '../../types/quantiser.ts';
import { upscaleNearest } from '../../utils/upscaleNearest.ts';
import { ControlTooltip } from '../common/ControlTooltip.tsx';
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
 * How the result is shown, how far it is magnified, and the way to take it away.
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
  const download = useImageDownload();

  // The same ladder the preview offers, cut to what this result can afford: a magnification whose
  // file would outgrow the largest image the tab itself accepts is not offered for this sheet. The
  // full ladder stands in while there is no result, so the row does not jump as one arrives.
  const available: readonly number[] =
    resultImage === null
      ? PREVIEW_ZOOMS
      : PREVIEW_ZOOMS.filter(
          (scale) => resultImage.width * scale * (resultImage.height * scale) <= MAX_IMAGE_PIXELS,
        );
  // Derived rather than clamped in state: a new, larger result can strand the chosen rung, and the
  // honest answer is to save at 1× and show 1× pressed — not to show a selection the download
  // would silently ignore.
  const effectiveScale = available.includes(downloadScale) ? downloadScale : PREVIEW_ZOOMS[0];

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

      <div className="flex flex-wrap items-center gap-3">
        <div className="flex items-center gap-1.5">
          <span className="mr-1 flex items-center gap-1.5">
            <span className="text-xs font-semibold text-ink-muted">Save at</span>
            <Tooltip text={QUANTISE_TOOLTIPS.downloadScale} hint="Save at" />
          </span>
          <SegmentedChoice
            label="Download magnification"
            values={available}
            value={effectiveScale}
            format={(level) => `${String(level)}×`}
            onChange={onDownloadScaleChange}
          />
        </div>

        <ControlTooltip hint="Download PNG" text={QUANTISE_ACTION_TOOLTIPS.downloadPNG}>
          <button
            type="button"
            disabled={resultImage === null}
            onClick={() => {
              if (resultImage === null) return;
              // Magnified on the way out, never held magnified: the result in memory stays the
              // 1:1 sheet the previews and the store share.
              download(
                sourceName,
                effectiveScale === 1 ? resultImage : upscaleNearest(resultImage, effectiveScale),
                effectiveScale,
              );
            }}
            className="action-tab rounded-lg px-3.5 py-1.5 text-xs font-semibold transition-all duration-390 active:scale-[0.98] disabled:cursor-not-allowed"
          >
            <span aria-hidden="true">⬇</span> Download PNG
          </button>
        </ControlTooltip>
      </div>
    </div>
  );
}
