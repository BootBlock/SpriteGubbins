import { SqliteBackend } from './sqliteBackend.ts';
import { isWorkerHandshake } from './workerProtocol.ts';

/**
 * Start the worker and wait for it to report whether it has a database.
 *
 * Resolves to `null` — rather than throwing — for every failure, because none of them is an error
 * the app should surface: OPFS is legitimately unavailable in a private window, in a browser without
 * it, and where the storage quota is exhausted. The answer is always the same, and it is
 * `database.ts`'s to give: use localStorage instead.
 *
 * Cross-origin isolation is **not** on that list, though it once was. The SAH-pool VFS needs a
 * worker rather than `SharedArrayBuffer`, so it succeeds on a first, un-isolated load like any
 * other — which makes the fallback a narrower path than "before the first reload", and one worth
 * exercising deliberately rather than assuming every visitor passes through it.
 */
export function openSqliteBackend(): Promise<SqliteBackend | null> {
  let worker: Worker;
  try {
    worker = new Worker(new URL('./sqliteWorker.ts', import.meta.url), { type: 'module' });
  } catch {
    return Promise.resolve(null);
  }

  return new Promise((resolve) => {
    const settle = (backend: SqliteBackend | null) => {
      worker.removeEventListener('message', onMessage);
      worker.removeEventListener('error', onFailure);
      worker.removeEventListener('messageerror', onFailure);
      if (backend === null) worker.terminate();
      resolve(backend);
    };

    function onMessage(event: MessageEvent<unknown>) {
      if (!isWorkerHandshake(event.data)) return;
      settle(event.data.ready ? new SqliteBackend(worker) : null);
    }

    // Both non-replies settle to `null`, which is the answer every other failure here gets: use
    // localStorage instead. `messageerror` matters more than its likelihood suggests — `getDatabase`
    // memoises *this* promise, so one left unsettled hangs every store's hydration for the session,
    // and never reaches the fallback this whole function exists to make possible.
    function onFailure() {
      settle(null);
    }

    worker.addEventListener('message', onMessage);
    worker.addEventListener('error', onFailure);
    worker.addEventListener('messageerror', onFailure);
  });
}
