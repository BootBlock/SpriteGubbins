import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createImage } from '../utils/imageData.ts';
import { encodeOffThread } from './pngSession.ts';
import type { PngReply } from './pngWorker.ts';

/**
 * The bridge, without the thread: which image is posted, which reply is believed, and — the property
 * this file exists for — that the thread is ended however the job turns out.
 *
 * A thread per download only stays cheap if every one of them is terminated, and there are four ways
 * out: an answer, a refusal, a thread that will not evaluate, and a browser that will not build one
 * at all. Each is a leak or a promise nobody settles if it is missed.
 */

class FakeWorker {
  static started: FakeWorker[] = [];
  /** Refuse to be constructed at all, as a browser without module workers does. */
  static refuseToStart = false;

  readonly posted: ImageData[] = [];
  terminated = false;
  private readonly listeners = new Map<string, ((event: unknown) => void)[]>();

  constructor() {
    if (FakeWorker.refuseToStart) throw new Error('no workers here');
    FakeWorker.started.push(this);
  }

  addEventListener(type: string, listener: (event: unknown) => void): void {
    this.listeners.set(type, [...(this.listeners.get(type) ?? []), listener]);
  }

  postMessage(image: ImageData): void {
    this.posted.push(image);
  }

  terminate(): void {
    this.terminated = true;
  }

  answer(reply: PngReply): void {
    for (const listener of this.listeners.get('message') ?? []) listener({ data: reply });
  }

  die(): void {
    for (const listener of this.listeners.get('error') ?? []) listener(new Event('error'));
  }
}

function thread(): FakeWorker {
  const started = FakeWorker.started.at(-1);
  if (started === undefined) throw new Error('no thread was started');
  return started;
}

const FILE = { bytes: new Uint8Array([137, 80]) as Uint8Array<ArrayBuffer>, paletteEntries: 4 };

beforeEach(() => {
  FakeWorker.started = [];
  FakeWorker.refuseToStart = false;
  vi.stubGlobal('Worker', FakeWorker);
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('encodeOffThread', () => {
  it('posts the image and resolves with the file the thread answered', async () => {
    const image = createImage(4, 4);
    const encoding = encodeOffThread(image);
    expect(thread().posted).toEqual([image]);

    thread().answer({ kind: 'encoded', file: FILE });
    await expect(encoding).resolves.toEqual(FILE);
    expect(thread().terminated).toBe(true);
  });

  it('rejects with the reason the thread gave, and still ends it', async () => {
    const encoding = encodeOffThread(createImage(2, 2));
    thread().answer({ kind: 'failed', reason: 'Array buffer allocation failed' });

    await expect(encoding).rejects.toThrow('Array buffer allocation failed');
    expect(thread().terminated).toBe(true);
  });

  it('rejects when the thread itself fails, which no reply can report', async () => {
    const encoding = encodeOffThread(createImage(2, 2));
    thread().die();

    await expect(encoding).rejects.toThrow(/could not start/);
    expect(thread().terminated).toBe(true);
  });

  it('rejects rather than falling back to the main thread where a browser has no workers', async () => {
    FakeWorker.refuseToStart = true;
    await expect(encodeOffThread(createImage(2, 2))).rejects.toThrow(/would not start the thread/);
    expect(FakeWorker.started).toHaveLength(0);
  });

  it('starts a thread of its own for every download', () => {
    void encodeOffThread(createImage(2, 2));
    void encodeOffThread(createImage(2, 2));
    expect(FakeWorker.started).toHaveLength(2);
  });
});
