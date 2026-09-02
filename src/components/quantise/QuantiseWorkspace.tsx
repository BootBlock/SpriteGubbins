import type { TargetSize } from '../../types/output.ts';
import type {
  BackgroundKeying,
  ColorPlan,
  ImportedImage,
  PixelGrid,
  Quantised,
  QuantiseSettings,
  SheetFacts,
} from '../../types/quantiser.ts';
import { ImageComparison } from './ImageComparison.tsx';
import { QuantiseControlColumn } from './QuantiseControlColumn.tsx';

interface QuantiseWorkspaceProps {
  readonly source: ImportedImage;
  readonly facts: SheetFacts | null;
  readonly grid: PixelGrid | null;
  readonly settings: QuantiseSettings | null;
  readonly quantised: Quantised | null;
  readonly busy: boolean;
  readonly error: string | null;
  readonly keying: BackgroundKeying | null;
  readonly keyOffered: boolean;
  readonly colorPlan: ColorPlan;
  readonly target: TargetSize | null;
  readonly suggested: PixelGrid | null;
  readonly expected: number;
  readonly setGridOverride: (grid: PixelGrid | null) => void;
}

/**
 * Everything the tab shows once a sheet is loaded: the dials, and the previews they change.
 *
 * The split, and it is inside the sheet guard on purpose: with no image loaded the tab is a
 * paragraph and a drop zone, and a 5/12 column holding the drop zone beside seven columns of
 * nothing is a worse layout than the one it replaced.
 *
 * `items-start` is what makes the sticky column possible at all — without it the grid
 * stretches both columns to the taller one's height, and an element already as tall as its
 * container has nowhere to stick to.
 *
 * Split out of `QuantiseTab`, which keeps the header, the guide and the drop zone — the half that is
 * on screen whether or not there is a sheet. That is the same line the sheet guard already drew;
 * this makes it a boundary between components rather than one drawn inside a single render.
 */
export function QuantiseWorkspace({
  source,
  facts,
  grid,
  settings,
  quantised,
  busy,
  error,
  keying,
  keyOffered,
  colorPlan,
  target,
  suggested,
  expected,
  setGridOverride,
}: QuantiseWorkspaceProps) {
  return (
    <div className="grid grid-cols-1 items-start gap-6 quantise:grid-cols-12">
      <div className="space-y-6 quantise:col-span-5">
        <QuantiseControlColumn
          source={source}
          facts={facts}
          grid={grid}
          settings={settings}
          quantised={quantised}
          busy={busy}
          error={error}
          keying={keying}
          keyOffered={keyOffered}
          colorPlan={colorPlan}
          target={target}
          suggested={suggested}
          expected={expected}
          setGridOverride={setGridOverride}
        />
      </div>

      {/*
        The previews, pinned. Everything the reader turns is in the column beside this one, and
        before the split they were all above it: ten panels of dials, and then the two canvases
        those dials change, a screen and a half further down. Tuning meant scrolling away from
        the only thing that says whether the tuning helped.

        The offsets are the studio's, and they name no height: `--sticky-column-top` and
        `--sticky-column-height` are derived from what `Header` measures, so the top clears the
        chrome and the cap gives it back at whatever height the bar happens to be. Both used to
        be written down here in two pairs, the second of each on `xl` to approximate the width at
        which the bar stops wrapping — which left the toolbar tucked under the header or a hole
        above it either side of that guess. See the two properties in `index.css`.

        `overflow-y-auto` is what makes the cap safe rather than tidy. A sticky element taller
        than its cap keeps its top pinned, so whatever hangs past the bottom cannot be scrolled
        to at all — on a short window that would be the second pane and the caption under it.
        The column scrolls instead. The pan viewports inside keep their own scrolling, and the
        lifted tooltip surfaces re-pin against this column the way they already do the studio's:
        `useAnchoredSurface` listens for `scroll` on the document in the capture phase precisely
        because an anchor may sit inside a scrolling panel.
        */}
      <div className="quantise:sticky quantise:top-[var(--sticky-column-top)] quantise:col-span-7 quantise:max-h-[var(--sticky-column-height)] quantise:overflow-y-auto">
        <ImageComparison
          sourceName={source.name}
          source={source.image}
          sourceColors={facts?.colors ?? null}
          scale={facts?.scale ?? null}
          grid={grid}
          quantised={quantised}
          target={target}
          busy={busy}
        />
      </div>
    </div>
  );
}
