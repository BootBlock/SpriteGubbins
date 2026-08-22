import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import { DEFAULT_IMAGE_CONFIG } from '../../constants/output/index.ts';
import { supportsProjection } from '../../constants/categoryProjections.ts';
import { DEFAULT_MODE_FOR, supportsMode } from '../../constants/sheetPlans/index.ts';
import { PresetCardSpecs } from './PresetCardSpecs.tsx';

/**
 * The three-term line under a preset's name.
 *
 * The contract worth pinning is that a card is a promise about what loading the preset gives you, so
 * the two terms a category can refuse — the sheet mode and the projection — have to be the
 * *resolved* ones. Nothing shipped can break either: the built-ins are checked pairing by pairing in
 * `presetCoverage.test.ts` and camera by camera in `categoryProjections.test.ts`. So the cases below
 * are built by hand, exactly as an imported pack can build one.
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

  it('names the camera the category will actually be given, not the one it was handed', () => {
    // The same route in, one term over: `parseImportedPreset` checks `projection` against the flat
    // `PROJECTIONS` union with no category in scope. A widget is composited onto the screen rather
    // than photographed in a world, so it has no top for an overhead camera to show.
    expect(supportsProjection('INTERFACE', 'THREE_QUARTER_TOPDOWN')).toBe(false);

    render(
      <PresetCardSpecs
        category="INTERFACE"
        output={{ ...DEFAULT_IMAGE_CONFIG, projection: 'THREE_QUARTER_TOPDOWN' }}
      />,
    );

    expect(specs()).toHaveTextContent('ORTHOGRAPHIC_FRONT');
    expect(specs()).not.toHaveTextContent('THREE_QUARTER_TOPDOWN');
  });

  it('keeps a stored camera the category can be drawn under', () => {
    // The resolution only ever narrows: eight of the nine categories are offered every camera, so a
    // side-on terrain preset — which the library ships — must print the camera it stored.
    render(
      <PresetCardSpecs
        category="TERRAIN"
        output={{ ...DEFAULT_IMAGE_CONFIG, projection: 'ORTHOGRAPHIC_SIDE' }}
      />,
    );

    expect(specs()).toHaveTextContent('ORTHOGRAPHIC_SIDE');
  });
});
