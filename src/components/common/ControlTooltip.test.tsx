import { describe, expect, it, vi } from 'vitest';
import { act, fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ControlTooltip } from './ControlTooltip.tsx';

const GUIDANCE = 'Puts the finished prompt on the clipboard and records it in the history.';

/**
 * The ⓘ's tests hold {@link Tooltip} to WCAG 1.4.13, and the two components now share the state
 * machine that answers it — so these cover what is *different* about hanging the card off the
 * control: that the control itself is the trigger, that it keeps its own job, and that the guidance
 * gets out of the way the moment it is used.
 */
function renderControl() {
  render(
    <ControlTooltip hint="Copy Prompt" text={GUIDANCE}>
      <button type="button">Copy Prompt</button>
    </ControlTooltip>,
  );
  return screen.getByRole('button', { name: 'Copy Prompt' });
}

describe('ControlTooltip', () => {
  it('is hidden until the control is reached', () => {
    renderControl();
    expect(screen.queryByRole('tooltip')).not.toBeInTheDocument();
  });

  it('reveals the guidance on hovering the control itself, with no ⓘ to find', async () => {
    const user = userEvent.setup();
    const control = renderControl();

    // The whole point of this component: there is exactly one thing on screen, and pointing at it is
    // what asks for the explanation. A second glyph beside every button is what it exists to avoid.
    await user.hover(control);

    expect(screen.getByRole('tooltip')).toHaveTextContent(GUIDANCE);
    expect(screen.queryByRole('button', { name: /^Guidance:/ })).not.toBeInTheDocument();
  });

  it('reveals it on keyboard focus, which is the only way in without a pointer', async () => {
    const user = userEvent.setup();
    renderControl();

    await user.tab();

    expect(screen.getByRole('tooltip')).toHaveTextContent(GUIDANCE);
  });

  it('describes the control while showing, so a screen reader announces it with the name', async () => {
    const user = userEvent.setup();
    const control = renderControl();

    await user.hover(control);

    // A hover-triggered card is one a screen-reader user can never trigger, so the description is
    // the whole of what they get. It arrives with the card and leaves with it.
    expect(control).toHaveAttribute('aria-describedby', screen.getByRole('tooltip').id);
    expect(control).toHaveAccessibleDescription(`Copy Prompt ${GUIDANCE}`);

    await user.unhover(control);
    expect(control).not.toHaveAttribute('aria-describedby');
  });

  it("leaves the control's own press alone", async () => {
    const onClick = vi.fn();
    const user = userEvent.setup();
    render(
      <ControlTooltip hint="Copy Prompt" text={GUIDANCE}>
        <button type="button" onClick={onClick}>
          Copy Prompt
        </button>
      </ControlTooltip>,
    );

    await user.click(screen.getByRole('button', { name: 'Copy Prompt' }));

    // The wrapper takes hover, focus and `input` — none of which may swallow the click the control
    // is there for.
    expect(onClick).toHaveBeenCalledTimes(1);
  });

  it('stands aside once the control has been pressed', async () => {
    const user = userEvent.setup();
    const control = renderControl();
    await user.hover(control);
    expect(screen.getByRole('tooltip')).toBeInTheDocument();

    fireEvent.pointerDown(control, { pointerType: 'mouse', isPrimary: true, button: 0 });

    // The ⓘ toggles on a press because it has no other job; this control is the thing the press was
    // meant for, so the guidance stops describing a button that has already been used.
    expect(screen.queryByRole('tooltip')).not.toBeInTheDocument();
  });

  it('comes back on a fresh hover after a press, rather than being spent', async () => {
    const user = userEvent.setup();
    const control = renderControl();

    await user.hover(control);
    fireEvent.pointerDown(control, { pointerType: 'mouse', isPrimary: true, button: 0 });
    expect(screen.queryByRole('tooltip')).not.toBeInTheDocument();

    await user.unhover(control);
    await user.hover(control);

    // The dismissal is a latch. Without something to clear it, one press would silence a control's
    // guidance for the rest of the page's life.
    expect(screen.getByRole('tooltip')).toBeInTheDocument();
  });

  it('hands a disabled control back the pointer events its guidance now depends on', () => {
    render(
      <ControlTooltip hint="Download PNG" text={GUIDANCE}>
        <button type="button" disabled>
          Download PNG
        </button>
      </ControlTooltip>,
    );

    // A disabled control dispatches no pointer events and does not pass them to an ancestor, so the
    // wrapper — which is where the hover is tracked — would never hear one. Two of the wrapped
    // controls explain the very condition that disables them, so this is the difference between
    // guidance a user can read when they need it and guidance only reachable once it is moot.
    expect(screen.getByRole('button', { name: 'Download PNG' }).parentElement).toHaveClass(
      '[&>*:disabled]:pointer-events-none',
    );
  });

  it('dismisses on Escape from anywhere, not only while the control is focused', async () => {
    const user = userEvent.setup();
    render(
      <>
        <button type="button">Somewhere else</button>
        <ControlTooltip hint="Copy Prompt" text={GUIDANCE}>
          <button type="button">Copy Prompt</button>
        </ControlTooltip>
      </>,
    );
    const elsewhere = screen.getByRole('button', { name: 'Somewhere else' });

    await user.hover(screen.getByRole('button', { name: 'Copy Prompt' }));
    elsewhere.focus();
    expect(screen.getByRole('tooltip')).toBeInTheDocument();

    await user.keyboard('{Escape}');

    expect(screen.queryByRole('tooltip')).not.toBeInTheDocument();
    expect(elsewhere).toHaveFocus();
  });

  it('keeps the card inside the wrapper the hover is tracked on', async () => {
    const user = userEvent.setup();
    const control = renderControl();
    await user.hover(control);

    // WCAG 1.4.13 *Hoverable*, as far as this environment can state it — happy-dom performs no
    // layout, so the real question is settled in a browser. What is checkable is the structural
    // reason it works: the card and the control share the element the pointer handlers sit on, so
    // travelling from one to the other is not a departure from either.
    const card = screen.getByRole('tooltip');
    expect(card.parentElement).toBe(control.parentElement);
    expect(card).not.toHaveClass('pointer-events-none');
  });

  it('floats the card in the top layer rather than inside the panel it belongs to', async () => {
    const user = userEvent.setup();
    const control = renderControl();

    await user.hover(control);

    // Guidance half-covered by the next panel down is guidance nobody can read, and that is not a
    // `z-index` problem. See `src/hooks/useAnchoredSurface.ts`.
    expect(screen.getByRole('tooltip')).toHaveAttribute('popover', 'manual');
  });

  it('stays until it is dismissed, rather than timing out', async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    try {
      const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
      const control = renderControl();
      await user.hover(control);

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
});
