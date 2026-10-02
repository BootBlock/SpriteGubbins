import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { DEFAULT_SPRITE_CELL_CHOICE, SPRITE_FIT_UNAVAILABLE } from '../../constants/spriteCell.ts';
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
) {
  return render(
    <SpriteCellControls
      choice={choice}
      onChange={onChange}
      target={{ width: 128, height: 128 }}
      grid={grid}
      boxes={BOXES}
    />,
  );
}

const fit = () => screen.getByRole('group', { name: 'Sprite fit' });

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

    expect(fit()).toBeInTheDocument();
    expect(onChange).toHaveBeenCalledWith({ ...ICON_CELL, fit: 'SCALE_SET' });
  });
});
