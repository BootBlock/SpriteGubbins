import { useEffect, useState } from 'react';
import type { BackendKind } from '../../db/backend.ts';
import { getDatabase } from '../../db/database.ts';
import { Badge } from '../common/Badge.tsx';

/**
 * What the two settled states, and the two unsettled ones, are called.
 *
 * Neither backend is a fault: the localStorage one is a specified behaviour for browsers where OPFS
 * is unavailable, so both read as plain statements of fact rather than a pass and a warning.
 */
const STORAGE_LABELS = {
  checking: 'Checking…',
  'sqlite-opfs': 'SQLite, in this browser’s private file system',
  localstorage: 'Your browser’s local storage',
  unknown: 'Could not be determined',
} as const satisfies Record<BackendKind | 'checking' | 'unknown', string>;

type StorageState = keyof typeof STORAGE_LABELS;

/**
 * Which backend this browser actually got.
 *
 * The section above it describes the two possibilities; this says which one is in front of you. That
 * is worth stating because the difference is invisible from the outside — the app behaves
 * identically either way — and because a database that silently fails to open looks exactly like one
 * that opened. It did, for a while, and nothing on screen said so.
 *
 * `getDatabase()` memoises its promise, so asking here does not start a second backend or a second
 * WASM module load; it joins the one the stores already began on boot.
 */
export function StorageStatus() {
  const [state, setState] = useState<StorageState>('checking');

  useEffect(() => {
    // The guard is the cleanup: this resolves after a worker handshake, which can easily outlast a
    // tab switch away from this view, and setting state on an unmounted component is a leak.
    let active = true;

    getDatabase()
      .then((database) => {
        if (active) setState(database.kind);
      })
      .catch(() => {
        // `getDatabase` is written not to reject — it falls back rather than failing — so this is
        // the "that guarantee broke" case, and saying so is better than showing "Checking…" forever.
        if (active) setState('unknown');
      });

    return () => {
      active = false;
    };
  }, []);

  return (
    <p className="flex flex-wrap items-center gap-2 text-xs text-ink-muted">
      On this device, right now:
      <Badge tone={state === 'unknown' ? 'attention' : 'accent'}>{STORAGE_LABELS[state]}</Badge>
    </p>
  );
}
