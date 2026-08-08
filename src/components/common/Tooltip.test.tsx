import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Tooltip } from './Tooltip.tsx';

/**
 * The application being migrated bound only mouse events here, which put every piece of field
 * guidance out of reach without a pointer. These tests exist to keep the keyboard path in place.
 */
function renderTooltip() {
  render(<Tooltip text="Controls internal seam and fold complexity." hint="Surface Detail" />);
  return screen.getByRole('button', { name: 'Guidance: Surface Detail' });
}

describe('Tooltip', () => {
  it('is hidden until asked for', () => {
    renderTooltip();
    expect(screen.queryByRole('tooltip')).not.toBeInTheDocument();
  });

  it('reveals the guidance on keyboard focus, not only on hover', async () => {
    const user = userEvent.setup();
    renderTooltip();

    await user.tab();

    expect(screen.getByRole('tooltip')).toHaveTextContent('Controls internal seam and fold complexity.');
  });

  it('describes the trigger while showing, so the guidance is announced with it', async () => {
    const user = userEvent.setup();
    const trigger = renderTooltip();

    await user.hover(trigger);

    expect(trigger).toHaveAttribute('aria-describedby', screen.getByRole('tooltip').id);
    expect(trigger).toHaveAccessibleDescription('Surface Detail Controls internal seam and fold complexity.');
  });

  it('hides again on Escape while the trigger still has focus', async () => {
    const user = userEvent.setup();
    const trigger = renderTooltip();

    await user.tab();
    expect(screen.getByRole('tooltip')).toBeInTheDocument();

    await user.keyboard('{Escape}');

    expect(screen.queryByRole('tooltip')).not.toBeInTheDocument();
    expect(trigger).toHaveFocus();
    expect(trigger).not.toHaveAttribute('aria-describedby');
  });

  it('hides when the pointer leaves', async () => {
    const user = userEvent.setup();
    const trigger = renderTooltip();

    await user.hover(trigger);
    await user.unhover(trigger);

    expect(screen.queryByRole('tooltip')).not.toBeInTheDocument();
  });

  it('floats the card in the top layer rather than inside the panel it belongs to', async () => {
    const user = userEvent.setup();
    const trigger = renderTooltip();

    await user.hover(trigger);

    // Guidance half-covered by the next panel down, or cut off at the edge of the atlas
    // calculator's scrolling panel, is guidance nobody can read — and neither is a `z-index`
    // problem. See `src/hooks/useAnchoredSurface.ts`.
    expect(screen.getByRole('tooltip')).toHaveAttribute('popover', 'manual');
  });
});
