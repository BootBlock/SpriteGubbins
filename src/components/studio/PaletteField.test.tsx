import { beforeEach, describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import { useOutputStore } from '../../stores/useOutputStore.ts';
import { PaletteField } from './PaletteField.tsx';

/**
 * The third of the three palettes this app settles, and the only one settled before any image
 * exists.
 *
 * What is checked here is the condition the download row appears on, which is the same one the
 * swatch strip appears on and for the same reason: a channel-depth machine states a ladder rather
 * than a list, so there is nothing to write out. The written files are pinned in
 * `utils/writePalette.test.ts`.
 */

describe('PaletteField', () => {
  beforeEach(() => {
    useOutputStore.getState().setOutputField('palette', 'FREE');
  });

  it('offers no palette file while nothing is pinned', () => {
    render(<PaletteField />);

    // By name, because the label carries a guidance ⓘ that is a button too.
    expect(screen.queryByRole('button', { name: /^Download/ })).toBeNull();
  });

  it('offers the machine’s own colours once one is pinned', () => {
    useOutputStore.getState().setOutputField('palette', 'PICO_8');
    render(<PaletteField />);

    expect(screen.getByRole('button', { name: 'Download PICO-8 palette as a swatch PNG' })).toBeVisible();
  });

  it('offers nothing for a machine whose palette is a ladder rather than a list', () => {
    useOutputStore.getState().setOutputField('palette', 'MEGA_DRIVE');
    render(<PaletteField />);

    // By name, because the label carries a guidance ⓘ that is a button too.
    expect(screen.queryByRole('button', { name: /^Download/ })).toBeNull();
  });
});
