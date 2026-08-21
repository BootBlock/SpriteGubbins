import { useEffect, useRef } from 'react';
import { MAX_IMAGE_PIXELS, PREVIEW_ZOOMS, QUANTISE_TOOLTIPS } from '../../constants/quantiser.ts';
import { QUANTISE_ACTION_TOOLTIPS } from '../../constants/tooltips/index.ts';
import { useImageDownload } from '../../hooks/useImageDownload.ts';
import { ControlTooltip } from '../common/ControlTooltip.tsx';
import { SegmentedChoice } from '../common/SegmentedChoice.tsx';
import { Tooltip } from '../common/Tooltip.tsx';

interface DownloadControlsProps {
  /** How many file pixels one drawn pixel is written as when the sheet is saved. */
  readonly downloadScale: number;
  readonly onDownloadScaleChange: (scale: number) => void;
  /** The dropped file's name — what the download is named after. */
  readonly sourceName: string;
  /** `null` until a grid is settled, which is the only state the download can be refused in. */
  readonly resultImage: ImageData | null;
}

/**
 * The way the sheet leaves the app: at what magnification, and the button that writes it.
 *
 * Split from `ComparisonToolbar`, which is otherwise about how the result is *looked at* — the
 * layout, the zoom, the heatmap's scale. This half writes a file, holds a press that has a duration,
 * and answers what that duration does to the keyboard, none of which the other half has any part in.
 */
export function DownloadControls({
  downloadScale,
  onDownloadScaleChange,
  sourceName,
  resultImage,
}: DownloadControlsProps) {
  const download = useImageDownload();
  const button = useRef<HTMLButtonElement>(null);
  // Whether the button held the keyboard's focus at the moment it was pressed — see the effect.
  const heldFocus = useRef(false);

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
  const unavailable = resultImage === null || download.saving;

  useEffect(() => {
    // A button that disables under the reader's own press takes their focus with it: the browser
    // moves it to the body, and nothing brings it back when the button returns. A pointer user never
    // notices; a keyboard user loses their place in the toolbar for as long as the file takes.
    //
    // **Whether it held focus is recorded at the press, not read back afterwards.** By the time the
    // button re-enables the focus has long since moved to the body, and the body is the *default*
    // rather than evidence of anything — it is equally where a reader lands by clicking the preview
    // mid-write, or by navigating away and back, and it is where a mouse press leaves them on the
    // platforms that do not focus a pressed button at all. Restoring on that test would pull people
    // back to a control they never used.
    //
    // Keyed on the whole disabled state rather than on the write, because a sheet dropped mid-write
    // leaves the button disabled after the file lands, and focus belongs to whoever asked for it
    // once it can take focus again.
    if (unavailable || !heldFocus.current) return;
    heldFocus.current = false;
    // And only where nothing has claimed focus since. A reader who tabbed elsewhere during the write
    // has said where they want to be, and the body is what is left when nobody has.
    if (document.activeElement === document.body) button.current?.focus();
  }, [unavailable]);

  return (
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
          ref={button}
          type="button"
          disabled={unavailable}
          onClick={() => {
            if (resultImage === null) return;
            // Read while the button still has it; a moment later the disable will have taken it.
            heldFocus.current = document.activeElement === button.current;
            // The 1:1 sheet and the factor, never an already-magnified image: the result in memory
            // stays the sheet the previews and the store share, and the magnification happens on the
            // encoder's own thread rather than in this handler.
            download.save(sourceName, resultImage, effectiveScale);
          }}
          className="action-tab rounded-lg px-3.5 py-1.5 text-xs font-semibold transition-all duration-390 active:scale-[0.98] disabled:cursor-not-allowed"
        >
          <span aria-hidden="true">⬇</span> {download.saving ? 'Writing…' : 'Download PNG'}
        </button>
      </ControlTooltip>
    </div>
  );
}
