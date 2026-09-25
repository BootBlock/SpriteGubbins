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

/**
 * That the surface settings are offered exactly when the render style leaves them anything to
 * decide.
 *
 * Two of the ten styles are validation passes: `CLAY_RENDER` states one untextured material and
 * `SILHOUETTE_ONLY` states one flat fill, so each is already the whole answer about the surface. The
 * compiler drops surface detail, the colour budget and the outline from section 2 behind them — and
 * the lighting model behind the silhouette, which has nowhere for a key light to land — so a control
 * left on screen would be offering a setting the prompt does not carry. The clay pass withdraws the
 * lighting control for a different reason: its prompt states one fixed key light, so the control
 * would offer one option. Same three properties as the budget above: it goes, the value survives,
 * and the page says why.
 */
const SURFACE = 'Surface Detail Intensity';
const OUTLINE = 'Outline System';
const LIGHTING = 'Lighting & Shading Model';

/** Every control the render style can withdraw, by the accessible name it is found under. */
function control(name: string): HTMLElement | null {
  return screen.queryByRole('combobox', { name });
}

describe('RenderStyleFields — a render style that withholds the surface', () => {
  it('offers all four while the style describes a surface', () => {
    render(<RenderStyleFields />);

    for (const name of [SURFACE, BUDGET, OUTLINE, LIGHTING]) expect(control(name)).not.toBeNull();
  });

  it('withdraws the three a clay pass supersedes, and the lighting its one key light leaves', () => {
    render(<RenderStyleFields />);

    act(() => {
      useOutputStore.getState().setOutputField('renderStyle', 'CLAY_RENDER');
    });

    expect(control(SURFACE)).toBeNull();
    expect(control(BUDGET)).toBeNull();
    expect(control(OUTLINE)).toBeNull();
    // A clay model is read by the way one fixed key light falls across it, so the lighting control
    // has one option and withdraws too — the prompt still states that light.
    expect(control(LIGHTING)).toBeNull();
    // And the controls above the pass, which decide nothing about the surface.
    expect(control('Resolution Profile')).not.toBeNull();
  });

  it('takes the lighting model too where the pass leaves nowhere for it to land', () => {
    render(<RenderStyleFields />);

    act(() => {
      useOutputStore.getState().setOutputField('renderStyle', 'SILHOUETTE_ONLY');
    });

    expect(control(LIGHTING)).toBeNull();
  });

  it('keeps what it hid, and gives it back with the next finished style', () => {
    // The workflow the whole feature is for: the tooltip tells a reader to run a pass on an
    // otherwise-finished configuration, so the settings it withdraws have to be the ones they had.
    useOutputStore.setState({
      output: { ...DEFAULT_OUTPUT_CONFIG, surfaceDetail: 'TEXTURED', outlineStyle: 'PURE_BLACK_OUTLINE' },
    });
    render(<RenderStyleFields />);

    act(() => {
      useOutputStore.getState().setOutputField('renderStyle', 'SILHOUETTE_ONLY');
    });
    expect(control(SURFACE)).toBeNull();
    expect(useOutputStore.getState().output.surfaceDetail).toBe('TEXTURED');

    act(() => {
      useOutputStore.getState().setOutputField('renderStyle', 'PIXEL_ART');
    });
    expect(control(SURFACE)).toHaveValue('TEXTURED');
    expect(control(OUTLINE)).toHaveValue('PURE_BLACK_OUTLINE');
  });

  it('names the controls it withdrew, on the control that withdrew them', () => {
    // The same answer `PaletteField` gives, for the same reason: four controls leaving at once with
    // nothing on the page accounting for it reads as a bug rather than as a rule. The sentence is
    // built from the lookups the controls are filtered by, so it says why each one went.
    useOutputStore.setState({
      output: { ...DEFAULT_OUTPUT_CONFIG, renderStyle: 'CLAY_RENDER' },
    });
    const { rerender } = render(<RenderStyleFields />);

    const clay = screen.getByRole('combobox', { name: 'Render Style' });
    expect(clay).toHaveAccessibleDescription(/A validation pass: it states the surface itself/);
    expect(clay).toHaveAccessibleDescription(/the outline system withdraw/);
    expect(clay).toHaveAccessibleDescription(
      /the lighting model withdraws and the prompt states ISOMETRIC_TOP_LEFT/,
    );

    act(() => {
      useOutputStore.getState().setOutputField('renderStyle', 'SILHOUETTE_ONLY');
    });
    rerender(<RenderStyleFields />);
    const silhouette = screen.getByRole('combobox', { name: 'Render Style' });
    expect(silhouette).toHaveAccessibleDescription(/the lighting model withdraw,/);
    expect(silhouette).not.toHaveAccessibleDescription(/prompt states/);
  });

  it('says nothing extra on a style that withdraws nothing', () => {
    render(<RenderStyleFields />);

    expect(screen.getByRole('combobox', { name: 'Render Style' })).not.toHaveAccessibleDescription(
      /validation pass/,
    );
  });
});

