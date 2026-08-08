import type { QuantiseResult, QuantiseSettings, SheetFacts } from '../types/quantiser.ts';

/**
 * The messages the quantiser's worker understands, and what comes back.
 *
 * Shared by both sides so the protocol is one declaration rather than two that have to agree — which
 * is the whole reason this file exists separately from either end. Adding an operation without
 * handling it in the worker is a compile error, though not for free: a `switch` with no `default` is
 * exhaustive by convention and nothing here checks conventions, so `quantiseWorker.ts` closes its own
 * with a `never` argument that only type-checks once every case is covered.
 * The database worker's protocol is spelled the same way
 * next door in `src/db/workerProtocol.ts`; the two are deliberately alike and deliberately separate,
 * because they carry entirely different payloads to entirely different threads.
 *
 * Everything crossing the boundary is structured-cloneable. `ImageData` is, which is what lets the
 * sheet and the result travel as themselves rather than as a width, a height and a loose array that
 * has to be reassembled — the clone costs a few tens of milliseconds on the largest sheet the app
 * admits, against the seconds the transform itself takes.
 */
export type QuantiseRequest =
  /** Adopt a sheet. Answered with {@link SheetFacts} — the two measurements that outlive any setting. */
  | { readonly kind: 'load'; readonly image: ImageData }
  /** Run the pipeline over the adopted sheet at these settings. */
  | { readonly kind: 'quantise'; readonly settings: QuantiseSettings }
  /**
   * Drop the sheet.
   *
   * Answered with nothing, because there is nothing to say: it exists so that clearing the tab
   * releases the pixels rather than leaving a second copy of a 67-megabyte sheet held by a worker
   * whose page has moved on.
   */
  | { readonly kind: 'release' };

/** A request with the correlation id its reply will carry back. */
export interface QuantiseCall {
  readonly id: number;
  readonly request: QuantiseRequest;
}

/**
 * A reply.
 *
 * The id is what makes a superseded answer discardable: the grid box can change while a job is
 * running, and the reply to the job nobody is waiting for any more has to be recognisable as such.
 */
export type QuantiseReply =
  | { readonly id: number; readonly kind: 'loaded'; readonly facts: SheetFacts }
  | { readonly id: number; readonly kind: 'quantised'; readonly result: QuantiseResult }
  | { readonly id: number; readonly kind: 'failed'; readonly reason: string };

/**
 * Narrow a message from the worker to a reply.
 *
 * Checks the discriminant rather than the payload. A message from this app's own worker is not
 * hostile input — the guard is here because `MessageEvent.data` is `unknown` and something has to
 * turn it into the union, not because a malformed reply is expected.
 */
export function isQuantiseReply(message: unknown): message is QuantiseReply {
  return typeof message === 'object' && message !== null && 'id' in message && 'kind' in message;
}
