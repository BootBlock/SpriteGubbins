/// <reference lib="webworker" />
import type { SpriteBox } from '../types/quantiser.ts';
import type { SheetFormat, WrittenSheet } from '../types/sheetFormat.ts';
import { encodeAseprite } from '../utils/encodeAseprite.ts';
import { encodePng } from '../utils/encodePng.ts';
import { scaleBoxes } from '../utils/sheetLayout.ts';
import { upscaleNearest } from '../utils/upscaleNearest.ts';

/**
 * Writing one file of the quantised sheet, off the thread that has to stay responsive.
 *
 * Either writer walks every byte of the image several times and then hands the lot to
 * `CompressionStream`, and the tab admits an image of 16.8 million pixels — magnified, since the
 * Save At control offers whatever rung still fits. On the main thread that is not slow, it is a
 * **freeze**, and a freeze inside a click handler is the worst kind: React cannot paint the button
 * as pressed, so the first thing the reader sees is the finished file, seconds later. The canvas
 * encoder this replaced was asynchronous and never blocked the handler; this is how that property is
 * kept.
 *
 * **The magnification happens here too**, and that is the same argument rather than a second one.
 * `upscaleNearest` is a loop over the *output*, which the Save At ladder caps at 16.8 million
 * pixels — 16.8 million iterations and a 67-megabyte allocation — so on the main thread it is the
 * first half of the freeze, and it would run before the button could be painted as pressed.
 * Sending the 1:1 result and the factor also makes the structured clone the size of the *sheet*
 * rather than of the file: at the 8× rung the largest sheet that ladder will accept is a megabyte,
 * against the sixty-seven the magnified image would have cost. The sprite boxes cross at 1:1 for the
 * same reason and are scaled here beside the image, so the two can never be on different coordinates.
 *
 * **One image, one thread, one reply**, which is why there is no correlation id and no protocol file
 * beside this one. A download is a single job with a caller waiting on it, so
 * `sheetWriteSession.ts` starts a thread per press and terminates it on the answer — where the
 * quantiser's worker keeps its sheet across a whole session and needs the vocabulary in
 * `quantiseProtocol.ts` to say which of several outstanding questions a reply is about. Two
 * different shapes of work, deliberately not forced into one.
 *
 * **Which format is a field rather than a second worker**, because everything around the encode is
 * the same for both: the magnification, the guarded reply, the thread's lifetime, and the flag the
 * near side sets. A second copy of this file differing in one line is where one of those guards
 * quietly goes missing.
 *
 * Nothing here is writer logic. Every line of that is pure in `src/utils/`, tested without a DOM;
 * this file is the thread it runs on.
 */

declare const self: DedicatedWorkerGlobalScope;

/** A sheet to write, how far to magnify it on the way, and what to write it as. */
export interface SheetWriteRequest {
  readonly image: ImageData;
  /** `1` for the sheet at its own size. */
  readonly scale: number;
  readonly format: SheetFormat;
  /**
   * The sprites the segmentation found, in the 1:1 result's own coordinates.
   *
   * The frames an Aseprite document is cut into — see `sheetLayout.ts`. Empty where the sheet held
   * nothing to cut, and empty for a PNG, which is one picture and has no frames to divide.
   */
  readonly boxes: readonly SpriteBox[];
}

/** What comes back: the file, or the sentence explaining why there isn't one. */
export type SheetWriteReply =
  | { readonly kind: 'written'; readonly file: WrittenSheet }
  | { readonly kind: 'failed'; readonly reason: string };

self.addEventListener('message', (event: MessageEvent<SheetWriteRequest>) => {
  void write(event.data);
});

/**
 * Magnify, write, and answer — with **both** halves guarded, because a rejection this thread does
 * not handle reaches nobody.
 *
 * Exported for its own test rather than only reachable through the listener above. It is the one
 * thing in this file that is not a line of plumbing, and the guard it carries is one that was
 * claimed and missing once already — which is exactly the kind of absence a test states and a
 * reading does not.
 *
 * **Importing this module registers that listener**, wherever it is imported. In a worker that is
 * the point; in a test it means the suite is holding a live `message` listener on the window for the
 * length of the run. Harmless while nothing else dispatches one, and worth knowing before anything
 * does — see the note in `sheetWriteWorker.test.ts`.
 *
 * An unhandled rejection inside a worker fires `unhandledrejection` here and **no `error` event on
 * the `Worker` object**, so the near side would see no message, no failure and no death: its promise
 * would never settle and the button that returned it would read "Writing…" for the rest of the
 * session. That makes the reply the only way out of this file, and every path has to reach one.
 *
 * The two `try` blocks are separate because they fail for different reasons and one of them is
 * reported wrongly if they are merged. The first covers the magnification and the write, where the
 * realistic causes are room — `upscaleNearest` is the single largest allocation in the app, and it
 * is synchronous, so outside a `try` its `RangeError` would escape as an uncaught exception and
 * reach the near side as "the thread could not start", which is not what happened — and a canvas the
 * `.aseprite` format cannot state, which `encodeAseprite` refuses in as many words. The second
 * covers the reply itself. Both report through {@link fail}, which cannot throw — a `failed` post
 * that threw would escape as the very rejection all of this is arranged to prevent.
 */
export async function write({ image, scale, format, boxes }: SheetWriteRequest): Promise<void> {
  let file: WrittenSheet;
  try {
    const sheet = scale === 1 ? image : upscaleNearest(image, scale);
    file = format === 'PNG' ? await encodePng(sheet) : await encodeAseprite(sheet, scaleBoxes(boxes, scale));
  } catch (error: unknown) {
    fail(error);
    return;
  }

  try {
    // The bytes are transferred rather than copied. They are this thread's only product and it is
    // about to end, so nothing here can be left holding a detached buffer.
    post({ kind: 'written', file }, [file.bytes.buffer]);
  } catch (error: unknown) {
    // The transfer may already have detached the buffer, so the fallback carries no bytes at all —
    // which is also why it is unlikely to fail the same way.
    fail(error);
  }
}

/**
 * Report a failure, and never throw doing it.
 *
 * A `failed` reply is a short string with no transfer list, so what stops a *file* crossing does not
 * stop this. But if even this will not post there is nothing left to try: the reply channel is the
 * only way this thread can say anything, and its own failure is the one state that cannot be
 * reported. Letting it throw would make things strictly worse — the rejection would escape `write`,
 * reach nobody, and leave the near side in exactly the same silence with an uncaught error beside
 * it. So it is swallowed here, at the last hop, and nowhere else in this file.
 */
function fail(error: unknown): void {
  try {
    post({ kind: 'failed', reason: describe(error) });
  } catch {
    // Nothing above this can hear us.
  }
}

function post(reply: SheetWriteReply, transfer: Transferable[] = []): void {
  self.postMessage(reply, transfer);
}

/** A thrown value as a sentence, since the tab shows it. */
function describe(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}
