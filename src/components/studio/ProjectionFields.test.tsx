import { beforeEach, describe, expect, it } from 'vitest';
import { act, fireEvent, render, screen } from '@testing-library/react';
import { DEFAULT_OUTPUT_CONFIG } from '../../constants/output/index.ts';
import { useOutputStore } from '../../stores/useOutputStore.ts';
import { ProjectionFields } from './ProjectionFields.tsx';

/**
 * That the camera is described by one control rather than by two that can disagree.
 *
 * The projection's own sentence and the elevation are adjacent lines of section 3, and the number
 * used to be free across 0–90° whatever the projection said — so `Directly overhead. Only the top of
 * forms is visible` could sit one line above `Camera elevation: 0° above the horizon`. Every
 * projection but the angled-overhead one *is* a camera geometry, so the elevation is that geometry's;
 * these are the three properties taking it over has to get right.
 */
const ELEVATION = 'Camera Elevation (°)';

function elevation(): HTMLInputElement {
  return screen.getByRole('spinbutton', { name: ELEVATION });
}

beforeEach(() => {
  useOutputStore.setState({ output: DEFAULT_OUTPUT_CONFIG });
});

describe('ProjectionFields', () => {
  it('leaves the elevation open under the one projection that does not fix it', () => {
    render(<ProjectionFields />);

    expect(elevation()).toHaveValue(35);
    expect(elevation()).toHaveAttribute('aria-disabled', 'false');

    act(() => {
      fireEvent.change(elevation(), { target: { value: '52' } });
    });
    expect(useOutputStore.getState().output.cameraElevation).toBe(52);
  });

  it('hands the number to the projection, and says which setting took it', () => {
    // Shown rather than hidden, and greyed with its reason rather than silently inert: the value
    // still reaches the prompt, so a reader has to be able to see what the camera is doing and why
    // the field will not move.
    render(<ProjectionFields />);

    act(() => {
      fireEvent.change(screen.getByRole('combobox', { name: 'Projection' }), {
        target: { value: 'PURE_TOPDOWN' },
      });
    });

    expect(elevation()).toHaveValue(90);
    expect(elevation()).toHaveAttribute('aria-disabled', 'true');
    expect(screen.getByText(/PURE_TOPDOWN is a camera in its own right/)).toBeInTheDocument();

    act(() => {
      fireEvent.change(elevation(), { target: { value: '40' } });
    });
    expect(useOutputStore.getState().output.cameraElevation).toBe(90);
  });

  it('shows the elevation the prompt will carry, not one a stored pairing is holding', () => {
    // A configuration saved before the range existed, or hand-edited. The compiler resolves it the
    // same way, so a field left showing the stored number would disagree with the prompt beside it.
    useOutputStore.setState({
      output: { ...DEFAULT_OUTPUT_CONFIG, projection: 'ORTHOGRAPHIC_SIDE', cameraElevation: 90 },
    });
    render(<ProjectionFields />);

    expect(elevation()).toHaveValue(0);
  });
});
