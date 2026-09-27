import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { FakePaletteReadWorker } from '../test/fakePaletteReadWorker.ts';
import { imageFrom } from '../test/images.ts';
import type { PaletteReadJob } from '../utils/readPalette.ts';
import { readPaletteOffThread } from './paletteReadSession.ts';

/**
 * The bridge, without the thread: what is posted, which reply is believed, and that every way out
 * ends the thread and settles the promise.
 *
 * A thread per reading only stays cheap if every exit that started one ends it — an answer, a
 * refusal, a reply that will not deserialise, a thread that will not evaluate, a job that will not
 * be sent, and the reader moving on. Two more settle without a thread: a browser that will not build
 * one, and a reading retired before it began. Each missed is a leaked thread holding a sheet, or a
 * caller that never hears back.
 */

const thread = (): FakePaletteReadWorker => FakePaletteReadWorker.latest();

const JOB: PaletteReadJob = {
  kind: 'reduce',
  image: imageFrom(2, 2, () => ({ r: 16, g: 32, b: 48, a: 255 })),
  max: 256,
};

beforeEach(() => {
  FakePaletteReadWorker.reset();
  FakePaletteReadWorker.hold = true;
  vi.stubGlobal('Worker', FakePaletteReadWorker);
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('readPaletteOffThread', () => {
  it('posts the job as it was given, and resolves with the colours', async () => {
    const reading = readPaletteOffThread(JOB, new AbortController().signal);
    // The picture itself, not a copy made on this side: the clone is the browser's, at the post.
    expect(thread().posted).toEqual([JOB]);

    thread().answer({ kind: 'read', entries: ['#102030'] });
    await expect(reading).resolves.toEqual(['#102030']);
    expect(thread().terminated).toBe(true);
  });

  it('rejects with the reason the thread gave, and still ends it', async () => {
    const reading = readPaletteOffThread(JOB, new AbortController().signal);
    thread().answer({ kind: 'failed', reason: 'Array buffer allocation failed' });

    await expect(reading).rejects.toThrow('Array buffer allocation failed');
    expect(thread().terminated).toBe(true);
  });

  it('rejects when the thread itself fails, which no reply can report', async () => {
    const reading = readPaletteOffThread(JOB, new AbortController().signal);
    thread().die();

    await expect(reading).rejects.toThrow(/could not start/);
    expect(thread().terminated).toBe(true);
  });

  it('rejects when a reply arrives but will not deserialise', async () => {
    const reading = readPaletteOffThread(JOB, new AbortController().signal);
    thread().garble();

    await expect(reading).rejects.toThrow(/could not be read back/);
    expect(thread().terminated).toBe(true);
  });

  it('rejects and ends the thread when the picture will not cross the boundary', async () => {
    FakePaletteReadWorker.refusePost = true;
    const reading = readPaletteOffThread(JOB, new AbortController().signal);

    expect(thread().terminated).toBe(true);
    await expect(reading).rejects.toThrow('would not clone');
  });

  it('rejects rather than reading on the main thread where a browser has no workers', async () => {
    FakePaletteReadWorker.refuseToStart = true;

    await expect(readPaletteOffThread(JOB, new AbortController().signal)).rejects.toThrow(
      /would not start the thread/,
    );
    expect(FakePaletteReadWorker.started).toHaveLength(0);
  });

  it('ends the thread the moment the reading is retired, rather than letting it finish', async () => {
    // A reduction of a large sheet runs for seconds. A reader who drops another file straight after
    // has retired it, and leaving it running is a core spent on an answer nobody will look at.
    const retiring = new AbortController();
    const reading = readPaletteOffThread(JOB, retiring.signal);

    retiring.abort();

    expect(thread().terminated).toBe(true);
    await expect(reading).rejects.toMatchObject({ name: 'AbortError' });
  });

  it('starts no thread for a reading retired before it began', async () => {
    const retired = new AbortController();
    retired.abort();

    await expect(readPaletteOffThread(JOB, retired.signal)).rejects.toMatchObject({ name: 'AbortError' });
    expect(FakePaletteReadWorker.started).toHaveLength(0);
  });

  it('starts a second reading alongside the first rather than refusing it', async () => {
    // Unlike a download, a later file is the one the reader means; the first is ended by its signal.
    const first = new AbortController();
    void readPaletteOffThread(JOB, first.signal).catch(() => undefined);
    const second = readPaletteOffThread(JOB, new AbortController().signal);
    first.abort();

    expect(FakePaletteReadWorker.started).toHaveLength(2);
    expect(FakePaletteReadWorker.started[0]?.terminated).toBe(true);
    thread().answer({ kind: 'read', entries: [] });
    await expect(second).resolves.toEqual([]);
  });
});
