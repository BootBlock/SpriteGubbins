import { describe, expect, it, vi } from 'vitest';
import { act, fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Tooltip } from './Tooltip.tsx';

/**
 * The application being migrated bound only mouse events here, which put every piece of field
 * guidance out of reach without a pointer. These tests exist to keep the keyboard path in place —
 * and, since WCAG 1.4.13 governs anything revealed on hover or focus, to hold the component to all
 * three of its requirements: dismissible from anywhere, hoverable, and on no timer.
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

  it('answers a hover at once, with none of the grace period a wrapped control gets', async () => {
    // A frozen clock and a synchronous `fireEvent`, so that "at once" is asserted rather than
    // merely observed before a real timer got round to firing — the same arrangement
    // `ControlTooltip.test.tsx` explains at length.
    vi.useFakeTimers();
    try {
      const trigger = renderTooltip();

      fireEvent.mouseEnter(trigger.parentElement as HTMLElement);

      // `ControlTooltip` makes a hover wait, because a pointer crosses controls on its way
      // elsewhere. The ⓘ has no such journey to protect — it exists only to reveal this card, so
      // pointing at one is always the request itself — and a delay here would put a wait in front of
      // the affordance whose entire purpose is to answer. The assertion sits before any advance, so
      // giving this trigger a delay fails rather than merely slowing it down.
      expect(screen.getByRole('tooltip')).toBeInTheDocument();
    } finally {
      vi.useRealTimers();
    }
  });

  it('hides when the pointer leaves', async () => {
    const user = userEvent.setup();
    const trigger = renderTooltip();

    await user.hover(trigger);
    await user.unhover(trigger);

    expect(screen.queryByRole('tooltip')).not.toBeInTheDocument();
  });

  it('dismisses on Escape from anywhere, not only while the trigger is focused', async () => {
    const user = userEvent.setup();
    render(
      <>
        <button type="button">Somewhere else</button>
        <Tooltip text="Controls internal seam and fold complexity." hint="Surface Detail" />
      </>,
    );
    const elsewhere = screen.getByRole('button', { name: 'Somewhere else' });

    await user.hover(screen.getByRole('button', { name: 'Guidance: Surface Detail' }));
    elsewhere.focus();
    expect(screen.getByRole('tooltip')).toBeInTheDocument();

    await user.keyboard('{Escape}');

    // WCAG 1.4.13 *Dismissible*: without moving the pointer or the focus. A user who reached the
    // card by hovering has never focused the ⓘ, so a handler bound to the trigger's own `keydown`
    // is the one thing that could not have helped them — which is what this replaced.
    expect(screen.queryByRole('tooltip')).not.toBeInTheDocument();
    expect(elsewhere).toHaveFocus();
  });

  it('does not close when the pointer leaves the trigger for the card inside the same wrapper', async () => {
    const user = userEvent.setup();
    const trigger = renderTooltip();
    await user.hover(trigger);
    const card = screen.getByRole('tooltip');

    // WCAG 1.4.13 *Hoverable*, as far as this environment can state it. The real question — does
    // travelling from the ⓘ to the card keep it up — is a hit-testing one, and happy-dom performs no
    // layout, so it is settled in a browser instead (see the change that introduced this).
    //
    // What *is* checkable here is the structural reason it works: the pointer handlers are on the
    // wrapper that contains both, so a departure from the button is not a departure from the
    // tooltip. Bound to the button, as they were, this leave closed the card the moment the user set
    // off towards it.
    fireEvent.mouseLeave(trigger, { relatedTarget: card });

    expect(screen.getByRole('tooltip')).toBeInTheDocument();
    expect(card.parentElement).toBe(trigger.parentElement);
  });

  it('lets the guidance be reached by the pointer at all', async () => {
    const user = userEvent.setup();
    const trigger = renderTooltip();
    await user.hover(trigger);

    // The other half of *Hoverable*: a card that takes no pointer events cannot be hovered however
    // the hover is tracked, and its text cannot be selected or copied either.
    expect(screen.getByRole('tooltip')).not.toHaveClass('pointer-events-none');
  });

  it('keeps the guidance when the pointer leaves but the trigger still has focus', async () => {
    const user = userEvent.setup();
    const trigger = renderTooltip();

    await user.tab();
    await user.hover(trigger);
    await user.unhover(trigger);

    // 1.4.13 *Persistent* holds the content until the hover **or focus** trigger is removed. One
    // boolean for both made either departure close it, so a keyboard user who happened to brush the
    // ⓘ with the mouse lost the guidance they had tabbed to.
    expect(screen.getByRole('tooltip')).toBeInTheDocument();
    expect(trigger).toHaveFocus();
  });

  it('keeps the guidance when focus leaves but the pointer is still on it', async () => {
    const user = userEvent.setup();
    const trigger = renderTooltip();

    await user.tab();
    await user.hover(trigger);
    trigger.blur();

    // The mirror image, and the worse of the two: no fresh `mouseenter` fires for an element the
    // pointer never left, so a card closed this way could not be recovered by hovering — the user
    // had to move off the ⓘ and come back.
    expect(screen.getByRole('tooltip')).toBeInTheDocument();
  });

  it('stands aside when a press lands on the card, so the field underneath stays clickable', async () => {
    const user = userEvent.setup();
    const trigger = renderTooltip();
    await user.hover(trigger);

    fireEvent.pointerDown(screen.getByRole('tooltip'), { pointerType: 'mouse', isPrimary: true });

    // The card opens over the control it explains. Hovering has to keep it up — 1.4.13 — so the
    // press is the only signal left that the user is reaching past it, and honouring that is what
    // stops every field in the app needing a detour round the guidance to be clicked.
    expect(screen.queryByRole('tooltip')).not.toBeInTheDocument();
  });

  it('comes back after a dismissal, once the pointer arrives again', async () => {
    const user = userEvent.setup();
    const trigger = renderTooltip();

    await user.hover(trigger);
    await user.keyboard('{Escape}');
    expect(screen.queryByRole('tooltip')).not.toBeInTheDocument();

    await user.unhover(trigger);
    await user.hover(trigger);

    // Escape latches, so it has to be un-latched by something: without this the ⓘ is spent for the
    // rest of the page's life, which is a worse bug than the one dismissing fixed.
    expect(screen.getByRole('tooltip')).toBeInTheDocument();
  });

  it('stays until it is dismissed, rather than timing out', async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    try {
      const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
      const trigger = renderTooltip();
      await user.hover(trigger);

      await act(async () => {
        await vi.advanceTimersByTimeAsync(60_000);
      });

      // WCAG 1.4.13 *Persistent*. Guidance that expires while it is being read is guidance the
      // slowest reader never gets to the end of.
      expect(screen.getByRole('tooltip')).toBeInTheDocument();
    } finally {
      vi.useRealTimers();
    }
  });

  it('opens on a tap and closes on the next one, which is a touch user only way in', async () => {
    const trigger = renderTooltip();

    // A touchscreen synthesises `mouseenter` on the tapped element and holds it there, so without
    // this a finger gets a card it cannot deliberately close and a second tap does nothing at all.
    fireEvent.pointerDown(trigger, { pointerType: 'touch', isPrimary: true });
    expect(screen.getByRole('tooltip')).toBeInTheDocument();

    fireEvent.pointerDown(trigger, { pointerType: 'touch', isPrimary: true });
    expect(screen.queryByRole('tooltip')).not.toBeInTheDocument();
  });

  it('leaves a mouse press alone, which the hover has already answered', async () => {
    const user = userEvent.setup();
    const trigger = renderTooltip();

    await user.hover(trigger);
    fireEvent.pointerDown(trigger, { pointerType: 'mouse', isPrimary: true, button: 0 });

    // Toggling on any press would read as "clicking the ⓘ closes it": the synthesised hover has
    // already opened the card by the time the press arrives.
    expect(screen.getByRole('tooltip')).toBeInTheDocument();
  });

  it('dismisses when a tap lands somewhere else', async () => {
    render(
      <>
        <button type="button">Somewhere else</button>
        <Tooltip text="Controls internal seam and fold complexity." hint="Surface Detail" />
      </>,
    );
    const trigger = screen.getByRole('button', { name: 'Guidance: Surface Detail' });

    fireEvent.pointerDown(trigger, { pointerType: 'touch', isPrimary: true });
    expect(screen.getByRole('tooltip')).toBeInTheDocument();

    // The only way a touchscreen can say "I am done with this": there is no pointer to move away.
    fireEvent.pointerDown(screen.getByRole('button', { name: 'Somewhere else' }), {
      pointerType: 'touch',
      isPrimary: true,
    });

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
