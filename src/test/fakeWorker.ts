import type { QuantiseCall, QuantiseReply, QuantiseRequest } from '../workers/quantiseProtocol.ts';

/**
 * The quantiser's conversation, without the thread.
 *
 * A stub rather than the real worker because what is under test either side of it is the *bridge* —
 * which call is posted when, which reply is believed, and what the tab is told while it waits. The
 * transform on the other end is pure and tested directly in `src/utils/`; running it here would only
 * make these tests slow and non-deterministic about the one thing they exist to pin down.
 *
 * Shared between `quantiseSession`'s tests and `useQuantiseWork`'s because they are two ends of one
 * pipeline and a second copy of this would be free to drift from the first — which is exactly the
 * failure the session was introduced to make impossible for the real thing.
 *
 * Deliberately not wrapped in `act`. A session call is not a React event, and the half of these tests
 * that renders anything wraps its own — which keeps this usable from a test with no component in it.
 */
export class FakeWorker {
  /** Every thread started since the last reset, in order. A session should rarely start two. */
  static started: FakeWorker[] = [];

  readonly calls: QuantiseCall[] = [];
  terminated = false;
  private readonly listeners = new Map<string, ((event: unknown) => void)[]>();

  constructor() {
    FakeWorker.started.push(this);
  }

  addEventListener(type: string, listener: (event: unknown) => void): void {
    this.listeners.set(type, [...(this.listeners.get(type) ?? []), listener]);
  }

  postMessage(call: QuantiseCall): void {
    this.calls.push(call);
  }

  terminate(): void {
    this.terminated = true;
  }

  /** Answer as the real worker does — a `message` event carrying the reply. */
  answer(reply: QuantiseReply): void {
    for (const listener of this.listeners.get('message') ?? []) listener({ data: reply });
  }

  /** The thread itself failing, which is the one thing no later sheet recovers from. */
  die(): void {
    for (const listener of this.listeners.get('error') ?? []) listener(new Event('error'));
  }

  of(kind: QuantiseRequest['kind']): QuantiseCall[] {
    return this.calls.filter((call) => call.request.kind === kind);
  }

  /** The id of the most recent call of a kind, which is what its reply has to carry back. */
  lastId(kind: QuantiseRequest['kind']): number {
    return this.of(kind).at(-1)?.id ?? -1;
  }
}
