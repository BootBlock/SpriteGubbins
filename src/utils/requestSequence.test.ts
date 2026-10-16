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

describe('a ticket’s signal', () => {
  it('stays unaborted while its read is current', () => {
    const requests = createRequestSequence();

    expect(requests.begin().signal.aborted).toBe(false);
  });

  it('aborts when a later read begins, and leaves the later one standing', () => {
    // The work a retired read started is told to stop, not only ignored when it lands.
    const requests = createRequestSequence();
    const large = requests.begin();
    const small = requests.begin();

    expect(large.signal.aborted).toBe(true);
    expect(small.signal.aborted).toBe(false);
  });

  it('aborts every read in flight when the target is superseded', () => {
    const requests = createRequestSequence();
    const read = requests.begin();

    requests.supersede();

    expect(read.signal.aborted).toBe(true);
    expect(requests.begin().signal.aborted).toBe(false);
  });
});
