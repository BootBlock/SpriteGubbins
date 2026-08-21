import type { SheetWriteReply, SheetWriteRequest } from '../workers/sheetWriteWorker.ts';

/**
 * The sheet writer's conversation, without the thread.
 *
 * A second fake beside `FakeWorker` rather than an extension of it, and the reason is the payload:
 * that class is written in terms of `QuantiseCall` and `QuantiseReply` and carries `of`/`lastId` for
 * picking one of several outstanding questions out of a session that keeps its thread. This protocol
 * has none of that — one image in, one reply, and the thread ends — so parameterising the other over
 * both would make every quantiser test read through a generic that exists for this one. What the two
 * share is `addEventListener`/`postMessage`/`terminate`, which is the `Worker` interface rather than
 * anything either of them invented.
 *
 * It is shared between `sheetWriteSession`'s tests and `useImageDownload`'s, which is the part that matters:
 * those two are the ends of one bridge, and the failure `FakeWorker`'s own docblock names — two
 * copies free to drift — is between *them*.
 */
export class FakeSheetWriteWorker {
  /** Every thread started since the last reset, in order. */
  static started: FakeSheetWriteWorker[] = [];
  /** Refuse to be constructed at all, as a browser without module workers does. */
  static refuseToStart = false;
  /** Refuse the message, as a browser that will not clone a very large sheet does. */
  static refusePost = false;
  /** What to answer a request with. Left unset, the request hangs for the test to answer by hand. */
  static respond: ((request: SheetWriteRequest) => Promise<SheetWriteReply>) | null = null;

  readonly posted: SheetWriteRequest[] = [];
  terminated = false;
  private readonly listeners = new Map<string, ((event: unknown) => void)[]>();

  constructor() {
    if (FakeSheetWriteWorker.refuseToStart) throw new Error('no workers here');
    FakeSheetWriteWorker.started.push(this);
  }

  static reset(): void {
    FakeSheetWriteWorker.started = [];
    FakeSheetWriteWorker.refuseToStart = false;
    FakeSheetWriteWorker.refusePost = false;
    FakeSheetWriteWorker.respond = null;
  }

  addEventListener(type: string, listener: (event: unknown) => void): void {
    this.listeners.set(type, [...(this.listeners.get(type) ?? []), listener]);
  }

  terminate(): void {
    this.terminated = true;
  }

  postMessage(request: SheetWriteRequest): void {
    if (FakeSheetWriteWorker.refusePost) throw new Error('the sheet would not clone');
    this.posted.push(request);
    const answering = FakeSheetWriteWorker.respond?.(request);
    if (answering === undefined) return;
    void answering.then((reply) => {
      this.answer(reply);
    });
  }

  /** Answer as the real worker does — a `message` event carrying the reply. */
  answer(reply: SheetWriteReply): void {
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
