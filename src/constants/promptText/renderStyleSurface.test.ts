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
   * The three claims a negative channel can carry, and what section 2 must say for each to be true.
   *
   * Asserted as an **iff**, which is the half a check written from the reported defect alone would
   * miss: "negates only what section 2 asserts" is satisfied by negating nothing at all, so a later
   * pass could empty five styles' entries and every test that derives its expectations from this
   * record would still pass. The rule that holds in both directions is the one that has to be
   * written down — a style whose own line says its edges are hard *owes* the negative channel that
   * claim as much as a style whose line says the opposite may not make it.
   *
   * Aliasing belongs to the two pixel styles alone: everything else this app can ask for is
   * rasterised with anti-aliased boundaries, and a vector or cel-shaded sheet told to avoid them
   * comes back staircased.
   */
  const NEGATIVE_RULES: readonly { readonly term: string; readonly assertedBy: RegExp }[] = [
    { term: 'blurred edges', assertedBy: /hard[- ]edge|crisp|chunky|faceted|solid|line weight/i },
    { term: 'anti-aliased edges', assertedBy: /pixel/i },
    {
      term: 'smooth gradients',
      assertedBy: /flat|no gradients|value bands|small palette|solid single-colour/i,
    },
  ];

  /**
   * What the *statement* may claim, which is the half that leads Flux's prompt.
   *
   * One-directional, because a clause is prose rather than a set of terms — there is no "owes" to
   * assert. What it catches is the reported defect in the place it was loudest: a statement carrying
   * another style's vocabulary, "with hard chunky pixel edges" under `PAINTED_2D`.
   */
  const STATEMENT_CLAIMS: readonly { readonly claim: RegExp; readonly requires: RegExp }[] = [
    { claim: /pixel|anti-alias/i, requires: /pixel/i },
    {
      claim: /hard[- ]edge|crisp|chunky|faceted|solid/i,
      requires: /hard[- ]edge|crisp|chunky|faceted|solid|line weight/i,
    },
    {
      claim: /flat|no gradients/i,
      requires: /flat|no gradients|value bands|small palette|solid single-colour/i,
    },
    // And the other direction, so a style cannot promise a soft surface its own line never mentions.
    { claim: /soft|blended/i, requires: /soft|blended/i },
  ];

  it.each(RENDER_STYLES)('negates exactly what %s’s own section 2 line asserts the absence of', (style) => {
    const description = RENDER_STYLE_TEXT[style];
    const { negatives } = RENDER_STYLE_SURFACE[style];

    for (const { term, assertedBy } of NEGATIVE_RULES) {
      expect(negatives.includes(term), `${style} / ${term}`).toBe(assertedBy.test(description));
    }
    // A fourth term is a fourth claim a generator will act on, and it wants a rule above saying
    // which styles it is true of before it is emitted to any of them.
    const unruled = negatives.filter((term) => !NEGATIVE_RULES.some((rule) => rule.term === term));
    expect(unruled, style).toEqual([]);
  });

  it.each(RENDER_STYLES)('states nothing about %s that its section 2 line does not support', (style) => {
    const description = RENDER_STYLE_TEXT[style];
    const { statement } = RENDER_STYLE_SURFACE[style];

    for (const { claim, requires } of STATEMENT_CLAIMS) {
      if (!claim.test(statement)) continue;
      expect(description, `${style} states “${statement}”`).toMatch(requires);
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
    // Named as well as derived, because a rewording that shrank this set to one style would leave a
    // loop over it passing while saying nothing.
    expect(soft).toEqual(['PAINTED_2D', 'RENDERED_3D', 'CLAY_RENDER']);

    for (const style of soft) {
      expect(RENDER_STYLE_SURFACE[style].negatives, style).toEqual([]);
    }
  });

  it('gives every style a clause that completes the sentence it is spliced into', () => {
    // Flux reads `Every part is drawn ${statement}.`, so a statement that opened with a capital or
    // closed with a full stop would arrive as two half sentences — and on the open-weight tier it is
    // the only statement of the style that gets read at all.
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
