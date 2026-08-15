import { ATLAS_TOOLTIPS } from '../../constants/atlas.ts';
import type { AtlasCanvasSize, AtlasMetrics } from '../../types/atlas.ts';
import { Tooltip } from '../common/Tooltip.tsx';

interface AtlasGridPreviewProps {
  /** The whole metric set, so the picture is drawn from the numbers printed beside it. */
  readonly metrics: AtlasMetrics;
  /** The texture the grid is drawn inside — the square frame's own dimension. */
  readonly canvasSize: AtlasCanvasSize;
  /** How many of the grid's slots the components actually fill; the remainder is wasted texture. */
  readonly componentCount: number;
}

/**
 * The packed atlas, drawn.
 *
 * Shows at a glance what the numbers above state: how square the grid is, how much of the last row
 * is empty, and how much of the texture the grid never reaches. Waste has a *shape*, and the six
 * metric tiles can only price it — this is the panel that says where it is.
 *
 * **The square is the texture, and the grid inside it is drawn to scale within it** — from
 * `cellSize`, the figure the calculator already derived, rather than from a proportion worked out
 * again here. That is the whole reason the metrics arrive as one object: a second encoding of "cell
 * pitch is the texture divided by the grid's longer axis" would let the picture drift away from the
 * numbers printed above it, and it would also miss the remainder the calculator floors away.
 *
 * So a grid wider than it is tall leaves a band of texture along the bottom, and a taller one leaves
 * it down the side — the same waste the "texture in use" tile prices. Sizing the grid to the full
 * square instead, as this once did, drew every layout as a perfect fit and hid the one thing worth
 * seeing; it also ran a 9:16 sheet's rows straight out of the bottom of the frame.
 *
 * **It is a picture and not a widget, deliberately.** Each cell used to answer a hover with its slot
 * number, row and column, and that read as a promise the app cannot keep: nothing asks the generator
 * for this grid. Section 9 of the prompt asks for "a clean exploded grid" and names no dimensions,
 * and section 10's manifest has the model *report back* the `cols`/`rows` it chose — "the manifest
 * describes what you actually drew" — while these come from `ceil(sqrt(count × bias))` in
 * `utils/atlasCalculator.ts`. The two are unrelated by construction, so a per-slot coordinate was
 * inviting a reader to look for part #12 at row 2, column 4 of a returned sheet that was never laid
 * out that way. What is left is the plan for the texture *you* repack the extracted artwork into,
 * which is a true statement and the only one this panel was ever making.
 *
 * The grid itself is `aria-hidden`. It carries no information that is not already in the metric
 * tiles — the grid shape, the component count, the empty slots and the share of texture in use are
 * all stated there in text — so announcing ~120 identical cells would be noise rather than access.
 * The filled/empty count in the heading is the legend that makes the drawing readable, and it is
 * text, so it is not a pointer-only affordance the way the hover readout was.
 */
export function AtlasGridPreview({ metrics, canvasSize, componentCount }: AtlasGridPreviewProps) {
  const { columns, rows, cellSize, slots } = metrics;

  return (
    <div className="space-y-2 rounded-xl border border-foundry-700 bg-foundry-950 p-3">
      <div className="flex flex-wrap items-center justify-between gap-2 font-mono text-xs text-ink-faint">
        <span className="flex items-center gap-1.5">
          Atlas packing plan ({columns}×{rows})
          <Tooltip text={ATLAS_TOOLTIPS.packingPlan} hint="Atlas packing plan" />
        </span>
        <span>
          {componentCount} of {slots} slots filled
        </span>
      </div>

      <div
        aria-hidden="true"
        className="mx-auto aspect-square w-full max-w-[13rem] rounded-lg border border-foundry-700 bg-foundry-800 p-2"
      >
        <div
          className="grid gap-1"
          style={{
            width: `${((columns * cellSize) / canvasSize) * 100}%`,
            height: `${((rows * cellSize) / canvasSize) * 100}%`,
            gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))`,
            gridTemplateRows: `repeat(${rows}, minmax(0, 1fr))`,
          }}
        >
          {Array.from({ length: slots }, (_unused, index) => (
            <div
              key={index}
              className={`rounded-[2px] ${
                index < componentCount
                  ? 'border border-accent/50 bg-accent/40'
                  : 'border border-foundry-700 bg-foundry-700/30'
              }`}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
