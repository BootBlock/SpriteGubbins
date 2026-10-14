import { readPalette } from '../utils/readPalette.ts';
import type { PaletteReadJob } from '../utils/readPalette.ts';
import type { PaletteReadReply } from '../workers/paletteReadWorker.ts';

/**
 * The palette reader's conversation, without the thread.
 *
 * A fake of its own beside `FakeSheetWriteWorker` for the reason that one gives: the payload is the
 * protocol, and one class generic over both would make every test read through a type parameter
 * that exists for the other.
 *
 * **By default it answers as the real thread would**, with `readPalette`'s reading of the job, on a
 * later microtask. The suites that render the palette controls are asserting what the reader ends
 * up with, and a canned answer there would pin the wiring while leaving the colours untested. Set
 * {@link FakePaletteReadWorker.hold} to answer by hand instead, which is what the session's own
 * suite does to walk each way out.
 */
export class FakePaletteReadWorker {
  /** Every thread started since the last reset, in order. */
  static started: FakePaletteReadWorker[] = [];
  /** Refuse to be constructed at all, as a browser without module workers does. */
  static refuseToStart = false;
  /** Refuse the job, as a browser that will not clone a very large sheet does. */
  static refusePost = false;
  /** Leave each job unanswered for the test to answer by hand. */
  static hold = false;

  readonly posted: PaletteReadJob[] = [];
  terminated = false;
  private readonly listeners = new Map<string, ((event: unknown) => void)[]>();

  constructor() {
    if (FakePaletteReadWorker.refuseToStart) throw new Error('no workers here');
    FakePaletteReadWorker.started.push(this);
  }

  static reset(): void {
    FakePaletteReadWorker.started = [];
    FakePaletteReadWorker.refuseToStart = false;
    FakePaletteReadWorker.refusePost = false;
    FakePaletteReadWorker.hold = false;
  }

  /** The thread started most recently, which is the one a test is usually talking to. */
  static latest(): FakePaletteReadWorker {
    const started = FakePaletteReadWorker.started.at(-1);
    if (started === undefined) throw new Error('no thread was started');
    return started;
  }

  addEventListener(type: string, listener: (event: unknown) => void): void {
    this.listeners.set(type, [...(this.listeners.get(type) ?? []), listener]);
  }

  terminate(): void {
    this.terminated = true;
  }

  postMessage(job: PaletteReadJob): void {
    if (FakePaletteReadWorker.refusePost) throw new Error('the sheet would not clone');
    this.posted.push(job);
    if (FakePaletteReadWorker.hold) return;
    void Promise.resolve().then(() => {
      this.answer({ kind: 'read', entries: readPalette(job) });
    });
  }

  /**
   * Answer as the real worker does — a `message` event carrying the reply — unless the thread has
   * been terminated, since a terminated worker delivers nothing.
   */
  answer(reply: PaletteReadReply): void {
    this.emit('message', { data: reply });
  }

  /** The thread itself failing, which is the one thing no reply can report. */
  die(): void {
    this.emit('error', new Event('error'));
  }

  /** A reply that arrived but would not deserialise. */
  garble(): void {
    this.emit('messageerror', new Event('messageerror'));
  }

  private emit(type: string, event: unknown): void {
    if (this.terminated) return;
    for (const listener of this.listeners.get(type) ?? []) listener(event);
  }
}
