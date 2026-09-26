import { describe, expect, it } from 'vitest';
import { createRequestSequence } from './requestSequence.ts';

describe('createRequestSequence', () => {
  it('keeps a read current while nothing follows it', () => {
    const requests = createRequestSequence();
    const read = requests.begin();

    expect(read()).toBe(true);
    expect(read()).toBe(true);
  });

  it('retires an earlier read once a later one begins, whichever settles first', () => {
    const requests = createRequestSequence();
    const large = requests.begin();
    const small = requests.begin();

    expect(small()).toBe(true);
    expect(large()).toBe(false);
  });

  it('retires every read in flight when the reader does something else to the target', () => {
    const requests = createRequestSequence();
    const first = requests.begin();
    const second = requests.begin();

    requests.supersede();

    expect(first()).toBe(false);
    expect(second()).toBe(false);
    expect(requests.begin()()).toBe(true);
  });

  it('keeps two targets apart', () => {
    const sheet = createRequestSequence();
    const palette = createRequestSequence();
    const read = sheet.begin();

    palette.begin();
    palette.supersede();

    expect(read()).toBe(true);
  });
});
