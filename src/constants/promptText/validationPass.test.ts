import { describe, expect, it } from 'vitest';
import { RENDER_STYLES } from '../../types/rendering.ts';
import { VALIDATION_PASS_TEXT, validationPassFor } from './validationPass.ts';

/**
 * The record behind the two conditionals and the paragraph that stands in for the lines they drop.
 *
 * `promptCompiler.test.ts` asserts what a pass does to a compiled prompt; this is the half that
 * cannot be seen from there — that the map filling `[DEFINE:VALIDATION_PASS_DESCRIPTION]` is the same
 * record the gates are read from, and that it stayed complete after being derived through a cast.
 */
describe('validationPassFor', () => {
  it('answers for every render style, and is a pass for the ones that withhold a surface', () => {
    // A style added to the union without a decision recorded here would be a `TypeError` on lookup
    // rather than a compile error, since `noUncheckedIndexedAccess` cannot see past the `Record`.
    for (const style of RENDER_STYLES) {
      expect(validationPassFor(style), style).not.toBeUndefined();
    }

    expect(validationPassFor('CLAY_RENDER')).not.toBeNull();
    expect(validationPassFor('SILHOUETTE_ONLY')).not.toBeNull();
    expect(validationPassFor('PIXEL_ART')).toBeNull();
  });

  it('withholds the light only where there is no surface for it to fall on', () => {
    // The distinction the second flag exists for, pinned at both ends: a clay render is *read* by
    // the way light crosses it, and a flat fill of one colour has nothing for a key light to model.
    expect(validationPassFor('CLAY_RENDER')?.withholdsLight).toBe(false);
    expect(validationPassFor('SILHOUETTE_ONLY')?.withholdsLight).toBe(true);
  });
});

describe('VALIDATION_PASS_TEXT', () => {
  it('is the same record the gates are read from, for every style', () => {
    // The two would let a pass drop the outline line and then say nothing about the edge, which is
    // the failure that made this a derived map rather than a second hand-written one. The cast that
    // derivation needs is what this checks: it claims completeness, and here it is verified.
    for (const style of RENDER_STYLES) {
      expect(VALIDATION_PASS_TEXT[style], style).toBe(validationPassFor(style)?.text ?? '');
    }
  });

  it('says outright what each pass does not draw', () => {
    // Dropping the three lines leaves a generator with the style name alone, and its prior for
    // "clay render" includes the material read the pass exists to remove — so the prose has to be
    // emphatic rather than merely present. Both halves are checked: what is withheld, and that the
    // subject definition is superseded rather than merely outranked somewhere else.
    for (const style of RENDER_STYLES) {
      const pass = validationPassFor(style);
      if (pass === null) continue;

      expect(pass.text, style).toContain('validation pass');
      expect(pass.text, style).toContain(
        'the subject definition above names a colour, a material or a finish',
      );
      expect(pass.text, style).toContain('this pass supersedes');
    }
  });
});
