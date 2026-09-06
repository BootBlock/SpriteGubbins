import { useEffect, useState } from 'react';
import type { BackendKind } from '../../db/backend.ts';
import { getDatabase } from '../../db/database.ts';
import { Badge } from '../common/Badge.tsx';

/**
 * What the three settled states, and the two unsettled ones, are called.
 *
 * Two of the three are not faults: the localStorage one is a specified behaviour for browsers where
 * OPFS is unavailable, so both it and SQLite read as plain statements of fact rather than a pass and
 * a warning. **The third is a fault, and is the only label here that tells the reader to do
 * something.** A tab whose database is open in another tab of this app can read nothing and store
 * nothing, and it is the one state where saying where the data lives is not enough — this is where
 * the reader finds out why their library looks empty, so it has to name the cause and the fix.
 */
const STORAGE_LABELS = {
  checking: 'Checking…',
  'sqlite-opfs': 'SQLite, in this browser’s private file system',
  localstorage: 'Your browser’s local storage',
  'held-elsewhere': 'Open in another tab — close it and reload to reach your library',
  unknown: 'Could not be determined',
} as const satisfies Record<BackendKind | 'checking' | 'unknown', string>;

/** The states worth a reader's attention: one that failed, and one that is holding them out. */
const NEEDS_ATTENTION: readonly StorageState[] = ['unknown', 'held-elsewhere'];

type StorageState = keyof typeof STORAGE_LABELS;

/**
 * Which backend this browser actually got.
 *
 * The section above it describes what can happen; this says which of the three is in front of you.
 * Two of them are worth stating because the difference is otherwise invisible — SQLite and the
 * fallback behave identically, so nothing on screen would tell them apart — and the third because
 * the app does *not* behave identically there: every write is refused. A database that silently
 * fails to open looks exactly like one
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
      <Badge tone={NEEDS_ATTENTION.includes(state) ? 'attention' : 'accent'}>{STORAGE_LABELS[state]}</Badge>
    </p>
  );
}
