import { describe, expect, it } from 'vitest';
import { RENDER_STYLES } from '../../types/rendering.ts';
import { RENDER_STYLE_TEXT } from './renderStyle.ts';
import { RENDER_STYLE_SURFACE } from './renderStyleSurface.ts';
import { validationPassFor } from './validationPass.ts';

/**
 * Whether each style's wrapper terms agree with the style's own line in section 2.
 *
 * Checked against `RENDER_STYLE_TEXT` rather than against a second copy of the expected terms,
 * because the defect being pinned is precisely two statements of one fact drifting apart: the
 * wrappers stated the pixel-art edge rules for every style, and section 2 stated the style's own.
 * A test listing the answers would have been written from the same misunderstanding.
 */
describe('RENDER_STYLE_SURFACE', () => {
  /**
   * What each negative term claims about the surface, as something section 2 has to say for itself.
   *
   * The vocabulary is closed on purpose: a fourth term is a fourth claim a generator will act on,
   * and it wants a rule saying which styles it is true of before it is emitted to any of them.
   */
  const JUSTIFICATION: Readonly<Record<string, RegExp>> = {
    // The one term that belongs to the two pixel styles alone. Everything else this app can ask for
    // is rasterised with anti-aliased boundaries, and a vector or cel-shaded sheet told to avoid
    // them comes back staircased.
    'anti-aliased edges': /pixel/i,
    // Somewhere the style says its own edges are hard, crisp, chunky, inked, faceted or solid.
    'blurred edges': /hard edge|hard-edged|crisp|chunky|line weight|faceted|solid/i,
    // Somewhere it says its fills are flat, banded, palette-limited or gradient-free.
    'smooth gradients': /flat|no gradients|value bands|small palette|solid single-colour/i,
  };

  it.each(RENDER_STYLES)('%s negates only what its own section 2 line asserts the absence of', (style) => {
    const description = RENDER_STYLE_TEXT[style];
    for (const term of RENDER_STYLE_SURFACE[style].negatives) {
      const justification = JUSTIFICATION[term];
      expect(justification, `${term} has no rule saying which styles it is true of`).toBeDefined();
      expect(description, `${style} negates “${term}”`).toMatch(justification as RegExp);
    }
  });

  it('lets a style that asks for a soft surface negate nothing about one', () => {
    // The reported defect, as a property rather than as three examples: `PAINTED_2D` asks for "soft
    // blended forms", `RENDERED_3D` for "soft form shadow", `CLAY_RENDER` for a lit form study — and
    // every wrapper was negating anti-aliasing and smooth gradients against all three.
    //
    // The clay render is the one whose softness its own line does not say in as many words, so it is
    // read from the half of the pass that does: a validation pass that keeps the light is one whose
    // volumes are read through shading, and shading across a form is a smooth gradient.
    const soft = RENDER_STYLES.filter(
      (style) =>
        /soft|blended/i.test(RENDER_STYLE_TEXT[style]) || validationPassFor(style)?.withholdsLight === false,
    );
    expect(soft.length).toBeGreaterThan(0);

    for (const style of soft) {
      expect(RENDER_STYLE_SURFACE[style].negatives, style).toEqual([]);
    }
  });

  it('gives every style a clause that completes the sentence it is spliced into', () => {
    // Flux reads `Every part is drawn ${statement}.`, so a statement that opened with a capital or
    // closed with a full stop would arrive as two half sentences — and this is the only statement of
    // the style that target reads at all.
    for (const style of RENDER_STYLES) {
      const { statement } = RENDER_STYLE_SURFACE[style];
      expect(statement, style).toMatch(/^as [a-z0-9]/);
      expect(statement.endsWith('.'), style).toBe(false);
    }
  });

  it('says the same thing about a style as section 2 does', () => {
    // Not a paraphrase test — it cannot be — but the statement is a restatement of section 2's line
    // for a target that never reaches section 2, so the words it leans on have to be that line's.
    // Each of these is the substantive half of its style's description.
    const SHARED: Readonly<Record<string, string>> = {
      PIXEL_ART: 'deliberate pixel placement',
      RETRO_PIXEL_ART: 'chunky pixels',
      PAINTED_2D: 'soft blended forms',
      CEL_SHADED: 'flat colour fills',
      VECTOR_FLAT: 'crisp mathematical curves',
      HAND_DRAWN_INK: 'hatched or flat fills',
      RENDERED_3D: 'soft form shadow',
      LOW_POLY_3D: 'flat per-face shading',
      CLAY_RENDER: 'untextured single-material form study',
      SILHOUETTE_ONLY: 'single-colour silhouettes',
    };

    for (const style of RENDER_STYLES) {
      const phrase = SHARED[style];
      expect(phrase, `${style} has no phrase pinned`).toBeDefined();
      expect(RENDER_STYLE_TEXT[style].toLowerCase(), style).toContain(phrase);
      expect(RENDER_STYLE_SURFACE[style].statement, style).toContain(phrase);
    }
  });
});
