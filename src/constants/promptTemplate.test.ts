import { describe, expect, it } from 'vitest';
import * as promptText from './promptText/index.ts';
import { PROMPT_TEMPLATE } from './promptTemplate.ts';

/**
 * The template document's own integrity, as opposed to what the compiler does with it.
 *
 * Beside the template rather than with the compiler tests because that is what it is about: whether
 * the v2 document holds to its own conventions. A `[DEFINE:*]` with no map to fill it from does not
 * fail to compile — it reaches the model as **literal template text**, which is `baseline-prompt-new.md`
 * §10.1's follow-up, and the cheapest place to catch it is the naming convention the two sides share.
 */

/** Tokens the compiler computes rather than looking up. See the test that pins each one. */
const COMPUTED_DESCRIPTIONS = new Set(['DIRECTIONS_DESCRIPTION']);

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
