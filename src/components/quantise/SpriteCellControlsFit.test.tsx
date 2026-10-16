import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import {
  DEFAULT_SPRITE_CELL_CHOICE,
  SPRITE_FIT_IN_PLACE_UNAVAILABLE,
  SPRITE_FIT_PLACED_ONLY,
  SPRITE_FIT_UNAVAILABLE,
} from '../../constants/spriteCell.ts';
import type { CellLattice } from '../../types/cellLattice.ts';
import type { PixelGrid, SpriteBox } from '../../types/quantiser.ts';
import type { SpriteCellChoice } from '../../types/spriteCell.ts';
import { SpriteCellControls } from './SpriteCellControls.tsx';

/**
 * The fit: where it is offered, what it says it will do, and when a sheet may not take it. The rest
 * of the panel is `SpriteCellControls.test.tsx`'s.
 */

/** Four painted tiles on a 300-pixel step, each larger than a 128 cell. */
const BOXES: readonly SpriteBox[] = Array.from({ length: 4 }, (_, index) => ({
  left: index * 300 + 20,
  top: 20,
  width: 260,
  height: 260,
  pixels: 67_600,
}));

const ICON_CELL: SpriteCellChoice = {
  ...DEFAULT_SPRITE_CELL_CHOICE,
  source: 'TARGET',
  anchor: { x: 'CENTRE', y: 'MIDDLE' },
};

function draw(
  choice: SpriteCellChoice,
  grid: PixelGrid | null = 1,
  onChange: (next: SpriteCellChoice) => void = () => undefined,
  lattice: CellLattice | null = null,
) {
  return render(
    <SpriteCellControls
      choice={choice}
      onChange={onChange}
      target={{ width: 128, height: 128 }}
      grid={grid}
      statedStep={null}
      lattice={lattice}
      boxes={BOXES}
    />,
  );
}

describe('SpriteCellControls, the fit', () => {
  it('is offered only where there is a cell for the artwork to meet', () => {
    draw(DEFAULT_SPRITE_CELL_CHOICE);
    expect(screen.queryByRole('group', { name: 'Sprite fit' })).toBeNull();
  });

  it('opens as drawn, and says the tiles will not fit', () => {
    draw(ICON_CELL);

    expect(screen.getByRole('button', { name: 'As drawn' })).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByText('4 sprites larger than 128 × 128')).toBeInTheDocument();
  });

  it('records the reader’s fit without disturbing the rest of the cut', async () => {
    const user = userEvent.setup({ delay: null });
    const onChange = vi.fn();
    draw(ICON_CELL, 1, onChange);

    await user.click(screen.getByRole('button', { name: 'Fill square' }));

    expect(onChange).toHaveBeenCalledWith({ ...ICON_CELL, fit: 'FILL_SQUARE' });
  });

  it.each([
    ['SCALE_SET', '128 × 128 cell at 43%'],
    ['FILL_SQUARE', '128 × 128 cell, each square filled'],
  ] as const)('states what %s will do in place of the refusal', (chosen, said) => {
    draw({ ...ICON_CELL, fit: chosen });

    expect(screen.getByText(said)).toBeInTheDocument();
    expect(screen.queryByText(/larger than/)).toBeNull();
  });

  it('holds the resizing fits back on a sheet with a pixel scale, and says why', () => {
    draw({ ...ICON_CELL, fit: 'SCALE_SET' }, 4);

    // The stored fit stands for the next painted sheet; this one is placed as drawn, and the pills
    // say so rather than showing a choice the download would not honour.
    expect(screen.getByRole('button', { name: 'As drawn' })).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByRole('button', { name: 'Scale evenly' })).toHaveAttribute('aria-disabled', 'true');
    expect(screen.getByRole('button', { name: 'Fill square' })).toHaveAccessibleDescription(
      SPRITE_FIT_UNAVAILABLE,
    );
  });

  it('can be reached and set from the keyboard', async () => {
    const user = userEvent.setup({ delay: null });
    const onChange = vi.fn();
    draw(ICON_CELL, 1, onChange);
    screen.getByRole('button', { name: 'Bottom' }).focus();

    // From the anchor's last pill, past the fit's guidance, onto its first pill and along to the
    // second: the fit sits after the anchor in the tab order, as it does on screen.
    await user.tab();
    expect(screen.getByRole('button', { name: 'Guidance: Fit' })).toHaveFocus();
    await user.tab();
    await user.tab();
    expect(screen.getByRole('button', { name: 'Scale evenly' })).toHaveFocus();
    await user.keyboard('{Enter}');

    expect(onChange).toHaveBeenCalledWith({ ...ICON_CELL, fit: 'SCALE_SET' });
  });

  it('withholds Keep place off a placement sheet, and says what it is for', () => {
    draw(ICON_CELL);
    const keep = screen.getByRole('button', { name: 'Keep place' });
    expect(keep).toHaveAttribute('aria-disabled', 'true');
    expect(keep).toHaveAccessibleDescription(SPRITE_FIT_IN_PLACE_UNAVAILABLE);
    expect(screen.getByRole('button', { name: 'Scale evenly' })).toHaveAttribute('aria-disabled', 'false');
  });

  it('keeps each piece in place on a placement sheet, withholding every other fit and the anchors', () => {
    // Four 260-pixel tiles on a 300-pixel step: each cell's square is its own tile.
    const cells = BOXES.map((box, index) => {
      const region = { left: index * 300, top: 0, width: 300, height: 300 };
      return {
        index,
        region,
        square: { left: box.left, top: box.top, width: box.width, height: box.height },
      };
    });
    const lattice: CellLattice = { kind: 'CELLS', cells, cellOf: [0, 1, 2, 3], tileSide: 260 };
    draw({ ...ICON_CELL, fit: 'SCALE_SET' }, 1, () => undefined, lattice);

    expect(screen.getByRole('button', { name: 'Keep place' })).toHaveAttribute('aria-pressed', 'true');
    for (const name of ['As drawn', 'Scale evenly', 'Fill square']) {
      expect(screen.getByRole('button', { name })).toHaveAccessibleDescription(SPRITE_FIT_PLACED_ONLY);
    }
    expect(screen.queryByRole('group', { name: 'Anchor across the cell' })).toBeNull();
    // The tile square's scale, which every piece that keeps a place of its own is drawn at.
    expect(screen.getByText('128 × 128 cell, tile square at 49%')).toBeInTheDocument();
  });

  it('states the one scale every piece shares on an isolated look, whose square is the cell', () => {
    const cells = BOXES.map((_box, index) => {
      const region = { left: index * 300, top: 0, width: 300, height: 300 };
      return { index, region, square: region };
    });
    const lattice: CellLattice = { kind: 'CELLS', cells, cellOf: [0, 1, 2, 3], tileSide: null };
    draw({ ...ICON_CELL, fit: 'SCALE_SET' }, 1, () => undefined, lattice);

    expect(screen.getByText('128 × 128 cell, each piece in place at 43%')).toBeInTheDocument();
  });

  it('says where a placement sheet’s cells could not be read', () => {
    const lattice: CellLattice = { kind: 'FAILED', reason: 'no gap', boxes: [0] };
    draw(ICON_CELL, 1, () => undefined, lattice);
    expect(screen.getByText('Cells not found on this sheet')).toBeInTheDocument();
  });
});
