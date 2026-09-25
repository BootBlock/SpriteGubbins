import { beforeEach, describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import { DEFAULT_OUTPUT_CONFIG } from '../../constants/output/index.ts';
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
    useOutputStore.setState({ output: { ...DEFAULT_OUTPUT_CONFIG, palette: 'FREE' } });
  });

  it('offers no palette file while nothing is pinned', () => {
    render(<PaletteField />);

    // By name, because the label carries a guidance ⓘ that is a button too.
    expect(screen.queryByRole('button', { name: / — download / })).toBeNull();
  });

  it('offers the machine’s own colours once one is pinned', () => {
    useOutputStore.getState().setOutputField('palette', 'PICO_8');
    render(<PaletteField />);

    expect(
      screen.getByRole('button', {
        name: 'Swatch PNG — download PICO-8 palette as a picture of its colours',
      }),
    ).toBeVisible();
  });

  it('offers the reader’s own colours the same way, once they have loaded some', () => {
    // The point of the member: a palette no file in this repository declares reaches the swatch
    // strip and the download row through the same branch a machine's list does.
    useOutputStore.setState({
      output: {
        ...useOutputStore.getState().output,
        palette: 'CUSTOM',
        customPalette: { name: 'Dusk Harbour', entries: ['#102030'] },
      },
    });
    render(<PaletteField />);

    expect(
      screen.getByRole('button', {
        name: 'Swatch PNG — download Dusk Harbour palette as a picture of its colours',
      }),
    ).toBeVisible();
  });

  it('shows the intake under CUSTOM before anything is loaded, and offers no file', () => {
    // Choosing the option is not pinning a palette, so there is nothing to download yet — but the
    // way to fill it has to be on screen the moment the reader picks it.
    useOutputStore.getState().setOutputField('palette', 'CUSTOM');
    render(<PaletteField />);

    expect(screen.getByLabelText('Palette file')).toBeVisible();
    // By name, because the label carries a guidance ⓘ that is a button too.
    expect(screen.queryByRole('button', { name: / — download / })).toBeNull();
  });

  it('offers nothing for a machine whose palette is a ladder rather than a list', () => {
    useOutputStore.getState().setOutputField('palette', 'MEGA_DRIVE');
    render(<PaletteField />);

    // By name, because the label carries a guidance ⓘ that is a button too.
    expect(screen.queryByRole('button', { name: / — download / })).toBeNull();
  });
});
