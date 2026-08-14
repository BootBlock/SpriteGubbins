import { describe, expect, it } from 'vitest';
import { PRESETS } from '../constants/presets/index.ts';
import { parseTargetSize } from './targetSize.ts';

describe('parseTargetSize', () => {
  it('reads the size out of the prose the shipped presets actually hold', () => {
    // Not a hypothetical format: this is `US_CHARACTER_RIG`'s own `spriteTargetSize`. A parser that
    // only handled a bare `48 × 96` would find nothing in the app's own default content.
    expect(parseTargetSize('48 × 96 px assembled (2 metres tall at 48 px per metre)')).toEqual({
      width: 48,
      height: 96,
    });
    expect(parseTargetSize('48 × 48 px per tile (1 metre)')).toEqual({ width: 48, height: 48 });
  });

  it('parses every shipped preset that names a size', () => {
    // Guards the field's real vocabulary against a future preset written in a form the parser drops
    // on the floor — which would look like the candidate simply not being offered.
    const sizes = PRESETS.map((preset) => preset.output.spriteTargetSize).filter((text) => text !== '');
    expect(sizes.length).toBeGreaterThan(0);
    for (const text of sizes) {
      expect(parseTargetSize(text), `no size found in "${text}"`).not.toBeNull();
    }
  });

  it('accepts the three separators people actually type', () => {
    expect(parseTargetSize('64x64')).toEqual({ width: 64, height: 64 });
    expect(parseTargetSize('64 X 32')).toEqual({ width: 64, height: 32 });
    expect(parseTargetSize('16*16 px')).toEqual({ width: 16, height: 16 });
  });

  it('takes the first pair, so a trailing rate cannot overrule the size', () => {
    expect(parseTargetSize('32 × 32 px, roughly 3 × 4 metres')).toEqual({ width: 32, height: 32 });
  });

  it('answers null rather than guessing from loose numbers', () => {
    // The reason a pair is required. Three numbers here and not a size among them; a parser taking
    // the first number would offer a candidate derived from "2 metres".
    expect(parseTargetSize('2 metres tall at 48 px per metre')).toBeNull();
    expect(parseTargetSize('')).toBeNull();
    expect(parseTargetSize('as big as it needs to be')).toBeNull();
    expect(parseTargetSize('0 × 0')).toBeNull();
  });
});
