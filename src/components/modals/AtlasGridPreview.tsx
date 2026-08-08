import { useState } from 'react';
import type { AtlasCanvasSize, AtlasMetrics } from '../../types/atlas.ts';

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
 * is empty, and how much of the texture the grid never reaches. Hovering a slot reports its
 * coordinates, which is what makes a 111-component layout legible rather than just dense.
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
 * The grid itself is `aria-hidden`. It carries no information that is not already in the metric
 * tiles — the grid shape, the component count, the empty slots and the share of texture in use are
 * all stated there in text — so announcing ~120 identical cells would be noise rather than access.
 * The hover readout is a pointer convenience for the same reason.
 */
export function AtlasGridPreview({ metrics, canvasSize, componentCount }: AtlasGridPreviewProps) {
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);
  const { columns, rows, cellSize } = metrics;

  return (
    <div className="space-y-2 rounded-xl border border-foundry-700 bg-foundry-950 p-3">
      <div className="flex flex-wrap items-center justify-between gap-2 font-mono text-2xs text-ink-faint">
        <span>
          Interactive atlas layout ({columns}×{rows})
        </span>
        <span>
          {hoveredIndex === null
            ? 'Hover a slot for its position'
            : `Slot #${hoveredIndex + 1}: row ${Math.floor(hoveredIndex / columns) + 1}, column ${(hoveredIndex % columns) + 1}`}
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
          {Array.from({ length: columns * rows }, (_unused, index) => (
            <div
              key={index}
              onMouseEnter={() => {
                setHoveredIndex(index);
              }}
              onMouseLeave={() => {
                setHoveredIndex(null);
              }}
              className={`rounded-[2px] transition-all ${
                index < componentCount
                  ? hoveredIndex === index
                    ? 'z-10 scale-125 bg-accent-soft shadow-lg'
                    : 'border border-accent/50 bg-accent/40'
                  : 'border border-foundry-700 bg-foundry-700/30'
              }`}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
