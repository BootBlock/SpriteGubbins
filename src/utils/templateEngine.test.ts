import { describe, expect, it } from 'vitest';
import { applyConditionals, applyOptionals, assertBlocksResolved, substitute } from './templateEngine.ts';

/**
 * Each case here is a way a template can fail *quietly* — emitting literal markup, a
 * placeholder-shaped token, or a ladder of blank lines — which is worse than throwing, because the
 * result still reads as a prompt.
 */

describe('applyConditionals', () => {
  it('keeps a block whose key matches one of the listed operands', () => {
    const rendered = applyConditionals('a\n[IF:STYLE=PIXEL_ART,RETRO_PIXEL_ART]\nb\n[/IF]\nc', {
      STYLE: 'RETRO_PIXEL_ART',
    });
    expect(rendered).toBe('a\nb\nc');
  });

  it('drops a block whose key matches none of them', () => {
    const rendered = applyConditionals('a\n[IF:STYLE=PIXEL_ART]\nb\n[/IF]\nc', { STYLE: 'PAINTED_2D' });
    expect(rendered).toBe('a\nc');
  });

  it('inverts the test for !=', () => {
    const template = 'a\n[IF:STYLE!=PIXEL_ART,RETRO_PIXEL_ART]\nb\n[/IF]\nc';
    expect(applyConditionals(template, { STYLE: 'PAINTED_2D' })).toBe('a\nb\nc');
    expect(applyConditionals(template, { STYLE: 'PIXEL_ART' })).toBe('a\nc');
  });

  it('treats a bare key as a test for being set', () => {
    const template = '[IF:SOCKETS]\nkeep\n[/IF]';
    expect(applyConditionals(template, { SOCKETS: 'head, chest' })).toBe('keep');
    expect(applyConditionals(template, { SOCKETS: '' })).toBe('');
    expect(applyConditionals(template, { SOCKETS: '   ' })).toBe('');
    expect(applyConditionals(template, {})).toBe('');
  });

  it('leaves no marker line behind when a block is kept', () => {
    expect(applyConditionals('[IF:K]\nx\n[/IF]', { K: 'y' })).not.toContain('[');
  });

  it('throws on an unclosed block rather than emitting the marker', () => {
    expect(() => applyConditionals('[IF:K=A]\nbody', { K: 'A' })).toThrow(/never closed/);
  });

  it('throws on a stray close', () => {
    expect(() => applyConditionals('body\n[/IF]', {})).toThrow(/no matching/);
  });

  it('throws on nesting, which the format does not allow', () => {
    expect(() => applyConditionals('[IF:A]\n[IF:B]\nx\n[/IF]\n[/IF]', { A: '1', B: '1' })).toThrow(
      /opened inside/,
    );
  });
});

describe('applyOptionals', () => {
  it('emits the line text when the value is set', () => {
    expect(applyOptionals('[OPTIONAL:SPECIES | - Species: [DEFINE:SPECIES]]', { SPECIES: 'Human' })).toBe(
      '- Species: [DEFINE:SPECIES]',
    );
  });

  it('removes the whole line when the value is empty or whitespace', () => {
    expect(applyOptionals('a\n[OPTIONAL:X | - X: [DEFINE:X]]\nb', { X: '' })).toBe('a\nb');
    expect(applyOptionals('a\n[OPTIONAL:X | - X: [DEFINE:X]]\nb', { X: '  \t ' })).toBe('a\nb');
    expect(applyOptionals('a\n[OPTIONAL:X | - X: [DEFINE:X]]\nb', {})).toBe('a\nb');
  });

  it('leaves no doubled blank line when adjacent optionals are all removed', () => {
    // The case that actually bites: a sparse subject removes most of section 1, and ragged blank
    // lines are what make a generated prompt look broken.
    const template = ['- Category: CHARACTER', '[OPTIONAL:A | - A: 1]', '[OPTIONAL:B | - B: 2]', 'tail'].join(
      '\n',
    );
    expect(applyOptionals(template, { A: '', B: '' })).toBe('- Category: CHARACTER\ntail');
    expect(applyOptionals(template, {})).not.toMatch(/\n\n/);
  });

  it('keeps a body containing its own closing bracket intact', () => {
    // The body almost always ends in `[DEFINE:…]`, so a non-greedy match would truncate it.
    const rendered = applyOptionals('[OPTIONAL:E | - Subject-specific: [DEFINE:E]]', { E: 'no shadows' });
    expect(rendered).toBe('- Subject-specific: [DEFINE:E]');
  });

  it('tolerates the alignment padding the template uses', () => {
    const rendered = applyOptionals('[OPTIONAL:AGE            | - Age: [DEFINE:AGE]]', { AGE: 'Young' });
    expect(rendered).toBe('- Age: [DEFINE:AGE]');
  });
});

describe('substitute', () => {
  it('replaces every occurrence of a token', () => {
    expect(substitute('[DEFINE:N] then [DEFINE:N]', { N: '15' })).toBe('15 then 15');
  });

  it('throws when a token has no value, rather than shipping template text to the model', () => {
    expect(() => substitute('count: [DEFINE:MISSING]', { OTHER: 'x' })).toThrow(/MISSING/);
  });

  it('substitutes an empty string when that is the supplied value', () => {
    // Distinct from "no value": an explicitly empty value is a decision, a missing one is a bug.
    expect(substitute('[DEFINE:X]!', { X: '' })).toBe('!');
  });
});

describe('assertBlocksResolved', () => {
  it('accepts text with no block markers left', () => {
    expect(() => {
      assertBlocksResolved('# Sheet\n- Species: Human');
    }).not.toThrow();
  });

  it.each([
    ['[OPTIONAL:X | y]', 'an optional'],
    ['[IF:X]', 'a conditional'],
    ['[/IF]', 'a close marker'],
  ])('rejects %s, which is %s that survived', (marker) => {
    expect(() => {
      assertBlocksResolved(`line one\nline two ${marker}`);
    }).toThrow(/unresolved marker/);
  });

  it('reports the line the survivor is on', () => {
    expect(() => {
      assertBlocksResolved('one\ntwo\nthree [IF:K]');
    }).toThrow(/line 3/);
  });

  it('accepts a surviving [DEFINE:…], which substitution handles', () => {
    // Deliberate: this check runs *before* substitution, so every legitimate token is still present.
    // Rejecting them here would fail on every well-formed template.
    expect(() => {
      assertBlocksResolved('- Species: [DEFINE:SPECIES]');
    }).not.toThrow();
  });
});
