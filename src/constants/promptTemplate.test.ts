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

/**
 * The component map's JSON example, which is the one line that keeps its straight quotes.
 *
 * Section [SECTION:COMPONENT_MAP] asks a model to reproduce the schema, and a curly quote in a JSON
 * key produces a document that does not parse. It is excluded by shape rather than by line number so
 * that reordering the sections cannot quietly turn the exclusion into a hole somewhere else.
 */
const COMPONENT_MAP_EXAMPLE = /^\{".*"[^"]*\}$/;

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
      PROMPT_TEMPLATE.indexOf('## [SECTION:SUBJECT]. SUBJECT DEFINITION'),
      PROMPT_TEMPLATE.indexOf('## [SECTION:STYLE]. RENDER STYLE'),
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

  it('writes no section number of its own, in a heading or in prose', () => {
    // The rule `applySectionNumbers` exists to make keepable. The rig section is conditional, so a
    // hand-numbered document ran `## 4.` into `## 6.` on the five categories that never articulate —
    // and every citation of a later section was a second literal that had to agree with the first.
    // Both halves are checked, because either one alone can go stale: a heading numbered by hand
    // would collide with a computed neighbour, and a citation numbered by hand would point at
    // whichever section happened to land there.
    expect(PROMPT_TEMPLATE, 'a heading writes its own number instead of [SECTION:…]').not.toMatch(/^## \d/m);
    expect(PROMPT_TEMPLATE, 'prose cites a section by number instead of [SEC:…]').not.toMatch(
      /\bsections? \d/i,
    );
  });

  it('cites only sections it also declares', () => {
    // A `[SEC:…]` naming a section no heading declares throws at compile time rather than emitting
    // `section undefined` — but it throws only for the configurations that reach it, and a citation
    // inside a rarely-taken block could sit unexercised for a long time. This is the static half.
    const declared = new Set(
      [...PROMPT_TEMPLATE.matchAll(/\[SECTION:([A-Z0-9_]+)\]/g)].map((match) => match[1] ?? ''),
    );
    const cited = new Set(
      [...PROMPT_TEMPLATE.matchAll(/\[SEC:([A-Z0-9_]+)\]/g)].map((match) => match[1] ?? ''),
    );
    expect(declared.size).toBeGreaterThan(0);
    expect(cited.size).toBeGreaterThan(0);
    for (const name of cited) {
      expect(declared, `[SEC:${name}] names no section this template declares`).toContain(name);
    }
  });

  it('writes its prose with typographic punctuation', () => {
    // CLAUDE.md asks the shipped copy for `’` and `“ ”`, and `constants/tooltips/tooltips.test.ts`
    // holds the guidance to it. This is the largest block of shipped text in the bundle and nothing
    // checked it, so it carried both spellings — 26 straight apostrophes against 8 typographic ones,
    // and the typographic ones all in the newest passages, which is the direction this drifts.
    const offenders = PROMPT_TEMPLATE.split('\n')
      .filter((line) => !COMPONENT_MAP_EXAMPLE.test(line))
      .filter((line) => /['"]/.test(line));
    expect(offenders, `the template writes a straight quote in prose:\n${offenders.join('\n')}`).toEqual([]);
  });

  it('opens with the output contract rather than burying it', () => {
    // Attention weighting favours early tokens, and background, pixel density and "no text" are the
    // constraints that fail most often. v1 had them in sections 8 and 9.
    const contractAt = PROMPT_TEMPLATE.indexOf('## [SECTION:CONTRACT]. NON-NEGOTIABLE OUTPUT CONTRACT');
    const subjectAt = PROMPT_TEMPLATE.indexOf('## [SECTION:SUBJECT]. SUBJECT DEFINITION');
    expect(contractAt).toBeGreaterThan(-1);
    expect(contractAt).toBeLessThan(subjectAt);
  });
});