/**
 * That a finished style offers only the options it can be drawn with (issue #406).
 *
 * A cel style names its own ink contour, so "No outline" is not offered; `RETRO_PIXEL_ART` names a
 * small palette, so no budget without a count is; and a style whose shading falls from a directional
 * light takes the key light alone, so the lighting control withdraws. Each select shows the value the
 * prompt states, and the value the store holds is kept for the next style that offers it.
 */
describe('RenderStyleFields — a finished style that narrows its options', () => {
  /** The values a select offers, read off its options. */
  function offered(name: string): string[] {
    const select = control(name);
    if (select === null) throw new Error(`${name} should be on screen.`);
    return [...select.querySelectorAll('option')].map((option) => option.value);
  }

  it('offers a cel style no outline-less option, and says why', () => {
    useOutputStore.setState({
      output: { ...DEFAULT_OUTPUT_CONFIG, renderStyle: 'CEL_SHADED', outlineStyle: 'OUTLINE_LESS_ALBEDO' },
    });
    render(<RenderStyleFields />);

    expect(offered(OUTLINE)).toEqual(['DARK_LOCAL_CONTOUR', 'PURE_BLACK_OUTLINE']);
    // The value the prompt states, not the stored one the style cannot be drawn with.
    expect(control(OUTLINE)).toHaveValue('DARK_LOCAL_CONTOUR');
    expect(control(OUTLINE)).toHaveAccessibleDescription(/OUTLINE_LESS_ALBEDO is not offered/);
    expect(useOutputStore.getState().output.outlineStyle).toBe('OUTLINE_LESS_ALBEDO');
  });

  it('withdraws the lighting from a style whose shading needs one light', () => {
    render(<RenderStyleFields />);

    act(() => {
      useOutputStore.getState().setOutputField('renderStyle', 'RENDERED_3D');
    });
    expect(control(LIGHTING)).toBeNull();
    expect(screen.getByRole('combobox', { name: 'Render Style' })).toHaveAccessibleDescription(
      /the lighting model withdraws and the prompt states ISOMETRIC_TOP_LEFT/,
    );

    // And gives the stored model back with a style that offers it.
    act(() => {
      useOutputStore.getState().setOutputField('renderStyle', 'PAINTED_2D');
    });
    expect(control(LIGHTING)).toHaveValue(DEFAULT_OUTPUT_CONFIG.lightingModel);
  });

  it('offers retro pixel art only the budgets its small palette allows', () => {
    useOutputStore.setState({
      output: { ...DEFAULT_OUTPUT_CONFIG, renderStyle: 'RETRO_PIXEL_ART', paletteLimit: 'UNRESTRICTED' },
    });
    render(<RenderStyleFields />);

    expect(offered(BUDGET).sort()).toEqual(['RESTRAINED_64_COLOR', 'STRICT_32_COLOR']);
    expect(control(BUDGET)).toHaveValue('RESTRAINED_64_COLOR');
    expect(control(BUDGET)).toHaveAccessibleDescription(/EXPANDED_ALBEDO and UNRESTRICTED are not offered/);
  });

  it('narrows nothing for a style that states none of the three', () => {
    render(<RenderStyleFields />);

    expect(offered(OUTLINE)).toHaveLength(3);
    expect(offered(LIGHTING)).toHaveLength(3);
    expect(offered(BUDGET)).toHaveLength(4);
    expect(control(OUTLINE)).not.toHaveAccessibleDescription(/not offered/);
  });
});
