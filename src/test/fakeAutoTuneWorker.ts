import type { AutoTuneReply, AutoTuneRequest } from '../workers/autoTuneWorker.ts';

/**
 * The auto-tune sweep's conversation, without the thread.
 *
 * A third fake beside `FakeWorker` and `FakeSheetWriteWorker`, for the reason the second one gives:
 * each is written in terms of its own protocol, and parameterising one over three would make every
 * quantiser test read through a generic that exists for the other two. What all three share is
 * `addEventListener` / `postMessage` / `terminate`, which is the `Worker` interface rather than
 * anything any of them invented.
 *
 * It is shared between `autoTuneSession`'s tests and the panel's, which is the part that matters:
 * those two are the ends of one bridge, and two copies of a fake are free to drift apart.
 */
export class FakeAutoTuneWorker {
  /** Every thread started since the last reset, in order. */
  static started: FakeAutoTuneWorker[] = [];
  /** Refuse to be constructed at all, as a browser without module workers does. */
  static refuseToStart = false;
  /** Refuse the message, as a browser that will not clone a very large sheet does. */
  static refusePost = false;
  /** What to answer a request with. Left unset, the request hangs for the test to answer by hand. */
  static respond: ((request: AutoTuneRequest) => Promise<AutoTuneReply>) | null = null;

  readonly posted: AutoTuneRequest[] = [];
  terminated = false;
  private readonly listeners = new Map<string, ((event: unknown) => void)[]>();

  constructor() {
    if (FakeAutoTuneWorker.refuseToStart) throw new Error('no workers here');
    FakeAutoTuneWorker.started.push(this);
  }

  static reset(): void {
    FakeAutoTuneWorker.started = [];
    FakeAutoTuneWorker.refuseToStart = false;
    FakeAutoTuneWorker.refusePost = false;
    FakeAutoTuneWorker.respond = null;
  }

  addEventListener(type: string, listener: (event: unknown) => void): void {
    this.listeners.set(type, [...(this.listeners.get(type) ?? []), listener]);
  }

  terminate(): void {
    this.terminated = true;
  }

  postMessage(request: AutoTuneRequest): void {
    if (FakeAutoTuneWorker.refusePost) throw new Error('the sheet would not clone');
    this.posted.push(request);
    const answering = FakeAutoTuneWorker.respond?.(request);
    if (answering === undefined) return;
    void answering.then((reply) => {
      this.answer(reply);
    });
  }

  /** Answer as the real worker does — a `message` event carrying the reply. */
  answer(reply: AutoTuneReply): void {
    for (const listener of this.listeners.get('message') ?? []) listener({ data: reply });
  }

  /** The thread itself failing, which is the one thing no reply can report. */
  die(): void {
    for (const listener of this.listeners.get('error') ?? []) listener(new Event('error'));
  }

  /** A reply that arrived but would not deserialise. */
  garble(): void {
    for (const listener of this.listeners.get('messageerror') ?? []) listener(new Event('messageerror'));
  }
}
