import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { TOOLTIP_HOVER_DELAY_MS } from '../../constants/ui.ts';
import { ControlTooltip } from './ControlTooltip.tsx';

const GUIDANCE = 'Puts the finished prompt on the clipboard and records it in the history.';

/**
 * The ⓘ's tests hold {@link Tooltip} to WCAG 1.4.13, and the two components now share the state
 * machine that answers it — so these cover what is *different* about hanging the card off the
 * control: that the control itself is the trigger, that it keeps its own job, that the guidance gets
 * out of the way the moment it is used, and that pointing at a control is told apart from crossing
 * one on the way to another.
 *
 * **The suite runs on fake timers, and the pointer is driven with `fireEvent`.** Both follow from
 * the hover now being on a clock: a test that hovered and asserted against a real 350ms would be
 * racing it, and the assertions that matter here are about *when* the card is not there yet.
 * `fireEvent` is synchronous, so the clock only moves when a test moves it — which is what makes
 * the boundary below exact rather than approximate. The three tests that need a real keyboard or a
 * real click say so and take {@link setupUser}, which trades that precision for `userEvent`'s
 * fidelity; none of them asserts on a boundary.
 */
function renderControl() {
  render(
    <ControlTooltip hint="Copy Prompt" text={GUIDANCE}>
      <button type="button">Copy Prompt</button>
    </ControlTooltip>,
  );
  const control = screen.getByRole('button', { name: 'Copy Prompt' });
  // The wrapper is where the pointer handlers live — deliberately, so travelling from the control
  // onto the card is not a departure from either (WCAG 1.4.13 *hoverable*).
  return { control, wrapper: control.parentElement as HTMLElement };
}

/** The pointer resting long enough that the guidance is asked for rather than merely crossed. */
async function waitOutGracePeriod() {
  await act(async () => {
    await vi.advanceTimersByTimeAsync(TOOLTIP_HOVER_DELAY_MS);
  });
}

/**
 * `userEvent` on a clock that keeps moving, for the tests that need a genuine tab, keypress or
 * click. Its internal awaits are scheduled on the same faked `setTimeout` the hook uses, so a clock
 * frozen until a test advances it would hang them — `shouldAdvanceTime` lets real time carry it.
 * The cost is that the clock is no longer exactly the test's to control, which is why no boundary
 * assertion is made under it.
 */
function setupUser() {
  vi.useFakeTimers({ shouldAdvanceTime: true });
  return userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
}

