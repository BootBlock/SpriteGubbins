import { PREVIEW_ZOOMS, QUANTISE_TOOLTIPS } from '../../constants/quantiser.ts';
import { useImageDownload } from '../../hooks/useImageDownload.ts';
import { Tooltip } from '../common/Tooltip.tsx';

interface ComparisonToolbarProps {
  readonly zoom: number;
  readonly onZoomChange: (zoom: number) => void;
  /** The dropped file's name — what the download is named after. */
  readonly sourceName: string;
  /** `null` until a grid is settled, which is the only state the download can be refused in. */
  readonly resultImage: ImageData | null;
}

/** The magnification both panes are held at, and the way to take the quantised sheet away. */
export function ComparisonToolbar({ zoom, onZoomChange, sourceName, resultImage }: ComparisonToolbarProps) {
  const download = useImageDownload();

  return (
    <div className="flex flex-wrap items-center justify-between gap-3">
      <div className="flex items-center gap-1.5">
        {/* Grouped and set apart from the levels, so the ⓘ reads as belonging to the label rather
            than sitting among the zoom levels as though it were one of them. */}
        <span className="mr-1 flex items-center gap-1.5">
          <span className="text-xs font-semibold text-ink-muted">Zoom</span>
          {/* Where the pan gesture is named. A cursor that only appears once the pointer is
              already over the image teaches nobody working from the keyboard that it is there. */}
          <Tooltip text={QUANTISE_TOOLTIPS.zoom} hint="Zoom" />
        </span>
        {PREVIEW_ZOOMS.map((level) => (
          <button
            key={level}
            type="button"
            aria-pressed={level === zoom}
            onClick={() => {
              onZoomChange(level);
            }}
            className={`rounded-lg px-2.5 py-1 font-mono text-[11px] font-semibold transition-colors ${
              level === zoom
                ? 'bg-accent-strong text-ink'
                : 'bg-foundry-700 text-ink-faint hover:bg-foundry-600 hover:text-ink'
            }`}
          >
            {level}×
          </button>
        ))}
      </div>

      <button
        type="button"
        disabled={resultImage === null}
        onClick={() => {
          if (resultImage !== null) download(sourceName, resultImage);
        }}
        className="rounded-lg bg-accent-strong px-3.5 py-1.5 text-xs font-semibold text-ink transition-colors hover:bg-accent disabled:cursor-not-allowed disabled:bg-foundry-700 disabled:text-ink-faint"
      >
        <span aria-hidden="true">⬇</span> Download PNG
      </button>
    </div>
  );
}
