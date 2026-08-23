import { PREVIEW_MODE_LABELS } from '../../constants/previewModes.ts';
import { DIFFERENCE_SCALES, PREVIEW_ZOOMS, QUANTISE_TOOLTIPS } from '../../constants/quantiser.ts';
import { QUANTISE_ACTION_TOOLTIPS } from '../../constants/tooltips/quantise.ts';
import { PREVIEW_MODES } from '../../types/quantiser.ts';
import type { TargetSize } from '../../types/output.ts';
import type { PreviewMode, SpriteDuplicateGroup, SpriteSegmentation } from '../../types/quantiser.ts';
import type { SheetFormat } from '../../types/sheetFormat.ts';
import type { SpriteCellChoice } from '../../types/spriteCell.ts';
import { DownloadControls } from './DownloadControls.tsx';
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
  /** Which file the sheet leaves as. */
  readonly downloadFormat: SheetFormat;
  readonly onDownloadFormatChange: (format: SheetFormat) => void;
  /** The dropped file's name — what the download is named after. */
  readonly sourceName: string;
  /** `null` until a grid is settled, which is the only state the download can be refused in. */
  readonly resultImage: ImageData | null;
  /** What the sheet broke into: an Aseprite document’s frames, a pack's files, a manifest's rects. */
  readonly sprites: SpriteSegmentation | null;
  /** The duplicate reading over those sprites, which a manifest turns into links between them. */
  readonly duplicates: readonly SpriteDuplicateGroup[];
  /** What a pack's or a manifest's sprites are cut into — a bounding box, or a fixed cell. */
  readonly cellChoice: SpriteCellChoice;
  readonly onCellChoiceChange: (choice: SpriteCellChoice) => void;
  /** The component size the studio's prompt states, which is one of the cell's two sources. */
  readonly target: TargetSize | null;
  /** Whether this toolbar is currently being rendered into a window of the panel's own. */
  readonly isDetached: boolean;
  /** Send the panel to a window of its own, or bring it back — whichever it is not doing now. */
  readonly onDetachToggle: () => void;
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
  downloadFormat,
  onDownloadFormatChange,
  sourceName,
  resultImage,
  sprites,
  duplicates,
  cellChoice,
  onCellChoiceChange,
  target,
  isDetached,
  onDetachToggle,
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

      <div className="flex flex-wrap items-center gap-3">
        <DownloadControls
          downloadScale={downloadScale}
          onDownloadScaleChange={onDownloadScaleChange}
          downloadFormat={downloadFormat}
          onDownloadFormatChange={onDownloadFormatChange}
          sourceName={sourceName}
          resultImage={resultImage}
          sprites={sprites}
          duplicates={duplicates}
          cellChoice={cellChoice}
          onCellChoiceChange={onCellChoiceChange}
          target={target}
        />

        {/* Last in the row, and beside the download rather than among the pills on the left: those
            three settings say how the preview is *drawn*, and this says where the whole panel is —
            which is the same kind of thing as taking the result away. One button rather than two,
            because there is only ever one of the two moves available, and it travels with the
            toolbar: detached, this is the copy of the control sitting in the other window. */}
        <ControlTooltip
          hint={isDetached ? 'Return the preview' : 'Detach the preview'}
          text={
            isDetached ? QUANTISE_ACTION_TOOLTIPS.reattachPreview : QUANTISE_ACTION_TOOLTIPS.detachPreview
          }
        >
          <button
            type="button"
            onClick={onDetachToggle}
            className="rounded-lg border border-foundry-600 bg-foundry-700 px-3.5 py-1.5 text-xs font-semibold text-ink transition-all duration-390 hover:bg-foundry-600 active:scale-[0.98]"
          >
            <span aria-hidden="true">{isDetached ? '⤡' : '⤢'}</span>{' '}
            {isDetached ? 'Return to the page' : 'Detach preview'}
          </button>
        </ControlTooltip>
      </div>
    </div>
  );
}
