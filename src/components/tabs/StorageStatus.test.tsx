import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import type { BackendKind, PersistenceBackend } from '../../db/backend.ts';
import { createFailingBackend } from '../../test/backendDoubles.ts';
import { StorageStatus } from './StorageStatus.tsx';

/**
 * This component exists so that a backend which silently failed to open stops looking exactly like
 * one that opened — which is a thing that actually happened here. So what these tests pin is that it
 * reports the backend it was *given*, rather than a plausible default.
 */
let databasePromise: Promise<PersistenceBackend>;

vi.mock('../../db/database.ts', () => ({
  getDatabase: () => databasePromise,
}));

/** A backend that reports `kind`; the component reads nothing else, and calls no method. */
function backendOfKind(kind: BackendKind): PersistenceBackend {
  return { ...createFailingBackend(), kind };
}

describe('StorageStatus', () => {
  it('says it is still checking until the backend has settled', () => {
    // Left pending on purpose: the point is what shows *before* an answer arrives.
    databasePromise = new Promise(() => undefined);
    render(<StorageStatus />);

    expect(screen.getByText('Checking…')).toBeInTheDocument();
  });

  /**
   * One label per backend, each checked against the label it could be mistaken for.
   *
   * The fallback is the case the component is really for: the app behaves identically either way, so
   * this is the only place the difference is visible. A store in memory behaves exactly like the one
   * over localStorage until a reload empties it, so naming local storage there would promise the
   * reader a library they lack. A second tab is the one state that is a fault rather than a statement
   * of fact, so its label has to name a cause and a fix: this tab can read nothing and store nothing
   * until the other closes, and an empty Projects panel is all the reader would otherwise have to go on.
   */
  it.each<readonly [BackendKind, RegExp, RegExp]>([
    ['sqlite-opfs', /SQLite/, /local storage/],
    ['localstorage', /local storage/, /SQLite/],
    ['memory', /memory only/, /local storage/],
    ['held-elsewhere', /Open in another tab/, /local storage/],
  ])('names the %s backend when that is what the app got, and nothing else', async (kind, shown, absent) => {
    databasePromise = Promise.resolve(backendOfKind(kind));
    render(<StorageStatus />);

    expect(await screen.findByText(shown)).toBeInTheDocument();
    expect(screen.queryByText(absent)).not.toBeInTheDocument();
  });

  it('marks the two states that will not keep this tab’s work for attention, and the two working ones not', async () => {
    // The tone is the difference between "here is where your work is" and "your work is not here",
    // and it is the half a label alone cannot carry.
    const toneOf = async (kind: BackendKind, label: RegExp) => {
      databasePromise = Promise.resolve(backendOfKind(kind));
      const view = render(<StorageStatus />);
      const badge = await view.findByText(label);
      const tone = badge.className;
      view.unmount();
      return tone;
    };

    const held = await toneOf('held-elsewhere', /Open in another tab/);
    const memory = await toneOf('memory', /memory only/);
    const fallback = await toneOf('localstorage', /local storage/);
    const sqlite = await toneOf('sqlite-opfs', /SQLite/);

    expect(held).not.toBe(fallback);
    expect(memory).toBe(held);
    expect(sqlite).toBe(fallback);
  });

  it('does not sit on "Checking…" for ever if the lookup breaks its own guarantee', async () => {
    databasePromise = Promise.reject(new Error('storage subsystem unavailable'));
    render(<StorageStatus />);

    expect(await screen.findByText('Could not be determined')).toBeInTheDocument();
  });
});
