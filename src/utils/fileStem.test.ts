import { describe, expect, it } from 'vitest';
import { fileStem } from './fileStem.ts';

describe('fileStem', () => {
  it('removes a trailing extension', () => {
    expect(fileStem('armour.png')).toBe('armour');
  });

  it('keeps a dot that is part of the name rather than the extension', () => {
    expect(fileStem('armour v1.2 final.webp')).toBe('armour v1.2 final');
  });

  it('leaves a name with no extension alone', () => {
    expect(fileStem('armour')).toBe('armour');
  });

  it('will not read across a separator, on either platform', () => {
    expect(fileStem('sheets.v2/armour')).toBe('sheets.v2/armour');
    expect(fileStem('sheets.v2\\armour')).toBe('sheets.v2\\armour');
  });

  it('comes back empty for a name that is all extension', () => {
    expect(fileStem('.png')).toBe('');
  });
});
