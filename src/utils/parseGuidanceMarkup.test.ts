import { describe, expect, it } from 'vitest';
import { parseGuidanceInlines, parseGuidanceMarkup } from './parseGuidanceMarkup.ts';

describe('parseGuidanceMarkup', () => {
  it('splits paragraphs on a blank line', () => {
    expect(parseGuidanceMarkup('One.\n\nTwo.')).toEqual([
      { kind: 'paragraph', children: [{ kind: 'text', text: 'One.' }] },
      { kind: 'paragraph', children: [{ kind: 'text', text: 'Two.' }] },
    ]);
  });

  it('reads a block whose every line opens with a dash as a bulleted list', () => {
    expect(parseGuidanceMarkup('Pick one:\n\n- `PNG` for a sheet.\n- **GPL** for GIMP.')).toEqual([
      { kind: 'paragraph', children: [{ kind: 'text', text: 'Pick one:' }] },
      {
        kind: 'list',
        items: [
          [
            { kind: 'code', text: 'PNG' },
            { kind: 'text', text: ' for a sheet.' },
          ],
          [
            { kind: 'strong', children: [{ kind: 'text', text: 'GPL' }] },
            { kind: 'text', text: ' for GIMP.' },
          ],
        ],
      },
    ]);
  });

  it('reads a single line break inside a paragraph as a space', () => {
    expect(parseGuidanceMarkup('One\nline.')).toEqual([
      { kind: 'paragraph', children: [{ kind: 'text', text: 'One line.' }] },
    ]);
  });
});

describe('parseGuidanceInlines', () => {
  it('reads code, bold and italics, and nests the last two', () => {
    expect(parseGuidanceInlines('Set `CUSTOM`, then **read _this_ first**.')).toEqual([
      { kind: 'text', text: 'Set ' },
      { kind: 'code', text: 'CUSTOM' },
      { kind: 'text', text: ', then ' },
      {
        kind: 'strong',
        children: [
          { kind: 'text', text: 'read ' },
          { kind: 'emphasis', children: [{ kind: 'text', text: 'this' }] },
          { kind: 'text', text: ' first' },
        ],
      },
      { kind: 'text', text: '.' },
    ]);
  });

  it('reads nothing inside code as markup', () => {
    expect(parseGuidanceInlines('`HIGH_RESOLUTION` and `**x**`')).toEqual([
      { kind: 'code', text: 'HIGH_RESOLUTION' },
      { kind: 'text', text: ' and ' },
      { kind: 'code', text: '**x**' },
    ]);
  });

  it('leaves an underscore inside a word as the character it is', () => {
    expect(parseGuidanceInlines('HIGH_RESOLUTION and snake_case_name')).toEqual([
      { kind: 'text', text: 'HIGH_RESOLUTION and snake_case_name' },
    ]);
  });

  it('keeps an unpaired or empty marker as text rather than dropping words', () => {
    expect(parseGuidanceInlines('A * B, a `tick, and ****.')).toEqual([
      { kind: 'text', text: 'A * B, a `tick, and ****.' },
    ]);
  });

  it('does not open italics before a space', () => {
    expect(parseGuidanceInlines('a _ b_')).toEqual([{ kind: 'text', text: 'a _ b_' }]);
  });
});
