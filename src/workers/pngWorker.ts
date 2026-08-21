/// <reference lib="webworker" />
import { encodePng } from '../utils/encodePng.ts';
import type { EncodedPng } from '../utils/encodePng.ts';
import { upscaleNearest } from '../utils/upscaleNearest.ts';

/**
 * Writing one PNG, off the thread that has to stay responsive.
 *
 * `encodePng` walks every byte of the image five times to choose a scanline filter and then hands
 * the lot to `CompressionStream`, and the tab admits an image of 16.8 million pixels — magnified,
 * since the Save At control offers whatever rung still fits. On the main thread that is not slow, it
 * is a **freeze**, and a freeze inside a click handler is the worst kind: React cannot paint the
 * button as pressed, so the first thing the reader sees is the finished file, seconds later. The
 * canvas encoder this replaced was asynchronous and never blocked the handler; this is how that
 * property is kept.
 *
 * **The magnification happens here too**, and that is the same argument rather than a second one.
 * `upscaleNearest` is a loop over the *output*, which the Save At ladder caps at 16.8 million
 * pixels — 16.8 million iterations and a 67-megabyte allocation — so on the main thread it is the
 * first half of the freeze, and it would run before the button could be painted as pressed.
 * Sending the 1:1 result and the factor also makes the structured clone the size of the *sheet*
 * rather than of the file: at the 8× rung the largest sheet that ladder will accept is a megabyte,
 * against the sixty-seven the magnified image would have cost.
 *
 * **One image, one thread, one reply**, which is why there is no correlation id and no protocol file
 * beside this one. A download is a single job with a caller waiting on it, so `pngSession.ts` starts
 * a thread per press and terminates it on the answer — where the quantiser's worker keeps its sheet
 * across a whole session and needs the vocabulary in `quantiseProtocol.ts` to say which of several
 * outstanding questions a reply is about. Two different shapes of work, deliberately not forced into
 * one.
 *
 * Nothing here is encoder logic. Every line of that is pure in `src/utils/encodePng.ts` and its four
 * neighbours, tested without a DOM; this file is the thread it runs on.
 */

declare const self: DedicatedWorkerGlobalScope;

/** An image to write, and how far to magnify it on the way — `1` for the sheet at its own size. */
export interface PngRequest {
  readonly image: ImageData;
  readonly scale: number;
}

/** What comes back: the file, or the sentence explaining why there isn't one. */
export type PngReply =
  | { readonly kind: 'encoded'; readonly file: EncodedPng }
  | { readonly kind: 'failed'; readonly reason: string };

self.addEventListener('message', (event: MessageEvent<PngRequest>) => {
  void write(event.data);
});

/**
 * Magnify, encode, and answer — with **both** halves guarded, because a rejection this thread does
 * not handle reaches nobody.
 *
 * Exported for its own test rather than only reachable through the listener above. It is the one
 * thing in this file that is not a line of plumbing, and the guard it carries is one that was
 * claimed and missing once already — which is exactly the kind of absence a test states and a
 * reading does not.
 *
 * An unhandled rejection inside a worker fires `unhandledrejection` here and **no `error` event on
 * the `Worker` object**, so the near side would see no message, no failure and no death: its promise
 * would never settle and the button that returned it would read "Writing…" for the rest of the
 * session. That makes the reply the only way out of this file, and every path has to reach one.
 *
 * The two `try` blocks are separate because they fail for different reasons and one of them is
 * reported wrongly if they are merged. The first covers the magnification and the encode, where the
 * realistic cause is room — `upscaleNearest` is the single largest allocation in the app, and it is
 * synchronous, so outside a `try` its `RangeError` would escape as an uncaught exception and reach
 * the near side as "the thread could not start", which is not what happened. The second covers the
 * reply itself.
 */
export async function write({ image, scale }: PngRequest): Promise<void> {
  let file: EncodedPng;
  try {
    file = await encodePng(scale === 1 ? image : upscaleNearest(image, scale));
  } catch (error: unknown) {
    post({ kind: 'failed', reason: describe(error) });
    return;
  }

  try {
    // The bytes are transferred rather than copied. They are this thread's only product and it is
    // about to end, so nothing here can be left holding a detached buffer.
    post({ kind: 'encoded', file }, [file.bytes.buffer]);
  } catch (error: unknown) {
    // The transfer may already have detached the buffer, so the fallback carries no bytes at all —
    // which is also why it cannot fail the same way.
    post({ kind: 'failed', reason: describe(error) });
  }
}

function post(reply: PngReply, transfer: Transferable[] = []): void {
  self.postMessage(reply, transfer);
}

/** A thrown value as a sentence, since the tab shows it. */
function describe(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}