describe('ControlTooltip', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('is hidden until the control is reached', () => {
    renderControl();
    expect(screen.queryByRole('tooltip')).not.toBeInTheDocument();
  });

  it('says nothing while the pointer is merely crossing the control', async () => {
    const { wrapper } = renderControl();

    fireEvent.mouseEnter(wrapper);

    // The reported defect. A toolbar is a row of controls and the one being reached for is usually
    // the far side of two others, so revealing on contact answered a journey with a paragraph —
    // which then sat over the control the pointer was actually travelling to.
    expect(screen.queryByRole('tooltip')).not.toBeInTheDocument();

    await act(async () => {
      await vi.advanceTimersByTimeAsync(TOOLTIP_HOVER_DELAY_MS - 1);
    });
    // A millisecond before the grace period is up: still nothing, which is what pins the wait to
    // the constant rather than to "some delay".
    expect(screen.queryByRole('tooltip')).not.toBeInTheDocument();

    await act(async () => {
      await vi.advanceTimersByTimeAsync(1);
    });
    expect(screen.getByRole('tooltip')).toHaveTextContent(GUIDANCE);
  });

  it('reveals the guidance on the control itself, with no ⓘ to find', async () => {
    const { wrapper } = renderControl();

    // The whole point of this component: there is exactly one thing on screen, and resting on it is
    // what asks for the explanation. A second glyph beside every button is what it exists to avoid.
    fireEvent.mouseEnter(wrapper);
    await waitOutGracePeriod();

    expect(screen.getByRole('tooltip')).toHaveTextContent(GUIDANCE);
    expect(screen.queryByRole('button', { name: /^Guidance:/ })).not.toBeInTheDocument();
  });

  it('never shows a card the pointer has already left', async () => {
    const { wrapper } = renderControl();

    fireEvent.mouseEnter(wrapper);
    fireEvent.mouseLeave(wrapper);
    await waitOutGracePeriod();

    // A wait that outlives the hover that started it is worse than no wait at all: the card arrives
    // on a control the pointer left a third of a second ago, with nothing on screen explaining why.
    expect(screen.queryByRole('tooltip')).not.toBeInTheDocument();
  });

  it('does not arrive late over a control pressed during the wait', async () => {
    const { control, wrapper } = renderControl();

    fireEvent.mouseEnter(wrapper);
    fireEvent.pointerDown(control, { pointerType: 'mouse', isPrimary: true, button: 0 });
    await waitOutGracePeriod();

    // The failure a grace period introduces if the press does not call the wait off: the user
    // reaches the control and clicks inside 350ms — the ordinary speed of using a toolbar — and the
    // guidance opens *afterwards*, over a button already pressed, which is exactly the state the
    // press-dismisses rule exists to prevent. The dismissal has to outlast the timer, not race it.
    expect(screen.queryByRole('tooltip')).not.toBeInTheDocument();
  });

  it('restarts the wait rather than running two when the pointer returns mid-wait', async () => {
    const { wrapper } = renderControl();

    fireEvent.mouseEnter(wrapper);
    await act(async () => {
      await vi.advanceTimersByTimeAsync(TOOLTIP_HOVER_DELAY_MS - 50);
    });
    fireEvent.mouseLeave(wrapper);
    fireEvent.mouseEnter(wrapper);

    // The second arrival buys the full grace period again; the first one's remaining 50ms is gone
    // with the hover that started it.
    await act(async () => {
      await vi.advanceTimersByTimeAsync(50);
    });
    expect(screen.queryByRole('tooltip')).not.toBeInTheDocument();

    await waitOutGracePeriod();
    expect(screen.getByRole('tooltip')).toBeInTheDocument();
  });

  it('stands aside once the control has been pressed', async () => {
    const { control, wrapper } = renderControl();
    fireEvent.mouseEnter(wrapper);
    await waitOutGracePeriod();
    expect(screen.getByRole('tooltip')).toBeInTheDocument();

    fireEvent.pointerDown(control, { pointerType: 'mouse', isPrimary: true, button: 0 });

    // The ⓘ toggles on a press because it has no other job; this control is the thing the press was
    // meant for, so the guidance stops describing a button that has already been used.
    expect(screen.queryByRole('tooltip')).not.toBeInTheDocument();
  });

  it('comes back on a fresh hover after a press, rather than being spent', async () => {
    const { control, wrapper } = renderControl();

    fireEvent.mouseEnter(wrapper);
    await waitOutGracePeriod();
    fireEvent.pointerDown(control, { pointerType: 'mouse', isPrimary: true, button: 0 });
    expect(screen.queryByRole('tooltip')).not.toBeInTheDocument();

    fireEvent.mouseLeave(wrapper);
    fireEvent.mouseEnter(wrapper);
    await waitOutGracePeriod();

    // The dismissal is a latch. Without something to clear it, one press would silence a control's
    // guidance for the rest of the page's life.
    expect(screen.getByRole('tooltip')).toBeInTheDocument();
  });

  it('describes the control while showing, so a screen reader announces it with the name', async () => {
    const { control, wrapper } = renderControl();

    fireEvent.mouseEnter(wrapper);
    await waitOutGracePeriod();

    // A hover-triggered card is one a screen-reader user can never trigger, so the description is
    // the whole of what they get. It arrives with the card and leaves with it.
    expect(control).toHaveAttribute('aria-describedby', screen.getByRole('tooltip').id);
    expect(control).toHaveAccessibleDescription(`Copy Prompt ${GUIDANCE}`);

    fireEvent.mouseLeave(wrapper);
    expect(control).not.toHaveAttribute('aria-describedby');
  });

  it('keeps the card inside the wrapper the hover is tracked on', async () => {
    const { control, wrapper } = renderControl();
    fireEvent.mouseEnter(wrapper);
    await waitOutGracePeriod();

    // WCAG 1.4.13 *Hoverable*, as far as this environment can state it — happy-dom performs no
    // layout, so the real question is settled in a browser. What is checkable is the structural
    // reason it works: the card and the control share the element the pointer handlers sit on, so
    // travelling from one to the other is not a departure from either.
    const card = screen.getByRole('tooltip');
    expect(card.parentElement).toBe(control.parentElement);
    expect(card).not.toHaveClass('pointer-events-none');
  });

  it('floats the card in the top layer rather than inside the panel it belongs to', async () => {
    const { wrapper } = renderControl();

    fireEvent.mouseEnter(wrapper);
    await waitOutGracePeriod();

    // Guidance half-covered by the next panel down is guidance nobody can read, and that is not a
    // `z-index` problem. See `src/hooks/useAnchoredSurface.ts`.
    expect(screen.getByRole('tooltip')).toHaveAttribute('popover', 'manual');
  });

  it('stays until it is dismissed, rather than timing out', async () => {
    const { wrapper } = renderControl();
    fireEvent.mouseEnter(wrapper);
    await waitOutGracePeriod();

    await act(async () => {
      await vi.advanceTimersByTimeAsync(60_000);
    });

    // WCAG 1.4.13 *Persistent*. Guidance that expires while it is being read is guidance the
    // slowest reader never gets to the end of — and the delay above is a wait *before* the card,
    // never a life span for it.
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

  it('reveals it on keyboard focus at once, since tabbing is an arrival rather than a traverse', async () => {
    const user = setupUser();
    renderControl();

    await user.tab();

    // No grace period on this route, and the assertion sits before any advance to prove it: a
    // keyboard cannot pass *over* a control on its way to another, so there is no journey to
    // protect — and a wait here would only slow the one route a keyboard user has.
    expect(screen.getByRole('tooltip')).toHaveTextContent(GUIDANCE);
  });

  it("leaves the control's own press alone", async () => {
    const onClick = vi.fn();
    const user = setupUser();
    render(
      <ControlTooltip hint="Copy Prompt" text={GUIDANCE}>
        <button type="button" onClick={onClick}>
          Copy Prompt
        </button>
      </ControlTooltip>,
    );

    await user.click(screen.getByRole('button', { name: 'Copy Prompt' }));

    // The wrapper takes hover, focus and the press — none of which may swallow the click the
    // control is there for.
    expect(onClick).toHaveBeenCalledTimes(1);
  });

  it('dismisses on Escape from anywhere, not only while the control is focused', async () => {
    const user = setupUser();
    render(
      <>
        <button type="button">Somewhere else</button>
        <ControlTooltip hint="Copy Prompt" text={GUIDANCE}>
          <button type="button">Copy Prompt</button>
        </ControlTooltip>
      </>,
    );
    const elsewhere = screen.getByRole('button', { name: 'Somewhere else' });
    const wrapper = screen.getByRole('button', { name: 'Copy Prompt' }).parentElement as HTMLElement;

    fireEvent.mouseEnter(wrapper);
    await waitOutGracePeriod();
    elsewhere.focus();
    expect(screen.getByRole('tooltip')).toBeInTheDocument();

    await user.keyboard('{Escape}');

    expect(screen.queryByRole('tooltip')).not.toBeInTheDocument();
    expect(elsewhere).toHaveFocus();
  });
});
