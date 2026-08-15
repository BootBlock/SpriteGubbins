import { describe, expect, it } from 'vitest';
import {
  applyConditionals,
  applyNumbering,
  applyOptionals,
  applySectionNumbers,
  assertBlocksResolved,
  substitute,
} from './templateEngine.ts';

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

  /*
   * Nesting is what lets a section state its own precondition once and its parts state theirs
   * beneath it — section 9's self-audit applies only to a target that can act on it, and within
   * that, individual checks apply only to a cut-out rig or a pixel-art sheet.
   */
  it('keeps a nested block only when its own condition and every enclosing one hold', () => {
    const template = 'a\n[IF:OUTER]\nb\n[IF:INNER]\nc\n[/IF]\nd\n[/IF]\ne';

    expect(applyConditionals(template, { OUTER: '1', INNER: '1' })).toBe('a\nb\nc\nd\ne');
    expect(applyConditionals(template, { OUTER: '1', INNER: '' })).toBe('a\nb\nd\ne');
    expect(applyConditionals(template, { OUTER: '', INNER: '1' })).toBe('a\ne');
    expect(applyConditionals(template, { OUTER: '', INNER: '' })).toBe('a\ne');
  });

  it('drops an inner block whose condition holds when the outer one does not', () => {
    // The case that matters: a satisfied inner condition must not smuggle its body out of a
    // section that was dropped wholesale.
    const rendered = applyConditionals('[IF:AUDIT]\nverify:\n[IF:RIG=CUTOUT]\ncaps match\n[/IF]\n[/IF]', {
      AUDIT: '',
      RIG: 'CUTOUT',
    });
    expect(rendered).toBe('');
  });

  it('handles sibling blocks nested inside one parent', () => {
    const template = '[IF:P]\nhead\n[IF:A]\na\n[/IF]\n[IF:B]\nb\n[/IF]\ntail\n[/IF]';
    expect(applyConditionals(template, { P: '1', A: '1', B: '' })).toBe('head\na\ntail');
    expect(applyConditionals(template, { P: '1', A: '', B: '1' })).toBe('head\nb\ntail');
  });

  it('nests more than two deep', () => {
    const template = '[IF:A]\n[IF:B]\n[IF:C]\nx\n[/IF]\n[/IF]\n[/IF]';
    expect(applyConditionals(template, { A: '1', B: '1', C: '1' })).toBe('x');
    expect(applyConditionals(template, { A: '1', B: '', C: '1' })).toBe('');
  });

  it('still reports an unclosed block when others around it are balanced', () => {
    expect(() => applyConditionals('[IF:A]\n[IF:B]\nx\n[/IF]', { A: '1', B: '1' })).toThrow(
      /\[IF:A\] was never closed/,
    );
  });

  it('still throws on a close that outnumbers the opens', () => {
    expect(() => applyConditionals('[IF:A]\nx\n[/IF]\n[/IF]', { A: '1' })).toThrow(/no matching/);
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

describe('applyNumbering', () => {
  it('numbers consecutive items from one', () => {
    expect(applyNumbering('[N]. first\n[N]. second\n[N]. third')).toBe('1. first\n2. second\n3. third');
  });

  it('closes the gap a dropped conditional item used to leave', () => {
    // The defect this pass exists for: §9's rig check and pixel-art check are independent, so
    // hand-numbering them 7 and 8 emitted "…6. 8." on a pixel-art sheet that is not a cut-out rig.
    const list = '[N]. count\n[IF:RIG]\n[N]. joint caps\n[/IF]\n[N]. pixel grid';
    const rendered = applyNumbering(applyConditionals(list, { RIG: '' }));

    expect(rendered).toBe('1. count\n2. pixel grid');
  });

  it('leaves a continuation line alone and does not let it consume a number', () => {
    // Continuation lines are indented and carry no marker, which is what separates them from items.
    expect(applyNumbering('[N]. first line\n   wrapped onto a second\n[N]. second')).toBe(
      '1. first line\n   wrapped onto a second\n2. second',
    );
  });

  it('restarts at the next list rather than continuing the last one', () => {
    // §0's contract and §9's audit are both numbered, and both start at 1. A blank line is the only
    // thing separating them, so it has to be what resets the count.
    expect(applyNumbering('[N]. a\n[N]. b\n\nprose\n\n[N]. c')).toBe('1. a\n2. b\n\nprose\n\n1. c');
  });

  it('keeps the indentation the item was written with', () => {
    expect(applyNumbering('  [N]. nested')).toBe('  1. nested');
  });

  it('numbers past nine without mangling the item', () => {
    // Guards the replacement itself: building it as a `$1`-style pattern makes "$11." ambiguous
    // between group eleven and group one followed by a digit.
    const items = Array.from({ length: 11 }, () => '[N]. item').join('\n');

    expect(applyNumbering(items).split('\n').at(-1)).toBe('11. item');
  });

  it('ignores an [N] that is not opening a list item', () => {
    // Left for `assertBlocksResolved`, which is what turns a marker written mid-line into an error
    // rather than into literal template text sent to a model.
    expect(applyNumbering('a sentence mentioning [N] in passing')).toBe(
      'a sentence mentioning [N] in passing',
    );
  });
});

describe('applySectionNumbers', () => {
  it('numbers the headings from zero, in the order they appear', () => {
    const rendered = applySectionNumbers('## [SECTION:A]. One\n## [SECTION:B]. Two\n## [SECTION:C]. Three');
    expect(rendered).toBe('## 0. One\n## 1. Two\n## 2. Three');
  });

  it('closes the gap a dropped section used to leave', () => {
    // The reported failure, in miniature: the rig section is conditional, so a hand-numbered
    // document ran `## 4.` straight into `## 6.` on every category that articulates about nothing.
    const rendered = applySectionNumbers('## [SECTION:A]. One\n## [SECTION:C]. Three');
    expect(rendered).toBe('## 0. One\n## 1. Three');
  });

  it('resolves a citation to the number its section landed on, wherever the citation sits', () => {
    // Forward references are the common case and the reason declarations and citations are separate
    // markers: the output contract cites the exclusions six sections below it.
    const rendered = applySectionNumbers(
      'see section [SEC:B]\n## [SECTION:A]. One\n## [SECTION:B]. Two\nand section [SEC:A] again',
    );
    expect(rendered).toBe('see section 1\n## 0. One\n## 1. Two\nand section 0 again');
  });

  it('moves every citation together when a section is dropped', () => {
    // The half a hand-numbered document could not keep: dropping a section renumbers the ones after
    // it, and each of their citations has to follow in the same edit.
    const both = '## [SECTION:A]. One\n## [SECTION:B]. Two\n## [SECTION:C]. Three\nsee section [SEC:C]';
    expect(applySectionNumbers(both)).toContain('see section 2');
    expect(applySectionNumbers(both.replace('## [SECTION:B]. Two\n', ''))).toContain('see section 1');
  });

  it('throws when two surviving headings declare the same name', () => {
    // The two headings that vary by target declare one name each from mutually exclusive blocks, so
    // exactly one survives. Two survivors would mean a condition that is no longer exclusive, and
    // the symptom would be a second section quietly sharing the first one's number.
    expect(() => applySectionNumbers('## [SECTION:A]. One\n## [SECTION:A]. Also one')).toThrow(
      /declared twice/,
    );
  });

  it('throws on a citation of a section this prompt does not carry', () => {
    // `section undefined` in the middle of a document whose prose cites itself hundreds of times is
    // exactly the quiet failure `substitute` refuses for a `[DEFINE:…]`.
    expect(() => applySectionNumbers('## [SECTION:A]. One\nsee section [SEC:B]')).toThrow(/\[SEC:B\]/);
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
    ['[N]', 'a numbering marker'],
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
