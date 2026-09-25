import { describe, expect, it } from 'vitest';
import { guidanceMarkupProblems } from './guidanceMarkupProblems.ts';

describe('guidanceMarkupProblems', () => {
  it('finds nothing wrong with well-formed markup', () => {
    expect(guidanceMarkupProblems('Set `CUSTOM` for **this**.\n\n- One _item_.\n- Two.')).toEqual([]);
  });

  it('reports a marker the parser could not pair', () => {
    expect(guidanceMarkupProblems('A **stray marker.')).toEqual(['an unpaired * in “A **stray marker.”']);
  });

  it('reports an option name left outside backticks', () => {
    expect(guidanceMarkupProblems('Choose HIGH_RESOLUTION.')).toEqual([
      'an unpaired _ in “Choose HIGH_RESOLUTION.”',
    ]);
  });

  it('reports a line break inside a paragraph', () => {
    expect(guidanceMarkupProblems('One\nline.')).toEqual(['a line break inside a paragraph: “One”']);
  });

  it('reports a list line mixed into a paragraph', () => {
    expect(guidanceMarkupProblems('Intro.\n- Item.')).toEqual(['a line break inside a paragraph: “Intro.”']);
  });

  it('reports more than one blank line between blocks', () => {
    expect(guidanceMarkupProblems('One.\n\n\nTwo.')).toContain('more than one blank line between two blocks');
  });
});
