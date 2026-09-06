import { SqliteBackend } from './sqliteBackend.ts';
import { type DatabaseRefusal, isWorkerHandshake } from './workerProtocol.ts';

/**
 * The database, or the reason there isn't one.
 *
 * A reason rather than `null`, because the two ways of not having a database do not share an
 * answer — see {@link DatabaseRefusal}, and `heldElsewhereBackend.ts` for what the second one is
 * answered with.
 */
export type SqliteOpen =
  | { readonly kind: 'OPEN'; readonly backend: SqliteBackend }
  | { readonly kind: 'REFUSED'; readonly refusal: DatabaseRefusal };

/**
 * Start the worker and wait for it to report whether it has a database.
 *
 * Resolves rather than throwing for every failure, because none of them is an error the app should
 * surface: OPFS is legitimately unavailable in a private window, in a browser without it, and where
 * the storage quota is exhausted — and a fourth case, another tab of this origin holding the SAH
 * pool, is ordinary too. What it does **not** do any more is answer all four the same way. It used
 * to resolve to a bare `null`, which is what left `database.ts` unable to tell "this browser cannot
 * store a database" from "your database is open next door", and reaching for localStorage in both.
 *
 * Cross-origin isolation is **not** on that list, though it once was. The SAH-pool VFS needs a
 * worker rather than `SharedArrayBuffer`, so it succeeds on a first, un-isolated load like any
 * other — which makes the fallback a narrower path than "before the first reload", and one worth
 * exercising deliberately rather than assuming every visitor passes through it.
 *
 * **A worker that never starts, dies, or sends something unreadable is `ABSENT`**, not
 * `HELD_ELSEWHERE`. Only the worker itself can see the exception the pool rejected with, so a
 * failure that never reaches its handshake carries no evidence either way — and `ABSENT` is the
 * answer that keeps the reader working rather than the one that stops them.
 */
export function openSqliteBackend(): Promise<SqliteOpen> {
  let worker: Worker;
  try {
    worker = new Worker(new URL('./sqliteWorker.ts', import.meta.url), { type: 'module' });
  } catch {
    return Promise.resolve({ kind: 'REFUSED', refusal: 'ABSENT' });
  }

  return new Promise((resolve) => {
    const settle = (open: SqliteOpen) => {
      worker.removeEventListener('message', onMessage);
      worker.removeEventListener('error', onFailure);
      worker.removeEventListener('messageerror', onFailure);
      if (open.kind !== 'OPEN') worker.terminate();
      resolve(open);
    };

    function onMessage(event: MessageEvent<unknown>) {
      if (!isWorkerHandshake(event.data)) return;
      settle(
        event.data.ready
          ? { kind: 'OPEN', backend: new SqliteBackend(worker) }
          : { kind: 'REFUSED', refusal: event.data.refusal },
      );
    }

    // Both non-replies settle to `ABSENT`, which keeps the reader working: a worker that never
    // reached its handshake carries no evidence about *why*, and the localStorage fallback is the
    // answer that costs them least. `messageerror` matters more than its likelihood suggests —
    // `getDatabase` memoises *this* promise, so one left unsettled hangs every store's hydration for
    // the session, and never reaches the fallback this whole function exists to make possible.
    function onFailure() {
      settle({ kind: 'REFUSED', refusal: 'ABSENT' });
    }

    worker.addEventListener('message', onMessage);
    worker.addEventListener('error', onFailure);
    worker.addEventListener('messageerror', onFailure);
  });
}
