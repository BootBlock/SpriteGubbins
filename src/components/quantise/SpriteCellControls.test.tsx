import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { DEFAULT_SPRITE_CELL_CHOICE } from '../../constants/spriteCell.ts';
import type { TargetSize } from '../../types/output.ts';
import type { SpriteBox } from '../../types/quantiser.ts';
import type { SpriteCellChoice } from '../../types/spriteCell.ts';
import { SpriteCellControls } from './SpriteCellControls.tsx';

/**
 * Which controls the reader is offered, and what the chip beside them says.
 *
 * Every one of them is conditional, and each condition is a claim: a source that states no size
 * offers no boxes, a cut that is not a cell has no anchor to state, and a studio that names no
 * component size cannot offer one. A control on screen that changed nothing would be a lie, and
 * these are the four ways this panel could tell one.
 */

const BOXES: readonly SpriteBox[] = [
  { left: 0, top: 0, width: 8, height: 6, pixels: 30 },
  { left: 20, top: 0, width: 12, height: 12, pixels: 90 },
];

const TARGET: TargetSize = { width: 16, height: 16 };

function draw(
  choice: SpriteCellChoice = DEFAULT_SPRITE_CELL_CHOICE,
  target: TargetSize | null = null,
  onChange: (next: SpriteCellChoice) => void = () => undefined,
) {
  return render(<SpriteCellControls choice={choice} onChange={onChange} target={target} boxes={BOXES} />);
}

const cut = () => screen.getByRole('group', { name: 'Sprite cut' });

describe('SpriteCellControls', () => {
  it('opens on the bounding box, with nothing a cell would need on screen', () => {
    draw();

    expect(screen.getByRole('button', { name: 'Bounding box' })).toHaveAttribute('aria-pressed', 'true');
    expect(screen.queryByRole('group', { name: 'Anchor across the cell' })).toBeNull();
    expect(screen.queryByLabelText('Cell width')).toBeNull();
  });

  it('withholds the studio’s own size where the studio states none', () => {
    draw();

    expect(screen.queryByRole('button', { name: 'Studio target' })).toBeNull();
  });

  it('offers the studio’s own size where it states one', () => {
    draw(DEFAULT_SPRITE_CELL_CHOICE, TARGET);

    expect(screen.getByRole('button', { name: 'Studio target' })).toBeInTheDocument();
  });

  it('shows the two size boxes only under the source that has a size to type', () => {
    draw({ ...DEFAULT_SPRITE_CELL_CHOICE, source: 'TARGET' }, TARGET);
    expect(screen.queryByLabelText('Cell width')).toBeNull();

    // The studio's own size is the cell, so there is nothing for a reader to state here.
    expect(screen.getByText('16 × 16 cell')).toBeInTheDocument();
  });

  it('states the anchor once a cell is in force, and reports the cell it settled on', () => {
    draw({ ...DEFAULT_SPRITE_CELL_CHOICE, source: 'FIXED', fixed: { width: 16, height: 16 } });

    expect(screen.getByRole('group', { name: 'Anchor across the cell' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Bottom' })).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByText('16 × 16 cell')).toBeInTheDocument();
  });

  it('says which pieces will not fit, before the press rather than after it', () => {
    // The download refuses such a sheet rather than squeezing it, and the reader is told beside the
    // setting they would change.
    draw({ ...DEFAULT_SPRITE_CELL_CHOICE, source: 'FIXED', fixed: { width: 10, height: 10 } });

    expect(screen.getByText('1 sprite larger than 10 × 10')).toBeInTheDocument();
  });

  it('counts them where more than one is over', () => {
    draw({ ...DEFAULT_SPRITE_CELL_CHOICE, source: 'FIXED', fixed: { width: 4, height: 4 } });

    expect(screen.getByText('2 sprites larger than 4 × 4')).toBeInTheDocument();
  });

  it('keeps the typed size while the reader looks at another source and back', async () => {
    // Stepping through the pills to see what the studio states must not empty the boxes.
    const onChange = vi.fn();
    const typed: SpriteCellChoice = {
      ...DEFAULT_SPRITE_CELL_CHOICE,
      source: 'FIXED',
      fixed: { width: 24, height: 32 },
    };
    draw(typed, TARGET, onChange);

    await userEvent.click(screen.getByRole('button', { name: 'Studio target' }));

    expect(onChange).toHaveBeenCalledWith({ ...typed, source: 'TARGET' });
  });

  it('moves one axis of the anchor without disturbing the other', async () => {
    const onChange = vi.fn();
    const chosen: SpriteCellChoice = { ...DEFAULT_SPRITE_CELL_CHOICE, source: 'TARGET' };
    draw(chosen, TARGET, onChange);

    await userEvent.click(screen.getByRole('button', { name: 'Left' }));

    expect(onChange).toHaveBeenCalledWith({ ...chosen, anchor: { x: 'LEFT', y: 'BOTTOM' } });
  });

  it('falls back to the bounding box where the held source is no longer offered', () => {
    // A reader can choose the studio's size and then go and clear it. Showing that choice pressed is
    // impossible — the pill is gone — and showing nothing pressed leaves a row with no current
    // value beside a cut that has silently reverted. What the pills show is what the download does.
    draw({ ...DEFAULT_SPRITE_CELL_CHOICE, source: 'TARGET' }, null);

    expect(screen.getByRole('button', { name: 'Bounding box' })).toHaveAttribute('aria-pressed', 'true');
    expect(screen.queryByRole('group', { name: 'Anchor across the cell' })).toBeNull();
  });

  it('withholds the studio’s size where the studio states one larger than a cell may be', () => {
    // The studio's field is free prose, so its size is whatever a reader typed — and a 2048 cell on
    // a fifteen-sprite sheet asks the writer for fifteen sixteen-megabyte canvases.
    draw(DEFAULT_SPRITE_CELL_CHOICE, { width: 2048, height: 2048 });

    expect(screen.queryByRole('button', { name: 'Studio target' })).toBeNull();
  });

  it('keeps the notice’s live region in the document before there is anything to announce', () => {
    // A region inserted in the same commit as its text is not reliably announced, and the first
    // press of Fixed is exactly that commit — so the region is always here and only its contents
    // are conditional, as `PromptBudgetNotice` says at its own call site.
    const { container } = draw();

    expect(container.querySelector('[aria-live="polite"]')).not.toBeNull();
  });

  it('names the group the pills belong to, so a reader hears what is at Centre', () => {
    draw({ ...DEFAULT_SPRITE_CELL_CHOICE, source: 'TARGET' }, TARGET);

    expect(cut()).toBeInTheDocument();
    expect(screen.getByRole('group', { name: 'Anchor down the cell' })).toBeInTheDocument();
  });
});
