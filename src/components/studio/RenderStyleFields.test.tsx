import { beforeEach, describe, expect, it } from 'vitest';
import { act, render, screen } from '@testing-library/react';
import { DEFAULT_OUTPUT_CONFIG } from '../../constants/output/index.ts';
import { useOutputStore } from '../../stores/useOutputStore.ts';
import { RenderStyleFields } from './RenderStyleFields.tsx';

/**
 * That the colour budget is offered exactly when it decides something.
 *
 * A pinned palette supersedes it everywhere — the compiler drops the budget line and the quantiser
 * maps onto the palette instead — so on a Mega Drive the control was on screen, fully operable, and
 * changing nothing. The three properties below are what withdrawing it has to get right: it goes
 * when the palette takes over, the value it held is not discarded with it, and the rule is still
 * stated somewhere once the control carrying it is gone.
 */
const BUDGET = 'Palette Limit';

/** The budget control, or `null` where the palette has taken the decision off it. */
function budget(): HTMLElement | null {
  return screen.queryByRole('combobox', { name: BUDGET });
}

beforeEach(() => {
  useOutputStore.setState({ output: DEFAULT_OUTPUT_CONFIG });
});

describe('RenderStyleFields', () => {
  it('offers the colour budget while colour is left to it', () => {
    render(<RenderStyleFields />);

    expect(budget()).not.toBeNull();
  });

  it('withdraws the budget the moment a palette supersedes it', () => {
    render(<RenderStyleFields />);

    act(() => {
      useOutputStore.getState().setOutputField('palette', 'MEGA_DRIVE');
    });

    expect(budget()).toBeNull();
    // One control goes, not the group around it. The failure this catches is a conditional written
    // one level too high, which would take the outline and lighting settings with it.
    expect(screen.getByRole('combobox', { name: 'Outline System' })).toBeInTheDocument();
    expect(screen.getByRole('combobox', { name: 'Lighting & Shading Model' })).toBeInTheDocument();
  });

  it('keeps the budget it hid, and gives it back with the FREE palette', () => {
    // Hiding is not discarding. `paletteLimit` is what the sheet falls back to, so a value chosen
    // before a palette was pinned has to survive the pinning rather than reset to the default —
    // which is the objection to hiding a control at all, and the reason it is answered here.
    useOutputStore.setState({
      output: { ...DEFAULT_OUTPUT_CONFIG, paletteLimit: 'STRICT_32_COLOR' },
    });
    render(<RenderStyleFields />);

    act(() => {
      useOutputStore.getState().setOutputField('palette', 'MEGA_DRIVE');
    });
    expect(budget()).toBeNull();
    expect(useOutputStore.getState().output.paletteLimit).toBe('STRICT_32_COLOR');

    act(() => {
      useOutputStore.getState().setOutputField('palette', 'FREE');
    });
    expect(budget()).toHaveValue('STRICT_32_COLOR');
  });

  it('leaves the supersession stated on the control that caused it', () => {
    // What makes the disappearance explicable rather than mysterious: the palette's own accessible
    // description carries the rule, so it is still said once the budget is off screen. A hide with
    // this sentence missing would be a control vanishing for no reason the page gives.
    useOutputStore.setState({
      output: { ...DEFAULT_OUTPUT_CONFIG, palette: 'MEGA_DRIVE' },
    });
    render(<RenderStyleFields />);

    expect(screen.getByRole('combobox', { name: 'Palette' })).toHaveAccessibleDescription(
      /Supersedes the colour budget, in the prompt and in the quantiser\./,
    );
  });
});
