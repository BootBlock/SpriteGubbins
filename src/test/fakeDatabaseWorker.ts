import type { WorkerCall, WorkerHandshake, WorkerReply } from '../db/workerProtocol.ts';

/**
 * The database worker's conversation, without the thread.
 *
 * A stub rather than the real worker because what is under test is the *bridge* — which call is
 * posted, which reply settles it, and what happens to the calls still in flight when the thread
 * stops answering. The SQL on the other end needs OPFS and a WebAssembly build of SQLite, neither of
 * which exists under happy-dom, and none of it is what `sqliteBackend.ts` is responsible for.
 *
 * The two ways out that are not a reply are both here, because they are the ones with no correlation
 * id to file against and so the ones a bridge forgets: a thread that dies, and a reply that will not
 * deserialise.
 */
export class FakeDatabaseWorker {
  /** Every thread started since the last reset, in order. The app should only ever start one. */
  static started: FakeDatabaseWorker[] = [];

  readonly calls: WorkerCall[] = [];
  terminated = false;
  private readonly listeners = new Map<string, ((event: unknown) => void)[]>();

  constructor() {
    FakeDatabaseWorker.started.push(this);
  }

  addEventListener(type: string, listener: (event: unknown) => void): void {
    this.listeners.set(type, [...(this.listeners.get(type) ?? []), listener]);
  }

  removeEventListener(type: string, listener: (event: unknown) => void): void {
    this.listeners.set(
      type,
      (this.listeners.get(type) ?? []).filter((held) => held !== listener),
    );
  }

  postMessage(call: WorkerCall): void {
    this.calls.push(call);
  }

  terminate(): void {
    this.terminated = true;
  }

  /** The opening report, which the worker sends unprompted as soon as it knows whether it has a database. */
  handshake(ready: boolean): void {
    this.emit('message', { data: { ready } satisfies WorkerHandshake });
  }

  /** Answer as the real worker does — a `message` event carrying the reply. */
  answer(reply: WorkerReply): void {
    this.emit('message', { data: reply });
  }

  /** The thread itself failing, which no reply can report because the thread is what would send it. */
  die(): void {
    this.emit('error', new Event('error'));
  }

  /** A reply that arrived but would not deserialise, which carries no id and so answers nothing. */
  garble(): void {
    this.emit('messageerror', new Event('messageerror'));
  }

  /** The id of the most recent call of a kind, which is what its reply has to carry back. */
  lastId(kind: WorkerCall['request']['kind']): number {
    return this.calls.filter((call) => call.request.kind === kind).at(-1)?.id ?? -1;
  }

  // A copy of the list, because a listener may remove itself — which `openSqliteBackend` does the
  // moment it settles, from inside the very dispatch that settled it.
  private emit(type: string, event: unknown): void {
    for (const listener of [...(this.listeners.get(type) ?? [])]) listener(event);
  }
}
