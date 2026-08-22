/// <reference lib="webworker" />
import type { SheetFacts } from '../types/quantiser.ts';
import { countColors } from '../utils/imageData.ts';
import { measureSheetScale } from '../utils/pixelGrid.ts';
import { quantiseImage } from '../utils/quantiseImage.ts';
import type { QuantiseCall, QuantiseReply } from './quantiseProtocol.ts';

/**
 * The quantiser's pipeline, off the thread that has to stay responsive.
 *
 * Every pass in `quantiseImage` is linear in the pixel count, and `MAX_IMAGE_PIXELS` admits 16.8
 * million of them — so on the main thread the transform is not slow, it is a **freeze**: nothing
 * paints, nothing scrolls, no spinner can turn, and the browser offers to kill the page. Measured on
 * a 4096 × 4096 sheet before this worker existed, one keystroke in the grid box blocked the main
 * thread for 28 seconds, because typing "16" passes through "1" and a grid of 1 aligns every pixel as
 * a cell of its own.
 *
 * Two things make that number smaller and this file is only one of them — the pipeline's own passes
 * no longer allocate an object per pixel, which is where most of the 28 seconds went. The worker is
 * what makes the remainder *invisible*: the tab can say it is working, and mean it.
 *
 * **The worker owns the sheet.** It is sent once when the user drops it and kept for as long as this
 * thread runs, so the settings that change — the grid, the tolerance — cross the boundary as three
 * small numbers rather than dragging 67 megabytes of pixels with them. The two figures that depend on
 * the image alone are measured on arrival for the same reason: counting the colours in the sheet as
 * it arrived is a property of the sheet, and it was being recomputed on every keystroke. The thread
 * outlives the tab and ends when the tab is cleared, which is what releases the sheet — see
 * `quantiseSession.ts`, the half of this conversation the app holds.
 *
 * **The queue is bounded on the other side, not here.** A `quantise` posted while one is running waits
 * behind it in this loop and cannot be skipped once it arrives — there is no yield point inside
 * `quantiseImage` to notice a newer call at, and putting one there would make a pure function aware of
 * the thread it happens to be on. So `quantiseSession.ts` holds at most one `quantise` outstanding and
 * posts the next only when the previous replies, which is what keeps this loop from ever holding two.
 * A second sender would break that, and nothing here would say so: the session is the only owner of
 * this thread, and it stays that way.
 *
 * Nothing here is quantiser logic. Every line of that is in `src/utils/`, pure and tested without a
 * DOM; this file is the thread it runs on.
 */

/**
 * `self`, as what it actually is in here.
 *
 * The app's TypeScript program carries the DOM library, where `self` is a `Window` — so without this
 * the one-argument `postMessage` a worker has does not type-check. A module-scoped `declare` shadows
 * the global for this file alone, which is the narrowest way to say it and needs no cast: `as unknown
 * as DedicatedWorkerGlobalScope` would assert the same thing while also switching the checking off.
 */
declare const self: DedicatedWorkerGlobalScope;

/** The sheet the tab last sent, or `null` before the first one arrives. */
let sheet: ImageData | null = null;

function post(reply: QuantiseReply): void {
  self.postMessage(reply);
}

/** The scale reading and the source colour count — once per sheet, never per settings change. */
function survey(image: ImageData): SheetFacts {
  return { scale: measureSheetScale(image), colors: countColors(image) };
}

/**
 * A request kind the switch below does not handle — which the compiler will not let you write.
 *
 * `never` is what does the work: it accepts an argument only when the cases above have narrowed the
 * union to nothing, so adding a variant to `QuantiseRequest` without a case for it stops the build.
 * That is the property `quantiseProtocol.ts` claims for declaring the protocol once, and without this
 * the claim was untrue — a `switch` with no `default` is exhaustive by convention alone, and nothing
 * in this project's TypeScript or ESLint configuration checks the convention.
 */
function unhandled(request: never): never {
  throw new Error(`Unhandled quantiser request: ${JSON.stringify(request)}`);
}

self.addEventListener('message', (event: MessageEvent<QuantiseCall>) => {
  const { id, request } = event.data;

  try {
    switch (request.kind) {
      case 'load': {
        sheet = request.image;
        post({ id, kind: 'loaded', facts: survey(request.image) });
        return;
      }

      case 'quantise': {
        // Not an error the user caused or can act on: the tab only asks for a transform once it has
        // been told a sheet is loaded, so this is reachable only if the two ends have gone out of
        // step. Saying so plainly beats an empty reply the tab would wait on forever.
        if (sheet === null) {
          post({ id, kind: 'failed', reason: 'No sheet has been loaded to quantise' });
          return;
        }
        post({ id, kind: 'quantised', result: quantiseImage(sheet, request.settings) });
        return;
      }

      default:
        return unhandled(request);
    }
  } catch (error) {
    // The realistic failure is memory: a grid of 1 on the largest admitted sheet allocates several
    // full-size intermediates, and a browser that cannot find the room throws rather than swapping.
    // The tab shows this, so it has to read as a sentence.
    post({ id, kind: 'failed', reason: error instanceof Error ? error.message : String(error) });
  }
});
