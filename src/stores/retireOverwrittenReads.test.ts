import { beforeEach, describe, expect, it } from 'vitest';
import { DEFAULT_OUTPUT_CONFIG } from '../constants/output/index.ts';
import { customPaletteRequests } from './customPaletteRequests.ts';
import { identityPaletteRequests } from './identityPaletteRequests.ts';
import { useOutputStore } from './useOutputStore.ts';

/**
 * Which writes to the output configuration retire a palette file still being read.
 *
 * Driven through the store's own actions, because the rule is about which of them count as a later
 * choice than the file: the wholesale writes do when they change the setting, and the field write
 * never does, since it is how a read lands and how the reader types into the lock.
 */

const DUSK = { name: 'Dusk', entries: ['#102030'] };

beforeEach(() => {
  useOutputStore.setState({
    output: { ...DEFAULT_OUTPUT_CONFIG, customPalette: DUSK, identityLock: 'Hood' },
  });
});

describe('retireOverwrittenReads', () => {
  it('retires a palette file when a restored entry replaces the palette', () => {
    const reading = customPaletteRequests.begin();

    useOutputStore.getState().setOutputConfig({ ...DEFAULT_OUTPUT_CONFIG, customPalette: null });

    expect(reading()).toBe(false);
  });

  it('retires an identity sheet when a loaded preset replaces the lock', () => {
    const reading = identityPaletteRequests.begin();

    useOutputStore.getState().applyImageConfig({ ...DEFAULT_OUTPUT_CONFIG, identityLock: 'Cape' });

    expect(reading()).toBe(false);
  });

  it('keeps both reads when a wholesale write carries the palette and the lock across', () => {
    const palette = customPaletteRequests.begin();
    const identity = identityPaletteRequests.begin();
    const { output } = useOutputStore.getState();

    useOutputStore.getState().setOutputConfig({ ...output, sheetIndex: output.sheetIndex + 1 });
    useOutputStore.getState().applyOutputPatch({ paletteLimit: output.paletteLimit });

    expect(palette()).toBe(true);
    expect(identity()).toBe(true);
  });

  it('keeps both reads when a single field changes, even the palette or the lock itself', () => {
    const palette = customPaletteRequests.begin();
    const identity = identityPaletteRequests.begin();

    useOutputStore.getState().setOutputField('identityLock', 'Hood and cape');
    useOutputStore.getState().setOutputField('customPalette', null);

    expect(palette()).toBe(true);
    expect(identity()).toBe(true);
  });
});
