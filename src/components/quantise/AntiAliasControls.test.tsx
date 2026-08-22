import { beforeEach, describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ANTI_ALIAS_GUIDANCE } from '../../constants/antiAlias.ts';
import { useQuantiseStore } from '../../stores/useQuantiseStore.ts';
import { AntiAliasControls } from './AntiAliasControls.tsx';

/**
 * Which controls the panel offers, and which paragraph it offers them under.
 *
 * The geometry is pinned in `utils/edgeRuns.test.ts`, the pass in `utils/antiAlias.test.ts`, its
 * place in the pipeline in `utils/quantiseImage.test.ts` and what it does to real generator output in
 * `tests/anti-alias-corpus.test.ts`. What can only be checked here is the panel's agreement with the
 * store and with the state it is describing: that every dial appears exactly where it can act, that
 * the palette control is withdrawn where no colour setting is constraining the sheet, and that the
 * paragraph beneath says which of those states the reader is in.
 */

const show = (constrained = true) => render(<AntiAliasControls constrained={constrained} />);

const dial = (name: RegExp) => screen.queryByRole('slider', { name });

describe('AntiAliasControls', () => {
  beforeEach(() => {
    useQuantiseStore.getState().clear();
  });

  it('opens off, offering no dial at all and saying what the pass is for', () => {
    show();

    expect(useQuantiseStore.getState().antiAlias).toBe('OFF');
    expect(dial(/Contrast floor/)).not.toBeInTheDocument();
    expect(dial(/Strength/)).not.toBeInTheDocument();
    expect(dial(/Shortest run/)).not.toBeInTheDocument();
    expect(screen.queryByRole('combobox', { name: /Blended shades/ })).not.toBeInTheDocument();
    expect(screen.getByText(ANTI_ALIAS_GUIDANCE.off)).toBeInTheDocument();
  });

  it('offers all four dials once the pass is on', async () => {
    show();
    const user = userEvent.setup();

    await user.selectOptions(screen.getByRole('combobox', { name: /^Anti-aliasing/ }), 'INTERIOR');

    expect(useQuantiseStore.getState().antiAlias).toBe('INTERIOR');
    expect(dial(/Contrast floor/)).toBeInTheDocument();
    expect(dial(/Strength/)).toBeInTheDocument();
    expect(dial(/Shortest run/)).toBeInTheDocument();
    expect(screen.getByRole('combobox', { name: /Blended shades/ })).toBeInTheDocument();
  });

  it('withdraws the palette control where no colour setting is constraining the sheet', async () => {
    show(false);
    const user = userEvent.setup();

    await user.selectOptions(screen.getByRole('combobox', { name: /^Anti-aliasing/ }), 'BOTH');

    // The three shaping dials still act; the fourth control has nothing to keep a blend to, and the
    // paragraph is the one that says so rather than describing what is being softened.
    expect(dial(/Contrast floor/)).toBeInTheDocument();
    expect(screen.queryByRole('combobox', { name: /Blended shades/ })).not.toBeInTheDocument();
    expect(screen.getByText(ANTI_ALIAS_GUIDANCE.unconstrained)).toBeInTheDocument();

    // And it is the paragraph for every scope rather than for the one that happened to be chosen: a
    // missing control is the state worth explaining, whichever half of the sheet is being softened.
    await user.selectOptions(screen.getByRole('combobox', { name: /^Anti-aliasing/ }), 'INTERIOR');
    expect(screen.getByText(ANTI_ALIAS_GUIDANCE.unconstrained)).toBeInTheDocument();
  });

  it('describes whichever half of the sheet the reader has pointed the pass at', async () => {
    show();
    const user = userEvent.setup();
    const control = screen.getByRole('combobox', { name: /^Anti-aliasing/ });

    await user.selectOptions(control, 'INTERIOR');
    expect(screen.getByText(ANTI_ALIAS_GUIDANCE.interior)).toBeInTheDocument();

    await user.selectOptions(control, 'SILHOUETTE');
    expect(screen.getByText(ANTI_ALIAS_GUIDANCE.silhouette)).toBeInTheDocument();

    await user.selectOptions(control, 'BOTH');
    expect(screen.getByText(ANTI_ALIAS_GUIDANCE.both)).toBeInTheDocument();
  });

  it('writes every dial through the store, so an undo steps back through them', async () => {
    show();
    const user = userEvent.setup();

    await user.selectOptions(screen.getByRole('combobox', { name: /^Anti-aliasing/ }), 'BOTH');
    await user.selectOptions(screen.getByRole('combobox', { name: /Blended shades/ }), 'BLEND');

    const before = useQuantiseStore.getState().antiAliasPalette;
    expect(before).toBe('BLEND');
    useQuantiseStore.getState().undo();
    expect(useQuantiseStore.getState().antiAliasPalette).toBe('SNAP');
    expect(useQuantiseStore.getState().antiAlias).toBe('BOTH');
  });

  it('names the neutral position of the shortest run rather than its number', async () => {
    show();
    const user = userEvent.setup();

    await user.selectOptions(screen.getByRole('combobox', { name: /^Anti-aliasing/ }), 'BOTH');

    // The floor keeps every run the reconstruction blends at all, so the readout says what the dial
    // is doing rather than a figure a reader would have to know the geometry to interpret — a `2`
    // there reads as an exclusion, and it excludes nothing.
    expect(screen.getByText('every run')).toBeInTheDocument();
  });
});
