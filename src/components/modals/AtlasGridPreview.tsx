import { useState } from 'react';

interface AtlasGridPreviewProps {
  readonly columns: number;
  readonly rows: number;
  /** How many of the grid's slots the components actually fill; the remainder is wasted texture. */
  readonly componentCount: number;
}

/**
 * The packed atlas, drawn.
 *
 * Shows at a glance what the numbers above state: how square the grid is, and how much of the last
 * row is empty. Hovering a slot reports its coordinates, which is what makes a 111-component layout
 * legible rather than just dense.
 *
 * The grid itself is `aria-hidden`. It carries no information that is not already in the metric
 * tiles — the grid shape, the component count and the cell size are all stated there in text — so
 * announcing ~120 identical cells would be noise rather than access. The hover readout is a pointer
 * convenience for the same reason.
 */
export function AtlasGridPreview({ columns, rows, componentCount }: AtlasGridPreviewProps) {
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);

  return (
    <div className="space-y-2 rounded-xl border border-foundry-700 bg-foundry-950 p-3">
      <div className="flex flex-wrap items-center justify-between gap-2 font-mono text-[10px] text-ink-faint">
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
        className="mx-auto grid aspect-square max-w-[13rem] gap-1 rounded-lg border border-foundry-700 bg-foundry-800 p-2"
        style={{ gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))` }}
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
            className={`aspect-square rounded-[2px] transition-all ${
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
  );
}
