import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { RangeField } from './RangeField.tsx';

/**
 * A slider over a continuous range, with its value read out beside it.
 *
 * The readout is part of the control. A slider alone answers "roughly where", and every dial it drives
 * feeds an exact figure into a transform — and the figure means different things on different dials,
 * so `format` decides it and the same words reach a screen reader as the value text. The change handler
 * turns the DOM's string back into a number, which is the one conversion between the control and the
 * pipeline.
 */
function renderRange(value: number, disabledReason = '') {
  const onChange = vi.fn();
  render(
    <RangeField
      label="Line strength"
      tooltip="How strongly the outline is darkened."
      value={value}
      min={0}
      max={2}
      step={0.25}
      format={(position) => (position === 0 ? 'off' : `${String(position)}×`)}
      disabledReason={disabledReason}
      onChange={onChange}
    />,
  );
  return { onChange, slider: screen.getByRole('slider', { name: 'Line strength' }) };
}

describe('RangeField', () => {
  it('reads its value out in the caller’s words, on screen and to a screen reader alike', () => {
    const { slider } = renderRange(0);

    // `0` on this dial means off, and a screen reader announcing "0" would say something else.
    expect(slider).toHaveAttribute('aria-valuetext', 'off');
    expect(screen.getByText('off')).toBeInTheDocument();
  });

  it('carries the range and the step the caller states', () => {
    const { slider } = renderRange(1.5);

    expect(slider).toHaveValue('1.5');
    expect(slider).toHaveAttribute('min', '0');
    expect(slider).toHaveAttribute('max', '2');
    expect(slider).toHaveAttribute('step', '0.25');
    expect(slider).toHaveAttribute('aria-valuetext', '1.5×');
  });

  it('hands the caller a number rather than the DOM’s string', () => {
    const { onChange, slider } = renderRange(1.5);

    fireEvent.change(slider, { target: { value: '0.75' } });

    expect(onChange).toHaveBeenCalledWith(0.75);
  });

  it('names why a dial reaches nothing, and refuses a move while it does', () => {
    const reason = 'Off while the studio pins a palette.';
    const { onChange, slider } = renderRange(1.5, reason);

    // `aria-disabled` rather than `disabled`, so a keyboard user still reaches the slider and hears
    // the reason read from its description.
    expect(slider).toHaveAttribute('aria-disabled', 'true');
    expect(slider).toHaveAccessibleDescription(reason);

    fireEvent.change(slider, { target: { value: '0.75' } });

    expect(onChange).not.toHaveBeenCalled();
  });

  it('describes a live dial with nothing at all', () => {
    const { slider } = renderRange(1.5, '');

    expect(slider).toHaveAttribute('aria-disabled', 'false');
    expect(slider).not.toHaveAttribute('aria-describedby');
  });
});
