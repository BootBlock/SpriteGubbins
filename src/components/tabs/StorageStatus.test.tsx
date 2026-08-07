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

  it('names SQLite when that is what the app got', async () => {
    databasePromise = Promise.resolve(backendOfKind('sqlite-opfs'));
    render(<StorageStatus />);

    expect(await screen.findByText(/SQLite/)).toBeInTheDocument();
    expect(screen.queryByText(/local storage/)).not.toBeInTheDocument();
  });

  it('names the fallback when that is what the app got', async () => {
    // The case the component is really for: the app behaves identically either way, so this is the
    // only place the difference is visible.
    databasePromise = Promise.resolve(backendOfKind('localstorage'));
    render(<StorageStatus />);

    expect(await screen.findByText(/local storage/)).toBeInTheDocument();
    expect(screen.queryByText(/SQLite/)).not.toBeInTheDocument();
  });

  it('does not sit on "Checking…" for ever if the lookup breaks its own guarantee', async () => {
    databasePromise = Promise.reject(new Error('storage subsystem unavailable'));
    render(<StorageStatus />);

    expect(await screen.findByText('Could not be determined')).toBeInTheDocument();
  });
});
