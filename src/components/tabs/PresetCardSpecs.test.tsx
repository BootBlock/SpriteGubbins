import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import { DEFAULT_IMAGE_CONFIG } from '../../constants/output/index.ts';
import { DEFAULT_MODE_FOR, supportsMode } from '../../constants/sheetPlans/index.ts';
import { PresetCardSpecs } from './PresetCardSpecs.tsx';

/**
 * The three-term line under a preset's name.
 *
 * The contract worth pinning is the third term: a card is a promise about what loading the preset
 * gives you, so the sheet mode has to be the *resolved* one. Nothing shipped can break it — the
 * built-ins are checked pairing by pairing in `presetCoverage.test.ts` — so the case below is built
 * by hand, exactly as an imported pack can build one.
 */

/** The specs line, reached through a term no other element on it carries. */
function specs(): HTMLElement {
  return screen.getByText(/PIXEL_ART/);
}

describe('PresetCardSpecs', () => {
  it('names the render style, the projection and the sheet mode', () => {
    render(<PresetCardSpecs category="CHARACTER" output={DEFAULT_IMAGE_CONFIG} />);

    expect(specs()).toHaveTextContent('PIXEL_ART · THREE_QUARTER_TOPDOWN · CORE_DIRECTIONAL_VARIANTS');
  });

  it('keeps a stored mode the category supports', () => {
    render(
      <PresetCardSpecs
        category="CHARACTER"
        output={{ ...DEFAULT_IMAGE_CONFIG, directionalMode: 'CUTOUT_RIG_SINGLE_DIRECTION' }}
      />,
    );

    // Not the category's default, which is what a card that simply printed `DEFAULT_MODE_FOR` would
    // show — the resolution has to be the pairing's answer rather than a blanket substitution.
    expect(specs()).toHaveTextContent('CUTOUT_RIG_SINGLE_DIRECTION');
  });

  it('names the mode the category will actually be given, not the one it was handed', () => {
    // Reachable through import alone: `parseImportedPreset` checks `directionalMode` against the flat
    // `DIRECTIONAL_MODES` union with no category in scope, so a hand-written pack can pair a mode with
    // a category that has no plan for it. Nothing on an interface turns about a pivot.
    expect(supportsMode('INTERFACE', 'CUTOUT_RIG_SINGLE_DIRECTION')).toBe(false);

    render(
      <PresetCardSpecs
        category="INTERFACE"
        output={{ ...DEFAULT_IMAGE_CONFIG, directionalMode: 'CUTOUT_RIG_SINGLE_DIRECTION' }}
      />,
    );

    // What loading it puts in the studio and what the compiler writes the prompt against — the card
    // saying `CUTOUT_RIG_SINGLE_DIRECTION` here is the mismatch this resolution removes.
    expect(specs()).toHaveTextContent(DEFAULT_MODE_FOR.INTERFACE);
    expect(specs()).not.toHaveTextContent('CUTOUT_RIG_SINGLE_DIRECTION');
  });
});
