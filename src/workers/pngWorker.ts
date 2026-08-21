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
 * `upscaleNearest` is a loop over the *output*, so at the top rung it is 16.8 million iterations and
 * a 67-megabyte allocation — on the main thread that is the first half of the freeze, and it would
 * run before the button could be painted as pressed. Sending the 1:1 result and the factor also
 * makes the structured clone the size of the sheet rather than the size of the file: four megabytes
 * instead of sixty-seven.
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
  const { image, scale } = event.data;
  encodePng(scale === 1 ? image : upscaleNearest(image, scale)).then(
    (file) => {
      // The bytes are transferred rather than copied. They are this thread's only product and it is
      // about to end, so nothing here can be left holding a detached buffer.
      self.postMessage({ kind: 'encoded', file } satisfies PngReply, [file.bytes.buffer]);
    },
    (error: unknown) => {
      // The realistic failures are memory on a magnified sheet and a browser without
      // `CompressionStream`. The tab shows this, so it has to read as a sentence.
      self.postMessage({
        kind: 'failed',
        reason: error instanceof Error ? error.message : String(error),
      } satisfies PngReply);
    },
  );
});
