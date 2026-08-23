import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { NumberField } from './NumberField.tsx';

/**
 * What the field refuses to commit, which is the whole of what it does beyond rendering a box.
 *
 * A `type="number"` input hands over whatever was typed and reports the rest through validity
 * flags nothing here reads — so every rule the field states in its props has to be a check in its
 * handler. The step is the one that was a hint rather than a check: a field declaring whole
 * numbers committed a typed `20.5`, and the one call site that had noticed carried its own
 * `Number.isInteger` guard while the others did not.
 */
function draw(onChange: (value: number) => void, step = 1) {
  render(
    <NumberField
      label="Cell width"
      tooltip="How wide each cell is, in drawn pixels."
      value={8}
      min={1}
      max={512}
      step={step}
      disabledReason=""
      onChange={onChange}
    />,
  );
  return screen.getByRole('spinbutton', { name: 'Cell width' });
}

/**
 * One complete entry, as a paste or a spinner produces it.
 *
 * Typed character by character instead, the field is unreachable: it is controlled, so a `clear`
 * the handler refuses leaves the old figure bound and the next keystroke appends to it — `9` typed
 * over `8` arrives as `89`, and every assertion below would be about a number nobody entered.
 */
function enter(field: HTMLElement, value: string): void {
  fireEvent.change(field, { target: { value } });
}

describe('NumberField', () => {
  it('commits a value on the step grid', () => {
    const onChange = vi.fn();
    enter(draw(onChange), '24');

    expect(onChange).toHaveBeenCalledWith(24);
  });

  it('refuses a value off the step grid rather than rounding it', () => {
    // A cell side of 20.5 reaches `createImage`, which allocates from the unrounded figure and
    // hands it to an `ImageData` that truncates — so the download fails with a platform error
    // naming nothing the reader touched.
    const onChange = vi.fn();
    enter(draw(onChange), '20.5');

    expect(onChange).not.toHaveBeenCalled();
  });

  it('measures the grid from the minimum rather than from zero', () => {
    const onChange = vi.fn();
    // `min` is 1, so at a step of 2 the grid runs 1, 3, 5 … and 9 is on it while 8 is not.
    enter(draw(onChange, 2), '9');

    expect(onChange).toHaveBeenCalledWith(9);
  });

  it('refuses a value between two rungs of that grid', () => {
    // 10 rather than 8: the field opens bound to 8, and a change event carrying the value already
    // rendered is no change at all — React fires no handler, and the assertion would hold against
    // an implementation with no step check in it.
    const onChange = vi.fn();
    enter(draw(onChange, 2), '10');

    expect(onChange).not.toHaveBeenCalled();
  });

  it('accepts a value a binary fraction cannot represent exactly', () => {
    // (1.3 - 1) / 0.1 comes to 2.9999999999999996, so an equality test would refuse a rung the
    // reader can reach with the spinner.
    const onChange = vi.fn();
    enter(draw(onChange, 0.1), '1.3');

    expect(onChange).toHaveBeenCalledWith(1.3);
  });

  it('still refuses an out-of-range entry', () => {
    const onChange = vi.fn();
    enter(draw(onChange), '900');

    expect(onChange).not.toHaveBeenCalled();
  });

  it('still refuses an empty entry rather than committing a zero', () => {
    const onChange = vi.fn();
    enter(draw(onChange), '');

    expect(onChange).not.toHaveBeenCalled();
  });
});
