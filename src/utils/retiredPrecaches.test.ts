import { describe, expect, it } from 'vitest';
import { parseRetiredPrecaches, partitionRetired, retirePrecaches } from './retiredPrecaches.ts';

/**
 * The ledger of superseded precaches the service worker keeps for tabs still running an old build.
 *
 * Getting it wrong in one direction deletes a chunk a running tab has yet to load, so its next view
 * fails to open. Getting it wrong in the other keeps a whole build's files forever.
 */
describe('retirePrecaches', () => {
  it('retires every other precache against the windows open as the new build takes over', () => {
    expect(
      retirePrecaches([], ['precache-a', 'precache-b'], 'precache-b', ['window-one', 'window-two']),
    ).toEqual([{ cache: 'precache-a', clients: ['window-one', 'window-two'] }]);
  });

  it('keeps the windows an earlier retirement recorded, rather than the ones open now', () => {
    const ledger = [{ cache: 'precache-a', clients: ['window-one'] }];

    expect(
      retirePrecaches(ledger, ['precache-a', 'precache-b', 'precache-c'], 'precache-c', ['window-two']),
    ).toEqual([
      { cache: 'precache-a', clients: ['window-one'] },
      { cache: 'precache-b', clients: ['window-two'] },
    ]);
  });

  it('drops a retired cache from the ledger when a build with the same manifest takes over again', () => {
    const ledger = [{ cache: 'precache-a', clients: ['window-one'] }];

    expect(retirePrecaches(ledger, ['precache-a', 'precache-b'], 'precache-a', ['window-one'])).toEqual([
      { cache: 'precache-b', clients: ['window-one'] },
    ]);
  });
});

describe('partitionRetired', () => {
  const ledger = [
    { cache: 'precache-a', clients: ['window-one', 'window-two'] },
    { cache: 'precache-b', clients: ['window-three'] },
    { cache: 'precache-c', clients: [] },
  ];

  it('keeps a cache while any window it was retired against is open, and discards the rest', () => {
    const { keep, discard } = partitionRetired(ledger, new Set(['window-two', 'window-nine']));

    expect(keep.map((entry) => entry.cache)).toEqual(['precache-a']);
    expect(discard.map((entry) => entry.cache)).toEqual(['precache-b', 'precache-c']);
  });
});

describe('parseRetiredPrecaches', () => {
  it('reads a stored ledger back as it was written', () => {
    const ledger = [{ cache: 'precache-a', clients: ['window-one'] }];

    expect(parseRetiredPrecaches(JSON.parse(JSON.stringify(ledger)))).toEqual(ledger);
  });

  it.each([
    ['nothing stored', null],
    ['an object', { cache: 'precache-a', clients: [] }],
    ['an entry with no clients', [{ cache: 'precache-a' }]],
    ['an entry with a numeric client', [{ cache: 'precache-a', clients: [1] }]],
  ])('reads %s as an empty ledger', (_, value) => {
    expect(parseRetiredPrecaches(value)).toEqual([]);
  });
});
