/// <reference lib="webworker" />
import { readPalette } from '../utils/readPalette.ts';
import type { PaletteReadJob } from '../utils/readPalette.ts';

/**
 * Reading a picture's colours, off the thread that has to stay responsive.
 *
 * The custom palette field and the identity lock both take a picture, and the likely picture is a
 * whole sheet rather than a swatch. Reading one on the tab's own thread froze the page: measured on
 * a random 4096² image, 9.5 seconds to count its colours, 8.8 more to reduce them, and 0.6 for the
 * identity lock's reading. The count now stops at the ceiling, but the reduction and the identity
 * reading are the quantiser, and they cannot be made cheap — only moved.
 *
 * **One job, one thread, one reply**, as `sheetWriteWorker` is and for its reason: each reading is a
 * single question with a caller waiting on it, so `paletteReadSession` starts a thread per job and
 * ends it on the answer, and no reply needs an id to say which question it answers. A job the reader
 * has moved on from is ended by terminating its thread, which is the only way to stop a synchronous
 * walk half-way.
 *
 * Nothing here is palette logic. That is pure in `src/utils/` and tested without a DOM; this file is
 * the thread it runs on.
 */

declare const self: DedicatedWorkerGlobalScope;

/** What comes back: the colours the job asked for, or the sentence explaining why there are none. */
export type PaletteReadReply =
  | { readonly kind: 'read'; readonly entries: readonly string[] | null }
  | { readonly kind: 'failed'; readonly reason: string };

self.addEventListener('message', (event: MessageEvent<PaletteReadJob>) => {
  answer(event.data);
});

/**
 * Read, and reply — with both halves guarded, because a throw this thread does not catch reaches the
 * near side as the thread having failed to start, which is not what happened.
 *
 * Exported for its own test rather than only reachable through the listener above, and called
 * directly there for the reason `sheetWriteWorker.test.ts` gives: importing this module registers the
 * listener on the test's window.
 *
 * The realistic failure in the reading is room: flattening a sheet at `MAX_IMAGE_PIXELS` allocates a
 * second 67-megabyte image. The reply is guarded apart from it so that a reply that will not post is
 * not reported as a reading that failed.
 */
export function answer(job: PaletteReadJob): void {
  let entries: readonly string[] | null;
  try {
    entries = readPalette(job);
  } catch (error: unknown) {
    fail(error);
    return;
  }

  try {
    post({ kind: 'read', entries });
  } catch (error: unknown) {
    fail(error);
  }
}

/**
 * Report a failure, and never throw doing it: if even a short string will not post, the reply
 * channel is gone and nothing above this can hear about it.
 */
function fail(error: unknown): void {
  try {
    post({ kind: 'failed', reason: error instanceof Error ? error.message : String(error) });
  } catch {
    // Nothing above this can hear us.
  }
}

function post(reply: PaletteReadReply): void {
  self.postMessage(reply);
}
