import { describe, expect, it } from 'vitest';
import * as promptText from './promptText/index.ts';
import { PROMPT_TEMPLATE } from './promptTemplate.ts';
import { SUBJECT_FIELD_KEYS } from '../types/subject.ts';

/**
 * The template document's own integrity, as opposed to what the compiler does with it.
 *
 * Beside the template rather than with the compiler tests because that is what it is about: whether
 * the v2 document holds to its own conventions. A `[DEFINE:*]` with no map to fill it from does not
 * fail to compile — it reaches the model as **literal template text**, which is `baseline-prompt-new.md`
 * §10.1's follow-up, and the cheapest place to catch it is the naming convention the two sides share.
 */

/** Tokens the compiler computes rather than looking up. See the test that pins each one. */
const COMPUTED_DESCRIPTIONS = new Set(['DIRECTIONS_DESCRIPTION', 'MIRROR_PAIRS_DESCRIPTION']);

describe('the template itself', () => {
  it('fills every _DESCRIPTION token from a matching _TEXT map', () => {
    // The naming convention is the contract between the template and `constants/promptText/`: a
    // `[DEFINE:FOO_DESCRIPTION]` is filled from `FOO_TEXT`. Walking it here is what stops a token
    // being added without its map — which would otherwise reach a model as literal template text.
    const tokens = [...PROMPT_TEMPLATE.matchAll(/\[DEFINE:([A-Z0-9_]+_DESCRIPTION)\]/g)].map(
      (match) => match[1] ?? '',
    );
    expect(new Set(tokens).size).toBeGreaterThan(0);

    const exported = new Set(Object.keys(promptText));
    for (const token of new Set(tokens)) {
      if (COMPUTED_DESCRIPTIONS.has(token)) continue;
      const mapName = token.replace(/_DESCRIPTION$/, '_TEXT');
      expect(exported, `[DEFINE:${token}] has no ${mapName} to fill it from`).toContain(mapName);
    }
  });

  it('fills every _LABEL token from a subject field the categories define', () => {
    // The second half of the same contract: a `[DEFINE:FOO_LABEL]` is filled from the category's own
    // definition of the field `foo`, so the token has to name a key that exists. A token for a key
    // no category defines would reach `substitute` with no value and throw the compiler mid-render —
    // which is the loud failure, but this is the cheap one, and it names the typo.
    const tokens = new Set(
      [...PROMPT_TEMPLATE.matchAll(/\[DEFINE:([A-Z0-9_]+)_LABEL\]/g)].map((match) =>
        (match[1] ?? '').toLowerCase(),
      ),
    );
    // Fifteen of the sixteen: `exclusions` is section 8's line, and section 8 writes its own heading.
    expect(tokens.size).toBe(SUBJECT_FIELD_KEYS.length - 1);
    expect(tokens.has('exclusions')).toBe(false);
    for (const token of tokens) {
      expect(SUBJECT_FIELD_KEYS, `[DEFINE:${token.toUpperCase()}_LABEL] names no subject field`).toContain(
        token,
      );
    }
  });

  it('writes no subject-field label of its own', () => {
    // What the tokens above replaced. Section 1's labels used to be fixed here, which meant one
    // category's vocabulary reaching all six — a tank's turret under "Anatomy base", its vision slit
    // under "Head & sensory features". Every bullet in section 1 is now a token, so there is no
    // label in this file that could go stale against the studio.
    const section = PROMPT_TEMPLATE.slice(
      PROMPT_TEMPLATE.indexOf('## 1. SUBJECT DEFINITION'),
      PROMPT_TEMPLATE.indexOf('## 2. RENDER STYLE'),
    );
    const bullets = [
      ...section.matchAll(/^\[OPTIONAL:[A-Z0-9_]+ *\| *- (.*): \[DEFINE:[A-Z0-9_]+\]\]$/gm),
    ].map((match) => match[1] ?? '');
    expect(bullets.length).toBe(SUBJECT_FIELD_KEYS.length - 1);
    for (const bullet of bullets) {
      expect(bullet, 'a section 1 bullet names its own label').toMatch(
        /^\[DEFINE:[A-Z0-9_]+_LABEL\]( \((?:dominant|highlights only)\))?$/,
      );
    }
  });

  it('computes the descriptions that no fixed map could hold', () => {
    // The one documented exception to the convention, asserted rather than merely allowed: the
    // directions line describes the set the compiler *narrowed to*, which is a function of the mode
    // as well as the chosen set, so a lookup keyed on the set alone would state the wrong thing.
    expect(typeof promptText.describeDirections).toBe('function');
    expect(promptText.describeDirections(['south', 'west'])).toBe('South, west');
  });

  it('opens with the output contract rather than burying it', () => {
    // Attention weighting favours early tokens, and background, pixel density and "no text" are the
    // constraints that fail most often. v1 had them in sections 8 and 9.
    const contractAt = PROMPT_TEMPLATE.indexOf('## 0. NON-NEGOTIABLE OUTPUT CONTRACT');
    const subjectAt = PROMPT_TEMPLATE.indexOf('## 1. SUBJECT DEFINITION');
    expect(contractAt).toBeGreaterThan(-1);
    expect(contractAt).toBeLessThan(subjectAt);
  });
});
